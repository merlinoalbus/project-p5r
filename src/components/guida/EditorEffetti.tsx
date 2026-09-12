// ============================================================
// EditorEffetti — l'elenco degli effetti di un libro, di un film, di un'attività
// ============================================================
//
// Ogni voce è un effetto dichiarato (`EditorEffetto`), con due cose in più che le letture hanno e
// gli articoli no: «vale anche alle volte successive» (i film al cinema, dove la guida dichiara
// quanto rende rivederli) e le condizioni sotto cui la voce scatta (lo studio al Leblanc: 2 note,
// 3 con la pioggia). È il campo che la partita usa: i punti Dote di un conseguimento vengono da qui.
// ============================================================

import { useState } from 'react';
import { CondizioniEditor } from './CondizioniEditor';
import { EditorEffetto } from './EditorEffetto';
import { effettoPredefinito, type NomiPerEffetti } from '../../utils/effetti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { VoceEffetto } from '../../../shared/effettiCatalogo';
import { descriviVoceEffetto } from '../../../shared/effettiCatalogo';

interface Props extends NomiPerEffetti {
  voci: VoceEffetto[];
  onCambia: (v: VoceEffetto[]) => void;
  /** Offre «vale anche alle volte successive»: solo dove rivedere conta (i film al cinema). */
  conRipetuto?: boolean;
  disabilitato?: boolean;
  aiuto?: string;
}

function Voce({ voce, indice, onCambia, onTogli, conRipetuto, disabilitato, quartieri, attivita, confidenti, erroreNomi, riprovaNomi }: { voce: VoceEffetto; indice: number; onCambia: (v: VoceEffetto) => void; onTogli: () => void } & Pick<Props, 'conRipetuto' | 'disabilitato' | 'quartieri' | 'attivita' | 'confidenti' | 'erroreNomi' | 'riprovaNomi'>) {
  const [condizioniAperte, setCondizioniAperte] = useState((voce.condizioni?.length ?? 0) > 0);
  const nomi = { luoghi: Object.fromEntries((quartieri ?? []).map((q) => [q.chiave, q.nome])), attivita: Object.fromEntries((attivita ?? []).map((a) => [a.chiave, a.nome])) };
  return (
    <li className="editor-effetti__voce">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-[13px]">Effetto {indice + 1}: <span className="font-normal text-text-secondary">{descriviVoceEffetto(voce, nomi)}</span></strong>
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato} onClick={onTogli} aria-label={`Togli l'effetto ${indice + 1}`}>Togli</button>
      </div>
      <EditorEffetto etichetta={`Famiglia dell'effetto ${indice + 1}`} valore={voce.effetto} onCambia={(e) => onCambia({ ...voce, effetto: e ?? effettoPredefinito('dote') })} quartieri={quartieri} attivita={attivita} confidenti={confidenti} erroreNomi={erroreNomi} riprovaNomi={riprovaNomi} disabilitato={disabilitato} />
      <div className="flex flex-wrap items-center gap-3">
        {conRipetuto && (
          <label className="flex items-center gap-2 text-[13px] touch">
            <input type="checkbox" className="w-5 h-5" checked={voce.ripetuto === true} disabled={disabilitato} onChange={(e) => onCambia({ ...voce, ripetuto: e.target.checked || undefined })} />
            Vale anche alle volte successive
          </label>
        )}
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato} aria-expanded={condizioniAperte} onClick={() => setCondizioniAperte((a) => !a)}>
          {condizioniAperte ? 'Nascondi le condizioni' : `Condizioni${voce.condizioni?.length ? ` · ${voce.condizioni.length}` : ''}`}
        </button>
      </div>
      {condizioniAperte && <CondizioniEditor condizioni={voce.condizioni ?? []} onCambia={(c) => onCambia({ ...voce, condizioni: c.length ? c : undefined })} disabilitato={disabilitato} />}
    </li>
  );
}

export function EditorEffetti({ voci, onCambia, conRipetuto, disabilitato, quartieri, attivita, confidenti, erroreNomi, riprovaNomi, aiuto }: Props) {
  return (
    <fieldset className="regole-editor editor-effetti flex flex-col gap-2">
      <legend>Che cosa fa</legend>
      <p className="m-0 text-[12px] text-text-muted">{aiuto ?? 'Gli effetti dichiarati sono quelli che la partita applica: una Dote con le sue note diventa punti veri al completamento.'}</p>
      {voci.length === 0 && <p className="m-0 text-[12px] text-text-muted" role="status">Nessun effetto dichiarato.</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {voci.map((v, i) => (
          <Voce key={i} voce={v} indice={i} conRipetuto={conRipetuto} disabilitato={disabilitato} quartieri={quartieri} attivita={attivita} confidenti={confidenti} erroreNomi={erroreNomi} riprovaNomi={riprovaNomi}
            onCambia={(nuova) => onCambia(voci.map((x, j) => (j === i ? nuova : x)))} onTogli={() => onCambia(voci.filter((_, j) => j !== i))} />
        ))}
      </ul>
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" disabled={disabilitato}
        onClick={() => onCambia([...voci, { effetto: effettoPredefinito('dote') }])} />
    </fieldset>
  );
}
