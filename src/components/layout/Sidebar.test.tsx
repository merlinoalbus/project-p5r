// @vitest-environment jsdom
// ============================================================
// Test Sidebar — il menu si riduce alle icone e si riapre col pulsante; la scelta resta; le voci tengono il loro nome
// ============================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

beforeEach(() => {
  localStorage.clear();
  usePreferenzeStore.setState({ menuRidotto: false });
});

/** Disegna la barra laterale dentro un router posizionato su /home. */
const disegna = () => render(<MemoryRouter initialEntries={['/home']}><Sidebar /></MemoryRouter>);

it('il pulsante riduce il menu alle icone e lo riapre; la scelta resta nelle preferenze del dispositivo', async () => {
  disegna();
  const menu = screen.getByRole('navigation', { name: 'Menu principale' });
  expect(menu.className).not.toContain('barra-laterale--ridotta');
  const riduci = screen.getByRole('button', { name: 'Riduci il menu alle icone' });
  expect(riduci).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(riduci);
  expect(menu.className).toContain('barra-laterale--ridotta');
  expect(usePreferenzeStore.getState().menuRidotto).toBe(true);
  expect(JSON.parse(localStorage.getItem('p5r-preferenze')!).menuRidotto).toBe(true);
  const apri = screen.getByRole('button', { name: 'Apri il menu' });
  expect(apri).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(apri);
  expect(menu.className).not.toContain('barra-laterale--ridotta');
  expect(usePreferenzeStore.getState().menuRidotto).toBe(false);
});

it('ridotto, ogni voce resta raggiungibile col suo nome e lo mostra al passaggio', () => {
  usePreferenzeStore.setState({ menuRidotto: true });
  disegna();
  const home = screen.getByRole('link', { name: 'Home' });
  expect(home).toHaveAttribute('href', '/home');
  expect(home).toHaveAttribute('title', 'Home');
});
