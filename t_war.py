import sys,json,time
from playwright.sync_api import sync_playwright
ph=sys.argv[1]; D='shots/batch3/'
import os;os.makedirs(D,exist_ok=True)
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  P={};E={}
  for n in 'AB':
    st=f'/tmp/st_{n}.json'
    c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,storage_state=st if os.path.exists(st) else None)
    pg=c.new_page();E[n]=[];pg.on('console',lambda m,n=n:m.type=='error' and E[n].append(m.text));pg.on('pageerror',lambda e,n=n:E[n].append(str(e)))
    pg.goto(f'http://localhost:8767/index.html?lang={"tr" if n=="A" else "en"}');pg.wait_for_timeout(2500)
    if pg.is_visible('#startBtn'): pg.click('#startBtn');pg.wait_for_timeout(600)
    for i in range(6):
      if pg.evaluate("getComputedStyle(document.getElementById('talk')).display!=='none'"): pg.click('#talk',force=True);pg.wait_for_timeout(200)
    for i in range(20):
      if pg.evaluate('window.__online&&__online.on'):break
      pg.wait_for_timeout(500)
    P[n]=pg;print(n,'online',pg.evaluate('window.__online&&[__online.on,__online.uid]'))
  def O(n,s):return P[n].evaluate(s)
  def click(n,sel):P[n].click(sel);P[n].wait_for_timeout(1200)
  if ph=='1':
    for n in 'AB':
      O(n,"__online.open.clan()");P[n].wait_for_timeout(1500)
      if P[n].is_visible('#cName'):
        P[n].fill('#cName','Test Sis '+n+str(int(time.time())%1000));P[n].fill('#cTag','TS'+n);click(n,'[data-o=create]')
      O(n,"__online.open.pvp('war')");P[n].wait_for_timeout(1500)
    P['A'].screenshot(path=D+'01-cephe-bos.png')
    click('A','[data-o=fJoin]');click('B','[data-o=fJoin]');O('A',"__online.open.pvp('war')");P['A'].wait_for_timeout(1500)
    P['A'].screenshot(path=D+'02-cephe-hazirlik.png')
    print(P['A'].inner_text('#sheet')[:600])
  if ph=='2':
    for n in 'AB': O(n,"__online.open.pvp('war')");P[n].wait_for_timeout(1800)
    P['A'].screenshot(path=D+'03-cephe-savas.png');print(P['A'].inner_text('#sheet')[:500])
    O('A',"(()=>{const S=__g.S;S.troops={tayfa:60,zipkin:40,topcu:30};S.heroes.kaan={star:2,sh:14,lv:7};__g.ui&&__g.ui()})()");P['A'].on('response',lambda r:r.status>=400 and print('HTTP',r.status,r.url,r.text()[:200]));btn=P['A'].query_selector('[data-o=fAtk]');print('atkbtn',bool(btn))
    if btn: btn.click();P['A'].wait_for_timeout(4000);P['A'].screenshot(path=D+'04-cephe-saldiri.png');P['A'].wait_for_timeout(8000)
    for i in range(3):
      m=P['A'].query_selector('#modal .btn')
      if m and m.is_visible(): m.click();P['A'].wait_for_timeout(1500)
    print(P['A'].inner_text('#sheet')[:500])
  if ph=='3':
    O('A',"__online.open.pvp('war')");P['A'].wait_for_timeout(2000);P['A'].screenshot(path=D+'05-cephe-sonuc.png');print(P['A'].inner_text('#sheet')[:500])
  if ph in('4','5'):
   if ph=='4':
    O('A',"__online.open.chat('reg')");P['A'].wait_for_timeout(1500)
    P['A'].fill('#chIn','Merhaba kaptanlar, sis geliyor!');
    P['A'].click('[data-o=send]');P['A'].wait_for_timeout(1500)
   if 1:
    O('B',"__online.open.chat('reg')");P['B'].wait_for_timeout(2000)
    P['B'].on('response',lambda r:'translate' in r.url and print('TR',r.status,r.body()[:300]));t=P['B'].query_selector('[data-o=tr]');print('trbtn',bool(t))
    if t: t.click();P['B'].wait_for_timeout(4000)
    P['B'].screenshot(path=D+'06-bolge-sohbet-ceviri.png');print(P['B'].inner_text('#sheet')[:600])
  for n in 'AB': P[n].context.storage_state(path=f'/tmp/st_{n}.json')
  print('errors',E)
