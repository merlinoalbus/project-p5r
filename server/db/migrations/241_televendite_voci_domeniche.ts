// ============================================================
// Migrazione 241 — le quattro domeniche delle televendite senza voce ricevono la voce «Canale di televendite» con i due set a scelta (L13, decisione 20)
// ============================================================
//
// Decisione 20 dell'utente (26 ottobre; risposte «Uno solo o nessuno» e «Sì, aggiungile»): ogni domenica di messa in onda si compra un solo
// set o nessuno, e la scelta si fa alla spunta; le quattro domeniche senza voce d'acquisto (26 giugno, 7 agosto, 25 settembre, 29 gennaio)
// ricevono una voce «Canale di televendite» con i due set a scelta, come le altre voci delle televendite fuori dal periodo validato già
// collegate dalla migrazione 239. Gli articoli dei set (con la condizione «non insieme all'altro set») e il loro contenuto li ha già scritti
// la 239; qui nascono soltanto le quattro voci.
//
// Dati di gioco (`gioco.db`), append-only e conservativa; testi dalla guida italiana (pagine «Soluzione settimana 11, 17, 23 e 39», lette
// il 2026-10-26), che prevale:
//   (1) **Voce**: una per domenica, fatta come le voci della 239 applicate (06-19, 07-03, 08-14, 10-02, 11-06…): azione, tipo «acquisto»,
//       collegamento al negozio delle televendite (`negozio` / `home-shopping-tv`, senza testo proprio: il nome si legge dal negozio),
//       fascia del giorno, in cima alla fascia (come quasi tutte le altre). Il testo nomina i due set con il prezzo, come le voci del 10-02 e
//       dell'11-06 («Televendite: Set zucca stregata (14.800 yen) o Set scaccia fantasmi (9.980 yen)»), con «Canale di televendite», il nome
//       della guida e del negozio. La nota dice il consiglio della guida per quella domenica. `aggiunta_da = 'team'` (la voce non viene dal
//       percorso della guida) e `da_rivedere = 0` (l'utente l'ha già approvata: nessun chip «Da rivedere»). `uid` fisso, derivato dal giorno:
//       lo stesso su ogni copia.
//   (2) **Effetti**: i due set come effetti «articolo», nello stesso ordine delle altre voci (Set A, poi Set B), scritti con la funzione dei
//       servizi (`inizializzaEffettiVoce`: verifiche di ogni effetto, regola degli yen, riga di transizione «convertita»), mai SQL parallelo
//       agli invarianti. Per questo la voce nasce solo se la connessione della migrazione è quella dei servizi (`getDb()`); altrimenti niente.
//   (3) **Posto**: la fascia del giorno si rinumera 0, 1, 2… con la voce nuova in cima, come fa la pagina quando si aggiunge una voce al
//       primo posto (`posiziona`): le altre voci tengono il loro ordine relativo; l'audit dice gli ordini di prima e di dopo.
//   (4) **Audit** in `dati_guida.audit-241-televendite-voci`: un'esecuzione per giro, con l'esito di ogni domenica.
//
// Una domenica si salta (e l'audit lo dice) se: il giorno manca dal percorso; il giorno ha già una voce delle televendite (collegata al
// negozio o con un effetto su uno dei due set: per esempio aggiunta dall'utente); un set manca, è nascosto, non è più di quel giorno o ha
// nome o prezzo diversi da quelli della guida (il testo della voce li ripete). Idempotente: la seconda volta la voce c'è già.
// Controlli (un controllo che non torna annulla tutto): nessuna data nel periodo validato (04-01…05-31); lo schema `utente` identico; le altre
// voci del Diario identiche (ordine a parte, nelle fasce rinumerate); ogni voce nuova con i due effetti attesi e la riga di transizione.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { leggiCondizioniSalvate, ordineGioco } from '../../../shared/condizioniSpillo.js';
import { inizializzaEffettiVoce } from '../../services/motoreDiario.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-241-televendite-voci';
const NEGOZIO = 'home-shopping-tv';
const errore = (motivo: string): never => { throw new Error(`241: ${motivo}; nessuna modifica applicata.`); };

/** Il periodo del Diario validato dall'utente (giorni di gioco, estremi compresi): qui nessuna voce nasce. */
const nelPeriodoValidato = (data: string): boolean => ordineGioco(data) >= ordineGioco('04-01') && ordineGioco(data) <= ordineGioco('05-31');

interface SetTv { slug: string; nome: string; prezzo: number }
interface DomenicaSenzaVoce { data: string; a: SetTv; b: SetTv; note: string }

/** Le quattro domeniche: i due set come li ha scritti la 239 (nome e prezzo della guida italiana) e il consiglio della guida. */
const DOMENICHE: readonly DomenicaSenzaVoce[] = [
  { data: '06-26',
    a: { slug: 'set-oscuro-potere', nome: 'Set oscuro potere', prezzo: 1980 },
    b: { slug: 'set-di-strumenti-maledetti', nome: 'Set di strumenti maledetti', prezzo: 9980 },
    note: 'Consigliato il Set di strumenti maledetti: le Rocce nere e la Veste nera dell’altro set si trovano facilmente nei Memento.' },
  { data: '08-07',
    a: { slug: 'set-ladro-fantasma', nome: 'Set Ladro Fantasma', prezzo: 7980 },
    b: { slug: 'set-eroico', nome: 'Set eroico', prezzo: 8980 },
    note: 'Consigliato il Set Ladro Fantasma se non hai ancora il Grimaldello duraturo; altrimenti il Set eroico.' },
  { data: '09-25',
    a: { slug: 'set-ladro-fantasma-2', nome: 'Set Ladro Fantasma 2', prezzo: 8980 },
    b: { slug: 'set-divertimento-dei-ladri', nome: 'Set divertimento dei Ladri', prezzo: 2000 },
    note: 'Nessuno dei due è particolarmente utile: si prende quello che serve, o nessuno.' },
  { data: '01-29',
    a: { slug: 'set-energetico', nome: 'Set energetico', prezzo: 49800 },
    b: { slug: 'set-della-resurrezione', nome: 'Set della resurrezione', prezzo: 69800 },
    note: 'Ultima domenica delle televendite: consigliato il Set della resurrezione. La consegna arriva il 30 gennaio.' },
];

const chiaveArticolo = (slug: string): string => `${NEGOZIO}/${slug}`;
const uidDi = (data: string): string => createHash('sha256').update(`voce-televendite-241|${data}`).digest('hex').slice(0, 32);
/** Il prezzo come lo scrivono le voci del Diario: «1.980 yen», «49.800 yen» (il punto delle migliaia anche a quattro cifre). */
const yen = (n: number): string => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} yen`;
const azioneDi = (d: DomenicaSenzaVoce): string => `Canale di televendite: ${d.a.nome} (${yen(d.a.prezzo)}) o ${d.b.nome} (${yen(d.b.prezzo)})`;

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga), o null se non è attaccato: dopo la migrazione deve essere identica. */
function improntaPartite(db: AppDatabase): string | null {
  if (!(db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente')) return null;
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}
/** L'impronta di ogni voce del Diario senza `ordine` (che cambia nelle fasce rinumerate), con i suoi effetti e la sua riga di transizione. */
function improntaVoci(db: AppDatabase): Map<string, string> {
  const m = new Map<string, string>();
  const effetti = db.prepare('SELECT * FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine');
  const transizione = db.prepare('SELECT * FROM main.voce_effetto_transizione WHERE voce_uid = ?');
  for (const r of db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').all() as Array<Record<string, unknown>>) {
    const { ordine: _ordine, ...resto } = r;
    m.set(String(r.uid), createHash('sha256').update(JSON.stringify([resto, effetti.all(r.uid), transizione.get(r.uid) ?? null])).digest('hex'));
  }
  return m;
}

/** Il set come deve essere per la voce: c'è, è visibile, è del negozio, è di quel giorno, ha nome e prezzo della guida. null se va bene. */
function problemaDelSet(db: AppDatabase, s: SetTv, data: string): string | null {
  const r = db.prepare('SELECT negozio_chiave, nome, prezzo, nascosto, condizioni_json FROM main.articolo WHERE chiave = ?').get(chiaveArticolo(s.slug)) as
    { negozio_chiave: string; nome: string; prezzo: number | null; nascosto: number; condizioni_json: string | null } | undefined;
  if (!r) return `manca l'articolo ${chiaveArticolo(s.slug)}`;
  if (r.negozio_chiave !== NEGOZIO || r.nascosto !== 0) return `l'articolo ${chiaveArticolo(s.slug)} non è visibile nel negozio delle televendite`;
  if (!leggiCondizioniSalvate(r.condizioni_json).some((c) => c.tipo === 'intervallo' && c.dal === data && c.al === data)) return `l'articolo ${chiaveArticolo(s.slug)} non è più del ${data}`;
  if (r.nome !== s.nome || r.prezzo !== s.prezzo) return `l'articolo ${chiaveArticolo(s.slug)} è «${r.nome}» a ${r.prezzo ?? '—'} invece di «${s.nome}» a ${s.prezzo}`;
  return null;
}

export const migration241: Migration = {
  id: 241,
  name: 'televendite_voci_domeniche',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'giorno', 'negozio', 'articolo', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 241, tabella: t }, 'tabella assente: voci delle televendite non aggiunte'); return; }
    }
    if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO)) { logger.warn({ migrazione: 241 }, 'negozio delle televendite assente: nessuna voce'); return; }
    for (const d of DOMENICHE) if (nelPeriodoValidato(d.data)) errore(`il ${d.data} è nel periodo validato`);
    const colonne = (db.prepare('PRAGMA main.table_info(voce_giornata)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!['da_rivedere', 'aggiunta_da'].every((c) => colonne.includes(c))) errore('mancano le colonne della revisione delle voci');
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    const adesso = new Date().toISOString();
    const partitePrima = improntaPartite(db);
    const vociPrima = improntaVoci(db);

    const inserisci = db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
        rango_atteso, indice_guida, created_at, updated_at, da_rivedere, aggiunta_da)
      VALUES (?, ?, 'giorno', -1, 'azione', ?, ?, 'acquisto', 'negozio', ?, NULL, NULL, NULL, ?, ?, 0, 'team')`);
    const fasciaGiorno = db.prepare("SELECT uid, ordine FROM main.voce_giornata WHERE data = ? AND fascia = 'giorno' ORDER BY ordine, uid");
    const scriviOrdine = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
    const esiti: Array<{ giorno: string; voce: string; esito: string; ordiniPrima?: Array<{ uid: string; ordine: number }>; ordiniDopo?: Array<{ uid: string; ordine: number }> }> = [];
    const create: string[] = [];
    for (const d of DOMENICHE) {
      const uid = uidDi(d.data);
      const base = { giorno: d.data, voce: uid };
      if (db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(uid)) { esiti.push({ ...base, esito: 'voce già presente' }); continue; }
      if (!db.prepare('SELECT 1 FROM main.giorno WHERE data = ?').get(d.data)) { esiti.push({ ...base, esito: 'giorno assente dal percorso: nessuna voce' }); continue; }
      const giaPresente = db.prepare(`SELECT v.uid FROM main.voce_giornata v WHERE v.data = ? AND ((v.riferimento_tipo = 'negozio' AND v.riferimento_chiave = ?)
          OR EXISTS (SELECT 1 FROM main.voce_effetto e WHERE e.voce_uid = v.uid AND e.chiave IN (?, ?))) ORDER BY v.uid`)
        .pluck().all(d.data, NEGOZIO, chiaveArticolo(d.a.slug), chiaveArticolo(d.b.slug)) as string[];
      if (giaPresente.length) { esiti.push({ ...base, esito: `il giorno ha già una voce delle televendite (${giaPresente.join(', ')}): nessuna voce nuova` }); continue; }
      const problema = problemaDelSet(db, d.a, d.data) ?? problemaDelSet(db, d.b, d.data);
      if (problema) { esiti.push({ ...base, esito: `${problema}: nessuna voce` }); continue; }
      if (!stessaConnessione) { esiti.push({ ...base, esito: 'connessione diversa da quella dei servizi: nessuna voce (gli effetti si scrivono solo con i servizi)' }); continue; }

      const ordiniPrima = fasciaGiorno.all(d.data) as Array<{ uid: string; ordine: number }>;
      inserisci.run(uid, d.data, azioneDi(d), d.note, NEGOZIO, adesso, adesso);
      // (2) gli effetti con la funzione dei servizi: Set A, poi Set B, come le altre voci delle televendite
      inizializzaEffettiVoce(uid, [{ tipo: 'articolo', articolo: chiaveArticolo(d.a.slug) }, { tipo: 'articolo', articolo: chiaveArticolo(d.b.slug) }], 'utente');
      // (3) in cima alla fascia del giorno (ordine -1, il più piccolo), poi la fascia rinumerata 0, 1, 2… come fa `posiziona`
      (fasciaGiorno.all(d.data) as Array<{ uid: string }>).forEach((r, i) => scriviOrdine.run(i, r.uid));
      const ordiniDopo = fasciaGiorno.all(d.data) as Array<{ uid: string; ordine: number }>;
      if (ordiniDopo[0]?.uid !== uid) errore(`la voce del ${d.data} non è in cima alla fascia del giorno`);
      create.push(uid);
      esiti.push({ ...base, esito: 'creata', ordiniPrima, ordiniDopo });
    }
    // voci nuove: le letture in memoria dei servizi si svuotano, così le prime letture dopo l'avvio le vedono
    if (create.length) invalidaCacheDiGioco();

    // ---- controlli
    if (partitePrima !== null && improntaPartite(db) !== partitePrima) errore('lo schema delle partite è cambiato');
    const vociDopo = improntaVoci(db);
    if (vociDopo.size !== vociPrima.size + create.length) errore(`le voci del Diario sono ${vociDopo.size} invece di ${vociPrima.size + create.length}`);
    for (const [uid, impronta] of vociPrima) if (vociDopo.get(uid) !== impronta) errore(`la voce ${uid} è cambiata`);
    for (const uid of create) {
      const d = DOMENICHE.find((x) => uidDi(x.data) === uid)!;
      const effetti = db.prepare('SELECT tipo, chiave FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(uid) as Array<{ tipo: string; chiave: string }>;
      if (JSON.stringify(effetti) !== JSON.stringify([d.a, d.b].map((s) => ({ tipo: 'articolo', chiave: chiaveArticolo(s.slug) })))) errore(`gli effetti della voce del ${d.data} non sono i due set`);
      if (!db.prepare("SELECT 1 FROM main.voce_effetto_transizione WHERE voce_uid = ? AND stato = 'convertita'").get(uid)) errore(`la voce del ${d.data} è senza riga di transizione`);
    }

    // ---- (4) audit: un'esecuzione per giro
    const esecuzione = { il: adesso, stessaConnessione, conteggi: { domeniche: DOMENICHE.length, vociCreate: create.length, saltate: esiti.length - create.length }, esiti };
    const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
    const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
      .run(AUDIT, JSON.stringify({ migrazione: 241, decisione: 'L13-20', esecuzioni: [...esecuzioni, esecuzione] }));
    logger.info({ migrazione: 241, ...esecuzione.conteggi }, 'Televendite: voci delle quattro domeniche senza voce');
  },
};
