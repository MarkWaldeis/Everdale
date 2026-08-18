export function createStudyLoop({ game, study, villagers }) {
  const assigned = new Set();

  function villageBlocks() {
    return [];
  }

  function assignScholar(member) {
    if (!game.isPlaced("study") || !study || !member || member.isBusy()) return false;
    const ready = game.nodes.find((node) => game.getNodeStatus(node.id) === "ready");
    if (!game.getRaw().research.activeId && ready) {
      const started = game.startResearch(ready.id);
      if (!started.ok && started.reason === "scrolls") return false;
    }
    if (!game.getRaw().research.activeId) return false;
    const accepted = member.assignJob({
      kind: "visit",
      approach: study.points.approach.clone(),
      lookAt: study.points.look.clone(),
      storageBlock: villageBlocks(),
      onArrived: () => {
        assigned.add(member.getId());
        game.setVillagerState(member.getId(), "WORKING", {
          assignedBuildingId: "study",
          assignedTaskId: "research",
        });
      },
    });
    if (!accepted) return false;
    assigned.add(member.getId());
    return true;
  }

  function releaseScholar(memberId) {
    assigned.delete(memberId);
    game.clearBuildingWorker("study", memberId);
    game.setVillagerState(memberId, "IDLE", {
      assignedBuildingId: null,
      assignedTaskId: null,
    });
  }

  function update(delta) {
    if (!game.isPlaced("study")) return;
    const researcher = villagers.find(
      (member) => assigned.has(member.getId()) && (member.isAtLab?.() || member.getState?.() === "visit-inside"),
    );
    if (!researcher) return;
    if (game.tickVillagerWork(researcher.getId(), delta)) return;
    game.tickResearch(delta);
  }

  return {
    assignScholar,
    releaseScholar,
    update,
  };
}
