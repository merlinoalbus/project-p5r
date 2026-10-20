/** @vitest-environment jsdom */
// ============================================================
// Test AreeDelDedalo — un dedalo dei Memento, un'area per volta coi suoi quattro elementi (099, progetto del 2026-10-12)
// ============================================================

import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { scegliVoce, vociSelettore } from '../../../test/selettore';
import { AreeDelDedalo } from './AreeDelDedalo';
import { contiDelDedalo } from '../../utils/dedali';
import type { AreaDedaloDto, AreaDungeonDto, PuntoInteresseDto } from '../../types';

const api = vi.hoisted(() => ({
  aggiornaAreaDedalo: vi.fn(), collocaRichiesta: vi.fn(), creaAreaDedalo: vi.fn(), eliminaAreaDedalo: vi.fn(), impostaStatoRichiesta: vi.fn(),
  impostaTimbri: vi.fn(), spostaAreaDedalo: vi.fn(), creaPunto: vi.fn(), aggiornaPunto: vi.fn(), eliminaPunto: vi.fn(), spostaPunto: vi.fn(), collegaPinAlPunto: vi.fn(),
  getRichieste: vi.fn(), getConfidenti: vi.fn(), creaRichiesta: vi.fn(), aggiornaRichiesta: vi.fn(), getPersone: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Una voce della guida nell'area del dedalo data. */
const voce = (chiave: string, nome: string, areaDedalo: string, stato: PuntoInteresseDto['stato'] = null): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo: 'trama', nome, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato, marcatore: null, pin: [], contenitore: null, areaDedalo, persona: null, areeDedalo: [],
});
/** Una voce Persona del dedalo, nelle aree date. */
const persona = (chiave: string, id: number, nome: string, aree: string[]): PuntoInteresseDto => ({
  ...voce(chiave, `Ombra di ${nome}`, ''), tipo: 'persona', areaDedalo: null, areeDedalo: aree, persona: { id, nome, nomeIt: nome }, dettagli: { maschera: nome },
});
/** Un'area del dedalo di prova, con i campi di `extra` che sovrascrivono i predefiniti. */
const areaDedalo = (extra: Partial<AreaDedaloDto>): AreaDedaloDto => ({ chiave: 'a', ordine: 0, nome: 'Area', descrizione: '', timbri: null, richieste: [], elementi: { totale: 0, fatti: 0 }, completata: true, ...extra });

type Dedalo = AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> };
/** Qimranut con due aree: «Treno» (una voce esaurita, completata) e «Banchina» (una voce da fare, una Richiesta aperta, timbri 1
 *  su 3; Pixie catturata, Bicorno no); una Richiesta da collocare e una Persona senza area. */
const dedalo = (): Dedalo => ({
  chiave: 'mementos-01-qimranut', ordine: 0, nome: 'Dedalo di Qimranut', descrizione: 'La prima discesa.', mappe: [],
  punti: [voce('v1', 'Ombra della banchina', 'q-1'), voce('v2', 'Nota del treno', 'q-2', 'esaurito'), persona('p1', 11, 'Pixie', ['q-1', 'q-2']), persona('p2', 12, 'Bicorno', ['q-1']), persona('p3', 13, 'Slime', [])],
  dedalo: {
    aree: [
      areaDedalo({ chiave: 'q-2', ordine: 0, nome: 'Treno', elementi: { totale: 1, fatti: 1 }, completata: true }),
      areaDedalo({ chiave: 'q-1', ordine: 1, nome: 'Banchina', descrizione: 'Il binario morto.', timbri: { totale: 3, raccolti: 1 }, richieste: [{ chiave: 'r1', nome: 'Un ex appiccicoso', stato: null }], elementi: { totale: 5, fatti: 1 }, completata: false }),
    ],
    daCollocare: [{ chiave: 'r2', nome: 'Richiesta senza casa', stato: 'accettata' }],
    obiettivi: { totale: 6, fatti: 2 }, completato: false,
  },
});

/** L'indirizzo corrente, per vedere l'area aperta (`zona`). */
function Indirizzo() { const l = useLocation(); return <output data-testid="indirizzo">{l.search}</output>; }

/** Disegna il dedalo (partita 4) con «Modifica la guida» spento o acceso, e restituisce i richiami. */
function monta(d = dedalo(), partitaId: number | null = 4, opz: { modifica?: boolean; zona?: string } = {}) {
  const richiami = {
    cambiaStato: vi.fn().mockResolvedValue(true), onPuntoAggiornato: vi.fn(), onTimbri: vi.fn(), onRichiesta: vi.fn(), onRicarica: vi.fn().mockResolvedValue(undefined),
    onCattura: vi.fn().mockResolvedValue(undefined), onScegliDedalo: vi.fn(), onApriPozzo: vi.fn(), onModifica: vi.fn(),
  };
  /** Tiene «Modifica la guida» come la pagina. */
  function Prova() {
    const [modifica, setModifica] = useState(!!opz.modifica);
    return <AreeDelDedalo dedalo={d} dedali={[d, { ...d, chiave: 'mementos-02-aiyatsbus', ordine: 1, nome: 'Dedalo di Aiyatsbus' }]} partitaId={partitaId} catturate={partitaId ? new Set<number>([11]) : null}
      modifica={modifica} {...richiami} onModifica={(v) => { richiami.onModifica(v); setModifica(v); }} />;
  }
  render(<MemoryRouter initialEntries={[`/guida/dungeon/mementos?area=${d.chiave}${opz.zona ? `&zona=${opz.zona}` : ''}`]}><Prova /><Indirizzo /></MemoryRouter>);
  return richiami;
}

beforeEach(() => { vi.clearAllMocks(); });

it('la scheda del dedalo dice il conto per elemento, la barra e la percentuale; le aree sono schede e si apre la prima da fare', () => {
  monta();
  const scheda = screen.getByRole('region', { name: 'Scheda di Dedalo di Qimranut' });
  expect(within(scheda).getByRole('heading', { name: /Dedalo di Qimranut/ })).toBeInTheDocument();
  expect(within(scheda).getByText('Timbri 1/3 (1 area senza totale) · Richieste 0/1 · Trama 1/2 · Persona 1/3 catturate')).toBeInTheDocument();
  expect(within(scheda).getByText('33%')).toBeInTheDocument();
  expect(within(scheda).getByRole('progressbar', { name: 'Elementi di Dedalo di Qimranut' })).toHaveAttribute('aria-valuenow', '2');
  // le schede: la completata col ✓, l'altra col conto; aperta la prima da fare (Banchina), non la prima in ordine
  const schede = screen.getAllByRole('tab');
  expect(schede.map((s) => s.textContent)).toEqual(['Treno (completata)', 'Banchina · 1/5']);
  expect(screen.getByRole('tab', { name: 'Banchina · 1/5' })).toHaveAttribute('aria-selected', 'true');
  const pannello = screen.getByRole('tabpanel');
  expect(pannello).toHaveTextContent('Il binario morto.');
  // i quattro elementi, in ordine: Timbri, Persona, Richieste, Trama
  expect(within(pannello).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Timbri · 1/3', 'Persona · 1/2 catturate', 'Richieste · 0/1', 'Trama · 0/1']);
  // le voci di un'area stanno nella sua Trama, non in quella dell'altra
  expect(within(pannello).getByRole('list', { name: 'Trama di Banchina' })).toHaveTextContent('Ombra della banchina');
  expect(within(pannello).queryByText('Nota del treno')).toBeNull();
  // un'altra scheda apre la sua area e la scrive nell'indirizzo
  fireEvent.click(screen.getByRole('tab', { name: /Treno/ }));
  expect(screen.getByTestId('indirizzo').textContent).toContain('zona=q-2');
  expect(within(screen.getByRole('tabpanel')).getByRole('list', { name: 'Trama di Treno' })).toHaveTextContent('Nota del treno');
});

it('da tastiera le schede delle aree si raggiungono con Tab solo sull\'aperta e si cambiano con frecce, Inizio e Fine', () => {
  monta();
  const [treno, banchina] = screen.getAllByRole('tab');
  expect([treno.tabIndex, banchina.tabIndex]).toEqual([-1, 0]);
  fireEvent.keyDown(banchina, { key: 'ArrowRight' });
  // dopo l'ultima si torna alla prima, e il fuoco la segue
  expect(screen.getByRole('tab', { name: /Treno/ })).toHaveAttribute('aria-selected', 'true');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Treno/ }));
  fireEvent.keyDown(screen.getByRole('tab', { name: /Treno/ }), { key: 'End' });
  expect(screen.getByRole('tab', { name: /Banchina/ })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: /Banchina/ }), { key: 'ArrowLeft' });
  expect(screen.getByRole('tab', { name: /Treno/ })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: /Treno/ }), { key: 'a' });
  expect(screen.getByRole('tab', { name: /Treno/ })).toHaveAttribute('aria-selected', 'true');
});

it('l\'area dell\'indirizzo si apre; il conto per elemento conta i timbri solo delle aree con un totale', () => {
  monta(dedalo(), 4, { zona: 'q-2' });
  expect(screen.getByRole('tab', { name: /Treno/ })).toHaveAttribute('aria-selected', 'true');
  expect(contiDelDedalo(dedalo(), new Set([11, 12]))).toEqual({
    timbri: { fatti: 1, totale: 3, daImpostare: 1 }, richieste: { fatti: 0, totale: 1 }, trama: { fatti: 1, totale: 2 }, persona: { fatti: 2, totale: 3 },
  });
});

it('in «Gioca» solo i comandi per segnare: timbri, catture, Richieste a tre stati e caselle della Trama', async () => {
  const { onTimbri, onRichiesta, cambiaStato, onCattura } = monta();
  // niente comandi per sistemare la guida
  for (const nome of [/Aggiungi un’area/, /^Sposta/, /^Modifica area/, /Imposta il totale|Cambia il totale/, /^Aggiungi una Persona/, /^Aggiungi una Richiesta/]) expect(screen.queryByRole('button', { name: nome })).toBeNull();
  expect(screen.queryByRole('combobox', { name: /^Area di / })).toBeNull();
  expect(screen.getByText(/1 Richiesta del dedalo non sta in nessuna area e non conta: si colloca in «Modifica la guida»\./)).toBeInTheDocument();
  // timbri
  api.impostaTimbri.mockResolvedValue({ area: 'q-1', raccolti: 3, totale: 3, completato: true });
  fireEvent.click(screen.getByRole('button', { name: 'Timbro 3 di 3: da prendere' }));
  await waitFor(() => expect(onTimbri).toHaveBeenCalledWith('q-1', 3));
  expect(api.impostaTimbri).toHaveBeenCalledWith(4, 'q-1', 3);
  // Richiesta: «Fatta» è completata
  api.impostaStatoRichiesta.mockResolvedValue({ chiave: 'r1', stato: 'completata' });
  const stato = screen.getByRole('radiogroup', { name: 'Stato di «Un ex appiccicoso»' });
  expect(within(stato).getByRole('radio', { name: '—' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(within(stato).getByRole('radio', { name: 'Fatta' }));
  await waitFor(() => expect(onRichiesta).toHaveBeenCalledWith('r1', 'completata'));
  expect(api.impostaStatoRichiesta).toHaveBeenCalledWith(4, 'r1', 'completata');
  // Trama
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ombra della banchina' }));
  await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'v1' }), 'ottenuto'));
  // Persona: Bicorno si cattura con un tocco
  fireEvent.click(screen.getByRole('button', { name: 'Bicorno (Ombra di Bicorno): da catturare' }));
  await waitFor(() => expect(onCattura).toHaveBeenCalledWith(12, true));
});

it('l\'interruttore porta in «Modifica la guida»: le aree si aggiungono, si spostano, si correggono e si eliminano', async () => {
  const { onRicarica, onModifica } = monta();
  fireEvent.click(screen.getByRole('button', { name: 'Modifica la guida' }));
  expect(onModifica).toHaveBeenCalledWith(true);
  expect(screen.getByRole('button', { name: 'Modifica la guida' })).toHaveAttribute('aria-pressed', 'true');
  // aggiungere un'area la apre
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un’area' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nuova area' }), { target: { value: 'Sala d’attesa' } });
  api.creaAreaDedalo.mockResolvedValue({ chiave: 'q-3' });
  fireEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));
  await waitFor(() => expect(api.creaAreaDedalo).toHaveBeenCalledWith('mementos-01-qimranut', { nome: 'Sala d’attesa' }));
  await waitFor(() => expect(screen.getByTestId('indirizzo').textContent).toContain('zona=q-3'));
  expect(onRicarica).toHaveBeenCalledTimes(1);
  // spostare: Banchina è l'ultima, non scende
  fireEvent.click(screen.getByRole('tab', { name: /Banchina/ }));
  expect(screen.getByRole('button', { name: 'Sposta dopo l’area Banchina' })).toBeDisabled();
  api.spostaAreaDedalo.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: 'Sposta prima l’area Banchina' }));
  await waitFor(() => expect(api.spostaAreaDedalo).toHaveBeenCalledWith('q-1', -1));
  // correggere nome e dettagli (il totale dei timbri sta nella sua sezione)
  fireEvent.click(screen.getByRole('button', { name: /^Modifica area: l’area «Banchina»/ }));
  const modulo = screen.getByRole('form', { name: 'Correggi l’area «Banchina»' });
  fireEvent.change(within(modulo).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Binario' } });
  api.aggiornaAreaDedalo.mockResolvedValue({});
  fireEvent.click(within(modulo).getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaAreaDedalo).toHaveBeenCalledWith('q-1', { nome: 'Binario', descrizione: 'Il binario morto.' }));
  // eliminare chiede conferma e dice che cosa se ne va; l'area esce dall'indirizzo
  fireEvent.click(screen.getByRole('button', { name: /^Modifica area: l’area «Banchina»/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  expect(screen.getByText(/le sue voci di Trama con quel che ne avevano segnato, e i suoi timbri\. Le sue Richieste restano nel dedalo, da collocare; le Persona perdono solo questa area\. Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  api.eliminaAreaDedalo.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(api.eliminaAreaDedalo).toHaveBeenCalledWith('q-1'));
  await waitFor(() => expect(screen.getByTestId('indirizzo').textContent).not.toContain('zona='));
});

it('in «Modifica la guida»: totale dei timbri, Richieste da spostare e da collocare, Persona senza area', async () => {
  const { onRicarica } = monta(dedalo(), 4, { modifica: true });
  // il totale dei timbri dell'area: non valido non parte, vuoto toglie i timbri
  fireEvent.click(screen.getByRole('button', { name: 'Cambia il totale dei timbri di Banchina' }));
  const campo = screen.getByRole('textbox', { name: 'Timbri dell’area (vuoto = nessuno)' });
  expect(campo).toHaveValue('3');
  fireEvent.change(campo, { target: { value: 'tanti' } });
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  expect(api.aggiornaAreaDedalo).not.toHaveBeenCalled();
  fireEvent.change(campo, { target: { value: '' } });
  api.aggiornaAreaDedalo.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.aggiornaAreaDedalo).toHaveBeenCalledWith('q-1', { timbriTotale: null }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
  // le Richieste: in un'altra area o da collocare
  expect(vociSelettore('Area di Un ex appiccicoso')).toEqual(['— da collocare —', 'Treno', 'Banchina']);
  api.collocaRichiesta.mockResolvedValue({});
  scegliVoce('Area di Un ex appiccicoso', 'Treno');
  await waitFor(() => expect(api.collocaRichiesta).toHaveBeenCalledWith('r1', 'q-2'));
  const daCollocare = screen.getByRole('region', { name: 'Richieste da collocare dell’area' });
  expect(daCollocare).toHaveTextContent('Richiesta senza casa');
  scegliVoce('Area di Richiesta senza casa', 'Banchina');
  await waitFor(() => expect(api.collocaRichiesta).toHaveBeenCalledWith('r2', 'q-1'));
  // la Persona senza area si vede solo qui, e si corregge
  const senza = screen.getByRole('region', { name: 'Persona senza area dell’area' });
  expect(senza).toHaveTextContent('Slime');
  api.getPersone.mockResolvedValue([]);
  fireEvent.click(within(senza).getByRole('button', { name: 'Modifica: Slime' }));
  expect(await screen.findByRole('dialog', { name: 'Modifica: Slime' })).toBeInTheDocument();
});

it('senza partita: i conti sono i totali, niente comandi di stato; un dedalo senza aree lo dice', () => {
  monta(dedalo(), null);
  expect(screen.getByText('Timbri 3 (1 area senza totale) · Richieste 1 · Trama 2 · Persona 3')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.queryByRole('radiogroup')).toBeNull();
  expect(screen.getByRole('button', { name: /^Timbro 1 di 3/ })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Ombra della banchina' })).toBeDisabled();
  expect(screen.getByText(/per segnare timbri, catture, Richieste e Trama/)).toBeInTheDocument();
});

it('un dedalo senza aree lo dice (in «Gioca» rimanda a «Modifica la guida»); vi si aggiunge una Richiesta, da collocare', async () => {
  const vuoto = dedalo();
  vuoto.dedalo = { aree: [], daCollocare: [], obiettivi: { totale: 0, fatti: 0 }, completato: true };
  monta(vuoto);
  expect(screen.getByRole('heading', { name: 'Dedalo di Qimranut (completata)' })).toBeInTheDocument();
  expect(screen.getByText('Questo dedalo non ha ancora aree: si aggiungono in «Modifica la guida».')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Modifica la guida' }));
  expect(screen.getByText('Questo dedalo non ha ancora aree: aggiungine una qui sotto.')).toBeInTheDocument();
  api.getRichieste.mockResolvedValue({ richieste: [], jose: null, dedali: [], completate: 0, totale: 0, collocazioni: [{ chiave: 'mementos-01-qimranut', nome: 'Dedalo di Qimranut', aree: [] }] });
  api.getConfidenti.mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una Richiesta in Dedalo di Qimranut' }));
  const finestra = await screen.findByRole('dialog', { name: 'Aggiungi una Richiesta' });
  expect(within(finestra).getByRole('combobox', { name: 'Area del dedalo' })).toHaveTextContent('— da collocare —');
});

it('«Modifica» su una Richiesta e «Aggiungi» nella sezione aprono il modulo (nell\'area aperta); salvata, la scheda si rilegge', async () => {
  const { onRicarica } = monta(dedalo(), 4, { modifica: true, zona: 'q-2' });
  api.getRichieste.mockResolvedValue({ richieste: [], jose: null, dedali: [], completate: 0, totale: 0,
    collocazioni: [{ chiave: 'mementos-01-qimranut', nome: 'Dedalo di Qimranut', aree: [{ chiave: 'q-1', nome: 'Banchina' }, { chiave: 'q-2', nome: 'Treno' }] }] });
  api.getConfidenti.mockResolvedValue([]);
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

it('sul telefono: la tendina dei dedali e il menu ⋯ con l\'interruttore e il pozzo', () => {
  const { onScegliDedalo, onApriPozzo, onModifica } = monta();
  expect(vociSelettore('Dedalo')).toEqual(['1. Dedalo di Qimranut', '2. Dedalo di Aiyatsbus']);
  scegliVoce('Dedalo', /^2. Dedalo di Aiyatsbus/);
  expect(onScegliDedalo).toHaveBeenCalledWith('mementos-02-aiyatsbus');
  fireEvent.click(screen.getByRole('button', { name: 'Altri comandi' }));
  expect(screen.getByRole('button', { name: 'Altri comandi' })).toHaveAttribute('aria-expanded', 'true');
  // l'interruttore c'è due volte (riga e menu, uno nascosto dal CSS per formato): quello del menu
  fireEvent.click(screen.getAllByRole('button', { name: 'Modifica la guida' })[1]);
  expect(onModifica).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: /Pozzo dei Memento/ }));
  expect(onApriPozzo).toHaveBeenCalled();
});
