from pathlib import Path
r=Path(r'C:\Repository\project-p5r-main')
def edit(p,a,b):
 f=r/p;s=f.read_text(encoding='utf-8');assert a in s,(p,a);f.write_text(s.replace(a,b),encoding='utf-8')
p='server/db/migrations/041_posizioni_spilli.ts'
assert not (r/p).exists()
(r/p).write_text("import type { Migration } from '../migrationRunner.js';\nexport const migration041: Migration = { id: 41, name: 'posizioni_spilli', up(db) {\n  db.exec('ALTER TABLE spillo ADD COLUMN solo_posizione INTEGER NOT NULL DEFAULT 0 CHECK (solo_posizione IN (0, 1))');\n} };\n",encoding='utf-8')
edit('server/db/migrations/index.ts','export const migrations:',"import { migration041 } from './041_posizioni_spilli.js';\n\nexport const migrations:")
edit('server/db/migrations/index.ts','migration039, migration040];','migration039, migration040, migration041];')
edit('shared/types.ts','  collezionabile: boolean;\n  /** Condizioni', '  collezionabile: boolean;\n  /** Localizzazione del luogo, senza attestare la disponibilità delle attività. */\n  soloPosizione?: boolean;\n  /** Condizioni')
edit('shared/types.ts','spilli: Array<{ destinazione?', 'spilli: Array<{ soloPosizione?: boolean; destinazione?')
for p,token in [('server/services/mappe/mappeService.ts','export interface DatiSpillo {'),('src/services/api/mappe.ts','export interface DatiSpilloApi {'),('src/pages/EditorMappaPage.tsx','export interface AppuntiSpillo {')]:
 edit(p,token,token+' soloPosizione?: boolean;')
edit('server/schemas/mappe.ts','  destinazione: schemaDestinazioneSpillo','  soloPosizione: z.boolean().optional(),\n  destinazione: schemaDestinazioneSpillo')
p='server/services/mappe/mappeService.ts'
edit(p,'interface RigaSpillo {','interface RigaSpillo { solo_posizione: number;')
edit(p,'const disponibilita = ctx.st ? valutaRequisiti(perValutazione, ctx.st) : undefined;',"const esitoVisibilita = ctx.st ? valutaRequisiti(perValutazione, ctx.st) : undefined;\n  const disponibilita = r.solo_posizione === 1 && esitoVisibilita?.stato === 'disponibile' ? undefined : esitoVisibilita;")
edit(p,'collezionabile: r.collezionabile === 1, condizioni,','soloPosizione: r.solo_posizione === 1, collezionabile: r.collezionabile === 1, condizioni,')
# Preserve the existing transaction and INSERT defaults; write the optional property before reading DTO.
edit(p,'  salvaDestinazioneSpillo(Number(info.lastInsertRowid), destinazione);',"  prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));\n  salvaDestinazioneSpillo(Number(info.lastInsertRowid), destinazione);")
edit(p,'  salvaDestinazioneSpillo(id, destinazione);',"  if (dati.soloPosizione !== undefined) prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, id);\n  salvaDestinazioneSpillo(id, destinazione);")
edit(p,'collezionabile: s.collezionabile === 1, ordine:', 'soloPosizione: s.solo_posizione === 1, collezionabile: s.collezionabile === 1, ordine:')
edit(p,'    if (s.destinazioneNonDisponibile !== undefined',"    if (s.soloPosizione !== undefined && typeof s.soloPosizione !== 'boolean') throw httpErrors.badRequest('posizione-non-valida', 'Il campo soloPosizione deve essere booleano.');\n    if (s.destinazioneNonDisponibile !== undefined")
edit(p,'jsonCondizioni(valide));','jsonCondizioni(valide));\n        prepared(\'UPDATE spillo SET solo_posizione = ? WHERE id = ?\').run(s.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));')
p='src/pages/EditorMappaPage.tsx'
edit(p,'  const [collezionabile,', '  const [soloPosizione, setSoloPosizione] = useState(s.soloPosizione ?? false);\n  const [collezionabile,')
edit(p,'  const modificato = JSON.stringify(destinazione)', '  const modificato = soloPosizione !== (s.soloPosizione ?? false) || JSON.stringify(destinazione)')
edit(p,'descrizione, collezionabile, riferimento:', 'descrizione, collezionabile, soloPosizione, riferimento:')
edit(p,'        <DestinazioneSpilloEditor', '        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={soloPosizione} onChange={e => setSoloPosizione(e.target.checked)} /> Posizione del luogo (non indica un’attività disponibile)</label>\n        <DestinazioneSpilloEditor')
edit('src/components/mappe/NavigazioneSpillo.tsx','  if (s.destinazioneNonDisponibile)', '  if (s.soloPosizione) return <p className="text-[12px] text-text-muted">Posizione del luogo. La disponibilità delle attività va verificata separatamente.</p>;\n  if (s.destinazioneNonDisponibile)')
edit('src/utils/navigazioneMappa.ts','  if(s.destinazioneNonDisponibile)', '  if(s.soloPosizione)return null;\n  if(s.destinazioneNonDisponibile)')
