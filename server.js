const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ── CONFIGURATION ─────────────────────────────────────────
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5e346a9416msh3835a2ef8542a9ap133da7jsndd267e77175e';
const RAPIDAPI_HOST = 'aliexpress-datahub.p.rapidapi.com';
const CEO_EMAIL = 'karma97416@gmail.com';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const PORT = process.env.PORT || 3000;

// ── GESTION DES FICHIERS (IMAGES) ──────────────────────────
function serveStaticFile(req, res) {
    const assetsPath = path.join(__dirname, 'public', 'assets');
    const filePath = path.join(__dirname, 'public', req.url);
    
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return true;
    }
    return false;
}

// ── SERVEUR PRINCIPAL ──────────────────────────────────────
const server = http.createServer((req, res) => {
    // 1. Gérer les images en priorité
    if (req.url.startsWith('/assets/') || req.url.startsWith('/photo-')) {
        if (serveStaticFile(req, res)) return;
    }

    // 2. Configuration CORS & Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const parsed = url.parse(req.url, true);
    const action = parsed.query.action;

    // 🟢 ACTION : SEARCH (C'est ici que tes 432 photos s'activent)
    if (action === 'search') {
        const assetsPath = path.join(__dirname, 'public', 'assets');
        
        if (!fs.existsSync(assetsPath)) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "Dossier assets introuvable sur GitHub" }));
        }

        fs.readdir(assetsPath, (err, files) => {
            if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: "Erreur lecture dossier" }));
            }

            // On prend TOUTES les photos (photo-xxx.jpg)
            const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i));

            const products = imageFiles.map((filename, index) => {
                return {
                    id: "REAL_" + index,
                    name: "Tendance " + (index + 1),
                    image: "/assets/" + filename, 
                    price: "29.99", // Prix fixe pro
                    rating: 4.8,
                    sales: 150 + index,
                    isWinner: true
                };
            });

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                products: products,
                total: products.length,
                agent: "Follow-Dev-Agent"
            }));
        });
        return;
    }

    // 🔵 ACTION : HEALTH CHECK
    if (action === 'health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', version: 'v7.1-PRO' }));
        return;
    }

    // Si aucune action ne correspond
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Action non reconnue" }));
});

// ── LANCEMENT ─────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FOLLOW. Backend v7.1 [ACTIF] sur port ${PORT}`);
    console.log(`📦 Prêt à scanner le dossier /public/assets`);
});
