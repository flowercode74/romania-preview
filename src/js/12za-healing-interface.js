  let healingUnitId = "sword", healingCounts = {}, healingOverlay = null;
  function healingTotal() { return Object.values(healingCounts).reduce((sum, n) => sum + n, 0); }
  function healingCountLimit(id = healingUnitId) {
    const others = healingTotal() - (healingCounts[id] || 0);
    return Math.max(0, Math.min(woundedStock()[id] || 0, Math.floor(APP.resources.food / 12) - others));
  }
  function normalizeHealingCounts() {
    const stock = woundedStock();
    let available = Math.max(0, Math.floor(APP.resources.food / 12));
    for (const id of Object.keys(TROOPS)) {
      healingCounts[id] = Math.min(available, stock[id] || 0, Math.max(0, Math.floor(healingCounts[id] || 0)));
      available -= healingCounts[id];
    }
  }
  function selectAllWounded() {
    healingCounts = {};
    let available = Math.min(1000000, Math.floor(APP.resources.food / 12));
    for (const id of Object.keys(TROOPS)) {
      healingCounts[id] = Math.min(available, woundedStock()[id] || 0);
      available -= healingCounts[id];
    }
  }
  function healingDuration(count = healingTotal()) {
    return Math.round(count * 6000 / (1 + Math.max(0, buildingById("hospital").level - 1) * .04));
  }
  function renderHealingPage() {
    const stock = woundedStock(), task = APP.army.healing;
    normalizeHealingCounts();
    if (!TROOPS[healingUnitId] || !(stock[healingUnitId] || task?.units?.[healingUnitId])) {
      healingUnitId = Object.keys(TROOPS).find(id => task?.units?.[id] > 0 || stock[id] > 0) || "sword";
    }
    if (APP.tutorial.active && APP.tutorial.phase === "army-healing" && !task && !healingTotal()) healingCounts[healingUnitId] = Math.min(10, healingCountLimit());
    const unit = TROOPS[healingUnitId], count = healingCounts[healingUnitId] || 0, total = healingTotal();
    const remain = Math.max(0, (task?.endsAt || 0) - Date.now()), limit = healingCountLimit();
    openPage("healing", `<section class="training-screen healing-screen"><img class="training-art" src="${unit.image}" alt="${unit.name}"><div class="training-vignette"></div><div class="training-title"><small>${BUILD_NAMES.hospital} · سطح ${buildingById("hospital").level}</small><h2>بازگشت به میدان</h2><span>${formatCompact(APP.army.wounded)} مجروح · ${formatCompact(task?.count || 0)} در حال درمان</span></div><aside class="training-info-buttons"><button data-healing-panel="counters" aria-label="دیدن تقابل رسته‌ها">⇄</button><button data-healing-panel="stats" aria-label="دیدن آمار نیرو">i</button></aside><div class="training-controls healing-controls"><div class="healing-section-heading"><h3>${task ? "صف درمان" : "انتخاب مجروحان"}</h3>${!task ? '<button data-heal-all>انتخاب همه</button>' : ""}</div><div class="training-unit-cards healing-unit-cards">${Object.values(TROOPS).filter(t => stock[t.id] > 0 || task?.units?.[t.id] > 0).map(t => `<button data-healing-unit="${t.id}" class="${unit.id === t.id ? "is-selected" : ""}"><img src="${t.image}" alt=""><span>${t.name}</span><small>${formatCompact(task ? task.units?.[t.id] || 0 : stock[t.id])} ${task ? "در صف" : "مجروح"}</small>${!task && healingCounts[t.id] > 0 ? `<b class="healing-picked">${formatCompact(healingCounts[t.id])}</b>` : ""}</button>`).join("") || '<div class="healing-empty"><strong>همه نیروها آماده‌اند</strong><span>مجروحی برای درمان ندارید.</span></div>'}</div><section class="training-task">${task ? `<div class="training-task-heading"><img src="${unit.image}" alt=""><div><strong>درمان ${formatCompact(task.count)} سرباز</strong><span>پس از پایان، نیروها به موجودی بازمی‌گردند.</span></div><button class="training-cancel" data-healing-cancel aria-label="لغو درمان">×</button></div><div class="training-progress"><progress data-army-progress="healing" max="${task.duration}" value="${Math.max(0, task.duration - remain)}"></progress><span data-army-timer="healing">${formatDuration(remain)}</span></div><div class="training-queue-actions"><button data-healing-panel="speed">تسریع درمان</button><button data-healing-instant data-army-gold="healing">اتمام · ${formatCompact(instantGold(remain))} سکه</button></div>` : `<div class="training-slider-label"><label for="healingCountRange">${unit.name}</label><output id="healingCountOutput" for="healingCountRange">${formatCompact(count)} از ${formatCompact(stock[unit.id] || 0)}</output></div><input id="healingCountRange" type="range" min="0" max="${limit}" value="${count}" step="1" ${!limit ? "disabled" : ""} aria-label="تعداد سرباز مجروح برای درمان"><div class="healing-hidden-selection"><input id="armyCount" type="hidden" value="${total}">${Object.keys(TROOPS).map(id => `<input data-heal-count="${id}" type="hidden" min="0" max="${stock[id] || 0}" value="${healingCounts[id] || 0}">`).join("")}</div><div class="training-costs"><span><img src="${RESOURCE_META.food.image}" alt="غذا"><b id="healingFoodCost">${formatCompact(total * 12)}</b></span><span id="healingDuration">${formatDuration(healingDuration(total))}</span></div><p id="healingTotals">${formatCompact(total)} سرباز انتخاب شده</p><button class="training-start" data-start-army="healing" ${!total || !buildingById("hospital").level ? "disabled" : ""}>آغاز درمان</button>`}</section><p class="training-capacity-note">انتخاب هر نیرو جداگانه حفظ می‌شود · هزینه هر مجروح ۱۲ غذا</p></div>${trainingDialogMarkup(unit, "healing", healingOverlay, "درمان", "heal")}</section>`);
    bindHealingPage();
  }
  function updateHealingSlider() {
    const total = healingTotal(), stock = woundedStock();
    document.getElementById("healingCountOutput").textContent = `${formatCompact(healingCounts[healingUnitId] || 0)} از ${formatCompact(stock[healingUnitId] || 0)}`;
    document.getElementById("healingFoodCost").textContent = formatCompact(total * 12);
    document.getElementById("healingDuration").textContent = formatDuration(healingDuration(total));
    document.getElementById("healingTotals").textContent = `${formatCompact(total)} سرباز انتخاب شده`;
    document.getElementById("armyCount").value = total;
    document.querySelectorAll("[data-heal-count]").forEach(input => input.value = healingCounts[input.dataset.healCount] || 0);
    const start = document.querySelector('[data-start-army="healing"]');
    if (start) start.disabled = !total || !buildingById("hospital").level;
  }
  async function cancelHealingQueue() {
    const task = APP.army.healing;
    if (!task || !await gameConfirm("درمان لغو شود؟ مجروحان و ۷۰٪ هزینه بازگردانده می‌شوند.")) return false;
    if (APP.army.healing !== task) return false;
    const stock = woundedStock();
    for (const [id, n] of Object.entries(task.units || { [task.type]: task.count })) stock[id] = (stock[id] || 0) + n;
    APP.army.wounded += task.count;
    APP.resources.food += Math.floor((task.cost || task.count * 12) * 7 / 10);
    APP.army.healing = null;healingCounts = {};healingOverlay = null;
    saveGameProgress();updateTopHud();updateMissionStatus();
    return true;
  }
  function bindHealingPage() {
    const content = document.getElementById("genericPanelContent");
    content.oninput = event => {
      if (event.target.id !== "healingCountRange") return;
      healingCounts[healingUnitId] = boundedInteger(Number(event.target.value), 0, 0, healingCountLimit());
      updateHealingSlider();
    };
    content.onkeydown = event => {
      if (event.key === "Escape" && healingOverlay) { event.preventDefault();event.stopPropagation();healingOverlay = null;renderHealingPage(); }
    };
    content.onclick = async event => {
      const d = event.target.closest("button")?.dataset;
      if (!d) return;
      if (d.healingUnit && TROOPS[d.healingUnit]) healingUnitId = d.healingUnit;
      else if (d.healAll !== undefined) selectAllWounded();
      else if (d.healingPanel) healingOverlay = d.healingPanel;
      else if (d.trainingClose !== undefined) healingOverlay = null;
      else if (d.startArmy === "healing") { startArmyTask("healing");if (APP.army.healing) healingCounts = {};return; }
      else if (d.trainingSpeed) { await speedArmy("healing", d.trainingSpeed);if (APP.openPage === "healing") {healingOverlay = null;renderHealingPage();}return; }
      else if (d.healingInstant !== undefined) return speedArmy("healing");
      else if (d.healingCancel !== undefined) {if (await cancelHealingQueue()) renderHealingPage();return;}
      else return;
      renderHealingPage();
    };
  }
