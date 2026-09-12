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

  it('disabilitato non si apre', () => {
    render(<Selettore etichetta="Scelta" valore="" opzioni={poche} onCambia={() => {}} disabilitato />);
    const pulsante = screen.getByRole('combobox', { name: 'Scelta' });
    expect(pulsante).toBeDisabled();
  });
});
