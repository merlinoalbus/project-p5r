/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CicliSalvati — anello corrente, stato di ingrediente/partner, evocazione del partner, esecuzione e avanzamento
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CicliSalvati } from './CicliSalvati';
import type { AnelloCicloDto, CicloSalvatoDto } from '../../types';

const { getCicliSalvati, getPossedute, aggiungiPosseduta, avanzaCiclo, aggiornaCiclo, eliminaCiclo } = vi.hoisted(() => ({
  getCicliSalvati: vi.fn(), getPossedute: vi.fn(), aggiungiPosseduta: vi.fn(), avanzaCiclo: vi.fn(), aggiornaCiclo: vi.fn(), eliminaCiclo: vi.fn(),
}));
vi.mock('../../services/api', () => ({ getCicliSalvati, getPossedute, aggiungiPosseduta, avanzaCiclo, aggiornaCiclo, eliminaCiclo, isApiError: () => false, getImmagini: vi.fn().mockResolvedValue([]), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(), urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`, }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../fusione/EseguiFusioneModal', () => ({ EseguiFusioneModal: ({ possedutaIds, onEseguita }: { possedutaIds: number[]; onEseguita: () => void }) => <div><span>Modale fusione {possedutaIds.join('+')}</span><button type="button" onClick={onEseguita}>Conferma fusione</button></div> }));
vi.mock('../shared/Modal', () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const p = (id: number, nome: string): AnelloCicloDto['ingrediente'] => ({ id, nome, nomeIt: nome, arcana: 'Magician', arcanaNome: 'Mago', livello: 10, speciale: false, rara: false, dlc: false });
const anelli: AnelloCicloDto[] = [
  { ingrediente: p(88, 'Jack Frost'), partner: p(2, 'Pixie'), partnerModo: 'registro', partnerCosto: 2300, risultato: p(50, 'Agathion'), tipo: 'normale', bonusLivelli: { min: 2, max: 2 }, rangoArcano: 4 },
  { ingrediente: p(50, 'Agathion'), partner: p(3, 'Bicorn'), partnerModo: 'registro', partnerCosto: 2500, risultato: p(88, 'Jack Frost'), tipo: 'normale', bonusLivelli: { min: 0, max: 0 }, rangoArcano: 0 },
];
const ciclo = (extra: Partial<CicloSalvatoDto> = {}): CicloSalvatoDto => ({
  id: 5, personaId: 88, nome: 'Jack Frost', nomeIt: 'Jack Frost', arcanaNome: 'Mago', titolo: 'Il mio ciclo', note: '', anelli, costo: 4800, lunghezza: 2, iterazioni: 0, anelloCorrente: 0,
  avanzamento: { ingredientePossedutaId: 11, partnerPossedutaId: null, partnerRegistrato: true, eseguibile: false }, createdAt: '2026-09-03T10:00:00.000Z', updatedAt: '2026-09-03T10:00:00.000Z', ...extra,
});

describe('CicliSalvati', () => {
  beforeEach(() => { getCicliSalvati.mockReset(); getPossedute.mockReset(); aggiungiPosseduta.mockReset(); avanzaCiclo.mockReset(); });

  it('mostra l\'anello corrente, permette di evocare il partner e poi di eseguire l\'anello; avanza e conta il giro', async () => {
    getPossedute.mockResolvedValue([]);
    getCicliSalvati.mockResolvedValueOnce([ciclo()]).mockResolvedValueOnce([ciclo({ avanzamento: { ingredientePossedutaId: 11, partnerPossedutaId: 12, partnerRegistrato: true, eseguibile: true } })]);
    render(<MemoryRouter><CicliSalvati partitaId={7} /></MemoryRouter>);
    expect(await screen.findByText('Anello corrente: 1 di 2')).toBeInTheDocument();
    expect(screen.getByText('Pixie: da evocare dal Registro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Esegui anello 1' })).toBeDisabled();
    aggiungiPosseduta.mockResolvedValue({});
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Evoca Pixie/ })); });
    expect(aggiungiPosseduta).toHaveBeenCalledWith(7, 2, { origine: 'evocazione dal Registro' });
    expect(await screen.findByText('Pixie: in scorta')).toBeInTheDocument();
    const esegui = screen.getByRole('button', { name: 'Esegui anello 1' });
    expect(esegui).toBeEnabled();
    fireEvent.click(esegui);
    expect(screen.getByText('Modale fusione 11+12')).toBeInTheDocument();
    avanzaCiclo.mockResolvedValue(ciclo({ anelloCorrente: 1, iterazioni: 0, avanzamento: { ingredientePossedutaId: 13, partnerPossedutaId: null, partnerRegistrato: true, eseguibile: false } }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Conferma fusione' })); });
    expect(avanzaCiclo).toHaveBeenCalledWith(7, 5);
    expect(await screen.findByText('Anello corrente: 2 di 2')).toBeInTheDocument();
    expect(screen.getByText('Agathion: in scorta')).toBeInTheDocument();
  });

  it('senza cicli mostra lo stato vuoto con il collegamento alla vista dei cicli', async () => {
    getPossedute.mockResolvedValue([]);
    getCicliSalvati.mockResolvedValue([]);
    render(<MemoryRouter><CicliSalvati partitaId={7} /></MemoryRouter>);
    expect(await screen.findByText('Nessun ciclo salvato')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vai ai cicli di fusione' })).toHaveAttribute('href', '/fusione?vista=cicli');
  });
});
