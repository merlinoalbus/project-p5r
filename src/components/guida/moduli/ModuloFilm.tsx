// ============================================================
// ModuloFilm — titolo, dove si vede a tessere, prezzo, visioni (solo DVD), dettagli, effetti con «vale anche dopo» (solo cinema)
// ============================================================
//
// Al cinema una visione basta e la guida dichiara quanto rende rivederlo: la spunta «vale anche
// alle volte successive» c'è solo lì. Un DVD si completa in più visioni e non ha visioni ripetute.
// Il periodo in prosa non c'è più: quando è in programmazione lo dicono le condizioni.
// ============================================================

import { SelettoreIcone } from '../../shared/SelettoreIcone';
import { EditorEffetti } from '../EditorEffetti';
import type { VoceEffetto } from '../../../../shared/effettiCatalogo';
import { testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import { useNomiPerEffetti } from './nomiPerEffetti';

const OPZIONI_DOVE = [{ chiave: 'cinema', nome: 'Al cinema', categoria: 'film' }, { chiave: 'dvd', nome: 'In DVD', categoria: 'dvd' }];

export function ModuloFilm({ dati, imposta, disabilitato }: PropsModulo) {
  const nomi = useNomiPerEffetti();
  const cinema = dati.dove === 'cinema';
  const cambiaDove = (dove: string) => {
    const voci = dati.effetti_json as VoceEffetto[];
    // Le visioni ripetute valgono solo al cinema: passando al DVD cadono, e al cinema la visione è una.
    imposta(dove === 'cinema' ? { dove, sessioni: 1 } : { dove, sessioni: 2, effetti_json: voci.map((v) => ({ ...v, ripetuto: undefined })) });
  };
  return (
    <div className="flex flex-col gap-3">
      <Griglia>
        <Campo nome="nome" etichetta="Titolo del film" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
        <Blocco largo>
          <SelettoreIcone compatto etichetta="Dove si vede" valore={testoDi(dati.dove)} opzioni={OPZIONI_DOVE} disabilitato={disabilitato} onCambia={cambiaDove} />
        </Blocco>
        <Campo nome="prezzo" etichetta="Prezzo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} />
        {cinema
          ? <p className="editor-mappa__campo m-0 justify-center text-[12px] text-text-muted">Al cinema un film si completa in una visione.</p>
          : <Campo nome="sessioni" etichetta="Visioni per completarlo" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Un DVD di solito 2" />}
        <Campo nome="dettagli" etichetta="Dettagli" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
      </Griglia>
      <EditorEffetti voci={dati.effetti_json as VoceEffetto[]} onCambia={(v) => imposta({ effetti_json: v })} conRipetuto={cinema} disabilitato={disabilitato} {...nomi}
        aiuto={cinema ? 'La Dote della prima visione; con «vale anche alle volte successive» quanto rende rivederlo.' : undefined} />
    </div>
  );
}
