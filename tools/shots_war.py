import asyncio,sys,json
from playwright.async_api import async_playwright
URL=sys.argv[1];P=sys.argv[2];D='/workspace/sf-art/shots/war-art/'+P
TAP="""()=>{const g=window.__g,S=g.S,W=innerWidth,H=innerHeight,r=id=>document.getElementById(id)?.getBoundingClientRect();
 const top=Math.max(r('stat').bottom,(document.getElementById('quest').offsetParent?r('quest').bottom:0)),bot=r('bottom').top,sd=r('side'),wb=r('warBtn');const out=[];
 for(const k in S.g){const p=g.tileScr(k,.4);const inSide=document.getElementById('side').offsetParent&&p.x>sd.left-4&&p.y>sd.top&&p.y<sd.bottom;const inW=p.x>wb.left-4&&p.x<wb.right+4&&p.y>wb.top-4&&p.y<wb.bottom+20;if(inW||p.x<8||p.x>W-8||p.y<top||p.y>bot||inSide)out.push([k,S.g[k].k,Math.round(p.x),Math.round(p.y)])}
 return {n:Object.keys(S.g).length,blocked:out,top:Math.round(top),bot:Math.round(bot)}}"""
async def run(p,q,full):
    b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']);c=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    await c.add_init_script(f"localStorage.setItem('sf_q','{q}');localStorage.setItem('sf_intro','1')")
    pg=await c.new_page();errs=[];pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL+'?lang=tr');await pg.wait_for_function("()=>{const b=document.getElementById('startBtn');return b&&!b.disabled}",timeout=40000)
    await pg.evaluate("()=>document.getElementById('startBtn').click()");await pg.wait_for_timeout(3000)
    for _ in range(4): await pg.evaluate("()=>document.querySelector('#mbox .acts button')?.click()");await pg.wait_for_timeout(400)
    await pg.evaluate("()=>{window.__g.talk=(a,cb)=>cb&&cb();document.querySelector('#talk [data-t=x]')?.click()}")
    # post-tutorial session state (page only, not saved by intent)
    await pg.evaluate("()=>{const g=window.__g,S=g.S;S.tut=99;g.ui();document.querySelectorAll('#tip,#hand').forEach(e=>e.style.display='none')}");await pg.wait_for_timeout(1500)
    if full:
      await pg.evaluate("()=>{const S=window.__g.S;S.troops={tayfa:30,zipkin:30,topcu:30};S.stage=6;window.__g.ui()}");await pg.wait_for_timeout(600)
      await pg.screenshot(path=D+'-home.png');print('tap',json.dumps(await pg.evaluate(TAP)))
      await pg.evaluate("()=>{document.getElementById('modal').classList.remove('on');document.getElementById('warBtn').click()}");await pg.wait_for_timeout(1500);await pg.screenshot(path=D+'-battle1.png')
      await pg.wait_for_function("()=>document.querySelector('.port.skr')",timeout=15000);await pg.screenshot(path=D+'-skill-ready.png')
      await pg.evaluate("()=>document.querySelector('.port.skr').click()");await pg.wait_for_timeout(250);await pg.screenshot(path=D+'-skill-fire.png')
      print('bev',await pg.evaluate("()=>(window.__bev||[]).length"))
      await pg.wait_for_timeout(6000)
    await pg.wait_for_timeout(1000);print(q,'perf',await pg.evaluate("()=>window.__perf&&window.__perf()"))
    print('errors:',errs);await b.close()
async def main():
  async with async_playwright() as p:
    await run(p,'auto',True);await run(p,'med',False)
asyncio.run(main())
