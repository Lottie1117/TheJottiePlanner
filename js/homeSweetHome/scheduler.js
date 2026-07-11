/**
 * Home Sweet Home — Scheduling Engine
 * ──────────────────────────────────────
 * The heart of Home Sweet Home and the single source of truth for room
 * freshness. Everything else (room pages, overlays, House Notes, mailbox)
 * derives from here — no completion / freshness / status is ever stored.
 *
 * Two inputs only:
 *   • configuration — roomConfig.js: how often each task should reset
 *   • completion data — Firebase (via HSH_STATE): WHEN each task was last done
 *
 * From `(now, lastCompleted, configuredFrequency)` it calculates, live:
 *
 *   task completion → room status → overlay visibility → House Notes → mailbox
 *
 *     dueDate   = lastCompleted + frequency
 *     completed = now < dueDate
 *
 * When the due date passes, a task is automatically considered incomplete
 * again — no reset job, no background process, no duplicated state. If either
 * user updates a task's timestamp in Firebase, both immediately see the same
 * derived house.
 *
 * Keep date maths in this file; the rest of the app just reads the results.
 */

const HSH_DAY_MS = 24 * 60 * 60 * 1000;

/** Configured reset frequency (days) for a task, defaulting to the constant. */
function hshTaskFrequencyDays(cfg, label) {
  return (cfg && cfg.frequencies && cfg.frequencies[label]) || DEFAULT_TASK_FREQUENCY;
}

/** The task's lastCompleted timestamp from Firebase (or null if never done). */
function hshTaskLastCompleted(roomId, label) {
  const st = HSH_STATE.rooms[roomId];
  const c = st && st.completions ? st.completions[label] : null;
  return c || null;
}

/** JS Date when the task next becomes due, or null if never completed. */
function hshTaskDueDate(roomId, label) {
  const cfg = hshRoomById(roomId);
  const last = hshTaskLastCompleted(roomId, label);
  if (!cfg || !last) return null;
  const then = last.toDate ? last.toDate() : new Date(last);
  return new Date(then.getTime() + hshTaskFrequencyDays(cfg, label) * HSH_DAY_MS);
}

/** Derived completion: a task is complete only until its due date passes. */
function hshIsTaskComplete(roomId, label) {
  const due = hshTaskDueDate(roomId, label);
  return !!due && Date.now() < due.getTime();
}

/** How many of a room's CORE tasks are currently complete (0–3). */
function hshCoreCompletedCount(roomId) {
  const cfg = hshRoomById(roomId);
  if (!cfg) return 0;
  return cfg.tasks.core.reduce((n, label) => n + (hshIsTaskComplete(roomId, label) ? 1 : 0), 0);
}

/** Room status (💚 Cosy & Cute … 🍃 Could use a little refresh), from core count. */
function hshRoomStatus(roomId) {
  const cfg = hshRoomById(roomId);
  const total = cfg ? cfg.tasks.core.length : 3;
  const count = hshCoreCompletedCount(roomId);
  const level = HSH_ROOM_STATUS.find(s => count >= s.min) || HSH_ROOM_STATUS[HSH_ROOM_STATUS.length - 1];
  return { count, total, emoji: level.emoji, label: level.label };
}

/** Which house overlays a room should show, by core-task position. */
function hshRoomOverlayState(roomId) {
  const cfg = hshRoomById(roomId);
  const core = (cfg && cfg.tasks.core) || [];
  return {
    declutterDone: hshIsTaskComplete(roomId, core[0]),
    surfaceDone:   hshIsTaskComplete(roomId, core[1]),
    floorDone:     hshIsTaskComplete(roomId, core[2]),
  };
}

/** True while a room has at least one core task due (eligible for House Notes). */
function hshRoomNeedsAttention(roomId) {
  const cfg = hshRoomById(roomId);
  if (!cfg) return false;
  return hshCoreCompletedCount(roomId) < cfg.tasks.core.length;
}

/**
 * Neediness score for ranking House Notes: more incomplete core tasks first,
 * then whichever is most overdue (never-completed counts as most overdue).
 */
function hshRoomNeedScore(roomId) {
  const cfg = hshRoomById(roomId);
  let incomplete = 0;
  let maxOverdueDays = 0;
  if (cfg) {
    cfg.tasks.core.forEach(label => {
      if (!hshIsTaskComplete(roomId, label)) {
        incomplete++;
        const due = hshTaskDueDate(roomId, label);
        const overdue = due ? (Date.now() - due.getTime()) / HSH_DAY_MS : Infinity;
        if (overdue > maxOverdueDays) maxOverdueDays = overdue;
      }
    });
  }
  return { incomplete, maxOverdueDays };
}

/** Rooms that could use attention, neediest first (drives House Notes). */
function hshRoomsNeedingAttention() {
  return HSH_ROOMS
    .filter(cfg => hshRoomNeedsAttention(cfg.id))
    .map(cfg => ({ cfg, score: hshRoomNeedScore(cfg.id) }))
    .sort((a, b) =>
      b.score.incomplete - a.score.incomplete ||
      b.score.maxOverdueDays - a.score.maxOverdueDays);
}

window.HSH_DAY_MS = HSH_DAY_MS;
window.hshTaskFrequencyDays = hshTaskFrequencyDays;
window.hshTaskLastCompleted = hshTaskLastCompleted;
window.hshTaskDueDate = hshTaskDueDate;
window.hshIsTaskComplete = hshIsTaskComplete;
window.hshCoreCompletedCount = hshCoreCompletedCount;
window.hshRoomStatus = hshRoomStatus;
window.hshRoomOverlayState = hshRoomOverlayState;
window.hshRoomNeedsAttention = hshRoomNeedsAttention;
window.hshRoomNeedScore = hshRoomNeedScore;
window.hshRoomsNeedingAttention = hshRoomsNeedingAttention;
