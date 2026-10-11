// @vitest-environment jsdom
// ============================================================
// Test ScuolaOggi — solo il giorno guardato: domande in classe, esame senza la voce riassuntiva, cruciverba con la risposta;
// i collegamenti alle pagine intere della Guida ci sono sempre
// ============================================================
//
// La fixture rispecchia la forma dei dati veri: per le date d'esame l'elenco generale porta UNA voce riassuntiva
// della giornata («Serie di domande su…»), mentre le domande singole e numerate stanno dentro `esami`.
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScuolaOggi } from './ScuolaOggi';
import type { CruciverbaTuttiDto, DomandeDto, PartitaDto } from '../../types';

const { getDomande, getCruciverba } = vi.hoisted(() => ({ getDomande: vi.fn(), getCruciverba: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, { getDomande, getCruciverba, getImmagini: vi.fn() }));

/** Partita attiva «Prova» (id 1, difficoltà normale) alla data di gioco indicata, o senza data se null. */
const partita = (dataGioco: string | null): PartitaDto => ({
  id: 1, nome: 'Prova', note: '', attiva: true, livelloProtagonista: 1, dataGioco, difficolta: 'normale',
  nuovaPartitaPlus: false, dlcPosseduti: [], allarmeAttivo: false, createdAt: '', updatedAt: '',
} as unknown as PartitaDto);

const DOMANDE: DomandeDto = {
  domande: [
    { id: 1, data: '05-11', tipo: 'classe', chi: 'Prof. Ushimaru', domanda: 'Domanda di oggi in classe?', risposte: [{ ordine: 1, testo: 'Risposta giusta' }], ricompensa: 'Conoscenza +1 nota', note: '' },
    { id: 2, data: '05-12', tipo: 'classe', chi: 'Prof. Kawakami', domanda: 'Domanda di domani?', risposte: [{ ordine: 1, testo: 'Altra' }], ricompensa: '', note: '' },
    // voce riassuntiva della giornata d'esame, come nei dati veri: non è una delle domande numerate
    { id: 3, data: '05-11', tipo: 'esame-medio', chi: 'Esame', domanda: 'Serie di domande su Minamoto no Yoshitsune.', risposte: [{ ordine: 1, testo: 'Minamoto no Yoshitsune' }, { ordine: 2, testo: 'Minamoto no Yoritomo' }], ricompensa: '', note: '' },
    // giornata d'esame di cui l'elenco degli esami non espone le domande: qui il riassunto è l'unica fonte
    { id: 4, data: '05-14', tipo: 'esame-finale', chi: 'Esame', domanda: 'Serie di domande del giorno senza dettaglio.', risposte: [{ ordine: 1, testo: 'Unica risposta' }], ricompensa: '', note: '' },
  ] as DomandeDto['domande'],
  esami: [
    { chiave: 'esame-1', nome: 'Esame di metà semestre 1', date: ['05-11', '05-12', '05-14'], dataRisultati: '05-20', domande: [
      { data: '05-11', ordine: 2, domanda: 'Nome del fratello di Yoshitsune', risposta: 'Minamoto no Yoritomo' },
      { data: '05-11', ordine: 1, domanda: 'Figura storica che ispirò l’idioma', risposta: 'Minamoto no Yoshitsune' },
      { data: '05-12', ordine: 1, domanda: 'Domanda d’esame di domani?', risposta: 'Domani' },
    ] },
  ] as DomandeDto['esami'],
  premi: null,
  dataGioco: '05-11',
  prossime: [],
  fatte: 0,
  totale: 4,
};

const CRUCIVERBA: CruciverbaTuttiDto = {
  dataGioco: '05-11', prossimo: null,
  cruciverba: [
    { giorno: '05-11', chiave: '05-11-0', indizio: 'Indizio di oggi', risposta: 'PARLARE', rispostaEn: 'TALK', fatto: false },
    { giorno: '05-18', chiave: '05-18-1', indizio: 'Indizio dopo', risposta: 'ALTRO', rispostaEn: null, fatto: false },
  ],
  risolti: 0,
  totale: 2,
};

beforeEach(() => {
  getDomande.mockReset().mockResolvedValue(DOMANDE);
  getCruciverba.mockReset().mockResolvedValue(CRUCIVERBA);
});

describe('ScuolaOggi', () => {
  it('mostra soltanto le domande in classe del giorno corrente', async () => {
    render(<MemoryRouter><ScuolaOggi partita={partita('05-11')} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Domande in classe del 11 maggio: 1/ }));
    expect(screen.getByText('Domanda di oggi in classe?')).toBeInTheDocument();
    expect(screen.queryByText('Domanda di domani?')).not.toBeInTheDocument();
    expect(screen.getByText('Risposta giusta')).toBeInTheDocument();
    // la voce d'esame non finisce fra quelle in classe
    expect(screen.queryByText(/Serie di domande su Minamoto/)).not.toBeInTheDocument();
  });

  it('mostra le domande numerate dell’esame e non la voce riassuntiva dell’elenco generale', async () => {
    render(<MemoryRouter><ScuolaOggi partita={partita('05-11')} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Domande d’esame del 11 maggio: 2/ }));
    const voci = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(voci).toHaveLength(2);
    expect(voci[0]).toContain('Figura storica che ispirò l’idioma');
    expect(voci[1]).toContain('Nome del fratello di Yoshitsune');
    // il riassunto ripeterebbe gli stessi contenuti, per giunta in cima: non deve comparire
    expect(screen.queryByText(/Serie di domande su Minamoto/)).not.toBeInTheDocument();
    expect(screen.queryByText('Domanda d’esame di domani?')).not.toBeInTheDocument();
  });

  it('usa la voce riassuntiva solo quando l’esame non espone le domande di quel giorno', async () => {
    render(<MemoryRouter><ScuolaOggi partita={partita('05-14')} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Domande d’esame del 14 maggio: 1/ }));
    expect(screen.getByText('Serie di domande del giorno senza dettaglio.')).toBeInTheDocument();
    expect(screen.getByText('Unica risposta')).toBeInTheDocument();
  });

  it('mostra la risposta del cruciverba del giorno', async () => {
    render(<MemoryRouter><ScuolaOggi partita={partita('05-11')} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Cruciverba del 11 maggio/ }));
    expect(screen.getByText('Indizio di oggi')).toBeInTheDocument();
    expect(screen.getByText('PARLARE')).toBeInTheDocument();
    expect(screen.queryByText('ALTRO')).not.toBeInTheDocument();
  });

  it('senza nulla per oggi lo dice; senza giorno corrente restano solo i collegamenti alla Guida', async () => {
    const { unmount } = render(<MemoryRouter><ScuolaOggi partita={partita('05-13')} /></MemoryRouter>);
    expect(await screen.findByText('Oggi nessuna domanda in classe né cruciverba.')).toBeInTheDocument();
    unmount();
    render(<MemoryRouter><ScuolaOggi partita={partita(null)} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Domande e risposte: tutte le date nella Guida' })).toHaveAttribute('href', '/guida/domande');
    expect(screen.getByRole('link', { name: 'Cruciverba: tutti i giorni nella Guida' })).toHaveAttribute('href', '/guida/cruciverba');
    expect(screen.queryByRole('group', { name: /^Scuola del/ })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('i collegamenti alla Guida ci sono anche nei giorni con le scorciatoie e in quelli vuoti', async () => {
    const { unmount } = render(<MemoryRouter><ScuolaOggi partita={partita('05-11')} /></MemoryRouter>);
    await screen.findByRole('button', { name: /Cruciverba del 11 maggio/ });
    expect(screen.getByRole('link', { name: 'Domande e risposte: tutte le date nella Guida' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cruciverba: tutti i giorni nella Guida' })).toBeInTheDocument();
    unmount();
    render(<MemoryRouter><ScuolaOggi partita={partita('05-13')} /></MemoryRouter>);
    await screen.findByText(/nessuna domanda in classe/);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('segue il giorno guardato nella scheda «Oggi» e non la data di gioco, e lo scrive quando non è oggi', async () => {
    // partita al 13 maggio (giorno vuoto), scheda «Oggi» sull'11: le scorciatoie sono quelle dell'11
    const { unmount } = render(<MemoryRouter><ScuolaOggi partita={partita('05-13')} giorno="05-11" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Domande in classe del 11 maggio: 1/ }));
    expect(screen.getByText('Domanda di oggi in classe?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Domande in classe del 11 maggio/ })).toHaveTextContent('1 quel giorno');
    unmount();
    // e viceversa: partita all'11, scheda sul 13 vuoto
    const secondo = render(<MemoryRouter><ScuolaOggi partita={partita('05-11')} giorno="05-13" /></MemoryRouter>);
    expect(await screen.findByText('Il 13 maggio nessuna domanda in classe né cruciverba.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cruciverba del 11 maggio/ })).toBeNull();
    secondo.unmount();
    // `giorno` null (scheda chiusa): vale la data di gioco
    render(<MemoryRouter><ScuolaOggi partita={partita('05-11')} giorno={null} /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: /Domande in classe del 11 maggio: 1/ })).toHaveTextContent('1 oggi');
  });

  it('scorrendo i giorni filtra gli elenchi già caricati senza rileggerli, e la finestra aperta su un giorno si chiude cambiando giorno', async () => {
    const { rerender } = render(<MemoryRouter><ScuolaOggi partita={partita('05-13')} giorno="05-11" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Cruciverba del 11 maggio/ }));
    expect(screen.getByText('PARLARE')).toBeInTheDocument();
    rerender(<MemoryRouter><ScuolaOggi partita={partita('05-13')} giorno="05-14" /></MemoryRouter>);
    expect(screen.queryByText('PARLARE')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Domande d’esame del 14 maggio: 1/ })).toBeInTheDocument();
    // tornando all'11 la finestra resta chiusa: era stata aperta per quel giorno, ma la si è lasciata
    rerender(<MemoryRouter><ScuolaOggi partita={partita('05-13')} giorno="05-11" /></MemoryRouter>);
    expect(screen.queryByText('PARLARE')).not.toBeInTheDocument();
    expect(getDomande).toHaveBeenCalledTimes(1);
    expect(getCruciverba).toHaveBeenCalledTimes(1);
  });
});
