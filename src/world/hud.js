import { RECIPES, POTIONS, formatCost } from "./simulation.js";

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

const COST_ROW_LABELS = {
  bread: "Brot",
  planks: "Bretter",
  bucket: "Eimer",
  rope: "Seile",
  blanket: "Decken",
};

const BUILDING_INFO = {
  "wood-storage": { label: "Holzlager", icon: "🪵", resource: "wood", resourceLabel: "Holz" },
  "stone-storage": { label: "Steinlager", icon: "🪨", resource: "stone", resourceLabel: "Stein" },
  "clay-storage": { label: "Lehmlager", icon: "🧱", resource: "clay", resourceLabel: "Lehm" },
  kitchen: { label: "Küche", icon: "🍲", resource: "soup", resourceLabel: "Suppe" },
  bakery: { label: "Bäckerei", icon: "🍞", resource: "bread", resourceLabel: "Brot", worker: "Bäcker" },
  tailor: { label: "Schneiderei", icon: "🧵", worker: "Schneider" },
  "wood-workshop": { label: "Holzwerkstatt", icon: "🪚", worker: "Werker" },
  well: {
    label: "Brunnen",
    icon: "💧",
    blurb: "Treffpunkt der Bewohner. Wer frei ist, trifft sich hier.",
  },
  cottage: {
    label: "Holzhaus",
    icon: "🏠",
    blurb: "Zuhause der Dorfbewohner. Neue Häuser locken neue Bewohner an.",
  },
  "house-ii": {
    label: "Wohnhaus II",
    icon: "🏠",
    blurb: "Sophies Zuhause. Nach der Bauzeit zieht sie ein.",
  },
};

export function createHud({
  game,
  onBuild,
  onValley,
  onArrange,
  onWind,
  onFocusVillager,
  onReset,
  onKitchen,
  onWorkshop,
  onPotion,
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
  let openArg = null;

  function closeSheet() {
    openId = null;
    openArg = null;
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

  function renderResearch(keepScroll = false) {
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
    let potionsHtml = "";
    if (game.isPotionsUnlocked?.()) {
      const brewing = game.getBrewing?.() ?? { queue: [], progress: 0 };
      const stock = game.getPotions?.() ?? {};
      const items = POTIONS.map((potion) => {
        const count = stock[potion.id] ?? 0;
        const cost = formatCost(potion.inputs);
        return `<div class="inv-row">
          <span>🧪 ${potion.label}${count ? ` <em>×${count}</em>` : ""}<br><small>${potion.description}</small></span>
          <strong>
            <button class="sheet-action" type="button" data-brew="${potion.id}">Brauen · ${cost}</button>
            ${count > 0 ? `<button class="sheet-action" type="button" data-give="${potion.id}">Geben</button>` : ""}
          </strong>
        </div>`;
      }).join("");
      const queueLabel = brewing.queue
        .map((id) => POTIONS.find((p) => p.id === id)?.label ?? id)
        .join(" + ");
      const brewingLine = brewing.queue.length
        ? `<div class="inv-row"><span>Braut</span><strong>${queueLabel}${brewing.queue[0] ? ` (${Math.round((brewing.progress / (POTIONS.find((p) => p.id === brewing.queue[0])?.seconds || 1)) * 100)}%)` : ""}</strong></div>`
        : "";
      potionsHtml = `<h3 class="sheet-subtitle">Tränke</h3>${brewingLine}${items}`;
    }
    openSheet(
      "research",
      "Forschungsbaum",
      `<p class="glass-lead">Von links nach rechts. Jeder Schritt schaltet das Nächste frei.</p>
       <div class="research-tree">${steps}</div>${potionsHtml}`,
    );
    if (!keepScroll) {
      requestAnimationFrame(() => {
        const ready = els.sheetBody?.querySelector(".research-node.is-open, .research-node.is-ready");
        ready?.closest(".research-step")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      });
    }
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

  function renderBuilding(id) {
    const info = BUILDING_INFO[id];
    if (!info) return;
    openArg = id;
    const snap = game.getSnapshot();
    const upgrade = game.getUpgradeInfo?.(id);
    const level = game.getBuildingLevel?.(id) ?? 1;
    const rows = [];
    if (info.resource) {
      const cap = upgrade?.cap ?? snap.village[`${info.resource}Cap`];
      rows.push(
        `<div class="inv-row"><span>${info.resourceLabel}</span><strong>${snap.village[info.resource] ?? 0}${cap ? ` / ${cap}` : ""}</strong></div>`,
      );
    }
    const effect = upgrade?.effect ?? info.blurb ?? "";
    if (effect) rows.push(`<p class="sheet-hint">${effect}</p>`);
    const recipes = RECIPES.filter((entry) => entry.building === id);
    if (recipes.length) {
      const production = game.getProduction?.(id);
      if (production) {
        const counts = new Map();
        production.queue.forEach((recipeId) => {
          counts.set(recipeId, (counts.get(recipeId) ?? 0) + 1);
        });
        const queueLabel = [...counts.entries()]
          .map(([recipeId, count]) => `${count}× ${RECIPES.find((r) => r.id === recipeId)?.label ?? recipeId}`)
          .join(" + ");
        rows.push(
          `<div class="inv-row"><span>Warteschlange</span><strong>${queueLabel || "leer"}</strong></div>`,
        );
        if (production.current) {
          const pct = Math.min(100, Math.round((production.progress / (production.seconds || 1)) * 100));
          rows.push(`<div class="inv-row"><span>Fortschritt</span><strong>${pct}%</strong></div>`);
        }
        const outputs = [...new Set(recipes.map((recipe) => recipe.output))];
        const stock = outputs
          .map((output) => `${COST_ROW_LABELS[output] ?? output} ${snap.village[output] ?? 0}`)
          .join(" · ");
        rows.push(`<div class="inv-row"><span>Lager</span><strong>${stock}</strong></div>`);
      }
    }
    const construction = game.getConstruction?.(id);
    if (construction) {
      rows.push(
        `<div class="inv-row"><span>Im Bau</span><strong>${Math.max(1, Math.ceil(construction.remaining))}s</strong></div>`,
      );
    }
    let action = "";
    if (id === "kitchen") {
      action += `<button class="sheet-action" type="button" data-cook>Koch auswählen · Suppe kochen</button>`;
    }
    recipes.forEach((recipe) => {
      action += `<button class="sheet-action" type="button" data-recipe="${recipe.id}">${recipe.label} · ${formatCost(recipe.inputs)}</button>`;
    });
    if (recipes.length && info.worker) {
      action += `<button class="sheet-action" type="button" data-worker="${id}">${info.worker} auswählen</button>`;
    }
    if (upgrade) {
      if (upgrade.atMax) {
        action += `<button class="sheet-action" type="button" disabled>Maximalstufe erreicht</button>`;
      } else {
        const cost = game.formatCost?.(upgrade.cost) ?? "";
        const capNote = upgrade.nextCap ? ` → ${upgrade.nextCap} Platz` : "";
        action += upgrade.affordable
          ? `<button class="sheet-action" type="button" data-upgrade="${id}">Ausbauen auf Stufe ${upgrade.level + 1} · ${cost}${capNote}</button>`
          : `<button class="sheet-action" type="button" disabled>Zu teuer · ${cost}${capNote}</button>`;
      }
    }
    openSheet(
      "building",
      `${info.icon} ${info.label} · Stufe ${level}`,
      `${rows.join("")}${action}`,
    );
  }

  const ORDER_RESOURCE_LABELS = {
    wood: "Holz",
    stone: "Stein",
    clay: "Lehm",
    soup: "Suppe",
    pumpkin: "Kürbisse",
    bread: "Brot",
    planks: "Bretter",
    bucket: "Eimer",
    rope: "Seile",
    blanket: "Decken",
    scrolls: "Schriftrollen",
  };

  function renderOrders() {
    const orders = game.listOrders?.() ?? [];
    const cards = orders
      .map((order, index) => {
        if (!order) return "";
        const needs = Object.entries(order.requests)
          .map(([key, value]) => `${value} ${ORDER_RESOURCE_LABELS[key] ?? key}`)
          .join(" · ");
        const rewards = [
          `${order.rewardGold ?? 0} Gold`,
          order.rewardScrolls ? `${order.rewardScrolls} Schriftrollen` : null,
          order.rewardRep ? `${order.rewardRep} Ruf` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const can = Boolean(game.canFillOrder?.(index));
        return `<button class="sheet-card ${can ? "is-ready" : "is-locked"}" type="button" data-order="${index}" ${can ? "" : "disabled"}>
          <strong>Auftrag ${index + 1}</strong>
          <small>Braucht: ${needs}</small>
          <em>${can ? "Liefern" : "Zu wenig"} → ${rewards}</em>
        </button>`;
      })
      .join("");
    openSheet(
      "orders",
      "Auftragsbrett",
      `<p class="glass-lead">Ottos Händler zahlen für Lieferungen — mit Gold und Schriftrollen.</p>${cards}`,
    );
  }

  function showNotice(title, html) {
    openSheet("notice", title, html);
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
    els.sheetBody?.querySelectorAll("[data-order]").forEach((button) => {
      button.addEventListener("click", () => {
        game.fillOrder?.(Number(button.dataset.order));
        refresh();
        renderOrders();
      });
    });
    els.sheetBody?.querySelectorAll("[data-crate]").forEach((button) => {
      button.addEventListener("click", () => {
        game.fillValleyCrate(Number(button.dataset.crate));
        refresh();
        renderValley();
      });
    });
    els.sheetBody?.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = game.upgradeBuilding?.(button.dataset.upgrade);
        refresh();
        if (result?.ok) {
          renderBuilding(button.dataset.upgrade);
        }
      });
    });
    els.sheetBody?.querySelector("[data-cook]")?.addEventListener("click", () => {
      closeSheet();
      onKitchen?.();
    });
    els.sheetBody?.querySelectorAll("[data-recipe]").forEach((button) => {
      button.addEventListener("click", () => {
        const recipe = RECIPES.find((entry) => entry.id === button.dataset.recipe);
        if (!recipe) return;
        game.queueRecipe?.(recipe.building, recipe.id);
        refresh();
        renderBuilding(recipe.building);
      });
    });
    els.sheetBody?.querySelectorAll("[data-worker]").forEach((button) => {
      button.addEventListener("click", () => {
        closeSheet();
        onWorkshop?.(button.dataset.worker);
      });
    });
    els.sheetBody?.querySelectorAll("[data-brew]").forEach((button) => {
      button.addEventListener("click", () => {
        game.brewPotion?.(button.dataset.brew);
        refresh();
        renderResearch(true);
      });
    });
    els.sheetBody?.querySelectorAll("[data-give]").forEach((button) => {
      button.addEventListener("click", () => {
        closeSheet();
        onPotion?.(button.dataset.give);
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
      els.valleyBtn.classList.toggle("is-locked", !game.isValleyUnlocked());
    }
    if (els.researchBtn) {
      els.researchBtn.classList.remove("needs-study");
    }
    const sophieOn = game.isVillagerUnlocked("sophie");
    if (els.sophieCard) els.sophieCard.hidden = !sophieOn;
    if (els.sophieDock) els.sophieDock.hidden = !sophieOn;
    rerenderOpenSheet();
  }

  function rerenderOpenSheet() {
    if (!openId || !els.sheet || els.sheet.hidden) return;
    const plank = els.sheet.querySelector(".game-sheet-plank");
    const tree = els.sheet.querySelector(".research-tree");
    const top = plank?.scrollTop ?? 0;
    const left = tree?.scrollLeft ?? 0;
    if (openId === "inventory") renderInventory();
    else if (openId === "valley") renderValley();
    else if (openId === "orders") renderOrders();
    else if (openId === "research") renderResearch(true);
    else if (openId === "build") renderBuild();
    else if (openId === "building" && openArg) renderBuilding(openArg);
    else return;
    const newPlank = els.sheet.querySelector(".game-sheet-plank");
    if (newPlank) newPlank.scrollTop = top;
    const newTree = els.sheet.querySelector(".research-tree");
    if (newTree) newTree.scrollLeft = left;
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
      const inValley = onValley?.();
      if (inValley === false) closeSheet();
      else renderValley();
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
    renderBuilding,
    renderOrders,
    showNotice,
  };
}
