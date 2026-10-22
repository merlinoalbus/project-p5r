import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnteprimaDecisioneEffettoVoceDto, EffettoVoce, PropostaEffettoVoceDto } from '../../../shared/effettiVoce';
import { descriviEffettoVoce, normalizzaEffettoVoce } from '../../../shared/effettiVoce';
import { anteprimaDecisioneEffettoVoce, getEffettiVoce, getProposteEffettoVoce } from '../../services/api';
import { decidiEffettoVoceConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { useCarica } from '../../hooks/useCarica';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { CampiAcquistoEffetto, EditorEffettoPescaVoce } from './EditorEffettiVoce';
import { GestiPartita } from '../partita/GestiPartita';
import { eAttivitaPesca } from '../../../shared/pesca';

function RivediCandidato({ proposta: p, onChiudi, onDeciso }: { proposta: PropostaEffettoVoceDto; onChiudi: () => void; onDeciso: () => Promise<void> }) {
  const fonte = useCarica(() => getEffettiVoce(p.voceUid), [p.voceUid]);
  const [effetto, setEffetto] = useState<EffettoVoce>(p.effetto);
  const [rapporto, setRapporto] = useState('');
  const [anteprima, setAnteprima] = useState<AnteprimaDecisioneEffettoVoceDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(null, { voceUid: p.voceUid });
  const righe = fonte.dati?.effetti.map(({ uid, effetto }) => ({ uid, effetto })) ?? [];
  const haDoti = effetto.tipo === 'acquisto' && righe.some((r) => r.effetto.tipo === 'dote');
  const riferimentiPescaValidi = effetto.tipo !== 'pesca' || (effetto.sostituisceTurni.every(id => righe.some(r => r.uid === id && r.effetto.tipo === 'turno' && eAttivitaPesca(r.effetto.attivita)))
    && effetto.sostituisceDoti.every(id => righe.some(r => r.uid === id && r.effetto.tipo === 'dote' && r.effetto.dote === 'perizia')));
  const completo = fonte.dati?.stato === 'convertita' && normalizzaEffettoVoce(effetto) !== null && riferimentiPescaValidi && (!haDoti || rapporto === 'distinto' || (rapporto === 'stesso' && effetto.tipo === 'acquisto' && effetto.sostituisceDoti.length > 0));
  const prepara = async (decisione: 'conferma' | 'scarta') => {
    if (blocco.current || pendente || (decisione === 'conferma' && !completo)) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      const a = await anteprimaDecisioneEffettoVoce(p.id, { operazioneId: crypto.randomUUID().replaceAll('-', ''), decisione, ...(decisione === 'conferma' ? { effetto } : {}) });
      if (vivo.current) setAnteprima(a);
    } catch (e) { if (vivo.current) setErrore(e instanceof Error ? e.message : 'Anteprima non disponibile.'); }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const conferma = async () => {
    if (!anteprima || blocco.current || pendente) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let deciso = false;
    try {
      await decidiEffettoVoceConRegistro(p.id, { ...anteprima.richiesta, revisionePropostaAttesa: anteprima.revisionePropostaAttesa }, { etichetta: `Abbinamento degli effetti della voce: ${p.testo}`, voceUid: p.voceUid });
      deciso = true;
      if (vivo.current) {
        setEsito(anteprima.richiesta.decisione === 'conferma' ? 'Abbinamento confermato nella guida. Nessuna consumazione personale è stata dedotta.' : 'Candidato scartato. Gli effetti correnti rimangono invariati.');
        setAnteprima(null);
        await onDeciso();
      }
    } catch (e) { if (vivo.current) setErrore(`${deciso ? 'Decisione registrata; aggiornamento non riuscito: ' : ''}${e instanceof Error ? e.message : 'Operazione non riuscita.'}`); }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <Modal aperta larga titolo="Rivedi l’abbinamento degli effetti" onChiudi={() => { if (!occupato && !gestoPendenteNelloScope(null, { voceUid: p.voceUid })) onChiudi(); }}>
    <div className="flex min-w-0 flex-col gap-3 text-[13px]">
      <strong>{dataGiocoTesto(p.giorno)} · {p.fascia} · {p.testo}</strong>
      <p className="m-0">{p.motivo} · {p.certezza === 'certa' ? 'fonte certa' : p.certezza === 'probabile' ? 'abbinamento probabile' : 'da verificare'}.</p>
      <p className="m-0">È una proposta di collegamento della guida: il nome della voce non prova una consumazione, una visita di pesca o una cattura. La conferma vale per tutte le partite; sulle voci già fatte crea proposte personali da rivedere, senza rieseguire la spunta o modificare i saldi.</p>
      {fonte.errore && <p role="alert" className="m-0 text-error">{fonte.errore}</p>}
      {fonte.dati && <details><summary className="touch">Effetti correnti della voce</summary>{fonte.dati.stato === 'convertita' ? <ul className="m-0 pl-4">{fonte.dati.effetti.map((r) => <li key={r.uid}>{descriviEffettoVoce(r.effetto)}</li>)}</ul> : <><p className="text-warning">RAW non convertibile: correggi prima gli effetti nell’editor della voce.</p><pre className="whitespace-pre-wrap break-all">{fonte.dati.rawLegacy}</pre></>}</details>}
      {esito ? <p role="status" className="m-0 text-success">{esito}</p> : pendente ? <GestiPartita contestoChiave={p.id} onCambiato={async () => { if (vivo.current) { await onDeciso(); setEsito('Esito della decisione recuperato nel registro. Rileggi i candidati aggiornati.'); } }} /> : anteprima ? <>
        <strong>{anteprima.richiesta.decisione === 'conferma' ? 'Conferma il collegamento della guida' : 'Scarta soltanto questo candidato'}</strong>
        <p className="m-0">{descriviEffettoVoce(anteprima.richiesta.effetto ?? anteprima.proposta.effetto)}</p>
        <p className="m-0">Partite con questa voce già fatta: {anteprima.partiteGiaSpuntate}. Nessun loro effetto viene rieseguito da questo gesto.</p>
        {anteprima.richiesta.effetto?.tipo === 'acquisto' && <p className="m-0">Doti indicate come premio della stessa consumazione: {anteprima.richiesta.effetto.sostituisceDoti.length}. Gli altri effetti rimangono indipendenti.</p>}
        {anteprima.richiesta.effetto?.tipo === 'pesca' && <p className="m-0">Raccordi della stessa visita: {anteprima.richiesta.effetto.sostituisceTurni.length} turni e {anteprima.richiesta.effetto.sostituisceDoti.length} premi Perizia. Nessun turno storico diventa una cattura.</p>}
        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void conferma()}>Conferma questa decisione</button><button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => setAnteprima(null)}>Torna ai dati</button></div>
      </> : <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={occupato || !fonte.dati}>
        {haDoti && <Selettore etichetta="Rapporto con i premi Dote già presenti" valore={rapporto} opzioni={[{ chiave: 'stesso', nome: 'Almeno un premio è della stessa consumazione' }, { chiave: 'distinto', nome: 'Sono premi indipendenti dalla consumazione' }]} onCambia={(r) => { setRapporto(r); if (r === 'distinto' && effetto.tipo === 'acquisto') setEffetto({ ...effetto, sostituisceDoti: [] }); }} />}
        {effetto.tipo === 'acquisto' && <CampiAcquistoEffetto effetto={effetto} righe={rapporto === 'stesso' ? righe : []} onCambia={setEffetto} />}
        {effetto.tipo === 'pesca' && <EditorEffettoPescaVoce effetto={effetto} righe={righe} onCambia={setEffetto} />}
        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary touch" disabled={!completo || occupato} onClick={() => void prepara('conferma')}>Rivedi la conferma dell’abbinamento</button><button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => void prepara('scarta')}>Rivedi lo scarto del candidato</button></div>
      </fieldset>}
      {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
      <Link className="touch self-start" to={`/guida/percorso/${p.giorno}?voce=${encodeURIComponent(p.voceUid)}`}>Apri la voce della guida</Link>
      <button type="button" className="btn btn-ghost touch self-start" disabled={occupato || !!pendente} onClick={onChiudi}>Chiudi</button>
    </div>
  </Modal>;
}

export function AbbinamentiEffettiVoce({ onCambiato }: { onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const elenco = useCarica(getProposteEffettoVoce, [gesti.versioneGuida]);
  const [scelta, setScelta] = useState<PropostaEffettoVoceDto | null>(null);
  const aperte = (elenco.dati ?? []).filter((p) => p.stato === 'aperta');
  return <details className="card min-w-0"><summary className="touch text-[14px] font-semibold">Collegamenti degli effetti da rivedere{elenco.dati ? ` · ${aperte.length}` : ''}</summary>
    <div className="flex min-w-0 flex-col gap-2 pt-2 text-[13px]">
      <p className="m-0">Candidati del Diario da confermare uno per uno. Nessun acquisto personale nasce dalla lettura di questo elenco.</p>
      <button type="button" className="btn btn-ghost touch self-start" disabled={elenco.caricamento} onClick={() => void elenco.ricarica()}>Rileggi i candidati</button>
      {elenco.errore && <p role="alert" className="m-0 text-error">{elenco.errore}</p>}
      {elenco.caricamento && !elenco.dati && <p role="status">Caricamento…</p>}
      {elenco.dati && !aperte.length && <p className="m-0">Nessun candidato aperto.</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{aperte.map((p) => <li key={p.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2"><span className="min-w-0 flex-1">{dataGiocoTesto(p.giorno)} · {p.fascia} · {p.testo}<span className="block text-[12px] text-text-secondary">{p.motivo}</span></span><button type="button" className="btn btn-secondary touch" onClick={() => setScelta(p)}>Rivedi</button></li>)}</ul>
      {!!elenco.dati?.some((p) => p.stato !== 'aperta') && <details><summary className="touch">Candidati già decisi</summary><ul className="m-0 pl-4">{elenco.dati.filter((p) => p.stato !== 'aperta').map((p) => <li key={p.id}>{dataGiocoTesto(p.giorno)} · {p.testo} · {p.stato === 'confermata' ? 'confermato' : 'scartato'}</li>)}</ul></details>}
    </div>
    {scelta && <RivediCandidato key={scelta.id} proposta={scelta} onChiudi={() => setScelta(null)} onDeciso={async () => { await elenco.ricarica(); await onCambiato?.(); }} />}
  </details>;
}
