// ============================================================
// ModuloNegozio — nome, tipo a tessere, sede in città, gestore e Confidente, orari come valori, programma punti
// ============================================================
//
// Sede, eccezione di orario e sblocco proprio (122). Le vecchie condizioni trasferite agli articoli (070)
// restano storiche: non vengono riattivate dal nuovo editor. Il programma punti si dichiara dove esiste.
// ============================================================

import { useCarica } from '../../../hooks/useCarica';
import { getConfidenti } from '../../../services/api';
import { Selettore } from '../../shared/Selettore';
import { SelettoreIcone } from '../../shared/SelettoreIcone';
import { OrariEditor } from '../OrariEditor';
import { SceltaLuogo } from '../SceltaLuogo';
import { NOME_TIPO_NEGOZIO } from '../../../utils/negozi';
import { ORARI_SEMPRE, type OrariNegozio } from '../../../../shared/orariNegozio';
import { testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import type { ProgrammaPunti } from './definizioni';
import { CondizioniEditor } from '../CondizioniEditor';
import type { RequisitoSpillo } from '../../../../shared/condizioniSpillo';

const OPZIONI_TIPO = Object.entries(NOME_TIPO_NEGOZIO).map(([chiave, nome]) => ({ chiave, nome }));

/**
 * I campi di un negozio: nome, tipo, sede (con il quartiere), come trovarlo, gestore, Confidente (dall'elenco
 * caricato), orari, programma punti (spuntandolo nasce come «Punti» a calcolo manuale; togliendo la spunta sparisce)
 * e note.
 */
export function ModuloNegozio({ dati, imposta, disabilitato }: PropsModulo) {
  const confidenti = useCarica(() => getConfidenti(), []);
  // L5 (R5-12b): gli orari sono del luogo (sede); qui solo l'eccezione del negozio, quando la guida lo distingue
  const eccezione = (dati.eccezione_orari_json as OrariNegozio | null) ?? null;
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
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Orari</legend>
        <p className="m-0 text-[12px] text-text-muted">Gli orari sono quelli del luogo (la sede): si cambiano dal luogo. Qui solo se il negozio ha orari suoi.</p>
        <label className="flex items-center gap-2 text-[13px] touch">
          <input type="checkbox" className="h-5 w-5" checked={eccezione !== null} disabled={disabilitato} onChange={(e) => imposta({ eccezione_orari_json: e.target.checked ? { ...ORARI_SEMPRE } : null })} />
          Il negozio ha orari suoi, diversi da quelli del luogo
        </label>
        {eccezione && <OrariEditor valore={eccezione} onCambia={(o) => imposta({ eccezione_orari_json: o })} disabilitato={disabilitato} />}
      </fieldset>
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Sblocco del negozio</legend>
        <p className="m-0 text-[12px] text-text-muted">Il luogo deve essere sbloccato. Aggiungi qui le eventuali condizioni proprie del negozio; lasciando vuoto valgono quelle della sede.</p>
        <CondizioniEditor condizioni={(dati.sblocco_json as RequisitoSpillo[] | undefined) ?? []} onCambia={(sblocco_json) => imposta({ sblocco_json })} disabilitato={disabilitato} />
      </fieldset>
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
