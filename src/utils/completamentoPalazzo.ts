// ============================================================
// completamentoPalazzo — i due livelli di un Palazzo nella partita e l'anello, letti dai numeri del server (L4, §1.5 e §8.10)
// ============================================================
//
// Decisione dell'utente del 2026-10-20 (`lotti/L4/modifiche.md` §8.10, strada B): **concluso** = Tesoro del Palazzo e boss finale (gli
// effetti: ingressi, mappa di Tokyo, requisiti); **completato** = concluso e tutti gli oggetti permanenti (solo l'anello, la percentuale e
// il segno «Completato»). I numeri li calcola il server con la funzione unica (`shared/completamentoGuida.ts`): qui si leggono, non si
// ricalcolano. Per i Memento (`completamento` assente) l'anello resta quello degli obiettivi dei dedali, come prima.
// ============================================================

import type { DungeonRiassuntoDto } from '../types';

/** I campi del riassunto (o del dettaglio) che servono qui. */
type PalazzoLetto = Pick<DungeonRiassuntoDto, 'nome' | 'raccolta' | 'completamento' | 'completato' | 'concluso'>;

/** L'anello d'avanzamento: la quota (0–1), i numeri e l'etichetta per chi non vede; null senza partita o senza niente da contare. Nei
 *  Palazzi conta gli oggetti permanenti fatti (un oggetto una volta, R4-24); nei Memento gli obiettivi dei dedali (invariati, R4-30). */
export function anelloPalazzo(d: PalazzoLetto, memento = false): { quota: number; fatti: number; totale: number; etichetta: string } | null {
  if (d.completamento) {
    const { oggetti, fatti } = d.completamento;
    if (fatti === null || oggetti <= 0) return null;
    return { quota: Math.min(1, fatti / oggetti), fatti, totale: oggetti, etichetta: `Avanzamento in ${d.nome}: ${fatti} oggetti permanenti fatti su ${oggetti}` };
  }
  const { presi, totale } = d.raccolta;
  if (presi === null || totale <= 0) return null;
  return { quota: presi / totale, fatti: presi, totale, etichetta: `Avanzamento in ${d.nome}: ${presi} ${memento ? 'elementi fatti' : 'da raccogliere presi'} su ${totale}` };
}

/** Il segno del Palazzo nella partita: «Completato» (concluso e tutto fatto) o «Concluso» (Tesoro e boss finale, con quel che manca al
 *  completamento), col perché per il suggerimento; null se non è concluso o senza partita. */
export function livelloPalazzo(d: PalazzoLetto): { testo: 'Completato' | 'Concluso'; perche: string } | null {
  if (d.completato) return { testo: 'Completato', perche: d.completato };
  if (!d.concluso) return null;
  const c = d.completamento;
  const mancano = c && c.fatti !== null ? c.oggetti - c.fatti : 0;
  return { testo: 'Concluso', perche: mancano > 0 ? `${d.concluso} · al completamento mancano ${mancano === 1 ? '1 oggetto permanente' : `${mancano} oggetti permanenti`}` : d.concluso };
}
