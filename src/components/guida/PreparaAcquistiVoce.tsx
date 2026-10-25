import { useLayoutEffect, useRef, useState } from 'react';
import type { RichiestaRegistraAcquisto } from '../../../shared/acquisti';
import type { RichiestaRegistraSessionePesca } from '../../../shared/pesca';
import { descriviEffettoVoce } from '../../../shared/effettiVoce';
import type { AzionePercorsoDto } from '../../types';
import { PreparazioneAcquistoAojiru } from '../catalogo/ConsumiAojiru';
import { Modal } from '../shared/Modal';
import { Link } from 'react-router-dom';
import { getVocePercorso } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { PreparazioneSessionePesca } from '../pesca/PreparazioneSessionePesca';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const fotografia = (a: AzionePercorsoDto) => JSON.stringify([a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);

/** Raccoglie tutte le osservazioni senza scrivere; il genitore invia poi un'unica spunta atomica. */
export function PreparaAcquistiVoce({ a, partitaId, onChiudi, onConferma, onRileggi }: { a: AzionePercorsoDto; partitaId: number; onChiudi: () => void; onRileggi: (aggiornata: AzionePercorsoDto) => void; onConferma: (acquisti: RichiestaRegistraAcquisto[], pesche: RichiestaRegistraSessionePesca[]) => Promise<void> }) {
  const verifica = useCarica(() => getVocePercorso(a.uid, partitaId), [partitaId, a.uid]);
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { voceUid: a.uid, ...(a.effettiVoce?.effetti.some(e => e.effetto.tipo === 'pesca') ? { pesca: true } : {}) });
  const cambiata = verifica.dati !== null && fotografia(verifica.dati) !== fotografia(a);
  const nonPronta = verifica.caricamento || !!verifica.errore || !verifica.dati || verifica.dati.fatta || cambiata;
  const effetti = a.effettiVoce?.effetti.filter((e) => e.effetto.tipo === 'acquisto' || e.effetto.tipo === 'pesca') ?? [];
  const [preparati, setPreparati] = useState<Record<string, RichiestaRegistraAcquisto>>({});
  const [peschePreparate, setPeschePreparate] = useState<Record<string, RichiestaRegistraSessionePesca>>({});
  const [consensiValidi, setConsensiValidi] = useState<ReadonlySet<string>>(new Set());
  const [invalidazioneAnteprima, setInvalidazioneAnteprima] = useState(0);
  const [generazione, setGenerazione] = useState(0);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [incerto, setIncerto] = useState(false);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const mancaPreparazione = effetti.some(e => !consensiValidi.has(e.uid) || (e.effetto.tipo === 'pesca' ? !peschePreparate[e.uid] : !preparati[e.uid]));
  // Invalida soltanto consenso e CAS: i figli restano montati con tutti gli input e le catture.
  const invalidaPreparazioni = () => { setConsensiValidi(new Set()); setInvalidazioneAnteprima(v => v + 1); };
  // Solo questo gesto volontario può svuotare anche le bozze dei moduli.
  const azzera = () => { setPreparati({}); setPeschePreparate({}); setConsensiValidi(new Set()); setGenerazione(g => g + 1); };
  const confermaPreparazione = (uid: string) => setConsensiValidi(v => new Set([...v, uid]));
  const spunta = async () => {
    if (blocco.current || incerto || pendente || nonPronta || mancaPreparazione) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try { await onConferma(effetti.filter(e => e.effetto.tipo === 'acquisto').map(e => preparati[e.uid]), effetti.filter(e => e.effetto.tipo === 'pesca').map(e => peschePreparate[e.uid])); }
    catch (e) {
      if (!vivo.current) return;
      setErrore(e instanceof Error ? e.message : 'Spunta non confermata.');
      // Nessun replay del PUT: il registro dei gesti permette soltanto la verifica readonly delle ricevute esatte.
      const dubbio = !!gestoPendenteNelloScope(partitaId, { voceUid: a.uid });
      setIncerto(dubbio);
      if (!dubbio) { invalidaPreparazioni(); await verifica.ricarica(); }
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <Modal aperta larga titolo="Osservazioni della voce del Diario" onChiudi={() => { if (!occupato && !incerto) onChiudi(); }} azioni={<>
    <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={onChiudi}>Annulla</button>
    <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rivedi tutte le osservazioni" disabled={occupato || incerto} onClick={azzera} />
    <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo="Conferma la spunta e queste osservazioni" disabled={occupato || incerto || !!pendente || nonPronta || mancaPreparazione} onClick={() => void spunta()} />
  </>}>
    <div className="flex min-w-0 flex-col gap-3 testo-13">
      <strong>{a.azione}</strong>
      <p className="m-0">Ogni riquadro prepara soltanto i dati. Il comando finale registra insieme spunta, consumazioni e sessioni osservate. Doti, yen e punti pesca restano proposte da decidere.</p>
      {invalidazioneAnteprima > 0 && mancaPreparazione && <p role="status" className="m-0 text-warning">Gli input e le catture sono conservati. Rivedi una nuova anteprima e riconferma ogni riquadro prima della spunta; il comando precedente non viene ripetuto.</p>}
      <details><summary className="touch">Tutti gli effetti della voce</summary><ul className="m-0 pl-4">{a.effettiVoce?.effetti.map((e) => <li key={e.uid}>{descriviEffettoVoce(e.effetto)}</li>)}</ul></details>
      {verifica.caricamento && <p role="status">Verifico la configurazione corrente della voce…</p>}
      {verifica.errore && <p role="alert" className="m-0 text-error-testo">{verifica.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi la voce conservando i dati" disabled={occupato || incerto} onClick={() => void verifica.ricarica()} /></p>}
      {verifica.dati?.fatta && <p role="alert" className="m-0 text-warning">Questa voce risulta già fatta: nessuna nuova spunta viene inviata. Mostra la voce aggiornata; gli eventuali effetti mancanti compaiono come pulsante «Applica» sulla voce.</p>}
      {cambiata && <p role="alert" className="m-0 text-warning">La voce è cambiata: nessuna spunta viene inviata.<PulsanteVisivo className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Mostra la voce aggiornata" onClick={() => { if (verifica.dati) { onRileggi(verifica.dati); onChiudi(); } }} /></p>}
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={occupato || incerto || nonPronta}>
        {effetti.map((e, i) => <section className="flex flex-col gap-2 border-t border-border pt-2" key={`${e.uid}:${generazione}`}>
          <h3 className="m-0 testo-14">{e.effetto.tipo === 'pesca' ? 'Sessione di pesca' : 'Consumazione'} · osservazione {i + 1} di {effetti.length}</h3>
          {e.effetto.tipo === 'pesca' ? <PreparazioneSessionePesca partitaId={partitaId} fonte={{ tipo: 'diario', voceUid: a.uid, effettoUid: e.uid }} giorno={a.giorno} fascia={a.fascia} confermaScrive={false} invalidazioneAnteprima={invalidazioneAnteprima}
            onConferma={async r => { if (vivo.current) { setPeschePreparate(p => ({ ...p, [e.uid]: r })); confermaPreparazione(e.uid); } }} /> : e.effetto.tipo === 'acquisto' ? <PreparazioneAcquistoAojiru partitaId={partitaId} articolo={e.effetto.articolo} fonte={{ tipo: 'diario', voceUid: a.uid, effettoUid: e.uid }} giorno={a.giorno} fascia={a.fascia} invalidazioneAnteprima={invalidazioneAnteprima}
            titoloConferma="Prepara questo consumo per la spunta" esitoConferma="Dati pronti; nessuna consumazione ancora registrata." confermaScrive={false}
            onConferma={async (r) => { if (vivo.current) { setPreparati((p) => ({ ...p, [e.uid]: r })); confermaPreparazione(e.uid); } }} /> : null}
        </section>)}
      </fieldset>
      {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
      {incerto && <p role="alert" className="m-0 text-warning">Il gesto resta nel registro delle operazioni. Da Oggi, Progressi o Impostazioni puoi verificare in sola lettura le ricevute della spunta; il comando non viene ripetuto. <Link className="touch inline-flex items-center" to="/impostazioni">Apri il registro delle operazioni</Link></p>}
    </div>
  </Modal>;
}
