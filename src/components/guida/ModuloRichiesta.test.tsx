/** @vitest-environment jsdom */
// ============================================================
// Test ModuloRichiesta — correggere, aggiungere ed eliminare una Richiesta (2026-10-11): campi, dove, controlli, avviso
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, vociSelettore, valoreSelettore } from '../../../test/selettore';
import { ModuloRichiesta } from './ModuloRichiesta';
import { notifica } from '../../stores/notificationStore';
import type { RichiestaDto, RichiesteDto } from '../../types';

const api = vi.hoisted(() => ({ getRichieste: vi.fn(), getConfidenti: vi.fn(), aggiornaRichiesta: vi.fn(), creaRichiesta: vi.fn(), getCitazioniRichiesta: vi.fn(), eliminaRichiesta: vi.fn(),
  // L13 (ondata 3): il modulo legge anche le Ombre del compendio e gli oggetti del catalogo; l'editor delle condizioni ha i suoi elenchi
  getOmbre: vi.fn(), getElenchiEffettiVoce: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
// l'editor delle condizioni di sblocco non è l'oggetto di questi test: un segnaposto che mostra quante condizioni ha
vi.mock('./CondizioniEditor', () => ({ CondizioniEditor: ({ condizioni }: { condizioni: unknown[] }) => <span data-testid="condizioni">{condizioni.length}</span> }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));
// la conferma dell'eliminazione passa da `conferma()` (DialogoConferma in primo piano), non più da un riquadro in fondo al corpo della finestra (L13)
const { conferma } = vi.hoisted(() => ({ conferma: vi.fn() }));
vi.mock('../../stores/confermaStore', async (vero) => ({ ...(await vero<typeof import('../../stores/confermaStore')>()), conferma }));

const richiesta: RichiestaDto = {
  chiave: 'bulli', nome: 'Bullismo sui bulli', committente: 'Mishima', disponibileDal: '20 maggio', scadenza: '', area: 'Dedalo di Aiyatsbus', areaChiave: 'aiy', piano: 'Area 3',
  bersaglio: { nome: 'Kazuo', livello: 10, formaDemoniaca: 'Ippon-Datara', debolezze: ['Fuoco', 'Ghiaccio'], resistenze: ['Vento'], vulnerabileConfusione: false },
  ricompense: ['485 PE', 'Pozione'], confidente: { chiave: 'ryuji', nome: 'Ryuji Sakamoto', rango: 2 }, areaNome: 'Dedalo di Aiyatsbus', areaOrdine: 1,
  areaDedalo: 'aiy-1', areaDedaloNome: 'Area 1', note: 'Facile.', fonte: '', stato: null,
  condizioni: [], scadenzaData: null, proroga: null, ombra: null, yen: null, esperienza: null,
};
const elenco: RichiesteDto = {
  richieste: [richiesta], jose: null, dedali: [], completate: 0, totale: 1,
  collocazioni: [{ chiave: 'qim', nome: 'Dedalo di Qimranut', aree: [{ chiave: 'qim-1', nome: 'Area 1' }] }, { chiave: 'aiy', nome: 'Dedalo di Aiyatsbus', aree: [{ chiave: 'aiy-1', nome: 'Area 1' }, { chiave: 'aiy-2', nome: 'Binari' }] }],
};

/** Monta il modulo e restituisce i richiami. */
function monta(chiave: string | null, iniziale?: { dedalo?: string | null; areaDedalo?: string | null }) {
  const onChiudi = vi.fn();
  const onCambiata = vi.fn().mockResolvedValue(undefined);
  render(<ModuloRichiesta chiave={chiave} iniziale={iniziale} onChiudi={onChiudi} onCambiata={onCambiata} />);
  return { onChiudi, onCambiata };
}
/** Il campo di testo con quell'etichetta, nella finestra. */
const campo = (nome: string) => screen.getByRole('textbox', { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  api.getRichieste.mockResolvedValue(elenco);
  api.getConfidenti.mockResolvedValue([{ chiave: 'ryuji', nome: 'Ryuji Sakamoto', arcana: 'chariot', arcanaNome: 'Carro', ordine: 1 }, { chiave: 'ann', nome: 'Ann Takamaki', arcana: 'lovers', arcanaNome: 'Amanti', ordine: 2 }]);
  api.getOmbre.mockResolvedValue([]);
  api.getElenchiEffettiVoce.mockResolvedValue({ articoli: [], domande: [], cruciverba: [], inviti: [], persone: [], oggetti: [], trofei: [] });
});

it('si apre coi campi della Richiesta e salva i dati veri: righe in elenchi, numeri, dedalo e area', async () => {
  const { onChiudi, onCambiata } = monta('bulli');
  expect(await screen.findByRole('dialog', { name: 'Modifica: Bullismo sui bulli' })).toBeInTheDocument();
  expect(campo('Nome')).toHaveValue('Bullismo sui bulli');
  // debolezze e resistenze sono tessere con l'icona dell'elemento (accese se la voce nomina l'elemento da solo), le ricompense righe a campo
  const debolezze = within(screen.getByRole('group', { name: 'Debolezze' }));
  expect(debolezze.getByRole('button', { name: 'Fuoco' })).toHaveAttribute('aria-pressed', 'true');
  expect(debolezze.getByRole('button', { name: 'Ghiaccio' })).toHaveAttribute('aria-pressed', 'true');
  expect(debolezze.getByRole('button', { name: 'Vento' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('textbox', { name: 'Ricompense: voce 1' })).toHaveValue('485 PE');
  expect(screen.getByRole('textbox', { name: 'Ricompense: voce 2' })).toHaveValue('Pozione');
  expect(valoreSelettore('Dedalo')).toBe('Dedalo di Aiyatsbus');
  expect(valoreSelettore('Area del dedalo')).toBe('Area 1');
  expect(valoreSelettore('Confidente')).toBe('Ryuji Sakamoto');
  // le aree offerte sono quelle del dedalo scelto, più «da collocare»
  expect(vociSelettore('Area del dedalo')).toEqual(['— da collocare —', 'Area 1', 'Binari']);
  scegliVoce('Area del dedalo', 'Binari');
  // si accende «Sacro» fra le resistenze: il nome canonico si aggiunge in coda, «Vento» resta com'era
  fireEvent.click(within(screen.getByRole('group', { name: 'Resistenze' })).getByRole('button', { name: 'Sacro' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Livello' }), { target: { value: '12' } });
  // L13: il rango del Confidente rimasto nella colonna di prima entra fra le condizioni di sblocco (un dato in un solo punto)
  expect(screen.getAllByTestId('condizioni')[0]).toHaveTextContent('1');
  api.aggiornaRichiesta.mockResolvedValue(richiesta);
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaRichiesta).toHaveBeenCalledWith('bulli', {
    nome: 'Bullismo sui bulli', committente: 'Mishima', disponibileDal: '20 maggio', scadenza: '', dedalo: 'aiy', areaDedalo: 'aiy-2', piano: 'Area 3',
    bersaglio: { nome: 'Kazuo', formaDemoniaca: 'Ippon-Datara', livello: 12, debolezze: ['Fuoco', 'Ghiaccio'], resistenze: ['Vento', 'Sacro'], vulnerabileConfusione: false },
    ricompense: ['485 PE', 'Pozione'], confidente: 'ryuji', confidenteRango: null, note: 'Facile.',
    // L13: gli oggetti della ricompensa non cambiati non si mandano (il server non tocca le righe né le loro note)
    condizioni: [{ tipo: 'confidente', confidente: 'ryuji', rango: 2 }], scadenzaData: null, proroga: null, ombra: null, yen: null, esperienza: null,
  }));
  await waitFor(() => expect(onCambiata).toHaveBeenCalled());
  expect(onChiudi).toHaveBeenCalled();
});

it('cambiando dedalo l’area torna «da collocare»; senza dedalo non c’è area; senza Confidente non c’è rango', async () => {
  monta('bulli');
  await screen.findByRole('dialog');
  scegliVoce('Dedalo', 'Dedalo di Qimranut');
  expect(valoreSelettore('Area del dedalo')).toBe('— da collocare —');
  scegliVoce('Dedalo', '— nessun dedalo —');
  expect(screen.queryByRole('combobox', { name: 'Area del dedalo' })).toBeNull();
  // L13: il rango non sta più accanto al Confidente (è una condizione di sblocco)
  expect(screen.queryByRole('combobox', { name: 'Rango' })).toBeNull();
  scegliVoce('Confidente', 'Nessun Confidente');
  api.aggiornaRichiesta.mockResolvedValue(richiesta);
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaRichiesta).toHaveBeenCalledWith('bulli', expect.objectContaining({ dedalo: null, areaDedalo: null, confidente: null, confidenteRango: null })));
});

it('una nuova nasce nel dedalo e nell’area dati; senza nome o bersaglio, o con numeri sbagliati, non parte e lo dice', async () => {
  const { onChiudi } = monta(null, { dedalo: 'aiy', areaDedalo: 'aiy-2' });
  expect(await screen.findByRole('dialog', { name: 'Aggiungi una Richiesta' })).toBeInTheDocument();
  expect(valoreSelettore('Dedalo')).toBe('Dedalo di Aiyatsbus');
  expect(valoreSelettore('Area del dedalo')).toBe('Binari');
  expect(screen.queryByRole('button', { name: 'Elimina' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il nome della Richiesta è obbligatorio.'));
  fireEvent.change(campo('Nome'), { target: { value: 'Il cartello' } });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il nome del bersaglio è obbligatorio (o scegli l’Ombra del compendio).'));
  fireEvent.change(campo('Bersaglio (nome nella Richiesta)'), { target: { value: 'Ombra' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Livello' }), { target: { value: '200' } });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Livello del bersaglio: un numero intero da 1 a 99 (vuoto = nessuno).'));
  expect(api.creaRichiesta).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Livello' }), { target: { value: '' } });
  api.creaRichiesta.mockResolvedValue({ ...richiesta, chiave: 'il-cartello', nome: 'Il cartello' });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(api.creaRichiesta).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Il cartello', dedalo: 'aiy', areaDedalo: 'aiy-2', bersaglio: expect.objectContaining({ nome: 'Ombra', livello: null }), confidente: null })));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
});

it('«Elimina» dice prima chi la cita nella domanda di conferma, e solo dopo il «sì» la elimina', async () => {
  const { onCambiata } = monta('bulli');
  await screen.findByRole('dialog');
  api.getCitazioniRichiesta.mockResolvedValue({ partite: 2, pin: ['Cartello'], condizioni: ['Libro: Il Principe'], requisiti: ['Futaba Sakura, rango 7'], azioni: 1, effetti: [], sblocchi: 0 });
  // risposta «no» alla domanda: non si elimina niente
  conferma.mockResolvedValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  await waitFor(() => expect(conferma).toHaveBeenCalledTimes(1));
  const domanda = conferma.mock.calls[0][0] as { titolo: string; testo: string };
  expect(domanda.titolo).toBe('Eliminare «Bullismo sui bulli» per tutte le partite?');
  expect(domanda.testo).toContain('Lo stato segnato in 2 partite se ne va con lei.');
  expect(domanda.testo).toContain('il pin: Cartello (restano sulla mappa)');
  expect(domanda.testo).toContain('Perdono il collegamento 1 azione della giornata (restano, col loro testo).');
  expect(domanda.testo).toContain('Restano, da correggere, le condizioni di: Libro: Il Principe.');
  expect(domanda.testo).toContain('Restano, da correggere, i requisiti dei Confidenti: Futaba Sakura, rango 7.');
  expect(api.eliminaRichiesta).not.toHaveBeenCalled();
  // risposta «sì»: elimina
  conferma.mockResolvedValueOnce(true);
  api.eliminaRichiesta.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  await waitFor(() => expect(api.eliminaRichiesta).toHaveBeenCalledWith('bulli'));
  await waitFor(() => expect(onCambiata).toHaveBeenCalled());
});

it('i comandi stanno nel piè fisso della finestra, non nel corpo che scorre', async () => {
  monta('bulli');
  const finestra = await screen.findByRole('dialog');
  const piede = finestra.querySelector('.modal-footer') as HTMLElement;
  for (const nome of ['Elimina', 'Annulla', 'Salva']) expect(within(piede).getByRole('button', { name: nome })).toBeInTheDocument();
  expect(within(finestra.querySelector('.modal-body') as HTMLElement).queryByRole('button', { name: 'Salva' })).toBeNull();
});

it('una Richiesta che non c’è più lo dice', async () => {
  monta('sparita');
  expect(await screen.findByText('Questa Richiesta non c’è più.')).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('form')).toBeNull();
});
