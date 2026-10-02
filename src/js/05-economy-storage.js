  // ===========================================================================
  // اقتصاد، ساخت‌وساز و پیشرفت آموزشی (ذخیره محلی برای نمونه قابل‌بازی)
  // ===========================================================================
  const BUILD_ORDER = TUTORIAL_ORDER;
  function tutorialTargetId() {
    return APP.tutorial.phase === "army-training" ? "barracks" : APP.tutorial.phase === "army-healing" ? "hospital" : APP.tutorial.active && APP.tutorial.step >= 0 ? BUILD_ORDER[APP.tutorial.step] || null : null;
  }
  const BUILD_BASE = {
    wood: 380,
    food: 340,
    stone: 290,
    iron: 250
  };
  const BUILD_MOD = {
    castle: 2.4,
    wall: 1.7,
    hospital: 1.1,
    camp: 1.0,
    barracks: 1.2,
    research: 1.25,
    embassy: 1.0,
    hideout: .85,
    farm: .75,
    lumber: .8,
    stone: .9,
    iron: 1.0
  };
  const BUILD_NAMES = Object.fromEntries(BUILDINGS.map(b => [b.id, b.name]));
  BUILD_NAMES.wall = "دیوار قلعه";
  const POWER_WEIGHT = {
    castle: 22,
    wall: 12,
    barracks: 14,
    research: 10,
    hospital: 8,
    camp: 7,
    embassy: 6,
    hideout: 4,
    farm: 4,
    lumber: 4,
    stone: 4,
    iron: 5
  };
  function buildingPower(level, id = "farm") {
    return level <= 0 ? 0 : Math.round(12_000_000 * (POWER_WEIGHT[id] || 4) / 100 * Math.pow(level / 20, 1.8));
  }
  // منابع سقف انبار ندارند؛ اعتبارسنجی عدد فقط برای سلامت داده ذخیره‌شده است.

  // اقتصاد، زمان ساخت و پیش‌نیاز ارتقا
  function buildingCost(building, targetLevel) {
    const factor = BUILD_MOD[building.id] || 1;
    const scale = Math.pow(Math.max(1, targetLevel), 2.2) * factor;
    return Object.fromEntries(Object.entries(BUILD_BASE).map(([k, v]) => [k, Math.round(v * scale)]));
  }
  const TIME_WEIGHT = {
    castle: 2.3,
    wall: 1.45,
    barracks: 1.55,
    research: 1.45,
    hospital: 1.2,
    camp: 1.1,
    embassy: 1.05,
    hideout: .8,
    farm: .65,
    lumber: .75,
    stone: .85,
    iron: .95
  };
  function buildingDuration(level, id = "farm") {
    return Math.round(Math.max(15000, 45_000 * (TIME_WEIGHT[id] || 1) * Math.pow(1.46, Math.max(0, level - 1))));
  }
  function formatDuration(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const days = Math.floor(total / 86400),
      hours = Math.floor(total % 86400 / 3600),
      minutes = Math.floor(total % 3600 / 60),
      seconds = total % 60;
    if (days) return `${days} روز ${hours} ساعت`;
    if (hours) return `${hours} ساعت ${minutes} دقیقه`;
    if (minutes) return `${minutes} دقیقه ${seconds} ثانیه`;
    return `${seconds} ثانیه`;
  }
  function buildingById(id) {
    return id === "wall" ? {
      id: "wall",
      name: "دیوار قلعه",
      level: APP.wallLevel ?? 0,
      q: 0,
      r: 0,
      width: TERRITORY.wallWidth,
      height: TERRITORY.wallHeight
    } : state.buildings.find(b => b.id === id);
  }
  function buildingRequirement(building) {
    const next = building.level + 1;
    if (building.level >= 20) return {
      ok: false,
      text: "این ساختمان به بالاترین سطح رسیده است."
    };
    const castleLevel = state.buildings.find(b => b.id === "castle")?.level || 1;
    if (building.id !== "castle" && next > castleLevel) return {
      ok: false,
      text: `ابتدا قلعه را به سطح ${next} برسانید.`
    };
    if (building.id === "castle") {
      const required = next - 2;
      const ok = next === 2 || state.buildings.filter(b => b.id !== "castle").every(b => b.level >= required) && APP.wallLevel >= required;
      const text = `پیش‌نیاز: تمام ساختمان‌ها حداقل سطح ${required} باشند.`;
      return {
        ok,
        text: ok ? "پیش‌نیازهای ارتقای قلعه تکمیل است." : text
      };
    }
    return {
      ok: true,
      text: "پیش‌نیازها تکمیل است."
    };
  }
  // توان کل نیروهای متعلق به بازیکن، شامل لشکر اعزامی است و با اعزام کاهش کاذب ندارد.
  function totalArmyPower() {
    const units = APP.army.units || {},
      known = Object.values(units).reduce((sum, n) => sum + n, 0),
      ready = Object.entries(TROOPS).reduce((sum, [id, t]) => sum + (units[id] || 0) * troopStats(id).power, 0) * Math.min(1, APP.army.troops / Math.max(1, known)) + Math.max(0, APP.army.troops - known) * 80;
    const deployed = APP.marches.filter(m => m.enemyId && !m.troopsRestored).reduce((sum, m) => sum + (m.combatPower || m.troops * 80) / (1 + APP.research.level * .01) * Math.max(0, m.troops - (m.lostTroops || 0)) / Math.max(1, m.troops), 0);
    const wounded = Object.entries(woundedStock()).reduce((sum, [id, n]) => sum + (TROOPS[id] ? troopStats(id).power * n : 0), 0);
    const healing = Object.entries(APP.army.healing?.units || (APP.army.healing ? {
      [APP.army.healing.type]: APP.army.healing.count
    } : {})).reduce((sum, [id, n]) => sum + (TROOPS[id] ? troopStats(id).power * n : 0), 0);
    return Math.round(ready + deployed + wounded + healing);
  }
  function updatePower() {
    const branchPower = TROOP_LINES.reduce((sum, l) => {
      const r = researchLine(l.id);
      return sum + (r.attack + r.defense + r.health) * 1200 + (r.tier - 1) * 5000;
    }, 0);
    APP.resources.power = branchPower + state.buildings.reduce((sum, b) => sum + buildingPower(b.level, b.id), 0) + buildingPower(APP.wallLevel ?? 0, "wall") + totalArmyPower() + APP.research.level * 100000;
    APP.peakPower = Math.max(APP.peakPower, APP.resources.power);
    updateTopHud();
  }
  const SAVE_KEY = "romaniaTerritoryV4";
  const validObject = value => value && typeof value === "object" && !Array.isArray(value);
  const boundedInteger = (value, fallback, min, max) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
  let lastEconomyTick = Date.now();
  function localDayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function ensureMissionDay() {
    const day = localDayKey();
    if (APP.missions.day === day) return false;
    APP.missions.day = day;
    APP.missions.dailyCollected = 0;
    APP.missions.inspected = false;
    for (const field of ["upgrades", "trained", "healed", "productionUsed", "buildSpeedUsed", "troopSpeedUsed", "healSpeedUsed"]) APP.missions[field] = 0;
    APP.missions.claimedDaily = [];
    return true;
  }
  // پیشرفت و ترتیب معتبر دریافت مأموریت‌ها
  function missionProgress(mission) {
    if (mission.buildingId) return APP.tutorialSkipped && mission.id.startsWith("tutorial-") ? mission.target : buildingById(mission.buildingId)?.level || 0;
    switch (mission.id) {
      case "tutorial-train":
        return APP.tutorialSkipped ? 100 : APP.army.totalTrained || 0;
      case "tutorial-heal":
        return APP.tutorialSkipped ? 10 : APP.army.totalHealed || 0;
      case "login":
        return 1;
      case "tutorial-finish":
        return APP.tutorial.active ? 0 : 1;
      case "upgrade":
        return APP.missions.upgrades;
      case "heal":
        return APP.missions.healed;
      case "train":
        return APP.missions.trained;
      case "production":
        return APP.missions.productionUsed;
      case "build-speed":
        return APP.missions.buildSpeedUsed;
      case "troop-speed":
        return APP.missions.troopSpeedUsed;
      case "heal-speed":
        return APP.missions.healSpeedUsed;
      default:
        return 0;
    }
  }
  function missionUnlocked(tab, mission) {
    if (tab !== "growth") return true;
    const i = MISSION_DATA.growth.indexOf(mission);
    return i === 0 || missionClaims(tab).includes(MISSION_DATA.growth[i - 1].id);
  }
  function missionReady(tab, mission) {
    return !missionClaims(tab).includes(mission.id) && missionUnlocked(tab, mission) && missionProgress(mission) >= mission.target;
  }
  function updateMissionStatus() {
    const label = document.getElementById("missionStatusText");
    const badge = document.getElementById("missionBadge");
    const status = document.getElementById("missionStatus");
    if (!label) return;
    const tabs = tutorialRewardsPending() ? ["tutorial"] : APP.tutorial.active ? ["tutorial"] : ["growth", "daily"];
    const claimable = tabs.flatMap(tab => MISSION_DATA[tab].filter(m => missionReady(tab, m)));
    if (badge) {
      badge.textContent = String(claimable.length);
      badge.hidden = !claimable.length;
    }
    status?.classList.toggle("has-claims", claimable.length > 0);
    if (APP.tutorial.active || tutorialRewardsPending()) {
      const target = buildingById(tutorialTargetId());
      const action = target?.level > 0 ? "ارتقا" : "ساخت";
      label.textContent = claimable.length ? `${claimable.length} پاداش آموزش آماده است` : target ? `${APP.worker.task?.id === target.id ? "در حال " : ""}${action} ${target.name}` : "آموزش قلمرو";
      return;
    }
    const next = MISSION_DATA.growth.find(m => !missionClaims("growth").includes(m.id) && missionUnlocked("growth", m));
    label.textContent = next ? missionProgress(next) >= next.target ? `دریافت پاداش: ${next.title}` : next.title : "همه مأموریت‌ها انجام شد";
  }
  function missionClaims(tab) {
    return tab === "tutorial" ? APP.missions.claimedTutorial : tab === "growth" ? APP.missions.claimedGrowth : APP.missions.claimedDaily;
  }
  function tutorialRewardsPending() {
    return MISSION_DATA.tutorial.some(m => !APP.missions.claimedTutorial.includes(m.id));
  }
  function recordCollected(amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    ensureMissionDay();
    APP.missions.collectedTotal = Math.min(1_000_000_000, APP.missions.collectedTotal + amount);
    APP.missions.dailyCollected = Math.min(1_000_000_000, APP.missions.dailyCollected + amount);
    updateMissionStatus();
  }
  function recordBuildingInspection() {
    if (ensureMissionDay() || !APP.missions.inspected) {
      APP.missions.inspected = true;
      saveGameProgress();
      updateMissionStatus();
    }
  }
  function claimMission(tab, id) {
    ensureMissionDay();
    if ((APP.tutorial.active || tutorialRewardsPending()) && tab !== "tutorial") return false;
    if (!APP.tutorial.active && !tutorialRewardsPending() && tab === "tutorial") return false;
    const mission = MISSION_DATA[tab]?.find(item => item.id === id);
    if (!mission) return false;
    const claimed = missionClaims(tab);
    if (claimed.includes(id) || missionProgress(mission) < mission.target) return false;
    if (tab === "growth" && MISSION_DATA.growth.indexOf(mission) > 0 && !claimed.includes(MISSION_DATA.growth[MISSION_DATA.growth.indexOf(mission) - 1].id)) return false;
    if (!applyMissionReward(mission.reward)) return false;
    claimed.push(id);
    playRewardEffect(mission.reward);
    saveGameProgress();
    updateTopHud();
    updateMissionStatus();
    if (!APP.claimingAll) renderMissions(tab);
    return true;
  }
  function applyMissionReward(reward) {
    if (reward.resources) {
      for (const [resource, amount] of Object.entries(reward.resources)) APP.resources[resource] += amount;
      for (const {
        id,
        count
      } of reward.items || []) {
        const item = INVENTORY.find(x => x.id === id);
        if (item) item.count += count;
      }
      return true;
    }
    if (reward.resource) {
      APP.resources[reward.resource] += reward.amount;
    } else {
      const item = INVENTORY.find(entry => entry.id === reward.item);
      if (!item) return false;
      item.count += reward.amount;
    }
    return true;
  }
  // ذخیره‌سازی و مهاجرت داده‌های محلی
  function saveGameProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 4,
        territoryLayoutVersion: TERRITORY_LAYOUT_VERSION,
        home: APP.home,
        enemyDefeated: APP.enemyDefeated,
        collectors: APP.collectors,
        battleReports: APP.battleReports,
        enemyPositions: Object.values(APP.enemyMoves),
        spawnEmpire: APP.spawnEmpire,
        rulesAcceptedAt: APP.rulesAcceptedAt || 0,
        alliance: APP.alliance,
        eventEmpire: APP.eventEmpire,
        marches: APP.marches.map(({
          reverseRoute,
          ...march
        }) => march),
        savedAt: Date.now(),
        lastEconomyAt: lastEconomyTick,
        buildings: state.buildings.map(({
          id,
          level,
          q,
          r
        }) => ({
          id,
          level,
          q,
          r
        })),
        wallLevel: APP.wallLevel,
        worker: APP.worker,
        secondBuilder: APP.secondBuilder,
        worker2: APP.worker2,
        research: APP.research,
        preferences: APP.preferences,
        skins: APP.skins,
        tutorial: APP.tutorial,
        tutorialSkipped: APP.tutorialSkipped,
        missions: APP.missions,
        inventory: INVENTORY.map(({
          id,
          count
        }) => ({
          id,
          count
        })),
        stamina: APP.stamina,
        staminaAt: APP.staminaAt,
        shieldUntil: APP.shieldUntil,
        productionBoostUntil: APP.productionBoostUntil,
        army: APP.army,
        accountCreatedAt: APP.accountCreatedAt,
        peakPower: APP.peakPower,
        kills: APP.kills,
        peakKills: APP.peakKills,
        resources: Object.fromEntries(["wood", "food", "stone", "iron", "gold"].map(k => [k, APP.resources[k]]))
      }));
    } catch (error) {
      console.warn("Romania: unable to save progress", error);
    }
  }
  function loadGameProgress() {
    try {
      let saved = readStoredObject(SAVE_KEY);
      const migrating = !saved;
      if (migrating) {
        try {
          saved = JSON.parse(localStorage.getItem("romaniaProgressV3") || "null");
        } catch {
          saved = null;
        }
        let legacyResources = null;
        try {
          legacyResources = JSON.parse(localStorage.getItem("romaniaResourcesV2") || "null");
        } catch {}
        if (validObject(legacyResources)) saved = {
          ...(validObject(saved) ? saved : {}),
          resources: legacyResources
        };
      }
      if (!validObject(saved) || !migrating && saved.version !== 4) return;
      if (validObject(saved.home) && Number.isInteger(saved.home.q) && Number.isInteger(saved.home.r) && saved.home.q >= 1 && saved.home.q <= 800 && saved.home.r >= 1 && saved.home.r <= 800) APP.home = {
        q: saved.home.q,
        r: saved.home.r
      };
      if (validObject(saved.enemyDefeated)) APP.enemyDefeated = Object.fromEntries(Object.entries(saved.enemyDefeated).filter(([id, time]) => typeof id === "string" && Number.isFinite(time) && time > 0));
      if (validObject(saved.collectors)) for (const id of ["farm", "lumber", "stone", "iron"]) if (validObject(saved.collectors[id])) APP.collectors[id] = {
        amount: Number.isFinite(saved.collectors[id].amount) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, saved.collectors[id].amount)) : 0,
        at: boundedInteger(saved.collectors[id].at, Date.now(), 0, Date.now()),
        collectedAt: boundedInteger(saved.collectors[id].collectedAt, Date.now(), 0, Date.now())
      };
      APP.battleReports = Array.isArray(saved.battleReports) ? saved.battleReports.filter(r => r && r.tab === "attack" && typeof r.text === "string").slice(0, 100) : [];
      APP.unreadMail = APP.battleReports.filter(r => !r.read).length;
      APP.savedEnemyPositions = Array.isArray(saved.enemyPositions) ? saved.enemyPositions : [];
      APP.enemyMoves = Object.fromEntries(APP.savedEnemyPositions.filter(e => e && typeof e.id === "string").map(e => [e.id, e]));
      if (enemiesReady) applySavedEnemyPositions();
      APP.secondBuilder = saved.secondBuilder === true;
      if (APP.secondBuilder && validObject(saved.worker2?.task)) {
        const b = buildingById(saved.worker2.task.id),
          target = saved.worker2.task.target;
        if (b && Number.isInteger(target) && target >= 1 && target <= 20) APP.worker2 = {
          task: {
            id: b.id,
            name: b.name,
            action: "ارتقای",
            target,
            startedAt: boundedInteger(saved.worker2.task.startedAt, Date.now(), 0, Date.now()),
            cost: buildingCost(b, target)
          },
          endsAt: boundedInteger(saved.worker2.endsAt, Date.now(), 0, Date.now() + 604800000)
        };
      }
      if (validObject(saved.research)) {
        APP.research.level = boundedInteger(saved.research.level, 0, 0, 20);
        APP.research.lines = Object.fromEntries(TROOP_LINES.map(line => [line.id, {
          unlocked: saved.research.lines?.[line.id]?.unlocked === true || ["sword", "guard"].includes(line.id),
          attack: boundedInteger(saved.research.lines?.[line.id]?.attack, 0, 0, 20),
          defense: boundedInteger(saved.research.lines?.[line.id]?.defense, 0, 0, 20),
          health: boundedInteger(saved.research.lines?.[line.id]?.health, 0, 0, 20),
          tier: boundedInteger(saved.research.lines?.[line.id]?.tier, 1, 1, 3)
        }]));
        APP.research.tabletsEarned = boundedInteger(saved.research.tabletsEarned, buildingById("castle").level, 0, 20);
        APP.research.tabletsSpent = boundedInteger(saved.research.tabletsSpent, 0, 0, 20);
        const t = saved.research.task;
        if (validObject(t) && t.line && TROOP_LINES.some(l => l.id === t.line) && ["attack", "defense", "health", "tier"].includes(t.stat)) APP.research.task = {
          ...t,
          target: boundedInteger(t.target, 1, 1, t.stat === "tier" ? 3 : 20),
          startedAt: boundedInteger(t.startedAt, Date.now(), 0, Date.now()),
          endsAt: boundedInteger(t.endsAt, Date.now(), 0, Date.now() + 604800000)
        };else if (validObject(t) && t.target === APP.research.level + 1) APP.research.task = {
          target: t.target,
          startedAt: boundedInteger(t.startedAt, Date.now(), 0, Date.now()),
          endsAt: boundedInteger(t.endsAt, Date.now(), 0, Date.now() + 604800000)
        };
      }
      APP.spawnEmpire = EMPIRES.some(e => e.id === saved.spawnEmpire) ? saved.spawnEmpire : "free";
      if (validObject(saved.alliance)) APP.alliance = {
        name: String(saved.alliance.name || ""),
        empireId: EMPIRES.some(e => e.id === saved.alliance.empireId) ? saved.alliance.empireId : null,
        logo: safeAssetPath(saved.alliance.logo) || null
      };
      APP.eventEmpire = EMPIRES.some(e => e.id === saved.eventEmpire) ? saved.eventEmpire : null;
      const validMapPoint = p => validObject(p) && Number.isInteger(p.q) && Number.isInteger(p.r) && p.q >= 1 && p.q <= 800 && p.r >= 1 && p.r <= 800;
      if (Array.isArray(saved.marches)) APP.marches = saved.marches.slice(0, WORLD.marchSlots).filter(m => validObject(m) && ["attack", "spy", "camp", "reinforce"].includes(m.type) && ["outbound", "waiting", "returning"].includes(m.phase) && validMapPoint(m.origin) && validMapPoint(m.target) && Array.isArray(m.route) && m.route.length > 0 && m.route.length <= 30000 && m.route.every((p, i) => validMapPoint(p) && (!i || mapDistance(p, m.route[i - 1]) === 1 || i === m.route.length - 1 && mapDistance(p, m.route[i - 1]) === 0 && Number.isFinite(p.wx) && Number.isFinite(p.wy)) && (p.wx === undefined || Number.isFinite(p.wx) && Number.isFinite(p.wy) && Math.hypot(p.wx - mapCenter(p.q, p.r)[0], p.wy - mapCenter(p.q, p.r)[1]) <= 18)) && [m.startedAt, m.arriveAt, m.travelMs, m.returnAt].every(Number.isFinite)).map(m => ({
        ...m,
        id: String(m.id),
        unitCounts: m.unitCounts ? migrateUnitStock(m.unitCounts) : undefined,
        name: String(m.name)
      }));
      if (Array.isArray(saved.buildings)) saved.buildings.forEach(item => {
        if (!validObject(item)) return;
        const b = state.buildings.find(x => x.id === item.id);
        if (b) b.level = boundedInteger(item.level, b.level, b.id === "castle" ? 1 : 0, 20);
      });
      if (Array.isArray(saved.buildings)) {
        const positions = state.buildings.map(building => {
          const item = saved.buildings.find(entry => validObject(entry) && entry.id === building.id);
          return {
            building,
            q: item?.q ?? building.q,
            r: item?.r ?? building.r
          };
        });
        const validPositions = positions.every(({
          building,
          q,
          r
        }) => Number.isInteger(q) && Number.isInteger(r) && (building.id === "castle" ? q === building.q && r === building.r : footprintFits(building, q, r))) && positions.every((a, index) => positions.slice(index + 1).every(b => !buildingsOverlap(a.building, a.q, a.r, b.building, b.q, b.r)));
        if (saved.territoryLayoutVersion === TERRITORY_LAYOUT_VERSION && validPositions) positions.forEach(({
          building,
          q,
          r
        }) => {
          building.q = q;
          building.r = r;
        });
        else state.buildings.forEach(building => { [building.q, building.r] = TERRITORY_LAYOUT[building.id]; });
      }
      if (APP.worker2.task && APP.worker2.task.target !== buildingById(APP.worker2.task.id)?.level + 1) APP.worker2 = {
        task: null,
        endsAt: 0
      };
      APP.wallLevel = boundedInteger(saved.wallLevel, APP.wallLevel, 0, 20);
      if (validObject(saved.resources)) for (const key of ["wood", "food", "stone", "iron", "gold"]) APP.resources[key] = boundedInteger(saved.resources[key], APP.resources[key], 0, Number.MAX_SAFE_INTEGER);
      if (Array.isArray(saved.inventory)) saved.inventory.forEach(item => {
        if (!validObject(item)) return;
        const inventoryItem = INVENTORY.find(x => x.id === (LEGACY_ITEMS[item.id] || item.id));
        if (inventoryItem) inventoryItem.count = boundedInteger(item.count, inventoryItem.count, 0, 1_000_000);
      });
      if (validObject(saved.tutorial)) {
        APP.tutorial.active = typeof saved.tutorial.active === "boolean" ? saved.tutorial.active : APP.tutorial.active;
        APP.tutorial.step = boundedInteger(saved.tutorial.step, APP.tutorial.step, -1, BUILD_ORDER.length);
        if (typeof saved.tutorial.phase === "string" && ["welcome", "focus", "selected", "panel", "working", "army-training", "army-healing", "ui-tour", "finished"].includes(saved.tutorial.phase)) APP.tutorial.phase = saved.tutorial.phase;
      }
      APP.tutorial.uiIndex = boundedInteger(saved.tutorial?.uiIndex, 0, 0, UI_TOUR.length);
      APP.tutorial.uiComplete = saved.tutorial?.uiComplete === true;
      APP.tutorialSkipped = saved.tutorialSkipped === true;
      APP.stamina = boundedInteger(saved.stamina, APP.stamina, 0, 100);
      APP.staminaAt = boundedInteger(saved.staminaAt, Date.now(), 0, Date.now());
      APP.shieldUntil = boundedInteger(saved.shieldUntil, 0, 0, Number.MAX_SAFE_INTEGER);
      APP.productionBoostUntil = boundedInteger(saved.productionBoostUntil, 0, 0, Number.MAX_SAFE_INTEGER);
      if (validObject(saved.army)) {
        APP.army.totalTrained = boundedInteger(saved.army.totalTrained, 0, 0, 10000000);
        APP.army.totalHealed = boundedInteger(saved.army.totalHealed, 0, 0, 10000000);
        APP.army.practiceWounded = saved.army.practiceWounded === true;
        APP.army.troops = boundedInteger(saved.army.troops, 0, 0, 1_000_000);
        APP.army.wounded = boundedInteger(saved.army.wounded, 0, 0, 1_000_000);
        for (const kind of [...TRAINING_KEYS, "healing"]) {
          APP.army[kind] = null;
          if (!validObject(saved.army[kind])) continue;
          const value = saved.army[kind];
          APP.army[kind] = {
            count: boundedInteger(value.count, 0, 1, 1000000),
            type: legacyTroopId(value.type),
            cost: boundedInteger(value.cost, 0, 0, 100000000),
            units: validObject(value.units) ? migrateUnitStock(value.units) : null,
            startedAt: boundedInteger(value.startedAt, Date.now(), 0, Date.now()),
            duration: boundedInteger(value.duration, 3600000, 1, Number.MAX_SAFE_INTEGER),
            endsAt: boundedInteger(value.endsAt, 0, 0, Number.MAX_SAFE_INTEGER)
          };
          if (!APP.army[kind].count) APP.army[kind] = null;
        }
      }
      if (validObject(saved.army?.units)) APP.army.units = migrateUnitStock(saved.army.units);
      if (!saved.research?.lines) for (const id of ["archer", "knight"]) if ((APP.army.units?.[id] || 0) > 0 || saved.army?.training?.type === id) researchLine(id).unlocked = true;
      APP.army.woundedUnits = validObject(saved.army?.woundedUnits) ? migrateUnitStock(saved.army.woundedUnits) : {
        sword: APP.army.wounded
      };
      APP.preferences = {
        quality: saved.preferences?.quality === "performance" ? "performance" : "high",
        sound: saved.preferences?.sound !== false
      };
      APP.skins = {
        avatar: boundedInteger(saved.skins?.avatar, 0, 0, AVATAR_SKINS.length - 1),
        castle: boundedInteger(saved.skins?.castle, 0, 0, CASTLE_SKINS.length - 1)
      };
      APP.accountCreatedAt = boundedInteger(saved.accountCreatedAt, APP.accountCreatedAt, 0, Date.now());
      APP.peakPower = boundedInteger(saved.peakPower, APP.peakPower, 0, Number.MAX_SAFE_INTEGER);
      APP.kills = boundedInteger(saved.kills, 0, 0, 1_000_000_000);
      APP.peakKills = boundedInteger(saved.peakKills, APP.kills, 0, 1_000_000_000);
      if (validObject(saved.missions)) {
        APP.missions.day = typeof saved.missions.day === "string" ? saved.missions.day : "";
        APP.missions.collectedTotal = boundedInteger(saved.missions.collectedTotal, 0, 0, 1_000_000_000);
        APP.missions.dailyCollected = boundedInteger(saved.missions.dailyCollected, 0, 0, 1_000_000_000);
        APP.missions.inspected = saved.missions.inspected === true;
        for (const field of ["upgrades", "trained", "healed", "productionUsed", "buildSpeedUsed", "troopSpeedUsed", "healSpeedUsed"]) APP.missions[field] = boundedInteger(saved.missions[field], 0, 0, 1_000_000);
        const growthClaims = Array.isArray(saved.missions.claimedGrowth) ? saved.missions.claimedGrowth : [];
        const dailyClaims = Array.isArray(saved.missions.claimedDaily) ? saved.missions.claimedDaily : [];
        const tutorialClaims = Array.isArray(saved.missions.claimedTutorial) ? saved.missions.claimedTutorial : [];
        APP.missions.claimedTutorial = MISSION_DATA.tutorial.filter(m => tutorialClaims.includes(m.id)).map(m => m.id);
        APP.missions.claimedGrowth = MISSION_DATA.growth.filter(m => growthClaims.includes(m.id)).map(m => m.id);
        APP.missions.claimedDaily = MISSION_DATA.daily.filter(m => dailyClaims.includes(m.id)).map(m => m.id);
      }
      ensureMissionDay();
      if (validObject(saved.worker) && validObject(saved.worker.task)) {
        const task = saved.worker.task;
        const building = buildingById(task.id);
        const target = boundedInteger(task.target, 0, 1, 20);
        const endsAt = boundedInteger(saved.worker.endsAt, 0, 0, Number.MAX_SAFE_INTEGER);
        if (building && target === building.level + 1 && endsAt > 0 && endsAt <= Date.now() + buildingDuration(target, building.id)) APP.worker = {
          task: {
            id: building.id,
            name: building.name,
            action: building.level ? "ارتقای" : "ساخت",
            target,
            startedAt: boundedInteger(task.startedAt, endsAt - buildingDuration(target, building.id), 0, endsAt),
            cost: buildingCost(building, target)
          },
          endsAt
        };
      }
      const now = Date.now();
      lastEconomyTick = boundedInteger(saved.lastEconomyAt, now, now - 12 * 60 * 60 * 1000, now);
      const grantLegacyTutorialRewards = false;
      updatePower();
      updateMissionStatus();
      if (migrating || grantLegacyTutorialRewards) saveGameProgress();
    } catch (error) {
      console.warn("Romania: unable to load progress", error);
    }
  }
  function startBuildingTask(id) {
    if (APP.tutorial.active && !APP.worker.task && !hasTrainingTasks() && !APP.army.healing && id !== tutorialTargetId()) return;
    const building = buildingById(id);
    if (!building || building.level >= 20 || APP.worker.task?.id === id || APP.worker2.task?.id === id) return;
    if (APP.worker.task) {
      if (APP.secondBuilder && !APP.worker2.task) return startSecondBuild(id);
      return;
    }
    const req = buildingRequirement(building);
    if (!req.ok) {
      showBuildNotice(req.text);
      return;
    }
    const target = building.level + 1;
    const cost = buildingCost(building, target);
    if (!Object.entries(cost).every(([k, v]) => APP.resources[k] >= v)) {
      showBuildNotice("منابع کافی برای این عملیات ندارید.");
      return;
    }
    Object.entries(cost).forEach(([k, v]) => APP.resources[k] -= v);
    const action = building.level === 0 ? "ساخت" : "ارتقای";
    const now = Date.now();
    APP.worker = {
      task: {
        id,
        name: building.name,
        action,
        target,
        startedAt: now,
        cost
      },
      endsAt: now + buildingDuration(target, building.id)
    };
    if (APP.tutorial.active) {
      APP.tutorial.phase = "working";
      document.body.classList.add("tutorial-working");
      hideTutorialCard();
    }
    updateTopHud();
    saveGameProgress();
    openBuildingPanel("upgrade");
    updateBuildingProgress();
    renderMarchQueue(true);
  }
  // تولید منابع و تکمیل صف ساخت
  function tickBuildingTask() {
    const regen = Math.floor(Math.max(0, Date.now() - APP.staminaAt) / 300000);
    if (regen) {
      APP.stamina = Math.min(100, APP.stamina + regen);
      APP.staminaAt += regen * 300000;
      updateTopHud();
    }
    tickArmy();
    tickAdditionalQueues();
    if (enemiesReady) respawnEnemies();
    const now = Date.now();
    const task = APP.worker?.task;
    document.body.classList.toggle("tutorial-working", APP.tutorial.active && !!(APP.worker.task || hasTrainingTasks() || APP.army.healing));
    tickCollectors(now);
    if (!task) return;
    const remaining = APP.worker.endsAt - now;
    document.body.classList.toggle("tutorial-working", APP.tutorial.active && (remaining > 0 || hasTrainingTasks() || APP.army.healing));
    if (remaining > 0) {
      updateBuildingProgress();
      const panel = document.getElementById("marchQueue");
      if (panel?.querySelector('[data-march-tab="territory"].is-active')) {
        const content = panel.querySelector('[data-march-content="territory"]');
        if (content) content.innerHTML = renderTerritoryStatus();
      }
      return;
    }
    const building = buildingById(task.id);
    if (building) {
      if (task.id === "wall") APP.wallLevel = task.target;else building.level = task.target;
      if (task.id === "castle") awardTablets(task.target);
    }
    APP.worker = {
      task: null,
      endsAt: 0
    };
    APP.missions.upgrades++;
    updatePower();
    updateBuildingProgress();
    renderMarchQueue(true);
    const wasSelected = APP.tutorial.active || state.selectedId === task.id;
    if (wasSelected) {
      closePanels();
      hideBuildingActionMenu();
      state.selectedId = null;
    }
    tickCollectors(now);
    syncTutorialProgress();
    drawWorld();
    positionWorldOverlays();
    playUpgradeEffect(task.id);
    updateMissionStatus();
    saveGameProgress();
  }
  // نوار زمان مشترک برای لشکر، کمپ و کارگر؛ متن زمان داخل نوار است.
  function timerProgress(start, end, label = "") {
    const progress = Math.max(0, Math.min(100, (Date.now() - start) / Math.max(1, end - start) * 100));
    return `<span class="queue-progress"><i style="width:${progress}%"></i><b>${label} ${formatDuration(end - Date.now())}</b></span>`;
  }
  // دو کارگر مستقل؛ کارگر دوم فقط با سکه‌های داخل بازی خریداری می‌شود.
  async function buySecondBuilder() {
    if (APP.secondBuilder) return;
    if (APP.resources.gold < 10000) return showBuildNotice("۱۰هزار سکه نیاز است.");
    if (!(await gameConfirm("استخدام دائمی کارگر دوم با ۱۰هزار سکه؟"))) return;
    if (APP.secondBuilder || APP.resources.gold < 10000) return;
    APP.resources.gold -= 10000;
    APP.secondBuilder = true;
    saveGameProgress();
    updateTopHud();
    renderMarchQueue(true);
  }
  function startSecondBuild(id) {
    const b = buildingById(id),
      req = buildingRequirement(b),
      cost = buildingCost(b, b.level + 1);
    if (!req.ok || !Object.entries(cost).every(([k, v]) => APP.resources[k] >= v)) return showBuildNotice("منابع یا پیش‌نیاز کافی نیست.");
    Object.entries(cost).forEach(([k, v]) => APP.resources[k] -= v);
    APP.worker2 = {
      task: {
        id,
        name: b.name,
        target: b.level + 1,
        action: "ارتقای",
        startedAt: Date.now(),
        cost
      },
      endsAt: Date.now() + buildingDuration(b.level + 1, id)
    };
    saveGameProgress();
    updateTopHud();
    openBuildingPanel();
  }
  function positionSecondProgress() {
    if (!state.spriteLayer) return;
    let node = document.getElementById("secondBuildProgress");
    if (!node) {
      node = document.createElement("div");
      node.id = "secondBuildProgress";
      node.className = "second-build-progress";
      state.spriteLayer.appendChild(node);
    }
    const w = APP.worker2;
    node.hidden = !w.task;
    if (!w.task) return;
    const [x, y] = progressAnchor(w.task.id, 108, 38);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.setProperty("--progress-scale", 1 / state.camera.zoom);
    node.innerHTML = timerProgress(w.task.startedAt, w.endsAt);
  }
  function secondaryBuildMarkup() {
    const w = APP.worker2,
      t = w.task;
    return `<div class="upgrade-card">${t.name} · کارگر دوم${timerProgress(t.startedAt, w.endsAt)}<button data-secondary-instant>اتمام آنی · ${instantGold(w.endsAt - Date.now())} سکه</button>${INVENTORY.filter(i => i.count && (i.family === "build" || i.family === "universal")).map(i => `<button data-secondary-speed="${i.id}">${i.name} ×${i.count}</button>`).join("")}<button data-secondary-cancel>لغو و بازگشت ۷۰٪ منابع</button></div>`;
  }
  async function alterSecondBuild(action, id) {
    const w = APP.worker2,
      t = w.task,
      item = INVENTORY.find(i => i.id === id),
      gold = instantGold(w.endsAt - Date.now());
    if (!t) return;
    if (action === "instant" && APP.resources.gold < gold || action === "speed" && !item?.count) return showBuildNotice("موجودی کافی نیست.");
    if (!(await gameConfirm("عملیات کارگر دوم تأیید می‌شود؟"))) return;
    if (APP.worker2.task !== t) return;
    if (action === "cancel") {
      Object.entries(t.cost).forEach(([k, v]) => APP.resources[k] += Math.floor(v * .7));
      APP.worker2 = {
        task: null,
        endsAt: 0
      };
    } else if (action === "instant") {
      if (APP.resources.gold < gold) return;
      APP.resources.gold -= gold;
      w.endsAt = Date.now();
    } else {
      if (!item.count) return;
      item.count--;
      w.endsAt = Math.max(Date.now(), w.endsAt - item.value);
      APP.missions.buildSpeedUsed += item.value / 60000;
    }
    tickAdditionalQueues();
    saveGameProgress();
    updateTopHud();
    openBuildingPanel();
  }
  function renderTerritoryStatus() {
    return `<div class="territory-status-list">${[APP.worker, ...(APP.secondBuilder ? [APP.worker2] : [])].map((w, i) => `<article class="territory-status-card"><span>کارگر ${i + 1}</span><strong>${w.task ? w.task.name : "آماده ساخت"}</strong>${w.task ? timerProgress(w.task.startedAt, w.endsAt) : ""}</article>`).join("")}</div>${APP.secondBuilder ? "" : '<button data-buy-builder>استخدام کارگر دوم · ۱۰٬۰۰۰ سکه</button>'}`;
  }
  // پژوهش ساده نظامی برای آزمایش اقتصاد؛ هر سطح قدرت تحقیق را افزایش می‌دهد.
  async function startResearch() {
    const level = APP.research.level + 1,
      cost = level * 10000;
    if (APP.research.task || level > 20 || buildingById("research").level < level) return showBuildNotice("سطح مرکز تحقیقات کافی نیست.");
    if (!Object.keys(RESOURCE_META).every(k => APP.resources[k] >= cost)) return showBuildNotice("منابع کافی نیست.");
    Object.keys(RESOURCE_META).forEach(k => APP.resources[k] -= cost);
    APP.research.task = {
      target: level,
      startedAt: Date.now(),
      endsAt: Date.now() + 3600000 * level
    };
    saveGameProgress();
    updateTopHud();
    openBuildingPanel("info");
  }
  async function speedResearch(id) {
    const t = APP.research.task,
      item = INVENTORY.find(i => i.id === id),
      cost = t ? instantGold(t.endsAt - Date.now()) : 0;
    if (!t || (id ? !item?.count : APP.resources.gold < cost)) return;
    if (!(await gameConfirm(id ? `استفاده از ${item.name}؟` : `اتمام پژوهش با ${cost} سکه؟`))) return;
    if (APP.research.task !== t || (id ? !item.count : APP.resources.gold < cost)) return;
    if (id) {
      item.count--;
      t.endsAt = Math.max(Date.now(), t.endsAt - item.value);
    } else {
      APP.resources.gold -= cost;
      t.endsAt = Date.now();
    }
    tickAdditionalQueues();
    saveGameProgress();
    updateTopHud();
    openResearch();
  }
  function tickAdditionalQueues() {
    positionSecondProgress();
    const now = Date.now();
    const researchTime = document.getElementById("researchQueueTime"),
      researchProgress = document.getElementById("researchQueueProgress"),
      rt = APP.research.task;
    if (rt && researchTime) researchTime.textContent = formatDuration(Math.max(0, rt.endsAt - now));
    if (rt && researchProgress) researchProgress.value = Math.max(0, now - rt.startedAt);
    const queue = document.getElementById("marchQueue");
    if (queue?.querySelector('[data-march-tab="territory"].is-active')) {
      const content = queue.querySelector('[data-march-content="territory"]');
      if (content) content.innerHTML = renderTerritoryStatus();
    }
    let changed = false;
    if (APP.worker2.task && APP.worker2.endsAt <= now) {
      const t = APP.worker2.task,
        b = buildingById(t.id);
      tickCollectors(now);
      if (t.id === "wall") APP.wallLevel = t.target;else if (b) b.level = t.target;
      if (t.id === "castle") awardTablets(t.target);
      APP.worker2 = {
        task: null,
        endsAt: 0
      };
      APP.missions.upgrades++;
      playUpgradeEffect(t.id);
      changed = true;
    }
    if (APP.research.task && APP.research.task.endsAt <= now) {
      if (APP.research.task.line) researchLine(APP.research.task.line)[APP.research.task.stat] = APP.research.task.target;else APP.research.level = APP.research.task.target;
      APP.research.task = null;
      changed = true;
    }
    if (changed) {
      if (APP.openPage === "research") openResearch();
      updatePower();
      updateMissionStatus();
      saveGameProgress();
      drawWorld();
      positionWorldSprites();
    }
  }
  function playRewardEffect(reward) {
    const layer = document.getElementById("resourceGainLayer");
    const node = document.createElement("div");
    node.className = "quest-reward-pop";
    node.innerHTML = `<b>✦ پاداش دریافت شد</b><span>${Object.entries(reward.resources || {}).map(([id, n]) => `${id === "gold" ? "سکه" : RESOURCE_META[id]?.label || ""} +${formatCompact(n)}`).join(" · ") || "آیتم‌ها به موجودی اضافه شدند"}</span>`;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1100);
  }
  function playUpgradeEffect(id) {
    const building = buildingById(id),
      node = document.createElement("div");
    const [x, y] = id === "wall" ? [TERRITORY.gateX, TERRITORY.gateY] : buildingCenter(building);
    node.className = "upgrade-burst";
    node.innerHTML = "<i></i><b>ارتقا یافت</b><span>✦</span>";
    const place = () => {
      node.style.left = `${stage.clientWidth / 2 + (x - state.camera.x) * state.camera.zoom}px`;
      node.style.top = `${stage.clientHeight / 2 + (y - state.camera.y) * state.camera.zoom}px`;
    };
    place();
    stage.appendChild(node);
    setTimeout(() => node.remove(), 1400);
  }
  function showWelcomeCelebration() {
    document.getElementById("romaniaWelcome")?.remove();
    const node = document.createElement("div");
    node.id = "romaniaWelcome";
    node.className = "romania-welcome";
    node.innerHTML = "<small>آغاز فرمانروایی شما</small><strong>به رومانیا خوش آمدید</strong>";
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2800);
  }
