// 風場大亨 — Canvas 2.5D 繪製
'use strict';
// ================= rendering setup =================
const cv=$('#cv'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
const cam={x:0,y:N*TH/2,z:.8};
const CS=2,SS=3;
const cache={cv:document.createElement('canvas'),x0:0,y0:0,w:0,h:0};
let drawList=[],waterTiles=[],foam=[];
const winds=[],clouds=[],floats=[],rain=[];

function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  placeInspector();
}

// ---------- primitives ----------
function poly(c,pts,fill,stroke,lw){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)c.lineTo(pts[k][0],pts[k][1]);c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||.6;c.stroke()}}
function topPath(c,i,j,e,ins=0){const a=iso(i+ins,j+ins,e),b=iso(i+1-ins,j+ins,e),d=iso(i+1-ins,j+1-ins,e),l=iso(i+ins,j+1-ins,e);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(d[0],d[1]);c.lineTo(l[0],l[1]);c.closePath()}
function box(c,a0,b0,w,d,h,z,top,left,right,line){
  const x0=a0-w/2,x1=a0+w/2,y0=b0-d/2,y1=b0+d/2;
  poly(c,[P3(x0,y1,z+h),P3(x1,y1,z+h),P3(x1,y1,z),P3(x0,y1,z)],left,line);
  poly(c,[P3(x1,y0,z+h),P3(x1,y1,z+h),P3(x1,y1,z),P3(x1,y0,z)],right,line);
  if(top)poly(c,[P3(x0,y0,z+h),P3(x1,y0,z+h),P3(x1,y1,z+h),P3(x0,y1,z+h)],top,line);
}
function faceQuad(c,face,a0,b0,w,d,u0,u1,z0,z1,fill){
  if(face==='L'){const y=b0+d/2,xa=a0-w/2+u0*w,xb=a0-w/2+u1*w;poly(c,[P3(xa,y,z1),P3(xb,y,z1),P3(xb,y,z0),P3(xa,y,z0)],fill)}
  else{const x=a0+w/2,ya=b0-d/2+u0*d,yb=b0-d/2+u1*d;poly(c,[P3(x,ya,z1),P3(x,yb,z1),P3(x,yb,z0),P3(x,ya,z0)],fill)}
}
function gable(c,a0,b0,w,d,z,rh,ov,roofF,roofB,wallR){
  const x0=a0-w/2-ov,x1=a0+w/2+ov,y0=b0-d/2-ov,y1=b0+d/2+ov,rl=P3(x0,b0,z+rh),rr=P3(x1,b0,z+rh);
  poly(c,[P3(x0,y0,z),P3(x1,y0,z),rr,rl],roofB);
  poly(c,[P3(a0+w/2,b0-d/2,z),P3(a0+w/2,b0+d/2,z),P3(a0+w/2,b0,z+rh)],wallR);
  poly(c,[P3(x0,y1,z),P3(x1,y1,z),rr,rl],roofF);
  c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=.6;c.beginPath();c.moveTo(rl[0],rl[1]);c.lineTo(rr[0],rr[1]);c.stroke();
}
function shadowEl(c,x,y,rx,ry,a=.22){c.fillStyle=`rgba(16,44,40,${a})`;c.beginPath();c.ellipse(x,y,rx,ry,0,0,6.283);c.fill()}
function mkSprite(w,h,ax,ay,fn){const cvs=document.createElement('canvas');cvs.width=Math.ceil(w*SS);cvs.height=Math.ceil(h*SS);const c=cvs.getContext('2d');c.scale(SS,SS);c.translate(ax,ay);fn(c);return {cv:cvs,w,h,ax,ay}}
function blit(c,s,x,y,k=1){c.drawImage(s.cv,x-s.ax*k,y-s.ay*k,s.w*k,s.h*k)}

// ---------- sprites ----------
const SPR={};
function initSprites(){
  SPR.tree=[
    mkSprite(22,36,11,31,c=>{shadowEl(c,2.5,0,6.5,3);c.fillStyle='#6b4a2f';c.fillRect(-1,-5,2,5);
      for(const[y,w,hh]of[[-4,7.2,11],[-10,5.9,10],[-15.5,4.5,9]]){poly(c,[[0,y-hh],[0,y],[-w,y]],'#4f9a58');poly(c,[[0,y-hh],[w,y],[0,y]],'#2b6438')}}),
    mkSprite(24,32,12,27,c=>{shadowEl(c,2.5,0,7.5,3.2);c.fillStyle='#71502f';c.fillRect(-.9,-8,1.8,8);
      const g=c.createRadialGradient(-4,-17,1,0,-12,11);g.addColorStop(0,'#9fd06a');g.addColorStop(.55,'#5c9e46');g.addColorStop(1,'#336b33');c.fillStyle=g;
      for(const[x,y,r]of[[-3.8,-10,5.4],[3.6,-10.5,5.4],[0,-15.2,6]]){c.beginPath();c.arc(x,y,r,0,6.283);c.fill()}}),
    mkSprite(14,44,7,40,c=>{shadowEl(c,2,0,4,2);c.strokeStyle='#6d5a44';c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.lineTo(0,-30);c.stroke();
      const g=c.createLinearGradient(-4,0,4,0);g.addColorStop(0,'#7d9a6e');g.addColorStop(1,'#3e5a3e');c.fillStyle=g;c.beginPath();c.ellipse(0,-20,3.8,15,0,0,6.283);c.fill();
      c.strokeStyle='rgba(30,50,30,.45)';c.lineWidth=.5;for(let k=0;k<6;k++){c.beginPath();c.moveTo(-2.5+k,-30+k*3);c.lineTo(-3+k*1.1,-24+k*3);c.stroke()}}),
  ];
  SPR.house=[null];
  for(let v=1;v<=4;v++)SPR.house.push(mkSprite(72,92,36,72,c=>drawHouse(c,v)));
}
function drawHouse(c,v){
  shadowEl(c,4,3,24,10,.2);
  poly(c,[P3(-.42,-.38,0),P3(.42,-.38,0),P3(.42,.42,0),P3(-.42,.42,0)],'rgba(235,228,205,.55)');
  if(v<=2){
    const wall=v===1?['#f4efe6','#cfc5b4']:['#f0e0c3','#c7b18b'],roof=v===1?['#c75c3e','#8f3f2b']:['#4f7393','#37536c'];
    box(c,0,0,.56,.42,10,0,null,wall[0],wall[1],'rgba(0,0,0,.12)');
    faceQuad(c,'L',0,0,.56,.42,.12,.3,3.5,7.2,'#3b5866');faceQuad(c,'L',0,0,.56,.42,.42,.56,0,6.2,'#7a5338');faceQuad(c,'L',0,0,.56,.42,.68,.86,3.5,7.2,'#3b5866');
    faceQuad(c,'R',0,0,.56,.42,.3,.7,3.5,7.2,'#334c58');
    gable(c,0,0,.56,.42,10,7,.05,roof[0],roof[1],wall[1]);
  }else{
    const wall=v===3?['#ece8e0','#c6c1b7']:['#e6cfae','#b99d77'];
    box(c,0,0,.42,.5,30,0,'#d6d1c7',wall[0],wall[1],'rgba(0,0,0,.12)');
    for(let f=0;f<3;f++){
      faceQuad(c,'L',0,0,.42,.5,.16,.84,f*10+3.8,f*10+8,'#3d5d6a');
      if(f>0){c.strokeStyle='#8f989b';c.lineWidth=.7;const a=P3(-.21,.25,f*10+3),b=P3(.21,.25,f*10+3);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}
      if(f>0)faceQuad(c,'R',0,0,.42,.5,.25,.75,f*10+4,f*10+8,'#33505b');
    }
    faceQuad(c,'R',0,0,.42,.5,.15,.85,0,6.5,'#a3a8aa');
    c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=.4;for(let z=1;z<6.5;z+=1.2){const a=P3(.21,-.25+.15*.5,z),b=P3(.21,-.25+.85*.5,z);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}
    box(c,0,0,.42,.5,1.6,30,'#cfc9be',wall[0],wall[1]);
    box(c,-.08,-.12,.14,.14,5,31.6,'#bdb7ab','#d9d3c8','#aaa499');
    const p=P3(.1,.12,31.6);const g=c.createLinearGradient(p[0]-3,0,p[0]+3,0);g.addColorStop(0,'#eef3f5');g.addColorStop(1,'#8f9ba1');
    c.fillStyle=g;c.fillRect(p[0]-3,p[1]-6,6,6);c.fillStyle='#dfe7ea';c.beginPath();c.ellipse(p[0],p[1]-6,3,1.4,0,0,6.283);c.fill();
  }
}

// ---------- terrain cache ----------
const FARM=[{b:'hsl(56,74%,61%)',r:'hsl(84,45%,44%)'},{b:'hsl(178,30%,58%)',r:'hsl(108,48%,44%)'},{b:'hsl(96,52%,42%)',r:'hsl(100,58%,32%)'},{b:'hsl(44,66%,57%)',r:'hsl(36,55%,43%)'}];
function topColor(t,q){
  let H,Sa,L;
  if(t.road){H=92;Sa=30;L=50}
  else switch(t.t){
    case 'grass':H=[80,96,102,88][q];Sa=[36,44,48,42][q];L=[52,49,44,47][q];break;
    case 'forest':H=108;Sa=34;L=31;break;
    case 'farm':return FARM[q].b;
    case 'sand':H=44;Sa=54;L=77;break;
    case 'rock':H=78;Sa=9;L=56;break;
    case 'shallow':H=184;Sa=52;L=49;break;
    default:H=199;Sa=58;L=36;
  }
  if(!isWater(t))L+=(t.h-1)*2.2;
  L+=(t.v-.5)*4;
  return `hsl(${H},${Sa}%,${L}%)`;
}
function sidePoly(g,i,j,face,eT,eB){
  const a=face==='R'?[i+1,j]:[i,j+1],b=[i+1,j+1];
  const p1=iso(a[0],a[1],eT),p2=iso(b[0],b[1],eT),p3=iso(b[0],b[1],eB),p4=iso(a[0],a[1],eB);
  g.beginPath();g.moveTo(p1[0],p1[1]);g.lineTo(p2[0],p2[1]);g.lineTo(p3[0],p3[1]);g.lineTo(p4[0],p4[1]);g.closePath();
}
function drawSide(g,t,face,e,e2,edge,q){
  const R=face==='R';
  if(isWater(t)){
    const wb=Math.max(e2,-1.5);
    sidePoly(g,t.i,t.j,face,e,wb);g.fillStyle=R?'rgba(24,98,130,.95)':'rgba(38,128,160,.95)';g.fill();
    if(e2<wb){sidePoly(g,t.i,t.j,face,wb,e2);g.fillStyle=R?'#5f5244':'#76644f';g.fill()}
    return;
  }
  const lip=Math.max(e2,e-.2);
  sidePoly(g,t.i,t.j,face,e,lip);g.fillStyle=t.t==='sand'?(R?'#b99a68':'#d0b380'):(R?'#4d7a33':'#5f9140');if(t.t==='rock')g.fillStyle=R?'#7c7d72':'#94958a';g.fill();
  const soil=t.t==='sand'?(R?'#a98d61':'#c3a676'):(R?'#7b5c3f':'#9c7650');
  sidePoly(g,t.i,t.j,face,lip,Math.max(e2,0));g.fillStyle=soil;g.fill();
  if(e2<0){sidePoly(g,t.i,t.j,face,0,e2);g.fillStyle=R?'#6b645c':'#857d73';g.fill()}
  if(edge){
    g.strokeStyle='rgba(40,25,10,.18)';g.lineWidth=.7;
    for(const lv of [-1.2,-2.4]){if(lv<e&&lv>e2){const a=iso(face==='R'?t.i+1:t.i,face==='R'?t.j:t.j+1,lv),b=iso(t.i+1,t.j+1,lv);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}}
  }
}
function aoEdge(g,i,j,e,side){
  let pts,a,b;
  if(side==='L'){pts=[iso(i,j,e),iso(i,j+1,e),iso(i+.38,j+1,e),iso(i+.38,j,e)];a=iso(i,j+.5,e);b=iso(i+.38,j+.5,e)}
  else{pts=[iso(i,j,e),iso(i+1,j,e),iso(i+1,j+.38,e),iso(i,j+.38,e)];a=iso(i+.5,j,e);b=iso(i+.5,j+.38,e)}
  const gr=g.createLinearGradient(a[0],a[1],b[0],b[1]);gr.addColorStop(0,'rgba(10,30,10,.26)');gr.addColorStop(1,'rgba(10,30,10,0)');poly(g,pts,gr);
}
function drawRoad(g,t,e){
  const{i,j}=t,P=(a,b)=>iso(i+a,j+b,e);
  const con={pi:tile(i+1,j),mi:tile(i-1,j),pj:tile(i,j+1),mj:tile(i,j-1)};
  for(const k in con)con[k]=!!(con[k]&&con[k].road);
  const rects=(w0,w1)=>{const r=[[w0,w0,w1,w1]];if(con.pi)r.push([w1,w0,1,w1]);if(con.mi)r.push([0,w0,w0,w1]);if(con.pj)r.push([w0,w1,w1,1]);if(con.mj)r.push([w0,0,w1,w0]);return r};
  for(const[a0,b0,a1,b1]of rects(.22,.78))poly(g,[P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)],'#a9a69a');
  for(const[a0,b0,a1,b1]of rects(.27,.73))poly(g,[P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)],'#5c6167');
  g.strokeStyle='rgba(240,232,200,.85)';g.lineWidth=.8;g.setLineDash([2.6,2.6]);
  const c0=P(.5,.5);
  for(const[k,a,b]of[['pi',1,.5],['mi',0,.5],['pj',.5,1],['mj',.5,0]])if(con[k]){const p=P(a,b);g.beginPath();g.moveTo(c0[0],c0[1]);g.lineTo(p[0],p[1]);g.stroke()}
  g.setLineDash([]);
}
function detail(g,t,q,e){
  const R=mulberry32((t.i*928371+t.j*1237)^S.seed),P=(a,b)=>iso(t.i+a,t.j+b,e);
  if(t.road){drawRoad(g,t,e);return}
  switch(t.t){
    case 'grass':
      for(let k=0;k<6;k++){const[x,y]=P(.12+R()*.76,.12+R()*.76);g.strokeStyle=R()<.55?'rgba(40,80,20,.3)':'rgba(255,255,215,.2)';g.lineWidth=.8;g.beginPath();g.moveTo(x-1.3,y);g.lineTo(x,y-2.3);g.lineTo(x+1.3,y);g.stroke()}
      if(R()<.35)for(let k=0;k<3;k++){const[x,y]=P(.15+R()*.7,.15+R()*.7);g.fillStyle=['#fff4c4','#f6b9c9','#ffffff'][k];g.fillRect(x,y,1.2,1.2)}
      break;
    case 'farm':{
      g.save();topPath(g,t.i,t.j,e);g.clip();
      g.strokeStyle=FARM[q].r;g.lineWidth=q===1?1.1:1.7;const dir=t.v>.5;
      for(let k=1;k<7;k++){const a=k/7;const p0=dir?P(a,0):P(0,a),p1=dir?P(a,1):P(1,a);g.beginPath();g.moveTo(p0[0],p0[1]);g.lineTo(p1[0],p1[1]);g.stroke()}
      if(q===0){g.fillStyle='rgba(255,236,90,.9)';for(let k=0;k<18;k++){const[x,y]=P(R(),R());g.fillRect(x,y,1.1,1.1)}}
      if(q===1){g.fillStyle='rgba(255,255,255,.16)';const[x,y]=P(.3+R()*.3,.3+R()*.3);g.beginPath();g.ellipse(x,y,7,2.2,0,0,6.283);g.fill()}
      g.restore();
      poly(g,[P(0,0),P(1,0),P(1,1),P(0,1)],null,'rgba(120,95,50,.35)',.8);
      break;}
    case 'sand':for(let k=0;k<10;k++){const[x,y]=P(R(),R());g.fillStyle=R()<.5?'rgba(150,120,70,.35)':'rgba(255,255,240,.5)';g.fillRect(x,y,1,1)}break;
    case 'forest':for(let k=0;k<10;k++){const[x,y]=P(R(),R());g.fillStyle='rgba(10,40,15,.3)';g.fillRect(x,y,1.6,1)}break;
    case 'rock':for(let k=0;k<5;k++){const[x,y]=P(.1+R()*.8,.1+R()*.8);g.fillStyle='#8f8f86';g.beginPath();g.ellipse(x,y,2+R()*2,1.2+R(),0,0,6.283);g.fill();g.fillStyle='#b4b4aa';g.beginPath();g.ellipse(x-.5,y-.5,1.3,.7,0,0,6.283);g.fill()}break;
    case 'shallow':case 'deep':g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=.7;for(let k=0;k<2;k++){const[x,y]=P(.2+R()*.6,.2+R()*.6);g.beginPath();g.arc(x,y+6,7,-2.3,-.9);g.stroke()}break;
  }
}
function drawTile(g,t,q){
  const{i,j}=t,e=elev(t),nr=tile(i+1,j),nl=tile(i,j+1);
  const er=nr?elev(nr):BASE,el=nl?elev(nl):BASE;
  if(el<e)drawSide(g,t,'L',e,el,!nl,q);
  if(er<e)drawSide(g,t,'R',e,er,!nr,q);
  topPath(g,i,j,e);g.fillStyle=topColor(t,q);g.fill();
  detail(g,t,q,e);
  if(t.house)poly(g,[iso(i+.15,j+.15,e),iso(i+.85,j+.15,e),iso(i+.85,j+.85,e),iso(i+.15,j+.85,e)],'rgba(230,222,196,.4)');
  const bl=tile(i-1,j),bt=tile(i,j-1);
  if(bl&&elev(bl)>e)aoEdge(g,i,j,e,'L');
  if(bt&&elev(bt)>e)aoEdge(g,i,j,e,'T');
  if(!isWater(t)){topPath(g,i,j,e);g.strokeStyle='rgba(30,50,20,.07)';g.lineWidth=.6;g.stroke()}
}
function buildCache(){
  const x0=-N*TW/2-8,x1=N*TW/2+8,y0=-6*HZ-TH,y1=N*TH-BASE*HZ+12;
  cache.x0=x0;cache.y0=y0;cache.w=x1-x0;cache.h=y1-y0;
  const c=cache.cv;c.width=Math.ceil(cache.w*CS);c.height=Math.ceil(cache.h*CS);
  const g=c.getContext('2d');g.setTransform(CS,0,0,CS,-x0*CS,-y0*CS);
  const q=S.turn%4;
  for(let s=0;s<2*N-1;s++)for(let i=Math.max(0,s-N+1);i<=Math.min(N-1,s);i++)drawTile(g,tile(i,s-i),q);
  waterTiles=S.tiles.filter(isWater);
  foam=[];
  for(const t of waterTiles){
    for(const[a,b,p,qq]of[[1,0,[1,0],[1,1]],[-1,0,[0,0],[0,1]],[0,1,[0,1],[1,1]],[0,-1,[0,0],[1,0]]]){
      const n=tile(t.i+a,t.j+b);if(n&&!isWater(n))foam.push({a:[t.i+p[0],t.j+p[1]],b:[t.i+qq[0],t.j+qq[1]],n:[-a,-b],ph:t.v*6.28})
    }
  }
}
function treeType(t,r){if(t.tree===3)return 2;if(t.tree===2)return 1;return (t.h>=3||r<.35)?0:1}
function rebuildDrawables(){
  drawList=[];
  for(const t of S.tiles){
    const e=elev(t);
    if(t.tree){const rr=mulberry32((t.i*73856093)^(t.j*19349663)^S.seed);const n=t.tree===1?3:(t.tree===3?2:1);
      for(let k=0;k<n;k++){const fx=t.i+.18+rr()*.64,fy=t.j+.18+rr()*.64;drawList.push({d:fx+fy,k:'tree',x:fx,y:fy,e,s:treeType(t,rr()),sc:.82+rr()*.38})}}
    if(t.house)drawList.push({d:t.i+t.j+1,k:'house',x:t.i+.5,y:t.j+.5,e,v:t.house});
  }
  for(const o of S.objs)drawList.push({d:o.i+o.j+1.02,k:'obj',o});
  drawList.sort((a,b)=>a.d-b.d);
  fxRebuild();
}

// ---------- turbines & facilities ----------
function drawRotor(c,hub,m,ang,f,blur){
  const l=[-f[1],f[0]],ls=sv(l[0],l[1]),sc=m.rr/45.25,lx=ls[0]*sc,ly=ls[1]*sc,ch=2.6*(m.rr/40);
  for(let b=0;b<3;b++){
    const a=ang+b*2.0944,ca=Math.cos(a),sa=Math.sin(a);
    const dx=sa*lx,dy=-ca*m.rr+sa*ly,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    const tip=[hub[0]+dx,hub[1]+dy],r1=[hub[0]+dx*.2,hub[1]+dy*.2];
    c.beginPath();
    c.moveTo(hub[0]+nx*ch*.5,hub[1]+ny*ch*.5);
    c.quadraticCurveTo(r1[0]+nx*ch*1.2,r1[1]+ny*ch*1.2,tip[0]+nx*.35,tip[1]+ny*.35);
    c.lineTo(tip[0]-nx*.25,tip[1]-ny*.25);
    c.quadraticCurveTo(r1[0]-nx*ch*.45,r1[1]-ny*ch*.45,hub[0]-nx*ch*.5,hub[1]-ny*ch*.5);
    c.closePath();
    const sh=Math.round(215+40*clamp(.5-ca*.35+sa*.25,0,1));
    c.fillStyle=`rgba(${sh},${sh+2>255?255:sh+2},${sh+4>255?255:sh+4},${blur?.85:1})`;c.fill();
    c.strokeStyle='rgba(50,70,80,.28)';c.lineWidth=.45;c.stroke();
    if(m.mw>=6){c.strokeStyle='#d8473a';c.lineWidth=ch*.55;c.beginPath();c.moveTo(hub[0]+dx*.9,hub[1]+dy*.9);c.lineTo(hub[0]+dx*.98,hub[1]+dy*.98);c.stroke()}
  }
  const hr=2.4*(m.rr/40);const g=c.createRadialGradient(hub[0]-hr*.4,hub[1]-hr*.4,.2,hub[0],hub[1],hr);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#b9c3c7');
  c.fillStyle=g;c.beginPath();c.arc(hub[0],hub[1],hr,0,6.283);c.fill();
}
function drawTurbine(c,x,y,m,ang,o){
  const st=o.state||'run',f=o.flow||flowNow(),k=m.hub/76,bw=4.2*k,tw=2.1*k,off=m.offshore;
  const prog=st==='build'?clamp((o.prog+.5)/m.build,0,1):1;
  const th=st==='build'?(m.hub-4)*(.28+.55*prog):m.hub,baseY=y-(off?10:1.5),topY=y-th;
  if(!off){shadowEl(c,x+1.5,y+.8,8*k,3.6*k,.2)}
  c.strokeStyle='rgba(16,44,40,.12)';c.lineWidth=2.6*k;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x+th*.42,y+th*.2);c.stroke();
  if(st!=='build'){c.fillStyle='rgba(16,44,40,.07)';c.beginPath();c.ellipse(x+th*.42,y+th*.2,m.rr*.5,m.rr*.2,.45,0,6.283);c.fill()}
  if(m.floating){
    // 半潛式浮台：三根浮筒柱、水線下的連接浮箱、錨鍊
    c.strokeStyle='rgba(30,50,60,.35)';c.lineWidth=.6;for(const[a,b]of[[-.55,-.1],[.5,-.3],[.1,.55]]){const p=sv(a,b);c.beginPath();c.moveTo(x,y+2);c.lineTo(x+p[0],y+p[1]+3);c.stroke()}
    const cols=[sv(0,-.24),sv(.21,.12),sv(-.21,.12)].map(p=>[x+p[0]*k,y+p[1]*k]);
    c.fillStyle='rgba(255,255,255,.5)';for(const[a,b]of cols){c.beginPath();c.ellipse(a,b+1.5,5.5*k,2.4*k,0,0,6.283);c.fill()}
    c.strokeStyle='#3c4a50';c.lineWidth=3*k;c.beginPath();c.moveTo(...cols[0]);c.lineTo(...cols[1]);c.lineTo(...cols[2]);c.closePath();c.stroke();
    c.strokeStyle='#c99a1a';c.lineWidth=1.4*k;c.beginPath();for(const[a,b]of cols){c.moveTo(a,b-8*k);c.lineTo(x,y-9)}c.stroke();
    for(const[a,b]of [...cols].sort((p,q)=>p[1]-q[1])){const g=c.createLinearGradient(a-3*k,0,a+3*k,0);g.addColorStop(0,'#ffe36e');g.addColorStop(1,'#cf9410');c.fillStyle=g;c.fillRect(a-3*k,b-9*k,6*k,9*k);c.fillStyle='#ffe98a';c.beginPath();c.ellipse(a,b-9*k,3*k,1.4*k,0,0,6.283);c.fill()}
  }else if(off){
    c.fillStyle='#2f3e45';c.fillRect(x-bw*.85,y-2,bw*1.7,5);
    c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(x,y+2,bw*2.2,bw*.9,0,0,6.283);c.fill();
    const g=c.createLinearGradient(x-bw,0,x+bw,0);g.addColorStop(0,'#ffe066');g.addColorStop(1,'#cf9410');c.fillStyle=g;c.fillRect(x-bw*1.05,y-10,bw*2.1,9);
    c.fillStyle='#8a9497';c.beginPath();c.ellipse(x,y-10,bw*2.5,bw*1.15,0,0,6.283);c.fill();c.fillStyle='#a7b0b3';c.beginPath();c.ellipse(x,y-10.8,bw*2.3,bw*1,0,0,6.283);c.fill();
  }else{
    c.fillStyle='#9fa49e';c.beginPath();c.ellipse(x,y,6.6*k,3.3*k,0,0,6.283);c.fill();
    c.fillStyle='#c9cdc6';c.beginPath();c.ellipse(x,y-1.3,6*k,3*k,0,0,6.283);c.fill();
  }
  const u=[-f[0],-f[1]],hs=sv(u[0]*.13,u[1]*.13),ts=sv(f[0]*.17,f[1]*.17);
  const hub=[x+hs[0]*k,y-m.hub+hs[1]*k],tail=[x+ts[0]*k,y-m.hub+ts[1]*k];
  const front=(u[0]+u[1])>0,done=st!=='build';
  if(done&&!front)drawRotor(c,hub,m,ang,f,o.blur);
  const twTop=lerp(bw,tw,th/m.hub);
  const g=c.createLinearGradient(x-bw,0,x+bw,0);g.addColorStop(0,'#ffffff');g.addColorStop(.42,'#eef2f2');g.addColorStop(1,'#a9b5ba');
  poly(c,[[x-bw,baseY],[x+bw,baseY],[x+twTop,topY],[x-twTop,topY]],g,'rgba(40,60,70,.2)',.5);
  if(st==='build'){
    c.strokeStyle='rgba(60,80,90,.35)';c.lineWidth=.6;
    for(let z=16;z<th;z+=18){const w=lerp(bw,tw,z/m.hub);c.beginPath();c.moveTo(x-w,baseY-z);c.lineTo(x+w,baseY-z);c.stroke()}
    drawCrane(c,x,y,m,th,prog);
  }
  if(done){
    c.lineCap='round';
    c.strokeStyle='rgba(40,60,70,.35)';c.lineWidth=6.6*k;c.beginPath();c.moveTo(hub[0],hub[1]);c.lineTo(tail[0],tail[1]);c.stroke();
    c.strokeStyle='#e8eded';c.lineWidth=5.3*k;c.beginPath();c.moveTo(hub[0],hub[1]);c.lineTo(tail[0],tail[1]);c.stroke();
    c.strokeStyle='#ffffff';c.lineWidth=1.6*k;c.beginPath();c.moveTo(hub[0],hub[1]-1.4*k);c.lineTo(tail[0],tail[1]-1.4*k);c.stroke();
    if(front)drawRotor(c,hub,m,ang,f,o.blur);
    if(Math.sin(time*2.6+(o.id||0))>.55){c.fillStyle='rgba(255,60,50,.95)';c.beginPath();c.arc(tail[0],tail[1]-3*k,1.3,0,6.283);c.fill();c.fillStyle='rgba(255,60,50,.25)';c.beginPath();c.arc(tail[0],tail[1]-3*k,3.5,0,6.283);c.fill()}
  }
}
function drawCrane(c,x,y,m,th,prog){
  const bx=x+15,by=y+5,tx=x+4,ty=y-m.hub-16;
  c.save();c.translate(bx,by);box(c,0,0,.22,.12,4,0,'#f5c13a','#e3a91f','#b9830f');box(c,-.02,0,.1,.1,4,4,'#f5c13a','#e3a91f','#b9830f');c.restore();
  c.strokeStyle='#e0a314';c.lineWidth=1.1;c.lineCap='butt';
  c.beginPath();c.moveTo(bx-2,by-7);c.lineTo(tx,ty);c.moveTo(bx+1.5,by-6);c.lineTo(tx+1.2,ty+.5);c.stroke();
  c.lineWidth=.45;c.beginPath();for(let s=0;s<1;s+=.08){const a=[lerp(bx-2,tx,s),lerp(by-7,ty,s)],b=[lerp(bx+1.5,tx+1.2,s+.04),lerp(by-6,ty+.5,s+.04)];c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1])}c.stroke();
  const hookY=y-th-8+Math.sin(time*1.4)*1.2;
  c.strokeStyle='#2c3a40';c.lineWidth=.4;c.beginPath();c.moveTo(tx+.5,ty);c.lineTo(tx+.5,hookY);c.stroke();
  c.fillStyle='#d5dbdd';c.fillRect(tx-2,hookY,5,6);c.strokeStyle='rgba(0,0,0,.25)';c.strokeRect(tx-2,hookY,5,6);
  c.fillStyle='#f4f6f6';c.beginPath();c.moveTo(x-20,y+5);c.quadraticCurveTo(x-10,y+3,x-1,y+10);c.lineTo(x-2,y+11.5);c.quadraticCurveTo(x-12,y+6,x-20,y+6.6);c.closePath();c.fill();c.strokeStyle='rgba(0,0,0,.2)';c.stroke();
}
function drawFac(c,x,y,kind,o){
  c.save();c.translate(x,y);
  const pad=(col)=>poly(c,[P3(-.44,-.44,0),P3(.44,-.44,0),P3(.44,.44,0),P3(-.44,.44,0)],col,'rgba(0,0,0,.12)');
  if(kind==='sub'){
    pad('#cfccc1');
    for(let k=0;k<14;k++){const p=P3(-.4+((k*37)%80)/100,-.4+((k*53)%80)/100,0);c.fillStyle='rgba(120,115,100,.45)';c.fillRect(p[0],p[1],1,1)}
    for(const a of[-.2,.16]){box(c,a,-.2,.22,.18,9,0,'#7c8e8d','#97a8a6','#6b7c7b','rgba(0,0,0,.15)');c.strokeStyle='rgba(40,50,50,.5)';c.lineWidth=.5;for(let u=.15;u<.9;u+=.17){const p0=P3(a-.11+u*.22,-.11,1.5),p1=P3(a-.11+u*.22,-.11,7.5);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke()}
      const bp=P3(a,-.2,9);c.fillStyle='#5b4a3a';for(const dx of[-2.5,0,2.5]){c.fillRect(bp[0]+dx-.5,bp[1]-5,1,5)}}
    c.strokeStyle='#8e9a9e';c.lineWidth=1.1;
    for(const a of[-.34,.34]){const p0=P3(a,.12,0),p1=P3(a,.12,25);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke()}
    const g0=P3(-.34,.12,24),g1=P3(.34,.12,24);c.beginPath();c.moveTo(g0[0],g0[1]);c.lineTo(g1[0],g1[1]);c.stroke();
    c.strokeStyle='rgba(50,60,60,.6)';c.lineWidth=.45;for(const a of[-.2,0,.2]){const p=P3(a,.12,24);c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0],p[1]+4);c.stroke();c.beginPath();c.moveTo(p[0],p[1]+4);c.quadraticCurveTo(p[0]-12,p[1]-6,p[0]-30,p[1]-14);c.stroke()}
    box(c,.2,.24,.28,.2,8,0,'#4f7a97','#ece6d8','#c4bca9','rgba(0,0,0,.15)');
    faceQuad(c,'L',.2,.24,.28,.2,.15,.4,0,5,'#56636a');
    c.strokeStyle='rgba(70,80,85,.75)';c.lineWidth=.5;const fz=4.5;
    poly(c,[P3(-.44,-.44,fz),P3(.44,-.44,fz),P3(.44,.44,fz),P3(-.44,.44,fz)],null,'rgba(70,80,85,.6)',.5);
    for(const[a,b]of[[-.44,.44],[.44,.44],[.44,-.44],[-.44,-.44],[0,.44],[.44,0]]){const p0=P3(a,b,0),p1=P3(a,b,fz);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke()}
  }else if(kind==='om'){
    pad('#a3a8aa');
    c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=.6;for(const b of[.2,.3,.4]){const p0=P3(.2,b,0),p1=P3(.44,b,0);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke()}
    box(c,-.08,-.1,.6,.44,13,0,'#dbe4e5','#f6f8f7','#c3cdd0','rgba(0,0,0,.12)');
    box(c,-.08,-.1,.6,.44,1.8,13,'#2c8d9b','#39a8b6','#2a7c88');
    faceQuad(c,'L',-.08,-.1,.6,.44,.06,.94,5,9.6,'#2d5666');faceQuad(c,'R',-.08,-.1,.6,.44,.1,.9,5,9.6,'#244854');
    faceQuad(c,'L',-.08,-.1,.6,.44,.4,.58,0,4.2,'#1d3a45');
    box(c,-.08,-.1,.6,.44,.5,4.4,null,'#e7ecec','#b8c2c5');
    c.save();c.translate(...P3(.3,.32,0));box(c,0,0,.11,.22,4.6,0,'#ffffff','#f2f2ef','#c9ccc9','rgba(0,0,0,.18)');faceQuad(c,'R',0,0,.11,.22,0,1,2,3,'#f08a24');c.restore();
    const sp=P3(-.38,.26,0);c.strokeStyle='#5d6a70';c.lineWidth=.8;c.beginPath();c.moveTo(sp[0],sp[1]);c.lineTo(sp[0],sp[1]-11);c.stroke();c.fillStyle='#2c8d9b';c.fillRect(sp[0]-4,sp[1]-16,8,5);c.fillStyle='#fff';c.fillRect(sp[0]-2.6,sp[1]-14.2,5.2,1.2);
  }else if(kind==='mast'){
    shadowEl(c,0,0,4,2,.2);
    const H=66,top=[0,-H];
    c.strokeStyle='rgba(60,70,75,.45)';c.lineWidth=.35;
    for(const[a,b]of[[.42,0],[-.42,0],[0,.42],[0,-.42]]){const p=P3(a,b,0);c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(0,-H*.7);c.stroke();c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(0,-H*.35);c.stroke()}
    c.strokeStyle='#c43b2f';c.lineWidth=.8;c.beginPath();c.moveTo(-1.4,0);c.lineTo(-.5,-H);c.moveTo(1.4,0);c.lineTo(.5,-H);c.stroke();
    c.strokeStyle='#f1f1f1';c.lineWidth=.45;c.beginPath();for(let z=0;z<H;z+=4){const w=lerp(1.4,.5,z/H),w2=lerp(1.4,.5,(z+4)/H);c.moveTo(-w,-z);c.lineTo(w2,-z-4)}c.stroke();
    for(const z of[H-2,H*.72,H*.45]){c.strokeStyle='#59666b';c.lineWidth=.6;c.beginPath();c.moveTo(-6,-z);c.lineTo(6,-z);c.stroke();
      for(const s of[-6,6]){const r=time*6+z;c.fillStyle='#e9eef0';for(let q=0;q<3;q++){const a=r+q*2.09;c.beginPath();c.arc(s+Math.cos(a)*1.6,-z-1.5+Math.sin(a)*.5,.7,0,6.283);c.fill()}}}
    if(Math.sin(time*3)>.2){c.fillStyle='#ff4b3e';c.beginPath();c.arc(0,-H-1.5,1.4,0,6.283);c.fill();c.fillStyle='rgba(255,75,62,.25)';c.beginPath();c.arc(0,-H-1.5,4,0,6.283);c.fill()}
  }else if(kind==='ware'){
    shadowEl(c,6,4,30,12,.18);
    box(c,0,-.04,.8,.56,12,0,null,'#c9d2d8','#98a5ae','rgba(0,0,0,.12)');
    faceQuad(c,'L',0,-.04,.8,.56,.3,.7,0,8.5,'#6b7881');
    c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=.4;for(let z=1;z<8.5;z+=1.3){const a=P3(-.16,.24,z),b=P3(.16,.24,z);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}
    gable(c,0,-.04,.8,.56,12,5,.03,'#b3c0c8','#8c9aa4','#98a5ae');
    c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=.4;for(let u=-.36;u<.4;u+=.08){const a=P3(u,.27,12),b=P3(u,-.04,17);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}
    for(let s=0;s<3;s++)box(c,.36,.36-s*.0,.16,.09,1.6,s*1.6,'#d47c46','#c06a36','#9a5328');
  }else if(kind==='port'){
    pad('#b9bcb6');
    // 碼頭邊緣朝向海的一側
    const t=o?tile(o.i,o.j):null;let wd=[0,1];if(t)for(const d of DIR4){const n=tile(t.i+d[0],t.j+d[1]);if(n&&isWater(n)){wd=d;break}}
    c.strokeStyle='#f2c230';c.lineWidth=1.2;const e0=P3(wd[0]*.44-wd[1]*.44,wd[1]*.44-wd[0]*.44,.2),e1=P3(wd[0]*.44+wd[1]*.44,wd[1]*.44+wd[0]*.44,.2);c.setLineDash([3,2]);c.beginPath();c.moveTo(e0[0],e0[1]);c.lineTo(e1[0],e1[1]);c.stroke();c.setLineDash([]);
    box(c,-.22,-.22,.3,.24,7,0,'#3f6f8f','#eef1ee','#c4cbc8','rgba(0,0,0,.12)');
    // 岸邊吊車
    const cb=P3(.1,.05,0),ct=P3(.1,.05,30),cj=P3(.1+wd[0]*.6,.05+wd[1]*.6,30);
    c.strokeStyle='#e0a314';c.lineWidth=1.6;c.beginPath();c.moveTo(cb[0]-3,cb[1]);c.lineTo(ct[0],ct[1]);c.lineTo(cb[0]+3,cb[1]);c.moveTo(ct[0],ct[1]);c.lineTo(cj[0],cj[1]);c.stroke();
    c.strokeStyle='#2c3a40';c.lineWidth=.4;c.beginPath();c.moveTo(cj[0],cj[1]);c.lineTo(cj[0],cj[1]+16);c.stroke();
    // 停泊的工作船
    const nb=o?Math.min(3,S.vessels):1;
    for(let v=0;v<nb;v++){const side=(v-1)*.3,q=P3(wd[0]*.72+(wd[1]?side:0),wd[1]*.72+(wd[0]?side:0),-.3*HZ),bob=Math.sin(time*2+v)*.6;
      c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.ellipse(q[0],q[1]+1+bob,9,3,0,0,6.283);c.fill();
      c.fillStyle='#f4f6f6';c.beginPath();c.moveTo(q[0]-8,q[1]-1+bob);c.lineTo(q[0]+7,q[1]-1+bob);c.lineTo(q[0]+9,q[1]-3+bob);c.lineTo(q[0]-8,q[1]-3+bob);c.closePath();c.fill();
      c.fillStyle='#f08a24';c.fillRect(q[0]-8,q[1]-1.5+bob,15,1.2);
      c.fillStyle='#2f6f8f';c.fillRect(q[0]-3,q[1]-7+bob,6,4);c.fillStyle='#bfe6f0';c.fillRect(q[0]-2.4,q[1]-6.3+bob,4.8,1.4)}
  }else if(kind==='osub'){
    // 套管式基礎上的海上變電站
    const z0=-.3*HZ;
    c.fillStyle='rgba(255,255,255,.45)';for(const[a,b]of[[-.25,-.25],[.25,-.25],[.25,.25],[-.25,.25]]){const p=P3(a,b,z0);c.beginPath();c.ellipse(p[0],p[1]+1,4,1.6,0,0,6.283);c.fill()}
    c.strokeStyle='#e5b52a';c.lineWidth=1.6;
    for(const[a,b]of[[-.25,-.25],[.25,-.25],[.25,.25],[-.25,.25]]){const p0=P3(a,b,z0),p1=P3(a*.85,b*.85,14);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke()}
    c.lineWidth=.6;for(const[a,b,a2,b2]of[[-.25,.25,.25,.25],[.25,-.25,.25,.25]]){const p0=P3(a,b,z0),p1=P3(a2*.85,b2*.85,14),p2=P3(a*.85,b*.85,14),p3=P3(a2,b2,z0);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.moveTo(p2[0],p2[1]);c.lineTo(p3[0],p3[1]);c.stroke()}
    box(c,0,0,.62,.56,3,14,'#8d989c','#a7b1b4','#7d878a','rgba(0,0,0,.15)');
    box(c,-.05,-.04,.46,.4,11,17,'#dfe5e6','#f3f6f6','#c3ccce','rgba(0,0,0,.12)');
    faceQuad(c,'L',-.05,-.04,.46,.4,.1,.9,22,25,'#2f5868');faceQuad(c,'R',-.05,-.04,.46,.4,.15,.85,22,25,'#244854');
    const hp=P3(-.05,-.04,28.2);c.fillStyle='#3c4a50';c.beginPath();c.ellipse(hp[0],hp[1],9,4.4,0,0,6.283);c.fill();c.strokeStyle='#f2c230';c.lineWidth=.8;c.beginPath();c.ellipse(hp[0],hp[1],7,3.4,0,0,6.283);c.stroke();
    c.fillStyle='#fff';c.font='700 4px sans-serif';c.textAlign='center';c.fillText('H',hp[0],hp[1]+1.5);
  }else if(kind==='bess'){
    pad('#c4c6bf');
    for(let k=0;k<3;k++){const a=-.27+k*.27;box(c,a,-.02,.2,.68,9,0,'#eef3f3','#dfe6e6','#b8c3c5','rgba(0,0,0,.12)');faceQuad(c,'R',a,-.02,.2,.68,.06,.94,5.2,6.6,'#25a872');faceQuad(c,'L',a,-.02,.2,.68,.2,.8,2,7,'#c9d2d4')}
    box(c,.3,.36,.12,.1,5,0,'#9aa5a8','#b9c2c4','#8a9497');
  }
  c.restore();
}

// ---------- frame ----------
let time=0,lastTs=0;
function frame(ts){
  const dt=Math.min(.05,((ts-lastTs)/1000)||0);lastTs=ts;time+=dt;
  if(S){update(dt);render()}
  requestAnimationFrame(frame);
}
const RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function update(dt){
  const se=season(),storm=weatherFx==='storm',f=flowNow();
  for(const o of TURBS){
    const run=o.state==='run'&&o.conn;
    const tw=tile(o.i,o.j).wind*se.wind;
    const om=run?(.8+tw*.13)*(storm?1.6:1)*(RM?.3:1):0;
    o._w=lerp(o._w||0,om,Math.min(1,dt*1.2));o.ang=((o.ang||0)+o._w*dt)%(Math.PI*2);
  }
  const want=Math.round((storm?110:40+se.wind*40)*(RM?.3:1));
  while(winds.length<want)winds.push(spawnWind(true));
  if(winds.length>want)winds.length=want;
  const sp=(storm?2.6:1.1+se.wind*.6);
  for(const w of winds){w.x+=f[0]*sp*w.s*dt;w.y+=f[1]*sp*w.s*dt;w.life+=dt;if(w.life>w.max||w.x<-3||w.y<-3||w.x>N+3||w.y>N+3)Object.assign(w,spawnWind(false))}
  if(!clouds.length)for(let k=0;k<4;k++)clouds.push({x:VR()*N,y:VR()*N,r:2.5+VR()*3});
  for(const c of clouds){c.x+=f[0]*.25*dt;c.y+=f[1]*.25*dt;if(c.x<-6||c.y<-6||c.x>N+6||c.y>N+6){c.x=VR()*N-f[0]*N*.6;c.y=VR()*N-f[1]*N*.6;}}
  for(let k=floats.length-1;k>=0;k--){floats[k].t+=dt;if(floats[k].t>1.8)floats.splice(k,1)}
  fxUpdate(dt);audioUpdate();
}
function spawnWind(init){
  const f=flowNow();
  let x=VR()*N,y=VR()*N;
  if(!init){x-=f[0]*6*VR();y-=f[1]*6*VR()}
  return {x,y,z:18+VR()*80,life:init?VR()*3:0,max:2.5+VR()*3,s:.7+VR()*.7};
}
function render(){
  const c=ctx,storm=weatherFx==='storm';
  c.setTransform(DPR,0,0,DPR,0,0);
  drawSky(c);
  c.setTransform(DPR*cam.z,0,0,DPR*cam.z,DPR*(W/2-cam.x*cam.z),DPR*(H/2-cam.y*cam.z));
  const sy=N*TH/2+40,rg=c.createRadialGradient(0,sy,10,0,sy,N*TW*.62);rg.addColorStop(0,'rgba(20,60,75,.32)');rg.addColorStop(1,'rgba(20,60,75,0)');
  c.save();c.translate(0,sy);c.scale(1,.55);c.translate(0,-sy);c.fillStyle=rg;c.fillRect(-N*TW,sy-N*TW,N*TW*2,N*TW*2);c.restore();
  c.drawImage(cache.cv,cache.x0,cache.y0,cache.w,cache.h);
  drawWaterFx(c);
  drawCloudShadows(c);
  drawOverlays(c);
  drawCars(c);
  drawBoats(c);
  drawObjects(c);
  drawGhost(c);
  drawWindStreaks(c);
  drawBirds(c);
  drawParts(c);
  drawNight(c);
  drawBadges(c);
  drawFloats(c);
  c.setTransform(DPR,0,0,DPR,0,0);
  if(storm)drawRain(c);
}
function drawWaterFx(c){
  for(const t of waterTiles){
    const a=Math.sin(time*1.4+t.v*40);if(a<.55)continue;
    const p=iso(t.i+.25+t.v*.5,t.j+.3+((t.v*7)%1)*.4,-.35);
    c.strokeStyle=`rgba(255,255,255,${(a-.55)*1.2})`;c.lineWidth=.8;c.beginPath();c.moveTo(p[0]-3,p[1]);c.lineTo(p[0]+3,p[1]);c.stroke();
  }
  c.lineCap='round';
  for(const f of foam){
    const s=.06+.05*Math.sin(time*1.6+f.ph),al=.35+.25*Math.sin(time*1.6+f.ph+1);
    const a=iso(f.a[0]-f.n[0]*s,f.a[1]-f.n[1]*s,-.35),b=iso(f.b[0]-f.n[0]*s,f.b[1]-f.n[1]*s,-.35);
    c.strokeStyle=`rgba(255,255,255,${al})`;c.lineWidth=1.4;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
    const a2=iso(f.a[0]-f.n[0]*(s+.14),f.a[1]-f.n[1]*(s+.14),-.35),b2=iso(f.b[0]-f.n[0]*(s+.14),f.b[1]-f.n[1]*(s+.14),-.35);
    c.strokeStyle=`rgba(255,255,255,${al*.35})`;c.lineWidth=.8;c.beginPath();c.moveTo(a2[0],a2[1]);c.lineTo(b2[0],b2[1]);c.stroke();
  }
}
function drawCloudShadows(c){
  c.save();
  const p=[iso(0,0,1),iso(N,0,1),iso(N,N,1),iso(0,N,1)];c.beginPath();c.moveTo(...p[0]);c.lineTo(...p[1]);c.lineTo(...p[2]);c.lineTo(...p[3]);c.closePath();c.clip();
  for(const cl of clouds){const q=iso(cl.x,cl.y,1);const rr=cl.r*TW*.5;const g=c.createRadialGradient(q[0],q[1],1,q[0],q[1],rr);g.addColorStop(0,'rgba(10,40,55,.16)');g.addColorStop(1,'rgba(10,40,55,0)');
    c.save();c.translate(q[0],q[1]);c.scale(1,.5);c.translate(-q[0],-q[1]);c.fillStyle=g;c.fillRect(q[0]-rr,q[1]-rr,rr*2,rr*2);c.restore()}
  c.restore();
}
const WSTOPS=[[5,[44,90,160]],[6.5,[47,163,154]],[7.5,[155,209,75]],[8.5,[245,196,48]],[9.5,[240,112,45]],[10.5,[214,58,58]]];
function windColor(v,a){let k=0;while(k<WSTOPS.length-2&&v>WSTOPS[k+1][0])k++;const[v0,c0]=WSTOPS[k],[v1,c1]=WSTOPS[k+1],t=clamp((v-v0)/(v1-v0),0,1);return `rgba(${Math.round(lerp(c0[0],c1[0],t))},${Math.round(lerp(c0[1],c1[1],t))},${Math.round(lerp(c0[2],c1[2],t))},${a})`}
function parcelOutline(c,p,col,lw,dash){
  c.strokeStyle=col;c.lineWidth=lw/Math.max(.6,cam.z);c.setLineDash(dash?dash.map(d=>d/Math.max(.6,cam.z)):[]);c.lineCap='round';
  const i0=p.px*PS,j0=p.py*PS;c.beginPath();
  for(let k=0;k<PS;k++){
    let t=tile(i0+k,j0),e=elev(t)+.02;let a=iso(i0+k,j0,e),b=iso(i0+k+1,j0,e);c.moveTo(...a);c.lineTo(...b);
    t=tile(i0+k,j0+PS-1);e=elev(t)+.02;a=iso(i0+k,j0+PS,e);b=iso(i0+k+1,j0+PS,e);c.moveTo(...a);c.lineTo(...b);
    t=tile(i0,j0+k);e=elev(t)+.02;a=iso(i0,j0+k,e);b=iso(i0,j0+k+1,e);c.moveTo(...a);c.lineTo(...b);
    t=tile(i0+PS-1,j0+k);e=elev(t)+.02;a=iso(i0+PS,j0+k,e);b=iso(i0+PS,j0+k+1,e);c.moveTo(...a);c.lineTo(...b);
  }
  c.stroke();c.setLineDash([]);
}
function groundCircle(c,ci,cj,r,e){c.beginPath();for(let a=0;a<=72;a++){const th=a/72*6.283,p=iso(ci+Math.cos(th)*r,cj+Math.sin(th)*r,e);a?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])}c.closePath()}
function labelChip(c,x,y,txt,bg,fg){
  const s=1/cam.z;c.save();c.translate(x,y);c.scale(s,s);
  c.font='600 12px "Barlow Condensed","Noto Sans TC",sans-serif';const w=c.measureText(txt).width+12;
  c.fillStyle=bg;c.beginPath();c.roundRect?c.roundRect(-w/2,-10,w,20,7):c.rect(-w/2,-10,w,20);c.fill();
  c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,0,.5);c.restore();
}
function wakeCone(c,o,f,al){
  const m=MODELS[o.model],e=elev(tile(o.i,o.j)),R=m.rd/2,cx=o.i+.5,cy=o.j+.5,l=[-f[1],f[0]],L=10,pts=[];
  for(let s=0;s<=L;s++){const w=(R*.8+.18*s)*1.5;pts.push([cx+f[0]*s+l[0]*w,cy+f[1]*s+l[1]*w])}
  for(let s=L;s>=0;s--){const w=(R*.8+.18*s)*1.5;pts.push([cx+f[0]*s-l[0]*w,cy+f[1]*s-l[1]*w])}
  const a=iso(cx,cy,e),b=iso(cx+f[0]*L,cy+f[1]*L,e),g=c.createLinearGradient(a[0],a[1],b[0],b[1]);
  g.addColorStop(0,`rgba(80,150,255,${.5*al})`);g.addColorStop(1,'rgba(80,150,255,0)');
  c.beginPath();pts.forEach((p,k)=>{const s=iso(p[0],p[1],e);k?c.lineTo(s[0],s[1]):c.moveTo(s[0],s[1])});c.closePath();c.fillStyle=g;c.fill();
}
function drawOverlays(c){
  const f=flowNow();
  if(overlay==='wind'){
    for(const t of S.tiles){const e=elev(t);topPath(c,t.i,t.j,e,.02);
      if(t.sv){c.fillStyle=windColor(t.wind,.62);c.fill()}else{c.fillStyle='rgba(30,42,52,.42)';c.fill()}}
    if(cam.z>1.05){c.textAlign='center';c.textBaseline='middle';c.font='600 9px "Barlow Condensed",sans-serif';
      for(const t of S.tiles){if(t.o)continue;const p=iso(t.i+.5,t.j+.5,elev(t));c.fillStyle=t.sv?'rgba(255,255,255,.92)':'rgba(255,255,255,.5)';c.fillText(t.sv?t.wind.toFixed(1):'?',p[0],p[1])}}
  }
  if(overlay==='land'){
    for(const p of S.parcels){if(p.owned)continue;for(let j=p.py*PS;j<p.py*PS+PS;j++)for(let i=p.px*PS;i<p.px*PS+PS;i++){topPath(c,i,j,elev(tile(i,j)));c.fillStyle='rgba(10,22,30,.36)';c.fill()}}
  }
  for(const p of S.parcels)if(p.owned)parcelOutline(c,p,overlay==='land'?'rgba(255,205,80,.95)':'rgba(255,255,255,.7)',overlay==='land'?2:1.3,overlay==='land'?null:[6,5]);
  if(preview&&preview.tool==='buy'&&preview.chk.p)parcelOutline(c,preview.chk.p,'rgba(255,205,80,1)',2.4,[7,5]);
  if(overlay==='land'){
    for(const p of S.parcels){const cx=p.px*PS+PS/2,cy=p.py*PS+PS/2,e=elev(tile(Math.floor(cx),Math.floor(cy)))+1.5,s=iso(cx,cy,e);
      labelChip(c,s[0],s[1],p.owned?`${parcelName(p)} · 已擁有`:`${parcelName(p)} · ${parcelPrice(p)}M`,p.owned?'rgba(255,197,65,.95)':'rgba(12,25,33,.86)',p.owned?'#2f2100':'#fff')}
  }
  const SUBS=[...facsOf('sub'),...facsOf('osub')];
  if(overlay==='grid'||tool==='sub'||tool==='osub'){
    for(const s of SUBS){const e=elev(tile(s.i,s.j));groundCircle(c,s.i+.5,s.j+.5,FAC[s.kind].range,e);c.fillStyle='rgba(108,207,226,.13)';c.fill();c.strokeStyle='rgba(108,207,226,.9)';c.lineWidth=1.4/cam.z;c.setLineDash([6/cam.z,4/cam.z]);c.stroke();c.setLineDash([])}
    for(const o of TURBS){const s=GRID.asg.get(o);const e=elev(tile(o.i,o.j)),a=iso(o.i+.5,o.j+.5,e);
      if(s){const b=iso(s.i+.5,s.j+.5,elev(tile(s.i,s.j)));c.strokeStyle='rgba(255,230,120,.85)';c.lineWidth=1.2/cam.z;c.setLineDash([3/cam.z,3/cam.z]);c.lineDashOffset=-time*12;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.setLineDash([])}
      else if(!autoGrid()){c.strokeStyle='rgba(255,102,86,.95)';c.lineWidth=2/cam.z;c.beginPath();c.ellipse(a[0],a[1],12,6,0,0,6.283);c.stroke()}}
    if(overlay==='grid')for(const s of SUBS){const L=GRID.load.get(s)||0,cap=FAC[s.kind].cap,p=iso(s.i+.5,s.j+.5,elev(tile(s.i,s.j))+3);labelChip(c,p[0],p[1],`${fmt(L,1)} / ${cap} MW`,L>cap?'rgba(255,102,86,.95)':'rgba(12,25,33,.86)','#fff')}
    // 海纜：海上變電站接到最近的陸上變電站
    for(const s of facsOf('osub')){const n=nearestSub(s.i,s.j);if(!n)continue;const a=iso(s.i+.5,s.j+.5,-.3),b=iso(n.s.i+.5,n.s.j+.5,elev(tile(n.s.i,n.s.j)));c.strokeStyle='rgba(255,150,60,.9)';c.lineWidth=2/cam.z;c.setLineDash([6/cam.z,4/cam.z]);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.setLineDash([])}
  }
  if(overlay==='wake'){for(const o of TURBS)if(o.state!=='build'){if(season().mix){wakeCone(c,o,NE,.6);wakeCone(c,o,SW,.6)}else wakeCone(c,o,f,1)}}
  if(validMap){for(const[k,ok]of validMap){if(!ok)continue;const t=S.tiles[k];topPath(c,t.i,t.j,elev(t),.06);c.fillStyle='rgba(120,255,170,.16)';c.fill();c.strokeStyle='rgba(160,255,200,.35)';c.lineWidth=.6;c.stroke()}}
  const sel=selected&&selected.o;
  if(sel&&sel.type==='fac'&&FAC[sel.kind].range){const e=elev(tile(sel.i,sel.j));groundCircle(c,sel.i+.5,sel.j+.5,FAC[sel.kind].range,e);c.fillStyle='rgba(255,197,65,.1)';c.fill();c.strokeStyle='rgba(255,197,65,.9)';c.lineWidth=1.4/cam.z;c.stroke()}
  if(sel&&sel.type==='turb'&&overlay!=='wake'){if(season().mix){wakeCone(c,sel,NE,.5);wakeCone(c,sel,SW,.5)}else wakeCone(c,sel,f,.8)}
  if(sel){const e=elev(tile(sel.i,sel.j)),p=iso(sel.i+.5,sel.j+.5,e),r=1+.08*Math.sin(time*4);c.strokeStyle='rgba(108,207,226,.95)';c.lineWidth=2/cam.z;c.beginPath();c.ellipse(p[0],p[1],22*r,11*r,0,0,6.283);c.stroke()}
  if(selected&&selected.t&&!selected.o){const t=selected.t;topPath(c,t.i,t.j,elev(t),.03);c.strokeStyle='rgba(108,207,226,.95)';c.lineWidth=2/cam.z;c.stroke()}
  const ht=(preview&&preview.t)||(tool!=='inspect'&&hover);
  if(ht&&tool!=='buy'){
    let ok;if(preview&&preview.t===ht)ok=preview.chk.ok;else ok=tool==='bulldoze'?bullInfo(ht).ok:check(tool,ht.i,ht.j).ok;
    topPath(c,ht.i,ht.j,elev(ht),.02);c.fillStyle=ok?'rgba(110,255,170,.35)':'rgba(255,90,80,.38)';c.fill();c.strokeStyle=ok?'rgba(170,255,210,.95)':'rgba(255,140,130,.95)';c.lineWidth=1.6/cam.z;c.stroke();
    const range=FAC[tool]&&FAC[tool].range;
    if(range){const e=elev(ht);groundCircle(c,ht.i+.5,ht.j+.5,range,e);c.fillStyle='rgba(255,197,65,.08)';c.fill();c.strokeStyle='rgba(255,197,65,.75)';c.lineWidth=1.2/cam.z;c.setLineDash([5/cam.z,4/cam.z]);c.stroke();c.setLineDash([])}
  }
}
function drawObjects(c){
  const f=flowNow(),storm=weatherFx==='storm';
  for(const d of drawList){
    if(d.k==='tree'){const p=iso(d.x,d.y,d.e);const sw=storm?Math.sin(time*5+d.x*3)*.04:0;if(sw){c.save();c.translate(p[0],p[1]);c.rotate(sw);blit(c,SPR.tree[d.s],0,0,d.sc);c.restore()}else blit(c,SPR.tree[d.s],p[0],p[1],d.sc)}
    else if(d.k==='house'){const p=iso(d.x,d.y,d.e);blit(c,SPR.house[d.v],p[0],p[1],.95)}
    else{const o=d.o,t=tile(o.i,o.j),p=iso(o.i+.5,o.j+.5,elev(t));
      if(o.type==='turb')drawTurbine(c,p[0],p[1],MODELS[o.model],o.ang||0,{state:o.state,prog:o.prog,flow:f,id:o.id,blur:(o._w||0)>2});
      else drawFac(c,p[0],p[1],o.kind,o)}
  }
}
function drawGhost(c){
  const t=(preview&&preview.t)||(tool!=='inspect'&&hover);
  if(!t||tool==='bulldoze'||tool==='buy')return;
  if(tool==='road'||t.o||t.house)return;
  const p=iso(t.i+.5,t.j+.5,elev(t));
  c.save();c.globalAlpha=.62+.12*Math.sin(time*4);
  if(MODELS[tool])drawTurbine(c,p[0],p[1],MODELS[tool],time*1.5,{state:'run',flow:flowNow(),id:0});
  else if(FAC[tool])drawFac(c,p[0],p[1],tool,null);
  c.restore();
  if(MODELS[tool]&&!MODELS[tool].offshore===!isWater(t)){c.save();const o={model:tool,i:t.i,j:t.j};if(season().mix){wakeCone(c,o,NE,.4);wakeCone(c,o,SW,.4)}else wakeCone(c,o,flowNow(),.7);c.restore()}
}
function drawWindStreaks(c){
  const f=flowNow(),storm=weatherFx==='storm',fs=sv(f[0],f[1]),L=storm?1.6:1.0;
  c.lineCap='round';
  for(const w of winds){
    const a=Math.sin(Math.PI*clamp(w.life/w.max,0,1))*(storm?.55:.42);if(a<.02)continue;
    const p=iso(w.x,w.y,0);p[1]-=w.z;
    c.strokeStyle=`rgba(255,255,255,${a})`;c.lineWidth=storm?1.1:.9;
    c.beginPath();c.moveTo(p[0],p[1]);c.quadraticCurveTo(p[0]-fs[0]*L*.5,p[1]-fs[1]*L*.5-1.5*Math.sin(time*2+w.z),p[0]-fs[0]*L,p[1]-fs[1]*L);c.stroke();
  }
}
function badge(c,x,y,col,txt,ring){
  const s=clamp(1/cam.z,.8,1.8);c.save();c.translate(x,y);c.scale(s,s);
  c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.arc(0,1.5,9,0,6.283);c.fill();
  c.fillStyle=col;c.beginPath();c.arc(0,0,9,0,6.283);c.fill();
  c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.5;c.stroke();
  if(ring!=null){c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=2.4;c.beginPath();c.arc(0,0,12,-Math.PI/2,-Math.PI/2+ring*6.283);c.stroke()}
  c.fillStyle='#fff';c.font='900 10.5px "Noto Sans TC",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,0,.5);c.restore();
}
function drawBadges(c){
  for(const o of TURBS){
    const m=MODELS[o.model],p=iso(o.i+.5,o.j+.5,elev(tile(o.i,o.j))),y=p[1]-m.hub-m.rr-8+Math.sin(time*3+o.id)*1.5;
    if(o.state==='build')badge(c,p[0],y+m.rr-6,'#e5a019','工',(o.prog+.5)/m.build);
    else if(o.state==='fault')badge(c,p[0],y,o.repairing?'#e88a1a':'#e5483b',o.repairing?'修':'!');
    else if(!o.conn)badge(c,p[0],y,'#6b7b82','斷');
    else if(o.over)badge(c,p[0],y,'#c9772b','限');
    else if(o.pm)badge(c,p[0],y,'#2f9fb3','檢');
  }
}
function floatText(x,y,e,txt,col){const p=iso(x,y,e);floats.push({x:p[0],y:p[1]-30,txt,col,t:0,world:true})}
function floatTextScreen(txt,col){floats.push({x:W/2,y:H*.42,txt,col,t:0,world:false})}
function drawFloats(c){
  for(const f of floats){
    const a=1-clamp((f.t-1.1)/.7,0,1),dy=-f.t*22;
    c.save();
    if(f.world){c.translate(f.x,f.y+dy);c.scale(1/cam.z,1/cam.z)}else{c.setTransform(DPR,0,0,DPR,0,0);c.translate(f.x,f.y+dy*2)}
    c.globalAlpha=a;c.font=`700 ${f.world?16:30}px "Barlow Condensed",sans-serif`;c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(10,25,30,.7)';c.strokeText(f.txt,0,0);c.fillStyle=f.col;c.fillText(f.txt,0,0);c.restore();
  }
}
function drawRain(c){
  c.fillStyle='rgba(20,35,45,.2)';c.fillRect(0,0,W,H);
  if(rain.length<160)for(let k=0;k<160;k++)rain.push({x:VR()*W,y:VR()*H,v:500+VR()*300});
  c.strokeStyle='rgba(220,235,240,.4)';c.lineWidth=1;c.beginPath();
  for(const r of rain){r.y+=r.v*.016;r.x-=r.v*.006;if(r.y>H){r.y=-10;r.x=VR()*(W+100)}c.moveTo(r.x,r.y);c.lineTo(r.x+5,r.y-14)}
  c.stroke();
}

