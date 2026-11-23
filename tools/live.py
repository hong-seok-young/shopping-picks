"""Merge tools/inbox/live_raw.json (list of Musinsa dp/v1/goods items) into data/live.json and data/history.json."""
import json, os, datetime
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(os.path.join(root, 'tools', 'inbox', 'live_raw.json'), encoding='utf-8'))
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
day = now.strftime('%Y-%m-%d')
hp = os.path.join(root, 'data', 'history.json')
hist = json.load(open(hp, encoding='utf-8')) if os.path.exists(hp) else {}
items = {}
for g in raw:
    i = str(g.get('goodsNo'))
    if not i or i == 'None':
        continue
    it = {'p': g.get('price'), 'np': g.get('normalPrice'), 'sr': g.get('saleRate'), 'rc': g.get('reviewCount'),
          'rs': g.get('reviewScore'), 'so': bool(g.get('isSoldOut'))}
    h = [x for x in hist.get(i, []) if x[0] != day] + [[day, it['p'], it['so']]]
    hist[i] = h[-60:]
    prev = [x for x in hist[i] if x[0] != day]
    if prev:
        it['prev'] = prev[-1][1]
    lows = [x[1] for x in hist[i] if x[1]]
    if lows:
        it['low'] = min(lows)
    items[i] = it
os.makedirs(os.path.join(root, 'data'), exist_ok=True)
json.dump({'updated': now.strftime('%Y-%m-%d %H:%M'), 'items': items}, open(os.path.join(root, 'data', 'live.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(hist, open(hp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('items', len(items), 'soldout', sum(1 for v in items.values() if v['so']), 'changed', sum(1 for v in items.values() if v.get('prev') and v['prev'] != v['p']))

# home screen counts
import subprocess, sys
subprocess.run([sys.executable, os.path.join(root, 'tools', 'pages.py')])
