import asyncio,sys
from playwright.async_api import async_playwright
U=sys.argv[1];D='/workspace/sf-art/shots/siege/'+sys.argv[2]
async def m():
 async with async_playwright() as p:
  b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':412,'height':892});er=[];pg.on('pageerror',lambda e:er.append(str(e)))
  await pg.goto(U+'?siege');await pg.wait_for_timeout(6000);await pg.evaluate("document.getElementById('startBtn').click()")
  n=[0]
  async def shot(w=0):
   if w:await pg.wait_for_timeout(w)
   await pg.screenshot(path=f'{D}-{n[0]:02d}.png');n[0]+=1
  W=lambda js:pg.wait_for_function(js,timeout=60000)
  await shot(1800);await shot(1500)
  await W("window.__sgPh===1");await shot(600)
  await W("window.__sgTap==='ui.sg_tap_ult'");await shot(300);await pg.mouse.click(206,300)
  await shot(350);await shot(900);await shot(1200)
  await W("window.__sgPh===3");await shot(700);await shot(1200);await shot(1600)
  await W("window.__sgTap==='ui.sg_tap_wall'");await shot(400);await pg.mouse.click(206,300)
  await shot(500);await shot(1300)
  await W("window.__sgPh===5");await shot(800);await shot(1800);await shot(1300)
  await pg.wait_for_timeout(3000)
  print('errors',er,'gone',await pg.evaluate("()=>!document.getElementById('siege')"));await b.close()
asyncio.run(m())
