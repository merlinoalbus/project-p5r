// ============================================================
// Migrazione 318 — Richieste dei Memento dalla guida (le domande 1-5 dell'audit 310) e l'ingresso nei Memento a un solo valore
// ============================================================
//
// L13, ondata 9, lotto O9-1. Risposte dell'utente del 2026-10-31: «il 29 viene sbloccato e diventa gestibile a partire dal 30. nessuna
// incongruenza. per i punti dal 2 al 5 devi verificare nella guida e attenerti a quanto riportato su allgamestaff.it.» e «Ingresso nei Memento.
// Verifica la data nelle guide online.». Chiude le cinque domande `daDecidere` dell'audit `audit-310-richieste-memento` (che non si riscrive).
//
// Che cosa fa, ogni scrittura sul valore letto il 2026-10-31 sulla copia portata alla 317 (una riga diversa è dell'utente o è già cambiata:
// si salta e l'audit lo dice):
//   (1) «Un intruso a Yongen-Jaya»: la voce del 29 agosto la sblocca, la data la rende gestibile dal 30 («nessuna incongruenza»): alle
//       condizioni [dal 30/8] si aggiunge «Sblocco ricevuto», nella forma delle altre Richieste della 310; la voce resta al 29;
//   (2) «I vincenti non imbrogliano»: la Richiesta chiedeva per completarla il Palazzo di Okumura e il rango 1 della Torre chiedeva la Richiesta
//       completata (giro chiuso). La guida: alla prima visita gli attacchi mancano e si viene espulsi, «per affrontarlo davvero serve prima un
//       legame con Shinya Oda»; il Confidente si avvia «solo dopo aver portato avanti la richiesta». Il fatto nuovo `vincenti-prima-visita`
//       (`EVENTI_STORIA`, come i fatti della 090) lo dà la voce del 6 settembre «Ombra Nejima, boss invincibile con ritirata automatica»; il
//       rango 1 della Torre chiede quel fatto invece della Richiesta (nelle due tabelle); il completamento chiede anche il rango 1 della Torre;
//       la sala giochi di Akihabara (luogo dell'incontro del 19 settembre) chiedeva la Richiesta completata: chiede la prima visita; l'attività
//       Gun About, che chiede già il rango 1, perde la Richiesta completata (il rango 1 la comprendeva in un giro);
//   (3) «L'idol e l'unicorno» e «Falsità in scena»: `disponibile_dal` in prosa («Il giorno dopo aver completato il Palazzo finale…») si svuota:
//       la condizione è lo sblocco dalle voci del 28 e del 29 gennaio, che vengono dopo il Corridoio del Crepuscolo (26/1). Il Corridoio non è
//       un dato della partita: nelle note di L'idol la frase della guida, nessuna condizione inventata;
//   (4) la voce del 29 gennaio «Il finto spettacolo dell'uomo» è «Falsità in scena» (le due Richieste finali del Da'at sono solo queste due):
//       le due proposte aperte (collegamento e sblocco) si applicano con la funzione della pagina «Da completare», come la 310;
//   (5) «Un bullo che abbaia e morde»: «Disponibile dal 9 maggio. Non richiede un input di avvio»: la condizione [dal 9/5] lo dice già; la
//       proposta di dare lo sblocco alla voce del 9 maggio (spuntata nella partita 1) si chiude come superata, la voce non si tocca;
//   (6) ingresso nei Memento: il 7 maggio (allgamestaff e Samurai Gamers). L'unico dato col 9 era la finestra dei Memento (`dungeon`, scritta
//       dalla 308) e la sua trascrizione storica nel blocco `finestre-dungeon` (letta ancora dalla conversione delle condizioni): passano al 7.
//       Tutti gli altri dati sono già al 7: l'audit li elenca col valore letto.
// Le partite non si scrivono mai: lo schema `utente` deve risultare identico (impronta di ogni riga), o la migrazione si annulla. Idempotente:
// la seconda volta non trova niente da fare e non scrive. Audit in `dati_guida.audit-318-richieste-memento-guida`.
// ============================================================

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { chiudiProposta, convertiVoce, tabellePartiteConVoce } from './fbisOndata5.js';
import { improntaVoce238 } from './238_proposte_conversione_l13_4b.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, normalizzaRequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = 'audit-318-richieste-memento-guida';
const LOTTO = 'O9-1';
const RICHIESTA = '2026-10-31: «il 29 viene sbloccato e diventa gestibile a partire dal 30. nessuna incongruenza. per i punti dal 2 al 5 devi verificare nella guida e attenerti a quanto riportato su allgamestaff.it.» e «Ingresso nei Memento. Verifica la data nelle guide online.» (L13, ondata 9, lotto O9-1)';
const GUIDA = 'https://www.allgamestaff.it/persona-5-royal/';
const FONTI = {
  richieste: `${GUIDA}richieste-nei-memento/`,
  shinya: `${GUIDA}guida-rango-confidente-di-shinya-torre/`,
  daat: `${GUIDA}dedalo-di-daat/`,
  settimana39: `${GUIDA}soluzione-settimana-39/`,
  settimana5: `${GUIDA}soluzione-settimana-5/`,
  settimana4: `${GUIDA}soluzione-settimana-4/`,
  qimranut: `${GUIDA}dedalo-di-qimranut/`,
  samurai: 'https://samurai-gamers.com/persona-5/p5r-may-walkthrough-second-edition',
} as const;
const errore = (motivo: string): never => { throw new Error(`318: ${motivo}; nessuna modifica applicata.`); };
type Esito = { punto: number; chiave: string; esito: string; prima?: unknown; dopo?: unknown };
type ValoreSql = string | number | null;
const j = (v: unknown) => JSON.stringify(v);

// ---- i dati letti il 2026-10-31 (copia portata alla 317) ----

const EVENTO = 'vincenti-prima-visita';
const CONDIZIONE_EVENTO = { tipo: 'evento', evento: EVENTO } as const;
const VINCENTI = 'i-vincenti-non-imbrogliano';
const RICHIESTA_COMPLETATA = { tipo: 'richiesta', richiesta: VINCENTI } as const;

type ColonnaRichiesta = 'condizioni_json' | 'completamento_condizioni_json' | 'disponibile_dal' | 'note';
/** Le Richieste: per ogni colonna il valore letto e quello nuovo (le colonne di condizioni come elenchi, il resto come testo). */
const RICHIESTE: ReadonlyArray<{ punto: number; chiave: string; motivo: string; campi: Partial<Record<ColonnaRichiesta, { prima: unknown; dopo: unknown }>> }> = [
  { punto: 1, chiave: 'un-intruso-a-yongen-jaya', motivo: 'sbloccata dalla voce del 29/8, gestibile dal 30/8 (risposta dell’utente: «nessuna incongruenza»)', campi: {
    condizioni_json: { prima: [{ tipo: 'data', dal: '08-30' }], dopo: [{ tipo: 'data', dal: '08-30' }, { tipo: 'sblocco', bersaglio: 'richiesta', chiave: 'un-intruso-a-yongen-jaya' }] } } },
  { punto: 2, chiave: VINCENTI, motivo: 'per completarla serve il legame con Shinya (guida); il legame non chiede più la Richiesta completata ma la prima visita', campi: {
    completamento_condizioni_json: { prima: [{ tipo: 'palazzo', dungeon: 'okumura' }], dopo: [{ tipo: 'palazzo', dungeon: 'okumura' }, { tipo: 'confidente', confidente: 'shinya', rango: 1 }] } } },
  { punto: 3, chiave: 'lidol-e-lunicorno', motivo: '«dopo il Palazzo finale» non si può leggere come Palazzo di Maruki concluso (3/2, dopo la scadenza dell’1/2): vale lo sblocco dalla voce del 28/1, dopo il Corridoio del Crepuscolo (26/1); il requisito del Corridoio della pagina del Da’at nelle note', campi: {
    disponibile_dal: { prima: 'Il giorno dopo aver completato il Palazzo finale (Maruki); esclusiva terzo semestre', dopo: '' },
    note: { prima: "Difficoltà S. Non è un vero combattimento: bisogna colpire l'Unicorno con un attacco di Maledizione per avviare una Rapina, poi scegliere in ordine: 'E alla tua famiglia non pensi?' -> 'Non parli con tuo figlio?' -> 'Forse tuo figlio lo pensa.' Se 'Falsità in scena' si attiva lo stesso giorno, il gioco fa partire prima questa.",
      dopo: "Difficoltà S. Non è un vero combattimento: bisogna colpire l'Unicorno con un attacco di Maledizione per avviare una Rapina, poi scegliere in ordine: 'E alla tua famiglia non pensi?' -> 'Non parli con tuo figlio?' -> 'Forse tuo figlio lo pensa.' Se 'Falsità in scena' si attiva lo stesso giorno, il gioco fa partire prima questa. Dalla guida (Dedalo di Da'at): serve essersi infiltrati nel Corridoio del Crepuscolo del Palazzo di Maruki." } } },
  { punto: 3, chiave: 'falsita-in-scena', motivo: 'come L’idol e l’unicorno: vale lo sblocco dalla voce del 29/1 (punto 4); la pagina del Da’at non le dà requisiti', campi: {
    disponibile_dal: { prima: 'Il giorno dopo aver completato il Palazzo finale (Maruki); esclusiva terzo semestre', dopo: '' } } },
];
const COLONNE_RICHIESTA: ReadonlySet<string> = new Set<ColonnaRichiesta>(['condizioni_json', 'completamento_condizioni_json', 'disponibile_dal', 'note']);
const DI_CONDIZIONI: ReadonlySet<string> = new Set(['condizioni_json', 'completamento_condizioni_json']);

/** Il requisito del rango 1 della Torre, letto uguale nelle due tabelle. */
const TORRE = { confidente: 'shinya', rango: 1, tipo: 'richiesta', dati: j({ richiesta: VINCENTI }), testo: 'Completare la richiesta dei Mementos "I vincenti non imbrogliano"' };
const TABELLE_REQUISITI = ['confidente_requisito', 'confidente_requisito_guida'] as const;

/** Le condizioni di luogo e attività della sala giochi di Akihabara che chiedevano la Richiesta completata. */
const SALA_GIOCHI: ReadonlyArray<{ tabella: 'luogo' | 'attivita'; chiave: string; prima: unknown[]; dopo: unknown[]; perche: string }> = [
  { tabella: 'luogo', chiave: 'akihabara/sala-giochi-akihabara', prima: [RICHIESTA_COMPLETATA, { tipo: 'data', dal: '09-04' }], dopo: [CONDIZIONE_EVENTO, { tipo: 'data', dal: '09-04' }],
    perche: 'il rango 1 si fa qui il 19/9 («Sala giochi ad Akihabara»), prima di completare la Richiesta (6/11): la sala chiede la prima visita, non la Richiesta completata' },
  { tabella: 'attivita', chiave: 'sala-giochi-gun-about-akihabara', prima: [{ tipo: 'confidente', confidente: 'shinya', rango: 1 }, { tipo: 'data', dal: '09-04' }, RICHIESTA_COMPLETATA], dopo: [{ tipo: 'confidente', confidente: 'shinya', rango: 1 }, { tipo: 'data', dal: '09-04' }],
    perche: 'chiede già il rango 1 della Torre, che ora viene prima della Richiesta completata: la Richiesta completata restava solo come giro' },
];

/** La voce del 6 settembre che dà la prima visita. */
const VOCE_PRIMA_VISITA = { uid: 'a4ff7e1957e2fae3b3c4a0f83a021dd1', data: '09-06', azione: 'Mementos - Akzeriyyuth (nuova area): Ombra Nejima, boss invincibile con ritirata automatica' };

/** Le proposte della voce del 29/1 (punto 4), come lette. */
const PROPOSTE_FALSITA = [
  { id: 'L13-4b-2890a52c-01-a-riferimento-mancante', attesa: { tipo_proposto: null, riferimento_tipo: 'richiesta', riferimento_chiave: 'falsita-in-scena', effetti_json: '[]', togli_json: '[]' } },
  { id: 'L13-4b-2890a52c-02-b-richiesta', attesa: { tipo_proposto: null, riferimento_tipo: null, riferimento_chiave: null,
    effetti_json: j([{ effetto: { tipo: 'sblocco', bersaglio: 'richiesta', chiave: 'falsita-in-scena' }, completa: [], scelte: null }]), togli_json: '[]' } },
].map((p) => ({ ...p, voce: '2890a52c986bd3aadcdb2a30faeb1530', data: '01-29', azione: "Nuova richiesta Mementos: Il finto spettacolo dell'uomo" }));

/** La proposta della voce del 9/5 (punto 5), superata dalla condizione di data. */
const PROPOSTA_BULLO = { id: 'L13-4b-84750a56-01-b-richiesta', voce: '84750a563733527a0c65acbdcb7c5d2b',
  effetti: j([{ effetto: { tipo: 'sblocco', bersaglio: 'richiesta', chiave: 'un-bullo-che-abbaia-e-morde' }, completa: [], scelte: null }]) };

/** (6) L'ingresso: la finestra e la sua trascrizione storica. */
const INGRESSO = { dungeon: 'mementos', prima: '05-09', dopo: '05-07', testoPrima: '9 maggio (prima esplorazione con Morgana)', testoDopo: '7 maggio (prima esplorazione con Morgana)' };

/** Le citazioni delle fonti (lette il 2026-10-31). */
const CITAZIONI = {
  1: { fonte: FONTI.richieste, frase: 'la pagina delle Richieste non dà la data di «Un intruso a Yongen-Jaya» (solo l’elenco delle richieste obbligatorie per il Confidente della Luna); decide la risposta dell’utente' },
  2: { fonte: [FONTI.richieste, FONTI.shinya], frase: 'Richieste: alla prima visita «tutti gli attacchi mancano», «per affrontarlo davvero serve prima un legame con Shinya Oda (Rango Confidente Torre)»; Shinya: «Possiamo avviare questo Confidente a partire dal 5 SETTEMBRE (Lunedì 9/5)», «ma solo dopo aver portato avanti la richiesta», incontro alla «Sala giochi ad Akihabara», giorno consigliato «19 SETTEMBRE»' },
  3: { fonte: [FONTI.richieste, FONTI.daat, FONTI.settimana39], frase: 'Richieste: L’idol e Falsità «Dopo il Palazzo finale»; Da’at: L’idol richiede di «essersi infiltrati nel Corridoio del Crepuscolo» del Palazzo di Maruki (Piano 13), Falsità (Piano 15) nessun requisito; settimana 39: 26/1 infiltrazione nel Corridoio del Crepuscolo, 27/1 arriva «Falsità in scena», 28/1 «L’idol e l’unicorno», «l’ultima del gioco»' },
  4: { fonte: [FONTI.daat, FONTI.richieste], frase: 'il titolo «Il finto spettacolo dell’uomo» non compare in nessuna delle due pagine; le richieste finali del Da’at sono solo «L’idol e l’unicorno» e «Falsità in scena»; Falsità: «bisogna uscire e rientrare in classe», altrimenti si attiva automaticamente il giorno successivo' },
  5: { fonte: [FONTI.richieste, FONTI.settimana5], frase: 'Richieste: «Un bullo che abbaia e morde» disponibile dal 9 maggio, nessun input di avvio («–»); settimana 5: il 9/5 la prima Richiesta dei Memento arriva con l’aprirsi della giornata' },
  6: { fonte: [FONTI.qimranut, FONTI.settimana4, FONTI.samurai], frase: 'Qimranut: «Il 7 MAGGIO (Sabato 5/07) Morgana ci porterà nel Sottopasso»; settimana 4: 7/5 prima visita, Qimranut Area 1 (Nakanohara); Samurai Gamers (Saturday 5/7): «Mementos Mission Request: “Beware the Clingy Ex-boyfriend!” now available», «Path of Qimranut – Area 1»' },
} as const;

// ---- letture ----

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** Il valore dell'elenco come lo salva il database. Le condizioni nuove devono essere nella forma dell'app (`normalizzaCondizioniSpillo`). */
function inSql(colonna: string, v: unknown, nuovo: boolean): ValoreSql {
  if (v === null) return null;
  if (DI_CONDIZIONI.has(colonna)) {
    if (!Array.isArray(v)) errore(`il valore di ${colonna} non è un elenco`);
    const testo = j(v);
    if (nuovo && j(normalizzaCondizioniSpillo(v as unknown[])) !== testo) errore(`condizioni nuove di ${colonna} non nella forma dell'app`);
    return testo;
  }
  if (typeof v === 'string') return v;
  return errore(`il valore di ${colonna} non è un testo`);
}

// ---- (1)-(3) le Richieste ----

function richieste(db: AppDatabase): Esito[] {
  return RICHIESTE.map((r): Esito => {
    const colonne = Object.keys(r.campi) as ColonnaRichiesta[];
    for (const c of colonne) if (!COLONNE_RICHIESTA.has(c)) errore(`colonna «${c}» non prevista`);
    const chiave = `richiesta:${r.chiave}`;
    const riga = db.prepare(`SELECT ${colonne.join(', ')} FROM main.richiesta WHERE chiave = ?`).get(r.chiave) as Record<string, ValoreSql> | undefined;
    if (!riga) return { punto: r.punto, chiave, esito: 'Richiesta assente: niente da fare' };
    const prima: Record<string, ValoreSql> = {}, dopo: Record<string, ValoreSql> = {}, diversi: Record<string, { atteso: ValoreSql; letto: ValoreSql }> = {};
    for (const c of colonne) {
      const campo = r.campi[c]!;
      const vPrima = inSql(c, campo.prima, false), vDopo = inSql(c, campo.dopo, true);
      const letto = riga[c] ?? null;
      if (letto === vDopo) continue;
      if (letto === vPrima) { prima[c] = vPrima; dopo[c] = vDopo; continue; }
      diversi[c] = { atteso: vPrima, letto };
    }
    if (Object.keys(diversi).length) return { punto: r.punto, chiave, esito: 'saltata: campi diversi da quelli letti (forse corretti dall’utente), riga lasciata com’era', prima: diversi };
    const daScrivere = Object.keys(dopo);
    if (!daScrivere.length) return { punto: r.punto, chiave, esito: 'già applicata' };
    if (db.prepare(`UPDATE main.richiesta SET ${daScrivere.map((c) => `${c} = ?`).join(', ')} WHERE chiave = ? AND ${daScrivere.map((c) => `${c} IS ?`).join(' AND ')}`)
      .run(...daScrivere.map((c) => dopo[c]), r.chiave, ...daScrivere.map((c) => prima[c])).changes !== 1) errore(`la Richiesta ${r.chiave} non è stata scritta`);
    return { punto: r.punto, chiave, esito: `scritta (${r.motivo})`, prima, dopo };
  });
}

// ---- (2) la Torre, la sala giochi, la voce della prima visita ----

/** Il requisito del rango 1 della Torre: la Richiesta completata diventa la prima visita, nelle due tabelle, sulla riga letta. */
function torre(db: AppDatabase): Esito[] {
  const nuovo = normalizzaRequisitoSpillo(CONDIZIONE_EVENTO) ?? errore(`l'evento «${EVENTO}» non è del vocabolario`);
  const testo = descriviRequisitoSpillo(nuovo);
  const dati = j({ evento: EVENTO });
  return TABELLE_REQUISITI.map((t): Esito => {
    const chiave = `${t}:${TORRE.confidente}:${TORRE.rango}`;
    if (!esisteTabella(db, t)) return { punto: 2, chiave, esito: 'tabella assente: niente da fare' };
    const righe = db.prepare(`SELECT indice, tipo, dati_json, testo FROM main.${t} WHERE confidente_chiave = ? AND rango = ? ORDER BY indice`).all(TORRE.confidente, TORRE.rango) as Array<{ indice: number; tipo: string; dati_json: string; testo: string }>;
    const vecchie = righe.filter((r) => r.tipo === TORRE.tipo && r.dati_json === TORRE.dati);
    if (!vecchie.length && righe.some((r) => r.tipo === 'evento' && r.dati_json === dati)) return { punto: 2, chiave, esito: 'già con la prima visita' };
    if (vecchie.length !== 1 || vecchie[0]!.testo !== TORRE.testo) return { punto: 2, chiave, esito: 'requisito diverso da quello letto (cambiato dall’utente o già toccato): non toccato', prima: righe };
    const v = vecchie[0]!;
    if (db.prepare(`UPDATE main.${t} SET tipo = 'evento', dati_json = ?, testo = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ? AND tipo = ? AND dati_json = ? AND testo = ?`)
      .run(dati, testo, TORRE.confidente, TORRE.rango, v.indice, TORRE.tipo, TORRE.dati, TORRE.testo).changes !== 1) errore(`il requisito della Torre in ${t} non si aggiorna`);
    return { punto: 2, chiave, esito: 'la Richiesta completata diventa la prima visita (indice invariato)', prima: v, dopo: { indice: v.indice, tipo: 'evento', dati_json: dati, testo } };
  });
}

function salaGiochi(db: AppDatabase): Esito[] {
  return SALA_GIOCHI.map((s): Esito => {
    const chiave = `${s.tabella}:${s.chiave}`;
    const prima = j(s.prima), dopo = j(s.dopo);
    if (j(normalizzaCondizioniSpillo(s.dopo)) !== dopo) errore(`condizioni nuove di ${chiave} non nella forma dell'app`);
    const letto = db.prepare(`SELECT condizioni_json FROM main.${s.tabella} WHERE chiave = ?`).pluck().get(s.chiave) as string | null | undefined;
    if (letto === undefined) return { punto: 2, chiave, esito: 'riga assente: niente da fare' };
    if (letto === dopo) return { punto: 2, chiave, esito: 'già applicata' };
    if (letto !== prima) return { punto: 2, chiave, esito: 'condizioni diverse da quelle lette (forse corrette dall’utente): non toccate', prima: letto };
    if (db.prepare(`UPDATE main.${s.tabella} SET condizioni_json = ? WHERE chiave = ? AND condizioni_json = ?`).run(dopo, s.chiave, prima).changes !== 1) errore(`${chiave} non si aggiorna`);
    return { punto: 2, chiave, esito: `scritta (${s.perche})`, prima, dopo };
  });
}

function vocePrimaVisita(db: AppDatabase, partite: string[] | null, adesso: string): Esito {
  const e = convertiVoce(db, {
    ...VOCE_PRIMA_VISITA, attesi: [], togli: [], lotto: LOTTO,
    aggiungi: [{ seme: `${LOTTO}:318:storia:${EVENTO}:${VOCE_PRIMA_VISITA.uid}`, effetto: { tipo: 'storia', evento: EVENTO } }],
    motivo: `la prima visita a Nejima, che fallisce da copione, è il fatto che il rango 1 della Torre chiede (${FONTI.richieste}; ${FONTI.shinya})`,
  }, partite, adesso);
  return { punto: 2, ...e };
}

// ---- (4) le proposte della voce del 29/1, come la 310 ----

function impronteDiLettura238(): Record<string, { data: string; impronta: string }> | null {
  for (const p of [path.join(QUI, 'dati', '238-voci-L13-4b.json'), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', '238-voci-L13-4b.json')]) {
    if (!fs.existsSync(p)) continue;
    const v = JSON.parse(fs.readFileSync(p, 'utf8')) as { lotto?: unknown; voci?: unknown };
    if (v.lotto !== 'L13-4b' || !v.voci || typeof v.voci !== 'object') errore('il file delle voci della 238 non è quello atteso');
    return v.voci as Record<string, { data: string; impronta: string }>;
  }
  return null;
}

type PropostaLetta = typeof PROPOSTE_FALSITA[number];

/** Perché la proposta non si applica (null = si può). Solo letture; le stesse verifiche della 310. */
function motivoPerSaltare(db: AppDatabase, p: PropostaLetta, partite: string[] | null, letture: Record<string, { data: string; impronta: string }> | null): string | null {
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

function proposteFalsita(db: AppDatabase, partite: string[] | null): Esito[] {
  if (!esisteTabella(db, 'proposta_conversione_voce')) return PROPOSTE_FALSITA.map((p) => ({ punto: 4, chiave: p.id, esito: 'tabella delle proposte assente: niente da fare' }));
  const gia = PROPOSTE_FALSITA.filter((p) => db.prepare("SELECT 1 FROM main.proposta_conversione_voce WHERE id = ? AND stato = 'applicata'").get(p.id));
  const esiti: Esito[] = gia.map((p) => ({ punto: 4, chiave: p.id, esito: 'già applicata' }));
  const restano = PROPOSTE_FALSITA.filter((p) => !gia.includes(p));
  if (!restano.length) return esiti;
  // la voce si tratta intera: se una delle sue proposte non si può applicare, nessuna
  const letture = impronteDiLettura238();
  const motivi = restano.map((p) => motivoPerSaltare(db, p, partite, letture));
  const primo = motivi.find((m) => m !== null);
  if (primo) return [...esiti, ...restano.map((p, i): Esito => ({ punto: 4, chiave: p.id, esito: `saltata: ${motivi[i] ?? `un'altra proposta della voce non si applica (${primo})`}` }))];
  const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
  if (!stessaConnessione) return [...esiti, ...restano.map((p): Esito => ({ punto: 4, chiave: p.id, esito: 'saltata: la migrazione non gira sulla connessione dei servizi' }))];
  // come la 310: se le verifiche della pagina rifiutano la voce, le sue proposte tornano com'erano (punto di salvataggio) e l'audit dice perché
  try {
    const fatte = db.transaction(() => restano.map((p): Esito => {
      const dto = elencaProposteConversione({ da: p.data, a: p.data, stato: 'aperta' }).find((d) => d.id === p.id);
      if (!dto) throw new Error(`proposta ${p.id} non trovata fra le aperte`);
      if (!dto.leggibile) throw new Error(`proposta ${p.id} illeggibile: ${dto.problema ?? ''}`);
      applicaPropostaConversione(p.id, { revisionePropostaAttesa: dto.revisione });
      if (db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(p.id) !== 'applicata') throw new Error(`proposta ${p.id} non risulta applicata`);
      const esito = db.prepare('SELECT esito_json FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(p.id) as string | null;
      return { punto: 4, chiave: p.id, esito: 'applicata («Il finto spettacolo dell’uomo» è «Falsità in scena»)', dopo: esito === null ? null : JSON.parse(esito) as unknown };
    }))();
    return [...esiti, ...fatte];
  } catch (e) {
    const x = e as { code?: unknown; message?: unknown };
    const testo = `${typeof x.code === 'string' ? `${x.code}: ` : ''}${typeof x.message === 'string' ? x.message : String(e)}`;
    return [...esiti, ...restano.map((p): Esito => ({ punto: 4, chiave: p.id, esito: `saltata: le verifiche della voce l'hanno rifiutata (${testo})` }))];
  }
}

// ---- (5) la proposta del 9/5 ----

function propostaBullo(db: AppDatabase, adesso: string): Esito {
  const e = chiudiProposta(db, { ...PROPOSTA_BULLO, modo: 'superata', da: null,
    perche: `Migrazione 318 (O9-1): la guida dice «Disponibile dal 9 maggio», senza input di avvio (${FONTI.richieste}); la condizione [dal 9/5] della Richiesta lo dice già. La voce, spuntata in una partita, non si tocca: lo sblocco su una voce già spuntata bloccherebbe la Richiesta in quella partita.` }, adesso);
  return { punto: 5, ...e };
}

// ---- (6) l'ingresso nei Memento ----

function ingresso(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  const r = db.prepare('SELECT finestra_dal, seed_json FROM main.dungeon WHERE chiave = ?').get(INGRESSO.dungeon) as { finestra_dal: string | null; seed_json: string | null } | undefined;
  const chiave = `dungeon:${INGRESSO.dungeon}.finestra_dal`;
  if (!r) esiti.push({ punto: 6, chiave, esito: 'riga assente: niente da fare' });
  else if (r.finestra_dal === INGRESSO.dopo) esiti.push({ punto: 6, chiave, esito: 'già al 7 maggio' });
  else if (r.finestra_dal !== INGRESSO.prima || r.seed_json !== null) esiti.push({ punto: 6, chiave, esito: 'finestra diversa da quella letta (cambiata con «Correggi la scheda»): non toccata', prima: r.finestra_dal });
  else {
    if (db.prepare('UPDATE main.dungeon SET finestra_dal = ? WHERE chiave = ? AND finestra_dal = ? AND seed_json IS NULL').run(INGRESSO.dopo, INGRESSO.dungeon, INGRESSO.prima).changes !== 1) errore('la finestra dei Memento non si aggiorna');
    esiti.push({ punto: 6, chiave, esito: 'scritta (l’ingresso della guida)', prima: INGRESSO.prima, dopo: INGRESSO.dopo });
  }
  // la trascrizione storica nel blocco `finestre-dungeon`: solo la voce dei Memento, solo se è quella letta
  const cb = 'dati_guida:finestre-dungeon.mementos';
  const blocco = db.prepare("SELECT json FROM main.dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string | undefined;
  let dati: { finestre?: Array<Record<string, unknown>> } | null;
  try { dati = blocco === undefined ? null : JSON.parse(blocco) as { finestre?: Array<Record<string, unknown>> }; } catch { dati = null; }
  const voci = dati && Array.isArray(dati.finestre) ? dati.finestre.filter((f) => !!f && f.dungeon === INGRESSO.dungeon) : [];
  if (blocco === undefined) esiti.push({ punto: 6, chiave: cb, esito: 'blocco assente: niente da fare' });
  else if (voci.length !== 1) esiti.push({ punto: 6, chiave: cb, esito: `voci dei Memento nel blocco: ${voci.length}, non una: non toccato` });
  else {
    const v = voci[0]!;
    if (v.dal === INGRESSO.dopo && v.testoSblocco === INGRESSO.testoDopo) esiti.push({ punto: 6, chiave: cb, esito: 'già al 7 maggio' });
    else if (v.dal !== INGRESSO.prima || v.testoSblocco !== INGRESSO.testoPrima) esiti.push({ punto: 6, chiave: cb, esito: 'voce diversa da quella letta: non toccata', prima: { dal: v.dal, testoSblocco: v.testoSblocco } });
    else if (esisteTabella(db, 'correzione_dati_guida') && db.prepare("SELECT 1 FROM main.correzione_dati_guida WHERE blocco = 'finestre-dungeon' LIMIT 1").get()) esiti.push({ punto: 6, chiave: cb, esito: 'il blocco ha correzioni dell’utente: non toccato' });
    else {
      v.dal = INGRESSO.dopo; v.testoSblocco = INGRESSO.testoDopo;
      if (db.prepare("UPDATE main.dati_guida SET json = ? WHERE chiave = 'finestre-dungeon' AND json = ?").run(j(dati), blocco).changes !== 1) errore('il blocco delle finestre non si aggiorna');
      esiti.push({ punto: 6, chiave: cb, esito: 'scritta (trascrizione storica, letta dalla conversione delle condizioni)', prima: { dal: INGRESSO.prima, testoSblocco: INGRESSO.testoPrima }, dopo: { dal: INGRESSO.dopo, testoSblocco: INGRESSO.testoDopo } });
    }
  }
  return esiti;
}

/** Gli altri dati che dicono l'ingresso, letti (sola lettura): tutti al 7 maggio. */
function datiDellIngresso(db: AppDatabase): Record<string, unknown> {
  const uno = (sql: string) => { try { return db.prepare(sql).get() ?? null; } catch { return null; } };
  return {
    dedaloQimranut: uno("SELECT condizioni_json, descrizione FROM main.dungeon_area WHERE chiave = 'mementos-01-qimranut'"),
    eventoCalendario: uno('SELECT id, data, titolo FROM main.evento_calendario WHERE id = 25'),
    luogoIngresso: uno("SELECT condizioni_json FROM main.luogo WHERE chiave = 'mementos/ingresso-mementos'"),
    primaRichiesta: uno("SELECT condizioni_json FROM main.richiesta WHERE chiave = 'un-ex-piuttosto-appiccicoso'"),
    vocePrimaVisita: uno("SELECT uid, data, azione FROM main.voce_giornata WHERE uid = 'e7adb0bcac77591a2d811cc5cce4519d'"),
    nonIngresso: 'la sfida di Caroline (Nuova Partita +) «tra il 9 maggio e il 22 dicembre» è un’altra finestra, non l’ingresso: non toccata',
  };
}

// ---- audit ----

function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, j({
      migrazione: 318, lotto: LOTTO, richiesta: RICHIESTA, fonti: FONTI, citazioni: CITAZIONI,
      regola: 'ogni scrittura sul valore letto il 2026-10-31 (righe diverse: saltate e dette); condizioni nella forma dell’app; proposte con la funzione della pagina «Da completare» e le verifiche della 310; le partite non si scrivono mai',
      domande310: {
        1: 'Un intruso a Yongen-Jaya: risolta dall’utente («il 29 viene sbloccato e diventa gestibile a partire dal 30»): condizione di sblocco accanto al «dal 30/8», la voce resta al 29',
        2: 'I vincenti non imbrogliano: giro chiuso tolto col fatto «Prima visita a Nejima» (voce del 6/9); il rango 1 della Torre chiede la prima visita, il completamento chiede il rango 1; sala giochi di Akihabara e Gun About senza la Richiesta completata',
        3: 'L’idol e Falsità: «dopo il Palazzo finale» non è il Palazzo concluso; disponibile_dal svuotato, vale lo sblocco dalle voci del 28/1 e 29/1; il Corridoio del Crepuscolo nelle note di L’idol (non è un dato della partita)',
        4: '«Il finto spettacolo dell’uomo» è «Falsità in scena»: le due proposte applicate. La data della voce resta il 29/1: la soluzione della settimana 39 dà l’arrivo il 27/1 e le due Richieste fatte il 28/1, il Diario le fa il 30/1 (domanda all’utente)',
        5: 'Un bullo che abbaia e morde: la guida conferma «dal 9 maggio» senza input di avvio; la proposta di sblocco chiusa come superata, la voce spuntata non si tocca',
      },
      lasciati: [
        { chiave: 'confidente_requisito shinya 1 (data)', che: 'resta al 4 settembre: lo ha scritto la 182 (fonti Royal, 24/10); la guida italiana e la copia della guida (`confidente_requisito_guida`) dicono 5 settembre. Con la prima visita del 6/9 la data non decide più nulla: domanda all’utente se allinearla', fonte: FONTI.shinya },
        { chiave: 'richiesta i-vincenti-non-imbrogliano (note)', che: 'la frase sul legame con la Torre resta: spiega le due parti del combattimento, la condizione di completamento la rende' },
      ],
      datiDellIngresso: datiDellIngresso(db),
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration318: Migration = {
  id: 318,
  name: 'richieste_memento_e_ingresso_dalla_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['richiesta', 'dati_guida', 'voce_giornata', 'voce_effetto', 'dungeon', 'luogo', 'attivita']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 318, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const partite = tabellePartiteConVoce(db);
    const esiti: Esito[] = [
      ...richieste(db), ...torre(db), ...salaGiochi(db), vocePrimaVisita(db, partite, adesso),
      ...proposteFalsita(db, partite), propostaBullo(db, adesso), ...ingresso(db),
    ];
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const scritto = (e: Esito) => /^(scritta|la Richiesta completata diventa|convertita|applicata|chiusa come)/.test(e.esito);
    const cambiato = esiti.some(scritto);
    const conteggi = { scritte: esiti.filter(scritto).length, saltate: esiti.filter((e) => /^(saltata|requisito diverso|condizioni diverse|finestra diversa|voce diversa)/.test(e.esito)).length };
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti, improntaPartite: partitePrima }, cambiato);
    logger.info({ migrazione: 318, ...conteggi }, 'Richieste dei Memento dalla guida e ingresso nei Memento al 7 maggio');
  },
};
