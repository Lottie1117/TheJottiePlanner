/**
 * Home Sweet Home — Room Configuration
 * ─────────────────────────────────────
 * Pure data / configuration. No UI logic and no date maths live here — the
 * scheduling engine (scheduler.js) reads this config and Firebase's per-task
 * `lastCompleted` timestamps to derive everything else.
 *
 * Configuration lives here; user data lives in Firebase. Firebase only ever
 * stores WHEN a task was last completed — how often it should reset is
 * configured below and can be overridden per room / per task without touching
 * any scheduling logic.
 *
 * `note` is the gentle one-line House Note shown in the mailbox.
 * `overlays` position the little house-illustration progress markers.
 * Hotspot / overlay coordinates are percentages of the house image.
 */

// ── Task frequency (configuration, never stored in Firebase) ─────────
// How many days a completed task stays "done" before it naturally becomes
// due again. V1 uses one shared default for every task; this is only a
// temporary testing value. Override per room/task in `frequencies` below —
// no scheduling code needs to change.
const DEFAULT_TASK_FREQUENCY = 3;

// Gentle, non-judgemental task templates shared by room "type".
const HSH_TASK_TEMPLATES = {
  living:   { core: ['Declutter', 'Surfaces', 'Floors'],        optional: ['Soft Furnishings'] },
  kitchen:  { core: ['Declutter', 'Surfaces', 'Floors'],        optional: ['Appliances'] },
  laundry:  { core: ['Laundry', 'Surfaces', 'Floors'],          optional: ['Empty Bin'] },
  bathroom: { core: ['Toilet & Basin', 'Bath/Shower', 'Floor'], optional: ['Mirror'] },
  bedroom:  { core: ['Declutter', 'Bedding', 'Floor'],          optional: ['Dust'] },
  craft:    { core: ['Declutter', 'Desk', 'Floor'],             optional: ['Organise Supplies'] },
};

// The house, room by room. Order here also drives tab/floor order in the UI.
// `frequencies` map each core task label → its reset frequency in days. V1
// points every task at DEFAULT_TASK_FREQUENCY; change a number here to give a
// single task its own cadence. Tasks not listed fall back to the default.
const HSH_ROOMS = [
  // ── Ground Floor ──────────────────────────────────────────────
  {
    id: 'living',
    name: 'Living Room',
    floor: 'ground',
    icon: '🛋️',
    hotspot: { x: 12, y: 66, width: 26, height: 30 },
    tasks: HSH_TASK_TEMPLATES.living,
    frequencies: {
      'Declutter': DEFAULT_TASK_FREQUENCY,
      'Surfaces':  DEFAULT_TASK_FREQUENCY,
      'Floors':    DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧺', text: 'A little declutter and a surface wipe.' },
    // House overlays: clutter shows until core[0] (declutter) is done; surface
    // 🌷 shows once core[1] is done; floor ✨ once core[2] is done. x/y are % of
    // the house image — placeholder positions, tune per room / per final art.
    overlays: {
      clutter: { asset: '📚', x: 18, y: 74 },
      surface: { asset: '🌷', x: 16, y: 68 },
      floor:   { asset: '✨', x: 14, y: 84 },
    },
  },
  {
    id: 'kitchen',
    name: 'Kitchen & Dining',
    floor: 'ground',
    icon: '🍽️',
    hotspot: { x: 39, y: 66, width: 23, height: 30 },
    tasks: HSH_TASK_TEMPLATES.kitchen,
    frequencies: {
      'Declutter': DEFAULT_TASK_FREQUENCY,
      'Surfaces':  DEFAULT_TASK_FREQUENCY,
      'Floors':    DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧺', text: 'A little declutter.' },
    overlays: {
      clutter: { asset: '🍽️', x: 50, y: 76 },
      surface: { asset: '🌷', x: 44, y: 69 },
      floor:   { asset: '✨', x: 52, y: 88 },
    },
  },
  {
    id: 'laundry',
    name: 'Laundry Room',
    floor: 'ground',
    icon: '🧺',
    hotspot: { x: 63, y: 66, width: 25, height: 30 },
    tasks: HSH_TASK_TEMPLATES.laundry,
    frequencies: {
      'Laundry':  DEFAULT_TASK_FREQUENCY,
      'Surfaces': DEFAULT_TASK_FREQUENCY,
      'Floors':   DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧺', text: 'A load on and a quick tidy.' },
    overlays: {
      clutter: { asset: '🧦', x: 73, y: 76 },
      surface: { asset: '🌷', x: 70, y: 69 },
      floor:   { asset: '✨', x: 78, y: 88 },
    },
  },

  // ── Middle Floor ──────────────────────────────────────────────
  {
    id: 'bedroom1',
    name: 'Bedroom One',
    floor: 'middle',
    icon: '🛏️',
    hotspot: { x: 17, y: 38, width: 21, height: 26 },
    tasks: HSH_TASK_TEMPLATES.bedroom,
    frequencies: {
      'Declutter': DEFAULT_TASK_FREQUENCY,
      'Bedding':   DEFAULT_TASK_FREQUENCY,
      'Floor':     DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧹', text: 'Smooth the bedding, clear the floor.' },
    overlays: {
      clutter: { asset: '👗', x: 22, y: 48 },
      surface: { asset: '🌷', x: 20, y: 43 },
      floor:   { asset: '✨', x: 24, y: 60 },
    },
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    floor: 'middle',
    icon: '🛁',
    hotspot: { x: 39, y: 38, width: 17, height: 26 },
    tasks: HSH_TASK_TEMPLATES.bathroom,
    frequencies: {
      'Toilet & Basin': DEFAULT_TASK_FREQUENCY,
      'Bath/Shower':    DEFAULT_TASK_FREQUENCY,
      'Floor':          DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧽', text: 'Freshen the surfaces.' },
    overlays: {
      clutter: { asset: '🗺️', x: 47, y: 48 },
      surface: { asset: '🌷', x: 44, y: 43 },
      floor:   { asset: '✨', x: 47, y: 60 },
    },
  },
  {
    id: 'bedroom2',
    name: 'Bedroom Two',
    floor: 'middle',
    icon: '🛏️',
    hotspot: { x: 57, y: 38, width: 21, height: 26 },
    tasks: HSH_TASK_TEMPLATES.bedroom,
    frequencies: {
      'Declutter': DEFAULT_TASK_FREQUENCY,
      'Bedding':   DEFAULT_TASK_FREQUENCY,
      'Floor':     DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧹', text: 'Smooth the bedding, clear the floor.' },
    overlays: {
      clutter: { asset: '🧣', x: 62, y: 48 },
      surface: { asset: '🌷', x: 60, y: 43 },
      floor:   { asset: '✨', x: 64, y: 60 },
    },
  },

  // ── Top Floor ─────────────────────────────────────────────────
  {
    id: 'craft',
    name: 'Craft / Office',
    floor: 'top',
    icon: '🧵',
    hotspot: { x: 13, y: 13, width: 74, height: 24 },
    tasks: HSH_TASK_TEMPLATES.craft,
    frequencies: {
      'Declutter': DEFAULT_TASK_FREQUENCY,
      'Desk':      DEFAULT_TASK_FREQUENCY,
      'Floor':     DEFAULT_TASK_FREQUENCY,
    },
    note: { emoji: '🧺', text: 'Tidy the desk when you pass.' },
    overlays: {
      clutter: { asset: '🧶', x: 30, y: 24 },
      surface: { asset: '🌷', x: 48, y: 20 },
      floor:   { asset: '✨', x: 40, y: 34 },
    },
  },
];

// Room status derived from how many CORE tasks are currently complete.
// `min` is the completed-count threshold (checked high → low). No status is
// ever stored — the scheduler computes it live from the completion dates.
const HSH_ROOM_STATUS = [
  { min: 3, emoji: '💚', label: 'Cosy & Cute' },
  { min: 2, emoji: '🌸', label: 'Looking Lovely' },
  { min: 1, emoji: '🌿', label: 'Feeling Fresher' },
  { min: 0, emoji: '🍃', label: 'Could use a little refresh' },
];

// Emoji for each routine task label, keyed by the exact task string used in
// HSH_TASK_TEMPLATES. Reuses the app-wide legend (🧺 declutter, 🧽 surfaces,
// 🧹 floors); the rest are gentle, relevant icons for the room page tiles.
const HSH_TASK_EMOJI = {
  // core
  'Declutter':      '🧺',
  'Surfaces':       '🧽',
  'Floors':         '🧹',
  'Floor':          '🧹',
  'Laundry':        '👕',
  'Toilet & Basin': '🚽',
  'Bath/Shower':    '🛁',
  'Bedding':        '🛏️',
  'Desk':           '✏️',
  // optional
  'Soft Furnishings': '🛋️',
  'Appliances':       '🍳',
  'Empty Bin':        '🗑️',
  'Mirror':           '🪞',
  'Dust':             '🪶',
  'Organise Supplies':'🧵',
};

function hshTaskEmoji(label) {
  return HSH_TASK_EMOJI[label] || '✨';
}

function hshRoomById(id) {
  return HSH_ROOMS.find(r => r.id === id) || null;
}

// Expose on window — this codebase uses plain <script> tags, not modules.
window.DEFAULT_TASK_FREQUENCY = DEFAULT_TASK_FREQUENCY;
window.HSH_ROOMS = HSH_ROOMS;
window.HSH_TASK_TEMPLATES = HSH_TASK_TEMPLATES;
window.HSH_ROOM_STATUS = HSH_ROOM_STATUS;
window.HSH_TASK_EMOJI = HSH_TASK_EMOJI;
window.hshTaskEmoji = hshTaskEmoji;
window.hshRoomById = hshRoomById;
