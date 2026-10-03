  // ===========================================================================
  // نقشه جهان — Canvas برای Tileها + SVG برای مسیر لشکرها
  // ===========================================================================

  function mapCenter(q, r) {
    const s = APP.map.hexSize;
    return [s * Math.sqrt(3) * (q + (r & 1) / 2), s * 1.5 * r];
  }
  function mapDistance(a, b) {
    const aq = a.q - Math.floor(a.r / 2),
      bq = b.q - Math.floor(b.r / 2);
    return Math.max(Math.abs(aq - bq), Math.abs(a.r - b.r), Math.abs(aq + a.r - bq - b.r));
  }

  // دشمنان سرگردان: موقعیت پایدار، سطح بر اساس فاصله مرکز و کش منطقه‌ای برای رندر سبک.
  const ENEMY_TYPES = [{
    id: "viking",
    role: "mixed",
    name: "سپاه خاکستروند",
    image: "assets/enemies/ashen-host.webp",
    drop: "random"
  }, {
    id: "archer",
    role: "bow",
    name: "چله‌داران شب‌رون",
    image: "assets/enemies/nightrune-bows.webp",
    drop: "troop-speed-60"
  }, {
    id: "swordmen",
    role: "spear",
    name: "نیزه‌وران اخگرسنگ",
    image: "assets/enemies/ember-pikes.webp",
    drop: "speed-60"
  }, {
    id: "cavarly",
    role: "cavalry",
    name: "سواران آهن‌توفان",
    image: "assets/enemies/iron-gale.webp",
    drop: "heal-speed-10"
  }];
  const enemies = [],
    enemyBuckets = new Map();
  let enemiesReady = false;
  function enemyLevel(q, r) {
    return Math.max(1, Math.min(25, Math.round(1 + 24 * (1 - Math.hypot(q - 400, r - 400) / 360))));
  }
  function enemySpaceFree(q, r, except = null) {
    const bx = Math.floor(q / 32),
      by = Math.floor(r / 32);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const e of enemyBuckets.get(`${bx + dx}:${by + dy}`) || []) if (e.id !== except && mapDistance({
      q,
      r
    }, e) < 3) return false;
    return true;
  }
  function respawnEnemies() {
    const now = Date.now();
    let changed = false;
    for (const [id, time] of Object.entries(APP.enemyDefeated)) {
      if (time > now) continue;
      const enemy = enemies.find(e => e.id === id);
      if (!enemy) {
        delete APP.enemyDefeated[id];
        continue;
      }
      for (let attempt = 0; attempt < 300; attempt++) {
        const q = Math.max(35,Math.min(765,enemy.q+Math.floor(Math.random()*25)-12)),
          r = Math.max(35,Math.min(765,enemy.r+Math.floor(Math.random()*25)-12));
        if (terrainAt(q, r).blocked || insideEventArea(q, r) || !connectedGround[q * 801 + r] || !enemySpaceFree(q, r, id) || APP.map.castles.some(c => mapDistance(c, {
          q,
          r
        }) < 3) || q === enemy.q && r === enemy.r) continue;
        const old = enemyBuckets.get(`${Math.floor(enemy.q / 32)}:${Math.floor(enemy.r / 32)}`);
        if (old) old.splice(old.indexOf(enemy), 1);
        Object.assign(enemy, {
          q,
          r,
          level: enemy.level
        });
        APP.enemyMoves[id] = {id,q,r,level:enemy.level};
        const bucket = `${Math.floor(q / 32)}:${Math.floor(r / 32)}`;
        if (!enemyBuckets.has(bucket)) enemyBuckets.set(bucket, []);
        enemyBuckets.get(bucket).push(enemy);
        delete APP.enemyDefeated[id];
        changed = true;
        break;
      }
    }
    if (changed) {saveGameProgress();if(APP.currentMode==="map")applyMapCamera();}
  }
  function addEnemy(enemy) {
    if (!enemySpaceFree(enemy.q, enemy.r)) return false;
    if (APP.map.castles.some(c=>mapDistance(c,enemy)<3)) return false;
    enemies.push(enemy);
    const key = `${Math.floor(enemy.q / 32)}:${Math.floor(enemy.r / 32)}`;
    if (!enemyBuckets.has(key)) enemyBuckets.set(key, []);
    enemyBuckets.get(key).push(enemy);
    return true;
  }
  function repairEnemySpacing() {
    const pending=[...enemies];enemies.length=0;enemyBuckets.clear();
    for(const enemy of pending) {
      const free=(q,r)=>q>=1&&q<=800&&r>=1&&r<=800&&!terrainAt(q,r).blocked&&!insideEventArea(q,r)&&connectedGround[q*801+r]&&enemySpaceFree(q,r)&&APP.map.castles.every(c=>mapDistance(c,{q,r})>=3);
      if(!free(enemy.q,enemy.r)) {
        let found=null;
        for(let radius=1;radius<=40&&!found;radius++) for(let dx=-radius;dx<=radius&&!found;dx++) for(const dy of [-radius,radius]) {
          const q=enemy.q+dx,r=enemy.r+dy;if(free(q,r)) {found={q,r};break;}
        }
        if(!found) continue;
        Object.assign(enemy,found);APP.enemyMoves[enemy.id]={id:enemy.id,...found};
      }
      addEnemy(enemy);
    }
  }
  function applySavedEnemyPositions() {
    const positions=new Map((APP.savedEnemyPositions||[]).filter(e=>Number.isInteger(e.q)&&Number.isInteger(e.r)&&e.q>=1&&e.q<=800&&e.r>=1&&e.r<=800).map(e=>[e.id,e]));
    for(const enemy of enemies) {
      const pos=positions.get(enemy.id);
      if(pos) Object.assign(enemy,{q:pos.q,r:pos.r,level: Number.isInteger(pos.level)&&pos.level>=1&&pos.level<=25?pos.level:enemy.id.startsWith("starter-")?enemy.level:enemyLevel(pos.q,pos.r)});
    }
    repairEnemySpacing();
  }
  function createEnemies() {
    if (enemiesReady) return;
    prepareConnectedGround();
    enemiesReady = true;
    for (let q = 45; q < 760; q += 10) for (let r = 45; r < 760; r += 10) {
      const seed = mapNoise(q + 17, r + 43),
        x = q + Math.floor(seed * 9) - 4,
        y = r + Math.floor(mapNoise(r, q) * 9) - 4;
      if (insideEventArea(x, y) || terrainAt(x, y).blocked || !connectedGround[x * 801 + y] || APP.map.castles.some(c => mapDistance(c, {
        q: x,
        r: y
      }) < 3)) continue;
      addEnemy({
        id: `npc-${q}-${r}`,
        q: x,
        r: y,
        level: enemyLevel(x, y),
        type: Math.floor(mapNoise(q + 11, r + 29) * 4)
      });
    }
    applySavedEnemyPositions();
    ENEMY_TYPES.forEach(t => loadImage(t.image));
  }
  function enemyAtFootprint(cell) {
    const x = Math.floor(cell.q / 32),
      y = Math.floor(cell.r / 32);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const e of enemyBuckets.get(`${x + dx}:${y + dy}`) || []) if ((APP.enemyDefeated[e.id] || 0) <= Date.now() && mapDistance(cell, e) === 0) return true;
    return false;
  }
  function enemiesInView() {
    const layer = document.getElementById("worldMapLayer"),
      z = APP.map.camera.zoom;
    const a = mapWorldToAxial(APP.map.camera.x - layer.clientWidth / (2 * z) - 60, APP.map.camera.y - layer.clientHeight / (2 * z) - 60),
      b = mapWorldToAxial(APP.map.camera.x + layer.clientWidth / (2 * z) + 60, APP.map.camera.y + layer.clientHeight / (2 * z) + 60),
      result = [];
    for (let x = Math.floor(a.q / 32) - 1; x <= Math.floor(b.q / 32) + 1; x++) for (let y = Math.floor(a.r / 32) - 1; y <= Math.floor(b.r / 32) + 1; y++) for (const e of enemyBuckets.get(`${x}:${y}`) || []) if ((APP.enemyDefeated[e.id] || 0) <= Date.now() && !APP.map.castles.some(c => mapDistance(c, e) < 2)) result.push(e);
    return result;
  }
  function enemyRenderSize(zoom=APP.map.camera.zoom){return APP.map.hexSize*1.24*zoom;}
  function drawEnemyNameplate(ctx,name,level,x,y){
    ctx.save();ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='600 9px Vazirmatn, sans-serif';
    const measured=ctx.measureText(name)?.width||name.length*5,limit=78,font=Math.max(7.5,Math.min(9,9*limit/Math.max(1,measured)));
    ctx.font=`600 ${font}px Vazirmatn, sans-serif`;ctx.lineJoin='round';ctx.lineWidth=2.5;ctx.strokeStyle='#23140fbb';ctx.fillStyle='#f1c58e';
    ctx.strokeText(name,x,y);ctx.fillText(name,x,y);
    // Enemy grade is a quiet subtitle, distinct from the circular castle badge.
    ctx.font='500 7px Vazirmatn, sans-serif';const rank=`درجه ${level}`;ctx.lineWidth=2;ctx.strokeText(rank,x,y+11);ctx.fillStyle='#ecd4b2';ctx.fillText(rank,x,y+11);
    ctx.restore();
  }
  function drawEnemies(ctx) {
    if (APP.map.camera.zoom < MAP_DETAIL_ZOOM) return;
    for (const enemy of enemiesInView()) {
      const [x, y] = mapToScreen(enemy.q, enemy.r),
        size = enemyRenderSize(),
        type = ENEMY_TYPES[enemy.type],
        image = state.images.get(type.image);
      if (image?.naturalWidth) {
        const scale=size/Math.max(image.naturalWidth,image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
        ctx.drawImage(image,x-w/2,y-h/2,w,h);
      }
      drawEnemyNameplate(ctx,type.name,enemy.level,x,y-size/2-24);
    }
  }
  function hitEnemy(clientX, clientY) {
    if (APP.map.camera.zoom < MAP_DETAIL_ZOOM) return null;
    const rect = document.getElementById("worldMapLayer").getBoundingClientRect(),
      size = APP.map.hexSize * APP.map.camera.zoom;
    return enemiesInView().find(e => {
      const [x, y] = mapToScreen(e.q, e.r);
      const dx=Math.abs(clientX-rect.left-x),dy=Math.abs(clientY-rect.top-y);
      return dx<=Math.sqrt(3)*size/2 && dy<=size-dx/Math.sqrt(3);
    });
  }
  function enemyDropItem(level, typeIndex, random = Math.random) {
    const minutes = level <= 5 ? 1 : level <= 15 ? 5 : 10;
    const type = ENEMY_TYPES[typeIndex];
    const family = type.drop === "random" ? ["build", "troop", "heal"][Math.floor(random() * 3)] : type.id === "archer" ? "troop" : type.id === "cavarly" ? "heal" : "build";
    return family === "build" ? {
      1: "speed-60",
      5: "speed-1",
      10: "speed-10"
    }[minutes] : `${family}-speed-${minutes}m`;
  }
  function enemyResources(level) {
    const value=Math.round(400*Math.pow(1.20,Math.max(0,level-1)));
    return {wood:value,food:value,stone:value,iron:value};
  }

  function enemyRequirement(level) {
    const count=Math.round(12*Math.pow(1.31,Math.max(0,level-1)));
    return {troops:Math.ceil(count*1.6),power:Math.round(count*80*(1+(level-1)*.012))};
  }

  function openEnemy(enemy) {
    hideMapActions();
    document.getElementById("enemySheet")?.remove();
    const type = ENEMY_TYPES[enemy.type],
      requirement = enemyRequirement(enemy.level),
      value = enemyResources(enemy.level).wood;
    const box = document.createElement("section");
    box.id = "enemySheet";
    box.className = "enemy-sheet";
    box.innerHTML = `<button class="enemy-close" aria-label="بستن">×</button><div class="enemy-head"><img src="${type.image}" alt=""><div><h3>${type.name}</h3><span>درجه ${enemy.level} · ستون: ${enemy.q} ردیف: ${enemy.r}</span></div></div><strong>پاداش پیروزی</strong><div class="enemy-rewards">${["wood", "food", "stone", "iron"].map(id => `<span><img src="${RESOURCE_META[id].image}" alt="${RESOURCE_META[id].label}">${formatCompact(value)} · قطعی</span>`).join("")}<span><img src="assets/resources/gold.webp" alt="سکه">${5+enemy.level} · قطعی</span>${enemyRewardChips(enemy.level,enemy.type)}</div><p hidden>تسریع ${type.drop === "random" ? "تصادفی" : type.id === "cavarly" ? "درمان" : type.id === "archer" ? "ساخت نیرو" : "ساخت‌وساز"}: ${enemy.level <= 5 ? 1 : enemy.level <= 15 ? 5 : 10} دقیقه با احتمال ۳۵٪ · تسریع حرکت ۱۰٪: ۲۰٪ · تسریع حرکت ۵۰٪: ۵٪</p><small>نیاز پیشنهادی: ${formatCompact(requirement.troops)} سرباز و ${formatCompact(requirement.power)} توان لشکر. نیروی آماده: ${formatCompact(APP.army.troops)}</small><button class="enemy-attack" type="button" ${enemyUnlocked(enemy.type,enemy.level)?"":"disabled"}>${enemyUnlocked(enemy.type,enemy.level)?"انتخاب نیرو و حمله":"ابتدا درجه قبلی را شکست دهید"}</button>`;
    box.addEventListener("pointerdown", e => e.stopPropagation());
    box.querySelector(".enemy-close").onclick = () => box.remove();
    box.querySelector(".enemy-attack").onclick = () => attackEnemy(enemy);
    document.getElementById("worldMapLayer").appendChild(box);
  }
  function attackEnemy(enemy) {
    if(APP.tutorial.active)return showBuildNotice("ابتدا آموزش را کامل کنید.");
    if(!enemyUnlocked(enemy.type,enemy.level))return showBuildNotice("ابتدا درجه قبلی همین گروه سرگردان را شکست دهید.");
    if(APP.stamina<5)return showBuildNotice("برای حمله ۵ استقامت نیاز است.");
    if((APP.enemyDefeated[enemy.id]||0)>Date.now())return showBuildNotice("این سرگردان قبلاً شکست خورده است.");
    if(APP.marches.some(m=>m.enemyId===enemy.id&&!m.battleResolved))return showBuildNotice("یک لشکر در مسیر این دشمن است.");
    APP.selectedMapCastle={...enemy,name:ENEMY_TYPES[enemy.type].name,enemyId:enemy.id,enemyLevel:enemy.level,enemyType:enemy.type};
    openDeployment("attack",APP.selectedMapCastle);
  }

  function resolveEnemyBattle(m,random=Math.random) {
    if(m.battleResolved)return false;m.battleResolved=true;
    if((APP.enemyDefeated[m.enemyId]||0)>m.arriveAt){m.result="قبلاً شکست خورده";return false;}
    const outcome=simulateCombat(m.unitCounts||{sword:m.troops},m.enemyLevel,m.enemyType);
    m.casualties=outcome.casualties;m.lostTroops=outcome.wounded;m.battleRounds=outcome.rounds;
    recordWounded(m);m.result=outcome.victory?"پیروزی":"شکست";
    if(!outcome.victory){addBattleReport(m,{});showBuildNotice("نبرد ناموفق بود؛ بازماندگان بازمی‌گردند و مجروحان منتظر درمان هستند.");return false;}
    const resources=enemyResources(m.enemyLevel);for(const [id,n] of Object.entries(resources))APP.resources[id]+=n;
    recordCollected(Object.values(resources).reduce((a,b)=>a+b,0));
    APP.enemyDefeated[m.enemyId]=Math.max(Date.now(),m.arriveAt)+15*60000;
    const faction=ENEMY_TYPES[m.enemyType].id;APP.enemyProgress[faction]=Math.max(APP.enemyProgress[faction]||0,m.enemyLevel);
    const granted=[];const add=id=>{const item=INVENTORY.find(i=>i.id===id);if(item){item.count++;granted.push({id,count:1});}};
    if(random()<.35)add(enemyDropItem(m.enemyLevel,m.enemyType,random));
    if(random()<.2)add("march-speed-10");if(random()<.05)add("march-speed-50");if(random()<.15)add("march-recall");
    APP.resources.gold+=5+m.enemyLevel;APP.kills+=outcome.enemyCount;APP.peakKills=Math.max(APP.peakKills,APP.kills);
    APP.unreadItems+=granted.length;addBattleReport(m,resources,granted);updateTopHud();
    if(APP.currentMode==="map")applyMapCamera();
    showBuildNotice(`پیروزی! ${formatCompact(resources.wood)} از هر منبع · ${formatCompact(outcome.wounded)} مجروح`);return true;
  }

  function addBattleReport(m, resources, items = []) {
    updatePower();
    const reportId = m.id || `${m.enemyId}-${m.arriveAt}`;
    if (APP.battleReports.some(r => r.id === reportId)) return;
    APP.battleReports.unshift({
      id: reportId,
      tab: "attack",
      read: false,
      result: m.result,
      units: {
        ...(m.unitCounts || {})
      },
      casualties: {
        ...(m.casualties || {})
      },
      origin: {
        ...m.origin
      },
      target: {
        ...m.target
      },
      defender: {
        name: ENEMY_TYPES[m.enemyType]?.name || "سرگردان",
        type: ENEMY_TYPES[m.enemyType]?.id,
        level: m.enemyLevel,
        power: enemyRequirement(m.enemyLevel).power,
        image: ENEMY_TYPES[m.enemyType]?.image
      },
      sent: m.troops,
      wounded: m.lostTroops || 0,
      combatPower: m.combatPower || m.troops * 80,
      rewards: {
        ...resources
      },
      items: [...items],
      coin: m.result === "پیروزی" ? 5 + m.enemyLevel : 0,
      title: `${m.result} · ${ENEMY_TYPES[m.enemyType]?.name || "سرگردان"} سطح ${m.enemyLevel}`,
      time: new Date().toLocaleString("fa-IR"),
      text: `توان لشکر: ${formatCompact(m.combatPower || m.troops * 80)} · مختصات ستون: ${m.target?.q} ردیف: ${m.target?.r} · اعزام: ${m.troops} · بازمانده: ${m.troops - (m.lostTroops || 0)} · مجروح: ${m.lostTroops || 0} · غنیمت: ${Object.entries(resources).map(([id, n]) => `${RESOURCE_META[id].label} ${formatCompact(n)}`).join("، ") || "ندارد"}${items.length ? " · آیتم: " + items.map(i=>INVENTORY.find(x=>x.id===i.id)?.name||String(i)).join("، ") : ""}`
    });
    APP.battleReports = APP.battleReports.slice(0, 100);
    APP.unreadMail = APP.battleReports.filter(r => !r.read).length;
    updateBadges();
    saveGameProgress();
  }
  // پنج هدف آغازین در دسترس‌اند؛ هدف درجه پنج مسیر حداکثر پنج دقیقه دارد.
  function ensureStarterEnemy() {
    createEnemies();
    repairEnemySpacing();
    const home = APP.home;
    for (let level = 1; level <= 5; level++) {
      if (enemies.some(e => e.id === `starter-level-${level}`)) continue;
      if(restoreStarterTarget(`starter-level-${level}`,level,(level-1)%4))continue;
      let placed = false;
      for (let radius = 6; radius <= 30 && !placed; radius++) for (let dx = -radius; dx <= radius && !placed; dx++) for (const dy of [-radius, radius]) {
        const directions=[[dx,dy],[-dx,-dy],[dy,-dx],[-dy,dx],[dx,-dy]];
        const [ox,oy]=directions[(level-1)%directions.length];
        const q = home.q + ox, r = home.r + oy;
        if (q < 35 || r < 35 || q > 765 || r > 765 || insideEventArea(q, r) || terrainAt(q, r).blocked || enemyAtFootprint({
          q,
          r
        }) || APP.map.castles.some(c => mapDistance(c, {
          q,
          r
        }) < 3)) continue;
        const route = findMapRoute(home, {
          q,
          r
        });
        if (!route || route.length > 51 || !enemySpaceFree(q, r)) continue;
        const added = addEnemy({
          id: `starter-level-${level}`,
          q,
          r,
          level,
          type: (level - 1) % 4
        });
        placed = added;
        if (placed) break;
      }
    }
    for(let type=0;type<4;type++)for(let level=1;level<=5;level++){
      const id=`starter-faction-${type}-${level}`;
      if(enemies.some(e=>e.id===id))continue;
      if(restoreStarterTarget(id,level,type))continue;
      let placed=false;
      for(let radius=5;radius<=32&&!placed;radius++)for(let dx=-radius;dx<=radius&&!placed;dx++)for(const dy of [-radius,radius]){
        const q=home.q+dx,r=home.r+dy;
        if(q<35||r<35||q>765||r>765||terrainAt(q,r).blocked||insideEventArea(q,r)||!connectedGround[q*801+r]||!enemySpaceFree(q,r)||APP.map.castles.some(c=>mapDistance(c,{q,r})<3))continue;
        const route=findMapRoute(home,{q,r});if(!route||route.length>51)continue;
        placed=addEnemy({id,q,r,level,type});if(placed)break;
      }
    }
  }

  // مسیریابی لشکر با رعایت موانع زمین
  function findMapRoute(start, goal) {
    if (terrainAt(goal.q, goal.r).blocked) return null;
    const id = p => `${p.q},${p.r}`;
    const heap = [],
      costs = new Map([[id(start), 0]]),
      previous = new Map(),
      positions = new Map([[id(start), start]]);
    const push = node => {
      heap.push(node);
      for (let i = heap.length - 1; i > 0;) {
        const parent = i - 1 >> 1;
        if (heap[parent].f <= heap[i].f) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      }
    };
    const pop = () => {
      const top = heap[0],
        tail = heap.pop();
      if (heap.length) {
        heap[0] = tail;
        for (let i = 0;;) {
          let child = i * 2 + 1;
          if (child >= heap.length) break;
          if (child + 1 < heap.length && heap[child + 1].f < heap[child].f) child++;
          if (heap[i].f <= heap[child].f) break;
          [heap[i], heap[child]] = [heap[child], heap[i]];
          i = child;
        }
      }
      return top;
    };
    push({
      p: start,
      g: 0,
      f: mapDistance(start, goal) * 1.1
    });
    const goalId = id(goal);
    let inspected = 0;
    while (heap.length && inspected++ < 80000) {
      const current = pop(),
        currentId = id(current.p);
      if (current.g !== costs.get(currentId)) continue;
      if (currentId === goalId) {
        const route = [];
        let cursor = goalId;
        while (cursor) {
          route.push(positions.get(cursor));
          cursor = previous.get(cursor);
        }
        return route.reverse();
      }
      for (const next of mapNeighbors(current.p.q, current.p.r)) {
        if (terrainAt(next.q, next.r).blocked) continue;
        const nextId = id(next),
          score = current.g + 1;
        if (score >= (costs.get(nextId) ?? Infinity)) continue;
        costs.set(nextId, score);
        previous.set(nextId, currentId);
        positions.set(nextId, next);
        push({
          p: next,
          g: score,
          f: score + mapDistance(next, goal) * 1.1
        });
      }
    }
    return null;
  }
  function mapNeighbors(q, r) {
    const axialQ = q - Math.floor(r / 2);
    return [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].map(([dq, dr]) => {
      const row = r + dr;
      return {
        q: axialQ + dq + Math.floor(row / 2),
        r: row
      };
    }).filter(p => p.q >= 1 && p.q <= 800 && p.r >= 1 && p.r <= 800);
  }
  function mapNoise(q, r) {
    const n = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function mapSmooth(q, r, scale) {
    const x = q / scale,
      y = r / scale,
      ix = Math.floor(x),
      iy = Math.floor(y);
    const u = (x - ix) ** 2 * (3 - 2 * (x - ix)),
      v = (y - iy) ** 2 * (3 - 2 * (y - iy));
    const a = mapNoise(ix, iy) * (1 - u) + mapNoise(ix + 1, iy) * u;
    const b = mapNoise(ix, iy + 1) * (1 - u) + mapNoise(ix + 1, iy + 1) * u;
    return a * (1 - v) + b * v;
  }
  const terrainGrid = new Array(801 * 801);
  const terrainPalette = new Map();
  let connectedGround = null;
  const LAKES = [[140, 160, 18, 12], [280, 215, 24, 17], [580, 155, 17, 24], [675, 310, 26, 15], [170, 590, 20, 26], [480, 650, 29, 18], [660, 620, 15, 12], [300, 520, 16, 11]];
  function terrainAt(q, r) {
    if (q < 1 || r < 1 || q > 800 || r > 800) return {
      kind: "void",
      blocked: true,
      color: "#315f78",
      col: 1,
      row: 3
    };
    const k = q * 801 + r;
    let tile = terrainGrid[k];
    if (!tile) {
      const candidate = computeTerrain(q, r),
        signature = `${candidate.kind}:${candidate.col}:${candidate.row}`;
      if (!terrainPalette.has(signature)) terrainPalette.set(signature, candidate);
      tile = terrainGrid[k] = terrainPalette.get(signature);
    }
    return tile;
  }
  // حدود الجزيرة محاطة بالمحيط؛ الداخل بحيرات صغيرة متباعدة وبيئات متنوعة.
  function computeTerrain(q, r) {
    if (q < 1 || r < 1 || q > 800 || r > 800) return {
      kind: "void",
      blocked: true,
      color: "#315f78",
      col: 1,
      row: 3
    };
    const roll = mapNoise(q, r),
      dx = q - 400,
      dy = r - 400,
      radius = Math.hypot(dx, dy);
    const water = {
      kind: "water",
      blocked: true,
      col: 1,
      row: 3,
      color: "#376f89"
    };
    if (q===WORLD.eventQ && r===WORLD.eventR) return {
      kind: "tower",
      blocked: true,
      col: 0,
      row: 0,
      color: "#c6a269"
    };
    if (Math.min(q, r, 801 - q, 801 - r) < 30 + 5 * Math.sin(q / 34) * Math.cos(r / 41)) return water;
    const gate = Math.abs(dx) < 2 || Math.abs(dy) < 2 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 2;
    if (radius >= 17 && radius <= 20 && !gate) return {
      kind: "mountain",
      blocked: true,
      col: Math.floor(roll * 4),
      row: 2,
      color: "#81786b"
    };
    if (radius < 45) return {
      kind: "desert",
      blocked: false,
      col: roll > .5 ? 0 : 1,
      row: 0,
      color: "#c6a269"
    };
    if (LAKES.some(([x, y, w, h]) => ((q - x) / w) ** 2 + ((r - y) / h) ** 2 < 1)) return water;
    const band = mapSmooth(q, r, 100),
      detail = mapSmooth(q, r, 27);
    const corridor = q % 40 < 3 || r % 40 < 3;
    if (band < .38) return {
      kind: "desert",
      blocked: false,
      col: roll > .5 ? 0 : 1,
      row: 0,
      color: "#c9aa72"
    };
    if (band > .68 && !corridor && detail > .56 && roll > .57) return {
      kind: "mountain",
      blocked: true,
      col: Math.floor(roll * 4),
      row: 2,
      color: "#8e8b78"
    };
    if (band > .68) return {
      kind: "highland",
      blocked: false,
      col: roll > .5 ? 2 : 0,
      row: 1,
      color: "#b1a077"
    };
    if (!corridor && detail > .54 && roll > .83) return {
      kind: "forest",
      blocked: true,
      col: Math.floor(roll * 4),
      row: 4,
      color: "#405c34"
    };
    return {
      kind: "grass",
      blocked: false,
      col: Math.floor(roll * 3),
      row: 5,
      color: "#7f9656"
    };
  }
  // از بزرگ‌ترین شبکه قابل عبور، نواحی منزوی حذف می‌شوند تا هیچ قلعه‌ای محبوس نشود.
  const ODD_NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [1, 1], [0, -1], [1, -1]],
    EVEN_NEIGHBORS = [[1, 0], [-1, 0], [-1, 1], [0, 1], [-1, -1], [0, -1]];
  function prepareConnectedGround() {
    if (connectedGround) return;
    connectedGround = new Uint8Array(801 * 801);
    const queue = new Int32Array(640000);
    let head = 0,
      tail = 0;
    const start = 410 * 801 + 400;
    queue[tail++] = start;
    connectedGround[start] = 1;
    while (head < tail) {
      const k = queue[head++],
        q = Math.floor(k / 801),
        r = k % 801;
      // همسایه‌های شبکه فرد/زوج با شناسه عددی؛ از تخصیص میلیون‌ها آبجکت جلوگیری می‌کند.
      const shifts = r % 2 ? ODD_NEIGHBORS : EVEN_NEIGHBORS;
      for (const [dq, dr] of shifts) {
        const x = q + dq,
          y = r + dr;
        if (x < 1 || x > 800 || y < 1 || y > 800) continue;
        const id = x * 801 + y;
        if (connectedGround[id] || terrainAt(x, y).blocked) continue;
        connectedGround[id] = 1;
        queue[tail++] = id;
      }
    }
    const isolatedForest = {
      kind: "forest",
      blocked: true,
      col: 1,
      row: 4,
      color: "#405c34"
    };
    for (let q = 1; q <= 800; q++) for (let r = 1; r <= 800; r++) {
      const k = q * 801 + r,
        t = terrainAt(q, r);
      if (!t.blocked && !connectedGround[k]) terrainGrid[k] = isolatedForest;
    }
  }
  const MAP_DETAIL_ZOOM = 1.45;
  function castleFootprint(q,r) { return [{q,r}]; }

  function mapBuildingFits(q, r, ignoreId = null) {
    if (!connectedGround) prepareConnectedGround();
    const tiles = castleFootprint(q, r);
    return tiles.length === 1 && tiles.every(p => connectedGround[p.q * 801 + p.r] && !terrainAt(p.q, p.r).blocked) && !APP.map.castles.some(c => c.id !== ignoreId && mapDistance(c,{q,r})<3);
  }
  function mapHexPath(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i + 30);
      const px = x + size * Math.cos(angle),
        py = y + size * Math.sin(angle);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

