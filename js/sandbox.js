// 風場大亨 — 測試關卡工具
'use strict';
const SBX_EVENTS=[['typhoon',$t`颱風`],['monsoon',$t`季風增強`],['lowwind',$t`弱風`],['curtail',$t`電網限電`],['lightning',$t`雷擊`],['protest',$t`居民陳情`],['steelUp',$t`鋼價上漲`],['birds',$t`候鳥遷徙`],['heatwave',$t`用電尖峰`],['ppa',$t`企業購電`],['quiet',$t`平靜`]];
const SBX_MAPS=[['coast',$t`海岸`],['hills',$t`丘陵`],['offshore',$t`離岸`]];
function sbxRefresh(){reindex();buildCache();rebuildDrawables();updateHUD();save()}
function sbxFill(model){
  const m=MODELS[model];let n=0;
  // 由上風處往下風處掃描，盡量讓排列整齊
  const order=[...S.tiles].sort((a,b)=>(a.j-b.j)||(a.i-b.i));
  for(const t of order){if(!parcelAt(t.i,t.j).owned||t.o)continue;if(build(model,t,true))n++}
  sbxRefresh();toast(n?$t`已放置 ${n} 部 ${m.short} 風機`:$t`沒有可以放置的位置`,n?'good':'bad');
}
function sbxBulk(a){
  if(a==='fault')TURBS.forEach(o=>{if(o.state==='run'){o.state='fault';o.fault=pickFault();o.repairing=false}});
  else if(a==='repair')TURBS.forEach(o=>{if(o.state==='fault'){o.state='run';o.fault=-1;o.repairing=false}o.health=100});
  else if(a==='wear')TURBS.forEach(o=>{o.health=30});
  else if(a==='finish')TURBS.forEach(o=>{if(o.state==='build'){o.state='run';o.prog=MODELS[o.model].build}});
  else if(a==='clear'){S.objs=S.objs.filter(o=>o.type!=='turb');closeInspector()}
  else if(a==='clearAll'){S.objs=[];closeInspector()}
  sbxRefresh();
}
function showSandbox(){
  const x=S.sbx,on=v=>v?'true':'false';
  const html=`<div class="evhead"><div class="evicon tone-neutral">${ic('i-wrench')}</div><div><div class="sub">${$t`測試關卡`}</div><h2>${$t`測試工具`}</h2></div><button class="xbtn" id="mX" style="align-self:flex-start">${ic('i-x')}</button></div>
  <h4>${$t`地圖（切換會清空目前的建設）`}</h4>
  <div class="adm-seg wide">${SBX_MAPS.map(([k,t])=>`<button data-map="${k}" aria-pressed="${x.map===k}">${t}</button>`).join('')}</div>
  <h4>${$t`規則`}</h4>
  <div class="sbx-tg">
    <button data-tg="events" aria-pressed="${on(x.events)}"><b>${$t`隨機事件`}</b><span>${x.events?$t`開啟：每季照常抽事件`:$t`關閉：每季都風平浪靜`}</span></button>
    <button data-tg="instant" aria-pressed="${on(x.instant)}"><b>${$t`建造即完工`}</b><span>${$t`不用等工期`}</span></button>
    <button data-tg="free" aria-pressed="${on(x.free)}"><b>${$t`忽略間距限制`}</b><span>${$t`可以緊鄰民宅、緊鄰其他風機、不必鋪路`}</span></button>
    <button data-tg="grid" aria-pressed="${on(x.grid)}"><b>${$t`自動併網`}</b><span>${x.grid?$t`開啟：不用蓋變電站也能發電`:$t`關閉：照正常規則需要變電站`}</span></button>
  </div>
  <h4>${$t`下一季強制事件${x.force?`：<b style="color:var(--accent)">${(SBX_EVENTS.find(e=>e[0]===x.force)||[])[1]}</b>`:''}`}</h4>
  <div class="sbx-chips">${SBX_EVENTS.map(([k,t])=>`<button class="btn sm" data-ev="${k}" aria-pressed="${x.force===k}">${t}</button>`).join('')}</div>
  <h4>${$t`一鍵填滿自有土地`}</h4>
  <div class="sbx-chips">${Object.keys(MODELS).map(k=>`<button class="btn sm" data-fill="${k}">${MODELS[k].short}${MODELS[k].floating?$t` 深海`:MODELS[k].offshore?$t` 淺海`:''}</button>`).join('')}</div>
  <h4>${$t`批次操作`}</h4>
  <div class="sbx-chips">
    <button class="btn sm" data-bulk="finish">${$t`全部完工`}</button><button class="btn sm" data-bulk="fault">${$t`全部故障`}</button><button class="btn sm" data-bulk="repair">${$t`全部修復`}</button>
    <button class="btn sm" data-bulk="wear">${$t`健康度設為 30%`}</button><button class="btn sm danger" data-bulk="clear">${$t`清除所有風機`}</button><button class="btn sm danger" data-bulk="clearAll">${$t`清除所有建設`}</button>
  </div>
  <p style="font-size:12.5px">${$t`測試關卡資金無限、不會破產、不計成績。按「結束本季」照常結算，可以觀察發電量、可用率與尾流。`}</p>`;
  const c=openModal(html,'wide',true);
  $('#mX').onclick=closeModal;
  for(const b of c.querySelectorAll('[data-map]'))b.onclick=()=>{if(b.dataset.map===x.map)return;const keep=Object.assign({},x,{map:b.dataset.map,force:''});enterState(newState('sandbox',{map:b.dataset.map,sbx:keep}));save();showSandbox()};
  for(const b of c.querySelectorAll('[data-tg]'))b.onclick=()=>{x[b.dataset.tg]=!x[b.dataset.tg];reindex();if(MODELS[tool]||FAC[tool])computeValid();updateHUD();save();showSandbox()};
  for(const b of c.querySelectorAll('[data-ev]'))b.onclick=()=>{x.force=x.force===b.dataset.ev?'':b.dataset.ev;save();showSandbox()};
  for(const b of c.querySelectorAll('[data-fill]'))b.onclick=()=>{closeModal();sbxFill(b.dataset.fill)};
  for(const b of c.querySelectorAll('[data-bulk]'))b.onclick=()=>{sbxBulk(b.dataset.bulk);toast($t`完成`,'good')};
}
