
// ── Global state ─────────────────────────────────────────────────
// me is declared in firebase.js; restore persisted value on load
me = localStorage.getItem('jottie-name') || '';

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
  const tplId = 'bs-tpl-' + section;
  const tpl = document.getElementById(tplId);
  const body = document.getElementById('bs-body');
  const title = document.getElementById('bs-title');
  const sheet = document.getElementById('bottom-sheet');
  const overlay = document.getElementById('bs-overlay');
  if (!tpl || !body || !sheet) return;
  const sectionNames = { todos: 'Add Task', shopping: 'Add Item', calendar: 'Add Plan', birthdays: 'Add Birthday', glimmers: 'Add Glimmer', luna: 'Luna Note', lists: 'Add to Lists' };
  if (title) title.textContent = sectionNames[section] || '';
  body.innerHTML = '';
  body.appendChild(document.importNode(tpl.content, true));
  if (overlay) overlay.classList.add('open');
  sheet.classList.add('open');
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
  document.getElementById('header-greeting').textContent = `${getGreeting()}, ${name}! 💜`;
  document.getElementById('header-date').textContent = fmtFullDate(new Date());
  renderToday();
  setTimeout(checkNotifStatus, 600);
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
  const sectionNames = {"today":"Today","calendar":"Plans","shopping":"Shopping","todos":"To-Do","lists":"Lists","birthdays":"Birthdays","glimmers":"Glimmers","luna":"Luna 🐾"};
  const titleEl = document.getElementById('section-title');
  if (titleEl) titleEl.textContent = sectionNames[sec] || '';

  // update centre FAB button for active section
  if (typeof updateFabForSection === 'function') updateFabForSection(sec);

  // section-specific hooks
  if (sec === 'birthdays') renderBirthdaysDash();
  if (sec === 'glimmers') {
    if (typeof initGlimmerSection === 'function') initGlimmerSection();
    if (typeof loadGlimmersList === 'function') loadGlimmersList();
    if (typeof loadStreakData === 'function') loadStreakData();
  }
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

function badge(name) {
  const cls = (name === 'Lottie') ? 'badge-a' : 'badge-b';
  return `<span class="badge ${cls}">${esc(name)}</span>`;
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
      upcoming.forEach(ev => { html += evCard(ev, false); });
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
}
function delTodo(id)          { db.collection('todos').doc(id).delete(); }

function listenTodos() {
  db.collection('todos').orderBy('createdAt','asc')
    .onSnapshot(snap => {
      _todoData = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderToday();
      const el = document.getElementById('todo-list');
      if (snap.empty) {
        el.innerHTML = '<div class="empty"><div class="emo">✅</div><p>No tasks yet — add one above!</p></div>';
        return;
      }
      const items  = snap.docs.map(d => ({id:d.id,...d.data()}));
      const active = items.filter(i => !i.completed);
      const done   = items.filter(i =>  i.completed);

      let html = '<div class="list-label">Open tasks</div>';
      if (active.length === 0) {
        html += '<div class="empty" style="padding:16px"><p>Nothing left to do! 🎉</p></div>';
      }
      active.forEach(i => { html += todoCard(i); });
      if (done.length > 0) {
        html += `<div class="list-label" style="margin-top:14px;opacity:0.6">Done (${done.length})</div>`;
        done.forEach(i => { html += todoCard(i); });
      }
      el.innerHTML = html;
    });
}

function todoCard(i) {
  const whoIcon = {Lottie:'👩',Jonny:'👨',Both:'👫',Either:'🤷'};
  const whoStr  = i.who ? `${whoIcon[i.who]||'👤'} ${esc(i.who)} · ` : '';
  const dueStr  = i.due ? `Due ${fmtDate(i.due)} · ` : '';
  const recurBadge = i.recurrence ? `<span class="recur-badge">🔁 ${i.recurrence}</span> ` : '';
  return `
  <div class="item-card${i.completed ? ' done' : ''}">
    <div class="checkbox${i.completed ? ' checked' : ''}" onclick="toggleTodo('${i.id}',${i.completed})"></div>
    <div class="item-body">
      <div class="item-title">${esc(i.title)}</div>
      <div class="item-meta">${recurBadge}${whoStr}${dueStr}${badge(i.addedBy)} · ${ago(i.createdAt)}</div>
    </div>
    <button class="del-btn" onclick="delTodo('${i.id}')">✕</button>
  </div>`;
}

// ── Luna ─────────────────────────────────────────────────────────
function logChew() {
  if (!db) return;
  db.collection('luna').add({
    loggedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => sendNotification('🦴 Luna', `${me} logged Luna's chew`));
}

function delChew(id) { db.collection('luna').doc(id).delete(); }

function listenLuna() {
  db.collection('luna').orderBy('createdAt','desc').limit(30)
    .onSnapshot(snap => {
      _lunaData = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderToday();
      const statusEl  = document.getElementById('luna-status-text');
      const timeEl    = document.getElementById('luna-last-time');
      const byEl      = document.getElementById('luna-last-by');
      const logEl     = document.getElementById('luna-log');

      if (snap.empty) {
        statusEl.textContent = 'Has Luna had her chew today?';
        timeEl.textContent   = '';
        byEl.textContent     = '';
        logEl.innerHTML = '<div class="empty"><div class="emo">🦴</div><p>No chews logged yet — tap the button!</p></div>';
        return;
      }

      const items = snap.docs.map(d => ({id: d.id, ...d.data()}));
      const latest = items[0];

      // Work out how long ago the last chew was
      const todayStr = new Date().toLocaleDateString('en-GB');

      if (latest.createdAt) {
        const ms   = Date.now() - latest.createdAt.toMillis();
        const mins = Math.floor(ms / 60000);
        const hrs  = Math.floor(ms / 3600000);
        const days = Math.floor(ms / 86400000);

        let timeStr;
        if (mins < 2)        timeStr = 'just now';
        else if (mins < 60)  timeStr = `${mins} minutes ago`;
        else if (hrs < 24)   timeStr = `${hrs} hour${hrs>1?'s':''} ago`;
        else                 timeStr = `${days} day${days>1?'s':''} ago`;

        const isToday = latest.createdAt.toDate().toLocaleDateString('en-GB') === todayStr;
        statusEl.textContent = isToday ? 'Luna has had her chew today 🎉' : 'Luna hasn\'t had her chew today yet';
        timeEl.textContent   = timeStr;
        byEl.textContent     = `Logged by ${latest.loggedBy}`;
      }

      // Build log
      let html = '';
      items.forEach(entry => {
        if (!entry.createdAt) return;
        const dt = entry.createdAt.toDate();
        const isToday = dt.toLocaleDateString('en-GB') === todayStr;
        const timeStr = dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
        const dateStr = isToday ? 'Today' : dt.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
        html += `
        <div class="chew-log-card">
          <div class="bone">🦴</div>
          <div class="chew-log-body">
            <div class="chew-log-time">${dateStr} at ${timeStr} ${isToday ? '<span class="chew-today-badge">Today</span>' : ''}</div>
            <div class="chew-log-meta">Logged by ${esc(entry.loggedBy)}</div>
          </div>
          <button class="del-btn" onclick="delChew('${entry.id}')">✕</button>
        </div>`;
      });
      logEl.innerHTML = html;
    });
}

// ── Luna Notes ───────────────────────────────────────────────────
function addLunaNote() {
  const title = document.getElementById('ln-title').value.trim();
  const body  = document.getElementById('ln-body').value.trim();
  if (!body) return;
  if (!db) return;
  db.collection('luna-notes').add({
    title, body,
    addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    sendNotification('📝 Luna Note', `${me} added a note${title ? ': '+title : ''}`);
    document.getElementById('ln-title').value = '';
    document.getElementById('ln-body').value  = '';
  });
}

function delLunaNote(id) { db.collection('luna-notes').doc(id).delete(); }

function listenLunaNotes() {
  db.collection('luna-notes').orderBy('createdAt','desc').limit(50)
    .onSnapshot(snap => {
      const el = document.getElementById('luna-notes-list');
      if (snap.empty) {
        el.innerHTML = '<div class="empty"><div class="emo">📝</div><p>No notes yet — add one above!</p></div>';
        return;
      }
      let html = '';
      snap.docs.forEach(doc => {
        const n = {id: doc.id, ...doc.data()};
        const dateStr = n.createdAt
          ? n.createdAt.toDate().toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})
          : '';
        html += `
        <div class="item-card">
          <div class="item-body">
            ${n.title ? `<div class="item-title">${esc(n.title)}</div>` : ''}
            <div class="item-notes" style="margin-top:${n.title?'5px':'0'};color:var(--text);font-size:14px;line-height:1.5">${esc(n.body)}</div>
            <div class="item-meta" style="margin-top:6px">${badge(n.addedBy)} · ${dateStr}</div>
          </div>
          <button class="del-btn" onclick="delLunaNote('${n.id}')">✕</button>
        </div>`;
      });
      el.innerHTML = html;
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
      const t = payload.notification?.title || '';
      const b = payload.notification?.body  || '';
      if (t) _showInAppToast(t, b);
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
function addWishItem() {
  const name  = document.getElementById('wl-name').value.trim();
  const url   = document.getElementById('wl-url').value.trim();
  const price = document.getElementById('wl-price').value.trim();
  const emoji = document.getElementById('wl-emoji').value.trim() || '🎁';
  if (!name) return;
  if (!db) return;
  db.collection('wishlist').add({
    name, url, price, emoji, addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    sendNotification('🎁 Wishlist', `${me} added "${name}"${price?' ('+price+')':''}`);
    document.getElementById('wl-name').value  = '';
    document.getElementById('wl-url').value   = '';
    document.getElementById('wl-price').value = '';
    document.getElementById('wl-emoji').value = '';
  });
}
function delWishItem(id) { db.collection('wishlist').doc(id).delete(); }
function listenWishlist() {
  db.collection('wishlist').orderBy('createdAt','desc').onSnapshot(snap => {
    const el = document.getElementById('wishlist-list');
    if (snap.empty) {
      el.innerHTML = '<div class="empty"><div class="emo">🎁</div><p>No wishlist items yet!</p></div>';
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const i = {id:doc.id,...doc.data()};
      const domain = i.url ? (()=>{ try{return new URL(i.url).hostname.replace('www.','')}catch(e){return ''} })() : '';
      return `<div class="item-card">
        <div style="font-size:24px;flex-shrink:0">${esc(i.emoji||'🎁')}</div>
        <div class="item-body">
          <div class="item-title">${esc(i.name)}</div>
          ${i.price?`<span class="wish-price">£${esc(i.price)}</span>`:''}
          ${domain?`<div class="wish-domain">${esc(domain)}</div>`:''}
          <div class="item-meta">
            ${i.url?`<a class="wish-link" href="${esc(i.url)}" target="_blank">Open link →</a> · `:''}
            ${badge(i.addedBy)} · ${ago(i.createdAt)}
          </div>
        </div>
        <button class="del-btn" onclick="delWishItem('${i.id}')">✕</button>
      </div>`;
    }).join('');
  });
}

// ── Watchlist ─────────────────────────────────────────────────────
function addWatchItem() {
  const title = document.getElementById('wt-title').value.trim();
  const type  = document.getElementById('wt-type').value;
  const genre = document.getElementById('wt-genre').value.trim();
  if (!title || !db) return;
  db.collection('watchlist').add({
    title, type, genre, addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('wt-title').value = '';
    document.getElementById('wt-genre').value = '';
  });
}
function delWatchItem(id) { db.collection('watchlist').doc(id).delete(); }
function listenWatchlist() {
  db.collection('watchlist').orderBy('createdAt','desc').onSnapshot(snap => {
    const el = document.getElementById('watchlist-list');
    if (!el) return;
    if (snap.empty) {
      el.innerHTML = '<div class="empty"><div class="emo">🎬</div><p>Nothing on the watchlist yet!</p></div>';
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const i = {id:doc.id,...doc.data()};
      const typeEmoji = {Film:'🎬','TV Show':'📺',Documentary:'🎥',Anime:'⛩️',Other:'📽️'}[i.type]||'📽️';
      return `<div class="item-card">
        <div style="font-size:24px;flex-shrink:0">${typeEmoji}</div>
        <div class="item-body">
          <div class="item-title">${esc(i.title)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            <span class="watch-genre">${esc(i.type)}</span>
            ${i.genre?`<span class="watch-genre" style="background:#E3F2FD;color:#1155AA">${esc(i.genre)}</span>`:''}
          </div>
          <div class="item-meta">${badge(i.addedBy)} · ${ago(i.createdAt)}</div>
        </div>
        <button class="del-btn" onclick="delWatchItem('${i.id}')">✕</button>
      </div>`;
    }).join('');
  });
}

// ── Date Ideas ────────────────────────────────────────────────────
function addDateIdea() {
  const title = document.getElementById('di-title').value.trim();
  const notes = document.getElementById('di-notes').value.trim();
  if (!title || !db) return;
  db.collection('dateideas').add({
    title, notes, addedBy: me,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('di-title').value = '';
    document.getElementById('di-notes').value = '';
  });
}
function delDateIdea(id) { db.collection('dateideas').doc(id).delete(); }
let _watchData = [], _dateIdeasData = [];
function listenDateIdeas() {
  db.collection('dateideas').orderBy('createdAt','desc').onSnapshot(snap => {
    _dateIdeasData = snap.docs.map(d => ({id:d.id,...d.data()}));
    const el = document.getElementById('dateideas-list');
    if (!el) return;
    if (!_dateIdeasData.length) {
      el.innerHTML = '<div class="empty"><div class="emo">💑</div><p>No date ideas yet — add one!</p></div>';
      return;
    }
    el.innerHTML = _dateIdeasData.map(i =>
      `<div class="item-card">
        <div style="font-size:24px;flex-shrink:0">💑</div>
        <div class="item-body">
          <div class="item-title">${esc(i.title)}</div>
          ${i.notes?`<div class="item-meta" style="color:var(--text)">${esc(i.notes)}</div>`:''}
          <div class="item-meta">${badge(i.addedBy)} · ${ago(i.createdAt)}</div>
        </div>
        <button class="del-btn" onclick="delDateIdea('${i.id}')">✕</button>
      </div>`
    ).join('');
  });
}

// ── 🎲 Random Picker ──────────────────────────────────────────────
function rollDice(listType) {
  let items = [];
  let resultEl;
  if (listType === 'watchlist') {
    const nodes = document.querySelectorAll('#watchlist-list .item-card .item-title');
    items = Array.from(nodes).map(n => n.textContent.trim()).filter(Boolean);
    resultEl = document.getElementById('watch-dice-result');
  } else {
    items = _dateIdeasData.map(i => i.title).filter(Boolean);
    resultEl = document.getElementById('dateideas-dice-result');
  }
  if (!items.length || !resultEl) return;
  const pick = items[Math.floor(Math.random() * items.length)];
  resultEl.textContent = '🎲 ' + pick;
  resultEl.style.display = 'block';
  resultEl.style.animation = 'none';
  requestAnimationFrame(() => { resultEl.style.animation = ''; });
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
  const today = new Date();
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next < today) next = new Date(thisYear + 1, month - 1, day);
  const diffMs = next - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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
  el.innerHTML = sorted.map(b => {
    const { diffDays, dateLabel, ageStr } = getBirthdayInfo(b.date, b.birthYear);
    const upcoming = diffDays <= 60;
    const dayLabel = diffDays === 0 ? '🎉 Today!' : diffDays === 1 ? 'Tomorrow!' : `In ${diffDays} days`;
    const giftCount = (b.giftCount || 0);
    const giftLabel = giftCount === 0 ? 'No gift ideas yet' : giftCount === 1 ? '1 gift idea' : `${giftCount} gift ideas`;
    return `<div class="bday-card${upcoming ? ' bday-upcoming' : ''}" onclick="openBirthday('${b.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')openBirthday('${b.id}')">
      <div class="bday-emoji">${diffDays <= 7 ? '🎉' : '🎂'}</div>
      <div class="bday-body">
        <div class="bday-name">${esc(b.name)}</div>
        <div class="bday-date">${dateLabel} · ${dayLabel}</div>
        ${ageStr ? `<div class="bday-age">${ageStr}</div>` : ''}
        <div class="bday-gift-count">${giftLabel}</div>
      </div>
      <button class="del-btn" onclick="event.stopPropagation();delBirthday('${b.id}')" aria-label="Delete birthday">✕</button>
    </div>`;
  }).join('');
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

// ── Dashboard Luna helpers ────────────────────────────────────────
window.dashLogChew = function() {
  if (!db) return;
  logChew();
};

window.dashUnlogChew = function() {
  if (!db || !_lunaData.length) return;
  const todayStr = new Date().toLocaleDateString('en-GB');
  const todayChew = _lunaData.find(e => e.createdAt && e.createdAt.toDate().toLocaleDateString('en-GB') === todayStr);
  if (todayChew) delChew(todayChew.id);
};

// ── Dashboard Glimmer gallery ─────────────────────────────────────
let _dashGlimmerUnsub = null;
function renderDashGlimmers() {
  if (!db) return;
  const el = document.getElementById('dash-glimmer-scroll');
  if (!el) return;
  if (_dashGlimmerUnsub) { _dashGlimmerUnsub(); _dashGlimmerUnsub = null; }
  _dashGlimmerUnsub = db.collection('glimmers').orderBy('createdAt','desc').limit(8)
    .onSnapshot(snap => {
      if (!el) return;
      if (snap.empty) {
        el.innerHTML = '<div class="dash-empty" style="padding:8px 0">No glimmers yet ✨</div>';
        return;
      }
      el.innerHTML = snap.docs.map(doc => {
        const g = doc.data();
        const imgs = g.images && g.images.length ? g.images : (g.imageUrl ? [g.imageUrl] : []);
        const safeUrl = imgs.length ? imgs[0].replace(/'/g, '%27') : '';
        const media = imgs.length
          ? '<img src="' + safeUrl + '" alt="glimmer" loading="lazy" style="width:100%;height:80px;object-fit:cover;display:block" onclick="openGlimmerLightbox(\'' + safeUrl + '\')">'
          : '<div class="glimmer-tile-emoji">✨</div>';
        const text = (g.text||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return '<div class="glimmer-tile">' + media + '<div class="glimmer-tile-text">' + text + '</div></div>';
      }).join('');
    }, () => {});
}

// ── Boot ─────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  // Re-read from localStorage directly at load time as the safest approach
  const savedName = localStorage.getItem('jottie-name');
  if (savedName) {
    me = savedName;
    document.getElementById('name-overlay').style.display = 'none';
    document.getElementById('header-greeting').textContent = `Hi ${me}! 💜`;
  }
  // Default calendar date to today
  renderToday();

  // Copy Luna image from drawer tile to dashboard
  (function() {
    const src = document.querySelector('.luna-tile-img');
    const dest = document.getElementById('luna-dash-img');
    if (src && dest) dest.src = src.src;
  })();

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

const imgInput = document.getElementById('glimmer-img-input');
if (imgInput) {
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
}

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
  const byEl = document.getElementById('glimmer-by');
  if (!textEl || !byEl) return;

  const text = textEl.value.trim();
  const by = byEl.value;
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
      dateKey: getLocalDateKey(),                              // for streak calc
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reset form
    textEl.value = '';
    removeGlimmerPhoto();
    // Reset selector to the current user
    const me = localStorage.getItem('jottie-name') || 'Lottie';
    byEl.value = me;

    showToast('✨ Glimmer saved!');
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

function loadGlimmersAndStreak() {
  loadGlimmersList();
  loadStreakData();
  updateDashboardStreak();
}

window.loadGlimmersList = function loadGlimmersList() {
  const list = document.getElementById('glimmers-list');
  if (!list) return;

  // Unsubscribe previous listener if any
  if (glimmersUnsubscribe) { glimmersUnsubscribe(); glimmersUnsubscribe = null; }

  list.innerHTML = '<div class="loading">Loading glimmers…</div>';

  glimmersUnsubscribe = db.collection('glimmers')
    .orderBy('createdAt', 'desc')
    .limit(40)
    .onSnapshot((snap) => {
      if (snap.empty) {
        list.innerHTML = '<div class="empty"><div class="emo">✨</div><p>No glimmers yet — add your first one!</p></div>';
        return;
      }
      list.innerHTML = '';
      snap.forEach(doc => {
        const g = doc.data();
        // Backward-compat: support old imageUrl field AND new images array
        const images = g.images && g.images.length
          ? g.images
          : (g.imageUrl ? [g.imageUrl] : []);

        const thumb = images.length
          ? `<img class="glimmer-thumb" src="${escapeAttr(images[0])}" alt="Glimmer photo"
               onclick="openGlimmerLightbox('${escapeAttr(images[0])}')" loading="lazy">`
          : '';

        const byChip = g.by === 'Lottie'
          ? '<span class="badge badge-a">👩 Lottie</span>'
          : '<span class="badge badge-b">👨 Jonny</span>';

        const timeStr = g.createdAt ? formatRelativeTime(g.createdAt.toDate()) : '';

        // Encode images array for delete button (escape quotes)
        const imagesJson = escapeAttr(JSON.stringify(images));

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
          ${thumb}
          <div class="item-body">
            <div class="item-title">${escapeHtml(g.text)}</div>
            <div class="item-meta">${byChip} <span>${timeStr}</span></div>
          </div>
          <button class="del-btn" onclick="deleteGlimmer('${doc.id}', '${imagesJson}')"
            title="Delete glimmer" aria-label="Delete">🗑</button>`;
        list.appendChild(card);
      });
      // After list updates, recalculate streak
      loadStreakData();
      updateDashboardStreak();
    }, (err) => {
      console.error('Glimmer listener error:', err);
      list.innerHTML = '<div class="empty"><p>Error loading glimmers — please reload.</p></div>';
    });
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

  return {
    currentStreak,
    longest: Math.max(longest, currentStreak),
    totalValidDays: validDays.size,
    lottieDone: todaySubmitters.has('Lottie'),
    jonnyDone:  todaySubmitters.has('Jonny'),
    todayComplete: todaySubmitters.has('Lottie') && todaySubmitters.has('Jonny')
  };
}

// ──────────────────────────────────────────────────────────────
// RENDER STREAK — GLIMMERS PAGE
// ──────────────────────────────────────────────────────────────

async function loadStreakData() {
  try {
    const data = await calculateStreaks();

    const numEl = document.getElementById('streak-current');
    const labelEl = document.getElementById('streak-label');
    const longestEl = document.getElementById('streak-longest');
    const totalEl = document.getElementById('streak-total-days');
    const dotL = document.getElementById('streak-dot-lottie');
    const dotJ = document.getElementById('streak-dot-jonny');
    const nudgeWrap = document.getElementById('streak-nudge-wrap');

    if (numEl) numEl.textContent = data.currentStreak;
    if (longestEl) longestEl.textContent = data.longest;
    if (totalEl) totalEl.textContent = data.totalValidDays;

    if (labelEl) {
      if (data.currentStreak === 0) labelEl.textContent = 'Start your streak today! 💜';
      else if (data.currentStreak === 1) labelEl.textContent = 'day in a row — keep going!';
      else labelEl.textContent = `days in a row 🔥`;
    }

    if (dotL) {
      dotL.className = 'streak-person-dot' + (data.lottieDone ? ' done' : '');
      dotL.textContent = data.lottieDone ? '✓' : '👩';
    }
    if (dotJ) {
      dotJ.className = 'streak-person-dot' + (data.jonnyDone ? ' done' : '');
      dotJ.textContent = data.jonnyDone ? '✓' : '👨';
    }

    if (nudgeWrap) {
      nudgeWrap.innerHTML = '';
      if (!data.todayComplete) {
        const missing = !data.lottieDone ? 'Lottie' : 'Jonny';
        const btn = document.createElement('button');
        btn.className = 'nudge-btn';
        btn.textContent = `👉 Nudge ${missing}`;
        btn.onclick = () => nudgePerson(missing);
        nudgeWrap.appendChild(btn);
      }
    }
  } catch (err) {
    console.error('loadStreakData error:', err);
  }
}

// ──────────────────────────────────────────────────────────────
// RENDER STREAK — DASHBOARD
// ──────────────────────────────────────────────────────────────

window.updateDashboardStreak = async function() {
  try {
    const data = await calculateStreaks();

    const countEl   = document.getElementById('dash-streak-count');
    const lottieSt  = document.getElementById('dash-lottie-status');
    const jonnySt   = document.getElementById('dash-jonny-status');
    const nudgeWrap = document.getElementById('dash-nudge-wrap');

    if (countEl) {
      countEl.textContent = data.currentStreak === 1
        ? '1 day 🔥'
        : data.currentStreak > 1
          ? `${data.currentStreak} days 🔥`
          : '0 days';
    }

    const lottieIcon = document.getElementById('dash-lottie-icon');
    const jonnyIcon  = document.getElementById('dash-jonny-icon');
    if (lottieIcon) lottieIcon.textContent = data.lottieDone ? '✓' : '✕';
    if (jonnyIcon)  jonnyIcon.textContent  = data.jonnyDone  ? '✓' : '✕';
    if (lottieSt) { lottieSt.textContent = (data.lottieDone ? '✓' : '✕') + ' Lottie'; }
    if (jonnySt)  { jonnySt.textContent  = (data.jonnyDone  ? '✓' : '✕') + ' Jonny'; }

    if (nudgeWrap) {
      nudgeWrap.innerHTML = '';
      const btn = document.createElement('button');
      if (!data.todayComplete) {
        const missing = !data.lottieDone ? 'Lottie' : 'Jonny';
        btn.textContent = `👉 Nudge ${missing}`;
        btn.onclick = () => { window.nudgePersonGlobal ? window.nudgePersonGlobal(missing) : nudgePerson(missing); };
      } else {
        btn.textContent = `See today's Glimmers →`;
        btn.onclick = () => navTo('glimmers');
      }
      nudgeWrap.appendChild(btn);
    }
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
    sub.textContent = 'Sent! 💜';
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
    sendPushNotification(`👉 Hey ${name}! Time to add your Glimmer today 💜`);
    showToast(`📣 Nudge sent to ${name}!`);
    return;
  }
  // Fallback: friendly in-app toast
  showToast(`👉 Hey ${name}! Don't forget your Glimmer today 💜`);
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
// INIT — set "by" selector to current user, wire tab events
// ──────────────────────────────────────────────────────────────

function initGlimmerSection() {
  const me = localStorage.getItem('jottie-name') || 'Lottie';
  const sel = document.getElementById('glimmer-by');
  if (sel) sel.value = me;
}

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
    todos:     '✅',
    shopping:  '🛒',
    glimmers:  '✨',
    birthdays: '🎂',
    calendar:  '📅',
    luna:      '🦴',
    lists:     '🎁'
  };

  let _activeSection = 'today';

  // Wire the nav FAB button once, decide behaviour based on _activeSection
  document.addEventListener('DOMContentLoaded', function() {
    const navBtn = document.getElementById('nav-fab-main');
    if (!navBtn) return;
    navBtn.addEventListener('click', function() {
      if (_activeSection === 'today') {
        toggleFab();
      } else {
        contextFabAction(_activeSection);
      }
    });
  });

  window.updateFabForSection = function(sec) {
    _activeSection = sec;
    const navBtn = document.getElementById('nav-fab-main');
    const iconEl = document.getElementById('nav-fab-icon');
    if (!navBtn) return;

    if (sec === 'today') {
      navBtn.setAttribute('aria-label', 'Quick add');
      if (iconEl) iconEl.textContent = '';
    } else {
      // Close arch if somehow open
      closeFab();
      navBtn.setAttribute('aria-label', 'Add to ' + sec);
      if (iconEl) iconEl.textContent = SECTION_ICONS[sec] || '';
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
    const sheetSections = ['todos','shopping','calendar','birthdays','glimmers','luna','lists'];
    if (sheetSections.includes(section)) {
      navTo(section);
      openBottomSheet(section);
      return;
    }
    if (section === 'luna') {
      setTimeout(logChew, 100);
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

