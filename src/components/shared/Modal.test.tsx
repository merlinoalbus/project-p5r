// @vitest-environment jsdom
// ============================================================
// Test Modal — portal su body, Esc, clic esterno, blocco dello scroll
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('è renderizzata come figlia diretta di body anche se aperta dentro un contenitore con opacity', () => {
    const onChiudi = vi.fn();
    render(
      <ul>
        <li style={{ opacity: 0.75 }}>
          <Modal titolo="Importa immagine — Igor" aperta onChiudi={onChiudi}>contenuto</Modal>
        </li>
        <li>card successiva</li>
      </ul>,
    );
    const overlay = document.querySelector('.modal-overlay');
    expect(overlay?.parentElement).toBe(document.body);
    expect(screen.getByRole('dialog', { name: 'Importa immagine — Igor' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('chiude con Esc, con il clic sull\'overlay e con il pulsante, ripristinando lo scroll', () => {
    const onChiudi = vi.fn();
    const { rerender } = render(<Modal titolo="Prova" aperta onChiudi={onChiudi}>corpo</Modal>);
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(onChiudi).toHaveBeenCalledTimes(1);
    act(() => { fireEvent.click(document.querySelector('.modal-overlay')!); });
    expect(onChiudi).toHaveBeenCalledTimes(2);
    // il clic dentro la finestra non chiude
    act(() => { fireEvent.click(screen.getByRole('dialog')); });
    expect(onChiudi).toHaveBeenCalledTimes(2);
    act(() => { screen.getByRole('button', { name: 'Chiudi' }).click(); });
    expect(onChiudi).toHaveBeenCalledTimes(3);

    rerender(<Modal titolo="Prova" aperta={false} onChiudi={onChiudi}>corpo</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Modal — fuoco (A5, verifica 2026-10-03)', () => {
  function Apribile({ conAutoFocus = false }: { conAutoFocus?: boolean }) {
    const [aperta, setAperta] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setAperta(true)}>Apri</button>
        <Modal titolo="Finestra" aperta={aperta} onChiudi={() => setAperta(false)} azioni={<button type="button">Conferma</button>}>
          <input aria-label="Nome" autoFocus={conAutoFocus} />
        </Modal>
      </>
    );
  }

  it('all\'apertura il fuoco va sulla finestra (non su un campo: niente tastiera sui telefoni) e alla chiusura torna a chi l\'ha aperta', () => {
    render(<Apribile />);
    const apri = screen.getByRole('button', { name: 'Apri' });
    apri.focus();
    fireEvent.click(apri);
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Finestra' }));
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(apri);
  });

  it('un campo con autoFocus tiene il fuoco', () => {
    render(<Apribile conAutoFocus />);
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Nome' }));
  });

  it('Tab dall\'ultimo elemento torna al primo, Maiusc+Tab dal primo va all\'ultimo: il fuoco non esce sulla pagina', () => {
    render(<Apribile />);
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
    const finestra = screen.getByRole('dialog', { name: 'Finestra' });
    const chiudi = screen.getByRole('button', { name: 'Chiudi' });
    const conferma = screen.getByRole('button', { name: 'Conferma' });
    conferma.focus();
    fireEvent.keyDown(finestra, { key: 'Tab' });
    expect(document.activeElement).toBe(chiudi);
    fireEvent.keyDown(finestra, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(conferma);
  });
});

it('A5: anche con un campo autoFocus, alla chiusura il fuoco torna al pulsante che ha aperto la finestra', () => {
  function ConAutoFocus() {
    const [aperta, setAperta] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setAperta(true)}>Apri con campo</button>
        <Modal titolo="Con campo" aperta={aperta} onChiudi={() => setAperta(false)}><input aria-label="Testo" autoFocus /></Modal>
      </>
    );
  }
  render(<ConAutoFocus />);
  const apri = screen.getByRole('button', { name: 'Apri con campo' });
  apri.focus();
  fireEvent.click(apri);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Testo' }));
  act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
  expect(document.activeElement).toBe(apri);
});

it('A5: una finestra montata già aperta dal genitore (e smontata alla chiusura) ridà il fuoco a chi l\'ha aperta', () => {
  function MontataAperta() {
    const [mostra, setMostra] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setMostra(true)}>Aggiungi</button>
        {mostra && <Modal titolo="Montata" aperta onChiudi={() => setMostra(false)}><textarea aria-label="Voce" autoFocus /></Modal>}
      </>
    );
  }
  render(<MontataAperta />);
  const apri = screen.getByRole('button', { name: 'Aggiungi' });
  apri.focus();
  fireEvent.click(apri);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Voce' }));
  act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(apri);
});

it('A5: in StrictMode (sviluppo) il campo con autoFocus tiene il fuoco, e alla chiusura il fuoco torna a chi ha aperto', () => {
  function MontataAperta() {
    const [mostra, setMostra] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setMostra(true)}>Apri severa</button>
        {mostra && <Modal titolo="Severa" aperta onChiudi={() => setMostra(false)}><textarea aria-label="Campo severo" autoFocus /></Modal>}
      </>
    );
  }
  render(<StrictMode><MontataAperta /></StrictMode>);
  const apri = screen.getByRole('button', { name: 'Apri severa' });
  apri.focus();
  fireEvent.click(apri);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Campo severo' }));
  act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
  expect(document.activeElement).toBe(apri);
});
