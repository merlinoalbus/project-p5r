import { useState } from 'react';
import { ARTICOLO_AOJIRU, ORDINE_AOJIRU } from '../../../shared/acquisti';
import { DOTI_SOCIALI, nomeDote, type DoteChiave } from '../../../shared/doti';
import type { EffettoVoce, RichiestaSalvaEffettiVoce } from '../../../shared/effettiVoce';
import type { ElenchiAzioneDto } from '../../types';
import type { CampiStrutturati } from '../../utils/azioneStrutturata';
import { Selettore } from '../shared/Selettore';
import { RigaEffettoVoceLegacy } from './RigaEffettoVoceLegacy';
import { ATTIVITA_PESCA, REGOLA_PESCA, eAttivitaPesca, type EffettoPescaVoce } from '../../../shared/pesca';
import { getElementoCatalogo } from '../../services/api/catalogo';
import { useCarica } from '../../hooks/useCarica';
import { useGestiPartita } from '../../services/gestiPartita';

type Acquisto = Extract<EffettoVoce, { tipo: 'acquisto' }>;
type Righe = RichiestaSalvaEffettiVoce['effetti'];

/** I riferimenti indicano effetti esistenti per UID, mai righe ricostruite dal loro nome. */
export function EditorEffettoPescaVoce({ effetto, righe, onCambia }: { effetto: EffettoPescaVoce; righe: Righe; onCambia: (e: EffettoPescaVoce) => void }) {
  const turni = righe.filter(r => r.uid !== null && r.effetto.tipo === 'turno' && eAttivitaPesca(r.effetto.attivita));
  const doti = righe.filter(r => r.uid !== null && r.effetto.tipo === 'dote' && r.effetto.dote === 'perizia');
  const gruppo = (tipo: 'sostituisceTurni' | 'sostituisceDoti', candidati: Righe, titolo: string) => <fieldset className="m-0 flex min-w-0 flex-col gap-1 border border-border p-2"><legend>{titolo}</legend>
    {!candidati.length && !effetto[tipo].length && <p className="m-0 text-[12px]">Nessun effetto esistente da raccordare.</p>}
    {candidati.map(r => <label key={r.uid} className="touch flex min-w-0 items-start gap-2"><input className="h-5 w-5 shrink-0" type="checkbox" checked={effetto[tipo].includes(r.uid!)} onChange={e => onCambia({ ...effetto, [tipo]: e.target.checked ? [...effetto[tipo], r.uid!] : effetto[tipo].filter(id => id !== r.uid) })} /><span className="min-w-0 break-words">{r.effetto.tipo === 'turno' ? 'Turno di pesca già presente' : r.effetto.tipo === 'dote' ? `Perizia · ${r.effetto.note} ${r.effetto.note === 1 ? 'nota' : 'note'}` : ''}<code className="block break-all text-[11px]">{r.uid}</code></span></label>)}
    {effetto[tipo].filter(id => !candidati.some(r => r.uid === id)).map(id => <div key={id} className="flex min-w-0 flex-wrap items-center gap-2 text-warning"><span className="min-w-0 break-all">Riferimento conservato non più compatibile: {id}</span><button type="button" className="btn btn-ghost touch" onClick={() => onCambia({ ...effetto, [tipo]: effetto[tipo].filter(x => x !== id) })}>Togli questo collegamento</button></div>)}
  </fieldset>;
  return <div className="flex min-w-0 flex-col gap-2">
    <Selettore etichetta="Regola di pesca" valore={effetto.regola} opzioni={[{ chiave: REGOLA_PESCA, nome: 'Ichigaya · Persona 5 Royal' }]} onCambia={v => { if (v === REGOLA_PESCA) onCambia({ ...effetto, regola: v }); }} />
    <Selettore etichetta="Attività della visita" valore={effetto.attivita} opzioni={[{ chiave: ATTIVITA_PESCA, nome: 'Pesca al laghetto di Ichigaya' }]} onCambia={v => { if (v === ATTIVITA_PESCA) onCambia({ ...effetto, attivita: v }); }} />
    {gruppo('sostituisceTurni', turni, 'Turni già presenti della stessa visita')}
    {gruppo('sostituisceDoti', doti, 'Premi Perizia già presenti della stessa visita')}
    <p className="m-0 text-[12px] text-text-secondary">Collega soltanto effetti della medesima visita. La sessione osservata evita un secondo turno o premio; catture, riscossione e beneficio finale si dichiarano nella partita. Gli effetti nuovi acquisiscono l’UID al salvataggio: salvali prima di usarli come riferimenti.</p>
  </div>;
}

/** Configura il legame della guida; il consumo reale viene dichiarato separatamente nella partita. */
export function CampiAcquistoEffetto({ effetto, righe, onCambia }: { effetto: Acquisto; righe: Righe; onCambia: (e: Acquisto) => void }) {
  const gesti = useGestiPartita();
  const offerta = useCarica(async () => {
    const articolo = await getElementoCatalogo('articolo', ARTICOLO_AOJIRU);
    const chiaveNegozio = articolo.dati.negozio_chiave;
    if (typeof chiaveNegozio !== 'string' || !chiaveNegozio) throw new Error('Il negozio dell’offerta collegata non è disponibile.');
    const negozio = await getElementoCatalogo('negozio', chiaveNegozio);
    return `${articolo.nome} · ${negozio.nome}`;
  }, [gesti.versioneGuida]);
  const doti = righe.filter((r) => r.uid !== null && r.effetto.tipo === 'dote');
  return <div className="flex min-w-0 flex-col gap-2">
    <Selettore etichetta="Offerta collegata" valore={effetto.articolo} opzioni={[{ chiave: ARTICOLO_AOJIRU, nome: offerta.dati ?? `${ARTICOLO_AOJIRU} · ${offerta.caricamento ? 'lettura del nome corrente' : 'nome non disponibile'}` }, ...(effetto.articolo && effetto.articolo !== ARTICOLO_AOJIRU ? [{ chiave: effetto.articolo, nome: `${effetto.articolo} · riferimento conservato` }] : [])]} onCambia={(a) => onCambia({ ...effetto, articolo: a })} />
    {offerta.errore && <p role="alert" className="m-0 text-warning">{offerta.errore} Il riferimento dell’effetto resta conservato.</p>}
    <p className="m-0 text-[12px] text-text-secondary">L’offerta conserva la propria identità commerciale e i suoi acquisti. La scheda distinta del Chiosco dei succhi non trasferisce questa offerta.</p>
    <Selettore etichetta="Variante indicata dalla guida" valore={effetto.variante ?? ''} vuoto="Da osservare nella partita" opzioni={ORDINE_AOJIRU.map((d) => ({ chiave: d, nome: nomeDote(d) }))} onCambia={(d) => onCambia({ ...effetto, variante: d ? d as DoteChiave : null })} />
    {!!doti.length && <fieldset className="m-0 flex flex-col gap-1 border border-border p-2"><legend>Doti già presenti che questo acquisto sostituisce</legend>
      <p className="m-0 text-[12px]">Seleziona solo i premi della stessa consumazione: rimangono conservati, ma il nuovo effetto evita di attribuirli una seconda volta.</p>
      {doti.map((r) => <label key={r.uid} className="touch flex items-center gap-2"><input className="h-5 w-5" type="checkbox" checked={effetto.sostituisceDoti.includes(r.uid!)} onChange={(e) => onCambia({ ...effetto, sostituisceDoti: e.target.checked ? [...effetto.sostituisceDoti, r.uid!] : effetto.sostituisceDoti.filter((id) => id !== r.uid) })} />{r.effetto.tipo === 'dote' ? `${nomeDote(r.effetto.dote)} · ${r.effetto.note} ${r.effetto.note === 1 ? 'nota' : 'note'}` : ''}</label>)}
    </fieldset>}
    <p className="m-0 text-[12px] text-text-secondary">Domenica, 5.000 yen, nessun tempo. La variante non è dedotta dal nome della voce o dalla data, se la guida non la dice. La Fortuna non si indica qui: la legge dallo stato della partita.</p>
  </div>;
}

/** Lista unica con identità per effetto: riordinare non cambia UID e non riscrive gli effetti storici. */
export function EditorEffettiVoce({ valore, elenchi, onCambia }: { valore: CampiStrutturati; elenchi: ElenchiAzioneDto; onCambia: (v: CampiStrutturati) => void }) {
  const [tipoNuovo, setTipoNuovo] = useState<EffettoVoce['tipo']>('dote');
  const [errore, setErrore] = useState<string | null>(null);
  const righe = valore.effettiVoce;
  const imposta = (effettiVoce: Righe) => { setErrore(null); onCambia({ ...valore, effettiVoce }); };
  const cambia = (i: number, effetto: EffettoVoce) => imposta((righe ?? []).map((r, j) => j === i ? { ...r, effetto } : r));
  const togli = (i: number) => {
    const uid = righe?.[i]?.uid;
    if (uid && righe?.some((r) => (r.effetto.tipo === 'acquisto' && r.effetto.sostituisceDoti.includes(uid)) || (r.effetto.tipo === 'pesca' && [...r.effetto.sostituisceTurni, ...r.effetto.sostituisceDoti].includes(uid)))) { setErrore('Questo effetto è indicato come sostituito da un acquisto o da una sessione di pesca. Rivedi prima quel collegamento.'); return; }
    imposta((righe ?? []).filter((_, j) => i !== j));
  };
  const sposta = (i: number, verso: -1 | 1) => {
    if (!righe || i + verso < 0 || i + verso >= righe.length) return;
    const nuove = [...righe]; [nuove[i], nuove[i + verso]] = [nuove[i + verso], nuove[i]]; imposta(nuove);
  };
  if (!righe) return <div className="flex flex-col gap-2 text-[13px]">
    <p role="alert" className="m-0 text-warning">Gli effetti originari non sono convertibili integralmente: {valore.fonteEffetti?.motivo ?? 'formato non riconosciuto'}. Modificare solo testo e posizione li conserva.</p>
    <pre className="m-0 whitespace-pre-wrap break-all rounded border border-border p-2 text-[12px]">{valore.fonteEffetti?.rawLegacy}</pre>
    <button type="button" className="btn btn-secondary touch self-start" onClick={() => imposta([])}>Ricostruisci esplicitamente l’intera lista degli effetti</button>
    <p className="m-0 text-[12px]">La ricostruzione parte da una lista vuota da compilare. Il dato originario resta nel registro delle modifiche.</p>
  </div>;
  return <div className="flex min-w-0 flex-col gap-2 text-[13px]">
    <strong>Effetti della voce</strong>
    {!righe.length && <p className="m-0">Nessun effetto configurato.</p>}
    <ul className="m-0 flex list-none flex-col gap-2 p-0">{righe.map((r, i) => r.effetto.tipo === 'acquisto' || r.effetto.tipo === 'pesca' || r.effetto.tipo === 'fortuna' ? <li key={r.uid ?? `nuovo-${i}`} className="flex flex-col gap-2 rounded border border-border p-2">
      <div className="flex flex-wrap items-center gap-2"><strong>Effetto {i + 1}: {r.effetto.tipo === 'pesca' ? 'sessione di pesca' : r.effetto.tipo === 'fortuna' ? 'Fortuna di Chihaya' : 'acquisto'}</strong><button type="button" className="btn btn-ghost touch" onClick={() => togli(i)}>Togli</button><button type="button" className="btn btn-ghost touch" disabled={i === 0} onClick={() => sposta(i, -1)}>Su</button><button type="button" className="btn btn-ghost touch" disabled={i === righe.length - 1} onClick={() => sposta(i, 1)}>Giù</button></div>
      {r.effetto.tipo === 'pesca' ? <EditorEffettoPescaVoce effetto={r.effetto} righe={righe} onCambia={e => cambia(i, e)} />
        : r.effetto.tipo === 'fortuna' ? <>
          <Selettore etichetta="Dote della Fortuna" valore={r.effetto.dote} opzioni={DOTI_SOCIALI.map((d) => ({ chiave: d.chiave, nome: d.nome }))} onCambia={(d) => cambia(i, { tipo: 'fortuna', dote: d as DoteChiave })} />
          <p className="m-0 text-[12px] text-text-secondary">Spuntando la voce la Fortuna si accende su questa Dote per il resto del giorno; togliendo la spunta si spegne.</p>
        </>
          : <CampiAcquistoEffetto effetto={r.effetto} righe={righe} onCambia={(e) => cambia(i, e)} />}
    </li> : <RigaEffettoVoceLegacy key={r.uid ?? `nuovo-${i}`} effetto={r.effetto} numero={i + 1} elenchi={elenchi} onCambia={(e) => cambia(i, e)} onTogli={() => togli(i)} onSposta={(verso) => sposta(i, verso)} primo={i === 0} ultimo={i === righe.length - 1} />)}</ul>
    {righe.length < 100 && <div className="flex flex-wrap items-end gap-2"><Selettore etichetta="Effetto da aggiungere" valore={tipoNuovo} opzioni={[{ chiave: 'dote', nome: 'Dote' }, { chiave: 'lettura', nome: 'Lettura o gioco' }, { chiave: 'turno', nome: 'Turno di attività' }, { chiave: 'acquisto', nome: 'Acquisto Aojiru' }, { chiave: 'pesca', nome: 'Sessione di pesca osservata' }, { chiave: 'fortuna', nome: 'Fortuna di Chihaya' }]} onCambia={(t) => setTipoNuovo(t as EffettoVoce['tipo'])} />
      <button type="button" className="btn btn-secondary touch" onClick={() => {
        const effetto: EffettoVoce = tipoNuovo === 'fortuna' ? { tipo: 'fortuna', dote: 'coraggio' } : tipoNuovo === 'pesca' ? { tipo: 'pesca', regola: REGOLA_PESCA, attivita: ATTIVITA_PESCA, sostituisceTurni: [], sostituisceDoti: [] } : tipoNuovo === 'acquisto' ? { tipo: 'acquisto', articolo: ARTICOLO_AOJIRU, variante: null, sostituisceDoti: [] } : tipoNuovo === 'lettura' ? { tipo: 'lettura', categoria: 'libro', chiave: '', almeno: null } : tipoNuovo === 'turno' ? { tipo: 'turno', attivita: '' } : { tipo: 'dote', dote: 'fascino', note: 2 };
        imposta([...righe, { uid: null, effetto }]);
      }}>Aggiungi l’effetto scelto</button>
    </div>}
    {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
    <p className="m-0 text-[12px] text-text-secondary">Su una voce già fatta, gli effetti aggiunti o modificati compaiono come pulsante «Applica» sulla voce. Le ricevute della spunta rimangono distinte dalla configurazione corrente.</p>
  </div>;
}
