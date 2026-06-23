// ── Global state ─────────────────────────────────────────────────
// me is declared in firebase.js; restore persisted value on load
me = localStorage.getItem('jottie-name') || '';

// ── Apply SETTINGS to display text ───────────────────────────────
// Replaces hardcoded name labels with values from settings.js.
// devSettings (localStorage) takes precedence over settings.js defaults.
// Only touches display text — no data, IDs, or Firestore fields.
function applySettings() {
  const base = (typeof SETTINGS !== 'undefined') ? SETTINGS : {};
  let dev = {};
  try { dev = JSON.parse(localStorage.getItem('devSettings') || '{}'); } catch(e) {}
  const u1  = dev.user1Name || base.user1Name || 'Lottie';
  const u2  = dev.user2Name || base.user2Name || 'Jonny';
  const pet = dev.petName   || base.petName   || 'Luna';

  // Merge back into SETTINGS so other code reading SETTINGS gets live values
  if (typeof SETTINGS !== 'undefined') {
    SETTINGS.user1Name = u1;
    SETTINGS.user2Name = u2;
    SETTINGS.petName   = pet;
    SETTINGS.petType   = dev.petType || base.petType || 'dog';
  }

  // Name overlay buttons
  const lottieBtn = document.getElementById('name-lottie-btn');
  const jonnyBtn  = document.getElementById('name-jonny-btn');
  if (lottieBtn) lottieBtn.textContent = `👩 ${u1}`;
  if (jonnyBtn)  jonnyBtn.textContent  = `👨 ${u2}`;

  // Dashboard Luna card title (keep the face image, just rename the text)
  const lunaDashTitle = document.getElementById('dash-luna-title-text');
  if (lunaDashTitle) lunaDashTitle.textContent = pet;

  // Option labels in bottom sheet templates (value attributes stay as-is for Firestore)
  document.querySelectorAll('option[value="Lottie"]').forEach(o => { o.textContent = `👩 ${u1}`; });
  document.querySelectorAll('option[value="Jonny"]').forEach(o => { o.textContent = `👨 ${u2}`; });

  // Show dev settings tile only for the original Lottie household
  const devTile = document.getElementById('dev-settings-tile');
  if (devTile) devTile.style.display = (base.user1Name === 'Lottie') ? '' : 'none';
}

(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySettings);
  } else {
    applySettings();
  }
})();

// ── Developer Settings ────────────────────────────────────────────
function openDevSettings() {
  let dev = {};
  try { dev = JSON.parse(localStorage.getItem('devSettings') || '{}'); } catch(e) {}
  const base = (typeof SETTINGS !== 'undefined') ? SETTINGS : {};
  document.getElementById('dev-user1').value   = dev.user1Name || base.user1Name || 'Lottie';
  document.getElementById('dev-user2').value   = dev.user2Name || base.user2Name || 'Jonny';
  document.getElementById('dev-pet').value     = dev.petName   || base.petName   || 'Luna';
  document.getElementById('dev-pettype').value = dev.petType   || base.petType   || 'dog';
}

function saveDevSettings() {
  const dev = {
    user1Name: document.getElementById('dev-user1').value.trim()   || 'Lottie',
    user2Name: document.getElementById('dev-user2').value.trim()   || 'Jonny',
    petName:   document.getElementById('dev-pet').value.trim()     || 'Luna',
    petType:   document.getElementById('dev-pettype').value        || 'dog',
  };
  localStorage.setItem('devSettings', JSON.stringify(dev));
  applySettings();
  showToast('🧪 Dev settings saved!');
}

function resetDevSettings() {
  localStorage.removeItem('devSettings');
  applySettings();
  openDevSettings(); // refresh displayed values
  showToast('↩️ Reset to defaults');
}

// ── fmtFullDate helper ───────────────────────────────────────────
function fmtFullDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ── Bottom Sheet ─────────────────────────────────────────────────
function openBottomSheet(section) {
  // 'new-note' opens the create note form
  // 'lists' when inside a note opens add item form
  const tplId = 'bs-tpl-' + section;
  const tpl = document.getElementById(tplId);
  const body = document.getElementById('bs-body');
  const title = document.getElementById('bs-title');
  const sheet = document.getElementById('bottom-sheet');
  const overlay = document.getElementById('bs-overlay');
  if (!tpl || !body || !sheet) return;
  const _pet = (typeof SETTINGS !== 'undefined' && SETTINGS.petName) || 'Luna';
  const sectionNames = { todos: 'Add Task', shopping: 'Add Item', calendar: 'Add Plan', birthdays: 'Add Birthday', glimmers: 'Add Glimmer', luna: `${_pet} Note`, lists: 'Add Item', 'new-note': 'New Note' };
  if (title) title.textContent = sectionNames[section] || '';
  body.innerHTML = '';
  body.appendChild(document.importNode(tpl.content, true));
  if (overlay) overlay.classList.add('open');
  sheet.classList.add('open');
  // Rotate nav button to signal open state
  if (window._jottieActiveSection && window._jottieActiveSection !== 'today') {
    const navFab = document.getElementById('nav-fab-main');
    if (navFab) navFab.classList.add('open');
  }
  // For notes: render context-aware item form after template is inserted
  if (section === 'lists') renderNoteItemForm();
  // For glimmers: reset tags, render preset buttons, wire image input
  if (section === 'glimmers') {
    resetTagInput('glimmer');
    if (typeof wireGlimmerImgInput === 'function') wireGlimmerImgInput();
  }
  // For new-note: reset tags, render presets, select first emoji
  if (section === 'new-note') {
    resetTagInput('note');
    setTimeout(() => {
      const firstEmoji = document.querySelector('.emoji-opt');
      if (firstEmoji) { firstEmoji.classList.add('selected'); }
    }, 50);
  }
  // Wire up Enter key for inputs injected from template
  ['ev-title','sh-name','td-title'].forEach((id, idx) => {
    const fns = [addEvent, addShopItem, addTodo];
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') fns[idx](); });
  });
  const giftNameEl = document.getElementById('gift-name');
  if (giftNameEl) giftNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') addGift(); });
  // Set calendar date default
  const evDateEl = document.getElementById('ev-date');
  if (evDateEl && !evDateEl.value) evDateEl.value = new Date().toISOString().split('T')[0];
}

function closeBottomSheet() {
  const sheet = document.getElementById('bottom-sheet');
  const overlay = document.getElementById('bs-overlay');
  if (sheet) sheet.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  // Remove rotation from nav button
  const navFab = document.getElementById('nav-fab-main');
  if (navFab) navFab.classList.remove('open');
}

// ── Tagging config ───────────────────────────────────────────────
// Add entries here to extend tagging to new sections in future.
const PRESET_TAGS = ['luna', 'us', 'family', 'holiday'];

// Maps a tag (lowercase) to the section that should display items with that tag.
// Used to drive cross-section routing (e.g. Luna memories, Luna notes).
const TAG_SECTION_MAP = {
  luna: 'luna'
};

// ── Tag input (shared by glimmers / notes forms) ──────────────────
const _tagInputState = {};

function handleTagInputKeydown(e, prefix) {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const input = document.getElementById(`${prefix}-tag-input`);
  if (!input) return;
  addTagChip(prefix, input.value);
  input.value = '';
}

function addTagChip(prefix, raw) {
  const tag = String(raw).trim().toLowerCase().replace(/^#/, '');
  if (!tag) return;
  const tags = _tagInputState[prefix] || (_tagInputState[prefix] = []);
  if (!tags.includes(tag)) tags.push(tag);
  renderTagChips(prefix);
  renderPresetTags(prefix); // keep preset buttons in sync
}

function removeTagChip(prefix, tag) {
  _tagInputState[prefix] = (_tagInputState[prefix] || []).filter(t => t !== tag);
  renderTagChips(prefix);
  renderPresetTags(prefix);
}
window.removeTagChip = removeTagChip;

function renderTagChips(prefix) {
  const el = document.getElementById(`${prefix}-tag-chips`);
  if (!el) return;
  const tags = _tagInputState[prefix] || [];
  // Only show chips for custom (non-preset) tags — presets are shown as buttons
  const custom = tags.filter(t => !PRESET_TAGS.includes(t));
  el.innerHTML = custom.map(t =>
    `<span class="tag-chip">#${esc(t)}<button type="button" onclick="removeTagChip('${prefix}','${esc(t)}')" aria-label="Remove tag">✕</button></span>`
  ).join('');
}

function renderPresetTags(prefix) {
  const el = document.getElementById(`${prefix}-tag-presets`);
  if (!el) return;
  const active = _tagInputState[prefix] || [];
  el.innerHTML = PRESET_TAGS.map(t =>
    `<button type="button" class="tag-preset-btn${active.includes(t) ? ' active' : ''}"
      onclick="selectPresetTag('${prefix}','${t}')">#${t}</button>`
  ).join('');
}

function selectPresetTag(prefix, tag) {
  const tags = _tagInputState[prefix] || (_tagInputState[prefix] = []);
  if (tags.includes(tag)) {
    _tagInputState[prefix] = tags.filter(t => t !== tag);
  } else {
    tags.push(tag);
  }
  renderPresetTags(prefix);
  renderTagChips(prefix);
}
window.selectPresetTag = selectPresetTag;

function resetTagInput(prefix) {
  _tagInputState[prefix] = [];
  const input = document.getElementById(`${prefix}-tag-input`);
  if (input) input.value = '';
  renderTagChips(prefix);
  renderPresetTags(prefix);
}

function getTagInputValue(prefix) {
  return (_tagInputState[prefix] || []).slice();
}

function bsListTab(name, btn) {
  document.querySelectorAll('#bs-lists-tabs .list-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bs-list-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('bs-list-panel-' + name);
  if (panel) panel.classList.add('active');
}

// ── Name setup ──────────────────────────────────────────────────
function setUser(name) {
  localStorage.setItem('jottie-name', name);
  me = name;
  document.getElementById('name-overlay').style.display = 'none';
  document.getElementById('header-greeting').textContent = `${getGreeting()}, ${name}!`;
  document.getElementById('header-date').textContent = fmtFullDate(new Date());
  renderToday();
  setTimeout(checkNotifStatus, 600);
  if (typeof listenNotifications === 'function') listenNotifications();
}

// Wire up name buttons safely (guard against null if DOM not ready)
(function() {
  function wireNameBtns() {
    const lottieBtn = document.getElementById('name-lottie-btn');
    const jonnyBtn  = document.getElementById('name-jonny-btn');
    if (lottieBtn) lottieBtn.onclick = () => setUser('Lottie');
    if (jonnyBtn)  jonnyBtn.onclick  = () => setUser('Jonny');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireNameBtns);
  } else {
    wireNameBtns();
  }
})();

// ── Navigation ───────────────────────────────────────────────────
function navTo(sec, navItemEl) {
  // Update new bottom nav active state
  if (sec === 'today') setNavActive('nav-today-btn');
  else setNavActive('nav-more-btn');
  // hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sec + '-section').classList.add('active');

  // update bottom nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navItemEl) {
    navItemEl.classList.add('active');
  } else {
    const match = document.querySelector(`.nav-item[data-section="${sec}"]`);
    if (match) match.classList.add('active');
  }

  // update drawer tile active state
  document.querySelectorAll('.drawer-tile').forEach(t => t.classList.remove('active'));
  const drawerMatch = document.querySelector(`.drawer-tile[data-section="${sec}"]`);
  if (drawerMatch) drawerMatch.classList.add('active');

  // update header section title
  const _petName = (typeof SETTINGS !== 'undefined' && SETTINGS.petName) || 'Luna';
  const sectionNames = {"today":"Today","calendar":"Plans","shopping":"Shopping","todos":"To-Do","lists":"Notes","birthdays":"Birthdays","glimmers":"Glimmers","luna":`${_petName} 🐾`,"dev-settings":"🧪 Dev Settings"};
  const titleEl = document.getElementById('section-title');
  if (titleEl) titleEl.textContent = sectionNames[sec] || '';
  // Toggle greeting (today) vs section title (all others)
  const greetingEl  = document.getElementById('header-greeting');
  const dateEl      = document.getElementById('header-date');
  const secTitleEl  = document.getElementById('header-section-title');
  if (greetingEl && dateEl && secTitleEl) {
    if (sec === 'today') {
      greetingEl.style.display = '';
      dateEl.style.display = '';
      secTitleEl.style.display = 'none';
    } else {
      greetingEl.style.display = 'none';
      dateEl.style.display = 'none';
      secTitleEl.style.display = '';
      secTitleEl.textContent = sectionNames[sec] || sec;
    }
  }

  if (typeof updateFabForSection === 'function') updateFabForSection(sec);

  // section-specific hooks
  if (sec === 'birthdays') renderBirthdaysDash();
  if (sec === 'glimmer-detail') return; // handled by openGlimmerDetail directly
  if (sec === 'glimmers') {
    if (typeof initGlimmerSection === 'function') initGlimmerSection();
    if (typeof loadGlimmersList === 'function') loadGlimmersList();
    if (typeof loadStreakData === 'function') loadStreakData();
  }
  if (sec === 'luna') {
    if (typeof listenLunaMemories === 'function') listenLunaMemories();
    if (typeof listenLunaNotes === 'function') listenLunaNotes();
  }
  if (sec === 'dev-settings') openDevSettings();
}

function openDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (drawer && drawer.classList.contains('open')) {
    closeDrawer();
  } else {
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
  }
}

function closeDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
}

// ── Drawer drag-to-close ──────────────────────────────────────────
(function() {
  let startY = 0, isDragging = false;
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  drawer.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    isDragging = true;
    drawer.style.transition = 'none';
  }, {passive: true});
  drawer.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) drawer.style.transform = `translateY(${dy}px)`;
  }, {passive: true});
  drawer.addEventListener('touchend', e => {
    isDragging = false;
    drawer.style.transition = '';
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 80) {
      closeDrawer();
    }
    drawer.style.transform = '';
  });
})();

// ── Helpers ──────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
          .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function dayOf(d) {
  if (!d) return '?';
  return new Date(d + 'T00:00:00').getDate();
}
function monOf(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleString('default',{month:'short'}).toUpperCase();
}
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
}

function ago(ts) {
  if (!ts) return '';
  const d = Date.now() - ts.toMillis();
  if (d < 60000)     return 'just now';
  if (d < 3600000)   return Math.floor(d/60000) + 'm ago';
  if (d < 86400000)  return Math.floor(d/3600000) + 'h ago';
  return Math.floor(d/86400000) + 'd ago';
}

function avatarBadge(name) {
  const u1 = (typeof SETTINGS !== 'undefined' && SETTINGS.user1Name) || 'Lottie';
  const u2 = (typeof SETTINGS !== 'undefined' && SETTINGS.user2Name) || 'Jonny';
  let cls = 'avatar-shared';
  if (name === u1) cls = 'avatar-user1';
  else if (name === u2) cls = 'avatar-user2';
  const initial = (name || '').trim().charAt(0).toUpperCase() || '?';
  return `<span class="todo-avatar ${cls}" title="${esc(name || '')}">${esc(initial)}</span>`;
}

function badge(name) {
  return avatarBadge(name);
}

// ── Plans ─────────────────────────────────────────────────────
function addEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const date  = document.getElementById('ev-date').value;
  const time  = document.getElementById('ev-time').value;
  const notes = document.getElementById('ev-notes').value.trim();
  if (!title || !date) return;
  if (!db) return;
  db.collection('calendar').add({
    title, date, time, notes,
    addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    sendNotification('📅 Plans', `${me} added ${title}`);
    document.getElementById('ev-title').value = '';
    document.getElementById('ev-time').value  = '';
    document.getElementById('ev-notes').value = '';
  });
}

function delEvent(id) { db.collection('calendar').doc(id).delete(); }

function listenCalendar() {
  db.collection('calendar').orderBy('date','asc')
    .onSnapshot(snap => {
      _calData = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderToday();
      const el = document.getElementById('calendar-list');
      if (snap.empty) {
        el.innerHTML = '<div class="empty"><div class="emo">📅</div><p>No events yet — add your first one above!</p></div>';
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const upcoming = [], past = [];
      snap.docs.forEach(doc => {
        const ev = {id: doc.id, ...doc.data()};
        (ev.date >= today ? upcoming : past).push(ev);
      });

      let html = '';
      if (upcoming.length === 0 && past.length > 0) {
        html += '<div class="empty"><div class="emo">📅</div><p>No upcoming events</p></div>';
      }
      // Group upcoming by month
      let lastMonth = null;
      upcoming.forEach(ev => {
        const monthLabel = new Date(ev.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (monthLabel !== lastMonth) {
          html += `<div class="month-divider"><span>${monthLabel}</span></div>`;
          lastMonth = monthLabel;
        }
        html += evCard(ev, false);
      });
      if (past.length > 0) {
        html += `<div class="list-label" style="margin-top:16px;opacity:0.6">Past</div>`;
        [...past].reverse().forEach(ev => { html += evCard(ev, true); });
      }
      el.innerHTML = html;
    });
}

function evCard(ev, isPast) {
  return `
  <div class="item-card${isPast ? ' done' : ''}">
    <div class="date-pill">
      <div class="date-day">${dayOf(ev.date)}</div>
      <div class="date-month">${monOf(ev.date)}</div>
    </div>
    <div class="item-body">
      <div class="item-title">${esc(ev.title)}</div>
      ${ev.time  ? `<div class="item-notes">⏰ ${esc(ev.time)}</div>` : ''}
      ${ev.notes ? `<div class="item-notes">${esc(ev.notes)}</div>` : ''}
      <div class="item-meta">${badge(ev.addedBy)} · ${ago(ev.createdAt)}</div>
    </div>
    <button class="del-btn" onclick="delEvent('${ev.id}')">✕</button>
  </div>`;
}

// ── Shopping ─────────────────────────────────────────────────────
function addShopItem() {
  const name   = document.getElementById('sh-name').value.trim();
  const catSel = document.getElementById('sh-cat').value;
  const cat    = catSel === '__other__' ? document.getElementById('sh-cat-custom').value.trim() : catSel;
  if (!name) return;
  if (!db) return;
  db.collection('shopping').add({
    name, cat, completed: false,
    addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    sendShoppingNotification(name);
    document.getElementById('sh-name').value = '';
    document.getElementById('sh-cat').value  = '';
    document.getElementById('sh-cat-custom').value = '';
    document.getElementById('sh-cat-custom').style.display = 'none';
  });
}

function toggleShop(id, done) { db.collection('shopping').doc(id).update({completed: !done}); }
function delShop(id)          { db.collection('shopping').doc(id).delete(); }
function clearDoneShop() {
  db.collection('shopping').where('completed','==',true).get()
    .then(s => s.docs.forEach(d => d.ref.delete()));
}

function listenShopping() {
  db.collection('shopping').orderBy('createdAt','asc')
    .onSnapshot(snap => {
      _shopData = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderToday();
      const el = document.getElementById('shopping-list');
      if (snap.empty) {
        el.innerHTML = '<div class="empty"><div class="emo">🛒</div><p>Shopping list is empty!</p></div>';
        return;
      }
      const items  = snap.docs.map(d => ({id:d.id,...d.data()}));
      const active = items.filter(i => !i.completed);
      const done   = items.filter(i =>  i.completed);

      let html = '<div class="list-label">To get</div>';
      if (active.length === 0) {
        html += '<div class="empty" style="padding:16px"><p>All done! 🎉</p></div>';
      }
      active.forEach(i => { html += shopCard(i); });

      if (done.length > 0) {
        html += `
          <div class="row-space" style="margin-top:14px">
            <div class="list-label" style="margin:0;opacity:0.6">In basket (${done.length})</div>
            <button class="clear-btn" onclick="clearDoneShop()">Clear all</button>
          </div>`;
        done.forEach(i => { html += shopCard(i); });
      }
      el.innerHTML = html;
    });
}

function shopCard(i) {
  const catStr = i.cat ? `${esc(i.cat)} · ` : '';
  return `
  <div class="item-card${i.completed ? ' done' : ''}">
    <div class="checkbox${i.completed ? ' checked' : ''}" onclick="toggleShop('${i.id}',${i.completed})"></div>
    <div class="item-body">
      <div class="item-title">${esc(i.name)}</div>
      <div class="item-meta">${catStr}${badge(i.addedBy)} · ${ago(i.createdAt)}</div>
    </div>
    <button class="del-btn" onclick="delShop('${i.id}')">✕</button>
  </div>`;
}

// ── To-Do ────────────────────────────────────────────────────────
function addTodo() {
  const title = document.getElementById('td-title').value.trim();
  const who   = document.getElementById('td-who').value;
  const due   = document.getElementById('td-due').value;
  const recur = document.getElementById('td-recur').value;
  if (!title) return;
  if (!db) return;
  db.collection('todos').add({
    title, who, due, recurrence: recur, completed: false,
    addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    sendNotification('✅ To-Do', `${me} added "${title}"`);
    document.getElementById('td-title').value  = '';
    document.getElementById('td-who').value    = '';
    document.getElementById('td-due').value    = '';
    document.getElementById('td-recur').value  = '';
  });
}

async function toggleTodo(id, done) {
  if (!done) {
    const snap = await db.collection('todos').doc(id).get();
    const d = snap.data();
    if (d && d.recurrence) {
      const base = new Date((d.due || new Date().toISOString().split('T')[0]) + 'T00:00:00');
     if (d.recurrence === 'daily')       base.setDate(base.getDate() + 1);
      if (d.recurrence === 'weekly')      base.setDate(base.getDate() + 7);
if (d.recurrence === 'fortnightly') base.setDate(base.getDate() + 14);
if (d.recurrence === 'monthly')     base.setMonth(base.getMonth() + 1);
if (d.recurrence === 'quarterly')   base.setMonth(base.getMonth() + 3);
if (d.recurrence === 'yearly')      base.setFullYear(base.getFullYear() + 1);
      db.collection('todos').add({
        title: d.title, who: d.who || '', due: base.toISOString().split('T')[0],
        recurrence: d.recurrence, completed: false, addedBy: d.addedBy,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  db.collection('todos').doc(id).update({completed: !done});
  // Write notification when completing a task (not un-completing)
  if (!done) {
    const t = (_todoData || []).find(x => x.id === id);
    if (t) writeNotif({ type: 'task_completed', icon: '☑️', title: `${me} completed a task`, subtitle: t.title, deepLink: { section: 'todos', taskId: id } });
  }
}
function delTodo(id)          { db.collection('todos').doc(id).delete(); }

// ── Todo filters state ─────────────────────────────────────────
let _todoFilter = { showJonny: true, showLottie: true, showDone: false };

function todoToggleFilter(key) {
  _todoFilter[key] = !_todoFilter[key];
  renderTodos();
}

function renderTodos() {
  const el = document.getElementById('todo-list');
  if (!el) return;
  const items = _todoData || [];
  const showDone = _todoFilter.showDone;

  // Filter by completion
  let filtered = items.filter(i => showDone ? i.completed : !i.completed);

  // Filter by assignee
  filtered = filtered.filter(i => {
    const who = i.who || 'Either';
    if (who === 'Both' || who === 'Either') return _todoFilter.showJonny || _todoFilter.showLottie;
    if (who === 'Jonny')  return _todoFilter.showJonny;
    if (who === 'Lottie') return _todoFilter.showLottie;
    return true;
  });

  // Update header count
  const activeCount = items.filter(i => !i.completed).length;
  const countEl = document.getElementById('todo-open-count');
  if (countEl) countEl.textContent = activeCount;

  // Update filter button states
  const btnJ = document.getElementById('todo-filter-j');
  const btnL = document.getElementById('todo-filter-l');
  const btnDone = document.getElementById('todo-filter-done');
  if (btnJ) btnJ.classList.toggle('filter-off', !_todoFilter.showJonny);
  if (btnL) btnL.classList.toggle('filter-off', !_todoFilter.showLottie);
  if (btnDone) btnDone.classList.toggle('filter-done-active', _todoFilter.showDone);

  if (filtered.length === 0) {
    el.innerHTML = showDone
      ? '<div class="empty" style="padding:24px"><p>No completed tasks yet 🎉</p></div>'
      : '<div class="empty" style="padding:24px"><p>Nothing left to do! 🎉</p></div>';
    return;
  }

  // Group by due date
  const today = new Date(); today.setHours(0,0,0,0);
  const endThisMonth = new Date(today.getFullYear(), today.getMonth()+1, 0);
  const endNextMonth = new Date(today.getFullYear(), today.getMonth()+2, 0);

  const groups = { thisMonth: [], nextMonth: [], future: [], none: [] };
  filtered.forEach(i => {
    if (!i.due) { groups.none.push(i); return; }
    const d = new Date(i.due + 'T00:00:00');
    if (d <= endThisMonth)      groups.thisMonth.push(i);
    else if (d <= endNextMonth) groups.nextMonth.push(i);
    else                        groups.future.push(i);
  });
  // Sort each group by due date
  const byDue = (a,b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1; if (!b.due) return -1;
    return a.due < b.due ? -1 : 1;
  };
  groups.thisMonth.sort(byDue); groups.nextMonth.sort(byDue);
  groups.future.sort(byDue);

  let html = '';
  const renderGroup = (label, list) => {
    if (!list.length) return;
    html += `<div class="todo-group-label">${label}</div>`;
    list.forEach(i => { html += todoCard(i); });
  };
  renderGroup('This Month', groups.thisMonth);
  renderGroup('Next Month', groups.nextMonth);
  renderGroup('In The Future', groups.future);
  renderGroup('No Due Date', groups.none);

  el.innerHTML = html;
}

function listenTodos() {
  db.collection('todos').orderBy('createdAt','asc')
    .onSnapshot(snap => {
      _todoData = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderToday();
      renderTodos();
    });
}

function todoDuePill(due) {
  if (!due) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(due + 'T00:00:00');
  const diffDays = Math.round((d - today) / 86400000);

  let label;
  if (diffDays === 0)       label = 'Today';
  else if (diffDays === 1)  label = 'Tomorrow';
  else if (diffDays === -1) label = 'Yesterday';
  else if (diffDays < 0)    label = fmtDate(due);
  else                      label = fmtDate(due);

  let cls = 'due-pill-green';
  if (diffDays <= 3)      cls = 'due-pill-red';
  else if (diffDays <= 7) cls = 'due-pill-amber';

  return `<span class="due-pill ${cls}">${label}</span>`;
}

function todoCard(i) {
  const who = i.who || 'Either';

  // Avatar indicators
  let avatars = '';
  if (who === 'Jonny')  avatars = '<span class="todo-avatar todo-avatar-j">J</span>';
  else if (who === 'Lottie') avatars = '<span class="todo-avatar todo-avatar-l">L</span>';
  else avatars = '<span class="todo-avatar todo-avatar-j">J</span><span class="todo-avatar todo-avatar-l">L</span>';

  // Shadow class
  let shadowCls = '';
  if (who === 'Lottie')        shadowCls = ' shadow-lottie';
  else if (who === 'Jonny')    shadowCls = ' shadow-jonny';
  else                         shadowCls = ' shadow-both';

  const repeatIcon = i.recurrence ? '<span class="todo-repeat-icon">↻</span>' : '';
  const duePill = todoDuePill(i.due);

  return `
  <div class="item-card todo-card${i.completed ? ' done' : ''}${shadowCls}" onclick="todoCardClick(event,'${i.id}',${i.completed})">
    <div class="checkbox${i.completed ? ' checked' : ''}" onclick="event.stopPropagation();toggleTodo('${i.id}',${i.completed})"></div>
    <div class="item-body">
      <div class="todo-avatars">${avatars}</div>
      <div class="item-title">${esc(i.title)}</div>
    </div>
    ${duePill}
    ${repeatIcon}
  </div>`;
}

function todoCardClick(e, id, completed) {
  openTaskDetail(id);
}

// ── Task Detail View ────────────────────────────────────────────

let _currentTaskId = null;
let _taskSubtasksUnsub = null;

function openTaskDetail(taskId) {
  const task = _todoData.find(t => t.id === taskId);
  if (!task) return;
  _currentTaskId = taskId;

  renderTaskDetailBody(task);

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('task-detail-section').classList.add('active');
  document.getElementById('section-title').textContent = 'Task';
  if (typeof updateFabForSection === 'function') updateFabForSection('task-detail');

  // Listen to subtasks
  if (_taskSubtasksUnsub) { _taskSubtasksUnsub(); _taskSubtasksUnsub = null; }
  _taskSubtasksUnsub = db.collection('todos').doc(taskId).collection('subtasks')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      const subtasks = snap.docs.map(d => ({id: d.id, ...d.data()}));
      renderTaskSubtasks(taskId, subtasks);
    });
}

function closeTaskDetail() {
  if (_taskSubtasksUnsub) { _taskSubtasksUnsub(); _taskSubtasksUnsub = null; }
  _currentTaskId = null;
  navTo('todos');
}

function renderTaskDetailBody(task) {
  const who = task.who || 'Either';

  // Avatars
  let avatars = '';
  if (who === 'Jonny')       avatars = '<span class="todo-avatar todo-avatar-j">J</span>';
  else if (who === 'Lottie') avatars = '<span class="todo-avatar todo-avatar-l">L</span>';
  else                       avatars = '<span class="todo-avatar todo-avatar-j">J</span><span class="todo-avatar todo-avatar-l">L</span>';

  // Due date + urgency pill
  let dueRow = '';
  if (task.due) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(task.due + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    let urgencyLabel, urgencyCls;
    if (diff < 0)       { urgencyLabel = 'Overdue';              urgencyCls = 'due-pill-red'; }
    else if (diff === 0){ urgencyLabel = 'Due today';            urgencyCls = 'due-pill-red'; }
    else if (diff <= 3) { urgencyLabel = `Due in ${diff} day${diff>1?'s':''}`;  urgencyCls = 'due-pill-red'; }
    else if (diff <= 7) { urgencyLabel = diff === 7 ? 'Due next week' : `Due in ${diff} days`; urgencyCls = 'due-pill-amber'; }
    else                { urgencyLabel = `Due ${fmtDate(task.due)}`; urgencyCls = 'due-pill-green'; }
    dueRow = `
      <div class="td-meta-row">
        ${avatars}
        <span class="td-due-date">📅 ${fmtDate(task.due)}</span>
        <span class="due-pill ${urgencyCls}">${urgencyLabel}</span>
      </div>`;
  } else {
    dueRow = `<div class="td-meta-row">${avatars}</div>`;
  }

  // Recurrence card
  const recurCard = task.recurrence ? `
    <div class="td-section-card">
      <span class="td-recur-icon">🔄</span>
      <span class="td-recur-label">${esc(task.recurrence)}</span>
    </div>` : '';

  // Notes card
  const notesCard = task.notes ? `
    <div class="td-section-card td-notes-card">
      <div class="td-section-title">Notes</div>
      <div class="td-notes-text">${esc(task.notes).replace(/\n/g,'<br>')}</div>
    </div>` : '';

  // Metadata
  const metaParts = [];
  if (task.addedBy)   metaParts.push(`Created by ${esc(task.addedBy)}`);
  if (task.updatedBy) metaParts.push(`Last updated by ${esc(task.updatedBy)}`);
  if (task.completed && task.completedBy) metaParts.push(`Completed by ${esc(task.completedBy)}`);
  if (task.completed && task.completedAt) {
    const cd = new Date(task.completedAt.toMillis ? task.completedAt.toMillis() : task.completedAt);
    metaParts.push(`Completed ${cd.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`);
  }
  const metaHtml = metaParts.length ? `<div class="td-meta-footer">${metaParts.join(' · ')}</div>` : '';

  document.getElementById('task-detail-body').innerHTML = `
    <h1 class="td-title">${esc(task.title)}</h1>
    ${dueRow}
    ${recurCard}
    ${notesCard}
    <div class="td-subtasks-section" id="td-subtasks-${task.id}">
      <div class="td-section-title td-subtasks-header">Subtasks</div>
      <div class="loading" style="font-size:13px;padding:8px 0">Loading…</div>
    </div>
    ${metaHtml}
  `;
}

function renderTaskSubtasks(taskId, subtasks) {
  const el = document.getElementById('td-subtasks-' + taskId);
  if (!el) return;

  let html = '<div class="td-section-title td-subtasks-header">Subtasks</div>';
  subtasks.forEach(s => {
    html += `
      <div class="td-subtask-row">
        <div class="checkbox${s.completed ? ' checked' : ''}" onclick="toggleSubtask('${taskId}','${s.id}',${s.completed})"></div>
        <span class="td-subtask-title${s.completed ? ' done-text' : ''}">${esc(s.title)}</span>
        <button class="td-subtask-del" onclick="deleteSubtask('${taskId}','${s.id}')" aria-label="Remove subtask">✕</button>
      </div>`;
  });
  html += `
    <div class="td-add-subtask-row">
      <input class="td-subtask-input" id="td-subtask-input" type="text" placeholder="Add subtask…" onkeydown="if(event.key==='Enter')addSubtask('${taskId}')">
      <button class="td-subtask-add-btn" onclick="addSubtask('${taskId}')">+</button>
    </div>`;

  el.innerHTML = html;
}

function deleteSubtask(taskId, subtaskId) {
  db.collection('todos').doc(taskId).collection('subtasks').doc(subtaskId).delete();
}

function toggleSubtask(taskId, subtaskId, done) {
  db.collection('todos').doc(taskId).collection('subtasks').doc(subtaskId).update({completed: !done});
}

function addSubtask(taskId) {
  const inp = document.getElementById('td-subtask-input');
  if (!inp) return;
  const title = inp.value.trim();
  if (!title) return;
  inp.value = '';
  db.collection('todos').doc(taskId).collection('subtasks').add({
    title,
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ── Task menu ───────────────────────────────────────────────────
function openTaskMenu() {
  document.getElementById('task-menu-overlay').classList.add('open');
  document.getElementById('task-menu').classList.add('open');
}
function closeTaskMenu() {
  document.getElementById('task-menu-overlay').classList.remove('open');
  document.getElementById('task-menu').classList.remove('open');
}
function taskMenuEdit() {
  closeTaskMenu();
  showToast('✏️ Edit Task coming soon');
}
function taskMenuPin() {
  closeTaskMenu();
  if (!_currentTaskId) return;
  const task = _todoData.find(t => t.id === _currentTaskId);
  if (!task) return;
  db.collection('todos').doc(_currentTaskId).update({pinned: !task.pinned})
    .then(() => showToast(task.pinned ? 'Unpinned' : '📌 Task pinned'));
}
function taskMenuDelete() {
  closeTaskMenu();
  if (!_currentTaskId) return;
  if (!confirm('Delete this task permanently? This cannot be undone.')) return;
  const id = _currentTaskId;
  closeTaskDetail();
  db.collection('todos').doc(id).delete()
    .then(() => showToast('Task deleted'))
    .catch(() => showToast('⚠️ Delete failed'));
}

// ── Luna's daily routine ───────────────────────────────────────────
// One Firestore doc holds the whole day's state. Whoever's app first
// notices the date has rolled over overwrites it with a fresh default —
// none of this needs to be kept long-term.
const LUNA_ROUTINE_DEFS = [
  { id: 'walk1',  icon: '🦮', title: 'Morning walk',              time: '08:00', sub: 'Quick one round the block' },
  { id: 'bfast',  icon: '🍳', title: 'Breakfast + YuMove vitamin', time: '08:30', sub: 'Joint vitamin tucked in her bowl' },
  { id: 'chew1',  icon: '🥨', title: 'Twisty chew',                time: '13:00', sub: 'Lunchtime treat' },
  { id: 'walk2',  icon: '🐾', title: 'Afternoon walk',             time: '17:30', sub: 'The long loop round the park' },
  { id: 'dinner', icon: '🍽️', title: 'Dinner',                     time: '18:00', sub: '' },
  { id: 'chew2',  icon: '🦷', title: 'Chompy chew',                time: '19:00', sub: 'Evening dental chew' },
  { id: 'wee',    icon: '🌙', title: 'Night-time wee',              time: '22:30', sub: 'Last garden trip before bed' },
];
const LUNA_MAX_TREATS = 14;

let _lunaRoutine = null; // { dateKey, items: { [id]: {done, by, at} }, treats }

function lunaDateKey(d) {
  d = d || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function lunaDefaultItemsMap() {
  const map = {};
  LUNA_ROUTINE_DEFS.forEach(d => { map[d.id] = { done: false, by: null, at: null }; });
  return map;
}

function lunaFmtSchedTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return hh + ':' + String(m).padStart(2, '0') + ap;
}

function lunaFmtLoggedTime(ts) {
  if (!ts || !ts.toDate) return '';
  const d = ts.toDate();
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return h + ':' + String(m).padStart(2, '0') + ap;
}

function listenLunaRoutine() {
  if (!db) return;
  db.collection('luna-routine').doc('current').onSnapshot(snap => {
    const today = lunaDateKey();
    if (!snap.exists || snap.data().dateKey !== today) {
      db.collection('luna-routine').doc('current').set({
        dateKey: today,
        items: lunaDefaultItemsMap(),
        treats: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return; // onSnapshot fires again once the fresh doc lands
    }
    _lunaRoutine = snap.data();
    renderLunaRoutine();
    renderToday();
  });
}

function lunaToggleItem(id) {
  if (!db || !_lunaRoutine) return;
  const cur = _lunaRoutine.items[id] || {};
  const def = LUNA_ROUTINE_DEFS.find(d => d.id === id);
  const wasDone = cur.done;
  const next = wasDone
    ? { done: false, by: null, at: null }
    : { done: true, by: me, at: firebase.firestore.FieldValue.serverTimestamp() };
  db.collection('luna-routine').doc('current').update({ ['items.' + id]: next }).then(() => {
    if (!wasDone && def) {
      const _p = (typeof SETTINGS !== 'undefined' && SETTINGS.petName) || 'Luna';
      sendNotification(`🐾 ${_p}`, `${me} logged: ${def.title}`);
      writeNotif({ type: 'luna_update', icon: '🐶', title: `${_p}: ${def.title}`, subtitle: `Logged by ${me}`, deepLink: { section: 'luna' } });
    }
  });
}

function lunaAddTreat() {
  if (!db || !_lunaRoutine) return;
  db.collection('luna-routine').doc('current').update({ treats: Math.min((_lunaRoutine.treats || 0) + 1, LUNA_MAX_TREATS) });
}

function lunaRemoveTreat() {
  if (!db || !_lunaRoutine) return;
  db.collection('luna-routine').doc('current').update({ treats: Math.max((_lunaRoutine.treats || 0) - 1, 0) });
}

function lunaMergedItems() {
  if (!_lunaRoutine) return [];
  return LUNA_ROUTINE_DEFS.map(d => ({ ...d, ...(_lunaRoutine.items[d.id] || { done: false, by: null, at: null }) }));
}

function renderLunaRoutine() {
  const timelineEl = document.getElementById('luna-timeline');
  if (!timelineEl) return; // not on the Luna screen
  const _p = (typeof SETTINGS !== 'undefined' && SETTINGS.petName) || 'Luna';
  const items = lunaMergedItems();
  const total = items.length;
  const doneCount = items.filter(i => i.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const next = items.find(i => !i.done);
  const allDone = doneCount === total;

  document.getElementById('luna-hero-ring').style.background =
    `conic-gradient(#fff ${pct}%, rgba(255,255,255,.30) 0)`;
  document.getElementById('luna-hero-bar-fill').style.width = pct + '%';
  document.getElementById('luna-hero-count').textContent = `${doneCount}/${total}`;
  document.getElementById('luna-routine-chip').textContent = `${doneCount}/${total} done`;

  let headline, sub;
  if (allDone) {
    headline = `${_p}'s all set for today!`;
    sub = 'Every walk, meal & chew done. Good girl 🐾';
  } else if (doneCount === 0) {
    headline = `${_p}'s day awaits 🐾`;
    sub = 'Nothing logged yet · first up: ' + next.title;
  } else {
    headline = `${_p}'s having a lovely day`;
    sub = `${doneCount} of ${total} done · next: ${next.title} at ${lunaFmtSchedTime(next.time)}`;
  }
  document.getElementById('luna-hero-headline').textContent = headline;
  document.getElementById('luna-hero-sub').textContent = sub;

  timelineEl.innerHTML = items.map((it, idx) => `
    <div class="luna-tl-row" onclick="lunaToggleItem('${it.id}')">
      <div class="luna-tl-time">${lunaFmtSchedTime(it.time)}</div>
      <div class="luna-tl-icon-col">
        <div class="luna-tl-line" style="top:${idx === 0 ? '25px' : '0'};bottom:${idx === total - 1 ? 'calc(100% - 25px)' : '0'}"></div>
        <div class="luna-tl-icon">
          ${it.icon}
          ${it.done ? '<span class="luna-tl-badge">✓</span>' : ''}
        </div>
      </div>
      <div class="luna-tl-body">
        <div class="luna-tl-info">
          <div class="luna-tl-title${it.done ? ' done' : ''}">${esc(it.title)}</div>
          ${it.sub ? `<div class="luna-tl-sub">${esc(it.sub)}</div>` : ''}
          ${it.done ? `<div class="luna-tl-meta">${avatarBadge(it.by)}<span>${esc(it.by)} · ${lunaFmtLoggedTime(it.at)}</span></div>` : ''}
        </div>
        <div class="luna-tl-check${it.done ? ' done' : ''}">✓</div>
      </div>
    </div>`).join('');

  const treats = _lunaRoutine.treats || 0;
  document.getElementById('luna-biscuits-count').textContent = treats;
  document.getElementById('luna-biscuits-dots').innerHTML =
    Array.from({ length: treats }).map(() => '<span class="luna-biscuit-dot">🦴</span>').join('');
}

// ── Luna memories (glimmers tagged #Luna) ──────────────────────────
let _lunaMemoriesUnsub = null;
function listenLunaMemories() {
  if (!db) return;
  if (_lunaMemoriesUnsub) { _lunaMemoriesUnsub(); _lunaMemoriesUnsub = null; }
  const el = document.getElementById('luna-memories-scroll');
  if (!el) return;
  _lunaMemoriesUnsub = db.collection('glimmers').orderBy('createdAt', 'desc').limit(50)
    .onSnapshot(snap => {
      if (!el) return;
      const tagged = snap.docs.filter(d => {
        const tags = d.data().tags || [];
        return tags.some(t => String(t).toLowerCase() === 'luna');
      }).slice(0, 10);
      if (!tagged.length) {
        el.innerHTML = '<div class="luna-memories-empty">No memories tagged <b>#Luna</b> yet — tag a glimmer to see it here ✨</div>';
        return;
      }
      el.innerHTML = '';
      tagged.forEach(doc => {
        const card = buildGlimmerCard(doc, { mode: 'tile', from: 'luna' });
        if (card) el.appendChild(card);
      });
    }, () => {});
}

// ── Luna's notes (tagged #Luna) ─────────────────────────────────────
// ── Luna's notes — reads from main 'notes' collection tagged #luna ──
function listenLunaNotes() {
  if (!db) return;
  db.collection('notes')
    .orderBy('updatedAt', 'desc')
    .onSnapshot(snap => {
      const el = document.getElementById('luna-notes-list');
      if (!el) return;
      const docs = snap.docs.filter(d => {
        if (d.data().archived) return false;
        const tags = d.data().tags || [];
        return tags.some(t => String(t).toLowerCase() === 'luna');
      });
      if (!docs.length) {
        el.innerHTML = '<div class="empty"><div class="emo">📝</div><p>No Luna notes yet — tap + Add to create one!</p></div>';
        return;
      }
      el.innerHTML = docs.map(doc => {
        const n = { id: doc.id, ...doc.data() };
        const updLabel = n.updatedAt ? relativeDay(n.updatedAt) : '';
        return `<div class="luna-note-card" onclick="openNote('${n.id}')">
          <div class="luna-note-card-inner">
            <div class="luna-note-card-title">${esc(n.emoji || '📝')} ${esc(n.title)}</div>
            <div class="luna-note-card-count" id="luna-note-count-${n.id}">…</div>
            ${updLabel ? `<div class="luna-note-card-meta">${updLabel}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      // Load item counts async
      docs.forEach(doc => {
        db.collection('notes').doc(doc.id).collection('items').get().then(snap => {
          const el = document.getElementById(`luna-note-count-${doc.id}`);
          if (el) el.textContent = snap.size === 1 ? '1 item' : `${snap.size} items`;
        });
      });
    });
}



  

// ── FCM Push Notifications ─────────────────────────────────────────
// Paste your Web Push VAPID public key from Firebase Console →
// Project Settings → Cloud Messaging → Web Push certificates → Key pair
const VAPID_KEY = 'BDIzLqLjnrurx7t8S39LtfFY-BBj86Qmw04Zd-rj_3kRvKzKCksrKOvrARlqWanz836lAzB_HG7wJCnsgBPjLO0';

let messaging = null;

function initMessaging() {
  if (!configured || typeof firebase.messaging !== 'function') return;
  try {
    messaging = firebase.messaging();
    messaging.onMessage(payload => {
      // Notification bell handles foreground updates via Firestore listener
      // No toast needed here to avoid duplicate with the OS push notification
    });
  } catch(e) { console.warn('FCM init:', e); }
}

function _showInAppToast(title, body) {
  const el = Object.assign(document.createElement('div'), {
    textContent: `${title}: ${body}`
  });
  Object.assign(el.style, {
    position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)',
    background:'#1a1a2e', color:'white', padding:'12px 18px', borderRadius:'12px',
    fontSize:'14px', fontWeight:'600', zIndex:'9999', maxWidth:'320px',
    textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.3)'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function requestNotifPermission() {
  if (!messaging) { alert('Notifications not available — open this as an installed app.'); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') await _saveFCMToken();
    document.getElementById('notif-banner').style.display = 'none';
  } catch(e) { console.warn('Notif permission:', e); }
}

async function _saveFCMToken() {
  if (!messaging || !db || !me) return;
  try {
    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (token) {
      await db.collection('devices').doc(me).set({
        token, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch(e) { console.warn('FCM token save:', e); }
}

function checkNotifStatus() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    document.getElementById('notif-banner').style.display = 'flex';
  } else if (Notification.permission === 'granted') {
    _saveFCMToken();
  }
}

function sendNotification(title, body) {
  if (!db || !me) return;
  const targetUser = me === 'Lottie' ? 'Jonny' : 'Lottie';
  db.collection('notifications').add({
    targetUser, title, body,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(e => console.warn('Notif write:', e));
}
function sendShoppingNotification(itemName) {
  sendNotification('🛒 Shopping List', `${me} added ${itemName}`);
}

// ── Notification Settings (delivery preferences) ──────────────────
// Stored per-user at settings/{me}.notificationSettings so the
// Cloud Function can check the *recipient's* preference before
// sending a push (see functions.js). Structure is intentionally
// generic (mode + times map) so future phases — categories, custom
// times, generated summaries — can extend it without a rewrite.
function _defaultNotifSettings() {
  return { mode: 'roundup', times: { morning: true, lunch: false, evening: true } };
}

async function loadNotificationSettings() {
  if (!db || !me) return _defaultNotifSettings();
  try {
    const doc = await db.collection('settings').doc(me).get();
    return (doc.exists && doc.data().notificationSettings) || _defaultNotifSettings();
  } catch(e) { console.warn('loadNotificationSettings:', e); return _defaultNotifSettings(); }
}

function saveNotificationSettings() {
  if (!db || !me) return;
  const mode = document.getElementById('notif-mode-roundup').checked ? 'roundup' : 'instant';
  const settings = {
    mode,
    times: {
      morning: document.getElementById('notif-time-morning').checked,
      lunch:   document.getElementById('notif-time-lunch').checked,
      evening: document.getElementById('notif-time-evening').checked,
    }
  };
  db.collection('settings').doc(me).set({ notificationSettings: settings }, { merge: true })
    .catch(e => console.warn('saveNotificationSettings:', e));
}

function _updateRoundupCardsVisibility() {
  const isRoundup = document.getElementById('notif-mode-roundup').checked;
  const display = isRoundup ? '' : 'none';
  document.getElementById('notif-roundup-times-card').style.display = display;
  document.getElementById('notif-roundup-preview-card').style.display = display;
}

function onNotifModeChange() {
  _updateRoundupCardsVisibility();
  saveNotificationSettings();
}

let _notifSettingsFrom = 'today';

async function openNotificationSettings() {
  closeNotifPanel();
  const activeSection = document.querySelector('.section.active');
  if (activeSection) _notifSettingsFrom = activeSection.id.replace('-section', '');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('notification-settings-section').classList.add('active');

  const settings = await loadNotificationSettings();
  document.getElementById('notif-mode-' + settings.mode).checked = true;
  document.getElementById('notif-time-morning').checked = !!settings.times.morning;
  document.getElementById('notif-time-lunch').checked   = !!settings.times.lunch;
  document.getElementById('notif-time-evening').checked = !!settings.times.evening;
  _updateRoundupCardsVisibility();
}

function closeNotificationSettings() {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById((_notifSettingsFrom || 'today') + '-section').classList.add('active');
}

// ── Notification Centre ─────────────────────────────────────────

let _notifUnsub = null;
let _notifData  = [];
let _notifPanelOpen = false;

// Write a structured notification (new schema, always use this going forward)
function writeNotif({ type, icon, title, subtitle, deepLink }) {
  if (!db || !me) return;
  const targetUser = me === 'Lottie' ? 'Jonny' : 'Lottie';
  db.collection('notifications').add({
    targetUser, type, icon, title, subtitle,
    deepLink: deepLink || null,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(e => console.warn('writeNotif:', e));
}

function listenNotifications() {
  if (!db || !me) return;
  if (_notifUnsub) { _notifUnsub(); _notifUnsub = null; }
  _notifUnsub = db.collection('notifications')
    .where('targetUser', '==', me)
    .orderBy('createdAt', 'desc')
    .limit(60)
    .onSnapshot(snap => {
      _notifData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _updateNotifDot();
      if (_notifPanelOpen) _renderNotifPanel();
    }, e => console.warn('listenNotifications:', e));
}

function _updateNotifDot() {
  const dot = document.getElementById('notif-bell-dot');
  if (!dot) return;
  const hasUnread = _notifData.some(n => !n.read);
  dot.style.display = hasUnread ? '' : 'none';
}

function toggleNotifPanel() {
  _notifPanelOpen ? closeNotifPanel() : openNotifPanel();
}

function openNotifPanel() {
  _notifPanelOpen = true;
  _renderNotifPanel();
  document.getElementById('notif-panel').classList.add('open');
  document.getElementById('notif-overlay').classList.add('open');
}

function closeNotifPanel() {
  _notifPanelOpen = false;
  document.getElementById('notif-panel').classList.remove('open');
  document.getElementById('notif-overlay').classList.remove('open');
}

function _notifTimestamp(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMs / 3600000);
  if (diffMins < 2)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;
  const tod = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 1) return `Yesterday · ${tod}`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` · ${tod}`;
}

function _notifGroup(ts) {
  if (!ts) return 'earlier';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const todayStr = now.toDateString();
  const yestStr  = new Date(now - 86400000).toDateString();
  if (d.toDateString() === todayStr) return 'today';
  if (d.toDateString() === yestStr)  return 'yesterday';
  return 'earlier';
}

function _renderNotifPanel() {
  const body = document.getElementById('notif-panel-body');
  if (!body) return;

  if (!_notifData.length) {
    body.innerHTML = '<div class="notif-empty">Nothing yet — check back later 💜</div>';
    return;
  }

  const groups = { today: [], yesterday: [], earlier: [] };
  _notifData.forEach(n => {
    const g = _notifGroup(n.createdAt);
    groups[g].push(n);
  });

  const labels = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' };
  let html = '';
  ['today', 'yesterday', 'earlier'].forEach(key => {
    if (!groups[key].length) return;
    html += `<div class="notif-group-label">${labels[key]}</div>`;
    groups[key].forEach(n => {
      const icon = n.icon || (n.title ? n.title.split(' ')[0] : '🔔');
      const readCls = n.read ? ' notif-read' : '';
      const dot = n.read ? '' : '<span class="notif-unread-dot"></span>';
      html += `
        <div class="notif-row${readCls}" onclick="openNotif('${n.id}')">
          ${dot}
          <div class="notif-icon-wrap">${icon}</div>
          <div class="notif-content">
            <div class="notif-title">${esc(n.title || '')}</div>
            ${n.subtitle ? `<div class="notif-subtitle">${esc(n.subtitle)}</div>` : ''}
            <div class="notif-time">${_notifTimestamp(n.createdAt)}</div>
          </div>
          <span class="notif-chevron">›</span>
        </div>`;
    });
  });
  body.innerHTML = html;
}

function openNotif(id) {
  const n = _notifData.find(x => x.id === id);
  if (!n) return;
  // Mark read
  if (!n.read) {
    db.collection('notifications').doc(id).update({ read: true });
  }
  closeNotifPanel();
  // Navigate via deepLink
  if (n.deepLink) {
    const dl = n.deepLink;
    if (dl.section) {
      navTo(dl.section);
      if (dl.taskId)    setTimeout(() => openTaskDetail(dl.taskId), 100);
      if (dl.glimmerId) setTimeout(() => openGlimmerDetail(dl.glimmerId), 100);
    }
  }
}

function markAllNotifsRead() {
  const batch = db.batch();
  _notifData.filter(n => !n.read).forEach(n => {
    batch.update(db.collection('notifications').doc(n.id), { read: true });
  });
  batch.commit().catch(e => console.warn('markAllRead:', e));
}


// ── Shop selector ────────────────────────────────────────────────
function handleShopSelect(sel) {
  const c = document.getElementById('sh-cat-custom');
  c.style.display = sel.value === '__other__' ? 'block' : 'none';
  if (sel.value === '__other__') c.focus();
}

// ── Lists Hub ─────────────────────────────────────────────────────

// Sub-tab switching
function switchListTab(name, btn) {
  document.querySelectorAll('.list-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.list-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('list-panel-' + name).classList.add('active');
}

// ── Wishlist ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
// NOTES HUB
// ════════════════════════════════════════════════════════════════

const PROTECTED_NOTES = ['wishlist', 'watchlist', 'dateideas']; // slugs used as doc IDs
let _notesData = [];
let _currentNoteId = null;
let _noteItemsUnsub = null;

// ── Default notes (created once if collection is empty) ───────────
const DEFAULT_NOTES = [
  { id: 'wishlist',   title: 'Wishlist',   emoji: '🛍️', pinned: false },
  { id: 'watchlist',  title: 'Watchlist',  emoji: '🎬', pinned: false },
  { id: 'dateideas',  title: 'Date Ideas', emoji: '🌷', pinned: false },
];

async function maybeCreateDefaultNotes() {
  const col = db.collection('notes');
  const snap = await col.limit(1).get();
  if (!snap.empty) return; // already has notes, don't touch
  const batch = db.batch();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  DEFAULT_NOTES.forEach(n => {
    batch.set(col.doc(n.id), {
      title: n.title, emoji: n.emoji, pinned: n.pinned,
      archived: false, createdAt: now, updatedAt: now,
      protected: true
    });
  });
  await batch.commit();
}

// ── Migrate existing wishlist/watchlist/dateideas items ────────────
async function migrateOldCollections() {
  const migrations = [
    {
      col: 'wishlist', noteId: 'wishlist',
      map: d => ({ text: d.name || '', addedBy: d.addedBy || '', createdAt: d.createdAt,
                   completed: false, link: d.url || '', notes: d.price ? '£'+d.price : '',
                   emoji: d.emoji || '🎁' })
    },
    {
      col: 'watchlist', noteId: 'watchlist',
      map: d => ({ text: d.title || '', addedBy: d.addedBy || '', createdAt: d.createdAt,
                   completed: false, link: '', notes: [d.type, d.genre].filter(Boolean).join(' · '),
                   emoji: {Film:'🎬','TV Show':'📺',Documentary:'🎥',Anime:'⛩️',Other:'📽️'}[d.type] || '📽️' })
    },
    {
      col: 'dateideas', noteId: 'dateideas',
      map: d => ({ text: d.title || '', addedBy: d.addedBy || '', createdAt: d.createdAt,
                   completed: false, link: '', notes: d.notes || '', emoji: '🌷' })
    }
  ];
  for (const m of migrations) {
    const oldSnap = await db.collection(m.col).get();
    if (oldSnap.empty) continue;
    const newSnap = await db.collection('notes').doc(m.noteId).collection('items').limit(1).get();
    if (!newSnap.empty) continue; // already migrated
    const batch = db.batch();
    const itemsCol = db.collection('notes').doc(m.noteId).collection('items');
    oldSnap.docs.forEach(doc => {
      batch.set(itemsCol.doc(doc.id), m.map(doc.data()));
    });
    // update note's updatedAt
    batch.update(db.collection('notes').doc(m.noteId), {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
  }
}

// ── Render pinned notes on Today dashboard ────────────────────────
function renderDashPinnedNotes() {
  const el = document.getElementById('dash-pinned-notes');
  if (!el) return;
  const slot = el.closest('.dash-widget-slot');
  const pinned = _notesData.filter(n => n.pinned && !n.archived);
  if (!pinned.length) {
    el.style.display = 'none';
    el.innerHTML = '';
    if (slot) slot.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  if (slot) slot.style.display = '';
  el.innerHTML = `<div class="dash-pinned-card">
    <div class="dash-hdr">
      <div class="dash-hdr-title">Pinned Notes  📌</div>
    </div>
    <div class="dash-pinned-items" id="dash-pinned-items"></div>
  </div>`;
  const itemsEl = document.getElementById('dash-pinned-items');
  pinned.forEach(n => {
    const row = document.createElement('div');
    row.className = 'dash-pinned-row';
    row.innerHTML = `<span class="dash-pinned-emoji">${esc(n.emoji || '📝')}</span>
      <span class="dash-pinned-title">${esc(n.title)}</span>
      <span class="dash-pinned-count" id="dash-pin-count-${n.id}">…</span>`;
    row.onclick = () => openNote(n.id);
    itemsEl.appendChild(row);
    // Load item count
    db.collection('notes').doc(n.id).collection('items').get().then(snap => {
      const countEl = document.getElementById('dash-pin-count-' + n.id);
      if (countEl) countEl.textContent = snap.size + ' item' + (snap.size === 1 ? '' : 's');
    });
  });
}

// ── Listen to notes collection ─────────────────────────────────────
function listenNotes() {
  db.collection('notes')
    .where('archived', '==', false)
    .orderBy('updatedAt', 'desc')
    .onSnapshot(snap => {
      _notesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderNotesGrid(_notesData);
      renderDashPinnedNotes();
    });
}

function renderNotesGrid(notes) {
  const el = document.getElementById('notes-grid');
  if (!el) return;
  if (!notes.length) {
    el.innerHTML = '<div class="empty"><div class="emo">📝</div><p>No notes yet<br>Tap + to create a new note.</p></div>';
    return;
  }
  // Pinned first, then by updatedAt
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const at = a.updatedAt ? a.updatedAt.toMillis() : 0;
    const bt = b.updatedAt ? b.updatedAt.toMillis() : 0;
    return bt - at;
  });
  el.innerHTML = sorted.map(n => {
    const updLabel = n.updatedAt ? relativeDay(n.updatedAt) : '';
    return `<div class="note-card" onclick="openNote('${n.id}')">
      <div class="note-card-top">
        <span class="note-card-emoji">${esc(n.emoji || '📝')}</span>
        ${n.pinned ? '<span class="note-pin">📌</span>' : ''}
      </div>
      <div class="note-card-title">${esc(n.title)}</div>
      <div class="note-card-meta" id="note-meta-${n.id}">…</div>
      ${updLabel ? `<div class="note-card-updated">${updLabel}</div>` : ''}
    </div>`;
  }).join('');
  // Load item counts async
  sorted.forEach(n => loadNoteCount(n.id));
}

function relativeDay(ts) {
  if (!ts) return '';
  const d = ts.toDate();
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7)  return `Updated ${diffDays} days ago`;
  return 'Updated ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function loadNoteCount(noteId) {
  db.collection('notes').doc(noteId).collection('items').get().then(snap => {
    const el = document.getElementById('note-meta-' + noteId);
    if (el) el.textContent = snap.size === 1 ? '1 item' : snap.size + ' items';
  });
}

function filterNotes(q) {
  const filtered = q
    ? _notesData.filter(n => n.title.toLowerCase().includes(q.toLowerCase()))
    : _notesData;
  renderNotesGrid(filtered);
}

// ── Open a note ────────────────────────────────────────────────────
function openNote(noteId) {
  const note = _notesData.find(n => n.id === noteId);
  if (!note) return;
  _currentNoteId = noteId;
  // Update header
  const titleEl = document.getElementById('note-detail-title');
  if (titleEl) titleEl.textContent = (note.emoji || '') + ' ' + note.title;
  // Show/hide delete in menu
  const delBtn = document.getElementById('note-menu-delete-btn');
  if (delBtn) delBtn.style.display = note.protected ? 'none' : '';
  // Navigate to note detail
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('note-detail-section').classList.add('active');
  document.getElementById('section-title').textContent = note.title;
  // Update FAB
  if (typeof updateFabForSection === 'function') updateFabForSection('note-detail');
  // Listen to items
  if (_noteItemsUnsub) { _noteItemsUnsub(); _noteItemsUnsub = null; }
  _noteItemsUnsub = db.collection('notes').doc(noteId).collection('items')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => renderNoteItems(snap));
}

function closeNoteDetail() {
  if (_noteItemsUnsub) { _noteItemsUnsub(); _noteItemsUnsub = null; }
  _currentNoteId = null;
  navTo('lists');
}

function renderNoteItems(snap) {
  const el = document.getElementById('note-items-list');
  if (!el) return;
  if (snap.empty) {
    el.innerHTML = '<div class="empty"><div class="emo">💬</div><p>No items yet — tap + to add one!</p></div>';
    return;
  }
  el.innerHTML = snap.docs.map(doc => {
    const it = { id: doc.id, ...doc.data() };
    const domain = it.link ? (()=>{ try { return new URL(it.link).hostname.replace('www.',''); } catch(e) { return ''; } })() : '';
    const metaParts = [it.addedBy ? badge(it.addedBy) : '', it.createdAt ? ago(it.createdAt) : ''].filter(Boolean);
    return `<div class="item-card note-item-card${it.completed ? ' done' : ''}">
      <div class="note-item-body">
        <div class="item-title">${esc(it.text)}</div>
        ${it.notes ? `<div class="item-meta" style="color:var(--text)">${esc(it.notes)}</div>` : ''}
        ${domain ? `<div class="item-meta"><a class="wish-link" href="${esc(it.link)}" target="_blank">${esc(domain)} — Open link →</a></div>` : ''}
        ${metaParts.length ? `<div class="item-meta">${metaParts.join(' · ')}</div>` : ''}
      </div>
      <div class="note-item-actions">
        <button class="note-item-check${it.completed ? ' checked' : ''}" onclick="toggleNoteItem('${_currentNoteId}','${it.id}',${!it.completed})" aria-label="Complete">${it.completed ? '✓' : '○'}</button>
        <button class="del-btn" onclick="deleteNoteItem('${_currentNoteId}','${it.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ── Note item CRUD ─────────────────────────────────────────────────

// Renders the correct add-item form based on which note is open
function renderNoteItemForm() {
  const wrap = document.getElementById('note-item-form-wrap');
  if (!wrap || !_currentNoteId) return;

  if (_currentNoteId === 'wishlist') {
    wrap.innerHTML = `
      <input type="text" id="note-item-text" placeholder="What is it? (e.g. Blue Nike trainers)">
      <div class="row">
        <input type="url" id="ni-link" placeholder="Paste a link (optional)" style="flex:2">
        <input type="text" id="ni-price" placeholder="£ Price" style="flex:1">
      </div>
      <button class="btn-primary" onclick="addNoteItem();closeBottomSheet()">Add to Wishlist</button>`;
  } else if (_currentNoteId === 'watchlist') {
    wrap.innerHTML = `
      <input type="text" id="note-item-text" placeholder="Title (e.g. The Bear)">
      <div class="row">
        <select id="ni-type" style="flex:1;padding:10px;border-radius:12px;border:1.5px solid var(--border);background:var(--card);color:var(--text);font-size:14px;">
          <option value="TV Show">📺 TV Show</option>
          <option value="Film">🎬 Film</option>
          <option value="Documentary">🎥 Documentary</option>
          <option value="Anime">⛩️ Anime</option>
          <option value="Stand-up">🎤 Stand-up</option>
          <option value="Mini-series">📺 Mini-series</option>
          <option value="Reality">🌟 Reality</option>
          <option value="Sport">⚽ Sport</option>
          <option value="Kids">🧸 Kids</option>
          <option value="Other">📽️ Other</option>
        </select>
        <select id="ni-genre" style="flex:1;padding:10px;border-radius:12px;border:1.5px solid var(--border);background:var(--card);color:var(--text);font-size:14px;">
          <option value="">Genre</option>
          <option>Comedy</option>
          <option>Drama</option>
          <option>Thriller</option>
          <option>Horror</option>
          <option>Romance</option>
          <option>Action</option>
          <option>Sci-Fi</option>
          <option>Fantasy</option>
          <option>Crime</option>
          <option>Historical</option>
        </select>
      </div>
      <button class="btn-primary" onclick="addNoteItem();closeBottomSheet()">Add to Watchlist</button>`;
  } else {
    wrap.innerHTML = `
      <input type="text" id="note-item-text" placeholder="Add an item…">
      <button class="btn-primary" onclick="addNoteItem();closeBottomSheet()">Add Item</button>`;
  }

  // Auto-focus the text input
  setTimeout(() => {
    const inp = document.getElementById('note-item-text');
    if (inp) inp.focus();
  }, 320);
}

function addNoteItem() {
  const textEl = document.getElementById('note-item-text');
  if (!textEl || !_currentNoteId || !db) return;
  const text = textEl.value.trim();
  if (!text) return;
  const now = firebase.firestore.FieldValue.serverTimestamp();

  let link = '';
  let notes = '';

  if (_currentNoteId === 'wishlist') {
    const linkEl  = document.getElementById('ni-link');
    const priceEl = document.getElementById('ni-price');
    link  = linkEl  ? linkEl.value.trim()  : '';
    notes = priceEl && priceEl.value.trim() ? '£' + priceEl.value.trim() : '';
  } else if (_currentNoteId === 'watchlist') {
    const typeEl  = document.getElementById('ni-type');
    const genreEl = document.getElementById('ni-genre');
    const type    = typeEl  ? typeEl.value  : '';
    const genre   = genreEl ? genreEl.value : '';
    notes = [type, genre].filter(Boolean).join(' · ');
  }

  db.collection('notes').doc(_currentNoteId).collection('items').add({
    text, addedBy: me || '', createdAt: now, completed: false, link, notes
  });
  db.collection('notes').doc(_currentNoteId).update({ updatedAt: now });
  textEl.value = '';
}

function deleteNoteItem(noteId, itemId) {
  db.collection('notes').doc(noteId).collection('items').doc(itemId).delete();
  db.collection('notes').doc(noteId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

function toggleNoteItem(noteId, itemId, completed) {
  db.collection('notes').doc(noteId).collection('items').doc(itemId).update({ completed });
}

// ── Emoji picker ───────────────────────────────────────────────────
function selectNoteEmoji(btn, emoji) {
  document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const hidden = document.getElementById('new-note-emoji');
  if (hidden) hidden.value = emoji;
  // Hide custom input if a preset was chosen
  const customInp = document.getElementById('new-note-emoji-custom');
  if (customInp) customInp.style.display = 'none';
}

function toggleCustomEmoji(btn) {
  const customInp = document.getElementById('new-note-emoji-custom');
  if (!customInp) return;
  const isVisible = customInp.style.display !== 'none';
  if (isVisible) {
    customInp.style.display = 'none';
  } else {
    document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    customInp.style.display = 'block';
    setTimeout(() => customInp.focus(), 50);
  }
}

function customEmojiInput(inp) {
  const val = inp.value.trim();
  if (val) {
    const hidden = document.getElementById('new-note-emoji');
    if (hidden) hidden.value = val;
  }
}

// ── Create a new note ──────────────────────────────────────────────
function createNote(opts = {}) {
  const titleEl  = document.getElementById('new-note-title');
  const emojiEl  = document.getElementById('new-note-emoji');
  const firstEl  = document.getElementById('new-note-first-item');
  const pinnedEl = document.getElementById('new-note-pinned');
  if (!titleEl) return;
  const title = titleEl.value.trim();
  if (!title || !db) return;
  const emoji  = emojiEl ? emojiEl.value.trim() || '📝' : '📝';
  const pinned = pinnedEl ? pinnedEl.checked : false;
  // Merge tags from the form input with any forced tags passed in opts
  const formTags  = getTagInputValue('note');
  const forceTags = opts.tags || [];
  const tags = Array.from(new Set([...forceTags, ...formTags]));
  const now = firebase.firestore.FieldValue.serverTimestamp();
  db.collection('notes').add({
    title, emoji, pinned, archived: false, tags,
    createdAt: now, updatedAt: now, protected: false
  }).then(ref => {
    const firstItem = firstEl ? firstEl.value.trim() : '';
    if (firstItem) {
      ref.collection('items').add({
        text: firstItem, addedBy: me || '', createdAt: now,
        completed: false, link: '', notes: ''
      });
    }
    titleEl.value = '';
    if (emojiEl) emojiEl.value = '';
    if (firstEl) firstEl.value = '';
    if (pinnedEl) pinnedEl.checked = false;
    resetTagInput('note');
    // If the note was luna-tagged, open it immediately
    if (tags.includes('luna')) {
      openNote(ref.id);
    }
  });
}

// ── Create a Luna note (opens Notes Hub with #luna pre-selected) ──
function createLunaNote() {
  openBottomSheet('new-note');
  // Pre-select the luna preset after the template renders
  setTimeout(() => {
    selectPresetTag('note', 'luna');
  }, 50);
}
window.createLunaNote = createLunaNote;

// ── Note menu ──────────────────────────────────────────────────────
function openNoteMenu() {
  document.getElementById('note-menu-overlay').classList.add('open');
  document.getElementById('note-menu').classList.add('open');
}
function closeNoteMenu() {
  document.getElementById('note-menu-overlay').classList.remove('open');
  document.getElementById('note-menu').classList.remove('open');
}
function noteMenuRename() {
  closeNoteMenu();
  const note = _notesData.find(n => n.id === _currentNoteId);
  if (!note) return;
  const newTitle = prompt('Rename note:', note.title);
  if (newTitle && newTitle.trim()) {
    db.collection('notes').doc(_currentNoteId).update({ title: newTitle.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('note-detail-title').textContent = (note.emoji || '') + ' ' + newTitle.trim();
    document.getElementById('section-title').textContent = newTitle.trim();
  }
}
function noteMenuChangeEmoji() {
  closeNoteMenu();
  const note = _notesData.find(n => n.id === _currentNoteId);
  if (!note) return;
  const newEmoji = prompt('Change emoji:', note.emoji || '📝');
  if (newEmoji && newEmoji.trim()) {
    db.collection('notes').doc(_currentNoteId).update({ emoji: newEmoji.trim() });
    document.getElementById('note-detail-title').textContent = newEmoji.trim() + ' ' + note.title;
  }
}
function noteMenuTogglePin() {
  closeNoteMenu();
  const note = _notesData.find(n => n.id === _currentNoteId);
  if (!note) return;
  db.collection('notes').doc(_currentNoteId).update({ pinned: !note.pinned });
  showToast(note.pinned ? 'Note unpinned' : '📌 Note pinned');
}
function noteMenuArchive() {
  closeNoteMenu();
  if (!confirm('Archive this note? It will be hidden from your Notes hub.')) return;
  db.collection('notes').doc(_currentNoteId).update({ archived: true });
  closeNoteDetail();
}
function noteMenuDelete() {
  closeNoteMenu();
  const note = _notesData.find(n => n.id === _currentNoteId);
  if (!note || note.protected) return;
  if (!confirm('Delete this note permanently? This cannot be undone.')) return;
  // Delete all items first then the note
  db.collection('notes').doc(_currentNoteId).collection('items').get().then(snap => {
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('notes').doc(_currentNoteId));
    return batch.commit();
  }).then(() => closeNoteDetail());
}

// ── Init notes (called from initFirebase) ──────────────────────────
async function initNotes() {
  await maybeCreateDefaultNotes();
  await migrateOldCollections();
  listenNotes();
}

// ── Birthdays ─────────────────────────────────────────────────────
let _birthdaysData = [];

function addBirthday() {
  const name  = document.getElementById('bd-name').value.trim();
  const day   = document.getElementById('bd-day').value;
  const month = document.getElementById('bd-month').value;
  const year  = document.getElementById('bd-year').value.trim();
  if (!name || !day || !month || !db) return;
  const mm = month.padStart(2,'0'), dd = String(day).padStart(2,'0');
  const date = '2000-' + mm + '-' + dd;
  db.collection('birthdays').add({
    name, date, birthYear: year ? parseInt(year) : null, addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('bd-name').value  = '';
    document.getElementById('bd-day').value   = '';
    document.getElementById('bd-month').value = '';
    document.getElementById('bd-year').value  = '';
  });
}
function delBirthday(id) { db.collection('birthdays').doc(id).delete(); }

// ── Birthday Modal & Gift Ideas ───────────────────────────────────
let _currentBdayId = null;
let _giftsUnsubscribe = null;

const GIFT_STATUS = {
  idea:      { label: '☐ Idea',        cls: 'gift-status-idea',      next: 'purchased' },
  purchased: { label: '🛍 Purchased',  cls: 'gift-status-purchased', next: 'gifted' },
  gifted:    { label: '🎁 Gifted',      cls: 'gift-status-gifted',    next: 'idea' }
};

function openBirthday(id) {
  const b = _birthdaysData.find(x => x.id === id);
  if (!b) return;
  _currentBdayId = id;
  const { diffDays, dateLabel, ageStr } = getBirthdayInfo(b.date, b.birthYear);
  const dayLabel = diffDays === 0 ? '🎉 Today!' : diffDays === 1 ? 'Tomorrow!' : `In ${diffDays} days`;
  document.getElementById('bday-modal-name').textContent = b.name;
  document.getElementById('bday-modal-meta').textContent = `${dateLabel} · ${dayLabel}${ageStr ? ' · ' + ageStr : ''}`;
  document.getElementById('bday-modal-overlay').classList.add('open');
  document.getElementById('bday-modal').classList.add('open');
  document.getElementById('gift-name').value = '';
  listenGifts(id);
  const giftInput = document.getElementById('gift-name');
  setTimeout(() => { if (giftInput) { giftInput.focus(); giftInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addGift(); } }; } }, 320);
}

function closeBirthdayModal() {
  document.getElementById('bday-modal-overlay').classList.remove('open');
  document.getElementById('bday-modal').classList.remove('open');
  if (_giftsUnsubscribe) { _giftsUnsubscribe(); _giftsUnsubscribe = null; }
  _currentBdayId = null;
}

function listenGifts(bdayId) {
  if (_giftsUnsubscribe) _giftsUnsubscribe();
  const el = document.getElementById('gift-list');
  if (!el) return;
  el.innerHTML = '<div class="loading">Loading…</div>';
  _giftsUnsubscribe = db.collection('birthdays').doc(bdayId)
    .collection('gifts').orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      // Denormalise count onto parent for list display
      db.collection('birthdays').doc(bdayId).update({ giftCount: snap.size }).catch(() => {});
      // Update in-memory cache
      const bIdx = _birthdaysData.findIndex(x => x.id === bdayId);
      if (bIdx > -1) { _birthdaysData[bIdx].giftCount = snap.size; renderBirthdaysList(); }

      if (snap.empty) {
        el.innerHTML = '<div class="empty" style="padding:20px 0"><div class="emo" style="font-size:32px">🎁</div><p>No gift ideas yet — add the first one!</p></div>';
        return;
      }
      el.innerHTML = snap.docs.map(doc => {
        const g = { id: doc.id, ...doc.data() };
        return `<div class="gift-item" id="gift-item-${doc.id}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:20px">🎁</span>
          <div class="gift-body" style="flex:1;min-width:0">
            <div class="gift-name" id="gift-name-display-${doc.id}">${esc(g.name)}</div>
          </div>
          <button class="del-btn" onclick="deleteGift('${bdayId}','${doc.id}')" aria-label="Delete gift">✕</button>
        </div>`;
      }).join('');
    }, err => {
      el.innerHTML = '<div class="empty"><p>Error loading gifts.</p></div>';
    });
}

function addGift() {
  const name = document.getElementById('gift-name').value.trim();
  if (!name || !_currentBdayId || !db) return;
  db.collection('birthdays').doc(_currentBdayId).collection('gifts').add({
    name, addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('gift-name').value = '';
    document.getElementById('gift-name').focus();
  });
}

function cycleGiftStatus(bdayId, giftId, currentStatus) {
  const next = (GIFT_STATUS[currentStatus] || GIFT_STATUS.idea).next;
  db.collection('birthdays').doc(bdayId).collection('gifts').doc(giftId).update({ status: next });
}

function deleteGift(bdayId, giftId) {
  db.collection('birthdays').doc(bdayId).collection('gifts').doc(giftId).delete();
}

function startEditGift(bdayId, giftId) {
  const nameEl = document.getElementById('gift-name-display-' + giftId);
  if (!nameEl) return;
  const current = nameEl.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'gift-inline-edit';
  input.setAttribute('aria-label', 'Edit gift name');
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  const save = () => {
    const newName = input.value.trim();
    if (newName && newName !== current) {
      db.collection('birthdays').doc(bdayId).collection('gifts').doc(giftId).update({ name: newName });
    }
    // snapshot listener will re-render
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = current; input.blur(); }
  });
}

function getBirthdayInfo(dateStr, birthYear) {
  // dateStr is like "2025-06-15" — we only care about MM-DD
  const [,month, day] = dateStr.split('-').map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next < today) next = new Date(thisYear + 1, month - 1, day);
  const diffMs = next - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateLabel = `${day} ${monthNames[month-1]}`;
  let ageStr = '';
  if (birthYear) {
    const turningAge = next.getFullYear() - birthYear;
    ageStr = `Turning ${turningAge}`;
  }
  return { diffDays, dateLabel, ageStr, month, day };
}

function listenBirthdays() {
  db.collection('birthdays').orderBy('date').onSnapshot(snap => {
    _birthdaysData = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderBirthdaysList();
    renderBirthdaysDash();
  });
}

function renderBirthdaysList() {
  const el = document.getElementById('birthdays-list');
  if (!el) return;
  if (!_birthdaysData.length) {
    el.innerHTML = '<div class="empty"><div class="emo">🎂</div><p>No birthdays saved yet!</p></div>';
    return;
  }
  const sorted = [..._birthdaysData].sort((a,b) => {
    return getBirthdayInfo(a.date, a.birthYear).diffDays - getBirthdayInfo(b.date, b.birthYear).diffDays;
  });
  let bdayHtml = '';
  let lastBdayMonth = null;
  sorted.forEach(b => {
    const { diffDays, dateLabel, ageStr } = getBirthdayInfo(b.date, b.birthYear);
    const upcoming = diffDays <= 60;
    const dayLabel = diffDays === 0 ? '🎉 Today!' : diffDays === 1 ? 'Tomorrow!' : `In ${diffDays} days`;
    const giftCount = (b.giftCount || 0);
    const giftLabel = giftCount === 0 ? 'No gift ideas yet' : giftCount === 1 ? '1 gift idea' : `${giftCount} gift ideas`;
    // Group by the upcoming birthday month
    const bdayDate = new Date(new Date().getFullYear() + '-' + b.date.slice(5) + 'T00:00:00');
    if (bdayDate < new Date()) bdayDate.setFullYear(bdayDate.getFullYear() + 1);
    const monthLabel = bdayDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (monthLabel !== lastBdayMonth) {
      bdayHtml += `<div class="month-divider"><span>${monthLabel}</span></div>`;
      lastBdayMonth = monthLabel;
    }
    bdayHtml += `<div class="bday-card${upcoming ? ' bday-upcoming' : ''}" onclick="openBirthday('${b.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')openBirthday('${b.id}')">
      <div class="bday-emoji">${diffDays <= 7 ? '🎉' : '🎂'}</div>
      <div class="bday-body">
        <div class="bday-name">${esc(b.name)}</div>
        <div class="bday-date">${dateLabel} · ${dayLabel}</div>
        ${ageStr ? `<div class="bday-age">${ageStr}</div>` : ''}
        <div class="bday-gift-count">${giftLabel}</div>
      </div>
      <button class="del-btn" onclick="event.stopPropagation();delBirthday('${b.id}')" aria-label="Delete birthday">✕</button>
    </div>`;
  });
  el.innerHTML = bdayHtml;
}

// ── Completed it mate feed ───────────────────────────────────────
function renderCompletedFeed() {
  const el = document.getElementById('dash-completed');
  if (!el) return;
  const todayStr = new Date().toISOString().split('T')[0];
  // gather recently completed todos + shopping items
  const completedTodos = _todoData.filter(t => t.completed).slice(0, 5)
    .map(t => ({ emoji: '✅', title: t.title, id: 'todo_' + t.id }));
  const completedShop = _shopData.filter(i => i.completed).slice(0, 5)
    .map(i => ({ emoji: '🛒', title: i.name, id: 'shop_' + i.id }));
  const all = [...completedTodos, ...completedShop].slice(0, 6);
  if (all.length === 0) {
    el.innerHTML = '<div class="dash-empty">Nothing completed yet today</div>';
    return;
  }
  el.innerHTML = all.map(item =>
    `<div class="dash-completed-item">
      <span class="dash-completed-emoji">${item.emoji}</span>
      <span class="dash-completed-title">${esc(item.title)}</span>
      <span class="dash-completed-heart" onclick="heartCompleted('${item.id}', this)" title="React">🤍</span>
    </div>`
  ).join('');
}

function heartCompleted(id, el) {
  el.textContent = el.textContent === '🤍' ? '❤️' : '🤍';
}

function renderBirthdaysDash() {
  const card = document.getElementById('dash-bday-card');
  const el   = document.getElementById('dash-birthdays');
  if (!card || !el) return;
  const upcoming = _birthdaysData
    .map(b => ({...b, ...getBirthdayInfo(b.date, b.birthYear)}))
    .filter(b => b.diffDays <= 60)
    .sort((a,b) => a.diffDays - b.diffDays);
  if (!upcoming.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  el.innerHTML = upcoming.map(b => {
    const dayLabel = b.diffDays === 0 ? '🎉 Today!' : b.diffDays === 1 ? 'Tomorrow!' : `In ${b.diffDays} days`;
    return `<div class="dash-bday-card">
      <div class="dash-bday-emoji">🎂</div>
      <div class="dash-bday-body">
        <div class="dash-bday-name">${esc(b.name)}</div>
        <div class="dash-bday-info">${b.dateLabel} · ${dayLabel}${b.ageStr ? ' · ' + b.ageStr : ''}</div>
      </div>
    </div>`;
  }).join('');
}



// ── Glimmers (Photo + Streak features loaded below) ──────────────

// ── Enter-key support ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const giftNameEl = document.getElementById('gift-name');
  if (giftNameEl) giftNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') addGift(); });
});

// Enter-key listeners for template inputs are wired inside openBottomSheet().

// ── New nav helper ────────────────────────────────────────────────
function setNavActive(btnId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(btnId);
  if (el) el.classList.add('active');
}

// ── Dashboard Glimmer gallery ─────────────────────────────────────
let _dashGlimmerUnsub = null;
function renderDashGlimmers() {
  if (!db) return;
  const el = document.getElementById('dash-glimmer-scroll');
  if (!el) return;
  if (_dashGlimmerUnsub) { _dashGlimmerUnsub(); _dashGlimmerUnsub = null; }
  _dashGlimmerUnsub = db.collection('glimmers').orderBy('createdAt','desc').limit(10)
    .onSnapshot(snap => {
      if (!el) return;
      if (snap.empty) {
        el.innerHTML = '<div class="dash-empty" style="padding:8px 0">No glimmers yet ✨</div>';
        return;
      }
      el.innerHTML = '';
      snap.docs.filter(d => !d.data().archived).slice(0, 8).forEach(doc => {
        const card = buildGlimmerCard(doc, { mode: 'dash-tile', from: 'today' });
        if (card) el.appendChild(card);
      });
      renderDashPinnedGlimmer();
    }, () => {});
}

// ── Boot ─────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  // Re-read from localStorage directly at load time as the safest approach
  const savedName = localStorage.getItem('jottie-name');
  if (savedName) {
    me = savedName;
    document.getElementById('name-overlay').style.display = 'none';
    document.getElementById('header-greeting').textContent = `Hi ${me}!`;
  }
  // Default calendar date to today
  renderToday();

  const evDateEl = document.getElementById('ev-date');
  if (evDateEl) evDateEl.value = new Date().toISOString().split('T')[0];
  initThinkingOfCard();
  initFirebase();
});
// GLIMMER FEATURE — PHOTO UPLOADS + STREAKS

(function() {
'use strict';

// ──────────────────────────────────────────────────────────────
// IMAGE COMPRESSION
// ──────────────────────────────────────────────────────────────

/**
 * Resize + compress an image File to JPEG, max 1200px wide, quality 0.75.
 * Returns a Promise<Blob>.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX_WIDTH = 1200;
    const QUALITY = 0.75;
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image load failed'));
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX_WIDTH) {
          h = Math.round(h * MAX_WIDTH / w);
          w = MAX_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas toBlob returned null'));
          resolve(blob);
        }, 'image/jpeg', QUALITY);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ──────────────────────────────────────────────────────────────
// PHOTO PREVIEW
// ──────────────────────────────────────────────────────────────

let glimmerPendingBlob = null; // holds compressed blob before save

// Called by openBottomSheet() after the glimmer template is cloned into the DOM.
window.wireGlimmerImgInput = function() {
  const imgInput = document.getElementById('glimmer-img-input');
  if (!imgInput) return;
  imgInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('⏳ Preparing image…');
      glimmerPendingBlob = await compressImage(file);
      const objectUrl = URL.createObjectURL(glimmerPendingBlob);
      const previewImg = document.getElementById('glimmer-preview-img');
      if (previewImg.dataset.prevUrl) URL.revokeObjectURL(previewImg.dataset.prevUrl);
      previewImg.src = objectUrl;
      previewImg.dataset.prevUrl = objectUrl;
      document.getElementById('glimmer-preview-wrap').style.display = 'block';
      document.getElementById('glimmer-upload-area').style.display = 'none';
      showToast('📷 Photo ready');
    } catch (err) {
      console.error('Image compress error:', err);
      showToast('⚠️ Could not process image — try a different photo');
    }
  });
};

window.removeGlimmerPhoto = function() {
  glimmerPendingBlob = null;
  const previewImg = document.getElementById('glimmer-preview-img');
  if (previewImg && previewImg.dataset.prevUrl) {
    URL.revokeObjectURL(previewImg.dataset.prevUrl);
    previewImg.removeAttribute('data-prev-url');
    previewImg.src = '';
  }
  const wrap = document.getElementById('glimmer-preview-wrap');
  const area = document.getElementById('glimmer-upload-area');
  const input = document.getElementById('glimmer-img-input');
  if (wrap) wrap.style.display = 'none';
  if (area) area.style.display = 'block';
  if (input) input.value = '';
};

// ──────────────────────────────────────────────────────────────
// FIREBASE STORAGE UPLOAD
// ──────────────────────────────────────────────────────────────

async function uploadGlimmerImage(blob) {
  const filename = `glimmers/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const ref = storage.ref(filename);
  await ref.put(blob, { contentType: 'image/jpeg' });
  return await ref.getDownloadURL();
}

// ──────────────────────────────────────────────────────────────
// SAVE GLIMMER
// ──────────────────────────────────────────────────────────────

/**
 * Returns today's date as 'YYYY-MM-DD' in local time.
 * Critical for streak accuracy across timezones.
 */
function getLocalDateKey(date) {
  date = date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

window.saveGlimmer = async function() {
  const textEl = document.getElementById('glimmer-text');
  if (!textEl) return;

  const text = textEl.value.trim();
  const by = me || localStorage.getItem('jottie-name') || ((typeof SETTINGS !== 'undefined' && SETTINGS.user1Name) || 'Lottie');
  if (!text) { showToast('✏️ Write something first!'); return; }

  const btn = document.getElementById('glimmer-save-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = glimmerPendingBlob ? '📤 Uploading…' : '💾 Saving…';
  }

  try {
    // Upload image if present
    let images = [];
    if (glimmerPendingBlob) {
      const url = await uploadGlimmerImage(glimmerPendingBlob);
      images = [url];
    }

    await db.collection('glimmers').add({
      text,
      by,
      images,                                                  // future-proof array
      tags: getTagInputValue('glimmer'),                       // e.g. ['luna']
      dateKey: getLocalDateKey(),                              // for streak calc
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reset form
    textEl.value = '';
    removeGlimmerPhoto();
    resetTagInput('glimmer');

    showToast('✨ Glimmer saved!');
    writeNotif({ type: 'new_glimmer', icon: '✨', title: `${by} shared a glimmer`, subtitle: text.length > 60 ? text.slice(0,57)+'…' : text, deepLink: { section: 'glimmers' } });
    loadGlimmersAndStreak();
  } catch (err) {
    console.error('Save glimmer error:', err);
    showToast('⚠️ Save failed — check your connection');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✨ Save Glimmer';
    }
  }
};

// ──────────────────────────────────────────────────────────────
// LOAD & RENDER GLIMMERS LIST
// ──────────────────────────────────────────────────────────────

let glimmersUnsubscribe = null;
let _glimmersCache = []; // in-memory cache for detail view navigation
let _glimmerDetailFrom = 'glimmers'; // tracks where detail was opened from

// ── Background options for text-only glimmers ─────────────────────
const GLIMMER_BACKGROUNDS = [
  'linear-gradient(135deg, #7C5CBF 0%, #9B7DD4 100%)',
  'linear-gradient(135deg, #9B7DD4 0%, #C9A9E0 60%, #D4829A 100%)',
  'linear-gradient(160deg, #6B4C9A 0%, #8B6BB5 50%, #B8A0D0 100%)',
  'linear-gradient(135deg, #C9B8E8 0%, #E8D5F0 100%)',
  'linear-gradient(135deg, #7C5CBF 0%, #5B4A8A 100%)',
];
function getGlimmerBg(id) {
  // Deterministic bg based on doc id so it doesn't change on re-render
  const idx = id ? (id.charCodeAt(0) + (id.charCodeAt(1) || 0)) % GLIMMER_BACKGROUNDS.length : 0;
  return GLIMMER_BACKGROUNDS[idx];
}

function loadGlimmersAndStreak() {
  loadGlimmersList();
  loadStreakData();
  updateDashboardStreak();
}

// ── Shared glimmer card builder ───────────────────────────────────
// Used by glimmers tile grid, dash recent tiles, and dash pinned card.
function buildGlimmerCard(doc, opts = {}) {
  const g = doc.data ? doc.data() : doc;
  const id = doc.id || g.id;
  const images = g.images && g.images.length ? g.images : (g.imageUrl ? [g.imageUrl] : []);
  const imgUrl = images[0] || null;
  const bg = imgUrl ? '' : getGlimmerBg(id);
  const isOwn = g.by === me;
  const liked = g.likedBy && g.likedBy.includes(me);
  const heartIcon = liked ? '💖' : '🤍';
  const heartDisabled = isOwn ? 'disabled' : '';

  if (opts.mode === 'tile') {
    // Full tile card for glimmers grid
    const el = document.createElement('div');
    el.className = 'glimmer-tile-card';
    el.onclick = () => openGlimmerDetail(id, opts.from || 'glimmers');
    if (imgUrl) {
      el.style.backgroundImage = `url('${escapeAttr(imgUrl)}')`;
      el.classList.add('has-image');
    } else {
      el.style.background = bg;
    }
    const tagPills = (g.tags || []).map(t => `<span class="glimmer-tag-pill">#${escapeHtml(t)}</span>`).join('');
    el.innerHTML = `
      <div class="glimmer-tile-overlay">
        <div class="glimmer-tile-text">${escapeHtml(g.text || '')}</div>
        ${tagPills ? `<div class="glimmer-tags">${tagPills}</div>` : ''}
        <div class="glimmer-tile-footer">
          <span class="glimmer-tile-author">${avatarBadge(g.by)}</span>
          <button class="glimmer-heart-btn${liked ? ' liked' : ''}" ${heartDisabled}
            onclick="event.stopPropagation(); toggleGlimmerHeart('${id}', ${liked})"
            aria-label="${liked ? 'Unlike' : 'Like'}">${heartIcon}</button>
        </div>
      </div>`;
    return el;
  }

  if (opts.mode === 'dash-tile') {
    // Small horizontal tile for Recent Glimmers scroll
    const el = document.createElement('div');
    el.className = 'glimmer-tile';
    el.onclick = () => openGlimmerDetail(id, opts.from || 'today');
    if (imgUrl) {
      el.innerHTML = `<img src="${escapeAttr(imgUrl)}" alt="glimmer" loading="lazy" style="width:100%;height:80px;object-fit:cover;display:block">
        <div class="glimmer-tile-text">${escapeHtml((g.text || '').substring(0, 40))}</div>`;
    } else {
      el.innerHTML = `<div class="glimmer-tile-emoji" style="background:${bg}">✨</div>
        <div class="glimmer-tile-text">${escapeHtml((g.text || '').substring(0, 40))}</div>`;
    }
    return el;
  }

  return null;
}

// ── Tile grid on Glimmers page ────────────────────────────────────
window.loadGlimmersList = function loadGlimmersList() {
  const list = document.getElementById('glimmers-list');
  if (!list) return;
  if (glimmersUnsubscribe) { glimmersUnsubscribe(); glimmersUnsubscribe = null; }
  list.innerHTML = '<div class="loading">Loading glimmers…</div>';

  glimmersUnsubscribe = db.collection('glimmers')
    .orderBy('createdAt', 'desc')
    .limit(60)
    .onSnapshot((snap) => {
      if (snap.empty) {
        list.innerHTML = '<div class="empty"><div class="emo">✨</div><p>No glimmers yet — add your first one!</p></div>';
        return;
      }

      // Filter archived
      const docs = snap.docs.filter(d => !d.data().archived);
      _glimmersCache = docs.map(d => ({ id: d.id, ...d.data() }));

      // Group by month
      list.innerHTML = '';
      let lastMonth = null;
      docs.forEach(doc => {
        const g = doc.data();
        if (!g.archived) {
          const monthLabel = g.createdAt
            ? g.createdAt.toDate().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            : '';
          if (monthLabel && monthLabel !== lastMonth) {
            const div = document.createElement('div');
            div.className = 'month-divider';
            div.innerHTML = `<span>${monthLabel}</span>`;
            list.appendChild(div);
            lastMonth = monthLabel;
          }
          const card = buildGlimmerCard(doc, { mode: 'tile', from: 'glimmers' });
          if (card) list.appendChild(card);
        }
      });

      loadStreakData();
      updateDashboardStreak();
      renderDashPinnedGlimmer();
    }, (err) => {
      console.error('Glimmer listener error:', err);
      list.innerHTML = '<div class="empty"><p>Error loading glimmers — please reload.</p></div>';
    });
};

// ── Heart toggle ──────────────────────────────────────────────────
window.toggleGlimmerHeart = async function(id, currentlyLiked) {
  if (!db || !me) return;
  const ref = db.collection('glimmers').doc(id);
  if (currentlyLiked) {
    await ref.update({ likedBy: firebase.firestore.FieldValue.arrayRemove(me) });
  } else {
    await ref.update({ likedBy: firebase.firestore.FieldValue.arrayUnion(me) });
    const g = (_glimmersCache || []).find(x => x.id === id);
    writeNotif({ type: 'glimmer_liked', icon: '❤️', title: `${me} loved your glimmer`, subtitle: g ? (g.text || '').slice(0,60) : '', deepLink: { section: 'glimmers', glimmerId: id } });
  }
};

// ── Glimmer Detail View ───────────────────────────────────────────
let _currentGlimmerId = null;

window.openGlimmerDetail = function openGlimmerDetail(id, from) {
  _currentGlimmerId = id;
  _glimmerDetailFrom = from || 'glimmers';

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('glimmer-detail-section').classList.add('active');
  document.getElementById('section-title').textContent = '';
  if (typeof updateFabForSection === 'function') updateFabForSection('glimmer-detail');

  renderGlimmerDetail(id);

  // Live updates for hearts etc.
  if (window._glimmerDetailUnsub) { window._glimmerDetailUnsub(); }
  window._glimmerDetailUnsub = db.collection('glimmers').doc(id).onSnapshot(snap => {
    if (snap.exists) {
      const cached = _glimmersCache.find(g => g.id === id);
      if (cached) Object.assign(cached, snap.data());
      renderGlimmerDetail(id);
    }
  });
}

window.renderGlimmerDetail = function renderGlimmerDetail(id) {
  const g = _glimmersCache.find(g => g.id === id);
  if (!g) return;
  const el = document.getElementById('glimmer-detail-body');
  if (!el) return;

  const images = g.images && g.images.length ? g.images : (g.imageUrl ? [g.imageUrl] : []);
  const imgUrl = images[0] || null;
  const bg = imgUrl ? '' : getGlimmerBg(id);
  const isOwn = g.by === me;
  const liked = g.likedBy && g.likedBy.includes(me);
  const heartIcon = liked ? '💖' : '🤍';
  const dateStr = g.createdAt
    ? g.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const detailSection = document.getElementById('glimmer-detail-section');

  if (imgUrl) {
    // Photo glimmer: image on top, caption below
    if (detailSection) detailSection.classList.add('has-photo');
    el.innerHTML = `
      <div class="glimmer-detail-img-wrap">
        <img src="${escapeAttr(imgUrl)}" alt="Glimmer" class="glimmer-detail-img">
        <div class="glimmer-detail-gradient"></div>
      </div>
      <div class="glimmer-detail-caption">
        <div class="glimmer-detail-text">${escapeHtml(g.text || '')}</div>
        <div class="glimmer-detail-meta">
          <span class="glimmer-detail-author">${avatarBadge(g.by)}</span>
          <span class="glimmer-detail-date">${dateStr}</span>
        </div>
        <button class="glimmer-detail-heart${liked ? ' liked' : ''}"
          ${isOwn ? 'disabled' : ''}
          onclick="toggleGlimmerHeart('${id}', ${liked})"
          aria-label="${liked ? 'Unlike' : 'Like'}">${heartIcon}</button>
      </div>`;
  } else {
    // Text-only glimmer: full-screen background with text overlay
    if (detailSection) detailSection.classList.remove('has-photo');
    el.innerHTML = `
      <div class="glimmer-detail-bg-screen" style="background:${bg}">
        <div class="glimmer-detail-bg-overlay"></div>
        <div class="glimmer-detail-caption">
          <div class="glimmer-detail-text">${escapeHtml(g.text || '')}</div>
          <div class="glimmer-detail-meta">
            <span class="glimmer-detail-author">${avatarBadge(g.by)}</span>
            <span class="glimmer-detail-date">${dateStr}</span>
          </div>
          <button class="glimmer-detail-heart${liked ? ' liked' : ''}"
            ${isOwn ? 'disabled' : ''}
            onclick="toggleGlimmerHeart('${id}', ${liked})"
            aria-label="${liked ? 'Unlike' : 'Like'}">${heartIcon}</button>
        </div>
      </div>`;
  }

  // Update pin button label
  const pinBtn = document.getElementById('glimmer-menu-pin-btn');
  if (pinBtn) pinBtn.textContent = g.pinned ? '📌 Unpin' : '📌 Pin';
}

window.closeGlimmerDetail = function closeGlimmerDetail() {
  if (window._glimmerDetailUnsub) { window._glimmerDetailUnsub(); window._glimmerDetailUnsub = null; }
  _currentGlimmerId = null;
  const ds = document.getElementById('glimmer-detail-section');
  if (ds) ds.classList.remove('has-photo');
  if (_glimmerDetailFrom === 'today') {
    navTo('today');
  } else if (_glimmerDetailFrom === 'luna') {
    navTo('luna');
  } else {
    navTo('glimmers');
  }
}

// ── Glimmer detail menu ───────────────────────────────────────────
window.openGlimmerDetailMenu = function openGlimmerDetailMenu() {
  document.getElementById('glimmer-detail-menu-overlay').classList.add('open');
  document.getElementById('glimmer-detail-menu').classList.add('open');
}
window.closeGlimmerDetailMenu = function closeGlimmerDetailMenu() {
  document.getElementById('glimmer-detail-menu-overlay').classList.remove('open');
  document.getElementById('glimmer-detail-menu').classList.remove('open');
}
// ── Edit Glimmer modal ────────────────────────────────────────────
let _editGlimmerPendingBlob = null; // null = no change, false = remove, Blob = new image

window.glimmerMenuEdit = function() {
  closeGlimmerDetailMenu();
  const g = _glimmersCache.find(g => g.id === _currentGlimmerId);
  if (!g) return;

  // Pre-fill text
  const textEl = document.getElementById('edit-glimmer-text');
  if (textEl) textEl.value = g.text || '';

  // Pre-fill photo
  _editGlimmerPendingBlob = null;
  const existingUrl = (g.images && g.images[0]) || g.imageUrl || null;
  const previewWrap = document.getElementById('edit-glimmer-preview-wrap');
  const uploadArea  = document.getElementById('edit-glimmer-upload-area');
  const previewImg  = document.getElementById('edit-glimmer-preview-img');
  if (existingUrl && previewImg && previewWrap && uploadArea) {
    previewImg.src = existingUrl;
    previewWrap.style.display = 'block';
    uploadArea.style.display = 'none';
  } else if (previewWrap && uploadArea) {
    previewWrap.style.display = 'none';
    uploadArea.style.display = 'block';
  }

  // Pre-fill tags
  _tagInputState['edit-glimmer'] = (g.tags || []).slice();
  renderPresetTags('edit-glimmer');
  renderTagChips('edit-glimmer');

  // Wire image input
  const imgInput = document.getElementById('edit-glimmer-img-input');
  if (imgInput) {
    // Clone to remove any previous listener
    const fresh = imgInput.cloneNode(true);
    imgInput.parentNode.replaceChild(fresh, imgInput);
    fresh.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        showToast('⏳ Preparing image…');
        _editGlimmerPendingBlob = await compressImage(file);
        const objectUrl = URL.createObjectURL(_editGlimmerPendingBlob);
        const pi = document.getElementById('edit-glimmer-preview-img');
        if (pi.dataset.prevUrl) URL.revokeObjectURL(pi.dataset.prevUrl);
        pi.src = objectUrl;
        pi.dataset.prevUrl = objectUrl;
        document.getElementById('edit-glimmer-preview-wrap').style.display = 'block';
        document.getElementById('edit-glimmer-upload-area').style.display = 'none';
        showToast('📷 Photo ready');
      } catch (err) {
        console.error('Image compress error:', err);
        showToast('⚠️ Could not process image');
      }
    });
  }

  // Open modal
  document.getElementById('edit-glimmer-overlay').classList.add('open');
  document.getElementById('edit-glimmer-modal').classList.add('open');
};

window.closeEditGlimmer = function() {
  document.getElementById('edit-glimmer-overlay').classList.remove('open');
  document.getElementById('edit-glimmer-modal').classList.remove('open');
  _editGlimmerPendingBlob = null;
};

window.removeEditGlimmerPhoto = function() {
  _editGlimmerPendingBlob = false; // false = user explicitly removed photo
  const pi = document.getElementById('edit-glimmer-preview-img');
  if (pi && pi.dataset.prevUrl) { URL.revokeObjectURL(pi.dataset.prevUrl); pi.removeAttribute('data-prev-url'); }
  if (pi) pi.src = '';
  const wrap = document.getElementById('edit-glimmer-preview-wrap');
  const area = document.getElementById('edit-glimmer-upload-area');
  if (wrap) wrap.style.display = 'none';
  if (area) area.style.display = 'block';
};

window.saveGlimmerEdit = async function() {
  const textEl = document.getElementById('edit-glimmer-text');
  const text = textEl ? textEl.value.trim() : '';
  if (!text) { showToast('✏️ Write something first!'); return; }

  const btn = document.getElementById('edit-glimmer-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '💾 Saving…'; }

  try {
    const g = _glimmersCache.find(g => g.id === _currentGlimmerId);
    const existingImages = (g && g.images && g.images.length) ? g.images : (g && g.imageUrl ? [g.imageUrl] : []);

    let images = existingImages;
    if (_editGlimmerPendingBlob instanceof Blob) {
      if (btn) btn.textContent = '📤 Uploading…';
      const url = await uploadGlimmerImage(_editGlimmerPendingBlob);
      images = [url];
    } else if (_editGlimmerPendingBlob === false) {
      images = [];
    }

    const tags = getTagInputValue('edit-glimmer');
    await db.collection('glimmers').doc(_currentGlimmerId).update({ text, images, tags });

    // Update local cache so detail view re-renders correctly
    if (g) { g.text = text; g.images = images; g.tags = tags; }

    closeEditGlimmer();
    showToast('✨ Glimmer updated!');
    // Re-render detail view with updated data
    renderGlimmerDetail(_currentGlimmerId);
  } catch (err) {
    console.error('Edit glimmer error:', err);
    showToast('⚠️ Save failed — check your connection');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Save Changes'; }
  }
};
window.glimmerMenuTogglePin = function() {
  closeGlimmerDetailMenu();
  const g = _glimmersCache.find(g => g.id === _currentGlimmerId);
  if (!g) return;
  const newPinned = !g.pinned;
  if (newPinned) {
    const currentPinned = _glimmersCache.filter(x => x.pinned && !x.archived).length;
    if (currentPinned >= 4) {
      showToast('📌 Max 4 glimmers can be pinned — unpin one first');
      return;
    }
  }
  db.collection('glimmers').doc(_currentGlimmerId).update({ pinned: newPinned });
  g.pinned = newPinned;
  showToast(newPinned ? '📌 Glimmer pinned' : 'Glimmer unpinned');
  renderDashPinnedGlimmer();
};
window.glimmerMenuArchive = function() {
  closeGlimmerDetailMenu();
  if (!confirm('Archive this glimmer? It will be hidden from your feeds.')) return;
  db.collection('glimmers').doc(_currentGlimmerId).update({ archived: true });
  showToast('📦 Glimmer archived');
  closeGlimmerDetail();
};

// ── Pinned Glimmers on Today dashboard (4 individual widget slots) ──
function renderDashPinnedGlimmer() {
  const allPinned = _glimmersCache.filter(g => g.pinned && !g.archived);

  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('dash-pinned-glimmer-' + i);
    if (!el) continue;
    const slot = el.closest('.dash-widget-slot');
    const g = allPinned[i - 1] || null;

    if (!g) {
      el.style.display = 'none';
      if (slot) slot.style.display = 'none';
      continue;
    }

    const images = g.images && g.images.length ? g.images : (g.imageUrl ? [g.imageUrl] : []);
    const imgUrl = images[0] || null;
    const bg = getGlimmerBg(g.id);
    const isOwn = g.by === me;
    const liked = g.likedBy && g.likedBy.includes(me);
    const heartIcon = liked ? '💖' : '🤍';

    let cardHtml;
    if (imgUrl) {
      // Photo glimmer: image with gradient overlay
      cardHtml = `<div class="dash-pinned-glimmer-card" onclick="openGlimmerDetail('${g.id}', 'today')">
        <div class="dash-pinned-glimmer-img-wrap">
          <img src="${escapeAttr(imgUrl)}" alt="Pinned glimmer" class="dash-pinned-glimmer-img">
          <div class="dash-pinned-glimmer-gradient"></div>
        </div>
        <div class="dash-pinned-glimmer-caption">
          <span class="dash-pinned-glimmer-text">${escapeHtml(g.text || '')}</span>
          <div class="dash-pinned-glimmer-footer">
            <span class="dash-pinned-glimmer-author">${avatarBadge(g.by)}</span>
            <button class="glimmer-heart-btn${liked ? ' liked' : ''}" ${isOwn ? 'disabled' : ''}
              onclick="event.stopPropagation(); toggleGlimmerHeart('${g.id}', ${liked})"
              aria-label="${liked ? 'Unlike' : 'Like'}">${heartIcon}</button>
          </div>
        </div>
      </div>`;
    } else {
      // Text-only glimmer: text overlaid on gradient background
      cardHtml = `<div class="dash-pinned-glimmer-card dash-pinned-glimmer-text-card" onclick="openGlimmerDetail('${g.id}', 'today')" style="background:${bg}">
        <div class="dash-pinned-glimmer-text-overlay">
          <span class="dash-pinned-glimmer-text dash-pinned-glimmer-text-only">${escapeHtml(g.text || '')}</span>
          <div class="dash-pinned-glimmer-footer">
            <span class="dash-pinned-glimmer-author">${avatarBadge(g.by)}</span>
            <button class="glimmer-heart-btn${liked ? ' liked' : ''}" ${isOwn ? 'disabled' : ''}
              onclick="event.stopPropagation(); toggleGlimmerHeart('${g.id}', ${liked})"
              aria-label="${liked ? 'Unlike' : 'Like'}">${heartIcon}</button>
          </div>
        </div>
      </div>`;
    }

    el.style.display = 'block';
    if (slot) slot.style.display = '';
    el.innerHTML = cardHtml;
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE GLIMMER
// ──────────────────────────────────────────────────────────────

window.deleteGlimmer = async function(id, imagesJson) {
  if (!confirm('Delete this glimmer?')) return;
  let images = [];
  try { images = JSON.parse(imagesJson); } catch (e) { images = []; }
  try {
    // Delete storage files first
    for (const url of images) {
      try { await storage.refFromURL(url).delete(); } catch (e) { /* already gone */ }
    }
    await db.collection('glimmers').doc(id).delete();
    showToast('🗑 Glimmer deleted');
    loadStreakData();
    updateDashboardStreak();
  } catch (err) {
    console.error('Delete glimmer error:', err);
    showToast('⚠️ Delete failed');
  }
};

// ──────────────────────────────────────────────────────────────
// LIGHTBOX
// ──────────────────────────────────────────────────────────────

window.openGlimmerLightbox = function(src) {
  const lb = document.getElementById('glimmer-lightbox');
  const img = document.getElementById('glimmer-lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.add('open');
};

window.closeLightbox = function() {
  const lb = document.getElementById('glimmer-lightbox');
  if (lb) lb.classList.remove('open');
};

const lightbox = document.getElementById('glimmer-lightbox');
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

// ──────────────────────────────────────────────────────────────
// STREAK CALCULATION
// ──────────────────────────────────────────────────────────────

/**
 * Reads all glimmers from Firestore and calculates:
 * - currentStreak: consecutive valid days (both Lottie AND Jonny) up to today/yesterday
 * - longest: all-time longest such streak
 * - totalValidDays: count of days where both submitted
 * - lottieDone / jonnyDone: whether each has submitted TODAY
 */
async function calculateStreaks() {
  const snap = await db.collection('glimmers').get();

  // Map: dateKey → Set of submitters
  const dayMap = {};

  snap.forEach(doc => {
    const g = doc.data();
    let key = g.dateKey;

    // Migration: old glimmers may lack dateKey; derive from createdAt
    if (!key && g.createdAt) {
      key = getLocalDateKey(g.createdAt.toDate());
    }
    if (!key) return;

    if (!dayMap[key]) dayMap[key] = new Set();
    if (g.by) dayMap[key].add(g.by);
  });

  // Valid days = BOTH Lottie AND Jonny submitted
  const validDays = new Set(
    Object.entries(dayMap)
      .filter(([, submitters]) => submitters.has('Lottie') && submitters.has('Jonny'))
      .map(([day]) => day)
  );

  const sortedValid = Array.from(validDays).sort(); // ascending

  const todayKey = getLocalDateKey();

  // ── Current streak ──────────────────────────────
  // Walk backwards from today. If today is valid, count it.
  // If today is not yet valid, the streak is still alive from yesterday (not broken).
  let currentStreak = 0;
  const startDate = new Date();
  // If today isn't valid, start checking from yesterday
  if (!validDays.has(todayKey)) {
    startDate.setDate(startDate.getDate() - 1);
  }
  let checkDate = new Date(startDate);
  while (true) {
    const k = getLocalDateKey(checkDate);
    if (!validDays.has(k)) break;
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // ── Longest streak ─────────────────────────────
  let longest = 0, run = 0;
  for (let i = 0; i < sortedValid.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(sortedValid[i - 1] + 'T00:00:00');
      const curr = new Date(sortedValid[i] + 'T00:00:00');
      const diffDays = Math.round((curr - prev) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
  }

  // ── Today's individual status ──────────────────
  const todaySubmitters = dayMap[todayKey] || new Set();

  // ── Weekly sparkle data (Mon–Sun of current week) ─────────────
  // Find Monday of this week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon…
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDays = DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = getLocalDateKey(d);
    const submitters = dayMap[key] || new Set();
    return {
      label,
      key,
      isToday: key === todayKey,
      lottieDone: submitters.has('Lottie'),
      jonnyDone: submitters.has('Jonny'),
      bothDone: submitters.has('Lottie') && submitters.has('Jonny')
    };
  });

  return {
    currentStreak,
    longest: Math.max(longest, currentStreak),
    totalValidDays: validDays.size,
    lottieDone: todaySubmitters.has('Lottie'),
    jonnyDone:  todaySubmitters.has('Jonny'),
    todayComplete: todaySubmitters.has('Lottie') && todaySubmitters.has('Jonny'),
    weekDays
  };
}

// ──────────────────────────────────────────────────────────────
// SPARKLE CARD — shared component for dashboard + glimmers page
// ──────────────────────────────────────────────────────────────

/**
 * Renders the weekly sparkle streak card into a container element.
 * Used by both the Today dashboard and the Glimmers page.
 * @param {string} containerId - ID of the element to render into
 * @param {object} data - result from calculateStreaks()
 */
function renderSparkleCard(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const streakLabel = data.currentStreak === 0
    ? '0 days'
    : data.currentStreak === 1
      ? '1 day 🔥'
      : data.currentStreak + ' days 🔥';

  // Build sparkle dots (Mon–Sun)
  const sparkles = data.weekDays.map(day => {
    const icon = day.bothDone ? '✨' : '✦';
    const todayCls = day.isToday ? ' sparkle-today' : '';
    const doneCls  = day.bothDone ? ' sparkle-done' : '';
    return `<div class="sparkle-day${todayCls}${doneCls}">
      <span class="sparkle-icon">${icon}</span>
      <span class="sparkle-label">${day.label}</span>
    </div>`;
  }).join('');

  // Footer status
  const lottieTick = data.lottieDone ? '✓' : '◦';
  const jonnyTick  = data.jonnyDone  ? '✓' : '◦';
  const lottieCls  = data.lottieDone ? ' sparkle-done-name' : '';
  const jonnyCls   = data.jonnyDone  ? ' sparkle-done-name' : '';

  // Nudge or CTA button
  let btnHtml = '';
  if (data.todayComplete) {
    btnHtml = `<button class="sparkle-btn" onclick="navTo('glimmers')">See today's Glimmers →</button>`;
  } else {
    const other = (me === 'Lottie') ? 'Jonny' : 'Lottie';
    const otherDone = (other === 'Lottie') ? data.lottieDone : data.jonnyDone;
    if (!otherDone) {
      btnHtml = `<button class="sparkle-btn sparkle-btn-nudge" onclick="nudgePerson('${other}')">👉 Nudge ${other}</button>`;
    } else {
      btnHtml = `<button class="sparkle-btn" onclick="navTo('glimmers')">See today's Glimmers →</button>`;
    }
  }

  const _u1 = (typeof SETTINGS !== 'undefined' && SETTINGS.user1Name) || 'Lottie';
  const _u2 = (typeof SETTINGS !== 'undefined' && SETTINGS.user2Name) || 'Jonny';

  el.innerHTML = `
    <div class="sparkle-header">
      <span class="sparkle-title">✨ Glimmer Streak</span>
      <span class="sparkle-count">${streakLabel}</span>
    </div>
    <div class="sparkle-row">${sparkles}</div>
    <div class="sparkle-footer">
      <span class="sparkle-person${lottieCls}">${lottieTick} ${_u1}</span>
      <span class="sparkle-person${jonnyCls}">${jonnyTick} ${_u2}</span>
    </div>
    ${btnHtml}
  `;
}

// ── Called when navigating to glimmers page ───────────────────
async function loadStreakData() {
  try {
    const data = await calculateStreaks();
    renderSparkleCard('sparkle-card-glimmers', data);
  } catch (err) {
    console.error('loadStreakData error:', err);
  }
}

// ── Called on Today dashboard load ────────────────────────────
window.updateDashboardStreak = async function() {
  try {
    const data = await calculateStreaks();
    renderSparkleCard('sparkle-card-dash', data);
  } catch (err) {
    console.error('updateDashboardStreak error:', err);
  }
};

// ──────────────────────────────────────────────────────────────
// NUDGE
// ──────────────────────────────────────────────────────────────

window.sendThinkingOf = function sendThinkingOf() {
  const other = me === 'Lottie' ? 'Jonny' : 'Lottie';
  const heart = document.getElementById('thinking-heart-btn');
  const sub   = document.getElementById('thinking-sub');
  const last  = document.getElementById('thinking-last');

  // Animate heart
  if (heart) {
    heart.classList.add('pop');
    setTimeout(() => heart.classList.remove('pop'), 400);
    heart.textContent = '💗✨';
    setTimeout(() => { heart.textContent = '💗'; }, 1800);
  }

  // Update sub text briefly
  if (sub) {
    sub.textContent = 'Sent! 💖';
    setTimeout(() => { sub.textContent = 'Tap to send love'; }, 2500);
  }

  // Store last sent time
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  localStorage.setItem('jottie-thinking-last', timeStr);
  if (last) {
    last.textContent = `Last sent: ${timeStr}`;
    last.style.display = 'block';
  }

  // Send notification if available
  if (typeof sendPushNotification === 'function') {
    sendPushNotification(`💗 ${me} is thinking of you!`);
  }
  showToast(`💗 Love sent to ${other}!`);
  writeNotif({ type: 'thinking_of_you', icon: '💜', title: `${me} sent you some love`, subtitle: 'Tap to view', deepLink: { section: 'today' } });
}

window.initThinkingOfCard = function initThinkingOfCard() {
  const saved = localStorage.getItem('jottie-thinking-last');
  const last  = document.getElementById('thinking-last');
  if (saved && last) {
    last.textContent = `Last sent: ${saved}`;
    last.style.display = 'block';
  }
}

window.nudgePersonGlobal = function nudgePerson(name) {
  // Use push notifications if the app already has that system wired up
  if (typeof sendPushNotification === 'function') {
    sendPushNotification(`👉 Hey ${name}! Time to add your Glimmer today 💖`);
    showToast(`📣 Nudge sent to ${name}!`);
    return;
  }
  // Fallback: friendly in-app toast
  showToast(`👉 Hey ${name}! Don't forget your Glimmer today 💖`);
}

// ──────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ──────────────────────────────────────────────────────────────

let _toastTimer;
window.showToast = function(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function formatRelativeTime(date) {
  if (!date || !(date instanceof Date)) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ──────────────────────────────────────────────────────────────
// INIT — wire tab events (glimmers are always authored by the current user)
// ──────────────────────────────────────────────────────────────

function initGlimmerSection() {}

// Hook into tab switching (works alongside existing tab logic)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const sec = tab.dataset.section;
    if (sec === 'glimmers') {
      initGlimmerSection();
      loadGlimmersList();
      loadStreakData();
    }
    if (sec === 'today') {
      updateDashboardStreak();
    }
  });
});

// Glimmer/streak startup is called from initFirebase() once db is ready.

})(); // end IIFE


// ── FAB ──────────────────────────────────────────────────────────
(function() {
  const SECTION_ICONS = {
    todos:          '✅',
    shopping:       '🛒',
    glimmers:       '✨',
    birthdays:      '🎂',
    calendar:       '📅',
    luna:           '🦴',
    lists:          '📝',
    'note-detail':  '+',
    'glimmer-detail': ''
  };

  let _activeSection = 'today';

  // navFabTap is called by onclick="navFabTap()" in HTML — always fires on mobile.
  window.navFabTap = function() {
    const sheet = document.getElementById('bottom-sheet');
    const isOpen = sheet && sheet.classList.contains('open');
    if (_activeSection === 'today') {
      if (isOpen) { closeBottomSheet(); return; }
      toggleFab();
    } else if (_activeSection === 'note-detail') {
      if (isOpen) { closeBottomSheet(); return; }
      openBottomSheet('lists'); // Add Item form
    } else if (_activeSection === 'lists') {
      if (isOpen) { closeBottomSheet(); return; }
      openBottomSheet('new-note'); // New Note form
    } else {
      if (isOpen) { closeBottomSheet(); return; }
      contextFabAction(_activeSection);
    }
  };

  window.updateFabForSection = function(sec) {
    _activeSection = sec;
    window._jottieActiveSection = sec;
    const navBtn = document.getElementById('nav-fab-main');
    if (!navBtn) return;
    closeFab();
    navBtn.classList.remove('open');
    navBtn.style.display = '';
    if (sec === 'today') {
      navBtn.setAttribute('aria-label', 'Quick add');
      navBtn.innerHTML = '<span id="nav-fab-icon"></span>+';
    } else if (sec === 'note-detail') {
      navBtn.setAttribute('aria-label', 'Add item');
      navBtn.innerHTML = '<span id="nav-fab-icon"></span>+';
    } else if (sec === 'glimmer-detail') {
      navBtn.style.display = 'none';
    } else if (sec === 'task-detail') {
      navBtn.style.display = 'none';
    } else {
      navBtn.setAttribute('aria-label', sec === 'lists' ? 'New note' : 'Add to ' + sec);
      navBtn.innerHTML = '<span id="nav-fab-icon">' + (SECTION_ICONS[sec] || '') + '</span>+';
    }
  };

  window.contextFabAction = function(sec) {
    openBottomSheet(sec);
  };

  const SECTION_FOCUS = {
    todos:     'td-title',
    shopping:  'sh-name',
    glimmers:  'glimmer-text',
    birthdays: 'bd-name',
    calendar:  'ev-title',
    luna:      null
  };

  window.toggleFab = function() {
    const wrap = document.getElementById('fab-wrap');
    const btn  = document.getElementById('fab-btn');
    const navBtn = document.getElementById('nav-fab-main');
    const overlay = document.getElementById('fab-overlay');
    const isOpen = wrap.classList.toggle('open');
    if (btn) btn.classList.toggle('open', isOpen);
    if (navBtn) navBtn.classList.toggle('open', isOpen);
    overlay.classList.toggle('open', isOpen);
    if (btn) btn.setAttribute('aria-expanded', isOpen);
    if (isOpen) {
      const first = document.querySelector('.fab-item');
      if (first) setTimeout(() => first.focus(), 50);
    }
  };

  window.closeFab = function() {
    const wrap    = document.getElementById('fab-wrap');
    const btn     = document.getElementById('fab-btn');
    const navBtn  = document.getElementById('nav-fab-main');
    const overlay = document.getElementById('fab-overlay');
    if (!wrap.classList.contains('open')) return;
    wrap.classList.remove('open');
    if (btn) btn.classList.remove('open');
    if (navBtn) navBtn.classList.remove('open');
    overlay.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  };

  window.fabAction = function(section) {
    closeFab();
    const sheetSections = ['todos','shopping','calendar','birthdays','glimmers','luna'];
    if (sheetSections.includes(section)) {
      navTo(section);
      openBottomSheet(section);
      return;
    }
    if (section === 'lists') {
      navTo('lists');
      openBottomSheet('new-note');
      return;
    }
    navTo(section);
  };

  window.fabKeydown = function(e) {
    if (e.key === 'Escape') { closeFab(); return; }
  };

  document.addEventListener('keydown', function(e) {
    const wrap = document.getElementById('fab-wrap');
    if (!wrap || !wrap.classList.contains('open')) return;
    if (e.key === 'Escape') { closeFab(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const items = Array.from(document.querySelectorAll('.fab-item'));
    const idx   = items.indexOf(document.activeElement);
    if (e.key === 'ArrowUp')   { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
  });
})();

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD WIDGET GRID — customisable drag-to-reorder layout
// ══════════════════════════════════════════════════════════════════

const DASH_WIDGET_ORDER_KEY = 'jottie-dash-widget-order';

// All possible widget IDs in default order
const DASH_DEFAULT_WIDGETS = [
  'luna', 'thinking', 'events', 'tasks', 'shopping',
  'pinned-notes', 'pinned-glimmer-1', 'pinned-glimmer-2',
  'pinned-glimmer-3', 'pinned-glimmer-4'
];

let _dashWidgetOrder = null;
let _dashEditMode = false;
let _dashDragSrc = null;

function dashGetOrder() {
  if (_dashWidgetOrder) return _dashWidgetOrder;
  try {
    const saved = localStorage.getItem(DASH_WIDGET_ORDER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = [...parsed, ...DASH_DEFAULT_WIDGETS.filter(id => !parsed.includes(id))];
      _dashWidgetOrder = merged;
      return _dashWidgetOrder;
    }
  } catch(e) {}
  _dashWidgetOrder = [...DASH_DEFAULT_WIDGETS];
  return _dashWidgetOrder;
}

function dashSaveOrder() {
  localStorage.setItem(DASH_WIDGET_ORDER_KEY, JSON.stringify(_dashWidgetOrder));
}

// Build the widget grid from templates, in saved order
function dashBuildGrid() {
  const grid = document.getElementById('dash-widget-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const order = dashGetOrder();
  order.forEach(id => {
    const tpl = document.getElementById('widget-tpl-' + id);
    if (!tpl) return;
    const slot = document.createElement('div');
    slot.className = 'dash-widget-slot';
    slot.dataset.widgetId = id;
    slot.appendChild(tpl.content.cloneNode(true));
    const handle = document.createElement('div');
    handle.className = 'dash-drag-handle';
    handle.textContent = '⠿';
    slot.appendChild(handle);
    // Long-press to enter edit mode
    let pressTimer = null;
    slot.addEventListener('touchstart', function(e) {
      pressTimer = setTimeout(() => {
        if (!_dashEditMode) dashEnterEditMode();
      }, 500);
    }, { passive: true });
    slot.addEventListener('touchend', () => clearTimeout(pressTimer));
    slot.addEventListener('touchmove', () => clearTimeout(pressTimer));
    // Mouse drag
    slot.setAttribute('draggable', 'true');
    slot.addEventListener('dragstart', dashOnDragStart);
    slot.addEventListener('dragover',  dashOnDragOver);
    slot.addEventListener('dragleave', dashOnDragLeave);
    slot.addEventListener('drop',      dashOnDrop);
    slot.addEventListener('dragend',   dashOnDragEnd);
    // Touch drag
    slot.addEventListener('touchstart', dashTouchStart, { passive: false });
    grid.appendChild(slot);
  });
  if (typeof initThinkingOfCard === 'function') initThinkingOfCard();
}

// ── Edit mode ──────────────────────────────────────────────────────
function dashEnterEditMode() {
  _dashEditMode = true;
  const grid = document.getElementById('dash-widget-grid');
  if (grid) grid.classList.add('dash-edit-mode');
  const bar = document.getElementById('dash-edit-bar');
  if (bar) bar.style.display = 'flex';
  document.body.classList.add('dash-editing');
}

window.dashExitEditMode = function() {
  _dashEditMode = false;
  const grid = document.getElementById('dash-widget-grid');
  if (grid) grid.classList.remove('dash-edit-mode');
  const bar = document.getElementById('dash-edit-bar');
  if (bar) bar.style.display = 'none';
  document.body.classList.remove('dash-editing');
};

// ── Mouse drag ─────────────────────────────────────────────────────
function dashOnDragStart(e) {
  if (!_dashEditMode) { e.preventDefault(); return; }
  _dashDragSrc = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function dashOnDragOver(e) {
  if (!_dashEditMode || !_dashDragSrc || _dashDragSrc === this) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}
function dashOnDragLeave() {
  this.classList.remove('drag-over');
}
function dashOnDrop(e) {
  if (!_dashEditMode || !_dashDragSrc || _dashDragSrc === this) return;
  e.preventDefault();
  this.classList.remove('drag-over');
  const grid = document.getElementById('dash-widget-grid');
  const slots = Array.from(grid.querySelectorAll('.dash-widget-slot'));
  const srcIdx = slots.indexOf(_dashDragSrc);
  const tgtIdx = slots.indexOf(this);
  if (srcIdx === -1 || tgtIdx === -1) return;
  if (srcIdx < tgtIdx) grid.insertBefore(_dashDragSrc, this.nextSibling);
  else grid.insertBefore(_dashDragSrc, this);
  const newOrder = Array.from(grid.querySelectorAll('.dash-widget-slot')).map(s => s.dataset.widgetId);
  _dashWidgetOrder = newOrder;
  dashSaveOrder();
}
function dashOnDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.dash-widget-slot').forEach(s => s.classList.remove('drag-over'));
  _dashDragSrc = null;
}

// ── Touch drag ─────────────────────────────────────────────────────
let _touchDragEl = null, _touchClone = null, _touchOffX = 0, _touchOffY = 0;

function dashTouchStart(e) {
  if (!_dashEditMode) return;
  const touch = e.touches[0];
  _touchDragEl = this;
  const rect = this.getBoundingClientRect();
  _touchOffX = touch.clientX - rect.left;
  _touchOffY = touch.clientY - rect.top;
  _touchClone = this.cloneNode(true);
  _touchClone.style.cssText = `
    position:fixed; top:${rect.top}px; left:${rect.left}px;
    width:${rect.width}px; pointer-events:none; z-index:9999;
    opacity:0.85; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.2);
    transition: none;
  `;
  document.body.appendChild(_touchClone);
  this.style.opacity = '0.3';
  e.preventDefault();
  document.addEventListener('touchmove', dashTouchMove, { passive: false });
  document.addEventListener('touchend',  dashTouchEnd);
}

function dashTouchMove(e) {
  if (!_touchClone) return;
  e.preventDefault();
  const touch = e.touches[0];
  _touchClone.style.top  = (touch.clientY - _touchOffY) + 'px';
  _touchClone.style.left = (touch.clientX - _touchOffX) + 'px';
  document.querySelectorAll('.dash-widget-slot').forEach(s => s.classList.remove('drag-over'));
  _touchClone.style.display = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  _touchClone.style.display = '';
  const target = el && el.closest('.dash-widget-slot');
  if (target && target !== _touchDragEl) target.classList.add('drag-over');
}

function dashTouchEnd(e) {
  document.removeEventListener('touchmove', dashTouchMove);
  document.removeEventListener('touchend',  dashTouchEnd);
  if (_touchClone) { _touchClone.remove(); _touchClone = null; }
  if (_touchDragEl) _touchDragEl.style.opacity = '';
  const touch = e.changedTouches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const target = el && el.closest('.dash-widget-slot');
  if (target && target !== _touchDragEl) {
    const grid = document.getElementById('dash-widget-grid');
    const slots = Array.from(grid.querySelectorAll('.dash-widget-slot'));
    const srcIdx = slots.indexOf(_touchDragEl);
    const tgtIdx = slots.indexOf(target);
    if (srcIdx < tgtIdx) grid.insertBefore(_touchDragEl, target.nextSibling);
    else grid.insertBefore(_touchDragEl, target);
    const newOrder = Array.from(grid.querySelectorAll('.dash-widget-slot')).map(s => s.dataset.widgetId);
    _dashWidgetOrder = newOrder;
    dashSaveOrder();
  }
  document.querySelectorAll('.dash-widget-slot').forEach(s => s.classList.remove('drag-over'));
  _touchDragEl = null;
}

// Initialise on load
document.addEventListener('DOMContentLoaded', function() {
  dashBuildGrid();
});
