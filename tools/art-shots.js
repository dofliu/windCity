// 美術檢查：固定鏡頭拍幾個特寫（村落、海岸、農田、離岸），存到 tools/out/art-*.png
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const out=path.resolve(__dirname,'out');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(800);
await p.evaluate(()=>{window.__wft.adminSave(Object.fromEntries(LEVELS.map(l=>[l.id,'open'])));SETTINGS.daynight=false});
const shot=async(lv,turn,i,j,z,name,setup)=>{
  await p.evaluate(([lv,turn,setup])=>{window.__wft.startLevel(lv,true);closeModal();S.turn=turn;buildCache();rebuildDrawables();if(setup)eval(setup);updateHUD()},[lv,turn,setup]);
  await p.evaluate(([i,j,z])=>{const w=window.__wft.worldOf(i,j);cam.x=w[0]+120;cam.y=w[1];cam.z=z},[i,j,z]);
  await p.waitForTimeout(1900);await p.screenshot({path:`${out}/art-${name}.png`});
};
const build="S.cash=5000;S.steel=5000;S.blades=99;S.crews=30;S.vessels=0;for(const[i,j]of[[8,16],[10,16],[12,16],[14,16],[9,13],[13,13]])build('t4',tile(i,j));build('sub',tile(11,14));for(const o of TURBS){o.state='run'}reindex();rebuildDrawables();";
await shot('coast',0,5,7,1.9,'village');
await shot('coast',3,11,15,1.5,'coast-autumn',build);
await shot('coast',1,9,12,1.6,'fields-spring',build);
await shot('hills',2,14,8,1.1,'hills-summer');
await shot('offshore',0,6,6,1.2,'offshore');
console.log(JSON.stringify({errs}));await b.close()})();
