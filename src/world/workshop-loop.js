export function createWorkshopLoop({ game, building, buildingId, taskId, villagers }) {
  const assigned = new Set();

  function makeJob(member) {
    return {
      kind: "work",
      approach: building.points.approach.clone(),
      lookAt: building.points.look.clone(),
      duration: 5,
      storageBlock: [],
      onStartWork: () => {
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: buildingId,
          assignedTaskId: taskId,
        });
      },
      nextJob: () =>
        (game.getProduction?.(buildingId)?.queue.length ?? 0) > 0 ? makeJob(member) : null,
    };
  }

  function assign(member) {
    if (!game.isPlaced(buildingId) || !building || !member || member.isBusy()) return false;
    if ((game.getProduction?.(buildingId)?.queue.length ?? 0) === 0) return false;
    const accepted = member.assignJob(makeJob(member));
    if (!accepted) return false;
    assigned.add(member.getId());
    return true;
  }

  function release(memberId) {
    assigned.delete(memberId);
    game.clearBuildingWorker(buildingId, memberId);
    const villager = game.getSnapshot().villagers[memberId];
    if (villager?.assignedBuildingId === buildingId) {
      game.setVillagerState(memberId, "IDLE", {
        assignedBuildingId: null,
        assignedTaskId: null,
      });
    }
  }

  function update(delta) {
    if (!game.isPlaced(buildingId)) return;
    const worker = villagers.find(
      (member) =>
        assigned.has(member.getId()) &&
        member.getState?.() === "job-work" &&
        member.getJobKind?.() === "work",
    );
    if (!worker || worker.isHungry?.()) return;
    const speed = game.villagerSpeed?.(worker.getId(), taskId ? game.skillForTask?.(taskId) : null) ?? 1;
    game.tickProduction?.(buildingId, delta * speed);
  }

  return {
    assign,
    release,
    update,
    has: (memberId) => assigned.has(memberId),
  };
}
