import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1];P=sys.argv[2];D='/workspace/sf-art/shots/v10/'+P
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);c=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    pg=await c.new_page();errs=[];pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL+'?lang=tr');await pg.wait_for_function("()=>{const b=document.getElementById('startBtn');return b&&!b.disabled}",timeout=40000)
    for _ in range(6):
      await pg.evaluate("()=>document.getElementById('startBtn')?.click()");await pg.wait_for_timeout(1500)
      if await pg.evaluate("()=>{const b=document.getElementById('startBtn');return !b||!b.offsetParent}"):break
    await pg.wait_for_timeout(4000)
    for _ in range(4): await pg.evaluate("()=>document.querySelector('#mbox .acts button')?.click()");await pg.wait_for_timeout(500)
    await pg.evaluate("()=>{window.__g.talk=(a,cb)=>cb&&cb();document.querySelector('#talk [data-t=x]')?.click()}")
    await pg.screenshot(path=D+'-hud.png')
    k=await pg.evaluate("()=>{const g=window.__g,S=g.S,ks=Object.keys(S.g).filter(k=>!S.g[k].fog);const k=ks[0];S.g[k].end=Date.now()+60000;S.g[k].dur=90000;g.syncAll();return k}")
    await pg.wait_for_timeout(1200);await pg.screenshot(path=D+'-scaf-a.png');await pg.wait_for_timeout(300);await pg.screenshot(path=D+'-scaf-b.png')
    await pg.evaluate("k=>{const b=window.__g.S.g[k];b.end=Date.now()+800}",k);await pg.wait_for_timeout(1700);await pg.screenshot(path=D+'-done.png')
    await pg.evaluate("()=>{const g=window.__g,S=g.S;g.L.HEROES.forEach((H,i)=>{if(!S.heroes[H.id]&&i%2==0)S.heroes[H.id]={lv:1+i%7,star:1+i%3}});g.openHeroes()}");await pg.wait_for_timeout(1500);await pg.screenshot(path=D+'-caps.png')
    await pg.evaluate("()=>window.__g.closeSheet()");await pg.wait_for_timeout(500)
    await pg.evaluate("()=>{const s=window.__g.S;s.boss&&(s.boss.n=0);window.__g.bossFight()}");await pg.wait_for_timeout(1150);await pg.screenshot(path=D+'-boss-a.png')
    print('hdr1',await pg.evaluate("()=>document.getElementById('bdmg').textContent"));await pg.wait_for_timeout(1500);await pg.screenshot(path=D+'-boss-b.png');print('hdr2',await pg.evaluate("()=>document.getElementById('bdmg').textContent"));await pg.wait_for_timeout(9000);await pg.screenshot(path=D+'-boss-end.png');print('modal',await pg.evaluate("()=>document.getElementById('mbox')?.innerText.slice(0,80)"))
    print('perf',await pg.evaluate("()=>window.__perf&&window.__perf()"))
    print('errors:',errs);await b.close()
asyncio.run(main())
