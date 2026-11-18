// 逐關冒煙測試：開啟每一關、推進幾季，回報錯誤並截圖到 tools/out/
// 用法：node tools/levels-smoke.js [季數=3]
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const turns=+(process.argv[2]||3),out=path.resolve(__dirname,'out');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve(__dirname,'..','index.html')+'#admin');await p.waitForTimeout(1200);
await p.evaluate(()=>{window.__noCine=true});
await p.evaluate(()=>window.__wft.showLevels());await p.waitForTimeout(300);
await p.screenshot({path:out+'/00-levels.png'});
// 全部開放後逐關測試
await p.evaluate(()=>window.__wft.adminSave(Object.fromEntries(LEVELS.map(l=>[l.id,'open']))));
const ids=await p.evaluate(()=>['tutorial','sandbox','coast','hills','storm','aging','offshore','bigoff']);
for(const id of ids){
  await p.evaluate(id=>window.__wft.startLevel(id,true),id);await p.waitForTimeout(300);
  await p.screenshot({path:`${out}/${id}-brief.png`});
  await p.evaluate(()=>{const g=document.querySelector('#iGo');g&&g.click()});
  for(let k=0;k<turns;k++){
    await p.evaluate(()=>{window.__wft.endTurn();const ch=document.querySelector('.choice');if(ch)ch.click();const go=document.querySelector('#rGo');if(go)go.click();const f=document.querySelector('#fMap');if(f)f.click()});
  }
  await p.waitForTimeout(400);
  await p.screenshot({path:`${out}/${id}-map.png`});
  const st=await p.evaluate(()=>({lv:window.__wft.LV.id,N:window.__wft.S.tiles.length,turn:window.__wft.S.turn,objs:window.__wft.S.objs.length,owned:window.__wft.S.parcels.filter(x=>x.owned).map(x=>''+x.px+x.py).join(' ')}));
  console.log(id,JSON.stringify(st));
}
await p.evaluate(()=>window.__wft.showLevels());await p.waitForTimeout(300);await p.screenshot({path:out+'/01-levels-open.png',fullPage:false});
console.log('ERRORS',JSON.stringify(errs.slice(0,15)));await b.close();process.exit(errs.length?1:0)})();
