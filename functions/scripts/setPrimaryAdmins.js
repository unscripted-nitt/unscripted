/**
 * scripts/setPrimaryAdmins.js
 * ------------------------------------------------------------
 * One-time setup script: marks the two named users as PRIMARY
 * admins (isPrimaryAdmin: true) and makes sure they also carry
 * an admin-level `role`, so they pass the site's normal isAdmin()
 * checks too.
 *
 * This talks to Firestore with the Admin SDK, so it bypasses
 * security rules entirely — that's expected for a one-time bootstrap
 * (there's no primary admin yet to approve the first ones!). Run it
 * once, then all future primary-admin changes go through the normal
 * 2-primary-admin-approval flow in the admin dashboard.
 *
 * SETUP (Application Default Credentials — no downloadable key needed;
 * use this if your org blocks service account key creation):
 *   1. Install the gcloud CLI, then run:
 *        gcloud auth application-default login
 *      Sign in with a Google account that has Owner/Editor access on
 *      the Firebase project. This stores credentials locally on your
 *      machine only — nothing to keep track of or gitignore.
 *   2. gcloud config set project unscripted-website
 *   3. cd functions && npm install
 *   4. node scripts/setPrimaryAdmins.js
 *
 * ALTERNATE SETUP (if your org allows key creation): drop a
 * downloaded service account JSON at
 * functions/scripts/serviceAccountKey.json and this script will use
 * it automatically instead.
 *
 * Matches users by the exact `name` field already stored on their
 * `users/{uid}` document (the same field shown on the Members page).
 * If a name below doesn't match anyone (typo, or the account hasn't
 * signed up yet), the script prints a warning and skips it — it
 * never guesses.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const NAMES_TO_PROMOTE = ["Advait Pardhy", "Samyuktha Sree T"];
const PROJECT_ID = "unscripted-website";
const keyPath = path.join(__dirname, "serviceAccountKey.json");

if (fs.existsSync(keyPath)) {
  admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
  console.log("Using service account key file.");
} else {
  // Falls back to your own `gcloud auth application-default login`
  // session — no key file required.
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  console.log("No serviceAccountKey.json found — using Application Default Credentials.");
}

const db = admin.firestore();

async function run() {
  const usersSnap = await db.collection("users").get();
  for (const name of NAMES_TO_PROMOTE) {
    const match = usersSnap.docs.find((d) => (d.data().name || "").trim() === name);
    if (!match) {
      console.warn(`Warning: no user found with name "${name}" — skipped. (Check spelling / that they've logged in at least once.)`);
      continue;
    }
    const data = match.data();
    const role = ["admin", "core"].includes(data.role) ? data.role : "admin";
    await match.ref.set({ role, isPrimaryAdmin: true }, { merge: true });
    console.log(`${name} (${match.id}) set as primary admin, role="${role}".`);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
