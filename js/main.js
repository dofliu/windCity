// 風場大亨 — 存檔與啟動
'use strict';
// ================= persistence & boot =================
// 每一關各自存檔：windcity:save:<關卡 id>；最後玩的關卡：windcity:last
const SAVE_PREFIX='windcity:save:', LAST_KEY='windcity:last', OLD_KEY='windfarm-tycoon-v1';
function save(){if(!S||S._backdrop)return;try{localStorage.setItem(SAVE_PREFIX+S.level,JSON.stringify(S));localStorage.setItem(LAST_KEY,S.level)}catch(e){}}
function clearSave(id){try{localStorage.removeItem(SAVE_PREFIX+id)}catch(e){}}
function loadSave(id){
  try{const s=JSON.parse(localStorage.getItem(SAVE_PREFIX+id)||'null');if(s&&s.ver===2&&s.level===id&&s.tiles&&s.tiles.length===s.N*s.N)return s}catch(e){}
  if(id==='coast'){ // 舊版單一存檔轉成第 1 關
    try{const o=JSON.parse(localStorage.getItem(OLD_KEY)||'null');if(o&&o.ver===1&&o.tiles&&o.tiles.length===576)return Object.assign(o,{ver:2,level:'coast',N:24,vessels:0,sbx:null,tech:Object.assign({tech15:false},o.tech)})}catch(e){}
  }
  return null;
}
// 把一個狀態放上舞台
function enterState(st){
  tutStop();cineAbort();
  setLevel(st.level);S=st;
  selected=null;preview=null;tool='inspect';cat='inspect';weatherFx='clear';
  for(const b of document.querySelectorAll('.cat'))b.setAttribute('aria-pressed',String(b.dataset.cat==='inspect'));
  setOverlay(null);autoOverlay=false;
  reindex();buildCache();rebuildDrawables();centerOnOwned(true);INTRO_T=time;
  $('#insp').hidden=true;$('#confirm').hidden=true;$('#tray').hidden=true;$('#tray').dataset.cat='';
  updateHUD();
}
function startLevel(id,fresh){
  const L=LEVEL_BY_ID[id];if(!L||!levelOpen(L)){toast('這一關尚未開放','bad');return}
  hideLevels();closeModal();
  if(fresh||L.tutorial)clearSave(id);
  const sv=fresh||L.tutorial?null:loadSave(id);
  if(sv){enterState(sv);if(S.over)showFinal()}
  else{enterState(newState(id));save();if(L.tutorial)tutStart();else showBrief(false)}
  sfx('start');
}
function wire(){
  for(const b of document.querySelectorAll('.cat'))b.onclick=()=>setCat(b.dataset.cat);
  for(const b of document.querySelectorAll('.lay'))b.onclick=()=>{autoOverlay=false;setOverlay(overlay===b.dataset.ov?null:b.dataset.ov)};
  $('#next').onclick=endTurn;
  $('#bMarket').onclick=showMarket;$('#bGoals').onclick=showGoals;$('#bMenu').onclick=showMenu;
  $('#bSound').onclick=()=>{audioStart();SETTINGS.mute=!SETTINGS.mute;saveSettings();applyVolumes();soundIcon()};soundIcon();
  $('#zIn').onclick=()=>zoomBy(1.25);$('#zOut').onclick=()=>zoomBy(.8);$('#zHome').onclick=()=>centerOnOwned(true);
  $('#kpiHead').onclick=()=>{kpiCollapsed=!kpiCollapsed;$('#kpi').classList.toggle('collapsed',kpiCollapsed);if(!kpiCollapsed)drawSpark()};
  window.addEventListener('resize',()=>{resize();drawSpark()});
  window.addEventListener('keydown',e=>{if(CINE.on&&(e.key==='Escape'||e.key===' ')){cineEnd();return}if(e.key==='Escape'){if(modalOpen)return;if(preview)cancelPreview();else setCat('inspect')}});
}
function start(data){
  resize();initSprites();wire();loadProgress();adminInit();audioArm();
  if(W<700){kpiCollapsed=true;$('#kpi').classList.add('collapsed')}
  if(data&&data.S&&data.S.ver===2){enterState(data.S);requestAnimationFrame(frame);return}
  let last=null;try{last=localStorage.getItem(LAST_KEY)}catch(e){}
  const sv=last&&LEVEL_BY_ID[last]&&loadSave(last);
  if(sv)enterState(sv);
  else{const st=newState('coast');st._backdrop=true;enterState(st)}
  // 第一次來玩：直接進入新手導引
  if(!sv&&!tutDone()&&!Object.keys(PROGRESS).length)startLevel('tutorial',true);
  else showLevels();
  requestAnimationFrame(frame);
}
window.__wft={get S(){return S},get LV(){return LV},build:(k,i,j)=>build(k,tile(i,j)),endTurn,market,tile,research,buy:(px,py)=>buyParcel(S.parcels[py*NP+px]),cam,
  startLevel,enterState,newState,showLevels,levelThumb,adminSave,get ADMIN(){return ADMIN},get PROGRESS(){return PROGRESS},sbxFill,sbxBulk,
  check,est:estAnnual,wake:wakeAnnual,parcelPrice,credit,installedMW,crewBusy,vesselBusy,vesselCap,steelCap,bladeCap,clampCam,cableCost,gradeOf,evalGoals,
  get turbs(){return TURBS},get grid(){return GRID},get modalOpen(){return modalOpen},
  screenOf:(i,j)=>{const t=tile(i,j),p=iso(i+.5,j+.5,elev(t));return [(p[0]-cam.x)*cam.z+W/2,(p[1]-cam.y)*cam.z+H/2]},
  worldOf:(i,j)=>{const t=tile(i,j);return iso(i+.5,j+.5,elev(t))}};
try{window.claude?.hot?.snapshot?.(()=>({S}))}catch(e){}
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
