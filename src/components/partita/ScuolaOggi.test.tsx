// @vitest-environment jsdom
// ============================================================
// Test ScuolaOggi — solo il giorno corrente: domande in classe, esame senza doppioni, cruciverba con la risposta
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { ScuolaOggi } from './ScuolaOggi';
import type { CruciverbaTuttiDto, DomandeDto, PartitaDto } from '../../types';

const { getDomande, getCruciverba } = vi.hoisted(() => ({ getDomande: vi.fn(), getCruciverba: vi.fn() }));
vi.mock('../../services/api', () => ({ getDomande, getCruciverba, getImmagini: vi.fn(), urlImmagine: () => '' }));

const partita = (dataGioco: string | null): PartitaDto => ({
  id: 1, nome: 'Prova', note: '', attiva: true, livelloProtagonista: 1, dataGioco, difficolta: 'normale',
  nuovaPartitaPlus: false, dlcPosseduti: [], allarmeAttivo: false, createdAt: '', updatedAt: '',
} as unknown as PartitaDto);

const DOMANDE: DomandeDto = {
  domande: [
    { id: 1, data: '05-11', tipo: 'classe', chi: 'Prof. Ushimaru', domanda: 'Domanda di oggi in classe?', risposte: [{ ordine: 1, testo: 'Risposta giusta' }], ricompensa: 'Conoscenza +1 nota', note: '' },
    { id: 2, data: '05-12', tipo: 'classe', chi: 'Prof. Kawakami', domanda: 'Domanda di domani?', risposte: [{ ordine: 1, testo: 'Altra' }], ricompensa: '', note: '' },
    { id: 3, data: '05-11', tipo: 'esame-medio', chi: 'Esame', domanda: 'Domanda d\u2019esame ripetuta?', risposte: [{ ordine: 1, testo: 'Ripetuta' }], ricompensa: '', note: '' },
  ] as DomandeDto['domande'],
  esami: [
    { chiave: 'esame-1', nome: 'Esame di met\u00e0 semestre 1', date: ['05-11', '05-12'], dataRisultati: '05-20', domande: [
      { data: '05-11', ordine: 1, domanda: 'Domanda d\u2019esame ripetuta?', risposta: 'Ripetuta' },
      { data: '05-12', ordine: 2, domanda: 'Domanda d\u2019esame di domani?', risposta: 'Domani' },
    ] },
  ] as DomandeDto['esami'],
  premi: null,
  dataGioco: '05-11',
  prossime: [],
  fatte: 0,
  totale: 3,
};

const CRUCIVERBA: CruciverbaTuttiDto = {
  cruciverba: [
    { giorno: '05-11', indizio: 'Indizio di oggi', risposta: 'PARLARE', rispostaEn: 'TALK', fonte: '', fatto: false },
    { giorno: '05-18', indizio: 'Indizio dopo', risposta: 'ALTRO', rispostaEn: null, fonte: '', fatto: false },
  ],
  risolti: 0,
  totale: 2,
};

beforeEach(() => {
  getDomande.mockReset().mockResolvedValue(DOMANDE);
  getCruciverba.mockReset().mockResolvedValue(CRUCIVERBA);
});

describe('ScuolaOggi', () => {
  it('mostra soltanto le domande, l\u2019esame e il cruciverba del giorno corrente', async () => {
    render(<ScuolaOggi partita={partita('05-11')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Domande in classe del 11 maggio: 1/ }));
    expect(screen.getByText('Domanda di oggi in classe?')).toBeInTheDocument();
    expect(screen.queryByText('Domanda di domani?')).not.toBeInTheDocument();
    expect(screen.getByText('Risposta giusta')).toBeInTheDocument();
    // la domanda d'esame non finisce fra quelle in classe
    expect(screen.queryByText('Domanda d\u2019esame ripetuta?')).not.toBeInTheDocument();
  });

  it('unisce le domande d\u2019esame dei due elenchi senza ripeterle', async () => {
    render(<ScuolaOggi partita={partita('05-11')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Domande d\u2019esame del 11 maggio: 1/ }));
    expect(screen.getAllByText('Domanda d\u2019esame ripetuta?')).toHaveLength(1);
    expect(screen.getByText('Ripetuta')).toBeInTheDocument();
    expect(screen.queryByText('Domanda d\u2019esame di domani?')).not.toBeInTheDocument();
  });

  it('mostra la risposta del cruciverba del giorno', async () => {
    render(<ScuolaOggi partita={partita('05-11')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Cruciverba del 11 maggio/ }));
    expect(screen.getByText('Indizio di oggi')).toBeInTheDocument();
    expect(screen.getByText('PARLARE')).toBeInTheDocument();
    expect(screen.queryByText('ALTRO')).not.toBeInTheDocument();
  });

  it('senza nulla per oggi lo dice; senza giorno corrente non mostra niente', async () => {
    const { unmount } = render(<ScuolaOggi partita={partita('05-13')} />);
    expect(await screen.findByText(/nessuna domanda in classe/i)).toBeInTheDocument();
    unmount();
    const { container } = render(<ScuolaOggi partita={partita(null)} />);
    expect(container).toBeEmptyDOMElement();
  });
});
