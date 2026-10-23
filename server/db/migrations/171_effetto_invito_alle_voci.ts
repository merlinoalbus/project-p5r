// ============================================================
// 171 — le voci degli inviti hanno l'effetto «invito avvenuto» (R10-11i, R10-11k)
// ============================================================
//
// Le cinque voci della 149 che descrivono un invito che apre un posto (07-03 Ryuji, 07-29 Akechi, 07-30 Makoto, 08-06 Ann, 10-09 Futaba) ricevono
// l'effetto di stato `invito` con la chiave del loro invito in `confidente_invito` («ryuji/07-03», …). Spuntare la voce registra lo STESSO evento del
// gesto «Invito avvenuto», con la stessa regola (solo con le condizioni vere: altrimenti «Non ancora possibile» e la spunta non passa; Makoto del
// 30/7 col Palazzo di Futaba concluso, G-028), una volta sola; togliere la spunta toglie l'evento se l'ha scritto la voce. Lo stesso effetto dà alla
// spunta il moltiplicatore ×1,2 dei punti dell'incontro. Sono voci del team «da rivedere» (149): non è un'aggiunta al diario validato.
// NON hanno l'effetto i tre messaggi (07-02, 07-28, 10-08: avvisano, non sono l'uscita) e il 29/5 di Ryuji (diario validato: resta il gesto diretto).
// Stessa regola della 154: effetto aggiunto alla voce, nessuna spunta riapplicata, nessun testo toccato. Idempotente. Scrive solo in `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ABBINAMENTI: ReadonlyArray<{ voce: string; testo: string; invito: string }> = [
  { voce: '9f3faa2a77fae8a2fee5aa0c46a21600', testo: 'Invito di Ryuji', invito: 'ryuji/07-03' },
  { voce: 'ff984b684560c4881fb3ec9c9f8f71cc', testo: 'Invito di Akechi', invito: 'akechi/07-29' },
  { voce: '931d1e209d7aafcdb686bbca57676087', testo: 'Invito di Makoto', invito: 'makoto/07-30' },
  { voce: '3dae597a78761d7e296e969ce0d089ef', testo: 'Invito di Ann', invito: 'ann/08-06' },
  { voce: '81e253c5f0b988a835295914b2a4cf98', testo: 'Invito di Futaba', invito: 'futaba/10-09' },
];

export const migration171: Migration = {
  id: 171,
  name: 'effetto_invito_alle_voci',
  up(db) {
    const esiti = ABBINAMENTI.map((a) => aggiungiEffettoAllaVoce(db, '171', a.voce, a.testo, { tipo: 'invito', invito: a.invito }, a.invito));
    logger.info({ aggiunti: esiti.filter((e) => e === 'aggiunto').length, saltati: esiti.filter((e) => e === 'saltato').length }, '171: effetto invito alle voci degli inviti');
  },
};
