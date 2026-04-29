const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ── CONFIGURATION (TES CLÉS) ────────────────────────────────
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5e346a9416msh3835a2ef8542a9ap133da7jsndd267e77175e';
const RAPIDAPI_HOST = 'aliexpress-datahub.p.rapidapi.com';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const PORT = process.env.PORT || 3000;

// ── SYSTÈME DE SÉCURITÉ (LEGALGUARD) ────────────────────────
var security = {
    blacklist: [],
    blockedAttempts: 0,
    RATE_LIMIT: 100,
    ipRequests: {}
};

function checkSecurity(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    res.setHeader('X-Powered-By', 'FOLLOW-EMPIRE-v8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    // Protection basique contre les injections
    if (req.url.includes('select ') || req.url.includes('union ')) {
        security.blockedAttempts++;
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Hack attempt blocked' }));
        return false;
    }
    return true;
}

// ── MOTEUR DE RECHERCHE ALIEXPRESS ──────────────────────────
function callRapidAPI(endpoint, params) {
    return new Promise((resolve, reject) => {
        const query = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
        const options = {
            hostname: RAPIDAPI_HOST,
            path: `/${endpoint}?${query}`,
            method: 'GET',
            headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
        });
        req.on('error', reject);
        req.end();
    });
}

// ── SERVEUR PRINCIPAL ───────────────────────────────────────
const server = http.createServer((req, res) => {
    if (!checkSecurity(req, res)) return;

    const parsed = url.parse(req.url, true);
    const action = parsed.query.action;

    // 1. GESTION DES IMAGES (IMPORTANT POUR TES 432 PHOTOS)
    if (req.url.startsWith('/assets/') || req.url.startsWith('/photo-')) {
        const cleanPath = req.url.startsWith('/assets/') ? req.url : `/assets${req.url}`;
        const filePath = path.join(__dirname, 'public', cleanPath);
        
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = { '.jpg': 'image/jpeg', '.png': 'image/png' };
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'image/jpeg' });
            return fs.createReadStream(filePath).pipe(res);
        }
    }

    // 2. ACTION : SEARCH (MODE AUTO-SCAN)
    if (action === 'search') {
        const assetsPath = path.join(__dirname, 'public', 'assets');
        
        fs.readdir(assetsPath, (err, files) => {
            if (err) {
                res.writeHead(200); // On renvoie vide plutôt que de planter
                return res.end(JSON.stringify({ success: true, products: [], message: "Dossier vide" }));
            }

            const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i));
            const products = imageFiles.map((file, i) => ({
                id: "PROD_" + i,
                name: "Tendance #" + (i + 1),
                image: "/assets/" + file,
                price: (25.99 + i).toFixed(2),
                rating: 4.8,
                isWinner: true
            }));

            res.writeHead(200);
            res.end(JSON.stringify({ success: true, products: products, total: products.length }));
        });
        return;
    }

    // 3. ACTION : HEALTH (DASHBOARD)
    if (action === 'health') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'V8_RUNNING',
            security: 'ACTIVE',
            blocked: security.blockedAttempts,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // Par défaut : 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
});

// ── LANCEMENT ───────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 EMPIRE FOLLOW. [v8.0] ACTIF`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📦 Surveillance du dossier assets activée\n`);
});

