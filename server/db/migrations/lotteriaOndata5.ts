// ============================================================
// Lotteria dell'Ondata 5 (Lotto G; decisione 21 dell'utente) — dati comuni delle migrazioni 280-282
// ============================================================
//
// Le chiavi del chiosco, dei biglietti e dell'attività dell'estrazione, l'audit del lotto e le fonti della guida italiana (lette il 2026-10-26):
//   - «Oggetti chiave/essenziali», sezione «Altro» [OC]: Lotto R e Lotto S 3.000 ¥ e Lotti estivi R e S 5.000 ¥ alla «Lotteria sparsa»
//     (Piazza della stazione, Shibuya; dal lunedì 4/18, gli estivi da venerdì 7/1 a sabato 7/30), Lotteria gratta e vinci 200 ¥ al banco
//     «Lotteria gratta e vinci» (dal 4/18);
//   - «Soluzione settimana 2», riquadro «La lotteria di Shibuya» [S2]: si compra il Lotto R, si torna la settimana dopo; vinto = trofeo «Soldi
//     facili», altrimenti si ricompra; «Soluzione settimana 5», 9 maggio sera [S5]: prima si controlla, poi si ricompra solo se non si è vinto;
//     il chiosco è «quello più a sinistra dei tre» banchi della piazza (anche la voce del Diario del 18 aprile);
//   - «Elenco dei negozi» [N]: Discount Rocinante, «Lotto estivo S | 500 ¥ | 1 settembre – 10 ottobre | 1 | Lunedì successivo».
// Nessuna pagina dà le date delle estrazioni né gli importi delle vincite: l'esito si sceglie alla verifica e gli yen si scrivono a mano
// (decisione 18).
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { esisteTabella } from './pulizieL11.js';

export const FONTE_OGGETTI_CHIAVE = 'https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/';
export const FONTE_SETTIMANA_2 = 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-2/';
export const FONTE_SETTIMANA_5 = 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-5/';
export const FONTE_TROFEI = 'https://www.allgamestaff.it/persona-5-royal/guida-ai-trofei/';

/** Il chiosco unico della lotteria (decisione 21: «un solo chiosco della lotteria»), nella sede che esiste già in Piazza della Stazione. Il
 *  negozio porta il nome che la guida dà al banco dei biglietti, «Lotteria sparsa» [OC] (progetto dell'ondata 5, LOT-01, approvato con la
 *  decisione 21); il luogo che lo ospita prende il nome delle voci del Diario e del trofeo, «Chiosco della lotteria» (LOT-04: il luogo nato dal
 *  pin con L5 si rinomina e dice che cosa offre). */
export const CHIOSCO = { chiave: 'lotteria-shibuya', nome: 'Lotteria sparsa', sede: 'shibuya/u-banco-della-lotteria-di-shibuya', nomeSede: 'Chiosco della lotteria', quartiere: 'shibuya', luogo: 'Shibuya, Piazza della Stazione' } as const;
export const LOTTO_R = `${CHIOSCO.chiave}/lotto-r`;
/** L'attività dell'estrazione: un turno = una verifica del biglietto, con l'esito «Vinto» (trofeo) o «Non vinto». */
export const ESTRAZIONE = 'estrazione-lotteria';
export const TROFEO = 'soldi-facili';

/** L'audit di una migrazione del lotto, con le esecuzioni accodate (una migrazione rieseguita su un'altra copia ne aggiunge una). */
export function scriviAuditLotteria(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-G', decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}
