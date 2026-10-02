  // Faction ladders and exact compositions are independent of presentation names.
  function enemyUnlocked(type,level) { return Number.isInteger(type) && type>=0 && type<4 && Number.isInteger(level) && level>=1 && level<=Math.min(25,(APP.enemyProgress[ENEMY_TYPES[type]?.id]||0)+1); }
  function enemyArmy(level,type=0) {
    const count=Math.max(12,Math.round(12*Math.pow(1.31,Math.max(0,level-1))));
    const roles=type===0?["spear","bow","cavalry","special"]:[ENEMY_TYPES[type]?.role||"spear"];
    const factor=1+(level-1)*.012;
    return roles.map((role,index)=>({id:role,role,count:Math.floor(count/roles.length)+(index<count%roles.length?1:0),attack:26*factor,defense:18*factor,health:100*factor}));
  }
  function simulateCombat(units,level,type=0) {
    const attackers=Object.entries(units||{}).filter(([id,n])=>TROOPS[id]&&Number.isInteger(n)&&n>0).map(([id,count])=>({...troopStats(id),id,count}));
    const defenders=enemyArmy(level,type);
    for(const side of [attackers,defenders]) for(const g of side) g.hp=g.count*g.health;
    const remaining=side=>side.reduce((s,g)=>s+g.hp,0);
    const damage=(source,target)=>{
      const hp=remaining(target); if(!hp) return 0;
      return source.reduce((sum,a)=>sum+(a.hp/a.health)*a.attack*target.reduce((v,d)=>v+d.hp/hp*troopCounterMultiplier(a.role,d.role)/(1+d.defense/75),0),0);
    };
    const absorb=(side,hits)=>{const total=remaining(side),ratio=Math.max(0,1-hits/Math.max(1,total));for(const g of side)g.hp*=ratio;};
    let rounds=0;
    while(remaining(attackers)>.01 && remaining(defenders)>.01 && rounds<120){
      const outgoing=damage(attackers,defenders),incoming=damage(defenders,attackers);
      absorb(attackers,incoming);absorb(defenders,outgoing);rounds++;
    }
    const victory=remaining(defenders)<=.01&&remaining(attackers)>.01;
    const casualties=Object.fromEntries(attackers.map(g=>[g.id,Math.min(g.count,Math.max(0,g.count-Math.ceil(g.hp/g.health)))]));
    return {victory,rounds,casualties,wounded:Object.values(casualties).reduce((a,b)=>a+b,0),enemyCount:defenders.reduce((s,g)=>s+g.count,0),survivors:Object.fromEntries(attackers.map(g=>[g.id,g.count-casualties[g.id]]))};
  }
  function readyUnitStock() {
    const stock=migrateUnitStock(APP.army.units||{}),known=Object.values(stock).reduce((a,b)=>a+b,0);
    if(known<APP.army.troops)stock.sword+=APP.army.troops-known;
    return stock;
  }
  function validDeployment(units) {
    if(!units||typeof units!=="object"||Array.isArray(units))return false;
    const stock=readyUnitStock();let count=0;
    for(const [id,n] of Object.entries(units)){
      if(!TROOPS[id]||!Number.isInteger(n)||n<0||n>(stock[id]||0))return false;count+=n;
    }
    return count>0&&count<=APP.army.troops&&count<=marchCapacity();
  }
  function reserveSelectedTroops(units) {
    if(!validDeployment(units))return null;
    APP.army.units=readyUnitStock();
    const result={};for(const [id,n] of Object.entries(units))if(n){APP.army.units[id]-=n;result[id]=n;}
    APP.army.troops-=Object.values(result).reduce((a,b)=>a+b,0);return result;
  }
  function openDeployment(type,target) {
    const stock=readyUnitStock(),selected={};
    const rows=Object.entries(stock).filter(([,n])=>n>0).map(([id,n])=>`<label class="deploy-unit"><img src="${TROOPS[id].image}" alt=""><span><strong>${TROOPS[id].name}</strong><small>آماده: ${formatCompact(n)}</small><input type="range" min="0" max="${Math.min(n,marchCapacity())}" step="1" value="0" data-deploy="${id}"></span><output data-deploy-count="${id}">۰</output></label>`).join("");
    showGameDialog("آرایش لشکر",`<div class="deployment-head"><span>${escapeHTML(target.name||"مقصد")}</span><small>ظرفیت ${formatCompact(marchCapacity())}</small></div><div class="deployment-units">${rows||"<p>نیروی آماده ندارید؛ در رزمگاه نیرو آموزش دهید.</p>"}</div><div class="deployment-summary" id="deploymentSummary">نیروها را با اسلایدر انتخاب کنید.</div>`,[{label:"انصراف",run:closeGameDialog},{label:"اعزام لشکر",primary:true,run:()=>{
      if(!validDeployment(selected))return showBuildNotice("تعداد انتخاب‌شده باید در ظرفیت لشکر و موجودی نیروها باشد.");
      APP.selectedMapCastle={...target};
      if(startMarch(type,{...selected}))closeGameDialog();
    }}]);
    const content=document.getElementById("gameDialogContent");
    content.oninput=event=>{
      const id=event.target.dataset.deploy;if(!id)return;
      const others=Object.entries(selected).reduce((n,[key,v])=>n+(key===id?0:v),0);
      selected[id]=Math.max(0,Math.min(Math.floor(Number(event.target.value)||0),stock[id],marchCapacity()-others));event.target.value=selected[id];
      content.querySelector(`[data-deploy-count="${id}"]`).textContent=selected[id].toLocaleString("fa-IR");
      const count=Object.values(selected).reduce((a,b)=>a+b,0),power=Object.entries(selected).reduce((n,[key,v])=>n+v*TROOPS[key].power,0);
      const preview=target.enemyId&&count?simulateCombat(selected,target.enemyLevel,target.enemyType):null;
      document.getElementById("deploymentSummary").textContent=`${formatCompact(count)} نیرو · توان ${formatCompact(power)}`+(preview?` · ${preview.victory?"برآورد پیروزی":"خطر شکست"} · مجروح احتمالی ${formatCompact(preview.wounded)}`:"");
    };
  }
  function nearestEnemy(type,level) {
    return enemies.filter(e=>e.type===type&&e.level===level&&(APP.enemyDefeated[e.id]||0)<=Date.now()).sort((a,b)=>mapDistance(APP.home,a)-mapDistance(APP.home,b)||a.id.localeCompare(b.id))[0]||null;
  }
  function openEnemySearch() {
    let selected=0,level=1;
    showGameDialog("ردیابی سرگردان",`<div class="enemy-search-types">${ENEMY_TYPES.map((t,i)=>`<button type="button" data-enemy-type="${i}" class="${i===0?"is-selected":""}"><img src="${t.image}" alt=""><strong>${t.name}</strong></button>`).join("")}</div><label class="enemy-search-level">درجه <input id="enemySearchLevel" type="range" min="1" max="25" value="1"><output id="enemySearchValue">۱</output></label><p id="enemySearchHint">درجه ۱ باز است؛ برای بازکردن درجه بعدی، درجه قبلی همین گروه را شکست دهید.</p>`,[{label:"بستن",run:closeGameDialog},{label:"پیدا کردن نزدیک‌ترین",primary:true,run:()=>{
      const enemy=nearestEnemy(selected,level);if(!enemy)return showBuildNotice("این درجه فعلاً در نقشه موجود نیست؛ درجه دیگری انتخاب کنید یا منتظر بازگشت سرگردان‌ها بمانید.");
      APP.map.camera.zoom=Math.max(MAP_DETAIL_ZOOM,APP.map.camera.zoom);centerMapOn(enemy.q,enemy.r);closeGameDialog();openEnemy(enemy);
    }}]);
    const content=document.getElementById("gameDialogContent");
    const update=()=>{document.getElementById("enemySearchValue").textContent=level.toLocaleString("fa-IR");document.getElementById("enemySearchHint").textContent=enemyUnlocked(selected,level)?"این درجه برای حمله باز است.":"حمله قفل است؛ ابتدا درجه قبلی همین گروه را شکست دهید.";};
    content.onclick=e=>{const b=e.target.closest("[data-enemy-type]");if(!b)return;selected=Number(b.dataset.enemyType);content.querySelectorAll("[data-enemy-type]").forEach(x=>x.classList.toggle("is-selected",x===b));update();};
    content.oninput=e=>{if(e.target.id!=="enemySearchLevel")return;level=Math.max(1,Math.min(25,Math.floor(Number(e.target.value)||1)));update();};
  }
  function enemyRewardChips(level,type) {
    const randomFamily=ENEMY_TYPES[type].drop==="random";
    const ids=randomFamily?[0,.4,.8].map(value=>enemyDropItem(level,0,()=>value)):[enemyDropItem(level,type,()=>0)];
    const drops=[...new Set(ids)].map(id=>({id,chance:35/ids.length}));
    drops.push({id:"march-speed-10",chance:20},{id:"march-speed-50",chance:5},{id:"march-recall",chance:15});
    return drops.map(({id,chance})=>{const item=INVENTORY.find(i=>i.id===id);return item?`<span><img src="${item.image}" alt="${item.name}"><small>${item.name}</small><b>${Number(chance.toFixed(1))}٪</b></span>`:"";}).join("");
  }
  function battleItemMarkup(items) {
    return (items||[]).map(entry=>{const item=INVENTORY.find(i=>i.id===(entry.id||entry)||i.name===entry);return item?`<span><img src="${item.image}" alt="${item.name}">${escapeHTML(item.name)} ×${entry.count||1}</span>`:`<span>${escapeHTML(typeof entry==="string"?entry:entry.id||"")}</span>`;}).join("");
  }
  function marchDirection(m,now=Date.now()) {
    const route=m.phase==="returning"?[...m.route].reverse():m.route;
    if(!route||route.length<2)return m.directionRow??4;
    const i=Math.max(0,Math.min(route.length-2,Math.floor(marchProgress(m,now)*(route.length-1))));
    const a=routeCenter(route[i]),b=routeCenter(route[i+1]);
    if(a[0]===b[0]&&a[1]===b[1])return m.directionRow??4;
    return (Math.round((Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2)/(Math.PI/4))+8)%8;
  }

  function restoreStarterTarget(id,level,type) {
    const pos=(APP.savedEnemyPositions||[]).find(e=>e.id===id);
    if(!pos||!Number.isInteger(pos.q)||!Number.isInteger(pos.r)||pos.q<1||pos.q>800||pos.r<1||pos.r>800||terrainAt(pos.q,pos.r).blocked||insideEventArea(pos.q,pos.r)||!connectedGround[pos.q*801+pos.r])return false;
    return addEnemy({id,q:pos.q,r:pos.r,level,type});
  }
