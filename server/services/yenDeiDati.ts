// ============================================================
// yenDeiDati — gli yen che un film, un'attività o una Richiesta portano già (L13, ondata 3, decisione 2)
// ============================================================
//
// Una definizione sola, letta dal controllo del server (`motoreDiario`, rifiuto `yen-gia-strutturati`) e dagli elenchi dell'editor della voce
// (`elenchiAzione`, avviso subito): il prezzo del film, la paga del lavoro o il costo dell'attività, la ricompensa in yen della Richiesta.
// ============================================================

import { prepared } from '../db/dbService.js';
import type { DatoConYen } from '../../shared/effettiVoce.js';

/**
 * L'espressione SQL degli yen di ogni dato, sulla sua tabella (0 e NULL = nessuno). L13 (decisione 18): per un'attività anche il prezzo più alto
 * fra gli articoli dei suoi esiti (le sfide della Big Bang Burger: registrando il turno si scala da solo, `attivitaService.yenDelTurno`), così un
 * effetto «yen» accanto a quel turno resta rifiutato e niente si conta due volte.
 */
export const SQL_YEN_DEL_DATO: Readonly<Record<DatoConYen, string>> = {
  film: 'NULLIF(prezzo, 0)',
  attivita: "COALESCE(NULLIF(paga_yen, 0), NULLIF(costo, 0), (SELECT MAX(a.prezzo) FROM main.articolo a JOIN json_each(CASE WHEN json_valid(attivita.esiti_json) THEN json_extract(attivita.esiti_json, '$.esiti') END) e ON a.chiave = json_extract(e.value, '$.articolo') WHERE a.prezzo > 0))",
  richiesta: 'NULLIF(yen, 0)',
};

/** Gli yen che il dato porta già (null se nessuno o se il dato non c'è). */
export function yenDelDato(tipo: DatoConYen, chiave: string): number | null {
  const r = prepared(`SELECT ${SQL_YEN_DEL_DATO[tipo]} AS yen FROM main.${tipo} WHERE chiave = ?`).get(chiave) as { yen: number | null } | undefined;
  return typeof r?.yen === 'number' ? r.yen : null;
}
