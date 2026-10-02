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
const local=new Map(),frames=[],timers=new Map();let now=0,timerId=0;
const context={document,console,Date,Math,Map,Set,Uint8Array,Float32Array,Object,Array,Number,String,Promise,Image:Img,ResizeObserver:class{observe(){}},navigator:{deviceMemory:8},window:{devicePixelRatio:1,addEventListener(){},matchMedia(){return {matches:false}}},performance:{now:()=>now},localStorage:{setItem(k,v){local.set(k,v)},getItem(k){return local.get(k)||null},removeItem(k){local.delete(k)}},setTimeout(fn){timers.set(++timerId,fn);return timerId},setInterval(){return 1},clearTimeout(id){timers.delete(id)},requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){}};
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,saveGameProgress,loadGameProgress,hasSavedProgress,setupEntry,CONFIG,TERRITORY,BUILDING_ART,startMovingAnimation,stopMovingBuilding,buildingLift,occupiedTiles,footprintFits,buildingsOverlap,canPlaceBuilding,buildingCenter,buildingSpriteBox,territoryZoomLimits,cameraBounds,clampCamera,onPointerDown,onPointerMove,onPointerUp,hitBuilding,screenToWorld,loadImage,safeAssetPath,INVENTORY,progressAnchor,positionWorldOverlays,positionSecondProgress,nearestCell,showBuildingLabels,drawTerritoryLabels,missionDestination,moveBuilding};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);


const t=context.t;const stage=nodes.get('stage');
t.APP.tutorial.active=false;
// Four connected cells are a footprint, rather than a radius-two seven-cell disk.
for(const b of t.state.buildings){
 const tiles=t.occupiedTiles(b,b.q,b.r);assert.equal(tiles.length,b.footprint);
 assert(t.footprintFits(b,b.q,b.r),b.id+' initial footprint crosses the wall');
 assert.equal(new Set(tiles.map(c=>`${c.q},${c.r}`)).size,tiles.length);
 for(const other of t.state.buildings)if(other.id!==b.id)assert(!t.buildingsOverlap(b,b.q,b.r,other,other.q,other.r));
 const art=t.BUILDING_ART[b.id];const image={naturalWidth:art.size[0],naturalHeight:art.size[1]};
 b.level=1;const box=t.buildingSpriteBox(b,b.q,b.r,image);
 assert(Math.abs(box.width/box.height-(art.box[2]-art.box[0])/(art.box[3]-art.box[1]))<1e-10,'distorted art');
 const centers=t.occupiedTiles(b,b.q,b.r).map(c=>c.x);
 assert(Math.abs(box.width-(Math.max(...centers)-Math.min(...centers)+Math.sqrt(3)*t.CONFIG.hexSize)*.98)<1e-8,'sprite does not cover ground span');
}
const small=t.state.buildings.find(b=>b.id==='farm'),large=t.state.buildings.find(b=>b.id==='research');
assert(!t.canPlaceBuilding(small,large.q+1,large.r+1),'occupied fourth cell accepted');
assert(!t.footprintFits(large,large.q,5),'front gate/wall accepted');
// Viewport edges stay within the wall plus a narrow exterior border after any pan/zoom.
for(const [w,h] of [[320,480],[390,650],[540,820],[844,390],[1366,720],[2560,1440]]){
 stage.clientWidth=w;stage.clientHeight=h;const bounds=t.cameraBounds(),limits=t.territoryZoomLimits();
 assert(limits.min>0&&limits.max>limits.min);
 for(const zoom of [0.01,limits.min,limits.min*1.5,1e6])for(const direction of [-1,1]){
  t.state.camera={x:direction*1e6,y:-direction*1e6,zoom};t.clampCamera();const camera=t.state.camera;
  assert(camera.zoom>=limits.min-1e-8&&camera.zoom<=limits.max+1e-8);
  assert(camera.x-w/2/camera.zoom>=bounds.minX-1e-8);
  assert(camera.x+w/2/camera.zoom<=bounds.maxX+1e-8);
  assert(camera.y-h/2/camera.zoom>=bounds.minY-1e-8);
  assert(camera.y+h/2/camera.zoom<=bounds.maxY+1e-8);
 }
}
// Existing old positions reflow without changing levels, resources, queues or inventory.
stage.clientWidth=390;stage.clientHeight=650;t.state.camera={x:0,y:0,zoom:t.territoryZoomLimits().min};
small.level=7;t.APP.resources.wood=987654;t.saveGameProgress();
const save=JSON.parse(local.get('romaniaTerritoryV4'));
for(const b of save.buildings){b.q=100;b.r=100;}
local.set('romaniaTerritoryV4',JSON.stringify(save));t.loadGameProgress();
assert.equal(small.level,7);assert.equal(t.APP.resources.wood,987654);
for(const b of t.state.buildings)assert(t.footprintFits(b,b.q,b.r));
// Dragging a four-cell building without moving the pointer must preserve its anchor.
const [x,y]=t.buildingCenter(large);const z=t.state.camera.zoom;
// This stub supplies a fixed 390x650 bounding rect, matching the viewport here.
const clientX=195+x*z,clientY=325+y*z;
t.state.moveBuildingId=large.id;t.state.pendingMove=null;
const event={pointerId:71,pointerType:'touch',button:0,clientX,clientY,preventDefault(){}};
assert.equal(t.hitBuilding(clientX,clientY)?.id,large.id);
t.onPointerDown(event);assert.equal(t.state.gesture.type,'building');t.onPointerMove(event);
assert.equal(t.state.pendingMove.q,large.q);assert.equal(t.state.pendingMove.r,large.r);
t.onPointerUp({...event,type:'pointercancel'});
console.log('PASS: one/three/four/seven-cell placement, wall/gate collisions, aspect-preserving sprites, compact viewport limits across six screens, legacy layout migration and drag anchor continuity.');

// Visible single-cell artwork is centered, independently of transparent image padding.
for(const b of t.state.buildings.filter(b=>b.footprint===1)){
 const art=t.BUILDING_ART[b.id];const box=t.buildingSpriteBox(b,b.q,b.r,{naturalWidth:art.size[0],naturalHeight:art.size[1]});
 const [cx,cy]=t.buildingCenter(b);assert(Math.abs(box.x+box.width/2-cx)<1e-8);assert(box.y < cy && box.y+box.height > cy);
}
const castle=t.state.buildings.find(b=>b.id==='castle');
assert.deepEqual(Array.from(t.buildingCenter(castle)),[0,0]);
for(const b of t.state.buildings.filter(b=>b.footprint>1&&b!==castle))assert(castle.width>b.width);
for(const id of ['barracks','hospital','camp','stone','iron'])assert(t.buildingCenter(t.state.buildings.find(b=>b.id===id))[0]<0);
for(const id of ['embassy','research','hideout','farm','lumber'])assert(t.buildingCenter(t.state.buildings.find(b=>b.id===id))[0]>0);
for(const id of ['farm','lumber','stone','iron'])assert(t.buildingCenter(t.state.buildings.find(b=>b.id===id))[1]>0);
// Stationary placement must continue scheduling frames and stop after placement ends.
t.APP.currentMode='territory';t.state.moveBuildingId=small.id;t.state.moveAnimationRaf=0;
t.startMovingAnimation();const firstCount=frames.length;assert(firstCount>0);
frames[firstCount-1]();assert(frames.length>firstCount);assert(t.buildingLift(small)>=7&&t.buildingLift(small)<=11);
t.stopMovingBuilding();const stopped=frames.length;frames[stopped-1]();assert.equal(frames.length,stopped);assert.equal(t.buildingLift(small),0);
console.log('PASS: centered single-cell art, directional layout, castle prominence and stationary floating animation lifecycle.');

// Every grid center round-trips, including staggered rows, with no drag jump.
for(const cell of t.state.cells){const hit=t.nearestCell(cell.x,cell.y);assert.equal(hit.q,cell.q);assert.equal(hit.r,cell.r);}
const barracks=t.state.buildings.find(b=>b.id==='barracks');assert.equal(t.occupiedTiles(barracks,barracks.q,barracks.r).length,3);
assert.equal(t.occupiedTiles(castle,castle.q,castle.r).length,7);
const resourceRows=['farm','lumber','stone','iron'].map(id=>t.buildingCenter(t.state.buildings.find(b=>b.id===id))[1]);
assert(resourceRows.every(y=>y===resourceRows[0]),'resource buildings must share one horizontal row');
const occupiedCount=t.state.buildings.reduce((n,b)=>n+t.occupiedTiles(b,b.q,b.r).length,0);
const buildableCount=t.state.cells.filter(c=>c.buildable).length;
assert(buildableCount-occupiedCount>=50,'not enough free courtyard space');
for(const b of t.state.buildings.filter(b=>b.id!=='castle')){
 const choices=t.state.cells.filter(c=>t.canPlaceBuilding(b,c.q,c.r));
 assert(choices.length>=20,b.id+' has too few arrangement choices');
}
// Upgrade bars for both builders remain visible when the gate is off screen.
for(const [w,h] of [[320,480],[390,650],[844,390],[1366,720]]){
 stage.clientWidth=w;stage.clientHeight=h;
 for(const direction of [-1,1]){
  t.state.camera={x:direction*1000,y:direction*1000,zoom:t.territoryZoomLimits().max};t.clampCamera();
  const [wx,wy]=t.progressAnchor('wall',108,38),z=t.state.camera.zoom;
  const x=w/2+(wx-t.state.camera.x)*z,y=h/2+(wy-t.state.camera.y)*z;
  assert(x>=62-1e-8&&x<=w-62+1e-8);assert(y>=27-1e-8&&y<=h-27+1e-8);
 }
}
console.log('PASS: centered-grid round trips, 3-cell barracks, 7-cell castle, aligned resource row, ample free placement and visible gate progress at extreme pans. Free cells:',buildableCount-occupiedCount);

// Hold activates placement; a short tap / camera drag / cancel never does.
stage.clientWidth=390;stage.clientHeight=650;t.state.camera={x:0,y:0,zoom:1};
const [bx,by]=t.buildingCenter(small), sx=195+bx, sy=325+by;
const touchEvent=(type,x=sx,y=sy)=>({type,pointerType:'touch',pointerId:91,clientX:x,clientY:y,preventDefault(){}});
t.onPointerDown(touchEvent('pointerdown'));assert(timers.has(t.state.longPressTimer));
t.onPointerMove(touchEvent('pointermove',sx+15,sy));assert(!timers.has(t.state.longPressTimer),'pan kept hold timer');
t.onPointerUp(touchEvent('pointercancel',sx+15,sy));assert(!t.state.moveBuildingId);
t.onPointerDown(touchEvent('pointerdown'));const hold=timers.get(t.state.longPressTimer);assert(hold);hold();
assert.equal(t.state.moveBuildingId,small.id);assert.equal(t.state.gesture.type,'building');
t.onPointerUp(touchEvent('pointerup'));assert.equal(t.state.moveBuildingId,small.id);
assert(t.moveBuilding(small.id,small.q,small.r));assert.equal(t.state.landing.id,small.id);
now+=400;assert.equal(t.buildingLift(small),0);now+=500;
if(t.state.moveAnimationRaf)frames[t.state.moveAnimationRaf-1]();assert.equal(t.state.landing,null);
// Label population remains stable through movement; opacity eases at either end.
const labelRecords=[];const labelCtx=new Proxy({globalAlpha:1,fillText(text,x,y){labelRecords.push({text,x,y,alpha:this.globalAlpha})}}, {get(o,k){return k in o?o[k]:(()=>{})}});
t.state.selectedId=null;t.APP.tutorial.active=false;t.state.labelsVisibleUntil=0;now=1000;t.showBuildingLabels();
now=1110;t.drawTerritoryLabels(labelCtx);assert(labelRecords.length===t.state.buildings.length+1);assert(labelRecords.every(r=>r.alpha>.4&&r.alpha<.6));
labelRecords.length=0;now=1500;t.showBuildingLabels();t.drawTerritoryLabels(labelCtx);assert(labelRecords.every(r=>r.alpha===1));
labelRecords.length=0;now=t.state.labelsVisibleUntil+210;t.drawTerritoryLabels(labelCtx);assert(labelRecords.length===t.state.buildings.length+1);assert(labelRecords.every(r=>r.alpha>.4&&r.alpha<.6));
labelRecords.length=0;now=t.state.labelsVisibleUntil+430;t.drawTerritoryLabels(labelCtx);assert.equal(labelRecords.length,0);
assert.equal(t.missionDestination({id:'heal'}).id,'hospital');assert.equal(t.missionDestination({id:'tutorial-train'}).id,'barracks');
assert.equal(t.missionDestination({id:'growth-3-research',buildingId:'research'}).action,'upgrade');
console.log('PASS: hold-to-drag activation, pan cancellation, release/confirm, landing lifecycle, stable labels with fade-in/out and mission destinations.');
