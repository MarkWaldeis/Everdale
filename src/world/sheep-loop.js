export function createSheepLoop({ game, sheepPen, storages = [] }) {
  function blockOf(storage) {
    if (!storage?.root) return null;
    const span = Math.max(storage.size?.x ?? 0.8, storage.size?.z ?? 0.8);
    return { x: storage.root.position.x, z: storage.root.position.z, radius: span * 0.55 + 0.18 };
  }

  function villageBlocks() {
    return storages.map(blockOf).filter(Boolean);
  }

  function isFull() {
    return (game.getWool?.() ?? 0) >= (game.getWoolCap?.() ?? 20);
  }

  function makeShearJob(member) {
    return {
      kind: "harvest",
      approach: sheepPen.stand.clone(),
      lookAt: sheepPen.look.clone(),
      duration: game.getHarvestSeconds(member.getId()) * 1.4,
      storageBlock: villageBlocks(),
      onStartWork: () => {
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "sheep-pen",
          assignedTaskId: "shear-wool",
        });
      },
      onWorkDone: () => {
        game.addWool(1);
      },
      nextJob: () => {
        if (isFull() || !game.canCollectResource?.("wool")) {
          game.clearBuildingWorker("sheep-pen", member.getId());
          game.setVillagerState(member.getId(), "IDLE", {
            assignedBuildingId: null,
            assignedTaskId: null,
          });
          return null;
        }
        return makeShearJob(member);
      },
    };
  }

  function assign(member) {
    if (!member || member.isBusy()) return false;
    if (!game.isPlaced?.("sheep-pen")) return false;
    if (!game.canCollectResource?.("wool")) return false;
    if (isFull()) return false;
    const accepted = member.assignJob(makeShearJob(member));
    if (!accepted) return false;
    game.assignBuildingWorker("sheep-pen", member.getId());
    return true;
  }

  return { assign, isFull };
}
