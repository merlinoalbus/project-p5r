/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test BattagliaPage — schede, ricerca rapida delle Ombre con filtri, negoziazione
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BattagliaPage } from './BattagliaPage';
import type { BattagliaDto, OmbraDto } from '../types';

const { getBattaglia } = vi.hoisted(() => ({ getBattaglia: vi.fn() }));
vi.mock('../services/api', () => ({ getBattaglia }));

const ombra = (dungeonChiave: string, dungeon: string, ombra: string | null, persona: string, debolezze: string[], personalita: string | null, extra: Partial<OmbraDto> = {}): OmbraDto => ({ dungeonChiave, dungeon, area: null, areaChiave: null, ombra, persona, livello: null, debolezze, resistenze: [], personalita, fonte: 'https://www.allgamestaff.it/x', personaCollegata: { id: 3, nome: 'Bicorn', nomeIt: 'Bicorno' }, ...extra });
const dati: BattagliaDto = {
  fonti: { principale: 'allgamestaff', note: '' },
  sistema: { urlFonte: 'https://www.allgamestaff.it/s', avvioScontro: 'Premi attacca.', comandi: ['Attacca'], esitiColpo: { debole: 'Atterrato', critico: 'Forte', tecnico: 'Bonus', block: 'Annullato', resiste: 'Ridotto' }, unoMore: 'Turno extra.', statiAlterati: [{ stato: 'Congelamento', effetto: 'Non agisce' }], notaFineBattaglia: 'Fine.' },
  assaltoEHoldUp: { urlFonte: 'https://www.allgamestaff.it/s', rapina: 'R', assalto: 'A', holdUp: 'H' },
  tecnico: { urlFonte: 'https://www.allgamestaff.it/s', stati: [{ stato: 'Congelamento', elementi: ['Nucleare'] }] },
  staffetta: { urlFonte: 'https://www.allgamestaff.it/st', cosaE: 'Passaggio', disponibilita: 'Subito', effetto: 'Bonus', livelli: 'Freccette', indicatoriVisivi: 'Aura', ranghi: [{ rango: 1, bonus: 'Danno' }], moltiplicatori: '1,45x', effettoSpeciale: 'Gratis' },
  speciali: { urlFonte: 'https://www.allgamestaff.it/sp', meccanica: 'Combo', attivazione: 'Casuale', proprietaDanno: 'Divino', elenco: [{ nome: 'Via col piombo', personaggi: ['Morgana', 'Ann'], sblocco: '21 giugno' }] },
  negoziazione: { urlFonti: ['https://www.allgamestaff.it/n'], quandoSiPuoNegoziare: 'In Rapina.', opzioniHoldUp: [{ opzione: 'Donami il tuo potere', effetto: 'Persona' }], comeVerificarePersonalita: 'Analisi.', personalita: [{ nome: 'Giocosa', descrizione: 'Scherzosa', risposteEfficaci: ['È per l\'automiglioramento'], risposteDaEvitare: ['Serie'] }], regole: ['Regola 1'], incertezze: '' },
  ombreSciagura: { nomeOriginale: 'Disaster Shadow', urlFonte: 'https://www.allgamestaff.it/o', cosaSono: 'Varianti', comeRiconoscerle: 'Aura', caratteristiche: ['+30% danni'], comportamentoInBattaglia: { turnoProprio: 'Passive', quandoAttaccate: 'Contrattacco', comeNeutralizzarle: 'Atterrarle' }, effettiStati: { immobilizzanti: ['Sonno'], soggiogamento: 'Normale', furia: 'Peggio' }, esplosioneAllaSconfitta: { descrizione: 'Esplode', potenza: 'Alta', eccezioni: 'Riflesso' }, ricompense: 'Rari', doveCompaiono: 'Ovunque', elenco: null, incertezze: '' },
  mietitore: { categoria: 'Mietitore (Reaper)', urlFonte: 'https://www.allgamestaff.it/m', dove: 'Mementos', comeSiManifesta: 'Catene', livelloConsigliato: '60', abilita: ['Megidolaon'], immunita: ['Critici'], debolezze: null, strategia: ['Cura'], ricompense: 'PE' },
  demoniTesoro: { categoria: 'Demoni del Tesoro', urlFonte: 'https://www.allgamestaff.it/d', cosaSono: 'Speciali', comeCompaiono: 'Forzieri', primaComparsa: '18 maggio', comportamento: 'Fuggono', resistenzeGenerali: 'Fisico', tecnicheConsigliate: [], elenco: [{ nome: 'Reggente', livello: 10, arcano: 'Imperatore', dove: 'Madarame' }] },
  ombre: [
    ombra('kamoshida', 'Palazzo di Kamoshida', 'Bestia bicorne sporca', 'Bicorno', ['Tuono'], 'Cupa'),
    ombra('okumura', 'Palazzo di Okumura', null, 'Arahabaki', ['Psicocinesi', 'Nucleare'], null, { personaCollegata: null }),
    ombra('mementos', 'Mementos', 'Piromane delle cripte', "Jack-o'-lantern", ['Ghiaccio', 'Vento'], 'Cupa', { area: 'Dedalo di Qimranut', areaChiave: 'mementos-01-qimranut', personaCollegata: null }),
  ],
};

describe('BattagliaPage', () => {
  it('ricerca rapida delle Ombre con filtri e cambio scheda alla negoziazione', async () => {
    getBattaglia.mockResolvedValue(dati);
    render(<MemoryRouter><BattagliaPage /></MemoryRouter>);
    expect(await screen.findByText('Bestia bicorne sporca')).toBeInTheDocument();
    expect(screen.getByText('3 Ombre su 3.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bicorno' })).toHaveAttribute('href', '/compendio/persona/3');
    fireEvent.change(screen.getByRole('combobox', { name: 'Debole a' }), { target: { value: 'Nucleare' } });
    expect(screen.getByText('1 Ombre su 3.')).toBeInTheDocument();
    expect(screen.getByText('Arahabaki')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Debole a' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Personalità' }), { target: { value: 'Cupa' } });
    expect(screen.getByText('2 Ombre su 3.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'piromane' } });
    expect(screen.getByText('1 Ombre su 3.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dedalo di Qimranut' })).toHaveAttribute('href', '/guida/dungeon/mementos?area=mementos-01-qimranut');
    fireEvent.click(screen.getByRole('tab', { name: 'Negoziazione' }));
    expect(screen.getByRole('heading', { name: 'Giocosa' })).toBeInTheDocument();
    expect(screen.getByText(/È per l'automiglioramento/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Danno tecnico' }));
    expect(screen.getByText('Nucleare')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Nemici speciali' }));
    expect(screen.getByText('Reggente')).toBeInTheDocument();
  });
});
