import asyncio,sys
from playwright.async_api import async_playwright
U=sys.argv[1];D='/workspace/sf-art/shots/siege/'+sys.argv[2]
async def m():
 async with async_playwright() as p:
  b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':412,'height':892});er=[];pg.on('pageerror',lambda e:er.append(str(e)))
  await pg.goto(U+'?siege');await pg.wait_for_timeout(7000);await pg.click('#startBtn',force=True)
  fps=[]
  for i,w in enumerate([1500,2200,900,1500,1200,600,800,2000,1500,1800,1400,2500]):
   await pg.wait_for_timeout(w)
   if i==4 or i==9: await pg.mouse.click(206,400)
   await pg.screenshot(path=f'{D}-{i:02d}.png')
  print('errors',er,'gone',await pg.evaluate("()=>!document.getElementById('siege')"));await b.close()
asyncio.run(m())
