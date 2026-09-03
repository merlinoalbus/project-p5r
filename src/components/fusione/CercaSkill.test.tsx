// @vitest-environment jsdom
// ============================================================
// Test CercaSkill — selezione skill, chiamata API, elenco per risultato e ricette valide
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CercaSkill } from './CercaSkill';
import type { PersonaFusioneDto, PersonaRiassuntoDto, RicercaSkillDto, SkillRiassuntoDto } from '../../types';

const { getSkills, cercaPerSkill, getImmagini } = vi.hoisted(() => ({ getSkills: vi.fn(), cercaPerSkill: vi.fn(), getImmagini: vi.fn() }));
vi.mock('../../services/api', () => ({
  getSkills, cercaPerSkill, getImmagini,
  caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

function persona(id: number, nome: string, arcana: string, livello: number): PersonaRiassuntoDto {
  return { id, nome, nomeIt: nome, arcana, arcanaNome: arcana, livello, eredita: null, ereditaNome: null, speciale: false, rara: false, dlc: false, richiedeConfidenteMax: false, tratto: '', statistiche: { forza: 1, magia: 1, resistenza: 1, agilita: 1, fortuna: 1 }, affinita: [] };
}
const fus = (p: PersonaRiassuntoDto): PersonaFusioneDto => ({ id: p.id, nome: p.nome, nomeIt: p.nomeIt, arcana: p.arcana, arcanaNome: p.arcanaNome, livello: p.livello, speciale: false, rara: false, dlc: false });
const skill = (id: number, nome: string, nomeIt: string, elemento: string): SkillRiassuntoDto => ({ id, nome, nomeIt, elemento, elementoNome: elemento, costo: { tipo: 'sp', valore: 4, testo: '4 SP' }, effetto: 'x', effettoNome: `Effetto ${nomeIt}` });
const jack = persona(88, 'Jack Frost', 'Mago', 11);
const succube = persona(10, 'Succube', 'Diavolo', 7);
const saki = persona(11, 'Saki Mitama', 'Amanti', 6);
const tarukaja = skill(1, 'Tarukaja', 'Tarukaja', 'support');
const cleave = skill(2, 'Cleave', 'Fendente', 'phys');

beforeEach(() => {
  getSkills.mockReset(); cercaPerSkill.mockReset(); getImmagini.mockReset();
  getImmagini.mockResolvedValue([]);
  getSkills.mockResolvedValue([tarukaja, cleave]);
});

describe('CercaSkill', () => {
  it('sceglie una skill, chiama l\'API con il contesto e mostra risultati e ricette', async () => {
    const dati: RicercaSkillDto = {
      skill: [{ id: 1, nome: 'Tarukaja', nomeIt: 'Tarukaja', elemento: 'support', elementoNome: 'Supporto' }], risultato: null, totale: 2,
      ricette: [{ ricetta: { ingredienti: [fus(succube), fus(saki)], risultato: fus(jack), tipo: 'normale', costo: 8227 }, slot: 2, slotScelti: 1, daEreditare: [1], giaApprese: [] }],
      perRisultato: [{ persona: fus(jack), ricette: 2, costoMinimo: 8227 }, { persona: fus(succube), ricette: 1, costoMinimo: 9000 }],
    };
    cercaPerSkill.mockResolvedValue(dati);
    render(<MemoryRouter><CercaSkill persone={[jack, succube, saki]} partitaId={7} livelloProtagonista={20} inScorta={new Set([10])} /></MemoryRouter>);
    const campo = await screen.findByPlaceholderText('Cerca una skill (nome o effetto)…');
    await act(async () => { fireEvent.change(campo, { target: { value: 'taru' } }); });
    await act(async () => { screen.getByRole('option', { name: /Tarukaja/ }).querySelector('button')!.click(); });
    expect(cercaPerSkill).toHaveBeenCalledWith([1], { partita: 7, risultato: undefined, livelloMax: undefined, limite: 100 });
    expect(await screen.findByText(/2 ricette · 2 Persona/)).toBeInTheDocument();
    expect(screen.getByText(/Slot 2 \(1 a scelta\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri nel calcolatore' })).toHaveAttribute('href', '/fusione?vista=calcolatore&a=10&b=11');
    await act(async () => { screen.getByRole('button', { name: /Fino al livello 20/ }).click(); });
    expect(cercaPerSkill).toHaveBeenLastCalledWith([1], { partita: 7, risultato: undefined, livelloMax: 20, limite: 100 });
    await act(async () => { screen.getByRole('button', { name: 'Rimuovi Tarukaja' }).click(); });
    expect(screen.getByText(/Nessuna skill scelta/)).toBeInTheDocument();
  });
});
