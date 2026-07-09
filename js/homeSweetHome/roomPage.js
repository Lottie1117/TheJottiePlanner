/**
 * Home Sweet Home — Room Page
 * ──────────────────────────────
 * Simple, minimal, calm. A freshness line, today's reset checklist,
 * and an optional-extras section. No streaks, no red, no "overdue".
 */

function hshRenderRoomPage(containerEl, roomId, onBack) {
  const cfg = hshRoomById(roomId);
  if (!cfg || !containerEl) return;

  const state = HSH_STATE.rooms[roomId] || hshDefaultRoomState(cfg);
  const level = hshGetFreshnessLevel(state);
  const lastLine = hshFormatLastCompleted(state);

  const renderChecklist = (labels, isOptional) => labels.map(label => {
    const checked = !!state.tasks[label];
    return `
      <label class="hsh-task ${checked ? 'checked' : ''}">
        <input type="checkbox" data-task="${label}" ${checked ? 'checked' : ''}>
        <span class="hsh-task-check" aria-hidden="true"></span>
        <span class="hsh-task-label">${label}</span>
      </label>`;
  }).join('');

  const allCoreChecked = cfg.tasks.core.every(label => !!state.tasks[label]);

  containerEl.innerHTML = `
    <div class="hsh-room-header">
      <button type="button" class="hsh-back-btn" aria-label="Back to the house">← House</button>
      <div class="hsh-room-title">${cfg.icon || ''} ${cfg.title || cfg.name}</div>
    </div>

    <div class="hsh-freshness-banner">
      <span class="hsh-freshness-emoji">${level.emoji}</span>
      <div>
        <div class="hsh-freshness-label">${level.label}</div>
        <div class="hsh-freshness-sub">${lastLine}</div>
      </div>
    </div>

    <div class="hsh-checklist-block">
      <div class="hsh-checklist-heading">Today's Reset</div>
      <div class="hsh-checklist">${renderChecklist(cfg.tasks.core, false)}</div>
    </div>

    ${cfg.tasks.optional && cfg.tasks.optional.length ? `
    <div class="hsh-checklist-block">
      <div class="hsh-checklist-heading">Optional</div>
      <div class="hsh-checklist">${renderChecklist(cfg.tasks.optional, true)}</div>
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
