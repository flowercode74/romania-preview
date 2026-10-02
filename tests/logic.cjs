// آزمون‌های منطق نقشه، مالکیت، جانمایی، منابع و کمپ با وضعیت شبیه‌سازی‌شده
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const nodes=new Map();
function node(){return {clientWidth:400,clientHeight:700,hidden:false,textContent:'',innerHTML:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},getContext(){return new Proxy({}, {get:(o,k)=>k in o?o[k]:()=>{}})},setAttribute(){},appendChild(){},querySelector(){return node()},querySelectorAll(){return []},getBoundingClientRect(){return {left:0,top:0,right:50,bottom:20,width:400,height:700}},remove(){},addEventListener(){}};}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector(){return node()},querySelectorAll(){return []},addEventListener(){},body:node(),createElement(){return node()}};
const storage=new Map();
const context={Image:class{constructor(){this.naturalWidth=0;this.complete=false;}},document,console,Date,Math,Map,Set,Object,Array,Number,String,Promise,performance:{now:()=>0},window:{devicePixelRatio:1,addEventListener(){}},navigator:{},localStorage:{setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}},setTimeout(){},requestAnimationFrame(){return 0},cancelAnimationFrame(){}};
vm.createContext(context);
let src=fs.readFileSync('assets/js/game.js','utf8');src=src.slice(0,src.indexOf('  createCells();\n  loadAssets();'))+`globalThis.test={state,APP,CONFIG,INVENTORY,MISSION_DATA,TUTORIAL_ORDER,createCells,canPlaceBuilding,buildingsOverlap,footprintFits,buildingById,missionReady,missionProgress,updateMissionStatus,terrainAt,computeTerrain,findMapRoute,mapNeighbors,createWorldMap,validTeleportTarget,saveGameProgress,loadGameProgress,renderMissions,renderMarchQueue,claimMission,updateMarches,WORLD,EMPIRES,empireCenters,empireAt,insideEventArea,applyMissionReward,marchPosition,drawWorld,setupWorldOverlays,initialCamera,loadAssets,timerProgress};})();`;
vm.runInContext(src,context);const t=context.test;t.createCells();
assert.equal(t.APP.wallLevel,0);assert.equal(t.TUTORIAL_ORDER.at(-1),'wall');assert.equal(t.missionProgress(t.MISSION_DATA.tutorial.find(m=>m.buildingId==='wall')),0);
for(let i=0;i<t.state.buildings.length;i++){
 const a=t.state.buildings[i]; assert(t.footprintFits(a,a.q,a.r),a.id+' outside court');
 for(const b of t.state.buildings.slice(i+1)) assert(!t.buildingsOverlap(a,a.q,a.r,b,b.q,b.r),a.id+' overlaps '+b.id);
}
const farm=t.state.buildings.find(b=>b.id==='farm'),castle=t.state.buildings.find(b=>b.id==='castle');
assert(!t.canPlaceBuilding(farm,castle.q,castle.r));assert(!t.canPlaceBuilding(farm,20,20));
t.APP.tutorial.active=false;t.APP.missions.claimedTutorial=t.MISSION_DATA.tutorial.map(m=>m.id);farm.level=3;
const future=t.MISSION_DATA.growth.find(m=>m.buildingId==='farm'&&m.target===3);assert(!t.missionReady('growth',future));t.updateMissionStatus();assert(!nodes.get('missionStatusText').textContent.includes('دریافت'));
castle.level=3;assert(t.missionReady('growth',t.MISSION_DATA.growth[0]));
t.createWorldMap();
for(const [dx,dy] of [[18,0],[-18,0],[0,18],[0,-18],[13,13],[-13,13],[13,-13],[-13,-13]])assert(!t.terrainAt(400+dx,400+dy).blocked,'blocked central gate');
assert(t.terrainAt(417,407).blocked,'ring gap');
let count=0,blocked=0,forest=0;
for(let q=240;q<600;q+=3)for(let r=280;r<600;r+=3){const a=t.terrainAt(q,r);count++;if(a.blocked)blocked++;if(a.kind==='forest'){forest++;assert(a.blocked)}}
assert(blocked/count<.50);assert(forest>0);
const route=t.findMapRoute({q:394,r:400},{q:430,r:405});assert(route&&route.length);assert(route.every(p=>!t.terrainAt(p.q,p.r).blocked));
assert(!t.validTeleportTarget({q:400,r:400}));assert(!t.validTeleportTarget({q:0,r:100}));
t.renderMarchQueue(true);assert(nodes.get('marchQueue').innerHTML.includes('march-empty-slot'));
t.renderMissions('daily');assert(nodes.get('genericPanelContent').innerHTML.includes('daily-quests.webp'));assert(!nodes.get('genericPanelContent').innerHTML.includes('data-claim-all'));
assert(t.claimMission("growth", t.MISSION_DATA.growth[0].id));
const goldBefore=t.APP.resources.gold; assert(!t.claimMission("growth", t.MISSION_DATA.growth[0].id)); assert.equal(t.APP.resources.gold,goldBefore);
t.APP.marches=[{id:"camp-test",type:"camp",name:"camp",phase:"outbound",origin:{q:394,r:400},target:{q:395,r:400},route:[{q:394,r:400},{q:395,r:400}],startedAt:Date.now()-16000,arriveAt:Date.now()-1,travelMs:15000,returnAt:0}];
t.updateMarches();assert.equal(t.APP.marches[0].phase,"waiting");assert(t.APP.marches[0].returnAt-Date.now()>7199000);
t.APP.marches[0].returnAt=Date.now()-1;t.updateMarches();assert.equal(t.APP.marches[0].phase,"returning");
t.APP.marches[0].arriveAt=Date.now()-1;t.updateMarches();assert.equal(t.APP.marches.length,0);
t.APP.home={q:120,r:120};t.saveGameProgress();t.APP.home={q:394,r:400};t.loadGameProgress();assert.equal(t.APP.home.q,120);
console.log('PASS: tutorial wall, footprint/bounds, quest ordering, badges/status, empty queue, mission banners, eight gates, terrain and obstacle routing, relocation validation and save. Blocked ratio:',(blocked/count).toFixed(3));

const counts=t.empireCenters.map(e=>e.count);assert(Math.max(...counts)-Math.min(...counts)<=1);assert.equal(t.empireAt(400,400),null);
for(const p of [{q:400,r:418},{q:418,r:400},{q:413,r:413}])assert(!t.validTeleportTarget(p),'gate teleport allowed');
const balance={};for(let q=1;q<=800;q+=4)for(let r=1;r<=800;r+=4){const a=t.terrainAt(q,r);const k=a.kind==='forest'||a.kind==='grass'?'forest':a.kind==='highland'||a.kind==='mountain'?'mountain':a.kind==='rock'?'desert':a.kind;balance[k]=(balance[k]||0)+1;}
console.log('Biome sample',balance,'Empire counts',counts);
t.APP.resources.wood=1000000000;assert(t.applyMissionReward({resources:{wood:45000}}));assert.equal(t.APP.resources.wood,1000045000);
const now=Date.now(); const camp={id:'base',type:'camp',phase:'waiting',target:{q:390,r:400},origin:{q:366,r:400},route:[{q:366,r:400},{q:367,r:400}],startedAt:now-30000,arriveAt:now-15000,returnAt:now+1000,travelMs:15000,members:1};
const reinforcement={...camp,id:'new',campId:'base',type:'reinforce',phase:'outbound',arriveAt:now-100,returnAt:0};t.APP.marches=[reinforcement,camp];t.updateMarches();assert.equal(t.APP.marches.length,1);assert.equal(t.APP.marches[0].members,2);assert(t.APP.marches[0].returnAt>Date.now()+7199000);
const moving={...camp,phase:'outbound',startedAt:Date.now()-7500,arriveAt:Date.now()+7500};const mp=t.marchPosition(moving);assert(mp.x>0 && mp.y>0);assert(!('q' in mp));
assert(t.timerProgress(now,now+10000).includes('queue-progress'));
console.log('PASS: exact empire areas, neutral zone and gateways, unlimited mission resources, reinforcement merging/timer reset, current moving position and progress bars.');
