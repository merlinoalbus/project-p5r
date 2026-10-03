// @vitest-environment jsdom
// ============================================================
// Test ScortaPersona — valori reali delle statistiche letti nel gioco (15.26): chip nell'elenco, campi nella finestra di modifica, invio all'API
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScortaPersona } from './ScortaPersona';
import type { PersonaPossedutaDto } from '../../types';

const api = vi.hoisted(() => ({
  getPossedute: vi.fn(), aggiornaPosseduta: vi.fn(), aggiungiPosseduta: vi.fn(), rimuoviPosseduta: vi.fn(), getPersone: vi.fn(), getSkills: vi.fn(),
  getCompendioPartita: vi.fn(), registraPosseduta: vi.fn(), isApiError: vi.fn(() => false),
  // immagini delle entità (ImmagineEntita → immaginiCache)
  getImmagini: vi.fn(), urlImmagine: vi.fn((ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
}));
vi.mock('../../services/api', () => api);
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));

const zero = { forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 };
/** Arsène al livello 2: la stima dalla base (2/2/2/3/1) dà 3/3/2/4/1; nel gioco dell'utente si legge 4/2/2/4/1. */
const stimata: PersonaPossedutaDto = {
  id: 1, personaId: 5, nome: 'Arsène', nomeIt: 'Arsène', arcana: 'Fool', arcanaNome: 'Matto', livelloBase: 1, livello: 2,
  statistiche: { forza: 3, magia: 3, resistenza: 2, agilita: 4, fortuna: 1 }, statisticheStimate: { forza: 3, magia: 3, resistenza: 2, agilita: 4, fortuna: 1 },
  bonus: zero, statisticheBase: true, osservate: null, origineStima: 'base', statisticheConfermate: false,
  statisticheBaseLivello: { forza: 2, magia: 2, resistenza: 2, agilita: 3, fortuna: 1 }, tratto: null, inSquadra: true, carica: false, note: '', skill: [], createdAt: '', updatedAt: '',
};
const reale: PersonaPossedutaDto = {
  ...stimata, id: 2, statistiche: { forza: 4, magia: 2, resistenza: 2, agilita: 4, fortuna: 1 }, statisticheStimate: { forza: 4, magia: 2, resistenza: 2, agilita: 4, fortuna: 1 },
  osservate: { livello: 2, forza: 4, magia: 2, resistenza: 2, agilita: 4, fortuna: 1 }, origineStima: 'osservate', statisticheConfermate: true,
};

function monta() {
  render(<MemoryRouter><ScortaPersona partitaId={7} /></MemoryRouter>);
}

describe('ScortaPersona — valori reali (15.26)', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.isApiError.mockReturnValue(false);
    api.getCompendioPartita.mockResolvedValue([]);
    api.getSkills.mockResolvedValue([]);
    api.getImmagini.mockResolvedValue([]);
    api.urlImmagine.mockImplementation((ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`);
  });

  it('nell’elenco distingue la stima dalla base dai valori reali letti nel gioco', async () => {
    api.getPossedute.mockResolvedValue([stimata, reale]);
    monta();
    const carte = await screen.findAllByRole('listitem');
    expect(within(carte[0]).getByText('Stima')).toBeInTheDocument();
    expect(within(carte[0]).getByText(/Statistiche al livello 2 \(stima del livello\)/)).toBeInTheDocument();
    expect(within(carte[1]).getByText('Valori reali')).toBeInTheDocument();
    expect(within(carte[1]).getByText(/Statistiche al livello 2 \(valori reali letti nel gioco\)/)).toBeInTheDocument();
  });

  it('nella finestra di modifica i campi «reali» partono dai valori attuali; scriverne uno registra i cinque valori al livello corrente e azzera i bonus', async () => {
    api.getPossedute.mockResolvedValue([{ ...stimata, bonus: { ...zero, magia: 1 }, statisticheBase: false, statistiche: { ...stimata.statistiche, magia: 4 } }]);
    api.aggiornaPosseduta.mockResolvedValue(reale);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: /Modifica/ }));
    const finestra = within(await screen.findByRole('dialog'));
    const fr = finestra.getByLabelText('FR reale') as HTMLInputElement;
    const ma = finestra.getByLabelText('MA reale') as HTMLInputElement;
    // precompilati con le statistiche attuali (stima 3/3/2/4/1 più il bonus MA +1)
    expect(fr.value).toBe('3');
    expect(ma.value).toBe('4');
    fireEvent.change(fr, { target: { value: '4' } });
    fireEvent.change(ma, { target: { value: '2' } });
    // i bonus sono ripartiti da zero: i valori reali li comprendono
    expect((finestra.getByLabelText('Bonus MA') as HTMLInputElement).value).toBe('0');
    expect(finestra.getByText(/Registrerai i valori letti nel gioco al livello 2/)).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaPosseduta).toHaveBeenCalledWith(7, 1, expect.objectContaining({
      livello: 2, bonus: zero, osservate: { livello: 2, forza: 4, magia: 2, resistenza: 2, agilita: 4, fortuna: 1 },
    })));
  });

  it('«Dimentica i valori reali» invia osservate = null; senza toccare i campi non invia osservate', async () => {
    api.getPossedute.mockResolvedValue([reale]);
    api.aggiornaPosseduta.mockResolvedValue(reale);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: /Modifica/ }));
    let finestra = within(await screen.findByRole('dialog'));
    expect(finestra.getByText(/Valori reali registrati al livello 2/)).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaPosseduta).toHaveBeenCalledTimes(1));
    expect(api.aggiornaPosseduta.mock.calls[0][2]).not.toHaveProperty('osservate');
    fireEvent.click(await screen.findByRole('button', { name: /Modifica/ }));
    finestra = within(await screen.findByRole('dialog'));
    fireEvent.click(finestra.getByRole('button', { name: /Dimentica i valori reali/ }));
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaPosseduta).toHaveBeenLastCalledWith(7, 2, expect.objectContaining({ osservate: null })));
  });
});

describe('ScortaPersona — due gesti ravvicinati (B3", validazione voce 2)', () => {
  const pixie: PersonaPossedutaDto = { ...stimata, id: 3, personaId: 9, nome: 'Pixie', nomeIt: 'Pixie', arcana: 'Lovers', arcanaNome: 'Amanti', livello: 2 };
  const conLivello = (p: PersonaPossedutaDto, livello: number): PersonaPossedutaDto => ({ ...p, livello });
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.isApiError.mockReturnValue(false);
    api.getCompendioPartita.mockResolvedValue([]);
    api.getSkills.mockResolvedValue([]);
    api.getImmagini.mockResolvedValue([]);
    api.urlImmagine.mockImplementation((ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  /** La salita di Arsène resta in volo; risolverla dopo un altro gesto non deve annullare quel gesto. */
  function arseneInVolo() {
    let risolvi!: (p: PersonaPossedutaDto) => void;
    api.aggiornaPosseduta.mockImplementation((_id: number, possedutaId: number) => (possedutaId === 1
      ? new Promise<PersonaPossedutaDto>((ok) => { risolvi = ok; })
      : Promise.resolve(conLivello(pixie, 3))));
    return (p: PersonaPossedutaDto) => risolvi(p);
  }

  it('salita di livello: la risposta di Arsène arrivata dopo quella di Pixie non riporta Pixie indietro', async () => {
    api.getPossedute.mockResolvedValue([stimata, pixie]);
    const risolviArsene = arseneInVolo();
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Sali di livello: Arsène al livello 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sali di livello: Pixie al livello 3' }));
    expect(await screen.findByRole('button', { name: 'Sali di livello: Pixie al livello 4' })).toBeInTheDocument();
    risolviArsene(conLivello(stimata, 3));
    expect(await screen.findByRole('button', { name: 'Sali di livello: Arsène al livello 4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sali di livello: Pixie al livello 4' })).toBeInTheDocument();
  });

  it('rimozione: la Persona tolta mentre un\'altra sale di livello non ricompare', async () => {
    api.getPossedute.mockResolvedValue([stimata, pixie]);
    const risolviArsene = arseneInVolo();
    api.rimuoviPosseduta.mockResolvedValue(undefined);
    monta();
    fireEvent.click(await screen.findByRole('button', { name: 'Sali di livello: Arsène al livello 3' }));
    const cartaPixie = (await screen.findAllByRole('listitem')).find((li) => within(li).queryByText('Pixie'))!;
    fireEvent.click(within(cartaPixie).getByRole('button', { name: /Rimuovi/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Sali di livello: Pixie/ })).toBeNull());
    risolviArsene(conLivello(stimata, 3));
    expect(await screen.findByRole('button', { name: 'Sali di livello: Arsène al livello 4' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sali di livello: Pixie/ })).toBeNull();
  });

  it('aggiunta: una Persona aggiunta mentre un\'altra è appena salita di livello non riporta indietro il livello', async () => {
    api.getPossedute.mockResolvedValue([stimata, pixie]);
    api.aggiornaPosseduta.mockResolvedValue(conLivello(pixie, 3));
    api.getPersone.mockResolvedValue([{ id: 20, nome: 'Jack Frost', nomeIt: 'Jack Frost', arcanaNome: 'Mago', livello: 11, rara: false }]);
    let risolviAggiunta!: (p: PersonaPossedutaDto) => void;
    api.aggiungiPosseduta.mockImplementation(() => new Promise<PersonaPossedutaDto>((ok) => { risolviAggiunta = ok; }));
    monta();
    fireEvent.click(await screen.findByRole('button', { name: '+ Aggiungi Persona' }));
    const finestra = within(await screen.findByRole('dialog'));
    fireEvent.click(await finestra.findByRole('button', { name: 'Aggiungi' })); // in volo
    fireEvent.click(screen.getByRole('button', { name: 'Sali di livello: Pixie al livello 3' })); // arriva subito
    expect(await screen.findByRole('button', { name: 'Sali di livello: Pixie al livello 4' })).toBeInTheDocument();
    risolviAggiunta({ ...stimata, id: 20, personaId: 20, nome: 'Jack Frost', nomeIt: 'Jack Frost' });
    expect(await screen.findByRole('button', { name: /Sali di livello: Jack Frost/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sali di livello: Pixie al livello 4' })).toBeInTheDocument();
  });

  it('modifica: il salvataggio di una Persona arrivato dopo la salita di un\'altra non la riporta indietro', async () => {
    api.getPossedute.mockResolvedValue([stimata, pixie]);
    let risolviModifica!: (p: PersonaPossedutaDto) => void;
    api.aggiornaPosseduta.mockImplementation((_id: number, possedutaId: number) => (possedutaId === 1
      ? new Promise<PersonaPossedutaDto>((ok) => { risolviModifica = ok; })
      : Promise.resolve(conLivello(pixie, 3))));
    monta();
    const cartaArsene = (await screen.findAllByRole('listitem')).find((li) => within(li).queryByText('Arsène'))!;
    fireEvent.click(within(cartaArsene).getByRole('button', { name: /Modifica/ }));
    const finestra = within(await screen.findByRole('dialog'));
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' })); // in volo
    fireEvent.click(screen.getByRole('button', { name: 'Sali di livello: Pixie al livello 3' })); // arriva subito
    expect(await screen.findByRole('button', { name: 'Sali di livello: Pixie al livello 4' })).toBeInTheDocument();
    risolviModifica({ ...stimata, note: 'salvata' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Sali di livello: Pixie al livello 4' })).toBeInTheDocument();
  });
});
