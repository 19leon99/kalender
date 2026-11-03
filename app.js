/* Unser Kalender – gemeinsamer Kalender für zwei Personen.
   Läuft ohne Build-Schritt. Daten liegen in Supabase (wenn in config.js eingetragen)
   und zusätzlich im Browser als Zwischenspeicher. Ohne Supabase: Demo nur im Browser. */
'use strict';
(function () {
  const CFG = window.KALENDER_CONFIG || {};
  const NAMES = { a: CFG.name1 || 'Leon', b: CFG.name2 || 'Person 2', g: 'Gemeinsam' };
  const REMOTE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const DEMO_ONLY = !!CFG.artifactDemo;

  /* ---------- Hilfsfunktionen ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const parseLocal = s => {
    const [date, time] = String(s).split('T');
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0);
  };
  const fmtLocal = d => ymd(d) + 'T' + hm(d);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => {
    const x = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
    const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    if (d.getDate() > dim) return null;
    x.setDate(d.getDate());
    return x;
  };
  const wd = d => (d.getDay() + 6) % 7;
  const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfWeek = d => addDays(dayStart(d), -wd(d));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const randKey = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'[b % 64]).join(''); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const MON = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const WDS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const WDL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const longDay = d => WDS[wd(d)] + ' ' + d.getDate() + '. ' + MON[d.getMonth()];
  const ls = {
    get(k, def) { try { const v = localStorage.getItem('kal.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('kal.' + k, JSON.stringify(v)); } catch (e) { /* nicht verfügbar */ } }
  };
  const ICON = {
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    repeat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" role="img" aria-label="Serientermin"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
    cal: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    list: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/></svg>',
    imp: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    people: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1.5 6 4.5"/></svg>',
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    file: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
  };

  /* ---------- Wiederholungen ---------- */
  function evBounds(ev) {
    const s = parseLocal(ev.start);
    const e = ev.allDay ? addDays(parseLocal(ev.end || ev.start), 1) : parseLocal(ev.end || ev.start);
    return { s, dur: Math.max(0, e - s) };
  }
  function occurrences(ev, from, to) {
    const { s, dur } = evBounds(ev);
    const ex = new Set(ev.exdates || []);
    const out = [];
    const push = st => {
      const en = new Date(st.getTime() + dur);
      if (st < to && (en > from || (dur === 0 && st >= from)) && !ex.has(ymd(st))) out.push({ ev, start: st, end: en, date: ymd(st) });
    };
    const r = ev.rrule;
    if (!r) { push(s); return out; }
    const until = r.until ? addDays(parseYmd(r.until), 1) : null;
    const step = Math.max(1, Number(r.interval) || 1);
    let n = 0, guard = 0;
    const emit = st => {
      if (until && st >= until) return false;
      if (r.count && n >= r.count) return false;
      n++; push(st); return true;
    };
    if (r.freq === 'WEEKLY') {
      const days = (r.byday && r.byday.length ? r.byday.slice() : [wd(s)]).sort((x, y) => x - y);
      let wk = startOfWeek(s);
      while (guard++ < 4000) {
        for (const d of days) {
          const st = addDays(wk, d); st.setHours(s.getHours(), s.getMinutes(), 0, 0);
          if (st < s) continue;
          if (st >= to) return out;
          if (!emit(st)) return out;
        }
        wk = addDays(wk, 7 * step);
      }
    } else {
      let i = 0;
      while (guard++ < 8000) {
        let st = null;
        if (r.freq === 'DAILY') st = addDays(s, i * step);
        else if (r.freq === 'MONTHLY') st = addMonths(s, i * step);
        else if (r.freq === 'YEARLY') st = addMonths(s, 12 * i * step);
        else { push(s); return out; }
        i++;
        if (!st) continue;
        if (st >= to) return out;
        if (!emit(st)) return out;
      }
    }
    return out;
  }
  function inRange(from, to) {
    const all = [];
    for (const ev of state.events) for (const o of occurrences(ev, from, to)) all.push(o);
    all.sort((a, b) => (b.ev.allDay - a.ev.allDay) || (a.start - b.start) || a.ev.title.localeCompare(b.ev.title));
    return all;
  }
  function ruleText(r, startDate) {
    if (!r) return 'einmalig';
    const n = Math.max(1, Number(r.interval) || 1);
    let t;
    if (r.freq === 'DAILY') t = n === 1 ? 'täglich' : 'alle ' + n + ' Tage';
    else if (r.freq === 'WEEKLY') {
      const days = (r.byday && r.byday.length ? r.byday : [wd(startDate)]).slice().sort().map(i => WDL[i]);
      t = (n === 1 ? 'jeden ' : 'alle ' + n + ' Wochen am ') + days.join(', ');
    } else if (r.freq === 'MONTHLY') t = (n === 1 ? 'monatlich' : 'alle ' + n + ' Monate') + ' am ' + startDate.getDate() + '.';
    else t = n === 1 ? 'jährlich' : 'alle ' + n + ' Jahre';
    if (r.until) t += ', bis ' + longDay(parseYmd(r.until));
    else if (r.count) t += ', ' + r.count + ' Mal';
    return t;
  }

  /* ---------- Speicher ---------- */
  let space = null;
  function initSpace() {
    const m = location.hash.match(/k=([A-Za-z0-9_-]{24,64})/);
    if (m) { ls.set('space', m[1]); history.replaceState(null, '', location.pathname + location.search); }
    space = ls.get('space', null);
  }
  async function rpc(fn, body) {
    const res = await fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }
  const pending = () => ls.get('pending', { up: {}, del: [] });
  async function flush() {
    if (!REMOTE || !space) return;
    const p = pending();
    const ups = Object.values(p.up);
    if (ups.length) await rpc('upsert_events', { p_space: space, p_events: ups });
    for (const id of p.del) await rpc('delete_event', { p_space: space, p_id: id });
    ls.set('pending', { up: {}, del: [] });
  }
  async function load() {
    if (!REMOTE) {
      const local = ls.get('events', null);
      state.events = local || demoEvents();
      if (!local) ls.set('events', state.events);
      return;
    }
    state.events = ls.get('cache.' + space, []);
    if (!space) return;
    try {
      await flush();
      const rows = await rpc('list_events', { p_space: space });
      state.events = (rows || []).map(r => r.data);
      ls.set('cache.' + space, state.events);
      state.offline = false;
    } catch (e) { state.offline = true; }
  }
  async function saveEvents(list) {
    const now = new Date().toISOString();
    for (const ev of list) {
      ev.updatedAt = now; ev.updatedBy = state.me || null;
      if (!ev.createdAt) { ev.createdAt = now; ev.createdBy = state.me || null; }
      const i = state.events.findIndex(x => x.id === ev.id);
      if (i >= 0) state.events[i] = ev; else state.events.push(ev);
    }
    persistLocal();
    if (REMOTE && space) {
      const p = pending(); for (const ev of list) p.up[ev.id] = ev; ls.set('pending', p);
      try { await flush(); state.offline = false; } catch (e) { state.offline = true; toast('Offline gespeichert, wird später übertragen'); }
    }
  }
  async function removeEvent(id) {
    state.events = state.events.filter(e => e.id !== id);
    persistLocal();
    if (REMOTE && space) {
      const p = pending(); delete p.up[id]; p.del.push(id); ls.set('pending', p);
      try { await flush(); } catch (e) { state.offline = true; toast('Offline gelöscht, wird später übertragen'); }
    }
  }
  function persistLocal() { if (REMOTE) ls.set('cache.' + space, state.events); else ls.set('events', state.events); }

  function demoEvents() {
    const t = dayStart(new Date());
    const wk = startOfWeek(t);
    const at = (d, h, m) => { const x = addDays(wk, d); x.setHours(h, m || 0); return fmtLocal(x); };
    const mk = (title, owner, s, e, extra) => Object.assign({ id: uuid(), title, owner, start: s, end: e, allDay: false, rrule: null, exdates: [], location: '', notes: '', reminder: 60, source: 'demo' }, extra || {});
    return [
      mk('Training', 'a', at(0, 19, 30), at(0, 21), { rrule: { freq: 'WEEKLY', interval: 1, byday: [0, 3] } }),
      mk('Yoga', 'b', at(1, 18), at(1, 19, 15), { rrule: { freq: 'WEEKLY', interval: 1, byday: [1] }, location: 'Studio am Herrngarten' }),
      mk('Zahnarzt', 'a', at(1, 8, 15), at(1, 9)),
      mk('Abendessen bei Jonas und Ana', 'g', at(1, 19, 30), at(1, 22), { notes: 'Wein mitbringen' }),
      mk('Chor', 'b', at(3, 20), at(3, 21, 30), { rrule: { freq: 'WEEKLY', interval: 1, byday: [3] } }),
      mk('Kino', 'g', at(4, 19), at(4, 21, 30)),
      mk('Brunch mit Mara', 'b', at(5, 11), at(5, 13)),
      mk('Wocheneinkauf', 'g', at(5, 15), at(5, 16), { rrule: { freq: 'WEEKLY', interval: 1, byday: [5] } }),
      mk('Wandern im Odenwald', 'g', ymd(addDays(wk, 13)), ymd(addDays(wk, 13)), { allDay: true }),
      mk('Müll rausbringen', 'a', at(2, 7), at(2, 7, 15), { rrule: { freq: 'WEEKLY', interval: 2, byday: [2] } })
    ];
  }

  /* ---------- Zustand ---------- */
  const today = dayStart(new Date());
  const state = {
    events: [], me: ls.get('me', null), view: ls.get('view', 'month'), cursor: today, selected: today,
    who: 'all', kind: 'all', sheet: null, imports: [], offline: false, badge: ls.get('badge', true)
  };
  const setView = v => { state.view = v; ls.set('view', v); render(); window.scrollTo(0, 0); };

  /* ---------- Darstellung ---------- */
  const app = document.getElementById('app');
  function render() {
    const tabs = [['month', 'Kalender', ICON.cal], ['list', 'Liste', ICON.list], ['import', 'Import', ICON.imp], ['access', 'Zugang', ICON.people]];
    const isCal = state.view === 'month' || state.view === 'week';
    let main = '';
    if (state.view === 'month') main = viewMonth();
    else if (state.view === 'week') main = viewWeek();
    else if (state.view === 'list') main = viewList();
    else if (state.view === 'import') main = viewImport();
    else main = viewAccess();
    app.innerHTML =
      '<div class="app">' + banner() + main + '</div>' +
      (isCal || state.view === 'list' ? '<button class="fab" data-act="new" aria-label="Neuer Termin">' + ICON.plus + '</button>' : '') +
      '<nav class="tabs" aria-label="Bereiche"><div class="tabs-in">' +
      tabs.map(([v, l, ic]) => {
        const cur = v === 'month' ? isCal : state.view === v;
        return '<button class="tab" data-act="tab" data-v="' + v + '"' + (cur ? ' aria-current="page"' : '') + '>' + ic + l + '</button>';
      }).join('') + '</div></nav>' +
      '<div id="sheet-root">' + sheetHtml() + '</div>';
    if (state.view === 'week') {
      const sc = app.querySelector('.grid-scroll');
      if (sc && !sc.dataset.done) { sc.scrollTop = 7 * 44; sc.dataset.done = '1'; }
    }
    updateBadge();
  }
  function renderSheet() { const r = document.getElementById('sheet-root'); if (r) r.innerHTML = sheetHtml(); }

  function banner() {
    if (DEMO_ONLY) return '<div class="banner">' + ICON.info + '<span>Vorschau mit Beispielterminen. Änderungen bleiben nur in diesem Browser. Den gemeinsamen Kalender richtest du über das GitHub-Repo ein</span></div>';
    if (!REMOTE) return '<div class="banner">' + ICON.info + '<span>Noch nicht mit Supabase verbunden. Termine bleiben nur in diesem Browser, bis config.js ausgefüllt ist</span></div>';
    if (!space) return '<div class="banner">' + ICON.info + '<span>Dieses Gerät ist noch mit keinem Kalender verbunden. Unter Zugang einen Kalender anlegen oder den Einladungslink einfügen</span></div>';
    if (state.offline) return '<div class="banner">' + ICON.info + '<span>Keine Verbindung. Du siehst den letzten Stand, Änderungen werden später übertragen</span></div>';
    return '';
  }
  const legend = () => '<div class="legend"><span><i class="dot a"></i>' + esc(NAMES.a) + '</span><span><i class="dot b"></i>' + esc(NAMES.b) + '</span><span><i class="dot g"></i>Gemeinsam</span></div>';
  const calSeg = () => '<div class="seg" style="width:152px"><button data-act="cal" data-v="week" aria-pressed="' + (state.view === 'week') + '">Woche</button><button data-act="cal" data-v="month" aria-pressed="' + (state.view === 'month') + '">Monat</button></div>';

  function evRow(o) {
    const ev = o.ev;
    const time = ev.allDay ? 'ganztg.' : hm(o.start);
    const meta = NAMES[ev.owner] + ' · ' + (ev.rrule ? ruleText(ev.rrule, parseLocal(ev.start)) : 'einmalig') + (ev.location ? ' · ' + ev.location : '');
    return '<button class="ev" data-act="open" data-id="' + ev.id + '" data-date="' + o.date + '">' +
      '<span class="t">' + time + '</span><i class="dot ' + ev.owner + '"></i>' +
      '<span class="body"><span class="title">' + esc(ev.title || 'Ohne Titel') + '</span><span class="meta">' + esc(meta) + '</span></span>' +
      (ev.rrule ? ICON.repeat : '') + '</button>';
  }

  function viewMonth() {
    const c = state.cursor;
    const first = new Date(c.getFullYear(), c.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const gridEnd = addDays(gridStart, 42);
    const occ = inRange(gridStart, gridEnd);
    const byDay = {};
    for (const o of occ) {
      // mehrtägige Termine an jedem Tag zeigen
      let d = dayStart(o.start);
      const last = o.ev.allDay ? addDays(o.end, -1) : o.end;
      let guard = 0;
      do { (byDay[ymd(d)] = byDay[ymd(d)] || []).push(o); d = addDays(d, 1); } while (d < last && guard++ < 60);
    }
    let cells = '';
    for (let w = 0; w < 6; w++) {
      cells += '<div class="week-row">';
      for (let i = 0; i < 7; i++) {
        const d = addDays(gridStart, w * 7 + i), k = ymd(d), list = byDay[k] || [];
        const cls = ['day'];
        if (d.getMonth() !== c.getMonth()) cls.push('out');
        if (k === ymd(today)) cls.push('today');
        if (k === ymd(state.selected)) cls.push('sel');
        const dots = list.slice(0, 3).map(o => '<i class="dot s ' + o.ev.owner + '"></i>').join('') + (list.length > 3 ? '<span class="more">+</span>' : '');
        cells += '<button class="' + cls.join(' ') + '" data-act="pick" data-date="' + k + '" aria-label="' + longDay(d) + ', ' + list.length + ' Termine"><span class="n">' + d.getDate() + '</span><span class="dots">' + dots + '</span></button>';
      }
      cells += '</div>';
    }
    const sel = state.selected;
    const dayList = inRange(sel, addDays(sel, 1));
    const selLabel = (ymd(sel) === ymd(today) ? 'Heute, ' : '') + longDay(sel);
    return '<header class="head"><div class="head-row"><h1 class="h1">' + MONTHS[c.getMonth()] + ' ' + c.getFullYear() + '</h1>' +
      '<div class="row-gap"><button class="icon-btn" data-act="mprev" aria-label="Vorheriger Monat">' + ICON.prev + '</button><button class="icon-btn" data-act="mnext" aria-label="Nächster Monat">' + ICON.next + '</button></div></div>' +
      '<div class="head-row">' + legend() + '</div>' +
      '<div class="head-row">' + calSeg() + '<button class="text-btn" data-act="today">Heute</button></div></header>' +
      '<section class="month" aria-label="Monatsraster"><div class="wd-row">' + WDS.map(x => '<span>' + x + '</span>').join('') + '</div>' + cells + '</section>' +
      '<section class="agenda"><div class="agenda-head"><h2 class="h2">' + selLabel + '</h2><span class="count">' + dayList.length + (dayList.length === 1 ? ' Termin' : ' Termine') + '</span></div>' +
      (dayList.length ? dayList.map(evRow).join('') : '<p class="empty">Nichts eingetragen</p>') + '</section>';
  }

  function viewWeek() {
    const ws = startOfWeek(state.cursor), we = addDays(ws, 7);
    const occ = inRange(ws, we);
    const HH = 44;
    let head = '', allday = '', cols = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), k = ymd(d);
      head += '<button class="wh' + (k === ymd(today) ? ' today' : '') + '" data-act="pickweek" data-date="' + k + '"><span>' + WDS[i] + '</span><span class="n">' + d.getDate() + '</span></button>';
      const dayOcc = occ.filter(o => o.start < addDays(d, 1) && o.end > d);
      allday += '<div class="col">' + dayOcc.filter(o => o.ev.allDay || o.end - o.start >= 86400000).map(o =>
        '<button class="chip-ev ' + o.ev.owner + '" data-act="open" data-id="' + o.ev.id + '" data-date="' + o.date + '">' + esc(o.ev.title) + '</button>').join('') + '</div>';
      const timed = dayOcc.filter(o => !o.ev.allDay && o.end - o.start < 86400000).map(o => {
        const s = Math.max(0, (o.start - d) / 3600000), e = Math.min(24, (o.end - d) / 3600000);
        return { o, s, e: Math.max(e, s + 0.5) };
      }).sort((x, y) => x.s - y.s || y.e - x.e);
      // Überlappungen nebeneinander legen
      let cluster = [], clusterEnd = -1, html = '';
      const flushCluster = () => {
        const lanes = [];
        for (const it of cluster) {
          let li = lanes.findIndex(end => end <= it.s);
          if (li < 0) { li = lanes.length; lanes.push(0); }
          lanes[li] = it.e; it.lane = li;
        }
        const n = lanes.length;
        for (const it of cluster) {
          const w = 100 / n;
          html += '<button class="blk ' + it.o.ev.owner + '" data-act="open" data-id="' + it.o.ev.id + '" data-date="' + it.o.date + '" style="top:' + Math.round(it.s * HH + 1) + 'px;height:' + Math.round((it.e - it.s) * HH - 2) + 'px;left:calc(' + (it.lane * w) + '% + 2px);width:calc(' + w + '% - 4px)">' +
            '<span>' + esc(it.o.ev.title) + '</span>' + (it.e - it.s >= 1 ? '<span style="font-weight:400;opacity:.85">' + hm(it.o.start) + '</span>' : '') + '</button>';
        }
        cluster = [];
      };
      for (const it of timed) { if (it.s >= clusterEnd && cluster.length) flushCluster(); cluster.push(it); clusterEnd = Math.max(clusterEnd, it.e); }
      if (cluster.length) flushCluster();
      cols += '<div class="col-day" data-act="slot" data-date="' + k + '">' + html + '</div>';
    }
    let hours = '';
    for (let h = 1; h < 24; h++) hours += '<div class="hour" style="top:' + (h * HH) + 'px"><span>' + pad(h) + '</span><i></i></div>';
    let now = '';
    const nowD = new Date();
    if (nowD >= ws && nowD < we) {
      const i = wd(nowD), top = Math.round((nowD.getHours() + nowD.getMinutes() / 60) * HH);
      now = '<div class="now" style="top:' + top + 'px;left:calc(36px + (100% - 36px) * ' + i + ' / 7);width:calc((100% - 36px) / 7)"></div>';
    }
    const title = ws.getDate() + '.' + (ws.getMonth() !== addDays(ws, 6).getMonth() ? ' ' + MON[ws.getMonth()] : '') + '–' + addDays(ws, 6).getDate() + '. ' + MON[addDays(ws, 6).getMonth()];
    return '<header class="head"><div class="head-row"><h1 class="h1">' + title + '</h1>' +
      '<div class="row-gap"><button class="icon-btn" data-act="wprev" aria-label="Vorherige Woche">' + ICON.prev + '</button><button class="icon-btn" data-act="wnext" aria-label="Nächste Woche">' + ICON.next + '</button></div></div>' +
      '<div class="head-row">' + calSeg() + '<button class="text-btn" data-act="today">Heute</button></div></header>' +
      '<div class="week-head" style="margin-top:12px">' + head + '</div>' +
      '<div class="allday">' + allday + '</div>' +
      '<div class="grid-scroll"><div class="grid">' + hours + '<div class="cols">' + cols + '</div>' + now + '</div></div>';
  }

  function viewList() {
    const from = today, to = addDays(today, 120);
    const occ = inRange(from, to).filter(o => (state.who === 'all' || o.ev.owner === state.who) && (state.kind === 'all' || (state.kind === 'series') === !!o.ev.rrule));
    const groups = [];
    for (const o of occ) {
      const k = ymd(o.start < from ? from : o.start);
      let g = groups[groups.length - 1];
      if (!g || g.k !== k) { g = { k, items: [] }; groups.push(g); }
      g.items.push(o);
    }
    const chip = (v, label, dot) => '<button class="chip" data-act="who" data-v="' + v + '" aria-pressed="' + (state.who === v) + '">' + (dot ? '<i class="dot ' + v + '"></i>' : '') + esc(label) + '</button>';
    const kind = (v, l) => '<button data-act="kind" data-v="' + v + '" aria-pressed="' + (state.kind === v) + '">' + l + '</button>';
    return '<header class="head"><div class="head-row"><h1 class="h1">Demnächst</h1></div>' +
      '<div class="chips">' + chip('all', 'Alle') + chip('a', NAMES.a, 1) + chip('b', NAMES.b, 1) + chip('g', 'Gemeinsam', 1) + '</div>' +
      '<div class="seg">' + kind('all', 'Alle') + kind('once', 'Einmalig') + kind('series', 'Serien') + '</div></header>' +
      '<section class="groups">' + (groups.length ? groups.map(g => {
        const d = parseYmd(g.k);
        return '<div class="group"><span class="group-label">' + (g.k === ymd(today) ? 'Heute, ' : '') + longDay(d) + '</span>' + g.items.map(evRow).join('') + '</div>';
      }).join('') : '<p class="empty">Keine Termine für diesen Filter in den nächsten vier Monaten</p>') + '</section>';
  }

  function viewImport() {
    const files = state.imports;
    const fileCard = f => '<div class="panel pad-in"><div class="file-line"><span style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--text);font-weight:500">' + ICON.file + esc(f.name) + '</span>' +
      '<button class="icon-btn" style="width:32px;height:32px" data-act="rmfile" data-i="' + f.i + '" aria-label="Datei entfernen">×</button></div>' +
      '<div class="file-line"><span>' + f.events.length + ' Termine · ' + f.events.filter(e => e.rrule).length + ' Serien</span>' +
      '<label class="sr" for="own-' + f.i + '">Zuordnung</label><select id="own-' + f.i + '" data-act="fowner" data-i="' + f.i + '" style="background:var(--chip);border:0;border-radius:8px;padding:6px 10px">' +
      ['a', 'b', 'g'].map(k => '<option value="' + k + '"' + (f.owner === k ? ' selected' : '') + '>' + esc(NAMES[k]) + '</option>').join('') + '</select></div>' +
      (f.skipped ? '<span class="hint" style="padding:0">' + f.skipped + ' Einträge übersprungen (abgesagt oder ohne Datum)</span>' : '') + '</div>';
    const plan = importPlan();
    return '<header class="head"><div class="head-row"><h1 class="h1">Termine übernehmen</h1></div>' +
      '<p class="sub">Beide alten Kalender als .ics-Datei hochladen. Termine, die in beiden Dateien stehen, werden ein gemeinsamer Termin</p></header>' +
      '<div class="pad stack" style="padding-top:20px">' +
      files.map(fileCard).join('') +
      '<label class="drop" for="ics-input">' + ICON.imp + '<span>' + (files.length ? 'Weitere .ics-Datei wählen' : '.ics-Datei wählen') + '</span><input id="ics-input" type="file" accept=".ics,text/calendar" multiple data-act="file"></label>' +
      (plan ? '<div class="stack" style="padding-top:12px"><span class="section-label">Vorschau</span><div class="panel" style="overflow:hidden">' +
        plan.preview.map(p => '<div class="ev" style="border-radius:0;box-shadow:inset 0 -1px 0 var(--divider)"><i class="dot ' + p.owner + '"></i><span class="body"><span class="title">' + esc(p.title) + '</span><span class="meta">' + esc(p.meta) + '</span></span><span class="tag">' + p.tag + '</span></div>').join('') +
        '</div><button class="btn" data-act="doimport"' + (plan.total ? '' : ' disabled') + '>' + plan.total + ' Termine importieren</button>' +
        '<span class="hint" style="text-align:center">' + plan.merged + ' doppelt, werden gemeinsam · ' + plan.existing + ' schon im Kalender, werden übersprungen</span></div>' : '') +
      '<div class="panel pad-in" style="margin-top:12px"><span class="h2" style="font-size:15px">So kommst du an die Dateien</span>' +
      '<p class="note"><b style="font-weight:500">Apple Kalender:</b> am Mac in der Kalender-App den Kalender auswählen, dann Ablage › Exportieren › Exportieren. Die iPhone-App kann nicht exportieren</p>' +
      '<p class="note"><b style="font-weight:500">TimeTree:</b> TimeTree hat keinen eigenen Export. Am Rechner das inoffizielle Tool TimeTree-Exporter nutzen (pip install timetree-exporter, dann timetree-exporter -o timetree.ics). Es fragt nach den TimeTree-Zugangsdaten</p></div>' +
      '</div>';
  }

  function accessUrl() { return location.origin + location.pathname + '#k=' + space; }
  function viewAccess() {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const icon = (document.querySelector('link[rel="apple-touch-icon"]') || {}).href || CFG.iconData || '';
    let share = '';
    if (DEMO_ONLY) share = '<p class="note">In dieser Vorschau gibt es keinen Einladungslink. Nach der Einrichtung über GitHub erscheint hier der Link für ' + esc(NAMES.b) + '</p>';
    else if (!REMOTE) share = '<p class="note">Trage in config.js die Supabase-Adresse und den öffentlichen Schlüssel ein. Dann erscheint hier der Einladungslink</p>';
    else if (!space) share = '<p class="note">Dieses Gerät ist noch mit keinem Kalender verbunden</p>' +
      '<button class="btn" data-act="newspace">Neuen gemeinsamen Kalender anlegen</button>' +
      '<label class="sr" for="join">Einladungslink</label><div class="copy-row"><input id="join" placeholder="Einladungslink einfügen"><button class="text-btn" data-act="join">Verbinden</button></div>';
    else share = '<p class="note">Wer diesen Link öffnet, kann alle Termine sehen und eintragen. Er ersetzt ein Konto, also nur an ' + esc(NAMES.b) + ' schicken</p>' +
      '<div class="copy-row"><label class="sr" for="inv">Einladungslink</label><input id="inv" readonly value="' + esc(accessUrl()) + '"><button class="text-btn" data-act="copy" data-src="inv">Kopieren</button></div>' +
      (navigator.share ? '<button class="btn-line" data-act="shareinv">Über Nachrichten oder WhatsApp senden</button>' : '');
    let feed = '';
    if (REMOTE && space && CFG.icsFeedUrl) {
      const u = CFG.icsFeedUrl.replace(/\/$/, '') + '?k=' + space;
      feed = '<div class="panel pad-in"><span class="h2" style="font-size:15px">Im eigenen Kalender abonnieren</span>' +
        '<p class="note">Zeigt alle Termine in Apple Kalender, Google Kalender oder TimeTree an. Nur lesen, aktualisiert sich von selbst</p>' +
        '<div class="copy-row"><label class="sr" for="feed">Abo-Link</label><input id="feed" readonly value="' + esc(u) + '"><button class="text-btn" data-act="copy" data-src="feed">Kopieren</button></div>' +
        (ios ? '<a class="btn-line" style="display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--text)" href="' + esc(u.replace(/^https:/, 'webcal:')) + '">In Apple Kalender abonnieren</a>' : '<p class="note">Google Kalender: am Rechner calendar.google.com › Weitere Kalender › Per URL, Link einfügen</p>') + '</div>';
    }
    const install = standalone ? '<p class="note">Läuft bereits als App vom Home-Bildschirm</p>' :
      (ios ? '<ol class="steps"><li>Diese Seite in Safari öffnen</li><li>Unten auf das Teilen-Symbol tippen</li><li>Zum Home-Bildschirm wählen, dann Hinzufügen</li></ol>' :
        '<ol class="steps"><li>Diese Seite in Chrome öffnen</li><li>Oben rechts das Menü öffnen</li><li>Zum Startbildschirm hinzufügen oder App installieren wählen</li></ol>');
    return '<header class="head"><div class="head-row"><h1 class="h1">Zugang</h1></div></header>' +
      '<div class="pad stack" style="padding-top:20px">' +
      '<div class="panel pad-in" style="flex-direction:row;align-items:flex-start;gap:16px">' + (icon ? '<img class="app-icon" src="' + esc(icon) + '" alt="">' : '') +
      '<div class="stack" style="gap:8px;min-width:0"><span class="h2">Auf den Home-Bildschirm</span>' + install + '</div></div>' +
      '<span class="section-label" style="padding-top:12px">Für ' + esc(NAMES.b) + ', ohne Konto</span>' +
      '<div class="panel pad-in">' + share + '</div>' + feed +
      '<span class="section-label" style="padding-top:12px">Dieses Gerät</span>' +
      '<div class="panel">' +
      '<div class="cell"><span>Ich bin</span><div class="seg" style="width:200px"><button data-act="me" data-v="a" aria-pressed="' + (state.me === 'a') + '">' + esc(NAMES.a) + '</button><button data-act="me" data-v="b" aria-pressed="' + (state.me === 'b') + '">' + esc(NAMES.b) + '</button></div></div>' +
      ('setAppBadge' in navigator ? '<div class="cell"><label for="badge">Zahl heutiger Termine am App-Symbol</label><span class="switch"><input id="badge" type="checkbox" data-act="badge"' + (state.badge ? ' checked' : '') + '><i></i></span></div>' : '') +
      '</div>' +
      '<span class="section-label" style="padding-top:12px">Sicherung</span>' +
      '<div class="panel pad-in"><p class="note">Alle Termine als .ics-Datei, z. B. als Sicherung oder für Apple Kalender</p><button class="btn-line" data-act="export">Alle Termine exportieren</button></div>' +
      '</div>';
  }

  /* ---------- Blätter ---------- */
  function sheetHtml() {
    const s = state.sheet;
    if (!s) return '';
    if (s.type === 'editor') return editorHtml(s);
    if (s.type === 'action') {
      return '<div class="scrim" data-act="close"></div><div class="action" role="dialog" aria-modal="true"><div class="action-box"><div class="msg"><b>' + esc(s.title) + '</b>' + (s.text ? '<span>' + esc(s.text) + '</span>' : '') + '</div>' +
        s.options.map((o, i) => '<button data-act="choose" data-i="' + i + '"' + (o.danger ? ' class="danger"' : '') + '>' + esc(o.label) + '</button>').join('') +
        '</div><button class="cancel" data-act="close">Abbrechen</button></div>';
    }
    if (s.type === 'who') {
      return '<div class="scrim"></div><div class="action" role="dialog" aria-modal="true"><div class="action-box"><div class="msg"><b>Wer nutzt dieses Gerät?</b><span>Damit neue Termine richtig vorbelegt sind. Änderbar unter Zugang</span></div>' +
        '<button data-act="setme" data-v="a">' + esc(NAMES.a) + '</button><button data-act="setme" data-v="b">' + esc(NAMES.b) + '</button></div></div>';
    }
    return '';
  }

  function newDraft(date, hour) {
    const d = date ? new Date(date) : new Date(state.selected);
    const h = hour != null ? hour : Math.min(22, new Date().getHours() + 1);
    d.setHours(h, 0, 0, 0);
    return { id: uuid(), title: '', location: '', notes: '', owner: state.me || 'a', allDay: false, start: fmtLocal(d), end: fmtLocal(new Date(d.getTime() + 3600000)), rrule: null, exdates: [], reminder: 60, source: 'app' };
  }
  function openEditor(ev, occDate) {
    const draft = JSON.parse(JSON.stringify(ev));
    if (occDate && ev.rrule) {
      // Bearbeiten startet beim angetippten Termin der Serie
      const { s, dur } = evBounds(ev);
      const st = parseYmd(occDate); st.setHours(s.getHours(), s.getMinutes());
      draft.start = ev.allDay ? ymd(st) : fmtLocal(st);
      const en = new Date(st.getTime() + dur);
      draft.end = ev.allDay ? ymd(addDays(en, -1)) : fmtLocal(en);
    }
    state.sheet = { type: 'editor', draft, original: ev, occDate: ev.rrule ? occDate : null, isNew: false };
    renderSheet();
  }

  function editorHtml(s) {
    const d = s.draft;
    const st = parseLocal(d.start), en = parseLocal(d.end || d.start);
    const r = d.rrule;
    const owner = k => '<button class="owner" data-act="owner" data-v="' + k + '" aria-pressed="' + (d.owner === k) + '"><i class="dot ' + k + '"></i><span>' + esc(NAMES[k]) + '</span></button>';
    const freqUnit = { DAILY: ['Tag', 'Tage'], WEEKLY: ['Woche', 'Wochen'], MONTHLY: ['Monat', 'Monate'], YEARLY: ['Jahr', 'Jahre'] };
    const endMode = r ? (r.until ? 'until' : (r.count ? 'count' : 'never')) : 'never';
    const series = r ? '<div class="panel">' +
      '<div class="cell"><label for="e-freq">Wiederholen</label><select id="e-freq" data-act="rfreq">' +
      [['DAILY', 'Täglich'], ['WEEKLY', 'Wöchentlich'], ['MONTHLY', 'Monatlich'], ['YEARLY', 'Jährlich']].map(([v, l]) => '<option value="' + v + '"' + (r.freq === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
      '<div class="cell"><label for="e-int">Abstand</label><span class="pair">alle <input id="e-int" type="number" min="1" max="99" value="' + (r.interval || 1) + '" data-act="rint"> ' + freqUnit[r.freq][(r.interval || 1) > 1 ? 1 : 0] + '</span></div>' +
      (r.freq === 'WEEKLY' ? '<div class="weekdays" role="group" aria-label="Wochentage">' + WDS.map((w, i) => '<button data-act="rday" data-i="' + i + '" aria-pressed="' + ((r.byday || []).includes(i)) + '" aria-label="' + WDL[i] + '">' + w + '</button>').join('') + '</div>' : '') +
      '<div class="cell"><label for="e-endm">Endet</label><span class="pair"><select id="e-endm" data-act="rendm"><option value="never"' + (endMode === 'never' ? ' selected' : '') + '>Nie</option><option value="until"' + (endMode === 'until' ? ' selected' : '') + '>Am Datum</option><option value="count"' + (endMode === 'count' ? ' selected' : '') + '>Nach Anzahl</option></select>' +
      (endMode === 'until' ? '<label class="sr" for="e-until">Enddatum</label><input id="e-until" type="date" value="' + r.until + '" data-act="runtil">' : '') +
      (endMode === 'count' ? '<label class="sr" for="e-count">Anzahl</label><input id="e-count" type="number" min="1" max="999" value="' + r.count + '" data-act="rcount">' : '') + '</span></div>' +
      '</div><span class="hint" id="e-sum">' + esc(capital(ruleText(r, st)) + (d.allDay ? '' : ' um ' + hm(st)) + ', ab ' + longDay(st) + ' ' + st.getFullYear()) + '</span>' : '';
    const meta = !s.isNew && s.original ? '<p class="hint">Erstellt' + (s.original.createdBy ? ' von ' + esc(NAMES[s.original.createdBy]) : '') +
      (s.original.updatedAt ? ' · zuletzt geändert' + (s.original.updatedBy ? ' von ' + esc(NAMES[s.original.updatedBy]) : '') + ', ' + fmtStamp(s.original.updatedAt) : '') +
      (s.original.source && s.original.source !== 'app' && s.original.source !== 'demo' ? ' · importiert aus ' + esc(s.original.source) : '') + '</p>' : '';
    return '<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="e-title-h">' +
      '<div class="sheet-head"><button data-act="close">Abbrechen</button><span class="title" id="e-title-h">' + (s.isNew ? 'Neuer Termin' : 'Bearbeiten') + '</span><button class="primary" data-act="save">Sichern</button></div>' +
      '<div class="sheet-body">' +
      '<div class="panel"><label class="field"><span class="sr">Titel</span><input id="e-title" placeholder="Titel" value="' + esc(d.title) + '" data-act="f" data-k="title" autocomplete="off"></label>' +
      '<label class="field"><span class="sr">Ort</span><input id="e-loc" placeholder="Ort" value="' + esc(d.location) + '" data-act="f" data-k="location" autocomplete="off"></label></div>' +
      '<div class="stack" style="gap:8px"><span class="section-label">Für wen</span><div class="owners">' + owner('a') + owner('b') + owner('g') + '</div></div>' +
      '<div class="panel">' +
      '<div class="cell"><label for="e-allday">Ganztägig</label><span class="switch"><input id="e-allday" type="checkbox" data-act="allday"' + (d.allDay ? ' checked' : '') + '><i></i></span></div>' +
      '<div class="cell"><span>Beginn</span><span class="pair"><label class="sr" for="e-sd">Beginn Datum</label><input id="e-sd" type="date" value="' + ymd(st) + '" data-act="when">' + (d.allDay ? '' : '<label class="sr" for="e-st">Beginn Uhrzeit</label><input id="e-st" type="time" value="' + hm(st) + '" data-act="when">') + '</span></div>' +
      '<div class="cell"><span>Ende</span><span class="pair"><label class="sr" for="e-ed">Ende Datum</label><input id="e-ed" type="date" value="' + ymd(en) + '" data-act="when">' + (d.allDay ? '' : '<label class="sr" for="e-et">Ende Uhrzeit</label><input id="e-et" type="time" value="' + hm(en) + '" data-act="when">') + '</span></div>' +
      '</div>' +
      '<div class="stack" style="gap:8px"><span class="section-label">Häufigkeit</span><div class="seg"><button data-act="once" aria-pressed="' + !r + '">Einmalig</button><button data-act="series" aria-pressed="' + !!r + '">Serie</button></div>' + series + '</div>' +
      '<div class="panel"><div class="cell"><label for="e-rem">Erinnerung</label><select id="e-rem" data-act="f" data-k="reminder">' +
      [[0, 'Keine'], [10, '10 Min. vorher'], [30, '30 Min. vorher'], [60, '1 Std. vorher'], [1440, '1 Tag vorher']].map(([v, l]) => '<option value="' + v + '"' + (Number(d.reminder) === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
      (d.location ? '<div class="cell"><span>Ort</span><a href="https://maps.apple.com/?q=' + encodeURIComponent(d.location) + '" target="_blank" rel="noopener" style="color:var(--text-2);font-size:15px">In Karten öffnen</a></div>' : '') + '</div>' +
      '<div class="panel"><label class="field"><span class="sr">Notiz</span><textarea id="e-notes" placeholder="Notiz" rows="3" data-act="f" data-k="notes">' + esc(d.notes) + '</textarea></label></div>' +
      meta +
      (!s.isNew ? '<div class="stack" style="gap:8px"><button class="btn-line" data-act="shareone">Als .ics teilen</button><button class="btn-line danger" data-act="del">Termin löschen</button></div>' : '') +
      '</div></div>';
  }
  const capital = t => t.charAt(0).toUpperCase() + t.slice(1);
  function fmtStamp(iso) { const d = new Date(iso); return (ymd(d) === ymd(new Date()) ? 'heute' : longDay(d)) + ' ' + hm(d); }

  function readWhen() {
    const d = state.sheet.draft;
    const v = id => (document.getElementById(id) || {}).value;
    const sd = v('e-sd'), ed = v('e-ed');
    if (!sd) return;
    if (d.allDay) { d.start = sd; d.end = ed && ed >= sd ? ed : sd; }
    else {
      const oldS = parseLocal(d.start), oldE = parseLocal(d.end);
      const ns = parseLocal(sd + 'T' + (v('e-st') || '09:00'));
      let ne = parseLocal((ed || sd) + 'T' + (v('e-et') || '10:00'));
      // Beginn verschoben: Ende mitziehen, damit die Dauer bleibt
      if (ns.getTime() !== oldS.getTime() && ne.getTime() === oldE.getTime()) ne = new Date(ns.getTime() + (oldE - oldS));
      if (ne < ns) ne = new Date(ns.getTime() + 3600000);
      d.start = fmtLocal(ns); d.end = fmtLocal(ne);
    }
  }

  async function commitSave() {
    const s = state.sheet, d = s.draft;
    if (REMOTE && !space) { toast('Erst unter Zugang einen Kalender anlegen oder verbinden'); return; }
    d.title = (d.title || '').trim() || 'Ohne Titel';
    d.reminder = Number(d.reminder) || 0;
    if (d.rrule && d.rrule.freq === 'WEEKLY' && !(d.rrule.byday || []).length) d.rrule.byday = [wd(parseLocal(d.start))];
    if (s.isNew) { await saveEvents([d]); done('Termin gesichert', d); return; }
    if (s.original.rrule && s.occDate) {
      state.sheet = { type: 'action', title: 'Das ist ein Serientermin', text: 'Änderung speichern für', options: [
        { label: 'Nur diesen Termin', run: () => saveScope('this', s) },
        { label: 'Alle zukünftigen Termine', run: () => saveScope('future', s) },
        { label: 'Alle Termine der Serie', run: () => saveScope('all', s) }
      ] };
      renderSheet(); return;
    }
    await saveEvents([d]); done('Termin gesichert', d);
  }
  async function saveScope(scope, s) {
    const orig = JSON.parse(JSON.stringify(s.original)), d = s.draft, occ = s.occDate;
    const startsAtOcc = occ === ymd(parseLocal(orig.start));
    if (scope === 'this') {
      orig.exdates = Array.from(new Set([...(orig.exdates || []), occ]));
      const single = Object.assign({}, d, { id: uuid(), rrule: null, exdates: [], seriesOf: orig.id, createdAt: null });
      await saveEvents([orig, single]);
    } else if (scope === 'future' && !startsAtOcc) {
      orig.rrule = Object.assign({}, orig.rrule, { until: ymd(addDays(parseYmd(occ), -1)), count: null });
      const next = Object.assign({}, d, { id: uuid(), exdates: (d.exdates || []).filter(x => x >= occ), createdAt: null });
      await saveEvents([orig, next]);
    } else {
      // ganze Serie: Verschiebung des angetippten Termins auf den Serienbeginn übertragen
      const occStart = parseYmd(occ); const os = parseLocal(orig.start); occStart.setHours(os.getHours(), os.getMinutes());
      const shift = parseLocal(d.start) - occStart;
      const ns = new Date(os.getTime() + shift), dur = parseLocal(d.end) - parseLocal(d.start);
      const upd = Object.assign({}, d, { id: orig.id, createdAt: orig.createdAt, createdBy: orig.createdBy,
        start: d.allDay ? ymd(ns) : fmtLocal(ns), end: d.allDay ? ymd(new Date(ns.getTime() + dur)) : fmtLocal(new Date(ns.getTime() + dur)) });
      await saveEvents([upd]);
    }
    done('Termin gesichert', d);
  }
  function askDelete() {
    const s = state.sheet, orig = s.original;
    const opts = orig.rrule && s.occDate ? [
      { label: 'Nur diesen Termin löschen', danger: true, run: async () => { const o = JSON.parse(JSON.stringify(orig)); o.exdates = Array.from(new Set([...(o.exdates || []), s.occDate])); await saveEvents([o]); done('Termin gelöscht'); } },
      { label: 'Alle zukünftigen löschen', danger: true, run: async () => {
        if (s.occDate === ymd(parseLocal(orig.start))) { await removeEvent(orig.id); } else { const o = JSON.parse(JSON.stringify(orig)); o.rrule.until = ymd(addDays(parseYmd(s.occDate), -1)); o.rrule.count = null; await saveEvents([o]); }
        done('Termine gelöscht'); } },
      { label: 'Ganze Serie löschen', danger: true, run: async () => { await removeEvent(orig.id); done('Serie gelöscht'); } }
    ] : [{ label: 'Termin löschen', danger: true, run: async () => { await removeEvent(orig.id); done('Termin gelöscht'); } }];
    state.sheet = { type: 'action', title: orig.rrule ? 'Das ist ein Serientermin' : 'Termin löschen?', text: orig.title, options: opts };
    renderSheet();
  }
  function done(msg, ev) {
    state.sheet = null;
    if (ev) { const d = dayStart(parseLocal(ev.start)); if (state.view === 'month') { state.selected = d; state.cursor = d; } }
    render(); toast(msg);
  }

  /* ---------- ICS: Einlesen ---------- */
  function unescapeText(v) { return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }
  function icsDate(val, params) {
    const v = val.trim();
    if (/^\d{8}$/.test(v) || params.VALUE === 'DATE') {
      const s = v.slice(0, 8);
      return { date: new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)), allDay: true };
    }
    const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
    if (!m) return null;
    if (m[7]) return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))), allDay: false };
    return { date: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), allDay: false };
  }
  function icsDuration(v) {
    const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) return 0;
    const ms = ((+m[2] || 0) * 7 * 86400 + (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
    return m[1] === '-' ? -ms : ms;
  }
  const BYDAY = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };
  function parseICS(text, sourceName) {
    const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const events = [], overrides = [];
    let cur = null, inAlarm = false, skipped = 0;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') { cur = { props: {}, exdates: [] }; continue; }
      if (line === 'END:VEVENT') { if (cur) { const ev = toEvent(cur, sourceName); if (ev === null) skipped++; else if (ev.recurrenceId) overrides.push(ev); else events.push(ev); } cur = null; continue; }
      if (!cur) continue;
      if (line === 'BEGIN:VALARM') { inAlarm = true; continue; }
      if (line === 'END:VALARM') { inAlarm = false; continue; }
      const idx = line.indexOf(':'); if (idx < 0) continue;
      const left = line.slice(0, idx), value = line.slice(idx + 1);
      const [name, ...ps] = left.split(';');
      const params = {}; ps.forEach(p => { const [k, v] = p.split('='); params[(k || '').toUpperCase()] = (v || '').replace(/"/g, ''); });
      const N = name.toUpperCase();
      if (inAlarm) { if (N === 'TRIGGER' && !cur.trigger) cur.trigger = value; continue; }
      if (N === 'EXDATE') { value.split(',').forEach(x => { const d = icsDate(x, params); if (d) cur.exdates.push(ymd(d.date)); }); continue; }
      cur.props[N] = { value, params };
    }
    // geänderte Einzeltermine einer Serie: als eigene Termine übernehmen, Original an dem Tag aussparen
    for (const o of overrides) {
      const master = events.find(e => e.uid && e.uid === o.uid);
      if (master) master.exdates.push(o.recurrenceId);
      delete o.recurrenceId; o.rrule = null; o.uid = o.uid ? o.uid + '-' + o.start : null;
      events.push(o);
    }
    return { events, skipped };
  }
  function toEvent(c, sourceName) {
    const P = c.props;
    if (P.STATUS && P.STATUS.value.toUpperCase() === 'CANCELLED') return null;
    if (!P.DTSTART) return null;
    const ds = icsDate(P.DTSTART.value, P.DTSTART.params); if (!ds) return null;
    let endDate;
    if (P.DTEND) { const de = icsDate(P.DTEND.value, P.DTEND.params); endDate = de ? de.date : null; }
    else if (P.DURATION) endDate = new Date(ds.date.getTime() + icsDuration(P.DURATION.value));
    const allDay = ds.allDay;
    let start, end;
    if (allDay) { start = ymd(ds.date); end = endDate ? ymd(addDays(endDate, -1) < ds.date ? ds.date : addDays(endDate, -1)) : start; }
    else { start = fmtLocal(ds.date); end = fmtLocal(endDate && endDate >= ds.date ? endDate : ds.date); }
    let rrule = null;
    if (P.RRULE) {
      const r = {}; P.RRULE.value.split(';').forEach(kv => { const [k, v] = kv.split('='); r[k.toUpperCase()] = v; });
      if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(r.FREQ)) {
        rrule = { freq: r.FREQ, interval: Number(r.INTERVAL) || 1, byday: [], until: null, count: r.COUNT ? Number(r.COUNT) : null };
        if (r.FREQ === 'WEEKLY' && r.BYDAY) rrule.byday = r.BYDAY.split(',').map(x => BYDAY[x.replace(/^[+-]?\d+/, '')]).filter(x => x != null);
        if (r.UNTIL) { const u = icsDate(r.UNTIL, {}); if (u) rrule.until = ymd(u.date); }
      }
    }
    let reminder = 0;
    if (c.trigger) { const ms = icsDuration(c.trigger); if (ms < 0) reminder = Math.round(-ms / 60000); }
    const recurrenceId = P['RECURRENCE-ID'] ? (icsDate(P['RECURRENCE-ID'].value, P['RECURRENCE-ID'].params) || {}).date : null;
    return {
      id: uuid(), uid: P.UID ? P.UID.value : null, title: P.SUMMARY ? unescapeText(P.SUMMARY.value).trim() : 'Ohne Titel',
      location: P.LOCATION ? unescapeText(P.LOCATION.value) : '', notes: P.DESCRIPTION ? unescapeText(P.DESCRIPTION.value).slice(0, 4000) : '',
      owner: 'a', allDay, start, end, rrule, exdates: c.exdates, reminder, source: sourceName,
      recurrenceId: recurrenceId ? ymd(recurrenceId) : undefined
    };
  }
  const dupKey = e => (e.title || '').trim().toLowerCase() + '|' + (e.allDay ? e.start : e.start.slice(0, 16));
  function importPlan() {
    if (!state.imports.length) return null;
    const existing = new Set(state.events.map(dupKey));
    const map = new Map();
    let existingCount = 0, merged = 0;
    for (const f of state.imports) for (const e of f.events) {
      const k = dupKey(e);
      if (existing.has(k)) { existingCount++; continue; }
      const prev = map.get(k);
      if (prev) { if (prev.fileIndex !== f.i && prev.owner !== f.owner) { prev.owner = 'g'; prev.merged = true; merged++; } continue; }
      map.set(k, Object.assign({}, e, { owner: f.owner, fileIndex: f.i }));
    }
    const list = Array.from(map.values());
    const sorted = list.slice().sort((a, b) => (b.merged ? 1 : 0) - (a.merged ? 1 : 0) || (b.rrule ? 1 : 0) - (a.rrule ? 1 : 0));
    const preview = sorted.slice(0, 6).map(e => {
      const st = parseLocal(e.start);
      return { owner: e.owner, title: e.title, tag: e.merged ? 'Zusammengeführt' : (e.rrule ? 'Serie' : 'Einmalig'),
        meta: e.rrule ? capital(ruleText(e.rrule, st)) : longDay(st) + ' ' + st.getFullYear() + (e.allDay ? '' : ', ' + hm(st)) };
    });
    return { list, preview, total: list.length, merged, existing: existingCount };
  }
  async function doImport() {
    const plan = importPlan(); if (!plan || !plan.total) return;
    const evs = plan.list.map(e => { const x = Object.assign({}, e); delete x.fileIndex; delete x.merged; delete x.uid; return x; });
    for (let i = 0; i < evs.length; i += 200) await saveEvents(evs.slice(i, i + 200));
    state.imports = [];
    state.view = 'month'; ls.set('view', 'month');
    render(); toast(evs.length + ' Termine übernommen');
  }

  /* ---------- ICS: Ausgeben ---------- */
  const icsEsc = t => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const icsLocal = s => s.replace(/[-:]/g, '') + (s.length === 16 ? '00' : '');
  function fold(line) { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); }
  const VTZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:MESZ', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:MEZ', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  function toICS(list, name) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Unser Kalender//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + icsEsc(name || CFG.appName || 'Unser Kalender'), 'X-WR-TIMEZONE:Europe/Berlin', ...VTZ];
    const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    for (const e of list) {
      L.push('BEGIN:VEVENT', 'UID:' + e.id + '@unser-kalender', 'DTSTAMP:' + stamp, 'SUMMARY:' + icsEsc((e.owner !== 'g' ? '' : '') + e.title));
      if (e.allDay) { L.push('DTSTART;VALUE=DATE:' + e.start.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + ymd(addDays(parseYmd(e.end || e.start), 1)).replace(/-/g, '')); }
      else { L.push('DTSTART;TZID=Europe/Berlin:' + icsLocal(e.start), 'DTEND;TZID=Europe/Berlin:' + icsLocal(e.end || e.start)); }
      if (e.location) L.push('LOCATION:' + icsEsc(e.location));
      if (e.notes) L.push('DESCRIPTION:' + icsEsc(e.notes));
      L.push('CATEGORIES:' + icsEsc(NAMES[e.owner] || ''));
      if (e.rrule) {
        let r = 'RRULE:FREQ=' + e.rrule.freq + ';INTERVAL=' + (e.rrule.interval || 1);
        if (e.rrule.freq === 'WEEKLY' && e.rrule.byday && e.rrule.byday.length) r += ';BYDAY=' + e.rrule.byday.map(i => DAYS[i]).join(',');
        if (e.rrule.until) r += ';UNTIL=' + e.rrule.until.replace(/-/g, '') + (e.allDay ? '' : 'T235959');
        else if (e.rrule.count) r += ';COUNT=' + e.rrule.count;
        L.push(r);
        for (const x of e.exdates || []) {
          if (e.allDay) L.push('EXDATE;VALUE=DATE:' + x.replace(/-/g, ''));
          else L.push('EXDATE;TZID=Europe/Berlin:' + x.replace(/-/g, '') + 'T' + e.start.slice(11, 16).replace(':', '') + '00');
        }
      }
      if (e.reminder) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), 'TRIGGER:-PT' + e.reminder + 'M', 'END:VALARM');
      L.push('END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  async function offerFile(name, text, viaShare) {
    if (DEMO_ONLY) { toast('Export geht in der eingerichteten App, nicht in dieser Vorschau'); return; }
    const file = new File([text], name, { type: 'text/calendar' });
    if (viaShare && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- Kleinkram ---------- */
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2600);
  }
  function updateBadge() {
    if (!('setAppBadge' in navigator)) return;
    try {
      if (!state.badge) { navigator.clearAppBadge(); return; }
      const n = inRange(today, addDays(today, 1)).length;
      if (n) navigator.setAppBadge(n); else navigator.clearAppBadge();
    } catch (e) { /* nicht unterstützt */ }
  }
  async function copyFrom(id) {
    const el = document.getElementById(id); if (!el) return;
    try { await navigator.clipboard.writeText(el.value); toast('Kopiert'); }
    catch (e) { el.focus(); el.select(); toast('Markiert, jetzt kopieren'); }
  }

  /* ---------- Bedienung ---------- */
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const act = t.dataset.act, s = state.sheet;
    switch (act) {
      case 'tab': setView(t.dataset.v === 'month' ? (state.view === 'week' ? 'week' : ls.get('calView', 'month')) : t.dataset.v); break;
      case 'cal': ls.set('calView', t.dataset.v); setView(t.dataset.v); break;
      case 'mprev': state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1); render(); break;
      case 'mnext': state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1); render(); break;
      case 'wprev': state.cursor = addDays(state.cursor, -7); render(); break;
      case 'wnext': state.cursor = addDays(state.cursor, 7); render(); break;
      case 'today': state.cursor = today; state.selected = today; render(); break;
      case 'pick': state.selected = parseYmd(t.dataset.date); if (state.selected.getMonth() !== state.cursor.getMonth()) state.cursor = state.selected; render(); break;
      case 'pickweek': state.selected = parseYmd(t.dataset.date); state.cursor = state.selected; ls.set('calView', 'month'); setView('month'); break;
      case 'slot': {
        if (e.target !== t) break;
        const rect = t.getBoundingClientRect(), hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / 44)));
        state.sheet = { type: 'editor', draft: newDraft(parseYmd(t.dataset.date), hour), isNew: true }; renderSheet(); break;
      }
      case 'new': state.sheet = { type: 'editor', draft: newDraft(), isNew: true }; renderSheet(); setTimeout(() => { const i = document.getElementById('e-title'); if (i) i.focus(); }, 60); break;
      case 'open': { const ev = state.events.find(x => x.id === t.dataset.id); if (ev) openEditor(ev, t.dataset.date); break; }
      case 'who': state.who = t.dataset.v; render(); break;
      case 'kind': state.kind = t.dataset.v; render(); break;
      case 'close': state.sheet = null; renderSheet(); break;
      case 'owner': s.draft.owner = t.dataset.v; renderSheet(); break;
      case 'once': readWhen(); s.draft.rrule = null; renderSheet(); break;
      case 'series': readWhen(); s.draft.rrule = s.draft.rrule || { freq: 'WEEKLY', interval: 1, byday: [wd(parseLocal(s.draft.start))], until: null, count: null }; renderSheet(); break;
      case 'rday': {
        readWhen();
        const i = Number(t.dataset.i), b = new Set(s.draft.rrule.byday || []);
        if (b.has(i)) { if (b.size > 1) b.delete(i); } else b.add(i);
        s.draft.rrule.byday = Array.from(b).sort(); renderSheet(); break;
      }
      case 'save': readWhen(); await commitSave(); break;
      case 'del': askDelete(); break;
      case 'choose': { const o = s.options[Number(t.dataset.i)]; if (o) await o.run(); break; }
      case 'shareone': readWhen(); await offerFile((s.draft.title || 'termin').replace(/[^\wäöüÄÖÜß -]/g, '').trim() + '.ics', toICS([s.draft]), true); break;
      case 'export': await offerFile('unser-kalender.ics', toICS(state.events)); break;
      case 'rmfile': state.imports = state.imports.filter(f => f.i !== Number(t.dataset.i)); render(); break;
      case 'doimport': t.disabled = true; await doImport(); break;
      case 'me': case 'setme': state.me = t.dataset.v; ls.set('me', state.me); state.sheet = null; render(); break;
      case 'copy': await copyFrom(t.dataset.src); break;
      case 'shareinv': try { await navigator.share({ title: CFG.appName || 'Unser Kalender', text: 'Unser gemeinsamer Kalender', url: accessUrl() }); } catch (err) { /* abgebrochen */ } break;
      case 'newspace': space = randKey(); ls.set('space', space); await load(); render(); toast('Kalender angelegt'); break;
      case 'join': {
        const v = (document.getElementById('join') || {}).value || '';
        const m = v.match(/k=([A-Za-z0-9_-]{24,64})/) || v.trim().match(/^([A-Za-z0-9_-]{24,64})$/);
        if (!m) { toast('Das ist kein gültiger Einladungslink'); break; }
        space = m[1]; ls.set('space', space); await load(); render(); toast('Verbunden'); break;
      }
    }
  });
  document.addEventListener('input', e => {
    const t = e.target; const s = state.sheet;
    if (!s || s.type !== 'editor') return;
    const act = t.dataset.act;
    if (act === 'f') s.draft[t.dataset.k] = t.value;
    if (act === 'rint') { s.draft.rrule.interval = Math.max(1, Number(t.value) || 1); }
    if (act === 'rcount') { s.draft.rrule.count = Math.max(1, Number(t.value) || 1); }
    if (act === 'runtil' && t.value) { s.draft.rrule.until = t.value; }
    if (act === 'when' && t.type !== 'date') readWhen();
    if (['rint', 'rcount', 'runtil', 'when'].includes(act)) {
      const sum = document.getElementById('e-sum');
      if (sum && s.draft.rrule) { const st = parseLocal(s.draft.start); sum.textContent = capital(ruleText(s.draft.rrule, st)) + (s.draft.allDay ? '' : ' um ' + hm(st)) + ', ab ' + longDay(st) + ' ' + st.getFullYear(); }
    }
  });
  document.addEventListener('change', async e => {
    const t = e.target, act = t.dataset.act, s = state.sheet;
    if (act === 'file') {
      for (const f of Array.from(t.files || [])) {
        try {
          const text = await f.text();
          const isTT = /timetree/i.test(f.name) || /timetree/i.test(text.slice(0, 400));
          const src = isTT ? 'TimeTree' : 'Apple Kalender';
          const { events, skipped } = parseICS(text, src);
          const i = (state.imports.reduce((m, x) => Math.max(m, x.i), -1)) + 1;
          state.imports.push({ i, name: f.name, events, skipped, owner: isTT ? 'b' : (state.imports.some(x => x.owner === 'a') ? 'b' : 'a') });
        } catch (err) { toast(f.name + ' ließ sich nicht lesen'); }
      }
      render(); return;
    }
    if (act === 'fowner') { const f = state.imports.find(x => x.i === Number(t.dataset.i)); if (f) f.owner = t.value; render(); return; }
    if (act === 'badge') { state.badge = t.checked; ls.set('badge', state.badge); updateBadge(); return; }
    if (!s || s.type !== 'editor') return;
    if (act === 'f') s.draft[t.dataset.k] = t.value;
    if (act === 'when') { readWhen(); renderSheet(); }
    if (act === 'allday') {
      readWhen(); const st = parseLocal(s.draft.start), en = parseLocal(s.draft.end);
      s.draft.allDay = t.checked;
      if (t.checked) { s.draft.start = ymd(st); s.draft.end = ymd(en < st ? st : en); }
      else { st.setHours(9, 0); s.draft.start = fmtLocal(st); const e2 = parseYmd(ymd(en)); e2.setHours(10, 0); s.draft.end = fmtLocal(e2 < st ? new Date(st.getTime() + 3600000) : e2); }
      renderSheet();
    }
    if (act === 'rfreq') { readWhen(); s.draft.rrule.freq = t.value; if (t.value === 'WEEKLY' && !(s.draft.rrule.byday || []).length) s.draft.rrule.byday = [wd(parseLocal(s.draft.start))]; renderSheet(); }
    if (act === 'rendm') {
      readWhen(); const r = s.draft.rrule;
      if (t.value === 'never') { r.until = null; r.count = null; }
      if (t.value === 'until') { r.count = null; r.until = r.until || ymd(addMonths(dayStart(parseLocal(s.draft.start)), 3) || addDays(parseLocal(s.draft.start), 90)); }
      if (t.value === 'count') { r.until = null; r.count = r.count || 10; }
      renderSheet();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.sheet && state.sheet.type !== 'who') { state.sheet = null; renderSheet(); } });

  /* ---------- Start ---------- */
  initSpace();
  (async () => {
    await load();
    if (!state.me && !DEMO_ONLY) state.sheet = { type: 'who' };
    if (DEMO_ONLY && !state.me) state.me = 'a';
    render();
    if (REMOTE) {
      setInterval(async () => { if (document.visibilityState === 'visible' && !state.sheet && space) { await load(); render(); } }, 30000);
      document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && space && !state.sheet) { await load(); render(); } });
    }
  })();
})();
