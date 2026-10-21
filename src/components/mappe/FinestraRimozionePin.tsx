import { useLayoutEffect, useRef, useState } from 'react';
import type { SpilloDto } from '../../types';
import { getCestinoUnificato, getMappa, precondizioneRimozionePin } from '../../services/api';
import { rimuoviPinConRegistro, rimozionePinPendente, risolviRimozionePinOsservata, salvaRegistroRimozioniPin, useRegistroRimozioniPin } from '../../services/rimozioniPin';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { NEL_CESTINO } from '../../utils/cestino';

const testo = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';

/** La conferma riguarda la fotografia letta e l’UID originale, anche se la selezione cambia durante la rete. */
export function FinestraRimozionePin({ spillo, mappa, contestoAncoraAttivo, onChiudi, onRimosso }: {
  spillo: Pick<SpilloDto, 'id' | 'uid' | 'nome'>; mappa: string; contestoAncoraAttivo: () => boolean;
  onChiudi: () => void; onRimosso: () => void | Promise<void>;
}) {
  const anteprima = useCarica(() => precondizioneRimozionePin(spillo.id), [spillo.id, spillo.uid]);
  const registro = useRegistroRimozioniPin();
  const pendente = rimozionePinPendente(spillo.uid);
  const [occupato, setOccupato] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const [rifiutata, setRifiutata] = useState(false);
  const [rimossa, setRimossa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [riscontro, setRiscontro] = useState<string | null>(null);
  const vivo = useRef(true), blocco = useRef(false);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const attiva = () => vivo.current && contestoAncoraAttivo();
  const a = anteprima.dati;
  const identica = !!a && a.spillo.id === spillo.id && a.spillo.uid === spillo.uid && a.spillo.mappa?.chiave === mappa;
  const rimuovi = async () => {
    if (blocco.current || incerto || pendente || !registro.pronto || registro.errore || rifiutata || rimossa || !a || !identica || anteprima.caricamento || anteprima.errore || !attiva()) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let successo = false;
    try {
      await rimuoviPinConRegistro({ id: a.spillo.id, uid: a.spillo.uid, nome: a.spillo.nome, mappa, richiesta: { spilloUid: a.spillo.uid, revisioneRimozioneAttesa: a.revisioneRimozioneAttesa } });
      successo = true;
      notifica('success', `Pin «${a.spillo.nome}» della mappa «${a.spillo.mappa!.nome}» conservato nel Cestino.`, 8000);
      if (attiva()) { setRimossa(true); await onRimosso(); }
    } catch (e) {
      if (successo) {
        notifica('warning', `Pin «${a.spillo.nome}» rimosso; aggiornamento della vista non riuscito: ${testo(e)}`, 0);
      } else {
        const certo = !rimozionePinPendente(spillo.uid);
        notifica(certo ? 'error' : 'warning', `Rimozione del pin «${a.spillo.nome}» della mappa «${a.spillo.mappa!.nome}»: ${certo ? 'richiesta rifiutata' : 'esito da verificare'}. ${testo(e)}`, 0);
        if (attiva()) { setIncerto(!certo); setRifiutata(certo); setErrore(testo(e)); }
      }
    } finally { blocco.current = false; if (attiva()) setOccupato(false); }
  };
  const rileggi = async () => {
    const uidOriginale = spillo.uid;
    if (blocco.current || !uidOriginale || !attiva()) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      const [vista, cestino] = await Promise.all([getMappa(mappa), getCestinoUnificato()]);
      if (!attiva()) return;
      const perId = vista.spilli.find(p => p.id === spillo.id);
      const perUid = vista.spilli.find(p => p.uid === spillo.uid);
      const nelCestino = cestino.filter(v => v.tipo === 'pin' && v.chiave === spillo.uid);
      const intento = rimozionePinPendente(spillo.uid);
      if (vista.chiave !== mappa || (perId && perId.uid !== spillo.uid) || (perUid && perUid.id !== spillo.id) || nelCestino.length > 1 || (perUid && nelCestino.length)) {
        setRiscontro('Stato in conflitto: identità riutilizzata o presenza incoerente fra mappa e Cestino. Nessuna rimozione viene ripetuta.');
      } else if (!perUid && nelCestino.length === 1) {
        if (intento && intento.id === spillo.id && intento.mappa === mappa) risolviRimozionePinOsservata(uidOriginale, intento.richiesta.revisioneRimozioneAttesa);
        setIncerto(false); setRifiutata(true);
        setRiscontro('Stato osservato: il pin con l’UID originale non è sulla mappa ed è nel Cestino. Questa lettura non attribuisce l’esito al tentativo precedente. Nessuna rimozione viene ripetuta.');
      } else if (perUid) {
        const fresca = await precondizioneRimozionePin(spillo.id);
        if (!attiva()) return;
        const vecchiaInvalida = intento && intento.id === fresca.spillo.id && intento.uid === fresca.spillo.uid && intento.mappa === fresca.spillo.mappa?.chiave && fresca.spillo.mappa.chiave === mappa && fresca.revisioneRimozioneAttesa !== intento.richiesta.revisioneRimozioneAttesa;
        if (vecchiaInvalida) { risolviRimozionePinOsservata(uidOriginale, intento.richiesta.revisioneRimozioneAttesa); setIncerto(false); setRifiutata(true); }
        setRiscontro(vecchiaInvalida ? 'Il pin originale è presente e la precondizione precedente non coincide più. Non è una prova dell’esito del tentativo: un’eventuale nuova rimozione richiede nuova anteprima e nuova conferma.' : 'Stato osservato: il pin originale è ancora sulla mappa. La lettura non prova che la prima richiesta sia terminata; il blocco rimane e nessuna rimozione viene ripetuta.');
      } else {
        setRiscontro('Il pin originale non è visibile né sulla mappa né fra le radici pin del Cestino. Esito ancora da verificare; nessuna nuova rimozione viene inviata.');
      }
    } catch (e) { if (attiva()) setErrore(`Rilettura non riuscita: ${testo(e)}`); }
    finally { blocco.current = false; if (attiva()) setOccupato(false); }
  };
  const conteggi = a ? [
    ['Immagini', a.contenuti.immagini], ['Voci collegate', a.contenuti.voci],
    ['Destinazioni entranti', a.contenuti.destinazioniEntranti], ['Atterraggi', a.contenuti.atterraggi],
    ['Sedi', a.contenuti.sedi], ['Stati nelle partite', a.contenuti.stati],
    ['Divergenze', a.contenuti.divergenze], ['Stati per infiltrazione', a.contenuti.statiInfiltrazione],
    ['Condizioni che citano il pin', a.contenuti.condizioniRiferite],
  ] as const : [];
  return <Modal aperta titolo="Mettere il pin nel Cestino?" onChiudi={() => { if (!blocco.current) onChiudi(); }} azioni={<>
    <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={onChiudi}>Chiudi</button>
    {!incerto && !pendente && !rimossa && <button type="button" className="btn btn-primary touch" disabled={occupato || rifiutata || !registro.pronto || !!registro.errore || !identica || anteprima.caricamento || !!anteprima.errore} onClick={() => void rimuovi()}>Metti questo pin nel Cestino</button>}
  </>}>
    <div className="flex min-w-0 flex-col gap-2 text-[13px]">
      <strong>{identica ? a!.spillo.nome : spillo.nome}</strong><p className="m-0">{NEL_CESTINO}</p>
      {registro.errore && <div role="alert" className="flex flex-col gap-1 text-error"><span>{registro.errore}</span><button type="button" className="btn btn-ghost touch self-start" disabled={occupato} onClick={() => { try { salvaRegistroRimozioniPin(); } catch (e) { setErrore(testo(e)); } }}>Salva il registro senza ripetere la richiesta</button></div>}
      {anteprima.caricamento && <p role="status" className="m-0">Rileggo il pin e le conseguenze della rimozione…</p>}
      {anteprima.errore && <p role="alert" className="m-0 text-error">{anteprima.errore}</p>}
      {a && !identica && <p role="alert" className="m-0 text-error">Il pin o la mappa non coincidono più con la selezione: nessuna rimozione viene inviata.</p>}
      {a && identica && <><span>Mappa: {a.spillo.mappa!.nome}</span><code className="break-all text-[11px]">Pin {a.spillo.id} · UID {a.spillo.uid}</code>
        <ul className="m-0 pl-4">{conteggi.map(([nome, quante]) => <li key={nome}>{nome}: {quante}</li>)}</ul>
        <p className="m-0">{a.contenuti.riallineamento ? 'Le voci collegate richiedono il riallineamento degli stati della guida nelle partite; il Cestino conserva le righe interessate.' : 'La fotografia non richiede il riallineamento degli stati delle voci della guida.'}</p></>}
      {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
      {(incerto || pendente) && <><p role="alert" className="m-0 text-warning">Esito da verificare conservato per questo UID, anche dopo chiusura o reload. La richiesta non viene ripetuta: puoi soltanto rileggere la mappa e il Cestino.</p><button type="button" className="btn btn-secondary touch self-start" disabled={occupato || pendente?.stato === 'invio'} onClick={() => void rileggi()}>Rileggi lo stato senza ripetere la rimozione</button></>}
      {!incerto && !pendente && !rimossa && <button type="button" className="btn btn-ghost touch self-start" disabled={occupato || anteprima.caricamento} onClick={() => { setRifiutata(false); setErrore(null); void anteprima.ricarica(); }}>Rileggi l’anteprima</button>}
      {riscontro && <p role="status" className="m-0">{riscontro}</p>}
    </div>
  </Modal>;
}
