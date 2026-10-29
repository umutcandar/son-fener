#!/usr/bin/env python3
"""Fails (exit 1) if any i18n key used in code is missing from any language file,
or if game.js/online.js/logic.js contain hardcoded UI text not routed through i18n."""
import re,json,glob,os,sys
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
langs={os.path.basename(p)[:-5]:json.load(open(p)) for p in glob.glob(R+'/i18n/*.json')}
used=set()
IGN={'o.a','o.c','o.d','o.w'}  # openTasks shadows T locally
for f in glob.glob(R+'/*.js'):
  if f.endswith('i18n.js'): continue
  s=open(f,encoding='utf-8').read()
  for m in re.finditer(r"\b(?:tx|t)\(\s*'([a-zA-Z][\w.-]*)'",s): used.add(m.group(1))
  for m in re.finditer(r"\bT\(\s*'([\w.-]+)'",s): used.add('o.'+m.group(1))
  for m in re.finditer(r"['\"`]((?:ui|o|e|html|guide)\.[a-zA-Z_][\w.-]*)['\"`]",s): used.add(m.group(1))
used={k for k in used if k not in IGN and not k.endswith('.') and not k.endswith('_')}
bad=0
for l,d in sorted(langs.items()):
  miss=sorted(k for k in used if k not in d)
  if miss: bad=1;print(f'{l}: {len(miss)} missing: {" ".join(miss[:40])}')
import subprocess
js=r'''import * as L from './logic.js';const o=[];const go=(x,p)=>{for(const k in x){const v=x[k],kk=p+'.'+k;if(typeof v==='string'){if(/[a-zA-Z\u00c0-\u017f]{3}/.test(v)&&/\s|[\u00c0-\u017f]/.test(v))o.push(kk)}else if(v&&typeof v==='object')go(v,kk)}};for(const k in L){const v=L[k];if(v&&typeof v==='object'&&!Object.isFrozen(v))go(v,'d.'+k)}console.log(JSON.stringify(o))'''
dk=json.loads(subprocess.run(['node','--input-type=module','-e',js],cwd=R,capture_output=True,text=True,check=True).stdout)
for l,d in sorted(langs.items()):
  if l=='tr': continue
  miss=[k for k in dk if k not in d]
  if miss: bad=1;print(f'{l}: {len(miss)} untranslated logic.js data strings: {" ".join(miss[:40])}')
used|=set(dk)
hc=json.loads(subprocess.run(['node',R+'/tools/scan_hardcoded.mjs'],cwd=R,capture_output=True,text=True,check=True).stdout)
if hc: bad=1;print(f'{len(hc)} hardcoded UI strings (move to i18n keys or ALLOW in tools/scan_hardcoded.mjs):');[print('  '+x) for x in hc[:60]]
print(f'{len(used)} keys checked across {len(langs)} languages: '+('FAIL' if bad else 'OK'))
sys.exit(bad)
