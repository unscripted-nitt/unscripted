# Cloud features — deploy guide & design notes

This covers everything added on top of the existing site: logout-all-devices,
auto-transitioning events, nightly backups + restore buttons, primary admins,
and 2-admin approval on every destructive button.

## 1. One-time setup

1. **Upgrade the Firebase project to the Blaze (pay-as-you-go) plan.**
   Console → Project settings → Usage and billing → Modify plan. This is
   required for Cloud Functions and Cloud Scheduler to exist at all — see the
   cost breakdown from the earlier message; for this site's traffic it should
   stay at $0/month.
2. **Install the Firebase CLI** if you don't have it: `npm install -g firebase-tools`,
   then `firebase login`.
3. **Create the backup bucket** (Cloud Functions writes here, they won't create
   it for you): Console → Storage → "Add a bucket" (or `gsutil mb`) named
   exactly `<your-project-id>-backups`, same region as Firestore.
4. From the project root:
   ```
   firebase deploy --only firestore:rules
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
   The two scheduled functions (`autoTransitionEvents`, `dailyBackup`) create
   their own Cloud Scheduler jobs automatically on first deploy — nothing to
   configure by hand.
5. **Set the two primary admins** (one-time, uses the Admin SDK directly since
   there's no primary admin yet to approve the first ones):
   - Console → Project settings → Service accounts → "Generate new private key"
     → save the file as `functions/scripts/serviceAccountKey.json`
   - `cd functions && node scripts/setPrimaryAdmins.js`
   - This matches "Advait Pardhy" and "Samyuktha Sree T" by their exact `name`
     field on `users/{uid}` — they need to have logged into the site at least
     once already so that document exists.

## 2. How each feature works

**Log out from all devices** (dashboard.html → Security & Settings) calls the
`revokeAllSessions` Cloud Function, which uses the Admin SDK to revoke the
user's refresh tokens — this can't be done from browser JS at all, it's the
whole reason a Cloud Function is needed here.

**Auto-transition events**: `autoTransitionEvents` runs every 60 minutes,
finds any `events` doc with `type: 'upcoming'` whose `date` has passed, and
flips it to `'past'`. This is the authoritative fix (the actual data
changes); it can lag real time by up to an hour, which felt like the right
trade-off against adding scattered client-side "treat as past" logic across
the several places dashboard.html and admin-dashboard.html already branch on
`event.type` for eligibility/attendance logic that this project didn't want
to risk touching.

**Nightly backup / Restore Yesterday / Restore Last Week**: `dailyBackup` runs
every night at 2 AM IST and exports these collections to
`gs://<project>-backups/firestore-backups/<date>/`:
`events, gallery, videos, notifications, feedback, votingSessions, votes,
voteRecords, guestTokens, guestExperienceFeedback, settings`.
**Deliberately excluded:** `users`, `members`, `pathways`, `clubDocs` — so a
restore can never silently undo today's role changes or overwrite member
profiles. Old backups beyond 8 days are pruned automatically to keep storage
cost flat. Pressing a restore button creates a `pendingActions` doc; once a
second admin approves it, the `onPendingActionWritten` Cloud Function imports
the matching dated backup with the Admin SDK.

**2-admin approval on delete/reset buttons**: enforced in `firestore.rules`
itself (see `dualApproved()`), not just in the page's JavaScript — a
`pendingActions/{del_<collection>_<id>}` doc needs `status: 'approved'` and
2 distinct admin UIDs in `approvals` before Firestore will actually allow the
delete/write. Covered: delete member, clear leaderboard, delete event
(including its full cleanup cascade), delete photo, delete video, delete
voting session, delete notification. Feedback/vote/guest-token rows that get
cleaned up *as part of* an already-approved event deletion are governed by a
plain "admin-only" rule, not a second approval layer — they're not
independent buttons.

**Primary admins**: a boolean `isPrimaryAdmin` flag on top of the existing
`role` field (so all existing `role === 'admin'` checks keep working
unchanged). Only a primary admin can request a primary-admin change, and it
needs 2 *different* primary admins to approve — enforced by
`dualApprovedPrimary()` in the rules, and executed by the same
`onPendingActionWritten` function once approved.

## 3. Known scope limits (by design, given the size of the ask)

- The "Approve" button in the Pending Approvals panel finishes the job
  immediately for simple single-document deletes and the leaderboard reset.
  For **Delete Event** specifically (which also cleans up related
  feedback/votes/guest tokens/badges), approving there records the 2nd
  approval but the actual cleanup still runs the next time an admin clicks
  "Delete" on that same event — the panel will say so.
- "Delete Project" inside Pathway/Guide management (an array-splice on a
  curriculum doc, not a document delete) was left as a single confirm — it's
  content editing, not the kind of data-loss risk the brief was about.
- Restoring the two hourly/nightly jobs' exact schedule, retention window (8
  days), and the excluded-collections list are all easy to change — they're
  plain constants at the top of `functions/index.js`.

## 4. Cost recap

Same as before: Blaze plan pay-as-you-go, but this project's traffic sits
comfortably inside the free monthly quotas (2M Cloud Function invocations,
50k Firestore reads/day, etc.) — realistically **$0/month**, with a small
amount of Cloud Storage used by the rolling 8-day backup window.
