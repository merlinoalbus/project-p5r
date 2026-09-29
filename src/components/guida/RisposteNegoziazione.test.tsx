/** @vitest-environment jsdom */
// ============================================================
// Le risposte della negoziazione: si cerca la domanda, e ogni risposta dice a chi va bene
// ============================================================
//
// Quel che conta qui è che **sotto pressione si trovi la riga giusta**: la domanda è l'unica cosa
// che si legge sullo schermo mentre l'Ombra parla, e il carattere decide quale risposta è buona.
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { RisposteNegoziazione } from './RisposteNegoziazione';
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

it('la ricerca riduce l’elenco a quel che l’Ombra ha davvero chiesto', () => {
  render(<RisposteNegoziazione domande={domande} />);
  expect(screen.getByText('Ehi, se hai delle medicine passamene un po’.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'maschera' } });
  expect(screen.queryByText('Ehi, se hai delle medicine passamene un po’.')).toBeNull();
  expect(screen.getByText('Dai, che ci fai con quella maschera?')).toBeInTheDocument();
});

it('ogni risposta dice a quale carattere va bene e a quale no', () => {
  render(<RisposteNegoziazione domande={domande} />);
  const riga = screen.getByText('Tanto non cambierebbe niente.').closest('li')!;
  expect(within(riga).getByTitle(/Irritabile: risposta buona/)).toBeInTheDocument();
  expect(within(riga).getByTitle(/Timida: risposta cattiva/)).toBeInTheDocument();
  // una risposta che nessuno ha verificato lo dice, invece di far credere che sia indifferente
  expect(within(screen.getByText('Tutto bene?').closest('li')!).getByText('nessun carattere verificato')).toBeInTheDocument();
});

it('scelto il carattere, la risposta buona per lui viene prima', () => {
  render(<RisposteNegoziazione domande={domande} />);
  fireEvent.click(screen.getByRole('button', { name: /Irritabile/ }));
  const prima = screen.getByText('Ehi, se hai delle medicine passamene un po’.').closest('li')!;
  const testi = within(prima).getAllByRole('listitem').map((li) => li.textContent ?? '');
  expect(testi[0]).toContain('Tanto non cambierebbe niente.');
});

it('senza risultati lo dice, e dice anche perché', () => {
  render(<RisposteNegoziazione domande={domande} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'katsudon' } });
  expect(screen.getByRole('status')).toHaveTextContent(/Nessuna domanda con queste parole/);
});
