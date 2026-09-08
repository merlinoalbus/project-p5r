/** @vitest-environment jsdom */

// ============================================================
// ChipDisponibilita — «Da verificare» solo a chi va detto
// ============================================================
//
// L'etichetta era una sola per tutto quello che non e' ne' disponibile ne' bloccato, e l'utente
// l'ha vista su «Yusuke Kitagawa in squadra»: verificare come? Quell'etichetta e' nata per le
// condizioni che l'app **non sa leggere** — «dopo aver pescato una volta», scritta in prosa nella
// guida — dove mandare a controllare a mano e' onesto.
//
// Una condizione che l'app capisce e' un'altra cosa: sa che cosa serve e dove sta scritto, e quel
// che manca e' il **dato**. Li' si dice che cosa fare, non di verificare.

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChipDisponibilita } from './ChipDisponibilita';
import type { DisponibilitaDto } from '../../types';

vi.mock('../shared/IconaAzione', () => ({ IconaAzione: () => null, IconaSegno: () => null }));

const req = (tipo: string, dettaglio: string) => ({ indice: 0, tipo, testo: dettaglio, stato: 'grigio', dettaglio, manuale: true } as unknown as DisponibilitaDto['requisiti'][number]);

describe('ChipDisponibilita', () => {
  it('una condizione che l’app capisce chiede di segnare il dato, non di verificarlo', () => {
    const d = { stato: 'ignoto', requisiti: [req('squadra', 'Yusuke Kitagawa non risulta ancora in squadra')] } as DisponibilitaDto;
    render(<MemoryRouter><ChipDisponibilita disponibilita={d} /></MemoryRouter>);
    expect(screen.getByText('Da segnare')).toBeInTheDocument();
    expect(screen.queryByText('Da verificare')).toBeNull();
    // **E ci si clicca.** Un avviso che dice «segna» senza portare dove si segna e' mezzo avviso.
    expect(screen.getByRole('link', { name: /Da segnare/ })).toHaveAttribute('href', '/partita?scheda=squadra');
  });

  it('una condizione scritta in prosa, che l’app non sa leggere, resta da verificare', () => {
    const d = { stato: 'ignoto', requisiti: [req('manuale', 'dopo aver pescato una volta')] } as DisponibilitaDto;
    render(<MemoryRouter><ChipDisponibilita disponibilita={d} /></MemoryRouter>);
    expect(screen.getByText('Da verificare')).toBeInTheDocument();
  });

  it('se anche una sola non e’ leggibile, l’avviso piu’ prudente vince', () => {
    const d = { stato: 'ignoto', requisiti: [req('squadra', 'Ryuji in squadra'), req('manuale', 'dopo aver pescato')] } as DisponibilitaDto;
    render(<MemoryRouter><ChipDisponibilita disponibilita={d} /></MemoryRouter>);
    expect(screen.getByText('Da verificare')).toBeInTheDocument();
  });

  it('se in sospeso c’e’ solo una condizione del negozio, l’articolo non ripete l’avviso', () => {
    const d = { stato: 'ignoto', requisiti: [{ ...req('manuale', 'Negozio: dopo il 9 ottobre'), daNegozio: true }] } as DisponibilitaDto;
    const { container } = render(<MemoryRouter><ChipDisponibilita disponibilita={d} /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });

  it('disponibile non mostra nessun chip: un elenco pieno di avvisi non se ne legge nessuno', () => {
    const { container } = render(<MemoryRouter><ChipDisponibilita disponibilita={{ stato: 'disponibile', requisiti: [] } as DisponibilitaDto} /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});
