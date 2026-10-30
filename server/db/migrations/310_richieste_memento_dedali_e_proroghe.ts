// ============================================================
// Migrazione 310 — Richieste dei Memento: sblocco dalle voci del Diario, completamento col Dedalo aperto, proroga nel Dedalo di Da'at, testi
// copiati tolti (L13, ondata 7, lotto O7-1)
// ============================================================
//
// Istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all'obiettivo».
// Ondata 7, punti 1 e 5 per le Richieste. Misure sulla copia portata alla 309: 5 Richieste senza condizioni (sblocco ancora in prosa), 6 con
// la scadenza solo in prosa («23 dicembre; se non completata … Dedalo di Da'at (Area N)»), nessuna con la condizione «Sblocco ricevuto»
// mentre 11 voci del Diario hanno già l'effetto «sblocco» di una Richiesta; ricompense in testo su 33 Richieste che hanno già gli oggetti in
// `ricompensa_oggetto`, committente che ripete il rango delle condizioni, `piano` uguale all'area del Dedalo collocata.
//
// Che cosa fa:
//   (1) schema: `richiesta.completamento_condizioni_json` (le condizioni proprie per COMPLETARLA, oltre al Dedalo aperto che il servizio legge
//       dalla condizione d'apertura della 305) e `richiesta.proroga_area_dedalo_chiave` (l'area in cui il bersaglio si sposta finché vale la
//       proroga), nullable;
//   (2) le Richieste: l'elenco CHIUSO `dati/310-richieste.json` (letto il 2026-10-30), campo per campo con il valore di oggi e quello nuovo.
//       Una riga si scrive solo se ogni suo campo è ancora quello letto o già quello nuovo; altrimenti resta com'è e l'audit dice quali campi
//       sono diversi (un dato corretto dall'utente non si sovrascrive). Le condizioni nuove si scrivono nella forma dell'app (`tipo` per primo,
//       verificate con `normalizzaCondizioniSpillo`); l'area della proroga deve esistere;
//   (3) le voci del Diario: le tre proposte «da completare» del lotto L13-4b che la guida ora conferma (sblocco di «I vincenti non imbrogliano»
//       alla voce del 4 settembre; collegamento e sblocco di «L'idol e l'unicorno» alla voce del 28 gennaio) si applicano con la STESSA funzione
//       della pagina «Da completare» (`applicaPropostaConversione`, come la 302): solo se la proposta è ancora aperta e uguale a quella letta,
//       se la voce ha ancora giorno e testo letti e l'impronta di lettura della 238 (mai modificata dopo), e se nessuna partita la cita (spunte,
//       effetti applicati, «Applica» in sospeso, sblocchi…: ogni tabella dello schema `utente` con `voce_uid`). Serve la connessione dei servizi;
//   (4) audit in `dati_guida.audit-310-richieste-memento`: per ogni riga i valori prima e dopo, le righe e le proposte saltate col motivo, ciò
//       che resta da decidere all'utente (`lasciate`, decisione 23 casi a/c) e le differenze fra le pagine dei Dedali e i dati (non applicate).
// Le partite non si scrivono mai: lo schema `utente` deve risultare identico (impronta di ogni riga), o la migrazione si annulla. Idempotente:
// la seconda volta ogni riga è «già applicata», ogni proposta «già applicata», e l'audit non si riscrive.
//
// Fonti (lette il 2026-10-30): https://www.allgamestaff.it/persona-5-royal/richieste-nei-memento/,
// https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-chihaya-fortuna/, le pagine dedalo-di-<nome> (aiyatsbus, chemdah, kaitul,
// akzeriyyuth, adyeshach, sheriruth, daat).
// ============================================================

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { tabellePartiteConVoce } from './fbisOndata5.js';
import { improntaVoce238 } from './238_proposte_conversione_l13_4b.js';
import { normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const FILE_DATI = '310-richieste.json';
const AUDIT = 'audit-310-richieste-memento';
const RICHIESTA = '«completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 7, lotto O7-1)';
const errore = (motivo: string): never => { throw new Error(`310: ${motivo}; nessuna modifica applicata.`); };

/** I campi che l'elenco può scrivere (nessun altro: il nome di una colonna non arriva mai da fuori nello SQL). */
const COLONNE = ['ricompense_json', 'piano', 'area', 'committente', 'scadenza', 'disponibile_dal', 'scadenza_data', 'proroga_data', 'proroga_condizioni_json',
  'proroga_area_dedalo_chiave', 'condizioni_json', 'completamento_condizioni_json', 'confidente_rango'] as const;
type Colonna = (typeof COLONNE)[number];
/** Le colonne di condizioni: il valore nuovo deve essere nella forma che l'app scrive. */
const DI_CONDIZIONI: ReadonlySet<Colonna> = new Set(['proroga_condizioni_json', 'condizioni_json', 'completamento_condizioni_json']);
/** Le colonne JSON: nell'elenco sono elenchi, nel database il loro testo. */
const JSON_COLONNE: ReadonlySet<Colonna> = new Set(['ricompense_json', ...DI_CONDIZIONI]);

type ValoreSql = string | number | null;
interface VoceDati { chiave: string; motivo: string; campi: Partial<Record<Colonna, { prima: unknown; dopo: unknown }>> }
interface PropostaDati { id: string; voce: string; data: string; azione: string; motivo: string;
  attesa: { tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; effetti_json: string; togli_json: string } }
interface FileDati { lotto: string; letto: string; fonti: Record<string, string>; regole: Record<string, string>; richieste: VoceDati[]; proposte: PropostaDati[];
  lasciate: Array<{ chiave: string; caso: string; domanda: string }>; discrepanze: string[] }

/** L'elenco della migrazione (accanto al file compilato o nei sorgenti). */
function leggiDati(): FileDati {
  for (const p of [path.join(QUI, 'dati', FILE_DATI), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', FILE_DATI)]) {
    if (!fs.existsSync(p)) continue;
    const v = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<FileDati>;
    if (v.lotto !== 'O7-1' || !Array.isArray(v.richieste) || !Array.isArray(v.proposte) || !Array.isArray(v.lasciate) || !Array.isArray(v.discrepanze)) errore(`il file ${FILE_DATI} non è quello atteso`);
    return v as FileDati;
  }
  return errore(`manca il file ${FILE_DATI}`);
}

/** Il valore dell'elenco come lo salva il database: gli elenchi JSON come testo, il resto com'è (testo, numero o null). */
function inSql(colonna: Colonna, v: unknown): ValoreSql {
  if (v === null) return null;
  if (JSON_COLONNE.has(colonna)) {
    if (!Array.isArray(v)) errore(`il valore di ${colonna} nell'elenco non è un elenco`);
    return JSON.stringify(v);
  }
  if (typeof v === 'string' || typeof v === 'number') return v;
  return errore(`il valore di ${colonna} nell'elenco non è un testo né un numero`);
}

/** Le colonne nuove della Richiesta, se mancano. Ritorna quelle aggiunte. */
function colonneNuove(db: AppDatabase): string[] {
  const ci = new Set((db.prepare('PRAGMA main.table_info(richiesta)').all() as Array<{ name: string }>).map((c) => c.name));
  const aggiunte: string[] = [];
  for (const c of ['completamento_condizioni_json', 'proroga_area_dedalo_chiave']) {
    if (ci.has(c)) continue;
    db.exec(`ALTER TABLE main.richiesta ADD COLUMN ${c} TEXT`);
    aggiunte.push(c);
  }
  return aggiunte;
}

interface EsitoRiga { chiave: string; esito: string; motivo?: string; prima?: Record<string, ValoreSql>; dopo?: Record<string, ValoreSql>; diversi?: Record<string, { atteso: ValoreSql; letto: ValoreSql }> }

/** Una Richiesta dell'elenco: scritta solo se ogni campo è quello letto o già quello nuovo. */
function scriviRichiesta(db: AppDatabase, r: VoceDati): EsitoRiga {
  const colonne = Object.keys(r.campi) as Colonna[];
  for (const c of colonne) if (!COLONNE.includes(c)) errore(`colonna «${c}» non prevista nell'elenco`);
  const riga = db.prepare(`SELECT ${colonne.join(', ')} FROM main.richiesta WHERE chiave = ?`).get(r.chiave) as Record<string, ValoreSql> | undefined;
  if (!riga) return { chiave: r.chiave, esito: 'Richiesta assente: niente da fare' };
  const prima: Record<string, ValoreSql> = {}, dopo: Record<string, ValoreSql> = {}, diversi: NonNullable<EsitoRiga['diversi']> = {};
  for (const c of colonne) {
    const campo = r.campi[c]!;
    const vPrima = inSql(c, campo.prima), vDopo = inSql(c, campo.dopo);
    if (DI_CONDIZIONI.has(c) && typeof vDopo === 'string' && JSON.stringify(normalizzaCondizioniSpillo(JSON.parse(vDopo) as unknown[])) !== vDopo) errore(`condizioni nuove di ${r.chiave}.${c} non nella forma dell'app`);
    const letto = riga[c] ?? null;
    if (letto === vDopo) continue;
    if (letto === vPrima) { prima[c] = vPrima; dopo[c] = vDopo; continue; }
    diversi[c] = { atteso: vPrima, letto };
  }
  if (Object.keys(diversi).length) return { chiave: r.chiave, esito: 'saltata: campi diversi da quelli letti (forse corretti dall’utente), riga lasciata com’era', diversi };
  const daScrivere = Object.keys(dopo) as Colonna[];
  if (!daScrivere.length) return { chiave: r.chiave, esito: 'già applicata' };
  const area = dopo.proroga_area_dedalo_chiave;
  if (typeof area === 'string' && !db.prepare('SELECT 1 FROM main.area_dedalo WHERE chiave = ?').get(area)) return { chiave: r.chiave, esito: `saltata: l'area della proroga «${area}» non c'è in questi dati` };
  // la scrittura vale solo sulla riga ancora con i valori letti (`IS` confronta anche i null)
  const res = db.prepare(`UPDATE main.richiesta SET ${daScrivere.map((c) => `${c} = ?`).join(', ')} WHERE chiave = ? AND ${daScrivere.map((c) => `${c} IS ?`).join(' AND ')}`)
    .run(...daScrivere.map((c) => dopo[c]), r.chiave, ...daScrivere.map((c) => prima[c]));
  if (res.changes !== 1) errore(`la Richiesta ${r.chiave} non è stata scritta`);
  const riletta = db.prepare(`SELECT ${colonne.join(', ')} FROM main.richiesta WHERE chiave = ?`).get(r.chiave) as Record<string, ValoreSql>;
  for (const c of colonne) if ((riletta[c] ?? null) !== inSql(c, r.campi[c]!.dopo)) errore(`la Richiesta ${r.chiave} riletta ha ${c} diverso da quello scritto`);
  return { chiave: r.chiave, esito: 'scritta', motivo: r.motivo, prima, dopo };
}

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** Le impronte di lettura delle voci del lotto L13-4b (file versionato della 238), o null se il file non c'è. */
function impronteDiLettura238(): Record<string, { data: string; impronta: string }> | null {
  for (const p of [path.join(QUI, 'dati', '238-voci-L13-4b.json'), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', '238-voci-L13-4b.json')]) {
    if (!fs.existsSync(p)) continue;
    const v = JSON.parse(fs.readFileSync(p, 'utf8')) as { lotto?: unknown; voci?: unknown };
    if (v.lotto !== 'L13-4b' || !v.voci || typeof v.voci !== 'object') errore('il file delle voci della 238 non è quello atteso');
    return v.voci as Record<string, { data: string; impronta: string }>;
  }
  return null;
}

interface EsitoProposta { id: string; voce: string; esito: string; motivo?: string; risultato?: unknown }

/** Perché la proposta non si applica (null = si può). Solo letture. */
function motivoPerSaltare(db: AppDatabase, p: PropostaDati, partite: string[] | null, letture: Record<string, { data: string; impronta: string }> | null): string | null {
  const r = db.prepare('SELECT voce_uid, stato, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json FROM main.proposta_conversione_voce WHERE id = ?').get(p.id) as
    { voce_uid: string; stato: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; effetti_json: string; togli_json: string } | undefined;
  if (!r) return 'proposta assente in questi dati';
  if (r.stato !== 'aperta') return `proposta già decisa (${r.stato}): lasciata com'è`;
  if (r.voce_uid !== p.voce || r.tipo_proposto !== p.attesa.tipo_proposto || r.riferimento_tipo !== p.attesa.riferimento_tipo || r.riferimento_chiave !== p.attesa.riferimento_chiave
    || r.effetti_json !== p.attesa.effetti_json || r.togli_json !== p.attesa.togli_json) return 'proposta diversa da quella letta';
  const v = db.prepare('SELECT data, azione FROM main.voce_giornata WHERE uid = ?').get(p.voce) as { data: string; azione: string } | undefined;
  if (!v) return 'voce assente';
  if (v.data !== p.data || v.azione !== p.azione) return 'giorno o testo della voce diversi da quelli letti';
  const lettura = letture?.[p.voce];
  if (!lettura) return 'manca la lettura della voce su cui la proposta è stata scritta (238)';
  if (improntaVoce238(db, p.voce) !== lettura.impronta) return 'la voce è cambiata dopo che la proposta è stata scritta: non si applica da sola';
  if (partite === null) return 'schema delle partite non attaccato: spunte non verificabili';
  const citata = partite.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(p.voce));
  if (citata.length) return `voce citata nelle partite (${citata.join(', ')}): non si riscrive`;
  return null;
}

/** Le proposte confermate dalla guida, per voce, con la funzione della pagina «Da completare»; una voce che le verifiche rifiutano torna com'era. */
function applicaProposte(db: AppDatabase, proposte: PropostaDati[]): EsitoProposta[] {
  if (!esisteTabella(db, 'proposta_conversione_voce') || !esisteTabella(db, 'voce_giornata')) return proposte.map((p) => ({ id: p.id, voce: p.voce, esito: 'tabelle delle proposte assenti: niente da fare' }));
  const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
  const partite = tabellePartiteConVoce(db);
  const letture = impronteDiLettura238();
  const esiti: EsitoProposta[] = [];
  const perVoce = new Map<string, PropostaDati[]>();
  for (const p of proposte) perVoce.set(p.voce, [...(perVoce.get(p.voce) ?? []), p]);
  for (const [voce, righe] of perVoce) {
    const giaApplicate = righe.filter((p) => db.prepare("SELECT 1 FROM main.proposta_conversione_voce WHERE id = ? AND stato = 'applicata'").get(p.id));
    for (const p of giaApplicate) esiti.push({ id: p.id, voce, esito: 'già applicata' });
    const restano = righe.filter((p) => !giaApplicate.includes(p));
    if (!restano.length) continue;
    // la voce si tratta intera: se una delle sue proposte non si può applicare, nessuna (toccano la stessa voce, una dopo l'altra)
    const motivi = restano.map((p) => motivoPerSaltare(db, p, partite, letture));
    const primo = motivi.find((m) => m !== null);
    if (primo) { for (const [i, p] of restano.entries()) esiti.push({ id: p.id, voce, esito: `saltata: ${motivi[i] ?? `un'altra proposta della voce non si applica (${primo})`}` }); continue; }
    if (!stessaConnessione) { for (const p of restano) esiti.push({ id: p.id, voce, esito: 'saltata: la migrazione non gira sulla connessione dei servizi' }); continue; }
    try {
      const fatte = db.transaction(() => restano.map((p) => {
        const dto = elencaProposteConversione({ da: p.data, a: p.data, stato: 'aperta' }).find((d) => d.id === p.id);
        if (!dto) throw new Error(`proposta ${p.id} non trovata fra le aperte`);
        if (!dto.leggibile) throw new Error(`proposta ${p.id} illeggibile: ${dto.problema ?? ''}`);
        applicaPropostaConversione(p.id, { revisionePropostaAttesa: dto.revisione });
        if (db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(p.id) !== 'applicata') throw new Error(`proposta ${p.id} non risulta applicata`);
        const esito = db.prepare('SELECT esito_json FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(p.id) as string | null;
        return { id: p.id, voce, esito: 'applicata', motivo: p.motivo, risultato: esito === null ? null : JSON.parse(esito) as unknown };
      }))();
      esiti.push(...fatte);
    } catch (e) {
      const x = e as { code?: unknown; message?: unknown };
      const testo = `${typeof x.code === 'string' ? `${x.code}: ` : ''}${typeof x.message === 'string' ? x.message : String(e)}`;
      for (const p of restano) esiti.push({ id: p.id, voce, esito: `saltata: le verifiche della voce l'hanno rifiutata (${testo})` });
    }
  }
  return esiti;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, dati: FileDati, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 310, lotto: dati.lotto, richiesta: RICHIESTA, letto: dati.letto, fonti: dati.fonti, regole: dati.regole,
      regola: 'una Richiesta si scrive solo se ogni campo è quello letto o già quello nuovo; le proposte solo se aperte, uguali a quelle lette, su voci mai modificate e non citate da partite; le partite non si scrivono mai',
      daDecidere: dati.lasciate, discrepanzeNonApplicate: dati.discrepanze,
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration310: Migration = {
  id: 310,
  name: 'richieste_memento_dedali_e_proroghe',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'richiesta')) { logger.warn({ migrazione: 310 }, 'tabella delle Richieste assente: niente da fare'); return; }
    const dati = leggiDati();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const colonne = colonneNuove(db);
    const richieste = dati.richieste.map((r) => scriviRichiesta(db, r));
    const proposte = applicaProposte(db, dati.proposte);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const scritte = richieste.filter((r) => r.esito === 'scritta').length;
    const applicate = proposte.filter((p) => p.esito === 'applicata').length;
    scriviAudit(db, dati, { colonneAggiunte: colonne, richieste, proposte }, colonne.length > 0 || scritte > 0 || applicate > 0);
    logger.info({ migrazione: 310, colonneAggiunte: colonne.length, richiesteScritte: scritte, saltate: richieste.filter((r) => r.esito.startsWith('saltata')).length, proposteApplicate: applicate },
      'Richieste dei Memento: sblocco, completamento, proroga e testi');
  },
};
