import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1];P=sys.argv[2];D='/workspace/sf-art/shots/v8/'+P
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
    await pg.evaluate("()=>{window.__g.talk=(a,cb)=>cb&&cb();document.querySelector('#talk [data-t=x]')?.click();const s=window.__g.S;s.stage=Math.max(s.stage,4);for(const t in s.troops)s.troops[t]=Math.max(s.troops[t],12)}")
    await pg.evaluate("()=>{document.getElementById('bMap').click()}");await pg.wait_for_timeout(1500)
    await pg.screenshot(path=D+'-map.png')
    await pg.evaluate("()=>document.getElementById('fightBtn')?.click()");await pg.wait_for_timeout(700);await pg.screenshot(path=D+'-battle1.png')
    await pg.wait_for_timeout(1500);await pg.screenshot(path=D+'-battle2.png');await pg.evaluate("()=>document.getElementById('bSpd').click()")
    await pg.wait_for_timeout(900);await pg.screenshot(path=D+'-battle3.png');await pg.evaluate("()=>document.getElementById('bSkip').click()");await pg.wait_for_timeout(1800);await pg.screenshot(path=D+'-battle4-result.png')
    print('errors:',errs);await b.close()
asyncio.run(main())
