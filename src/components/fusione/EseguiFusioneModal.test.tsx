/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test EseguiFusioneModal — anteprima con bonus di livello, scelta delle skill entro gli slot, esecuzione
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { EseguiFusioneModal } from './EseguiFusioneModal';
import type { AnteprimaFusioneDto } from '../../types';

const { getAnteprimaFusione, eseguiFusioneScorta } = vi.hoisted(() => ({ getAnteprimaFusione: vi.fn(), eseguiFusioneScorta: vi.fn() }));
vi.mock('../../services/api', () => ({ getAnteprimaFusione, eseguiFusioneScorta }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../shared/Modal', () => ({ Modal: ({ children, titolo }: { children: ReactNode; titolo: string }) => <div><h2>{titolo}</h2>{children}</div> }));

const skill = (id: number, nome: string, ereditabile = true, motivo: string | null = null) => ({ id, nome, nomeIt: nome, elemento: 'fire', elementoNome: 'Fuoco', costo: { tipo: 'sp', valore: 4, testo: '4 PS' }, effetto: '', effettoNome: '', da: [1], ereditabile, giaAppresa: false, motivo }) as unknown as AnteprimaFusioneDto['candidate'][number];
const anteprima: AnteprimaFusioneDto = {
  risultato: { id: 88, nome: 'Jack Frost', nomeIt: 'Jack Frost', arcana: 'Magician', arcanaNome: 'Mago', livello: 11, speciale: false, rara: false, dlc: false },
  tipo: 'normale',
  ingredienti: [{ possedutaId: 1, personaId: 18, nome: 'Arsène', nomeIt: 'Arsène', livello: 5, carica: false }, { possedutaId: 2, personaId: 3, nome: 'Pixie', nomeIt: 'Pixie', livello: 2, carica: false }],
  cariche: 0, livelloBase: 11, bonusLivelli: { min: 3, max: 3, rangoMatto: 7, rangoArcano: 5, affidabilita: 'media' }, livelloSuggerito: 14, sopraProtagonista: false, allarme: false, puntiAllarme: 0, rischioIncidente: false,
  slot: 3, slotScelti: 2, candidate: [skill(1, 'Agi'), skill(2, 'Dia'), skill(3, 'Zio'), skill(4, 'Cleave', false, 'Tipo non compatibile')],
  tratti: [{ id: 9, nome: 'Tratto', nomeIt: 'Tratto', da: null }], skillInnate: [],
};

describe('EseguiFusioneModal', () => {
  it('mostra il livello suggerito col bonus, limita le skill agli slot ed esegue con i dati scelti', async () => {
    getAnteprimaFusione.mockResolvedValue(anteprima);
    eseguiFusioneScorta.mockResolvedValue({ risultato: { nomeIt: 'Jack Frost', livello: 14 }, rimosse: [{ nomeIt: 'Arsène' }, { nomeIt: 'Pixie' }], anteprima });
    const onEseguita = vi.fn();
    render(<EseguiFusioneModal partitaId={7} possedutaIds={[1, 2]} onChiudi={() => undefined} onEseguita={onEseguita} />);
    expect(await screen.findByLabelText('Livello di partenza')).toHaveValue(14);
    expect(getAnteprimaFusione).toHaveBeenCalledWith(7, { possedutaIds: [1, 2], risultatoId: undefined });
    expect(screen.getByText(/bonus Confidente \+3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zio' }));
    expect(screen.getByRole('button', { name: 'Zio' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Skill da ereditare \(2\/2/)).toBeInTheDocument();
    expect(screen.getByText('1 non ereditabili')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Esegui: rimuovi gli ingredienti/ })); });
    expect(eseguiFusioneScorta).toHaveBeenCalledWith(7, { possedutaIds: [1, 2], risultatoId: undefined, skillIds: [1, 2], trattoSkillId: 9, livello: 14, note: undefined });
    expect(onEseguita).toHaveBeenCalled();
  });
});
