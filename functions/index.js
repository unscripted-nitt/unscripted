/**
 * functions/index.js — Unscripted NITT
 * ============================================================
 * Server-side pieces that CANNOT be done from the browser client,
 * because they either need elevated (Admin SDK) privileges or a
 * clock/schedule that isn't tied to someone loading a page:
 *
 *   1. revokeAllSessions   — "Log out from all devices" (dashboard.html)
 *   2. autoTransitionEvents — flips events from upcoming -> past once
 *                             their date has gone by (scheduled, hourly)
 *   3. dailyBackup          — nightly Firestore export used by the
 *                             admin "Restore Yesterday / Last Week"
 *                             buttons (scheduled, once a day)
 *   4. onPendingActionWritten — watches the `pendingActions` collection
 *                             and, once a `restore` or
 *                             `primaryAdminChange` request has collected
 *                             its required approvals, actually performs
 *                             the action (imports the backup / flips the
 *                             isPrimaryAdmin flag) using the Admin SDK.
 *   5. redeemGuestOtp      — checks a guest's OTP server-side (rate
 *                             limited) and stamps guest claims on their
 *                             anonymous account (login.html)
 *   6. castVote            — records one vote per member/guest per
 *                             voting session (dashboard.html,
 *                             guest-dashboard.html)
 *
 * Everything else (deleting an event, clearing the leaderboard, etc.)
 * is a plain client-side write that Firestore Security Rules gate on
 * the SAME `pendingActions` collection — see firestore.rules. Those
 * don't need a Cloud Function at all, which keeps the deploy surface
 * (and the bill) small.
 * ============================================================
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { v1: firestoreAdminV1 } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");

admin.initializeApp();
setGlobalOptions({ region: "asia-south1", maxInstances: 5 });

const db = admin.firestore();
const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
const BUCKET_NAME = `${projectId}-backups`;
const BACKUP_PREFIX = "firestore-backups";
const RETAIN_DAYS = 8; // enough to always have both "yesterday" and "last week" on hand

// Collections that make up the site's day-to-day CONTENT — these are what
// get backed up nightly and are what "Restore Yesterday / Last Week"
// touches. Deliberately EXCLUDES accounts/roles data (users, members,
// pathways, clubDocs) so a restore can never silently undo who's an
// admin/primary admin or overwrite member profiles — see README-CLOUD-DEPLOY.md.
const BACKUP_COLLECTION_IDS = [
  "events", "gallery", "videos", "notifications",
  "feedback", "votingSessions", "votes", "voteRecords",
  "guestTokens", "guestExperienceFeedback", "settings",
];

function dateStamp(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ------------------------------------------------------------------
// 1. Log out from all devices
// ------------------------------------------------------------------
exports.revokeAllSessions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  const uid = request.auth.uid;
  await admin.auth().revokeRefreshTokens(uid);
  await db.doc(`users/${uid}`).set(
    { sessionsRevokedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { ok: true };
});

// ------------------------------------------------------------------
// 2. Auto-transition upcoming events whose date has passed
// ------------------------------------------------------------------
exports.autoTransitionEvents = onSchedule(
  { schedule: "every 60 minutes", timeZone: "Asia/Kolkata" },
  async () => {
    const now = Timestamp.now();
    const snap = await db.collection("events").where("type", "==", "upcoming").get();
    if (snap.empty) return;

    const batch = db.batch();
    let count = 0;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const eventDate = data.date && data.date.toDate ? data.date.toDate() : new Date(data.date);
      if (!eventDate || isNaN(eventDate.getTime())) return;
      // Event stays "upcoming" for its whole calendar day in IST, and becomes
      // "past" at 00:00 IST the next day (must match js/event-status.js).
      const IST = 5.5 * 60 * 60 * 1000;
      const ist = new Date(eventDate.getTime() + IST);
      const endOfDayIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - IST;
      if (now.toDate().getTime() >= endOfDayIst) {
        batch.update(docSnap.ref, { type: "past", isActive: false }); // Live events too
        count++;
      }
    });
    if (count > 0) await batch.commit();
    console.log(`autoTransitionEvents: moved ${count} event(s) to past.`);
  }
);

// ------------------------------------------------------------------
// 3. Nightly backup of site content (feeds the Restore buttons)
// ------------------------------------------------------------------
exports.dailyBackup = onSchedule(
  { schedule: "every day 02:00", timeZone: "Asia/Kolkata", timeoutSeconds: 540 },
  async () => {
    const client = new firestoreAdminV1.FirestoreAdminClient();
    const databaseName = client.databasePath(projectId, "(default)");
    const today = dateStamp(new Date());
    const outputUriPrefix = `gs://${BUCKET_NAME}/${BACKUP_PREFIX}/${today}`;

    await client.exportDocuments({
      name: databaseName,
      collectionIds: BACKUP_COLLECTION_IDS,
      outputUriPrefix,
    });
    console.log(`dailyBackup: export started -> ${outputUriPrefix}`);

    // Prune backups older than RETAIN_DAYS so storage cost stays flat.
    const storage = new Storage();
    const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: `${BACKUP_PREFIX}/` });
    const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
    const deletions = files
      .filter((f) => f.metadata.timeCreated && new Date(f.metadata.timeCreated).getTime() < cutoff)
      .map((f) => f.delete().catch((e) => console.warn("prune failed for", f.name, e.message)));
    await Promise.all(deletions);
  }
);

function backupFolderForWhen(when) {
  const d = new Date();
  d.setDate(d.getDate() - (when === "lastweek" ? 7 : 1));
  return dateStamp(d);
}

// ------------------------------------------------------------------
// 4. Execute a pendingActions doc once it has its required approvals.
//    Handles the two kinds that genuinely need server privileges:
//    'restore' (Firestore import) and 'primaryAdminChange'
//    (flip the isPrimaryAdmin flag). Everything else (plain deletes,
//    the leaderboard reset) is already enforced by firestore.rules
//    and needs no function.
// ------------------------------------------------------------------
exports.onPendingActionWritten = onDocumentUpdated("pendingActions/{actionId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!after || after.status !== "approved" || before.status === "approved") return;
  if (!Array.isArray(after.approvals) || new Set(after.approvals).size < 2) return;

  const ref = event.data.after.ref;

  try {
    if (after.kind === "restore") {
      const folder = backupFolderForWhen(after.restoreWhen);
      const client = new firestoreAdminV1.FirestoreAdminClient();
      const databaseName = client.databasePath(projectId, "(default)");
      const inputUriPrefix = `gs://${BUCKET_NAME}/${BACKUP_PREFIX}/${folder}`;

      const storage = new Storage();
      const [exists] = await storage.bucket(BUCKET_NAME).file(`${BACKUP_PREFIX}/${folder}/`).exists();
      const [anyFiles] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: `${BACKUP_PREFIX}/${folder}` });
      if (!exists && anyFiles.length === 0) {
        throw new Error(`No backup found for ${after.restoreWhen} (looked for ${folder}). Nothing was restored.`);
      }

      await client.importDocuments({
        name: databaseName,
        collectionIds: BACKUP_COLLECTION_IDS,
        inputUriPrefix,
      });

      await ref.set({ status: "executed", executedAt: FieldValue.serverTimestamp() }, { merge: true });
      await db.collection("auditLog").add({
        type: "restore",
        restoreWhen: after.restoreWhen,
        restoredFrom: folder,
        approvedBy: after.approvals,
        at: FieldValue.serverTimestamp(),
      });
    } else if (after.kind === "primaryAdminChange") {
      // firestore.rules look this approval up as pendingActions/pa_<uid>,
      // so only ever act on the uid the doc id names.
      if (event.params.actionId !== `pa_${after.targetUid}`) {
        throw new Error("Request id does not match its target. Nothing was changed.");
      }
      await db.doc(`users/${after.targetUid}`).set(
        { isPrimaryAdmin: after.newValue === true },
        { merge: true }
      );
      await ref.set({ status: "executed", executedAt: FieldValue.serverTimestamp() }, { merge: true });
      await db.collection("auditLog").add({
        type: "primaryAdminChange",
        targetUid: after.targetUid,
        newValue: after.newValue,
        approvedBy: after.approvals,
        at: FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("onPendingActionWritten failed:", err);
    await ref.set(
      { status: "failed", error: String(err.message || err), failedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
});

// ------------------------------------------------------------------
// Rate limiting for the callables below: at most `max` calls per
// `windowMs` for a given key, tracked in rateLimits/{key}.
// ------------------------------------------------------------------
async function consumeRateLimit(key, max, windowMs) {
  const ref = db.doc(`rateLimits/${key}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data() : null;
    if (!data || now - data.windowStart >= windowMs) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= max) {
      throw new HttpsError("resource-exhausted", "Too many attempts. Please wait a few minutes and try again.");
    }
    tx.update(ref, { count: data.count + 1 });
  });
}

function rateKey(prefix, value) {
  return prefix + "_" + crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 40);
}

function toDate(v) {
  if (!v) return null;
  const d = v.toDate ? v.toDate() : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ------------------------------------------------------------------
// 5. Guest OTP login. The browser signs in anonymously, then calls this
//    with the OTP. Tokens are never readable by clients; on success the
//    anonymous account gets custom claims that firestore.rules check.
// ------------------------------------------------------------------
exports.redeemGuestOtp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  if (request.auth.token.firebase?.sign_in_provider !== "anonymous") {
    throw new HttpsError("failed-precondition", "Guest login is only for guest accounts.");
  }
  const otp = String(request.data?.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new HttpsError("invalid-argument", "Please enter a valid 6-digit OTP.");
  }

  const WINDOW = 15 * 60 * 1000;
  await consumeRateLimit(rateKey("otp_uid", request.auth.uid), 5, WINDOW);
  const ip = request.rawRequest?.ip;
  if (ip) await consumeRateLimit(rateKey("otp_ip", ip), 20, WINDOW);

  const snap = await db.collection("guestTokens").where("otp", "==", otp).limit(5).get();
  const now = Date.now();
  const tokenDoc = snap.docs.find((d) => {
    const exp = toDate(d.data().expiresAt);
    return exp && exp.getTime() > now;
  });
  if (!tokenDoc) {
    throw new HttpsError("not-found", "Invalid or expired OTP. Please check with the admin.");
  }

  const t = tokenDoc.data();
  const expiresAt = toDate(t.expiresAt);
  await admin.auth().setCustomUserClaims(request.auth.uid, {
    guest: true,
    tokenId: tokenDoc.id,
    eventId: t.eventId,
    guestExp: expiresAt.getTime(),
  });

  return {
    tokenId: tokenDoc.id,
    guestName: t.guestName || "Guest",
    eventId: t.eventId,
    eventTitle: t.eventTitle || "",
    expiresAt: expiresAt.toISOString(),
  };
});

// ------------------------------------------------------------------
// 6. Cast a vote. Clients cannot write votes/voteRecords directly;
//    this checks the voter is a member (or a guest of that meet), the
//    session is open, and every choice is a real candidate, then writes
//    the anonymous ballot and the "has voted" record together.
// ------------------------------------------------------------------
const VOTE_CATEGORIES = {
  bestSpeaker: "speakers",
  bestEvaluator: "evaluators",
  bestTableTopic: "tableTopicSpeakers",
  bestRolePlayer: "rolePlayers",
};

exports.castVote = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  const sessionId = String(request.data?.sessionId || "");
  const choices = request.data?.choices;
  if (!sessionId || sessionId.includes("/") || !choices || typeof choices !== "object" || Array.isArray(choices)) {
    throw new HttpsError("invalid-argument", "Missing voting session or choices.");
  }

  const token = request.auth.token;
  const isGuest = token.guest === true;
  let voterKey, recordId, recordData;

  const sessionSnap = await db.doc(`votingSessions/${sessionId}`).get();
  if (!sessionSnap.exists || sessionSnap.data().active !== true) {
    throw new HttpsError("failed-precondition", "This voting session is not open.");
  }
  const session = sessionSnap.data();

  if (isGuest) {
    if (!token.guestExp || Date.now() > token.guestExp) {
      throw new HttpsError("permission-denied", "Your guest pass has expired.");
    }
    if (session.eventId !== token.eventId) {
      throw new HttpsError("permission-denied", "You can only vote for the meet you attended.");
    }
    const tokenSnap = await db.doc(`guestTokens/${token.tokenId}`).get();
    if (!tokenSnap.exists) throw new HttpsError("permission-denied", "Your guest pass is no longer valid.");
    voterKey = "guest_" + token.tokenId;
    recordId = `guest_${token.tokenId}_${sessionId}`;
    recordData = { sessionId, tokenId: token.tokenId, guestName: tokenSnap.data().guestName || "Guest" };
  } else {
    if (token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("permission-denied", "Only members and invited guests can vote.");
    }
    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    if (!userSnap.exists) throw new HttpsError("permission-denied", "Only members can vote.");
    voterKey = request.auth.uid;
    recordId = `${request.auth.uid}_${sessionId}`;
    recordData = { sessionId, voterUid: request.auth.uid };
  }

  // Every category that has candidates must be answered, with a real candidate.
  const clean = {};
  for (const [key, field] of Object.entries(VOTE_CATEGORIES)) {
    const candidates = (session[field] || []).map((c) => c.uid || c.name);
    if (!candidates.length) continue;
    const pick = choices[key];
    if (typeof pick !== "string" || !candidates.includes(pick)) {
      throw new HttpsError("invalid-argument", "Please vote in every category.");
    }
    clean[key] = pick;
  }
  if (Object.keys(choices).some((k) => !(k in clean))) {
    throw new HttpsError("invalid-argument", "Unknown voting category.");
  }

  // Same id scheme the clients used before, so existing ballots line up.
  const voteId = crypto.createHash("sha256").update(voterKey + "_" + sessionId).digest("hex");
  const recordRef = db.doc(`voteRecords/${recordId}`);
  const voteRef = db.doc(`votes/${voteId}`);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(recordRef);
    if (existing.exists) throw new HttpsError("already-exists", "You have already voted in this session.");
    const now = FieldValue.serverTimestamp();
    tx.set(voteRef, { sessionId, choices: clean, updatedAt: now });
    tx.set(recordRef, { ...recordData, createdAt: now });
  });

  return { ok: true };
});
