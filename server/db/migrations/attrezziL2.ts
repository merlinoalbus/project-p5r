// ============================================================
// attrezziL2 — gli attrezzi comuni delle migrazioni del lotto L2 «Macchine e fine del listino condiviso» (347-352)
// ============================================================
//
// Una macchina documentata è una riga `negozio` di tipo `distributore`, con le sue righe `articolo` (la sua scorta). Qui stanno:
//   - `creaPuntoVendita`: il negozio con le offerte derivate, riga per riga, da un'offerta esistente: stessa identità dell'oggetto, stessa regola
//     (pezzi, rifornimento, «non col caldo»), prezzo documentato;
//   - `ripuntaPin`: il pin cambia riferimento solo se corrisponde ancora a identità e riferimento attesi (come la 143 e la 151); l'uid non cambia mai;
//   - `togliSedeAggiuntiva`: la riga di `negozio_sede_spillo` di un pin ripuntato e, se nessun altro pin la usa, quella di `negozio_luogo_extra`;
//   - `acquistiNellaSede`: legge (non scrive mai) il registro delle partite, per dire nel verbale quante righe citavano una sede aggiuntiva;
//   - `allineaFotografia`: porta al valore nuovo il campo di `seed_json`, perché «Ripristina» non rimetta un valore che la migrazione ha superato;
//   - `fotografa`/`verificaFotografia`: impronte delle tabelle prima e dopo; `scriviVerbale`: il verbale in `dati_guida`.
// Ogni esito è `applicata`, `gia-fatta` o `saltata` col motivo: una seconda esecuzione trova tutto `gia-fatta` e non scrive niente.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import { colonneDi } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit } from './archivioL1.js';

export const FONTE_DISTRIBUTORI = 'https://www.allgamestaff.it/persona-5-royal/distributori-automatici/';
/** Gli orari propri delle macchine sorelle: la sede ha la precedenza, e i distributori non hanno giorni né fasce. */
const ORARI_DISTRIBUTORE = '{"giorni":[],"fasce":[],"chiusoConPioggia":false,"nota":null}';

export interface EsitoL2 { voce: string; esito: 'applicata' | 'gia-fatta' | 'saltata'; motivo?: string }
export type CondizioneL2 = Record<string, unknown>;

/** Un'offerta nuova, derivata dalla riga `da`. `catalogo` è l'oggetto atteso su quella riga: se è cambiato, l'offerta si salta. */
export interface RigaDerivata { da: string; catalogo: string | null; prezzo: number | null; nota?: string }

/** Un'offerta del catalogo dei consumabili, derivata dalla stessa bevanda di un altro distributore. */
export const offerta = (negozio: string, bevanda: string, prezzo: number | null, nota?: string): RigaDerivata =>
  ({ da: `${negozio}/${bevanda}`, catalogo: `consumabile/${bevanda}`, prezzo, ...(nota ? { nota } : {}) });

export interface NuovoPuntoVendita {
  chiave: string; nome: string; sede: string | null; note?: string | null; sblocco?: readonly CondizioneL2[];
  righe: readonly RigaDerivata[];
  /** Le offerte non portano il segno «da verificare» della riga da cui derivano (Tornello: risposta dell'utente a Q3). */
  senzaDaVerificare?: boolean;
}

/** Le offerte visibili di un negozio così come sono oggi, prezzo compreso (per le copie «uguali ai listini mostrati oggi»). */
export function offerteVisibili(db: AppDatabase, negozio: string): RigaDerivata[] {
  return (db.prepare('SELECT chiave, catalogo_chiave, prezzo FROM main.articolo WHERE negozio_chiave = ? AND nascosto = 0 ORDER BY ordine, chiave').all(negozio) as Array<{ chiave: string; catalogo_chiave: string | null; prezzo: number | null }>)
    .map((r) => ({ da: r.chiave, catalogo: r.catalogo_chiave, prezzo: r.prezzo }));
}

interface RigaOrigine {
  nome: string; categoria: string; per: string | null; nota: string | null; fonte: string; verificato: number; condizioni_json: string | null; oggetto_fonte: string | null; oggetto_chiave: string | null;
  quantita: number | null; catalogo_chiave: string | null; costo_json: string | null; rifornimento_json: string | null; rifornimento_senza_segno: string | null; prezzo_per_fascia_json: string | null;
}

/** Crea il punto vendita con le sue offerte. Esiste già o sta nel Cestino: non si tocca né si ricrea (le offerte tolte dall'utente restano tolte). */
export function creaPuntoVendita(db: AppDatabase, adesso: string, p: NuovoPuntoVendita, esiti: EsitoL2[]): void {
  const voce = `negozio ${p.chiave}`;
  if (db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(p.chiave)) { esiti.push({ voce, esito: 'gia-fatta' }); return; }
  if (db.prepare("SELECT 1 FROM main.cestino WHERE tipo = 'negozio' AND chiave = ?").get(p.chiave)) { esiti.push({ voce, esito: 'saltata', motivo: 'nel Cestino' }); return; }
  if (!p.sede || !db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ? AND nascosto = 0').get(p.sede)) { esiti.push({ voce, esito: 'saltata', motivo: `sede assente o nascosta: ${p.sede ?? 'nessuna'}` }); return; }

  const leggi = db.prepare(`SELECT nome, categoria, per, nota, fonte, verificato, condizioni_json, oggetto_fonte, oggetto_chiave, quantita, catalogo_chiave, costo_json, rifornimento_json,
    CASE WHEN json_valid(rifornimento_json) THEN json_remove(rifornimento_json, '$.daVerificare') ELSE rifornimento_json END AS rifornimento_senza_segno, prezzo_per_fascia_json
    FROM main.articolo WHERE chiave = ? AND nascosto = 0`);
  const valide: Array<{ riga: RigaDerivata; origine: RigaOrigine }> = [];
  for (const riga of p.righe) {
    const origine = leggi.get(riga.da) as RigaOrigine | undefined;
    if (!origine) esiti.push({ voce: `offerta ${riga.da} per ${p.chiave}`, esito: 'saltata', motivo: 'la riga di origine manca o è nascosta' });
    else if (origine.catalogo_chiave !== riga.catalogo) esiti.push({ voce: `offerta ${riga.da} per ${p.chiave}`, esito: 'saltata', motivo: `oggetto atteso ${riga.catalogo}, trovato ${origine.catalogo_chiave}` });
    else valide.push({ riga, origine });
  }
  if (valide.length === 0) { esiti.push({ voce, esito: 'saltata', motivo: 'nessuna offerta di origine valida' }); return; }

  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.negozio').pluck().get() as number;
  db.prepare(`INSERT INTO main.negozio (chiave, ordine, nome, tipo, note, fonte, origine, nascosto, updated_at, orari_json, sede_chiave, sblocco_json)
    VALUES (?, ?, ?, 'distributore', ?, ?, 'seed', 0, ?, ?, ?, ?)`)
    .run(p.chiave, ordine, p.nome, p.note ?? null, FONTE_DISTRIBUTORI, adesso, ORARI_DISTRIBUTORE, p.sede, p.sblocco ? JSON.stringify(p.sblocco) : null);
  const inserisci = db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, nota, fonte, verificato, origine, nascosto, updated_at, condizioni_json,
    oggetto_fonte, oggetto_chiave, quantita, catalogo_chiave, costo_json, rifornimento_json, prezzo_per_fascia_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  valide.forEach(({ riga, origine: o }, i) => {
    const prodotto = riga.da.slice(riga.da.indexOf('/') + 1);
    inserisci.run(`${p.chiave}/${prodotto}`, p.chiave, i, o.nome, o.categoria, o.per, riga.prezzo, riga.nota ?? o.nota, o.fonte, o.verificato, adesso, o.condizioni_json, o.oggetto_fonte, o.oggetto_chiave, o.quantita, o.catalogo_chiave,
      o.costo_json, p.senzaDaVerificare ? o.rifornimento_senza_segno : o.rifornimento_json, o.prezzo_per_fascia_json);
  });
  esiti.push({ voce, esito: 'applicata', motivo: `${valide.length} offerte` });
}

export type RiferimentoPin = readonly [tipo: string | null, chiave: string | null];
export interface Ripunto { id: number; uid: string; tipo: string; mappa: string; origine: 'seed' | 'utente'; da: readonly RiferimentoPin[]; a: readonly [tipo: 'negozio' | 'luogo', chiave: string] }

/** Il pin cambia solo se è ancora quello atteso e la destinazione esiste ed è visibile. Restituisce l'esito, già scritto in `esiti`. */
export function ripuntaPin(db: AppDatabase, adesso: string, r: Ripunto, esiti: EsitoL2[]): EsitoL2['esito'] {
  const voce = `pin ${r.id} → ${r.a[0]}:${r.a[1]}`;
  const fine = (esito: EsitoL2['esito'], motivo?: string): EsitoL2['esito'] => { esiti.push({ voce, esito, ...(motivo ? { motivo } : {}) }); return esito; };
  const p = db.prepare('SELECT uid, riferimento_tipo, riferimento_chiave FROM main.spillo WHERE id = ?').get(r.id) as { uid: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
  if (!p || p.uid !== r.uid) return fine('saltata', 'pin assente o con un altro uid');
  if (p.riferimento_tipo === r.a[0] && p.riferimento_chiave === r.a[1]) return fine('gia-fatta');
  const tabella = r.a[0] === 'negozio' ? 'negozio' : 'luogo';
  if (!db.prepare(`SELECT 1 FROM main.${tabella} WHERE chiave = ? AND nascosto = 0`).get(r.a[1])) return fine('saltata', 'destinazione assente o nascosta');
  if (!r.da.some(([tipo, chiave]) => p.riferimento_tipo === tipo && p.riferimento_chiave === chiave)) return fine('saltata', `riferimento non atteso: ${p.riferimento_tipo}:${p.riferimento_chiave}`);
  const fatti = db.prepare(`UPDATE main.spillo SET riferimento_tipo = ?, riferimento_chiave = ?, updated_at = CASE WHEN origine = 'utente' THEN ? ELSE updated_at END
    WHERE id = ? AND uid = ? AND tipo = ? AND mappa_chiave = ? AND origine = ? AND riferimento_tipo IS ? AND riferimento_chiave IS ?`)
    .run(r.a[0], r.a[1], adesso, r.id, r.uid, r.tipo, r.mappa, r.origine, p.riferimento_tipo, p.riferimento_chiave).changes;
  return fine(fatti === 1 ? 'applicata' : 'saltata', fatti === 1 ? undefined : 'il pin non corrisponde più a identità e riferimento attesi');
}

export interface SedeTolta { uid: string; negozio: string; luogo: string; righeLuogoExtra: number }

/**
 * Il pin non vende più per conto del listino di un altro quartiere: via la sua riga di `negozio_sede_spillo`, e via la sede aggiuntiva se nessun altro pin la usa
 * (in quest'ordine: la prima cita la seconda, e il runner tiene `foreign_keys` spento). Lasciandole fino a L2-10, il listino di Aoyama e Yongen continuerebbe
 * a vendere a Shibuya accanto alla macchina nuova.
 */
export function togliSedeAggiuntiva(db: AppDatabase, uid: string, negozio: string, luogo: string): SedeTolta | null {
  if (db.prepare('DELETE FROM main.negozio_sede_spillo WHERE spillo_uid = ? AND negozio_chiave = ? AND luogo_chiave = ?').run(uid, negozio, luogo).changes === 0) return null;
  const altri = db.prepare('SELECT 1 FROM main.negozio_sede_spillo WHERE negozio_chiave = ? AND luogo_chiave = ?').get(negozio, luogo);
  const righeLuogoExtra = altri ? 0 : db.prepare('DELETE FROM main.negozio_luogo_extra WHERE negozio_chiave = ? AND luogo_chiave = ?').run(negozio, luogo).changes;
  return { uid, negozio, luogo, righeLuogoExtra };
}

/** Quante righe del registro delle partite citano esplicitamente questa sede per un articolo del negozio (sola lettura; 0 se `utente` non c'è). */
export function acquistiNellaSede(db: AppDatabase, negozio: string, luogo: string): number {
  if (!(db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente')) return 0;
  if (!db.prepare("SELECT 1 FROM pragma_table_info('registro_acquisti', 'utente') WHERE name = 'sede_chiave'").get()) return 0;
  return db.prepare('SELECT COUNT(*) FROM utente.registro_acquisti WHERE articolo_chiave LIKE ? AND sede_chiave = ?').pluck().get(`${negozio}/%`, luogo) as number;
}

/**
 * «Ripristina» riscrive la riga dalla sua fotografia (`seed_json`): il campo che una migrazione ha cambiato si aggiorna anche lì, solo se la fotografia ha
 * ancora il valore atteso (una fotografia con un altro valore, o senza il campo, non si tocca; `seed_json` NULL: nessuna scrittura). Il valore di prima resta
 * nell'archivio delle frasi o nel verbale.
 */
export function allineaFotografia(db: AppDatabase, tabella: 'luogo' | 'negozio', chiave: string, campo: string, atteso: string | null, nuovo: string | null, esiti: EsitoL2[]): void {
  const json = db.prepare(`SELECT seed_json FROM main.${tabella} WHERE chiave = ?`).pluck().get(chiave) as string | null | undefined;
  if (!json) return;
  let lettura: unknown;
  try { lettura = JSON.parse(json); } catch { return; }
  if (lettura === null || typeof lettura !== 'object' || Array.isArray(lettura)) return;
  const fotografia = lettura as Record<string, unknown>;
  if (!(campo in fotografia) || fotografia[campo] !== atteso) return;
  db.prepare(`UPDATE main.${tabella} SET seed_json = ? WHERE chiave = ? AND seed_json = ?`).run(JSON.stringify({ ...fotografia, [campo]: nuovo }), chiave, json);
  esiti.push({ voce: `fotografia di ${chiave}: ${campo}`, esito: 'applicata' });
}

/**
 * Il pin che riporta il luogo con la copia esatta di `cosa_offre` segue il testo nuovo: la pagina del luogo tratta come «nota del pin» ogni descrizione diversa da
 * `cosa_offre`, e il testo tolto ricomparirebbe lì. Solo i pin di quel luogo con il testo atteso; l'originale va in archivio per uid. L'uid non cambia.
 */
export function allineaPinDelLuogo(db: AppDatabase, adesso: string, migrazione: string, luogo: string, atteso: string, nuovo: string, esiti: EsitoL2[]): void {
  const pin = db.prepare("SELECT id, uid FROM main.spillo WHERE riferimento_tipo = 'luogo' AND riferimento_chiave = ? AND descrizione = ? ORDER BY id").all(luogo, atteso) as Array<{ id: number; uid: string }>;
  for (const p of pin) {
    archiviaSenzaSovrascrivere(db, migrazione, 'spillo.descrizione', { [p.uid]: atteso });
    db.prepare("UPDATE main.spillo SET descrizione = ?, updated_at = CASE WHEN origine = 'utente' THEN ? ELSE updated_at END WHERE id = ? AND descrizione = ?").run(nuovo, adesso, p.id, atteso);
    esiti.push({ voce: `descrizione del pin ${p.id} di ${luogo}`, esito: 'applicata' });
  }
}

/** Cambia `luogo.cosa_offre` solo se è ancora il testo atteso; l'originale va nell'archivio delle frasi. Un testo già vuoto non ha più nulla da riscrivere. */
export function riscriviCosaOffre(db: AppDatabase, adesso: string, migrazione: string, luogo: string, atteso: string, nuovo: string, esiti: EsitoL2[]): void {
  const voce = `cosa_offre di ${luogo}`;
  const attuale = db.prepare('SELECT cosa_offre FROM main.luogo WHERE chiave = ?').pluck().get(luogo) as string | undefined;
  if (attuale === nuovo || attuale === '') { esiti.push({ voce, esito: 'gia-fatta' }); return; }
  if (attuale !== atteso) { esiti.push({ voce, esito: 'saltata', motivo: 'il testo non è più quello atteso' }); return; }
  archiviaSenzaSovrascrivere(db, migrazione, 'luogo.cosa_offre', { [luogo]: atteso });
  db.prepare('UPDATE main.luogo SET cosa_offre = ?, updated_at = ? WHERE chiave = ? AND cosa_offre = ?').run(nuovo, adesso, luogo, atteso);
  allineaFotografia(db, 'luogo', luogo, 'cosa_offre', atteso, nuovo, esiti);
  allineaPinDelLuogo(db, adesso, migrazione, luogo, atteso, nuovo, esiti);
  esiti.push({ voce, esito: 'applicata' });
}

/** `conFotografiaDi`: le sole righe di cui la migrazione può aggiornare `seed_json`; nelle altre la colonna resta sotto controllo. */
export interface RegolaImpronta { tabella: string; senzaColonne: readonly string[]; conFotografiaDi?: readonly string[] }

/** Impronta delle righe di una tabella, tolte le colonne dichiarate e le righe nuove (`chiave`). */
function impronta(db: AppDatabase, r: RegolaImpronta, nuove: ReadonlySet<string>): string {
  const colonne = colonneDi(db, r.tabella).filter((c) => !r.senzaColonne.includes(c));
  const h = createHash('sha256');
  for (const riga of db.prepare(`SELECT ${colonne.map((c) => `"${c}"`).join(', ')} FROM main.${r.tabella} ORDER BY rowid`).iterate() as Iterable<Record<string, unknown>>) {
    if (typeof riga.chiave === 'string' && nuove.has(riga.chiave)) continue;
    const confrontabile = typeof riga.chiave === 'string' && r.conFotografiaDi?.includes(riga.chiave) ? { ...riga, seed_json: null } : riga;
    h.update(JSON.stringify(confrontabile) + '\n');
  }
  return h.digest('hex');
}

export const fotografa = (db: AppDatabase, regole: readonly RegolaImpronta[]): Map<string, string> =>
  new Map(regole.map((r) => [r.tabella, impronta(db, r, new Set())]));

/** Le chiavi nuove delle tabelle `luogo`, `negozio` e `articolo` scritte dalla migrazione si escludono; il resto dev'essere identico. */
export function verificaFotografia(db: AppDatabase, regole: readonly RegolaImpronta[], prima: ReadonlyMap<string, string>, nuove: ReadonlySet<string>): string | null {
  for (const r of regole) if (impronta(db, r, nuove) !== prima.get(r.tabella)) return `la tabella ${r.tabella} è cambiata oltre le colonne dichiarate`;
  return null;
}

/** Le chiavi dei negozi creati dalla migrazione e delle loro offerte (per le impronte). */
export function chiaviNuove(db: AppDatabase, negozi: readonly string[], esiti: readonly EsitoL2[]): Set<string> {
  const creati = negozi.filter((n) => esiti.some((e) => e.voce === `negozio ${n}` && e.esito === 'applicata'));
  const offerte = creati.flatMap((n) => db.prepare('SELECT chiave FROM main.articolo WHERE negozio_chiave = ?').pluck().all(n) as string[]);
  return new Set([...creati, ...offerte]);
}

/**
 * Il verbale della migrazione: una voce se ha cambiato qualcosa o se ha saltato qualcosa di nuovo. Una seconda esecuzione (tutto `gia-fatta`, o le stesse
 * parti saltate) non scrive niente.
 */
export function scriviVerbale(db: AppDatabase, chiave: string, migrazione: string, esiti: readonly EsitoL2[], dettagli: Record<string, unknown> = {}): boolean {
  const saltate = (lista: readonly EsitoL2[]): string => JSON.stringify(lista.filter((e) => e.esito === 'saltata'));
  if (!esiti.some((e) => e.esito === 'applicata')) {
    if (saltate(esiti) === '[]') return false;
    const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
    const ultima = json ? (JSON.parse(json) as { voci?: Array<{ esiti?: EsitoL2[] }> }).voci?.at(-1) : undefined;
    if (ultima?.esiti && saltate(ultima.esiti) === saltate(esiti)) return false;
  }
  registraAudit(db, chiave, { migrazione, esiti, ...dettagli });
  return true;
}
