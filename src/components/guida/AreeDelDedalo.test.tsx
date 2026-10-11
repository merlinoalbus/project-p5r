/** @vitest-environment jsdom */
// ============================================================
// Test AreeDelDedalo — le aree di un dedalo con i loro elementi (099): conteggi, ✓, comandi delle aree e delle Richieste
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { scegliVoce, vociSelettore } from '../../../test/selettore';
import { AreeDelDedalo } from './AreeDelDedalo';
import type { AreaDedaloDto, AreaDungeonDto, PuntoInteresseDto } from '../../types';

const api = vi.hoisted(() => ({
  aggiornaAreaDedalo: vi.fn(), collocaRichiesta: vi.fn(), creaAreaDedalo: vi.fn(), eliminaAreaDedalo: vi.fn(), impostaStatoRichiesta: vi.fn(),
  impostaTimbri: vi.fn(), spostaAreaDedalo: vi.fn(), creaPunto: vi.fn(), aggiornaPunto: vi.fn(), eliminaPunto: vi.fn(), spostaPunto: vi.fn(), collegaPinAlPunto: vi.fn(),
  getRichieste: vi.fn(), getConfidenti: vi.fn(), creaRichiesta: vi.fn(), aggiornaRichiesta: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Una voce della guida nell'area del dedalo data. */
const voce = (chiave: string, nome: string, areaDedalo: string, stato: PuntoInteresseDto['stato'] = null): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo: 'altro', nome, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato, marcatore: null, pin: [], contenitore: null, areaDedalo,
});
/** Un'area del dedalo di prova, con i campi di `extra` che sovrascrivono i predefiniti. */
const areaDedalo = (extra: Partial<AreaDedaloDto>): AreaDedaloDto => ({ chiave: 'a', ordine: 0, nome: 'Area', descrizione: '', timbri: null, richieste: [], elementi: { totale: 0, fatti: 0 }, completata: true, ...extra });

/** Qimranut con due aree: «Banchina» (una voce da fare, una Richiesta aperta, timbri 1 su 3) e «Treno» (una voce esaurita, completata);
 *  una Richiesta da collocare. */
const dedalo = (): AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> } => ({
  chiave: 'mementos-01-qimranut', ordine: 0, nome: 'Dedalo di Qimranut', descrizione: '', mappa: false, mappe: [],
  punti: [voce('v1', 'Ombra della banchina', 'q-1'), voce('v2', 'Nota del treno', 'q-2', 'esaurito')],
  dedalo: {
    aree: [
      areaDedalo({ chiave: 'q-1', nome: 'Banchina', descrizione: 'Il binario morto.', timbri: { totale: 3, raccolti: 1 }, richieste: [{ chiave: 'r1', nome: 'Un ex appiccicoso', stato: null }], elementi: { totale: 5, fatti: 1 }, completata: false }),
      areaDedalo({ chiave: 'q-2', ordine: 1, nome: 'Treno', elementi: { totale: 1, fatti: 1 }, completata: true }),
    ],
    daCollocare: [{ chiave: 'r2', nome: 'Richiesta senza casa', stato: 'accettata' }],
    obiettivi: { totale: 6, fatti: 2 }, completato: false,
  },
});

/** Disegna le aree del dedalo (partita 4) e restituisce i richiami. */
function monta(d = dedalo(), partitaId: number | null = 4) {
  const richiami = { cambiaStato: vi.fn().mockResolvedValue(true), onPuntoAggiornato: vi.fn(), onTimbri: vi.fn(), onRichiesta: vi.fn(), onRicarica: vi.fn().mockResolvedValue(undefined) };
  render(<MemoryRouter><AreeDelDedalo dedalo={d} partitaId={partitaId} {...richiami} /></MemoryRouter>);
  return richiami;
}

beforeEach(() => { vi.clearAllMocks(); });

it('mostra il conteggio del dedalo, le aree con i loro elementi e la ✓; un\'area completata è chiusa, le altre aperte', () => {
  monta();
  expect(screen.getByText('2/6 elementi')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Elementi di Dedalo di Qimranut' })).toHaveAttribute('aria-valuenow', '2');
  const elenco = screen.getByRole('list', { name: 'Elenco delle aree di Dedalo di Qimranut' });
  const [banchina, treno] = within(elenco).getAllByRole('listitem').filter((li) => li.parentElement === elenco);
  expect(within(banchina).getByText('1/5')).toBeInTheDocument();
  expect(banchina.querySelector('details')).toHaveAttribute('open');
  expect(within(banchina).getByText('Il binario morto.')).toBeInTheDocument();
  expect(within(banchina).getByText('1 su 3')).toBeInTheDocument();
  // le voci di ogni area stanno nella sua guida, non in quella dell'altra
  expect(within(banchina).getByRole('list', { name: 'Voci della guida di Banchina' })).toHaveTextContent('Ombra della banchina');
  expect(within(banchina).queryByText('Nota del treno')).toBeNull();
  // Treno è completata: ✓, nome accessibile, e chiusa
  expect(within(treno).getByText('(completata)')).toBeInTheDocument();
  expect(treno.querySelector('details')).not.toHaveAttribute('open');
  expect(screen.getByRole('region', { name: 'Richieste da collocare' })).toHaveTextContent('Richiesta senza casa');
});

it('i timbri si contano con −/+ nell\'area, le Richieste si segnano e si spostano fra le aree o si tolgono dall\'area', async () => {
  const { onTimbri, onRichiesta, onRicarica } = monta();
  api.impostaTimbri.mockResolvedValue({ area: 'q-1', raccolti: 2, totale: 3, completato: false });
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un timbro in Banchina' }));
  await waitFor(() => expect(api.impostaTimbri).toHaveBeenCalledWith(4, 'q-1', 2));
  expect(onTimbri).toHaveBeenCalledWith('q-1', 2);
  api.impostaStatoRichiesta.mockResolvedValue({ chiave: 'r1', stato: 'completata' });
  fireEvent.click(within(screen.getByRole('region', { name: 'Richieste di Banchina' })).getByRole('button', { name: 'Completata' }));
  await waitFor(() => expect(onRichiesta).toHaveBeenCalledWith('r1', 'completata'));
  // l'area di una Richiesta: le aree del dedalo e «da collocare»
  expect(vociSelettore('Area di Un ex appiccicoso')).toEqual(['— da collocare —', 'Banchina', 'Treno']);
  api.collocaRichiesta.mockResolvedValue({});
  scegliVoce('Area di Un ex appiccicoso', 'Treno');
  await waitFor(() => expect(api.collocaRichiesta).toHaveBeenCalledWith('r1', 'q-2'));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
  scegliVoce('Area di Richiesta senza casa', 'Banchina');
  await waitFor(() => expect(api.collocaRichiesta).toHaveBeenCalledWith('r2', 'q-1'));
  scegliVoce('Area di Un ex appiccicoso', '— da collocare —');
  await waitFor(() => expect(api.collocaRichiesta).toHaveBeenCalledWith('r1', null));
});

it('le aree si aggiungono, si spostano, si correggono (nome, dettagli, timbri; vuoto = nessun timbro) e si eliminano con l\'avviso', async () => {
  const { onRicarica } = monta();
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un’area' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nuova area' }), { target: { value: 'Sala d’attesa' } });
  api.creaAreaDedalo.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));
  await waitFor(() => expect(api.creaAreaDedalo).toHaveBeenCalledWith('mementos-01-qimranut', { nome: 'Sala d’attesa' }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalledTimes(1));
  // la prima area non sale, l'ultima non scende
  expect(screen.getByRole('button', { name: 'Sposta su l’area Banchina' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Sposta giù l’area Treno' })).toBeDisabled();
  api.spostaAreaDedalo.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: 'Sposta giù l’area Banchina' }));
  await waitFor(() => expect(api.spostaAreaDedalo).toHaveBeenCalledWith('q-1', 1));
  // la correzione: un totale non valido non parte, vuoto toglie i timbri
  fireEvent.click(screen.getByRole('button', { name: /^Modifica area: l’area «Banchina»/ }));
  const modulo = screen.getByRole('form', { name: 'Correggi l’area «Banchina»' });
  expect(within(modulo).getByRole('textbox', { name: 'Timbri dell’area (vuoto = nessuno)' })).toHaveValue('3');
  fireEvent.change(within(modulo).getByRole('textbox', { name: 'Timbri dell’area (vuoto = nessuno)' }), { target: { value: 'tanti' } });
  fireEvent.click(within(modulo).getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(screen.getByRole('form', { name: 'Correggi l’area «Banchina»' })).toBeInTheDocument());
  expect(api.aggiornaAreaDedalo).not.toHaveBeenCalled();
  fireEvent.change(within(modulo).getByRole('textbox', { name: 'Timbri dell’area (vuoto = nessuno)' }), { target: { value: '' } });
  fireEvent.change(within(modulo).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Binario' } });
  api.aggiornaAreaDedalo.mockResolvedValue({});
  fireEvent.click(within(modulo).getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaAreaDedalo).toHaveBeenCalledWith('q-1', { nome: 'Binario', descrizione: 'Il binario morto.', timbriTotale: null }));
  // l'eliminazione chiede conferma e dice che cosa se ne va
  fireEvent.click(screen.getByRole('button', { name: /^Modifica area: l’area «Treno»/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  expect(screen.getByText(/le sue voci con quel che ne avevano segnato, e i suoi timbri\. Le sue Richieste restano nel dedalo, da collocare\./)).toBeInTheDocument();
  api.eliminaAreaDedalo.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(api.eliminaAreaDedalo).toHaveBeenCalledWith('q-2'));
});

it('senza partita: niente comandi di stato, i conteggi sono i totali; un dedalo senza aree lo dice', () => {
  monta(dedalo(), null);
  expect(screen.getByText('2 aree · 6 elementi')).toBeInTheDocument();
  expect(screen.getByText('3 da raccogliere')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Aggiungi un timbro/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Completata' })).toBeNull();
  expect(screen.queryByRole('progressbar')).toBeNull();
});

it('un dedalo completato porta la ✓; uno senza aree invita ad aggiungerne, e una Richiesta vi si aggiunge lo stesso', async () => {
  const vuoto = dedalo();
  vuoto.dedalo = { aree: [], daCollocare: [], obiettivi: { totale: 0, fatti: 0 }, completato: true };
  monta(vuoto);
  expect(screen.getByRole('heading', { name: 'Aree del dedalo (completata)' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Questo dedalo non ha ancora aree: aggiungine una qui sotto.');
  // anche senza aree si aggiunge una Richiesta: nasce nel dedalo, da collocare
  api.getRichieste.mockResolvedValue({ richieste: [], jose: null, dedali: [], completate: 0, totale: 0, collocazioni: [{ chiave: 'mementos-01-qimranut', nome: 'Dedalo di Qimranut', aree: [] }] });
  api.getConfidenti.mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una Richiesta in Dedalo di Qimranut' }));
  const finestra = await screen.findByRole('dialog', { name: 'Aggiungi una Richiesta' });
  expect(within(finestra).getByRole('combobox', { name: 'Dedalo' })).toHaveTextContent('Dedalo di Qimranut');
  expect(within(finestra).getByRole('combobox', { name: 'Area del dedalo' })).toHaveTextContent('— da collocare —');
});

it('«Modifica» su una Richiesta e «Aggiungi una Richiesta» in un\'area aprono il modulo (nell\'area scelta); salvata, la scheda si rilegge', async () => {
  const { onRicarica } = monta();
  api.getRichieste.mockResolvedValue({ richieste: [{ chiave: 'r1', nome: 'Un ex appiccicoso', committente: '', disponibileDal: '', scadenza: '', area: 'Dedalo di Qimranut', areaChiave: 'mementos-01-qimranut', piano: '',
    bersaglio: { nome: 'Nakanohara', livello: null, formaDemoniaca: '', debolezze: [], resistenze: [], vulnerabileConfusione: false }, ricompense: [], confidente: null, areaNome: 'Dedalo di Qimranut', areaOrdine: 0,
    areaDedalo: 'q-1', areaDedaloNome: 'Banchina', note: '', fonte: '', stato: null }], jose: null, dedali: [], completate: 0, totale: 1,
  collocazioni: [{ chiave: 'mementos-01-qimranut', nome: 'Dedalo di Qimranut', aree: [{ chiave: 'q-1', nome: 'Banchina' }, { chiave: 'q-2', nome: 'Treno' }] }] });
  api.getConfidenti.mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Modifica la Richiesta «Un ex appiccicoso»' }));
  const finestra = await screen.findByRole('dialog', { name: 'Modifica: Un ex appiccicoso' });
  expect(within(finestra).getByRole('textbox', { name: 'Bersaglio' })).toHaveValue('Nakanohara');
  fireEvent.click(within(finestra).getByRole('button', { name: /^Annulla/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una Richiesta in Treno' }));
  const nuova = await screen.findByRole('dialog', { name: 'Aggiungi una Richiesta' });
  expect(within(nuova).getByRole('combobox', { name: 'Area del dedalo' })).toHaveTextContent('Treno');
  fireEvent.change(within(nuova).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Il treno fantasma' } });
  fireEvent.change(within(nuova).getByRole('textbox', { name: 'Bersaglio' }), { target: { value: 'Capotreno' } });
  api.creaRichiesta.mockResolvedValue({});
  fireEvent.click(within(nuova).getByRole('button', { name: /^Aggiungi$/ }));
  await waitFor(() => expect(api.creaRichiesta).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Il treno fantasma', dedalo: 'mementos-01-qimranut', areaDedalo: 'q-2' })));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
});
