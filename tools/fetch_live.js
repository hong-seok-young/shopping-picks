// Run in a Chrome tab on https://www.musinsa.com (after setting window._ids = [..ids..]).
// Fetches price / sale / sold-out / review count for every id and POSTs the list to the local receiver.
(async () => {
  const ids = window._ids || [];
  const out = [];
  for (let i = 0; i < ids.length; i += 40) {
    const ch = ids.slice(i, i + 40);
    try {
      const j = await (await fetch('https://api.musinsa.com/api2/dp/v1/goods?goodsNoList=' + ch.join(','), { credentials: 'include' })).json();
      const l = (j.data && (j.data.list || j.data)) || [];
      (Array.isArray(l) ? l : []).forEach(g => out.push({ goodsNo: g.goodsNo, price: g.price, normalPrice: g.normalPrice, saleRate: g.saleRate, reviewCount: g.reviewCount, reviewScore: g.reviewScore, isSoldOut: g.isSoldOut }));
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }
  await fetch('http://127.0.0.1:8777/?name=live_raw.json', { method: 'POST', body: JSON.stringify(out) });
  window._live = 'done ' + out.length;
})();
