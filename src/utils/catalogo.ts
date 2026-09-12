// ============================================================
// catalogo — come si chiama ogni tipo del catalogo, nei titoli, nei messaggi e negli elenchi
// ============================================================

import type { TipoCatalogo } from '../types';

export const NOME_TIPO_CATALOGO: Record<TipoCatalogo, { singolare: string; plurale: string; nuovo: string }> = {
  negozio: { singolare: 'Negozio', plurale: 'Negozi', nuovo: 'Nuovo negozio' },
  articolo: { singolare: 'Articolo', plurale: 'Articoli dei negozi', nuovo: 'Nuovo articolo' },
  libro: { singolare: 'Libro', plurale: 'Libri', nuovo: 'Nuovo libro' },
  film: { singolare: 'Film', plurale: 'Film e DVD', nuovo: 'Nuovo film o DVD' },
  attivita: { singolare: 'Attività', plurale: 'Attività, lavori e videogiochi', nuovo: 'Nuova attività' },
  luogo: { singolare: 'Luogo', plurale: 'Luoghi della città', nuovo: 'Nuovo luogo' },
  domanda: { singolare: 'Domanda', plurale: 'Domande in classe, agli esami e in TV', nuovo: 'Nuova domanda' },
  cruciverba: { singolare: 'Riga del cruciverba', plurale: 'Cruciverba', nuovo: 'Nuova riga del cruciverba' },
};

/** Il tipo del modulo: i tipi del catalogo più «videogioco», che è un'attività con il tipo fissato. */
export type TipoModulo = TipoCatalogo | 'videogioco';

/** Il tipo del catalogo dietro un tipo del modulo. */
export function tipoCatalogoDi(tipo: TipoModulo): TipoCatalogo {
  return tipo === 'videogioco' ? 'attivita' : tipo;
}
