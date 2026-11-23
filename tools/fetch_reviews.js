// On any https://www.musinsa.com page, with window._ids = ['123', ...]: reviews per product, slowly (Musinsa rate-limits).
// Keeps only reviews of that exact listing (Musinsa pools reviews across products).
// -> POST r_<id>.json {id, sim: [[h, w, option, text, [imgs]]], gen: [texts], big: [[h, w, option, text, [imgs]]]}. Progress in window._rv.
window._rv = 'run';
(async () => {
  const R = 'https://goods.musinsa.com/api2/review/v1/view/list?pageSize=20&isExperience=false&myFilter=false&goodsNo=';
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const pg = async (id, q, p) => { for (let t = 0; t < 4; t++) { await sl(800); try { const r = await fetch(R + id + '&page=' + p + '&' + q); if (r.ok) { const j = await r.json(); return (j.data && j.data.list) || []; } } catch (e) {} window._rv = 'backoff'; await sl(60000); } return null; };
  const row = x => { const u = x.userProfileInfo || {}; return [u.userHeight || 0, u.userWeight || 0, (x.goodsOption || '').replace(/\s+/g, ' ').trim(), (x.content || '').replace(/\s+/g, ' ').trim(), (x.images || []).map(i => i.imageUrl), x.goods && x.goods.goodsNo]; };
  let k = 0;
  for (const id of (window._ids || [])) {
    const own = r => String(r[5]) === String(id);
    const o = { id, sim: [], gen: [], big: [] }; let bad = false;
    for (let p = 0; p < 10; p++) { const l = await pg(id, 'sort=up_cnt_desc&hasPhoto=false&minHeight=185&maxHeight=195&minWeight=88&maxWeight=110', p); if (!l) { bad = true; break; } l.map(row).filter(r => own(r) && r[0] >= 185 && r[0] <= 195 && r[1] >= 88 && r[1] <= 110).forEach(r => o.sim.push(r.slice(0, 5))); if (l.length < 20) break; }
    for (let p = 0; p < 4 && !bad; p++) { const l = await pg(id, 'sort=up_cnt_desc&hasPhoto=false', p); if (!l) { bad = true; break; } l.map(row).filter(own).forEach(r => o.gen.push(r[3])); if (l.length < 20) break; }
    for (let p = 0; p < 2 && !bad; p++) { const l = await pg(id, 'sort=up_cnt_desc&hasPhoto=true&minHeight=180&maxHeight=200&minWeight=85&maxWeight=130', p); if (!l) { bad = true; break; } l.map(row).filter(r => own(r) && r[0] >= 180 && r[1] >= 85 && r[4].length).forEach(r => o.big.push(r.slice(0, 5))); if (l.length < 20) break; }
    if (bad) { window._rv = 'blocked after ' + k; return; }
    await fetch('http://127.0.0.1:8777/?name=r_' + id + '.json', { method: 'POST', body: JSON.stringify(o) });
    k++; window._rv = 'n ' + k;
  }
  window._rv = 'done ' + k;
})();
