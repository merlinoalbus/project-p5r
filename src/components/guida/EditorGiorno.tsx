// ============================================================
// EditorGiorno — il giorno di gioco modificabile, con «Ripristina» (R9-19)
// ============================================================
//
// Meteo del giorno e della sera, nota sul meteo, «da verificare», trama e vincoli del giorno. Sta nella pagina del giorno della guida (non in Partita).
// «Ripristina» riporta il giorno com'è nella guida. Le voci del diario non si toccano da qui.
// ============================================================

import { useMemo, useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useCarica } from '../../hooks/useCarica';
import { getGiornoModificabile, ripristinaGiornoModificabile, salvaGiornoModificabile } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { AvvisoBozzaRipristinata } from '../shared/AvvisoBozzaRipristinata';
import { leggiBozzaPersistente, scartaBozzaPersistente, useBozzaPersistente, validaPiatta } from '../../utils/bozzeSporche';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { METEO_GIORNO, type GiornoModificabileDto, type MeteoGiorno } from '../../../shared/giorno';

const OPZIONI_METEO = METEO_GIORNO.map((m) => ({ chiave: m, nome: m }));

/** La finestra per correggere il giorno `data` ('MM-GG'); `onSalvato` rilegge la pagina. */
export function EditorGiorno({ data, onChiudi, onSalvato }: { data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const d = useCarica(() => getGiornoModificabile(data), [data]);
  return (
    <Modal titolo={`Giorno ${dataGiocoTesto(data)}`} aperta onChiudi={() => { scartaBozzaPersistente(`giorno:${data}`); onChiudi(); }} larga>
      {d.errore && <p role="alert" className="m-0 text-error">{d.errore}</p>}
      {!d.dati && !d.errore && <p role="status" className="m-0">Un attimo…</p>}
      {d.dati && <Corpo dati={d.dati} data={data} onChiudi={onChiudi} onSalvato={onSalvato} />}
    </Modal>
  );
}

/** I campi del giorno come si scrivono: la partenza di una bozza e quel che si tiene in sessionStorage. */
interface StatoGiorno { meteoGiorno: string; meteoSera: string; notaMeteo: string; daVerificare: boolean; trama: string; vincoli: string }
const partenzaDi = (d: GiornoModificabileDto): StatoGiorno => ({
  meteoGiorno: d.meteoGiorno ?? '', meteoSera: d.meteoSera ?? '', notaMeteo: d.notaMeteo ?? '', daVerificare: d.meteoDaVerificare, trama: d.trama, vincoli: d.vincoli.join('\n'),
});
/** Una copia ritrovata vale solo con forma e tipi giusti e con un meteo fra quelli ammessi. */
function validaGiorno(partenza: StatoGiorno): (dati: unknown) => StatoGiorno | null {
  const piatta = validaPiatta(partenza);
  const meteoOk = (m: string) => m === '' || (METEO_GIORNO as readonly string[]).includes(m);
  return (dati) => { const s = piatta(dati); return s && meteoOk(s.meteoGiorno) && meteoOk(s.meteoSera) ? s : null; };
}

function Corpo({ dati, data, onChiudi, onSalvato }: { dati: GiornoModificabileDto; data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const chiaveBozza = `giorno:${data}`;
  const partenza = partenzaDi(dati);
  // con una copia ritrovata in sessionStorage (pagina ricaricata) i campi ripartono da lì, ma solo se il giorno è ancora com'era quando fu salvata
  const [avvio] = useState(() => leggiBozzaPersistente(chiaveBozza, partenza, validaGiorno(partenza)));
  const [ripristinata, setRipristinata] = useState(avvio !== null);
  const [meteoGiorno, setMeteoGiorno] = useState<MeteoGiorno | ''>((avvio?.meteoGiorno ?? partenza.meteoGiorno) as MeteoGiorno | '');
  const [meteoSera, setMeteoSera] = useState<MeteoGiorno | ''>((avvio?.meteoSera ?? partenza.meteoSera) as MeteoGiorno | '');
  const [notaMeteo, setNotaMeteo] = useState(avvio?.notaMeteo ?? partenza.notaMeteo);
  const [daVerificare, setDaVerificare] = useState(avvio?.daVerificare ?? partenza.daVerificare);
  const [trama, setTrama] = useState(avvio?.trama ?? partenza.trama);
  const [vincoli, setVincoli] = useState(avvio?.vincoli ?? partenza.vincoli);
  const [occupato, setOccupato] = useState(false);
  const elencoVincoli = vincoli.split('\n').map((v) => v.trim()).filter((v) => v.length > 0);
  const sporca = meteoGiorno !== (dati.meteoGiorno ?? '') || meteoSera !== (dati.meteoSera ?? '') || notaMeteo !== (dati.notaMeteo ?? '') || daVerificare !== dati.meteoDaVerificare
    || trama !== dati.trama || JSON.stringify(elencoVincoli) !== JSON.stringify(dati.vincoli);
  const stato = useMemo<StatoGiorno>(() => ({ meteoGiorno, meteoSera, notaMeteo, daVerificare, trama, vincoli }), [meteoGiorno, meteoSera, notaMeteo, daVerificare, trama, vincoli]);
  useBozzaPersistente(chiaveBozza, `il giorno ${dataGiocoTesto(data)}`, stato, partenza, { sporca });
  /** «Scarta» sulla bozza ripristinata: i campi tornano com'è il giorno e la copia si cancella. */
  const scarta = () => {
    scartaBozzaPersistente(chiaveBozza);
    setMeteoGiorno(partenza.meteoGiorno as MeteoGiorno | ''); setMeteoSera(partenza.meteoSera as MeteoGiorno | ''); setNotaMeteo(partenza.notaMeteo);
    setDaVerificare(partenza.daVerificare); setTrama(partenza.trama); setVincoli(partenza.vincoli); setRipristinata(false);
  };

  const esegui = async (azione: () => Promise<GiornoModificabileDto>, esito: string) => {
    setOccupato(true);
    try { await azione(); scartaBozzaPersistente(chiaveBozza); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const salva = () => esegui(() => salvaGiornoModificabile(data, {
    meteoGiorno: meteoGiorno === '' ? null : meteoGiorno, meteoSera: meteoSera === '' ? null : meteoSera,
    notaMeteo: notaMeteo.trim() === '' ? null : notaMeteo.trim(), meteoDaVerificare: daVerificare, trama, vincoli: elencoVincoli,
  }), 'Giorno salvato.');

  return (
    <div className="flex flex-col gap-3 text-[13px]">
      {ripristinata && sporca && <AvvisoBozzaRipristinata onScarta={scarta} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Selettore etichetta="Meteo di giorno" valore={meteoGiorno} vuoto="Non indicato" opzioni={OPZIONI_METEO} onCambia={(v) => setMeteoGiorno(v as MeteoGiorno | '')} disabilitato={occupato} />
        <Selettore etichetta="Meteo di sera" valore={meteoSera} vuoto="Non indicato" opzioni={OPZIONI_METEO} onCambia={(v) => setMeteoSera(v as MeteoGiorno | '')} disabilitato={occupato} />
      </div>
      <label className="flex flex-col gap-1">Nota sul meteo
        <input className="form-input" value={notaMeteo} maxLength={200} disabled={occupato} onChange={(e) => setNotaMeteo(e.target.value)} />
      </label>
      <label className="touch flex items-center gap-2">
        <input type="checkbox" checked={daVerificare} disabled={occupato} onChange={(e) => setDaVerificare(e.target.checked)} />
        Il meteo è una divergenza fra le fonti, da verificare in gioco
      </label>
      <label className="flex flex-col gap-1">Trama del giorno
        <textarea className="form-input min-h-[96px]" value={trama} maxLength={4000} disabled={occupato} onChange={(e) => setTrama(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">Vincoli (uno per riga)
        <textarea className="form-input min-h-[72px]" value={vincoli} disabled={occupato} onChange={(e) => setVincoli(e.target.value)} />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        {dati.modificato && <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => void esegui(() => ripristinaGiornoModificabile(data), 'Giorno ripristinato come nella guida.')}>Ripristina</button>}
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => { scartaBozzaPersistente(chiaveBozza); onChiudi(); }}>Annulla</button>
        <button type="button" className="btn btn-primary touch" disabled={occupato || !sporca} onClick={() => void salva()}>Salva</button>
      </div>
    </div>
  );
}
