const https = require('https');
const crypto = require('crypto');
const http = require('http');
const url = require('url');

const AE_CONFIG = {
  appKey: process.env.ALIEXPRESS_APP_KEY || '532692',
  appSecret: process.env.ALIEXPRESS_APP_SECRET || '',
  baseUrl: 'https://api-sg.aliexpress.com/sync',
  trackingId: 'followtrend',
};

function signRequest(params) {
  const sorted = Object.keys(params).sort();
  let str = AE_CONFIG.appSecret;
  for (const key of sorted) { str += key + params[key]; }
  str += AE_CONFIG.appSecret;
  return crypto.createHmac('sha256', AE_CONFIG.appSecret).update(str).digest('hex').toUpperCase();
}

function callAE(method, extra = {}) {
  return new Promise((resolve, reject) => {
    const params = {
      method, app_key: AE_CONFIG.appKey,
      timestamp: String(Date.now()),
      sign_method: 'sha256', format: 'json', v: '2.0', ...extra
    };
    params.sign = signRequest(params);
    const query = new URLSearchParams(params).toString();
    const reqUrl = `${AE_CONFIG.baseUrl}?${query}`;
    https.get(reqUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function calculateScore(p) {
  const rating = parseFloat(p.evaluate_rate || 0);
  const commission = parseFloat(p.commission_rate || 0);
  const price = parseFloat(p.target_sale_price || 0);
  const orig = parseFloat(p.target_original_price || 0);
  const disc = orig > 0 ? ((orig - price) / orig) * 100 : 0;
  return Math.round((rating / 5) * 40 + Math.min(commission / 10, 1) * 30 + Math.min(disc / 50, 1) * 30);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const action = parsed.query.action;

  try {
    if (action === 'health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', service: 'FOLLOW. Backend', appKey: AE_CONFIG.appKey, secretOk: !!AE_CONFIG.appSecret }));
      return;
    }

    if (action === 'search') {
      const keyword = parsed.query.keyword || 'wellness patch';
      const data = await callAE('aliexpress.affiliate.product.query', {
        keywords: keyword, page_no: '1', page_size: '20',
        fields: 'product_id,product_title,product_main_image_url,target_sale_price,target_original_price,evaluate_rate,product_detail_url,commission_rate',
        target_currency: 'EUR', target_language: 'FR', tracking_id: AE_CONFIG.trackingId, sort: 'SALES_DESC'
      });
      const products = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];
      const scored = products.map(p => ({
        id: p.product_id, name: p.product_title, image: p.product_main_image_url,
        price: parseFloat(p.target_sale_price || 0), rating: parseFloat(p.evaluate_rate || 0),
        url: p.product_detail_url, score: calculateScore(p),
        link: `https://followtrend.shop?product=${p.product_id}`
      })).sort((a, b) => b.score - a.score);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, products: scored }));
      return;
    }

    if (action === 'gaphunter') {
      const niches = [
        { keyword: 'sleep patch wellness', niche: 'wellness' },
        { keyword: 'noise cancelling earplugs design', niche: 'hearing' },
        { keyword: 'ring light portable creator', niche: 'creator' },
        { keyword: 'nasal dilator breathing sport', niche: 'breathing' },
        { keyword: 'cable organizer desk magnetic', niche: 'home' },
      ];
      const results = [];
      for (const n of niches) {
        const data = await callAE('aliexpress.affiliate.product.query', {
          keywords: n.keyword, page_no: '1', page_size: '5',
          fields: 'product_id,product_title,product_main_image_url,target_sale_price,evaluate_rate,commission_rate',
          target_currency: 'EUR', target_language: 'FR', tracking_id: AE_CONFIG.trackingId, sort: 'SALES_DESC'
        });
        const prods = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];
        prods.filter(p => parseFloat(p.evaluate_rate || 0) >= 4.5).forEach(p => {
          const score = calculateScore(p);
          if (score >= 70) results.push({ ...p, niche: n.niche, score, link: `https://followtrend.shop?product=${p.product_id}` });
        });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, winners: results.sort((a,b) => b.score - a.score).slice(0, 10) }));
      return;
    }

    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Action inconnue. Utilisez: health, search, gaphunter' }));

  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`FOLLOW. Backend actif sur port ${PORT}`));
