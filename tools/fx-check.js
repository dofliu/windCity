// 畫面與聲音檢查：日夜截圖、音訊是否真的有輸出
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const out=path.resolve(__dirname,'out');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(800);
await p.evaluate(()=>{window.__noCine=true});
await p.mouse.click(5,5); // 第一次互動啟動音訊
await p.evaluate(()=>window.__wft.startLevel('coast',true));await p.click('#iGo');
await p.evaluate(()=>{const g=window.__wft,S=g.S;S.cash=2000;S.steel=2000;S.blades=60;S.crews=20;
  g.build('sub',11,14);for(const[i,j]of[[8,16],[10,16],[12,16],[14,16],[9,13],[13,13],[7,14]])g.build('t4',i,j);for(let i=6;i<16;i++)g.build('road',i,15);g.build('om',15,13);
  for(const o of g.turbs){o.state='run';o.prog=9}g.cam.z=1.15;g.cam.x=-90;g.cam.y=430});
await p.waitForTimeout(1500);
const shot=async(name,t)=>{await p.evaluate(t=>{time=DAY_LEN*t},t);await p.waitForTimeout(700);await p.screenshot({path:`${out}/${name}.png`})};
await shot('day',.2);await shot('dusk',.43);await shot('night',.68);
// 音訊：在主輸出掛分析器量音量
const audio=await p.evaluate(async()=>{
  if(!AU.ctx)return {ctx:null};
  const an=AU.ctx.createAnalyser();an.fftSize=2048;AU.master.connect(an);const buf=new Float32Array(2048);
  const rms=()=>{an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;return Math.sqrt(s/buf.length)};
  await new Promise(r=>setTimeout(r,2500));const music=rms();
  const beats=AU.beat;sfx('build');await new Promise(r=>setTimeout(r,60));const sfxLvl=rms();
  SETTINGS.mute=true;applyVolumes();await new Promise(r=>setTimeout(r,400));const muted=rms();SETTINGS.mute=false;applyVolumes();
  return {state:AU.ctx.state,mood:AU.mood,beats,music:+music.toFixed(4),sfx:+sfxLvl.toFixed(4),muted:+muted.toFixed(5)}});
// 換季橫幅與完工特效
await p.evaluate(()=>{window.__wft.endTurn();document.querySelector('.choice')?.click()});await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('#rGo')?.click());await p.waitForTimeout(500);await p.screenshot({path:`${out}/banner.png`});
const fx=await p.evaluate(()=>({cars:FX.cars.length,boats:FX.boats.length,parts:FX.parts.length}));
console.log(JSON.stringify({audio,fx,errs}));await b.close()})();
