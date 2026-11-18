// 風場大亨 — 遊戲狀態、地圖生成、物理模型、規則與玩家動作
'use strict';
// ================= state =================
let S=null;
let byId=new Map(), TURBS=[], FACS=[], GRID=null, validMap=null;
let tool='inspect', cat='inspect', overlay=null, autoOverlay=false, preview=null, hover=null, selected=null;
let weatherFx='clear', modalOpen=false, kpiCollapsed=false;
const isWater=t=>t.t==='shallow'||t.t==='deep';
const elev=t=>isWater(t)?-.35:t.h;
const tile=(i,j)=>(i>=0&&j>=0&&i<N&&j<N)?S.tiles[i+j*N]:null;
const parcelAt=(i,j)=>S.parcels[Math.floor(j/PS)*NP+Math.floor(i/PS)];
const parcelName=p=>'ABCD'[p.px]+(p.py+1);
const objOf=t=>t&&t.o?byId.get(t.o):null;
const facsOf=k=>FACS.filter(f=>f.kind===k);
const installedMW=()=>TURBS.reduce((s,o)=>s+(o.state!=='build'?MODELS[o.model].mw:0),0);
const pipelineMW=()=>TURBS.reduce((s,o)=>s+(o.state==='build'?MODELS[o.model].mw:0),0);
const steelCap=()=>400+500*facsOf('ware').length;
const bladeCap=()=>8+10*facsOf('ware').length;
const credit=()=>Math.round(250+3*installedMW());
const tariff=()=>S.tariffBase+S.tmods.reduce((s,m)=>s+m.d,0);
const crewBusy=()=>TURBS.filter(o=>o.state==='build').length;
const tname=o=>o.type==='turb'?`WTG-${String(o.id).padStart(2,'0')}`:FAC[o.kind].name;
const shear=m=>Math.pow(m.hubM/100,.14);
const season=()=>SEASONS[S.turn%4];
const flowNow=()=>season().dir;
const dateLabel=t=>`${START_YEAR+Math.floor(t/4)} ${SEASONS[t%4].q}`;
const fmt=(n,d=1)=>Number(n).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
const techCost=k=>Math.round(TECH[k].cost*(S.flags.techDisc?.6:1));

function chebNear(i,j,r,fn){for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(!di&&!dj)continue;const t=tile(i+di,j+dj);if(t&&fn(t))return true}return false}
const houseNear=(i,j,r)=>chebNear(i,j,r,t=>t.house>0);
const nearRoad=(i,j,r)=>chebNear(i,j,r,t=>t.road);
const turbNear=(i,j)=>chebNear(i,j,1,t=>{const o=objOf(t);return o&&o.type==='turb'});
const omNear=o=>facsOf('om').some(f=>Math.hypot(f.i-o.i,f.j-o.j)<=FAC.om.range);

// ================= map generation =================
function genMap(S){
  const R=mulberry32(S.seed), nz=makeNoise(R), ph=R()*10;
  const T=[];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const cv=j-16.4-(nz(i/4.5,7.3)-.5)*6+(i-12)*.2;
    let t,h;
    if(cv>2.4){t='deep';h=0}else if(cv>.6){t='shallow';h=0}else if(cv>-.9){t='sand';h=1}
    else{
      const e=nz(i/6+40,j/6+40), ridge=Math.max(0,i-j-2)/6.5;
      h=clamp(Math.floor(1+e*1.8+ridge),1,4);
      const m=nz(i/4+90,j/4+90)+(h>=3?.1:0);
      t=(h===4&&e>.55)?'rock':m>.6?'forest':(m<.42&&h<=2)?'farm':'grass';
    }
    T.push({i,j,t,h,v:R(),wind:0,sv:false,road:false,o:0,house:0,tree:t==='forest'?1:0});
  }
  S.tiles=T;
  // smooth terraces so no cliff is higher than one level
  for(let pass=0;pass<3;pass++)for(const t of T){if(isWater(t))continue;let mn=9;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=tile(t.i+a,t.j+b);if(n&&!isWater(n))mn=Math.min(mn,n.h)}if(mn<9&&t.h>mn+1)t.h=mn+1}
  const setRoad=(i,j)=>{const t=tile(i,j);if(!t||isWater(t))return;t.road=true;t.tree=0;t.house=0;if(t.t==='forest')t.t='grass'};
  const jr=i=>10+Math.round(Math.sin(i/3.6+ph)*1.3);
  let pj=jr(0);
  for(let i=0;i<N;i++){const j=jr(i);for(let k=Math.min(pj,j);k<=Math.max(pj,j);k++)setRoad(i,k);pj=j}
  for(const[vi,vj]of[[4,6],[18,4]]){
    for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const t=tile(vi+di,vj+dj);if(!t||isWater(t)||t.road)continue;if((di||dj)&&R()>.55)continue;t.house=1+Math.floor(R()*4);t.tree=0;if(t.t==='forest'||t.t==='rock')t.t='grass'}
    for(let j=vj+1;j<jr(vi);j++)setRoad(vi,j);
  }
  // a few scattered farmhouses outside the starting land
  let placed=0,guard=0;
  while(placed<4&&guard++<200){const i=Math.floor(R()*N),j=Math.floor(R()*N);const t=tile(i,j);const py=Math.floor(j/PS),px=Math.floor(i/PS);if(isWater(t)||t.road||t.house||t.t==='rock'||(py===2&&(px===1||px===2)))continue;if(!nearRoad(i,j,3))continue;t.house=1+Math.floor(R()*4);t.tree=0;if(t.t==='forest')t.t='grass';placed++}
  for(const t of T){if(t.house||t.road)continue;if(t.t==='grass'&&R()<.1)t.tree=2;if(t.t==='sand'&&R()<.32)t.tree=3}
  S.parcels=[];for(let py=0;py<NP;py++)for(let px=0;px<NP;px++)S.parcels.push({px,py,owned:py===2&&(px===1||px===2)});
  // wind resource: coastal speed-up, terrain lift, forest roughness
  const dist=new Array(N*N).fill(99),q=[];
  T.forEach((t,k)=>{if(isWater(t)){dist[k]=0;q.push(k)}});
  while(q.length){const k=q.shift(),i=k%N,j=(k/N)|0;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=N||jj>=N)continue;const n=ii+jj*N;if(dist[n]>dist[k]+1){dist[n]=dist[k]+1;q.push(n)}}}
  T.forEach((t,k)=>{
    const nn=nz(t.i/3+200,t.j/3+200)-.5;let w;
    if(t.t==='deep')w=9.3+nn*.8;else if(t.t==='shallow')w=8.8+nn*.8;
    else{w=6.0+2.4*Math.exp(-(dist[k]-1)/3.2)+.45*(t.h-1)+nn*1.2;let fc=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const n=tile(t.i+di,t.j+dj);if(n&&n.t==='forest')fc++}w-=fc*.06}
    t.wind=Math.round(clamp(w,4.5,10.5)*10)/10;
  });
  for(const p of S.parcels)if(p.owned)surveyParcel(p);
}
function surveyParcel(p){for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++)tile(i,j).sv=true}
function survey(ci,cj,r){for(const t of S.tiles)if(Math.hypot(t.i-ci,t.j-cj)<=r)t.sv=true}
function parcelPrice(p){
  let s=0;
  for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++){const t=tile(i,j);if(t.t==='deep')s+=.4;else if(t.t==='shallow')s+=1.5;else s+=1+Math.max(0,t.wind-6)*.5-(t.house?.5:0)}
  return Math.round(s*1.15*(1+(60-S.support)/120));
}

function newState(seed){
  const st={ver:1,seed,turn:0,cash:480,steel:180,blades:4,crews:2,support:62,price:{steel:.11,blade:6.5},tariffBase:4.2,tmods:[],policy:1,tech:{tech6:false,tech10:false},tiles:[],parcels:[],objs:[],nid:1,hist:[],flags:{},over:false};
  S=st;genMap(st);return st;
}

// ================= derived =================
function reindex(){
  byId=new Map(S.objs.map(o=>[o.id,o]));
  TURBS=S.objs.filter(o=>o.type==='turb');FACS=S.objs.filter(o=>o.type==='fac');
  for(const t of S.tiles)t.o=0;
  for(const o of S.objs)tile(o.i,o.j).o=o.id;
  GRID=gridAssign();
  for(const o of TURBS){const f=GRID.fac.get(o);o.conn=!!GRID.asg.get(o);o.over=GRID.asg.get(o)&&f<1}
  validMap=null;
}
function gridAssign(){
  const subs=facsOf('sub'),asg=new Map(),load=new Map(),fac=new Map();
  for(const o of TURBS){let best=null,bd=1e9;for(const s of subs){const d=Math.hypot(o.i-s.i,o.j-s.j);if(d<=FAC.sub.range&&d<bd){bd=d;best=s}}asg.set(o,best);if(best&&o.state!=='build')load.set(best,(load.get(best)||0)+MODELS[o.model].mw)}
  for(const o of TURBS){const s=asg.get(o);if(!s)fac.set(o,0);else{const L=load.get(s)||0;fac.set(o,L>FAC.sub.cap?FAC.sub.cap/L:1)}}
  return {asg,fac,load};
}

// ================= physics =================
function powerFrac(v,vr){if(v<3||v>25)return 0;if(v>=vr)return 1;return (v**3-27)/(vr**3-27)}
function cfFor(vm,vr){if(vm<=.1)return 0;let s=0;for(let v=.125;v<30;v+=.25){const f=(Math.PI*v/(2*vm*vm))*Math.exp(-Math.PI*v*v/(4*vm*vm));s+=f*powerFrac(v,vr)*.25}return s}
const CF={};for(const k in MODELS){const a=[];for(let s=0;s<=161;s++)a.push(cfFor(s/10,MODELS[k].vr));CF[k]=a}
function cf(k,v){const x=clamp(v*10,0,160),i=Math.floor(x),f=x-i,a=CF[k];return a[i]+(a[i+1]-a[i])*f}
function wakeLoss(i,j,f,self,all){
  let s2=0;
  for(const o of TURBS){
    if(o===self||(o.i===i&&o.j===j))continue;if(!all&&o.state==='build')continue;
    const m=MODELS[o.model],R=m.rd/2,dx=i-o.i,dy=j-o.j,al=dx*f[0]+dy*f[1];
    if(al<=.3||al>14)continue;
    const lat=Math.abs(dx*f[1]-dy*f[0]),sig=R*.8+.18*al,g=Math.exp(-.5*(lat/sig)**2);
    if(g<.02)continue;
    const d=.34/((1+.11*al/R)**2)*g;s2+=d*d;
  }
  const dv=Math.min(.6,Math.sqrt(s2));
  return Math.min(.6,(1-(1-dv)**3)*.7);
}
function wakeAnnual(i,j,self,all){let w=0;for(const se of SEASONS)w+=se.mix?.5*wakeLoss(i,j,NE,self,all)+.5*wakeLoss(i,j,SW,self,all):wakeLoss(i,j,se.dir,self,all);return w/4}
function estAnnual(k,i,j,self){
  const m=MODELS[k],t=tile(i,j);let e=0;
  for(const se of SEASONS){const v=t.wind*se.wind*shear(m);const wk=se.mix?.5*wakeLoss(i,j,NE,self,true)+.5*wakeLoss(i,j,SW,self,true):wakeLoss(i,j,se.dir,self,true);e+=m.mw*cf(k,v)*HOURS*(1-wk)*.97}
  return e;
}
function faultProb(o){const m=MODELS[o.model];let p=.032*POLICY[S.policy].fail*(1+Math.max(0,85-o.health)/25);if(omNear(o))p*=.6;if(m.offshore)p*=1.3;return Math.min(.6,p)}
function repairTurns(o){let r=1;if(MODELS[o.model].offshore){if(!omNear(o))r++}else if(!nearRoad(o.i,o.j,2))r++;return r}
function pickFault(){const tot=FAULTS.reduce((s,f)=>s+f.w,0);let r=GR()*tot;for(let k=0;k<FAULTS.length;k++){r-=FAULTS[k].w;if(r<=0)return k}return 0}

// ================= rules =================
function check(tl,i,j){
  const t=tile(i,j);if(!t)return {ok:false,r:'超出地圖範圍'};
  const p=parcelAt(i,j);
  if(tl==='buy'){
    if(p.owned)return {ok:false,r:'這塊地已經是你的了',p};
    const c=parcelPrice(p),ok=S.cash-c>=-credit();
    return {ok,r:ok?'':'資金與信用額度不足',cost:{cash:c,steel:0,blades:0},p};
  }
  if(!p.owned)return {ok:false,r:`地塊 ${parcelName(p)} 尚未取得，請先到「土地」購買`};
  if(t.house)return {ok:false,r:'民宅用地無法使用'};
  if(t.o)return {ok:false,r:'這一格已經有設施'};
  const m=MODELS[tl],fd=FAC[tl],src=m||fd;
  const cost={cash:src.cash,steel:src.steel||0,blades:m?m.blades:0};
  let r='';
  if(m){
    if(m.tech&&!S.tech[m.tech])r='尚未研發此機型';
    else if(m.offshore&&t.t!=='shallow')r='離岸機組只能建在淺海（深海水深過大）';
    else if(!m.offshore&&isWater(t))r='陸域機組不能建在水域';
    else if(t.road)r='不能建在道路上';
    else if(t.tree)r='這裡有林木，請先用「拆除」清除';
    else if(houseNear(i,j,2))r='距民宅不足 2 格，違反噪音管制標準';
    else if(turbNear(i,j))r='緊鄰其他風機，轉子會互相干涉';
    else if(m.needRoad&&!nearRoad(i,j,1))r='大型機組必須緊鄰道路，葉片才運得進來';
    else if(S.support<30)r='民眾支持度低於 30%，主管機關暫停核發建照';
    else if(crewBusy()>=S.crews)r='所有工班都在工地上，請到市場招募';
  }else if(tl==='road'){
    if(isWater(t))r='不能在水域鋪路';else if(t.road)r='這裡已經是道路';else if(t.tree)r='請先清除林木';
  }else{
    if(isWater(t))r='設施不能建在水域';else if(t.road)r='不能建在道路上';else if(t.tree)r='這裡有林木，請先用「拆除」清除';
  }
  if(!r){
    if(S.cash-cost.cash<-credit())r='資金與信用額度不足';
    else if(S.steel<cost.steel)r=`鋼材不足：需要 ${cost.steel} t，庫存 ${Math.round(S.steel)} t`;
    else if(S.blades<cost.blades)r=`葉片不足：需要 ${cost.blades} 組，庫存 ${S.blades} 組`;
  }
  return {ok:!r,r,cost};
}
function bullInfo(t){
  const p=parcelAt(t.i,t.j);
  if(!p.owned)return {ok:false,r:'只能拆除自己土地上的東西'};
  if(t.house)return {ok:false,r:'不能拆除民宅'};
  const o=objOf(t);
  if(o){
    if(o.type==='turb'){const m=MODELS[o.model];const b=o.state==='build';return {ok:true,o,cash:Math.round(m.cash*(b?.8:.3)),steel:Math.round(m.steel*(b?1:.5)),blades:b?m.blades:0}}
    const f=FAC[o.kind];return {ok:true,o,cash:Math.round(f.cash*.3),steel:0,blades:0};
  }
  if(t.tree)return {ok:true,tree:true,cost:1.5};
  if(t.road)return {ok:true,road:true};
  return {ok:false,r:'這裡沒有可以拆除的東西'};
}

// ================= actions =================
function build(tl,t){
  const c=check(tl,t.i,t.j);
  if(!c.ok){toast(c.r,'bad');return false}
  S.cash-=c.cost.cash;S.steel-=c.cost.steel;S.blades-=c.cost.blades;
  if(MODELS[tl]){S.objs.push({id:S.nid++,type:'turb',model:tl,i:t.i,j:t.j,state:'build',prog:0,health:100,age:0,ang:VR()*6.28,e:0,av:null,wake:0,pm:false,fault:-1});toast(`${MODELS[tl].name} 開工，${MODELS[tl].build} 季後完工`,'good')}
  else if(tl==='road'){t.road=true;buildCache()}
  else{S.objs.push({id:S.nid++,type:'fac',kind:tl,i:t.i,j:t.j});if(tl==='mast'){survey(t.i+.5,t.j+.5,FAC.mast.range);toast('測風塔啟用，周邊風況已量測','good')}else toast(`${FAC[tl].name}完工`,'good')}
  floatText(t.i+.5,t.j+.5,elev(t),`−${fmt(c.cost.cash,c.cost.cash<1?1:0)}M`,'#ffd36b');
  reindex();rebuildDrawables();updateHUD();save();
  return true;
}
function doBulldoze(t){
  const b=bullInfo(t);if(!b.ok){toast(b.r,'bad');return}
  if(b.o){
    S.cash+=b.cash;S.steel=Math.min(steelCap(),S.steel+b.steel);S.blades=Math.min(bladeCap(),S.blades+b.blades);
    S.objs=S.objs.filter(o=>o!==b.o);if(selected&&selected.o===b.o)closeInspector();
    floatText(t.i+.5,t.j+.5,elev(t),`+${fmt(b.cash,0)}M`,'#8ff0b4');toast(`已拆除 ${tname(b.o)}，回收 ${b.cash}M`);
  }else if(b.tree){
    if(S.cash-1.5<-credit()){toast('資金不足','bad');return}
    S.cash-=1.5;t.tree=0;if(t.t==='forest')t.t='grass';S.support=Math.max(0,S.support-.3);buildCache();floatText(t.i+.5,t.j+.5,elev(t),'−1.5M','#ffd36b');
  }else if(b.road){t.road=false;buildCache()}
  reindex();rebuildDrawables();updateHUD();save();
}
function buyParcel(p){
  const c=parcelPrice(p);if(S.cash-c<-credit()){toast('資金與信用額度不足','bad');return}
  S.cash-=c;p.owned=true;surveyParcel(p);toast(`取得地塊 ${parcelName(p)}，完成風況初勘`,'good');
  const cx=p.px*PS+PS/2,cy=p.py*PS+PS/2;floatText(cx,cy,2,`−${c}M`,'#ffd36b');
  reindex();updateHUD();save();
}
function research(k){
  const c=techCost(k);if(S.tech[k])return;
  if(S.cash-c<-credit()){toast('資金與信用額度不足','bad');return}
  S.cash-=c;S.tech[k]=true;if(S.flags.techDisc)S.flags.techDisc=0;
  toast(`研發完成：${TECH[k].name}`,'good');updateHUD();renderTray();save();
}

