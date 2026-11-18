// 風場大亨 — 遊戲狀態、物理模型、規則與玩家動作
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
const parcelName=p=>'ABCDEFGH'[p.px]+(p.py+1);
const objOf=t=>t&&t.o?byId.get(t.o):null;
const facsOf=k=>FACS.filter(f=>f.kind===k);
const SBX=()=>!!(S&&S.sbx);
const offJob=o=>!!(LV.offshoreOps&&MODELS[o.model].offshore);
const installedMW=()=>TURBS.reduce((s,o)=>s+(o.state!=='build'?MODELS[o.model].mw:0),0);
const pipelineMW=()=>TURBS.reduce((s,o)=>s+(o.state==='build'?MODELS[o.model].mw:0),0);
const steelCap=()=>SBX()?1e6:400+500*facsOf('ware').length;
const bladeCap=()=>SBX()?1e5:8+10*facsOf('ware').length;
const vesselCap=()=>facsOf('port').length*VESSELS_PER_PORT;
const credit=()=>SBX()?1e9:Math.round(250+3*installedMW());
const tariff=()=>S.tariffBase+S.tmods.reduce((s,m)=>s+m.d,0);
const crewBusy=()=>TURBS.filter(o=>o.state==='build'&&!offJob(o)).length;
const vesselBusy=()=>TURBS.filter(o=>o.state==='build'&&offJob(o)).length;
const tname=o=>o.type==='turb'?`WTG-${String(o.id).padStart(2,'0')}`:FAC[o.kind].name;
const shear=m=>Math.pow(m.hubM/100,.14);
const season=()=>SEASONS[S.turn%4];
const flowNow=()=>season().dir;
const dateLabel=t=>`${START_YEAR+Math.floor(t/4)} ${SEASONS[t%4].q}`;
const fmt=(n,d=1)=>Number(n).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
const techCost=k=>Math.round(TECH[k].cost*(S.flags.techDisc?.6:1));
const turnsLeft=()=>LV.turns?LV.turns-S.turn:null;

function chebNear(i,j,r,fn){for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(!di&&!dj)continue;const t=tile(i+di,j+dj);if(t&&fn(t))return true}return false}
const houseNear=(i,j,r)=>chebNear(i,j,r,t=>t.house>0);
const nearRoad=(i,j,r)=>chebNear(i,j,r,t=>t.road);
const turbNear=(i,j)=>chebNear(i,j,1,t=>{const o=objOf(t);return o&&o.type==='turb'});
// 維運中心 7 格內；離岸機組在海上變電站（兼海上運維基地）8 格內也算
const omNear=o=>facsOf('om').some(f=>Math.hypot(f.i-o.i,f.j-o.j)<=FAC.om.range)||(MODELS[o.model]&&MODELS[o.model].offshore&&facsOf('osub').some(f=>Math.hypot(f.i-o.i,f.j-o.j)<=FAC.osub.range));
const nextToWater=(i,j)=>DIR4.some(([a,b])=>{const n=tile(i+a,j+b);return n&&isWater(n)});
function nearestSub(i,j){let best=null,bd=1e9;for(const s of facsOf('sub')){const d=Math.hypot(s.i-i,s.j-j);if(d<bd){bd=d;best=s}}return best?{s:best,d:bd}:null}
const cableCost=(i,j)=>{const n=nearestSub(i,j);return n?Math.round(n.d*CABLE_PER_TILE*10)/10:0};

function surveyParcel(p){for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++)tile(i,j).sv=true}
function survey(ci,cj,r){for(const t of S.tiles)if(Math.hypot(t.i-ci,t.j-cj)<=r)t.sv=true}
function parcelPrice(p){
  let s=0;
  for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++){const t=tile(i,j);if(t.t==='deep')s+=LV.offshoreOps?1.1:.4;else if(t.t==='shallow')s+=1.5;else s+=1+Math.max(0,t.wind-6)*.5-(t.house?.5:0)}
  return Math.round(s*1.15*(1+(60-S.support)/120)*MOD('land'));
}

// 依關卡建立新局
function newState(levelId,opt={}){
  setLevel(levelId);
  const L=LV,st0=L.start||{};
  const allTech=L.tech==='all';
  const st={ver:2,level:L.id,N,seed:opt.seed??L.map.seed,turn:0,
    cash:st0.cash??480,steel:st0.steel??180,blades:st0.blades??4,crews:st0.crews??2,vessels:st0.vessels??0,support:st0.support??62,
    price:{steel:.11,blade:6.5},tariffBase:MOD('tariff'),tmods:[],policy:st0.policy??1,
    tech:{tech6:allTech||!!(L.tech&&L.tech.tech6),tech10:allTech||!!(L.tech&&L.tech.tech10),tech15:allTech||!!(L.tech&&L.tech.tech15)},
    tiles:[],parcels:[],objs:[],nid:1,hist:[],flags:{},over:false,
    sbx:L.sandbox?Object.assign({events:true,force:'',instant:false,free:false,grid:true,map:opt.map||L.map.gen},opt.sbx||{}):null};
  S=st;
  const gen=st.sbx?st.sbx.map:L.map.gen;
  const P=Object.assign({},L.map,{own:L.own});
  if(st.sbx&&gen!==L.map.gen){Object.assign(P,SANDBOX_MAPS[gen]);st.seed=opt.seed??P.seed}
  MAPGEN[gen](st,P);
  byId=new Map();TURBS=[];FACS=[];
  if(L.setup&&SETUPS[L.setup])SETUPS[L.setup]();
  return st;
}
const SANDBOX_MAPS={coast:{seed:20271},hills:{seed:3131,villages:[[4,4],[19,6],[7,19],[18,19]]},offshore:{seed:6060,coast:9,shelf:13,villages:[[2,2]]}};

// ================= derived =================
function reindex(){
  byId=new Map(S.objs.map(o=>[o.id,o]));
  TURBS=S.objs.filter(o=>o.type==='turb');FACS=S.objs.filter(o=>o.type==='fac');
  for(const t of S.tiles)t.o=0;
  for(const o of S.objs)tile(o.i,o.j).o=o.id;
  GRID=gridAssign();
  for(const o of TURBS){const f=GRID.fac.get(o);o.conn=!!GRID.asg.get(o)||autoGrid();o.over=GRID.asg.get(o)&&f<1}
  validMap=null;
}
// 併網：每部風機接到範圍內最近的變電站（陸上 6.5 格 80 MW；海上 8 格 300 MW，需有陸上變電站接收）
const autoGrid=()=>!!(S&&S.sbx&&S.sbx.grid);
function gridAssign(){
  const hasLand=facsOf('sub').length>0;
  const subs=[...facsOf('sub'),...(hasLand?facsOf('osub'):[])],asg=new Map(),load=new Map(),fac=new Map();
  for(const o of TURBS){let best=null,bd=1e9;for(const s of subs){const d=Math.hypot(o.i-s.i,o.j-s.j);if(d<=FAC[s.kind].range&&d<bd){bd=d;best=s}}asg.set(o,best);if(best&&o.state!=='build')load.set(best,(load.get(best)||0)+MODELS[o.model].mw)}
  for(const o of TURBS){const s=asg.get(o);if(!s)fac.set(o,autoGrid()?1:0);else{const L=load.get(s)||0,cap=FAC[s.kind].cap;fac.set(o,L>cap?cap/L:1)}}
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
function faultProb(o){const m=MODELS[o.model];let p=.032*POLICY[S.policy].fail*MOD('fault')*(1+Math.max(0,85-o.health)/25);if(omNear(o))p*=.6;if(m.offshore)p*=1.3;return Math.min(.6,p)}
function repairTurns(o){let r=1;if(MODELS[o.model].offshore){if(!omNear(o))r++}else if(!nearRoad(o.i,o.j,2))r++;return r}
function pickFault(){const tot=FAULTS.reduce((s,f)=>s+f.w,0);let r=GR()*tot;for(let k=0;k<FAULTS.length;k++){r-=FAULTS[k].w;if(r<=0)return k}return 0}

// ================= rules =================
function check(tl,i,j){
  const t=tile(i,j);if(!t)return {ok:false,r:$t`超出地圖範圍`};
  const p=parcelAt(i,j),sb=SBX(),free=sb&&S.sbx.free;
  if(tl==='buy'){
    if(p.owned)return {ok:false,r:$t`這塊地已經是你的了`,p};
    const c=parcelPrice(p),ok=S.cash-c>=-credit();
    return {ok,r:ok?'':$t`資金與信用額度不足`,cost:{cash:c,steel:0,blades:0},p};
  }
  if(!p.owned)return {ok:false,r:$t`地塊 ${parcelName(p)} 尚未取得，請先到「土地」購買`};
  if(t.house)return {ok:false,r:$t`民宅用地無法使用`};
  if(t.o)return {ok:false,r:$t`這一格已經有設施`};
  const m=MODELS[tl],fd=FAC[tl],src=m||fd;
  if(!src)return {ok:false,r:$t`未知的建物`};
  const cost={cash:src.cash,steel:src.steel||0,blades:m?m.blades:0};
  let r='';
  if(m){
    if(!lvModels().includes(tl)&&!sb)r=$t`這一關不能使用此機型`;
    else if(m.tech&&!S.tech[m.tech])r=$t`尚未研發此機型`;
    else if(m.floating&&t.t!=='deep')r=$t`浮動式機組要建在深海`;
    else if(m.offshore&&!m.floating&&t.t!=='shallow')r=$t`固定式離岸機組只能建在淺海（深海請用浮動式）`;
    else if(!m.offshore&&isWater(t))r=$t`陸域機組不能建在水域`;
    else if(t.road)r=$t`不能建在道路上`;
    else if(t.tree&&!free)r=$t`這裡有林木，請先用「拆除」清除`;
    else if(!free&&!m.offshore&&houseNear(i,j,2))r=$t`距民宅不足 2 格，違反噪音管制標準`;
    else if(!free&&turbNear(i,j))r=$t`緊鄰其他風機，轉子會互相干涉`;
    else if(!free&&m.needRoad&&!nearRoad(i,j,1))r=$t`大型機組必須緊鄰道路，葉片才運得進來`;
    else if(!sb&&S.support<30)r=$t`民眾支持度低於 30%，主管機關暫停核發建照`;
    else if(!sb&&offJob({model:tl})&&!facsOf('port').length)r=$t`離岸施工要先蓋「運維港口」`;
    else if(!sb&&offJob({model:tl})&&vesselBusy()>=S.vessels)r=$t`沒有空閒的工作船（到市場租用）`;
    else if(!sb&&!offJob({model:tl})&&crewBusy()>=S.crews)r=$t`所有工班都在工地上，請到市場招募`;
  }else if(tl==='road'){
    if(isWater(t))r=$t`不能在水域鋪路`;else if(t.road)r=$t`這裡已經是道路`;else if(t.tree)r=$t`請先清除林木`;
  }else if(fd.water){
    if(!isWater(t))r=$t`${fd.name}要建在海上`;
    else if(!facsOf('sub').length)r=$t`需要先有陸上變電站接收（海纜上岸點）`;
    else cost.cash=Math.round((fd.cash+cableCost(i,j))*10)/10;
  }else{
    if(isWater(t))r=$t`設施不能建在水域`;else if(t.road)r=$t`不能建在道路上`;else if(t.tree&&!free)r=$t`這裡有林木，請先用「拆除」清除`;
    else if(tl==='port'&&!nextToWater(i,j))r=$t`港口要緊鄰海水`;
  }
  if(!r&&!sb){
    if(S.cash-cost.cash<-credit())r=$t`資金與信用額度不足`;
    else if(S.steel<cost.steel)r=$t`鋼材不足：需要 ${cost.steel} t，庫存 ${Math.round(S.steel)} t`;
    else if(S.blades<cost.blades)r=$t`葉片不足：需要 ${cost.blades} 組，庫存 ${S.blades} 組`;
  }
  return {ok:!r,r,cost};
}
function bullInfo(t){
  const p=parcelAt(t.i,t.j);
  if(!p.owned)return {ok:false,r:$t`只能拆除自己土地上的東西`};
  if(t.house)return {ok:false,r:$t`不能拆除民宅`};
  const o=objOf(t);
  if(o){
    if(o.type==='turb'){const m=MODELS[o.model];const b=o.state==='build';return {ok:true,o,cash:Math.round(m.cash*(b?.8:.3)),steel:Math.round(m.steel*(b?1:.5)),blades:b?m.blades:0}}
    const f=FAC[o.kind];return {ok:true,o,cash:Math.round(f.cash*.3),steel:0,blades:0};
  }
  if(t.tree)return {ok:true,tree:true,cost:1.5};
  if(t.road)return {ok:true,road:true};
  return {ok:false,r:$t`這裡沒有可以拆除的東西`};
}

// ================= actions =================
function makeTurb(tl,t){
  const instant=SBX()&&S.sbx.instant;
  const o={id:S.nid++,_born:time,type:'turb',model:tl,i:t.i,j:t.j,state:instant?'run':'build',prog:instant?MODELS[tl].build:0,health:100,age:0,ang:VR()*6.28,e:0,av:null,wake:0,pm:false,fault:-1};
  if(t.tree){t.tree=0;if(t.t==='forest')t.t='grass'}
  S.objs.push(o);return o;
}
function build(tl,t,quiet){
  const c=check(tl,t.i,t.j);
  if(!c.ok){if(!quiet)toast(c.r,'bad');return false}
  if(!SBX()){S.cash-=c.cost.cash;S.steel-=c.cost.steel;S.blades-=c.cost.blades}
  if(MODELS[tl]){makeTurb(tl,t);if(!quiet)toast(SBX()&&S.sbx.instant?$t`${MODELS[tl].name} 立即完工`:$t`${MODELS[tl].name} 開工，${MODELS[tl].build} 季後完工`,'good')}
  else if(tl==='road'){t.road=true;if(!quiet)buildCache()}
  else{
    if(t.tree){t.tree=0;if(t.t==='forest')t.t='grass'}
    S.objs.push({id:S.nid++,type:'fac',kind:tl,i:t.i,j:t.j,_born:time});
    if(tl==='mast'){survey(t.i+.5,t.j+.5,FAC.mast.range);if(!quiet)toast($t`測風塔啟用，周邊風況已量測`,'good')}
    else if(!quiet)toast(tl==='osub'?$t`海上變電站完工，含海纜 ${fmt(cableCost(t.i,t.j),1)}M`:$t`${FAC[tl].name}完工`,'good');
  }
  if(quiet)return true;
  sfx(tl==='road'?'road':'build');fxDust(t.i,t.j,elev(t),false);
  if(!SBX())floatText(t.i+.5,t.j+.5,elev(t),`−${fmt(c.cost.cash,c.cost.cash<1?1:0)}M`,'#ffd36b');
  reindex();rebuildDrawables();updateHUD();save();
  return true;
}
function doBulldoze(t){
  const b=bullInfo(t);if(!b.ok){toast(b.r,'bad');return}
  if(b.o){
    if(!SBX()){S.cash+=b.cash;S.steel=Math.min(steelCap(),S.steel+b.steel);S.blades=Math.min(bladeCap(),S.blades+b.blades)}
    S.objs=S.objs.filter(o=>o!==b.o);if(selected&&selected.o===b.o)closeInspector();
    if(!SBX())floatText(t.i+.5,t.j+.5,elev(t),`+${fmt(b.cash,0)}M`,'#8ff0b4');toast($t`已拆除 ${tname(b.o)}${SBX()?'':$t`，回收 ${b.cash}M`}`);
  }else if(b.tree){
    if(S.cash-1.5<-credit()){toast($t`資金不足`,'bad');return}
    if(!SBX())S.cash-=1.5;t.tree=0;if(t.t==='forest')t.t='grass';if(!SBX())S.support=Math.max(0,S.support-.3);buildCache();if(!SBX())floatText(t.i+.5,t.j+.5,elev(t),'−1.5M','#ffd36b');
  }else if(b.road){t.road=false;buildCache()}
  sfx('bulldoze');fxDust(t.i,t.j,elev(t),true);
  reindex();rebuildDrawables();updateHUD();save();
}
function buyParcel(p){
  const c=parcelPrice(p);if(S.cash-c<-credit()){toast($t`資金與信用額度不足`,'bad');return}
  S.cash-=c;p.owned=true;surveyParcel(p);toast($t`取得地塊 ${parcelName(p)}，完成風況初勘`,'good');
  const cx=p.px*PS+PS/2,cy=p.py*PS+PS/2;floatText(cx,cy,2,`−${c}M`,'#ffd36b');sfx('coin');fxSparkle(cx-.5,cy-.5,1,0);
  reindex();updateHUD();save();
}
function research(k){
  const c=techCost(k);if(S.tech[k])return;
  if(S.cash-c<-credit()){toast($t`資金與信用額度不足`,'bad');return}
  S.cash-=c;S.tech[k]=true;if(S.flags.techDisc)S.flags.techDisc=0;
  toast($t`研發完成：${TECH[k].name}`,'good');sfx('research');updateHUD();renderTray();save();
}
