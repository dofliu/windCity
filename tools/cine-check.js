// 事件動畫檢查：在測試關卡逐一強制觸發事件，截下事件演出與結算演出
// 用法：node tools/cine-check.js [phone] [事件 id,…]
const {chromium,devices}=require('playwright');const path=require('path');const fs=require('fs');
const phone=process.argv.includes('phone');
const only=(process.argv.find(a=>/^[a-z,]+$/i.test(a)&&a!=='phone')||'').split(',').filter(Boolean);
const IDS=only.length?only:['typhoon','protest','lightning','curtail','monsoon','lowwind','steelUp','steelDown','bladeShort','subsidy','ppa','birds','heatwave','crane','town','techcoop'];
const out=path.resolve(__dirname,'out','cine'+(phone?'-phone':''));fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();
const p=await b.newPage(phone?{...devices['iPhone 13']}:{viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(1200);
await p.evaluate(()=>{try{localStorage.setItem('windcity:tutDone','1')}catch(e){};window.__wft.startLevel('sandbox',true);closeModal();
  const g=window.__wft,S=g.S;S.sbx.events=true;
  // 自動挑可蓋的格子：先蓋兩座變電站，再在範圍內蓋 10 部風機（含靠近民宅的）
  const land=S.tiles.filter(t=>!isWater(t)&&!t.house&&!t.road);
  const ok=(k,t)=>!check(k,t.i,t.j).r;
  const mid=N/2;const byC=land.slice().sort((a,b)=>Math.hypot(a.i-mid,a.j-mid)-Math.hypot(b.i-mid,b.j-mid));
  for(const t of byC){if(t.tree)doBulldoze(t)}
  const s1=byC.find(t=>ok('sub',t));g.build('sub',s1.i,s1.j);
  const placed=[];const far=t=>placed.every(q=>Math.max(Math.abs(q.i-t.i),Math.abs(q.j-t.j))>=2);
  const near=land.filter(t=>houseNear(t.i,t.j,4)&&Math.hypot(t.i-s1.i,t.j-s1.j)<6).concat(byC);
  for(const t of near){if(placed.length>=10)break;if(far(t)&&Math.hypot(t.i-s1.i,t.j-s1.j)<6.3&&ok('t4',t)){g.build('t4',t.i,t.j);placed.push(t)}}
  g.build('om',...(()=>{const t=byC.find(t=>ok('om',t));return [t.i,t.j]})());
  for(const o of g.turbs){o.state='run';o.prog=9}
  const t2=byC.find(t=>far(t)&&ok('t4',t));g.build('t4',t2.i,t2.j); // 施工中（吊車延誤用）
  S.support=40;});
await p.waitForTimeout(800);
const res=[];
for(const id of IDS){
  const ok=await p.evaluate(id=>{const S=window.__wft.S;if(id==='typhoon'){for(const o of TURBS)if(o.state!=='build')o.state='run'}
    if(id==='birds')S.turn=S.turn-S.turn%4+5;if(id==='heatwave')S.turn=S.turn-S.turn%4+6;if(id==='techcoop'){S.flags.techDisc=0;S.tech.tech15=false;S.turn=Math.max(S.turn,4)}
    if(id==='crane'&&!TURBS.some(o=>o.state==='build')){const t=S.tiles.find(t=>!isWater(t)&&!t.house&&!t.road&&!t.tree&&!check('t4',t.i,t.j).r);window.__wft.build('t4',t.i,t.j)}
    S.sbx.force=id;closeModal();endTurn();return CINE.on&&CINE.kind===id},id);
  await p.waitForTimeout(phone?1500:1300);
  await p.screenshot({path:`${out}/${id}-pre.png`});
  await p.waitForFunction(()=>!CINE.on||CINE.phase==='post',null,{timeout:8000});
  const ch=await p.$('.choice');if(ch){await p.waitForTimeout(400);await ch.click()}
  await p.waitForTimeout(1100);
  const post=await p.evaluate(()=>CINE.on&&CINE.phase==='post');
  if(post){await p.screenshot({path:`${out}/${id}-post.png`});await p.waitForFunction(()=>!CINE.on,null,{timeout:8000})}
  await p.waitForSelector('#rGo',{timeout:4000});await p.click('#rGo');await p.waitForTimeout(400);
  await p.evaluate(()=>{for(const o of TURBS)if(o.state==='fault'||o.state==='storm'){o.state='run';o.health=100}});
  res.push(`${id}: pre=${ok} post=${post}`);
}
// 點一下畫面可以略過動畫
await p.evaluate(()=>{window.__wft.S.sbx.force='typhoon';endTurn()});await p.waitForTimeout(500);
await p.mouse.click(phone?190:640,phone?420:420);await p.waitForTimeout(200);
const skipped=await p.evaluate(()=>!CINE.on&&!!document.querySelector('.choice'));
res.push('tap-to-skip: '+skipped);
res.push('turbines: '+await p.evaluate(()=>TURBS.length+' / '+installedMW().toFixed(1)+' MW'));console.log(res.join('\n'));console.log('errors:',errs.length?errs:'none');await b.close();})();
