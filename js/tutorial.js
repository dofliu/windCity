// 風場大亨 — 新手導引：一步一步帶玩家蓋好變電站與第一部風機，並看到它開始發電
'use strict';
const TUT_KEY='windcity:tutDone';
const TUT={on:false,i:0,subTile:null,turbTile:null,turn0:0,cam:null,adv:0};
const tutDone=()=>{try{return localStorage.getItem(TUT_KEY)==='1'}catch(e){return false}};
function tutMarkDone(){try{localStorage.setItem(TUT_KEY,'1')}catch(e){}PROGRESS.tutorial={stars:3,grade:'S',at:Date.now()};saveProgress()}
const okSoft=r=>!r||/資金|鋼材|葉片|工班/.test(r);
// 建議的變電站位置：自有陸地中央、範圍內好風況最多，並把最好的風點留給風機
function tutPickSub(){
  let best=null,bs=-1e9;
  for(const t of S.tiles){if(!parcelAt(t.i,t.j).owned||isWater(t)||t.tree||t.road||t.house||!okSoft(check('sub',t.i,t.j).r))continue;
    let s=0;for(const u of S.tiles)if(parcelAt(u.i,u.j).owned&&!isWater(u)&&Math.hypot(u.i-t.i,u.j-t.j)<=6.5)s+=Math.max(0,u.wind-7);
    s-=Math.max(0,t.wind-7.6)*6;if(s>bs){bs=s;best=t}}
  return best?[best.i,best.j]:null;
}
// 建議的風機位置：變電站範圍內、可以蓋、年發電量最高
function tutPickTurb(){
  const sub=facsOf('sub')[0];let best=null,bs=-1;
  for(const t of S.tiles){if(!parcelAt(t.i,t.j).owned||!okSoft(check('t2',t.i,t.j).r))continue;if(sub&&Math.hypot(t.i-sub.i,t.j-sub.j)>FAC.sub.range)continue;
    const e=estAnnual('t2',t.i,t.j,null);if(e>bs){bs=e;best=t}}
  return best?[best.i,best.j]:null;
}
const confirmOpen=()=>!$('#confirm').hidden&&preview;
const TUT_STEPS=[
  {t:'歡迎來到風場大亨',x:'白色虛線圍起來的是你的開發用地。接下來一步一步帶你蓋好第一座變電站與第一部風機，並看著它開始發電。',btn:'開始'},
  {t:'看看哪裡風最大',x:'點左邊的「風能」圖層。顏色越暖（黃、橘、紅）代表年平均風速越高，通常海岸邊風最大。',el:'.lay[data-ov="wind"]',ok:()=>overlay==='wind'},
  {t:'風場營運面板',x:'右上角是風場的即時數據：裝置容量、發電量、可用率。最下面的箭頭是本季主風向——冬天吹東北季風。',el:'#kpi',btn:'知道了',enter:()=>{if(kpiCollapsed)$('#kpiHead').click()}},
  {t:'先蓋變電站',x:'風機發的電要送進電網，必須先有變電站。點下方的「設施」。',el:'.cat[data-cat="fac"]',ok:()=>cat==='fac',enter:()=>{if(W<700&&!kpiCollapsed)$('#kpiHead').click()}},
  {t:'選擇變電站',x:'點「變電站」。風機要在它 6.5 格範圍內才能併網。',el:'.item[data-k="sub"]',ok:()=>tool==='sub'},
  {t:'放在這裡',x:'點地圖上閃爍的格子，下方會出現確認列，再按「建造」。',tile:()=>TUT.subTile,el2:'#cOk',ok:()=>facsOf('sub').length>0},
  {t:'補充鋼材',x:'一部 2 MW 風機需要 60 t 鋼材與 1 組葉片，鋼材不夠了。點右上角的「市場」。',el:'#bMarket',ok:()=>modalOpen&&!!$('#mcard [data-a="bs50"]')},
  {t:'買 50 噸鋼材',x:'點「買 50 t」。價格每季會浮動，鋼價低的時候可以多囤一點。',el:'#mcard [data-a="bs50"]',ok:()=>S.steel>=60},
  {t:'回到地圖',x:'材料夠了，點右上角的 ✕ 關閉市場。',el:'#mX',ok:()=>!modalOpen},
  {t:'選擇風機',x:'點下方的「風機」。',el:'.cat[data-cat="turb"]',ok:()=>cat==='turb'},
  {t:'選擇 2 MW 機組',x:'點「GW-2.0 陸域型」。小機組一季就能完工。',el:'.item[data-k="t2"]',ok:()=>tool==='t2',enter:()=>{TUT.turbTile=tutPickTurb()}},
  {t:'蓋在風大的地方',x:'點閃爍的格子：它在變電站範圍內、風速最高。確認列會顯示預估容量因數、尾流損失與年發電量，看完按「建造」。',tile:()=>TUT.turbTile,el2:'#cOk',ok:()=>TURBS.length>0},
  {t:'推進一季',x:'工班開工了！按「結束本季」，時間往前三個月，風機就會完工。',el:'#next',ok:()=>S.turn>TUT.turn0,enter:()=>{TUT.turn0=S.turn}},
  {t:'開始發電了！',x:'這是季報：本季發電量、容量因數、可用率與收入都在這裡。看完按下方按鈕繼續。',el:'#rGo',ok:()=>!modalOpen},
  {t:'看看你的風機',x:'點一下地圖上的風機，畫面會顯示它的輪轂風速、預估容量因數、尾流損失與健康度。',tile:()=>TURBS[0]?[TURBS[0].i,TURBS[0].j]:null,ok:()=>!!(selected&&selected.o&&selected.o.type==='turb'),enter:()=>setCat('inspect')},
  {t:'完成！',x:'你已經蓋好第一部風機並開始發電。真正的關卡還要考慮尾流排列、工班、備品葉片與颱風。到第 1 關「海岸初探」挑戰八年 120 MW 吧！',final:true},
];
function tutStart(){TUT.on=true;TUT.i=0;TUT.subTile=tutPickSub();TUT.turbTile=null;closeModal();tutShow()}
function tutStop(){TUT.on=false;for(const id of['#coach','#spot','#tapHint'])$(id).hidden=true}
function tutShow(){
  const st=TUT_STEPS[TUT.i],n=TUT_STEPS.length;
  if(st.enter)st.enter();
  const el=$('#coach');
  el.innerHTML=`<div class="coach-in"><div class="coach-ic">${ic(st.final?'i-star':'i-turbine')}</div><div class="coach-tx"><div class="coach-step">新手導引 ${TUT.i+1} / ${n}</div><b>${st.t}</b><p>${st.x}</p></div></div>
    <div class="coach-dots">${TUT_STEPS.map((_,k)=>`<i class="${k<TUT.i?'done':k===TUT.i?'now':''}"></i>`).join('')}</div>
    <div class="coach-ft">${st.final?`<button class="btn sm" id="tutFree">留在這裡練習</button><button class="btn sm" id="tutLv">關卡選單</button><button class="btn sm pri" id="tutL1">前往第 1 關</button>`
      :`<button class="btn sm" id="tutSkip">跳過導引</button>${st.btn?`<button class="btn sm pri" id="tutNext">${st.btn}</button>`:'<span class="coach-wait">完成上面的動作後自動繼續</span>'}`}</div>`;
  el.hidden=false;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
  const nx=$('#tutNext');if(nx)nx.onclick=tutNext;
  const sk=$('#tutSkip');if(sk)sk.onclick=()=>{tutMarkDone();tutStop();toast('已跳過導引，隨時可以從選單重新播放')};
  if(st.final){tutMarkDone();sfx('win');
    $('#tutFree').onclick=tutStop;$('#tutLv').onclick=()=>{tutStop();showLevels()};$('#tutL1').onclick=()=>{tutStop();startLevel('coast',false)}}
  const tg=st.tile&&st.tile();
  if(tg){ // 把目標格移到提示框與下方面板之間的空白處
    tutPlaceCoach(true);
    const w=iso(tg[0]+.5,tg[1]+.5,elev(tile(tg[0],tg[1]))),z1=Math.max(cam.z,1.05);
    const top=el.getBoundingClientRect().bottom,bot=$('#bottom').getBoundingClientRect().top,yMid=(top+bot)/2;
    TUT.cam={x0:cam.x,y0:cam.y,z0:cam.z,x1:w[0],y1:w[1]-(yMid-H/2)/z1,z1,t0:performance.now()}}
}
function tutPlaceCoach(top){const co=$('#coach');if(top){co.style.bottom='auto';co.style.top=Math.max(12,$('#top').getBoundingClientRect().bottom+10)+'px'}else{co.style.top='auto';co.style.bottom=Math.max(12,H-$('#bottom').getBoundingClientRect().top+10)+'px'}}
function tutNext(){TUT.adv=0;TUT.i=Math.min(TUT.i+1,TUT_STEPS.length-1);tutShow()}
function tutRect(st){
  const pad=6;
  const sel=st.el2&&confirmOpen()?st.el2:(st.tile?null:st.el);
  if(sel){const e=$(sel);if(!e||!e.getClientRects().length)return null;let r=e.getBoundingClientRect();if(!r.width)return null;
    if(r.bottom>H-4||r.top<4){e.scrollIntoView({block:'center'});r=e.getBoundingClientRect()} /* 目標在捲動區外時捲進畫面 */
    return {x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2,r:14}}
  const tg=st.tile&&st.tile();if(!tg)return null;
  const t=tile(tg[0],tg[1]),p=iso(tg[0]+.5,tg[1]+.5,elev(t)),sx=(p[0]-cam.x)*cam.z+W/2,sy=(p[1]-cam.y)*cam.z+H/2,w=TW*cam.z*.95,h=TH*cam.z*.95;
  return {x:sx-w/2-pad,y:sy-h/2-pad,w:w+pad*2,h:h+pad*2,r:999,tile:true};
}
function tutUpdate(){
  if(!TUT.on)return;
  const st=TUT_STEPS[TUT.i];
  if(TUT.cam){const k=Math.min(1,(performance.now()-TUT.cam.t0)/700),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;cam.x=lerp(TUT.cam.x0,TUT.cam.x1,e);cam.y=lerp(TUT.cam.y0,TUT.cam.y1,e);cam.z=lerp(TUT.cam.z0,TUT.cam.z1,e);if(k>=1)TUT.cam=null}
  const sp=$('#spot'),hint=$('#tapHint'),co=$('#coach');
  if(CINE.on){co.hidden=sp.hidden=hint.hidden=true;return}co.hidden=false;
  const r=st.final?null:tutRect(st);
  if(r){Object.assign(sp.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',borderRadius:r.r+'px'});sp.hidden=false;
    hint.hidden=false;hint.style.left=(r.x+r.w/2)+'px';hint.style.top=(r.y+(r.tile?r.h*.2:r.h*.55))+'px';}
  else{sp.hidden=true;hint.hidden=true}
  // 提示框擺在目標的另一側，避免擋住；地圖格子的步驟固定放上方
  tutPlaceCoach(!r||!!st.tile||r.y+r.h/2>=H*.5);
  if(st.ok&&st.ok()){if(!TUT.adv)TUT.adv=performance.now();else if(performance.now()-TUT.adv>380){sfx('coin');tutNext()}}
  else TUT.adv=0;
}
