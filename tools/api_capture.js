// On any https://www.musinsa.com page, with window._kw = [[cat, keyword, fileName], ...]:
// collects every men's product with >= 50 reviews for each keyword WITHOUT scrolling. The search API returns the top 100
// by review count for a price band; bands whose 100th item still has >= 50 reviews are split in half until they don't.
// Each keyword is POSTed to the receiver as fileName ({goodsNo: [goodsNo, brandName, goodsName, price, normalPrice,
// saleRate, reviewCount, reviewScore, brand]}). Progress in window._job ('done N' at the end).
window._job = 'run';
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const get = async (kw, lo, hi) => {
    const u = 'https://api.musinsa.com/api2/dp/v2/plp/goods?gf=M&keyword=' + encodeURIComponent(kw) + '&sortCode=REVIEW&isUsed=false&page=1&size=100&caller=SEARCH&minPrice=' + lo + '&maxPrice=' + hi;
    for (let t = 0; t < 3; t++) {
      try { const j = await (await fetch(u, { credentials: 'include' })).json(); return (j.data && j.data.list) || []; } catch (e) { await sl(2000); }
    }
    return [];
  };
  let done = 0;
  for (const [cat, kw, name] of (window._kw || [])) {
    const cap = {};
    const stack = [[0, 3000000]];
    let calls = 0;
    while (stack.length && calls < 400) {
      const [lo, hi] = stack.pop();
      const l = await get(kw, lo, hi); calls++;
      l.forEach(g => { if ((g.reviewCount || 0) >= 50) cap[g.goodsNo] = [g.goodsNo, g.brandName, g.goodsName, g.price, g.normalPrice, g.saleRate, g.reviewCount, g.reviewScore, g.brand]; });
      const last = l[l.length - 1];
      if (l.length >= 100 && last && (last.reviewCount || 0) >= 50 && hi - lo > 200) {
        const mid = Math.floor((lo + hi) / 2);
        stack.push([lo, mid], [mid + 1, hi]);
      }
      await sl(120);
      window._job = 'kw ' + (done + 1) + '/' + window._kw.length + ' ' + kw + ' calls ' + calls + ' n ' + Object.keys(cap).length;
    }
    await fetch('http://127.0.0.1:8777/?name=' + name, { method: 'POST', body: JSON.stringify(cap) });
    done++;
  }
  window._job = 'done ' + done;
})();
