const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5e346a9416msh3835a2ef8542a9ap133da7jsndd267e77175e';
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const parsed = url.parse(req.url, true);
    const action = parsed.query.action;

    // Route SEARCH : Va chercher les produits sur AliExpress
    if (action === 'search') {
        const options = {
            hostname: 'aliexpress-datahub.p.rapidapi.com',
            path: '/item_search_2?q=trending+gadgets&sort=salesDesc',
            method: 'GET',
            headers: { 
                'x-rapidapi-key': RAPIDAPI_KEY, 
                'x-rapidapi-host': 'aliexpress-datahub.p.rapidapi.com' 
            }
        };

        const aliReq = https.request(options, (aliRes) => {
            let data = '';
            aliRes.on('data', c => data += c);
            aliRes.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const products = result.result.resultList.map(i => ({
                        name: i.item.title,
                        image: 'https:' + i.item.image,
                        price: i.item.sku.def.promotionPrice || "19.99",
                        link: 'https:' + i.item.itemUrl
                    }));
                    res.end(JSON.stringify({ success: true, products }));
                } catch (e) {
                    res.end(JSON.stringify({ success: false, products: [] }));
                }
            });
        });
        aliReq.end();
        return;
    }

    // Servir le fichier index.html automatiquement au démarrage
    if (req.url === '/' || req.url === '/index.html') {
        res.setHeader('Content-Type', 'text/html');
        const htmlPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(htmlPath)) {
            return fs.createReadStream(htmlPath).pipe(res);
        }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Offline" }));
});

server.listen(PORT, '0.0.0.0', () => console.log("EMPIRE CORE ONLINE"));

