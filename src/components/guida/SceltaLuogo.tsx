// ============================================================
// SceltaLuogo — la sede di un negozio o di un'attività: un luogo della città, o solo il quartiere
// ============================================================
//
// I luoghi sono raggruppati per quartiere con il tipo come dettaglio; in testa a ogni gruppo c'è
// «solo il quartiere», per chi sta in un quartiere senza un posto preciso. Scegliere un luogo
// imposta anche il quartiere (è l'invariante del server: il quartiere è quello della sede). La
// voce vuota è per chi non ha una sede in città (online, ambulante, dentro un Palazzo).
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getLuoghi, getQuartieri } from '../../services/api/compendio';
import { Selettore, type OpzioneSelettore } from '../shared/Selettore';
import { definizioneTipoLuogo } from '../../../shared/tipiLuogo';

export interface SedeScelta { sede: string | null; quartiere: string | null }

interface Props {
  valore: SedeScelta;
  onCambia: (v: SedeScelta) => void;
  etichetta?: string;
  disabilitato?: boolean;
}

const SOLO_QUARTIERE = 'q:';

export function SceltaLuogo({ valore, onCambia, etichetta = 'Sede', disabilitato }: Props) {
  const dati = useCarica(async () => { const [quartieri, luoghi] = await Promise.all([getQuartieri(), getLuoghi()]); return { quartieri, luoghi }; }, []);
  const opzioni: OpzioneSelettore[] = [];
  for (const q of dati.dati?.quartieri ?? []) {
    opzioni.push({ chiave: `${SOLO_QUARTIERE}${q.chiave}`, nome: `${q.nome} (solo il quartiere)`, gruppo: q.nome });
    for (const l of (dati.dati?.luoghi ?? []).filter((x) => x.quartiere === q.chiave)) opzioni.push({ chiave: l.chiave, nome: l.nome, dettaglio: definizioneTipoLuogo(l.tipo).nome, gruppo: q.nome });
  }
  // un valore che l'elenco non conosce (dati vecchi) resta visibile, non sparisce
  const attuale = valore.sede ?? (valore.quartiere ? `${SOLO_QUARTIERE}${valore.quartiere}` : '');
  if (attuale && !opzioni.some((o) => o.chiave === attuale)) opzioni.unshift({ chiave: attuale, nome: valore.sede ?? valore.quartiere ?? attuale });
  return (
    <div className="editor-mappa__campo">
      <Selettore etichetta={etichetta} valore={attuale} disabilitato={disabilitato || dati.caricamento} ricerca="sempre" vuoto="Nessuna sede (online, ambulante o da assegnare)" opzioni={opzioni}
        onCambia={(k) => {
          if (!k) return onCambia({ sede: null, quartiere: null });
          if (k.startsWith(SOLO_QUARTIERE)) return onCambia({ sede: null, quartiere: k.slice(SOLO_QUARTIERE.length) });
          const luogo = dati.dati?.luoghi.find((l) => l.chiave === k);
          onCambia({ sede: k, quartiere: luogo?.quartiere ?? valore.quartiere });
        }} />
      {dati.errore && <span role="alert" className="text-[11px] text-error">Impossibile caricare i luoghi. <button type="button" className="btn btn-sm touch" onClick={() => void dati.ricarica()}>Riprova</button></span>}
    </div>
  );
}
