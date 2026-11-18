// 風場大亨 — 管理介面：設定開放哪些關卡
// 在 claude.ai 發布的頁面上：設定存在共用資料庫 config/levels，所有瀏覽者都套用，只有擁有者／編輯者能修改。
// 其他地方（本機檔案、GitHub Pages）：設定只存在這個瀏覽器，網址加上 #admin 才會出現管理按鈕。
'use strict';
const ADMIN_KEY='windcity:admin';
const ADMIN={cfg:{levels:{}},source:'default',canEdit:false,visible:false,db:null,inClaude:false,err:''};
const LEVEL_STATES=[['open',$t`開放`],['seq',$t`過關後開放`],['closed',$t`關閉`]];
function adminDefaults(){return {levels:Object.fromEntries(LEVELS.map(l=>[l.id,l.no<=1?'open':'seq']))}}
function adminMerge(data){
  const d=adminDefaults();
  if(data&&data.levels)for(const k in d.levels){const v=data.levels[k];if(v==='open'||v==='seq'||v==='closed')d.levels[k]=v}
  ADMIN.cfg=d;
}
function adminChanged(){if(levelsOpen())showLevels()}
function adminLocal(){
  ADMIN.inClaude=false;ADMIN.source='local';ADMIN.canEdit=true;
  try{adminMerge(JSON.parse(localStorage.getItem(ADMIN_KEY)||'null'))}catch(e){adminMerge(null)}
  ADMIN.visible=location.hash==='#admin';
}
async function adminClaude(){
  ADMIN.inClaude=true;
  const [db,user]=await Promise.all([window.claude.use('db').catch(()=>null),window.claude.use('user').catch(()=>null)]);
  if(user){try{ADMIN.canEdit=!!(await user.canEdit())}catch(e){ADMIN.canEdit=false}}
  ADMIN.visible=ADMIN.canEdit;
  if(db){
    ADMIN.db=db;
    db.doc('config/levels').onSnapshot(snap=>{
      if(snap.exists){adminMerge(snap.data());ADMIN.source='shared'}
      else{adminMerge(null);ADMIN.source='default'}
      adminChanged();
    },e=>{ADMIN.err=e&&e.code||'error'});
  }
  adminChanged();
}
function adminInit(){
  adminMerge(null);
  if(window.claude&&typeof window.claude.use==='function'){adminClaude();return}
  adminLocal();
  window.addEventListener('hashchange',()=>{if(!ADMIN.inClaude){ADMIN.visible=location.hash==='#admin';adminChanged()}});
  // claude.ai 的執行環境可能稍晚才注入
  setTimeout(()=>{if(!ADMIN.inClaude&&window.claude&&typeof window.claude.use==='function')adminClaude()},1200);
}
async function adminSave(levels){
  const data={levels,updatedAt:Date.now()};
  if(ADMIN.inClaude){
    if(!ADMIN.db)throw new Error($t`這個檢視沒有資料庫權限`);
    await ADMIN.db.doc('config/levels').set(data);
  }else{localStorage.setItem(ADMIN_KEY,JSON.stringify(data));adminMerge(data)}
}
function showAdmin(){
  const draft=Object.assign({},ADMIN.cfg.levels);
  const render=()=>{
    const html=`<div class="evhead"><div class="evicon tone-neutral">${ic('i-wrench')}</div><div><div class="sub">${$t`管理員`}</div><h2>${$t`關卡開放設定`}</h2></div><button class="xbtn" id="mX" style="align-self:flex-start">${ic('i-x')}</button></div>
    <p>${ADMIN.inClaude?`${$t`這裡的設定存在共用資料庫，`}<b>${$t`所有開啟這個頁面的人`}</b>${$t`都會立即套用；只有你（擁有者或編輯者）能修改。`}`:`${$t`這裡的設定只存在`}<b>${$t`這個瀏覽器`}</b>${$t`。發布到 claude.ai 後，設定才會對所有人生效。`}`}</p>
    <p style="font-size:12.5px">${$t`「過關後開放」：上一關拿到至少一顆星（評等 C 以上）才解鎖。`}</p>
    <div class="adm-quick"><button class="btn sm" id="aAll">${$t`全部開放`}</button><button class="btn sm" id="aSeq">${$t`依序解鎖（預設）`}</button><button class="btn sm" id="aOnly">${$t`只開第 1 關與測試關卡`}</button></div>
    <div class="adm-list">${LEVELS.map(L=>`<div class="adm-row"><div class="adm-name"><b>${L.sandbox?$t`測試關卡`:$t`第 ${L.no} 關・${L.name}`}</b><span>${L.tag}</span></div>
      <div class="adm-seg" role="group" aria-label="${L.name}">${LEVEL_STATES.filter(([v])=>!(L.no<=1&&v==='seq')).map(([v,t])=>`<button data-l="${L.id}" data-v="${v}" aria-pressed="${draft[L.id]===v}">${t}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="mfoot"><span class="adm-src">${ADMIN.inClaude?$t`共用設定`:$t`本機設定`}</span><button class="btn" id="aCancel">${$t`取消`}</button><button class="btn pri" id="aSave">${$t`儲存`}</button></div>`;
    const c=openModal(html,'wide',true);
    $('#mX').onclick=$('#aCancel').onclick=closeModal;
    for(const b of c.querySelectorAll('[data-l]'))b.onclick=()=>{draft[b.dataset.l]=b.dataset.v;render()};
    $('#aAll').onclick=()=>{LEVELS.forEach(l=>draft[l.id]='open');render()};
    $('#aSeq').onclick=()=>{Object.assign(draft,adminDefaults().levels);render()};
    $('#aOnly').onclick=()=>{LEVELS.forEach(l=>draft[l.id]=l.no<=1?'open':'closed');render()};
    $('#aSave').onclick=async()=>{
      const b=$('#aSave');b.disabled=true;b.textContent=$t`儲存中…`;
      try{await adminSave(Object.assign({},draft));closeModal();toast(ADMIN.inClaude?$t`已儲存，所有人立即套用`:$t`已儲存在這個瀏覽器`,'good');if(levelsOpen())showLevels()}
      catch(e){b.disabled=false;b.textContent=$t`儲存`;toast(e&&e.code==='not_writer'||e&&e.code==='not_granted'?$t`你沒有修改這個頁面的權限`:$t`儲存失敗：${e&&(e.message||e.code)||$t`未知錯誤`}`,'bad')}
    };
  };
  render();
}
