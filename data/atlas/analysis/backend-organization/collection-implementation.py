from pathlib import Path
import json
root=Path('C:/Repository/project-p5r-main');p=root/'shared/types.ts';s=p.read_text();s=s.replace('export interface MappaRiassuntoDto {','export interface MappaRiassuntoDto {\n  /** Ordinale di una collezione presentativa di immagini omonime, mai numero di piano. */\n  immagineCollezione?: {indice:number;totale:number;ambito:string};',1);p.write_text(s)
p=root/'server/services/mappe/mappeService.ts';s=p.read_text();s="import { calcolaCollezioniImmagini } from './collezioniImmagini.js';\n"+s
excluded=[x['api']['assetOriginale'] for x in json.loads(Path('C:/Users/rober/Documents/Codex/2026-09-05/al/work/parallel-cleanup/luoghi-senza-planimetria.json').read_text())['destinations']]
insert='''// Illustrazioni editoriali documentate in docs/grafica/prompt-immagini.md §19.
const ILLUSTRAZIONI_EDITORIALI = new Set('''+json.dumps(excluded)+''');
function collezioniImmagini(){
 const righe=prepared('SELECT * FROM mappa').all() as RigaMappa[];
 return calcolaCollezioniImmagini(righe.map(r=>({chiave:r.chiave,genitore:r.genitore_chiave,nome:r.nome,ordine:r.ordine,...presentazioneMappa(r.chiave),fisica:!!immagineDi(r)||!!(r.asset&&!ILLUSTRAZIONI_EDITORIALI.has(r.asset)&&(r.larghezza??0)>0&&(r.altezza??0)>0)})));
}
'''
s=s.replace('function riassunto(r: RigaMappa): MappaRiassuntoDto {',insert+'function riassunto(r: RigaMappa, collezioni=collezioniImmagini()): MappaRiassuntoDto {',1)
s=s.replace('    ...presentazioneMappa(r.chiave),','    ...presentazioneMappa(r.chiave),\n    ...(collezioni.has(r.chiave)?{immagineCollezione:collezioni.get(r.chiave)}:{}),',1)
s=s.replace("  return (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, nome').all() as RigaMappa[]).map(riassunto);","  const collezioni=collezioniImmagini();\n  return (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, nome').all() as RigaMappa[]).map(r=>riassunto(r,collezioni));",1)
s=s.replace("  const figli = (prepared('SELECT * FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, nome').all(chiave) as RigaMappa[]).map(riassunto);","  const collezioni=collezioniImmagini();\n  const figli = (prepared('SELECT * FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, nome').all(chiave) as RigaMappa[]).map(r=>riassunto(r,collezioni));",1)
s=s.replace('    ...riassunto(r), larghezza:', '    ...riassunto(r,collezioni), larghezza:',1)
p.write_text(s)
