// @vitest-environment jsdom
// ============================================================
// Test Calcolatore e RicettePersona — selezione, chiamate API con il contesto della partita, esiti e filtri
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Calcolatore } from './Calcolatore';
import { RicettePersona } from './RicettePersona';
import type { EsitoFusioneDto, PersonaFusioneDto, PersonaRiassuntoDto, RicetteFusioneDto } from '../../types';

const { getFondi, getRicettePer, getFusioniCon, getImmagini, getEredita } = vi.hoisted(() => ({ getFondi: vi.fn(), getRicettePer: vi.fn(), getFusioniCon: vi.fn(), getImmagini: vi.fn(), getEredita: vi.fn() }));
vi.mock('../../services/api', () => ({
  getFondi, getRicettePer, getFusioniCon, getImmagini, getEredita,
  caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

function persona(id: number, nome: string, arcana: string, livello: number, extra: Partial<PersonaRiassuntoDto> = {}): PersonaRiassuntoDto {
  return {
    id, nome, nomeIt: nome, arcana, arcanaNome: arcana, livello, eredita: null, ereditaNome: null, speciale: false, rara: false, dlc: false, richiedeConfidenteMax: false,
    tratto: '', statistiche: { forza: 1, magia: 1, resistenza: 1, agilita: 1, fortuna: 1 }, affinita: [], ...extra,
  };
}
const fus = (p: PersonaRiassuntoDto): PersonaFusioneDto => ({ id: p.id, nome: p.nome, nomeIt: p.nomeIt, arcana: p.arcana, arcanaNome: p.arcanaNome, livello: p.livello, speciale: p.speciale, rara: p.rara, dlc: p.dlc });

const arsene = persona(1, 'Arsène', 'Matto', 1);
const pixie = persona(2, 'Pixie', 'Amanti', 2);
const regent = persona(3, 'Regent', 'Imperatore', 10, { rara: true, nomeIt: 'Reggente' });
const jack = persona(88, 'Jack Frost', 'Mago', 11);
const persone = [arsene, pixie, regent, jack];

beforeEach(() => {
  getFondi.mockReset(); getRicettePer.mockReset(); getFusioniCon.mockReset(); getImmagini.mockReset(); getEredita.mockReset();
  getImmagini.mockResolvedValue([]);
  getEredita.mockResolvedValue({
    risultato: fus(jack), tipo: 'Ice', tipoNome: 'Ghiaccio',
    ingredienti: [
      { persona: fus(arsene), livello: 1, daScorta: true, skill: [{ id: 5, nome: 'Eiha', nomeIt: 'Eiha', elemento: 'curse' }] },
      { persona: fus(pixie), livello: 2, daScorta: false, skill: [{ id: 6, nome: 'Zio', nomeIt: 'Zio', elemento: 'electric' }, { id: 7, nome: 'Dia', nomeIt: 'Dia', elemento: 'healing' }] },
    ],
    totaleSkillGenitori: 3, slot: 1, slotScelti: 0,
    candidate: [
      { id: 6, nome: 'Zio', nomeIt: 'Zio', elemento: 'electric', elementoNome: 'Elettricità', da: [2], ereditabile: true, giaAppresa: false, motivo: null },
      { id: 5, nome: 'Eiha', nomeIt: 'Eiha', elemento: 'curse', elementoNome: 'Oscurità', da: [1], ereditabile: true, giaAppresa: false, motivo: null },
      { id: 7, nome: 'Dia', nomeIt: 'Dia', elemento: 'healing', elementoNome: 'Guarigione', da: [2], ereditabile: false, giaAppresa: true, motivo: 'il risultato la apprende comunque da sé' },
    ],
    tratti: [{ id: 90, nome: 'Frigid Bloodline', nomeIt: 'Stirpe gelida', effettoNome: 'Potenzia il ghiaccio', da: null }, { id: 91, nome: 'Pinch Anchor', nomeIt: 'Ancora nei guai', effettoNome: 'x', da: 1 }],
  });
});

async function scegli(etichetta: string, testo: string, nome: string) {
  const campo = within(screen.getByText(etichetta).closest('.card')!).getByPlaceholderText('Cerca per nome o arcano…');
  await act(async () => { fireEvent.change(campo, { target: { value: testo } }); });
  await act(async () => { screen.getByRole('option', { name: new RegExp(nome) }).querySelector('button')!.click(); });
}

describe('Calcolatore', () => {
  it('sceglie due Persona, chiama l\'API con la partita e mostra risultato, tipo e costo', async () => {
    const esito: EsitoFusioneDto = { a: fus(arsene), b: fus(pixie), ricetta: { ingredienti: [fus(arsene), fus(pixie)], risultato: fus(jack), tipo: 'normale', costo: 8227 }, motivo: null, dlcPosseduti: [], sconto: 0, bonusConfidente: null };
    getFondi.mockResolvedValue(esito);
    render(<MemoryRouter><Calcolatore persone={persone} partitaId={7} inScorta={new Set([1, 2])} /></MemoryRouter>);
    await scegli('Prima Persona', 'ars', 'Arsène');
    await scegli('Seconda Persona', 'pix', 'Pixie');
    expect(getFondi).toHaveBeenCalledWith(1, 2, { partita: 7 });
    expect(await screen.findByRole('link', { name: 'Jack Frost' })).toHaveAttribute('href', '/compendio/persona/88');
    expect(screen.getByText(/costo stimato/).textContent).toMatch(/8\D?227 ¥/);
    expect(screen.getByText('Hai entrambi gli ingredienti nella scorta')).toBeInTheDocument();
    // pannello eredità: slot, ereditabili, escluse con motivo, tratti
    expect(await screen.findByText('Eredità delle skill')).toBeInTheDocument();
    expect(getEredita).toHaveBeenCalledWith(1, 2, { partita: 7 });
    expect(screen.getByText(/skill dei genitori 3/)).toHaveTextContent('1 slot (0 a scelta, 1 casuale)');
    expect(screen.getByText('Zio')).toBeInTheDocument();
    expect(screen.getByText(/Non ereditabili \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Dia: il risultato la apprende comunque da sé/)).toBeInTheDocument();
    expect(screen.getByText('Stirpe gelida')).toBeInTheDocument();
    expect(screen.getByText(/da Arsène/)).toBeInTheDocument();
  });

  it('mostra il motivo quando la fusione non è possibile', async () => {
    getFondi.mockResolvedValue({ a: fus(arsene), b: fus(arsene), ricetta: null, motivo: 'Una Persona non può essere fusa con sé stessa.', dlcPosseduti: [], sconto: 0, bonusConfidente: null } satisfies EsitoFusioneDto);
    render(<MemoryRouter><Calcolatore persone={persone} partitaId={null} inScorta={new Set()} inizialeA={1} inizialeB={1} /></MemoryRouter>);
    expect(await screen.findByText('Fusione non possibile.')).toBeInTheDocument();
    expect(screen.getByText(/sé stessa/)).toBeInTheDocument();
    expect(getFondi).toHaveBeenCalledWith(1, 1, { partita: undefined });
    expect(screen.getByText(/Nessuna partita attiva/)).toBeInTheDocument();
  });
});

describe('RicettePersona', () => {
  it('elenca le ricette per ottenere una Persona, evidenzia quelle pronte e applica il filtro del livello', async () => {
    const dati: RicetteFusioneDto = {
      persona: fus(jack), totale: 2, totaleSenzaFiltri: 3, livelloMax: null, dlcPosseduti: [], sconto: 0,
      ricette: [
        { ingredienti: [fus(arsene), fus(pixie)], risultato: fus(jack), tipo: 'normale', costo: 8227 },
        { ingredienti: [fus(regent), fus(pixie)], risultato: fus(jack), tipo: 'tesoro', costo: 9000 },
      ],
    };
    getRicettePer.mockResolvedValue(dati);
    render(<MemoryRouter><RicettePersona persone={persone} partitaId={7} livelloProtagonista={20} inScorta={new Set([1, 2])} modalita="per" inizialeId={88} /></MemoryRouter>);
    expect(await screen.findByText(/2 ricette/)).toBeInTheDocument();
    expect(getRicettePer).toHaveBeenCalledWith(88, { partita: 7, livelloMax: undefined, limite: 50 });
    expect(screen.getAllByText('Pronta')).toHaveLength(1);
    // filtro "solo pronte" lato client
    await act(async () => { screen.getByRole('button', { name: 'Solo pronte con la scorta' }).click(); });
    expect(screen.queryByText(/Reggente/)).not.toBeInTheDocument();
    // filtro del livello: nuova chiamata con livelloMax
    await act(async () => { screen.getByRole('button', { name: /Fino al livello 20/ }).click(); });
    expect(getRicettePer).toHaveBeenLastCalledWith(88, { partita: 7, livelloMax: 20, limite: 50 });
  });

  it('per un Demone del Tesoro spiega che non si ottiene per fusione', async () => {
    getRicettePer.mockResolvedValue({ persona: fus(regent), totale: 0, totaleSenzaFiltri: 0, livelloMax: null, dlcPosseduti: [], ricette: [], sconto: 0 } satisfies RicetteFusioneDto);
    render(<MemoryRouter><RicettePersona persone={persone} partitaId={null} livelloProtagonista={null} inScorta={new Set()} modalita="per" fissa={regent} /></MemoryRouter>);
    expect(await screen.findByText(/non si ottengono per fusione/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fino al livello/ })).toBeDisabled();
  });
});
