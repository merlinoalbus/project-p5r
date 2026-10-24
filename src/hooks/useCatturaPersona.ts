// ============================================================
// useCatturaPersona — lo stato «catturata» di una Persona dal compendio della partita, e il gesto che lo cambia (L8, R8-13, R8-14)
// ============================================================
//
// Per le viste che non portano già l'elenco delle catturate (Battaglia, pagina Ombra, scheda Persona): legge il compendio della partita, registra con un
// tocco (la strada unica: `PUT /partite/:id/compendio/:personaId`, con la chiave dell'Ombra dell'incontro perché il server controlli la catturabilità)
// e per togliere chiede la conferma con l'avviso uguale in ogni vista. Una sola operazione alla volta.
// ============================================================

import { useMemo, useState } from 'react';
import { aggiornaCompendio, getCompendioPartita } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { useCarica } from './useCarica';
import type { PiastrellaCatturabile } from '../components/guida/PiastrelleCattura';

export interface CatturaPersona {
  /** Le Persona registrate (id); null senza partita o finché il compendio non è arrivato. */
  catturate: ReadonlySet<number> | null;
  /** La Persona il cui gesto è in corso. */
  occupata: number | null;
  /** La piastrella per cui si chiede di confermare la rimozione. */
  daTogliere: PiastrellaCatturabile | null;
  /** Il tocco su una piastrella: registra subito, o chiede conferma per togliere. */
  tocca: (v: PiastrellaCatturabile, catturata: boolean) => void;
  conferma: () => void;
  annulla: () => void;
}

export function useCatturaPersona(partitaId: number | null): CatturaPersona {
  const registrate = useCarica(() => (partitaId ? getCompendioPartita(partitaId) : Promise.resolve([])), [partitaId]);
  const catturate = useMemo(() => (partitaId && registrate.dati ? new Set(registrate.dati.filter((c) => c.registrata).map((c) => c.personaId)) : null), [partitaId, registrate.dati]);
  const [occupata, setOccupata] = useState<number | null>(null);
  const [daTogliere, setDaTogliere] = useState<PiastrellaCatturabile | null>(null);

  const scrivi = async (v: PiastrellaCatturabile, registrata: boolean): Promise<void> => {
    if (!partitaId || !v.persona || occupata !== null) return;
    setOccupata(v.persona.id);
    try {
      registrate.imposta(await aggiornaCompendio(partitaId, v.persona.id, registrata ? { registrata, ...(v.ombra ? { ombra: v.ombra } : {}) } : { registrata }));
      setDaTogliere(null);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Compendio non aggiornato.');
    } finally { setOccupata(null); }
  };

  return {
    catturate, occupata, daTogliere,
    tocca: (v, catturata) => { if (catturata) void scrivi(v, true); else setDaTogliere(v); },
    conferma: () => { if (daTogliere) void scrivi(daTogliere, false); },
    annulla: () => setDaTogliere(null),
  };
}
