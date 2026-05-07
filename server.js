const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";
const SHOPIFY_CATALOG = `${SHOPIFY_URL}/products.json`;

let currentOrder = `<div style="text-align:center; padding:20px; color:#555;"><h3>IA ANALYSTE EN LIGNE</h3></div>`;
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// --- 🧭 LA MATRICE DE CONNAISSANCE (L'IA comprend les synonymes) ---
const survivalKnowledge = {
    "feu": ["fire", "starter", "magnesium", "flint", "match", "allume", "briquet", "lighter"],
    "eau": ["water", "purifier", "filter", "straw", "paille", "purification", "drink", "aquatabs"],
    "abri": ["tent", "tarp", "bivouac", "shelter", "couverture", "blanket", "sleeping", "dodo"],
    "lumiere": ["lamp", "flashlight", "torch", "led", "eclairage", "lumineux"],
    "outil": ["knife", "multitool", "couteau", "hache", "saw", "scie", "pelle", "shovel"],
    "soin": ["medkit", "first aid", "pansement", "bandage", "desinfectant", "medical"]
};

async function findProductOnShopify(userInput) {
    try {
        const response = await fetch(SHOPIFY_CATALOG, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await response.json();
        if (!data.products) return null;

        const input = userInput.toLowerCase();
        let extendedSearch = [input];

        // L'IA scanne sa base de connaissance pour ajouter des mots-clés techniques
        for (let category in survivalKnowledge) {
            if (input.includes(category)) {
                extendedSearch = [...extendedSearch, ...survivalKnowledge[category]];
            }
        }

        console.log("🧠 IA analyse l'intention. Mots-clés techniques retenus :", extendedSearch);

        // Recherche dans le catalogue Shopify
        return data.products.find(p => {
            const productData = (p.title + " " + (p.body_html || "") + " " + (p.tags || "")).toLowerCase();
            // Si le catalogue contient n'importe lequel de nos mots techniques -> MATCH
            return extendedSearch.some(term => productData.includes(term));
        });

    } catch (error) { return null; }
}

app.post('/api/agent-alert', async (req, res) => {
    const { keyword, user_issue, auth } = req.body;
    if (auth !== "CEO_FOLLOW") return res.sendStatus(403);

    // On analyse la phrase complète pour plus de précision
    const query = user_issue || keyword;
    const product = await findProductOnShopify(query);

    if (product) {
        currentOrder = `
            <div style="border: 2px solid #00ff00; padding: 15px; background: #000; color: #00ff00; border-radius: 8px;">
                <div style="font-size:0.7em; margin-bottom:5px; opacity:0.7;">ANALYSE SÉMANTIQUE RÉUSSIE ✅</div>
                <h3 style="margin:0;">🎯 PRODUIT : ${product.title}</h3>
                <div style="display:flex; gap:10px; margin-top:10px; background:#111; padding:8px; border-radius:4px;">
                    <img src="${product.images?.[0]?.src || ''}" style="width:50px; height:50px; object-fit:cover; border-radius:3px;">
                    <div>
                        <span style="display:block; color:white; font-weight:bold;">${product.variants[0]?.price}€</span>
                        <a href="${SHOPIFY_URL}/products/${product.handle}" target="_blank" style="color:#00ff00; font-size:0.8em; text-decoration:none;">VOIR LA FICHE</a>
                    </div>
                </div>
                <button style="width:100%; margin-top:10px; background:#00ff00; color:black; border:none; padding:8px; font-weight:bold; cursor:pointer;">ENVOYER AU CLIENT</button>
            </div>
        `;
        res.json({ status: "SUCCESS" });
    } else {
        currentOrder = `
            <div style="border: 1px solid #444; padding:15px; text-align:center; color:#888;">
                <p>🔍 IA : Je comprends le besoin pour "${query}"</p>
                <p style="font-size:0.8em;">Mais aucun produit de ce type n'est présent dans le catalogue Shopify.</p>
            </div>
        `;
        res.json({ status: "NOT_FOUND" });
    }
});

// --- ROUTES STANDARDS ---
app.get('/api/get-order', (req, res) => res.send(currentOrder));
app.get('/api/stats', (req, res) => res.json(currentStats));
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`CERVEAU SÉMANTIQUE ACTIF`));
