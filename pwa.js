// install-to-home-screen banner (Android prompt, iOS Safari steps, KakaoTalk in-app escape)
(function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;
  var KEY = 'sp:pwa:hide';
  try { if (Date.now() < +localStorage.getItem(KEY)) return; } catch (e) {}
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var kakao = /KAKAOTALK/i.test(ua);
  var inapp = kakao || /NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua);
  if (!ios && !android) return;
  var css = '.pwa{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:9999;background:var(--surface,#fff);color:var(--fg,#1b2030);border:1px solid var(--line,#d6dae2);border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:12px 12px 12px 14px;display:flex;gap:12px;align-items:center;font:14px/1.45 var(--body,system-ui,sans-serif)}' +
    '.pwa img{width:44px;height:44px;border-radius:10px;flex:none}.pwa .t{flex:1;min-width:0}.pwa b{display:block;font-size:15px}.pwa .s{color:var(--muted,#5d6577);font-size:13px}' +
    '.pwa .ok{flex:none;background:var(--accent,#2e3f6e);color:var(--surface,#fff);border:0;border-radius:9px;padding:9px 14px;font:inherit;font-weight:700}' +
    '.pwa .x{flex:none;background:none;border:0;color:var(--muted,#5d6577);font-size:20px;line-height:1;padding:4px 6px}' +
    '.pwa .sh{display:inline-block;vertical-align:-3px;width:16px;height:16px}';
  var deferred = null;
  function show(sub, btn, onBtn) {
    if (document.querySelector('.pwa')) { var o = document.querySelector('.pwa'); o.remove(); }
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div'); d.className = 'pwa'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '앱 설치 안내');
    d.innerHTML = '<img src="icons/icon-192.png" alt=""><div class="t"><b>폰에 앱으로 설치</b><div class="s">' + sub + '</div></div>' +
      (btn ? '<button class="ok" type="button">' + btn + '</button>' : '') + '<button class="x" type="button" aria-label="닫기">×</button>';
    document.body.appendChild(d); document.body.style.paddingBottom = (d.offsetHeight + 40) + 'px';
    if (btn) d.querySelector('.ok').onclick = onBtn;
    d.querySelector('.x').onclick = function () { d.remove(); document.body.style.paddingBottom = ''; try { localStorage.setItem(KEY, Date.now() + 3 * 864e5); } catch (e) {} };
  }
  var shareIcon = '<svg class="sh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="공유"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>';
  function start() {
    if (inapp) {
      if (android && kakao) {
        show('카톡 안에서는 설치가 안 돼요. 크롬으로 열어서 설치하세요.', '크롬으로 열기', function () {
          location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
        });
      } else {
        show(ios ? '앱 안 브라우저에서는 설치가 안 돼요. 오른쪽 아래 ⋯ 메뉴에서 <b style="display:inline">Safari로 열기</b> 후 설치하세요.'
                 : '앱 안 브라우저에서는 설치가 안 돼요. ⋮ 메뉴에서 <b style="display:inline">다른 브라우저로 열기</b> 후 설치하세요.');
      }
      return;
    }
    if (ios) {
      show('아래쪽(또는 주소창 옆) ' + shareIcon + ' 공유 버튼 → <b style="display:inline">홈 화면에 추가</b>를 누르세요.');
      return;
    }
    // Android Chrome: wait briefly for the native prompt event, else show menu steps
    setTimeout(function () {
      if (deferred) return;
      show('크롬 오른쪽 위 ⋮ 메뉴 → <b style="display:inline">홈 화면에 추가</b> 또는 <b style="display:inline">앱 설치</b>를 누르세요.');
    }, 2500);
  }
  addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    show('홈 화면에 아이콘이 생기고 앱처럼 열려요.', '설치', function () {
      deferred.prompt();
      deferred.userChoice.then(function () { var o = document.querySelector('.pwa'); if (o) o.remove(); });
    });
  });
  addEventListener('appinstalled', function () { var o = document.querySelector('.pwa'); if (o) o.remove(); });
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start); else start();
})();
