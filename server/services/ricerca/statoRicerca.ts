// ============================================================
// statoRicerca — lo stato adesso dei luoghi e dei negozi fra i risultati di una ricerca, per una partita (L11, B3, R11-10b/1)
// ============================================================
//
// La ricerca trova anche i luoghi chiusi: lo stato è un'informazione, mai un filtro. La regola è quella unica di L5 (`presenzaDelLuogo`,
// `presenzaDelNegozio`): il testo («Chiuso adesso · …», «Non ancora nel mondo · motivo») si legge da lì e non si riscrive. Sola lettura.
// Senza partita non c'è uno «adesso»: nessuno stato. Il segno «da verificare» delle Aree non dipende dalla partita e sta già nell'indice.
// ============================================================

import { lettureLuoghi, presenzaDelLuogo, presenzaDelNegozio } from '../luoghiService.js';
import { condizioniDiSblocco } from '../sbloccoLuoghi.js';
import { statoDisponibilitaPartita } from '../disponibilitaService.js';
import { verificaPartita } from '../verificaPartita.js';
import { orariDelLuogo } from '../../../shared/orariNegozio.js';
import type { PresenzaLuogoDto } from '../../../shared/types.js';
import type { StatoRicercaDto } from '../../../shared/ricerca.js';
import type { VoceIndice } from './indiceRicerca.js';

/** La chiave con cui lo stato di una voce si cerca nella mappa restituita. */
export const chiaveStato = (v: Pick<VoceIndice, 'tipo' | 'chiave'>): string => `${v.tipo}|${v.chiave}`;

/** Solo lo stato che dice qualcosa: un posto aperto (o senza orari che lo chiudano) non porta segni. */
function statoDa(p: PresenzaLuogoDto): StatoRicercaDto | null {
  if (p.sbloccato === false) return { tipo: 'non-ancora-aperto', testo: p.testo };
  if (p.aperto === false) return { tipo: 'chiuso-adesso', testo: p.testo };
  return null;
}

/**
 * Lo stato dei luoghi e dei negozi fra `voci` con la partita; 404 `partita-non-trovata` se la partita non c'è. Le letture costose (lo stato
 * della partita, i luoghi) si fanno una volta, e solo se fra le voci c'è almeno un luogo o un negozio.
 */
export function statoDeiRisultati(voci: readonly VoceIndice[], partita: number | undefined): Map<string, StatoRicercaDto> {
  const out = new Map<string, StatoRicercaDto>();
  if (partita === undefined) return out;
  verificaPartita(partita);
  const conPresenza = voci.filter((v) => v.presenza !== null);
  if (conPresenza.length === 0) return out;
  const l = lettureLuoghi(partita, undefined, statoDisponibilitaPartita(partita));
  for (const v of conPresenza) {
    const chiave = v.presenza!.chiave;
    let presenza: PresenzaLuogoDto | null = null;
    if (v.presenza!.tipo === 'luogo') {
      const r = l.righe.get(chiave);
      if (r) presenza = presenzaDelLuogo(condizioniDiSblocco(r, l.inviti), orariDelLuogo(r.orari_json ?? null), l.st);
    } else {
      const n = l.sediNegozi.get(chiave);
      const sede = n?.sede ? l.righe.get(n.sede) : undefined;
      if (n && sede) presenza = presenzaDelNegozio(sede, n.eccezione, l, n.sblocco);
    }
    const stato = presenza ? statoDa(presenza) : null;
    if (stato) out.set(chiaveStato(v), stato);
  }
  return out;
}
