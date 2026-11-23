// Site cart (per logged-in person, synced with the rest of their data). It never touches the Musinsa cart.
(function () {
  function key() { return 'sp:' + (window.spUserNS || '') + 'cart'; }
  function load() { try { return JSON.parse(localStorage.getItem(key()) || '{}'); } catch (e) { return {}; } }
  function save(c) {
    try { localStorage.setItem(key(), JSON.stringify(c)); } catch (e) {}
    if (window.spSyncChanged) window.spSyncChanged();
    dispatchEvent(new Event('spcart'));
  }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function pidOf(s) { var a = s.querySelector('a.go') || s.querySelector('a[href*="/products/"]'); var m = a && a.href.match(/products\/(\d+)/); return m ? m[1] : ''; }
  function info(s) {
    var h2 = s.querySelector('h2'), name = '';
    if (h2) { var c = h2.cloneNode(true); c.querySelectorAll('.rank,.tag,.itools').forEach(function (e) { e.remove(); }); name = c.textContent.trim(); }
    var price = 0, pb = s.querySelector('.meta b'); if (pb) price = +pb.textContent.replace(/[^\d]/g, '') || 0;
    var size = '';
    s.querySelectorAll('.spec').forEach(function (p) { if (txt(p.querySelector('span')) === '사이즈') size = txt(p.querySelector('b')); });
    var img = s.querySelector('.gal img');
    var page = location.pathname.split('/').pop() || 'index.html';
    var h1 = document.querySelector('h1');
    return { id: pidOf(s), name: name, brand: txt(s.querySelector('.brand')), price: price, size: size, img: img ? img.getAttribute('src') : '', page: page, cat: h1 ? txt(h1) : document.title, t: Date.now() };
  }
  window.spCart = {
    load: load,
    has: function (pid) { return !!load()[pid]; },
    toggle: function (s) { var c = load(), it = info(s); if (!it.id) return; if (c[it.id]) delete c[it.id]; else c[it.id] = it; save(c); },
    remove: function (pid) { var c = load(); delete c[pid]; save(c); }
  };

  function paint() {
    var c = load();
    document.querySelectorAll('.itools button[data-t="cart"]').forEach(function (b) {
      var s = b.closest('section.item'); b.setAttribute('aria-pressed', String(!!(s && c[pidOf(s)])));
    });
  }
  function inject() {
    var st = document.createElement('style');
    st.textContent = '.itools button[data-t="cart"][aria-pressed="true"]{color:#fff!important;background:var(--accent);border-color:var(--accent)}';
    document.head.appendChild(st);
    document.querySelectorAll('section.item h2 .itools').forEach(function (t) {
      if (t.querySelector('[data-t="cart"]')) return;
      var b = document.createElement('button'); b.type = 'button'; b.dataset.t = 'cart'; b.textContent = '🛒'; b.title = '장바구니'; b.setAttribute('aria-label', '장바구니');
      b.addEventListener('click', function (e) { e.stopPropagation(); var s = b.closest('section.item'); if (s) window.spCart.toggle(s); });
      t.insertBefore(b, t.firstChild);
    });
    paint();
  }
  addEventListener('spcart', paint);
  function go() { setTimeout(inject, 40); }
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
