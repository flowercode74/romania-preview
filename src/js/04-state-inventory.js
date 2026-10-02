  // وضعیت مشترک منابع، اتحاد، آموزش و لشکرها
  const APP = {
    resources: {
      wood: 50000,
      food: 50000,
      stone: 50000,
      iron: 50000,
      gold: 500,
      power: 0
    },
    unreadMail: 0,
    unreadItems: 3,
    currentMode: "territory",
    openPage: null,
    inventoryTab: "all",
    messagesTab: "battle",
    reportTab: "attack",
    missionTab: "tutorial",
    marches: [],
    enemyDefeated: {},
    enemyMoves: {},
    collectors: {},
    battleReports: [],
    spawnEmpire: "free",
    selectedMapCell: null,
    secondBuilder: false,
    worker2: {
      task: null,
      endsAt: 0
    },
    research: {
      level: 0,
      task: null
    },
    worker: {
      task: null,
      endsAt: 0
    },
    tutorial: {
      active: true,
      step: -1,
      phase: "welcome"
    },
    missions: {
      day: "",
      collectedTotal: 0,
      dailyCollected: 0,
      inspected: false,
      upgrades: 0,
      trained: 0,
      healed: 0,
      productionUsed: 0,
      buildSpeedUsed: 0,
      troopSpeedUsed: 0,
      healSpeedUsed: 0,
      claimedTutorial: [],
      claimedGrowth: [],
      claimedDaily: []
    },
    tutorialSkipped: false,
    stamina: 100,
    staminaAt: Date.now(),
    shieldUntil: 0,
    productionBoostUntil: 0,
    army: {
      troops: 0,
      wounded: 0,
      training: null,
      training2: null,
      training3: null,
      healing: null
    },
    accountCreatedAt: Date.now(),
    peakPower: 0,
    kills: 0,
    peakKills: 0,
    home: {
      q: 366,
      r: 400
    },
    alliance: null,
    eventEmpire: null,
    wallLevel: 0,
    selectedMapCastle: null,
    map: {
      radius: 100,
      hexSize: 10,
      cells: [],
      castles: [],
      surfaceWidth: 0,
      surfaceHeight: 0,
      bounds: null,
      camera: {
        x: 0,
        y: 0,
        zoom: 1
      },
      pointers: new Map(),
      gesture: null,
      raf: 0,
      moving: false,
      marchNodes: new Map(),
      lastQueueKey: "",
      selection: null,
      cameraAnimation: 0,
      lastMarchFrame: 0
    }
  };
  const RESOURCE_META = {
    wood: {
      label: "چوب",
      image: "assets/resources/wood.webp"
    },
    food: {
      label: "غذا",
      image: "assets/resources/food.webp"
    },
    stone: {
      label: "سنگ",
      image: "assets/resources/stone.webp"
    },
    iron: {
      label: "آهن",
      image: "assets/resources/iron.webp"
    }
  };

  // هر نوع منبع پنج بسته دارد؛ نام بسته فقط مقدار آن است، نه «بسته چوب».
  const RESOURCE_PACKS = [5000, 10000, 20000, 50000, 100000];
  const PACK_COUNTS = {
    5000: 20,
    10000: 10,
    20000: 10,
    50000: 2
  }; // مجموع هر منبع = 500k
  // موجودی آیتم‌ها و بسته‌های منابع
  const INVENTORY = [];
  Object.entries(RESOURCE_META).forEach(([resource, meta]) => {
    RESOURCE_PACKS.forEach(value => INVENTORY.push({
      id: `${resource}-${value}`,
      name: formatCompact(value),
      resource,
      resourceName: meta.label,
      value,
      count: value === 5000 ? 2 : 0,
      category: "resources",
      image: meta.image
    }));
  });
  INVENTORY.push({
    id: "speed-60",
    name: "تسریع ۱ دقیقه",
    count: 20,
    category: "speed",
    emoji: "⚡",
    value: 60_000
  }, {
    id: "speed-1",
    name: "تسریع ۵ دقیقه",
    count: 14,
    category: "speed",
    emoji: "⚡",
    value: 300_000
  }, {
    id: "speed-10",
    name: "تسریع ۱۰ دقیقه",
    count: 10,
    category: "speed",
    emoji: "⚡",
    value: 600_000
  }, {
    id: "speed-2",
    name: "تسریع ۳۰ دقیقه",
    count: 8,
    category: "speed",
    emoji: "⚡",
    value: 1_800_000
  }, {
    id: "speed-3600",
    name: "تسریع ۱ ساعت",
    count: 4,
    category: "speed",
    emoji: "⚡",
    value: 3_600_000
  }, {
    id: "spy-eye",
    name: "چشمان جاسوس",
    count: 8,
    category: "other",
    emoji: "◉",
    value: 0
  }, {
    id: "gold-medal",
    name: "نشان طلا",
    count: 32,
    category: "other",
    image: "assets/resources/gold.webp",
    value: 0
  });
  // پاداش‌های دشمن زمان کوتاه و متناسب با درجه دارند تا تسریع یک‌ساعته در ابتدای بازی فراوان نشود.
  for (const family of ["troop", "heal"]) for (const minutes of [1, 5, 10]) INVENTORY.push({
    id: `${family}-speed-${minutes}m`,
    name: `تسریع ${family === "troop" ? "نیرو" : "درمان"} ${minutes} دقیقه`,
    count: 0,
    category: "utility",
    emoji: family === "troop" ? "⚔" : "✚",
    value: minutes * 60000
  });
  // تسریع حرکت فقط به زمان باقیمانده مسیر اعمال می‌شود.
  INVENTORY.push({
    id: "march-speed-10",
    name: "تسریع حرکت ۱۰٪",
    count: 5,
    category: "utility",
    emoji: "⚡",
    value: .1
  }, {
    id: "march-speed-50",
    name: "تسریع حرکت ۵۰٪",
    count: 2,
    category: "utility",
    emoji: "⚡",
    value: .5
  });
  INVENTORY.push({
    id: "teleport-random",
    name: "جابجایی تصادفی",
    count: 2,
    category: "utility",
    emoji: "✧",
    value: 0
  }, {
    id: "teleport-target",
    name: "جابجایی دلخواه",
    count: 2,
    category: "utility",
    emoji: "⌖",
    value: 0
  }, {
    id: "shield-8h",
    name: "شیلد ۸ ساعته",
    count: 2,
    category: "shield",
    emoji: "🛡",
    value: 8 * 3600000
  }, {
    id: "shield-24h",
    name: "شیلد ۲۴ ساعته",
    count: 1,
    category: "shield",
    emoji: "🛡",
    value: 24 * 3600000
  }, {
    id: "production-boost",
    name: "جهش تولید ۱ ساعته",
    count: 2,
    category: "utility",
    emoji: "✦",
    value: 3600000
  }, {
    id: "troop-speed-60",
    name: "تسریع نیرو ۶۰ دقیقه",
    count: 1,
    category: "utility",
    emoji: "⚔",
    value: 3600000
  }, {
    id: "heal-speed-10",
    name: "تسریع درمان ۱۰ دقیقه",
    count: 1,
    category: "utility",
    emoji: "✚",
    value: 600000
  });
  // تعریف خانواده‌های تسریع؛ اندازه‌های مختلف هر خانواده تصویر مشترک دارند.
  for (const family of ["build", "troop", "heal", "universal", "research"]) for (const minutes of ["universal", "research"].includes(family) ? [10, 30, 60] : [1, 5, 10, 30, 60]) {
    const id = family === "build" ? {
      1: "speed-60",
      5: "speed-1",
      10: "speed-10",
      30: "speed-2",
      60: "speed-3600"
    }[minutes] : `${family}-speed-${minutes}m`;
    let item = INVENTORY.find(i => i.id === id);
    if (!item) {
      item = {
        id,
        count: 1
      };
      INVENTORY.push(item);
    }
    Object.assign(item, {
      name: `تسریع ${minutes} دقیقه ${{
        build: "ساخت‌وساز",
        troop: "نیرو",
        heal: "درمان",
        universal: "عمومی",
        research: "پژوهش"
      }[family]}`,
      category: family === "build" ? "speed" : "utility",
      family,
      value: minutes * 60000
    });
  }
  INVENTORY.push({
    id: "shield-2",
    name: "سپر ۲ ساعته",
    count: 2,
    category: "shield",
    value: 7200000
  }, {
    id: "teleport-empire",
    name: "جابجایی در امپراطوری",
    count: 1,
    category: "utility"
  }, ...[5, 20, 50].map(value => ({
    id: `stamina-${value}`,
    name: `استقامت +${value}`,
    count: 2,
    category: "utility",
    value
  })), {
    id: "march-recall",
    name: "بازگرداندن لشکر",
    count: 10,
    category: "utility"
  });
  const LEGACY_ITEMS = {
    "troop-speed-60": "troop-speed-60m",
    "heal-speed-10": "heal-speed-10m"
  };
  for (const [oldId, newId] of Object.entries(LEGACY_ITEMS)) {
    const old = INVENTORY.find(i => i.id === oldId),
      replacement = INVENTORY.find(i => i.id === newId);
    if (old && replacement) replacement.count += old.count;
  }
  for (let i = INVENTORY.length - 1; i >= 0; i--) if (["spy-eye", "gold-medal", ...Object.keys(LEGACY_ITEMS)].includes(INVENTORY[i].id)) INVENTORY.splice(i, 1);
  const resourceImages = {
    food: "food",
    wood: "wood",
    stone: "stone",
    iron: "iron"
  };
  const speedImages = {
    build: "speed-build",
    troop: "speed-troop",
    heal: "speed-heal",
    research: "speed-research",
    universal: "speed-universal"
  };
  for (const item of INVENTORY) {
    let imageName;
    if (item.resource) {
      imageName = resourceImages[item.resource];
    } else if (item.family) {
      imageName = speedImages[item.family];
    } else if (item.category === "shield") {
      imageName = "shield";
    } else if (item.id.startsWith("teleport-")) {
      imageName = "teleport";
    } else if (item.id.startsWith("stamina-")) {
      imageName = "stamina";
    } else if (item.id.startsWith("march-speed-")) {
      imageName = "speed-march";
    } else if (item.id === "march-recall") {
      imageName = "march-recall";
    } else if (item.id === "production-boost") {
      imageName = "production-boost";
    }
    item.image = `assets/items/${imageName || item.id}.webp`;
  }
  const TUTORIAL_ORDER = ["castle", "hideout", "farm", "lumber", "stone", "iron", "barracks", "hospital", "research", "embassy", "camp", "wall"];
  const TUTORIAL_REWARD = {
    resources: {
      wood: 45000,
      food: 45000,
      stone: 45000,
      iron: 45000
    },
    label: "۴۵هزار از هر منبع"
  };
  // تعریف مأموریت‌های آموزش، رشد و روزانه
  const MISSION_DATA = {
    tutorial: [...TUTORIAL_ORDER.map((id, index) => ({
      id: `tutorial-${id}`,
      title: index ? id === "wall" ? "دیوار قلعه" : BUILDINGS.find(b => b.id === id).name : "قلعه سطح ۲",
      description: index ? "ساختمان را بسازید" : "قلعه را ارتقا دهید",
      target: index ? 1 : 2,
      buildingId: id,
      reward: TUTORIAL_REWARD
    })), {
      id: "tutorial-train",
      title: "آموزش ۱۰۰ سرباز",
      description: "در سربازخانه نیرو آموزش دهید",
      target: 100,
      reward: TUTORIAL_REWARD
    }, {
      id: "tutorial-heal",
      title: "درمان ۱۰ سرباز",
      description: "مجروحان تمرین را درمان کنید",
      target: 10,
      reward: TUTORIAL_REWARD
    }, {
      id: "tutorial-finish",
      title: "اتمام آموزش",
      description: "مسیر آموزشی را پایان دهید",
      target: 1,
      reward: TUTORIAL_REWARD
    }],
    growth: [...Array.from({
      length: 18
    }, (_, i) => ["castle", ...TUTORIAL_ORDER.slice(1)].map(id => {
      const level = i + (id === "castle" ? 3 : 2);
      return {
        id: `growth-${level}-${id}`,
        title: `${id === "wall" ? "دیوار قلعه" : BUILDINGS.find(b => b.id === id).name} سطح ${level}`,
        description: "ارتقای ساختمان در چرخه رشد",
        target: level,
        buildingId: id,
        reward: {
          resources: {
            wood: level * 3500,
            food: level * 3500,
            stone: level * 3500,
            iron: level * 3500
          },
          label: `${level * 3500} از هر منبع`
        }
      };
    })).flat(), ...TUTORIAL_ORDER.slice(1).map(id => ({
      id: `growth-20-${id}`,
      title: `${id === "wall" ? "دیوار قلعه" : BUILDINGS.find(b => b.id === id).name} سطح ۲۰`,
      description: "آخرین ارتقا",
      target: 20,
      buildingId: id,
      reward: {
        resources: {
          wood: 70000,
          food: 70000,
          stone: 70000,
          iron: 70000
        },
        label: "۷۰هزار از هر منبع"
      }
    }))],
    daily: [["login", "ورود روزانه", 1, 20, "food-5000"], ["upgrade", "ارتقای یک ساختمان", 1, 70, "wood-5000"], ["heal", "درمان ۵۰ سرباز", 50, 70, "food-5000"], ["train", "ساخت ۱۰۰ سرباز", 100, 70, "iron-5000"], ["production", "آیتم جهش تولید", 1, 70, "stone-5000"], ["build-speed", "۶۰ دقیقه تسریع ساخت", 60, 70, "wood-5000"], ["troop-speed", "۶۰ دقیقه تسریع نیرو", 60, 70, "iron-5000"], ["heal-speed", "۱۰ دقیقه تسریع درمان", 10, 60, "food-5000"]].map(([id, title, target, gold, item]) => ({
      id,
      title,
      description: title,
      target,
      reward: {
        resources: {
          gold
        },
        items: [{
          id: item,
          count: 1
        }],
        label: `${gold} سکه + بسته منابع`
      }
    }))
  };
  // آیتم بازگرداندن به طور منظم از ورود روزانه به دست می‌آید.
  MISSION_DATA.daily[0].reward.items.push({
    id: "march-recall",
    count: 1
  });
  const VIP_BENEFITS = ["صفحه پروفایل ویژه", "صف نوبت ساخت بیشتر", "تسریع تولید منابع", "پاداش ورود بهتر", "پاداش فعالیت بیشتر", "تسریع ساخت‌وساز", "پاداش مأموریت بیشتر", "تخفیف آیتم‌های کاربردی", "پاداش روزانه ویژه", "تسریع آموزش", "پاداش اتحاد", "جایزه ویژه سطح 12"];
  const VIP_THRESHOLDS = [0, 500, 1200, 2200, 3500, 5200, 7400, 10000, 13200, 17000, 21500, 27000];

