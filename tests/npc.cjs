// آزمون اصلاحات مشاور، جانمایی یک کاشی، شروع امن و پاداش دشمن
// آزمون راه‌اندازی، رابط، تأیید عملیات و قرارداد اتحاد با DOM شبیه‌سازی‌شده
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Node{
 constructor(){this.clientWidth=390;this.clientHeight=650;this.dataset={};this.style={setProperty(){}};this.listeners={};this.children=[];this.hidden=false;this.value='1';this.classList={s:new Set(),add(...x){x.forEach(v=>this.s.add(v))},remove(...x){x.forEach(v=>this.s.delete(v))},contains(x){return this.s.has(x)},toggle(x,b){const active=b??!this.s.has(x);active?this.s.add(x):this.s.delete(x);return active;}};}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
 remove(){} appendChild(x){this.children.push(x);return x}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this[k]=v}getAttribute(k){return this[k]||null}closest(){return null}focus(){}setPointerCapture(){}releasePointerCapture(){}
 querySelector(){return new Node()}querySelectorAll(){return []}getBoundingClientRect(){return {left:0,top:0,width:390,height:650,right:390,bottom:650}}
 getContext(){return new Proxy({createRadialGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:(()=>{})}})}
}
const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)},querySelector(){return new Node()},querySelectorAll(){return []},createElement(){return new Node()},createElementNS(){return new Node()},addEventListener(){},body:new Node()};
class Img extends Node{constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}}
const local=new Map(),frames=[];let now=0;
const context={document,console,Date,Math,Map,Set,Uint8Array,Float32Array,Object,Array,Number,String,Promise,Image:Img,ResizeObserver:class{observe(){}},navigator:{deviceMemory:8},window:{devicePixelRatio:1,addEventListener(){},matchMedia(){return {matches:false}}},performance:{now:()=>now},localStorage:{setItem(k,v){local.set(k,v)},getItem(k){return local.get(k)||null},removeItem(k){local.delete(k)}},setTimeout(){return 1},setInterval(){return 1},clearTimeout(){},requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){}};
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile,findSpawn,enemyLevel,enemyDropItem,enemies,ENEMY_TYPES,ensureStarterEnemy,resolveEnemyBattle,enemyRequirement,enemyResources,findMapRoute,occupiedTiles,footprintFits,canPlaceBuilding,empireAt,empireCenters,INVENTORY,showUITour,setNarratorText,advanceNarrator,setupTutorial,closePanels,updateMarches,saveGameProgress,loadGameProgress,drawTerritoryTerrain,terrainAtlas,mapDistance,enemySpaceFree,applySavedEnemyPositions,repairEnemySpacing};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;t.createWorldMap();t.APP.tutorial.active=false;
assert.equal(t.occupiedTiles(t.state.buildings.find(b=>b.id==='farm'),0,0).length,1);
for(const b of t.state.buildings)assert(t.footprintFits(b,b.q,b.r),b.id+' touches wall');
const farm=t.state.buildings.find(b=>b.id==='farm');let spaces=0;for(let q=-15;q<=15;q++)for(let r=-5;r<=5;r++)if(t.canPlaceBuilding(farm,q,r))spaces++;assert(spaces>=12,'not enough spare compact-layout choices');
assert(t.enemies.length>1000);assert(new Set(t.enemies.map(e=>e.type)).size===4);assert.equal(t.enemyLevel(400,400),25);assert(t.enemyLevel(70,70)<=5);
for(const region of ['hakhamaneshi','sasani','rome','maoria','heptalin','free']){
 const home=t.findSpawn(region,()=>.5);assert(home,'no spawn for '+region);assert.equal(t.empireAt(home.q,home.r)?.id||'free',region);assert(t.enemyLevel(home.q,home.r)<=5);
 t.APP.home=home;const own=t.APP.map.castles.find(c=>c.own);Object.assign(own,home);
 const previous=t.enemies.find(e=>e.id==='starter-level-5');if(previous)previous.id='starter-old-'+region;
 t.ensureStarterEnemy();const enemy=t.enemies.find(e=>e.id==='starter-level-5');assert(enemy);const route=t.findMapRoute(home,enemy);assert(route && (route.length-1)*6000<=300000,'starter enemy exceeds five minutes');
}
// تسریع هر خانواده در درجات ابتدایی یک دقیقه است؛ پاداش‌های یک‌ساعته از NPC ابتدایی صادر نمی‌شوند.
for(const level of [1,5,6,15,16,25])for(let type=0;type<4;type++){
 const id=t.enemyDropItem(level,type,()=>0),item=t.INVENTORY.find(i=>i.id===id);assert(item);assert.equal(item.value,(level<=5?1:level<=15?5:10)*60000);
}
// درصدها با مولد قابل کنترل: منابع همیشه هستند و تسریع الزاماً داده نمی‌شود.
const npc=t.enemies.find(e=>e.type===2),before=t.APP.resources.wood;const item=t.INVENTORY.find(i=>i.id==='speed-60'),itemCount=item.count;
const m={enemyId:npc.id,enemyLevel:1,enemyType:2,troops:20,armyPower:0,arriveAt:Date.now()};assert(t.resolveEnemyBattle(m,()=>.9));assert.equal(t.APP.resources.wood,before+t.enemyResources(1).wood);assert.equal(item.count,itemCount);assert(!t.resolveEnemyBattle(m,()=>0));
const n={enemyId:'drop-all',enemyLevel:1,enemyType:2,troops:20,armyPower:0,arriveAt:Date.now()};assert(t.resolveEnemyBattle(n,()=>0));assert.equal(item.count,itemCount+1);
const weak={enemyId:'too-hard',enemyLevel:25,enemyType:0,troops:20,armyPower:0,arriveAt:Date.now()};const food=t.APP.resources.food;assert(!t.resolveEnemyBattle(weak,()=>0));assert.equal(t.APP.resources.food,food);assert.equal(weak.result,'شکست');
const marchNow=Date.now();t.APP.marches=[{...n,id:'return-army',type:'attack',phase:'returning',route:[{q:100,r:100},{q:101,r:100}],target:{q:101,r:100},origin:{q:100,r:100},startedAt:marchNow-5000,arriveAt:marchNow-1,travelMs:1000,returnAt:0}];const troops=t.APP.army.troops;t.updateMarches();assert.equal(t.APP.army.troops,troops+20-(n.lostTroops||0));t.updateMarches();assert.equal(t.APP.army.troops,troops+20-(n.lostTroops||0));
// لمس اول متن را کامل و لمس دوم مرحله معرفی رابط را عوض می‌کند.
t.APP.tutorial={active:true,step:12,phase:'ui-tour',uiIndex:0};t.showUITour(0);t.advanceNarrator();assert.equal(t.APP.tutorial.uiIndex,0);t.advanceNarrator();assert.equal(t.APP.tutorial.uiIndex,1);
t.APP.tutorial.active=false;t.openProfile({id:'other',name:'بازیکن دیگری',q:140,r:160,own:false});const profile=nodes.get('genericPanelContent').innerHTML;assert(profile.includes('بازیکن دیگری'));assert(!profile.includes('DreaM'));
t.saveGameProgress();const cooldown=t.APP.enemyDefeated['drop-all'];t.APP.enemyDefeated={};t.loadGameProgress();assert.equal(t.APP.enemyDefeated['drop-all'],cooldown);
console.log('PASS: one-tile buildings and wall clearance, '+spaces+' valid layout spaces, four enemy types, all six safe spawn choices and reachable level5 within 5min, guaranteed resources/optional drops, reward idempotency, defeat and exactly-once returning troops, narrator two-tap advance, other-player profile and persisted cooldown. Enemies:',t.enemies.length);

// Malformed older saved coordinates must not bypass the three-cell spawn rule.
const first=t.enemies[0],second=t.enemies[1];
t.APP.savedEnemyPositions=[{id:first.id,q:first.q,r:first.r},{id:second.id,q:first.q,r:first.r}];
t.applySavedEnemyPositions();assert(t.mapDistance(first,second)>=3);
for(const enemy of t.enemies) {
 assert(t.enemySpaceFree(enemy.q,enemy.r,enemy.id),'enemy spacing violated after restore');
 for(const castle of t.APP.map.castles) assert(t.mapDistance(enemy,castle)>=3,'enemy too close to castle');
}
t.ensureStarterEnemy();for(const e of t.enemies.filter(e=>e.id.startsWith('starter-level-'))) assert(t.enemySpaceFree(e.q,e.r,e.id));
console.log('PASS: saved-coordinate migration and initial targets obey minimum three-cell spacing from castles and other NPCs.');
