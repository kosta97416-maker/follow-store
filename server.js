const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration de ta boutique
const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";

// État initial du dashboard
let currentOrder = `<div style="text-align:center; padding:20px; color:#666;"><h3>SYSTÈME EN LIGNE</h3><p>En attente d'une commande...</p></div>`;

// Fonction de récupération simple
async function getProducts() {
    try {
        const response = await fetch(`${SHOPIFY_URL}/products.json?v=${Date.now()}`);
        const data = await response.json();
        return data.products || [];
    } catch (err) {
        console.error("Erreur Shopify:", err);
        return [];
    }
}

// Route principale pour l'IA
app.post('/api/agent-alert', async (req, res) => {
    try {
        const { keyword, auth } = req.body;

        // Vérification de sécurité
        if (auth !== "CEO_FOLLOW") {
            return res.status(403).json({ error: "Non autorisé" });
        }

        const search = keyword.toLowerCase().trim();
        const allProducts = await getProducts();

        // RECHERCHE SIMPLE ET DIRECTE DANS LE TITRE
        const match = allProducts.find(p => p.title.toLowerCase().includes(search));

        if (match) {
            currentOrder = `
                <div style="background:#000; color:#00ff00; border:2px solid #00ff00; padding:15px; border-radius:8px;">
                    <h3 style="margin:0;">PRODUIT TROUVÉ ✅</h3>
                    <p style="margin:5px 0; color:#fff;">${match.title}</p>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${match.images[0]?.src}" style="width:60px; height:60px; object-fit:cover; border:1px solid #333;">
                        <b style="font-size:1.2em;">${match.variants[0].price}€</b>
                    </div>
                    <a href="${SHOPIFY_URL}/products/${match.handle}" target="_blank" style="display:block; margin-top:10px; color:#00ff00; text-decoration:none; font-size:0.9em; border:1px solid #00ff00; text-align:center; padding:5px;">OUVRIR SHOP</a>
                </div>
            `;
            res.json({ status: "OK" });
        } else {
            currentOrder = `
                <div style="color:#ff4444; border:1px solid #ff4444; padding:15px;">
                    ⚠️ AUCUN MATCH POUR : "${search}"
                </div>
            `;
            res.json({ status: "NOT_FOUND" });
        }
    } catch (error) {
        console.error("Crash route alert:", error);
        res.status(500).json({ error: "Erreur serveur interne" });
    }
});

// Routes pour l'affichage
app.get('/api/get-order', (req, res) => res.send(currentOrder));

app.get('/api/stats', (req, res) => {
    res.json({ shopify: "125.00", amazon: "45.50", ai: "12" }); // Stats de démo stables
});

// Servir les fichiers statiques (index.html)
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Lancement du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("Serveur démarré sur le port " + PORT);
});

