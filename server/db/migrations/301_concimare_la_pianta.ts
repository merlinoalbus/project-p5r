// ============================================================
// Migrazione 301 — «Concimare la pianta»: un'attività con il concime come esito, che lo consuma (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Censimento F-bis, punto 2: Bionutrienti (Fioraio Rafflesia), Megafertilizzante (Fioraio Sukebe, dal 06-18) e il Set Bionutrienti delle
// televendite servono a concimare la pianta della mansarda, che dà Gentilezza; 19 voci del Diario la davano «a mano» (una Dote fissa) senza
// legame al concime, la voce del 09-28 era senza effetti e il testo del catalogo dei due concimi era sbagliato («Materiale/oggetto costoso di
// uso vario»). Decisione 21 (precisazione): il concime incide sulle Doti, quindi si modella con i tipi dell'app.
//
// Che cosa fa:
//   (1) l'attività `concimare-pianta` (Leblanc, mansarda; non consuma la fascia, voce del 19 aprile) con due esiti scelti alla spunta: «Con i
//       Bionutrienti» (Gentilezza ♪♪, consuma 1 Bionutrienti) e «Con il Megafertilizzante» (Gentilezza ♪♪♪, consuma 1 Megafertilizzante). I
//       valori sono quelli delle voci della guida (le soluzioni settimanali); la pagina delle Doti sociali non li ripete, quindi restano da
//       verificare in gioco, e l'Energia del giardino (Discount Rocinante, anche nel Set Bionutrienti) non ha un valore nella guida: non è un
//       esito (da verificare in gioco, detto nei dettagli). Il concime NON usa `articolo` dell'esito: si è già pagato comprandolo;
//   (2) il testo del catalogo dei due concimi dice a che cosa servono (solo se è ancora quello sbagliato atteso);
//   (3) le voci dopo il 05-31 (06-06 … 01-25, tredici con la Dote fissa più quella del 09-28 senza effetti) si collegano all'attività: la Dote
//       fissa esce (la dà l'esito, un solo punto) ed entra il turno con l'esito del concime che il testo nomina; «Concimare la pianta» senza
//       concime con Gentilezza ♪♪♪ vale il Megafertilizzante (l'unico che dà ♪♪♪), preselezionato e modificabile alla spunta. Le proposte
//       aperte del 09-28 (collegamento e Dote ♪ «da completare») si chiudono come superate;
//   (4) le voci del periodo validato (04-19, 05-05, 05-21) ricevono solo una proposta da approvare riga per riga (collegamento, turno con
//       l'esito, Dote fissa tolta); la proposta «collegamento mancante» di ciascuna si chiude come sostituita.
// Conservativa (vedi `fbisOndata5.ts`). Idempotente. Audit in `dati_guida.audit-301-pianta`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { leggiEsitiAttivita, type EsitiAttivita } from '../../../shared/esitiAttivita.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { FONTE_DOTI, FONTE_NEGOZI, chiudiProposta, convertiVoce, correggiTesto, creaAttivita, nuovaProposta, scriviAuditFbis, tabellePartiteConVoce, type ConversioneVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-301-pianta';
const errore = (motivo: string): never => { throw new Error(`301: ${motivo}; nessuna modifica applicata.`); };
export const CONCIMARE = 'concimare-pianta';
const BIONUTRIENTI = 'materiale/bionutrienti';
const MEGAFERTILIZZANTE = 'materiale/megafertilizzante';

const ESITI: EsitiAttivita = { modo: 'scelta', esiti: [
  { chiave: 'bionutrienti', nome: 'Con i Bionutrienti', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'gentilezza', note: 2 }], premi: null, consuma: [{ oggetto: BIONUTRIENTI, quantita: 1 }] },
  { chiave: 'megafertilizzante', nome: 'Con il Megafertilizzante', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'gentilezza', note: 3 }], premi: null, consuma: [{ oggetto: MEGAFERTILIZZANTE, quantita: 1 }] },
] };
const DETTAGLI = 'Concimare la pianta della mansarda del Leblanc non consuma la fascia. Il concime si compra prima (Bionutrienti al Fioraio Rafflesia, Megafertilizzante al Fioraio Sukebe di Shinjuku) e concimando se ne usa una copia. I valori di Gentilezza (♪♪ i Bionutrienti, ♪♪♪ il Megafertilizzante) vengono dalle soluzioni settimanali della guida e sono da verificare in gioco; l’Energia del giardino (Discount Rocinante e Set Bionutrienti) non ha un valore nella guida: da verificare in gioco.';

const TESTI = [
  { chiave: BIONUTRIENTI, prima: 'Materiale/oggetto costoso di uso vario', dopo: 'Concime per la pianta della mansarda del Leblanc: concimandola si ottiene Gentilezza.' },
  { chiave: MEGAFERTILIZZANTE, prima: 'Materiale', dopo: 'Concime più forte per la pianta della mansarda del Leblanc: concimandola si ottiene più Gentilezza.' },
] as const;

const dote = (note: 2 | 3): EffettoVoce => ({ tipo: 'dote', dote: 'gentilezza', note });
const turno = (esito: 'bionutrienti' | 'megafertilizzante'): EffettoVoce => ({ tipo: 'turno', attivita: CONCIMARE, esito });
const RIF_DOTE = { tipo: 'dote', chiave: 'gentilezza' };
const RIF_ATTIVITA = { tipo: 'attivita', chiave: CONCIMARE };
const SICURO = 'Gentilezza ♪♪♪: la dà solo il Megafertilizzante (preselezionato, modificabile alla spunta)';

/** Le voci dopo il 05-31, come lette il 2026-10-26: uid, giorno, testo, effetto Dote, esito che il testo nomina (o il valore, se non lo nomina). */
const VOCI: ReadonlyArray<{ uid: string; data: string; azione: string; doteUid: string | null; note: 2 | 3 | null; esito: 'bionutrienti' | 'megafertilizzante'; collegataAllaDote: boolean; perche: string }> = [
  { uid: '3fdc072cc7cae8ffc8f4273b56c6392f', data: '06-06', azione: 'Concimare la pianta con i Bionutrienti', doteUid: '9e780eee9fc0950dc903fc66da96e3e0', note: 2, esito: 'bionutrienti', collegataAllaDote: true, perche: 'il testo nomina i Bionutrienti' },
  { uid: 'e5022cc0b94d8321cfe85e5aa62c511b', data: '06-22', azione: 'Concimare la pianta con il Megafertilizzante', doteUid: 'e64e4b628f7571ca89443070823c0ae6', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: '639de7b16cf10953baa086f9c68d81ad', data: '07-08', azione: "Concimare la pianta dell'appartamento con il Megafertilizzante", doteUid: '750f9d5bdb6a91c47e9294915fed1801', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: 'c2d209c98c5d6ffc5911be1dc75d265e', data: '07-24', azione: "Concimare la pianta dell'appartamento con il Megafertilizzante", doteUid: 'bd551dc33fee255c91177f401cdb23c1', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: '653d7e209a0d01354223f3d2fcf7e1e3', data: '08-09', azione: 'Concimare la pianta con il Megafertilizzante', doteUid: '7926e9eac4804b73673140a084f24e68', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: '20a93d312ba45931ae1c1e3b4325e972', data: '08-25', azione: 'Concimare la pianta con il Megafertilizzante', doteUid: 'be023aa1b630cafe87c4eb88d9a45317', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: 'f5dd3312a2057b4d47fb11a4a1aad8b0', data: '09-12', azione: "Concimare la pianta dell'appartamento", doteUid: '1f73d00188822914cfb178ef81ad1a48', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: SICURO },
  { uid: '3467db27e8637da9dea23669d062d0ce', data: '09-28', azione: 'Concimare la pianta con il Megafertilizzante', doteUid: null, note: null, esito: 'megafertilizzante', collegataAllaDote: false, perche: 'il testo nomina il Megafertilizzante; la voce non aveva effetti' },
  { uid: '8bc72d7c35833c766b524dbae08e3a24', data: '10-14', azione: 'Concimare la pianta', doteUid: '96b554595c279cdc62de78d9c000de36', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: SICURO },
  { uid: '8b8d2b431d214e8f7413cf8a2cad82a4', data: '10-30', azione: "Concimare la pianta dell'appartamento", doteUid: 'a7dd9b216e250be8978591d49c9c02b9', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: SICURO },
  { uid: 'dfadbfa8715164c8aa9f524e5d767121', data: '11-18', azione: 'Concimare la pianta con il Megafertilizzante', doteUid: '60c5c62c1a469e1267bf49973c6f8585', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: 'bb900a87e072100c97c4190507bd8edc', data: '12-04', azione: 'Concimare la pianta con il Megafertilizzante', doteUid: '332836992e9eff43992d02f1dcc7b5d9', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: 'il testo nomina il Megafertilizzante' },
  { uid: '4979c2903bad0b4553a0f7450bf4075f', data: '01-10', azione: 'Concimare la pianta (opzionale)', doteUid: '64df6bd0c475f613a81d3fd66630e00f', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: SICURO },
  { uid: 'e43d28126bed4cd991ade8cf756824fb', data: '01-25', azione: "Concimare la pianta dell'appartamento (opzionale)", doteUid: '5dd5d970bf85ed69dabff45d7f6c2b6b', note: 3, esito: 'megafertilizzante', collegataAllaDote: true, perche: SICURO },
];

/** Le voci del periodo validato: solo proposte. */
const VALIDATE: ReadonlyArray<{ uid: string; doteUid: string; esito: 'bionutrienti' | 'megafertilizzante'; perche: string }> = [
  { uid: '65351e206c3f5c6d2e66b0e5f2f80386', doteUid: 'f4020061cb4a0293cd2b2dc21226e738', esito: 'bionutrienti', perche: '«Concimare la pianta con i Bionutrienti»: l’esito dell’attività dà la Gentilezza ♪♪ e consuma una copia; la Dote fissa esce (un solo punto)' },
  { uid: '9f47dd06cb1f4fea917a9df628cc28ce', doteUid: '773f34c6a752486f8c3101bee1935669', esito: 'bionutrienti', perche: '«Concimare la pianta con i Bionutrienti»: l’esito dell’attività dà la Gentilezza ♪♪ e consuma una copia; la Dote fissa esce (un solo punto)' },
  { uid: 'cf4d0fd361116f21f039deb6be353b26', doteUid: '50f3aa3e24530fabb48ebb6f90683771', esito: 'megafertilizzante', perche: '«Concimare la pianta con il Megafertilizzante»: l’esito dell’attività dà la Gentilezza ♪♪♪ e consuma una copia; la Dote fissa esce (un solo punto)' },
];

export const migration301: Migration = {
  id: 301,
  name: 'concimare_la_pianta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'catalogo_oggetto', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 301, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 301 }, 'esiti delle attività assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Array<Esito & { prima?: unknown; dopo?: unknown }> = [];
    // (1) l'attività, con gli esiti riletti validi; i due concimi devono esserci nel catalogo
    const json = JSON.stringify(ESITI);
    if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti della pianta non si rileggono validi');
    const concimi = [BIONUTRIENTI, MEGAFERTILIZZANTE].every((c) => db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(c));
    if (!concimi) esiti.push({ chiave: CONCIMARE, esito: 'concimi assenti dal catalogo: nessuna attività' });
    else esiti.push(creaAttivita(db, { chiave: CONCIMARE, nome: 'Concimare la pianta della mansarda', tipo: 'altro', luogo: 'Yongen-Jaya, Leblanc (mansarda)', quartiere: 'yongen-jaya', sede: 'yongen-jaya/leblanc',
      fascia: 'entrambe', fonte: `${FONTE_DOTI} ; ${FONTE_NEGOZI}`, dettagli: DETTAGLI, condizioni: [], esiti: json }, adesso));
    const attivita = leggiEsitiAttivita(db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').pluck().get(CONCIMARE) as string | null);
    const conAttivita = !!attivita && attivita.esiti.some((e) => e.chiave === 'bionutrienti') && attivita.esiti.some((e) => e.chiave === 'megafertilizzante');
    // (2) il testo dei concimi
    for (const t of TESTI) esiti.push(correggiTesto(db, { tabella: 'catalogo_oggetto', dove: 'chiave = ?', parametri: [t.chiave], colonna: 'effetto', prima: t.prima, dopo: t.dopo, etichetta: `effetto:${t.chiave}` }, adesso));
    // (3) le voci dopo il 05-31
    const partite = tabellePartiteConVoce(db);
    if (!conAttivita) esiti.push({ chiave: 'voci', esito: 'attività senza i due esiti attesi: nessuna voce collegata' });
    else for (const v of VOCI) {
      const c: ConversioneVoce = {
        uid: v.uid, data: v.data, azione: v.azione,
        attesi: v.doteUid && v.note ? [{ uid: v.doteUid, effetto: dote(v.note) }] : [],
        togli: v.doteUid ? [v.doteUid] : [],
        aggiungi: [{ seme: `O5-Fbis-301:turno:${v.uid}`, effetto: turno(v.esito) }],
        collega: { tipoPrima: 'dote', riferimentoPrima: v.collegataAllaDote ? RIF_DOTE : null, tipo: 'attivita', riferimento: RIF_ATTIVITA },
        motivo: v.perche,
      };
      esiti.push(convertiVoce(db, c, partite, adesso));
    }
    // le proposte del 09-28 superate dalla voce collegata (il turno della pianta c'è)
    if (db.prepare("SELECT 1 FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'turno' AND chiave = ?").get('3467db27e8637da9dea23669d062d0ce', CONCIMARE)) {
      const perche = 'la voce è collegata a «Concimare la pianta» con il turno del Megafertilizzante (Gentilezza ♪♪♪ dall’esito): migrazione 301 dell’ondata 5, lotto F-bis';
      esiti.push(chiudiProposta(db, { id: 'L13-4b-3467db27-01-a-riferimento-mancante', voce: '3467db27e8637da9dea23669d062d0ce', effetti: '[]', modo: 'superata', da: null, perche }, adesso));
      esiti.push(chiudiProposta(db, { id: 'L13-4b-3467db27-02-b-dote', voce: '3467db27e8637da9dea23669d062d0ce', effetti: '[{"effetto":{"tipo":"dote","dote":"gentilezza","note":1},"completa":["note"],"scelte":null}]', modo: 'superata', da: null, perche }, adesso));
    }
    // (4) il periodo validato: proposte
    if (conAttivita) for (const v of VALIDATE) {
      const id = `O5Fbis-${v.uid.slice(0, 8)}-01-concimare`;
      esiti.push(nuovaProposta(db, { id, voce: v.uid, tipo: 'attivita', riferimento: RIF_ATTIVITA, effetti: [{ effetto: { tipo: 'turno', attivita: CONCIMARE, esito: v.esito }, completa: [], scelte: null }], togli: [v.doteUid], motivo: v.perche, certezza: 'certa' }, adesso));
      esiti.push(chiudiProposta(db, { id: `L13-4b-${v.uid.slice(0, 8)}-01-a-riferimento-mancante`, voce: v.uid, effetti: '[]', modo: 'sostituita', da: id,
        perche: 'il collegamento giusto è l’attività «Concimare la pianta» con l’esito del concime (proposta del lotto F-bis), non la Dote' }, adesso));
    }
    const conteggi = {
      attivita: esiti.filter((e) => e.chiave === CONCIMARE && e.esito.startsWith('creata')).length,
      testi: esiti.filter((e) => e.esito === 'corretto').length,
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata')).length,
      proposteCreate: esiti.filter((e) => e.esito.startsWith('proposta creata')).length,
      proposteChiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
    };
    const cambiato = conteggi.attivita + conteggi.testi + conteggi.vociConvertite + conteggi.proposteCreate + conteggi.proposteChiuse > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 301, { fonti: [FONTE_DOTI, FONTE_NEGOZI], conteggi, esiti }, cambiato);
    logger.info({ migrazione: 301, ...conteggi }, 'Concimare la pianta: attività con il concime come esito, voci collegate e proposte');
  },
};
