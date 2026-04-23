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

  if (action === 'debug') {
    callRapidAPI('item_search_2', {
      q: 'patch sommeil',
      sort: 'salesDesc',
      page: '1',
      region: 'FR',
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
  console.log('FOLLOW. Backend v6 actif sur port ' + PORT);
});
