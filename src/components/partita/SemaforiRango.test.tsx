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
