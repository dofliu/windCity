// 風場大亨 — 鏡頭與觸控輸入
'use strict';
// ================= camera & input =================
const s2w=(sx,sy)=>[(sx-W/2)/cam.z+cam.x,(sy-H/2)/cam.z+cam.y];
function clampCam(){cam.z=clamp(cam.z,.3,2.6);cam.x=clamp(cam.x,-N*TW/2,N*TW/2);cam.y=clamp(cam.y,-40,N*TH+20)}
function pickTile(sx,sy){
  const[wx,wy]=s2w(sx,sy);
  for(let s=2*N-2;s>=0;s--)for(let i=Math.min(N-1,s);i>=0&&s-i<N;i--){
    const j=s-i,t=tile(i,j),y2=wy+elev(t)*HZ,x=(wx/(TW/2)+y2/(TH/2))/2,y=(y2/(TH/2)-wx/(TW/2))/2;
    if(Math.floor(x)===i&&Math.floor(y)===j)return t;
  }
  return null;
}
function pickObj(sx,sy){
  const[wx,wy]=s2w(sx,sy);
  for(let k=drawList.length-1;k>=0;k--){const d=drawList[k];if(d.k!=='obj')continue;const o=d.o,p=iso(o.i+.5,o.j+.5,elev(tile(o.i,o.j)));
    if(o.type==='turb'){const m=MODELS[o.model];if(Math.hypot(wx-p[0],wy-(p[1]-m.hub))<m.rr*.75)return o;if(Math.abs(wx-p[0])<7&&wy<p[1]+4&&wy>p[1]-m.hub)return o}
    else if(Math.abs(wx-p[0])<26&&wy<p[1]+12&&wy>p[1]-(o.kind==='mast'?66:26))return o}
  return null;
}
const ptrs=new Map();let gest=null;
cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1)gest={type:'maybe',x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};
  else if(ptrs.size===2){const[a,b]=[...ptrs.values()];const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;gest={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:cam.z,w:s2w(mx,my)}}
});
cv.addEventListener('pointermove',e=>{
  const p=ptrs.get(e.pointerId);
  if(!p){if(e.pointerType==='mouse'){const t=pickTile(e.clientX,e.clientY);hover=t}return}
  p.x=e.clientX;p.y=e.clientY;
  if(!gest)return;
  if(gest.type==='maybe'&&Math.hypot(e.clientX-gest.x,e.clientY-gest.y)>7)gest.type='pan';
  if(gest.type==='pan'){cam.x=gest.cx-(e.clientX-gest.x)/cam.z;cam.y=gest.cy-(e.clientY-gest.y)/cam.z;clampCam()}
  else if(gest.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.z=clamp(gest.z*d/gest.d,.3,2.6);cam.x=gest.w[0]-(mx-W/2)/cam.z;cam.y=gest.w[1]-(my-H/2)/cam.z;clampCam()}
  if(e.pointerType==='mouse')hover=pickTile(e.clientX,e.clientY);
});
const endPtr=e=>{
  if(!ptrs.has(e.pointerId))return;
  ptrs.delete(e.pointerId);
  if(gest&&gest.type==='maybe'&&e.type==='pointerup')onTap(e.clientX,e.clientY);
  if(ptrs.size===1){const[q]=[...ptrs.values()];gest={type:'pan',x:q.x,y:q.y,cx:cam.x,cy:cam.y}}else if(!ptrs.size)gest=null;
};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')hover=null});
cv.addEventListener('wheel',e=>{e.preventDefault();const w=s2w(e.clientX,e.clientY);cam.z=clamp(cam.z*Math.exp(-e.deltaY*.0015),.3,2.6);cam.x=w[0]-(e.clientX-W/2)/cam.z;cam.y=w[1]-(e.clientY-H/2)/cam.z;clampCam()},{passive:false});
function zoomBy(f){cam.z=clamp(cam.z*f,.3,2.6);clampCam()}
function centerOnOwned(fit){
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  for(const p of S.parcels)if(p.owned)for(const[a,b]of[[0,0],[1,0],[1,1],[0,1]]){const s=iso((p.px+a)*PS,(p.py+b)*PS,1);mnx=Math.min(mnx,s[0]);mxx=Math.max(mxx,s[0]);mny=Math.min(mny,s[1]);mxy=Math.max(mxy,s[1])}
  cam.x=(mnx+mxx)/2;cam.y=(mny+mxy)/2-30;
  if(fit){const narrow=W<700;cam.z=clamp(Math.min((W-(narrow?40:380))/(mxx-mnx+60),(H-(narrow?260:240))/(mxy-mny+160)),.45,1.3)}
  clampCam();
}
function onTap(sx,sy){
  if(modalOpen)return;
  if(tool==='inspect'){
    const o=pickObj(sx,sy);if(o){select({o});return}
    const t=pickTile(sx,sy);if(t){const ob=objOf(t);select(ob?{o:ob}:{t})}else closeInspector();
    return;
  }
  const t=pickTile(sx,sy);if(!t)return;
  if(tool==='road'){build('road',t);preview=null;return}
  if(tool==='bulldoze'){
    const b=bullInfo(t);if(!b.ok){toast(b.r,'bad');return}
    if(b.o){if(preview&&preview.t===t){doBulldoze(t);cancelPreview();return}preview={tool,t,chk:b};showConfirm();return}
    doBulldoze(t);return;
  }
  if(tool==='buy'){
    const chk=check('buy',t.i,t.j);
    if(preview&&preview.chk.p===chk.p&&chk.ok){buyParcel(chk.p);cancelPreview();return}
    preview={tool,t,chk};showConfirm();return;
  }
  if(preview&&preview.t===t&&preview.chk.ok){confirmPreview();return}
  preview={tool,t,chk:check(tool,t.i,t.j)};showConfirm();
}

