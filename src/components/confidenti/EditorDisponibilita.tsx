import { useMemo, useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useCarica } from '../../hooks/useCarica';
import { anteprimaInformazioniConfidente, getInformazioniConfidente, salvaInformazioniConfidente } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { AvvisoBozzaRipristinata } from '../shared/AvvisoBozzaRipristinata';
import { leggiBozzaPersistente, scartaBozzaPersistente, useBozzaPersistente } from '../../utils/bozzeSporche';
import { CAMPI_INFORMAZIONI_CONFIDENTE, ETICHETTE_INFORMAZIONI_CONFIDENTE } from '../../../shared/disponibilitaConfidenti';
import type { AnteprimaInformazioniConfidenteDto, AzioneInformazioniConfidente, CampoInformazioniConfidente, InformazioniConfidente, InformazioniConfidenteRaw, SalvaInformazioniConfidente } from '../../../shared/disponibilitaConfidenti';

const COLONNE: Record<CampoInformazioniConfidente, keyof InformazioniConfidenteRaw> = {
  giorni: 'giorni_json', fasce: 'fasce_json', luogo: 'luogo', sbloccoData: 'sblocco_data', sbloccoRequisiti: 'sblocco_requisiti',
  note: 'note', noteGenerali: 'note_generali', fonti: 'fonti_json',
};
const vuoti = (): InformazioniConfidente => ({ giorni: [], fasce: [], luogo: '', sbloccoData: '', sbloccoRequisiti: '', note: '', noteGenerali: '', fonti: [] });
const comeTesto = (v: string | string[] | undefined) => Array.isArray(v) ? v.join('\n') : v ?? '';

/** Quel che si tiene in sessionStorage di una bozza: i campi scelti (modifica) o scritti (creazione) e il motivo. */
interface StatoBozza { nuova: boolean; creazione: InformazioniConfidente; patch: Partial<InformazioniConfidente>; motivo: string }
const CAMPI_ELENCO: readonly CampoInformazioniConfidente[] = ['giorni', 'fasce', 'fonti'];
const elencoDiTesti = (x: unknown): x is string[] => Array.isArray(x) && x.every((v) => typeof v === 'string');
/** Il valore di un campo ha il tipo del campo (elenco di testi per giorni, fasce e fonti, testo per gli altri)? */
const valoreDelCampo = (campo: CampoInformazioniConfidente, x: unknown): boolean => (CAMPI_ELENCO.includes(campo) ? elencoDiTesti(x) : typeof x === 'string');
/** Una bozza ritrovata vale solo con forma e tipi giusti: la creazione ha tutti gli otto campi, la modifica solo campi noti. */
function validaBozzaInformazioni(dati: unknown): StatoBozza | null {
  if (typeof dati !== 'object' || dati === null) return null;
  const d = dati as Record<string, unknown>;
  if (typeof d.nuova !== 'boolean' || typeof d.motivo !== 'string' || typeof d.creazione !== 'object' || d.creazione === null || typeof d.patch !== 'object' || d.patch === null || Array.isArray(d.patch)) return null;
  const creazione = d.creazione as Record<string, unknown>;
  const patch = d.patch as Record<string, unknown>;
  if (!CAMPI_INFORMAZIONI_CONFIDENTE.every((campo) => valoreDelCampo(campo, creazione[campo]))) return null;
  if (!Object.keys(patch).every((k) => (CAMPI_INFORMAZIONI_CONFIDENTE as readonly string[]).includes(k) && valoreDelCampo(k as CampoInformazioniConfidente, patch[k]))) return null;
  const pulita: Record<string, unknown> = {};
  for (const campo of CAMPI_INFORMAZIONI_CONFIDENTE) pulita[campo] = creazione[campo];
  return { nuova: d.nuova, creazione: pulita as unknown as InformazioniConfidente, patch: patch as Partial<InformazioniConfidente>, motivo: d.motivo };
}

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
  const chiaveBozza = `informazioni:${chiave}`;
  // Con una copia ritrovata in sessionStorage (pagina ricaricata) i campi ripartono da lì, appena i dati sono letti: la revisione attesa (un'impronta
  // della riga e del suo storico) è il metro, se le informazioni sono cambiate nel frattempo la copia si scarta. Si legge una volta sola, durante il
  // render in cui arrivano i dati (stato aggiornato in render, ammesso da React quando è condizionato): così nessun render mostra prima i valori vecchi.
  const [letta, setLetta] = useState(false);
  const [ripristinata, setRipristinata] = useState(false);
  if (c && !letta) {
    setLetta(true);
    const salvata = leggiBozzaPersistente(chiaveBozza, { revisione: c.revisioneAttesa, nuova }, validaBozzaInformazioni);
    if (salvata && salvata.nuova === nuova) { setCreazione(salvata.creazione); setPatch(salvata.patch); setMotivo(salvata.motivo); setRipristinata(true); }
  }
  /** Chiude la finestra scartando la bozza (anche la copia in sessionStorage). */
  const chiudi = () => { scartaBozzaPersistente(chiaveBozza); onChiudi(); };
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
      scartaBozzaPersistente(chiaveBozza);
      setPreparata(null); setPatch({});
      notifica('success', esito.esito === 'gia-eseguita' ? `Operazione già eseguita (versione ${esito.versione}). Le informazioni correnti non sono state riscritte.`
        : esito.esito === 'invariata' ? 'Informazioni già coincidenti: nessuna modifica.' : 'Informazioni aggiornate. Requisiti e progressi invariati.');
      await onSalvato();
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };
  // valori scelti e non ancora salvati (dopo il salvataggio `patch` si svuota e `nuova` diventa falso): per «Aggiorna» e la chiusura della scheda del browser
  const conCampiScelti = !!c && (nuova ? JSON.stringify(creazione) !== JSON.stringify(vuoti()) : Object.keys(patch).length > 0);
  const statoBozza = useMemo<StatoBozza>(() => ({ nuova: !!nuova, creazione, patch, motivo }), [nuova, creazione, patch, motivo]);
  // la copia segue i campi scelti, non la scheda aperta: passare a «Storico» e tornare indietro non la perde
  useBozzaPersistente(chiaveBozza, `informazioni di ${c?.confidente.nome ?? chiave}`, statoBozza, { revisione: c?.revisioneAttesa ?? null, nuova: !!nuova },
    { sporca: conCampiScelti, attiva: !!c && letta, sporcaRegistro: conCampiScelti && modalita === 'manuale' });
  /** «Scarta» sulla bozza ripristinata: i campi tornano com'è la riga e la copia si cancella. */
  const scarta = () => { scartaBozzaPersistente(chiaveBozza); setPatch({}); setCreazione(vuoti()); setMotivo(''); setPreparata(null); setRipristinata(false); };
  const ammessa = !!c && !dati.caricamento && !dati.errore && (modalita === 'storico' ? versione !== null : motivo.trim().length > 0 && (nuova || Object.keys(patch).length > 0));
  return <Modal aperta larga titolo={`Informazioni di ${c?.confidente.nome ?? chiave}`} onChiudi={() => { if (!occupato) chiudi(); }} azioni={
    <div className="flex flex-wrap justify-end gap-2 w-full">
      <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={chiudi}>Chiudi</button>
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
        {ripristinata && conCampiScelti && <AvvisoBozzaRipristinata onScarta={scarta} />}
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
