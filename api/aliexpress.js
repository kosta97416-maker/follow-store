// ============================================================
// FOLLOW. — Backend Serveur AliExpress API
// Fichier: api/aliexpress.js (Vercel Serverless Function)
// ============================================================

const crypto = require('crypto');

// ── CONFIGURATION ─────────────────────────────────────────
const AE_CONFIG = {
  appKey: process.env.ALIEXPRESS_APP_KEY || '532692',
  appSecret: process.env.ALIEXPRESS_APP_SECRET,
  baseUrl: 'https://api-sg.aliexpress.com/sync',
  trackingId: 'followtrend',
};

// ── SIGNATURE HMAC (requis par AliExpress) ─────────────────
function signRequest(params) {
  const sorted = Object.keys(params).sort();
  let str = AE_CONFIG.appSecret;
  for (const key of sorted) {
    str += key + params[key];
  }
  str += AE_CONFIG.appSecret;
  return crypto.createHmac('sha256', AE_CONFIG.appSecret)
    .update(str).digest('hex').toUpperCase();
}

// ── APPEL API ALIEXPRESS ──────────────────────────────────
async function callAliExpress(method, extraParams = {}) {
  const timestamp = Date.now();
  const params = {
    method,
    app_key: AE_CONFIG.appKey,
    timestamp: String(timestamp),
    sign_method: 'sha256',
    format: 'json',
    v: '2.0',
    ...extraParams,
  };
  params.sign = signRequest(params);

  const url = AE_CONFIG.baseUrl + '?' + new URLSearchParams(params).toString();
  const response = await fetch(url);
  return await response.json();
}

// ── ROUTES ────────────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS pour followtrend.shop
  res.setHeader('Access-Control-Allow-Origin', 'https://followtrend.shop');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // ── RECHERCHE PRODUITS WINNERS ─────────────────────────
    if (action === 'search') {
      const { keyword, page = 1 } = req.query;
      if (!keyword) return res.status(400).json({ error: 'keyword requis' });

      const data = await callAliExpress('aliexpress.affiliate.product.query', {
        keywords: keyword,
        page_no: String(page),
        page_size: '20',
        fields: 'product_id,product_title,product_main_image_url,target_sale_price,target_original_price,evaluate_rate,product_detail_url,commission_rate,sale_price_currency',
        target_currency: 'EUR',
        target_language: 'FR',
        tracking_id: AE_CONFIG.trackingId,
        sort: 'SALES_DESC',
      });

      const products = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];

      // Calcul du score FOLLOW. pour chaque produit
      const scored = products.map(p => ({
        id: p.product_id,
        name: p.product_title,
        image: p.product_main_image_url,
        price: parseFloat(p.target_sale_price || 0),
        originalPrice: parseFloat(p.target_original_price || 0),
        rating: parseFloat(p.evaluate_rate || 0),
        url: p.product_detail_url,
        commission: p.commission_rate,
        followScore: calculateFollowScore(p),
        link: `https://followtrend.shop?product=${p.product_id}`,
      })).sort((a, b) => b.followScore - a.followScore);

      return res.status(200).json({ success: true, products: scored, total: scored.length });
    }

    // ── DÉTAIL PRODUIT ─────────────────────────────────────
    if (action === 'product') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id requis' });

      const data = await callAliExpress('aliexpress.affiliate.productdetail.get', {
        product_ids: id,
        fields: 'product_id,product_title,product_main_image_url,target_sale_price,evaluate_rate,product_detail_url,commission_rate,product_description',
        target_currency: 'EUR',
        target_language: 'FR',
        tracking_id: AE_CONFIG.trackingId,
      });

      const product = data?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product?.[0];
      if (!product) return res.status(404).json({ error: 'Produit non trouvé' });

      return res.status(200).json({ success: true, product });
    }

    // ── GAPHUNTER — Cherche winners par niche ──────────────
    if (action === 'gaphunter') {
      const niches = [
        { keyword: 'sleep patch wellness', niche: 'wellness', label: 'Bien-être' },
        { keyword: 'noise cancelling earplugs', niche: 'hearing', label: 'Audition' },
        { keyword: 'ring light portable creator', niche: 'creator', label: 'Créateurs' },
        { keyword: 'nasal dilator breathing', niche: 'breathing', label: 'Respiratoire' },
        { keyword: 'cable organizer desk magnetic', niche: 'home', label: 'Maison' },
      ];

      const results = [];
      for (const niche of niches) {
        const data = await callAliExpress('aliexpress.affiliate.product.query', {
          keywords: niche.keyword,
          page_no: '1',
          page_size: '5',
          fields: 'product_id,product_title,product_main_image_url,target_sale_price,evaluate_rate,commission_rate',
          target_currency: 'EUR',
          target_language: 'FR',
          tracking_id: AE_CONFIG.trackingId,
          sort: 'SALES_DESC',
        });

        const products = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];
        const winners = products
          .filter(p => parseFloat(p.evaluate_rate || 0) >= 4.5)
          .map(p => ({
            ...p,
            niche: niche.niche,
            nicheLabel: niche.label,
            followScore: calculateFollowScore(p),
            gapFR: calculateGapFR(p),
            link: `https://followtrend.shop?product=${p.product_id}`,
          }))
          .filter(p => p.followScore >= 75);

        results.push(...winners);
      }

      // Top 10 winners triés par score
      const top = results.sort((a, b) => b.followScore - a.followScore).slice(0, 10);
      return res.status(200).json({ success: true, winners: top, count: top.length });
    }

    // ── ORDERBOT — Infos commande ──────────────────────────
    if (action === 'order_info') {
      const { orderId } = req.query;
      if (!orderId) return res.status(400).json({ error: 'orderId requis' });

      const data = await callAliExpress('aliexpress.trade.ds.order.get', {
        order_id: orderId,
      });

      return res.status(200).json({ success: true, order: data });
    }

    // ── TRACKING LIVRAISON ─────────────────────────────────
    if (action === 'tracking') {
      const { orderId } = req.query;
      if (!orderId) return res.status(400).json({ error: 'orderId requis' });

      const data = await callAliExpress('aliexpress.logistics.ds.trackinginfo.query', {
        order_id: orderId,
        out_ref: `FOLLOW-${orderId}`,
      });

      return res.status(200).json({ success: true, tracking: data });
    }

    // ── HEALTH CHECK ───────────────────────────────────────
    if (action === 'health') {
      return res.status(200).json({
        status: 'ok',
        service: 'FOLLOW. AliExpress Backend',
        appKey: AE_CONFIG.appKey,
        secretConfigured: !!AE_CONFIG.appSecret,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }

    return res.status(400).json({ error: 'Action inconnue. Utilisez: search, product, gaphunter, order_info, tracking, health' });

  } catch (error) {
    console.error('[FOLLOW. Backend Error]', error);
    return res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

// ── CALCUL SCORE FOLLOW. ──────────────────────────────────
function calculateFollowScore(product) {
  const rating = parseFloat(product.evaluate_rate || 0);
  const commission = parseFloat(product.commission_rate || 0);
  const price = parseFloat(product.target_sale_price || 0);
  const originalPrice = parseFloat(product.target_original_price || 0);
  const discount = originalPrice > 0 ? ((originalPrice - price) / originalPrice) * 100 : 0;

  // Score pondéré
  const ratingScore = (rating / 5) * 40;        // 40% du score
  const commissionScore = Math.min(commission / 10, 1) * 30; // 30%
  const discountScore = Math.min(discount / 50, 1) * 30;     // 30%

  return Math.round(ratingScore + commissionScore + discountScore);
}

// ── CALCUL GAP FR ─────────────────────────────────────────
function calculateGapFR(product) {
  // Estimation du gap marché FR basée sur le score commission et rating
  const base = calculateFollowScore(product);
  const gapBonus = Math.floor(Math.random() * 15 + 10); // Sera remplacé par vraies données
  return Math.min(base + gapBonus, 99);
}
