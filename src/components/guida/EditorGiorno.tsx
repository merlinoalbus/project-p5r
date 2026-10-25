// ============================================================
// EditorGiorno — il giorno di gioco modificabile, con «Ripristina» (R9-19)
// ============================================================
//
// Meteo del giorno e della sera, nota sul meteo, «da verificare», trama e vincoli del giorno. Sta nella pagina del giorno della guida (non in Partita).
// «Ripristina» riporta il giorno com'è nella guida. Le voci del diario non si toccano da qui.
// L13 (ondata 4a): una sola finestra dall'apertura alla chiusura. Finché il giorno non è arrivato è la stessa `FinestraModifica` con «Un attimo…»;
// prima un guscio di caricamento a parte si smontava all'arrivo dei dati e nasceva un'altra finestra (il fuoco tornava indietro). I campi partono
// dai dati letti e diventano propri alla prima modifica (`modifiche`): nessuno stato da copiare all'arrivo dei dati.
// ============================================================

import { useState } from 'react';
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

/** I campi del modulo. I vincoli sono un elenco di frasi (una riga a campo, «Aggiungi» / «Togli»), non più un testo da dividere a capo. */
interface CampiGiorno { meteoGiorno: MeteoGiorno | ''; meteoSera: MeteoGiorno | ''; notaMeteo: string; daVerificare: boolean; trama: string; vincoli: string[] }
const campiDa = (d: GiornoModificabileDto): CampiGiorno => ({
  meteoGiorno: d.meteoGiorno ?? '', meteoSera: d.meteoSera ?? '', notaMeteo: d.notaMeteo ?? '', daVerificare: d.meteoDaVerificare, trama: d.trama, vincoli: d.vincoli,
});

/** La finestra per correggere il giorno `data` ('MM-GG'); `onSalvato` rilegge la pagina. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor del giorno non esiste; la condizione è costante di build, `EditorGiornoReale` esce dal bundle
export const EditorGiorno: StrumentoDiModifica<typeof EditorGiornoReale> = IN_RILASCIO ? NienteInRilascio : EditorGiornoReale;
function EditorGiornoReale({ data, onChiudi, onSalvato }: { data: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const d = useCarica(() => getGiornoModificabile(data), [data]);
  const titolo = `Giorno ${dataGiocoTesto(data)}`;
  const dati = d.dati;
  // null finché non si tocca nulla: i campi sono quelli letti
  const [modifiche, setModifiche] = useState<CampiGiorno | null>(null);
  const campi = modifiche ?? (dati ? campiDa(dati) : null);
  const imposta = (p: Partial<CampiGiorno>) => { if (dati) setModifiche((m) => ({ ...(m ?? campiDa(dati)), ...p })); };
  const [occupato, setOccupato] = useState(false);
  const elencoVincoli = (campi?.vincoli ?? []).map((v) => v.trim()).filter((v) => v.length > 0);
  const sporca = !!dati && !!campi && (campi.meteoGiorno !== (dati.meteoGiorno ?? '') || campi.meteoSera !== (dati.meteoSera ?? '') || campi.notaMeteo !== (dati.notaMeteo ?? '')
    || campi.daVerificare !== dati.meteoDaVerificare || campi.trama !== dati.trama || JSON.stringify(elencoVincoli) !== JSON.stringify(dati.vincoli));
  useBozzaSporca(`giorno:${data}`, `il giorno ${dataGiocoTesto(data)}`, sporca);

  const esegui = async (azione: () => Promise<GiornoModificabileDto>, esito: string) => {
    setOccupato(true);
    try { await azione(); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const salva = () => {
    if (!campi) return;
    return esegui(() => salvaGiornoModificabile(data, {
      meteoGiorno: campi.meteoGiorno === '' ? null : campi.meteoGiorno, meteoSera: campi.meteoSera === '' ? null : campi.meteoSera,
      notaMeteo: campi.notaMeteo.trim() === '' ? null : campi.notaMeteo.trim(), meteoDaVerificare: campi.daVerificare, trama: campi.trama, vincoli: elencoVincoli,
    }), 'Giorno salvato.');
  };

  return (
    <FinestraModifica titolo={titolo} onChiudi={onChiudi} onSalva={salva} salvabile={sporca} occupato={occupato} sporca={sporca}
      caricamento={!campi} erroreCaricamento={campi ? null : d.errore}
      azioniExtra={dati?.modificato ? <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void esegui(() => ripristinaGiornoModificabile(data), 'Giorno ripristinato come nella guida.')} /> : undefined}>
      {campi && (
        <>
          <SezioneCampi titolo="Meteo">
            <Selettore etichettaSopra etichetta="Meteo di giorno" valore={campi.meteoGiorno} vuoto="Non indicato" opzioni={OPZIONI_METEO} onCambia={(v) => imposta({ meteoGiorno: v as MeteoGiorno | '' })} disabilitato={occupato} />
            <Selettore etichettaSopra etichetta="Meteo di sera" valore={campi.meteoSera} vuoto="Non indicato" opzioni={OPZIONI_METEO} onCambia={(v) => imposta({ meteoSera: v as MeteoGiorno | '' })} disabilitato={occupato} />
            <CampoTesto etichetta="Nota sul meteo" largo valore={campi.notaMeteo} massimo={200} disabilitato={occupato} onCambia={(v) => imposta({ notaMeteo: v })} />
            <label className="touch campo--largo flex items-center gap-2 testo-13">
              <input type="checkbox" checked={campi.daVerificare} disabled={occupato} onChange={(e) => imposta({ daVerificare: e.target.checked })} />
              Il meteo è una divergenza fra le fonti, da verificare in gioco
            </label>
          </SezioneCampi>
          <SezioneCampi titolo="Il giorno">
            <CampoTesto etichetta="Trama del giorno" tipo="lungo" righe={4} valore={campi.trama} massimo={4000} disabilitato={occupato} onCambia={(v) => imposta({ trama: v })} />
            <CampoElenco etichetta="Vincoli" voci={campi.vincoli} onCambia={(v) => imposta({ vincoli: v })} disabilitato={occupato} />
          </SezioneCampi>
        </>
      )}
    </FinestraModifica>
  );
}
