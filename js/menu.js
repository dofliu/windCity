// 風場大亨 — 關卡選單、過關紀錄
'use strict';
const PROG_KEY='windcity:progress';
let PROGRESS={};
function loadProgress(){try{PROGRESS=JSON.parse(localStorage.getItem(PROG_KEY)||'{}')||{}}catch(e){PROGRESS={}}}
function saveProgress(){try{localStorage.setItem(PROG_KEY,JSON.stringify(PROGRESS))}catch(e){}}
// 關卡結束時記錄最佳成績
function recordResult(){
  if(!S||S.sbx||S._backdrop)return;
  const {grade,stars}=gradeOf(),prev=PROGRESS[LV.id];
  if(!prev||stars>prev.stars||(stars===prev.stars&&'FDCBAS'.indexOf(grade)>'FDCBAS'.indexOf(prev.grade)))PROGRESS[LV.id]={stars,grade,at:Date.now()};
  saveProgress();
}
// 關卡是否開放：管理員設定 open / closed / seq（上一關拿到至少一顆星後開放）
function levelState(L){
  const st=(ADMIN.cfg.levels||{})[L.id]||(L.no<=1?'open':'seq');
  if(st==='open')return {open:true};
  if(st==='closed')return {open:false,why:$t`管理員尚未開放`};
  const prev=LEVELS.find(l=>l.no===L.no-1&&!l.sandbox);
  if(!prev)return {open:true};
  const pr=PROGRESS[prev.id];
  return pr&&pr.stars>0?{open:true}:{open:false,why:$t`完成「${prev.name}」後開放`};
}
const levelOpen=L=>levelState(L).open;

// ---------- 縮圖：用真正的地圖生成器畫一張小地圖 ----------
const THUMBS={};
const THUMB_COL={grass:'#6faa48',farm:'#cbb75a',forest:'#2f6b3c',sand:'#e2cf98',rock:'#9a9a8c',shallow:'#47b6c6',deep:'#2479a4'};
function levelThumb(L){
  if(THUMBS[L.id])return THUMBS[L.id];
  const keep={S,N,NP,LV,byId,TURBS,FACS,GRID};
  const cvs=document.createElement('canvas');cvs.width=360;cvs.height=190;
  try{
    newState(L.id);
    const c=cvs.getContext('2d'),w=N*TW,h=N*TH+6*HZ,sc=Math.min(340/w,176/h);
    c.translate(180,8+5*HZ*sc);c.scale(sc,sc);
    for(let s=0;s<2*N-1;s++)for(let i=Math.max(0,s-N+1);i<=Math.min(N-1,s);i++){
      const t=tile(i,s-i),e=elev(t);
      const r=tile(i+1,s-i),l=tile(i,s-i+1),er=r?elev(r):-2.5,el=l?elev(l):-2.5;
      if(el<e)poly(c,[iso(i,s-i+1,e),iso(i+1,s-i+1,e),iso(i+1,s-i+1,el),iso(i,s-i+1,el)],isWater(t)?'#2a8aa0':'#8e6a47');
      if(er<e)poly(c,[iso(i+1,s-i,e),iso(i+1,s-i+1,e),iso(i+1,s-i+1,er),iso(i+1,s-i,er)],isWater(t)?'#1f6f84':'#6f5237');
      topPath(c,i,s-i,e);c.fillStyle=t.road?'#6b7076':t.house?'#d9a07a':THUMB_COL[t.t];c.fill();
      if(t.t!=='deep'&&t.t!=='shallow'){c.fillStyle=`rgba(255,255,255,${(t.h-1)*.05})`;c.fill()}
    }
    for(const p of S.parcels)if(p.owned){c.lineWidth=2.5/sc*.6;parcelOutline(c,p,'rgba(255,214,90,.95)',3,null)}
    for(const o of S.objs){const p=iso(o.i+.5,o.j+.5,elev(tile(o.i,o.j)));c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0],p[1]-40);c.stroke()}
  }finally{S=keep.S;N=keep.N;NP=keep.NP;LV=keep.LV;byId=keep.byId;TURBS=keep.TURBS;FACS=keep.FACS;GRID=keep.GRID}
  THUMBS[L.id]=cvs.toDataURL();return THUMBS[L.id];
}

// ---------- 關卡選單畫面 ----------
function showLevels(){
  closeModal();tutStop();
  const el=$('#levels');
  const card=L=>{
    const st=levelState(L),pr=PROGRESS[L.id],sv=loadSave(L.id),stars=pr?pr.stars:0;
    const goals=(L.goals||[]).map(g=>`<span>${GOAL_DEF[g.k].name} ${g.t}${GOAL_DEF[g.k].unit==='%'?'%':' '+GOAL_DEF[g.k].unit}</span>`).join('');
    return `<article class="lv ${st.open?'':'locked'} ${L.sandbox?'sbx':''}" data-id="${L.id}">
      <div class="lv-map"><img src="${levelThumb(L)}" alt="${$t`${L.name}地圖縮圖`}">${st.open?'':`<div class="lv-lock">${ic('i-lock')}<span>${st.why}</span></div>`}</div>
      <div class="lv-body">
        <div class="lv-top"><span class="lv-no">${L.sandbox?$t`測試`:L.tutorial?$t`導引`:$t`第 ${L.no} 關`}</span><span class="pill info">${L.tag}</span>
          ${L.sandbox||L.tutorial?(L.tutorial&&pr?`<span class="pill good" style="margin-left:auto">${$t`已完成`}</span>`:''):`<span class="lv-stars" aria-label="${$t`${stars} 顆星`}">${[0,1,2].map(k=>`<svg class="ic ${k<stars?'on':''}"><use href="#i-star"/></svg>`).join('')}</span>`}</div>
        <h3>${L.name}</h3>
        <p>${L.desc}</p>
        ${goals?`<div class="lv-goals">${goals}</div>`:''}
        <div class="lv-meta">${L.tutorial?$t`約 3 分鐘・跟著提示操作`:L.sandbox?$t`不限回合・資金無限`:$t`${L.turns} 季・難度 ${'●'.repeat(L.diff)}${'○'.repeat(5-L.diff)}`}${pr?$t`・最佳 ${pr.grade}`:''}</div>
        <div class="lv-act">${st.open?(sv&&!sv.over&&!L.tutorial?`<button class="btn" data-new="${L.id}">${$t`重新開始`}</button><button class="btn pri" data-go="${L.id}">${$t`繼續 ${dateLabel(sv.turn)}`}</button>`:`<button class="btn pri" data-new="${L.id}">${pr?$t`再玩一次`:$t`開始`}</button>`):`<button class="btn" disabled>${$t`尚未開放`}</button>`}</div>
      </div></article>`;
  };
  el.innerHTML=`<div class="lv-wrap">
    <header class="lv-head"><div class="logo">${ic('i-turbine')}</div><div><h1>${$t`風場大亨`}</h1><p>${$t`選擇關卡・每一關一個新的風場課題`}</p></div>
      <button class="btn" id="lvLang" data-silent="1">${LANG==='en'?$raw`中文`:'English'}</button>${ADMIN.visible?`<button class="btn" id="lvAdm">${$t`${ic('i-wrench')}管理介面`}</button>`:''}${S&&!S._backdrop?`<button class="btn" id="lvBack">${$t`${ic('i-arrow')}回到 ${LV.name}`}</button>`:''}</header>
    <div class="lv-grid">${LEVELS.map(card).join('')}</div>
    <p class="lv-foot">${$t`${ADMIN.source==='shared'?$t`關卡開放設定由管理員統一管理。`:$t`關卡開放設定與過關紀錄存在這個瀏覽器。`}過關＝評等 C 以上（至少一顆星）。`}</p>
  </div>`;
  $('#lvLang').onclick=()=>setLang(LANG==='en'?'zh':'en');
  el.hidden=false;modalOpen=true;
  for(const b of el.querySelectorAll('[data-go]'))b.onclick=()=>startLevel(b.dataset.go,false);
  for(const b of el.querySelectorAll('[data-new]'))b.onclick=()=>startLevel(b.dataset.new,true);
  const a=$('#lvAdm');if(a)a.onclick=()=>showAdmin();
  const bk=$('#lvBack');if(bk)bk.onclick=hideLevels;
}
function hideLevels(){$('#levels').hidden=true;modalOpen=false}
const levelsOpen=()=>!$('#levels').hidden;
