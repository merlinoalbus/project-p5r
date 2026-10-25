// ============================================================
// Migrazione 238 — l'elenco di conversione delle voci del Diario (L13, ondata 4b): applica le righe certe, carica le altre come proposte
// ============================================================
//
// L'elenco è la versione 8 (verificata da un agente distinto, rilievi della v7 applicati), letto il 2026-10-25 sulle copie dei dati reali
// (versione di gioco 235). Sta nei file `dati/238-proposte-L13-4b-*.json` (una riga per proposta: voce, tipo e collegamento proposti, effetti
// da aggiungere e da togliere, certezza, motivo, «applica») e `dati/238-voci-L13-4b.json` (per ogni voce citata: il giorno e l'impronta di come
// era quando l'elenco è stato scritto). Solo dati di gioco: nessun dato delle partite.
//
//   (1) **Carica tutte le proposte** in `proposta_conversione_voce` (migrazione 236), con un `id` fisso per riga: se la migrazione gira due
//       volte (per esempio dopo aver rimesso un `gioco.db` più vecchio) una proposta già presente non si duplica (`ON CONFLICT DO NOTHING`)
//       e la sua decisione resta com'è. Una riga che il lettore della pagina non riconosce non si carica (e l'audit lo dice).
//   (2) **Applica le righe «certo» fuori dal periodo validato** (`applica: true`), con la STESSA funzione della pagina «Da completare»
//       (`applicaPropostaConversione` → `aggiornaVoce` → `salvaEffettiVoce`: collegamento verificato, UID e revisione degli effetti,
//       verifiche di ogni effetto, regola degli yen, registro delle operazioni). La proposta diventa «applicata» con il suo esito. Mai SQL
//       parallelo agli invarianti. Una voce si tocca solo se:
//         - è fuori dal periodo validato (04-01…05-31: lì nessuna conversione senza il sì dell'utente riga per riga, anche se «certo»);
//         - è ancora esattamente come letta (testo, note, tipo, collegamento, `updated_at`, effetti uno per uno, registro di transizione:
//           `improntaVoce238`);
//         - NESSUNA partita la cita (ogni tabella dello schema `utente` con la colonna `voce_uid`: spunte, ricevute, proposte, registro dei
//           punti). È più stretto di «non tocca una ricevuta»: una migrazione dei dati di gioco non scrive mai nelle partite, e la modifica di
//           una voce spuntata farebbe nascere le proposte «Applica» nelle partite. Senza lo schema `utente` attaccato nessuna voce si applica;
//         - la connessione della migrazione è quella dei servizi (`getDb()`): su un'altra connessione le proposte si caricano soltanto.
//       Tutte le righe «applica» di una voce si applicano in sequenza nello stesso punto di ripristino: se una fallisce, la voce torna com'era
//       e le sue proposte restano aperte (l'audit dice perché).
//   (3) **Audit** in `dati_guida.audit-238-proposte-L13-4b`: un'esecuzione per ogni giro, con i conteggi (caricate dentro e fuori periodo,
//       già presenti, applicate, saltate con il motivo) e le segnalazioni per l'utente.
//
// Controlli: dopo l'applicazione lo schema `utente` è identico (impronta di ogni riga di ogni tabella), e le voci fuori dall'elenco da
// applicare, i loro effetti e i loro registri sono identici. Un controllo che non torna annulla tutta la migrazione.
// ============================================================

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { ordineGioco } from '../../../shared/condizioniSpillo.js';
import { leggiCampiDaCompletare, leggiEffettoProposto, type CertezzaProposta } from '../../../shared/proposteConversione.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = 'audit-238-proposte-L13-4b';
const LOTTO = 'L13-4b';
const PARTI = 6;
const errore = (motivo: string): never => { throw new Error(`238: ${motivo}; nessuna modifica applicata.`); };

/** Il periodo del Diario validato dall'utente (giorni di gioco, estremi compresi). */
const PERIODO_VALIDATO = { da: '04-01', a: '05-31' } as const;
export const nelPeriodoValidato = (data: string): boolean => ordineGioco(data) >= ordineGioco(PERIODO_VALIDATO.da) && ordineGioco(data) <= ordineGioco(PERIODO_VALIDATO.a);

/** Le segnalazioni della verifica dell'elenco che non sono proposte: l'audit le riporta all'utente. */
const SEGNALAZIONI = [
  'Bagno pubblico nei giorni del bagno medicinale (lunedì e giovedì): le proposte di 4fb3ea79 (05-02) e 0312ae2c (05-26), nel periodo validato, '
  + 'porterebbero la voce da Fascino +2 (la sua nota) a Fascino +3 (l’esito automatico «bagno-medicinale» della 233): sono «da verificare».',
  'Fuori dall’elenco: la migrazione 234 ha già collegato al bagno pubblico 29c27bf2 (06-09, giovedì), 2bfee883 (06-13, lunedì) e b33c622e '
  + '(06-16, giovedì), che nelle note scrivono «Fascino +2»; in quei giorni l’esito automatico è «bagno-medicinale», Fascino +3. O le condizioni '
  + 'della 233 o il Diario sono sbagliati: decide l’utente.',
];

interface EffettoInFile { effetto: unknown; completa?: unknown; scelte?: unknown }
interface PropostaInFile {
  id: string; voce: string; tipo: string | null; rif: [string, string] | null; effetti: EffettoInFile[]; togli: string[];
  certezza: CertezzaProposta; applica: boolean; motivo: string;
}
interface FileProposte { parte: number; di: number; lotto: string; proposte: PropostaInFile[] }
interface FileVoci { lotto: string; voci: Record<string, { data: string; impronta: string }> }
interface RigaPresente { voce_uid: string; lotto: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; effetti_json: string; togli_json: string; motivo: string; certezza: string; stato: string }

/** Un file dei dati versionati, cercato accanto al codice e nei sorgenti (come la 172). */
function leggiDati<T>(nome: string): { dati: T; impronta: string } {
  for (const p of [path.join(QUI, 'dati', nome), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', nome)]) {
    if (!fs.existsSync(p)) continue;
    const dati = JSON.parse(fs.readFileSync(p, 'utf8')) as T;
    return { dati, impronta: createHash('sha256').update(JSON.stringify(dati)).digest('hex') };
  }
  return errore(`manca il file dei dati ${nome} (server/db/migrations/dati)`);
}

/** Lo stesso JSON canonico di `jsonCanonico` per valori JSON semplici: chiavi ordinate, `undefined` tolti (come la 234). */
function canonico(v: unknown): string {
  const ordina = (x: unknown): unknown => {
    if (x == null || typeof x === 'string' || typeof x === 'boolean') return x ?? null;
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (Array.isArray(x)) return x.map(ordina);
    if (typeof x !== 'object') return errore('valore non serializzabile');
    return Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  };
  return JSON.stringify(ordina(v));
}

/**
 * L'impronta di una voce com'è adesso: testo, note, genere, fascia, tipo, collegamento, chi l'ha aggiunta o rivista, date, registro di
 * transizione ed effetti uno per uno (uid, ordine, tipo, chiave, valore, origine). La posizione nella fascia non conta. null se la voce non c'è.
 */
export function improntaVoce238(db: AppDatabase, uid: string): string | null {
  const v: unknown = db.prepare(`SELECT data, fascia, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da,
    testo_precedente_json, da_rivedere, created_at, updated_at FROM main.voce_giornata WHERE uid = ?`).get(uid);
  if (!v) return null;
  const t: unknown = db.prepare('SELECT stato, raw_json, motivo, impronta FROM main.voce_effetto_transizione WHERE voce_uid = ?').get(uid) ?? null;
  const e: unknown = db.prepare('SELECT uid, ordine, tipo, chiave, dati_json, origine FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine, uid').all(uid);
  return createHash('sha256').update(canonico({ v, t, e })).digest('hex').slice(0, 32);
}

/** Le tabelle dello schema `utente` con la colonna `voce_uid`, o null se lo schema non è attaccato o non ha le spunte (come la 234). */
function tabellePartiteConVoce(db: AppDatabase): string[] | null {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  if (!schemi.some((s) => s.name === 'utente')) return null;
  const tabelle = (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
  const conVoce = tabelle.filter((t) => (db.prepare(`PRAGMA utente.table_info("${t}")`).all() as Array<{ name: string }>).some((c) => c.name === 'voce_uid'));
  return conVoce.includes('spunta_voce_partita') ? conVoce : null;
}

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): dopo l'applicazione deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  const tabelle = (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((t) => t.name);
  for (const t of tabelle) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** L'impronta delle voci fuori dall'insieme (riga, effetti, registro): dopo l'applicazione deve essere identica. */
function improntaAltreVoci(db: AppDatabase, escluse: ReadonlySet<string>): string {
  const h = createHash('sha256');
  for (const [tabella, colonna] of [['voce_giornata', 'uid'], ['voce_effetto', 'voce_uid'], ['voce_effetto_transizione', 'voce_uid']] as const) {
    h.update(`#${tabella}\n`);
    for (const r of db.prepare(`SELECT * FROM main.${tabella} ORDER BY rowid`).iterate() as Iterable<Record<string, unknown>>) {
      if (!escluse.has(String(r[colonna]))) h.update(JSON.stringify(r) + '\n');
    }
  }
  return h.digest('hex');
}

/** La proposta come la salva la tabella (la forma che la pagina rilegge, con i valori predefiniti scritti), oppure il motivo per cui non è leggibile. */
function rigaDaFile(p: PropostaInFile): { effetti: string; togli: string } | string {
  if (!Array.isArray(p.effetti) || !Array.isArray(p.togli) || !p.togli.every((u) => typeof u === 'string' && /^[0-9a-f]{32}$/.test(u))) return 'effetti o effetti da togliere non sono elenchi validi';
  const effetti: Array<{ effetto: unknown; completa: string[]; scelte: string[] | null }> = [];
  for (const [i, e] of p.effetti.entries()) {
    const completa = leggiCampiDaCompletare(e?.completa);
    const scelte = e?.scelte === undefined || e?.scelte === null ? null : Array.isArray(e.scelte) && e.scelte.every((s) => typeof s === 'string' && s.length > 0) ? e.scelte as string[] : undefined;
    if (!completa || scelte === undefined || !leggiEffettoProposto(e?.effetto, completa)) return `effetto ${i + 1} non riconoscibile`;
    effetti.push({ effetto: e.effetto, completa, scelte });
  }
  return { effetti: JSON.stringify(effetti), togli: JSON.stringify(p.togli) };
}

/** Le proposte dei file, verificate nella forma: id unici del lotto, voce, certezza, motivo. Un file malformato ferma la migrazione. */
function leggiProposte(): { proposte: PropostaInFile[]; voci: FileVoci['voci']; impronte: string[] } {
  const proposte: PropostaInFile[] = [];
  const impronte: string[] = [];
  for (let i = 1; i <= PARTI; i++) {
    const { dati, impronta } = leggiDati<FileProposte>(`238-proposte-L13-4b-${i}.json`);
    if (dati.parte !== i || dati.di !== PARTI || dati.lotto !== LOTTO || !Array.isArray(dati.proposte)) errore(`il file ${i} delle proposte non è quello atteso`);
    proposte.push(...dati.proposte);
    impronte.push(impronta);
  }
  const { dati: fileVoci, impronta } = leggiDati<FileVoci>('238-voci-L13-4b.json');
  if (fileVoci.lotto !== LOTTO || !fileVoci.voci || typeof fileVoci.voci !== 'object') errore('il file delle voci non è quello atteso');
  impronte.push(impronta);
  const ids = new Set<string>();
  for (const p of proposte) {
    if (typeof p.id !== 'string' || !p.id.startsWith(`${LOTTO}-`) || p.id.length > 120 || ids.has(p.id)) errore(`id di proposta non valido o ripetuto: ${String(p.id)}`);
    ids.add(p.id);
    const lettura = typeof p.voce === 'string' ? fileVoci.voci[p.voce] : undefined;
    if (!lettura || typeof lettura.data !== 'string' || !/^\d{2}-\d{2}$/.test(lettura.data) || typeof lettura.impronta !== 'string') errore(`${p.id}: voce senza giorno e impronta di lettura`);
    if (!['certa', 'probabile', 'da-verificare'].includes(p.certezza) || typeof p.motivo !== 'string' || !p.motivo.trim() || typeof p.applica !== 'boolean') errore(`${p.id}: certezza, motivo o «applica» non validi`);
    if (p.rif !== null && (!Array.isArray(p.rif) || p.rif.length !== 2 || !p.rif.every((x) => typeof x === 'string' && x.length > 0))) errore(`${p.id}: collegamento non valido`);
    if (p.tipo !== null && typeof p.tipo !== 'string') errore(`${p.id}: tipo non valido`);
    if (p.applica && (p.certezza !== 'certa' || nelPeriodoValidato(lettura!.data))) errore(`${p.id}: «applica» solo per una riga certa fuori dal periodo validato`);
  }
  return { proposte, voci: fileVoci.voci, impronte };
}

export const migration238: Migration = {
  id: 238,
  name: 'proposte_conversione_l13_4b',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['proposta_conversione_voce', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 238, tabella: t }, 'tabella assente: elenco di conversione L13-4b non caricato'); return; }
    }
    const { proposte, voci, impronte } = leggiProposte();
    const adesso = new Date().toISOString();

    // ---- (1) tutte le proposte, senza duplicarle
    const presente = db.prepare('SELECT voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, stato FROM main.proposta_conversione_voce WHERE id = ?');
    const inserisci = db.prepare(`INSERT INTO main.proposta_conversione_voce (id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`);
    const caricate = { dentroPeriodo: 0, fuoriPeriodo: 0 };
    const giaPresenti: Record<string, number> = {};
    const nonCaricate: Array<{ id: string; motivo: string }> = [];
    const presentiDiverse: string[] = [];
    const vociCambiate = new Set<string>();
    for (const p of proposte) {
      const lettura = voci[p.voce]!;
      const ora = improntaVoce238(db, p.voce);
      if (ora === null) { nonCaricate.push({ id: p.id, motivo: 'voce assente' }); vociCambiate.add(p.voce); continue; }
      if (ora !== lettura.impronta) vociCambiate.add(p.voce);
      const riga = rigaDaFile(p);
      if (typeof riga === 'string') { nonCaricate.push({ id: p.id, motivo: riga }); continue; }
      const prima = presente.get(p.id) as RigaPresente | undefined;
      if (prima) {
        giaPresenti[prima.stato] = (giaPresenti[prima.stato] ?? 0) + 1;
        if (prima.voce_uid !== p.voce || prima.lotto !== LOTTO || prima.tipo_proposto !== p.tipo || prima.riferimento_tipo !== (p.rif?.[0] ?? null) || prima.riferimento_chiave !== (p.rif?.[1] ?? null)
          || prima.effetti_json !== riga.effetti || prima.togli_json !== riga.togli || prima.motivo !== p.motivo || prima.certezza !== p.certezza) presentiDiverse.push(p.id);
        continue;
      }
      if (inserisci.run(p.id, p.voce, LOTTO, p.tipo, p.rif?.[0] ?? null, p.rif?.[1] ?? null, riga.effetti, riga.togli, p.motivo, p.certezza, adesso).changes !== 1) errore(`${p.id} non è stata caricata`);
      if (nelPeriodoValidato(lettura.data)) caricate.dentroPeriodo++; else caricate.fuoriPeriodo++;
    }

    // ---- (2) le righe certe fuori dal periodo validato, voce per voce, con la funzione della pagina
    const daApplicare = new Map<string, PropostaInFile[]>();
    for (const p of proposte) if (p.applica) daApplicare.set(p.voce, [...(daApplicare.get(p.voce) ?? []), p]);
    const vociDaApplicare = new Set(daApplicare.keys());
    const partite = tabellePartiteConVoce(db);
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    const applicate: Array<{ id: string; voce: string; giorno: string; esito: unknown }> = [];
    const saltate: Array<{ voce: string; giorno: string; proposte: string[]; motivo: string }> = [];
    const giaDecise: Record<string, number> = {};
    const toccate = new Set<string>();
    const partitePrima = partite ? improntaPartite(db) : null;
    const altrePrima = improntaAltreVoci(db, vociDaApplicare);
    const statoDi = (id: string): string | undefined => db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(id) as string | undefined;
    for (const [uid, righe] of daApplicare) {
      const giorno = voci[uid]!.data;
      const nonInTabella = righe.filter((r) => statoDi(r.id) === undefined);
      if (nonInTabella.length) saltate.push({ voce: uid, giorno, proposte: nonInTabella.map((r) => r.id), motivo: 'proposta non caricata: voce assente o riga illeggibile' });
      const aperte = righe.filter((r) => {
        const s = statoDi(r.id);
        if (s && s !== 'aperta') giaDecise[s] = (giaDecise[s] ?? 0) + 1;
        return s === 'aperta';
      });
      if (!aperte.length) continue;
      const salta = (motivo: string): void => { saltate.push({ voce: uid, giorno, proposte: aperte.map((r) => r.id), motivo }); };
      if (nelPeriodoValidato(giorno)) { salta('periodo validato: serve il sì dell’utente riga per riga'); continue; }
      if (!stessaConnessione) { salta('connessione diversa da quella dei servizi: proposte solo caricate'); continue; }
      if (partite === null) { salta('schema delle partite non attaccato: spunte non verificabili'); continue; }
      if (vociCambiate.has(uid) || improntaVoce238(db, uid) !== voci[uid]!.impronta) { salta('voce cambiata dopo la lettura dell’elenco: testo, note, collegamento, effetti o updated_at'); continue; }
      const citata = partite.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(uid));
      if (citata.length) { salta(`citata nelle partite (${citata.join(', ')}): una migrazione non tocca spunte, ricevute né proposte delle partite`); continue; }
      if (aperte.some((r) => r.effetti.some((e) => Array.isArray(e.completa) && e.completa.length > 0))) { salta('una proposta chiede dati da completare: la decide l’utente'); continue; }
      try {
        const esiti = db.transaction(() => aperte.map((r) => {
          const dto = elencaProposteConversione({ da: giorno, a: giorno, stato: 'aperta' }).find((d) => d.id === r.id);
          if (!dto) throw new Error(`proposta ${r.id} non trovata fra le aperte`);
          if (!dto.leggibile) throw new Error(`proposta ${r.id} illeggibile: ${dto.problema ?? ''}`);
          applicaPropostaConversione(r.id, { revisionePropostaAttesa: dto.revisione });
          if (statoDi(r.id) !== 'applicata') throw new Error(`proposta ${r.id} non risulta applicata`);
          const esito = db.prepare('SELECT esito_json FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(r.id) as string | null;
          return { id: r.id, voce: uid, giorno, esito: esito === null ? null : JSON.parse(esito) as unknown };
        }))();
        applicate.push(...esiti);
        toccate.add(uid);
      } catch (e) {
        const x = e as { code?: unknown; message?: unknown };
        salta(`rifiutata dal servizio: ${typeof x.code === 'string' ? `${x.code} ` : ''}${typeof x.message === 'string' ? x.message : String(e)}`);
      }
    }

    // ---- controlli: partite identiche; voci fuori dall'elenco da applicare identiche; voci dell'elenco non applicate com'erano prima del giro
    if (partitePrima !== null && improntaPartite(db) !== partitePrima) errore('lo schema delle partite è cambiato');
    if (improntaAltreVoci(db, vociDaApplicare) !== altrePrima) errore('una voce fuori dall’elenco da applicare è cambiata');
    for (const s of saltate) if (!vociCambiate.has(s.voce) && improntaVoce238(db, s.voce) !== voci[s.voce]!.impronta) errore(`la voce ${s.voce}, saltata, è cambiata`);

    // ---- (3) audit: un'esecuzione per giro
    const aperteDopo = db.prepare("SELECT COUNT(*) FROM main.proposta_conversione_voce WHERE lotto = ? AND stato = 'aperta'").pluck().get(LOTTO) as number;
    const perMotivo: Record<string, number> = {};
    for (const s of saltate) { const k = s.motivo.split(':')[0]!; perMotivo[k] = (perMotivo[k] ?? 0) + s.proposte.length; }
    const esecuzione = {
      il: adesso, elenco: 'voci-da-convertire v8 (2026-10-25, gioco 235)', impronteFile: impronte,
      conteggi: {
        proposteNelFile: proposte.length, daApplicareNelFile: proposte.filter((p) => p.applica).length,
        caricate: caricate.dentroPeriodo + caricate.fuoriPeriodo, caricateDentroPeriodo: caricate.dentroPeriodo, caricateFuoriPeriodo: caricate.fuoriPeriodo,
        giaPresenti, presentiConContenutoDiverso: presentiDiverse.length, nonCaricate: nonCaricate.length,
        applicate: applicate.length, vociApplicate: toccate.size, giaDecise, saltate: saltate.reduce((n, s) => n + s.proposte.length, 0), saltatePerMotivo: perMotivo,
        vociCambiateDopoLaLettura: vociCambiate.size, aperteDelLottoDopo: aperteDopo,
      },
      schemaPartite: partite === null ? 'non attaccato' : { tabelleConVoce: partite }, stessaConnessione,
      applicate, saltate, nonCaricate, presentiDiverse, vociCambiate: [...vociCambiate], segnalazioni: SEGNALAZIONI,
    };
    const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
    const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
      .run(AUDIT, JSON.stringify({ migrazione: 238, lotto: LOTTO, esecuzioni: [...esecuzioni, esecuzione] }));
    logger.info({ migrazione: 238, ...esecuzione.conteggi }, 'Elenco di conversione L13-4b: righe certe applicate, le altre caricate come proposte');
  },
};
