from pathlib import Path
import json
root=Path('C:/Repository/project-p5r-main');pins=json.loads(Path('work/root-name-release/changes.json').read_text())['pins']
body=[{'mappa':p['map'],'prima':p['before'],'dopo':p['after']} for p in pins]
(root/'server/services/mappe/rettificheNomiSeed.ts').write_text("import type { EsportazioneMappeDto } from '../../../shared/types.js';\nexport const RETTIFICHE_NOMI_SEED: Array<{mappa:string;prima:EsportazioneMappeDto['mappe'][number]['spilli'][number];dopo:EsportazioneMappeDto['mappe'][number]['spilli'][number]}> = "+json.dumps(body,ensure_ascii=False,indent=2)+';\n')
p=root/'server/services/mappe/mappeService.ts';s=p.read_text();s="import { isDeepStrictEqual } from 'node:util';\nimport { RETTIFICHE_NOMI_SEED } from './rettificheNomiSeed.js';\n"+s
needle='export interface EsitoImportazione {'
insert='''/** Rettifiche editoriali certificate: nessun campo personale o identità storica viene riscritto. */
export function rettificaNomiSpilliSeed(mappa?: string, spilli?: EsportazioneMappeDto['mappe'][number]['spilli']): number[] {
  const modificati: number[] = [];
  for (const rettifica of RETTIFICHE_NOMI_SEED) {
    if (mappa !== undefined && rettifica.mappa !== mappa) continue;
    if (spilli && spilli.filter(s=>isDeepStrictEqual(s,rettifica.dopo)).length!==1) continue;
    const candidati=(prepared("SELECT * FROM spillo WHERE mappa_chiave=? AND origine='seed'").all(rettifica.mappa) as RigaSpillo[]).filter(r=>spilloInvariatoNelSeed(r,rettifica.prima));
    if(candidati.length!==1)continue;
    const r=candidati[0];
    prepared('UPDATE spillo SET nome=?,descrizione=? WHERE id=?').run(rettifica.dopo.nome,rettifica.dopo.descrizione,r.id);
    modificati.push(r.id);
  }
  return modificati;
}
function identitaRettificata(identita:string): {identita:string;mappa?:string} {
  const r=RETTIFICHE_NOMI_SEED.find(r=>identitaSpillo({...r.prima,riferimento:r.prima.riferimento??null})===identita);
  return r?{identita:identitaSpillo({...r.dopo,riferimento:r.dopo.riferimento??null}),mappa:r.mappa}:{identita};
}

'''
assert needle in s;s=s.replace(needle,insert+needle,1)
s=s.replace('const occorrenze = new Map<string, number>();','const occorrenze = new Map<string, number>();\n      const sorgenti = new Map<string,string>();',1)
s=s.replace('occorrenze.set(identita, (occorrenze.get(identita) ?? 0) + 1);','occorrenze.set(identita, (occorrenze.get(identita) ?? 0) + 1);\n        sorgenti.set(identita,idMappa(mappa.chiave));',1)
a='''      const eredi = prepared("SELECT seed_identita_json FROM spillo WHERE origine='utente' AND seed_identita_json IS NOT NULL GROUP BY seed_identita_json HAVING COUNT(*)=1").all() as Array<{seed_identita_json:string}>;
      for (const r of eredi) if (occorrenze.get(r.seed_identita_json) === 1) identitaSpostate.add(r.seed_identita_json);'''
b='''      const eredi = prepared("SELECT seed_identita_json FROM spillo WHERE origine='utente' AND seed_identita_json IS NOT NULL").all() as Array<{seed_identita_json:string}>;
      const conteggioEredi=new Map<string,number>();
      for(const r of eredi){const v=identitaRettificata(r.seed_identita_json);const identita=v.mappa&&sorgenti.get(v.identita)!==v.mappa?r.seed_identita_json:v.identita;conteggioEredi.set(identita,(conteggioEredi.get(identita)??0)+1);}
      for (const [identita,n] of conteggioEredi) if (n===1&&occorrenze.get(identita)===1) identitaSpostate.add(identita);'''
assert a in s;s=s.replace(a,b,1)
s=s.replace('      const invariati = new Map<number, number>();',"      if(origine==='seed'&&!opz.sovrascrivi)rettificaNomiSpilliSeed(m.chiave,m.spilli??[]);\n      const invariati = new Map<number, number>();",1)
p.write_text(s)
