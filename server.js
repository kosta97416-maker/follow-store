const https = require('https');
const http = require('http');
const url = require('url');

const ZENROWS_KEY = process.env.ZENROWS_API_KEY || 'e67a90b35de47dc52aa59740c6648e5e1b5254bd';
const PORT = process.env.PORT || 3000;

// ── SCRAPE ALIEXPRESS VIA ZENROWS ──────────────────────────
function scrapeAliExpress(searchUrl) {
  return new Promise(function(resolve, reject) {
    var apiUrl = 'https://api.zenrows.com/v1/?apikey=' + ZENROWS_KEY +
      '&url=' + encodeURIComponent(searchUrl) +
      '&js_render=true' +
      '&json_response=true' +
      '&wait=3000';

    https.get(apiUrl, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ raw: data.substring(0, 500) });
        }
      });
    }).on('error', reject);
  });
}

// ── SCRAPE PRODUITS PAR NICHE ──────────────────────────────
function scrapeNiche(keyword, niche) {
  var searchUrl = 'https://www.aliexpress.com/wholesale?SearchText=' +
    encodeURIComponent(keyword) +
    '&SortType=total_tranpro_desc&shipCountry=fr&currency=EUR';

  return scrapeAliExpress(searchUrl).then(function(data) {
    var products = [];

    // Extraction des produits depuis la réponse JSON de ZenRows
    try {
      var html = data.html || data.content || JSON.stringify(data);

      // Recherche les patterns de produits dans le HTML
      var priceMatches = html.match(/"salePrice":"([^"]+)"/g) || [];
      var titleMatches = html.match(/"title":"([^"]+)"/g) || [];
      var idMatches = html.match(/"productId":"?(\d+)"?/g) || [];
      var imgMatches = html.match(/"imageUrl":"([^"]+)"/g) || [];
      var ratingMatches = html.match(/"totalStar":([0-9.]+)/g) || [];

      var count = Math.min(priceMatches.length, titleMatches.length, 8);

      for (var i = 0; i < count; i++) {
        var price = priceMatches[i] ? parseFloat(priceMatches[i].match(/[\d.]+/)[0]) : 0;
        var title = titleMatches[i] ? titleMatches[i].replace('"title":"', '').replace('"', '') : '';
        var pid = idMatches[i] ? idMatches[i].match(/\d+/)[0] : String(Date.now() + i);
        var img = imgMatches[i] ? imgMatches[i].replace('"imageUrl":"', '').replace('"', '') : '';
        var rating = ratingMatches[i] ? parseFloat(ratingMatches[i].match(/[\d.]+/)[0]) : 4.5;

        if (title && price > 0) {
          var score = Math.round((rating / 5) * 50 + Math.min(price / 100, 1) * 30 + 20);
          products.push({
            id: pid,
            name: title.substring(0, 80),
            image: img.replace(/\\\//g, '/'),
            price: price,
            oldPrice: (price * 1.4).toFixed(2),
            rating: rating,
            niche: niche,
            score: score,
            gapFR: score,
            isWinner: score >= 70,
            supplier: 'AliExpress',
            link: 'https://www.aliexpress.com/item/' + pid + '.html',
            followLink: 'https://followtrend.shop?product=' + pid
          });
        }
      }
    } catch(e) {
      console.log('[Scraper] Parse error:', e.message);
    }

    return products;
  });
}

var server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  var parsed = url.parse(req.url, true);
  var action = parsed.query.action;

  // ── HEALTH ────────────────────────────────────────────────
  if (action === 'health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'FOLLOW. Backend v3 — ZenRows',
      zenrowsKey: ZENROWS_KEY.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // ── SEARCH ────────────────────────────────────────────────
  if (action === 'search') {
    var keyword = parsed.query.keyword || 'patch sommeil';
    scrapeNiche(keyword, 'general').then(function(products) {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, products: products, total: products.length }));
    }).catch(function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // ── GAPHUNTER ─────────────────────────────────────────────
  if (action === 'gaphunter') {
    var niches = [
      { keyword: 'sleep patch wellness', niche: 'wellness' },
      { keyword: 'noise cancelling earplugs', niche: 'hearing' },
      { keyword: 'ring light creator portable', niche: 'creator' },
      { keyword: 'nasal dilator breathing', niche: 'breathing' },
      { keyword: 'cable organizer desk magnetic', niche: 'home' }
    ];

    var allProducts = [];
    var done = 0;

    function finish() {
      // Trie par score et retire les doublons
      var seen = {};
      var unique = allProducts.filter(function(p) {
        if (seen[p.id]) return false;
        seen[p.id] = true;
        return true;
      });
      unique.sort(function(a, b) { return b.score - a.score; });

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        winners: unique.slice(0, 15),
        total: unique.length
      }));
    }

    niches.forEach(function(n) {
      scrapeNiche(n.keyword, n.niche).then(function(products) {
        allProducts = allProducts.concat(products);
        done++;
        if (done === niches.length) finish();
      }).catch(function() {
        done++;
        if (done === niches.length) finish();
      });
    });
    return;
  }

  // ── TEST SCRAPER ──────────────────────────────────────────
  if (action === 'test') {
    var testUrl = 'https://www.aliexpress.com/wholesale?SearchText=patch+sommeil&currency=EUR';
    scrapeAliExpress(testUrl).then(function(data) {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        keys: Object.keys(data),
        sample: JSON.stringify(data).substring(0, 1000)
      }));
    }).catch(function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ error: 'Actions: health, search, gaphunter, test' }));
});

server.listen(PORT, function() {
  console.log('FOLLOW. Backend v3 ZenRows actif sur port ' + PORT);
});
