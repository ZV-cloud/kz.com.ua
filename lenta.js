/* Стрічки сайту kz.com.ua: «Новини», «Кабінет студента» і блок останніх новин на головній.
   Дані беруться з data/novyny.json і data/kabinet.json. Щоб додати запис, достатньо дописати об'єкт у відповідний файл.
   Текст з JSON вставляється лише як textContent, посилання приймаються тільки http/https. */
(function () {
  var MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var TOPICS = { mpp: 'Міжнародне публічне право', mtep: 'Торговельне право', mzpl: 'Права людини', mtp: 'Транспортне право', kosmos: 'Космічне право', ukr: 'Україна' };
  var TYPES = { konferentsiia: 'Конференції', konkurs: 'Конкурси', mut: 'Мут-корти', stypendiia: 'Стипендії', stazhuvannia: 'Стажування', shkola: 'Літні школи' };
  var TYPE1 = { konferentsiia: 'Конференція', konkurs: 'Конкурс', mut: 'Мут-корт', stypendiia: 'Стипендія', stazhuvannia: 'Стажування', shkola: 'Літня школа' };
  var LEVELS = { students: 'Студентам', phd: 'Магістрам і аспірантам', all: 'Для всіх' };
  var FORMATS = { online: 'Онлайн', offline: 'Офлайн', hybrid: 'Гібридно' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function safeUrl(u) {
    try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch (e) { return null; }
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function fmtDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function daysTo(d) { return Math.round((d - today()) / 86400000); }
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  function load(url, cb) {
    fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { cb(Array.isArray(j) ? j : null); }).catch(function () { cb(null); });
  }
  function srcLink(url, label) {
    var h = safeUrl(url);
    if (!h) return null;
    var a = el('a', 'ln-src', label);
    a.href = h; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function pills(box, defs, counts, current, onPick) {
    box.textContent = '';
    defs.forEach(function (d) {
      var b = el('button', null, d[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(current === d[0]));
      if (counts[d[0]] != null) { b.appendChild(el('span', 'ln-n', String(counts[d[0]]))); }
      b.addEventListener('click', function () { onPick(d[0]); });
      box.appendChild(b);
    });
  }

  /* ---------- Новини ---------- */
  function newsItem(n) {
    var li = el('li', 'ln-item');
    var d = parseDate(n.date);
    li.appendChild(el('span', 'ln-date', d ? fmtDate(d) : ''));
    var body = el('div', 'ln-body');
    body.appendChild(el('span', 'ln-tag', TOPICS[n.topic] || 'Новини'));
    body.appendChild(el('h3', 'ln-title', n.title));
    body.appendChild(el('p', 'ln-sum', n.summary));
    var a = srcLink(n.source, 'Першоджерело: ' + (n.sourceName || 'відкрити') + ' ↗');
    if (a) body.appendChild(a);
    li.appendChild(body);
    return li;
  }

  function initNews(app) {
    var PAGE = 20, shown = PAGE, topic = 'all', q = '';
    var tools = el('div', 'ln-tools'), pillBox = el('div', 'ln-pills'), row = el('div', 'ln-row');
    var search = el('input', 'ln-search'); search.type = 'search'; search.placeholder = 'Пошук у новинах'; search.setAttribute('aria-label', 'Пошук у новинах');
    var count = el('span', 'ln-count');
    row.appendChild(search); row.appendChild(count);
    tools.appendChild(pillBox); tools.appendChild(row);
    var list = el('ol', 'ln-list'), empty = el('p', 'ln-empty'), more = el('button', 'ln-more', 'Показати ще');
    more.type = 'button';
    app.textContent = '';
    app.appendChild(tools); app.appendChild(list); app.appendChild(empty); app.appendChild(more);

    load('data/novyny.json', function (all) {
      if (!all) { tools.hidden = true; list.hidden = true; more.hidden = true; empty.textContent = 'Не вдалося завантажити новини. Спробуйте оновити сторінку.'; return; }
      all = all.filter(function (n) { return n && n.title && n.summary && safeUrl(n.source) && parseDate(n.date); })
        .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      var upd = document.getElementById('novyny-updated');
      if (upd && all.length) upd.textContent = 'Остання новина: ' + fmtDate(parseDate(all[0].date)) + ' · усього ' + all.length;

      function render() {
        var counts = { all: all.length };
        all.forEach(function (n) { counts[n.topic] = (counts[n.topic] || 0) + 1; });
        var defs = [['all', 'Усі']];
        Object.keys(TOPICS).forEach(function (k) { if (counts[k]) defs.push([k, TOPICS[k]]); });
        pills(pillBox, defs, counts, topic, function (k) { topic = k; shown = PAGE; render(); });
        var term = q.trim().toLowerCase();
        var f = all.filter(function (n) {
          if (topic !== 'all' && n.topic !== topic) return false;
          return !term || (n.title + ' ' + n.summary + ' ' + (n.sourceName || '')).toLowerCase().indexOf(term) !== -1;
        });
        list.textContent = '';
        f.slice(0, shown).forEach(function (n) { list.appendChild(newsItem(n)); });
        count.textContent = f.length + ' ' + plural(f.length, 'новина', 'новини', 'новин');
        list.hidden = !f.length;
        empty.hidden = !!f.length;
        empty.textContent = 'Нічого не знайдено. Спробуйте інший запит чи тему.';
        more.hidden = f.length <= shown;
      }
      search.addEventListener('input', function () { q = search.value; shown = PAGE; render(); });
      more.addEventListener('click', function () { shown += PAGE; render(); });
      render();
    });
  }

  /* ---------- Останні новини на головній ---------- */
  function initHomeNews(app) {
    var limit = +app.getAttribute('data-limit') || 4;
    load('data/novyny.json', function (all) {
      if (!all) { var s = app.closest('section'); if (s) s.hidden = true; return; }
      all = all.filter(function (n) { return n && n.title && n.summary && safeUrl(n.source) && parseDate(n.date); })
        .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      if (!all.length) { var s2 = app.closest('section'); if (s2) s2.hidden = true; return; }
      var ol = el('ol', 'ln-list');
      all.slice(0, limit).forEach(function (n) { ol.appendChild(newsItem(n)); });
      app.textContent = '';
      app.appendChild(ol);
    });
  }

  /* ---------- Кабінет студента ---------- */
  function deadlineBadge(deadline, label) {
    if (!deadline) return null;
    var n = daysTo(deadline);
    if (n < 0) return el('span', 'ln-badge ln-badge--gray', 'Минуло');
    if (n === 0) return el('span', 'ln-badge ln-badge--warn', label + ': сьогодні');
    var t = label + ': ' + fmtDate(deadline) + ' · ' + n + ' ' + plural(n, 'день', 'дні', 'днів');
    return el('span', n <= 14 ? 'ln-badge ln-badge--warn' : n <= 45 ? 'ln-badge ln-badge--soon' : 'ln-badge', t);
  }
  function fact(label, value) {
    if (!value) return null;
    var li = el('li');
    var b = el('b', null, label + ': ');
    li.appendChild(b);
    li.appendChild(document.createTextNode(value));
    return li;
  }
  function card(o) {
    var d = parseDate(o.deadline);
    var c = el('article', 'ln-card' + (d && daysTo(d) < 0 ? ' is-past' : ''));
    var badges = el('div', 'ln-badges');
    badges.appendChild(el('span', 'ln-badge', TYPE1[o.type] || 'Можливість'));
    var db = deadlineBadge(d, o.deadlineLabel || 'Дедлайн');
    if (db) badges.appendChild(db);
    else badges.appendChild(el('span', 'ln-badge ln-badge--gray', 'Дату уточнюйте'));
    if (o.free === true) badges.appendChild(el('span', 'ln-badge', 'Безкоштовно'));
    c.appendChild(badges);
    c.appendChild(el('h3', null, o.title));
    if (o.summary) c.appendChild(el('p', 'ln-sum', o.summary));
    var ul = el('ul', 'ln-facts');
    [fact('Організатор', o.organizer), fact('Коли', o.dates), fact('Де', [FORMATS[o.format], o.where].filter(Boolean).join(', ')),
      fact('Мова', o.lang), fact('Для кого', LEVELS[o.level])].forEach(function (x) { if (x) ul.appendChild(x); });
    c.appendChild(ul);
    if (o.note) c.appendChild(el('p', 'ln-note', o.note));
    var a = srcLink(o.source, 'Офіційна сторінка ↗');
    if (a) c.appendChild(a);
    return c;
  }

  function initCabinet(app) {
    var type = 'all', level = 'all', q = '', showPast = false;
    var tools = el('div', 'ln-tools'), pillBox = el('div', 'ln-pills'), row = el('div', 'ln-row');
    var search = el('input', 'ln-search'); search.type = 'search'; search.placeholder = 'Пошук: назва, організатор, місто'; search.setAttribute('aria-label', 'Пошук');
    var sel = el('select', 'ln-select'); sel.setAttribute('aria-label', 'Для кого');
    [['all', 'Усі рівні'], ['students', 'Студентам'], ['phd', 'Магістрам і аспірантам']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
    var lab = el('label', 'ln-check'), chk = el('input'); chk.type = 'checkbox';
    lab.appendChild(chk); lab.appendChild(document.createTextNode('Показати минулі'));
    var count = el('span', 'ln-count');
    [search, sel, lab, count].forEach(function (x) { row.appendChild(x); });
    tools.appendChild(pillBox); tools.appendChild(row);
    var grid = el('div', 'ln-grid'), empty = el('p', 'ln-empty');
    app.textContent = '';
    app.appendChild(tools); app.appendChild(grid); app.appendChild(empty);

    load('data/kabinet.json', function (all) {
      if (!all) { tools.hidden = true; grid.hidden = true; empty.textContent = 'Не вдалося завантажити добірку. Спробуйте оновити сторінку.'; return; }
      all = all.filter(function (o) { return o && o.title && safeUrl(o.source); });
      function key(o) { var d = parseDate(o.deadline); return d ? d.getTime() : 9e15; }
      all.sort(function (a, b) { return key(a) - key(b); });
      var upd = document.getElementById('kabinet-updated');
      if (upd) upd.textContent = 'У добірці ' + all.length + ' ' + plural(all.length, 'можливість', 'можливості', 'можливостей');

      function isPast(o) { var d = parseDate(o.deadline); return d && daysTo(d) < 0; }
      function render() {
        var base = all.filter(function (o) { return showPast || !isPast(o); });
        var counts = { all: base.length };
        base.forEach(function (o) { counts[o.type] = (counts[o.type] || 0) + 1; });
        var defs = [['all', 'Усе']];
        Object.keys(TYPES).forEach(function (k) { if (counts[k]) defs.push([k, TYPES[k]]); });
        pills(pillBox, defs, counts, type, function (k) { type = k; render(); });
        var term = q.trim().toLowerCase();
        var f = base.filter(function (o) {
          if (type !== 'all' && o.type !== type) return false;
          if (level !== 'all' && o.level !== level && o.level !== 'all') return false;
          return !term || [o.title, o.organizer, o.where, o.summary].join(' ').toLowerCase().indexOf(term) !== -1;
        });
        grid.textContent = '';
        f.forEach(function (o) { grid.appendChild(card(o)); });
        count.textContent = f.length + ' ' + plural(f.length, 'пропозиція', 'пропозиції', 'пропозицій');
        grid.hidden = !f.length;
        empty.hidden = !!f.length;
        empty.textContent = 'За цими умовами нічого немає. Змініть фільтри або перегляньте інші розділи.';
      }
      search.addEventListener('input', function () { q = search.value; render(); });
      sel.addEventListener('change', function () { level = sel.value; render(); });
      chk.addEventListener('change', function () { showPast = chk.checked; render(); });
      render();
    });
  }

  function boot() {
    var a;
    if ((a = document.getElementById('novyny-app'))) initNews(a);
    if ((a = document.getElementById('kabinet-app'))) initCabinet(a);
    if ((a = document.getElementById('novyny-latest'))) initHomeNews(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
