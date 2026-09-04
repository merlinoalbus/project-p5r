/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test ObiettiviPartita — elenco con avanzamento, filtri per stato, azioni e collegamento al piano con le skill
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ObiettiviPartita } from './ObiettiviPartita';
import { linkPiano } from '../../utils/obiettivi';
import type { ObiettivoDto, SkillRiassuntoDto } from '../../types';

const { getObiettivi, aggiornaObiettivo, creaObiettivo, eliminaObiettivo, getPersone, getSkills } = vi.hoisted(() => ({
  getObiettivi: vi.fn(), aggiornaObiettivo: vi.fn(), creaObiettivo: vi.fn(), eliminaObiettivo: vi.fn(), getPersone: vi.fn(), getSkills: vi.fn(),
}));
vi.mock('../../services/api', () => ({ getObiettivi, aggiornaObiettivo, creaObiettivo, eliminaObiettivo, getPersone, getSkills, isApiError: () => false }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../shared/ImmagineEntita', () => ({ ImmagineEntita: () => null }));

function skill(id: number, nome: string): SkillRiassuntoDto {
  return { id, nome, nomeIt: nome, elemento: 'fire', elementoNome: 'Fuoco', costo: { tipo: 'sp', valore: 4, testo: '4 PS' }, effetto: '', effettoNome: '' } as unknown as SkillRiassuntoDto;
}
const agi = skill(1, 'Agi');
const dia = skill(2, 'Dia');
function ob(id: number, extra: Partial<ObiettivoDto>): ObiettivoDto {
  return {
    id, personaId: 88, nome: 'Jack Frost', nomeIt: 'Jack Frost', arcana: 'Magician', arcanaNome: 'Mago', livelloBase: 11, speciale: false, rara: false, dlc: false,
    skill: [agi, dia], livelloMin: 15, priorita: 1, stato: 'aperto', note: '', possedutaId: null, livelloAttuale: null, skillMancanti: [agi, dia], livelloRaggiunto: false, soddisfatto: false,
    raggiuntoAt: null, pianiSalvati: 0, createdAt: '2026-09-03T10:00:00.000Z', updatedAt: '2026-09-03T10:00:00.000Z', ...extra,
  };
}

describe('ObiettiviPartita', () => {
  beforeEach(() => { getObiettivi.mockReset(); aggiornaObiettivo.mockReset(); });

  it('mostra l\'avanzamento, i filtri per stato e le azioni; «Segna raggiunto» aggiorna la voce', async () => {
    getObiettivi.mockResolvedValue([
      ob(1, { possedutaId: 5, livelloAttuale: 11, skillMancanti: [agi], livelloRaggiunto: false }),
      ob(2, { personaId: 3, nome: 'Pixie', nomeIt: 'Pixie', stato: 'raggiunto', skill: [], skillMancanti: [], livelloMin: null, possedutaId: 6, livelloAttuale: 4, livelloRaggiunto: true, soddisfatto: true, raggiuntoAt: '2026-09-03T10:00:00.000Z' }),
    ]);
    render(<MemoryRouter><ObiettiviPartita partitaId={7} /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Jack Frost' })).toHaveAttribute('href', '/compendio/persona/88');
    expect(screen.getByRole('button', { name: 'Aperti (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raggiunti (1)' })).toBeInTheDocument();
    expect(screen.queryByText('Pixie')).toBeNull(); // filtro «Aperti»
    expect(screen.getByText(/In scorta al livello 11: 1 skill mancanti, livello insufficiente/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agi ✗' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dia ✓' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Piano di fusione' })).toHaveAttribute('href', '/fusione?vista=piani&piani=88&skill=1,2&obiettivo=1');
    aggiornaObiettivo.mockResolvedValue(ob(1, { stato: 'raggiunto', raggiuntoAt: '2026-09-03T11:00:00.000Z' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Segna raggiunto' })); });
    expect(aggiornaObiettivo).toHaveBeenCalledWith(7, 1, { stato: 'raggiunto' });
    expect(screen.getByText('Nessun obiettivo aperto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Raggiunti (2)' }));
    expect(screen.getByRole('link', { name: 'Pixie' })).toBeInTheDocument();
    expect(screen.getByText('In scorta: condizioni soddisfatte.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Riapri' })).toHaveLength(2);
  });

  it('linkPiano porta le skill dell\'obiettivo nei parametri', () => {
    expect(linkPiano({ personaId: 4, skill: [] })).toBe('/fusione?vista=piani&piani=4');
    expect(linkPiano({ personaId: 4, skill: [{ id: 9 }] })).toBe('/fusione?vista=piani&piani=4&skill=9');
    expect(linkPiano({ id: 3, personaId: 4, skill: [] })).toBe('/fusione?vista=piani&piani=4&obiettivo=3');
  });
});
