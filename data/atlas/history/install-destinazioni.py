from pathlib import Path
import shutil
root=Path('C:/Repository/project-p5r-main')
work=Path(__file__).parent
def edit(path,changes):
    p=root/path;s=p.read_text(encoding='utf-8-sig')
    for old,new in changes:
        assert old in s,(path,old[:100])
        s=s.replace(old,new)
    p.write_text(s,encoding='utf-8')
shutil.copyfile(work/'040_destinazioni_spilli.ts',root/'server/db/migrations/040_destinazioni_spilli.ts')
shutil.copyfile(work/'destinazioniSpillo.ts',root/'server/services/mappe/destinazioniSpillo.ts')
edit('server/db/migrations/index.ts',[("import { migration039 }", "import { migration040 } from './040_destinazioni_spilli.js';\nimport { migration039 }"),('migration038, migration039];','migration038, migration039, migration040];')])
edit('shared/types.ts',[
 ('export interface SpilloDto {','export interface DestinazioneSpillo { mappa: string; x: number; y: number; zoom: number }\n\nexport interface SpilloDto {\n  destinazione?: DestinazioneSpillo | null;\n  /** A previous explicit destination was deleted; never fall back to the entity link. */\n  destinazioneNonDisponibile?: boolean;'),
 ('spilli: Array<{ tipo: TipoSpillo;', 'spilli: Array<{ destinazione?: DestinazioneSpillo | null; destinazioneNonDisponibile?: boolean; tipo: TipoSpillo;')])
edit('server/schemas/mappe.ts',[("import { z } from 'zod';","import { z } from 'zod';\nimport { schemaDestinazioneSpillo } from '../services/mappe/destinazioniSpillo.js';"),('export const bodyCreaSpillo = z.object({','export const bodyCreaSpillo = z.object({\n  destinazione: schemaDestinazioneSpillo.nullable().optional(),')])
edit('server/services/mappe/mappeService.ts',[
 ("import path from 'node:path';","import path from 'node:path';\nimport type { DestinazioneSpillo } from '../../../shared/types.js';\nimport { leggiDestinazioneSpillo, salvaDestinazioneSpillo, verificaDestinazioneSpillo } from './destinazioniSpillo.js';"),
 ('    id: r.id, mappaChiave:', '    ...leggiDestinazioneSpillo(r.id),\n    id: r.id, mappaChiave:'),
 ('export interface DatiSpillo {','export interface DatiSpillo { destinazione?: DestinazioneSpillo | null;'),
 ('  verificaCondizioni(dati.condizioni);','  verificaCondizioni(dati.condizioni);\n  const destinazione = verificaDestinazioneSpillo(dati.destinazione);'),
 ("  prepared(\"UPDATE mappa SET updated_at = ? WHERE chiave = ?\").run(adesso, mappaChiave);", "  salvaDestinazioneSpillo(Number(info.lastInsertRowid), destinazione);\n  prepared(\"UPDATE mappa SET updated_at = ? WHERE chiave = ?\").run(adesso, mappaChiave);"),
 ("  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo);\n}", "  salvaDestinazioneSpillo(id, destinazione);\n  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo);\n}"),
 ('      tipo: s.tipo, nome: s.nome, descrizione:', '      ...leggiDestinazioneSpillo(s.id),\n      tipo: s.tipo, nome: s.nome, descrizione:'),
 ("  const origine = opz.origine ?? 'utente';", "  const incoming = new Set(pacchetto.mappe.filter(m => chiaveValida(m.chiave) && (TIPI_MAPPA as readonly string[]).includes(m.tipo)).map(m => m.chiave));\n  for (const m of pacchetto.mappe) for (const s of m.spilli ?? []) {\n    if (s.destinazioneNonDisponibile !== undefined && typeof s.destinazioneNonDisponibile !== 'boolean') throw httpErrors.badRequest('destinazione-non-valida', 'Stato della destinazione non valido.');\n    if (s.destinazioneNonDisponibile && s.destinazione) throw httpErrors.badRequest('destinazione-non-valida', 'Una destinazione non può essere presente e invalidata.');\n    s.destinazione = verificaDestinazioneSpillo(s.destinazione, incoming);\n  }\n  const origine = opz.origine ?? 'utente';"),
 ('    const adesso = nowIso();\n    const statiSchema=', '    const arrivi: Array<{id:number; valore:DestinazioneSpillo|null|undefined; invalidata:boolean}> = [];\n    const adesso = nowIso();\n    const statiSchema='),
 ('        const spilloId = Number(info.lastInsertRowid);', '        const spilloId = Number(info.lastInsertRowid);\n        arrivi.push({id:spilloId,valore:s.destinazione,invalidata:s.destinazioneNonDisponibile??false});'),
 ('    sincronizzaPercorsiMappe(getDb());\n    if(pacchetto.ingressi', '    for (const arrivo of arrivi) salvaDestinazioneSpillo(arrivo.id, verificaDestinazioneSpillo(arrivo.valore), arrivo.invalidata);\n    sincronizzaPercorsiMappe(getDb());\n    if(pacchetto.ingressi')])
# Make the two write endpoints atomic, including the new destination row.
p=root/'server/services/mappe/mappeService.ts';s=p.read_text(encoding='utf-8')
for name,next_name in [('creaSpillo','aggiornaSpillo'),('aggiornaSpillo','eliminaSpillo')]:
    start=s.index('export function '+name+'(');end=s.index('\nexport function '+next_name+'(',start)
    block=s[start:end];body_start=block.index(': SpilloDto {')+len(': SpilloDto {')
    last=block.rfind('\n}')
    block=block[:body_start]+'\n  return getDb().transaction(() => {'+block[body_start:last]+'\n  })();'+block[last:]
    s=s[:start]+block+s[end:]
p.write_text(s,encoding='utf-8')
