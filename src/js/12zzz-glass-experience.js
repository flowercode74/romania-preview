  // Shared presentation and small, explicit state transitions. No UI operation owns a queue.
  function troopResourceCosts(unit,count=1) {
    const c=typeof unit==='string'?TROOPS[unit].cost:unit.cost;
    return {wood:Math.ceil(c*.30)*count,food:Math.ceil(c*.70)*count,stone:Math.ceil(c*.20)*count,iron:Math.ceil(c*.80)*count};
  }
  for(const hours of [5,12,24]) INVENTORY.push({id:`anti-spy-${hours}h`,name:`پردهٔ سایه · ${hours} ساعت`,category:'shield',protection:'anti-spy',value:hours*3600000,count:hours===5?1:0,image:'assets/items/anti-spy.webp'});
  for(const [level,hours] of [[7,12],[15,24]]){const m=MISSION_DATA.growth.find(m=>m.id===`growth-${level}-camp`);if(m)m.reward.items=[{id:`anti-spy-${hours}h`,count:1}];}
  APP.antiSpyUntil=0;
  APP.medals=[];
  const AUTH_METHODS=[{id:'bale',label:'بله',symbol:'ب'},{id:'telegram',label:'تلگرام',symbol:'➤'},{id:'phone',label:'شماره همراه',symbol:'☎'}];
  const TEST_SERVER={id:'test-1',name:'تست #1',startedAt:Date.UTC(2026,9,2),days:52};
  let accountSession=readStoredObject('romaniaSessionV1')||{mode:'guest',serverId:TEST_SERVER.id};
  let authBusy=false,entryMethod=null,exitApproved=false;
  function accountIsConnected(){return accountSession.mode==='connected'&&!!accountSession.accountId;}
  function accountGateRequired(){return APP.tutorial.active&&!APP.tutorialSkipped&&tutorialArmyStage()==='final-camp'&&accountSession.mode!=='admin'&&!accountIsConnected();}
  function saveAccountSession(){try{localStorage.setItem('romaniaSessionV1',JSON.stringify(accountSession));}catch{}}
  function authMethodIcon(id){const shape={telegram:'<path d="m2 11 20-8-4 18-6-5-4 3 1-6 9-7-11 6Z"/>',phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',bale:'<path d="M20 13c0 5-4 8-9 8H3l2-4C1 12 3 4 10 3c5-1 10 2 10 7"/><path d="M8 9h6m-6 5h9"/>'}[id];return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${shape}</svg>`;}
  function authMethodsHTML(){return `<div class="auth-methods">${AUTH_METHODS.map(m=>`<button type="button" data-connect-method="${m.id}" aria-label="اتصال با ${m.label}"><span class="auth-symbol auth-${m.id}">${authMethodIcon(m.id)}</span><strong>${m.label}</strong></button>`).join('')}</div>`;}
  async function connectAccount(method,onSuccess=()=>{}) {
    if(authBusy||!AUTH_METHODS.some(m=>m.id===method))return;
    const adapter=window.RomaniaAccountAuth;
    if(typeof adapter?.authenticate!=='function'){
      const n=document.getElementById('authStatus')||document.getElementById('entryNotice');
      if(n){n.hidden=false;n.textContent='سرویس اتصال حساب هنوز به نسخهٔ آزمایشی متصل نشده است. برای تست از AdminMode در صفحهٔ ورود استفاده کنید. حساب شما متصل نشده است.';}
      return;
    }
    authBusy=true;
    try {
      const result=await adapter.authenticate({method,serverId:TEST_SERVER.id});
      if(!result||result.verified!==true||typeof result.accountId!=='string'||!result.accountId.trim())throw Error('verification');
      accountSession={mode:'connected',method,accountId:result.accountId.slice(0,160),serverId:TEST_SERVER.id};saveAccountSession();onSuccess();
    } catch(error) {const n=document.getElementById('authStatus')||document.getElementById('entryNotice');if(n){n.hidden=false;n.textContent='اتصال حساب تایید نشد. دوباره تلاش کنید؛ پیشرفت شما حفظ شده است.';}}
    finally{authBusy=false;}
  }
  function showAccountGate(){
    closePanels();hideBuildingActionMenu();hideTutorialCard();
    let gate=document.getElementById('accountGate');
    if(gate?.id==='accountGate'&&gate.hidden===false)return;
    if(!gate){gate=document.createElement('section');gate.id='accountGate';gate.className='account-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');document.body.appendChild(gate);}
    gate.hidden=false;
    gate.innerHTML=`<div class="auth-glass-card"><small>آخرین گام آموزش</small><h2>فرمانروایی‌ات را به حساب متصل کن</h2><p>پیش از ارتقای نهایی ${BUILD_NAMES.camp}، یکی از روش‌های اتصال را انتخاب کن. پیشرفت میهمان روی این دستگاه محفوظ است.</p>${authMethodsHTML()}<p id="authStatus" role="status"></p><button data-gate-landing>بازگشت به صفحهٔ ورود</button></div>`;
    gate.onclick=e=>{const m=e.target.closest('[data-connect-method]');if(m)return connectAccount(m.dataset.connectMethod,()=>{gate.hidden=true;showFinalCampTutorial();});if(e.target.closest('[data-gate-landing]')){gate.hidden=true;renderAccountEntry();}};
  }
  function renderAccountEntry(){
    const entry=document.getElementById('entryScreen');entry.hidden=false;
    const age=Math.max(0,Date.now()-TEST_SERVER.startedAt),newServer=age<3*86400000;
    entry.querySelector('.entry-card').innerHTML=`<div class="entry-brand"><small>ROMANIA</small><h1 id="entryTitle">فرمانروایی از اینجا آغاز می‌شود</h1><p>روش ورود و سرور خود را انتخاب کن</p></div>${authMethodsHTML()}<div class="entry-local-actions"><button id="guestEntry" data-entry-guest>ورود به عنوان میهمان</button><button id="adminEntry" data-entry-admin dir="ltr">AdminMode</button></div><section class="server-picker"><h2>سرورهای بازی</h2><button class="server-card is-selected" data-server="test-1" aria-pressed="true"><span class="server-emblem">I</span><span><strong>${TEST_SERVER.name}</strong><small>از شروع: ${Math.floor(age/86400000)} روز و ${Math.floor(age/3600000)%24} ساعت</small></span>${newServer?'<b class="new-server">جدید</b>':'<b>فعال</b>'}</button></section><details class="entry-terms"><summary>شرایط و مقررات</summary><p>این سرور آزمایشی است. پیشرفت محلی روی همین دستگاه ذخیره می‌شود. احترام به بازیکنان و پرهیز از تقلب و سوءاستفاده از باگ الزامی است. قابلیت‌های آنلاین به سرویس بازی نیاز دارند.</p></details><label class="spawn-consent"><input id="entryAccept" type="checkbox"> شرایط و مقررات را می‌پذیرم</label><button id="entryProceed" class="entry-primary" disabled>ادامه</button>${hasSavedProgress()?'<button id="continueEntry">ادامهٔ فرمانروایی ذخیره‌شده</button>':''}<p id="entryNotice" class="entry-notice" role="status" hidden></p>`;
    entryMethod=null;
    const card=entry.querySelector('.entry-card'),accept=document.getElementById('entryAccept'),proceed=document.getElementById('entryProceed');
    const update=()=>{proceed.disabled=!accept.checked||!entryMethod;};accept.onchange=update;
    card.onclick=async e=>{
      const method=e.target.closest('[data-connect-method]');
      if(method)return connectAccount(method.dataset.connectMethod,()=>{entryMethod='connected';update();});
      if(e.target.closest('[data-entry-guest]')||e.target.closest('[data-entry-admin]')){
        entryMethod=e.target.closest('[data-entry-admin]')?'admin':'guest';
        card.querySelectorAll('.entry-local-actions button').forEach(b=>b.classList.toggle('is-selected',b.id===(entryMethod==='admin'?'adminEntry':'guestEntry')));update();return;
      }
      if(e.target.closest('#entryProceed')&&!proceed.disabled){
        if(entryMethod!=='connected')accountSession={mode:entryMethod,serverId:TEST_SERVER.id};saveAccountSession();
        if(state.gameStarted){entry.hidden=true;if(accountGateRequired())showAccountGate();else if(APP.tutorial.active)syncTutorialProgress(true);return;}
        if(hasSavedProgress()&&!await gameConfirm("فرمانروایی تازه جای پیشرفت ذخیره‌شدهٔ این دستگاه را می‌گیرد. ادامه می‌دهید؟"))return;
        showSpawnSelection();return;
      }
      if(e.target.closest('#continueEntry')){
        if(!accept.checked)return showBuildNotice('ابتدا شرایط و مقررات را بپذیرید.');
        if(entryMethod){if(entryMethod!=='connected')accountSession={mode:entryMethod,serverId:TEST_SERVER.id};saveAccountSession();}
        entry.hidden=true;if(!state.gameStarted)startGame(false);else if(accountGateRequired())showAccountGate();else syncTutorialProgress(true);
      }
    };
  }
  setupEntry=function(){return renderAccountEntry;};
  function showFinalCampTutorial(){
    APP.tutorial.phase='final-camp';
    if(accountGateRequired()){saveGameProgress();return showAccountGate();}
    state.missionFocus={id:'camp',action:'upgrade'};state.selectedId=null;
    closePanels();hideBuildingActionMenu();document.body.classList.remove('ui-tour');focusBuilding('camp');showBuildingLabels();drawWorld();positionWorldOverlays();startTutorialBeacon();
    document.getElementById('tutorialTitle').textContent='آخرین فرمان · گسترش اردو';document.getElementById('tutorialNext').hidden=false;
    setNarratorText(`${BUILD_NAMES.camp} را به سطح ۲ ارتقا دهید. پس از آغاز ارتقا می‌توانید در قلمرو حرکت کنید یا با سکه آن را تمام کنید.`);
    document.getElementById('tutorialOverlay')?.classList.remove('is-welcome');document.getElementById('tutorialOverlay')?.classList.add('is-visible');updateMissionStatus();saveGameProgress();
  }
  const baseFinishTutorial=finishTutorial;
  finishTutorial=function(){
    if(!APP.tutorialSkipped&&(APP.army.totalTrained||0)>=100&&(APP.army.totalHealed||0)>=10&&APP.tutorial.uiComplete&&buildingById('camp').level<2)return showFinalCampTutorial();
    return baseFinishTutorial();
  };
  const baseArmyStage=tutorialArmyStage;
  tutorialArmyStage=function(){const stage=baseArmyStage();return stage==='finished'&&!APP.tutorialSkipped&&buildingById('camp').level<2?'final-camp':stage;};
  const baseTutorialTarget=tutorialTargetId;
  tutorialTargetId=function(){return APP.tutorial.phase==='final-camp'?'camp':baseTutorialTarget();};
  const baseStartBuild=startBuildingTask;
  startBuildingTask=function(id){if(id==='camp'&&accountGateRequired())return showAccountGate();return baseStartBuild(id);};
  const baseSelect=selectBuilding;
  selectBuilding=function(id,type){if(document.getElementById('accountGate')?.id==='accountGate' && document.getElementById('accountGate').hidden===false)return;if(APP.tutorial.active&&id===tutorialTargetId())hideTutorialCard();baseSelect(id,type);applyTutorialGuidance();};
  const baseOpenBuilding=openBuildingPanel;
  openBuildingPanel=function(mode){baseOpenBuilding(mode);applyTutorialGuidance();};
  const baseOpenFacility=openFacility;
  openFacility=function(id){baseOpenFacility(id);applyTutorialGuidance();};
  const baseRenderTraining=renderTrainingPage,baseRenderHealing=renderHealingPage;
  renderTrainingPage=function(){baseRenderTraining();applyTutorialGuidance();};
  renderHealingPage=function(){baseRenderHealing();applyTutorialGuidance();};
  function applyTutorialGuidance(){
    startTutorialBeacon();
    document.querySelectorAll('[data-tutorial-guide]').forEach(n=>{n.classList.remove('tutorial-pulse');n.removeAttribute('data-tutorial-guide');});
    if(!APP.tutorial.active)return;
    let selector;
    if(APP.openPage==='training')selector=hasTrainingTasks()?'[data-training-instant]':'[data-start-army]';
    else if(APP.openPage==='healing')selector=APP.army.healing?'[data-healing-instant]':'[data-start-army]';
    else if(document.getElementById('buildingPanel')?.classList.contains('is-active'))selector=APP.worker.task?'[data-instant-active]':'[data-start-build]';
    else if(state.selectedId===tutorialTargetId())selector=`[data-building-action="${APP.tutorial.phase.startsWith('army-')?'special':'upgrade'}"]`;
    if(selector)document.querySelectorAll(selector).forEach(n=>{if(!n.disabled&&!n.hidden){n.classList.add('tutorial-pulse');n.setAttribute('data-tutorial-guide','true');}});
  }
  const baseBack=navigateGameBack;
  navigateGameBack=function(){
    if(document.getElementById('accountGate')?.id==='accountGate' && document.getElementById('accountGate').hidden===false)return true;
    const wasArmy=['training','healing'].includes(APP.openPage),result=baseBack();
    if(APP.tutorial.active&&wasArmy&&!['training','healing'].includes(APP.openPage)){
      gameNavigation.frames=[];closePanels();hideBuildingActionMenu();state.selectedId=null;
      state.missionFocus={id:tutorialTargetId(),action:APP.tutorial.phase.startsWith('army-')?'special':'upgrade'};showBuildingLabels();drawWorld();positionWorldOverlays();
      // Returning does not replay a dialogue or block the map. The target stays guided.
    }
    applyTutorialGuidance();return result;
  };
  function requestGameExit(){
    if(exitApproved)return;
    showGameDialog('خروج از رومانیا','<p>پیشرفتت ذخیره می‌شود. از بازی خارج می‌شوی؟</p>',[{label:'ادامهٔ بازی',primary:true,run:closeGameDialog},{label:'خروج',run:()=>{saveGameProgress();exitApproved=true;closeGameDialog();state.gameStarted=false;window.history?.go(-2);}}]);
  }
  updateMissionStatus=function(){
    const label=document.getElementById('missionStatusText'),badge=document.getElementById('missionBadge');if(!label)return;
    const tabs=APP.tutorial.active||tutorialRewardsPending()?['tutorial']:['growth','daily'];
    const ready=tabs.flatMap(tab=>MISSION_DATA[tab].filter(m=>missionReady(tab,m))).length;
    if(badge){badge.textContent=formatCompact(ready);badge.hidden=!ready;}document.getElementById('missionStatus')?.classList.toggle('has-claims',!!ready);
    if(APP.tutorial.active){
      const b=buildingById(tutorialTargetId());
      label.textContent=APP.tutorial.phase==='army-training'?`آموزش ${formatCompact(Math.max(0,100-(APP.army.totalTrained||0)))} سرباز`:APP.tutorial.phase==='army-healing'?`درمان ${Math.max(0,10-(APP.army.totalHealed||0))} مجروح`:APP.tutorial.phase==='ui-tour'?'آشنایی با فرمانروایی':b?`${APP.worker.task?.id===b.id?'در حال ':''}${b.level?'ارتقا':'ساخت'} ${b.name}`:'آغاز فرمانروایی';
    }else{
      const next=['growth','daily'].flatMap(tab=>MISSION_DATA[tab].filter(m=>missionUnlocked(tab,m)&&missionProgress(m)<m.target)).shift();
      label.textContent=next?.title||'همهٔ ماموریت‌های فعلی انجام شد';
    }
    fitMissionLabel();
  };
  function fitMissionLabel(){
    const n=document.getElementById('missionStatusText');if(!n)return;
    n.style.fontSize='12px';
    if(n.clientWidth>0&&n.scrollWidth>n.clientWidth)n.style.fontSize=`${Math.max(8,Math.min(12,12*n.clientWidth/n.scrollWidth))}px`;
  }
  window.addEventListener('resize',fitMissionLabel);
  function updateTrainingActivity(){
    if(!state.spriteLayer)return;
    let node=document.getElementById('barracksActivity');
    if(!node){node=document.createElement('button');node.id='barracksActivity';node.className='barracks-activity';node.setAttribute('aria-label','وضعیت سه صف آموزش');node.onclick=e=>{e.stopPropagation();openFacility('barracks');};state.spriteLayer.appendChild(node);}
    const tasks=TRAINING_KEYS.map(k=>APP.army[k]);node.hidden=!tasks.some(Boolean);
    const stamp=tasks.map(t=>t?`${t.startedAt}:${Math.floor((t.endsAt-Date.now())/1000)}`:"idle").join("|");
    if(node.dataset.stamp!==stamp){node.dataset.stamp=stamp;node.innerHTML=tasks.map((t,i)=>`<span class="${t?'busy':'idle'}" title="صف ${i+1} · ${t?formatDuration(t.endsAt-Date.now()):'آماده'}"><i style="width:${t?Math.max(0,Math.min(100,(Date.now()-t.startedAt)/t.duration*100)):0}%"></i><b>${i+1}</b></span>`).join('');}
    const b=buildingById('barracks');if(!b)return;const box=buildingRenderBox(b,b.q,b.r);
    node.style.left=`${box.x+box.width/2}px`;node.style.top=`${box.y+box.height*.85}px`;node.style.setProperty('--collector-scale',1/state.camera.zoom);
  }
  const basePositionSprites=positionWorldSprites;
  positionWorldSprites=function(){basePositionSprites();updateTrainingActivity();};
  renderTerritoryStatus=function(){
    const queue=(name,t,disabled=false)=>`<article class="territory-status-card"><span>${name}</span><strong>${disabled?'هنوز باز نشده':t?`${t.name||TROOPS[t.type]?.name||'فعال'} · ${formatCompact(t.count||t.target||0)}`:'آماده'}</strong>${t?timerProgress(t.startedAt,t.endsAt||0):''}</article>`;
    return `<div class="territory-status-list">${queue('کارگر اول',APP.worker.task?{...APP.worker.task,endsAt:APP.worker.endsAt}:null)}${queue('کارگر دوم',APP.secondBuilder&&APP.worker2.task?{...APP.worker2.task,endsAt:APP.worker2.endsAt}:null,!APP.secondBuilder)}${TRAINING_KEYS.map((k,i)=>queue(`رزمگاه · صف ${i+1}`,APP.army[k])).join('')}${queue('دارالشفا · صف درمان',APP.army.healing)}${queue('کانون خردسنگ · تحقیقات',null,true)}</div>`;
  };
  openShield=function(){
    if(APP.tutorial.active&&APP.tutorial.phase!=='ui-tour')return;
    const section=(name,anti)=>`<section class="protection-section"><header><h2>${name}</h2><span>${(anti?APP.antiSpyUntil:APP.shieldUntil)>Date.now()?formatDuration((anti?APP.antiSpyUntil:APP.shieldUntil)-Date.now())+' باقی مانده':'غیرفعال'}</span></header><div class="protection-items">${INVENTORY.filter(i=>i.category==='shield'&&(i.protection==='anti-spy')===anti).map(i=>`<button data-activate-shield="${i.id}" ${i.count?'':'disabled'}><img src="${i.image}" alt=""><strong>${i.name}</strong><small>×${formatCompact(i.count)}</small><span>${i.count?'فعال‌سازی':'ناموجود'}</span></button>`).join('')}</div></section>`;
    openPage('shield',section('سپر قلمرو',false)+section('پردهٔ سایه · ضدجاسوسی',true));
    document.getElementById('genericPanelContent').onclick=async e=>{
      const b=e.target.closest('[data-activate-shield]');if(!b)return;
      const i=INVENTORY.find(i=>i.id===b.dataset.activateShield);if(!i?.count||!await gameConfirm(`فعال‌سازی ${i.name}؟`))return;if(!i.count)return;
      const key=i.protection==='anti-spy'?'antiSpyUntil':'shieldUntil';i.count--;APP[key]=Math.max(Date.now(),APP[key]||0)+i.value;saveGameProgress();openShield();
    };
  };
  function openEvents(offset=0){
    const day=Math.min(52,Math.max(1,Math.floor((Date.now()-TEST_SERVER.startedAt)/86400000)+1));
    const events=[{name:'آغاز فرمانروایی',from:1,to:3,text:'زمان پیوستن به سرور و آغاز آموزش',icon:'quest'},{name:'روزهای رشد',from:4,to:42,text:'ساخت ارتش، ارتقا و رقابت برای منابع',icon:'world-map'},{name:'آمادگی نبرد نهایی',from:43,to:48,text:'آماده‌سازی برای رقابت برج فرمانروایی',icon:'shield'},{name:'رقابت برج فرمانروایی',from:49,to:52,text:'رویداد پایانی فصل؛ اتصال رقابت آنلاین هنوز فعال نیست',icon:'event'}];
    const start=1+Math.max(0,Math.min(1,offset))*28,end=Math.min(52,start+27);
    openPage('events',`<section class="event-calendar"><header><div><small>${TEST_SERVER.name} · فصل ۵۲ روزه</small><h2>تقویم فرمانروایی</h2></div><b>روز ${day}</b></header><nav><button data-event-month="0">روزهای ۱–۲۸</button><button data-event-month="1">روزهای ۲۹–۵۲</button></nav><div class="calendar-grid">${Array.from({length:end-start+1},(_,i)=>{const d=start+i,event=events.find(e=>d>=e.from&&d<=e.to);return `<button class="calendar-day ${d===day?'today':''} ${d<day?'past':''}" data-event-day="${d}"><b>${d}</b><img src="assets/icons/${event.icon}.webp" alt="${event.name}"></button>`;}).join('')}</div><div class="event-agenda">${events.map(e=>`<article class="${day>=e.from&&day<=e.to?'active':''}"><img src="assets/icons/${e.icon}.webp" alt=""><div><strong>${e.name}</strong><small>روز ${e.from} تا ${e.to}</small><p>${e.text}</p></div><span>${day>e.to?'پایان یافته':day>=e.from?'اکنون':'به‌زودی'}</span></article>`).join('')}</div></section>`);
    document.getElementById('genericPanelContent').onclick=e=>{const b=e.target.closest('[data-event-month]');if(b)openEvents(Number(b.dataset.eventMonth));const d=e.target.closest('[data-event-day]');if(d){const v=Number(d.dataset.eventDay);showBuildNotice(events.find(x=>v>=x.from&&v<=x.to).name);}};
  }
  function profileActionIcon(name){
    const paths={settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',troops:'<path d="M5 21 19 3m-6 1 7-1-1 7M3 16l5 5m7-17 6 5M4 3l16 18M3 9V3h6"/>',leaderboard:'<path d="M5 7H2v3c0 4 5 4 5 4M19 7h3v3c0 4-5 4-5 4M6 3h12v7c0 8-12 8-12 0V3ZM12 16v5m-5 1h10"/>',skins:'<path d="M8 3 3 5l-2 6 5 2v9h12v-9l5-2-2-6-5-2c0 5-8 5-8 0Z"/>'};
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }
  openProfile=function(player=null){
    const own=!player||player.own;
    const p=own?{name:APP.playerName||'DreaM',power:APP.resources.power,kills:APP.kills,peakPower:APP.peakPower,peakKills:APP.peakKills,level:buildingById('castle').level,vip:1,stamina:APP.stamina,allianceName:APP.alliance?.name||'بدون اتحاد',accountCreatedAt:APP.accountCreatedAt,avatar:selectedAvatarSkin().avatar,portrait:selectedAvatarSkin().portrait}:player;
    const avatar=safeAssetPath(p.avatar,'assets/skins/avatar-01.webp'),portrait=safeAssetPath(p.portrait,avatar),age=Number.isFinite(p.accountCreatedAt)?Math.floor((Date.now()-p.accountCreatedAt)/86400000):null;
    const records=[['قدرت',p.power],['کشتار',p.kills],['بیشترین قدرت',p.peakPower],['بیشترین کشتار',p.peakKills],['سطح دژ',p.level],['سن حساب',age===null?'ثبت نشده':`${age} روز`],['سرور',TEST_SERVER.name],['VIP',p.vip]];
    openPage('profile',`<section class="profile-scroll"><div class="profile-full-hero"><img class="profile-backdrop" src="assets/ui/profile-citadel.webp" alt=""><img class="profile-full-avatar" src="${avatar}" alt="${escapeHTML(p.name||'بازیکن')}"><div class="profile-glass-name"><small>فرمانروای ${BUILD_NAMES.castle}</small><h2>${escapeHTML(p.name||'بازیکن')}</h2><span>${escapeHTML(p.allianceName||'بدون اتحاد')}${own&&APP.alliance?.logo?`<img class="alliance-crest" src="${escapeHTML(APP.alliance.logo)}" alt="نشان اتحاد">`:''}</span>${own?`<div class="profile-stamina"><i><b style="width:${APP.stamina}%"></b></i><span>${APP.stamina}/100</span></div>`:''}</div><span class="profile-scroll-hint">جزئیات فرمانروایی ↓</span></div><section class="profile-record-grid">${records.map(([label,n])=>`<article><small>${label}</small><strong>${typeof n==='number'?formatCompact(n):escapeHTML(n??'ثبت نشده')}</strong></article>`).join('')}</section><section class="profile-medals"><h3>مدال‌های ماندگار</h3>${own&&APP.medals.length?APP.medals.map(m=>`<span>${escapeHTML(m.name||m.id||'مدال')}</span>`).join(''):'<p>شما مدالی ندارید</p>'}</section>${own?`<nav class="profile-actions">${['settings','troops','leaderboard','skins'].map((id,i)=>`<button data-profile-tab="${id}">${profileActionIcon(id)}<span>${['تنظیمات','نیروها','لیدربورد','اسکین‌ها'][i]}</span></button>`).join('')}</nav>`:''}</section>`);
    gameNavigation.profileView={player:player?{...player}:null,details:false};
    document.getElementById('genericPanelContent').onclick=e=>{const b=e.target.closest('[data-profile-tab]');if(b)({settings:openSettings,troops:openTroopsOverview,leaderboard:openLeaderboard,skins:openSkins})[b.dataset.profileTab]?.();};
  };
  openTroopsOverview=function(){
    const stock=readyUnitStock();
    openPage('troops',`<section class="troops-full"><header><small>ارتش فرمانروایی</small><h2>${formatCompact(APP.army.troops)} نیروی آماده</h2><span>${formatCompact(APP.army.wounded)} مجروح · ${APP.marches.length}/${WORLD.marchSlots} لشکر فعال</span></header>${Object.entries(stock).filter(([,n])=>n>0).map(([id,n])=>`<button class="troop-full-card" data-unit="${id}"><img src="${TROOPS[id].image}" alt=""><span><small>${TROOPS[id].group==='attack'?'هجومی':'دفاعی'}</small><strong>${TROOPS[id].name}</strong><b>${formatCompact(n)} نیرو</b></span></button>`).join('')||'<p class="empty-page">هنوز نیروی آماده‌ای ندارید.</p>'}<div class="military-actions"><button data-facility="barracks">آموزش نیرو</button><button data-facility="hospital">درمان</button></div></section>`);bindMilitaryPage();
  };
  function rankedPlayers(metric){return [{id:'own',name:APP.playerName||'DreaM',power:APP.resources.power,kills:APP.kills,own:true,portrait:selectedAvatarSkin().portrait,avatar:selectedAvatarSkin().avatar},...APP.map.castles.filter(c=>!c.own)].filter(p=>Number.isFinite(p[metric])).sort((a,b)=>b[metric]-a[metric]||a.id.localeCompare(b.id));}
  function playerPortrait(p){return safeAssetPath(p?.portrait,safeAssetPath(p?.avatar,'assets/skins/portrait-01.webp'));}
  openLeaderboard=function(metric=null){
    if(metric&&!['power','kills','alliance'].includes(metric))metric=null;
    const alliances=APP.alliance?[{name:APP.alliance.name,logo:APP.alliance.logo||EMPIRES.find(e=>e.id===APP.alliance.empireId)?.image||'assets/empires/neutral.webp',power:APP.resources.power}]:[];
    const rank=metric&&metric!=='alliance'?rankedPlayers(metric):[];
    const category=(id,label)=>{const first=id==='alliance'?alliances[0]:rankedPlayers(id)[0];return `<button class="ranking-category" data-rank="${id}"><img src="${id==='alliance'?safeAssetPath(first?.logo,'assets/empires/neutral.webp'):playerPortrait(first)}" alt=""><span><small>${id==='alliance'?'پرچم اتحاد نخست':'فرمانروای رتبهٔ اول'}</small><strong>${label}</strong><b>${escapeHTML(first?.name||'هنوز ثبت نشده')}</b></span></button>`;};
    openPage('leaderboard',`<section class="rankings-full"><header><small>${TEST_SERVER.name}</small><h2>${metric?{power:'پادشاهان برتر قدرت',kills:'پادشاهان برتر کشتار',alliance:'اتحادهای برتر'}[metric]:'تالار افتخار'}</h2></header>${metric?`<button data-rank-back>همهٔ رتبه‌بندی‌ها</button>${metric==='alliance'?alliances.map((a,i)=>`<article class="ranking-row"><b>${i+1}</b><img src="${safeAssetPath(a.logo,'assets/empires/neutral.webp')}" alt=""><strong>${escapeHTML(a.name)}</strong><span>${formatCompact(a.power)}</span></article>`).join('')||'<p class="empty-page">اتحادی ثبت نشده است.</p>':rank.map((p,i)=>`<button class="ranking-row ${p.own?'own':''}" data-rank-player="${escapeHTML(p.id)}"><b>${i+1}</b><img src="${playerPortrait(p)}" alt=""><strong>${escapeHTML(p.name)}</strong><span>${formatCompact(p[metric])}</span></button>`).join('')}`:category('power','قدرت پادشاهان')+category('kills','کشتار پادشاهان')+category('alliance','قدرت اتحادها')}<small class="rank-note">رتبه‌بندی اطلاعات موجود در این نسخهٔ آفلاین</small></section>`);
    document.getElementById('genericPanelContent').onclick=e=>{const r=e.target.closest('[data-rank]');if(r)return openLeaderboard(r.dataset.rank);if(e.target.closest('[data-rank-back]'))return openLeaderboard();const p=e.target.closest('[data-rank-player]');if(p)openProfile(rank.find(x=>x.id===p.dataset.rankPlayer));};
  };
  const baseMessages=renderMessages;
  renderMessages=function(main=APP.messagesTab,report=APP.reportTab){
    const original=baseMessages(main,report);if(main!=='battle')return original;
    const cards=APP.battleReports.filter(r=>r.tab===report).map(r=>`<button class="battle-report-preview ${r.result==='پیروزی'?'victory':'defeat'}" data-battle-report="${escapeHTML(r.id)}"><img src="${safeAssetPath(r.defender?.image,'assets/enemies/ashen-host.webp')}" alt=""><span><small>${r.result==='پیروزی'?'پیروزی':'شکست'} در نبرد</small><strong>${r.result==='پیروزی'?'پیروزی بر':'شکست برابر'} ${escapeHTML(r.defender?.name||'سرگردان')} · سطح ${r.defender?.level||1}</strong><time>${escapeHTML(r.time||'')}</time><span class="preview-stats">اعزام ${formatCompact(r.sent||0)} · بازمانده ${formatCompact(Math.max(0,(r.sent||0)-(r.wounded||0)))} · مجروح ${formatCompact(r.wounded||0)}</span></span><b class="preview-arrow">‹</b></button>`).join('');
    return original.slice(0,original.indexOf('<div class="report-list">'))+`<div class="report-list">${cards||'<p class="empty-page">هنوز گزارشی ثبت نشده است.</p>'}</div>`;
  };
  openEnemySearch=function(){
    let selected=0;
    const last=type=>Math.max(1,Math.min(25,APP.enemyProgress[ENEMY_TYPES[type].id]||1));let level=last(selected);
    showGameDialog('ردیابی سرگردان',`<div class="enemy-search-types">${ENEMY_TYPES.map((t,i)=>`<button data-enemy-type="${i}" class="${i===0?'is-selected':''}"><img src="${t.image}" alt=""><strong>${t.name}</strong></button>`).join('')}</div><label class="enemy-search-level">درجه <button data-search-minus aria-label="کاهش درجه">−</button><input id="enemySearchLevel" type="range" min="1" max="25" value="${level}"><button data-search-plus aria-label="افزایش درجه">+</button><output id="enemySearchValue">${level}</output></label><p id="enemySearchHint"></p>`,[{label:'بستن',run:closeGameDialog},{label:'نزدیک‌ترین سرگردان',primary:true,run:()=>{const enemy=nearestEnemy(selected,level);if(!enemy)return showBuildNotice('این درجه فعلاً در نقشه موجود نیست.');APP.map.camera.zoom=1.75;centerMapOn(enemy.q,enemy.r);closeGameDialog();openEnemy(enemy);}}]);
    const content=document.getElementById('gameDialogContent'),range=document.getElementById('enemySearchLevel');
    const update=()=>{range.value=level;document.getElementById('enemySearchValue').textContent=level;document.getElementById('enemySearchHint').textContent=enemyUnlocked(selected,level)?'این درجه برای حمله باز است.':'ابتدا درجهٔ قبلی همین جناح را شکست دهید.';};
    content.onclick=e=>{const b=e.target.closest('[data-enemy-type]');if(b){selected=Number(b.dataset.enemyType);level=last(selected);content.querySelectorAll('[data-enemy-type]').forEach(x=>x.classList.toggle('is-selected',x===b));}else if(e.target.closest('[data-search-minus]'))level=Math.max(1,level-1);else if(e.target.closest('[data-search-plus]'))level=Math.min(25,level+1);else return;update();};
    content.oninput=e=>{if(e.target.id==='enemySearchLevel'){level=boundedInteger(Number(e.target.value),1,1,25);update();}};update();
  };
  const baseEnemy=openEnemy;
  openEnemy=function(enemy){
    document.getElementById('enemyBackdrop')?.remove();baseEnemy(enemy);
    const sheet=document.getElementById('enemySheet');if(!sheet)return;
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
    const backdrop=document.createElement('div');backdrop.id='enemyBackdrop';backdrop.className='enemy-backdrop';
    const close=()=>{sheet.remove();backdrop.remove();};backdrop.onclick=close;backdrop.addEventListener('pointerdown',e=>e.stopPropagation());sheet.querySelector('.enemy-close').onclick=close;
    document.getElementById('worldMapLayer').appendChild(backdrop);
  };
  const baseUpdateHud=updateTopHud;
  updateTopHud=function(){baseUpdateHud();if(APP.shieldUntil>Date.now())document.getElementById('shieldButton')?.classList.add('protection-active');else document.getElementById('shieldButton')?.classList.remove('protection-active');};
  // Low zoom uses bounded vector-style terrain buffers, not the full atlas at every touch move.
  let cartographyCache=null;
  function drawCartography(ctx,w,h,z){
    const cam=APP.map.camera,pad=180,halfW=w/(2*z),halfH=h/(2*z),bounds={left:cam.x-halfW,top:cam.y-halfH,right:cam.x+halfW,bottom:cam.y+halfH};
    const key=`${w}:${h}:${APP.eventEmpire||''}`;
    if(!cartographyCache||cartographyCache.key!==key||bounds.left<cartographyCache.left||bounds.top<cartographyCache.top||bounds.right>cartographyCache.right||bounds.bottom>cartographyCache.bottom){
      const left=Math.floor((bounds.left-pad)/128)*128,top=Math.floor((bounds.top-pad)/128)*128,right=Math.ceil((bounds.right+pad)/128)*128,bottom=Math.ceil((bounds.bottom+pad)/128)*128;
      const buffer=document.createElement('canvas');buffer.width=Math.ceil(right-left);buffer.height=Math.ceil(bottom-top);const c=buffer.getContext('2d',{alpha:false});c.fillStyle='#518796';c.fillRect(0,0,buffer.width,buffer.height);
      const points=[[left,top],[right,top],[left,bottom],[right,bottom]].map(([x,y])=>mapWorldToAxial(x,y));
      const q0=Math.max(1,Math.min(...points.map(p=>p.q))-3),q1=Math.min(800,Math.max(...points.map(p=>p.q))+3),r0=Math.max(1,Math.min(...points.map(p=>p.r))-3),r1=Math.min(800,Math.max(...points.map(p=>p.r))+3),size=APP.map.hexSize;
      const colors={grass:'#91a776',forest:'#678562',desert:'#c4b185',highland:'#a5aa8a',mountain:'#92998b',water:'#659aa7',tower:'#c8bba0'};
      for(let r=r0;r<=r1;r++)for(let q=q0;q<=q1;q++){
        const [wx,wy]=mapCenter(q,r),x=wx-left,y=wy-top;if(x<-size||y<-size||x>buffer.width+size||y>buffer.height+size)continue;
        const t=terrainAt(q,r),empire=empireAt(q,r);mapHexPath(c,x,y,size+.5);c.fillStyle=colors[t.kind]||'#91a776';c.fill();
        if(empire){c.globalAlpha=.12;c.fillStyle=empire.color;c.fill();c.globalAlpha=1;}
        if(t.kind==='mountain'){c.beginPath();c.moveTo(x-size*.7,y+size*.4);c.lineTo(x,y-size*.6);c.lineTo(x+size*.7,y+size*.4);c.closePath();c.fillStyle='#6b7b72';c.fill();}
        if(t.kind==='forest'){c.fillStyle='#426950';c.beginPath();c.arc(x,y,size*.32,0,Math.PI*2);c.fill();}
        if(empire){const aq=q-Math.floor(r/2);for(const [i,[dq,dr]] of [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].entries()){const rr=r+dr,qq=aq+dq+Math.floor(rr/2);if(empireAt(qq,rr)?.id!==empire.id){const a=(i*60-30)*Math.PI/180,b=(i*60+30)*Math.PI/180;c.strokeStyle=empire.color;c.lineWidth=1.2;c.beginPath();c.moveTo(x+size*Math.cos(a),y+size*Math.sin(a));c.lineTo(x+size*Math.cos(b),y+size*Math.sin(b));c.stroke();}}}
      }
      cartographyCache={key,buffer,left,top,right,bottom};
    }
    const b=cartographyCache;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(b.buffer,w/2+(b.left-cam.x)*z,h/2+(b.top-cam.y)*z,(b.right-b.left)*z,(b.bottom-b.top)*z);
    drawCaptureTower(ctx);drawEmpireCrests(ctx);for(const castle of APP.map.castles)drawMapCastle(ctx,castle);positionMapActions();renderMarchRoutes();
  }
  function marchVisibleTo(m,viewer='self'){return (m.ownerId||'self')===viewer||m.type==='attack'&&(m.targetPlayerId||m.target?.castleId)===viewer;}
  function decorateMarchCombat(node,m,now){
    const fighting=m.phase==='waiting'&&!!m.enemyId&&now<m.returnAt;
    node.g.classList.toggle('march-fighting',fighting);
    if(!node.battle&&fighting){
      const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g'),enemy=document.createElementNS(ns,'image');enemy.setAttribute('href',ENEMY_TYPES[m.enemyType]?.image||ENEMY_TYPES[0].image);enemy.setAttribute('class','battle-opponent');g.appendChild(enemy);
      for(let i=0;i<3;i++){const slash=document.createElementNS(ns,'path');slash.setAttribute('d',`M${-6+i*5} -8 L${7+i*5} 7 M${6+i*5} -8 L${-7+i*5} 7`);slash.setAttribute('class',`battle-spark spark-${i}`);g.appendChild(slash);}node.g.appendChild(g);node.battle=g;node.opponent=enemy;
    }
    if(node.battle){node.battle.style.display=fighting?'block':'none';const size=25*APP.map.camera.zoom;node.opponent.setAttribute('x',size*.05);node.opponent.setAttribute('y',-size*.8);node.opponent.setAttribute('width',size);node.opponent.setAttribute('height',size);}
    if(fighting){const size=30*APP.map.camera.zoom;node.soldier.setAttribute('x',-size);node.soldier.setAttribute('y',-size*.6);}
  }
  openMarchSpeed=function(id){
    const m=APP.marches.find(m=>m.id===id&&m.phase!=='waiting');if(!m)return showBuildNotice('لشکر در حال حرکت نیست.');
    showGameDialog('تسریع حرکت',`<p>آیتم، درصدی از زمان باقی‌ماندهٔ حرکت را کم می‌کند.</p><div class="march-speed-grid">${INVENTORY.filter(i=>i.id.startsWith('march-speed-')&&i.count>0).map(i=>`<button data-march-speed-item="${i.id}"><img src="${i.image}" alt=""><strong>${i.name}</strong><small>×${formatCompact(i.count)}</small></button>`).join('')||'<p>تسریع حرکت در موجودی ندارید.</p>'}</div>`,[{label:'بستن',run:closeGameDialog}]);
    document.getElementById('gameDialogContent').onclick=async e=>{const b=e.target.closest('[data-march-speed-item]');if(!b)return;const item=INVENTORY.find(i=>i.id===b.dataset.marchSpeedItem);if(!item?.count||!await gameConfirm(`استفاده از ${item.name}؟`))return;
      const current=APP.marches.find(a=>a.id===id&&a.phase!=='waiting'&&a.arriveAt>Date.now());if(!current||!item.count)return;
      const now=Date.now(),p=marchProgress(current,now),remaining=(current.arriveAt-now)*(1-item.value),duration=remaining/Math.max(.0001,1-p);current.startedAt=now-p*duration;current.arriveAt=now+remaining;item.count--;saveGameProgress();renderMarchQueue(true);openMarchActions(current);
    };
  };
  function tutorialBeaconVisible(){return APP.tutorial.active&&tutorialTargetId()&&APP.currentMode==='territory'&&!APP.openPage&&!APP.worker.task&&!document.getElementById('buildingPanel')?.classList.contains('is-active');}
  function drawTutorialBeacon(ctx,b,box){
    if(!tutorialBeaconVisible()||b.id!==tutorialTargetId())return;
    const wave=.5+.5*Math.sin(performance.now()/330),x=box.x+box.width/2,y=box.y+box.height*.92;
    ctx.save();ctx.lineWidth=1.4/state.camera.zoom;ctx.strokeStyle=`rgba(236,218,163,${.4+wave*.3})`;ctx.fillStyle=`rgba(230,217,167,${.05+wave*.04})`;ctx.beginPath();ctx.ellipse(x,y,box.width*.43+wave*3,box.width*.15+wave,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    const arrowY=box.y-12/state.camera.zoom-wave*3/state.camera.zoom;ctx.beginPath();ctx.moveTo(x-5/state.camera.zoom,arrowY);ctx.lineTo(x,arrowY+5/state.camera.zoom);ctx.lineTo(x+5/state.camera.zoom,arrowY);ctx.stroke();ctx.restore();
  }
  function startTutorialBeacon(){
    if(state.guideRaf||!tutorialBeaconVisible())return;
    let last=0;
    const frame=time=>{state.guideRaf=0;if(!tutorialBeaconVisible())return;if(time-last>=50){drawWorld();last=time;}state.guideRaf=requestAnimationFrame(frame);};state.guideRaf=requestAnimationFrame(frame);
  }
