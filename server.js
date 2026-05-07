const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- BASE DE DONNÉES EN MÉMOIRE ---
// Au démarrage, tout est à zéro.
let currentOrder = "<h1>SYSTEM READY - WAITING FOR CEO INSTRUCTIONS</h1>";
let currentStats = { 
    shopify: "0.00", 
    amazon: "0.00", 
    ai: "0.00" 
};

// --- ROUTES API ---

// 1. Recevoir un nouvel ordre (Depuis ton Dashboard)
app.post('/api/deploy', (req, res) => {
    const { order, auth } = req.body;
    if (auth !== "CEO_FOLLOW") return res.sendStatus(403);
    try {
        currentOrder = decodeURIComponent(atob(order));
        res.status(200).json({ status: "SUCCESS" });
    } catch (err) {
        res.status(500).json({ status: "ERROR" });
    }
});

// 2. Lire l'ordre (Pour tes agents ou ton site public)
app.get('/api/get-order', (req, res) => {
    res.status(200).send(currentOrder);
});

// 3. Lire les statistiques
app.get('/api/stats', (req, res) => {
    res.json(currentStats);
});

// --- SERVRE L'INTERFACE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`FOLLOW_HQ ACTIVE ON PORT ${PORT}`));
