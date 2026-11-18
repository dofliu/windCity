// 風場大亨 — 音樂、環境音與音效（全部用 Web Audio 即時合成，不需要音檔）
'use strict';
const SET_KEY='windcity:settings';
const SETTINGS={music:.5,sfx:.75,amb:.55,mute:false,daynight:true,style:'cartoon',cine:true};
try{Object.assign(SETTINGS,JSON.parse(localStorage.getItem(SET_KEY)||'{}'))}catch(e){}
function saveSettings(){try{localStorage.setItem(SET_KEY,JSON.stringify(SETTINGS))}catch(e){}}

const AU={ctx:null,master:null,music:null,sfx:null,amb:null,rev:null,delay:null,noise:null,started:false,
  mood:'menu',nextBeat:0,beat:0,timer:null,wind:null,sea:null,rain:null};
const midi=n=>440*Math.pow(2,(n-69)/12);

// 音樂情緒：和弦進行（MIDI 音高）、速度、音色亮度
const MOODS={
  menu:  {bpm:66,bright:.45,chords:[[50,57,62,65,69],[46,53,58,62,65],[41,48,53,57,60],[48,55,60,64,67]],arp:.55,mel:.25},
  winter:{bpm:78,bright:.55,chords:[[50,57,60,65,69],[46,53,57,62,65],[41,48,53,57,64],[48,55,58,64,67]],arp:.85,mel:.35},
  spring:{bpm:72,bright:.6, chords:[[41,48,52,57,64],[43,50,55,59,62],[40,47,52,55,62],[45,52,55,60,64]],arp:.7,mel:.45},
  summer:{bpm:80,bright:.75,chords:[[48,55,59,64,67],[45,52,55,60,64],[41,48,52,57,64],[43,50,55,59,64]],arp:.8,mel:.55},
  autumn:{bpm:70,bright:.5, chords:[[45,52,55,60,64],[41,48,52,57,64],[48,55,59,64,67],[40,47,50,55,62]],arp:.65,mel:.4},
  storm: {bpm:84,bright:.3, chords:[[38,45,50,53,57],[37,44,49,53,56],[34,41,46,50,53],[36,43,48,51,55]],arp:.35,mel:.1},
};
const SEASON_MOOD=['winter','spring','summer','autumn'];

function audioStart(){
  if(AU.started)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  let ctx;try{ctx=new AC()}catch(e){return}
  AU.ctx=ctx;AU.started=true;
  AU.master=ctx.createGain();AU.master.connect(ctx.destination);
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(AU.master);
  AU.music=ctx.createGain();AU.sfx=ctx.createGain();AU.amb=ctx.createGain();
  for(const g of[AU.music,AU.sfx,AU.amb])g.connect(comp);
  // 殘響：合成的衰減雜訊脈衝
  AU.rev=ctx.createConvolver();AU.rev.buffer=impulse(ctx,2.8,2.2);const rg=ctx.createGain();rg.gain.value=.35;AU.rev.connect(rg);rg.connect(comp);
  // 迴聲（給琶音）
  AU.delay=ctx.createDelay(1);AU.delay.delayTime.value=.42;const fb=ctx.createGain();fb.gain.value=.32;const dl=ctx.createBiquadFilter();dl.type='lowpass';dl.frequency.value=2200;
  AU.delay.connect(dl);dl.connect(fb);fb.connect(AU.delay);dl.connect(AU.rev);const dg=ctx.createGain();dg.gain.value=.4;dl.connect(dg);dg.connect(AU.music);
  AU.noise=noiseBuf(ctx,4);
  // 環境音：風、海浪、雨
  AU.wind=loopNoise('bandpass',500,.9);AU.sea=loopNoise('lowpass',420,.7);AU.rain=loopNoise('highpass',2600,.5);
  applyVolumes();
  AU.nextBeat=ctx.currentTime+.2;
  AU.timer=setInterval(schedule,90);
  document.addEventListener('visibilitychange',()=>{if(!AU.ctx)return;if(document.hidden)AU.ctx.suspend();else AU.ctx.resume()});
}
function impulse(ctx,sec,decay){const n=ctx.sampleRate*sec,b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)}return b}
function noiseBuf(ctx,sec){const n=ctx.sampleRate*sec,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.5*.6+w*.4*.25}return b}
function loopNoise(type,freq,q){
  const ctx=AU.ctx,src=ctx.createBufferSource();src.buffer=AU.noise;src.loop=true;src.loopStart=Math.random();
  const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
  const g=ctx.createGain();g.gain.value=0;src.connect(f);f.connect(g);g.connect(AU.amb);src.start();
  return {f,g,base:freq};
}
function applyVolumes(){
  if(!AU.ctx)return;const t=AU.ctx.currentTime,m=SETTINGS.mute?0:1;
  AU.master.gain.setTargetAtTime(m,t,.05);
  AU.music.gain.setTargetAtTime(SETTINGS.music*.55,t,.1);
  AU.sfx.gain.setTargetAtTime(SETTINGS.sfx*.9,t,.05);
  AU.amb.gain.setTargetAtTime(SETTINGS.amb*.6,t,.2);
}

// ---------- 音樂排程 ----------
function voice(freq,t,dur,{type='triangle',gain=.1,attack=.01,release=.3,cutoff=2000,dest=AU.music,detune=0,rev=.25,delay=0}={}){
  const ctx=AU.ctx,o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  o.type=type;o.frequency.value=freq;o.detune.value=detune;f.type='lowpass';f.frequency.value=cutoff;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.setTargetAtTime(0,t+Math.max(attack,dur-release),release/3);
  o.connect(f);f.connect(g);g.connect(dest);
  if(rev){const r=ctx.createGain();r.gain.value=rev;g.connect(r);r.connect(AU.rev)}
  if(delay){const d=ctx.createGain();d.gain.value=delay;g.connect(d);d.connect(AU.delay)}
  o.start(t);o.stop(t+dur+release*2);
}
function schedule(){
  if(!AU.ctx||AU.ctx.state!=='running')return;
  const M=MOODS[AU.mood]||MOODS.menu,spb=60/M.bpm;
  while(AU.nextBeat<AU.ctx.currentTime+.45){
    const t=AU.nextBeat,b=AU.beat,bar=Math.floor(b/4),ch=M.chords[Math.floor(bar/2)%M.chords.length],cut=600+M.bright*1600;
    if(b%8===0){ // 每兩小節換和弦：鋪底與低音
      for(let k=1;k<ch.length;k++)for(const dt of[-7,7])voice(midi(ch[k]),t,spb*8,{type:'sawtooth',gain:.022,attack:1.6,release:2.2,cutoff:cut*.7,detune:dt,rev:.5});
      voice(midi(ch[0]-12),t,spb*8,{type:'sine',gain:.12,attack:.3,release:1.5,cutoff:400,rev:.1});
    }
    if(b%4===2&&AU.mood!=='menu')voice(midi(ch[0]),t,spb*1.5,{type:'sine',gain:.06,attack:.02,release:.6,cutoff:600,rev:.1});
    // 八分音符琶音
    for(const half of[0,.5]){
      if(Math.random()<M.arp*(half?.55:.9)){const n=ch[1+Math.floor(Math.random()*(ch.length-1))]+12*(Math.random()<.35?1:0);
        voice(midi(n),t+half*spb,spb*.9,{type:'triangle',gain:.035,attack:.005,release:.5,cutoff:cut*1.6,rev:.3,delay:.5})}
    }
    // 偶爾的五聲音階旋律（馬林巴般的音色）
    if(b%2===0&&Math.random()<M.mel*.5){const sc=[0,2,4,7,9],root=ch[0]+24,n=root+sc[Math.floor(Math.random()*5)]+(Math.random()<.3?12:0);
      voice(midi(n),t,spb*1.2,{type:'sine',gain:.05,attack:.004,release:.9,cutoff:4000,rev:.45,delay:.35});
      voice(midi(n)*4,t,.15,{type:'sine',gain:.012,attack:.002,release:.12,cutoff:6000,rev:.2})}
    // 夏天加一點輕柔沙鈴
    if(AU.mood==='summer'&&b%1===0){shaker(t+spb*.5,.012)}
    AU.nextBeat+=spb;AU.beat++;
  }
}
function shaker(t,g){const ctx=AU.ctx,s=ctx.createBufferSource();s.buffer=AU.noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=7000;const gg=ctx.createGain();gg.gain.setValueAtTime(g,t);gg.gain.exponentialRampToValueAtTime(.0001,t+.06);s.connect(f);f.connect(gg);gg.connect(AU.music);s.start(t,Math.random()*3,.08)}

// ---------- 每幀更新：情緒與環境音 ----------
function audioUpdate(){
  if(!AU.ctx)return;
  const menu=typeof levelsOpen==='function'&&levelsOpen();
  const storm=weatherFx==='storm';
  AU.mood=menu?'menu':storm?'storm':S?SEASON_MOOD[S.turn%4]:'menu';
  const t=AU.ctx.currentTime,se=S?season():SEASONS[0];
  const wv=menu?.35:clamp((se.wind-.6)/.7,0,1)*(storm?1.8:1);
  const gust=.75+.25*Math.sin(t*.37)*Math.sin(t*.13+1);
  AU.wind.g.gain.setTargetAtTime(menu?.15:(.25+.55*wv)*gust,t,.4);
  AU.wind.f.frequency.setTargetAtTime(AU.wind.base*(.8+wv*.9)*(.85+.3*gust),t,.5);
  const hasSea=S&&waterTiles&&waterTiles.length>40;
  AU.sea.g.gain.setTargetAtTime(hasSea&&!menu?(.35+.25*Math.sin(t*.5))*(storm?1.6:1):0,t,.6);
  AU.rain.g.gain.setTargetAtTime(storm&&!menu?.5:0,t,.8);
}

// ---------- 音效 ----------
function tone(f0,f1,dur,{type='sine',gain=.2,attack=.005,t=0,cutoff=8000,rev=.15}={}){
  const ctx=AU.ctx,o=ctx.createOscillator(),g=ctx.createGain(),fl=ctx.createBiquadFilter(),st=ctx.currentTime+t;
  o.type=type;o.frequency.setValueAtTime(f0,st);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),st+dur);
  fl.type='lowpass';fl.frequency.value=cutoff;
  g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(gain,st+attack);g.gain.exponentialRampToValueAtTime(.0001,st+dur);
  o.connect(fl);fl.connect(g);g.connect(AU.sfx);if(rev){const r=AU.ctx.createGain();r.gain.value=rev;g.connect(r);r.connect(AU.rev)}
  o.start(st);o.stop(st+dur+.05);
}
function burst(dur,{type='lowpass',freq=800,f1=null,gain=.3,t=0,q=.8}={}){
  const ctx=AU.ctx,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),st=ctx.currentTime+t;
  s.buffer=AU.noise;f.type=type;f.frequency.setValueAtTime(freq,st);if(f1)f.frequency.exponentialRampToValueAtTime(f1,st+dur);f.Q.value=q;
  g.gain.setValueAtTime(gain,st);g.gain.exponentialRampToValueAtTime(.0001,st+dur);
  s.connect(f);f.connect(g);g.connect(AU.sfx);s.start(st,Math.random()*3,dur+.05);
}
const bell=(f,t=0,g=.12,d=1.2)=>{tone(f,f,d,{gain:g,t,rev:.4});tone(f*2.76,f*2.76,d*.4,{gain:g*.25,t,rev:.3});tone(f*5.4,f*5.4,d*.2,{gain:g*.1,t})};
const SFX={
  click:()=>tone(1400,900,.05,{type:'sine',gain:.05,rev:0}),
  tick:()=>tone(2100,1600,.035,{gain:.035,rev:0}),
  toggle:()=>{tone(700,1000,.06,{type:'triangle',gain:.06});},
  build:()=>{tone(170,55,.22,{type:'sine',gain:.35,rev:.1});burst(.12,{type:'bandpass',freq:2400,gain:.12,q:4,t:.02});bell(midi(84),.12,.05,.6)},
  road:()=>{burst(.1,{freq:500,gain:.12});tone(220,160,.08,{type:'triangle',gain:.06})},
  complete:()=>{[72,76,79,84,88].forEach((n,k)=>bell(midi(n),k*.07,.07,.9))},
  bulldoze:()=>{burst(.45,{freq:1200,f1:150,gain:.35});tone(90,40,.4,{type:'sawtooth',gain:.08,cutoff:400})},
  coin:()=>{tone(midi(83),midi(83),.08,{type:'square',gain:.04,cutoff:3000});tone(midi(88),midi(88),.35,{type:'square',gain:.04,cutoff:3000,t:.07,rev:.3})},
  error:()=>{tone(260,200,.12,{type:'triangle',gain:.12,rev:0});tone(200,150,.16,{type:'triangle',gain:.12,t:.11,rev:0})},
  research:()=>{for(let k=0;k<6;k++)tone(midi(67+k*3),midi(67+k*3),.25,{type:'triangle',gain:.05,t:k*.05,rev:.4})},
  whoosh:()=>burst(.7,{type:'bandpass',freq:300,f1:2400,gain:.18,q:1.2}),
  report:()=>{burst(.35,{type:'bandpass',freq:2000,f1:500,gain:.08,q:1});bell(midi(79),.1,.06,.8)},
  event:()=>{bell(midi(76),0,.12,1.4);bell(midi(81),.18,.1,1.4)},
  typhoon:()=>{tone(98,92,1.6,{type:'sawtooth',gain:.12,attack:.3,cutoff:500,rev:.4});tone(147,138,1.6,{type:'sawtooth',gain:.08,attack:.3,cutoff:500});burst(2.2,{type:'bandpass',freq:300,f1:900,gain:.25,q:.6})},
  win:()=>{[60,64,67,72,76,79,84].forEach((n,k)=>tone(midi(n),midi(n),.6,{type:'triangle',gain:.09,t:k*.09,rev:.4}));[72,76,79].forEach(n=>tone(midi(n),midi(n),1.6,{type:'sine',gain:.06,t:.7,rev:.5}))},
  lose:()=>{[64,62,59,55].forEach((n,k)=>tone(midi(n),midi(n),.7,{type:'triangle',gain:.09,t:k*.22,rev:.4}))},
  thunder:()=>{burst(.08,{type:'highpass',freq:3000,gain:.35});burst(1.8,{freq:420,f1:60,gain:.55,t:.05});tone(70,38,1.4,{type:'sawtooth',gain:.1,cutoff:220,t:.05,rev:.5})},
  crowd:()=>{for(let k=0;k<7;k++){const f=180+Math.random()*160;tone(f,f*(.85+Math.random()*.3),.35+Math.random()*.3,{type:'sawtooth',gain:.025,cutoff:900,t:k*.12+Math.random()*.08,rev:.3})}burst(1.4,{type:'bandpass',freq:700,gain:.08,q:.7})},
  chirp:()=>{for(let k=0;k<8;k++){const f=2600+Math.random()*1400;tone(f,f*1.35,.07,{gain:.03,t:k*.11+Math.random()*.05,rev:.2})}},
  alarm:()=>{for(let k=0;k<3;k++){tone(880,880,.16,{type:'square',gain:.04,cutoff:2500,t:k*.36,rev:.1});tone(660,660,.16,{type:'square',gain:.04,cutoff:2500,t:k*.36+.18,rev:.1})}},
  start:()=>{[67,72,76].forEach((n,k)=>bell(midi(n),k*.1,.08,1))},
};
function sfx(name){if(!AU.started||SETTINGS.mute||!SETTINGS.sfx)return;try{SFX[name]&&SFX[name]()}catch(e){}}
// 瀏覽器規定要使用者互動後才能出聲：第一次點擊時啟動
function audioArm(){
  const go=()=>{audioStart();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();window.removeEventListener('pointerdown',go,true);window.removeEventListener('keydown',go,true)};
  window.addEventListener('pointerdown',go,true);window.addEventListener('keydown',go,true);
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&!b.disabled&&!b.dataset.silent)sfx('click')},true);
}
