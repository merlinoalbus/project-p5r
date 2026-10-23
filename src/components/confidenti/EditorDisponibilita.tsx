import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useCarica } from '../../hooks/useCarica';
import { anteprimaInformazioniConfidente, getInformazioniConfidente, salvaInformazioniConfidente } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { CAMPI_INFORMAZIONI_CONFIDENTE, ETICHETTE_INFORMAZIONI_CONFIDENTE } from '../../../shared/disponibilitaConfidenti';
import type { AnteprimaInformazioniConfidenteDto, AzioneInformazioniConfidente, CampoInformazioniConfidente, InformazioniConfidente, InformazioniConfidenteRaw, SalvaInformazioniConfidente } from '../../../shared/disponibilitaConfidenti';

const COLONNE: Record<CampoInformazioniConfidente, keyof InformazioniConfidenteRaw> = {
  giorni: 'giorni_json', fasce: 'fasce_json', luogo: 'luogo', sbloccoData: 'sblocco_data', sbloccoRequisiti: 'sblocco_requisiti',
  note: 'note', noteGenerali: 'note_generali', fonti: 'fonti_json',
};
const vuoti = (): InformazioniConfidente => ({ giorni: [], fasce: [], luogo: '', sbloccoData: '', sbloccoRequisiti: '', note: '', noteGenerali: '', fonti: [] });
const comeTesto = (v: string | string[] | undefined) => Array.isArray(v) ? v.join('\n') : v ?? '';

/** Legge il proprio endpoint: rimane accessibile anche quando il dettaglio non riesce a decodificare un vecchio JSON. */
export function EditorDisponibilita({ chiave, onChiudi, onSalvato }: { chiave: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const dati = useCarica(() => getInformazioniConfidente(chiave), [chiave]);
  const [modalita, setModalita] = useState<'manuale' | 'storico'>('manuale');
  const [patch, setPatch] = useState<Partial<InformazioniConfidente>>({});
  const [creazione, setCreazione] = useState<InformazioniConfidente>(vuoti);
  const [motivo, setMotivo] = useState('');
  const [versione, setVersione] = useState<number | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [preparata, setPreparata] = useState<{ input: SalvaInformazioniConfidente; anteprima: AnteprimaInformazioniConfidenteDto } | null>(null);
  const c = dati.dati;
  const nuova = c?.correnteRaw === null;
  const invalidaAnteprima = () => { setPreparata(null); setErrore(null); };
  const cambiaModalita = (m: typeof modalita) => { setModalita(m); invalidaAnteprima(); };

  const seleziona = (campo: CampoInformazioniConfidente, incluso: boolean) => {
    setPatch(p => {
      const prossimo = { ...p };
      if (!incluso) delete prossimo[campo];
      else if (campo === 'giorni' || campo === 'fasce' || campo === 'fonti') prossimo[campo] = [...(c?.valori[campo] ?? [])];
      else prossimo[campo] = c?.valori[campo] ?? '';
      return prossimo;
    });
    invalidaAnteprima();
  };
  const cambia = (campo: CampoInformazioniConfidente, valore: string | string[]) => {
    if (nuova) setCreazione(p => ({ ...p, [campo]: valore }));
    else setPatch(p => ({ ...p, [campo]: valore }));
    invalidaAnteprima();
  };
  const prepara = async () => {
    if (!c || occupato) return;
    let azione: AzioneInformazioniConfidente;
    if (modalita === 'storico') {
      if (versione === null) return;
      azione = { azione: 'ripristina-versione', versione, revisioneAttesa: c.revisioneAttesa };
    } else azione = nuova
      ? { azione: 'crea-informazioni', valori: creazione, motivo, revisioneAttesa: c.revisioneAttesa }
      : { azione: 'modifica-manuale', valori: patch, motivo, revisioneAttesa: c.revisioneAttesa };
    setOccupato(true); setErrore(null); setPreparata(null);
    try {
      const anteprima = await anteprimaInformazioniConfidente(chiave, azione);
      setPreparata({ anteprima, input: { ...azione, anteprimaAttesa: anteprima.anteprimaAttesa, operazioneId: crypto.randomUUID() } });
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Anteprima non disponibile.'); }
    finally { setOccupato(false); }
  };
  const salva = async () => {
    if (!preparata || occupato) return;
    setOccupato(true); setErrore(null);
    try {
      // Un errore di rete mantiene questo stesso payload e UUID per una ripetizione idempotente.
      const esito = await salvaInformazioniConfidente(chiave, preparata.input);
      dati.imposta(esito.corrente);
      setPreparata(null); setPatch({});
      notifica('success', esito.esito === 'gia-eseguita' ? `Operazione già eseguita (versione ${esito.versione}). Le informazioni correnti non sono state riscritte.`
        : esito.esito === 'invariata' ? 'Informazioni già coincidenti: nessuna modifica.' : 'Informazioni aggiornate. Requisiti e progressi invariati.');
      await onSalvato();
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };
  const ammessa = !!c && !dati.caricamento && !dati.errore && (modalita === 'storico' ? versione !== null : motivo.trim().length > 0 && (nuova || Object.keys(patch).length > 0));
  return <Modal aperta larga titolo={`Informazioni di ${c?.confidente.nome ?? chiave}`} onChiudi={() => { if (!occupato) onChiudi(); }} azioni={
    <div className="flex flex-wrap justify-end gap-2 w-full">
      <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={onChiudi}>Chiudi</button>
      <button type="button" className="btn btn-secondary touch" disabled={occupato || dati.caricamento} onClick={() => { invalidaAnteprima(); void dati.ricarica(); }}>Rileggi corrente</button>
      <button type="button" className="btn btn-secondary touch" disabled={occupato || !ammessa} onClick={() => void prepara()}>Mostra anteprima</button>
      {preparata && <button type="button" className="btn btn-primary touch" disabled={occupato || preparata.input.revisioneAttesa !== c?.revisioneAttesa} onClick={() => void salva()}>
        {modalita === 'storico' ? 'Ripristina questa versione' : nuova ? 'Crea informazioni' : 'Salva i campi selezionati'}
      </button>}
    </div>
  }>
    <div className="flex flex-col gap-3 min-w-0">
      <p className="m-0 text-[13px] text-text-secondary">Informazioni della guida, comuni alle partite. Non cambiano i requisiti operativi del rango 1, i semafori o i progressi.</p>
      {dati.caricamento && <p role="status">Lettura delle informazioni…</p>}
      {(errore || dati.errore) && <p className="m-0 text-error whitespace-pre-wrap" role="alert">{errore || dati.errore} La bozza resta disponibile.</p>}
      {c && <>
        {c.errori.length > 0 && <ul className="text-warning m-0 pl-5">{c.errori.map(e => <li key={e}>{e}</li>)}</ul>}
        {c.bonifica && <p className="m-0 text-[12px] text-text-muted">Bonifica iniziale: {c.bonifica.esito}. {c.bonifica.motivo}</p>}
        <div className="flex flex-wrap gap-2" aria-label="Tipo di modifica">
          <button type="button" className={`btn touch ${modalita === 'manuale' ? 'btn-primary' : 'btn-secondary'}`} disabled={occupato} onClick={() => cambiaModalita('manuale')}>{nuova ? 'Creazione esplicita' : 'Modifica manuale'}</button>
          <button type="button" className={`btn touch ${modalita === 'storico' ? 'btn-primary' : 'btn-secondary'}`} disabled={occupato} onClick={() => cambiaModalita('storico')}>Storico e ripristino</button>
        </div>
        {modalita === 'manuale' && <>
          <p className="m-0 text-[13px]">{nuova ? 'La riga non esiste: la creazione richiede una scelta esplicita per tutti gli otto campi, anche vuoti.' : 'Seleziona soltanto i campi da cambiare. Gli altri restano esattamente come sono, anche se contengono dati storici illeggibili.'}</p>
          <label className="flex flex-col gap-1 text-[13px]">Motivo della modifica
            <textarea className="form-input w-full min-h-[64px]" value={motivo} disabled={occupato} onChange={e => { setMotivo(e.target.value); invalidaAnteprima(); }} />
          </label>
          {CAMPI_INFORMAZIONI_CONFIDENTE.map(campo => {
            const incluso = nuova || Object.hasOwn(patch, campo);
            const valore = nuova ? creazione[campo] : patch[campo];
            const valoriElenco = Array.isArray(valore) ? valore : [];
            const elenco = campo === 'giorni' || campo === 'fasce' || campo === 'fonti';
            return <fieldset key={campo} className="border border-border rounded p-2 min-w-0 flex flex-col gap-2" disabled={occupato}>
              <legend className="text-[13px] font-semibold">{ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]}</legend>
              {!nuova && <label className="touch flex items-center gap-2 text-[13px]"><input type="checkbox" checked={incluso} onChange={e => seleziona(campo, e.target.checked)} />Modifica questo campo</label>}
              {!incluso && <p className="m-0 whitespace-pre-wrap break-words text-[12px] text-text-secondary">{comeTesto(c.valori[campo]) || c.correnteRaw?.[COLONNE[campo]] || 'Vuoto'}</p>}
              {incluso && (elenco ? <>
                {valoriElenco.map((v, i) => <div key={i} className="flex items-start gap-2 min-w-0">
                  <textarea className="form-input min-w-0 flex-1 min-h-[64px]" aria-label={`${ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]}, voce ${i + 1}`} value={v} onChange={e => cambia(campo, valoriElenco.map((x, j) => i === j ? e.target.value : x))} />
                  <button type="button" className="btn btn-ghost touch" aria-label={`Togli voce ${i + 1} di ${ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]}`} onClick={() => cambia(campo, valoriElenco.filter((_, j) => i !== j))}>Togli</button>
                </div>)}
                {valoriElenco.length === 0 && <p className="m-0 text-[12px]">Elenco vuoto.</p>}
                <button type="button" className="btn btn-secondary touch self-start" onClick={() => cambia(campo, [...valoriElenco, ''])}>Aggiungi voce</button>
              </> : <textarea className="form-input w-full min-h-[80px]" aria-label={ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]} value={typeof valore === 'string' ? valore : ''} onChange={e => cambia(campo, e.target.value)} />)}
            </fieldset>;
          })}
        </>}
        {modalita === 'storico' && <>
          <p className="m-0 text-[13px]">Il ripristino recupera esattamente la versione scelta e aggiunge una revisione. Può riportare testi errati o JSON illeggibile: l’anteprima lo segnala e non li dichiara validati.</p>
          {c.versioni.length === 0 ? <p className="m-0">Nessuna versione registrata.</p> : <Selettore etichetta="Versione da ripristinare"
            valore={versione === null ? '' : String(versione)} disabilitato={occupato} vuoto="Scegli una versione"
            opzioni={c.versioni.map(v => ({ chiave: String(v.id), nome: `Versione ${v.id} · ${v.azione}`, dettaglio: v.data ?? 'iniziale' }))}
            onCambia={v => { setVersione(v === '' ? null : Number(v)); invalidaAnteprima(); }} />}
          {c.versioni.filter(v => v.id === versione).map(v => <div key={v.id} className="flex flex-col gap-2"><p className="m-0 text-[13px]">{v.motivo}</p>
            {v.errori.map(e => <p key={e} className="m-0 text-warning" role="alert">{e}</p>)}<ValoriRaw raw={v.raw} />
          </div>)}
        </>}
        {preparata && <section className="border border-primary rounded p-3 flex flex-col gap-3 min-w-0" aria-label="Anteprima della modifica">
          <h3 className="m-0 text-[15px]">Anteprima completa</h3>
          <ul className="m-0 pl-5 text-[13px]">{preparata.anteprima.avvertenze.map(a => <li key={a}>{a}</li>)}</ul>
          {preparata.anteprima.campiCambiati.length === 0 ? <p className="m-0">Nessuna differenza: non verrà creata una revisione.</p>
            : <p className="m-0 text-[13px]">Campi modificati: {preparata.anteprima.campiCambiati.map(campo => ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]).join(', ')}.</p>}
          <h4 className="m-0">Prima</h4>{preparata.anteprima.primaRaw ? <ValoriRaw raw={preparata.anteprima.primaRaw} /> : <p className="m-0">Riga assente.</p>}
          <h4 className="m-0">Dopo</h4><ValoriRaw raw={preparata.anteprima.dopoRaw} />
        </section>}
      </>}
    </div>
  </Modal>;
}

function ValoriRaw({ raw }: { raw: InformazioniConfidenteRaw }) {
  return <dl className="m-0 flex flex-col gap-2 text-[12px] min-w-0">{CAMPI_INFORMAZIONI_CONFIDENTE.map(campo => <div key={campo}>
    <dt className="font-semibold">{ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]}</dt><dd className="m-0 whitespace-pre-wrap break-words">{raw[COLONNE[campo]] || 'Vuoto'}</dd>
  </div>)}</dl>;
}
