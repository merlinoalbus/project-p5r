// @vitest-environment jsdom
// ============================================================
// Test PianiFusione — opzioni, chiamata API, albero con modi e costi, stato vuoto
// ============================================================

import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PianiFusione } from './PianiFusione';
import type { PersonaFusioneDto, PersonaRiassuntoDto, PianiFusioneDto } from '../../types';

const { getPianiFusione, getImmagini } = vi.hoisted(() => ({ getPianiFusione: vi.fn(), getImmagini: vi.fn() }));
vi.mock('../../services/api', () => ({
  getPianiFusione, getImmagini,
  caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

function persona(id: number, nome: string, arcana: string, livello: number): PersonaRiassuntoDto {
  return {
    id, nome, nomeIt: nome, arcana, arcanaNome: arcana, livello, eredita: null, ereditaNome: null, speciale: false, rara: false, dlc: false, richiedeConfidenteMax: false,
    tratto: '', statistiche: { forza: 1, magia: 1, resistenza: 1, agilita: 1, fortuna: 1 }, affinita: [],
  };
}
const fus = (p: PersonaRiassuntoDto): PersonaFusioneDto => ({ id: p.id, nome: p.nome, nomeIt: p.nomeIt, arcana: p.arcana, arcanaNome: p.arcanaNome, livello: p.livello, speciale: false, rara: false, dlc: false });
const jack = persona(88, 'Jack Frost', 'Mago', 11);
const succube = persona(10, 'Succube', 'Diavolo', 7);
const saki = persona(11, 'Saki Mitama', 'Amanti', 6);

beforeEach(() => {
  getPianiFusione.mockReset(); getImmagini.mockReset();
  getImmagini.mockResolvedValue([]);
});

describe('PianiFusione', () => {
  it('chiama l\'API con le opzioni e disegna l\'albero con modi, costi e conteggi', async () => {
    const dati: PianiFusioneDto = {
      persona: fus(jack), opzioni: { profondita: 3, alternative: 3, catture: true, livelloMax: 20 }, disponibilita: { scorta: 1, registro: 1 },
      piani: [{
        costo: 3956, profondita: 1, catture: 0, evocazioni: 1, fusioni: 1,
        radice: { persona: fus(jack), modo: 'fusione', tipo: 'normale', costo: 3956, figli: [
          { persona: fus(succube), modo: 'scorta', costo: 0, figli: [] },
          { persona: fus(saki), modo: 'registro', costo: 3956, figli: [] },
        ] },
      }],
    };
    getPianiFusione.mockResolvedValue(dati);
    render(<MemoryRouter><PianiFusione persone={[jack, succube, saki]} partitaId={7} livelloProtagonista={20} inizialeId={88} /></MemoryRouter>);
    expect(await screen.findByText('Piano 1')).toBeInTheDocument();
    expect(getPianiFusione).toHaveBeenCalledWith(88, { partita: 7, profondita: 3, alternative: 3, catture: true, limitaLivello: true });
    expect(screen.getByText(/1 fusione · profondità 1 · 1 dal Registro/)).toBeInTheDocument();
    expect(screen.getByText('In scorta')).toBeInTheDocument();
    expect(screen.getByText(/Dal Registro · 3\D?956 ¥/)).toBeInTheDocument();
    expect(screen.getByText('Fusione normale')).toBeInTheDocument();
    // cambio opzioni → nuova chiamata
    await act(async () => { screen.getByRole('button', { name: 'Ammetti catture' }).click(); });
    expect(getPianiFusione).toHaveBeenLastCalledWith(88, { partita: 7, profondita: 3, alternative: 3, catture: false, limitaLivello: true });
  });

  it('senza piani mostra il suggerimento; senza partita il limite di livello è disabilitato', async () => {
    getPianiFusione.mockResolvedValue({ persona: fus(jack), opzioni: { profondita: 3, alternative: 3, catture: false, livelloMax: null }, disponibilita: { scorta: 0, registro: 0 }, piani: [] } satisfies PianiFusioneDto);
    render(<MemoryRouter><PianiFusione persone={[jack]} partitaId={null} livelloProtagonista={null} inizialeId={88} /></MemoryRouter>);
    expect(await screen.findByText(/Nessun piano trovato/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fino al livello/ })).toBeDisabled();
    expect(getPianiFusione).toHaveBeenCalledWith(88, { partita: undefined, profondita: 3, alternative: 3, catture: true, limitaLivello: false });
  });
});
