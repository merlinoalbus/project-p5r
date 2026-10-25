import { useLayoutEffect, useRef, useState } from 'react';
import { salvaRegistroRimozioniPin, useRegistroRimozioniPin, type IntentoRimozionePin } from '../../services/rimozioniPin';
import { FinestraRimozionePin } from '../mappe/FinestraRimozionePin';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Anche un pin assente dalla mappa conserva qui il proprio gesto originale, senza ricostruirne i dati. */
export function RimozioniConservate() {
  const registro = useRegistroRimozioniPin();
  const [scelta, setScelta] = useState<IntentoRimozionePin | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const chiave = scelta ? `${scelta.id}:${scelta.uid}:${scelta.mappa}:${scelta.richiesta.revisioneRimozioneAttesa}` : '';
  const contesto = useRef('');
  useLayoutEffect(() => { contesto.current = chiave; return () => { contesto.current = ''; }; }, [chiave]);
  if (!registro.intenti.length && !registro.errore) return null;
  const pendenti = registro.intenti.some(i => i.stato === 'invio' || i.stato === 'incerto');
  return <>
    <details className="card min-w-0" open={pendenti || !!registro.errore}>
      <summary className="touch cursor-pointer font-display testo-17 uppercase">Rimozioni conservate in questa scheda</summary>
      <div className="flex min-w-0 flex-col gap-2 pt-2 testo-13">
        <p className="m-0">Il gesto originale resta anche se il pin non è più selezionabile. Il registro è della sola scheda del browser; nessuna richiesta viene ripetuta automaticamente.</p>
        {registro.errore && <div role="alert" className="flex flex-col gap-1 text-error-testo"><span>{registro.errore}</span><PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva gli esiti noti senza ripetere richieste" className="self-start" onClick={() => { try { salvaRegistroRimozioniPin(); setErrore(null); } catch (e) { setErrore(e instanceof Error ? e.message : 'Registro non salvato.'); } }} /></div>}
        {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
        <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{registro.intenti.map(i => <li key={i.uid} className="flex min-w-0 flex-col gap-1 border-t border-border pt-2">
          <strong>{i.nome}</strong><code className="break-all testo-12">Pin {i.id} · UID {i.uid} · mappa {i.mappa}</code>
          <span>{i.stato === 'riuscita' ? 'Risposta204 ricevuta: rimozione confermata.' : i.stato === 'rifiutata' ? 'Richiesta rifiutata.' : i.stato === 'invio' ? 'Invio in corso.' : 'Esito da verificare.'}</span>
          {(i.stato === 'invio' || i.stato === 'incerto') && <PulsanteVisivo compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Rileggi il pin e il Cestino senza ripetere" className="self-start" disabled={i.stato === 'invio'} onClick={() => setScelta(i)} />}
        </li>)}</ul>
      </div>
    </details>
    {scelta && <FinestraRimozionePin key={chiave} spillo={{ id: scelta.id, uid: scelta.uid, nome: scelta.nome }} mappa={scelta.mappa}
      contestoAncoraAttivo={() => contesto.current === chiave} onChiudi={() => setScelta(null)} onRimosso={() => setScelta(null)} />}
  </>;
}
