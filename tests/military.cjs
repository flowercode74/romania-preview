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
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile,findSpawn,enemyLevel,enemyDropItem,enemies,ENEMY_TYPES,ensureStarterEnemy,resolveEnemyBattle,enemyRequirement,enemyResources,findMapRoute,occupiedTiles,footprintFits,canPlaceBuilding,empireAt,empireCenters,INVENTORY,showUITour,setNarratorText,advanceNarrator,setupTutorial,closePanels,updateMarches,saveGameProgress,loadGameProgress,drawTerritoryTerrain,terrainAtlas,productionMultiplier,productionRate,tickCollectors,collectResource,startArmyTask,tickArmy,speedArmy,totalArmyPower,updatePower,TROOPS,TROOP_LINES,researchLine,troopUnlocked,troopStats,woundedStock,awardTablets,availableTablets,openTraining,openHealing,openResearch,openSettings,openSkins,AVATAR_SKINS,CASTLE_SKINS,selectedAvatarSkin,selectedCastleImage,applySkinAppearance,buildingImage,setSkinConfirmation:fn=>{gameConfirm=fn},openLeaderboard,openTroopsOverview,openBattleReport,startBranchResearch,queueMarkup,marchCapacity,startSecondBuild,tickAdditionalQueues,startResearch,finishTutorial,reserveTroops,respawnEnemies,enemySpaceFree,buildingDuration,buildingPower,buildingCost,MISSION_DATA};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;t.startGame(true);t.APP.tutorial.active=false;t.createWorldMap();
(async()=>{
 assert.equal(t.TROOP_LINES.length,8);assert.equal(Object.keys(t.TROOPS).length,8);
 for(const b of t.state.buildings)assert(t.footprintFits(b,b.q,b.r),b.id);
 const byId=id=>t.state.buildings.find(b=>b.id===id);byId('barracks').level=10;byId('hospital').level=10;byId('research').level=10;byId('castle').level=10;
 for(const k of ['wood','food','stone','iron'])t.APP.resources[k]=10000000;
 document.getElementById('armyType').value='heavy';document.getElementById('armyCount').value='100';const food=t.APP.resources.food;t.startArmyTask('training');assert.equal(t.APP.army.training.type,'heavy');assert.equal(t.APP.resources.food,food-100*t.TROOPS.heavy.cost);t.APP.army.training=null;
 t.awardTablets(20);t.awardTablets(2);t.awardTablets(20);assert.equal(t.availableTablets(),20);
 t.researchLine('archer').unlocked=true;t.APP.research.tabletsSpent=1;assert.equal(t.availableTablets(),19);
 const before=t.troopStats('archer').attack;await t.startBranchResearch('archer','attack');assert.equal(t.APP.research.task,null);assert.equal(t.troopStats('archer').attack,before);
 // درمان چند رسته نوع هر مجروح را پس از ذخیره و تکمیل حفظ می‌کند.
 t.APP.army.wounded=5;t.APP.army.woundedUnits={sword:2,archer:3};t.APP.army.units={sword:10,archer:10};t.APP.army.troops=20;
 const originalQuery=document.querySelectorAll;document.querySelectorAll=selector=>selector==='[data-heal-count]'?[{dataset:{healCount:'sword'},value:'2',max:'2'},{dataset:{healCount:'archer'},value:'3',max:'3'}]:[];
 document.getElementById('armyCount').value='5';t.startArmyTask('healing');assert.equal(t.APP.army.healing.count,5);assert.equal(t.APP.army.wounded,0);assert.equal(t.APP.army.healing.units.archer,3);t.saveGameProgress();t.APP.army.healing=null;t.loadGameProgress();assert.equal(t.APP.army.healing.units.archer,3);t.APP.army.healing.endsAt=Date.now()-1;t.tickArmy();assert.equal(t.APP.army.units.archer,13);assert.equal(t.APP.army.units.sword,12);t.tickArmy();assert.equal(t.APP.army.troops,25);document.querySelectorAll=originalQuery;
 // کتیبه و پژوهش به عقب بازنمی‌گردند؛ تنظیمات و ظاهر هم ذخیره می‌شوند.
 t.APP.preferences={quality:'performance',sound:false};t.APP.skins={avatar:1,castle:2};t.saveGameProgress();t.APP.preferences={};t.APP.skins={};t.loadGameProgress();assert.equal(t.APP.preferences.quality,'performance');assert.equal(t.APP.skins.castle,2);assert.equal(t.availableTablets(),19);assert.equal(t.researchLine('archer').attack,0);
 // صف کارگر دوم سطح بالاتر بعد از بارگذاری ساختمان‌ها اعتبارسنجی می‌شود.
 t.APP.secondBuilder=true;byId('lumber').level=5;t.APP.worker2={task:{id:'lumber',target:6,startedAt:Date.now()},endsAt:Date.now()+100000};t.saveGameProgress();byId('lumber').level=0;t.APP.worker2={task:null,endsAt:0};t.loadGameProgress();assert.equal(t.APP.worker2.task.target,6);assert.equal(byId('lumber').level,5);
 // گزارش از ترکیب نبرد کپی می‌گیرد و تغییر لشکر سابق را تغییر نمی‌دهد.
 const march={id:'mixed-report',enemyId:'mixed-enemy',enemyLevel:1,enemyType:1,troops:20,combatPower:100000,unitCounts:{sword:10,archer:10},origin:{q:50,r:50},target:{q:51,r:50},arriveAt:Date.now()};t.resolveEnemyBattle(march,()=>1);const report=t.APP.battleReports.find(r=>r.id===march.id);assert(report);march.unitCounts.sword=0;assert.equal(report.units.sword,10);assert(report.defender.name);t.openBattleReport(report.id);assert(nodes.get('genericPanelContent').innerHTML.includes('battle-table'));
 for(const [fn,word] of [[t.openTraining,'data-start-army'],[t.openHealing,'heal'],[t.openSettings,'data-setting'],[t.openTroopsOverview,'unit-grid'],[t.openLeaderboard,'data-rank'],[t.openSkins,'data-skin-kind']]){fn();assert(nodes.get('genericPanelContent').innerHTML.includes(word),word);}
 // Exercise actual cosmetic menu handlers and persistence for all four options.
 const savedQuery=document.querySelector,portrait=new Node();
 document.querySelector=selector=>selector==='.portrait-image'?portrait:savedQuery(selector);
 t.setSkinConfirmation(async()=>true);
 const skinResources=JSON.stringify(t.APP.resources);
 for(let index=0;index<4;index++){
  for(const kind of ['avatar','castle']){
   t.openSkins(kind,index);
   const panel=nodes.get('genericPanelContent');
   assert.equal((panel.innerHTML.match(/data-preview-skin=/g)||[]).length,4);
   await panel.onclick({target:{closest:()=>({dataset:{applySkin:''}})}});
   assert.equal(t.APP.skins[kind],index);
  }
  assert.equal(portrait.src,t.AVATAR_SKINS[index].portrait);
  assert.equal(t.selectedAvatarSkin().avatar,t.AVATAR_SKINS[index].avatar);
  assert.equal(t.selectedCastleImage(),t.CASTLE_SKINS[index].image);
  assert.equal(t.buildingImage(byId('castle')),t.state.images.get(t.CASTLE_SKINS[index].image));
  t.saveGameProgress();t.APP.skins={};t.loadGameProgress();
  assert.equal(t.APP.skins.avatar,index);assert.equal(t.APP.skins.castle,index);
  t.openProfile();assert(nodes.get('genericPanelContent').innerHTML.includes(t.AVATAR_SKINS[index].avatar));
 }
 assert.equal(JSON.stringify(t.APP.resources),skinResources,'cosmetic selection changed resources');
 document.querySelector=savedQuery;
 console.log('PASS: all four skin menu selections, matching HUD portraits/profile avatars, distinct castle assets and save/reload persistence.');
 // Finishing training with a speed item must preserve the tutorial's next panel.
 for(const b of t.state.buildings)b.level=b.id==='castle'?2:1;
 t.APP.wallLevel=1;t.APP.army.units={sword:0,archer:0,knight:0};
 t.APP.army.troops=0;t.APP.army.wounded=0;t.APP.army.woundedUnits={};
 t.APP.army.totalTrained=0;t.APP.army.totalHealed=0;t.APP.army.practiceWounded=false;
 t.APP.army.healing=null;t.APP.tutorial.active=true;t.APP.tutorial.step=12;
 t.APP.tutorial.phase='army-training';t.APP.tutorial.uiComplete=false;
 t.APP.army.training={count:100,type:'sword',units:{sword:100},duration:1800000,endsAt:Date.now()+1800000};
 t.openTraining();
 const speedItem=t.INVENTORY.find(i=>i.family==='troop'&&i.value>=1800000);speedItem.count=1;
 const finish=t.speedArmy('training',speedItem.id);
 await finish;
 assert.equal(t.APP.tutorial.phase,'army-healing');
 assert(Object.values(t.APP.army.units).every(Number.isFinite),'reserving sparse units must never create NaN');
 assert(Number.isFinite(t.totalArmyPower()),'power remains finite after reserving practice wounded');
 assert(t.APP.resources.power>0,'training must not zero castle power');
 assert.equal(t.APP.army.troops,90);assert.equal(t.APP.army.wounded,10);
 assert.equal(t.APP.openPage,null,'player must open healing from highlighted building');
 t.APP.army.wounded=0;t.APP.army.woundedUnits={};
 t.APP.army.healing={count:10,type:'sword',units:{sword:10},duration:60000,endsAt:Date.now()+60000};
 t.openHealing();
 const healSpeed=t.INVENTORY.find(i=>i.family==='heal');healSpeed.count=1;
 const healed=t.speedArmy('healing',healSpeed.id);
 await healed;
 assert.equal(t.APP.tutorial.phase,'ui-tour');assert.equal(t.APP.army.troops,100);
 assert(!nodes.get('panelLayer').classList.contains('is-open'),'UI tour must not be covered by the completed healing panel');
 // Guided queue/perk controls must receive their native clicks; panel targets
 // still use the tour shortcut and unrelated controls stay locked.
 const captureClick=target=>{
   let prevented=false,stopped=false;
   const event={target:{closest:selector=>selector===target?new Node():null},
     preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}};
   const handlers=documentEvents.filter(e=>e.type==='click'&&e.capture===true);
   assert(handlers.length>0);for(const handler of handlers)handler.run(event);
   return {prevented,stopped};
 };
 t.APP.tutorial.uiIndex=9;assert.deepEqual(captureClick('#marchToggle'),{prevented:false,stopped:false});
 t.APP.tutorial.uiIndex=11;assert.deepEqual(captureClick('#territoryPerk'),{prevented:false,stopped:false});
 t.APP.tutorial.uiIndex=3;assert.deepEqual(captureClick('#profileButton'),{prevented:true,stopped:true});
 assert.equal(t.APP.openPage,'profile');
 assert.deepEqual(captureClick('#storeButton'),{prevented:true,stopped:true});
 console.log('PASS: 8 distinct troop units, research locks/stat effects/save/completion, 20-tablet cap, mixed healing preservation/idempotency, second-worker migration, settings/skins persistence, immutable detailed reports dedicated pages, finite sparse-unit power and uninterrupted speed-item tutorial transitions.');
})().catch(error=>{console.error(error);process.exitCode=1;});
