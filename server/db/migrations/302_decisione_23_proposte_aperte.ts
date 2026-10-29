// ============================================================
// Migrazione 302 — decisione 23: le proposte «da completare» aperte si applicano direttamente, anche nel periodo validato (L13)
// ============================================================
//
// Decisione 23 dell'utente (29 ottobre), sulle correzioni delle voci del Diario dal 1 aprile al 31 maggio: «applicale direttamente a meno di
// impatti per i quali è necessaria mia decisione esplicita» (`docs/coordinamento/lotti/L13/decisioni-2026-10-25.md`, punto 23). Supera la
// regola «nel periodo validato solo con il sì riga per riga» e vale anche per le proposte già aperte. Restano da decidere SOLO:
//   (a) le correzioni incerte: certezza «probabile» o «da verificare»; e, per la stessa ragione, quelle che non sono più certe perché la voce
//       è cambiata dopo che la proposta è stata scritta (lotto L13-4b: l'impronta di lettura della 238), quelle superate (un effetto da togliere
//       non c'è più), quelle illeggibili e quelle che le verifiche della voce rifiutano;
//   (b) quelle che dipendono da una scelta che solo l'utente conosce: dati da completare (quantità, giorno…), una scelta fra più valori, e le
//       televendite (lotto L13-televendite: quale dei due set è stato comprato);
//   (c) quelle che cambierebbero ciò che è già registrato nelle partite: la voce è citata da una partita (ogni tabella dello schema `utente`
//       con la colonna `voce_uid`: spunte, effetti applicati, yen automatici, oggetti, punti dei Confidenti, «Applica» in sospeso…). Una voce
//       spuntata che cambia muoverebbe yen, Doti, oggetti o Confidenti, o farebbe ricalcolare le spunte; senza lo schema `utente` attaccato
//       non si può verificare, e nessuna proposta si applica.
// Una proposta certa di una voce che ha anche proposte che restano aperte si applica, salvo che tocchi la stessa cosa (un effetto da togliere
// in comune, o un tipo o un collegamento diversi): allora resta anche lei, con il motivo dell'altra.
//
// Come applica: con la STESSA funzione della pagina «Da completare» (`applicaPropostaConversione` → `aggiornaVoce` → `salvaEffettiVoce`:
// collegamento verificato, UID e revisione degli effetti, verifiche di ogni effetto, regola degli yen, registro delle operazioni), come la
// 238 e la 239; mai SQL parallelo agli invarianti. Le proposte di una voce si applicano in sequenza nello stesso punto di ripristino: se una
// fallisce la voce torna com'era e le sue proposte restano aperte (motivo (a), con il messaggio delle verifiche). Serve la connessione dei
// servizi (`getDb()`); su un'altra connessione non si applica nulla (l'audit lo dice).
//
// Controlli (un controllo che non torna annulla tutta la migrazione, come nella 238): lo schema `utente` identico (impronta di ogni riga di
// ogni tabella); le voci senza proposte applicate identiche (riga, effetti, registro di transizione); le proposte lasciate aperte identiche.
// Idempotente: una seconda esecuzione trova aperte solo le proposte lasciate, per gli stessi motivi, e non applica nulla; l'audit accoda
// un'esecuzione solo se è la prima o se qualcosa è cambiato. Audit in `dati_guida.audit-302-decisione-23`, con ogni proposta lasciata e il suo
// motivo in parole chiare. Scrive solo in `main`.
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
import { ordineGioco } from '../../../shared/condizioniSpillo.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = 'audit-302-decisione-23';
const DECISIONE = 'applicale direttamente a meno di impatti per i quali è necessaria mia decisione esplicita';
const errore = (motivo: string): never => { throw new Error(`302: ${motivo}; nessuna modifica applicata.`); };

/** Il periodo del Diario validato (04-01…05-31): solo per i conteggi dell'audit, non blocca più nulla (decisione 23). */
const nelPeriodoValidato = (data: string): boolean => ordineGioco(data) >= ordineGioco('04-01') && ordineGioco(data) <= ordineGioco('05-31');

/** Le tabelle delle partite in parole dell'utente. */
const COSA_REGISTRA: Record<string, string> = {
  spunta_voce_partita: 'la voce è spuntata',
  effetto_applicato: 'gli effetti della spunta sono già applicati',
  evento_partita: 'ci sono eventi registrati',
  invito_partita: 'ci sono inviti registrati',
  acquisto_provenienza: 'ci sono acquisti registrati',
  registro_acquisti: 'ci sono acquisti registrati',
  pesca_provenienza: 'c’è una pesca registrata',
  effetto_stato_voce: 'ci sono stati registrati (persone, storie, domande, oggetti…)',
  punti_confidente_voce: 'ci sono punti dei Confidenti registrati',
  oggetto_ottenuto_partita: 'ci sono oggetti ottenuti registrati',
  consumo_oggetto_partita: 'ci sono oggetti consumati registrati',
  sblocco_partita: 'ci sono sblocchi registrati',
  da_applicare: 'ci sono modifiche «Applica» in sospeso',
  yen_automatico: 'ci sono yen già scalati o ricevuti',
  censimento_stato_voce: 'c’è il censimento degli stati della voce',
};

type Codice = 'a' | 'b' | 'c';
interface Motivo { codice: Codice; testo: string }
interface RigaAperta {
  id: string; voce_uid: string; lotto: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null;
  effetti_json: string; togli_json: string; certezza: string; data: string; azione: string;
}
interface EffettoInRiga { completa?: unknown; scelte?: unknown }

/** Le impronte di lettura delle voci del lotto L13-4b (file versionato della 238), o null se il file non c'è. */
function impronteDiLettura238(): Record<string, { data: string; impronta: string }> | null {
  for (const p of [path.join(QUI, 'dati', '238-voci-L13-4b.json'), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', '238-voci-L13-4b.json')]) {
    if (!fs.existsSync(p)) continue;
    const dati = JSON.parse(fs.readFileSync(p, 'utf8')) as { lotto?: unknown; voci?: unknown };
    if (dati.lotto !== 'L13-4b' || !dati.voci || typeof dati.voci !== 'object') errore('il file delle voci della 238 non è quello atteso');
    return dati.voci as Record<string, { data: string; impronta: string }>;
  }
  return null;
}

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  const tabelle = (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((t) => t.name);
  for (const t of tabelle) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** L'impronta delle voci fuori dall'insieme (riga, effetti, registro): alla fine deve essere identica. */
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

const leggiJson = (raw: string): unknown => { try { return JSON.parse(raw) as unknown; } catch { return undefined; } };
/** I campi da completare (`CAMPI_DA_COMPLETARE`) in parole dell'utente. */
const PAROLE_CAMPO: Record<string, string> = { elemento: 'quale elemento (oggetto, articolo, attività…)', quantita: 'la quantità', note: 'le note (♪) della Dote' };
const testoCampi = (campi: string[]): string => campi.map((c) => PAROLE_CAMPO[c] ?? `«${c}»`).join(', ');

/** I motivi propri della proposta per restare aperta ((a) e (b)); (c) si valuta sulla voce. Vuoto: certa e senza scelte dell'utente. */
function motiviDellaProposta(db: AppDatabase, r: RigaAperta, letture238: Record<string, { data: string; impronta: string }> | null): Motivo[] {
  const motivi: Motivo[] = [];
  if (r.certezza !== 'certa') {
    motivi.push({ codice: 'a', testo: `la correzione è incerta (certezza «${r.certezza === 'da-verificare' ? 'da verificare' : r.certezza}»): va confermata da te` });
  }
  if (r.lotto === 'L13-4b') {
    const lettura = letture238?.[r.voce_uid];
    if (!lettura) motivi.push({ codice: 'a', testo: 'manca la lettura della voce su cui la proposta è stata scritta: non si può dire che sia ancora giusta' });
    else if (improntaVoce238(db, r.voce_uid) !== lettura.impronta) motivi.push({ codice: 'a', testo: 'la voce è cambiata dopo che la proposta è stata scritta (testo, note, collegamento o effetti): la correzione va riconfermata' });
  }
  const effetti = leggiJson(r.effetti_json);
  const togli = leggiJson(r.togli_json);
  if (!Array.isArray(effetti) || !Array.isArray(togli)) {
    motivi.push({ codice: 'a', testo: 'la proposta non si legge per intero: si può solo scartare' });
    return motivi;
  }
  const completa = new Set<string>();
  const scelte: string[] = [];
  for (const e of effetti as EffettoInRiga[]) {
    if (Array.isArray(e?.completa)) for (const c of e.completa) if (typeof c === 'string') completa.add(c);
    if (Array.isArray(e?.scelte)) scelte.push(...e.scelte.filter((s): s is string => typeof s === 'string'));
  }
  if (completa.size) motivi.push({ codice: 'b', testo: `servono dati che solo tu conosci: ${testoCampi([...completa])}` });
  if (scelte.length) motivi.push({ codice: 'b', testo: `va scelto il valore giusto fra quelli proposti (${scelte.join(', ')}): lo sai solo tu` });
  if (r.lotto === 'L13-televendite') motivi.push({ codice: 'b', testo: 'quale dei due set del Canale di televendite hai comprato lo sai solo tu' });
  for (const u of togli) {
    if (typeof u !== 'string' || !db.prepare('SELECT 1 FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').get(u, r.voce_uid)) {
      motivi.push({ codice: 'a', testo: 'un effetto che la proposta toglie non è più sulla voce: la proposta è superata' });
      break;
    }
  }
  return motivi;
}

/** Due proposte della stessa voce toccano la stessa cosa: un effetto da togliere in comune, o tipo o collegamento diversi. */
function siToccano(x: RigaAperta, y: RigaAperta): boolean {
  const tx = leggiJson(x.togli_json), ty = leggiJson(y.togli_json);
  if (!Array.isArray(tx) || !Array.isArray(ty) || tx.some((u) => ty.includes(u))) return true;
  if (x.tipo_proposto !== null && y.tipo_proposto !== null && x.tipo_proposto !== y.tipo_proposto) return true;
  const rx = x.riferimento_tipo && x.riferimento_chiave ? `${x.riferimento_tipo}:${x.riferimento_chiave}` : null;
  const ry = y.riferimento_tipo && y.riferimento_chiave ? `${y.riferimento_tipo}:${y.riferimento_chiave}` : null;
  return rx !== null && ry !== null && rx !== ry;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({ migrazione: 302, decisione: 'L13-23', richiesta: DECISIONE, esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export const migration302: Migration = {
  id: 302,
  name: 'decisione_23_proposte_aperte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['proposta_conversione_voce', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 302, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const aperte = db.prepare(`SELECT p.id, p.voce_uid, p.lotto, p.tipo_proposto, p.riferimento_tipo, p.riferimento_chiave, p.effetti_json, p.togli_json,
        p.certezza, v.data, v.azione
      FROM main.proposta_conversione_voce p JOIN main.voce_giornata v ON v.uid = p.voce_uid WHERE p.stato = 'aperta' ORDER BY p.id`).all() as RigaAperta[];
    const letture238 = impronteDiLettura238();
    const partite = tabellePartiteConVoce(db);
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();

    // ---- i motivi di ogni proposta: (a) e (b) propri, (c) della voce
    const perVoce = new Map<string, RigaAperta[]>();
    for (const r of aperte) perVoce.set(r.voce_uid, [...(perVoce.get(r.voce_uid) ?? []), r]);
    const motivi = new Map<string, Motivo[]>();
    for (const r of aperte) motivi.set(r.id, motiviDellaProposta(db, r, letture238));
    for (const [uid, righe] of perVoce) {
      let c: Motivo | null = null;
      if (partite === null) c = { codice: 'c', testo: 'le partite non sono leggibili (schema delle partite non attaccato): non si può escludere che la voce sia già registrata' };
      else {
        const citata = partite.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(uid));
        if (citata.length) {
          const quante = new Set<number>();
          for (const t of citata) {
            const conPartita = (db.prepare(`PRAGMA utente.table_info("${t}")`).all() as Array<{ name: string }>).some((col) => col.name === 'partita_id');
            if (conPartita) for (const id of db.prepare(`SELECT DISTINCT partita_id FROM utente."${t}" WHERE voce_uid = ?`).pluck().all(uid) as number[]) quante.add(id);
          }
          const cosa = [...new Set(citata.map((t) => COSA_REGISTRA[t] ?? `ci sono dati registrati (${t})`))].join('; ');
          const dove = quante.size === 0 ? 'nelle partite' : quante.size === 1 ? 'in una partita' : `in ${quante.size} partite`;
          c = { codice: 'c', testo: `la voce è già registrata ${dove} (${cosa}): applicarla cambierebbe ciò che hai già segnato` };
        }
      }
      if (c) for (const r of righe) motivi.get(r.id)!.push(c);
      // una proposta certa che tocca la stessa cosa di una che resta aperta resta anche lei, con il motivo dell'altra
      for (const r of righe) {
        if (motivi.get(r.id)!.length) continue;
        const altra = righe.find((o) => o.id !== r.id && motivi.get(o.id)!.length > 0 && siToccano(r, o));
        if (altra) {
          const m = motivi.get(altra.id)![0]!;
          motivi.get(r.id)!.push({ codice: m.codice, testo: `tocca la stessa cosa di un’altra proposta della voce che resta da decidere (${altra.id}: ${m.testo})` });
        }
      }
    }

    // ---- l'applicazione, voce per voce, con la funzione della pagina
    const daApplicare = new Map<string, RigaAperta[]>();
    for (const [uid, righe] of perVoce) {
      const si = righe.filter((r) => motivi.get(r.id)!.length === 0);
      if (si.length) daApplicare.set(uid, si);
    }
    const vociDaApplicare = new Set(daApplicare.keys());
    const partitePrima = partite ? improntaPartite(db) : null;
    const altrePrima = improntaAltreVoci(db, vociDaApplicare);
    const statoDi = (id: string): string | undefined => db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(id) as string | undefined;
    const rigaProposta = db.prepare('SELECT * FROM main.proposta_conversione_voce WHERE id = ?');
    const lasciatePrima = new Map<string, string>();
    for (const r of aperte) if (motivi.get(r.id)!.length) lasciatePrima.set(r.id, JSON.stringify(rigaProposta.get(r.id)));
    const applicate: Array<{ id: string; voce: string; giorno: string; lotto: string; esito: unknown }> = [];
    const vociToccate = new Set<string>();
    let rifiutate = 0;
    let senzaConnessione = 0;
    for (const [uid, righe] of daApplicare) {
      const giorno = righe[0]!.data;
      if (!stessaConnessione) { senzaConnessione += righe.length; continue; }
      const primaDelGiro = improntaVoce238(db, uid);
      try {
        const esiti = db.transaction(() => righe.map((r) => {
          const dto = elencaProposteConversione({ da: giorno, a: giorno, stato: 'aperta' }).find((d) => d.id === r.id);
          if (!dto) throw new Error(`proposta ${r.id} non trovata fra le aperte`);
          if (!dto.leggibile) throw new Error(`proposta ${r.id} illeggibile: ${dto.problema ?? ''}`);
          applicaPropostaConversione(r.id, { revisionePropostaAttesa: dto.revisione });
          if (statoDi(r.id) !== 'applicata') throw new Error(`proposta ${r.id} non risulta applicata`);
          const esito = db.prepare('SELECT esito_json FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(r.id) as string | null;
          return { id: r.id, voce: uid, giorno, lotto: r.lotto, esito: esito === null ? null : JSON.parse(esito) as unknown };
        }))();
        applicate.push(...esiti);
        vociToccate.add(uid);
      } catch (e) {
        const x = e as { code?: unknown; message?: unknown };
        const testo = `le verifiche della voce l’hanno rifiutata (${typeof x.code === 'string' ? `${x.code}: ` : ''}${typeof x.message === 'string' ? x.message : String(e)}): va rivista`;
        for (const r of righe) { motivi.get(r.id)!.push({ codice: 'a', testo }); lasciatePrima.set(r.id, JSON.stringify(rigaProposta.get(r.id))); }
        rifiutate += righe.length;
        // il punto di ripristino ha riportato la voce com'era
        if (improntaVoce238(db, uid) !== primaDelGiro) errore(`la voce ${uid}, rifiutata, non è tornata com'era`);
      }
    }

    // ---- controlli: partite identiche; voci senza proposte applicate identiche; proposte lasciate identiche
    if (partitePrima !== null && improntaPartite(db) !== partitePrima) errore('lo schema delle partite è cambiato');
    if (improntaAltreVoci(db, vociDaApplicare) !== altrePrima) errore('una voce senza proposte da applicare è cambiata');
    for (const uid of vociDaApplicare) {
      if (vociToccate.has(uid)) continue;
      for (const r of daApplicare.get(uid)!) if (statoDi(r.id) !== 'aperta') errore(`la proposta ${r.id} non applicata non è più aperta`);
    }
    for (const [id, prima] of lasciatePrima) if (JSON.stringify(rigaProposta.get(id)) !== prima) errore(`la proposta ${id}, lasciata, è cambiata`);

    // ---- l'audit: ogni proposta lasciata con il suo motivo in parole chiare
    const lasciate = aperte.filter((r) => statoDi(r.id) === 'aperta').map((r) => {
      const ms: Array<{ codice: string; testo: string }> = motivi.get(r.id)!.length ? motivi.get(r.id)!
        : [{ codice: 'connessione', testo: 'la migrazione non usa la connessione dei servizi: in questo giro non si è applicato nulla' }];
      return { id: r.id, voce: r.voce_uid, giorno: r.data, voceTesto: r.azione, lotto: r.lotto, periodoValidato: nelPeriodoValidato(r.data), motivo: ms[0]!.codice, motivi: ms };
    });
    const conta = <T>(xs: T[], k: (x: T) => string): Record<string, number> => xs.reduce<Record<string, number>>((o, x) => { const c = k(x); o[c] = (o[c] ?? 0) + 1; return o; }, {});
    const conMotivo = (codice: Codice): number => lasciate.filter((l) => l.motivi.some((m) => m.codice === codice)).length;
    const conteggi = {
      aperteAllInizio: aperte.length, aperteNelPeriodoValidato: aperte.filter((r) => nelPeriodoValidato(r.data)).length,
      applicate: applicate.length, applicateNelPeriodoValidato: applicate.filter((a) => nelPeriodoValidato(a.giorno)).length, vociToccate: vociToccate.size,
      applicatePerLotto: conta(applicate, (a) => a.lotto),
      lasciate: lasciate.length, lasciatePerMotivoPrincipale: conta(lasciate, (l) => l.motivo),
      lasciateConIlMotivo: { a: conMotivo('a'), b: conMotivo('b'), c: conMotivo('c') },
      lasciatePerPeriodoELotto: conta(lasciate, (l) => `${l.periodoValidato ? 'periodo validato' : 'fuori periodo'} · ${l.lotto} · ${l.motivo}`),
      rifiutateDalleVerifiche: rifiutate, nonApplicatePerConnessione: senzaConnessione,
    };
    const legenda = {
      a: 'correzione incerta («probabile» o «da verificare»), o non più certa (voce cambiata, proposta superata, illeggibile o rifiutata dalle verifiche)',
      b: 'dipende da una scelta che solo tu conosci (dati da completare, valore da scegliere, quale set delle televendite)',
      c: 'cambierebbe ciò che è già registrato nelle partite (voce spuntata o con dati registrati)',
    };
    scriviAudit(db, { conteggi, legenda, schemaPartite: partite === null ? 'non attaccato' : { tabelleConVoce: partite }, stessaConnessione, applicate, lasciate }, applicate.length > 0);
    logger.info({ migrazione: 302, ...conteggi }, 'decisione 23: proposte aperte applicate dove non serve una decisione dell’utente');
  },
};
