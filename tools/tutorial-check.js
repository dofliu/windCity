// 新手導引端對端測試：模擬第一次來的玩家，每一步都點聚光燈指的地方，直到完成
// 用法：node tools/tutorial-check.js [phone]
const {chromium,devices}=require('playwright');const path=require('path');const fs=require('fs');
const out=path.resolve(__dirname,'out');fs.mkdirSync(out,{recursive:true});
const phone=process.argv.includes('phone'),hash=process.argv.includes('en')?'#lang=en':'';
(async()=>{const b=await chromium.launch();
const ctx=phone?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:1280,height:800}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'..','index.html')+hash);await p.waitForTimeout(1500);
const log=[];
for(let guard=0;guard<40;guard++){
  if(await p.evaluate(()=>CINE.on)){await p.waitForFunction(()=>!CINE.on,null,{timeout:10000});await p.waitForTimeout(700)} // 結算動畫播完
  const st=await p.evaluate(()=>({on:TUT.on,i:TUT.i,t:TUT_STEPS[TUT.i]&&TUT_STEPS[TUT.i].t,final:!!(TUT_STEPS[TUT.i]||{}).final,btn:!!document.querySelector('#tutNext'),spot:!$('#spot').hidden&&$('#spot').getBoundingClientRect()}));
  if(!st.on){log.push('tutorial not running');break}
  log.push(`${st.i+1} ${st.t}`);
  if([0,5,7,11,13,15].includes(st.i))await p.screenshot({path:`${out}/tut-${phone?'phone-':''}${String(st.i+1).padStart(2,'0')}.png`});
  if(st.final)break;
  const i0=st.i;
  if(st.btn)await p.click('#tutNext');
  else if(st.spot){await p.waitForTimeout(800);const r=await p.evaluate(()=>{const r=$('#spot').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});await p.mouse.click(r[0],r[1]);}
  else{log.push('no target');break}
  await p.waitForTimeout(900);
  const i1=await p.evaluate(()=>TUT.i);
  if(i1===i0){ // 同一步驟可能需要再點一次（例如確認列出現後要按建造）
    await p.waitForTimeout(500);const r=await p.evaluate(()=>{if($('#spot').hidden)return null;const r=$('#spot').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
    if(r){await p.mouse.click(r[0],r[1]);await p.waitForTimeout(900)}
  }
}
const res=await p.evaluate(()=>({turbs:TURBS.length,subs:facsOf('sub').length,turn:S.turn,energy:S.hist.length?S.hist[S.hist.length-1].e:0,conn:TURBS[0]&&TURBS[0].conn,done:localStorage.getItem('windcity:tutDone')}));
console.log(log.join('\n'));console.log(JSON.stringify({res,errs}));await b.close()})();
