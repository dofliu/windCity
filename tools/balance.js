// 平衡測試：每一關用「好策略」與「草率策略」各跑數個隨機種子，列出評等與目標達成情況。
// 用法：node tools/balance.js [關卡,逗號分隔|all] [種子數=4] [策略=good,naive]
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const lv=(process.argv[2]||'all'),nSeeds=+(process.argv[3]||4),styles=(process.argv[4]||'good,naive').split(',');
const ALL=['coast','hills','storm','aging','offshore','bigoff'];
const levels=lv==='all'?ALL:lv.split(',');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1200,height:800}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(800);
  await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'bot.js'),'utf8')});
  await p.evaluate(()=>{window.__wft.adminSave(Object.fromEntries(LEVELS.map(l=>[l.id,'open'])))});
  const rows=[];
  for(const L of levels)for(const st of styles)for(let k=0;k<nSeeds;k++){
    const seed=11+k*17;
    const t0=Date.now();
    const r=await p.evaluate(([L,st,seed])=>BOT.run(L,st,seed),[L,st,seed]);
    const g=r.goals.map(x=>`${x.k}:${x.v}/${x.t}${x.met?'✓':'✗'}`).join(' ');
    console.log(`${L.padEnd(9)} ${st.padEnd(5)} seed ${String(seed).padEnd(3)} ${r.grade}  ${r.over==='bankrupt'?'破產 ':''}cash ${r.cash}  ${g}  (${((Date.now()-t0)/1000).toFixed(0)}s)`);
    rows.push(r);
  }
  fs.mkdirSync(path.join(__dirname,'out'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'out','balance.json'),JSON.stringify(rows,null,1));
  await b.close();
})();
