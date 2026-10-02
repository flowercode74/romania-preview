  // Persisted image values are interpolated into HTML only after validation.
  function safeAssetPath(value, fallback = "") {
    if (typeof value !== "string" || value.includes("..") || !/^assets\/[a-zA-Z0-9_/-]+\.(png|webp|jpg|gif)$/.test(value)) return fallback;
    return value.replace(/\.png$/, ".webp").replace("/cavarly.webp", "/cavalry.webp").replace("/swordmen.webp", "/swordsmen.webp").replace("/noflag.webp", "/neutral.webp");
  }

  // منوی بالای صفحه و شمارنده‌های وضعیت
  function updateTopHud() {
    Object.entries({
      woodValue: APP.resources.wood,
      foodValue: APP.resources.food,
      stoneValue: APP.resources.stone,
      ironValue: APP.resources.iron,
      goldValue: APP.resources.gold,
      playerPower: APP.resources.power
    }).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCompact(value);
    });
    document.querySelectorAll(".hud-resource").forEach(el => {
      const label = el.querySelector("img")?.getAttribute("src")?.split("/").pop()?.replace(".webp", "");
      if (label && RESOURCE_META[label]) el.title = `${RESOURCE_META[label].label}: ${formatCompact(APP.resources[label])}`;
    });
    const stamina = document.getElementById("hudStaminaFill"),
      label = document.getElementById("hudStaminaText");
    if (stamina) stamina.style.width = `${APP.stamina}%`;
    if (label) label.textContent = `${APP.stamina}/100`;
  }
  function setUnreadBadge(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value > 99 ? "99+" : `+${value}`;
    el.hidden = value <= 0;
  }
  function updateBadges() {
    setUnreadBadge("mailBadge", APP.unreadMail);
    setUnreadBadge("itemBadge", APP.unreadItems);
  }

  // باز و بسته کردن صفحات و تعویض نمای بازی
  function closePanels() {
    const layer = document.getElementById("panelLayer");
    ["buildingPanel", "genericPanel", "inventoryUsePanel", "mapCastlePanel"].forEach(id => document.getElementById(id)?.classList.remove("is-active"));
    layer?.classList.remove("is-open");
    layer?.setAttribute("aria-hidden", "true");
  }
  function closeAllSurfaces() {
    hideMapActions();
    closePanels();
    hideBuildingActionMenu();
  }
  function setWorldMode(enabled, center = true) {
    if (enabled && APP.tutorial.active) return;
    hideMapActions();
    if (enabled && state.moveBuildingId) stopMovingBuilding();
    APP.currentMode = enabled ? "map" : "territory";
    const shell = document.querySelector(".game-shell");
    const stageEl = document.getElementById("stage");
    const mapLayer = document.getElementById("worldMapLayer");
    const label = document.getElementById("mapNavLabel");
    const mapButton = document.querySelector('[data-action="map"]');
    shell?.classList.toggle("world-mode", enabled);
    stageEl?.classList.toggle("territory-hidden", enabled);
    mapLayer?.classList.toggle("is-active", enabled);
    mapLayer?.setAttribute("aria-hidden", enabled ? "false" : "true");
    if (label) label.textContent = enabled ? "قلمرو" : "نقشه";
    if (mapButton) mapButton.setAttribute("aria-current", enabled ? "page" : "false");
    if (enabled) {
      if (!APP.map.bounds) createWorldMap();
      requestAnimationFrame(() => {
        resizeWorldMap();
        if (center) centerMapOn(APP.home.q, APP.home.r);
        drawWorldMap();
      });
    }
  }
  function openPage(type, contentHTML = "") {
    if (APP.tutorial.active && !APP.worker.task && APP.tutorial.phase !== "ui-tour" && !["missions", "training", "healing"].includes(type)) return;
    setWorldMode(false, false);
    closeAllSurfaces();
    const panel = document.getElementById("genericPanel");
    const content = document.getElementById("genericPanelContent");
    const titles = {
      items: ["آیتم های من", "▦", "items-page"],
      messages: ["پیام ها", "✉", "messages-page"],
      missions: ["ماموریت ها", "⚔", "mission-modal"],
      profile: ["پروفایل بازیکن", "♟", "profile-page"],
      shield: ["شیلد قلعه", "🛡", "mission-modal"],
      events: ["رویدادها", "✦", "mission-modal"],
      shop: ["فروشگاه", "◇", "shop-page"],
      vip: ["VIP", "VIP", "vip-modal"],
      training: ["سربازخانه", "⚔", "military-page"],
      healing: ["بیمارستان", "✚", "military-page"],
      research: ["مرکز تحقیقات", "◈", "military-page"],
      unit: ["اطلاعات نیرو", "⚔", "military-page"],
      settings: ["تنظیمات", "⚙", "military-page"],
      troops: ["نیروهای من", "⚔", "military-page"],
      leaderboard: ["لیدربورد", "♛", "military-page"],
      skins: ["اسکین‌ها", "♜", "military-page"],
      battle: ["گزارش نبرد", "⚔", "military-page"]
    };
    const data = titles[type];
    if (!panel || !content || !data) return;
    panel.className = `game-panel generic-panel page-panel ${data[2]}`;
    document.getElementById("genericPanelTitle").textContent = data[0];
    const panelIcon = document.getElementById("genericPanelIcon");
    if (type === "missions") panelIcon.innerHTML = '<img src="assets/icons/quest.webp" alt="">';
    else panelIcon.textContent = data[1];
    content.onclick = null;
    content.oninput = null;
    content.innerHTML = contentHTML;
    panel.classList.add("is-active");
    document.getElementById("panelLayer")?.classList.add("is-open");
    document.getElementById("panelLayer")?.setAttribute("aria-hidden", "false");
    APP.openPage = type;
  }

  // رابط آیتم‌ها و عملیات مصرف
  function openInventory(category = "all") {
    if (APP.tutorial.active && APP.tutorial.phase !== "ui-tour") return;
    APP.inventoryTab = category;
    APP.unreadItems = 0;
    updateBadges();
    const tabs = `<div class="ui-tabs inventory-tabs">
      <button class="ui-tab ${category === "all" ? "is-active" : ""}" data-inventory-tab="all">همه آیتم ها</button>
      <button class="ui-tab ${category === "resources" ? "is-active" : ""}" data-inventory-tab="resources">منابع</button>
      <button class="ui-tab ${category === "speed" ? "is-active" : ""}" data-inventory-tab="speed">تسریع</button>
      <button class="ui-tab ${category === "shield" ? "is-active" : ""}" data-inventory-tab="shield">شیلد</button>
      <button class="ui-tab ${category === "other" ? "is-active" : ""}" data-inventory-tab="other">سایر</button>
    </div>`;
    const items = INVENTORY.filter(item => category === "all" || item.category === category || category === "speed" && (item.family || item.id.startsWith("march-speed-")) || category === "other" && item.category === "utility" && !item.family);
    const grid = `<div class="inventory-grid">${items.map(item => `
      <button class="inventory-item" type="button" data-inventory-item="${item.id}" ${!item.count || item.category === "other" || item.category === "speed" && !APP.worker.task ? "disabled" : ""}>
        <div class="inventory-item-name">${escapeHTML(item.name)}</div>
        <div class="inventory-icon">${item.image ? `<img src="${item.image}" alt="">` : `<span class="emoji">${item.emoji}</span>`}</div>
        <div class="inventory-item-meta"><span>${escapeHTML(item.category === "other" ? "در نسخه بعد" : item.category === "speed" && !APP.worker.task ? "ساخت فعالی نیست" : item.resourceName || "آیتم")}</span><strong>×${formatCompact(item.count)}</strong></div>
      </button>`).join("")}</div>`;
    openPage("items", tabs + grid);
    const content = document.getElementById("genericPanelContent");
    if (content) content.onclick = event => {
      const tab = event.target.closest("[data-inventory-tab]");
      if (tab) return openInventory(tab.dataset.inventoryTab);
      const item = event.target.closest("[data-inventory-item]");
      if (item) {
        const selected = INVENTORY.find(x => x.id === item.dataset.inventoryItem);
        if (selected?.category === "shield") openShield();else if (selected?.category === "utility") useUtilityItem(selected);else openInventoryUse(item.dataset.inventoryItem);
      }
    };
  }
  function openInventoryUse(itemId) {
    const item = INVENTORY.find(x => x.id === itemId);
    if (!item || item.count <= 0) return;
    if (item.category === "other" || item.category === "speed" && !APP.worker.task) return;
    const layer = document.getElementById("panelLayer");
    const generic = document.getElementById("genericPanel");
    const panel = document.getElementById("inventoryUsePanel");
    if (!layer || !panel) return;
    generic?.classList.remove("is-active");
    document.getElementById("inventoryUseTitle").textContent = item.name;
    document.getElementById("inventoryUseSubtitle").textContent = item.resourceName || "آیتم";
    document.getElementById("inventoryUseIcon").innerHTML = item.image ? `<img src="${item.image}" alt="">` : `<span>${item.emoji || "✦"}</span>`;
    const max = item.resource ? item.count : Math.min(item.count, Math.ceil(Math.max(0, APP.worker.endsAt - Date.now()) / item.value));
    const content = document.getElementById("inventoryUseContent");
    if (max < 1) {
      content.innerHTML = `<p class="panel-copy">${item.resource ? "آیتمی باقی نمانده است." : "ساخت در حال پایان یافتن است."}</p>`;
      panel.classList.add("is-active");
      layer.classList.add("is-open");
      layer.setAttribute("aria-hidden", "false");
      return;
    }
    content.innerHTML = `<div class="use-amount-head"><span>تعداد قابل استفاده</span><strong id="useAmountValue">1</strong><small>از ${formatCompact(max)}</small></div>
      <div class="use-stepper"><button type="button" data-use-minus>−</button><input id="useRange" type="range" min="1" max="${max}" value="1" step="1" aria-label="تعداد آیتم"><button type="button" data-use-plus>+</button></div>
      <div class="use-range-labels"><span>1</span><span>${formatCompact(max)}</span></div>
      <button class="use-primary" type="button" data-use-confirm>استفاده</button>`;
    panel.classList.add("is-active");
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    const range = document.getElementById("useRange");
    const amount = document.getElementById("useAmountValue");
    const sync = value => {
      range.value = value;
      amount.textContent = formatCompact(value);
    };
    content.onclick = event => {
      const min = Number(range.min),
        maxValue = Number(range.max),
        current = Number(range.value);
      if (event.target.closest("[data-use-minus]")) sync(Math.max(min, current - 1));
      if (event.target.closest("[data-use-plus]")) sync(Math.min(maxValue, current + 1));
      if (event.target.closest("[data-use-confirm]")) useInventoryItem(item, Number(range.value));
    };
    range.oninput = () => sync(Number(range.value));
  }
  function useInventoryItem(item, amount, keepBuildingPanel = false) {
    if (item?.id.startsWith("march-speed-")) {
      showBuildNotice("لشکر در حال حرکت را انتخاب کنید و تسریع را بزنید.");
      return;
    }
    if (APP.tutorial.active && APP.tutorial.phase !== "ui-tour" && !keepBuildingPanel) return;
    if (!item || !Number.isInteger(amount) || amount < 1 || amount > item.count) return;
    const gained = item.value * amount;
    if (item.resource && gained > 0) {
      APP.resources[item.resource] += gained;
      recordCollected(gained);
      showResourceGain(item.resource, gained);
    } else if ((item.category === "speed" || item.family === "universal") && APP.worker.task) {
      if (amount > Math.ceil(Math.max(0, APP.worker.endsAt - Date.now()) / item.value)) return;
      APP.worker.endsAt = Math.max(Date.now(), APP.worker.endsAt - item.value * amount);
      APP.missions.buildSpeedUsed += Math.floor(item.value * amount / 60000);
    } else {
      return;
    }
    item.count = Math.max(0, item.count - amount);
    saveGameProgress();
    updateTopHud();
    if (item.category === "speed" || item.family === "universal") tickBuildingTask();
    if ((item.category === "speed" || item.family === "universal") && APP.worker.task) {
      if (keepBuildingPanel) {
        openBuildingPanel("upgrade");
        document.getElementById("speedChoices").hidden = false;
      } else if (item.count > 0) openInventoryUse(item.id);else {
        closePanels();
        openInventory("speed");
      }
    } else {
      closePanels();
      openInventoryAfterUseRefresh();
    }
  }
  async function useUtilityItem(item) {
    if (!item?.count) return;
    if (item.id === "march-recall") return showBuildNotice("لشکر در حال حرکت را انتخاب کنید و بازگشت را بزنید.");
    if (item.id.startsWith("stamina-")) {
      if (APP.stamina >= 100) return showBuildNotice("استقامت کامل است.");
      if (!(await gameConfirm(`استفاده از ${item.name}؟`))) return;
      if (!item.count) return;
      item.count--;
      APP.stamina = Math.min(100, APP.stamina + item.value);
      updateTopHud();
      saveGameProgress();
      return openInventory("other");
    }
    if (item.family === "universal") {
      const kinds = ["training", "healing"].filter(k => APP.army[k]);
      if (kinds.length) return speedArmy(kinds[0], item.id);
      if (APP.worker.task) return useInventoryItem(item, 1, true);
      return showBuildNotice("صف فعالی وجود ندارد.");
    }
    if (item.family === "research") return speedResearch(item.id);
    if (item.id.startsWith("march-speed-")) return showBuildNotice("لشکر در حال حرکت را انتخاب کنید و از دکمه تسریع استفاده کنید.");
    if (item.id.startsWith("teleport-")) return useTeleportItem(item);
    const kind = item.id.startsWith("troop-speed-") ? "training" : "healing";
    if (item.id !== "production-boost" && !APP.army[kind]) return showBuildNotice("صف مربوط به این تسریع فعال نیست.");
    if (!(await gameConfirm(`استفاده از ${item.name} تأیید می‌شود؟`))) return;
    if (!item.count || item.id !== "production-boost" && !APP.army[kind]) return;
    item.count--;
    if (item.id === "production-boost") {
      APP.productionBoostUntil = Math.max(Date.now(), APP.productionBoostUntil) + item.value;
      APP.missions.productionUsed++;
    } else {
      APP.army[kind].endsAt = Math.max(Date.now(), APP.army[kind].endsAt - item.value);
      APP.missions[kind === "training" ? "troopSpeedUsed" : "healSpeedUsed"] += item.value / 60000;
      tickArmy();
    }
    saveGameProgress();
    openInventory("other");
    updateMissionStatus();
  }
  function openInventoryAfterUseRefresh() {
    // صفحه باید بلافاصله بسته شود؛ فقط state داخلی برای بازشدن بعدی تازه می‌ماند.
    APP.openPage = null;
  }
  function showResourceGain(resource, amount) {
    const layer = document.getElementById("resourceGainLayer");
    if (!layer) return;
    const node = document.createElement("div");
    node.className = "resource-gain-pop";
    const icon = RESOURCE_META[resource]?.image;
    node.innerHTML = `${icon ? `<img src="${icon}" alt="">` : ""}<strong>+${formatCompact(amount)}</strong>`;
    layer.appendChild(node);
    requestAnimationFrame(() => node.classList.add("is-visible"));
    setTimeout(() => node.remove(), 1300);
  }
  function renderMessages(main = APP.messagesTab, report = APP.reportTab) {
    APP.messagesTab = main;
    APP.reportTab = report;
    const mainTabs = `<div class="ui-tabs"><button class="ui-tab ${main === "battle" ? "is-active" : ""}" data-message-main="battle">گزارش نبرد</button><button class="ui-tab ${main === "system" ? "is-active" : ""}" data-message-main="system">سیستم</button><button class="ui-tab ${main === "chat" ? "is-active" : ""}" data-message-main="chat">گفتگو</button></div>`;
    if (main !== "battle") return `${mainTabs}<div class="empty-page">${main === "system" ? "پیام های سیستمی اینجا نمایش داده می‌شوند." : "گفتگوهای بازیکن در این بخش قرار می‌گیرند."}</div>`;
    const tabs = `<div class="ui-tabs"><button class="ui-tab ${report === "attack" ? "is-active" : ""}" data-report-tab="attack">گزارش حمله</button><button class="ui-tab ${report === "defense" ? "is-active" : ""}" data-report-tab="defense">گزارش دفاع</button><button class="ui-tab ${report === "spy" ? "is-active" : ""}" data-report-tab="spy">جاسوسی</button></div>`;
    const list = APP.battleReports.filter(x => x.tab === report).map(r => `<article class="report-card battle-result ${r.result === "پیروزی" ? "is-victory" : "is-defeat"}"><header><button data-battle-report="${escapeHTML(r.id)}">${escapeHTML(r.title)}</button><time>${escapeHTML(r.time)}</time></header>${r.sent ? `<div class="battle-stat-grid"><span>اعزام<strong>${formatCompact(r.sent)}</strong></span><span>بازمانده<strong>${formatCompact(Math.max(0, r.sent - (r.wounded || 0)))}</strong></span><span>مجروح<strong>${formatCompact(r.wounded || 0)}</strong></span><span>توان لشکر<strong>${formatCompact(r.combatPower || 0)}</strong></span></div>` : ""}<div class="battle-loot">${Object.entries(r.rewards || {}).filter(([id]) => RESOURCE_META[id]).map(([id, n]) => `<span><img src="${RESOURCE_META[id].image}" alt="">${formatCompact(Number(n) || 0)}</span>`).join("")}${r.coin ? `<span>✦ ${formatCompact(r.coin)} سکه</span>` : ""}</div><details><summary>جزئیات نبرد</summary><p>${escapeHTML(r.text)}</p></details></article>`).join("");
    return mainTabs + tabs + `<div class="report-list">${list || '<p class="empty-page">هنوز گزارشی ثبت نشده است.</p>'}</div>`;
  }
  function openMessages(main = "battle", report = "attack") {
    APP.unreadMail = 0;
    APP.battleReports.forEach(r => r.read = true);
    saveGameProgress();
    updateBadges();
    openPage("messages", renderMessages(main, report));
    const content = document.getElementById("genericPanelContent");
    if (content) content.onclick = event => {
      const detail = event.target.closest("[data-battle-report]");
      if (detail) return openBattleReport(detail.dataset.battleReport);
      const mainTab = event.target.closest("[data-message-main]");
      const reportTab = event.target.closest("[data-report-tab]");
      if (mainTab) {
        content.innerHTML = renderMessages(mainTab.dataset.messageMain, APP.reportTab);
        return;
      }
      if (reportTab) {
        content.innerHTML = renderMessages("battle", reportTab.dataset.reportTab);
      }
    };
  }

  // فهرست مأموریت‌ها، بنرها و پاداش‌ها
  function openMissions() {
    if (APP.tutorial.active) hideTutorialCard();
    openPage("missions");
    renderMissions(APP.tutorial.active || tutorialRewardsPending() ? "tutorial" : APP.missionTab);
  }
  function missionDestination(m) {
    if (m.buildingId) return {id:m.buildingId,action:"upgrade"};
    if (/heal/.test(m.id)) return {id:"hospital",action:"special"};
    if (/train|troop/.test(m.id)) return {id:"barracks",action:"special"};
    if (/production/.test(m.id)) return {id:"farm",action:"upgrade"};
    return {id:"castle",action:"upgrade"};
  }
  function clearMissionHighlight() {
    document.querySelectorAll(".mission-focus").forEach(node=>node.classList.remove("mission-focus"));
    state.missionFocus = null;
  }
  function goToMission(m) {
    clearMissionHighlight();closeAllSurfaces();setWorldMode(false,false);
    const target = missionDestination(m);
    state.missionFocus = target;
    focusBuilding(target.id);showBuildingLabels();selectBuilding(target.id,target.id === "wall" ? "wall" : "building");
    let action = state.actionMenu?.querySelector(`[data-building-action="${target.action}"]`);
    if (action?.hidden) action = state.actionMenu?.querySelector('[data-building-action="upgrade"]');
    if (action && !action.hidden) { action.classList.add("mission-focus");state.missionFocus=target; }
  }
  function renderMissions(tab) {
    if (APP.tutorial.active || tutorialRewardsPending()) tab = "tutorial";else if (tab === "tutorial") tab = "growth";
    if (!MISSION_DATA[tab]) return;
    if (ensureMissionDay()) saveGameProgress();
    APP.missionTab = tab;
    const content = document.getElementById("genericPanelContent");
    if (!content) return;
    const claimed = missionClaims(tab);
    const visible = [...MISSION_DATA[tab]].filter(m => tab !== "growth" || claimed.includes(m.id) || missionUnlocked(tab, m)).sort((a, b) => Number(claimed.includes(a.id)) - Number(claimed.includes(b.id)) || Number(missionReady(tab, b)) - Number(missionReady(tab, a)));
    const list = visible.map(m => {
      const progress = Math.min(missionProgress(m), m.target);
      const done = claimed.includes(m.id);
      const rewards = Object.entries(m.reward.resources || (m.reward.resource ? {
        [m.reward.resource]: m.reward.amount
      } : {})).map(([id, n]) => `<span class="reward-chip"><img src="assets/resources/${id}.webp" alt="">${formatCompact(n)}</span>`).join("") + (m.reward.items || (m.reward.item ? [{
        id: m.reward.item,
        count: m.reward.amount
      }] : [])).map(({
        id,
        count
      }) => {
        const item = INVENTORY.find(x => x.id === id);
        return `<span class="reward-chip">${item?.image ? `<img src="${item.image}" alt="">` : item?.emoji || "✦"} ×${count}</span>`;
      }).join("");
      const destination = missionDestination(m);
      const icon = destination.id === "wall" ? ASSETS.wall : ASSETS.buildings[destination.id];
      return `<article class="mission-card"><img class="mission-building-icon" src="${icon}" alt=""><div class="mission-description"><strong>${m.title}</strong><small>${m.description}</small><small>${formatCompact(progress)} / ${formatCompact(m.target)}</small></div><div class="mission-reward"><div class="reward-strip">${rewards}</div><button type="button" data-claim-mission="${m.id}" ${done || !missionReady(tab, m) ? "disabled" : ""}>${done ? "دریافت شد" : "دریافت"}</button><button type="button" data-go-mission="${m.id}">برو به ماموریت</button></div></article>`;
    }).join("");
    const availableTabs = APP.tutorial.active || tutorialRewardsPending() ? ["tutorial"] : ["growth", "daily"];
    const tabNames = {
      tutorial: "آموزش",
      growth: "ماموریت رشد",
      daily: "ماموریت روزانه"
    };
    const tabs = `<div class="ui-tabs">${availableTabs.map(t => {
      const count = MISSION_DATA[t].filter(m => missionReady(t, m)).length;
      return `<button class="ui-tab ${t === tab ? "is-active" : ""}" data-mission-tab="${t}">${tabNames[t]}${count ? `<b class="quest-tab-badge">${count}</b>` : ""}</button>`;
    }).join("")}</div>`;
    const banners = {
      tutorial: "tutorial-banner.webp",
      daily: "daily-quests.webp",
      growth: "growth-quests.webp"
    };
    content.innerHTML = `<div class="mission-banner"><img src="assets/ui/${banners[tab]}" alt="${tabNames[tab]}"></div>${tabs}<div class="mission-list">${list}</div>${tab === "tutorial" ? `<button class="claim-all-button" data-claim-all ${MISSION_DATA.tutorial.some(m => missionReady("tutorial", m)) ? "" : "disabled"}>دریافت همه پاداش‌های آماده</button>` : ""}`;
    content.onclick = event => {
      const go = event.target.closest("[data-go-mission]");
      if (go) { const mission = MISSION_DATA[tab].find(m=>m.id === go.dataset.goMission);if(mission) goToMission(mission);return; }
      if (event.target.closest("[data-claim-all]")) {
        APP.claimingAll = true;
        try {
          for (const m of MISSION_DATA.tutorial) if (missionReady("tutorial", m)) claimMission("tutorial", m.id);
        } finally {
          APP.claimingAll = false;
        }
        renderMissions("tutorial");
        return;
      }
      const tabButton = event.target.closest("[data-mission-tab]");
      if (tabButton) return renderMissions(tabButton.dataset.missionTab);
      const claimButton = event.target.closest("[data-claim-mission]");
      if (claimButton) claimMission(tab, claimButton.dataset.claimMission);
    };
  }
  function openVip() {
    const points = Number(localStorage.getItem("romaniaVipPointsV2") || 320);
    let level = 1;
    for (let i = 0; i < VIP_THRESHOLDS.length; i++) if (points >= VIP_THRESHOLDS[i]) level = i + 1;
    const next = level < 12 ? VIP_THRESHOLDS[level] : VIP_THRESHOLDS[11];
    const previous = VIP_THRESHOLDS[level - 1];
    const progress = level >= 12 ? 100 : Math.max(0, Math.min(100, (points - previous) / Math.max(1, next - previous) * 100));
    const today = new Date().toISOString().slice(0, 10);
    const claimed = localStorage.getItem("romaniaVipDailyV2") === today;
    const levels = VIP_BENEFITS.map((benefit, i) => `<article class="vip-level ${i + 1 === level ? "is-current" : ""}"><b>VIP ${i + 1}</b><div><strong>${benefit}</strong><span>مزیت نمایشی سطح ${i + 1}</span></div></article>`).join("");
    openPage("vip", `<div class="vip-summary"><div class="vip-level-line"><strong>VIP ${level}</strong><span>${formatCompact(points)} / ${formatCompact(next)} پوینت</span></div><div class="vip-progress"><i style="width:${progress}%"></i></div><div class="vip-progress-label">${level >= 12 ? "بالاترین سطح VIP" : `${formatCompact(next - points)} پوینت تا VIP ${level + 1}`}</div><button class="vip-daily" id="vipDailyButton" type="button" ${claimed ? "disabled" : ""}>${claimed ? "VIP روزانه امروز دریافت شد ✓" : "دریافت VIP روزانه"}</button></div><div class="vip-levels">${levels}</div>`);
    const btn = document.getElementById("vipDailyButton");
    btn?.addEventListener("click", () => {
      if (btn.disabled) return;
      localStorage.setItem("romaniaVipDailyV2", today);
      localStorage.setItem("romaniaVipPointsV2", String(points + 50));
      btn.disabled = true;
      btn.textContent = "VIP روزانه دریافت شد ✓";
    });
  }
  function openShop() {
    openPage("shop", `<div class="shop-message"><div><strong>بازی ما Pay to win نیست :)</strong><span>فروشگاه در نسخه های بعدی تکمیل می‌شود.</span></div></div>`);
  }
  // پروفایل بازیکن، اتحاد و نشان امپراطوری
  // نمای پروفایل بازیکن انتخاب‌شده؛ آمار بازیکن دیگر از همان رکورد خوانده می‌شود.
  function openProfile(player = null, details = false) {
    const own = !player || player.own;
    APP.skins ||= {
      avatar: 0,
      castle: 0
    };
    const p = own ? {
      name: "DreaM",
      power: APP.resources.power,
      kills: APP.kills,
      peakPower: APP.peakPower,
      peakKills: APP.peakKills,
      level: buildingById("castle").level,
      vip: 1,
      server: 1,
      stamina: APP.stamina,
      allianceName: APP.alliance?.name || "بدون اتحاد",
      avatar: selectedAvatarSkin().avatar,
      accountCreatedAt: APP.accountCreatedAt
    } : player;
    const value = n => Number.isFinite(n) ? formatCompact(n) : "ثبت نشده";
    const avatar = typeof p.avatar === "string" && p.avatar.startsWith("assets/") ? p.avatar : "assets/ui/avatar-01.webp";
    const age = Number.isFinite(p.accountCreatedAt) ? Math.max(0, Math.floor((Date.now() - p.accountCreatedAt) / 86400000)) : null;
    const alliance = own && APP.alliance,
      empire = alliance && EMPIRES.find(e => e.id === alliance.empireId);
    const header = `<div class="profile-nameplate"><h2>${escapeHTML(p.name || "بازیکن")}</h2><span>${escapeHTML(p.allianceName || "بدون اتحاد")}${alliance?.logo ? `<img class="alliance-crest" src="${escapeHTML(alliance.logo)}" alt="نشان اتحاد">` : ""}${empire ? `<img class="alliance-crest" src="${empire.image}" alt="نشان امپراطوری">` : ""}</span></div>`;
    openPage("profile", `${details ? `<div class="profile-compact"><img src="${avatar}" alt="">${header}</div><div class="profile-lower"><img src="${own ? selectedAvatarSkin().portrait : avatar}" alt=""><div><strong>سن حساب: ${age === null ? "ثبت نشده" : age + " روز"}</strong><span>سطح قلعه: ${p.level || 1}</span><span>مدال‌ها: ${own ? INVENTORY.find(i => i.id === "gold-medal")?.count || 0 : "ثبت نشده"}</span></div></div><div class="profile-records">${[["قدرت", p.power, p.peakPower], ["کشتار", p.kills, p.peakKills]].map(([label, current, peak]) => `<article><small>بیشترین ${label} ثبت‌شده</small><strong>${value(peak)}</strong><span>${label} فعلی: ${value(current)}</span></article>`).join("")}</div><button data-profile-details="back">بازگشت به نمای اصلی</button>` : `<div class="profile-hero"><img class="profile-backdrop" src="assets/ui/profile-background.webp" alt=""><img class="profile-avatar" src="${avatar}" alt="آواتار">${header}</div><div class="profile-details">${[["سرور", p.server ?? 1], ["VIP", p.vip ?? "ثبت نشده"], ["قدرت", value(p.power)], ["کشتار", value(p.kills)], ["اتحاد", p.allianceName || "بدون اتحاد"], ["سطح قلعه", p.level || 1]].map(([name, n]) => `<div><small>${name}</small><strong>${escapeHTML(String(n))}</strong></div>`).join("")}</div>${own ? `<div class="profile-stamina"><span>استقامت ${APP.stamina}/100</span><i><b style="width:${APP.stamina}%"></b></i></div>` : ""}<button data-profile-details="more" class="panel-primary-button">اطلاعات بیشتر</button>`}${own ? `<nav class="profile-bottom"><button data-profile-tab="settings">⚙<span>تنظیمات</span></button><button data-profile-tab="troops">⚔<span>نیروها</span></button><button data-profile-tab="leaderboard">♛<span>لیدربورد</span></button><button data-profile-tab="skins">♜<span>اسکین‌ها</span></button></nav>` : ""}`);
    document.getElementById("genericPanelContent").onclick = e => {
      const b = e.target.closest("[data-profile-tab]");
      if (b) return {
        settings: openSettings,
        troops: openTroopsOverview,
        leaderboard: openLeaderboard,
        skins: openSkins
      }[b.dataset.profileTab]?.();
      const d = e.target.closest("[data-profile-details]");
      if (d) return openProfile(player, d.dataset.profileDetails === "more");
    };
  }
  function openShield() {
    if (APP.tutorial.active && APP.tutorial.phase !== "ui-tour") return;
    const active = APP.shieldUntil > Date.now();
    openPage("shield", `<div class="shield-content"><h2>🛡 سپر قلعه</h2><p>${active ? `تا ${formatDuration(APP.shieldUntil - Date.now())} محافظت فعال است.` : "شیلد فعال نیست."}</p>${INVENTORY.filter(i => i.category === "shield").map(i => `<button type="button" data-activate-shield="${i.id}" ${i.count < 1 ? "disabled" : ""}>${i.name} · ×${i.count}</button>`).join("")}</div>`);
    document.getElementById("genericPanelContent").onclick = async event => {
      const button = event.target.closest("[data-activate-shield]");
      if (!button) return;
      const item = INVENTORY.find(i => i.id === button.dataset.activateShield);
      if (!item?.count || !(await gameConfirm(`فعال‌سازی ${item.name} تأیید می‌شود؟`))) return;
      item.count--;
      APP.shieldUntil = Math.max(Date.now(), APP.shieldUntil) + item.value;
      saveGameProgress();
      openShield();
    };
  }

