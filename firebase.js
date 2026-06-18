// ════════════════════════════════════════════════════════════════
//  FIREBASE CONFIG
//  Replace the values below with your own from Firebase Console →
//  Project Settings → Your Apps → Web App → firebaseConfig
// ════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyD8V6vSAQh8dhaat4euCWh6aevPBDg-aUc",
  authDomain:        "jottieplans.firebaseapp.com",
  projectId:         "jottieplans",
  storageBucket:     "jottieplans.firebasestorage.app",
  messagingSenderId: "1068707407091",
  appId:             "1:1068707407091:web:a827b16ba13c7d84ce0386"
};
// ════════════════════════════════════════════════════════════════

// ── State ───────────────────────────────────────────────────────
let db;
let storage;
var me = localStorage.getItem('jottie-name');
const configured = firebaseConfig.apiKey !== 'YOUR_API_KEY';


// ── Shared dashboard state ─────────────────────────────────────────
let _calData  = [];
let _shopData = [];
let _todoData = [];
let _lunaData = [];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtFullDate(d) {
  return d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
}

function countdownChip(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
  if (diff === 0) return {label:'Today',            cls:'chip-today'};
  if (diff === 1) return {label:'Tomorrow',          cls:'chip-tom'};
  if (diff < 8)  return {label:`In ${diff} days`,   cls:'chip-near'};
  return             {label:`In ${diff} days`,       cls:'chip-far'};
}

function whoChip(who) {
  const cls = {Lottie:'chip-lottie',Jonny:'chip-jonny',Both:'chip-both',Either:'chip-either'};
  return `<span class="dash-chip ${cls[who]||'chip-either'}">${esc(who)}</span>`;
}

function renderToday() {
  if (!me) {
    document.getElementById('header-greeting').textContent = 'Welcome! 💜';
    document.getElementById('header-date').textContent = fmtFullDate(new Date());
    return;
  }
  document.getElementById('header-greeting').textContent = `${getGreeting()}, ${me}! 💜`;
  document.getElementById('header-date').textContent = fmtFullDate(new Date());

  const todayStr = new Date().toISOString().split('T')[0];
  const weekEnd  = new Date(); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // ── To-Dos (today's tasks: due today or outstanding) ────────────
  const openTodos = _todoData.filter(t => !t.completed);
  const todayTasks = openTodos.filter(t => !t.due || t.due <= todayStr);
  const displayTodos = todayTasks.length > 0 ? todayTasks : openTodos;
  document.getElementById('dash-todo-count').textContent = openTodos.length;
  document.getElementById('dash-todos').innerHTML = displayTodos.length === 0
    ? '<div class="dash-empty">You\'re all caught up! 🎉</div>'
    : displayTodos.slice(0, 5).map(t => {
        const whoH = t.who ? whoChip(t.who) : '';
        const dueH = t.due ? `<span class="dash-chip chip-far">Due ${fmtDate(t.due)}</span>` : '';
        return `<div class="dash-row">${esc(t.title)}</div>`;
      }).join('');

  // ── Coming up (events + birthdays in next 30 days) ────────────────
  const monthEnd = new Date(); monthEnd.setDate(monthEnd.getDate() + 30);
  const monthEndStr = monthEnd.toISOString().split('T')[0];
  const upcomingEvents = _calData
    .filter(e => e.date >= todayStr && e.date <= monthEndStr)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map(ev => { const chip = countdownChip(ev.date); return `<div class="dash-row"><div class="dash-row-title">${esc(ev.title)}</div><span class="dash-chip ${chip.cls}">${chip.label}</span></div>`; });
  const upcomingBdays = typeof _birthdaysData !== 'undefined' ? _birthdaysData
    .map(b => ({...b, ...getBirthdayInfo(b.date, b.birthYear)}))
    .filter(b => b.diffDays <= 30)
    .sort((a,b) => a.diffDays - b.diffDays)
    .map(b => {
      const dayLabel = b.diffDays === 0 ? 'Today! 🎉' : b.diffDays === 1 ? 'Tomorrow' : `In ${b.diffDays} days`;
      return `<div class="dash-row"><div class="dash-row-title">${esc(b.name)}</div><span class="dash-chip chip-soon">${dayLabel}</span></div>`;
    }) : [];
  const allUpcoming = [...upcomingEvents, ...upcomingBdays].sort(() => 0);
  document.getElementById('dash-ev-count').textContent = allUpcoming.length;
  document.getElementById('dash-events').innerHTML = allUpcoming.length === 0
    ? '<div class="dash-empty">Nothing coming up this month</div>'
    : allUpcoming.join('');

  // ── Completed it mate ─────────────────────────────────────────────
  renderCompletedFeed();

  // ── Shopping ─────────────────────────────────────────────────────
  const activeShop = _shopData.filter(i => !i.completed);
  document.getElementById('dash-shop-count').textContent =
    activeShop.length === 1 ? '1 item' : `${activeShop.length} items`;
  document.getElementById('dash-shop').innerHTML = activeShop.length === 0
    ? '<div class="dash-empty">Shopping list is empty</div>'
    : activeShop.slice(-5).reverse().map(i =>
        `<div class="dash-row">${esc(i.name)}</div>`
      ).join('');

  // ── Luna (dashboard) ─────────────────────────────────────────────
  const todayDateStr = new Date().toLocaleDateString('en-GB');
  const lunaBtn = document.getElementById('dash-luna-btn');
  const lunaStatus = document.getElementById('dash-luna-chew-status');
  const lunaLogged = document.getElementById('dash-luna-logged');
  const lunaUnlog = document.getElementById('dash-luna-unlog');
  if (lunaBtn && lunaStatus) {
    const todayChew = _lunaData.find(e => e.createdAt && e.createdAt.toDate().toLocaleDateString('en-GB') === todayDateStr);
    if (todayChew) {
      lunaBtn.textContent = '✓ Chew given!';
      lunaBtn.classList.add('done');
      lunaBtn.onclick = null;
      if (lunaLogged) lunaLogged.textContent = `Given by ${todayChew.loggedBy}`;
      if (lunaUnlog) lunaUnlog.style.display = 'block';
    } else {
      lunaBtn.textContent = '🦴 Log chew';
      lunaBtn.classList.remove('done');
      lunaBtn.onclick = dashLogChew;
      if (lunaLogged) lunaLogged.textContent = _lunaData.length ? `Last: ${ago(_lunaData[0].createdAt)}` : '';
      if (lunaUnlog) lunaUnlog.style.display = 'none';
    }
    if (lunaStatus) lunaStatus.textContent = todayChew ? 'Luna has had her chew today 🎉' : 'Not given yet';
  }

  // ── Recent Glimmers ───────────────────────────────────────────────
  if (typeof renderDashGlimmers === 'function') renderDashGlimmers();
}

// ── Firebase init ───────────────────────────────────────────────
function initFirebase() {
  if (!configured) {
    document.getElementById('setup-notice').style.display = 'block';
    ['calendar-list','shopping-list','todo-list'].forEach(id => {
      document.getElementById(id).innerHTML =
        '<div class="empty"><div class="emo">⚙️</div><p>Add your Firebase config to enable sync</p></div>';
    });
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  storage = firebase.storage();
  initMessaging();
  listenCalendar();
  listenShopping();
  listenTodos();
  listenLuna();
  listenLunaNotes();
  initNotes();
  listenBirthdays();
  // Start glimmer/streak now that db is ready
  if (typeof updateDashboardStreak === 'function') updateDashboardStreak();
  if (typeof loadGlimmersList === 'function') {
    const glimActive = document.querySelector('#glimmers-section.active');
    if (glimActive) {
      if (typeof initGlimmerSection === 'function') initGlimmerSection();
      loadGlimmersList();
      if (typeof loadStreakData === 'function') loadStreakData();
    }
  }
  if (me) setTimeout(checkNotifStatus, 1200);
}

