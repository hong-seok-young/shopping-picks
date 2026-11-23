"""Write data/pages.json: {page: [product ids shown on it]} so the home screen can count what each person still has
(minus the products they deleted or moved down)."""
import re, os, glob, json
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = {}
for f in sorted(glob.glob(os.path.join(root, '*.html'))):
    name = os.path.basename(f)
    if name in ('index.html', 'cart.html', 'innerouter.html', 'final-two.html'):
        continue
    s = open(f, encoding='utf-8').read()
    ids = []
    for sec in re.findall(r'<section class="item".*?</section>', s, re.S):
        m = re.search(r'class="go" href="https://www\.musinsa\.com/products/(\d+)', sec)
        if m and m.group(1) not in ids:
            ids.append(m.group(1))
    if name == 'knit.html':  # knit cards are rendered from DATA in the page
        for m in re.finditer(r'\{all:\d+,grade:"[^"]*",brand:"[^"]*",name:"[^"]*",url:"https://www\.musinsa\.com/products/(\d+)"', s):
            if m.group(1) not in ids:
                ids.append(m.group(1))
    out[name] = ids
os.makedirs(os.path.join(root, 'data'), exist_ok=True)
json.dump(out, open(os.path.join(root, 'data', 'pages.json'), 'w', encoding='utf-8'), separators=(',', ':'))
print({k: len(v) for k, v in out.items()})
