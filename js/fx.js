// 風場大亨 — 生活感：日夜循環、夜間燈光、車輛、船隻、鳥群、粒子特效、換季橫幅
'use strict';
const DAY_LEN=160; // 一個日夜循環的秒數
const FX={cars:[],boats:[],birds:[],parts:[],stars:[],roads:[],water:[],birdT:6,glow:{},night:0,dusk:0,sunH:1,pending:[]};

// ---------- 日夜 ----------
function dayState(){
  if(!SETTINGS.daynight||RM)return {night:0,dusk:0,sunH:1};
  const dayT=(time/DAY_LEN+.32)%1,sunH=Math.sin(2*Math.PI*(dayT-.25));
  const night=clamp((.12-sunH)/.55,0,1)*.82;
  const dusk=Math.max(0,1-Math.abs(sunH-.03)/.3);
  return {night,dusk,sunH};
}
const mixC=(a,b,t)=>a.map((v,k)=>Math.round(lerp(v,b[k],t)));
const rgb=c=>`rgb(${c[0]},${c[1]},${c[2]})`;
function skyColors(storm){
  const {night,dusk}=FX;
  let top=[211,236,240],mid=[169,211,220],bot=[127,177,191];
  if(storm){top=[127,147,154];mid=[100,120,128];bot=[78,98,107]}
  top=mixC(top,[246,198,170],dusk*.6);mid=mixC(mid,[236,160,140],dusk*.55);bot=mixC(bot,[150,110,130],dusk*.5);
  top=mixC(top,[10,20,44],night);mid=mixC(mid,[18,32,62],night);bot=mixC(bot,[26,42,72],night);
  return [top,mid,bot];
}
function drawSky(c){
  const [a,b,d]=skyColors(weatherFx==='storm');
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,rgb(a));g.addColorStop(.55,rgb(b));g.addColorStop(1,rgb(d));
  c.fillStyle=g;c.fillRect(0,0,W,H);
  if(FX.night>.05){
    if(!FX.stars.length)for(let k=0;k<140;k++)FX.stars.push({x:VR(),y:VR()*.7,r:VR()*1.2+.3,p:VR()*6});
    for(const s of FX.stars){const a=FX.night*(.45+.55*Math.sin(time*1.7+s.p*5))*.9;if(a<.05)continue;c.fillStyle=`rgba(230,240,255,${a})`;c.beginPath();c.arc(s.x*W,s.y*H,s.r,0,6.283);c.fill()}
  }
}
// 夜晚：先整體壓暗（multiply），再用 lighter 疊上燈光
function drawNight(c){
  const n=FX.night,d=FX.dusk;
  if(n<.02&&d<.05)return;
  c.save();c.setTransform(DPR,0,0,DPR,0,0);c.globalCompositeOperation='multiply';
  let col=mixC([255,255,255],[255,214,186],d*.55);col=mixC(col,[78,96,156],n);
  c.fillStyle=rgb(col);c.fillRect(0,0,W,H);c.restore();
  if(n<.08)return;
  c.save();c.globalCompositeOperation='lighter';
  const L=(x,y,s,k,a)=>{const g=FX.glow[k];c.globalAlpha=Math.min(1,a*n*1.3);c.drawImage(g,x-s,y-s,s*2,s*2)};
  for(const dl of drawList){
    if(dl.k!=='house')continue;const p=iso(dl.x,dl.y,dl.e),h=(dl.x*7.31+dl.y*3.17)%1;
    if(h<.22)continue; // 有些人家已經熄燈
    if(dl.v>=3){L(p[0]-5,p[1]-12,7,'warm',.55);L(p[0]-5,p[1]-22,7,'warm',.45);L(p[0]+5,p[1]-17,6,'warm',.4)}
    else{L(p[0]-6,p[1]-7,7,'warm',.6);L(p[0]+6,p[1]-6,6,'warm',.45)}
  }
  for(const t of FX.roads){if((t.i*3+t.j*5)%4)continue;const p=iso(t.i+.5,t.j+.5,elev(t));L(p[0],p[1],18,'warm',.35);L(p[0],p[1]-9,3,'white',.9)}
  for(const o of FACS){const p=iso(o.i+.5,o.j+.5,elev(tile(o.i,o.j)));
    if(o.kind==='sub'){L(p[0]-8,p[1]-14,9,'cyan',.6);L(p[0]+8,p[1]-10,9,'cyan',.5)}
    else if(o.kind==='om'){L(p[0]-6,p[1]-9,10,'warm',.7);L(p[0]+8,p[1]-8,9,'warm',.5)}
    else if(o.kind==='port'){L(p[0]+4,p[1]-30,10,'warm',.8);L(p[0],p[1]-4,22,'warm',.35)}
    else if(o.kind==='osub'){L(p[0],p[1]-24,12,'white',.7);L(p[0]-6,p[1]-28,5,'red',.9)}
    else if(o.kind==='mast'&&Math.sin(time*3)>.2)L(p[0],p[1]-67,7,'red',1)}
  for(const o of TURBS){if(o.state==='build')continue;const m=MODELS[o.model],p=iso(o.i+.5,o.j+.5,elev(tile(o.i,o.j)));
    if(Math.sin(time*2.6+(o.id||0))>.55)L(p[0],p[1]-m.hub-3,12,'red',1)}
  for(const car of FX.cars){const q=carPos(car),f=sv(car.dx,car.dy),l=Math.hypot(f[0],f[1])||1;L(q[0]+f[0]/l*7,q[1]+f[1]/l*7-2,6,'white',.9);L(q[0]-f[0]/l*5,q[1]-f[1]/l*5-2,3,'red',.7)}
  for(const b of FX.boats){const p=iso(b.x,b.y,-.35);L(p[0],p[1]-6,5,b.kind==='ctv'?'white':'warm',.9)}
  c.restore();
}
function makeGlow(rgbS){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,`rgba(${rgbS},1)`);gr.addColorStop(.25,`rgba(${rgbS},.55)`);gr.addColorStop(1,`rgba(${rgbS},0)`);g.fillStyle=gr;g.fillRect(0,0,64,64);return cv}

// ---------- 車輛、船隻 ----------
function fxRebuild(){
  if(!FX.glow.warm)Object.assign(FX.glow,{warm:makeGlow('255,196,110'),white:makeGlow('235,245,255'),red:makeGlow('255,70,60'),cyan:makeGlow('140,230,255')});
  FX.roads=S.tiles.filter(t=>t.road);
  FX.water=S.tiles.filter(isWater);
  const nCars=RM?0:Math.min(16,Math.floor(FX.roads.length/5));
  FX.cars=FX.cars.filter(c=>c.a&&c.a.road&&tile(c.a.i,c.a.j)===c.a).slice(0,nCars);
  while(FX.cars.length<nCars){const a=FX.roads[Math.floor(VR()*FX.roads.length)];const car={a,b:a,t:1,dx:1,dy:0,sp:.45+VR()*.4,col:['#d9483b','#f2f4f2','#3d6fa8','#f2c230','#5b6a73','#2f8f6a'][Math.floor(VR()*6)]};pickNext(car);FX.cars.push(car)}
  const nBoats=RM?0:Math.min(5,Math.floor(FX.water.length/45));
  fxCritters();
  FX.boats=FX.boats.filter(b=>b.kind!=='ctv'&&tile(Math.floor(b.x),Math.floor(b.y))&&isWater(tile(Math.floor(b.x),Math.floor(b.y)))).slice(0,nBoats);
  while(FX.boats.length<nBoats){const w=FX.water[Math.floor(VR()*FX.water.length)];const b={x:w.i+.5,y:w.j+.5,tx:w.i+.5,ty:w.j+.5,sp:.18+VR()*.12,kind:'fish',wait:0};FX.boats.push(b)}
  // 離岸作業：港口派出的工作船
  const ports=facsOf('port');
  if(ports.length&&!RM){const n=Math.min(S.vessels||0,4);for(let k=0;k<n;k++){const pt=ports[k%ports.length];FX.boats.push({x:pt.i+.5,y:pt.j+.5,tx:pt.i+.5,ty:pt.j+.5,sp:.5,kind:'ctv',port:pt,wait:k*1.5})}}
}
function pickNext(car){
  const a=car.b,nb=DIR4.map(([x,y])=>tile(a.i+x,a.j+y)).filter(t=>t&&t.road);
  let opts=nb.filter(t=>t!==car.a);if(!opts.length)opts=nb;if(!opts.length){car.t=1;return}
  car.a=a;car.b=opts[Math.floor(VR()*opts.length)];car.t=0;car.dx=car.b.i-a.i;car.dy=car.b.j-a.j;
}
function carPos(car){
  const x=lerp(car.a.i,car.b.i,car.t)+.5+car.dy*.14,y=lerp(car.a.j,car.b.j,car.t)+.5-car.dx*.14;
  return iso(x,y,lerp(elev(car.a),elev(car.b),car.t));
}
function drawCars(c){
  for(const car of FX.cars){
    const p=carPos(car),along=car.dx!==0;
    c.save();c.translate(p[0],p[1]);
    shadowEl(c,1,1,6,2.4,.18);
    box(c,0,0,along?.22:.12,along?.12:.22,3.4,0,car.col,car.col,'rgba(0,0,0,.25)');
    box(c,0,0,along?.22:.12,along?.12:.22,3.4,0,null,'rgba(255,255,255,.12)','rgba(0,0,0,.18)');
    box(c,along?-.02:0,along?0:-.02,along?.12:.1,along?.1:.12,2,3.4,'#cfe3ea','#6f8d99','#4d6874');
    c.restore();
  }
}
function boatTarget(b){
  if(b.kind==='ctv'){
    const sites=TURBS.filter(o=>MODELS[o.model].offshore&&(o.state==='build'||o.state==='fault'));
    const pool=sites.length?sites:TURBS.filter(o=>MODELS[o.model].offshore);
    const atPort=Math.hypot(b.x-b.port.i-.5,b.y-b.port.j-.5)<.6;
    if(atPort&&pool.length){const o=pool[Math.floor(VR()*pool.length)];b.tx=o.i+.5+(VR()-.5)*.6;b.ty=o.j+.9}else{b.tx=b.port.i+.5;b.ty=b.port.j+.5}
    b.wait=atPort?2+VR()*3:3+VR()*3;return;
  }
  for(let k=0;k<10;k++){const w=FX.water[Math.floor(VR()*FX.water.length)];if(Math.hypot(w.i-b.x,w.j-b.y)<8){b.tx=w.i+.5;b.ty=w.j+.5;break}}
  b.wait=1+VR()*4;
}
function drawBoats(c){
  for(const b of FX.boats){
    const p=iso(b.x,b.y,-.35),hd=sv(b.hx||1,b.hy||0),l=Math.hypot(hd[0],hd[1])||1,ux=hd[0]/l,uy=hd[1]/l,nx=-uy,ny=ux;
    const bob=Math.sin(time*2+b.x)*.6,L=b.kind==='ctv'?9:7,Wd=b.kind==='ctv'?3.2:2.6;
    if(b.moving){c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=.8;c.beginPath();c.moveTo(p[0]-ux*L*.6,p[1]-uy*L*.6);c.lineTo(p[0]-ux*L*2.4+nx*5,p[1]-uy*L*2.4+ny*5);c.moveTo(p[0]-ux*L*.6,p[1]-uy*L*.6);c.lineTo(p[0]-ux*L*2.4-nx*5,p[1]-uy*L*2.4-ny*5);c.stroke()}
    c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(p[0],p[1]+1,L*.9,3,0,0,6.283);c.fill();
    const y=p[1]+bob;
    poly(c,[[p[0]+ux*L,y+uy*L-2],[p[0]-ux*L*.7+nx*Wd,y-uy*L*.7+ny*Wd-2],[p[0]-ux*L*.8,y-uy*L*.8-1],[p[0]-ux*L*.7-nx*Wd,y-uy*L*.7-ny*Wd-2]],b.kind==='ctv'?'#f4f6f6':'#e9e2d0','rgba(0,0,0,.25)',.4);
    if(b.kind==='ctv'){c.strokeStyle='#f08a24';c.lineWidth=1;c.beginPath();c.moveTo(p[0]+ux*L*.6,y+uy*L*.6-2);c.lineTo(p[0]-ux*L*.6,y-uy*L*.6-2);c.stroke()}
    c.fillStyle=b.kind==='ctv'?'#2f6f8f':'#4f7f9a';c.fillRect(p[0]-2.2-ux*2,y-6.5-uy*2,4.4,4);
    if(b.kind==='fish'){c.strokeStyle='#5b4a3a';c.lineWidth=.5;c.beginPath();c.moveTo(p[0]+ux*3,y+uy*3-3);c.lineTo(p[0]+ux*3,y+uy*3-11);c.stroke()}
  }
}

// ---------- 鳥群 ----------
function drawBirds(c){
  for(const f of FX.birds){
    for(const b of f.list){
      const x=f.x+b.ox,y=f.y+b.oy;
      c.fillStyle='rgba(16,44,40,.12)';c.beginPath();c.ellipse(x+30,y+60,2.4,1,0,0,6.283);c.fill();
      const flap=Math.sin(time*9+b.ph)*3,yy=y-110;
      c.strokeStyle=FX.night>.4?'rgba(220,230,240,.7)':'rgba(30,40,45,.75)';c.lineWidth=1.1;c.lineCap='round';
      c.beginPath();c.moveTo(x-4,yy-flap);c.quadraticCurveTo(x-1.5,yy-1,x,yy);c.quadraticCurveTo(x+1.5,yy-1,x+4,yy-flap);c.stroke();
    }
  }
}

// ---------- 粒子 ----------
function fxDust(i,j,e,big){
  if(RM)return;const p=iso(i+.5,j+.5,e);
  for(let k=0;k<(big?18:11);k++){const a=VR()*6.283,s=VR()*(big?28:18)+8;FX.parts.push({x:p[0],y:p[1],vx:Math.cos(a)*s,vy:Math.sin(a)*s*.5-6,life:0,max:.7+VR()*.5,r:3+VR()*3,grow:big?18:12,col:big?'150,140,125':'176,150,112',kind:'dust'})}
}
function fxSparkle(i,j,e,hgt){
  if(RM)return;const p=iso(i+.5,j+.5,e);
  for(let k=0;k<26;k++){const a=VR()*6.283,s=20+VR()*45;FX.parts.push({x:p[0],y:p[1]-hgt*(.4+VR()*.6),vx:Math.cos(a)*s,vy:Math.sin(a)*s-15,life:0,max:.9+VR()*.7,r:1.4+VR()*1.6,col:VR()<.5?'255,214,90':'160,240,255',kind:'spark'})}
  FX.parts.push({x:p[0],y:p[1],life:0,max:1.1,kind:'ring'});
}
function drawParts(c){
  for(const q of FX.parts){
    const k=q.life/q.max,a=1-k;
    if(q.kind==='dust'){c.fillStyle=`rgba(${q.col},${.45*a})`;c.beginPath();c.arc(q.x,q.y,q.r+q.grow*k,0,6.283);c.fill()}
    else if(q.kind==='ring'){c.strokeStyle=`rgba(255,214,90,${a*.9})`;c.lineWidth=2.4*a+.4;c.beginPath();c.ellipse(q.x,q.y,10+44*k,5+22*k,0,0,6.283);c.stroke()}
    else{c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(${q.col},${a})`;c.translate(q.x,q.y);c.rotate(q.life*4);c.fillRect(-q.r,-q.r*.3,q.r*2,q.r*.6);c.fillRect(-q.r*.3,-q.r,q.r*.6,q.r*2);c.restore()}
  }
}

// ---------- 每幀更新 ----------
function fxUpdate(dt){
  Object.assign(FX,dayState());
  for(const car of FX.cars){if(car.t>=1)pickNext(car);else car.t=Math.min(1,car.t+dt*car.sp)}
  for(const b of FX.boats){
    if(b.wait>0){b.wait-=dt;b.moving=false;continue}
    const dx=b.tx-b.x,dy=b.ty-b.y,d=Math.hypot(dx,dy);
    if(d<.1){b.moving=false;boatTarget(b);continue}
    b.moving=true;b.hx=dx/d;b.hy=dy/d;const s=Math.min(d,b.sp*dt*(weatherFx==='storm'?.6:1));b.x+=dx/d*s;b.y+=dy/d*s;
  }
  if(!RM&&S){FX.birdT-=dt;if(FX.birdT<=0&&FX.birds.length<2){
    const side=VR()<.5,y0=lerp(0,N*TH,VR()),x0=side?-N*TW/2-60:N*TW/2+60,vx=(side?1:-1)*(38+VR()*14),n=5+Math.floor(VR()*4),list=[];
    for(let k=0;k<n;k++){const r=Math.ceil(k/2),sd=k%2?1:-1;list.push({ox:-Math.sign(vx)*r*9,oy:sd*r*6,ph:VR()*6})}
    FX.birds.push({x:x0,y:y0,vx,vy:(VR()-.5)*10,list});FX.birdT=14+VR()*18}}
  for(const f of FX.birds){f.x+=f.vx*dt;f.y+=f.vy*dt}
  if(S)crittersUpdate(dt);
  FX.birds=FX.birds.filter(f=>Math.abs(f.x)<N*TW/2+120);
  for(const q of FX.parts){q.life+=dt;if(q.vx!=null){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.92;q.vy=q.vy*.92+(q.kind==='spark'?30*dt:0)}}
  FX.parts=FX.parts.filter(q=>q.life<q.max);
}

// ---------- 換季橫幅與季末特效 ----------
function fxBanner(title,sub){
  const el=$('#qbanner');if(!el)return;
  el.innerHTML=`<b>${title}</b><span>${sub}</span>`;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
}
function fxAfterReport(rep){
  const se=season();
  fxBanner(dateLabel(S.turn),`${se.name}季・${se.label}`);
  let n=0;for(const id of (rep&&rep.builtIds)||[]){const o=byId.get(id);if(!o)continue;const m=MODELS[o.model];setTimeout(()=>fxSparkle(o.i,o.j,elev(tile(o.i,o.j)),m.hub),200+n*180);n++}
  if(n)setTimeout(()=>sfx('complete'),200);
}
// 資金數字滾動
const ROLL={v:null,raf:0};
function rollCash(target,html){
  const el=$('#c-cash').querySelector('.v');
  if(ROLL.v==null||SBX()||RM){ROLL.v=target;el.innerHTML=html(target);return}
  const from=ROLL.v,diff=target-from;if(Math.abs(diff)<.05){el.innerHTML=html(target);ROLL.v=target;return}
  const chip=$('#c-cash');chip.classList.remove('flash-up','flash-down');void chip.offsetWidth;chip.classList.add(diff>0?'flash-up':'flash-down');
  const t0=performance.now();cancelAnimationFrame(ROLL.raf);
  const step=now=>{const k=Math.min(1,(now-t0)/650),e=1-Math.pow(1-k,3);ROLL.v=from+diff*e;el.innerHTML=html(ROLL.v);if(k<1)ROLL.raf=requestAnimationFrame(step)};
  ROLL.raf=requestAnimationFrame(step);
}

// ---------- 動物：白鷺鷥、水牛、蝴蝶 ----------
FX.egrets=[];FX.buffalo=[];FX.flies=[];FX.smokeT=0;
function fxCritters(){
  if(RM){FX.egrets=[];FX.buffalo=[];FX.flies=[];return}
  const farms=S.tiles.filter(t=>t.t==='farm'&&!t.o&&!t.road),grass=S.tiles.filter(t=>t.t==='grass'&&!t.o&&!t.road&&!t.house&&!t.tree);
  FX.farms=farms;FX.grass=grass;
  const nb=Math.min(4,Math.floor(grass.length/40));
  FX.buffalo=FX.buffalo.filter(b=>grass.includes(b.t)).slice(0,nb);
  while(FX.buffalo.length<nb){const t=grass[Math.floor(VR()*grass.length)];FX.buffalo.push({t,x:t.i+.5,y:t.j+.5,tx:t.i+.5,ty:t.j+.5,wait:VR()*5,hx:1,hy:0,rider:VR()<.5})}
  const ne=Math.min(10,Math.floor(farms.length/8));
  FX.egrets=FX.egrets.slice(0,ne);
  while(FX.egrets.length<ne&&farms.length){const t=farms[Math.floor(VR()*farms.length)];FX.egrets.push({x:t.i+.2+VR()*.6,y:t.j+.2+VR()*.6,fly:0,ph:VR()*6,face:VR()<.5?1:-1})}
  const nf=Math.min(10,Math.floor(grass.length/25));
  FX.flies=FX.flies.slice(0,nf);
  while(FX.flies.length<nf&&grass.length){const t=grass[Math.floor(VR()*grass.length)];FX.flies.push({ax:t.i+.5,ay:t.j+.5,e:elev(t),ph:VR()*6,r:.2+VR()*.25,col:['#fff8e8','#ffd84a','#ff9f4a','#a8d8ff'][Math.floor(VR()*4)]})}
}
function crittersUpdate(dt){
  for(const b of FX.buffalo){
    if(b.wait>0){b.wait-=dt;continue}
    const dx=b.tx-b.x,dy=b.ty-b.y,d=Math.hypot(dx,dy);
    if(d<.05){b.wait=3+VR()*6;const n=FX.grass.filter(t=>Math.abs(t.i-b.x)<3&&Math.abs(t.j-b.y)<3);const t=n[Math.floor(VR()*n.length)]||b.t;b.tx=t.i+.25+VR()*.5;b.ty=t.j+.25+VR()*.5;continue}
    b.hx=dx/d;b.hy=dy/d;const s=Math.min(d,.12*dt);b.x+=b.hx*s;b.y+=b.hy*s;
  }
  for(const e of FX.egrets){
    if(e.fly>0){e.fly+=dt/e.dur;const k=Math.min(1,e.fly);e.x=lerp(e.sx,e.tx,k);e.y=lerp(e.sy,e.ty,k);if(k>=1)e.fly=0}
    else if(VR()<dt*.025&&FX.farms.length){const t=FX.farms[Math.floor(VR()*FX.farms.length)];if(Math.hypot(t.i-e.x,t.j-e.y)<7){e.sx=e.x;e.sy=e.y;e.tx=t.i+.2+VR()*.6;e.ty=t.j+.2+VR()*.6;e.dur=1.5+Math.hypot(e.tx-e.x,e.ty-e.y)*.35;e.fly=.001;e.face=e.tx>e.x?1:-1}}
  }
  // 廟的香煙
  FX.smokeT-=dt;
  if(FX.smokeT<=0&&!RM){FX.smokeT=.35;for(const d of drawList)if(d.k==='house'&&d.v===9){const p=iso(d.x,d.y+.38,d.e);FX.parts.push({x:p[0]+(VR()-.5)*2,y:p[1]-8,vx:(VR()-.5)*3,vy:-9,life:0,max:2.6,r:1.2,grow:5,col:'235,235,235',kind:'dust'})}}
}
function drawCritters(c){
  const dayish=FX.night<.5,q=S?S.turn%4:0;
  for(const b of FX.buffalo){
    const t=tile(Math.floor(b.x),Math.floor(b.y));if(!t)continue;const p=iso(b.x,b.y,elev(t)),dir=sv(b.hx,b.hy)[0]>=0?1:-1,step=b.wait>0?0:Math.sin(time*5)*.6;
    c.save();c.translate(p[0],p[1]);c.scale(dir,1);
    shadowEl(c,.5,.8,5.5,2,.22);
    c.fillStyle='#3e4246';c.beginPath();c.ellipse(0,-3.4,4.4,2.5,0,0,6.283);c.fill();
    c.strokeStyle='#2c2f33';c.lineWidth=.9;c.beginPath();for(const lx of[-2.8,-1.4,1.6,2.9])c.moveTo(lx,-1.5),c.lineTo(lx+(lx>0?step:-step),.3);c.stroke();
    c.fillStyle='#4a4f54';c.beginPath();c.ellipse(4.6,-4.2+(b.wait>0?Math.sin(time*1.5)*.6+1:0),1.9,1.4,0,0,6.283);c.fill();
    c.strokeStyle='#d9d2c0';c.lineWidth=.6;c.beginPath();c.moveTo(4.2,-5.2);c.quadraticCurveTo(3.2,-6.8,4.6,-7.2);c.moveTo(5,-5.2);c.quadraticCurveTo(6.2,-6.8,5.2,-7.2);c.stroke();
    if(b.rider){c.fillStyle='#fff';c.beginPath();c.ellipse(-.6,-6.4,1.4,.8,0,0,6.283);c.fill();c.strokeStyle='#fff';c.lineWidth=.6;c.beginPath();c.moveTo(.6,-6.8);c.lineTo(1.2,-8.6);c.stroke();c.fillStyle='#f2c230';c.fillRect(1.2,-8.9,1.4,.4)}
    c.restore();
  }
  for(const e of FX.egrets){
    const t=tile(Math.floor(e.x),Math.floor(e.y));if(!t)continue;const g=iso(e.x,e.y,elev(t));
    if(e.fly>0){const alt=Math.sin(Math.min(1,e.fly)*Math.PI)*28+4,flap=Math.sin(time*12+e.ph)*2.6;
      c.fillStyle='rgba(16,44,40,.12)';c.beginPath();c.ellipse(g[0]+alt*.42,g[1]+alt*.2,2.6,1,0,0,6.283);c.fill();
      c.strokeStyle='#ffffff';c.lineWidth=1.2;c.lineCap='round';c.beginPath();c.moveTo(g[0]-4,g[1]-alt-flap);c.quadraticCurveTo(g[0]-1.5,g[1]-alt-1,g[0],g[1]-alt);c.quadraticCurveTo(g[0]+1.5,g[1]-alt-1,g[0]+4,g[1]-alt-flap);c.stroke();continue}
    const peck=Math.max(0,Math.sin(time*1.3+e.ph*3))**8*2;
    c.save();c.translate(g[0],g[1]);c.scale(e.face,1);
    c.fillStyle='rgba(16,44,40,.15)';c.beginPath();c.ellipse(.5,.3,2.2,.8,0,0,6.283);c.fill();
    c.strokeStyle='#2b2b2b';c.lineWidth=.35;c.beginPath();c.moveTo(-.4,0);c.lineTo(-.3,-2);c.moveTo(.4,0);c.lineTo(.3,-2);c.stroke();
    c.fillStyle='#ffffff';c.beginPath();c.ellipse(0,-3,1.8,1.05,-.2,0,6.283);c.fill();
    c.strokeStyle='#ffffff';c.lineWidth=.7;c.beginPath();c.moveTo(1.2,-3.4);c.quadraticCurveTo(1.9,-4.8+peck,1.6,-5.6+peck*1.6);c.stroke();
    c.fillStyle='#f2c230';c.beginPath();c.moveTo(1.6,-5.8+peck*1.6);c.lineTo(3,-5.4+peck*1.9);c.lineTo(1.6,-5.4+peck*1.6);c.fill();
    c.restore();
  }
  if(dayish&&(q===1||q===2))for(const b of FX.flies){
    const a=time*.9+b.ph,x=b.ax+Math.cos(a)*b.r+Math.sin(a*2.3)*.08,y=b.ay+Math.sin(a*1.3)*b.r,p=iso(x,y,b.e),z=7+Math.sin(a*3)*2.5,w=Math.abs(Math.sin(time*16+b.ph))*1.8+.3;
    c.fillStyle=b.col;c.beginPath();c.ellipse(p[0]-w*.6,p[1]-z,w,1.1,-.4,0,6.283);c.ellipse(p[0]+w*.6,p[1]-z,w,1.1,.4,0,6.283);c.fill();
  }
}
// ---------- 天上的雲 ----------
function drawClouds(c){
  if(RM)return;
  const alt=170;
  for(const cl of clouds){
    const sp=iso(cl.x,cl.y,1),gx=sp[0]-alt*.42,gy=sp[1]-alt*.2-alt,R=cl.r*TW*.32;
    const k=FX.night>.4?.35:1;
    for(const[dx,dy,r]of[[-.6,.1,.55],[0,-.15,.7],[.6,.05,.55],[-.25,.25,.5],[.3,.28,.5]]){
      const x=gx+dx*R,y=gy+dy*R*.5,rr=r*R,g=c.createRadialGradient(x,y-rr*.3,rr*.1,x,y,rr);
      g.addColorStop(0,`rgba(255,255,255,${.5*k})`);g.addColorStop(.7,`rgba(250,252,255,${.32*k})`);g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g;c.beginPath();c.ellipse(x,y,rr,rr*.62,0,0,6.283);c.fill();
    }
  }
}
