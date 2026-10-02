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
const documentEvents=[];const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)},querySelector(){return new Node()},querySelectorAll(){return []},createElement(){return new Node()},createElementNS(){return new Node()},addEventListener(type,run,capture){documentEvents.push({type,run,capture})},body:new Node()};
class Img extends Node{constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}}
const local=new Map(),frames=[];let now=0;
const context={document,console,Date,Math,Map,Set,Uint8Array,Float32Array,Object,Array,Number,String,Promise,Image:Img,ResizeObserver:class{observe(){}},navigator:{deviceMemory:8},window:{devicePixelRatio:1,addEventListener(){},matchMedia(){return {matches:false}}},performance:{now:()=>now},localStorage:{setItem(k,v){local.set(k,v)},getItem(k){return local.get(k)||null},removeItem(k){local.delete(k)}},setTimeout(){return 1},setInterval(){return 1},clearTimeout(){},requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){}};
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile,findSpawn,enemyLevel,enemyDropItem,enemies,ENEMY_TYPES,ensureStarterEnemy,resolveEnemyBattle,enemyRequirement,enemyResources,findMapRoute,occupiedTiles,footprintFits,canPlaceBuilding,empireAt,empireCenters,INVENTORY,showUITour,setNarratorText,advanceNarrator,setupTutorial,closePanels,updateMarches,saveGameProgress,loadGameProgress,drawTerritoryTerrain,terrainAtlas,productionMultiplier,productionRate,tickCollectors,collectResource,startArmyTask,tickArmy,speedArmy,totalArmyPower,updatePower,TROOPS,TROOP_LINES,researchLine,troopUnlocked,troopStats,woundedStock,awardTablets,availableTablets,openTraining,openHealing,openResearch,openSettings,openSkins,AVATAR_SKINS,CASTLE_SKINS,selectedAvatarSkin,selectedCastleImage,applySkinAppearance,buildingImage,setSkinConfirmation:fn=>{gameConfirm=fn},openLeaderboard,openTroopsOverview,openBattleReport,startBranchResearch,queueMarkup,marchCapacity,startSecondBuild,tickAdditionalQueues,startResearch,finishTutorial,reserveTroops,respawnEnemies,enemySpaceFree,buildingDuration,buildingPower,buildingCost,MISSION_DATA,TRAINING_KEYS,UNIT_ROLES,trainingCapacity,trainingLimit,trainingDuration,migrateUnitStock,troopCounterMultiplier,armyCounterMultiplier,cancelArmyQueue,renderTrainingPage};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;t.startGame(true);t.APP.tutorial.active=false;t.createWorldMap();

(async()=>{
 const barracks=t.state.buildings.find(b=>b.id==='barracks');barracks.level=1;
 for(const u of t.TROOP_LINES)t.researchLine(u.id).unlocked=true;
 for(const k of ['wood','food','stone','iron','gold'])t.APP.resources[k]=1000000;
 t.setSkinConfirmation(async()=>true);
 assert.equal(t.trainingCapacity(),100);
 for(const role of t.UNIT_ROLES){
  const a=t.TROOP_LINES.find(u=>u.group==='attack'&&u.role===role.id),d=t.TROOP_LINES.find(u=>u.group==='defense'&&u.role===role.id);
  assert(a.attack>d.attack);assert(d.defense>a.defense);assert(d.health>a.health);assert.notEqual(a.image,d.image);
  assert.equal(t.troopCounterMultiplier(role.id,role.counters),1.25);
  assert.equal(t.troopCounterMultiplier(role.counters,role.id),.8);
  assert.equal(t.troopCounterMultiplier(role.id,role.id),1);
 }
 assert.equal(t.armyCounterMultiplier({archer:100},'cavalry'),1.25);
 // The capacity rule is enforced in the action, not only by the slider.
 const before=t.APP.resources.food;
 for(const k of t.TRAINING_KEYS){document.getElementById('armyType').value='sword';document.getElementById('armyCount').value='101';t.startArmyTask(k);assert.equal(t.APP.army[k],null);}
 assert.equal(t.APP.resources.food,before);
 barracks.level=2;assert.equal(t.trainingCapacity(),200);
 for(const [i,k] of [...t.TRAINING_KEYS].entries()){
  document.getElementById('armyType').value=['sword','archer','guard'][i];document.getElementById('armyCount').value='150';t.startArmyTask(k);assert.equal(t.APP.army[k].count,150);
 }
 assert.equal(t.APP.resources.food,before-150*(25+28+25));
 const task=t.APP.army.training2,cost=t.APP.resources.food;
 t.startArmyTask('training2');assert.equal(t.APP.army.training2,task);assert.equal(t.APP.resources.food,cost);
 // Persist all queues and finish the same offline timestamp exactly once.
 const trained=t.APP.army.totalTrained||0,troops=t.APP.army.troops;
 for(const k of t.TRAINING_KEYS)t.APP.army[k].endsAt=Date.now()-1;
 t.saveGameProgress();for(const k of t.TRAINING_KEYS)t.APP.army[k]=null;t.loadGameProgress();
 for(const k of t.TRAINING_KEYS)assert(t.APP.army[k]);
 t.tickArmy();assert.equal(t.APP.army.troops,troops+450);assert.equal(t.APP.army.totalTrained,trained+450);
 t.tickArmy();assert.equal(t.APP.army.troops,troops+450);
 // Cancellation refunds only the selected queue, preserving its neighbors.
 for(const k of t.TRAINING_KEYS){document.getElementById('armyType').value='sword';document.getElementById('armyCount').value='50';t.startArmyTask(k);}
 const q1=t.APP.army.training,q3=t.APP.army.training3,refund=t.APP.resources.food;
 assert(await t.cancelArmyQueue('training2'));assert.equal(t.APP.resources.food,refund+875);assert.equal(t.APP.army.training,q1);assert.equal(t.APP.army.training3,q3);
 // An unrelated item cannot accelerate troops; a troop item targets one queue.
 const wrong=t.INVENTORY.find(i=>i.family==='heal');wrong.count=3;const end=q1.endsAt;
 await t.speedArmy('training',wrong.id);assert.equal(q1.endsAt,end);assert.equal(wrong.count,3);
 const speed=t.INVENTORY.find(i=>i.family==='troop');speed.count=2;const otherEnd=q3.endsAt;
 await t.speedArmy('training',speed.id);assert.equal(speed.count,1);assert.equal(t.APP.army.training3.endsAt,otherEnd);
 // Delayed confirmation cannot cancel/charge a newly replaced task.
 let answer;t.setSkinConfirmation(()=>new Promise(r=>answer=r));
 const pending=t.speedArmy('training3');const gold=t.APP.resources.gold;
 t.APP.army.training3={...q3};answer(true);await pending;assert.equal(t.APP.resources.gold,gold);
 t.setSkinConfirmation(async()=>true);await t.speedArmy('training3');assert.equal(t.APP.army.training3,null);
 // Legacy tiers become the one corresponding soldier without losing stock.
 const merged=t.migrateUnitStock({sword:4,'sword-2':7,'sword-3':9,'archer-2':8});assert.equal(merged.sword,20);assert.equal(merged.archer,8);assert.equal(Object.keys(merged).length,8);
 t.APP.army.units={sword:4,'sword-2':7,'sword-3':9};t.APP.army.troops=20;
 t.APP.army.woundedUnits={'guard-2':5,guard:2};t.APP.army.wounded=7;
 t.APP.army.training3={count:12,type:'archer-3',cost:480,duration:900000,endsAt:Date.now()+900000};
 t.saveGameProgress();t.loadGameProgress();assert.equal(t.APP.army.units.sword,20);assert.equal(t.APP.army.woundedUnits.guard,7);assert.equal(t.APP.army.training3.type,'archer');
 // No queue from an earlier in-memory session survives an explicitly empty save.
 t.APP.army.training3=null;t.saveGameProgress();t.APP.army.training3={...q3};t.loadGameProgress();assert.equal(t.APP.army.training3,null);
 for(const k of t.TRAINING_KEYS)t.APP.army[k]=null;
 t.openTraining();const content=document.getElementById('genericPanelContent');
 assert(content.innerHTML.includes('type="range"'));assert(!content.innerHTML.includes('type="number"'));
 assert.equal((content.innerHTML.match(/data-training-slot=/g)||[]).length,3);
 assert.equal((content.innerHTML.match(/data-training-unit=/g)||[]).length,4);
 assert(content.innerHTML.includes('training-art'));assert(document.getElementById('genericPanel').className.includes('training-page'));
 const click=dataset=>content.onclick({target:{closest:()=>({dataset})}});
 await click({trainingSlot:'2'});assert(content.innerHTML.includes('data-start-army="training3"'));
 await click({trainingSlot:'1'});assert(content.innerHTML.includes('data-start-army="training2"'));
 await click({trainingGroup:'defense'});assert(content.innerHTML.includes('assets/troops/defense-'));
 await click({trainingPanel:'stats'});assert(content.innerHTML.includes('training-stats'));
 await click({trainingClose:''});await click({trainingPanel:'counters'});assert(content.innerHTML.includes('counter-strong'));assert(content.innerHTML.includes('counter-weak'));
 await click({trainingClose:''});
 content.oninput({target:{id:'armyCount',value:'40'}});assert(document.getElementById('trainingCountOutput').textContent.startsWith('40'));
 t.APP.resources.food=350;t.APP.resources.iron=700;assert.equal(t.trainingLimit(),14);
 assert.equal(t.trainingDuration(100),Math.round(100*t.TROOPS.guard.seconds*1000/1.04));
 console.log('PASS: eight distinct offense/defense units, counter cycle, equal growing queue capacities, simultaneous queues, offline exactly-once completion, isolated refunds/speed/coins, stale confirmation safety, legacy migration, slider and category/stats/counter interactions.');
})().catch(e=>{console.error(e);process.exitCode=1});
