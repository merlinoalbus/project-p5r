// ============================================================
// EditorEffettiVoce — i campi degli effetti che hanno collegamenti fra effetti (pesca, Aojiru) e il caso della fonte non convertibile
// ============================================================
//
// L'elenco di tutti gli effetti, con le schede, è in `ElencoEffettiVoce` (L13, ondata 4a); i campi di ogni effetto, scelti per nome, in
// `CampiEffettoVoce`. Qui restano i due effetti che si raccordano ad altri effetti della voce per UID (l'UID non si mostra mai:
// si mostra l'effetto) e l'avviso per gli effetti originari che non si convertono.
// ============================================================

import { ARTICOLO_AOJIRU, ORDINE_AOJIRU } from '../../../shared/acquisti';
import { nomeDote, type DoteChiave } from '../../../shared/doti';
import type { EffettoVoce, RichiestaSalvaEffettiVoce } from '../../../shared/effettiVoce';
import type { CampiStrutturati } from '../../utils/azioneStrutturata';
import { Selettore } from '../shared/Selettore';
import { ATTIVITA_PESCA, REGOLA_PESCA, eAttivitaPesca, type EffettoPescaVoce } from '../../../shared/pesca';
import { getElementoCatalogo } from '../../services/api/catalogo';
import { useCarica } from '../../hooks/useCarica';
import { useGestiPartita } from '../../services/gestiPartita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Note } from '../shared/TestoNote';

type Acquisto = Extract<EffettoVoce, { tipo: 'acquisto' }>;
type Righe = RichiestaSalvaEffettiVoce['effetti'];

/** I riferimenti indicano effetti esistenti per UID, mai righe ricostruite dal loro nome. */
export function EditorEffettoPescaVoce({ effetto, righe, onCambia }: { effetto: EffettoPescaVoce; righe: Righe; onCambia: (e: EffettoPescaVoce) => void }) {
  const turni = righe.filter(r => r.uid !== null && r.effetto.tipo === 'turno' && eAttivitaPesca(r.effetto.attivita));
  const doti = righe.filter(r => r.uid !== null && r.effetto.tipo === 'dote' && r.effetto.dote === 'perizia');
  const gruppo = (tipo: 'sostituisceTurni' | 'sostituisceDoti', candidati: Righe, titolo: string) => <fieldset className="m-0 flex min-w-0 flex-col gap-1 border border-border p-2"><legend>{titolo}</legend>
    {!candidati.length && !effetto[tipo].length && <p className="m-0 testo-12">Nessun effetto esistente da raccordare.</p>}
    {candidati.map(r => <label key={r.uid} className="touch flex min-w-0 items-start gap-2"><input className="h-5 w-5 shrink-0" type="checkbox" checked={effetto[tipo].includes(r.uid!)} onChange={e => onCambia({ ...effetto, [tipo]: e.target.checked ? [...effetto[tipo], r.uid!] : effetto[tipo].filter(id => id !== r.uid) })} /><span className="min-w-0 break-words">{r.effetto.tipo === 'turno' ? 'Turno di pesca già presente' : r.effetto.tipo === 'dote' ? <>Perizia · <Note n={r.effetto.note} /></> : ''}</span></label>)}
    {effetto[tipo].filter(id => !candidati.some(r => r.uid === id)).map(id => <div key={id} className="flex min-w-0 flex-wrap items-center gap-2 text-warning"><span className="min-w-0 break-words">Un riferimento conservato non è più compatibile con gli altri effetti.</span><PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Togli questo collegamento" onClick={() => onCambia({ ...effetto, [tipo]: effetto[tipo].filter(x => x !== id) })} /></div>)}
  </fieldset>;
  return <div className="flex min-w-0 flex-col gap-2">
    <Selettore etichetta="Regola di pesca" valore={effetto.regola} opzioni={[{ chiave: REGOLA_PESCA, nome: 'Ichigaya · Persona 5 Royal' }]} onCambia={v => { if (v === REGOLA_PESCA) onCambia({ ...effetto, regola: v }); }} />
    <Selettore etichetta="Attività della visita" valore={effetto.attivita} opzioni={[{ chiave: ATTIVITA_PESCA, nome: 'Pesca al laghetto di Ichigaya' }]} onCambia={v => { if (v === ATTIVITA_PESCA) onCambia({ ...effetto, attivita: v }); }} />
    {gruppo('sostituisceTurni', turni, 'Turni già presenti della stessa visita')}
    {gruppo('sostituisceDoti', doti, 'Premi Perizia già presenti della stessa visita')}
    <p className="m-0 testo-12 text-text-secondary">Collega soltanto effetti della medesima visita. La sessione osservata evita un secondo turno o premio; catture, riscossione e beneficio finale si dichiarano nella partita. Gli effetti nuovi si possono raccordare dopo il primo salvataggio della voce.</p>
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
    <p className="m-0 testo-12 text-text-secondary">L’offerta conserva la propria identità commerciale e i suoi acquisti. La scheda distinta del Chiosco dei succhi non trasferisce questa offerta.</p>
    <Selettore etichetta="Variante indicata dalla guida" valore={effetto.variante ?? ''} vuoto="Da osservare nella partita" opzioni={ORDINE_AOJIRU.map((d) => ({ chiave: d, nome: nomeDote(d) }))} onCambia={(d) => onCambia({ ...effetto, variante: d ? d as DoteChiave : null })} />
    {!!doti.length && <fieldset className="m-0 flex flex-col gap-1 border border-border p-2"><legend>Doti già presenti che questo acquisto sostituisce</legend>
      <p className="m-0 testo-12">Seleziona solo i premi della stessa consumazione: rimangono conservati, ma il nuovo effetto evita di attribuirli una seconda volta.</p>
      {doti.map((r) => <label key={r.uid} className="touch flex items-center gap-2"><input className="h-5 w-5" type="checkbox" checked={effetto.sostituisceDoti.includes(r.uid!)} onChange={(e) => onCambia({ ...effetto, sostituisceDoti: e.target.checked ? [...effetto.sostituisceDoti, r.uid!] : effetto.sostituisceDoti.filter((id) => id !== r.uid) })} />{r.effetto.tipo === 'dote' ? <>{nomeDote(r.effetto.dote)} · <Note n={r.effetto.note} /></> : ''}</label>)}
    </fieldset>}
    <p className="m-0 testo-12 text-text-secondary">Domenica, 5.000 yen, nessun tempo. La variante non è dedotta dal nome della voce o dalla data, se la guida non la dice. La Fortuna non si indica qui: la legge dallo stato della partita.</p>
  </div>;
}

/**
 * Gli effetti originari di una voce che non si convertono integralmente nel formato nuovo: il testo originario resta visibile e
 * non diventa una lista vuota. Modificare solo testo e posizione li conserva; «Ricostruisci» riparte da una lista vuota da compilare.
 */
export function EffettiNonConvertibili({ valore, onRicostruisci }: { valore: CampiStrutturati; onRicostruisci: () => void }) {
  return <div className="flex flex-col gap-2 testo-13">
    <p role="alert" className="m-0 text-warning">Gli effetti originari non sono convertibili integralmente: {valore.fonteEffetti?.motivo ?? 'formato non riconosciuto'}. Modificare solo testo e posizione li conserva.</p>
    <pre className="m-0 whitespace-pre-wrap break-words rounded border border-border p-2 testo-12">{valore.fonteEffetti?.rawLegacy}</pre>
    <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Ricostruisci esplicitamente l’intera lista degli effetti" onClick={onRicostruisci} />
    <p className="m-0 testo-12">La ricostruzione parte da una lista vuota da compilare. Il dato originario resta nel registro delle modifiche.</p>
  </div>;
}
