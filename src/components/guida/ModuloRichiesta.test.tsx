/** @vitest-environment jsdom */
// ============================================================
// Test ModuloRichiesta — correggere, aggiungere ed eliminare una Richiesta (2026-10-11): campi, dove, controlli, avviso
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, vociSelettore, valoreSelettore } from '../../../test/selettore';
import { ModuloRichiesta } from './ModuloRichiesta';
import { notifica } from '../../stores/notificationStore';
import type { RichiestaDto, RichiesteDto } from '../../types';

const api = vi.hoisted(() => ({ getRichieste: vi.fn(), getConfidenti: vi.fn(), aggiornaRichiesta: vi.fn(), creaRichiesta: vi.fn(), getCitazioniRichiesta: vi.fn(), eliminaRichiesta: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

const richiesta: RichiestaDto = {
  chiave: 'bulli', nome: 'Bullismo sui bulli', committente: 'Mishima', disponibileDal: '20 maggio', scadenza: '', area: 'Dedalo di Aiyatsbus', areaChiave: 'aiy', piano: 'Area 3',
  bersaglio: { nome: 'Kazuo', livello: 10, formaDemoniaca: 'Ippon-Datara', debolezze: ['Fuoco', 'Ghiaccio'], resistenze: ['Vento'], vulnerabileConfusione: false },
  ricompense: ['485 PE', 'Pozione'], confidente: { chiave: 'ryuji', nome: 'Ryuji Sakamoto', rango: 2 }, areaNome: 'Dedalo di Aiyatsbus', areaOrdine: 1,
  areaDedalo: 'aiy-1', areaDedaloNome: 'Area 1', note: 'Facile.', fonte: '', stato: null,
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
});

it('si apre coi campi della Richiesta e salva i dati veri: righe in elenchi, numeri, dedalo e area', async () => {
  const { onChiudi, onCambiata } = monta('bulli');
  expect(await screen.findByRole('dialog', { name: 'Modifica: Bullismo sui bulli' })).toBeInTheDocument();
  expect(campo('Nome')).toHaveValue('Bullismo sui bulli');
  expect(campo('Debolezze (una per riga)')).toHaveValue('Fuoco\nGhiaccio');
  expect(campo('Ricompense (una per riga)')).toHaveValue('485 PE\nPozione');
  expect(valoreSelettore('Dedalo')).toBe('Dedalo di Aiyatsbus');
  expect(valoreSelettore('Area del dedalo')).toBe('Area 1');
  expect(valoreSelettore('Confidente')).toBe('Ryuji Sakamoto');
  // le aree offerte sono quelle del dedalo scelto, più «da collocare»
  expect(vociSelettore('Area del dedalo')).toEqual(['— da collocare —', 'Area 1', 'Binari']);
  scegliVoce('Area del dedalo', 'Binari');
  fireEvent.change(campo('Resistenze (una per riga)'), { target: { value: 'Vento\n\n Sacro ' } });
  fireEvent.change(campo('Livello'), { target: { value: '12' } });
  api.aggiornaRichiesta.mockResolvedValue(richiesta);
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaRichiesta).toHaveBeenCalledWith('bulli', {
    nome: 'Bullismo sui bulli', committente: 'Mishima', disponibileDal: '20 maggio', scadenza: '', dedalo: 'aiy', areaDedalo: 'aiy-2', piano: 'Area 3',
    bersaglio: { nome: 'Kazuo', formaDemoniaca: 'Ippon-Datara', livello: 12, debolezze: ['Fuoco', 'Ghiaccio'], resistenze: ['Vento', 'Sacro'], vulnerabileConfusione: false },
    ricompense: ['485 PE', 'Pozione'], confidente: 'ryuji', confidenteRango: 2, note: 'Facile.',
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
  scegliVoce('Confidente', '— nessuno —');
  expect(screen.queryByRole('textbox', { name: 'Rango' })).toBeNull();
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
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il nome del bersaglio è obbligatorio.'));
  fireEvent.change(campo('Bersaglio'), { target: { value: 'Ombra' } });
  fireEvent.change(campo('Livello'), { target: { value: '200' } });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Livello del bersaglio: un numero intero da 1 a 99 (vuoto = nessuno).'));
  expect(api.creaRichiesta).not.toHaveBeenCalled();
  fireEvent.change(campo('Livello'), { target: { value: '' } });
  api.creaRichiesta.mockResolvedValue({ ...richiesta, chiave: 'il-cartello', nome: 'Il cartello' });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi/ }));
  await waitFor(() => expect(api.creaRichiesta).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Il cartello', dedalo: 'aiy', areaDedalo: 'aiy-2', bersaglio: expect.objectContaining({ nome: 'Ombra', livello: null }), confidente: null })));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
});

it('«Elimina» dice prima chi la cita, e solo «Confermo» la elimina', async () => {
  const { onCambiata } = monta('bulli');
  await screen.findByRole('dialog');
  api.getCitazioniRichiesta.mockResolvedValue({ partite: 2, pin: ['Cartello'], condizioni: ['Libro: Il Principe'], requisiti: ['Futaba Sakura, rango 7'], azioni: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  const conferma = await screen.findByRole('region', { name: 'Conferma dell’eliminazione' });
  expect(conferma).toHaveTextContent('Lo stato segnato in 2 partite se ne va con lei.');
  expect(conferma).toHaveTextContent('il pin: Cartello (restano sulla mappa)');
  expect(conferma).toHaveTextContent('Perdono il collegamento 1 azione della giornata (restano, col loro testo).');
  expect(conferma).toHaveTextContent('Restano, da correggere, le condizioni di: Libro: Il Principe.');
  expect(conferma).toHaveTextContent('Restano, da correggere, i requisiti dei Confidenti: Futaba Sakura, rango 7.');
  // «No» torna indietro senza eliminare
  fireEvent.click(within(conferma).getByRole('button', { name: 'No' }));
  expect(api.eliminaRichiesta).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  api.eliminaRichiesta.mockResolvedValue(undefined);
  fireEvent.click(within(await screen.findByRole('region', { name: 'Conferma dell’eliminazione' })).getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(api.eliminaRichiesta).toHaveBeenCalledWith('bulli'));
  await waitFor(() => expect(onCambiata).toHaveBeenCalled());
});

it('una Richiesta che non c’è più lo dice', async () => {
  monta('sparita');
  expect(await screen.findByText('Questa Richiesta non c’è più.')).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('form')).toBeNull();
});
