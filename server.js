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

    console.log('[RapidAPI] Calling:', endpoint, params);

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          console.log('[RapidAPI] Status:', res.statusCode);
          resolve(parsed);
        } catch(e) {
          console.log('[RapidAPI] Parse error:', data.substring(0, 300));
          reject(new Error('Parse error: ' + data.substring(0, 100)));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function searchProducts(keyword) {
  return callRapidAPI('item_search_2', {
    q: keyword,
    sort: 'default',
    page: '1',
    countryCode: 'FR',
    currency: 'EUR',
    locale: 'fr_FR'
  }).then(function(data) {
    var products = [];
    try {
      var items = data.result && data.result.resultList ? data.result.resultList :
                  data.items || data.result || [];
      if (!Array.isArray(items)) {
        items = items.items || items.products || items.data || [];
      }
      items.slice(0, 10).forEach(function(item, i) {
        var p = item.item || item.product || item;
        var price = p.sku && p.sku.def && p.sku.def.promotionPrice ? parseFloat(p.sku.def.promotionPrice) :
                    p.prices && p.prices.salePrice ? parseFloat(p.prices.salePrice.minPrice) :
                    p.price ? parseFloat(p.price) :
                    parseFloat(p.salePrice || p.minPrice || 0);
        var title = p.title || p.name || p.productTitle || '';
        var pid = p.itemId || p.productId || p.id || String(Date.now() + i);
        var img = p.image || (p.images && p.images[0]) || p.mainImage || p.imageUrl || '';
        var rating = p.averageStar || p.rating || p.starRating || 4.5;
        var reviews = p.totalCount || p.reviews || 0;

        if (title && price > 0) {
          var score = Math.round((parseFloat(rating) / 5) * 50 + Math.min(reviews / 1000, 1) * 30 + 20);
          products.push({
            id: String(pid),
            name: String(title).substring(0, 80),
            image: String(img).replace(/^\/\//, 'https://'),
            price: price,
            oldPrice: parseFloat((price * 1.5).toFixed(2)),
            rating: parseFloat(rating),
            reviews: reviews,
            score: score,
            gapFR: score,
            isWinner: score >= 65,
            supplier: 'AliExpress',
            link: 'https://www.aliexpress.com/item/' + pid + '.html',
            followLink: 'https://followtrend.shop?product=' + pid
          });
        }
      });
    } catch(e) {
      console.log('[Parser error]', e.message, JSON.stringify(data).substring(0, 300));
    }
    return products;
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
      service: 'FOLLOW. Backend v5 — RapidAPI',
      rapidApiKey: RAPIDAPI_KEY.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (action === 'search') {
    var keyword = parsed.query.keyword || 'patch sommeil';
    searchProducts(keyword).then(function(products) {
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
      { keyword: 'sleep patch wellness', niche: 'wellness' },
      { keyword: 'noise cancelling earplugs', niche: 'hearing' },
      { keyword: 'ring light portable', niche: 'creator' },
      { keyword: 'nasal dilator breathing', niche: 'breathing' },
      { keyword: 'cable organizer desk', niche: 'home' }
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
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, winners: unique.slice(0, 15), total: unique.length }));
    }

    niches.forEach(function(n) {
      searchProducts(n.keyword).then(function(products) {
        products.forEach(function(p) { p.niche = n.niche; });
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

  if (action === 'debug') {
    callRapidAPI('item_search_2', {
      q: 'patch sommeil',
      sort: 'default',
      page: '1',
      countryCode: 'FR',
      currency: 'EUR'
    }).then(function(data) {
      res.writeHead(200);
      res.end(JSON.stringify({
        keys: Object.keys(data),
        sample: JSON.stringify(data).substring(0, 2000)
      }));
    }).catch(function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ error: 'Actions: health, search, gaphunter, debug' }));
});

server.listen(PORT, function() {
  console.log('FOLLOW. Backend v5 RapidAPI actif sur port ' + PORT);
});
