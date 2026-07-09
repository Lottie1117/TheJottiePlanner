/**
 * Home Sweet Home — Hotspot Manager
 * ────────────────────────────────────
 * Renders one accessible, invisible hotspot button per HSH_ROOMS entry,
 * positioned with percentage-based absolute coordinates so future artwork
 * swaps never require touching this file.
 */

function hshRenderHotspots(layerEl, onSelectRoom) {
  if (!layerEl) return;
  layerEl.innerHTML = '';

  HSH_ROOMS.forEach(room => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hsh-hotspot';
    btn.style.left = room.hotspot.x + '%';
    btn.style.top = room.hotspot.y + '%';
    btn.style.width = room.hotspot.width + '%';
    btn.style.height = room.hotspot.height + '%';
    btn.dataset.roomId = room.id;
    btn.setAttribute('aria-label', `Open ${room.name}`);

    btn.addEventListener('click', () => onSelectRoom(room.id));

    layerEl.appendChild(btn);
  });
}

window.hshRenderHotspots = hshRenderHotspots;
