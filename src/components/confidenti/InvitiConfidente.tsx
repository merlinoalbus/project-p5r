import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { eliminaInvitoConfidente, getInviti, impostaInvitoAvvenuto } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import type { InvitoDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { EditorInvito } from './EditorInvito';
import { conferma } from '../../stores/confermaStore';
import { TitoloSezione } from '../shared/TitoloSezione';

/** Gli stessi inviti e lo stesso gesto nelle pagine del Confidente, del quartiere e del luogo. Gli inviti si creano, si cambiano, si ripristinano e si
 *  tolgono solo dalla pagina del Confidente (R9-07c: è l'unico posto in cui si modificano), cioè quando il filtro nomina il Confidente. */
export function InvitiConfidente({ filtro, nomeConfidente, onCambiato }: { filtro: Omit<NonNullable<Parameters<typeof getInviti>[0]>, 'partita'>; nomeConfidente?: string; onCambiato: () => Promise<void> }) {
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useCarica(() => getInviti({ ...filtro, partita: attiva?.id }), [filtro, attiva]);
  const [occupato, setOccupato] = useState<string | null>(null);
  /** L'editor aperto: un invito esistente, o `null` per uno nuovo; `undefined` = chiuso. */
  const [editor, setEditor] = useState<InvitoDto | null | undefined>(undefined);
  const modificabile = filtro.confidente !== undefined;
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
  /** Toglie un invito creato dall'utente: finisce nel Cestino (il server rifiuta se una partita lo ha registrato o un altro dato lo cita). */
  const togli = async (invito: InvitoDto) => {
    if (occupato || !invito.data) return;
    if (!(await conferma({ titolo: 'Togliere l’invito?', testo: `L’invito del ${dataLeggibile(invito.data)} finisce nel Cestino.`, etichetta: 'Togli l’invito' }))) return;
    setOccupato(invito.chiave);
    try {
      await eliminaInvitoConfidente(invito.confidente, invito.data);
      await Promise.all([dati.ricarica(), onCambiato()]);
      notifica('success', 'Invito tolto: lo trovi nel Cestino.');
    } catch (e) { notifica('error', e instanceof Error ? e.message : 'L’invito non si è potuto togliere.'); }
    finally { setOccupato(null); }
  };
  const dopoModifica = async () => { await Promise.all([dati.ricarica(), onCambiato()]); };
  if (!dati.caricamento && !dati.errore && !dati.dati?.length && !modificabile) return null;
  const confidente = { chiave: filtro.confidente ?? '', nome: nomeConfidente ?? dati.dati?.[0]?.confidenteNome ?? '' };
  return <section className="card flex flex-col gap-2" aria-label="Inviti dei Confidenti">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <TitoloSezione>Inviti</TitoloSezione>
      {modificabile && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un invito" onClick={() => setEditor(null)} />}
    </div>
    {dati.errore ? <p className="m-0 testo-13" role="alert">{dati.errore} <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void dati.ricarica()} /></p>
      : dati.caricamento && !dati.dati ? <p className="m-0 testo-13" role="status">Caricamento degli inviti…</p>
        : !dati.dati?.length ? <p className="m-0 testo-13 text-text-muted">Nessun invito.</p>
          : <ul className="m-0 flex list-none flex-col gap-3 p-0">{dati.dati.map((invito) => <li key={invito.chiave} className="flex flex-col gap-1 testo-13">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link className="touch inline-flex items-center" to={`/confidenti/${encodeURIComponent(invito.confidente)}`}>{invito.confidenteNome}</Link>
            {invito.data && <span>{dataLeggibile(invito.data)}</span>}
            <span>Apre: {invito.apre.casa ? <Link to={invito.apre.casa} className="touch inline-flex items-center">{invito.apre.nome}</Link> : invito.apre.nome}</span>
            {invito.modificato && <span className="chip" title="Cambiato rispetto alla guida">Modificato</span>}
            {invito.daUtente && <span className="chip" title="Invito creato da te: non è nella guida">Creato da te</span>}
            {modificabile && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica l’invito del ${invito.data ? dataLeggibile(invito.data) : 'Confidente'}`} disabled={occupato !== null} onClick={() => setEditor(invito)} />}
            {modificabile && invito.daUtente && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli l’invito del ${invito.data ? dataLeggibile(invito.data) : 'Confidente'}`} disabled={occupato !== null} onClick={() => void togli(invito)} />}
          </div>
          {invito.condizioniTesto.length > 0 && <p className="m-0 text-text-secondary">Condizioni: {invito.condizioniTesto.join(' · ')}.</p>}
          {attiva && !invito.registrato && invito.possibile === false && <p className="m-0 text-text-secondary">Non ancora possibile: manca {invito.manca ?? 'una delle condizioni dell’invito'}.</p>}
          {invito.nota && <p className="m-0 text-text-muted">{invito.nota}</p>}
          {attiva ? <PulsanteVisivo tono={invito.registrato ? 'fantasma' : 'secondario'} compatto className="self-start"
            icona={<IconaAzione chiave={invito.registrato ? 'annulla-ultimo' : 'raggiunto'} dimensione={20} />}
            titolo={occupato === invito.chiave ? 'Salvataggio…' : invito.registrato ? 'Annulla invito avvenuto' : 'Invito avvenuto'}
            disabled={occupato !== null || (!invito.registrato && invito.possibile !== true)} onClick={() => void registra(invito.chiave, !invito.registrato)} /> : <p className="m-0 text-text-muted">Seleziona una partita per registrare l’invito.</p>}
        </li>)}</ul>}
    {modificabile && editor !== undefined && <EditorInvito key={editor?.chiave ?? 'nuovo'} confidente={confidente} invito={editor} onChiudi={() => setEditor(undefined)} onSalvato={dopoModifica} />}
  </section>;
}
