// 風場大亨 — 事件與回合結算
'use strict';
// ================= events =================
const TY_NAMES=['海葵','杜蘇芮','凱米','山陀兒','卡努','小犬','蘇拉','軒嵐諾','康芮','丹娜絲','薇帕','楊柳'];
function typhoonEvent(){
    const nm=TY_NAMES[Math.floor(GR()*TY_NAMES.length)];
    return {id:'typhoon',title:`颱風「${nm}」逼近`,icon:'i-storm',tone:'bad',storm:true,
      desc:'氣象署發布海上陸上颱風警報，預估陣風超過 17 級。要讓機組提前順槳、鎖定轉子嗎？',
      choices:[
        {label:'預防性停機',sub:'每部機組少發約 12% 電量（外部因素，不計入可用率），受損機率約 4%',apply:ev=>{ev.typhoon='safe';ev.note='已提前順槳停機'}},
        {label:'維持運轉搶發電',sub:'本季風速 +8%，每部機組約 22% 機率受損（離岸 32%）',apply:ev=>{ev.typhoon='risky';ev.windMul=1.08;ev.note='颱風期間持續運轉'}},
      ]};
}
function eventPool(){
  const se=season(),R=GR,T=TURBS.filter(o=>o.state!=='build'),run=T.filter(o=>o.state==='run'),mw=installedMW();
  const noisy=TURBS.filter(o=>houseNear(o.i,o.j,4));
  return [
    {id:'monsoon',name:'東北季風增強',w:1.1,ok:se.q==='Q1'||se.q==='Q4',mk:()=>({title:'東北季風增強',icon:'i-wind',tone:'good',desc:'大陸冷氣團南下，海峽風速明顯增強。',note:'本季風速 +12%',windMul:1.12})},
    {id:'lowwind',name:'弱風季',w:.8,mk:()=>({title:'高壓滯留・弱風',icon:'i-wind',tone:'bad',desc:'太平洋高壓籠罩，大氣穩定，整季風況偏弱。',note:'本季風速 −14%',windMul:.86})},
    {id:'curtail',name:'電網限電',w:MOD('curtailW'),ok:mw>=20,mk:()=>({title:'電網壅塞限電',icon:'i-bolt',tone:'bad',desc:'區域輸電線路檢修，電力調度要求風場降載。儲能系統可以吸收部分電量。',note:`限電 ${Math.round(MOD('curtailAmt')*100)}%，每座儲能減少四分之一損失`,curtail:MOD('curtailAmt')})},
    {id:'steelUp',name:'鋼價上漲',w:.8,mk:()=>({title:'國際鋼價上漲',icon:'i-trend',tone:'bad',desc:'國際鋼胚報價走揚，國內鋼材市價上漲 35%。',note:'鋼材價格 +35%',now:()=>{S.price.steel*=1.35}})},
    {id:'steelDown',name:'鋼價回落',w:.6,mk:()=>({title:'鋼價回落',icon:'i-trenddown',tone:'good',desc:'全球需求趨緩，鋼材報價回落 20%，是囤料的好時機。',note:'鋼材價格 −20%',now:()=>{S.price.steel*=.8}})},
    {id:'bladeShort',name:'葉片缺貨',w:.6,mk:()=>({title:'葉片供應吃緊',icon:'i-blade',tone:'bad',desc:'玻纖與樹脂原料短缺，葉片製造商延後交期並調漲報價。',note:'葉片價格 +50%',now:()=>{S.price.blade*=1.5}})},
    {id:'lightning',name:'雷擊',w:1,ok:run.length>=1,mk:()=>{const o=run[Math.floor(R()*run.length)];return {title:'雷擊事件',icon:'i-bolt',tone:'bad',desc:`${tname(o)} 遭落雷擊中，葉尖接閃器燒損，需要更換葉片。`,note:`${tname(o)} 停機待修`,strike:o.id}}},
    {id:'protest',name:'居民陳情',w:1.3,ok:noisy.length>0,mk:()=>({title:'居民陳情',icon:'i-people',tone:'warn',desc:'鄰近村落居民反映夜間低頻噪音與葉片光影閃爍，里長希望風場給個說法。',
      choices:[{label:'支付敦親睦鄰回饋金',sub:'支出 6M，民眾支持度 +6',apply:ev=>{ev.cost=6;ev.support=6;ev.note='已撥付回饋金'}},
               {label:'夜間降載運轉',sub:'本季發電 −4%，民眾支持度 +3',apply:ev=>{ev.energyMul=.96;ev.support=3;ev.note='夜間降載'}},
               {label:'暫不回應',sub:'民眾支持度 −8',apply:ev=>{ev.support=-8;ev.note='居民不滿升高'}}]})},
    {id:'subsidy',name:'綠電加碼',w:.5,mk:()=>({title:'綠電政策加碼',icon:'i-coin',tone:'good',desc:'政府調高再生能源躉購費率，鼓勵業者加速布建。',note:'售電費率 +0.4 元/度，持續 4 季',now:()=>{S.tmods.push({d:.4,t:4})}})},
    {id:'ppa',name:'企業購電契約',w:.6,ok:mw>=30&&!S.flags.ppa,mk:()=>({title:'企業綠電購售契約',icon:'i-doc',tone:'neutral',desc:'一家半導體廠想簽 6 季綠電契約：先預付一筆款項，換取較低的單價。',
      choices:[{label:'簽約',sub:'立即入帳 45M，往後 6 季售電費率 −0.3 元/度',apply:ev=>{ev.gain=45;S.tmods.push({d:-.3,t:6});S.flags.ppa=1;ev.note='已簽訂 PPA'}},
               {label:'婉拒',sub:'維持現行費率',apply:ev=>{ev.note='維持現行費率'}}]})},
    {id:'birds',name:'候鳥遷徙',w:.8,ok:(se.q==='Q2'||se.q==='Q4')&&T.length>=4,mk:()=>({title:'候鳥遷徙季',icon:'i-bird',tone:'warn',desc:'候鳥沿海岸線遷徙，保育團體要求風場在遷徙高峰降低轉速。',
      choices:[{label:'啟用鳥類雷達降載',sub:'發電 −3%、支出 2M、民眾支持度 +4',apply:ev=>{ev.energyMul=.97;ev.cost=2;ev.support=4;ev.note='雷達偵測降載'}},
               {label:'照常運轉',sub:'約 35% 機率遭裁罰 12M、支持度 −6',apply:ev=>{if(GR()<.35){ev.cost=12;ev.support=-6;ev.note='遭主管機關裁罰 12M'}else ev.note='未遭裁罰'}}]})},
    {id:'heatwave',name:'用電尖峰',w:.7,ok:se.q==='Q3',mk:()=>({title:'夏季用電尖峰',icon:'i-sun',tone:'good',desc:'全台用電量創新高，綠電與儲能需求強勁。',note:'本季售電 +0.3 元/度，儲能收益加倍',tariffNow:.3,bessMul:2})},
    {id:'crane',name:'吊車延誤',w:.8,ok:TURBS.some(o=>o.state==='build'),mk:()=>{const o=TURBS.find(x=>x.state==='build');return {title:'大型吊車檔期衝突',icon:'i-crane',tone:'warn',desc:`${tname(o)} 工地預約的大型履帶吊車被調往其他案場。`,
      choices:[{label:'加價調度',sub:'支出 5M，工期不受影響',apply:ev=>{ev.cost=5;ev.note='加價調度吊車'}},{label:'接受延誤',sub:`${tname(o)} 工期延後一季`,apply:ev=>{ev.delay=o.id;ev.note='工期延後'}}]}}},
    {id:'town',name:'地方說明會',w:.6,ok:S.support<55,mk:()=>({title:'地方說明會',icon:'i-people',tone:'neutral',desc:'鄉公所建議舉辦說明會，說明風場開發與地方回饋計畫。',
      choices:[{label:'舉辦說明會並設立獎學金',sub:'支出 4M，民眾支持度 +7',apply:ev=>{ev.cost=4;ev.support=7;ev.note='說明會順利'}},{label:'略過',sub:'民眾支持度 −2',apply:ev=>{ev.support=-2;ev.note='錯過溝通機會'}}]})},
    {id:'techcoop',name:'技術合作',w:.5,ok:S.turn>=3&&Object.keys(TECH).some(k=>!S.tech[k])&&!S.flags.techDisc,mk:()=>({title:'國產化技術合作',icon:'i-flask',tone:'good',desc:'研究法人提供技術移轉，下一項研發費用打六折。',note:'下一項研發 −40%',now:()=>{S.flags.techDisc=1}})},
    {id:'quiet',name:'平靜',w:1.3,mk:()=>({title:'風平浪靜的一季',icon:'i-leaf',tone:'neutral',desc:'天氣穩定，現場作業順利進行。',note:'無特殊事件'})},
  ];
}
// 測試關卡可指定事件；指定的事件條件不符時改為平靜
function forcedEvent(id){
  if(id==='typhoon')return typhoonEvent();
  const p=eventPool().find(x=>x.id===id);
  if(!p||p.ok===false){toast('目前條件不符，無法觸發這個事件','bad');return eventPool().find(x=>x.id==='quiet').mk()}
  return p.mk();
}
function rollEvent(){
  const se=season(),T=TURBS.filter(o=>o.state!=='build');
  if(LV.noEvents)return eventPool().find(x=>x.id==='quiet').mk();
  if(S.sbx){
    if(S.sbx.force){const f=S.sbx.force;S.sbx.force='';return forcedEvent(f)}
    if(!S.sbx.events)return eventPool().find(x=>x.id==='quiet').mk();
  }
  if(T.length&&GR()<Math.min(.95,se.typhoon*MOD('typhoon')))return typhoonEvent();
  const pool=eventPool().filter(p=>p.ok!==false);
  let tot=pool.reduce((s,p)=>s+p.w,0),r=GR()*tot;
  for(const p of pool){r-=p.w;if(r<=0)return p.mk()}
  return pool[pool.length-1].mk();
}

// ================= turn =================
function endTurn(){
  if(modalOpen)return;
  if(S.over){showFinal();return}
  cancelPreview();sfx('whoosh');
  const ev=rollEvent();
  if(ev.storm)weatherFx='storm';
  if(ev.choices)showEvent(ev);
  else{if(ev.now)ev.now();runTurn(ev)}
}
function runTurn(ev){const rep=processTurn(ev);showReport(rep)}
function processTurn(ev){
  const se=season(),R=GR;
  const rep={label:dateLabel(S.turn),se,ev:{title:ev.title,desc:ev.desc,icon:ev.icon,tone:ev.tone,picked:ev.picked,note:ev.note||''},inc:[],built:[],builtIds:[],energy:0,ideal:0,mwAct:0,upW:0,wakeW:0,vW:0,cost:{om:0,crew:0,fac:0,repair:0,event:0,interest:0}};
  const wm=se.wind*(.93+R()*.14)*(ev.windMul||1);
  const flows=se.mix?[[NE,.5],[SW,.5]]:[[se.dir,1]];
  let free=S.crews,vfree=S.vessels;
  const ops=!!LV.offshoreOps,sea=se.sea*(ev.seaMul||1);
  rep.sea=ops?sea:null;
  const seaOK=()=>GR()<sea;
  for(const o of TURBS)if(o.state==='build'){
    const off=offJob(o);
    if(off)vfree--;else free--;
    if(ev.delay===o.id){rep.inc.push({tone:'warn',txt:`${tname(o)} 吊車延誤，工期順延一季`});continue}
    if(off&&!seaOK()){rep.inc.push({tone:'warn',txt:`${tname(o)} 海況不佳，工作船無法出海施工`});continue}
    o.prog++;
    if(o.prog>=MODELS[o.model].build){o.state='run';o.fresh=true;o.health=100;rep.built.push(`${tname(o)}（${MODELS[o.model].short}）`);rep.builtIds.push(o.id)}
  }
  free=Math.max(0,free);vfree=Math.max(0,vfree);
  const faults=TURBS.filter(o=>o.state==='fault').sort((a,b)=>MODELS[b.model].mw-MODELS[a.model].mw);
  for(const o of faults){
    o.waitBlade=false;o.waitCrew=false;o.waitSea=false;
    const off=offJob(o);
    if(off?vfree<=0:free<=0){o.waitCrew=true;rep.inc.push({tone:'warn',txt:`${tname(o)} ${off?'沒有空閒工作船':'等待工班'}，持續停機`});continue}
    const f=FAULTS[o.fault]||FAULTS[0];
    if(!o.repairing){
      if(f.blade&&S.blades<f.blade){o.waitBlade=true;rep.inc.push({tone:'warn',txt:`${tname(o)} 缺少備品葉片，無法維修`});continue}
      S.blades-=f.blade||0;rep.cost.repair+=f.cost;o.repairing=true;o.rprog=0;
    }
    if(off){vfree--;if(!seaOK()){o.waitSea=true;rep.inc.push({tone:'warn',txt:`${tname(o)} 海況不佳，維修船無法出海`});continue}}else free--;
    o.rprog++;
  }
  for(const o of TURBS)if(o.pm&&o.state==='run'){const off=offJob(o);if(off?vfree>0:free>0){if(off)vfree--;else free--;o.pmDo=true;o.pm=false;rep.cost.repair+=3}}
  const grid=gridAssign();
  const bessN=facsOf('bess').length;
  const curtail=(ev.curtail||0)*Math.max(0,1-.25*bessN);
  for(const o of TURBS){
    const m=MODELS[o.model];o.e=0;
    if(o.state==='build'){o.av=null;continue}
    const act=o.fresh?.45:1;let up=act,newF=false,ext=0; // ext：外部因素停機（颱風預防停機），損失發電但不計入可用率
    if(o.state==='fault'){
      if(o.repairing&&o.rprog>=repairTurns(o)){o.state='run';o.repairing=false;o.fault=-1;o.health=Math.max(o.health,72);up=act*(omNear(o)?.7:.5);rep.inc.push({tone:'good',txt:`${tname(o)} 修復完成，恢復併網`})}
      else up=0;
    }
    if(o.pmDo){o.health=100;up=Math.max(0,up-.06*act);o.pmDo=false;rep.inc.push({tone:'good',txt:`${tname(o)} 完成預防性維護`})}
    if(o.state==='run'&&ev.typhoon){
      if(ev.typhoon==='safe')ext=.12*act;
      const pd=ev.typhoon==='safe'?.04:(m.offshore?.32:.22);
      if(R()<pd){o.health=Math.max(5,o.health-(28+R()*16));o.state='fault';o.fault=5;o.repairing=false;up*=.5;newF=true;rep.inc.push({tone:'bad',txt:`${tname(o)} 颱風造成葉片損傷`})}
    }
    if(o.state==='run'&&ev.strike===o.id){o.state='fault';o.fault=6;o.repairing=false;up-=act*.3;newF=true;rep.inc.push({tone:'bad',txt:`${tname(o)} 雷擊，葉尖受損`})}
    if(o.state==='run'&&!newF&&R()<faultProb(o)){o.fault=pickFault();o.state='fault';o.repairing=false;up-=act*(.2+R()*.45);rep.inc.push({tone:'bad',txt:`${tname(o)} ${FAULTS[o.fault].n}`})}
    up=clamp(up,0,act);
    const v=tile(o.i,o.j).wind*wm*shear(m),c=cf(o.model,v);
    let wk=0;for(const[f,w]of flows)wk+=w*wakeLoss(o.i,o.j,f,o,false);
    const gf=grid.fac.get(o)||0;
    const e=m.mw*c*HOURS*Math.max(0,up-ext)*(1-wk)*gf*(1-curtail)*(ev.energyMul||1)*.97;
    o.e=e;o.av=up/act;o.wake=wk;o.v=v;
    rep.energy+=e;rep.ideal+=m.mw*c*HOURS*act;rep.mwAct+=m.mw*act;rep.upW+=m.mw*up;rep.wakeW+=wk*m.mw*act;rep.vW+=v*m.mw*act;
    if(!gf)rep.inc.push({tone:'warn',txt:`${tname(o)} 未併網，發電無法售出`});
    o.health=clamp(o.health-POLICY[S.policy].decay*(.7+R()*.6)*(m.offshore?1.25:1),5,100);
    o.age++;o.fresh=false;
  }
  const tr=tariff()+(ev.tariffNow||0);
  rep.tariff=tr;rep.rev=rep.energy*tr/1000;rep.bess=bessN*1.6*(ev.bessMul||1);rep.gain=ev.gain||0;
  rep.cost.om=TURBS.filter(o=>o.state!=='build').reduce((s,o)=>s+MODELS[o.model].om,0)*POLICY[S.policy].cost;
  rep.cost.crew=S.crews*CREW_PAY+S.vessels*VESSEL_PAY;
  rep.cost.fac=FACS.reduce((s,f)=>s+FAC[f.kind].up,0);
  rep.cost.event=ev.cost||0;
  rep.cost.fund=FUND[S.fund||0].cost;
  rep.cost.interest=S.cash<0?-S.cash*.025:0;
  const costT=Object.values(rep.cost).reduce((a,b)=>a+b,0);
  rep.net=rep.rev+rep.bess+rep.gain-costT;
  S.cash+=rep.net;
  const s0=S.support;
  let ds=(58-S.support)*.06-TURBS.filter(o=>houseNear(o.i,o.j,3)).length*.4+Math.min(2,facsOf('om').length*.6)+FUND[S.fund||0].sup+(ev.support||0);
  if(ev.typhoon&&rep.inc.filter(x=>x.tone==='bad').length>2)ds-=2;
  S.support=clamp(S.support+ds,0,100);rep.dSup=S.support-s0;
  S.tmods.forEach(m=>m.t--);S.tmods=S.tmods.filter(m=>m.t>0);
  S.price.steel=clamp(S.price.steel*(1+(R()-.5)*.1)+(.11-S.price.steel)*.22,.06,.25);
  S.price.blade=clamp(S.price.blade*(1+(R()-.5)*.08)+(6.5-S.price.blade)*.22,3.5,14);
  rep.av=rep.mwAct>0?rep.upW/rep.mwAct:null;
  rep.pr=rep.ideal>0?rep.energy/rep.ideal:null;
  rep.cf=rep.mwAct>0?rep.energy/(rep.mwAct*HOURS):null;
  rep.wake=rep.mwAct?rep.wakeW/rep.mwAct:null;
  rep.v=rep.mwAct?rep.vW/rep.mwAct:null;
  rep.curtail=curtail;
  S.turn++;
  S.hist.push({l:rep.label,e:rep.energy/1000,av:rep.av,pr:rep.pr,cf:rep.cf,wk:rep.wake,cash:S.cash,net:rep.net,mw:installedMW()});
  if(S.sbx){S.cash=Math.max(S.cash,999999)}
  else if(S.cash<-credit())S.over='bankrupt';else if(LV.turns&&S.turn>=LV.turns)S.over='done';
  if(S.over)recordResult();
  reindex();buildCache();rebuildDrawables();save();updateHUD();
  if(rep.net)floatTextScreen(`${rep.net>=0?'+':'−'}${fmt(Math.abs(rep.net),1)}M`,rep.net>=0?'#8ff0b4':'#ff9d92');
  return rep;
}

