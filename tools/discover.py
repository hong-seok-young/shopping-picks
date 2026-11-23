"""Daily discovery of new Musinsa products for every category page.

Browser steps (run in a Chrome tab on https://www.musinsa.com, results POSTed to tools/recv.py):
  search_capture.js  -> inbox/s_<cat>_<n>.json    (one per keyword)
  fetch_sizes.js     -> inbox/cand_sizes.json
  fetch_reviews.js   -> inbox/r_<id>.json
Python steps:
  python tools/discover.py keywords      # prints the search plan as JSON [[cat, keyword], ...]
  python tools/discover.py candidates    # -> inbox/cand_ids.json (new ids worth measuring)
  python tools/discover.py fit           # -> inbox/fit.json, prints ids that need reviews
  python tools/discover.py build         # appends passing products to each page under '새로 찾은 상품'
Rules are the user's (190cm/98kg): reviews >= 50, no Musinsa Standard, plain tops (no print/logo/stripe/pocket),
knits under 110,000 KRW, no linen pants, coats >= 130cm long and black.
"""
import re, os, sys, json, glob, html, datetime
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX = os.path.join(ROOT, 'tools', 'inbox')
SEEN = os.path.join(ROOT, 'tools', 'seen.json')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from sameprod import same as same_product  # noqa: E402

E = lambda s: html.escape(str(s), quote=True)
PER_DAY_MEASURE = 40
PER_DAY_ADD = 5
TOPS = r'프린트|프린팅|print|로고|logo|그래픽|graphic|레터링|lettering|스트라이프|stripe|포켓|pocket|자수|embroid|아트웍|artwork|아플리케|패치|patch|심볼|symbol'
BAD = r'무신사 ?스탠다드|여성|우먼|women|wmns|키즈|kids|주니어|아동|세트$|양말|socks|가방|모자|캡|비니|머플러|장갑'

GYM_BRANDS = ['에이치덱스', '드릭스', '본투윈', '제이엘브', '나인제트', '바이젝', '프리덤애슬레틱', '몰든', '피지컬가먼츠', '허그본',
              '알브이디', '블랙몬스터핏', '베르만', '디미트리블랙', '바벨웍스', '웨이든', '카미드', '카키그라도', '언더아머']

CATS = {
    'knit': dict(page='knit.html', kw=['니트', '케이블 니트'], name=r'니트|스웨터|knit|sweater', excl=r'가디건|집업|zip|조끼|베스트|vest|터틀|폴라|모크|하이넥|반팔|숏 ?슬리브|카라|폴로|' + TOPS, price=110000, fit='knit', thick=True),
    'turtleneck': dict(page='turtleneck.html', kw=['터틀넥', '폴라 니트'], name=r'터틀넥|폴라|모크넥|하이넥|turtle|mock', excl=r'지퍼|zip|후디|후드|hood|폴라베어|맨투맨|플리스|fleece|반팔|조끼|' + TOPS, price=110000, fit='knit', thick=True),
    'sweat': dict(page='sweat.html', kw=['맨투맨'], name=r'맨투맨|스웨트 ?셔츠|sweat ?shirt|크루넥', excl=r'후드|후디|hood|집업|zip|셋업|반팔|' + TOPS, fit='sweat', thick=True),
    'hoodie': dict(page='hoodie.html', kw=['후드티'], name=r'후드|후디|hood', excl=r'집업|zip|셋업|반팔|베스트|조끼|패딩|자켓|재킷|아노락|바람막이|' + TOPS.replace('|포켓|pocket', ''), fit='sweat', thick=True),
    'longsleeve': dict(page='longsleeve.html', kw=['긴팔티', '롱슬리브'], name=r'긴팔|롱 ?슬리브|long ?sleeve', excl=r'니트|후드|맨투맨|집업|zip|폴로|카라|(?<!티)셔츠|' + TOPS, fit='long'),
    'shirts': dict(page='shirts.html', kw=['셔츠'], name=r'(?<!티)(?<!티 )셔츠|shirt', excl=r'티셔츠|t-shirt|tee|반팔|숏 ?슬리브|스웨트|맨투맨|린넨|linen|' + TOPS.replace('|포켓|pocket', ''), fit='sweat'),
    'cardigan': dict(page='cardigan.html', kw=['가디건'], name=r'가디건|cardigan', excl=r'크롭|crop|조끼|베스트|반팔|' + TOPS, price=110000, fit='knit', thick=True),
    'outer': dict(page='outer.html', kw=['자켓', '블루종', '패딩'], name=r'자켓|재킷|jacket|블루종|점퍼|패딩|파카|parka|후드 ?집업', excl=r'코트|coat|조끼|베스트|vest|반팔|셔츠|셋업', fit='outer'),
    'coat': dict(page='coat.html', kw=['롱코트'], name=r'코트|coat', excl=r'더플|떡볶이|후드|hood|벨트|belt|로브|robe|하프|숏|트렌치|패딩|무스탕|퍼|레인', fit='coat', black=True),
    'pants': dict(page='pants.html', kw=['와이드 팬츠', '슬랙스', '데님 팬츠'], name=r'팬츠|pants|슬랙스|바지|데님|진\b|치노|카고|트라우저', excl=r'린넨|linen|쇼츠|반바지|shorts|하프|레깅스|버뮤다|조거 ?쇼츠|\d ?부', fit='pants'),
    'gym': dict(page='gym.html', kw=GYM_BRANDS, name=r'.', excl=TOPS + r'|컴프레션|compression|레깅스|타이츠|카라|폴로|럭비|저지|jersey|셋업|vlad', fit='gym', brands=GYM_BRANDS),
}


def load(p, d=None):
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception:
        return d


def site_ids():
    ids = set()
    for f in glob.glob(os.path.join(ROOT, '*.html')):
        ids |= set(re.findall(r'musinsa\.com/products/(\d+)', open(f, encoding='utf-8').read()))
    return ids


def num(v):
    try:
        v = float(v)
        return v if v > 0 else None
    except Exception:
        return None


def rows_of(sizes):
    return [(n, {k: num(v) for k, v in items}) for n, items in (sizes or [])]


def gym_type(n):
    if re.search(r'반바지|숏 ?팬츠|쇼츠|shorts|버뮤다|\d ?인치|하프 ?팬츠', n, re.I): return '반바지'
    if re.search(r'팬츠|pants|조거|트레이닝 ?바지|슬랙스|바지|jogger', n, re.I): return '긴바지'
    if re.search(r'나시|슬리브리스|sleeveless|민소매|탱크|tank|스트링어', n, re.I): return '나시'
    if re.search(r'자켓|재킷|jacket|바람막이|윈드|아노락|점퍼|패딩|집업|zip|파카|플리스', n, re.I): return '아우터·집업'
    if re.search(r'후드|후디|hood', n, re.I): return '후드'
    if re.search(r'맨투맨|스웨트 ?셔츠|sweat ?shirt|풀오버|pullover', n, re.I): return '맨투맨'
    if re.search(r'니트|knit|스웨터|가디건', n, re.I): return '니트'
    if re.search(r'긴팔|긴소매|롱 ?슬리브|long ?sleeve', n, re.I): return '긴팔'
    if re.search(r'(?<!티)(?<!트)셔츠|(?<!t-)(?<!t)shirt', n, re.I): return '셔츠'
    if re.search(r'반팔|반소매|티셔츠|tee|t-shirt|숏 ?슬리브|하프 ?슬리브|머슬핏|오버핏', n, re.I): return '반팔'
    return None


def fit_row(cat, name, rows):
    """Best size row for 190/98 under the category's rule -> (size name, measures, spec list) or None."""
    rule = CATS[cat]['fit']
    if rule == 'gym':
        rule = {'반팔': 'tee', '나시': 'tank', '맨투맨': 'sweat', '후드': 'sweat', '셔츠': 'sweat', '긴팔': 'long', '니트': 'long',
                '아우터·집업': 'outer', '긴바지': 'pants', '반바지': 'shorts'}.get(gym_type(name))
        if not rule:
            return None
    best = None
    for n, m in rows:
        L, Sh, C, Sl = m.get('총장'), m.get('어깨너비'), m.get('가슴단면'), m.get('소매길이')
        W, Th = m.get('허리단면'), m.get('허벅지단면')
        reach_s = (Sh / 2 + Sl) if Sh and Sl else None
        reach_k = ((Sh - 20) / 2 + Sl) if Sh and Sl else ((Sl - 10) if Sl and Sl >= 75 else None)
        ok = False
        if rule == 'knit':
            ok = (L or 0) >= 68 and (C or 0) >= 58 and (reach_k or 0) >= 79 and (Sh or 0) <= 66
        elif rule == 'sweat':
            ok = (L or 0) >= 75 and (reach_s or 0) >= 95 and (Sh or 0) <= 70  # dropped shoulders past 70 droop and narrow the look
        elif rule == 'long':
            ok = (L or 0) >= 70 and (C or 0) >= 56 and (reach_s or 0) >= 90 and (Sh or 0) <= 66
        elif rule == 'outer':
            ok = (L or 0) >= 68 and (C or 0) >= 62 and (reach_s or 0) >= 94
        elif rule == 'coat':
            ok = (L or 0) >= 130
        elif rule == 'tee':
            ok = (L or 0) >= 70 and (C or 0) >= 56 and (Sh or 0) <= 60
        elif rule == 'tank':
            ok = (L or 0) >= 70 and (C or 0) >= 55
        elif rule == 'pants':
            ok = (L or 0) > 110 and (Th or 0) >= 36 and (W is None or 44 <= W <= 51 or re.search(r'밴딩|banding', name, re.I))
        elif rule == 'shorts':
            ok = (Th or 0) >= 36
        if not ok:
            continue
        key = -abs((W or 47.5) - 47.5) if rule == 'pants' else (C or 0) + (L or 0)
        if best is None or key > best[0]:
            best = (key, n, m, reach_s, reach_k, rule)
    if not best:
        return None
    _, n, m, rs, rk, rule = best
    f = lambda v: '-' if v is None else ('%g' % v)
    if rule in ('pants', 'shorts'):
        spec = [('사이즈', n, ''), ('총장', f(m.get('총장')), 'ok'), ('허리', f(m.get('허리단면')), ''), ('허벅지', f(m.get('허벅지단면')), 'ok'), ('밑단', f(m.get('밑단단면')), '')]
    elif rule == 'coat':
        spec = [('사이즈', n, ''), ('총장', f(m.get('총장')), 'ok'), ('어깨', f(m.get('어깨너비')), ''), ('가슴단면', f(m.get('가슴단면')), ''), ('소매', f(m.get('소매길이')), '')]
    else:
        reach = rk if rule == 'knit' else rs
        lab = '환산 소매' if rule == 'knit' else '리치(어깨/2+소매)'
        spec = [('사이즈', n, ''), ('총장', f(m.get('총장')), 'ok'), ('어깨', f(m.get('어깨너비')), ''), ('가슴단면', f(m.get('가슴단면')), ''),
                (lab, '-' if reach is None else '%.1f' % reach, 'ok' if reach else '')]
    return n, m, spec


# ---------- steps ----------
def cmd_keywords():
    print(json.dumps([[c, k] for c, v in CATS.items() for k in v['kw']], ensure_ascii=False))


def cmd_candidates():
    have = site_ids()
    seen = set(load(SEEN, []))
    out = {}
    for f in glob.glob(os.path.join(INBOX, 's_*.json')):
        cat = os.path.basename(f)[2:].rsplit('_', 1)[0]
        c = CATS.get(cat)
        if not c:
            continue
        for v in (load(f, {}) or {}).values():
            pid, brand, name, price, rc = str(v[0]), v[1] or '', v[2] or '', v[3] or 0, v[6] or 0
            if pid in have or pid in seen or rc < 50:
                continue
            if c.get('brands') and brand not in c['brands']:
                continue
            if c.get('price') and price >= c['price']:
                continue
            if not re.search(c['name'], name, re.I) or re.search(c['excl'], name, re.I) or re.search(BAD, name + ' ' + brand, re.I):
                continue
            if c.get('black') and not re.search(r'블랙|black|bk\b', name, re.I):
                continue
            out[pid] = [cat, brand, name, price, rc]
    # daily budget: per category only the 40 most-reviewed unseen products (the rest wait for the next days)
    keep = {}
    for cat in CATS:
        top = sorted([(v[4], k) for k, v in out.items() if v[0] == cat], reverse=True)[:PER_DAY_MEASURE]
        keep.update({k: out[k] for _, k in top})
    out = keep
    json.dump(out, open(os.path.join(INBOX, 'cand_ids.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print(len(out))
    print(','.join(out))


def cmd_fit():
    cand = load(os.path.join(INBOX, 'cand_ids.json'), {})
    sizes = load(os.path.join(INBOX, 'cand_sizes.json'), {})
    res, seen = {}, set(load(SEEN, []))
    for pid, (cat, brand, name, price, rc) in cand.items():
        o = sizes.get(pid)
        if o is None:
            continue
        seen.add(pid)  # failed a rule: never re-check (passing ones are marked when they are added or rejected by reviews)
        mat = (o.get('mat') or '')
        if cat == 'pants' and re.search(r'린넨|linen|마\s?\d|ramie|저마', mat, re.I):
            continue
        thick = (o.get('feel') or {}).get('두께', '')
        if CATS[cat].get('thick') and thick in ('얇음', '약간 얇음'):
            continue
        r = fit_row(cat, name, rows_of(o.get('sizes')))
        if r:
            res[pid] = dict(cat=cat, brand=brand, name=name, price=price, rc=rc, size=r[0], spec=r[2], mat=re.sub(r'<[^>]+>', ' ', mat).strip(), thick=thick)
            seen.discard(pid)
    json.dump(res, open(os.path.join(INBOX, 'fit.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(sorted(seen), open(SEEN, 'w', encoding='utf-8'))
    print(len(res))
    print(','.join(res))


KW = [('길이 좋다', r'길(어|다|고|긴|이(가|감|는)? ?(좋|딱|적당|넉넉|길))|기장(이|감|도)? ?(좋|길|딱|넉넉|적당|만족)'), ('짧다', r'짧'),
      ('크다·여유', r'크(다|고|게|네|더|긴)|커(요|서|용|도)|넉넉|여유|오버'), ('작다·낀다', r'작(아|다|네|고|은|더)|끼(어|여|네|고|는|임)|꽉|타이트|쪼이|조여|조이'),
      ('탄탄', r'탄탄|짱짱|쫀쫀|두툼|도톰|두께감 ?(좋|있)|힘이 ?있'), ('얇다·흐물', r'얇(?!지 ?않)|흐물|늘어|처지|힘이 ?없')]
SIZE = re.compile(r'(?<![A-Za-z0-9])([2-5]XL|X{1,3}L|XS|S|M|L|FREE|F|\d{2,3})(?![A-Za-z0-9])', re.I)
FIRM = r'탄탄|짱짱|쫀쫀|두툼|도톰|두께감 ?(좋|있)|힘이 ?있|두껍|두꺼|묵직'
THIN = r'얇(?!지 ?않)|흐물|비침|비쳐|힘이 ?없'
FIT = r'(핏|어깨|태|라인)[^.!?]{0,10}(좋|예쁘|이쁘|이뻐|넓|멋|딱|굿)'
DIST = lambda h, w: abs(h - 190) * 2 + abs(w - 98) / 2


def summary(rows, pants):
    rng = '185~195cm·88~110kg'
    if not rows:
        return '%s 후기는 없어요.' % rng
    sz = Counter(m[-1].upper() for m in (SIZE.findall(r[2] or '') for r in rows) if m)
    parts = ['%s 후기 %d개를 전부 봤어요.' % (rng, len(rows))]
    if sz:
        parts.append('많이 산 사이즈는 ' + '·'.join('%s(%d)' % kv for kv in sz.most_common(2)) + '이에요.')
    cnt = [(lab, sum(1 for r in rows if re.search(rx, r[3]))) for lab, rx in KW]
    cnt = [(l, c) for l, c in cnt if c]
    parts.append(('후기에서 ' + ', '.join("'%s' %d개" % lc for lc in cnt) + '가 나왔어요.') if cnt else '길이·품·두께 얘기는 거의 없어요.')
    return ' '.join(parts)


def card(pid, it, rows, ph, verdict, rank, allrank, pants_band=None):
    close = lambda p: abs(p['h'] - 190) <= 3 and abs(p['w'] - 98) <= 8
    gal = ''
    if ph:
        btn = ''.join('<button type="button" data-i="%d"><img src="%s" alt="%dcm %dkg %s 착용 후기 사진" loading="lazy"><span class="%s">%d/%d · %s</span></button>'
                      % (i, E(p['u']), p['h'], p['w'], E(p['o']), 'close' if close(p) else '', p['h'], p['w'], E(p['o'])) for i, p in enumerate(ph))
        gal = '<div class="galhead">키 180 이상·85kg 이상 착샷 %d장 · 190/98에 가까운 순 · 누르면 크게 보여요</div><div class="gal" data-ph=\'%s\'>%s</div>' % (len(ph), E(json.dumps(ph, ensure_ascii=False)), btn)
    lis = ''.join('<li><span class="hw">%d/%d</span><span class="o">%s</span>%s</li>' % (h, w, E(o), E(t)) for h, w, o, t in rows)
    revs = '<p class="revsum">%s</p>' % E(summary(rows, it['cat'] == 'pants')) + ('\n  <ul class="rev">%s</ul>' % lis if rows else '')
    sp = ''.join('<div class="spec%s"><span>%s</span><b>%s</b></div>' % (' ' + c if c else '', E(k), E(v)) for k, v, c in it['spec'])
    band = ' data-band="%d"' % pants_band if pants_band is not None else ''
    return ('<section class="item" data-all="%d"%s><div class="head"><div><div class="brand">%s</div><h2><span class="rank">%d</span>%s<span class="tag good">새로 찾음 %s</span></h2>\n'
            '  <div class="meta"><span><b>%s원</b></span><span>후기 %s개</span><span>비슷한 체형 후기 %d개</span></div></div>\n'
            '  <a class="go" href="https://www.musinsa.com/products/%s" target="_blank" rel="noopener">무신사에서 보기 →</a></div>\n'
            '  <div class="verdict">%s</div>\n  <div class="specs">%s</div>%s\n  %s\n</section>'
            % (allrank, band, E(it['brand']), rank, E(it['name']), datetime.date.today().strftime('%m.%d'), format(int(it['price']), ','),
               format(int(it['rc']), ','), len(rows), pid, verdict, sp, gal, revs))


def insert(page, sections):
    p = os.path.join(ROOT, page)
    s = open(p, encoding='utf-8').read()
    start, end = '<!--NEWFINDS-->', '<!--/NEWFINDS-->'
    if start not in s:
        if page == 'knit.html':
            k = s.index('<div class="dropped box">')
        else:
            tail = s.find('<script>\nconst lb=')
            k = s.rindex('</section>', 0, tail if tail > 0 else len(s)) + len('</section>')
        s = s[:k] + '\n' + start + '\n<h3 class="tier">새로 찾은 상품 · 0개</h3>\n' + end + '\n' + s[k:]
    a, b = s.index(start), s.index(end)
    block = s[a:b]
    n = len(re.findall(r'<section class="item"', block)) + len(sections)
    block = re.sub(r'새로 찾은 상품 · \d+개', '새로 찾은 상품 · %d개' % n, block) + '\n'.join(sections) + '\n'
    s = s[:a] + block + s[b:]
    open(p, 'w', encoding='utf-8').write(s)
    return n


def cmd_build():
    fit = load(os.path.join(INBOX, 'fit.json'), {})
    seenset = set(load(SEEN, []))
    added = {}
    groups = {}
    for pid, it in fit.items():
        o = load(os.path.join(INBOX, 'r_%s.json' % pid))
        if not o:
            continue
        texts = list(dict.fromkeys((o.get('gen') or []) + [r[3] for r in o.get('sim') or [] if r[3]]))
        nt = max(len(texts), 1)
        firm = sum(1 for t in texts if re.search(FIRM, t))
        thin = sum(1 for t in texts if re.search(THIN, t))
        fitc = sum(1 for t in texts if re.search(FIT, t))
        if (CATS[it['cat']].get('thick') and thin > firm) or thin * 100 / nt >= 15:
            seenset.add(pid)
            continue
        seen, rows = set(), []
        for r in sorted([r for r in o.get('sim') or [] if r[3]], key=lambda r: DIST(r[0], r[1])):
            k = (r[0], r[1], r[3])
            if k not in seen:
                seen.add(k); rows.append((r[0], r[1], r[2] or '', r[3]))
        ph = []
        for r in sorted(o.get('big') or [], key=lambda r: DIST(r[0], r[1])):
            if r[4]:
                ph.append({'u': 'https://image.msscdn.net/thumbnails' + r[4][0] + '?w=640', 'h': r[0], 'w': r[1], 'o': r[2] or '', 'c': r[3]})
            if len(ph) >= 8:
                break
        verdict = ('후기 %d개 기준 · <b>탄탄·두꺼움</b> %d · 얇다·흐물 %d · <b>핏·어깨 좋아 보임</b> %d<br>판매자 두께 표시: %s · 소재: %s'
                   % (len(texts), firm, thin, fitc, E(it.get('thick') or '표시 없음'), E(it.get('mat') or '-')))
        groups.setdefault(it['cat'], []).append((pid, it, rows, ph, verdict, firm - thin + fitc))
    for cat, items in groups.items():
        # one card per product: merge color variants of the same garment
        uniq = []
        for x in sorted(items, key=lambda x: -x[5]):
            if any(x[1]['brand'] == y[1]['brand'] and same_product(x[1]['name'], y[1]['name']) for y in uniq):
                seenset.add(x[0])
                continue
            uniq.append(x)
        uniq = uniq[:PER_DAY_ADD]  # at most 5 new cards per page per day; the rest stay unseen for later days
        seenset.update(x[0] for x in uniq)
        page = CATS[cat]['page']
        s = open(os.path.join(ROOT, page), encoding='utf-8').read()
        base = max([int(v) for v in re.findall(r'data-all="(\d+)"', s)] + [0])
        blk = re.findall(r'<!--NEWFINDS-->.*?<!--/NEWFINDS-->', s, re.S)
        nb = blk[0].count('<section class="item"') if blk else 0
        secs = []
        for i, (pid, it, rows, ph, verdict, _) in enumerate(uniq, 1):
            band = (1 if re.search(r'밴딩|banding', it['name'], re.I) else 0) if cat == 'pants' else None
            secs.append(card(pid, it, rows, ph, verdict, nb + i, base + i, band))
        n = insert(page, secs)
        added[cat] = [len(secs), n]
    json.dump(sorted(seenset), open(SEEN, 'w', encoding='utf-8'))
    # home tile counts follow the number of products on each page
    idx = os.path.join(ROOT, 'index.html')
    h = open(idx, encoding='utf-8').read()
    for cat, (k, _) in added.items():
        page = CATS[cat]['page']
        h = re.sub(r'(href="%s"><b>[^<]*</b><em>)(\d+)(</em>)' % re.escape(page), lambda m: m.group(1) + str(int(m.group(2)) + k) + m.group(3), h)
        h = re.sub(r'(href="%s" aria-label="[^"]*"></a><b>[^<]*</b><em>)(\d+)(</em>)' % re.escape(page), lambda m: m.group(1) + str(int(m.group(2)) + k) + m.group(3), h)
    open(idx, 'w', encoding='utf-8').write(h)
    print(json.dumps({c: v[0] for c, v in added.items()}, ensure_ascii=False))
    for cat, items in groups.items():
        for pid, it, *_ in items:
            print(cat, pid, it['brand'], it['name'][:40], it['price'])


if __name__ == '__main__':
    {'keywords': cmd_keywords, 'candidates': cmd_candidates, 'fit': cmd_fit, 'build': cmd_build}[sys.argv[1]]()
