import sys,json
from playwright.sync_api import sync_playwright
url,pre=sys.argv[1],sys.argv[2]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
  errs=[];pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e:errs.append(str(e)))
  J=lambda s:pg.evaluate(s)
  import os
  OUT=os.environ.get('OUT','shots/v4');os.makedirs(OUT,exist_ok=True)
  ISL=os.environ.get('ISL')
  if os.environ.get('Q'): pg.add_init_script("localStorage.setItem('sf_q','"+os.environ['Q']+"')")
  pg.goto(url+'?lang=tr');pg.wait_for_timeout(3000)
  try: J("document.getElementById('startBtn').click()")
  except Exception as e: print('nostart',e)
  pg.wait_for_timeout(1200)
  J('''(()=>{window.__noSave=1;const S=__g.S;S.tut=9;Object.assign(S.res,{fish:24000,wood:52000,crys:18000});S.surv=18;S.fener.lv=6;S.fener.on=true;S.stage=9;
   const put=(k,kind,lv,w=0)=>S.g[k]={k:kind,lv,w,stored:0};
   put('2,0','mine',5,4);put('2,1','mine',2,2);put('0,2','fisher',3,3);put('1,2','fisher',2);put('-2,0','wood',4,4);put('-2,-1','hut',3);put('-3,1','hut',6);put('-3,0','hut',2);put('-1,-2','hut',2);
   put('3,2','yard',4,2);put('-2,3','lab',3);put('2,-2','wood',8,2);put('0,-3','hut',1);put('1,-3','hut',9);put('3,-1','fisher',7);put('-4,2','mine',8);put('4,0','wood',1);put('0,4','fisher',1);put('-1,2','tower',5);put('-3,-2','pearl',5);put('3,3','forge',7);put('-4,-1','pearl',1);
   S.g['2,1'].end=Date.now()+400000;S.g['2,1'].dur=480;S.t0=Date.now()-(__g.L.NIGHT_EVERY*.3)*1000;__g.syncAll();__g.syncPeople();__g.ui()})()''')
  for _ in range(6):
    try:
      if J("document.getElementById('talk').classList.contains('on')"): J("document.getElementById('talk').click()")
      J("document.querySelectorAll('#modal.on .btn').forEach(b=>b.click())")
    except: pass
    pg.wait_for_timeout(200)
  J("document.getElementById('modal').classList.remove('on')")
  pg.wait_for_timeout(3000);pg.screenshot(path=f'{OUT}/{pre}-1-gunduz.png')
  perf=J('__perf()');print('perf day',json.dumps(perf));print('dc',json.dumps(J('__dc2()')))
  J("__g.cam.dist=__g.cam.dist*.5");pg.wait_for_timeout(1500);pg.screenshot(path=f'{OUT}/{pre}-2-yakin.png')
  J("__g.cam.az+=1.6");pg.wait_for_timeout(1500);pg.screenshot(path=f'{OUT}/{pre}-3-yakin-donuk.png');J("__g.cam.az-=1.6;__g.cam.dist=__g.cam.dist*2")
  J('__g.S.t0=Date.now()-(__g.L.NIGHT_EVERY-__g.L.NIGHT_LEN+3)*1000;__g.S.nightN=0');pg.wait_for_timeout(6000);pg.screenshot(path=f'{OUT}/{pre}-4-sis-gecesi.png')
  print('perf night',json.dumps(J('__perf()')))
  J('__g.S.t0=Date.now()-(__g.L.NIGHT_EVERY*.3)*1000');pg.wait_for_timeout(4000)
  for isl in ['mercan','volkan']:
    J(f"(()=>{{const S=__g.S;S.isl=S.isl||{{}};S.isl['{isl}']=Object.assign(S.isl['{isl}']||{{}},{{own:true,lv:S.isl['{isl}']?.lv||2}});__g.goIsland('{isl}')}})()");pg.wait_for_timeout(2500)
    J("document.querySelectorAll('#modal.on .btn').forEach(b=>b.click());document.getElementById('modal').classList.remove('on')");pg.wait_for_timeout(800);pg.screenshot(path=f'{OUT}/{pre}-5-{isl}.png')
  print('errors:',errs)
