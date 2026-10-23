// ============================================================
// 155 — due eventi di storia risolti sulle fonti Royal (R10-04/4, R10-12)
// ============================================================
//
// Le voci dubbie della 154, verificate sulla guida italiana di Persona 5 Royal (AllGameStaff: pagina di Yoshida, soluzione delle
// settimane 4 e 5, pagina dei videogiochi; Samurai Gamers sulla data del discorso):
//   - `oratore-shibuya-ascoltato`: il primo ascolto del discorso di Yoshida è la sera del 9 maggio, in Piazza della Stazione di
//     Shibuya (il 10 maggio, rango 1, è l'incontro successivo): voce 05-09 sera «Visita a Yoshida in Piazza Stazione: avvio del
//     Confidente». Certezza alta sulla data, media sulla fascia.
//   - `sistema-videogiochi-installato`: il sistema è il televisore CRT (dalla mansarda, 18 aprile) più il Set retrogaming (negozio
//     dell'usato di Yongen-Jaya, dal 5 giugno); il tavolo è quello della mansarda. La voce che lo collega e sblocca il tutorial è
//     06-10 sera «Collegare la console TV in camera (sblocco tutorial)». Certezza media (una sola fonte).
// Restano SENZA effetto, perché le fonti non lo risolvono: `biliardo-rango-tecnico-3` (si ottiene con Perizia 3 e la Stecca jump, senza
// data né numero di partite), i banchi di Niijima (la guida descrive una sola cassa, nella lobby dei soci) e la voce cumulativa dei
// cruciverba del 02-01 (nelle fonti il 02-01 non è un giorno di cruciverba). Stessa regola della 154: effetto «storia» aggiunto alla
// voce, nessuna spunta riapplicata, nessun testo toccato. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ABBINAMENTI: ReadonlyArray<{ voce: string; testo: string; evento: string }> = [
  { voce: '21884ede0c011dee7ebfff5917c8642b', testo: 'Visita a Yoshida in Piazza Stazione', evento: 'oratore-shibuya-ascoltato' },
  { voce: '8b66859a49dcf3f0669c284b52701f04', testo: 'Collegare la console TV in camera', evento: 'sistema-videogiochi-installato' },
];

export const migration155: Migration = {
  id: 155,
  name: 'eventi_storia_dalle_fonti_royal',
  up(db) {
    const esiti = ABBINAMENTI.map((a) => aggiungiEffettoAllaVoce(db, '155', a.voce, a.testo, { tipo: 'storia', evento: a.evento }, a.evento));
    logger.info({ aggiunti: esiti.filter((e) => e === 'aggiunto').length, saltati: esiti.filter((e) => e === 'saltato').length }, '155: eventi di storia dalle fonti Royal');
  },
};
