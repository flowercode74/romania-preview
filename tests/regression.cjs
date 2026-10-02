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
vm.createContext(context);let src=fs.readFileSync('assets/js/game.js','utf8');src=src.replace('  createCells();\n  loadAssets();','  globalThis.t={APP,state,startGame,saveGameProgress,loadGameProgress,hasSavedProgress,setupEntry,loadImage,safeAssetPath,INVENTORY};\n  createCells();\n  loadAssets();');vm.runInContext(src,context);

const t=context.t;
assert(t);
assert.equal(t.hasSavedProgress(),false);
assert.equal(typeof t.setupEntry(),'function');
local.set('romaniaTerritoryV4','{broken');
local.set('romaniaResourcesV2',JSON.stringify({wood:87654}));
assert.equal(t.hasSavedProgress(),true);
t.loadGameProgress();assert.equal(t.APP.resources.wood,87654);
local.clear();t.startGame(true);
t.APP.resources.wood=123456;t.saveGameProgress();
assert(t.hasSavedProgress());
assert(t.hasSavedProgress());assert.equal(typeof t.setupEntry(),'function');
t.APP.resources.wood=1;t.startGame(false);assert.equal(t.APP.resources.wood,123456);
const saved=JSON.parse(local.get('romaniaTerritoryV4'));
saved.collectors={farm:{amount:null,at:Date.now(),collectedAt:Date.now()}};
local.set('romaniaTerritoryV4',JSON.stringify(saved));t.loadGameProgress();assert.equal(t.APP.collectors.farm.amount,0);
local.set('romaniaTerritoryV4',JSON.stringify({version:99}));assert.equal(t.hasSavedProgress(),false);
for(const path of ['assets/enemies/viking.webp\" onerror=\"alert(1)', 'javascript:alert(1)', 'assets/../../secret.webp']) assert.equal(t.safeAssetPath(path,'fallback'),'fallback');
assert.equal(t.safeAssetPath('assets/enemies/cavarly.png'),'assets/enemies/cavalry.webp');
for(const item of t.INVENTORY)assert(fs.existsSync(item.image),'Missing inventory art: '+item.image);
(async()=>{
 const image=t.loadImage('assets/icons/bag.webp');assert.equal(image,t.loadImage('assets/icons/bag.webp'));
 image.onload();assert.equal(await image.assetReady,true);
 const failed=t.loadImage('assets/test-unavailable.webp');failed.onerror();assert.equal(await failed.assetReady,false);
 console.log('PASS: corrupt-save migration, continue visibility/restoration, unsupported save versions, invalid collector amounts, unsafe image paths, inventory assets and reused/failed image loads.');
})().catch(error=>{console.error(error);process.exitCode=1;});
