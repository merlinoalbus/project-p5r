import type { AppDatabase } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';

interface PassoPin { schema: 'main' | 'utente'; tabella: string; op: 'D' | 'U' | 'I'; prima?: Record<string, unknown>; dopo?: Record<string, unknown> }
const errore = () => httpErrors.conflict('cestino-pin-registro-incoerente', 'Il registro non descrive la sola rimozione recuperabile del pin e dei suoi stati: transazione annullata, dati conservati.');
const stesso = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const soloPuntatore = (p: PassoPin, campo: string, id: number) => p.op === 'U' && !!p.prima && !!p.dopo && p.prima[campo] === id && p.dopo[campo] === null
  && Object.keys(p.prima).length === Object.keys(p.dopo).length
  && Object.keys(p.prima).every(k => Object.hasOwn(p.dopo!, k) && (k === campo || stesso(p.prima![k], p.dopo![k])));

/** Stessa allowlist prima di acquisire il cestino e prima del reverse: nessuna famiglia estranea viene saltata. */
export function verificaRegistroCestinoPin(db: AppDatabase, passi: readonly PassoPin[], uid: string): void {
  const radici = passi.filter(p => p.schema === 'main' && p.tabella === 'spillo');
  if (!/^[0-9a-f]{32}$/.test(uid) || radici.length !== 1 || radici[0]!.op !== 'D' || radici[0]!.prima?.uid !== uid) throw errore();
  const radice = radici[0]!.prima!, id = radice.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) throw errore();
  const colonne = (db.prepare('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).map(c => c.name);
  if (!colonne.length || Object.keys(radice).length !== colonne.length || colonne.some(c => !Object.hasOwn(radice, c))) throw errore();
  const linkImmagini = passi.filter(p => p.schema === 'main' && p.tabella === 'spillo_immagine' && p.op === 'D' && p.prima?.spillo_id === id);
  const chiaviImmagini = new Set(linkImmagini.flatMap(p => typeof p.prima?.immagine_chiave === 'string' ? [p.prima.immagine_chiave] : []));
  const immagini = new Set(passi.filter(p => p.schema === 'main' && p.tabella === 'immagine' && p.op === 'D' && p.prima?.ambito === 'spillo'
    && typeof p.prima.chiave === 'string' && chiaviImmagini.has(p.prima.chiave)).map(p => p.prima!.id));
  for (const p of passi) {
    // La nuova famiglia non ripristina proiezioni parziali o colonne eliminate
    // dopo la cattura: anche immagini, metadati e stati devono restare integrali.
    if (!db.prepare(`SELECT 1 FROM ${p.schema}.sqlite_master WHERE type='table' AND name=?`).get(p.tabella)) throw errore();
    const campi = (db.prepare('SELECT name FROM pragma_table_info(?,?) ORDER BY cid').all(p.tabella, p.schema) as Array<{ name: string }>).map(c => c.name);
    if (!campi.length || [p.prima, p.dopo].some(r => r && (Object.keys(r).length !== campi.length || campi.some(c => !Object.hasOwn(r, c))))) throw errore();
    if (p.schema === 'utente') {
      if (!['punto_partita', 'spillo_partita', 'divergenza_partita', 'spillo_partita_infiltrazione'].includes(p.tabella)
        || (p.tabella === 'divergenza_partita' && p.op !== 'D')
        || [p.prima, p.dopo].some(r => r && (typeof r.partita_id !== 'number' || !Number.isSafeInteger(r.partita_id) || r.partita_id < 1))) throw errore();
      continue;
    }
    if (p.tabella === 'spillo') continue;
    if (['spillo_voce', 'spillo_immagine'].includes(p.tabella) && p.op === 'D' && p.prima?.spillo_id === id) continue;
    if (p.tabella === 'negozio_sede_spillo' && p.op === 'D' && p.prima?.spillo_uid === uid) continue;
    if (p.tabella === 'immagine' && p.op === 'D' && p.prima?.ambito === 'spillo' && typeof p.prima.chiave === 'string' && chiaviImmagini.has(p.prima.chiave) && immagini.has(p.prima.id)) continue;
    if (p.tabella === 'immagine_miniatura' && p.op === 'D' && immagini.has(p.prima?.immagine_id)) continue;
    if (p.tabella === 'spillo_destinazione' && ((p.op === 'D' && p.prima?.spillo_id === id) || soloPuntatore(p, 'spillo_arrivo_id', id))) continue;
    if (p.tabella === 'dungeon_atterraggio' && soloPuntatore(p, 'spillo_id', id)) continue;
    throw errore();
  }
}
