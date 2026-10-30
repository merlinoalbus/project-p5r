// ============================================================
// calendarioFonti — la data (e il tipo) di un evento del Calendario dalla sua fonte (L9 · R9-22, R9-21/2)
// ============================================================
//
// Un evento di `evento_calendario` può portare la chiave della fonte (`fonte_chiave`, migrazione 211): il servizio del Calendario ne legge la data dalla
// fonte e non da quella copiata nella riga, così la data si modifica in un solo punto. Le chiavi:
//   - `esame:<esame>:inizio|fine` — primo e ultimo giorno d'esame (le righe `domanda` dell'esame, R9-18);
//   - `scadenza:<dungeon>` — `dungeon.finestra_al`;
//   - `furto:<dungeon>` — `dungeon.furto_consigliato_data` (migrazione 308), un consiglio; `lettera:<dungeon>` — `dungeon.lettera_entro`, una
//     scadenza (L13 O6-3: le date del Palazzo hanno una fonte sola; la 308 non le assegna a nessun evento esistente, perché nessuno ha titolo
//     e data che dicano esattamente il furto consigliato o il termine della lettera);
//   - `sblocco:confidente:<confidente>:1` — il requisito di rango 1 di tipo `data` (`confidente_requisito`);
//   - `vacanza:<giorno>` — il giorno stesso (vale finché il giorno non ha tempo libero intero).
// Una chiave che non si risolve (fonte tolta o cambiata) lascia l'evento alla data della sua riga.
// ============================================================

import { prepared } from '../db/dbService.js';
import { esami } from './domandeService.js';

export interface FonteEvento { data: string; tipo: 'esame' | 'scadenza' | 'sblocco' | 'vacanza' | 'consiglio' }

/** Le date del Palazzo che un evento può leggere oltre alla scadenza: la colonna e il tipo dell'evento. */
const DATE_PALAZZO = {
  furto: { colonna: 'furto_consigliato_data', tipo: 'consiglio' },
  lettera: { colonna: 'lettera_entro', tipo: 'scadenza' },
} as const satisfies Record<string, { colonna: string; tipo: FonteEvento['tipo'] }>;

/** Un risolutore con le letture fatte una volta sola (per una richiesta del Calendario). */
export function risolutoreFonti(): (chiave: string | null | undefined) => FonteEvento | null {
  let giorniEsami: Map<string, { inizio: string; fine: string }> | null = null;
  const esame = (): Map<string, { inizio: string; fine: string }> => {
    if (giorniEsami) return giorniEsami;
    giorniEsami = new Map();
    for (const e of esami()) {
      const date = [...e.date];
      if (date.length) giorniEsami.set(e.chiave, { inizio: date[0]!, fine: date[date.length - 1]! });
    }
    return giorniEsami;
  };
  return (chiave) => {
    if (!chiave) return null;
    const p = chiave.split(':');
    if (p[0] === 'esame' && p.length === 3 && (p[2] === 'inizio' || p[2] === 'fine')) {
      const g = esame().get(p[1]!);
      return g ? { data: g[p[2]], tipo: 'esame' } : null;
    }
    if (p[0] === 'scadenza' && p.length === 2) {
      const al = prepared('SELECT finestra_al FROM dungeon WHERE chiave = ?').pluck().get(p[1]) as string | null | undefined;
      return al ? { data: al, tipo: 'scadenza' } : null;
    }
    if ((p[0] === 'furto' || p[0] === 'lettera') && p.length === 2) {
      const { colonna, tipo } = DATE_PALAZZO[p[0]];
      // la colonna del furto arriva con la 308: su uno schema di prima la chiave non si risolve
      let d: string | null | undefined;
      try { d = prepared(`SELECT ${colonna} FROM dungeon WHERE chiave = ?`).pluck().get(p[1]) as string | null | undefined; } catch { return null; }
      return d ? { data: d, tipo } : null;
    }
    if (p[0] === 'sblocco' && p[1] === 'confidente' && p.length === 4 && p[3] === '1') {
      const j = prepared("SELECT dati_json FROM confidente_requisito WHERE confidente_chiave = ? AND rango = 1 AND tipo = 'data' ORDER BY indice LIMIT 1").pluck().get(p[2]) as string | undefined;
      if (!j) return null;
      try { const dal = (JSON.parse(j) as { dal?: string }).dal; return dal ? { data: dal, tipo: 'sblocco' } : null; } catch { return null; }
    }
    if (p[0] === 'vacanza' && p.length === 2) return prepared('SELECT 1 FROM giorno WHERE data = ?').get(p[1]) ? { data: p[1]!, tipo: 'vacanza' } : null;
    return null;
  };
}
