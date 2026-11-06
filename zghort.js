/* Згортані розділи сайту kz.com.ua.
   Розділ вмикається атрибутом data-zghort на <section>; усередині має бути один контейнер,
   перший дочірній елемент якого — шапка з <h2>. Усе, що йде після шапки, ховається.
   data-zghort-count="<селектор>" — що рахувати для лічильника на кнопці (необов'язково).
   data-zghort="open" — розділ відкритий від початку.
   Без JavaScript (або якщо файл не завантажився) усі розділи просто відкриті. */
(function () {
  var root = document.documentElement;
  root.classList.add('zg-js');

  function sectionFor(hash) {
    if (!hash || hash.length < 2) return null;
    var secs = document.querySelectorAll('section[data-zghort]');
    for (var i = 0; i < secs.length; i++) {
      var id = secs[i].id;
      if (id && (hash === '#' + id || hash.indexOf('#' + id + '-') === 0)) return secs[i];
    }
    return null;
  }

  function setOpen(sec, open) {
    sec.classList.toggle('zg-open', open);
    var b = sec.querySelector('.zg-btn');
    if (!b) return;
    b.setAttribute('aria-expanded', String(open));
    b.querySelector('.zg-txt').textContent = open ? 'Згорнути' : 'Розгорнути';
  }

  function init() {
    var secs = Array.prototype.slice.call(document.querySelectorAll('section[data-zghort]'));
    secs.forEach(function (sec) {
      var box = sec.firstElementChild;
      if (!box) return;
      var head = box.firstElementChild;
      var h2 = head && (head.tagName === 'H2' ? head : head.querySelector('h2'));
      if (!h2) return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zg-btn';
      btn.innerHTML = '<span class="zg-txt">Розгорнути</span>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
      var sel = sec.getAttribute('data-zghort-count');
      if (sel) {
        var n = 0;
        for (var c = head.nextElementSibling; c; c = c.nextElementSibling) n += c.matches(sel) ? 1 : c.querySelectorAll(sel).length;
        if (n) btn.insertAdjacentHTML('beforeend', '<b class="zg-n">' + n + '</b>');
      }
      btn.setAttribute('aria-label', 'Розгорнути або згорнути розділ «' + h2.textContent.trim() + '»');

      var title = document.createElement('div');
      title.className = 'zg-title';
      h2.parentNode.insertBefore(title, h2);
      title.appendChild(h2);
      title.appendChild(btn);

      btn.addEventListener('click', function () { setOpen(sec, !sec.classList.contains('zg-open')); });
      h2.addEventListener('click', function () { setOpen(sec, !sec.classList.contains('zg-open')); });
      setOpen(sec, sec.getAttribute('data-zghort') === 'open');
    });

    // «Розгорнути все / Згорнути все»
    Array.prototype.forEach.call(document.querySelectorAll('[data-zghort-all]'), function (b) {
      b.addEventListener('click', function () {
        var anyClosed = secs.some(function (s) { return !s.classList.contains('zg-open'); });
        secs.forEach(function (s) { setOpen(s, anyClosed); });
        b.textContent = anyClosed ? 'Згорнути все' : 'Розгорнути все';
      });
    });

    // Посилання на розділ (меню, кнопки, #ihry-mpp тощо) розгортають його
    function openFromHash(scroll) {
      var s = sectionFor(location.hash);
      if (s && !s.classList.contains('zg-open')) {
        setOpen(s, true);
        if (scroll) s.scrollIntoView();
      }
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var s = sectionFor(a.getAttribute('href'));
      if (s) setOpen(s, true);
    }, true);
    window.addEventListener('hashchange', function () { openFromHash(false); });
    openFromHash(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
