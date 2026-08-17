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

function extractChopClip(model, chopKit) {
  const own = model?.userData.animationClips ?? [];
  const named =
    extractNamedClip(model, "hacken") ||
    own.find((clip) => /hacken|chop|hack/i.test(clip.name));
  if (named) return named;
  if (own.length > 1) return own[1];
  return extractNamedClip(chopKit, "AN_Girl_ChopTree") ?? extractNamedClip(chopKit, "hacken");
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
  const pickaxe = extraTools.pickaxe
    ? createAxeWielder(model, extraTools.pickaxe, {
        targetLength: 0.42,
        gripName: "pickaxe-grip",
      })
    : null;

  function holsterTools() {
    axe?.setCarried(false);
    pickaxe?.setCarried(false);
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
      pickaxe.setCarried(true, root);
      return;
    }
    pickaxe?.setCarried(false);
    axe?.setCarried(true, root);
  }

  const clips = model.userData.animationClips ?? [];
  const mixer = new THREE.AnimationMixer(model);
  const chopSource = extractChopClip(model, chopKit);
  const walkSource = clips.find((clip) => clip !== chopSource) ?? clips[0];
  const walkClip = walkSource ? cleanWalkClip(walkSource) : null;
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null;
  walkAction?.setLoop(THREE.LoopRepeat, Infinity).play();
  walkAction?.setEffectiveWeight(0);
  const chopClip = plantClip(chopSource, "Hacken");
  const chopAction = chopClip ? mixer.clipAction(chopClip) : null;
  chopAction?.setLoop(THREE.LoopRepeat, Infinity).play();
  chopAction?.setEffectiveWeight(0);

  const stabilizeHead = createHeadStabilizer(model);
  const doorReach = createArmReacher(model, home?.door.handleAnchor);
  const isRoamPointAllowed = (point) => !home?.containsPoint(point, 0.72);
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
  const stateOrigin = root.position.clone();

  if (home) {
    root.position.copy(home.points.inside);
    model.visible = false;
    driveDoor(0);
    state = STATES.REST_INSIDE;
  }

  function chooseNextRoamTarget(preferAwayFromHome = false) {
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
      return;
    }

    if (moveToward(roamTarget, WALK_SPEED, delta, true)) {
      waitTime = 0.7 + Math.random() * 1.15;
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
          model.visible = true;
          transition(STATES.POSITION_TO_CLOSE);
        } else if (root.position.distanceTo(points.inside) > 0.12) {
          model.visible = true;
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
          model.visible = true;
          holsterTools();
          transition(STATES.JOB_LEAVE_PORCH);
        } else if (root.position.distanceTo(points.inside) > 0.12) {
          model.visible = true;
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
          transition(STATES.JOB_ALIGN);
        }, delta);
        break;
      }

      case STATES.JOB_ALIGN: {
        stopMoving(delta);
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

      case STATES.JOB_CHOP: {
        stopMoving(delta, 14);
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
    walkWeight = THREE.MathUtils.damp(
      walkWeight,
      model.visible ? THREE.MathUtils.smoothstep(movementAmount, 0.03, 0.42) : 0,
      9,
      delta,
    );

    const chopping = state === STATES.JOB_CHOP && Boolean(job);
    if (chopAction) {
      chopAction.setEffectiveWeight(
        THREE.MathUtils.damp(chopAction.getEffectiveWeight(), chopping ? 1 : 0, 10, delta),
      );
    }

    if (mixer) {
      if (walkAction) {
        walkAction.setEffectiveWeight(chopping ? 0 : walkWeight);
        walkAction.timeScale =
          chopping || movementAmount < 0.035
            ? 0
            : THREE.MathUtils.clamp(speed / NATURAL_WALK_SPEED, 0.16, 1.08);
      }
      if (chopAction) {
        chopAction.timeScale = chopping ? 1 : 0;
      }
      mixer.update(delta);
    } else if (model.visible) {
      model.position.y = Math.sin(elapsed * 7.5) * 0.012 * movementAmount;
    }

    if (!chopping) stabilizeHead(elapsed, movementAmount);
    doorReach.apply(reachWeight);
    axe?.updateDraw(delta);
    pickaxe?.updateDraw(delta);

    if (chopping) {
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

    if (JOB_STATES.has(state) && job && home) {
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
    return Boolean(job) && state !== STATES.REST_INSIDE;
  }

  function isIndoors() {
    return (
      !model.visible ||
      state === STATES.REST_INSIDE ||
      state === STATES.CLOSE_INSIDE ||
      state === STATES.ENTER
    );
  }

  function relocateWithHome() {
    if (!home || !isIndoors()) return;
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
    if (!job) return;
    if (job.storageApproach) {
      job.storagePath = pathViaMeadow(root.position, job.storageApproach, job.walkability);
      job.storagePathIndex = 0;
      job.stuckTime = 0;
      transition(STATES.JOB_WALK_STORAGE);
      return;
    }
    beginWalkHome();
  }

  function beginWalkHome() {
    if (!job || !home) {
      transition(STATES.HOME_APPROACH);
      return;
    }
    job.homePath = pathViaMeadow(root.position, home.points.depart, job.walkability);
    job.homePathIndex = 0;
    job.stuckTime = 0;
    transition(STATES.JOB_WALK_HOME);
  }

  function followWaypoints(path, indexKey, destination, onDone, delta) {
    const points = path ?? [];
    while (
      job[indexKey] < points.length &&
      job.walkability?.blocked(points[job[indexKey]])
    ) {
      job[indexKey] += 1;
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
      state === STATES.REST_INSIDE || !model.visible
        ? home.points.depart.clone()
        : root.position.clone();
    const extras = Array.isArray(nextJob.storageBlock)
      ? nextJob.storageBlock.filter(Boolean)
      : nextJob.storageBlock
        ? [nextJob.storageBlock]
        : [];
    const walkability = createWalkability(home, trees, {
      ignoreTree: nextJob.tree,
      extras,
      treeRadius: 0.55,
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
    if (job && state !== STATES.REST_INSIDE) return false;

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

    if (state === STATES.REST_INSIDE || state === STATES.CLOSE_INSIDE) {
      model.visible = false;
      transition(STATES.JOB_OPEN_TO_EXIT);
      return true;
    }

    if (model.visible) {
      holsterTools();
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
    isBusy,
    isIndoors,
    relocateWithHome,
    getJobProgress,
    getId: () => villagerId,
    getLabel: () => villagerLabel,
    getJobTool: () => job?.tool ?? null,
    getState: () => state,
    debugResetToHome: () => {
      job = null;
      holsterTools();
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
    }),
    debugFinishChop: () => {
      if (!job || (state !== STATES.JOB_CHOP && state !== STATES.JOB_ALIGN)) return false;
      job.hits = job.hitsNeeded;
      job.progress = 1;
      job.onChopDone?.();
      beginCarryToStorage();
      return true;
    },
  };
}
