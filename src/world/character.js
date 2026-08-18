import * as THREE from "three";
import { createAxeWielder } from "./axe.js";
import { createWalkability, resolveStandPoint, routeViaClearing } from "./pathing.js";

const WALK_SPEED = 0.72;
const DOOR_WALK_SPEED = 0.54;
const NATURAL_WALK_SPEED = 0.69165;
const ARRIVAL_DISTANCE = 0.025;
const SNAP_LIMIT = 0.08;
const HANDLE_CONTACT_DISTANCE = 0.075;
const TURN_SPEED = 4.1;
const MODEL_FORWARD_OFFSET = 0;
const BASE_HEAD_LIFT = THREE.MathUtils.degToRad(8);

const STATES = Object.freeze({
  ROAM: "roam",
  HOME_APPROACH: "home-approach",
  ASCEND_PORCH: "ascend-porch",
  ALIGN_AT_DOOR: "align-at-door",
  REACH_TO_ENTER: "reach-to-enter",
  OPEN_TO_ENTER: "open-to-enter",
  ENTER: "enter",
  CLOSE_INSIDE: "close-inside",
  REST_INSIDE: "rest-inside",
  OPEN_TO_EXIT: "open-to-exit",
  EXIT: "exit",
  POSITION_TO_CLOSE: "position-to-close",
  ALIGN_TO_CLOSE: "align-to-close",
  REACH_TO_CLOSE: "reach-to-close",
  CLOSE_OUTSIDE: "close-outside",
  LEAVE_PORCH: "leave-porch",
  JOB_OPEN_TO_EXIT: "job-open-to-exit",
  JOB_EXIT: "job-exit",
  JOB_LEAVE_PORCH: "job-leave-porch",
  JOB_WALK: "job-walk",
  JOB_ALIGN: "job-align",
  JOB_CHOP: "job-chop",
  JOB_WALK_STORAGE: "job-walk-storage",
  JOB_ALIGN_STORAGE: "job-align-storage",
  JOB_DEPOSIT: "job-deposit",
  JOB_WALK_HOME: "job-walk-home",
  JOB_WORK: "job-work",
  VISIT_WALK: "visit-walk",
  VISIT_ALIGN: "visit-align",
  VISIT_ENTER: "visit-enter",
  VISIT_INSIDE: "visit-inside",
  VISIT_EXIT: "visit-exit",
  VISIT_LEAVE: "visit-leave",
});

const JOB_STATES = new Set([
  STATES.JOB_OPEN_TO_EXIT,
  STATES.JOB_EXIT,
  STATES.JOB_LEAVE_PORCH,
  STATES.JOB_WALK,
  STATES.JOB_ALIGN,
  STATES.JOB_CHOP,
  STATES.JOB_WALK_STORAGE,
  STATES.JOB_ALIGN_STORAGE,
  STATES.JOB_DEPOSIT,
  STATES.JOB_WALK_HOME,
  STATES.JOB_WORK,
  STATES.VISIT_WALK,
  STATES.VISIT_ALIGN,
  STATES.VISIT_ENTER,
  STATES.VISIT_EXIT,
  STATES.VISIT_LEAVE,
]);

const DEPOSIT_TIME = 1.2;

const CHOP_CYCLE = 0.92;

const scratch = {
  direction: new THREE.Vector3(),
  nextPosition: new THREE.Vector3(),
  modelWorld: new THREE.Quaternion(),
  parentWorld: new THREE.Quaternion(),
  targetWorld: new THREE.Quaternion(),
  naturalLook: new THREE.Quaternion(),
  lookEuler: new THREE.Euler(0, 0, 0, "YXZ"),
};

function smootherStep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function randomPointInEllipse(radiusX, radiusZ, isAllowed) {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(0.08 + Math.random() * 0.82);
    const point = new THREE.Vector3(
      Math.cos(angle) * radiusX * radius,
      0,
      Math.sin(angle) * radiusZ * radius,
    );

    if (!isAllowed || isAllowed(point)) return point;
  }

  return new THREE.Vector3(radiusX * 0.62, 0, radiusZ * 0.38);
}

function signedAngleDifference(current, target) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function rotateToward(object, targetAngle, delta) {
  const difference = signedAngleDifference(object.rotation.y, targetAngle);
  const maximumTurn = TURN_SPEED * delta;
  object.rotation.y += THREE.MathUtils.clamp(difference, -maximumTurn, maximumTurn);
  object.rotation.y =
    THREE.MathUtils.euclideanModulo(object.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
  return Math.abs(difference);
}

function extractNamedClip(model, preferredName) {
  const clips = model?.userData.animationClips ?? [];
  const exact = clips.find((clip) => clip.name === preferredName);
  if (exact) return exact;
  const fuzzy = clips.find((clip) => new RegExp(preferredName, "i").test(clip.name));
  return fuzzy ?? null;
}

function clipNetTravel(clip, pattern) {
  const track = clip?.tracks.find((item) => pattern.test(item.name));
  if (!track || track.times.length < 2) return 0;
  const size = track.getValueSize();
  if (size < 3) return 0;
  const last = track.times.length - 1;
  return Math.hypot(
    track.values[last * size] - track.values[0],
    track.values[last * size + 1] - track.values[1],
    track.values[last * size + 2] - track.values[2],
  );
}

function classifyCharacterClips(model, chopKit) {
  const own = model?.userData.animationClips ?? [];
  const namedChop =
    extractNamedClip(model, "hacken") ||
    own.find((clip) => /hacken|chop|hack/i.test(clip.name));
  const scored = own.map((clip) => ({
    clip,
    travel: Math.max(
      clipNetTravel(clip, /(^|\/)Hip\.position$/i),
      clipNetTravel(clip, /(^|\/)Root\.position$/i),
    ),
  }));
  const byTravel = [...scored].sort((left, right) => right.travel - left.travel);
  const travelGap = (byTravel[0]?.travel ?? 0) - (byTravel[1]?.travel ?? 0);
  const byDuration = [...scored].sort((left, right) => left.clip.duration - right.clip.duration);
  const walk =
    travelGap >= 0.08
      ? byTravel[0]?.clip
      : byDuration[0]?.clip ?? own[0] ?? null;
  let chop = (travelGap >= 0.08 ? byTravel : byDuration).find(
    (entry) => entry.clip !== walk,
  )?.clip ?? null;

  if (namedChop && namedChop !== walk) {
    chop = namedChop;
  } else if (!chop) {
    chop =
      extractNamedClip(chopKit, "AN_Girl_ChopTree") ?? extractNamedClip(chopKit, "hacken");
  }

  return { walk, chop };
}

function plantClip(sourceClip, name) {
  if (!sourceClip) return null;
  const tracks = sourceClip.tracks
    .filter((track) => !/(^|\/)Root\.(position|translation)$/i.test(track.name))
    .map((track) => track.clone());
  return new THREE.AnimationClip(name, sourceClip.duration, tracks);
}

function cleanWalkClip(sourceClip) {
  const clipStart = Math.min(
    ...sourceClip.tracks
      .filter((track) => track.times.length)
      .map((track) => track.times[0]),
  );
  const clipEnd = Math.max(
    ...sourceClip.tracks
      .filter((track) => track.times.length)
      .map((track) => track.times[track.times.length - 1]),
  );
  const tracks = sourceClip.tracks
    .filter((track) => !/(^|\/)(Head|NeckTwist01|NeckTwist02)\./i.test(track.name))
    .map((track) => {
      const cleanedTrack = track.clone();
      if (/(^|\/)Hip\.position$/i.test(cleanedTrack.name)) {
        const valueSize = cleanedTrack.getValueSize();
        const keyframeCount = cleanedTrack.times.length;
        const firstTime = cleanedTrack.times[0];
        const duration = cleanedTrack.times[keyframeCount - 1] - firstTime;

        if (valueSize === 3 && keyframeCount >= 2 && duration > 0) {
          const drift = [0, 1, 2].map(
            (axis) =>
              cleanedTrack.values[(keyframeCount - 1) * valueSize + axis] -
              cleanedTrack.values[axis],
          );

          for (let keyframe = 0; keyframe < keyframeCount; keyframe += 1) {
            const progress = (cleanedTrack.times[keyframe] - firstTime) / duration;
            for (let axis = 0; axis < valueSize; axis += 1) {
              cleanedTrack.values[keyframe * valueSize + axis] -= drift[axis] * progress;
            }
          }
        }
      }

      for (let keyframe = 0; keyframe < cleanedTrack.times.length; keyframe += 1) {
        cleanedTrack.times[keyframe] -= clipStart;
      }

      return cleanedTrack;
    });
  return new THREE.AnimationClip("CleanWalk", clipEnd - clipStart, tracks);
}

function createHeadStabilizer(model) {
  const head = model.getObjectByName("Head");
  if (!head?.parent) return () => {};

  model.updateWorldMatrix(true, true);
  const neutralModelWorld = model.getWorldQuaternion(new THREE.Quaternion());
  const neutralHeadWorld = head.getWorldQuaternion(new THREE.Quaternion());
  const neutralHeadRelative = neutralModelWorld.invert().multiply(neutralHeadWorld);

  return (elapsed, movementAmount) => {
    model.updateWorldMatrix(true, true);
    model.getWorldQuaternion(scratch.modelWorld);
    head.parent.getWorldQuaternion(scratch.parentWorld);

    scratch.lookEuler.set(
      BASE_HEAD_LIFT + Math.sin(elapsed * 1.05) * 0.012 * movementAmount,
      Math.sin(elapsed * 0.47) * 0.025,
      0,
    );
    scratch.naturalLook.setFromEuler(scratch.lookEuler);
    scratch.targetWorld
      .copy(scratch.modelWorld)
      .multiply(neutralHeadRelative)
      .multiply(scratch.naturalLook);

    head.quaternion
      .copy(scratch.parentWorld.invert())
      .multiply(scratch.targetWorld)
      .normalize();
    head.updateWorldMatrix(false, true);
  };
}

function createArmReacher(model, handleAnchor, preferredSide = null) {
  const inactive = Object.freeze({
    apply: () => {},
    getDistance: () => Infinity,
  });
  if (!handleAnchor) return inactive;

  const sides = preferredSide ? [preferredSide] : ["L", "R"];
  const chains = sides
    .map((side) => ({
      upperarm: model.getObjectByName(`${side}_Upperarm`),
      forearm: model.getObjectByName(`${side}_Forearm`),
      hand: model.getObjectByName(`${side}_Hand`),
    }))
    .filter((chain) => chain.upperarm && chain.forearm && chain.hand);
  if (!chains.length) return inactive;

  const jointPosition = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const targetPosition = new THREE.Vector3();
  const currentDirection = new THREE.Vector3();
  const targetDirection = new THREE.Vector3();
  const currentWorld = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();
  const desiredLocal = new THREE.Quaternion();
  const deltaRotation = new THREE.Quaternion();
  let activeChain = null;
  let lastDistance = Infinity;

  function apply(weight, options = {}) {
    if (weight < 0.002) {
      activeChain = null;
      lastDistance = Infinity;
      return;
    }

    const iterations = options.iterations ?? 5;
    const forearmBlend = options.forearmBlend ?? 0.72;
    const upperBlend = options.upperBlend ?? 0.56;

    model.updateWorldMatrix(true, true);
    handleAnchor.updateWorldMatrix(true, false);
    handleAnchor.getWorldPosition(targetPosition);

    if (!activeChain) {
      activeChain = chains.reduce((closest, candidate) => {
        candidate.hand.getWorldPosition(handPosition);
        const candidateDistance = handPosition.distanceToSquared(targetPosition);
        if (!closest || candidateDistance < closest.distance) {
          return { chain: candidate, distance: candidateDistance };
        }
        return closest;
      }, null).chain;
    }

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      [activeChain.forearm, activeChain.upperarm].forEach((joint, jointIndex) => {
        joint.updateWorldMatrix(true, true);
        joint.getWorldPosition(jointPosition);
        activeChain.hand.getWorldPosition(handPosition);
        currentDirection.subVectors(handPosition, jointPosition);
        targetDirection.subVectors(targetPosition, jointPosition);
        if (currentDirection.lengthSq() < 0.000001 || targetDirection.lengthSq() < 0.000001) {
          return;
        }

        currentDirection.normalize();
        targetDirection.normalize();
        deltaRotation.setFromUnitVectors(currentDirection, targetDirection);
        joint.getWorldQuaternion(currentWorld);
        joint.parent.getWorldQuaternion(parentWorld);
        desiredWorld.copy(deltaRotation).multiply(currentWorld);
        desiredLocal.copy(parentWorld.invert()).multiply(desiredWorld);
        joint.quaternion.slerp(
          desiredLocal,
          weight * (jointIndex === 0 ? forearmBlend : upperBlend),
        );
        joint.updateWorldMatrix(false, true);
      });
    }

    activeChain.hand.getWorldPosition(handPosition);
    lastDistance = handPosition.distanceTo(targetPosition);
  }

  return {
    apply,
    getDistance: () => lastDistance,
  };
}

export function createCharacterController(
  model,
  walkArea,
  home,
  axeModel,
  chopKit,
  trees = [],
  extraTools = {},
) {
  const villagerId = extraTools.id ?? "villager";
  const villagerLabel = extraTools.label ?? "Bewohnerin";
  const root = new THREE.Group();
  root.name = extraTools.rootName ?? `village-resident-${villagerId}`;
  root.position.set(-0.72, walkArea.surfaceY, 1.15);
  root.add(model);
  const axe = axeModel ? createAxeWielder(model, axeModel) : null;
  const lab = extraTools.lab ?? null;
  const well = extraTools.well ?? null;
  const kitchen = extraTools.kitchen ?? null;
  const pumpkinField = extraTools.pumpkinField ?? null;
  const pickaxe = extraTools.pickaxe
    ? createAxeWielder(model, extraTools.pickaxe, {
        targetLength: 0.36,
        holdAlong: 0.46,
        handleAxis: { x: 0, y: 1, z: 0 },
        gripName: "pickaxe-grip",
      })
    : null;

  function holsterTools() {
    axe?.setCarried(false);
    pickaxe?.setCarried(false);
  }

  let meshFade = 1;

  function applyMeshFade(value) {
    meshFade = THREE.MathUtils.clamp(value, 0, 1);
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.transparent = meshFade < 0.999;
        material.opacity = meshFade;
        material.depthWrite = meshFade > 0.92;
      });
    });
    if (meshFade <= 0.02) model.visible = false;
    else if (meshFade > 0.02) model.visible = true;
  }

  function poseWalk() {
    if (!walkAction) return;
    walkAction.enabled = true;
    walkAction.setEffectiveWeight(1);
    walkAction.paused = false;
    walkAction.play();
    mixer.update(0);
  }

  function appearWalking() {
    applyMeshFade(1);
    model.visible = true;
    poseWalk();
  }

  function isStationed() {
    return state === STATES.REST_INSIDE || state === STATES.VISIT_INSIDE;
  }

  function driveDoor(progress, force = false) {
    if (!home) return;
    if (typeof home.setDoorProgress === "function") {
      home.setDoorProgress(villagerId, progress, force);
      return;
    }
    home.door.setOpenProgress(progress);
  }

  function drawJobTool() {
    if (job?.tool === "pickaxe" && pickaxe) {
      axe?.setCarried(false);
      pickaxe.setCarried(true);
      return;
    }
    pickaxe?.setCarried(false);
    axe?.setCarried(true);
  }

  const mixer = new THREE.AnimationMixer(model);
  const locomotion = classifyCharacterClips(model, chopKit);
  const walkClip = locomotion.walk ? cleanWalkClip(locomotion.walk) : null;
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null;
  walkAction?.setLoop(THREE.LoopRepeat, Infinity).play();
  walkAction?.setEffectiveWeight(1);
  const chopClip = plantClip(locomotion.chop, "Hacken");
  const chopAction = chopClip ? mixer.clipAction(chopClip) : null;
  chopAction?.setLoop(THREE.LoopRepeat, Infinity).play();
  chopAction?.setEffectiveWeight(0);

  const stabilizeHead = createHeadStabilizer(model);
  const doorReach = createArmReacher(model, home?.door.handleAnchor);
  const isRoamPointAllowed = (point) =>
    !home?.containsPoint(point, 0.72) &&
    !lab?.containsPoint(point, 0.55) &&
    !kitchen?.containsPoint(point, 0.5) &&
    !pumpkinField?.containsPoint(point, 0.45) &&
    !well?.containsPoint(point, 0.4);
  let roamTarget = randomPointInEllipse(
    walkArea.radiusX,
    walkArea.radiusZ,
    isRoamPointAllowed,
  );
  let state = STATES.ROAM;
  let stateTime = 0;
  let speed = 0;
  let walkWeight = 0;
  let reachWeight = 0;
  let waitTime = 0;
  let homeCountdown = Infinity;
  let lastElapsed = 0;
  let job = null;
  let lastImpactCycle = -1;
  let hungry = false;
  let eating = null;
  const stateOrigin = root.position.clone();

  function isTimedWork(entry = job) {
    return (
      entry?.kind === "work" ||
      entry?.kind === "cook" ||
      entry?.kind === "harvest" ||
      entry?.kind === "eat"
    );
  }

  function getSimState() {
    if (eating) return "EATING";
    if (hungry) return "HUNGRY";
    if (state === STATES.JOB_CHOP || state === STATES.JOB_WORK || state === STATES.VISIT_INSIDE) {
      return "WORKING";
    }
    if (JOB_STATES.has(state)) return "WALKING";
    return "IDLE";
  }

  function isWorking() {
    if (eating || hungry) return false;
    return (
      state === STATES.JOB_CHOP ||
      state === STATES.JOB_WORK ||
      state === STATES.VISIT_INSIDE
    );
  }

  if (home) {
    root.position.copy(home.points.inside);
    model.visible = false;
    driveDoor(0);
    state = STATES.REST_INSIDE;
  }

  function chooseNextRoamTarget(preferAwayFromHome = false) {
    if (well?.points?.idle && Math.random() < 0.48) {
      roamTarget = well.points.idle.clone();
      return;
    }
    roamTarget = randomPointInEllipse(
      walkArea.radiusX,
      walkArea.radiusZ,
      (point) => {
        if (!isRoamPointAllowed(point)) return false;
        if (!preferAwayFromHome || !home) return true;
        return point.distanceTo(home.points.approach) > 2.3;
      },
    );
  }

  function transition(nextState) {
    state = nextState;
    stateTime = 0;
    stateOrigin.copy(root.position);

    if (nextState === STATES.CLOSE_INSIDE || nextState === STATES.REST_INSIDE) {
      model.visible = false;
    }

    if (nextState === STATES.OPEN_TO_EXIT || nextState === STATES.JOB_OPEN_TO_EXIT) {
      model.visible = false;
    }

    if (nextState === STATES.REST_INSIDE && job) {
      const finished = job;
      job = null;
      holsterTools();
      finished.onReturned?.();
    }
  }

  function stopMoving(delta, damping = 9) {
    speed = THREE.MathUtils.damp(speed, 0, damping, delta);
  }

  function faceToward(target, delta) {
    scratch.direction.subVectors(target, root.position);
    scratch.direction.y = 0;
    if (scratch.direction.lengthSq() < 0.000001) return 0;
    return rotateToward(
      root,
      Math.atan2(scratch.direction.x, scratch.direction.z) + MODEL_FORWARD_OFFSET,
      delta,
    );
  }

  function moveToward(
    target,
    maximumSpeed,
    delta,
    avoidCottage = false,
    followTargetHeight = false,
  ) {
    scratch.direction.subVectors(target, root.position);
    scratch.direction.y = 0;
    const distance = scratch.direction.length();

    if (distance <= ARRIVAL_DISTANCE) {
      stopMoving(delta, 11);
      const outdoor =
        state === STATES.JOB_WALK ||
        state === STATES.JOB_WALK_HOME ||
        state === STATES.JOB_WALK_STORAGE;
      const canSnap =
        distance <= SNAP_LIMIT && (!outdoor || !job?.walkability?.blocked(target));
      if (canSnap) {
        root.position.x = target.x;
        root.position.z = target.z;
        root.position.y = followTargetHeight ? target.y : walkArea.surfaceY;
      }
      return true;
    }

    scratch.direction.multiplyScalar(1 / Math.max(distance, 0.0001));
    const arrivalFactor = THREE.MathUtils.smoothstep(distance, ARRIVAL_DISTANCE, 0.52);
    const angleRemaining = rotateToward(
      root,
      Math.atan2(scratch.direction.x, scratch.direction.z) + MODEL_FORWARD_OFFSET,
      delta,
    );
    const turnFactor = 1 - THREE.MathUtils.smoothstep(
      angleRemaining,
      THREE.MathUtils.degToRad(24),
      THREE.MathUtils.degToRad(68),
    );
    const desiredSpeed = maximumSpeed * Math.max(arrivalFactor, 0.28) * turnFactor;
    speed = THREE.MathUtils.damp(speed, desiredSpeed, 5.8, delta);

    const step = Math.min(speed * delta, Math.max(distance - ARRIVAL_DISTANCE * 0.35, 0));
    scratch.nextPosition.copy(root.position).addScaledVector(scratch.direction, step);

    if (avoidCottage && home?.containsPoint(scratch.nextPosition, 0.34)) {
      stopMoving(delta, 10);
      if (state === STATES.ROAM) chooseNextRoamTarget(true);
      return false;
    }

    const passingLab =
      lab &&
      (state === STATES.VISIT_ENTER ||
        state === STATES.VISIT_EXIT ||
        state === STATES.VISIT_LEAVE ||
        lab.containsPoint(target, 0.18) ||
        lab.containsPoint(root.position, 0.18));
    if (!passingLab && lab?.containsPoint(scratch.nextPosition, 0.34)) {
      const slideX = scratch.nextPosition.clone();
      slideX.z = root.position.z;
      const slideZ = scratch.nextPosition.clone();
      slideZ.x = root.position.x;
      if (!lab.containsPoint(slideX, 0.34)) {
        scratch.nextPosition.copy(slideX);
      } else if (!lab.containsPoint(slideZ, 0.34)) {
        scratch.nextPosition.copy(slideZ);
      } else {
        stopMoving(delta, 10);
        if (state === STATES.ROAM) chooseNextRoamTarget(true);
        return false;
      }
    }

    if (
      (state === STATES.JOB_WALK ||
        state === STATES.JOB_WALK_HOME ||
        state === STATES.JOB_WALK_STORAGE) &&
      home?.containsPoint(scratch.nextPosition, 0.42)
    ) {
      const slideX = scratch.nextPosition.clone();
      slideX.z = root.position.z;
      const slideZ = scratch.nextPosition.clone();
      slideZ.x = root.position.x;
      if (!home.containsPoint(slideX, 0.42)) {
        scratch.nextPosition.copy(slideX);
      } else if (!home.containsPoint(slideZ, 0.42)) {
        scratch.nextPosition.copy(slideZ);
      } else {
        stopMoving(delta, 12);
        return false;
      }
    }

    root.position.copy(scratch.nextPosition);
    if (followTargetHeight) {
      const segmentLength = Math.hypot(
        target.x - stateOrigin.x,
        target.z - stateOrigin.z,
      );
      const travelLength = Math.max(segmentLength - ARRIVAL_DISTANCE, 0.001);
      const remainingDistance = Math.max(distance - step - ARRIVAL_DISTANCE, 0);
      const pathProgress = 1 - THREE.MathUtils.clamp(remainingDistance / travelLength, 0, 1);
      root.position.y = THREE.MathUtils.lerp(
        stateOrigin.y,
        target.y,
        smootherStep(pathProgress),
      );
    } else {
      root.position.y = walkArea.surfaceY;
    }
    const arrived = distance - step <= ARRIVAL_DISTANCE;
    if (arrived && distance <= SNAP_LIMIT + step) {
      root.position.x = target.x;
      root.position.z = target.z;
      root.position.y = followTargetHeight ? target.y : walkArea.surfaceY;
    }
    return arrived;
  }

  function updateRoaming(delta) {
    homeCountdown -= delta;
    if (home && homeCountdown <= 0) {
      waitTime = 0;
      transition(STATES.HOME_APPROACH);
      return;
    }

    if (waitTime > 0) {
      waitTime -= delta;
      stopMoving(delta);
      if (well?.points?.idle && roamTarget.distanceTo(well.points.idle) < 0.35) {
        faceToward(well.points.look ?? well.points.idle, delta);
      }
      return;
    }

    if (moveToward(roamTarget, WALK_SPEED, delta, true)) {
      const atWell = Boolean(well?.points?.idle && roamTarget.distanceTo(well.points.idle) < 0.4);
      waitTime = atWell ? 3.2 + Math.random() * 3.4 : 0.7 + Math.random() * 1.15;
      chooseNextRoamTarget();
    }
  }

  function updateHomeSequence(delta) {
    const points = home.points;

    switch (state) {
      case STATES.HOME_APPROACH:
        if (!home.claimDoor?.(villagerId)) {
          stopMoving(delta);
          break;
        }
        driveDoor(0);
        if (moveToward(points.steps, WALK_SPEED, delta)) {
          transition(STATES.ASCEND_PORCH);
        }
        break;

      case STATES.ASCEND_PORCH:
        driveDoor(0);
        if (moveToward(points.approach, DOOR_WALK_SPEED, delta, false, true)) {
          transition(STATES.ALIGN_AT_DOOR);
        }
        break;

      case STATES.ALIGN_AT_DOOR: {
        stopMoving(delta);
        const angleRemaining = faceToward(points.threshold, delta);
        if (stateTime >= 0.48 && angleRemaining < 0.055) {
          transition(STATES.REACH_TO_ENTER);
        }
        break;
      }

      case STATES.REACH_TO_ENTER:
        stopMoving(delta);
        faceToward(points.threshold, delta);
        driveDoor(0);
        reachWeight = smootherStep(stateTime / 0.42);
        if (
          stateTime >= 0.42 &&
          (doorReach.getDistance() <= HANDLE_CONTACT_DISTANCE || stateTime >= 1.35)
        ) {
          transition(STATES.OPEN_TO_ENTER);
        }
        break;

      case STATES.OPEN_TO_ENTER:
        stopMoving(delta);
        faceToward(points.threshold, delta);
        reachWeight =
          stateTime < 0.5
            ? 1
            : 1 - smootherStep((stateTime - 0.5) / 0.28);
        driveDoor(stateTime / 0.96);
        if (stateTime >= 1.14) transition(STATES.ENTER);
        break;

      case STATES.ENTER: {
        driveDoor(1);
        const distanceInside = root.position.distanceTo(points.inside);
        if (distanceInside < 0.12) model.visible = false;
        if (moveToward(points.inside, DOOR_WALK_SPEED, delta, false, true)) {
          model.visible = false;
          transition(STATES.CLOSE_INSIDE);
        }
        break;
      }

      case STATES.CLOSE_INSIDE:
        stopMoving(delta);
        driveDoor(1 - stateTime / 0.92);
        if (stateTime >= 0.92) {
          home.releaseDoor?.(villagerId);
          transition(STATES.REST_INSIDE);
        }
        break;

      case STATES.REST_INSIDE:
        stopMoving(delta);
        driveDoor(0);
        holsterTools();
        break;

      case STATES.OPEN_TO_EXIT:
        stopMoving(delta);
        driveDoor(stateTime / 1.02);
        if (stateTime >= 1.02) transition(STATES.EXIT);
        break;

      case STATES.EXIT:
        driveDoor(1);
        if (moveToward(points.exit, DOOR_WALK_SPEED, delta, false, true)) {
          appearWalking();
          transition(STATES.POSITION_TO_CLOSE);
        } else if (root.position.distanceTo(points.inside) > 0.12) {
          if (!model.visible || meshFade < 0.99) appearWalking();
        }
        break;

      case STATES.POSITION_TO_CLOSE:
        driveDoor(1);
        if (moveToward(points.close, DOOR_WALK_SPEED, delta, false, true)) {
          transition(STATES.ALIGN_TO_CLOSE);
        }
        break;

      case STATES.ALIGN_TO_CLOSE: {
        stopMoving(delta);
        driveDoor(1);
        const angleRemaining = faceToward(points.threshold, delta);
        if (stateTime >= 0.42 && angleRemaining < 0.055) {
          transition(STATES.REACH_TO_CLOSE);
        }
        break;
      }

      case STATES.REACH_TO_CLOSE:
        stopMoving(delta);
        faceToward(points.threshold, delta);
        driveDoor(1);
        reachWeight = smootherStep(stateTime / 0.42);
        if (
          stateTime >= 0.42 &&
          (doorReach.getDistance() <= HANDLE_CONTACT_DISTANCE || stateTime >= 1.35)
        ) {
          transition(STATES.CLOSE_OUTSIDE);
        }
        break;

      case STATES.CLOSE_OUTSIDE:
        stopMoving(delta);
        faceToward(points.threshold, delta);
        reachWeight =
          stateTime < 0.5
            ? 1
            : 1 - smootherStep((stateTime - 0.5) / 0.28);
        driveDoor(1 - stateTime / 0.96);
        if (stateTime >= 1.22) {
          driveDoor(0);
          transition(STATES.LEAVE_PORCH);
        }
        break;

      case STATES.LEAVE_PORCH:
        driveDoor(0);
        if (moveToward(points.depart, DOOR_WALK_SPEED, delta, false, true)) {
          chooseNextRoamTarget(true);
          homeCountdown = 10 + Math.random() * 5;
          transition(STATES.ROAM);
        }
        break;

      default:
        if (!job) transition(STATES.REST_INSIDE);
    }
  }

  function updateJob(delta) {
    const points = home.points;

    switch (state) {
      case STATES.JOB_OPEN_TO_EXIT:
        if (!home.claimDoor?.(villagerId)) {
          stopMoving(delta);
          stateTime = 0;
          break;
        }
        stopMoving(delta);
        driveDoor(stateTime / 1.02);
        if (stateTime >= 1.02) transition(STATES.JOB_EXIT);
        break;

      case STATES.JOB_EXIT:
        driveDoor(1);
        if (moveToward(points.exit, DOOR_WALK_SPEED, delta, false, true)) {
          appearWalking();
          holsterTools();
          transition(STATES.JOB_LEAVE_PORCH);
        } else if (root.position.distanceTo(points.inside) > 0.12) {
          if (!model.visible || meshFade < 0.99) appearWalking();
          holsterTools();
        }
        break;

      case STATES.JOB_LEAVE_PORCH:
        driveDoor(1 - Math.min(stateTime / 0.88, 1));
        if (moveToward(points.depart, DOOR_WALK_SPEED, delta, false, true)) {
          driveDoor(0);
          home.releaseDoor?.(villagerId);
          transition(STATES.JOB_WALK);
        }
        break;

      case STATES.JOB_WALK: {
        driveDoor(0);
        followWaypoints(job.path, "pathIndex", job.approach, () => {
          transition(job?.kind === "visit" ? STATES.VISIT_ALIGN : STATES.JOB_ALIGN);
        }, delta);
        break;
      }

      case STATES.VISIT_WALK: {
        holsterTools();
        followWaypoints(job.path, "pathIndex", job.approach, () => {
          transition(STATES.VISIT_ALIGN);
        }, delta);
        break;
      }

      case STATES.VISIT_ALIGN: {
        stopMoving(delta);
        holsterTools();
        const remaining = faceToward(job.lookAt ?? job.approach, delta);
        if (stateTime >= 0.28 && remaining < 0.1) {
          applyMeshFade(1);
          model.visible = true;
          transition(STATES.VISIT_ENTER);
        }
        break;
      }

      case STATES.VISIT_ENTER: {
        holsterTools();
        const inside = lab?.points.inside ?? job.approach;
        const arrived = moveToward(inside, DOOR_WALK_SPEED, delta, false, true);
        applyMeshFade(1 - smootherStep(Math.min(stateTime / 1.6, 1)));
        if (arrived || stateTime >= 3.4) {
          applyMeshFade(0);
          model.visible = false;
          job.onArrived?.();
          transition(STATES.VISIT_INSIDE);
        }
        break;
      }

      case STATES.VISIT_INSIDE:
        stopMoving(delta);
        holsterTools();
        applyMeshFade(0);
        model.visible = false;
        break;

      case STATES.VISIT_EXIT: {
        holsterTools();
        if (stateTime <= 0.08) poseWalk();
        model.visible = true;
        applyMeshFade(Math.max(smootherStep(Math.min(stateTime / 0.35, 1)), 0.12));
        const exitPoint = lab?.points.depart ?? lab?.points.approach ?? job.approach;
        const arrived = moveToward(exitPoint, WALK_SPEED, delta, false, false);
        if ((arrived && stateTime >= 0.2) || stateTime >= 2.2) {
          appearWalking();
          root.position.x = exitPoint.x;
          root.position.z = exitPoint.z;
          root.position.y = walkArea.surfaceY;
          transition(STATES.VISIT_LEAVE);
        }
        break;
      }

      case STATES.VISIT_LEAVE: {
        holsterTools();
        if (stateTime <= 0.08) appearWalking();
        const depart = lab?.points.depart ?? lab?.points.approach ?? job.approach;
        const arrived = moveToward(depart, WALK_SPEED, delta, false, false);
        if (arrived || stateTime >= 1.8) {
          appearWalking();
          root.position.x = depart.x;
          root.position.z = depart.z;
          root.position.y = walkArea.surfaceY;
          if (job?.kind === "visit" && !job.tree) {
            beginWalkHome();
          } else {
            beginJobWalk();
          }
        }
        break;
      }

      case STATES.JOB_ALIGN: {
        stopMoving(delta);
        if (isTimedWork()) {
          holsterTools();
          const remaining = faceToward(job.lookAt ?? job.approach, delta);
          if (stateTime >= 0.28 && remaining < 0.1) {
            job.workTime = 0;
            job.onStartWork?.();
            transition(STATES.JOB_WORK);
          }
          break;
        }
        drawJobTool();
        const remaining = faceToward(job.lookAt, delta);
        if (stateTime >= 0.38 && remaining < 0.08) {
          job.chopTime = 0;
          lastImpactCycle = -1;
          job.lastHandY = null;
          job.hits = 0;
          job.progress = 0;
          job.hitLock = 0;
          job.handRising = false;
          chopAction?.reset();
          chopAction?.setEffectiveWeight(1);
          chopAction?.play();
          job.onStartChop?.();
          transition(STATES.JOB_CHOP);
        }
        break;
      }

      case STATES.JOB_WORK: {
        stopMoving(delta, 14);
        holsterTools();
        if (job.lookAt) faceToward(job.lookAt, delta);
        if (hungry && job.kind !== "eat") break;
        job.workTime = (job.workTime ?? 0) + delta;
        if (job.workTime >= (job.duration ?? 1)) {
          job.onWorkDone?.();
          const next = typeof job.nextJob === "function" ? job.nextJob() : job.nextJob;
          if (next) {
            chainJob(next);
            break;
          }
          beginWalkHome();
        }
        break;
      }

      case STATES.JOB_CHOP: {
        stopMoving(delta, 14);
        if (hungry || eating) {
          holsterTools();
          break;
        }
        drawJobTool();
        faceToward(job.lookAt, delta);
        job.chopTime += delta;
        if (job.hitLock > 0) job.hitLock = Math.max(0, job.hitLock - delta);
        break;
      }

      case STATES.JOB_WALK_STORAGE: {
        holsterTools();
        followWaypoints(job.storagePath, "storagePathIndex", job.storageApproach, () => {
          transition(STATES.JOB_ALIGN_STORAGE);
        }, delta);
        break;
      }

      case STATES.JOB_ALIGN_STORAGE: {
        stopMoving(delta);
        holsterTools();
        const remaining = faceToward(job.storageLook ?? job.storageApproach, delta);
        if (stateTime >= 0.28 && remaining < 0.1) {
          transition(STATES.JOB_DEPOSIT);
        }
        break;
      }

      case STATES.JOB_DEPOSIT:
        stopMoving(delta, 14);
        holsterTools();
        if (stateTime >= DEPOSIT_TIME) {
          if (!job.delivered) {
            job.delivered = true;
            job.onDeliver?.();
          }
          beginWalkHome();
        }
        break;

      case STATES.JOB_WALK_HOME: {
        holsterTools();
        followWaypoints(job.homePath, "homePathIndex", points.depart, () => {
          transition(STATES.HOME_APPROACH);
        }, delta);
        break;
      }

      default:
        transition(STATES.JOB_WALK);
    }
  }

  function updateAnimation(delta, elapsed) {
    const movementAmount = THREE.MathUtils.clamp(speed / WALK_SPEED, 0, 1);
    const atWork = Boolean(job) && state === STATES.JOB_CHOP;
    const useWalk = model.visible && !atWork;
    walkWeight = THREE.MathUtils.damp(walkWeight, useWalk ? 1 : 0, 12, delta);

    if (chopAction) {
      if (atWork) {
        chopAction.setEffectiveWeight(
          THREE.MathUtils.damp(chopAction.getEffectiveWeight(), 1, 10, delta),
        );
      } else {
        chopAction.setEffectiveWeight(0);
      }
    }

    if (mixer) {
      if (walkAction) {
        walkAction.enabled = true;
        walkAction.setEffectiveWeight(useWalk ? 1 : 0);
        if (atWork || !model.visible) {
          walkAction.timeScale = 0;
        } else if (movementAmount < 0.04) {
          walkAction.timeScale = 0.22;
        } else {
          walkAction.timeScale = THREE.MathUtils.clamp(
            speed / NATURAL_WALK_SPEED,
            0.28,
            1.08,
          );
        }
      }
      if (chopAction) {
        chopAction.timeScale = atWork ? 1 : 0;
      }
      mixer.update(delta);
    } else if (model.visible) {
      model.position.y = Math.sin(elapsed * 7.5) * 0.012 * movementAmount;
    }

    if (!atWork) stabilizeHead(elapsed, movementAmount);
    doorReach.apply(reachWeight);
    axe?.updateDraw(delta);
    pickaxe?.updateDraw(delta);

    if (state === STATES.JOB_CHOP && job && !hungry && !eating) {
      const hand = model.getObjectByName("R_Hand");
      if (hand) {
        hand.getWorldPosition(scratch.nextPosition);
        if (job.lastHandY != null) {
          const fall = job.lastHandY - scratch.nextPosition.y;
          if (fall < -0.012) job.handRising = true;
          if (
            job.handRising &&
            fall > 0.055 &&
            (job.hitLock ?? 0) <= 0 &&
            job.hits < job.hitsNeeded
          ) {
            job.hits += 1;
            job.progress = job.hits / job.hitsNeeded;
            job.hitLock = 0.7;
            job.handRising = false;
            job.onImpact?.();
            job.onChopProgress?.(job.progress);
            if (job.hits >= job.hitsNeeded) {
              job.onChopDone?.();
              beginCarryToStorage();
            }
          }
        }
        job.lastHandY = scratch.nextPosition.y;
      }
    }
  }

  function update(delta, elapsed) {
    const safeDelta = Math.min(delta, 0.05);
    lastElapsed = elapsed;
    stateTime += safeDelta;
    reachWeight = 0;

    if (eating) {
      eating.time += safeDelta;
      stopMoving(safeDelta, 14);
      holsterTools();
      updateAnimation(safeDelta, elapsed);
      if (eating.time >= eating.duration) {
        const done = eating.onDone;
        eating = null;
        done?.();
      }
      return;
    }

    if (state === STATES.VISIT_INSIDE) {
      holsterTools();
      applyMeshFade(0);
      model.visible = false;
    } else if (JOB_STATES.has(state) && job && home) {
      updateJob(safeDelta);
    } else if (state === STATES.REST_INSIDE && home) {
      updateHomeSequence(safeDelta);
    } else if (state === STATES.ROAM || !home) {
      updateRoaming(safeDelta);
    } else {
      updateHomeSequence(safeDelta);
    }

    updateAnimation(safeDelta, elapsed);
  }

  function forceHomeSequence() {
    if (!home) return;
    model.visible = true;
    driveDoor(0);
    homeCountdown = 0;
    waitTime = 0;
    transition(STATES.HOME_APPROACH);
  }

  function isBusy() {
    return Boolean(job) && !isStationed();
  }

  function isAtLab() {
    return state === STATES.VISIT_INSIDE;
  }

  function isIndoors() {
    return (
      !model.visible ||
      state === STATES.VISIT_INSIDE ||
      state === STATES.REST_INSIDE ||
      state === STATES.CLOSE_INSIDE ||
      state === STATES.ENTER
    );
  }

  function relocateWithHome() {
    if (!isIndoors()) return;
    if (state === STATES.VISIT_INSIDE && lab) {
      root.position.copy(lab.points.inside);
      return;
    }
    if (!home) return;
    root.position.copy(home.points.inside);
  }

  function pathViaMeadow(from, to, walkability) {
    return routeViaClearing(
      from,
      to,
      walkability,
      home,
      walkArea.surfaceY,
      walkArea.radiusX,
      walkArea.radiusZ,
    );
  }

  function beginCarryToStorage() {
    holsterTools();
    appearWalking();
    if (!job) return;
    if (job.storageApproach) {
      job.storagePath = pathViaMeadow(root.position, job.storageApproach, job.walkability);
      job.storagePathIndex = 0;
      job.stuckTime = 0;
      job.skipRepath = false;
      transition(STATES.JOB_WALK_STORAGE);
      return;
    }
    beginWalkHome();
  }

  function beginJobWalk() {
    if (!job) {
      transition(STATES.ROAM);
      return;
    }
    appearWalking();
    job.path = pathViaMeadow(root.position, job.approach, job.walkability);
    job.pathIndex = 0;
    job.stuckTime = 0;
    job.skipRepath = false;
    transition(STATES.JOB_WALK);
  }

  function chainJob(nextJob) {
    if (!home || !nextJob) return false;
    const routes = buildJobPaths(nextJob);
    job = {
      ...nextJob,
      approach: routes.approach,
      storageApproach: routes.storage ?? nextJob.storageApproach,
      storagePath: nextJob.storagePath ?? routes.storagePath,
      storagePathIndex: 0,
      delivered: false,
      chopTime: 0,
      hits: 0,
      hitsNeeded: Math.max(nextJob.hitsNeeded ?? 5, 1),
      progress: 0,
      hitLock: 0,
      handRising: false,
      workTime: 0,
      duration: Math.max(nextJob.duration ?? 1, 0.4),
      path: nextJob.path ?? routes.path,
      pathIndex: 0,
      homePath: nextJob.homePath ?? routes.homePath,
      homePathIndex: 0,
      walkability: routes.walkability,
    };
    holsterTools();
    appearWalking();
    applyMeshFade(1);
    transition(STATES.JOB_WALK);
    return true;
  }

  function beginWalkHome() {
    appearWalking();
    if (!job || !home) {
      transition(STATES.HOME_APPROACH);
      return;
    }
    job.homePath = pathViaMeadow(root.position, home.points.depart, job.walkability);
    job.homePathIndex = 0;
    job.stuckTime = 0;
    job.skipRepath = false;
    transition(STATES.JOB_WALK_HOME);
  }

  function followWaypoints(path, indexKey, destination, onDone, delta) {
    let points = path ?? [];
    const destDist = destination
      ? Math.hypot(destination.x - root.position.x, destination.z - root.position.z)
      : Infinity;
    if (destination && destDist < 0.32) {
      onDone();
      return;
    }
    const skipped = [];
    while (job[indexKey] < points.length) {
      const candidate = points[job[indexKey]];
      const blocked = job.walkability?.blocked(candidate);
      const farther =
        destination &&
        Math.hypot(destination.x - candidate.x, destination.z - candidate.z) >
          destDist + 0.22;
      if (!blocked && !farther) break;
      skipped.push(job[indexKey]);
      job[indexKey] += 1;
    }
    if (
      skipped.length &&
      (job[indexKey] >= points.length || skipped.length >= 3) &&
      !job.skipRepath
    ) {
      job.skipRepath = true;
      const rebuilt = pathViaMeadow(root.position, destination, job.walkability);
      if (indexKey === "storagePathIndex") {
        job.storagePath = rebuilt;
        job.storagePathIndex = 0;
      } else if (indexKey === "homePathIndex") {
        job.homePath = rebuilt;
        job.homePathIndex = 0;
      } else {
        job.path = rebuilt;
        job.pathIndex = 0;
      }
      points = rebuilt;
    }
    const waypoint = points[job[indexKey]] ?? destination;
    if (!waypoint) {
      onDone();
      return;
    }
    const remaining = Math.hypot(waypoint.x - root.position.x, waypoint.z - root.position.z);
    if (remaining < 0.28) {
      job.stuckTime = 0;
      if (job[indexKey] < points.length - 1) {
        job[indexKey] += 1;
        stateTime = 0;
        stateOrigin.copy(root.position);
        return;
      }
      onDone();
      return;
    }
    if (moveToward(waypoint, WALK_SPEED, delta, false)) {
      job.stuckTime = 0;
      if (job[indexKey] < points.length - 1) {
        job[indexKey] += 1;
        stateTime = 0;
        stateOrigin.copy(root.position);
        return;
      }
      onDone();
      return;
    }

    if (speed > 0.06) {
      job.stuckTime = 0;
      return;
    }

    job.stuckTime = (job.stuckTime ?? 0) + delta;
    if (job.stuckTime <= 3.6 || !destination) return;
    job.stuckTime = 0;
    const rebuilt = pathViaMeadow(root.position, destination, job.walkability);
    if (indexKey === "storagePathIndex") {
      job.storagePath = rebuilt;
      job.storagePathIndex = 0;
    } else if (indexKey === "homePathIndex") {
      job.homePath = rebuilt;
      job.homePathIndex = 0;
    } else {
      job.path = rebuilt;
      job.pathIndex = 0;
    }
  }

  function buildJobPaths(nextJob) {
    const startPoint =
      state === STATES.VISIT_INSIDE && lab
        ? lab.points.depart.clone()
        : state === STATES.REST_INSIDE || !model.visible
          ? home.points.depart.clone()
          : root.position.clone();
    const extras = Array.isArray(nextJob.storageBlock)
      ? nextJob.storageBlock.filter(Boolean)
      : nextJob.storageBlock
        ? [nextJob.storageBlock]
        : [];
    const asBlock = (building) => {
      if (!building?.root) return null;
      const span = Math.max(building.size?.x ?? 0.8, building.size?.z ?? 0.8);
      return { x: building.root.position.x, z: building.root.position.z, radius: span * 0.42 + 0.12 };
    };
    [asBlock(kitchen), asBlock(pumpkinField), asBlock(well)].filter(Boolean).forEach((block) => extras.push(block));
    const walkability = createWalkability(home, trees, {
      ignoreTree: nextJob.tree,
      extras,
      treeRadius: 0.55,
      lab,
    });
    const start = resolveStandPoint(startPoint, walkability, walkArea.surfaceY);
    const approach = resolveStandPoint(nextJob.approach, walkability, walkArea.surfaceY);
    const storage = nextJob.storageApproach
      ? resolveStandPoint(nextJob.storageApproach, walkability, walkArea.surfaceY)
      : null;
    const homeStand = resolveStandPoint(home.points.depart, walkability, walkArea.surfaceY);
    return {
      walkability,
      approach,
      storage,
      path: pathViaMeadow(start, approach, walkability),
      storagePath: storage ? pathViaMeadow(approach, storage, walkability) : [],
      homePath: pathViaMeadow(storage ?? approach, homeStand, walkability),
    };
  }

  function assignJob(nextJob) {
    if (!home || !nextJob) return false;
    if (job && !isStationed()) return false;

    const routes = buildJobPaths(nextJob);
    job = {
      ...nextJob,
      approach: routes.approach,
      storageApproach: routes.storage ?? nextJob.storageApproach,
      storagePath: nextJob.storagePath ?? routes.storagePath,
      storagePathIndex: 0,
      delivered: false,
      chopTime: 0,
      hits: 0,
      hitsNeeded: Math.max(nextJob.hitsNeeded ?? 5, 1),
      progress: 0,
      hitLock: 0,
      handRising: false,
      duration: Math.max(nextJob.duration ?? 60, 0.5),
      path: nextJob.path ?? routes.path,
      pathIndex: 0,
      homePath: nextJob.homePath ?? routes.homePath,
      homePathIndex: 0,
      walkability: routes.walkability,
    };
    lastImpactCycle = -1;
    holsterTools();

    if (state === STATES.VISIT_INSIDE) {
      model.visible = false;
      applyMeshFade(0);
      transition(STATES.VISIT_EXIT);
      return true;
    }

    if (state === STATES.REST_INSIDE || state === STATES.CLOSE_INSIDE) {
      model.visible = false;
      transition(STATES.JOB_OPEN_TO_EXIT);
      return true;
    }

    if (model.visible) {
      holsterTools();
      appearWalking();
      transition(STATES.JOB_WALK);
      return true;
    }

    transition(STATES.JOB_OPEN_TO_EXIT);
    return true;
  }

  function getJobProgress() {
    return job?.progress ?? 0;
  }

  return {
    root,
    update,
    forceHomeSequence,
    assignJob,
    chainJob,
    isBusy,
    isIndoors,
    relocateWithHome,
    getJobProgress,
    getId: () => villagerId,
    getLabel: () => villagerLabel,
    getJobTool: () => job?.tool ?? null,
    getJobKind: () => job?.kind ?? null,
    getSimState,
    isWorking,
    isHungry: () => hungry,
    setHungry: (value) => {
      hungry = Boolean(value);
    },
    isEating: () => Boolean(eating),
    beginEating: (seconds, onDone) => {
      eating = { duration: Math.max(seconds ?? 2.6, 0.4), time: 0, onDone };
    },
    isAtLab,
    getState: () => state,
    debugResetToHome: () => {
      job = null;
      holsterTools();
      applyMeshFade(1);
      home?.releaseDoor?.(villagerId);
      if (home) {
        root.position.copy(home.points.inside);
        model.visible = false;
        driveDoor(0, true);
        transition(STATES.REST_INSIDE);
      }
    },
    getSnapshot: () => ({
      state,
      stateTime,
      speed,
      walkWeight,
      reachWeight,
      elapsed: lastElapsed,
      position: root.position.toArray(),
      doorProgress: home?.door.getOpenProgress() ?? 0,
      handDistance: Number.isFinite(doorReach.getDistance())
        ? doorReach.getDistance()
        : null,
      visible: model.visible,
      busy: isBusy(),
      delivered: Boolean(job?.delivered),
      storagePathLength: job?.storagePath?.length ?? 0,
      homePathLength: job?.homePath?.length ?? 0,
      walkClip: locomotion.walk?.name ?? null,
      chopClip: locomotion.chop?.name ?? null,
      walkWeightLive: walkAction?.getEffectiveWeight() ?? 0,
      chopWeightLive: chopAction?.getEffectiveWeight() ?? 0,
      simState: getSimState(),
      hungry,
      eating: Boolean(eating),
      jobKind: job?.kind ?? null,
    }),
    debugWarp: (nextState, point) => {
      if (point) root.position.copy(point);
      if (nextState === STATES.VISIT_INSIDE) {
        model.visible = false;
        applyMeshFade(0);
        holsterTools();
      } else {
        appearWalking();
      }
      transition(nextState);
    },
    debugFinishChop: () => {
      if (!job || (state !== STATES.JOB_CHOP && state !== STATES.JOB_ALIGN)) return false;
      job.hits = job.hitsNeeded;
      job.progress = 1;
      job.onChopDone?.();
      beginCarryToStorage();
      return true;
    },
    debugFinishWork: () => {
      if (!job || state !== STATES.JOB_WORK) return false;
      job.workTime = job.duration ?? 1;
      return true;
    },
  };
}
