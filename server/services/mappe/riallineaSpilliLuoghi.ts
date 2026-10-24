// ============================================================
// riallineaSpilliLuoghi — gli spilli di seed dei luoghi seguono il catalogo dei tipi di luogo
// ============================================================
//
// Una regola dei dati che si rifà a ogni avvio e dopo ogni importazione (`regoleAllAvvio`): quando la corrispondenza fra tipo di luogo e tipo di
// spillo (`shared/tipiLuogo`) cambia, si tocca **solo** lo spillo rimasto al tipo della vecchia corrispondenza; i pacchetti possono assegnare tipi
// più fini (il bagno pubblico è «terme», non «lavanderia») e quelli restano. Non tocca gli spilli dell'utente.
// Viveva in `sincronizzaMappe.ts`, tolto da L11 · B9 (la migrazione 027 ne ha una copia congelata).
// ============================================================

import { nowIso } from '../../db/dbService.js';
import type { AppDatabase } from '../../db/dbService.js';
import { spilloPerLuogo } from '../../../shared/tipiLuogo.js';

/** Un tipo di luogo che oggi ha uno spillo proprio, e quello con cui il pin nasceva prima (2026-09-12):
 *  la scuola era «attività» (il «servizio» resta sull'icona generica dell'attività: il Leblanc e la palestra non sono lavanderie). */
const VECCHIA_CORRISPONDENZA: Record<string, string> = { scuola: 'attivita' };

/** Riallinea i pin di seed dei luoghi al catalogo dei tipi; restituisce quanti ne ha cambiati. Senza le tabelle `spillo` e `luogo` non fa niente. */
export function riallineaSpilliLuoghi(db: AppDatabase): number {
  const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((r) => r.name));
  if (!tabelle.has('spillo') || !tabelle.has('luogo')) return 0;
  const agg = db.prepare(`UPDATE spillo SET tipo = ?, updated_at = ? WHERE origine = 'seed' AND riferimento_tipo = 'luogo' AND tipo = ?
    AND riferimento_chiave IN (SELECT chiave FROM luogo WHERE tipo = ?)`);
  const t = nowIso();
  let n = 0;
  for (const [tipoLuogo, vecchio] of Object.entries(VECCHIA_CORRISPONDENZA)) {
    const nuovo = spilloPerLuogo(tipoLuogo);
    if (nuovo !== vecchio) n += agg.run(nuovo, t, vecchio, tipoLuogo).changes;
  }
  return n;
}
