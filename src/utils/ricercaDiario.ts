// ============================================================
// ricercaDiario — gli aiuti della ricerca nel Diario lato pagina: tipo dall'indirizzo, testo sufficiente, ritorno ai risultati (2026-10-29)
// ============================================================
//
// La vista e la barra stanno in `components/guida/RicercaDiario.tsx`, la lettura in `hooks/useRicercaDiario.ts`, il confronto e la forma
// della risposta in `shared/ricercaDiario.ts`.
// ============================================================

import { TIPI_AZIONE, type TipoAzione } from '../../shared/effettiAzione';
import { MINIMO_CARATTERI_RICERCA_DIARIO } from '../../shared/ricercaDiario';

/** Il nome del tipo di una voce, dall'elenco condiviso con il server. */
export const nomeTipoVoce = (t: string): string => TIPI_AZIONE.find((x) => x.chiave === t)?.nome ?? t;

/** Il tipo letto dall'indirizzo (o da un selettore), se è uno di quelli noti; altrimenti null. */
export function tipoDaIndirizzo(valore: string | null): TipoAzione | null {
  return TIPI_AZIONE.some((t) => t.chiave === valore) ? (valore as TipoAzione) : null;
}

/** Vero se il testo basta per cercare (lo stesso minimo del server). */
export const testoSufficiente = (q: string): boolean => q.trim().length >= MINIMO_CARATTERI_RICERCA_DIARIO;

/** Da dove si è aperta una voce trovata: la ricerca a cui «Torna ai risultati» riporta e la voce su cui rimettere il fuoco. */
export interface RitornoRicercaDiario { q: string; tipo: TipoAzione | null; voce: string }

/** Il ritorno alla ricerca dallo stato della cronologia, se c'è e ha la forma giusta; altrimenti null. */
export function leggiRitornoRicerca(stato: unknown): RitornoRicercaDiario | null {
  const r = (stato as { ritornoRicerca?: unknown } | null)?.ritornoRicerca as Partial<RitornoRicercaDiario> | undefined;
  if (!r || typeof r.q !== 'string' || typeof r.voce !== 'string') return null;
  return { q: r.q, tipo: tipoDaIndirizzo(typeof r.tipo === 'string' ? r.tipo : null), voce: r.voce };
}

/** La parte dopo «?» dell'indirizzo di una ricerca ('' senza testo né tipo). */
export function parametriRicerca(q: string, tipo: TipoAzione | null): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set('q', q);
  if (tipo) p.set('tipo', tipo);
  const s = p.toString();
  return s ? `?${s}` : '';
}
