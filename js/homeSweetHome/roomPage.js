/**
 * Home Sweet Home — Room Page
 * ──────────────────────────────
 * Calm room routine screen: a decorative shelf, a soft freshness banner,
 * today's core reset as a row of big circular emoji tiles, and optional
 * extras as gentle cards. Emojis come from HSH_TASK_EMOJI (🧺 declutter,
 * 🧽 surfaces, 🧹 floors, …).
 *
 * There is no explicit "complete" button: ticking all of the room's core
 * tasks automatically marks it refreshed, so the banner flips to "Fresh /
 * Freshened today". Optional tasks don't affect this.
 */

function hshRenderRoomPage(containerEl, roomId, onBack) {
  const cfg = hshRoomById(roomId);
  if (!cfg || !containerEl) return;

  const state = HSH_STATE.rooms[roomId] || hshDefaultRoomState(cfg);
  const level = hshGetFreshnessLevel(state);
  const lastLine = hshFormatLastCompleted(state);

  // Core tasks → big circular emoji tiles.
  const renderTiles = labels => labels.map(label => {
    const checked = !!state.tasks[label];
    return `
      <label class="hsh-tile ${checked ? 'checked' : ''}">
        <input type="checkbox" data-task="${label}" ${checked ? 'checked' : ''}>
        <span class="hsh-tile-circle"><span class="hsh-tile-emoji">${hshTaskEmoji(label)}</span></span>
        <span class="hsh-tile-label">${label}</span>
        <span class="hsh-tile-check" aria-hidden="true"></span>
      </label>`;
  }).join('');

  // Optional tasks → horizontal cards.
  const renderOptionalRows = labels => labels.map(label => {
    const checked = !!state.tasks[label];
    return `
      <label class="hsh-optional-row ${checked ? 'checked' : ''}">
        <input type="checkbox" data-task="${label}" ${checked ? 'checked' : ''}>
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
      <div class="hsh-freshness-label">${level.label}</div>
      <div class="hsh-freshness-sub">${lastLine}</div>
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

  containerEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      hshToggleTask(roomId, input.dataset.task, input.checked);
      hshMaybeAutoRefresh(containerEl, cfg, roomId, input);
    });
  });
}

/**
 * When all of a room's core tasks are ticked, mark it refreshed (stamps
 * lastCompleted today and clears the checklist for next time — the banner
 * then reads "Fresh / Freshened today"). Optional tasks are ignored.
 * A short delay lets the final tick register visually before it settles.
 */
function hshMaybeAutoRefresh(containerEl, cfg, roomId, input) {
  if (!input.checked || !cfg.tasks.core.includes(input.dataset.task)) return;
  const coreInputs = [...containerEl.querySelectorAll('.hsh-refresh-tiles input[type="checkbox"]')];
  if (!coreInputs.every(i => i.checked)) return;

  setTimeout(() => {
    const st = HSH_STATE.rooms[roomId];
    if (st && cfg.tasks.core.every(label => !!st.tasks[label])) {
      hshCompleteRoomReset(roomId);
    }
  }, 650);
}

window.hshRenderRoomPage = hshRenderRoomPage;
