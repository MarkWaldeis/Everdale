import * as THREE from "three";

const WALK_SPEED = 1.35;
const ARRIVE = [
  new THREE.Vector3(16.8, 0, 11.8),
  new THREE.Vector3(7.2, 0, 10.4),
];
const CHAT_LOOK = 2.6;

function pickWalkClip(clips) {
  const named = clips.find((clip) => /walk|gehen|laufen/i.test(clip.name));
  if (named) return named;
  let best = null;
  let bestTravel = -1;
  for (const clip of clips) {
    const travel = clip.tracks
      .filter((t) => /(^|\/)(Hip|Root)\.position$/i.test(t.name))
      .reduce((sum, t) => {
        const v = t.values;
        if (!v || v.length < 6) return sum;
        const dx = v[v.length - 3] - v[0];
        const dz = v[v.length - 1] - v[2];
        return sum + Math.hypot(dx, dz);
      }, 0);
    if (travel > bestTravel) {
      bestTravel = travel;
      best = clip;
    }
  }
  return best ?? clips[0] ?? null;
}

export function createVisitor(model, walkArea, wellPosition) {
  const root = new THREE.Group();
  root.name = "valley-visitor";
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const clips = model.userData.animationClips ?? [];
  const walkClip = pickWalkClip(clips);
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null;
  if (walkAction) {
    walkAction.enabled = true;
    walkAction.setEffectiveWeight(0);
    walkAction.play();
  }
  root.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  const start = ARRIVE[0];
  root.position.set(start.x, walkArea.surfaceY, start.z);

  const hangouts = [];
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    hangouts.push(
      new THREE.Vector3(
        wellPosition.x + Math.cos(a) * 2.4,
        0,
        wellPosition.z + Math.sin(a) * 2.0,
      ),
    );
  }
  const route = [...ARRIVE.slice(1), ...hangouts, ...ARRIVE.slice(1).reverse(), ARRIVE[0]];
  const state = {
    leg: 0,
    departAt: null,
    pauseUntil: 0,
    faceTarget: null,
    chats: 0,
    gone: false,
    visited: false,
  };

  function pauseRoam(seconds, facePoint) {
    if (state.gone) return false;
    state.pauseUntil = Math.max(state.pauseUntil, performance.now() / 1000 + seconds);
    state.faceTarget = facePoint ?? null;
    state.chats += 1;
    return true;
  }

  function update(delta, elapsed) {
    mixer.update(delta);
    if (state.gone) return;
    if (state.departAt === null) {
      // starts countdown once the visitor crosses the bridge
      if (state.leg >= hangouts.length / 2) state.departAt = elapsed + 55;
    }
    if (state.departAt !== null && elapsed > state.departAt && state.leg < route.length - ARRIVE.length - hangouts.length) {
      // head home: jump legs to the departure section
      state.leg = 1 + hangouts.length;
      state.faceTarget = null;
    }
    const paused = state.pauseUntil > elapsed;
    const target = route[state.leg];
    if (!paused && target) {
      const dx = target.x - root.position.x;
      const dz = target.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.18) {
        state.leg += 1;
        if (state.leg >= route.length) {
          state.gone = true;
          root.visible = false;
          return;
        }
      } else {
        const step = Math.min(dist, WALK_SPEED * delta);
        root.position.x += (dx / dist) * step;
        root.position.z += (dz / dist) * step;
        const wantYaw = Math.atan2(dx, dz);
        let dy = wantYaw - root.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        root.rotation.y += dy * Math.min(1, delta * 6);
      }
    } else if (paused && state.faceTarget) {
      const wantYaw = Math.atan2(state.faceTarget.x - root.position.x, state.faceTarget.z - root.position.z);
      let dy = wantYaw - root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      root.rotation.y += dy * Math.min(1, delta * 4);
    }
    const moving = !paused && target && state.leg < route.length;
    walkAction?.setEffectiveWeight(THREE.MathUtils.lerp(walkAction.getEffectiveWeight(), moving ? 1 : 0, delta * 5));
    root.position.y = walkArea.surfaceY + (moving ? Math.abs(Math.sin(elapsed * 8)) * 0.015 : 0);
  }

  return {
    root,
    update,
    get gone() {
      return state.gone;
    },
    get chats() {
      return state.chats;
    },
    // social-layer facade
    getId: () => "visitor",
    isBusy: () => false,
    isIndoors: () => false,
    isAsleep: () => false,
    pauseRoam,
  };
}
