  // ساخت شبکه قلمرو و تبدیل مختصات
  function createCells() {
    const cells = [];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let col = -CONFIG.worldRadius; col <= CONFIG.worldRadius; col++) {
      for (let r = -CONFIG.worldRadius; r <= CONFIG.worldRadius; r++) {
        const q = col - Math.floor(r / 2);
        const dist = distance(q, r);
        const [x, y] = center(q, r);
        const buildable = hexPoints(x, y).every(([px, py]) => insideCourtyard(px, py, 3));
        const dirt = dist <= CONFIG.terrainDirtRadius;
        const cell = {
          q,
          r,
          x,
          y,
          dist,
          buildable,
          dirt
        };
        cells.push(cell);
        minX = Math.min(minX, x - CONFIG.hexSize);
        maxX = Math.max(maxX, x + CONFIG.hexSize);
        minY = Math.min(minY, y - CONFIG.hexSize);
        maxY = Math.max(maxY, y + CONFIG.hexSize);
      }
    }
    state.cells = cells;
    state.bounds = {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // بارگذاری و نگهداری تصاویر در کش
  function loadImage(src) {
    if (state.images.has(src)) return state.images.get(src);
    const image = new Image();
    image.decoding = "async";
    let settle;
    image.assetReady = new Promise(resolve => { settle = resolve; });
    image.onload = () => {
      settle(true);
      const terrain = src === ASSETS.courtyardEarth || src === ASSETS.quietMeadow || src === ASSETS.atlas || src === ASSETS.mapAtlas || src === ASSETS.wall || src === ASSETS.ruinedWall;
      if (terrain) {
        state.terrainStamp = null;
        state.terrainChunks?.clear();
      }
      if (src === ASSETS.wall) {createCells();if(fitBuildingsToCourtyard() && state.gameStarted) saveGameProgress();}
      if (!state.gameStarted) return;
      if (APP.currentMode === "map") applyMapCamera();else if (terrain) drawWorld();
    };
    image.onerror = () => {
      settle(false);
      if (src === ASSETS.atlas || src === ASSETS.mapAtlas) {
        state.terrainStamp = null;
        if (state.gameStarted && APP.currentMode === "territory") drawWorld();
      }
    };
    image.src = src;
    state.images.set(src, image);
    return image;
  }
  function loadAssets() {
    const urls = new Set([ASSETS.atlas, ASSETS.mapAtlas, ASSETS.wall, ASSETS.ruinedWall, ASSETS.construction, ASSETS.capture, ASSETS.armyCamp, ...EMPIRES.map(e => e.image), ...Object.values(ASSETS.buildings), ...CASTLE_SKINS.map(s => s.image)]);
    urls.forEach(loadImage);
  }

  // راه‌اندازی رندر قلمرو با محدودیت حافظه
  function setupCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = "worldCanvas";
    canvas.setAttribute("aria-label", "نقشه شش‌ضلعی قلمرو");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.transformOrigin = "0 0";
    canvas.style.willChange = "auto";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.background = "#000";
    if (oldSvg) oldSvg.style.display = "none";
    stage.appendChild(canvas);
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: false
    });
    // Protect the viewport on older browsers that fall back to hidden overflow.
    stage.scrollLeft = 0; stage.scrollTop = 0;
    stage.addEventListener("scroll", () => {
      if (!stage.scrollLeft && !stage.scrollTop) return;
      stage.scrollLeft = 0; stage.scrollTop = 0;
      scheduleTerritoryRender();
    }, { passive: true });
    setupWorldOverlays();
    setupWorldSprites();
    resizeCanvas();
  }
  function resizeCanvas() {
    if (!state.canvas || !state.bounds) return;
    const {
        w,
        h
      } = stageSize(),
      dpr = Math.min(window.devicePixelRatio || 1, APP.preferences?.quality === "performance" ? 1.25 : 2);
    const pixelWidth=Math.ceil(w*dpr),pixelHeight=Math.ceil(h*dpr);
    // Do not clear/reallocate a live Canvas for duplicate resize notifications.
    if(state.canvas.width===pixelWidth && state.canvas.height===pixelHeight && state.dpr===dpr) return false;
    if(state.canvas.width!==pixelWidth) state.canvas.width=pixelWidth;
    if(state.canvas.height!==pixelHeight) state.canvas.height=pixelHeight;
    state.canvas.style.width=`${w}px`;state.canvas.style.height=`${h}px`;state.dpr=dpr;
    clampCamera();drawWorld();positionWorldOverlays();return true;

  }

  // برش مستقیم یک خانه از اطلس ۱۲×۸ تایل؛ بدون نیاز به فایل جدا برای هر تایل.
  function drawAtlasTile(ctx, image, col, row, x, y, w, h) {
    if (!image || !image.complete || !image.naturalWidth) return false;
    const cols = 12,
      rows = 8;
    const sw = image.naturalWidth / cols,
      sh = image.naturalHeight / rows;
    const sx = Math.max(0, Math.min(cols - 1, col)) * sw;
    const sy = Math.max(0, Math.min(rows - 1, row)) * sh;
    const inset = 2.5; // حذف خطوط تیره جداکننده بین خانه‌های اطلس
    ctx.drawImage(image, sx + inset, sy + inset, sw - inset * 2, sh - inset * 2, x, y, w, h);
    return true;
  }
  function terrainAtlas() {
    const primary = state.images.get(ASSETS.mapAtlas);
    return primary?.naturalWidth ? primary : state.images.get(ASSETS.atlas);
  }

  // محوطه امن داخل دیوار؛ برجک‌ها و نوار دروازه خارج از فضای ساخت قرار دارند.
  const TERRITORY = Object.freeze({
    wallWidth: 560, wallHeight: 480, exteriorMargin: 140,
    gateX: 0, gateY: 210,
    courtyard: Object.freeze([[-122, -142], [122, -142], [236, -36], [194, 112], [0, 170], [-194, 112], [-236, -36]])
  });
  function insideCourtyard(x, y, margin = 0) {
    const polygon = courtyardGroundPath();
    let inside = false;
    for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [ax,ay]=polygon[j], [bx,by]=polygon[i];
      if ((ay>y)!==(by>y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
      if (margin) {
        const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
        const t=length ? Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)) : 0;
        if (Math.hypot(x-ax-t*dx,y-ay-t*dy)<margin) return false;
      }
    }
    return inside;
  }
  // قلمرو مستقل از مختصات جهان است و هنگام تلپورت بازسازی نمی‌شود.
  function territoryTerrain(cell) {
    const roll = mapNoise(cell.q + 71, cell.r + 89);
    return { col: roll > 0.5 ? 3 : 4, row: 4, color: "#657753" };
  }
  // Derive the visible courtyard from the wall cutout, rather than exposing grass
  // between the conservative placement polygon and the painted inner wall edge.
  function courtyardGroundPath() {
    const wall = state.images.get(ASSETS.wall);
    if (!wall?.naturalWidth) return TERRITORY.courtyard;
    if (state.wallGroundSource === wall.src && state.wallGroundPath) return state.wallGroundPath;
    const mask = document.createElement("canvas");
    mask.width = 512;mask.height = Math.round(512 * wall.naturalHeight / wall.naturalWidth);
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(wall, 0, 0, mask.width, mask.height);
    const pixels = ctx.getImageData(0, 0, mask.width, mask.height)?.data;
    if (!pixels) return TERRITORY.courtyard;
    const w = mask.width, h = mask.height, seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
    let head = 0, tail = 1;
    const first = Math.floor(h / 2) * w + Math.floor(w / 2);
    queue[0] = first;seen[first] = 1;
    const visit = index => {
      if (!seen[index] && pixels[index * 4 + 3] < 32) { seen[index] = 1;queue[tail++] = index; }
    };
    while (head < tail) {
      const index = queue[head++], x = index % w, y = Math.floor(index / w);
      if (x > 0) visit(index - 1);if (x < w - 1) visit(index + 1);
      if (y > 0) visit(index - w);if (y < h - 1) visit(index + w);
    }
    // An open/broken ring must never flood-fill the exterior as courtyard.
    if (tail > w * h * .82 || tail < w * h * .25) return TERRITORY.courtyard;
    const left = [], right = [];
    for (let y = 0; y < h; y++) {
      let lo = w, hi = -1;
      for (let x = 0; x < w; x++) if (seen[y * w + x]) { lo = Math.min(lo, x);hi = x; }
      if (hi < lo) continue;
      const wy = (y / h - .5) * TERRITORY.wallHeight;
      left.push([(lo / w - .5) * TERRITORY.wallWidth, wy]);
      right.push([((hi + 1) / w - .5) * TERRITORY.wallWidth, wy]);
    }
    state.wallGroundPath = [...left, ...right.reverse()];state.wallGroundSource = wall.src;
    return state.wallGroundPath;
  }
  function wallFoundationPath() {
    // The wall and its towers stand on packed earth, with a narrow clearing beyond them.
    return [[-160,-170],[160,-170],[280,-50],[290,50],[225,140],[85,230],[-85,230],[-225,140],[-290,50],[-280,-50]].map(([x,y])=>[x*1.04,y*1.04]);
  }
  // زمین ثابت یک بار در بافر کم‌حجم رندر می‌شود؛ حرکت و انتخاب آن را دوباره نمی‌سازند.
  // A single bounded raster avoids filtering seams between independently scaled chunks.
  function paintGroundTexture(ctx, image, bounds, size) {
    if (!image?.naturalWidth) return false;
    const x0=Math.floor(bounds.minX/size),x1=Math.ceil(bounds.maxX/size);
    const y0=Math.floor(bounds.minY/size),y1=Math.ceil(bounds.maxY/size);
    // Mirrored neighbors share exactly the same edge pixels; no visible tile seams.
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      ctx.save();ctx.translate(x*size+(Math.abs(x)%2?size:0),y*size+(Math.abs(y)%2?size:0));
      ctx.scale(Math.abs(x)%2?-1:1,Math.abs(y)%2?-1:1);
      ctx.drawImage(image,0,0,size,size);ctx.restore();
    }
    return true;
  }
  function drawTerritoryTerrain(target,b) {
    const bounds=cameraBounds();b={minX:bounds.minX-24,minY:bounds.minY-24,width:bounds.maxX-bounds.minX+48,height:bounds.maxY-bounds.minY+48};
    const atlas=terrainAtlas(),wall=state.images.get(ASSETS.wall);
    const raster=APP.preferences?.quality==="performance"?1.5:2.5;
    const stamp=`atlas-foundation-v2:${raster}:${atlas?.naturalWidth||0}:${wall?.naturalWidth||0}:${b.width}:${b.height}`;
    if(state.terrainStamp!==stamp||!state.terrainCanvas){
      const make=()=>{const c=document.createElement("canvas");c.width=Math.ceil(b.width*raster);c.height=Math.ceil(b.height*raster);return c;};
      const transform=ctx=>ctx.setTransform(raster,0,0,raster,-b.minX*raster,-b.minY*raster);
      const buffer=make(),ctx=buffer.getContext("2d",{alpha:false});transform(ctx);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
      ctx.fillStyle="#737c63";ctx.fillRect(b.minX,b.minY,b.width,b.height);
      const soil=make(),earth=soil.getContext("2d");transform(earth);
      for(const cell of state.cells){
        for(const [surface,dirt] of [[ctx,false],[earth,true]]){
          surface.save();surface.beginPath();hexPoints(cell.x,cell.y).map(([x,y])=>[cell.x+(x-cell.x)*1.025,cell.y+(y-cell.y)*1.025]).forEach(([x,y],i)=>i?surface.lineTo(x,y):surface.moveTo(x,y));surface.closePath();surface.clip();
          const tile=dirt?{col:mapNoise(cell.q+71,cell.r+89)>.5?3:4,row:1}:territoryTerrain(cell);
          drawAtlasTile(surface,atlas,tile.col,tile.row,cell.x-21,cell.y-21,42,42);surface.restore();
        }
      }
      // The dirt foundation follows the actual wall alpha and courtyard opening,
      // rather than a visible geometric polygon painted over the forest.
      const mask=make(),m=mask.getContext("2d");transform(m);m.fillStyle="#fff";m.shadowColor="#fff";m.shadowBlur=22*raster;
      m.beginPath();courtyardGroundPath().forEach(([x,y],i)=>i?m.lineTo(x,y):m.moveTo(x,y));m.closePath();m.fill();
      if(wall?.naturalWidth){m.drawImage(wall,-TERRITORY.wallWidth/2,-TERRITORY.wallHeight/2,TERRITORY.wallWidth,TERRITORY.wallHeight);}
      earth.setTransform(1,0,0,1,0,0);earth.globalCompositeOperation="destination-in";earth.drawImage(mask,0,0);
      ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(soil,0,0);state.terrainCanvas=buffer;state.terrainStamp=stamp;
    }
    target.drawImage(state.terrainCanvas,b.minX,b.minY,b.width,b.height);
  }

  function setupWorldSprites() {
    // این لایه فقط آیکون جمع‌آوری و پیشرفت کارگر دوم را نگه می‌دارد.
    const layer = document.createElement("div");
    layer.className = "world-sprite-layer";
    stage.appendChild(layer);
    state.spriteLayer = layer;
  }
  function positionWorldSprites() {
    if (!state.spriteLayer) return;
    const z = state.camera.zoom;
    state.spriteLayer.style.transformOrigin = "0 0";
    state.spriteLayer.style.transform = `translate3d(${stage.clientWidth / 2 - state.camera.x * z}px,${stage.clientHeight / 2 - state.camera.y * z}px,0) scale(${z})`;
    positionCollectors();
    positionSecondProgress();
  }
  function drawWorld() {
    if (!state.ctx || !state.bounds) return;
    // Never expose the clear/terrain-only stages to the display. Compose the
    // entire scene offscreen, then publish it with one synchronous canvas copy.
    if (!state.frameCanvas) state.frameCanvas = document.createElement("canvas");
    const buffer = state.frameCanvas;
    if (buffer.width !== state.canvas.width) buffer.width = state.canvas.width;
    if (buffer.height !== state.canvas.height) buffer.height = state.canvas.height;
    const ctx = buffer.getContext("2d", { alpha: false, desynchronized: false });
    clampCamera();
    const b = state.bounds;
    const {
        w,
        h
      } = stageSize(),
      z = state.camera.zoom,
      dpr = state.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 - state.camera.x * z, h / 2 - state.camera.y * z);
    ctx.scale(z, z);
    drawTerritoryTerrain(ctx, b);
    if (state.pendingMove) {
      const p = state.pendingMove,
        b = buildingById(p.id);
      ctx.save();ctx.beginPath();
      TERRITORY.courtyard.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));ctx.closePath();ctx.clip();
      ctx.strokeStyle = "rgba(75,137,132,.42)";ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 4 / z]);
      const [cx, cy] = buildingCenter(b, p.q, p.r);
      ctx.beginPath();ctx.moveTo(-TERRITORY.wallWidth / 2, cy);ctx.lineTo(TERRITORY.wallWidth / 2, cy);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
      for (const other of state.buildings.filter(item=>item.id!==b.id)) for(const cell of occupiedTiles(other,other.q,other.r)) {
        ctx.save();ctx.beginPath();hexPoints(cell.x,cell.y).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
        ctx.fillStyle="rgba(33,40,27,.22)";ctx.strokeStyle="rgba(227,211,173,.45)";ctx.lineWidth=.7;ctx.fill();ctx.stroke();ctx.restore();
      }
      for (const cell of occupiedTiles(b, p.q, p.r)) {
        ctx.save();
        ctx.beginPath();
        hexPoints(cell.x, cell.y).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.fillStyle = p.valid ? "rgba(90,220,170,.3)" : "rgba(240,65,65,.4)";
        ctx.strokeStyle = p.valid ? "#a2f3ce" : "#ff7171";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    drawWall(ctx);
    for (const building of territoryDrawOrder()) drawBuilding(ctx, building);
    ctx.restore();
    drawTerritoryLabels(ctx);
    const screen = state.ctx;
    screen.save();
    screen.setTransform(1, 0, 0, 1, 0, 0);
    screen.globalAlpha = 1;
    screen.globalCompositeOperation = "copy";
    screen.imageSmoothingEnabled = false;
    screen.drawImage(buffer, 0, 0);
    screen.restore();
    state.dirty = false;
  }
  function buildingCenter(building, q = building.q, r = building.r) {
    const offsets = FOOTPRINTS[building.footprint] || FOOTPRINTS[1];
    const dq = offsets.reduce((sum, p) => sum + p[0], 0) / offsets.length;
    const dr = offsets.reduce((sum, p) => sum + p[1], 0) / offsets.length;
    return center(q + dq, r + dr);
  }
  function territoryDrawOrder() {
    return [...state.buildings].sort((a, b) => {
      const ap = state.pendingMove?.id === a.id ? state.pendingMove : a;
      const bp = state.pendingMove?.id === b.id ? state.pendingMove : b;
      return buildingCenter(a, ap.q, ap.r)[1] - buildingCenter(b, bp.q, bp.r)[1];
    });
  }
  function buildingSpriteBox(building, q = building.q, r = building.r, image = null) {
    const [cx, cy] = buildingCenter(building, q, r);
    const art = BUILDING_ART[building.level === 0 ? "construction" : building.id];
    const source = art && image?.naturalWidth === art.size[0] ? [art.box[0], art.box[1], art.box[2] - art.box[0], art.box[3] - art.box[1]] : [0, 0, image?.naturalWidth || building.width, image?.naturalHeight || building.height];
    const points = occupiedTiles(building, q, r).flatMap(tile => hexPoints(tile.x, tile.y));
    const left = Math.min(...points.map(p => p[0])), right = Math.max(...points.map(p => p[0]));
    const bottom = Math.max(...points.map(p => p[1]));
    // Fit the ground span, letting the roof rise naturally above its foundation.
    const width = (right - left) * .98, height = width * source[3] / source[2];
    return { x: cx - width / 2, y: cy - height / 2, width, height, source };
  }

  function buildingImage(building) {
    const construction = state.images.get(ASSETS.construction);
    return building.level === 0 && construction?.naturalWidth ? construction : state.images.get(building.id === "castle" ? selectedCastleImage() : ASSETS.buildings[building.id]) || state.images.get(ASSETS.buildings[building.id]);
  }
  function buildingLift(building) {
    if (state.moveBuildingId === building.id) return 9 + Math.sin(Date.now() / 180) * 2;
    if (state.landing?.id === building.id) return 11 * Math.pow(Math.max(0, 1 - (performance.now() - state.landing.started) / 320), 2);
    return 0;
  }
  function buildingRenderBox(building, q = building.q, r = building.r) {
    const box = buildingSpriteBox(building, q, r, buildingImage(building));
    return { ...box, y: box.y - buildingLift(building) };
  }
  function startMovingAnimation() {
    if (state.moveAnimationRaf) return;
    const frame = () => {
      state.moveAnimationRaf = 0;
      if (!state.moveBuildingId && !state.landing) return;
      if (APP.currentMode === "territory" && !document.hidden) scheduleTerritoryRender();
      if (state.landing && performance.now() - state.landing.started > 850) state.landing = null;
      if (state.moveBuildingId || state.landing) state.moveAnimationRaf = requestAnimationFrame(frame);
    };
    state.moveAnimationRaf = requestAnimationFrame(frame);
  }
  // Keep one raster per building at its current physical display size. Camera
  // translation must not repeatedly resample the original large WebP sprite.
  const buildingRasterCache = new Map();
  function buildingRaster(building, image, box, dpr, zoom) {
    const width = Math.max(1, Math.round(box.width * zoom * dpr));
    const height = Math.max(1, Math.round(box.height * zoom * dpr));
    const skin = building.id === "castle" ? APP.skins?.castle || 0 : 0;
    const key = [width, height, skin, ...box.source].join(":");
    const cached = buildingRasterCache.get(building.id);
    if (cached?.image === image && cached.key === key) return cached.canvas;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const raster = canvas.getContext("2d");
    raster.imageSmoothingEnabled = true;
    raster.imageSmoothingQuality = "high";
    raster.drawImage(image, ...box.source, 0, 0, width, height);
    buildingRasterCache.set(building.id, { image, key, canvas });
    return canvas;
  }
  function drawBuilding(ctx, building) {
    const preview = state.pendingMove?.id === building.id ? state.pendingMove : building;
    const lift = buildingLift(building);
    const image = buildingImage(building);
    if (!image?.complete || !image.naturalWidth) return;
    const box = buildingSpriteBox(building, preview.q, preview.r, image);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (state.moveBuildingId === building.id) {
      ctx.strokeStyle = state.selectedId === building.id ? "#d4b47c" : "#70cbbf";
      ctx.lineWidth = 1.5 / state.camera.zoom;
      for (const tile of occupiedTiles(building, preview.q, preview.r)) {
        ctx.beginPath();hexPoints(tile.x, tile.y).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));ctx.closePath();ctx.stroke();
      }
    }
    const dpr = state.dpr || 1, zoom = state.camera.zoom;
    const raster = buildingRaster(building, image, box, dpr, zoom);
    const x = Math.round((state.canvas.width / dpr / 2 + (box.x - state.camera.x) * zoom) * dpr);
    const y = Math.round((state.canvas.height / dpr / 2 + (box.y - lift - state.camera.y) * zoom) * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(raster, x, y);
    ctx.restore();
    if (state.landing?.id === building.id) {
      const t = Math.min(1, (performance.now() - state.landing.started) / 850);
      const [x,y] = buildingCenter(building);
      ctx.save();ctx.fillStyle = "#b59b74";
      for (let i=0;i<18;i++) {
        const angle = i * 2.39996, spread = 5 + t * (18 + i % 5 * 3);
        ctx.globalAlpha = Math.sin(Math.PI*t) * .48;
        ctx.beginPath();ctx.ellipse(x + Math.cos(angle)*spread, y + Math.sin(angle)*spread*.4 - t*8, 2 + t*5, 1+t*3, 0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
  }
  // Labels share the canvas frame and exact camera transform with their buildings.
  // Shared typography for territory buildings, map castles and wandering armies.
  function nameplateLayout(ctx, name, maxWidth = 92) {
    ctx.font="500 10px Vazirmatn, sans-serif";
    const initial=ctx.measureText(name)?.width || name.length*5;
    const fontSize=Math.max(9,Math.min(10,10*maxWidth/Math.max(1,initial)));
    ctx.font=`500 ${fontSize}px Vazirmatn, sans-serif`;
    const width=(ctx.measureText(name)?.width || name.length*fontSize*.5)+22;
    return {lines:[name],width,height:18};
  }
  function drawNameplate(ctx,name,level,x,y,maxWidth=92,opacity=1) {
    ctx.save();const layout=nameplateLayout(ctx,name,maxWidth);
    const dpr=state.dpr||1;x=Math.round(x*dpr)/dpr;y=Math.round(y*dpr)/dpr;
    ctx.globalAlpha=opacity;ctx.textBaseline="middle";ctx.textAlign="center";ctx.direction="rtl";
    ctx.shadowColor="rgba(20,25,19,.65)";ctx.shadowBlur=1;ctx.shadowOffsetY=1;
    ctx.fillStyle="#fff8e7";
    ctx.strokeStyle="rgba(28,35,25,.5)";ctx.lineWidth=1;
    layout.lines.forEach((text,i)=>{const ty=y+(i-(layout.lines.length-1)/2)*13;ctx.strokeText(text,x+10,ty);ctx.fillText(text,x+10,ty);});
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;const badgeX=x-layout.width/2+8;
    ctx.beginPath();ctx.arc(badgeX,y,7,0,Math.PI*2);ctx.fillStyle="rgba(31,48,62,.75)";ctx.fill();
    ctx.lineWidth=.7;ctx.strokeStyle="rgba(232,217,175,.72)";ctx.stroke();
    ctx.font="600 8px Vazirmatn, sans-serif";ctx.direction="ltr";ctx.fillStyle="#eee4c8";ctx.fillText(String(level),badgeX,y+.5);
    ctx.restore();return layout;
  }
  function territoryLabelLayout(ctx) {
    const z=state.camera.zoom, entries=[],occupied=[];
    // Resolve overlaps in camera-independent coordinates; panning cannot change membership.
    for(const b of [...state.buildings,{id:"wall",name:"دیوار قلعه",level:APP.wallLevel}]) {
      const pos=state.pendingMove?.id===b.id ? state.pendingMove : b;
      const box=b.id==="wall" ? null : buildingRenderBox(b,pos.q,pos.r);
      const [cx,cy]=box ? buildingCenter(b,pos.q,pos.r) : [TERRITORY.gateX,TERRITORY.gateY-28/z];
      const maxWidth=box ? Math.max(36,Math.min(92,box.width*z-20)) : 92;
      const layout=nameplateLayout(ctx,b.name,maxWidth);
      let x=cx*z,y=box ? (box.y+box.height*.26)*z : cy*z;
      let rect={left:x-layout.width/2,right:x+layout.width/2,top:y-layout.height/2,bottom:y+layout.height/2};
      for(let attempt=0;attempt<8 && occupied.some(o=>rect.left<o.right+3&&rect.right>o.left-3&&rect.top<o.bottom+3&&rect.bottom>o.top-3);attempt++) {
        y-=layout.height+3;rect={...rect,top:y-layout.height/2,bottom:y+layout.height/2};
      }
      occupied.push(rect);entries.push({b,x,y,maxWidth,rect});
    }
    return entries;
  }
  function drawTerritoryLabels(ctx) {
    const now=performance.now();
    const fadeIn=Math.min(1,Math.max(0,(now-(state.labelsFadeStart||0))/220));
    const fadeOut=Math.min(1,Math.max(0,((state.labelsVisibleUntil||0)+420-now)/420));
    const opacity=fadeIn*fadeOut;
    const {w,h}=stageSize(),z=state.camera.zoom;
    for(const entry of territoryLabelLayout(ctx)) {
      const {b,x,y,maxWidth}=entry, guided=b.id===tutorialTargetId();
      if(!guided && opacity<=0) continue;
      drawNameplate(ctx,b.name,b.level,w/2+x-state.camera.x*z,h/2+y-state.camera.y*z,maxWidth,guided?1:opacity);
    }
  }
  function drawWall(ctx) {
    // تصویر ساختمان و زمین در یک فریم و با یک تبدیل دوربین رسم می‌شوند.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const wall = state.images.get(APP.wallLevel === 0 ? ASSETS.ruinedWall : ASSETS.wall);
    if (wall?.complete && wall.naturalWidth) {
      ctx.drawImage(wall, -TERRITORY.wallWidth / 2, -TERRITORY.wallHeight / 2, TERRITORY.wallWidth, TERRITORY.wallHeight);
    }
    if (state.selectedId === "wall" || tutorialTargetId() === "wall") {
      ctx.save();
      ctx.shadowColor = "rgba(255,211,111,.82)";
      ctx.shadowBlur = 12;
      if (wall?.complete && wall.naturalWidth) ctx.drawImage(wall, -TERRITORY.wallWidth / 2, -TERRITORY.wallHeight / 2, TERRITORY.wallWidth, TERRITORY.wallHeight);
      ctx.restore();
    }
  }

  // برچسب‌ها و پیشرفت ساخت روی ساختمان
  function setupWorldOverlays() {
    const layer = document.createElement("div");
    state.overlayLayer = layer;
    layer.className = "world-overlay-layer";
    for (const building of [...state.buildings, {
      id: "wall",
      name: "باروی سنگ‌پیمان"
    }]) {
      const node = document.createElement("div");
      node.className = "world-label";
      node.dataset.buildingLabel = building.id;
      const name = document.createElement("strong");
      name.textContent = building.name;
      const level = document.createElement("em");
      node.append(name, level);
      layer.appendChild(node);
      state.labelNodes.set(building.id, node);
    }
    const progress = document.createElement("div");
    progress.className = "building-progress";
    progress.setAttribute("role", "progressbar");
    progress.innerHTML = `<span class="building-progress-caption"></span><i><b></b></i>`;
    progress.hidden = true;
    layer.appendChild(progress);
    state.progressNode = progress;
    stage.appendChild(layer);
  }
  function positionWorldOverlays() {
    positionWorldSprites();
    const w = stage.clientWidth,
      h = stage.clientHeight,
      z = state.camera.zoom;
    if (state.overlayLayer) {
      state.overlayLayer.style.transformOrigin = "0 0";
      state.overlayLayer.style.transform = `translate3d(${w / 2 - state.camera.x * z}px,${h / 2 - state.camera.y * z}px,0) scale(${z})`;
    }
    const screen = (x, y) => [x, y];
    const labelScale = Math.max(.78, Math.min(1.05, z)) / z;
    for (const building of state.buildings) {
      const node = state.labelNodes.get(building.id);
      if (!node) continue;
      const preview = state.pendingMove?.id === building.id ? state.pendingMove : building;
      const [x, y] = buildingCenter(building, preview.q, preview.r);
      const box = buildingRenderBox(building, preview.q, preview.r);
      const [sx, sy] = screen(x, box.y - 9 / z);
      node.style.left = `${sx}px`;
      node.style.top = `${sy}px`;
      node.style.setProperty("--label-scale", labelScale);
      node.querySelector("em").textContent = `Lv ${building.level}`;
      node.classList.toggle("is-guided", tutorialTargetId() === building.id);
      node.classList.toggle("is-selected", state.selectedId === building.id);
    }
    const wallNode = state.labelNodes.get("wall");
    const [wx, wy] = screen(TERRITORY.gateX, TERRITORY.gateY);
    wallNode.style.left = `${wx}px`;
    wallNode.style.top = `${wy}px`;
    wallNode.style.setProperty("--label-scale", labelScale);
    wallNode.querySelector("em").textContent = `Lv ${APP.wallLevel}`;
    wallNode.classList.toggle("is-selected", state.selectedId === "wall");
    wallNode.classList.toggle("is-guided", tutorialTargetId() === "wall");
    const occupied = [];
    const nodes = [...state.labelNodes.values()].sort((a, b) => Number(b.classList.contains("is-guided") || b.classList.contains("is-selected")) - Number(a.classList.contains("is-guided") || a.classList.contains("is-selected")));
    for (const node of nodes) {
      const sx = parseFloat(node.style.left),
        sy = parseFloat(node.style.top),
        width = Math.max(58, (node.querySelector("strong")?.textContent?.length || 8) * 6 + 28) * labelScale,
        height = 24 * labelScale;
      const rect = {
        left: sx - width / 2,
        right: sx + width / 2,
        top: sy - height / 2,
        bottom: sy + height / 2
      };
      const priority = node.classList.contains("is-guided") || node.classList.contains("is-selected");
      const overlaps = occupied.some(box => rect.left < box.right + 3 && rect.right + 3 > box.left && rect.top < box.bottom + 2 && rect.bottom + 2 > box.top);
      node.classList.toggle("is-colliding", overlaps && !priority);
      if (!overlaps || priority) occupied.push(rect);
    }
    const task = APP.worker?.task;
    if (task && state.progressNode && !state.progressNode.hidden) {
      const building = state.buildings.find(b => b.id === task.id);
      const [sx, sy] = progressAnchor(task.id, 108, 38);
      state.progressNode.style.left = `${sx}px`;
      state.progressNode.style.top = `${sy}px`;
      state.progressNode.style.setProperty("--progress-scale", 1 / z);
    }
  }
  // Keep transient progress readable inside the viewport, including the front gate.
  // Labels deliberately stay in world coordinates and never slide to avoid edges.
  function progressAnchor(id, width, height) {
    const b = buildingById(id), z = state.camera.zoom;
    const [x, y] = id === "wall" ? [TERRITORY.gateX, TERRITORY.gateY - 24] : buildingCenter(b);
    const minX = state.camera.x + (-stage.clientWidth / 2 + width / 2 + 8) / z;
    const maxX = state.camera.x + (stage.clientWidth / 2 - width / 2 - 8) / z;
    const minY = state.camera.y + (-stage.clientHeight / 2 + height / 2 + 8) / z;
    const maxY = state.camera.y + (stage.clientHeight / 2 - height / 2 - 8) / z;
    return [Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y + (id === "wall" ? 0 : 18 / z)))];
  }
  function updateBuildingProgress() {
    const node = state.progressNode;
    if (!node) return;
    const task = APP.worker?.task;
    node.hidden = !task;
    if (!task) return;
    const duration = Math.max(1, APP.worker.endsAt - task.startedAt);
    const percent = Math.max(0, Math.min(100, (Date.now() - task.startedAt) / duration * 100));
    node.dataset.buildingId = task.id;
    node.setAttribute("aria-valuenow", String(Math.round(percent)));
    node.setAttribute("aria-valuemin", "0");
    node.setAttribute("aria-valuemax", "100");
    node.querySelector(".building-progress-caption").textContent = `${task.name} · ${formatDuration(APP.worker.endsAt - Date.now())}`;
    node.querySelector("i b").style.width = `${percent}%`;
    const panelTime = document.getElementById("activeTaskTime");
    if (panelTime) panelTime.textContent = formatDuration(APP.worker.endsAt - Date.now());
    const panelFill = document.getElementById("activeTaskFill");
    if (panelFill) panelFill.style.width = `${percent}%`;
    positionWorldOverlays();
  }

  // محدوده دوربین و کنترل حرکت قلمرو
  function stageSize() {
    return {
      w: stage.clientWidth,
      h: stage.clientHeight
    };
  }

  // حد دوربین با اندازه زمین سازگار است؛ حاشیه رنگی یا خلأ بیرون زمین دیده نمی‌شود.
  function cameraBounds() {
    return {
      minX: -TERRITORY.wallWidth / 2 - TERRITORY.exteriorMargin,
      maxX: TERRITORY.wallWidth / 2 + TERRITORY.exteriorMargin,
      minY: -TERRITORY.wallHeight / 2 - TERRITORY.exteriorMargin,
      maxY: TERRITORY.wallHeight / 2 + TERRITORY.exteriorMargin
    };
  }
  function territoryZoomLimits() {
    const { w, h } = stageSize(), bounds = cameraBounds();
    const min = Math.max(CONFIG.minimumZoomFloor, w / (bounds.maxX - bounds.minX), h / (bounds.maxY - bounds.minY));
    return { min, max: min * CONFIG.maximumZoomRatio };
  }
  function clampCamera() {
    const { w, h } = stageSize(), limits = territoryZoomLimits(), bounds = cameraBounds();
    state.camera.zoom = Math.max(limits.min, Math.min(limits.max, state.camera.zoom));
    const visibleW = w / state.camera.zoom, visibleH = h / state.camera.zoom;
    state.camera.x = Math.max(bounds.minX + visibleW / 2, Math.min(bounds.maxX - visibleW / 2, state.camera.x));
    state.camera.y = Math.max(bounds.minY + visibleH / 2, Math.min(bounds.maxY - visibleH / 2, state.camera.y));
  }
  function scheduleTerritoryRender() {
    if(state.paintRaf) return;
    state.paintRaf=requestAnimationFrame(()=>{
      state.paintRaf=0;
      if(APP.currentMode!=="territory" || document.hidden) return;
      drawWorld();positionWorldOverlays();positionBuildingActionMenu();positionPlacementToolbar();
    });
  }
  function applyCamera() {
    state.canvas.style.transform="none";
    scheduleTerritoryRender();
  }
  function initialCamera() {
    state.camera.x = 0;
    state.camera.y = 0;
    state.camera.zoom = territoryZoomLimits().min * CONFIG.initialZoomRatio;
    clampCamera();
    applyCamera();
  }
  function scheduleCamera() {
    clampCamera();applyCamera();
  }
  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function beginGesture() {
    const values = [...state.pointers.values()];
    if (!values.length) return;
    if (values.length >= 2) {
      clearTimeout(state.longPressTimer);state.suppressGestureTap=true;
      const [a, b] = values;
      state.gesture = {
        type: "pinch",
        lastCenterX: (a.x + b.x) / 2,
        lastCenterY: (a.y + b.y) / 2,
        lastDistance: pointerDistance(a, b),
        moved: 0
      };
    } else {
      state.gesture = {
        type: "pan",
        lastX: values[0].x,
        lastY: values[0].y,
        moved: 0
      };
    }
  }

  // مدیریت لمس، درگ و زوم قلمرو
  function onPointerDown(event) {
    cancelAnimationFrame(state.cameraAnimation);
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    clearMissionHighlight();
    clearTimeout(state.longPressTimer);
    const held = hitBuilding(event.clientX, event.clientY);
    state.pressOrigin = {x:event.clientX,y:event.clientY};
    if (held && held.id !== "wall" && held.id !== "castle" && !APP.tutorial.active && !state.moveBuildingId) {
      state.longPressTimer = setTimeout(() => {
        if (state.pointers.size !== 1) return;
        selectBuilding(held.id);beginMovingBuilding();
        const point = screenToWorld(event.clientX,event.clientY), building = buildingById(held.id);
        const [x,y] = buildingCenter(building);
        state.gesture = {type:"building",dx:point.x-x,dy:point.y-y};
        showBuildingLabels();
      }, 480);
    }
    state.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });
    try {
      state.canvas.setPointerCapture(event.pointerId);
    } catch {}
    if (state.moveBuildingId && state.pointers.size === 1 && hitBuilding(event.clientX, event.clientY)?.id === state.moveBuildingId) {
      const b = buildingById(state.moveBuildingId),
        point = screenToWorld(event.clientX, event.clientY);
      const pos = state.pendingMove || b,
        [x, y] = buildingCenter(b, pos.q, pos.r);
      state.gesture = {
        type: "building",
        dx: point.x - x,
        dy: point.y - y
      };
    } else beginGesture();
    state.canvas.classList.add("is-dragging");
  }
  function onPointerMove(event) {
    const p = state.pointers.get(event.pointerId);
    if (!p) return;
    event.preventDefault();
    if (state.pressOrigin && Math.hypot(event.clientX-state.pressOrigin.x,event.clientY-state.pressOrigin.y)>8) clearTimeout(state.longPressTimer);
    p.x = event.clientX;
    p.y = event.clientY;
    if (state.gesture?.type === "building") {
      const point = screenToWorld(event.clientX, event.clientY);
      const b = buildingById(state.moveBuildingId);
      const [cx, cy] = buildingCenter(b, 0, 0), [ax, ay] = center(0, 0);
      const offsetX = cx - ax, offsetY = cy - ay;
      const cell = nearestCell(point.x - state.gesture.dx - offsetX, point.y - state.gesture.dy - offsetY);
      proposeMoveBuilding(state.moveBuildingId, cell.q, cell.r);
      return;
    }
    if (APP.tutorial.active && !APP.worker.task && !hasTrainingTasks() && !APP.army.healing) {
      const gesture = state.gesture;
      if (gesture?.type === "pan") {
        gesture.moved += Math.hypot(event.clientX - gesture.lastX, event.clientY - gesture.lastY);
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
      }
      return;
    }
    if (!state.labelsShownAt || performance.now() - state.labelsShownAt > 500) {
      showBuildingLabels();
      state.labelsShownAt = performance.now();
    }
    const values = [...state.pointers.values()];
    if (values.length >= 2) {
      if (!state.gesture || state.gesture.type !== "pinch") beginGesture();
      const [a, b] = values;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const dist = pointerDistance(a, b);
      const g = state.gesture;
      const {
        w,
        h
      } = stageSize();
      const rect=stage.getBoundingClientRect(),oldZoom=state.camera.zoom;
      const anchorX=state.camera.x+(g.lastCenterX-rect.left-w/2)/oldZoom;
      const anchorY=state.camera.y+(g.lastCenterY-rect.top-h/2)/oldZoom;
      if(g.lastDistance>1) {
        const factor=dist/g.lastDistance;
        state.camera.zoom=Math.max(territoryZoomLimits().min,Math.min(territoryZoomLimits().max,oldZoom*factor));
      }
      state.camera.x=anchorX-(cx-rect.left-w/2)/state.camera.zoom;
      state.camera.y=anchorY-(cy-rect.top-h/2)/state.camera.zoom;
      clampCamera();
      g.moved += Math.abs(cx - g.lastCenterX) + Math.abs(cy - g.lastCenterY);
      g.lastCenterX = cx;
      g.lastCenterY = cy;
      g.lastDistance = dist;
      scheduleCamera();
      return;
    }
    if (!state.gesture || state.gesture.type !== "pan") beginGesture();
    const g = state.gesture;
    const dx = event.clientX - g.lastX;
    const dy = event.clientY - g.lastY;
    g.lastX = event.clientX;
    g.lastY = event.clientY;
    g.moved += Math.hypot(dx, dy);
    state.camera.x -= dx / state.camera.zoom;
    state.camera.y -= dy / state.camera.zoom;
    clampCamera();
    scheduleCamera();
  }
  function onPointerUp(event) {
    clearTimeout(state.longPressTimer);state.pressOrigin = null;
    const wasTap = !state.suppressGestureTap && state.gesture?.type === "pan" && state.gesture.moved < 8;
    state.pointers.delete(event.pointerId);
    try {
      state.canvas.releasePointerCapture(event.pointerId);
    } catch {}
    if (wasTap && event.type === "pointerup" && !state.pointers.size) {
      if (state.moveBuildingId) {
        // در حالت جابجایی، لمس زمین مقصد را عوض نمی‌کند؛ فقط درگ ساختمان.
      } else {
        const hit = hitBuilding(event.clientX, event.clientY);
        if (hit) {
          if (!APP.tutorial.active || APP.worker.task || hit.id === tutorialTargetId()) {
            selectBuilding(hit.id, hit.type);
            recordBuildingInspection();
            if (APP.tutorial.active && !APP.worker.task) {
              APP.tutorial.phase = "selected";
              hideTutorialCard();
              saveGameProgress();
            }
          }
        } else if (!APP.tutorial.active) clearSelection();
      }
    }
    if (state.pointers.size) beginGesture();else {
      state.gesture = null;
      state.suppressGestureTap=false;
      state.canvas.classList.remove("is-dragging");
      if (state.deferredCameraFocus) {
        const target = state.deferredCameraFocus;
        state.deferredCameraFocus = null;
        focusBuilding(target);
      }
    }
  }
  function zoomAt(event) {
    event.preventDefault();
    if (APP.tutorial.active && !APP.worker.task && !hasTrainingTasks() && !APP.army.healing) return;
    showBuildingLabels();
    const rect = stage.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const before = {
      x: state.camera.x + (sx - rect.width / 2) / state.camera.zoom,
      y: state.camera.y + (sy - rect.height / 2) / state.camera.zoom
    };
    const factor = event.deltaY < 0 ? CONFIG.zoomStep : 1 / CONFIG.zoomStep;
    state.camera.zoom = Math.max(territoryZoomLimits().min, Math.min(territoryZoomLimits().max, state.camera.zoom * factor));
    state.camera.x = before.x - (sx - rect.width / 2) / state.camera.zoom;
    state.camera.y = before.y - (sy - rect.height / 2) / state.camera.zoom;
    scheduleCamera();
  }
  function screenToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: state.camera.x + (clientX - rect.left - rect.width / 2) / state.camera.zoom,
      y: state.camera.y + (clientY - rect.top - rect.height / 2) / state.camera.zoom
    };
  }
  function nearestCell(x, y) {
    const qf = (Math.sqrt(3) / 3 * x - y / 3) / CONFIG.hexSize;
    const rf = 2 / 3 * y / CONFIG.hexSize;
    let q = Math.round(qf),
      r = Math.round(rf),
      z = Math.round(-qf - rf);
    const dq = Math.abs(q - qf),
      dr = Math.abs(r - rf),
      dz = Math.abs(z + qf + rf);
    if (dq > dr && dq > dz) q = -r - z;else if (dr > dz) r = -q - z;
    return {
      q,
      r
    };
  }

  // اعتبارسنجی جانمایی، دیوار و تداخل ساختمان‌ها
  // محدودهٔ اشغال یک یا چهار کاشی است؛ تصویر، انتخاب و درگ مرکز مشترک دارند.
  function occupiedTiles(building, q, r) {
    const offsets = FOOTPRINTS[building.footprint] || FOOTPRINTS[1];
    return offsets.map(([dq, dr]) => {
      const [x, y] = center(q + dq, r + dr);
      return { q: q + dq, r: r + dr, x, y };
    });
  }
  function footprintFits(building, q, r) {
    return occupiedTiles(building, q, r).every(cell =>
      state.cells.some(c => c.q === cell.q && c.r === cell.r) &&
      hexPoints(cell.x, cell.y).every(([x, y]) => insideCourtyard(x, y, 3))
    );
  }
  function fitBuildingsToCourtyard() {
    if(!state.images.get(ASSETS.wall)?.naturalWidth) return false;
    let changed=false;
    for(const building of state.buildings) {
      if(building.id==="castle" || footprintFits(building,building.q,building.r)) continue;
      const [x,y]=buildingCenter(building);
      const candidates=state.cells.filter(cell=>cell.buildable).sort((a,b)=>Number(b.r===building.r)-Number(a.r===building.r)||Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
      const destination=candidates.find(cell=>canPlaceBuilding(building,cell.q,cell.r));
      if(destination) {building.q=destination.q;building.r=destination.r;changed=true;}
    }
    return changed;
  }
  function buildingsOverlap(a, aq, ar, b, bq, br) {
    const occupied = new Set(occupiedTiles(a, aq, ar).map(c => key(c.q, c.r)));
    if (occupiedTiles(b, bq, br).some(c => occupied.has(key(c.q, c.r)))) return true;
    return false;
  }
  function canPlaceBuilding(building, q, r) {
    if (!building || building.id === "castle" || !Number.isInteger(q) || !Number.isInteger(r)) return false;
    if (!footprintFits(building, q, r)) return false;
    return state.buildings.every(other => other.id === building.id || !buildingsOverlap(building, q, r, other, other.q, other.r));
  }
  function stopMovingBuilding() {
    state.moveBuildingId = null;
    cancelAnimationFrame(state.moveAnimationRaf);
    state.moveAnimationRaf = 0;
    state.pendingMove = null;
    cancelAnimationFrame(state.placementRaf);
    state.placementRaf = 0;
    document.getElementById("placementToolbar")?.remove();
    drawWorld();
    positionWorldOverlays();
  }
  function proposeMoveBuilding(id, q, r) {
    const b = buildingById(id);
    if (!b) return false;
    const valid = canPlaceBuilding(b, q, r);
    state.pendingMove = {
      id,
      q,
      r,
      valid
    };
    if (!state.moveAnimationRaf && !state.placementRaf) state.placementRaf = requestAnimationFrame(() => {
      state.placementRaf = 0;
      drawWorld();
      positionWorldSprites();
      positionPlacementToolbar();
    });
    return valid;
  }
  function positionPlacementToolbar() {
    const toolbar = document.getElementById("placementToolbar"),
      p = state.pendingMove;
    if (!toolbar || !p) return;
    const b = buildingById(p.id),
      [x, y] = buildingCenter(b, p.q, p.r),
      z = state.camera.zoom;
    const box = buildingRenderBox(b, p.q, p.r);
    toolbar.style.left = `${Math.max(60, Math.min(stage.clientWidth - 60, stage.clientWidth / 2 + (x - state.camera.x) * z))}px`;
    toolbar.style.top = `${Math.max(40, Math.min(stage.clientHeight - 90, stage.clientHeight / 2 + (box.y + box.height - state.camera.y) * z + 24))}px`;
    const button = toolbar.querySelector('[data-confirm-move]');
    if (button) button.disabled = !p.valid;
  }
  function moveBuilding(id, q, r) {
    if (APP.tutorial.active) return false;
    const building = state.buildings.find(item => item.id === id);
    if (!canPlaceBuilding(building, q, r)) {
      showBuildNotice("این خانه برای جابه‌جایی مناسب نیست.");
      return false;
    }
    if (!state.pendingMove || state.pendingMove.id !== id || state.pendingMove.q !== q || state.pendingMove.r !== r) return false;
    building.q = q;
    building.r = r;
    stopMovingBuilding();
    state.landing = {id,started:performance.now()};startMovingAnimation();
    saveGameProgress();
    showBuildNotice("ساختمان جابه‌جا شد.");
    return true;
  }
  function beginMovingBuilding() {
    const building = getSelectedBuilding();
    if (!building || building.id === "castle" || building.id === "wall" || APP.tutorial.active) return;
    state.moveBuildingId = building.id;
    startMovingAnimation();
    hideBuildingActionMenu();
    const toolbar = document.createElement("div");
    toolbar.id = "placementToolbar";
    toolbar.className = "placement-toolbar";
    toolbar.innerHTML = `<button type="button" data-confirm-move aria-label="تأیید جایگذاری">✓</button><button type="button" data-cancel-move aria-label="لغو جابجایی">×</button>`;
    toolbar.addEventListener("pointerdown", e => e.stopPropagation());
    toolbar.addEventListener("click", event => {
      if (event.target.closest("[data-cancel-move]")) stopMovingBuilding();
      if (event.target.closest("[data-confirm-move]") && state.pendingMove) {
        const {
          id,
          q,
          r
        } = state.pendingMove;
        moveBuilding(id, q, r);
      }
    });
    stage.appendChild(toolbar);
    proposeMoveBuilding(building.id, building.q, building.r);
    drawWorld();
    positionWorldSprites();
    positionPlacementToolbar();
  }
  function hitBuilding(clientX, clientY) {
    const p = screenToWorld(clientX, clientY);
    const wallHit = Math.abs(p.x - TERRITORY.gateX) <= 35 && Math.abs(p.y - TERRITORY.gateY) <= 24;
    if (wallHit) return {
      id: "wall",
      type: "wall"
    };
    const order = territoryDrawOrder();
    for (let i = order.length - 1; i >= 0; i--) {
      const b = order[i];
      const preview = state.pendingMove?.id === b.id ? state.pendingMove : b;
      const box = buildingRenderBox(b, preview.q, preview.r);
      if (p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height) {
        return {
          id: b.id,
          type: "building"
        };
      }
    }
    return null;
  }

  // انتخاب ساختمان و نمایش منوی عملیات
  function getSelectedBuilding() {
    if (state.selectedId === "wall") {
      return {
        id: "wall",
        name: "باروی سنگ‌پیمان",
        level: APP.wallLevel ?? 0,
        width: TERRITORY.wallWidth,
        height: TERRITORY.wallHeight,
        type: "wall",
        q: 0,
        r: 0
      };
    }
    const b = state.buildings.find(x => x.id === state.selectedId);
    return b ? {
      ...b,
      type: "building"
    } : null;
  }
  function selectBuilding(id, type = "building") {
    if (APP.tutorial.active && !APP.worker.task && !hasTrainingTasks() && !APP.army.healing && id !== tutorialTargetId() && id !== state.missionFocus?.id) return;
    const building = id === "wall" ? getSelectedBuildingForId("wall") : state.buildings.find(x => x.id === id);
    if (!building) return;
    state.selectedId = id;
    state.selectedType = type;
    showBuildingLabels();
    state.dirty = true;
    drawWorld();
    positionWorldOverlays();
    showBuildingActionMenu();
  }
  function getSelectedBuildingForId(id) {
    return id === "wall" ? {
      id: "wall",
      name: "باروی سنگ‌پیمان",
      level: APP.wallLevel ?? 0
    } : null;
  }
  function clearSelection() {
    state.selectedId = null;
    state.selectedType = null;
    hideBuildingActionMenu();
    closePanels();
    state.dirty = true;
    drawWorld();
    positionWorldOverlays();
  }
  function ensureBuildingActionMenu() {
    if (state.actionMenu) return state.actionMenu;
    const menu = document.createElement("div");
    menu.id = "buildingActionMenu";
    menu.className = "building-action-menu";
    menu.innerHTML = `
      <button type="button" class="building-action upgrade" data-building-action="upgrade">
        <span class="building-action-icon">↥</span><span>ارتقا</span>
      </button>
      <button type="button" class="building-action info" data-building-action="info">
        <span class="building-action-icon">i</span><span>اطلاعات</span>
      </button>
      <button type="button" class="building-action special" data-building-action="special" hidden><span class="building-action-icon">⚒</span><span>عملیات</span></button>
`;
    menu.addEventListener("pointerdown", e => e.stopPropagation());
    menu.addEventListener("click", e => {
      e.stopPropagation();
      const button = e.target.closest("[data-building-action]");
      if (!button || !state.selectedId) return;
      if (button.dataset.buildingAction === "special") return openFacility(getSelectedBuilding().id);
      openBuildingPanel(button.dataset.buildingAction === "info" ? "info" : "upgrade");
    });
    stage.appendChild(menu);
    state.actionMenu = menu;
    return menu;
  }
  function hideBuildingActionMenu() {
    state.actionMenu?.classList.remove("is-visible");
  }
  function showBuildingActionMenu() {
    const menu = ensureBuildingActionMenu();
    const selected = getSelectedBuilding();
    const special = menu.querySelector('[data-building-action="special"]');
    if (special) {
      special.hidden = !selected?.level || !["barracks", "hospital"].includes(selected.id);
      const label = special.querySelector("span:last-child");
      if (label) label.textContent = {
        barracks: "ساخت نیرو",
        hospital: "درمان",
        research: "پژوهش"
      }[selected?.id] || "عملیات";
    }
    const actionLabel = menu.querySelector('[data-building-action="upgrade"] span:last-child');
    if (actionLabel && selected) actionLabel.textContent = APP.worker.task?.id === selected.id ? "تسریع" : selected.level === 0 ? "ساخت" : "ارتقا";
    const infoButton = menu.querySelector('[data-building-action="info"]');
    if (infoButton) infoButton.hidden = APP.tutorial.active && !APP.worker.task && !APP.tutorial.phase.startsWith("army-");
    menu.querySelector('[data-building-action="upgrade"]')?.classList.toggle("tutorial-pulse", APP.tutorial.active && !APP.worker.task && !APP.tutorial.phase.startsWith("army-"));
    special?.classList.toggle("tutorial-pulse", APP.tutorial.active && APP.tutorial.phase.startsWith("army-") && selected?.id===tutorialTargetId());
    menu.classList.add("is-visible");
    positionBuildingActionMenu();
  }
  function selectedScreenPoint() {
    const b = getSelectedBuilding();
    if (!b) return null;
    const rect = stage.getBoundingClientRect();
    let wx, wy;
    if (b.id === "wall") {
      wx = 0;
      wy = TERRITORY.gateY;
    } else {
      const box = buildingRenderBox(b);
      wx = box.x + box.width / 2;
      wy = box.y + box.height;
    }
    return {
      x: rect.left + rect.width / 2 + (wx - state.camera.x) * state.camera.zoom,
      y: rect.top + rect.height / 2 + (wy - state.camera.y) * state.camera.zoom
    };
  }
  function positionBuildingActionMenu() {
    const menu = state.actionMenu;
    const point = selectedScreenPoint();
    if (!menu || !point || !menu.classList.contains("is-visible")) return;
    const stageRect = stage.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gap = 8;
    const padding = 8;
    let left = point.x - stageRect.left - menuRect.width / 2;
    let top = point.y - stageRect.top + gap;
    left = Math.max(padding, Math.min(left, stageRect.width - menuRect.width - padding));
    top = Math.max(padding, Math.min(top, stageRect.height - menuRect.height - padding));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  // پنل ساخت، ارتقا، تسریع و اتمام آنی
  function openBuildingPanel(mode = "upgrade") {
    const building = getSelectedBuilding();
    if (!building) return;
    if (APP.tutorial.active && !APP.worker.task && !hasTrainingTasks() && !APP.army.healing && building.id !== tutorialTargetId() && building.id !== state.missionFocus?.id) return;
    rememberGameView(`building:${building.id}:${mode}`);
    gameNavigation.buildingMode = mode;
    hideBuildingActionMenu();
    const layer = document.getElementById("panelLayer");
    const panel = document.getElementById("buildingPanel");
    const generic = document.getElementById("genericPanel");
    if (!layer || !panel) return;
    document.getElementById("buildingPanelTitle").textContent = building.name;
    document.getElementById("buildingPanelLevel").textContent = `سطح ${building.level}`;
    document.querySelector("#buildingPanel .panel-kicker").textContent = mode === "info" ? "اطلاعات ساختمان" : "ارتقای ساختمان";
    document.getElementById("buildingPanelIcon").textContent = building.id === "wall" ? "▣" : "♜";
    const content = document.getElementById("buildingPanelContent");
    if (content) {
      const cost = buildingCost(building, Math.min(20, building.level + 1));
      const duration = buildingDuration(building.level + 1, building.id);
      const isBuilding = building.level === 0;
      const requirement = buildingRequirement(building);
      const affordable = Object.entries(cost).every(([key, value]) => APP.resources[key] >= value);
      const canStart = (!APP.worker.task || APP.secondBuilder && !APP.worker2.task) && !APP.tutorial.phase.startsWith("army-") && building.level < 20 && requirement.ok && affordable;
      const activeHere = APP.worker.task?.id === building.id;
      content.innerHTML = activeHere ? activeTaskMarkup(building) : mode === "info" ? `<div class="panel-stat-grid"><div><small>نام</small><strong>${building.name}</strong></div><div><small>سطح</small><strong>${building.level}</strong></div><div><small>قدرت فعلی</small><strong>${formatCompact(buildingPower(building.level, building.id))}</strong></div><div><small>کارگر</small><strong>${APP.worker.task ? "مشغول" : "بیکار"}</strong></div></div><p class="panel-copy">${requirement.text}</p>` : `<div class="upgrade-card"><strong>${isBuilding ? `ساخت ${building.name}` : `ارتقای ${building.name}`}</strong><span>سطح فعلی: ${building.level} · سطح بعدی: ${Math.min(20, building.level + 1)}</span><div class="build-cost-grid">${Object.entries(cost).map(([key, value]) => `<span>${RESOURCE_META[key].label}<b>${formatCompact(value)}</b></span>`).join("")}</div><div class="build-meta"><span>زمان: ${formatDuration(duration)}</span><span>قدرت: +${formatCompact(buildingPower(building.level + 1, building.id) - buildingPower(building.level, building.id))}</span></div><p class="panel-copy ${requirement.ok ? "" : "is-warning"}">${requirement.text}</p><button type="button" class="panel-primary-button build-action-button ${APP.tutorial.active ? "tutorial-pulse" : ""}" data-start-build="${building.id}" ${canStart ? "" : "disabled"}>${isBuilding ? "ساخت" : "ارتقا"}</button><button type="button" class="instant-button" data-instant-start="${building.id}" ${canStart && APP.resources.gold >= instantGold(duration) ? "" : "disabled"}>✦ اتمام آنی · ${instantGold(duration)} سکه</button>${APP.worker.task ? `<small class="worker-busy-note">کارگر در حال ${APP.worker.task.action} ${APP.worker.task.name} است.</small>` : ""}</div>`;
      if (APP.worker2.task?.id === building.id) content.innerHTML = secondaryBuildMarkup();
      if (building.level > 0) content.insertAdjacentHTML("beforeend", buildingDetailsMarkup(building));
    }
    generic?.classList.remove("is-active");
    panel.classList.add("is-active");
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    if (APP.tutorial.active && !APP.worker.task && !APP.tutorial.phase.startsWith("army-")) {
      APP.tutorial.phase = "panel";
      saveGameProgress();
      hideTutorialCard();
    }
  }
  function activeTaskMarkup(building) {
    const task = APP.worker.task;
    const remaining = Math.max(0, APP.worker.endsAt - Date.now());
    const duration = Math.max(1, APP.worker.endsAt - task.startedAt);
    const progress = Math.max(0, Math.min(100, (Date.now() - task.startedAt) / duration * 100));
    const choices = INVENTORY.filter(item => item.category === "speed" || item.family === "universal").map(item => `<button type="button" data-use-speed="${item.id}" ${item.count < 1 ? "disabled" : ""}>${item.name}<small>×${item.count}</small></button>`).join("");
    return `<div class="task-progress"><strong>${task.action} ${building.name} به سطح ${task.target}</strong><span id="activeTaskTime">${formatDuration(remaining)}</span><i><b id="activeTaskFill" style="width:${progress}%"></b></i><div class="task-controls"><button type="button" data-open-speed>⚡ تسریع ساخت</button><button type="button" data-instant-active ${APP.resources.gold >= instantGold(remaining) ? "" : "disabled"}>✦ اتمام آنی · ${instantGold(remaining)} سکه</button><button type="button" data-request-cancel>لغو ساخت</button></div><div class="speed-choices" id="speedChoices" hidden><button type="button" data-quick-speed>استفاده سریع</button>${choices}</div><div class="cancel-confirm" id="cancelConfirm" hidden><p>ساخت لغو شود؟ ۷۰٪ منابع مصرف‌شده برمی‌گردد و ۳۰٪ کسر می‌شود.</p><button type="button" data-confirm-cancel>تأیید لغو</button><button type="button" data-dismiss-cancel>انصراف</button></div></div>`;
  }
  function instantGold(ms) {
    return Math.max(1, Math.ceil(Math.max(0, ms) / 60000) * 25);
  }
