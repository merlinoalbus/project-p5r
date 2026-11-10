// ============================================================
// 387 — gli esiti del Triple Seven anche sulla riga del pacchetto iniziale (rilievo della revisione automatica sulla PR 108, migrazione 364)
// ============================================================
//
// La 364 ha scritto gli esiti del quiz dei codici a barre del Triple Seven solo sulla riga con `origine = 'utente'` (l'istanza in cui il lavoro
// era stato corretto a mano). Un'installazione nuova parte da `pacchetto/gioco.db`, dove la riga è `origine = 'seed'` e tutto il resto è come
// la 364 lo attende (verbale `audit-l8-364-esiti-e-costi` di un'istanza nuova: «valori diversi da quelli attesi: resta», con `origine: seed`
// e gli altri valori uguali): lì gli esiti non arrivavano mai, e ogni turno dava le due note fisse di Fascino e la paga base anche con il quiz
// riuscito. La 364 è registrata e su quelle istanze è già passata: la correzione è qui.
//
// Stessa scrittura della 364 per il Triple Seven, con la stessa guardia per identità (esiti assenti, le due Doti fisse attese, paga 3500,
// massima 7400, la frase «Valore non confermato…» in coda ai dettagli), e l'origine `seed` o `utente`: una riga con un'altra origine o con altri
// valori resta com'è, e il verbale lo dice. L'origine non cambia (come la Rafflesia nella 364). La fotografia di «Ripristina» (`seed_json`), se
// c'è ed è quella attesa, prende gli stessi esiti; la riga del pacchetto non ne ha. Fonte, esiti e frasi sono quelli della 364, scritti qui per
// esteso perché una migrazione non cambia più: https://www.allgamestaff.it/persona-5-royal/lavori-part-time/.
// Le altre righe di `attivita` restano identiche (impronta). Idempotente: una riga già con gli esiti non si scrive. Nessun import da `server/services/`.
// Verbale: `dati_guida.audit-387-esiti-triple-seven`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`387: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'rilievi · 387';
const AUDIT = 'audit-387-esiti-triple-seven';
const CHIAVE = 'lavoro-triple-seven';
const ORIGINI: readonly string[] = ['seed', 'utente'];

type DoteEsito = { dote: string; note: 1 | 2 | 3 };
const esito = (chiave: string, nome: string, gruppo: string | null, dote: DoteEsito, paga?: number): Record<string, unknown> =>
  ({ chiave, nome, gruppo, articolo: null, condizioni: [], doti: [dote], premi: null, ...(paga ? { paga } : {}) });
const QUIZ = 'Quiz dei codici a barre';
/** Gli stessi esiti della 364, nello stesso ordine e con le stesse chiavi. */
const ESITI = JSON.stringify({ modo: 'scelta', esiti: [
  esito('turno', 'Turno senza quiz', null, { dote: 'fascino', note: 2 }),
  esito('quiz-primo-tentativo', `${QUIZ} · giusta al primo tentativo`, QUIZ, { dote: 'fascino', note: 3 }, 7400),
  esito('quiz-secondo-tentativo', `${QUIZ} · giusta al secondo tentativo`, QUIZ, { dote: 'fascino', note: 2 }, 5800),
  esito('quiz-due-errori', `${QUIZ} · due errori`, QUIZ, { dote: 'fascino', note: 2 }),
] });
const EFFETTI_PRIMA = JSON.stringify([{ effetto: { famiglia: 'dote', dote: 'fascino', note: 2 } }, { effetto: { famiglia: 'dote', dote: 'fascino', note: 2 }, ripetuto: true }]);
const PAGA = 3500;
const MASSIMA = 7400;
/** La frase smentita dalla guida («ogni turno aumenta Fascino di 2 punti»), in coda ai dettagli e alla loro fotografia. */
const NOTA = '\n\nNote sulle Doti: Valore non confermato in \'note\' sulla guida italiana, che ne conferma solo la presenza';
const NOTA_FOTO = '\n\nNote sulle Doti: Fascino: +2 punti Fascino a turno (fonte secondaria; valore non confermato in \'note\' sulla guida italiana, che ne conferma solo la presenza)';

/** Impronta delle righe di `attivita` tranne il Triple Seven. */
function improntaAltre(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const r of db.prepare('SELECT * FROM main.attivita ORDER BY rowid').iterate() as Iterable<Record<string, unknown>>) if (r.chiave !== CHIAVE) h.update(JSON.stringify(r) + '\n');
  return h.digest('hex');
}

interface RigaLavoro { esiti_json: string | null; effetti_json: string | null; paga_yen: number | null; paga_massima: number | null; dettagli: string | null; origine: string; seed_json: string | null }

export const migration387: Migration = {
  id: 387,
  name: 'esiti_triple_seven_del_pacchetto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !esisteTabella(db, 'dati_guida') || !haColonna(db, 'attivita', 'esiti_json') || !haColonna(db, 'attivita', 'seed_json')) return;
    const r = db.prepare('SELECT esiti_json, effetti_json, paga_yen, paga_massima, dettagli, origine, seed_json FROM main.attivita WHERE chiave = ?').get(CHIAVE) as RigaLavoro | undefined;
    if (!r) { registraAudit(db, AUDIT, { migrazione: MIGRAZIONE, riga: CHIAVE, esito: 'riga assente' }); return; }
    if (r.esiti_json === ESITI && r.effetti_json === '[]') return; // già fatto (dalla 364 o da qui)
    const attesa = r.esiti_json === null && r.effetti_json === EFFETTI_PRIMA && r.paga_yen === PAGA && r.paga_massima === MASSIMA
      && ORIGINI.includes(r.origine) && r.dettagli !== null && r.dettagli.endsWith(NOTA);
    if (!attesa) {
      registraAudit(db, AUDIT, { migrazione: MIGRAZIONE, riga: CHIAVE, esito: 'valori diversi da quelli attesi: resta',
        trovato: { esiti_json: r.esiti_json, effetti_json: r.effetti_json, paga: r.paga_yen, massima: r.paga_massima, origine: r.origine, notaInCoda: (r.dettagli ?? '').endsWith(NOTA) } });
      logger.warn({ migrazione: 387, riga: CHIAVE, origine: r.origine }, 'Triple Seven: valori diversi da quelli attesi, la riga resta');
      return;
    }
    const prima = improntaAltre(db);
    const dettagliPrima = r.dettagli as string;
    const dettagli = dettagliPrima.slice(0, -NOTA.length);
    archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'attivita.effetti_json.387', { [CHIAVE]: EFFETTI_PRIMA });
    archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'attivita.dettagli.387', { [CHIAVE]: dettagliPrima });
    let seed = r.seed_json;
    let fotografia = 'assente';
    if (seed !== null) {
      // la fotografia di «Ripristina»: stessi effetti (vuoti) e senza la frase smentita; se non è quella attesa resta, e il verbale lo dice
      try {
        const foto = JSON.parse(seed) as Record<string, unknown>;
        if (foto.effetti_json === EFFETTI_PRIMA && typeof foto.dettagli === 'string' && foto.dettagli.endsWith(NOTA_FOTO)) {
          seed = JSON.stringify({ ...foto, effetti_json: '[]', esiti_json: ESITI, dettagli: foto.dettagli.slice(0, -NOTA_FOTO.length) });
          fotografia = 'aggiornata';
        } else fotografia = 'diversa da quella attesa: resta';
      } catch { fotografia = 'illeggibile: resta'; }
    }
    if (db.prepare('UPDATE main.attivita SET esiti_json = ?, effetti_json = \'[]\', dettagli = ?, seed_json = ? WHERE chiave = ? AND esiti_json IS NULL AND effetti_json = ? AND seed_json IS ?')
      .run(ESITI, dettagli, seed, CHIAVE, EFFETTI_PRIMA, r.seed_json).changes !== 1) errore(`${CHIAVE} non si aggiorna`);
    if (improntaAltre(db) !== prima) errore('altre righe di attivita sono cambiate');
    registraAudit(db, AUDIT, { migrazione: MIGRAZIONE, riga: CHIAVE, origine: r.origine, esito: 'esiti scritti, Doti fisse tolte (le danno gli esiti)', fotografia });
    logger.info({ migrazione: 387, riga: CHIAVE, origine: r.origine, fotografia }, 'esiti del Triple Seven scritti');
  },
};
