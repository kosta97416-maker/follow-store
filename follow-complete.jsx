import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// BRAND
// ============================================================
const B = {
  accent: "#C8FF00",
  dark:   "#070709",
  mid:    "#0f0f12",
  card:   "#13131a",
  border: "#1c1c26",
  text:   "#f0f0f8",
  muted:  "#44445a",
};

const LANGS = {
  fr:{name:"Français",flag:"🇫🇷",symbol:"€",region:"Europe"},
  en:{name:"English", flag:"🇺🇸",symbol:"$", region:"Americas"},
  es:{name:"Español", flag:"🇪🇸",symbol:"€", region:"Europe"},
  ar:{name:"العربية", flag:"🇸🇦",symbol:"ر.س",region:"Middle East"},
  pt:{name:"Português",flag:"🇧🇷",symbol:"R$",region:"Americas"},
  sw:{name:"Kiswahili",flag:"🇰🇪",symbol:"KSh",region:"Africa"},
};

// ============================================================
// PRICE MULTIPLIERS BY MARKET
// ============================================================
const MARKET_PRICE = { fr:1.0, en:1.15, es:1.0, ar:0.95, pt:0.80, sw:0.65 };

// ============================================================
// NICHES
// ============================================================
const NICHES = [
  {id:"wellness", icon:"🩹", fr:"Patches Bien-être",    en:"Wellness Patches",       color:"#C8FF00", visits:"1.9M"},
  {id:"breathing",icon:"🫁", fr:"Santé Respiratoire",   en:"Breathing Health",       color:"#00CFFF", visits:"800K"},
  {id:"hearing",  icon:"🎧", fr:"Protection Auditive",  en:"Hearing Protection",     color:"#FF6B35", visits:"2.5M"},
  {id:"creator",  icon:"🎬", fr:"Accessoires Créateurs",en:"Creator Accessories",    color:"#FF3CAC", visits:"∞"},
  {id:"home",     icon:"🏠", fr:"Organisation Maison",  en:"Home Organization",      color:"#7B61FF", visits:"1.3M"},
];

const getNL = (n,lang) => n[lang]||n.fr;

// ============================================================
// PRODUCTS
// ============================================================
const BASE_PRODUCTS = [
  {id:1, fr:"Patch Sommeil Profond",      en:"Deep Sleep Patch",         img:"https://images.unsplash.com/photo-1559181567-c3190e5a9e7f?w=400&q=80", niche:"wellness", basePrice:29.99, oldPrice:49.99, rating:4.9, reviews:3241, supplier:"Spocket",       trend:96, competition:12, gapFR:94, isWinner:true,  badge:"hot",  salesLast7:[12,18,22,19,25,28,31], active:true},
  {id:2, fr:"Patch Stress & Anxiété",     en:"Stress Relief Patch",      img:"https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&q=80", niche:"wellness", basePrice:24.99, oldPrice:39.99, rating:4.7, reviews:892,  supplier:"AliExpress",    trend:88, competition:8,  gapFR:91, isWinner:true,  badge:"new",  salesLast7:[8,9,11,10,13,14,15],   active:true},
  {id:3, fr:"Dilatateur Nasal Pro",       en:"Pro Nasal Dilator",        img:"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80", niche:"breathing",basePrice:19.99, oldPrice:34.99, rating:4.8, reviews:5621, supplier:"CJ Dropshipping",trend:93, competition:9,  gapFR:89, isWinner:true,  badge:"hot",  salesLast7:[20,22,25,23,27,30,29], active:true},
  {id:4, fr:"Purificateur Air Pocket",    en:"Pocket Air Purifier",      img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", niche:"breathing",basePrice:44.99, oldPrice:79.99, rating:4.6, reviews:1203, supplier:"Zendrop",       trend:72, competition:25, gapFR:68, isWinner:false, badge:"sale", salesLast7:[5,4,3,3,2,2,1],       active:true},
  {id:5, fr:"Bouchons Design Loop",       en:"Loop Design Earplugs",     img:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80", niche:"hearing",  basePrice:34.99, oldPrice:59.99, rating:4.9, reviews:8923, supplier:"Spocket",       trend:97, competition:6,  gapFR:96, isWinner:true,  badge:"hot",  salesLast7:[30,35,38,40,42,45,50], active:true},
  {id:6, fr:"Casque Anti-Bruit Pro",      en:"Pro Noise Cancelling",     img:"https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80", niche:"hearing",  basePrice:89.99, oldPrice:149.99,rating:4.8, reviews:2341, supplier:"CJ Dropshipping",trend:91, competition:20, gapFR:85, isWinner:true,  badge:"new",  salesLast7:[8,10,11,9,12,14,13],   active:true},
  {id:7, fr:"Ring Light Portable 12\"",   en:"12\" Portable Ring Light", img:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80", niche:"creator",  basePrice:39.99, oldPrice:69.99, rating:4.8, reviews:4521, supplier:"AliExpress",    trend:94, competition:18, gapFR:82, isWinner:true,  badge:"hot",  salesLast7:[15,17,19,18,22,24,26], active:true},
  {id:8, fr:"Micro Lavalier USB-C",       en:"USB-C Lavalier Mic",       img:"https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80", niche:"creator",  basePrice:27.99, oldPrice:44.99, rating:4.7, reviews:1876, supplier:"Zendrop",       trend:65, competition:30, gapFR:60, isWinner:false, badge:"sale", salesLast7:[4,3,2,2,1,1,0],       active:true},
  {id:9, fr:"Organiseur Câbles Magnétique",en:"Magnetic Cable Organizer",img:"https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&q=80", niche:"home",     basePrice:22.99, oldPrice:39.99, rating:4.7, reviews:3102, supplier:"AliExpress",    trend:90, competition:11, gapFR:88, isWinner:true,  badge:"hot",  salesLast7:[18,20,22,21,25,27,29], active:true},
  {id:10,fr:"Tiroir Sous-Bureau",         en:"Under-Desk Drawer",        img:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80", niche:"home",     basePrice:31.99, oldPrice:54.99, rating:4.6, reviews:987,  supplier:"CJ Dropshipping",trend:85, competition:10, gapFR:87, isWinner:true,  badge:"new",  salesLast7:[9,11,12,11,13,14,15],  active:true},
];

// ============================================================
// WORLD EVENTS POOL
// ============================================================
const WORLD_EVENTS = [
  {level:"green",  icon:"🟢", title:"Marché stable",        desc:"Conditions normales. Agents en mode croissance.", action:"Optimisation continue des marges.", alertCEO:false},
  {level:"yellow", icon:"🟡", title:"Vigilance Inflation EU",desc:"Hausse des prix détectée en Zone Euro +2.3%.",   action:"Produits accessibles mis en avant automatiquement.", alertCEO:false},
  {level:"orange", icon:"🟠", title:"Tension Supply Chain",  desc:"Délais fournisseurs AliExpress +5 jours.",       action:"Switch vers Spocket & Zendrop déclenché.", alertCEO:true},
  {level:"red",    icon:"🔴", title:"Récession FR Détectée", desc:"PIB France -0.8%. Pouvoir d'achat en baisse.",   action:"Repricing automatique -15%. Email CEO envoyé.", alertCEO:true},
  {level:"green",  icon:"🟢", title:"Black Friday Approche", desc:"J-21. Demande en hausse prévue +340%.",          action:"Stocks renforcés. Prix promo préparés.", alertCEO:false},
  {level:"yellow", icon:"🟡", title:"Canicule Europe",       desc:"35°C+ prévus sur FR, ES, IT cette semaine.",    action:"Produits bien-être & confort mis en avant.", alertCEO:false},
  {level:"orange", icon:"🟠", title:"Crise Fournisseur",     desc:"Rupture stock Spocket sur 3 produits winners.", action:"Fournisseurs alternatifs activés. CEO informé.", alertCEO:true},
];

// ============================================================
// AGENT DECISIONS POOL
// ============================================================
const AGENT_DECISIONS = [
  {type:"auto",   agent:"GapHunter",       icon:"🎯", fr:"Nouveau produit winner importé automatiquement (score 91/100) — Niche Bien-être", en:"New winner product auto-imported (score 91/100) — Wellness niche"},
  {type:"auto",   agent:"RetireBot",       icon:"🗑️", fr:"Produit retiré du catalogue — 0 vente sur 14 jours — 'Purificateur Air Pocket'",   en:"Product removed — 0 sales in 14 days — 'Pocket Air Purifier'"},
  {type:"auto",   agent:"PriceOptimizer",  icon:"💰", fr:"Repricing automatique +8% sur 4 produits Audition — concurrence faible détectée", en:"Auto repricing +8% on 4 Hearing products — low competition detected"},
  {type:"ceo",    agent:"AlertCEO",        icon:"🚨", fr:"EMAIL ENVOYÉ AU CEO — Tension supply chain détectée — Décision requise",          en:"EMAIL SENT TO CEO — Supply chain tension detected — Decision required"},
  {type:"auto",   agent:"TrendScanner",    icon:"🔍", fr:"Produit viral détecté TikTok FR : 'Patch Énergie' — 2.1M vues — Import en cours",  en:"Viral product TikTok FR: 'Energy Patch' — 2.1M views — Importing"},
  {type:"auto",   agent:"WorldWatch",      icon:"🌍", fr:"Canicule détectée EU — Produits bien-être repositionnés en homepage automatiquement",en:"Heatwave EU detected — Wellness products auto-repositioned on homepage"},
  {type:"ceo",    agent:"AlertCEO",        icon:"🚨", fr:"EMAIL ENVOYÉ AU CEO — Baisse ventes 32% sur 7 jours — Options A/B/C proposées",    en:"EMAIL SENT TO CEO — Sales down 32% over 7 days — Options A/B/C proposed"},
  {type:"auto",   agent:"ContentAI",       icon:"✍️", fr:"Descriptions SEO régénérées en 6 langues pour 5 produits — Ramadan approche",       en:"SEO descriptions regenerated in 6 languages for 5 products — Ramadan upcoming"},
  {type:"auto",   agent:"PositionAnalyst", icon:"📊", fr:"Score position recalculé — Niche Audition : Gap FR 96% — Priorité maximale",        en:"Position score recalculated — Hearing niche: FR gap 96% — Max priority"},
  {type:"auto",   agent:"OrderBot",        icon:"📦", fr:"3 commandes transmises fournisseurs automatiquement — Fulfillment 100% autonome",    en:"3 orders auto-forwarded to suppliers — 100% autonomous fulfillment"},
];

// ============================================================
// CEO EMAIL TEMPLATES
// ============================================================
const CEO_EMAILS = [
  {
    subject:"🟠 FOLLOW. — Tension Supply Chain — Action Requise",
    body:`Bonjour PDG,

WorldWatch a détecté une situation nécessitant votre attention :

📦 Tension Supply Chain détectée
• Délais AliExpress : +5 jours sur vos produits principaux
• Spocket : rupture partielle sur 3 références winners
• Impact estimé : -18% de satisfaction client si non traité

Actions déjà prises automatiquement :
✅ Switch partiel vers CJ Dropshipping
✅ Clients notifiés des délais ajustés
✅ Fournisseurs alternatifs identifiés

Que souhaitez-vous faire ?
→ A : Continuer — les agents gèrent
→ B : Suspendre les nouvelles commandes 48h
→ C : Me contacter pour en discuter

Score de risque : 62/100 — MODÉRÉ

— AlertCEO, FOLLOW.`,
    level:"orange"
  },
  {
    subject:"🔴 FOLLOW. — Alerte Critique — Décision CEO Requise",
    body:`Bonjour PDG,

ALERTE NIVEAU ROUGE — Votre décision est requise.

📉 Situation détectée :
• Ventes en baisse de 32% sur 7 jours
• Récession FR confirmée — Pouvoir d'achat -4.2%
• 2 fournisseurs principaux en difficulté

Actions déjà prises automatiquement :
✅ Repricing -15% sur tous les produits
✅ Niches anti-crise activées (low-cost, bien-être)
✅ Budget pub gelé en attente de votre décision

Vos options :
→ A : Les agents s'adaptent — on continue
→ B : Pause 30 jours — on attend
→ C : Clôture du compte

Score de risque : 87/100 — ÉLEVÉ

Nous ne fonçons dans aucun précipice sans votre accord.

— AlertCEO, FOLLOW.`,
    level:"red"
  }
];

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [lang, setLang]             = useState("fr");
  const [view, setView]             = useState("store");
  const [products, setProducts]     = useState(BASE_PRODUCTS);
  const [cart, setCart]             = useState([]);
  const [nicheFilter, setNiche]     = useState("all");
  const [agentOn, setAgentOn]       = useState(true);
  const [decisions, setDecisions]   = useState([]);
  const [worldEvent, setWorldEvent] = useState(WORLD_EVENTS[0]);
  const [ceoEmail, setCeoEmail]     = useState(null);
  const [newAlert, setNewAlert]     = useState(null);
  const [addedId, setAddedId]       = useState(null);
  const [showLang, setShowLang]     = useState(false);
  const [stats, setStats]           = useState({revenue:52480, orders:1389, visitors:41200});
  const [emailLog, setEmailLog]     = useState([]);
  const [showEmail, setShowEmail]   = useState(null);
  const sym = LANGS[lang]?.symbol || "€";
  const mult = MARKET_PRICE[lang] || 1.0;
  const getPrice = (base) => (base * mult).toFixed(2);
  const getName  = (p) => p[lang] || p.fr;
  const getNiche = (id) => NICHES.find(n=>n.id===id);

  // ─── AGENT ENGINE ───────────────────────────────────────
  useEffect(() => {
    if (!agentOn) return;
    let di = 0, wi = 0;

    // Decisions tick
    const dTimer = setInterval(() => {
      const d = AGENT_DECISIONS[di % AGENT_DECISIONS.length];
      const entry = { ...d, text: d[lang]||d.fr, time: new Date().toLocaleTimeString(), id: Date.now()+Math.random() };
      setDecisions(prev => [entry, ...prev.slice(0,39)]);

      // CEO email trigger
      if (d.type === "ceo") {
        const email = CEO_EMAILS[Math.floor(Math.random()*CEO_EMAILS.length)];
        const emailEntry = { ...email, id: Date.now(), time: new Date().toLocaleTimeString(), read: false };
        setEmailLog(prev => [emailEntry, ...prev.slice(0,9)]);
        setCeoEmail(emailEntry);
        setTimeout(() => setCeoEmail(null), 8000);
      }

      // Auto retire product
      if (d.agent === "RetireBot") {
        setProducts(prev => prev.map(p => p.id===4 ? {...p, active:false} : p));
        setTimeout(() => setProducts(prev => prev.map(p => p.id===4 ? {...p, active:true} : p)), 30000);
      }
      di++;
    }, 3500);

    // World event tick
    const wTimer = setInterval(() => {
      const ev = WORLD_EVENTS[wi % WORLD_EVENTS.length];
      setWorldEvent(ev);
      wi++;
    }, 18000);

    // New product alert
    const nTimer = setInterval(() => {
      const p = products[Math.floor(Math.random()*products.length)];
      if (p.isWinner) { setNewAlert(p); setTimeout(()=>setNewAlert(null), 4000); }
    }, 25000);

    // Revenue tick
    const rTimer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        revenue:  prev.revenue  + Math.floor(Math.random()*100+20),
        orders:   prev.orders   + (Math.random()>.6?1:0),
        visitors: prev.visitors + Math.floor(Math.random()*20+5),
      }));
    }, 2800);

    return () => { clearInterval(dTimer); clearInterval(wTimer); clearInterval(nTimer); clearInterval(rTimer); };
  }, [agentOn, lang]);

  const addToCart = (p) => {
    setCart(prev => { const ex=prev.find(i=>i.id===p.id); return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}]; });
    setAddedId(p.id); setTimeout(()=>setAddedId(null), 1400);
  };
  const cartCount = cart.reduce((s,i)=>s+i.qty, 0);
  const cartTotal = cart.reduce((s,i)=>s+(parseFloat(getPrice(i.basePrice))*i.qty), 0);
  const filtered  = (nicheFilter==="all" ? products : products.filter(p=>p.niche===nicheFilter)).filter(p=>p.active);
  const unreadEmails = emailLog.filter(e=>!e.read).length;

  return (
    <div style={{minHeight:"100vh", background:B.dark, color:B.text, fontFamily:"'Bebas Neue','DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:${B.accent};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 ${B.accent}00}50%{box-shadow:0 0 28px 4px ${B.accent}55}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        .card{background:${B.card};border:1px solid ${B.border};border-radius:14px;overflow:hidden;transition:all .25s cubic-bezier(.22,.61,.36,1);}
        .card:hover{transform:translateY(-4px);border-color:${B.accent}50;box-shadow:0 16px 48px ${B.accent}0a;}
        .btn{background:${B.accent};color:#080808;border:none;border-radius:8px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .18s;letter-spacing:.3px;}
        .btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px ${B.accent}55;}
        .btn-ghost{background:transparent;color:${B.text};border:1px solid ${B.border};border-radius:8px;padding:8px 16px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:12px;cursor:pointer;transition:all .18s;}
        .btn-ghost:hover{border-color:${B.accent};color:${B.accent};}
        .nav-btn{background:transparent;border:none;color:${B.muted};font-family:'DM Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;padding:8px 14px;border-radius:8px;transition:all .18s;}
        .nav-btn.active{color:${B.accent};background:${B.accent}12;}
        .nav-btn:hover{color:${B.text};}
        .badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;letter-spacing:.4px;}
        .decision-auto{background:${B.accent}0f;border-left:2px solid ${B.accent};color:#aab;padding:8px 12px;border-radius:0 8px 8px 0;font-size:12px;font-family:'DM Sans',sans-serif;animation:fadeUp .3s ease;line-height:1.4;}
        .decision-ceo{background:#ff000018;border-left:2px solid #ff4444;color:#ff8888;padding:8px 12px;border-radius:0 8px 8px 0;font-size:12px;font-family:'DM Sans',sans-serif;animation:fadeUp .3s ease,shake .4s ease;line-height:1.4;}
      `}</style>

      {/* ── TICKER ── */}
      <div style={{background:B.accent, padding:"5px 0", overflow:"hidden"}}>
        <div style={{display:"flex", animation:"ticker 30s linear infinite", whiteSpace:"nowrap", width:"max-content"}}>
          {[...Array(3)].map((_,i)=>(
            <span key={i} style={{display:"inline-flex", gap:"48px", paddingRight:"48px", fontSize:"10px", fontWeight:"700", letterSpacing:"1.2px", color:"#080808", fontFamily:"'DM Sans',sans-serif"}}>
              <span>⚡ 8 AGENTS IA ACTIFS 24/7</span>
              <span>🌍 VEILLE MONDIALE EN CONTINU</span>
              <span>📧 ALERTES CEO AUTOMATIQUES</span>
              <span>💰 {sym}{stats.revenue.toLocaleString()} GÉNÉRÉS • {stats.orders.toLocaleString()} COMMANDES</span>
              <span>🗑️ PRODUITS PERDANTS RETIRÉS AUTO</span>
              <span>🎯 NICHES FR NON SATURÉES</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{background:"#07070980", backdropFilter:"blur(24px)", borderBottom:`1px solid ${B.border}`, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:"60px", position:"sticky", top:0, zIndex:100}}>
        <div style={{display:"flex", alignItems:"center", cursor:"pointer"}} onClick={()=>setView("store")}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", letterSpacing:"5px", color:B.text}}>FOLLOW</span>
          <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", color:B.accent}}>.</span>
        </div>

        <div style={{display:"flex", gap:"2px"}}>
          {[["store","Boutique"],["dashboard","Dashboard"],["agents","Agents IA"],["emails","Emails CEO"]].map(([v,l])=>(
            <button key={v} className={`nav-btn ${view===v?"active":""}`} onClick={()=>setView(v)} style={{position:"relative"}}>
              {l}
              {v==="emails" && unreadEmails>0 && <span style={{position:"absolute", top:"4px", right:"4px", background:"#ff4444", color:"#fff", borderRadius:"50%", width:"14px", height:"14px", fontSize:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800"}}>{unreadEmails}</span>}
            </button>
          ))}
        </div>

        <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
          {/* World status */}
          <div style={{display:"flex", alignItems:"center", gap:"6px", background:B.mid, border:`1px solid ${B.border}`, borderRadius:"8px", padding:"6px 10px"}}>
            <span style={{fontSize:"12px"}}>{worldEvent.icon}</span>
            <span style={{fontSize:"10px", color:B.muted, fontFamily:"'DM Sans',sans-serif", maxWidth:"100px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"}}>{worldEvent.title}</span>
          </div>
          {/* Lang */}
          <div style={{position:"relative"}}>
            <button className="btn-ghost" onClick={()=>setShowLang(!showLang)} style={{fontSize:"16px", padding:"6px 10px"}}>{LANGS[lang]?.flag}</button>
            {showLang && (
              <div style={{position:"absolute", top:"calc(100% + 6px)", right:0, background:"#111", border:`1px solid ${B.border}`, borderRadius:"10px", overflow:"hidden", zIndex:200, minWidth:"155px"}}>
                {Object.entries(LANGS).map(([code,info])=>(
                  <button key={code} onClick={()=>{setLang(code);setShowLang(false);}} style={{display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"9px 13px", background:lang===code?`${B.accent}15`:"transparent", border:"none", color:B.text, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"12px"}}>
                    <span>{info.flag} {info.name}</span>
                    <span style={{color:B.muted, fontSize:"10px"}}>{info.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Cart */}
          <button className="btn-ghost" onClick={()=>setView("cart")} style={{position:"relative"}}>
            🛒 {cartCount>0&&<span style={{background:B.accent, color:"#080808", borderRadius:"50%", width:"16px", height:"16px", fontSize:"9px", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:"800", marginLeft:"3px"}}>{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* ── CEO EMAIL ALERT ── */}
      {ceoEmail && (
        <div style={{position:"fixed", top:"70px", right:"16px", background:B.card, border:"1px solid #ff4444", borderRadius:"14px", padding:"16px 20px", zIndex:500, animation:"slideIn .4s ease", maxWidth:"300px", cursor:"pointer"}} onClick={()=>{setView("emails");setCeoEmail(null);}}>
          <div style={{display:"flex", alignItems:"center", gap:"7px", marginBottom:"8px"}}>
            <span style={{animation:"pulse 1s infinite", fontSize:"16px"}}>🚨</span>
            <span style={{color:"#ff6666", fontSize:"10px", fontWeight:"700", letterSpacing:"1px"}}>ALERTE CEO — ACTION REQUISE</span>
          </div>
          <div style={{color:B.text, fontSize:"13px", fontWeight:"600", marginBottom:"4px"}}>{ceoEmail.subject}</div>
          <div style={{color:B.muted, fontSize:"11px"}}>Cliquez pour lire et décider →</div>
        </div>
      )}

      {/* ── NEW PRODUCT ALERT ── */}
      {newAlert && (
        <div style={{position:"fixed", top:"70px", left:"16px", background:B.card, border:`1px solid ${B.accent}`, borderRadius:"12px", padding:"14px 18px", zIndex:500, animation:"slideDown .35s ease", maxWidth:"260px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"7px", marginBottom:"6px"}}>
            <span style={{width:"7px", height:"7px", borderRadius:"50%", background:B.accent, animation:"pulse 1s infinite", display:"inline-block"}}></span>
            <span style={{color:B.accent, fontSize:"10px", fontWeight:"700", letterSpacing:"1px"}}>WINNER DÉTECTÉ</span>
          </div>
          <div style={{color:B.text, fontSize:"13px", fontWeight:"600"}}>{getName(newAlert)}</div>
          <div style={{color:B.accent, fontSize:"10px", marginTop:"4px"}}>Gap FR {newAlert.gapFR}% · Score {newAlert.trend}/100</div>
        </div>
      )}

      {/* ── VIEWS ── */}
      {view==="store"     && <StoreView products={filtered} nicheFilter={nicheFilter} setNiche={setNiche} addToCart={addToCart} addedId={addedId} lang={lang} sym={sym} getPrice={getPrice} getName={getName} getNiche={getNiche} />}
      {view==="dashboard" && <DashboardView stats={stats} products={products} worldEvent={worldEvent} decisions={decisions} lang={lang} sym={sym} getPrice={getPrice} getName={getName} getNiche={getNiche} />}
      {view==="agents"    && <AgentsView agentOn={agentOn} setAgentOn={setAgentOn} decisions={decisions} worldEvent={worldEvent} />}
      {view==="emails"    && <EmailsView emailLog={emailLog} setEmailLog={setEmailLog} showEmail={showEmail} setShowEmail={setShowEmail} />}
      {view==="cart"      && <CartView cart={cart} setCart={setCart} cartTotal={cartTotal} sym={sym} getName={getName} getPrice={getPrice} setView={setView} />}
    </div>
  );
}

// ============================================================
// STORE VIEW
// ============================================================
function StoreView({ products, nicheFilter, setNiche, addToCart, addedId, lang, sym, getPrice, getName, getNiche }) {
  const winners = products.filter(p=>p.isWinner);
  return (
    <div style={{maxWidth:"1300px", margin:"0 auto", padding:"0 24px 80px"}}>
      {/* Hero */}
      <div style={{padding:"68px 0 48px", animation:"fadeUp .5s ease"}}>
        <div style={{display:"inline-flex", alignItems:"center", gap:"8px", background:`${B.accent}12`, border:`1px solid ${B.accent}30`, borderRadius:"100px", padding:"5px 14px", marginBottom:"18px"}}>
          <span style={{width:"6px", height:"6px", borderRadius:"50%", background:B.accent, animation:"pulse 1.5s infinite", display:"inline-block"}}></span>
          <span style={{color:B.accent, fontSize:"11px", fontWeight:"700", letterSpacing:"1px", fontFamily:"'DM Sans',sans-serif"}}>AGENTS IA ACTIFS · PRIX ACCESSIBLES · NICHES FR</span>
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(52px,9vw,108px)", lineHeight:".92", letterSpacing:"3px", marginBottom:"18px"}}>
          <span style={{display:"block", color:B.text}}>FOLLOW</span>
          <span style={{display:"block", color:B.accent}}>THE TREND.</span>
        </h1>
        <p style={{color:B.muted, fontSize:"16px", maxWidth:"480px", lineHeight:"1.7", fontFamily:"'DM Sans',sans-serif"}}>
          {lang==="fr"?"Des produits winners dans des niches françaises non saturées. Prix accessibles, qualité prouvée."
          :lang==="en"?"Winning products in untapped niches. Accessible prices, proven quality."
          :"Productos ganadores en nichos poco saturados. Precios accesibles, calidad probada."}
        </p>
      </div>

      {/* Niche filters */}
      <div style={{display:"flex", gap:"8px", marginBottom:"32px", overflowX:"auto", paddingBottom:"4px"}}>
        <button onClick={()=>setNiche("all")} style={{background:nicheFilter==="all"?B.accent:B.card, color:nicheFilter==="all"?"#080808":B.muted, border:`1px solid ${nicheFilter==="all"?B.accent:B.border}`, borderRadius:"100px", padding:"8px 18px", fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"12px", cursor:"pointer", whiteSpace:"nowrap", transition:"all .18s"}}>Tout</button>
        {NICHES.map(n=>(
          <button key={n.id} onClick={()=>setNiche(n.id)} style={{background:nicheFilter===n.id?n.color:B.card, color:nicheFilter===n.id?"#080808":B.muted, border:`1px solid ${nicheFilter===n.id?n.color:B.border}`, borderRadius:"100px", padding:"8px 18px", fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"12px", cursor:"pointer", whiteSpace:"nowrap", transition:"all .18s", display:"flex", alignItems:"center", gap:"6px"}}>
            <span>{n.icon}</span><span>{getNL(n,lang)}</span><span style={{background:"#00000025", borderRadius:"4px", padding:"1px 5px", fontSize:"10px"}}>{n.visits}</span>
          </button>
        ))}
      </div>

      {/* Winners */}
      {winners.length>0&&(
        <div style={{marginBottom:"40px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px"}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"3px"}}>🏆 WINNERS IA VALIDÉS</span>
            <span style={{background:B.accent, color:"#080808", fontSize:"9px", fontWeight:"800", padding:"3px 7px", borderRadius:"4px", letterSpacing:"1px"}}>SCORE 85+</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:"14px"}}>
            {winners.map(p=><PCard key={p.id} p={p} addToCart={addToCart} addedId={addedId} lang={lang} sym={sym} getPrice={getPrice} getName={getName} getNiche={getNiche} isWinner />)}
          </div>
        </div>
      )}

      <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", letterSpacing:"3px", color:B.muted, marginBottom:"14px"}}>CATALOGUE — {products.length} PRODUITS</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(235px,1fr))", gap:"14px"}}>
        {products.map(p=><PCard key={p.id} p={p} addToCart={addToCart} addedId={addedId} lang={lang} sym={sym} getPrice={getPrice} getName={getName} getNiche={getNiche} />)}
      </div>

      <div style={{display:"flex", gap:"32px", justifyContent:"center", marginTop:"56px", flexWrap:"wrap"}}>
        {[["🚚","Livraison gratuite"],["🔒","Paiement sécurisé"],["🌍","6 pays · 6 langues"],["🤖","Géré par IA 24/7"]].map(([ic,lb])=>(
          <div key={lb} style={{display:"flex", alignItems:"center", gap:"8px", color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif"}}>
            <span style={{fontSize:"18px"}}>{ic}</span>{lb}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT CARD
// ============================================================
function PCard({ p, addToCart, addedId, lang, sym, getPrice, getName, getNiche, isWinner }) {
  const added   = addedId===p.id;
  const price   = getPrice(p.basePrice);
  const oldP    = getPrice(p.oldPrice);
  const disc    = Math.round((1-p.basePrice/p.oldPrice)*100);
  const niche   = getNiche(p.niche);
  const trend7  = p.salesLast7;
  const trendUp = trend7[trend7.length-1] >= trend7[0];

  return (
    <div className="card" style={{animation:"fadeUp .45s ease"}}>
      <div style={{position:"relative", overflow:"hidden"}}>
        <img src={p.img} alt={getName(p)} style={{width:"100%", height:"185px", objectFit:"cover", transition:"transform .35s"}}
          onMouseOver={e=>e.currentTarget.style.transform="scale(1.06)"}
          onMouseOut={e=>e.currentTarget.style.transform="scale(1)"} />
        <div style={{position:"absolute", top:"10px", left:"10px", display:"flex", gap:"5px"}}>
          {isWinner&&<span className="badge" style={{background:`${B.accent}22`,color:B.accent,border:`1px solid ${B.accent}40`}}>🏆</span>}
          <span className="badge" style={{background:"#08080888",color:"#aaa",border:`1px solid ${B.border}`}}>{p.badge==="hot"?"🔥 Viral":p.badge==="new"?"✨ Nouveau":"💥 Promo"}</span>
        </div>
        <span style={{position:"absolute", top:"10px", right:"10px", background:B.accent, color:"#080808", fontSize:"10px", fontWeight:"800", padding:"2px 6px", borderRadius:"5px"}}>-{disc}%</span>
        <div style={{position:"absolute", bottom:0, left:0, right:0, background:"#07070988", backdropFilter:"blur(10px)", padding:"6px 10px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontSize:"10px", color:niche?.color||"#aaa", fontWeight:"700"}}>{niche?.icon} {getNL(niche||{},lang)}</span>
          <span style={{fontSize:"10px", color:trendUp?B.accent:"#ff6666", fontWeight:"700"}}>{trendUp?"📈":"📉"} Gap FR {p.gapFR}%</span>
        </div>
      </div>
      <div style={{padding:"14px"}}>
        <h3 style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"14px", marginBottom:"7px", lineHeight:"1.3"}}>{getName(p)}</h3>
        <div style={{display:"flex", gap:"6px", marginBottom:"8px"}}>
          <span style={{background:`${B.accent}12`, border:`1px solid ${B.accent}30`, borderRadius:"5px", padding:"2px 7px", fontSize:"10px", color:B.accent, fontWeight:"700"}}>Trend {p.trend}</span>
          <span style={{background:"#00cfff12", border:"1px solid #00cfff30", borderRadius:"5px", padding:"2px 7px", fontSize:"10px", color:"#00cfff", fontWeight:"700"}}>Conc. {p.competition}</span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"4px", marginBottom:"9px"}}>
          <span style={{color:"#ffd700", fontSize:"11px"}}>{"★".repeat(Math.floor(p.rating))}</span>
          <span style={{color:B.muted, fontSize:"10px", fontFamily:"'DM Sans',sans-serif"}}>{p.rating} ({p.reviews.toLocaleString()})</span>
        </div>
        <div style={{display:"flex", alignItems:"baseline", gap:"8px", marginBottom:"12px"}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", letterSpacing:"1px", color:B.accent}}>{sym}{price}</span>
          <span style={{color:"#333", fontSize:"12px", textDecoration:"line-through", fontFamily:"'DM Sans',sans-serif"}}>{sym}{oldP}</span>
          <span style={{color:B.muted, fontSize:"10px", fontFamily:"'DM Sans',sans-serif", marginLeft:"auto"}}>{p.supplier}</span>
        </div>
        <button className="btn" onClick={()=>addToCart(p)} style={{width:"100%", animation:added?"glow .5s ease":undefined}}>
          {added?"✓ Ajouté !":"Ajouter au panier"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ stats, products, worldEvent, decisions, lang, sym, getPrice, getName, getNiche }) {
  const activeProds = products.filter(p=>p.active);
  const retiredProds = products.filter(p=>!p.active);

  return (
    <div style={{maxWidth:"1300px", margin:"0 auto", padding:"40px 24px 80px"}}>
      <div style={{marginBottom:"28px"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", letterSpacing:"3px"}}>DASHBOARD</h2>
        <p style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif"}}>Temps réel · Stratégie position · 8 agents actifs</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"12px", marginBottom:"28px"}}>
        {[
          {l:"Revenus",   v:`${sym}${stats.revenue.toLocaleString()}`,  icon:"💰", c:"#C8FF00", ch:"+18%"},
          {l:"Commandes", v:stats.orders.toLocaleString(),              icon:"📦", c:"#00CFFF", ch:"+26%"},
          {l:"Produits actifs", v:activeProds.length,                  icon:"🏷️", c:"#FF6B35", ch:`${retiredProds.length} retirés`},
          {l:"Visiteurs",  v:stats.visitors.toLocaleString(),           icon:"👁️", c:"#FF3CAC", ch:"+31%"},
        ].map((s,i)=>(
          <div key={i} style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"20px", animation:`fadeUp ${.3+i*.08}s ease`}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"10px"}}>
              <span style={{fontSize:"24px"}}>{s.icon}</span>
              <span style={{background:`${s.c}18`, color:s.c, fontSize:"10px", fontWeight:"700", padding:"2px 7px", borderRadius:"5px", fontFamily:"'DM Sans',sans-serif"}}>{s.ch}</span>
            </div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", letterSpacing:"1px", color:s.c}}>{s.v}</div>
            <div style={{color:B.muted, fontSize:"11px", fontFamily:"'DM Sans',sans-serif", marginTop:"3px"}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* World conjuncture */}
      <div style={{background:B.card, border:`1px solid ${worldEvent.level==="red"?"#ff4444":worldEvent.level==="orange"?"#ff8c00":worldEvent.level==="yellow"?"#ffd700":B.accent}30`, borderRadius:"12px", padding:"20px", marginBottom:"16px"}}>
        <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px"}}>
          <span style={{fontSize:"20px"}}>{worldEvent.icon}</span>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", letterSpacing:"2px"}}>{worldEvent.title}</div>
            <div style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif"}}>{worldEvent.desc}</div>
          </div>
          {worldEvent.alertCEO && <span style={{marginLeft:"auto", background:"#ff444420", color:"#ff8888", fontSize:"10px", fontWeight:"700", padding:"3px 8px", borderRadius:"5px", fontFamily:"'DM Sans',sans-serif"}}>📧 CEO ALERTÉ</span>}
        </div>
        <div style={{background:`${B.accent}08`, borderRadius:"8px", padding:"10px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:B.accent}}>
          ⚡ Action agents : {worldEvent.action}
        </div>
      </div>

      {/* Product lifecycle */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px"}}>
        <div style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"20px"}}>
          <h3 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", letterSpacing:"2px", marginBottom:"14px"}}>🏆 TOP WINNERS ACTIFS</h3>
          {products.filter(p=>p.isWinner&&p.active).slice(0,4).map((p,i)=>{
            const niche = getNiche(p.niche);
            const tUp = p.salesLast7[6]>=p.salesLast7[0];
            return (
              <div key={p.id} style={{display:"flex", alignItems:"center", gap:"10px", padding:"9px 0", borderBottom:`1px solid ${B.border}`}}>
                <span style={{color:B.accent, fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", minWidth:"18px"}}>#{i+1}</span>
                <img src={p.img} style={{width:"34px", height:"34px", borderRadius:"7px", objectFit:"cover"}} />
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"600", fontSize:"12px"}}>{getName(p)}</div>
                  <div style={{color:niche?.color||B.muted, fontSize:"10px"}}>{niche?.icon} {getNL(niche||{},lang)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:B.accent, fontWeight:"700", fontSize:"12px", fontFamily:"'DM Sans',sans-serif"}}>Gap {p.gapFR}%</div>
                  <div style={{color:tUp?"#00ff88":"#ff6666", fontSize:"10px"}}>{tUp?"📈":"📉"}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"20px"}}>
          <h3 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", letterSpacing:"2px", marginBottom:"14px"}}>🤖 DÉCISIONS AGENTS RÉCENTES</h3>
          <div style={{display:"flex", flexDirection:"column", gap:"6px", maxHeight:"220px", overflowY:"auto"}}>
            {decisions.slice(0,6).map(d=>(
              <div key={d.id} className={d.type==="ceo"?"decision-ceo":"decision-auto"}>
                <span style={{opacity:.6, marginRight:"8px", fontSize:"10px"}}>{d.time}</span>
                <span style={{marginRight:"5px"}}>{d.icon}</span>
                <strong style={{fontSize:"10px", opacity:.7}}>{d.agent}</strong>
                {" — "}
                <span style={{fontSize:"11px"}}>{d.text}</span>
              </div>
            ))}
            {decisions.length===0&&<div style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif", padding:"20px 0", textAlign:"center"}}>Agents en démarrage...</div>}
          </div>
        </div>
      </div>

      {/* Pricing by market */}
      <div style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"20px"}}>
        <h3 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", letterSpacing:"2px", marginBottom:"16px"}}>💰 PRIX ACCESSIBLES PAR MARCHÉ</h3>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"10px"}}>
          {Object.entries(LANGS).map(([code,info])=>{
            const mult = MARKET_PRICE[code];
            const ex = products.find(p=>p.active);
            return (
              <div key={code} style={{background:B.mid, border:`1px solid ${B.border}`, borderRadius:"10px", padding:"14px", textAlign:"center"}}>
                <div style={{fontSize:"24px", marginBottom:"6px"}}>{info.flag}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"13px", marginBottom:"4px"}}>{info.name}</div>
                <div style={{color:B.accent, fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px"}}>{info.symbol}{ex?(ex.basePrice*mult).toFixed(2):"—"}</div>
                <div style={{color:B.muted, fontSize:"10px", marginTop:"3px"}}>×{mult} · {info.region}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AGENTS VIEW
// ============================================================
function AgentsView({ agentOn, setAgentOn, decisions, worldEvent }) {
  const AGENTS = [
    {name:"GapHunter",       role:"Détecte niches FR non saturées vs US/UK. Score position avant import.", icon:"🎯", color:"#C8FF00"},
    {name:"TrendScanner",    role:"Surveille TikTok, Instagram, Pinterest. Détecte les viraux avant explosion.", icon:"🔍", color:"#00CFFF"},
    {name:"WorldWatch",      role:"Veille conjoncturelle mondiale. Crises, inflation, géopolitique, saisons.", icon:"🌍", color:"#FF6B35"},
    {name:"PriceOptimizer",  role:"Adapte les prix par marché. Jamais hors de portée. Marge min 15% toujours.", icon:"💰", color:"#FF3CAC"},
    {name:"RetireBot",       role:"Retire automatiquement les produits sans vente depuis 14 jours.", icon:"🗑️", color:"#7B61FF"},
    {name:"ContentAI",       role:"Génère descriptions SEO en 6 langues. Adapte le ton selon la saison.", icon:"✍️", color:"#00FF88"},
    {name:"OrderBot",        role:"Fulfillment 100% autonome. Transmet les commandes fournisseurs auto.", icon:"📦", color:"#FFD700"},
    {name:"AlertCEO",        role:"Informe le PDG sur toutes les décisions importantes. Jamais de précipice.", icon:"🚨", color:"#FF4444"},
  ];

  const CHARTE = [
    {cat:"✅ Agents décident seuls", items:["Ajouter produit winner score >85","Ajuster prix ±10%","Retirer produit sans vente 14j","Switch fournisseur même produit","SEO & traductions automatiques"]},
    {cat:"📧 CEO informé avant action", items:["Nouveau fournisseur jamais utilisé","Changement prix >25%","Retrait 5+ produits d'un coup","Nouvelle niche à intégrer","Anomalie trafic ou fraude"]},
    {cat:"🚨 CEO décide OUI ou NON", items:["Crise économique détectée","Baisse ventes >30% sur 7j","Fournisseur principal disparu","Risque légal ou douanier","Mise en pause ou clôture compte"]},
  ];

  return (
    <div style={{maxWidth:"1300px", margin:"0 auto", padding:"40px 24px 80px"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px"}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", letterSpacing:"3px"}}>AGENTS IA</h2>
          <p style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif"}}>8 agents · Autonomie totale · Vous au contrôle final</p>
        </div>
        <button className="btn" onClick={()=>setAgentOn(!agentOn)} style={{background:agentOn?"linear-gradient(135deg,#00ff88,#00cc6a)":"linear-gradient(135deg,#C8FF00,#a8d400)", color:"#080808", minWidth:"110px"}}>
          {agentOn?"⏸ Pause":"▶ Activer"}
        </button>
      </div>

      {/* World conjuncture banner */}
      <div style={{background:`${B.accent}08`, border:`1px solid ${B.accent}25`, borderRadius:"12px", padding:"16px 20px", marginBottom:"24px", display:"flex", alignItems:"center", gap:"12px"}}>
        <span style={{fontSize:"22px"}}>{worldEvent.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px", letterSpacing:"2px", color:B.accent}}>{worldEvent.title}</div>
          <div style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif", marginTop:"2px"}}>{worldEvent.desc} — {worldEvent.action}</div>
        </div>
        {worldEvent.alertCEO&&<span style={{background:"#ff444420", color:"#ff8888", fontSize:"10px", fontWeight:"700", padding:"4px 8px", borderRadius:"6px", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap"}}>🚨 EMAIL CEO</span>}
      </div>

      {/* Agent cards */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"12px", marginBottom:"28px"}}>
        {AGENTS.map((a,i)=>(
          <div key={i} className="card" style={{padding:"18px", animation:`fadeUp ${.3+i*.06}s ease`}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"10px"}}>
              <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                <div style={{width:"36px", height:"36px", background:`${a.color}18`, border:`1px solid ${a.color}30`, borderRadius:"9px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px"}}>{a.icon}</div>
                <span style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"14px"}}>{a.name}</span>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:"5px"}}>
                <div style={{width:"7px", height:"7px", borderRadius:"50%", background:agentOn?a.color:"#333", animation:agentOn?"pulse 2s infinite":undefined}}></div>
                <span style={{fontSize:"10px", color:agentOn?a.color:"#333", fontWeight:"700", fontFamily:"'DM Sans',sans-serif"}}>{agentOn?"ON":"OFF"}</span>
              </div>
            </div>
            <p style={{color:B.muted, fontSize:"11.5px", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.5"}}>{a.role}</p>
          </div>
        ))}
      </div>

      {/* Live decisions */}
      <div style={{background:"#050508", border:`1px solid ${B.border}`, borderRadius:"12px", overflow:"hidden", marginBottom:"20px"}}>
        <div style={{padding:"13px 18px", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", gap:"9px"}}>
          <div style={{width:"8px", height:"8px", borderRadius:"50%", background:agentOn?B.accent:"#333", animation:agentOn?"pulse 1.5s infinite":undefined}}></div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"2px", fontSize:"13px"}}>DÉCISIONS EN TEMPS RÉEL</span>
          <span style={{color:"#333", fontSize:"10px", fontFamily:"'DM Sans',sans-serif", marginLeft:"auto"}}>{decisions.length} décisions</span>
        </div>
        <div style={{height:"280px", overflowY:"auto", padding:"10px", display:"flex", flexDirection:"column", gap:"6px"}}>
          {decisions.length===0&&<div style={{color:"#222", textAlign:"center", padding:"60px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px"}}>{agentOn?"⏳ Agents en démarrage...":"Agents en pause."}</div>}
          {decisions.map(d=>(
            <div key={d.id} className={d.type==="ceo"?"decision-ceo":"decision-auto"}>
              <span style={{opacity:.5, marginRight:"8px", fontSize:"10px"}}>{d.time}</span>
              <span style={{marginRight:"5px"}}>{d.icon}</span>
              <strong style={{fontSize:"10px", opacity:.6}}>[{d.agent}]</strong> {d.text}
            </div>
          ))}
        </div>
      </div>

      {/* Charte */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:"12px"}}>
        {CHARTE.map((c,i)=>(
          <div key={i} style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"18px"}}>
            <div style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"13px", marginBottom:"12px", color:i===0?B.accent:i===1?"#ffd700":"#ff8888"}}>{c.cat}</div>
            {c.items.map((item,j)=>(
              <div key={j} style={{color:B.muted, fontSize:"11.5px", fontFamily:"'DM Sans',sans-serif", padding:"5px 0", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", gap:"7px"}}>
                <span style={{color:i===0?B.accent:i===1?"#ffd700":"#ff8888", fontSize:"10px"}}>→</span>{item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EMAILS CEO VIEW
// ============================================================
function EmailsView({ emailLog, setEmailLog, showEmail, setShowEmail }) {
  const [selected, setSelected] = useState(null);
  const [replied, setReplied]   = useState({});

  const markRead = (id) => setEmailLog(prev=>prev.map(e=>e.id===id?{...e,read:true}:e));
  const openEmail = (e) => { setSelected(e); markRead(e.id); };

  const handleReply = (emailId, option) => {
    setReplied(prev=>({...prev,[emailId]:option}));
  };

  return (
    <div style={{maxWidth:"1100px", margin:"0 auto", padding:"40px 24px 80px"}}>
      <div style={{marginBottom:"28px"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", letterSpacing:"3px"}}>📧 EMAILS CEO</h2>
        <p style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif"}}>Alertes importantes · Vous gardez le contrôle final · On ne fonce jamais sans vous</p>
      </div>

      {emailLog.length===0 ? (
        <div style={{textAlign:"center", padding:"80px 0"}}>
          <div style={{fontSize:"48px", marginBottom:"16px"}}>📭</div>
          <p style={{color:B.muted, fontFamily:"'DM Sans',sans-serif", fontSize:"14px"}}>Aucune alerte pour l'instant.</p>
          <p style={{color:"#333", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", marginTop:"8px"}}>Les agents vous préviendront dès qu'une décision importante sera nécessaire.</p>
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:selected?"1fr 1.4fr":"1fr", gap:"16px"}}>
          {/* Email list */}
          <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
            {emailLog.map(e=>(
              <div key={e.id} onClick={()=>openEmail(e)} style={{background:selected?.id===e.id?`${B.accent}10`:B.card, border:`1px solid ${selected?.id===e.id?B.accent:e.read?B.border:"#ff444440"}`, borderRadius:"12px", padding:"14px 16px", cursor:"pointer", transition:"all .2s"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px"}}>
                  <span style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"13px", flex:1, marginRight:"10px"}}>{e.subject}</span>
                  {!e.read&&<span style={{width:"8px", height:"8px", borderRadius:"50%", background:"#ff4444", flexShrink:0, marginTop:"3px"}}></span>}
                </div>
                <div style={{color:B.muted, fontSize:"11px", fontFamily:"'DM Sans',sans-serif"}}>{e.time}</div>
                {replied[e.id]&&<div style={{color:B.accent, fontSize:"10px", marginTop:"4px", fontWeight:"700"}}>✅ Répondu : Option {replied[e.id]}</div>}
              </div>
            ))}
          </div>

          {/* Email detail */}
          {selected&&(
            <div style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"24px", animation:"fadeUp .3s ease"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
                <h3 style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"15px", flex:1}}>{selected.subject}</h3>
                <button onClick={()=>setSelected(null)} style={{background:"transparent", border:"none", color:B.muted, cursor:"pointer", fontSize:"18px", padding:"4px"}}>✕</button>
              </div>
              <pre style={{fontFamily:"'DM Sans',sans-serif", fontSize:"12.5px", lineHeight:"1.8", color:"#ccc", whiteSpace:"pre-wrap", marginBottom:"20px", borderTop:`1px solid ${B.border}`, paddingTop:"16px"}}>{selected.body}</pre>
              {!replied[selected.id] ? (
                <div>
                  <div style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"12px", color:B.muted, marginBottom:"10px"}}>VOTRE DÉCISION :</div>
                  <div style={{display:"flex", gap:"8px"}}>
                    {["A","B","C"].map(opt=>(
                      <button key={opt} className="btn" onClick={()=>handleReply(selected.id,opt)} style={{flex:1, background:opt==="A"?`linear-gradient(135deg,${B.accent},#a8d400)`:opt==="B"?"linear-gradient(135deg,#ffd700,#cc9900)":"linear-gradient(135deg,#ff4444,#cc2222)", color:"#080808"}}>
                        Option {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{background:`${B.accent}12`, border:`1px solid ${B.accent}30`, borderRadius:"8px", padding:"14px", textAlign:"center"}}>
                  <div style={{color:B.accent, fontFamily:"'Bebas Neue',sans-serif", fontSize:"16px", letterSpacing:"2px"}}>✅ DÉCISION PRISE — OPTION {replied[selected.id]}</div>
                  <div style={{color:B.muted, fontSize:"11px", fontFamily:"'DM Sans',sans-serif", marginTop:"4px"}}>Les agents appliquent votre décision.</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info banner */}
      <div style={{background:`${B.accent}08`, border:`1px solid ${B.accent}20`, borderRadius:"12px", padding:"20px", marginTop:"20px"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"14px", letterSpacing:"2px", color:B.accent, marginBottom:"8px"}}>👑 VOUS ÊTES LE PDG — LES AGENTS SONT VOTRE ÉQUIPE</div>
        <p style={{color:B.muted, fontSize:"12px", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.7"}}>
          99% du temps, les agents gèrent seuls. Pour les décisions qui engagent l'avenir de FOLLOW. — prix, fournisseurs, crises, clôture — vous êtes toujours informé et vous avez le dernier mot. <strong style={{color:"#888"}}>On ne fonce jamais dans un précipice sans vous.</strong>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// CART VIEW
// ============================================================
function CartView({ cart, setCart, cartTotal, sym, getName, getPrice, setView }) {
  const [paid, setPaid] = useState(false);
  const upd = (id,d) => setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const del = (id) => setCart(prev=>prev.filter(i=>i.id!==id));

  if (paid) return (
    <div style={{maxWidth:"460px", margin:"100px auto", textAlign:"center", padding:"0 24px", animation:"fadeUp .5s ease"}}>
      <div style={{fontSize:"52px", marginBottom:"18px"}}>✅</div>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", letterSpacing:"3px", marginBottom:"10px"}}>COMMANDE CONFIRMÉE !</h2>
      <p style={{color:B.muted, fontFamily:"'DM Sans',sans-serif", lineHeight:"1.7", marginBottom:"24px"}}>OrderBot transmet votre commande au fournisseur. Paiement reçu sur votre IBAN via Stripe SEPA.</p>
      <button className="btn" onClick={()=>{setPaid(false);setView("store");}}>Continuer les achats</button>
    </div>
  );

  return (
    <div style={{maxWidth:"760px", margin:"0 auto", padding:"40px 24px 80px", animation:"fadeUp .4s ease"}}>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"30px", letterSpacing:"3px", marginBottom:"24px"}}>🛒 PANIER</h2>
      {cart.length===0 ? (
        <div style={{textAlign:"center", padding:"80px 0"}}>
          <div style={{fontSize:"40px", marginBottom:"12px"}}>🛒</div>
          <p style={{color:B.muted, fontFamily:"'DM Sans',sans-serif"}}>Panier vide</p>
          <button className="btn" style={{marginTop:"16px"}} onClick={()=>setView("store")}>Voir les produits</button>
        </div>
      ) : (
        <>
          <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"24px"}}>
            {cart.map(item=>(
              <div key={item.id} style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"14px", display:"flex", alignItems:"center", gap:"13px"}}>
                <img src={item.img} style={{width:"64px", height:"64px", borderRadius:"9px", objectFit:"cover"}} />
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif", fontWeight:"700", fontSize:"14px"}}>{getName(item)}</div>
                  <div style={{color:B.accent, fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", marginTop:"2px"}}>{sym}{getPrice(item.basePrice)}</div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:"7px"}}>
                  <button onClick={()=>upd(item.id,-1)} style={{background:B.mid, border:"none", color:B.text, width:"26px", height:"26px", borderRadius:"5px", cursor:"pointer", fontSize:"14px"}}>−</button>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px", minWidth:"16px", textAlign:"center"}}>{item.qty}</span>
                  <button onClick={()=>upd(item.id,1)} style={{background:B.mid, border:"none", color:B.text, width:"26px", height:"26px", borderRadius:"5px", cursor:"pointer", fontSize:"14px"}}>+</button>
                </div>
                <button onClick={()=>del(item.id)} style={{background:"transparent", border:"none", color:"#333", cursor:"pointer", fontSize:"16px"}}>✕</button>
              </div>
            ))}
          </div>
          <div style={{background:B.card, border:`1px solid ${B.border}`, borderRadius:"12px", padding:"22px"}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"6px", color:B.muted, fontFamily:"'DM Sans',sans-serif", fontSize:"13px"}}>
              <span>Sous-total</span><span>{sym}{cartTotal.toFixed(2)}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"14px", color:"#00ff88", fontFamily:"'DM Sans',sans-serif", fontSize:"13px"}}>
              <span>🚚 Livraison gratuite</span><span>{sym}0.00</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"18px", fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", letterSpacing:"1px"}}>
              <span>TOTAL</span><span style={{color:B.accent}}>{sym}{cartTotal.toFixed(2)}</span>
            </div>
            <button className="btn" style={{width:"100%", padding:"14px", fontSize:"14px"}} onClick={()=>setPaid(true)}>
              🔒 PAYER — {sym}{cartTotal.toFixed(2)}
            </button>
            <p style={{textAlign:"center", color:"#333", fontSize:"10px", fontFamily:"'DM Sans',sans-serif", marginTop:"10px"}}>Stripe SEPA · IBAN direct · SSL 256-bit · OrderBot fulfillment auto</p>
          </div>
        </>
      )}
    </div>
  );
}
