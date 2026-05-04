const axios = require('axios');

// 1. Fonction pour aspirer AliExpress via ZenRows
async function scrapeAli(productUrl) {
    const zenRowsUrl = `https://api.zenrows.com/v1/?key=${process.env.ZENROWS_API_KEY}&url=${encodeURIComponent(productUrl)}&js_render=true`;
    try {
        const response = await axios.get(zenRowsUrl);
        return response.data; // Renvoie le contenu propre pour tes agents
    } catch (error) {
        console.error("ZenRows a bloqué ou URL invalide");
    }
}

// 2. Fonction pour envoyer le winner vers ton Shopify follow-9096
async function sendToShopify(productData) {
    const url = `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2024-04/products.json`;
    
    const payload = {
        product: {
            title: productData.title,
            body_html: `<strong>Sélection Premium par Follow Trend</strong>`,
            vendor: "AliExpress Auto",
            images: [{ src: productData.imageUrl }],
            variants: [{ price: productData.price, inventory_management: "shopify" }]
        }
    };

    return await axios.post(url, payload, {
        headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN }
    });
}

// Export pour que tes 13 agents puissent l'utiliser
module.exports = { scrapeAli, sendToShopify };
