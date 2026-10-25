// ============================================================
// EditorGiorno — il giorno di gioco modificabile, con «Ripristina» (R9-19)
// ============================================================
//
// Meteo del giorno e della sera, nota sul meteo, «da verificare», trama e vincoli del giorno. Sta nella pagina del giorno della guida (non in Partita).
// «Ripristina» riporta il giorno com'è nella guida. Le voci del diario non si toccano da qui.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useCarica } from '../../hooks/useCarica';
import { getGiornoModificabile, ripristinaGiornoModificabile, salvaGiornoModificabile } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { METEO_GIORNO, type GiornoModificabileDto, type MeteoGiorno } from '../../../shared/giorno';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const OPZIONI_METEO = METEO_GIORNO.map((m) => ({ chiave: m, nome: m }));

/** La finestra per correggere il giorno `data` ('MM-GG'); `onSalvato` rilegge la pagina. */
export function EditorGiorno({ data, onChiudi, onSalvato }: { data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const d = useCarica(() => getGiornoModificabile(data), [data]);
  return (
    <Modal titolo={`Giorno ${dataGiocoTesto(data)}`} aperta onChiudi={onChiudi} larga>
      {d.errore && <p role="alert" className="m-0 text-error-testo">{d.errore}</p>}
      {!d.dati && !d.errore && <p role="status" className="m-0">Un attimo…</p>}
      {d.dati && <Corpo dati={d.dati} data={data} onChiudi={onChiudi} onSalvato={onSalvato} />}
    </Modal>
  );
}

function Corpo({ dati, data, onChiudi, onSalvato }: { dati: GiornoModificabileDto; data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const [meteoGiorno, setMeteoGiorno] = useState<MeteoGiorno | ''>(dati.meteoGiorno ?? '');
  const [meteoSera, setMeteoSera] = useState<MeteoGiorno | ''>(dati.meteoSera ?? '');
  const [notaMeteo, setNotaMeteo] = useState(dati.notaMeteo ?? '');
  const [daVerificare, setDaVerificare] = useState(dati.meteoDaVerificare);
  const [trama, setTrama] = useState(dati.trama);
  const [vincoli, setVincoli] = useState(dati.vincoli.join('\n'));
  const [occupato, setOccupato] = useState(false);
  const elencoVincoli = vincoli.split('\n').map((v) => v.trim()).filter((v) => v.length > 0);
  const sporca = meteoGiorno !== (dati.meteoGiorno ?? '') || meteoSera !== (dati.meteoSera ?? '') || notaMeteo !== (dati.notaMeteo ?? '') || daVerificare !== dati.meteoDaVerificare
    || trama !== dati.trama || JSON.stringify(elencoVincoli) !== JSON.stringify(dati.vincoli);
  useBozzaSporca(`giorno:${data}`, `il giorno ${dataGiocoTesto(data)}`, sporca);

  const esegui = async (azione: () => Promise<GiornoModificabileDto>, esito: string) => {
    setOccupato(true);
    try { await azione(); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const salva = () => esegui(() => salvaGiornoModificabile(data, {
    meteoGiorno: meteoGiorno === '' ? null : meteoGiorno, meteoSera: meteoSera === '' ? null : meteoSera,
    notaMeteo: notaMeteo.trim() === '' ? null : notaMeteo.trim(), meteoDaVerificare: daVerificare, trama, vincoli: elencoVincoli,
  }), 'Giorno salvato.');

  return (
    <div className="flex flex-col gap-3 testo-13">
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
        {dati.modificato && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void esegui(() => ripristinaGiornoModificabile(data), 'Giorno ripristinato come nella guida.')} />}
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || !sporca} onClick={() => void salva()} />
      </div>
    </div>
  );
}
