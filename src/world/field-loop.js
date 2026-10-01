export function createFieldLoop({
  game,
  module,
  buildingId,
  taskId,
  resourceId,
  storages = [],
  addResource,
  getResource,
  getCap,
  yieldAmount = 1,
  durationScale = 1,
  onYield = null,
}) {
  function blockOf(storage) {
    if (!storage?.root) return null;
    const span = Math.max(storage.size?.x ?? 0.8, storage.size?.z ?? 0.8);
    return { x: storage.root.position.x, z: storage.root.position.z, radius: span * 0.55 + 0.18 };
  }

  function villageBlocks() {
    return storages.map(blockOf).filter(Boolean);
  }

  function isFull() {
    return (getResource?.() ?? 0) >= (getCap?.() ?? 20);
  }

  function makeHarvestJob(member) {
    return {
      kind: "harvest",
      approach: module.stand.clone(),
      lookAt: module.look.clone(),
      duration: game.getHarvestSeconds(member.getId(), taskId) * durationScale,
      storageBlock: villageBlocks(),
      onStartWork: () => {
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: buildingId,
          assignedTaskId: taskId,
        });
      },
      onWorkDone: () => {
        addResource(yieldAmount);
        onYield?.();
      },
      nextJob: () => {
        if (isFull() || !game.canCollectResource?.(resourceId)) {
          game.clearBuildingWorker(buildingId, member.getId());
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
    if (!game.isPlaced?.(buildingId)) return false;
    if (!game.canCollectResource?.(resourceId)) return false;
    if (isFull()) return false;
    const accepted = member.assignJob(makeHarvestJob(member));
    if (!accepted) return false;
    game.assignBuildingWorker(buildingId, member.getId());
    return true;
  }

  return { assign, isFull };
}
