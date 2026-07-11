/**
 * Home Sweet Home — House Overlays
 * ───────────────────────────────────
 * Small, independent visual indicators layered on top of the main house
 * illustration so the house quietly shows each room's progress — without
 * ever changing the room artwork itself.
 *
 * Three independent layers per room (positions live in roomConfig `overlays`):
 *   • clutter — shown while the room's declutter task is NOT done
 *   • surface — shown once the room's surface task IS done   (🌷)
 *   • floor   — shown once the room's floor task IS done      (✨)
 *
 * Each layer maps to one of the room's three core tasks by position:
 *   core[0] = declutter, core[1] = surface, core[2] = floor.
 *
 * Assets are resolved by the same positioning logic whether they're an emoji
 * ("📚"), a PNG ("livingroom-clutter.png"), or an SVG — so the placeholder
 * emoji can later be swapped for illustrated art with zero rendering changes:
 * a string ending in an image extension renders as <img>, anything else as
 * text/emoji.
 */

function hshIsImageAsset(asset) {
  return typeof asset === 'string' && /\.(png|svg|jpe?g|gif|webp)$/i.test(asset.trim());
}

/** Build one absolutely-positioned overlay element for `spec` ({ asset, x, y, size? }). */
function hshCreateOverlay(spec, variant) {
  const el = document.createElement('div');
  el.className = 'hsh-overlay hsh-overlay-' + variant;
  el.style.left = spec.x + '%';
  el.style.top = spec.y + '%';
  if (spec.size) el.style.setProperty('--hsh-overlay-size', spec.size + 'px');

  if (hshIsImageAsset(spec.asset)) {
    const img = document.createElement('img');
    img.src = spec.asset.includes('/') ? spec.asset : 'images/' + spec.asset;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    el.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = spec.asset;
    span.setAttribute('aria-hidden', 'true');
    el.appendChild(span);
  }
  return el;
}

/** (Re)render every room's overlays into the layer, based on current task state. */
function hshRenderHouseOverlays(layerEl) {
  if (!layerEl) return;
  layerEl.innerHTML = '';

  HSH_ROOMS.forEach(cfg => {
    const ov = cfg.overlays;
    if (!ov) return;

    // Derived live from the scheduling engine — nothing about overlay state
    // is stored; it follows task completion (which expires over time).
    const { declutterDone, surfaceDone, floorDone } = hshRoomOverlayState(cfg.id);

    if (ov.clutter && !declutterDone) layerEl.appendChild(hshCreateOverlay(ov.clutter, 'clutter'));
    if (ov.surface && surfaceDone)    layerEl.appendChild(hshCreateOverlay(ov.surface, 'surface'));
    if (ov.floor && floorDone)        layerEl.appendChild(hshCreateOverlay(ov.floor, 'floor'));
  });
}

window.hshIsImageAsset = hshIsImageAsset;
window.hshCreateOverlay = hshCreateOverlay;
window.hshRenderHouseOverlays = hshRenderHouseOverlays;
