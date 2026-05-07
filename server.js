const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";

let currentOrder = `<div style="text-align:center; padding:20px; color:#555;"><h3>IA EN ATTENTE</h3></div>`;
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// --- 🧠 LE CERVEAU "GOOGLE SURVIE" (Base de connaissances) ---
// On définit des "familles" de produits pour que l'IA comprenne les concepts
const SEMANTIC_BRAIN = {
    "eau": ["filter", "purifier", "paille", "lifestraw", "straw", "gourde", "aquatabs", "hydratation"],
    "feu": ["magnesium", "starter", "allume", "briquet", "lighter", "flame", "étincelle", "flint"],
    "abri": ["tarp", "tent", "tente", "couverture", "survival blanket", "bivouac", "hamac"],
    "lumiere": ["lampe", "flashlight", "torch", "led", "solaire", "panneau"],
    "soin": ["medical", "first aid", "pansement", "secours", "bandage", "désinfectant"],
    "outil": ["couteau", "knife", "hache", "multitool", "pince", "scie", "saw"]
};

async function getShopifyProducts() {
    try {
        const response = await fetch(`${SHOPIFY_URL}/products.json?v=${Date.now()}`);
        const data = await response.json();
        return data.products || [];
    } catch (e) {
        return [];
    }
}

app.post('/api/agent-alert', async (req, res) => {
    const { keyword, auth } = req.body;
    if (auth !== "CEO_FOLLOW") return res.sendStatus(403);

    const userInput = keyword.toLowerCase().trim();
    const products = await getShopifyProducts();

    // --- ANALYSE SÉMANTIQUE ---
    // On crée une liste de mots-clés "élargie"
    let extendedKeywords = [userInput];
    
    for (let concept in SEMANTIC_BRAIN) {
        // Si l'utilisateur tape "eau", on ajoute "filter", "purifier", etc.
        if (userInput.includes(concept)) {
            extendedKeywords = [...extendedKeywords, ...SEMANTIC_BRAIN[concept]];
        }
    }

    console.log("🧠 IA pense à :", extendedKeywords);

    // --- RECHERCHE INTELLIGENTE ---
    let match = products.find(p => {
        const title = p.title.toLowerCase();
        const tags = (p.tags || "").toLowerCase();
        const description = (p.body_html || "").toLowerCase();
        const allText = title + " " + tags + " " + description;

        // On vérifie si UN des mots de notre cerveau sémantique est dans le produit
        return extendedKeywords.some(word => allText.includes(word));
    });

    if (match) {
        currentOrder = `
            <div style="background:#000; color:#00ff00; border:2px solid #00ff00; padding:15px; border-radius:10px; font-family:sans-serif;">
                <div style="font-size:0.7em; opacity:0.6;">INTELLIGENCE SÉMANTIQUE : MATCH ✅</div>
                <h3 style="margin:5px 0;">${match.title}</h3>
                <div style="display:flex; gap:10px; background:#111; padding:10px; border-radius:5px;">
                    <img src="${match.images[0]?.src}" style="width:60px; height:60px; object-fit:cover;">
                    <div>
                        <b style="color:#fff;">${match.variants[0].price}€</b><br>
                        <a href="${SHOPIFY_URL}/products/${match.handle}" target="_blank" style="color:#00ff00; font-size:0.8em;">VOIR SUR SHOP</a>
                    </div>
                </div>
            </div>
        `;
        res.json({ status: "OK" });
    } else {
        currentOrder = `<div style="color:#ff4444; border:1px solid #ff4444; padding:15px;">⚠️ IA : Aucun concept correspondant à "${userInput}" trouvé.</div>`;
        res.json({ status: "NOT_FOUND" });
    }
});

app.get('/api/get-order', (req, res) => res.send(currentOrder));
app.get('/api/stats', (req, res) => res.json(currentStats));
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(process.env.PORT || 10000, () => console.log("CERVEAU SÉMANTIQUE EN LIGNE"));
