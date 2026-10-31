// ============================================================
// ricompensaDomanda — che cosa dà una domanda, dagli effetti delle voci del Diario (L13, ondata 7, O7-2; decisione 9)
// ============================================================
//
// Le parole della ricompensa (`RicompensaDomanda`) e la nota di Conoscenza della spunta dalla pagina (`DomandePage`): un punto solo.
// ============================================================

import type { DomandaDto } from '../types';
import { simboliNote } from '../../shared/note';

const eEsame = (t: DomandaDto['tipo']): boolean => t === 'esame-medio' || t === 'esame-finale';

/** Le parti della ricompensa dalle voci, in parole: «Fascino ♪», «Ann Takamaki ♪♪» (note di rango di un Confidente, L13 ondata 8),
 *  «conta per il piazzamento», «premio dell’esame alla spunta». I simboli li legge `TestoNote` a parole per i lettori di schermo. */
export function partiRicompensaDallaVoce(d: Pick<DomandaDto, 'tipo' | 'premioVoce'>): string[] {
  const p = d.premioVoce;
  if (!p) return [];
  return [
    ...p.doti.map((x) => `${x.nome} ${simboliNote(x.note)}`),
    ...p.confidenti.map((x) => `${x.nome} ${simboliNote(x.note)}`),
    ...(eEsame(d.tipo) && !p.doti.length ? ['conta per il piazzamento'] : []),
    ...(p.esameAllaSpunta ? ['premio dell’esame alla spunta'] : []),
  ];
}

/** La domanda dà una nota di Conoscenza? Dalle voci, se ce ne sono; altrimenti dal testo della guida («Conoscenza +1 nota», «Conoscenza ♪»). */
export function daConoscenza(d: Pick<DomandaDto, 'ricompensa' | 'premioVoce'>): boolean {
  return d.premioVoce ? d.premioVoce.doti.some((x) => x.dote === 'conoscenza') : /Conoscenza (\+|♪)/.test(d.ricompensa);
}
