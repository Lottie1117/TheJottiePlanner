/**
 * Home Sweet Home — Mailbox / House Notes
 * ──────────────────────────────────────────
 * A calm, non-nagging notification centre that sits on the house
 * illustration. Tapping it opens up to two "House Notes" — the rooms the
 * freshness engine thinks could use a gentle refresh today.
 *
 * No counters, streaks, or badges by design — just a quiet nudge and a
 * reachable finish line. Ticking a note completes that room's reset for
 * real (hshCompleteRoomReset), so it stamps lastCompleted, refreshes the
 * room, and syncs to both phones.
 *
 * Notes are captured as a stable session snapshot the first time the room
 * data has loaded, so completing one settles it to "sorted" in place
 * rather than making it vanish. On the next visit the snapshot is
 * recomputed from Firestore, so freshly-cleaned rooms naturally drop off.
 */

const HSH_NOTE_ACK_MS = 1300; // "✨ Thank you 💛" dwell before settling to "sorted"

// Session-local mailbox state (mirrors the design prototype's model).
const HSH_MAILBOX = {
  open: false,
  notes: null,      // captured snapshot: [{ roomId, emoji, room, text, status }]
  hadNotes: false,  // whether there was ever anything to do today
};

/** daysSinceLastCompleted / targetFrequencyDays — >1 means past due for a refresh. */
function hshNeedRatio(roomState) {
  const days = hshDaysSince(roomState.lastCompleted);
  return days / (roomState.targetFrequency || 7);
}

/** True once every room doc has arrived from Firestore, so notes are safe to capture. */
function hshAllRoomsLoaded() {
  return HSH_ROOMS.every(cfg => HSH_STATE.rooms[cfg.id]);
}

/** Pick up to two neediest rooms (most-ready first) as today's House Notes. */
function hshComputeHouseNotes() {
  return HSH_ROOMS
    .map(cfg => {
      const state = HSH_STATE.rooms[cfg.id] || hshDefaultRoomState(cfg);
      return { cfg, ratio: hshNeedRatio(state) };
    })
    .filter(s => s.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2)
    .map(s => ({
      roomId: s.cfg.id,
      emoji: (s.cfg.note && s.cfg.note.emoji) || '✨',
      room: s.cfg.name,
      text: (s.cfg.note && s.cfg.note.text) || 'Ready for a little reset.',
      status: 'active', // 'active' | 'ack' | 'done'
    }));
}

/** Capture the day's notes once, lazily, when room data is available. */
function hshEnsureNotesCaptured() {
  if (HSH_MAILBOX.notes !== null) return;
  const dbReady = typeof db !== 'undefined' && db;
  if (!hshAllRoomsLoaded() && dbReady) return; // wait for Firestore
  HSH_MAILBOX.notes = hshComputeHouseNotes();
  HSH_MAILBOX.hadNotes = HSH_MAILBOX.notes.length > 0;
}

// ── Rendering ──────────────────────────────────────────────────────

/** Refresh the mailbox emoji + unread glow (and the panel, if open). */
function hshRenderMailbox() {
  hshEnsureNotesCaptured();

  const notes = HSH_MAILBOX.notes || [];
  const captured = HSH_MAILBOX.notes !== null;
  const allDone = captured && notes.every(n => n.status === 'done');
  const unread = notes.some(n => n.status !== 'done');

  const emojiEl = document.getElementById('hsh-mailbox-emoji');
  const glowEl = document.getElementById('hsh-mailbox-glow');
  if (emojiEl) emojiEl.textContent = allDone ? '📪' : '📬';
  if (glowEl) glowEl.style.display = unread ? '' : 'none';

  if (HSH_MAILBOX.open) hshRenderNotesPanel();
}

function hshNoteRowHTML(n) {
  if (n.status === 'ack') {
    return `<div class="hsh-note-row">
        <div class="hsh-note-ack">✨ Thank you 💛</div>
      </div>`;
  }
  if (n.status === 'done') {
    return `<div class="hsh-note-row">
        <div class="hsh-note-done">
          <span class="hsh-note-done-star">✨</span>
          <span class="hsh-note-done-text">${esc(n.room)} — sorted</span>
        </div>
      </div>`;
  }
  // active
  return `<div class="hsh-note-row">
      <button type="button" class="hsh-note-check" data-room="${esc(n.roomId)}"
              aria-label="Mark ${esc(n.room)} as sorted"></button>
      <div class="hsh-note-main">
        <div class="hsh-note-name">${n.emoji} ${esc(n.room)}</div>
        <div class="hsh-note-text">${esc(n.text)}</div>
      </div>
    </div>`;
}

function hshNotesBodyHTML() {
  const notes = HSH_MAILBOX.notes || [];
  const allDone = notes.every(n => n.status === 'done');

  let inner;
  if (allDone) {
    let msg;
    if (!HSH_MAILBOX.hadNotes) {
      msg = '✨ Your whole home feels cared for today 💛';
    } else if (notes.length === 1) {
      msg = "✨ That little reset is done.<br>Your home feels cared for today 💛";
    } else {
      msg = '✨ Both little resets are done.<br>Your home feels cared for today 💛';
    }
    inner = `<div class="hsh-note-alldone">${msg}</div>`;
  } else {
    inner = notes.map(hshNoteRowHTML).join('');
  }

  return `
    <div class="hsh-notes-header">
      <div class="hsh-notes-title">📮 Today's House Notes</div>
      <button type="button" class="hsh-notes-close" aria-label="Tuck the notes away">✕</button>
    </div>
    <div class="hsh-notes-list">
      ${inner}
      <div class="hsh-notes-reassure">✨ Everything else is looking lovely.</div>
    </div>`;
}

/** Fill the notes card and (re)wire its buttons. */
function hshRenderNotesPanel() {
  const card = document.getElementById('hsh-notes-card');
  if (!card) return;
  card.innerHTML = hshNotesBodyHTML();

  const closeBtn = card.querySelector('.hsh-notes-close');
  if (closeBtn) closeBtn.addEventListener('click', hshCloseMailbox);

  card.querySelectorAll('.hsh-note-check').forEach(btn => {
    btn.addEventListener('click', () => hshCompleteNote(btn.dataset.room));
  });
}

// ── Interactions ───────────────────────────────────────────────────

function hshOpenMailbox() {
  hshEnsureNotesCaptured();
  HSH_MAILBOX.open = true;
  const modal = document.getElementById('hsh-notes-modal');
  if (modal) modal.style.display = '';
  hshRenderNotesPanel();
}

function hshCloseMailbox() {
  HSH_MAILBOX.open = false;
  const modal = document.getElementById('hsh-notes-modal');
  if (modal) modal.style.display = 'none';
}

/** Tick a note → "Thank you" acknowledgment → settle to "sorted", completing the room reset. */
function hshCompleteNote(roomId) {
  const note = (HSH_MAILBOX.notes || []).find(n => n.roomId === roomId);
  if (!note || note.status !== 'active') return;

  note.status = 'ack';
  hshRenderNotesPanel();

  // Real data: stamp the room's reset (syncs to both phones, refreshes freshness).
  if (typeof hshCompleteRoomReset === 'function') hshCompleteRoomReset(roomId);

  setTimeout(() => {
    note.status = 'done';
    hshRenderMailbox();
  }, HSH_NOTE_ACK_MS);
}

/** Wire the mailbox button + scrim. Idempotent — safe to call on every init. */
function hshInitMailbox() {
  const btn = document.getElementById('hsh-mailbox-btn');
  if (btn && !btn.dataset.wired) {
    btn.addEventListener('click', hshOpenMailbox);
    btn.dataset.wired = '1';
  }
  const scrim = document.getElementById('hsh-notes-scrim');
  if (scrim && !scrim.dataset.wired) {
    scrim.addEventListener('click', hshCloseMailbox);
    scrim.dataset.wired = '1';
  }
  hshRenderMailbox();
}

window.HSH_MAILBOX = HSH_MAILBOX;
window.hshInitMailbox = hshInitMailbox;
window.hshRenderMailbox = hshRenderMailbox;
window.hshOpenMailbox = hshOpenMailbox;
window.hshCloseMailbox = hshCloseMailbox;
