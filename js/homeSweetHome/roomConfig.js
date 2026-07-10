/**
 * Home Sweet Home — Room Configuration
 * ─────────────────────────────────────
 * Pure data. No UI logic lives here.
 *
 * Hotspot coordinates are percentages (0–100) of the house illustration's
 * width/height, measured from the top-left. They are estimates against
 * /images/fullhouse.png — nudge the numbers below if a hotspot feels
 * slightly off; nothing else in the app needs to change.
 *
 * `note` is the gentle one-line House Note shown in the mailbox when the
 * freshness engine surfaces this room (emoji legend: 🧺 declutter,
 * 🧽 surfaces, 🧹 floors). Copy is calm and non-nagging by design.
 *
 * Adding a future room, floor, or artwork swap should only ever require
 * editing this file.
 */

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
const HSH_ROOMS = [
  // ── Ground Floor ──────────────────────────────────────────────
  {
    id: 'living',
    name: 'Living Room',
    floor: 'ground',
    icon: '🛋️',
    hotspot: { x: 12, y: 66, width: 26, height: 30 },
    tasks: HSH_TASK_TEMPLATES.living,
    targetFrequencyDays: 7,
    note: { emoji: '🧺', text: 'A little declutter and a surface wipe.' },
  },
  {
    id: 'kitchen',
    name: 'Kitchen & Dining',
    floor: 'ground',
    icon: '🍽️',
    hotspot: { x: 39, y: 66, width: 23, height: 30 },
    tasks: HSH_TASK_TEMPLATES.kitchen,
    targetFrequencyDays: 5,
    note: { emoji: '🧺', text: 'A little declutter.' },
  },
  {
    id: 'laundry',
    name: 'Laundry Room',
    floor: 'ground',
    icon: '🧺',
    hotspot: { x: 63, y: 66, width: 25, height: 30 },
    tasks: HSH_TASK_TEMPLATES.laundry,
    targetFrequencyDays: 7,
    note: { emoji: '🧺', text: 'A load on and a quick tidy.' },
  },

  // ── Middle Floor ──────────────────────────────────────────────
  {
    id: 'bedroom1',
    name: 'Bedroom One',
    floor: 'middle',
    icon: '🛏️',
    hotspot: { x: 17, y: 38, width: 21, height: 26 },
    tasks: HSH_TASK_TEMPLATES.bedroom,
    targetFrequencyDays: 7,
    note: { emoji: '🧹', text: 'Smooth the bedding, clear the floor.' },
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    floor: 'middle',
    icon: '🛁',
    hotspot: { x: 39, y: 38, width: 17, height: 26 },
    tasks: HSH_TASK_TEMPLATES.bathroom,
    targetFrequencyDays: 4,
    note: { emoji: '🧽', text: 'Freshen the surfaces.' },
  },
  {
    id: 'bedroom2',
    name: 'Bedroom Two',
    floor: 'middle',
    icon: '🛏️',
    hotspot: { x: 57, y: 38, width: 21, height: 26 },
    tasks: HSH_TASK_TEMPLATES.bedroom,
    targetFrequencyDays: 7,
    note: { emoji: '🧹', text: 'Smooth the bedding, clear the floor.' },
  },

  // ── Top Floor ─────────────────────────────────────────────────
  {
    id: 'craft',
    name: 'Craft / Office',
    floor: 'top',
    icon: '🧵',
    hotspot: { x: 13, y: 13, width: 74, height: 24 },
    tasks: HSH_TASK_TEMPLATES.craft,
    targetFrequencyDays: 10,
    note: { emoji: '🧺', text: 'Tidy the desk when you pass.' },
  },
];

// Gentle freshness copy — never negative, never punishing.
// `maxRatio` is daysSinceLastCompleted / targetFrequencyDays.
const HSH_FRESHNESS_LEVELS = [
  { key: 'fresh',   maxRatio: 1,        label: 'Fresh',                       emoji: '🌸' },
  { key: 'settling', maxRatio: 2,       label: 'Could use a refresh',         emoji: '🌿' },
  { key: 'ready',   maxRatio: Infinity, label: 'Ready for a little reset',    emoji: '🍃' },
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

// Placeholder for future decorative/visual growth — read by nothing yet,
// but every room state is created with this shape from day one.
function hshDefaultVisualState() {
  return {
    plantLevel: 0,
    cosyLevel: 0,
    decorationLevel: 0,
  };
}

function hshRoomById(id) {
  return HSH_ROOMS.find(r => r.id === id) || null;
}

// Expose on window — this codebase uses plain <script> tags, not modules.
window.HSH_ROOMS = HSH_ROOMS;
window.HSH_TASK_TEMPLATES = HSH_TASK_TEMPLATES;
window.HSH_FRESHNESS_LEVELS = HSH_FRESHNESS_LEVELS;
window.HSH_TASK_EMOJI = HSH_TASK_EMOJI;
window.hshTaskEmoji = hshTaskEmoji;
window.hshDefaultVisualState = hshDefaultVisualState;
window.hshRoomById = hshRoomById;
