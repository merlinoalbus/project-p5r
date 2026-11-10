// ============================================================
// 364 — esiti del Triple Seven e del Fioraio Rafflesia, costo del bagno pubblico, date della Razione militare (L8-03; risposta Q18)
// ============================================================
//
// Fonte: https://www.allgamestaff.it/persona-5-royal/lavori-part-time/ (ricompense citate); bagno: tutorial della soluzione, «La tariffa d'accesso è di 500 Yen»; Razione militare:
// https://www.allgamestaff.it/persona-5-royal/oggetti/ e /scambi-oggetti-curiosi-venditori-nascosti/ (concordano: 4/17–8/14 e 12/7–12/19, le due fasce che valgono per il distributore).
//
// Lavori, nel formato di Ore no Beko (314): un esito «turno senza prova» (la paga base), poi gli esiti della prova, con la paga solo dove è diversa dalla base. Le note delle
// Doti sono i «punti» della guida (come Ore no Beko). Le Doti fisse escono da `effetti_json`, perché le dicono gli esiti (la stessa scelta della 314): altrimenti la scheda
// le mostrerebbe due volte. Nel Triple Seven esce da `dettagli` anche il paragrafo «Valore non confermato…», smentito dalla guida («ogni turno aumenta Fascino di 2 punti»).
// Crossroads: invariata (Q18). Le guardie sono per identità (valore atteso prima di scrivere): una riga diversa resta com'è, e il verbale lo dice.
// Nessuna voce, spunta o riga di `utente`; `registro_acquisti` non si tocca. Le righe non elencate di `attivita` e `articolo` restano identiche (impronta).
// Idempotente: una riga già al valore nuovo non si scrive. Verbale: `dati_guida.audit-l8-364-esiti-e-costi`. Nessun import da `server/services/`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`364: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L8-03 · 364';

type DoteEsito = { dote: string; note: 1 | 2 | 3 };
const esito = (chiave: string, nome: string, gruppo: string | null, dote: DoteEsito, paga?: number): Record<string, unknown> =>
  ({ chiave, nome, gruppo, articolo: null, condizioni: [], doti: [dote], premi: null, ...(paga ? { paga } : {}) });

const QUIZ = 'Quiz dei codici a barre';
const BOUQUET = 'Bouquet personalizzato';
const ESITI_TRIPLE = JSON.stringify({ modo: 'scelta', esiti: [
  esito('turno', 'Turno senza quiz', null, { dote: 'fascino', note: 2 }),
  esito('quiz-primo-tentativo', `${QUIZ} · giusta al primo tentativo`, QUIZ, { dote: 'fascino', note: 3 }, 7400),
  esito('quiz-secondo-tentativo', `${QUIZ} · giusta al secondo tentativo`, QUIZ, { dote: 'fascino', note: 2 }, 5800),
  esito('quiz-due-errori', `${QUIZ} · due errori`, QUIZ, { dote: 'fascino', note: 2 }),
] });
const ESITI_RAFFLESIA = JSON.stringify({ modo: 'scelta', esiti: [
  esito('turno', 'Turno senza bouquet', null, { dote: 'gentilezza', note: 2 }),
  esito('bouquet-tre-fiori', `${BOUQUET} · 3 fiori corretti`, BOUQUET, { dote: 'gentilezza', note: 3 }, 7800),
  esito('bouquet-due-fiori', `${BOUQUET} · 2 fiori corretti`, BOUQUET, { dote: 'gentilezza', note: 2 }),
  esito('bouquet-uno-o-nessuno', `${BOUQUET} · 1 o nessun fiore corretto`, BOUQUET, { dote: 'gentilezza', note: 1 }, 2400),
] });

const effettiDote = (dote: string): string => JSON.stringify([{ effetto: { famiglia: 'dote', dote, note: 2 } }, { effetto: { famiglia: 'dote', dote, note: 2 }, ripetuto: true }]);
const NOTA_TRIPLE = '\n\nNote sulle Doti: Valore non confermato in \'note\' sulla guida italiana, che ne conferma solo la presenza';
const NOTA_TRIPLE_FOTO = '\n\nNote sulle Doti: Fascino: +2 punti Fascino a turno (fonte secondaria; valore non confermato in \'note\' sulla guida italiana, che ne conferma solo la presenza)';

const LAVORI = [
  { chiave: 'lavoro-triple-seven', esiti: ESITI_TRIPLE, effettiPrima: effettiDote('fascino'), paga: 3500, massima: 7400, nota: NOTA_TRIPLE, notaFoto: NOTA_TRIPLE_FOTO, origine: 'utente' },
  { chiave: 'lavoro-rafflesia', esiti: ESITI_RAFFLESIA, effettiPrima: effettiDote('gentilezza'), paga: 3200, massima: 7800, nota: null, notaFoto: null, origine: 'seed' },
] as const;
const BAGNO = 'bagno-pubblico-yongen-jaya';
const RAZIONE = 'untouchable/razione-militare';
const CONDIZIONI_RAZIONE = JSON.stringify([{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'intervallo', dal: '04-17', al: '08-14' }, { tipo: 'intervallo', dal: '12-07', al: '12-19' }] }]);

/** Impronta delle righe di una tabella, escluse quelle indicate (per chiave). */
function improntaSenzaRighe(db: AppDatabase, tabella: string, escluse: readonly string[]): string {
  const h = createHash('sha256');
  for (const r of db.prepare(`SELECT * FROM main.${tabella} ORDER BY rowid`).iterate() as Iterable<Record<string, unknown>>) if (!escluse.includes(String(r.chiave))) h.update(JSON.stringify(r) + '\n');
  return h.digest('hex');
}

interface RigaLavoro { esiti_json: string | null; effetti_json: string | null; paga_yen: number | null; paga_massima: number | null; dettagli: string | null; origine: string; seed_json: string | null }

export const migration364: Migration = {
  id: 364,
  name: 'esiti_lavori_costo_bagno_razione_militare',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !esisteTabella(db, 'articolo') || !esisteTabella(db, 'dati_guida') || !haColonna(db, 'attivita', 'esiti_json')) return;
    const esiti: Array<{ riga: string; esito: string; trovato?: unknown }> = [];
    const toccate = { attivita: [] as string[], articolo: [] as string[] };
    const prima = { attivita: improntaSenzaRighe(db, 'attivita', [LAVORI[0].chiave, LAVORI[1].chiave, BAGNO]), articolo: improntaSenzaRighe(db, 'articolo', [RAZIONE]) };

    for (const l of LAVORI) {
      const r = db.prepare('SELECT esiti_json, effetti_json, paga_yen, paga_massima, dettagli, origine, seed_json FROM main.attivita WHERE chiave = ?').get(l.chiave) as RigaLavoro | undefined;
      if (!r) { esiti.push({ riga: l.chiave, esito: 'riga assente' }); continue; }
      if (r.esiti_json === l.esiti && r.effetti_json === '[]') continue; // già fatto
      const notaCome = l.nota === null || (r.dettagli ?? '').endsWith(l.nota);
      if (r.esiti_json !== null || r.effetti_json !== l.effettiPrima || r.paga_yen !== l.paga || r.paga_massima !== l.massima || r.origine !== l.origine || !notaCome) {
        esiti.push({ riga: l.chiave, esito: 'valori diversi da quelli attesi: resta', trovato: { esiti_json: r.esiti_json, effetti_json: r.effetti_json, paga: r.paga_yen, massima: r.paga_massima, origine: r.origine } });
        continue;
      }
      const dettagli = l.nota === null || r.dettagli === null ? r.dettagli : r.dettagli.slice(0, -l.nota.length);
      archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'attivita.effetti_json.364', { [l.chiave]: r.effetti_json as string });
      if (dettagli !== r.dettagli) archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'attivita.dettagli.364', { [l.chiave]: r.dettagli as string });
      let seed = r.seed_json;
      if (seed !== null) {
        // la fotografia di «Ripristina»: stessi effetti (vuoti) e senza la frase smentita; se non è quella attesa resta, e il verbale lo dice
        try {
          const foto = JSON.parse(seed) as Record<string, unknown>;
          if (foto.effetti_json === l.effettiPrima && l.notaFoto !== null && typeof foto.dettagli === 'string' && foto.dettagli.endsWith(l.notaFoto)) {
            seed = JSON.stringify({ ...foto, effetti_json: '[]', esiti_json: l.esiti, dettagli: foto.dettagli.slice(0, -l.notaFoto.length) });
          } else esiti.push({ riga: `${l.chiave} (fotografia)`, esito: 'fotografia diversa da quella attesa: resta' });
        } catch { esiti.push({ riga: `${l.chiave} (fotografia)`, esito: 'fotografia illeggibile: resta' }); }
      }
      if (db.prepare('UPDATE main.attivita SET esiti_json = ?, effetti_json = \'[]\', dettagli = ?, seed_json = ? WHERE chiave = ? AND esiti_json IS NULL AND effetti_json = ? AND seed_json IS ?').run(l.esiti, dettagli, seed, l.chiave, l.effettiPrima, r.seed_json).changes !== 1) errore(`${l.chiave} non si aggiorna`);
      toccate.attivita.push(l.chiave);
      esiti.push({ riga: l.chiave, esito: 'esiti scritti, Doti fisse tolte (le danno gli esiti)' });
    }

    const bagno = db.prepare('SELECT costo FROM main.attivita WHERE chiave = ?').get(BAGNO) as { costo: number | null } | undefined;
    if (!bagno) esiti.push({ riga: BAGNO, esito: 'riga assente' });
    else if (bagno.costo === null) {
      db.prepare('UPDATE main.attivita SET costo = 500 WHERE chiave = ? AND costo IS NULL').run(BAGNO);
      toccate.attivita.push(BAGNO);
      esiti.push({ riga: BAGNO, esito: 'costo 500 ¥' });
    } else if (bagno.costo !== 500) esiti.push({ riga: BAGNO, esito: 'costo diverso da quello atteso: resta', trovato: bagno.costo });

    const razione = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave = ?').get(RAZIONE) as { condizioni_json: string | null } | undefined;
    if (!razione) esiti.push({ riga: RAZIONE, esito: 'riga assente' });
    else if (razione.condizioni_json === '[]') {
      if (db.prepare('UPDATE main.articolo SET condizioni_json = ? WHERE chiave = ? AND condizioni_json = \'[]\'').run(CONDIZIONI_RAZIONE, RAZIONE).changes !== 1) errore('la Razione militare non si aggiorna');
      toccate.articolo.push(RAZIONE);
      esiti.push({ riga: RAZIONE, esito: 'condizioni: 04-17..08-14 e 12-07..12-19' });
    } else if (razione.condizioni_json !== CONDIZIONI_RAZIONE) esiti.push({ riga: RAZIONE, esito: 'condizioni diverse da quelle attese: restano', trovato: razione.condizioni_json });

    if (improntaSenzaRighe(db, 'attivita', [LAVORI[0].chiave, LAVORI[1].chiave, BAGNO]) !== prima.attivita) errore('altre righe di attivita sono cambiate');
    if (improntaSenzaRighe(db, 'articolo', [RAZIONE]) !== prima.articolo) errore('altre righe di articolo sono cambiate');

    if (toccate.attivita.length === 0 && toccate.articolo.length === 0 && esiti.length === 0) return;
    registraAudit(db, 'audit-l8-364-esiti-e-costi', { migrazione: MIGRAZIONE, toccate, esiti });
    logger.info({ migrazione: 364, toccate, esiti: esiti.length }, 'esiti dei lavori, costo del bagno e date della Razione militare');
  },
};
