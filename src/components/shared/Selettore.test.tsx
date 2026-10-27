/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test Selettore — l'elenco chiuso di tutta l'app: soglia della ricerca, voce vuota, gruppi, tastiera
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Selettore, type OpzioneSelettore } from './Selettore';
import { scegliVoce, valoreSelettore, vociSelettore } from '../../../test/selettore';

const poche: OpzioneSelettore[] = [{ chiave: 'a', nome: 'Alfa' }, { chiave: 'b', nome: 'Beta' }, { chiave: 'c', nome: 'Gamma' }];
const molte: OpzioneSelettore[] = Array.from({ length: 12 }, (_, i) => ({ chiave: `v${i}`, nome: `Voce ${i}`, gruppo: i < 6 ? 'Prime' : 'Seconde' }));

/** Il selettore «Scelta» dentro uno stato vero (vuoto all'inizio): ogni scelta aggiorna il valore mostrato e la si inoltra a `onCambia`. */
function Prova({ opzioni, vuoto, ricerca, onCambia }: { opzioni: OpzioneSelettore[]; vuoto?: string; ricerca?: 'auto' | 'sempre' | 'mai'; onCambia?: (k: string) => void }) {
  const [v, setV] = useState('');
  return <Selettore etichetta="Scelta" valore={v} opzioni={opzioni} vuoto={vuoto} ricerca={ricerca} onCambia={(k) => { setV(k); onCambia?.(k); }} />;
}

describe('Selettore', () => {
  it('è un combobox che apre un listbox e sceglie la voce toccata', () => {
    const onCambia = vi.fn();
    render(<Prova opzioni={poche} onCambia={onCambia} />);
    expect(valoreSelettore('Scelta')).toBe('Scegli…');
    scegliVoce('Scelta', 'Beta');
    expect(onCambia).toHaveBeenCalledWith('b');
    expect(valoreSelettore('Scelta')).toBe('Beta');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('sotto le dieci voci non mostra il campo di ricerca; da dieci in su sì, e filtra', () => {
    const { unmount } = render(<Prova opzioni={poche} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmount();
    render(<Prova opzioni={molte} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    const campo = screen.getByRole('searchbox', { name: 'Cerca Scelta' });
    fireEvent.change(campo, { target: { value: 'voce 1' } });
    const nomi = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
    expect(nomi).toEqual(['Voce 1', 'Voce 10', 'Voce 11']);
  });

  it('con «ricerca: mai» il campo non compare nemmeno con molte voci; con «sempre» compare anche con poche', () => {
    const { unmount } = render(<Prova opzioni={molte} ricerca="mai" />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmount();
    render(<Prova opzioni={poche} ricerca="sempre" />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('la voce vuota sta in testa, ha chiave vuota e si conta nella soglia', () => {
    const onCambia = vi.fn();
    render(<Prova opzioni={poche} vuoto="Tutte" onCambia={onCambia} />);
    expect(valoreSelettore('Scelta')).toBe('Tutte');
    expect(vociSelettore('Scelta')).toEqual(['Tutte', 'Alfa', 'Beta', 'Gamma']);
    scegliVoce('Scelta', 'Gamma');
    scegliVoce('Scelta', 'Tutte');
    expect(onCambia).toHaveBeenLastCalledWith('');
  });

  it('le intestazioni di gruppo compaiono dove il gruppo cambia', () => {
    render(<Prova opzioni={molte} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    const intestazioni = [...screen.getByRole('listbox').querySelectorAll('.selettore__gruppo')].map((e) => e.textContent);
    expect(intestazioni).toEqual(['Prime', 'Seconde']);
  });

  it('da tastiera: frecce ed Invio scelgono, Esc chiude', () => {
    const onCambia = vi.fn();
    render(<Prova opzioni={poche} onCambia={onCambia} />);
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    fireEvent.keyDown(pulsante, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(pulsante, { key: 'ArrowDown' });
    fireEvent.keyDown(pulsante, { key: 'Enter' });
    expect(onCambia).toHaveBeenCalledWith('b');
    fireEvent.click(pulsante);
    fireEvent.keyDown(pulsante, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('con il campo di ricerca attivo: frecce ed Invio scelgono fra le voci filtrate, Esc chiude e riporta il focus al pulsante', () => {
    const onCambia = vi.fn();
    render(<Prova opzioni={molte} onCambia={onCambia} />);
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    fireEvent.click(pulsante);
    const campo = screen.getByRole('searchbox', { name: 'Cerca Scelta' });
    fireEvent.change(campo, { target: { value: 'voce 1' } });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onCambia).toHaveBeenCalledWith('v10');
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(pulsante);
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(pulsante);
    fireEvent.click(pulsante);
    fireEvent.keyDown(pulsante, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('un tocco fuori chiude la tendina', () => {
    render(<Prova opzioni={poche} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('oltre le duecento voci mostra le prime duecento e chiede di scrivere; il filtro toglie l’avviso', () => {
    const tante = Array.from({ length: 250 }, (_, i) => ({ chiave: `k${i}`, nome: `Nome ${i}` }));
    render(<Prova opzioni={tante} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Scelta' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(200);
    expect(screen.getByText('Scrivi qualche lettera in più per restringere.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nome 24' } });
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(11);
    expect(screen.queryByText('Scrivi qualche lettera in più per restringere.')).toBeNull();
  });

  it('la variante compatta non mostra l’etichetta nel pulsante ma la conserva per chi legge', () => {
    render(<Selettore compatto etichetta="Categoria" valore="" vuoto="Tutte" opzioni={poche} onCambia={() => {}} />);
    const pulsante = screen.getByRole('combobox', { name: 'Categoria: Tutte' });
    expect(pulsante.querySelector('.selettore__etichetta')).toBeNull();
    expect(pulsante.closest('.selettore')).toHaveClass('selettore--compatto');
    expect(valoreSelettore('Categoria')).toBe('Tutte');
  });

  /** Rettangolo finto (DOMRect) con i bordi dati. */
  const rettangolo = (left: number, top: number, width: number, height: number): DOMRect =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
  /** Schermo finto della prova (jsdom non dispone la pagina: `clientWidth`/`clientHeight` valgono 0 e il componente usa questi). */
  const schermo = (larghezza: number, altezza: number) => {
    Object.defineProperty(window, 'innerWidth', { value: larghezza, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: altezza, configurable: true });
  };
  const larghezzaOriginale = window.innerWidth;
  const altezzaOriginale = window.innerHeight;
  const altezzaElementi = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  afterEach(() => {
    schermo(larghezzaOriginale, altezzaOriginale);
    if (altezzaElementi) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', altezzaElementi);
  });

  it('la tendina si allinea al pulsante e, quando a destra non c’è spazio, al suo bordo destro: mai fuori dallo schermo', () => {
    schermo(1000, 768);
    render(<Selettore compatto etichetta="Partita attiva" valore="" opzioni={poche} onCambia={() => {}} />);
    const pulsante = screen.getByRole('combobox', { name: 'Partita attiva: Scegli…' });
    const tendina = () => document.querySelector<HTMLElement>('.selettore__tendina')!;
    // pulsante 80×44 a 900 px: la tendina (260 px) sporgerebbe oltre 992; si appoggia al bordo destro del pulsante (980 − 260)
    pulsante.getBoundingClientRect = () => rettangolo(900, 0, 80, 44);
    fireEvent.click(pulsante);
    expect(tendina().style.left).toBe('720px');
    expect(tendina().style.width).toBe('260px');
    expect(tendina().style.top).toBe('46px');
    fireEvent.click(pulsante);
    pulsante.getBoundingClientRect = () => rettangolo(10, 0, 80, 44);
    fireEvent.click(pulsante);
    expect(tendina().style.left).toBe('10px');
  });

  it('se sotto il pulsante non c’è spazio la tendina si apre sopra, attaccata al pulsante; altrimenti l’elenco si accorcia quanto serve', () => {
    schermo(1000, 768);
    // tendina naturale alta 400 px, di cui 350 di elenco
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) { return this.classList.contains('selettore__tendina') ? 400 : this.classList.contains('selettore__elenco') ? 350 : 0; },
    });
    render(<Selettore etichetta="Scelta" valore="" opzioni={poche} onCambia={() => {}} />);
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    const tendina = () => document.querySelector<HTMLElement>('.selettore__tendina')!;
    const elenco = () => document.querySelector<HTMLElement>('.selettore__elenco')!;
    // in fondo allo schermo (700–744): sotto restano 14 px, sopra 690 → sopra, ancorata col bordo inferiore a 2 px dal pulsante (768 − 700 + 2)
    pulsante.getBoundingClientRect = () => rettangolo(10, 700, 300, 44);
    fireEvent.click(pulsante);
    expect(tendina().style.top).toBe('auto');
    expect(tendina().style.bottom).toBe('70px');
    expect(elenco().style.maxHeight).toBe('');
    fireEvent.click(pulsante);
    // a metà (356–400): sotto 358, sopra 346 → sotto, e l'elenco perde i 42 px che non ci stanno (350 − 42)
    pulsante.getBoundingClientRect = () => rettangolo(10, 356, 300, 44);
    fireEvent.click(pulsante);
    expect(tendina().style.top).toBe('402px');
    expect(tendina().style.bottom).toBe('auto');
    expect(elenco().style.maxHeight).toBe('308px');
  });

  it('nel foglio di stile la tendina è fissa sopra il contenuto e nessuna variante la rimette nel flusso dei contenitori', () => {
    const css = readFileSync(join(__dirname, '../../tailwind.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.selettore__tendina \{ position:fixed;/);
    expect(css).not.toMatch(/selettore__tendina[^{]*\{[^}]*position:\s*(static|absolute|relative)/);
  });

  it('in una finestra il primo Esc chiude la tendina e lascia aperta la finestra; il secondo chiude la finestra', () => {
    const onChiudi = vi.fn();
    render(<Modal titolo="Infiltrazioni della voce" aperta onChiudi={onChiudi}><Selettore etichetta="Scelta" valore="" opzioni={poche} onCambia={() => {}} /></Modal>);
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    fireEvent.click(pulsante);
    fireEvent.keyDown(pulsante, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChiudi).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(pulsante);
    fireEvent.keyDown(pulsante, { key: 'Escape' });
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it('disabilitato non si apre', () => {
    render(<Selettore etichetta="Scelta" valore="" opzioni={poche} onCambia={() => {}} disabilitato />);
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    expect(pulsante).toBeDisabled();
  });

  // LAY3-7 (decisione del PM, strada (b)): nel selettore compatto il valore chiuso può accorciarsi coi puntini, ma il nome intero si legge
  // con un tocco — nell'elenco aperto, scelto compreso, nessun nome è accorciato — e sta nel nome accessibile del pulsante
  it('compatto con `valoreNelNome`: il valore intero nel nome del pulsante; l’elenco aperto non accorcia nessun nome (LAY3-7)', () => {
    const lunghi: OpzioneSelettore[] = [{ chiave: 'p', nome: '1. Passaggio Centrale / Sala d’Ingresso' }, { chiave: 's', nome: '2. Sala delle udienze di prima e seconda visita' }];
    render(<Selettore compatto valoreNelNome etichetta="Infiltrazione 1 di 2" valore="p" opzioni={lunghi} onCambia={() => {}} />);
    const pulsante = screen.getByRole('combobox', { name: 'Infiltrazione 1 di 2: 1. Passaggio Centrale / Sala d’Ingresso' });
    fireEvent.click(pulsante);
    const elenco = screen.getByRole('listbox');
    const voci = within(elenco).getAllByRole('option');
    expect(voci.map((v) => v.textContent)).toEqual(lunghi.map((o) => o.nome));
    // nessuno stile che accorci un nome nell'elenco aperto, nemmeno sulla voce scelta
    for (const el of elenco.querySelectorAll('*')) expect(el.className.toString()).not.toMatch(/truncate|line-clamp|text-ellipsis/);
    expect(within(elenco).getByRole('option', { selected: true })).toHaveTextContent('1. Passaggio Centrale / Sala d’Ingresso');
  });

  it('compatto anche senza `valoreNelNome`: il valore sta nel nome (l’etichetta non è visibile); non compatto: nella descrizione', () => {
    const { unmount } = render(<Selettore compatto etichetta="Scelta" valore="a" opzioni={poche} onCambia={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Scelta: Alfa' })).toBeInTheDocument();
    unmount();
    render(<Selettore etichetta="Scelta" valore="a" opzioni={poche} onCambia={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Scelta', description: 'Alfa' })).toBeInTheDocument();
  });
});
