import * as THREE from "three";

const scratch = {
  world: new THREE.Vector3(),
  projected: new THREE.Vector3(),
};

export function createSoupLoop({
  game,
  kitchen,
  pumpkinField,
  well,
  yard,
  stoneYard,
  clayYard,
  clayPit,
  villagers,
  camera,
  canvas,
}) {
  function blockOf(storage) {
    if (!storage?.root) return null;
    const span = Math.max(storage.size?.x ?? 0.8, storage.size?.z ?? 0.8);
    return { x: storage.root.position.x, z: storage.root.position.z, radius: span * 0.55 + 0.18 };
  }

  function villageBlocks() {
    return [
      blockOf(yard),
      blockOf(stoneYard),
      blockOf(clayYard),
      blockOf(clayPit),
      blockOf(kitchen),
      blockOf(pumpkinField),
      blockOf(well),
    ].filter(Boolean);
  }
  const soupCount = document.querySelector("#soup-count");
  const soupCap = document.querySelector("#soup-cap");
  const pumpkinCount = document.querySelector("#pumpkin-count");
  const bubblesHost = document.querySelector("#need-bubbles");

  const bubbles = new Map();

  function ensureBubble(id) {
    if (!bubblesHost) return null;
    if (bubbles.has(id)) return bubbles.get(id);
    const node = document.createElement("div");
    node.className = "need-bubble";
    node.hidden = true;
    node.dataset.villager = id;
    node.innerHTML = '<span class="need-bubble-bowl" aria-hidden="true"></span><small>Hungrig</small>';
    bubblesHost.appendChild(node);
    bubbles.set(id, node);
    return node;
  }

  function refreshHud() {
    if (soupCount) soupCount.textContent = String(game.getSoup());
    if (soupCap) soupCap.textContent = `/${game.getSoupCap()}`;
    if (pumpkinCount) pumpkinCount.textContent = String(game.getPumpkins());
    kitchen?.setFill(game.getSoup() / Math.max(game.getSoupCap(), 1));
  }

  function harvestJob(member) {
    return {
      kind: "harvest",
      approach: pumpkinField.stand.clone(),
      lookAt: pumpkinField.look.clone(),
      duration: game.getHarvestSeconds(),
      storageBlock: villageBlocks(),
      onStartWork: () => {
        pumpkinField.beginPick();
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "pumpkin-patch",
          assignedTaskId: "harvest-pumpkin",
        });
      },
      onWorkDone: () => {
        pumpkinField.finishPick();
        game.addPumpkins(1);
        refreshHud();
      },
      nextJob: () => cookJob(member),
    };
  }

  function cookJob(member) {
    return {
      kind: "cook",
      approach: kitchen.stand.clone(),
      lookAt: kitchen.look.clone(),
      duration: game.getCookSeconds(),
      storageBlock: villageBlocks(),
      onStartWork: () => {
        kitchen.setCooking(true);
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "kitchen",
          assignedTaskId: "cook-soup",
        });
      },
      onWorkDone: () => {
        kitchen.setCooking(false);
        game.cookFromPumpkin();
        refreshHud();
      },
      nextJob: () => {
        if (game.getSoup() >= game.getSoupCap()) {
          game.clearBuildingWorker("kitchen", member.getId());
          game.setVillagerState(member.getId(), "IDLE", {
            assignedBuildingId: null,
            assignedTaskId: null,
          });
          return null;
        }
        return harvestJob(member);
      },
    };
  }

  function assignCook(member) {
    if (!member || member.isBusy()) return false;
    const start = game.getPumpkins() > 0 ? cookJob(member) : harvestJob(member);
    const accepted = member.assignJob(start);
    if (!accepted) return false;
    game.assignBuildingWorker("kitchen", member.getId());
    return true;
  }

  function projectBubble(member) {
    const node = ensureBubble(member.getId());
    if (!node) return;
    const hungry = member.isHungry?.();
    if (!hungry) {
      node.hidden = true;
      return;
    }
    member.root.getWorldPosition(scratch.world);
    scratch.world.y += 1.28;
    scratch.projected.copy(scratch.world).project(camera);
    const onScreen =
      scratch.projected.z > -1 &&
      scratch.projected.z < 1 &&
      Math.abs(scratch.projected.x) < 1.2 &&
      Math.abs(scratch.projected.y) < 1.2;
    if (!onScreen) {
      node.hidden = true;
      return;
    }
    const view = canvas.getBoundingClientRect();
    const x = view.left + (scratch.projected.x * 0.5 + 0.5) * view.width;
    const y = view.top + (-scratch.projected.y * 0.5 + 0.5) * view.height;
    node.hidden = false;
    node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  function update(delta) {
    kitchen?.update?.(delta);
    pumpkinField?.update?.(delta);

    villagers.forEach((member) => {
      const sim = member.getSimState?.() ?? "IDLE";
      const kind = member.getJobKind?.();
      const foodJob = kind === "cook" || kind === "harvest" || kind === "eat";
      if (member.isWorking?.() && !foodJob) {
        const starved = game.tickVillagerWork(member.getId(), delta);
        if (starved) {
          member.setHungry?.(true);
          game.setVillagerState(member.getId(), "HUNGRY", { hungry: true });
        } else if (sim !== "HUNGRY") {
          game.setVillagerState(member.getId(), "WORKING");
        }
      } else if (!member.isHungry?.()) {
        game.setVillagerState(member.getId(), sim);
      }

      if (member.isHungry?.() && !member.isEating?.() && game.getSoup() > 0) {
        if (game.consumeSoup(1)) {
          member.beginEating?.(game.getEatSeconds(), () => {
            member.setHungry?.(false);
            game.resetVillagerWork(member.getId());
            game.setVillagerState(member.getId(), "WORKING", { hungry: false });
          });
          refreshHud();
        }
      }
      projectBubble(member);
    });
  }

  game.subscribe(() => refreshHud());
  refreshHud();

  return {
    update,
    assignCook,
    refreshHud,
  };
}
