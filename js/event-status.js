// js/event-status.js — single source of truth for "is this event upcoming or past?"
//
// WHY THIS EXISTS: events store a plain `type: 'upcoming' | 'past'` string that
// nothing on the client ever flips. It was only corrected by the scheduled Cloud
// Function `autoTransitionEvents`, which needs the Blaze plan + a deployed
// function. Without that, events stay "upcoming" forever. This helper derives the
// status from the event DATE instead, so it works with or without the function.
//
// An event stays "upcoming" for its whole calendar day (IST) and becomes "past"
// at 00:00 IST the next day. This applies to Live (isActive) events too: once the
// date has passed the event is past, and its Live flag is treated as off.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toDate(v) {
  try {
    const d = v && v.toDate ? v.toDate() : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch (_) { return null; }
}

/** Epoch ms of the end of the event's calendar day in IST (null if no valid date). */
export function eventEndMs(e) {
  const d = e && e.date ? toDate(e.date) : null;
  if (!d) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - IST_OFFSET_MS;
}

export function isEventPast(e, now = Date.now()) {
  const end = eventEndMs(e);
  return end !== null && now >= end;
}

/** Returns 'past' once the date has gone by (even if marked Live), else the stored type. */
export function resolveEventType(e, now = Date.now()) {
  if (!e) return undefined;
  if (isEventPast(e, now)) return 'past';
  return e.type;
}

/** Live flag, forced off once the event date has passed. */
export function resolveEventActive(e, now = Date.now()) {
  return !!e && e.isActive === true && !isEventPast(e, now);
}

/** Copy of the event with type + isActive corrected for its date (does not touch the DB). */
export function normalizeEvent(e, now = Date.now()) {
  return { ...e, type: resolveEventType(e, now), isActive: resolveEventActive(e, now) };
}
