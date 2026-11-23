// On any https://www.musinsa.com page, with window._ids = ['123', ...]: size chart, material and seller fabric feel per product
// -> POST cand_sizes.json {id: {sizes: [[name, [[k, v], ...]], ...], mat, feel: {두께: ..}}}. Progress in window._sz.
window._sz = 'run';
(async () => {
  const out = {}, G = 'https://goods-detail.musinsa.com/api2/goods/'; let k = 0;
  const one = async id => {
    const o = {};
    try { const a = await (await fetch(G + id + '/actual-size')).json(); o.sizes = ((a.data && a.data.sizes) || []).map(s => [s.name, s.items.map(i => [i.name, i.value])]); } catch (e) {}
    try { const e = await (await fetch(G + id + '/essential')).json(); const m = (e.data.essentials || []).find(x => /소재/.test(x.name)); o.mat = m ? m.value : ''; } catch (e) {}
    try { const d = await (await fetch(G + id)).json(); const it = (d.data.goodsMaterial && d.data.goodsMaterial.materials) || []; o.feel = {}; it.forEach(x => { o.feel[x.name] = (x.items || []).filter(i => i.isSelected).map(i => i.name).join('/'); }); } catch (e) {}
    out[id] = o; k++; window._sz = 'n ' + k;
  };
  const ids = (window._ids || []).slice();
  await Promise.all(Array.from({ length: 4 }, async () => { while (ids.length) { await one(ids.shift()); await new Promise(r => setTimeout(r, 150)); } }));
  await fetch('http://127.0.0.1:8777/?name=cand_sizes.json', { method: 'POST', body: JSON.stringify(out) });
  window._sz = 'done ' + k;
})();
