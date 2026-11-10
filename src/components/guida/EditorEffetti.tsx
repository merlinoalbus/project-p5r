// ============================================================
// EditorEffetti — l'elenco degli effetti di un libro, di un film, di un'attività
// ============================================================
//
// Ogni voce è un effetto dichiarato (`EditorEffetto`), con due cose in più che le letture hanno e
// gli articoli no: «vale dalla seconda volta in poi» (i film al cinema, dove la guida dichiara
// quanto rende rivederli, e i turni delle attività contate per volte; una voce senza vale solo
// alla prima) e le condizioni sotto cui la voce scatta (lo studio al Leblanc: 2 note, 3 con la
// pioggia). È il campo che la partita usa: i punti Dote di un conseguimento vengono da qui.
// ============================================================

import { useState } from 'react';
import { CondizioniEditor } from './CondizioniEditor';
import { useIdStabili } from '../../hooks/useIdStabili';
import { EditorEffetto } from './EditorEffetto';
import { effettoPredefinito, type NomiPerEffetti } from '../../utils/effetti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { VoceEffetto } from '../../../shared/effettiCatalogo';
import { descriviVoceEffetto } from '../../../shared/effettiCatalogo';
import { TestoNote } from '../shared/TestoNote';

interface Props extends NomiPerEffetti {
  voci: VoceEffetto[];
  onCambia: (v: VoceEffetto[]) => void;
  /** Offre «vale dalla seconda volta in poi»: solo dove si ripete (i film al cinema, le attività contate per volte). */
  conRipetuto?: boolean;
  disabilitato?: boolean;
  aiuto?: string;
  /** Una spiegazione più lunga, ripiegata sotto l'aiuto. */
  aiutoEsteso?: { titolo: string; testo: string };
  /** Ogni voce è una riga con la sua frase; si apre con «Modifica», una per volta (film e attività: le voci aperte allungavano il modulo). */
  ripiegate?: boolean;
}

/**
 * Una voce dell'elenco: la frase che descrive l'effetto, «Togli», l'editor della famiglia e dei parametri (se si
 * sceglie «nessuno» torna a una Dote predefinita), la spunta «vale dalla seconda volta in poi» solo con `conRipetuto`
 * e le condizioni, a scomparsa (aperte all'inizio se la voce ne ha). Un elenco di condizioni vuoto si salva come assente.
 */
function Voce({ voce, indice, onCambia, onTogli, conRipetuto, disabilitato, quartieri, attivita, aperta, onAlterna }: { voce: VoceEffetto; indice: number; onCambia: (v: VoceEffetto) => void; onTogli: () => void; aperta: boolean; /** Solo per le voci ripiegabili: apre o chiude la voce. */ onAlterna?: () => void } & Pick<Props, 'conRipetuto' | 'disabilitato' | 'quartieri' | 'attivita'>) {
  const [condizioniAperte, setCondizioniAperte] = useState((voce.condizioni?.length ?? 0) > 0);
  const nomi = { luoghi: Object.fromEntries((quartieri ?? []).map((q) => [q.chiave, q.nome])), attivita: Object.fromEntries((attivita ?? []).map((a) => [a.chiave, a.nome])) };
  return (
    <li className="editor-effetti__voce">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* sulla riga chiusa si legge quello che il corpo nasconderebbe: se vale dalla seconda volta e quante condizioni ha */}
        <strong className="min-w-0 flex-1 testo-13">Effetto {indice + 1}: <span className="font-normal text-text-secondary"><TestoNote testo={descriviVoceEffetto(voce, nomi)} />{!aperta && voce.ripetuto ? ' · dalla seconda volta' : ''}{!aperta && voce.condizioni?.length ? ` · condizioni ${voce.condizioni.length}` : ''}</span></strong>
        <span className="flex flex-wrap items-center gap-1">
          {onAlterna && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={aperta ? 'chiudi' : 'modifica'} dimensione={20} />} titolo={aperta ? 'Chiudi' : 'Modifica'} aria-expanded={aperta} aria-label={`${aperta ? 'Chiudi' : 'Modifica'} l'effetto ${indice + 1}`} disabled={disabilitato} onClick={onAlterna} />}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli" disabled={disabilitato} onClick={onTogli} aria-label={`Togli l'effetto ${indice + 1}`} />
        </span>
      </div>
      {aperta && <>
        <EditorEffetto etichetta={`Famiglia dell'effetto ${indice + 1}`} valore={voce.effetto} onCambia={(e) => onCambia({ ...voce, effetto: e ?? effettoPredefinito('dote') })} quartieri={quartieri} attivita={attivita} disabilitato={disabilitato} />
        <div className="flex flex-wrap items-center gap-3">
          {conRipetuto && (
            <label className="flex items-center gap-2 testo-13 touch">
              <input type="checkbox" className="w-5 h-5" checked={voce.ripetuto === true} disabled={disabilitato} onChange={(e) => onCambia({ ...voce, ripetuto: e.target.checked || undefined })} />
              Vale dalla seconda volta in poi
            </label>
          )}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="filtri" dimensione={20} />} titolo={condizioniAperte ? 'Nascondi le condizioni' : `Condizioni${voce.condizioni?.length ? ` · ${voce.condizioni.length}` : ''}`} disabled={disabilitato} aria-expanded={condizioniAperte} onClick={() => setCondizioniAperte((a) => !a)} />
        </div>
        {condizioniAperte && <CondizioniEditor condizioni={voce.condizioni ?? []} onCambia={(c) => onCambia({ ...voce, condizioni: c.length ? c : undefined })} disabilitato={disabilitato} />}
      </>}
    </li>
  );
}

/**
 * L'elenco degli effetti dichiarati con «Aggiungi un effetto» (nasce come Dote predefinita): ogni voce si modifica o
 * si toglie sul posto e ogni cambio passa al genitore l'elenco intero. `aiuto` sostituisce la spiegazione predefinita.
 */
export function EditorEffetti({ voci, onCambia, conRipetuto, disabilitato, quartieri, attivita, aiuto, aiutoEsteso, ripiegate }: Props) {
  // ogni voce ha uno stato suo (le condizioni aperte): la chiave è un id stabile, non l'indice (`useIdStabili`)
  const chiavi = useIdStabili(voci.length);
  // la voce aperta fra quelle ripiegate: «ultima» è quella appena aggiunta, che nasce aperta (il suo id si conosce solo al giro dopo)
  const [scelta, setScelta] = useState<number | 'ultima' | null>(null);
  const idAperto = scelta === 'ultima' ? chiavi.ids[chiavi.ids.length - 1] : scelta;
  return (
    <fieldset className="regole-editor editor-effetti flex flex-col gap-2">
      <legend>Che cosa fa</legend>
      <p className="m-0 testo-12 text-text-muted">{aiuto ?? 'Gli effetti dichiarati sono quelli che la partita applica: una Dote con le sue note diventa punti veri al completamento.'}</p>
      {aiutoEsteso && <details className="testo-12 text-text-muted"><summary className="touch cursor-pointer">{aiutoEsteso.titolo}</summary><p className="m-0">{aiutoEsteso.testo}</p></details>}
      {voci.length === 0 && <p className="m-0 testo-12 text-text-muted" role="status">Nessun effetto dichiarato.</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {voci.map((v, i) => (
          <Voce key={chiavi.ids[i]} voce={v} indice={i} conRipetuto={conRipetuto} disabilitato={disabilitato} quartieri={quartieri} attivita={attivita}
            aperta={!ripiegate || idAperto === chiavi.ids[i]} onAlterna={ripiegate ? () => setScelta(idAperto === chiavi.ids[i] ? null : chiavi.ids[i]!) : undefined}
            onCambia={(nuova) => onCambia(voci.map((x, j) => (j === i ? nuova : x)))}
            onTogli={() => { if (idAperto === chiavi.ids[i]) setScelta(null); chiavi.togli(i); onCambia(voci.filter((_, j) => j !== i)); }} />
        ))}
      </ul>
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" disabled={disabilitato}
        onClick={() => { chiavi.aggiungi(); setScelta('ultima'); onCambia([...voci, { effetto: effettoPredefinito('dote') }]); }} />
    </fieldset>
  );
}
