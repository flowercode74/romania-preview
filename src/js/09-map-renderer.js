  // راه‌اندازی دنیای ۸۰۰ در ۸۰۰ و اشیای نقشه
  function createWorldMap() {
    APP.map.bounds = {
      minQ: 1,
      maxQ: 800,
      minR: 1,
      maxR: 800
    };
    createEmpireLayout();
    APP.map.castles = [{
      id: "self",
      name: "دژ آذروند",
      q: APP.home.q,
      r: APP.home.r,
      own: true
    }, {
      id: "test-player",
      name: "دژ مهراز",
      q: 360,
      r: 405,
      own: false
    }];
    prepareConnectedGround();
    for (const c of APP.map.castles) if (!mapBuildingFits(c.q, c.r, c.id)) {
      let found = null;
      for (let radius = 1; radius < 80 && !found; radius++) for (let dq = -radius; dq <= radius && !found; dq++) for (const dr of [-radius, radius]) {
        const q = c.q + dq,
          r = c.r + dr;
        if (!insideEventArea(q, r) && mapBuildingFits(q, r, c.id)) {
          found = {
            q,
            r
          };
          break;
        }
      }
      if (found) {
        Object.assign(c, found);
        if (c.own) APP.home = {
          ...found
        };
      }
    }
    createEnemies();
    updatePerkHud();
    // Far bitmap overview is disabled; medium and detailed views remain.
    APP.map.camera.zoom = 1.75;
    [APP.map.camera.x, APP.map.camera.y] = mapCenter(APP.home.q, APP.home.r);
  }
  function resizeWorldMap() {
    const canvas = document.getElementById("worldMapCanvas");
    const viewport = document.getElementById("worldMapLayer");
    if (!canvas || !viewport || !APP.map.bounds) return;
    const dpr = Math.min(window.devicePixelRatio || 1, APP.preferences?.quality === "performance" ? 1.25 : 2);
    const w = viewport.clientWidth,
      h = viewport.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    document.getElementById("worldMapSurface").style.width = `${w}px`;
    document.getElementById("worldMapSurface").style.height = `${h}px`;
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWorldMap();
  }
  function worldPointToScreen(x, y) {
    const layer = document.getElementById("worldMapLayer");
    return [layer.clientWidth / 2 + (x - APP.map.camera.x) * APP.map.camera.zoom, layer.clientHeight / 2 + (y - APP.map.camera.y) * APP.map.camera.zoom];
  }
  function routeCenter(p) {
    return p.wx !== undefined ? [p.wx, p.wy] : mapCenter(p.q, p.r);
  }
  function routeScreen(p) {
    return p.wx !== undefined ? worldPointToScreen(p.wx, p.wy) : mapToScreen(p.q, p.r);
  }
  function mapToScreen(q, r) {
    const [x, y] = mapCenter(q, r),
      layer = document.getElementById("worldMapLayer");
    return [layer.clientWidth / 2 + (x - APP.map.camera.x) * APP.map.camera.zoom, layer.clientHeight / 2 + (y - APP.map.camera.y) * APP.map.camera.zoom];
  }
  function updateMapCoordinates() {
    const label = document.getElementById("mapCoordinateText");
    if (!label) return;
    const at = APP.map.selectedMapCell || mapWorldToAxial(APP.map.camera.x, APP.map.camera.y);
    label.textContent = `X:${Math.max(1, Math.min(800, at.q))} · Y:${Math.max(1, Math.min(800, at.r))}`;
    document.querySelector(".map-coordinates")?.classList.toggle("has-selection", !!APP.map.selectedMapCell);
  }
  function applyMapCamera() {
    updateMapCoordinates();
    if (!APP.map.raf) APP.map.raf = requestAnimationFrame(() => {
      APP.map.raf = 0;
      if (APP.currentMode === "map") drawWorldMap();
    });
  }
  function clampMapCamera() {
    const layer = document.getElementById("worldMapLayer"),
      z = Math.max(mapMinZoom(), APP.map.camera.zoom);
    APP.map.camera.zoom = z;
    const [minX, minY] = mapCenter(1, 1),
      [maxX, maxY] = mapCenter(800, 800);
    const hx = layer.clientWidth / (2 * z),
      hy = layer.clientHeight / (2 * z);
    APP.map.camera.x = Math.max(minX + hx, Math.min(maxX - hx, APP.map.camera.x));
    APP.map.camera.y = Math.max(minY + hy, Math.min(maxY - hy, APP.map.camera.y));
    if (z < MAP_DETAIL_ZOOM) {
      APP.map.selectedMapCell = null;
      if (APP.map.selection?.kind === "tile") hideMapActions();
    }
  }
  // نمای دور کش‌شده؛ ساخت بافر در قطعات کوچک انجام می‌شود تا رابط قفل نشود.
  let mapOverview = null,
    overviewGeneration = 0;
  function prepareMapOverview() {
    const generation = ++overviewGeneration;
    const canvas = document.createElement("canvas");
    canvas.width = 1392;
    canvas.height = 1204;
    const ctx = canvas.getContext("2d", {
      alpha: false
    });
    ctx.fillStyle = "#6b7952";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let row = 1;
    function chunk() {
      if (generation !== overviewGeneration) return;
      const end = Math.min(801, row + 20);
      for (; row < end; row++) for (let q = 1; q <= 800; q++) {
        const tile = terrainAt(q, row),
          empire = empireAt(q, row),
          x = Math.sqrt(3) * (q + (row & 1) / 2),
          y = row * 1.5;
        ctx.globalAlpha = 1;
        ctx.fillStyle = tile.color;
        ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
        if (empire) {
          ctx.globalAlpha = .19;
          ctx.fillStyle = empire.color;
          ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
        }
        ctx.globalAlpha = 1;
        if (empire && q < 800 && empireAt(q + 1, row)?.id !== empire.id) {
          ctx.fillStyle = empire.color;
          ctx.fillRect(x + .65, y - 1, .8, 2);
        }
        if (empire && row < 800 && empireAt(q, row + 1)?.id !== empire.id) {
          ctx.fillStyle = empire.color;
          ctx.fillRect(x - 1, y + .6, 2, .8);
        }
      }
      if (row <= 800) {
        setTimeout(chunk, 0);
        return;
      }
      mapOverview = canvas;
      if (APP.currentMode === "map") applyMapCamera();
    }
    setTimeout(chunk, 0);
  }
  function drawMapOverview(ctx, w, h, z) {
    if (!mapOverview) return false;
    const scale = APP.map.hexSize * z;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mapOverview, w / 2 - APP.map.camera.x * z, h / 2 - APP.map.camera.y * z, mapOverview.width * scale, mapOverview.height * scale);
    return true;
  }
  // رندر جزئیات و مرزهای سیاسی فقط در محدوده دید
  function drawWorldMap() {
    const canvas = document.getElementById("worldMapCanvas"),
      layer = document.getElementById("worldMapLayer");
    if (!canvas || !APP.map.bounds || !layer.clientWidth) return;
    const ctx = canvas.getContext("2d"),
      z = APP.map.camera.zoom,
      size = APP.map.hexSize;
    const w = layer.clientWidth,
      h = layer.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#376f89";
    ctx.fillRect(0, 0, w, h);
    if (z < .48 && !mapOverview) {
      ctx.fillStyle = "#6b7952";
      ctx.fillRect(0, 0, w, h);
      drawCaptureTower(ctx);
      drawEmpireCrests(ctx);
      for (const castle of APP.map.castles) drawMapCastle(ctx, castle);
      renderMarchRoutes();
      positionMapActions();
      return;
    }
    if (z < .48 && drawMapOverview(ctx, w, h, z)) {
      drawCaptureTower(ctx);
      drawEmpireCrests(ctx);
      for (const castle of APP.map.castles) drawMapCastle(ctx, castle);
      renderMarchRoutes();
      positionMapActions();
      return;
    }
    const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([sx, sy]) => mapWorldToAxial(APP.map.camera.x + (sx - w / 2) / z, APP.map.camera.y + (sy - h / 2) / z));
    const q0 = Math.max(1, Math.min(...corners.map(v => v.q)) - 4),
      q1 = Math.min(800, Math.max(...corners.map(v => v.q)) + 4);
    const r0 = Math.max(1, Math.min(...corners.map(v => v.r)) - 4),
      r1 = Math.min(800, Math.max(...corners.map(v => v.r)) + 4);
    const atlas = terrainAtlas(),
      detailed = true;
    for (let r = r0; r <= r1; r++) for (let q = q0; q <= q1; q++) {
      const [wx, wy] = mapCenter(q, r),
        x = w / 2 + (wx - APP.map.camera.x) * z,
        y = h / 2 + (wy - APP.map.camera.y) * z,
        tile = size * z;
      if (x < -tile * 2 || x > w + tile * 2 || y < -tile * 2 || y > h + tile * 2) continue;
      const terrain = terrainAt(q, r);
      ctx.save();
      mapHexPath(ctx, x, y, tile + .8);
      ctx.clip();
      ctx.fillStyle = terrain.color;
      ctx.fill();
      if (detailed && atlas?.naturalWidth) {
        ctx.globalAlpha = .94;
        drawAtlasTile(ctx, atlas, terrain.col, terrain.row, x - tile, y - tile, tile * 2, tile * 2);
      }
      const empire = empireAt(q, r);
      if (empire) {
        ctx.globalAlpha = z < 1.18 ? .20 : .08;
        ctx.fillStyle = empire.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (empire) {
        const edges = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
        const aq = q - Math.floor(r / 2);
        ctx.save();
        ctx.strokeStyle = empire.color;
        ctx.lineWidth = z < 1.18 ? 2 : 1.7;
        ctx.globalAlpha = .85;
        edges.forEach(([dq, dr], i) => {
          const rr = r + dr,
            qq = aq + dq + Math.floor(rr / 2);
          if (qq < 1 || qq > 800 || rr < 1 || rr > 800 || empireAt(qq, rr)?.id !== empire.id) {
            const a = (i * 60 - 30) * Math.PI / 180,
              b = (i * 60 + 30) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(x + tile * Math.cos(a), y + tile * Math.sin(a));
            ctx.lineTo(x + tile * Math.cos(b), y + tile * Math.sin(b));
            ctx.stroke();
          }
        });
        ctx.restore();
      }
      if (APP.map.selectedMapCell?.q === q && APP.map.selectedMapCell?.r === r) {
        ctx.save();
        mapHexPath(ctx, x, y, tile - 1);
        ctx.fillStyle = "rgba(255,218,112,.20)";
        ctx.fill();
        ctx.strokeStyle = "#ffe08a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
    drawEnemies(ctx);
    drawCaptureTower(ctx);
    if (z < 1.18) drawEmpireCrests(ctx);
    for (const castle of APP.map.castles) drawMapCastle(ctx, castle);
    positionMapActions();
    renderMarchRoutes();
  }
  // برج مرکز و نشان سیاسی در نمای دور؛ تصاویر فقط در محدوده دید رسم می‌شوند.
  function drawCaptureTower(ctx) {
    const [x, y] = mapToScreen(400, 400),
      z = APP.map.camera.zoom,
      size = 17 * z;
    const image = state.images.get(ASSETS.capture);
    if (image?.naturalWidth) ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    if (z >= MAP_DETAIL_ZOOM) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "800 12px Vazirmatn";
      ctx.fillStyle = "#ffe6a1";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.strokeText("برج فرمانروایی", x, y - size * .76);
      ctx.fillText("برج فرمانروایی", x, y - size * .76);
      ctx.restore();
    }
  }
  function drawEmpireCrests(ctx) {
    EMPIRES.forEach((empire, i) => {
      const c = empireCenters[i],
        [x, y] = mapToScreen(c.q, c.r),
        image = state.images.get(empire.image);
      const w = document.getElementById("worldMapLayer").clientWidth,
        h = document.getElementById("worldMapLayer").clientHeight;
      if (x < -70 || x > w + 70 || y < -70 || y > h + 70) return;
      if (image?.naturalWidth) ctx.drawImage(image, x - 30, y - 40, 60, 60);
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "800 11px Vazirmatn";
      ctx.fillStyle = empire.color;
      ctx.strokeStyle = "#131819";
      ctx.lineWidth = 3;
      ctx.strokeText(empire.name, x, y + 28);
      ctx.fillText(empire.name, x, y + 28);
      ctx.restore();
    });
  }
  function drawMapCastle(ctx, castle) {
    const [x, y] = mapToScreen(castle.q, castle.r),
      image = state.images.get(castle.own ? selectedCastleImage() : ASSETS.buildings.castle) || state.images.get(ASSETS.buildings.castle);
    const z = APP.map.camera.zoom,
      size = 17 * z;
    const layer = document.getElementById("worldMapLayer");
    if (x < -size || y < -size || x > layer.clientWidth + size || y > layer.clientHeight + size) return;
    if (image?.complete && image.naturalWidth) {
      ctx.save();
      ctx.shadowColor = castle.own ? "#f2ce79" : "#20170c";
      ctx.shadowBlur = castle.own ? 14 : 7;
      const art = BUILDING_ART.castle;
      const box = art && image.naturalWidth === art.size[0] && image.naturalHeight === art.size[1] ? art.box : [0, 0, image.naturalWidth, image.naturalHeight];
      const sw = box[2] - box[0], sh = box[3] - box[1], height = size * sh / sw;
      ctx.drawImage(image, box[0], box[1], sw, sh, x - size / 2, y - height / 2, size, height);
      ctx.restore();
    }
    const level = castle.own ? state.buildings.find(b => b.id === "castle")?.level || 1 : 1;
    if(z>=MAP_DETAIL_ZOOM || castle.own) drawNameplate(ctx,castle.name,level,x,y-size*.8-16,88);

  }
