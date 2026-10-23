// ============================================================
// 157 — le voci «Rispondere alla domanda in classe» e «Cruciverba» segnano lo stato collegato (R10-09, R10-12, R10-13)
// ============================================================
//
// Abbinamento per DATA, come dice R10-13, solo dove non c'è ambiguità:
//   - domande: 44 delle 49 voci che cominciano con «Rispondere alla domanda…» hanno nel loro giorno una sola voce di questo tipo e una
//     sola domanda del dataset: l'effetto «domanda» le collega (in «Domande in classe, esami e quiz in TV» la domanda risulta fatta). Le
//     altre 5 sono le date con due domande (05-19, 05-26, 06-23, 09-29, 11-10): le collega la 158 a entrambe;
//   - cruciverba, per data: 32 voci «Cruciverba…» hanno nel loro giorno un solo cruciverba nel dataset e sono la sola voce di cruciverba
//     di quel giorno: l'effetto «cruciverba» le collega. La voce del 10-31 «cruciverba scolastico (Stand)» NON è collegata: secondo la
//     guida (G-037, certezza alta) quella voce non esiste, il 31/10 c'è solo il cruciverba «Stand» della sera; è una voce da rivedere;
//   - cruciverba, per risposta (L10 modifiche §1.2, G-037): le voci «Cruciverba (Ustione)» del 08-16 e «Cruciverba (Hacker)» del 08-29
//     stanno nel giorno sbagliato (i cruciverba sono del 17/8 e del 30/8): si collegano al cruciverba che ha quella RISPOSTA, senza
//     spostare né toccare le voci (testo, data e ordine restano). Il cumulativo del 02-01 non esiste nelle fonti Royal.
// Gli effetti si AGGIUNGONO alla voce (origine «regola», dopo quelli che ha: la Conoscenza resta una Dote da applicare dal pulsante,
// D6); testo, ordine, uid e spunte non cambiano e le spunte già date non riapplicano niente. Togliere la spunta riporta lo stato di
// prima (`effettiDiStatoService`). Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const DOMANDE: ReadonlyArray<readonly [string, number]> = [
  ['1277a396a60bfe', 62], ['abff64baf5a399', 63], ['085874824cc3d6', 64], ['e2c04956f75265', 65], ['e4e822cc0ceca2', 67], ['18d7310f2bdb0f', 1], ['1864ace9ab9023', 2], ['335da4c049db71', 3], ['33f6422ac85dea', 5], ['83c479baef1dd8', 7], ['0eb3cba1a69c85', 8], ['db48467b0b1917', 12], ['9d1d80ca3f8413', 14], ['0e516d8adae9bc', 15], ['71d084079765d8', 18], ['2168d96a2bdb61', 19], ['4ac1196a9dc121', 20], ['56f63b864e46a0', 21], ['0c84ff4bf2596f', 22], ['0232c81135877f', 23], ['1001ace2954b03', 25], ['35c2d60b269800', 26], ['c111c8fd750489', 27], ['971326960ac268', 28], ['a5511eef2445fd', 29], ['097f039fbac5b5', 31], ['d4bf863db64ec6', 35], ['48cdcc73bc8c13', 37], ['71a031a093a6d0', 38], ['4dd8fefa756e83', 39], ['0a49461ce452e5', 73], ['4176f8b1436d74', 40], ['c0e03490a0d91f', 41], ['542be5960929cc', 43], ['7879e40f1bd284', 45], ['e3416adf5878cc', 49], ['3686c54194396d', 50], ['44ddf96bd64ce2', 51], ['d25a4c1ad65b96', 52], ['48a646b7e1fac6', 53], ['e18714ca6d3f89', 55], ['622a1cc1e328cb', 56], ['12b1e05257dbe7', 57], ['06838ede9f9539', 58],
];
const CRUCIVERBA: ReadonlyArray<readonly [string, string]> = [
  ['cfff1a4e054236', '01-14'], ['0db23eb1f0e95a', '01-19'], ['4d2bd3506af18f', '01-23'], ['2eff85fefa94ba', '04-18'], ['8f7a80f65122c4', '04-27'], ['dbc62717e37ddc', '05-02'], ['6a839c778166a0', '05-10'], ['0242dfecb025cc', '05-18'], ['66d47e0fe92f6c', '05-26'], ['ccc2906f6d5301', '05-31'], ['ceaedeb81bc691', '06-03'], ['e447b43c4871cd', '06-07'], ['9daceec838510b', '06-16'], ['2e39978a4268de', '06-22'], ['3a249ad71119c6', '06-30'], ['afa0ec1bb82e8b', '07-07'], ['0d699ed5f0f297', '07-12'], ['a47ad00cd0503d', '07-19'], ['3b99c96fe88144', '07-27'], ['99723c49999949', '08-08'], ['f1d5a7d3cd506b', '08-25'], ['50780540bb9db2', '08-30'], ['85aac94b1bac7e', '09-02'], ['797d3fb2e5bf20', '09-19'], ['79e7565638dd08', '10-10'], ['d967317141dc20', '11-04'], ['a334e3570be813', '11-14'], ['11f2e8fcdb9874', '11-28'], ['3f1fc71782abbd', '12-02'], ['ba1f78c8633835', '12-07'], ['51b3cd267a2db2', '12-12'], ['44c501a12de5ed', '12-19'],
];

/** [voce (prefisso), risposta del cruciverba]: voci nel giorno sbagliato, collegate al cruciverba con quella risposta. */
const CRUCIVERBA_PER_RISPOSTA: ReadonlyArray<readonly [string, string]> = [['889aefc1', 'Ustione'], ['a67565bf', 'Hacker']];

export const migration157: Migration = {
  id: 157,
  name: 'domande_e_cruciverba_dalle_voci',
  up(db) {
    let aggiunti = 0, saltati = 0;
    const conta = (e: string) => { if (e === 'aggiunto') aggiunti++; else if (e === 'saltato') saltati++; };
    for (const [voce, id] of DOMANDE) {
      // la domanda deve esistere e stare nel giorno della voce: altrimenti la voce resta com'è
      const ok = db.prepare('SELECT 1 FROM main.domanda d JOIN main.voce_giornata v ON v.uid LIKE ? AND v.data = d.data WHERE d.id = ?').get(`${voce}%`, id);
      if (!ok) { saltati++; continue; }
      conta(aggiungiEffettoAllaVoce(db, '157', voce, 'Rispondere alla domanda', { tipo: 'domanda', domanda: id }, String(id)));
    }
    for (const [voce, data] of CRUCIVERBA) {
      const ok = db.prepare('SELECT 1 FROM main.cruciverba c JOIN main.voce_giornata v ON v.uid LIKE ? AND v.data = c.data WHERE c.data = ?').get(`${voce}%`, data);
      if (!ok) { saltati++; continue; }
      conta(aggiungiEffettoAllaVoce(db, '157', voce, 'ruciverba', { tipo: 'cruciverba', data }, data));
    }
    for (const [voce, risposta] of CRUCIVERBA_PER_RISPOSTA) {
      // il testo della voce nomina la risposta e il cruciverba con quella risposta è uno solo
      const righe = db.prepare('SELECT data FROM main.cruciverba WHERE lower(risposta) = lower(?)').all(risposta) as Array<{ data: string }>;
      if (righe.length !== 1) { saltati++; continue; }
      conta(aggiungiEffettoAllaVoce(db, '157', voce, risposta, { tipo: 'cruciverba', data: righe[0]!.data }, righe[0]!.data));
    }
    logger.info({ aggiunti, saltati }, '157: domande e cruciverba collegati alle voci');
  },
};
