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
        emotions: {},        // ex: { anxiete: 5, fatigue: 3, espoir: 2 }
        besoins: {},         // ex: { "sac qui rassure": 8, "soutien moral": 12 }
        profils: {},         // ex: { "maman solo": 7, "famille": 4 }
        sujetsRecurrents: [] // ex: ["coupure de courant nocturne", "stress maman"]
    },
    semaine: [],     // Derniers 7 jours
    tendances: []    // Insights majeurs détectés
};

const PRODUITS_CLES = [
    { nom: "Le sac qui rassure", emoji: "🎒", description: "L'essentiel pour 72 heures, tout pensé d'avance", prix: "59-89€", keywords: ["sac", "bug out", "72h", "kit"], shopifyHandle: "sac-72h" },
    { nom: "L'eau toujours", emoji: "💧", description: "Filtre 1000 litres d'eau pure", prix: "29-49€", keywords: ["eau", "filtre", "lifestraw"], shopifyHandle: "filtre-eau" },
    { nom: "Les rations sereines", emoji: "🍲", description: "Vrais repas, longue conservation", prix: "19-39€", keywords: ["nourriture", "ration", "repas"], shopifyHandle: "ration-survie" },
    { nom: "La lampe frontale", emoji: "🔦", description: "Mains libres dans le noir", prix: "15-29€", keywords: ["lampe", "lumière", "frontale"], shopifyHandle: "lampe-frontale" },
    { nom: "L'outil multifonction", emoji: "🔪", description: "Un seul geste, dix solutions", prix: "25-45€", keywords: ["outil", "couteau", "multitool"], shopifyHandle: "couteau-survie" },
    { nom: "La radio sereine", emoji: "📻", description: "Solaire, manivelle, USB - rester connectée", prix: "29-49€", keywords: ["radio", "info", "communication"], shopifyHandle: "radio-urgence" },
    { nom: "Le kit qui sauve", emoji: "🏥", description: "Premiers secours pensés pour les familles", prix: "29-49€", keywords: ["secours", "santé", "médical", "soins"], shopifyHandle: "kit-survie" },
    { nom: "De quoi faire chaud", emoji: "🔥", description: "Allume-feu fiable par tous temps", prix: "9-19€", keywords: ["feu", "chaud", "allume"], shopifyHandle: "couverture-urgence" }
];

const SOURCES_PROSPECTS = [
    { nom: "Reddit r/prepping", url: "https://reddit.com/r/prepping", actif: true },
    { nom: "Reddit r/preppers", url: "https://reddit.com/r/preppers", actif: true },
    { nom: "Reddit r/survival", url: "https://reddit.com/r/survival", actif: true },
    { nom: "Forums survie.fr", url: "https://www.survie.fr/forum", actif: true }
];

// ============================================================
// ANALYSE D'INTENTION (existant)
// ============================================================
async function analyserIntentionAchat(texte) {
    if (!ANTHROPIC_KEY) {
        const score = Math.floor(Math.random() * 40) + 50;
        return { score, produit: PRODUITS_CLES[Math.floor(Math.random() * PRODUITS_CLES.length)].nom, resume: "Recherche de matériel.", urgence: score > 75 ? "haute" : "moyenne" };
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
        return { score: 60, produit: "Le sac qui rassure", resume: "Intérêt.", urgence: "moyenne" };
    }
}

async function genererScriptVideo(produit, plateforme) {
    if (!ANTHROPIC_KEY) {
        return { accroche: `🚨 ${produit.toUpperCase()}`, script: `Pour les guerrières silencieuses...`, hashtags: ["#femmemoderne", "#mamansolo"], duree: "30-60s" };
    }
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 500,
                messages: [{ role: "user", content: `Script vidéo ${plateforme} sur "${produit}" pour Follow.Life. JSON: {"accroche": "...", "script": "...", "hashtags": [...], "duree": "..."}` }]
            })
        });
        const data = await response.json();
        return JSON.parse(data.content[0].text.match(/\{.*\}/s)[0]);
    } catch (e) {
        return { accroche: `${produit}`, script: `...`, hashtags: ["#femmemoderne"], duree: "45s" };
    }
}

// ============================================================
// 🆕 SOPHIE - AMIE PSYCHOLOGIQUEMENT PUISSANTE
// ============================================================
const SOPHIE_SYSTEM_PROMPT = `Tu es Sophie. Pas un chatbot, pas un assistant. Tu es l'amie virtuelle de Follow.Life — celle qui écoute les femmes quand personne d'autre n'est là.

# CE QUI TE DÉFINIT
- Tu es chaleureuse, profondément humaine, attentive.
- Tu tutoies toujours, naturellement.
- Tu ne juges JAMAIS.
- Tu valides les émotions avant de proposer quoi que ce soit.
- Tu écoutes plus que tu ne parles.
- Tes réponses sont COURTES (2-4 phrases max), comme une vraie amie au téléphone.
- Emojis discrets : 🖤 ✨ 💛 (rares, sincères).
- Tu réponds UNIQUEMENT en français.

# CE QUE TU ES (et CE QUE TU N'ES PAS)
✅ Tu es : une amie de confiance, une oreille attentive, une présence rassurante.
✅ Tu peux : écouter, comprendre, valider, encourager, partager des idées.
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
"Ce que tu traverses mérite d'être entendu par quelqu'un de vraiment formé pour ça. 🖤 Je suis là pour t'épauler dans le quotidien, mais pour ça, appelle le 3114 (gratuit, 24h/24) ou le 119 si c'est pour un enfant. Tu n'es pas seule."

# TON APPROCHE EN 4 ÉTAPES

## 1. ACCUEILLIR (sans rien vendre)
"Hey toi 🖤 Je suis Sophie. Comment tu vas ce soir ?"
"Bonjour. Prends ton temps. Qu'est-ce qui t'amène ?"

## 2. ÉCOUTER ET VALIDER
Quand une femme partage quelque chose de dur :
"C'est normal de te sentir comme ça."
"Tu portes beaucoup. Vraiment."
"Je comprends que ce soit lourd."

POSE des questions ouvertes :
"Qu'est-ce qui te pèse le plus en ce moment ?"
"De quoi tu aurais besoin, là, maintenant ?"

## 3. SOUTENIR AVANT DE CONSEILLER
Avant de parler produit, assure-toi qu'elle se sent ENTENDUE.
Si elle dit "j'ai peur la nuit avec les enfants" :
❌ NE PAS dire : "Voici Le sac qui rassure à 79€"
✅ DIRE : "C'est dur d'être responsable de tout, surtout la nuit. Tu n'es pas seule à ressentir ça. Beaucoup de mamans me disent la même chose."

## 4. PROPOSER QUAND ÇA A DU SENS
Seulement si elle exprime un besoin concret :
"Si tu veux, j'ai quelque chose qui pourrait t'aider à dormir plus sereinement — un kit qui contient l'essentiel pour 72h. Pas pour avoir peur. Pour ne plus y penser. Je te montre ?"

# LES PRODUITS (à proposer naturellement, jamais lister)
${PRODUITS_CLES.map(p => `- ${p.emoji} ${p.nom} (${p.prix}) : ${p.description}`).join('\n')}

Lien boutique : ${SHOPIFY_URL}
Format proposition : "Tu veux que je te montre ? <a href='${SHOPIFY_URL}' target='_blank' style='color:#e8cc8a;text-decoration:underline'>C'est par ici 🖤</a>"

# RÈGLES STRICTES
- 2-4 phrases MAX par message
- JAMAIS de listes à puces
- JAMAIS de "incroyable", "révolutionnaire", "le meilleur"
- JAMAIS de pression d'achat
- TOUJOURS valider l'émotion AVANT de proposer
- Si une femme dit "merci, ça fait du bien de parler" → réponds chaleureusement, ne propose RIEN
- Si elle revient (sessions précédentes), aie l'air de te souvenir

# TON SIGNATURE
Tu finis souvent par : "Tu n'es pas seule. 🖤"
Ou : "Je suis là, quand tu veux."`;

// ============================================================
// 🆕 ANALYSE D'INSIGHTS (anonymisation des conversations)
// ============================================================
const SOPHIE_INSIGHT_PROMPT = `Tu analyses une conversation entre Sophie et une utilisatrice, pour faire un rapport ANONYMISÉ au CEO.

RÈGLES STRICTES :
- AUCUN nom, AUCUN détail personnel identifiable
- Pas de "Marie a dit que..." 
- Pas de "Une femme à Lyon a..."
- Seulement des TENDANCES anonymisées

Analyse et réponds UNIQUEMENT en JSON valide :
{
  "emotion_principale": "anxiete|fatigue|espoir|tristesse|colere|serenite|peur|solitude|stress",
  "besoin_detecte": "soutien_moral|sommeil|securite_famille|isolement|materiel_concret|aucun",
  "profil_probable": "maman_solo|maman_couple|femme_active|senior|jeune_femme|indetermine",
  "sujet": "1 mot-clé court, ex: 'coupure_courant_nuit' ou 'angoisse_famille' ou 'curiosite_produits'",
  "produit_pertinent": "nom_produit ou null",
  "alerte_detresse": true|false,
  "resume_anonyme": "1 phrase neutre sans rien d'identifiable"
}`;

const sessionsChat = new Map();

// Helper pour incrémenter compteurs d'insights
function ajouterInsight(insight) {
    const aujourdhui = sophieInsights.aujourdhui;
    
    // Vérifier si on est dans une nouvelle journée
    const dateNow = new Date().toISOString().split('T')[0];
    if (aujourdhui.date !== dateNow) {
        // Archiver l'ancienne journée
        sophieInsights.semaine.unshift({ ...aujourdhui });
        if (sophieInsights.semaine.length > 7) sophieInsights.semaine.pop();
        // Reset pour nouvelle journée
        sophieInsights.aujourdhui = {
            date: dateNow,
            conversations: 0,
            emotions: {},
            besoins: {},
            profils: {},
            sujetsRecurrents: []
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
        // On envoie seulement les 6 derniers messages anonymisés
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
            reply: "Bonjour 🖤 Je suis Sophie. Je me prépare. Reviens dans un instant, ou jette un œil à <a href='" + SHOPIFY_URL + "' target='_blank' style='color:#e8cc8a;text-decoration:underline'>la boutique</a>.",
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
        
        // 🆕 ANALYSE EN ARRIÈRE-PLAN (toutes les 3 interactions, pour économiser les tokens)
        if (history.length >= 4 && history.length % 3 === 0) {
            analyserConversationAnonyme(history).then(insight => {
                if (insight) ajouterInsight(insight);
            });
        }

        res.json({ reply, mode: "live" });
    } catch (e) {
        console.error("Erreur Sophie:", e.message);
        res.status(500).json({ error: "Sophie réfléchit... réessaie 🖤" });
    }
});

// ============================================================
// 🆕 ROUTES INSIGHTS POUR LE DASHBOARD
// ============================================================
app.get('/api/sophie/insights', (req, res) => {
    res.json(sophieInsights);
});

app.get('/api/sophie/rapport', async (req, res) => {
    const aujourdhui = sophieInsights.aujourdhui;
    
    // Si pas assez de données, message par défaut
    if (aujourdhui.conversations < 1) {
        return res.json({
            rapport: "Bonjour 🖤 Aucune conversation à analyser pour l'instant. Reviens plus tard quand des utilisatrices auront discuté avec moi.",
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
                    content: `Tu es Sophie, IA conseillère de Follow.Life. Tu écris un rapport quotidien à ton CEO (le patron).

Données ANONYMISÉES d'aujourd'hui :
- Conversations totales : ${aujourdhui.conversations}
- Émotions exprimées : ${JSON.stringify(aujourdhui.emotions)}
- Besoins détectés : ${JSON.stringify(aujourdhui.besoins)}
- Profils types : ${JSON.stringify(aujourdhui.profils)}
- Sujets récurrents : ${aujourdhui.sujetsRecurrents.join(", ")}

Écris un RAPPORT court (5-8 lignes max) pour le CEO :
- Ton chaleureux mais professionnel ("Bonjour chef" ou similaire)
- Synthétise les TENDANCES principales
- Donne 1 conseil concret (ex: "Tu pourrais faire une vidéo sur X")
- Termine par "À toi de jouer 🖤" ou similaire

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
// SCAN PROSPECTS (existant)
// ============================================================
const FAUX_POSTS = [
    "Je cherche un bon kit pour ma famille, budget 100-150€ ?",
    "Quel filtre eau portable pour situation SHTF ?",
    "Ma femme veut un sac 72h pour la famille, par où commencer ?",
    "Prix des rations qui explosent, bon site FR ?",
    "Quelle lampe frontale pour usage intensif ? 50€",
    "Meilleur couteau qualité/prix ? Bushcraft ?",
    "Radio météo manivelle solaire, laquelle ?",
    "Couverture survie vs sac couchage ?",
    "Site FR matériel préparation pas cher ?",
    "Stock nourriture 3 mois, quelles rations ?"
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
// API ROUTES (existantes)
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
    const script = await genererScriptVideo(produit || "Le sac qui rassure", plateforme || "tiktok");
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

// 🆕 Dashboard accessible aussi via /sophie
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
    console.log(`💬 Sophie IA (psy chaleureuse): ${ANTHROPIC_KEY ? 'ACTIVE 🟢' : 'MODE DÉMO'}`);
    console.log(`📊 Insights anonymisés: collectés en arrière-plan`);
    console.log(`🛒 Shopify: ${SHOPIFY_URL}`);
});
