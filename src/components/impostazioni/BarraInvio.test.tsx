// @vitest-environment jsdom
// ============================================================
// Test BarraInvio — dice che il server sta lavorando, senza promettere un avanzamento che non c'è
// ============================================================

import { render, screen } from '@testing-library/react';
import { BarraInvio } from './BarraInvio';

it('senza lavoro in corso non occupa spazio', () => {
  const { container } = render(<BarraInvio avanzamento={null} etichetta="Invio del pacchetto" elaborazione="Il server elabora" />);
  expect(container).toBeEmptyDOMElement();
});

it('mentre lavora il server lo dice e segnala l’attesa alle tecnologie assistive', () => {
  render(<BarraInvio avanzamento={{ byteInviati: 0, byteTotali: 0, percentuale: 100, inviato: true }} etichetta="Lavoro sul server" elaborazione="Il server sta leggendo il file dalla cartella d’appoggio" />);
  const stato = screen.getByRole('status');
  expect(stato).toHaveTextContent('Il server sta leggendo il file dalla cartella d’appoggio…');
  expect(stato).toHaveAttribute('aria-busy', 'true');
  // la barra scorre: non c'è una percentuale da dichiarare, quindi nessun valore
  const barra = screen.getByRole('progressbar', { name: 'Il server sta leggendo il file dalla cartella d’appoggio' });
  expect(barra).not.toHaveAttribute('value');
  expect(barra).toHaveClass('barra-invio');
});

it('quando una percentuale c’è, la dice', () => {
  render(<BarraInvio avanzamento={{ byteInviati: 50, byteTotali: 100, percentuale: 50, inviato: false }} etichetta="Invio del pacchetto" elaborazione="Il server elabora" />);
  expect(screen.getByRole('status')).toHaveTextContent('Invio del pacchetto… 50%');
  expect(screen.getByRole('progressbar', { name: 'Invio del pacchetto' })).toBeInTheDocument();
});
