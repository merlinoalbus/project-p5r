// @vitest-environment jsdom
// ============================================================
// Test useMappaPartita — dopo ogni azione la mappa si rilegge in silenzio; una rilettura che arriva dopo un caricamento
// completo (altra mappa, altra versione, «ricarica») non lo sovrascrive; gli avvisi dicono la parola dello stato
// ============================================================

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { useMappaPartita } from './useMappaPartita';
import type { MappaDto, SpilloDto } from '../types';

const { getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto, notifica } = vi.hoisted(() => ({ getMappa: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(), notifica: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, { getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto }));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));

const leva: SpilloDto = { id: 8, mappaChiave: 'a', tipo: 'meccanismo', tipoNome: 'Meccanismo', colore: '#64748b', nome: 'Leva', descrizione: '', x: 20, y: 20, riferimento: null, collezionabile: false, ordine: 0, origine: 'utente', raccolto: false, dettaglio: null, voce: null, condizioni: [], immagini: [], updatedAt: '' };
/** Costruisce una `MappaDto` di tipo area con la chiave (usata anche come nome) e gli spilli dati; il resto è neutro. */
const mappa = (chiave: string, spilli: SpilloDto[]): MappaDto => ({ chiave, nome: chiave, tipo: 'area', genitore: null, nomeRivisto: false, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'utente', numeroSpilli: spilli.length, numeroFigli: 0, updatedAt: '', larghezza: 100, altezza: 100, note: '', genitoreNome: null, percorso: [], figli: [], arrivi: [], spilli });

/** Componente di prova: usa `useMappaPartita` sulla mappa `chiave` (partita 7), mostra chiave e spilli con lo stato
 *  «segnato» e offre i pulsanti per le azioni sul primo spillo (raccolto sì/no, stato del punto, acquisto) e per ricaricare. */
function Prova({ chiave, versione = 0 }: { chiave: string; versione?: number }) {
  const m = useMappaPartita(chiave, 7, { versione });
  const primo = m.mappa?.spilli[0];
  return (
    <>
      <p data-testid="mappa">{m.mappa ? `${m.mappa.chiave}: ${m.mappa.spilli.map((s) => `${s.nome}${s.raccolto ? ' (segnato)' : ''}`).join(', ')}` : 'caricamento'}</p>
      {primo && <button type="button" onClick={() => void m.raccolto(primo, true)}>Segna</button>}
      {primo && <button type="button" onClick={() => void m.raccolto(primo, false)}>Togli</button>}
      {primo && <button type="button" onClick={() => void m.statoPunto(primo, 'ottenuto')}>Voce</button>}
      {primo && <button type="button" onClick={() => void m.acquisto(primo, 'pozione', true)}>Compra</button>}
      <button type="button" onClick={() => void m.ricarica()}>Ricarica</button>
    </>
  );
}
/** Come sopra, con la versione che la pagina ospite alza (la colonna del Palazzo dopo un raccolto). */
function ConVersione() {
  const [versione, setVersione] = useState(0);
  return <><Prova chiave="a" versione={versione} /><button type="button" onClick={() => setVersione((v) => v + 1)}>Versione</button></>;
}

beforeEach(() => { vi.resetAllMocks(); });

/** La prossima lettura della mappa resta in sospeso finché il test non la risolve. */
function letturaInSospeso() {
  /** Risolutore della lettura sospesa: vuoto finché `getMappa` non viene chiamata, poi quello della sua promessa. */
  let risolvi: (m: MappaDto) => void = () => {};
  getMappa.mockImplementationOnce(() => new Promise<MappaDto>((r) => { risolvi = r; }));
  return (m: MappaDto) => act(async () => { risolvi(m); });
}

it('una rilettura partita sulla mappa A che risponde dopo il passaggio alla mappa B non sostituisce B', async () => {
  getMappa.mockImplementation((chiave: string) => Promise.resolve(chiave === 'a' ? mappa('a', [leva]) : mappa('b', [{ ...leva, id: 9, mappaChiave: 'b', nome: 'Quadro' }])));
  impostaSpilloRaccolto.mockResolvedValue({ ...leva, raccolto: true });
  const { rerender } = render(<Prova chiave="a" />);
  expect(await screen.findByText('a: Leva')).toBeInTheDocument();
  const risolviRilettura = letturaInSospeso();
  fireEvent.click(screen.getByRole('button', { name: 'Segna' }));
  await waitFor(() => expect(screen.getByTestId('mappa')).toHaveTextContent('a: Leva (segnato)'));
  await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(2));
  rerender(<Prova chiave="b" />);
  expect(await screen.findByText('b: Quadro')).toBeInTheDocument();
  await risolviRilettura(mappa('a', [{ ...leva, raccolto: true }]));
  expect(screen.getByTestId('mappa')).toHaveTextContent('b: Quadro');
});

it('una rilettura in sospeso che arriva dopo un caricamento completo per una versione nuova (stessa mappa) non lo sovrascrive', async () => {
  getMappa.mockResolvedValueOnce(mappa('a', [leva]));
  impostaSpilloRaccolto.mockResolvedValue({ ...leva, raccolto: true });
  render(<ConVersione />);
  expect(await screen.findByText('a: Leva')).toBeInTheDocument();
  const risolviRilettura = letturaInSospeso();
  fireEvent.click(screen.getByRole('button', { name: 'Segna' }));
  await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(2));
  // la pagina ospite alza la versione (un forziere spuntato nella colonna): caricamento completo, con lo stato più nuovo
  getMappa.mockResolvedValueOnce(mappa('a', [{ ...leva, raccolto: true }, { ...leva, id: 11, nome: 'Forziere', tipo: 'forziere', collezionabile: true, raccolto: true }]));
  fireEvent.click(screen.getByRole('button', { name: 'Versione' }));
  expect(await screen.findByText('a: Leva (segnato), Forziere (segnato)')).toBeInTheDocument();
  // poi risponde la rilettura vecchia, che il forziere non lo sapeva: non vale più
  await risolviRilettura(mappa('a', [{ ...leva, raccolto: true }, { ...leva, id: 11, nome: 'Forziere', tipo: 'forziere', collezionabile: true, raccolto: false }]));
  expect(screen.getByTestId('mappa')).toHaveTextContent('a: Leva (segnato), Forziere (segnato)');
});

it('anche «ricarica» rende vecchia una rilettura in sospeso', async () => {
  getMappa.mockResolvedValueOnce(mappa('a', [leva]));
  impostaSpilloRaccolto.mockResolvedValue({ ...leva, raccolto: true });
  render(<Prova chiave="a" />);
  expect(await screen.findByText('a: Leva')).toBeInTheDocument();
  const risolviRilettura = letturaInSospeso();
  fireEvent.click(screen.getByRole('button', { name: 'Segna' }));
  await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(2));
  getMappa.mockResolvedValueOnce(mappa('a', [{ ...leva, nome: 'Leva del ponte', raccolto: true }]));
  fireEvent.click(screen.getByRole('button', { name: 'Ricarica' }));
  expect(await screen.findByText('a: Leva del ponte (segnato)')).toBeInTheDocument();
  await risolviRilettura(mappa('a', [{ ...leva, raccolto: true }]));
  expect(screen.getByTestId('mappa')).toHaveTextContent('a: Leva del ponte (segnato)');
});

it('dopo lo stato della voce della guida e dopo un acquisto la mappa si rilegge (lo stato può essere la condizione di un altro pin)', async () => {
  const conVoce: SpilloDto = { ...leva, voce: { chiave: 'k-01/1', tipo: 'meccanismo', nome: 'Leva', descrizione: '', esauribile: false, dungeon: 'k', area: 'k-01', stato: null }, dettaglio: { tipo: 'negozio', negozio: { chiave: 'n', nome: 'N', articoli: [{ chiave: 'pozione', nome: 'Pozione', comprato: false }] } } as unknown as SpilloDto['dettaglio'] };
  getMappa.mockResolvedValue(mappa('a', [conVoce]));
  impostaStatoPunto.mockResolvedValue({ chiave: 'k-01/1', stato: 'ottenuto' });
  impostaAcquisto.mockResolvedValue({ chiave: 'pozione', nome: 'Pozione', acquistato: true });
  render(<Prova chiave="a" />);
  expect(await screen.findByText('a: Leva')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voce' }));
  await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: 'Compra' }));
  await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(3));
});

it('gli avvisi dicono la parola dello stato, e per toglierlo quella scelta per il tipo: la porta torna «chiusa», la leva «non più azionato»', async () => {
  const porta: SpilloDto = { ...leva, id: 12, tipo: 'porta', tipoNome: 'Porta chiusa', nome: 'Porta della torre' };
  getMappa.mockResolvedValue(mappa('a', [porta]));
  impostaSpilloRaccolto.mockImplementation(async (_p: number, _id: number, valore: boolean) => ({ ...porta, raccolto: valore }));
  const { unmount } = render(<Prova chiave="a" />);
  expect(await screen.findByText('a: Porta della torre')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Segna' }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', '«Porta della torre»: aperta.'));
  fireEvent.click(screen.getByRole('button', { name: 'Togli' }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', '«Porta della torre»: chiusa.'));
  unmount();
  getMappa.mockResolvedValue(mappa('a', [leva]));
  impostaSpilloRaccolto.mockImplementation(async (_p: number, _id: number, valore: boolean) => ({ ...leva, raccolto: valore }));
  render(<Prova chiave="a" />);
  expect(await screen.findByText('a: Leva')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Togli' }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', '«Leva»: non più azionato.'));
});
