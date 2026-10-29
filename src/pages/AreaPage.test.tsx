/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test AreaPage — la pagina di un'Area del mondo (L2, 2026-10-20): briciole e titolo, versioni come `?planimetria=`, avviso della
// versione senza pin, «Luoghi qui» che seleziona il pin, «Aree vicine» verso le case, Covo, eliminazione col riepilogo, Area assente
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AreaPage } from './AreaPage';
import { ApiError } from '../services/api/_helpers';
import { usePartitaStore } from '../stores/partitaStore';
import { useAssetStore } from '../stores/assetStore';
import type { AreaDettaglioDto, PlanimetriaAreaDto } from '../types';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ getArea: vi.fn(), eliminaAreaMondo: vi.fn(), ripristinaAreaMondo: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, api));
// il visore ha i suoi test (VisoreMappa, MappaIncorporata): qui conta che cosa la pagina gli passa
vi.mock('../components/mappe/MappaIncorporata', () => ({
  MappaIncorporata: (p: { chiave: string; nome: string; spilloIniziale?: number | null; rivelaSpilloIniziale?: boolean; titoloVisore?: string; senzaVicine?: boolean; contenutiPannello?: ReactNode }) => (
    <section aria-label="Visore">
      <p>Planimetria mostrata: {p.chiave}</p>
      <p>Pin scelto: {p.spilloIniziale ?? 'nessuno'}</p>
      <p>Pin chiesto con un comando: {p.rivelaSpilloIniziale ? 'sì' : 'no'}</p>
      <p>Titolo del visore: {p.titoloVisore}</p>
      {p.senzaVicine && <p>Senza «Su»</p>}
      {p.contenutiPannello}
    </section>
  ),
}));

const planimetria = (chiave: string, etichetta: string | null, ordine: number, numeroSpilli: number, predefinita = false): PlanimetriaAreaDto =>
  ({ chiave, nome: 'Sottopasso', etichetta, ordine, predefinita, numeroSpilli, immagineUrl: null, asset: null, ruoloImmagine: 'planimetria-nativa' });
const sottopasso: AreaDettaglioDto = {
  chiave: 'citta/shibuya/sottopasso', contenitore: { tipo: 'quartiere', chiave: 'shibuya', nome: 'Shibuya' }, slug: 'sottopasso', nome: 'Sottopasso', nomeRivisto: false, ordine: 1,
  predefinita: 'shibuya-sottopasso', illustrazione: { immagineUrl: null, asset: null }, numeroPlanimetrie: 2, numeroSpilli: 4, passaggio: null, ingresso: false,
  origine: 'seed', modificata: false, daVerificare: false, casa: '/guida/citta/shibuya/sottopasso',
  planimetrie: [planimetria('shibuya-sottopasso', null, 0, 4, true), planimetria('shibuya-sottopasso-speciale', 'planimetria completa', 1, 0)],
  elementi: [{ tipo: 'negozio', chiave: 'untouchable', nome: 'Untouchable', spillo: 42, planimetria: 'shibuya-sottopasso' }],
  vicine: [{ nome: 'Central Street', quartiereNome: 'Shibuya', casa: '/guida/citta/shibuya/central-street' }, { nome: 'Vicoli', quartiereNome: 'Yongen-Jaya', casa: '/guida/citta/yongen-jaya/vicoli' }],
};

/** L'indirizzo corrente, per vedere dove portano versioni, pin ed eliminazione. */
function Indirizzo() { const l = useLocation(); return <p data-testid="indirizzo">{l.pathname}{l.search}</p>; }
function monta(indirizzo = '/guida/citta/shibuya/sottopasso') {
  render(
    <MemoryRouter initialEntries={[indirizzo]}>
      <Routes>
        <Route path="/guida/citta/:chiave/:area" element={<><AreaPage /><Indirizzo /></>} />
        <Route path="*" element={<Indirizzo />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  usePartitaStore.setState({ attiva: null });
  useAssetStore.setState({ manifest: null, caricato: true, mancanti: {} });
  api.getArea.mockResolvedValue(sottopasso);
});

it('briciole fino al quartiere, titolo dell’Area e la predefinita nel visore col nome dell’Area', async () => {
  monta();
  expect(await screen.findByRole('heading', { level: 1, name: 'Sottopasso' })).toHaveAttribute('aria-current', 'page');
  const briciole = within(screen.getByRole('navigation', { name: 'Dove sei' }));
  expect(briciole.getByRole('link', { name: 'La città' })).toHaveAttribute('href', '/guida/citta');
  expect(briciole.getByRole('link', { name: 'Shibuya' })).toHaveAttribute('href', '/guida/citta/shibuya');
  expect(screen.getByText('Planimetria mostrata: shibuya-sottopasso')).toBeInTheDocument();
  expect(screen.getByText('Titolo del visore: Sottopasso')).toBeInTheDocument();
  expect(screen.getByText('Senza «Su»')).toBeInTheDocument();
  expect(api.getArea).toHaveBeenCalledWith('shibuya', 'sottopasso', undefined);
  // il titolo lo scrive un effetto: si aspetta il fatto invece di sperare nell'ordine
  await waitFor(() => expect(document.title).toContain('Sottopasso — Shibuya'));
});

it('scegliere una versione cambia solo `?planimetria=`; la versione senza pin lo dice e riporta a quella che li ha', async () => {
  monta();
  const versioni = within(await screen.findByRole('group', { name: 'Versioni di Sottopasso' }));
  expect(versioni.getByRole('button', { name: /^Planimetria 1/ })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(versioni.getByRole('button', { name: /planimetria completa/ }));
  expect(await screen.findByText('Planimetria mostrata: shibuya-sottopasso-speciale')).toBeInTheDocument();
  expect(screen.getByTestId('indirizzo')).toHaveTextContent('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale');
  expect(screen.getByRole('status')).toHaveTextContent('Su questa planimetria non ci sono pin');
  fireEvent.click(screen.getByRole('button', { name: 'Passa a «Planimetria 1»' }));
  expect(await screen.findByText('Planimetria mostrata: shibuya-sottopasso')).toBeInTheDocument();
  expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/citta\/shibuya\/sottopasso$/);
});

it('«Luoghi qui» seleziona il pin nell’indirizzo e porta alla scheda; «Aree vicine» porta alle case col quartiere se diverso', async () => {
  monta();
  const luoghi = within(await screen.findByRole('region', { name: 'Luoghi qui' }));
  expect(luoghi.getByRole('link', { name: 'Scheda di Untouchable' })).toHaveAttribute('href', '/guida/negozi/untouchable');
  fireEvent.click(luoghi.getByRole('button', { name: 'Untouchable' }));
  expect(await screen.findByText('Pin scelto: 42')).toBeInTheDocument();
  expect(screen.getByTestId('indirizzo')).toHaveTextContent('?spillo=42');
  // il tocco è un comando: il visore mostra il pin anche se adesso non è disponibile (UX2-2)
  expect(screen.getByText('Pin chiesto con un comando: sì')).toBeInTheDocument();
  const vicine = within(screen.getByRole('region', { name: 'Aree vicine' }));
  expect(vicine.getByRole('link', { name: 'Central Street' })).toHaveAttribute('href', '/guida/citta/shibuya/central-street');
  expect(vicine.getByRole('link', { name: /Vicoli.*Yongen-Jaya/ })).toHaveAttribute('href', '/guida/citta/yongen-jaya/vicoli');
});

it('LAY2-4: sul telefono «Luoghi qui» e «Aree vicine» stanno nella pagina sotto il visore, non nel suo pannello', async () => {
  const prima = window.matchMedia;
  window.matchMedia = ((q: string) => ({ matches: q.includes('max-width: 767.98px'), media: q, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
  try {
    monta();
    const luoghi = await screen.findByRole('region', { name: 'Luoghi qui' });
    const visore = screen.getByRole('region', { name: 'Visore' });
    expect(visore.contains(luoghi)).toBe(false);
    expect(visore.compareDocumentPosition(luoghi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('region', { name: 'Luoghi qui' })).toHaveLength(1);
    // il tocco resta un comando che seleziona il pin
    fireEvent.click(within(luoghi).getByRole('button', { name: 'Untouchable' }));
    expect(await screen.findByText('Pin scelto: 42')).toBeInTheDocument();
  } finally {
    window.matchMedia = prima;
  }
});

it('uno spillo che arriva con l’indirizzo si seleziona ma non è un comando: un pin non disponibile resta nascosto', async () => {
  monta('/guida/citta/shibuya/sottopasso?spillo=42');
  expect(await screen.findByText('Pin scelto: 42')).toBeInTheDocument();
  expect(screen.getByText('Pin chiesto con un comando: no')).toBeInTheDocument();
});

it('il Covo ha il collegamento alle sfide e alle Medaglie P nella testata', async () => {
  api.getArea.mockResolvedValue({ ...sottopasso, chiave: 'citta/yongen-jaya/covo-dei-ladri', slug: 'covo-dei-ladri', nome: 'Covo dei Ladri', contenitore: { tipo: 'quartiere', chiave: 'yongen-jaya', nome: 'Yongen-Jaya' } });
  monta('/guida/citta/yongen-jaya/covo-dei-ladri');
  // due copie dello stesso collegamento, una per fascia (§4.3, decisione di Stesura del 2026-10-20): in testata, nascosta da 1024 a
  // 1279 px quando c'è la fila delle versioni, e in fondo alla fila, fuori dalla parte che scorre, visibile solo in quella fascia
  await screen.findByRole('heading', { level: 1, name: 'Covo dei Ladri' });
  const [inTestata, inFila] = screen.getAllByRole('link', { name: 'Sfide e Medaglie P del Covo' });
  expect(inTestata).toHaveAttribute('href', '/guida/covo');
  expect(inTestata).toHaveClass('lg:max-xl:hidden');
  expect(inTestata.closest('header')).not.toBeNull();
  expect(inFila).toHaveAttribute('href', '/guida/covo');
  expect(inFila).toHaveClass('hidden', 'lg:max-xl:inline-flex');
  expect(inFila.closest('.versioni-area')).toBeNull();
  expect(inFila.parentElement!.querySelector('.versioni-area')).not.toBeNull();
});

it('un Covo con una sola planimetria (niente fila) tiene il collegamento in testata in ogni fascia', async () => {
  api.getArea.mockResolvedValue({ ...sottopasso, chiave: 'citta/yongen-jaya/covo-dei-ladri', slug: 'covo-dei-ladri', nome: 'Covo dei Ladri', contenitore: { tipo: 'quartiere', chiave: 'yongen-jaya', nome: 'Yongen-Jaya' }, planimetrie: [sottopasso.planimetrie[0]] });
  monta('/guida/citta/yongen-jaya/covo-dei-ladri');
  await screen.findByRole('heading', { level: 1, name: 'Covo dei Ladri' });
  const collegamenti = screen.getAllByRole('link', { name: 'Sfide e Medaglie P del Covo' });
  expect(collegamenti).toHaveLength(1);
  expect(collegamenti[0]).not.toHaveClass('lg:max-xl:hidden');
});

// richiesta dell'utente del 2026-10-29: il Covo c'è dal 5 maggio (condizione della sua Area, migrazione 303)
it('prima del 5 maggio il Covo dice che non è ancora aperto e non porta alle sfide', async () => {
  api.getArea.mockResolvedValue({ ...sottopasso, chiave: 'citta/yongen-jaya/covo-dei-ladri', slug: 'covo-dei-ladri', nome: 'Covo dei Ladri', contenitore: { tipo: 'quartiere', chiave: 'yongen-jaya', nome: 'Yongen-Jaya' },
    disponibile: false, bloccoMotivo: 'dal 5 maggio' });
  monta('/guida/citta/yongen-jaya/covo-dei-ladri');
  await screen.findByRole('heading', { level: 1, name: 'Covo dei Ladri' });
  expect(screen.queryByRole('link', { name: 'Sfide e Medaglie P del Covo' })).toBeNull();
  expect(screen.getByText('Non ancora aperta: dal 5 maggio.')).toBeInTheDocument();
});

it('«Elimina area»: la finestra dice che cosa si porta via e «Elimina» è la conferma (UX2-8): una richiesta, con la conferma, poi il quartiere', async () => {
  api.getArea.mockResolvedValue({ ...sottopasso, ingresso: true, passaggio: { spillo: 3, x: 10, y: 20 } });
  api.eliminaAreaMondo.mockResolvedValue(undefined);
  monta();
  fireEvent.click((await screen.findAllByRole('button', { name: 'Elimina area' }))[0]);
  const finestra = within(await screen.findByRole('dialog', { name: 'Eliminare Sottopasso?' }));
  expect(finestra.getByText(/le sue 2 planimetrie, 4 pin, il passaggio sull’illustrazione di Shibuya, l’ingresso di Shibuya, che resterà da scegliere/)).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina' }));
  await waitFor(() => expect(api.eliminaAreaMondo).toHaveBeenCalledWith('shibuya', 'sottopasso', true));
  expect(api.eliminaAreaMondo).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/citta\/shibuya$/));
});

it('un’Area che non c’è: «Area non trovata» col messaggio e il ritorno al quartiere', async () => {
  api.getArea.mockRejectedValue(new ApiError(404, 'area-non-trovata', 'Nessuna area «nessuna» in Shibuya.'));
  monta('/guida/citta/shibuya/nessuna');
  const avviso = within(await screen.findByRole('alert'));
  expect(avviso.getByRole('heading', { name: 'Area non trovata' })).toBeInTheDocument();
  expect(avviso.getByText('Nessuna area «nessuna» in Shibuya.')).toBeInTheDocument();
  expect(avviso.getByRole('link', { name: 'Torna indietro' })).toHaveAttribute('href', '/guida/citta/shibuya');
});
