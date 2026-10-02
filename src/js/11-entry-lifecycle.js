  // شروع حساب و گذر از صفحه ورود
  function startGame(asGuest) {
    state.gameStarted = true;
    if (!APP.map.bounds) createWorldMap();
    if (asGuest) {
      for (const key of [SAVE_KEY, "romaniaProgressV3", "romaniaResourcesV2", "romaniaVipPointsV2", "romaniaVipDailyV2", "romaniaMapBookmarksV1"]) try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn("Romania: unable to reset local progress", error);
      }
      lastEconomyTick = Date.now();
      ensureMissionDay();
      saveGameProgress();
    } else loadGameProgress();
    const own = APP.map.castles.find(c => c.own);
    if (own && !mapBuildingFits(APP.home.q, APP.home.r, own.id)) {
      let fallback = null;
      for (let d = 0; d < 150 && !fallback; d++) for (let dq = -d; dq <= d && !fallback; dq++) for (const dr of [-d, d]) {
        const q = APP.home.q + dq,
          r = APP.home.r + dr;
        if (!insideEventArea(q, r) && mapBuildingFits(q, r, own.id)) {
          fallback = {
            q,
            r
          };
          break;
        }
      }
      if (fallback) {
        APP.home = fallback;
        APP.marches = [];
      }
    }
    if (own) Object.assign(own, APP.home);
    fitBuildingsToCourtyard();
    document.getElementById("entryScreen").hidden = true;
    applySkinAppearance();
    updatePower();
    updatePerkHud();
    saveGameProgress();
    updateTopHud();
    updateBadges();
    tickBuildingTask();
    drawWorld();
    positionWorldOverlays();
    updateBuildingProgress();
    ensureStarterEnemy();
    for (const c of Object.values(APP.collectors)) c.loginReady = c.amount >= 1;
    tickCollectors();
    setupTutorial();
    setInterval(tickBuildingTask, 1000);
    setInterval(saveGameProgress, 60000);
    requestAnimationFrame(updateMarches);
  }
  // انتخاب ناحیه پیش از ورود: تمام شروع‌ها در حاشیه امن و میان دشمنان کم‌درجه‌اند.
  function findSpawn(region, random = Math.random) {
    if (!APP.map.bounds) createWorldMap();
    const candidates = [];
    for (let q = 45; q < 755; q += 5) for (let r = 45; r < 755; r += 5) {
      const distance = Math.hypot(q - 400, r - 400);
      if (distance < 320 || distance > 355) continue;
      if ((empireAt(q, r)?.id || "free") !== region) continue;
      if (validTeleportTarget({
        q,
        r
      })) candidates.push({
        q,
        r
      });
    }
    if (!candidates.length) return null;
    return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  }
  function showSpawnSelection() {
    const entry = document.getElementById("entryScreen");
    entry.hidden = false;
    const card = entry.querySelector(".entry-card");
    card.innerHTML = `<h1>آغاز فرمانروایی</h1><p>محل شروع خود را انتخاب کنید؛ در حاشیه امن همان ناحیه مستقر می‌شوید.</p><div class="spawn-options">${[...EMPIRES, {
      id: "free",
      name: "سرزمین آزاد",
      image: "assets/empires/neutral.webp"
    }].map(e => `<button type="button" data-spawn="${e.id}"><img src="${e.image}" alt=""><strong>${e.name}</strong><small>${e.id === "free" ? "۵٪ کاهش زمان حرکت لشکر" : EMPIRE_LORE[e.id][1]}</small></button>`).join("")}</div><details class="spawn-rules"><summary>قوانین و مقررات بازی</summary><p>رفتار محترمانه با بازیکنان، پرهیز از تقلب و سوءاستفاده از باگ و رعایت عدالت در رقابت الزامی است. نتایج و منابع نسخه آنلاین باید توسط سرور تأیید شوند. این نسخه آزمایشی است و پیشرفت میهمان روی همین دستگاه نگهداری می‌شود.</p></details><label class="spawn-consent"><input id="spawnAccept" type="checkbox"> قوانین را خوانده‌ام و با آن‌ها موافقم.</label><button id="enterRomania" type="button" disabled>ورود به جهان رومانیا</button><p id="spawnError" role="status"></p>`;
    let region = null;
    const enter = card.querySelector("#enterRomania"),
      accept = card.querySelector("#spawnAccept");
    const validate = () => {
      enter.disabled = !region || !accept.checked;
    };
    card.querySelectorAll("[data-spawn]").forEach(button => button.onclick = () => {
      region = button.dataset.spawn;
      card.querySelectorAll("[data-spawn]").forEach(b => b.classList.toggle("is-selected", b === button));
      validate();
    });
    accept.addEventListener("change", validate);
    enter.onclick = () => {
      if (!region || !accept.checked) return;
      enter.disabled = true;
        entry.hidden = true;
      const loading = document.getElementById("loadingScreen");
      loading.classList.remove("is-hidden");
      loading.hidden = false;
      loadingScreen(() => {
        const home = findSpawn(region);
        if (!home) {
          entry.hidden = false;
          loading.classList.add("is-hidden");
          card.querySelector("#spawnError").textContent = "محل مناسب پیدا نشد؛ دوباره انتخاب کنید.";
          validate();
          return;
        }
        APP.home = home;
        APP.spawnEmpire = region;
        APP.rulesAcceptedAt = Date.now();
        startGame(true);
      });
    };
  }
  function readStoredObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return validObject(value) ? value : null;
    } catch {
      return null;
    }
  }
  function hasSavedProgress() {
    const current = readStoredObject(SAVE_KEY);
    if (current?.version === 4) return true;
    if (current) return false;
    return ["romaniaProgressV3", "romaniaResourcesV2"].some(key => readStoredObject(key));
  }
  function setupEntry() {
    const entry = document.getElementById("entryScreen");
    const continueButton = document.getElementById("continueEntry");
    continueButton.hidden = !hasSavedProgress();
    continueButton.addEventListener("click", () => {
      continueButton.disabled = true;
        entry.hidden = true;
      const loading = document.getElementById("loadingScreen");
      loading.classList.remove("is-hidden");
      loadingScreen(() => startGame(false));
    }, { once: true });
    document.getElementById("guestEntry").addEventListener("click", async () => {
      if (hasSavedProgress() && !await gameConfirm("شروع بازی تازه، پیشرفت ذخیره‌شده روی این دستگاه را پاک می‌کند. ادامه می‌دهید؟")) return;
      showSpawnSelection();
    });
    document.getElementById("accountEntry").addEventListener("click", () => {
      const notice = document.getElementById("entryNotice");
      notice.textContent = "اتصال حساب به سرور احراز هویت نیاز دارد و هنوز در این نسخه فعال نیست. برای ادامه روی همین دستگاه، ادامه بازی ذخیره‌شده را انتخاب کنید.";
      notice.hidden = false;
    });
    return () => {
      entry.hidden = false;
      (continueButton.hidden ? document.getElementById("guestEntry") : continueButton).focus();
    };
  }

  // لودینگ و آماده‌سازی دارایی‌ها
  function loadingScreen(onComplete) {
    const screen = document.getElementById("loadingScreen"),
      fill = document.getElementById("loadingProgress"),
      percent = document.getElementById("loadingPercent");
    if (!screen) return;
    const urls = [...new Set(["assets/ui/loading.webp", "assets/ui/player-portrait.webp", "assets/icons/quest.webp", "assets/icons/mail.webp", "assets/icons/world-map.webp", "assets/icons/bag.webp", "assets/icons/hero.webp", ASSETS.atlas, ASSETS.mapAtlas, ASSETS.wall, ASSETS.ruinedWall, ASSETS.construction, ASSETS.capture, ASSETS.armyCamp, ...EMPIRES.map(e => e.image), ...Object.values(ASSETS.buildings), ...CASTLE_SKINS.map(s => s.image), ...AVATAR_SKINS.flatMap(s => [s.avatar, s.portrait])])];
    setTimeout(() => {
      createEmpireLayout();
      createWorldMap();
    }, 0);
    let done = 0;
    let finished = false;
    const complete = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      onComplete();
      screen.classList.add("is-hidden");
    };
    // An unavailable image must not prevent entry; rendering already has fallbacks.
    const timeout = setTimeout(complete, 15000);
    for (const src of urls) {
      loadImage(src).assetReady.then(() => {
        if (finished) return;
        done++;
        const value = Math.round(done / urls.length * 100);
        if (fill) fill.style.width = `${value}%`;
        if (percent) percent.textContent = `${value}%`;
        if (done === urls.length) setTimeout(complete, 180);
      });
    }
  }

  // قرارداد اتصال به سیستم اتحاد و رویداد؛ نسخه فعلی داده را محلی نگه می‌دارد.
  window.addEventListener("pagehide", () => {
    if (state.gameStarted) {
      tickCollectors();
      saveGameProgress();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (state.gameStarted && document.hidden) {
      tickCollectors();
      saveGameProgress();
    }
  });
  window.RomaniaGame = Object.freeze({
    seasonRules: Object.freeze({
      capacity: WORLD.serverCapacity,
      days: WORLD.seasonDays,
      eventStartDay: WORLD.finalEventStartDay,
      eventDays: WORLD.finalEventDays
    }),
    setAlliance(alliance) {
      if (!alliance) {
        APP.alliance = null;
      } else {
        const empire = EMPIRES.find(e => e.id === alliance.empireId);
        if (!empire || typeof alliance.name !== "string") return false;
        APP.alliance = {
          name: alliance.name.slice(0, 80),
          empireId: empire.id,
          logo: safeAssetPath(alliance.logo) || null
        };
      }
      saveGameProgress();
      if (APP.openPage === "profile") openProfile();
      return true;
    },
    completeCapture(empireId) {
      if (!EMPIRES.some(e => e.id === empireId)) return false;
      createEmpireLayout();
      APP.eventEmpire = empireId;
      updatePerkHud();
      saveGameProgress();
      prepareMapOverview();
      if (APP.map.bounds) applyMapCamera();
      return true;
    }
  });

  // ---------------------------------------------------------------------------
  // شروع بازی
  // ---------------------------------------------------------------------------
