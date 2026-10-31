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
import { Blocco, Campo } from './campi';
import { Campo as CampoComune, CampoTesto, SezioneCampi } from '../../shared/Campo';
import type { ProgrammaPunti } from './definizioni';
import { erroriSconto, type ScontoNegozio } from '../../../../shared/scontiNegozi';
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
  // chiusura dell'ondata 5: lo sconto dal rango di un Confidente (la Clinica di Takemi), un dato del negozio; il prezzo resta quello dell'offerta
  const sconto = (dati.sconto_json as ScontoNegozio | null) ?? null;
  const erroriDelloSconto = sconto ? erroriSconto(sconto) : {};
  // L13 (O7-5): a sezioni come le altre finestre di modifica, con l'etichetta unica dei campi (`CampoTesto`)
  return (
    <div className="flex flex-col gap-5">
      <SezioneCampi titolo="Negozio">
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
        <Campo nome="note" etichetta="Note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
      </SezioneCampi>
      <SezioneCampi titolo="Orari">
        <p className="campo--largo m-0 testo-12 text-text-muted">Gli orari sono quelli del luogo (la sede): si cambiano dal luogo. Qui solo se il negozio ha orari suoi.</p>
        <label className="campo--largo flex items-start gap-2 testo-13 touch">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={eccezione !== null} disabled={disabilitato} onChange={(e) => imposta({ eccezione_orari_json: e.target.checked ? { ...ORARI_SEMPRE } : null })} />
          <span>Il negozio ha orari suoi, diversi da quelli del luogo</span>
        </label>
        {eccezione && <Blocco largo><OrariEditor valore={eccezione} onCambia={(o) => imposta({ eccezione_orari_json: o })} disabilitato={disabilitato} /></Blocco>}
      </SezioneCampi>
      <SezioneCampi titolo="Sblocco del negozio">
        <p className="campo--largo m-0 testo-12 text-text-muted">Il luogo deve essere sbloccato. Aggiungi qui le eventuali condizioni proprie del negozio; lasciando vuoto valgono quelle della sede.</p>
        <Blocco largo><CondizioniEditor condizioni={(dati.sblocco_json as RequisitoSpillo[] | undefined) ?? []} onCambia={(sblocco_json) => imposta({ sblocco_json })} disabilitato={disabilitato} /></Blocco>
      </SezioneCampi>
      <SezioneCampi titolo="Programma punti">
        <label className="campo--largo flex items-start gap-2 testo-13 touch">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={programma !== null} disabled={disabilitato}
            onChange={(e) => imposta({ programma_punti_json: e.target.checked ? { nome: 'Punti', unita: 'punti', calcolo: 'manuale' } : null })} />
          <span>Il negozio ha un programma punti</span>
        </label>
        {programma && (
          <>
            <CampoTesto etichetta="Nome del programma" valore={programma.nome} massimo={80} disabilitato={disabilitato} onCambia={(nome) => imposta({ programma_punti_json: { ...programma, nome } })} />
            <CampoTesto etichetta="Unità" valore={programma.unita} massimo={40} disabilitato={disabilitato} onCambia={(unita) => imposta({ programma_punti_json: { ...programma, unita } })} />
            <Blocco largo>
              <Selettore etichetta="Come si calcolano" valore={programma.calcolo} ricerca="mai" disabilitato={disabilitato}
                opzioni={[{ chiave: 'manuale', nome: 'Li segno io', dettaglio: 'I punti vengono dalle vendite: non si ricavano dalla spesa' }, { chiave: 'rango-cliente', nome: 'Dal rango cliente', dettaglio: 'L’app li ricava dalla spesa nel negozio' }]}
                onCambia={(k) => imposta({ programma_punti_json: { ...programma, calcolo: k as ProgrammaPunti['calcolo'] } })} />
            </Blocco>
          </>
        )}
      </SezioneCampi>
      <SezioneCampi titolo="Sconto dal rango di un Confidente">
        <label className="campo--largo flex items-start gap-2 testo-13 touch">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={sconto !== null} disabled={disabilitato}
            onChange={(e) => imposta({ sconto_json: e.target.checked ? { confidente: testoDi(dati.confidente_chiave), rango: 10, percentuale: 50 } : null })} />
          <span>Il negozio fa uno sconto quando un Confidente arriva a un rango</span>
        </label>
        {sconto && (
          <>
            <Blocco largo>
              {/* revisione della chiusura dell'ondata 5 (N2): che cosa manca si dice accanto al campo, non solo spegnendo «Salva»; il messaggio è
                  la descrizione accessibile del campo (fuori dall'etichetta, che resta il solo nome) e gli id sono propri del modulo */}
              <Selettore etichetta="Confidente" valore={sconto.confidente} vuoto="Scegli il Confidente" disabilitato={disabilitato || confidenti.caricamento}
                errore={erroriDelloSconto.confidente}
                opzioni={(confidenti.dati ?? []).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))} onCambia={(k) => imposta({ sconto_json: { ...sconto, confidente: k } })} />
            </Blocco>
            {/* il campo comune: errore sotto il controllo come descrizione accessibile (aria-describedby, aria-invalid) */}
            <CampoComune etichetta="Dal rango" errore={erroriDelloSconto.rango}>
              {(p) => <input {...p} className="form-input tabular-nums" type="number" inputMode="numeric" min={1} max={10} value={sconto.rango > 0 ? sconto.rango : ''} disabled={disabilitato}
                onChange={(e) => imposta({ sconto_json: { ...sconto, rango: e.target.value === '' ? 0 : Number(e.target.value) } })} />}
            </CampoComune>
            <CampoComune etichetta="Sconto in percentuale" errore={erroriDelloSconto.percentuale}>
              {(p) => <input {...p} className="form-input tabular-nums" type="number" inputMode="numeric" min={1} max={99} value={sconto.percentuale > 0 ? sconto.percentuale : ''} disabled={disabilitato}
                onChange={(e) => imposta({ sconto_json: { ...sconto, percentuale: e.target.value === '' ? 0 : Number(e.target.value) } })} />}
            </CampoComune>
          </>
        )}
      </SezioneCampi>
    </div>
  );
}
