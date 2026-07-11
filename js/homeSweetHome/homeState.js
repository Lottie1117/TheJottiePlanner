/**
 * Home Sweet Home — State (Firebase I/O)
 * ────────────────────────────────────────
 * Syncs the shared household data with Firestore so Lottie and Jonny always
 * see the same little house. This file ONLY reads/writes Firebase and caches
 * it — all derivation (completion, freshness, status, overlays, notes) lives
 * in scheduler.js.
 *
 * Firestore stores nothing but WHEN each task was last completed:
 *   homeRooms/{roomId} = { completions: { [taskLabel]: Timestamp } }
 *
 * No `completed` boolean, no room freshness, no nextDue, no visual state, no
 * room status — those are always calculated from the timestamps + config.
 */

// In-memory cache so the UI can read synchronously once loaded.
const HSH_STATE = {
  loaded: false,
  rooms: {},           // { [roomId]: { id, completions: { [label]: Timestamp } } }
};

let _hshRoomUnsubs = {};

function hshDefaultRoomState(roomConfig) {
  return {
    id: roomConfig.id,
    completions: {},   // { [taskLabel]: Firestore Timestamp } — when it was last done
  };
}

/** Start listening to Firestore for every room doc. Idempotent. */
function hshListenHomeSweetHome(onUpdate) {
  if (typeof db === 'undefined' || !db) return;

  HSH_ROOMS.forEach(cfg => {
    if (_hshRoomUnsubs[cfg.id]) return;
    _hshRoomUnsubs[cfg.id] = db.collection('homeRooms').doc(cfg.id).onSnapshot(snap => {
      HSH_STATE.rooms[cfg.id] = snap.exists
        ? { ...hshDefaultRoomState(cfg), ...snap.data() }
        : hshDefaultRoomState(cfg);
      HSH_STATE.loaded = HSH_ROOMS.every(c => HSH_STATE.rooms[c.id]);
      if (onUpdate) onUpdate();
    });
  });
}

/**
 * Complete or un-complete a single task. Completing stamps the shared
 * `lastCompleted` timestamp (server time); un-completing removes it, so the
 * task is immediately considered incomplete again. Nothing else is stored.
 */
function hshSetTaskComplete(roomId, taskLabel, complete) {
  if (typeof db === 'undefined' || !db) return;
  const value = complete
    ? firebase.firestore.FieldValue.serverTimestamp()
    : firebase.firestore.FieldValue.delete();
  db.collection('homeRooms').doc(roomId).set({
    completions: { [taskLabel]: value },
  }, { merge: true });
}

/** Mark all of a room's CORE tasks complete now (used by a House Note tick). */
function hshCompleteRoomCore(roomId) {
  if (typeof db === 'undefined' || !db) return;
  const cfg = hshRoomById(roomId);
  if (!cfg) return;
  const stamp = firebase.firestore.FieldValue.serverTimestamp();
  const completions = {};
  cfg.tasks.core.forEach(label => { completions[label] = stamp; });
  db.collection('homeRooms').doc(roomId).set({ completions }, { merge: true });
}

window.HSH_STATE = HSH_STATE;
window.hshDefaultRoomState = hshDefaultRoomState;
window.hshListenHomeSweetHome = hshListenHomeSweetHome;
window.hshSetTaskComplete = hshSetTaskComplete;
window.hshCompleteRoomCore = hshCompleteRoomCore;
