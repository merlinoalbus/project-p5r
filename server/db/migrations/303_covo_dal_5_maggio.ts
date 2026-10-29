// ============================================================
// Migrazione 303 — il Covo dei Ladri c'è dal 5 maggio, con la data scritta una volta: sull'Area (richiesta dell'utente del 2026-10-29)
// ============================================================
//
// Richieste dell'utente: «il covo dei ladri si sblocca il 5 maggio...(giorno di gioco)» e «non devi solo correggere i testi, ma far sì che
// compaia in mappa solo da quella data in poi». Fino a qui l'Area del Covo (`citta/yongen-jaya/covo-dei-ladri`) seguiva solo il suo
// quartiere, aperto dall'inizio, e la data stava ripetuta nove volte, sui nove servizi della 143. Ora:
//   1. l'Area ha una condizione propria (`area.condizioni_json`, colonna nuova, nullable): vale in AND con quella del quartiere e la
//      leggono tutti (elenchi delle Aree, figli della mappa del quartiere, indice delle Mappe, mappa di Tokyo, presenza dei luoghi
//      dell'Area). Si scrive la data «dal 05-05» sull'Area del Covo **solo se l'Area non ha già una condizione**;
//   2. i servizi del Covo la ereditano dall'Area: la loro copia si toglie **solo** se è esattamente `[{"tipo":"data","dal":"05-05"}]`,
//      sulla riga mai corretta (`seed_json` nullo) e nell'Area del Covo che ora porta la stessa data; ogni altra condizione resta com'è;
//   3. l'introduzione del Covo nella guida (`dati_guida.completamento`, `covo.introduzione`) dice «si sblocca avanzando nella storia oltre il
//      5 maggio»: diventa «si sblocca il 5 maggio», solo se la frase c'è esattamente una volta e solo se l'utente non ha corretto quel
//      campo (`correzione_dati_guida`, blocco `completamento`, percorso `covo/introduzione`: la sua correzione ha la precedenza).
// Le partite non si toccano. Idempotente: la seconda volta non trova niente da fare. Audit in `dati_guida.audit-303-covo-dal-5-maggio`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const AUDIT = 'audit-303-covo-dal-5-maggio';
const RICHIESTA = '2026-10-29: «il covo dei ladri si sblocca il 5 maggio...(giorno di gioco)»; «non devi solo correggere i testi, ma far sì che compaia in mappa solo da quella data in poi»';
const AREA_COVO = 'citta/yongen-jaya/covo-dei-ladri';
/** La condizione, scritta com'è scritta dalle scritture dell'app (`JSON.stringify` delle condizioni normalizzate). */
const DAL_5_MAGGIO = JSON.stringify([{ tipo: 'data', dal: '05-05' }]);
const FRASE_VECCHIA = 'si sblocca avanzando nella storia oltre il 5 maggio';
const FRASE_NUOVA = 'si sblocca il 5 maggio';
const PERCORSO_INTRODUZIONE = 'covo/introduzione';
const errore = (motivo: string): never => { throw new Error(`303: ${motivo}; nessuna modifica applicata.`); };

/** Le condizioni lette da un testo JSON, rimesse nella forma canonica; null se il testo non si legge. */
function canonica(testo: string | null): string | null {
  if (testo === null) return null;
  try { return JSON.stringify(JSON.parse(testo)); } catch { return null; }
}

/** Le occorrenze di `ago` in `testo`. */
function occorrenze(testo: string, ago: string): number {
  let n = 0;
  for (let i = testo.indexOf(ago); i >= 0; i = testo.indexOf(ago, i + ago.length)) n++;
  return n;
}

/** (1) La colonna della condizione propria delle Aree, se manca. */
function colonnaCondizioni(db: AppDatabase): boolean {
  const colonne = new Set((db.prepare('PRAGMA main.table_info(area)').all() as Array<{ name: string }>).map((c) => c.name));
  if (colonne.has('condizioni_json')) return false;
  db.exec('ALTER TABLE main.area ADD COLUMN condizioni_json TEXT');
  return true;
}

/** (1) La data sull'Area del Covo, solo se l'Area c'è e non ha una condizione propria. Restituisce l'esito per l'audit. */
function dataSullArea(db: AppDatabase, adesso: string): { esito: string; condizione: string | null } {
  const a = db.prepare('SELECT condizioni_json FROM main.area WHERE chiave = ?').get(AREA_COVO) as { condizioni_json: string | null } | undefined;
  if (!a) return { esito: 'Area del Covo assente: niente da scrivere', condizione: null };
  if (a.condizioni_json !== null) return { esito: a.condizioni_json === DAL_5_MAGGIO ? 'già dal 5 maggio' : 'con una condizione propria: lasciata com’era', condizione: a.condizioni_json };
  if (db.prepare('UPDATE main.area SET condizioni_json = ?, updated_at = ? WHERE chiave = ? AND condizioni_json IS NULL').run(DAL_5_MAGGIO, adesso, AREA_COVO).changes !== 1) errore('la condizione dell’Area del Covo non è stata scritta');
  const riletta = (db.prepare('SELECT condizioni_json FROM main.area WHERE chiave = ?').get(AREA_COVO) as { condizioni_json: string | null }).condizioni_json;
  if (riletta !== DAL_5_MAGGIO) errore('condizione dell’Area del Covo riletta diversa da quella scritta');
  return { esito: 'scritta dal 5 maggio', condizione: DAL_5_MAGGIO };
}

/** (2) Le copie della data sui luoghi dell'Area: tolte solo dove sono esattamente la data dell'Area, su righe mai corrette. */
function copieSuiLuoghi(db: AppDatabase, adesso: string): Array<{ luogo: string; prima: string | null; esito: string }> {
  const area = (db.prepare('SELECT condizioni_json FROM main.area WHERE chiave = ?').get(AREA_COVO) as { condizioni_json: string | null } | undefined)?.condizioni_json ?? null;
  const righe = db.prepare('SELECT chiave, condizioni_json, seed_json FROM main.luogo WHERE area_chiave = ? ORDER BY ordine, chiave').all(AREA_COVO) as
    Array<{ chiave: string; condizioni_json: string | null; seed_json: string | null }>;
  const esiti: Array<{ luogo: string; prima: string | null; esito: string }> = [];
  for (const r of righe) {
    if (r.condizioni_json === null) continue;
    const base = { luogo: r.chiave, prima: r.condizioni_json };
    if (area !== DAL_5_MAGGIO) { esiti.push({ ...base, esito: 'lasciata: l’Area non porta la data del 5 maggio' }); continue; }
    if (canonica(r.condizioni_json) !== DAL_5_MAGGIO) { esiti.push({ ...base, esito: 'lasciata: non è esattamente la data dell’Area' }); continue; }
    if (r.seed_json !== null) { esiti.push({ ...base, esito: 'lasciata: luogo corretto dall’utente' }); continue; }
    if (db.prepare('UPDATE main.luogo SET condizioni_json = NULL, updated_at = ? WHERE chiave = ? AND condizioni_json = ? AND seed_json IS NULL').run(adesso, r.chiave, r.condizioni_json).changes !== 1) errore(`la condizione del luogo ${r.chiave} non è stata tolta`);
    esiti.push({ ...base, esito: 'tolta: la eredita dall’Area' });
  }
  return esiti;
}

/** (3) L'introduzione del Covo nella guida. */
function introduzione(db: AppDatabase): string {
  if (!esisteTabella(db, 'dati_guida')) return 'dati della guida assenti';
  if (esisteTabella(db, 'correzione_dati_guida')
    && db.prepare('SELECT 1 FROM main.correzione_dati_guida WHERE blocco = ? AND percorso = ?').get('completamento', PERCORSO_INTRODUZIONE)) {
    return 'lasciata: c’è una correzione dell’utente sullo stesso campo';
  }
  const riga = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').get('completamento') as { json: string } | undefined;
  if (!riga) return 'blocco «completamento» assente';
  let blocco: { covo?: { introduzione?: unknown } };
  try { blocco = JSON.parse(riga.json) as typeof blocco; } catch { return 'blocco «completamento» illeggibile: lasciato com’era'; }
  const testo = blocco.covo?.introduzione;
  if (typeof testo !== 'string') return 'introduzione del Covo assente';
  const n = occorrenze(testo, FRASE_VECCHIA);
  if (n === 0) return testo.includes(FRASE_NUOVA) ? 'già «si sblocca il 5 maggio»' : 'lasciata: la frase non c’è';
  if (n > 1) return `lasciata: la frase c’è ${n} volte`;
  const nuovo = testo.replace(FRASE_VECCHIA, FRASE_NUOVA);
  const scritto = JSON.stringify({ ...blocco, covo: { ...blocco.covo, introduzione: nuovo } });
  if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(scritto, 'completamento', riga.json).changes !== 1) errore('l’introduzione del Covo non è stata scritta');
  const riletto = (JSON.parse((db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').get('completamento') as { json: string }).json) as typeof blocco).covo?.introduzione;
  if (riletto !== nuovo) errore('introduzione del Covo riletta diversa da quella scritta');
  return 'corretta: «si sblocca il 5 maggio»';
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 303, richiesta: RICHIESTA,
      regola: 'la data sull’Area del Covo solo se non ha una condizione; tolta dai luoghi dell’Area solo se esattamente uguale e mai corretta; introduzione solo con la frase esatta una volta e senza correzione dell’utente',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration303: Migration = {
  id: 303,
  name: 'covo_dal_5_maggio',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'area')) { logger.warn({ migrazione: 303 }, 'tabella delle Aree assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const colonna = colonnaCondizioni(db);
    const area = dataSullArea(db, adesso);
    const luoghi = esisteTabella(db, 'luogo') ? copieSuiLuoghi(db, adesso) : [];
    const intro = introduzione(db);
    const tolte = luoghi.filter((l) => l.esito.startsWith('tolta')).length;
    const cambiato = colonna || area.esito.startsWith('scritta') || tolte > 0 || intro.startsWith('corretta');
    scriviAudit(db, { colonnaAggiunta: colonna, area: { chiave: AREA_COVO, ...area }, luoghi, introduzione: intro }, cambiato);
    logger.info({ migrazione: 303, colonnaAggiunta: colonna, area: area.esito, luoghiTolti: tolte, introduzione: intro }, 'Covo dei Ladri dal 5 maggio');
  },
};
