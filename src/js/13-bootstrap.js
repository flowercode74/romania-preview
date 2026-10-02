  createCells();
  loadAssets();
  setupCanvas();
  initialCamera();
  bindUI();
  drawWorld();
  positionWorldOverlays();
  document.fonts?.ready.then(() => {
    drawWorld();
    if (APP.currentMode === "map") drawWorldMap();
  }).catch(() => {});
  loadingScreen(setupEntry());
  new ResizeObserver(() => {
    resizeCanvas();
    positionBuildingActionMenu();
  }).observe(stage);
  let assetRefreshQueued = false;
  state.images.forEach(image => image.addEventListener("load", () => {
    if (assetRefreshQueued) return;
    assetRefreshQueued = true;
    requestAnimationFrame(() => {
      assetRefreshQueued = false;
      drawWorld();
      if (APP.currentMode === "map") drawWorldMap();
    });
  }, {
    once: true
  }));

  document.addEventListener("pointerdown", event => {
    if (!APP.tutorial.active && state.missionFocus && !event.target.closest?.(".mission-focus")) clearMissionHighlight();
  }, true);
