const https = require('https');
const http = require('http');
const url = require('url');

const ZENROWS_KEY = process.env.ZENROWS_API_KEY || 'e67a90b35de47dc52aa59740c6648e5e1b5254bd';
const PORT = process.env.PORT || 3000;

function scrapeAliExpress(searchUrl) {
  return new Promise(function(resolve, reject) {
    var apiUrl = 'https://api.zenrows.com/v1/?apikey=' + ZENROWS_KEY +
      '&url=' + encodeURIComponent(searchUrl) +
      '&js_render=true&wait=4000';

    https.get(apiUrl, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve(data); });
    }).on('error', reject);
  });
}

function extractProducts(html, niche) {
  var products = [];

  try {
    // Méthode 1: cherche window._data__ ou __listing_offers_data
    var dataMatch = html.match(/window\.__INIT_DATA__\s*=\s*(\{.+?\});/s) ||
                    html.match(/"mods":\{"itemList":\{"content":(\[.+?\])/s) ||
                    html.match(/,"items":(\[.+?\]),"totalCount"/s);

    if (dataMatch) {
      var items = JSON.parse(dataMatch[1]);
      if (!Array.isArray(items)) {
        items = items.items || items.content || [];
      }
      items.slice(0, 10).forEach(function(item, i) {
        var price = item.price && item.price.minPrice ? parseFloat(item.price.minPrice) :
                    item.salePrice ? parseFloat(item.salePrice) : 0;
        var title = item.title || item.name || item.productTitle || '';
        var pid = item.productId || item.itemId || String(Date.now() + i);
        var img = item.image || item.imageUrl || item.mainImage || '';
        var rating = item.starRating || item.avgStar || 4.5;

        if (title && price > 0) {
          var score = Math.round((parseFloat(rating) / 5) * 60 + 40);
          products.push({
            id: String(pid),
            name: String(title).substring(0, 80),
            image: String(img).replace(/^\/\//, 'https://'),
            price: price,
            oldPrice: parseFloat((price * 1.4).toFixed(2)),
            rating: parseFloat(rating),
            niche: niche,
            score: score,
            gapFR: score,
            isWinner: score >= 70,
            supplier: 'AliExpress',
            link: 'https://www.aliexpress.com/item/' + pid + '.html',
            followLink: 'https://followtrend.shop?product=' + pid
          });
        }
      });
    }

    // Méthode 2: regex sur les données produits dans le HTML
    if (products.length === 0) {
      var priceReg = /"minActivityAmount":\{"value":"?([0-9.]+)"?/g;
      var titleReg = /"title":"([^"]{10,150})"/g;
      var pidReg = /"productId":(\d{10,})/g;
      var imgReg = /"imageUrl":"(https?:[^"]+\.(jpg|jpeg|png|webp))"/g;

      var prices = [], titles = [], pids = [], imgs = [];
      var m;

      while ((m = priceReg.exec(html)) !== null) prices.push(m[1]);
      while ((m = titleReg.exec(html)) !== null) {
        if (m[1].indexOf('\\') === -1 && m[1].length > 10) titles.push(m[1]);
      }
      while ((m = pidReg.exec(html)) !== null) pids.push(m[1]);
      while ((m = imgReg.exec(html)) !== null) imgs.push(m[1]);

      var count = Math.min(prices.length, titles.length, pids.length, 8);
      for (var i = 0; i < count; i++) {
        var price2 = parseFloat(prices[i] || 0);
        if (price2 > 0 && titles[i]) {
          var score2 = 75 + Math.floor(Math.random() * 20);
          products.push({
            id: pids[i] || String(Date.now() + i),
            name: titles[i].substring(0, 80),
            image: imgs[i] || '',
            price: price2,
            oldPrice: parseFloat((price2 * 1.4).toFixed(2)),
            rating: 4.5 + Math.random() * 0.4,
            niche: niche,
            score: score2,
            gapFR: score2,
            isWinner: true,
            supplier: 'AliExpress',
            link: 'https://www.aliexpress.com/item/' + (pids[i] || '') + '.html',
            followLink: 'https://followtrend.shop?product=' + (pids[i] || i)
          });
        }
      }
    }

  } catch(e) {
    console.log('[Parser error]', e.message);
  }

  return products;
}

var server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  var parsed = url.parse(req.url, true);
  var action = parsed.query.action;

  if (action === 'health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status:'ok', service:'FOLLOW. Backend v4', timestamp: new Date().toISOString() }));
    return;
  }

  if (action === 'search') {
    var keyword = parsed.query.keyword || 'patch sommeil';
    var searchUrl = 'https://www.aliexpress.com/w/wholesale-' + keyword.replace(/\s+/g, '-') + '.html?currency=EUR&shipCountry=fr&SortType=total_tranpro_desc';
    scrapeAliExpress(searchUrl).then(function(html) {
      var products = extractProducts(html, 'general');
      res.writeHead(200);
      res.end(JSON.stringify({ success:true, products:products, total:products.length }));
    }).catch(function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  if (action === 'gaphunter') {
    var niches = [
      { keyword:'patch-sommeil-bien-etre', niche:'wellness' },
      { keyword:'bouchons-oreilles-design', niche:'hearing' },
      { keyword:'ring-light-portable-creator', niche:'creator' },
      { keyword:'dilatateur-nasal-sport', niche:'breathing' },
      { keyword:'organiseur-cables-bureau', niche:'home' }
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
      res.end(JSON.stringify({ success:true, winners:unique.slice(0,15), total:unique.length }));
    }

    niches.forEach(function(n) {
      var searchUrl = 'https://www.aliexpress.com/w/wholesale-' + n.keyword + '.html?currency=EUR&shipCountry=fr&SortType=total_tranpro_desc';
      scrapeAliExpress(searchUrl).then(function(html) {
        var prods = extractProducts(html, n.niche);
        console.log('[GapHunter]', n.niche, '->', prods.length, 'produits');
        allProducts = allProducts.concat(prods);
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

  if (action === 'rawtest') {
    var testUrl = 'https://www.aliexpress.com/w/wholesale-patch-sommeil.html?currency=EUR&SortType=total_tranpro_desc';
    scrapeAliExpress(testUrl).then(function(html) {
      // Cherche des patterns clés dans le HTML
      var hasPrice = html.indexOf('minActivityAmount') !== -1 || html.indexOf('salePrice') !== -1;
      var hasTitle = html.indexOf('"title"') !== -1;
      var hasPid = html.indexOf('productId') !== -1;
      var sample = html.substring(html.indexOf('productId') - 50, html.indexOf('productId') + 200);
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        htmlLength: html.length,
        hasPrice: hasPrice,
        hasTitle: hasTitle,
        hasPid: hasPid,
        sample: sample
      }));
    }).catch(function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ error: 'Actions: health, search, gaphunter, rawtest' }));
});

server.listen(PORT, function() {
  console.log('FOLLOW. Backend v4 actif sur port ' + PORT);
});
