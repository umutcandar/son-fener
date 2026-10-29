#!/usr/bin/env python3
"""Fails (exit 1) if any i18n key used in code is missing from any language file."""
import re,json,glob,os,sys
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
langs={os.path.basename(p)[:-5]:json.load(open(p)) for p in glob.glob(R+'/i18n/*.json')}
used=set()
IGN={'o.a','o.c','o.d'}  # openTasks shadows T locally
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
print(f'{len(used)} keys checked across {len(langs)} languages: '+('FAIL' if bad else 'OK'))
sys.exit(bad)
