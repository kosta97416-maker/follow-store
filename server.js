const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION ---
const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";
const SHOPIFY_CATALOG = `${SHOPIFY_URL}/products.json`;

// --- MÉMOIRE VIVE ---
let currentOrder = `
    <div style="text-align:center; padding:20px; color:#555; border: 1px dashed #333;">
        <h3>MODE VEILLE INTERNATIONALE</h3>
        <p>L'Éclaireur scanne le monde... En attente de signal.</p>
    </div>
`;
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// --- 📦 AGENT LOGISTIQUE (RECHERCHE INTELLIGENTE ET MULTILINGUE) ---
async function findProductOnShopify(keyword) {
    try {
        console.log(`[LOGISTIQUE] Recherche de : ${keyword}`);
        const response = await fetch(SHOPIFY_CATALOG, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await response.json();
        
        if (!data.products || data.products.length === 0) return null;

        // Nettoyage : On transforme la phrase en une liste de mots clés importants (> 2 lettres)
        // Cela permet de trouver "Filtre" même si l'IA envoie "Water Filter System"
        const searchTerms = keyword.toLowerCase()
            .replace(/[^\w\s]/gi, '') 
            .split(' ')
            .filter(word => word.length > 2);

        // On parcourt les produits Shopify
        const product = data.products.find(p => {
            const title = (p.title || "").toLowerCase();
            const body = (p.body_html || "").toLowerCase();
            const tags = (p.tags || "").toLowerCase();
            const fullText = title + " " + body + " " + tags;
            
            // Si AU MOINS UN des mots clés importants correspond, c'est un match
            return searchTerms.some(term => fullText.includes(term));
        });

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
        console.error("[LOGISTIQUE] Erreur scan :", error);
        return null;
    }
}

// --- 📡 ROUTE POUR L'AGENT "ÉCLAIREUR" ---
app.post('/api/agent-alert', async (req, res) => {
    const { keyword, platform, user_issue, auth, language } = req.body;

    // Sécurité
    if (auth !== "CEO_FOLLOW") {
        return res.status(403).json({ error: "Accès refusé" });
    }

    console.log(`[ALERTE] Signal reçu (${platform}) - Langue: ${language || 'Inconnue'}`);

    // Appel à la Logistique
    const productFound = await findProductOnShopify(keyword);

    if (productFound) {
        // Préparation du bloc "Vente" pour le Dashboard
        currentOrder = `
            <div style="border: 2px solid #00ff00; padding: 15px; background: #000; color: #00ff00; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">🎯 CIBLE DÉTECTÉE : ${platform.toUpperCase()}</h3>
                    <span style="background:#00ff00; color:black; padding:2px 6px; font-size:0.7em; font-weight:bold; border-radius:3px;">
                        ${language ? language.toUpperCase() : 'INTL'}
                    </span>
                </div>
                <p style="color:#eee; font-size:0.85em; margin:10px 0; border-left: 2px solid #444; padding-left:10px;">
                    <i>"${user_issue}"</i>
                </p>
                <div style="display:flex; align-items:center; gap:15px; background:#111; padding:10px; border-radius:5px; border: 1px solid #333;">
                    <img src="${productFound.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <div>
                        <b style="color:white; display:block; font-size:0.9em;">${productFound.title}</b>
                        <span style="color:#00ff00; font-weight:bold;">${productFound.price}€</span>
                    </div>
                </div>
                <div style="margin-top:15px;">
                    <a href="${productFound.link}" target="_blank" style="display:block; text-align:center; background:#00ff00; color:black; padding:10px; text-decoration:none; font-weight:bold; border-radius:4px; text-transform:uppercase; font-size:0.9em;">
                        Envoyer Réponse (Traduit)
                    </a>
                </div>
            </div>
        `;
        res.status(200).json({ status: "SUCCESS" });
    } else {
        currentOrder = `
            <div style="border: 1px solid #ff4444; padding: 15px; background: #111; color: #ff4444;">
                <h3 style="margin:0;">⚠️ PRODUIT NON TROUVÉ</h3>
                <p style="font-size:0.8em;">L'IA a détecté un besoin pour "${keyword}" mais rien n'est en stock.</p>
            </div>
        `;
        res.status(200).json({ status: "NOT_FOUND" });
    }
});

// --- ROUTES DASHBOARD ---
app.get('/api/get-order', (req, res) => res.send(currentOrder));

app.get('/api/stats', (req, res) => res.json(currentStats));

app.post('/api/update-stats', (req, res) => {
    if (req.body.auth === "CEO_FOLLOW") {
        currentStats = { ...currentStats, ...req.body.stats };
        res.sendStatus(200);
    } else {
        res.sendStatus(403);
    }
});

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// LANCEMENT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`
    =========================================
    FOLLOW_HQ : SYSTÈME INTERNATIONAL ACTIF
    PORT: ${PORT}
    RECHERCHE SOUPLE : ACTIVÉE
    =========================================
    `);
});

