export function createClayLoop({
  game,
  clayPit,
  clayYard,
  yard,
  stoneYard,
  kitchen,
  pumpkinField,
  well,
}) {
  const clayCount = document.querySelector("#clay-count");

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

  function refreshHud() {
    if (clayCount) clayCount.textContent = String(game.getClay());
    clayYard?.setClay(game.getClay());
  }

  function isFull() {
    return game.getClay() >= game.getClayCap();
  }

  function makeDigJob(member) {
    return {
      kind: "dig",
      tool: "pickaxe",
      approach: clayPit.stand.clone(),
      lookAt: clayPit.look.clone(),
      storageApproach: clayYard.stand,
      storageLook: clayYard.look,
      storageBlock: villageBlocks(),
      hitsNeeded: 5,
      onStartChop: () => {
        clayPit.setDigging(true);
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "clayPit",
          assignedTaskId: "dig-clay",
        });
      },
      onImpact: () => {
        clayPit.impact();
      },
      onChopDone: () => {
        clayPit.setDigging(false);
      },
      onDeliver: () => {
        const amount = game.addClay(clayYard.perLoad);
        clayYard.setClay(amount);
        refreshHud();
      },
      nextJob: () => {
        if (isFull() || !game.canCollectResource?.("clay")) {
          game.clearBuildingWorker("clayPit", member.getId());
          game.setVillagerState(member.getId(), "IDLE", {
            assignedBuildingId: null,
            assignedTaskId: null,
          });
          return null;
        }
        return makeDigJob(member);
      },
    };
  }

  function assignDigger(member) {
    if (!member || member.isBusy()) return false;
    if (!game.canCollectResource?.("clay")) return false;
    if (isFull()) return false;
    const accepted = member.assignJob(makeDigJob(member));
    if (!accepted) return false;
    game.assignBuildingWorker("clayPit", member.getId());
    return true;
  }

  function update(delta) {
    clayPit?.update?.(delta);
  }

  game.subscribe(() => refreshHud());
  refreshHud();

  return {
    update,
    assignDigger,
    refreshHud,
    isFull,
  };
}
