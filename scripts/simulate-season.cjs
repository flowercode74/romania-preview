'use strict';
const {t,nodes,context,setNow,getNow}=require('./test-harness.cjs');
const assert=require('assert');
const start=getNow(),DAY=86400000,HOUR=3600000;
const interval=Number(process.argv[2]||4)*HOUR;
t.APP.tutorial.active=false;t.APP.tutorialSkipped=true;t.APP.spawnEmpire='free';
for(const i of t.INVENTORY.filter(i=>i.resource)){t.APP.resources[i.resource]+=i.count*i.value;i.count=0;}
let costSpent={wood:0,food:0,stone:0,iron:0},trained=0,starved=0,maxDay=null,castle7Day=null,earlyBlocked=0;
const records=[];
function claimAll(){for(const tab of ['tutorial','growth','daily'])for(const m of t.MISSION_DATA[tab])if(t.missionReady(tab,m))t.claimMission(tab,m.id);}
function chooseBuild(){
 const eligible=['farm','lumber','stone','iron','castle','barracks','wall','camp','hospital','hideout','research','embassy'].map(t.buildingById).filter(b=>b.level<20&&t.buildingRequirement(b).ok);
 eligible.sort((a,b)=>a.level-b.level||(['farm','lumber','stone','iron'].includes(b.id)?1:0)-(['farm','lumber','stone','iron'].includes(a.id)?1:0));
 for(const b of eligible){const c=t.buildingCost(b,b.level+1);if(Object.entries(c).every(([id,n])=>t.APP.resources[id]>=n)){const before=t.APP.worker.task;t.startBuildingTask(b.id);if(t.APP.worker.task!==before){for(const [id,n] of Object.entries(c))costSpent[id]+=n;return;}}}
 if(eligible.length){starved++;if(t.buildingById("castle").level<7)earlyBlocked++;}
}
for(let now=start;now<=start+48*DAY;now+=60000){
 setNow(now);t.tickBuildingTask();
 const day=(now-start)/DAY;
 if(!castle7Day&&t.buildingById('castle').level>=7)castle7Day=day;
 if(!maxDay&&['castle','farm','lumber','stone','iron','barracks','wall','camp','hospital','hideout','research','embassy'].every(id=>t.buildingById(id).level===20))maxDay=day;
 const awakeVisits=process.argv.includes("--awake")&&[0,4,8,12,16].some(h=>(now-start)%DAY===h*HOUR);
 const visit=(now-start)<8*HOUR||(process.argv.includes("--awake")?awakeVisits:(now-start)%interval===0);
 if(visit){
  for(const id of ['farm','lumber','stone','iron'])t.collectResource(id);
  if((t.APP.army.totalTrained||0)>=100 && !(t.APP.army.totalHealed||0) && !t.APP.army.practiceWounded){t.showArmyTutorial("healing");}
  if(t.APP.army.practiceWounded&&!(t.APP.army.totalHealed||0)&&!t.APP.army.healing&&t.buildingById("hospital").level){context.document.getElementById("armyCount").value="10";t.startArmyTask("healing");}
  claimAll();
  if(!t.APP.worker.task)chooseBuild();
  const upcoming=['farm','lumber','stone','iron','castle','barracks','wall','camp','hospital','hideout','research','embassy'].map(t.buildingById).filter(b=>b.level<20&&t.buildingRequirement(b).ok).map(b=>t.buildingCost(b,b.level+1));
  const reserve=Math.max(0,...upcoming.map(c=>Math.max(c.food,c.iron)));
  for(const key of t.TRAINING_KEYS){
   if(t.APP.army[key]||!t.buildingById('barracks').level||trained>=(t.buildingById('castle').level<7?100:120000))continue;
   const id=Object.keys(t.TROOPS)[Math.floor(trained/500)%8],unit=t.TROOPS[id];
   const n=Math.max(0,Math.min(100*t.buildingById('barracks').level,(t.buildingById('castle').level<7?100:120000)-trained,Math.floor((Math.min(t.APP.resources.food,t.APP.resources.iron)-reserve)/unit.cost)));
   if(!n)continue;
   context.document.getElementById('armyType').value=id;context.document.getElementById('armyCount').value=String(n);t.startArmyTask(key);
   if(t.APP.army[key]){trained+=n;costSpent.food+=unit.cost*n;costSpent.iron+=unit.cost*n;}
  }
 }
 if((now-start)%DAY===0)records.push({day:Math.round(day),castle:t.buildingById('castle').level,minimum:Math.min(...t.state.buildings.map(b=>b.level),t.APP.wallLevel),trainedCompleted:t.APP.army.totalTrained||0,resources:{...t.APP.resources}});
}
const summary={tutorialClaims:t.APP.missions.claimedTutorial.length,growthClaims:t.APP.missions.claimedGrowth.length,healed:t.APP.army.totalHealed||0,schedule:process.argv.includes("--awake")?"five daytime visits; eight hours sleep":`every ${interval/HOUR} hours`,visitsEveryHours:interval/HOUR,firstEightHoursActive:true,NPCraids:0,secondBuilder:false,speedups:false,castle7Day,maxDay,trained:t.APP.army.totalTrained||0,queued:trained,costSpent,resourceBlockedVisits:starved,blockedBeforeCastle7:earlyBlocked,levels:Object.fromEntries(['castle','farm','lumber','stone','iron','barracks','wall','camp','hospital','hideout','research','embassy'].map(id=>[id,t.buildingById(id).level])),records};
console.log(JSON.stringify(summary,null,2));
if(process.argv.includes('--assert')){assert(maxDay&&maxDay<=48,'not all buildings max by48');assert(summary.trained>=(t.buildingById('castle').level<7?100:120000),'120k not completed by48');assert(castle7Day<=3,'early progression too slow');}
