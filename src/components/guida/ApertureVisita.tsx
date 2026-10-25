import { useState } from 'react';
import type { AzionePercorsoDto } from '../../types';
import { impostaAzionePercorso } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Nessuna apertura preselezionata nella prima visita; riaprendo si modificano solo le sue dichiarazioni. */
export function SceltaApertureVisita({ a, occupato, onConferma, onAnnulla }: {
  a: AzionePercorsoDto; occupato: boolean; onConferma: (chiavi: string[]) => void; onAnnulla: () => void;
}) {
  const [scelte, setScelte] = useState(() => (a.effetti?.apertureDedali ?? []).map((x) => x.chiave));
  return <Modal titolo="Aperture durante la visita" aperta onChiudi={() => { if (!occupato) onAnnulla(); }} azioni={<>
    <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onAnnulla}>Annulla</button>
    <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo={a.fatta || a.effetti ? 'Salva aperture' : 'Registra visita'} disabled={occupato} onClick={() => onConferma(scelte)} />
  </>}>
    <p className="m-0 mb-2 text-sm">Indica i dedali che hai aperto in questa visita. Puoi lasciare tutte le caselle vuote.</p>
    <div className="flex flex-col gap-1">
      {(a.apertureDedali ?? []).map((x) => <label key={x.chiave} className="touch flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-5 h-5 shrink-0" disabled={occupato} checked={scelte.includes(x.chiave)} onChange={(e) => setScelte((prima) => e.target.checked ? [...prima, x.chiave] : prima.filter((c) => c !== x.chiave))} />
        <span>{x.nome}</span>
      </label>)}
    </div>
    <p className="m-0 mt-2 text-xs text-text-muted">Cambiare queste scelte non modifica le altre visite. Le aperture non vengono dedotte dalla data o dal numero di visite.</p>
  </Modal>;
}

/** Modifica senza togliere/rimettere la spunta: non ripete gli altri effetti e non fa avanzare il giorno. */
export function ApertureVisitaRegistrata({ a, partitaId, onCambiata, bloccata }: {
  a: AzionePercorsoDto; partitaId: number; onCambiata: (a: AzionePercorsoDto) => void; bloccata?: boolean;
}) {
  const [aperta, setAperta] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const salva = async (scelte: string[]) => {
    setOccupato(true);
    try {
      const aggiornata = await impostaAzionePercorso(partitaId, a.uid, true, undefined, scelte);
      onCambiata(aggiornata);
      useSuggerimentiStore.getState().invalida();
      setAperta(false);
      notifica('success', 'Aperture della visita aggiornate.');
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupato(false); }
  };
  return <div className="flex flex-col items-start gap-1">
    {!!a.effetti?.apertureDedali?.length && <span className="text-xs">In questa visita: {a.effetti.apertureDedali.map((x) => x.nome).join(' · ')}</span>}
    <PulsanteVisivo compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica aperture della visita" disabled={occupato || bloccata} onClick={() => setAperta(true)} />
    {aperta && <SceltaApertureVisita a={a} occupato={occupato} onConferma={(c) => void salva(c)} onAnnulla={() => setAperta(false)} />}
  </div>;
}
