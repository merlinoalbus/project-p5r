// ============================================================
// Test immaginiCache — un elenco fallito non resta in cache come «nessuna immagine» (A6, verifica 2026-10-03)
// ============================================================

const getImmagini = vi.hoisted(() => vi.fn());
vi.mock('../../services/api', () => ({ getImmagini, urlImmagine: (a: string, c: string) => `/api/immagini/${a}/${c}/file` }));

import { azzeraCacheImmagini, chiaviPresenti } from './immaginiCache';

beforeEach(() => { getImmagini.mockReset(); azzeraCacheImmagini(); });

describe('immaginiCache', () => {
  it('dopo un errore il riquadro montato dopo richiede di nuovo l\'elenco e vede le immagini', async () => {
    getImmagini.mockRejectedValueOnce(new TypeError('rete giù')).mockResolvedValueOnce([{ chiave: 'sojiro', createdAt: '2026-10-03' }]);
    expect([...await chiaviPresenti('confidenti')]).toEqual([]);
    expect([...await chiaviPresenti('confidenti')]).toEqual(['sojiro']);
    expect(getImmagini).toHaveBeenCalledTimes(2);
  });

  it('un elenco riuscito resta in cache: una sola richiesta per ambito', async () => {
    getImmagini.mockResolvedValue([{ chiave: 'ann', createdAt: 'x' }]);
    await chiaviPresenti('confidenti');
    await chiaviPresenti('confidenti');
    expect(getImmagini).toHaveBeenCalledTimes(1);
  });

  it('un errore arrivato dopo un azzeramento non toglie la richiesta più nuova già registrata', async () => {
    let rifiuta!: (e: Error) => void;
    getImmagini.mockImplementationOnce(() => new Promise((_ok, ko) => { rifiuta = ko; })).mockResolvedValue([{ chiave: 'nuova', createdAt: 'x' }]);
    const vecchia = chiaviPresenti('mappe');
    azzeraCacheImmagini('mappe');
    const nuova = chiaviPresenti('mappe');
    rifiuta(new Error('tardi'));
    await vecchia;
    expect([...await nuova]).toEqual(['nuova']);
    await chiaviPresenti('mappe');
    expect(getImmagini).toHaveBeenCalledTimes(2);
  });
});
