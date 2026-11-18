// 背景音樂試聽：把每首曲子離線渲染成 WAV（tools/out/music/），並檢查音量與破音
// 用法：node tools/music-preview.js [秒數] [曲目 id,…]
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const secs=+(process.argv[2]||24);const only=(process.argv[3]||'').split(',').filter(Boolean);
const out=path.resolve(__dirname,'out','music');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(800);
const ids=only.length?only:await p.evaluate(()=>Object.keys(SONGS));
for(const id of ids){
  const r=await p.evaluate(async([id,secs])=>{const buf=await renderSong(id,secs);
    const L=buf.getChannelData(0),R=buf.getChannelData(1),n=L.length;let peak=0,sum=0;
    const pcm=new Int16Array(n*2);for(let i=0;i<n;i++){const a=L[i],c=R[i];peak=Math.max(peak,Math.abs(a),Math.abs(c));sum+=a*a;pcm[i*2]=Math.max(-1,Math.min(1,a))*32767;pcm[i*2+1]=Math.max(-1,Math.min(1,c))*32767}
    const hdr=new DataView(new ArrayBuffer(44)),w=(o,s)=>{for(let k=0;k<4;k++)hdr.setUint8(o+k,s.charCodeAt(k))};
    w(0,'RIFF');hdr.setUint32(4,36+pcm.byteLength,true);w(8,'WAVE');w(12,'fmt ');hdr.setUint32(16,16,true);hdr.setUint16(20,1,true);hdr.setUint16(22,2,true);hdr.setUint32(24,44100,true);hdr.setUint32(28,44100*4,true);hdr.setUint16(32,4,true);hdr.setUint16(34,16,true);w(36,'data');hdr.setUint32(40,pcm.byteLength,true);
    const bytes=new Uint8Array(44+pcm.byteLength);bytes.set(new Uint8Array(hdr.buffer),0);bytes.set(new Uint8Array(pcm.buffer),44);
    let bin='';for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));
    return {name:SONGS[id].name,bpm:SONGS[id].bpm,peak,rms:Math.sqrt(sum/n),b64:btoa(bin)}},[id,secs]);
  fs.writeFileSync(path.join(out,id+'.wav'),Buffer.from(r.b64,'base64'));
  console.log(`${id.padEnd(8)} ${r.name}\t${r.bpm} bpm  peak ${r.peak.toFixed(3)}  rms ${r.rms.toFixed(4)}`);
}
console.log('errors:',errs.length?errs:'none');await b.close()})();
