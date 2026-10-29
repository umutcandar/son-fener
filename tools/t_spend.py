# Batch33: spend-path audit — compares client S + HUD vs server saves after each spend
import asyncio,json,sys,os
from playwright.async_api import async_playwright
U='http://localhost:8770/';D='/workspace/son-fener/shots/batch33/';ST=os.environ.get('ST','/workspace/tmp/st_B.json')
SNAP="""async()=>{const S=__g.S;await __online.test.push();await new Promise(r=>setTimeout(r,800));const v=await __online.test.srv();const d=v.data||{};
const pick=o=>({gems:+o.gems||0,tickets:+o.tickets||0,selTok:+o.selTok||0,ush:+o.ush||0,fish:Math.floor(+(o.res||{}).fish||0),wood:Math.floor(+(o.res||{}).wood||0),crys:Math.floor(+(o.res||{}).crys||0)});
return {c:pick(S),s:pick(d),hud:document.getElementById('r_gems').textContent,hudOk:document.getElementById('r_gems').textContent===(window.__g.fmt?__g.fmt(S.gems):document.getElementById('r_gems').textContent),rev:v.rev}}"""
CONF="""async()=>{for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,600));const m=document.getElementById('modal');if(!m.classList.contains('on'))break;const b=[...m.querySelectorAll('.acts button')].pop();b&&b.click()}}"""
PATHS=[
 ('summon_1x_gems',{'gems':-30},"()=>{__g.openHeroes();const b=document.querySelector('[data-a=call][data-v=\"1\"]');if(!b||b.disabled)return 'SKIP';b.click();return 1}"),
 ('summon_ticket',{'tickets':-1},"()=>{__g.openHeroes();const b=document.querySelector('[data-a=call][data-v=\"t\"]');if(!b||b.disabled)return 'SKIP';b.click();return 1}"),
 ('shop_crys_chest',{'gems':-30},"()=>{__g.openShop();const b=document.querySelector('[data-a=gemItem][data-v=\"1\"]');if(!b||b.disabled)return 'SKIP';b.click();return 1}"),
 ('shop_fish_chest',{'gems':-30},"()=>{__g.openShop();const b=document.querySelector('[data-a=gemItem][data-v=\"2\"]');if(!b||b.disabled)return 'SKIP';b.click();return 1}"),
 ('build_speedup',{'gems':'R'},"async()=>{const S=__g.S;for(const k of Object.keys(S.g).sort((a,b)=>(S.g[b].end||0)-(S.g[a].end||0)||S.g[b].lv-S.g[a].lv)){__g.openB(k);await new Promise(r=>setTimeout(r,300));let s=document.querySelector('#speedBtn');if(!s){const u=document.querySelector('#upBtn');if(u&&!u.disabled){u.click();await new Promise(r=>setTimeout(r,800));__g.openB(k);await new Promise(r=>setTimeout(r,300));s=document.querySelector('#speedBtn')}}if(s&&!s.disabled){const b=S.g[k];const c=__g.L.speedGems(Math.max(0,(b.end||0)-Date.now())/1000,S);if(!c||c>S.gems)continue;s.click();return c}}{__g.openFener();await new Promise(r=>setTimeout(r,300));let s=document.querySelector('#speedBtn');if(!s){const u=document.querySelector('#upBtn');if(u&&!u.disabled){u.click();await new Promise(r=>setTimeout(r,800));__g.openFener();await new Promise(r=>setTimeout(r,300));s=document.querySelector('#speedBtn')}}if(s&&!s.disabled){const c=__g.L.speedGems(Math.max(0,(S.fener.end||0)-Date.now())/1000,S);if(c&&c<=S.gems){s.click();return c}}}{const k=Object.keys(S.g)[0];S.g[k].end=Date.now()+300e3;__g.save();await __online.test.push();__g.openB(k);await new Promise(r=>setTimeout(r,300));const s=document.querySelector('#speedBtn');const c=__g.L.speedGems((S.g[k].end-Date.now())/1000,S);if(s&&c<=S.gems){s.click();return c}}return 'SKIP'}"),
 ('clan_donate_fish500',{'fish':-500},"async()=>{__g.closeSheet&&__g.closeSheet();document.getElementById('bClan').click();for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,500));const b=[...document.querySelectorAll('[data-o=donate]')].find(x=>x.dataset.v.endsWith(':fish:500')&&!x.disabled);if(b){b.click();return 1}const t=[...document.querySelectorAll('[data-o=ctab],[data-o=clanTab]')].find(x=>/tech|🔬/i.test(x.dataset.v||x.textContent));t&&t.click()}return 'SKIP'}"),
 ('clan_shop_crys',{'crys':300},"async()=>{__g.closeSheet&&__g.closeSheet();document.getElementById('bClan').click();for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,500));const c=document.querySelector('button[data-o=cshop]');if(c){c.click();break}}for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,500));const b=document.querySelector('[data-o=csBuy][data-v=crys]');if(b){if(b.disabled)return 'SKIP';b.click();return 1}}return 'SKIP'}"),
]
async def main():
  errs=[];res=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    c=await b.new_context(viewport={'width':390,'height':844},storage_state=ST);pg=await c.new_page()
    pg.on('console',lambda m:m.type=='error' and 'vibrate' not in m.text and errs.append(m.text));pg.on('pageerror',lambda e:errs.append('PE '+str(e)))
    await pg.goto(U+'?lang='+os.environ.get('LG','tr'));await pg.wait_for_function("()=>{const b=document.getElementById('startBtn');return b&&!b.disabled}",timeout=40000)
    for _ in range(6):
      await pg.evaluate("document.getElementById('startBtn')?.click()");await pg.wait_for_timeout(1500)
      if await pg.evaluate("(()=>{const b=document.getElementById('startBtn');return !b||!b.offsetParent})()"):break
    await pg.wait_for_function("()=>window.__online&&window.__online.uid",timeout=40000);await pg.wait_for_timeout(3000)
    only=os.environ.get('ONLY','').split(',') if os.environ.get('ONLY') else None
    for name,exp,act in PATHS:
      if only and name not in only:continue
      a=await pg.evaluate(SNAP);r=await pg.evaluate(act)
      if isinstance(r,(int,float)) and exp.get('gems')=='R':exp={'gems':-int(r)}
      if r=='SKIP':res.append((name,'SKIP'));print(name,'SKIP');continue
      await pg.evaluate(CONF);await pg.wait_for_timeout(4000);await pg.evaluate(CONF);await pg.wait_for_timeout(1500)
      z=await pg.evaluate(SNAP)
      if os.environ.get('SHOTS'):await pg.evaluate(CONF);await pg.screenshot(path=D+'spend_'+name+'.png')
      bad=[k for k in z['c'] if z['c'][k]!=z['s'][k]]
      dd={k:z['s'][k]-a['s'][k] for k in exp}
      ok=not bad and z['hudOk'] and all(abs(dd[k]-v)<=(0 if k in('gems','tickets','selTok','ush') else 8) for k,v in exp.items())
      res.append((name,'PASS' if ok else 'FAIL'));print(name,'PASS' if ok else 'FAIL','srvΔ',dd,'exp',exp,'diverge',bad,'hud',z['hud'],z['c']['gems'],'srv',z['s'])
      await pg.evaluate("__g.closeSheet&&__g.closeSheet()")
    await c.storage_state(path=ST)
  print('SUMMARY',res);print('ERRS',errs);sys.exit(1 if any(x[1]=='FAIL' for x in res) or errs else 0)
asyncio.run(main())
