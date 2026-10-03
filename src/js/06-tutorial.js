  // اعلان مشترک بالاتر از صفحات؛ یک پیام فعال و حذف تکرارهای سریع.
  let noticeTimer = 0,
    noticeLast = "",
    noticeAt = 0;
  function showBuildNotice(message) {
    if (message === noticeLast && Date.now() - noticeAt < 2500 || noticeAt && Date.now() - noticeAt < 450) return;
    noticeLast = message;
    noticeAt = Date.now();
    clearTimeout(noticeTimer);
    let node = document.getElementById("gameNotice");
    if (!node) {
      node = document.createElement("div");
      node.id = "gameNotice";
      node.className = "game-notice";
      node.setAttribute("role", "status");
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.hidden = false;
    noticeTimer = setTimeout(() => {
      node.hidden = true;
    }, 2600);
  }
  // تایپوگرافی دیالوگ: لمس اول متن را کامل، لمس بعد مرحله را جلو می‌برد.
  let narratorTimer = 0,
    narratorFull = "",
    narratorTyping = false;
  function setNarratorText(text) {
    clearTimeout(narratorTimer);
    narratorFull = text;
    narratorTyping = true;
    const node = document.getElementById("tutorialText");
    node.textContent = "";
    let index = 0;
    const write = () => {
      index = Math.min(text.length, index + 2);
      node.textContent = text.slice(0, index);
      if (index < text.length) narratorTimer = setTimeout(write, 24);else narratorTyping = false;
    };
    write();
  }
  function advanceNarrator() {
    if (narratorTyping) {
      clearTimeout(narratorTimer);
      narratorTyping = false;
      document.getElementById("tutorialText").textContent = narratorFull;
      return;
    }
    if (APP.tutorial.phase === "ui-tour") showUITour((APP.tutorial.uiIndex || 0) + 1);else if (APP.tutorial.step < 0 && APP.tutorial.phase !== "story") beginRoyalStory();else if (APP.tutorial.phase !== "story") hideTutorialCard();
  }
  // آموزش اجباری و مکالمه داستانی مشاور
  function setupTutorial() {
    let overlay = document.getElementById("tutorialOverlay");
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.id = "tutorialOverlay";
      overlay.className = "tutorial-overlay";
      overlay.innerHTML = `<div class="tutorial-card"><img class="tutorial-helper" src="assets/characters/narrator-ariwan.webp" alt="مشاور" onerror="this.style.display='none'"><div class="tutorial-copy"><small>مشاور سلطنتی</small><h2 id="tutorialTitle">خوش آمدید، سرورم!</h2><p id="tutorialText"></p><div class="tutorial-actions"><button id="tutorialNext" type="button">شروع آموزش</button><button id="tutorialSkip" type="button">بازی را بلدم</button></div><div id="tutorialSkipConfirm" class="tutorial-skip-confirm" hidden>تمام مراحل آموزش رد شوند؟<div><button type="button" id="tutorialSkipYes">بله</button><button type="button" id="tutorialSkipNo">خیر</button></div></div></div></div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById("tutorialNext")?.addEventListener("click", advanceNarrator);
    overlay.addEventListener("click", event => {
      if (!event.target.closest("button,input")) advanceNarrator();
    });
    document.getElementById("tutorialSkip")?.addEventListener("click", () => {
      document.getElementById("tutorialSkipConfirm").hidden = false;
    });
    document.getElementById("tutorialSkipNo")?.addEventListener("click", () => {
      document.getElementById("tutorialSkipConfirm").hidden = true;
    });
    document.getElementById("tutorialSkipYes")?.addEventListener("click", () => {
      APP.tutorialSkipped = true;
      APP.wallLevel = Math.max(1, APP.wallLevel);
      state.buildings.forEach(b => {
        b.level = b.id === "castle" ? Math.max(2, b.level) : Math.max(1, b.level);
      });
      updatePower();
      drawWorld();
      positionWorldOverlays();
      APP.tutorial.step = BUILD_ORDER.length;
      document.getElementById("tutorialSkipConfirm").hidden = true;
      finishTutorial();
      hideTutorialCard();
    });
    document.body.classList.toggle("tutorial-active", APP.tutorial.active);
    if (APP.tutorial.active) {
      if (APP.tutorial.phase === "ui-tour") {
        showUITour(APP.tutorial.uiIndex || 0);
        return;
      }
      if (APP.tutorial.step < 0) {
        document.getElementById("tutorialSkip").hidden = false;
        overlay.classList.add("is-welcome");
        document.getElementById("tutorialTitle").textContent = "خوش آمدید، سرورم!";
        setNarratorText("خوش اومدید سرورم، من آریوان هستم، مشاور اصلی شما در حکومت. از امروز با هم این سرزمین را به امپراتوری بزرگی تبدیل می‌کنیم.");
        document.getElementById("tutorialNext").textContent = "شروع آموزش";
        overlay.classList.add("is-visible");
      } else {
        document.getElementById("tutorialSkip").hidden = true;
        overlay.classList.remove("is-welcome");
        syncTutorialProgress(true);
      }
    }
  }
  function beginRoyalStory(scene = 0, response = "") {
    const scenes = [["این نشان سلطنتی… شاهزاده، خود شمایید؟ سال‌هاست در انتظار بازگشتتان هستیم.", ["بازگشته‌ام تا خانه‌مان را دوباره بسازم.", "آریوان؟ چه بر سر این قلعه آمده؟"]], ["پس از درگذشت پادشاه، دروازه‌ها بسته شد و مردم پراکنده شدند. اما هنوز کسانی هستند که به خاندان شما وفادارند.", ["آن‌ها را گرد هم بیاور؛ تنها نخواهیم ماند.", "اول باید امنیت و غذای مردم را تأمین کنیم."]], ["فرمانتان امید را زنده می‌کند، سرورم. خزانه اندک است، اما با بازسازی قلعه و کارگاه‌ها می‌توانیم دوباره برخیزیم.", ["از قلعه شروع می‌کنیم. راه را نشانم بده.", "قدم‌به‌قدم پیش می‌رویم. آماده‌ام."]]];
    APP.tutorial.phase = "story";
    const overlay = document.getElementById("tutorialOverlay");
    overlay.classList.add("is-visible", "is-welcome");
    document.getElementById("tutorialTitle").textContent = ["بازگشت وارث", "قلعه‌ای در سکوت", "سپیده‌دم فرمانروایی"][scene];
    setNarratorText((response ? "شما: «" + response + "»\n\n" : "") + scenes[scene][0]);
    document.getElementById("tutorialNext").hidden = true;
    document.getElementById("tutorialSkip").hidden = true;
    document.getElementById("storyChoices")?.remove();
    const choices = document.createElement("div");
    choices.id = "storyChoices";
    choices.className = "story-choices";
    scenes[scene][1].forEach(text => {
      const button = document.createElement("button");
      button.textContent = text;
      button.onclick = () => {
        if (narratorTyping) {
          advanceNarrator();
          return;
        }
        if (scene < scenes.length - 1) beginRoyalStory(scene + 1, text);else {
          choices.remove();
          document.getElementById("tutorialNext").hidden = false;
          APP.tutorial.step = 0;
          APP.tutorial.phase = "focus";
          overlay.classList.remove("is-welcome");
          syncTutorialProgress(true);
        }
      };
      choices.appendChild(button);
    });
    document.querySelector(".tutorial-copy").appendChild(choices);
  }
  function hideTutorialCard() {
    document.getElementById("tutorialOverlay")?.classList.remove("is-visible");
  }
  function focusBuilding(id, animate = true) {
    const building = buildingById(id);
    if (!building) return;
    cancelAnimationFrame(state.cameraAnimation);
    state.cameraAnimation = 0;
    // A task can finish while the player is still dragging. Let that gesture
    // finish before the tutorial moves the camera to its next target.
    if (state.pointers.size) { state.deferredCameraFocus = id; return; }
    state.deferredCameraFocus = null;
    const [x, y] = id === "wall" ? [TERRITORY.gateX, TERRITORY.gateY] : buildingCenter(building);
    const start = {
      ...state.camera
    };
    const target = {
      x,
      y,
      zoom: Math.min(territoryZoomLimits().max, Math.max(state.camera.zoom, territoryZoomLimits().min * 1.55))
    };
    if (!animate || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      Object.assign(state.camera, target);
      clampCamera();
      applyCamera();
      return;
    }
    const began = performance.now();
    function frame(time) {
      if (state.pointers.size) {state.cameraAnimation = 0;state.deferredCameraFocus = id;return;}
      const t = Math.min(1, (time - began) / 650);
      const ease = 1 - Math.pow(1 - t, 3);
      state.camera.x = start.x + (target.x - start.x) * ease;
      state.camera.y = start.y + (target.y - start.y) * ease;
      state.camera.zoom = start.zoom + (target.zoom - start.zoom) * ease;
      clampCamera();
      applyCamera();
      positionBuildingActionMenu();
      if (t < 1) state.cameraAnimation = requestAnimationFrame(frame);
    }
    state.cameraAnimation = requestAnimationFrame(frame);
  }
  function showTutorialStep() {
    const overlay = document.getElementById("tutorialOverlay");
    if (!overlay || !APP.tutorial.active) return;
    const id = BUILD_ORDER[APP.tutorial.step];
    const b = buildingById(id);
    APP.tutorial.phase = "focus";
    state.missionFocus = {id,action:"upgrade"};
    state.selectedId = null;
    hideBuildingActionMenu();
    drawWorld();
    positionWorldOverlays();
    focusBuilding(id);
    document.getElementById("tutorialNext").textContent = "متوجه شدم";
    document.getElementById("tutorialTitle").textContent = `گام ${APP.tutorial.step + 1} از ${BUILD_ORDER.length}`;
    const action = b?.level > 0 ? "ارتقا" : "ساخت";
    setNarratorText(`${b?.name || "ساختمان"} را انتخاب کنید، دکمه ${action} را بزنید و پیشرفت آن را تا پایان دنبال کنید.`);
    const mission = document.getElementById("missionStatusText");
    if (mission) mission.textContent = `${action} ${b?.name || "ساختمان"}`;
    overlay.classList.add("is-visible");
    applyTutorialGuidance();
    updateMissionStatus();
  }
  function syncTutorialProgress(forceShow = false) {
    if (!APP.tutorial.active || APP.tutorial.step < 0 || APP.tutorial.phase === "ui-tour") return;
    let changed = false;
    while (APP.tutorial.step < BUILD_ORDER.length && (buildingById(BUILD_ORDER[APP.tutorial.step])?.level || 0) >= (APP.tutorial.step === 0 ? 2 : 1)) {
      APP.tutorial.step++;
      changed = true;
    }
    if (!APP.worker.task && !hasTrainingTasks() && !APP.army.healing) document.body.classList.remove("tutorial-working");
    if (APP.tutorial.step >= BUILD_ORDER.length) {
      if(APP.worker.task?.id==="camp" && buildingById("camp").level<2 && APP.tutorial.uiComplete){hideTutorialCard();return;}
      const next = tutorialArmyStage();
      if (forceShow || APP.tutorial.phase !== next) finishTutorial();
    } else if (APP.worker.task?.id === tutorialTargetId()) {
      APP.tutorial.phase = "working";
      document.body.classList.add("tutorial-working");
      hideTutorialCard();
    } else if (changed || forceShow) showTutorialStep();
    if (changed || forceShow) saveGameProgress();
  }
  // آشنایی با رابط پس از ساخت: هر مرحله یک هدف روشن دارد و پیشرفت آن ذخیره می‌شود.
  const UI_TOUR = [[".hud-resources", "چهار منبع اصلی", "چوب، گندم، سنگ و آهن برای ساخت و ارتقا مصرف می‌شوند. ساختمان‌های تولیدی آن‌ها را به‌مرور تولید می‌کنند و منابع سقف انبار ندارند."], [".hud-gold", "سکه", "سکه برای اتمام آنی ارتقا، آیتم‌ها و امکانات بازی کاربرد دارد. مأموریت‌های روزانه یکی از راه‌های کسب آن هستند."], [".hud-power", "قدرت قلعه", "قدرت حاصل از سطح ساختمان‌ها اینجا دیده می‌شود. ارتقای قلعه و ساختمان‌های نظامی سهم بیشتری در قدرت دارند."], ["#profileButton", "پروفایل شما", "روی تصویر بازیکن بزنید: اطلاعات حساب، اتحاد، ویژه، قدرت، کشتار و استقامت در پروفایل دیده می‌شود.", "profile"], ["#shieldButton", "محافظت از قلعه", "شیلدهای ۸ و ۲۴ ساعته از قلعه محافظت می‌کنند. مدت محافظت را همیشه بررسی کنید.", "shield"], ["#eventsButton", "رویدادها", "از این دکمه رویدادهای بازی را بررسی می‌کنید. برج مرکز جهان برای رویداد پایانی سرور در نظر گرفته شده است.", "events"], ['[data-action="items"]', "آیتم‌های شما", "بسته منابع، تسریع، شیلد و جابجایی در کیف شما هستند. منابع داخل بسته‌ها تنها بعد از استفاده به حساب اضافه می‌شوند.", "items"], ['[data-action="messages"]', "پیام‌ها و گزارش‌ها", "پیام‌های سیستم و گزارش‌های نبرد را در این بخش دنبال کنید.", "messages"], ["#missionStatus", "مأموریت‌ها", "پاداش‌های آموزش را دریافت کنید. پس از دریافت همه آن‌ها، مأموریت‌های رشد و روزانه فعال می‌شوند.", "missions"], ["#marchToggle", "صف کارگر و لشکر", "در پنل وضعیت، پیشرفت کارگر و چهار صف لشکر را می‌بینید. انتخاب یک لشکر، دوربین را به موقعیت فعلی آن می‌برد."], ['[data-action="map"]', "نقشه جهان", "پس از پایان آموزش می‌توانید جهان را بررسی کنید. انتخاب کاشی فقط در نمای نزدیک فعال است؛ از جستجو، نشان‌ها و دکمه قلعه من استفاده کنید."], ["#territoryPerk", "مزیت محل استقرار", "مرز هر امپراطوری مزیت تولید خاصی دارد. در زمین آزاد، زمان حرکت لشکر ۵٪ کمتر است."], ['[data-action="heroes"]', "قهرمان‌ها", "این بخش برای قهرمان‌های آینده بازی در نظر گرفته شده و در نسخه فعلی غیرفعال است."]];
  function clearTourFocus() {
    document.querySelectorAll(".tutorial-focus").forEach(n => n.classList.remove("tutorial-focus"));
  }
  function showUITour(index = 0) {
    APP.tutorial.phase = "ui-tour";
    APP.tutorial.uiIndex = index;
    closePanels();
    hideBuildingActionMenu();
    clearTourFocus();
    if (index >= UI_TOUR.length) {
      APP.tutorial.uiComplete = true;
      finishTutorial();
      return;
    }
    const [selector, title, text] = UI_TOUR[index],
      overlay = document.getElementById("tutorialOverlay");
    document.body.classList.add("ui-tour");
    document.querySelector(selector)?.classList.add("tutorial-focus");
    overlay.classList.remove("is-welcome");
    overlay.classList.add("is-visible");
    document.getElementById("tutorialTitle").textContent = `${title} · ${index + 1}/${UI_TOUR.length}`;
    setNarratorText(text);
    document.getElementById("tutorialNext").hidden = false;
    document.getElementById("tutorialNext").textContent = index === UI_TOUR.length - 1 ? "پایان آموزش" : "مرحله بعد";
    document.getElementById("tutorialSkip").hidden = false;
    saveGameProgress();
  }
  function openTourTarget() {
    const type = UI_TOUR[APP.tutorial.uiIndex]?.[3];
    if (!type) return;
    if (type === "profile") openProfile();else if (type === "shield") openShield();else if (type === "items") openInventory("all");else if (type === "messages") openMessages();else if (type === "missions") openMissions();else openPage("events", '<div class="shield-content"><h2>رویدادها</h2><p>رویداد فعالی ثبت نشده است.</p></div>');
    document.getElementById("tutorialOverlay").classList.add("is-visible");
  }
  // تمرین اولیه نیرو و درمان پس از ساخت ساختمان‌ها؛ مجروح تمرینی فقط یک بار ایجاد می‌شود.
  function showArmyTutorial(kind) {
    APP.tutorial.phase = `army-${kind}`;
    document.body.classList.remove("ui-tour");
    gameNavigation.frames = [];
    trainingOverlay = null; healingOverlay = null;
    if (kind === "healing" && !APP.army.practiceWounded) {
      APP.army.practiceWounded = true;
      const practice=reserveTroops(Math.min(10,APP.army.troops)),stock=woundedStock();
      const count=Object.values(practice).reduce((a,b)=>a+b,0);
      for(const [id,n] of Object.entries(practice))if(n)stock[id]=(stock[id]||0)+n;
      APP.army.troops = Math.max(0, APP.army.troops - count);
      APP.army.wounded += count;
    }
    document.getElementById("tutorialTitle").textContent = kind === "training" ? "آموزش صد سرباز" : "درمان ده مجروح تمرین";
    setNarratorText(kind === "training" ? "در رزمگاه آهن‌پیمان صد نیروی آذرپیمان آموزش دهید. ابتدا روی ساختمان و سپس «ساخت نیرو» بزنید. تعداد نیرو را با اسلایدر انتخاب کنید؛ در زمان انتظار می‌توانید دوربین را حرکت دهید." : "ده سرباز در تمرین دفاعی مجروح شده‌اند. روی دارالشفای سپیدمهر و سپس «درمان» بزنید.");
    state.selectedId = kind === "training" ? "barracks" : "hospital";
    const b = buildingById(state.selectedId);
    focusBuilding(b.id);
    closePanels();
    state.missionFocus={id:b.id,action:"special"};
    showBuildingLabels();
    hideBuildingActionMenu();
    document.getElementById("tutorialOverlay")?.classList.remove("is-welcome");
    document.getElementById("tutorialOverlay")?.classList.add("is-visible");
    applyTutorialGuidance();
    saveGameProgress();
  }
  function tutorialArmyStage() {
    return !APP.tutorialSkipped && (APP.army.totalTrained||0)<100 ? "army-training" : !APP.tutorialSkipped && (APP.army.totalHealed||0)<10 ? "army-healing" : !APP.tutorialSkipped && !APP.tutorial.uiComplete ? "ui-tour" : "finished";
  }
  function finishTutorial() {
    if (!APP.tutorialSkipped && (APP.army.totalTrained || 0) < 100) return showArmyTutorial("training");
    if (!APP.tutorialSkipped && (APP.army.totalHealed || 0) < 10) return showArmyTutorial("healing");
    if (!APP.tutorialSkipped && !APP.tutorial.uiComplete) return showUITour(APP.tutorial.uiIndex || 0);
    clearTourFocus();
    document.body.classList.remove("ui-tour");
    closePanels();
    APP.tutorial.active = false;
    APP.tutorial.phase = "finished";
    APP.missionTab = "growth";
    document.getElementById("tutorialSkip").hidden = true;
    document.body.classList.remove("tutorial-active");
    const overlay = document.getElementById("tutorialOverlay");
    overlay?.classList.remove("is-visible", "is-welcome");
    showWelcomeCelebration();
    positionWorldOverlays();
    updateMissionStatus();
    if (APP.openPage === "missions") renderMissions("tutorial");
    saveGameProgress();
  }
  function formatCompact(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n < 1000) return String(Math.floor(n));
    const k = Math.floor(n * 10 / 1000) / 10;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[char]);
  }

