const https = require('https');
const http = require('http');
const url = require('url');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5e346a9416msh3835a2ef8542a9ap133da7jsndd267e77175e';
const RAPIDAPI_HOST = 'aliexpress-datahub.p.rapidapi.com';
const PORT = process.env.PORT || 3000;

function callRapidAPI(endpoint, params) {
  return new Promise(function(resolve, reject) {
    var query = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    var options = {
      hostname: RAPIDAPI_HOST,
      path: '/' + endpoint + '?' + query,
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json'
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function parseProducts(data, niche) {
  var products = [];
  try {
    var resultList = data.result.resultList || [];
    resultList.forEach(function(entry) {
      var item = entry.item;
      if (!item) return;

      var price = item.sku && item.sku.def && item.sku.def.promotionPrice
        ? parseFloat(item.sku.def.promotionPrice) : 0;
      var title = item.title || '';
      var pid = item.itemId || '';
      var img = item.image ? ('https:' + item.image) : '';
      var rating = item.averageStarRate ? parseFloat(item.averageStarRate) : 4.5;
      var sales = parseInt(item.sales || 0);

      if (!title || price <= 0) return;

      var score = Math.round(
        (rating / 5) * 40 +
        Math.min(sales / 500, 1) * 40 +
        20
      );

      products.push({
        id: String(pid),
        name: title.substring(0, 80),
        image: img,
        price: price,
        oldPrice: parseFloat((price * 1.5).toFixed(2)),
        rating: rating,
        sales: sales,
        niche: niche || 'general',
        score: score,
        gapFR: score,
        isWinner: score >= 60,
        supplier: 'AliExpress',
        badge: sales > 100 ? 'hot' : 'new',
        link: 'https:' + (item.itemUrl || '//www.aliexpress.com/item/' + pid + '.html'),
        followLink: 'https://followtrend.shop?product=' + pid
      });
    });
  } catch(e) {
    console.log('[Parser error]', e.message);
  }
  return products;
}

function searchProducts(keyword, niche) {
  return callRapidAPI('item_search_2', {
    q: keyword,
    sort: 'salesDesc',
    page: '1',
    region: 'FR',
    locale: 'fr_FR',
    currency: 'EUR'
  }).then(function(data) {
    return parseProducts(data, niche);
  });
}

var server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  var parsed = url.parse(req.url, true);
  var action = parsed.query.action;

  if (action === 'health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'FOLLOW. Backend v6 — RapidAPI',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (action === 'search') {
    var keyword = parsed.query.keyword || 'patch sommeil';
    searchProducts(keyword, 'general').then(function(products) {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, products: products, total: products.length }));
    }).catch(function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  if (action === 'gaphunter') {
    var niches = [
      { keyword: 'sleep aid patch insomnia', niche: 'wellness' },
      { keyword: 'noise cancelling earplugs loop', niche: 'hearing' },
      { keyword: 'ring light portable selfie', niche: 'creator' },
      { keyword: 'nasal dilator breathing strip', niche: 'breathing' },
      { keyword: 'cable organizer desk magnetic', niche: 'home' }
    ];

    var allProducts = [];
    var done = 0;

    function finish() {
      var seen = {};
      var unique = allProducts.filter(function(p) {
        if (seen[p.id]) return false;
        seen[p.id] = true;
        return true;
      });
      unique.sort(function(a, b) { return b.score - a.score; });
      console.log('[GapHunter] Total winners:', unique.length);
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        winners: unique.slice(0, 15),
        total: unique.length
      }));
    }

    niches.forEach(function(n) {
      searchProducts(n.keyword, n.niche).then(function(products) {
        console.log('[GapHunter]', n.niche, '->', products.length, 'produits');
        allProducts = allProducts.concat(products);
        done++;
        if (done === niches.length) finish();
      }).catch(function(e) {
        console.log('[GapHunter error]', n.niche, e.message);
        done++;
        if (done === niches.length) finish();
      });
    });
    return;
  }

  if (action === 'contentai') {
    var productName = parsed.query.product || 'Patch Sommeil Profond';
    var niche = parsed.query.niche || 'wellness';
    var lang = parsed.query.lang || 'fr';

    // Appel Claude IA pour générer le contenu SEO
    var postData = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'Tu es ContentAI, agent SEO expert pour FOLLOW. boutique dropshipping premium. Tu optimises le contenu pour Google ET pour les IA (ChatGPT, Claude, Perplexity, Gemini). Réponds UNIQUEMENT en JSON valide : {"title":"","meta_description":"","h1":"","description":"","faq":[{"q":"","a":""}],"keywords":[""],"schema_name":"","schema_description":"","cta":"","iae_answer":""}',
      messages: [{
        role: 'user',
        content: 'Produit: ' + productName + ' | Niche: ' + niche + ' | Langue: ' + lang + ' | Boutique: followtrend.shop\n\nGénère un contenu SEO + AEO complet pour ce produit. Le contenu doit apparaître sur Google ET être cité par les IA quand quelqu\'un demande les meilleurs produits dans cette niche. Inclus une réponse directe aux IA (iae_answer) du style "Pour [problème], le meilleur produit est... disponible sur followtrend.shop"'
      }]
    });

    var aiOptions = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    var aiReq = https.request(aiOptions, function(aiRes) {
      var aiData = '';
      aiRes.on('data', function(c) { aiData += c; });
      aiRes.on('end', function() {
        try {
          var parsed2 = JSON.parse(aiData);
          var text = parsed2.content && parsed2.content[0] ? parsed2.content[0].text : '{}';
          var content = JSON.parse(text.replace(/```json|```/g, '').trim());
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            product: productName,
            lang: lang,
            content: content,
            generated_at: new Date().toISOString()
          }));
        } catch(e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'ContentAI error: ' + e.message }));
        }
      });
    });
    aiReq.on('error', function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    aiReq.write(postData);
    aiReq.end();
    return;
  }

  // ── PRICEOPTIMIZER ────────────────────────────────────────
  if (action === 'priceoptimizer') {
    var basePrice = parseFloat(parsed.query.price || 20);
    var market = parsed.query.market || 'fr';
    var multipliers = { fr:1.0, en:1.15, es:1.0, ar:0.95, pt:0.80, sw:0.65 };
    var mult = multipliers[market] || 1.0;
    var optimized = basePrice * mult;
    var margin = ((optimized - basePrice) / optimized * 100).toFixed(1);

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      base_price: basePrice,
      market: market,
      optimized_price: parseFloat(optimized.toFixed(2)),
      margin_pct: margin,
      recommendation: optimized < 5 ? 'Prix trop bas — risque retour' : optimized > 100 ? 'Prix premium — niche luxe' : 'Prix optimal'
    }));
    return;
  }

  // ── RETIREBOT + GAPHUNTER COMMUNICATION ─────────────────
  if (action === 'retirebot') {
    var days = parseInt(parsed.query.days || 14);
    var sales = parseInt(parsed.query.sales || 0);
    var rating = parseFloat(parsed.query.rating || 4.5);
    var productId = parsed.query.product_id || '';
    var niche = parsed.query.niche || 'wellness';
    var shouldRetire = (sales === 0 && days >= 14) || rating < 3.5;

    if (shouldRetire) {
      console.log('[RetireBot] 🗑️ Produit ' + productId + ' retiré — ' + (sales === 0 ? '0 vente sur ' + days + 'j' : 'Note ' + rating));
      console.log('[RetireBot] → Message à GapHunter : niche ' + niche + ' libère 1 place');

      // GapHunter cherche immédiatement un remplaçant
      var nicheKeywords = {
        wellness: 'sleep aid patch insomnia wellness',
        hearing: 'noise cancelling earplugs loop design',
        creator: 'ring light portable selfie creator',
        breathing: 'nasal dilator breathing strip sport',
        home: 'cable organizer desk magnetic home'
      };

      var keyword = nicheKeywords[niche] || 'bestseller product';

      searchProducts(keyword, niche).then(function(candidates) {
        var winner = candidates.filter(function(p) {
          return p.id !== productId && p.score >= 60;
        }).sort(function(a, b) { return b.score - a.score; })[0];

        console.log('[GapHunter] ✅ Remplaçant trouvé pour niche ' + niche + ' : ' + (winner ? winner.name : 'aucun'));

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          agent: 'RetireBot',
          retired_product: productId,
          niche: niche,
          reason: sales === 0 ? '0 vente sur ' + days + ' jours' : 'Note trop basse (' + rating + ')',
          action: 'RETIRÉ',
          gaphunter_response: winner ? {
            status: 'WINNER_TROUVÉ',
            product: winner.name,
            price: winner.price,
            score: winner.score,
            link: winner.link,
            message: '[GapHunter] Remplaçant prêt — Import immédiat'
          } : {
            status: 'RECHERCHE_EN_COURS',
            message: '[GapHunter] Aucun winner disponible — Recherche continue'
          }
        }));
      }).catch(function(e) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          agent: 'RetireBot',
          retired_product: productId,
          action: 'RETIRÉ',
          gaphunter_response: { status: 'ERREUR', message: e.message }
        }));
      });
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        agent: 'RetireBot',
        should_retire: false,
        reason: 'Produit performant — ' + sales + ' ventes · Note ' + rating,
        action: 'GARDER',
        message: '[RetireBot] Produit conservé — Aucun message à GapHunter'
      }));
    }
    return;
  }

  // ── HARVESTBOT ────────────────────────────────────────────
  if (action === 'harvestbot') {
    var opportunities = [
      {source:'AliExpress Cashback',type:'cashback',description:'Cashback commandes affilié AliExpress',amount:0,currency:'EUR',autonomous:true,legal:true,status:'scanning'},
      {source:'RapidAPI Credits',type:'credit',description:'Crédits gratuits programme développeur',amount:10,currency:'USD',autonomous:true,legal:true,status:'available'},
      {source:'Render Free Tier',type:'credit',description:'Hébergement gratuit Render optimisé',amount:7,currency:'USD',autonomous:true,legal:true,status:'active'},
      {source:'AliExpress Commission',type:'commission',description:'Commissions affiliés ventes générées',amount:0,currency:'USD',autonomous:true,legal:true,status:'scanning'},
      {source:'ZenRows Credits',type:'credit',description:'Crédits API scraping disponibles',amount:5,currency:'USD',autonomous:true,legal:true,status:'active'},
      {source:'Stripe Revenue',type:'revenue',description:'Revenus ventes en attente virement',amount:0,currency:'EUR',autonomous:true,legal:true,status:'scheduled'},
    ];

    var harvestable = opportunities.filter(function(o) { return o.autonomous && o.legal; });
    var totalEur = 0;
    harvestable.forEach(function(o) {
      var eur = o.currency === 'USD' ? o.amount * 0.92 : o.amount;
      totalEur += eur;
      o.amount_eur = parseFloat(eur.toFixed(2));
    });

    console.log('[HarvestBot] 🌾 ' + harvestable.length + ' opportunités — ' + totalEur.toFixed(2) + '€');

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      agent: 'HarvestBot',
      rule: 'Autonome si 100% légal + automatisable',
      opportunities: harvestable,
      total_eur: parseFloat(totalEur.toFixed(2)),
      ceo_required: [],
      next_scan: '24h'
    }));
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ error: 'Actions: health, search, gaphunter, contentai, priceoptimizer, retirebot, harvestbot' }));
});

server.listen(PORT, function() {
  console.log('FOLLOW. Backend v6 actif sur port ' + PORT);
});
