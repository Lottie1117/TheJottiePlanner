/**
 * Home Sweet Home — Room Page
 * ──────────────────────────────
 * Calm room routine screen: a decorative shelf, a soft status banner,
 * today's core reset as a row of big circular emoji tiles, and optional
 * extras as gentle cards. Emojis come from HSH_TASK_EMOJI.
 *
 * Everything shown here is derived by the scheduling engine (scheduler.js):
 * a tile is "done" only until its configured frequency elapses, and the
 * banner status is calculated from how many core tasks are currently done.
 * Ticking a task simply stamps its shared lastCompleted in Firebase.
 */

function hshRenderRoomPage(containerEl, roomId, onBack) {
  const cfg = hshRoomById(roomId);
  if (!cfg || !containerEl) return;

  const status = hshRoomStatus(roomId);

  // Core tasks → big circular emoji tiles.
  const renderTiles = labels => labels.map(label => {
    const done = hshIsTaskComplete(roomId, label);
    return `
      <label class="hsh-tile ${done ? 'checked' : ''}">
        <input type="checkbox" data-task="${label}" ${done ? 'checked' : ''}>
        <span class="hsh-tile-circle"><span class="hsh-tile-emoji">${hshTaskEmoji(label)}</span></span>
        <span class="hsh-tile-label">${label}</span>
        <span class="hsh-tile-check" aria-hidden="true"></span>
      </label>`;
  }).join('');

  // Optional tasks → horizontal cards.
  const renderOptionalRows = labels => labels.map(label => {
    const done = hshIsTaskComplete(roomId, label);
    return `
      <label class="hsh-optional-row ${done ? 'checked' : ''}">
        <input type="checkbox" data-task="${label}" ${done ? 'checked' : ''}>
        <span class="hsh-optional-icon">${hshTaskEmoji(label)}</span>
        <span class="hsh-optional-label">${label}</span>
        <span class="hsh-optional-check" aria-hidden="true"></span>
      </label>`;
  }).join('');

  const hasOptional = cfg.tasks.optional && cfg.tasks.optional.length;

  containerEl.innerHTML = `
    <div class="hsh-room-header">
      <button type="button" class="hsh-back-btn" aria-label="Back to the house">← House</button>
      <div class="hsh-room-title">${cfg.icon || ''} ${cfg.title || cfg.name}</div>
    </div>

    <img class="hsh-room-shelf" src="images/${cfg.id}shelf.png" alt="" aria-hidden="true">

    <div class="hsh-freshness-banner">
      <div class="hsh-freshness-label">${status.emoji} ${status.label}</div>
      <div class="hsh-freshness-sub">${status.count} of ${status.total} freshly done</div>
    </div>

    <div class="hsh-checklist-block">
      <div class="hsh-checklist-heading">Today's Refresh</div>
      <div class="hsh-refresh-tiles">${renderTiles(cfg.tasks.core)}</div>
    </div>

    ${hasOptional ? `
    <div class="hsh-checklist-block">
      <div class="hsh-checklist-heading">If You Have Time</div>
      <div class="hsh-optional-list">${renderOptionalRows(cfg.tasks.optional)}</div>
    </div>` : ''}
  `;

  containerEl.querySelector('.hsh-back-btn').addEventListener('click', onBack);

  // Ticking a task stamps its lastCompleted; un-ticking clears it. The banner,
  // tiles and house overlays all re-derive from that on the next state update.
  containerEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      hshSetTaskComplete(roomId, input.dataset.task, input.checked);
    });
  });
}

window.hshRenderRoomPage = hshRenderRoomPage;
