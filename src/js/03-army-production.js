  // Eight distinct units: four roles in each of the assault and defense branches.
  const UNIT_ROLES = Object.freeze([
    { id: "spear", name: "نیزه", symbol: "♜", counters: "special" },
    { id: "bow", name: "کمان", symbol: "➶", counters: "cavalry" },
    { id: "cavalry", name: "سوارکار", symbol: "♞", counters: "spear" },
    { id: "special", name: "ویژه", symbol: "✦", counters: "bow" }
  ]);
  const TROOP_LINES = [
    { id: "sword", role: "spear", group: "attack", name: "نیزه‌ور آذرپیمان", attack: 32, defense: 15, health: 110, power: 80, seconds: 18, cost: 35 },
    { id: "archer", role: "bow", group: "attack", name: "کمان‌ور بادچله", attack: 38, defense: 12, health: 95, power: 90, seconds: 21, cost: 40 },
    { id: "knight", role: "cavalry", group: "attack", name: "سوار تندرگام", attack: 46, defense: 22, health: 140, power: 120, seconds: 26, cost: 65 },
    { id: "beast", role: "special", group: "attack", name: "تبرور خاکستر", attack: 52, defense: 18, health: 125, power: 115, seconds: 25, cost: 60 },
    { id: "guard", role: "spear", group: "defense", name: "نیزه‌بان سنگروند", attack: 20, defense: 35, health: 150, power: 80, seconds: 18, cost: 35 },
    { id: "scout", role: "bow", group: "defense", name: "کمان‌بان شب‌دیده", attack: 26, defense: 29, health: 120, power: 90, seconds: 21, cost: 40 },
    { id: "spear", role: "cavalry", group: "defense", name: "سوار پولادگام", attack: 30, defense: 44, health: 180, power: 120, seconds: 26, cost: 65 },
    { id: "heavy", role: "special", group: "defense", name: "پتک‌بان دژمهر", attack: 32, defense: 48, health: 155, power: 115, seconds: 25, cost: 60 }
  ].map(t => ({ ...t, seconds:t.seconds*SEASON.trainingSecondsMultiplier, image: `assets/troops/${t.group}-${t.role}.webp` }));
  const TROOPS = Object.fromEntries(TROOP_LINES.map(t => [t.id, { ...t, line: t.id, tier: 1, speed: t.role === "cavalry" ? 240 : t.role === "bow" ? 170 : 150, capacity: t.role === "cavalry" ? 12 : 8 }]));
  const TRAINING_KEYS = Object.freeze(["training", "training2", "training3"]);
  function isTrainingQueue(kind) { return TRAINING_KEYS.includes(kind); }
  function armyPage(kind) { return isTrainingQueue(kind) ? "training" : "healing"; }
  function hasTrainingTasks() { return TRAINING_KEYS.some(k => !!APP.army[k]); }
  function trainingCapacity() { return 100 * Math.max(1, buildingById("barracks")?.level || 1); }
  function legacyTroopId(id) { const base = String(id).replace(/-[23]$/, ""); return TROOPS[base] ? base : "sword"; }
  function migrateUnitStock(stock) {
    const result = Object.fromEntries(Object.keys(TROOPS).map(id => [id, 0]));
    for (const [id, value] of Object.entries(stock || {})) {
      const count = boundedInteger(value, 0, 0, 1000000);
      result[legacyTroopId(id)] = Math.min(1000000, result[legacyTroopId(id)] + count);
    }
    return result;
  }
  function troopCounterMultiplier(role, defenderRole) {
    if (UNIT_ROLES.find(r => r.id === role)?.counters === defenderRole) return 1.25;
    if (UNIT_ROLES.find(r => r.id === defenderRole)?.counters === role) return .8;
    return 1;
  }
  function armyCounterMultiplier(units, defenderRole) {
    let total = 0, effective = 0;
    for (const [id, count] of Object.entries(units || {})) {
      const t = TROOPS[legacyTroopId(id)];
      const power = t.power * Math.max(0, count || 0);
      total += power; effective += power * troopCounterMultiplier(t.role, defenderRole);
    }
    return total ? effective / total : 1;
  }
  // ترکیب لشکر از موجودی واقعی رزرو می‌شود؛ نیروی اعزامی دوباره قابل مصرف نیست.
  function reserveTroops(count) {
    APP.army.units ||= {
      sword: APP.army.troops,
      archer: 0,
      knight: 0
    };
    const known = Object.values(APP.army.units).reduce((a, b) => a + b, 0);
    if (known < APP.army.troops) APP.army.units.sword += APP.army.troops - known;
    const result = {};
    let remaining = count;
    for (const id of Object.keys(TROOPS)) {
      const take = Math.min(remaining, APP.army.units[id] || 0);
      result[id] = take;
      if (take > 0) APP.army.units[id] -= take;
      remaining -= take;
    }
    return result;
  }
  function marchCapacity() {
    return Math.round(500 + 44500 * Math.pow(Math.max(0, (buildingById("camp").level - 1) / 19), 1.25));
  }
  function startArmyTask(kind) {
    if (![...TRAINING_KEYS, "healing"].includes(kind) || APP.army[kind]) return;
    const building = buildingById(isTrainingQueue(kind) ? "barracks" : "hospital");
    if (!building?.level) return showBuildNotice("ابتدا ساختمان را بسازید.");
    const requested = document.getElementById("armyType")?.value;
    const type = TROOPS[requested] ? requested : "sword",
      unit = TROOPS[type];
    let count = Math.floor(Number(document.getElementById("armyCount")?.value || 100));
    if (!Number.isFinite(count) || count < 1 || count > (isTrainingQueue(kind) ? trainingCapacity() : 1000000)) return showBuildNotice("تعداد انتخاب‌شده از ظرفیت این صف بیشتر است.");
    if (isTrainingQueue(kind) && !troopUnlocked(type)) return showBuildNotice("ابتدا این نیرو را پژوهش کنید.");
    let units = null;
    if (kind === "healing") {
      const stock = woundedStock();
      const selected = healingSelection();
      units = Object.keys(selected).length ? selected : {
        sword: Math.min(count, stock.sword || 0)
      };
      units = Object.fromEntries(Object.entries(units).filter(([id, n]) => TROOPS[id] && n > 0).map(([id, n]) => [id, Math.min(n, stock[id] || 0)]));
      count = Object.values(units).reduce((a, b) => a + b, 0);
      if (count > 1000000) return showBuildNotice("تعداد مجروحان معتبر نیست.");
    }
    if (!count) return showBuildNotice("نیروی مجروح ندارید.");
    const cost = count * (isTrainingQueue(kind) ? unit.cost : 12);
    const costs = isTrainingQueue(kind) ? troopResourceCosts(unit,count) : {food:cost};
    if(Object.entries(costs).some(([id,n])=>APP.resources[id]<n))return showBuildNotice("منابع کافی نیست.");
    for(const [id,n] of Object.entries(costs)) APP.resources[id]-=n;
    if (!isTrainingQueue(kind)) {
      APP.army.wounded -= count;
      for (const [id, n] of Object.entries(units)) APP.army.woundedUnits[id] -= n;
    }
    document.body.classList.toggle("tutorial-working", APP.tutorial.active);
    hideTutorialCard();
    const duration = Math.round(count * (isTrainingQueue(kind) ? unit.seconds : 6) * 1000 / (1 + (building.level - 1) * .04));
    APP.army[kind] = {
      count,
      type,
      units,
      cost,
      costs,
      startedAt: Date.now(),
      duration,
      endsAt: Date.now() + duration
    };
    updateTopHud();
    saveGameProgress();
    if (isTrainingQueue(kind)) trainingSlot = TRAINING_KEYS.indexOf(kind);
    isTrainingQueue(kind) ? openTraining() : openHealing();
  }
  async function speedArmy(kind, itemId) {
    const task = APP.army[kind],
      item = INVENTORY.find(i => i.id === itemId);
    if (!task || ![...TRAINING_KEYS, "healing"].includes(kind)) return;
    if (itemId && (!item || !["universal", isTrainingQueue(kind) ? "troop" : "heal"].includes(item.family))) return showBuildNotice("این آیتم برای این صف قابل استفاده نیست.");
    const gold = instantGold(task.endsAt - Date.now());
    if (itemId ? !item?.count : APP.resources.gold < gold) return showBuildNotice("موجودی کافی نیست.");
    if (!(await gameConfirm(itemId ? `استفاده از ${item.name}؟` : `اتمام آنی با ${gold} سکه؟`))) return;
    if (APP.army[kind] !== task || (itemId ? !item.count : APP.resources.gold < gold)) return;
    if (itemId) {
      item.count--;
      task.endsAt = Math.max(Date.now(), task.endsAt - item.value);
      APP.missions[isTrainingQueue(kind) ? "troopSpeedUsed" : "healSpeedUsed"] += item.value / 60000;
    } else {
      APP.resources.gold -= gold;
      task.endsAt = Date.now();
    }
    tickArmy();
    saveGameProgress();
    updateTopHud();
    // Completion can advance the tutorial to another facility or the UI tour.
    if (APP.army[kind] === task && APP.openPage === armyPage(kind)) isTrainingQueue(kind) ? openTraining() : openHealing();
  }
  function tickArmy() {
    ensureMissionDay();
    const beforeStage = APP.tutorial.phase;
    let completed = false;
    for (const [kind, field] of [...TRAINING_KEYS.map(k => [k, "trained"]), ["healing", "healed"]]) {
      const task = APP.army[kind];
      if (!task) continue;
      if (task.endsAt > Date.now()) {
        const time = document.querySelector(`[data-army-timer="${kind}"]`),
          progress = document.querySelector(`[data-army-progress="${kind}"]`);
        if (time) time.textContent = formatDuration(task.endsAt - Date.now());
        const goldButton = document.querySelector(`[data-army-gold="${kind}"]`);
        if (goldButton) goldButton.textContent = `اتمام · ${instantGold(task.endsAt - Date.now())} سکه`;
        if (progress) progress.value = Math.max(0, (task.duration || 1) - (task.endsAt - Date.now()));
        continue;
      }
      APP.army.units ||= {
        sword: 0,
        archer: 0,
        knight: 0
      };
      for (const [id, n] of Object.entries(task.units || {
        [task.type || "sword"]: task.count
      })) APP.army.units[id] = (APP.army.units[id] || 0) + n;
      APP.army.troops += task.count;
      APP.missions[field] += task.count;
      APP.army[kind] = null;
      completed = true;
      APP.army[isTrainingQueue(kind) ? "totalTrained" : "totalHealed"] = (APP.army[isTrainingQueue(kind) ? "totalTrained" : "totalHealed"] || 0) + task.count;

      updatePower();
      saveGameProgress();
      updateMissionStatus();
      if (APP.openPage === "missions") renderMissions(APP.missionTab);
    }
    if(completed){
      if(APP.tutorial.active && beforeStage.startsWith("army-") && tutorialArmyStage()!==beforeStage) finishTutorial();
      else if(APP.openPage==="training") renderTrainingPage();
      else if(APP.openPage==="healing") renderHealingPage();
      saveGameProgress();
    }
    updateTrainingActivity();
  }
  // تولید هر ساختمان در مخزن همان ساختمان می‌ماند؛ ظرفیت مخزن معادل هشت ساعت است.
  const PRODUCERS = {
    farm: "food",
    lumber: "wood",
    stone: "stone",
    iron: "iron"
  };
  function productionRate(id) {
    const level = buildingById(id)?.level || 0;
    return level ? productionRateAt(level) : 0;
  }
  function tickCollectors(now = Date.now()) {
    for (const [id, resource] of Object.entries(PRODUCERS)) {
      const rate = productionRate(id),
        c = APP.collectors[id] ||= {
          amount: 0,
          at: now,
          collectedAt: now
        };
      const multiplier = productionMultiplier(resource),
        pending = [APP.worker, APP.worker2].find(w => w.task?.id === id && w.endsAt <= now);
      const finalRate = pending ? productionRateAt(pending.task.target) : rate;
      const span = (from, to, speed) => {
        const elapsed = Math.max(0, to - from),
          boosted = Math.max(0, Math.min(to, APP.productionBoostUntil) - from);
        return (elapsed + Math.min(elapsed, boosted)) / 3600000 * speed * multiplier;
      };
      const produced = pending ? span(c.at, Math.min(now, Math.max(c.at, pending.endsAt)), rate) + span(Math.max(c.at, pending.endsAt), now, finalRate) : span(c.at, now, rate);
      c.amount = Math.min(finalRate * multiplier * 8, c.amount + produced);
      c.at = Math.max(c.at, now);
      let node = document.getElementById(`collect-${id}`);
      if (!node && state.spriteLayer) {
        node = document.createElement("button");
        node.id = `collect-${id}`;
        node.className = "collector-button";
        node.innerHTML = `<img src="${RESOURCE_META[resource].image}" alt="جمع‌آوری ${RESOURCE_META[resource].label}">`;
        node.onclick = e => {
          e.stopPropagation();
          collectResource(id);
        };
        state.spriteLayer.appendChild(node);
      }
      if (node) node.hidden = !(c.amount >= 1 && (now - c.collectedAt >= 300000 || c.loginReady));
    }
    positionCollectors();
  }
  function positionCollectors() {
    for (const id of Object.keys(PRODUCERS)) {
      const node = document.getElementById(`collect-${id}`),
        b = buildingById(id);
      if (!node || !b) continue;
      const preview = state.pendingMove?.id === b.id ? state.pendingMove : b;
      const box = buildingRenderBox(b, preview.q, preview.r);
      node.style.left = `${box.x + box.width / 2}px`;
      node.style.top = `${box.y - 9 / state.camera.zoom}px`;
      node.style.setProperty("--collector-scale", 1 / state.camera.zoom);
    }
  }
  function collectResource(id) {
    tickCollectors();
    const c = APP.collectors[id],
      resource = PRODUCERS[id],
      amount = Math.floor(c?.amount || 0);
    if (!amount) return;
    c.amount -= amount;
    c.collectedAt = Date.now();
    c.loginReady = false;
    APP.resources[resource] += amount;
    recordCollected(amount);
    updateTopHud();
    saveGameProgress();
    showResourceGain(resource, amount);
    tickCollectors();
  }
  async function completeInstant(id, start = false) {
    const b = buildingById(id);
    if (!b) return;
    const expectedLevel = b.level,
      initial = start ? null : APP.worker.task;
    const quote = instantGold(start ? buildingDuration(b.level + 1, id) : APP.worker.endsAt - Date.now());
    if (APP.resources.gold < quote || !(await gameConfirm(`اتمام آنی با حداکثر ${quote} سکه تأیید می‌شود؟`))) return;
    if (b.level !== expectedLevel || !start && APP.worker.task !== initial) return;
    if (start) startBuildingTask(id);
    const worker = APP.worker.task?.id === id ? APP.worker : APP.worker2.task?.id === id ? APP.worker2 : null;
    if (!worker) return;
    const cost = Math.min(quote, instantGold(worker.endsAt - Date.now()));
    if (APP.resources.gold < cost) return;
    APP.resources.gold -= cost;
    worker.endsAt = Date.now();
    tickBuildingTask();
    updateTopHud();
    saveGameProgress();
  }
  async function quickSpeed() {
    if (!APP.worker.task) return;
    const needed = Math.ceil(Math.max(0, APP.worker.endsAt - Date.now()) / 60000);
    const items = INVENTORY.filter(x => x.category === "speed" || x.family === "universal").sort((a, b) => b.value - a.value);
    const best = new Map([[0, []]]);
    for (const item of items) for (let count = 0; count < Math.min(item.count, Math.ceil(needed / (item.value / 60000))); count++) {
      for (const [minutes, selection] of [...best].sort((a, b) => b[0] - a[0])) {
        const next = minutes + item.value / 60000;
        if (next > needed + 60) continue;
        if (!best.has(next) || best.get(next).length > selection.length + 1) best.set(next, [...selection, item]);
      }
    }
    const choice = [...best].filter(([minutes]) => minutes >= needed).sort((a, b) => a[0] - b[0] || a[1].length - b[1].length)[0];
    if (!choice) return showBuildNotice("آیتم تسریع کافی نیست.");
    const groups = choice[1].reduce((o, x) => {
      o[x.name] = (o[x.name] || 0) + 1;
      return o;
    }, {});
    if (!(await gameConfirm(`استفاده سریع: ${Object.entries(groups).map(([name, n]) => `${name} ×${n}`).join("، ")}؟`))) return;
    if (!APP.worker.task) return;
    for (const item of choice[1]) {
      item.count--;
      APP.worker.endsAt -= item.value;
    }
    APP.worker.endsAt = Math.max(Date.now(), APP.worker.endsAt);
    APP.missions.buildSpeedUsed += choice[0];
    saveGameProgress();
    tickBuildingTask();
    updateTopHud();
    if (APP.worker.task) {
      openBuildingPanel("upgrade");
      document.getElementById("speedChoices").hidden = false;
    }
  }
  function cancelBuildingTask(id) {
    const task = APP.worker.task;
    if (!task || task.id !== id) return false;
    const building = buildingById(id);
    for (const [resource, cost] of Object.entries(task.cost || buildingCost(building, task.target))) APP.resources[resource] += Math.floor(cost * .7);
    APP.worker = {
      task: null,
      endsAt: 0
    };
    if (APP.tutorial.active && !APP.tutorial.phase.startsWith("army-")) APP.tutorial.phase = "panel";
    updateTopHud();
    updateBuildingProgress();
    renderMarchQueue(true);
    saveGameProgress();
    openBuildingPanel("upgrade");
    return true;
  }

  // ---------------------------------------------------------------------------
  // ===========================================================================
  // رابط کاربری جدید بازی
  // این بخش state مشترک منابع، Inventory، پیام‌ها، نقشه جهان و لشکرکشی را مدیریت می‌کند.
  // ===========================================================================
