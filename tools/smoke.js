// 冒煙測試：用無頭瀏覽器開啟 index.html，回報錯誤並截圖。
// 用法：node tools/smoke.js [輸出截圖路徑]
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:760}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(1500);
const ok=await p.evaluate(()=>!!window.__wft&&!!window.__wft.S);
if(process.argv[2])await p.screenshot({path:process.argv[2]});
console.log(JSON.stringify({ok,errs}));await b.close();process.exit(errs.length||!ok?1:0)})();
