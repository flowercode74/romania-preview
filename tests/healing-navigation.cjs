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
const windowEvents=new Map();
context.window.addEventListener=(type,fn)=>{const list=windowEvents.get(type)||[];list.push(fn);windowEvents.set(type,list);};
const historyEntries=[{external:true},{}];let historyIndex=1;
context.window.history={get state(){return historyEntries[historyIndex]},replaceState(value){historyEntries[historyIndex]=value},pushState(value){historyEntries.splice(historyIndex+1);historyEntries.push(value);historyIndex++},back(){historyIndex--;for(const fn of windowEvents.get('popstate')||[])fn({state:historyEntries[historyIndex]});}};
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile,findSpawn,enemyLevel,enemyDropItem,enemies,ENEMY_TYPES,ensureStarterEnemy,resolveEnemyBattle,enemyRequirement,enemyResources,findMapRoute,occupiedTiles,footprintFits,canPlaceBuilding,empireAt,empireCenters,INVENTORY,showUITour,setNarratorText,advanceNarrator,setupTutorial,closePanels,updateMarches,saveGameProgress,loadGameProgress,drawTerritoryTerrain,terrainAtlas,productionMultiplier,productionRate,tickCollectors,collectResource,startArmyTask,tickArmy,speedArmy,totalArmyPower,updatePower,TROOPS,TROOP_LINES,researchLine,troopUnlocked,troopStats,woundedStock,awardTablets,availableTablets,openTraining,openHealing,openResearch,openSettings,openSkins,AVATAR_SKINS,CASTLE_SKINS,selectedAvatarSkin,selectedCastleImage,applySkinAppearance,buildingImage,setSkinConfirmation:fn=>{gameConfirm=fn},openLeaderboard,openTroopsOverview,openBattleReport,startBranchResearch,queueMarkup,marchCapacity,startSecondBuild,tickAdditionalQueues,startResearch,finishTutorial,reserveTroops,respawnEnemies,enemySpaceFree,buildingDuration,buildingPower,buildingCost,MISSION_DATA,gameNavigation,navigateGameBack,setupGameNavigation,showGameDialog,gameConfirm,closeGameDialog,openInventoryUse,setWorldMode,healingTotal,healingCountLimit,normalizeHealingCounts,selectAllWounded,cancelHealingQueue,renderHealingPage};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;t.startGame(true);t.APP.tutorial.active=false;t.createWorldMap();

(async()=>{
 document.getElementById('gameDialog').hidden=true;
 assert.equal(context.window.history.state.romaniaBackGuard,true);
 assert.equal((windowEvents.get('popstate')||[]).length,1);
 const back=()=>context.window.history.back();
 // Fresh facility entry clears stale overlays and scroll; same-page renders retain scroll.
 const pageContent=document.getElementById("genericPanelContent");
 t.openTraining();pageContent.scrollTop=120;pageContent.onclick({target:{closest:()=>({dataset:{trainingPanel:"stats"}})}});
 assert(pageContent.innerHTML.includes("role=\"dialog\""));assert.equal(pageContent.scrollTop,120);
 t.closePanels();t.openTraining();assert(!pageContent.innerHTML.includes("role=\"dialog\""));assert.equal(pageContent.scrollTop,0);
 t.openHealing();pageContent.onclick({target:{closest:()=>({dataset:{healingPanel:"stats"}})}});
 assert(pageContent.innerHTML.includes("role=\"dialog\""));t.closePanels();t.openHealing();assert(!pageContent.innerHTML.includes("role=\"dialog\""));t.closePanels();
 t.gameNavigation.frames=[];
 t.openProfile();t.openSettings();assert.equal(t.APP.openPage,'settings');
 back();assert.equal(t.APP.openPage,'profile');assert(document.getElementById('genericPanelContent').innerHTML.includes('profile-full-hero'));
 back();assert.equal(t.APP.openPage,null);assert(!document.getElementById('panelLayer').classList.contains('is-open'));
 // The world switch and detail pages retain their previous map view.
 t.setWorldMode(true,false);t.openProfile();back();assert.equal(t.APP.currentMode,'map');back();assert.equal(t.APP.currentMode,'territory');
 // Back cancels an outstanding confirmation instead of consuming its underlying page.
 t.openSettings();const confirm=t.gameConfirm('test');back();assert.equal(await confirm,false);assert.equal(t.APP.openPage,'settings');back();
 // An inventory item subpanel returns to the item list and then the settlement.
 const item=t.INVENTORY.find(i=>i.resource);item.count=3;t.openInventory('all');t.openInventoryUse(item.id);
 assert(document.getElementById('inventoryUsePanel').classList.contains('is-active'));
 back();assert.equal(t.APP.openPage,'items');assert(document.getElementById('genericPanel').classList.contains('is-active'));back();
 // Repeated root back never crosses the preceding external history entry.
 for(let i=0;i<100;i++)back();assert.equal(historyIndex,2);assert.equal(historyEntries.length,3);assert.equal(historyEntries[0].external,true);
 const countBefore=(windowEvents.get('popstate')||[]).length;t.setupGameNavigation();assert.equal((windowEvents.get('popstate')||[]).length,countBefore);assert.equal(historyEntries.length,3);
 // A range selection across several wounded kinds preserves their actual types.
 t.APP.army.wounded=80;t.APP.army.woundedUnits={sword:50,archer:30};t.APP.army.healing=null;t.APP.resources.food=100000;
 const hospital=t.state.buildings.find(b=>b.id==='hospital');hospital.level=2;
 t.openHealing();const content=document.getElementById('genericPanelContent');
 assert(content.innerHTML.includes('healing-screen'));assert(content.innerHTML.includes('type="range"'));assert(!content.innerHTML.includes('type="number"'));
 assert(document.getElementById('genericPanel').className.includes('healing-page'));
 let html='',healInputs=[];const previousQuery=document.querySelectorAll;
 function hydrate(){
  if(html!==content.innerHTML){html=content.innerHTML;healInputs=[...html.matchAll(/data-heal-count="([^"]+)"[^>]*max="(\d+)" value="(\d+)"/g)].map(m=>({dataset:{healCount:m[1]},max:m[2],value:m[3]}));
   const count=html.match(/id="armyCount" type="hidden" value="(\d+)"/);if(count)document.getElementById('armyCount').value=count[1];}
  return healInputs;
 }
 document.querySelectorAll=selector=>selector==='[data-heal-count]'?hydrate():previousQuery(selector);
 const click=async dataset=>{await content.onclick({target:{closest:()=>({dataset})}});hydrate();};
 hydrate();content.oninput({target:{id:'healingCountRange',value:'20'}});assert.equal(t.healingTotal(),20);
 await click({healingUnit:'archer'});content.oninput({target:{id:'healingCountRange',value:'10'}});assert.equal(t.healingTotal(),30);
 await click({healingUnit:'sword'});assert(content.innerHTML.includes('>20 از 50</output>'));
 // Stats and speed pickers consume Back before the healing page itself.
 await click({healingPanel:'stats'});back();assert.equal(t.APP.openPage,'healing');assert(!content.innerHTML.includes('role="dialog"'));
 await click({startArmy:'healing'});assert.equal(t.APP.army.healing.count,30);assert.equal(t.APP.army.healing.units.sword,20);assert.equal(t.APP.army.healing.units.archer,10);assert.equal(t.APP.army.wounded,50);
 t.setSkinConfirmation(async()=>true);const food=t.APP.resources.food;
 assert(await t.cancelHealingQueue());assert.equal(t.APP.army.wounded,80);assert.equal(t.APP.army.woundedUnits.sword,50);assert.equal(t.APP.army.woundedUnits.archer,30);assert.equal(t.APP.resources.food,food+252);
 t.APP.resources.food=120;t.selectAllWounded();assert.equal(t.healingTotal(),10);t.APP.resources.food=24;t.normalizeHealingCounts();assert.equal(t.healingTotal(),2);
 t.APP.resources.food=100000;t.selectAllWounded();t.openHealing();hydrate();await click({startArmy:'healing'});
 const speed=t.INVENTORY.find(i=>i.family==='heal'&&i.value>=480000);speed.count=1;t.APP.tutorial.active=false;
 await t.speedArmy('healing',speed.id);assert.equal(t.APP.army.healing,null);assert.equal(t.APP.army.wounded,0);assert.equal(speed.count,0);
 const wounded=t.APP.army.wounded;t.tickArmy();assert.equal(t.APP.army.wounded,wounded);
 t.openHealing();assert(content.innerHTML.includes('مجروحی برای درمان ندارید.'));assert(content.innerHTML.includes('data-start-army="healing" disabled'));
 // A completed task cannot be resurrected by a late cancellation answer.
 t.APP.army.healing={type:'sword',count:5,cost:60,units:{sword:5},duration:60000,endsAt:Date.now()+60000};
 let resolveCancel;t.setSkinConfirmation(()=>new Promise(r=>resolveCancel=r));const pending=t.cancelHealingQueue();
 const foodBefore=t.APP.resources.food;t.APP.army.healing.endsAt=Date.now()-1;t.tickArmy();resolveCancel(true);assert.equal(await pending,false);assert.equal(t.APP.resources.food,foodBefore);assert.equal(t.APP.army.wounded,0);
 document.querySelectorAll=previousQuery;
 console.log('PASS: native-history Back returns nested pages/map/item picker, cancels confirmations, dismisses stats, never leaves the root or grows history; full-screen multi-kind healing sliders, preserved selections, food limits, targeted speed, 70% cancellation and exact restoration.');
})().catch(e=>{console.error(e);process.exitCode=1});
