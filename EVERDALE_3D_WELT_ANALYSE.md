# Everdale – Analyse der 3D-Welt & Bauplan für den Nachbau

**Stand:** August 2026 · **Zweck:** Dieses Dokument beschreibt, wie die 3D-Welt von **Everdale** (Supercell) aufgebaut ist und worauf man achten muss, um eine solche Welt mit eigenen 3D-Assets nachzubauen. Es dient als Bauplan für die Arbeit in diesem Projekt-Ordner.

---

## 1. Überblick: Was ist Everdale?

Everdale ist ein **Dorfaufbau- und Handwerksspiel** von Supercell (Soft Launch 2021, eingestellt Oktober 2022). Kerngedanke: Man baut eine Siedlung in einem idyllischen Tal auf, weist Bewohner Aufgaben zu (Holz fällen, Rohstoffe abbauen, Handwerksgebäude bedienen) und erweitert die Welt nach und nach.

Für den Nachbau relevant ist vor allem die **Präsentation der Welt**:

- Die gesamte Spielwelt ist eine einzige, zusammenhängende **3D-Landschaft** – kein level-basiertes Scrollen, sondern ein großes Tal, das sich nach hinten und oben erstreckt.
- Die Kamera ist **fest** (keine freie Rotation), das Spiel wird aus einer leicht erhöhten, schrägen Perspektive betrachtet.
- Die Welt wirkt wie ein **liebevoll gebautes Diorama** – „Storybook"-Look mit kräftigen Farben und weichen Formen.

---

## 2. Der visuelle Stil („Look & Feel")

| Merkmal | Beschreibung |
|---|---|
| Ästhetik | Stilisiert, „Toy-/Storybook"-Look – bewusst **nicht** realistisch |
| Geometrie | Niedrige Polygon-Dichte (Low-Poly), runde, freundliche Formen |
| Farben | Warme, pastellige Palette; sattes Grasgrün, Erdtöne, sanftes Blau für Wasser |
| Texturen | Kaum Texturdetail – meist flache Farbflächen mit weichem Schatten-Gradient |
| Konturen | Weiche Kanten, keine harten Outlines |
| Licht | Warmes, weiches Umgebungslicht, lange weiche Schatten, kein harter Kontrast |
| Vignette | Dezente Dunst-/Nebel-Atmosphäre an den Welträndern |

**Konsequenz für den Nachbau:** Alle Assets müssen aus *einer* Palette kommen und *eine* Schattensprache sprechen. Ein einzelnes realistisches Asset zerstört den Gesamteindruck.

---

## 3. Kamera & Perspektive

- **Feste Schrägsicht:** Die Kamera blickt in einem Winkel von ca. 30–45° auf die Welt (Drei-Viertel-Ansicht / isometrisch-angelehnt). Keine Rotation um die Hochachse.
- **Zoom:** Mehrere feste Zoomstufen, keine freie Kamera.
- **2,5D-Rendering:** Weil die Kamera feststeht, wird die Welt wie eine isometrische Kachelwelt behandelt: **Y-Sortierung** (Objekte weiter oben auf dem Bildschirm werden hinter Objekten weiter unten gezeichnet).

**Konsequenz für den Nachbau:**
- Alle Terrain- und Gebäude-Assets werden für **genau diese eine Perspektive** gebaut/gerendert (Front-to-Back).
- Die **Render-Reihenfolge** (Sortierung nach Tiefe) ist Teil des Systems, nicht Optional.
- Höhenunterschiede müssen sich klar ablesen lassen (Klippenkanten zeigen die „Erd"-Seite).

---

## 4. Das Terrain-System (das Herzstück der Welt)

### 4.1 Ebenen statt freiem Gelände

Everdales Welt ist **nicht** ein frei modelliertes Hügelland, sondern besteht aus **klar abgesetzten Ebenen (Terrassen)**:

- Das Dorf liegt auf einer oder mehreren **flachen Ebenen** („Baufläche").
- Höhere Ebenen (z. B. hinter dem Dorf, Richtung Wald/Berge) und tiefere Bereiche (Wasser, Flusstal) sind über **Rampen und Treppen** verbunden.
- **Klippenkanten** zeigen seitlich die Erd-/Felsstruktur; obenauf liegt Gras.

### 4.2 Das Kachel-System (Tiles)

Die Ebenen sind aus **wiederholbaren Kacheln (Tiles)** zusammengesetzt. Ein Tile-Set für Klippen-Terrain braucht mindestens diese Bausteine – **alle sechs existieren bereits in diesem Ordner (`tiles/`)**:

| Tile | Datei | Funktion |
|---|---|---|
| Großes Plateau | `01_klippe_plateau_gross.png` | Grundfläche einer Ebene (mehrfach aneinandergelegt) |
| Außenecke | `02_klippe_aussenecke.png` | Ecke einer Klippe, die nach außen zeigt |
| Innenecke | `03_klippe_innenecke.png` | Ecke einer Klippe, die nach innen (ins Land) zeigt |
| Treppe gerade | `04_klippe_treppe_gerade.png` | Verbindet zwei Ebenen frontal |
| Treppe Ecke | `05_klippe_treppe_ecke.png` | Eckverbindung zwischen Ebenen |
| Rampe/Steigung | `06_klippe_rampe_steigung.png` | Sanfter Übergang (auch für Wagen/Spieler) |

**Wichtigste Eigenschaft eines guten Tile-Sets: Nahtlosigkeit.**
- Alle Kanten eines Tiles müssen exakt auf die Kanten der Nachbar-Tiles passen (gleiche Randhöhe, gleiche Grasfarbe, gleiche Schattenrichtung).
- Die **Höhenstufe** ist überall identisch (z. B. 1 Stufe = ½ Kachelhöhe), sonst entstehen Lücken oder Überlappungen.
- Ecken-Tiles und Kanten-Tiles müssen untereinander kombinierbar sein (ein Außenecke-Tile muss an ein gerades Kanten-Tile andocken).

### 4.3 Wasser

- Wasser liegt **immer auf der niedrigsten Ebene** (Fluss, Teich, See).
- **Flussufer** sind eigene Tiles (vorhanden: `props/wasser_01_fluss_ufer_tile.png`).
- **Wasserfälle** fallen über Klippenkanten – sie kaschieren die Grenze zwischen Wasser- und Land-Ebene und sind ein Markenzeichen des Everdale-Looks.

### 4.4 Wege & Pfade

- Weiche, unregelmäßige **Erd-/Sandpfade** verbinden Gebäude, Ressourcen und Rampen.
- Pfade folgen dem Raster, wirken aber durch leichte Kurven natürlich.
- Pfad-Tiles müssen sich zu **Kreuzungen, Kurven und Endstücken** kombinieren lassen.

---

## 5. Objekte & Props

### 5.1 Gebäude
- Kleine, charaktervolle Häuser und Werkstätten (Holzfällerhütte, Schmiede, Töpferei, Mühle, …).
- Jedes Gebäude steht auf einer **flachen Baufläche** (einer oder mehrere Tiles), nie auf einer Kante.
- Gebäude haben einen **Fußabdruck (Footprint)**, der für Kollision und Platzierung zählt.

### 5.2 Ressourcen-Spots
- **Bäume** (einzeln und in Gruppen), **Felsen**, **Beerenbüsche**, **Lehm-/Stein-/Erzvorkommen**, Goldminen.
- Ressourcen sind in der Welt **verstreut, aber gruppiert** – sie markieren „Arbeitszonen".
- Beim Abbau verschwinden sie oder wechseln den Zustand (animiert).

### 5.3 Vegetation & Deko (Props)
- Grasbüschel, Blumen, Büsche (vorhanden: `props/` – `gras_01..06`, `blumen_01..03`).
- **Zweck:** Die großen, ruhigen Flächen der Ebenen aufzulockern und der Welt Leben zu geben.
- Wichtig: **nicht zu dicht** – Everdale wirkt aufgeräumt, jede Pflanze sitzt bewusst.

---

## 6. Skalierung & Proportionen (das A und O)

| Größe | Empfehlung |
|---|---|
| 1 Terrain-Tile | Definiere eine Einheit (z. B. 1 m oder 1 Tile = 1 Einheit) – **alles** baut darauf auf |
| Höhenstufe | Konstante Stufenhöhe (z. B. 0,5 Tile) für alle Klippen |
| Charakter | Klein (ca. ¼–⅓ der Gebäudehöhe) – Everdale-Figuren wirken bewusst winzig |
| Gebäude | 2–4 Tiles Grundfläche, Höhe ca. 2–3 Stufen |
| Bäume | 1–2 Stufen hoch, mit großzügiger Krone |
| Kamera-Ausschnitt | Eine „Szene" (Dorf + Umgebung) sollte mit 20–40 Tiles pro Achse auskommen |

**Faustregel:** Wenn ein Gebäude auf einem Plateau steht, müssen alle Details (Tür, Fenster, Dachkante) zur **festen Kameraperspektive** ausgerichtet sein – nicht zur Weltachse.

---

## 7. Worauf man beim Nachbau achten muss (Checkliste)

### Design & Look
- [ ] **Eine Farbpalette festlegen** (ca. 10–15 Farben) und in allen Assets nur diese verwenden.
- [ ] **Eine Schattenrichtung** für alle Assets (Licht von oben-links oder oben-rechts – konsistent!).
- [ ] Nahtlose Tile-Kanten: gleiche Randhöhe, gleiche Grasfarbe an den Rändern.
- [ ] Übergänge zwischen Ebenen immer mit Rampe **oder** Treppe – nie mit freien Lücken.
- [ ] Wasser nur auf der tiefsten Ebene; Ufer sauber abschließen.
- [ ] Deko-Dichte: „aufgeräumte Natur" – Props setzen, dann zurückschrauben.

### Technik & Performance
- [ ] **Y-Sortierung** korrekt implementieren (2,5D): Objekte nach Tiefe zeichnen, sonst stehen Gebäude „über" Klippen statt „hinter" ihnen.
- [ ] **Texture-Atlas** für viele kleine Props (Gras, Blumen) – reduziert Draw-Calls massiv.
- [ ] **Instancing** für Vegetation (tausend Grasbüschel = ein Draw-Call).
- [ ] **LODs** für Gebäude/Bäume (Detailstufen für nahe/ferne Kamera).
- [ ] Kollision nur wo nötig: Terrain-Kollision auf Ebenen, Footprints für Gebäude, Rampen als begehbare Verbindungen.
- [ ] **Pfadfindung auf Ebenen** denken: Einheiten müssen Rampen/Treppen als Wege nutzen.

### Modularität (der wichtigste Punkt für den Nachbau)
- [ ] Assets in **Bausteine** zerlegen: Klippenkanten, Ebenen, Rampen, Ecken, Props, Gebäude-Module.
- [ ] Neue Welten = **neue Anordnung derselben Bausteine**, nicht neue Assets.
- [ ] Terrain-Daten als **Karte/Grid-Daten** speichern (z. B. JSON: `{ "kachel": "plateau", "hoehe": 2 }`), damit die Welt prozedural oder im Editor zusammengesetzt werden kann.

---

## 8. Stand im Projekt-Ordner & nächste Schritte

### Vorhanden (dieser Ordner)
- `tiles/` + `tiles_2x_hd/` – die **6 Klippen-/Terrain-Tiles** (Plateau, Ecken, Treppen, Rampe) – deckt das Grund-Terrain-System ab
- `props/` + `props_2x_hd/` – **Grasbüschel, Blumen, Wasser-Ufer-Tile** – deckt Vegetation & Wasserrand ab
- `3d Assets/` – `haupt boden.glb` (Grundplatte), `stepped stone 3d model.glb` (Stufen), `stylized block 3d model.glb` (Baublöcke)
- `index.html` – interaktive Galerie zum Betrachten der Assets

### Noch fehlend (Vorschläge, in dieser Reihenfolge)
1. **Fehlende Terrain-Tiles:** gerade Kante ohne Treppe, Wasserfall-Tile, Plateau-Variante mit Gras-Deko, Übergang Wasser→Klippe.
2. **Pfad-Tiles** (gerade, Kurve, Kreuzung, Ende) im Everdale-Stil.
3. **Gebäude-Module** als Low-Poly-Blöcke mit Dach (an die Palette angepasst).
4. **Ressourcen-Props** (Bäume, Felsen, Büsche) als 3D-Modelle bzw. isometrische PNGs.
5. **Beispiel-Welt:** eine Karte aus den Tiles zusammensetzen (z. B. Dorf auf Ebene 1, Wald auf Ebene 2, Fluss im Tal), um Nahtlosigkeit und Y-Sortierung zu testen.
6. **Engine-Anbindung:** Welt-Grid als JSON-Datenmodell, damit später eine Laufzeit (Three.js/Unity/Godot) die Welt aus den Tiles baut.

---

## 9. Kurz-Fazit

Everdales 3D-Welt wirkt einfach, ist aber ein präzises System:

> **Flache Ebenen + nahtlose Klippen-Tiles + feste Schrägkamera + eine warme Palette + aufgeräumte Deko = der Everdale-Look.**

Wer diese fünf Zutaten beachtet und die Assets modular baut, kann mit den vorhandenen Tiles und Props eine glaubwürdige Everdale-artige Welt zusammensetzen – und später mit eigenen 3D-Assets beliebig erweitern.

---

*Erstellt von Hermes als Bauplan für das Projekt „Everdale Kopie". Alle Angaben basieren auf öffentlich bekannten Informationen zu Everdale (Supercell) und allgemeinen Best Practices für isometrische 3D-Welten.*
