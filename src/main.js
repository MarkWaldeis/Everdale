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
import { captureCharacterPortrait } from "./world/capture-portrait.js";
import "./styles.css";

const canvas = document.querySelector("#world-canvas");
const errorMessage = document.querySelector("#error-message");
const errorDetail = document.querySelector("#error-detail");
const windToggle = document.querySelector("#wind-toggle");
const viewButtons = [...document.querySelectorAll("[data-view]")];
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
controls.enablePan = false;
controls.screenSpacePanning = false;
controls.minPolarAngle = THREE.MathUtils.degToRad(4);
controls.maxPolarAngle = THREE.MathUtils.degToRad(67);
controls.minDistance = 7.5;
controls.maxDistance = 82;
controls.target.set(0, 0.45, 0);

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

const cameraViews = {
  cottage: {
    position: new THREE.Vector3(0.35, 4.05, 8.3),
    target: new THREE.Vector3(-1.55, 1.2, -1.85),
    mobilePosition: new THREE.Vector3(5.5, 6.2, 13),
    mobileTarget: new THREE.Vector3(-1.5, 1.2, -1.4),
  },
  village: {
    position: new THREE.Vector3(48, 38, 50),
    target: new THREE.Vector3(0, 0.45, 0),
  },
  clearing: {
    position: new THREE.Vector3(34, 22, 36),
    target: new THREE.Vector3(0, 0.65, -0.25),
  },
  map: {
    position: new THREE.Vector3(0.1, 92, 0.1),
    target: new THREE.Vector3(0, 0, 0),
  },
  arrange: {
    position: new THREE.Vector3(22, 28, 26),
    target: new THREE.Vector3(0.4, 0.15, -0.8),
    mobilePosition: new THREE.Vector3(18, 24, 22),
    mobileTarget: new THREE.Vector3(0.2, 0.2, -0.4),
  },
};

const cottageActionViews = {
  entry: cameraViews.cottage,
  close: {
    position: new THREE.Vector3(-6.0, 4.05, 8.3),
    target: new THREE.Vector3(-1.55, 1.2, -1.85),
  },
};

const COTTAGE_CLOSE_CAMERA_STATES = new Set([
  "close-inside",
  "rest-inside",
  "open-to-exit",
  "exit",
  "position-to-close",
  "align-to-close",
  "reach-to-close",
  "close-outside",
  "leave-porch",
  "job-open-to-exit",
  "job-exit",
]);

const FOLLOW_CAMERA_STATES = new Set([
  "job-leave-porch",
  "job-walk",
  "job-align",
  "job-chop",
  "job-walk-storage",
  "job-align-storage",
  "job-deposit",
  "job-walk-home",
]);

const animationState = {
  trees: [],
  stones: [],
  character: null,
  villagers: [],
  cottage: null,
  stoneYard: null,
  harvest: null,
  village: null,
  debugPaused: false,
  windEnabled: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  cameraTween: null,
  cottageCameraStage: "entry",
  cameraUserControlled: false,
  follow: null,
};
let previousFrameTime = performance.now();
let activeCameraView = "clearing";

function setCameraView(name, immediate = false) {
  const view = cameraViews[name];
  if (!view) return;
  activeCameraView = name;
  animationState.cameraUserControlled = false;
  const useMobileView = window.innerWidth < 640 && view.mobilePosition && view.mobileTarget;
  const stagedView =
    name === "cottage" && !useMobileView
      ? cottageActionViews[animationState.cottageCameraStage]
      : view;
  const endPosition = useMobileView ? view.mobilePosition : stagedView.position;
  const endTarget = useMobileView ? view.mobileTarget : stagedView.target;

  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === name);
  });

  const duration = immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 780;
  animationState.cameraTween = {
    startedAt: performance.now(),
    duration,
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPosition: endPosition.clone(),
    endTarget: endTarget.clone(),
  };

  if (duration === 0) updateCameraTween(performance.now());
}

function updateCottageCameraStage() {
  if (animationState.follow) return;
  const members = animationState.villagers.length
    ? animationState.villagers
    : animationState.character
      ? [animationState.character]
      : [];
  if (!members.length) return;
  const nextStage = members.some((member) => COTTAGE_CLOSE_CAMERA_STATES.has(member.getState()))
    ? "close"
    : "entry";
  if (nextStage === animationState.cottageCameraStage) return;
  animationState.cottageCameraStage = nextStage;

  if (
    activeCameraView !== "cottage" ||
    window.innerWidth < 640 ||
    animationState.cameraUserControlled
  ) {
    return;
  }

  const view = cottageActionViews[nextStage];
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 1350;
  animationState.cameraTween = {
    startedAt: performance.now(),
    duration,
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPosition: view.position.clone(),
    endTarget: view.target.clone(),
  };

  if (duration === 0) updateCameraTween(performance.now());
}

function updateCameraTween(now) {
  const tween = animationState.cameraTween;
  if (!tween) return;

  const progress = tween.duration === 0 ? 1 : Math.min((now - tween.startedAt) / tween.duration, 1);
  const eased = 1 - (1 - progress) ** 3;
  camera.position.lerpVectors(tween.startPosition, tween.endPosition, eased);
  controls.target.lerpVectors(tween.startTarget, tween.endTarget, eased);

  if (progress >= 1) animationState.cameraTween = null;
}

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

function setFollowTarget(characterRoot, tree, actor = null) {
  animationState.follow = { characterRoot, tree, actor };
  animationState.cameraUserControlled = false;
  animationState.cameraTween = null;
}

function updateFollowCamera() {
  const follow = animationState.follow;
  if (!follow || animationState.cameraUserControlled) return;
  const actor = follow.actor ?? animationState.character;
  if (!actor) return;
  if (animationState.cameraTween) return;
  if (!FOLLOW_CAMERA_STATES.has(actor.getState())) {
    if (actor.getState() === "rest-inside") animationState.follow = null;
    return;
  }

  const origin = follow.characterRoot.position;
  const desiredTarget = new THREE.Vector3(origin.x, origin.y + 0.95, origin.z);
  if (follow.tree) {
    desiredTarget.lerp(follow.tree.position, 0.28);
    desiredTarget.y = origin.y + 1.05;
  }
  const desiredPosition = origin.clone().add(new THREE.Vector3(5.4, 4.6, 6.6));
  camera.position.lerp(desiredPosition, 0.045);
  controls.target.lerp(desiredTarget, 0.05);
}

function bindInterface() {
  let orbitPointer = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    orbitPointer = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener("pointermove", (event) => {
    if (!orbitPointer) return;
    if (Math.hypot(event.clientX - orbitPointer.x, event.clientY - orbitPointer.y) > 8) {
      animationState.cameraUserControlled = true;
      animationState.cameraTween = null;
      orbitPointer = null;
    }
  });
  window.addEventListener("pointerup", () => {
    orbitPointer = null;
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => setCameraView(button.dataset.view));
  });

  document.querySelector("#brand-home").addEventListener("click", (event) => {
    event.preventDefault();
    setCameraView("village");
  });

  windToggle.setAttribute("aria-pressed", String(animationState.windEnabled));
  windToggle.addEventListener("click", () => {
    animationState.windEnabled = !animationState.windEnabled;
    windToggle.setAttribute("aria-pressed", String(animationState.windEnabled));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "1") setCameraView("village");
    if (event.key === "2") setCameraView("clearing");
    if (event.key === "3") setCameraView("map");
    if (event.key === "4") setCameraView("cottage");
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  setCameraView(activeCameraView, true);
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
    updateCottageCameraStage();
    updateCameraTween(now);
    updateFollowCamera();
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
  setCameraView("clearing", true);
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
    const makeVillager = (model, id, label) =>
      createCharacterController(
        model,
        world.walkArea,
        animationState.cottage,
        assets.axe,
        assets.chopKit,
        harvestables,
        { pickaxe: assets.pickaxe, id, label, rootName: `resident-${id}` },
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
      setCameraView,
      onModeChange: (active) => {
        if (active) animationState.harvest?.selectTree(null);
      },
    });
    animationState.village.register({
      id: "cottage",
      label: "Holzhaus",
      root: animationState.cottage.root,
      size: animationState.cottage.size,
      w: 2,
      h: 2,
      padding: 1,
      setWorldPosition: (x, z) => animationState.cottage.setWorldPosition(x, z),
      refresh: () => animationState.cottage.refreshAnchors(),
      onRelocated: () => villagerFacade.relocateWithHome(),
    });
    animationState.village.register({
      id: "wood-yard",
      label: "Holzlager",
      root: animationState.yard.root,
      size: animationState.yard.size,
      w: 2,
      h: 2,
      padding: 1,
      setWorldPosition: (x, z) => animationState.yard.setWorldPosition(x, z),
      refresh: () => animationState.yard.refreshAnchors(),
    });
    animationState.village.register({
      id: "stone-yard",
      label: "Steinlager",
      root: animationState.stoneYard.root,
      size: animationState.stoneYard.size,
      w: 2,
      h: 2,
      padding: 1,
      setWorldPosition: (x, z) => animationState.stoneYard.setWorldPosition(x, z),
      refresh: () => animationState.stoneYard.refreshAnchors(),
    });
    world.root.add(
      animationState.cottage.root,
      animationState.yard.root,
      animationState.stoneYard.root,
      ...animationState.villagers.map((member) => member.root),
    );
    scene.add(world.root);

    updateLoadingScreen({ ratio: 1, label: "Fertig" });
    dismissLoadingScreen();

    window.__everdaleDebug = {
      character: animationState.character,
      villagers: animationState.villagers,
      cottage: animationState.cottage,
      stoneYard: animationState.stoneYard,
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
