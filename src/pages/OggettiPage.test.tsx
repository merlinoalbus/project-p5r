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
import { fireEvent, render, screen, within } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter } from 'react-router-dom';
import { OggettiPage } from './OggettiPage';
import type { OggettiGuidaDto } from '../types';
import { useAssetStore } from '../stores/assetStore';
import { usePreferenzeStore } from '../stores/preferenzeStore';

const { getOggettiGuida, getOggetti } = vi.hoisted(() => ({ getOggettiGuida: vi.fn(), getOggetti: vi.fn() }));
vi.mock('../services/api', () => ({ getOggettiGuida, getOggetti }));

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

const equipaggiamento = [
  { id: 1, nome: 'Paradise Lost', nomeIt: 'Paradiso perduto', categoria: 'Weapon', categoriaNome: 'Arma da mischia',
    vincolo: 'Joker', vincoloNome: 'Solo Joker', descrizione: 'High attack', descrizioneNome: 'Attacco altissimo' },
  { id: 2, nome: 'Aid Charm', nomeIt: 'Portaf. del supporto', categoria: 'Accessory', categoriaNome: 'Accessorio',
    vincolo: null, vincoloNome: null, descrizione: '+Dia', descrizioneNome: '+Dia (cura piccola a un alleato)' },
  { id: 3, nome: 'Archangel Bra', nomeIt: 'Reggiseno arcangelo', categoria: 'Protector', categoriaNome: 'Protezione',
    vincolo: 'Women', vincoloNome: 'Solo donne', descrizione: 'Defense up', descrizioneNome: 'Difesa alta' },
];

/** I ritratti della squadra nel manifest, altrimenti `AssetImg` ripiega sulle iniziali e non c'è
 *  nessuna immagine da interrogare per sapere *chi* può usare un pezzo. */
const SQUADRA_ASSET = ['personaggi/joker', 'confidenti/morgana', 'confidenti/ryuji', 'confidenti/ann', 'confidenti/yusuke',
  'confidenti/makoto', 'confidenti/futaba', 'confidenti/haru', 'confidenti/akechi', 'confidenti/kasumi'];

beforeEach(() => {
  getOggettiGuida.mockReset(); getOggettiGuida.mockResolvedValue(dati);
  getOggetti.mockReset(); getOggetti.mockResolvedValue(equipaggiamento);
  usePreferenzeStore.setState({ graficaPredefinita: true });
  useAssetStore.setState({ caricato: true, mancanti: {}, manifest: { generato: 'T', totale: SQUADRA_ASSET.length, file: Object.fromEntries(SQUADRA_ASSET.map((k) => [k, `/asset/${k}.png`])) } });
});

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

/* La scheda «Equipaggiamento»: 223 pezzi che l'app aveva già tradotti e non mostrava a nessuno.
 *
 * Qui si sorveglia la catena intera: la scheda chiama `/compendio/oggetti` (che nessuna pagina
 * chiamava), i filtri restringono davvero, e il vincolo diventa i volti di chi può indossarlo —
 * compreso il caso «Solo donne», che i ritratti non riconoscevano perché la guida dice
 * «personaggi femminili» e il vincolo dice «donne». */
describe('scheda Equipaggiamento', () => {
  async function apri() {
    monta();
    fireEvent.click(await screen.findByRole('tab', { name: 'Equipaggiamento' }));
    return screen.findByText('Paradiso perduto');
  }

  it('mostra i pezzi con nome italiano, originale ed effetto', async () => {
    await apri();
    expect(getOggetti).toHaveBeenCalledTimes(1);
    const r = await riga('Paradiso perduto');
    expect(r.getByText('(Paradise Lost)')).toBeInTheDocument();
    expect(r.getByText('Attacco altissimo')).toBeInTheDocument();
    expect(screen.getByText('3 pezzi su 3.')).toBeInTheDocument();
  });

  it('filtra per tipo e per chi lo può equipaggiare', async () => {
    await apri();
    scegliVoce('Tipo', 'Accessorio');
    expect(screen.queryByText('Paradiso perduto')).toBeNull();
    expect(screen.getByText('Portaf. del supporto')).toBeInTheDocument();

    scegliVoce('Tipo', 'Tutti i tipi');
    scegliVoce('Per chi', 'Solo donne');
    expect(screen.getByText('Reggiseno arcangelo')).toBeInTheDocument();
    expect(screen.queryByText('Portaf. del supporto')).toBeNull();
    expect(screen.getByText('1 pezzi su 3.')).toBeInTheDocument();
  });

  it('il vincolo diventa i volti: uno per «Solo Joker», le cinque ragazze per «Solo donne», tutti se non c’è', async () => {
    await apri();
    const per = async (nome: string) => {
      const tr = (await screen.findByText(nome)).closest('tr')!;
      const cella = tr.querySelector('td[data-etichetta="Per"]')!;
      return [...cella.querySelectorAll('img')].map((i) => i.getAttribute('alt'));
    };
    expect(await per('Paradiso perduto')).toEqual(['Protagonista']);
    expect(await per('Reggiseno arcangelo')).toEqual(['Ann', 'Makoto', 'Futaba', 'Haru', 'Sumire/Kasumi']);
    // Senza vincolo si scrive «Tutti»: dieci volti ripetuti su 125 accessori non dicono niente e
    // riempivano la pagina di 1474 immagini.
    expect(await per('Portaf. del supporto')).toEqual([]);
    expect((await riga('Portaf. del supporto')).getByText('Tutti')).toBeInTheDocument();
  });
});
