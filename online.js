// ===== Son Fener — çevrimiçi katman (Supabase): hesap, bulut kayıt, klan, sohbet, baskın, arena, düello, sıralama.
// Yalnızca herkese açık (publishable) anahtar kullanılır; tüm hassas işlemler sunucudaki RPC'lerde doğrulanır.
const SB_URL='https://ftbbzqzgafmallrfimnt.supabase.co',SB_KEY='sb_publishable_Z46YoAdDJSnL3RYmX61vBg_XUbiAfuZ';
// Panelde Anonymous Sign-ins açılınca true yapın; kapalıyken 'guest' edge fonksiyonu kullanılır
const ANON=false;
let G,sb,uid=null,prof=null,clan=null,arena=null,online=false,rev=+localStorage.getItem('sf_rev')||null,lastBoss=null,chTab='tr',pvpTab='raid',boardTab='power';
const msgs={tr:[],clan:[]};let muted=new Set();const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>G.fmt?G.fmt(n):String(n);const toast=t=>G.toast(t);
const HERO_IDS=['kaan','mei','tunc','deniz','nene','ela','ali'];
const av=(id,s=34)=>`<img src="img/cap_${HERO_IDS.includes(id)?id:'ali'}.webp" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;border:2px solid #ffd27a;flex:none" alt="">`;
const err=e=>{const m=(e&&(e.message||e.msg))||String(e);toast('⚠️ '+m.replace(/^.*?:\s*/,'').slice(0,90));G.SFX?.err?.()};
const wk=()=>String(G.L.weekId(Date.now()));
// dil algılama (TR / EN / 中文) ve çeviri bağlantısı
export function detectLang(t){if(/[\u3400-\u9fff\uf900-\ufaff]/.test(t))return /[們這個來時說對發會麼與廣]/.test(t)?'zh-TW':'zh';if(/[çğıöşüÇĞİÖŞÜ]/.test(t)||/\b(ve|bir|bu|ne|nasıl|selam|merhaba|klan)\b/i.test(t))return 'tr';if(/^[\x00-\x7f]+$/.test(t))return 'en';return 'other'}
const uiLang=()=>{const l=(navigator.language||'tr').toLowerCase();return l.startsWith('zh')?(l.includes('tw')||l.includes('hk')?'zh-TW':'zh-CN'):l.slice(0,2)};
const sameLang=(a,b)=>a.slice(0,2)===b.slice(0,2);
const trUrl=t=>`https://translate.google.com/?sl=auto&tl=${encodeURIComponent(uiLang())}&text=${encodeURIComponent(t)}&op=translate`;
export const nickOK=n=>/^[\p{L}\p{N}_ ]{3,16}$/u.test(n.trim());

async function rpc(fn,args){const{data,error}=await sb.rpc(fn,args||{});if(error)throw error;return data}
export async function start(g){G=g;window.__online={bossHtml,push:()=>push(),claim:()=>claim(),get on(){return online},get uid(){return uid},detectLang,nickOK,open:{clan:openClan,chat:openChat,pvp:openPvp,profile:openProfile}};
 addButtons();if(!window.supabase){setStatus();return}
 sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,storageKey:'sf_auth',autoRefreshToken:true}});
 try{await signIn();await afterLogin()}catch(e){console.warn('Çevrimdışı mod:',e?.message||e);online=false;setStatus()}
 addEventListener('online',()=>{if(!online)signIn().then(afterLogin).catch(()=>{})})}
async function signIn(){let{data:{session}}=await sb.auth.getSession();if(session){uid=session.user.id;return}
 if(ANON){const a=await sb.auth.signInAnonymously().catch(e=>({error:e}));if(!a.error&&a.data?.user){uid=a.data.user.id;return}}
 let cred=JSON.parse(localStorage.getItem('sf_guest')||'null');
 if(!cred){const r=await fetch(SB_URL+'/functions/v1/guest',{method:'POST',headers:{apikey:SB_KEY,'content-type':'application/json'}});if(!r.ok)throw new Error('misafir hesap açılamadı');cred=await r.json();localStorage.setItem('sf_guest',JSON.stringify(cred))}
 const{data,error}=await sb.auth.signInWithPassword(cred);if(error)throw error;uid=data.user.id}
async function afterLogin(){prof=await rpc('ensure_profile');online=true;
 const{data:sv}=await sb.from('saves').select('data,rev,updated_at').eq('user_id',uid).maybeSingle();const S=G.S;
 if(sv&&sv.data&&(sv.data.saved||0)>(S.saved||0)+10000&&!sessionStorage.getItem('sf_adopted')){adopt(sv);return}
 if(sv)rev=sv.rev;await push();
 const{data:mu}=await sb.from('mutes').select('muted');muted=new Set((mu||[]).map(x=>x.muted));
 await refreshClan();await claim();subscribe();setStatus();
 setInterval(()=>{push();claim()},20000);setInterval(bossWatch,2000);lastBoss={w:G.S.boss.w,d:G.S.boss.dmg};
 addEventListener('visibilitychange',()=>document.hidden&&push())}
function adopt(sv){toast('☁️ Bulut kaydı yükleniyor…');sessionStorage.setItem('sf_adopted','1');window.__noSave=1;localStorage.setItem('sonfener1',JSON.stringify(sv.data));localStorage.setItem('sf_rev',sv.rev);setTimeout(()=>location.reload(),300)}
let pushing=false;
async function push(){if(!online||pushing)return;pushing=true;try{G.save();const S=G.S;let r=await rpc('save_game',{p_data:S,p_rev:rev});
  if(r.conflict){if((r.data?.saved||0)>(S.saved||0)){adopt(r);return}rev=r.rev;r=await rpc('save_game',{p_data:S,p_rev:rev})}
  if(r.ok){rev=r.rev;localStorage.setItem('sf_rev',rev);if(r.data){const d=r.data;Object.assign(S.res,d.res);S.gems=d.gems;Object.assign(S.troops,d.troops);G.ui();toast('⚠️ Kayıt sunucu sınırlarına göre düzeltildi')}if(prof)prof.power=r.power}}
 catch(e){console.warn('kayıt',e.message)}finally{pushing=false}}
// sunucudan gelen değişiklikler (ganimet / kayıp / yardım / sezon ödülü)
async function claim(){if(!online)return;let ev;try{ev=await rpc('claim_events')}catch(e){return}if(!ev?.length)return;const S=G.S;
 for(const e of ev){const d=e.delta||{};for(const[k,v]of Object.entries(d.res||{})){if(k==='gems')S.gems=Math.max(0,S.gems+v);else if(k in S.res)S.res[k]=Math.max(0,S.res[k]+v)}
  for(const[k,v]of Object.entries(d.troops||{}))if(k in S.troops)S.troops[k]=Math.max(0,S.troops[k]+v);
  if(d.help_sec)helpApply(S,d.help_sec*1000),toast(`🤝 ${esc(d.from||'Klan')} yardım etti: −${d.help_sec}sn`);
  if(e.kind==='raided')toast('🏴‍☠️ Adana baskın yapıldı! Raporlara bak');if(e.kind==='season')toast(`🏆 Arena sezon ödülü: ${d.tier} · +${d.res.gems}💎`)}
 G.ui();G.save();push()}
function helpApply(S,ms){const ts=[S.train,S.research,S.fener?.end?S.fener:null];for(const g of Object.values(S.isl||{}))for(const b of Object.values(g?.g||{}))if(b.end)ts.push(b);for(const b of Object.values(S.g))if(b.end)ts.push(b);
 const t=ts.filter(x=>x&&x.end>Date.now()).sort((a,b)=>a.end-b.end)[0];if(t)t.end-=ms}
function subscribe(){sb.channel('sf-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'events',filter:'user_id=eq.'+uid},()=>claim())
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>onMsg(p.new))
 .on('postgres_changes',{event:'*',schema:'public',table:'help_requests'},()=>{if(sheetIs('clan'))refreshClan().then(rerender)}).subscribe()}
function bossWatch(){const b=G.S.boss;if(!lastBoss||b.w!==lastBoss.w){lastBoss={w:b.w,d:b.dmg};return}const dd=b.dmg-lastBoss.d;if(dd>0){lastBoss.d=b.dmg;rpc('boss_hit',{p_dmg:Math.round(dd),p_wk:wk()}).then(()=>refreshClan()).catch(e=>console.warn(e.message))}}
async function refreshClan(){if(!online)return;try{clan=await rpc('clan_info')}catch(e){clan=null}}
// ---------- arayüz yardımcıları ----------
let cur='';const sheetIs=n=>cur===n&&$('sheet').classList.contains('on');const rerender=()=>G.renderSheet?.();
function open(name,fn){cur=name;G.sheet(fn)}
function addButtons(){const row=$('bClan')?.parentElement;if(row&&!$('bPvp')){const b=document.createElement('div');b.className='pill';b.id='bPvp';b.innerHTML='⚔️ Savaş';row.insertBefore(b,$('bClan'));b.onclick=()=>openPvp()}
 if($('bClan'))$('bClan').onclick=()=>openClan();if($('bChat'))$('bChat').onclick=()=>openChat();
 $('sheet').addEventListener('click',ev=>{const b=ev.target.closest('[data-o]');if(!b)return;ev.stopPropagation();G.SFX?.tap?.();const f=OA[b.dataset.o];if(f)f(b.dataset.v,b)});
 $('sheet').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.id==='chIn')OA.send()})}
function setStatus(){const b=$('bClan');if(b)b.title=online?'Çevrimiçi':'Çevrimdışı'}
const offline=()=>`<div class="prev">📴 Çevrimdışısın — bağlantı gelince otomatik bağlanır. İlerlemen bu cihazda güvende.</div>`;
const hdr=t=>G.hdr(t);
const tabs=(cur,list,act)=>`<div class="tabs">${list.map(([v,n])=>`<button class="btn ${cur===v?'o':'x'}" data-o="${act}" data-v="${v}">${n}</button>`).join('')}</div>`;
const inp=(id,ph,ml,val='')=>`<input id="${id}" maxlength="${ml}" placeholder="${ph}" value="${esc(val)}" style="flex:1;min-width:0;padding:10px;border-radius:10px;border:1px solid #ffffff33;background:#0006;color:#fff;font:inherit">`;
// ---------- KLAN ----------
let clanList=null,clanQ='';
async function openClan(){if(!online)return G.openClan();await refreshClan();if(!clan){clanList=await rpc('list_clans',{p_q:clanQ}).catch(()=>[])}open('clan',clanHtml)}
function clanHtml(){if(!online)return hdr('🛡️ Klan')+offline();
 if(!clan){let h=hdr('🛡️ Klanlar')+`<div class="sec">Klan kur</div><div class="card" style="flex-wrap:wrap;gap:6px">${inp('cName','Klan adı (3-20)',20)}${inp('cTag','Etiket',4)}<button class="btn o" data-o="create">Kur</button></div>
  <div class="sec">Klan ara</div><div class="card" style="gap:6px">${inp('cQ','Ad veya etiket',20,clanQ)}<button class="btn" data-o="search">Ara</button></div>`;
  if(!clanList?.length)h+='<div class="sub">Henüz klan yok — ilk klanı sen kur!</div>';
  for(const c of clanList||[])h+=`<div class="card"><div class="ic">${esc(c.icon)}</div><div class="mid"><div class="nm">${esc(c.name)} <span class="tag">[${esc(c.tag)}]</span></div><div class="sub">👥 ${c.members}/30 · ⚔️ ${fmt(c.power)}</div></div><button class="btn o" data-o="join" data-v="${c.id}" ${c.members>=30?'disabled':''}>Katıl</button></div>`;
  return h}
 const ms=clan.members||[],mine=ms.find(m=>m.id===uid),pw=ms.reduce((a,m)=>a+m.power,0),boss=clan.boss_wk===wk()?clan.boss_dmg:0;
 let h=hdr(`${esc(clan.icon)} ${esc(clan.name)} [${esc(clan.tag)}]`)+`<div class="card"><div class="mid"><div class="nm">👥 ${ms.length}/30 · ⚔️ Klan gücü ${fmt(pw)}</div><div class="sub">Rolün: <b>${mine?.role}</b></div></div><button class="btn" data-o="chatClan">💬 Sohbet</button></div>`;
 h+=`<div class="card" style="background:linear-gradient(135deg,#3a1a5a,#0a1a30)"><img src="img/f_kraken.webp" style="width:60px"><div class="mid"><div class="nm">🦑 Klan Krakeni · bu hafta</div><div class="sub">Ortak hasar: <b>${fmt(boss)}</b> · Her üyenin Kraken saldırısı klana sayılır</div></div><button class="btn o" data-o="boss">Saldır</button></div>`;
 h+=`<div class="sec">Yardım</div><div class="card"><div class="mid"><div class="sub">Üyelere yardım et: her yardım bir zamanlayıcıyı 60 sn kısaltır (en fazla 5).</div></div><button class="btn" data-o="ask">Yardım iste</button><button class="btn o" data-o="helpAll">Herkese yardım</button></div><div id="helpList">${helpHtml()}</div>`;
 h+='<div class="sec">Üyeler</div>';for(const m of ms){const can=mine?.role==='lider'&&m.id!==uid,kick=can||(mine?.role==='yardımcı'&&m.role==='üye');
  h+=`<div class="card">${av(m.avatar)}<div class="mid"><div class="nm">${esc(m.nick)}${m.id===uid?' (sen)':''} <span class="tag">${m.role}</span></div><div class="sub">⚔️ ${fmt(m.power)} · 🦑 ${fmt(m.kraken)}</div></div>
  ${can?`<button class="btn sm" data-o="role" data-v="${m.id}:${m.role==='üye'?'yardımcı':'üye'}">${m.role==='üye'?'⬆️':'⬇️'}</button><button class="btn sm" data-o="role" data-v="${m.id}:lider">👑</button>`:''}${kick?`<button class="btn sm r" data-o="kick" data-v="${m.id}">✖</button>`:''}${m.id!==uid?`<button class="btn sm x" data-o="prof" data-v="${m.id}">👤</button>`:''}</div>`}
 return h+`<button class="btn r" data-o="leave" style="width:100%;margin-top:10px">Klandan ayrıl</button>`}
let helps=[];function helpHtml(){return helps.length?helps.map(r=>`<div class="card"><div class="mid"><div class="nm">${esc(r.nick)}: ${esc(r.label)}</div><div class="pbar"><i style="width:${r.helps/r.max_helps*100}%"></i></div></div>${r.user_id!==uid&&!r.mine?`<button class="btn sm o" data-o="help" data-v="${r.id}">🤝</button>`:''}</div>`).join(''):'<div class="sub">Açık yardım isteği yok.</div>'}
async function loadHelps(){const{data}=await sb.from('help_requests').select('id,user_id,label,helps,max_helps,created_at').lt('helps',5).order('id',{ascending:false}).limit(20);const nm=Object.fromEntries((clan?.members||[]).map(m=>[m.id,m.nick]));
 const{data:gv}=await sb.from('help_requests').select('id').limit(0);helps=(data||[]).filter(r=>r.helps<r.max_helps).map(r=>({...r,nick:nm[r.user_id]||'?'}))}
const _rc=refreshClan;refreshClan=async()=>{await _rc();if(clan)await loadHelps().catch(()=>{})};
// ---------- SOHBET ----------
async function loadMsgs(ch){const chan=ch==='tr'?'tr':'clan:'+clan?.id;if(ch==='clan'&&!clan)return;const{data}=await sb.from('messages').select('*').eq('channel',chan).order('id',{ascending:false}).limit(50);msgs[ch]=(data||[]).reverse()}
async function openChat(tab){if(tab)chTab=tab;if(!online){open('chat',()=>hdr('💬 Sohbet')+offline());return}if(chTab==='clan')await refreshClan();await loadMsgs(chTab).catch(()=>{});open('chat',chatHtml);scrollChat()}
function chatHtml(){let h=hdr('💬 Sohbet')+tabs(chTab,[['tr','🇹🇷 Türkiye'],['clan','🛡️ Klan']],'chTab');if(chTab==='clan'&&!clan)return h+'<div class="sub">Klan sohbeti için bir klana katıl.</div>';
 h+=`<div id="chBox" style="max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:6px">`;
 for(const m of msgs[chTab]){if(muted.has(m.user_id))continue;const me=m.user_id===uid;const tl=!me&&!sameLang(m.lang||'tr',uiLang())&&m.lang!=='other'||(!me&&m.lang==='other');
  h+=`<div class="card" style="${me?'background:#ffb34722;border-color:#ffd27a':''};align-items:flex-start">${av(m.avatar,30)}<div class="mid"><div class="sub"><b data-o="prof" data-v="${m.user_id}" style="cursor:pointer">${esc(m.nick)}</b> · ${new Date(m.created_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div><div class="msgb" style="word-break:break-word">${esc(m.body)}</div>
  ${tl?`<a href="${trUrl(m.body)}" target="_blank" rel="noopener" class="sub">🌐 Çevir</a>`:''}</div>${me?'':`<button class="btn sm x" data-o="report" data-v="${m.id}" title="Şikâyet et">🚩</button>`}</div>`}
 return h+`</div><div class="card" style="gap:6px;margin-top:8px">${inp('chIn','Mesaj yaz (en fazla 200)',200)}<button class="btn o" data-o="send">Gönder</button></div><div class="sub">Saygılı ol: küfür filtrelenir, 3 şikâyet = 1 saat susturma.</div>`}
function scrollChat(){setTimeout(()=>{const b=$('chBox');if(b)b.scrollTop=b.scrollHeight},30)}
function onMsg(m){const ch=m.channel==='tr'?'tr':'clan';if(msgs[ch].some(x=>x.id===m.id))return;msgs[ch].push(m);if(msgs[ch].length>80)msgs[ch].shift();
 if(sheetIs('chat')&&chTab===ch){const v=$('chIn')?.value||'';rerender();if($('chIn')){$('chIn').value=v}scrollChat()}else if(m.user_id!==uid)$('bChat')?.classList.add('ping')}
// ---------- PROFİL / DÜELLO ----------
async function openProfile(id){id=id||uid;const{data:p}=await sb.from('profiles').select('id,nick,avatar,power,stage').eq('id',id).single();const{data:a}=await sb.from('arena').select('rating').eq('user_id',id).maybeSingle();
 const mine=id===uid;const r=a?.rating??1000;
 open('prof',()=>{let h=hdr('👤 '+esc(p.nick))+`<div class="card">${av(p.avatar,64)}<div class="mid"><div class="nm">${esc(p.nick)}</div><div class="sub">⚔️ Güç ${fmt(p.power)} · 🗺️ ${p.stage-1} ada · 🏟️ ${r} (${tier(r)})</div></div></div>`;
  if(mine){h+=`<div class="sec">İsim ve portre</div><div class="card" style="gap:6px">${inp('pNick','Kaptan adı (3-16)',16,p.nick)}<button class="btn o" data-o="saveProf">Kaydet</button></div><div style="display:flex;gap:6px;flex-wrap:wrap">${HERO_IDS.map(x=>`<span data-o="pAv" data-v="${x}" style="cursor:pointer;opacity:${x===(window.__pav||p.avatar)?1:.45}">${av(x,46)}</span>`).join('')}</div>
   <div class="sec">Hesap</div><div class="sub">Şu an misafir hesaptasın. E-posta bağla, ilerlemen her cihazda seninle olsun.</div><div class="card" style="gap:6px;flex-wrap:wrap">${inp('pMail','E-posta',80)}${inp('pPass','Şifre (8+)',64)}<button class="btn" data-o="link">Bağla</button></div><div class="sub">Google ile giriş yakında.</div>`}
  else h+=`<button class="btn o" data-o="duel" data-v="${id}" style="width:100%">⚔️ Dostluk düellosu (ganimetsiz)</button><button class="btn x" data-o="mute" data-v="${id}" style="width:100%;margin-top:6px">${muted.has(id)?'🔈 Susturmayı kaldır':'🔇 Sohbette sustur'}</button>`;
  return h})}
const tier=r=>r>=1800?'Efsane':r>=1500?'Elmas':r>=1300?'Altın':r>=1100?'Gümüş':'Bronz';
const TIC={Bronz:'🥉',Gümüş:'🥈',Altın:'🥇',Elmas:'💎',Efsane:'👑'};
// ---------- SAVAŞ: baskın, arena, raporlar, sıralama ----------
let targets=[],opps=[],reports=[],board=[];
async function openPvp(tab){if(tab)pvpTab=tab;if(!online){open('pvp',()=>hdr('⚔️ Savaş')+offline());return}await push();
 try{if(pvpTab==='raid')targets=await rpc('find_targets');if(pvpTab==='arena'){arena=await rpc('arena_me');opps=await rpc('arena_opponents');board=await rpc('arena_board')}
  if(pvpTab==='rep'){const{data}=await sb.from('battles').select('*').or(`attacker.eq.${uid},defender.eq.${uid}`).order('id',{ascending:false}).limit(30);reports=data||[]}
  if(pvpTab==='lb')board=boardTab==='kraken'?await rpc('leaderboard',{p_kind:'kraken',p_wk:wk()}):boardTab==='clan'?await rpc('clan_board',{p_wk:wk()}):await rpc('leaderboard',{p_kind:'power'});
  prof=(await sb.from('profiles').select('*').eq('id',uid).single()).data||prof}catch(e){err(e)}
 open('pvp',pvpHtml)}
function pvpHtml(){let h=hdr('⚔️ Savaş')+tabs(pvpTab,[['raid','🏴‍☠️ Baskın'],['arena','🏟️ Arena'],['rep','📜 Raporlar'],['lb','🏆 Sıralama']],'pvpTab');
 if(pvpTab==='raid'){const sh=new Date(prof?.shield_until)>new Date();h+=`<div class="card"><div class="mid"><div class="nm">Filo gücün ⚔️ ${fmt(prof?.power||0)}</div><div class="sub">${sh?'🛡️ Kalkanın açık · saldırırsan kalkan düşer':'Kalkansız'} · Kazanırsan kaynaklarının %15'ini (sınırlı) yağmalarsın; kimse %20'den fazla kaybetmez; saldırılan 4 saat kalkan alır · 🌊 Deniz ${prof?.region_id||1}</div></div><button class="btn x" data-o="pvpTab" data-v="raid">🔄</button></div>`+(prof&&!prof.has_attacked&&Date.now()-new Date(prof.created_at)<6048e5?`<div class="card"><div class="ic">🐣</div><div class="mid"><div class="nm">Yeni kaptan koruması</div><div class="sub">İlk 7 gün sana baskın yapılamaz. İlk saldırında koruma kalkar.</div></div><button class="btn sm r" data-o="unprotect">Kaldır</button></div>`:'');
  if(!targets.length)h+='<div class="sub">Şu an saldırılabilir kaptan yok.</div>';
  for(const t of targets)h+=`<div class="card">${av(t.avatar)}<div class="mid"><div class="nm" data-o="prof" data-v="${t.id}">${esc(t.nick)}${t.tag?` <span class="tag">[${esc(t.tag)}]</span>`:''}</div><div class="sub">⚔️ ${fmt(t.power)} · 🗺️ ${t.stage-1} ada</div></div><button class="btn o" data-o="raid" data-v="${t.id}">Saldır</button></div>`}
 if(pvpTab==='arena'&&arena){const t=tier(arena.rating),own=HERO_IDS.filter(x=>G.S.heroes[x]);
  h+=`<div class="card" style="background:linear-gradient(135deg,#5a3a10,#1a1030)"><div class="ic" style="font-size:34px">${TIC[t]}</div><div class="mid"><div class="nm">Kaptanlar Arenası · ${t} · ${arena.rating}</div><div class="sub">Sezon ${arena.season} · ${arena.wins}G/${arena.losses}M · 🎟️ ${arena.tickets}/5 bilet (her gün yenilenir)</div><div class="sub">Sezon sonu ödülü: 🥉50 🥈100 🥇180 💎300 👑500 elmas</div></div></div>
  <div class="sec">Savunma dizilimi (3 kaptan)</div><div style="display:flex;gap:6px;flex-wrap:wrap">${own.map(x=>`<span data-o="lineup" data-v="${x}" style="cursor:pointer;opacity:${(arena.lineup||[]).includes(x)?1:.4}">${av(x,46)}</span>`).join('')||'<div class="sub">Kaptanın yok.</div>'}</div><div class="sub">Seçilmezse en güçlü 3 kaptanın savunur. Saldırıda en güçlü 3 kaptanın dövüşür.</div><div class="sec">Rakipler</div>`;
  h+=`<div class="card"><div class="ic">⚖️</div><div class="mid"><div class="nm">Eşit Arena ${window.__eqArena?'AÇIK':'kapalı'}</div><div class="sub">Herkes aynı seviyede kaptanla — saf strateji · ayrı puan ${arena.eq_rating??1000}</div></div><button class="btn sm" data-o="eqArena">${window.__eqArena?'Normal':'Eşit'}</button></div>`;
  for(const o of opps)h+=`<div class="card">${av(o.avatar)}<div class="mid"><div class="nm">${esc(o.nick)}</div><div class="sub">${TIC[o.tier]} ${o.rating} · kaptan gücü ${fmt(o.power)}</div></div><button class="btn o" data-o="arena" data-v="${o.id}" ${arena.tickets?'':'disabled'}>Savaş</button></div>`;
  if(!opps.length)h+='<div class="sub">Henüz rakip yok.</div>';h+='<div class="sec">Arena sıralaması</div><div class="board">'+board.map((r,i)=>`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,26)}<div class="mid">${esc(r.nick)}</div><b>${TIC[r.tier]} ${r.rating}</b></div>`).join('')+'</div>'}
 if(pvpTab==='rep'){if(!reports.length)h+='<div class="sub">Henüz savaş yok.</div>';for(const b of reports){const att=b.attacker===uid,won=att?b.win:!b.win,K={raid:'🏴‍☠️ Baskın',arena:'🏟️ Arena',duel:'🤺 Düello'}[b.kind];
  const loot=b.kind==='raid'?Object.entries(b.loot||{}).filter(([,v])=>v).map(([k,v])=>`${G.L.RIC[k]}${fmt(v)}`).join(' '):b.kind==='arena'?`${b.loot.rating>0?'+':''}${att?b.loot.rating:-Math.trunc(b.loot.rating/2)} puan`:'';
  h+=`<div class="card" style="border-color:${won?'#3fb950':'#ff6b6b'}"><div class="ic">${won?'🏆':'💀'}</div><div class="mid"><div class="nm">${K} · ${att?'→ '+esc(b.def_nick):'← '+esc(b.att_nick)}</div><div class="sub">${won?'Zafer':'Yenilgi'} · ${loot?(att?'':'kayıp ')+loot+' · ':''}${new Date(b.created_at).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</div></div><button class="btn sm" data-o="replay" data-v="${b.id}">▶️</button>${!att&&b.kind==='raid'&&!b.revenged&&Date.now()-new Date(b.created_at)<864e5?`<button class="btn sm r" data-o="revenge" data-v="${b.id}">İntikam</button>`:''}</div>`}}
 if(pvpTab==='lb'){h+=tabs(boardTab,[['power','⚔️ Güç'],['kraken','🦑 Kraken'],['clan','🛡️ Klan Krakeni']],'boardTab')+'<div class="board">';
  board.forEach((r,i)=>h+=boardTab==='clan'?`<div class="card ${clan&&r.tag===clan.tag?'me':''}"><b style="width:26px">#${i+1}</b><div class="ic">${esc(r.icon)}</div><div class="mid">${esc(r.name)} [${esc(r.tag)}]</div><b>${fmt(r.dmg)}</b></div>`:`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,26)}<div class="mid" data-o="prof" data-v="${r.id}">${esc(r.nick)}${r.tag?` <span class="tag">[${esc(r.tag)}]</span>`:''}</div><b>${fmt(r.val)}</b></div>`);
  h+='</div>'+(board.length?'':'<div class="sub">Henüz kayıt yok.</div>')}
 return h}
// Kraken sheet'inde gerçek sıralama (bot yerine)
let bossCache=null;function bossHtml(){if(!online)return null;if(!bossCache||Date.now()-bossCache.t>15000){bossCache={t:Date.now(),rows:bossCache?.rows||[]};rpc('leaderboard',{p_kind:'kraken',p_wk:wk()}).then(r=>{bossCache.rows=r||[];if(sheetIs('')||$('sheet').classList.contains('on'))G.renderSheet?.()}).catch(()=>{})}
 const rows=bossCache.rows;return `<div class="sec">Sıralama · gerçek oyuncular 🌐</div><div class="board">${rows.map((r,i)=>`<div class="card ${r.id===uid?'me':''}"><b style="width:26px">#${i+1}</b>${av(r.avatar,24)}<div class="mid">${r.id===uid?'⭐ Sen':esc(r.nick)}${r.tag?` <span class="tag">[${esc(r.tag)}]</span>`:''}</div><b>${fmt(r.val)}</b></div>`).join('')||'<div class="sub">Bu hafta henüz kimse saldırmadı — ilk sen ol!</div>'}</div>`}
// ---------- savaş tekrarı ----------
function replay(r,title){G.closeSheet?.();const bt=$('battle'),aH=r.a||null,dH=r.d||null;const side=(nick,avt,pw,list,id)=>`<div class="side" style="text-align:center">${list?`<div style="display:flex;gap:6px;justify-content:center">${list.map(x=>av(x.id,58)).join('')}</div>`:av(avt,80)}<div class="hl">${esc(nick)} · ⚔️ ${fmt(pw)}</div><div class="pbar" style="width:70%;margin:6px auto"><i id="${id}" style="width:100%;transition:width .4s"></i></div></div>`;
 bt.innerHTML=`<div class="top">${title}</div>${side(r.def_nick,r.def_avatar,r.def_power,dH,'hpE')}<div class="waves" id="rLog" style="text-align:center;font-weight:900;font-size:22px;min-height:40px"></div>${side('Sen',prof?.avatar,r.att_power,aH,'hpA')}`;
 bt.classList.add('on');G.SFX?.boss?.();let i=0;const R=r.rounds||[];const iv=setInterval(()=>{const x=R[i++];if(!x){clearInterval(iv);setTimeout(()=>finish(r),500);return}
  $('hpE').style.width=(x.eHp/r.eMax*100)+'%';$('hpA').style.width=(x.hp/r.myMax*100)+'%';$('rLog').innerHTML=`<span style="color:#ffd84a">−${fmt(x.d1)}</span> &nbsp; <span style="color:#ff6b6b">−${fmt(x.d2)}</span>`;G.SFX?.hit?.()},600)}
function finish(r){const bt=$('battle');const loot=Object.entries(r.loot||{}).filter(([k,v])=>v&&G.L.RIC[k]).map(([k,v])=>`${G.L.RIC[k]}${fmt(v)}`).join(' ');
 const lost=Object.entries(r.att_lost||{}).filter(([,v])=>v).map(([k,v])=>`${G.L.TROOPS[k].ic}${-v}`).join(' ');
 G.modal(`<div style="font-size:54px">${r.win?'🏆':'💀'}</div><h2>${r.win?'Zafer!':'Yenilgi'}</h2><p>${r.kind==='arena'?`Arena puanı: <b>${r.rating_change>0?'+':''}${r.rating_change}</b>`:r.kind==='duel'?'Dostluk düellosu — ganimet yok':`${loot?'Ganimet: '+loot+'<br>':''}${lost?'Kayıp: '+lost:''}`}</p>`,[['Tamam','o',()=>{bt.classList.remove('on');claim()}]])}
// ---------- eylemler ----------
const val=id=>($(id)?.value||'').trim();
const OA={
 pvpTab:v=>openPvp(v),boardTab:v=>{boardTab=v;openPvp('lb')},chTab:v=>openChat(v),
 create:async()=>{try{await rpc('create_clan',{p_name:val('cName'),p_tag:val('cTag'),p_icon:'🛡️'});toast('🛡️ Klan kuruldu!');openClan()}catch(e){err(e)}},
 search:async()=>{clanQ=val('cQ');openClan()},
 join:async v=>{try{await rpc('join_clan',{p_clan:v});toast('Klana katıldın!');openClan()}catch(e){err(e)}},
 leave:()=>G.modal('<h2>Klandan ayrıl?</h2>',[['Vazgeç','x'],['Ayrıl','r',async()=>{try{await rpc('leave_clan');clan=null;openClan()}catch(e){err(e)}}]]),
 role:async v=>{const[id,r]=v.split(':');try{await rpc('set_role',{p_user:id,p_role:r});openClan()}catch(e){err(e)}},
 kick:async v=>{try{await rpc('kick_member',{p_user:v});openClan()}catch(e){err(e)}},
 ask:async()=>{const S=G.S;const t=S.train?'Tayfa eğitimi':S.research?'Araştırma':S.fener?.end?'Fener yükseltmesi':Object.values(S.g).some(b=>b.end)?'Bina yükseltmesi':null;if(!t)return toast('Yardım için aktif bir zamanlayıcı yok');try{await rpc('ask_help',{p_label:t});toast('🤝 Yardım istendi');openClan()}catch(e){err(e)}},
 help:async v=>{try{await rpc('give_help',{p_req:+v});toast('🤝 Yardım ettin');openClan()}catch(e){err(e)}},
 helpAll:async()=>{try{const n=await rpc('help_all');toast(`🤝 ${n} yardım`);openClan()}catch(e){err(e)}},
 boss:()=>{G.closeSheet?.();G.openBoss()},chatClan:()=>openChat('clan'),
 send:async()=>{const t=val('chIn');if(!t)return;if(t.length>200)return toast('En fazla 200 karakter');const ch=chTab==='tr'?'tr':'clan:'+clan?.id;
  try{await rpc('send_chat',{p_channel:ch,p_body:t,p_lang:detectLang(t)});$('chIn').value='';await loadMsgs(chTab);rerender();scrollChat()}catch(e){err(e)}},
 report:async v=>{try{await rpc('report_msg',{p_msg:+v});toast('🚩 Şikâyet alındı, teşekkürler')}catch(e){err(e)}},
 prof:v=>openProfile(v),
 mute:async v=>{try{if(muted.has(v)){await sb.from('mutes').delete().eq('user_id',uid).eq('muted',v);muted.delete(v)}else{const{error}=await sb.from('mutes').insert({user_id:uid,muted:v});if(error)throw error;muted.add(v)}toast(muted.has(v)?'🔇 Susturuldu':'🔈 Açıldı');openProfile(v)}catch(e){err(e)}},
 pAv:v=>{window.__pav=v;rerender()},
 saveProf:async()=>{const n=val('pNick');if(!nickOK(n))return toast('İsim 3-16 harf/rakam olmalı');try{await rpc('set_profile',{p_nick:n,p_avatar:window.__pav||prof.avatar});prof=await rpc('ensure_profile');toast('✅ Kaydedildi');openProfile()}catch(e){err(e)}},
 link:async()=>{const em=val('pMail'),pw=val('pPass');if(!/^\S+@\S+\.\S+$/.test(em)||pw.length<8)return toast('Geçerli e-posta ve 8+ karakter şifre gir');
  const{error}=await sb.auth.updateUser({email:em,password:pw});if(error)return err(error);toast('📧 Onay e-postası gönderildi; onaylayınca hesabın bağlanır')},
 duel:async v=>{try{const r=await rpc('duel',{p_target:v});replay(r,'🤺 Dostluk Düellosu')}catch(e){err(e)}},
 unprotect:async()=>{try{await rpc('drop_protection');prof.has_attacked=true;toast('Koruma kaldırıldı')}catch(e){err(e)}},
 eqArena:()=>{window.__eqArena=!window.__eqArena;openPvp&&openPvp()},
 raid:async v=>{try{await push();const r=await rpc('raid',{p_target:v});prof&&(prof.has_attacked=true);r.kind='raid';replay(r,'🏴‍☠️ Baskın')}catch(e){err(e)}},
 revenge:async v=>{try{await push();const r=await rpc('revenge',{p_battle:+v});r.kind='raid';replay(r,'🔥 İntikam Baskını')}catch(e){err(e)}},
 arena:async v=>{try{await push();const r=await rpc('arena_fight',{p_target:v,p_equal:!!window.__eqArena});arena=r.arena;replay(r,'🏟️ Kaptanlar Arenası')}catch(e){err(e)}},
 lineup:async v=>{let l=[...(arena.lineup||[])];l=l.includes(v)?l.filter(x=>x!==v):[...l,v].slice(-3);try{await rpc('arena_set_lineup',{p:l});arena.lineup=l;rerender()}catch(e){err(e)}},
 replay:v=>{const b=reports.find(x=>x.id==v);if(!b)return;const att=b.attacker===uid;
  const r={kind:b.kind,win:att?b.win:!b.win,rounds:att?b.rounds:b.rounds.map(x=>({d1:x.d2,d2:x.d1,hp:x.eHp,eHp:x.hp})),def_nick:att?b.def_nick:b.att_nick,att_power:att?b.att_power:b.def_power,def_power:att?b.def_power:b.att_power,
   loot:b.kind==='raid'?b.loot:null,att_lost:att?b.att_lost:b.def_lost,rating_change:b.kind==='arena'?(att?b.loot.rating:-Math.trunc(b.loot.rating/2)):0,a:b.kind!=='raid'?(att?b.loot.a:b.loot.d):null,d:b.kind!=='raid'?(att?b.loot.d:b.loot.a):null};
  const mx=a=>Math.max(1,...(b.rounds||[]).map(x=>x[a]),0);r.myMax=att?(b.rounds[0]?.hp+b.rounds[0]?.d2||mx('hp')):(b.rounds[0]?.eHp+b.rounds[0]?.d1||1);r.eMax=att?(b.rounds[0]?.eHp+b.rounds[0]?.d1||1):(b.rounds[0]?.hp+b.rounds[0]?.d2||1);
  replay(r,'▶️ Savaş Tekrarı')},
};
