// آزمون اصلاحات مشاور، جانمایی یک کاشی، شروع امن و پاداش دشمن
// آزمون راه‌اندازی، رابط، تأیید عملیات و قرارداد اتحاد با DOM شبیه‌سازی‌شده
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Node{
 constructor(){this.clientWidth=390;this.clientHeight=650;this.dataset={};this.style={setProperty(){}};this.listeners={};this.children=[];this.hidden=false;this.value='1';this.classList={s:new Set(),add(...x){x.forEach(v=>this.s.add(v))},remove(...x){x.forEach(v=>this.s.delete(v))},contains(x){return this.s.has(x)},toggle(x,b){const active=b??!this.s.has(x);active?this.s.add(x):this.s.delete(x);return active;}};}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
 insertAdjacentHTML(position,html){this.innerHTML=(this.innerHTML || "")+html;}
 remove(){} appendChild(x){this.children.push(x);return x}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}getAttribute(k){return this[k]||null}closest(){return null}focus(){}setPointerCapture(){}releasePointerCapture(){}
 querySelector(){return new Node()}querySelectorAll(){return []}getBoundingClientRect(){return {left:0,top:0,width:390,height:650,right:390,bottom:650}}
 getContext(){return new Proxy({createRadialGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:(()=>{})}})}
}
const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)},querySelector(){return new Node()},querySelectorAll(){return []},createElement(){return new Node()},createElementNS(){return new Node()},addEventListener(){},body:new Node()};
class Img extends Node{constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}}
const local=new Map(),frames=[];let now=0;
const context={document,console,Date,Math,Map,Set,Uint8Array,Float32Array,Object,Array,Number,String,Promise,Image:Img,ResizeObserver:class{observe(){}},navigator:{deviceMemory:8},window:{devicePixelRatio:1,addEventListener(){},matchMedia(){return {matches:false}}},performance:{now:()=>now},localStorage:{setItem(k,v){local.set(k,v)},getItem(k){return local.get(k)||null},removeItem(k){local.delete(k)}},setTimeout(){return 1},setInterval(){return 1},clearTimeout(){},requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){}};
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile,findSpawn,enemyLevel,enemyDropItem,enemies,ENEMY_TYPES,ensureStarterEnemy,resolveEnemyBattle,enemyRequirement,enemyResources,findMapRoute,occupiedTiles,footprintFits,canPlaceBuilding,empireAt,empireCenters,INVENTORY,showUITour,setNarratorText,advanceNarrator,setupTutorial,closePanels,updateMarches,saveGameProgress,loadGameProgress,drawTerritoryTerrain,terrainAtlas,productionMultiplier,productionRate,tickCollectors,collectResource,startArmyTask,tickArmy,TROOPS,researchLine,marchCapacity,startSecondBuild,tickAdditionalQueues,startResearch,finishTutorial,reserveTroops,respawnEnemies,enemySpaceFree,buildingDuration,buildingPower,buildingCost,MISSION_DATA};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;t.startGame(true);t.APP.tutorial.active=false;t.createWorldMap();
// کاشی کوچک یک خانه و ساختمان‌های بزرگ چهار خانه دارند و همه جانمایی‌ها معتبرند.
for(const b of t.state.buildings){assert.equal(t.occupiedTiles(b,b.q,b.r).length,b.footprint);assert(t.footprintFits(b,b.q,b.r));}
// تولید با ورود و خروج حفظ می‌شود، خودکار به کیف نمی‌رود و پس از هشت ساعت متوقف می‌شود.
const farm=t.state.buildings.find(b=>b.id==='farm');farm.level=1;const economyNow=Date.now(),rate=t.productionRate('farm');t.APP.collectors.farm={amount:0,at:economyNow-10*3600000,collectedAt:economyNow-10*3600000};const food=t.APP.resources.food;t.tickCollectors(economyNow);assert.equal(t.APP.resources.food,food);assert.equal(t.APP.collectors.farm.amount,rate*8*t.productionMultiplier('food'));t.collectResource('farm');assert(t.APP.resources.food>food);assert(t.APP.collectors.farm.amount<1);t.saveGameProgress();const at=t.APP.collectors.farm.collectedAt;t.APP.collectors={};t.loadGameProgress();assert.equal(t.APP.collectors.farm.collectedAt,at);
// سه نوع نیرو هزینه و زمان مستقل دارند؛ تکمیل صف فقط یک بار نیرو می‌دهد.
t.APP.resources.food=t.APP.resources.iron=1000000;t.state.buildings.find(b=>b.id==='barracks').level=1;
for(const id of ['sword','archer','knight']){t.researchLine(id).unlocked=true;document.getElementById('armyType').value=id;document.getElementById('armyCount').value='100';const initial=t.APP.army.troops;t.startArmyTask('training');assert.equal(t.APP.army.training.type,id);assert.equal(t.APP.army.training.duration,100*t.TROOPS[id].seconds*1000);t.APP.army.training.endsAt=Date.now()-1;t.tickArmy();assert.equal(t.APP.army.troops,initial+100);t.tickArmy();assert.equal(t.APP.army.troops,initial+100);}
t.state.buildings.find(b=>b.id==='hospital').level=1;t.APP.army.wounded=50;document.getElementById('armyCount').value='50';t.startArmyTask('healing');assert.equal(t.APP.army.wounded,0);t.APP.army.healing.endsAt=Date.now()-1;const troops=t.APP.army.troops;t.tickArmy();assert.equal(t.APP.army.troops,troops+50);
// رزرو نیرو ترکیب را کم می‌کند و نیروهای شوالیه توان متفاوت دارند.
const reserved=t.reserveTroops(200);assert.equal(Object.values(reserved).reduce((a,b)=>a+b,0),200);
const camp=t.state.buildings.find(b=>b.id==='camp');camp.level=1;assert.equal(t.marchCapacity(),500);camp.level=20;assert.equal(t.marchCapacity(),45000);
// جمع قدرت ساختمان‌ها دقیقاً دوازده میلیون و روزانه دقیقاً پانصد سکه است.
assert.equal([...t.state.buildings.map(b=>t.buildingPower(20,b.id)),t.buildingPower(20,'wall')].reduce((a,b)=>a+b,0),12000000);assert.equal(t.MISSION_DATA.daily.reduce((sum,m)=>sum+(m.reward.resources.gold||0),0),500);
// زمان همه ساخت‌ها با یک کارگر کمتر از شروع رویداد پایانی است.
const seconds=t.state.buildings.reduce((sum,b)=>sum+Array.from({length:20},(_,i)=>t.buildingDuration(i+1,b.id)/1000).reduce((a,b)=>a+b,0),0)+Array.from({length:20},(_,i)=>t.buildingDuration(i+1,'wall')/1000).reduce((a,b)=>a+b,0);assert(seconds<47*86400);assert(130000*t.TROOPS.sword.seconds/3/1.76<47*86400);
// کارگر دوم مستقل کامل می‌شود و دوباره سطح را افزایش نمی‌دهد.
t.APP.secondBuilder=true;for(const k of ['food','wood','stone','iron'])t.APP.resources[k]=10000000;t.state.buildings.find(b=>b.id==='castle').level=5;const lumber=t.state.buildings.find(b=>b.id==='lumber');lumber.level=0;t.startSecondBuild('lumber');assert.equal(t.APP.worker2.task.target,1);t.APP.worker2.endsAt=Date.now()-1;t.tickAdditionalQueues();assert.equal(lumber.level,1);t.tickAdditionalQueues();assert.equal(lumber.level,1);
// پژوهش، آیتم‌ها و وضعیت صف‌ها بعد از بارگذاری می‌مانند.
t.state.buildings.find(b=>b.id==='research').level=2;t.startResearch();assert.equal(t.APP.research.task,null);t.APP.research.level=1;t.saveGameProgress();t.APP.research.level=0;t.loadGameProgress();assert.equal(t.APP.research.level,1);
for(const family of ['build','troop','heal'])for(const minute of [1,5,10,30,60])assert(t.INVENTORY.some(i=>i.family===family&&i.value===minute*60000));for(const family of ['universal','research'])for(const minute of [10,30,60])assert(t.INVENTORY.some(i=>i.family===family&&i.value===minute*60000));assert(t.INVENTORY.every(i=>i.image.startsWith('assets/items/')));
// فاصله سرگردان‌ها به صورت مکانی کنترل می‌شود و محل احیای دشمن متفاوت است.
for(const e of t.enemies)assert(t.enemySpaceFree(e.q,e.r,e.id));const enemy=t.enemies[0],old={q:enemy.q,r:enemy.r};t.APP.enemyDefeated[enemy.id]=Date.now()-1;t.respawnEnemies();assert(!t.APP.enemyDefeated[enemy.id]);assert(enemy.q!==old.q||enemy.r!==old.r);assert(t.enemySpaceFree(enemy.q,enemy.r,enemy.id));
console.log('PASS: footprints, eight-hour collectible production/persistence, all troop types, exactly-once training/healing, capacity, 12m building power, 500 daily coins, season time budgets, second worker, research, complete item families, NPC spacing and relocated respawn. Total building queue days:',(seconds/86400).toFixed(2));

// آموزش نیرو و درمان هم قبل از معرفی رابط انجام می‌شود و در همان مرحله گیر نمی‌کند.
t.APP.tutorial={active:true,step:12,phase:'focus'};t.APP.tutorialSkipped=false;t.APP.army.totalTrained=0;t.APP.army.totalHealed=0;t.APP.army.practiceWounded=false;t.APP.army.wounded=0;t.finishTutorial();assert.equal(t.APP.tutorial.phase,'army-training');document.getElementById('armyType').value='sword';document.getElementById('armyCount').value='100';t.startArmyTask('training');assert.equal(t.APP.tutorial.phase,'army-training');t.APP.army.training.endsAt=Date.now()-1;t.tickArmy();assert.equal(t.APP.tutorial.phase,'army-healing');assert.equal(t.APP.army.wounded,10);document.getElementById('armyCount').value='10';t.startArmyTask('healing');t.APP.army.healing.endsAt=Date.now()-1;t.tickArmy();assert.equal(t.APP.tutorial.phase,'ui-tour');console.log('PASS: guided troop training, one-time practice wounds and healing advance into UI introduction.');
// خروجی جدول‌های مستندات از خود مقادیر اجرایی گرفته می‌شود تا با بازی متفاوت نباشند.
if(process.argv.includes('--docs')){
 const names=['# تصاویر مشترک خانواده‌های آیتم‌ها','','تصاویر خودتان را در `assets/items/` با نام‌های زیر قرار دهید. تمام اندازه‌های هر خانواده تصویر مشترک دارند.','','| آیتم | نام WebP |','|---|---|'];
 for(const i of t.INVENTORY)names.push(`| ${i.resourceName ? i.resourceName+' · ' : ''}${i.name} | ${i.image.split("/").at(-1)} |`);
 fs.writeFileSync('docs/ITEM_IMAGE_NAMES.md',names.join('\n')+'\n');
 const rows=[['ساختمان','سطح','زمان_ثانیه','قدرت_کل','افزایش_قدرت','چوب','غذا','سنگ','آهن','تولید_ساعتی','ظرفیت_لشکر']];
 for(const b of [...t.state.buildings,{id:'wall',name:'دیوار'}])for(let level=1;level<=20;level++){const cost=t.buildingCost(b,level);rows.push([b.name,level,t.buildingDuration(level,b.id)/1000,t.buildingPower(level,b.id),t.buildingPower(level,b.id)-t.buildingPower(level-1,b.id),...["wood","food","stone","iron"].map(id=>cost[id]),['farm','lumber','stone','iron'].includes(b.id)?Math.round(600*level**1.55):0,b.id==='camp'?Math.round(500+44500*((level-1)/19)**1.25):0]);}
 fs.writeFileSync('docs/BALANCE_BUILDINGS.csv','\ufeff'+rows.map(r=>r.join(',')).join('\n')+'\n');
}

// تولید آفلاین قبل و بعد از تکمیل ارتقا با نرخ سطح مربوط محاسبه می‌شود.
t.APP.tutorial.active=false;farm.level=1;const splitNow=Date.now();t.APP.collectors.farm={amount:0,at:splitNow-7200000,collectedAt:splitNow-7200000};const previousWorker=t.APP.worker;t.APP.worker={task:{id:'farm',target:2},endsAt:splitNow-3600000};t.tickCollectors(splitNow);assert(Math.abs(t.APP.collectors.farm.amount-(Math.round(280*1**1.65)+Math.round(280*2**1.65))*t.productionMultiplier('food'))<.01);t.APP.worker=previousWorker;console.log('PASS: offline production splits correctly at an upgrade completion boundary.');
