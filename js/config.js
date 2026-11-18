// 風場大亨 — 常數、機型、季節、隨機數
'use strict';
// ================= constants =================
// 地圖邊長 N 依關卡而定（必須是地塊邊長 PS 的倍數），由 setLevel() 設定
let N=24, NP=4;
const TW=64, TH=32, HZ=12, PS=6, BASE=-3.4;
const HOURS=2190, CREW_PAY=2.4, CREW_HIRE=3, VESSEL_PAY=3, VESSEL_HIRE=4, VESSELS_PER_PORT=4, START_YEAR=2027;
const $=s=>document.querySelector(s);
const VR=Math.random.bind(Math); // visual-only randomness
const GR=()=>(window.__grand||Math.random)(); // game-logic randomness (seedable for replays)
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const iso=(x,y,h=0)=>[(x-y)*TW/2,(x+y)*TH/2-h*HZ];
const sv=(a,b)=>[(a-b)*TW/2,(a+b)*TH/2];
const P3=(a,b,z)=>{const s=sv(a,b);return [s[0],s[1]-z]};
const norm=v=>{const l=Math.hypot(v[0],v[1]);return [v[0]/l,v[1]/l]};
const NE=norm([0.32,1]), SW=[-NE[0],-NE[1]];
// sea：離岸作業的海況窗口（可出海施工、維修的機率）
const SEASONS=[
  {q:'Q1',name:'冬',label:'東北季風',wind:1.18,dir:NE,typhoon:0,sea:.4},
  {q:'Q2',name:'春',label:'梅雨・季風轉換',wind:.93,dir:NE,mix:true,typhoon:.08,sea:.85},
  {q:'Q3',name:'夏',label:'西南氣流・颱風季',wind:.72,dir:SW,typhoon:.5,sea:.65},
  {q:'Q4',name:'秋',label:'東北季風增強',wind:1.12,dir:NE,typhoon:.18,sea:.5},
];
const MODELS={
  t2:{name:'GW-2.0 陸域型',short:'2.0 MW',mw:2.0,cash:24,steel:60,blades:1,build:1,om:.35,vr:13,hubM:80,hub:58,rr:30,rd:.8},
  t4:{name:'GW-4.2 陸域型',short:'4.2 MW',mw:4.2,cash:46,steel:110,blades:2,build:2,om:.6,vr:12,hubM:110,hub:76,rr:40,rd:1.1},
  t6:{name:'GW-6.2 大型陸域',short:'6.2 MW',mw:6.2,cash:64,steel:160,blades:3,build:2,om:.85,vr:11.5,hubM:125,hub:92,rr:50,rd:1.4,tech:'tech6',needRoad:true},
  t10:{name:'GW-10 離岸型',short:'10 MW',mw:10,cash:120,steel:320,blades:4,build:3,om:1.8,vr:11,hubM:140,hub:104,rr:60,rd:1.8,tech:'tech10',offshore:true},
  f15:{name:'GW-15 浮動式',short:'15 MW',mw:15,cash:200,steel:420,blades:5,build:3,om:2.8,vr:11,hubM:150,hub:112,rr:70,rd:2.1,tech:'tech15',offshore:true,floating:true},
};
const TECH={
  tech6:{name:'大型陸域風機技術',cost:80,desc:'解鎖 6.2 MW 機型，輪轂 125 m，須緊鄰道路運輸葉片。'},
  tech10:{name:'離岸工程技術',cost:160,desc:'解鎖 10 MW 離岸機型，可建於淺海，維修需維運中心支援。'},
  tech15:{name:'浮動式基礎技術',cost:220,desc:'解鎖 15 MW 浮動式機組，可建於深海，風況最好但造價最高。'},
};
const FAC={
  sub:{name:'變電站',icon:'i-sub',cash:55,steel:40,up:.5,cap:80,range:6.5,desc:'風機需在 6.5 格內才能併網，每座容量 80 MW，超過的部分會被削減。'},
  om:{name:'維運中心',icon:'i-om',cash:28,steel:20,up:1.2,range:7,desc:'7 格內的風機故障率 −40%，修復後恢復更快；離岸機組需要它才能一季內修好。'},
  mast:{name:'測風塔',icon:'i-mast',cash:4,steel:5,up:.1,range:5,desc:'量測半徑 5 格內的風況，讓你在買地前先看清楚風能資源。'},
  ware:{name:'倉儲中心',icon:'i-ware',cash:16,steel:30,up:.3,desc:'鋼材庫容 +500 t、葉片庫容 +10 組。'},
  bess:{name:'儲能系統',icon:'i-bess',cash:48,steel:15,up:.4,desc:'每座減少 25% 限電損失，並提供每季 1.6M 的輔助服務收益。'},
  road:{name:'道路',icon:'i-road',cash:.6,steel:0,up:0,desc:'維修車輛進出；大型機組必須緊鄰道路。風機 2 格內沒有道路時，修復要多花一季。'},
  port:{name:'運維港口',icon:'i-port',cash:60,steel:80,up:1.5,offOps:true,desc:'建在緊鄰海水的陸地上。離岸機組的施工與維修都要從港口出船，每座港口可停泊 4 艘工作船。'},
  osub:{name:'海上變電站',icon:'i-osub',cash:140,steel:200,up:2.5,cap:300,range:8,water:true,offOps:true,desc:'建在海上，8 格內的離岸機組可併網，容量 300 MW，平台同時是海上運維基地（範圍內離岸機組享有維運中心效果）。需要陸上變電站接收，海纜依距離計價（每格 1.2M）。'},
};
const CABLE_PER_TILE=1.2;
// 地方回饋方案：每季支出與民眾支持度提升
const FUND=[{name:'無',cost:0,sup:0,desc:'不額外回饋'},{name:'基本',cost:2,sup:1.2,desc:'每季 2M・支持度 +1.2'},{name:'加強',cost:5,sup:2.8,desc:'每季 5M・支持度 +2.8'}];
const FAULTS=[
  {n:'變槳系統異常',cost:3,w:3},
  {n:'控制器通訊中斷',cost:1.5,w:3},
  {n:'發電機絕緣劣化',cost:6,w:2},
  {n:'齒輪箱軸承過熱',cost:9,w:1.5},
  {n:'葉片前緣侵蝕',cost:4,w:1.5,blade:1},
  {n:'颱風葉片損傷',cost:6,w:0,blade:1},
  {n:'雷擊葉尖損傷',cost:3,w:0,blade:1},
];
const POLICY=[
  {name:'基本',cost:.6,fail:1.6,decay:4,desc:'運維費 ×0.6，故障率 ×1.6'},
  {name:'標準',cost:1,fail:1,decay:2.5,desc:'運維費 ×1，故障率 ×1'},
  {name:'積極',cost:1.6,fail:.55,decay:1.3,desc:'運維費 ×1.6，故障率 ×0.55'},
];
const TNAME={grass:'草地',farm:'農田',forest:'林地',sand:'沙岸',rock:'岩坡',shallow:'淺海',deep:'深海'};
const FARMQ=['油菜花田（休耕綠肥）','水田（插秧期）','稻田（生長期）','稻田（收割期）'];

// ================= rng / noise =================
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeNoise(R){
  const g=new Float32Array(4096);for(let k=0;k<4096;k++)g[k]=R();
  const v=(a,b)=>g[(a&63)+(b&63)*64], sm=t=>t*t*(3-2*t);
  const f=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),u=sm(x-xi),w=sm(y-yi);return lerp(lerp(v(xi,yi),v(xi+1,yi),u),lerp(v(xi,yi+1),v(xi+1,yi+1),u),w)};
  return (x,y)=>f(x,y)*.62+f(x*2.1+17.3,y*2.1+9.1)*.28+f(x*4.3+5.7,y*4.3+31.2)*.10;
}
