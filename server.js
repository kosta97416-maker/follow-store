const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION SOURCES ---
const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";
const SHOPIFY_CATALOG = `${SHOPIFY_URL}/products.json`;

// --- MÉMOIRE VIVE DU SYSTÈME ---
let currentOrder = "<h1>MODE VEILLE : ÉCOUTE DES RÉSEAUX ACTIVE</h1>";
let lastAlert = { agent: "SYSTEM", message: "Initialisation terminée..." };
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// --- 📦 AGENT LOGISTIQUE : SCANNER SHOPIFY ---
async function findProductOnShopify(keyword) {
    try {
        const response = await fetch(SHOPIFY_CATALOG);
        const data = await response.json();
        
        // Recherche intelligente par mot-clé dans les titres ou descriptions
        const product = data.products.find(p => 
            p.title.toLowerCase().includes(keyword.toLowerCase()) || 
            p.body_html.toLowerCase().includes(keyword.toLowerCase())
        );

        if (product) {
            return {
                title: product.title,
                link: `${SHOPIFY_URL}/products/${product.handle}`,
                price: product.variants[0]?.price || "N/A",
                image: product.images[0]?.src || ""
            };
        }
        return null;
    } catch (error) {
        console.error("[LOGISTIQUE] Erreur scan Shopify:", error);
        return null;
    }
}

// --- 📡 ROUTE POUR L'AGENT "ÉCLAIREUR" (Point d'entrée des alertes réseaux) ---
app.post('/api/agent-alert', async (req, res) => {
    const { keyword, platform, user_issue, auth } = req.body;

    // Sécurité : Seuls tes agents peuvent poster ici
    if (auth !== "CEO_FOLLOW") return res.sendStatus(403);

    console.log(`[ÉCLAIREUR] Alerte reçue de ${platform}: ${user_issue}`);
    lastAlert = { agent: "ÉCLAIREUR", message: `Besoin détecté sur ${platform}: ${keyword}` };

    // APPEL AUTOMATIQUE À L'AGENT LOGISTIQUE
    const productFound = await findProductOnShopify(keyword);

    if (productFound) {
        // Préparation de la page de vente pour l'agent CLOSER
        currentOrder = `
            <div style="border: 2px solid #00ff00; padding: 15px; background: #111; color: #00ff00;">
                <h3 style="margin:0;">🎯 CIBLE IDENTIFIÉE (${platform})</h3>
                <p style="color:white; font-size:0.8em;">Problème client : "${user_issue}"</p>
                <hr style="border:0.5px solid #333;">
                <p><b>Munition suggérée :</b> ${productFound.title}</p>
                <p><b>Prix :</b> ${productFound.price}€</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <a href="${productFound.link}" target="_blank" style="background:#00ff00; color:black; padding:8px; text-decoration:none; font-weight:bold; flex:1; text-align:center;">VOIR PRODUIT</a>
                    <button style="background:white; color:black; padding:8px; border:none; flex:1; cursor:pointer; font-weight:bold;">ENVOYER AU CLOSER</button>
                </div>
            </div>
        `;
    } else {
        currentOrder = `<h3>⚠️ BESOIN DÉTECTÉ MAIS PRODUIT MANQUANT</h3><p>Mots-clés: ${keyword}</p>`;
    }

    res.status(200).json({ status: "DISPATCHED" });
});

// --- ROUTES STANDARDS ---

// Pour mettre à jour les chiffres (Shopify/Amazon)
app.post('/api/update-stats', (req, res) => {
    if (req.body.auth === "CEO_FOLLOW") {
        currentStats = { ...currentStats, ...req.body.stats };
        res.sendStatus(200);
    } else {
        res.sendStatus(403);
    }
});

app.get('/api/get-order', (req, res) => res.status(200).send(currentOrder));
app.get('/api/stats', (req, res) => res.json(currentStats));

// SERVIR LE DASHBOARD
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// LANCEMENT DU SERVEUR
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`
    =========================================
    FOLLOW_HQ MULTI-AGENT HUB READY
    PORT: ${PORT}
    SHOPIFY: ${SHOPIFY_URL}
    =========================================
    `);
});
