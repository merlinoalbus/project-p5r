// @vitest-environment jsdom
// ============================================================
// Test MeteoGiornata — quattro icone per fascia, un tocco salva; «dalla guida» distinto da «segnato»
// ============================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeteoGiornata } from './MeteoGiornata';
import { descriviMeteoFascia } from '../../utils/meteoFascia';
import type { MeteoFasciaDto } from '../../types';

const pioggiaDallaGuida: MeteoFasciaDto = { meteo: 'pioggia', origine: 'guida', guida: 'pioggia', allerte: [] };

it('quattro icone; quella della guida si vede più tenue e non è «premuta»; un tocco segna un meteo', async () => {
  const onCambia = vi.fn();
  render(<MeteoGiornata fascia="sera" meteo={pioggiaDallaGuida} onCambia={onCambia} />);
  const gruppo = screen.getByRole('group', { name: 'Di sera: pioggia, dalla guida' });
  expect(gruppo.querySelectorAll('button')).toHaveLength(4);
  const pioggia = screen.getByRole('button', { name: 'Di sera: Pioggia (dalla guida: tocca per confermarlo)' });
  expect(pioggia).toHaveAttribute('aria-pressed', 'false');
  expect(pioggia.className).toContain('chip--dalla-guida');
  await userEvent.click(screen.getByRole('button', { name: 'Di sera: Sereno' }));
  expect(onCambia).toHaveBeenLastCalledWith('sera', 'sereno');
  // toccare quello della guida lo conferma come tuo
  await userEvent.click(pioggia);
  expect(onCambia).toHaveBeenLastCalledWith('sera', 'pioggia');
  expect(onCambia).toHaveBeenCalledTimes(2);
});

it('segnato: l’icona è premuta, e ritoccarla torna a quello della guida', async () => {
  const onCambia = vi.fn();
  render(<MeteoGiornata fascia="giorno" meteo={{ meteo: 'sereno', origine: 'partita', guida: 'pioggia', allerte: [] }} onCambia={onCambia} />);
  const sereno = screen.getByRole('button', { name: 'Di giorno: Sereno (segnato: tocca per tornare alla guida)' });
  expect(sereno).toHaveAttribute('aria-pressed', 'true');
  expect(sereno.className).toContain('chip--attivo');
  expect(sereno).toHaveAttribute('title', 'Sereno: segnato da te (la guida dice pioggia) — tocca per tornare alla guida');
  await userEvent.click(sereno);
  expect(onCambia).toHaveBeenCalledWith('giorno', null);
});

it('un giorno che la guida non dice: nessuna icona scelta; le allerte stanno nel nome del gruppo', () => {
  render(<MeteoGiornata fascia="giorno" meteo={{ meteo: null, origine: null, guida: null, allerte: [] }} onCambia={vi.fn()} />);
  for (const b of screen.getByRole('group', { name: 'Di giorno: meteo non segnato' }).querySelectorAll('button')) expect(b).toHaveAttribute('aria-pressed', 'false');
  expect(descriviMeteoFascia('sera', { ...pioggiaDallaGuida, allerte: [{ chiave: 'pioggia-torrenziale', nome: 'Pioggia torrenziale', effetti: [] }, { chiave: 'notte-torrida', nome: 'Notte torrida', effetti: [] }] }))
    .toBe('Di sera: pioggia, dalla guida; allerta: pioggia torrenziale, notte torrida');
});
