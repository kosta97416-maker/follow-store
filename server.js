function getShopifyProducts() {
  // On passe à 250 pour attraper tes 150 produits
  return getShopifyToken().then(function(token) {
    return new Promise(function(resolve) {
      var options = {
        hostname: 'follow-9096.myshopify.com',
        path: '/products.json?limit=250', // ICI : on prend TOUT
        method: 'GET',
        headers: { 'X-Shopify-Access-Token': token }
      };
      var req = https.request(options, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
          try {
            var result = JSON.parse(data);
            var products = [];
            // MAP AMÉLIORÉ POUR TES AGENTS
            var nicheMap = {
              'solar': 'energy', 'lamp': 'energy', 'battery': 'energy', // AGENTS ENERGY
              'survival': 'survival', 'knife': 'survival', 'tactical': 'survival', // AGENTS SURVIVAL
              'water': 'water', 'filter': 'water', 'kitchen': 'water', // AGENTS WATER
              'bag': 'tactical', 'backpack': 'tactical', 'pouch': 'tactical' // AGENTS BAGS
            };

            (result.products || []).forEach(function(p) {
              var price = parseFloat(p.variants && p.variants[0] ? p.variants[0].price : 0);
              var titleLower = (p.title || '').toLowerCase();
              var niche = 'lifestyle'; // Par défaut
              
              Object.keys(nicheMap).forEach(function(key) {
                if (titleLower.includes(key)) niche = nicheMap[key];
              });

              products.push({
                id: String(p.id),
                name: p.title,
                image: p.images && p.images[0] ? p.images[0].src : '',
                price: price, // Shopify garde l'Euro pour l'achat
                displayPrice: parseFloat((price * 1.2).toFixed(2)), // Ton agent peut ajuster ici pour le $
                niche: niche,
                isWinner: true
              });
            });
            resolve(products);
          } catch(e) { resolve([]); }
        });
      });
      req.end();
    });
  });
}
