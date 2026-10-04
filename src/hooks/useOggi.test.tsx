// @vitest-environment jsdom
// ============================================================
// Test useOggi — gli aggiornamenti locali della giornata partono dai dati correnti (B3", verifica completa 2026-10-03)
// ============================================================
//
// Ogni aggiornamento della giornata arriva dopo un `await`: costruirlo dalla `g` del render in cui è partito cancellava un
// secondo gesto completato nel frattempo (una spunta persa, il giorno corrente o il meteo che riportavano indietro le azioni).

import { act, renderHook, waitFor } from '@testing-library/react';
import { useOggi } from './useOggi';
import { usePartitaStore } from '../stores/partitaStore';
import type { AzionePercorsoDto, PartitaDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../types';

const { getPercorsoIndice, getPercorsoGiorno, impostaGiornoCorrente, impostaMeteoGiorno, impostaFasciaGioco } = vi.hoisted(() => ({
  getPercorsoIndice: vi.fn(), getPercorsoGiorno: vi.fn(), impostaGiornoCorrente: vi.fn(), impostaMeteoGiorno: vi.fn(), impostaFasciaGioco: vi.fn(),
}));
vi.mock('../services/api', (vero) => moduloApi(vero, { getPercorsoIndice, getPercorsoGiorno, impostaGiornoCorrente, impostaMeteoGiorno, impostaFasciaGioco }));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero));
vi.mock('../stores/suggerimentiStore', () => ({ useSuggerimentiStore: { getState: () => ({ invalida: vi.fn() }) } }));

const azione = (n: number): AzionePercorsoDto => ({ uid: String(n).padStart(32, '0'), giorno: '04-12', genere: 'azione', fascia: 'giorno', azione: `Azione ${n}`, tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: null, produce: [], produceTesto: [], fatta: false, effetti: null, stato: null, mappa: null } as AzionePercorsoDto);
const indice = { giorni: [{ giorno: '04-12', giornoSettimana: 'mar', fase: '', meteo: null, azioni: 2, fatte: 0, avvisi: 0, coperto: true }], dataCorrente: '04-11', totaleGiorni: 1, giorniCoperti: 1 } as PercorsoIndiceDto;
const giorno = { giorno: '04-12', giornoSettimana: 'mar', fase: '', trama: '', vincoli: [], meteo: null, azioni: [azione(0), azione(1)], avvisi: [], fonte: '', coperto: true, precedente: null, successivo: null, dataCorrente: '04-11', fatte: 0, meteoPartita: null } as PercorsoGiornoDto;
const partita = { id: 4, nome: 'Prova', dataGioco: '04-12' } as PartitaDto;

beforeEach(() => {
  usePartitaStore.setState({ attiva: { id: 4, nome: 'Prova', dataGioco: '04-11' } as PartitaDto });
  getPercorsoIndice.mockReset().mockResolvedValue({ ...indice, dataCorrente: '04-12' });
  getPercorsoGiorno.mockReset().mockResolvedValue(giorno);
});

async function apri() {
  const h = renderHook(() => useOggi(4));
  await waitFor(() => expect(h.result.current.giorno).not.toBeNull());
  return h;
}

describe('useOggi — due gesti ravvicinati (B3")', () => {
  it('due spunte partite dallo stesso render: la seconda non cancella la prima', async () => {
    const { result } = await apri();
    // entrambe le righe hanno preso `aggiornaAzione` dallo stesso render, prima che le risposte arrivassero
    const aggiorna = result.current.aggiornaAzione;
    // `act` asincrono: ogni spunta rilegge anche l'indice, e la rilettura deve finire dentro `act`
    await act(async () => { aggiorna({ ...azione(0), fatta: true }); });
    await act(async () => { aggiorna({ ...azione(1), fatta: true }); });
    expect(result.current.giorno?.azioni.map((a) => a.fatta)).toEqual([true, true]);
    expect(result.current.giorno?.fatte).toBe(2);
  });

  it('una spunta fatta mentre si segna il giorno corrente resta', async () => {
    const { result } = await apri();
    let rispondi!: (v: { dataCorrente: string; partita: PartitaDto }) => void;
    impostaGiornoCorrente.mockImplementation(() => new Promise((ok) => { rispondi = ok; }));
    let corrente!: Promise<void>;
    await act(async () => { corrente = result.current.segnaCorrente(); }); // in volo
    await act(async () => { result.current.aggiornaAzione({ ...azione(0), fatta: true }); }); // arriva subito
    await act(async () => { rispondi({ dataCorrente: '04-12', partita }); await corrente; });
    expect(result.current.giorno?.dataCorrente).toBe('04-12');
    expect(result.current.giorno?.azioni[0].fatta).toBe(true);
    expect(result.current.giorno?.fatte).toBe(1);
  });

  it('una spunta fatta mentre si segna il meteo resta (prima della rilettura)', async () => {
    const { result } = await apri();
    let rispondi!: (v: { meteo: unknown; partita: PartitaDto }) => void;
    impostaMeteoGiorno.mockImplementation(() => new Promise((ok) => { rispondi = ok; }));
    let meteo!: Promise<void>;
    await act(async () => { meteo = result.current.impostaMeteo('giorno', 'pioggia' as never); }); // in volo
    await act(async () => { result.current.aggiornaAzione({ ...azione(0), fatta: true }); }); // arriva subito
    // la rilettura che segue il meteo resta in sospeso: si guarda l'aggiornamento locale da solo
    getPercorsoGiorno.mockImplementation(() => new Promise(() => {}));
    await act(async () => { rispondi({ meteo: { giorno: 'pioggia', sera: null }, partita: { ...partita, dataGioco: '04-11' } }); await Promise.resolve(); });
    expect(result.current.giorno?.meteoPartita).toEqual({ giorno: 'pioggia', sera: null });
    expect(result.current.giorno?.azioni[0].fatta).toBe(true);
    void meteo;
  });
});
