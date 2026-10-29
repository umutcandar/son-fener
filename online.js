// ===== Son Fener — çevrimiçi katman (Supabase): hesap, bulut kayıt, klan, sohbet (dünya/bölge/klan + çeviri), baskın, arena, düello, Sis Cephesi, sıralama.
// Yalnızca herkese açık (publishable) anahtar kullanılır; tüm hassas işlemler sunucudaki RPC'lerde doğrulanır.
import {t,lang,locale} from './i18n.js';
const SB_URL='https://ftbbzqzgafmallrfimnt.supabase.co',SB_KEY='sb_publishable_Z46YoAdDJSnL3RYmX61vBg_XUbiAfuZ';
// Panelde Anonymous Sign-ins açılınca true yapın; kapalıyken 'guest' edge fonksiyonu kullanılır
const ANON=false;
const T=(k,p)=>t('o.'+k,p);
let G,sb,uid=null,prof=null,clan=null,arena=null,region=null,war=null,online=false,rev=+localStorage.getItem('sf_rev')||null,lastBoss=null,chTab='tr',pvpTab='raid',boardTab='power';
const msgs={tr:[],reg:[],clan:[]};let muted=new Set();const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>G.fmt?G.fmt(n):String(n);const toast=t=>G.toast(t);
const HERO_IDS=['kaan','mei','tunc','deniz','nene','ela','ali'];
const av=(id,s=34)=>`<img src="img/cap_${HERO_IDS.includes(id)?id:'ali'}.webp" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;border:2px solid #ffd27a;flex:none" alt="">`;
// sunucu hata mesajları Türkçe gelir -> sözlükten çevrilir (o.err.*), yoksa olduğu gibi
const SERR={};const srvErr=m=>{const k=SERR[m];return k?T(k):m};
const err=e=>{const m=((e&&(e.message||e.msg))||String(e)).replace(/^.*?:\s*/,'');toast('⚠️ '+srvErr(m).slice(0,90));G.SFX?.err?.()};
const wk=()=>String(G.L.weekId(Date.now()));
const ROLE={lider:'role_leader','yardımcı':'role_officer','üye':'role_member'};const role=r=>T(ROLE[r]||'role_member');
const TIER_K={Bronz:'tier_bronze',Gümüş:'tier_silver',Altın:'tier_gold',Elmas:'tier_diamond',Efsane:'tier_legend'};const tierN=x=>T(TIER_K[x]||'tier_bronze');
const hm=d=>new Date(d).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'});
// dil algılama (mesaja etiket) — çeviri sunucuda otomatik algılanır
export function detectLang(t){if(/[\u3400-\u9fff\uf900-\ufaff]/.test(t))return /[們這個來時說對發會麼與廣]/.test(t)?'zh-TW':'zh';if(/[\u0600-\u06ff]/.test(t))return 'ar';if(/[\u0400-\u04ff]/.test(t))return 'ru';if(/[çğıöşüÇĞİÖŞÜ]/.test(t)||/\b(ve|bir|bu|ne|nasıl|selam|merhaba|klan)\b/i.test(t))return 'tr';if(/^[\x00-\x7f]+$/.test(t))return 'en';return 'other'}
const sameLang=(a,b)=>a&&a!=='other'&&a.slice(0,2)===b.slice(0,2)&&!(a.startsWith('zh')&&a!==b&&!(a==='zh'&&b==='zh-CN'));
export const nickOK=n=>/^[\p{L}\p{N}_ ]{3,16}$/u.test(n.trim());

async function rpc(fn,args){const{data,error}=await sb.rpc(fn,args||{});if(error)throw error;return data}
export async function start(g){G=g;window.__online={bossHtml,push:()=>push(),claim:()=>claim(),get on(){return online},get uid(){return uid},detectLang,nickOK,open:{clan:openClan,chat:openChat,pvp:openPvp,profile:openProfile,war:()=>openPvp('war')}};
 initErr();addButtons();if(!window.supabase){setStatus();return}
 sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,storageKey:'sf_auth',autoRefreshToken:true}});
 try{await signIn();await afterLogin()}catch(e){console.warn('offline:',e?.message||e);online=false;setStatus()}
 addEventListener('online',()=>{if(!online)signIn().then(afterLogin).catch(()=>{})})}
async function signIn(){let{data:{session}}=await sb.auth.getSession();if(session){uid=session.user.id;return}
 if(ANON){const a=await sb.auth.signInAnonymously().catch(e=>({error:e}));if(!a.error&&a.data?.user){uid=a.data.user.id;return}}
 let cred=JSON.parse(localStorage.getItem('sf_guest')||'null');
 if(!cred){const r=await fetch(SB_URL+'/functions/v1/guest',{method:'POST',headers:{apikey:SB_KEY,'content-type':'application/json'}});if(!r.ok)throw new Error('guest');cred=await r.json();localStorage.setItem('sf_guest',JSON.stringify(cred))}
 const{data,error}=await sb.auth.signInWithPassword(cred);if(error)throw error;uid=data.user.id}
async function afterLogin(){prof=await rpc('ensure_profile');online=true;
 const{data:sv}=await sb.from('saves').select('data,rev,updated_at').eq('user_id',uid).maybeSingle();const S=G.S;
 if(sv&&sv.data&&(sv.data.saved||0)>(S.saved||0)+10000&&!sessionStorage.getItem('sf_adopted')){adopt(sv);return}
 if(sv)rev=sv.rev;await push();
 const{data:mu}=await sb.from('mutes').select('muted');muted=new Set((mu||[]).map(x=>x.muted));
 region=await rpc('my_region').catch(()=>null);
 await refreshClan();await claim();subscribe();setStatus();
 setInterval(()=>{push();claim()},20000);setInterval(bossWatch,2000);lastBoss={w:G.S.boss.w,d:G.S.boss.dmg};
 addEventListener('visibilitychange',()=>document.hidden&&push())}
function adopt(sv){toast(T('cloud_loading'));sessionStorage.setItem('sf_adopted','1');window.__noSave=1;localStorage.setItem('sonfener1',JSON.stringify(sv.data));localStorage.setItem('sf_rev',sv.rev);setTimeout(()=>location.reload(),300)}
let pushing=false;
async function push(){if(!online||pushing)return;pushing=true;try{G.save();const S=G.S;let r=await rpc('save_game',{p_data:S,p_rev:rev});
  if(r.conflict){if((r.data?.saved||0)>(S.saved||0)){adopt(r);return}rev=r.rev;r=await rpc('save_game',{p_data:S,p_rev:rev})}
  if(r.ok){rev=r.rev;localStorage.setItem('sf_rev',rev);if(r.data){const d=r.data;Object.assign(S.res,d.res);S.gems=d.gems;Object.assign(S.troops,d.troops);G.ui();toast(T('save_fixed'))}if(prof)prof.power=r.power}}
 catch(e){console.warn('save',e.message)}finally{pushing=false}}
// sunucudan gelen değişiklikler (ganimet / kayıp / yardım / sezon ödülü / cephe ödülü)
async function claim(){if(!online)return;let ev;try{ev=await rpc('claim_events')}catch(e){return}if(!ev?.length)return;const S=G.S;
 for(const e of ev){const d=e.delta||{};for(const[k,v]of Object.entries(d.res||{})){if(k==='gems')S.gems=Math.max(0,S.gems+v);else if(k in S.res)S.res[k]=Math.max(0,S.res[k]+v)}
  for(const[k,v]of Object.entries(d.troops||{}))if(k in S.troops)S.troops[k]=Math.max(0,S.troops[k]+v);
  if(d.help_sec)helpApply(S,d.help_sec*1000),toast(T('helped_by',[esc(d.from||T('clan')),d.help_sec]));
  if(e.kind==='raided')toast(T('you_were_raided'));if(e.kind==='season')toast(T('season_reward',[tierN(d.tier),d.res.gems]));
  if(e.kind==='front')toast(T(d.tie?'war_rw_tie':d.win?'war_rw_win':'war_rw_lose',[d.res.gems]))}
 G.ui();G.save();push()}
function helpApply(S,ms){const ts=[S.train,S.research,S.fener?.end?S.fener:null];for(const g of Object.values(S.isl||{}))for(const b of Object.values(g?.g||{}))if(b.end)ts.push(b);for(const b of Object.values(S.g))if(b.end)ts.push(b);
 const x=ts.filter(x=>x&&x.end>Date.now()).sort((a,b)=>a.end-b.end)[0];if(x)x.end-=ms}
function subscribe(){sb.channel('sf-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'events',filter:'user_id=eq.'+uid},()=>claim())
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>onMsg(p.new))
 .on('postgres_changes',{event:'*',schema:'public',table:'help_requests'},()=>{if(sheetIs('clan'))refreshClan().then(rerender)}).subscribe()}
function bossWatch(){const b=G.S.boss;if(!lastBoss||b.w!==lastBoss.w){lastBoss={w:b.w,d:b.dmg};return}const dd=b.dmg-lastBoss.d;if(dd>0){lastBoss.d=b.dmg;rpc('boss_hit',{p_dmg:Math.round(dd),p_wk:wk()}).then(()=>refreshClan()).catch(e=>console.warn(e.message))}}
async function refreshClan(){if(!online)return;try{clan=await rpc('clan_info')}catch(e){clan=null}if(clan)await loadHelps().catch(()=>{})}
// ---------- arayüz yardımcıları ----------
let cur='';const sheetIs=n=>cur===n&&$('sheet').classList.contains('on');const rerender=()=>G.renderSheet?.();
function open(name,fn){cur=name;G.sheet(fn)}
function addButtons(){const row=$('bClan')?.parentElement;if(row&&!$('bPvp')){const b=document.createElement('div');b.className='pill';b.id='bPvp';b.innerHTML=T('btn_war');row.insertBefore(b,$('bClan'));b.onclick=()=>openPvp()}
 if($('bClan'))$('bClan').onclick=()=>openClan();if($('bChat'))$('bChat').onclick=()=>openChat();
 $('sheet').addEventListener('click',ev=>{const b=ev.target.closest('[data-o]');if(!b)return;ev.stopPropagation();G.SFX?.tap?.();const f=OA[b.dataset.o];if(f)f(b.dataset.v,b)});
 $('sheet').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.id==='chIn')OA.send()})}
function setStatus(){const b=$('bClan');if(b)b.title=online?T('online'):T('offline')}
const offline=()=>`<div class="prev">${T('offline_msg')}</div>`;
const hdr=t=>G.hdr(t);
const tabs=(cur,list,act)=>`<div class="tabs">${list.map(([v,n])=>`<button class="btn ${cur===v?'o':'x'}" data-o="${act}" data-v="${v}">${n}</button>`).join('')}</div>`;
const inp=(id,ph,ml,val='')=>`<input id="${id}" maxlength="${ml}" placeholder="${esc(ph)}" value="${esc(val)}" style="flex:1;min-width:0;padding:10px;border-radius:10px;border:1px solid #ffffff33;background:#0006;color:#fff;font:inherit">`;
const regName=()=>{const id=region?.id||prof?.region_id||1,k='reg_'+id,v=T(k),loc=v&&v!=='o.'+k&&v!==k?v:(region?.name||'').split('·')[1]?.trim();return T('sea_n',[id])+(loc?' · '+loc:'')};
// ---------- KLAN ----------
let clanList=null,clanQ='';
async function openClan(){if(!online)return G.openClan();await refreshClan();if(!clan){clanList=await rpc('list_clans',{p_q:clanQ}).catch(()=>[])}open('clan',clanHtml)}
function clanHtml(){if(!online)return hdr(T('clan_t'))+offline();
 if(!clan){let h=hdr(T('clans_t'))+`<div class="sec">${T('clan_create')}</div><div class="card" style="flex-wrap:wrap;gap:6px">${inp('cName',T('clan_name_ph'),20)}${inp('cTag',T('clan_tag_ph'),4)}<button class="btn o" data-o="create">${T('create')}</button></div>
  <div class="sec">${T('clan_search')}</div><div class="card" style="gap:6px">${inp('cQ',T('clan_search_ph'),20,clanQ)}<button class="btn" data-o="search">${T('search')}</button></div>`;
  if(!clanList?.length)h+=`<div class="sub">${T('no_clans')}</div>`;
  for(const c of clanList||[])h+=`<div class="card"><div class="ic">${esc(c.icon)}</div><div class="mid"><div class="nm">${esc(c.name)} <span class="tag">[${esc(c.tag)}]</span></div><div class="sub">👥 ${c.members}/30 · ⚔️ ${fmt(c.power)}</div></div><button class="btn o" data-o="join" data-v="${c.id}" ${c.members>=30?'disabled':''}>${T('join')}</button></div>`;
  return h}
 const ms=clan.members||[],mine=ms.find(m=>m.id===uid),pw=ms.reduce((a,m)=>a+m.power,0),boss=clan.boss_wk===wk()?clan.boss_dmg:0;
 let h=hdr(`${esc(clan.icon)} ${esc(clan.name)} [${esc(clan.tag)}]`)+`<div class="card"><div class="mid"><div class="nm">👥 ${ms.length}/30 · ⚔️ ${T('clan_power')} ${fmt(pw)}</div><div class="sub">${T('your_role')}: <b>${role(mine?.role)}</b> · 🌊 ${esc(regName())}</div></div><button class="btn" data-o="chatClan">💬 ${T('chat')}</button></div>`;
 h+=`<div class="card war-cta" data-o="pvpTab" data-v="war" style="cursor:pointer;background:linear-gradient(135deg,#1c3550,#3a1c40);border-color:#9fd3ff"><div class="ic" style="font-size:34px">🌫️</div><div class="mid"><div class="nm">${T('war_t')}</div><div class="sub">${T('war_cta')}</div></div><button class="btn o" data-o="pvpTab" data-v="war">${T('open')}</button></div>`;
 h+=`<div class="card" style="background:linear-gradient(135deg,#3a1a5a,#0a1a30)"><img src="img/f_kraken.webp" style="width:60px"><div class="mid"><div class="nm">${T('kraken_week')}</div><div class="sub">${T('kraken_shared',[fmt(boss)])}</div></div><button class="btn o" data-o="boss">${T('attack')}</button></div>`;
 h+=`<div class="sec">${T('help')}</div><div class="card"><div class="mid"><div class="sub">${T('help_desc')}</div></div><button class="btn" data-o="ask">${T('ask_help')}</button><button class="btn o" data-o="helpAll">${T('help_all')}</button></div><div id="helpList">${helpHtml()}</div>`;
 h+=`<div class="sec">${T('members')}</div>`;for(const m of ms){const can=mine?.role==='lider'&&m.id!==uid,kick=can||(mine?.role==='yardımcı'&&m.role==='üye');
  h+=`<div class="card">${av(m.avatar)}<div class="mid"><div class="nm">${esc(m.nick)}${m.id===uid?' '+T('you_paren'):''} <span class="tag">${role(m.role)}</span></div><div class="sub">⚔️ ${fmt(m.power)} · 🦑 ${fmt(m.kraken)}</div></div>
  ${can?`<button class="btn sm" data-o="role" data-v="${m.id}:${m.role==='üye'?'yardımcı':'üye'}">${m.role==='üye'?'⬆️':'⬇️'}</button><button class="btn sm" data-o="role" data-v="${m.id}:lider">👑</button>`:''}${kick?`<button class="btn sm r" data-o="kick" data-v="${m.id}">✖</button>`:''}${m.id!==uid?`<button class="btn sm x" data-o="prof" data-v="${m.id}">👤</button>`:''}</div>`}
 return h+`<button class="btn r" data-o="leave" style="width:100%;margin-top:10px">${T('leave_clan')}</button>`}
let helps=[];function helpHtml(){return helps.length?helps.map(r=>`<div class="card"><div class="mid"><div class="nm">${esc(r.nick)}: ${esc(r.label)}</div><div class="pbar"><i style="width:${r.helps/r.max_helps*100}%"></i></div></div>${r.user_id!==uid&&!r.mine?`<button class="btn sm o" data-o="help" data-v="${r.id}">🤝</button>`:''}</div>`).join(''):`<div class="sub">${T('no_help')}</div>`}
async function loadHelps(){const{data}=await sb.from('help_requests').select('id,user_id,label,helps,max_helps,created_at').lt('helps',5).order('id',{ascending:false}).limit(20);const nm=Object.fromEntries((clan?.members||[]).map(m=>[m.id,m.nick]));
 helps=(data||[]).filter(r=>r.helps<r.max_helps).map(r=>({...r,nick:nm[r.user_id]||'?'}))}
// ---------- SOHBET: dünya / bölge / klan + dokun-çevir ----------
const chanOf=tab=>tab==='tr'?'tr':tab==='reg'?'r:'+(prof?.region_id||1):'clan:'+clan?.id;
const tabOf=c=>c==='tr'?'tr':c.startsWith('r:')?'reg':'clan';
const trs={};let showOrig=new Set();
async function loadMsgs(ch){if(ch==='clan'&&!clan)return;const{data}=await sb.from('messages').select('*').eq('channel',chanOf(ch)).order('id',{ascending:false}).limit(50);msgs[ch]=(data||[]).reverse()}
async function openChat(tab){if(tab)chTab=tab;if(!online){open('chat',()=>hdr(T('chat_t'))+offline());return}if(chTab==='clan')await refreshClan();await loadMsgs(chTab).catch(()=>{});open('chat',chatHtml);scrollChat()}
function msgHtml(m){const me=m.user_id===uid,need=!me&&!sameLang(m.lang,lang),x=trs[m.id];let tr='';
 if(x?.text&&!showOrig.has(m.id))tr=`<div class="msgt">🌐 ${esc(x.text)}</div><div class="sub"><a data-o="trOrig" data-v="${m.id}">${T('show_orig')}</a></div>`;
 else if(x==='…')tr=`<div class="sub">⏳ ${T('translating')}</div>`;
 else if(!me)tr=`<div class="sub"><a data-o="tr" data-v="${m.id}" class="trbtn">🌐 ${T(need?'translate':'translate_any')}</a>${x?.err?' · ⚠️ '+T('tr_fail'):''}</div>`;
 return `<div class="card" style="${me?'background:#ffb34722;border-color:#ffd27a':''};align-items:flex-start">${av(m.avatar,30)}<div class="mid"><div class="sub"><b data-o="prof" data-v="${m.user_id}" style="cursor:pointer">${esc(m.nick)}</b> · ${hm(m.created_at)}</div><div class="msgb" style="word-break:break-word" data-o="${me?'':'tr'}" data-v="${m.id}">${esc(m.body)}</div>${tr}</div>${me?'':`<button class="btn sm x" data-o="report" data-v="${m.id}" title="${T('report')}">🚩</button>`}</div>`}
function chatHtml(){let h=hdr(T('chat_t'))+tabs(chTab,[['tr','🌍 '+T('ch_world')],['reg','🌊 '+esc(regName())],['clan','🛡️ '+T('clan')]],'chTab');if(chTab==='clan'&&!clan)return h+`<div class="sub">${T('chat_need_clan')}</div>`;
 if(chTab==='reg')h+=`<div class="sub">${T('ch_reg_desc')}</div>`;
 h+=`<div id="chBox" style="max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:6px">`;
 for(const m of msgs[chTab])if(!muted.has(m.user_id))h+=msgHtml(m);
 if(!msgs[chTab].length)h+=`<div class="sub">${T('chat_empty')}</div>`;
 return h+`</div><div class="card" style="gap:6px;margin-top:8px">${inp('chIn',T('msg_ph'),200)}<button class="btn o" data-o="send">${T('send')}</button></div><div class="sub">${T('chat_rules')}</div>`}
function scrollChat(){setTimeout(()=>{const b=$('chBox');if(b)b.scrollTop=b.scrollHeight},30)}
function keepRender(){const v=$('chIn')?.value||'',sc=$('chBox')?.scrollTop;rerender();if($('chIn'))$('chIn').value=v;if(sc!=null&&$('chBox'))$('chBox').scrollTop=sc}
function onMsg(m){const ch=tabOf(m.channel);if(msgs[ch].some(x=>x.id===m.id))return;msgs[ch].push(m);if(msgs[ch].length>80)msgs[ch].shift();
 if(sheetIs('chat')&&chTab===ch){keepRender();scrollChat()}else if(m.user_id!==uid)$('bChat')?.classList.add('ping')}
async function translate(id){if(trs[id]?.text){showOrig.delete(id);return keepRender()}trs[id]='…';keepRender();
 try{const{data,error}=await sb.functions.invoke('translate',{body:{id:+id,to:lang}});if(error||!data?.text)throw error||new Error('tr');trs[id]={text:data.text,src:data.src}}catch(e){trs[id]={err:1}}keepRender()}
// ---------- PROFİL / DÜELLO ----------
async function openProfile(id){id=id||uid;const{data:p}=await sb.from('profiles').select('id,nick,avatar,power,stage,region_id').eq('id',id).single();const{data:a}=await sb.from('arena').select('rating').eq('user_id',id).maybeSingle();
 const mine=id===uid;const r=a?.rating??1000;
 open('prof',()=>{let h=hdr('👤 '+esc(p.nick))+`<div class="card">${av(p.avatar,64)}<div class="mid"><div class="nm">${esc(p.nick)}</div><div class="sub">⚔️ ${T('power')} ${fmt(p.power)} · 🗺️ ${T('n_islands',[p.stage-1])} · 🏟️ ${r} (${tierN(tier(r))}) · 🌊 ${T('sea_n',[p.region_id||1])}</div></div></div>`;
  if(mine){h+=`<div class="sec">${T('name_portrait')}</div><div class="card" style="gap:6px">${inp('pNick',T('nick_ph'),16,p.nick)}<button class="btn o" data-o="saveProf">${T('save')}</button></div><div style="display:flex;gap:6px;flex-wrap:wrap">${HERO_IDS.map(x=>`<span data-o="pAv" data-v="${x}" style="cursor:pointer;opacity:${x===(window.__pav||p.avatar)?1:.45}">${av(x,46)}</span>`).join('')}</div>
   <div class="sec">${T('account')}</div><div class="sub">${T('guest_desc')}</div><div class="card" style="gap:6px;flex-wrap:wrap">${inp('pMail',T('email'),80)}${inp('pPass',T('pass_ph'),64)}<button class="btn" data-o="link">${T('link')}</button></div><div class="sub">${T('google_soon')}</div>`}
  else h+=`<button class="btn o" data-o="duel" data-v="${id}" style="width:100%">${T('duel_btn')}</button><button class="btn x" data-o="mute" data-v="${id}" style="width:100%;margin-top:6px">${muted.has(id)?T('unmute'):T('mute')}</button>`;
  return h})}
const tier=r=>r>=1800?'Efsane':r>=1500?'Elmas':r>=1300?'Altın':r>=1100?'Gümüş':'Bronz';
const TIC={Bronz:'🥉',Gümüş:'🥈',Altın:'🥇',Elmas:'💎',Efsane:'👑'};
// ---------- SAVAŞ: baskın, arena, Sis Cephesi, raporlar, sıralama ----------
let targets=[],opps=[],reports=[],board=[];
async function openPvp(tab){if(tab)pvpTab=tab;if(!online){open('pvp',()=>hdr(T('war_hdr'))+offline());return}await push();
 try{if(pvpTab==='raid')targets=await rpc('find_targets');if(pvpTab==='arena'){arena=await rpc('arena_me');opps=await rpc('arena_opponents');board=await rpc('arena_board')}
  if(pvpTab==='war'){await refreshClan();war=clan?await rpc('front_status'):{phase:'noclan'};war._t=Date.now()}
  if(pvpTab==='rep'){const{data}=await sb.from('battles').select('*').or(`attacker.eq.${uid},defender.eq.${uid}`).order('id',{ascending:false}).limit(30);reports=data||[]}
  if(pvpTab==='lb')board=boardTab==='kraken'?await rpc('leaderboard',{p_kind:'kraken',p_wk:wk()}):boardTab==='clan'?await rpc('clan_board',{p_wk:wk()}):await rpc('leaderboard',{p_kind:'power'});
  prof=(await sb.from('profiles').select('*').eq('id',uid).single()).data||prof}catch(e){err(e)}
 open('pvp',pvpHtml);warTick()}
const dur=ms=>{ms=Math.max(0,ms);const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);return h?T('dur_hm',[h,m]):T('dur_ms',[m,s])};
// sunucu saatine göre geri sayım
const warLeft=()=>{if(!war?.id)return 0;const off=Date.now()-war._t,now=new Date(war.now).getTime()+off;return (war.phase==='prep'?new Date(war.starts_at):new Date(war.ends_at)).getTime()-now};
let wTimer=null;function warTick(){clearInterval(wTimer);if(pvpTab!=='war'||!war?.id||war.phase==='result')return;wTimer=setInterval(()=>{if(!sheetIs('pvp')||pvpTab!=='war')return clearInterval(wTimer);const l=warLeft();const e=$('warCd');if(e)e.textContent=dur(l);if(l<=0){clearInterval(wTimer);openPvp('war')}},1000)}
const stars=n=>'<span class="stars">'+'★'.repeat(n)+'<i>'+'★'.repeat(3-n)+'</i></span>';
function warHtml(){const w=war||{phase:'none'};const isOff=clan&&['lider','yardımcı'].includes((clan.members||[]).find(m=>m.id===uid)?.role);
 let h=`<div class="card war-hero"><div class="ic" style="font-size:40px">🌫️</div><div class="mid"><div class="nm">${T('war_t')} · 🌊 ${esc(regName())}</div><div class="sub">${T('war_rules')}</div></div></div>`;
 const steps=[['prep','⏳ '+T('ph_prep')],['battle','⚔️ '+T('ph_battle')],['result','🏆 '+T('ph_result')]];const pi=steps.findIndex(s=>s[0]===w.phase);
 h+=`<div class="wtl">${steps.map(([k,n],i)=>`<div class="wst ${i===pi?'on':i<pi?'done':''}">${n}</div>`).join('<b>›</b>')}</div>`;
 if(w.phase==='noclan')return h+`<div class="sub">${T('war_need_clan')}</div><button class="btn o" data-o="goClan" style="width:100%">${T('clan_t')}</button>`;
 if(w.phase==='none'||w.phase==='queue'){
  h+=`<div class="card"><div class="mid"><div class="nm">${w.phase==='queue'?'🔎 '+T('war_searching'):T('war_idle')}</div><div class="sub">${T('war_match_desc')}</div></div></div>`;
  if(isOff)h+=w.phase==='queue'?`<button class="btn x" data-o="fLeave" style="width:100%">${T('cancel_search')}</button>`:`<button class="btn o" data-o="fJoin" style="width:100%">⚔️ ${T('war_find')}</button>`;
  else h+=`<div class="sub">${T('war_only_officers')}</div>`;
  return h+rewardsHtml()}
 const oc=w.op_clan||{};const myN=(w.mine||[]).find(m=>m.id===uid)?.n||0;
 h+=`<div class="wscore"><div><div class="sub">${esc(clan?.icon)} ${esc(clan?.name)} [${esc(clan?.tag)}]</div><b>${w.my}★</b><div class="sub">${Math.round(w.my_dmg)}%</div></div><div class="vs">VS</div><div><div class="sub">${esc(oc.icon)} ${esc(oc.name)} [${esc(oc.tag)}]</div><b>${w.op}★</b><div class="sub">${Math.round(w.op_dmg)}%</div></div></div>`;
 if(w.phase!=='result')h+=`<div class="card"><div class="mid"><div class="nm">${w.phase==='prep'?T('battle_starts_in'):T('battle_ends_in')} <b id="warCd">${dur(warLeft())}</b></div><div class="sub">${w.phase==='prep'?T('prep_desc'):T('attacks_left',[3-myN])}</div></div><button class="btn x" data-o="pvpTab" data-v="war">🔄</button></div>`;
 else h+=`<div class="card" style="border-color:${w.won?'#3fb950':w.tie?'#ffd27a':'#ff6b6b'}"><div class="ic" style="font-size:34px">${w.won?'🏆':w.tie?'🤝':'💀'}</div><div class="mid"><div class="nm">${w.won?T('war_won'):w.tie?T('war_tie'):T('war_lost')}</div><div class="sub">${T('war_reward_sent')}</div></div></div>`+(isOff?`<button class="btn o" data-o="fJoin" style="width:100%">⚔️ ${T('war_find_next')}</button>`:'');
 h+=`<div class="sec">${T('enemy_lines')}</div>`;
 for(const f of w.foes||[])h+=`<div class="card">${av(f.avatar)}<div class="mid"><div class="nm">${esc(f.nick)}</div><div class="sub">⚔️ ${fmt(f.power)} · ${stars(f.stars)}</div></div>${w.phase==='battle'?`<button class="btn o" data-o="fAtk" data-v="${f.id}" ${myN>=3?'disabled':''}>${T('attack')}</button>`:''}</div>`;
 if(!(w.foes||[]).length)h+=`<div class="sub">—</div>`;
 h+=`<div class="sec">${T('our_lines')}</div>`;
 for(const m of w.mine||[])h+=`<div class="card ${m.id===uid?'me':''}">${av(m.avatar,28)}<div class="mid"><div class="nm">${esc(m.nick)}</div><div class="sub">${m.ok?T('attacks_used',[m.n]):T('joined_late')}</div></div><b>${'⚔️'.repeat(m.n)}${'·'.repeat(Math.max(0,3-m.n))}</b></div>`;
 return h+rewardsHtml()}
const rewardsHtml=()=>`<div class="sec">${T('rewards')}</div><div class="sub">🏆 ${T('rw_win')}: 💎150 🪵2500 💠300 · 🤝 ${T('rw_tie')}: 💎80 · 💀 ${T('rw_lose')}: 💎40 — ${T('rw_note')}</div>`;
function pvpHtml(){let h=hdr(T('war_hdr'))+tabs(pvpTab,[['raid','🏴‍☠️ '+T('t_raid')],['arena','🏟️ '+T('t_arena')],['war','🌫️ '+T('t_front')],['rep','📜 '+T('t_rep')],['lb','🏆 '+T('t_lb')]],'pvpTab');
 if(pvpTab==='war')return h+warHtml();
 if(pvpTab==='raid'){const sh=new Date(prof?.shield_until)>new Date();h+=`<div class="card"><div class="mid"><div class="nm">${T('fleet_power')} ⚔️ ${fmt(prof?.power||0)}</div><div class="sub">${sh?T('shield_on'):T('shield_off')} · ${T('raid_rules')} · 🌊 ${esc(regName())}</div></div><button class="btn x" data-o="pvpTab" data-v="raid">🔄</button></div>`+(prof&&!prof.has_attacked&&Date.now()-new Date(prof.created_at)<6048e5?`<div class="card"><div class="ic">🐣</div><div class="mid"><div class="nm">${T('newbie_t')}</div><div class="sub">${T('newbie_d')}</div></div><button class="btn sm r" data-o="unprotect">${T('remove')}</button></div>`:'');
  if(!targets.length)h+=`<div class="sub">${T('no_targets')}</div>`;
  for(const x of targets)h+=`<div class="card">${av(x.avatar)}<div class="mid"><div class="nm" data-o="prof" data-v="${x.id}">${esc(x.nick)}${x.tag?` <span class="tag">[${esc(x.tag)}]</span>`:''}</div><div class="sub">⚔️ ${fmt(x.power)} · 🗺️ ${T('n_islands',[x.stage-1])}</div></div><button class="btn o" data-o="raid" data-v="${x.id}">${T('attack')}</button></div>`}
 if(pvpTab==='arena'&&arena){const ti=tier(arena.rating),own=HERO_IDS.filter(x=>G.S.heroes[x]);
  h+=`<div class="card" style="background:linear-gradient(135deg,#5a3a10,#1a1030)"><div class="ic" style="font-size:34px">${TIC[ti]}</div><div class="mid"><div class="nm">${T('arena_t')} · ${tierN(ti)} · ${arena.rating}</div><div class="sub">${T('arena_sub',[arena.season,arena.wins,arena.losses,arena.tickets])}</div><div class="sub">${T('arena_season_rw')}</div></div></div>
  <div class="sec">${T('def_lineup')}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${own.map(x=>`<span data-o="lineup" data-v="${x}" style="cursor:pointer;opacity:${(arena.lineup||[]).includes(x)?1:.4}">${av(x,46)}</span>`).join('')||`<div class="sub">${T('no_caps')}</div>`}</div><div class="sub">${T('lineup_desc')}</div><div class="sec">${T('opponents')}</div>`;
  h+=`<div class="card"><div class="ic">⚖️</div><div class="mid"><div class="nm">${T('eq_arena')} ${window.__eqArena?T('on'):T('off')}</div><div class="sub">${T('eq_desc',[arena.eq_rating??1000])}</div></div><button class="btn sm" data-o="eqArena">${window.__eqArena?T('normal'):T('equal')}</button></div>`;
  for(const o of opps)h+=`<div class="card">${av(o.avatar)}<div class="mid"><div class="nm">${esc(o.nick)}</div><div class="sub">${TIC[o.tier]} ${o.rating} · ${T('cap_power')} ${fmt(o.power)}</div></div><button class="btn o" data-o="arena" data-v="${o.id}" ${arena.tickets?'':'disabled'}>${T('fight')}</button></div>`;
  if(!opps.length)h+=`<div class="sub">${T('no_opps')}</div>`;h+=`<div class="sec">${T('arena_board')}</div><div class="board">`+board.map((r,i)=>`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,26)}<div class="mid">${esc(r.nick)}</div><b>${TIC[r.tier]} ${r.rating}</b></div>`).join('')+'</div>'}
 if(pvpTab==='rep'){if(!reports.length)h+=`<div class="sub">${T('no_battles')}</div>`;for(const b of reports){const att=b.attacker===uid,won=att?b.win:!b.win,K={raid:'🏴‍☠️ '+T('t_raid'),arena:'🏟️ '+T('t_arena'),duel:'🤺 '+T('duel'),front:'🌫️ '+T('t_front')}[b.kind]||b.kind;
  const loot=b.kind==='raid'?Object.entries(b.loot||{}).filter(([,v])=>v).map(([k,v])=>`${G.L.RIC[k]}${fmt(v)}`).join(' '):b.kind==='arena'?T('n_points',[`${b.loot.rating>0?'+':''}${att?b.loot.rating:-Math.trunc(b.loot.rating/2)}`]):b.kind==='front'?stars(b.loot.stars||0):'';
  h+=`<div class="card" style="border-color:${won?'#3fb950':'#ff6b6b'}"><div class="ic">${won?'🏆':'💀'}</div><div class="mid"><div class="nm">${K} · ${att?'→ '+esc(b.def_nick):'← '+esc(b.att_nick)}</div><div class="sub">${won?T('victory'):T('defeat')} · ${loot?(att||b.kind!=='raid'?'':T('lost')+' ')+loot+' · ':''}${new Date(b.created_at).toLocaleString(locale,{dateStyle:'short',timeStyle:'short'})}</div></div><button class="btn sm" data-o="replay" data-v="${b.id}">▶️</button>${!att&&b.kind==='raid'&&!b.revenged&&Date.now()-new Date(b.created_at)<864e5?`<button class="btn sm r" data-o="revenge" data-v="${b.id}">${T('revenge')}</button>`:''}</div>`}}
 if(pvpTab==='lb'){h+=tabs(boardTab,[['power','⚔️ '+T('power')],['kraken','🦑 Kraken'],['clan','🛡️ '+T('clan_kraken')]],'boardTab')+'<div class="board">';
  board.forEach((r,i)=>h+=boardTab==='clan'?`<div class="card ${clan&&r.tag===clan.tag?'me':''}"><b style="width:26px">#${i+1}</b><div class="ic">${esc(r.icon)}</div><div class="mid">${esc(r.name)} [${esc(r.tag)}]</div><b>${fmt(r.dmg)}</b></div>`:`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,26)}<div class="mid" data-o="prof" data-v="${r.id}">${esc(r.nick)}${r.tag?` <span class="tag">[${esc(r.tag)}]</span>`:''}</div><b>${fmt(r.val)}</b></div>`);
  h+='</div>'+(board.length?'':`<div class="sub">${T('no_records')}</div>`)}
 return h}
// Kraken sheet'inde gerçek sıralama (bot yerine)
let bossCache=null;function bossHtml(){if(!online)return null;if(!bossCache||Date.now()-bossCache.t>15000){bossCache={t:Date.now(),rows:bossCache?.rows||[]};rpc('leaderboard',{p_kind:'kraken',p_wk:wk()}).then(r=>{bossCache.rows=r||[];if(sheetIs('')||$('sheet').classList.contains('on'))G.renderSheet?.()}).catch(()=>{})}
 const rows=bossCache.rows;return `<div class="sec">${T('real_board')}</div><div class="board">${rows.map((r,i)=>`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,24)}<div class="mid">${r.id===uid?'⭐ '+T('you'):esc(r.nick)}${r.tag?` <span class="tag">[${esc(r.tag)}]</span>`:''}</div><b>${fmt(r.val)}</b></div>`).join('')||`<div class="sub">${T('kraken_first')}</div>`}</div>`}
// ---------- savaş tekrarı ----------
function replay(r,title){G.closeSheet?.();const bt=$('battle'),aH=r.a||null,dH=r.d||null;const side=(nick,avt,pw,list,id)=>`<div class="side" style="text-align:center">${list?`<div style="display:flex;gap:6px;justify-content:center">${list.map(x=>av(x.id,58)).join('')}</div>`:av(avt,80)}<div class="hl">${esc(nick)} · ⚔️ ${fmt(pw)}</div><div class="pbar" style="width:70%;margin:6px auto"><i id="${id}" style="width:100%;transition:width .4s"></i></div></div>`;
 bt.innerHTML=`<div class="top">${title}</div>${side(r.def_nick,r.def_avatar,r.def_power,dH,'hpE')}<div class="waves" id="rLog" style="text-align:center;font-weight:900;font-size:22px;min-height:40px"></div>${side(T('you'),prof?.avatar,r.att_power,aH,'hpA')}`;
 bt.classList.add('on');G.SFX?.boss?.();let i=0;const R=r.rounds||[];const iv=setInterval(()=>{const x=R[i++];if(!x){clearInterval(iv);setTimeout(()=>finish(r),500);return}
  $('hpE').style.width=(x.eHp/r.eMax*100)+'%';$('hpA').style.width=(x.hp/r.myMax*100)+'%';$('rLog').innerHTML=`<span style="color:#ffd84a">−${fmt(x.d1)}</span> &nbsp; <span style="color:#ff6b6b">−${fmt(x.d2)}</span>`;G.SFX?.hit?.()},600)}
function finish(r){const bt=$('battle');const loot=Object.entries(r.loot||{}).filter(([k,v])=>v&&G.L.RIC[k]).map(([k,v])=>`${G.L.RIC[k]}${fmt(v)}`).join(' ');
 const lost=Object.entries(r.att_lost||{}).filter(([,v])=>v).map(([k,v])=>`${G.L.TROOPS[k].ic}${-v}`).join(' ');
 const body=r.kind==='arena'?`${T('arena_pts')}: <b>${r.rating_change>0?'+':''}${r.rating_change}</b>`:r.kind==='duel'?T('duel_noloot'):r.kind==='front'?`<div style="font-size:34px">${stars(r.stars)}</div>${T('front_result',[r.dmg])}`:`${loot?T('loot')+': '+loot+'<br>':''}${lost?T('lost')+': '+lost:''}`;
 G.modal(`<div style="font-size:54px">${r.win?'🏆':'💀'}</div><h2>${r.win?T('victory_x'):T('defeat')}</h2><p>${body}</p>`,[[T('ok'),'o',()=>{bt.classList.remove('on');claim();if(r.kind==='front')openPvp('war')}]])}
// ---------- eylemler ----------
const val=id=>($(id)?.value||'').trim();
const OA={
 pvpTab:v=>openPvp(v),boardTab:v=>{boardTab=v;openPvp('lb')},chTab:v=>openChat(v),goClan:()=>openClan(),
 create:async()=>{try{await rpc('create_clan',{p_name:val('cName'),p_tag:val('cTag'),p_icon:'🛡️'});toast(T('clan_created'));openClan()}catch(e){err(e)}},
 search:async()=>{clanQ=val('cQ');openClan()},
 join:async v=>{try{await rpc('join_clan',{p_clan:v});toast(T('joined'));openClan()}catch(e){err(e)}},
 leave:()=>G.modal(`<h2>${T('leave_q')}</h2>`,[[T('cancel'),'x'],[T('leave'),'r',async()=>{try{await rpc('leave_clan');clan=null;openClan()}catch(e){err(e)}}]]),
 role:async v=>{const[id,r]=v.split(':');try{await rpc('set_role',{p_user:id,p_role:r});openClan()}catch(e){err(e)}},
 kick:async v=>{try{await rpc('kick_member',{p_user:v});openClan()}catch(e){err(e)}},
 // yardım etiketi sunucuda saklanır; herkes kendi dilinde okusun diye anahtar değil kısa emoji+metin gönderilir
 ask:async()=>{const S=G.S;const x=S.train?T('h_train'):S.research?T('h_research'):S.fener?.end?T('h_fener'):Object.values(S.g).some(b=>b.end)?T('h_build'):null;if(!x)return toast(T('no_timer'));try{await rpc('ask_help',{p_label:x});toast(T('help_asked'));openClan()}catch(e){err(e)}},
 help:async v=>{try{await rpc('give_help',{p_req:+v});toast(T('you_helped'));openClan()}catch(e){err(e)}},
 helpAll:async()=>{try{const n=await rpc('help_all');toast(T('n_helps',[n]));openClan()}catch(e){err(e)}},
 boss:()=>{G.closeSheet?.();G.openBoss()},chatClan:()=>openChat('clan'),
 send:async()=>{const x=val('chIn');if(!x)return;if(x.length>200)return toast(T('max200'));
  try{await rpc('send_chat',{p_channel:chanOf(chTab),p_body:x,p_lang:detectLang(x)});$('chIn').value='';await loadMsgs(chTab);keepRender();scrollChat()}catch(e){err(e)}},
 tr:v=>v&&translate(v),trOrig:v=>{showOrig.add(+v);keepRender()},
 report:async v=>{try{await rpc('report_msg',{p_msg:+v});toast(T('reported'))}catch(e){err(e)}},
 prof:v=>openProfile(v),
 mute:async v=>{try{if(muted.has(v)){await sb.from('mutes').delete().eq('user_id',uid).eq('muted',v);muted.delete(v)}else{const{error}=await sb.from('mutes').insert({user_id:uid,muted:v});if(error)throw error;muted.add(v)}toast(muted.has(v)?T('muted'):T('unmuted'));openProfile(v)}catch(e){err(e)}},
 pAv:v=>{window.__pav=v;rerender()},
 saveProf:async()=>{const n=val('pNick');if(!nickOK(n))return toast(T('nick_bad'));try{await rpc('set_profile',{p_nick:n,p_avatar:window.__pav||prof.avatar});prof=await rpc('ensure_profile');toast(T('saved'));openProfile()}catch(e){err(e)}},
 link:async()=>{const em=val('pMail'),pw=val('pPass');if(!/^\S+@\S+\.\S+$/.test(em)||pw.length<8)return toast(T('email_bad'));
  const{error}=await sb.auth.updateUser({email:em,password:pw});if(error)return err(error);toast(T('email_sent'))},
 duel:async v=>{try{const r=await rpc('duel',{p_target:v});replay(r,'🤺 '+T('duel_t'))}catch(e){err(e)}},
 unprotect:async()=>{try{await rpc('drop_protection');prof.has_attacked=true;toast(T('prot_removed'))}catch(e){err(e)}},
 eqArena:()=>{window.__eqArena=!window.__eqArena;openPvp()},
 raid:async v=>{try{await push();const r=await rpc('raid',{p_target:v});prof&&(prof.has_attacked=true);r.kind='raid';replay(r,'🏴‍☠️ '+T('t_raid'))}catch(e){err(e)}},
 revenge:async v=>{try{await push();const r=await rpc('revenge',{p_battle:+v});r.kind='raid';replay(r,'🔥 '+T('revenge_t'))}catch(e){err(e)}},
 arena:async v=>{try{await push();const r=await rpc('arena_fight',{p_target:v,p_equal:!!window.__eqArena});arena=r.arena;replay(r,'🏟️ '+T('arena_t'))}catch(e){err(e)}},
 fJoin:async()=>{try{war=await rpc('front_join');war._t=Date.now();toast(war.phase==='queue'?T('war_queued'):T('war_matched'));openPvp('war')}catch(e){err(e)}},
 fLeave:async()=>{try{await rpc('front_leave_queue');openPvp('war')}catch(e){err(e)}},
 fAtk:async v=>{try{await push();const r=await rpc('front_attack',{p_target:v});war=r.status;war._t=Date.now();replay(r,'🌫️ '+T('war_t'))}catch(e){err(e)}},
 lineup:async v=>{let l=[...(arena.lineup||[])];l=l.includes(v)?l.filter(x=>x!==v):[...l,v].slice(-3);try{await rpc('arena_set_lineup',{p:l});arena.lineup=l;rerender()}catch(e){err(e)}},
 replay:v=>{const b=reports.find(x=>x.id==v);if(!b)return;const att=b.attacker===uid;
  const r={kind:b.kind,win:att?b.win:!b.win,rounds:att?b.rounds:b.rounds.map(x=>({d1:x.d2,d2:x.d1,hp:x.eHp,eHp:x.hp})),def_nick:att?b.def_nick:b.att_nick,att_power:att?b.att_power:b.def_power,def_power:att?b.def_power:b.att_power,
   loot:b.kind==='raid'?b.loot:null,att_lost:att?b.att_lost:b.def_lost,rating_change:b.kind==='arena'?(att?b.loot.rating:-Math.trunc(b.loot.rating/2)):0,a:b.kind==='arena'||b.kind==='duel'?(att?b.loot.a:b.loot.d):null,d:b.kind==='arena'||b.kind==='duel'?(att?b.loot.d:b.loot.a):null,stars:b.loot?.stars||0,dmg:b.loot?.dmg||0};
  const mx=a=>Math.max(1,...(b.rounds||[]).map(x=>x[a]),0);r.myMax=att?(b.rounds[0]?.hp+b.rounds[0]?.d2||mx('hp')):(b.rounds[0]?.eHp+b.rounds[0]?.d1||1);r.eMax=att?(b.rounds[0]?.eHp+b.rounds[0]?.d1||1):(b.rounds[0]?.hp+b.rounds[0]?.d2||1);
  replay(r,'▶️ '+T('replay_t'))},
};
// sunucu (Türkçe) hata metinleri -> anahtar
function initErr(){Object.assign(SERR,{'Önce bir klana katıl':'err.need_clan','Sadece lider/yardımcı savaşa kaydolabilir':'err.officer','Klanın zaten bir savaşta':'err.in_war','Savaş henüz başlamadı':'err.not_started','Savaş bitti':'err.war_over',
 'Savaş başladıktan sonra katıldın':'err.late','Hedef rakip klanda değil':'err.not_foe','3 saldırı hakkın bitti':'err.no_attacks','Biraz bekle':'err.wait','Kayıt yok':'err.no_save','Filon boş — önce tayfa eğit':'err.empty_fleet',
 'Kendine saldıramazsın':'err.self','Filo hâlâ dönüyor, biraz bekle':'err.fleet_back','Bugünkü baskın hakkın bitti':'err.raid_limit','Hedef kalkan altında':'err.shield','Yeni kaptan koruması (7 gün)':'err.newbie','Başka bölgede':'err.region',
 'Klan arkadaşına saldıramazsın':'err.clanmate','Bugünkü arena biletin bitti':'err.tickets','Kaptanın yok':'err.no_caps','Sohbetten geçici olarak susturuldun':'err.chat_muted','Mesaj 1-200 karakter olmalı':'err.msg_len','Çok hızlı yazıyorsun':'err.too_fast',
 'Dakikada en fazla 12 mesaj':'err.per_min','Kanal yok':'err.channel','Kendinle savaşamazsın':'err.self'})}
