---
name: 3d-modell-tripo-ai
description: >
  Turn a needed game 3D asset into a white-background Grok Imagine render,
  convert that image to a model with Tripo AI in the user's browser, then
  import the GLB into this Everdale project. Use when the user needs a new
  3D model, GLB, mesh, image-to-3D, Tripo, or runs /3d-modell-tripo-ai.
---

# 3D-Modell Tripo AI

Mandatory pipeline for every new 3D mesh in this project. Do not sculpt in code, do not download a random GLB, do not use Tripo text-to-3D. Image first, then Tripo, then the game.

## 1. Imagine source image

Load the `imagine` skill, then call `image_gen`.

- One object only. No ground plane, no shadow catcher, no scene, no extra props, no text.
- Solid pure white background (`#FFFFFF`). The object is the entire subject.
- Three-quarter view, fully in frame, not cropped. Even studio lighting.
- Match this game: stylized painted Supercell / Everdale clay, not photoreal, not low-poly brick.
- Aspect `1:1` for props and buildings unless the user asked for a long/tall silhouette.

If the result is not a lone object on white, `image_edit` until it is. Read the image back and check before continuing.

Copy the approved still to:

`3d Assets/<slug>.png`

Use a short English slug (`well`, `bakery`, `fence-post`). Keep that slug for the GLB and the asset id.

## 2. Tripo in the user's browser

Use the Playwright tools on the user's browser. Do not invent a Tripo API.

1. Open `https://studio.tripo3d.ai/workspace/generate`.
2. If a login or paywall blocks generation, stop and tell the user to sign in in that tab, then continue from this step.
3. Choose **Image to 3D** / upload. Prefer the current quality model (v3.x if shown).
4. Click the upload control, then `playwright__browser_file_upload` with the absolute path of `3d Assets/<slug>.png`. JPG/PNG/WEBP, keep the file under 20 MB.
5. Start **Generate Model**. Wait until the 3D preview is ready. Do not click Text-to-3D.
6. Export **GLB**. Save it as `3d Assets/<slug>.glb` in this repo (download via the page or a Playwright download). Overwrite only that slug.

If upload or export fails, say what the page showed. Do not switch to another 3D generator.

## 3. Put it in the game

1. Register the GLB in `src/world/assets.js` with `new URL("../../3d Assets/<slug>.glb", import.meta.url).href` and a `height` like the other entries.
2. Load it through `loadWorldAssets` / `ASSETS` — never a raw filesystem path in the client.
3. Wire it into the feature that needed it (building, prop, village `register`, and so on).
4. For a placeable building, register it with the village editor so it snaps to the same grid and spacing as house and wood yard.

Verify the mesh in the running game (loads, sits on the ground, scale matches nearby objects) before calling the task done.
