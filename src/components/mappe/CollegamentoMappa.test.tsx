/** @vitest-environment jsdom */
/* Il comando «Dove si trova» deve portare alla mappa, non alla scheda.
 *
 * Sembra ovvio, e invece per un po' non e' stato vero: il componente usava l'indirizzo della
 * scheda, cosi' dalla pagina Oggetti si finiva sull'elenco dei negozi. Il difetto non si vedeva
 * guardando la pagina — il collegamento c'era, il testo era giusto, il click portava da qualche
 * parte — e nessun test toccava la destinazione. Questi la controllano.
 *
 * Il caso della barra non e' un dettaglio: la chiave di un articolo e' `negozio/articolo`, e senza
 * codifica diventerebbe due segmenti di percorso, con la rotta del risolutore che non trova nulla.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { CollegamentoMappa } from './CollegamentoMappa';
import { percorsoAccessoMondo, schedaAccessoMondo } from '../../utils/accessoMondo';

function Risolutore() {
  const { tipo, chiave } = useParams();
  return <div data-testid="risolutore">{tipo}|{chiave}</div>;
}

function monta(tipo: 'articolo' | 'negozio', chiave: string) {
  return render(<MemoryRouter initialEntries={['/guida/oggetti']}>
    <Routes>
      <Route path="/guida/oggetti" element={<CollegamentoMappa tipo={tipo} chiave={chiave} testo="Sulla mappa" compatto />} />
      <Route path="/guida/mondo/:tipo/:chiave" element={<Risolutore />} />
    </Routes>
  </MemoryRouter>);
}

it('manda al risolutore del mondo, non alla scheda dell’entità', () => {
  monta('negozio', 'untouchable');
  const link = screen.getByRole('link', { name: /Sulla mappa/ });
  expect(link).toHaveAttribute('href', '/guida/mondo/negozio/untouchable');
  expect(link.getAttribute('href')).not.toBe(schedaAccessoMondo('negozio', 'untouchable'));
});

it('codifica la barra nella chiave di un articolo e la rotta la ritrova intera', async () => {
  const chiave = 'untouchable/kogatana-nera';
  monta('articolo', chiave);
  const link = screen.getByRole('link', { name: /Sulla mappa/ });
  expect(link).toHaveAttribute('href', '/guida/mondo/articolo/untouchable%2Fkogatana-nera');
  link.click();
  expect(await screen.findByTestId('risolutore')).toHaveTextContent(`articolo|${chiave}`);
});

it('l’indirizzo del risolutore e quello della scheda restano due cose diverse', () => {
  // se un giorno tornassero a coincidere, il comando «Dove si trova» smetterebbe di portare alla
  // mappa senza che niente sembri rotto: e' esattamente com'e' successo
  for (const tipo of ['articolo', 'negozio', 'confidente', 'dungeon', 'luogo'] as const) {
    expect(percorsoAccessoMondo(tipo, 'x')).toBe(`/guida/mondo/${tipo}/x`);
    expect(percorsoAccessoMondo(tipo, 'x')).not.toBe(schedaAccessoMondo(tipo, 'x'));
  }
});
