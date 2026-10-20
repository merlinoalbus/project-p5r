/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test Selettore — l'elenco chiuso di tutta l'app: soglia della ricerca, voce vuota, gruppi, tastiera
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
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
    const pulsante = screen.getByRole('combobox', { name: 'Categoria' });
    expect(pulsante.querySelector('.selettore__etichetta')).toBeNull();
    expect(pulsante.closest('.selettore')).toHaveClass('selettore--compatto');
    expect(valoreSelettore('Categoria')).toBe('Tutte');
  });

  it('quando a destra non c’è spazio la tendina si appende al bordo destro del pulsante', () => {
    render(<Selettore compatto etichetta="Partita attiva" valore="" opzioni={poche} onCambia={() => {}} />);
    const pulsante = screen.getByRole('combobox', { name: 'Partita attiva' });
    const larghezzaOriginale = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    /** Rettangolo finto del pulsante (80×44 px) con il bordo sinistro alla coordinata data. */
    const rettangolo = (left: number): DOMRect => ({ left, top: 0, width: 80, height: 44, right: left + 80, bottom: 44, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
    pulsante.getBoundingClientRect = () => rettangolo(900);
    fireEvent.click(pulsante);
    expect(document.querySelector('.selettore__tendina')).toHaveClass('selettore__tendina--destra');
    fireEvent.click(pulsante);
    pulsante.getBoundingClientRect = () => rettangolo(10);
    fireEvent.click(pulsante);
    expect(document.querySelector('.selettore__tendina')).not.toHaveClass('selettore__tendina--destra');
    Object.defineProperty(window, 'innerWidth', { value: larghezzaOriginale, configurable: true });
  });

  it('in una finestra il corpo scorre quanto basta a mostrare la tendina, senza far uscire il pulsante dalla cima', () => {
    render(<div className="modal-body"><Selettore etichetta="Scelta" valore="" opzioni={poche} onCambia={() => {}} /></div>);
    const corpo = document.querySelector<HTMLElement>('.modal-body')!;
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    /** Rettangoli finti: il corpo va da 100 a 100 + altezza a schermo; pulsante e fondo della tendina dove li mette la prova. */
    let schermo = 300; let cimaPulsante = 0; let fondoTendina = 0;
    Object.defineProperty(corpo, 'offsetHeight', { value: 300, configurable: true });
    const rettangolo = (top: number, bottom: number): DOMRect => ({ left: 0, right: 100, top, bottom, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    const spia = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === corpo) return rettangolo(100, 100 + schermo);
      if (this === pulsante) return rettangolo(cimaPulsante, cimaPulsante + 44);
      if (this.classList.contains('selettore__tendina')) return rettangolo(cimaPulsante + 46, fondoTendina);
      return rettangolo(0, 0);
    });
    /** Apre la tendina partendo da `scrollTop` 0 e dice di quanto è sceso il corpo; poi la richiude. */
    const apri = (cima: number, fondo: number): number => {
      cimaPulsante = cima; fondoTendina = fondo; corpo.scrollTop = 0;
      fireEvent.click(pulsante);
      const sceso = corpo.scrollTop;
      fireEvent.click(pulsante);
      return sceso;
    };
    expect(apri(150, 380)).toBe(0); // ci sta: fermo
    expect(apri(300, 520)).toBe(120); // sporge di 120 sotto il fondo (400): scende di 120
    expect(apri(150, 600)).toBe(50); // sporge di 200, ma il pulsante è a 50 dalla cima: scende di 50 e il pulsante resta in vista
    schermo = 285; // finestra ancora in scala 0.95 (animazione d'apertura): 95 a schermo sono 100 veri
    expect(apri(300, 480)).toBe(100);
    spia.mockRestore();
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

  it('senza `valoreNelNome` il nome del pulsante resta l’etichetta', () => {
    render(<Selettore compatto etichetta="Scelta" valore="a" opzioni={poche} onCambia={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Scelta' })).toBeInTheDocument();
  });
});
