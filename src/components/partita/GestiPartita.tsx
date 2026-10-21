import { useLayoutEffect, useRef, useState } from 'react';
import { archiviaGestoPartita, rileggiRegistroGestiPartita, riprendiGestoPartita, useGestiPartita, type GestoPartita } from '../../services/gestiPartita';

const nomi: Record<GestoPartita['payload']['tipo'], string> = {
  acquisto: 'Registrazione acquisto', 'annullo-fonte': 'Rimozione fonte', 'rimozione-legacy': 'Rimozione presenza storica',
  'decisione-proposte': 'Decisione sulle proposte', 'spunta-acquisti': 'Spunta con consumazioni',
  'decisione-effetto-voce': 'Decisione su un effetto della guida',
};
/** Registro della sola scheda: include partite non attive e bersagli ormai eliminati. */
export function GestiPartita({ partitaId, onCambiato, mostraVuoto = false, contestoChiave }: { partitaId?: number; onCambiato?: (partitaId: number | null) => void | Promise<void>; mostraVuoto?: boolean; contestoChiave?: string }) {
  const { gesti, erroreArchivio } = useGestiPartita();
  const [errore, setErrore] = useState<string | null>(null);
  const callback = useRef(onCambiato);
  useLayoutEffect(() => { callback.current = onCambiato; }, [onCambiato]);
  const contesto = useRef({ partitaId, contestoChiave, generazione: 0, vivo: true });
  useLayoutEffect(() => {
    contesto.current = { partitaId, contestoChiave, generazione: contesto.current.generazione + 1, vivo: true };
    return () => { contesto.current.vivo = false; contesto.current.generazione++; };
  }, [partitaId, contestoChiave]);
  const elenco = gesti.filter(g => partitaId === undefined || g.partitaId === partitaId);
  const recupera = async (g: GestoPartita) => {
    const origine = { ...contesto.current, onCambiato: callback.current };
    setErrore(null);
    try {
      await riprendiGestoPartita(g.id);
      // La ricevuta e la notifica sono già nel registro anche se questa vista è scomparsa.
      if (contesto.current.vivo && contesto.current.generazione === origine.generazione && contesto.current.partitaId === origine.partitaId && contesto.current.contestoChiave === origine.contestoChiave) await origine.onCambiato?.(g.partitaId);
    } catch (e) {
      if (contesto.current.vivo && contesto.current.generazione === origine.generazione) setErrore(e instanceof Error ? e.message : 'Recupero non riuscito.');
    }
  };
  const archivia = (g: GestoPartita) => {
    try { archiviaGestoPartita(g.id); setErrore(null); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Archiviazione non riuscita.'); }
  };
  if (!elenco.length && !erroreArchivio && !errore && !mostraVuoto) return null;
  const daRivedere = elenco.some(g => g.stato === 'invio' || g.stato === 'incerto' || !g.ricevutaPersistita);
  return <details className="card min-w-0" open={daRivedere || !!erroreArchivio || !!errore || !elenco.length}>
    <summary className="touch cursor-pointer font-display text-[17px] uppercase">Gesti di questa scheda{elenco.length ? ` · ${elenco.length}` : ''}</summary>
    <div className="flex min-w-0 flex-col gap-2 pt-2" aria-label="Gesti conservati in questa scheda">
    <p className="m-0 text-[12px] text-text-secondary">Il recupero usa l’operazione originale, anche per una partita non attiva o una fonte eliminata. Nessun invio automatico al ricaricamento. Il registro resta solo in questa scheda del browser: non è sincronizzato.</p>
    {erroreArchivio && <div role="alert" className="flex flex-col items-start gap-2 text-error"><p className="m-0">{erroreArchivio}</p><button type="button" className="btn btn-ghost btn-sm touch" onClick={rileggiRegistroGestiPartita}>Rileggi il registro conservato</button></div>}
    {errore && <p role="alert" className="m-0 text-[13px] text-error">{errore}</p>}
    {!elenco.length && !erroreArchivio && <p className="m-0 text-[13px]">Nessun gesto conservato in questa scheda.</p>}
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{elenco.map(g => {
      const inCorso = g.stato === 'invio';
      const risolta = g.stato === 'riuscita' && g.ricevutaPersistita;
      const rifiutata = g.stato === 'rifiutata' && g.ricevutaPersistita;
      const readonly = g.payload.tipo === 'spunta-acquisti';
      const attuale = g.ricevuta && 'fatta' in g.ricevuta ? g.ricevuta : null;
      return <li key={g.id} className="flex min-w-0 flex-col gap-1 border-t border-border pt-2 text-[13px]">
        <strong>{nomi[g.payload.tipo]} · {g.bersaglio.etichetta}</strong>
        <span>{g.partitaId === null ? 'Guida' : `Partita ${g.partitaId}`} · {g.stato === 'riuscita' ? 'Successo ricevuto' : g.stato === 'invio' ? 'Invio in corso' : g.stato === 'rifiutata' ? 'Richiesta rifiutata' : 'Esito da verificare'}{g.stato === 'riuscita' && !g.ricevutaPersistita ? ' · ricevuta ancora da salvare nella scheda' : ''}.</span>
        <code className="break-all text-[11px]">Operazione {g.operazioneId}</code>
        <details className="min-w-0"><summary className="cursor-pointer">Contenuto del gesto conservato</summary>
          <dl className="m-0 grid min-w-0 grid-cols-1 gap-1 break-words">
            {g.bersaglio.voceUid && <><dt>Voce</dt><dd className="m-0 break-all">{g.bersaglio.voceUid}</dd></>}
            {g.payload.tipo === 'acquisto' && <><dt>Consumazione</dt><dd className="m-0">{g.payload.dati.articolo} · {g.payload.dati.momento.giorno}, {g.payload.dati.momento.fascia}, ordine {g.payload.dati.momento.ordine} · {g.payload.dati.variante} · Fortuna {g.payload.dati.fortuna === null ? 'non dichiarata' : g.payload.dati.fortuna ? 'sì' : 'no'} · {g.payload.dati.scelta.tipo === 'nuova' ? 'nuovo fatto' : `fatto ${g.payload.dati.scelta.acquistoId}`}</dd></>}
            {g.payload.tipo === 'annullo-fonte' && <><dt>Fonte da togliere</dt><dd className="m-0 break-all">{g.payload.dati.provenienzaId}</dd></>}
            {g.payload.tipo === 'rimozione-legacy' && <><dt>Presenza storica da togliere</dt><dd className="m-0">{g.payload.dati.articolo}</dd></>}
            {g.payload.tipo === 'decisione-proposte' && <><dt>Decisione</dt><dd className="m-0">{g.payload.dati.decisione.tipo} · {'proposte' in g.payload.dati.decisione ? g.payload.dati.decisione.proposte.map(p => `${p.id}/${p.uid}`).join(', ') : `${g.payload.dati.decisione.proposta.id}/${g.payload.dati.decisione.proposta.uid}`}</dd></>}
            {g.payload.tipo === 'spunta-acquisti' && <><dt>Consumazioni della prima spunta</dt><dd className="m-0">{g.payload.dati.acquisti.map(a => `${a.articolo} · ${a.variante} · ${a.operazioneId}`).join('; ')}</dd></>}
            {g.payload.tipo === 'decisione-effetto-voce' && <><dt>Candidato e decisione</dt><dd className="m-0 break-all">{g.payload.propostaId} · {g.payload.dati.decisione}</dd></>}
          </dl>
        </details>
        {g.errore && <p className="m-0 break-words text-warning">{g.errore}</p>}
        {attuale && <span>Ricevute dei consumi riscontrate. Stato della voce osservato: {attuale.fatta ? 'fatta' : 'non fatta'}; eventuali annullamenti successivi restano validi.</span>}
        {g.stato === 'incerto' && readonly && <span>La verifica legge soltanto la voce e le ricevute per ogni ID originale. Non ripete la spunta o i suoi effetti. Se la voce non esiste più o manca una ricevuta, resta da verificare.</span>}
        {g.stato === 'incerto' && !readonly && <span>Il recupero ripresenta soltanto lo stesso identificativo e lo stesso payload conservato.</span>}
        <div className="flex flex-wrap gap-2">
          {!risolta && !rifiutata && <button type="button" className="btn btn-secondary btn-sm touch" disabled={inCorso || (erroreArchivio !== null && g.stato !== 'riuscita' && g.stato !== 'rifiutata')} onClick={() => void recupera(g)}>
            {inCorso ? 'In corso…' : g.stato === 'riuscita' ? 'Salva la ricevuta già acquisita' : g.stato === 'rifiutata' ? 'Salva il rifiuto già acquisito' : readonly ? 'Verifica le ricevute senza ripetere la spunta' : 'Recupera la stessa operazione'}
          </button>}
          {(risolta || rifiutata) && <button type="button" className="btn btn-ghost btn-sm touch" disabled={inCorso || erroreArchivio !== null} onClick={() => archivia(g)}>Archivia dal registro della scheda</button>}
        </div>
      </li>;
    })}</ul>
    </div>
  </details>;
}
