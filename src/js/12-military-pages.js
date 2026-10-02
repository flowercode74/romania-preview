  // صفحه‌های اختصاصی نظامی؛ همه عملیات از مدل واقعی بازی استفاده می‌کنند.
  function researchLine(id) {
    APP.research.lines ||= {};
    return APP.research.lines[id] ||= {
      unlocked: id === "sword" || id === "guard",
      tier: 1,
      attack: 0,
      defense: 0,
      health: 0
    };
  }
  function awardTablets(level) {
    APP.research.tabletsEarned = Math.max(APP.research.tabletsEarned || 1, Math.min(20, level));
  }
  function availableTablets() {
    awardTablets(buildingById("castle").level);
    return Math.max(0, APP.research.tabletsEarned - (APP.research.tabletsSpent || 0));
  }
  function troopUnlocked(id) {
    const t = TROOPS[id];
    return !!t && researchLine(t.line).unlocked && researchLine(t.line).tier >= t.tier;
  }
  function troopStats(id) {
    const t = TROOPS[id],
      r = researchLine(t.line);
    return {
      ...t,
      attack: Math.round(t.attack * (1 + r.attack * .025)),
      defense: Math.round(t.defense * (1 + r.defense * .025)),
      health: Math.round(t.health * (1 + r.health * .025)),
      power: Math.round(t.power * (1 + (r.attack + r.defense + r.health) * .008))
    };
  }
  function woundedStock() {
    APP.army.woundedUnits ||= {};
    const known = Object.values(APP.army.woundedUnits).reduce((a, b) => a + b, 0);
    if (known < APP.army.wounded) APP.army.woundedUnits.sword = (APP.army.woundedUnits.sword || 0) + APP.army.wounded - known;
    return APP.army.woundedUnits;
  }
  function recordWounded(m) {
    const stock = woundedStock();
    m.casualties = {};
    let left = m.lostTroops || 0;
    for (const [id, n] of Object.entries(migrateUnitStock(m.unitCounts || {
      sword: m.troops
    }))) {
      const take = Math.min(left, n);
      m.casualties[id] = take;
      stock[id] = (stock[id] || 0) + take;
      left -= take;
    }
    APP.army.wounded += m.lostTroops || 0;
  }
  function buildingDetailsMarkup(b) {
    const rate = PRODUCERS[b.id] ? productionRate(b.id) * productionMultiplier(PRODUCERS[b.id]) : 0;
    return `<div class="facility-details panel-stat-grid"><div><small>قدرت فعلی</small><strong>${formatCompact(buildingPower(b.level, b.id))}</strong></div><div><small>حداکثر سطح</small><strong>۲۰</strong></div>${rate ? `<div><small>تولید در ساعت با مزیت فعال</small><strong>${formatCompact(rate)}</strong></div><div><small>ذخیره تا هشت ساعت</small><strong>${formatCompact(rate * 8)}</strong></div>` : ""}${b.id === "camp" ? `<div><small>ظرفیت هر لشکر</small><strong>${formatCompact(marchCapacity())}</strong></div>` : ""}${b.id === "hospital" ? `<div><small>مجروحان آماده درمان</small><strong>${formatCompact(APP.army.wounded)}</strong></div>` : ""}</div>${["hospital", "barracks", "research"].includes(b.id) ? `<button class="panel-primary-button" data-open-facility="${b.id}">${{
      hospital: "ورود به درمان",
      barracks: "ورود به ساخت نیرو",
      research: "ورود به پژوهش"
    }[b.id]}</button>` : ""}`;
  }
  function openFacility(id) {
    hideBuildingActionMenu();
    ({
      barracks: openTraining,
      hospital: openHealing,
      research: openResearch
    })[id]?.();
  }
  function unitCard(id, action = "unit", selected = false) {
    const t = TROOPS[id];
    return `<button class="unit-card ${selected ? "is-selected" : ""}" data-${action}="${id}"><img src="${t.image}" alt=""><strong>${t.name}</strong><small>${action === "unit" ? formatCompact(APP.army.units?.[id] || 0) : troopUnlocked(id) ? t.group === "attack" ? "هجومی" : "دفاعی" : "قفل · پژوهش لازم"}</small></button>`;
  }
  function queueMarkup(kind) {
    const task = APP.army[kind];
    if (!task) return "";
    const remain = Math.max(0, task.endsAt - Date.now());
    return `<section class="military-queue"><strong>${kind === "training" ? "ساخت نیرو" : "درمان"} · ${formatCompact(task.count)} نفر</strong><progress data-army-progress="${kind}" max="${task.duration}" value="${Math.max(0, task.duration - remain)}"></progress><span data-army-timer="${kind}">${formatDuration(remain)}</span><div class="military-actions"><button data-army-instant="${kind}">اتمام آنی · ${instantGold(remain)} سکه</button><button data-cancel-military="${kind}">لغو صف</button></div><div class="unit-carousel">${INVENTORY.filter(i => i.count > 0 && [kind === "training" ? "troop" : "heal", "universal"].includes(i.family)).map(i => `<button data-army-speed="${i.id}" data-queue="${kind}">${i.name}<small>×${i.count}</small></button>`).join("")}</div></section>`;
  }
  let selectedTroop = "sword",
    selectedLine = "sword",
    selectedResearchLine = "sword";
  function bindMilitaryPage() {
    const content = document.getElementById("genericPanelContent");
    content.onclick = async event => {
      const button = event.target.closest("button");
      if (!button) return;
      const d = button.dataset;
      if (d.line) {
        selectedLine = d.line;
        selectedTroop = Object.keys(TROOPS).find(id => TROOPS[id].line === selectedLine);
        return openTraining();
      }
      if (d.choose) {
        selectedTroop = d.choose;
        return openTraining();
      }
      if (d.unit) return openUnit(d.unit);
      if (d.startArmy) return startArmyTask(d.startArmy);
      if (d.armyInstant) return speedArmy(d.armyInstant);
      if (d.armySpeed) return speedArmy(d.queue, d.armySpeed);
      if (d.cancelMilitary) {
        const kind = d.cancelMilitary,
          task = APP.army[kind];
        if (!task || !(await gameConfirm("صف لغو شود؟ ۷۰٪ هزینه بازگردانده می‌شود."))) return;
        if (APP.army[kind] !== task) return;
        APP.resources.food += Math.floor((task.cost || task.count * (kind === "training" ? TROOPS[task.type].cost : 12)) * .7);
        if (kind === "training") APP.resources.iron += Math.floor((task.cost || task.count * TROOPS[task.type].cost) * .7);else {
          const stock = woundedStock();
          for (const [id, n] of Object.entries(task.units || {
            [task.type]: task.count
          })) stock[id] = (stock[id] || 0) + n;
          APP.army.wounded += task.count;
        }
        APP.army[kind] = null;
        saveGameProgress();
        updateTopHud();
        return kind === "training" ? openTraining() : openHealing();
      }
      if (d.healAll !== undefined) {
        for (const input of content.querySelectorAll("[data-heal-count]")) input.value = input.max;
        return updateHealingTotals();
      }
      if (d.researchLine) {
        selectedResearchLine = d.researchLine;
        return openResearch();
      }
      if (d.unlockLine !== undefined) {
        const r = researchLine(selectedResearchLine);
        if (r.unlocked || !availableTablets()) return;
        if (!(await gameConfirm("باز کردن این رسته با یک کتیبه؟"))) return;
        if (r.unlocked || !availableTablets()) return;
        r.unlocked = true;
        APP.research.tabletsSpent = (APP.research.tabletsSpent || 0) + 1;
        saveGameProgress();
        return openResearch();
      }
      if (d.researchStat) return startBranchResearch(selectedResearchLine, d.researchStat);
      if (d.researchInstant !== undefined) return speedResearch();
      if (d.researchSpeed) return speedResearch(d.researchSpeed);
      if (d.facility) return openFacility(d.facility);
      if (d.backProfile !== undefined) return openProfile();
    };
    content.oninput = event => {
      if (event.target.matches?.("[data-heal-count]")) updateHealingTotals();
    };
  }
  function openTraining() { renderTrainingPage(); }
  function openHealing() { renderHealingPage(); }
  function healingSelection() {
    return Object.fromEntries(Array.from(document.querySelectorAll("[data-heal-count]")).map(input => [input.dataset.healCount, Math.max(0, Math.min(Number(input.max) || 0, Math.floor(Number(input.value) || 0)))]));
  }
  function updateHealingTotals() {
    const count = Object.values(healingSelection()).reduce((a, b) => a + b, 0);
    const node = document.getElementById("healingTotals");
    if (node) node.textContent = `انتخاب: ${formatCompact(count)} نفر · هزینه: ${formatCompact(count * 12)} غذا · زمان: ${formatDuration(count * 6000 / (1 + (buildingById("hospital").level - 1) * .04))}`;
  }
  function openUnit(id) {
    const t = troopStats(id),
      stock = APP.army.units?.[id] || 0;
    openPage("unit", `<section class="troop-hero"><img src="${t.image}" alt=""><h2>${t.name}</h2><p>${TROOP_LINES.find(l => l.id === t.line).name} · ${t.group === "attack" ? "هجومی" : "دفاعی"}</p></section><div class="panel-stat-grid">${Object.entries({
      "تعداد آماده": stock,
      "قدرت هر نفر": t.power,
      "حمله": t.attack,
      "دفاع": t.defense,
      "سلامتی": t.health,
      "زمان ساخت پایه (ثانیه)": t.seconds,
      "هزینه غذا و آهن": t.cost
    }).map(([name, n]) => `<div><small>${name}</small><strong>${formatCompact(n)}</strong></div>`).join("")}</div><button data-facility="barracks" class="panel-primary-button">بازگشت به سربازخانه</button>`);
    bindMilitaryPage();
  }
  function openResearch() {
    const line = TROOP_LINES.find(l => l.id === selectedResearchLine),
      r = researchLine(line.id),
      task = APP.research.task;
    openPage("research", `<div class="military-summary"><span>کتیبه <b>${availableTablets()}</b></span><span>سقف دریافت <b>۲۰</b></span></div><div class="line-tabs">${TROOP_LINES.map(l => `<button data-research-line="${l.id}" class="${l.id === line.id ? "is-selected" : ""}"><img src="${l.image}" alt=""><span>${l.name}</span></button>`).join("")}</div><h2 class="tree-title">${line.name}</h2>${!r.unlocked ? `<div class="research-lock"><img src="${line.image}" alt=""><p>برای باز کردن این رسته یک کتیبه لازم است.</p><button data-unlock-line ${availableTablets() ? "" : "disabled"}>باز کردن رسته</button></div>` : `<div class="research-tree"><div class="research-units">${[1, 2, 3].map(tier => `<button class="research-node ${r.tier >= tier ? "is-unlocked" : ""}" data-research-stat="tier" ${r.tier >= tier || tier !== r.tier + 1 ? "disabled" : ""}><img src="${line.image}" alt=""><strong>تخصص ${tier}</strong><small>${r.tier >= tier ? "باز شده" : "پژوهش تخصص"}</small></button>`).join("")}</div><div class="research-branches">${Object.entries({
      attack: "حمله",
      defense: "دفاع",
      health: "سلامتی"
    }).map(([id, name]) => `<button class="research-node" data-research-stat="${id}" ${r[id] >= 20 ? "disabled" : ""}><b>${{
      attack: "⚔",
      defense: "▣",
      health: "♥"
    }[id]}</b><strong>${name}</strong><small>${r[id]}/۲۰ · هر سطح ۲٫۵٪</small></button>`).join("")}</div></div>`}${task ? `<div class="military-queue"><strong>${task.line ? TROOP_LINES.find(l => l.id === task.line)?.name : "پژوهش نظامی"} · سطح ${task.target}</strong>${timerProgress(task.startedAt, task.endsAt)}<span id="researchQueueTime">${formatDuration(Math.max(0, task.endsAt - Date.now()))}</span><progress id="researchQueueProgress" max="${Math.max(1, task.endsAt - task.startedAt)}" value="${Math.max(0, Date.now() - task.startedAt)}"></progress><button data-research-instant>اتمام آنی · ${instantGold(task.endsAt - Date.now())} سکه</button><div class="unit-carousel">${INVENTORY.filter(i => i.count && ["research", "universal"].includes(i.family)).map(i => `<button data-research-speed="${i.id}">${i.name} ×${i.count}</button>`).join("")}</div></div>` : ""}`);
    bindMilitaryPage();
  }
  async function startBranchResearch(line, stat) {
    const r = researchLine(line),
      target = r[stat] + 1,
      max = stat === "tier" ? 3 : 20;
    if (!r.unlocked || APP.research.task || target > max) return showBuildNotice("پژوهش قابل شروع نیست یا صف مشغول است.");
    if (buildingById("research").level < (stat === "tier" ? (target - 1) * 5 : target)) return showBuildNotice("سطح مرکز تحقیقات کافی نیست.");
    const cost = Math.round(1500 * target ** 1.6),
      duration = Math.round(120 * target ** 1.7) * 1000;
    if (!["wood", "food", "stone", "iron"].every(id => APP.resources[id] >= cost)) return showBuildNotice("منابع کافی نیست.");
    if (!(await gameConfirm(`پژوهش سطح ${target} با ${formatCompact(cost)} از هر منبع و زمان ${formatDuration(duration)} آغاز شود؟`))) return;
    if (APP.research.task || r[stat] + 1 !== target || !["wood", "food", "stone", "iron"].every(id => APP.resources[id] >= cost)) return;
    ["wood", "food", "stone", "iron"].forEach(id => APP.resources[id] -= cost);
    APP.research.task = {
      line,
      stat,
      target,
      startedAt: Date.now(),
      endsAt: Date.now() + duration
    };
    saveGameProgress();
    updateTopHud();
    openResearch();
  }
  // انتخاب ظاهر در پرتره بالای صفحه نیز اعمال می‌شود؛ قلعه در هر دو رندر یکسان است.
  function applySkinAppearance() {
    const portrait = document.querySelector(".portrait-image");
    if (portrait) portrait.src = selectedAvatarSkin().portrait;
    if (portrait) portrait.style.filter = "none";
  }
  let cueAudio = null;
  function playInterfaceCue() {
    if (APP.preferences?.sound === false || !state.gameStarted) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      cueAudio ||= new AudioContext();
      cueAudio.resume().catch(() => {});
      const oscillator = cueAudio.createOscillator(),
        gain = cueAudio.createGain();
      oscillator.connect(gain);
      gain.connect(cueAudio.destination);
      oscillator.frequency.setValueAtTime(520, cueAudio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(350, cueAudio.currentTime + .06);
      gain.gain.setValueAtTime(.025, cueAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, cueAudio.currentTime + .07);
      oscillator.start();
      oscillator.stop(cueAudio.currentTime + .08);
    } catch {}
    ;
  }
  // تنظیمات ذخیره‌شونده؛ بخش‌های سروری فقط داده موجود را نشان می‌دهند.
  function openSettings() {
    APP.preferences ||= {
      quality: "high",
      sound: true
    };
    openPage("settings", `<div class="settings-grid">${[["sound", "♫", "صدا", APP.preferences.sound ? "روشن" : "خاموش"], ["quality", "◈", "گرافیک", APP.preferences.quality === "high" ? "کیفیت بالا" : "عملکرد بهتر"], ["account", "♙", "حساب", "میهمان محلی"], ["language", "ع", "زبان", "فارسی"], ["server", "♜", "سرورها", "سرور ۱ · نسخه محلی"], ["terms", "▤", "قوانین", "نمایش اطلاعات"], ["exit", "↪", "خروج", "ذخیره و خروج"]].map(([id, icon, name, value]) => `<button data-setting="${id}"><b>${icon}</b><strong>${name}</strong><small>${value}</small></button>`).join("")}</div><button data-back-profile class="panel-primary-button">بازگشت به پروفایل</button>`);
    document.getElementById("genericPanelContent").onclick = async e => {
      if (e.target.closest("[data-back-profile]")) return openProfile();
      const b = e.target.closest("[data-setting]");
      if (!b) return;
      const id = b.dataset.setting;
      if (id === "sound") APP.preferences.sound = !APP.preferences.sound;else if (id === "quality") {
        APP.preferences.quality = APP.preferences.quality === "high" ? "performance" : "high";
        resizeCanvas();
        state.terrainStamp = "";
      } else if (id === "exit") {
        if (!(await gameConfirm("پیشرفت ذخیره شود و از بازی خارج شوید؟"))) return;
        saveGameProgress();
        window.location?.reload();
        return;
      } else return showBuildNotice({
        account: "حساب فعلی محلی است؛ اتصال سرور هنوز پیاده‌سازی نشده است.",
        language: "زبان این نسخه فارسی است.",
        server: "این نسخه یک سرور محلی دارد.",
        terms: "نسخه آزمایشی رومانیا؛ داده‌ها در همین مرورگر ذخیره می‌شوند. قوانین رسمی سرور باید پیش از انتشار تکمیل شوند."
      }[id]);
      saveGameProgress();
      openSettings();
    };
  }
  function openTroopsOverview() {
    openPage("troops", `<div class="military-summary"><span>نیروهای آماده <b>${formatCompact(APP.army.troops)}</b></span><span>لشکر فعال <b>${APP.marches.length}/${WORLD.marchSlots}</b></span><span>مجروح <b>${formatCompact(APP.army.wounded)}</b></span></div><div class="unit-grid">${Object.keys(TROOPS).filter(id => troopUnlocked(id) || (APP.army.units?.[id] || 0) > 0).map(id => unitCard(id)).join("")}</div><div class="military-actions"><button data-facility="hospital">بیمارستان</button><button data-facility="barracks">ساخت نیرو</button><button data-back-profile>پروفایل</button></div>`);
    bindMilitaryPage();
  }
  function openLeaderboard(metric = null) {
    const players = [{
      id: "own",
      name: "DreaM",
      power: APP.resources.power,
      kills: APP.kills,
      own: true
    }, ...APP.map.castles.filter(c => !c.own)];
    const rankings = metric && metric !== "alliance" ? players.filter(p => Number.isFinite(p[metric])).sort((a, b) => b[metric] - a[metric]) : [];
    openPage("leaderboard", `${metric ? `<button data-rank-back>بازگشت به جدول‌ها</button><h2>${{
      power: "قدرت پادشاهان",
      kills: "کشتار پادشاهان",
      alliance: "قدرت اتحادها"
    }[metric]}</h2>${metric === "alliance" ? '<p class="empty-page">آمار قدرت اتحادها هنوز ثبت نشده است.</p>' : rankings.map((p, i) => `<button class="rank-row" data-rank-player="${escapeHTML(p.id)}"><b>${i + 1}</b><strong>${escapeHTML(p.name)}</strong><span>${formatCompact(p[metric])}</span></button>`).join("")}` : `<p class="panel-copy">رتبه‌بندی داده‌های همین نسخه محلی</p><div class="leaderboard-cards"><button data-rank="alliance">⚑<strong>اتحادهای برتر</strong><small>قدرت اتحاد</small></button><button data-rank="power">♛<strong>پادشاهان برتر</strong><small>قدرت</small></button><button data-rank="kills">⚔<strong>پادشاهان برتر</strong><small>کشتار</small></button></div>`}<button data-back-profile>پروفایل</button>`);
    document.getElementById("genericPanelContent").onclick = e => {
      const rank = e.target.closest("[data-rank]");
      if (rank) return openLeaderboard(rank.dataset.rank);
      if (e.target.closest("[data-rank-back]")) return openLeaderboard();
      if (e.target.closest("[data-back-profile]")) return openProfile();
      const p = e.target.closest("[data-rank-player]");
      if (p) return openProfile(players.find(x => x.id === p.dataset.rankPlayer));
    };
  }
  function openSkins(kind = null, preview = 0) {
    APP.skins ||= {
      avatar: 0,
      castle: 0
    };
    if (kind !== "castle" && kind !== "avatar") kind = null;
    const choices = kind === "castle" ? CASTLE_SKINS : AVATAR_SKINS;
    const images = choices.map(s => s.image || s.avatar);
    const names = choices.map(s => s.name);
    preview = boundedInteger(preview, 0, 0, choices.length - 1);
    openPage("skins", kind ? `<div class="skin-preview skin-${kind} skin-tone-${preview}"><img src="${images[preview]}" alt="${names[preview]}"><h2>${names[preview]}</h2></div><div class="unit-carousel">${images.map((src, i) => `<button data-preview-skin="${i}" class="unit-card skin-tone-${i} ${preview === i ? "is-selected" : ""}"><img src="${src}" alt=""><strong>${names[i]}</strong></button>`).join("")}</div><button class="panel-primary-button" data-apply-skin>انتخاب این ظاهر</button><button data-skin-back>بازگشت</button>` : `<div class="skin-choices"><button data-skin-kind="avatar"><img src="${selectedAvatarSkin().avatar}" alt=""><strong>آواتار</strong></button><button data-skin-kind="castle"><img src="${selectedCastleImage()}" alt=""><strong>قلعه</strong></button></div><button data-back-profile>پروفایل</button>`);
    document.getElementById("genericPanelContent").onclick = async e => {
      const b = e.target.closest("button");
      if (!b) return;
      const d = b.dataset;
      if (d.skinKind) return openSkins(d.skinKind, APP.skins[d.skinKind] || 0);
      if (d.previewSkin !== undefined) return openSkins(kind, Number(d.previewSkin));
      if (d.skinBack !== undefined) return openSkins();
      if (d.backProfile !== undefined) return openProfile();
      if (d.applySkin !== undefined && kind && (await gameConfirm("این ظاهر انتخاب شود؟"))) {
        APP.skins[kind] = preview;
        applySkinAppearance();
        saveGameProgress();
        drawWorld();
        if (APP.currentMode === "map") applyMapCamera();
        showBuildNotice("ظاهر انتخاب شد.");
      }
    };
  }
  // گزارش نبرد از عکس فوری ترکیب و تلفات ساخته می‌شود و با تغییر موجودی عوض نمی‌شود.
  function openBattleReport(id) {
    const r = APP.battleReports.find(r => r.id === id);
    if (!r) return;
    const survivor = Math.max(0, r.sent - (r.wounded || 0)),
      defender = r.defender || {};
    openPage("battle", `<header class="battle-heading ${r.result === "پیروزی" ? "is-victory" : "is-defeat"}"><h2>${escapeHTML(r.title)}</h2><time>${escapeHTML(r.time)}</time><span dir="ltr">X:${escapeHTML(r.target?.q ?? "—")} Y:${escapeHTML(r.target?.r ?? "—")}</span></header><div class="battle-versus"><article><img src="${selectedAvatarSkin().portrait}" alt=""><strong>DreaM</strong><span>قدرت ${formatCompact(r.combatPower || 0)}</span><small>اعزام ${formatCompact(r.sent || 0)}</small></article><b>VS</b><article><img src="${safeAssetPath(defender.image, "assets/enemies/viking.webp")}" alt=""><strong>${escapeHTML(defender.name || "سرگردان")}</strong><span>قدرت ${formatCompact(defender.power || 0)}</span><small>سطح ${escapeHTML(defender.level || "—")}</small></article></div><div class="battle-stat-grid"><span>نیروهای اعزامی<strong>${formatCompact(r.sent || 0)}</strong></span><span>مجروح<strong>${formatCompact(r.wounded || 0)}</strong></span><span>بازمانده<strong>${formatCompact(survivor)}</strong></span></div><h3>غنیمت</h3><div class="battle-loot">${Object.entries(r.rewards || {}).filter(([id]) => RESOURCE_META[id]).map(([id, n]) => `<span><img src="${RESOURCE_META[id].image}" alt="">${formatCompact(n)}</span>`).join("")}${r.coin ? `<span>✦ ${formatCompact(r.coin)} سکه</span>` : ""}</div><p>${(Array.isArray(r.items) ? r.items : []).map(escapeHTML).join("، ")}</p><h3>گزارش نیروها</h3><div class="battle-table-wrap"><table class="battle-table"><thead><tr><th>نیرو</th><th>اعزام</th><th>مجروح</th><th>بازمانده</th></tr></thead><tbody>${Object.entries(r.units || {}).filter(([id, n]) => TROOPS[id] && n > 0).map(([id, n]) => `<tr><th>${TROOPS[id].name}</th><td>${n}</td><td>${escapeHTML(r.casualties?.[id] ?? "—")}</td><td>${r.casualties ? Math.max(0, n - (r.casualties[id] || 0)) : "—"}</td></tr>`).join("")}</tbody></table></div><p class="panel-copy">در منطق فعلی نبرد، تلفات به بیمارستان منتقل می‌شوند؛ آمار کشتهٔ جداگانه ثبت نمی‌شود.</p><button id="backReports">بازگشت به گزارش‌ها</button>`);
    document.getElementById("backReports")?.addEventListener("click", () => openMessages());
  }
  document.addEventListener("click", event => {
    if (event.target.closest("button:not(:disabled)")) playInterfaceCue();
  }, {
    passive: true
  });
