// ===== Son Fener — çevrimiçi katman (Supabase): hesap, bulut kayıt, klan, sohbet (dünya/bölge/klan + çeviri), baskın, arena, düello, Sis Cephesi, sıralama.
// Yalnızca herkese açık (publishable) anahtar kullanılır; tüm hassas işlemler sunucudaki RPC'lerde doğrulanır.
import {t,lang,locale,tl} from './i18n.js';
const SB_URL='https://ftbbzqzgafmallrfimnt.supabase.co',SB_KEY='sb_publishable_Z46YoAdDJSnL3RYmX61vBg_XUbiAfuZ';
// Panelde Anonymous Sign-ins açılınca true yapın; kapalıyken 'guest' edge fonksiyonu kullanılır
const ANON=false;
const T=(k,p)=>t('o.'+k,p);
let lastDuel=null,fwData=null;let G,sb,uid=null,prof=null,clan=null,arena=null,region=null,war=null,online=false,rev=+localStorage.getItem('sf_rev')||null,lastBoss=null,chTab='tr',pvpTab='raid',boardTab='power';
const msgs={tr:[],reg:[],clan:[]};let muted=new Set();const $=id=>document.getElementById(id);try{const q=new URLSearchParams(location.search).get('ref');if(q&&/^[A-Za-z0-9]{4,12}$/.test(q))localStorage.setItem('sf_ref',q.toUpperCase())}catch(e){}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>G.fmt?G.fmt(n):String(n);const toast=t=>G.toast(t);
const HERO_IDS=['kaan','mei','tunc','deniz','nene','ela','ali','selin','lale','baris'];
const av=(id,s=34)=>`<img src="img/cap_${HERO_IDS.includes(id)?id:'ali'}.webp" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;border:2px solid #ffd27a;flex:none" alt="">`;
// sunucu hata mesajları Türkçe gelir -> sözlükten çevrilir (o.err.*), yoksa olduğu gibi
const SERR={'Sadece lider':'srv_lead','Sadece lider/subay':'srv_off','Geçersiz bölge':'srv_zone','Bölge haftada bir değişir':'srv_zweek','Vali klan bölge değiştiremez':'srv_zgov','Önce bölge seç':'srv_zfirst','Aday bu bölgede değil':'srv_zcand','Aday üst üste 3. hafta olamaz':'srv_z3','Klan yok':'srv_noclan','Elmas yetersiz':'srv_gems','Bilet yok':'srv_ticket','Bugünkü ücretsiz çağrı kullanıldı':'srv_free','Seçim hakkın yok':'srv_sel','Geçersiz çağrı':'srv_bad','Geçersiz komutan':'srv_hero','Kayıt bulunamadı':'srv_nosave'};const srvErr=m=>{const k=SERR[m];return k?T(k):tl(m)};
const err=e=>{const m=((e&&(e.message||e.msg))||String(e)).replace(/^.*?:\s*/,'');toast('⚠️ '+srvErr(m).slice(0,90));G.SFX?.err?.()};
const wk=()=>String(G.L.weekId(Date.now()));
const ROLE={lider:'role_leader','yardımcı':'role_officer','üye':'role_member'};const RIC={lider:'👑','yardımcı':'⭐','üye':'🎖️'};const role=r=>(RIC[r]||'🎖️')+' '+T(ROLE[r]||'role_member');
const TECH=[['prod','⚙️',2],['store','📦',5],['help','🤝',15]],TLV=[0,2000,6000,15000,35000,80000],tlv=p=>{let l=0;for(let i=1;i<TLV.length;i++)if(p>=TLV[i])l=i;return l};
const inc=(k,n=1)=>{try{G.L.dailyInc(G.S,k,n,Date.now());G.ui?.();G.save?.()}catch(e){}};
let gov={c:{},u:new Set()};async function govLoad(){try{const r=await rpc('gov_list');gov={c:Object.fromEntries((r.clans||[]).map(x=>[x.id,x.z])),u:new Set(r.users||[])};applyTech()}catch(e){}}
const govB=id=>gov.u.has(id)?` <span title="${T('gov_badge')}">👑</span>`:'';
function applyTech(){const t=clan?.tech||{};G.L.clanB.prod=tlv(t.prod||0)*.02+(clan?.id&&gov.c[clan.id]?.05:0);G.L.clanB.store=tlv(t.store||0)*.05;G.L.clanB.help=tlv(t.help||0)*15}
const TIER_K={Bronz:'tier_bronze',Gümüş:'tier_silver',Altın:'tier_gold',Elmas:'tier_diamond',Efsane:'tier_legend'};const tierN=x=>T(TIER_K[x]||'tier_bronze');
const hm=d=>new Date(d).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'});
// dil algılama (mesaja etiket) — çeviri sunucuda otomatik algılanır
export function detectLang(t){if(/[\u3400-\u9fff\uf900-\ufaff]/.test(t))return /[們這個來時說對發會麼與廣]/.test(t)?'zh-TW':'zh';if(/[\u0600-\u06ff]/.test(t))return 'ar';if(/[\u0400-\u04ff]/.test(t))return 'ru';if(/[çğıöşüÇĞİÖŞÜ]/.test(t)||/\b(ve|bir|bu|ne|nasıl|selam|merhaba|klan)\b/i.test(t))return 'tr';if(/^[\x00-\x7f]+$/.test(t))return 'en';return 'other'}
const sameLang=(a,b)=>a&&a!=='other'&&a.slice(0,2)===b.slice(0,2)&&!(a.startsWith('zh')&&a!==b&&!(a==='zh'&&b==='zh-CN'));
export const nickOK=n=>/^[\p{L}\p{N}_ ]{3,16}$/u.test(n.trim());

async function rpcS(fn,args){const{data,error}=await sb.rpc(fn+'_s',args||{});if(error)throw error;if(data&&typeof data==='object'&&!Array.isArray(data)&&data.err)throw{message:data.err,soft:1};return data}
async function rpc(fn,args){const{data,error}=await sb.rpc(fn,args||{});if(error)throw error;return data}
export async function start(g){G=g;G.openWorld=()=>openWorld();G.onBattleEvent=f=>{const h=(t,d)=>{if(t==='battle')(d.log||[]).forEach((e,i)=>setTimeout(()=>{try{f(e,d)}catch(x){}},i*350))};const b=e=>{try{f(e,null)}catch(x){}};const BV=window.__bev=window.__bev||[];BV.push(b);wL.add(h);return()=>{wL.delete(h);const i=BV.indexOf(b);if(i>=0)BV.splice(i,1)}};window.__online={mile:n=>online?rpc('mile_claim',{p_n:n}):Promise.reject(new Error('offline')),summon:{sync:()=>summonSync(),call:(n,pay)=>sumCall('summon',{p_n:n,p_pay:pay}),pick:id=>sumCall('summon_pick',{p_id:id})},pass:{sync:()=>passSync(),claim:(i,p)=>rpc('pass_claim',{p_i:i,p_prem:!!p}),prem:async()=>passAdopt(await rpc('pass_prem_demo'))},openMail:()=>openMail(),get mails(){return mails},pve:(k,st)=>online?rpc('pve_win',{p_kind:k,p_stage:st}):Promise.resolve(null),bossHtml,push:()=>push(),claim:()=>claim(),get on(){return online},retry:()=>online?Promise.resolve(true):signIn().then(afterLogin).then(()=>online,()=>false),get uid(){return uid},detectLang,nickOK,test:{push:()=>push(),srv:async()=>{const{data}=await sb.from('saves').select('data,rev').eq('user_id',uid).maybeSingle();return data},dm:(peer,body)=>rpcS('send_chat',{p_channel:dmCh(peer),p_body:body,p_lang:'tr'}).then(()=>'ok',e=>e.message),isAdm:()=>isAdm,reAdm:()=>rpc('is_admin').then(v=>isAdm=!!v,()=>false),mod:()=>rpcS('mod_reports').then(()=>'ok',e=>e.message),refClaim:c=>rpc('ref_claim',{p_code:c}).then(()=>'ok',e=>(err(e),'err')),refInfo:()=>rpc('ref_info'),refSync:()=>refSync(),rpc:(f,a)=>rpc(f,a).then(v=>v,e=>({err:String(e.message||e)}))},world:worldApi,city:cityApi,pay:payApi,army:{lines:lineApi,info:()=>rpc("army_info")},open:{world:openWorld,cal:openCal,craid:openCraid,zones:openZones,clanPub:openClanPub,mod:openMod,clan:openClan,chat:openChat,pvp:openPvp,profile:openProfile,war:()=>openPvp('war')}};
 initErr();addButtons();if(!window.supabase){setStatus();return}
 sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,storageKey:'sf_auth',autoRefreshToken:true}});
 try{await signIn();await afterLogin()}catch(e){console.warn('offline:',e?.message||e);online=false;setStatus()}
 addEventListener('online',()=>{if(!online)signIn().then(afterLogin).catch(()=>{})})}
async function signIn(){let{data:{session}}=await sb.auth.getSession();if(session){uid=session.user.id;return}
 if(ANON){const a=await sb.auth.signInAnonymously().catch(e=>({error:e}));if(!a.error&&a.data?.user){uid=a.data.user.id;return}}
 let cred=JSON.parse(localStorage.getItem('sf_guest')||'null');
 if(!cred){const r=await fetch(SB_URL+'/functions/v1/guest',{method:'POST',headers:{apikey:SB_KEY,'content-type':'application/json'}});if(!r.ok)throw new Error('guest');cred=await r.json();localStorage.setItem('sf_guest',JSON.stringify(cred))}
 const{data,error}=await sb.auth.signInWithPassword(cred);if(error)throw error;uid=data.user.id}
async function afterLogin(){prof=await rpc('ensure_profile');online=true;refClaimNow();summonSync();craidLoad();mailBtn();mailLoad();passSync();setInterval(mailLoad,90000);
 const{data:sv}=await sb.from('saves').select('data,rev,updated_at').eq('user_id',uid).maybeSingle();const S=G.S;
 if(sv&&sv.data&&(srvNew(sv.data)||(sv.data.saved||0)>(S.saved||0)+10000&&!sessionStorage.getItem('sf_adopted'))){adopt(sv);return}
 if(sv)rev=sv.rev;await push();
 const{data:mu}=await sb.from('mutes').select('muted');muted=new Set((mu||[]).map(x=>x.muted));
 region=await rpc('my_region').catch(()=>null);
 await monetSync();
 await refreshClan();await claim();subscribe();loadDm();rpc('is_admin').then(v=>isAdm=!!v,()=>{});setStatus();fwSide();fwPoll();setInterval(fwPoll,90000);refSync();setInterval(refSync,300000);
 setInterval(()=>{push();claim()},20000);setInterval(bossWatch,2000);setInterval(()=>{try{const S=G.S;if(!online||!S||S.tut<9||(S.st?.recruit||0)<1||S.stage<3||localStorage.sf_pvpN)return;const b=$('bPvp');if(!b)return;localStorage.sf_pvpN=1;b.classList.add('dot');b.addEventListener('click',()=>b.classList.remove('dot'),{once:true});toast('⚔️ '+T('pvp_nudge'))}catch(e){}},15000);lastBoss={w:G.S.boss.w,d:G.S.boss.dmg};
 addEventListener('visibilitychange',()=>document.hidden&&push())}
// DEMO para durumu sunucuda (monet_*); çevrimdışı alımlar kuyruktan kaydedilir, sunucu esas
let monetOk=false;
async function monetSync(){try{const S=G.S,L=G.L;let st=await rpc('monet_me');
 for(const q of [...((S.spend&&S.spend.q)||[])]){try{st=await rpc('monet_purchase',{p_price:q.p,p_item:q.i||'',p_offline:true})}catch(e){console.warn('monet q',e.message)}S.spend.q.shift()}
 const z=S.season;if(z&&z.offl&&z.offl!==st.season.last){try{st=await rpc('monet_claim_mark')}catch(e){}}
 L.applyMonet(S,st);G.save();monetOk=true}catch(e){console.warn('monet',e.message)}}
window.__monet={ok:()=>online&&monetOk,purchase:(p,i)=>rpc('monet_purchase',{p_price:p,p_item:i||'',p_offline:false}),claimMark:()=>rpc('monet_claim_mark'),me:()=>rpc('monet_me')};
const SSV=()=>+localStorage.getItem('sf_ssv')||0,srvNew=d=>SSV()>0&&(d?.saved||0)>SSV()+1;
function adopt(sv){localStorage.setItem('sf_ssv',sv.data?.saved||0);toast(T('cloud_loading'));sessionStorage.setItem('sf_adopted','1');window.__noSave=1;localStorage.setItem('sonfener1',JSON.stringify(sv.data));localStorage.setItem('sf_rev',sv.rev);setTimeout(()=>location.reload(),300)}
let pushing=false;
let pushP=null,pushAgain=false;function push(){if(!online)return Promise.resolve();if(pushing){pushAgain=true;return pushP}pushing=true;return pushP=push0()}
async function push0(){try{G.save();const S=G.S;let r=await rpc('save_game',{p_data:S,p_rev:rev});
  if(r.conflict){if(srvNew(r.data)||(r.data?.saved||0)>(S.saved||0)){adopt(r);return}rev=r.rev;r=await rpc('save_game',{p_data:S,p_rev:rev})}
  if(r.ok){rev=r.rev;localStorage.setItem('sf_rev',rev);localStorage.setItem('sf_ssv',S.saved||0);if(r.data){const d=r.data;Object.assign(S.res,d.res);S.gems=d.gems;Object.assign(S.troops,d.troops);if(d.heroes)S.heroes=d.heroes;for(const k of ['pity','pity2','selTok','ush'])if(d[k]!=null)S[k]=d[k];G.save();G.ui();toast(T('save_fixed'))}if(prof)prof.power=r.power}}
 catch(e){console.warn('save',e.message)}finally{pushing=false}if(pushAgain){pushAgain=false;pushing=true;await (pushP=push0())}}
// sunucudan gelen değişiklikler (ganimet / kayıp / yardım / sezon ödülü / cephe ödülü)
async function claim(){if(!online)return;let ev;try{ev=await rpc('claim_events')}catch(e){return}if(!ev?.length)return;const S=G.S;
 for(const e of ev){const d=e.delta||{};for(const[k,v]of Object.entries(d.res||{})){if(k==='gems')S.gems=Math.max(0,S.gems+v);else if(k in S.res)S.res[k]=Math.max(0,S.res[k]+v)}
  for(const[k,v]of Object.entries(d.troops||{}))if(k in S.troops)S.troops[k]=Math.max(0,S.troops[k]+v);
  if(d.help_sec)helpApply(S,d.help_sec*1000),toast(T('helped_by',[esc(d.from||T('clan')),d.help_sec]));
  if(e.kind==='gift')toast(T('fr_gift_got',[esc(d.from||'?')]));if(e.kind==='raided')toast(T('you_were_raided'));if(e.kind==='fw')toast(T('fw_reward_t',[d.res.gems])+(d.vali?' 👑':''));if(e.kind==='season')toast(T('season_reward',[tierN(d.tier),d.res.gems]));
  if(e.kind==='front')toast(T(d.tie?'war_rw_tie':d.win?'war_rw_win':'war_rw_lose',[d.res.gems]))}
 G.ui();G.save();push();setTimeout(mailLoad,800)}
function helpApply(S,ms){const ts=[S.train,S.research,S.fener?.end?S.fener:null];for(const g of Object.values(S.isl||{}))for(const b of Object.values(g?.g||{}))if(b.end)ts.push(b);for(const b of Object.values(S.g))if(b.end)ts.push(b);
 const x=ts.filter(x=>x&&x.end>Date.now()).sort((a,b)=>a.end-b.end)[0];if(x)x.end-=ms}
function subscribe(){sb.channel('sf-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'events',filter:'user_id=eq.'+uid},()=>claim())
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>onMsg(p.new))
 .on('postgres_changes',{event:'*',schema:'public',table:'help_requests'},()=>{if(sheetIs('clan'))refreshClan().then(rerender)}).subscribe()}
function bossWatch(){const b=G.S.boss;if(!lastBoss||b.w!==lastBoss.w){lastBoss={w:b.w,d:b.dmg};return}const dd=b.dmg-lastBoss.d;if(dd>0){lastBoss.d=b.dmg;rpc('boss_hit',{p_dmg:Math.round(dd),p_wk:wk()}).then(()=>refreshClan()).catch(e=>console.warn(e.message))}}
async function refreshClan(){if(!online)return;try{clan=await rpc('clan_info')}catch(e){clan=null}applyTech();govLoad();if(clan)await loadHelps().catch(()=>{})}
// ---------- arayüz yardımcıları ----------
let cur='';const sheetIs=n=>cur===n&&$('sheet').classList.contains('on');const rerender=()=>G.renderSheet?.();
function open(name,fn){const nw=cur!==name;cur=name;G.sheet(fn);if(nw)requestAnimationFrame(()=>{const e=document.querySelector('#sheet .body')||$('sheet');e.scrollTop=0})}
function addButtons(){const row=$('bClan')?.parentElement;if(row&&!$('bPvp')){const b=document.createElement('div');b.className='pill';b.id='bPvp';{const t=T('btn_war').trim(),m=t.match(/^([\p{Extended_Pictographic}\uFE0F\u200D]+)\s*(.+)$/u);b.title=m?m[2]:t;b.innerHTML=m?m[1]+'<span class="lb"> '+esc(m[2])+'</span>':esc(t)}row.insertBefore(b,$('bClan'));b.onclick=()=>openPvp()}
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
 let h=hdr(`${esc(clan.icon)} ${esc(clan.name)} [${esc(clan.tag)}]`)+`<div class="card"><div class="mid"><div class="nm">👥 ${ms.length}/30 · ⚔️ ${T('clan_power')} ${fmt(pw)}</div><div class="sub">${T('your_role')}: <b>${role(mine?.role)}</b> · 🔥 ${esc(regName())}</div></div><button class="btn" data-o="chatClan">💬 ${T('chat')}</button></div>`;
 h+=`<div class="card war-cta" data-o="pvpTab" data-v="war" style="cursor:pointer;background:linear-gradient(135deg,#1c3550,#3a1c40);border-color:#9fd3ff"><div class="ic" style="font-size:34px">🌫️</div><div class="mid"><div class="nm">${T('war_t')}</div><div class="sub">${T('war_cta')}</div></div><button class="btn o" data-o="pvpTab" data-v="war">${T('open')}</button></div>`;
 h+=`<div class="card" style="background:linear-gradient(135deg,#3a1a5a,#0a1a30)"><img src="img/f_kraken.webp" style="width:60px"><div class="mid"><div class="nm">${T('kraken_week')}</div><div class="sub">${T('kraken_shared',[fmt(boss)])}</div></div><button class="btn o" data-o="boss">${T('attack')}</button></div>`;
 h+=`<div class="card${craid&&!craid.killed&&craid.left>0?' rd':''}" data-o="craid" style="cursor:pointer;background:linear-gradient(135deg,#0a3a3a,#1a0a30);border-color:#5fe0c0"><div class="ic" style="font-size:40px">🐉</div><div class="mid"><div class="nm">${T('cr_t')}</div><div class="sub">${T('cr_cta')}</div></div><button class="btn o" data-o="craid">${T('open')}</button></div>`;
 h+=`<div class="card" data-o="zones" style="cursor:pointer"><div class="ic" style="font-size:34px">🗺️</div><div class="mid"><div class="nm">${T('z_t')}</div><div class="sub">${T('z_cta')}</div></div><button class="btn o" data-o="zones">${T('open')}</button></div>`;
 h+=`<div class="sec">${T('help')}</div><div class="card"><div class="mid"><div class="sub">${T('help_desc')}</div></div><button class="btn" data-o="ask">${T('ask_help')}</button><button class="btn o" data-o="helpAll">${T('help_all')}</button></div><div id="helpList">${helpHtml()}</div>`;
 {const t=clan.tech||{};h+=`<div class="sec">🔬 ${T('tech_t')}</div><div class="sub">${T('tech_desc',[clan.don_left??10])}</div>`;
  for(const[id,ic,per]of TECH){const p=t[id]||0,l=tlv(p),nx=TLV[l+1];h+=`<div class="card" style="flex-wrap:wrap"><div class="ic">${ic}</div><div class="mid"><div class="nm">${T('tech_'+id)} · ${T('lv')} ${l}/5</div><div class="sub">${T('tech_'+id+'_d',[l*per,(Math.min(5,l+1))*per])}</div><div class="pbar"><i style="width:${nx?(p-TLV[l])/(nx-TLV[l])*100:100}%"></i></div><div class="sub">${fmt(p)}${nx?' / '+fmt(nx):' · MAX'}</div></div>
   <div style="display:flex;gap:4px;width:100%;justify-content:flex-end">${[['fish',500],['wood',500],['crys',100]].map(([r,a])=>`<button class="btn sm ${l>=5?'x':'o'}" data-o="donate" data-v="${id}:${r}:${a}" ${l>=5?'disabled':''}>${{fish:'🌾',wood:'🪵',crys:'🔮'}[r]} ${a}</button>`).join('')}</div></div>`}
  const top=[...ms].filter(m=>m.don>0).sort((a,b)=>b.don-a.don).slice(0,3);if(top.length)h+=`<div class="sub">🏅 ${T('top_donors')}: ${top.map(m=>esc(m.nick)+' '+fmt(m.don)).join(' · ')}</div>`}
 h+=`<div class="card" data-o="cshop" style="cursor:pointer;background:linear-gradient(135deg,#3a2a10,#10203a);border-color:#ffd36b"><div class="ic" style="font-size:34px">🏪</div><div class="mid"><div class="nm">${T('cs_t')}</div><div class="sub">${T('cs_cta')}</div></div><button class="btn o" data-o="cshop">${T('open')}</button></div>`;
 h+=`<div class="sec">${T('members')}</div><div class="sub">${T('roles_desc')}</div>`;for(const m of ms){const can=mine?.role==='lider'&&m.id!==uid,kick=can||(mine?.role==='yardımcı'&&m.role==='üye');
  h+=`<div class="card">${av(m.avatar)}<div class="mid"><div class="nm">${esc(m.nick)}${m.id===uid?' '+T('you_paren'):''} <span class="tag">${role(m.role)}</span></div><div class="sub">⚔️ ${fmt(m.power)} · 👹 ${fmt(m.kraken)}${m.don?' · 🔬 '+fmt(m.don):''}</div></div>
  ${can?`<button class="btn sm" data-o="role" data-v="${m.id}:${m.role==='üye'?'yardımcı':'üye'}" title="${T(m.role==='üye'?'promote':'demote')}">${m.role==='üye'?'⬆️⭐':'⬇️🎖️'}</button><button class="btn sm" data-o="role" data-v="${m.id}:lider">👑</button>`:''}${kick?`<button class="btn sm r" data-o="kick" data-v="${m.id}">✖</button>`:''}${m.id!==uid?`<button class="btn sm x" data-o="prof" data-v="${m.id}">👤</button>`:''}</div>`}
 return h+`<button class="btn r" data-o="leave" style="width:100%;margin-top:10px">${T('leave_clan')}</button>`}
let helps=[];function helpHtml(){return helps.length?helps.map(r=>`<div class="card"><div class="mid"><div class="nm">${esc(r.nick)}: ${esc(r.label)}</div><div class="pbar"><i style="width:${r.helps/r.max_helps*100}%"></i></div></div>${r.user_id!==uid&&!r.mine?`<button class="btn sm o" data-o="help" data-v="${r.id}">🤝</button>`:''}</div>`).join(''):`<div class="sub">${T('no_help')}</div>`}
async function loadHelps(){const{data}=await sb.from('help_requests').select('id,user_id,label,helps,max_helps,created_at').lt('helps',5).order('id',{ascending:false}).limit(20);const nm=Object.fromEntries((clan?.members||[]).map(m=>[m.id,m.nick]));
 helps=(data||[]).filter(r=>r.helps<r.max_helps).map(r=>({...r,nick:nm[r.user_id]||'?'}))}
// ---------- SOHBET: dünya / bölge / klan + dokun-çevir ----------
const dmCh=p=>'dm:'+[uid,p].sort().join(':');let dmL=[],dmUn=0,dmNames={};
const chanOf=tab=>tab.startsWith('dm:')?dmCh(tab.slice(3)):tab==='tr'?'tr':tab==='reg'?'r:'+(prof?.region_id||1):'clan:'+clan?.id;
const tabOf=c=>c.startsWith('dm:')?'dm:'+c.split(':').slice(1).find(x=>x!==uid):c==='tr'?'tr':c.startsWith('r:')?'reg':'clan';
const trs={};let showOrig=new Set();
async function loadDm(){try{dmL=await rpc('dm_list')||[];dmUn=dmL.filter(x=>!x.blocked).reduce((a,x)=>a+x.unread,0);for(const x of dmL)dmNames[x.peer]=x}catch(e){console.warn(e.message)}dmBadge()}
function dmBadge(){const b=$('bChat');if(!b)return;let d=$('dmDot');if(!d){d=document.createElement('i');d.id='dmDot';d.style.cssText='position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#ff4a5a;color:#fff;font:900 11px/18px system-ui;text-align:center;padding:0 4px;font-style:normal;pointer-events:none';b.style.position=b.style.position||'relative';b.appendChild(d)}d.textContent=dmUn>9?'9+':dmUn;d.style.display=dmUn?'block':'none'}
async function loadMsgs(ch){if(ch==='dm')return loadDm();if(ch==='clan'&&!clan)return;const{data}=await sb.from('messages').select('*').eq('channel',chanOf(ch)).order('id',{ascending:false}).limit(50);msgs[ch]=(data||[]).reverse();if(ch.startsWith('dm:')){await rpc('dm_read',{p_peer:ch.slice(3)}).catch(()=>{});await loadDm()}}
async function openChat(tab){govLoad();if(tab)chTab=tab;if(chTab.startsWith('dm')&&!dmL.length)await loadDm();if(!online){open('chat',()=>hdr(T('chat_t'))+offline());return}if(chTab==='clan')await refreshClan();await loadMsgs(chTab).catch(()=>{});open('chat',chatHtml);scrollChat()}
function warMsg(m,[,k,a,b,c,d]){const n=esc(m.nick);let ic='⚔️',t;
 if(k==='hit')t=T('wann_hit',[n,esc(d??c??''),stars(+a),b]);else if(k==='def'){ic='🛡️';t=T('wann_def',[n,esc(d??c??''),stars(+a),b])}
 else if(k==='start'){ic='🌫️';t=T('wann_start',[n])}else{ic=a==='win'?'🏆':a==='tie'?'🤝':'💀';t=T(a==='win'?'wann_win':a==='tie'?'wann_tie':'wann_lose',[b,c])+(n&&n!=='—'?' · 🎖️ '+T('war_mvp')+': '+n:'')}
 return `<div class="card" style="background:#ff6b6b18;border-color:#ffb27a;justify-content:center"><div class="mid" style="text-align:center"><div class="sub">${hm(m.created_at)}</div><div class="nm">${ic} ${t}</div></div><button class="btn x" data-o="pvpTab" data-v="war">🌫️</button></div>`}
function msgHtml(m){const wy=m.avatar==='⚔️'&&/^§war:(hit|def|start|end)(?::(\w+))?(?::(\d+))?(?::(\d+))?(?::(.*))?$/.exec(m.body||'');if(wy)return warMsg(m,wy);const sy=m.avatar==='🔬'&&/^§tech:(prod|store|help):(\d)$/.exec(m.body||'');if(sy)return `<div class="card" style="background:#7c5cff22;border-color:#b9a6ff;justify-content:center"><div class="mid" style="text-align:center"><div class="sub">${hm(m.created_at)}</div><b>🔬 ${T('tech_up_msg',[esc(m.nick),T('tech_'+sy[1]),sy[2]])}</b></div></div>`;
 const me=m.user_id===uid,need=!me&&!sameLang(m.lang,lang),x=trs[m.id];let tr='';
 if(x?.text&&!showOrig.has(m.id))tr=`<div class="msgt">🌐 ${esc(x.text)}</div><div class="sub"><a data-o="trOrig" data-v="${m.id}">${T('show_orig')}</a></div>`;
 else if(x==='…')tr=`<div class="sub">⏳ ${T('translating')}</div>`;
 else if(!me)tr=`<div class="sub"><a data-o="tr" data-v="${m.id}" class="trbtn">🌐 ${T(need?'translate':'translate_any')}</a>${x?.err?' · ⚠️ '+T('tr_fail'):''}</div>`;
 return `<div class="card" style="${me?'background:#ffb34722;border-color:#ffd27a':''};align-items:flex-start">${av(m.avatar,30)}<div class="mid"><div class="sub"><b data-o="prof" data-v="${m.user_id}" style="cursor:pointer">${esc(m.nick)}</b>${govB(m.user_id)} · ${hm(m.created_at)}</div><div class="msgb" style="word-break:break-word" data-o="${me?'':'tr'}" data-v="${m.id}">${esc(m.body)}</div>${tr}</div>${me?'':`<button class="btn sm x" data-o="report" data-v="${m.id}" title="${T('report')}">🚩</button>`}</div>`}
function chatHtml(){const dmT=chTab.startsWith('dm');let h=hdr(T('chat_t'))+tabs(dmT?'dm':chTab,[['tr','🌍 '+T('ch_world')],['reg','🔥 '+esc(regName())],['clan','🛡️ '+T('clan')],['dm','✉️ '+T('dm_tab')+(dmUn?` <span class="tag" style="background:#ff4a5a">${dmUn}</span>`:'')]],'chTab');
 if(chTab==='dm'){if(!dmL.length)return h+`<div class="sub">${T('dm_empty')}</div>`;for(const x of dmL)h+=`<div class="card" data-o="chTab" data-v="dm:${x.peer}" style="cursor:pointer;${x.blocked?'opacity:.5':''}">${av(x.avatar,40)}<div class="mid"><div class="nm">${esc(x.nick)}${x.blocked?' 🚫':''}</div><div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.last_body)} · ${hm(x.last_at)}</div></div>${x.unread&&!x.blocked?`<span class="tag" style="background:#ff4a5a">${x.unread}</span>`:''}</div>`;return h}
 if(chTab.startsWith('dm:')){const pi=chTab.slice(3),n=dmNames[pi];h+=`<div class="card" style="gap:8px"><button class="btn x sm" data-o="chTab" data-v="dm">‹</button>${n?av(n.avatar,32):''}<div class="mid"><b data-o="prof" data-v="${pi}" style="cursor:pointer">${esc(n?.nick||'…')}</b><div class="sub">${T('dm_private')}</div></div></div>`;msgs[chTab]=msgs[chTab]||[]}if(chTab==='clan'&&!clan)return h+`<div class="sub">${T('chat_need_clan')}</div>`;
 if(chTab==='reg')h+=`<div class="sub">${T('ch_reg_desc')}</div>`;
 h+=`<div id="chBox" style="max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:6px">`;
 for(const m of msgs[chTab]||[])if(!muted.has(m.user_id))h+=msgHtml(m);
 if(!(msgs[chTab]||[]).length)h+=`<div class="sub">${T('chat_empty')}</div>`;
 return h+`</div><div class="card" style="gap:6px;margin-top:8px">${inp('chIn',T('msg_ph'),200)}<button class="btn o" data-o="send">${T('send')}</button></div><div class="sub">${T('chat_rules')}</div>`}
function scrollChat(){setTimeout(()=>{const b=$('chBox');if(b)b.scrollTop=b.scrollHeight},30)}
function keepRender(){const v=$('chIn')?.value||'',sc=$('chBox')?.scrollTop;rerender();if($('chIn'))$('chIn').value=v;if(sc!=null&&$('chBox'))$('chBox').scrollTop=sc}
function onMsg(m){const ch=tabOf(m.channel);msgs[ch]=msgs[ch]||[];if(msgs[ch].some(x=>x.id===m.id))return;if(ch.startsWith('dm:')&&m.user_id!==uid&&!muted.has(m.user_id)){if(sheetIs('chat')&&chTab===ch)rpc('dm_read',{p_peer:m.user_id}).catch(()=>{});else{dmUn++;dmBadge();G.toast('✉️ '+esc(m.nick)+': '+esc(m.body).slice(0,40));if(sheetIs('chat')&&chTab==='dm')loadDm().then(keepRender)}}msgs[ch].push(m);if(msgs[ch].length>80)msgs[ch].shift();
 if(sheetIs('chat')&&chTab===ch){keepRender();scrollChat()}else if(m.user_id!==uid)$('bChat')?.classList.add('ping')}
async function translate(id){if(trs[id]?.text){showOrig.delete(id);return keepRender()}trs[id]='…';keepRender();
 try{const{data,error}=await sb.functions.invoke('translate',{body:{id:+id,to:lang}});if(error||!data?.text)throw error||new Error('tr');trs[id]={text:data.text,src:data.src}}catch(e){trs[id]={err:1}}keepRender()}
// ---------- PROFİL / DÜELLO ----------
let profC=null,isAdm=false,modD=null,clanP=null;
async function openClanPub(id){if(clan?.id===id)return openClan();try{clanP=await rpc('clan_public',{p_id:id})}catch(e){return err(e)}if(!clanP)return toast(T('err.bad_target'));open('clanP',()=>{const c=clanP;let h=hdr(`${esc(c.icon)} ${esc(c.name)} [${esc(c.tag)}]`)+`<div class="card"><div class="mid"><div class="nm">👥 ${c.members.length}/30 · ⚔️ ${T('clan_power')} ${fmt(c.power)}</div><div class="sub">🔥 ${T('sea_n',[c.region||1])}${c.descr?' · '+esc(c.descr):''}</div></div>${!clan&&c.members.length<30?`<button class="btn o" data-o="join" data-v="${c.id}">${T('join')}</button>`:''}</div><div class="sec">${T('members')}</div>`;
 for(const m of c.members)h+=`<div class="card" data-o="prof" data-v="${m.id}" style="cursor:pointer">${av(m.avatar)}<div class="mid"><div class="nm">${esc(m.nick)} <span class="tag">${RIC[m.role]||''} ${T(ROLE[m.role]||'role_member')}</span></div><div class="sub">⚔️ ${fmt(m.power)}</div></div></div>`;return h})}
let modL=[],heroP=[];async function openMod(){if(!isAdm)return;try{modD=await rpcS('mod_reports');modL=await rpcS('mod_log').catch(()=>[]);heroP=await rpcS('hero_pending_list').catch(()=>[])}catch(e){return err(e)}open('mod',()=>{let h=hdr('🛡️ '+T('mod_t'))+`<div class="sub">${T('mod_d')}</div><div class="sec">🚩 ${T('mod_players')} (${modD.players.length})</div>`;
 if(!modD.players.length)h+=`<div class="sub">${T('mod_none')}</div>`;
 for(const x of modD.players){const mu=x.muted_until&&new Date(x.muted_until)>new Date();h+=`<div class="card" style="flex-wrap:wrap">${av(x.avatar,40)}<div class="mid"><div class="nm" data-o="prof" data-v="${x.target}" style="cursor:pointer;text-decoration:underline">${esc(x.nick)}${mu?' 🔇':''}</div><div class="sub">${T('mod_line',[x.n,x.reporters])} · ${x.reasons.map(r=>T('rr_'+r)).join(', ')} · ${hm(x.last)}</div></div><div style="display:flex;gap:4px;width:100%;justify-content:flex-end">${[['mute1h','🔇1h'],['mute24h','🔇24h'],['unmute','🔊'],['dismiss','✅ '+T('mod_dismiss')]].map(([a,l])=>`<button class="btn sm ${a==='dismiss'?'':'x'}" data-o="modAct" data-v="${x.target}:${a}">${l}</button>`).join('')}</div></div>`}
 h+=`<div class="sec">💬 ${T('mod_msgs')} (${modD.msgs.length})</div>`;if(!modD.msgs.length)h+=`<div class="sub">${T('mod_none')}</div>`;
 for(const m of modD.msgs)h+=`<div class="card" style="flex-wrap:wrap"><div class="mid"><div class="nm" data-o="prof" data-v="${m.user_id}" style="cursor:pointer">${esc(m.nick||'?')} · ${esc(m.channel)} · 🚩${m.n}</div><div class="sub">“${esc(m.body)}”</div></div><button class="btn sm x" data-o="modAct" data-v="${m.user_id}:mute24h">🔇24h</button><button class="btn sm" data-o="modAct" data-v="${m.user_id}:dismiss">✅</button></div>`;h+=`<div class="sec">🎖️ ${T('hp_t')} (${heroP.length})</div><div class="sub">${T('hp_d')}</div>`;if(!heroP.length)h+=`<div class="sub">${T('mod_none')}</div>`;const HN=id=>(G.L.HEROES||[]).find(x=>x.id===id);for(const p of heroP){const hh=HN(p.hero);h+=`<div class="card" style="flex-wrap:wrap">${av(p.hero,40)}<div class="mid"><div class="nm" data-o="prof" data-v="${p.user_id}" style="cursor:pointer">${esc(p.nick||'?')} · ${esc(hh?.n||p.hero)} ${'★'.repeat(hh?.r||1)}</div><div class="sub">${T('hp_why_'+(p.why==='season'?'season':'offline'))} · ${T('hp_line',[p.own,p.offline,p.pulls])} · ${hm(p.at)}</div></div><button class="btn sm o" data-o="heroDec" data-v="${p.user_id}:${p.hero}:1">✅ ${T('hp_ok')}</button><button class="btn sm x" data-o="heroDec" data-v="${p.user_id}:${p.hero}:0">✖ ${T('hp_no')}</button></div>`}h+=`<div class="sec">📜 ${T('mod_log')} (${modL.length})</div>`;for(const l of modL.slice(0,15))h+=`<div class="card"><div class="mid"><div class="nm">${esc(l.admin||'?')} → ${esc(l.target||'?')} · ${esc(l.act)}</div><div class="sub">${new Date(l.at).toLocaleString()}</div></div></div>`;return h})}
function cardHtml(c,r){const H=G.L.HEROES||[],hn=id=>H.find(x=>x.id===id)?.n||id,wl=c.wins+c.losses,wr=wl?Math.round(c.wins/wl*100):0;
 let h=`<div class="card" style="background:linear-gradient(135deg,#1d3d5c,#2a1a40);border-color:#7ad7ff">${av(c.avatar,64)}<div class="mid"><div class="nm">${esc(c.nick)}</div><div class="sub">${c.clan?`<a data-o="clanPub" data-v="${c.clan.id}" style="color:#9fe0ff;text-decoration:underline;cursor:pointer">${esc(c.clan.icon||'🛡️')} [${esc(c.clan.tag||'')}] ${esc(c.clan.name)}</a>${gov.c[c.clan.id]?` · 👑 ${T('gov_of',[T('z_'+gov.c[c.clan.id])])}`:''} · ${RIC[c.clan.role]||''} ${T(ROLE[c.clan.role]||'role_member')}`:T('no_clan_p')}</div><div class="sub">🔥 ${T('sea_n',[c.region||1])} · 🗺️ ${T('n_islands',[Math.max(0,c.stage-1)])}</div></div></div>`;
 h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0">${[['⚔️',T('power'),fmt(c.power)],['🏟️',tierN(c.tier),r],['🏆',T('win_rate'),wl?wr+'%':'—']].map(([i,k,v])=>`<div class="card" style="display:block;text-align:center;padding:8px 4px"><div style="font-size:18px">${i}</div><b>${v}</b><div class="sub">${k}</div></div>`).join('')}</div>`;
 h+=`<div class="sec">🎖️ ${T('captains')} · ${fmt(c.cap_power)}</div><div style="display:flex;gap:8px;justify-content:center">${(c.heroes||[]).map(x=>`<div style="text-align:center">${av(x.id,52)}<div class="sub">${esc(hn(x.id))}</div><div class="sub">${'⭐'.repeat(+x.star||1)} ${T('lv_n',[x.lv||1])}${x.tal?' · 🌟'+x.tal:''}</div></div>`).join('')||`<div class="sub">—</div>`}</div>`;
 h+=`<div class="sec">📊 ${T('stats')}</div><div class="sub">${T('stats_line',[fmt(c.st.wins),c.wins,c.losses,c.best,fmt(c.st.boss),c.st.heroes])}</div>`;return h}

let refD=null,refP=null;function refClaimNow(){const c=localStorage.getItem('sf_ref');if(!c||refP)return refP;localStorage.removeItem('sf_ref');refP=rpc('ref_claim',{p_code:c}).then(()=>{toast('🤝 '+T('inv_ok'));return true},e=>{err(e);return false});return refP}
async function refSync(){try{const c=await refClaimNow();
 const r=await rpc('ref_collect');if(r&&r.gems>0){G.L.addRes(G.S,{gems:r.gems});G.save();G.ui();setTimeout(()=>toast('🤝 '+T('inv_rw')+' 💎'+r.gems),c?2600:0)}}catch(e){}}
let frD=null;function frHtml(){const F=frD||[],ok=F.filter(f=>f.st==='ok');let h=`<div class="sec">🤝 ${T('fr_t')} · ${ok.length}/50</div><div class="sub">${T('fr_d')}</div>`;if(!frD)h+=`<div class="sub">…</div>`;else if(!F.length)h+=`<div class="sub">${T('fr_none')}</div>`;
 for(const f of F){const on=f.last_seen&&Date.now()-new Date(f.last_seen)<6e5;h+=`<div class="card">${av(f.avatar,34)}<div class="mid"><div class="nm" data-o="prof" data-v="${f.id}">${on?'🟢 ':''}${esc(f.nick)}</div><div class="sub">⚔️ ${fmt(f.power)} · 🗺️ ${T('n_islands',[Math.max(0,(f.stage||1)-1)])}</div></div>${f.st==='in'?`<button class="btn o sm" data-o="frAcc" data-v="${f.id}">${T('fr_accept')}</button>`:f.st==='out'?`<span class="sub">${T('fr_pending')}</span>`:`<button class="btn o sm" data-o="frGift" data-v="${f.id}" ${f.sent?'disabled':''}>${f.sent?'✅':'🎁'} ${T('fr_gift')}</button>`}<button class="btn x sm" data-o="frDel" data-v="${f.id}" title="${T('remove')}">✕</button></div>`}return h}
const frReload=async()=>{try{frD=await rpc('friend_list')}catch(e){}if(cur==='prof')G.renderSheet?.()};
function refHtml(){if(!refD)return `<div class="sec">🤝 ${T('inv_t')}</div><div class="sub">…</div>`;const url=location.origin+location.pathname+'?ref='+refD.code;
 return `<div class="sec">🤝 ${T('inv_t')}</div><div class="card" style="flex-direction:column;align-items:stretch;gap:6px"><div class="sub">${T('inv_desc')}</div><div class="nm">${T('inv_code',[esc(refD.code)])}</div><div class="sub" style="word-break:break-all;opacity:.8">${esc(url)}</div><div class="sub">${T('inv_stats',[refD.invited,refD.done,refD.paid])}</div>${refD.by?`<div class="sub">💌 ${T('inv_by',[esc(refD.by)])}</div>`:''}<button class="btn o" data-o="invShare">📤 ${T('inv_share')}</button></div>`}
async function openProfile(id){id=id||uid;let c=null;try{c=await rpc('player_card',{p_id:id})}catch(e){return err(e)}const p={id:c.id,nick:c.nick,avatar:c.avatar,power:c.power,stage:c.stage,region_id:c.region};const a={rating:c.rating};profC=c;
 const mine=id===uid;if(mine){frD=null;const fl=()=>rpc('friend_list').then(v=>{frD=v||[];if(cur==='prof')G.renderSheet?.()});fl().catch(()=>setTimeout(()=>fl().catch(()=>{frD=frD||[]}),1500))}if(mine)rpc('ref_info').then(v=>{refD=v;if(cur==='prof')G.renderSheet?.()},()=>{});const r=a?.rating??1000;
 open('prof',()=>{let h=hdr('👤 '+esc(p.nick))+cardHtml(c,r);
  if(mine){h+=frHtml()+refHtml();h+=`<div class="sec">${T('name_portrait')}</div><div class="card" style="gap:6px">${inp('pNick',T('nick_ph'),16,p.nick)}<button class="btn o" data-o="saveProf">${T('save')}</button></div><div style="display:flex;gap:6px;flex-wrap:wrap">${HERO_IDS.map(x=>`<span data-o="pAv" data-v="${x}" style="cursor:pointer;opacity:${x===(window.__pav||p.avatar)?1:.45}">${av(x,46)}</span>`).join('')}</div>
   <div class="sec">${T('account')}</div><div class="sub">${T('guest_desc')}</div><div class="card" style="gap:6px;flex-wrap:wrap">${inp('pMail',T('email'),80)}${inp('pPass',T('pass_ph'),64)}<button class="btn" data-o="link">${T('link')}</button></div><div class="sub">${T('google_soon')}</div>`;if(isAdm)h+=`<button class="btn o" data-o="modOpen" style="width:100%;margin-top:8px">🛡️ ${T('mod_t')}</button>`}
  else h+=`${c.blocks_me?`<div class="sub">🚫 ${T('blocks_you')}</div>`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="btn o" data-o="frAdd" data-v="${id}" style="grid-column:1/-1" ${c.blocked||c.blocks_me?'disabled':''}>🤝 ${T('fr_add')}</button><button class="btn o" data-o="duel" data-v="${id}" ${c.blocked||c.blocks_me?'disabled':''}>${T('duel_btn')}</button><button class="btn" data-o="dmOpen" data-v="${id}" ${c.blocked||c.blocks_me?'disabled':''}>✉️ ${T('dm_btn')}</button><button class="btn x" data-o="repP" data-v="${id}">🚩 ${T('report')}</button><button class="btn x" data-o="block" data-v="${id}">${c.blocked?'✅ '+T('unblock'):'🚫 '+T('block')}</button></div>`;
  return h})}
const tier=r=>r>=1800?'Efsane':r>=1500?'Elmas':r>=1300?'Altın':r>=1100?'Gümüş':'Bronz';
const TIERS=[['Bronz',0,50],['Gümüş',1100,100],['Altın',1300,180],['Elmas',1500,300],['Efsane',1800,500]];
// ---------- Fener Savaşı yan düğmesi + puan bildirimi ----------
let fwTot=null;const fwSum=d=>Object.values(d?.mine||{}).reduce((a,b)=>a+(+b||0),0);
function fwSide(){const sd=$('side');if(!sd||$('sFw'))return;const b=document.createElement('button');b.className='sb';b.id='sFw';b.innerHTML=`🏮<small id="fwL">${T('fw_btn_s')}</small><i class="dot" id="fwdot"></i>`;sd.insertBefore(b,$('sSet')||null);b.onclick=()=>{G.SFX?.tap?.();OA.fw()}}
function fwMark(){const d=fwData;if(!d||!$('sFw'))return;const ph=d.phase||'prep';$('fwL').textContent=T('fw_ph_'+ph);$('sFw').classList.toggle('hot',ph==='clash');
 $('fwdot').style.display=ph==='clash'&&d.left>0?'block':'none';const t=fwSum(d);if(fwTot!=null&&t>fwTot)G.toast(T('fw_gain',[fmt(t-fwTot)]));fwTot=t}
async function fwPoll(){if(!online||document.hidden)return;try{fwData=await rpc('fener_war_me');fwMark();if(sheetIs('fw'))rerender()}catch(e){console.warn(e.message)}}
function fwHtml(){const d=fwData||{},ph=d.phase||'prep',f=x=>x?new Date(x).toLocaleString(locale,{weekday:'short',hour:'2-digit',minute:'2-digit'}):'';
 const P=[['prep','🛠️',f(d.clash_at)],['clash','🔥',f(d.reward_at)],['reward','🎁',f(d.end_at)]],us=+d.us||0,th=+d.them||0,pc=us+th?Math.round(us/(us+th)*100):50;
 const oppN=d.npc?T('fw_npc'):d.opp?T('reg_'+d.opp):T('fw_wait');
 let h=`<h3><span><button class="btn x sm" data-o="pvpTab" data-v="war">‹</button> 🏮 ${T('fw_t')}</span><button class="btn x close">✕</button></h3>`;
 if(d.vali)h+=`<div class="card" style="background:linear-gradient(135deg,#6a4a10,#2a1a08);border-color:#ffd84a">${av(d.vali.avatar,40)}<div class="mid"><div class="nm">👑 ${T('fw_vali')}: ${esc(d.vali.nick)}${d.vali.me?` <span class="tag">${T('league_you')}</span>`:''}</div><div class="sub">${T('fw_vali_d',[esc(regName())])}</div></div></div>`;
 h+=`<div class="card" style="display:block;background:linear-gradient(135deg,#123a5a,#1a1030)"><div class="sub" style="text-align:center">${esc(d.week||'')} · ${T('fw_'+ph)}</div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0"><div style="text-align:center;flex:1"><div style="font-size:26px">🏮</div><b style="font-size:13px">${esc(regName())}</b><div style="font-size:20px;font-weight:900;color:#7ad7ff">${fmt(us)}</div></div><b style="font-size:18px">VS</b><div style="text-align:center;flex:1"><div style="font-size:26px">${d.npc?'🌫️':'🏰'}</div><b style="font-size:13px">${esc(oppN)}</b><div style="font-size:20px;font-weight:900;color:#ff8a7a">${fmt(th)}</div></div></div>
 <div style="height:12px;border-radius:8px;background:#ff8a7a55;overflow:hidden"><div style="height:100%;width:${pc}%;background:linear-gradient(90deg,#2fa8ff,#7ad7ff);transition:width .6s"></div></div>
 <div class="sub" style="text-align:center;margin-top:4px">⚔️ ${T('fw_dmg',[fmt(d.them_dmg||0),fmt(d.us_dmg||0)])}</div></div>`;
 if(ph==='clash')h+=`<button class="btn o${d.left>0?' rd':''}" data-o="fwAtk" style="width:100%;margin:4px 0" ${d.left>0?'':'disabled'}>🔥 ${T('fw_attack')} (${d.left??0}/3)</button>`;
 else if(ph==='prep')h+=`<div class="card"><div class="ic">🔒</div><div class="mid"><div class="nm">${T('fw_attack')}</div><div class="sub">${T('fw_opens',[f(d.clash_at)])}</div></div></div>`;
 else h+=`<div class="card"><div class="ic">🎁</div><div class="mid"><div class="nm">${d.settled?T('fw_settled'):T('fw_reward_d')}</div><div class="sub">${T('fw_rw_rule')}</div></div></div>`;
 h+=`<div class="sec">${T('fw_sched')}</div>`;
 for(const[k,ic,until]of P)h+=`<div class="card ${k===ph?'me':''}"><div class="ic">${ic}</div><div class="mid"><div class="nm">${T('fw_'+k)} ${k===ph?`<span class="tag">${T('fw_now')}</span>`:''}</div><div class="sub">${T('fw_'+k+'_d')}${until?' · ⏳ '+until:''}</div></div></div>`;
 const m=d.mine||{},tot=Object.values(m).reduce((a,b)=>a+b,0),SRC=[['build','🏗️'],['help','🤝'],['kraken','🐺'],['raid','🏴‍☠️'],['clash','🔥']];
 h+=`<div class="sec">${T('fw_pts')}</div><div class="card"><div class="ic">⭐</div><div class="mid"><div class="nm">${T('fw_mine',[fmt(tot)])}</div><div class="sub">${SRC.map(([k,ic])=>`${ic} ${T('fw_s_'+k)} ${fmt(m[k]||0)}`).join(' · ')}</div><div class="sub">${T('fw_caps')}</div></div></div>`;
 if(d.top?.length){h+=`<div class="sec">${T('fw_top')}</div>`;d.top.forEach((x,i)=>h+=`<div class="card">${i===0?'👑':'#'+(i+1)} ${av(x.avatar,28)}<div class="mid"><div class="nm">${esc(x.nick)}</div></div><b>⭐ ${fmt(x.s)}</b></div>`)}
 if(d.last)h+=`<div class="sec">${T('fw_last')}</div><div class="card"><div class="ic">${d.last.win?'🏆':'💀'}</div><div class="mid"><div class="nm">${esc(d.last.week)} · ${d.last.win?T('fw_won'):T('fw_lost')}</div><div class="sub">${fmt(d.last.us)} – ${fmt(d.last.them)}${d.last.vali?' · 👑 '+esc(d.last.vali):''}</div></div></div>`;
 return h}
function seasonEndTs(){const d=new Date(Date.now()+3*36e5);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)-3*36e5}
let cupD=null;const CUP_RW={1:{gems:80,crys:400,ush:15},2:{gems:50,crys:250,ush:8},3:{gems:30,crys:150},5:{gems:15,crys:80}};
const rwTxt=o=>Object.entries(o).map(([k,v])=>`${(G.L.RIC&&G.L.RIC[k])||(k==='ush'?'✨':k)}${fmt(v)}`).join(' ');
const cupNm=p=>p.id?(p.nick||'?'):'🌫️ '+T('cup_ghost'),CUP_PN={1:'cup_p1',2:'cup_p2',3:'cup_p3',5:'cup_p5'};
function cupHtml(){const c=cupD&&cupD.cup,pn=p=>T({1:'cup_p1',2:'cup_p2',3:'cup_p3',5:'cup_p5'}[p]);let h=`<h3><span><button class="btn x sm" data-o="pvpTab" data-v="arena">‹</button> ⚖️🏆 ${T('cup_t',[esc(cupD?cupD.week:'')])}</span><button class="btn x close">✕</button></h3><div class="sub" style="margin:4px 0 8px">${T('cup_desc')}</div>`;
 if(!cupD)return h+'<div class="sub">…</div>';
 if(!c)h+=`<button class="btn o" data-o="cupGo" style="width:100%;margin:4px 0 10px">${T('cup_play')}</button>`;
 else{h+=`<div class="card me" style="border-color:#ffd84a"><div class="ic" style="font-size:30px">${c.place===1?'🥇':c.place===2?'🥈':c.place===3?'🥉':'🎖️'}</div><div class="mid"><div class="nm">${T('cup_you',[pn(c.place)])}</div><div class="sub">${rwTxt(c.reward)} · ${T('cup_done')}</div></div></div>`;
  const nm=p=>p.id?esc(p.nick||'?'):'🌫️ '+T('cup_ghost');
  c.bracket.forEach((ms,ri)=>{h+=`<div class="sec">${T(['cup_r1','cup_r2','cup_r3'][ri])}</div>`;for(const m of ms){const me=x=>x.id===uid;h+=`<div class="card" style="padding:6px 10px;${me(m.a)||me(m.b)?'border-color:#ffd84a':''}"><div class="mid"><div class="nm" style="font-size:13px">${m.w===0?'🏆 ':''}<span style="${m.w===0?'':'opacity:.55'}">${nm(m.a)}</span> <span class="sub">vs</span> ${m.w===1?'🏆 ':''}<span style="${m.w===1?'':'opacity:.55'}">${nm(m.b)}</span></div></div>${m.r?`<button class="btn sm" data-o="cupRp" data-v="${ri},${ms.indexOf(m)}" aria-label="${T('cup_watch')}">▶️</button>`:''}</div>`}});
  h+=`<button class="btn o" data-o="cupShare" style="width:100%;margin:10px 0 4px">📤 ${T('cup_share')}</button>`}
 h+=`<div class="sec">${T('cup_rw')}</div>`;for(const p of[1,2,3,5])h+=`<div class="card ${c&&c.place===p?'me':''}" style="padding:6px 10px"><div class="mid"><div class="nm" style="font-size:13px">${pn(p)}</div></div><b>${rwTxt(CUP_RW[p])}</b></div>`;return h}

function cupCard(){const c=cupD.cup,W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b2a4a');g.addColorStop(.55,'#123d63');g.addColorStop(1,'#1a1030');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.globalAlpha=.18;for(let i=0;i<14;i++){x.fillStyle='#ffd84a';x.beginPath();x.moveTo(W/2,250);x.arc(W/2,250,1400,i*.45,i*.45+.12);x.fill()}x.globalAlpha=1;
 const F=(sz,w)=>`${w||800} ${sz}px "Fredoka","Baloo 2",system-ui,sans-serif`;x.textAlign='center';x.fillStyle='#ffd84a';x.font=F(54);x.fillText('⚖️🏆 '+T('cup_t',[cupD.week]),W/2,120);
 x.font=F(190,400);x.fillText(c.place===1?'🥇':c.place===2?'🥈':c.place===3?'🥉':'🎖️',W/2,360);x.fillStyle='#fff';x.font=F(68);x.fillText(T(CUP_PN[c.place]),W/2,470);
 x.font=F(40,600);x.fillStyle='#cfe6ff';x.fillText(cupNm(c.bracket[0].flatMap(m=>[m.a,m.b]).find(p=>p.id===uid)||{nick:prof?.nick}),W/2,530);
 let y=620;c.bracket.forEach((ms,ri)=>{x.fillStyle='#ffd84a';x.font=F(34);x.fillText(T(['cup_r1','cup_r2','cup_r3'][ri]).toUpperCase(),W/2,y);y+=50;
  for(const m of ms){const me=m.a.id===uid||m.b.id===uid;x.fillStyle=me?'rgba(255,216,74,.22)':'rgba(255,255,255,.08)';x.beginPath();x.roundRect?x.roundRect(120,y-36,W-240,52,16):x.rect(120,y-36,W-240,52);x.fill();
   x.font=F(30,700);x.fillStyle=m.w===0?'#fff':'rgba(255,255,255,.5)';x.textAlign='right';x.fillText((m.w===0?'🏆 ':'')+cupNm(m.a),W/2-40,y);x.fillStyle='#9fb8d0';x.textAlign='center';x.fillText('vs',W/2,y);
   x.fillStyle=m.w===1?'#fff':'rgba(255,255,255,.5)';x.textAlign='left';x.fillText(cupNm(m.b)+(m.w===1?' 🏆':''),W/2+40,y);x.textAlign='center';y+=60}y+=16});
 x.fillStyle='#ffd84a';x.font=F(44);x.fillText('Son Fener',W/2,H-80);x.fillStyle='#cfe6ff';x.font=F(28,600);x.fillText(location.host+location.pathname,W/2,H-40);return cv}
function leagueHtml(){const a=arena||{rating:1000,best:1000,wins:0,losses:0,season:''},r=a.rating,ti=TIERS.findIndex(x=>x[0]===tier(r)),nx=TIERS[ti+1],end=seasonEndTs(),left=Math.max(0,Math.ceil((end-Date.now())/864e5));
 let h=`<h3><span><button class="btn x sm" data-o="pvpTab" data-v="arena">‹</button> 🏆 ${T('league_t')}</span><button class="btn x close">✕</button></h3>`;
 h+=`<div class="card" style="background:linear-gradient(135deg,#5a3a10,#1a1030)"><div class="ic" style="font-size:34px">${TIC[TIERS[ti][0]]}</div><div class="mid"><div class="nm">${tierN(TIERS[ti][0])} · ${r}</div>${nx?`<div class="pbar"><i style="width:${Math.min(100,(r-TIERS[ti][1])/(nx[1]-TIERS[ti][1])*100)}%"></i></div><div class="sub">${T('league_next',[nx[1]-r,tierN(nx[0])])}</div>`:`<div class="sub">${T('league_top')}</div>`}<div class="sub">${T('league_best',[a.best,a.wins,a.losses])}</div></div></div>`;
 h+=`<div class="card"><div class="ic">⏳</div><div class="mid"><div class="nm">${T('league_end',[left])}</div><div class="sub">${new Date(end).toLocaleString(locale,{dateStyle:'medium',timeStyle:'short'})} · ${T('league_reset')}</div></div></div><div class="sec">${T('league_rw')}</div>`;
 for(let i=TIERS.length-1;i>=0;i--){const[t,min,g]=TIERS[i],cur=i===ti;h+=`<div class="card ${cur?'me':''}" style="${cur?'border-color:#ffd84a':''}"><div class="ic" style="font-size:28px">${TIC[t]}</div><div class="mid"><div class="nm">${tierN(t)} ${cur?`<span class="tag">${T('league_you')}</span>`:''}</div><div class="sub">${min?T('league_min',[min]):T('league_start')}</div></div><b>💎${g}</b></div>`}
 return h+`<div class="sub" style="margin:6px 2px">${T('league_note')}</div>`}
let badges={};const bdg=id=>{const b=badges[id];if(!b||b.seasons<1)return'';const ti=tier(b.best);return ti==='Bronz'?'':` <span class="tag" title="${tierN(ti)}">${TIC[ti]}${b.seasons>1?'×'+b.seasons:''}</span>`};
const TIC={Bronz:'🥉',Gümüş:'🥈',Altın:'🥇',Elmas:'💎',Efsane:'👑'};
// ---------- SAVAŞ: baskın, arena, Sis Cephesi, raporlar, sıralama ----------
let boardMe=null,wlog=null,myCap=0,targets=[],opps=[],reports=[],board=[];
async function openPvp(tab){if(tab)pvpTab=tab;if(!online){open('pvp',()=>hdr(T('war_hdr'))+offline());return}await push();
 try{if(pvpTab==='raid')targets=await rpc('find_targets');if(pvpTab==='arena'){arena=await rpc('arena_me');opps=await rpc('arena_opponents');try{myCap=(await rpc('player_card',{p_id:uid})).cap_power||0}catch(e){};board=await rpc('arena_board');try{const ids=[...new Set([uid,...opps.map(x=>x.id),...board.map(x=>x.id)])];badges={};for(const b of await rpc('arena_badges',{p_ids:ids}))badges[b.id]=b}catch(e){}}
  if(pvpTab==='war'){await refreshClan();war=clan?await rpc('front_status'):{phase:'noclan'};war._t=Date.now();wlog=null;if(war.id)try{wlog=await rpc('front_log',{p_war:war.id})}catch(e){}}
  if(pvpTab==='tour')tour=await rpc('tour_me');if(pvpTab==='rep'){const{data}=await sb.from('battles').select('*').or(`attacker.eq.${uid},defender.eq.${uid}`).order('id',{ascending:false}).limit(30);reports=data||[]}
  if(pvpTab==='lb'){boardMe=null;if(boardTab==='clan')board=await rpc('clan_board',{p_wk:wk()});else{const rb=await rpc('rank_board',{p_kind:boardTab,p_wk:wk()});board=rb.rows||[];boardMe=rb.me}}
  prof=(await sb.from('profiles').select('*').eq('id',uid).single()).data||prof}catch(e){err(e)}
 open('pvp',pvpHtml);warTick()}
const dur=ms=>{ms=Math.max(0,ms);const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);return h?T('dur_hm',[h,m]):T('dur_ms',[m,s])};
// sunucu saatine göre geri sayım
const warLeft=()=>{if(!war?.id)return 0;const off=Date.now()-war._t,now=new Date(war.now).getTime()+off;return (war.phase==='prep'?new Date(war.starts_at):new Date(war.ends_at)).getTime()-now};
let wTimer=null;function warTick(){clearInterval(wTimer);if(pvpTab!=='war'||!war?.id||war.phase==='result')return;wTimer=setInterval(()=>{if(!sheetIs('pvp')||pvpTab!=='war')return clearInterval(wTimer);const l=warLeft();const e=$('warCd');if(e)e.textContent=dur(l);if(l<=0){clearInterval(wTimer);openPvp('war')}},1000)}
const stars=n=>'<span class="stars">'+'★'.repeat(n)+'<i>'+'★'.repeat(3-n)+'</i></span>';
function warHtml(){const w=war||{phase:'none'};const isOff=clan&&['lider','yardımcı'].includes((clan.members||[]).find(m=>m.id===uid)?.role);
 let h=`<div class="card war-hero"><div class="ic" style="font-size:40px">🌫️</div><div class="mid"><div class="nm">${T('war_t')} · 🔥 ${esc(regName())}</div><div class="sub">${T('war_rules')}</div></div></div>`;
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
 const mv=wlog?.mvp;if(mv&&mv.nick)h+=`<div class="card" style="background:linear-gradient(135deg,#5a4a10,#2a1c40);border-color:#ffd84a"><div class="ic" style="font-size:30px">🎖️</div>${av(mv.avatar,40)}<div class="mid"><div class="nm">${T('war_mvp')}: ${esc(mv.nick)}</div><div class="sub">${mv.side===wlog.me?T('war_mvp_ours'):T('war_mvp_theirs')} · ${T('war_mvp_stat',[mv.stars,mv.dmg,mv.n])}</div></div></div>`;
 h+=`<div class="sec">${T('enemy_lines')}</div>`;
 for(const f of w.foes||[])h+=`<div class="card">${av(f.avatar)}<div class="mid"><div class="nm">${esc(f.nick)}</div><div class="sub">⚔️ ${fmt(f.power)} · ${stars(f.stars)}</div></div>${w.phase==='battle'?`<button class="btn o" data-o="fAtk" data-v="${f.id}" ${myN>=3?'disabled':''}>${T('attack')}</button>`:''}</div>`;
 if(!(w.foes||[]).length)h+=`<div class="sub">—</div>`;
 h+=`<div class="sec">${T('our_lines')}</div>`;
 for(const m of w.mine||[])h+=`<div class="card ${m.id===uid?'me':''}">${av(m.avatar,28)}<div class="mid"><div class="nm">${esc(m.nick)}</div><div class="sub">${m.ok?T('attacks_used',[m.n]):T('joined_late')}</div></div><b>${'⚔️'.repeat(m.n)}${'·'.repeat(Math.max(0,3-m.n))}</b></div>`;
 h+=`<div class="sec">📜 ${T('war_log')}</div>`;const lg=wlog?.log||[];if(!lg.length)h+=`<div class="sub">${T('war_log_empty')}</div>`;
 for(const e of lg)h+=`<div class="card" style="border-color:${e.mine?'#3fb95088':'#ff6b6b88'}">${av(e.a.avatar,28)}<div class="mid"><div class="nm">${esc(e.a.nick)} → ${esc(e.d.nick)}</div><div class="sub">${hm(e.t)} · ${stars(e.stars)} · ${e.dmg}%</div></div>${e.bid?`<button class="btn x" data-o="fRp" data-v="${e.bid}" title="${T('war_watch')}">▶️</button>`:''}</div>`;
 return h+rewardsHtml()}
const rewardsHtml=()=>`<div class="sec">${T('rewards')}</div><div class="sub">🏆 ${T('rw_win')}: 💎150 🪵2500 💠300 · 🤝 ${T('rw_tie')}: 💎80 · 💀 ${T('rw_lose')}: 💎40 — ${T('rw_note')}</div>`;
let tour=null;function tourHtml(){const t=tour;if(!t)return `<div class="sub">…</div>`;const reg=t.dow<5,live=!!t.grp;
 let h=`<div class="card" style="background:linear-gradient(135deg,#1d3a5a,#2a1040)"><div class="ic" style="font-size:34px">🎖️</div><div class="mid"><div class="nm">${T('tour_t')} · ${esc(t.wk)}</div><div class="sub">${T('tour_d')}</div><div class="sub">🏅 ${T('tour_rw')}</div></div></div>`;
 const ph=[['reg','📝 '+T('tour_ph_reg')],['bat','⚔️ '+T('tour_ph_bat')],['end','📬 '+T('tour_ph_end')]],pi=live?1:reg?0:2;h+=`<div class="wtl">${ph.map(([k,n],i)=>`<div class="wst ${i===pi?'on':i<pi?'done':''}">${n}</div>`).join('<b>›</b>')}</div>`;
 if(t.last)h+=`<div class="sub">📜 ${T('tour_last',[t.last.wk,t.last.rk])}</div>`;
 if(!t.joined){h+=reg?`<div class="sub">${T('tour_n',[t.n])} · ⚔️ ${fmt(t.mypw)}</div><button class="btn o" data-o="tourJoin" style="width:100%;margin-top:6px" ${t.mypw>0?'':'disabled'}>📝 ${T('tour_join')}</button>`:`<div class="sub">${T('tour_closed')}</div>`;return h}
 if(!live)return h+`<div class="sub">✅ ${T('tour_wait',[t.n])}</div>`;
 h+=`<div class="sec">${T('tour_grp',[t.grp])}</div>`;let i=0;
 for(const r of t.rows){i++;const me=r.id===uid;h+=`<div class="card" ${me?'style="outline:2px solid #ffcf3a"':''}><div class="ic" style="font-size:18px">${i<=3?['🥇','🥈','🥉'][i-1]:'#'+i}</div>${av(r.avatar,34)}<div class="mid"><div class="nm" data-o="prof" data-v="${r.id}">${esc(r.nick)}</div><div class="sub">⚔️ ${fmt(r.pw)} · ${T('tour_pts',[r.pts,r.w,r.l])}</div></div>${me?'':r.fought?'<span class="sub">✅</span>':`<button class="btn o sm" data-o="tourFight" data-v="${r.id}">${T('attack')}</button>`}</div>`}
 return h}
function pvpHtml(){let h=hdr(T('war_hdr'))+`<button class="btn o" style="width:100%;margin:0 0 6px" data-o="world">🗺️ ${T('w_t')}</button>`+tabs(pvpTab,[['raid','🏴‍☠️ '+T('t_raid')],['arena','🏟️ '+T('t_arena')],['war','🌫️ '+T('t_front')],['rep','📜 '+T('t_rep')],['tour','🎖️ '+T('t_tour')],['lb','🏆 '+T('t_lb')]],'pvpTab');
 if(pvpTab==='tour')return h+tourHtml();
 if(pvpTab==='war')return h+`<button class="btn o" data-o="fw" style="width:100%;margin:4px 0 8px">🏮 ${T('fw_btn')} </button>`+warHtml();
 if(pvpTab==='raid'){const sh=new Date(prof?.shield_until)>new Date();h+=`<div class="card"><div class="mid"><div class="nm">${T('fleet_power')} ⚔️ ${fmt(prof?.power||0)}</div><div class="sub">${sh?T('shield_on'):T('shield_off')} · ${T('raid_rules')} · 🔥 ${esc(regName())}</div></div><button class="btn x" data-o="pvpTab" data-v="raid">🔄</button></div>`+(prof&&!prof.has_attacked&&Date.now()-new Date(prof.created_at)<6048e5?`<div class="card"><div class="ic">🐣</div><div class="mid"><div class="nm">${T('newbie_t')}</div><div class="sub">${T('newbie_d')}</div></div><button class="btn sm r" data-o="unprotect">${T('remove')}</button></div>`:'');
  if(!targets.length)h+=`<div class="sub">${T('no_targets')}</div>`;
  for(const x of targets)h+=`<div class="card">${av(x.avatar)}<div class="mid"><div class="nm" data-o="prof" data-v="${x.id}">${esc(x.nick)}${x.tag?` <span class="tag">[${esc(x.tag)}]</span>`:''}</div><div class="sub">⚔️ ${fmt(x.power)} · 🗺️ ${T('n_islands',[x.stage-1])}</div></div><button class="btn o" data-o="raid" data-v="${x.id}">${T('attack')}</button></div>`}
 if(pvpTab==='arena'&&arena){const ti=tier(arena.rating),own=HERO_IDS.filter(x=>G.S.heroes[x]);
  h+=`<div class="card" style="background:linear-gradient(135deg,#5a3a10,#1a1030)"><div class="ic" style="font-size:34px">${TIC[ti]}</div><div class="mid"><div class="nm">${T('arena_t')} · ${tierN(ti)} · ${arena.rating}</div><div class="sub">${T('arena_sub',[arena.season,arena.wins,arena.losses,arena.tickets])}</div><div class="sub">${T('arena_season_rw')}</div>${(()=>{const b=badges[uid]||{},pk=b.cur||arena.rating,nx=[1100,1300,1500,1800].find(x=>x>pk);return `<div class="sub">🎖️ ${T('badge_me',[TIC[tier(pk)]+' '+tierN(tier(pk)),b.best?TIC[tier(b.best)]+' '+tierN(tier(b.best)):'—'])}${nx?' · '+T('badge_next',[TIC[tier(nx)],nx-arena.rating>0?nx-arena.rating:0]):''}</div>`})()}</div></div>
  <div class="sec">${T('def_lineup')}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${own.map(x=>`<span data-o="lineup" data-v="${x}" style="cursor:pointer;opacity:${(arena.lineup||[]).includes(x)?1:.4}">${av(x,46)}</span>`).join('')||`<div class="sub">${T('no_caps')}</div>`}</div><div class="sub">${T('lineup_desc')}</div><div class="sec">${T('opponents')}</div>`;
  h+=`<button class="btn o" data-o="league" style="width:100%;margin:4px 0 8px">🏆 ${T('league_btn')}</button>`;h+=`<button class="btn o" data-o="eqcup" style="width:100%;margin:0 0 8px">⚖️🏆 ${T('cup_btn')}</button>`;h+=`<div class="card"><div class="ic">⚖️</div><div class="mid"><div class="nm">${T('eq_arena')} ${window.__eqArena?T('on'):T('off')}</div><div class="sub">${T('eq_desc',[arena.eq_rating??1000])}</div></div><button class="btn sm" data-o="eqArena">${window.__eqArena?T('normal'):T('equal')}</button></div>`;
  if(myCap)h+=`<div class="sub" style="margin:4px 0">⚖️ ${T('band_info',[fmt(myCap*.7),fmt(myCap*1.4)])}</div>`;for(const o of opps)h+=`<div class="card">${av(o.avatar)}<div class="mid"><div class="nm">${esc(o.nick)}${bdg(o.id)}</div><div class="sub">${TIC[o.tier]} ${o.rating} · ${T('cap_power')} ${fmt(o.power)}${myCap?(()=>{const q=o.power/myCap;return q>=.7&&q<=1.4?` · <span style="color:#7dffa0">⚖️ ${T('band_fair')}</span>`:q<.7?` · <span style="color:#ffb36b">⬇️ ${T('band_weak')}</span>`:` · <span style="color:#ff7a7a">⬆️ ${T('band_strong')}</span>`})():''}</div></div><button class="btn o" data-o="arena" data-v="${o.id}" ${arena.tickets?'':'disabled'}>${T('fight')}</button></div>`;
  if(!opps.length)h+=`<div class="sub">${T('no_opps')}</div>`;h+=`<div class="sec">${T('arena_board')}</div><div class="board">`+board.map((r,i)=>`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,26)}<div class="mid">${esc(r.nick)}${bdg(r.id)}</div><b>${TIC[r.tier]} ${r.rating}</b></div>`).join('')+'</div>'}
 if(pvpTab==='rep'){if(!reports.length)h+=`<div class="sub">${T('no_battles')}</div>`;for(const b of reports){const att=b.attacker===uid,won=att?b.win:!b.win,K={raid:'🏴‍☠️ '+T('t_raid'),arena:'🏟️ '+T('t_arena'),duel:'🤺 '+T('duel'),front:'🌫️ '+T('t_front')}[b.kind]||b.kind;
  const loot=b.kind==='raid'?Object.entries(b.loot||{}).filter(([,v])=>v).map(([k,v])=>`${G.L.RIC[k]}${fmt(v)}`).join(' '):b.kind==='arena'?T('n_points',[`${b.loot.rating>0?'+':''}${att?b.loot.rating:-Math.trunc(b.loot.rating/2)}`]):b.kind==='front'?stars(b.loot.stars||0):'';
  h+=`<div class="card" style="border-color:${won?'#3fb950':'#ff6b6b'}"><div class="ic">${won?'🏆':'💀'}</div><div class="mid"><div class="nm">${K} · ${att?'→ '+esc(b.def_nick):'← '+esc(b.att_nick)}</div><div class="sub">${won?T('victory'):T('defeat')} · ${loot?(att||b.kind!=='raid'?'':T('lost')+' ')+loot+' · ':''}${new Date(b.created_at).toLocaleString(locale,{dateStyle:'short',timeStyle:'short'})}</div></div><button class="btn sm" data-o="replay" data-v="${b.id}">▶️</button>${!att&&b.kind==='raid'&&!b.revenged&&Date.now()-new Date(b.created_at)<864e5?`<button class="btn sm r" data-o="revenge" data-v="${b.id}">${T('revenge')}</button>`:''}</div>`}}
 if(pvpTab==='lb'){h+=`<div style="overflow-x:auto">`+tabs(boardTab,[['power','⚔️ '+T('power')],['stage','🏘️ '+T('rk_stage')],['pass','🎫 '+T('rk_pass')],['craid','🐉 '+T('rk_craid')],['kraken','👹 '+T('rk_kraken')],['clan','🛡️ '+T('clan_kraken')]],'boardTab')+`</div><div class="sub">🌐 ${T('rk_h_'+boardTab)}</div>`;
  if(boardTab!=='clan')h+=`<div class="card me" style="position:sticky;top:0;z-index:2"><b>${T('rk_me')}</b><div class="mid"></div><b>${boardMe?`#${boardMe.rank} · ${fmt(boardMe.val)}`:T('rk_none')}</b></div>`;
  h+='<div class="board">';
  board.forEach((r,i)=>h+=boardTab==='clan'||boardTab==='craid'?`<div class="card ${clan&&r.tag===clan.tag?'me':''}"><b style="width:26px">#${i+1}</b><div class="ic">${esc(r.icon)}</div><div class="mid">${esc(r.name)} [${esc(r.tag)}]${boardTab==='craid'?`<div class="sub">${T('cr_lvl',[r.lvl])}${r.killed?' · 💀 '+T('cr_killed'):''}</div>`:''}</div><b>${fmt(r.dmg??r.val)}</b></div>`:`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">${['🥇','🥈','🥉'][(r.rk||i+1)-1]||'#'+(r.rk||i+1)}</b>${av(r.avatar,26)}<div class="mid" data-o="prof" data-v="${r.id}">${esc(r.nick)}${r.tag?` <span class="tag">[${esc(r.tag)}]</span>`:''}</div><b>${fmt(r.val)}</b></div>`);
  h+='</div>'+(board.length?'':`<div class="sub">${T('no_records')}</div>`)}
 return h}
// Kraken sheet'inde gerçek sıralama (bot yerine)
let bossCache=null;function bossHtml(){if(!online)return null;if(!bossCache||Date.now()-bossCache.t>15000){bossCache={t:Date.now(),rows:bossCache?.rows||[]};rpc('leaderboard',{p_kind:'kraken',p_wk:wk()}).then(r=>{bossCache.rows=r||[];if(sheetIs('')||$('sheet').classList.contains('on'))G.renderSheet?.()}).catch(()=>{})}
 const rows=bossCache.rows;return `<div class="sec">${T('real_board')}</div><div class="board">${rows.map((r,i)=>`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,24)}<div class="mid">${r.id===uid?'⭐ '+T('you'):esc(r.nick)}${r.tag?` <span class="tag">[${esc(r.tag)}]</span>`:''}</div><b>${fmt(r.val)}</b></div>`).join('')||`<div class="sub">${T('kraken_first')}</div>`}</div>`}
// ---------- savaş tekrarı ----------
function replay(r,title){G.closeSheet?.();const bt=$('battle'),aH=r.a||null,dH=r.d||null;const side=(nick,avt,pw,list,id)=>`<div class="side" style="text-align:center">${list?`<div style="display:flex;gap:6px;justify-content:center">${list.map(x=>av(x.id,58)).join('')}</div>`:av(avt,80)}<div class="hl">${esc(nick)} · ⚔️ ${fmt(pw)}</div><div class="pbar" style="width:70%;margin:6px auto"><i id="${id}" style="width:100%;transition:width .4s"></i></div></div>`;
 bt.innerHTML=`<div class="top">${title}</div>${side(r.def_nick,r.def_avatar,r.def_power,dH,'hpE')}<div class="waves" id="rLog" style="text-align:center;font-weight:900;font-size:22px;min-height:40px"></div>${side(r.att_nick||T('you'),r.att_avatar||prof?.avatar,r.att_power,aH,'hpA')}`;
 bt.classList.add('on');G.SFX?.boss?.();let i=0;const R=r.rounds||[];const iv=setInterval(()=>{const x=R[i++];if(!x){clearInterval(iv);setTimeout(()=>finish(r),500);return}
  $('hpE').style.width=(x.eHp/r.eMax*100)+'%';$('hpA').style.width=(x.hp/r.myMax*100)+'%';$('rLog').innerHTML=`<span style="color:#ffd84a">−${fmt(x.d1)}</span> &nbsp; <span style="color:#ff6b6b">−${fmt(x.d2)}</span>`;juice(bt,x);G.SFX?.hit?.()},600)}
const RM=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
function juiceCss(){if($('sfJuice'))return;const st=document.createElement('style');st.id='sfJuice';st.textContent=`@keyframes sfShk{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,3px)}40%{transform:translate(6px,-4px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,2px)}}
.sfShk{animation:sfShk .28s linear}@keyframes sfDmg{0%{opacity:0;transform:translate(-50%,0) scale(.6)}15%{opacity:1;transform:translate(-50%,-6px) scale(1.25)}100%{opacity:0;transform:translate(-50%,-70px) scale(1)}}@keyframes sfDmgR{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
.sfDmg{position:absolute;left:50%;font-weight:900;font-size:30px;pointer-events:none;text-shadow:0 2px 0 #000,0 0 12px rgba(0,0,0,.6);animation:sfDmg .9s ease-out forwards;z-index:5}.sfDmg.rm{animation-name:sfDmgR}.sfDmg.crit{font-size:40px}
@keyframes sfHit{0%{filter:brightness(2.4) saturate(.2)}100%{filter:none}}.sfHit{animation:sfHit .25s ease-out}
.sfSpark{position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;background:#ffd84a;box-shadow:0 0 10px #ffb000;z-index:5;transition:transform .45s ease-out,opacity .45s}`;document.head.appendChild(st)}
function juice(bt,x){juiceCss();const rm=RM(),sides=bt.querySelectorAll('.side');if(getComputedStyle(bt).position==='static')bt.style.position='relative';
 const pop=(el,v,col,big)=>{if(!el||!v)return;const r=el.getBoundingClientRect(),b=bt.getBoundingClientRect(),d=document.createElement('div');d.className='sfDmg'+(rm?' rm':'')+(big?' crit':'');d.style.color=col;d.style.top=(r.top-b.top+r.height*.35+(Math.random()*16-8))+'px';d.style.left=(r.left-b.left+r.width*(.4+Math.random()*.2))+'px';d.textContent='−'+fmt(v)+(big?'!':'');bt.appendChild(d);setTimeout(()=>d.remove(),950);
  el.classList.remove('sfHit');void el.offsetWidth;el.classList.add('sfHit');
  if(!rm)for(let k=0;k<6;k++){const p=document.createElement('div');p.className='sfSpark';p.style.top=(r.top-b.top+r.height*.4)+'px';p.style.left=(r.left-b.left+r.width/2)+'px';p.style.background=col;bt.appendChild(p);requestAnimationFrame(()=>{const a=Math.random()*6.28,s=30+Math.random()*40;p.style.transform=`translate(${Math.cos(a)*s}px,${Math.sin(a)*s}px)`;p.style.opacity=0});setTimeout(()=>p.remove(),500)}};
 const avg=(x.d1+x.d2)/2||1;pop(sides[0],x.d1,'#ffd84a',x.d1>avg*1.25);pop(sides[1],x.d2,'#ff6b6b',x.d2>avg*1.25);
 if(!rm&&(x.d1>avg*1.25||x.d2>avg*1.25||Math.random()<.5)){bt.classList.remove('sfShk');void bt.offsetWidth;bt.classList.add('sfShk')}}
window.__juice={RM,juice};
function finish(r){const bt=$('battle');const loot=Object.entries(r.loot||{}).filter(([k,v])=>v&&G.L.RIC[k]).map(([k,v])=>`${G.L.RIC[k]}${fmt(v)}`).join(' ');
 const lost=Object.entries(r.att_lost||{}).filter(([,v])=>v).map(([k,v])=>`${G.L.TROOPS[k].ic}${-v}`).join(' ');
 const body=r.kind==='cup'?`🏆 <b>${esc(r.win?r.att_nick:r.def_nick)}</b>`:r.kind==='arena'?`${T('arena_pts')}: <b>${r.rating_change>0?'+':''}${r.rating_change}</b>`:r.kind==='duel'?T('duel_noloot'):r.kind==='fw'?`⭐ +${r.pts} · ${T('fw_left',[r.left])}`:r.kind==='front'?`<div style="font-size:34px">${stars(r.stars)}</div>${T('front_result',[r.dmg])}`:`${loot?T('loot')+': '+loot+'<br>':''}${lost?T('lost')+': '+lost:''}`;
 const close=()=>{bt.classList.remove('on');claim();if(r.kind==='front')openPvp('war');if(r.kind==='fw')OA.fw();if(r.kind==='cup')open('eqcup',cupHtml)};G.modal(`<div style="font-size:54px">${r.win?'🏆':'💀'}</div><h2>${r.kind==='cup'?esc(r.cupT||''):r.spect?esc(r.att_nick)+' ⚔️ '+esc(r.def_nick):r.win?T('victory_x'):T('defeat')}</h2><p>${body}</p>${r.kind==='duel'?`<p class="sub">⚔️ ${fmt(r.att_power)} vs ${fmt(r.def_power)} · ${T('duel_rounds',[(r.rounds||[]).length])}</p>`:''}`,r.kind==='duel'&&lastDuel?[[T('ok'),'x',close],['🔁 '+T('rematch'),'o',()=>{bt.classList.remove('on');setTimeout(()=>OA.duelGo(lastDuel),1600)}]]:[[T('ok'),'o',close]])}
// ---------- eylemler ----------
const val=id=>($(id)?.value||'').trim();
// ---------- Sunucu tarafı kaptan çağırma ----------
function sumAdopt(r){const S=G.S;if(r.rev!=null){rev=r.rev;localStorage.setItem('sf_rev',rev)}for(const k of ['gems','tickets','ush','pity','pity2'])if(r[k]!=null)S[k]=+r[k];if(r.sel!=null)S.selTok=+r.sel;if(r.heroes)S.heroes=r.heroes;if(r.free!=null)S.srvFree=!!r.free;G.save();G.ui()}
const sumOut=r=>(r.out||[]).map(o=>({h:G.L.HEROES.find(h=>h.id===o.id),isNew:!!o.new}));
async function sumCall(f,a){await push();try{const r=await rpc(f,a);sumAdopt(r);return sumOut(r)}catch(e){throw new Error(srvErr(e.message||String(e)))}}
async function summonSync(){try{sumAdopt(await rpc('summon_me'))}catch(e){console.warn('summon',e.message)}}
// ---------- Deniz Bölgeleri & Vali ----------
let zones=null;
async function openZones(){govLoad();try{zones=await rpc('zones_me')}catch(e){err(e);return}open('zones',zonesHtml)}
function zonesHtml(){const z=zones;let h=G.hdr('🗺️ '+T('z_t'))+`<div class="sub" style="margin-bottom:8px">${T('z_help')}</div>`;if(!z)return h;
 const lead=z.role==='lider',off=z.role&&z.role!=='üye';if(!z.clan)h+=`<div class="prev">${T('cr_noclan')}</div>`;
 h+=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">`;
 for(const s of z.zones){const mine=s.id===z.my_zone;h+=`<div class="card" style="flex-direction:column;align-items:stretch;gap:4px;margin:0;${mine?'border-color:#ffd45a;box-shadow:0 0 0 2px #ffd45a55':''}"><div class="nm">${s.ic} ${T('z_'+s.code)}</div><div class="sub">👑 ${s.gov?esc('['+s.gov.tag+'] '+s.gov.name):T('z_nogov')}</div><div class="sub">🛡️ ${s.clans.length}</div>${lead&&!mine?`<button class="btn x sm" data-o="zJoin" data-v="${s.id}">${T('z_join')}</button>`:''}${mine?`<div class="sub">⭐ ${T('z_home')}</div>`:''}</div>`}
 h+=`</div>`;const my=z.zones.find(s=>s.id===z.my_zone);
 if(my){h+=`<div class="sec">${my.ic} ${T('z_'+my.code)} · ${T('z_race')} (${esc(z.wk)})</div>`;
  for(const c of my.clans)h+=`<div class="card ${c.id===z.clan?'me':''}"><div class="ic">${esc(c.icon||'🛡️')}</div><div class="mid"><div class="nm">[${esc(c.tag)}] ${esc(c.name)}</div><div class="sub">${T('z_inf',[fmt(c.inf)])} · ${T('z_votes',[c.votes])}</div></div>${off?`<button class="btn ${z.my_vote===c.id?'':'x'} sm" data-o="zVote" data-v="${c.id}">${z.my_vote===c.id?'✓':T('z_vote')}</button>`:''}</div>`}
 h+=`<div class="sub" style="margin:8px 2px">${T('z_rules')}</div>`;return h}
// ---------- Klan Baskın Canavarı (Derin Yılan) ----------
let craid=null;
let cfeed=null,crTimer=null;async function craidLoad(){try{[craid,cfeed]=await Promise.all([rpc('craid_me'),rpc('craid_feed').catch(()=>null)])}catch(e){craid=null}craidDot()}
function craidDot(){const on=!!(craid&&!craid.killed&&craid.left>0);document.querySelectorAll('#bClan').forEach(b=>{let d=b.querySelector('.crdot');if(!d){b.style.position='relative';d=document.createElement('i');d.className='crdot';d.style.cssText='position:absolute;top:4px;right:10px;width:9px;height:9px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 0 2px #0008';b.appendChild(d)}d.style.display=on?'block':'none'})}
function craidHtml(){const r=craid;let h=G.hdr('🐉 '+T('cr_t'));if(!r)return h+`<div class="sub">${T('cr_noclan')}</div>`;
 const pct=Math.max(0,r.hp/r.hp_max*100),left=Math.max(0,r.end-Date.now()),tot=r.board.reduce((a,b)=>a+b.dmg,0)||1;
 h+=`<div class="card" style="flex-direction:column;align-items:stretch;background:linear-gradient(160deg,#06343a,#140828);border-color:#5fe0c0"><div style="text-align:center;font-size:72px;line-height:1;${r.killed?'filter:grayscale(1);opacity:.5':''}">🐉</div>
 <div class="nm" style="text-align:center">${T('cr_lvl',[r.lvl])} · ${r.killed?'💀 '+T('cr_killed'):`<span style="color:${left<216e5?'#ff8a7a':'inherit'}">⏳ ${G.fmtT(left/1000)}</span>`}</div><div class="pbar" style="height:14px;position:relative"><i style="width:${pct}%;background:linear-gradient(90deg,#ff5a5a,#ffb347)"></i>${[25,50,75].map(x=>`<b style="position:absolute;top:0;bottom:0;left:${x}%;width:2px;background:#0009"></b>`).join('')}</div>
 <div class="sub" style="text-align:center">❤️ ${fmt(r.hp)} / ${fmt(r.hp_max)} · ${T('cr_mine',[fmt(r.my)])}</div>
 <button class="btn o${r.killed||r.left<=0?'':' rd'}" data-o="craidHit" style="margin-top:8px" ${r.killed||r.left<=0?'disabled':''}>⚔️ ${T('cr_hit',[Math.max(0,r.left)])}</button></div>
 ${(()=>{const hs=r.board.reduce((a,b)=>a+b.hits,0);if(r.killed||!hs)return '';const avg=tot/hs;return `<div class="sub" style="text-align:center;margin:-2px 0 6px">🎯 ${T('cr_est',[fmt(Math.ceil(r.hp/avg)),fmt(Math.round(avg))])}</div>`})()}<div class="sub">${T('cr_rules')}</div><div class="sec">🏆 ${T('cr_board')}</div>`;
 if(!r.board.length)h+=`<div class="sub">${T('cr_none')}</div>`;
 r.board.forEach((b,i)=>{h+=`<div class="card" style="${b.id===uid?'border-color:#ffd27a':''}"><div class="ic">${['🥇','🥈','🥉'][i]||'#'+(i+1)}</div>${av(b.avatar)}<div class="mid"><div class="nm">${esc(b.nick)}</div><div class="sub">⚔️ ${fmt(b.dmg)} · ${Math.round(b.dmg/tot*100)}% · ${T('cr_hits',[b.hits])}</div></div></div>`});
 const f=cfeed||{};if(f.prev)h+=`<div class="card"><div class="ic">${f.prev.killed?'🏆':'🔥'}</div><div class="mid"><div class="nm">${T('cr_prev')}</div><div class="sub">${f.prev.killed?T('cr_prev_win',[f.prev.lvl]):T('cr_prev_end',[f.prev.lvl,f.prev.pct])}</div></div></div>`;
 h+=`<div class="sec">📜 ${T('cr_feed')}</div>`;if(!(f.log||[]).length)h+=`<div class="sub">${T('cr_none')}</div>`;
 (f.log||[]).forEach(l=>{h+=`<div class="sub" style="display:flex;justify-content:space-between;padding:3px 4px;border-bottom:1px solid #ffffff14"><span>⚔️ <b>${esc(l.nick)}</b> −${fmt(l.dmg)}</span><span>${new Date(l.at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</span></div>`});
 h+=`<div class="sec">🎁 ${T('cr_rw_t')}</div><div class="sub">${T('cr_rw')}</div>`;return h}
function craidFloat(d,c){const e=document.createElement('div');e.textContent=(c?'💥 ':'−')+fmt(d);e.style.cssText=`position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:9999;font:900 ${c?34:26}px system-ui;color:${c?'#ffd27a':'#ff6b6b'};text-shadow:0 2px 6px #000;pointer-events:none;transition:all 1.1s ease-out`;document.body.appendChild(e);requestAnimationFrame(()=>{e.style.top='18%';e.style.opacity='0'});setTimeout(()=>e.remove(),1200)}
let cshop=null;const csRw=rw=>Object.entries(rw).map(([k,v])=>({crys:'🔮',wood:'🪵',fish:'🌾',ticket:'🎟️',ush:'✨',gems:'💎'}[k]||'')+' '+fmt(v)).join(' ');const CS_IC={crys:'🔮',wood:'🪵',tk:'🎟️',ush:'✨',gems:'💎'};
async function openCshop(){try{cshop=await rpc('clan_shop_me')}catch(e){return err(e)}open('cshop',cshopHtml)}
function cshopHtml(){const c=cshop;let h=G.hdr('🏪 '+T('cs_t'));if(!c)return h;const hr=Math.max(1,Math.round(c.reset/3600));
 h+=`<div class="card" style="background:#10203a"><div class="ic" style="font-size:30px">🏅</div><div class="mid"><div class="nm">${T('cs_bal',[fmt(c.bal)])}</div><div class="sub">${T('cs_how')}</div><div class="sub">⏳ ${T('cs_reset',[Math.floor(hr/24),hr%24])}</div></div></div>`;
 for(const it of c.items){const n=(c.buys||{})[it.id]||0,left=it.lim-n,ok=left>0&&c.bal>=it.c;
  h+=`<div class="card"><div class="ic" style="font-size:30px">${CS_IC[it.id]||'🎁'}</div><div class="mid"><div class="nm">${csRw(it.rw)}</div><div class="sub">${T('cs_left',[left,it.lim])}</div></div><button class="btn ${ok?'o':'x'}" data-o="csBuy" data-v="${it.id}" ${ok?'':'disabled'}>🏅 ${fmt(it.c)}</button></div>`}
 return h}
async function openCraid(){await craidLoad();open('craid',craidHtml);clearInterval(crTimer);crTimer=setInterval(async()=>{if(!sheetIs('craid'))return clearInterval(crTimer);await craidLoad();if(sheetIs('craid'))rerender()},20000)}
// ---------- Posta kutusu (sunucu postaları, ekli ödüller, savaş sonuçları) ----------
let mails=[];
async function mailLoad(){if(!online)return;try{mails=await rpc('mail_list')||[]}catch(e){return}mailDot()}
function mailDot(){const d=$('maildot');if(d)d.style.display=mails.some(m=>!m.read||(m.att&&!m.claimed))?'block':'none'}
function mailBtn(){const side=$('side');if(!side||$('sMail'))return;const b=document.createElement('button');b.className='sb';b.id='sMail';b.innerHTML=`📬<small>${esc(T('mail_btn'))}</small><i class="dot" id="maildot"></i>`;side.insertBefore(b,$('sSet'));b.onclick=()=>{G.SFX?.tap?.();openMail()}}
const MIC={craid:'🐉',welcome:'🎁',system:'📢',war:'⚔️',raided:'🏴‍☠️'};
function mailHtml(){let h=G.hdr('📬 '+T('mail_t'))+`<div class="sub" style="margin:-4px 0 10px">${T('mail_d')}</div>`;
 if(mails.some(m=>m.att&&!m.claimed))h+=`<button class="btn o" data-o="mailAll" style="width:100%;margin-bottom:8px">${T('mail_all')}</button>`;
 if(!mails.length)h+=`<div class="sub">${T('mail_none')}</div>`;
 for(const m of mails){const a=(m.args||[]).map(x=>{x=String(x);const zm=x.match(/^z:(\w+)$/);if(zm)return esc(T('z_'+zm[1]));const ym=x.match(/^(\d{4})-(\d{2})$/);return esc(ym?new Date(+ym[1],+ym[2]-1,15).toLocaleString(locale,{month:'long',year:'numeric'}):x)});h+=`<div class="card" style="${m.read?'opacity:.8':'border-color:#ffd27a'}"><div class="ic">${MIC[m.kind]||'✉️'}</div><div class="mid"><div class="nm">${t(m.tk+'_t',a)}</div><div class="sub">${t(m.tk,a)}</div><div class="sub">${m.att?'🎁 '+G.rwStr(m.att)+' · ':''}${new Date(m.created_at).toLocaleString(locale,{dateStyle:'short',timeStyle:'short'})}</div></div>${m.att?(m.claimed?'✅':`<button class="btn sm o rd" data-o="mailClaim" data-v="${m.id}">${T('mail_claim')}</button>`):''}</div>`}
 return h}
async function openMail(){await mailLoad();open('mail',mailHtml);const un=mails.filter(m=>!m.read&&!m.att);for(const m of un){m.read=true;rpc('mail_read',{p_id:m.id}).catch(()=>{})}mailDot()}
async function mailTake(m){const rw=await rpc('mail_claim',{p_id:m.id});G.L.addRes(G.S,rw);m.claimed=m.read=true;return rw}
// ---------- Fener Bileti sunucu eşitleme ----------
function passAdopt(p){const P=G.S.pass,t0=P.srv?Math.min(30,Math.floor(P.srv.xp/100)):null,t1=Math.min(30,Math.floor(p.xp/100));if(t0!=null&&t1>t0)G.toast('🎫 '+T('pass_up',[t1]));P.xp=p.xp;P.prem=p.prem?1:0;P.cl={f:{},p:{}};for(const i of p.f||[])P.cl.f[i]=1;for(const i of p.p||[])P.cl.p[i]=1;P.srv=p;G.save();return p}
async function passSync(){if(!online)return null;const P=G.S.pass;if(!P.imp){try{const ks=o=>Object.keys(o||{}).filter(k=>o[k]).map(Number);passAdopt(await rpc('pass_import',{p_xp:P.xp|0,p_f:ks(P.cl?.f),p_p:ks(P.cl?.p),p_prem:!!P.prem}));P.imp=1;P.tq=0}catch(e){}}const n=Math.max(0,Math.min(150,P.tq||0));let p;try{p=await rpc(n?'pass_task':'pass_me',n?{p_n:n}:{});P.tq=0}catch(e){return null}return passAdopt(p)}
const OA={
 craid:()=>openCraid(),cshop:()=>openCshop(),csBuy:async v=>{try{await push();const r=await rpc('clan_shop_buy',{p_item:v});if(r.err)return toast('⚠️ '+T('cs_e_'+r.err));G.L.addRes(G.S,r.rw);cshop.bal=r.bal;cshop.buys=r.buys;G.save();G.ui();G.SFX?.coin?.();toast('✅ '+csRw(r.rw));push();rerender()}catch(e){err(e)}},zones:()=>openZones(),
 zJoin:async v=>{try{await rpc('zone_join',{p_zone:+v});toast('🗺️ '+T('z_joined'));await openZones()}catch(e){err(e)}},
 zVote:async v=>{try{const r=await rpc('zone_vote_cast',{p_cand:v});toast('🗳️ '+T('z_voted',[r.weight]));await openZones()}catch(e){err(e)}},
 craidHit:async(v,b)=>{if(b)b.disabled=true;try{const r=await rpc('craid_hit');craid=r;cfeed=await rpc('craid_feed').catch(()=>cfeed);craidDot();craidFloat(r.dmg,r.crit);G.SFX?.coin?.();toast((r.crit?'💥 '+T('cr_crit')+' ':'⚔️ ')+T('cr_dmg',[fmt(r.dmg)]));if(r.killed){toast('🐉 '+T('cr_win'));setTimeout(mailLoad,800)}rerender()}catch(e){err(e);if(b)b.disabled=false}},
 mailClaim:async v=>{const m=mails.find(x=>x.id==v);if(!m)return;try{const rw=await mailTake(m);G.SFX?.coin?.();toast('🎁 '+G.rwStr(rw));G.ui();G.save();push();rerender();mailDot()}catch(e){err(e)}},
 mailAll:async()=>{let n=0;for(const m of mails.filter(x=>x.att&&!x.claimed)){try{await mailTake(m);n++}catch(e){}}if(n){G.SFX?.coin?.();toast(T('mail_got',[n]))}G.ui();G.save();push();rerender();mailDot()},
 pvpTab:v=>openPvp(v),boardTab:v=>{boardTab=v;openPvp('lb')},chTab:v=>openChat(v),goClan:()=>openClan(),
 create:async()=>{try{await rpc('create_clan',{p_name:val('cName'),p_tag:val('cTag'),p_icon:'🛡️'});toast(T('clan_created'));openClan()}catch(e){err(e)}},
 search:async()=>{clanQ=val('cQ');openClan()},
 join:async v=>{try{await rpc('join_clan',{p_clan:v});toast(T('joined'));openClan()}catch(e){err(e)}},
 leave:()=>G.modal(`<h2>${T('leave_q')}</h2>`,[[T('cancel'),'x'],[T('leave'),'r',async()=>{try{await rpc('leave_clan');clan=null;openClan()}catch(e){err(e)}}]]),
  role:v=>{const[id,r]=v.split(':'),m=(clan?.members||[]).find(x=>x.id===id);G.modal(`<h2>${RIC[r]} ${T(r==='lider'?'make_leader_q':r==='yardımcı'?'promote_q':'demote_q',[esc(m?.nick||'?')])}</h2>${r==='lider'?`<p class="sub">${T('make_leader_d')}</p>`:''}`,[[T('cancel'),'x'],[T('confirm'),'o',async()=>{try{await rpc('set_role',{p_user:id,p_role:r});G.SFX?.done?.();toast(T('role_set'));openClan()}catch(e){err(e)}}]])},
 kick:v=>{const m=(clan?.members||[]).find(x=>x.id===v);G.modal(`<h2>✖ ${T('kick_q',[esc(m?.nick||'?')])}</h2>`,[[T('cancel'),'x'],[T('kick'),'r',async()=>{try{await rpc('kick_member',{p_user:v});openClan()}catch(e){err(e)}}]])},
 donate:async v=>{const[t,r,a]=v.split(':');const S=G.S;if((S.res[r]||0)<+a)return toast('⚠️ '+T('err.no_res'));try{await push();const o=await rpc('clan_donate',{p_tech:t,p_res:r,p_amt:+a});S.res[r]=Math.max(0,S.res[r]-a);if(o.rev!=null){rev=o.rev;localStorage.setItem('sf_rev',rev)}inc('donate');if(o.up)toast('🔬 '+T('tech_lvup',[T('tech_'+t),o.lv]));G.SFX?.coin?.();toast(T('donated',[o.pts]));G.ui?.();await refreshClan();rerender()}catch(e){err(e)}},
 // yardım etiketi sunucuda saklanır; herkes kendi dilinde okusun diye anahtar değil kısa emoji+metin gönderilir
 ask:async()=>{const S=G.S;const x=S.train?T('h_train'):S.research?T('h_research'):S.fener?.end?T('h_fener'):Object.values(S.g).some(b=>b.end)?T('h_build'):null;if(!x)return toast(T('no_timer'));try{await rpc('ask_help',{p_label:x});toast(T('help_asked'));openClan()}catch(e){err(e)}},
 help:async v=>{try{await rpc('give_help',{p_req:+v});inc('help');toast(T('you_helped'));openClan()}catch(e){err(e)}},
 helpAll:async()=>{try{const n=await rpc('help_all');if(n)inc('help',n);toast(T('n_helps',[n]));openClan()}catch(e){err(e)}},
 boss:()=>{G.closeSheet?.();G.openBoss()},chatClan:()=>openChat('clan'),
 send:async()=>{const x=val('chIn');if(!x)return;if(x.length>200)return toast(T('max200'));
  try{await rpcS('send_chat',{p_channel:chanOf(chTab),p_body:x,p_lang:detectLang(x)});$('chIn').value='';await loadMsgs(chTab);keepRender();scrollChat()}catch(e){err(e)}},
 tr:v=>v&&translate(v),trOrig:v=>{showOrig.add(+v);keepRender()},
 report:async v=>{try{await rpcS('report_msg',{p_msg:+v});toast(T('reported'))}catch(e){err(e)}},
 prof:v=>openProfile(v),
 frAdd:async v=>{try{const r=await rpc('friend_req',{p_id:v});toast(T(r.st==='friends'?'fr_now':'fr_sent'))}catch(e){err(e)}},
 frAcc:async v=>{try{await rpc('friend_accept',{p_id:v});toast(T('fr_now'));frReload()}catch(e){err(e)}},
 frDel:async v=>{try{await rpc('friend_remove',{p_id:v});frReload()}catch(e){err(e)}},
 frGift:async v=>{try{const r=await rpc('friend_gift',{p_id:v});toast(r.ok?T('fr_gift_ok'):T('fr_gift_'+r.err));frReload()}catch(e){err(e)}},
 clanPub:v=>openClanPub(v),
 modOpen:()=>openMod(),
 heroDec:async v=>{const[u,hr,ok]=v.split(':');try{await rpcS('hero_pending_decide',{p_user:u,p_hero:hr,p_ok:ok==='1'});toast('✅ '+T('mod_done'));openMod()}catch(e){err(e)}},modAct:async v=>{const[t,a]=v.split(':');try{await rpcS('mod_action',{p_target:t,p_act:a});toast('✅ '+T('mod_done'));openMod()}catch(e){err(e)}},
 dmOpen:async v=>{if(!dmNames[v]&&profC?.id===v)dmNames[v]={peer:v,nick:profC.nick,avatar:profC.avatar};openChat('dm:'+v)},
 block:async v=>{try{const on=!muted.has(v);(await rpcS('block_player',{p_target:v,p_on:on}));on?muted.add(v):muted.delete(v);toast(on?T('blocked_ok'):T('unblocked_ok'));loadDm();openProfile(v)}catch(e){err(e)}},
 repP:v=>{G.modal(`<h2>🚩 ${T('report_t')}</h2><p>${T('report_d')}</p><div style="display:grid;gap:6px">${['spam','abuse','name','cheat','other'].map(k=>`<button class="btn x" data-rr="${k}">${T('rr_'+k)}</button>`).join('')}</div>`,[[T('cancel'),'',()=>{}]]);document.querySelectorAll('[data-rr]').forEach(b=>b.onclick=async()=>{document.querySelector('#mbox .acts button')?.click();try{await rpcS('report_player',{p_target:v,p_reason:b.dataset.rr});toast(T('reported'))}catch(e){err(e)}})},
 mute:async v=>{try{if(muted.has(v)){await sb.from('mutes').delete().eq('user_id',uid).eq('muted',v);muted.delete(v)}else{const{error}=await sb.from('mutes').insert({user_id:uid,muted:v});if(error)throw error;muted.add(v)}toast(muted.has(v)?T('muted'):T('unmuted'));openProfile(v)}catch(e){err(e)}},
 pAv:v=>{window.__pav=v;rerender()},
 saveProf:async()=>{const n=val('pNick');if(!nickOK(n))return toast(T('nick_bad'));try{await rpc('set_profile',{p_nick:n,p_avatar:window.__pav||prof.avatar});prof=await rpc('ensure_profile');toast(T('saved'));openProfile()}catch(e){err(e)}},
 link:async()=>{const em=val('pMail'),pw=val('pPass');if(!/^\S+@\S+\.\S+$/.test(em)||pw.length<8)return toast(T('email_bad'));
  const{error}=await sb.auth.updateUser({email:em,password:pw});if(error)return err(error);toast(T('email_sent'))},
 duel:v=>{const me=prof?.power||0;sb.from('profiles').select('nick,avatar,power').eq('id',v).single().then(({data:o})=>{if(!o)return;
  G.modal(`<div style="font-size:46px">🤺</div><h2>${T('duel_t')}</h2><div style="display:flex;justify-content:space-around;align-items:center;margin:8px 0"><div>${av(prof?.avatar,52)}<div class="sub">${T('you')}</div><b>⚔️ ${fmt(me)}</b></div><b style="font-size:20px">VS</b><div>${av(o.avatar,52)}<div class="sub">${esc(o.nick)}</div><b>⚔️ ${fmt(o.power)}</b></div></div><p class="sub">${T('duel_rules')}</p>`,[[T('cancel'),'x'],['🤺 '+T('duel_go'),'o',()=>OA.duelGo(v)]])})},
 duelGo:async v=>{try{lastDuel=v;const r=await rpc('duel',{p_target:v});if(r.win){inc('arena');window.__g&&window.__g.ushArena&&window.__g.ushArena()}replay(r,'🤺 '+T('duel_t'))}catch(e){err(e)}},
 league:()=>open('league',leagueHtml),
 cupRp:v=>{const[ri,mi]=String(v).split(',').map(Number),m=cupD?.cup?.bracket?.[ri]?.[mi];if(!m||!m.r)return;replay({kind:'cup',win:m.w===0,rounds:m.r,myMax:m.am,eMax:m.bm,att_nick:cupNm(m.a),att_avatar:m.a.avatar,att_power:m.a.pw,def_nick:cupNm(m.b),def_avatar:m.b.avatar,def_power:m.b.pw,cupT:T(['cup_r1','cup_r2','cup_r3'][ri])},'⚖️🏆 '+T(['cup_r1','cup_r2','cup_r3'][ri]))},
 cupShare:async()=>{if(!cupD?.cup)return;const cv=cupCard();window.__cupCv=cv;const blob=await new Promise(r=>cv.toBlob(r,'image/png'));const f=new File([blob],'son-fener-cup-'+cupD.week+'.png',{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Son Fener',text:T('cup_share_txt',[T(CUP_PN[cupD.cup.place])])+' '+location.origin+location.pathname});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast(T('cup_saved'))},
 invShare:async()=>{if(!refD)return;const url=location.origin+location.pathname+'?ref='+refD.code,txt=T('inv_msg',[refD.code]);try{if(navigator.share){await navigator.share({title:'Son Fener',text:txt,url});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(txt+' '+url);toast(T('inv_copied'))}catch(e){prompt(T('inv_t'),url)}},
 eqcup:async()=>{cupD=null;open('eqcup',cupHtml);try{cupD=await rpc('eq_cup_get');if(cur==='eqcup')G.renderSheet()}catch(e){err(e)}},
 cupGo:async()=>{try{cupD=await rpc('eq_cup_run');const rw=cupD.cup.reward;G.L.addRes(G.S,rw);if(rw.ush)G.S.ush=(G.S.ush||0)+rw.ush;G.save();G.ui();G.SFX&&G.SFX.win&&G.SFX.win();G.toast('🏆 '+T('cup_you',[T({1:'cup_p1',2:'cup_p2',3:'cup_p3',5:'cup_p5'}[cupD.cup.place])])+' '+rwTxt(rw));if(cur==='eqcup')G.renderSheet()}catch(e){err(e)}},
 fwAtk:async()=>{try{const r=await rpc('fw_attack');if(r.def_avatar==='🌫️')r.def_avatar='sisnur';r.def_nick=r.def_nick==='Duman Ordusu'?T('fw_npc'):r.def_nick;replay(r,'🏮 '+T('fw_t'))}catch(e){err(e)}},
 fw:async()=>{try{fwData=await rpc('fener_war_me');fwMark()}catch(e){fwData=null}open('fw',fwHtml)},
 unprotect:async()=>{try{await rpc('drop_protection');prof.has_attacked=true;toast(T('prot_removed'))}catch(e){err(e)}},
 eqArena:()=>{window.__eqArena=!window.__eqArena;openPvp()},
 raid:async v=>{try{await push();const r=await rpc('raid',{p_target:v});if(r.win)inc('raid');prof&&(prof.has_attacked=true);r.kind='raid';replay(r,'🏴‍☠️ '+T('t_raid'))}catch(e){err(e)}},
 revenge:async v=>{try{await push();const r=await rpc('revenge',{p_battle:+v});if(r.win)inc('raid');r.kind='raid';replay(r,'🔥 '+T('revenge_t'))}catch(e){err(e)}},
 tourJoin:async()=>{try{const r=await rpc('tour_join');if(r.err)return toast('⚠️ '+T('tour_e_'+r.err));toast('✅ '+T('tour_joined'));openPvp('tour')}catch(e){err(e)}},
 tourFight:async v=>{try{await push();const r=await rpc('tour_fight',{p_target:v});if(r.err)return toast('⚠️ '+T('tour_e_'+r.err));replay(r,'🎖️ '+T('tour_t'))}catch(e){err(e)}},
 arena:async v=>{try{await push();const r=await rpcS('arena_fight',{p_target:v,p_equal:!!window.__eqArena});if(r.win)inc('arena');arena=r.arena;replay(r,'🏟️ '+T('arena_t'))}catch(e){err(e)}},
 fJoin:async()=>{try{war=await rpc('front_join');war._t=Date.now();toast(war.phase==='queue'?T('war_queued'):T('war_matched'));openPvp('war')}catch(e){err(e)}},
 fRp:async v=>{try{const r=await rpc('front_replay',{p_bid:+v});r.spect=r.att_nick!==(prof?.nick);const m=a=>Math.max(1,...(r.rounds||[]).map(x=>x[a]));r.myMax=(r.rounds[0]?.hp+r.rounds[0]?.d2)||m('hp');r.eMax=(r.rounds[0]?.eHp+r.rounds[0]?.d1)||m('eHp');replay(r,'▶️ '+T('war_t'))}catch(e){err(e)}},
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
function initErr(){Object.assign(SERR,{'Geçersiz bağış':'err.don_bad','Bugünkü bağış hakkın bitti':'err.don_limit','Yeterli kaynak yok':'err.no_res','Önce oyunu kaydet':'err.save_first','Önce bir klana katıl':'err.need_clan','Sadece lider/yardımcı savaşa kaydolabilir':'err.officer','Klanın zaten bir savaşta':'err.in_war','Savaş henüz başlamadı':'err.not_started','Savaş bitti':'err.war_over',
 'Savaş başladıktan sonra katıldın':'err.late','Hedef rakip klanda değil':'err.not_foe','3 saldırı hakkın bitti':'err.no_attacks','Biraz bekle':'err.wait','Kayıt yok':'err.no_save','Ordun boş — önce mızrakçı eğit':'err.empty_fleet',
 'Kendine saldıramazsın':'err.self','Ordu hâlâ dönüyor, biraz bekle':'err.fleet_back','Bugünkü baskın hakkın bitti':'err.raid_limit','Hedef kalkan altında':'err.shield','Yeni komutan koruması (7 gün)':'err.newbie','Başka bölgede':'err.region',
 'Klan arkadaşına saldıramazsın':'err.clanmate','Bugünkü arena biletin bitti':'err.tickets','Komutanın yok':'err.no_caps','Sohbetten geçici olarak susturuldun':'err.chat_muted','Mesaj 1-200 karakter olmalı':'err.msg_len','Çok hızlı yazıyorsun':'err.too_fast',
 'Dakikada en fazla 12 mesaj':'err.per_min','Kanal yok':'err.channel','Kendinle savaşamazsın':'err.self','Çatışma yalnızca Cuma-Cumartesi':'err.fw_clash_only','Bugünkü saldırı hakların bitti (3/3)':'err.fw_no_attacks','Eşleşme yok':'err.fw_no_match','Bölge yok':'err.no_region','arena_weak':'err.arena_weak','blocked':'err.blocked','bad_target':'err.bad_target','not_admin':'err.not_admin'})}
// b35: Etkinlik Takvimi merkezi — tüm zamanlı etkinlikler, evreler, geri sayımlar, kısayol
let cal=null,calTimer=0;
const IST3=3*36e5,istWeek=t=>{const d=new Date(t+IST3),dw=(d.getUTCDay()+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-IST3-dw*864e5};
async function openCal(){cal=cal||{};open('cal',calHtml);if(online){const q=(n)=>rpc(n).catch(()=>null);const[tr,fw,fr,cr]=await Promise.all([q('tour_me'),q('fener_war_me'),q('front_status'),q('craid_me')]);cal={tour:tr,fw,front:fr,craid:cr,_t:Date.now()}}else cal={_t:Date.now()};if(sheetIs('cal'))rerender();clearInterval(calTimer);calTimer=setInterval(()=>{if(!sheetIs('cal'))return clearInterval(calTimer);rerender()},1000)}
function calRows(){const now=Date.now(),L=G.L,c=cal||{},R=[],wk=istWeek(now);
 const add=(k,ic,nm,ph,phs,end,lbl,dis)=>R.push({k,ic,nm,ph,phs,end,lbl,dis});
 // Turnuva: Pzt–Per kayıt, Cum–Paz maçlar
 {const sat=wk+4*864e5,mon=wk+7*864e5,bat=c.tour?c.tour.dow>=5:now>=sat;add('tour','🎖️',T('t_tour'),bat?1:0,[T('tour_ph_reg'),T('tour_ph_bat')],bat?mon:sat,bat?'cal_ends':'cal_next_ph',null)}
 // Fener Savaşı (bölge): server evreleri
 {const d=c.fw;if(d){const P=['prep','clash','reward'],pi=Math.max(0,P.indexOf(d.phase||'prep')),ends=[d.clash_at,d.reward_at,d.end_at];add('fw','🏮',T('fw_t'),pi,P.map(p=>T('fw_ph_'+p)),+ends[pi],pi<2?'cal_next_ph':'cal_ends',null)}else add('fw','🏮',T('fw_t'),-1,[],0,'',online?null:'offline')}
 // Cephe Savaşı (klan)
 {const d=c.front;if(!d||d.phase==='noclan'||d.phase==='none'&&!d.region&&!online)add('front','🌫️',T('t_front'),-1,[],0,'',online?'noclan':'offline');
  else if(d.phase==='prep'||d.phase==='battle'||d.phase==='result'){const P=['prep','battle','result'],pi=P.indexOf(d.phase);add('front','🌫️',T('t_front'),pi,P.map(p=>T('ph_'+p)),pi===0?Date.parse(d.starts_at):pi===1?Date.parse(d.ends_at):0,pi===0?'cal_next_ph':pi===1?'cal_ends':'',null)}
  else add('front','🌫️',T('t_front'),-1,[],0,d.phase==='queue'?'cal_queue':'cal_front_idle',null)}
 // Klan Baskını (haftalık)
 {const d=c.craid;if(d)add('craid','🐉',T('rk_craid'),d.killed?1:0,[T('ph_battle'),T('cal_killed')],+d.end,'cal_ends',null);else add('craid','🐉',T('rk_craid'),-1,[],0,'',online?'noclan':'offline')}
 // Kraken Avı (haftalık, Pzt 03:00)
 add('boss','👹',T('cal_kraken'),0,[],Date.UTC(2024,0,1)+(Math.floor((now-Date.UTC(2024,0,1))/(7*864e5))+1)*7*864e5,'cal_ends',null);
 // Arena sezonu (aylık) ve Sezon etkinliği
 add('arena','🏟️',T('cal_arena'),0,[],seasonEndTs(),'cal_ends',online?null:'offline');
 if(L.seasonEnd&&L.seasonEnd()>now)add('season','🌫️',T('cal_season',[L.SEASON.id]),0,[],L.seasonEnd(),'cal_ends',null);
 // Günün teması
 add('daily','🗓️',T('cal_daily'),0,[],(Math.floor((now+IST3)/864e5)+1)*864e5-IST3,'cal_ends',null);
 return R}
function calHtml(){const now=Date.now(),fT=ms=>{const x=Math.max(0,(ms-now)/1000);return x>=172800?T('cal_dh',[Math.floor(x/86400),Math.floor(x%86400/3600)]):G.fmtT(x)};let h=G.hdr('📅 '+T('cal_t'))+`<div class="sub" style="margin:-4px 0 8px">${T('cal_d')}</div>`;
 for(const r of calRows()){const ph=r.ph>=0&&r.phs.length?`<div class="wtl" style="margin:4px 0">${r.phs.map((n,i)=>`<div class="wst ${i===r.ph?'on':i<r.ph?'done':''}">${n}</div>`).join('<b>›</b>')}</div>`:'';
  const nxt=r.phs[r.ph+1],cd=r.end&&r.end>now?(r.lbl==='cal_next_ph'&&nxt?T('cal_next_ph',[nxt,fT(r.end)]):T('cal_ends',[fT(r.end)])):r.lbl&&r.lbl!=='cal_ends'&&r.lbl!=='cal_next_ph'?T(r.lbl):'';
  const sub=r.dis==='offline'?T('offline_msg'):r.dis==='noclan'?T('cal_noclan'):cd;
  h+=`<div class="card" id="cal_${r.k}"><div class="ic">${r.ic}</div><div class="mid"><div class="nm">${r.nm}</div>${ph}<div class="sub">⏳ ${sub}</div></div><button class="btn o sm" data-o="calGo" data-v="${r.k}" ${r.dis==='offline'?'disabled':''}>${T('cal_go')}</button></div>`}
 const B=G.L.bonusSched?G.L.bonusSched(now,7):[];h+=`<div class="sec">⚡ ${T('cal_bonus')}</div>`;
 for(const b of B.slice(0,6)){const live=b.start<=now;h+=`<div class="card"><div class="ic">${b.ic}</div><div class="mid"><div class="nm">${T('cal_b_'+b.id)}${live?` <span class="tag" style="background:#3fb950">${T('cal_live')}</span>`:''}</div><div class="sub">⏳ ${live?T('cal_ends',[fT(b.end)]):T('cal_starts',[fT(b.start)])}</div></div><button class="btn sm" data-o="calGo" data-v="daily">${T('cal_go')}</button></div>`}
 return h+`<div class="sub" style="margin-top:8px">🕒 ${T('cal_tz')}</div>`}
OA.cal=()=>openCal();
OA.calGo=v=>{clearInterval(calTimer);const m={tour:()=>openPvp('tour'),fw:()=>OA.fw(),front:()=>openPvp('war'),craid:()=>cal?.craid?openCraid():openClan(),boss:()=>G.openBoss(),arena:()=>openPvp('arena'),season:()=>G.openShop(),daily:()=>G.openEvent()};(m[v]||m.daily)()};
// Savaş Revizyonu Faz A: ortak dünya haritası (2B arayüz; 3B görselleştirme sanat akışında — kancalar: __online.world)
let W={me:null,v:null,vx:0,vy:0,sel:null,res:[],conf:0,busy:0},wdTimer=0,wdPoll=0;const WV=11,wL=new Set();
const wEmit=(type,data)=>{for(const f of wL)try{f(type,data)}catch(e){console.warn(e)}};
async function wLoad(){try{[W.v]=await Promise.all([rpc('world_view',{p_x:W.vx,p_y:W.vy,p_w:WV,p_h:WV}),wExtra()]);wEmit('view',W.v)}catch(e){err(e)}}
async function wResolve(){try{const r=await rpc('world_resolve');if(r&&r.length){W.res=[...r,...W.res].slice(0,5);for(const b of r){wEmit('battle',b);G.toast((b.win?'🏆 ':'💀 ')+(b.lvl?T(b.win?'w_won':'w_lost',[b.lvl]):T(b.win?'w_pvp_won':'w_pvp_lost',[b.def||b.relic||''])))}W.me=await rpc('world_me')}}catch(e){}}
async function openWorld(){if(!online){open('world',()=>hdr('🗺️ '+T('w_t'))+offline());return}if(!PY)paySync().catch(()=>{});
 try{W.me=await rpc('world_me')}catch(e){return err(e)}W.vx=W.me.x-(WV>>1);W.vy=W.me.y-(WV>>1);W.sel=null;if(clan)rpc('fort_info').then(r=>{FT=r}).catch(()=>{});await wResolve();await wLoad();open('world',worldHtml);
 clearInterval(wdTimer);wdTimer=setInterval(()=>{if(!sheetIs('world'))return clearInterval(wdTimer);const t=Date.now();if((W.me?.marches||[]).some(m=>!m.done&&m.arrive<=t))wResolve().then(wLoad);if(++wdPoll%5===0)wLoad().then(rerender);else rerender()},1000)}
function wCell(x,y){const v=W.v||{},e=W.x||{};return{isl:(v.isl||[]).find(i=>i.x===x&&i.y===y),camp:(v.camps||[]).find(c=>c.x===x&&c.y===y),fort:(e.forts||[]).find(f=>f.x===x&&f.y===y),relic:(e.relics||[]).find(r=>r.x===x&&r.y===y)}}
const wCol=id=>`hsl(${(parseInt(String(id).replace(/\D/g,'').slice(0,6)||'0')*47)%360} 70% 55%)`;
function worldHtml(){const v=W.v||{isl:[],camps:[],marches:[]},me=W.me||{},now=Date.now(),N=me.n||120;
 let h=hdr('🗺️ '+T('w_t'))+`<div class="sub" style="margin:-4px 0 6px">${T('w_d')} · 📍 ${me.x},${me.y}</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px"><button class="btn sm g" data-o="city">🏰 ${T('c_t')}</button><button class="btn sm" data-o="wArmy">🪖 ${T('w_army')}</button><button class="btn sm o" data-o="fort">🏯 ${T('f_t')}</button><button class="btn sm" data-o="wRep">📜 ${T('w_reports')}</button>${W.x?.window?`<span class="tag" style="background:#ff4a5a">🔴 ${T('f_win_on')}</span>`:''}</div>`;
 // klan bölgesi: klan adalarının 2 hücre çevresi
 const terr={};for(const f of (W.x?.forts||[]))for(let dx=-f.r;dx<=f.r;dx++)for(let dy=-f.r;dy<=f.r;dy++)terr[(f.x+dx)+','+(f.y+dy)]=f.mine?'#3fb950':wCol(f.cid);for(const i of v.isl)if(i.cid)for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)terr[(i.x+dx)+','+(i.y+dy)]=i.mate?'#3fb950':wCol(i.cid);
 const mpos={};for(const m of v.marches){const f=Math.min(1,Math.max(0,(now-m.t0)/(m.t1-m.t0)));mpos[Math.round(m.fx+(m.tx-m.fx)*f)+','+Math.round(m.fy+(m.ty-m.fy)*f)]=m}
 h+=`<div id="wGrid" style="display:grid;grid-template-columns:repeat(${WV},1fr);gap:1px;background:#2c3a22 url(img/a/world_tile.webp) 0 0/120px;padding:3px;border-radius:10px">`;
 for(let y=W.vy;y<W.vy+WV;y++)for(let x=W.vx;x<W.vx+WV;x++){const out=x<0||y<0||x>=N||y>=N,{isl,camp,fort,relic}=wCell(x,y),t=terr[x+','+y],m=mpos[x+','+y],sel=W.sel&&W.sel.x===x&&W.sel.y===y;
  let ic='',lab='';if(fort){ic=fort.burn?'🔥':'🏯';lab='['+fort.tag+'] '+fort.lvl}else if(relic){ic='🏰';lab=relic.tag?'['+relic.tag+']':'#'+relic.id}else if(isl){{const lv=+(isl.lvl||isl.lv||1);ic=`<img src="img/a/wm${lv>=20?3:lv>=10?2:1}.webp" alt="" loading="lazy" style="width:118%;margin:-14% 0 -6%">`+(isl.sh?'<span style="position:absolute;font-size:10px;top:0;right:0">🛡️</span>':'')};lab=(isl.tag?'['+isl.tag+'] ':'')+isl.nick}else if(camp){ic='<img src="img/a/wm4.webp" alt="" loading="lazy" style="width:110%;margin:-10% 0 -4%">';lab=T('w_lv',[camp.lvl])}if(m)ic+=`<img src="img/a/t_cav2.webp" alt="" class="${m.me?'':'wen'}" style="width:80%">`;
  h+=`<div data-o="wSel" data-v="${x},${y}" style="aspect-ratio:1;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:17px;line-height:1;overflow:hidden;position:relative;background:${out?'#0a0806':t?t+'33':'#0000'};${t?'box-shadow:inset 0 0 0 1px '+t+';':''}${sel?'outline:2px solid #ffd76a;':''}${isl&&isl.me?'outline:2px solid #7fe0ff;':''}">${ic}<span style="font-size:7px;max-width:100%;white-space:nowrap;overflow:hidden;color:#dff">${lab}</span></div>`}
 h+=`</div><div style="display:flex;gap:6px;justify-content:center;margin:6px 0">${[['◀','-5,0'],['▲','0,-5'],['▼','0,5'],['▶','5,0']].map(([a,d])=>`<button class="btn sm" data-o="wPan" data-v="${d}">${a}</button>`).join('')}<button class="btn sm o" data-o="wHome">📍 ${T('w_home')}</button></div>`;
 h+=wSelHtml(now);
 const mine=(me.marches||[]).filter(m=>!m.done);if(mine.length)h+=`<div class="sec">🐎 ${T('w_marches')}</div>`+mine.map(m=>`<div class="card"><div class="ic">${m.kind==='pvp'?'⚔️':m.kind==='rally'?'🚩':m.kind==='pirate'?'🏴‍☠️':'👾'}</div><div class="mid"><div class="nm">${m.lvl?T('w_lv',[m.lvl]):'📍'} · ${m.tx},${m.ty}</div><div class="sub">⏳ ${G.fmtT(Math.max(0,(m.arrive-now)/1000))}</div></div></div>`).join('');
 if(W.res.length)h+=`<div class="sec">📜 ${T('w_reports')}</div>`+W.res.map(b=>`<div class="card"><div class="ic">${b.win?'🏆':'💀'}</div><div class="mid"><div class="nm">${b.lvl?T(b.win?'w_won':'w_lost',[b.lvl]):T(b.win?'w_pvp_won':'w_pvp_lost',[esc(b.def||b.relic||'')])}</div><div class="sub">⚔️ ${G.fmt(b.pw||b.a0||0)} vs ${G.fmt(b.ep||b.d0||0)} · ${(b.log||[]).length} ${T('w_events')} · ${(b.log||[]).filter(e=>e.t==='skill').length}✨${b.loot?' · '+Object.entries(b.loot).map(([k,n])=>G.fmt(n)+' '+({wood:'🪵',fish:'🌾',crys:'🔮'}[k]||k)).join(' '):''}</div></div></div>`).join('');
 return h+`<div class="sub" style="margin-top:6px">🔄 ${T('w_respawn',[G.fmtT(Math.max(0,((v.next||0)-now)/1000))])}</div>`}
function wSelHtml(now){const s=W.sel;if(!s)return `<div class="sub" style="text-align:center">${T('w_tap')}</div>`;const{isl,camp,fort,relic}=wCell(s.x,s.y),me=W.me||{},dist=Math.hypot(s.x-me.x,s.y-me.y),secs=Math.min(180,10+Math.ceil(dist*3)),myPw=((W.v?.isl||[]).find(i=>i.me)||{}).pw||prof?.power||0;
 const card=(ic,nm,sub,btns)=>`<div class="card" style="flex-wrap:wrap"><div class="ic">${ic}</div><div class="mid"><div class="nm">${nm}</div><div class="sub">${sub}</div></div><div style="display:flex;gap:4px;flex-wrap:wrap;width:100%;margin-top:6px">${btns}</div></div>`;
 const win=!!W.x?.window;if(fort){const p=Math.round(100*fort.dur/Math.max(1,fort.max));return card(fort.burn?'🔥':'🏯',T('w_fort',['['+esc(fort.tag)+']',fort.lvl]),`🧱 ${G.fmt(fort.dur)}/${G.fmt(fort.max)} (${p}%)${fort.burn?' · 🔥':''} · 📏 ${fort.r}`,fort.mine?`<button class="btn sm g" data-o="fort">🏯 ${T('f_t')}</button>`:`<button class="btn sm r" data-o="wRallyF" data-v="${fort.cid}" ${win&&clan?'':'disabled'}>🚩 ${T('w_rally')}</button>${win?'':`<span class="sub">🕒 ${T('w_window_off')}</span>`}`)}
 if(relic)return card('🏰',T('w_relic',[relic.id]),`${relic.tag?'['+esc(relic.tag)+']':T('w_relic_free')} · ${T('w_relic_d')}`,relic.mine?'':`<button class="btn sm r" data-o="wRallyR" data-v="${relic.id}" ${win&&clan?'':'disabled'}>🚩 ${T('w_rally')}</button>${win?'':`<span class="sub">🕒 ${T('w_window_off')}</span>`}`);
 if(isl){if(isl.me)return card('🏰',isl.nick+' · '+T('w_you'),`📍 ${s.x},${s.y} · ⚔️ ${G.fmt(isl.pw)}${isl.sh?' · 🛡️ '+T('w_shield'):''}`,`<button class="btn sm" data-o="wShield" data-v="8">🛡️ ${T('w_shield_buy',[8])} · 💎${vipD(9,150)}</button><button class="btn sm" data-o="wShield" data-v="24">🛡️ ${T('w_shield_buy',[24])} · 💎${vipD(9,350)}</button><button class="btn sm" data-o="wArmy">🪖 ${T('w_army')}</button>`);
  return card(isl.sh?'🛡️':'🏘️',(isl.tag?`[${isl.tag}] `:'')+isl.nick,`${T('w_lvp',[isl.lv||1,G.fmt(isl.pw||0)])}${isl.sh?' · 🛡️ '+T('w_shield'):''}${isl.mate?' · 🤝 '+T('w_mate'):''}`,
   (WSC[isl.id]?`<div class="sub" style="width:100%">🔭 ${trStr(WSC[isl.id].troops)} · ${fmtR(WSC[isl.id].res)}</div>`:'')+`<button class="btn sm" data-o="wScout" data-v="${isl.id}">🔭 ${T('w_scout')} · 50🌾</button><button class="btn sm r" data-o="wAtk" data-v="${isl.id}" ${isl.sh||isl.mate?'disabled':''}>⚔️ ${T('w_attack')}</button><button class="btn sm r" data-o="wRallyP" data-v="${isl.id}" ${isl.sh||isl.mate||!clan?'disabled':''}>🚩 ${T('w_rally')}</button><button class="btn sm" data-o="wProf" data-v="${isl.id}">👤</button><button class="btn sm" data-o="dmOpen" data-v="${isl.id}">✉️ ${T('w_msg')}</button><button class="btn sm g" data-o="frAdd" data-v="${isl.id}">➕ ${T('w_friend')}</button>`)}
 if(camp){const est=Math.round(100*Math.max(0.03,Math.min(0.97,0.5+(myPw-camp.pw)/(2*Math.max(camp.pw,myPw,1)))));const busy=(me.marches||[]).some(m=>!m.done);
  return card(camp.k==='pirate'?'🏴‍☠️':'👾',T(camp.k==='pirate'?'w_pirate':'w_fog')+' · '+T('w_lv',[camp.lvl]),`⚔️ ${G.fmt(camp.pw)} · ${T('w_mypw',[G.fmt(myPw)])} · ${T('w_est',[est])} · ⏱️ ${G.fmtT(secs)}`,`<button class="btn sm r" data-o="wMarch" data-v="${s.x},${s.y}" ${busy?'disabled':''}>🐎 ${busy?T('w_qfull'):T('w_march')}</button>`)}
 const N=me.n||120;if(s.x<0||s.y<0||s.x>=N||s.y>=N)return '';
 const canF=clan&&FT?.lead&&!FT?.fort;return card('🔥',T('w_empty'),`📍 ${s.x},${s.y}`,(canF?`<button class="btn sm g" data-o="fPlace" data-v="${s.x},${s.y}">🏯 ${W.conf===2?T('w_place_ok'):T('w_place')}</button>`:'')+`<button class="btn sm o" data-o="wReloc" data-v="${s.x},${s.y}">🧭 ${W.conf?T('w_reloc_ok',[me.reloc_cost||200]):T('w_reloc',[me.reloc_cost||200])}</button>`)}
OA.wSel=v=>{const[x,y]=v.split(',').map(Number);W.sel={x,y};W.conf=0;const c=wCell(x,y);wEmit('select',{x,y,...c});rerender()};
OA.wPan=v=>{const[dx,dy]=v.split(',').map(Number);W.vx+=dx;W.vy+=dy;wLoad().then(rerender)};
OA.wHome=()=>{W.vx=W.me.x-(WV>>1);W.vy=W.me.y-(WV>>1);wLoad().then(rerender)};
OA.wScout=v=>openProfile(v);
OA.wMarch=async v=>{if(W.busy)return;W.busy=1;const[x,y]=v.split(',').map(Number);try{const r=await rpc('world_attack_camp',{p_x:x,p_y:y});G.toast('🐎 '+T('w_sent',[G.fmtT(r.secs)]));W.me=await rpc('world_me');wEmit('march',r);await wLoad()}catch(e){err(e)}W.busy=0;rerender()};
OA.wReloc=async v=>{if(!W.conf){W.conf=1;return rerender()}W.conf=0;const[x,y]=v.split(',').map(Number);try{await push();const r=await rpc('world_relocate',{p_x:x,p_y:y});sumAdopt(r);G.toast('🧭 '+T('w_moved'));W.me=await rpc('world_me');OA.wHome()}catch(e){err(e)}};
OA.world=()=>openWorld();
// Savaş Revizyonu Faz B/C: ordu (kademe/revir/karşı-tip), dizilim, PvP, keşif, kalkan, rally, Klan Kalesi, kadim fenerler
Object.assign(SERR,{'Kaynak yetersiz':'w_e_res','Yeterli birlik yok':'w_e_troops','Geçersiz':'w_e_bad','Sefer kuyruğu dolu':'w_qfull','Revir boş':'w_e_revir','En üst kademe':'w_e_max','Klan gerekli':'w_e_clan','Savaş penceresi kapalı':'w_e_window','Klanın zaten bir toplu saldırı hazırlıyor':'w_e_rally1','Toplu saldırı kapandı':'w_e_rclosed','Zaten katıldın':'w_e_joined','Toplu saldırı dolu':'w_e_rfull','Yalnızca klan lideri':'w_e_lead','Klanın zaten bir kalesi var':'w_e_hasfort','Kasabana çok uzak':'w_e_far','Konum dolu':'w_e_taken','Kale yok':'w_e_nofort','En üst seviye':'w_e_max','Garnizonda birliğin yok':'w_e_nogar','Kale sağlam':'w_e_intact','Sefer sürerken kalkan açılamaz':'w_e_shmarch','Hedef yok':'w_e_notgt','Geçersiz konum':'w_e_taken','Bu kamp zaten temizlendi':'w_e_cleared','Sefer sürerken taşınamazsın':'w_e_shmarch'});
let AR=null,FT=null,WR=[],WS={},fTimer=0,fPoll=0;const WSC={};
const WTY=['tayfa','zipkin','topcu'],WTIC={tayfa:'🎖️',zipkin:'🔱',topcu:'💣'},WBEAT={tayfa:'zipkin',zipkin:'topcu',topcu:'tayfa'},WRIC={wood:'🪵',fish:'🌾',crys:'🔮'};
const tyN=t=>T('w_ty_'+t),fmtR=o=>Object.entries(o||{}).filter(([,n])=>+n).map(([k,n])=>G.fmt(+n)+(WRIC[k]||'')).join(' '),trStr=o=>WTY.map(t=>WTIC[t]+' '+G.fmt(Math.floor(+(o?.[t]||0)))).join(' ');
function wAdopt(r){if(!r)return;const S=G.S;if(r.rev!=null){rev=r.rev;localStorage.setItem('sf_rev',rev)}if(r.saved!=null)localStorage.setItem('sf_ssv',r.saved);if(r.res)for(const k in r.res)if(k in S.res)S.res[k]=+r.res[k];if(r.troops)for(const k in r.troops)if(k in S.troops)S.troops[k]=+r.troops[k];if(r.gems!=null)S.gems=+r.gems;G.save();G.ui()}
// --- Ordu ---
async function openArmy(){if(!online)return open('army',()=>hdr('🪖 '+T('w_army'))+offline());try{if(!PY)await paySync().catch(()=>{});AR=await rpc('army_info')}catch(e){return err(e)}open('army',armyHtml)}
function armyHtml(){const S=G.S,a=AR||{tier:{},revir:{}};let h=hdr('🪖 '+T('w_army'))+`<div class="sub" style="margin-bottom:6px">🔁 ${T('w_counter_d')}<br>📜 ${T('c_ak_d')}</div>`;
 for(const t of WTY){const tr=+(a.tier?.[t]||1),c={fish:600*tr*tr,wood:450*tr*tr,crys:80*tr*tr};
  h+=`<div class="card"><div class="ic">${WTIC[t]}</div><div class="mid"><div class="nm">${tyN(t)} · T${tr}</div><div class="sub">${G.fmt(Math.floor(S.troops[t]||0))} · ×${(1+.3*(tr-1)).toFixed(1)} · ${T('w_beats',[tyN(WBEAT[t])])}</div></div>${tr<5?`<button class="btn sm" data-o="wTier" data-v="${t}">⬆️ T${tr+1}<br><small>${fmtR(c)}</small></button>`:`<span class="tag">T5</span>`}</div>`}
 const rv=a.revir||{},rn=WTY.reduce((x,t)=>x+Math.floor(+(rv[t]||0)),0);
 h+=`<div class="sec">🏥 ${T('w_revir')} · ${G.fmt(rn)}/${G.fmt(a.cap||0)}</div><div class="sub">${T('w_revir_d')}</div>`;
 if(rn)h+=`<div class="card"><div class="mid"><div class="nm">${trStr(rv)}</div></div></div><div style="display:flex;gap:6px;margin-top:4px"><button class="btn g" data-o="wHeal" data-v="0">💊 ${T('w_heal')} · ${fmtR({fish:2*rn,wood:rn})}</button><button class="btn o" data-o="wHeal" data-v="1">💎 ${Math.ceil(rn/10*((PY?.vip??0)>=8?.75:1))}</button></div>`;else h+=`<div class="sub">${T('w_revir_e')}</div>`;
 const b=a.buff||{};return h+`<div class="sec">✨ ${T('w_buffs')}</div><div class="sub">⚔️ ×${b.m||1} · 🏯 +${Math.round((b.fort||0)*100)}% · 🏰 +${Math.round((b.relic||0)*100)}%</div>`}
OA.wArmy=()=>openArmy();
OA.wTier=async t=>{try{await push();const r=await rpc('army_tier_up',{p_t:t});wAdopt(r);AR.tier=r.tier;G.toast('⬆️ '+T('w_tier_ok',[tyN(t),r.tier[t]]));rerender()}catch(e){err(e)}};
OA.wHeal=async v=>{try{await push();const r=await rpc('army_heal',{p_gems:v==='1'});wAdopt(r);G.toast('💊 '+T('w_healed',[G.fmt(r.healed)]));AR=await rpc('army_info');rerender()}catch(e){err(e)}};
// --- Dizilim / gönderme ---
function openSend(mode,tgt,label,kind){const S=G.S;WS={mode,tgt,label,kind,wait:60,tr:{}};for(const t of WTY)WS.tr[t]=Math.floor(S.troops[t]||0);open('wsend',sendHtml)}
function sendHtml(){const S=G.S,sc=WSC[WS.tgt];let h=hdr('⚔️ '+T('w_form'))+`<div class="sub" style="margin-bottom:6px">🎯 ${esc(WS.label||'')}</div>`;
 for(const t of WTY){const mx=Math.floor(S.troops[t]||0);h+=`<div class="card"><div class="ic">${WTIC[t]}</div><div class="mid"><div class="nm">${tyN(t)} <small data-wl="${t}">${G.fmt(WS.tr[t])}/${G.fmt(mx)}</small></div><input type="range" min="0" max="${mx}" value="${Math.min(WS.tr[t],mx)}" data-wt="${t}" style="width:100%"></div></div>`}
 if(sc){const e=sc.troops||{},big=WTY.slice().sort((a,b)=>(e[b]||0)-(e[a]||0))[0],ctr=WTY.find(t=>WBEAT[t]===big);h+=`<div class="card"><div class="ic">🔭</div><div class="mid"><div class="nm">${WTY.map(t=>WTIC[t]+' ~'+G.fmt(e[t]||0)).join(' ')}</div><div class="sub">💡 ${T('w_hint',[tyN(big),tyN(ctr)])}</div></div></div>`}else h+=`<div class="sub">💡 ${T('w_hint0')}</div>`;
 if(WS.mode==='rally')h+=`<div style="display:flex;gap:6px;margin:6px 0">${[60,300].map(s=>`<button class="btn sm ${WS.wait===s?'g':''}" data-o="wWait" data-v="${s}">⏱️ ${G.fmtT(s)}</button>`).join('')}</div>`;
 const n=WTY.reduce((a,t)=>a+WS.tr[t],0),lab={pvp:'⚔️ '+T('w_attack'),rally:'🚩 '+T('w_rally'),join:'🚩 '+T('w_join'),gar:'🛡️ '+T('w_gar')}[WS.mode];
 return h+`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-o="wAll" data-v="1">100%</button><button class="btn sm" data-o="wAll" data-v="0.5">50%</button><button class="btn r" data-o="wGo" ${n<1?'disabled':''}>${lab} · ${G.fmt(n)}</button></div>`+(n<1?`<div class="sub">${T('w_e_troops')}</div>`:'')}
document.addEventListener('input',e=>{const t=e.target?.dataset?.wt;if(!t||!WS.tr)return;WS.tr[t]=+e.target.value;const l=document.querySelector(`[data-wl="${t}"]`);if(l)l.textContent=G.fmt(WS.tr[t])+'/'+G.fmt(Math.floor(G.S.troops[t]||0))});
document.addEventListener('change',e=>{if(e.target?.dataset?.wt&&sheetIs('wsend'))rerender()});
OA.wAll=v=>{for(const t of WTY)WS.tr[t]=Math.floor((G.S.troops[t]||0)*+v);rerender()};
OA.wWait=v=>{WS.wait=+v;rerender()};
OA.wGo=async()=>{if(W.busy)return;W.busy=1;try{await push();const tr=WS.tr;let r;
 if(WS.mode==='pvp')r=await rpc('world_attack_player',{p_target:WS.tgt,p_tr:tr});else if(WS.mode==='rally')r=await rpc('war_rally_start',{p_kind:WS.kind,p_target:String(WS.tgt),p_tr:tr,p_wait:WS.wait});
 else if(WS.mode==='join')r=await rpc('war_rally_join',{p_id:+WS.tgt,p_tr:tr});else r=await rpc('fort_garrison',{p_tr:tr});
 wAdopt(r);G.toast((WS.mode==='gar'?'🛡️ ':'🐎 ')+T('w_sent2'));wEmit('march',{mode:WS.mode,...r});W.busy=0;return WS.mode==='pvp'?openWorld():openFort()}catch(e){err(e)}W.busy=0};
OA.wAtk=v=>{const i=(W.v?.isl||[]).find(x=>x.id===v);openSend('pvp',v,i?.nick)};
OA.wRallyP=v=>{const i=(W.v?.isl||[]).find(x=>x.id===v);openSend('rally',v,'🏘️ '+(i?.nick||''),'player')};
OA.wRallyF=v=>{const f=(W.x?.forts||[]).find(x=>x.cid===v);openSend('rally',v,'🏯 ['+(f?.tag||'')+']','fort')};
OA.wRallyR=v=>openSend('rally',v,'🏰 '+T('w_relic',[v]),'relic');
OA.wScout=async v=>{try{await push();const r=await rpc('world_scout',{p_target:v});wAdopt(r);WSC[v]=r.scout;G.toast('🔭 '+T('w_scouted'));rerender()}catch(e){err(e)}};
OA.wProf=v=>openProfile(v);
OA.wShield=async v=>{try{await push();const r=await rpc('world_shield',{p_h:+v});wAdopt(r);if(prof)prof.shield_until=r.shield_until;G.toast('🛡️ '+T('w_shield_ok',[v]));await wLoad();rerender()}catch(e){err(e)}};
// --- Raporlar ---
async function openReports(){if(!online)return open('wrep',()=>hdr('📜 '+T('w_reports'))+offline());try{WR=await rpc('war_reports')}catch(e){return err(e)}open('wrep',repHtml)}
function repLine(r){const d=r.data||{};if(r.kind==='scout')return['🔭',T('w_r_scout',[esc(d.nick||'')]),trStr(d.troops)+' · '+fmtR(d.res)];
 const mine=d.att_id===uid,isFort=!!d.fort,won=mine?r.win:!r.win;const nm=isFort?T(mine?'w_r_fort_a':'w_r_fort_d',[esc(d.def||''),esc(d.att||'')]):d.relic?T('w_relic',[d.relic]):T(mine?'w_r_atk':'w_r_def',[esc(mine?d.def:d.att)]);
 return[won?'🏆':'💀',nm,`⚔️ ${G.fmt(d.a0||0)} → ${G.fmt(d.a1||0)} · 🛡️ ${G.fmt(d.d0||0)} → ${G.fmt(d.d1||0)} · ${(d.log||[]).filter(e=>e.t==='skill').length}✨`+(isFort?` · 🧱 -${G.fmt(d.fort.dmg)}${d.fort.burn?' 🔥':''}`:'')+(fmtR(d.loot)?' · '+fmtR(d.loot):'')]}
function repHtml(){let h=hdr('📜 '+T('w_reports'));if(!WR.length)return h+`<div class="sub">${T('w_r_none')}</div>`;
 return h+WR.map(r=>{const[ic,nm,sub]=repLine(r),d=r.data||{},rev=r.kind==='pvp'&&d.att_id&&d.att_id!==uid;return `<div class="card" style="flex-wrap:wrap"><div class="ic">${ic}</div><div class="mid"><div class="nm">${nm}</div><div class="sub">${sub}</div><div class="sub">🕒 ${new Date(r.at).toLocaleString(G.lang||undefined)}</div></div><div style="display:flex;gap:4px">${d.log?`<button class="btn sm" data-o="wPlay" data-v="${r.id}">▶️</button>`:''}${rev?`<button class="btn sm r" data-o="wRev" data-v="${d.att_id}">↩️ ${T('w_revenge')}</button>`:''}</div></div>`}).join('')}
OA.wRep=()=>openReports();
OA.wPlay=v=>{const r=WR.find(x=>String(x.id)===String(v));if(r){wEmit('battle',{...r.data,id:r.id,win:r.win,kind:r.kind,replay:true});G.toast('▶️ '+T('w_events_n',[(r.data.log||[]).length]))}};
OA.wRev=v=>openSend('pvp',v,'↩️ '+T('w_revenge'));
// --- Klan Kalesi ---
async function openFort(){if(!online)return open('fort',()=>hdr('🏯 '+T('f_t'))+offline());try{FT=await rpc('fort_info')}catch(e){return err(e)}open('fort',fortHtml);
 clearInterval(fTimer);fTimer=setInterval(()=>{if(!sheetIs('fort'))return clearInterval(fTimer);if(++fPoll%10===0)rpc('fort_info').then(r=>{FT=r;rerender()}).catch(()=>{});else rerender()},1000)}
const fLog=l=>{const d=l.d||{};return T('f_l_'+l.k,[esc(d.by||''),d.k?fmtR({[d.k]:d.n}):d.tr?trStr(d.tr):G.fmt(d.n||d.lvl||0),esc(d.tag||''),G.fmt(d.dmg||0)])};
function rallyHtml(f,now){if(!f.rallies?.length)return '';return `<div class="sec">🚩 ${T('f_rallies')}</div>`+f.rallies.map(r=>`<div class="card"><div class="ic">🚩</div><div class="mid"><div class="nm">${esc(r.leader)} → ${esc(r.tname||'')}</div><div class="sub">👥 ${r.n}/10 · ⚔️ ${G.fmt(r.tr)} · ${r.launched?T('f_marching'):'⏳ '+G.fmtT(Math.max(0,(r.until-now)/1000))}</div></div>${!r.joined&&!r.launched&&r.until>now?`<button class="btn sm r" data-o="fJoin" data-v="${r.id}">🚩 ${T('w_join')}</button>`:''}</div>`).join('')}
function fortHtml(){const f=FT||{},F=f.fort,now=Date.now();let h=hdr('🏯 '+T('f_t'));if(!f.clan)return h+`<div class="sub">${T('chat_need_clan')}</div>`;
 h+=`<div class="card"><div class="ic">${f.window?'🔴':'🕒'}</div><div class="mid"><div class="nm">${T(f.window?'f_win_on':'f_win_off')}</div><div class="sub">${T('f_win_d')}</div></div></div>`;
 h+=(f.incoming||[]).map(i=>`<div class="card" style="box-shadow:inset 0 0 0 2px #ff4a5a"><div class="ic">🚨</div><div class="mid"><div class="nm">${T('f_incoming',[esc(i.tag||'?')])}</div><div class="sub">${i.launched?T('f_marching'):'⏳ '+G.fmtT(Math.max(0,(i.until-now)/1000))} · ${T('f_inc_d')}</div></div></div>`).join('');
 if(!F)return h+`<div class="card"><div class="ic">🏯</div><div class="mid"><div class="nm">${T('f_none')}</div><div class="sub">${T(f.lead?'f_place_d':'f_place_lead')}</div></div>${f.lead?`<button class="btn g" data-o="world">🗺️</button>`:''}</div>`+rallyHtml(f,now);
 const pct=Math.round(100*F.dur/Math.max(1,F.max));
 h+=`<div class="card"><div class="ic">${F.burn?'🔥':'🏯'}</div><div class="mid"><div class="nm">${T('f_lv',[F.lvl])} · 📍 ${F.x},${F.y}</div><div class="sub">🧱 ${G.fmt(F.dur)}/${G.fmt(F.max)} (${pct}%)${F.burn?' · 🔥 '+T('f_burn',[G.fmtT(Math.max(0,(F.burn_until-now)/1000))]):''}</div><div style="height:6px;border-radius:3px;background:#0006;margin-top:4px"><div style="height:6px;border-radius:3px;width:${pct}%;background:${F.burn?'#ff7a3a':'#3fb950'}"></div></div></div></div>`;
 h+=`<div class="sub">✨ ${T('f_buffs',[Math.round(F.buff*100),Math.round(F.store*100),F.r])}${F.burn||!F.dur?' · ⚠️ '+T('f_buff_off'):''}</div>`;
 h+=`<div class="sec">🎁 ${T('f_upg')} · ${G.fmt(F.xp)}/${G.fmt(F.need)}</div><div style="display:flex;gap:4px;flex-wrap:wrap">${[['wood',500],['fish',500],['crys',100]].map(([k,n])=>`<button class="btn sm" data-o="fDon" data-v="${k}:${n}" ${F.lvl>=10?'disabled':''}>${fmtR({[k]:n})} → +${G.fmt(k==='crys'?n*3:n)}</button>`).join('')}</div>`;
 h+=`<div class="sec">🛠️ ${T('f_rep')}</div><button class="btn sm o" data-o="fRep" data-v="500" ${F.dur>=F.max?'disabled':''}>${fmtR({wood:500})} → +${G.fmt(1000)} 🧱</button>`;
 h+=`<div class="sec">🛡️ ${T('f_gar')}</div><div class="sub">${T('f_gar_d')}</div>`+((f.gar||[]).length?f.gar.map(g=>`<div class="card"><div class="mid"><div class="nm">${esc(g.nick)}</div><div class="sub">${trStr(g.tr)}</div></div>${g.me?`<button class="btn sm" data-o="fRecall">↩️ ${T('f_recall')}</button>`:''}</div>`).join(''):`<div class="sub">${T('f_gar_e')}</div>`)+`<button class="btn sm g" data-o="fGar" style="margin-top:4px">➕ ${T('w_gar')}</button>`;
 h+=rallyHtml(f,now)+`<div class="sec">📜 ${T('f_log')}</div>`+((f.log||[]).map(l=>`<div class="sub">${({placed:'🏯',donate:'🎁',lvl:'⬆️',garrison:'🛡️',repair:'🛠️',attacked:'⚔️'})[l.k]||'•'} ${fLog(l)}</div>`).join('')||`<div class="sub">—</div>`);
 return h}
OA.fort=()=>openFort();
const fAct=async(fn,args,msg)=>{try{await push();const r=await rpc(fn,args);wAdopt(r);if(r.fort)FT=r.fort;else FT=r;if(msg)G.toast(msg);rerender()}catch(e){err(e)}};
OA.fDon=v=>{const[k,n]=v.split(':');fAct('fort_donate',{p_k:k,p_n:+n},'🎁 '+T('f_donated'))};
OA.fRep=v=>fAct('fort_repair',{p_n:+v},'🛠️ '+T('f_repaired'));
OA.fRecall=()=>fAct('fort_recall',{},'↩️ '+T('f_recalled'));
OA.fGar=()=>openSend('gar',null,'🏯 '+T('f_t'));
OA.fJoin=v=>openSend('join',v,'🚩 '+T('w_rally'));
OA.fPlace=async v=>{if(!W.conf){W.conf=2;return rerender()}W.conf=0;const[x,y]=v.split(',').map(Number);try{FT=await rpc('fort_place',{p_x:x,p_y:y});G.toast('🏯 '+T('f_placed'));await wLoad();rerender()}catch(e){err(e)}};
async function wExtra(){try{W.x=await rpc('world_extra',{p_x:W.vx,p_y:W.vy,p_w:WV,p_h:WV});wEmit('extra',W.x)}catch(e){}}
// --- Son Fener Kalesi: şehir (sunucu kilitli) — görseller sanat akışında: __online.city / __online.army.lines ---
const CB=['kale','kisla','zkule','dokum','tezgah','revir','akademi','sur','ambar'],CIC={kale:'🏰',kisla:'⚔️',zkule:'🔱',dokum:'💣',tezgah:'🐎',revir:'🏥',akademi:'📜',sur:'🧱',ambar:'🏦'};
let CT=null,CTt=0;const cL=new Set();const cEmit=()=>{for(const f of cL)try{f(CT)}catch(e){}};
async function citySync(){if(!PY)paySync().catch(()=>{});CT=await rpc('city_info');CT.list.sort((x,y)=>CB.indexOf(x.key)-CB.indexOf(y.key));CTt=Date.now()-new Date(CT.now).getTime();cEmit();return CT}
const cNow=()=>Date.now()-CTt,cLeft=u=>Math.max(0,Math.ceil((new Date(u).getTime()-cNow())/1e3));
const cDur=s=>s>=3600?Math.floor(s/3600)+'h'+String(Math.floor(s%3600/60)).padStart(2,'0'):s>=60?Math.floor(s/60)+'m'+String(s%60).padStart(2,'0'):s+'s';
let cTim=0;async function openCity(){if(!online)return open('city',()=>hdr('🏰 '+T('c_t'))+offline());try{await citySync()}catch(e){return err(e)}open('city',cityHtml);
 clearInterval(cTim);cTim=setInterval(()=>{if(!sheetIs('city')&&!sheetIs('cform'))return clearInterval(cTim);if(CT?.q?.some(e=>cLeft(e.until)<=0))citySync().then(rerender).catch(()=>{});else if(sheetIs('city'))rerender()},1000)}
function cityHtml(){const c=CT;let h=hdr('🏰 '+T('c_t'))+`<div class="sub" style="margin-bottom:6px">${T('c_d')} · 🔨 ${c.q.length}/${c.slots}${c.slots<2?' · '+T('c_vip2'):''}</div>${c.slots<2?`<button class="btn sm o" data-o="cQ2" style="margin-bottom:6px">🔨 ${T('c_q2')} · 💎500</button>`:''}
 <div style="display:flex;gap:6px;margin-bottom:6px"><button class="btn sm o" data-o="cForm">🧭 ${T('c_form')}</button><button class="btn sm" data-o="wArmy">📜 ${T('c_research')}</button></div>`;
 for(const b of c.list){const n=b.next,bl=b.until?cLeft(b.until):0;let btn='';
  if(b.until)btn=`<button class="btn sm o" data-o="cSpeed" data-v="${b.key}">⏩ 💎${vipD(10,Math.max(1,Math.ceil(bl/60)))}</button>`;
  else if(n&&!n.req)btn=`<button class="btn sm g" data-o="cUp" data-v="${b.key}" ${c.q.length>=c.slots?'disabled':''}>⬆️ ${b.lvl?T('c_up'):T('c_build')}</button>`;
  const rq=n?.req==='kale'?T('c_req_kale',[Math.max(b.unlock,b.lvl+1)]):n?.req==='kisla_sur'?T('c_req_ks',[b.lvl]):'';
  h+=`<div class="card" id="cb_${b.key}"><div class="ic"><img src="img/a/b_${b.key}${b.lvl>=20?3:b.lvl>=10?2:1}.webp" alt="" loading="lazy" style="width:44px;height:44px;object-fit:contain" onerror="this.replaceWith('${CIC[b.key]}')"></div><div class="mid"><div class="nm">${T('c_b_'+b.key)} · ${b.lvl?T('c_lv',[b.lvl]):T('c_none')}</div><div class="sub">${T('c_x_'+b.key)}</div>
  <div class="sub">${b.until?'🔨 '+cDur(bl):n?fmtR(n.cost)+' · ⏱️ '+cDur(n.secs):T('c_max')}${rq?' · 🔒 '+rq:''}</div></div>${btn}</div>`}
 return h+`<div class="sub" style="margin-top:6px">${T('c_note')}</div>`}
const cAdopt=r=>{wAdopt(r);if(r.city){CT=r.city;CT.list.sort((x,y)=>CB.indexOf(x.key)-CB.indexOf(y.key));cEmit()}};
OA.city=()=>openCity();
OA.cUp=async k=>{try{await push();const r=await rpc('city_upgrade',{p_k:k});cAdopt(r);G.toast('🔨 '+T('c_b_'+k));rerender()}catch(e){err(e)}};
OA.cSpeed=async k=>{try{await push();const r=await rpc('city_speed',{p_k:k});cAdopt(r);G.toast('⏩ 💎'+r.spent);rerender()}catch(e){err(e)}};
// diziliş 3x3: dokun = boş → Abordajcı → Zıpkıncı → Topçu → Kaptan
let CF=null;const CFC=[null,'tayfa','zipkin','topcu','hero'];
OA.cForm=()=>{const f=CT?.form||{};CF={cells:Array.isArray(f.cells)?f.cells.slice():Array(9).fill(null),hero:f.hero||null};open('cform',formHtml)};
function formHtml(){const H=G.L.HEROES||[],own=Object.keys(G.S.heroes||{});let h=hdr('🧭 '+T('c_form'))+`<div class="sub" style="margin-bottom:6px">${T('c_form_d')}</div><div class="sub">⬆️ ${T('c_front')}</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0">`;
 CF.cells.forEach((v,i)=>{h+=`<button class="btn ${v==='hero'?'o':v?'g':''}" data-o="cCell" data-v="${i}" style="min-height:58px">${v==='hero'?'⭐<br><small>'+T('c_captain')+'</small>':v?WTIC[v]+'<br><small>'+tyN(v)+'</small>':'·'}</button>`});
 h+=`</div><div class="sub">⬇️ ${T('c_back')}</div><div class="sec">⭐ ${T('c_captain')}</div><div style="display:flex;gap:4px;flex-wrap:wrap">`;
 for(const id of own){const x=H.find(y=>y.id===id);if(x)h+=`<button class="btn sm ${CF.hero===id?'o':''}" data-o="cHero" data-v="${id}">${x.ic} ${esc(x.n)}</button>`}
 const t=CT?.tier||{};h+=`</div><div class="sub" style="margin-top:6px">${T('c_spec')}</div><div class="sub">${WTY.map(k=>WTIC[k]+' ×'+(1+.3*((+t[k]||1)-1)).toFixed(2)).join(' · ')}</div>`;
 return h+`<button class="btn g" data-o="cFormSave" style="margin-top:8px;width:100%">💾 ${T('c_save')}</button>`}
OA.cCell=i=>{const v=CF.cells[i];let nx=CFC[(CFC.indexOf(v)+1)%CFC.length];const used=CF.cells.filter((x,j)=>j!=i&&x&&x!=='hero').length;
 while(nx&&(nx==='hero'?CF.cells.some((x,j)=>j!=i&&x==='hero'):CF.cells.some((x,j)=>j!=i&&x===nx)||used>=4))nx=CFC[(CFC.indexOf(nx)+1)%CFC.length];CF.cells[i]=nx;rerender()};
OA.cHero=id=>{CF.hero=CF.hero===id?null:id;rerender()};
OA.cFormSave=async()=>{try{CT=await rpc('city_form',{p_cells:CF.cells,p_hero:CF.hero});CT.list.sort((x,y)=>CB.indexOf(x.key)-CB.indexOf(y.key));cEmit();G.toast('💾 '+T('c_saved'));rerender()}catch(e){err(e)}};
const cityApi={list:async()=>{if(!CT)await citySync();return CT.list.map(b=>({key:b.key,lvl:b.lvl,max:b.max,until:b.until,next:b.next}))},state:()=>CT,sync:()=>citySync(),on:f=>{cL.add(f);return()=>cL.delete(f)},open:()=>openCity(),name:k=>T('c_b_'+k),focus:async k=>{await openCity();requestAnimationFrame(()=>{const e=document.getElementById('cb_'+k);if(e){e.scrollIntoView({block:'center'});e.animate([{boxShadow:'0 0 0 3px #ffd27a'},{boxShadow:'0 0 0 0 #ffd27a00'}],{duration:1400})}})},upgrade:k=>OA.cUp(k),keys:CB};
const lineApi=async()=>{if(!CT)await citySync();const S=G.S;return WTY.map(k=>({key:k,tier:+(CT.base?.[k]||1),eff:+(CT.tier?.[k]||1),n:Math.floor(S.troops?.[k]||0),beats:WBEAT[k]}))};
Object.assign(SERR,{'Zaten inşa ediliyor':'c_e_busy','İnşaat sırası dolu':'c_e_queue','En üst seviye':'c_e_max','Kale seviyesi yetersiz':'c_e_kale','İnşaat yok':'c_e_none','Diziliş dolu':'c_e_form','Kaptan yok':'c_e_hero','Akademi seviyesi yetersiz':'c_e_ak'});
// --- Faz D: sunucu VIP, DEMO paketler, ilk yükleme, etkinlik çubuğu, harcama sandıkları ---
let PY=null;const PIC={starter:'🎁',monthly:'🗓️',g1:'💎',g2:'💰',g3:'🏆',g4:'👑',noads:'🚫',b_war:'⚔️',b_build:'🧱',b_heal:'🏥'};
const pPrice=p=>'₺'+(+p).toFixed(2).replace('.',',');
function payAdopt(r){if(!r)return;const S=G.S;if(r.vipPts!=null)S.vipPts=Math.max(+S.vipPts||0,+r.vipPts);if(r.builders!=null)S.builders=+r.builders;if(r.monthly!=null)S.monthly=+r.monthly;if(r.buy)Object.assign(S.buy,r.buy);if(r.pay)PY=r.pay;wAdopt(r)}
async function paySync(){PY=await rpc('pay_info');if(PY&&G.S.vipPts<+PY.pts){G.S.vipPts=+PY.pts;G.save()}return PY}
async function openPay(tab){if(!online)return open('pay',()=>hdr('👑 '+T('p_t'))+offline());try{await paySync()}catch(e){return err(e)}PY.tab=tab||PY.tab||'shop';open('pay',payHtml)}
const pRw=x=>[x.g?'💎'+x.g:'',fmtR(x.r||{})].filter(Boolean).join(' · ');
function payHtml(){const p=PY,v=p.vip,nx=p.vipn[v+1];let h=hdr('👑 '+T('p_t'))+`<div class="demo">${T('p_demo')}</div>
 <div class="card"><div class="ic">👑</div><div class="mid"><div class="nm">VIP ${v}</div><div class="sub">${nx!=null?T('p_vip_next',[G.fmt(+p.pts),G.fmt(nx),v+1]):T('p_vip_max')}</div></div></div>
 <div style="display:flex;gap:4px;margin:6px 0">${['shop','act','spend'].map(t=>`<button class="btn sm ${p.tab===t?'o':''}" data-o="pTab" data-v="${t}">${T('p_tab_'+t)}</button>`).join('')}</div>`;
 if(p.tab==='shop'){if(!p.first)h+=`<div class="card" style="border-color:#ffd27a"><div class="ic">✨</div><div class="mid"><div class="nm">${T('p_first')}</div><div class="sub">${T('p_first_d',[p.firstb.gx,fmtR(p.firstb.r)])}</div></div></div>`;
  for(const[k,c]of Object.entries(p.cat)){const own=c.once&&(p.buys[k]||0)>0;
   h+=`<div class="card"><div class="ic">${PIC[k]||'💎'}</div><div class="mid"><div class="nm">${T('p_sku_'+k)}</div><div class="sub">${[c.g?'💎'+c.g:'',fmtR(c.r||{}),c.x?T('p_x_'+k):''].filter(Boolean).join(' · ')}</div><div class="sub">👑 +${c.v} VIP${c.g?' · '+(c.g/c.p).toFixed(1)+' 💎/₺':''}${p.buys[k]?' · ×'+p.buys[k]:''}</div></div><button class="btn sm g" data-o="pBuy" data-v="${k}" ${own?'disabled':''}>${own?'✅':pPrice(c.p)}</button></div>`}
  h+=`<div class="sub">${T('p_honest')}</div>`}
 else if(p.tab==='act'){const a=p.act;h+=`<div class="sub">${T('p_act_d')}</div><div style="height:12px;background:#0008;border-radius:6px;margin:8px 0;overflow:hidden"><div style="height:100%;width:${a.pts}%;background:linear-gradient(90deg,#ffb340,#ff5a2a)"></div></div><div class="nm">⚡ ${a.pts}/100</div>`;
  a.ch.forEach((c,i)=>{const got=a.cl.includes(String(i)),ok=a.pts>=c.t;h+=`<div class="card"><div class="ic">${got?'✅':ok?'🎁':'🔒'}</div><div class="mid"><div class="nm">${c.t} ⚡</div><div class="sub">${pRw(c)}</div></div><button class="btn sm g" data-o="pAct" data-v="${i}" ${got||!ok?'disabled':''}>${T('p_claim')}</button></div>`});
  h+=`<div class="sec">${T('p_act_how')}</div>`+Object.entries(a.def).map(([k,d])=>`<div class="sub">${T('p_a_'+k)} · +${d[0]} (${a.k[k]||0}/${d[1]})</div>`).join('')}
 else{const s=p.spend;h+=`<div class="sub">${T('p_spend_d',[pPrice(p.spent)])}</div>`;
  s.ch.forEach((c,i)=>{const got=s.cl.includes(String(i)),ok=+p.spent>=c.t;h+=`<div class="card"><div class="ic">${got?'✅':ok?'🎁':'🔒'}</div><div class="mid"><div class="nm">${pPrice(c.t)}</div><div class="sub">${pRw(c)}</div></div><button class="btn sm g" data-o="pSpend" data-v="${i}" ${got||!ok?'disabled':''}>${T('p_claim')}</button></div>`})}
 return h}
OA.pay=()=>openPay();OA.pTab=t=>{PY.tab=t;rerender()};
async function payBuy(k){await push();const r=await rpc('shop_buy_demo',{p_sku:k});payAdopt(r);G.toast((r.first?'✨ ':'✅ ')+T('p_bought',[pRw(r.got)]));return r}
OA.pBuy=k=>{const c=PY.cat[k];G.modal(`<h2>${PIC[k]||'💎'} ${T('p_sku_'+k)}</h2><p>${[c.g?'💎'+c.g:'',fmtR(c.r||{})].filter(Boolean).join(' · ')}</p><div class="demo">${T('p_demo')}</div>`,[[T('cancel'),'x'],[pPrice(c.p),'g',()=>payBuy(k).then(()=>rerender()).catch(err)]])};
OA.pAct=async i=>{try{const r=await rpc('act_claim',{p_i:+i});payAdopt(r);G.toast('🎁');rerender()}catch(e){err(e)}};
OA.pSpend=async i=>{try{const r=await rpc('pay_spend_claim',{p_i:+i});payAdopt(r);G.toast('🎁');rerender()}catch(e){err(e)}};
OA.cQ2=async()=>{try{await push();const r=await rpc('city_queue_buy');cAdopt(r);G.toast('🔨 +1');rerender()}catch(e){err(e)}};
const payApi={sync:()=>paySync(),state:()=>PY,open:t=>openPay(t),buy:k=>payBuy(k),vip:()=>PY?.vip??null};
const vipD=(l,c)=>Math.max(1,Math.ceil(c*((PY?.vip??0)>=l?(l===8?.75:.8):1)));
Object.assign(SERR,{'Zaten alındı':'p_e_got','Henüz açılmadı':'p_e_locked'});
const worldApi={army:()=>rpc('army_info'),fort:()=>rpc('fort_info'),extra:()=>W.x,reports:()=>rpc('war_reports'),openArmy:()=>openArmy(),openFort:()=>openFort(),state:()=>W,on:f=>{wL.add(f);return()=>wL.delete(f)},view:(x,y,w,h)=>rpc('world_view',{p_x:x,p_y:y,p_w:w,p_h:h}),me:()=>rpc('world_me')};
