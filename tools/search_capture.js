// On a Musinsa search page (https://www.musinsa.com/search/goods?keyword=K&gf=M&sortCode=REVIEW), with window._NAME set
// (e.g. 's_knit_0.json'): captures every product list response while scrolling until review counts drop below 50,
// then POSTs {goodsNo: [goodsNo, brandName, goodsName, price, normalPrice, saleRate, reviewCount, reviewScore, brand]} to the receiver.
window._job = 'run';
(async () => {
  const NAME = window._NAME;
  const cap = {}, order = [];
  const put = l => (l || []).forEach(g => { order.push(g.reviewCount); cap[g.goodsNo] = [g.goodsNo, g.brandName, g.goodsName, g.price, g.normalPrice, g.saleRate, g.reviewCount, g.reviewScore, g.brand]; });
  const of = window.fetch;
  window.fetch = async function (...a) { const r = await of.apply(this, a); try { const u = String(a[0] && a[0].url || a[0]); if (u.includes('/plp/goods')) r.clone().json().then(j => put(j.data && j.data.list)); } catch (e) {} return r; };
  const ox = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { this.addEventListener('load', () => { try { if (String(u).includes('/plp/goods')) put(JSON.parse(this.responseText).data.list); } catch (e) {} }); return ox.apply(this, arguments); };
  try { const q = new URLSearchParams(location.search); const j = await (await of('https://api.musinsa.com/api2/dp/v2/plp/goods?gf=M&keyword=' + encodeURIComponent(q.get('keyword')) + '&sortCode=REVIEW&isUsed=false&page=1&size=100&caller=SEARCH', { credentials: 'include' })).json(); put(j.data && j.data.list); } catch (e) {}
  for (let i = 0; i < 140; i++) {
    window.scrollBy(0, 1800); await new Promise(r => setTimeout(r, 1300));
    window._job = 'scroll ' + i + ' n ' + Object.keys(cap).length;
    if (order.length > 100 && order.slice(-12).every(x => x < 50)) break;
  }
  await of('http://127.0.0.1:8777/?name=' + NAME, { method: 'POST', body: JSON.stringify(cap) });
  window._job = 'done ' + Object.keys(cap).length;
})();
