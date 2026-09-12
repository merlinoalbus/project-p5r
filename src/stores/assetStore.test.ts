// @vitest-environment jsdom
// ============================================================
// Test assetStore — un solo manifest da public/asset e dal database; a parità di chiave vince il database
// ============================================================

import { useAssetStore } from './assetStore';

const { getManifestoImmagini } = vi.hoisted(() => ({ getManifestoImmagini: vi.fn() }));
vi.mock('../services/api', () => ({ getManifestoImmagini }));

beforeEach(() => {
  getManifestoImmagini.mockReset();
  useAssetStore.setState({ manifest: null, caricato: false, mancanti: {} });
});

it('unisce il manifest pubblico e quello del database (che vince a parità di chiave)', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ generato: 'T', totale: 2, file: { 'ui/nav-home': '/asset/ui/nav-home.png', 'mappe/tokyo': '/asset/mappe/tokyo.png' } }), { status: 200 })));
  getManifestoImmagini.mockResolvedValue({ generato: 'D', totale: 2, file: { 'mappe/tokyo': '/api/immagini/mappe/tokyo/file?v=1', 'sfondi/mementos': '/api/immagini/sfondi/mementos/file?v=1' } });
  await useAssetStore.getState().carica();
  const m = useAssetStore.getState().manifest!;
  expect(m.totale).toBe(3);
  expect(m.file).toEqual({ 'ui/nav-home': '/asset/ui/nav-home.png', 'mappe/tokyo': '/api/immagini/mappe/tokyo/file?v=1', 'sfondi/mementos': '/api/immagini/sfondi/mementos/file?v=1' });
  expect(useAssetStore.getState().caricato).toBe(true);
  vi.unstubAllGlobals();
});

it('se una sorgente fallisce resta l’altra; senza nessuna il manifest è vuoto ma caricato', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
  getManifestoImmagini.mockResolvedValue({ generato: 'D', totale: 1, file: { 'mappe/tokyo': '/api/immagini/mappe/tokyo/file?v=1' } });
  await useAssetStore.getState().carica();
  expect(useAssetStore.getState().manifest!.file).toEqual({ 'mappe/tokyo': '/api/immagini/mappe/tokyo/file?v=1' });
  getManifestoImmagini.mockRejectedValue(new Error('server spento'));
  await useAssetStore.getState().carica();
  expect(useAssetStore.getState().manifest).toEqual({ generato: '', totale: 0, file: {} });
  expect(useAssetStore.getState().caricato).toBe(true);
  vi.unstubAllGlobals();
});
