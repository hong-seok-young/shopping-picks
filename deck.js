// One-product-per-screen viewer for phones / the installed app: swipe left-right between products.
// Reads the page's own cards (section.item), so it works on every list page; tools proxy to the card's own buttons.
(function () {
  var PAGE = location.pathname.split('/').pop() || 'index.html';
  var PREF = 'sp:deck';
  function pref() { try { return localStorage.getItem(PREF); } catch (e) { return null; } }
  function setPref(v) { try { localStorage.setItem(PREF, v); } catch (e) {} }
  function wantDeck() {
    var p = pref();
    if (p === 'off') return false;
    if (p === 'on') return true;
    return matchMedia('(max-width: 760px)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  var CSS = '' +
    '.dk{position:fixed;inset:0;z-index:40;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;font-family:var(--body,system-ui,sans-serif)}' +
    '.dk[hidden]{display:none}' +
    '.dk-top{display:flex;align-items:center;gap:6px;padding:max(3px,env(safe-area-inset-top)) 10px 2px;font-size:12px}' +
    '.dk-top a,.dk-top button{flex:none;font:inherit;font-weight:700;color:var(--accent);background:none;border:0;padding:5px 2px;text-decoration:none;cursor:pointer}' +
    '.dk-top .t{flex:1;min-width:0;font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}' +
    '.dk-top .n{flex:none;font-family:var(--mono,monospace);color:var(--muted);font-size:11px}' +
    '.dk-chips{display:flex;gap:4px;overflow-x:auto;padding:1px 10px 4px;scrollbar-width:none}.dk-chips::-webkit-scrollbar{display:none}' +
    '.dk-chips button{flex:none;font:inherit;font-size:11px;font-weight:700;color:var(--accent);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:2px 8px;cursor:pointer}' +
    '.dk-chips button[aria-pressed="true"]{background:var(--accent);color:var(--surface);border-color:var(--accent)}' +
    '.dk-chips button.st[aria-pressed="true"]{background:#d49a00;border-color:#d49a00}' +
    '.dk-track{flex:1;min-height:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;scrollbar-width:none}.dk-track::-webkit-scrollbar{display:none}' +
    '.dk-s{flex:0 0 100%;width:100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always;overflow-y:auto;overscroll-behavior-y:contain;padding:0 10px max(10px,env(safe-area-inset-bottom));box-sizing:border-box;display:flex;flex-direction:column;gap:4px}' +
    '.dk-s>*{flex:none}' +
    '.dk-empty{margin:auto;color:var(--muted);font-size:13px;text-align:center;padding:40px 20px}' +
    '.dk-h{margin:0;font:700 14px/1.3 var(--display,system-ui,sans-serif);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.dk-h .rk{font-family:var(--mono,monospace);color:var(--accent);margin-right:4px}.dk-h .br{font-weight:500;color:var(--muted);font-size:11px;margin-right:4px}' +
    '.dk-h .tag{font-size:9.5px;font-weight:700;border:1px solid var(--line);border-radius:4px;padding:0 4px;margin-left:3px;vertical-align:1px;color:var(--muted)}.dk-h .tag.risk{color:var(--bad,#a23b3b);border-color:currentColor}.dk-h .tag.good{color:var(--good,#2f7a4f);border-color:currentColor}' +
    '.dk-m{display:flex;flex-wrap:wrap;align-items:center;gap:2px 7px;font-size:11px;color:var(--muted)}.dk-m b{color:var(--fg);font-size:13.5px}' +
    '.dk-m .r{margin-left:auto;display:flex;gap:3px;align-items:center}' +
    '.dk-m .go{font-weight:700;font-size:11px;color:var(--surface);background:var(--accent);border-radius:6px;padding:4px 8px;text-decoration:none}' +
    '.dk-tools button{font:inherit;font-size:12px;line-height:1;cursor:pointer;background:var(--surface);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:4px 6px;min-width:26px}' +
    '.dk-tools button[aria-pressed="true"]{color:var(--accent);border-color:var(--accent)}.dk-tools button.star[aria-pressed="true"]{color:#d49a00;border-color:#d49a00}' +
    '.dk-memo{width:100%;box-sizing:border-box;font:inherit;font-size:12px;padding:4px 7px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg);resize:none}' +
    '.dk-sp{display:grid;grid-template-columns:repeat(auto-fit,minmax(48px,1fr));gap:2px}' +
    '.dk-sp div{background:var(--surface);border:1px solid var(--line);border-radius:5px;padding:2px 4px;min-width:0}' +
    '.dk-sp span{display:block;font-size:8.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.dk-sp b{display:block;font-size:11.5px;line-height:1.2;word-break:keep-all;overflow-wrap:anywhere}.dk-sp .ok b{color:var(--good,#2f7a4f)}.dk-sp .warn b,.dk-sp .bad b{color:var(--bad,#a23b3b)}' +
    '.dk-v{font-size:10.5px;line-height:1.4;background:var(--surface);border-left:3px solid var(--good,#2f7a4f);border-radius:5px;padding:3px 6px}' +
    '.dk-ph{display:flex;gap:3px;overflow-x:auto;scroll-snap-type:x proximity;flex:none;scrollbar-width:none}.dk-ph::-webkit-scrollbar{display:none}' +
    '.dk-ph button{flex:0 0 24%;position:relative;padding:0;border:0;border-radius:6px;overflow:hidden;background:var(--line);cursor:zoom-in;scroll-snap-align:start;aspect-ratio:3/4;max-height:22vh}' +
    '.dk-ph img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.dk-ph span{position:absolute;left:0;right:0;bottom:0;font-size:8.5px;font-weight:700;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.7));padding:8px 3px 1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.dk-ph span.close{color:#8ff0b4}' +
    '.dk-rs{font-size:10.5px;line-height:1.4;color:var(--fg);background:var(--accent-soft,var(--soft,#e1e6f2));border-radius:5px;padding:3px 6px;margin:0}' +
    '.dk-rv{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}' +
    '.dk-rv li{font-size:11px;line-height:1.4;background:var(--surface);border:1px solid var(--line);border-radius:5px;padding:3px 6px}' +
    '.dk-rv li>*{margin-right:4px}.dk-rv li b,.dk-rv li .hw{font-family:var(--mono,monospace);color:var(--accent);font-weight:700;font-size:10.5px}.dk-rv li .opt{color:var(--muted);font-size:10px}' +
    '.dk-open{position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:30;font:inherit;font-size:12px;font-weight:700;color:var(--surface);background:var(--accent);border:0;border-radius:999px;padding:8px 13px;box-shadow:0 4px 14px rgba(0,0,0,.2);cursor:pointer}' +
    '.lb{z-index:60!important}' +
    '@media (max-width:760px){body{font-size:13px!important;line-height:1.45!important;padding-top:14px!important}h1{font-size:19px!important;margin:4px 0!important}' +
    'section.item{gap:6px!important;padding-top:12px!important}section.item h2{font-size:14.5px!important;line-height:1.3!important}' +
    '.meta{font-size:11.5px!important;gap:2px 8px!important}.verdict{font-size:11.5px!important;padding:5px 8px!important;line-height:1.4!important}' +
    '.specs{gap:3px!important}.spec{padding:3px 6px!important}.spec span{font-size:9.5px!important}.spec b{font-size:12.5px!important}' +
    '.gal img{width:96px!important;height:128px!important}.gal button{width:96px!important}.gal span{font-size:9.5px!important}.galhead{font-size:10.5px!important}' +
    '.revsum{font-size:11px!important;padding:5px 8px!important}ul.rev li{font-size:11.5px!important;padding:4px 7px!important;line-height:1.4!important}' +
    'a.go{font-size:12px!important;padding:6px 10px!important}h3.tier{font-size:13px!important;margin:10px 0 0!important}.funnel .f{font-size:11px!important;padding:3px 8px!important}.funnel .f b{font-size:13px!important}.funnel{gap:4px!important;margin:2px 0!important}.wrap{gap:8px!important}.catnav{gap:4px!important;padding:4px 0!important}.catnav button,.ubar button{font-size:11px!important;padding:2px 8px!important}a.back{font-size:12px!important}header{margin:0!important}section.item .head{gap:6px!important}.itools button{padding:2px 5px!important;font-size:11px!important}}';

  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function init() {
    var all = [].slice.call(document.querySelectorAll('section.item'));
    if (!all.length) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    // groups from the page's own type headers (original DOM order = 종류별)
    var groups = [], cur = null;
    [].forEach.call(document.querySelectorAll('h3.tier, section.item'), function (e) {
      if (e.matches('h3.tier')) { cur = { name: txt(e).replace(/\s*·\s*\d+\s*개\s*$/, '').replace(/\s*\([^)]*\)\s*$/, ''), items: [] }; groups.push(cur); }
      else if (cur) cur.items.push(e);
    });
    var filter = { g: -1, star: false };
    var list = [], idx = 0;

    var dk = document.createElement('div'); dk.className = 'dk'; dk.hidden = true;
    var title = (document.querySelector('h1') ? txt(document.querySelector('h1')) : document.title);
    dk.innerHTML = '<div class="dk-top"><a href="./">← 목록</a><div class="t"></div><span class="n"></span><button type="button" class="ls">전체 보기</button></div>' +
      '<div class="dk-chips"></div><div class="dk-track" tabindex="0" aria-label="상품 넘겨 보기"></div>';
    dk.querySelector('.t').textContent = title;
    document.body.appendChild(dk);
    var track = dk.querySelector('.dk-track'), chips = dk.querySelector('.dk-chips'), num = dk.querySelector('.n');

    var openBtn = document.createElement('button'); openBtn.type = 'button'; openBtn.className = 'dk-open'; openBtn.textContent = '한 개씩 보기';
    document.body.appendChild(openBtn);
    addEventListener('spstate', function () { if (!dk.hidden) rebuild(idx); });

    // chips
    function chip(label, on, fn, cls) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls;
      b.setAttribute('aria-pressed', String(on)); b.onclick = fn; chips.appendChild(b); return b;
    }
    function drawChips() {
      chips.replaceChildren();
      chip('★', filter.star, function () { filter.star = !filter.star; rebuild(0); }, 'st');
      chip('전체', filter.g < 0, function () { filter.g = -1; rebuild(0); });
      if (groups.length > 1) groups.forEach(function (g, i) { chip(g.name, filter.g === i, function () { filter.g = i; rebuild(0); }); });
      var on = chips.querySelector('[aria-pressed="true"]:not(.st)'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    function visible(s) { return !s.classList.contains('is-del') && !s.classList.contains('is-low') && (!filter.star || s.classList.contains('is-star')); }
    function source() {
      if (filter.g >= 0) return groups[filter.g].items;
      return all.filter(function (s) { return !s.dataset.dup; });
    }

    function slideHTML(s) {
      var h = document.createElement('div');
      var brand = txt(s.querySelector('.brand'));
      var rk = s.querySelector('.rank'); var name = '';
      var h2 = s.querySelector('h2');
      if (h2) { var c = h2.cloneNode(true); c.querySelectorAll('.rank,.tag,.itools').forEach(function (e) { e.remove(); }); name = c.textContent.trim(); }
      var tags = [].map.call(s.querySelectorAll('h2 .tag'), function (t) { return t.outerHTML; }).join('');
      var go = s.querySelector('a.go'); var href = go ? go.href : '#';
      var meta = [].map.call(s.querySelectorAll('.meta > span'), function (m) { return m.innerHTML; });
      var out = '<h2 class="dk-h"><span class="rk">' + (rk ? txt(rk) : '') + '</span><span class="br">' + esc(brand) + '</span>' + esc(name) + tags + '</h2>' +
        '<div class="dk-m">' + meta.map(function (m) { return '<span>' + m.replace('비슷한 체형 후기', '비슷') + '</span>'; }).join('') +
        '<span class="r dk-tools"><button type="button" data-t="star" class="star" aria-label="별표">★</button><button type="button" data-t="memo" aria-label="메모">✎</button><button type="button" data-t="low" aria-label="후순위로">↓</button><button type="button" data-t="del" aria-label="삭제">✕</button>' +
        '<a class="go" href="' + href + '" target="_blank" rel="noopener">무신사</a></span></div>' +
        '<textarea class="dk-memo" rows="1" placeholder="메모" hidden></textarea>';
      var specs = s.querySelectorAll('.spec');
      if (specs.length) out += '<div class="dk-sp">' + [].map.call(specs, function (p) {
        return '<div class="' + esc(p.className.replace('spec', '').trim()) + '"><span>' + esc(txt(p.querySelector('span'))) + '</span><b>' + esc(txt(p.querySelector('b'))) + '</b></div>';
      }).join('') + '</div>';
      var gb = s.querySelectorAll('.gal button');
      if (gb.length) out += '<div class="dk-ph">' + [].map.call(gb, function (b, i) {
        var im = b.querySelector('img'), sp = b.querySelector('span');
        return '<button type="button" data-i="' + i + '"><img src="' + (im ? im.getAttribute('src') : '') + '" alt="' + esc(im ? im.alt : '') + '" loading="lazy">' + (sp ? '<span class="' + esc(sp.className) + '">' + esc(txt(sp)) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      var v = s.querySelector('.verdict'); if (v) out += '<div class="dk-v">' + v.innerHTML + '</div>';
      var rs = s.querySelector('.revsum'); if (rs) out += '<p class="dk-rs">' + esc(txt(rs)) + '</p>';
      var lis = s.querySelectorAll('ul.rev > li');
      if (lis.length) out += window.spRevGroup ? window.spRevGroup(lis) : '<ul class="dk-rv">' + [].map.call(lis, function (li) { return '<li>' + li.innerHTML + '</li>'; }).join('') + '</ul>';
      return out;
    }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function syncTools(slide, s) {
      var src = s.querySelector('.itools');
      var memo = s.querySelector('.imemo');
      slide.querySelector('[data-t="star"]').setAttribute('aria-pressed', String(s.classList.contains('is-star')));
      var dm = slide.querySelector('.dk-memo');
      var mv = memo ? memo.value : '';
      slide.querySelector('[data-t="memo"]').setAttribute('aria-pressed', String(!!mv.trim()));
      if (document.activeElement !== dm) dm.value = mv;
      if (mv.trim()) dm.hidden = false;
      return src;
    }

    function fill(i) {
      var slide = track.children[i]; if (!slide || slide.dataset.on) return;
      var s = list[i]; slide.dataset.on = '1'; slide.innerHTML = slideHTML(s);
      if (s.querySelector('.gal') && !s.querySelector('.gal button')) setTimeout(function () { if (s.querySelector('.gal button') && list[i] === s) { drain(i); fill(i); } }, 1500);
      syncTools(slide, s);
      slide.querySelector('.dk-tools').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return; var t = b.dataset.t;
        var dm = slide.querySelector('.dk-memo');
        if (t === 'memo') { dm.hidden = false; dm.focus(); return; }
        var sb = s.querySelector('.itools button[data-t="' + t + '"]'); if (sb) sb.click();
        if (t === 'low' || t === 'del') { var keep = idx; rebuild(Math.min(keep, list.length - 2)); return; }
        syncTools(slide, s);
      });
      slide.querySelector('.dk-memo').addEventListener('input', function () {
        var memo = s.querySelector('.imemo'); if (!memo) return;
        memo.value = this.value; memo.dispatchEvent(new Event('input'));
        slide.querySelector('[data-t="memo"]').setAttribute('aria-pressed', String(!!this.value.trim()));
      });
      var ph = slide.querySelector('.dk-ph');
      if (ph) ph.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var sb = s.querySelectorAll('.gal button')[+b.dataset.i]; if (sb) sb.click();
      });
    }
    function drain(i) { var slide = track.children[i]; if (slide && slide.dataset.on) { slide.innerHTML = ''; delete slide.dataset.on; } }

    function around() {
      for (var j = 0; j < list.length; j++) { if (Math.abs(j - idx) <= 2) fill(j); else if (Math.abs(j - idx) > 6) drain(j); }
      num.textContent = list.length ? (idx + 1) + '/' + list.length : '0';
      try { sessionStorage.setItem('sp:deckpos:' + PAGE, JSON.stringify({ g: filter.g, star: filter.star, k: list[idx] ? keyOf(list[idx]) : '' })); } catch (e) {}
    }
    function keyOf(s) { var a = s.querySelector('a.go'); var m = a && a.href.match(/products\/(\d+)/); return m ? m[1] : ''; }

    function rebuild(at) {
      list = source().filter(visible);
      track.replaceChildren();
      if (!list.length) {
        var e = document.createElement('div'); e.className = 'dk-empty'; e.textContent = filter.star ? '별표한 상품이 없어요.' : '여기에는 상품이 없어요.'; track.appendChild(e);
      }
      list.forEach(function () { var d = document.createElement('div'); d.className = 'dk-s'; track.appendChild(d); });
      idx = Math.max(0, Math.min(at || 0, list.length - 1));
      drawChips();
      track.scrollLeft = idx * track.clientWidth;
      around();
    }

    var raf = 0;
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = setTimeout(function () {
        raf = 0; var w = track.clientWidth || 1; var n = Math.round(track.scrollLeft / w);
        if (n !== idx) { idx = n; around(); }
      }, 60);
    }, { passive: true });
    addEventListener('resize', function () { if (!dk.hidden) track.scrollLeft = idx * track.clientWidth; });
    document.addEventListener('keydown', function (e) {
      if (dk.hidden || /TEXTAREA|INPUT/.test((document.activeElement || {}).tagName || '')) return;
      if (document.querySelector('.lb.on')) return;
      if (e.key === 'ArrowRight' && idx < list.length - 1) { track.scrollTo({ left: (idx + 1) * track.clientWidth, behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft' && idx > 0) { track.scrollTo({ left: (idx - 1) * track.clientWidth, behavior: 'smooth' }); }
    });

    function open() {
      dk.hidden = false; openBtn.hidden = true; document.documentElement.style.overflow = 'hidden';
      var at = 0;
      try {
        var p = JSON.parse(sessionStorage.getItem('sp:deckpos:' + PAGE) || 'null');
        if (p) { filter.g = p.g < groups.length ? p.g : -1; filter.star = !!p.star; var l = source().filter(visible); var k = l.findIndex(function (s) { return keyOf(s) === p.k; }); at = k < 0 ? 0 : k; }
      } catch (e) {}
      rebuild(at);
    }
    function close() { dk.hidden = true; openBtn.hidden = false; document.documentElement.style.overflow = ''; }
    // switching views is one step of history: back returns to the view you came from
    var switched = 0;
    function swap(to) {
      if (switched > 0 && window.spOverlayClosed) { switched--; window.spOverlayClosed(); }
      else if (window.spOverlay) { switched++; window.spOverlay(function () { switched--; to === 'list' ? open() : close(); }); }
      to === 'list' ? close() : open();
    }
    dk.querySelector('.ls').onclick = function () { setPref('off'); swap('list'); };
    openBtn.onclick = function () { setPref('on'); swap('deck'); };
    if (wantDeck()) open(); else close();
  }

  // run after the page's own load-time scripts (type nav, tools) have built the cards
  function go() { setTimeout(init, 60); }
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
