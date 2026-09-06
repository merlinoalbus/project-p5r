import json
j=json.load(open('work/parallel-cleanup/nomi-varianti.json'));print(j.keys())
for k,v in j.items():
 if isinstance(v,list):
  for r in v:
   if isinstance(r,dict) and any(x in str(r.get('code',''))+str(r.get('key','')) for x in ['151_2_1','151_3_0','151_4_0','155_4_0','155_6_0','161_4_0','161_7_0']): print(json.dumps(r,ensure_ascii=False))
