
  const stage = document.getElementById("stage");
  const oldSvg = document.getElementById("hexSvg");
  if (!stage) throw new Error("Romania: game stage not found.");

  // ---------------------------------------------------------------------------

  // تنظیمات قلمرو، دوربین و محدوده ساخت
  const CONFIG = Object.freeze({
    worldRadius: 17,
    buildRadius: 9,
    terrainDirtRadius: 9,
    buildingAreaMinRow: -5,
    buildingAreaMaxRow: 5,
    hexSize: 20,
    initialZoomRatio: 1.02,
    minimumZoomFloor: 0.1,
    maximumZoomRatio: 2.4,
    zoomStep: 1.12,
    cameraPadding: 18,
    dragThreshold: 4
  });

  // تعریف ساختمان‌ها و چیدمان اولیه
  const BUILDINGS = Object.freeze([{
    id: "castle",
    name: "دژ آذروند",
    level: 1,
  }, {
    id: "hospital",
    name: "دارالشفای سپیدمهر",
    level: 0,
  }, {
    id: "camp",
    name: "اردوی شاهین‌دشت",
    level: 0,
  }, {
    id: "barracks",
    name: "رزمگاه آهن‌پیمان",
    level: 0,
  }, {
    id: "research",
    name: "کانون خردسنگ",
    level: 0,
  }, {
    id: "embassy",
    name: "دیوان پیمان‌ور",
    level: 0,
  }, {
    id: "hideout",
    name: "نهان‌خانه سایه‌مهر",
    level: 0,
  }, {
    id: "farm",
    name: "کشتزار زرین‌خوشه",
    level: 0,
  }, {
    id: "lumber",
    name: "چوبستان ریشه‌بان",
    level: 0,
  }, {
    id: "stone",
    name: "سنگستان گران‌کوه",
    level: 0,
  }, {
    id: "iron",
    name: "آهنگاه سرخ‌رگه",
    level: 0,
  }]);

  // مسیرهای تصاویر و دارایی‌های بازی
  const ASSETS = Object.freeze({
    courtyardEarth: "assets/terrain/courtyard-earth.webp",
    quietMeadow: "assets/terrain/quiet-meadow.webp",
    atlas: "assets/terrain/tiles-v2.webp",
    mapAtlas: "assets/terrain/tiles-v2.webp",
    wall: "assets/walls/castle-wall.webp",
    ruinedWall: "assets/walls/ruined-wall.webp",
    construction: "assets/buildings/construction.webp",
    capture: "assets/terrain/capture-tower.webp",
    armyCamp: "assets/buildings/army-camp.webp",
    buildings: Object.fromEntries(BUILDINGS.map(b => [b.id, `assets/buildings/${b.id}.webp`]))
  });

  const AVATAR_SKINS = Object.freeze([
    { name: "فرمانروای تاج‌دار", avatar: "assets/skins/avatar-01.webp", portrait: "assets/skins/portrait-01.webp" },
    { name: "ملکه لاجوردی", avatar: "assets/skins/avatar-02.webp", portrait: "assets/skins/portrait-02.webp" },
    { name: "سردار آهنین", avatar: "assets/skins/avatar-03.webp", portrait: "assets/skins/portrait-03.webp" },
    { name: "نگهبان مرزها", avatar: "assets/skins/avatar-04.webp", portrait: "assets/skins/portrait-04.webp" }
  ]);
  const CASTLE_SKINS = Object.freeze([
    { name: "دژ سلطنتی", image: "assets/skins/castle-01.webp" },
    { name: "ارگ برج‌های بلند", image: "assets/skins/castle-02.webp" },
    { name: "کاخ فرمانروایی", image: "assets/skins/castle-03.webp" },
    { name: "قلعه مرزبانی", image: "assets/skins/castle-04.webp" }
  ]);
  function selectedAvatarSkin() {
    return AVATAR_SKINS[APP.skins?.avatar] || AVATAR_SKINS[0];
  }
  function selectedCastleImage() {
    return CASTLE_SKINS[APP.skins?.castle]?.image || CASTLE_SKINS[0].image;
  }

  // تعریف امپراطوری‌ها و محدوده بی‌طرف رویداد؛ ورودی‌ها نیز جزو محدوده ممنوعه تلپورت هستند.
  const WORLD = Object.freeze({
    size: 800,
    serverCapacity: 1000,
    seasonDays: 52,
    finalEventDays: 5,
    finalEventStartDay: 48,
    eventQ: 400,
    eventR: 400,
    neutralRadius: 23,
    marchSlots: 4,
    campDuration: 7_200_000
  });
  const EMPIRES = Object.freeze([{
    id: "hakhamaneshi",
    name: "هخامنشی",
    color: "#399aff",
    image: "assets/empires/hakhamaneshi.webp"
  }, {
    id: "sasani",
    name: "ساسانی",
    color: "#b46bfa",
    image: "assets/empires/sasani.webp"
  }, {
    id: "rome",
    name: "روم",
    color: "#ed5559",
    image: "assets/empires/rome.webp"
  }, {
    id: "maoria",
    name: "مائوریا",
    color: "#55c47b",
    image: "assets/empires/maoria.webp"
  }, {
    id: "heptalin",
    name: "هپتالیان",
    color: "#9da3ad",
    image: "assets/empires/heptalin.webp"
  }]);
  const empireOwnership = new Uint8Array(801 * 801);
  let empireLayoutReady = false;
  const empireCenters = EMPIRES.map(() => ({
    q: 0,
    r: 0,
    count: 0
  }));
  function insideEventArea(q, r) {
    return Math.hypot(q - WORLD.eventQ, r - WORLD.eventR) <= WORLD.neutralRadius;
  }
  // پنج قلمرو مستقل با راهروهای آزاد؛ محاسبه خطی و بدون مرتب‌سازی سنگین.
  function createEmpireLayout() {
    if (empireLayoutReady) return;
    // مرزهای هم‌اندازه و جدا از هم؛ فضای میان آن‌ها سرزمین آزاد است.
    const centers = [[635, 400], [473, 624], [210, 538], [210, 262], [473, 176]];
    // ساحل‌های نامتقارن و بریدگی‌های جغرافیایی؛ چرخش و بازتاب، مساحت برابر را حفظ می‌کند.
    const outline = [[-120, -36], [-86, -104], [-26, -92], [18, -120], [55, -70], [102, -91], [121, -15], [85, 12], [117, 58], [48, 72], [10, 123], [-22, 84], [-90, 104], [-80, 43], [-125, 15], [-96, -9]];
    const inside = (x, y) => {
      let hit = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const [ax, ay] = outline[i],
          [bx, by] = outline[j];
        if ((x - ax) * (by - ay) === (y - ay) * (bx - ax) && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true;
        if (ay > y !== by > y && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
      }
      return hit;
    };
    centers.forEach(([q, r], index) => {
      const c = empireCenters[index];
      c.q = q;
      c.r = r;
      c.count = 0;
      for (let dx = -128; dx <= 128; dx++) for (let dy = -128; dy <= 128; dy++) {
        const [x, y] = index === 0 ? [dx, dy] : index === 1 ? [dy, -dx] : index === 2 ? [-dx, -dy] : index === 3 ? [-dy, dx] : [-dx, dy];
        if (!inside(x, y) || insideEventArea(q + dx, r + dy)) continue;
        empireOwnership[(q + dx) * 801 + r + dy] = index + 1;
        c.count++;
      }
    });
    empireLayoutReady = true;
  }
  function empireAt(q, r) {
    if (insideEventArea(q, r)) return EMPIRES.find(e => e.id === APP.eventEmpire) || null;
    return EMPIRES[empireOwnership[q * 801 + r] - 1] || null;
  }
  // مزیت فقط از مختصات فعلی قلعه محاسبه می‌شود، نه از وابستگی اتحاد.
  const EMPIRE_LORE = {
    hakhamaneshi: ["هخامنشیان با راه‌های شاهی و اداره سرزمین‌های گوناگون، پایه‌های فرمانروایی گسترده‌ای را بنا کردند.", "۲٫۵٪ افزایش تولید تمام منابع"],
    sasani: ["ساسانیان با دژهای استوار و شهرهای آباد، شکوه پادشاهی ایرانی را برای سده‌ها حفظ کردند.", "۵٪ افزایش تولید گندم"],
    rome: ["روم با سپاهیان منظم، راه‌های گسترده و سازه‌های ماندگار، قدرت خود را در سرزمین‌های دور گسترش داد.", "۵٪ افزایش تولید سنگ"],
    maoria: ["مائوریا با یکپارچه‌کردن سرزمین‌های پهناور هند، شبکه‌ای از شهرها و راه‌های بازرگانی پدید آورد.", "۵٪ افزایش تولید چوب"],
    heptalin: ["هپتالیان با سواران چابک و تسلط بر گذرگاه‌های آسیای مرکزی، میان قدرت‌های بزرگ جای گرفتند.", "۵٪ افزایش تولید آهن"]
  };
  function activePerk() {
    const empire = empireAt(APP.home.q, APP.home.r);
    return {
      empire,
      text: empire ? EMPIRE_LORE[empire.id][1] : "۵٪ کاهش زمان حرکت لشکر در سرزمین آزاد"
    };
  }
  function productionMultiplier(resource) {
    const e = activePerk().empire;
    if (!e) return 1;
    if (e.id === "hakhamaneshi") return 1.025;
    return {
      sasani: "food",
      rome: "stone",
      maoria: "wood",
      heptalin: "iron"
    }[e.id] === resource ? 1.05 : 1;
  }
  function updatePerkHud() {
    const node = document.getElementById("territoryPerk");
    if (!node) return;
    const perk = activePerk();
    node.innerHTML = `<button type="button" id="perkFlag" aria-label="مزیت محل استقرار" aria-expanded="false"><img src="${perk.empire?.image || "assets/empires/neutral.webp"}" alt="${perk.empire?.name || "سرزمین آزاد"}"></button><div class="perk-description" hidden><strong>${perk.empire?.name || "سرزمین آزاد"}</strong><span>${perk.text}</span></div>`;
    const button = node.querySelector("button"),
      description = node.querySelector(".perk-description");
    button?.addEventListener("click", () => {
      description.hidden = !description.hidden;
      button.setAttribute("aria-expanded", String(!description.hidden));
    });
  }
  function openEmpire(empire) {
    if (!empire) return;
    const old = document.getElementById("empireInfo");
    old?.remove();
    const box = document.createElement("div");
    box.id = "empireInfo";
    box.className = "empire-info";
    box.innerHTML = `<button aria-label="بستن">×</button><img src="${empire.image}" alt=""><h3>${empire.name}</h3><p>${EMPIRE_LORE[empire.id][0]}</p><strong>${EMPIRE_LORE[empire.id][1]}</strong><small>این مزیت هنگام استقرار قلعه در مرزهای این امپراطوری فعال است.</small>`;
    box.addEventListener("pointerdown", e => e.stopPropagation());
    box.querySelector("button").onclick = () => box.remove();
    document.getElementById("worldMapLayer").appendChild(box);
  }
  function hitEmpire(clientX, clientY) {
    if (APP.map.camera.zoom >= 1.18) return null;
    const rect = document.getElementById("worldMapLayer").getBoundingClientRect();
    return EMPIRES.find((e, i) => {
      const c = empireCenters[i],
        [x, y] = mapToScreen(c.q, c.r);
      return Math.abs(clientX - rect.left - x) < 34 && Math.abs(clientY - rect.top - y + 10) < 40;
    });
  }
  function showBuildingLabels(duration = 2600) {
    const now = performance.now();
    if (!state.labelsVisibleUntil || now > state.labelsVisibleUntil + 420) state.labelsFadeStart = now;
    state.labelsVisibleUntil = now + duration;
    stage.classList.add("show-world-labels");
    if (state.labelsAnimationRaf) return;
    const frame = () => {
      state.labelsAnimationRaf = 0;
      if (APP.currentMode === "territory" && !document.hidden) scheduleTerritoryRender();
      if (performance.now() < state.labelsVisibleUntil + 420) state.labelsAnimationRaf = requestAnimationFrame(frame);
      else { stage.classList.remove("show-world-labels");state.labelsVisibleUntil=0; }
    };
    state.labelsAnimationRaf = requestAnimationFrame(frame);
  }
  const TERRITORY_LAYOUT_VERSION = 3;
  const TERRITORY_LAYOUT = Object.freeze({
    castle: [0, 0], barracks: [-2, -3], hospital: [-5, 1],
    embassy: [3, -3], research: [2, 1],
    camp: [-5, -1], hideout: [5, -1],
    farm: [1, 3], lumber: [2, 3], stone: [-5, 3], iron: [-4, 3]
  });
  // Explicit axial offsets: footprint values are the actual number of occupied cells.
  const FOOTPRINTS = Object.freeze({
    1: Object.freeze([[0, 0]]),
    4: Object.freeze([[0, 0], [1, 0], [0, 1], [1, 1]]),
    7: Object.freeze([[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]),
    3: Object.freeze([[0, 0], [1, 0], [0, 1]])
  });
  const state = {
    cells: [],
    images: new Map(),
    terrainCanvas: null,
    canvas: null,
    ctx: null,
    bounds: null,
    camera: {
      x: 0,
      y: 0,
      zoom: 1
    },
    pointers: new Map(),
    gesture: null,
    raf: 0,
    dirty: false,
    selectedId: null,
    selectedType: null,
    actionMenu: null,
    moveBuildingId: null,
    pendingMove: null,
    labelNodes: new Map(),
    progressNode: null,
    cameraAnimation: 0,
    buildings: BUILDINGS.map(b => {
      const large = ["castle", "barracks", "hospital", "research", "embassy"].includes(b.id);
      const [q, r] = TERRITORY_LAYOUT[b.id];
      return {
        ...b, q, r, footprint: b.id === "castle" ? 7 : b.id === "barracks" ? 3 : large ? 4 : 1,
        width: Math.sqrt(3) * CONFIG.hexSize * (b.id === "castle" ? 3.2 : large ? 2.5 : 1) * (b.id === "castle" ? 1 : large ? 0.82 : 0.92),
        height: CONFIG.hexSize * (large ? (b.id === "castle" ? 5.5 : 4.5) : 2.2)
      };
    }),
    labelsHideTimer: 0
  };
  const key = (q, r) => `${q},${r}`;
  const distance = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
  function center(q, r) {
    const s = CONFIG.hexSize;
    return [s * Math.sqrt(3) * (q + r / 2), s * (1.5 * r)];
  }
  function hexPoints(cx, cy) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i + 30);
      points.push([cx + CONFIG.hexSize * Math.cos(a), cy + CONFIG.hexSize * Math.sin(a)]);
    }
    return points;
  }


  // Generated WebP alpha bounds and safe, aspect-preserving footprint fits.
  const BUILDING_ART = Object.freeze({
  "barracks": {
    "size": [
      1536,
      1024
    ],
    "box": [
      177,
      18,
      1360,
      1008
    ],
    "footprint": 3
  },
  "castle": {
    "size": [
      1295,
      1214
    ],
    "box": [
      103,
      8,
      1242,
      1192
    ],
    "footprint": 7
  },
  "hospital": {
    "size": [
      1536,
      1024
    ],
    "box": [
      59,
      12,
      1404,
      996
    ],
    "footprint": 4
  },
  "embassy": {
    "size": [
      1536,
      1024
    ],
    "box": [
      25,
      1,
      1518,
      1024
    ],
    "footprint": 4
  },
  "research": {
    "size": [
      1536,
      1024
    ],
    "box": [
      0,
      0,
      1524,
      1024
    ],
    "footprint": 4
  },
  "camp": {
    "size": [
      1312,
      1199
    ],
    "box": [
      0,
      5,
      1296,
      1150
    ],
    "footprint": 1
  },
  "hideout": {
    "size": [
      1330,
      1182
    ],
    "box": [
      0,
      0,
      1295,
      1182
    ],
    "footprint": 1
  },
  "lumber": {
    "size": [
      1347,
      1167
    ],
    "box": [
      113,
      20,
      1317,
      1145
    ],
    "footprint": 1
  },
  "farm": {
    "size": [
      1351,
      1164
    ],
    "box": [
      49,
      21,
      1337,
      1164
    ],
    "footprint": 1
  },
  "iron": {
    "size": [
      1327,
      1185
    ],
    "box": [
      0,
      20,
      1309,
      1185
    ],
    "footprint": 1
  },
  "stone": {
    "size": [
      1348,
      1167
    ],
    "box": [
      0,
      17,
      1318,
      1144
    ],
    "footprint": 1
  },
  "construction": {
    "size": [
      1356,
      1159
    ],
    "box": [
      0,
      24,
      1342,
      1159
    ],
    "footprint": 1
  },
  "army-camp": {
    "size": [
      1295,
      1214
    ],
    "box": [
      0,
      11,
      1260,
      1214
    ],
    "footprint": 1
  }
});
