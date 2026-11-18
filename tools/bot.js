// 平衡測試用機器人：注入頁面後直接呼叫遊戲函式。
// BOT.plan(style) 回傳下一個動作（或 null 代表這一季做完了），BOT.apply(a) 執行它。
// style = 'good'（照教學做好每件事）或 'naive'（只蓋風機、不顧維運）
(function(){
const BOT={bad:new Set()};
const owned=(i,j)=>parcelAt(i,j).owned;
const free=t=>!t.o&&!t.house&&!t.road;
const steelPrice=()=>S.price.steel, bladePrice=()=>S.price.blade;
const costM=k=>{const m=MODELS[k];return m.cash+m.steel*steelPrice()+m.blades*bladePrice()};
const subsAll=()=>[...facsOf('sub'),...(facsOf('sub').length?facsOf('osub'):[])];
function reachable(i,j,mw){return subsAll().some(s=>Math.hypot(s.i-i,s.j-j)<=FAC[s.kind].range&&(GRID.load.get(s)||0)+mw<=FAC[s.kind].cap)}
const modelsNow=()=>lvModels().filter(k=>!MODELS[k].tech||S.tech[MODELS[k].tech]);
function okTile(k,t){const m=MODELS[k];if(m.floating)return t.t==='deep';if(m.offshore)return t.t==='shallow';return !isWater(t)}
// 新增一部風機後，自己的年發電量扣掉造成其他風機的尾流損失
function marginal(k,i,j){
  const others=TURBS.slice(),before=others.map(o=>estAnnual(o.model,o.i,o.j,o));
  const fake={id:-1,type:'turb',model:k,i,j,state:'run'};TURBS.push(fake);
  let after=0;others.forEach(o=>{after+=estAnnual(o.model,o.i,o.j,o)});TURBS.pop();
  return estAnnual(k,i,j,null)-(before.reduce((a,b)=>a+b,0)-after);
}
function candidates(needGrid,limit=36){
  const out=[];
  for(const k of modelsNow()){
    const m=MODELS[k],pool=[];
    for(const t of S.tiles){
      if(!owned(t.i,t.j)||!free(t)||!okTile(k,t)||BOT.bad.has(t.i+','+t.j))continue;
      const c=check(k,t.i,t.j);
      const soft=/鋼材不足|葉片不足|資金|工班|工作船/.test(c.r),road=/道路/.test(c.r),tree=/林木/.test(c.r);
      if(!c.ok&&!soft&&!road&&!tree)continue;
      if(tree&&(houseNear(t.i,t.j,2)||turbNear(t.i,t.j)))continue;
      if(needGrid&&!reachable(t.i,t.j,m.mw))continue;
      pool.push({t,c,road,tree});
    }
    pool.sort((a,b)=>b.t.wind-a.t.wind);
    for(const {t,c,road,tree} of pool.slice(0,limit)){
      const v=marginal(k,t.i,t.j);
      out.push({k,i:t.i,j:t.j,v,ratio:v/costM(k)*(tree?.97:1),chk:c,road,tree});
    }
  }
  return out.sort((a,b)=>b.ratio-a.ratio);
}
function needRes(k){const m=MODELS[k],spare=TURBS.length>=4?2:0;
  if(S.steel<m.steel)return {type:'market',a:S.steel+150<=steelCap()?'bs150':'bs50'};
  if(S.blades<m.blades+spare)return {type:'market',a:S.blades+3<=bladeCap()?'bb3':'bb1'};
  return null}
const FST={sub:40,om:20,mast:5,ware:30,bess:15,road:0,port:80,osub:200};
function fb(k,t,why){if(S.steel<FST[k])return {type:'market',a:S.steel+150<=steelCap()?'bs150':'bs50',why:'res'};return {type:'build',k,i:t.i,j:t.j,why}}
function bestTile(filter,score){let best=null,bs=-1e9;for(const t of S.tiles){if(!owned(t.i,t.j)||!free(t)||BOT.bad.has(t.i+','+t.j)||!filter(t))continue;const s=score(t);if(s>bs){bs=s;best=t}}return best}
const landFree=t=>!isWater(t)&&!t.tree;
function landSubTile(){return bestTile(t=>landFree(t)&&check('sub',t.i,t.j).r.match(/^$|資金|鋼材/),t=>{let s=0;for(const u of S.tiles)if(owned(u.i,u.j)&&!u.house&&Math.hypot(u.i-t.i,u.j-t.j)<=6.5)s+=Math.max(0,u.wind-6.8)*(isWater(u)?.6:1);return s-Math.max(0,t.wind-7.5)*4})}

BOT.plan=function(style){
  const T=TURBS,n=T.length,ops=LV.offshoreOps,good=style==='good';
  const freeCrew=S.crews-crewBusy(),freeVes=S.vessels-vesselBusy();
  const faults=T.filter(o=>o.state==='fault');
  const reserve=good?25:5;
  // 1. 陸上變電站
  if(!facsOf('sub').length){const t=landSubTile();if(t)return fb('sub',t,'sub')}
  // 2. 離岸：港口與工作船
  if(ops&&!facsOf('port').length){const t=bestTile(t=>landFree(t)&&check('port',t.i,t.j).r.match(/^$|資金|鋼材/),t=>-Math.hypot(t.i-N/2,t.j-N/2)-t.wind);if(t)return fb('port',t,'port')}
  if(ops&&facsOf('port').length){
    const want=2+Math.ceil(T.filter(o=>offJob(o)&&o.state!=='build').length/(good?5:8))+vesselBusy();
    if(S.vessels<Math.min(want,vesselCap())&&S.cash>40)return {type:'market',a:'vhire'};
    if(good&&want>vesselCap()&&S.cash>180){const t=bestTile(t=>landFree(t)&&check('port',t.i,t.j).r.match(/^$|資金|鋼材/),t=>-t.wind);if(t)return fb('port',t,'port2')}
  }
  if(good){
    // 3. 維護策略、備品、預防保養、道路、維運中心
    if((n>=6||LV.id==='aging')&&S.policy<2&&S.cash>20)return {type:'policy',n:2};
    const bladeNeed=faults.filter(o=>[4,5,6].includes(o.fault)).length+(n>=4?2:0);
    if(S.blades<bladeNeed&&S.cash>15&&S.blades+1<=bladeCap())return {type:'market',a:S.blades+3<=bladeCap()&&bladeNeed-S.blades>1?'bb3':'bb1',why:'spare'};
    const worn=T.find(o=>o.state==='run'&&!o.pm&&o.health<70);
    if(worn&&S.cash>10)return {type:'pm',id:worn.id,i:worn.i,j:worn.j};
    for(const o of T){if(MODELS[o.model].offshore||nearRoad(o.i,o.j,2))continue;
      let best=null,bw=99;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const u=tile(o.i+di,o.j+dj);if(!u||!owned(u.i,u.j)||!free(u)||isWater(u)||u.tree||BOT.bad.has(u.i+','+u.j))continue;if(!check('road',u.i,u.j).ok)continue;if(u.wind<bw){bw=u.wind;best=u}}
      if(best)return {type:'build',k:'road',i:best.i,j:best.j,why:'road'}}
    if(n>=5&&S.cash>60){
      const unc=T.filter(o=>!omNear(o));
      if(unc.length>=3){const t=bestTile(t=>landFree(t)&&check('om',t.i,t.j).r.match(/^$|資金|鋼材/),t=>unc.filter(o=>Math.hypot(o.i-t.i,o.j-t.j)<=7).length*3-Math.max(0,t.wind-7.5)*4);if(t&&unc.some(o=>Math.hypot(o.i-t.i,o.j-t.j)<=7))return fb('om',t,'om')}
    }
    // 3b. 民眾支持度：啟用地方回饋方案
    const supT=((LV.goals||[]).find(g=>g.k==='sup')||{t:45}).t;
    const wantFund=S.support<supT+6?(S.cash>60?2:1):S.support>supT+20?0:(S.fund||0);
    if(wantFund!==(S.fund||0)&&(wantFund===0||S.cash>20))return {type:'market',a:'fund'+wantFund,why:'fund'};
    // 4. 第 3 關：儲能
    const bg=(LV.goals||[]).find(g=>g.k==='bess');
    if(bg&&facsOf('bess').length<bg.t&&n>=6&&S.cash>110){const t=bestTile(landFree,t=>-t.wind);if(t)return fb('bess',t,'bess')}
  }
  // 5. 研發
  for(const k of lvModels()){const tk=MODELS[k].tech;if(tk&&!S.tech[tk]&&S.turn>=(tk==='tech15'?6:4)&&S.cash>techCost(tk)+(good?150:80))return {type:'research',k:tk}}
  if(lvModels().some(k=>MODELS[k].offshore&&S.tech[MODELS[k].tech]||!MODELS[k].tech&&MODELS[k].offshore)&&steelCap()<500&&!facsOf('ware').length&&S.cash>60){const t=bestTile(landFree,t=>-t.wind);if(t)return fb('ware',t,'ware')}
  // 6. 工班
  const opT=T.filter(o=>o.state!=='build'&&!offJob(o)).length;
  if(good){
    const lean=LV.id==='aging';
    if(S.crews<Math.min(14,(lean?2:3)+Math.ceil(opT/(lean?6:4)))&&S.cash>30)return {type:'hire'};
    if(faults.filter(o=>!offJob(o)).length>freeCrew&&S.cash>50&&S.crews<14)return {type:'hire'};
  }else if(freeCrew<=0&&S.crews<4&&S.cash>30)return {type:'hire'};
  // 7. 風機
  const canLand=freeCrew>(good?faults.filter(o=>!offJob(o)).length+1:0),canSea=ops&&freeVes>(good?faults.filter(offJob).length+(T.filter(offJob).length>=8?1:0):0);
  // 門檻：剩餘年限內要能回本（MWh/年 每百萬元）
  const yrs=Math.max(.75,((LV.turns||32)-S.turn)/4);
  const needCap=evalGoals().some(x=>!x.met&&['mw','offmw','e4'].includes(x.g.k));
  const thr=needCap?(good?70:40):Math.max(good?70:40,1000/(tariff()*yrs*(good?.6:.9)));
  const all=candidates(true).filter(x=>x.v>0&&x.ratio>thr);
  const isSea=x=>ops&&MODELS[x.k].offshore;
  const c=all.find(x=>isSea(x)?canSea:canLand);
  if(c&&S.cash-c.chk.cost.cash>reserve){
    if(c.tree)return {type:'clear',i:c.i,j:c.j};
    if(c.road){ // 6.2 MW 需要緊鄰道路：先鋪一格路
      let best=null;for(const[a,b]of DIR4){const u=tile(c.i+a,c.j+b);if(u&&owned(u.i,u.j)&&free(u)&&!isWater(u)&&!u.tree&&check('road',u.i,u.j).ok){best=u;break}}
      if(best)return {type:'build',k:'road',i:best.i,j:best.j,why:'road6'};
      BOT.bad.add(c.i+','+c.j);return BOT.plan(style);
    }
    const r=needRes(c.k);if(r){r.why='res';return r}
    return {type:'build',k:c.k,i:c.i,j:c.j,why:'turb',v:c.v};
  }
  if(all.length&&!c){ // 有好位置但人手不足
    if(all.some(x=>!isSea(x))&&S.crews<14&&S.cash>80)return {type:'hire'};
    if(all.some(isSea)&&S.cash>80){if(S.vessels<vesselCap())return {type:'market',a:'vhire'};if(S.cash>200){const t=bestTile(t=>landFree(t)&&check('port',t.i,t.j).r.match(/^$|資金|鋼材/),t=>-t.wind);if(t)return fb('port',t,'port2')}}
  }
  if(!all.length){
    // 範圍外還有好位置：再蓋變電站（陸上或海上）
    const far=candidates(false,24).filter(x=>x.ratio>thr&&!reachable(x.i,x.j,MODELS[x.k].mw));
    if(far.length>=3){
      const sea=far.filter(x=>MODELS[x.k].offshore);
      if(sea.length>=3&&lvFacs().includes('osub')&&S.cash>220){
        const t=bestTile(t=>isWater(t)&&check('osub',t.i,t.j).r.match(/^$|資金|鋼材/),t=>sea.filter(x=>Math.hypot(x.i-t.i,x.j-t.j)<=8).length*20-cableCost(t.i,t.j)-((t.wind>9)?5:0));
        if(t)return fb('osub',t,'osub');
      }
      if(S.cash>90){const pts=far.slice(0,8);const t=bestTile(t=>landFree(t)&&!subsAll().some(s=>Math.hypot(s.i-t.i,s.j-t.j)<5),t=>pts.filter(p=>Math.hypot(p.i-t.i,p.j-t.j)<=6.5).length);if(t&&pts.some(p=>Math.hypot(p.i-t.i,p.j-t.j)<=6.5))return fb('sub',t,'sub2')}
    }
    // 買相鄰地塊
    let best=null,bs=0;
    for(const p of S.parcels){if(p.owned)continue;if(!S.parcels.some(q=>q.owned&&Math.abs(q.px-p.px)+Math.abs(q.py-p.py)===1))continue;
      let s=0;for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++){const t=tile(i,j);
        if(t.house)s-=2;else if(t.t==='deep')s+=modelsNow().includes('f15')?Math.max(0,t.wind-8.5)*2:0;else if(t.t==='shallow')s+=modelsNow().some(k=>MODELS[k].offshore&&!MODELS[k].floating)?Math.max(0,t.wind-8)*2:0;else if(!t.road)s+=modelsNow().some(k=>!MODELS[k].offshore)?Math.max(0,t.wind-6.6):0}
      const sc=s/parcelPrice(p);if(sc>bs){bs=sc;best=p}}
    if(best&&S.cash>parcelPrice(best)+(good?60:10))return {type:'buy',px:best.px,py:best.py};
  }
  return null;
};
BOT.choice=function(style,labels){
  const pref=style==='good'?['預防性停機','支付敦親睦鄰回饋金','婉拒','啟用鳥類雷達降載','加價調度','舉辦說明會並設立獎學金']:['維持運轉搶發電','暫不回應','簽約','照常運轉','接受延誤','略過'];
  for(const p of pref){const k=labels.indexOf(p);if(k>=0)return k}return 0;
};
BOT.apply=function(a){
  if(a.type==='market')market(a.a);
  else if(a.type==='build'){const ok=build(a.k,tile(a.i,a.j));if(!ok)BOT.bad.add(a.i+','+a.j);return ok}
  else if(a.type==='buy')buyParcel(S.parcels[a.py*NP+a.px]);
  else if(a.type==='research')research(a.k);
  else if(a.type==='policy')market('pol'+a.n);
  else if(a.type==='hire')market('hire');
  else if(a.type==='clear')doBulldoze(tile(a.i,a.j));
  else if(a.type==='pm'){const o=TURBS.find(x=>x.id===a.id);if(o)o.pm=true}
  return true;
};
// 快速跑完一整關（不錄影）：回傳每季紀錄與結算
BOT.run=function(levelId,style,seed){
  let a=seed;window.__grand=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  window.toast=()=>{};
  enterState(newState(levelId));closeModal();
  const log=[];
  for(let turn=0;turn<(LV.turns||32)&&!S.over;turn++){
    BOT.bad.clear();let g=0,x;
    while((x=BOT.plan(style))&&g++<45)BOT.apply(x);
    endTurn();
    const ch=[...document.querySelectorAll('.choice')];
    if(ch.length){const k=BOT.choice(style,ch.map(c=>c.querySelector('b').textContent));ch[k].click()}
    const go=document.querySelector('#rGo');if(go)go.click();
    closeModal();
    const h=S.hist[S.hist.length-1];log.push([h.l,+h.e.toFixed(1),h.av==null?null:+h.av.toFixed(3),Math.round(S.cash),+installedMW().toFixed(1)]);
  }
  const r=evalGoals().map(x=>({k:x.g.k,v:+x.v.toFixed(1),t:x.g.t,met:x.met}));
  return {level:levelId,style,seed,over:S.over,grade:gradeOf().grade,goals:r,cash:Math.round(S.cash),log};
};
window.BOT=BOT;
})();
