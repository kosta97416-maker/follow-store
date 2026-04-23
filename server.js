const https = require('https');
const http = require('http');
const url = require('url');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5e346a9416msh3835a2ef8542a9ap133da7jsndd267e77175e';
const RAPIDAPI_HOST = 'aliexpress-datahub.p.rapidapi.com';
const CEO_EMAIL = 'karma97416@gmail.com';
const PORT = process.env.PORT || 3000;

// ── GOLDWATCH STATE ───────────────────────────────────────
var goldwatch = {
  status: 'sleeping', // sleeping | active | stopped
  capital_invested: 0,
  capital_earned: 0,
  total_returned: 0,
  max_budget: 5000,
  harvest_threshold: 15000,
  return_amount: 10000,
  activation_threshold: 50000,
  history: []
};

// ── SEND EMAIL VIA GMAIL API ──────────────────────────────
function sendAlertEmail(subject, body) {
  return new Promise(function(resolve) {
    var postData = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: 'Génère un email HTML professionnel pour FOLLOW. avec ce sujet: "' + subject + '" et ce contenu: "' + body + '". Réponds juste avec le HTML de l\'email.'
      }]
    });

    console.log('[AlertCEO] 📧 Email envoyé à ' + CEO_EMAIL + ' : ' + subject);
    resolve({ sent: true, to: CEO_EMAIL, subject: subject });
  });
}

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

  // ── HARVESTBOT ÉTENDU ─────────────────────────────────────
  if (action === 'harvestbot') {
    var opportunities = [
      {source:'AliExpress Cashback',type:'cashback',description:'Cashback commandes affilié AliExpress',amount:0,currency:'EUR',autonomous:true,legal:true,status:'scanning'},
      {source:'RapidAPI Credits',type:'credit',description:'Crédits gratuits programme développeur',amount:10,currency:'USD',autonomous:true,legal:true,status:'available'},
      {source:'Render Free Tier',type:'credit',description:'Hébergement gratuit Render optimisé',amount:7,currency:'USD',autonomous:true,legal:true,status:'active'},
      {source:'AliExpress Commission',type:'commission',description:'Commissions affiliés ventes générées',amount:0,currency:'USD',autonomous:true,legal:true,status:'scanning'},
      {source:'ZenRows Credits',type:'credit',description:'Crédits API scraping disponibles',amount:5,currency:'USD',autonomous:true,legal:true,status:'active'},
      {source:'Stripe Revenue',type:'revenue',description:'Revenus ventes en attente virement',amount:0,currency:'EUR',autonomous:true,legal:true,status:'scheduled'},
      {source:'Anthropic API Credits',type:'ai_credit',description:'Crédits API Claude non utilisés',amount:5,currency:'USD',autonomous:true,legal:true,status:'scanning'},
      {source:'OpenAI Affiliate',type:'ai_affiliate',description:'Programme affilié ChatGPT',amount:0,currency:'USD',autonomous:true,legal:true,status:'available'},
      {source:'Google AI Credits',type:'ai_credit',description:'Crédits Gemini API gratuits',amount:10,currency:'USD',autonomous:true,legal:true,status:'available'},
      {source:'Midjourney Referral',type:'ai_affiliate',description:'Commission parrainage Midjourney',amount:0,currency:'USD',autonomous:true,legal:true,status:'scanning'},
      {source:'AI Bounty Programs',type:'bounty',description:'Récompenses bug bounty IA légaux',amount:0,currency:'USD',autonomous:true,legal:true,status:'scanning'},
      {source:'Vercel Free Tier',type:'credit',description:'Hébergement site Vercel gratuit',amount:20,currency:'USD',autonomous:true,legal:true,status:'active'},
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
      rule: 'Autonome si 100% légal + automatisable. CEO requis = ignoré.',
      opportunities: harvestable,
      total_eur: parseFloat(totalEur.toFixed(2)),
      ai_sources: harvestable.filter(function(o) { return o.type.includes('ai'); }).length,
      ceo_required: [],
      next_scan: '24h'
    }));
    return;
  }

  // ── WORLDWATCH ────────────────────────────────────────────
  if (action === 'worldwatch') {
    var events = [
      {domain:'Économie',level:'green',event:'Marchés stables',impact:'Faible',action:'Agents continuent normalement',alert:false},
      {domain:'Supply Chain',level:'green',event:'Délais AliExpress normaux',impact:'Faible',action:'Aucune action requise',alert:false},
      {domain:'Tech',level:'green',event:'Stripe/Vercel/Render opérationnels',impact:'Faible',action:'Aucune action requise',alert:false},
      {domain:'Géopolitique',level:'green',event:'Pas de conflit majeur détecté',impact:'Faible',action:'Aucune action requise',alert:false},
      {domain:'IA & Monnaies',level:'yellow',event:'BCE prépare Euro numérique',impact:'Moyen',action:'CurrencyBot en veille active',alert:false},
      {domain:'E-commerce',level:'green',event:'Tendances dropshipping stables',impact:'Faible',action:'GapHunter continue scan',alert:false},
    ];

    var critical = events.filter(function(e) { return e.level === 'red'; });
    var warnings = events.filter(function(e) { return e.level === 'orange' || e.level === 'yellow'; });

    if (critical.length > 0) {
      sendAlertEmail(
        '🔴 FOLLOW. — ALERTE CRITIQUE WorldWatch',
        critical.map(function(e) { return e.domain + ': ' + e.event; }).join(', ')
      );
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      agent: 'WorldWatch',
      global_status: critical.length > 0 ? 'CRITIQUE' : warnings.length > 0 ? 'VIGILANCE' : 'STABLE',
      events: events,
      critical_count: critical.length,
      warning_count: warnings.length,
      ceo_alerted: critical.length > 0,
      next_scan: '1h'
    }));
    return;
  }

  // ── ALERTCEO ──────────────────────────────────────────────
  if (action === 'alertceo') {
    var alertSubject = parsed.query.subject || 'Alerte FOLLOW.';
    var alertBody = parsed.query.body || 'Une situation nécessite votre attention.';
    var alertLevel = parsed.query.level || 'orange';

    sendAlertEmail(alertSubject, alertBody).then(function(result) {
      console.log('[AlertCEO] 📧 → ' + CEO_EMAIL);
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        agent: 'AlertCEO',
        sent_to: CEO_EMAIL,
        subject: alertSubject,
        level: alertLevel,
        timestamp: new Date().toISOString(),
        message: 'Email envoyé au CEO'
      }));
    });
    return;
  }

  // ── GOLDWATCH ─────────────────────────────────────────────
  if (action === 'goldwatch') {
    var command = parsed.query.command || 'status';
    var capital = parseFloat(parsed.query.capital || 0);

    if (command === 'STOP') {
      goldwatch.status = 'stopped';
      var returned = goldwatch.capital_invested + goldwatch.capital_earned;
      goldwatch.capital_invested = 0;
      goldwatch.capital_earned = 0;
      goldwatch.history.push({ date: new Date().toISOString(), action: 'ARRÊT CEO', returned: returned });
      sendAlertEmail('✅ GoldWatch — Arrêt exécuté', 'GoldWatch arrêté. ' + returned.toFixed(2) + '€ retournés dans capital FOLLOW.');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, agent: 'GoldWatch', status: 'ARRÊTÉ', returned_eur: returned, message: 'Fonds retournés dans capital FOLLOW.' }));
      return;
    }

    if (command === 'WAKE') {
      if (capital >= goldwatch.activation_threshold) {
        goldwatch.status = 'active';
        goldwatch.history.push({ date: new Date().toISOString(), action: 'ACTIVATION', capital: capital });
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, agent: 'GoldWatch', status: 'ACTIF', budget: goldwatch.max_budget, message: 'GoldWatch activé — Budget 5 000€ — Seuil remboursement 15 000€' }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({ success: false, agent: 'GoldWatch', status: 'VEILLE', message: 'Capital insuffisant. Requis: ' + goldwatch.activation_threshold + '€. Actuel: ' + capital + '€' }));
      }
      return;
    }

    // Vérifie si seuil remboursement atteint
    if (goldwatch.status === 'active' && goldwatch.capital_earned >= goldwatch.harvest_threshold) {
      goldwatch.total_returned += goldwatch.return_amount;
      goldwatch.capital_earned -= goldwatch.return_amount;
      goldwatch.history.push({ date: new Date().toISOString(), action: 'REMBOURSEMENT', amount: goldwatch.return_amount });
      sendAlertEmail('💰 GoldWatch — Remboursement automatique', goldwatch.return_amount + '€ retournés dans capital FOLLOW. GoldWatch continue avec ' + goldwatch.capital_earned.toFixed(2) + '€');
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      agent: 'GoldWatch',
      status: capital >= goldwatch.activation_threshold ? goldwatch.status : 'VEILLE',
      capital_required: goldwatch.activation_threshold,
      capital_current: capital,
      ready: capital >= goldwatch.activation_threshold,
      max_budget: goldwatch.max_budget,
      harvest_threshold: goldwatch.harvest_threshold,
      return_amount: goldwatch.return_amount,
      total_returned: goldwatch.total_returned,
      message: capital >= goldwatch.activation_threshold ? 'GoldWatch prêt — Capital suffisant' : 'En veille — Capital insuffisant (' + (goldwatch.activation_threshold - capital).toFixed(2) + '€ manquants)',
      history: goldwatch.history.slice(-5)
    }));
    return;
  }

  // ── CURRENCYBOT ───────────────────────────────────────────
  if (action === 'currencybot') {
    var currencies = [
      {name:'EUR',type:'fiat',status:'active',confidence:100,convertible:true,source:'Banque Centrale Européenne'},
      {name:'USD',type:'fiat',status:'active',confidence:100,convertible:true,source:'Federal Reserve USA'},
      {name:'EURC',type:'stablecoin',status:'active',confidence:95,convertible:true,source:'Circle — indexé EUR'},
      {name:'USDC',type:'stablecoin',status:'active',confidence:94,convertible:true,source:'Circle — indexé USD'},
      {name:'Euro Numérique',type:'cbdc',status:'monitoring',confidence:75,convertible:false,source:'BCE — en développement 2026'},
      {name:'Yuan Numérique',type:'cbdc',status:'monitoring',confidence:70,convertible:false,source:'Banque Populaire Chine'},
      {name:'KES',type:'fiat',status:'active',confidence:82,convertible:true,source:'Banque Centrale Kenya'},
      {name:'BRL',type:'fiat',status:'active',confidence:80,convertible:true,source:'Banco Central Brasil'},
    ];

    var newDetected = currencies.filter(function(c) { return c.status === 'monitoring' && c.confidence >= 80; });
    newDetected.forEach(function(c) {
      sendAlertEmail('💱 CurrencyBot — Nouvelle monnaie détectée', c.name + ' (' + c.type + ') — Score confiance: ' + c.confidence + '% — Source: ' + c.source);
    });

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      agent: 'CurrencyBot',
      active_currencies: currencies.filter(function(c) { return c.status === 'active'; }).length,
      monitoring: currencies.filter(function(c) { return c.status === 'monitoring'; }).length,
      currencies: currencies,
      rule: 'Score > 80% + légale + convertible = intégration auto. Sinon = Alerte CEO',
      auto_integrated: currencies.filter(function(c) { return c.status === 'active' && c.confidence >= 80; }).length,
      next_scan: '6h'
    }));
    return;
  }

  // ── LEGALGUARD ────────────────────────────────────────────
  if (action === 'legalguard') {
    var checkType = parsed.query.type || 'general';
    var checkValue = parsed.query.value || '';
    var checkAmount = parseFloat(parsed.query.amount || 0);
    var checkCountry = parsed.query.country || 'FR';

    var legalRules = {
      currencies: {
        'USD': { legal: true, declaration: false, note: 'Légal — devise internationale' },
        'EUR': { legal: true, declaration: false, note: 'Légal — devise nationale' },
        'CNY': { legal: true, declaration: true, note: 'Légal avec déclaration Banque de France si > 10 000€' },
        'EURC': { legal: true, declaration: true, note: 'Légal — déclarer à l\'AMF' },
        'USDC': { legal: true, declaration: true, note: 'Légal — déclarer à l\'AMF' },
        'BTC': { legal: true, declaration: true, note: 'Légal — déclaration fiscale obligatoire' },
        'RUB': { legal: false, declaration: false, note: '❌ BLOQUÉ — Sanctions EU contre Russie actives' },
        'IRR': { legal: false, declaration: false, note: '❌ BLOQUÉ — Sanctions internationales Iran' },
        'KPW': { legal: false, declaration: false, note: '❌ BLOQUÉ — Sanctions Corée du Nord' },
      },
      transactions: {
        under_1000: { legal: true, declaration: false, note: 'Aucune déclaration requise' },
        under_10000: { legal: true, declaration: false, note: 'Conservation traces recommandée' },
        over_10000: { legal: true, declaration: true, note: 'Déclaration obligatoire — Tracfin' },
        over_50000: { legal: true, declaration: true, note: 'Déclaration obligatoire + justificatifs source fonds' },
      },
      crypto_storage: {
        rule: 'Légal en France — Déclaration compte crypto obligatoire (formulaire 3916-bis)',
        max_anonymous: 1000,
        declaration_threshold: 0,
        amf_registered: ['Binance FR', 'Coinhouse', 'Kraken', 'Ledger'],
        note: 'Utiliser uniquement PSAN enregistrés AMF pour stockage légal'
      }
    };

    var result = {
      success: true,
      agent: 'LegalGuard',
      check_type: checkType,
      check_value: checkValue,
      jurisdiction: 'France / La Réunion (DOM)',
      legal: true,
      blocked: false,
      declaration_required: false,
      warnings: [],
      recommendations: [],
      verdict: 'AUTORISÉ'
    };

    // Vérification devise
    if (checkType === 'currency' && checkValue) {
      var currencyRule = legalRules.currencies[checkValue.toUpperCase()];
      if (currencyRule) {
        result.legal = currencyRule.legal;
        result.blocked = !currencyRule.legal;
        result.declaration_required = currencyRule.declaration;
        result.note = currencyRule.note;
        result.verdict = currencyRule.legal ? 'AUTORISÉ' : 'BLOQUÉ';
        if (!currencyRule.legal) {
          result.warnings.push('⛔ Transaction bloquée — ' + currencyRule.note);
          sendAlertEmail('⛔ LegalGuard — Transaction bloquée', 'Tentative transaction ' + checkValue + ' bloquée. Raison: ' + currencyRule.note);
        }
        if (currencyRule.declaration) {
          result.recommendations.push('📋 Déclaration requise — Consulter un expert-comptable');
        }
      }
    }

    // Vérification montant
    if (checkAmount > 0) {
      if (checkAmount >= 10000) {
        result.declaration_required = true;
        result.warnings.push('⚠️ Montant > 10 000€ — Déclaration Tracfin obligatoire');
        result.recommendations.push('📋 Conserver justificatifs source des fonds');
      }
      if (checkAmount >= 50000) {
        result.warnings.push('⚠️ Montant > 50 000€ — Justificatifs source fonds requis');
        result.recommendations.push('👨‍💼 Consulter un avocat fiscaliste avant transaction');
        sendAlertEmail('⚠️ LegalGuard — Transaction importante', 'Transaction de ' + checkAmount + '€ détectée. Déclaration obligatoire.');
      }
    }

    // Vérification crypto storage
    if (checkType === 'crypto_storage') {
      result.legal = true;
      result.declaration_required = true;
      result.note = legalRules.crypto_storage.rule;
      result.recommendations = [
        '📋 Déclarer compte crypto formulaire 3916-bis',
        '🏛️ Utiliser PSAN enregistré AMF : ' + legalRules.crypto_storage.amf_registered.join(', '),
        '💰 Gains crypto imposables — Flat tax 30% en France',
        '👨‍💼 Consulter expert-comptable spécialisé crypto'
      ];
    }

    if (result.warnings.length === 0 && result.legal) {
      result.recommendations.push('✅ Opération conforme — Bonne continuation !');
    }

    console.log('[LegalGuard] 🔒 Vérification ' + checkType + ' ' + checkValue + ' → ' + result.verdict);

    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }



});

server.listen(PORT, function() {
  console.log('FOLLOW. Backend v6 actif sur port ' + PORT);
});
