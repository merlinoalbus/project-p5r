from pathlib import Path
p=Path('C:/Repository/project-p5r-main/server/services/mappe/mappeService.ts')
s=p.read_text(encoding='utf8')
s=s.replace('identit� storica','identità storica')
s=s.replace('const sorgenti = new Map<string,string>();','const sorgenti = new Map<string,string>();\n      const rettificheAttive = new Set<string>();')
s=s.replace('sorgenti.set(identita,idMappa(mappa.chiave));','sorgenti.set(identita,idMappa(mappa.chiave));\n        if(RETTIFICHE_NOMI_SEED.some(r=>r.mappa===idMappa(mappa.chiave)&&isDeepStrictEqual(s,r.dopo)))rettificheAttive.add(identita);')
s=s.replace('v.mappa&&sorgenti.get(v.identita)!==v.mappa','v.mappa&&(sorgenti.get(v.identita)!==v.mappa||!rettificheAttive.has(v.identita))')
p.write_text(s,encoding='utf8')
