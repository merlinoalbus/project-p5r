// @vitest-environment jsdom
// ============================================================
// Test BarraInvio — quanto è partito, e quando la palla passa al server
// ============================================================

import { render, screen } from '@testing-library/react';
import { BarraInvio } from './BarraInvio';

it('senza invio in corso non occupa spazio', () => {
  const { container } = render(<BarraInvio avanzamento={null} etichetta="Invio del pacchetto" elaborazione="Il server elabora" />);
  expect(container).toBeEmptyDOMElement();
});

it('durante l’invio mostra percentuale e MB, con la barra al punto giusto', () => {
  render(<BarraInvio avanzamento={{ byteInviati: 104_857_600, byteTotali: 326_778_880, percentuale: 32, inviato: false }} etichetta="Invio del pacchetto" elaborazione="Il server elabora" />);
  expect(screen.getByRole('status')).toHaveTextContent('Invio del pacchetto… 32% · 100 MB di 311,6 MB');
  const barra = screen.getByLabelText('Invio del pacchetto');
  expect(barra).toHaveValue(32);
});

it('a corpo inviato la barra diventa indeterminata e parla del server', () => {
  render(<BarraInvio avanzamento={{ byteInviati: 10, byteTotali: 10, percentuale: 100, inviato: true }} etichetta="Invio del pacchetto" elaborazione="Sostituzione dei dati di gioco in corso" />);
  expect(screen.getByRole('status')).toHaveTextContent('Sostituzione dei dati di gioco in corso…');
  const barra = screen.getByLabelText('Sostituzione dei dati di gioco in corso');
  expect(barra).not.toHaveAttribute('value');
});
