// Barut Çağı painted city layer (2D sprites over the 3D canvas)
const P={ambar:[33,26,13],zkule:[67,26,13],kisla:[24,38,20],akademi:[76,38,20],kale:[50,46,32],dokum:[24,57,18],tezgah:[50,62,20],revir:[76,57,18],sur:[50,74,28]};
const band=l=>l>=20?3:l>=10?2:1;
export function start(){
  if(document.getElementById('city2d'))return;const KEYS=Object.keys(P),DEF={kale:1,kisla:1,sur:1,ambar:1};let on=null;
  const st=document.createElement('style');st.textContent=`#city2d{position:fixed;inset:0;z-index:2;overflow:hidden;background:#1a120c;touch-action:manipulation}
#city2d .bg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100vw,calc(100vh*.5625));aspect-ratio:9/16;background:url(img/a/city_bg.webp) center/cover}
#city2d .bd{position:absolute;transform:translate(-50%,-78%);cursor:pointer;-webkit-tap-highlight-color:transparent;filter:drop-shadow(0 6px 6px #000a)}
#city2d .bd img{width:100%;display:block;transition:transform .15s}#city2d .bd:active img{transform:scale(.94)}
#city2d .bd.l0 img{filter:grayscale(.8) brightness(.55)}
#city2d .lb{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);white-space:nowrap;font:700 10px/1.2 system-ui;color:#ffe9c2;background:#2a1606d9;border:1px solid #c8935a;border-radius:8px;padding:1px 6px;text-shadow:0 1px 0 #000}
#city2d .lb b{color:#ffd27a;margin-left:3px}#city2d .tm{display:block;text-align:center;color:#9fe08a;font-size:9px}
body.intro #city2d{display:none}`;document.head.appendChild(st);
  const L=document.createElement('div');L.id='city2d';L.innerHTML='<div class="bg"></div>';const bg=L.firstChild;
  const c=document.getElementById('c');c.after(L);window.__art2d=true;
  const E={};
  for(const k of KEYS){const p=P[k];if(!p)continue;const d=document.createElement('div');d.className='bd';d.dataset.k=k;d.style.cssText=`left:${p[0]}%;top:${p[1]}%;width:${p[2]}%;z-index:${p[1]|0}`;d.innerHTML=`<img alt="" loading="lazy" decoding="async"><div class="lb"></div>`;d.onclick=()=>{try{window.__g?.artTut?.(k)}catch(e){}if(on&&on.city)on.city.focus?on.city.focus(k):on.city.open()};bg.appendChild(d);E[k]=d}
  const tr=k=>on&&on.city&&on.city.name?on.city.name(k):(window.__g?.tx?window.__g.tx('o.c_b_'+k):'');let cache=null;try{cache=JSON.parse(localStorage.getItem('sf_city2d')||'null')}catch(e){}
  const fm=s=>{s=Math.max(0,s|0);const h=s/3600|0,m=(s%3600)/60|0;return h?h+'h'+m+'m':m+'m'+(s%60)+'s'};
  function draw(){const s=on&&on.city&&on.city.state();const B={};if(s&&s.list){s.list.forEach(b=>B[b.key]={lvl:b.lvl,until:b.until});const j=JSON.stringify(B);if(j!==draw.j){draw.j=j;try{localStorage.setItem('sf_city2d',j)}catch(e){}}}else if(cache)Object.assign(B,cache);else for(const k in DEF)B[k]={lvl:DEF[k]};const now=Date.now();
    for(const k in E){const b=B[k]||{};const l=+(b.lvl||0);const d=E[k],im=d.firstChild;const src=`img/a/b_${k}${band(l)}.webp`;if(!im.src.endsWith(src))im.src=src;d.classList.toggle('l0',!l);
      const end=b.until?new Date(b.until).getTime():0;d.lastChild.innerHTML=`${tr(k)}<b>${l}</b>`+(end>now?`<span class="tm">🔨 ${fm((end-now)/1000)}</span>`:'')}}
  draw();const att=()=>{const o=window.__online;if(!o||!o.city||!o.uid)return false;on=o;if(!on.city.state())on.city.sync().then(draw).catch(()=>{});if(on.city.on)on.city.on(draw);draw();return true};const iv=setInterval(()=>{if(!on)att();draw()},1000);
}
