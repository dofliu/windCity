// 風場大亨 — HUD、面板、彈窗
'use strict';
// ================= UI =================
function toast(msg,tone){const d=document.createElement('div');d.className='toast '+(tone||'');d.textContent=msg;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),2600);while($('#toasts').children.length>3)$('#toasts').firstChild.remove()}
const ic=id=>`<svg class="ic"><use href="#${id}"/></svg>`;
function costHTML(cost){
  if(!cost)return '';
  const sh=(ok)=>ok?'':' class="short"';
  let h=`<span class="cost"><span${sh(S.cash-cost.cash>=-credit())}>${ic('i-coin')}${fmt(cost.cash,cost.cash<1?1:0)}M</span>`;
  if(cost.steel)h+=`<span${sh(S.steel>=cost.steel)}>${ic('i-steel')}${cost.steel} t</span>`;
  if(cost.blades)h+=`<span${sh(S.blades>=cost.blades)}>${ic('i-blade')}${cost.blades} 組</span>`;
  return h+'</span>';
}
function setChip(id,html,neg){const el=$('#c-'+id);el.querySelector('.v').innerHTML=html;el.classList.toggle('neg',!!neg)}
function updateHUD(){
  const se=season();
  $('#date').innerHTML=`${dateLabel(S.turn)}<span>${LV.no?`第 ${LV.no} 關・`:''}${LV.name}・${se.name}季</span>`;
  const sb=SBX();
  setChip('cash',sb?'∞':`${fmt(S.cash,1)}<small>M</small>`,!sb&&S.cash<0);
  setChip('steel',sb?'∞':`${Math.round(S.steel)}<small>/${steelCap()} t</small>`);
  setChip('blade',sb?'∞':`${S.blades}<small>/${bladeCap()} 組</small>`);
  setChip('crew',sb?'∞':`${S.crews-crewBusy()}<small>/${S.crews} 可用</small>`,!sb&&S.crews-crewBusy()<=0);
  $('#c-ves').hidden=!LV.offshoreOps||sb;
  if(LV.offshoreOps&&!sb)setChip('ves',`${S.vessels-vesselBusy()}<small>/${S.vessels} 艘</small>`,S.vessels-vesselBusy()<=0);
  setChip('sup',`${Math.round(S.support)}<small>%</small>`,S.support<35);
  $('#kMW').textContent=fmt(installedMW(),1);
  const pm=pipelineMW();$('#kPipe').textContent=pm?`+${fmt(pm,1)} 建造中`:'';
  const h=S.hist[S.hist.length-1];
  const setK=(id,cell,val,cls)=>{$(id).textContent=val;const c=$(cell);c.classList.remove('good','warn','bad');if(cls)c.classList.add(cls)};
  if(h&&h.av!=null){
    setK('#kE','#g-e',fmt(h.e,1));
    setK('#kCF','#g-cf',fmt(h.cf*100,1),h.cf>=.3?'good':h.cf>=.22?'warn':'bad');
    setK('#kAV','#g-av',fmt(h.av*100,1),h.av>=.96?'good':h.av>=.92?'warn':'bad');
    setK('#kPR','#g-pr',fmt(h.pr*100,1),h.pr>=.85?'good':h.pr>=.75?'warn':'bad');
    setK('#kWK','#g-wk',fmt(h.wk*100,1),h.wk<.08?'good':h.wk<.15?'warn':'bad');
  }else for(const[a,b]of[['#kE','#g-e'],['#kCF','#g-cf'],['#kAV','#g-av'],['#kPR','#g-pr'],['#kWK','#g-wk']])setK(a,b,'—');
  setK('#kTR','#g-tr',tariff().toFixed(2));
  const f=se.dir,s=sv(f[0],f[1]);$('#wArrow').style.transform=`rotate(${Math.atan2(s[1],s[0])}rad)`;
  const own=S.tiles.filter(t=>parcelAt(t.i,t.j).owned&&!isWater(t));
  const avg=own.length?own.reduce((a,t)=>a+t.wind,0)/own.length*se.wind:0;
  $('#kWind').innerHTML=`${se.label}・場址均風 <b>${fmt(avg,1)}</b> m/s`;
  drawSpark();
  $('#nextLbl').textContent=S.over?'查看結算':`結束 ${dateLabel(S.turn)}`;
  $('#nextSub').textContent=S.over?'':LV.turns?`剩 ${turnsLeft()} 季`:'無回合限制';
  $('#bGoals').innerHTML=sb?`${ic('i-wrench')}工具`:`${ic('i-target')}目標`;
  renderTray(true);
  if(selected)renderInspector();
  if(MODELS[tool]||FAC[tool])computeValid();
}
function drawSpark(){
  const cvs=$('#spark'),r=cvs.getBoundingClientRect();if(!r.width)return;
  const d=Math.min(2,devicePixelRatio||1);cvs.width=r.width*d;cvs.height=r.height*d;const c=cvs.getContext('2d');c.scale(d,d);
  const hs=S.hist.slice(-12),n=12,w=r.width,h=r.height,bw=w/n;
  c.clearRect(0,0,w,h);
  c.fillStyle='rgba(255,255,255,.05)';for(let k=0;k<n;k++)c.fillRect(k*bw+1.5,4,bw-3,h-16);
  const mx=Math.max(1,...hs.map(x=>x.e));
  hs.forEach((x,k)=>{const idx=n-hs.length+k,bh=(x.e/mx)*(h-16);const g=c.createLinearGradient(0,h-12-bh,0,h-12);g.addColorStop(0,'#8de3f2');g.addColorStop(1,'#3fa9c0');c.fillStyle=g;c.fillRect(idx*bw+1.5,h-12-bh,bw-3,bh)});
  c.fillStyle='#8fa7ae';c.font='600 9px "Barlow Condensed",sans-serif';c.textAlign='left';c.fillText(hs.length?'近 12 季發電量 (GWh)':'結束本季後開始累積發電紀錄',0,h-1);
  if(hs.length){c.textAlign='right';c.fillStyle='#edf4f2';c.fillText(`峰值 ${fmt(mx,1)}`,w,h-1)}
}
function computeValid(){
  validMap=new Map();
  if(!(MODELS[tool]||FAC[tool]))return;
  S.tiles.forEach((t,k)=>{if(parcelAt(t.i,t.j).owned&&(MODELS[tool]||FAC[tool].water?true:!isWater(t)))validMap.set(k,check(tool,t.i,t.j).ok)});
}

// ---- dock & tray ----
const thumbs={};
function thumb(kind){
  if(thumbs[kind])return thumbs[kind];
  const cvs=document.createElement('canvas');cvs.width=232;cvs.height=132;const c=cvs.getContext('2d');c.scale(2,2);
  const m=MODELS[kind];
  c.translate(58,m?56:42);
  const sc=m?44/(m.hub+m.rr*.6):1;c.scale(sc,sc);
  const wet=(m&&m.offshore)||kind==='osub',deep=m&&m.floating;
  poly(c,[iso(-.5,-.5),iso(.5,-.5),iso(.5,.5),iso(-.5,.5)],deep?'#2f86a8':wet?'#3fb3c2':'#6fae4a');
  const dep=m?6/sc:6;poly(c,[iso(-.5,.5),iso(.5,.5),[iso(.5,.5)[0],iso(.5,.5)[1]+dep],[iso(-.5,.5)[0],iso(-.5,.5)[1]+dep]],wet?'#2a8aa0':'#8e6a47');
  poly(c,[iso(.5,-.5),iso(.5,.5),[iso(.5,.5)[0],iso(.5,.5)[1]+dep],[iso(.5,-.5)[0],iso(.5,-.5)[1]+dep]],wet?'#1f6f84':'#6f5237');
  if(kind==='port'){poly(c,[iso(-.5,-.5),iso(.5,-.5),iso(.5,0),iso(-.5,0)],'#3fb3c2')}
  if(m)drawTurbine(c,0,0,m,.35,{state:'run',flow:NE,id:0});
  else if(kind==='road'){const t={i:0,j:0};c.translate(0,-16);poly(c,[iso(.22,0),iso(.78,0),iso(.78,1),iso(.22,1)],'#a9a69a');poly(c,[iso(.27,0),iso(.73,0),iso(.73,1),iso(.27,1)],'#5c6167');c.strokeStyle='rgba(240,232,200,.85)';c.setLineDash([2.6,2.6]);const a=iso(.5,0),b=iso(.5,1);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.setLineDash([])}
  else drawFac(c,0,0,kind,null);
  thumbs[kind]=cvs;return cvs;
}
const TRAY={get turb(){return lvModels()},get fac(){return lvFacs()}};
const FAC_SPEC={sub:`併網半徑 6.5 格・80 MW`,om:'影響半徑 7 格',mast:'量測半徑 5 格',ware:'擴充庫容',bess:'削減限電損失',road:'每格 0.6M',port:'停泊 3 艘工作船',osub:'半徑 8 格・300 MW'};
function renderTray(light){
  const tr=$('#tray');
  if(cat==='turb'||cat==='fac'){
    if(!light||!tr.dataset.cat||tr.dataset.cat!==cat){
      tr.innerHTML='';tr.dataset.cat=cat;
      for(const k of TRAY[cat]){
        const m=MODELS[k],f=FAC[k],b=document.createElement('button');b.className='item';b.dataset.k=k;
        b.appendChild(thumb(k).cloneNode());b.querySelector('canvas').getContext('2d').drawImage(thumb(k),0,0);
        b.insertAdjacentHTML('beforeend',`<div class="nm">${m?m.name:f.name}</div><div class="sp">${m?`${m.short}・${m.floating?'深海':m.offshore?'淺海':'輪轂 '+m.hubM+' m'}`:FAC_SPEC[k]}</div><div class="cs"></div>`);
        b.addEventListener('click',()=>pickItem(k));tr.appendChild(b);
      }
    }
    for(const b of tr.querySelectorAll('.item')){
      const k=b.dataset.k,m=MODELS[k],f=FAC[k],src=m||f;
      b.setAttribute('aria-pressed',String(tool===k));
      const cs=b.querySelector('.cs');
      const short=!SBX()&&(S.cash-src.cash<-credit()||S.steel<(src.steel||0)||(m&&S.blades<m.blades));
      cs.textContent=SBX()?'免費':`${fmt(src.cash,src.cash<1?1:0)}M${k==='osub'?'+海纜':''}${src.steel?` · ${src.steel}t`:''}${m?` · ${m.blades}葉`:''}`;cs.classList.toggle('short',!!short);
      let lk=b.querySelector('.lock');
      if(m&&m.tech&&!S.tech[m.tech]){if(!lk){lk=document.createElement('div');lk.className='lock';b.appendChild(lk)}lk.innerHTML=`${ic('i-lock')}需研發<small>${techCost(m.tech)}M</small>`}else if(lk)lk.remove();
    }
    tr.hidden=!!(selected&&W<700);
  }else if(cat==='land'){
    tr.dataset.cat='land';tr.innerHTML=`<div class="hint">點選任一<b>未擁有的地塊</b>查看價格，再按一次確認購買。地塊價格依風況、海域與民眾支持度浮動；買下後會自動完成風況初勘。</div>`;tr.hidden=false;
  }else if(cat==='bull'){
    tr.dataset.cat='bull';tr.innerHTML=`<div class="hint">點選<b>林木</b>直接清除（1.5M，支持度略降）、點<b>道路</b>移除；點<b>風機或設施</b>會先顯示回收金額，再按一次拆除。</div>`;tr.hidden=false;
  }else{tr.hidden=true;tr.dataset.cat=''}
}
function pickItem(k){
  const m=MODELS[k];
  if(m&&m.tech&&!S.tech[m.tech]){preview={tech:m.tech};showConfirm();return}
  setTool(tool===k?null:k);
}
function setTool(k){
  cancelPreview(true);
  tool=k||'inspect';
  if(autoOverlay){setOverlay(null);autoOverlay=false}
  if(MODELS[tool]&&!overlay){setOverlay('wind');autoOverlay=true}
  if(tool==='sub'&&!overlay){setOverlay('grid');autoOverlay=true}
  if(tool==='buy'&&overlay!=='land'){setOverlay('land');autoOverlay=true}
  validMap=null;if(MODELS[tool]||FAC[tool])computeValid();
  renderTray(true);
}
function setCat(c){
  cat=c;for(const b of document.querySelectorAll('.cat'))b.setAttribute('aria-pressed',String(b.dataset.cat===c));
  if(c==='inspect')setTool(null);
  else if(c==='land')setTool('buy');
  else if(c==='bull')setTool('bulldoze');
  else{setTool(null);closeInspector()}
  if(c!=='inspect')closeInspector();
  renderTray();
}
function setOverlay(o){overlay=o;for(const b of document.querySelectorAll('.lay'))b.setAttribute('aria-pressed',String(b.dataset.ov===o));
  const lg=$('#legend');
  if(o==='wind'){lg.hidden=false;lg.innerHTML=`輪轂高 100 m 年均風速<div class="bar"></div><div class="sc"><span>5</span><span>7.5</span><span>10 m/s</span></div><div style="margin-top:5px">深色格＝尚未量測</div>`}
  else if(o==='wake'){lg.hidden=false;lg.innerHTML=`本季主風向下的尾流範圍。風機沿<b style="color:var(--text)">垂直風向</b>排成一列、順風方向拉開 5 格以上，損失最小。`}
  else if(o==='grid'){lg.hidden=false;lg.innerHTML=`藍圈是變電站併網範圍，黃虛線是集電線路，紅圈是未併網風機。`}
  else lg.hidden=true;
}
function cancelPreview(){preview=null;$('#confirm').hidden=true}
function showConfirm(){
  const el=$('#confirm');if(!preview){el.hidden=true;return}
  let title='',body='',okLbl='建造',ok=true;
  if(preview.tech){const k=preview.tech,T=TECH[k];title=`${ic('i-flask')} 研發：${T.name}`;body=`${T.desc}<br>${costHTML({cash:techCost(k)})}${S.flags.techDisc?'　<span class="pill good">技術合作六折</span>':''}`;okLbl='研發';ok=S.cash-techCost(k)>=-credit()}
  else if(preview.tool==='buy'){
    const c=preview.chk,p=c.p;title=`購買地塊 ${parcelName(p)}`;
    let land=0,sh=0,hs=0,ws=0,wn=0;for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++){const t=tile(i,j);if(t.t==='shallow')sh++;else if(!isWater(t))land++;if(t.house)hs++;if(t.sv&&!isWater(t)){ws+=t.wind;wn++}}
    body=p.owned?'這塊地已經是你的了':`陸地 <b>${land}</b> 格・淺海 <b>${sh}</b> 格・民宅 <b>${hs}</b> 戶・${wn?`已測均風 <b>${fmt(ws/wn,1)}</b> m/s`:'風況未量測'}<br>${costHTML(c.cost)}${c.ok?'':` <span class="err">${c.r}</span>`}`;
    okLbl='購買';ok=c.ok;
  }else if(preview.tool==='bulldoze'){
    const b=preview.chk;title=`拆除 ${tname(b.o)}`;body=`回收 <b>${b.cash}M</b>${b.steel?`、鋼材 <b>${b.steel} t</b>`:''}${b.blades?`、葉片 <b>${b.blades} 組</b>`:''}。拆除後無法復原。`;okLbl='拆除';
  }else{
    const t=preview.t,c=preview.chk,m=MODELS[preview.tool],f=FAC[preview.tool];
    title=`${m?m.name:f.name}<span class="pill mute">${parcelName(parcelAt(t.i,t.j))}・(${t.i},${t.j})</span>`;
    let info='';
    if(m&&(m.floating?t.t==='deep':m.offshore?t.t==='shallow':!isWater(t))){
      if(t.sv){const e=estAnnual(preview.tool,t.i,t.j,null),wk=wakeAnnual(t.i,t.j,null,true),v=t.wind*shear(m);info=`輪轂風速 <b>${fmt(v,1)}</b> m/s・容量因數 <b>${fmt(e/(m.mw*8760)*100,1)}</b>%・尾流 <b>${fmt(wk*100,1)}</b>%・年發電 <b>${fmt(e/1000,1)}</b> GWh<br>`;
        const reach=facsOf('sub').some(s=>Math.hypot(s.i-t.i,s.j-t.j)<=FAC.sub.range)||(facsOf('sub').length&&facsOf('osub').some(s=>Math.hypot(s.i-t.i,s.j-t.j)<=FAC.osub.range));
        if(!reach)info+=`<span class="err">附近沒有變電站，建好後無法併網</span><br>`;
        if(offJob({model:preview.tool}))info+=`本季海況窗口約 <b>${Math.round(season().sea*100)}</b>%，施工進度看天吃飯<br>`;}
      else info=`風況尚未量測（可先蓋測風塔）<br>`;
    }else if(f){info=`${f.desc}<br>`;if(preview.tool==='osub'&&facsOf('sub').length)info+=`海纜長度 <b>${fmt(nearestSub(t.i,t.j).d,1)}</b> 格，費用 <b>${fmt(cableCost(t.i,t.j),1)}M</b><br>`}
    body=info+costHTML(c.cost)+(c.ok?'':` <span class="err">${c.r}</span>`);ok=c.ok;
  }
  el.innerHTML=`<div class="ci"><div class="ct">${title}</div><div class="cb">${body}</div></div><button class="btn" id="cNo">取消</button><button class="btn pri" id="cOk" ${ok?'':'disabled'}>${okLbl}</button>`;
  el.hidden=false;
  $('#cNo').onclick=()=>cancelPreview();
  $('#cOk').onclick=confirmPreview;
}
function confirmPreview(){
  if(!preview)return;
  if(preview.tech){const k=preview.tech;research(k);const m=Object.keys(MODELS).find(x=>MODELS[x].tech===k);cancelPreview();if(S.tech[k])setTool(m);return}
  if(preview.tool==='buy'){if(preview.chk.ok)buyParcel(preview.chk.p);cancelPreview();return}
  if(preview.tool==='bulldoze'){doBulldoze(preview.t);cancelPreview();return}
  const t=preview.t;if(build(preview.tool,t)){cancelPreview(true);if(MODELS[tool]||FAC[tool])computeValid()}
}

// ---- inspector ----
function placeInspector(){const el=$('#insp');if(!el)return;const narrow=W<700;const target=narrow?$('#bottom'):$('#side');if(el.parentNode!==target){if(narrow)target.insertBefore(el,target.firstChild);else target.appendChild(el)}}
function select(s){selected=s;renderInspector();if(W<700)$('#tray').hidden=true}
function closeInspector(){selected=null;$('#insp').hidden=true;if(cat==='turb'||cat==='fac')$('#tray').hidden=false}
function statusOf(o){
  if(o.state==='build')return ['info',`建造中 ${o.prog}/${MODELS[o.model].build} 季`];
  if(o.state==='fault')return o.repairing?['warn','維修中']:['bad',o.waitBlade?'故障・缺葉片':'故障停機'];
  if(!o.conn)return ['mute','未併網'];
  if(o.over)return ['warn','變電站過載'];
  return ['good','運轉中'];
}
function renderInspector(){
  const el=$('#insp');if(!selected){el.hidden=true;return}
  let h='';
  const o=selected.o&&byId.get(selected.o.id);
  if(selected.o&&!o){closeInspector();return}
  if(o&&o.type==='turb'){
    const m=MODELS[o.model],t=tile(o.i,o.j),[cls,txt]=statusOf(o),hc=o.health>70?'var(--good)':o.health>45?'var(--warn)':'var(--bad)';
    const est=estAnnual(o.model,o.i,o.j,o),wk=wakeAnnual(o.i,o.j,o,true);
    h=`<div class="ih"><div><h3>${tname(o)}・${m.name}</h3><p>${parcelName(parcelAt(o.i,o.j))}・(${o.i},${o.j})・${TNAME[t.t]}</p><div style="margin-top:8px"><span class="pill ${cls}">${txt}</span></div></div><button class="xbtn" id="iX" aria-label="關閉">${ic('i-x')}</button></div>
    <div class="stats">
      <div><span>輪轂風速（年均）</span><b>${fmt(t.wind*shear(m),1)}</b><small>m/s</small></div>
      <div><span>預估容量因數</span><b>${fmt(est/(m.mw*8760)*100,1)}</b><small>%</small></div>
      <div><span>尾流損失（年均）</span><b>${fmt(wk*100,1)}</b><small>%</small></div>
      <div><span>上季發電</span><b>${o.av==null?'—':fmt(o.e,0)}</b><small>MWh</small></div>
      <div><span>上季可用率</span><b>${o.av==null?'—':fmt(o.av*100,1)}</b><small>%</small></div>
      <div><span>機齡</span><b>${o.age}</b><small>季</small></div>
    </div>
    <div class="stats" style="grid-template-columns:1fr"><div><span>設備健康度・故障機率 ${fmt(faultProb(o)*100,1)}%/季</span><b>${Math.round(o.health)}</b><small>%</small><div class="hbar"><i style="width:${o.health}%;background:${hc}"></i></div></div></div>`;
    let note='';
    if(o.state==='fault'){const f=FAULTS[o.fault]||FAULTS[0];note=`<b>${f.n}</b>：維修費 ${f.cost}M${f.blade?`，需 ${f.blade} 組葉片`:''}，修復需要 ${repairTurns(o)} 季${o.repairing?`（進度 ${o.rprog}/${repairTurns(o)}）`:''}。${o.waitCrew?(offJob(o)?'目前沒有空閒工作船。':'目前沒有空閒工班。'):''}${o.waitBlade?'倉庫缺少葉片，請到市場購買。':''}${o.waitSea?'上一季海況不佳，維修船沒能出海。':''}`}
    else if(!o.conn)note=m.offshore?'不在任何變電站範圍內：陸上變電站 6.5 格、海上變電站 8 格。':'不在任何變電站 6.5 格範圍內，發的電賣不出去。';
    else if(o.over)note='所屬變電站超過容量，部分電力被削減。再蓋一座變電站分擔負載。';
    if(!nearRoad(o.i,o.j,2)&&!m.offshore)note+=(note?'<br>':'')+'2 格內沒有道路，故障時修復要多花一季。';
    if(note)h+=`<div class="note">${note}</div>`;
    h+=`<div class="acts">${o.state==='run'?`<button class="btn sm" id="iPM" ${o.pm?'aria-pressed="true"':''}>${ic('i-wrench')}${o.pm?'已排定維護（取消）':'排定預防性維護 3M'}</button>`:''}<button class="btn sm danger" id="iDel">${ic('i-bulldoze')}拆除</button></div>`;
  }else if(o){
    const f=FAC[o.kind];
    let extra='';
    if(o.kind==='port')extra=`<div class="stats"><div><span>工作船</span><b>${S.vessels}</b><small>/ ${vesselCap()} 艘</small></div><div><span>本季海況窗口</span><b>${Math.round(season().sea*100)}</b><small>%</small></div></div>`;
    if(o.kind==='sub'||o.kind==='osub'){const L=GRID.load.get(o)||0;extra=`<div class="stats"><div><span>併網負載</span><b>${fmt(L,1)}</b><small>/ ${f.cap} MW</small><div class="hbar"><i style="width:${Math.min(100,L/f.cap*100)}%;background:${L>f.cap?'var(--bad)':'var(--sky)'}"></i></div></div><div><span>連接風機</span><b>${TURBS.filter(t=>GRID.asg.get(t)===o).length}</b><small>部</small></div></div>`}
    if(o.kind==='om'){extra=`<div class="stats"><div><span>涵蓋風機</span><b>${TURBS.filter(t=>Math.hypot(t.i-o.i,t.j-o.j)<=f.range).length}</b><small>部</small></div><div><span>每季營運費</span><b>${f.up}</b><small>M</small></div></div>`}
    h=`<div class="ih"><div><h3>${f.name}</h3><p>${parcelName(parcelAt(o.i,o.j))}・(${o.i},${o.j})</p></div><button class="xbtn" id="iX" aria-label="關閉">${ic('i-x')}</button></div>${extra}<div class="note">${f.desc}</div><div class="acts"><button class="btn sm danger" id="iDel">${ic('i-bulldoze')}拆除</button></div>`;
  }else{
    const t=selected.t,p=parcelAt(t.i,t.j),q=S.turn%4;
    const name=t.road?'道路':t.house?'民宅':t.t==='farm'?FARMQ[q]:TNAME[t.t];
    h=`<div class="ih"><div><h3>${name}${t.tree&&!t.house?'・有林木':''}</h3><p>地塊 ${parcelName(p)}・(${t.i},${t.j})・高程 ${isWater(t)?'海平面':t.h*20+' m'}</p><div style="margin-top:8px"><span class="pill ${p.owned?'good':'mute'}">${p.owned?'自有土地':'未取得'}</span></div></div><button class="xbtn" id="iX" aria-label="關閉">${ic('i-x')}</button></div>
    <div class="stats"><div><span>100 m 年均風速</span><b>${t.sv?fmt(t.wind,1):'未測'}</b><small>${t.sv?'m/s':''}</small></div><div><span>${p.owned?'地塊':'地塊售價'}</span><b>${p.owned?parcelName(p):parcelPrice(p)}</b><small>${p.owned?'':'M'}</small></div></div>
    <div class="note">${t.sv?(t.wind>=8?'風況優良，適合大型機組。':t.wind>=7?'風況良好。':'風況普通，容量因數偏低。'):'在附近蓋測風塔，或買下地塊，就能看到實測風速。'}${t.house?' 民宅 2 格內不能設置風機。':''}</div>
    ${p.owned?'':`<div class="acts"><button class="btn sm pri" id="iBuy">${ic('i-land')}購買地塊 ${parcelPrice(p)}M</button></div>`}`;
  }
  el.innerHTML=h;el.hidden=false;
  $('#iX').onclick=closeInspector;
  const pm=$('#iPM');if(pm)pm.onclick=()=>{o.pm=!o.pm;renderInspector();toast(o.pm?'已排定：下一季由空閒工班執行':'已取消預防性維護')};
  const del=$('#iDel');if(del)del.onclick=()=>{setCat('bull');const t=tile(o.i,o.j);preview={tool:'bulldoze',t,chk:bullInfo(t)};showConfirm()};
  const by=$('#iBuy');if(by)by.onclick=()=>{setCat('land');const t=selected?selected.t:null;if(!t)return;preview={tool:'buy',t,chk:check('buy',t.i,t.j)};showConfirm()};
}

// ---- modals ----
function openModal(html,cls,dismiss){
  const m=$('#modal'),c=$('#mcard');c.className='card '+(cls||'');c.innerHTML=html;m.hidden=false;modalOpen=true;c.scrollTop=0;
  m.onclick=e=>{if(dismiss&&e.target===m)closeModal()};
  return c;
}
function closeModal(){$('#modal').hidden=true;modalOpen=false}
function showEvent(ev){
  const c=openModal(`<div class="evhead"><div class="evicon tone-${ev.tone}">${ic(ev.icon)}</div><div><div class="sub">${dateLabel(S.turn)}・季中事件</div><h2>${ev.title}</h2></div></div><p>${ev.desc}</p><div class="choices">${ev.choices.map((x,k)=>`<button class="choice" data-k="${k}"><b>${x.label}</b><span>${x.sub}</span></button>`).join('')}</div>`,'',false);
  for(const b of c.querySelectorAll('.choice'))b.onclick=()=>{const x=ev.choices[+b.dataset.k];x.apply(ev);ev.picked=x.label;closeModal();runTurn(ev)};
}
function tileKPI(label,val,unit,cls){return `<div class="tile ${cls||''}"><span>${label}</span><b>${val}</b><small>${unit}</small></div>`}
function showReport(rep){
  const e=rep.ev,pct=v=>v==null?'—':fmt(v*100,1);
  const row=(l,v,neg)=>`<tr><td>${l}</td><td class="${neg?'negc':''}">${neg&&v?'−':''}${fmt(Math.abs(v),1)}</td></tr>`;
  const next=dateLabel(S.turn);
  const html=`<div class="sub">${rep.label}・${rep.se.name}季季報</div><h2>${rep.energy>0?`本季發電 ${fmt(rep.energy/1000,2)} GWh`:'本季尚未發電'}</h2>
  <div class="evhead" style="margin-top:14px"><div class="evicon tone-${e.tone}" style="width:44px;height:44px;border-radius:14px">${ic(e.icon)}</div><div><b>${e.title}</b><div style="font-size:12.5px;color:var(--muted);margin-top:2px">${e.picked?`你的決定：${e.picked}・`:''}${e.note}</div></div></div>
  <h4>運轉績效</h4>
  <div class="tiles">
    ${tileKPI('平均輪轂風速',rep.v==null?'—':fmt(rep.v,1),'m/s')}
    ${tileKPI('容量因數',pct(rep.cf),'%',rep.cf==null?'':rep.cf>=.3?'good':rep.cf>=.22?'warn':'bad')}
    ${tileKPI('可用率',pct(rep.av),'%',rep.av==null?'':rep.av>=.96?'good':rep.av>=.92?'warn':'bad')}
    ${tileKPI('效能 PR',pct(rep.pr),'%',rep.pr==null?'':rep.pr>=.85?'good':rep.pr>=.75?'warn':'bad')}
    ${tileKPI('尾流損失',pct(rep.wake),'%',rep.wake==null?'':rep.wake<.08?'good':rep.wake<.15?'warn':'bad')}
    ${tileKPI('限電比例',fmt(rep.curtail*100,1),'%',rep.curtail>0?'warn':'')}
  </div>
  <canvas id="rchart"></canvas>
  <h4>財務（百萬元）</h4>
  <table class="fin">
    <tr><td>售電收入（${rep.tariff.toFixed(2)} 元/度）</td><td class="pos">${fmt(rep.rev,1)}</td></tr>
    ${rep.bess?`<tr><td>儲能輔助服務</td><td class="pos">${fmt(rep.bess,1)}</td></tr>`:''}
    ${rep.gain?`<tr><td>契約預付款</td><td class="pos">${fmt(rep.gain,1)}</td></tr>`:''}
    ${row('風機運維',rep.cost.om,true)}${row('工班薪資',rep.cost.crew,true)}${row('設施營運',rep.cost.fac,true)}
    ${rep.cost.repair?row('維修與預防保養',rep.cost.repair,true):''}${rep.cost.event?row('事件支出',rep.cost.event,true):''}${rep.cost.interest?row('融資利息',rep.cost.interest,true):''}
    <tr class="total"><td>本季淨利</td><td class="${rep.net>=0?'pos':'negc'}">${rep.net>=0?'+':'−'}${fmt(Math.abs(rep.net),1)}</td></tr>
  </table>
  ${rep.built.length||rep.inc.length?`<h4>現場紀錄</h4><ul class="inc">${rep.built.map(b=>`<li class="good">${b} 完工併網</li>`).join('')}${rep.inc.map(x=>`<li class="${x.tone}">${x.txt}</li>`).join('')}</ul>`:''}
  <p style="font-size:12.5px">民眾支持度 ${rep.dSup>=0?'+':''}${fmt(rep.dSup,1)}，目前 ${Math.round(S.support)}%。</p>
  <div class="mfoot"><button class="btn pri" id="rGo">${S.over?'查看結算':`進入 ${next}`} ${ic('i-arrow')}</button></div>`;
  const c=openModal(html,'wide',false);
  drawReportChart();
  $('#rGo').onclick=()=>{closeModal();weatherFx='clear';if(S.over)showFinal()};
}
function drawReportChart(){
  const cvs=$('#rchart');if(!cvs)return;const r=cvs.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cvs.width=r.width*d;cvs.height=r.height*d;const c=cvs.getContext('2d');c.scale(d,d);
  const hs=S.hist.slice(-12),w=r.width,h=r.height,padL=30,padR=34,padT=22,padB=20,n=Math.max(4,hs.length),bw=(w-padL-padR)/n;
  const mx=Math.max(1,...hs.map(x=>x.e))*1.15;
  c.font='600 10px "Barlow Condensed",sans-serif';c.fillStyle='#8fa7ae';c.textAlign='left';c.fillText('發電量 GWh（長條）・可用率（線）',0,10);
  c.strokeStyle='rgba(255,255,255,.07)';c.lineWidth=1;
  for(let k=0;k<=2;k++){const y=padT+(h-padT-padB)*k/2;c.beginPath();c.moveTo(padL,y);c.lineTo(w-padR,y);c.stroke();c.textAlign='right';c.fillText(fmt(mx*(1-k/2),0),padL-4,y+3)}
  c.textAlign='left';c.fillText('100%',w-padR+4,padT+3);c.fillText('85%',w-padR+4,h-padB+3);
  hs.forEach((x,k)=>{const bh=x.e/mx*(h-padT-padB),X=padL+k*bw;const g=c.createLinearGradient(0,h-padB-bh,0,h-padB);g.addColorStop(0,'#8de3f2');g.addColorStop(1,'#3fa9c0');c.fillStyle=g;c.fillRect(X+3,h-padB-bh,bw-6,bh);
    c.fillStyle='#8fa7ae';c.textAlign='center';c.fillText(x.l.slice(2),X+bw/2,h-5)});
  c.strokeStyle='#ffc541';c.lineWidth=2;c.beginPath();let st=false;
  hs.forEach((x,k)=>{if(x.av==null)return;const y=padT+(1-clamp((x.av-.85)/.15,0,1))*(h-padT-padB),X=padL+k*bw+bw/2;st?c.lineTo(X,y):c.moveTo(X,y);st=true});c.stroke();
  hs.forEach((x,k)=>{if(x.av==null)return;const y=padT+(1-clamp((x.av-.85)/.15,0,1))*(h-padT-padB),X=padL+k*bw+bw/2;c.fillStyle='#ffc541';c.beginPath();c.arc(X,y,k===hs.length-1?4:2.5,0,6.283);c.fill()});
}
function showMarket(){
  if(SBX()){showSandbox();return}
  const sc=$('#mcard').scrollTop;
  const bs=S.price.steel,bb=S.price.blade;
  const techs=Object.keys(TECH).filter(k=>lvModels().some(m=>MODELS[m].tech===k));
  const html=`<div class="evhead"><div class="evicon tone-neutral">${ic('i-cart')}</div><div><div class="sub">資源・人力・研發</div><h2>市場與營運</h2></div><button class="xbtn" id="mX" style="align-self:flex-start">${ic('i-x')}</button></div>
  <h4>原物料</h4>
  <div class="mrow">${ic('i-steel')}<div class="mi"><b>鋼材 ${fmt(bs*1000,0)} 千元 / t</b><span>庫存 ${Math.round(S.steel)} / ${steelCap()} t・塔架與基礎用料</span></div><div class="mb">
    <button class="btn sm" data-a="bs50">買 50 t・${fmt(bs*50,1)}M</button><button class="btn sm" data-a="bs150">買 150 t・${fmt(bs*150,1)}M</button><button class="btn sm" data-a="ss50">賣 50 t・${fmt(bs*50*.8,1)}M</button></div></div>
  <div class="mrow">${ic('i-blade')}<div class="mi"><b>葉片 ${fmt(bb,1)}M / 組</b><span>庫存 ${S.blades} / ${bladeCap()} 組・新機與葉片損傷維修都會用到</span></div><div class="mb">
    <button class="btn sm" data-a="bb1">買 1 組</button><button class="btn sm" data-a="bb3">買 3 組・${fmt(bb*3,1)}M</button></div></div>
  <h4>人力與船隊</h4>
  <div class="mrow">${ic('i-crew')}<div class="mi"><b>工班 ${S.crews} 隊（${crewBusy()} 隊在工地）</b><span>每座陸上工地與每次陸上維修需要一隊・薪資 ${CREW_PAY}M/季・招募費 ${CREW_HIRE}M</span></div><div class="mb">
    <button class="btn sm" data-a="hire">招募</button><button class="btn sm" data-a="fire" ${S.crews<=Math.max(1,crewBusy())?'disabled':''}>解散一隊</button></div></div>
  ${LV.offshoreOps?`<div class="mrow">${ic('i-ship')}<div class="mi"><b>工作船 ${S.vessels} 艘（${vesselBusy()} 艘在工地）</b><span>離岸施工與維修都要派船・租金 ${VESSEL_PAY}M/季・調度費 ${VESSEL_HIRE}M・港口可停 ${vesselCap()} 艘</span></div><div class="mb">
    <button class="btn sm" data-a="vhire" ${S.vessels>=vesselCap()?'disabled':''}>租用</button><button class="btn sm" data-a="vfire" ${S.vessels<=vesselBusy()?'disabled':''}>退租一艘</button></div></div>`:''}
  <h4>維護策略</h4>
  <div class="seg">${POLICY.map((p,k)=>`<button data-a="pol${k}" aria-pressed="${S.policy===k}"><b>${p.name}</b><span>${p.desc}</span></button>`).join('')}</div>
  ${techs.length?`<h4>技術研發</h4>
  ${techs.map(k=>`<div class="mrow">${ic('i-flask')}<div class="mi"><b>${TECH[k].name}</b><span>${TECH[k].desc}</span></div><div class="mb">${S.tech[k]?'<span class="pill good">已完成</span>':`<button class="btn sm pri" data-a="r_${k}">研發 ${techCost(k)}M</button>`}</div></div>`).join('')}`:''}
  <h4>財務</h4>
  <div class="tiles">${tileKPI('現金',fmt(S.cash,1),'M',S.cash<0?'bad':'')}${tileKPI('信用額度',credit(),'M')}${tileKPI('售電費率',tariff().toFixed(2),'元/度')}</div>
  <p style="font-size:12.5px">現金可以透支到信用額度（隨裝置容量提高），透支部分每季計息 2.5%。季末透支超過額度即宣告破產。</p>`;
  const c=openModal(html,'wide',true);c.scrollTop=sc;
  $('#mX').onclick=closeModal;
  for(const b of c.querySelectorAll('[data-a]'))b.onclick=()=>{market(b.dataset.a);showMarket()};
}
function market(a){
  const pay=(m)=>{if(S.cash-m<-credit()){toast('資金與信用額度不足','bad');return false}S.cash-=m;return true};
  if(a.startsWith('bs')){const n=+a.slice(2);if(S.steel+n>steelCap()){toast('倉庫放不下，請蓋倉儲中心','bad');return}if(pay(S.price.steel*n)){S.steel+=n;toast(`購入鋼材 ${n} t`,'good')}}
  else if(a==='ss50'){if(S.steel<50){toast('鋼材不足 50 t','bad');return}S.steel-=50;S.cash+=S.price.steel*50*.8}
  else if(a.startsWith('bb')){const n=+a.slice(2);if(S.blades+n>bladeCap()){toast('倉庫放不下，請蓋倉儲中心','bad');return}if(pay(S.price.blade*n)){S.blades+=n;toast(`購入葉片 ${n} 組`,'good')}}
  else if(a==='hire'){if(pay(CREW_HIRE)){S.crews++;toast('新工班報到','good')}}
  else if(a==='fire'){if(S.crews>Math.max(1,crewBusy()))S.crews--}
  else if(a==='vhire'){if(S.vessels>=vesselCap()){toast(vesselCap()?'港口泊位已滿，再蓋一座港口':'要先蓋運維港口才能租船','bad');return}if(pay(VESSEL_HIRE)){S.vessels++;toast('工作船進港','good')}}
  else if(a==='vfire'){if(S.vessels>vesselBusy())S.vessels--}
  else if(a.startsWith('pol'))S.policy=+a.slice(3);
  else if(a.startsWith('r_'))research(a.slice(2));
  updateHUD();save();
}
function goalsHTML(){
  return evalGoals().map(r=>`<div class="goal ${r.met?'met':''}"><div class="gl"><span>${r.d.name}</span><b>${fmt(r.v,r.g.k==='bess'?0:1)} / ${r.g.t} ${r.d.unit}</b></div><div class="gbar"><i style="width:${clamp(r.v/r.g.t*100,0,100)}%"></i></div></div>`).join('');
}
function showGoals(){
  if(SBX()){showSandbox();return}
  const left=turnsLeft(),endY=START_YEAR+Math.ceil(LV.turns/4)-1;
  const html=`<div class="evhead"><div class="evicon tone-warn">${ic('i-target')}</div><div><div class="sub">第 ${LV.no} 關・${LV.name}・還剩 ${left} 季</div><h2>關卡目標</h2></div><button class="xbtn" id="mX" style="align-self:flex-start">${ic('i-x')}</button></div>
  <p>在 ${endY} 年第四季結束時，同時達成越多目標，評等越高；全部達成且現金為正就是 S。</p>
  ${goalsHTML()}
  <h4>這一關的重點</h4>
  <ul class="steps">${(LV.learn||[]).map(x=>`<li><span>${x}</span></li>`).join('')}</ul>`;
  openModal(html,'',true);$('#mX').onclick=closeModal;
}
// 進入關卡時的任務簡報
function showBrief(hasSave){
  const L=LV,endY=L.turns?START_YEAR+Math.ceil(L.turns/4)-1:null;
  const html=`<div class="evhead"><div class="evicon tone-warn" style="background:linear-gradient(160deg,#ffd970,#ee9b16);color:#3a2600">${ic(L.sandbox?'i-wrench':'i-turbine')}</div><div><div class="sub">${L.sandbox?'測試關卡・不計成績':`第 ${L.no} 關・${START_YEAR}–${endY}・${L.turns} 季`}</div><h2>${L.name}</h2></div></div>
  <p>${L.desc}</p>
  ${L.goals.length?`<h4>過關目標</h4>${goalsHTML()}`:''}
  <h4>${L.sandbox?'怎麼用':'這一關的重點'}</h4>
  <ul class="steps">${(L.learn||[]).map(x=>`<li><span>${x}</span></li>`).join('')}</ul>
  ${L.no===1&&!hasSave?`<p style="font-size:12.5px">操作：單指拖曳移動、雙指縮放；電腦可用滾輪縮放。選「風機」時點一下格子看預估發電，再點一次確認。進度自動存在這個瀏覽器。</p>`:''}
  <div class="mfoot"><button class="btn" id="bLv">${ic('i-land')}關卡選單</button>${hasSave?`<button class="btn" id="iNew">重新開始</button><button class="btn pri" id="iGo">繼續 ${dateLabel(S.turn)}</button>`:'<button class="btn pri" id="iGo">開始</button>'}</div>`;
  openModal(html,'',false);
  $('#iGo').onclick=closeModal;
  $('#bLv').onclick=()=>{closeModal();showLevels()};
  const nb=$('#iNew');if(nb)nb.onclick=()=>{closeModal();startLevel(L.id,true)};
}
function showMenu(){
  const html=`<div class="evhead"><div class="evicon tone-neutral">${ic('i-menu')}</div><div><div class="sub">${LV.no?`第 ${LV.no} 關・`:''}${LV.name}・${dateLabel(S.turn)}</div><h2>選單</h2></div><button class="xbtn" id="mX" style="align-self:flex-start">${ic('i-x')}</button></div>
  <div class="choices">
    <button class="choice" id="mLv"><b>關卡選單</b><span>進度已自動儲存，可以隨時回來繼續</span></button>
    <button class="choice" id="mHelp"><b>本關說明</b><span>目標、重點與操作提示</span></button>
    <button class="choice" id="mNew"><b>重新開始本關</b><span>目前進度會被覆蓋</span></button>
    ${ADMIN.visible?`<button class="choice" id="mAdm"><b>管理介面</b><span>設定開放哪些關卡</span></button>`:''}
  </div><div id="mConf"></div>`;
  openModal(html,'',true);
  $('#mX').onclick=closeModal;
  $('#mLv').onclick=()=>{closeModal();showLevels()};
  $('#mHelp').onclick=()=>{closeModal();showBrief(false)};
  const ma=$('#mAdm');if(ma)ma.onclick=()=>{closeModal();showAdmin()};
  $('#mNew').onclick=()=>{$('#mConf').innerHTML=`<p>確定要放棄目前進度嗎？</p><div class="mfoot"><button class="btn" id="cN">取消</button><button class="btn pri" id="cY">確定重新開始</button></div>`;$('#cN').onclick=()=>{$('#mConf').innerHTML=''};$('#cY').onclick=()=>{closeModal();startLevel(LV.id,true)}};
}
function showFinal(){
  const {grade,stars}=gradeOf();
  const tot=S.hist.reduce((s,h)=>s+h.e,0);
  const nxt=LEVELS.find(l=>l.no===LV.no+1);
  const nextOpen=nxt&&levelOpen(nxt);
  const html=`<div class="sub">第 ${LV.no} 關・${LV.name}・${S.over==='bankrupt'?'資金斷鏈':'開發期結束'}</div><h2>${S.over==='bankrupt'?'風場被債權銀行接管':'風場開發成績單'}</h2>
  <div class="grade">${grade}</div><div class="stars" aria-label="${stars} 顆星">${[0,1,2].map(k=>`<svg class="ic ${k<stars?'on':''}"><use href="#i-star"/></svg>`).join('')}</div>
  <div class="tiles" style="margin-top:16px">${tileKPI('裝置容量',fmt(installedMW(),1),'MW')}${tileKPI('累計發電',fmt(tot,0),'GWh')}${tileKPI('期末現金',fmt(S.cash,0),'M',S.cash<0?'bad':'good')}</div>
  ${goalsHTML()}
  <p>累計發電約可供 ${fmt(tot*1e6/3600/1000,0)} 戶家庭使用一年（以每戶年用電 3,600 度估算）。${stars?'':' 至少拿到一顆星（評等 C）才算過關。'}</p>
  <div class="mfoot"><button class="btn" id="fMap">回到地圖</button><button class="btn" id="fRe">再玩一次</button>${nxt?`<button class="btn pri" id="fNext" ${nextOpen?'':'disabled'}>${nextOpen?`下一關：${nxt.name}`:'下一關尚未開放'}</button>`:`<button class="btn pri" id="fLv">關卡選單</button>`}</div>`;
  openModal(html,'',false);
  $('#fMap').onclick=closeModal;$('#fRe').onclick=()=>{closeModal();startLevel(LV.id,true)};
  const fn=$('#fNext');if(fn)fn.onclick=()=>{closeModal();startLevel(nxt.id)};
  const fl=$('#fLv');if(fl)fl.onclick=()=>{closeModal();showLevels()};
}
