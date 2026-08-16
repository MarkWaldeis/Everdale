# Everdale

Stilisierte 3D-Waldwelt im Browser, gebaut ausschließlich mit [Three.js](https://threejs.org/).

**Live:** [https://markwaldeis.github.io/Everdale/](https://markwaldeis.github.io/Everdale/)

Ziehen zum Drehen, Scrollen zum Zoomen. Tasten `1`–`4` wechseln die Kameras (Tal, Lichtung, Karte, Haus).

## Die Welt

Phase 03: erste Bewohnerin und ein begehbares Holzhaus auf einer großen Dorflichtung, umgeben von dichtem Wald.

- 27×27-Bodenraster, elliptische Lichtung (~20×18 Felder), 340 Bäume
- Nahtlose Grasfläche; das originale Boden-GLB bleibt am modellierten Außenrand sichtbar
- Die Bewohnerin nutzt den Animationsclip aus `medieval+girl+3d+model.glb`
- Die Haustür ist die originale Cottage-Geometrie, zur Laufzeit vom Haus-Mesh getrennt

## Three.js

Alle 3D-Darstellung läuft über Three.js (`three` + offizielle Addons). Neue Welt-Systeme gehören nach `src/world/` und neue Modelle zuerst ins Manifest `src/world/assets.js`. Andere 3D-Engines werden in diesem Projekt nicht verwendet.

## Lokal starten

Unter Windows `Everdale starten.cmd` doppelklicken, oder:

```bash
npm install
npm run dev
```

`index.html` nicht direkt als Datei öffnen.

## Struktur

- `src/main.js` – Renderer, Kamera, Licht, Bedienung, Animationsschleife
- `src/world/assets.js` – Asset-Manifest
- `src/world/asset-loader.js` – GLB-Laden über Three.js `GLTFLoader`
- `src/world/forest.js` – Bodenraster und Wald
- `src/world/cottage.js` – Haus, Eingang, Innenraum
- `src/world/original-door.js` – originale Türgeometrie
- `src/world/character.js` – Wander- und Haussequenz
- `3d Assets/` – Quell-GLBs
