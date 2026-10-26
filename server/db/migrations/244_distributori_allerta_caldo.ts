// ============================================================
// Migrazione 244 — i distributori automatici restano vuoti con l'ondata di calore e la notte torrida (Ondata 5, Lotto B; decisione 21)
// ============================================================
//
// Guida italiana, pagina «Effetti del meteo» [M]: durante l'ondata di calore (di giorno) e la notte torrida (di sera) i distributori
// automatici sono esauriti. Le due condizioni «senza allerta» le avevano solo i cinque articoli del distributore del sottopasso
// (`catalogoOggetti121.ts`); qui si aggiungono, uguali, a ogni articolo dei distributori (negozi di tipo `distributore`) che non le ha.
// Ogni distributore ha la sua scorta (regola della 243, 2 pezzi, lunedì): «stessa offerta» non vuol dire scorta comune.
//
// Conservativa: le condizioni che l'articolo ha già restano, e le due si aggiungono in coda solo se mancano (idempotente). Una condizione
// salvata non leggibile ferma tutto. Nessuna voce del Diario e nessun dato delle partite cambia. Audit in `dati_guida.audit-244-distributori`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAudit } from './rifornimentoOndata5.js';

const AUDIT = 'audit-244-distributori';
const ALLERTE = ['ondata-di-calore', 'notte-torrida'] as const;
const errore = (motivo: string): never => { throw new Error(`244: ${motivo}; nessuna modifica applicata.`); };

export const migration244: Migration = {
  id: 244,
  name: 'distributori_allerta_caldo',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !esisteTabella(db, 'negozio')) { logger.warn({ migrazione: 244 }, 'articoli assenti: nessuna condizione aggiunta'); return; }
    const diarioPrima = improntaDiario(db);
    const righe = db.prepare(`SELECT a.chiave, a.condizioni_json FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
      WHERE n.tipo = 'distributore' ORDER BY a.chiave`).all() as Array<{ chiave: string; condizioni_json: string | null }>;
    const scrivi = db.prepare('UPDATE main.articolo SET condizioni_json = ? WHERE chiave = ? AND condizioni_json IS ?');
    const esiti: Array<{ articolo: string; esito: string }> = [];
    let aggiornati = 0;
    for (const r of righe) {
      let condizioni: Array<Record<string, unknown>>;
      try { condizioni = r.condizioni_json ? JSON.parse(r.condizioni_json) as Array<Record<string, unknown>> : []; } catch { return errore(`le condizioni di ${r.chiave} non si leggono`); }
      if (!Array.isArray(condizioni)) errore(`le condizioni di ${r.chiave} non sono un elenco`);
      const mancano = ALLERTE.filter((a) => !condizioni.some((c) => c.tipo === 'meteo' && c.condizione === 'senza-allerta' && c.allerta === a));
      if (!mancano.length) { esiti.push({ articolo: r.chiave, esito: 'allerte già presenti' }); continue; }
      const dopo = [...condizioni, ...mancano.map((allerta) => ({ tipo: 'meteo', condizione: 'senza-allerta', allerta }))];
      if (scrivi.run(JSON.stringify(dopo), r.chiave, r.condizioni_json).changes !== 1) errore(`l'articolo ${r.chiave} non si aggiorna`);
      aggiornati++;
      esiti.push({ articolo: r.chiave, esito: `aggiunte: ${mancano.join(', ')}` });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    scriviAudit(db, AUDIT, 244, { conteggi: { articoliDeiDistributori: righe.length, aggiornati, giaCompleti: righe.length - aggiornati }, esiti });
    logger.info({ migrazione: 244, articoli: righe.length, aggiornati }, 'Distributori: allerte del caldo');
  },
};
