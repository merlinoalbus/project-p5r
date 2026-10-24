/** @vitest-environment jsdom */
// ============================================================
// Le risposte della negoziazione: si cerca la domanda, e ogni risposta dice a chi va bene
// ============================================================
//
// Quel che conta qui è che **sotto pressione si trovi la riga giusta**: la domanda è l'unica cosa
// che si legge sullo schermo mentre l'Ombra parla, e il carattere decide quale risposta è buona.
// ============================================================

import { cercaDomande } from '../../utils/negoziazione';
import type { NegoziazioneDomandaDto } from '../../types';

const domande: NegoziazioneDomandaDto[] = [
  {
    domanda: 'Ehi, se hai delle medicine passamene un po’.',
    risposte: [
      { testo: 'Tutto bene?', verdetti: [] },
      { testo: 'Che genere di medicine?', verdetti: [{ esito: 'buona', tratto: 'cupa' }] },
      { testo: 'Tanto non cambierebbe niente.', verdetti: [{ esito: 'buona', tratto: 'irritabile' }, { esito: 'cattiva', tratto: 'timida' }] },
    ],
  },
  {
    domanda: 'Dai, che ci fai con quella maschera?',
    risposte: [
      { testo: 'Eh, sì.', verdetti: [{ esito: 'passabile', tratto: 'giocosa' }] },
      { testo: 'In realtà sono un ragazzino.', verdetti: [{ esito: 'buona', tratto: 'timida' }] },
    ],
  },
];

it('cerca nella domanda e nelle risposte, con tutte le parole scritte', () => {
  expect(cercaDomande(domande, 'maschera').map((d) => d.domanda)).toEqual(['Dai, che ci fai con quella maschera?']);
  expect(cercaDomande(domande, 'ragazzino')).toHaveLength(1);
  expect(cercaDomande(domande, 'medicine maschera')).toHaveLength(0);
  expect(cercaDomande(domande, '')).toHaveLength(2);
});

// SUPERATI da R11-03/2: il componente `RisposteNegoziazione` era orfano (nessun importatore di produzione) ed è stato eliminato.
// Corpi originali tolti per compilare; non eseguiti (zero test).
it.skip('SUPERATO da R11-03/2: la ricerca riduce l’elenco a quel che l’Ombra ha davvero chiesto', () => {});
it.skip('SUPERATO da R11-03/2: ogni risposta dice a quale carattere va bene e a quale no', () => {});
it.skip('SUPERATO da R11-03/2: scelto il carattere, la risposta buona per lui viene prima', () => {});
it.skip('SUPERATO da R11-03/2: senza risultati lo dice, e dice anche perché', () => {});
