import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { getInviti, impostaInvitoAvvenuto } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';

/** Gli stessi inviti e lo stesso gesto nelle pagine del Confidente, del quartiere e del luogo. */
export function InvitiConfidente({ filtro, onCambiato }: { filtro: Omit<NonNullable<Parameters<typeof getInviti>[0]>, 'partita'>; onCambiato: () => Promise<void> }) {
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useCarica(() => getInviti({ ...filtro, partita: attiva?.id }), [filtro, attiva]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const registra = async (chiave: string, avvenuto: boolean) => {
    if (!attiva || occupato) return;
    setOccupato(chiave);
    try {
      await impostaInvitoAvvenuto(attiva.id, chiave, avvenuto);
      await usePartitaStore.getState().carica();
      await Promise.all([dati.ricarica(), onCambiato()]);
      notifica('success', avvenuto ? 'Invito registrato.' : 'Registrazione dell’invito annullata.');
    } catch (e) { notifica('error', e instanceof Error ? e.message : 'Aggiornamento dell’invito non riuscito.'); }
    finally { setOccupato(null); }
  };
  if (!dati.caricamento && !dati.errore && !dati.dati?.length) return null;
  return <section className="card flex flex-col gap-2" aria-label="Inviti dei Confidenti">
    <h2 className="m-0 text-[15px] font-semibold">Inviti</h2>
    {dati.errore ? <p className="m-0 text-[13px]" role="alert">{dati.errore} <button type="button" className="btn btn-sm touch" onClick={() => void dati.ricarica()}>Riprova</button></p>
      : dati.caricamento && !dati.dati ? <p className="m-0 text-[13px]" role="status">Caricamento degli inviti…</p>
        : <ul className="m-0 flex list-none flex-col gap-3 p-0">{dati.dati?.map((invito) => <li key={invito.chiave} className="flex flex-col gap-1 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link className="touch inline-flex items-center" to={`/guida/confidenti/${encodeURIComponent(invito.confidente)}`}>{invito.confidenteNome}</Link>
            {invito.data && <span>{dataLeggibile(invito.data)}</span>}
            <span>Apre: {invito.apre.casa ? <Link to={invito.apre.casa} className="touch inline-flex items-center">{invito.apre.nome}</Link> : invito.apre.nome}</span>
          </div>
          {invito.condizioniTesto.length > 0 && <p className="m-0 text-text-secondary">Condizioni: {invito.condizioniTesto.join(' · ')}.</p>}
          {attiva && !invito.registrato && invito.possibile === false && <p className="m-0 text-text-secondary">Non ancora possibile: manca {invito.manca ?? 'una delle condizioni dell’invito'}.</p>}
          {invito.nota && <p className="m-0 text-text-muted">{invito.nota}</p>}
          {attiva ? <button type="button" className="btn btn-secondary touch self-start" disabled={occupato !== null || (!invito.registrato && invito.possibile !== true)} onClick={() => void registra(invito.chiave, !invito.registrato)}>
            {occupato === invito.chiave ? 'Salvataggio…' : invito.registrato ? 'Annulla invito avvenuto' : 'Invito avvenuto'}
          </button> : <p className="m-0 text-text-muted">Seleziona una partita per registrare l’invito.</p>}
        </li>)}</ul>}
  </section>;
}
