import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1];P=sys.argv[2];D='/workspace/sf-art/shots/v11/'+P
async def run(p,q,full):
    b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);c=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    await c.add_init_script(f"localStorage.setItem('sf_q','{q}')")
    pg=await c.new_page();errs=[];pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL+'?lang=tr');await pg.wait_for_function("()=>{const b=document.getElementById('startBtn');return b&&!b.disabled}",timeout=40000)
    await pg.evaluate("()=>document.getElementById('startBtn').click()")
    if full:
      await pg.wait_for_timeout(900);await pg.screenshot(path=D+'-intro-a.png');await pg.wait_for_timeout(1300);await pg.screenshot(path=D+'-intro-b.png')
      print('intro on',await pg.evaluate("()=>!!document.getElementById('intro')"))
    await pg.wait_for_timeout(5000);print('intro gone',await pg.evaluate("()=>!document.getElementById('intro')"))
    for _ in range(4): await pg.evaluate("()=>document.querySelector('#mbox .acts button')?.click()");await pg.wait_for_timeout(400)
    await pg.evaluate("()=>{window.__g.talk=(a,cb)=>cb&&cb();document.querySelector('#talk [data-t=x]')?.click()}")
    await pg.wait_for_timeout(1500)
    if full:
      await pg.screenshot(path=D+'-home.png')
      await pg.evaluate("()=>{const g=window.__g,S=g.S,k=Object.keys(S.g).find(k=>!S.g[k].fog);S.g[k].end=Date.now()+60000;S.g[k].dur=90000;g.syncAll()}");await pg.wait_for_timeout(1500);await pg.screenshot(path=D+'-workers.png')
      for n,f in [('caps','openHeroes'),('shop','openShop'),('tasks',None),('clan','openClan')]:
        if f: await pg.evaluate(f"()=>window.__g.{f}()")
        else: await pg.evaluate("()=>document.getElementById('bTask').click()")
        await pg.wait_for_timeout(1200);await pg.screenshot(path=D+'-'+n+'.png');await pg.evaluate("()=>window.__g.closeSheet()");await pg.wait_for_timeout(500)
    print(q,'perf',await pg.evaluate("()=>window.__perf&&window.__perf()"))
    print('errors:',errs);await b.close()
async def main():
  async with async_playwright() as p:
    await run(p,'auto',True);await run(p,'med',False)
asyncio.run(main())
