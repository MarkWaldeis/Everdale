# Everdale

Everdale is a browser 3D world. Three.js is the only 3D engine for this project.

## Engine

- Use Three.js for every scene, camera, light, mesh, material, loader, animation, shader, and interaction in 3D space.
- Import from `three` and official addons (`three/addons/...`). Do not add Babylon.js, PlayCanvas, Unity, raw custom WebGL engines, or other scene graphs.
- 2D interface (HTML/CSS) is allowed. Anything visible in the world canvas is Three.js.

## World architecture

- `src/main.js` — renderer, camera, lights, controls, animation loop
- `src/world/assets.js` — the only asset manifest. New models go here first.
- `src/world/asset-loader.js` — GLB loading via Three.js `GLTFLoader`
- `src/world/*.js` — one module per world system (forest, cottage, character, …)
- `3d Assets/` — source GLB models

New features belong in a dedicated world module. Do not dump world logic into `main.js`.

## Build

```bash
npm install
npm run dev
npm run build
```

Do not open `index.html` as a file. Use the Vite server or the GitHub Pages build.

## GitHub

After any change that should stay, commit and push to `origin` on the current branch. Do not wait to be asked. Never force-push. Do not commit leftover screenshots, debug captures, or secrets.
