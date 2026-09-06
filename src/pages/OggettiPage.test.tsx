/** @vitest-environment jsdom */
/* Regressione sulla pagina Oggetti vera, non su un componente montato da solo.
 *
 * Il difetto che questa prova sorveglia era invisibile: il comando «Sulla mappa» c'era, il testo
 * era giusto, il click portava da qualche parte — sull'elenco dei negozi invece che sulla mappa.
 * Un test sul solo `CollegamentoMappa` lo intercetta, ma lascia scoperta la catena che sta prima:
 * l'API deve arricchire la riga con la chiave `articolo` (o con i `negozi`), la tabella deve
 * agganciarla alla riga giusta, e il comando deve comparire lì.
 *
 * Tre cose vanno controllate insieme, perché ognuna si può rompere da sola:
 *
 * 1. una chiave di articolo contiene una barra (`negozio/articolo`) e deve arrivare intera al
 *    risolutore, non spezzata in due segmenti di percorso;
 * 2. un oggetto venduto in più negozi non ha una chiave articolo ma una lista: deve ottenere un
 *    comando per ciascun posto, non uno solo;
 * 3. una delle quattro voci senza posizione — `Soma`, del negozio dentro il Palazzo di Niijima —
 *    deve comunque avere il suo comando, che porta al risolutore: è lì che si dice che una
 *    posizione non c'è, e toglierlo lascerebbe l'utente senza risposta invece che con una.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OggettiPage } from './OggettiPage';
import type { OggettiGuidaDto } from '../types';

const { getOggettiGuida } = vi.hoisted(() => ({ getOggettiGuida: vi.fn() }));
vi.mock('../services/api', () => ({ getOggettiGuida }));

const vuoto = {
  consumabili: [], chiaveEMateriali: [], scambi: [],
  fabbricazione: { introduzione: '', sblocco: '', regole: [], fonte: '', ricette: [] },
  personalizzazioneArmi: { introduzione: '', requisiti: '', costi: '', effetti: [], progressioneConfidente: [], note: null, fonte: '' },
  abiti: { introduzione: '', elenco: [], lavanderia: { dove: '', costo: '', regole: [], fonte: '' } },
} as unknown as OggettiGuidaDto;

const dati = {
  ...vuoto,
  consumabili: [
    { nome: 'Kogatana nera', nomeEn: null, categoria: 'battaglia', effetto: 'Trasmutazione',
      dove: 'Yumenoshima', prezzo: 1000, fonte: '', verificato: true,
      articolo: 'yumenoshima/kogatana-nera' },
    { nome: 'Soma', nomeEn: null, categoria: 'cura', effetto: 'Ripristina tutto',
      dove: 'Palazzo di Niijima', prezzo: null, fonte: '', verificato: true,
      articolo: 'negozio-palazzo-niijima/soma' },
    { nome: 'Bevanda energetica', nomeEn: null, categoria: 'cura', effetto: 'Ripristina HP',
      dove: 'più distributori', prezzo: 100, fonte: '', verificato: true,
      negozi: ['distributore-akihabara-5', 'distributore-shibuya-sottopasso'] },
  ],
} as unknown as OggettiGuidaDto;

function monta() {
  return render(<MemoryRouter><OggettiPage /></MemoryRouter>);
}

beforeEach(() => { getOggettiGuida.mockReset(); getOggettiGuida.mockResolvedValue(dati); });

async function riga(nome: string) {
  const cella = await screen.findByText(nome);
  const tr = cella.closest('tr');
  if (!tr) throw new Error(`riga non trovata per ${nome}`);
  return within(tr);
}

it('porta al risolutore con la chiave dell’articolo intera, barra compresa', async () => {
  monta();
  const r = await riga('Kogatana nera');
  expect(r.getByRole('link', { name: /Sulla mappa/ }))
    .toHaveAttribute('href', '/guida/mondo/articolo/yumenoshima%2Fkogatana-nera');
});

it('dà un comando per ogni negozio quando l’oggetto si vende in più posti', async () => {
  monta();
  const r = await riga('Bevanda energetica');
  const indirizzi = r.getAllByRole('link', { name: /Sulla mappa/ }).map((a) => a.getAttribute('href'));
  expect(indirizzi).toEqual([
    '/guida/mondo/negozio/distributore-akihabara-5',
    '/guida/mondo/negozio/distributore-shibuya-sottopasso',
  ]);
});

it('tiene il comando anche per una voce senza posizione, che è dove le si dice perché', async () => {
  monta();
  const r = await riga('Soma');
  expect(r.getByRole('link', { name: /Sulla mappa/ }))
    .toHaveAttribute('href', '/guida/mondo/articolo/negozio-palazzo-niijima%2Fsoma');
});

it('senza chiave e senza negozi non promette una mappa che non c’è', async () => {
  getOggettiGuida.mockResolvedValue({
    ...vuoto,
    consumabili: [{ nome: 'Oggetto orfano', nomeEn: null, categoria: 'altro', effetto: '—',
      dove: 'ignoto', prezzo: null, fonte: '', verificato: true }],
  } as unknown as OggettiGuidaDto);
  monta();
  const r = await riga('Oggetto orfano');
  expect(r.queryByRole('link', { name: /Sulla mappa/ })).toBeNull();
});
