import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { ASSETS } from "./world/assets.js";
import { loadWorldAssets } from "./world/asset-loader.js";
import { buildForestWorld } from "./world/forest.js";
import { createCharacterController } from "./world/character.js";
import { createCottage } from "./world/cottage.js";
import { createHarvestDirector } from "./world/harvest.js";
import { createWoodYard } from "./world/wood-yard.js";
import { createStoneYard } from "./world/stone-yard.js";
import { createVillageEditor } from "./world/village-editor.js";
import { CELL, footprintFromSize } from "./world/village-grid.js";
import { captureCharacterPortrait } from "./world/capture-portrait.js";
import { createGameState } from "./world/game-state.js";
import { createAmbientAudio } from "./audio.js";
import { createKitchen } from "./world/kitchen.js";
import { createPumpkinField } from "./world/pumpkin-field.js";
import { createWell } from "./world/well.js";
import { createSoupLoop } from "./world/soup-loop.js";
import { createClayPit } from "./world/clay-pit.js";
import { createClayYard } from "./world/clay-yard.js";
import { createClayLoop } from "./world/clay-loop.js";
import { createStudy } from "./world/study.js";
import { createStudyLoop } from "./world/study-loop.js";
import { createValleyHarbor } from "./world/valley.js";
import { createClouds } from "./world/clouds.js";
import { createCritters } from "./world/critters.js";
import { createOrderBoard } from "./world/order-board.js";
import { createHouseIi } from "./world/house-ii.js";
import { createBakery } from "./world/bakery.js";
import { createWorkshop } from "./world/workshop.js";
import { createWorkshopLoop } from "./world/workshop-loop.js";
import { createDirtPaths } from "./world/dirt-paths.js";
import { createFoliage } from "./world/foliage.js";
import { createWheatField } from "./world/wheat-field.js";
import { createMillModel } from "./world/mill.js";
import { createWheatLoop } from "./world/wheat-loop.js";
import { createSheepPen } from "./world/sheep-pen.js";
import { createSheepLoop } from "./world/sheep-loop.js";
import { createAppleTree } from "./world/apple-tree.js";
import { createAppleLoop } from "./world/apple-loop.js";
import { createBerryBush } from "./world/berry-bush.js";
import { createBerryLoop } from "./world/berry-loop.js";
import { createChickenCoop } from "./world/chicken-coop.js";
import { createEggLoop } from "./world/egg-loop.js";
import { createFishingDock } from "./world/fishing-dock.js";
import { createFishLoop } from "./world/fish-loop.js";
import { createStream, streamReservedCells } from "./world/stream.js";
import { createGiftBox } from "./world/gift.js";
import { createDecoMesh } from "./world/decos.js";
import { createConstructionLoop } from "./world/construction-loop.js";
import { createSocialLayer } from "./world/social.js";
import { createHud } from "./world/hud.js";
import "./styles.css";

const canvas = document.querySelector("#world-canvas");
const errorMessage = document.querySelector("#error-message");
const errorDetail = document.querySelector("#error-detail");
const loadingScreen = document.querySelector("#loading-screen");
const loadingBarFill = document.querySelector("#loading-bar-fill");
const loadingLabel = document.querySelector("#loading-label");
const loadingPercent = document.querySelector("#loading-percent");

function updateLoadingScreen({ ratio = 0, label = "" } = {}) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  if (loadingBarFill) loadingBarFill.style.width = `${percent}%`;
  if (loadingPercent) loadingPercent.textContent = `${percent} %`;
  if (loadingLabel && label) loadingLabel.textContent = `${label} wird geladen …`;
}

function dismissLoadingScreen() {
  if (!loadingScreen) return;
  loadingScreen.classList.add("is-done");
  window.setTimeout(() => loadingScreen.remove(), 900);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d8e7);
scene.fog = new THREE.FogExp2(0xb9d8e7, 0.007);

const camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.1, 220);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const GIFT_INTERVAL_MIN = 170;
const GIFT_INTERVAL_SPAN = 90;
const GIFT_REWARDS = [
  { weight: 55, gold: [8, 16] },
  { weight: 30, gold: [10, 18], scrolls: [1, 2] },
  { weight: 15, gold: [8, 12], gems: [1, 1] },
];

const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.enableRotate = true;
controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.touches.ONE = THREE.TOUCH.PAN;
controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
controls.zoomToCursor = true;
controls.panSpeed = 1.55;
controls.keyPanSpeed = 18;
// Vertical tilt stays free (45° top-down to 80° near-horizon) so the
// sky and clouds are reachable; the azimuth stays locked to preserve
// the fixed Everdale camera direction.
controls.minPolarAngle = THREE.MathUtils.degToRad(45);
controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
controls.minDistance = 2.2;
controls.maxDistance = 110;
controls.target.set(0.4, 0.45, 0.2);
camera.position.set(16, 14, 18);
camera.lookAt(controls.target);
const lockedAzimuth = controls.getAzimuthalAngle();
controls.minAzimuthAngle = lockedAzimuth;
controls.maxAzimuthAngle = lockedAzimuth;
controls.listenToKeyEvents(window);
controls.update();

const hemisphere = new THREE.HemisphereLight(0xeaf8ff, 0x6f7a3a, 2.3);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xfff1c8, 4.1);
sun.position.set(-22, 34, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -36;
sun.shadow.camera.right = 36;
sun.shadow.camera.top = 36;
sun.shadow.camera.bottom = -36;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.bias = -0.0004;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xaed8ff, 0.9);
fill.position.set(10, 7, -9);
scene.add(fill);

function rollGiftReward() {
  const total = GIFT_REWARDS.reduce((sum, entry) => sum + entry.weight, 0);
  let pick = Math.random() * total;
  for (const entry of GIFT_REWARDS) {
    pick -= entry.weight;
    if (pick > 0) continue;
    const reward = {};
    for (const [key, range] of Object.entries(entry)) {
      if (key === "weight") continue;
      reward[key] = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    }
    return reward;
  }
  return { gold: 10 };
}

function collectGift() {
  const { giftBox, game, hud } = animationState;
  if (!giftBox?.root.visible || !game) return;
  giftBox.hide();
  const reward = rollGiftReward();
  const parts = [];
  if (reward.gold) {
    game.addGold?.(reward.gold);
    parts.push(`+${reward.gold} 🪙`);
  }
  if (reward.scrolls) {
    game.addScrolls?.(reward.scrolls);
    parts.push(`+${reward.scrolls} 📜`);
  }
  if (reward.gems) {
    game.addGems?.(reward.gems);
    parts.push(`+${reward.gems} 💎`);
  }
  game.addGiftCollected?.();
  hud?.showNotice?.("Geschenk geöffnet", `Ein Geschenk aus dem Dorf! ${parts.join(" · ")}`);
}

function findGiftSpot() {
  const walkArea = animationState.walkArea;
  if (!walkArea) return null;
  const roots = [
    animationState.cottage,
    animationState.yard,
    animationState.stoneYard,
    animationState.clayYard,
    animationState.kitchen,
    animationState.pumpkinField,
    animationState.well,
    animationState.clayPit,
    animationState.orderBoard,
    animationState.houseIi,
    animationState.houseIii,
    animationState.bakery,
    animationState.tailor,
    animationState.woodWorkshop,
    animationState.wheatField,
    animationState.mill,
    animationState.sheepPen,
    animationState.appleTree,
    animationState.study,
    animationState.houseIv,
    animationState.berryBush,
    animationState.chickenCoop,
  ]
    .map((module) => module?.root?.position ?? module?.position)
    .filter(Boolean);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());
    const x = Math.cos(angle) * radius * walkArea.radiusX * 0.86;
    const z = Math.sin(angle) * radius * walkArea.radiusZ * 0.86;
    if (z > 8.2) continue;
    if (roots.some((p) => Math.hypot(p.x - x, p.z - z) < 2.6)) continue;
    return { x, z };
  }
  return null;
}

const animationState = {
  trees: [],
  stones: [],
  character: null,
  villagers: [],
  cottage: null,
  stoneYard: null,
  research: null,
  kitchen: null,
  pumpkinField: null,
  well: null,
  clayPit: null,
  clayYard: null,
  soupLoop: null,
  clayLoop: null,
  study: null,
  studyLoop: null,
  valley: null,
  hud: null,
  game: null,
  harvest: null,
  village: null,
  paths: null,
  houseIi: null,
  bakery: null,
  tailor: null,
  woodWorkshop: null,
  workshopLoops: {},
  view: "village",
  debugPaused: false,
  windEnabled: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};
let previousFrameTime = performance.now();

function updateWind(elapsed) {
  animationState.trees.forEach((tree) => {
    if (tree.userData.lockSway || tree.userData.harvestState === "falling") return;
    const targetX = animationState.windEnabled
      ? Math.sin(elapsed * 0.72 + tree.userData.phase) * tree.userData.sway
      : 0;
    const targetZ = animationState.windEnabled
      ? Math.cos(elapsed * 0.6 + tree.userData.phase) * tree.userData.sway * 0.7
      : 0;

    tree.rotation.x = THREE.MathUtils.lerp(tree.rotation.x, targetX, 0.035);
    tree.rotation.z = THREE.MathUtils.lerp(tree.rotation.z, targetZ, 0.035);
  });
}

const needBubblesEl = document.querySelector("#need-bubbles");
const socialLayer = createSocialLayer(needBubblesEl);
const wishBubbleEls = new Map();
const wishProjector = new THREE.Vector3();

function grantWishAt(villagerId, el) {
  const result = animationState.game?.grantWish?.(villagerId);
  if (!result) return;
  if (!result.ok) {
    el.classList.remove("need-bubble-shake");
    void el.offsetWidth;
    el.classList.add("need-bubble-shake");
    return;
  }
  const grant = document.createElement("div");
  grant.className = "need-bubble-grant";
  grant.textContent = `+${result.rep} Ruf · +${result.xp} EP`;
  grant.style.left = el.style.left;
  grant.style.top = el.style.top;
  needBubblesEl.appendChild(grant);
  grant.addEventListener("animationend", () => grant.remove());
}

const workerAlertEls = new Map();
const workerAlertProjector = new THREE.Vector3();

function updateWorkerAlerts() {
  if (!needBubblesEl) return;
  const game = animationState.game;
  const shops = animationState.workshops ?? {};
  const activeIds = new Set();
  if (game && animationState.view !== "valley") {
    const snapshot = game.getSnapshot?.();
    const assigned = new Set(
      Object.values(snapshot?.villagers ?? {})
        .map((member) => member.assignedBuildingId)
        .filter(Boolean),
    );
    Object.entries(shops).forEach(([id, shop]) => {
      const needsWorker =
        game.isPlaced?.(id) && !assigned.has(id) && !(shop.loop?.isFull?.() ?? false);
      if (!needsWorker || !shop.module?.root?.visible) return;
      activeIds.add(id);
      let el = workerAlertEls.get(id);
      if (!el) {
        el = document.createElement("button");
        el.type = "button";
        el.className = "need-bubble worker-alert";
        el.innerHTML =
          '<span class="need-bubble-icon" aria-hidden="true">❗</span>' +
          '<span class="need-bubble-text"></span>';
        el.addEventListener("click", () => animationState.hud?.renderBuilding?.(id));
        needBubblesEl.appendChild(el);
        workerAlertEls.set(id, el);
      }
      const textEl = el.querySelector(".need-bubble-text");
      const label = `${shop.title?.split("·")?.[0]?.trim() ?? id} braucht eine Arbeitskraft`;
      if (textEl.textContent !== label) textEl.textContent = label;
      el.title = "Arbeiter zuweisen";
      workerAlertProjector.copy(shop.module.root.position);
      workerAlertProjector.y += (shop.module.size?.y ?? 1.8) + 0.9;
      workerAlertProjector.project(camera);
      if (workerAlertProjector.z > 1) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.style.left = `${(workerAlertProjector.x * 0.5 + 0.5) * window.innerWidth}px`;
      el.style.top = `${(-workerAlertProjector.y * 0.5 + 0.5) * window.innerHeight}px`;
    });
  }
  workerAlertEls.forEach((el, id) => {
    if (!activeIds.has(id)) {
      el.remove();
      workerAlertEls.delete(id);
    }
  });
}

function updateWishBubbles() {
  if (!needBubblesEl) return;
  const game = animationState.game;
  const activeIds = new Set();
  if (game && animationState.view !== "valley") {
    animationState.villagers.forEach((member) => {
      const id = member.getId();
      const wish = game.getWish?.(id);
      if (!wish) return;
      activeIds.add(id);
      let el = wishBubbleEls.get(id);
      if (!el) {
        el = document.createElement("button");
        el.type = "button";
        el.className = "need-bubble";
        el.innerHTML =
          '<span class="need-bubble-icon" aria-hidden="true"></span>' +
          '<span class="need-bubble-text"></span>';
        el.addEventListener("click", () => grantWishAt(id, el));
        needBubblesEl.appendChild(el);
        wishBubbleEls.set(id, el);
      }
      const iconEl = el.querySelector(".need-bubble-icon");
      const icon = wish.icon ?? "💭";
      if (iconEl.textContent !== icon) iconEl.textContent = icon;
      const textEl = el.querySelector(".need-bubble-text");
      const label = `${member.getLabel?.() ?? id} wünscht sich ${wish.label}`;
      if (textEl.textContent !== label) textEl.textContent = label;
      el.title = "Wunsch erfüllen";
      wishProjector.copy(member.root.position);
      wishProjector.y += 2.35;
      wishProjector.project(camera);
      if (wishProjector.z > 1) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.style.left = `${(wishProjector.x * 0.5 + 0.5) * window.innerWidth}px`;
      el.style.top = `${(-wishProjector.y * 0.5 + 0.5) * window.innerHeight}px`;
    });
  }
  wishBubbleEls.forEach((el, id) => {
    if (!activeIds.has(id)) {
      el.remove();
      wishBubbleEls.delete(id);
    }
  });
}

function setFollowTarget() {}

function bindInterface() {}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate(now = 0) {
  requestAnimationFrame(animate);
  const delta = Math.min(Math.max((now - previousFrameTime) / 1000, 0), 0.05);
  previousFrameTime = now;
  updateWind(now * 0.001);
  if (!animationState.debugPaused) {
    if (animationState.villagers.length) {
      animationState.villagers.forEach((member) => member.update(delta, now * 0.001));
    } else {
      animationState.character?.update(delta, now * 0.001);
    }
    animationState.harvest?.update(delta, now * 0.001);
    animationState.village?.update(delta, now * 0.001);
    animationState.soupLoop?.update(delta, now * 0.001);
    animationState.clayLoop?.update(delta, now * 0.001);
    animationState.studyLoop?.update(delta, now * 0.001);
    Object.values(animationState.workshopLoops).forEach((loop) => loop.update(delta));
    animationState.game?.tickBrewing?.(delta);
    animationState.game?.tickBuffs?.(delta);
    animationState.game?.tickValley?.(delta);
    animationState.game?.tickWishes?.(delta);
    animationState.valley?.update?.(delta);
    animationState.clouds?.update?.(delta, now * 0.001);
    animationState.critters?.update?.(delta);
    animationState.game?.tickConstructions?.(delta);
    syncConstructionEntries();
    animationState.houseIi?.update?.(camera);
    animationState.houseIii?.update?.(camera);
    animationState.houseIv?.update?.(camera);
    animationState.wheatField?.update?.(delta, now * 0.001);
    animationState.sheepPen?.update?.(delta, now * 0.001);
    animationState.appleTree?.update?.(delta, now * 0.001);
    animationState.berryBush?.update?.(delta, now * 0.001);
    animationState.chickenCoop?.update?.(delta, now * 0.001);
    animationState.fishingDock?.update?.(delta, now * 0.001);
    animationState.giftBox?.update?.(delta, now * 0.001);
    if (animationState.giftBox && !animationState.giftBox.root.visible) {
      if (now * 0.001 >= (animationState.giftNextAt ?? 0)) {
        const spot = findGiftSpot();
        if (spot) animationState.giftBox.show(spot, now * 0.001);
        animationState.giftNextAt = now * 0.001 + GIFT_INTERVAL_MIN + Math.random() * GIFT_INTERVAL_SPAN;
      }
    }
    animationState.stream?.update?.(delta, now * 0.001);
    if (animationState.millRotor) {
      animationState.millRotor.rotation.z -= delta * 0.85;
    }
    Object.entries(animationState.workshopModules ?? {}).forEach(([id, module]) => {
      const production = animationState.game?.getProduction?.(id);
      module?.setWorking?.(
        production?.current ? production.progress / (production.seconds || 1) : null,
      );
      module?.update?.(camera);
    });
    controls.update();
    const valleyView = animationState.view === "valley";
    const clampedX = THREE.MathUtils.clamp(
      controls.target.x,
      valleyView ? 24 : -14,
      valleyView ? 52 : 20,
    );
    const clampedZ = THREE.MathUtils.clamp(
      controls.target.z,
      valleyView ? -26 : -11,
      valleyView ? 6 : 15,
    );
    if (clampedX !== controls.target.x) {
      camera.position.x += clampedX - controls.target.x;
      controls.target.x = clampedX;
    }
    if (clampedZ !== controls.target.z) {
      camera.position.z += clampedZ - controls.target.z;
      controls.target.z = clampedZ;
    }
  }
  if (animationState.frozenCamera) {
    camera.position.copy(animationState.frozenCamera.position);
    controls.target.copy(animationState.frozenCamera.target);
    camera.lookAt(animationState.frozenCamera.target);
  }
  updateWishBubbles();
  updateWorkerAlerts();
  socialLayer.update(delta, now * 0.001, animationState.villagers, camera, animationState.view);
  renderer.render(scene, camera);
}

async function start() {
  bindInterface();
  window.addEventListener("resize", onResize);
  animate();

  try {
    const assets = await loadWorldAssets(ASSETS, updateLoadingScreen);
    if (loadingLabel) loadingLabel.textContent = "Welt wird aufgebaut …";
    const karlModel = cloneSkinned(assets.characterJohn);
    karlModel.userData.animationClips = assets.characterJohn.userData.animationClips;
    const miaModel = cloneSkinned(assets.characterSophie);
    miaModel.userData.animationClips = assets.characterSophie.userData.animationClips;
    const lukasModel = cloneSkinned(assets.characterJohn);
    lukasModel.userData.animationClips = assets.characterJohn.userData.animationClips;
    const portraitMap = {
      lena: assets.character,
      john: assets.characterJohn,
      sophie: assets.characterSophie,
      karl: karlModel,
      mia: miaModel,
      lukas: lukasModel,
    };
    Object.entries(portraitMap).forEach(([id, model]) => {
      const images = document.querySelectorAll(`[data-portrait="${id}"]`);
      if (!images.length || !model) return;
      try {
        const url = captureCharacterPortrait(model);
        images.forEach((image) => {
          image.src = url;
        });
      } catch (error) {
        console.warn(`Porträt ${id} konnte nicht erzeugt werden.`, error);
      }
    });

    const world = buildForestWorld(assets);
    animationState.trees = world.animatedTrees;
    animationState.stones = world.animatedStones;
    const harvestables = [...world.animatedTrees, ...world.animatedStones];
    animationState.cottage = createCottage(assets.cottage, world.walkArea.surfaceY);
    animationState.yard = createWoodYard(
      {
        empty: assets.storageEmpty,
        half: assets.storageHalf,
        full: assets.storageFull,
      },
      world.walkArea.surfaceY,
    );
    animationState.stoneYard = createStoneYard(
      {
        empty: assets.stoneStorageEmpty,
        half: assets.stoneStorageHalf,
        full: assets.stoneStorageFull,
      },
      world.walkArea.surfaceY,
    );
    animationState.study = createStudy(assets.study, world.walkArea.surfaceY);
    animationState.research = animationState.study;
    animationState.kitchen = createKitchen(assets.kitchen, world.walkArea.surfaceY);
    animationState.pumpkinField = createPumpkinField(assets.pumpkinPatch, world.walkArea.surfaceY);
    animationState.well = createWell(assets.well, world.walkArea.surfaceY);
    animationState.clayPit = createClayPit(assets.clayPit, world.walkArea.surfaceY);
    animationState.clayYard = createClayYard(
      {
        empty: assets.clayStorageEmpty,
        half: assets.clayStorageHalf,
        full: assets.clayStorageFull,
      },
      world.walkArea.surfaceY,
    );
    animationState.valley = createValleyHarbor(assets.valleyHarbor, world.walkArea.surfaceY);
    animationState.orderBoard = createOrderBoard(assets.orderBoard, world.walkArea.surfaceY);
    animationState.houseIi = createHouseIi(assets.cottage.clone(true), world.walkArea.surfaceY);
    animationState.houseIii = createHouseIi(assets.cottage.clone(true), world.walkArea.surfaceY, {
      id: "house-iii",
      position: { x: 4.4, z: -5.6 },
      yaw: -0.35,
    });
    animationState.houseIv = createHouseIi(assets.cottage.clone(true), world.walkArea.surfaceY, {
      id: "house-iv",
      position: { x: -7.2, z: -4.8 },
      yaw: 0.5,
    });
    animationState.bakery = createBakery(assets.bakery, world.walkArea.surfaceY);
    animationState.tailor = createWorkshop(assets.tailor, world.walkArea.surfaceY, {
      id: "tailor",
      position: { x: 6.6, z: 8.8 },
      yaw: -0.9,
    });
    animationState.woodWorkshop = createWorkshop(assets.woodWorkshop, world.walkArea.surfaceY, {
      id: "wood-workshop",
      position: { x: -6.6, z: 8.8 },
      yaw: 0.7,
      proxyRadius: 1.4,
    });
    animationState.wheatField = createWheatField(world.walkArea.surfaceY);
    const millParts = createMillModel();
    animationState.mill = createWorkshop(millParts.model, world.walkArea.surfaceY, {
      id: "mill",
      position: { x: -10.6, z: -4.6 },
      yaw: 0.9,
      proxyRadius: 1.5,
    });
    animationState.millRotor = millParts.rotor;
    animationState.sheepPen = createSheepPen(world.walkArea.surfaceY);
    animationState.appleTree = createAppleTree(world.walkArea.surfaceY);
    animationState.walkArea = world.walkArea;
    animationState.berryBush = createBerryBush(world.walkArea.surfaceY);
    animationState.chickenCoop = createChickenCoop(world.walkArea.surfaceY);
    animationState.fishingDock = createFishingDock(world.walkArea.surfaceY);
    animationState.giftBox = createGiftBox(world.walkArea.surfaceY);
    world.root.add(animationState.giftBox.root);
    animationState.giftNextAt = 140 + Math.random() * 60;
    animationState.workshopModules = {
      bakery: animationState.bakery,
      tailor: animationState.tailor,
      "wood-workshop": animationState.woodWorkshop,
      mill: animationState.mill,
    };
    animationState.game = createGameState();
    animationState.windEnabled = animationState.game.getWind();
    animationState.yard.setWood(animationState.game.getWood());
    animationState.stoneYard.setStone(animationState.game.getStone());
    animationState.clayYard.setClay(animationState.game.getClay());
    const woodHud = document.querySelector("#wood-count");
    const stoneHud = document.querySelector("#stone-count");
    const clayHud = document.querySelector("#clay-count");
    if (woodHud) woodHud.textContent = String(animationState.game.getWood());
    if (stoneHud) stoneHud.textContent = String(animationState.game.getStone());
    if (clayHud) clayHud.textContent = String(animationState.game.getClay());
    const makeVillager = (model, id, label) =>
      createCharacterController(
        model,
        world.walkArea,
        animationState.cottage,
        assets.axe,
        assets.chopKit,
        harvestables,
        {
          pickaxe: assets.pickaxe,
          lab: animationState.study,
          kitchen: animationState.kitchen,
          pumpkinField: animationState.pumpkinField,
          well: animationState.well,
          clayPit: animationState.clayPit,
          clayYard: animationState.clayYard,
          id,
          label,
          rootName: `resident-${id}`,
        },
      );
    animationState.villagers = [
      makeVillager(assets.character, "lena", "Lena"),
      makeVillager(assets.characterJohn, "john", "John"),
      makeVillager(assets.characterSophie, "sophie", "Sophie"),
      makeVillager(karlModel, "karl", "Karl"),
      makeVillager(miaModel, "mia", "Mia"),
      makeVillager(lukasModel, "lukas", "Lukas"),
    ];
    animationState.character = animationState.villagers[0];
    const villagerFacade = {
      root: animationState.character.root,
      isBusy: () => animationState.villagers.some((member) => member.isBusy()),
      isIndoors: () => animationState.villagers.every((member) => member.isIndoors()),
      relocateWithHome: () => {
        animationState.villagers.forEach((member) => member.relocateWithHome());
      },
      liftIndoors: (dy) => {
        animationState.villagers.forEach((member) => {
          if (!member.isIndoors()) return;
          member.relocateWithHome();
          member.root.position.y += dy;
        });
      },
      getState: () =>
        animationState.villagers.find((member) => member.isBusy())?.getState() ??
        animationState.character.getState(),
    };
    animationState.soupLoop = createSoupLoop({
      game: animationState.game,
      kitchen: animationState.kitchen,
      pumpkinField: animationState.pumpkinField,
      well: animationState.well,
      yard: animationState.yard,
      stoneYard: animationState.stoneYard,
      clayYard: animationState.clayYard,
      clayPit: animationState.clayPit,
      villagers: animationState.villagers,
      camera,
      canvas,
    });
    animationState.clayLoop = createClayLoop({
      game: animationState.game,
      clayPit: animationState.clayPit,
      clayYard: animationState.clayYard,
      yard: animationState.yard,
      stoneYard: animationState.stoneYard,
      kitchen: animationState.kitchen,
      pumpkinField: animationState.pumpkinField,
      well: animationState.well,
    });
    animationState.studyLoop = createStudyLoop({
      game: animationState.game,
      study: animationState.study,
      villagers: animationState.villagers,
    });
    animationState.workshopLoops = {
      bakery: createWorkshopLoop({
        game: animationState.game,
        building: animationState.bakery,
        buildingId: "bakery",
        taskId: "bake",
        villagers: animationState.villagers,
      }),
      tailor: createWorkshopLoop({
        game: animationState.game,
        building: animationState.tailor,
        buildingId: "tailor",
        taskId: "sew",
        villagers: animationState.villagers,
      }),
      "wood-workshop": createWorkshopLoop({
        game: animationState.game,
        building: animationState.woodWorkshop,
        buildingId: "wood-workshop",
        taskId: "craft",
        villagers: animationState.villagers,
      }),
      mill: createWorkshopLoop({
        game: animationState.game,
        building: animationState.mill,
        buildingId: "mill",
        taskId: "mill",
        villagers: animationState.villagers,
      }),
    };
    animationState.sheepLoop = createSheepLoop({
      game: animationState.game,
      sheepPen: animationState.sheepPen,
      storages: [
        animationState.yard,
        animationState.stoneYard,
        animationState.clayYard,
        animationState.kitchen,
        animationState.pumpkinField,
        animationState.well,
        animationState.clayPit,
        animationState.wheatField,
        animationState.mill,
      ],
    });
    animationState.appleLoop = createAppleLoop({
      game: animationState.game,
      appleTree: animationState.appleTree,
      storages: [
        animationState.yard,
        animationState.stoneYard,
        animationState.clayYard,
        animationState.kitchen,
        animationState.pumpkinField,
        animationState.well,
        animationState.clayPit,
        animationState.wheatField,
        animationState.mill,
        animationState.sheepPen,
      ],
    });
    animationState.fishLoop = createFishLoop({
      game: animationState.game,
      fishingDock: animationState.fishingDock,
      storages: [animationState.yard, animationState.stoneYard],
    });
    animationState.eggLoop = createEggLoop({
      game: animationState.game,
      chickenCoop: animationState.chickenCoop,
      storages: [
        animationState.yard,
        animationState.stoneYard,
        animationState.clayYard,
        animationState.kitchen,
        animationState.pumpkinField,
        animationState.well,
        animationState.clayPit,
        animationState.wheatField,
        animationState.mill,
        animationState.sheepPen,
      ],
    });
    animationState.berryLoop = createBerryLoop({
      game: animationState.game,
      berryBush: animationState.berryBush,
      storages: [
        animationState.yard,
        animationState.stoneYard,
        animationState.clayYard,
        animationState.kitchen,
        animationState.pumpkinField,
        animationState.well,
        animationState.clayPit,
        animationState.wheatField,
        animationState.mill,
        animationState.sheepPen,
      ],
    });
    animationState.wheatLoop = createWheatLoop({
      game: animationState.game,
      wheatField: animationState.wheatField,
      storages: [
        animationState.yard,
        animationState.stoneYard,
        animationState.clayYard,
        animationState.kitchen,
        animationState.pumpkinField,
        animationState.well,
        animationState.clayPit,
        animationState.mill,
      ],
      onYield: () => animationState.wheatField.triggerHarvest?.(),
    });
    const decoModels = {
      "deko-daisy": assets.decoDaisy,
      "deko-fountain": assets.decoFountain,
      "deko-lantern": createDecoMesh("deko-lantern"),
      "deko-bench": createDecoMesh("deko-bench"),
      "deko-scarecrow": createDecoMesh("deko-scarecrow"),
    };
    const mountedDecos = new Set();
    const decoRoots = new Map();
    function unmountDecoration(uid) {
      const root = decoRoots.get(uid);
      if (root?.parent) root.parent.remove(root);
      decoRoots.delete(uid);
      animationState.village?.grid?.remove?.(uid);
      mountedDecos.delete(uid);
    }

    animationState.workshops = {
      bakery: { module: animationState.bakery, loop: animationState.workshopLoops.bakery, title: "Bäckerei · Brot backen" },
      tailor: { module: animationState.tailor, loop: animationState.workshopLoops.tailor, title: "Schneiderei · Nähen" },
      "wood-workshop": { module: animationState.woodWorkshop, loop: animationState.workshopLoops["wood-workshop"], title: "Holzwerkstatt · Werken" },
      mill: { module: animationState.mill, loop: animationState.workshopLoops.mill, title: "Windmühle · Mehl mahlen" },
      "wheat-field": {
        module: animationState.wheatField,
        loop: animationState.wheatLoop,
        title: "Weizenfeld · Weizen ernten",
        usesQueue: false,
        jobKinds: ["harvest"],
      },
      "sheep-pen": {
        module: animationState.sheepPen,
        loop: animationState.sheepLoop,
        title: "Schafweide · Wolle scheren",
        usesQueue: false,
        jobKinds: ["harvest"],
      },
      "apple-tree": {
        module: animationState.appleTree,
        loop: animationState.appleLoop,
        title: "Apfelbaum · Äpfel pflücken",
        usesQueue: false,
        jobKinds: ["harvest"],
      },
      "berry-bush": {
        module: animationState.berryBush,
        loop: animationState.berryLoop,
        title: "Brombeersträucher · Beeren pflücken",
        usesQueue: false,
        jobKinds: ["harvest"],
      },
      "chicken-coop": {
        module: animationState.chickenCoop,
        loop: animationState.eggLoop,
        title: "Hühnerstall · Eier sammeln",
        usesQueue: false,
        jobKinds: ["harvest"],
      },
      "fishing-dock": {
        module: animationState.fishingDock,
        loop: animationState.fishLoop,
        title: "Angelsteg · Fische angeln",
        usesQueue: false,
        jobKinds: ["harvest"],
      },
    };
    animationState.harvest = createHarvestDirector({
      trees: harvestables,
      camera,
      canvas,
      scene: world.root,
      character: animationState.character,
      villagers: animationState.villagers,
      cottage: animationState.cottage,
      yard: animationState.yard,
      stoneYard: animationState.stoneYard,
      research: animationState.research,
      kitchen: animationState.kitchen,
      pumpkinField: animationState.pumpkinField,
      well: animationState.well,
      clayPit: animationState.clayPit,
      clayYard: animationState.clayYard,
      houseIi: animationState.houseIi,
      soupLoop: animationState.soupLoop,
      clayLoop: animationState.clayLoop,
      studyLoop: animationState.studyLoop,
      game: animationState.game,
      surfaceY: world.walkArea.surfaceY,
      setFollowTarget,
      isPlacementActive: () => Boolean(animationState.village?.isActive()),
      onOpenResearch: () => animationState.hud?.renderResearch?.(),
      valleyHarbor: animationState.valley,
      onOpenBuilding: (id) => animationState.hud?.renderBuilding?.(id),
      onOpenVillager: (id) => animationState.hud?.renderVillager?.(id),
      orderBoard: animationState.orderBoard,
      onOpenOrders: () => animationState.hud?.renderOrders?.(),
      giftBox: animationState.giftBox,
      onCollectGift: collectGift,
      workshops: animationState.workshops,
      decoRoots,
    });
    animationState.village = createVillageEditor({
      scene: world.root,
      camera,
      canvas,
      walkArea: world.walkArea,
      character: villagerFacade,
      controls,
      onModeChange: (active) => {
        if (active) animationState.harvest?.selectTree(null);
      },
      reservedCells: streamReservedCells(CELL),
      onCancelPlacement: (id) => {
        if (id.startsWith("deko-")) {
          animationState.game?.removeDecoration?.(id);
          unmountDecoration(id);
          return;
        }
        animationState.game?.cancelPlacedBuilding?.(id);
        const spec = placeable[id];
        if (spec?.root) {
          spec.root.visible = false;
          spec.root.parent?.remove(spec.root);
        }
        animationState.village?.grid?.remove?.(id);
        mounted.delete(id);
        rebuildPaths();
      },
    });
    const woodFoot = footprintFromSize(animationState.yard.size.x, animationState.yard.size.z);
    const stoneFoot = footprintFromSize(
      animationState.stoneYard.size.x,
      animationState.stoneYard.size.z,
    );
    const studyFoot = footprintFromSize(animationState.study.size.x, animationState.study.size.z);
    const kitchenFoot = footprintFromSize(
      animationState.kitchen.size.x,
      animationState.kitchen.size.z,
    );
    const patchFoot = footprintFromSize(
      animationState.pumpkinField.size.x,
      animationState.pumpkinField.size.z,
    );
    const wellFoot = footprintFromSize(animationState.well.size.x, animationState.well.size.z);
    const clayPitFoot = footprintFromSize(
      animationState.clayPit.size.x,
      animationState.clayPit.size.z,
    );
    const clayYardFoot = footprintFromSize(
      animationState.clayYard.size.x,
      animationState.clayYard.size.z,
    );

    const placeable = {
      cottage: {
        id: "cottage",
        label: "Holzhaus",
        root: animationState.cottage.root,
        size: animationState.cottage.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.cottage.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.cottage.setYaw(yaw),
        refresh: () => animationState.cottage.refreshAnchors(),
        onRelocated: () => villagerFacade.relocateWithHome(),
      },
      "wood-storage": {
        id: "wood-yard",
        label: "Holzlager",
        root: animationState.yard.root,
        size: animationState.yard.size,
        w: woodFoot.w,
        h: woodFoot.h,
        padding: 1,
        setWorldPosition: (x, z) => animationState.yard.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.yard.setYaw(yaw),
        refresh: () => animationState.yard.refreshAnchors(),
      },
      kitchen: {
        id: "kitchen",
        label: "Küche",
        root: animationState.kitchen.root,
        size: animationState.kitchen.size,
        w: kitchenFoot.w,
        h: kitchenFoot.h,
        padding: 0,
        setWorldPosition: (x, z) => animationState.kitchen.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.kitchen.setYaw(yaw),
        refresh: () => animationState.kitchen.refreshAnchors(),
      },
      "pumpkin-patch": {
        id: "pumpkin-patch",
        label: "Kürbisfeld",
        root: animationState.pumpkinField.root,
        size: animationState.pumpkinField.size,
        w: patchFoot.w,
        h: patchFoot.h,
        padding: 0,
        setWorldPosition: (x, z) => animationState.pumpkinField.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.pumpkinField.setYaw(yaw),
        refresh: () => animationState.pumpkinField.refreshAnchors(),
      },
      well: {
        id: "well",
        label: "Brunnen",
        root: animationState.well.root,
        size: animationState.well.size,
        w: Math.max(wellFoot.w, 1),
        h: Math.max(wellFoot.h, 1),
        padding: 0,
        setWorldPosition: (x, z) => animationState.well.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.well.setYaw(yaw),
        refresh: () => animationState.well.refreshAnchors(),
      },
      study: {
        id: "study",
        label: "Alchemielabor",
        root: animationState.study.root,
        size: animationState.study.size,
        w: Math.max(studyFoot.w, 2),
        h: Math.max(studyFoot.h, 2),
        padding: 0,
        setWorldPosition: (x, z) => animationState.study.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.study.setYaw(yaw),
        refresh: () => animationState.study.refreshAnchors(),
      },
      "clay-pit": {
        id: "clay-pit",
        label: "Lehmgrube",
        root: animationState.clayPit.root,
        size: animationState.clayPit.size,
        w: clayPitFoot.w,
        h: clayPitFoot.h,
        padding: 0,
        setWorldPosition: (x, z) => animationState.clayPit.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.clayPit.setYaw(yaw),
        refresh: () => animationState.clayPit.refreshAnchors(),
      },
      "clay-storage": {
        id: "clay-yard",
        label: "Lehmlager",
        root: animationState.clayYard.root,
        size: animationState.clayYard.size,
        w: clayYardFoot.w,
        h: clayYardFoot.h,
        padding: 0,
        setWorldPosition: (x, z) => animationState.clayYard.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.clayYard.setYaw(yaw),
        refresh: () => animationState.clayYard.refreshAnchors(),
      },
      "stone-storage": {
        id: "stone-yard",
        label: "Steinlager",
        root: animationState.stoneYard.root,
        size: animationState.stoneYard.size,
        w: stoneFoot.w,
        h: stoneFoot.h,
        padding: 1,
        setWorldPosition: (x, z) => animationState.stoneYard.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.stoneYard.setYaw(yaw),
        refresh: () => animationState.stoneYard.refreshAnchors(),
      },
      "order-board": {
        id: "order-board",
        label: "Auftragsbrett",
        root: animationState.orderBoard.root,
        size: animationState.orderBoard.size,
        w: 1,
        h: 1,
        padding: 0,
        setWorldPosition: (x, z) => animationState.orderBoard.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.orderBoard.setYaw(yaw),
        refresh: () => animationState.orderBoard.refreshAnchors(),
      },
      "house-ii": {
        id: "house-ii",
        label: "Wohnhaus II",
        root: animationState.houseIi.root,
        size: animationState.houseIi.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.houseIi.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.houseIi.setYaw(yaw),
        refresh: () => animationState.houseIi.refreshAnchors(),
      },
      "house-iii": {
        id: "house-iii",
        label: "Wohnhaus III",
        root: animationState.houseIii.root,
        size: animationState.houseIii.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.houseIii.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.houseIii.setYaw(yaw),
        refresh: () => animationState.houseIii.refreshAnchors(),
      },
      "house-iv": {
        id: "house-iv",
        label: "Wohnhaus IV",
        root: animationState.houseIv.root,
        size: animationState.houseIv.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.houseIv.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.houseIv.setYaw(yaw),
        refresh: () => animationState.houseIv.refreshAnchors(),
      },
      bakery: {
        id: "bakery",
        label: "Bäckerei",
        root: animationState.bakery.root,
        size: animationState.bakery.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.bakery.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.bakery.setYaw(yaw),
        refresh: () => animationState.bakery.refreshAnchors(),
      },
      tailor: {
        id: "tailor",
        label: "Schneiderei",
        root: animationState.tailor.root,
        size: animationState.tailor.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.tailor.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.tailor.setYaw(yaw),
        refresh: () => animationState.tailor.refreshAnchors(),
      },
      "wood-workshop": {
        id: "wood-workshop",
        label: "Holzwerkstatt",
        root: animationState.woodWorkshop.root,
        size: animationState.woodWorkshop.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.woodWorkshop.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.woodWorkshop.setYaw(yaw),
        refresh: () => animationState.woodWorkshop.refreshAnchors(),
      },
      "wheat-field": {
        id: "wheat-field",
        label: "Weizenfeld",
        root: animationState.wheatField.root,
        size: animationState.wheatField.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.wheatField.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.wheatField.setYaw(yaw),
        refresh: () => animationState.wheatField.refreshAnchors(),
      },
      mill: {
        id: "mill",
        label: "Windmühle",
        root: animationState.mill.root,
        size: animationState.mill.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.mill.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.mill.setYaw(yaw),
        refresh: () => animationState.mill.refreshAnchors(),
      },
      "sheep-pen": {
        id: "sheep-pen",
        label: "Schafweide",
        root: animationState.sheepPen.root,
        size: animationState.sheepPen.size,
        w: 2,
        h: 2,
        padding: 1,
        setWorldPosition: (x, z) => animationState.sheepPen.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.sheepPen.setYaw(yaw),
        refresh: () => animationState.sheepPen.refreshAnchors(),
      },
      "apple-tree": {
        id: "apple-tree",
        label: "Apfelbaum",
        root: animationState.appleTree.root,
        size: animationState.appleTree.size,
        w: 1,
        h: 1,
        padding: 1,
        setWorldPosition: (x, z) => animationState.appleTree.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.appleTree.setYaw(yaw),
        refresh: () => animationState.appleTree.refreshAnchors(),
      },
      "berry-bush": {
        id: "berry-bush",
        label: "Brombeersträucher",
        root: animationState.berryBush.root,
        size: animationState.berryBush.size,
        w: 2,
        h: 1,
        padding: 1,
        setWorldPosition: (x, z) => animationState.berryBush.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.berryBush.setYaw(yaw),
        refresh: () => animationState.berryBush.refreshAnchors(),
      },
      "chicken-coop": {
        id: "chicken-coop",
        label: "Hühnerstall",
        root: animationState.chickenCoop.root,
        size: animationState.chickenCoop.size,
        w: 2,
        h: 2,
        padding: 0,
        setWorldPosition: (x, z) => animationState.chickenCoop.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.chickenCoop.setYaw(yaw),
        refresh: () => animationState.chickenCoop.refreshAnchors(),
      },
      "fishing-dock": {
        id: "fishing-dock",
        label: "Angelsteg",
        root: animationState.fishingDock.root,
        size: animationState.fishingDock.size,
        w: 2,
        h: 2,
        padding: 0,
        setWorldPosition: (x, z) => animationState.fishingDock.setWorldPosition(x, z),
        setYaw: (yaw) => animationState.fishingDock.setYaw(yaw),
        refresh: () => animationState.fishingDock.refreshAnchors(),
      },
    };

    animationState.paths = createDirtPaths();
    world.root.add(animationState.paths.group);
    const rebuildPaths = () => {
      animationState.paths.rebuild(
        animationState.village.grid.list().map((building) => building.root.position),
        world.walkArea.surfaceY,
      );
    };

    function mountDecoration(deco) {
      if (!deco?.id || mountedDecos.has(deco.id)) return null;
      const model = decoModels[deco.type]?.clone?.(true);
      const root = new THREE.Group();
      if (model) root.add(model);
      const proxy = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 1.3, 10),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      proxy.position.y = 0.62;
      root.add(proxy);
      root.position.y = world.walkArea.surfaceY;
      world.root.add(root);
      const label =
        animationState.game.decorations?.find((entry) => entry.id === deco.type)?.label ??
        deco.type;
      const record = animationState.village.register({
        id: deco.id,
        label,
        root,
        w: 1,
        h: 1,
        padding: 0,
        setWorldPosition: (x, z) => root.position.set(x, world.walkArea.surfaceY, z),
        setYaw: (yaw) => {
          root.rotation.y = yaw;
        },
        refresh: () => {},
      });
      mountedDecos.add(deco.id);
      decoRoots.set(deco.id, root);
      return record;
    }
    animationState.game.getDecorations?.().forEach(mountDecoration);

    const mounted = new Set();
    function mountPlaced(id) {
      const spec = placeable[id];
      if (!spec) return null;
      if (mounted.has(id)) return animationState.village.grid.get(spec.id);
      world.root.add(spec.root);
      spec.root.visible = true;
      const relocated = spec.onRelocated;
      spec.onRelocated = () => {
        relocated?.();
        rebuildPaths();
      };
      const record = animationState.village.register(spec);
      mounted.add(id);
      rebuildPaths();
      return record;
    }

    const constructionLoops = new Map();
    const productionEntries = new Map();
    function syncConstructionEntries() {
      const game = animationState.game;
      if (!game || !animationState.workshops) return;
      const constructions = game.getSnapshot?.()?.constructions ?? {};
      Object.entries(placeable).forEach(([id, spec]) => {
        const inProgress = Boolean(constructions[id]) && mounted.has(id) && spec.root.visible;
        if (inProgress) {
          if (!productionEntries.has(id)) {
            productionEntries.set(id, animationState.workshops[id] ?? null);
          }
          if (!constructionLoops.has(id)) {
            const centerDir = spec.root.position.clone().setY(0);
            if (centerDir.lengthSq() > 0.01) centerDir.multiplyScalar(0.9);
            const shim = {
              root: spec.root,
              size: spec.size,
              stand: centerDir.clone().setY(world.walkArea.surfaceY),
              look: spec.root.position.clone().setY(world.walkArea.surfaceY + 0.6),
            };
            const module = productionEntries.get(id)?.module ?? shim;
            constructionLoops.set(
              id,
              createConstructionLoop({
                game,
                module,
                buildingId: id,
                villagers: animationState.villagers,
              }),
            );
          }
          animationState.workshops[id] = {
            module: constructionLoops.get(id).module ?? (productionEntries.get(id)?.module ?? shim),
            loop: constructionLoops.get(id),
            title: `Baustelle · ${spec.label}`,
            usesQueue: false,
            jobKinds: ["work"],
            construction: true,
          };
        } else if (productionEntries.has(id) || constructionLoops.has(id)) {
          const loop = constructionLoops.get(id);
          if (loop) {
            const builderId = constructions[id]?.builderId;
            [...animationState.villagers].forEach((member) => {
              if (loop.has(member.getId())) loop.release(member.getId());
            });
          }
          constructionLoops.delete(id);
          const previous = productionEntries.get(id);
          productionEntries.delete(id);
          if (previous) animationState.workshops[id] = previous;
          else delete animationState.workshops[id];
        }
      });
    }

    ["cottage", "wood-storage", "kitchen", "pumpkin-patch", "well", "study", "order-board"].forEach(mountPlaced);
    ["clay-pit", "clay-storage", "stone-storage", "house-ii", "house-iii", "bakery", "tailor", "wood-workshop", "wheat-field", "mill", "sheep-pen", "apple-tree", "berry-bush", "chicken-coop", "fishing-dock", "house-iv"].forEach((id) => {
      if (animationState.game.isPlaced(id)) mountPlaced(id);
    });

    animationState.villagers.forEach((member) => {
      world.root.add(member.root);
      if (member.getId() === "sophie" && !animationState.game.isVillagerUnlocked("sophie")) {
        member.root.visible = false;
      }
      if (member.getId() === "karl" && !animationState.game.isVillagerUnlocked("karl")) {
        member.root.visible = false;
      }
      if (member.getId() === "mia" && !animationState.game.isVillagerUnlocked("mia")) {
        member.root.visible = false;
      }
      if (member.getId() === "lukas" && !animationState.game.isVillagerUnlocked("lukas")) {
        member.root.visible = false;
      }
    });
    world.root.add(animationState.valley.root);
    scene.add(world.root);
    animationState.clouds = createClouds();
    scene.add(animationState.clouds.root);
    animationState.critters = createCritters(world.walkArea.surfaceY);
    scene.add(animationState.critters.root);

    const foliageZones = [
      ...animationState.village.grid.list().map((building) => ({
        x: building.root.position.x,
        z: building.root.position.z,
        r: Math.max(building.w, building.h) * CELL * 0.55 + (building.padding ?? 1) * CELL,
      })),
      ...world.animatedStones.map((stone) => ({
        x: stone.position.x,
        z: stone.position.z,
        r: 0.8,
      })),
    ];
    animationState.foliage = createFoliage({ area: world.walkArea, zones: foliageZones });
    scene.add(animationState.foliage.root);
    animationState.stream = createStream(world.walkArea.surfaceY);
    scene.add(animationState.stream.root);

    const focusVillager = (id) => {
      const member = animationState.villagers.find((entry) => entry.getId() === id);
      if (!member) return;
      controls.target.copy(member.root.position);
      controls.target.y += 0.6;
    };

    const setValleyView = (on) => {
      animationState.view = on ? "valley" : "village";
      animationState.valley.setVisible(on && animationState.game.isValleyUnlocked());
      if (on && animationState.game.isValleyUnlocked()) {
        animationState.game.simulateValleyMembers(1);
        camera.position.copy(animationState.valley.cameraAnchor);
        controls.target.copy(animationState.valley.lookTarget);
        document.querySelector("#btn-valley").textContent = "Zum Dorf";
      } else {
        camera.position.set(16, 14, 18);
        controls.target.set(0.4, 0.45, 0.2);
        const button = document.querySelector("#btn-valley");
        if (button) button.textContent = "Zum Tal";
      }
    };

    animationState.hud = createHud({
      game: animationState.game,
      onBuild: (id) => {
        if (id.startsWith("deko-")) {
          const result = animationState.game.placeDecoration?.(id);
          if (result?.ok) {
            const record = mountDecoration({ id: result.uid, type: id });
            animationState.village?.beginPlace?.(record);
          }
          return result;
        }
        const result = animationState.game.placeBuilding(id);
        if (result.ok) {
          const record = mountPlaced(id);
          animationState.village?.beginPlace?.(record);
        }
        return result;
      },
      onValley: () => {
        setValleyView(animationState.view !== "valley");
        return animationState.view === "valley";
      },
      onWind: (enabled) => {
        animationState.windEnabled = enabled;
      },
      onFocusVillager: focusVillager,
      onKitchen: () => {
        animationState.harvest?.selectKitchen();
      },
      onWorkshop: (id) => {
        animationState.harvest?.selectWorkshop?.(id);
      },
      onPotion: (potionId) => {
        animationState.harvest?.selectPotion?.(potionId);
      },
      onReset: () => {
        animationState.game.resetSave();
        window.location.reload();
      },
    });
    animationState.hud.bind();
    const syncStorageCaps = (snap) => {
      animationState.yard.setMax?.(snap.village.woodCap);
      animationState.stoneYard.setMax?.(snap.village.stoneCap);
      animationState.clayYard.setMax?.(snap.village.clayCap);
    };
    syncStorageCaps(animationState.game.getSnapshot());
    const syncConstruction = (snap) => {
      const entry = snap.constructions?.["house-ii"];
      animationState.houseIi?.setConstruction(entry ? 1 - entry.remaining / entry.total : null);
      const entryIii = snap.constructions?.["house-iii"];
      animationState.houseIii?.setConstruction(entryIii ? 1 - entryIii.remaining / entryIii.total : null);
      const entryIv = snap.constructions?.["house-iv"];
      animationState.houseIv?.setConstruction(entryIv ? 1 - entryIv.remaining / entryIv.total : null);
    };
    syncConstruction(animationState.game.getSnapshot());
    const offline = animationState.game.getOfflineSummary?.();
    if (
      offline &&
      offline.seconds > 60 &&
      (offline.constructions.length || offline.researchDone || offline.shipReturned)
    ) {
      const minutes = Math.round(offline.seconds / 60);
      const away =
        minutes >= 120
          ? `${Math.floor(minutes / 60)} Std ${minutes % 60} Min`
          : `${minutes} Min`;
      const lines = [`<p class="sheet-hint">Du warst ${away} weg.</p>`];
      if (offline.constructions.length) {
        lines.push(
          `<div class="inv-row"><span>Bau fertig</span><strong>${offline.constructions
            .map((id) => animationState.game.getCatalogItem(id)?.label ?? id)
            .join(", ")}</strong></div>`,
        );
      }
      if (offline.researchDone) {
        const node = animationState.game.nodes.find((entry) => entry.id === offline.researchDone);
        lines.push(`<div class="inv-row"><span>Erforscht</span><strong>${node?.name ?? offline.researchDone}</strong></div>`);
      }
      if (offline.shipReturned) {
        lines.push(`<div class="inv-row"><span>⛵ Schiff</span><strong>Zurück mit Diamanten</strong></div>`);
      }
      if (offline.constructions.includes("house-ii")) {
        lines.push(`<div class="inv-row"><span>Einzug</span><strong>Sophie wohnt jetzt hier</strong></div>`);
      }
      if (offline.constructions.includes("house-iii")) {
        lines.push(`<div class="inv-row"><span>Einzug</span><strong>Mia wohnt jetzt hier</strong></div>`);
      }
      if (offline.constructions.includes("house-iv")) {
        lines.push(`<div class="inv-row"><span>Einzug</span><strong>Lukas wohnt jetzt hier</strong></div>`);
      }
      animationState.hud?.showNotice?.("Willkommen zurück!", lines.join(""));
    }
    const audio = createAmbientAudio();
    audio.setMuted(animationState.game.getMuted?.());
    const startAudio = () => {
      audio.start();
      window.removeEventListener("pointerdown", startAudio);
    };
    window.addEventListener("pointerdown", startAudio, { once: false });
    animationState.audio = audio;

    let sophieWas = Boolean(animationState.game.getSnapshot().villagers.sophie?.unlocked);
    animationState.game.subscribe((snap) => {
      audio.setMuted(snap.settings?.muted);
      const sophieNow = Boolean(snap.villagers.sophie?.unlocked);
      if (sophieNow && !sophieWas) {
        animationState.hud?.showNotice?.(
          "Sophie ist eingezogen!",
          `<p class="sheet-hint">Ein neuer Bewohner hilft im Dorf — auf dem Wohnhaus II steht jetzt Sophies Zuhause.</p>`,
        );
      }
      sophieWas = sophieNow;
      syncConstruction(snap);
      const sophie = animationState.villagers.find((entry) => entry.getId() === "sophie");
      if (sophie) sophie.root.visible = Boolean(snap.villagers.sophie?.unlocked);
      const karl = animationState.villagers.find((entry) => entry.getId() === "karl");
      if (karl) karl.root.visible = Boolean(snap.villagers.karl?.unlocked);
      const mia = animationState.villagers.find((entry) => entry.getId() === "mia");
      if (mia) mia.root.visible = Boolean(snap.villagers.mia?.unlocked);
      const lukas = animationState.villagers.find((entry) => entry.getId() === "lukas");
      if (lukas) lukas.root.visible = Boolean(snap.villagers.lukas?.unlocked);
      if (snap.valleyUnlocked && animationState.view === "valley") {
        animationState.valley.setVisible(true);
      }
      animationState.valley?.setShip?.(snap.valley?.ship);
      animationState.valley?.setCrates?.(snap.valley?.crates);
      animationState.valley?.setLibraryBuilt?.(Boolean(snap.valley?.library?.built));
      animationState.valley?.setGuildhallBuilt?.(Boolean(snap.valley?.guildhall?.built));
      animationState.valley?.setMineBuilt?.(Boolean(snap.valley?.mine?.built));
      animationState.valley?.setMonumentStage?.(snap.valley?.monument?.stage ?? 0);
      syncStorageCaps(snap);
    });

    updateLoadingScreen({ ratio: 1, label: "Fertig" });
    dismissLoadingScreen();

    window.__everdaleDebug = {
      character: animationState.character,
      villagers: animationState.villagers,
      cottage: animationState.cottage,
      stoneYard: animationState.stoneYard,
      research: animationState.research,
      kitchen: animationState.kitchen,
      pumpkinField: animationState.pumpkinField,
      well: animationState.well,
      clayPit: animationState.clayPit,
      clayYard: animationState.clayYard,
      orderBoard: animationState.orderBoard,
      houseIi: animationState.houseIi,
      valley: animationState.valley,
      bakery: animationState.bakery,
      tailor: animationState.tailor,
      woodWorkshop: animationState.woodWorkshop,
      workshopLoops: animationState.workshopLoops,
      giftBox: animationState.giftBox,
      spawnGift: () => {
        const spot = findGiftSpot();
        if (spot) animationState.giftBox.show(spot, 0);
        return spot;
      },
      clayLoop: animationState.clayLoop,
      soupLoop: animationState.soupLoop,
      game: animationState.game,
      harvest: animationState.harvest,
      village: animationState.village,
      yard: animationState.yard,
      trees: world.animatedTrees,
      stones: world.animatedStones,
      camera,
      controls,
      renderer,
      scene,
      getSnapshot: () => animationState.character.getSnapshot(),
      finishChop: () =>
        animationState.villagers
          .find((member) => {
            const state = member.getState();
            return state === "job-chop" || state === "job-align";
          })
          ?.debugFinishChop?.(),
      finishWork: () =>
        animationState.villagers.find((member) => member.getState() === "job-work")?.debugFinishWork?.(),
      selectKitchen: () => animationState.harvest?.selectKitchen(),
      selectPatch: () => animationState.harvest?.selectPatch(),
      selectClay: () => animationState.harvest?.selectClay(),
      assignCook: (id) => {
        const member = animationState.villagers.find((entry) => entry.getId() === id);
        return animationState.soupLoop?.assignCook(member);
      },
      assignClay: (id) => {
        const member = animationState.villagers.find((entry) => entry.getId() === id);
        return animationState.clayLoop?.assignDigger(member);
      },
      selectWorkshop: (id) => animationState.harvest?.selectWorkshop?.(id),
      selectPotion: (id) => animationState.harvest?.selectPotion?.(id),
      brewPotion: (id) => animationState.game?.brewPotion?.(id),
      finishBrew: () => {
        const brewing = animationState.game?.getBrewing?.();
        if (brewing?.queue.length) {
          animationState.game.getRaw().brewing.progress = 999;
        }
      },
      givePotion: (potionId, villagerId) =>
        animationState.game?.applyPotion?.(potionId, villagerId),
      placeDecoration: (typeId) => {
        const result = animationState.game?.placeDecoration?.(typeId);
        if (result?.ok) mountDecoration({ id: result.uid, type: typeId });
        return result;
      },
      removeDecoration: (uid) => {
        const result = animationState.game?.removeDecoration?.(uid);
        if (result?.ok) unmountDecoration(uid);
        return result;
      },
      listDecorations: () => animationState.game?.getDecorations?.() ?? [],
      queueRecipe: (buildingId, recipeId) =>
        animationState.game?.queueRecipe?.(buildingId, recipeId ?? "bread"),
      assignWorkshop: (buildingId, villagerId) => {
        const member = animationState.villagers.find((entry) => entry.getId() === villagerId);
        return animationState.workshopLoops?.[buildingId]?.assign?.(member);
      },
      finishWorkshop: (buildingId = "bakery") => {
        const production = animationState.game?.getProduction?.(buildingId);
        if (production?.current) {
          animationState.game.getRaw().buildings[buildingId].productionProgress =
            production.seconds - 0.05;
        }
      },
      setPaused: (paused) => {
        animationState.debugPaused = Boolean(paused);
      },
      lockCamera: () => {
        animationState.follow = null;
        animationState.cameraTween = null;
        animationState.cameraUserControlled = true;
      },
      finishConstruction: () => {
        const entry = animationState.game.getRaw().constructions?.["house-ii"];
        if (entry) entry.remaining = 0.01;
      },
      snapCamera: (x, y, z, tx, ty, tz) => {
        animationState.follow = null;
        animationState.cameraTween = null;
        animationState.cameraUserControlled = true;
        animationState.frozenCamera = {
          position: new THREE.Vector3(x, y, z),
          target: new THREE.Vector3(tx, ty, tz),
        };
        camera.position.set(x, y, z);
        controls.target.set(tx, ty, tz);
        camera.lookAt(tx, ty, tz);
        camera.updateMatrixWorld();
      },
    };

  } catch (error) {
    console.error(error);
    errorDetail.textContent = error?.message || "Unbekannter Ladefehler";
    errorMessage.hidden = false;
    dismissLoadingScreen();
  }
}

start();
