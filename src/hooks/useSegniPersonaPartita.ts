// ============================================================
// useSegniPersonaPartita — se una Persona è in scorta o nel Registro della partita attiva (L10-04)
// ============================================================
//
// I segni «In scorta · Liv. N» e «Nel Registro · Liv. N» delle piastrelle del Compendio e della testa della scheda Persona leggono
// da qui, una sola lettura per la pagina: la scorta (`GET /partite/:id/persona`) e il compendio personale (`GET /partite/:id/compendio`),
// gli stessi dati delle schede della Partita. Senza partita attiva non si legge niente e non c'è nessun segno.
// ============================================================

import { useMemo } from 'react';
import { getCompendioPartita, getPossedute } from '../services/api';
import { useCarica } from './useCarica';
import { usePartitaStore } from '../stores/partitaStore';

/** Lo stato di una Persona nella partita: il livello in scorta (null se non c'è) e la registrazione nel Registro (null se non c'è;
 *  `livello` null quando la registrazione non ha un livello). */
export interface SegniPersona {
  scorta: number | null;
  registro: { livello: number | null } | null;
}

/** I segni a parole per il nome di un collegamento («, in scorta al livello 19, nel Registro al livello 17»), vuoto senza segni: il
 *  collegamento della piastrella ha un `aria-label` proprio, che altrimenti li coprirebbe. */
export function segniPerNome(segni?: SegniPersona): string {
  if (!segni) return '';
  const parti: string[] = [];
  if (segni.scorta !== null) parti.push(`in scorta al livello ${segni.scorta}`);
  if (segni.registro) parti.push(segni.registro.livello === null ? 'nel Registro' : `nel Registro al livello ${segni.registro.livello}`);
  return parti.map((p) => `, ${p}`).join('');
}

/** I segni di ogni Persona della partita attiva (per id della Persona), con la rilettura dopo un'aggiunta; `segni` è null senza partita
 *  o finché la lettura non è arrivata. Nella mappa ci sono solo le Persona con almeno un segno. */
export function useSegniPersonaPartita(): { segni: ReadonlyMap<number, SegniPersona> | null; ricarica: () => Promise<void> } {
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const lettura = useCarica(async () => {
    if (partitaId === null) return null;
    const [scorta, registro] = await Promise.all([getPossedute(partitaId), getCompendioPartita(partitaId)]);
    return { scorta, registro };
  }, [partitaId]);
  const dati = lettura.dati;
  const segni = useMemo(() => {
    if (partitaId === null || !dati) return null;
    const mappa = new Map<number, SegniPersona>();
    const di = (id: number): SegniPersona => {
      const s = mappa.get(id) ?? { scorta: null, registro: null };
      mappa.set(id, s);
      return s;
    };
    // una Persona sta in scorta una volta per partita; se mai ce ne fossero due, vale il livello più alto
    for (const p of dati.scorta) { const s = di(p.personaId); s.scorta = Math.max(s.scorta ?? 0, p.livello); }
    for (const r of dati.registro) if (r.registrata) di(r.personaId).registro = { livello: r.livelloRegistrato };
    return mappa;
  }, [partitaId, dati]);
  return { segni, ricarica: lettura.ricarica };
}
