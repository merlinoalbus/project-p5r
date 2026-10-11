// @vitest-environment jsdom
// ============================================================
// Test SemaforiRango — requisiti con semaforo, conferma a mano, avvertenze che non bloccano
// ============================================================

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SemaforiRango } from './SemaforiRango';
import type { SemaforiRangoDto } from '../../types';

const futaba4: SemaforiRangoDto = {
  rango: 4,
  pronto: true,
  requisiti: [
    { indice: 0, tipo: 'avviso', testo: 'L’evento richiede che la scuola sia aperta.', stato: 'grigio', dettaglio: 'Da controllare nel gioco: non blocca il rango', manuale: false, confermato: false, bloccante: false },
    { indice: 1, tipo: 'dote', testo: 'Conoscenza rango 3', stato: 'verde', dettaglio: 'Conoscenza: rango 3 di 3', manuale: false, confermato: false },
  ],
};

it('un’avvertenza ha la sua icona, non conta nei requisiti e non offre la conferma', () => {
  const onConferma = vi.fn();
  render(<SemaforiRango semafori={futaba4} onConferma={onConferma} />);
  const gruppo = screen.getByRole('group', { name: 'Requisiti per il rango 4' });
  expect(within(gruppo).getByText(/requisiti soddisfatti/)).toBeInTheDocument();
  expect(within(gruppo).getByRole('img', { name: 'Avvertenza: da controllare nel gioco, non blocca' })).toBeInTheDocument();
  expect(within(gruppo).getByRole('img', { name: 'Semaforo soddisfatto' })).toBeInTheDocument();
  expect(within(gruppo).queryByRole('button')).toBeNull();
});

it('il conto «n di m» è sui soli requisiti che bloccano', () => {
  render(<SemaforiRango semafori={{ ...futaba4, pronto: false, requisiti: [futaba4.requisiti[0], { ...futaba4.requisiti[1], stato: 'rosso' }] }} />);
  expect(screen.getByText(/0 di 1 requisiti/)).toBeInTheDocument();
});

it('un requisito da segnare offre «Condizione soddisfatta» e la manda con il rango', async () => {
  const onConferma = vi.fn();
  const caffe = { indice: 0, tipo: 'evento', testo: 'Aver preparato il caffè al Leblanc', stato: 'grigio' as const, dettaglio: 'Caffè preparato al Leblanc: da segnare, qui o in Partita → Progressi', manuale: true, confermato: false };
  render(<SemaforiRango semafori={{ rango: 3, pronto: false, requisiti: [caffe] }} onConferma={onConferma} />);
  await userEvent.click(screen.getByRole('button', { name: /Condizione soddisfatta/ }));
  expect(onConferma).toHaveBeenCalledWith(3, caffe, true);
});

it('un requisito su una Richiesta che non c’è più è «da correggere», non «da confermare», e non offre la conferma (2026-10-11)', () => {
  const rotto = { indice: 0, tipo: 'richiesta', testo: 'Completare la richiesta «Un fidanzato violento»', stato: 'grigio' as const, dettaglio: 'La Richiesta «Un fidanzato violento» non c’è più: correggi quel che la cita', manuale: false, confermato: false };
  render(<SemaforiRango semafori={{ rango: 1, pronto: false, requisiti: [rotto] }} onConferma={vi.fn()} />);
  expect(screen.getByRole('img', { name: 'Semaforo da correggere' })).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Semaforo da confermare' })).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

it('su un requisito da correggere offre «Correggi» (che manda rango e requisito); sugli altri no', async () => {
  const onCorreggi = vi.fn();
  const rotto = { indice: 0, tipo: 'richiesta', testo: 'Completare la richiesta «X»', stato: 'grigio' as const, dettaglio: 'La Richiesta «X» non c’è più: correggi quel che la cita', manuale: false, confermato: false };
  const aperta = { indice: 1, tipo: 'richiesta', testo: 'Completare la richiesta «Y»', stato: 'rosso' as const, dettaglio: 'Richiesta «Y» non risulta completata', manuale: false, confermato: false };
  render(<SemaforiRango semafori={{ rango: 2, pronto: false, requisiti: [rotto, aperta] }} onCorreggi={onCorreggi} />);
  const bottoni = screen.getAllByRole('button', { name: /Correggi/ });
  expect(bottoni).toHaveLength(1);
  await userEvent.click(bottoni[0]);
  expect(onCorreggi).toHaveBeenCalledWith(2, rotto);
});
