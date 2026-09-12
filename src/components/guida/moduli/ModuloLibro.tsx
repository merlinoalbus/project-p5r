// ============================================================
// ModuloLibro — titolo, prezzo, sessioni, dettagli, effetti dichiarati e condizioni
// ============================================================
//
// Un titolo solo (il nome italiano era uguale per tutti i 46 libri); «dove si compra» non si
// scrive più: sono gli articoli delle librerie collegati al libro (migrazione 073). Che cosa fa
// leggerlo — la Dote con le sue note, il quartiere che apre — è l'elenco degli effetti (074).
// ============================================================

import { EditorEffetti } from '../EditorEffetti';
import type { VoceEffetto } from '../../../../shared/effettiCatalogo';
import type { PropsModulo } from './base';
import { Campo, Griglia } from './campi';
import { useNomiPerEffetti } from './nomiPerEffetti';

export function ModuloLibro({ dati, imposta, disabilitato }: PropsModulo) {
  const nomi = useNomiPerEffetti();
  return (
    <div className="flex flex-col gap-3">
      <Griglia>
        <Campo nome="nome" etichetta="Titolo del libro" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
        <Campo nome="prezzo" etichetta="Prezzo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto o 0 se è gratis" />
        <Campo nome="sessioni" etichetta="Sessioni di lettura" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Quante volte va letto per finirlo" />
        <Campo nome="dettagli" etichetta="Dettagli" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
      </Griglia>
      <EditorEffetti voci={dati.effetti_json as VoceEffetto[]} onCambia={(v) => imposta({ effetti_json: v })} disabilitato={disabilitato} {...nomi} />
    </div>
  );
}
