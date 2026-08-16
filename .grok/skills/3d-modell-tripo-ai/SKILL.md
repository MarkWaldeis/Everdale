---
name: 3d-modell-tripo-ai
description: >
  Turn a needed game 3D asset into a white-background Grok Imagine render,
  convert that image to a model with Tripo AI in the user's already-open
  logged-in Chrome tab, then import the GLB into this Everdale project. Use
  when the user needs a new 3D model, GLB, mesh, image-to-3D, Tripo, or
  runs /3d-modell-tripo-ai.
---

# 3D-Modell Tripo AI

Mandatory pipeline for every new 3D mesh in this project. Do not sculpt in code, do not download a random GLB, do not use Tripo text-to-3D. Image first, then Tripo, then the game.

The user opens **studio.tripo3d.ai** in Chrome and signs in **before** the session. Always drive that already-open window. Never open Tripo in Playwright Chromium or any other fresh browser — that session is logged out and wastes time.

## Credits — do not burn tokens

Each **Modell generieren** click spends credits (often 40–55). Treat every click as expensive.

- Generate **once** per approved still. Never retry because you got impatient.
- Do not start a second job while **Wird generiert...** or a progress bar is visible.
- Confirm the **image** is uploaded (thumbnail in the left Image-to-3D slot) **before** you click generate.
- Confirm you used the **image** file picker, not the right-hand **3D-Modell hochladen** picker (that one only accepts GLB/OBJ/FBX/STL).
- Confirm the list item you invoked is the PNG you just saved (`everdale-<slug>.png`), not an old GLB.
- One good mesh can be reused (scale/rotation) instead of a second generation for a minor variant.
- If the generate button cost is higher than remaining credits, stop and tell the user. Do not click it.

## 1. Imagine source image

Load the `imagine` skill, then call `image_gen`.

- One object only. No ground plane, no shadow catcher, no scene, no extra props, no text.
- Solid pure white background (`#FFFFFF`). The object is the entire subject.
- Three-quarter view, fully in frame, not cropped. Even studio lighting.
- Match this game: stylized painted Supercell / Everdale clay, not photoreal, not low-poly brick.
- Aspect `1:1` for props and buildings unless the user asked for a long/tall silhouette.

If the result is not a lone object on white, `image_edit` until it is. Read the image back and check before continuing.

Copy the approved still to both:

- `3d Assets/<slug>.png` (repo)
- `%USERPROFILE%\Downloads\everdale-<slug>.png` (Tripo's file dialog usually opens on Downloads)

Use a short English slug (`well`, `bakery`, `pickaxe`). Same slug for the GLB and the asset id.

## 2. Tripo — the logged-in Chrome window

Do not invent a Tripo API. Drive the existing Chrome window with Windows UI Automation (not Playwright).

Find the top-level window whose title contains `3D-Modell generieren` (full title looks like `3D-Modell generieren - Bild und Text zu 3D: Sofort, Professionell, Kostenlos - Google Chrome`). If that window is missing, **stop** and ask the user to open studio.tripo3d.ai and sign in.

### Upload (image picker only)

1. There are two buttons named like `Datei auswählen: Keine ausgewählt`. **Use the first one** (left column, Image to 3D). The second is for uploading an existing mesh.
2. `InvokePattern` on that first button. The Open dialog is a **nested** window under Chrome (`Öffnen` / `Open`), not a top-level window. Search descendants of the Chrome window.
3. Press F5 in that dialog so Downloads refreshes.
4. Find the `ListItem` named `everdale-<slug>.png` and Invoke it.
5. **Gate:** after the dialog closes, the first image picker must no longer say `Keine ausgewählt` (thumbnail in the left slot). If the dialog listed only `.glb` files, you hit the wrong picker — Escape, then use the first picker. Do not generate.

### Generate — once, then wait

1. Read the yellow button label (`Modell generieren 40` / `55`). If you cannot afford it, stop.
2. Click **Modell generieren** exactly once.
3. Wait. A run often takes **1–3 minutes**. Poll for a `ProgressBar` and a hyperlink `Wird generiert...`. Keep waiting until **both are gone**.
4. Success: a new history hyperlink appears (Tripo names it, e.g. `rock moss 3d model 08-16 21:35` or `hammer 3d model 08-16 21:40`).
5. Do not click generate again, do not refresh, do not upload another file until this job is finished.

### Export GLB

1. Click the history item if it is not already selected.
2. Click **Exportieren**. A nested `Exportieren` dialog opens; format **GLB** is the default.
3. Click **Exportieren** inside that dialog.
4. Chrome downloads to Downloads as something like `rock+moss+3d+model.glb` or `hammer+3d+model.glb`. Wait until the download shelf says Fertig / the `.glb` file has a stable size.
5. Copy that file to `3d Assets/<slug>.glb`. Overwrite only that slug.

If upload or export fails, say what the UI showed. Do not switch to another 3D generator.

## 3. Put it in the game

1. Register the GLB in `src/world/assets.js` with `new URL("../../3d Assets/<slug>.glb", import.meta.url).href` and a `height` like the other entries.
2. Load it through `loadWorldAssets` / `ASSETS` — never a raw filesystem path in the client.
3. Wire it into the feature that needed it (building, prop, village `register`, and so on).
4. For a placeable building, register it with the village editor so it snaps to the same grid and spacing as house and wood yard.

Verify the mesh in the running game (loads, sits on the ground, scale matches nearby objects) before calling the task done.
