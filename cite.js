/* Кнопка «Цитувати» на сторінці «Наукові праці».
   Дані беруться з розмітки самої публікації (автори, назва, журнал, рік, випуск, сторінки, DOI), окремого файлу не потрібно.
   Поки що працює для розділу «Статті». Формати: ДСТУ 8302:2015 та APA 7. OSCOLA і BibTeX можна додати пізніше. */
(function () {
  var LAT = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia' };
  var LAT0 = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
  var CYR = /[Ѐ-ӿ]/;

  /* Транслітерація за постановою КМУ № 55 (2010). */
  function translit(s) {
    var out = '';
    s = s.replace(/зг/gi, function (m) { return m[0] === 'З' ? 'Zgh' : 'zgh'; });
    for (var i = 0; i < s.length; i++) {
      var ch = s[i], low = ch.toLowerCase(), prev = i ? s[i - 1] : ' ';
      if (low === "'" || low === '’' || low === 'ʼ') continue;
      var startsWord = !/[Ѐ-ӿA-Za-z'’ʼ]/.test(prev);
      var rep = (startsWord && LAT0[low] != null) ? LAT0[low] : LAT[low];
      if (rep == null) { out += ch; continue; }
      if (ch !== low && rep) rep = rep[0].toUpperCase() + rep.slice(1);
      out += rep;
    }
    return out;
  }
  function clean(s) { return (s || '').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function end(s) { s = clean(s); return /[.?!]$/.test(s) ? s : s + '.'; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* "Невара Л. М." -> { sur: "Невара", ini: ["Л.", "М."] } */
  function parseAuthor(a) {
    a = clean(a);
    var p = a.split(' ');
    var sur = p.shift();
    var ini = p.join('').replace(/\./g, '').split('').filter(Boolean).map(function (x) { return x + '.'; });
    return { sur: sur, ini: ini };
  }
  function splitAuthors(txt) {
    txt = clean(txt);
    if (!txt) return [{ sur: 'Звєрєва', ini: ['К.', 'С.'] }];
    return txt.split(/,\s*/).filter(Boolean).map(parseAuthor);
  }

  function read(li) {
    var title = clean((li.querySelector('.pub-title') || {}).textContent);
    var src = li.querySelector('.pub-source');
    var jEl = src && src.querySelector('i');
    if (!title || !src || !jEl) return null;
    var journal = clean(jEl.textContent).replace(/\.$/, '');
    var full = clean(src.textContent);
    var rest = clean(full.slice(full.indexOf(jEl.textContent.trim()) + jEl.textContent.trim().length).replace(/^[\s.]+/, '')).replace(/\.$/, '');
    var year = (/^(\d{4})/.exec(rest) || [])[1] || clean((li.querySelector('.pub-year') || {}).textContent);
    var doiEl = li.querySelector('.pub-doi');
    var authEl = li.querySelector('.pub-authors');
    return {
      title: title, journal: journal, rest: rest, year: year,
      doi: doiEl ? clean(doiEl.textContent) : '',
      authors: splitAuthors(authEl ? authEl.textContent : '')
    };
  }

  function dstu(r) {
    var ua = CYR.test(r.title);
    var au = r.authors;
    var head, title = end(r.title);
    function one(a) { return a.sur + ' ' + a.ini.join(' '); }
    function rev(a) { return a.ini.join(' ') + ' ' + a.sur; }
    if (au.length <= 3) { head = au.map(one).join(', ') + ' '; }
    else { head = ''; title = r.title.replace(/[.?!]$/, '') + ' / ' + rev(au[0]) + (ua ? ' та ін.' : ' et al.') + ' '; }
    var s = head + title + ' ' + end(r.journal) + ' ' + end(r.rest);
    if (r.doi) s += ' DOI: https://doi.org/' + r.doi;
    return clean(s);
  }

  function parseRest(rest) {
    var pages = (/(?:С|P)\.\s*(\d+\s*[–-]\s*\d+|\d+)/.exec(rest) || [])[1];
    var vol = (/(?:Vol\.|Т\.)\s*(\d+)/.exec(rest) || [])[1];
    var iss = (/(?:№|No\.|Вип\.)\s*(\d+)/.exec(rest) || [])[1];
    return { pages: pages ? pages.replace(/\s*-\s*/, '–').replace(/\s/g, '') : '', vol: vol || '', iss: iss || '' };
  }

  /* Повертає { html, text } з курсивом для оригіналу на екрані. */
  function apa(r) {
    var p = parseRest(r.rest), ua = CYR.test(r.title);
    function a1(a) { var s = ua ? translit(a.sur) : a.sur; return s + ', ' + a.ini.map(function (x) { return ua && CYR.test(x) ? translit(x) : x; }).join(' '); }
    var au = r.authors.map(a1);
    var names;
    if (au.length === 1) names = au[0];
    else if (au.length === 2) names = au[0] + ', & ' + au[1];
    else if (au.length <= 20) names = au.slice(0, -1).join(', ') + ', & ' + au[au.length - 1];
    else names = au.slice(0, 19).join(', ') + ', … ' + au[au.length - 1];
    var title = ua ? translit(r.title) + ' [in Ukrainian]' : r.title;
    var jr = CYR.test(r.journal) ? translit(r.journal) : r.journal;
    var vi = p.vol ? p.vol + (p.iss ? '(' + p.iss + ')' : '') : (p.iss ? '(' + p.iss + ')' : '');
    var tail = [vi, p.pages].filter(Boolean).join(', ');
    var url = r.doi ? ' https://doi.org/' + r.doi : '';
    var head = end(names) + ' (' + r.year + '). ' + end(title) + ' ';
    var text = head + jr + (tail ? ', ' + tail : '') + '.' + url;
    var html = esc(head) + '<i>' + esc(jr) + (p.vol ? ', ' + esc(p.vol) + '</i>' + (p.iss ? '(' + esc(p.iss) + ')' : '') : '</i>' + (p.iss ? ', (' + esc(p.iss) + ')' : '')) + (p.pages ? ', ' + esc(p.pages) : '') + '.' + esc(url);
    return { text: clean(text), html: html };
  }

  var dlg, outEl, titleEl, state = { r: null, fmt: 'dstu' };

  function render() {
    var res = state.fmt === 'dstu' ? { text: dstu(state.r), html: esc(dstu(state.r)) } : apa(state.r);
    outEl.innerHTML = res.html;
    outEl.dataset.text = res.text;
    dlg.querySelector('.ct-note').textContent = state.fmt === 'dstu'
      ? 'ДСТУ 8302:2015. Перед поданням звірте з вимогами вашого видання.'
      : 'APA 7. Українські назви транслітеровано за правилами КМУ (2010); англомовний переклад назви в дужках додайте за потреби.';
    dlg.querySelectorAll('.ct-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === state.fmt)); });
    dlg.querySelector('.ct-ok').textContent = '';
  }
  function copy() {
    var t = outEl.dataset.text || '', ok = dlg.querySelector('.ct-ok');
    function done() { ok.textContent = 'Скопійовано'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { ok.textContent = 'Виділіть текст і скопіюйте вручну'; }
      document.body.removeChild(ta);
    }
  }
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'ct-dlg';
    dlg.setAttribute('aria-label', 'Цитувати працю');
    dlg.innerHTML = '<div class="ct-in"><h2>Цитувати</h2><p class="ct-title"></p>' +
      '<div class="ct-tabs"><button type="button" data-f="dstu">ДСТУ 8302:2015</button><button type="button" data-f="apa">APA 7</button></div>' +
      '<p class="ct-out"></p><p class="ct-note"></p>' +
      '<div class="ct-row"><span><button type="button" class="ct-copy">Копіювати</button> <span class="ct-ok" role="status"></span></span><button type="button" class="ct-close">Закрити</button></div></div>';
    document.body.appendChild(dlg);
    outEl = dlg.querySelector('.ct-out'); titleEl = dlg.querySelector('.ct-title');
    dlg.querySelectorAll('.ct-tabs button').forEach(function (b) { b.addEventListener('click', function () { state.fmt = b.dataset.f; render(); }); });
    dlg.querySelector('.ct-copy').addEventListener('click', copy);
    dlg.querySelector('.ct-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  function open(r) {
    if (!dlg) build();
    state.r = r; titleEl.textContent = r.title;
    render();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  function init() {
    var items = document.querySelectorAll('#statti li.pub');
    items.forEach(function (li) {
      var links = li.querySelector('.pub-links');
      var r = read(li);
      if (!links || !r) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pub-btn pub-btn--cite'; b.textContent = 'Цитувати';
      b.addEventListener('click', function () { open(r); });
      links.appendChild(b);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
