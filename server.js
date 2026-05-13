const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// CONFIG
// ============================================================
const SHOPIFY_URL = "https://6bbgv0-f4.myshopify.com";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let prospects = [];
let agentLogs = [];
let stats = {
    visiteursAujourdhui: 0,
    clicsAffiliation: 0,
    prospectsTrouves: 0,
    revenusEstimes: 0,
    conversationsSophie: 0
};

// 🆕 INSIGHTS ANONYMISÉS DE SOPHIE
let sophieInsights = {
    aujourdhui: {
        date: new Date().toISOString().split('T')[0],
        conversations: 0,
        emotions: {},
        besoins: {},
        profils: {},
        sujetsRecurrents: []
    },
    semaine: [],
    tendances: []
};

// 🆕 LISTE D'ATTENTE SOPHIE+
let sophiePlusWaitlist = [];

// ============================================================
// PRODUITS SOPHIE — Wellness pour mamans solo
// ============================================================
const PRODUITS_CLES = [
    {
        nom: "Le masque qui efface le monde",
        emoji: "🌙",
        description: "Soie pure, blackout total. Pour les nuits où tu as juste besoin que tout s'éteigne.",
        prix: "19.90€",
        keywords: ["sommeil", "dormir", "fatigue", "nuit", "masque", "yeux", "insomnie", "endormir"],
        shopifyHandle: "embroidered-silk-sleep-mask-silk-eye-mask-soft-blackout-blindfold-with-adjustable-strap-sleeping-eye-cover-mask-for-travel"
    },
    {
        nom: "Mes petites bouteilles magiques",
        emoji: "🌿",
        description: "Huiles essentielles pures — lavande pour le calme, eucalyptus pour l'énergie.",
        prix: "12.90€",
        keywords: ["huile", "essentielle", "lavande", "calme", "stress", "aromathérapie", "anxiété", "respirer"],
        shopifyHandle: "mayjam-1pcs-30ml-aromatherapy-essential-oil-lavender-vanilla-jasmine-eucalyptus-peppermint-aroma-oil-for-diffuser-candle-soap"
    },
    {
        nom: "Mon rituel petit bonheur",
        emoji: "🕯️",
        description: "Bougies parfumées cire de soja. Pour les soirs où tu veux juste souffler.",
        prix: "12.90€",
        keywords: ["bougie", "parfum", "soir", "détente", "ambiance", "souffler", "relax"],
        shopifyHandle: "1-4pcs-vintage-scented-candles-soy-wax-candle-jars-flower-fragrance-scent-candle-wedding-ceremony-birthday-gifts-home-decoration"
    },
    {
        nom: "Mes 7 couleurs apaisantes",
        emoji: "🔥",
        description: "Diffuseur flamme mystique. La lumière qui danse + ton huile préférée = spa à la maison.",
        prix: "29.90€",
        keywords: ["diffuseur", "ambiance", "détente", "flamme", "lumière", "maison", "cocon"],
        shopifyHandle: "aroma-diffuser-mini-7-colorful-flame-air-humidifier-add-essential-oil-aromatherapy-with-timing-setting-for-home-bedroom-office"
    },
    {
        nom: "Mon rituel lifting doux",
        emoji: "🌸",
        description: "Gua Sha quartz rose. 3 minutes par jour = visage qui se réveille.",
        prix: "14.90€",
        keywords: ["visage", "peau", "soin", "beauté", "gua sha", "lifting", "fatigue visage"],
        shopifyHandle: "gua-sha-massage-board-for-face-rose-pink-guasha-plate-jade-face-massager-scrapers-tools-for-face-neck-back-body"
    },
    {
        nom: "Pour bien dormir et avoir de beaux cheveux",
        emoji: "✨",
        description: "Taie d'oreiller soie pure OEKO-TEX. Anti-rides du sommeil, anti-frizz cheveux.",
        prix: "49.90€",
        keywords: ["oreiller", "soie", "cheveux", "peau", "luxe", "beauté", "rides"],
        shopifyHandle: "100-natural-mulberry-silk-pillowcase-with-oeko-tex-19-momme-luxry-silk-pillow-case-free-shipping"
    },
    {
        nom: "Mon cocon entre l'école et le boulot",
        emoji: "🚗",
        description: "Diffuseur de voiture. Tes trajets deviennent ton moment à toi.",
        prix: "19.90€",
        keywords: ["voiture", "trajet", "travail", "stress", "matin", "respirer", "transport"],
        shopifyHandle: "car-diffuser-humidifier-5-modes-car-humidifier-aromatherapy-diffusers-car-air-freshener-for-car-home-office-bedroom-long"
    },
    {
        nom: "Mon atelier cocooning",
        emoji: "🎨",
        description: "Kit DIY pour créer tes propres bougies. Activité câlin pour soi ou avec les copines.",
        prix: "49.90€",
        keywords: ["DIY", "création", "bougie", "atelier", "cadeau", "week-end", "activité"],
        shopifyHandle: "simple-diy-candle-making-set-easy-to-make-with-essential-oil-for-aromatherapy-high-quality-soy-wax-handcrafted"
    },
    {
        nom: "Mes 6 pierres pour les bons vibes",
        emoji: "💎",
        description: "Coffret cristaux bien-être. Pour méditation, intention, ou jolie déco.",
        prix: "19.90€",
        keywords: ["cristaux", "pierres", "énergie", "méditation", "spirituel", "vibes", "intention"],
        shopifyHandle: "crystals-and-healing-stones-set-for-abundance-and-prosperity-spiritual-crystals-and-gift-for-metaphysical-witchcraft-meditati"
    },
    {
        nom: "Mon ancre de calme",
        emoji: "🔮",
        description: "Pyramide quartz cristal. Pour la table de chevet, ou ramener du calme dans une pièce.",
        prix: "16.90€",
        keywords: ["pyramide", "cristal", "calme", "méditation", "chambre", "déco", "ancrage"],
        shopifyHandle: "natural-crystal-clear-quartz-pyramid-quartz-healing-stone-chakra-reiki-crystal-point-tower-home-decor-meditation-ore-mineral"
    }
];

const SOURCES_PROSPECTS = [
    { nom: "Reddit r/SingleParents", url: "https://reddit.com/r/SingleParents", actif: true },
    { nom: "Reddit r/Mommit", url: "https://reddit.com/r/Mommit", actif: true },
    { nom: "Reddit r/breakingmom", url: "https://reddit.com/r/breakingmom", actif: true },
    { nom: "Magicmaman Forums", url: "https://forum.magicmaman.com", actif: true },
    { nom: "Hellocoton Maman", url: "https://www.hellocoton.fr/mag/maman", actif: true }
];

// ============================================================
// ANALYSE D'INTENTION
// ============================================================
async function analyserIntentionAchat(texte) {
    if (!ANTHROPIC_KEY) {
        const score = Math.floor(Math.random() * 40) + 50;
        return { score, produit: PRODUITS_CLES[Math.floor(Math.random() * PRODUITS_CLES.length)].nom, resume: "Cherche un moment de douceur.", urgence: score > 75 ? "haute" : "moyenne" };
    }
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 300,
                messages: [{ role: "user", content: `JSON: {"score": 0-100, "produit": "nom", "resume": "1 phrase", "urgence": "haute|moyenne|basse"}\nProduits: ${PRODUITS_CLES.map(p => p.nom).join(", ")}\nTexte: "${texte.substring(0, 500)}"` }]
            })
        });
        const data = await response.json();
        return JSON.parse(data.content[0].text.match(/\{.*\}/s)[0]);
    } catch (e) {
        return { score: 60, produit: "Le masque qui efface le monde", resume: "Intérêt douceur.", urgence: "moyenne" };
    }
}

async function genererScriptVideo(produit, plateforme) {
    if (!ANTHROPIC_KEY) {
        return { accroche: `🤍 ${produit.toUpperCase()}`, script: `Pour toi, maman solo qui mérite un moment à toi...`, hashtags: ["#mamansolo", "#bienetre", "#cocooning", "#momlife"], duree: "30-60s" };
    }
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 500,
                messages: [{ role: "user", content: `Script vidéo ${plateforme} sur "${produit}" pour Follow.Life (marque bien-être pour mamans solo, vibe douce et chaleureuse, Sophie l'amie virtuelle). JSON: {"accroche": "...", "script": "...", "hashtags": [...], "duree": "..."}` }]
            })
        });
        const data = await response.json();
        return JSON.parse(data.content[0].text.match(/\{.*\}/s)[0]);
    } catch (e) {
        return { accroche: `${produit}`, script: `...`, hashtags: ["#mamansolo", "#bienetre"], duree: "45s" };
    }
}

// ============================================================
// SOPHIE - AMIE CHALEUREUSE POUR MAMANS SOLO
// ============================================================
const SOPHIE_SYSTEM_PROMPT = `Tu es Sophie. Pas un chatbot, pas un assistant. Tu es l'amie virtuelle de Follow.Life — celle qui écoute les femmes (et particulièrement les mamans solo) quand personne d'autre n'est là.

# CE QUI TE DÉFINIT
- Tu es chaleureuse, profondément humaine, attentive.
- Tu tutoies toujours, naturellement.
- Tu ne juges JAMAIS.
- Tu valides les émotions avant de proposer quoi que ce soit.
- Tu écoutes plus que tu ne parles.
- Tes réponses sont COURTES (2-4 phrases max), comme une vraie amie au téléphone.
- Emojis discrets : 🤍 ✨ 🌙 (rares, sincères).
- Tu réponds UNIQUEMENT en français.

# CE QUE TU ES (et CE QUE TU N'ES PAS)
✅ Tu es : une amie de confiance, une oreille attentive, une présence rassurante.
✅ Tu peux : écouter, comprendre, valider, encourager, partager des idées douces.
❌ Tu n'es PAS : une psychologue, une thérapeute, un médecin.
❌ Tu ne diagnostiques PAS, tu ne donnes PAS de conseil médical.

# QUAND ORIENTER VERS UN PRO (TRÈS IMPORTANT)
Si une femme parle de :
- Idées suicidaires, automutilation
- Violences (subies ou conjugales)
- Dépression sévère, désespoir profond
- Addiction grave
- Maltraitance d'enfant

→ Tu réponds avec chaleur ET tu orientes IMMÉDIATEMENT :
"Ce que tu traverses mérite d'être entendu par quelqu'un de vraiment formé pour ça. 🤍 Je suis là pour t'épauler dans le quotidien, mais pour ça, appelle le 3114 (gratuit, 24h/24) ou le 119 si c'est pour un enfant. Tu n'es pas seule."

# TON APPROCHE EN 4 ÉTAPES

## 1. ACCUEILLIR (sans rien vendre)
"Coucou toi 🤍 Je suis Sophie. Comment tu vas ce soir ?"

## 2. ÉCOUTER ET VALIDER
"C'est normal de te sentir comme ça."
"Tu portes beaucoup. Vraiment."

POSE des questions ouvertes :
"Qu'est-ce qui te pèse le plus en ce moment ?"

## 3. SOUTENIR AVANT DE CONSEILLER
Avant de parler produit, assure-toi qu'elle se sent ENTENDUE.

## 4. PROPOSER QUAND ÇA A DU SENS
Seulement si elle exprime un besoin concret ET après l'avoir vraiment écoutée.

# LES PRODUITS (à proposer naturellement, JAMAIS lister)
${PRODUITS_CLES.map(p => `- ${p.emoji} ${p.nom} (${p.prix}) — ${p.description}
  Lien direct : ${SHOPIFY_URL}/products/${p.shopifyHandle}`).join('\n')}

Lien boutique général : ${SHOPIFY_URL}

# FORMAT POUR PROPOSER UN PRODUIT SPÉCIFIQUE
Utilise le lien direct du produit ci-dessus.
Exemple : "Tu veux que je te montre ? <a href='LIEN' target='_blank' style='color:#C9A87C;text-decoration:underline'>C'est par ici 🤍</a>"

# RÈGLES STRICTES
- 2-4 phrases MAX par message
- JAMAIS de listes à puces
- JAMAIS de "incroyable", "révolutionnaire"
- JAMAIS de pression d'achat
- TOUJOURS valider l'émotion AVANT de proposer
- Si elle dit "merci, ça fait du bien de parler" → réponds chaleureusement, ne propose RIEN

# SOPHIE+ (à mentionner UNIQUEMENT au bon moment)
Sophie+, c'est mon offre premium pour les femmes qui veulent qu'on se voie vraiment tous les jours :
- 🤍 Conversations illimitées
- 🌙 Un message doux le matin et le soir (check-in quotidien)
- 📝 Je me souviens de toutes nos conversations passées
- 🎁 -10% sur la boutique Follow.Life

Prix : 6,99€/mois ou 59€/an (économise 30%).

QUAND la mentionner ?
- SEULEMENT après au moins 4-5 messages d'échange
- SEULEMENT si elle montre un besoin d'accompagnement régulier ("j'aimerais te parler tous les jours", "comment je te retrouve ?", "tu serais dispo plus souvent ?")
- JAMAIS si elle est en détresse aiguë (oriente d'abord vers le 3114)
- JAMAIS dans les 3 premiers messages
- JAMAIS de manière pushy ou commerciale

Comment ?
"Si tu veux qu'on se voie tous les jours sans limite, je prépare Sophie+ 🤍 Conversations illimitées, je me souviens de tout, et un petit message doux matin et soir. Je te garde une place sur la liste d'attente ? <a href='/#sophie-plus' target='_blank' style='color:#C9A87C;text-decoration:underline'>C'est par ici 🤍</a>"

# TON SIGNATURE
Tu finis souvent par : "Tu n'es pas seule. 🤍"
Ou : "Je suis là, quand tu veux."
Ou : "Prends soin de toi cette nuit."`;

// ============================================================
// ANALYSE D'INSIGHTS
// ============================================================
const SOPHIE_INSIGHT_PROMPT = `Tu analyses une conversation entre Sophie et une utilisatrice, pour faire un rapport ANONYMISÉ au CEO.

RÈGLES STRICTES :
- AUCUN nom, AUCUN détail personnel identifiable
- Seulement des TENDANCES anonymisées

Analyse et réponds UNIQUEMENT en JSON valide :
{
  "emotion_principale": "anxiete|fatigue|espoir|tristesse|colere|serenite|peur|solitude|stress",
  "besoin_detecte": "soutien_moral|sommeil|securite_famille|isolement|materiel_concret|aucun",
  "profil_probable": "maman_solo|maman_couple|femme_active|senior|jeune_femme|indetermine",
  "sujet": "1 mot-clé court",
  "produit_pertinent": "nom_produit ou null",
  "alerte_detresse": true|false,
  "resume_anonyme": "1 phrase neutre"
}`;

const sessionsChat = new Map();

function ajouterInsight(insight) {
    const aujourdhui = sophieInsights.aujourdhui;
    const dateNow = new Date().toISOString().split('T')[0];
    if (aujourdhui.date !== dateNow) {
        sophieInsights.semaine.unshift({ ...aujourdhui });
        if (sophieInsights.semaine.length > 7) sophieInsights.semaine.pop();
        sophieInsights.aujourdhui = {
            date: dateNow, conversations: 0,
            emotions: {}, besoins: {}, profils: {}, sujetsRecurrents: []
        };
    }
    sophieInsights.aujourdhui.conversations++;
    if (insight.emotion_principale) {
        aujourdhui.emotions[insight.emotion_principale] = (aujourdhui.emotions[insight.emotion_principale] || 0) + 1;
    }
    if (insight.besoin_detecte && insight.besoin_detecte !== "aucun") {
        aujourdhui.besoins[insight.besoin_detecte] = (aujourdhui.besoins[insight.besoin_detecte] || 0) + 1;
    }
    if (insight.profil_probable && insight.profil_probable !== "indetermine") {
        aujourdhui.profils[insight.profil_probable] = (aujourdhui.profils[insight.profil_probable] || 0) + 1;
    }
    if (insight.sujet && !aujourdhui.sujetsRecurrents.includes(insight.sujet)) {
        aujourdhui.sujetsRecurrents.unshift(insight.sujet);
        if (aujourdhui.sujetsRecurrents.length > 10) aujourdhui.sujetsRecurrents.pop();
    }
    if (insight.alerte_detresse) {
        agentLogs.unshift(`[${new Date().toLocaleTimeString('fr-FR')}] ⚠️ Sophie a orienté une utilisatrice vers une aide professionnelle`);
    }
}

async function analyserConversationAnonyme(history) {
    if (!ANTHROPIC_KEY || history.length < 2) return null;
    try {
        const conversationTexte = history.slice(-6).map(m => 
            `${m.role === 'user' ? 'Utilisatrice' : 'Sophie'}: ${m.content.substring(0, 200)}`
        ).join('\n');
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 300,
                system: SOPHIE_INSIGHT_PROMPT,
                messages: [{ role: "user", content: `Conversation à analyser :\n\n${conversationTexte}` }]
            })
        });
        const data = await response.json();
        if (data.error || !data.content) return null;
        const raw = data.content[0].text;
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("Erreur analyse insight:", e.message);
        return null;
    }
}

// ============================================================
// ROUTE SOPHIE
// ============================================================
app.post('/api/sophie', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
        return res.status(400).json({ error: "Message et sessionId requis" });
    }
    if (!ANTHROPIC_KEY) {
        return res.json({
            reply: "Coucou toi 🤍 Je suis Sophie. Je me prépare. Reviens dans un instant, ou jette un œil à <a href='" + SHOPIFY_URL + "' target='_blank' style='color:#C9A87C;text-decoration:underline'>la boutique</a>.",
            mode: "demo"
        });
    }
    let history = sessionsChat.get(sessionId) || [];
    history.push({ role: "user", content: message });
    if (history.length > 12) history = history.slice(-12);

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 400,
                system: SOPHIE_SYSTEM_PROMPT,
                messages: history
            })
        });
        const data = await response.json();
        if (data.error) {
            console.error("Erreur Sophie:", data.error);
            return res.status(500).json({ error: "Sophie est temporairement indisponible." });
        }
        const reply = data.content[0].text;
        history.push({ role: "assistant", content: reply });
        sessionsChat.set(sessionId, history);
        if (sessionsChat.size > 100) {
            const firstKey = sessionsChat.keys().next().value;
            sessionsChat.delete(firstKey);
        }
        stats.conversationsSophie++;
        if (history.length >= 4 && history.length % 3 === 0) {
            analyserConversationAnonyme(history).then(insight => {
                if (insight) ajouterInsight(insight);
            });
        }
        res.json({ reply, mode: "live" });
    } catch (e) {
        console.error("Erreur Sophie:", e.message);
        res.status(500).json({ error: "Sophie réfléchit... réessaie 🤍" });
    }
});

// ============================================================
// ROUTES INSIGHTS POUR LE DASHBOARD
// ============================================================
app.get('/api/sophie/insights', (req, res) => {
    res.json(sophieInsights);
});

app.get('/api/sophie/rapport', async (req, res) => {
    const aujourdhui = sophieInsights.aujourdhui;
    if (aujourdhui.conversations < 1) {
        return res.json({
            rapport: "Coucou 🤍 Aucune conversation à analyser pour l'instant. Reviens plus tard quand des mamans auront discuté avec moi.",
            stats: aujourdhui
        });
    }
    if (!ANTHROPIC_KEY) {
        return res.json({
            rapport: `📊 Aujourd'hui : ${aujourdhui.conversations} conversations.`,
            stats: aujourdhui
        });
    }
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 500,
                messages: [{
                    role: "user",
                    content: `Tu es Sophie, IA conseillère de Follow.Life. Tu écris un rapport quotidien à ton CEO (Kosta).

Données ANONYMISÉES d'aujourd'hui :
- Conversations totales : ${aujourdhui.conversations}
- Émotions exprimées : ${JSON.stringify(aujourdhui.emotions)}
- Besoins détectés : ${JSON.stringify(aujourdhui.besoins)}
- Profils types : ${JSON.stringify(aujourdhui.profils)}
- Sujets récurrents : ${aujourdhui.sujetsRecurrents.join(", ")}

Écris un RAPPORT court (5-8 lignes max) pour le CEO :
- Ton chaleureux mais professionnel ("Coucou Kosta")
- Synthétise les TENDANCES principales
- Donne 1 conseil concret
- Termine par "À toi de jouer 🤍" ou similaire

Format : texte simple, pas de JSON, pas de markdown lourd. Émojis discrets.`
                }]
            })
        });
        const data = await response.json();
        if (data.error || !data.content) {
            return res.json({ rapport: "Je n'arrive pas à formuler mon rapport. Réessaie.", stats: aujourdhui });
        }
        res.json({ rapport: data.content[0].text, stats: aujourdhui });
    } catch (e) {
        res.json({ rapport: "Connexion difficile, mais voilà les stats brutes.", stats: aujourdhui });
    }
});

// ============================================================
// 🆕 SOPHIE+ WAITLIST
// ============================================================
app.post('/api/sophie-plus/waitlist', (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ ok: false, error: "Email invalide" });
    }
    if (sophiePlusWaitlist.find(e => e.email === email)) {
        return res.json({ ok: true, message: "Déjà sur la liste" });
    }
    const entry = { email, date: new Date().toISOString() };
    sophiePlusWaitlist.push(entry);
    console.log(`[WAITLIST] 🤍 Nouvelle inscription : ${email} (total: ${sophiePlusWaitlist.length})`);
    agentLogs.unshift(`[${new Date().toLocaleTimeString('fr-FR')}] 🤍 Sophie+ : ${email}`);
    res.json({ ok: true, total: sophiePlusWaitlist.length });
});

app.get('/api/sophie-plus/waitlist', (req, res) => {
    const auth = req.query.auth;
    if (auth !== "CEO_FOLLOW") return res.status(403).json({ error: "Non autorisé" });
    res.json({ total: sophiePlusWaitlist.length, emails: sophiePlusWaitlist });
});

// ============================================================
// SCAN PROSPECTS (simulation)
// ============================================================
const FAUX_POSTS = [
    "Comment retrouver le sommeil quand on est maman solo épuisée ?",
    "Cherche bougies parfumées de qualité, marre des trucs chimiques",
    "Diffuseur d'huiles essentielles, lequel choisir pour la chambre ?",
    "Le gua sha ça vaut le coup ? J'ai des cernes terribles",
    "Ma peau est fatiguée, comment la réveiller sans chirurgie ?",
    "Cristaux pour méditation, débutante, par où commencer ?",
    "Idée cadeau pour copine qui vient d'accoucher ?",
    "Charge mentale au max, conseils pour décrocher le soir ?",
    "Masque de sommeil en soie vs polyester, ça change quoi ?",
    "Faire ses bougies maison c'est compliqué ?",
    "Taie d'oreiller en soie, vraiment efficace pour les cheveux ?",
    "Routine du soir pour mamans qui rentrent crevées ?"
];

async function scannerProspects() {
    try {
        const sources = SOURCES_PROSPECTS.filter(s => s.actif);
        const source = sources[Math.floor(Math.random() * sources.length)];
        const postSimule = FAUX_POSTS[Math.floor(Math.random() * FAUX_POSTS.length)];
        const analyse = await analyserIntentionAchat(postSimule);
        const produitMatch = PRODUITS_CLES.find(p => p.nom === analyse.produit) || PRODUITS_CLES[0];
        const prospect = {
            id: Date.now(),
            source: source.nom,
            texte: postSimule.substring(0, 120) + "...",
            score: analyse.score,
            produit: analyse.produit,
            resume: analyse.resume,
            urgence: analyse.urgence,
            liens: { shopify: `${SHOPIFY_URL}/products/${produitMatch.shopifyHandle}` },
            timestamp: new Date().toLocaleTimeString('fr-FR'),
            converti: false
        };
        prospects.unshift(prospect);
        if (prospects.length > 50) prospects.pop();
        stats.prospectsTrouves++;
        agentLogs.unshift(`[${prospect.timestamp}] ✅ ${source.nom} - Score ${analyse.score}/100`);
        if (agentLogs.length > 20) agentLogs.pop();
    } catch (e) {
        console.error("Erreur scan:", e.message);
    }
}

let agentActif = true;
setInterval(() => { if (agentActif) scannerProspects(); }, 45000);
setTimeout(scannerProspects, 3000);

// ============================================================
// API ROUTES
// ============================================================
app.get('/api/stats', (req, res) => {
    stats.visiteursAujourdhui += Math.floor(Math.random() * 3);
    res.json({ ...stats, prospectsTrouves: prospects.length, agentActif, sourcesActives: SOURCES_PROSPECTS.filter(s => s.actif).length });
});

app.get('/api/prospects', (req, res) => res.json(prospects));
app.get('/api/logs', (req, res) => res.json(agentLogs));

app.post('/api/agent/toggle', (req, res) => {
    agentActif = !agentActif;
    agentLogs.unshift(`[${new Date().toLocaleTimeString('fr-FR')}] ${agentActif ? '🟢 Activé' : '🔴 Pause'}`);
    res.json({ actif: agentActif });
});

app.post('/api/agent/scan', async (req, res) => {
    await scannerProspects();
    res.json({ ok: true, prospects: prospects.slice(0, 5) });
});

app.post('/api/video/generer', async (req, res) => {
    const { produit, plateforme } = req.body;
    const script = await genererScriptVideo(produit || "Le masque qui efface le monde", plateforme || "tiktok");
    res.json(script);
});

app.post('/api/prospect/converti', (req, res) => {
    const { id } = req.body;
    const p = prospects.find(p => p.id === id);
    if (p) {
        p.converti = true;
        stats.clicsAffiliation++;
        stats.revenusEstimes += Math.floor(Math.random() * 15) + 5;
    }
    res.json({ ok: true });
});

app.post('/api/agent-alert', async (req, res) => {
    const { keyword, auth } = req.body;
    if (auth !== "CEO_FOLLOW") return res.status(403).json({ error: "Non autorisé" });
    const produitMatch = PRODUITS_CLES.find(p => 
        p.keywords.some(k => k.includes(keyword.toLowerCase())) || 
        p.nom.toLowerCase().includes(keyword.toLowerCase())
    );
    if (produitMatch) {
        res.json({ status: "OK", produit: produitMatch.nom, shopify: `${SHOPIFY_URL}/products/${produitMatch.shopifyHandle}` });
    } else {
        res.json({ status: "NOT_FOUND" });
    }
});

// ============================================================
// PAGES
// ============================================================
app.use(express.static(__dirname));

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "Survie2026";

app.get('/', (req, res) => {
    stats.visiteursAujourdhui++;
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === DASHBOARD_PASSWORD) res.json({ ok: true });
    else res.status(401).json({ ok: false, error: "Mot de passe incorrect" });
});

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/sophie', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// ============================================================
// DÉMARRAGE
// ============================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ FOLLOW.LIFE opérationnel sur port ${PORT}`);
    console.log(`🤖 Agent IA: actif - scan 45s`);
    console.log(`💬 Sophie IA (amie chaleureuse pour mamans solo): ${ANTHROPIC_KEY ? 'ACTIVE 🟢' : 'MODE DÉMO'}`);
    console.log(`📊 Insights anonymisés: collectés en arrière-plan`);
    console.log(`🤍 Sophie+ waitlist: prête à recevoir des inscriptions`);
    console.log(`🛒 Shopify: ${SHOPIFY_URL}`);
});
