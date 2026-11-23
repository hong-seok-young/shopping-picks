// Group a card's reviews by topic (size, length, fabric, fit, warmth, care, color, overall) with a one-line summary per topic.
// window.spRevGroup(liNodes) -> HTML string; also rewrites every ul.rev on the page into grouped blocks.
(function () {
  var NEG = '(?!\\s?지 ?않|\\s?진 ?않|하지 ?않|지는 ?않)';
  function R(s) { return new RegExp(s.replace(/@/g, NEG)); }
  var TOPICS = [
    { k: 'size', n: '사이즈', rx: /사이즈|정사이즈|치수|크(다|네|게|고|요|더|긴)|커(요|서|용|도)|큽니|작(다|아|네|게|고|은|았)|타이트|넉넉|여유|헐렁|낀다|끼(어|고|는|네)|조이|업 ?해|업했|허리|밴딩/g,
      sig: [['딱 맞다', R('딱 ?맞|잘 ?맞|정사이즈|적당')], ['크다·여유', R('크(다|네|게|고|요)@|커(요|서)@|넉넉|여유|헐렁|오버')], ['작다·낌', R('작(다|아|네|게|고|았)@|타이트@|끼(어|고|네)|낀다|조이|쪼')]] },
    { k: 'len', n: '길이', rx: /기장|총장|길이|길(어|다|고|게|네|었)|짧(아|다|고|게|네|았|은)|소매|팔 ?길|팔이|배꼽|엉덩이|발목|복숭아뼈|무릎|종아리/g,
      sig: [['적당', R('적당|딱 ?좋|딱 ?맞|알맞')], ['길다', R('길(어|다|고|게|네|었)@|넉넉')], ['짧다', R('짧(아|다|고|게|네|았|은)@')]] },
    { k: 'fab', n: '원단·두께', rx: /원단|재질|소재|두께|두껍|두꺼|얇|탄탄|짱짱|쫀쫀|도톰|두툼|빳빳|흐물|힘이|비침|비쳐|부드|까슬|따갑|따가|촉감|묵직|가볍|가벼|신축|스판/g,
      sig: [['탄탄·두꺼움', R('탄탄|짱짱|쫀쫀|두껍|두꺼|도톰|두툼|묵직|빳빳|힘이 ?있')], ['얇다·흐물', R('얇@|흐물|비침|비쳐|힘이 ?없')], ['부드럽다', R('부드')], ['까슬·따가움', R('까슬|따갑|따가')]] },
    { k: 'fit', n: '핏·모양', rx: /핏|어깨|태가|라인|실루엣|각이|몸이|체형|머슬|붙|배 ?나|와이드|통이|허벅지|밑단/g,
      sig: [['핏 좋다', R('(핏|어깨|태|라인|실루엣)[^.!?]{0,10}(좋|예쁘|이쁘|이뻐|예뻐|이쁨|넓|멋|살|딱|각|굿|최고|맘에|마음에)|(예쁜|이쁜|좋은|멋진|넓은)\s?(핏|어깨|라인)')], ['붙음·배 나옴', R('달라붙|딱 ?붙|쫙 ?붙|배 ?나|뱃살')], ['어깨 좁음', R('어깨[^.!?]{0,6}좁')]] },
    { k: 'warm', n: '보온·계절', rx: /따뜻|따듯|보온|추워|춥|겨울|여름|시원|더워|덥|간절기/g,
      sig: [['따뜻', R('따뜻|따듯|보온')], ['춥다', R('추워|춥')], ['시원', R('시원')], ['덥다', R('더워|덥')]] },
    { k: 'care', n: '세탁·내구성', rx: /세탁|빨래|보풀|줄어|수축|변형|목 ?늘|구멍|올 ?풀|마감|실밥|냄새|털 ?빠|이염|물 ?빠/g,
      sig: [['보풀', R('보풀')], ['줄어듦', R('줄어|수축')], ['늘어남·변형', R('늘어|변형|목 ?늘')], ['냄새', R('냄새')], ['마감·실밥', R('마감|실밥|구멍|올 ?풀')], ['털 빠짐·이염', R('털 ?빠|이염|물 ?빠')]] },
    { k: 'color', n: '색상', rx: /색|컬러|톤/g,
      sig: [['색 예쁨', R('(색|컬러|톤)[^.!?]{0,8}(예쁘|이쁘|이뻐|예뻐|좋|맘에|마음에|고급)')], ['사진과 다름', R('(색|컬러)[^.!?]{0,10}(다르|달라|어둡|밝|칙칙|차이)')]] },
    { k: 'etc', n: '만족·기타', rx: /./g,
      sig: [['만족', R('만족|좋아|좋네|좋습|좋음|최고|추천|재구매|예쁘|이쁘|이뻐|예뻐|굿')], ['아쉬움', R('별로|비추|실망|아쉽|반품|환불|후회')]] }
  ];
  var SIZE = /(^|\s|·)((\d?X{1,4}L|XS|S|M|L|FREE|F|\d{2,3}|[0-9])(\(\d+\))?)\s*$/i;

  function parts(li) {
    var c = li.cloneNode(true);
    var hw = c.querySelector('.hw, .rtop .body, b');
    var opt = c.querySelector('.o, .opt');
    var hwT = hw ? hw.textContent.trim() : '', optT = opt ? opt.textContent.trim() : '';
    c.querySelectorAll('.hw, .o, .opt, .rtop, b').forEach(function (e) { e.remove(); });
    return { hw: hwT, opt: optT, body: c.textContent.replace(/\s+/g, ' ').trim() };
  }
  function topicOf(body) {
    var best = TOPICS.length - 1, bestN = 0;
    for (var i = 0; i < TOPICS.length - 1; i++) {
      var m = body.match(TOPICS[i].rx); var n = m ? new Set(m).size : 0;
      if (n > bestN) { bestN = n; best = i; }
    }
    return best;
  }
  function sizeOf(opt) {
    var s = opt.split(/·|\/|,/).map(function (x) { return x.trim(); });
    for (var i = s.length - 1; i >= 0; i--) { var m = s[i].match(SIZE); if (m) return m[2].toUpperCase().replace(/\(\d+\)/, ''); }
    return '';
  }
  function sentence(t, items) {
    var bits = [];
    t.sig.forEach(function (g) {
      var n = items.filter(function (it) { return g[1].test(it.body); }).length;
      if (n) bits.push(g[0] + ' ' + n);
    });
    if (t.k === 'size') {
      var c = {}; items.forEach(function (it) { var z = sizeOf(it.opt); if (z) c[z] = (c[z] || 0) + 1; });
      var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 2);
      if (top.length) bits.push('많이 산 사이즈 ' + top.map(function (z) { return z + '(' + c[z] + ')'; }).join('·'));
    }
    var out = bits.filter(function (b) { return b.indexOf('많이 산') < 0; }).map(function (b) { var i = b.lastIndexOf(' '); return "'" + b.slice(0, i) + "' " + b.slice(i + 1) + '개'; }).join(', ');
    var sz = bits.filter(function (b) { return b.indexOf('많이 산') === 0; })[0];
    if (out) out += '예요.';
    if (sz) out += (out ? ' ' : '') + '많이 산 사이즈는 ' + sz.replace('많이 산 사이즈 ', '') + '이에요.';
    return out || '한쪽으로 쏠린 말은 없어요.';
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  window.spRevGroup = function (lis) {
    var buckets = TOPICS.map(function () { return []; });
    [].forEach.call(lis, function (li) { var p = parts(li); if (p.body) buckets[topicOf(p.body)].push(p); });
    var order = TOPICS.map(function (t, i) { return i; }).filter(function (i) { return buckets[i].length; })
      .sort(function (a, b) { return (a === TOPICS.length - 1) - (b === TOPICS.length - 1) || buckets[b].length - buckets[a].length; });
    if (!order.length) return '';
    return '<div class="rgs">' + order.map(function (i) {
      var t = TOPICS[i], its = buckets[i];
      return '<div class="rg"><button type="button" class="rg-h" aria-expanded="false"><b>' + t.n + '</b><span class="c">' + its.length + '</span><span class="s">' + esc(sentence(t, its)) + '</span></button>' +
        '<ul hidden>' + its.map(function (p) { return '<li><span class="hw">' + esc(p.hw) + '</span>' + (p.opt ? '<span class="o">' + esc(p.opt) + '</span>' : '') + esc(p.body) + '</li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>';
  };

  var CSS = '.rgs{display:flex;flex-direction:column;gap:3px}' +
    '.rg{background:var(--surface);border:1px solid var(--line);border-radius:6px;overflow:hidden}' +
    '.rg-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 6px;width:100%;text-align:left;font:inherit;font-size:11.5px;line-height:1.4;padding:5px 24px 5px 8px;background:none;border:0;color:var(--fg);cursor:pointer;position:relative}' +
    '.rg-h b{font-size:12px;color:var(--accent)}.rg-h .c{font-family:var(--mono,monospace);font-size:11px;color:var(--muted)}.rg-h .s{flex-basis:100%;color:var(--fg)}' +
    '.rg-h::after{content:"▾";position:absolute;right:8px;top:5px;color:var(--muted)}.rg-h[aria-expanded="true"]::after{content:"▴"}' +
    '.rg ul[hidden]{display:none}.rg ul{list-style:none;margin:0;padding:0 8px 4px;display:flex;flex-direction:column}' +
    '.rg li{font-size:11px;line-height:1.4;border-top:1px solid var(--line);padding:3px 0}' +
    '.rg li .hw{font-family:var(--mono,monospace);color:var(--accent);font-weight:700;font-size:10.5px;margin-right:4px}.rg li .o{color:var(--muted);font-size:10px;margin-right:4px}';

  function init() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.querySelectorAll('ul.rev').forEach(function (ul) {
      if (ul.dataset.grouped || !ul.children.length) return;
      var h = window.spRevGroup(ul.children); if (!h) return;
      ul.dataset.grouped = '1';
      var d = document.createElement('div'); d.innerHTML = h; ul.after(d.firstChild);
      ul.hidden = true; ul.style.display = 'none';
      var more = ul.parentNode.querySelector('.revmore'); if (more) more.hidden = true, more.style.display = 'none';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.rg-h'); if (!b) return;
    var ul = b.nextElementSibling; var open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open)); ul.hidden = !open;
  });
  function go() { setTimeout(init, 30); }
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
