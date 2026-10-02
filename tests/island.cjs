// آزمون‌های یکپارچه اصلاحات جزیره، درگ، آموزش و تسریع حرکت
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
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile,occupiedTiles,proposeMoveBuilding,moveBuilding,stopMovingBuilding,beginMovingBuilding,onPointerDown,onPointerMove,onPointerUp,productionMultiplier,activePerk,empireAt,empireCenters,terrainAt,mapBuildingFits,castleFootprint,clampMapCamera,mapMinZoom,openMapCastle,openMarchActions,openMarchSpeed,marchPosition,marchProgress,recallMarch,saveGameProgress,loadGameProgress,showUITour,finishTutorial,UI_TOUR,showBuildNotice,INVENTORY};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;t.startGame(true);t.APP.tutorial.active=false;t.createWorldMap();
const counts=t.empireCenters.map(e=>e.count);assert(counts.every(x=>x===counts[0]));assert.equal(t.empireAt(400,450),null);
const resourceByEmpire={sasani:'food',rome:'stone',maoria:'wood',heptalin:'iron'};
for(let i=0;i<t.empireCenters.length;i++){
 t.APP.home={q:t.empireCenters[i].q,r:t.empireCenters[i].r};const e=t.activePerk().empire;assert(e);
 for(const resource of ['wood','food','stone','iron'])assert.equal(t.productionMultiplier(resource),e.id==='hakhamaneshi'?1.025:resourceByEmpire[e.id]===resource?1.05:1);
}
t.APP.home={q:366,r:400};assert.equal(t.activePerk().empire,null);assert.equal(t.productionMultiplier('wood'),1);
let valid=0;for(let q=40;q<760;q+=17)for(let r=40;r<760;r+=17){if(t.validTeleportTarget({q,r})){
 valid++;assert(t.castleFootprint(q,r).every(p=>!t.terrainAt(p.q,p.r).blocked&&!t.insideEventArea(p.q,p.r)));assert(t.mapBuildingFits(q,r));
}}assert(valid>500);for(const q of [1,12,24,800])assert(!t.validTeleportTarget({q,r:120}));
for(const p of [{q:423,r:400},{q:424,r:400},{q:400,r:424}])assert(!t.validTeleportTarget(p));
// نمای دور هیچ انتخاب کاشی تازه‌ای ایجاد نمی‌کند؛ مختصات دوربین در محدوده قابل نمایش می‌ماند.
t.APP.map.camera.zoom=.12;t.APP.map.camera.x=0;t.APP.map.camera.y=0;t.clampMapCamera();const z=t.APP.map.camera.zoom;assert(t.APP.map.camera.x>=390/(2*z));assert(t.APP.map.camera.y>=650/(2*z));
t.openMapTile({q:395,r:400});assert.equal(t.APP.map.selection,null);t.APP.map.camera.zoom=1.75;t.openMapTile({q:395,r:400});assert.equal(t.APP.map.selection.kind,'tile');
t.openMapCastle(t.APP.map.castles[1]);assert.equal(t.APP.map.selection.kind,'castle');
// پیش‌نمایش نامعتبر داده ساختمان را تغییر نمی‌دهد و تأیید روی آن پذیرفته نمی‌شود.
const farm=t.state.buildings.find(b=>b.id==='farm'),castle=t.state.buildings.find(b=>b.id==='castle');const initial={q:farm.q,r:farm.r};t.state.moveBuildingId=farm.id;
assert(t.occupiedTiles(farm,farm.q,farm.r).length===1);assert(!t.proposeMoveBuilding(farm.id,castle.q,castle.r));assert.equal(t.state.pendingMove.valid,false);assert(!t.moveBuilding(farm.id,castle.q,castle.r));assert.deepEqual({q:farm.q,r:farm.r},initial);t.stopMovingBuilding();assert.equal(t.state.pendingMove,null);
// آموزش ساختمان‌ها با آشنایی رابط ادامه پیدا می‌کند و ردکردن آموزش پایان واقعی می‌دهد.
t.APP.tutorial={active:true,step:12,phase:'focus'};t.APP.tutorialSkipped=false;t.APP.army.totalTrained=100;t.APP.army.totalHealed=10;t.finishTutorial();assert(t.APP.tutorial.active);assert.equal(t.APP.tutorial.phase,'ui-tour');for(let i=1;i<t.UI_TOUR.length;i++)t.showUITour(i);t.state.buildings.find(b=>b.id==="camp").level=2;t.showUITour(t.UI_TOUR.length);assert(!t.APP.tutorial.active);assert(t.APP.tutorial.uiComplete);
let fullscreens=0;document.documentElement={requestFullscreen(){fullscreens++;return Promise.resolve()}};assert(!fs.readFileSync('src/js/11-entry-lifecycle.js','utf8').includes('requestFullscreen'),'fullscreen API must not be called');assert.equal(fullscreens,0);
(async()=>{
 t.INVENTORY.find(i=>i.id==='march-speed-50').count=2;
 const now=Date.now(),m={id:'moving-test',type:'attack',name:'تست',origin:{q:366,r:400},target:{q:370,r:400},route:Array.from({length:5},(_,i)=>({q:366+i,r:400})),phase:'outbound',startedAt:now-9000,arriveAt:now+15000,travelMs:24000,returnAt:0};t.APP.marches=[m];t.APP.currentMode='map';
 const before=t.marchPosition(m);t.openMarchSpeed(m.id);const content=nodes.get('gameDialogContent');const promise=content.onclick({target:{closest:()=>({dataset:{marchSpeedItem:'march-speed-50'}})}});nodes.get('gameDialogActions').children[1].listeners.click[0]();await promise;
 const after=t.marchPosition(m);assert(Math.abs(before.x-after.x)<1);assert(m.arriveAt-Date.now()<7600);assert.equal(t.INVENTORY.find(i=>i.id==='march-speed-50').count,1);
 const position=t.marchPosition(m);const recall=t.recallMarch(m.id);nodes.get('gameDialogActions').children[1].listeners.click[0]();await recall;assert.equal(m.phase,'returning');const returned=t.marchPosition(m);assert(Math.abs(returned.x-position.x)<1,'recall jumped to destination');
 t.saveGameProgress();t.APP.marches=[];t.loadGameProgress();assert.equal(t.APP.marches.length,1);assert(Number.isFinite(t.APP.marches[0].route.at(-1).wx),'partial route lost after saving');
 console.log('PASS: equal separated empires, coordinate perks, connected relocation footprints/event edge bans, zoom input guard, inline castle menus, invalid drag cancellation, expanded tutorial/skip, no fullscreen requests, percentage speed continuity, mid-route recall and partial-route persistence. Valid sampled destinations:',valid);
})().catch(error=>{console.error(error);process.exitCode=1});
