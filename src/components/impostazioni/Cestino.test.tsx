// @vitest-environment jsdom
// ============================================================
// Test Cestino — l'elenco degli elementi eliminati (che cos'era, dove, quando, che cosa si è portato via, quanto pesa), «Rimetti»
// con l'esito di ciò che non è tornato, «Elimina per sempre» e «Svuota il cestino» con conferma (2026-10-16)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Cestino } from './Cestino';
import type { EsitoRipristinoCestinoDto, VoceCestinoDto } from '../../types';

const api = vi.hoisted(() => ({ getCestino: vi.fn(), ripristinaDalCestino: vi.fn(), eliminaDalCestino: vi.fn(), svuotaCestino: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));

const AREA: VoceCestinoDto = {
  id: 7, tipo: 'area', chiave: 'madarame-scopri-dove-il-tesoro', nome: 'Scopri dov’è il Tesoro', contesto: 'Palazzo di Madarame',
  eliminatoIl: '2026-10-16T16:16:23.000Z', partite: 'presente', byte: 87_897,
  contenuto: [
    { tabella: 'spillo_voce', etichetta: 'collegamenti pin-voce', quante: 87 },
    { tabella: 'punto_interesse', etichetta: 'voci della guida', quante: 68 },
    { tabella: 'punto_partita', etichetta: 'spunte delle voci nelle partite', quante: 66 },
    { tabella: 'mappa_entita', etichetta: 'legami planimetria-infiltrazione', quante: 8 },
    { tabella: 'dungeon_area', etichetta: 'infiltrazione', quante: 1 },
  ],
};
const MAPPA: VoceCestinoDto = {
  id: 6, tipo: 'mappa', chiave: 'nativo-rmap-151-1-0', nome: 'Palazzo di Kamoshida', contesto: '', eliminatoIl: '2026-10-16T15:00:00.000Z',
  partite: 'mancante', byte: 3_365_305, contenuto: [{ tabella: 'immagine', etichetta: 'immagine', quante: 1 }, { tabella: 'mappa', etichetta: 'planimetria', quante: 1 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getCestino.mockResolvedValue([AREA, MAPPA]);
});

describe('Cestino', () => {
  it('elenca gli elementi: tipo, nome, dove stava, quando, peso, che cosa si sono portati via; il totale; la parte delle partite mancante', async () => {
    render(<Cestino />);
    const area = within(await screen.findByRole('listitem', { name: 'Infiltrazione «Scopri dov’è il Tesoro»' }));
    // UX2-12 (2026-10-20): il posto nel titolo e il contenuto con le parole di chi gioca, senza le tabelle interne né l'elemento stesso
    expect(area.getByText('Infiltrazione di Palazzo di Madarame: Scopri dov’è il Tesoro')).toBeInTheDocument();
    expect(area.getByText('con 68 voci della guida e 66 segni nelle partite')).toBeInTheDocument();
    expect(area.getByText(/Nel cestino dal .* · 86 kB/)).toBeInTheDocument();
    const contenuto = within(area.getByRole('list', { name: 'Che cosa si è portato via' }));
    expect(contenuto.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['68 voci della guida', '66 segni nelle partite']);
    expect(area.queryByText(/collegamenti pin-voce|legami planimetria-infiltrazione/)).toBeNull();
    const mappa = within(screen.getByRole('listitem', { name: 'Planimetria «Palazzo di Kamoshida»' }));
    expect(mappa.getByText(/3,2 MB/)).toBeInTheDocument();
    expect(mappa.getByText(/si rimettono solo i dati di gioco, non le spunte/)).toBeInTheDocument();
    expect(area.queryByText(/si rimettono solo i dati di gioco/)).toBeNull();
    expect(screen.getByText('2 elementi · 3,3 MB')).toBeInTheDocument();
  });

  it('UX2-12: un’area del mondo si legge «Area di Shibuya: Sottopasso, con 2 planimetrie, 14 pin e 3 immagini»; l’introduzione cita le aree', async () => {
    const SOTTOPASSO: VoceCestinoDto = {
      id: 9, tipo: 'area-fisica', chiave: 'citta/shibuya/sottopasso', nome: 'Sottopasso', contesto: 'Shibuya', eliminatoIl: '2026-10-20T02:05:00.000Z', partite: 'nessuna', byte: 1_000,
      contenuto: [
        { tabella: 'spillo', etichetta: 'pin', quante: 14 }, { tabella: 'mappa_alias', etichetta: 'nomi di prima delle mappe', quante: 4 },
        { tabella: 'immagine', etichetta: 'immagini', quante: 2 }, { tabella: 'spillo_immagine', etichetta: 'schermata di un pin', quante: 1 },
        { tabella: 'mappa_percorso', etichetta: 'percorsi delle mappe', quante: 2 }, { tabella: 'mappa', etichetta: 'planimetrie', quante: 2 },
        { tabella: 'area', etichetta: 'area', quante: 1 }, { tabella: 'immagine_miniatura', etichetta: 'immagine miniatura', quante: 1 },
      ],
    };
    api.getCestino.mockResolvedValue([SOTTOPASSO]);
    render(<Cestino />);
    const voce = within(await screen.findByRole('listitem', { name: 'Area «Sottopasso»' }));
    expect(voce.getByText('Area di Shibuya: Sottopasso')).toBeInTheDocument();
    expect(voce.getByText('con 2 planimetrie, 14 pin e 3 immagini')).toBeInTheDocument();
    expect(voce.queryByText(/nomi di prima|percorsi|miniatura/)).toBeNull();
    expect(screen.getByText(/Le aree dei quartieri e della città, le planimetrie/)).toBeInTheDocument();
  });

  it('vuoto: lo dice, e «Svuota il cestino» è spento', async () => {
    api.getCestino.mockResolvedValue([]);
    render(<Cestino />);
    expect(await screen.findByText('Il cestino è vuoto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Svuota il cestino/ })).toBeDisabled();
  });

  it('«Rimetti» senza nulla di saltato: avviso, e il cestino si rilegge', async () => {
    api.ripristinaDalCestino.mockResolvedValue({ tipo: 'area', chiave: AREA.chiave, nome: AREA.nome, rimesse: 285, saltate: [], partiteMancanti: false } satisfies EsitoRipristinoCestinoDto);
    render(<Cestino />);
    const area = within(await screen.findByRole('listitem', { name: /Scopri dov’è il Tesoro/ }));
    api.getCestino.mockResolvedValue([MAPPA]);
    fireEvent.click(area.getByRole('button', { name: /Rimetti/ }));
    await waitFor(() => expect(api.ripristinaDalCestino).toHaveBeenCalledWith(7));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', 'Di nuovo al suo posto: «Scopri dov’è il Tesoro».'));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: /Scopri dov’è il Tesoro/ })).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«Rimetti» con righe non tornate o senza le partite: l\'esito si apre e dice che cosa e perché', async () => {
    api.ripristinaDalCestino.mockResolvedValue({
      tipo: 'mappa', chiave: MAPPA.chiave, nome: MAPPA.nome, rimesse: 670, partiteMancanti: true,
      saltate: [
        { tabella: 'mappa', etichetta: 'planimetria', motivo: 'cambiata-dopo', quante: 1, esempi: ['nativo-rmap-151-2-0'] },
        { tabella: 'spillo_voce', etichetta: 'collegamenti pin-voce', motivo: 'legame-mancante', quante: 7, esempi: ['12 · a', '13 · b', '14 · c', '15 · d', '16 · e'] },
        { tabella: 'spillo', etichetta: 'pin', motivo: 'non-esiste-piu', quante: 1, esempi: ['40'] },
      ],
    } satisfies EsitoRipristinoCestinoDto);
    render(<Cestino />);
    fireEvent.click(within(await screen.findByRole('listitem', { name: /Palazzo di Kamoshida/ })).getByRole('button', { name: /Rimetti/ }));
    const esito = within(await screen.findByRole('dialog', { name: 'Esito del ripristino' }));
    expect(esito.getByText(/«Palazzo di Kamoshida»: di nuovo al suo posto, con 670 righe rimesse com’erano/)).toBeInTheDocument();
    expect(esito.getByText(/le spunte e gli stati delle partite non sono tornati/)).toBeInTheDocument();
    // il motivo concorda col numero: una planimetria «resta», sette collegamenti «non tornano»
    expect(esito.getByText('1 planimetria').parentElement).toHaveTextContent('1 planimetria con modifiche fatte dopo l’eliminazione: le modifiche restano');
    expect(esito.getByText('7 collegamenti pin-voce').parentElement).toHaveTextContent('7 collegamenti pin-voce che puntano a qualcosa eliminato dopo: non tornano');
    expect(esito.getByText('1 pin').parentElement).toHaveTextContent('1 pin che nel frattempo non c’è più');
    expect(esito.getByText('12 · a, 13 · b, 14 · c, 15 · d, 16 · e, …')).toBeInTheDocument();
    expect(notifica).not.toHaveBeenCalledWith('success', expect.anything());
    // la finestra ha la sua «Chiudi» in alto e quella fra le azioni, in fondo: si usa questa
    fireEvent.click(esito.getAllByRole('button', { name: /Chiudi/ }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('un errore del server (409) si dice, e il cestino si rilegge', async () => {
    api.ripristinaDalCestino.mockRejectedValue(new Error('Non si può rimettere «Scopri dov’è il Tesoro»: una riga ha la chiave ormai presa da qualcosa creato dopo.'));
    render(<Cestino />);
    fireEvent.click(within(await screen.findByRole('listitem', { name: /Scopri dov’è il Tesoro/ })).getByRole('button', { name: /Rimetti/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('la chiave ormai presa')));
    await waitFor(() => expect(api.getCestino).toHaveBeenCalledTimes(2));
  });

  it('«Elimina per sempre» chiede conferma; «Annulla» non tocca niente; la conferma toglie l\'elemento', async () => {
    api.eliminaDalCestino.mockResolvedValue(undefined);
    render(<Cestino />);
    fireEvent.click(within(await screen.findByRole('listitem', { name: /Palazzo di Kamoshida/ })).getByRole('button', { name: /Elimina per sempre/ }));
    let conferma = within(await screen.findByRole('dialog', { name: 'Togliere per sempre dal cestino?' }));
    expect(conferma.getByText(/Planimetria «Palazzo di Kamoshida»: non si potrà più rimettere/)).toBeInTheDocument();
    fireEvent.click(conferma.getByRole('button', { name: /Annulla/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.eliminaDalCestino).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('listitem', { name: /Palazzo di Kamoshida/ })).getByRole('button', { name: /Elimina per sempre/ }));
    conferma = within(await screen.findByRole('dialog', { name: 'Togliere per sempre dal cestino?' }));
    api.getCestino.mockResolvedValue([AREA]);
    fireEvent.click(conferma.getByRole('button', { name: /Elimina per sempre/ }));
    await waitFor(() => expect(api.eliminaDalCestino).toHaveBeenCalledWith(6));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', 'Eliminazione definitiva dal cestino: «Palazzo di Kamoshida».'));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: /Palazzo di Kamoshida/ })).toBeNull());
  });

  it('«Svuota il cestino» chiede conferma con quanti e quanto pesano, poi svuota', async () => {
    api.svuotaCestino.mockResolvedValue({ eliminati: 2 });
    render(<Cestino />);
    await screen.findByRole('listitem', { name: /Palazzo di Kamoshida/ });
    fireEvent.click(screen.getByRole('button', { name: /Svuota il cestino/ }));
    const conferma = within(await screen.findByRole('dialog', { name: 'Svuotare il cestino?' }));
    expect(conferma.getByText(/Tutti i 2 elementi nel cestino \(3,3 MB\) se ne vanno per sempre/)).toBeInTheDocument();
    api.getCestino.mockResolvedValue([]);
    fireEvent.click(conferma.getByRole('button', { name: /Svuota il cestino/ }));
    await waitFor(() => expect(api.svuotaCestino).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', 'Cestino svuotato: tolti per sempre 2 elementi.'));
    expect(await screen.findByText('Il cestino è vuoto.')).toBeInTheDocument();
  });
});
