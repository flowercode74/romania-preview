'use strict';
const assert=require('assert');
const {t,nodes,context,setNow,getNow}=require('../scripts/test-harness.cjs');
t.APP.tutorial.active=false;t.APP.tutorialSkipped=true;t.createWorldMap();t.APP.currentMode='map';
for(const id of Object.keys(t.TROOPS))assert(t.troopUnlocked(id));
const stats=t.troopStats('archer');t.APP.research.lines={archer:{unlocked:false,tier:1,attack:20,health:20,defense:20}};assert.deepEqual(t.troopStats('archer'),stats);t.startResearch();assert.equal(t.APP.research.task,null);
assert.equal(t.castleFootprint(100,100).length,1);assert.equal(t.terrainAt(400,400).kind,"tower");assert.notEqual(t.terrainAt(401,400).kind,"tower");assert(t.mapMinZoom()>=.55);
// Stock is reserved only after confirmation, in the exact requested mix.
t.APP.army.troops=180;t.APP.army.units={sword:100,archer:80};t.buildingById('camp').level=1;
const destination=t.enemies[0];t.APP.selectedMapCastle={q:destination.q,r:destination.r,name:'کمپ آزمایشی'};
t.startMarch('camp');assert.equal(t.APP.marches.length,0);assert.equal(t.APP.army.troops,180);assert(nodes.get('gameDialogContent').innerHTML.includes('type="range"'));
for(const units of [{sword:-1},{sword:1.5},{sword:NaN},{unknown:1},{sword:101},{sword:1,archer:81}])assert(!t.validDeployment(units));
assert(t.startMarch('camp',{sword:10,archer:20}));assert.equal(t.APP.army.troops,150);assert.equal(t.APP.army.units.sword,90);assert.equal(t.APP.army.units.archer,60);
const camp=t.APP.marches[0];assert.equal(camp.troops,30);camp.phase='returning';camp.startedAt=getNow()-2000;camp.arriveAt=getNow()-1;
t.updateMarches();assert.equal(t.APP.army.troops,180);assert.equal(t.APP.army.units.sword,100);assert.equal(t.APP.army.units.archer,80);t.updateMarches();assert.equal(t.APP.army.troops,180);
// Losing a count of one role must not subtract a different role on return.
const casualtyMarch={...camp,id:'typed-return',phase:'returning',unitCounts:{sword:10,archer:20},troops:30,lostTroops:8,casualties:{sword:2,archer:6},troopsRestored:false,arriveAt:getNow()-1};t.APP.marches=[casualtyMarch];t.APP.army.troops=150;t.APP.army.units={sword:90,archer:60};t.updateMarches();assert.equal(t.APP.army.units.sword,98);assert.equal(t.APP.army.units.archer,74);assert.equal(t.APP.army.troops,172);
// Forward and return directions come from the actual active segment.
for(const [dx,dy,row] of [[0,-10,0],[10,-10,1],[10,0,2],[10,10,3],[0,10,4],[-10,10,5],[-10,0,6],[-10,-10,7]]){
 const m={phase:'outbound',route:[{wx:0,wy:0},{wx:dx,wy:dy}],startedAt:getNow(),arriveAt:getNow()+1000};assert.equal(t.marchDirection(m),row);m.phase='returning';assert.equal(t.marchDirection(m),(row+4)%8);
}
// Counters affect both mixed and homogeneous armies through the same combat model.
const strong=t.simulateCombat({archer:100},5,3),neutral=t.simulateCombat({archer:100},5,2),weak=t.simulateCombat({archer:100},5,0);assert(strong.victory);assert(strong.wounded<neutral.wounded);assert.equal(t.enemyArmy(5,0).length,4);assert(weak.rounds>0);
assert(!t.simulateCombat({sword:1},25,0).victory);assert(t.simulateCombat({sword:45000},25,0).victory);
const reportMarch={id:'npc-once',enemyId:'npc-once',enemyType:1,enemyLevel:1,troops:100,unitCounts:{archer:100},origin:{...t.APP.home},target:{q:destination.q,r:destination.r},arriveAt:getNow()};
t.APP.enemyProgress={};const money=t.APP.resources.wood,wounded=t.APP.army.wounded;
assert(t.enemyUnlocked(1,1));assert(!t.enemyUnlocked(1,2));assert(t.resolveEnemyBattle(reportMarch,()=>0));assert(t.enemyUnlocked(1,2));assert(!t.enemyUnlocked(1,3));assert(!t.enemyUnlocked(0,2));assert.equal(t.APP.resources.wood,money+t.enemyResources(1).wood);assert.equal(t.APP.army.wounded,wounded+reportMarch.lostTroops);
const rewards=t.APP.resources.wood;assert(!t.resolveEnemyBattle(reportMarch,()=>0));assert.equal(t.APP.resources.wood,rewards);assert.equal(t.APP.battleReports.filter(r=>r.id==='npc-once').length,1);assert(t.APP.battleReports[0].items.every(i=>typeof i.id==='string'));
t.saveGameProgress();t.APP.enemyProgress={};t.loadGameProgress();assert(t.enemyUnlocked(1,2));
t.APP.enemyDefeated={};const type=1,level=t.enemies.find(e=>e.type===type).level;const first=t.nearestEnemy(type,level);assert(first);const distance=t.mapDistance(t.APP.home,first);assert(t.enemies.filter(e=>e.type===type&&e.level===level).every(e=>t.mapDistance(t.APP.home,e)>=distance));t.APP.enemyDefeated[first.id]=getNow()+10000;assert.notEqual(t.nearestEnemy(type,level)?.id,first.id);
// A stale sheet cannot attack the location from before the enemy respawned.
t.APP.army.troops=100;t.APP.army.units={sword:100};t.APP.enemyProgress[t.ENEMY_TYPES[first.type].id]=25;t.APP.selectedMapCastle={...first,q:first.q+1,name:'قدیمی',enemyId:first.id,enemyType:first.type,enemyLevel:first.level};assert(!t.startMarch('attack',{sword:10}));assert.equal(t.APP.army.troops,100);
// Tutorial waits for player clicks instead of opening the facility behind speech.
t.APP.tutorial.active=true;t.APP.openPage=null;t.showArmyTutorial('training');assert.equal(t.APP.openPage,null);assert.equal(t.state.missionFocus.id,'barracks');
t.APP.army.practiceWounded=false;t.APP.army.troops=100;t.APP.army.units={archer:100};t.APP.army.wounded=0;t.APP.army.woundedUnits={};t.showArmyTutorial('healing');assert.equal(t.APP.openPage,null);assert.equal(t.APP.army.woundedUnits.archer,10);assert.equal(t.APP.army.units.archer,90);
console.log('PASS: exact slider deployment, stock/slot checks, all-role unlock, dormant research, one world tile, two zoom regimes, typed exactly-once returns, 8 walking directions and returns, role counters and mixed NPCs, defeat/victory, rewards and wound idempotency, faction ladder persistence, nearest search, stale-target protection, player-driven tutorials and typed practice wounds.');
