/** @vitest-environment jsdom */
// ============================================================
// Il contratto di DoveSiTrova, dall'API al DOM
// ============================================================
//
// Le cinque prove che Codex ha chiesto prima di candidare il componente, e il motivo per cui le
// ha chieste: il componente aveva una separazione sensata fra i tre esiti e **nessuna prova** che
// quella separazione arrivasse davvero allo schermo. Un componente con tre rami e zero test è un
// componente con tre rami di cui uno solo è stato guardato.
//
// Il caso che conta più degli altri è il secondo. Quando un'entità sta in più posti, la tentazione
// è mostrare il primo: la pagina resta piena, il codice più semplice, e il lettore va nel posto
// sbagliato due volte su tre. Qui si pretende esplicitamente che **nessuna mappa venga scelta** e
// che ci sia un collegamento per ciascuna.
//
// `MappaIncorporata` è sostituita da una spia: monta un visore vero, e con esso il caricamento
// della mappa, il canvas e lo stato della partita — nulla di cui questo contratto abbia bisogno.
// Quel che serve sapere è **con quali argomenti** viene chiamata, perché è lì che si perde la
// posizione: una mappa giusta centrata sul pin sbagliato è indistinguibile da una giusta, a occhio.
// ============================================================

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessoMondoDto, DestinazioneMondoDto } from '../../../shared/accessoMondo';

const getAccessoMondo = vi.fn();
vi.mock('../../services/api', () => ({ getAccessoMondo: (...a: unknown[]) => getAccessoMondo(...a) }));

const argomentiVisore: Array<Record<string, unknown>> = [];
vi.mock('./MappaIncorporata', () => ({
  MappaIncorporata: (props: Record<string, unknown>) => {
    argomentiVisore.push(props);
    return <div data-testid="visore" />;
  },
}));

const { DoveSiTrova } = await import('./DoveSiTrova');

function destinazione(p: Partial<DestinazioneMondoDto> = {}): DestinazioneMondoDto {
  return {
    mappa: 'citta-shibuya', nomeMappa: 'Shibuya', spillo: 42, nomeSpillo: 'Untouchable',
    centro: { x: 31.5, y: 62.25, zoom: 3 }, provenienze: [], ...p,
  };
}

function monta(risposta: AccessoMondoDto, props: Record<string, unknown> = {}) {
  getAccessoMondo.mockResolvedValue(risposta);
  return render(<MemoryRouter><DoveSiTrova tipo="negozio" chiave="untouchable" {...props} /></MemoryRouter>);
}

beforeEach(() => {
  getAccessoMondo.mockReset();
  argomentiVisore.length = 0;
});

describe('DoveSiTrova', () => {
  it('destinazione unica: incorpora la mappa sul pin esatto e offre l’ancora dell’atlante', async () => {
    monta({ entita: { tipo: 'negozio', chiave: 'untouchable' }, esito: 'unica',
            destinazioni: [destinazione()] });
    await screen.findByTestId('visore');
    // La mappa non basta che sia quella giusta: deve arrivare al punto. Il pin e il centro sono
    // ciò che distingue «Shibuya» da «quel negozio in Shibuya».
    expect(argomentiVisore).toHaveLength(1);
    expect(argomentiVisore[0]).toMatchObject({
      chiave: 'citta-shibuya', spilloIniziale: 42, puntoIniziale: { x: 31.5, y: 62.25, zoom: 3 },
    });
    expect(screen.getByRole('link', { name: /Apri sull’atlante/ }))
      .toHaveAttribute('href', '/guida/mappe/citta-shibuya?spillo=42&x=31.5&y=62.25&zoom=3');
  });

  it('più destinazioni: non ne sceglie nessuna, e ciascuna si distingue dall’altra', async () => {
    // Il caso vero che l'ha fatto emergere: Untouchable sta in **due punti di Shibuya**, e lo
    // spillo si chiama uguale in tutti e due. Etichettando con il nome dello spillo venivano
    // fuori due pastiglie identiche e sceglierne una era tirare a indovinare. A distinguere due
    // posti è la mappa, non lo spillo.
    monta({ entita: { tipo: 'negozio', chiave: 'untouchable' }, esito: 'multipla', destinazioni: [
      destinazione(),
      destinazione({ mappa: 'shibuya-central-street', nomeMappa: 'Shibuya › Central Street', spillo: 7 }),
    ] });
    await screen.findByText(/In 2 posti diversi/);
    // Nessun visore: mostrarne uno vorrebbe dire aver scelto, e la scelta non è del componente.
    expect(screen.queryByTestId('visore')).toBeNull();
    const scelte = screen.getAllByRole('link');
    expect(scelte).toHaveLength(2);
    const etichette = scelte.map((a) => a.textContent);
    expect(new Set(etichette).size).toBe(2);
    expect(screen.getByRole('link', { name: /^Shibuya · Untouchable$/ }))
      .toHaveAttribute('href', '/guida/mappe/citta-shibuya?spillo=42&x=31.5&y=62.25&zoom=3');
    expect(screen.getByRole('link', { name: /^Shibuya › Central Street · Untouchable$/ }))
      .toHaveAttribute('href', '/guida/mappe/shibuya-central-street?spillo=7&x=31.5&y=62.25&zoom=3');
  });

  it('quando lo spillo si chiama come la mappa non lo ripete', async () => {
    monta({ entita: { tipo: 'quartiere', chiave: 'shibuya' }, esito: 'multipla', destinazioni: [
      destinazione({ nomeSpillo: 'Shibuya' }),
      destinazione({ mappa: 'citta-shinjuku', nomeMappa: 'Shinjuku', spillo: 7, nomeSpillo: 'Shinjuku' }),
    ] });
    await screen.findByText(/In 2 posti diversi/);
    expect(screen.getByRole('link', { name: 'Shibuya' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shinjuku' })).toBeInTheDocument();
  });

  it('nessuna destinazione: lo dice, e non inventa né mappa né collegamento', async () => {
    monta({ entita: { tipo: 'articolo', chiave: 'soma' }, esito: 'assente', destinazioni: [] });
    await screen.findByText(/Nessun posto sulla mappa/);
    expect(screen.queryByTestId('visore')).toBeNull();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('soloCollegamento: niente visore, ma l’ancora resta quella giusta', async () => {
    monta({ entita: { tipo: 'negozio', chiave: 'untouchable' }, esito: 'unica',
            destinazioni: [destinazione()] }, { soloCollegamento: true });
    const link = await screen.findByRole('link', { name: /Apri sull’atlante/ });
    expect(link).toHaveAttribute('href', '/guida/mappe/citta-shibuya?spillo=42&x=31.5&y=62.25&zoom=3');
    expect(screen.queryByTestId('visore')).toBeNull();
  });

  it('se l’API fallisce non rompe la scheda che lo ospita', async () => {
    getAccessoMondo.mockRejectedValue(new Error('rete assente'));
    const { container } = render(<MemoryRouter>
      <div data-testid="ospite"><span>Scheda del negozio</span><DoveSiTrova tipo="negozio" chiave="untouchable" /></div>
    </MemoryRouter>);
    // La posizione è un di più: la scheda vale anche senza, e un riquadro rosso in mezzo a una
    // pagina che funziona non aiuta nessuno.
    await waitFor(() => expect(container.querySelector('[data-testid="ospite"]')).toBeTruthy());
    expect(screen.getByText('Scheda del negozio')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('visore')).toBeNull());
  });
});
