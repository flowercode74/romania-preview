  function trainingRoleIcon(role) {
    const paths = {
      spear: '<path d="M5 21 17 9m-3 2 3 3M17 9l-1-6 5 1-4 5Z"/>',
      bow: '<path d="M6 3c13 3 13 15 0 18L11 12 6 3Zm-3 9h18m-4-3 4 3-4 3"/>',
      cavalry: '<path d="M5 21h14l-2-5c2-4 1-8-2-11V2l-4 3-5 5 2 3 4-2-1 5-6 5Zm9-13h.01"/>',
      special: '<path d="m5 21 9-9m-3-3 5 5m-5-5 4-5 5 5-4 5-5-5ZM3 4l2-2m-2 9h3m14 10v-3"/>'
    };
    return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[role] || paths.spear}</svg>`;
  }
  let trainingGroup = "attack", trainingRole = "spear", trainingSlot = 0;
  let trainingCount = 100, trainingOverlay = null;
  function trainingUnit() {
    return TROOP_LINES.find(t => t.group === trainingGroup && t.role === trainingRole) || TROOP_LINES[0];
  }
  function trainingLimit(unit = trainingUnit()) {
    return Math.min(trainingCapacity(), Math.floor(APP.resources.food / unit.cost), Math.floor(APP.resources.iron / unit.cost));
  }
  function trainingDuration(count, unit = trainingUnit()) {
    return Math.round(count * unit.seconds * 1000 / (1 + Math.max(0, buildingById("barracks").level - 1) * .04));
  }
  function trainingDialogMarkup(unit, key, overlay = trainingOverlay, queueName = "صف " + (trainingSlot + 1), family = "troop") {
    if (!overlay) return "";
    const role = UNIT_ROLES.find(r => r.id === unit.role), stats = troopStats(unit.id);
    let body = "", title = "";
    if (overlay === "stats") {
      title = "آمار " + unit.name;
      body = `<div class="training-stats">${[["قدرت", stats.power, 150], ["حمله", stats.attack, 80], ["دفاع", stats.defense, 80], ["سلامتی", stats.health, 300], ["سرعت", stats.speed, 260], ["ظرفیت حمل", stats.capacity, 15]].map(([label, value, max]) => `<article><span>${label}</span><strong>${formatCompact(value)}</strong><i><b style="width:${Math.min(100, value / max * 100)}%"></b></i></article>`).join("")}</div><p class="training-dialog-note">زمان پایه آموزش: ${unit.seconds} ثانیه · غذا و آهن: ${unit.cost} از هر منبع</p>`;
    } else if (overlay === "counters") {
      title = "تقابل رسته‌ها";
      body = `<div class="counter-center"><span>${trainingRoleIcon(role.id)}</span><strong>${role.name}</strong></div><div class="counter-grid">${UNIT_ROLES.filter(r => r.id !== role.id).map(r => {const value = troopCounterMultiplier(role.id, r.id); return `<article class="${value > 1 ? "counter-strong" : value < 1 ? "counter-weak" : "counter-neutral"}"><span>${trainingRoleIcon(r.id)}</span><strong>${r.name}</strong><small>${value > 1 ? "قوی در مقابل · ۲۵٪ برتری" : value < 1 ? "ضعیف در مقابل · ۲۰٪ کاهش" : "تقابل برابر"}</small></article>`;}).join("")}</div><p class="training-dialog-note">کمان بر سوارکار، سوارکار بر نیزه، نیزه بر ویژه و ویژه بر کمان برتری دارد.<br>این تقابل‌ها برای هر دو دسته یکسان‌اند.</p>`;
    } else if (overlay === "speed") {
      title = "تسریع " + queueName;
      body = `<div class="training-speed-items">${INVENTORY.filter(i => i.count > 0 && [family, "universal"].includes(i.family)).map(i => `<button data-training-speed="${i.id}"><img src="${i.image}" alt=""><span>${i.name}</span><small>×${i.count}</small></button>`).join("") || '<p>آیتم تسریع در موجودی ندارید.</p>'}</div>`;
    }
    return `<div class="training-dialog-backdrop"><button class="training-dialog-dismiss" data-training-close aria-label="بستن پنجره جزئیات"></button><section class="training-dialog" role="dialog" aria-modal="true" aria-label="${title}"><header><h3>${title}</h3><button data-training-close aria-label="بستن جزئیات">×</button></header>${body}</section></div>`;
  }
  function renderTrainingPage() {
    const unit = trainingUnit(), key = TRAINING_KEYS[trainingSlot], task = APP.army[key];
    selectedTroop = unit.id; selectedLine = unit.id;
    const limit = trainingLimit(unit);
    trainingCount = Math.max(1, Math.min(trainingCount, Math.max(1, limit)));
    const remain = Math.max(0, (task?.endsAt || 0) - Date.now());
    const groupName = trainingGroup === "attack" ? "هجومی" : "دفاعی";
    openPage("training", `<section class="training-screen"><img class="training-art" src="${unit.image}" alt="${unit.name}"><div class="training-vignette"></div><div class="training-title"><small>${BUILD_NAMES.barracks} · سطح ${buildingById("barracks").level}</small><h2>${unit.name}</h2><span>${groupName} · ${formatCompact(APP.army.units?.[unit.id] || 0)} نیروی آماده</span></div><aside class="training-info-buttons"><button data-training-panel="counters" aria-label="دیدن تقابل رسته‌ها">⇄</button><button data-training-panel="stats" aria-label="دیدن آمار نیرو">i</button></aside><div class="training-controls"><nav class="training-groups" aria-label="دسته نیرو"><button data-training-group="attack" class="${trainingGroup === "attack" ? "is-selected" : ""}">هجومی</button><button data-training-group="defense" class="${trainingGroup === "defense" ? "is-selected" : ""}">دفاعی</button></nav><nav class="training-roles" aria-label="رسته نیرو">${UNIT_ROLES.map(r => `<button data-training-role="${r.id}" class="${trainingRole === r.id ? "is-selected" : ""}"><b>${trainingRoleIcon(r.id)}</b><span>${r.name}</span></button>`).join("")}</nav><div class="training-unit-cards">${TROOP_LINES.filter(t => t.group === trainingGroup).map(t => `<button data-training-unit="${t.id}" class="${unit.id === t.id ? "is-selected" : ""}"><img src="${t.image}" alt=""><span>${t.name}</span><small>${formatCompact(APP.army.units?.[t.id] || 0)}${troopUnlocked(t.id) ? "" : " · قفل پژوهش"}</small></button>`).join("")}</div><nav class="training-slots" aria-label="صف‌های آموزش">${TRAINING_KEYS.map((k, i) => `<button data-training-slot="${i}" class="${trainingSlot === i ? "is-selected" : ""}"><strong>صف ${i + 1}</strong><small>${APP.army[k] ? formatCompact(APP.army[k].count) + " در حال آموزش" : "آماده · " + formatCompact(trainingCapacity()) + " نفر"}</small></button>`).join("")}</nav><section class="training-task">${task ? `<div class="training-task-heading"><img src="${TROOPS[task.type].image}" alt=""><div><strong>${TROOPS[task.type].name}</strong><span>${formatCompact(task.count)} نفر در حال آموزش</span></div><button class="training-cancel" data-training-cancel aria-label="لغو صف ${trainingSlot + 1}">×</button></div><div class="training-progress"><progress data-army-progress="${key}" max="${task.duration}" value="${Math.max(0, task.duration - remain)}"></progress><span data-army-timer="${key}">${formatDuration(remain)}</span></div><div class="training-queue-actions"><button data-training-panel="speed">تسریع</button><button data-training-instant data-army-gold="${key}">اتمام · ${instantGold(remain)} سکه</button></div>` : `<input id="armyType" type="hidden" value="${unit.id}"><div class="training-slider-label"><label for="armyCount">تعداد آموزش</label><output id="trainingCountOutput" for="armyCount">${formatCompact(trainingCount)} / ${formatCompact(trainingCapacity())}</output></div><input id="armyCount" type="range" min="1" max="${Math.max(1, limit)}" value="${trainingCount}" step="1" ${!limit ? "disabled" : ""} aria-label="تعداد نیرو برای آموزش"><div class="training-costs"><span><img src="${RESOURCE_META.food.image}" alt="غذا"><b id="trainingFoodCost">${formatCompact(trainingCount * unit.cost)}</b></span><span><img src="${RESOURCE_META.iron.image}" alt="آهن"><b id="trainingIronCost">${formatCompact(trainingCount * unit.cost)}</b></span><span id="trainingDuration">${formatDuration(trainingDuration(trainingCount))}</span></div><button class="training-start" data-start-army="${key}" ${!limit || !troopUnlocked(unit.id) ? "disabled" : ""}>${!troopUnlocked(unit.id) ? "باز کردن رسته در مرکز تحقیقات" : !limit ? "منابع کافی نیست" : "آغاز آموزش"}</button>`}</section><p class="training-capacity-note">۳ صف مستقل · ظرفیت هر صف ${formatCompact(trainingCapacity())} نفر · هر سطح ارتقا +۱۰۰ نفر</p></div>${trainingDialogMarkup(unit, key)}</section>`);
    bindTrainingPage();
  }
  async function cancelArmyQueue(kind) {
    if (!isTrainingQueue(kind)) return false;
    const task = APP.army[kind];
    if (!task || !(await gameConfirm("صف لغو شود؟ ۷۰٪ هزینه بازگردانده می‌شود."))) return false;
    if (APP.army[kind] !== task) return false;
    const cost = task.cost || task.count * TROOPS[task.type].cost;
    APP.resources.food += Math.floor(cost * 7 / 10);
    if (isTrainingQueue(kind)) APP.resources.iron += Math.floor(cost * 7 / 10);
    APP.army[kind] = null;
    saveGameProgress(); updateTopHud(); updateMissionStatus();
    return true;
  }
  function bindTrainingPage() {
    const content = document.getElementById("genericPanelContent");
    content.onkeydown = event => {
      if (event.key === "Escape" && trainingOverlay) { event.preventDefault(); event.stopPropagation(); trainingOverlay = null; renderTrainingPage(); }
    };
    content.oninput = event => {
      if (event.target.id !== "armyCount") return;
      trainingCount = boundedInteger(Number(event.target.value), 1, 1, Math.max(1, trainingLimit()));
      const unit = trainingUnit();
      document.getElementById("trainingCountOutput").textContent = `${formatCompact(trainingCount)} / ${formatCompact(trainingCapacity())}`;
      for (const id of ["trainingFoodCost", "trainingIronCost"]) document.getElementById(id).textContent = formatCompact(trainingCount * unit.cost);
      document.getElementById("trainingDuration").textContent = formatDuration(trainingDuration(trainingCount));
    };
    content.onclick = async event => {
      const d = event.target.closest("button")?.dataset;
      if (!d) return;
      const key = TRAINING_KEYS[trainingSlot];
      if (d.trainingClose !== undefined) trainingOverlay = null;
      else if (d.trainingPanel) trainingOverlay = d.trainingPanel;
      else if (["attack", "defense"].includes(d.trainingGroup)) { trainingGroup = d.trainingGroup; trainingOverlay = null; }
      else if (UNIT_ROLES.some(r => r.id === d.trainingRole)) { trainingRole = d.trainingRole; trainingOverlay = null; }
      else if (TROOPS[d.trainingUnit]) { trainingGroup = TROOPS[d.trainingUnit].group; trainingRole = TROOPS[d.trainingUnit].role; trainingOverlay = null; }
      else if (d.trainingSlot !== undefined) {
        trainingSlot = boundedInteger(Number(d.trainingSlot), 0, 0, 2); trainingOverlay = null;
        const task = APP.army[TRAINING_KEYS[trainingSlot]];
        if (task) { trainingGroup = TROOPS[task.type].group; trainingRole = TROOPS[task.type].role; }
      }
      else if (d.startArmy) { trainingOverlay = null; return startArmyTask(d.startArmy); }
      else if (d.trainingSpeed) { await speedArmy(key, d.trainingSpeed); if (APP.openPage === "training") { trainingOverlay = null; renderTrainingPage(); } return; }
      else if (d.trainingInstant !== undefined) return speedArmy(key);
      else if (d.trainingCancel !== undefined) { if (await cancelArmyQueue(key)) renderTrainingPage(); return; }
      else return;
      renderTrainingPage();
    };
  }
