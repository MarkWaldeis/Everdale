export function createWheatLoop({ game, wheatField, storages = [] }) {
  function blockOf(storage) {
    if (!storage?.root) return null;
    const span = Math.max(storage.size?.x ?? 0.8, storage.size?.z ?? 0.8);
    return { x: storage.root.position.x, z: storage.root.position.z, radius: span * 0.55 + 0.18 };
  }

  function villageBlocks() {
    return storages.map(blockOf).filter(Boolean);
  }

  function isFull() {
    return (game.getWheat?.() ?? 0) >= (game.getWheatCap?.() ?? 20);
  }

  function makeHarvestJob(member) {
    return {
      kind: "harvest",
      approach: wheatField.stand.clone(),
      lookAt: wheatField.look.clone(),
      duration: game.getHarvestSeconds(member.getId()),
      storageBlock: villageBlocks(),
      onStartWork: () => {
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "wheat-field",
          assignedTaskId: "harvest-wheat",
        });
      },
      onWorkDone: () => {
        game.addWheat(2);
      },
      nextJob: () => {
        if (isFull() || !game.canCollectResource?.("wheat")) {
          game.clearBuildingWorker("wheat-field", member.getId());
          game.setVillagerState(member.getId(), "IDLE", {
            assignedBuildingId: null,
            assignedTaskId: null,
          });
          return null;
        }
        return makeHarvestJob(member);
      },
    };
  }

  function assign(member) {
    if (!member || member.isBusy()) return false;
    if (!game.isPlaced?.("wheat-field")) return false;
    if (!game.canCollectResource?.("wheat")) return false;
    if (isFull()) return false;
    const accepted = member.assignJob(makeHarvestJob(member));
    if (!accepted) return false;
    game.assignBuildingWorker("wheat-field", member.getId());
    return true;
  }

  return { assign, isFull };
}
