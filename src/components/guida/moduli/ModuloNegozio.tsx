// ============================================================
// ModuloNegozio — un punto vendita (tabella `negozio`): nome, che cosa vende, sede, gestore e Confidente, orari propri, sblocco, programma
// punti, sconto
// ============================================================
//
// Sede, eccezione di orario e sblocco proprio (122). Le vecchie condizioni trasferite agli articoli (070)
// restano storiche: non vengono riattivate dal nuovo editor. Il programma punti si dichiara dove esiste.
// L3: i campi sono `CampiPuntoVendita`, gli stessi nel modulo da solo (Aggiungi un negozio, negozi senza sede) e nell'editor del posto.
// Nel posto la sede è il luogo stesso (nessun campo «Sede»), e quel che non serve ogni volta sta ripiegato sotto «Altro del punto vendita».
// «Che cosa vende» è il genere del punto vendita, distinto dal «Genere di posto» del luogo e dal «Segno sulla mappa» del pin.
// ============================================================

import type { ReactNode } from 'react';
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
import { RANGO_MASSIMO_CONFIDENTE } from '../../../../shared/puntiConfidenti';

const OPZIONI_TIPO = Object.entries(NOME_TIPO_NEGOZIO).map(([chiave, nome]) => ({ chiave, nome }));

/** Il modulo del catalogo per un negozio: i campi del punto vendita, sede compresa. */
export function ModuloNegozio(props: PropsModulo) {
  return <CampiPuntoVendita dati={props.dati} imposta={props.imposta} disabilitato={props.disabilitato} />;
}

interface PropsCampi extends Pick<PropsModulo, 'dati' | 'imposta' | 'disabilitato'> {
  /** Nell'editor del posto: la sede è il luogo (nessun campo) e il resto sta ripiegato. */
  nelPosto?: boolean;
}

/**
 * I campi di un punto vendita: nome, che cosa vende, sede (fuori dal posto: il quartiere se ne deriva), gestore, Confidente (dall'elenco
 * caricato), orari propri, sblocco proprio, programma punti (spuntandolo nasce come «Punti» a calcolo manuale; togliendo la spunta sparisce),
 * sconto e note.
 */
export function CampiPuntoVendita({ dati, imposta, disabilitato, nelPosto = false }: PropsCampi) {
  const confidenti = useCarica(() => getConfidenti(), []);
  // L5 (R5-12b): gli orari sono del luogo (sede); qui solo l'eccezione del negozio, quando la guida lo distingue
  const eccezione = (dati.eccezione_orari_json as OrariNegozio | null) ?? null;
  const programma = (dati.programma_punti_json as ProgrammaPunti | null) ?? null;
  // chiusura dell'ondata 5: lo sconto dal rango di un Confidente (la Clinica di Takemi), un dato del negozio; il prezzo resta quello dell'offerta
  const sconto = (dati.sconto_json as ScontoNegozio | null) ?? null;
  const erroriDelloSconto = sconto ? erroriSconto(sconto) : {};
  const altro: ReactNode = <>
    <SezioneCampi titolo={nelPosto ? 'Chi lo gestisce' : 'Gestione'}>
      <Campo nome="gestore" etichetta="Chi lo gestisce" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} />
      <Blocco>
        <Selettore etichetta="Confidente" valore={testoDi(dati.confidente_chiave)} vuoto="Nessun Confidente" disabilitato={disabilitato || confidenti.caricamento}
          opzioni={(confidenti.dati ?? []).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))} onCambia={(k) => imposta({ confidente_chiave: k || null })} />
      </Blocco>
      <Campo nome="note" etichetta="Note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
    </SezioneCampi>
    <SezioneCampi titolo="Orari propri">
      <label className="campo--largo flex items-start gap-2 testo-13 touch">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={eccezione !== null} disabled={disabilitato} onChange={(e) => imposta({ eccezione_orari_json: e.target.checked ? { ...ORARI_SEMPRE } : null })} />
        {/* senza sede non c'è un luogo da cui prendere gli orari (il negozio del Palazzo di Niijima): questi sono i suoi soli orari */}
        <span>{testoDi(dati.sede_chiave) || nelPosto ? 'Ha orari suoi, diversi da quelli del luogo' : 'Ha orari suoi (senza sede non ha quelli di un luogo)'}</span>
      </label>
      {eccezione && <Blocco largo><OrariEditor valore={eccezione} onCambia={(o) => imposta({ eccezione_orari_json: o })} disabilitato={disabilitato} /></Blocco>}
    </SezioneCampi>
    <SezioneCampi titolo="Sblocco proprio">
      <p className="campo--largo m-0 testo-12 text-text-muted">Si aggiunge a quello del luogo; vuoto vale quello del luogo.</p>
      <Blocco largo><CondizioniEditor condizioni={(dati.sblocco_json as RequisitoSpillo[] | undefined) ?? []} onCambia={(sblocco_json) => imposta({ sblocco_json })} disabilitato={disabilitato} /></Blocco>
    </SezioneCampi>
    <SezioneCampi titolo="Programma punti">
      <label className="campo--largo flex items-start gap-2 testo-13 touch">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={programma !== null} disabled={disabilitato}
          onChange={(e) => imposta({ programma_punti_json: e.target.checked ? { nome: 'Punti', unita: 'punti', calcolo: 'manuale' } : null })} />
        <span>Ha un programma punti</span>
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
          onChange={(e) => imposta({ sconto_json: e.target.checked ? { confidente: testoDi(dati.confidente_chiave), rango: RANGO_MASSIMO_CONFIDENTE, percentuale: 50 } : null })} />
        <span>Fa uno sconto quando un Confidente arriva a un rango</span>
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
            {(p) => <input {...p} className="form-input tabular-nums" type="number" inputMode="numeric" min={1} max={RANGO_MASSIMO_CONFIDENTE} value={sconto.rango > 0 ? sconto.rango : ''} disabled={disabilitato}
              onChange={(e) => imposta({ sconto_json: { ...sconto, rango: e.target.value === '' ? 0 : Number(e.target.value) } })} />}
          </CampoComune>
          <CampoComune etichetta="Sconto in percentuale" errore={erroriDelloSconto.percentuale}>
            {(p) => <input {...p} className="form-input tabular-nums" type="number" inputMode="numeric" min={1} max={99} value={sconto.percentuale > 0 ? sconto.percentuale : ''} disabled={disabilitato}
              onChange={(e) => imposta({ sconto_json: { ...sconto, percentuale: e.target.value === '' ? 0 : Number(e.target.value) } })} />}
          </CampoComune>
        </>
      )}
    </SezioneCampi>
  </>;
  // L13 (O7-5): a sezioni come le altre finestre di modifica, con l'etichetta unica dei campi (`CampoTesto`)
  return (
    <div className="flex flex-col gap-5">
      <SezioneCampi titolo="Punto vendita">
        <Campo nome="nome" etichetta="Nome del punto vendita" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo={!nelPosto} />
        {/* nel posto un selettore: le 13 tessere spingevano il listino sotto la piega (a 1280 tre righe, 200 px) */}
        {nelPosto
          ? <Blocco><Selettore etichettaSopra etichetta="Che cosa vende" valore={testoDi(dati.tipo)} opzioni={OPZIONI_TIPO} ricerca="mai" disabilitato={disabilitato} onCambia={(tipo) => imposta({ tipo })} /></Blocco>
          : <Blocco largo>
            <SelettoreIcone compatto etichetta="Che cosa vende" valore={testoDi(dati.tipo)} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={(tipo) => imposta({ tipo })} />
          </Blocco>}
        {!nelPosto && <SceltaLuogo etichetta="Sede" valore={(dati.sede_chiave as string | null) ?? null} disabilitato={disabilitato}
          onCambia={(sede) => imposta({ sede_chiave: sede })} />}
      </SezioneCampi>
      {nelPosto
        ? <details className="ripiegabile flex flex-col gap-5">
          <summary className="touch testo-14 font-semibold"><span className="ripiegabile__freccia" aria-hidden="true">▸</span> Altro del punto vendita <span className="font-normal text-text-muted">· gestore, orari propri, sblocco, punti, sconto</span></summary>
          <div className="flex flex-col gap-5 pt-3">{altro}</div>
        </details>
        : altro}
    </div>
  );
}
