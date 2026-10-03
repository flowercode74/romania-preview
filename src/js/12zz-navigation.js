  // Browser Back consumes one in-game layer, without leaving the running game.
  const gameNavigation = { enabled: false, restoring: false, frames: [], bound: false };
  function navigationPageKey(type, html = "") {
    if (type === "profile") return `page:profile:${html.includes('profile-compact') ? 'details' : 'main'}`;
    if (type === "skins") return `page:skins:${html.match(/skin-preview skin-(avatar|castle)/)?.[1] || 'main'}`;
    return `page:${type}`;
  }
  function captureGameView() {
    const activeId = ["inventoryUsePanel", "buildingPanel", "genericPanel"].find(id => document.getElementById(id)?.classList.contains("is-active"));
    const panel = activeId ? document.getElementById(activeId) : null;
    const contentId = {genericPanel:"genericPanelContent",buildingPanel:"buildingPanelContent",inventoryUsePanel:"inventoryUseContent"}[activeId];
    const content = contentId ? document.getElementById(contentId) : null;
    const type = activeId === "genericPanel" ? APP.openPage : null;
    return {
      key: type ? navigationPageKey(type, content?.innerHTML || "") : activeId === "buildingPanel" ? `building:${state.selectedId}:${gameNavigation.buildingMode || 'upgrade'}` : activeId === "inventoryUsePanel" ? `item:${gameNavigation.itemId}` : `world:${APP.currentMode}`,
      mode: APP.currentMode, activeId, type, contentId, className: panel?.className,
      html: content?.innerHTML || "", children: content?.childNodes ? Array.from(content.childNodes) : null,
      onclick: content?.onclick, oninput: content?.oninput, onkeydown: content?.onkeydown, scrollTop: content?.scrollTop || 0,
      title: document.getElementById("genericPanelTitle")?.textContent,
      icon: document.getElementById("genericPanelIcon")?.innerHTML,
      selectedId: state.selectedId, buildingMode: gameNavigation.buildingMode, itemId: gameNavigation.itemId,
      training: {group:trainingGroup,role:trainingRole,slot:trainingSlot,count:trainingCount},
      healing: {unit:healingUnitId,counts:{...healingCounts}},
      missionTab: APP.missionTab, inventoryTab: APP.inventoryTab, researchLineId: selectedResearchLine,
      messagesTab: APP.messagesTab, reportTab: APP.reportTab, profileView: gameNavigation.profileView
    };
  }
  function rememberGameView(nextKey) {
    if (!gameNavigation.enabled || gameNavigation.restoring) return;
    const frame = captureGameView();
    if (frame.key === nextKey) return;
    gameNavigation.frames.push(frame);
    if (gameNavigation.frames.length > 24) gameNavigation.frames.shift();
  }
  function restoreGameView(frame) {
    gameNavigation.restoring = true;
    try {
      closeAllSurfaces();
      setWorldMode(frame.mode === "map", false, false);
      state.selectedId = frame.selectedId;
      APP.missionTab = frame.missionTab;APP.inventoryTab=frame.inventoryTab;selectedResearchLine=frame.researchLineId;
      if (frame.type === "training") {
        trainingGroup=frame.training.group;trainingRole=frame.training.role;trainingSlot=frame.training.slot;trainingCount=frame.training.count;trainingOverlay=null;
        renderTrainingPage();
      } else if (frame.type === "healing") {
        healingUnitId=frame.healing.unit;healingCounts={...frame.healing.counts};healingOverlay=null;renderHealingPage();
      } else if (frame.activeId === "buildingPanel") openBuildingPanel(frame.buildingMode || "upgrade");
      else if (frame.activeId === "inventoryUsePanel") openInventoryUse(frame.itemId);
      else if (frame.activeId === "genericPanel") {
        const panel=document.getElementById(frame.activeId),content=document.getElementById(frame.contentId);
        panel.className=frame.className;panel.classList.add("is-active");
        if (frame.children) content.replaceChildren(...frame.children);else content.innerHTML=frame.html;
        content.onclick=frame.onclick;content.oninput=frame.oninput;content.onkeydown=frame.onkeydown;content.scrollTop=frame.scrollTop;
        document.getElementById("genericPanelTitle").textContent=frame.title;
        document.getElementById("genericPanelIcon").innerHTML=frame.icon;
        document.getElementById("panelLayer").classList.add("is-open");document.getElementById("panelLayer").setAttribute("aria-hidden","false");APP.openPage=frame.type;
        // Refresh mutable inventories and rewards while retaining the previous tab.
        if (frame.type === "items") openInventory(APP.inventoryTab || "all");
        if (frame.type === "missions") renderMissions(frame.missionTab);
        if (frame.type === "profile" && frame.profileView) openProfile(frame.profileView.player,frame.profileView.details);
        if (frame.type === "messages") openMessages(frame.messagesTab,frame.reportTab);
        if (frame.type === "settings") openSettings();
        if (frame.type === "research") openResearch();
        if (frame.type === "troops") openTroopsOverview();
        if (frame.type === "vip") openVip();
        if (frame.type === "shield") openShield();
      }
      if (["training","healing"].includes(frame.type)) document.getElementById("genericPanelContent").scrollTop=frame.scrollTop || 0;
    } finally { gameNavigation.restoring=false; }
  }
  function navigateGameBack() {
    const dialog=document.getElementById("gameDialog");
    if (dialog && !dialog.hidden) {closeGameDialog();return true;}
    if (APP.openPage === "training" && trainingOverlay) {trainingOverlay=null;renderTrainingPage();return true;}
    if (APP.openPage === "healing" && healingOverlay) {healingOverlay=null;renderHealingPage();return true;}
    const enemy=document.getElementById("enemySheet");if(enemy?.id==="enemySheet"){enemy.remove();document.getElementById("enemyBackdrop")?.remove();return true;}
    const march=document.getElementById("marchPanel");
    if (march?.classList.contains("is-expanded")) {march.classList.remove("is-expanded");return true;}
    if (state.moveBuildingId) {stopMovingBuilding();return true;}
    if (APP.currentMode === "map" && APP.map.selection) {hideMapActions();return true;}
    if (state.actionMenu?.classList.contains("is-visible")) {hideBuildingActionMenu();return true;}
    const frame=gameNavigation.frames.pop();
    if (frame) {restoreGameView(frame);return true;}
    const open=document.getElementById("panelLayer")?.classList.contains("is-open");
    closeAllSurfaces();
    if (APP.currentMode === "map") {setWorldMode(false,false,false);return true;}
    if (open) return true;
    return false;
  }
  function armGameBackGuard() {
    const history=window.history;
    if (!history?.pushState || !history?.replaceState) return;
    try {
      if (history.state?.romaniaBackGuard) return;
      history.replaceState({...history.state,romaniaGameRoot:true}, "");
      history.pushState({romaniaBackGuard:true}, "");
    } catch (error) {console.warn("Romania: browser history unavailable",error);}
  }
  function setupGameNavigation() {
    gameNavigation.enabled=true;gameNavigation.frames=[];
    armGameBackGuard();
    if (gameNavigation.bound) return;
    gameNavigation.bound=true;
    window.addEventListener("popstate", () => {
      if (!state.gameStarted) return;
      // Re-arm immediately, even when already in the settlement. No exit prompt.
      try {window.history?.pushState({romaniaBackGuard:true}, "");}catch {}
      if (!navigateGameBack()) requestGameExit();
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || event.defaultPrevented || !state.gameStarted) return;
      if (navigateGameBack()) event.preventDefault();
    });
  }
