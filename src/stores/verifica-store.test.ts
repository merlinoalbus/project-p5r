// ============================================================
// Test della verifica completa (2026-10-03), store: B4" suggerimenti fuori ordine, B10" suggerimenti di un'altra partita,
// B5" elenco delle partite fuori ordine. Le risposte si risolvono a mano, nell'ordine sbagliato.
// ============================================================

const attese = vi.hoisted(() => ({ suggerimenti: [] as Array<(v: unknown) => void>, partite: [] as Array<(v: unknown) => void> }));

vi.mock('../services/api', (vero) => moduloApi(vero, {
  getSuggerimenti: () => new Promise((ok) => attese.suggerimenti.push(ok)),
  getPartite: () => new Promise((ok) => attese.partite.push(ok)),
  attivaPartita: vi.fn(), creaPartita: vi.fn(), eliminaPartita: vi.fn(),
}));

import { useSuggerimentiStore } from './suggerimentiStore';
import { usePartitaStore } from './partitaStore';

const sugg = (giorno: string) => ({ giorno, motivi: [] }) as unknown;
const partita = (id: number, livello: number) => ({ id, nome: `P${id}`, attiva: true, livelloProtagonista: livello }) as unknown;

beforeEach(() => {
  attese.suggerimenti = [];
  attese.partite = [];
  useSuggerimentiStore.setState({ partitaId: null, dati: null, caricamento: false });
  usePartitaStore.setState({ partite: [], attiva: null, caricamento: false, caricata: false, errore: null });
});

describe('suggerimentiStore', () => {
  it('B4": dopo un invalida, la risposta vecchia arrivata dopo quella nuova non rimette i suggerimenti superati', async () => {
    const primo = useSuggerimentiStore.getState().carica(1);
    useSuggerimentiStore.getState().invalida();
    expect(attese.suggerimenti).toHaveLength(2);
    attese.suggerimenti[1](sugg('04-13')); // la nuova arriva prima
    await Promise.resolve(); await Promise.resolve();
    attese.suggerimenti[0](sugg('04-12')); // la vecchia arriva dopo
    await primo;
    expect((useSuggerimentiStore.getState().dati as { giorno: string }).giorno).toBe('04-13');
    expect(useSuggerimentiStore.getState().caricamento).toBe(false);
  });

  it('B10": cambiando partita i suggerimenti della precedente spariscono subito', async () => {
    const p = useSuggerimentiStore.getState().carica(1);
    attese.suggerimenti[0](sugg('04-12'));
    await p;
    expect(useSuggerimentiStore.getState().dati).not.toBeNull();
    void useSuggerimentiStore.getState().carica(2);
    expect(useSuggerimentiStore.getState().dati).toBeNull();
    expect(useSuggerimentiStore.getState().partitaId).toBe(2);
  });
});

describe('partitaStore', () => {
  it('B5": una lettura vecchia dell\'elenco arrivata dopo una nuova non riporta indietro la partita attiva', async () => {
    const vecchia = usePartitaStore.getState().carica();
    const nuova = usePartitaStore.getState().carica();
    attese.partite[1]([partita(1, 12)]);
    await nuova;
    attese.partite[0]([partita(1, 11)]);
    await vecchia;
    expect((usePartitaStore.getState().attiva as { livelloProtagonista: number }).livelloProtagonista).toBe(12);
    expect(usePartitaStore.getState().caricamento).toBe(false);
  });
});
