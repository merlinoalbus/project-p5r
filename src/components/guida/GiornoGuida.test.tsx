// @vitest-environment jsdom
// ============================================================
// Test GiornoGuida — la giornata canone: «Di giorno» / «Di sera» con le voci nel loro ordine esatto (azioni della guida, cose
// da fare ed eventi aggiunti sono la stessa cosa); Modifica con il posto nella fascia, Sposta su/giù, Sposta di fascia, Elimina
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GiornoGuida } from './GiornoGuida';
import type { AzionePercorsoDto, PercorsoGiornoDto } from '../../types';

const api = vi.hoisted(() => ({
  creaVoceGiornata: vi.fn(), aggiornaVoceGiornata: vi.fn(), spostaVoceGiornata: vi.fn(), eliminaVoceGiornata: vi.fn(), impostaAzionePercorso: vi.fn(),
  getImmagini: vi.fn().mockResolvedValue([]), urlImmagine: vi.fn(() => '/x'), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
  getElenchiAzione: vi.fn(),
}));
const ELENCHI = {
  confidenti: [{ chiave: 'takemi', nome: 'Tae Takemi', dettaglio: 'Morte' }], dungeon: [{ chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }], richieste: [],
  libri: [{ chiave: 'zorro-il-fuorilegge', nome: 'Zorro, il fuorilegge' }], film: [], videogiochi: [],
  attivita: [{ chiave: 'lavoro-rafflesia', nome: 'Fioraio Rafflesia', turni: true }, { chiave: 'studio-leblanc', nome: 'Studio al Leblanc', turni: false }], negozi: [], doti: [],
};
vi.mock('../../services/api', () => api);
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));

const uid = (n: number) => n.toString(16).padStart(32, '0');
const voce = (p: Partial<AzionePercorsoDto> & Pick<AzionePercorsoDto, 'uid' | 'azione'>): AzionePercorsoDto => ({
  giorno: '04-12', fascia: 'giorno', genere: 'azione', tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: null,
  produce: [], produceTesto: [], fatta: false, effetti: null, stato: null, mappa: null, ...p,
});

const ZORRO = voce({ uid: uid(1), azione: 'Biblioteca: prendere Zorro', fatta: true, effetti: { doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 3, note: 2, cinema: false }], confidente: null } });
const PANE = voce({ uid: uid(2), azione: 'Comprare i Bionutrienti' });
const PALAZZO = voce({ uid: uid(3), azione: 'Palazzo di Kamoshida: infiltrazione', note: 'Oggetti principali' });
const CONSEGNA = voce({ uid: uid(4), azione: 'Consegna del Palazzo', fascia: 'sera', genere: 'scadenza' });

const base: PercorsoGiornoDto = {
  giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', trama: 'Primo accesso.', vincoli: [], meteo: null, avvisi: [], fonte: '', coperto: true,
  precedente: '04-11', successivo: '04-13', dataCorrente: '04-12', fatte: 1,
  // l'ordine esatto: la cosa da fare aggiunta dall'utente sta fra le due azioni della guida
  azioni: [ZORRO, PANE, PALAZZO, CONSEGNA],
  meteoPartita: null,
};

const disegna = (g: PercorsoGiornoDto = base, partitaId: number | null = 3) => {
  const ricarica = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><GiornoGuida g={g} partitaId={partitaId} onAggiorna={vi.fn()} onGiornataModificata={ricarica} /></MemoryRouter>);
  return ricarica;
};
const sezione = (nome: 'Di giorno' | 'Di sera') => screen.getByRole('region', { name: nome });
const apriMenu = (testo: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Modifica, sposta o elimina: ${testo}`) }));
const gestiDi = (testo: string) => within(screen.getByRole('group', { name: new RegExp(`^Gesti per: ${testo}`) }));

describe('GiornoGuida — la giornata canone', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.getImmagini.mockResolvedValue([]);
    api.getElenchiAzione.mockResolvedValue(ELENCHI);
    notifica.mockReset();
  });

  it('mostra le voci di ogni fascia nel loro ordine, senza cartellini «La mia» o «Corretta»; contano solo le azioni', () => {
    disegna();
    const righe = within(screen.getByRole('list', { name: 'Azioni di giorno' })).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(righe.map((t) => t.includes('Zorro') ? 'zorro' : t.includes('Bionutrienti') ? 'pane' : t.includes('infiltrazione') ? 'palazzo' : '?')).toEqual(['zorro', 'pane', 'palazzo']);
    const giorno = within(sezione('Di giorno'));
    expect(giorno.queryByText('La mia')).toBeNull();
    expect(giorno.queryByText('Corretta')).toBeNull();
    // 1 fatta su 3 azioni (la scadenza non si spunta e non conta)
    expect(giorno.getByRole('heading', { name: /Di giorno.*1 su 3/ })).toBeInTheDocument();
    const sera = within(sezione('Di sera'));
    expect(sera.getByText('Consegna del Palazzo')).toBeInTheDocument();
    expect(sera.getByText('Scadenza')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Fatto: Consegna/)).toBeNull();
    expect(screen.getByText('1 azioni fatte su 3.')).toBeInTheDocument();
    // niente più rimosse né correzioni da rivedere
    expect(screen.queryByText(/rimoss/)).toBeNull();
    expect(screen.queryByRole('group', { name: 'Correzioni da rivedere' })).toBeNull();
  });

  it('un giorno senza voci mostra comunque le due sezioni con «Aggiungi»', () => {
    disegna({ ...base, azioni: [] });
    expect(within(sezione('Di giorno')).getByText(/Niente di giorno per questo giorno/)).toBeInTheDocument();
    expect(within(sezione('Di sera')).getByText(/Niente di sera per questo giorno/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiungi di giorno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiungi di sera' })).toBeInTheDocument();
  });

  it('«Aggiungi» mostra il posto nella fascia: in fondo all\'inizio, poi su di un posto; crea la voce lì, per tutte le partite', async () => {
    api.creaVoceGiornata.mockResolvedValue({});
    const ricarica = disegna();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi di giorno' }));
    const finestra = screen.getByRole('dialog', { name: 'Aggiungi alla giornata' });
    expect(within(finestra).queryByText('Solo in questa partita')).toBeNull();
    expect(within(finestra).getByText(/per tutte le partite ed entra nel pacchetto/)).toBeInTheDocument();
    fireEvent.change(within(finestra).getByLabelText('Che cosa fare'), { target: { value: '  Passare dal Bagno pubblico  ' } });
    const posto = within(within(finestra).getByRole('group', { name: 'Posto nella giornata, di giorno' }));
    expect(posto.getByText('Posto nella giornata (di giorno): 4 di 4')).toBeInTheDocument();
    // in fondo: «giù» spento; due posti su → fra Zorro e i Bionutrienti
    expect(posto.getByRole('button', { name: 'Sposta giù di un posto' })).toBeDisabled();
    fireEvent.click(posto.getByRole('button', { name: 'Sposta su di un posto' }));
    fireEvent.click(posto.getByRole('button', { name: 'Sposta su di un posto' }));
    expect(posto.getByText('Posto nella giornata (di giorno): 2 di 4')).toBeInTheDocument();
    const righe = posto.getAllByRole('listitem').map((li) => li.textContent);
    expect(righe[1]).toContain('Passare dal Bagno pubblico');
    expect(righe[0]).toContain('Zorro');
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi' }));
    await waitFor(() => expect(api.creaVoceGiornata).toHaveBeenCalledWith('04-12', {
      genere: 'azione', azione: 'Passare dal Bagno pubblico', note: null, fascia: 'giorno', posizione: 1, tipo: 'altro', riferimento: null, rangoAtteso: null, produce: [],
    }, 3));
    await waitFor(() => expect(ricarica).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un evento di sera: il genere si sceglie, niente effetti, il posto in cima', async () => {
    api.creaVoceGiornata.mockResolvedValue({});
    disegna();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi di sera' }));
    const finestra = screen.getByRole('dialog', { name: 'Aggiungi alla giornata' });
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Evento' }));
    expect(within(finestra).getByRole('radio', { name: 'Di sera' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.change(within(finestra).getByLabelText('Che cosa succede'), { target: { value: 'Quiz televisivo' } });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sposta su di un posto' }));
    expect(within(finestra).getByRole('button', { name: 'Sposta su di un posto' })).toBeDisabled();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi' }));
    await waitFor(() => expect(api.creaVoceGiornata).toHaveBeenCalledWith('04-12', { genere: 'evento', azione: 'Quiz televisivo', note: null, fascia: 'sera', posizione: 0 }, 3));
  });

  it('senza partita non ci sono spunte, e la voce si crea senza partita', async () => {
    api.creaVoceGiornata.mockResolvedValue({});
    disegna(base, null);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi di giorno' }));
    const finestra = screen.getByRole('dialog');
    fireEvent.change(within(finestra).getByLabelText('Che cosa fare'), { target: { value: 'Passare dal Bagno pubblico' } });
    fireEvent.change(within(finestra).getByLabelText('Note'), { target: { value: 'di pomeriggio' } });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi' }));
    await waitFor(() => expect(api.creaVoceGiornata).toHaveBeenCalledWith('04-12', { genere: 'azione', azione: 'Passare dal Bagno pubblico', note: 'di pomeriggio', fascia: 'giorno', posizione: 3, tipo: 'altro', riferimento: null, rangoAtteso: null, produce: [] }, undefined));
  });

  it('modifica una voce: finestra precompilata col suo posto; cambiando fascia va in fondo all\'altra; il posto si manda solo se cambia', async () => {
    api.aggiornaVoceGiornata.mockResolvedValue({});
    const ricarica = disegna();
    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    // aprendo la finestra il menu della voce si chiude
    expect(screen.queryByRole('group', { name: /^Gesti per:/ })).toBeNull();
    expect(within(finestra).getByLabelText('Che cosa fare')).toHaveValue('Palazzo di Kamoshida: infiltrazione');
    expect(within(finestra).getByLabelText('Note')).toHaveValue('Oggetti principali');
    expect(within(finestra).getByText('Posto nella giornata (di giorno): 3 di 3')).toBeInTheDocument();
    // solo il testo: il posto non si manda
    fireEvent.change(within(finestra).getByLabelText('Che cosa fare'), { target: { value: 'Palazzo in un viaggio solo' } });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(3), {
      genere: 'azione', azione: 'Palazzo in un viaggio solo', note: 'Oggetti principali', fascia: 'giorno', tipo: 'altro', riferimento: null, rangoAtteso: null, produce: [],
    }, 3));
    await waitFor(() => expect(ricarica).toHaveBeenCalled());

    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const di_nuovo = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    fireEvent.click(within(di_nuovo).getByRole('radio', { name: 'Di sera' }));
    // di sera c'è la scadenza: in fondo è il secondo posto
    expect(within(di_nuovo).getByText('Posto nella giornata (di sera): 2 di 2')).toBeInTheDocument();
    fireEvent.click(within(di_nuovo).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenLastCalledWith(uid(3), expect.objectContaining({ fascia: 'sera', posizione: 1 }), 3));
  });

  it('modifica una voce spostandola nella stessa fascia: il posto nuovo si manda; una voce spuntata lo dice', async () => {
    api.aggiornaVoceGiornata.mockResolvedValue({});
    disegna();
    apriMenu('Biblioteca');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    // Zorro è spuntata: gli effetti nuovi valgono dalla prossima spunta
    expect(within(finestra).getByText(/già spuntata: gli effetti nuovi valgono dalla prossima spunta/)).toBeInTheDocument();
    expect(within(finestra).getByText('Posto nella giornata (di giorno): 1 di 3')).toBeInTheDocument();
    // in cima: «su» spento; due posti giù → in fondo
    expect(within(finestra).getByRole('button', { name: 'Sposta su di un posto' })).toBeDisabled();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sposta giù di un posto' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Sposta giù di un posto' }));
    expect(within(finestra).getByText('Posto nella giornata (di giorno): 3 di 3')).toBeInTheDocument();
    // arrivati in fondo «giù» si spegne: il fuoco passa a «su», la tastiera non lo perde
    await waitFor(() => expect(within(finestra).getByRole('button', { name: 'Sposta su di un posto' })).toHaveFocus());
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(1), expect.objectContaining({ fascia: 'giorno', posizione: 2 }), 3));
  });

  it('modifica tipo, collegamento, rango ed effetti (la Guida si modifica al 100%)', async () => {
    api.aggiornaVoceGiornata.mockResolvedValue({});
    const rafflesia = voce({ uid: uid(9), azione: 'Sbloccare il lavoro da fioraio Rafflesia', tipo: 'lavoro', produce: [{ tipo: 'turno', attivita: 'lavoro-rafflesia' }], produceTesto: ['Turno: Fioraio Rafflesia'] });
    disegna({ ...base, azioni: [rafflesia] });
    expect(screen.getByText('Il gioco dà: Turno: Fioraio Rafflesia')).toBeInTheDocument();
    apriMenu('Sbloccare il lavoro');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    await waitFor(() => expect(within(finestra).getByRole('combobox', { name: 'Tipo' })).toBeInTheDocument());
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli l\'effetto 1' }));
    expect(within(finestra).getByText('Nessun effetto: la spunta segna solo che l\'hai fatto.')).toBeInTheDocument();
    const scegli = (combo: string, testo: string) => {
      fireEvent.click(within(finestra).getByRole('combobox', { name: combo }));
      fireEvent.click(within(within(finestra).getByRole('listbox', { name: combo })).getByRole('button', { name: new RegExp(`^${testo}`) }));
    };
    scegli('Tipo', 'Confidente');
    scegli('Collegata a', 'Confidente');
    // a collegamento incompleto non si salva
    expect(within(finestra).getByRole('button', { name: 'Salva' })).toBeDisabled();
    scegli('Quale', 'Tae Takemi');
    scegli('Rango atteso', 'Rango 2');
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi un effetto' }));
    scegli('Dote', 'Coraggio');
    fireEvent.click(within(finestra).getByRole('radio', { name: '♪' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(9), {
      genere: 'azione', azione: 'Sbloccare il lavoro da fioraio Rafflesia', note: null, fascia: 'giorno', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2,
      produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }],
    }, 3));
  });

  it('un turno si sceglie solo fra le attività contate per volte; una lettura va completata prima di salvare', async () => {
    disegna({ ...base, azioni: [voce({ uid: uid(9), azione: 'Qualcosa' })] });
    apriMenu('Qualcosa');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    await waitFor(() => expect(within(finestra).getByRole('button', { name: 'Aggiungi un effetto' })).toBeInTheDocument());
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi un effetto' }));
    fireEvent.click(within(finestra).getByRole('combobox', { name: 'Effetto 1' }));
    fireEvent.click(within(within(finestra).getByRole('listbox', { name: 'Effetto 1' })).getByRole('button', { name: /^Turno/ }));
    expect(within(finestra).getByRole('button', { name: 'Salva' })).toBeDisabled();
    fireEvent.click(within(finestra).getByRole('combobox', { name: 'Attività (contata per volte)' }));
    const elenco = within(within(finestra).getByRole('listbox', { name: 'Attività (contata per volte)' }));
    expect(elenco.getByRole('button', { name: /^Fioraio Rafflesia/ })).toBeInTheDocument();
    expect(elenco.queryByRole('button', { name: /^Studio al Leblanc/ })).toBeNull();
  });

  it('dal menu: Sposta su / giù solo dove si può, il menu resta sulla voce per spostarla ancora; Sposta di sera', async () => {
    api.spostaVoceGiornata.mockResolvedValue([]);
    api.aggiornaVoceGiornata.mockResolvedValue({});
    disegna();
    apriMenu('Biblioteca');
    expect(gestiDi('Biblioteca').queryByRole('button', { name: 'Sposta su' })).toBeNull();
    fireEvent.click(gestiDi('Biblioteca').getByRole('button', { name: 'Sposta giù' }));
    await waitFor(() => expect(api.spostaVoceGiornata).toHaveBeenCalledWith(uid(1), 1, 3));
    // il menu è ancora aperto sulla stessa voce, con il fuoco sul gesto appena usato
    await waitFor(() => expect(screen.getByRole('group', { name: /^Gesti per: Biblioteca/ })).toBeInTheDocument());
    await waitFor(() => expect(gestiDi('Biblioteca').getByRole('button', { name: 'Sposta giù' })).toHaveFocus());
    apriMenu('Biblioteca');
    apriMenu('Palazzo di Kamoshida');
    expect(gestiDi('Palazzo').queryByRole('button', { name: 'Sposta giù' })).toBeNull();
    fireEvent.click(gestiDi('Palazzo').getByRole('button', { name: 'Sposta su' }));
    await waitFor(() => expect(api.spostaVoceGiornata).toHaveBeenCalledWith(uid(3), -1, 3));
    fireEvent.click(gestiDi('Palazzo').getByRole('button', { name: 'Sposta di sera' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(3), { fascia: 'sera' }, 3));
  });

  it('eliminare una voce non spuntata chiede conferma e la toglie dalla guida', async () => {
    api.eliminaVoceGiornata.mockResolvedValue(undefined);
    const ricarica = disegna();
    apriMenu('Comprare i Bionutrienti');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(api.eliminaVoceGiornata).not.toHaveBeenCalled();
    const finestra = screen.getByRole('dialog', { name: 'Eliminare la voce?' });
    expect(within(finestra).getByText(/esce dalla guida per tutte le partite/)).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(api.eliminaVoceGiornata).toHaveBeenCalledWith(uid(2)));
    await waitFor(() => expect(ricarica).toHaveBeenCalled());
  });

  it('una voce spuntata con effetti si elimina togliendo prima la spunta', async () => {
    api.impostaAzionePercorso.mockResolvedValue({});
    api.eliminaVoceGiornata.mockResolvedValue(undefined);
    disegna();
    apriMenu('Biblioteca');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    const finestra = screen.getByRole('dialog', { name: 'Eliminare una voce già spuntata?' });
    expect(within(finestra).getByText(/Coraggio \+3/)).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli la spunta ed elimina' }));
    await waitFor(() => expect(api.eliminaVoceGiornata).toHaveBeenCalledWith(uid(1)));
    expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(1), false);
    expect(api.impostaAzionePercorso.mock.invocationCallOrder[0]).toBeLessThan(api.eliminaVoceGiornata.mock.invocationCallOrder[0]);
  });

  it('spunta tolta ma eliminazione rifiutata (effetti in un\'altra partita): lo dice com\'è e la giornata si rilegge', async () => {
    api.impostaAzionePercorso.mockResolvedValue({});
    api.eliminaVoceGiornata.mockRejectedValue(new Error('Questa voce è spuntata con effetti in una partita («Altra»): togli prima la spunta in ciascuna per annullarne gli effetti, poi eliminala.'));
    const ricarica = disegna();
    apriMenu('Biblioteca');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminare una voce già spuntata?' })).getByRole('button', { name: 'Togli la spunta ed elimina' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringMatching(/^Spunta tolta e punti annullati in questa partita, ma la voce non è stata eliminata: .*«Altra»/)));
    expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(1), false);
    await waitFor(() => expect(ricarica).toHaveBeenCalled());
  });

  it('se il server rifiuta l\'eliminazione (spuntata con effetti in un\'altra partita) lo dice', async () => {
    api.eliminaVoceGiornata.mockRejectedValue(new Error('Questa voce è spuntata con effetti in una partita («Altra»): togli prima la spunta in ciascuna per annullarne gli effetti, poi eliminala.'));
    disegna();
    apriMenu('Comprare i Bionutrienti');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('«Altra»')));
  });

  it('una voce aggiunta è come un\'azione della guida: tipo, collegamento, «Il gioco dà», stato; un incontro chiede le note', async () => {
    api.impostaAzionePercorso.mockResolvedValue(voce({ uid: uid(11), azione: 'Clinica Takemi', fatta: true, effetti: { doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }], confidente: null } }));
    disegna({ ...base, azioni: [voce({
      uid: uid(11), azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 2,
      produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }], produceTesto: ['Coraggio, 1 nota'], stato: { tipo: 'consigliata', motivo: 'requisiti del rango 2 soddisfatti' },
    })] });
    const giorno = within(sezione('Di giorno'));
    expect(giorno.queryByText('La mia')).toBeNull();
    expect(giorno.getByText('Confidente')).toBeInTheDocument();
    expect(giorno.getByText('Il gioco dà: Coraggio, 1 nota')).toBeInTheDocument();
    expect(giorno.getByText(/^Consigliata/)).toBeInTheDocument();
    expect(giorno.getByText('rango atteso 2')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fatto: Clinica Takemi'));
    // prima si chiedono le note: nessuna chiamata finché non si sceglie
    expect(api.impostaAzionePercorso).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Note ottenute con il Confidente' })).getByRole('button', { name: '2 note' }));
    await waitFor(() => expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(11), true, 2));
    // le Doti si segnano a mano: l'avviso le ricorda invece di dirle date
    // (resta 7 secondi, come per ogni spunta che ha Doti da segnare)
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', 'Da segnare nelle Doti: Coraggio +2', 7000));
  });

  it('un evento: modifica il genere (resta dov\'è), sposta di giorno', async () => {
    api.aggiornaVoceGiornata.mockResolvedValue({});
    disegna();
    apriMenu('Consegna del Palazzo');
    fireEvent.click(screen.getByRole('button', { name: 'Sposta di giorno' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(4), { fascia: 'giorno' }, 3));
    apriMenu('Consegna del Palazzo');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    expect(within(finestra).getByRole('radio', { name: 'Scadenza' })).toHaveAttribute('aria-checked', 'true');
    // un evento non ha tipo, collegamento ed effetti
    expect(within(finestra).queryByRole('button', { name: 'Aggiungi un effetto' })).toBeNull();
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Promemoria' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenLastCalledWith(uid(4), { genere: 'promemoria', azione: 'Consegna del Palazzo', note: null, fascia: 'sera' }, 3));
    // la conferma dice che cosa si elimina: qui una scadenza
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    apriMenu('Consegna del Palazzo');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(screen.getByRole('dialog', { name: 'Eliminare la scadenza?' })).toBeInTheDocument();
  });

  it('un errore del server resta visibile e la finestra non si chiude', async () => {
    api.aggiornaVoceGiornata.mockRejectedValue(new Error('Il testo della voce non può essere vuoto.'));
    disegna();
    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il testo della voce non può essere vuoto.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
