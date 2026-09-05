// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NegoziPage } from './NegoziPage';
vi.mock('../services/api', () => ({
  getNegozi: vi.fn().mockResolvedValue([{ chiave:'u-vuoto', nome:'Bottega nuova', luogoChiave:'shibuya', quartiereNome:'Shibuya', tipo:'altro', luogo:'Stazione', articoli:0, verificati:0 }]),
  ricercaArticoli: vi.fn().mockResolvedValue({ totale:0, articoli:[] }),
}));
vi.mock('../stores/suggerimentiStore', () => ({ useSuggerimenti: () => ({ evidenziato: () => false, motivo: () => null }) }));
it('trova un negozio senza articoli cercando il nome o il quartiere', async () => {
  render(<MemoryRouter><NegoziPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Shibuya' });
  fireEvent.change(screen.getByRole('searchbox'), {target:{value:'Bottega'}});
  expect(await screen.findByRole('region', {name:'Negozi trovati'})).toHaveTextContent('Bottega nuova');
  expect(await screen.findByText('0 articoli trovati.')).toBeInTheDocument();
});
