// ============================================================
// Migrazione 290 — la fabbricazione degli strumenti d'infiltrazione come attività con esiti per ricetta (Ondata 5, lotto F-bis; decisione 22)
// ============================================================
//
// Censimento F-bis, punto 11: 23 righe di `ricetta_materiale` e 10 ricompense di tipo «ricetta» descrivono che cosa si fabbrica e con quali
// materiali, ma nessuna attività le usava; sette voci del Diario davano solo la Perizia a mano. Decisione 22 dell'utente: «1 ma in modo random
// si può ottenere bonus +1 oggetto e +1 perizia... va specificato dall'utente... di volta in volta» (Perizia per creazione; il bonus casuale
// si indica alla spunta).
//
// Lettura della decisione (detta anche nei dettagli dell'attività): una creazione dà UN oggetto della ricetta e la Perizia della guida («+2
// Perizia per creazione», cioè ♪♪, la stessa delle voci: «3 Grimaldelli = Perizia +2; il 4° Grimaldello dà un bonus Perizia +1»); a volte, a
// caso, arriva il bonus: un oggetto in più e una nota di Perizia in più (♪♪♪). Chi gioca lo dice alla spunta, scegliendo l'esito.
//
// Che cosa fa:
//   (1) l'attività `fabbricazione-strumenti` (mansarda del Leblanc, di sera, dal rango 1 di Morgana) con due esiti per ricetta, costruiti dai
//       dati che ci sono già (un solo punto: la ricetta e i materiali restano in `ricetta_materiale` e in `ricompensa_oggetto`, gli esiti li
//       citano per chiave): «Creato» (Perizia ♪♪, 1 oggetto) e «Creato con il bonus» (Perizia ♪♪♪, 2 oggetti); entrambi consumano i materiali
//       della ricetta (`consuma`). Dieci ricette = venti esiti, il massimo di un'attività: se le ricette fossero di più l'attività non nasce e
//       l'audit lo dice. La ricetta degli «Strumenti del cercatore» non c'è nei dati: materiali e prodotto sono da verificare in gioco;
//   (2) le voci dopo il 05-31 (07-25 e 11-18) si collegano all'attività: la Perizia fissa esce (la dà l'esito) ed entra il turno; l'esito è
//       preselezionato solo dove il testo lo scrive (07-25: grimaldelli con Perizia ♪♪♪ = il bonus), altrimenti si sceglie alla spunta;
//   (3) le voci del periodo validato (04-20, 04-21, 05-30) ricevono solo una proposta da approvare; le proposte «oggetto Grimaldello» e
//       «collegamento mancante» di quelle voci si chiudono come sostituite (l'esito dà già il grimaldello: approvarle lo raddoppierebbe).
//       La voce del 17 aprile (il tutorial, un Grimaldello) resta com'è con la sua proposta: è la creazione guidata, non una sessione.
// Il 09-02 (riparare il Laptop rotto con il Set di strumenti) non è una ricetta: non si tocca. Conservativa (vedi `fbisOndata5.ts`).
// Idempotente. Audit in `dati_guida.audit-290-fabbricazione`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { LIMITI_ESITI, chiaveEsitoDaNome, leggiEsitiAttivita, type EsitiAttivita, type EsitoAttivita } from '../../../shared/esitiAttivita.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { FONTE_FABBRICAZIONE, chiudiProposta, convertiVoce, creaAttivita, nuovaProposta, scriviAuditFbis, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-290-fabbricazione';
const errore = (motivo: string): never => { throw new Error(`290: ${motivo}; nessuna modifica applicata.`); };
/** La stessa chiave di `server/services/modificatoriLibri.ts` (L'ABC dell'artigianato la bersaglia). */
export const FABBRICAZIONE = 'fabbricazione-strumenti';
const RIF_ATTIVITA = { tipo: 'attivita', chiave: FABBRICAZIONE };
const RIF_PERIZIA = { tipo: 'dote', chiave: 'perizia' };

const DETTAGLI = 'Si fabbrica nella mansarda del Leblanc, di sera, dal rango 1 di Morgana. Ogni creazione usa i materiali della ricetta e dà un oggetto con Perizia ♪♪; a volte, a caso, arriva il bonus: un oggetto in più e Perizia ♪♪♪. Il bonus si indica alla spunta, scegliendo l’esito. La ricetta degli Strumenti del cercatore non è nei dati: materiali e prodotto sono da verificare in gioco.';

/** Gli esiti dalle ricette che ci sono: per ognuna «Creato» e «Creato con il bonus», con i materiali consumati. */
function esitiDalleRicette(db: AppDatabase): { esiti: EsitoAttivita[]; problema: string | null } {
  const ricette = db.prepare("SELECT r.fonte_chiave AS ricetta, r.catalogo_chiave AS prodotto FROM main.ricompensa_oggetto r JOIN main.catalogo_oggetto c ON c.chiave = r.catalogo_chiave WHERE r.fonte_tipo = 'ricetta' ORDER BY r.fonte_chiave").all() as Array<{ ricetta: string; prodotto: string }>;
  if (!ricette.length) return { esiti: [], problema: 'nessuna ricetta nei dati' };
  if (ricette.length * 2 > LIMITI_ESITI.esiti) return { esiti: [], problema: `${ricette.length} ricette: ${ricette.length * 2} esiti superano il massimo di ${LIMITI_ESITI.esiti}` };
  const out: EsitoAttivita[] = [];
  for (const r of ricette) {
    const materiali = db.prepare('SELECT catalogo_chiave AS oggetto, quantita FROM main.ricetta_materiale WHERE ricetta = ? ORDER BY catalogo_chiave').all(r.ricetta) as Array<{ oggetto: string; quantita: number }>;
    if (!materiali.length) return { esiti: [], problema: `la ricetta «${r.ricetta}» non ha materiali` };
    if (materiali.length > LIMITI_ESITI.oggetti) return { esiti: [], problema: `la ricetta «${r.ricetta}» ha più di ${LIMITI_ESITI.oggetti} materiali` };
    const chiave = chiaveEsitoDaNome(r.ricetta);
    const consuma = materiali.map((m) => ({ oggetto: m.oggetto, quantita: m.quantita }));
    out.push({ chiave, nome: `${r.ricetta} · creato`, gruppo: r.ricetta, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null, oggetti: [{ oggetto: r.prodotto, quantita: 1 }], consuma });
    out.push({ chiave: `${chiave}-bonus`, nome: `${r.ricetta} · con il bonus`, gruppo: r.ricetta, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 3 }], premi: null, oggetti: [{ oggetto: r.prodotto, quantita: 2 }], consuma });
  }
  return { esiti: out, problema: null };
}

const perizia = (note: 2 | 3): EffettoVoce => ({ tipo: 'dote', dote: 'perizia', note });
const PREMIO_GRIMALDELLO = '[{"effetto":{"tipo":"oggetto","oggetto":"consumabile/grimaldello","quantita":1},"completa":["quantita"],"scelte":null}]';

/** Le voci dopo il 05-31 come lette il 2026-10-26, con l'esito preselezionato solo se il testo lo scrive. */
const VOCI: ReadonlyArray<{ uid: string; data: string; azione: string; doteUid: string; note: 2 | 3; esito: string | null; perche: string }> = [
  { uid: 'f2900f8c540dcea8328d42bb6fc0a25a', data: '07-25', azione: 'Fabbricare grimaldelli al Leblanc', doteUid: '1f061eb1b644b574acf36d49f7795ea0', note: 3, esito: 'grimaldello-bonus',
    perche: 'grimaldelli con Perizia ♪♪♪: la creazione con il bonus (preselezionata, modificabile alla spunta)' },
  { uid: '4dff5d80637334a0d4335a969f268b1f', data: '11-18', azione: "Fabbricazione di bombe o strumenti d'infiltrazione", doteUid: '51a9406942eb314910dc027405cb2893', note: 3, esito: null,
    perche: 'la voce non dice che cosa si fabbrica né se arriva il bonus: l’esito si sceglie alla spunta' },
];
/** Le voci del periodo validato: proposte, con le proposte che sostituiscono. */
const VALIDATE: ReadonlyArray<{ uid: string; doteUid: string; esito: string; perche: string; chiudi: Array<{ id: string; effetti: string }> }> = [
  { uid: '30d7b54381f0688e920e74aeac401453', doteUid: '9b13fe24935f8360a80c6f4634e4cd3e', esito: 'grimaldello',
    perche: '«3 Grimaldelli = Perizia +2»: la creazione di Grimaldelli senza bonus (il 4° arriva con il bonus: si sceglie alla spunta); l’esito dà la Perizia, il grimaldello e consuma i materiali, la Dote fissa esce',
    chiudi: [{ id: 'L13-4b-30d7b543-02-b-premio', effetti: PREMIO_GRIMALDELLO }] },
  { uid: '30d2458a024c2f6f7db05630e52792cb', doteUid: '0d3bebe091b1a0d95113d55d292a2a4f', esito: 'grimaldello',
    perche: '«2 di base, 3 ricaricando»: la creazione di Grimaldelli senza bonus (con il bonus si sceglie alla spunta); l’esito dà la Perizia, il grimaldello e consuma i materiali, la Dote fissa esce',
    chiudi: [{ id: 'L13-4b-30d2458a-02-b-premio', effetti: PREMIO_GRIMALDELLO }] },
  { uid: '62409d1ed182fe1a795c533ef8b02bf6', doteUid: '10d923fbc8ba8b79c648e43c66fa2489', esito: 'grimaldello-bonus',
    perche: '«Perizia +3; possibilità di ottenere 4 grimaldelli»: la creazione con il bonus; l’esito dà la Perizia, i grimaldelli e consuma i materiali, la Dote fissa esce',
    chiudi: [{ id: 'L13-4b-62409d1e-01-a-riferimento-mancante', effetti: '[]' }, { id: 'L13-4b-62409d1e-02-b-premio', effetti: PREMIO_GRIMALDELLO }] },
];

export const migration290: Migration = {
  id: 290,
  name: 'fabbricazione_degli_strumenti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'catalogo_oggetto', 'ricompensa_oggetto', 'ricetta_materiale', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 290, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 290 }, 'esiti delle attività assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    const { esiti: elenco, problema } = esitiDalleRicette(db);
    if (problema) esiti.push({ chiave: FABBRICAZIONE, esito: `${problema}: nessuna attività` });
    else {
      const dati: EsitiAttivita = { modo: 'scelta', esiti: elenco };
      const json = JSON.stringify(dati);
      if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti della fabbricazione non si rileggono validi');
      esiti.push(creaAttivita(db, { chiave: FABBRICAZIONE, nome: 'Fabbricazione degli strumenti d’infiltrazione', tipo: 'altro', luogo: 'Yongen-Jaya, Leblanc (mansarda)', quartiere: 'yongen-jaya',
        sede: 'yongen-jaya/leblanc', fascia: 'sera', fonte: FONTE_FABBRICAZIONE, dettagli: DETTAGLI, condizioni: [{ tipo: 'confidente', confidente: 'morgana', rango: 1 }], esiti: json }, adesso));
    }
    const attivita = leggiEsitiAttivita(db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').pluck().get(FABBRICAZIONE) as string | null);
    const ha = (k: string): boolean => !!attivita?.esiti.some((e) => e.chiave === k);
    const partite = tabellePartiteConVoce(db);
    for (const v of VOCI) {
      if (!attivita || (v.esito && !ha(v.esito))) { esiti.push({ chiave: `voce:${v.data}:${v.uid}`, esito: 'saltata: attività o esito atteso assenti' }); continue; }
      esiti.push(convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione, attesi: [{ uid: v.doteUid, effetto: perizia(v.note) }], togli: [v.doteUid],
        aggiungi: [{ seme: `O5-Fbis-290:turno:${v.uid}`, effetto: { tipo: 'turno', attivita: FABBRICAZIONE, ...(v.esito ? { esito: v.esito } : {}) } }],
        collega: { tipoPrima: 'dote', riferimentoPrima: RIF_PERIZIA, tipo: 'attivita', riferimento: RIF_ATTIVITA }, motivo: v.perche }, partite, adesso));
    }
    for (const v of VALIDATE) {
      if (!ha(v.esito)) { esiti.push({ chiave: v.uid, esito: 'esito atteso assente: nessuna proposta' }); continue; }
      const id = `O5Fbis-${v.uid.slice(0, 8)}-01-fabbricazione`;
      esiti.push(nuovaProposta(db, { id, voce: v.uid, tipo: 'attivita', riferimento: RIF_ATTIVITA, effetti: [{ effetto: { tipo: 'turno', attivita: FABBRICAZIONE, esito: v.esito }, completa: [], scelte: null }],
        togli: [v.doteUid], motivo: v.perche, certezza: 'probabile' }, adesso));
      for (const c of v.chiudi) esiti.push(chiudiProposta(db, { id: c.id, voce: v.uid, effetti: c.effetti, modo: 'sostituita', da: id,
        perche: 'la creazione è un turno della fabbricazione: l’esito dà Perizia e grimaldelli e consuma i materiali (proposta del lotto F-bis); questa la raddoppierebbe' }, adesso));
    }
    const conteggi = {
      attivita: esiti.filter((e) => e.chiave === FABBRICAZIONE && e.esito.startsWith('creata')).length,
      esiti: elenco.length,
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata')).length,
      proposteCreate: esiti.filter((e) => e.esito.startsWith('proposta creata')).length,
      proposteChiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
    };
    const cambiato = conteggi.attivita + conteggi.vociConvertite + conteggi.proposteCreate + conteggi.proposteChiuse > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 290, { fonti: [FONTE_FABBRICAZIONE], decisione: 'L13-22', conteggi, esiti,
      daVerificareInGioco: ['la ricetta degli Strumenti del cercatore (materiali e prodotto) non è nei dati'] }, cambiato);
    logger.info({ migrazione: 290, ...conteggi }, 'Fabbricazione: attività con esiti per ricetta (bonus alla spunta), voci collegate e proposte');
  },
};
