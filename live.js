// Daily price check: shows today's price, ▼/▲ vs the price the card was built with (and vs yesterday), and 품절.
(function () {
  var CSS = '.lv{display:inline-block;font-size:10.5px;font-weight:700;border-radius:5px;padding:1px 5px;margin-left:4px;vertical-align:1px}' +
    '.lv.dn{color:#fff;background:#2f7a4f}.lv.up{color:#fff;background:#a23b3b}.lv.so{color:#fff;background:#555}.lv.lo{color:#2f7a4f;border:1px solid #2f7a4f}' +
    '.lvstamp{font-size:10.5px;color:var(--muted,#5d6577)}';
  function won(n) { return (n || 0).toLocaleString('ko-KR'); }
  function pidOf(s) { var a = s.querySelector('a.go') || s.querySelector('a[href*="/products/"]'); var m = a && a.href.match(/products\/(\d+)/); return m ? m[1] : ''; }
  function apply(d) {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    window.spLive = d;
    document.querySelectorAll('section.item').forEach(function (s) {
      var it = d.items[pidOf(s)]; if (!it) return;
      var b = s.querySelector('.meta b'); if (!b || b.dataset.lv) return;
      var orig = +b.textContent.replace(/[^\d]/g, '') || 0;
      b.dataset.lv = '1'; b.dataset.orig = orig;
      var badge = '';
      if (it.so) badge += '<span class="lv so">품절</span>';
      if (it.p && orig && it.p !== orig) { b.textContent = won(it.p) + '원'; badge += it.p < orig ? '<span class="lv dn">▼' + won(orig - it.p) + '</span>' : '<span class="lv up">▲' + won(it.p - orig) + '</span>'; }
      else if (it.prev && it.p && it.prev !== it.p) badge += it.p < it.prev ? '<span class="lv dn">어제보다 ▼' + won(it.prev - it.p) + '</span>' : '<span class="lv up">어제보다 ▲' + won(it.p - it.prev) + '</span>';
      if (it.low && it.p && it.p <= it.low && (it.prev && it.prev > it.p)) badge += '<span class="lv lo">최저가</span>';
      if (badge) b.insertAdjacentHTML('afterend', badge);
    });
    var h = document.querySelector('header h1');
    if (h && !document.querySelector('.lvstamp')) h.insertAdjacentHTML('afterend', '<span class="lvstamp">가격 ' + d.updated.slice(5).replace('-', '.') + ' 기준</span>');
    dispatchEvent(new Event('spstate'));
  }
  function go() {
    fetch('data/live.json?t=' + Math.floor(Date.now() / 600000)).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.items) setTimeout(function () { apply(d); }, 50); }).catch(function () {});
  }
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
