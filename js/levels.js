// 風場大亨 — 關卡定義與地圖生成
'use strict';
// ================= 目標 =================
const last4e=()=>S.hist.slice(-4).reduce((s,h)=>s+h.e,0);
const last4av=()=>{const a=S.hist.slice(-4).filter(h=>h.av!=null);return a.length?a.reduce((s,h)=>s+h.av,0)/a.length*100:0};
const offshoreMW=()=>TURBS.reduce((s,o)=>s+(o.state!=='build'&&MODELS[o.model].offshore?MODELS[o.model].mw:0),0);
const GOAL_DEF={
  mw:{name:'裝置容量',unit:'MW',val:()=>installedMW()},
  offmw:{name:'離岸裝置容量',unit:'MW',val:()=>offshoreMW()},
  e4:{name:'近四季發電量',unit:'GWh',val:last4e},
  av4:{name:'近四季平均可用率',unit:'%',val:last4av},
  sup:{name:'民眾支持度',unit:'%',val:()=>S.support},
  cash:{name:'期末現金',unit:'M',val:()=>S.cash},
  bess:{name:'儲能系統',unit:'座',val:()=>facsOf('bess').length},
};
function evalGoals(){return (LV.goals||[]).map(g=>{const d=GOAL_DEF[g.k],v=d.val();return {g,d,v,met:v>=g.t}})}
// 評等：全部達成且現金為正 S；全部達成 A；達成 3/4 以上 B；一半以上 C；其餘 D；破產 F
function gradeOf(){
  if(S.over==='bankrupt')return {grade:'F',stars:0};
  const r=evalGoals(),met=r.filter(x=>x.met).length,n=r.length||1;
  const grade=met===n?(S.cash>=0?'S':'A'):met>=n*.75?'B':met>=n*.5?'C':'D';
  return {grade,stars:{S:3,A:2,B:2,C:1,D:0}[grade]};
}

// ================= 關卡 =================
// map.gen：coast 海岸 / hills 丘陵 / offshore 離岸；own：起始地塊 [px,py] 或 'all' / 'auto'
// mod：難度旋鈕（typhoon 颱風機率倍數、curtailW 限電事件權重、curtailAmt 限電比例、tariff 售電費率、land 地價倍數、fault 故障率倍數）
// models / facs：這一關可以蓋的機型與設施；tech：開局就解鎖的技術
const DEF_MODELS=['t2','t4','t6','t10'], DEF_FACS=['sub','om','mast','ware','bess','road'];
const LEVELS=[
  {id:'tutorial',no:0,name:'新手導引',tag:'一步一步教',diff:0,tutorial:true,noEvents:true,
    desc:'跟著提示蓋好第一座變電站與第一部風機，看它開始發電。大約 3 分鐘。',
    map:{gen:'coast',N:12,seed:4242,coast:8.6,villages:[[2,2]]},own:[[0,1],[1,1]],start:{cash:200,steel:60,blades:1,crews:1,support:70},turns:null,goals:[],
    models:['t2'],facs:['sub','road'],mod:{fault:0},
    learn:['先蓋變電站，風機才能併網','到市場補鋼材','把風機蓋在風大、又在變電站範圍內的地方','結束本季，看季報與發電量']},
  {id:'sandbox',no:0,name:'測試關卡',tag:'自由建造',diff:0,sandbox:true,
    desc:'資金無限、所有土地與技術全開、沒有回合限制。可以任意建造、一鍵填滿風機、手動觸發事件，實驗排列、尾流與維運策略。',
    map:{gen:'coast',N:24,seed:20271},own:'all',start:{cash:999999,steel:99999,blades:9999,crews:99,vessels:30,support:70},turns:null,goals:[],tech:'all',
    models:['t2','t4','t6','t10','f15'],facs:['sub','om','mast','ware','bess','road','port','osub'],
    learn:['右上角「工具」可切換地圖、觸發事件、一鍵填滿或清空風機','打開「尾流」圖層，比較不同排列的損失','不會破產，也不計成績']},
  {id:'coast',no:1,name:'海岸初探',tag:'基礎',diff:1,
    desc:'海峽沿岸兩塊開發用地。學會變電站併網、尾流排列、工班與備品，八年內建成 120 MW。',
    map:{gen:'coast',N:24,seed:20271,villages:[[4,6],[18,4]]},own:[[1,2],[2,2]],start:{},turns:32,
    goals:[{k:'mw',t:120},{k:'e4',t:300},{k:'av4',t:96},{k:'sup',t:50}],
    learn:['先蓋變電站，風機要在它 6.5 格內才能併網','沿垂直主風向排成一列，用尾流圖層檢查','每座工地與每次維修都要一隊工班，倉庫常備葉片']},
  {id:'hills',no:2,name:'丘陵風場',tag:'地形與道路',diff:2,
    desc:'內陸丘陵，稜線風大但道路少、村落多。大型機組必須緊鄰道路運輸，先鋪路才能上稜線。',
    map:{gen:'hills',N:24,seed:3131,villages:[[4,4],[19,6],[7,19],[18,19]]},own:'auto',start:{cash:520},turns:32,
    tech:{tech6:true},models:['t2','t4','t6'],mod:{land:1.25},
    goals:[{k:'mw',t:110},{k:'e4',t:250},{k:'av4',t:96},{k:'sup',t:55}],
    learn:['地勢越高、越突出的稜線風越大','6.2 MW 大型機組已解鎖，但必須緊鄰道路','民宅多：風機靠近村落會拉低支持度，可在市場啟用「地方回饋方案」']},
  {id:'storm',no:3,name:'颱風與電網',tag:'韌性',diff:3,
    desc:'颱風更頻繁、電網常壅塞限電、售電費率較低。用儲能與預防性停機撐過極端天氣。',
    map:{gen:'coast',N:24,seed:5150,villages:[[3,7],[16,5],[20,9]]},own:[[1,2],[2,2]],start:{cash:520},turns:32,
    mod:{typhoon:1.8,curtailW:3,curtailAmt:.25,tariff:3.9},
    goals:[{k:'mw',t:140},{k:'e4',t:330},{k:'av4',t:95},{k:'sup',t:50},{k:'bess',t:3}],
    learn:['夏秋颱風機率大幅提高：低健康度機組最先受損','限電比例 25%，每座儲能吸收四分之一損失','售電費率只有 3.9 元/度，成本控制更重要']},
  {id:'aging',no:4,name:'老舊風場接手',tag:'維護與汰換',diff:3,
    desc:'接手一座運轉十年的小風場：機組老化、排列不佳、還有兩部故障停機。四年內把可用率拉回 97%。',
    map:{gen:'coast',N:24,seed:909,villages:[[4,6],[18,4]]},own:[[1,2],[2,2]],
    start:{cash:140,steel:60,blades:0,crews:1,support:46,policy:0},turns:16,setup:'aging',
    goals:[{k:'av4',t:97},{k:'e4',t:60},{k:'sup',t:55},{k:'cash',t:100}],
    learn:['老機組健康度低、故障率高：先修好、再排預防性維護','排列不佳的機組可以拆除，換成較大的機型（汰舊換新）','現金很緊，維修費、葉片與工班要排優先順序']},
  {id:'offshore',no:5,name:'離岸示範',tag:'海上施工',diff:4,
    desc:'第一座離岸示範風場。先蓋運維港口、租工作船，看海況窗口出海施工；冬季東北季風浪大，常常出不了海。',
    map:{gen:'offshore',N:24,seed:6060,coast:9,shelf:13,villages:[[2,2]]},own:[[0,0],[1,0],[1,1]],
    start:{cash:900,steel:300,blades:8,crews:2,vessels:0},turns:24,offshoreOps:true,
    tech:{tech10:true},models:['t4','t10','f15'],facs:['sub','om','mast','ware','bess','road','port','osub'],
    goals:[{k:'offmw',t:100},{k:'e4',t:260},{k:'av4',t:93},{k:'sup',t:50}],
    learn:['離岸機組的施工與維修都要從港口派工作船出海','每季依海況窗口決定能不能出海：冬季約 40%、春季 85%','10 MW 離岸機組已解鎖；深海浮動式 15 MW 需要研發']},
  {id:'bigoff',no:6,name:'大型離岸風場',tag:'規模化',diff:5,
    desc:'更大的海域、更深的水深。用海上變電站與海纜把數百 MW 送上岸，並研發浮動式機組進軍深海。',
    map:{gen:'offshore',N:30,seed:7070,coast:10,shelf:16,villages:[[2,3],[7,1]]},own:[[0,0],[1,0],[1,1],[2,1]],
    start:{cash:1500,steel:400,blades:10,crews:3,vessels:0},turns:32,offshoreOps:true,
    tech:{tech10:true},models:['t4','t10','f15'],facs:['sub','om','mast','ware','bess','road','port','osub'],
    goals:[{k:'offmw',t:300},{k:'e4',t:850},{k:'av4',t:92},{k:'sup',t:50}],
    learn:['陸上變電站只有 80 MW：外海機群要靠 300 MW 的海上變電站','海纜依離岸距離計價，海上變電站別離陸上變電站太遠','深海風況最好，但浮動式機組造價與運維費最高']},
];
const LEVEL_BY_ID=Object.fromEntries(LEVELS.map(l=>[l.id,l]));
let LV=LEVEL_BY_ID.coast;
const MOD_DEF={typhoon:1,curtailW:1,curtailAmt:.18,tariff:4.2,land:1,fault:1};
const MOD=k=>(LV.mod&&LV.mod[k]!=null)?LV.mod[k]:MOD_DEF[k];
const lvModels=()=>LV.models||DEF_MODELS;
const lvFacs=()=>LV.facs||DEF_FACS;
function setLevel(id){LV=LEVEL_BY_ID[id]||LEVEL_BY_ID.coast;N=LV.map.N;NP=N/PS}

// ================= 地圖生成 =================
const DIR4=[[1,0],[-1,0],[0,1],[0,-1]];
function newTile(i,j,t,h,v){return {i,j,t,h,v,wind:0,sv:false,road:false,o:0,house:0,tree:t==='forest'?1:0}}
function smoothTerraces(T){for(let pass=0;pass<3;pass++)for(const t of T){if(isWater(t))continue;let mn=9;for(const[a,b]of DIR4){const n=tile(t.i+a,t.j+b);if(n&&!isWater(n))mn=Math.min(mn,n.h)}if(mn<9&&t.h>mn+1)t.h=mn+1}}
function setRoad(i,j){const t=tile(i,j);if(!t||isWater(t))return;t.road=true;t.tree=0;t.house=0;if(t.t==='forest')t.t='grass'}
function placeVillage(R,vi,vj){
  for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const t=tile(vi+di,vj+dj);if(!t||isWater(t)||t.road)continue;if((di||dj)&&R()>.55)continue;t.house=1+Math.floor(R()*4);t.tree=0;if(t.t==='forest'||t.t==='rock')t.t='grass'}
}
function isStartParcel(P,px,py){return Array.isArray(P.own)&&P.own.some(([a,b])=>a===px&&b===py)}
function scatterHouses(R,P,count){
  let placed=0,guard=0;
  while(placed<count&&guard++<300){const i=Math.floor(R()*N),j=Math.floor(R()*N);const t=tile(i,j);if(isWater(t)||t.road||t.house||t.t==='rock'||isStartParcel(P,Math.floor(i/PS),Math.floor(j/PS)))continue;if(!nearRoad(i,j,3))continue;t.house=1+Math.floor(R()*4);t.tree=0;if(t.t==='forest')t.t='grass';placed++}
}
function bfs(T,src){
  const d=new Array(N*N).fill(99),q=[];
  T.forEach((t,k)=>{if(src(t)){d[k]=0;q.push(k)}});
  for(let h=0;h<q.length;h++){const k=q[h],i=k%N,j=(k/N)|0;for(const[a,b]of DIR4){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=N||jj>=N)continue;const n=ii+jj*N;if(d[n]>d[k]+1){d[n]=d[k]+1;q.push(n)}}}
  return d;
}
// 風能資源：海岸加速、地形抬升、稜線突出、林地粗糙度；離岸越遠風越大
function computeWind(T,nz,P){
  const dW=bfs(T,isWater),dL=bfs(T,t=>!isWater(t));
  const base=P.windBase??6.0,lift=P.lift??.45,expo=P.expo??0,off=P.offBonus??0;
  T.forEach((t,k)=>{
    const nn=nz(t.i/3+200,t.j/3+200)-.5;let w;
    if(t.t==='deep')w=9.3+nn*.8+Math.min(.6,dL[k]*off);
    else if(t.t==='shallow')w=8.8+nn*.8+Math.min(.6,dL[k]*off);
    else{
      w=base+2.4*Math.exp(-(dW[k]-1)/3.2)+lift*(t.h-1)+nn*1.2;
      if(expo){let s=0,c=0;for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const n=tile(t.i+di,t.j+dj);if(n&&!isWater(n)){s+=n.h;c++}}w+=expo*(t.h-s/c)}
      let fc=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const n=tile(t.i+di,t.j+dj);if(n&&n.t==='forest')fc++}w-=fc*.06;
    }
    t.wind=Math.round(clamp(w,4.5,10.5)*10)/10;
  });
}
function makeParcels(S,own){
  S.parcels=[];for(let py=0;py<NP;py++)for(let px=0;px<NP;px++)S.parcels.push({px,py,owned:own==='all'||(Array.isArray(own)&&own.some(([a,b])=>a===px&&b===py))});
  if(own==='auto'){ // 自動挑風況最好、民宅最少的一對相鄰地塊
    let best=null,bs=-1e9;
    for(const p of S.parcels)for(const q of S.parcels){if(q.px!==p.px+1||q.py!==p.py)continue;let s=0;for(const pp of[p,q])for(let j=pp.py*PS;j<pp.py*PS+PS;j++)for(let i=pp.px*PS;i<pp.px*PS+PS;i++){const t=tile(i,j);s+=t.house?-3:isWater(t)?-1:t.wind-6.5}if(s>bs){bs=s;best=[p,q]}}
    if(best)best.forEach(p=>p.owned=true);
  }
  for(const p of S.parcels)if(p.owned)surveyParcel(p);
}
const MAPGEN={
  // 海岸：海在左下（下風處），右上是丘陵（第 1 關原始地圖演算法，維持不變）
  coast(S,P){
    const R=mulberry32(S.seed),nz=makeNoise(R),ph=R()*10,T=[];
    const c0=P.coast??16.4,mid=N/2;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const cv=j-c0-(nz(i/4.5,7.3)-.5)*6+(i-mid)*.2;
      let t,h;
      if(cv>2.4){t='deep';h=0}else if(cv>.6){t='shallow';h=0}else if(cv>-.9){t='sand';h=1}
      else{const e=nz(i/6+40,j/6+40),ridge=Math.max(0,i-j-2)/6.5;h=clamp(Math.floor(1+e*1.8+ridge),1,4);const m=nz(i/4+90,j/4+90)+(h>=3?.1:0);t=(h===4&&e>.55)?'rock':m>.6?'forest':(m<.42&&h<=2)?'farm':'grass'}
      T.push(newTile(i,j,t,h,R()));
    }
    S.tiles=T;smoothTerraces(T);
    const jr=i=>Math.round(N*10/24)+Math.round(Math.sin(i/3.6+ph)*1.3);
    let pj=jr(0);for(let i=0;i<N;i++){const j=jr(i);for(let k=Math.min(pj,j);k<=Math.max(pj,j);k++)setRoad(i,k);pj=j}
    for(const[vi,vj]of(P.villages||[[4,6],[18,4]])){placeVillage(R,vi,vj);for(let j=vj+1;j<jr(vi);j++)setRoad(vi,j)}
    scatterHouses(R,P,4);
    for(const t of T){if(t.house||t.road)continue;if(t.t==='grass'&&R()<.1)t.tree=2;if(t.t==='sand'&&R()<.32)t.tree=3}
    makeParcels(S,P.own);computeWind(T,nz,P);
  },
  // 丘陵：沒有海，稜線（ridged noise）高聳、谷地有農田與村落
  hills(S,P){
    const R=mulberry32(S.seed),nz=makeNoise(R),ph=R()*10,T=[];
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const e=nz(i/6+40,j/6+40),rg=1-Math.abs(nz(i/5.5+13,j/5.5+71)*2-1);
      const h=clamp(Math.floor(1+e*1.5+Math.pow(rg,2.5)*4),1,5);
      const m=nz(i/4+90,j/4+90)+(h>=3?.08:0);
      let t=(h>=5&&e>.5)?'rock':m>.6?'forest':(m<.44&&h<=2)?'farm':'grass';
      const lake=e<.26&&rg<.4&&h<=1;
      T.push(newTile(i,j,lake?'shallow':t,lake?0:h,R()));
    }
    S.tiles=T;smoothTerraces(T);
    // 谷地道路：東西向一條、南北向一條
    const jr=i=>Math.round(N/2)+Math.round(Math.sin(i/4+ph)*2);
    let pj=jr(0);for(let i=0;i<N;i++){const j=jr(i);for(let k=Math.min(pj,j);k<=Math.max(pj,j);k++)setRoad(i,k);pj=j}
    const ir=j=>Math.round(N/2)+Math.round(Math.cos(j/4+ph)*2);
    let pi=ir(0);for(let j=0;j<N;j++){const i=ir(j);for(let k=Math.min(pi,i);k<=Math.max(pi,i);k++)setRoad(k,j);pi=i}
    for(const[vi,vj]of(P.villages||[])){placeVillage(R,vi,vj);const tj=jr(vi);if(vj===tj)continue;const step=vj<tj?1:-1;for(let j=vj+step;j!==tj;j+=step)setRoad(vi,j)}
    scatterHouses(R,P,6);
    for(const t of T){if(t.house||t.road)continue;if(t.t==='grass'&&R()<.12)t.tree=2}
    computeWind(T,nz,{windBase:5.7,lift:.5,expo:.45});
    makeParcels(S,P.own);
  },
  // 離岸：陸地只在最後方一角，前方是寬闊的淺海與深海
  offshore(S,P){
    const R=mulberry32(S.seed),nz=makeNoise(R),ph=R()*10,T=[];
    const coast=P.coast??9,shelf=P.shelf??13;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const c=(i+j)-coast-(nz(i/5,j/5+3)-.5)*5;
      let t,h;
      if(c>shelf){t='deep';h=0}else if(c>.8){t='shallow';h=0}else if(c>-.6){t='sand';h=1}
      else{const e=nz(i/6+40,j/6+40);h=clamp(Math.floor(1+e*1.6+(-c)/5),1,4);const m=nz(i/4+90,j/4+90);t=m>.62?'forest':(m<.42&&h<=2)?'farm':'grass'}
      T.push(newTile(i,j,t,h,R()));
    }
    S.tiles=T;smoothTerraces(T);
    // 沿海公路
    let pj=null;for(let i=0;i<N;i++){const j=Math.round(coast-4-i+Math.sin(i/3+ph));if(j<0)break;if(pj!=null)for(let k=Math.min(pj,j);k<=Math.max(pj,j);k++)setRoad(i,k);else setRoad(i,j);pj=j}
    for(const[vi,vj]of(P.villages||[]))placeVillage(R,vi,vj);
    for(const t of T){if(t.house||t.road)continue;if(t.t==='grass'&&R()<.1)t.tree=2;if(t.t==='sand'&&R()<.25)t.tree=3}
    computeWind(T,nz,{offBonus:.035});
    makeParcels(S,P.own);
  },
};

// ================= 關卡開局設定 =================
function placeObjForce(type,extra,i,j){
  const t=tile(i,j);if(!t||t.o||t.house)return null;
  t.tree=0;if(t.t==='forest')t.t='grass';t.road=false;
  const o=Object.assign({id:S.nid++,i,j},type==='turb'?{type:'turb',state:'run',prog:0,health:100,age:0,ang:VR()*6.28,e:0,av:null,wake:0,pm:false,fault:-1}:{type:'fac'},extra);
  S.objs.push(o);t.o=o.id;return o;
}
const SETUPS={
  // 老舊風場：10 部 2 MW 機組排成順風直線、健康度低、兩部故障；一座變電站
  aging(){
    const R=mulberry32(S.seed+1);
    const spots=[[13,12],[13,14],[13,16],[11,12],[11,14],[15,12],[15,14],[9,13],[9,15],[17,13],[7,14],[16,16]];
    let n=0;
    for(const[i,j]of spots){
      if(n>=10)break;const t=tile(i,j);
      if(!t||isWater(t)||t.house||t.road||houseNear(i,j,2)||chebNear(i,j,1,u=>u.o))continue;
      const o=placeObjForce('turb',{model:'t2',age:36+Math.floor(R()*10),health:30+R()*35},i,j);
      if(o)n++;
    }
    const T=S.objs.filter(o=>o.type==='turb');
    // 變電站：選能涵蓋最多機組的空地
    let best=null,bc=-1;
    for(const t of S.tiles){if(!parcelAt(t.i,t.j).owned||isWater(t)||t.house||t.road||t.o||chebNear(t.i,t.j,1,u=>u.o))continue;const c=T.filter(o=>Math.hypot(o.i-t.i,o.j-t.j)<=FAC.sub.range).length;if(c>bc){bc=c;best=t}}
    if(best)placeObjForce('fac',{kind:'sub'},best.i,best.j);
    T.slice(0,2).forEach((o,k)=>{o.state='fault';o.fault=k?3:4;o.health=25});
  },
};
