/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AccessoMondoPage } from './AccessoMondoPage';
import type { AccessoMondoDto, DestinazioneMondoDto } from '../../shared/accessoMondo';
import { centroAccessoMondo } from '../utils/accessoMondo';

const { getAccessoMondo } = vi.hoisted(() => ({ getAccessoMondo: vi.fn() }));
vi.mock('../services/api/accessoMondo', () => ({ getAccessoMondo }));
const destinazione: DestinazioneMondoDto = { mappa: 'shibuya', nomeMappa: 'Shibuya', spillo: 207, nomeSpillo: 'Untouchable', centro: null, provenienze: [] };
const risposta = (destinazioni: DestinazioneMondoDto[]): AccessoMondoDto => ({ entita: { tipo: 'negozio', chiave: 'untouchable' }, esito: destinazioni.length === 0 ? 'assente' : destinazioni.length === 1 ? 'unica' : 'multipla', destinazioni });
function Indirizzo() { const l = useLocation(); return <div data-testid="indirizzo">{l.pathname}{l.search}</div>; }
function monta(url = '/guida/mondo/negozio/untouchable') {
  return render(<MemoryRouter initialEntries={[url]}><Link to="/guida/mondo/negozio/leblanc">Altro luogo</Link><Routes>
    <Route path="/guida/mondo/:tipo/:chiave" element={<AccessoMondoPage />} />
    <Route path="/guida/mappe/:chiave" element={<Indirizzo />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { getAccessoMondo.mockReset(); });

it('apre il pin unico anche per chiavi di articolo contenenti slash', async () => {
  getAccessoMondo.mockResolvedValue(risposta([destinazione]));
  monta('/guida/mondo/articolo/untouchable%2Fkogatana-nera');
  expect(await screen.findByTestId('indirizzo')).toHaveTextContent('/guida/mappe/shibuya?spillo=207');
  expect(getAccessoMondo).toHaveBeenCalledWith('articolo', 'untouchable/kogatana-nera');
});
it('mantiene una scelta esplicita per destinazioni multiple', async () => {
  getAccessoMondo.mockResolvedValue(risposta([destinazione, { ...destinazione, mappa: 'yongen', nomeMappa: 'Yongen', spillo: 8 }]));
  monta();
  const link = await screen.findByRole('link', { name: 'Yongen — Untouchable' });
  expect(screen.queryByTestId('indirizzo')).not.toBeInTheDocument();
  fireEvent.click(link);
  expect(await screen.findByTestId('indirizzo')).toHaveTextContent('/guida/mappe/yongen?spillo=8');
});
it('mantiene il catalogo raggiungibile quando associazione è assente o il servizio fallisce', async () => {
  getAccessoMondo.mockResolvedValue(risposta([]));
  const vista = monta();
  expect(await screen.findByText(/non ha una posizione sulla mappa/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Apri scheda e informazioni' })).toHaveAttribute('href', '/guida/negozi/untouchable');
  vista.unmount();getAccessoMondo.mockRejectedValue(new Error('Servizio indisponibile'));monta();
  expect(await screen.findByText('Servizio indisponibile')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Apri scheda e informazioni' })).toHaveAttribute('href', '/guida/negozi/untouchable');
});
it('ignora risposte tardive della precedente entità', async () => {
  let prima!: (r: AccessoMondoDto) => void;
  let seconda!: (r: AccessoMondoDto) => void;
  getAccessoMondo.mockReturnValueOnce(new Promise<AccessoMondoDto>(r => { prima = r; })).mockReturnValueOnce(new Promise<AccessoMondoDto>(r => { seconda = r; }));
  monta();fireEvent.click(screen.getByText('Altro luogo'));
  await act(async () => prima(risposta([destinazione])));
  expect(screen.queryByTestId('indirizzo')).not.toBeInTheDocument();
  await act(async () => seconda(risposta([{ ...destinazione, mappa: 'leblanc', spillo: 8 }])));
  expect(await screen.findByTestId('indirizzo')).toHaveTextContent('/guida/mappe/leblanc?spillo=8');
});
it('trasporta l’ingresso configurato e accetta solo coordinate complete e valide', async () => {
  getAccessoMondo.mockResolvedValue(risposta([{ ...destinazione, spillo: null, centro: { x: 0, y: 100, zoom: 6 } }]));
  monta('/guida/mondo/quartiere/shibuya');
  expect(await screen.findByTestId('indirizzo')).toHaveTextContent('/guida/mappe/shibuya?x=0&y=100&zoom=6');
  expect(centroAccessoMondo(new URLSearchParams('x=0&y=100&zoom=6'))).toEqual({ x: 0, y: 100, zoom: 6 });
  for (const query of ['', 'x=0&y=30', 'x=&y=30&zoom=2', 'x=NaN&y=30&zoom=2', 'x=10&y=101&zoom=2', 'x=10&y=30&zoom=0', 'x=Infinity&y=30&zoom=2']) expect(centroAccessoMondo(new URLSearchParams(query))).toBeNull();
});

it('mantiene i contenuti guida distinti da un arrivo geografico', async () => {
  getAccessoMondo.mockResolvedValue({ ...risposta([]), guide: [{area: 'castello/biblioteca', dungeon: 'castello', mappaPalazzo: 'palazzo', nome: 'Biblioteca'}] });
  monta();
  expect(await screen.findByRole('region', { name: 'Contenuti della guida' })).toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'Biblioteca' });
  expect(link).toHaveAttribute('href', '/guida/mappe/palazzo?area=castello%2Fbiblioteca');
  expect(screen.queryByText(/non ha una posizione sulla mappa/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Apri scheda e informazioni' })).toBeInTheDocument();
});
