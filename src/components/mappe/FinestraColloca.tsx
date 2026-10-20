// ============================================================
// FinestraColloca — «Colloca»: un luogo «da collocare» in un'area del suo quartiere (L5 F5, M §3.2, `PUT /api/luoghi/:q/:l/area`)
// ============================================================

import { useState } from 'react';
import { collocaLuogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';

interface Props {
  luogo: { chiave: string; nome: string };
  /** Le aree del quartiere (slug e nome), nel loro ordine. */
  aree: ReadonlyArray<{ slug: string; nome: string }>;
  /** L'area proposta (dedotta dalla migrazione), se c'è: parte scelta. */
  proposta?: string | null;
  onChiudi: () => void;
  /** Dopo il salvataggio: chi apre la finestra rilegge. */
  onFatto: () => void;
}

/** La finestra di «Colloca»: si sceglie l'area, «Colloca» la salva. */
export function FinestraColloca({ luogo, aree, proposta = null, onChiudi, onFatto }: Props) {
  const [area, setArea] = useState(proposta ?? '');
  const [occupato, setOccupato] = useState(false);
  /** Salva l'area del luogo, notifica e fa rileggere. */
  const salva = async () => {
    if (!area) return;
    setOccupato(true);
    try {
      await collocaLuogo(luogo.chiave, area);
      notifica('success', `«${luogo.nome}» è in ${aree.find((a) => a.slug === area)?.nome ?? area}.`);
      onFatto();
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Il luogo non è stato collocato.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <Modal titolo={`Colloca «${luogo.nome}»`} aperta onChiudi={onChiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn btn-primary touch" disabled={occupato || !area} onClick={() => void salva()}>Colloca</button>
      </>}>
      <div className="flex flex-col gap-2 text-[13px]">
        <p className="m-0 text-text-secondary">In quale area del quartiere sta il luogo. Il pin si mette poi con «Posiziona».</p>
        <Selettore className="selettore--in-linea" etichetta="Area" valore={area} segnaposto="Scegli l’area…" opzioni={aree.map((a) => ({ chiave: a.slug, nome: a.nome, dettaglio: a.slug === proposta ? 'proposta' : undefined }))} onCambia={setArea} />
      </div>
    </Modal>
  );
}
