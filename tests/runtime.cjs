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
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,createWorldMap,drawWorldMap,startMarch,mapToScreen,bindMapInput,teleportCastle,validTeleportTarget,recallCamp,insideEventArea,openInventory,openProfile,escapeHTML,renderMapActions,openMapTile};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);
const t=context.t;assert(t);assert.equal(t.escapeHTML('<"\'&>'),'&lt;&quot;&#39;&amp;&gt;');t.startGame(true);assert.equal(t.APP.wallLevel,0);t.APP.tutorial.active=false;t.createWorldMap();t.APP.currentMode='map';t.drawWorldMap();
t.APP.army.troops=100;t.APP.army.units={sword:100};for(let i=0;i<4;i++){t.APP.selectedMapCastle={q:367+i,r:400,name:'camp'};t.startMarch('camp',{sword:10});}assert.equal(t.APP.marches.length,4);t.APP.selectedMapCastle={q:367,r:400,name:'camp'};t.startMarch('camp');assert.equal(t.APP.marches.length,4);
t.openProfile();t.openInventory();assert(nodes.get('genericPanelContent').innerHTML.includes('inventory-grid'));
t.openMapTile({q:395,r:400});assert.equal(t.APP.map.selection.kind,'tile');const layer=nodes.get('worldMapLayer');assert(layer.children.some(x=>x.id==='mapTileActions'));
console.log('PASS: full bootstrap, guest flow, canvas drawing, four marching slots, profile/inventory rendering, attached tile action menu and HTML escaping.');

(async()=>{
 t.APP.marches=[{id:'camp-recall',type:'camp',phase:'waiting',origin:{q:366,r:400},target:{q:367,r:400},route:[{q:366,r:400},{q:367,r:400}],travelMs:15000,returnAt:Date.now()+7200000}];
 const recall=t.recallCamp('camp-recall');nodes.get('gameDialogActions').children[1].listeners.click[0]();await recall;assert.equal(t.APP.marches[0].phase,'returning');
 t.APP.marches=[];let target;for(let q=100;q<180&&!target;q++)for(let r=100;r<180&&!target;r++)if(t.validTeleportTarget({q,r}))target={q,r};assert(target);
 const homeBefore={...t.APP.home};const cancelled=t.teleportCastle(target,'teleport-target');nodes.get('gameDialogActions').children[0].listeners.click[0]();await cancelled;assert.equal(t.APP.home.q,homeBefore.q);
 const accepted=t.teleportCastle(target,'teleport-target');nodes.get('gameDialogActions').children[1].listeners.click[0]();await accepted;assert.equal(t.APP.home.q,target.q);assert.equal(t.APP.home.r,target.r);
 assert(context.window.RomaniaGame.setAlliance({name:'اتحاد تست',empireId:'rome',logo:'assets/empires/rome.webp'}));t.openProfile();assert(nodes.get('genericPanelContent').innerHTML.includes('alliance-crest'));
 assert(context.window.RomaniaGame.completeCapture('rome'));assert.equal(t.APP.eventEmpire,'rome');assert(!t.validTeleportTarget({q:400,r:418}));
 console.log('PASS: confirmation cancellation/consumption, early camp recall, alliance crests, capture ownership and persistent teleport ban at event gates.');
})().catch(e=>{console.error(e);process.exitCode=1});
