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
import { CampoTesto, SezioneCampi } from '../shared/Campo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { CampoElenco } from './moduli/campi';
import { useCarica } from '../../hooks/useCarica';
import { getGiornoModificabile, ripristinaGiornoModificabile, salvaGiornoModificabile } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { METEO_GIORNO, type GiornoModificabileDto, type MeteoGiorno } from '../../../shared/giorno';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const OPZIONI_METEO = METEO_GIORNO.map((m) => ({ chiave: m, nome: m }));

/** La finestra per correggere il giorno `data` ('MM-GG'); `onSalvato` rilegge la pagina. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor del giorno non esiste; la condizione è costante di build, `EditorGiornoReale` esce dal bundle
export const EditorGiorno: StrumentoDiModifica<typeof EditorGiornoReale> = IN_RILASCIO ? NienteInRilascio : EditorGiornoReale;
function EditorGiornoReale({ data, onChiudi, onSalvato }: { data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const d = useCarica(() => getGiornoModificabile(data), [data]);
  const titolo = `Giorno ${dataGiocoTesto(data)}`;
  // finché il giorno non c'è (o è in errore) la finestra è un guscio semplice; poi la `FinestraModifica` con il piè fisso (L13)
  if (!d.dati) {
    return (
      <Modal titolo={titolo} aperta onChiudi={onChiudi} larga>
        {d.errore && <p role="alert" className="m-0 text-error-testo">{d.errore}</p>}
        {!d.errore && <p role="status" className="m-0">Un attimo…</p>}
      </Modal>
    );
  }
  return <Corpo titolo={titolo} dati={d.dati} data={data} onChiudi={onChiudi} onSalvato={onSalvato} />;
}

function Corpo({ titolo, dati, data, onChiudi, onSalvato }: { titolo: string; dati: GiornoModificabileDto; data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const [meteoGiorno, setMeteoGiorno] = useState<MeteoGiorno | ''>(dati.meteoGiorno ?? '');
  const [meteoSera, setMeteoSera] = useState<MeteoGiorno | ''>(dati.meteoSera ?? '');
  const [notaMeteo, setNotaMeteo] = useState(dati.notaMeteo ?? '');
  const [daVerificare, setDaVerificare] = useState(dati.meteoDaVerificare);
  const [trama, setTrama] = useState(dati.trama);
  // i vincoli sono un elenco di frasi (una riga a campo, «Aggiungi» / «Togli»), non più un testo da dividere a capo
  const [vincoli, setVincoli] = useState<string[]>(dati.vincoli);
  const [occupato, setOccupato] = useState(false);
  const elencoVincoli = vincoli.map((v) => v.trim()).filter((v) => v.length > 0);
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
    <FinestraModifica titolo={titolo} onChiudi={onChiudi} onSalva={salva} salvabile={sporca} occupato={occupato} sporca={sporca}
      azioniExtra={dati.modificato ? <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void esegui(() => ripristinaGiornoModificabile(data), 'Giorno ripristinato come nella guida.')} /> : undefined}>
      <SezioneCampi titolo="Meteo">
        <Selettore etichetta="Meteo di giorno" valore={meteoGiorno} vuoto="Non indicato" opzioni={OPZIONI_METEO} onCambia={(v) => setMeteoGiorno(v as MeteoGiorno | '')} disabilitato={occupato} />
        <Selettore etichetta="Meteo di sera" valore={meteoSera} vuoto="Non indicato" opzioni={OPZIONI_METEO} onCambia={(v) => setMeteoSera(v as MeteoGiorno | '')} disabilitato={occupato} />
        <CampoTesto etichetta="Nota sul meteo" largo valore={notaMeteo} massimo={200} disabilitato={occupato} onCambia={setNotaMeteo} />
        <label className="touch campo--largo flex items-center gap-2 testo-13">
          <input type="checkbox" checked={daVerificare} disabled={occupato} onChange={(e) => setDaVerificare(e.target.checked)} />
          Il meteo è una divergenza fra le fonti, da verificare in gioco
        </label>
      </SezioneCampi>
      <SezioneCampi titolo="Il giorno">
        <CampoTesto etichetta="Trama del giorno" tipo="lungo" righe={4} valore={trama} massimo={4000} disabilitato={occupato} onCambia={setTrama} />
        <CampoElenco etichetta="Vincoli" voci={vincoli} onCambia={setVincoli} disabilitato={occupato} />
      </SezioneCampi>
    </FinestraModifica>
  );
}
