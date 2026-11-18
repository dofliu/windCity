// 風場大亨 — 存檔與啟動
'use strict';
// ================= persistence & boot =================
const KEY='windfarm-tycoon-v1';
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function load(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null}catch(e){return null}}
function startNew(seed){
  S=newState(seed);selected=null;preview=null;tool='inspect';cat='inspect';weatherFx='clear';
  for(const b of document.querySelectorAll('.cat'))b.setAttribute('aria-pressed',String(b.dataset.cat==='inspect'));
  setOverlay(null);autoOverlay=false;
  reindex();buildCache();rebuildDrawables();centerOnOwned(true);$('#insp').hidden=true;$('#confirm').hidden=true;updateHUD();save();
}
function wire(){
  for(const b of document.querySelectorAll('.cat'))b.onclick=()=>setCat(b.dataset.cat);
  for(const b of document.querySelectorAll('.lay'))b.onclick=()=>{autoOverlay=false;setOverlay(overlay===b.dataset.ov?null:b.dataset.ov)};
  $('#next').onclick=endTurn;
  $('#bMarket').onclick=showMarket;$('#bGoals').onclick=showGoals;$('#bMenu').onclick=showMenu;
  $('#zIn').onclick=()=>zoomBy(1.25);$('#zOut').onclick=()=>zoomBy(.8);$('#zHome').onclick=()=>centerOnOwned(true);
  $('#kpiHead').onclick=()=>{kpiCollapsed=!kpiCollapsed;$('#kpi').classList.toggle('collapsed',kpiCollapsed);if(!kpiCollapsed)drawSpark()};
  window.addEventListener('resize',()=>{resize();drawSpark()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modalOpen)return;if(preview)cancelPreview();else setCat('inspect')}});
}
function start(data){
  resize();initSprites();wire();
  if(W<700){kpiCollapsed=true;$('#kpi').classList.add('collapsed')}
  const saved=(data&&data.S)||load();
  if(saved&&saved.ver===1&&saved.tiles&&saved.tiles.length===N*N){S=saved;reindex();buildCache();rebuildDrawables();centerOnOwned(true);updateHUD();if(!(data&&data.S))showIntro(true)}
  else{startNew(20271);showIntro(false)}
  requestAnimationFrame(frame);
}
window.__wft={get S(){return S},build:(k,i,j)=>build(k,tile(i,j)),endTurn,market,tile,research,buy:(px,py)=>buyParcel(S.parcels[py*NP+px]),cam,
  check,est:estAnnual,wake:wakeAnnual,parcelPrice,credit,installedMW,crewBusy,steelCap,bladeCap,clampCam,
  get turbs(){return TURBS},get grid(){return GRID},get modalOpen(){return modalOpen},
  screenOf:(i,j)=>{const t=tile(i,j),p=iso(i+.5,j+.5,elev(t));return [(p[0]-cam.x)*cam.z+W/2,(p[1]-cam.y)*cam.z+H/2]},
  worldOf:(i,j)=>{const t=tile(i,j);return iso(i+.5,j+.5,elev(t))}};
try{window.claude?.hot?.snapshot?.(()=>({S}))}catch(e){}
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
