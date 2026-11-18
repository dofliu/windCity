// 風場大亨 — 事件動畫：回合結束時先在地圖上演出事件，結算後再演出結果
'use strict';
const POST_CINE=new Set(['typhoon','protest','town']);
const CINE={on:false,t:0,dur:0,phase:'',kind:'',ev:null,rep:null,done:null,cam:null,people:[],gusts:[],coins:[],flock:[],bolts:[],flash:0,tgt:null,sub:''};
const cineOn=()=>SETTINGS.cine!==false&&!RM&&!window.__noCine;
const wpt=(i,j)=>iso(i+.5,j+.5,elev(tile(i,j)));
function ownedCenter(){let sx=0,sy=0,n=0;for(const p of S.parcels)if(p.owned){sx+=p.px*PS+PS/2;sy+=p.py*PS+PS/2;n++}return n?[sx/n,sy/n]:[N/2,N/2]}
function cineCam(wx,wy,z,ms=800){CINE.cam={x0:cam.x,y0:cam.y,z0:cam.z,x1:wx,y1:wy,z1:clamp(z,.3,2.4),t0:performance.now(),ms}}
function fitZoom(){return clamp(Math.min((W-80)/(N*TW),(H-260)/(N*TH+160)),.3,1)}
function nearHouses(i,j,r){return S.tiles.filter(t=>t.house&&Math.hypot(t.i-i,t.j-j)<=r)}
function landNear(i,j){let best=null,bd=99;for(const t of S.tiles){if(isWater(t)||t.o||t.house)continue;const d=Math.hypot(t.i-i,t.j-j);if(d>0&&d<bd){bd=d;best=t}}return best}
function crowd(fromTiles,gi,gj,n,signs){
  const out=[],cols=['#e8483b','#3d6fa8','#f2c230','#2f8f6a','#9b59b6','#f08a24','#eeeeee'];
  for(let k=0;k<n;k++){const h=fromTiles[k%Math.max(1,fromTiles.length)]||tile(gi,gj);
    out.push({x:h.i+.5+(VR()-.5)*.4,y:h.j+.5+(VR()-.5)*.4,tx:gi+.5+(VR()-.5)*1.1,ty:gj+.5+(VR()-.5)*1.1,col:cols[k%cols.length],ph:VR()*6,sign:signs?signs[k%signs.length]:null,delay:VR()*.6})}
  return out;
}
function cineCaption(ic_,title,sub,tone){
  const el=$('#cine');
  el.innerHTML=`<div class="evicon tone-${tone||'neutral'}">${ic(ic_)}</div><div class="cine-tx"><b>${title}</b><span>${sub||''}</span></div><button class="btn sm" id="cineSkip" data-silent="1">略過 ›</button>`;
  el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  $('#qbanner').classList.remove('show');
  $('#cineSkip').onclick=cineEnd;
}
function playCine(phase,data,done){
  if(!cineOn()){done();return}
  const ev=data.ev,rep=data.rep||null;
  Object.assign(CINE,{on:true,t:0,phase,ev,rep,done,flash:0,gusts:[],coins:[],flock:[],bolts:[],ty:null,fl:null,hits:[],built:[],mood:null,cam:null,kind:phase==='pre'?ev.id:'post'});
  if(phase==='pre'){CINE.people=[];CINE.tgt=null}
  const oc=ownedCenter(),ow=iso(oc[0],oc[1],1);
  let dur=2.6;
  if(phase==='pre'){
    const k=ev.id;
    cineCaption(ev.icon,ev.title,ev.desc||ev.note||'季中事件',ev.tone);
    if(k==='typhoon'){dur=3.8;const c=iso(N/2,N/2,0);cineCam(c[0],c[1]+40,fitZoom(),900);CINE.ty={x0:iso(N*1.25,N*1.05)[0],y0:iso(N*1.25,N*1.05)[1],x1:ow[0],y1:ow[1]};sfx('typhoon')}
    else if(k==='protest'){dur=4;
      const T=TURBS.filter(o=>houseNear(o.i,o.j,4)).sort((a,b)=>nearHouses(b.i,b.j,4).length-nearHouses(a.i,a.j,4).length);
      const o=T[0]||TURBS[0];const g=o?landNear(o.i,o.j)||tile(o.i,o.j):tile(Math.floor(oc[0]),Math.floor(oc[1]));
      const hs=o?nearHouses(o.i,o.j,6):[];CINE.tgt=[g.i,g.j];CINE.people=crowd(hs,g.i,g.j,10,['噪音','抗議','還我寧靜']);
      const w=wpt(g.i,g.j);cineCam(w[0],w[1]-20,1.6);sfx('crowd')}
    else if(k==='lightning'){dur=3.2;const o=byId.get(ev.strike)||TURBS[0];if(o){CINE.tgt=[o.i,o.j];const w=wpt(o.i,o.j);cineCam(w[0],w[1]-MODELS[o.model].hub*.6,1.5)}
      CINE.bolts=[{t:1.2,seed:VR()},{t:1.95,seed:VR()},{t:2.5,seed:VR()}]}
    else if(k==='curtail'){dur=3;cineCam(ow[0],ow[1],1.05);sfx('alarm')}
    else if(k==='monsoon'||k==='lowwind'){dur=2.6;cineCam(ow[0],ow[1],1);if(k==='monsoon'){for(let n=0;n<46;n++)CINE.gusts.push({x:VR()*N,y:VR()*N,z:30+VR()*90,s:3+VR()*2,l:.6+VR()*.8});sfx('whoosh')}}
    else if(k==='steelUp'||k==='steelDown'||k==='bladeShort'){dur=2.6;cineCam(ow[0],ow[1],1.1);sfx(k==='steelDown'?'coin':'error')}
    else if(k==='subsidy'){dur=2.8;cineCam(ow[0],ow[1],1.1);for(let n=0;n<60;n++)CINE.coins.push({x:oc[0]+(VR()-.5)*PS*2,y:oc[1]+(VR()-.5)*PS*1.6,z:160+VR()*220,v:0,d:VR()*1.2,b:0});sfx('coin')}
    else if(k==='ppa'){dur=2.8;cineCam(ow[0],ow[1],.95);sfx('report')}
    else if(k==='birds'){dur=3.2;cineCam(ow[0],ow[1],1);const f=flowNow();for(let n=0;n<26;n++){const r=Math.ceil(n/2),sd=n%2?1:-1;CINE.flock.push({ox:-r*.9+(VR()-.5)*.4,oy:sd*r*.6+(VR()-.5)*.4,ph:VR()*6})}CINE.fl={x0:oc[0]-f[0]*14,y0:oc[1]-f[1]*14,dx:f[0]*28,dy:f[1]*28};sfx('chirp')}
    else if(k==='heatwave'){dur=2.8;cineCam(ow[0],ow[1],1);sfx('whoosh')}
    else if(k==='crane'){dur=2.6;const o=TURBS.find(x=>x.state==='build');if(o){CINE.tgt=[o.i,o.j];const w=wpt(o.i,o.j);cineCam(w[0],w[1]-MODELS[o.model].hub*.4,1.5)}sfx('error')}
    else if(k==='town'){dur=3.6;const vc=villageCenters().map(([i,j])=>tile(i,j)).filter(Boolean)[0]||tile(Math.floor(oc[0]),Math.floor(oc[1]));const g=landNear(vc.i,vc.j)||vc;CINE.tgt=[g.i,g.j];CINE.people=crowd(nearHouses(vc.i,vc.j,5),g.i,g.j,9,null);const w=wpt(g.i,g.j);cineCam(w[0],w[1]-20,1.6);sfx('crowd')}
    else if(k==='techcoop'){dur=2.6;const om=facsOf('om')[0];const w=om?wpt(om.i,om.j):ow;CINE.tgt=om?[om.i,om.j]:[Math.floor(oc[0]),Math.floor(oc[1])];cineCam(w[0],w[1]-30,1.3);sfx('research')}
  }else{
    // 結算演出：受損、完工、收入、颱風離開、民眾反應
    const hits=rep.hitIds.map(id=>byId.get(id)).filter(Boolean),built=rep.builtIds.map(id=>byId.get(id)).filter(Boolean),all=[...hits,...built];
    dur=2.4;
    const ki=ev&&ev.id;
    if((ki==='protest'||ki==='town')&&CINE.tgt&&CINE.people.length){dur=2.6;CINE.mood=(ev.support||0)>0?'happy':'angry';const w=wpt(CINE.tgt[0],CINE.tgt[1]);cineCam(w[0],w[1]-20,1.6,500)}
    else if(all.length){let sx=0,sy=0;for(const o of all){sx+=o.i;sy+=o.j}const w=iso(sx/all.length+.5,sy/all.length+.5,1);cineCam(w[0],w[1]-30,all.length>3?1:1.3,600)}
    if(ki==='typhoon'){CINE.ty={x0:ow[0],y0:ow[1],x1:iso(-N*.4,N*.1)[0],y1:iso(-N*.4,N*.1)[1]}}
    CINE.hits=hits.map((o,n)=>({o,t:.35+n*.22}));CINE.built=built.map((o,n)=>({o,t:.3+n*.2}));
    const parts=[];if(built.length)parts.push(`${built.length} 部完工`);if(hits.length)parts.push(`${hits.length} 部受損或故障`);
    if(rep.net)parts.push(`淨利 ${rep.net>=0?'+':'−'}${fmt(Math.abs(rep.net),1)}M`);
    cineCaption(hits.length?'i-alert':built.length?'i-turbine':'i-coin',`${rep.label} 結算`,parts.join('・')||rep.ev.title,hits.length?'bad':'good');
    if(rep.net>0)for(const s of facsOf('sub').slice(0,3))for(let n=0;n<6;n++)CINE.coins.push({sub:s,d:.2+n*.12+VR()*.1,ph:VR()*6});
  }
  CINE.dur=dur;document.body.classList.add('cine');
}
function cineAbort(){CINE.on=false;CINE.done=null;CINE.people=[];$('#cine').hidden=true;document.body.classList.remove('cine')}
function cineEnd(){
  if(!CINE.on)return;
  CINE.on=false;$('#cine').hidden=true;document.body.classList.remove('cine');
  if(CINE.phase==='post'){CINE.people=[];if(weatherFx==='storm'&&CINE.ev&&CINE.ev.id==='typhoon')weatherFx='clear'}
  const d=CINE.done;CINE.done=null;if(d)d();
}
function cineUpdate(dt){
  if(!CINE.on)return;
  CINE.t+=dt;const t=CINE.t;
  if(CINE.cam){const c=CINE.cam,k=Math.min(1,(performance.now()-c.t0)/c.ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;cam.x=lerp(c.x0,c.x1,e);cam.y=lerp(c.y0,c.y1,e);cam.z=lerp(c.z0,c.z1,e);if(k>=1)CINE.cam=null}
  for(const p of CINE.people){
    if(CINE.phase==='post'&&t>1.4&&CINE.tgt){p.tx=p.x+(p.x-CINE.tgt[0]-.5)*2;p.ty=p.y+(p.y-CINE.tgt[1]-.5)*2}
    if(t<p.delay)continue;const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);p.walk=d>.05;if(p.walk){const s=Math.min(d,dt*1.1);p.x+=dx/d*s;p.y+=dy/d*s}
  }
  for(const g of CINE.gusts){const f=flowNow();g.x+=f[0]*g.s*dt;g.y+=f[1]*g.s*dt}
  for(const b of CINE.bolts)if(!b.hit&&t>=b.t){b.hit=true;CINE.flash=1;sfx('thunder')}
  CINE.flash=Math.max(0,CINE.flash-dt*3.5);
  if(CINE.phase==='post'){for(const h of CINE.hits||[])if(!h.fired&&t>=h.t){h.fired=true;const o=h.o,m=MODELS[o.model],e=elev(tile(o.i,o.j));fxHit(o.i,o.j,e,m.hub);sfx('bulldoze')}
    for(const b of CINE.built||[])if(!b.fired&&t>=b.t){b.fired=true;fxSparkle(b.o.i,b.o.j,elev(tile(b.o.i,b.o.j)),MODELS[b.o.model].hub);sfx('complete')}}
  if(t>=CINE.dur)cineEnd();
}
// 受損：紅色衝擊環＋火花＋黑煙
function fxHit(i,j,e,hgt){
  const p=iso(i+.5,j+.5,e);
  for(let k=0;k<22;k++){const a=VR()*6.283,s=25+VR()*50;FX.parts.push({x:p[0],y:p[1]-hgt*(.6+VR()*.4),vx:Math.cos(a)*s,vy:Math.sin(a)*s-10,life:0,max:.6+VR()*.5,r:1.3+VR()*1.4,col:VR()<.5?'255,120,60':'255,220,90',kind:'spark'})}
  for(let k=0;k<8;k++)FX.parts.push({x:p[0]+(VR()-.5)*6,y:p[1]-hgt,vx:(VR()-.5)*8,vy:-10-VR()*8,life:0,max:1.4+VR()*.6,r:2.5,grow:9,col:'60,60,60',kind:'dust'});
  FX.parts.push({x:p[0],y:p[1],life:0,max:.9,kind:'ring',red:true});
}
// ---------- 繪製（世界座標） ----------
function cineText(c,x,y,txt,size,col,bg){
  const s=1/cam.z;c.save();c.translate(x,y);c.scale(s,s);c.font=`900 ${size}px "Noto Sans TC",sans-serif`;const w=c.measureText(txt).width+18;
  if(bg){c.fillStyle=bg;c.beginPath();c.roundRect?c.roundRect(-w/2,-size*.95,w,size*1.7,10):c.rect(-w/2,-size*.95,w,size*1.7);c.fill();c.strokeStyle=OL;c.lineWidth=2;c.stroke()}
  c.fillStyle=col;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,0,0);c.restore();
}
function drawPerson(c,p){
  const t=tile(Math.floor(p.x),Math.floor(p.y));if(!t)return;const g=iso(p.x,p.y,elev(t)),step=p.walk?Math.sin(time*12+p.ph)*1.2:0,bob=p.walk?Math.abs(Math.sin(time*12+p.ph))*.8:Math.max(0,Math.sin(time*5+p.ph))*1.4;
  c.save();c.translate(g[0],g[1]);c.scale(1.7,1.7);
  shadowEl(c,.6,.4,2.6,1,.25);
  c.strokeStyle='#2d2d2d';c.lineWidth=.9;c.lineCap='round';c.beginPath();c.moveTo(-.7,-2.6);c.lineTo(-.7+step*.5,0);c.moveTo(.7,-2.6);c.lineTo(.7-step*.5,0);c.stroke();
  c.fillStyle=p.col;c.beginPath();c.ellipse(0,-4.6-bob,1.9,2.6,0,0,6.283);c.fill();c.strokeStyle=OL;c.lineWidth=.4;c.stroke();
  c.fillStyle='#f2c9a0';c.beginPath();c.arc(0,-8.2-bob,1.55,0,6.283);c.fill();c.stroke();
  c.fillStyle='#2d2d2d';c.beginPath();c.arc(0,-8.9-bob,1.5,Math.PI,0);c.fill();
  if(p.sign){const up=p.walk?0:Math.sin(time*6+p.ph)*1.5;c.strokeStyle='#7a5a3a';c.lineWidth=.6;c.beginPath();c.moveTo(1.8,-5-bob);c.lineTo(2,-15-bob-up);c.stroke();
    c.fillStyle='#fffdf5';c.fillRect(-2.6,-20.5-bob-up,9.2,5.4);c.strokeStyle=OL;c.lineWidth=.4;c.strokeRect(-2.6,-20.5-bob-up,9.2,5.4);
    c.fillStyle='#d9483b';c.font='900 3.4px "Noto Sans TC",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(p.sign,2,-17.8-bob-up)}
  c.restore();
}
function drawTyphoon(c,x,y,a){
  const R=N*TW*.3,rot=-time*1.9;
  c.save();c.translate(x+60,y+30);c.scale(1,.5);const sh=c.createRadialGradient(0,0,10,0,0,R);sh.addColorStop(0,`rgba(10,25,35,${.35*a})`);sh.addColorStop(1,'rgba(10,25,35,0)');c.fillStyle=sh;c.beginPath();c.arc(0,0,R,0,6.283);c.fill();c.restore();
  c.save();c.translate(x,y-150);c.scale(1,.55);
  const g=c.createRadialGradient(0,0,R*.06,0,0,R);g.addColorStop(0,`rgba(40,55,70,${.75*a})`);g.addColorStop(.1,`rgba(240,244,248,${.85*a})`);g.addColorStop(.55,`rgba(214,224,232,${.55*a})`);g.addColorStop(1,'rgba(200,210,220,0)');
  c.fillStyle=g;c.beginPath();c.arc(0,0,R,0,6.283);c.fill();
  c.lineCap='round';
  for(let arm=0;arm<4;arm++){c.beginPath();for(let s=0;s<=44;s++){const r=R*.09+R*.86*s/44,th=rot+arm*Math.PI/2+s*.085;const px=Math.cos(th)*r,py=Math.sin(th)*r;s?c.lineTo(px,py):c.moveTo(px,py)}c.strokeStyle=`rgba(255,255,255,${.6*a})`;c.lineWidth=R*.075;c.stroke()}
  c.fillStyle=`rgba(25,40,55,${.85*a})`;c.beginPath();c.arc(0,0,R*.06,0,6.283);c.fill();
  c.restore();
}
function bolt(c,x0,y0,x1,y1,seed){
  const R=mulberry32(Math.floor(seed*1e6)),pts=[[x0,y0]];const n=7;
  for(let k=1;k<n;k++){const u=k/n;pts.push([lerp(x0,x1,u)+(R()-.5)*22,lerp(y0,y1,u)+(R()-.5)*6])}pts.push([x1,y1]);
  c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.lineJoin='round';
  for(const[w,col]of[[7,'rgba(140,190,255,.35)'],[3,'rgba(200,225,255,.8)'],[1.3,'#ffffff']]){c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach((p,k)=>k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
  c.restore();
}
function drawCine(c){
  if(!CINE.on&&!CINE.people.length)return;
  const t=CINE.t,k=CINE.dur?clamp(t/CINE.dur,0,1):1,kind=CINE.kind,ev=CINE.ev;
  for(const p of CINE.people)drawPerson(c,p);
  if(!CINE.on)return;
  if(CINE.ty){const e=CINE.phase==='pre'?1-Math.pow(1-k,2):k*k,x=lerp(CINE.ty.x0,CINE.ty.x1,e),y=lerp(CINE.ty.y0,CINE.ty.y1,e);drawTyphoon(c,x,y,CINE.phase==='pre'?Math.min(1,k*3):1-k)}
  if((kind==='protest'||kind==='town'||(CINE.phase==='post'&&CINE.people.length))&&CINE.tgt){
    const w=wpt(CINE.tgt[0],CINE.tgt[1]),lines=kind==='town'?['說明會','回饋計畫'] :['太吵了！','晚上睡不著','風機離我們太近'];
    if(CINE.phase==='pre'&&t>1.6){const n=Math.floor((t-1.6)/.8)%lines.length;cineText(c,w[0]+Math.sin(t)*6,w[1]-46,lines[n],15,kind==='town'?'#2f6f8f':'#c0392b','rgba(255,255,255,.95)')}
    if(CINE.phase==='post'){const happy=CINE.mood==='happy';for(let n=0;n<6;n++){const a=(t*1.4+n/6)%1;cineText(c,w[0]+(n-2.5)*9,w[1]-20-a*40,happy?'♥':'！',14,happy?`rgba(232,72,120,${1-a})`:`rgba(217,72,59,${1-a})`,null)}}
  }
  if(kind==='lightning'&&CINE.tgt){const o=byId.get(ev.strike)||TURBS[0],w=wpt(CINE.tgt[0],CINE.tgt[1]),h=o?MODELS[o.model].hub:70,cy=w[1]-h-70;
    for(const[dx,dy,r]of[[-26,4,20],[0,-6,26],[26,2,20],[-10,10,18],[14,12,18]]){c.fillStyle=`rgba(60,66,80,${Math.min(.92,k*2)})`;c.beginPath();c.ellipse(w[0]+dx,cy+dy,r,r*.6,0,0,6.283);c.fill()}
    for(const b of CINE.bolts)if(b.hit&&t-b.t<.22)bolt(c,w[0]+(b.seed-.5)*30,cy+10,w[0]+4,w[1]-h-6,b.seed)}
  if(kind==='curtail'){for(const s of facsOf('sub')){const w=wpt(s.i,s.j),pulse=.5+.5*Math.sin(t*8);c.strokeStyle=`rgba(255,80,60,${.4+.5*pulse})`;c.lineWidth=3/cam.z;c.beginPath();c.ellipse(w[0],w[1],30+pulse*8,15+pulse*4,0,0,6.283);c.stroke();cineText(c,w[0],w[1]-44,'⚡ 限電',22,'#fff','rgba(217,72,59,.95)')}
    c.strokeStyle=`rgba(255,80,60,${.5+.4*Math.sin(t*10)})`;c.lineWidth=3/cam.z;c.setLineDash([8/cam.z,6/cam.z]);c.lineDashOffset=-t*30;
    for(const o of TURBS){const s=GRID.asg.get(o);if(!s)continue;const a=wpt(o.i,o.j),b=wpt(s.i,s.j);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}c.setLineDash([])}
  if(kind==='monsoon'){const f=flowNow(),fs=sv(f[0],f[1]),l=Math.hypot(fs[0],fs[1]);c.lineCap='round';
    for(const g of CINE.gusts){const p=iso(g.x,g.y,0);p[1]-=g.z;const a=Math.min(1,k*4)*(1-k)*.9;c.strokeStyle=`rgba(255,255,255,${a})`;c.lineWidth=2.2;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0]-fs[0]/l*60*g.l,p[1]-fs[1]/l*60*g.l);c.stroke()}}
  if(kind==='subsidy'){for(const q of CINE.coins){const tt=Math.max(0,t-q.d);let z=q.z-tt*tt*260;if(z<0){z=Math.abs(Math.sin(tt*6))*8*Math.max(0,1-(tt-1));}
      const p=iso(q.x,q.y,1);p[1]-=z;const sp=Math.abs(Math.cos(time*6+q.x));const R=7.5;c.fillStyle='#f2c230';c.beginPath();c.ellipse(p[0],p[1],R*sp+.8,R,0,0,6.283);c.fill();c.strokeStyle='#8a6208';c.lineWidth=1.3;c.stroke();if(sp>.5){c.fillStyle='#fff3b0';c.beginPath();c.ellipse(p[0]-R*sp*.3,p[1]-R*.3,R*sp*.25,R*.25,0,0,6.283);c.fill()}}
    const oc=ownedCenter(),w=iso(oc[0],oc[1],1);if(t>1)cineText(c,w[0],w[1]-60-(t-1)*10,ev.note||'售電費率 +0.4 元/度',20,'#2f2100','rgba(255,214,90,.95)')}
  if(kind==='birds'&&CINE.fl){const e=k,cx=CINE.fl.x0+CINE.fl.dx*e,cy=CINE.fl.y0+CINE.fl.dy*e;
    for(const b of CINE.flock){const p=iso(cx+b.ox,cy+b.oy,0);const yy=p[1]-90,flap=Math.sin(time*9+b.ph)*6;c.fillStyle='rgba(16,44,40,.14)';c.beginPath();c.ellipse(p[0]+30,p[1]+15,6,2.2,0,0,6.283);c.fill();
      c.strokeStyle='#26343a';c.lineWidth=2.6;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(p[0]-11,yy-flap);c.quadraticCurveTo(p[0]-4,yy-2,p[0],yy+1);c.quadraticCurveTo(p[0]+4,yy-2,p[0]+11,yy-flap);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(p[0],yy+1,1.6,0,6.283);c.fill()}}
  if(kind==='crane'&&CINE.tgt){const o=byId.get(TURBS.find(x=>x.state==='build')?.id),w=wpt(CINE.tgt[0],CINE.tgt[1]);if(Math.sin(t*7)>-.2)cineText(c,w[0]+16,w[1]-(o?MODELS[o.model].hub:70)*.6-20,'⏳ 延誤一季',18,'#fff','rgba(240,138,36,.95)')}
  if(kind==='techcoop'&&CINE.tgt){const w=wpt(CINE.tgt[0],CINE.tgt[1]),y=w[1]-70-Math.sin(t*3)*4,s=1.8/cam.z;c.save();c.translate(w[0],y);c.scale(s,s);
    c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(255,220,90,.7)';c.lineWidth=3;for(let n=0;n<10;n++){const a=n/10*6.283+t;c.beginPath();c.moveTo(Math.cos(a)*24,Math.sin(a)*24);c.lineTo(Math.cos(a)*34,Math.sin(a)*34);c.stroke()}c.restore();
    c.fillStyle='#ffe066';c.beginPath();c.arc(0,-4,15,0,6.283);c.fill();c.strokeStyle=OL;c.lineWidth=2.4;c.stroke();c.fillStyle='#c9d0d2';c.fillRect(-7,10,14,9);c.strokeRect(-7,10,14,9);c.restore()}
  if(CINE.phase==='post'&&CINE.coins.length){for(const q of CINE.coins){const tt=t-q.d;if(tt<0||tt>1.3)continue;const w=wpt(q.sub.i,q.sub.j);const y=w[1]-20-tt*60,x=w[0]+Math.sin(tt*5+q.ph)*10,a=1-tt/1.3;c.globalAlpha=a;c.fillStyle='#f2c230';c.beginPath();c.ellipse(x,y,4,4,0,0,6.283);c.fill();c.strokeStyle='#a87a12';c.lineWidth=.8;c.stroke();c.globalAlpha=1}}
}
// ---------- 繪製（螢幕座標）：閃光、熱浪、弱風霧氣 ----------
function drawCineScreen(c){
  if(!CINE.on)return;
  const k=clamp(CINE.t/CINE.dur,0,1),kind=CINE.kind,fade=Math.min(1,CINE.t*3)*Math.min(1,(CINE.dur-CINE.t)*3);
  if(CINE.flash>0){c.fillStyle=`rgba(235,242,255,${CINE.flash*.75})`;c.fillRect(0,0,W,H)}
  if(kind==='heatwave'){const g=c.createRadialGradient(W*.85,H*.05,10,W*.85,H*.05,W*.7);g.addColorStop(0,`rgba(255,230,140,${.55*fade})`);g.addColorStop(1,'rgba(255,160,60,0)');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.fillStyle=`rgba(255,140,50,${.12*fade})`;c.fillRect(0,0,W,H);
    c.strokeStyle=`rgba(255,255,255,${.12*fade})`;c.lineWidth=2;for(let n=0;n<14;n++){const y=(n/14*H+CINE.t*40)%H;c.beginPath();for(let x=0;x<=W;x+=20){const yy=y+Math.sin(x*.02+CINE.t*4+n)*4;x?c.lineTo(x,yy):c.moveTo(x,yy)}c.stroke()}}
  if(kind==='steelUp'||kind==='steelDown'||kind==='bladeShort'){
    const up=kind!=='steelDown',lbl=kind==='bladeShort'?'葉片報價':'鋼材報價',pct=((CINE.ev.note||'').match(/[+−-]\s?\d+%/)||[''])[0],col=up?'#d9483b':'#2f9e5a';
    const pw=Math.min(300,W-40),ph=150,x=W/2,y=H*.5,pop=easeBack(Math.min(1,CINE.t*2.5));
    c.save();c.translate(x,y);c.scale(pop,pop);c.globalAlpha=fade;
    c.fillStyle='rgba(255,255,255,.97)';c.beginPath();c.roundRect(-pw/2,-ph/2,pw,ph,18);c.fill();c.strokeStyle=OL;c.lineWidth=3;c.stroke();
    c.fillStyle='#2b3a40';c.font='900 18px "Noto Sans TC",sans-serif';c.textAlign='left';c.textBaseline='alphabetic';c.fillText(lbl,-pw/2+18,-ph/2+34);
    c.fillStyle=col;c.font='900 38px "Barlow Condensed",sans-serif';c.textAlign='right';c.fillText(pct,pw/2-18,-ph/2+42);
    const pts=[[-.42,.3],[-.27,.2],[-.13,.34],[0,.16],[.14,.26],[.42,up?-.12:.52]].map(([u,v])=>[u*pw,v*ph]),m=Math.min(pts.length-1,k*2.4*(pts.length-1));
    c.strokeStyle=col;c.lineWidth=5;c.lineJoin='round';c.lineCap='round';c.beginPath();
    for(let n=0;n<=Math.floor(m);n++){const p=pts[n];n?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])}
    let tip=pts[Math.floor(m)];if(m<pts.length-1){const f=m%1,a0=pts[Math.floor(m)],b0=pts[Math.floor(m)+1];tip=[lerp(a0[0],b0[0],f),lerp(a0[1],b0[1],f)];c.lineTo(tip[0],tip[1])}c.stroke();
    c.fillStyle=col;c.beginPath();c.arc(tip[0],tip[1],7,0,6.283);c.fill();c.restore();c.globalAlpha=1}
  if(kind==='ppa'){
    const fx=W/2,fy=Math.max(150,H*.24),pop=easeBack(Math.min(1,CINE.t*2.5)),scr=(x,y)=>[(x-cam.x)*cam.z+W/2,(y-cam.y)*cam.z+H/2];
    c.save();c.globalCompositeOperation='lighter';
    for(const o of TURBS){if(o.state==='build')continue;const w=wpt(o.i,o.j),a=scr(w[0],w[1]-MODELS[o.model].hub);
      for(let n=0;n<3;n++){const u=(CINE.t*.8+n/3+o.id*.13)%1,x=lerp(a[0],fx,u),y=lerp(a[1],fy+30,u)-Math.sin(u*Math.PI)*60;c.fillStyle=`rgba(110,255,160,${.9*Math.sin(u*Math.PI)*fade})`;c.beginPath();c.arc(x,y,4.5,0,6.283);c.fill()}}
    c.restore();
    c.save();c.translate(fx,fy);c.scale(pop,pop);c.globalAlpha=fade;c.strokeStyle=OL;c.lineWidth=3;
    c.fillStyle='#e9eef0';c.fillRect(-58,-30,116,56);c.strokeRect(-58,-30,116,56);
    c.fillStyle='#b8c4c8';c.fillRect(22,-74,18,44);c.strokeRect(22,-74,18,44);c.fillStyle='#b8c4c8';c.fillRect(-10,-58,14,28);c.strokeRect(-10,-58,14,28);
    c.fillStyle='#3d6fa8';for(let n=0;n<5;n++){c.fillRect(-48+n*21,-18,14,12);c.strokeRect(-48+n*21,-18,14,12)}
    c.fillStyle='#2f9e5a';c.beginPath();c.roundRect(-62,34,124,30,10);c.fill();c.stroke();c.fillStyle='#fff';c.font='900 16px "Noto Sans TC",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('綠電契約',0,49);c.restore();c.globalAlpha=1}
  if(kind==='lowwind'){c.fillStyle=`rgba(230,220,180,${.25*fade})`;c.fillRect(0,0,W,H)}
  if(kind==='typhoon'&&CINE.phase==='pre'){const g=c.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.9);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(10,20,30,${.45*fade})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
}
