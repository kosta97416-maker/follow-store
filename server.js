const express = require('express');
const cors = require('cors');
const app = express();

// Configuration des CORS pour autoriser ton site Vercel sans restrictions
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let currentOrder = "<h1>EN ATTENTE D'INSTRUCTIONS CEO</h1>";
let currentStats = { shopify: "0.00", amazon: "0.00", ai: "0.00" };

// ROUTE 1 : RECEPTION DE L'ORDRE (Dashboard -> Cuisine)
app.post('/api/deploy', (req, res) => {
    const { order, auth } = req.body;
    
    if (auth !== "CEO_FOLLOW") {
        console.log("Tentative d'accès non autorisée.");
        return res.status(403).send("Accès refusé");
    }

    try {
        // Décodage du Base64 envoyé par le Dashboard
        const decodedHtml = decodeURIComponent(atob(order));
        currentOrder = decodedHtml;
        console.log("Nouvel ordre reçu et stocké.");
        res.status(200).json({ status: "SUCCESS" });
    } catch (err) {
        console.error("Erreur de décodage:", err);
        res.status(500).json({ status: "ERROR" });
    }
});

// ROUTE 2 : LECTURE DE L'ORDRE (Agents -> Cuisine)
app.get('/api/get-order', (req, res) => {
    res.status(200).send(currentOrder);
});

// ROUTE 3 : STATS LIVE
app.get('/api/stats', (req, res) => {
    res.json(currentStats);
});

// Port dynamique pour Render (10000 par défaut)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`CUISINE ACTIVE SUR LE PORT ${PORT}`);
});
