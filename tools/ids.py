"""Print every Musinsa product id linked from the site's pages (comma separated)."""
import re, glob, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ids = []
for f in sorted(glob.glob(os.path.join(root, '*.html'))):
    for i in re.findall(r'musinsa\.com/products/(\d+)', open(f, encoding='utf-8').read()):
        if i not in ids:
            ids.append(i)
print(','.join(ids))
