// ============================================================
// ModuloNegozio — nome, tipo a tessere, sede in città, gestore e Confidente, orari come valori, programma punti
// ============================================================
//
// Niente sblocco, niente condizioni, niente fonte: la presenza del negozio sono i suoi orari
// (migrazione 069), e quel che sblocca la merce sta sugli articoli (070). La sede è un luogo della
// città (072) e porta con sé il quartiere. Il programma punti (076) si dichiara solo dove esiste.
// ============================================================

import { useCarica } from '../../../hooks/useCarica';
import { getConfidenti } from '../../../services/api/compendio';
import { Selettore } from '../../shared/Selettore';
import { SelettoreIcone } from '../../shared/SelettoreIcone';
import { OrariEditor } from '../OrariEditor';
import { SceltaLuogo } from '../SceltaLuogo';
import { NOME_TIPO_NEGOZIO } from '../../../utils/negozi';
import type { OrariNegozio } from '../../../../shared/orariNegozio';
import { testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import type { ProgrammaPunti } from './definizioni';

const OPZIONI_TIPO = Object.entries(NOME_TIPO_NEGOZIO).map(([chiave, nome]) => ({ chiave, nome }));

export function ModuloNegozio({ dati, imposta, disabilitato }: PropsModulo) {
  const confidenti = useCarica(() => getConfidenti(), []);
  const orari = dati.orari_json as OrariNegozio;
  const programma = (dati.programma_punti_json as ProgrammaPunti | null) ?? null;
  return (
    <div className="flex flex-col gap-3">
      <Griglia>
        <Campo nome="nome" etichetta="Nome del negozio" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
        <Blocco largo>
          <SelettoreIcone compatto etichetta="Tipo" valore={testoDi(dati.tipo)} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={(tipo) => imposta({ tipo })} />
        </Blocco>
        <SceltaLuogo etichetta="Sede" valore={{ sede: (dati.sede_chiave as string | null) ?? null, quartiere: (dati.luogo_chiave as string | null) ?? null }} disabilitato={disabilitato}
          onCambia={(v) => imposta({ sede_chiave: v.sede, luogo_chiave: v.quartiere })} />
        <Campo nome="luogo" etichetta="Come trovarlo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={200} aiuto="Facoltativo: «vicino alla stazione», «piano interrato»" />
        <Campo nome="gestore" etichetta="Chi lo gestisce" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} />
        <Blocco>
          <Selettore etichetta="Confidente" valore={testoDi(dati.confidente_chiave)} vuoto="Nessun Confidente" disabilitato={disabilitato || confidenti.caricamento}
            opzioni={(confidenti.dati ?? []).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))} onCambia={(k) => imposta({ confidente_chiave: k || null })} />
        </Blocco>
      </Griglia>
      <OrariEditor valore={orari} onCambia={(o) => imposta({ orari_json: o })} disabilitato={disabilitato} />
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Programma punti</legend>
        <label className="flex items-center gap-2 text-[13px] touch">
          <input type="checkbox" className="h-5 w-5" checked={programma !== null} disabled={disabilitato}
            onChange={(e) => imposta({ programma_punti_json: e.target.checked ? { nome: 'Punti', unita: 'punti', calcolo: 'manuale' } : null })} />
          Il negozio ha un programma punti
        </label>
        {programma && (
          <Griglia>
            <label className="editor-mappa__campo">Nome del programma<input className="form-input" maxLength={80} value={programma.nome} disabled={disabilitato} onChange={(e) => imposta({ programma_punti_json: { ...programma, nome: e.target.value } })} /></label>
            <label className="editor-mappa__campo">Unità<input className="form-input" maxLength={40} value={programma.unita} disabled={disabilitato} onChange={(e) => imposta({ programma_punti_json: { ...programma, unita: e.target.value } })} /></label>
            <Blocco largo>
              <Selettore etichetta="Come si calcolano" valore={programma.calcolo} ricerca="mai" disabilitato={disabilitato}
                opzioni={[{ chiave: 'manuale', nome: 'Li segno io', dettaglio: 'I punti vengono dalle vendite: non si ricavano dalla spesa' }, { chiave: 'rango-cliente', nome: 'Dal rango cliente', dettaglio: 'L’app li ricava dalla spesa nel negozio' }]}
                onCambia={(k) => imposta({ programma_punti_json: { ...programma, calcolo: k as ProgrammaPunti['calcolo'] } })} />
            </Blocco>
          </Griglia>
        )}
      </fieldset>
      <Griglia>
        <Campo nome="note" etichetta="Note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
      </Griglia>
    </div>
  );
}
