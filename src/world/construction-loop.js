export function createConstructionLoop({ game, module, buildingId, villagers }) {
  const assigned = new Set();

  function makeJob(member) {
    return {
      kind: "work",
      approach: module.stand?.clone?.() ?? module.root.position.clone(),
      lookAt: module.look?.clone?.() ?? module.root.position.clone(),
      duration: 6,
      storageBlock: [],
      onStartWork: () => {
        game.assignConstructionWorker?.(buildingId, member.getId());
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: buildingId,
          assignedTaskId: "build",
        });
      },
      nextJob: () => {
        if (game.getConstruction?.(buildingId)) return makeJob(member);
        release(member.getId());
        return null;
      },
    };
  }

  function assign(member) {
    if (!game.isPlaced(buildingId) || !member || member.isBusy()) return false;
    if (!game.getConstruction?.(buildingId)) return false;
    const accepted = member.assignJob(makeJob(member));
    if (!accepted) return false;
    assigned.add(member.getId());
    game.assignBuildingWorker?.(buildingId, member.getId());
    return true;
  }

  function release(memberId) {
    assigned.delete(memberId);
    game.clearConstructionWorker?.(buildingId);
    game.clearBuildingWorker?.(buildingId, memberId);
    const villager = game.getSnapshot().villagers[memberId];
    if (villager?.assignedBuildingId === buildingId) {
      game.setVillagerState(memberId, "IDLE", {
        assignedBuildingId: null,
        assignedTaskId: null,
      });
    }
  }

  function isFull() {
    return assigned.size > 0 || !game.getConstruction?.(buildingId);
  }

  return { assign, release, isFull, has: (memberId) => assigned.has(memberId), module, taskId: "build" };
}
