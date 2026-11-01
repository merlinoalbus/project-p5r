// ============================================================
// Capienza della scorta — i posti della «riserva di Personae» secondo il rango di Igor nella partita
// ============================================================
//
// La regola sta nei dati di gioco, in un punto solo: il blocco `dati_guida.capienza-scorta` (`{ posti, gradini, fonte }`): `posti` è il valore
// di partenza (migrazione 230), `gradini` dice a quale rango di Igor la riserva sale a quanti posti (migrazione 336, L8-05). Prima i gradini si
// ricavavano a ogni lettura dalla descrizione delle abilità di Igor con un'espressione regolare: riscrivendo la descrizione la capienza
// cambiava senza avviso. Ora la descrizione è solo testo; dell'abilità di quel rango si legge il nome, per dire quale abilità la fa salire.
// Se il blocco manca o è illeggibile la capienza è null; senza gradini vale solo il valore di partenza.
// ============================================================

import { prepared } from '../db/dbService.js';
import { verificaPartita } from './verificaPartita.js';
import type { CapienzaScortaDto } from '../../shared/types.js';

/** Il Confidente che governa la capienza della scorta. */
const CHIAVE_IGOR = 'igor';

/** Il blocco della capienza, letto e controllato: posti di partenza (null se non è un numero valido) e gradini validi, dal rango più basso. */
function regolaCapienza(): { posti: number | null; gradini: Array<{ rango: number; posti: number }> } {
  const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'capienza-scorta'").get() as { json: string } | undefined;
  if (!riga) return { posti: null, gradini: [] };
  let v: { posti?: unknown; gradini?: unknown };
  try { v = JSON.parse(riga.json) as typeof v; } catch { return { posti: null, gradini: [] }; }
  const intero = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
  const gradini = (Array.isArray(v.gradini) ? v.gradini : [])
    .filter((g): g is { rango: number; posti: number } => !!g && typeof g === 'object' && intero((g as { rango?: unknown }).rango) && intero((g as { posti?: unknown }).posti))
    .map((g) => ({ rango: g.rango, posti: g.posti }))
    .sort((a, b) => a.rango - b.rango);
  return { posti: intero(v.posti) ? v.posti : null, gradini };
}

/** La capienza della scorta della partita: rango di Igor, posti correnti, gradini documentati e prossimo gradino. */
export function capienzaScorta(partitaId: number): CapienzaScortaDto {
  verificaPartita(partitaId);
  const rango = (prepared('SELECT COALESCE(rango, 0) AS rango FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, CHIAVE_IGOR) as { rango: number } | undefined)?.rango ?? 0;
  const regola = regolaCapienza();
  // il nome dell'abilità che Igor dà a quel rango (più abilità allo stesso rango: i nomi insieme), solo per dirla accanto al gradino
  const nomi = new Map<number, string[]>();
  for (const a of prepared('SELECT rango, nome FROM confidente_abilita WHERE confidente_chiave = ? ORDER BY rango, ordine').all(CHIAVE_IGOR) as Array<{ rango: number; nome: string }>) {
    nomi.set(a.rango, [...(nomi.get(a.rango) ?? []), a.nome]);
  }
  const gradini: CapienzaScortaDto['gradini'] = regola.gradini.map((g) => ({ rango: g.rango, capienza: g.posti, abilita: (nomi.get(g.rango) ?? []).join(' · ') }));
  const raggiunti = gradini.filter((g) => g.rango <= rango);
  return {
    rangoIgor: rango,
    capienza: raggiunti.length > 0 ? Math.max(...raggiunti.map((g) => g.capienza)) : regola.posti,
    gradini,
    prossimo: gradini.find((g) => g.rango > rango) ?? null,
  };
}
