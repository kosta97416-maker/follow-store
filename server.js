const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION DES SOURCES ---
// Ton Shopify technique pour le scan JSON
const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";
const SHOPIFY_CATALOG = `${SHOPIFY_URL}/products.json`;

// --- MÉMOIRE VIVE DU SYSTÈME (ÉTAT ACTUEL) ---
let currentOrder = `
    <div style="text-align:center; padding:20px; color:#555;">
        <h2>MODE VEILLE ACTIVE</h2>
        <p>L'Éclaireur scrute les réseaux... En attente de signal.</p>
    </div>
`;
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// --- 📦 AGENT LOGISTIQUE : RECHERCHE PRODUIT SHOPIFY ---
/**
 * Cet agent reçoit un mot-clé et parcourt ton catalogue Shopify
 * pour extraire le produit le plus pertinent.
 */
async function findProductOnShopify(keyword) {
    try {
        const response = await fetch(SHOPIFY_CATALOG);
        if (!response.ok) throw new Error("Impossible de joindre Shopify");
        
        const data = await response.json();
        const searchWord = keyword.toLowerCase();
        
        // Recherche dans le titre, les tags ou la description
        const product = data.products.find(p => 
            p.title.toLowerCase().includes(searchWord) || 
            (p.body_html && p.body_html.toLowerCase().includes(searchWord)) ||
            (p.tags && p.tags.toLowerCase().includes(searchWord))
        );

        if (product) {
            return {
                title: product.title,
                link: `${SHOPIFY_URL}/products/${product.handle}`,
                price: product.variants[0]?.price || "0.00",
                image: product.images[0]?.src || ""
            };
        }
        return null;
    } catch (error) {
        console.error("[AGENT LOGISTIQUE] Erreur :", error.message);
        return null;
    }
}

// --- 📡 ROUTE POUR L'AGENT "ÉCLAIREUR" (ENTRÉE DES ALERTES) ---
/**
 * Route utilisée par l'agent externe (Make.com/Python) 
 * quand il détecte un besoin client sur les réseaux.
 */
app.post('/api/agent-alert', async (req, res) => {
    const { keyword, platform, user_issue, auth } = req.body;

    // Protection par mot de passe (à envoyer dans le body)
    if (auth !== "CEO_FOLLOW") {
        return res.status(403).json({ error: "Accès non autorisé" });
    }

    console.log(`[ALERTE] Besoin détecté sur ${platform} : ${keyword}`);

    // APPEL AUTOMATIQUE À L'AGENT LOGISTIQUE
    const productFound = await findProductOnShopify(keyword);

    if (productFound) {
        // Construction de la "Munition de Vente" pour le Dashboard
        currentOrder = `
            <div style="border: 2px dashed #00ff00; padding: 15px; background: #0a0a0a; color: #00ff00; border-radius: 8px;">
                <h3 style="margin-top:0;">🎯 CIBLE DÉTECTÉE SUR ${platform.toUpperCase()}</h3>
                <p style="color:#aaa; font-size:0.85em; font-style:italic;">"${user_issue}"</p>
                <div style="display:flex; align-items:center; gap:15px; margin-top:10px; background:#1a1a1a; padding:10px; border-radius:5px;">
                    <img src="${productFound.image}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                    <div>
                        <b style="color:white; display:block;">${productFound.title}</b>
                        <span style="color:#00ff00;">Prix : ${productFound.price}€</span>
                    </div>
                </div>
                <div style="margin-top:15px;">
                    <a href="${productFound.link}" target="_blank" style="display:block; text-align:center; background:#00ff00; color:black; padding:10px; text-decoration:none; font-weight:bold; border-radius:4px;">DÉPLOYER LA VENTE</a>
                </div>
            </div>
        `;
        res.status(200).json({ status: "SUCCESS", message: "Produit identifié et poussé sur le Dashboard" });
    } else {
        currentOrder = `
            <div style="border: 2px solid #ff4444; padding: 15px; background: #111; color: #ff4444;">
                <h3>⚠️ ALERTE : PRODUIT NON TROUVÉ</h3>
                <p>Un besoin pour "${keyword}" a été détecté mais n'existe pas en stock.</p>
            </div>
        `;
        res.status(200).json({ status: "WARNING", message: "Aucun produit correspondant dans le Shopify" });
    }
});

// --- ROUTES STANDARDS DU DASHBOARD ---

// Récupérer les données pour l'affichage (index.html)
app.get('/api/get-order', (req, res) => res.status(200).send(currentOrder));
app.get('/api/stats', (req, res) => res.json(currentStats));

// Mise à jour des stats (Shopify/Amazon)
app.post('/api/update-stats', (req, res) => {
    if (req.body.auth === "CEO_FOLLOW") {
        currentStats = { ...currentStats, ...req.body.stats };
        res.sendStatus(200);
    } else {
        res.sendStatus(403);
    }
});

// Servir l'interface utilisateur
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// DÉMARRAGE DU POSTE DE COMMANDE
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` FOLLOW_HQ COMMAND CENTER ONLINE `);
    console.log(` PORT : ${PORT} `);
    console.log(` SOURCE : ${SHOPIFY_URL} `);
    console.log(`=========================================`);
});
