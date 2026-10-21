import type { DisponibilitaDto, PresenzaLuogoDto } from '../../../shared/types.js';

/** Stessa composizione per visore e lista dell'Area; la presenza del luogo resta un dato distinto. */
export function conPresenzaPin(esito: DisponibilitaDto | undefined, presenza: PresenzaLuogoDto, nome: string, soloEventi?: string | null): DisponibilitaDto {
  const base = esito ?? { stato: 'disponibile' as const, requisiti: [] };
  const motivo = soloEventi ? `Solo durante gli eventi di ${soloEventi}`
    : presenza.sbloccato === false || presenza.aperto === false ? presenza.testo : null;
  if (!motivo) return base;
  return { stato: 'bloccato', requisiti: [...base.requisiti, { indice: base.requisiti.length, tipo: 'luogo', testo: `${nome}: ${motivo}`, stato: 'rosso', dettaglio: motivo, manuale: false, confermato: false }] };
}

export function conDisponibilitaNegozio(esito: DisponibilitaDto | undefined, negozio: DisponibilitaDto | undefined): DisponibilitaDto | undefined {
  if (!esito || !negozio) return esito ?? negozio;
  const stato = esito.stato === 'bloccato' || negozio.stato === 'bloccato' ? 'bloccato'
    : esito.stato === 'ignoto' || negozio.stato === 'ignoto' ? 'ignoto' : 'disponibile';
  return { stato, requisiti: [...esito.requisiti, ...negozio.requisiti.map((r, i) => ({ ...r, indice: esito.requisiti.length + i, testo: `Negozio: ${r.testo}` }))] };
}

export function senzaIngressoConcluso(esito: DisponibilitaDto | undefined, nome: string, motivo: string | undefined): DisponibilitaDto | undefined {
  if (!esito || !motivo) return esito;
  return { stato: 'bloccato', requisiti: [...esito.requisiti, { indice: esito.requisiti.length, tipo: 'palazzo', testo: `${nome} non ancora concluso`, stato: 'rosso', dettaglio: `${nome}: concluso (${motivo}), non ci si entra più`, manuale: false, confermato: false }] };
}
