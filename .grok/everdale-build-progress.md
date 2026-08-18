# Everdale Build Loop
STATUS: IN_PROGRESS
Aktuelle Phase: 2
Letzter Tick: 2026-08-18T16:20:00.000Z
Nächster Slice: P2 Study as unique self-built GLB (not alchemy reuse) with the first live tech node unlocking a building

## Gates
- [ ] no prototype chrome
- [ ] HUD GDD 6.1 every button works
- [ ] 2+ villagers, houses hire more, portraits+drag-drop
- [x] soup loop complete
- [ ] wood/clay/stone + caps/upgrades
- [ ] study tree through valley unlock (Study 4) and later tiers not dead
- [ ] all GDD 4.2 workshops as unique 3D + recipes/queue/warehouse
- [ ] Otto orders pay into inventory
- [ ] potions brew and buff
- [ ] build menu place/upgrade costs + villager construction
- [ ] building modal level/worker/queue/upgrade
- [ ] valley guilds/mines/ships/library/monument e2e
- [x] gold/gems/rep/scrolls/soup/storage consistent
- [x] save+reload
- [ ] offline tick GDD 10
- [x] every new asset is a self-built GLB
- [ ] audio mute
- [x] desktop+mobile
- [x] npm run build

## Modelle selbst gebaut
- kitchen-cauldron.glb — offener Kochschuppen, Kupferkessel, Suppe, Kelle, Tisch, Holzstoß
- pumpkin-patch.glb — Hochbeet, Reben, Blätter, geriffelte Kürbisse
- village-well.glb — Steinring, Dach, Seil, Eimer, Kurbel
- clay-pit.glb — Lehmkessel, Bermen, Steg, Seilzug, Schubkarre, Schaufel, nasse Klumpen
- clay-storage-empty.glb — Trockenschuppen, Tonziegeldach, Weidenroste, leere Körbe
- clay-storage-half.glb — dieselben Gestelle mit Ziegelreihen und einem vollen Korb
- clay-storage-full.glb — volle Roste, Bodenstapel, Leinentuch, überlaufende Klumpen

## Systeme
- game-state.js (GDD 8.1–8.3, localStorage everdale-game-v1)
- kitchen.js / pumpkin-field.js / well.js + village.register
- soup-loop.js: Koch pflückt Kürbis, kocht 45s, 1 Kürbis = 2 Suppe, Kessel 10
- Hunger: arbeitende Holzfäller 1 Suppe / 90s, sonst HUNGRY + Pause, dann EATING
- Sim-States IDLE / WALKING / WORKING / HUNGRY / EATING
- Idle-Ziel Brunnen
- HUD: Suppe + Kürbis, Hungrig-Blase
- clay-pit.js / clay-yard.js / clay-loop.js + village.register
- Lehm: Grube tippen, Spitzhacke, 5er-Ladung ins Lager, Schleife bis Cap 20
- Sammler stoppen bei vollem Holz-/Stein-/Lehmlager
- Holz/Stein/Lehm persistieren in village + HUD /20

## Regressions
- Küche antippen → Dock „Küche · Suppe kochen“ → Lena kocht, Suppe 0→2→5, Kürbis sinkt
- John hackt ohne Suppe → HUNGRY/EATING, danach wieder WORKING
- Sophie Stein + Spitzhacke
- Anordnen öffnet nach Reset
- Save/Reload: Suppe 5, Kürbis 3
- Mobile 390×844: Zähler lesbar
- npm run build grün
- Lehmgrube antippen → Dock „Lehmgrube · Lehm graben“ → Lena gräbt, Lehm 0→5→20, Lager leer/halb/voll
- Bei 20: Dock „Lehmlager ist voll“, keine neue Zuweisung, Lena geht heim
- Save/Reload Lehm 20
- Stein abbauen und Anordnen bleiben grün
- Holzlager voll blockiert Baum-Zuweisung
