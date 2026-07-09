/**
 * Home Sweet Home — State
 * ─────────────────────────
 * Owns the HomeState shape + per-room documents, and syncs them with
 * Firestore so Lottie and Jonny always see the same little house.
 *
 * Firestore layout:
 *   homeSweetHome/main            → HomeState (whole-house, mostly future-facing)
 *   homeRooms/{roomId}            → one doc per room (tasks, freshness, visualState)
 *
 * Nothing in here renders UI — see hotspotManager.js and roomPage.js.
 */

// In-memory cache so the UI can read synchronously once loaded.
const HSH_STATE = {
  loaded: false,
  home: null,          // HomeState shape (see hshDefaultHomeState)
  rooms: {},           // { [roomId]: roomState }
};

let _hshHomeUnsub = null;
let _hshRoomUnsubs = {};

function hshDefaultHomeState() {
  return {
    overallFreshness: 100,
    gardenLevel: 0,
    season: 'summer',
    weather: 'clear',
    visitors: [],
  };
}

function hshDefaultRoomState(roomConfig) {
  return {
    id: roomConfig.id,
    title: roomConfig.name,
    tasks: {},                 // { [taskLabel]: boolean } — today's reset progress
    lastCompleted: null,       // Firestore Timestamp | null
    targetFrequency: roomConfig.targetFrequencyDays,
    freshness: 100,
    visualState: hshDefaultVisualState(),
  };
}

/** Days since a Firestore Timestamp (or null → treated as "a long time"). */
function hshDaysSince(timestamp) {
  if (!timestamp) return Infinity;
  const then = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ms = Date.now() - then.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

/** Gentle freshness level for a room, based on its own target frequency. */
function hshGetFreshnessLevel(roomState) {
  const days = hshDaysSince(roomState.lastCompleted);
  const ratio = days / (roomState.targetFrequency || 7);
  return HSH_FRESHNESS_LEVELS.find(l => ratio <= l.maxRatio) || HSH_FRESHNESS_LEVELS[HSH_FRESHNESS_LEVELS.length - 1];
}

/** 0–100 score, gentle decay, never punishing (floors at 30). */
function hshComputeFreshnessScore(roomState) {
  const days = hshDaysSince(roomState.lastCompleted);
  const ratio = days / (roomState.targetFrequency || 7);
  return Math.max(30, Math.round(100 - ratio * 40));
}

function hshFormatLastCompleted(roomState) {
  if (!roomState.lastCompleted) return 'Not yet freshened';
  const days = Math.floor(hshDaysSince(roomState.lastCompleted));
  if (days === 0) return 'Freshened today';
  if (days === 1) return 'Freshened yesterday';
  return `Freshened ${days} days ago`;
}

/** Recompute the whole-house freshness average from cached room states. */
function hshRecomputeOverallFreshness() {
  const rooms = Object.values(HSH_STATE.rooms);
  if (!rooms.length) return 100;
  const avg = rooms.reduce((sum, r) => sum + hshComputeFreshnessScore(r), 0) / rooms.length;
  return Math.round(avg);
}

/** Returns the full HomeState shape described in the spec (rooms populated live). */
function hshGetHomeState() {
  const home = HSH_STATE.home || hshDefaultHomeState();
  return {
    ...home,
    overallFreshness: hshRecomputeOverallFreshness(),
    rooms: HSH_ROOMS.map(cfg => HSH_STATE.rooms[cfg.id] || hshDefaultRoomState(cfg)),
  };
}

/** Start listening to Firestore for the home doc + every room doc. Idempotent. */
function hshListenHomeSweetHome(onUpdate) {
  if (typeof db === 'undefined' || !db) return;

  if (!_hshHomeUnsub) {
    _hshHomeUnsub = db.collection('homeSweetHome').doc('main').onSnapshot(snap => {
      HSH_STATE.home = snap.exists ? { ...hshDefaultHomeState(), ...snap.data() } : hshDefaultHomeState();
      HSH_STATE.loaded = true;
      if (onUpdate) onUpdate();
    });
  }

  HSH_ROOMS.forEach(cfg => {
    if (_hshRoomUnsubs[cfg.id]) return;
    _hshRoomUnsubs[cfg.id] = db.collection('homeRooms').doc(cfg.id).onSnapshot(snap => {
      HSH_STATE.rooms[cfg.id] = snap.exists
        ? { ...hshDefaultRoomState(cfg), ...snap.data() }
        : hshDefaultRoomState(cfg);
      if (onUpdate) onUpdate();
    });
  });
}

/** Toggle a single task checkbox for today's reset. */
function hshToggleTask(roomId, taskLabel, checked) {
  if (typeof db === 'undefined' || !db) return;
  db.collection('homeRooms').doc(roomId).set({
    tasks: { [taskLabel]: checked },
  }, { merge: true });
}

/**
 * Mark a room's core tasks complete: stamps lastCompleted, clears today's
 * checklist ready for next time. Optional tasks don't block this.
 */
function hshCompleteRoomReset(roomId) {
  if (typeof db === 'undefined' || !db) return;
  const cfg = hshRoomById(roomId);
  if (!cfg) return;
  db.collection('homeRooms').doc(roomId).set({
    id: roomId,
    title: cfg.name,
    lastCompleted: firebase.firestore.FieldValue.serverTimestamp(),
    targetFrequency: cfg.targetFrequencyDays,
    tasks: {}, // reset today's checklist for the next visit
    visualState: (HSH_STATE.rooms[roomId] && HSH_STATE.rooms[roomId].visualState) || hshDefaultVisualState(),
  }, { merge: true });
}

window.HSH_STATE = HSH_STATE;
window.hshDefaultHomeState = hshDefaultHomeState;
window.hshDefaultRoomState = hshDefaultRoomState;
window.hshGetFreshnessLevel = hshGetFreshnessLevel;
window.hshComputeFreshnessScore = hshComputeFreshnessScore;
window.hshFormatLastCompleted = hshFormatLastCompleted;
window.hshGetHomeState = hshGetHomeState;
window.hshListenHomeSweetHome = hshListenHomeSweetHome;
window.hshToggleTask = hshToggleTask;
window.hshCompleteRoomReset = hshCompleteRoomReset;
