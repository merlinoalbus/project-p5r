// @vitest-environment jsdom
// ============================================================
// Test QuartierePage — dopo lo scarico automatico della pianta l'intestazione mostra la stessa immagine del visore (L1, G6)
// ============================================================
//
// Rilievo G6 del validatore (2° giro di L1): quando il quartiere non ha ancora un'immagine e c'è la pianta pubblicata, la pagina la
// scarica al primo accesso. Il visore si aggiornava (cambia la sua `versione`), il quartiere no: l'intestazione restava sulla
// `illustrazione` di prima e, fino a una ricarica, intestazione e visore dello stesso quartiere mostravano due immagini diverse.
// ============================================================

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QuartierePage } from './QuartierePage';
import type { QuartiereDettaglioDto } from '../types';

const api = vi.hoisted(() => ({ getQuartiere: vi.fn(), scaricaPiantaQuartiere: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, api));
// il visore vero è provato a parte: qui basta sapere quale versione dell'immagine gli arriva
vi.mock('../components/mappe/MappaIncorporata', () => ({ MappaIncorporata: ({ chiave, versione }: { chiave: string; versione?: number }) => <div>Visore {chiave} · versione {versione ?? 0}</div> }));

/** Shibuya senza immagine caricata, con la pianta pubblicata da scaricare; `illustrazione` come dice il server. */
const shibuya = (illustrazione: QuartiereDettaglioDto['illustrazione'], mappa: boolean): QuartiereDettaglioDto => ({
  chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, fonte: '', descrizione: '', mappa, illustrazione, aree: [],
  pianta: { url: 'https://esempio.test/shibuya.png', fonte: 'Guida', pagina: null }, piantaAssente: null, luoghi: [], ingresso: null,
} as unknown as QuartiereDettaglioDto);

// Superato dal lotto L11 (R11-02/8, migrazione 210): lo scarico automatico della pianta all'apertura del quartiere non esiste più (i due test
// restano, da riscrivere).
it.skip('scaricata la pianta, il quartiere si rilegge: l’intestazione mostra l’immagine appena scaricata, come il visore', async () => {
  const caricata = { immagineUrl: '/api/immagini/mappa/citta-shibuya/file?v=2026-10-20T10%3A00%3A00.000Z', asset: 'mappe/citta-shibuya' };
  api.getQuartiere.mockResolvedValueOnce(shibuya({ immagineUrl: null, asset: null }, false)).mockResolvedValue(shibuya(caricata, true));
  api.scaricaPiantaQuartiere.mockResolvedValue({ quartiere: 'shibuya', mime: 'image/png', byte: 2407015, fonte: 'Guida', url: 'https://esempio.test/shibuya.png' });
  render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Shibuya' })).toBeInTheDocument();
  await waitFor(() => expect(api.scaricaPiantaQuartiere).toHaveBeenCalledWith('shibuya'));
  // dopo lo scarico il quartiere si rilegge una volta, e l'intestazione prende l'immagine nuova
  await waitFor(() => expect(api.getQuartiere).toHaveBeenCalledTimes(2));
  const intestazione = (await screen.findByAltText('Illustrazione di Shibuya')).closest('header')!;
  expect(intestazione.querySelector('img[alt="Illustrazione di Shibuya"]')).toHaveAttribute('src', `${caricata.immagineUrl}&l=320`);
  // e non si scarica una seconda volta: il quartiere ora ha la sua immagine
  expect(api.scaricaPiantaQuartiere).toHaveBeenCalledTimes(1);
});

it.skip('uno scarico non riuscito o rifiutato per i pezzi non rilegge il quartiere', async () => {
  api.getQuartiere.mockReset().mockResolvedValue(shibuya({ immagineUrl: null, asset: null }, false));
  api.scaricaPiantaQuartiere.mockReset().mockRejectedValue(new Error('rete assente'));
  render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Shibuya' })).toBeInTheDocument();
  await waitFor(() => expect(api.scaricaPiantaQuartiere).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('button', { name: /Riprova/ })).toBeInTheDocument();
  expect(api.getQuartiere).toHaveBeenCalledTimes(1);
});
