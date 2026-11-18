// 風場大亨 — 多語系：中文為原文，英文從 js/i18n-en.js 的字典查
// 程式裡含中文的字串都寫成 $t`…` 標籤樣板；樣板裡的 ${…} 在翻譯鍵中寫成 {}，
// 英文可用 {0}、{1}… 調整順序。查不到的字串直接顯示中文（並記在 I18N_MISS 方便補翻）。
// 切換語言會先存檔再重新載入頁面，所以載入時就決定好的資料（機型、事件、關卡）也會換成新語言。
'use strict';
const LANG_KEY='windcity:lang';
const LANGS={zh:{name:'中文',html:'zh-Hant'},en:{name:'English',html:'en'}};
let LANG=(()=>{
  try{
    const q=(location.hash.match(/lang=(en|zh)/)||[])[1]||new URLSearchParams(location.search).get('lang');
    if(LANGS[q]){localStorage.setItem(LANG_KEY,q);return q}
    const s=localStorage.getItem(LANG_KEY);if(LANGS[s])return s;
  }catch(e){}
  return 'zh';
})();
const I18N_MISS=new Set();
const EN_=typeof EN!=='undefined'?EN:{};
function $t(strs,...vals){
  if(typeof strs==='string')strs=[strs];
  const plain=()=>{let s=strs[0];for(let k=0;k<vals.length;k++)s+=String(vals[k])+strs[k+1];return s};
  if(LANG==='zh')return plain();
  const key=strs.join('{}'),e=EN_[key];
  if(e==null){I18N_MISS.add(key);return plain()}
  let k=0;return e.replace(/\{(\d*)\}/g,(m,d)=>String(d===''?vals[k++]:vals[+d]));
}
const EN_MODE=()=>LANG==='en';
// 刻意不翻譯的文字（例如語言切換按鈕本身）
function $raw(strs,...vals){let s=strs[0];for(let k=0;k<vals.length;k++)s+=String(vals[k])+strs[k+1];return s}
// 翻譯 index.html 裡寫死的文字與屬性
function i18nDom(root){
  if(LANG==='zh')return;
  document.documentElement.lang=LANGS[LANG].html;document.title=$t`風場大亨`;
  const tr=s=>{const k=s.replace(/\s+/g,' ').trim();if(!k||!/[\u3400-\u9fff]/.test(k))return null;const e=EN_[k];if(e==null){I18N_MISS.add(k);return null}return s.match(/^\s*/)[0]+e+s.match(/\s*$/)[0]};
  const w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);
  for(let n;(n=w.nextNode());){const v=tr(n.nodeValue);if(v!=null)n.nodeValue=v}
  for(const el of(root||document.body).querySelectorAll('[title],[aria-label],[placeholder]'))
    for(const a of['title','aria-label','placeholder'])if(el.hasAttribute(a)){const v=tr(el.getAttribute(a));if(v!=null)el.setAttribute(a,v)}
}
// 切換語言：存檔後重新載入
function setLang(l){
  if(!LANGS[l]||l===LANG)return;
  try{localStorage.setItem(LANG_KEY,l)}catch(e){}
  try{if(typeof save==='function')save()}catch(e){}
  // 從遊戲中切換：重新載入後直接回到同一關並打開設定
  try{const inGame=typeof S!=='undefined'&&S&&!S._backdrop&&!(typeof levelsOpen==='function'&&levelsOpen());sessionStorage.setItem('windcity:resume',inGame?'settings':'')}catch(e){}
  if(location.hash.includes('lang='))location.hash=location.hash.replace(/lang=(en|zh)/,'lang='+l);
  location.reload();
}
