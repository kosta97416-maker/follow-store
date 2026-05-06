const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_KEY = "CEO_FOLLOW";

app.use(cors());
app.use(express.json());

app.post('/api/deploy', async (req, res) => {
    const { order, auth } = req.body;
    if (auth !== AUTH_KEY) return res.status(403).json({ error: "Auth invalide" });
    if (!order) return res.status(400).json({ error: "Aucun ordre" });

    let html;
    try {
        html = decodeURIComponent(Buffer.from(order, 'base64').toString('ascii'));
    } catch(e) {
        return res.status(400).json({ error: "Encodage invalide" });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath(),
            headless: 'new',
        });
        const page = await browser.newPage();
        await page.setContent(html);
        await new Promise(r => setTimeout(r, 3000));
        await browser.close();
        res.json({ status: "executed", logs: ["Ordre exécuté"] });
    } catch(err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Backend actif sur port ${PORT}`));
