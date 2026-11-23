// install-to-home-screen: native prompt when the browser offers it, otherwise a step-by-step sheet per browser
(function () {
  var deferred = null;
  // catch the native install event as early as possible (script runs in <head>, not deferred)
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ready(function () { banner(true); }); });
  addEventListener('appinstalled', function () { deferred = null; close(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});

  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var KEY = 'sp:pwa:hide';
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var kakao = /KAKAOTALK/i.test(ua);
  var inapp = kakao || /NAVER\(|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND\//i.test(ua);
  var samsung = /SamsungBrowser/i.test(ua);
  var iosSafari = ios && !/CriOS|FxiOS|EdgiOS|Whale/i.test(ua) && !inapp;

  function ready(fn) { if (document.body) fn(); else addEventListener('DOMContentLoaded', fn); }
  var css = '.pwa{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:9999;background:var(--surface,#fff);color:var(--fg,#1b2030);border:1px solid var(--line,#d6dae2);border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:12px 12px 12px 14px;display:flex;gap:12px;align-items:center;font:14px/1.45 var(--body,system-ui,sans-serif)}' +
    '.pwa img{width:44px;height:44px;border-radius:10px;flex:none}.pwa .t{flex:1;min-width:0}.pwa .t b{display:block;font-size:15px}.pwa .s{color:var(--muted,#5d6577);font-size:13px}' +
    '.pwa .ok,.pwas .ok{flex:none;background:var(--accent,#2e3f6e);color:var(--surface,#fff);border:0;border-radius:9px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer}' +
    '.pwa .x{flex:none;background:none;border:0;color:var(--muted,#5d6577);font-size:22px;line-height:1;padding:4px 6px;cursor:pointer}' +
    '.pwasbg{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.pwas{background:var(--surface,#fff);color:var(--fg,#1b2030);width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:20px 18px max(20px,env(safe-area-inset-bottom));font:15px/1.55 var(--body,system-ui,sans-serif)}' +
    '.pwas h3{margin:0 0 12px;font-size:18px}.pwas ol{margin:0 0 16px;padding-left:22px}.pwas li{margin:0 0 10px}.pwas li b{color:var(--accent,#2e3f6e)}' +
    '.pwas .row{display:flex;gap:8px}.pwas .row button{flex:1}.pwas .no{background:none;border:1px solid var(--line,#d6dae2);color:var(--fg,#1b2030);border-radius:9px;padding:10px 16px;font:inherit;cursor:pointer}' +
    '.pwas svg{display:inline-block;vertical-align:-4px;width:20px;height:20px}' +
    '.pwas .arrow{position:fixed;left:50%;bottom:6px;transform:translateX(-50%);font-size:34px;color:#fff;animation:pwab 1s infinite}@keyframes pwab{50%{transform:translate(-50%,8px)}}';
  var styled = false;
  function style() { if (styled) return; styled = true; var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  function close() { var o = document.querySelector('.pwa'); if (o) { o.remove(); document.body.style.paddingBottom = ''; } }
  var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="공유"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>';
  var DOTS = '<b>⋮</b>';

  function steps() {
    if (inapp && android && kakao) return { t: '카톡 안에서는 설치가 안 돼요', l: ['아래 <b>크롬으로 열기</b>를 누르세요.', '크롬에서 이 페이지가 열리면 <b>설치</b>를 다시 누르세요.'], go: ['크롬으로 열기', function () { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href); }] };
    if (inapp && ios) return { t: '앱 안 브라우저에서는 설치가 안 돼요', l: ['오른쪽 아래(또는 위) <b>⋯</b> 메뉴를 누르세요.', '<b>Safari로 열기</b>(또는 다른 브라우저로 열기)를 누르세요.', 'Safari에서 <b>설치</b>를 다시 누르세요.'] };
    if (inapp) return { t: '앱 안 브라우저에서는 설치가 안 돼요', l: ['오른쪽 위 ' + DOTS + ' 메뉴를 누르세요.', '<b>다른 브라우저로 열기</b>(크롬)를 누르세요.', '크롬에서 <b>설치</b>를 다시 누르세요.'] };
    if (ios) return { t: iosSafari ? '아이폰 홈 화면에 추가' : '아이폰 홈 화면에 추가', l: [(iosSafari ? '화면 맨 아래' : '주소창 오른쪽') + ' ' + SHARE + ' <b>공유</b> 버튼을 누르세요.', '목록을 조금 내려서 <b>홈 화면에 추가</b>를 누르세요.', '오른쪽 위 <b>추가</b>를 누르면 끝이에요.'], arrow: iosSafari };
    if (samsung) return { t: '삼성 인터넷에서 설치', l: ['주소창 오른쪽의 <b>⤓ 설치</b> 아이콘이 보이면 누르세요.', '없으면 아래 <b>≡</b> 메뉴 → <b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요.'] };
    return { t: '크롬에서 설치', l: ['오른쪽 위 ' + DOTS + ' 메뉴를 누르세요.', '<b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요.', '<b>설치</b>를 누르면 홈 화면에 아이콘이 생겨요.'] };
  }

  function sheet() {
    style();
    var s = steps();
    var bg = document.createElement('div'); bg.className = 'pwasbg';
    bg.innerHTML = '<div class="pwas" role="dialog" aria-label="앱 설치 방법"><h3>' + s.t + '</h3><ol>' + s.l.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
      '<div class="row">' + (s.go ? '<button class="ok" type="button">' + s.go[0] + '</button>' : '') + '<button class="no" type="button">닫기</button></div></div>' + (s.arrow ? '<div class="arrow">↓</div>' : '');
    document.body.appendChild(bg);
    bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
    bg.querySelector('.no').onclick = function () { bg.remove(); };
    if (s.go) bg.querySelector('.ok').onclick = s.go[1];
  }

  function install() {
    if (deferred) {
      var d = deferred; deferred = null;
      d.prompt();
      d.userChoice.then(function (c) { if (c.outcome === 'accepted') close(); else deferred = null; });
      return;
    }
    sheet();
  }
  window.spInstall = install;

  function banner(force) {
    if (standalone) return;
    if (!force) { try { if (Date.now() < +localStorage.getItem(KEY)) return; } catch (e) {} }
    if (!force && !ios && !android) return;
    close(); style();
    var d = document.createElement('div'); d.className = 'pwa'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '앱 설치 안내');
    d.innerHTML = '<img src="icons/i190-192.png" alt=""><div class="t"><b>폰에 앱으로 설치</b><div class="s">홈 화면에 아이콘이 생기고 앱처럼 열려요.</div></div>' +
      '<button class="ok" type="button">설치</button><button class="x" type="button" aria-label="닫기">×</button>';
    document.body.appendChild(d);
    document.body.style.paddingBottom = (d.offsetHeight + 40) + 'px';
    d.querySelector('.ok').onclick = install;
    d.querySelector('.x').onclick = function () { close(); try { localStorage.setItem(KEY, Date.now() + 3 * 864e5); } catch (e) {} };
  }

  ready(function () {
    if (standalone) { document.querySelectorAll('.pwa-btn').forEach(function (b) { b.remove(); }); return; }
    document.querySelectorAll('.pwa-btn').forEach(function (b) { b.hidden = false; b.onclick = install; });
    banner(false);
  });
})();

// Back button: closes an enlarged photo first, goes to the previous screen otherwise,
// and in the installed app needs two presses on the first screen to quit.
// Musinsa product links open the Musinsa app (Android intent with web fallback; iOS universal link).
(function () {
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var ua = navigator.userAgent, android = /Android/.test(ua), inapp = /KAKAOTALK|NAVER\(|Instagram|FBAN|FBAV|Line\//i.test(ua);
  var stack = [], skip = 0;
  window.spOverlay = function (close) { history.pushState({ spo: 1 }, ''); stack.push(close); };
  window.spOverlayClosed = function () { if (stack.length) { stack.pop(); skip++; history.back(); } };

  // exit guard on the first screen. Chrome skips history entries added before the user has touched the page,
  // so the guard is armed on the first tap (and again after each "press once more" warning).
  var entry = false, mobile = /Android|iPhone|iPad|iPod/.test(ua);
  if (standalone || mobile) {
    try {
      var e0 = sessionStorage.getItem('sp:entry');
      if (!e0) { sessionStorage.setItem('sp:entry', location.pathname); entry = true; } else entry = e0 === location.pathname;
    } catch (e) {}
  }
  var armed = !!(history.state && history.state.spg);
  function arm() {
    if (!entry || armed) return;
    armed = true;
    if (!(history.state && history.state.spbase)) history.replaceState({ spbase: 1 }, '');
    history.pushState({ spg: 1 }, '');
  }
  ['click', 'pointerup', 'touchend', 'keydown'].forEach(function (ev) { addEventListener(ev, arm, { capture: true, passive: true }); });
  var lastBack = 0;
  function toast(t) {
    var d = document.createElement('div');
    d.textContent = t;
    d.style.cssText = 'position:fixed;left:50%;bottom:max(70px,calc(env(safe-area-inset-bottom) + 60px));transform:translateX(-50%);z-index:10001;background:rgba(20,22,30,.9);color:#fff;font:13px/1.4 system-ui,sans-serif;padding:8px 14px;border-radius:999px;pointer-events:none';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1800);
  }
  addEventListener('popstate', function (e) {
    if (skip) { skip--; return; }
    if (stack.length) { var c = stack.pop(); c(); return; }
    if (entry && e.state && e.state.spbase) {
      // first press lands here: warn; the next press leaves the app (the guard is re-armed only by a tap)
      armed = false; lastBack = Date.now(); toast('뒤로가기를 한 번 더 누르면 앱이 꺼져요');
    }
  });

  function hookLightbox() {
    [].forEach.call(document.querySelectorAll('.lb'), function (lb) {
      var open = false;
      new MutationObserver(function () {
        var on = lb.classList.contains('on');
        if (on && !open) { open = true; window.spOverlay(function () { open = false; lb.classList.remove('on'); }); }
        else if (!on && open) { open = false; window.spOverlayClosed(); }
      }).observe(lb, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // Musinsa app links
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="musinsa.com/products/"]');
    if (!a || !android || inapp) return;
    var m = a.href.match(/musinsa\.com\/products\/(\d+)/); if (!m) return;
    e.preventDefault();
    var web = 'https://www.musinsa.com/products/' + m[1];
    location.href = 'intent://www.musinsa.com/products/' + m[1] + '#Intent;scheme=https;package=com.musinsa.store;S.browser_fallback_url=' + encodeURIComponent(web) + ';end';
  }, true);

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', hookLightbox); else hookLightbox();
})();
