/**
 * Home Sweet Home — Entry Point
 * ────────────────────────────────
 * Wires the house illustration, hotspots, and room page together.
 * Called by navTo('home') in index.js — see the `initHomeSweetHome`
 * global below.
 *
 *   House → Background Image → Hotspots → Room Data → Room Pages
 *
 * Future versions (garden, seasons, wildlife, decor) plug into
 * HSH_STATE and hshGetHomeState() without touching this flow.
 */

let _hshInitialised = false;
let _hshActiveRoomId = null;

function hshShowHouseView() {
  _hshActiveRoomId = null;
  const houseView = document.getElementById('hsh-house-view');
  const roomView = document.getElementById('hsh-room-view');
  if (houseView) houseView.style.display = '';
  if (roomView) roomView.style.display = 'none';
}

function hshShowRoom(roomId) {
  _hshActiveRoomId = roomId;
  const houseView = document.getElementById('hsh-house-view');
  const roomView = document.getElementById('hsh-room-view');
  if (houseView) houseView.style.display = 'none';
  if (roomView) {
    roomView.style.display = '';
    hshRenderRoomPage(roomView, roomId, hshShowHouseView);
  }
}

/** Re-renders whichever view is currently visible, called on every state update. */
function hshRefreshActiveView() {
  if (_hshActiveRoomId) {
    const roomView = document.getElementById('hsh-room-view');
    if (roomView) hshRenderRoomPage(roomView, _hshActiveRoomId, hshShowHouseView);
  }
  // Keep the mailbox (emoji, unread glow, open panel) in sync with room data.
  if (typeof hshRenderMailbox === 'function') hshRenderMailbox();
  // Keep the house overlays (clutter / surface / floor) in sync with room data.
  if (typeof hshRenderHouseOverlays === 'function') {
    hshRenderHouseOverlays(document.getElementById('hsh-overlay-layer'));
  }
}

function initHomeSweetHome() {
  if (!_hshInitialised) {
    const layer = document.getElementById('hsh-hotspot-layer');
    hshRenderHotspots(layer, hshShowRoom);
    if (typeof hshRenderHouseOverlays === 'function') {
      hshRenderHouseOverlays(document.getElementById('hsh-overlay-layer'));
    }
    if (typeof hshInitMailbox === 'function') hshInitMailbox();
    hshListenHomeSweetHome(hshRefreshActiveView);
    hshShowHouseView();
    _hshInitialised = true;
  }
}

window.initHomeSweetHome = initHomeSweetHome;
