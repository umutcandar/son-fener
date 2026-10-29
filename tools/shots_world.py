import asyncio,sys
from playwright.async_api import async_playwright
U=sys.argv[1];D='/workspace/sf-art/shots/war-art/'+sys.argv[2]
async def m():
 async with async_playwright() as p:
  b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':473,'height':1024},device_scale_factor=1)
  er=[];pg.on('pageerror',lambda e:er.append(str(e)))
  await pg.add_init_script("localStorage.setItem('sf_intro','1')");await pg.goto(U);await pg.wait_for_timeout(6000)
  await pg.evaluate("()=>{const b=document.getElementById('startBtn');b&&b.click()}");await pg.wait_for_timeout(3000)
  await pg.evaluate("()=>{const g=__g;g.S.tut=99;g.ui();document.getElementById('modal').classList.remove('on');document.getElementById('warBtn').click()}")
  await pg.wait_for_timeout(2500);print('on',await pg.evaluate('()=>[!!(window.__online&&__online.on),!!document.querySelector("#world.on")]'));await pg.screenshot(path=D+'-w0zoom.png');await pg.wait_for_timeout(4000);await pg.screenshot(path=D+'-w1home.png')
  await pg.mouse.move(236,500)
  for i in range(8): await pg.mouse.wheel(0,200);await pg.wait_for_timeout(120)
  await pg.wait_for_timeout(2500);await pg.screenshot(path=D+'-w2world.png')
  await pg.evaluate("()=>{}")
  # tap fort f0 (300,320)
  xy=await pg.evaluate("()=>{const W=innerWidth,H=innerHeight;return 0}")
  for i in range(6): await pg.mouse.wheel(0,-200);await pg.wait_for_timeout(100)
  await pg.wait_for_timeout(2000);await pg.screenshot(path=D+'-w3close.png')
  print('errors',er)
  await b.close()
asyncio.run(m())
