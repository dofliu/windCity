// 風場大亨 — 輕快背景音樂：完整的曲子（鼓、貝斯、和弦伴奏、主旋律），依季節輪播
// 每首曲子由資料定義：速度、搖擺、調性、A/B 段和弦進行、鼓組、貝斯與伴奏節奏；
// 主旋律用固定種子產生「動機—重複—對比—回到動機」的樂句，所以每次播放都是同一首歌。
'use strict';

// ---------- 和弦、音階、節奏庫 ----------
const CH={I:[0,4,7],ii:[2,5,9],iii:[4,7,11],IV:[5,9,12],V:[7,11,14],vi:[9,12,16],
  I7:[0,4,7,10],IV7:[5,9,12,15],V7:[7,11,14,17],Imaj7:[0,4,7,11],IVmaj7:[5,9,12,16],ii7:[2,5,9,12],vi7:[9,12,16,19],
  i:[0,3,7],iv:[5,8,12],bVI:[8,12,15],bIII:[3,7,10],bVII:[10,14,17]};
const SCALES={major:[0,2,4,5,7,9,11],pent:[0,2,4,7,9],minor:[0,2,3,5,7,8,10],mixo:[0,2,4,5,7,9,10]};
// 主旋律每小節的節奏：x 起音、- 延長、. 休止（16 分音符）
const RH=['x-x-x---x-x-x---','x--x--x-x-------','x-x-x-x-x---x---','x---x-x-x---x-x-','x--x--x---x-x---',
  'x-xxx-x-x-------','..x-x-x-x-x-x---','x-x-..x-x-x-x---','x-----x-x-x-x-x-','x--x--x--x--x-x-'];
const RH_END=['x-x-x-----------','x---x---x-------','x--x--x---------'];
const FORM=['A','B','A','B'];

// ---------- 曲目 ----------
// drums：k 大鼓、s 小鼓（或拍手）、h 腳踏鈸（或沙鈴）、o 開鈸、p 打擊樂；X 重音、x 一般
// bass：1 根音、3 三音、5 五音、7 小七度、8 高八度
const SONGS={
  theme:{name:$t`風場大亨`,bpm:108,swing:.1,key:60,scale:'major',lead:'marimba',lead2:'glock',snare:'clap',hat:'hat',perc:'wood',comp:'pluck',
    A:{prog:['I','IV','vi','V'],rh:[2,1],k:'X.......X.......',s:'....x.......x...',h:'..x...x...x...x.',p:'',bass:'1.....5.8.......',comp:'x..x..x.....x...'},
    B:{prog:['IV','V','iii','vi'],rh:[0,4],k:'X.....x.X.......',s:'....X.......X...',h:'x.x.x.x.x.x.x.x.',p:'..............x.',bass:'1..1..5.8...5...',comp:'..x...x...x...x.'}},
  morning:{name:$t`海風早晨`,bpm:112,swing:.1,key:65,scale:'major',lead:'marimba',lead2:'glock',snare:'clap',hat:'hat',perc:'shaker',comp:'pluck',
    A:{prog:['I','V','vi','IV'],rh:[0,1],k:'X.....x.X.......',s:'....X.......X...',h:'x.x.x.x.x.x.x.x.',p:'',bass:'1..1..5.8...5.1.',comp:'x.....x.....x...'},
    B:{prog:['IV','V','I','vi'],rh:[2,3],k:'X...X...X...X...',s:'....X.......X...',h:'x.xxx.x.x.xxx.x.',o:'..............x.',p:'x.x.x.x.x.x.x.x.',bass:'1.18..1.5.15..8.',comp:'..x...x...x...x.'}},
  march:{name:$t`風車進行曲`,bpm:120,swing:0,key:60,scale:'major',lead:'square',lead2:'glock',snare:'snare',hat:'hat',perc:'',comp:'oompah',
    A:{prog:['I','IV','V','I'],rh:[3,0],k:'X.......X.......',s:'....X..x....X.xx',h:'x...x...x...x...',p:'',bass:'1...5...1...5...',comp:'..x...x...x...x.'},
    B:{prog:['vi','ii','V7','I'],rh:[9,2],k:'X...X...X...X...',s:'x.x.X.x.x.x.X.xx',h:'x.x.x.x.x.x.x.x.',p:'',bass:'1...5...3...5...',comp:'..x...x...x...x.'}},
  rice:{name:$t`稻浪`,bpm:100,swing:.15,key:67,scale:'pent',lead:'flute',lead2:'glock',snare:'rim',hat:'shaker',perc:'wood',comp:'strum',
    A:{prog:['I','vi','IV','V'],rh:[1,4],k:'X.......X.....x.',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',p:'..x...x...x...xx',bass:'1.....5.1...5...',comp:'x..x..x.x.x.x...'},
    B:{prog:['vi','IV','I','V'],rh:[8,0],k:'X.....x.X.....x.',s:'....X.......X...',h:'xxxxxxxxxxxxxxxx',p:'..x...x...x.x.xx',bass:'1..1..5.1..1..5.',comp:'x..x..x.x.x.x...'}},
  beach:{name:$t`夏日沙灘`,bpm:108,swing:.08,key:62,scale:'major',lead:'steel',lead2:'marimba',snare:'rim',hat:'shaker',perc:'bongo',comp:'skank',
    A:{prog:['I','IV','V','IV'],rh:[6,1],k:'X..x....X..x....',s:'....x.......x...',h:'xxxxxxxxxxxxxxxx',p:'..x.x..x..x.x..x',bass:'1..1..5.1..5..8.',comp:'..x...x...x...x.'},
    B:{prog:['I','vi','ii','V'],rh:[4,5],k:'X..x....X..x....',s:'....X.......X...',h:'xxxxxxxxxxxxxxxx',p:'x.x.x..xx.x.x..x',bass:'1..1..5.1..5..8.',comp:'..x...x...x...x.'}},
  build:{name:$t`工地進行式`,bpm:104,swing:.2,key:64,scale:'mixo',lead:'brass',lead2:'',snare:'snare',hat:'hat',perc:'',comp:'organ',
    A:{prog:['I7','I7','IV7','I7'],rh:[7,2],k:'X..x..x...X..x..',s:'....X..x.x..X...',h:'x.xxx.xxx.xxx.xx',p:'',bass:'1..8..1.....5.7.',comp:'..x..x....x..x..'},
    B:{prog:['IV7','IV7','V7','I7'],rh:[5,9],k:'X..x..x...X..x..',s:'....X..x.x..X..x',h:'x.xxx.xxx.xxx.xx',o:'..x.......x.....',p:'',bass:'1..8..1.....5.7.',comp:'..x..x....x..x..'}},
  winter:{name:$t`北風吹`,bpm:116,swing:0,key:62,scale:'major',lead:'glock',lead2:'flute',snare:'clap',hat:'hat',perc:'',comp:'arp',
    A:{prog:['vi','IV','I','V'],rh:[0,2],k:'X...X...X...X...',s:'....X.......X...',h:'..x...x...x...x.',p:'',bass:'1.1.8.1.1.1.8.5.',comp:'xxxxxxxxxxxxxxxx'},
    B:{prog:['IV','V','vi','I'],rh:[3,1],k:'X...X...X...X...',s:'....X.......X...',h:'.xx..xx..xx..xx.',o:'..x...x...x...x.',p:'',bass:'1.1.8.1.1.1.8.5.',comp:'xxxxxxxxxxxxxxxx'}},
  autumn:{name:$t`秋收`,bpm:96,swing:.12,key:65,scale:'major',lead:'whistle',lead2:'marimba',snare:'rim',hat:'hat',perc:'wood',comp:'strum',
    A:{prog:['I','iii','IV','V'],rh:[4,0],k:'X.......X..x....',s:'....X.......X...',h:'x.x.x.x.x.x.x.x.',p:'',bass:'1...5.1.1...5...',comp:'x..x..x.x.x.x...'},
    B:{prog:['IV','I','ii','V'],rh:[1,6],k:'X.......X..x....',s:'....X.......X...',h:'x.x.x.x.x.x.x.x.',p:'......x.......x.',bass:'1...5.1.1...5...',comp:'x..x..x.x.x.x...'}},
  storm:{name:$t`颱風警報`,bpm:132,swing:0,key:62,scale:'minor',lead:'square',lead2:'',snare:'snare',hat:'hat',perc:'tom',comp:'arp',
    A:{prog:['i','bVI','bIII','bVII'],rh:[5,7],k:'X..x..X.X..x..X.',s:'....X.......X..x',h:'x.x.x.x.x.x.x.x.',p:'',bass:'1.1.1.1.1.1.1.1.',comp:'x.x.x.x.x.x.x.x.'},
    B:{prog:['iv','i','bVII','V'],rh:[9,8],k:'X..x..X.X..x..X.',s:'....X.......X.xx',h:'xxxxxxxxxxxxxxxx',p:'x...x...x...x.x.',bass:'1.1.1.1.1.1.1.1.',comp:'xxxxxxxxxxxxxxxx'}},
};
// 各情境的播放清單（播完兩輪換下一首）
const POOLS={menu:['theme'],winter:['winter','morning','march'],spring:['rice','morning','theme'],summer:['beach','build','morning'],autumn:['autumn','rice','march'],storm:['storm']};

// ---------- 主旋律產生 ----------
const MEL={};
function scaleNotes(song){const sc=SCALES[song.scale],out=[];for(let o=-1;o<3;o++)for(const x of sc){const n=song.key+x+12*o;if(n>=song.key-5&&n<=song.key+21)out.push(n)}return out}
function melodyOf(id){
  if(MEL[id])return MEL[id];
  const song=SONGS[id],notes=scaleNotes(song);let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))|0;
  const start=notes.reduce((b,n,k)=>Math.abs(n-(song.key+7))<Math.abs(notes[b]-(song.key+7))?k:b,0);
  const out={};
  for(const sec of['A','B']){
    const S2=song[sec],seeds=sec==='A'?[h+1,h+1,h+2,h+1]:[h+3,h+4,h+3,h+4],bars=[];
    for(let p=0;p<4;p++){
      const R=mulberry32(seeds[p]);let cur=start;
      for(let half=0;half<2;half++){
        const bi=p*2+half,rh=half===0?RH[S2.rh[0]]:p===3?RH_END[(h>>>3)%RH_END.length]:RH[S2.rh[1]];
        const ch=CH[S2.prog[bi%4]],pcs=ch.map(x=>(song.key+x)%12),bar=new Array(16).fill(null);
        const onsets=[...rh].map((c,k)=>c==='x'?k:-1).filter(k=>k>=0);
        for(const st of onsets){
          let len=1;while(st+len<16&&rh[st+len]==='-')len++;
          const last=p===3&&half===1&&st===onsets[onsets.length-1];
          const near=pred=>{let best=cur,bd=99;notes.forEach((n,k)=>{if(pred(n)){const d=Math.abs(k-tgt);if(d<bd){bd=d;best=k}}});return best};
          let tgt=cur;
          if(last){cur=near(n=>n%12===song.key%12)}
          else if(st%4===0){tgt=cur+Math.round((R()-.5)*5);cur=near(n=>pcs.includes(n%12))}
          else{let m=[-2,-1,-1,1,1,2][Math.floor(R()*6)];if(cur+m<1||cur+m>notes.length-2)m=-m;cur=clamp(cur+m,0,notes.length-1)}
          bar[st]={n:notes[cur],len,acc:st%4===0};
        }
        bars.push(bar);
      }
    }
    out[sec]=bars;
  }
  return MEL[id]=out;
}

// ---------- 樂器 ----------
// 通用合成器：主振盪器＋可選泛音，濾波包絡、音量包絡、顫音
function syn(f,t,dur,o){
  const ctx=AU.ctx,g=ctx.createGain(),fl=ctx.createBiquadFilter(),G=o.gain*(o.v||1),a=o.a||.005,d=o.d||.3,s=o.s??.5,r=o.r||.15;
  fl.type='lowpass';fl.Q.value=o.q||.7;const cut=o.cut||6000;
  if(o.cutEnv){fl.frequency.setValueAtTime(cut*o.cutEnv,t);fl.frequency.setTargetAtTime(cut,t+a,d*.6)}else fl.frequency.value=cut;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(G,t+a);g.gain.setTargetAtTime(G*s,t+a,d/3);
  const end=t+Math.max(dur,a+.02);g.gain.setTargetAtTime(0,end,r/3);
  fl.connect(g);g.connect(o.dest||AU.music);
  if(o.rev){const x=ctx.createGain();x.gain.value=o.rev;g.connect(x);x.connect(AU.rev)}
  if(o.delay){const x=ctx.createGain();x.gain.value=o.delay;g.connect(x);x.connect(AU.delay)}
  const stop=end+r*2+.05,oscs=[];
  const mk=(ratio,type,det)=>{const os=ctx.createOscillator();os.type=type;os.frequency.value=f*ratio;if(det)os.detune.value=det;os.start(t);os.stop(stop);oscs.push(os);return os};
  mk(1,o.type||'sine',0).connect(fl);
  if(o.det)mk(1,o.type||'sine',o.det).connect(fl);
  for(const[ratio,pg,dec]of o.partials||[]){const os=mk(ratio,'sine',0),pgN=ctx.createGain();pgN.gain.setValueAtTime(pg,t);if(dec)pgN.gain.setTargetAtTime(0,t,dec/3);os.connect(pgN);pgN.connect(fl)}
  if(o.vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=o.vibRate||5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*(Math.pow(2,o.vib/1200)-1),t+.25);l.connect(lg);for(const os of oscs)lg.connect(os.frequency);l.start(t);l.stop(stop)}
}
const INST={
  marimba:{type:'sine',gain:.1,a:.003,d:.35,s:0,r:.2,partials:[[4,.35,.06],[10,.06,.02]],rev:.3,delay:.12},
  square: {type:'square',gain:.032,a:.005,d:.3,s:.55,r:.06,cut:2400,cutEnv:1.8,vib:10,rev:.2,delay:.2},
  flute:  {type:'sine',gain:.08,a:.05,d:.6,s:.8,r:.12,partials:[[2,.12,0],[3,.04,0]],vib:16,rev:.4,delay:.18},
  steel:  {type:'sine',gain:.085,a:.004,d:.45,s:.05,r:.25,partials:[[2,.45,.2],[3.01,.22,.1],[4.2,.08,.05]],rev:.35,delay:.1},
  glock:  {type:'sine',gain:.055,a:.002,d:.6,s:0,r:.4,partials:[[2.76,.4,.15],[5.4,.18,.06]],rev:.45,delay:.2},
  brass:  {type:'sawtooth',gain:.038,a:.025,d:.2,s:.7,r:.08,cut:1300,cutEnv:2.4,vib:8,det:6,rev:.2},
  whistle:{type:'sine',gain:.07,a:.02,d:.5,s:.9,r:.1,vib:24,vibRate:6,rev:.35,delay:.25},
  pluck:  {type:'triangle',gain:.04,a:.003,d:.14,s:0,r:.1,cut:2600,rev:.15},
  organ:  {type:'square',gain:.016,a:.003,d:.09,s:.25,r:.05,cut:1700,rev:.1},
  uke:    {type:'triangle',gain:.032,a:.002,d:.3,s:0,r:.15,cut:3200,partials:[[2,.3,.08]],rev:.2},
  arp:    {type:'triangle',gain:.024,a:.003,d:.12,s:0,r:.1,cut:3000,delay:.25},
  bass:   {type:'square',gain:.05,a:.004,d:.18,s:.5,r:.06,cut:480,cutEnv:2.6},
  sub:    {type:'sine',gain:.09,a:.004,d:.3,s:.7,r:.06},
};
function drum(kind,t,v){
  const ctx=AU.ctx,D=AU.music;
  const env=(node,g,dec)=>{const gg=ctx.createGain();gg.gain.setValueAtTime(g*v,t);gg.gain.exponentialRampToValueAtTime(.0001,t+dec);node.connect(gg);gg.connect(D);return gg};
  const osc=(type,f0,f1,dec)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dec*.5);o.start(t);o.stop(t+dec+.05);return o};
  const nz=(type,f,q,dec,off=0)=>{const s=ctx.createBufferSource();s.buffer=AU.noise;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;s.connect(fl);s.start(t+off,Math.random()*3,dec+.05);return fl};
  if(kind==='kick'){env(osc('sine',150,44,.3),.5,.3);env(osc('triangle',600,200,.02),.06,.02)}
  else if(kind==='snare'){env(nz('bandpass',1900,.7,.16),.22,.16);env(osc('triangle',210,170,.08),.1,.08)}
  else if(kind==='clap'){for(const off of[0,.011,.022]){const g=ctx.createGain();g.gain.setValueAtTime(.16*v,t+off);g.gain.exponentialRampToValueAtTime(.0001,t+off+(off===.022?.14:.012));nz('bandpass',1150,1.1,.15,off).connect(g);g.connect(D)}}
  else if(kind==='rim'){env(osc('sine',1700,1600,.03),.07,.03);env(nz('bandpass',3000,2,.025),.08,.025)}
  else if(kind==='hat'){env(nz('highpass',7500,.7,.035),.05,.035)}
  else if(kind==='open'){env(nz('highpass',7000,.7,.22),.04,.22)}
  else if(kind==='shaker'){env(nz('highpass',6500,.9,.05),.035,.05)}
  else if(kind==='wood'){env(osc('sine',1050,1000,.05),.09,.05);env(osc('sine',1650,1600,.03),.03,.03)}
  else if(kind==='bongo'){env(osc('sine',Math.random()<.5?390:270,220,.13),.13,.13)}
  else if(kind==='tom'){env(osc('sine',130,82,.25),.2,.25)}
  else if(kind==='crash'){const g=env(nz('highpass',4200,.5,1.3),.05,1.3);const x=ctx.createGain();x.gain.value=.3;g.connect(x);x.connect(AU.rev)}
}
const vel=c=>c==='X'?1:c==='x'?.6:0;

// ---------- 逐步播放 ----------
function playStep(st,t){
  const song=st.song,intro=st.bar<0,bi=intro?st.bar+2:st.bar%8,sec=intro?'A':FORM[Math.floor(st.bar/8)],P=song[sec],s=st.step;
  const ch=CH[P.prog[bi%4]],root=ch[0],sd=60/song.bpm/4;
  // 鼓組
  let sn=P.s;if(!intro&&bi===7&&s>=8)sn='........x.x.xxxX';
  if(vel(P.k[s]))drum('kick',t,vel(P.k[s]));
  if(!intro&&vel(sn[s]))drum(song.snare,t,vel(sn[s])*(bi===7&&s>=8?.5+(s-8)/14:1));
  if(vel(P.h[s]))drum(song.hat,t,vel(P.h[s])*(s%4===0?1:.75));
  if(!intro&&P.o&&vel(P.o[s]))drum('open',t,vel(P.o[s]));
  if(!intro&&P.p&&vel(P.p[s]))drum(song.perc||'shaker',t,vel(P.p[s]));
  if(!intro&&s===0&&bi===0)drum('crash',t,1);
  // 貝斯
  const bc=P.bass[s];
  if(bc&&bc!=='.'){let len=1;while(s+len<16&&P.bass[s+len]==='.'&&len<4)len++;
    const iv={'1':root,'3':ch[1],'5':ch[2],'7':root+10,'8':root+12}[bc]??root,n=song.key-24+iv,f=midi(n),d=sd*len*.85;
    syn(f,t,d,INST.bass);syn(f,t,d,INST.sub)}
  // 和弦伴奏
  const cc=P.comp[s];
  if(cc==='x'){const vo=ch.map(x=>song.key-12+x);
    if(song.comp==='arp'){const k=(st.bar+2)*16+s,n=song.key+ch[k%ch.length]+(Math.floor(k/ch.length)%2)*12;syn(midi(n),t,sd*.9,INST.arp)}
    else if(song.comp==='strum'){vo.concat([vo[0]+12]).forEach((n,k)=>syn(midi(n),t+k*.014,sd*2.5,INST.uke))}
    else{const ins=song.comp==='organ'||song.comp==='skank'?INST.organ:INST.pluck;for(const n of vo)syn(midi(n+(song.comp==='oompah'?12:0)),t,sd*(song.comp==='pluck'?2:1.1),ins)}}
  // 主旋律（B 段加一層高八度疊奏）
  if(!intro){const e=st.mel[sec][bi][s];
    if(e){const v=e.acc?1:.8,d=sd*e.len*.92;syn(midi(e.n),t,d,Object.assign({v},INST[song.lead]));
      if(sec==='B'&&song.lead2)syn(midi(e.n+(song.lead2==='glock'?12:0)),t,d,Object.assign({v:v*.45},INST[song.lead2]))}}
}
function advance(st){st.step++;if(st.step===16){st.step=0;st.bar++;if(st.bar>=32){st.bar=0;st.loops++}}}
function songState(id){return {id,song:SONGS[id],mel:melodyOf(id),bar:-2,step:0,loops:0}}

// ---------- 即時排程 ----------
const GM={st:null,t:0,mood:null,pend:null,rot:{}};
function nextInPool(mood){const pool=POOLS[mood]||POOLS.menu,k=(GM.rot[mood]||0)%pool.length;GM.rot[mood]=k+1;return pool[k]}
function grooveSchedule(){
  const ctx=AU.ctx;
  if(GM.mood!==AU.mood){GM.mood=AU.mood;const id=nextInPool(AU.mood);if(!GM.st){GM.st=songState(id);GM.t=ctx.currentTime+.1}else if(id!==GM.st.id)GM.pend=id;npRefresh()}
  if(GM.t<ctx.currentTime-.2)GM.t=ctx.currentTime+.05; // 分頁切回來或從悠閒風格切換
  while(GM.t<ctx.currentTime+.3){
    const st=GM.st;
    if(st.step===0&&st.loops>=2&&!GM.pend)GM.pend=nextInPool(GM.mood);
    if(st.step===0&&GM.pend){GM.st=songState(GM.pend);GM.pend=null;npRefresh();continue}
    const sd=60/st.song.bpm/4;
    playStep(st,GM.t+(st.step%2?st.song.swing*sd:0));
    if(st.step%4===0)AU.beat++;advance(st);GM.t+=sd;
  }
}
function musicNext(){if(!GM.st)return;const pool=POOLS[GM.mood]||POOLS.menu;let id=nextInPool(GM.mood);if(id===GM.st.id&&pool.length>1)id=nextInPool(GM.mood);GM.pend=id}
function npRefresh(){const el=document.getElementById('npName');if(el)el.textContent=nowPlaying()}
const nowPlaying=()=>SETTINGS.musicStyle==='calm'?$t`悠閒氛圍（隨季節即興）`:GM.st?SONGS[GM.pend||GM.st.id].name:SONGS[(POOLS[AU.mood]||POOLS.menu)[0]].name;

// ---------- 離線渲染（試聽與測試用）----------
function renderSong(id,secs,startBar=-2){
  const off=new OfflineAudioContext(2,Math.ceil(44100*secs),44100),save=Object.assign({},AU);
  try{audioGraph(off);AU.music.gain.value=.5;
    const st=songState(id);st.bar=startBar;let t=.05;const sd=60/st.song.bpm/4;
    while(t<secs-.5){playStep(st,t+(st.step%2?st.song.swing*sd:0));advance(st);t+=sd}
  }finally{Object.assign(AU,save)}
  return off.startRendering();
}
