  function mapScreenToWorld(clientX, clientY) {
    const layer = document.getElementById("worldMapLayer");
    const rect = layer.getBoundingClientRect();
    return {
      x: (clientX - rect.left - rect.width / 2) / APP.map.camera.zoom + APP.map.camera.x,
      y: (clientY - rect.top - rect.height / 2) / APP.map.camera.zoom + APP.map.camera.y
    };
  }
  function mapWorldToAxial(x, y) {
    const size = APP.map.hexSize,
      aq = (Math.sqrt(3) / 3 * x - y / 3) / size,
      ar = 2 / 3 * y / size;
    let q = Math.round(aq),
      r = Math.round(ar),
      third = Math.round(-aq - ar);
    const dq = Math.abs(q - aq),
      dr = Math.abs(r - ar),
      dt = Math.abs(third + aq + ar);
    if (dq > dr && dq > dt) q = -r - third;else if (dr > dt) r = -q - third;
    return {
      q: q + Math.floor(r / 2),
      r
    };
  }
  function hitMapCastle(clientX, clientY) {
    const layer = document.getElementById("worldMapLayer"),
      rect = layer.getBoundingClientRect(),
      sx = clientX - rect.left,
      sy = clientY - rect.top,
      z = APP.map.camera.zoom;
    return [...APP.map.castles].reverse().find(c => {
      const [x, y] = mapToScreen(c.q, c.r),
        size = 17 * z;
      return sx > x - size * .4 && sx < x + size * .4 && sy > y - size * .7 && sy < y + size * .25;
    }) || null;
  }
  // حرکت نرم دوربین به مختصات یا موقعیت لشکر
  function centerMapOn(q, r, animate = true) {
    const [x, y] = mapCenter(q, r);
    animateMapCamera(x, y, animate);
  }
  function animateMapCamera(x, y, animate = true) {
    cancelAnimationFrame(APP.map.cameraAnimation);
    hideMapActions();
    APP.map.selectedMapCell = null;
    if (!animate || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      APP.map.camera.x = x;
      APP.map.camera.y = y;
      clampMapCamera();
      applyMapCamera();
      return;
    }
    const start = {
        ...APP.map.camera
      },
      began = performance.now();
    const tick = time => {
      const t = Math.min(1, (time - began) / 430),
        ease = 1 - (1 - t) ** 3;
      APP.map.camera.x = start.x + (x - start.x) * ease;
      APP.map.camera.y = start.y + (y - start.y) * ease;
      clampMapCamera();
      applyMapCamera();
      if (t < 1) APP.map.cameraAnimation = requestAnimationFrame(tick);
    };
    APP.map.cameraAnimation = requestAnimationFrame(tick);
  }
  function marchPosition(m, now = Date.now()) {
    if (m.phase === "waiting") return {
      ...m.target
    };
    const route = m.phase === "returning" ? m.reverseRoute || (m.reverseRoute = [...m.route].reverse()) : m.route;
    const progress = marchProgress(m, now),
      index = Math.min(route.length - 2, Math.floor(progress * (route.length - 1)));
    if (route.length < 2) return route[0].wx !== undefined ? {
      x: route[0].wx,
      y: route[0].wy
    } : route[0];
    const t = progress * (route.length - 1) - index;
    const [ax, ay] = routeCenter(route[index]),
      [bx, by] = routeCenter(route[index + 1]);
    return {
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t
    };
  }
  function centerMapOnMarch(id) {
    const m = APP.marches.find(m => m.id === id) || APP.marches[0];
    if (!m) return centerMapOn(APP.home.q, APP.home.r);
    closePanels();
    setWorldMode(true, false);
    const p = marchPosition(m);
    if (p.x !== undefined) animateMapCamera(p.x, p.y);else centerMapOn(p.q, p.r);
  }
  function openMapCastle(castle) {
    if (!castle || APP.map.camera.zoom < MAP_DETAIL_ZOOM) return;
    APP.selectedMapCastle = castle;
    APP.map.selection = {
      kind: "castle",
      castle,
      cell: {
        q: castle.q,
        r: castle.r
      }
    };
    renderMapActions();
  }
  // چهار صف لشکر، استقرار، عضوگیری و بازگشت
  function startMarch(type,selection=null) {
    if (APP.tutorial.active) return;
    const target = APP.selectedMapCastle;
    if (!target || target.own || target.q === 400 && target.r === 400) return;
    if (type === "spy" && Number(target.antiSpyUntil||0)>Date.now()) return showBuildNotice("پردهٔ ضدجاسوسی این قلعه فعال است.");
    if (type === "reinforce" && !APP.marches.some(m => m.id === target.campId && m.type === "camp" && m.phase === "waiting" && m.returnAt > Date.now())) return showBuildNotice("این کمپ دیگر برای عضوگیری فعال نیست.");
    if (APP.marches.length >= WORLD.marchSlots) return showBuildNotice("هر چهار صف لشکر فعال‌اند؛ منتظر بازگشت یک لشکر بمانید.");
    if(!selection){openDeployment(type,target);return false;}
    if(!validDeployment(selection))return showBuildNotice("تعداد نیروهای انتخاب‌شده معتبر نیست.");
    const liveEnemy=target.enemyId?enemies.find(e=>e.id===target.enemyId):null;
    if(target.enemyId&&(!liveEnemy||liveEnemy.q!==target.q||liveEnemy.r!==target.r||liveEnemy.level!==target.enemyLevel||liveEnemy.type!==target.enemyType))return showBuildNotice("موقعیت سرگردان عوض شده؛ دوباره آن را انتخاب کنید.");
    if(target.enemyId&&(!enemyUnlocked(target.enemyType,target.enemyLevel)||(APP.enemyDefeated[target.enemyId]||0)>Date.now()||APP.stamina<5||APP.marches.some(m=>m.enemyId===target.enemyId&&!m.battleResolved)))return showBuildNotice("این حمله دیگر قابل انجام نیست.");
    const now = Date.now();
    const origin = {
      ...APP.home
    };
    const route = findMapRoute(origin, target);
    if (!route) return showBuildNotice("مسیر امنی به مقصد پیدا نشد.");
    const travelMs = Math.max(1000, Math.round((route.length - 1) * 6000 * (activePerk().empire ? 1 : .95)));
    const march = {
      id: `${type}-${now}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      name: target.name,
      origin,
      target: {
        q: target.q,
        r: target.r
      },
      route,
      campId: target.campId || null,
      enemyId: target.enemyId || null,
      enemyLevel: target.enemyLevel || 0,
      enemyType: target.enemyType || 0,
      troops: target.troops || 0,
      armyPower: 0,
      combatPower: 0,
      members: 1,
      phase: "outbound",
      startedAt: now,
      arriveAt: now + travelMs,
      travelMs,
      returnAt: 0
    };
    march.unitCounts=reserveSelectedTroops(selection);
    if(!march.unitCounts)return false;
    march.troops=Object.values(march.unitCounts).reduce((a,b)=>a+b,0);
    march.combatPower=Object.entries(march.unitCounts).reduce((n,[id,count])=>n+troopStats(id).power*count,0);
    if(target.enemyId)APP.stamina-=5;
    document.getElementById("enemySheet")?.remove();
    APP.marches.push(march);
    updatePower();
    saveGameProgress();
    hideMapActions();
    closePanels();
    setWorldMode(true, false);
    renderMarchRoutes();
    renderMarchQueue();
    return true;
  }
  function updateMarches() {
    const now = Date.now();
    const previousState = APP.marches.map(m => m.id + ":" + m.phase).join("|");
    APP.marches.forEach(m => {
      if (m.type !== "reinforce" && m.phase === "outbound" && now >= m.arriveAt) {
        m.phase = "waiting";
        m.returnAt = m.arriveAt + (m.type === "camp" ? WORLD.campDuration : 2000);
        if (m.enemyId) resolveEnemyBattle(m);else if (m.type === "attack") { m.result="مقصد دفاع ثبت‌شده ندارد"; }
      }
    });
    // رسیدن عضو جدید قبل از بررسی انقضای کمپ پردازش می‌شود؛ ترتیب صف اثر منطقی ندارد.
    const merged = new Set();
    APP.marches.forEach(m => {
      if (m.type !== "reinforce" || m.phase !== "outbound" || now < m.arriveAt) return;
      const camp = APP.marches.find(c => c.id === m.campId && c.type === "camp" && c.phase === "waiting" && c.returnAt >= m.arriveAt);
      if (camp) {
        camp.members = (camp.members || 1) + (m.members || 1);
        camp.unitCounts ||= {};for(const [id,n] of Object.entries(m.unitCounts||{}))camp.unitCounts[id]=(camp.unitCounts[id]||0)+n;camp.troops=(camp.troops||0)+(m.troops||0);camp.combatPower=(camp.combatPower||0)+(m.combatPower||0);
        camp.returnAt = m.arriveAt + WORLD.campDuration;
        merged.add(m.id);
      } else {
        m.phase = "returning";
        m.startedAt = m.arriveAt;
        m.arriveAt = m.startedAt + m.travelMs;
      }
    });
    APP.marches = APP.marches.filter(m => {
      if (merged.has(m.id)) return false;
      if (m.phase === "outbound" && now >= m.arriveAt) {
        m.phase = "waiting";
        m.returnAt = m.arriveAt + (m.type === "camp" ? WORLD.campDuration : 2000);
        if (m.enemyId) resolveEnemyBattle(m);else if (m.type === "attack") { m.result="مقصد دفاع ثبت‌شده ندارد"; }
      }
      if (m.phase === "waiting" && now >= m.returnAt) {
        m.phase = "returning";
        m.startedAt = m.returnAt;
        m.arriveAt = m.startedAt + (m.travelMs || 15000);
      }
      if (m.phase === "returning" && now >= m.arriveAt) {
        if ((m.unitCounts || m.enemyId) && !m.troopsRestored) {
          APP.army.troops += Math.max(0, m.troops - (m.lostTroops || 0));
          if (m.unitCounts) {
            APP.army.units ||= {
              sword: 0,
              archer: 0,
              knight: 0
            };
            let losses = m.lostTroops || 0;
            for (const [id, count] of Object.entries(migrateUnitStock(m.unitCounts))) {
              if (!TROOPS[id]) continue;
              const lost = m.casualties ? Math.min(count,m.casualties[id]||0) : Math.min(count, losses);
              losses -= lost;
              APP.army.units[id] = (APP.army.units[id] || 0) + count - lost;
            }
          }
          m.troopsRestored = true;
          updatePower();
        }
        return false;
      }
      return true;
    });
    if (previousState !== APP.marches.map(m => m.id + ":" + m.phase).join("|")) saveGameProgress();
    positionMapActions();
    renderMarchRoutes();
    renderMarchQueue();
    if (!document.hidden && APP.currentMode === "map" && APP.marches.length) setTimeout(updateMarches, 40);else setTimeout(updateMarches, 750);
  }
  function marchProgress(m, now = Date.now()) {
    if (m.phase === "waiting") return 1;
    return Math.max(0, Math.min(1, (now - m.startedAt) / Math.max(1, m.arriveAt - m.startedAt)));
  }
  function pointOnMarch(route, progress) {
    if (route.length < 2) return mapToScreen(route[0].q, route[0].r);
    const index = Math.min(route.length - 2, Math.floor(progress * (route.length - 1)));
    const t = progress * (route.length - 1) - index;
    const [ax, ay] = routeScreen(route[index]),
      [bx, by] = routeScreen(route[index + 1]);
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  }
  function renderMarchRoutes() {
    const svg = document.getElementById("marchSvg");
    if (!svg || !APP.map.bounds || APP.currentMode !== "map") return;
    const ns = "http://www.w3.org/2000/svg";
    const viewport = document.getElementById("worldMapLayer");
    svg.setAttribute("viewBox", `0 0 ${viewport.clientWidth} ${viewport.clientHeight}`);
    const active = new Set();
    const now = Date.now();
    APP.marches.filter(m=>marchVisibleTo(m)).forEach(m => {
      active.add(m.id);
      let node = APP.map.marchNodes.get(m.id);
      if (!node) {
        const line = document.createElementNS(ns, "polyline");
        line.setAttribute("class", "march-road");
        const g = document.createElementNS(ns, "g");
        g.setAttribute("class", "march-army");
        const soldier = document.createElementNS(ns, "svg");
        const spriteImage=document.createElementNS(ns,"image");
        const defs=document.createElementNS(ns,"defs"),filter=document.createElementNS(ns,"filter"),transfer=document.createElementNS(ns,"feComponentTransfer"),alpha=document.createElementNS(ns,"feFuncA");
        filter.setAttribute("id",`army-alpha-${m.id}`);alpha.setAttribute("type","gamma");alpha.setAttribute("amplitude","1");alpha.setAttribute("exponent","8");transfer.appendChild(alpha);filter.appendChild(transfer);defs.appendChild(filter);soldier.appendChild(defs);
        spriteImage.setAttribute("filter",`url(#army-alpha-${m.id})`);
        spriteImage.setAttribute("href","assets/animations/army-directions.webp");spriteImage.setAttribute("width","1024");spriteImage.setAttribute("height","2048");soldier.appendChild(spriteImage);
        soldier.setAttribute("overflow","hidden");
        soldier.setAttribute("viewBox","0 0 256 256");
        soldier.setAttribute("x", "-33");
        soldier.setAttribute("y", "-48");
        soldier.setAttribute("width", "66");
        soldier.setAttribute("height", "66");
        g.appendChild(soldier);
        svg.append(line, g);
        g.dataset.marchId = m.id;
        g.addEventListener("click", e => {
          e.stopPropagation();
          const current = APP.marches.find(a => a.id === m.id);
          if (current?.phase === "waiting" && current.type === "camp") openCampActions(current);else if (current) openMarchActions(current);
        });
        node = {
          line,
          g,
          soldier, spriteImage
        };
        APP.map.marchNodes.set(m.id, node);
      }
      const camp=m.phase==="waiting"&&m.type==="camp";
      const sprite=camp?ASSETS.armyCamp:"assets/animations/army-directions.webp";
      node.spriteImage.setAttribute("filter",camp?"none":`url(#army-alpha-${m.id})`);
      if(node.sprite!==sprite){node.spriteImage.setAttribute("href",sprite);node.spriteImage.setAttribute("width",camp?256:1024);node.spriteImage.setAttribute("height",camp?256:2048);node.sprite=sprite;}
      m.directionRow=marchDirection(m,now);
      const frame=m.phase==="waiting"?0:Math.floor(now/150)%4;
      node.soldier.setAttribute("viewBox",camp?"0 0 256 256":`${frame*256} ${m.directionRow*256} 256 256`);
      const spriteSize=30*APP.map.camera.zoom;
      node.soldier.setAttribute("width",spriteSize);node.soldier.setAttribute("height",spriteSize);
      node.soldier.setAttribute("x",-spriteSize/2);node.soldier.setAttribute("y",-spriteSize/2);
      const route = m.phase === "returning" ? m.reverseRoute || (m.reverseRoute = [...m.route].reverse()) : m.route;
      decorateMarchCombat(node,m,now);
      if (m.phase === "waiting") {
        node.line.style.display = "none";
        const [cx, cy] = mapToScreen(m.target.q, m.target.r);
        node.g.style.display = "block";
        node.g.setAttribute("transform", `translate(${cx} ${cy})`);
        return;
      }
      node.line.style.display = "block";
      const cameraKey = `${APP.map.camera.x.toFixed(2)}:${APP.map.camera.y.toFixed(2)}:${APP.map.camera.zoom.toFixed(3)}:${viewport.clientWidth}:${viewport.clientHeight}:${m.phase}`;
      if (node.cameraKey !== cameraKey) {
        node.line.setAttribute("points", route.map(p => routeScreen(p).map(n => n.toFixed(1)).join(",")).join(" "));
        node.cameraKey = cameraKey;
      }
      const [x, y] = pointOnMarch(route, marchProgress(m, now));
      node.g.style.display = "block";
      node.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
    for (const [id, node] of APP.map.marchNodes) {
      if (active.has(id)) continue;
      node.line.remove();
      node.g.remove();
      APP.map.marchNodes.delete(id);
    }
  }

  // رندر پنل لشکر و کارگر با نوار زمان
  function renderMarchQueue(force = false) {
    const box = document.getElementById("marchQueue"),
      count = document.getElementById("marchCount");
    if (!box) return;
    const activeTab = box.querySelector("[data-march-tab].is-active")?.dataset.marchTab || "armies";
    const now = Date.now();
    const scrollPositions={};box.querySelectorAll('[data-march-content]').forEach(n=>{scrollPositions[n.dataset.marchContent]=n.scrollTop;});
    const queueTasks=[...TRAINING_KEYS.map(k=>APP.army[k]),APP.army.healing,...[APP.worker,APP.worker2].filter(w=>w?.task).map(w=>({...w.task,endsAt:w.endsAt}))].filter(Boolean);
    const taskKey=queueTasks.map(t=>`${t.startedAt}:${Math.ceil(Math.max(0,t.endsAt-now)/1000)}`).join('|');
    const key = taskKey+';'+APP.marches.map(m => `${m.id}:${m.phase}:${Math.ceil(Math.max(0, (m.phase === "waiting" ? m.returnAt : m.arriveAt) - now) / 1000)}`).join("|");
    if (!force && key === APP.map.lastQueueKey) return;
    APP.map.lastQueueKey = key;
    count.textContent = String(APP.marches.length);
    const activeRows = APP.marches.map((m, index) => {
      const remain = m.phase === "waiting" ? 0 : Math.max(0, Math.ceil((m.arriveAt - now) / 1000));
      const action = m.phase === "returning" ? "در حال بازگشت به قلعه" : m.phase === "waiting" ? m.type === "camp" ? "کمپ شده" : "در حال انجام عملیات" : m.type === "attack" ? `در حال حمله به ${m.name}` : m.type === "spy" ? `در حال جاسوسی از ${m.name}` : m.type === "reinforce" ? "در حال پیوستن به کمپ" : "در حال حرکت به کمپ";
      const target = m.phase === "returning" ? "قلعه خودی" : m.name;
      return `<button class="march-row" type="button" data-march-locate="${m.id}"><span class="march-row-icon">${m.type === "spy" ? "◉" : "⚔"}</span><span><strong>${escapeHTML(action)}</strong>${timerProgress(m.phase === "waiting" ? m.returnAt - (m.type === "camp" ? WORLD.campDuration : 2000) : m.startedAt, m.phase === "waiting" ? m.returnAt : m.arriveAt, m.phase === "waiting" ? "استقرار" : "مسیر")}</span><b>⌖</b></button>`;
    }).join("");
    const slots = Array.from({
      length: WORLD.marchSlots
    }, (_, i) => APP.marches[i] ? "" : `<div class="march-empty-slot"><b>صف ${i + 1}</b><span>آماده حرکت</span></div>`).join("");
    box.innerHTML = `<div class="march-tabs"><button class="${activeTab === "armies" ? "is-active" : ""}" data-march-tab="armies">لشکرها</button><button class="${activeTab === "territory" ? "is-active" : ""}" data-march-tab="territory">قلمرو</button></div><div class="march-tab-content" data-march-content="armies" ${activeTab === "armies" ? "" : "hidden"}>${activeRows}${slots}</div><div class="march-tab-content" data-march-content="territory" ${activeTab === "territory" ? "" : "hidden"}>${renderTerritoryStatus()}</div>`;
    box.querySelectorAll('[data-march-content]').forEach(n=>{n.scrollTop=scrollPositions[n.dataset.marchContent]||0;});
  }

  // لمس نقشه و جلوگیری از انتخاب ناخواسته
  function mapMinZoom() {
    const layer = document.getElementById("worldMapLayer");
    return Math.max(.55, layer.clientWidth / (800 * APP.map.hexSize * Math.sqrt(3) - 40), layer.clientHeight / (800 * APP.map.hexSize * 1.5 - 40));
  }
  function bindMapInput() {
    const layer = document.getElementById("worldMapLayer");
    layer.addEventListener("pointerdown", event => {
      if (event.target.closest("button, #mapTileActions, #empireInfo, #enemySheet, .march-army")) return;
      cancelAnimationFrame(APP.map.cameraAnimation);
      layer.setPointerCapture?.(event.pointerId);
      APP.map.tapBlocked = APP.map.pointers.size > 0;
      APP.map.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
      });
      const values = [...APP.map.pointers.values()];
      APP.map.gesture = values.length > 1 ? {
        type: "pinch",
        cx: (values[0].x + values[1].x) / 2,
        cy: (values[0].y + values[1].y) / 2,
        d: Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y)
      } : {
        type: "pan",
        x: event.clientX,
        y: event.clientY,
        moved: 0
      };
    });
    layer.addEventListener("pointermove", event => {
      const p = APP.map.pointers.get(event.pointerId);
      if (!p) return;
      p.x = event.clientX;
      p.y = event.clientY;
      const values = [...APP.map.pointers.values()];
      if (values.length >= 2) {
        APP.map.tapBlocked = true;
        hideMapActions();
        const g = APP.map.gesture;
        const cx = (values[0].x + values[1].x) / 2,
          cy = (values[0].y + values[1].y) / 2,
          d = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
        APP.map.camera.x -= (cx - g.cx) / APP.map.camera.zoom;
        APP.map.camera.y -= (cy - g.cy) / APP.map.camera.zoom;
        if (g.d > 1) APP.map.camera.zoom = Math.max(mapMinZoom(), Math.min(3.5, APP.map.camera.zoom * d / g.d));
        g.cx = cx;
        g.cy = cy;
        g.d = d;
      } else if (APP.map.gesture?.type === "pan") {
        const g = APP.map.gesture;
        APP.map.camera.x -= (event.clientX - g.x) / APP.map.camera.zoom;
        APP.map.camera.y -= (event.clientY - g.y) / APP.map.camera.zoom;
        g.moved += Math.hypot(event.clientX - g.x, event.clientY - g.y);
        if (g.moved >= 8) {
          APP.map.tapBlocked = true;
          hideMapActions();
          APP.map.selectedMapCell = null;
        }
        g.x = event.clientX;
        g.y = event.clientY;
      }
      clampMapCamera();
      applyMapCamera();
    });
    const finish = event => {
      if (event.target.closest?.("#mapTileActions, button, .march-army")) return;
      if (!APP.map.pointers.has(event.pointerId)) return;
      const gesture = APP.map.gesture,
        moved = gesture?.moved || 0;
      const clickedControl = event.target.closest?.("button");
      APP.map.pointers.delete(event.pointerId);
      if (!APP.map.pointers.size) APP.map.gesture = null;
      if (event.type === "pointerup" && !clickedControl && gesture?.type === "pan" && !APP.map.tapBlocked && moved < 8) {
        const empire = hitEmpire(event.clientX, event.clientY);
        if (empire) {
          openEmpire(empire);
          return;
        }
        if (APP.map.camera.zoom < MAP_DETAIL_ZOOM) return;
        const enemy = hitEnemy(event.clientX, event.clientY);
        if (enemy) {
          openEnemy(enemy);
          return;
        }
        const camp = hitMapCamp(event.clientX, event.clientY);
        if (camp) {
          openCampActions(camp);
          return;
        }
        const castle = hitMapCastle(event.clientX, event.clientY);
        if (castle) {
          APP.map.selectedMapCell = {
            q: castle.q,
            r: castle.r
          };
          updateMapCoordinates();
          drawWorldMap();
          openMapCastle(castle);
        } else {
          const point = mapScreenToWorld(event.clientX, event.clientY);
          const cell = mapWorldToAxial(point.x, point.y);
          if (terrainAt(cell.q, cell.r).blocked) {
            hideMapActions();
            APP.map.selectedMapCell = null;
            updateMapCoordinates();
            drawWorldMap();
            return;
          }
          APP.map.selectedMapCell = cell.q >= 1 && cell.q <= 800 && cell.r >= 1 && cell.r <= 800 ? cell : null;
          updateMapCoordinates();
          drawWorldMap();
          if (APP.map.selectedMapCell) openMapTile(APP.map.selectedMapCell);
        }
      } else if (moved >= 8) {
        APP.map.selectedMapCell = null;
        updateMapCoordinates();
      }
    };
    layer.addEventListener("pointerup", finish);
    layer.addEventListener("pointercancel", finish);
    layer.addEventListener("wheel", event => {
      cancelAnimationFrame(APP.map.cameraAnimation);
      hideMapActions();
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      APP.map.camera.zoom = Math.max(mapMinZoom(), Math.min(3.5, APP.map.camera.zoom * factor));
      clampMapCamera();
      applyMapCamera();
    }, {
      passive: false
    });
  }

  // تلپورت تأییدشده خارج از موانع و محدوده رویداد
  function validTeleportTarget(cell) {
    return cell && Number.isInteger(cell.q) && Number.isInteger(cell.r) && cell.q >= 1 && cell.q <= 800 && cell.r >= 1 && cell.r <= 800 && Math.hypot(cell.q-WORLD.eventQ,cell.r-WORLD.eventR)>WORLD.neutralRadius+2 && castleFootprint(cell.q, cell.r).every(p => !insideEventArea(p.q, p.r)) && mapBuildingFits(cell.q, cell.r) && !enemyAtFootprint(cell) && enemySpaceFree(cell.q,cell.r);
  }
  async function teleportCastle(cell, itemId) {
    const item = INVENTORY.find(i => i.id === itemId);
    if (!item?.count) return showBuildNotice("آیتم جابه‌جایی موجود نیست.");
    if (APP.marches.length) return showBuildNotice("پیش از جابه‌جایی، تمام لشکرها باید بازگردند.");
    if (!validTeleportTarget(cell)) return showBuildNotice("این کاشی برای استقرار قلعه مناسب نیست.");
    if (!(await gameConfirm(`قلعه با مصرف یک آیتم به ستون: ${cell.q} / ردیف: ${cell.r} منتقل شود؟`))) return;
    if (!item.count || APP.marches.length || !validTeleportTarget(cell)) return;
    tickBuildingTask();
    item.count--;
    APP.home = {
      ...cell
    };
    const own = APP.map.castles.find(c => c.own);
    if (own) Object.assign(own, cell);
    updatePerkHud();
    drawWorld();
    positionWorldOverlays();
    saveGameProgress();
    closeAllSurfaces();
    setWorldMode(true, false);
    centerMapOn(cell.q, cell.r);
    showBuildNotice("قلعه به مقصد جدید منتقل شد.");
  }
  function useTeleportItem(item) {
    if (!APP.map.bounds) createWorldMap();
    if (item.id === "teleport-empire") {
      showGameDialog("انتخاب امپراطوری", "جابجایی تصادفی در مرز امپراطوری انتخابی", EMPIRES.map(empire => ({
        label: empire.name,
        run: () => {
          closeGameDialog();
          for (let i = 0; i < 5000; i++) {
            const cell = {
              q: 1 + Math.floor(Math.random() * 800),
              r: 1 + Math.floor(Math.random() * 800)
            };
            if (empireAt(cell.q, cell.r)?.id === empire.id && validTeleportTarget(cell)) return teleportCastle(cell, item.id);
          }
          showBuildNotice("مقصد مناسب یافت نشد.");
        }
      })));
      return;
    }
    if (item.id === "teleport-random") {
      for (let i = 0; i < 1000; i++) {
        const cell = {
          q: 1 + Math.floor(Math.random() * 800),
          r: 1 + Math.floor(Math.random() * 800)
        };
        if (validTeleportTarget(cell)) return teleportCastle(cell, item.id);
      }
      return showBuildNotice("مقصد مناسبی پیدا نشد؛ دوباره تلاش کنید.");
    }
    showGameDialog("جابجایی دلخواه", '<div class="coordinate-fields"><label>X<input id="teleportX" type="number" min="1" max="800" inputmode="numeric"></label><label>Y<input id="teleportY" type="number" min="1" max="800" inputmode="numeric"></label></div>', [{
      label: "انتخاب مقصد",
      run: () => {
        const cell = {
          q: Number(document.getElementById("teleportX").value),
          r: Number(document.getElementById("teleportY").value)
        };
        closeGameDialog();
        teleportCastle(cell, item.id);
      }
    }, {
      label: "انصراف",
      run: closeGameDialog
    }]);
  }
  function openMapTile(cell) {
    if (cell.q === 400 && cell.r === 400) {
      showBuildNotice("برج فرمانروایی؛ رویداد تصرف در پایان سرور فعال می‌شود.");
      return hideMapActions();
    }
    if (APP.map.camera.zoom < MAP_DETAIL_ZOOM || terrainAt(cell.q, cell.r).blocked) return hideMapActions();
    APP.map.selectedMapCell = {
      ...cell
    };
    APP.map.selection = {
      kind: "tile",
      cell: {
        ...cell
      }
    };
    renderMapActions();
  }
  function hideMapActions() {
    document.getElementById("enemySheet")?.remove();
    APP.map.selection = null;
    document.getElementById("mapTileActions")?.remove();
  }
  function hitMapCamp(clientX, clientY) {
    const rect = document.getElementById("worldMapLayer").getBoundingClientRect();
    return APP.marches.find(m => m.type === "camp" && m.phase === "waiting" && (() => {
      const [x, y] = mapToScreen(m.target.q, m.target.r);
      const world=mapScreenToWorld(clientX,clientY),cell=mapWorldToAxial(world.x,world.y);return cell.q===m.target.q&&cell.r===m.target.r;
    })());
  }
  function openCampActions(m) {
    APP.map.selection = {
      kind: "camp",
      id: m.id,
      cell: {
        ...m.target
      }
    };
    APP.map.selectedMapCell = {
      ...m.target
    };
    renderMapActions();
  }
  function renderMapActions() {
    const selection = APP.map.selection;
    if (!selection) return;
    document.getElementById("mapTileActions")?.remove();
    const box = document.createElement("div");
    box.id = "mapTileActions";
    box.className = "map-tile-actions";
    const cell = selection.cell,
      kind = selection.kind;
    const buttons = kind === "camp" ? [["details", "◉", "جزئیات"], ["recruit", "⚑", "عضوگیری"], ["return", "↩", "بازگشت"]] : kind === "march" ? [["details", "◉", "جزئیات"], ["speed", "⚡", "تسریع"], ["return", "↩", "بازگشت"]] : kind === "castle" ? selection.castle.own ? [["home", "⌂", "قلمرو"]] : [["attack", "⚔", "حمله"], ["spy", "◉", "جاسوسی"], ["profile", "♟", "پروفایل"]] : [["teleport", "⌖", "جابجایی"], ["march", "⚔", "حرکت"]];
    box.innerHTML = `${kind === "castle" ? `<strong class="inline-castle-name">${escapeHTML(selection.castle.name)}</strong>` : ""}<div class="tile-action-buttons">${buttons.map(([action, icon, label]) => `<button type="button" data-tile-action="${action}"><b>${icon}</b><span>${label}</span></button>`).join("")}</div><div class="tile-coordinate">X: ${cell.q} , Y: ${cell.r}</div><button type="button" class="tile-pin" data-tile-action="pin" aria-label="نشان کردن">☆</button><small class="camp-inline-time" id="campInlineTime"></small>`;
    box.addEventListener("pointerdown", e => e.stopPropagation());
    box.addEventListener("click", async e => {
      e.stopPropagation();
      const b = e.target.closest("[data-tile-action]");
      if (!b) return;
      const action = b.dataset.tileAction;
      if (action === "pin") return pinMapCell(cell);
      if (action === "teleport") return teleportCastle(cell, "teleport-target");
      if (action === "home") return setWorldMode(false, false);
      if (action === "profile") return openProfile(selection.castle);
      if (action === "attack" || action === "spy" || action === "march" || action === "recruit") {
        if (!(await gameConfirm(action === "attack" ? "لشکر برای حمله اعزام شود؟" : "اعزام لشکر به این مقصد تأیید می‌شود؟"))) return;
        if (kind === "castle") APP.selectedMapCastle = selection.castle;else if (action === "recruit") APP.selectedMapCastle = {
          ...cell,
          name: "تقویت کمپ",
          campId: selection.id
        };else APP.selectedMapCastle = {
          ...cell,
          name: "کمپ",
          own: false
        };
        startMarch(action === "march" ? "camp" : action === "recruit" ? "reinforce" : action);
        return;
      }
      const m = APP.marches.find(m => m.id === selection.id);
      if (!m) return hideMapActions();
      if (action === "details") {
        box.classList.toggle("show-details");
        positionMapActions();
      }
      if (action === "return") return recallMarch(m.id);
      if (action === "speed") return openMarchSpeed(m.id);
    });
    document.getElementById("worldMapLayer").appendChild(box);
    positionMapActions();
    updateMapCoordinates();
  }
  function openMarchActions(m) {
    if (!m) return;
    if (m.phase === "waiting" && m.type === "camp") return openCampActions(m);
    const p = marchPosition(m),
      cell = p.q !== undefined ? p : mapWorldToAxial(p.x, p.y);
    APP.map.selection = {
      kind: "march",
      id: m.id,
      cell
    };
    renderMapActions();
  }
  // بازگشت از نقطه واقعی مسیر، بدون جهش به مقصد.
  async function recallMarch(id) {
    const initial = APP.marches.find(m => m.id === id);
    if (!initial || initial.phase === "returning") return showBuildNotice("لشکر در حال بازگشت است.");
    const recall = INVENTORY.find(i => i.id === "march-recall");
    if (initial.phase !== "waiting" && !recall?.count) return showBuildNotice("آیتم بازگرداندن لشکر نیاز است.");
    if (!(await gameConfirm("لشکر از موقعیت فعلی به قلعه بازگردد؟ در مسیر یک آیتم بازگرداندن مصرف می‌شود."))) return;
    const m = APP.marches.find(m => m.id === id);
    if (!m || m.phase === "returning") return;
    if (m.phase !== "waiting") {
      if (!recall.count) return;
      recall.count--;
    }
    const now = Date.now();
    let route;
    if (m.phase === "waiting") route = [...m.route];else {
      const progress = marchProgress(m, now),
        span = progress * (m.route.length - 1),
        index = Math.floor(span),
        t = span - index;
      const a = m.route[index],
        b = m.route[Math.min(index + 1, m.route.length - 1)];
      const [ax, ay] = mapCenter(a.q, a.r),
        [bx, by] = mapCenter(b.q, b.r);
      route = [...m.route.slice(0, index + 1), {
        q: a.q,
        r: a.r,
        wx: ax + (bx - ax) * t,
        wy: ay + (by - ay) * t
      }];
    }
    m.route = route;
    m.reverseRoute = null;
    m.phase = "returning";
    m.startedAt = now;
    const last = route.at(-1),
      previous = route.at(-2),
      fraction = last?.wx !== undefined && previous ? Math.hypot(last.wx - routeCenter(previous)[0], last.wy - routeCenter(previous)[1]) / (APP.map.hexSize * Math.sqrt(3)) : 1;
    m.travelMs = Math.max(1000, (route.length - 2 + fraction) * 6000 * (activePerk().empire ? 1 : .95));
    m.arriveAt = now + m.travelMs;
    hideMapActions();
    saveGameProgress();
    renderMarchQueue(true);
    renderMarchRoutes();
  }
  function openMarchSpeed(id) {
    const m = APP.marches.find(m => m.id === id && m.phase !== "waiting");
    if (!m) return showBuildNotice("لشکر در حال حرکت نیست.");
    showGameDialog("تسریع حرکت", `<p>تسریع، درصدی از زمان باقیمانده مسیر را کم می‌کند.</p>`, [...INVENTORY.filter(i => i.id.startsWith("march-speed-")).map(item => ({
      label: `${item.name} ×${item.count}`,
      run: async () => {
        if (!item.count) return showBuildNotice("این آیتم موجود نیست.");
        if (!(await gameConfirm(`یک ${item.name} استفاده شود؟`))) return;
        const current = APP.marches.find(a => a.id === id && a.phase !== "waiting" && a.arriveAt > Date.now());
        if (!current || !item.count) return;
        const now = Date.now(),
          progress = marchProgress(current, now),
          remaining = (current.arriveAt - now) * (1 - item.value),
          duration = remaining / Math.max(.0001, 1 - progress);
        current.startedAt = now - progress * duration;
        current.arriveAt = now + remaining;
        item.count--;
        saveGameProgress();
        renderMarchQueue(true);
        openMarchActions(current);
      }
    })), {
      label: "بستن",
      run: closeGameDialog
    }]);
  }
  function pinMapCell(cell) {
    const bookmarks = readMapBookmarks();
    if (bookmarks.some(p => p.q === cell.q && p.r === cell.r)) return showBuildNotice("این مختصات قبلاً نشان شده است.");
    bookmarks.push({
      ...cell,
      name: `${cell.q}:${cell.r}`
    });
    try {
      localStorage.setItem("romaniaMapBookmarksV1", JSON.stringify(bookmarks.slice(-30)));
    } catch {}
    showBuildNotice("مختصات نشان شد.");
  }
  function positionMapActions() {
    const selection = APP.map.selection,
      box = document.getElementById("mapTileActions");
    if (!selection || !box) return;
    const moving = selection.kind === "march" ? APP.marches.find(m => m.id === selection.id) : null;
    const pos = moving ? marchPosition(moving) : null;
    if (selection.kind === "march" && !moving) return hideMapActions();
    if (pos) selection.cell = pos.q !== undefined ? pos : mapWorldToAxial(pos.x, pos.y);
    const [x, y] = pos?.x !== undefined ? worldPointToScreen(pos.x, pos.y) : mapToScreen(selection.cell.q, selection.cell.r),
      layer = document.getElementById("worldMapLayer");
    box.style.left = `${Math.max(85, Math.min(layer.clientWidth - 85, x))}px`;
    box.style.top = `${Math.max(15, Math.min(layer.clientHeight - 150, y + 24))}px`;
    if (selection.kind === "camp" || selection.kind === "march") {
      const m = APP.marches.find(m => m.id === selection.id);
      if (!m) return hideMapActions();
      const time = document.getElementById("campInlineTime");
      if(time)time.innerHTML=(m.phase==="waiting"?timerProgress(m.returnAt-WORLD.campDuration,m.returnAt,"تا بازگشت"):timerProgress(m.startedAt,m.arriveAt,"تا رسیدن"))+`<span>${formatCompact(Math.max(0,(m.troops||0)-(m.lostTroops||0)))} نیروی آماده · توان ${formatCompact(Object.entries(m.unitCounts||{}).reduce((n,[id,count])=>n+(TROOPS[id]?.power||0)*Math.max(0,count-(m.casualties?.[id]||0)),0))}</span>${Object.entries(m.unitCounts||{}).filter(([,count])=>count>0).map(([id,count])=>`<span>${TROOPS[id]?.name||"نیرو"}: ${formatCompact(Math.max(0,count-(m.casualties?.[id]||0)))}</span>`).join("")}`;
    }
  }
  async function recallCamp(id) {
    return recallMarch(id);
  }

  // پنجره‌های داخلی تأیید و ورود داده
  let pendingConfirmation = null;
  function showGameDialog(title, html, actions) {
    if (pendingConfirmation) {
      const cancel = pendingConfirmation;
      pendingConfirmation = null;
      cancel(false);
    }
    const dialog = document.getElementById("gameDialog");
    document.getElementById("gameDialogTitle").textContent = title;
    const content=document.getElementById("gameDialogContent");content.onclick=null;content.oninput=null;content.innerHTML=html;
    const buttons = document.getElementById("gameDialogActions");
    buttons.replaceChildren();
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      if (action.primary) button.className = "is-primary";
      button.addEventListener("click", action.run);
      buttons.appendChild(button);
    }
    dialog.hidden = false;
    dialog.querySelector("input")?.focus();
  }
  function closeGameDialog() {
    if (pendingConfirmation) {
      const cancel = pendingConfirmation;
      pendingConfirmation = null;
      cancel(false);
    }
    document.getElementById("gameDialog").hidden = true;
  }
  function gameConfirm(message) {
    return new Promise(resolve => {
      showGameDialog("تأیید عملیات", `<p>${escapeHTML(message)}</p>`, [{
        label: "خیر",
        run: () => {
          pendingConfirmation = null;
          closeGameDialog();
          resolve(false);
        }
      }, {
        label: "بله",
        primary: true,
        run: () => {
          pendingConfirmation = null;
          closeGameDialog();
          resolve(true);
        }
      }]);
      pendingConfirmation = resolve;
    });
  }
  function readMapBookmarks() {
    try {
      const saved = JSON.parse(localStorage.getItem("romaniaMapBookmarksV1") || "[]");
      return Array.isArray(saved) ? saved.filter(p => Number.isInteger(p.q) && Number.isInteger(p.r) && p.q >= 1 && p.q <= 800 && p.r >= 1 && p.r <= 800).slice(0, 30) : [];
    } catch {
      return [];
    }
  }
  function openCoordinateSearch() {
    const selected = APP.map.selectedMapCell || mapWorldToAxial(APP.map.camera.x, APP.map.camera.y);
    showGameDialog("جستجوی مختصات", `<div class="coordinate-fields"><label>X<input id="coordinateX" type="number" min="1" max="800" inputmode="numeric" value="${Math.max(1, Math.min(800, selected.q))}"></label><label>Y<input id="coordinateY" type="number" min="1" max="800" inputmode="numeric" value="${Math.max(1, Math.min(800, selected.r))}"></label></div><p id="coordinateError" class="dialog-error" hidden>مختصات باید بین ۱ تا ۸۰۰ باشند.</p>`, [{
      label: "انصراف",
      run: closeGameDialog
    }, {
      label: "برو به مختصات",
      primary: true,
      run: () => {
        const q = Number(document.getElementById("coordinateX").value),
          r = Number(document.getElementById("coordinateY").value);
        if (!Number.isInteger(q) || !Number.isInteger(r) || q < 1 || q > 800 || r < 1 || r > 800) {
          document.getElementById("coordinateError").hidden = false;
          return;
        }
        centerMapOn(q, r);
        closeGameDialog();
      }
    }]);
  }
  function openMapBookmarks() {
    const saved = readMapBookmarks(),
      selected = APP.map.selectedMapCell || mapWorldToAxial(APP.map.camera.x, APP.map.camera.y);
    const rows = saved.map((p, i) => `<div class="bookmark-row"><span>ستون: ${p.q} · ردیف: ${p.r}</span><button type="button" data-bookmark-go="${i}">رفتن</button><button type="button" data-bookmark-remove="${i}" aria-label="حذف نشانک">×</button></div>`).join("");
    showGameDialog("مختصات نشان‌شده", `<div class="bookmark-list">${rows || "<p>هنوز مختصاتی نشان نشده است.</p>"}</div>`, [{
      label: "بستن",
      run: closeGameDialog
    }, {
      label: `نشان کردن ستون: ${selected.q} ردیف: ${selected.r}`,
      primary: true,
      run: () => {
        if (selected.q < 1 || selected.q > 800 || selected.r < 1 || selected.r > 800) return;
        if (!saved.some(p => p.q === selected.q && p.r === selected.r)) saved.unshift({
          q: selected.q,
          r: selected.r
        });
        localStorage.setItem("romaniaMapBookmarksV1", JSON.stringify(saved.slice(0, 30)));
        openMapBookmarks();
      }
    }]);
    document.getElementById("gameDialogContent").onclick = event => {
      const go = event.target.closest("[data-bookmark-go]"),
        remove = event.target.closest("[data-bookmark-remove]");
      if (go) {
        const p = saved[Number(go.dataset.bookmarkGo)];
        centerMapOn(p.q, p.r);
        closeGameDialog();
      }
      if (remove) {
        saved.splice(Number(remove.dataset.bookmarkRemove), 1);
        localStorage.setItem("romaniaMapBookmarksV1", JSON.stringify(saved));
        openMapBookmarks();
      }
    };
  }

  // اتصال دکمه‌ها و رویدادهای رابط
  function bindUI() {
    state.canvas.addEventListener("pointerdown", onPointerDown, {
      passive: false
    });
    state.canvas.addEventListener("pointermove", onPointerMove, {
      passive: false
    });
    state.canvas.addEventListener("pointerup", onPointerUp, {
      passive: false
    });
    state.canvas.addEventListener("pointercancel", onPointerUp, {
      passive: false
    });
    state.canvas.addEventListener("wheel", zoomAt, {
      passive: false
    });
    document.querySelectorAll("[data-close-panel]").forEach(el => el.addEventListener("click", () => {
      navigateGameBack();
      if (APP.tutorial.active && APP.tutorial.phase === "focus") showTutorialStep();
    }));
    document.getElementById("profileButton")?.addEventListener("click", () => openProfile());
    document.getElementById("shieldButton")?.addEventListener("click", openShield);
    document.getElementById("eventsButton")?.addEventListener("click", () => {
      if (!APP.tutorial.active) openEvents();
    });
    document.getElementById("enemySearchButton")?.addEventListener("click",openEnemySearch);
    document.getElementById("mapSearchButton")?.addEventListener("click", openCoordinateSearch);
    document.getElementById("mapBookmarksButton")?.addEventListener("click", openMapBookmarks);
    document.getElementById("vipButton")?.addEventListener("click", openVip);
    document.getElementById("storeButton")?.addEventListener("click", openShop);
    document.getElementById("myCastleButton")?.addEventListener("click", () => {APP.map.camera.zoom=1.75;centerMapOn(APP.home.q, APP.home.r);});
    document.getElementById("marchToggle")?.addEventListener("click", () => {
      APP.map.lastQueueKey = "";
      document.querySelectorAll("[data-march-tab]").forEach(b => b.classList.toggle("is-active", b.dataset.marchTab === "armies"));
      renderMarchQueue(true);
      document.getElementById("marchPanel")?.classList.toggle("is-expanded");
    });
    document.addEventListener("pointerdown", event => {
      const panel = document.getElementById("marchPanel");
      if (panel?.classList.contains("is-expanded") && !event.target.closest("#marchQueue, #marchToggle")) panel.classList.remove("is-expanded");
    });
    document.getElementById("marchQueue")?.addEventListener("click", event => {
      
      const tab = event.target.closest("[data-march-tab]");
      if (tab) {
        document.querySelectorAll("[data-march-tab]").forEach(b => b.classList.toggle("is-active", b === tab));
        document.querySelectorAll("[data-march-content]").forEach(p => p.hidden = p.dataset.marchContent !== tab.dataset.marchTab);
      }
      const locate = event.target.closest("[data-march-locate]");
      if (locate) centerMapOnMarch(locate.dataset.marchLocate);
    });
    document.getElementById("missionStatus")?.addEventListener("click", openMissions);
    document.getElementById("buildingPanelContent")?.addEventListener("click", event => {
      const facility = event.target.closest("[data-open-facility]");
      if (facility) return openFacility(facility.dataset.openFacility);
      if (event.target.closest("[data-secondary-instant]")) return alterSecondBuild("instant");
      if (event.target.closest("[data-secondary-cancel]")) return alterSecondBuild("cancel");
      const secondarySpeed = event.target.closest("[data-secondary-speed]");
      if (secondarySpeed) return alterSecondBuild("speed", secondarySpeed.dataset.secondarySpeed);
      if (event.target.closest("[data-start-research]")) return startResearch();
      if (event.target.closest("[data-research-instant]")) return speedResearch();
      const researchSpeed = event.target.closest("[data-research-speed]");
      if (researchSpeed) return speedResearch(researchSpeed.dataset.researchSpeed);
      const armyInstant = event.target.closest("[data-army-instant]");
      if (armyInstant) return speedArmy(armyInstant.dataset.armyInstant);
      const armySpeed = event.target.closest("[data-army-speed]");
      if (armySpeed) return speedArmy(armySpeed.dataset.queue, armySpeed.dataset.armySpeed);
      const army = event.target.closest("[data-start-army]");
      if (army) return startArmyTask(army.dataset.startArmy);
      const btn = event.target.closest("[data-start-build]");
      if (btn) return startBuildingTask(btn.dataset.startBuild);
      const instant = event.target.closest("[data-instant-start]");
      if (instant) return completeInstant(instant.dataset.instantStart, true);
      if (event.target.closest("[data-instant-active]")) return completeInstant(APP.worker.task?.id);
      if (event.target.closest("[data-quick-speed]")) return quickSpeed();
      if (event.target.closest("[data-open-speed]")) {
        const picker = document.getElementById("speedChoices");
        if (picker) picker.hidden = !picker.hidden;
        return;
      }
      const speed = event.target.closest("[data-use-speed]");
      if (speed) return useInventoryItem(INVENTORY.find(item => item.id === speed.dataset.useSpeed), 1, true);
      if (event.target.closest("[data-request-cancel]")) {
        document.getElementById("cancelConfirm")?.removeAttribute("hidden");
        return;
      }
      if (event.target.closest("[data-dismiss-cancel]")) {
        document.getElementById("cancelConfirm")?.setAttribute("hidden", "");
        return;
      }
      if (event.target.closest("[data-confirm-cancel]")) cancelBuildingTask(APP.worker.task?.id);
    });
    document.querySelectorAll(".nav-item:not(:disabled)").forEach(button => button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (APP.tutorial.active && APP.tutorial.phase !== "ui-tour" && action !== "missions") return;
      if (action === "items") openInventory("all");else if (action === "messages") openMessages();else if (action === "missions") openMissions();else if (action === "map") setWorldMode(APP.currentMode !== "map", true);
    }));
    document.getElementById("panelLayer")?.addEventListener("click", event => {
      const castleAction = event.target.closest("[data-castle-action]");
      if (castleAction) {
        const action = castleAction.dataset.castleAction;
        if (action === "attack" || action === "spy") startMarch(action === "spy" ? "spy" : "attack");
        if (action === "profile") {
          closePanels();
          openProfile();
        }
      }
      if (event.target.matches(".panel-backdrop")) {
        navigateGameBack();
      }
    });
    window.addEventListener("resize", () => {
      resizeCanvas();
      clampCamera();
      applyCamera();
      if (APP.currentMode === "map") {
        clampMapCamera();
        resizeWorldMap();
      }
      positionBuildingActionMenu();
    }, {
      passive: true
    });
    // در آشنایی رابط فقط هدف مرحله و دکمه‌های مشاور پاسخ می‌دهند؛ سایر عملیات قفل هستند.
    document.addEventListener("click", event => {
      if (!APP.tutorial.active || APP.tutorial.phase !== "ui-tour") return;
      if (event.target.closest("#tutorialOverlay")) return;
      const selector = UI_TOUR[APP.tutorial.uiIndex]?.[0];
      if (selector && event.target.closest(selector)) {
        // Panel targets use the tour shortcut; other targets retain their
        // normal controls (queue toggle and settlement perk disclosure).
        if (UI_TOUR[APP.tutorial.uiIndex]?.[3]) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openTourTarget();
        }
        return;
      }
      if (event.target.closest("[data-close-panel]")) {
        closePanels();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    window.visualViewport?.addEventListener("resize", () => {
      if (APP.currentMode === "map") {
        clampMapCamera();
        resizeWorldMap();
      } else {
        clampCamera();
        applyCamera();
      }
    }, {
      passive: true
    });
    bindMapInput();
  }
