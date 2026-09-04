// @vitest-environment jsdom
// ============================================================
// Test ScuolaOggi — solo il giorno corrente: domande in classe, esame senza la voce riassuntiva, cruciverba con la risposta
// ============================================================
//
// La fixture rispecchia la forma dei dati veri: per le date d'esame l'elenco generale porta UNA voce riassuntiva
// della giornata («Serie di domande su…»), mentre le domande singole e numerate stanno dentro `esami`.
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
  it('mostra soltanto le domande in classe del giorno corrente', async () => {
    render(<ScuolaOggi partita={partita('05-11')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Domande in classe del 11 maggio: 1/ }));
    expect(screen.getByText('Domanda di oggi in classe?')).toBeInTheDocument();
    expect(screen.queryByText('Domanda di domani?')).not.toBeInTheDocument();
    expect(screen.getByText('Risposta giusta')).toBeInTheDocument();
    // la voce d'esame non finisce fra quelle in classe
    expect(screen.queryByText(/Serie di domande su Minamoto/)).not.toBeInTheDocument();
  });

  it('mostra le domande numerate dell’esame e non la voce riassuntiva dell’elenco generale', async () => {
    render(<ScuolaOggi partita={partita('05-11')} />);
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
    render(<ScuolaOggi partita={partita('05-14')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Domande d’esame del 14 maggio: 1/ }));
    expect(screen.getByText('Serie di domande del giorno senza dettaglio.')).toBeInTheDocument();
    expect(screen.getByText('Unica risposta')).toBeInTheDocument();
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
