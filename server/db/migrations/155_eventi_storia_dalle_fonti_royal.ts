// ============================================================
// 155 — l'oratore di Shibuya ascoltato il 9 maggio, confermato da due fonti Royal (R10-04/4, R10-12)
// ============================================================
//
// Una voce dubbia della 154, risolta con DUE fonti indipendenti:
//   - `oratore-shibuya-ascoltato`: il primo ascolto del discorso di Yoshida è la sera del 9 maggio, in Piazza della Stazione di Shibuya
//     (il 10 maggio, rango 1, è l'incontro successivo). Fonti: AllGameStaff, pagina «Rango Confidente di Yoshida (Sole)» e soluzione
//     della settimana 5 (https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-yoshida-sole/); Samurai Gamers, walkthrough
//     di maggio (https://samurai-gamers.com/persona-5/may-walkthrough/): «5/9 lunedì, di sera a Station Square» e «5/10 rango 1». Voce
//     05-09 sera «Visita a Yoshida in Piazza Stazione: avvio del Confidente».
// NON è collegato `sistema-videogiochi-installato` (voce 06-10 «Collegare la console TV in camera»): la sola fonte con le date è la
// guida italiana (TV CRT dalla mansarda il 18 aprile, Set retrogaming dal 5 giugno); Samurai Gamers conferma il meccanismo (TV e console
// dal negozio dell'usato di Yongen-Jaya) ma non le date, e le pagine di Fandom e GameFAQs non si sono potute leggere. Finché non c'è una
// seconda fonte Royal con la data, il fatto resta da segnare a mano (decisione del PM del 24/10: niente certezza media da una fonte sola).
// Restano SENZA effetto anche `biliardo-rango-tecnico-3`, la voce cumulativa dei cruciverba 02-01, Pietra Sacra, televendite e softair.
// Stessa regola della 154: effetto «storia» aggiunto alla voce, nessuna spunta riapplicata, nessun testo toccato. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ABBINAMENTI: ReadonlyArray<{ voce: string; testo: string; evento: string }> = [
  { voce: '21884ede0c011dee7ebfff5917c8642b', testo: 'Visita a Yoshida in Piazza Stazione', evento: 'oratore-shibuya-ascoltato' },
];

export const migration155: Migration = {
  id: 155,
  name: 'eventi_storia_dalle_fonti_royal',
  up(db) {
    const esiti = ABBINAMENTI.map((a) => aggiungiEffettoAllaVoce(db, '155', a.voce, a.testo, { tipo: 'storia', evento: a.evento }, a.evento));
    logger.info({ aggiunti: esiti.filter((e) => e === 'aggiunto').length, saltati: esiti.filter((e) => e === 'saltato').length }, '155: oratore di Shibuya (due fonti Royal)');
  },
};
