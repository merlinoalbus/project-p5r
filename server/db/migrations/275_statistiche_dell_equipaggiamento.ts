// ============================================================
// Migrazione 275 — le statistiche dell'equipaggiamento escono dal testo dell'effetto: vanno in `statistiche_json.testo` (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 dell'utente (gli effetti restano testo, un solo punto; «le altre raccomandazioni si applicano») e progetto dell'ondata 5,
// lotto F: «Statistiche dell'equipaggiamento separate» (censimento O5-07: «le statistiche dell'equipaggiamento scritte dentro l'effetto
// ("Att 140 / Prec 84 / +…") si separano»; rilievo 2 della revisione del lotto F). Sulla copia alla 274: 98 schede di armi, armi da fuoco
// e protezioni dell'equipaggiamento con l'effetto «Att 350 / Prec 85 / Colpi 5 / tutte le statistiche +6» e `statistiche_json.testo`
// vuoto, mentre le 197 schede del listino tengono le statistiche nel posto loro («Attacco 52, Precisione 96»).
//
// Che cosa fa: dall'inizio dell'effetto si tolgono i pezzi «Att N», «Dif N», «Prec N», «Sch N», «Colpi N» (separati da « / »), che
// diventano il testo delle statistiche con le parole del listino: Attacco, Difesa, Precisione, Elusione (la «Sch», schivata, è l'Elusione
// della guida), Colpi. Il resto resta l'effetto (anche vuoto, se l'arma non ha altro). «Per chi» (`statistiche_json.per`) resta com'è.
// Conservativa: solo schede della guida mai corrette dall'utente (`origine = 'seed'`, `seed_json` vuoto) e senza un testo delle statistiche;
// se l'effetto non comincia con le statistiche la scheda non si tocca. Prima e dopo di ogni scheda nell'audit
// `dati_guida.audit-275-statistiche`. Nessuna voce del Diario cambia. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-275-statistiche';
const errore = (motivo: string): never => { throw new Error(`275: ${motivo}; nessuna modifica applicata.`); };

/** Le sigle delle statistiche nell'effetto e la parola del listino. */
const PAROLA: Readonly<Record<string, string>> = { Att: 'Attacco', Dif: 'Difesa', Prec: 'Precisione', Sch: 'Elusione', Colpi: 'Colpi' };
const PEZZO = /^(Att|Dif|Prec|Sch|Colpi) (\d+)$/;

interface Scheda { chiave: string; effetto: string; statistiche_json: string | null }

/** Separa le statistiche iniziali dell'effetto: null se l'effetto non comincia con almeno due statistiche. */
function separaStatistiche(effetto: string): { testo: string; resto: string } | null {
  const pezzi = effetto.split(' / ');
  const statistiche: string[] = [];
  let i = 0;
  for (; i < pezzi.length; i++) {
    const m = PEZZO.exec(pezzi[i]!.trim());
    if (!m) break;
    statistiche.push(`${PAROLA[m[1]!]} ${m[2]}`);
  }
  if (statistiche.length < 2) return null;
  return { testo: statistiche.join(', '), resto: pezzi.slice(i).join(' / ').trim() };
}

export const migration275: Migration = {
  id: 275,
  name: 'statistiche_dell_equipaggiamento',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 275 }, 'catalogo assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const schede = db.prepare("SELECT chiave, effetto, statistiche_json FROM main.catalogo_oggetto WHERE fonte_tipo = 'equipaggiamento' AND origine = 'seed' AND seed_json IS NULL ORDER BY chiave").all() as Scheda[];
    const esiti: Array<{ chiave: string; esito: string; prima?: { effetto: string; statistiche_json: string | null }; dopo?: { effetto: string; statistiche_json: string } }> = [];
    for (const s of schede) {
      const separate = separaStatistiche(s.effetto);
      if (!separate) continue;
      let statistiche: Record<string, unknown>;
      try {
        const x = JSON.parse(s.statistiche_json ?? '{}') as unknown;
        if (!x || typeof x !== 'object' || Array.isArray(x)) { esiti.push({ chiave: s.chiave, esito: 'statistiche illeggibili: non toccata' }); continue; }
        statistiche = x as Record<string, unknown>;
      } catch { esiti.push({ chiave: s.chiave, esito: 'statistiche illeggibili: non toccata' }); continue; }
      if (typeof statistiche.testo === 'string' && statistiche.testo.trim() !== '') { esiti.push({ chiave: s.chiave, esito: 'ha già il testo delle statistiche: non toccata' }); continue; }
      const nuove = JSON.stringify({ ...statistiche, testo: separate.testo });
      const n = db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, statistiche_json = ?, updated_at = ? WHERE chiave = ? AND effetto = ? AND statistiche_json IS ? AND origine = 'seed' AND seed_json IS NULL")
        .run(separate.resto, nuove, new Date().toISOString(), s.chiave, s.effetto, s.statistiche_json).changes;
      if (n !== 1) errore(`la scheda ${s.chiave} non si aggiorna`);
      esiti.push({ chiave: s.chiave, esito: 'statistiche separate', prima: { effetto: s.effetto, statistiche_json: s.statistiche_json }, dopo: { effetto: separate.resto, statistiche_json: nuove } });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const separate = esiti.filter((e) => e.esito === 'statistiche separate');
    const conteggi = {
      separate: separate.length,
      senzaAltroEffetto: separate.filter((e) => e.dopo?.effetto === '').length,
      nonToccate: esiti.length - separate.length,
      ancoraNelTesto: db.prepare("SELECT COUNT(*) FROM main.catalogo_oggetto WHERE nascosto = 0 AND (effetto GLOB 'Att [0-9]*' OR effetto GLOB 'Dif [0-9]*')").pluck().get() as number,
    };
    if (separate.length) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 275, { conteggi, esiti }, separate.length);
    logger.info({ migrazione: 275, ...conteggi }, 'Catalogo: statistiche dell’equipaggiamento separate dall’effetto');
  },
};
