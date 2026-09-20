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
    { sessionsRevokedAt: admin.firestore.FieldValue.serverTimestamp() },
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
    const now = admin.firestore.Timestamp.now();
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

      await ref.set({ status: "executed", executedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await db.collection("auditLog").add({
        type: "restore",
        restoreWhen: after.restoreWhen,
        restoredFrom: folder,
        approvedBy: after.approvals,
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (after.kind === "primaryAdminChange") {
      await db.doc(`users/${after.targetUid}`).set(
        { isPrimaryAdmin: after.newValue === true },
        { merge: true }
      );
      await ref.set({ status: "executed", executedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await db.collection("auditLog").add({
        type: "primaryAdminChange",
        targetUid: after.targetUid,
        newValue: after.newValue,
        approvedBy: after.approvals,
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("onPendingActionWritten failed:", err);
    await ref.set(
      { status: "failed", error: String(err.message || err), failedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
});
