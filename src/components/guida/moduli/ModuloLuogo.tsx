// ============================================================
// ModuloLuogo — un luogo della città: nome, tipo a tessere (l'icona dello spillo), quartiere, che cosa offre, quando, giorni a chip (migrazione 080), note
// ============================================================

import { useCarica } from '../../../hooks/useCarica';
import { getQuartieri } from '../../../services/api/compendio';
import { Selettore } from '../../shared/Selettore';
import { IconaSpillo } from '../../mappe/IconaSpillo';
import { SelettoreIcone, type OpzioneIcone } from '../../shared/SelettoreIcone';
import { TIPI_LUOGO } from '../../../../shared/tipiLuogo';
import { testoDi, type PropsModulo } from './base';
import { Interruttori } from '../OrariEditor';
import { type GiornoChiave } from '../../../../shared/orariNegozio';
import { GIORNI_SETTIMANA } from '../../../../shared/condizioniSpillo';
import { Blocco, Campo, Griglia } from './campi';

const OPZIONI_TIPO: OpzioneIcone[] = TIPI_LUOGO.map((t) => ({ chiave: t.chiave, nome: t.nome, icona: <IconaSpillo tipo={t.icona} dimensione={28} /> }));
const OPZIONI_QUANDO = [{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }, { chiave: 'entrambe', nome: 'Giorno e sera' }];

export function ModuloLuogo({ dati, imposta, disabilitato }: PropsModulo) {
  const quartieri = useCarica(() => getQuartieri(), []);
  const attuale = testoDi(dati.quartiere_chiave);
  const opzioniQuartiere = [...(attuale && !quartieri.dati?.some((q) => q.chiave === attuale) ? [{ chiave: attuale, nome: attuale }] : []), ...(quartieri.dati ?? []).map((q) => ({ chiave: q.chiave, nome: q.nome }))];
  return (
    <Griglia>
      <Campo nome="nome" etichetta="Nome del luogo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
      <Blocco largo>
        <SelettoreIcone compatto etichetta="Tipo" valore={testoDi(dati.tipo) || 'altro'} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={(tipo) => imposta({ tipo })} />
      </Blocco>
      <Blocco>
        <Selettore etichetta="Quartiere" valore={attuale} vuoto="Scegli il quartiere…" disabilitato={disabilitato || quartieri.caricamento} opzioni={opzioniQuartiere} onCambia={(k) => imposta({ quartiere_chiave: k })} />
        {quartieri.errore && <span role="alert" className="text-[11px] text-error">Impossibile caricare i quartieri. <button type="button" className="btn btn-sm touch" onClick={() => void quartieri.ricarica()}>Riprova</button></span>}
      </Blocco>
      <Blocco>
        <Selettore etichetta="Quando" valore={testoDi(dati.quando)} vuoto="Non indicato" ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_QUANDO} onCambia={(k) => imposta({ quando: k || null })} />
      </Blocco>
      <Campo nome="cosa_offre" etichetta="Che cosa offre" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={600} />
      <Blocco largo>
        <Interruttori<GiornoChiave> etichetta="Giorni (nessuno = tutti)" scelte={Array.isArray(dati.giorni_json) ? (dati.giorni_json as GiornoChiave[]) : []} opzioni={GIORNI_SETTIMANA} disabilitato={disabilitato} onCambia={(giorni_json) => imposta({ giorni_json })} />
      </Blocco>
      <Campo nome="note" etichetta="Note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
    </Griglia>
  );
}
