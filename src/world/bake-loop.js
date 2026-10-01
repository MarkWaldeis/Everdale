export function createBakeLoop({ game, bakery, villagers }) {
  const assigned = new Set();

  function makeJob(member) {
    return {
      kind: "work",
      approach: bakery.points.approach.clone(),
      lookAt: bakery.points.look.clone(),
      duration: 5,
      storageBlock: [],
      onStartWork: () => {
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "bakery",
          assignedTaskId: "bake",
        });
      },
      nextJob: () =>
        (game.getProduction?.("bakery")?.queue.length ?? 0) > 0 ? makeJob(member) : null,
    };
  }

  function assignBaker(member) {
    if (!game.isPlaced("bakery") || !bakery || !member || member.isBusy()) return false;
    if ((game.getProduction?.("bakery")?.queue.length ?? 0) === 0) return false;
    const accepted = member.assignJob(makeJob(member));
    if (!accepted) return false;
    assigned.add(member.getId());
    return true;
  }

  function releaseBaker(memberId) {
    assigned.delete(memberId);
    game.clearBuildingWorker("bakery", memberId);
    game.setVillagerState(memberId, "IDLE", {
      assignedBuildingId: null,
      assignedTaskId: null,
    });
  }

  function update(delta) {
    if (!game.isPlaced("bakery")) return;
    const baker = villagers.find(
      (member) =>
        assigned.has(member.getId()) &&
        member.getState?.() === "job-work" &&
        member.getJobKind?.() === "work",
    );
    if (!baker) return;
    if (game.tickVillagerWork(baker.getId(), delta)) return;
    game.tickProduction?.("bakery", delta);
  }

  return {
    assignBaker,
    releaseBaker,
    update,
  };
}
