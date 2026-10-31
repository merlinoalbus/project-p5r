// @vitest-environment jsdom
// ============================================================
// Test ModuloLuogo — i campi comuni del luogo (`CampiLuogo`, gli stessi dei tre punti d'ingresso) e le colonne che scrivono (L13, O7-5)
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { ModuloLuogo } from './ModuloLuogo';
import { CampiLuogo, type ValoriLuogo } from './CampiLuogo';
import { ORARI_SEMPRE } from '../../../../shared/orariNegozio';

vi.mock('../../../services/api', (vero) => moduloApi(vero, {
  getQuartieri: vi.fn(async () => [{ chiave: 'shibuya', nome: 'Shibuya' }]),
  getQuartiere: vi.fn(async () => ({ chiave: 'shibuya', nome: 'Shibuya', aree: [{ chiave: 'piazza', nome: 'Piazza della stazione' }] })),
  getConfidenti: vi.fn(async () => [{ chiave: 'iwai', nome: 'Munehisa Iwai', arcana: 'hanged', arcanaNome: 'Appeso', ordine: 1 }]),
}));

it('il modulo del luogo scrive le sue colonne dai campi comuni: nome, cosa_offre e orari_json (null = regola dell’app)', async () => {
  const imposta = vi.fn();
  render(<ModuloLuogo dati={{ nome: 'Untouchable', tipo: 'negozio', quartiere_chiave: 'shibuya', cosa_offre: '', note: '', orari_json: null, confidenti_json: [], piatti_json: null }} imposta={imposta} elemento={null} nuovo={false} disabilitato={false} />);
  await screen.findByText('Shibuya');
  fireEvent.change(screen.getByLabelText(/Nome del luogo/), { target: { value: 'Untouchable 2' } });
  expect(imposta).toHaveBeenCalledWith({ nome: 'Untouchable 2' });
  fireEvent.change(screen.getByLabelText('Che cosa offre'), { target: { value: 'Armi finte' } });
  expect(imposta).toHaveBeenCalledWith({ cosa_offre: 'Armi finte' });
  const regola = screen.getByRole('checkbox', { name: /La guida non indica orari/ });
  expect(regola).toBeChecked();
  fireEvent.click(regola);
  expect(imposta).toHaveBeenCalledWith({ orari_json: ORARI_SEMPRE });
  // le sezioni della finestra di modifica, niente campi a mano per i Confidenti
  for (const s of ['Luogo', 'Dove', 'Confidenti che si incontrano qui', 'Piatti']) expect(screen.getByRole('group', { name: s })).toBeInTheDocument();
});

it('i piatti sono righe con «Aggiungi un piatto» e «Togli», con le etichette del campo comune', async () => {
  const imposta = vi.fn();
  render(<ModuloLuogo dati={{ nome: 'Leblanc', tipo: 'ristorante', quartiere_chiave: 'shibuya', piatti_json: [{ nome: 'Curry', prezzo: 800, effetto: 'PS' }], confidenti_json: [] }} imposta={imposta} elemento={null} nuovo={false} disabilitato={false} />);
  await screen.findByText('Shibuya');
  const riga = within(screen.getByRole('group', { name: 'Piatto 1' }));
  fireEvent.change(riga.getByLabelText('Prezzo in yen'), { target: { value: '900' } });
  expect(imposta).toHaveBeenCalledWith({ piatti_json: [{ nome: 'Curry', prezzo: 900, effetto: 'PS' }] });
  fireEvent.click(riga.getByRole('button', { name: 'Togli il piatto Curry' }));
  expect(imposta).toHaveBeenCalledWith({ piatti_json: null });
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi un piatto/ }));
  expect(imposta).toHaveBeenCalledWith({ piatti_json: [{ nome: 'Curry', prezzo: 800, effetto: 'PS' }, { nome: '', prezzo: null, effetto: '' }] });
});

/** I campi comuni col loro stato, come li usano «Aggiungi luogo» e «Crea un luogo da questo pin». */
function ConStato({ iniziale }: { iniziale: ValoriLuogo }) {
  const [v, setV] = useState(iniziale);
  return <><CampiLuogo valore={v} onCambia={(p) => setV((x) => ({ ...x, ...p }))} /><output data-testid="stato">{JSON.stringify(v)}</output></>;
}

it('CampiLuogo: il tipo si sceglie a tessere e gli orari della guida si aprono togliendo la regola dell’app', () => {
  render(<ConStato iniziale={{ nome: '', tipo: null, cosaOffre: '', orari: null }} />);
  fireEvent.change(screen.getByLabelText(/Nome del luogo/), { target: { value: 'Chiosco' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /La guida non indica orari/ }));
  const stato = JSON.parse(screen.getByTestId('stato').textContent!) as ValoriLuogo;
  expect(stato).toMatchObject({ nome: 'Chiosco', tipo: null, orari: ORARI_SEMPRE });
  expect(screen.getByRole('radiogroup', { name: 'Tipo' })).toBeInTheDocument();
});
