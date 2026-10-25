// ============================================================
// InfoOmbraPersona — le debolezze di un'Ombra o di una Persona, lette dal compendio (L8, R8-08)
// ============================================================
//
// Nessuna vista ha una copia propria delle affinità: la griglia viene dalla Persona del compendio, con sopra le sole differenze dell'Ombra (le 4
// eccezioni di G-019 e le non reclutabili, dichiarate «proprie»). Si apre dal segno «i» delle piastrelle (dedali, Palazzi, Battaglia).
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getOmbra, getPersona } from '../../services/api';
import { AffinitaGriglia } from '../compendio/AffinitaGriglia';
import type { AffinitaDto } from '../../types';
import { CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  /** La chiave dell'Ombra (se la voce ne ha una) o, altrimenti, la Persona del compendio. */
  ombra?: string | null;
  personaId?: number | null;
  partitaId?: number | null;
}

interface Letta { affinita: AffinitaDto[]; proprie: boolean; casa: string | null; personaId: number | null }

/** Le affinità lette dal compendio, la nota delle proprie e i collegamenti alla pagina Ombra e alla scheda del compendio. */
export function InfoOmbraPersona({ ombra = null, personaId = null, partitaId = null }: Props) {
  const dati = useCarica<Letta | null>(async () => {
    if (ombra) {
      const o = await getOmbra(ombra, partitaId ?? undefined);
      return { affinita: o.affinita, proprie: o.affinitaProprie, casa: o.casa, personaId: o.persona?.id ?? null };
    }
    if (personaId) {
      const p = await getPersona(personaId);
      return { affinita: p.affinita, proprie: false, casa: null, personaId: p.id };
    }
    return null;
  }, [ombra, personaId, partitaId]);
  if (dati.caricamento && !dati.dati) return <p className="m-0 testo-12 text-text-muted" role="status">Leggo le affinità…</p>;
  if (dati.errore) return <p className="m-0 testo-12 text-error-testo" role="alert">{dati.errore}</p>;
  const d = dati.dati;
  if (!d) return <p className="m-0 testo-12 text-text-muted">Nessuna Persona del compendio: le affinità non si conoscono.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {d.affinita.length > 0
        ? <AffinitaGriglia affinita={d.affinita} compatta />
        : <p className="m-0 testo-12 text-text-muted">La guida non dice a cosa sia debole.</p>}
      {d.proprie && <p className="m-0 testo-12 text-text-muted">Alcune affinità sono proprie dell’Ombra: nel gioco sono diverse da quelle della sua Persona.</p>}
      <div className="flex flex-wrap gap-1.5">
        {d.casa && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Pagina dell’Ombra" to={d.casa} />}
        {d.personaId && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Scheda del compendio" to={`/compendio/persona/${d.personaId}`} />}
      </div>
    </div>
  );
}
