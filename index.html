<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FOLLOW TREND | EMPIRE</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #050505; color: #fff; }
        .gold { color: #D4AF37; }
        .gold-bg { background-color: #D4AF37; }
    </style>
</head>
<body>
    <header class="p-10 text-center border-b border-zinc-900">
        <h1 class="text-6xl font-black gold tracking-tighter">FOLLOW TREND</h1>
        <p class="text-zinc-500 uppercase tracking-widest text-xs mt-2">Infrastructure v10.5 | Agents Active</p>
    </header>

    <div id="grid" class="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 p-10">
        <div id="status" class="col-span-full text-center py-20">
            <p class="gold animate-pulse uppercase font-bold text-sm">L'agent Hunter déploie le catalogue AliExpress...</p>
        </div>
    </div>

    <script>
        async function load() {
            try {
                // Utilisation de l'URL absolue pour forcer la liaison
                const r = await fetch('https://followtrend.shop/?action=search');
                const d = await r.json();
                const g = document.getElementById('grid');
                
                if(d.success && d.products.length > 0) {
                    g.innerHTML = d.products.map(p => `
                        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-[#D4AF37] transition-all">
                            <img src="${p.image}" class="w-full h-56 object-cover">
                            <div class="p-5 text-center">
                                <h3 class="text-[11px] text-zinc-400 h-10 overflow-hidden mb-4">${p.name}</h3>
                                <p class="text-2xl font-bold mb-4">${p.price}€</p>
                                <a href="${p.link}" target="_blank" class="gold-bg text-black px-6 py-2 rounded-lg font-black text-[10px] uppercase block">Commander</a>
                            </div>
                        </div>
                    `).join('');
                } else {
                    document.getElementById('status').innerHTML = "Aucun produit trouvé.";
                }
            } catch(e) {
                document.getElementById('status').innerHTML = "<p class='text-red-600 font-bold'>Erreur : Vérifiez que RAPIDAPI_KEY est bien sur Render.</p>";
            }
        }
        window.onload = load;
    </script>
</body>
</html>
