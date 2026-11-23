// Per-person accounts: each person's ★ / memo / ↓ / ✕ are kept apart (local namespace) and, once a server is set,
// synced encrypted (AES-GCM, key from the password) so only that person can read them.
// Runs in <head> (not deferred) so the namespace exists before the page's tools read their state.
(function () {
  var USERS = { '홍석영': '10a714bab3e7bf46d319d57577de489da226bdc474b2a21e39b3200b8e88788b', '홍준영': '813ad0655d26ee7522594c2246e7de55d744527c398334d49d9f68237f2d1834' };
  // Firebase Realtime Database URL, e.g. 'https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app'. Empty = this device only.
  var DB = 'https://shopping-picks-190-default-rtdb.asia-southeast1.firebasedatabase.app';
  var ITER = 200000;
  // passwords are compared as 2-beolsik key strokes, so typing with the Korean or English keyboard both work
  var CHO='r R s e E f a q Q t T d w W c z x v g'.split(' ');
  var JUNG='k o i O j p u P h hk ho hl y n nj np nl b m ml l'.split(' ');
  var JONG=['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'];
  var COMPAT={'ㄱ':'r','ㄲ':'R','ㄳ':'rt','ㄴ':'s','ㄵ':'sw','ㄶ':'sg','ㄷ':'e','ㄸ':'E','ㄹ':'f','ㄺ':'fr','ㄻ':'fa','ㄼ':'fq','ㄽ':'ft','ㄾ':'fx','ㄿ':'fv','ㅀ':'fg','ㅁ':'a','ㅂ':'q','ㅃ':'Q','ㅄ':'qt','ㅅ':'t','ㅆ':'T','ㅇ':'d','ㅈ':'w','ㅉ':'W','ㅊ':'c','ㅋ':'z','ㅌ':'x','ㅍ':'v','ㅎ':'g','ㅏ':'k','ㅐ':'o','ㅑ':'i','ㅒ':'O','ㅓ':'j','ㅔ':'p','ㅕ':'u','ㅖ':'P','ㅗ':'h','ㅘ':'hk','ㅙ':'ho','ㅚ':'hl','ㅛ':'y','ㅜ':'n','ㅝ':'nj','ㅞ':'np','ㅟ':'nl','ㅠ':'b','ㅡ':'m','ㅢ':'ml','ㅣ':'l'};
  function kb(s){var o='';for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c>=0xAC00&&c<=0xD7A3){c-=0xAC00;o+=CHO[Math.floor(c/588)]+JUNG[Math.floor(c%588/28)]+JONG[c%28];}else o+=COMPAT[s[i]]||s[i];}return o.trim();}

  var enc = new TextEncoder(), dec = new TextDecoder();
  function hex(buf) { return [].map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function b64(buf) { var s = ''; new Uint8Array(buf).forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function pbkdf2(pw, salt, bits) {
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: ITER, hash: 'SHA-256' }, k, bits);
    });
  }

  var auth = null;
  try { auth = JSON.parse(localStorage.getItem('sp:auth') || 'null'); } catch (e) {}
  window.spUser = auth && auth.name || '';
  // no login, no content: hide the whole page until someone logs in
  if (!auth) {
    document.documentElement.classList.add('sp-locked');
    var lk = document.createElement('style');
    lk.textContent = 'html.sp-locked body>*:not(.splg){visibility:hidden!important}html.sp-locked .splg{background:var(--bg,#eef0f3)!important}';
    document.head.appendChild(lk);
    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (window.spShowLogin) window.spShowLogin(); }, 0); });
  }

  window.spUserNS = auth ? auth.name + ':' : '';

  // ---- server sync ----
  var keyP = null;
  function aesKey() {
    if (!keyP) keyP = crypto.subtle.importKey('raw', unb64(auth.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return keyP;
  }
  function collect() {
    var pre = 'sp:' + window.spUserNS, out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf(pre) === 0 && /(^|:)(star|low|del|memo|cart)$/.test(k.slice(pre.length))) out[k.slice(pre.length)] = localStorage.getItem(k);
    }
    return out;
  }
  function apply(data) {
    var pre = 'sp:' + window.spUserNS, changed = false;
    Object.keys(data || {}).forEach(function (k) {
      if (localStorage.getItem(pre + k) !== data[k]) { localStorage.setItem(pre + k, data[k]); changed = true; }
    });
    return changed;
  }
  function url() { return DB.replace(/\/$/, '') + '/sp/' + auth.path + '.json'; }
  // never push before this device has pulled once: otherwise an empty phone could overwrite the server copy
  var pulled = false;
  function pull() {
    if (!DB || !auth) return Promise.resolve(false);
    return fetch(url()).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (o) {
      pulled = true;
      if (!o || !o.iv) return false;
      return aesKey().then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, k, unb64(o.ct)); })
        .then(function (pt) { var d = JSON.parse(dec.decode(pt)); window.spSyncAt = d.t || 0; return apply(d.data); });
    }).catch(function () { badge('err'); return false; });
  }
  var timer = 0;
  function push() {
    if (!DB || !auth) return;
    if (!pulled) { pull().then(function (changed) { if (pulled) { if (changed && window.spToolsReload) window.spToolsReload(); push(); } }); return; }
    var body = { t: Date.now(), data: collect() };
    var iv = crypto.getRandomValues(new Uint8Array(12));
    aesKey().then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(JSON.stringify(body))); })
      .then(function (ct) { return fetch(url(), { method: 'PUT', body: JSON.stringify({ iv: b64(iv), ct: b64(ct) }) }); })
      .then(function (r) { badge(r && r.ok ? 'ok' : 'err'); }).catch(function () { badge('err'); });
  }
  window.spSyncChanged = function () { if (!DB || !auth) return; badge('wait'); clearTimeout(timer); timer = setTimeout(push, 1200); };

  // ---- login ----
  function login(name, raw) {
    var tries = [kb(raw)]; if (tries[0].toLowerCase() !== tries[0]) tries.push(tries[0].toLowerCase());
    var pw;
    function check(i) {
      if (i >= tries.length) return Promise.reject(new Error('bad'));
      return pbkdf2(tries[i], 'sp-v1-verify:' + name, 256).then(function (v) { if (hex(v) === USERS[name]) { pw = tries[i]; return; } return check(i + 1); });
    }
    return check(0).then(function () {
      return Promise.all([pbkdf2(pw, 'sp-v1-key:' + name, 256), pbkdf2(pw, 'sp-v1-path:' + name, 128)]);
    }).then(function (r) {
      var a = { name: name, key: b64(r[0]), path: hex(r[1]) };
      // first person to log in on this phone keeps what was saved before accounts existed
      var had = false;
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('sp:' + name + ':') === 0) { had = true; break; } }
      if (!had && !localStorage.getItem('sp:migrated')) {
        var moves = [];
        for (var j = 0; j < localStorage.length; j++) {
          var kk = localStorage.key(j), m = kk.match(/^sp:([^:]+\.html):(star|low|del|memo)$/);
          if (m) moves.push([kk, 'sp:' + name + ':' + m[1] + ':' + m[2]]);
        }
        moves.forEach(function (x) { localStorage.setItem(x[1], localStorage.getItem(x[0])); });
        localStorage.setItem('sp:migrated', '1');
      }
      localStorage.setItem('sp:auth', JSON.stringify(a));
    });
  }

  var CSS = '.spu{position:fixed;top:max(6px,env(safe-area-inset-top));right:8px;z-index:45;font:700 11px/1 var(--body,system-ui,sans-serif);color:var(--accent,#2e3f6e);background:var(--surface,#fff);border:1px solid var(--line,#d6dae2);border-radius:999px;padding:5px 9px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.08)}' +
    '.spu i{font-style:normal;margin-left:4px}.spu i.wait{color:#d49a00}.spu i.ok{color:var(--good,#2f7a4f)}.spu i.err{color:var(--bad,#a23b3b)}' +
    '.dk .spu{position:static;box-shadow:none;padding:3px 7px}' +
    '.splg{position:fixed;inset:0;z-index:10002;background:rgba(10,12,18,.55);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.splg form{background:var(--surface,#fff);color:var(--fg,#1b2030);border-radius:14px;padding:18px;width:100%;max-width:330px;display:flex;flex-direction:column;gap:10px;font:14px/1.4 var(--body,system-ui,sans-serif)}' +
    '.splg h3{margin:0;font-size:16px}.splg .who{display:flex;gap:6px}.splg .who button{flex:1;font:inherit;font-weight:700;padding:9px;border-radius:9px;border:1px solid var(--line,#d6dae2);background:var(--bg,#eef0f3);color:var(--fg,#1b2030);cursor:pointer}' +
    '.splg .who button[aria-pressed="true"]{background:var(--accent,#2e3f6e);color:var(--surface,#fff);border-color:var(--accent,#2e3f6e)}' +
    '.splg input{font:inherit;padding:9px 10px;border-radius:9px;border:1px solid var(--line,#d6dae2);background:var(--bg,#eef0f3);color:var(--fg,#1b2030)}' +
    '.splg .go{font:inherit;font-weight:700;padding:10px;border-radius:9px;border:0;background:var(--accent,#2e3f6e);color:var(--surface,#fff);cursor:pointer}' +
    '.splg .skip{font:inherit;font-size:12px;background:none;border:0;color:var(--muted,#5d6577);cursor:pointer}.splg .msg{color:var(--bad,#a23b3b);font-size:12px;min-height:1em;margin:0}';
  var badgeEl = null, badgeState = '';
  function badge(s) { badgeState = s || badgeState; if (!badgeEl) return; var i = badgeEl.querySelector('i'); if (i) { i.className = badgeState; i.textContent = !DB ? '' : badgeState === 'ok' ? '✓' : badgeState === 'wait' ? '…' : badgeState === 'err' ? '!' : ''; } }
  function showLogin() {
    if (document.querySelector('.splg')) return;
    var bg = document.createElement('div'); bg.className = 'splg';
    var names = Object.keys(USERS), pick = window.spUser || names[0];
    bg.innerHTML = '<form><h3>누구세요?</h3><div class="who">' + names.map(function (n) { return '<button type="button" data-n="' + n + '" aria-pressed="' + (n === pick) + '">' + n + '</button>'; }).join('') + '</div>' +
      '<input type="password" placeholder="비밀번호" autocomplete="current-password" required><p class="msg"></p><button class="go" type="submit">로그인</button>' +
      '</form>';
    document.body.appendChild(bg);
    var form = bg.querySelector('form'), pw = bg.querySelector('input'), msg = bg.querySelector('.msg');
    bg.querySelectorAll('.who button').forEach(function (b) { b.onclick = function () { pick = b.dataset.n; bg.querySelectorAll('.who button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); pw.focus(); }; });
    form.onsubmit = function (e) {
      e.preventDefault(); msg.textContent = '확인 중…';
      login(pick, pw.value).then(function () { location.reload(); }).catch(function () { msg.textContent = '비밀번호가 맞지 않아요.'; pw.select(); });
    };
    setTimeout(function () { pw.focus(); }, 50);
  }
  window.spShowLogin = showLogin;
  function mountBadge() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    badgeEl = document.createElement('button'); badgeEl.type = 'button'; badgeEl.className = 'spu';
    badgeEl.innerHTML = (window.spUser ? window.spUser : '로그인') + '<i></i>';
    badgeEl.onclick = function () {
      if (window.spUser && confirm(window.spUser + ' 로그아웃할까요?')) { localStorage.removeItem('sp:auth'); location.reload(); }
      else if (!window.spUser) showLogin();
    };
    var top = document.querySelector('.dk-top');
    if (top) top.insertBefore(badgeEl, top.querySelector('.ls')); else document.body.appendChild(badgeEl);
    badge();
    if (!window.spUser) showLogin(); // login is required; it stays until the person logs out
  }
  function ready(fn) { if (document.readyState === 'complete') fn(); else addEventListener('load', fn); }
  ready(function () {
    setTimeout(mountBadge, 120); // after deck.js builds its top bar
    if (window.spUser && DB) { badge('wait'); pull().then(function (changed) { badge('ok'); if (changed) { if (window.spToolsReload) window.spToolsReload(); else dispatchEvent(new Event('spstate')); dispatchEvent(new Event('spcart')); } }); }
  });
})();
