# Three.js only

Everdale is a Three.js project. Every 3D feature must use Three.js.

- Scene, camera, renderer, lights, meshes, materials, textures, shadows, fog, shaders: Three.js
- Model loading: Three.js `GLTFLoader` (or other official Three.js loaders)
- Animation and skeletal playback: Three.js `AnimationMixer` / clips
- Camera controls: Three.js addons such as `OrbitControls`
- New packages: only if they wrap or extend Three.js. Never replace it.

Register new GLB/texture assets in `src/world/assets.js` before using them. Build the feature in `src/world/`, then wire it from `src/main.js`.
