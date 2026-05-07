const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// CONFIGURATION SOURCE
const SHOPIFY_CATALOG_URL = "https://6bbgv0-f4.myshopify.com/products.json";

// MÉMOIRE DU SERVEUR
let currentOrder = "<h1>MODE VEILLE : EN ATTENTE DE CIBLE</h1>";
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// --- FONCTION INTELLIGENTE : RECHERCHE PRODUIT SUR SHOPIFY ---
async function findProductOnShopify(keyword) {
    try {
        const response = await fetch(SHOPIFY_CATALOG_URL);
        const data = await response.json();
        
        // L'IA cherche le produit qui correspond le mieux au mot-clé
        const product = data.products.find(p => 
            p.title.toLowerCase().includes(keyword.toLowerCase()) || 
            p.body_html.toLowerCase().includes(keyword.toLowerCase())
        );

        if (product) {
            return {
                title: product.title,
                link: `https://6bbgv0-f4.myshopify.com/products/${product.handle}`,
                image: product.images[0]?.src || ""
            };
        }
        return null;
    } catch (error) {
        console.error("Erreur scan Shopify:", error);
        return null;
    }
}

// --- ROUTES API ---

// Réception des ordres et Dispatching
app.post('/api/deploy', async (req, res) => {
    const { order, auth, keyword } = req.body;
    if (auth !== "CEO_FOLLOW") return res.sendStatus(403);

    // Si l'ordre contient un mot-clé, on cherche le produit réel
    if (keyword) {
        const found = await findProductOnShopify(keyword);
        if (found) {
            currentOrder = `
                <div style="text-align:center;">
                    <h2>MUNITION IDENTIFIÉE</h2>
                    <p><b>Produit :</b> ${found.title}</p>
                    <a href="${found.link}" target="_blank" style="background:green;color:white;padding:10px;text-decoration:none;">DÉPLOYER SUR LE CLIENT</a>
                </div>`;
        }
    } else {
        currentOrder = decodeURIComponent(atob(order));
    }

    res.status(200).json({ status: "SUCCESS" });
});

app.get('/api/get-order', (req, res) => res.status(200).send(currentOrder));
app.get('/api/stats', (req, res) => res.json(currentStats));

// SERVIR LE DASHBOARD (INDEX.HTML)
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`COMMAND CENTER READY : PORT ${PORT}`);
    console.log(`SOURCE CONNECTÉE : ${SHOPIFY_CATALOG_URL}`);
    console.log(`-----------------------------------------`);
});
