// @vitest-environment jsdom
// ============================================================
// Test MappaTokyo — la riga delle fermate chiuse: per esteso nella pagina, in una riga con «Quali» nella schermata piena
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MappaTokyo } from './MappaTokyo';
import type { DungeonRiassuntoDto, QuartiereRiassuntoDto } from '../../types';

const quartieri = [
  { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, sbloccoData: null, descrizione: '' },
  { chiave: 'ikebukuro', nome: 'Ikebukuro', mappaChiave: 'citta-ikebukuro', luoghi: 2, verificati: 2, sblocco: '1 settembre', sbloccoData: '09-01', descrizione: '' },
] as QuartiereRiassuntoDto[];

describe('MappaTokyo — fermate non ancora nel mondo', () => {
  it('nella pagina le elenca per esteso, con il perché sul nome', () => {
    render(<MemoryRouter><MappaTokyo quartieri={quartieri} dataGioco="04-11" /></MemoryRouter>);
    const nome = screen.getByText('Ikebukuro', { selector: 'span[title]' });
    expect(nome).toHaveAttribute('title', 'dal 09-01');
    expect(screen.queryByRole('button', { name: /^Quali luoghi/ })).toBeNull();
  });

  it('nella schermata piena resta il conto in una riga, e i nomi con il perché stanno nella finestra «Quali»', () => {
    render(<MemoryRouter><MappaTokyo quartieri={quartieri} dataGioco="04-11" riempi /></MemoryRouter>);
    expect(screen.getByText(/^Non ancora nel mondo, al .*: 1 luogo\.$/)).toBeInTheDocument();
    expect(screen.queryByText('Ikebukuro', { selector: 'span[title]' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Quali luoghi non sono ancora nel mondo (1)' }));
    const finestra = screen.getByRole('dialog', { name: /^Non ancora nel mondo, al / });
    const voce = within(finestra).getByText('Ikebukuro').closest('li')!;
    expect(within(voce).getByText('dal 09-01')).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un Palazzo completato non c’è più, anche dentro la sua finestra, e si dice perché', () => {
    const kamoshida = { chiave: 'kamoshida', nome: 'Palazzo di Kamoshida', finestra: { dal: '04-12', al: '05-02' }, completato: null } as DungeonRiassuntoDto;
    const cartellino = () => document.querySelector('a[href="/guida/mondo/dungeon/kamoshida"]');
    const { rerender } = render(<MemoryRouter><MappaTokyo quartieri={quartieri} dungeon={[kamoshida]} dataGioco="04-22" /></MemoryRouter>);
    expect(cartellino()).not.toBeNull();
    rerender(<MemoryRouter><MappaTokyo quartieri={quartieri} dungeon={[{ ...kamoshida, completato: 'Tesoro del Palazzo raccolto' }]} dataGioco="04-22" /></MemoryRouter>);
    expect(cartellino()).toBeNull();
    expect(screen.getByText('Palazzo di Kamoshida', { selector: 'span[title]' })).toHaveAttribute('title', 'completato: Tesoro del Palazzo raccolto');
  });
});
