// ===== Starfort — i18n (çok dilli metin katmanı)
// API:  t('ui.key', [p0,p1]) / t('ui.key', {name:v})  -> "{0}" / "{name}" yer tutucuları doldurulur.
//       lang  (aktif dil kodu) · setLang('en') (kaydeder + sayfayı yeniler) · LANGS · fmtNum(n) · fmtDate(d) · tl(serbestMetin)
// Sözlükler: i18n/<kod>.json (düz anahtar->metin). Eksik anahtar -> tr.json -> anahtarın kendisi.
export const LANGS={tr:'Türkçe',en:'English',de:'Deutsch',fr:'Français',es:'Español','pt-BR':'Português (BR)',ru:'Русский',ar:'العربية',id:'Bahasa Indonesia','zh-CN':'简体中文','zh-TW':'繁體中文'};
export const RTL=new Set(['ar']);
const pick=()=>{try{const q=new URLSearchParams(location.search).get('lang');if(q&&LANGS[q])return q;const s=localStorage.getItem('sf_lang');if(s&&LANGS[s])return s}catch(e){}
 for(const l of (navigator.languages||[navigator.language||'tr'])){if(!l)continue;const L=l.replace('_','-');if(LANGS[L])return L;const b=L.split('-')[0].toLowerCase();
  if(b==='zh')return /TW|HK|MO|Hant/i.test(L)?'zh-TW':'zh-CN';if(b==='pt')return 'pt-BR';if(LANGS[b])return b}return 'tr'};
export const lang=pick();
const load=async l=>{try{const r=await fetch(`i18n/${l}.json`);return r.ok?await r.json():{}}catch(e){return {}}};
const base=await load('tr');const dict=lang==='tr'?base:await load(lang);
export function t(k,p){let s=dict[k]??base[k]??k;if(p!=null){if(Array.isArray(p))s=s.replace(/\{(\d+)\}/g,(m,i)=>p[i]??'');else s=s.replace(/\{(\w+)\}/g,(m,i)=>p[i]??m)}return s}
export const has=k=>k in dict||k in base;
export function setLang(l){try{localStorage.setItem('sf_lang',l)}catch(e){}location.reload()}
export const locale=lang==='tr'?'tr-TR':lang;
export const fmtNum=(n,d=0)=>Number(n).toLocaleString(locale,{maximumFractionDigits:d});
export const fmtDec=n=>Number(n).toLocaleString(locale,{minimumFractionDigits:1,maximumFractionDigits:1});
export const fmtDate=(d,o={dateStyle:'medium'})=>new Intl.DateTimeFormat(locale,o).format(d);
// serbest Türkçe metni (logic.js hata/olay mesajları) sözlükten çevir: tam eşleşme ya da sayılı kalıp
const rev=new Map(),pats=[];for(const k in base){const v=base[k];if(!k.startsWith('e.')&&!k.startsWith('html.'))continue;if(/\{\d+\}/.test(v)){const re=new RegExp('^'+v.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{\d+\}/g,'(.+?)')+'$');pats.push([re,k])}else rev.set(v,k)}
export function tl(s){if(typeof s!=='string'||lang==='tr')return s;const k=rev.get(s.trim());if(k)return t(k);for(const[re,k]of pats){const m=s.match(re);if(m)return t(k,m.slice(1))}return s}
// statik HTML metinleri
export function applyDom(root=document.body){document.documentElement.lang=lang;document.documentElement.dir=RTL.has(lang)?'rtl':'ltr';document.documentElement.classList.add('L-'+lang);
 if(lang==='tr')return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const ns=[];while(w.nextNode())ns.push(w.currentNode);
 for(const n of ns){const v=n.nodeValue,tr=v.trim();if(!tr)continue;const k=rev.get(tr);if(k)n.nodeValue=v.replace(tr,t(k))}}
// logic.js verilerini (bina, kaptan, görev adları…) yerinde çevir: anahtar 'd.<EXPORT>.<yol>'
export function localizeData(L){if(lang==='tr')return;const go=(o,p)=>{if(!o||typeof o!=='object')return;for(const k in o){const v=o[k],kk=p+'.'+k;if(typeof v==='string'){if(kk in dict)o[k]=dict[kk]}else if(typeof v==='object')go(v,kk)}};
 for(const k in L){const v=L[k];if(v&&typeof v==='object'&&!Object.isFrozen(v))go(v,'d.'+k)}}
