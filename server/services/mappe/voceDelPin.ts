// ============================================================
// Le voci della guida di un pin: la regola unica di lettura (094, 2026-10-01; più voci per pin dalla 098, 2026-10-09)
// ============================================================
//
// Senza dipendenze da altri servizi, perché la leggono tutti — guida, mappe, Palazzi —, anche chi è letto dalle regole del
// collegamento (`collegamentiGuida.ts`): così nessun modulo si richiama in cerchio (importa solo il DB e i condivisi).
//
// Un pin può appartenere a più voci (scelta dell'utente, 2026-10-09: «Voci indipendenti»): ogni voce si segna da sola, e il
// pin è fatto quando **tutte** le sue voci sono segnate (`fattoPerVoci`).
// ============================================================

import { prepared } from '../../db/dbService.js';
import { TIPO_PUNTO_DESCRITTIVO } from '../../../shared/spilli.js';

/**
 * Le voci della guida di un pin, in SQL: una sottoquery (fra parentesi) con una colonna, sul pin dell'alias dato. Sono le righe
 * di `spillo_voce` (098) e, per gli elementi della guida senza mappa che non le hanno (lo strato di prima, lasciato com'è), il
 * riferimento «punto». È la regola unica: ogni lettore in SQL la usa, per esempio `? IN ${vociDelPinSql('s')}`.
 */
export function vociDelPinSql(alias: string): string {
  return `(SELECT sv.voce_chiave FROM spillo_voce sv WHERE sv.spillo_id = ${alias}.id
    UNION ALL SELECT ${alias}.riferimento_chiave WHERE ${alias}.riferimento_tipo = 'punto' AND ${alias}.riferimento_chiave IS NOT NULL)`;
}

/**
 * Le voci della guida **gestite** in una partita, in SQL con un parametro (`partita_id`): quelle con uno stato in `punto_partita`,
 * tranne le voci descrittive («Altro»), che uno stato non lo hanno. È la regola unica con cui le voci segnate segnano i pin che le
 * citano: la usano il visore e le condizioni (`spilliSegnati`), la raccolta dei Palazzi (`raccoltaMappe`) e il loro completamento
 * (`palazziCompletati`). Prima le ultime due contavano anche uno stato rimasto su una voce descrittiva.
 */
export const VOCI_GESTITE_SQL = `SELECT pp.punto_chiave FROM punto_partita pp JOIN punto_interesse pi ON pi.chiave = pp.punto_chiave
  WHERE pp.partita_id = ? AND pi.tipo <> '${TIPO_PUNTO_DESCRITTIVO}'`;

/** `VOCI_GESTITE_SQL` letta: l'insieme delle chiavi delle voci gestite nella partita. */
export function vociGestite(partitaId: number): Set<string> {
  return new Set((prepared(VOCI_GESTITE_SQL).all(partitaId) as Array<{ punto_chiave: string }>).map((r) => r.punto_chiave));
}

/** Le colonne di `spillo` e se c'è `spillo_voce`: chi legge durante le migrazioni può trovare lo schema di prima. */
function schemaVoci(): { tabella: boolean; colonna: boolean } {
  const tabella = !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'spillo_voce'").get();
  const colonna = !tabella && (prepared('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).some((c) => c.name === 'voce_chiave');
  return { tabella, colonna };
}

/**
 * Le voci della guida di ogni pin che ne ha, per id, in ordine di chiave: la stessa regola di `vociDelPinSql`, letta una volta
 * per tutti i pin. Si adatta allo schema: prima della 098 vale `voce_chiave` (094), prima ancora il solo riferimento «punto».
 * Con `soloDaSegnare` restano le voci che si segnano: una descrittiva («Altro») non ha stato, e non può tenere un pin «da fare»
 * (le regole del collegamento non la ammettono, ma una scritta da prima può esserci).
 */
export function vociDiOgniPin(soloDaSegnare = false): Map<number, string[]> {
  const { tabella, colonna } = schemaVoci();
  const righe = prepared(`SELECT v.id, v.voce FROM (${tabella ? 'SELECT spillo_id AS id, voce_chiave AS voce FROM spillo_voce UNION ' : ''}${colonna ? 'SELECT id, voce_chiave FROM spillo WHERE voce_chiave IS NOT NULL UNION ' : ''}
    SELECT id, riferimento_chiave FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave IS NOT NULL) v
    ${soloDaSegnare ? `JOIN punto_interesse pi ON pi.chiave = v.voce AND pi.tipo <> '${TIPO_PUNTO_DESCRITTIVO}'` : ''} ORDER BY 1, 2`).all() as Array<{ id: number; voce: string }>;
  const out = new Map<number, string[]>();
  for (const r of righe) out.set(r.id, [...(out.get(r.id) ?? []), r.voce]);
  return out;
}

/** Le voci della guida di un pin, in ordine di chiave (la regola di `vociDelPinSql`). */
export function vociDelPin(id: number): string[] {
  return prepared(`SELECT voce FROM (SELECT sv.voce_chiave AS voce FROM spillo_voce sv WHERE sv.spillo_id = ?
    UNION SELECT riferimento_chiave FROM spillo WHERE id = ? AND riferimento_tipo = 'punto' AND riferimento_chiave IS NOT NULL) ORDER BY voce`)
    .pluck().all(id, id) as string[];
}

/** Un pin è fatto per le sue voci quando ne ha almeno una e sono tutte gestite nella partita (voci indipendenti, 2026-10-09).
 *  `voci` sono quelle che si segnano (`vociDiOgniPin(true)`). */
export function fattoPerVoci(voci: readonly string[], gestite: ReadonlySet<string>): boolean {
  return voci.length > 0 && voci.every((v) => gestite.has(v));
}

/** Gli uid dei pin fatti per le loro voci (`fattoPerVoci`), date le voci gestite di una partita. */
export function uidFattiPerVoci(gestite: ReadonlySet<string>): Set<string> {
  const voci = vociDiOgniPin(true);
  const out = new Set<string>();
  if (voci.size === 0) return out;
  for (const r of prepared('SELECT id, uid FROM spillo WHERE uid IS NOT NULL').all() as Array<{ id: number; uid: string }>) {
    if (fattoPerVoci(voci.get(r.id) ?? [], gestite)) out.add(r.uid);
  }
  return out;
}
