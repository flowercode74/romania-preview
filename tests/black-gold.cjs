'use strict';
const assert=require('node:assert/strict');
const {t,context,setNow,getNow}=require('../scripts/test-harness.cjs');
for(const zoom of [.55,1.45,1.75,2,2.8]){
 const size=t.enemyRenderSize(zoom),radius=t.APP.map.hexSize*zoom;
 assert(size<=2*radius/(1+1/Math.sqrt(3)),'the entire sprite rectangle fits inside its hexagon');
 assert(size<23*zoom,'enemy artwork is smaller than every castle');
}
const texts=[],circles=[];const ctx=new Proxy({measureText:n=>({width:n.length*5}),fillText:n=>texts.push(n),arc:(...args)=>circles.push(args)},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
t.drawEnemyNameplate(ctx,'سپاه خاکستروند',4,100,100);assert.deepEqual(texts,['سپاه خاکستروند','درجه 4']);assert.equal(circles.length,0,'enemy grade does not reuse the circular castle badge');
const now=getNow(),hospital=t.buildingById('hospital'),[x,y]=t.buildingCenter(hospital);t.state.camera.x=x;t.state.camera.y=y;t.APP.tutorial.active=false;t.APP.army.healing={type:'sword',count:10,startedAt:now,endsAt:now+60000,duration:60000};
t.state.spriteLayer=context.document.createElement('div');setNow(now+30000);t.updateHealingActivity();const node=context.document.getElementById('hospitalHealingProgress');assert.equal(node.hidden,false);assert.equal(node.getAttribute('aria-valuenow'),'50');assert(Number.isFinite(parseFloat(node.style.left)));assert(Number.isFinite(parseFloat(node.style.top)));
t.APP.worker.task={id:'hospital',startedAt:now};t.APP.worker.endsAt=now+60000;const initialY=parseFloat(node.style.top);t.updateHealingActivity();assert(parseFloat(node.style.top)>initialY,'construction and healing bars do not share an anchor');
setNow(now+60000);t.updateHealingActivity();assert.equal(node.hidden,true,'expired healing is not displayed');t.APP.army.healing=null;t.updateHealingActivity();assert.equal(node.hidden,true);
console.log('PASS: tile-bound enemy art at all zooms, smaller than castles, distinct enemy grade typography, accurately timed hospital progress, separate upgrade/healing anchors and no stale bar.');
