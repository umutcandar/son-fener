// Flags user-visible string literals / template text in game.js, online.js, logic.js that are not
// routed through i18n (tx/t/T/tl or a Turkish source value in i18n/tr.json, which tl()/localizeData map).
import * as acorn from './vendor/acorn.mjs';import * as walk from './vendor/acorn-walk.mjs';import fs from 'fs';import path from 'path';
const R=path.dirname(path.dirname(new URL(import.meta.url).pathname));
const TR=/[çğıöşüÇĞİÖŞÜ]/, W=/[A-Za-zçğıöşüÇĞİÖŞÜ]{2,}/g;
// proper nouns / brand / acronyms that are intentionally identical in every language
const ALLOW=new Set(['VIP','👑 VIP','Premium 👑','BOT','· MAX','MAX','🦑 Kraken','Kraken','Premium ₺119,99','] BOT 👥']);
const SKIPF=new Set(['tx','t','T','tl','querySelector','querySelectorAll','getElementById','$','addEventListener','setAttribute','getItem','setItem','removeItem','add','remove','toggle','contains','createElement','rpc','rpcS','from','select','eq','on','channel','postMessage','fetch','matchMedia','log','warn','error']);
const tr=JSON.parse(fs.readFileSync(R+'/i18n/tr.json','utf8'));const vals=new Set(),frags=new Set();
for(const k in tr){const v=String(tr[k]).replace(/\s+/g,' ').trim();vals.add(v);if(/\{\d+\}/.test(v))for(const f of v.split(/\{\d+\}/))if(f.trim().length>=3)frags.add(f.trim())}
function clean(x){let t=x.replace(/<[^>]*>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();return t.replace(/^[^<>]*">/,'').replace(/<[^>]*$/,'').replace(/^"?\s*>/,'').trim()}
function human(t){if(!/[A-Za-zçğıöşüÇĞİÖŞÜ]{2}/.test(t))return false;
 if(/^[\w.\-]+:[\w.\-%]*$|https?:|\d+px|opacity|style=|system-ui/.test(t)&&!TR.test(t))return false;
 if(/#include|[a-z-]+:[^;]{0,60};|\b(vec[234]|uniform|varying|px|rgba?)\b/.test(t)&&!TR.test(t))return false;
 if(/[{};]/.test(t)&&/[=(]/.test(t))return false;
 const w=t.match(W)||[];if(TR.test(t))return true;
 if(w.length>=2&&/\b[A-Za-z][a-z]+ [a-z]{2,}\b/.test(t))return true;
 return w.some(x=>x.length>=3)&&/[\s:!?]/.test(t)&&/(^|[\s·:!?.,])[A-Za-zçğıöşü]{3,}([\s:!?.,]|$)/.test(t)}
export function scan(file){const src=fs.readFileSync(file,'utf8');const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'module',locations:true});const out=[];
 const chk=(raw,node,anc)=>{const t=clean(raw);if(!human(t)||ALLOW.has(t)||vals.has(t)||frags.has(t))return;const p=anc[anc.length-2];
  if(p?.type==='CallExpression'&&p.arguments[0]===node){const c=p.callee,n=c.type==='Identifier'?c.name:c.property?.name;if(SKIPF.has(n))return}
  if(p?.type==='Property'&&p.key===node)return;if(p&&/Import|Export/.test(p.type))return;if(p?.type==='BinaryExpression'&&/[=!]==?/.test(p.operator))return;
  out.push(`${path.basename(file)}:${node.loc.start.line}: ${t.slice(0,90)}`)};
 walk.fullAncestor(ast,(n,_s,anc)=>{if(n.type==='Literal'&&typeof n.value==='string')chk(n.value,n,anc);else if(n.type==='TemplateElement')chk(n.value.cooked??n.value.raw,anc[anc.length-2],anc.slice(0,-1))});return out}
const res=['game.js','online.js','logic.js'].flatMap(f=>scan(R+'/'+f));console.log(JSON.stringify(res));
