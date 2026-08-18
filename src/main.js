import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ASSETS } from "./world/assets.js";
import { loadWorldAssets } from "./world/asset-loader.js";
import { buildForestWorld } from "./world/forest.js";
import { createCharacterController } from "./world/character.js";
import { createCottage } from "./world/cottage.js";
import { createHarvestDirector } from "./world/harvest.js";
import { createWoodYard } from "./world/wood-yard.js";
import { createStoneYard } from "./world/stone-yard.js";
import { createVillageEditor } from "./world/village-editor.js";
import { footprintFromSize } from "./world/village-grid.js";
import { captureCharacterPortrait } from "./world/capture-portrait.js";
import { createGameState } from "./world/game-state.js";
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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.enableRotate = true;
controls.minPolarAngle = THREE.MathUtils.degToRad(8);
controls.maxPolarAngle = THREE.MathUtils.degToRad(78);
controls.minDistance = 4;
controls.maxDistance = 90;
controls.target.set(0.4, 0.45, 0.2);
camera.position.set(16, 14, 18);
camera.lookAt(controls.target);

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
    controls.update();
  }
  if (animationState.frozenCamera) {
    camera.position.copy(animationState.frozenCamera.position);
    controls.target.copy(animationState.frozenCamera.target);
    camera.lookAt(animationState.frozenCamera.target);
  }
  renderer.render(scene, camera);
}

async function start() {
  bindInterface();
  window.addEventListener("resize", onResize);
  animate();

  try {
    const assets = await loadWorldAssets(ASSETS, updateLoadingScreen);
    if (loadingLabel) loadingLabel.textContent = "Welt wird aufgebaut …";
    const portraitMap = {
      lena: assets.character,
      john: assets.characterJohn,
      sophie: assets.characterSophie,
    };
    Object.entries(portraitMap).forEach(([id, model]) => {
      const image = document.querySelector(`[data-portrait="${id}"]`);
      if (!image || !model) return;
      try {
        image.src = captureCharacterPortrait(model);
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
      soupLoop: animationState.soupLoop,
      clayLoop: animationState.clayLoop,
      studyLoop: animationState.studyLoop,
      game: animationState.game,
      surfaceY: world.walkArea.surfaceY,
      setFollowTarget,
      isPlacementActive: () => Boolean(animationState.village?.isActive()),
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
        label: "Studierstube",
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
    };

    const mounted = new Set();
    function mountPlaced(id) {
      const spec = placeable[id];
      if (!spec || mounted.has(id)) return;
      world.root.add(spec.root);
      spec.root.visible = true;
      animationState.village.register(spec);
      mounted.add(id);
    }

    ["cottage", "wood-storage", "kitchen", "pumpkin-patch", "well"].forEach(mountPlaced);
    ["study", "clay-pit", "clay-storage", "stone-storage"].forEach((id) => {
      if (animationState.game.isPlaced(id)) mountPlaced(id);
    });

    animationState.villagers.forEach((member) => {
      world.root.add(member.root);
      if (member.getId() === "sophie" && !animationState.game.isVillagerUnlocked("sophie")) {
        member.root.visible = false;
      }
    });
    world.root.add(animationState.valley.root);
    scene.add(world.root);

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
        const result = animationState.game.placeBuilding(id);
        if (result.ok) mountPlaced(id);
        return result;
      },
      onValley: () => {
        setValleyView(animationState.view !== "valley");
      },
      onWind: (enabled) => {
        animationState.windEnabled = enabled;
      },
      onFocusVillager: focusVillager,
      onReset: () => {
        animationState.game.resetSave();
        window.location.reload();
      },
    });
    animationState.hud.bind();
    animationState.game.subscribe((snap) => {
      const sophie = animationState.villagers.find((entry) => entry.getId() === "sophie");
      if (sophie) sophie.root.visible = Boolean(snap.villagers.sophie?.unlocked);
      if (snap.valleyUnlocked && animationState.view === "valley") {
        animationState.valley.setVisible(true);
      }
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
      setPaused: (paused) => {
        animationState.debugPaused = Boolean(paused);
      },
      lockCamera: () => {
        animationState.follow = null;
        animationState.cameraTween = null;
        animationState.cameraUserControlled = true;
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
