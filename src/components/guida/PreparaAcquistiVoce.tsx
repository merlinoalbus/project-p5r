import { useRef, useState } from 'react';
import type { RichiestaRegistraAcquisto } from '../../../shared/acquisti';
import { descriviEffettoVoce } from '../../../shared/effettiVoce';
import type { AzionePercorsoDto } from '../../types';
import { PreparazioneAcquistoAojiru } from '../catalogo/ConsumiAojiru';
import { Modal } from '../shared/Modal';
import { Link } from 'react-router-dom';
import { getVocePercorso } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';

const fotografia = (a: AzionePercorsoDto) => JSON.stringify([a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);

/** Raccoglie tutte le osservazioni senza scrivere; il genitore invia poi un'unica spunta atomica. */
export function PreparaAcquistiVoce({ a, partitaId, onChiudi, onConferma, onRileggi }: { a: AzionePercorsoDto; partitaId: number; onChiudi: () => void; onRileggi: (aggiornata: AzionePercorsoDto) => void; onConferma: (acquisti: RichiestaRegistraAcquisto[]) => Promise<void> }) {
  const verifica = useCarica(() => getVocePercorso(a.uid, partitaId), [partitaId, a.uid]);
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { voceUid: a.uid });
  const cambiata = verifica.dati !== null && fotografia(verifica.dati) !== fotografia(a);
  const nonPronta = verifica.caricamento || !!verifica.errore || !verifica.dati || verifica.dati.fatta || cambiata;
  const effetti = a.effettiVoce?.effetti.filter((e) => e.effetto.tipo === 'acquisto') ?? [];
  const [preparati, setPreparati] = useState<Record<string, RichiestaRegistraAcquisto>>({});
  const [generazione, setGenerazione] = useState(0);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [incerto, setIncerto] = useState(false);
  const blocco = useRef(false);
  const spunta = async () => {
    if (blocco.current || incerto || pendente || nonPronta || effetti.some((e) => !preparati[e.uid])) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try { await onConferma(effetti.map((e) => preparati[e.uid])); }
    catch (e) {
      setErrore(e instanceof Error ? e.message : 'Spunta non confermata.');
      // Nessun replay del PUT: il registro dei gesti permette soltanto la verifica readonly delle ricevute esatte.
      const dubbio = !!gestoPendenteNelloScope(partitaId, { voceUid: a.uid });
      setIncerto(dubbio);
      if (!dubbio) { setPreparati({}); setGenerazione((g) => g + 1); await verifica.ricarica(); }
    } finally { blocco.current = false; setOccupato(false); }
  };
  return <Modal aperta larga titolo="Consumi della voce del Diario" onChiudi={() => { if (!occupato && !incerto) onChiudi(); }} azioni={<>
    <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={onChiudi}>Annulla</button>
    <button type="button" className="btn btn-secondary touch" disabled={occupato || incerto} onClick={() => { setPreparati({}); setGenerazione((g) => g + 1); }}>Rivedi tutti i consumi</button>
    <button type="button" className="btn btn-primary touch" disabled={occupato || incerto || !!pendente || nonPronta || effetti.some((e) => !preparati[e.uid])} onClick={() => void spunta()}>Conferma la spunta e questi consumi</button>
  </>}>
    <div className="flex min-w-0 flex-col gap-3 text-[13px]">
      <strong>{a.azione}</strong>
      <p className="m-0">Ogni riquadro prepara soltanto i dati. Il comando finale registra la spunta e i consumi insieme; Doti e yen restano proposte da decidere.</p>
      <details><summary className="touch">Tutti gli effetti della voce</summary><ul className="m-0 pl-4">{a.effettiVoce?.effetti.map((e) => <li key={e.uid}>{descriviEffettoVoce(e.effetto)}</li>)}</ul></details>
      {verifica.caricamento && <p role="status">Verifico la configurazione corrente della voce…</p>}
      {verifica.errore && <p role="alert" className="m-0 text-error">{verifica.errore}<button className="btn btn-ghost touch" onClick={() => void verifica.ricarica()}>Rileggi la voce</button></p>}
      {verifica.dati?.fatta && <p role="alert" className="m-0 text-warning">Questa voce risulta già fatta: nessuna nuova spunta viene inviata. Mostra la voce aggiornata; gli eventuali effetti mancanti si rivedono in «Da applicare».</p>}
      {cambiata && <p role="alert" className="m-0 text-warning">La voce è cambiata: nessuna spunta viene inviata.<button type="button" className="btn btn-secondary touch" onClick={() => { if (verifica.dati) { onRileggi(verifica.dati); onChiudi(); } }}>Mostra la voce aggiornata</button></p>}
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={occupato || incerto || nonPronta}>
        {effetti.map((e, i) => e.effetto.tipo === 'acquisto' && <section className="flex flex-col gap-2 border-t border-border pt-2" key={`${e.uid}:${generazione}`}>
          <h3 className="m-0 text-[14px]">Consumo {i + 1} di {effetti.length}</h3>
          <PreparazioneAcquistoAojiru partitaId={partitaId} articolo={e.effetto.articolo} fonte={{ tipo: 'diario', voceUid: a.uid, effettoUid: e.uid }} giorno={a.giorno} fascia={a.fascia}
            titoloConferma="Prepara questo consumo per la spunta" esitoConferma="Dati pronti; nessuna consumazione ancora registrata." confermaScrive={false}
            onConferma={async (r) => { setPreparati((p) => ({ ...p, [e.uid]: r })); }} />
        </section>)}
      </fieldset>
      {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
      {incerto && <p role="alert" className="m-0 text-warning">Il gesto resta nel registro delle operazioni. Da Oggi, Progressi o Impostazioni puoi verificare in sola lettura le ricevute della spunta; il comando non viene ripetuto. <Link className="touch inline-flex items-center" to="/impostazioni">Apri il registro delle operazioni</Link></p>}
    </div>
  </Modal>;
}
