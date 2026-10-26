// ============================================================
// Migrazione 293 — il Diner di Shibuya con la Bistecca nostalgica, e lo studio al Diner con gli esiti (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Censimento F-bis, punto 9: la Bistecca nostalgica del Diner (1.100 ¥) dà Gentilezza oltre alla Conoscenza dello studio, ma non era né un
// negozio né un'offerta; la voce del 06-14 aveva «yen −1.100» (una copia del prezzo) e quella del 08-18 nessun prezzo. Decisione 21: ciò che
// incide su yen e Doti si modella con i tipi dell'app; decisione 2: il prezzo sta nell'articolo.
//
// Che cosa fa:
//   (1) il negozio `diner-shibuya` nel luogo «Diner» di Shibuya, con la scheda `cibo/bistecca-nostalgica` e la sua offerta (1.100 ¥, la guida
//       non dà limiti: regola di ripiego dell'utente);
//   (2) l'attività `studio-diner-shibuya` dichiara i suoi esiti (un solo punto per i valori, come la 233 per le altre attività con esiti):
//       «Studio» (Conoscenza ♪♪, senza pioggia), «Studio con la pioggia» (Conoscenza ♪♪♪), «Studio con la Bistecca nostalgica» (Conoscenza
//       ♪♪ e Gentilezza ♪, paga l'offerta) e la stessa con la pioggia. Gli effetti fissi e la frase delle Doti dell'attività escono (li dicono
//       gli esiti), solo se sono ancora quelli attesi della guida;
//   (3) le voci dopo il 05-31 (06-14 e 08-18 la Bistecca, 07-06 lo studio con un Frui-te) si collegano all'attività: le Doti che gli esiti
//       danno escono (la Fascino ♪ del Frui-te del 07-06 resta: non è un esito), l'effetto yen del 06-14 esce (il prezzo lo scala l'offerta),
//       entra il turno con l'esito che il testo scrive (preselezionato: con la pioggia si sceglie l'altro alla spunta).
// Conservativa (vedi `fbisOndata5.ts`). Idempotente. Audit in `dati_guida.audit-293-diner`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { leggiEsitiAttivita, type EsitiAttivita } from '../../../shared/esitiAttivita.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { FALLBACK_UTENTE } from './rifornimentoOndata5.js';
import { FONTE_DOTI, FONTE_NEGOZI, canonico, chiudiProposta, convertiVoce, creaNegozio, creaOfferta, creaScheda, scriviAuditFbis, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-293-diner';
const errore = (motivo: string): never => { throw new Error(`293: ${motivo}; nessuna modifica applicata.`); };
const NEGOZIO = 'diner-shibuya';
const BISTECCA = `${NEGOZIO}/bistecca-nostalgica`;
const STUDIO = 'studio-diner-shibuya';
const NON_PIOVE = { tipo: 'meteo', condizione: 'non-piove' } as unknown as RequisitoSpillo;
const PIOVE = { tipo: 'piove' } as unknown as RequisitoSpillo;

/** Gli effetti e la frase delle Doti dell'attività come sono oggi (la guida), che gli esiti sostituiscono. */
const EFFETTI_PRIMA = [{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 2 }, condizioni: [{ tipo: 'meteo', condizione: 'non-piove' }] }, { effetto: { famiglia: 'dote', dote: 'conoscenza', note: 3 }, condizioni: [{ tipo: 'piove' }] }];
const DOTI_PRIMA = [{ dote: 'conoscenza', note: null, condizione: '2 punti Conoscenza, 3 nei giorni di pioggia (fonte secondaria)' }];

const ESITI = (conBistecca: boolean): EsitiAttivita => ({ modo: 'scelta', esiti: [
  { chiave: 'studio', nome: 'Studio', gruppo: null, articolo: null, condizioni: [NON_PIOVE], doti: [{ dote: 'conoscenza', note: 2 }], premi: null },
  { chiave: 'studio-pioggia', nome: 'Studio con la pioggia', gruppo: null, articolo: null, condizioni: [PIOVE], doti: [{ dote: 'conoscenza', note: 3 }], premi: null },
  ...(conBistecca ? [
    { chiave: 'bistecca', nome: 'Studio con la Bistecca nostalgica', gruppo: null, articolo: BISTECCA, condizioni: [NON_PIOVE], doti: [{ dote: 'conoscenza' as const, note: 2 as const }, { dote: 'gentilezza' as const, note: 1 as const }], premi: null },
    { chiave: 'bistecca-pioggia', nome: 'Studio con la Bistecca nostalgica e la pioggia', gruppo: null, articolo: BISTECCA, condizioni: [PIOVE], doti: [{ dote: 'conoscenza' as const, note: 3 as const }, { dote: 'gentilezza' as const, note: 1 as const }], premi: null },
  ] : []),
] });

const dote = (d: 'conoscenza' | 'gentilezza' | 'fascino', note: 1 | 2): EffettoVoce => ({ tipo: 'dote', dote: d, note });
const RIF = { tipo: 'attivita', chiave: STUDIO };
const json = (s: string | null): string => { try { return canonico(JSON.parse(s ?? 'null')); } catch { return ''; } };

export const migration293: Migration = {
  id: 293,
  name: 'diner_e_bistecca_nostalgica',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['negozio', 'articolo', 'catalogo_oggetto', 'attivita', 'voce_giornata', 'voce_effetto']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 293, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json') || !haColonna(db, 'articolo', 'rifornimento_json')) { logger.warn({ migrazione: 293 }, 'colonne assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    // (1) negozio, scheda e offerta
    esiti.push(creaNegozio(db, { chiave: NEGOZIO, nome: 'Diner', luogo: 'Shibuya, Central Street', quartiere: 'shibuya', sede: 'shibuya/diner', tipo: 'cibo', confidente: null,
      note: 'Il Diner di Shibuya: ci si studia (Conoscenza) e si ordina dal menu; la Bistecca nostalgica dà anche Gentilezza.', fonte: `${FONTE_DOTI} ; ${FONTE_NEGOZI}`, condizioni: [] }, adesso));
    esiti.push(creaScheda(db, { chiave: 'cibo/bistecca-nostalgica', categoria: 'cibo', nome: 'Bistecca nostalgica', effetto: 'Ordinata al Diner di Shibuya mentre si studia: Gentilezza oltre alla Conoscenza dello studio.',
      descrizione: 'Piatto del Diner di Shibuya.', fonteChiave: 'doti-sociali/Bistecca nostalgica' }, adesso));
    esiti.push(creaOfferta(db, { chiave: BISTECCA, negozio: NEGOZIO, nome: 'Bistecca nostalgica', categoria: 'cibo', prezzo: 1_100, catalogo: 'cibo/bistecca-nostalgica', condizioni: [],
      quantita: FALLBACK_UTENTE.q, rifornimento: FALLBACK_UTENTE.r, fonte: `${FONTE_DOTI} ; ${FONTE_NEGOZI}` }, adesso));
    const conBistecca = !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(BISTECCA);
    // (2) gli esiti dello studio al Diner, con gli effetti fissi tolti
    const a = db.prepare('SELECT doti_json, effetti_json, esiti_json, origine, seed_json FROM main.attivita WHERE chiave = ?').get(STUDIO) as
      { doti_json: string; effetti_json: string | null; esiti_json: string | null; origine: string; seed_json: string | null } | undefined;
    const dati = ESITI(conBistecca);
    const nuovo = JSON.stringify(dati);
    if (JSON.stringify(leggiEsitiAttivita(nuovo)) !== nuovo) errore('gli esiti dello studio al Diner non si rileggono validi');
    if (!a) esiti.push({ chiave: STUDIO, esito: 'attività assente' });
    else if (a.esiti_json !== null && canonico(leggiEsitiAttivita(a.esiti_json)) === canonico(dati)) esiti.push({ chiave: STUDIO, esito: 'esiti già dichiarati' });
    else if (a.origine !== 'seed' || a.seed_json !== null || a.esiti_json !== null) esiti.push({ chiave: STUDIO, esito: 'attività corretta dall’utente o con altri esiti: non toccata' });
    else if (json(a.effetti_json) !== canonico(EFFETTI_PRIMA) || json(a.doti_json) !== canonico(DOTI_PRIMA)) esiti.push({ chiave: STUDIO, esito: 'effetti diversi da quelli attesi: non toccata' });
    else {
      if (db.prepare("UPDATE main.attivita SET esiti_json = ?, effetti_json = '[]', doti_json = '[]', updated_at = ? WHERE chiave = ? AND esiti_json IS NULL AND origine = 'seed' AND seed_json IS NULL").run(nuovo, adesso, STUDIO).changes !== 1) errore('gli esiti dello studio non si scrivono');
      esiti.push({ chiave: STUDIO, esito: `esiti dichiarati (${dati.esiti.length}), effetti fissi tolti` });
    }
    const letti = leggiEsitiAttivita(db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').pluck().get(STUDIO) as string | null);
    const ha = (k: string): boolean => !!letti?.esiti.some((e) => e.chiave === k);
    // (3) le voci
    const partite = tabellePartiteConVoce(db);
    if (ha('bistecca')) {
      esiti.push(convertiVoce(db, { uid: 'be415f11b5e75cc59b05a52cc2183e08', data: '06-14', azione: 'Diner di Central Street: Bistecca nostalgica (1.100 yen)',
        // l'effetto yen viene da una proposta applicata (uid casuale su ogni copia: letto il 2026-10-26 come 5016e7ab…): si riconosce dal valore
        attesi: [{ uid: 'ec4623385c5ac0824e157e6af3e0813a', effetto: dote('gentilezza', 1) }, { uid: '1702ebaa587246175722c9c7aa075447', effetto: dote('conoscenza', 2) }, { uid: null, effetto: { tipo: 'yen', importo: -1100 }, togli: true }],
        togli: ['ec4623385c5ac0824e157e6af3e0813a', '1702ebaa587246175722c9c7aa075447'],
        aggiungi: [{ seme: 'O5-Fbis-293:turno:be415f11b5e75cc59b05a52cc2183e08', effetto: { tipo: 'turno', attivita: STUDIO, esito: 'bistecca' } }],
        collega: { tipoPrima: 'dote', riferimentoPrima: null, tipo: 'attivita', riferimento: RIF }, motivo: 'Bistecca nostalgica: Conoscenza ♪♪ e Gentilezza ♪ dall’esito, il prezzo dall’offerta (l’effetto yen esce)' }, partite, adesso));
      esiti.push(convertiVoce(db, { uid: '0c9dcbeb68246c42fef2ee7ae2bb05d7', data: '08-18', azione: 'Diner di Central Street: Bistecca nostalgica',
        attesi: [{ uid: '3dc31fa9cc56db696a0947d23d1f4ea8', effetto: dote('conoscenza', 2) }, { uid: '9b99246468da24f30af55b0cbde26b29', effetto: dote('gentilezza', 1) }],
        togli: ['3dc31fa9cc56db696a0947d23d1f4ea8', '9b99246468da24f30af55b0cbde26b29'],
        aggiungi: [{ seme: 'O5-Fbis-293:turno:0c9dcbeb68246c42fef2ee7ae2bb05d7', effetto: { tipo: 'turno', attivita: STUDIO, esito: 'bistecca' } }],
        collega: { tipoPrima: 'dote', riferimentoPrima: null, tipo: 'attivita', riferimento: RIF }, motivo: 'Bistecca nostalgica: Conoscenza ♪♪ e Gentilezza ♪ dall’esito, il prezzo dall’offerta' }, partite, adesso));
    } else esiti.push({ chiave: 'voci-bistecca', esito: 'esito «bistecca» assente: voci non toccate' });
    if (ha('studio')) esiti.push(convertiVoce(db, { uid: '4e2b4e55c07ed7d170a158d963393c82', data: '07-06', azione: 'Studiare al Diner con un Frui-te',
      attesi: [{ uid: '0cadfb87e3a3543001342a826ebabf6f', effetto: dote('fascino', 1) }, { uid: '10c79644650d2481c84179c570f4e13a', effetto: dote('conoscenza', 2) }, { uid: 'd9ef22111fa510f28c8167060cdedc68', effetto: { tipo: 'turno', attivita: STUDIO } }],
      togli: ['10c79644650d2481c84179c570f4e13a', 'd9ef22111fa510f28c8167060cdedc68'],
      aggiungi: [{ seme: 'O5-Fbis-293:turno:4e2b4e55c07ed7d170a158d963393c82', effetto: { tipo: 'turno', attivita: STUDIO, esito: 'studio' } }],
      collega: { tipoPrima: 'dote', riferimentoPrima: null, tipo: 'attivita', riferimento: RIF },
      motivo: 'la Conoscenza ♪♪ la dà l’esito «Studio» (prima era contata due volte: dal turno e dalla Dote fissa); la Fascino ♪ del Frui-te resta' }, partite, adesso));
    if (db.prepare("SELECT 1 FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'turno' AND chiave = ?").get('be415f11b5e75cc59b05a52cc2183e08', STUDIO)) {
      esiti.push(chiudiProposta(db, { id: 'L13-4b-be415f11-01-a-riferimento-mancante', voce: 'be415f11b5e75cc59b05a52cc2183e08', effetti: '[]', modo: 'superata', da: null,
        perche: 'la voce è collegata allo studio al Diner con l’esito della Bistecca nostalgica (lotto F-bis)' }, adesso));
    }
    const conteggi = {
      negozi: esiti.filter((e) => e.chiave === NEGOZIO && e.esito.startsWith('creato')).length,
      schede: esiti.filter((e) => e.esito === 'scheda creata').length,
      offerte: esiti.filter((e) => e.chiave === BISTECCA && e.esito.startsWith('creata')).length,
      esiti: esiti.filter((e) => e.chiave === STUDIO && e.esito.startsWith('esiti dichiarati')).length,
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata')).length,
      proposteChiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
    };
    const cambiato = conteggi.negozi + conteggi.schede + conteggi.offerte + conteggi.esiti + conteggi.vociConvertite + conteggi.proposteChiuse > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 293, { fonti: [FONTE_DOTI, FONTE_NEGOZI], conteggi, esiti,
      nota: 'Il valore di Gentilezza della Bistecca (♪) e della Conoscenza dello studio vengono dalle voci della guida (06-14, 08-18) e dalla fonte secondaria già dichiarata nell’attività: da verificare in gioco.' }, cambiato);
    logger.info({ migrazione: 293, ...conteggi }, 'Diner: Bistecca nostalgica, esiti dello studio, voci collegate');
  },
};
