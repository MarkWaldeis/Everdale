import * as THREE from "three";
import { createAxeWielder } from "./axe.js";
import { createWalkability, findWalkPath, resolveStandPoint } from "./pathing.js";

const WALK_SPEED = 0.72;
const DOOR_WALK_SPEED = 0.54;
const NATURAL_WALK_SPEED = 0.69165;
const ARRIVAL_DISTANCE = 0.025;
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
  JOB_WALK_HOME: "job-walk-home",
});

const JOB_STATES = new Set([
  STATES.JOB_OPEN_TO_EXIT,
  STATES.JOB_EXIT,
  STATES.JOB_LEAVE_PORCH,
  STATES.JOB_WALK,
  STATES.JOB_ALIGN,
  STATES.JOB_CHOP,
  STATES.JOB_WALK_HOME,
]);

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
  return clips.find((clip) => clip.name === preferredName) ?? clips[0] ?? null;
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

export function createCharacterController(model, walkArea, home, axeModel, chopKit, trees = []) {
  const root = new THREE.Group();
  root.name = "village-resident";
  root.position.set(-0.72, walkArea.surfaceY, 1.15);
  root.add(model);
  const axe = axeModel || chopKit ? createAxeWielder(model, axeModel, chopKit) : null;

  const clips = model.userData.animationClips ?? [];
  const mixer = new THREE.AnimationMixer(model);
  const walkClip = clips.length ? cleanWalkClip(clips[0]) : null;
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null;
  walkAction?.setLoop(THREE.LoopRepeat, Infinity).play();
  walkAction?.setEffectiveWeight(0);
  const chopClip = plantClip(extractNamedClip(chopKit, "AN_Girl_ChopTree"), "ChopTree");
  const chopAction = chopClip ? mixer.clipAction(chopClip) : null;
  chopAction?.setLoop(THREE.LoopRepeat, Infinity).play();
  chopAction?.setEffectiveWeight(0);

  const stabilizeHead = createHeadStabilizer(model);
  const doorReach = createArmReacher(model, home?.door.handleAnchor);
  const chopAnchor = new THREE.Object3D();
  chopAnchor.name = "chop-strike-anchor";
  const chopReach = createArmReacher(model, chopAnchor, "R");
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
    home.door.setOpenProgress(0);
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
      axe?.setCarried(false);
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
      const outdoor = state === STATES.JOB_WALK || state === STATES.JOB_WALK_HOME;
      const canSnap = !outdoor || !job?.walkability?.blocked(target);
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
      (state === STATES.JOB_WALK || state === STATES.JOB_WALK_HOME) &&
      job?.walkability?.blocked(scratch.nextPosition)
    ) {
      const slideX = scratch.nextPosition.clone();
      slideX.z = root.position.z;
      const slideZ = scratch.nextPosition.clone();
      slideZ.x = root.position.x;
      if (!job.walkability.blocked(slideX)) {
        scratch.nextPosition.copy(slideX);
      } else if (!job.walkability.blocked(slideZ)) {
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
    if (arrived) {
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
        home.door.setOpenProgress(0);
        if (moveToward(points.steps, WALK_SPEED, delta)) {
          transition(STATES.ASCEND_PORCH);
        }
        break;

      case STATES.ASCEND_PORCH:
        home.door.setOpenProgress(0);
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
        home.door.setOpenProgress(0);
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
        home.door.setOpenProgress(stateTime / 0.96);
        if (stateTime >= 1.14) transition(STATES.ENTER);
        break;

      case STATES.ENTER: {
        home.door.setOpenProgress(1);
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
        home.door.setOpenProgress(1 - stateTime / 0.92);
        if (stateTime >= 0.92) transition(STATES.REST_INSIDE);
        break;

      case STATES.REST_INSIDE:
        stopMoving(delta);
        home.door.setOpenProgress(0);
        axe?.setCarried(false);
        break;

      case STATES.OPEN_TO_EXIT:
        stopMoving(delta);
        home.door.setOpenProgress(stateTime / 1.02);
        if (stateTime >= 1.02) transition(STATES.EXIT);
        break;

      case STATES.EXIT:
        home.door.setOpenProgress(1);
        if (moveToward(points.exit, DOOR_WALK_SPEED, delta, false, true)) {
          model.visible = true;
          transition(STATES.POSITION_TO_CLOSE);
        } else if (root.position.distanceTo(points.inside) > 0.12) {
          model.visible = true;
        }
        break;

      case STATES.POSITION_TO_CLOSE:
        home.door.setOpenProgress(1);
        if (moveToward(points.close, DOOR_WALK_SPEED, delta, false, true)) {
          transition(STATES.ALIGN_TO_CLOSE);
        }
        break;

      case STATES.ALIGN_TO_CLOSE: {
        stopMoving(delta);
        home.door.setOpenProgress(1);
        const angleRemaining = faceToward(points.threshold, delta);
        if (stateTime >= 0.42 && angleRemaining < 0.055) {
          transition(STATES.REACH_TO_CLOSE);
        }
        break;
      }

      case STATES.REACH_TO_CLOSE:
        stopMoving(delta);
        faceToward(points.threshold, delta);
        home.door.setOpenProgress(1);
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
        home.door.setOpenProgress(1 - stateTime / 0.96);
        if (stateTime >= 1.22) {
          home.door.setOpenProgress(0);
          transition(STATES.LEAVE_PORCH);
        }
        break;

      case STATES.LEAVE_PORCH:
        home.door.setOpenProgress(0);
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
        stopMoving(delta);
        home.door.setOpenProgress(stateTime / 1.02);
        if (stateTime >= 1.02) transition(STATES.JOB_EXIT);
        break;

      case STATES.JOB_EXIT:
        home.door.setOpenProgress(1);
        if (moveToward(points.exit, DOOR_WALK_SPEED, delta, false, true)) {
          model.visible = true;
          axe?.setCarried(false);
          transition(STATES.JOB_LEAVE_PORCH);
        } else if (root.position.distanceTo(points.inside) > 0.12) {
          model.visible = true;
          axe?.setCarried(false);
        }
        break;

      case STATES.JOB_LEAVE_PORCH:
        home.door.setOpenProgress(1 - Math.min(stateTime / 0.88, 1));
        if (moveToward(points.depart, DOOR_WALK_SPEED, delta, false, true)) {
          home.door.setOpenProgress(0);
          transition(STATES.JOB_WALK);
        }
        break;

      case STATES.JOB_WALK: {
        home.door.setOpenProgress(0);
        const waypoint = job.path[job.pathIndex] ?? job.approach;
        if (moveToward(waypoint, WALK_SPEED, delta, false)) {
          if (job.pathIndex < job.path.length - 1) {
            job.pathIndex += 1;
            stateTime = 0;
            stateOrigin.copy(root.position);
          } else {
            transition(STATES.JOB_ALIGN);
          }
        }
        break;
      }

      case STATES.JOB_ALIGN: {
        stopMoving(delta);
        axe?.setCarried(true);
        const remaining = faceToward(job.lookAt, delta);
        if (stateTime >= 0.38 && remaining < 0.08) {
          job.chopTime = 0;
          lastImpactCycle = -1;
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
        axe?.setCarried(true);
        faceToward(job.lookAt, delta);
        job.chopTime += delta;
        const progress = THREE.MathUtils.clamp(job.chopTime / job.duration, 0, 1);
        job.progress = progress;
        job.onChopProgress?.(progress);
        if (progress >= 1) {
          job.onChopDone?.();
          axe?.setCarried(false);
          transition(STATES.JOB_WALK_HOME);
        }
        break;
      }

      case STATES.JOB_WALK_HOME: {
        axe?.setCarried(false);
        const waypoint = job.homePath[job.homePathIndex] ?? points.depart;
        if (moveToward(waypoint, WALK_SPEED, delta, false)) {
          if (job.homePathIndex < job.homePath.length - 1) {
            job.homePathIndex += 1;
            stateTime = 0;
            stateOrigin.copy(root.position);
          } else {
            transition(STATES.HOME_APPROACH);
          }
        }
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
    if (chopping && job?.lookAt) {
      const duration = chopClip?.duration || CHOP_CYCLE;
      const phase = (job.chopTime % duration) / duration;
      const wind = smootherStep(THREE.MathUtils.clamp(phase / 0.2, 0, 1));
      const recover = smootherStep(THREE.MathUtils.clamp((phase - 0.42) / 0.22, 0, 1));
      scratch.direction.subVectors(root.position, job.lookAt);
      scratch.direction.y = 0;
      if (scratch.direction.lengthSq() < 0.000001) scratch.direction.set(0, 0, 1);
      scratch.direction.normalize();
      chopAnchor.position.copy(job.lookAt);
      chopAnchor.position.y = walkArea.surfaceY + 0.4;
      // Handle stays in the palm; target sits just outside the trunk so the blade lands.
      chopAnchor.position.addScaledVector(scratch.direction, 0.4);
      chopReach.apply(Math.max(0, wind - recover), {
        iterations: 14,
        forearmBlend: 0.96,
        upperBlend: 0.9,
      });
    }
    axe?.updateDraw(delta);

    const chopDuration = chopClip?.duration || CHOP_CYCLE;
    if (chopping) {
      const phase = (job.chopTime % chopDuration) / chopDuration;
      const cycleIndex = Math.floor(job.chopTime / chopDuration);
      if (cycleIndex !== lastImpactCycle && phase >= 0.17 && phase <= 0.28) {
        lastImpactCycle = cycleIndex;
        job.onImpact?.();
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
    home.door.setOpenProgress(0);
    homeCountdown = 0;
    waitTime = 0;
    transition(STATES.HOME_APPROACH);
  }

  function isBusy() {
    return Boolean(job) && state !== STATES.REST_INSIDE;
  }

  function buildJobPaths(nextJob) {
    const startPoint =
      state === STATES.REST_INSIDE || !model.visible
        ? home.points.depart.clone()
        : root.position.clone();
    const walkability = createWalkability(home, trees, { ignoreTree: nextJob.tree });
    const start = resolveStandPoint(startPoint, walkability, walkArea.surfaceY);
    const approach = resolveStandPoint(nextJob.approach, walkability, walkArea.surfaceY);
    return {
      walkability,
      approach,
      path: findWalkPath(start, approach, walkability, home, walkArea.surfaceY),
      homePath: findWalkPath(
        approach,
        resolveStandPoint(home.points.depart, walkability, walkArea.surfaceY),
        walkability,
        home,
        walkArea.surfaceY,
      ),
    };
  }

  function assignJob(nextJob) {
    if (!home || !nextJob) return false;
    if (job && state !== STATES.REST_INSIDE) return false;

    const routes = buildJobPaths(nextJob);
    job = {
      ...nextJob,
      approach: routes.approach,
      chopTime: 0,
      progress: 0,
      duration: Math.max(nextJob.duration ?? 16, 0.5),
      path: nextJob.path ?? routes.path,
      pathIndex: 0,
      homePath: nextJob.homePath ?? routes.homePath,
      homePathIndex: 0,
      walkability: routes.walkability,
    };
    lastImpactCycle = -1;
    axe?.setCarried(false);

    if (state === STATES.REST_INSIDE || state === STATES.CLOSE_INSIDE) {
      model.visible = false;
      transition(STATES.JOB_OPEN_TO_EXIT);
      return true;
    }

    if (model.visible) {
      axe?.setCarried(false);
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
    getJobProgress,
    getState: () => state,
    debugResetToHome: () => {
      job = null;
      axe?.setCarried(false);
      if (home) {
        root.position.copy(home.points.inside);
        model.visible = false;
        home.door.setOpenProgress(0);
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
    }),
  };
}
