// 測試工具與管理介面的功能檢查
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const out=path.resolve(__dirname,'out');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve(__dirname,'..','index.html')+'#admin');await p.waitForTimeout(1000);
// 管理介面
await p.click('#lvAdm');await p.waitForTimeout(300);await p.screenshot({path:out+'/admin.png'});
await p.click('#aOnly');await p.click('#aSave');await p.waitForTimeout(300);
const locked=await p.evaluate(()=>[...document.querySelectorAll('.lv.locked')].length);
await p.evaluate(()=>window.__wft.adminSave(Object.fromEntries(['sandbox','coast','hills','storm','aging','offshore','bigoff'].map(k=>[k,'seq']))));
// 測試關卡：填滿、強制颱風、全部故障再修復
await p.evaluate(()=>window.__wft.startLevel('sandbox',true));await p.click('#iGo');
await p.click('#bGoals');await p.waitForTimeout(200);await p.screenshot({path:out+'/sandbox-tools.png'});
await p.click('[data-tg="instant"]');await p.click('[data-fill="t4"]');await p.waitForTimeout(300);
const n4=await p.evaluate(()=>window.__wft.turbs.length);
await p.click('#bGoals');await p.click('[data-ev="typhoon"]');await p.click('#mX');
await p.click('#next');await p.waitForTimeout(200);const ty=await p.evaluate(()=>document.querySelector('.card h2')?.textContent||'');
await p.evaluate(()=>{document.querySelector('.choice')?.click()});await p.waitForTimeout(200);
await p.evaluate(()=>document.querySelector('#rGo')?.click());
await p.click('#bGoals');await p.click('[data-tg="free"]');await p.click('[data-bulk="clear"]');await p.click('[data-fill="t2"]');await p.waitForTimeout(300);
const n2=await p.evaluate(()=>window.__wft.turbs.length);
await p.screenshot({path:out+'/sandbox-filled.png'});
await p.click('#bGoals');await p.click('[data-map="offshore"]');await p.click('[data-fill="f15"]');await p.waitForTimeout(400);
const n15=await p.evaluate(()=>window.__wft.turbs.length);
await p.evaluate(()=>{const g=window.__wft;g.cam.z=.55;g.cam.x=0;g.cam.y=420});await p.waitForTimeout(300);
await p.screenshot({path:out+'/sandbox-offshore.png'});
console.log(JSON.stringify({locked,n4,typhoon:ty,n2,n15,errs}));await b.close()})();
