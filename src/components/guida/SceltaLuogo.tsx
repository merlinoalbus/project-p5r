// ============================================================
// SceltaLuogo — la sede di un negozio o di un'attività: un luogo della città
// ============================================================
//
// I luoghi sono raggruppati per quartiere con il tipo come dettaglio. La sede è l'unico «dove» (`sede_chiave`): il quartiere se ne
// deriva (luogo → quartiere) e non si scrive più. La voce vuota è per chi non ha una sede in città (online, ambulante, dentro un Palazzo).
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getLuoghi, getQuartieri } from '../../services/api';
import { Selettore, type OpzioneSelettore } from '../shared/Selettore';
import { definizioneTipoLuogo } from '../../../shared/tipiLuogo';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  /** La chiave del luogo scelto (`sede_chiave`), o null senza sede. */
  valore: string | null;
  onCambia: (sede: string | null) => void;
  etichetta?: string;
  disabilitato?: boolean;
}

/**
 * Il selettore della sede: carica quartieri e luoghi e costruisce le voci per quartiere (i luoghi col loro tipo). La voce vuota
 * azzera la sede. Un valore salvato che l'elenco non conosce resta come prima voce.
 */
export function SceltaLuogo({ valore, onCambia, etichetta = 'Sede', disabilitato }: Props) {
  const dati = useCarica(async () => { const [quartieri, luoghi] = await Promise.all([getQuartieri(), getLuoghi()]); return { quartieri, luoghi }; }, []);
  const opzioni: OpzioneSelettore[] = [];
  for (const q of dati.dati?.quartieri ?? []) {
    for (const l of (dati.dati?.luoghi ?? []).filter((x) => x.quartiere === q.chiave)) opzioni.push({ chiave: l.chiave, nome: l.nome, dettaglio: definizioneTipoLuogo(l.tipo).nome, gruppo: q.nome });
  }
  // la sede scelta resta selezionata anche se l'elenco non la conosce (dati vecchi) o non è ancora arrivato: si dice perché, mai la chiave grezza
  const attuale = valore ?? '';
  if (attuale && !opzioni.some((o) => o.chiave === attuale)) opzioni.unshift({ chiave: attuale, nome: dati.caricamento ? 'Un attimo…' : dati.errore ? 'Sede scelta (luoghi non caricati)' : 'Luogo non più nell’elenco' });
  return (
    <div className="editor-mappa__campo">
      <Selettore etichetta={etichetta} valore={attuale} disabilitato={disabilitato || dati.caricamento} ricerca="sempre" vuoto="Nessuna sede (online, ambulante o da assegnare)" opzioni={opzioni}
        onCambia={(k) => onCambia(k || null)} />
      {dati.errore && <span role="alert" className="testo-12 text-error-testo">Impossibile caricare i luoghi. <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void dati.ricarica()} /></span>}
    </div>
  );
}
