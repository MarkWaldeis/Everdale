const ITEM_ROWS = [
  ["wood", "Holz", "woodCap"],
  ["stone", "Stein", "stoneCap"],
  ["clay", "Lehm", "clayCap"],
  ["soup", "Suppe", "soupCap"],
  ["pumpkins", "Kürbisse", null],
  ["scrolls", "Schriftrollen", null],
  ["gold", "Gold", null],
  ["gems", "Diamanten", null],
  ["reputation", "Ruf", null],
  ["flour", "Mehl", null],
];

export function createHud({
  game,
  onBuild,
  onValley,
  onArrange,
  onWind,
  onFocusVillager,
  onReset,
}) {
  const els = {
    level: document.querySelector("#hud-level"),
    xp: document.querySelector("#hud-xp"),
    gold: document.querySelector("#hud-gold"),
    gems: document.querySelector("#hud-gems"),
    rep: document.querySelector("#hud-rep"),
    soup: document.querySelector("#hud-soup"),
    soupCap: document.querySelector("#hud-soup-cap"),
    wood: document.querySelector("#hud-wood"),
    woodCap: document.querySelector("#hud-wood-cap"),
    stone: document.querySelector("#hud-stone"),
    clay: document.querySelector("#hud-clay"),
    scrolls: document.querySelector("#hud-scrolls"),
    quest: document.querySelector("#hud-quest"),
    sheet: document.querySelector("#game-sheet"),
    sheetTitle: document.querySelector("#sheet-title"),
    sheetBody: document.querySelector("#sheet-body"),
    valleyBtn: document.querySelector("#btn-valley"),
    researchBtn: document.querySelector("#btn-research"),
    sophieCard: document.querySelector('[data-hud-villager="sophie"]'),
    sophieDock: document.querySelector('#worker-dock [data-villager="sophie"]'),
  };

  let openId = null;

  function closeSheet() {
    openId = null;
    if (!els.sheet) return;
    els.sheet.hidden = true;
    els.sheet.classList.remove("is-research", "is-build");
  }

  function openSheet(id, title, html) {
    openId = id;
    if (!els.sheet) return;
    els.sheet.hidden = false;
    els.sheet.classList.toggle("is-research", id === "research");
    els.sheet.classList.toggle("is-build", id === "build");
    if (els.sheetTitle) els.sheetTitle.textContent = title;
    if (els.sheetBody) els.sheetBody.innerHTML = html;
    bindSheetButtons();
  }

  function statusLabel(status, extra = "") {
    if (status === "done") return "Erforscht";
    if (status === "researching") return "Wird erforscht";
    if (status === "ready") return extra || "Bereit";
    return extra || "Gesperrt";
  }

  function renderBuild() {
    const cards = game.catalog
      .filter((item) => item.placeable || item.later)
      .map((item) => {
        const placed = game.isPlaced(item.id);
        const unlocked = game.isUnlocked(item.id);
        const can = game.canPlaceBuilding(item.id);
        const cost = game.formatCost?.(item.cost) ?? "";
        let state = "Tippen und auf die Karte setzen";
        let kind = "is-ready";
        if (!item.placeable || item.later) {
          state = "Bald verfügbar";
          kind = "is-locked";
        } else if (placed) {
          state = "Steht im Dorf";
          kind = "is-done";
        } else if (!unlocked) {
          state = "Zuerst im Labor erforschen";
          kind = "is-locked";
        } else if (!can) {
          state = `Zu teuer · ${cost}`;
          kind = "is-locked";
        }
        const disabled = !can;
        const price = cost && cost !== "Frei" ? cost : "";
        return `<button class="glass-card ${kind}" type="button" data-build="${item.id}" ${disabled ? "disabled" : ""}>
          <span class="glass-card-kicker">${placed ? "Gebaut" : unlocked ? "Freigeschaltet" : "Gesperrt"}</span>
          <strong>${item.label}</strong>
          <small>${item.description}</small>
          <em>${price ? `${price} · ${state}` : state}</em>
        </button>`;
      })
      .join("");
    openSheet(
      "build",
      "Bauen",
      `<p class="glass-lead">Wähle ein erforschtes Gebäude. Danach setzt du es auf ein freies Feld.</p>
       <div class="build-grid">${cards || "<p>Nichts verfügbar.</p>"}</div>`,
    );
  }

  function renderResearch() {
    const steps = game.nodes
      .map((node, index) => {
        const status = game.getNodeStatus(node.id);
        const cost = game.formatCost?.(node.cost) ?? "";
        const affordable = game.canAffordResearch?.(node.id);
        const shortfall = game.researchShortfall?.(node.id) ?? [];
        const canClick = (status === "ready" && affordable) || status === "researching";
        let extra = cost;
        if (status === "ready" && !affordable && shortfall.length) {
          extra = `Noch ${shortfall.join(", ")}`;
        } else if (status === "ready" && affordable) {
          extra = `${cost} · Tippen zum Freischalten`;
        } else if (status === "locked" && node.later) {
          extra = "Bald";
        }
        return `<div class="research-step">
          ${index > 0 ? `<span class="research-link is-${status}" aria-hidden="true"></span>` : ""}
          <button class="research-node is-${status} ${canClick ? "is-open" : ""}" type="button" data-research="${node.id}" ${canClick ? "" : "disabled"}>
            <span class="research-glyph">${node.icon ?? "✦"}</span>
            <span class="research-index">${String(index + 1).padStart(2, "0")}</span>
            <strong>${node.name}</strong>
            <small>${node.detail}</small>
            <em>${statusLabel(status, extra)}</em>
          </button>
        </div>`;
      })
      .join("");
    openSheet(
      "research",
      "Forschungsbaum",
      `<p class="glass-lead">Von links nach rechts. Jeder Schritt schaltet das Nächste frei.</p>
       <div class="research-tree">${steps}</div>`,
    );
    requestAnimationFrame(() => {
      const ready = els.sheetBody?.querySelector(".research-node.is-open, .research-node.is-ready");
      ready?.closest(".research-step")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }

  function renderInventory() {
    const snap = game.getSnapshot();
    const rows = ITEM_ROWS.map(([key, label, capKey]) => {
      const value = snap.village[key] ?? 0;
      const cap = capKey ? ` / ${snap.village[capKey]}` : "";
      return `<div class="inv-row"><span>${label}</span><strong>${value}${cap}</strong></div>`;
    }).join("");
    openSheet("inventory", "Lager", rows);
  }

  function renderSettings() {
    const muted = game.getMuted();
    const wind = game.getWind();
    openSheet(
      "settings",
      "Einstellungen",
      `<button class="sheet-action" type="button" id="btn-mute">${muted ? "Ton an" : "Ton aus"}</button>
       <button class="sheet-action" type="button" id="btn-wind">${wind ? "Wind aus" : "Wind an"}</button>
       <button class="sheet-action is-danger" type="button" id="btn-reset-save">Spielstand löschen</button>
       <p class="sheet-hint">Wind und Ton greifen sofort. Löschen startet das Dorf neu.</p>`,
    );
  }

  function renderValley() {
    if (!game.isValleyUnlocked()) {
      openSheet("valley", "Tal", "<p>Erforsche den Tal-Zugang, dann kannst du hinreisen.</p>");
      return;
    }
    const snap = game.getSnapshot();
    const crates = snap.valley.crates
      .map((crate) => {
        const filled = crate.filledBy
          ? `Beladen von ${crate.filledBy === "player" ? "dir" : "einem Tal-Mitglied"}`
          : `${crate.amount}× ${crate.item} → ${crate.rewardGold} Gold`;
        const disabled = Boolean(crate.filledBy);
        return `<button class="sheet-card ${disabled ? "is-locked" : ""}" type="button" data-crate="${crate.id}" ${disabled ? "disabled" : ""}>
          <strong>Kiste ${crate.id + 1}</strong>
          <small>${filled}</small>
        </button>`;
      })
      .join("");
    openSheet("valley", "Hafen", `${crates}<p class="sheet-hint">Andere Tal-Mitglieder füllen mit der Zeit weitere Kisten.</p>`);
  }

  function bindSheetButtons() {
    els.sheetBody?.querySelectorAll("[data-build]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = onBuild?.(button.dataset.build);
        if (result?.ok) {
          closeSheet();
          refresh();
        } else {
          renderBuild();
        }
      });
    });
    els.sheetBody?.querySelectorAll("[data-research]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = game.completeResearch(button.dataset.research);
        refresh();
        if (result?.ok && result.unlockedBuilding) {
          renderBuild();
          return;
        }
        renderResearch();
      });
    });
    els.sheetBody?.querySelectorAll("[data-crate]").forEach((button) => {
      button.addEventListener("click", () => {
        game.fillValleyCrate(Number(button.dataset.crate));
        refresh();
        renderValley();
      });
    });
    els.sheetBody?.querySelector("#btn-mute")?.addEventListener("click", () => {
      game.setMuted(!game.getMuted());
      renderSettings();
    });
    els.sheetBody?.querySelector("#btn-wind")?.addEventListener("click", () => {
      const next = !game.getWind();
      game.setWind(next);
      onWind?.(next);
      renderSettings();
    });
    els.sheetBody?.querySelector("#btn-reset-save")?.addEventListener("click", () => {
      onReset?.();
    });
  }

  function refresh() {
    const snap = game.getSnapshot();
    if (els.level) els.level.textContent = String(game.getPlayerLevel());
    if (els.xp) els.xp.textContent = `${snap.player.xp} EP`;
    if (els.gold) els.gold.textContent = String(snap.village.gold);
    if (els.gems) els.gems.textContent = String(snap.village.gems);
    if (els.rep) els.rep.textContent = String(snap.village.reputation);
    if (els.soup) els.soup.textContent = String(snap.village.soup);
    if (els.soupCap) els.soupCap.textContent = `/${snap.village.soupCap}`;
    if (els.wood) els.wood.textContent = String(snap.village.wood);
    if (els.woodCap) els.woodCap.textContent = `/${snap.village.woodCap}`;
    if (els.stone) els.stone.textContent = String(snap.village.stone);
    if (els.clay) els.clay.textContent = String(snap.village.clay);
    if (els.scrolls) els.scrolls.textContent = String(snap.village.scrolls);
    if (els.quest) els.quest.textContent = game.getQuest().text;
    if (els.valleyBtn) {
      els.valleyBtn.disabled = !game.isValleyUnlocked();
      els.valleyBtn.classList.toggle("is-locked", !game.isValleyUnlocked());
    }
    if (els.researchBtn) {
      els.researchBtn.classList.remove("needs-study");
    }
    const sophieOn = game.isVillagerUnlocked("sophie");
    if (els.sophieCard) els.sophieCard.hidden = !sophieOn;
    if (els.sophieDock) els.sophieDock.hidden = !sophieOn;
    if (openId === "inventory") renderInventory();
    if (openId === "valley") renderValley();
  }

  function bind() {
    document.querySelector("#btn-settings")?.addEventListener("click", renderSettings);
    document.querySelector("#btn-build")?.addEventListener("click", () => {
      if (openId === "build") closeSheet();
      else renderBuild();
    });
    document.querySelector("#btn-inventory")?.addEventListener("click", renderInventory);
    document.querySelector("#btn-research")?.addEventListener("click", () => {
      if (openId === "research") closeSheet();
      else renderResearch();
    });
    document.querySelector("#btn-valley")?.addEventListener("click", () => {
      if (!game.isValleyUnlocked()) {
        renderValley();
        return;
      }
      onValley?.();
      renderValley();
    });
    // Anordnen is bound by the village editor.
    document.querySelector("#sheet-close")?.addEventListener("click", closeSheet);
    els.sheet?.addEventListener("click", (event) => {
      if (event.target === els.sheet) closeSheet();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && openId) closeSheet();
    });
    document.querySelector("#hud-level-wrap")?.addEventListener("click", renderInventory);
    document.querySelectorAll("[data-hud-villager]").forEach((button) => {
      button.addEventListener("click", () => onFocusVillager?.(button.dataset.hudVillager));
    });
    game.subscribe(() => refresh());
    refresh();
  }

  return {
    bind,
    refresh,
    closeSheet,
    renderBuild,
    renderResearch,
    renderInventory,
    renderSettings,
    renderValley,
  };
}
