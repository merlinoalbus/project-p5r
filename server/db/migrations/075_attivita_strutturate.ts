// ============================================================
// 075 — un'attività ha una paga in yen, dei dettagli e un modo di essere contata
// ============================================================
//
// `attivita.paga` era una frase in quattro forme («3.500 yen a turno (fino a 7.400 yen con quiz
// perfetto)»): diventa `paga_yen` e `paga_massima`. `regole`, `premi`, `altri_effetti` e le
// spiegazioni delle Doti che non sono effetti valutabili (`doti_json[].condizione`) confluiscono
// in `dettagli`, un testo solo con i suoi titoli. `tracciamento` dice come la partita conta
// l'attività (`shared/attivita.ts`): per sessioni i videogiochi, per volte mini-giochi, lavori e
// sfide (le attività che le condizioni citano), per niente il resto. Tipo e fascia fuori catalogo
// finiscono nel log: non si correggono a caso.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';
import { eFasciaAttivita, eTipoAttivita, tracciamentoPerTipo } from '../../../shared/attivita.js';

const numero = (s: string): number => Number(s.replace(/\./g, ''));

/** «3.500 yen a turno (fino a 7.400 yen con quiz perfetto)» → 3500 e 7400; «7.200 yen a turno (12.000 yen di domenica)» → 7200 e 12000. */
export function leggiPaga(testo: string | null | undefined): { pagaYen: number | null; pagaMassima: number | null } {
  if (!testo) return { pagaYen: null, pagaMassima: null };
  const base = testo.match(/([\d.]+)\s*yen/i);
  if (!base) return { pagaYen: null, pagaMassima: null };
  const massima = testo.slice(base.index! + base[0].length).match(/([\d.]+)\s*yen/i);
  return { pagaYen: numero(base[1]), pagaMassima: massima ? numero(massima[1]) : null };
}

export function componiDettagli(r: { regole: string | null; premi: string | null; altri_effetti: string | null; doti_json: string | null }): string | null {
  const parti: string[] = [];
  if (r.regole && r.regole.trim()) parti.push(`Come funziona: ${r.regole.trim()}`);
  if (r.premi && r.premi.trim()) parti.push(`Premi: ${r.premi.trim()}`);
  if (r.altri_effetti && r.altri_effetti.trim()) parti.push(`Altri effetti: ${r.altri_effetti.trim()}`);
  let doti: Array<{ dote?: string | null; condizione?: string | null }> = [];
  try { doti = r.doti_json ? (JSON.parse(r.doti_json) as typeof doti) : []; } catch { doti = []; }
  const note = doti.filter((d) => d.condizione && d.condizione.trim()).map((d) => (d.dote ? `${d.dote.charAt(0).toUpperCase()}${d.dote.slice(1)}: ${d.condizione!.trim()}` : d.condizione!.trim()));
  if (note.length) parti.push(`Note sulle Doti: ${note.join(' · ')}`);
  return parti.length ? parti.join('\n\n') : null;
}

export const migration075: Migration = {
  id: 75,
  name: 'attivita_strutturate',
  up(db) {
    aggiungiColonna(db, 'attivita', 'paga_yen', 'INTEGER');
    aggiungiColonna(db, 'attivita', 'paga_massima', 'INTEGER');
    aggiungiColonna(db, 'attivita', 'dettagli', 'TEXT');
    aggiungiColonna(db, 'attivita', 'tracciamento', "TEXT NOT NULL DEFAULT 'nessuno' CHECK (tracciamento IN ('nessuno','svolta','sessioni'))");

    const righe = db.prepare('SELECT chiave, tipo, fascia, paga, regole, premi, altri_effetti, doti_json, dettagli, paga_yen, tracciamento FROM attivita').all() as Array<{ chiave: string; tipo: string; fascia: string | null; paga: string | null; regole: string | null; premi: string | null; altri_effetti: string | null; doti_json: string | null; dettagli: string | null; paga_yen: number | null; tracciamento: string }>;
    // `tracciamento` nasce con il predefinito «nessuno»: si imposta dal tipo solo dove nessuno lo ha ancora scelto
    const scrivi = db.prepare("UPDATE attivita SET paga_yen = COALESCE(paga_yen, ?), paga_massima = COALESCE(paga_massima, ?), dettagli = COALESCE(dettagli, ?), tracciamento = CASE WHEN tracciamento = 'nessuno' THEN ? ELSE tracciamento END WHERE chiave = ?");
    const fuoriCatalogo: string[] = [];
    let conPaga = 0;
    for (const r of righe) {
      const paga = leggiPaga(r.paga);
      if (paga.pagaYen !== null) conPaga++;
      if (!eTipoAttivita(r.tipo)) fuoriCatalogo.push(`${r.chiave}: tipo «${r.tipo}»`);
      if (r.fascia !== null && !eFasciaAttivita(r.fascia)) fuoriCatalogo.push(`${r.chiave}: fascia «${r.fascia}»`);
      scrivi.run(paga.pagaYen, paga.pagaMassima, componiDettagli(r), tracciamentoPerTipo(r.tipo), r.chiave);
    }
    logger.info({ attivita: righe.length, conPaga, fuoriCatalogo: fuoriCatalogo.length }, 'migrazione 075: attività strutturate');
    if (fuoriCatalogo.length) logger.warn({ fuoriCatalogo }, 'migrazione 075: tipo o fascia fuori catalogo');
  },
};
