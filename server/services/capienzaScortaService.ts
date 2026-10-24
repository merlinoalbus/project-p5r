// ============================================================
// Capienza della scorta — i posti della «riserva di Personae» secondo il rango di Igor nella partita
// ============================================================
//
// La regola sta nei dati di gioco: le abilità del Confidente `igor` (tabella `confidente_abilita`) dicono a quale rango «la
// capacità della riserva di Personae sale a N». Qui si leggono quelle abilità, non c'è nessun numero scritto nel codice. Il valore
// di partenza (prima del primo gradino) sta in `dati_guida`, chiave `capienza-scorta` (`{ posti, fonte }`, migrazione 230): si usa
// finché nessun gradino è raggiunto. Se la riga manca o è illeggibile, in quel caso `capienza` è null.
// ============================================================

import { prepared } from '../db/dbService.js';
import { verificaPartita } from './verificaPartita.js';
import type { CapienzaScortaDto } from '../../shared/types.js';

/** Il Confidente che governa la capienza della scorta. */
const CHIAVE_IGOR = 'igor';

/** Il numero di posti detto dalla descrizione di un'abilità («… riserva di Personae sale a 8»); null se l'abilità non parla della riserva. */
export function postiDallAbilita(descrizione: string): number | null {
  if (!/riserva di Personae/i.test(descrizione)) return null;
  const m = /\bsale a (\d+)/i.exec(descrizione);
  return m ? Number(m[1]) : null;
}

/** I posti di partenza della riserva, dai dati di gioco; null se la voce manca o non è un numero valido. */
function postiIniziali(): number | null {
  const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'capienza-scorta'").get() as { json: string } | undefined;
  if (!riga) return null;
  try {
    const posti = (JSON.parse(riga.json) as { posti?: unknown }).posti;
    return typeof posti === 'number' && Number.isInteger(posti) && posti > 0 ? posti : null;
  } catch {
    return null;
  }
}

/** La capienza della scorta della partita: rango di Igor, posti correnti, gradini documentati e prossimo gradino. */
export function capienzaScorta(partitaId: number): CapienzaScortaDto {
  verificaPartita(partitaId);
  const rango = (prepared('SELECT COALESCE(rango, 0) AS rango FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, CHIAVE_IGOR) as { rango: number } | undefined)?.rango ?? 0;
  const abilita = prepared('SELECT rango, nome, descrizione FROM confidente_abilita WHERE confidente_chiave = ? ORDER BY rango, ordine').all(CHIAVE_IGOR) as Array<{ rango: number; nome: string; descrizione: string }>;
  const gradini: CapienzaScortaDto['gradini'] = [];
  for (const a of abilita) {
    const posti = postiDallAbilita(a.descrizione);
    if (posti !== null) gradini.push({ rango: a.rango, capienza: posti, abilita: a.nome });
  }
  const raggiunti = gradini.filter((g) => g.rango <= rango);
  return {
    rangoIgor: rango,
    capienza: raggiunti.length > 0 ? Math.max(...raggiunti.map((g) => g.capienza)) : postiIniziali(),
    gradini,
    prossimo: gradini.find((g) => g.rango > rango) ?? null,
  };
}
