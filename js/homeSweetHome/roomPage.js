/**
 * Home Sweet Home — Room Page
 * ──────────────────────────────
 * Calm room routine screen: a soft freshness banner, today's core reset as a
 * row of big circular emoji tiles, and optional extras as gentle cards.
 * Emojis come from HSH_TASK_EMOJI (🧺 declutter, 🧽 surfaces, 🧹 floors, …).
 * No streaks, no red, no "overdue".
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

  const allCoreChecked = cfg.tasks.core.every(label => !!state.tasks[label]);
  const hasOptional = cfg.tasks.optional && cfg.tasks.optional.length;

  containerEl.innerHTML = `
    <div class="hsh-room-header">
      <button type="button" class="hsh-back-btn" aria-label="Back to the house">← House</button>
      <div class="hsh-room-title">${cfg.icon || ''} ${cfg.title || cfg.name}</div>
    </div>

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

    <button type="button" class="hsh-complete-btn" ${allCoreChecked ? '' : 'disabled'}>
      Complete ✨
    </button>
  `;

  containerEl.querySelector('.hsh-back-btn').addEventListener('click', onBack);

  containerEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      hshToggleTask(roomId, input.dataset.task, input.checked);
    });
  });

  const completeBtn = containerEl.querySelector('.hsh-complete-btn');
  completeBtn.addEventListener('click', () => {
    if (completeBtn.disabled) return;
    hshCompleteRoomReset(roomId);
  });
}

window.hshRenderRoomPage = hshRenderRoomPage;
