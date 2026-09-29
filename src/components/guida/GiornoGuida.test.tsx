// @vitest-environment jsdom
// ============================================================
// Test GiornoGuida — la giornata modificabile: «Di giorno» / «Di sera» con eventi, azioni della guida e cose da fare
// dell'utente; Modifica, Sposta, Rimuovi, Ripristina; azioni rimosse da rimettere; correzioni superate; conferme
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { GiornoGuida } from './GiornoGuida';
import type { AzionePercorsoDto, PercorsoGiornoDto } from '../../types';

const api = vi.hoisted(() => ({
  correggiAzioneGuida: vi.fn(), rimuoviAzioneGuida: vi.fn(), riapplicaCorrezioneGuida: vi.fn(), ripristinaAzioneGuida: vi.fn(),
  impostaAzionePercorso: vi.fn(), creaAzioneAgenda: vi.fn(), creaEventoAgenda: vi.fn(), aggiornaAzioneAgenda: vi.fn(), aggiornaEventoAgenda: vi.fn(),
  eliminaAzioneAgenda: vi.fn(), eliminaEventoAgenda: vi.fn(), impostaAzioneAgendaFatta: vi.fn(),
  getImmagini: vi.fn().mockResolvedValue([]), urlImmagine: vi.fn(() => '/x'), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
}));
vi.mock('../../services/api', () => api);
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', () => ({ notifica }));

const azione = (p: Partial<AzionePercorsoDto> & Pick<AzionePercorsoDto, 'indice' | 'azione'>): AzionePercorsoDto => ({
  fascia: 'giorno', tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: null, fatta: false, effetti: null, stato: null, mappa: null, correzione: null, ...p,
});

const base: PercorsoGiornoDto = {
  giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', trama: 'Primo accesso.', vincoli: [], meteo: null, avvisi: [], fonte: '', coperto: true,
  precedente: '04-11', successivo: '04-13', dataCorrente: '04-12', fatte: 1,
  azioni: [
    azione({ indice: 0, azione: 'Biblioteca: prendere Zorro', fatta: true, effetti: { doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 3, note: 2, cinema: false }], confidente: null } }),
    azione({ indice: 1, azione: 'Palazzo di Kamoshida: infiltrazione', note: 'Oggetti principali', correzione: { azione: 'Palazzo: testo della guida', note: null, fascia: 'giorno' } }),
  ],
  rimosse: [{ indice: 2, fascia: 'sera', azione: 'Mansarda: fabbricare Grimaldelli' }],
  correzioniSuperate: [],
  agenda: {
    giorno: '04-12',
    eventi: [{ id: 5, partitaId: 3, giorno: '04-12', tipo: 'scadenza', fascia: 'sera', titolo: 'Consegna del Palazzo', dettaglio: '', riferimento: null, ordine: 1 }],
    azioni: [{ id: 10, partitaId: null, giorno: '04-12', fascia: 'giorno', tipo: 'altro', azione: 'Comprare i Bionutrienti', riferimento: null, rangoAtteso: null, note: null, ordine: 1, fatta: false }],
  },
};

const disegna = (g: PercorsoGiornoDto = base, partitaId: number | null = 3) => {
  const ricarica = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><GiornoGuida g={g} partitaId={partitaId} onAggiorna={vi.fn()} onGiornataModificata={ricarica} /></MemoryRouter>);
  return ricarica;
};
const sezione = (nome: 'Di giorno' | 'Di sera') => screen.getByRole('region', { name: nome });
const apriMenu = (voce: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Modifica, sposta o (rimuovi|elimina): ${voce}`) }));

/** La giornata come la tiene la pagina: dopo una modifica arriva la versione successiva dal «server». */
function GiornataViva({ versioni }: { versioni: PercorsoGiornoDto[] }) {
  const [n, setN] = useState(0);
  return <MemoryRouter><GiornoGuida g={versioni[n]} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={() => setN((x) => Math.min(x + 1, versioni.length - 1))} /></MemoryRouter>;
}

describe('GiornoGuida — giornata modificabile', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.getImmagini.mockResolvedValue([]);
    notifica.mockReset();
  });

  it('mette eventi, azioni della guida e cose da fare nella loro fascia; conta le cose da fare; le sezioni ci sono anche vuote', () => {
    disegna();
    const giorno = within(sezione('Di giorno'));
    expect(giorno.getByText('Biblioteca: prendere Zorro')).toBeInTheDocument();
    expect(giorno.getByText('Comprare i Bionutrienti')).toBeInTheDocument();
    expect(giorno.getByText('La mia')).toBeInTheDocument();
    expect(giorno.getByText('Corretta')).toBeInTheDocument();
    // 1 fatta su 3 (due della guida + una dell'utente)
    expect(giorno.getByRole('heading', { name: /Di giorno.*1 su 3/ })).toBeInTheDocument();
    const sera = within(sezione('Di sera'));
    expect(sera.getByText('Consegna del Palazzo')).toBeInTheDocument();
    expect(sera.getByText('Scadenza')).toBeInTheDocument();
    // l'evento non si spunta
    expect(screen.queryByLabelText(/^Fatto: Consegna/)).toBeNull();
    expect(screen.getByText('1 azioni fatte su 3.')).toBeInTheDocument();
    // «Le mie note» non c'è più
    expect(screen.queryByText('Le mie note')).toBeNull();
  });

  it('un giorno senza voci mostra comunque le due sezioni con «Aggiungi»', () => {
    disegna({ ...base, azioni: [], rimosse: [], agenda: { giorno: '04-12', eventi: [], azioni: [] } });
    expect(within(sezione('Di giorno')).getByText(/Niente di giorno per questo giorno/)).toBeInTheDocument();
    expect(within(sezione('Di sera')).getByText(/Niente di sera per questo giorno/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiungi di giorno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiungi di sera' })).toBeInTheDocument();
  });

  it('«Aggiungi» di sera crea un evento della partita in quella fascia e ricarica la giornata', async () => {
    api.creaEventoAgenda.mockResolvedValue({});
    const ricarica = disegna();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi di sera' }));
    const finestra = screen.getByRole('dialog', { name: 'Aggiungi alla giornata' });
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Evento' }));
    expect(within(finestra).getByRole('radio', { name: 'Di sera' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.change(within(finestra).getByLabelText('Che cosa succede'), { target: { value: '  Quiz televisivo  ' } });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi' }));
    await waitFor(() => expect(api.creaEventoAgenda).toHaveBeenCalledWith({ data: '04-12', tipo: 'evento', fascia: 'sera', titolo: 'Quiz televisivo', partitaId: 3 }));
    await waitFor(() => expect(ricarica).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('senza partita la cosa da fare vale per tutte le partite e non ci sono spunte', async () => {
    api.creaAzioneAgenda.mockResolvedValue({});
    disegna(base, null);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi di giorno' }));
    const finestra = screen.getByRole('dialog');
    expect(within(finestra).getByText('Senza una partita attiva la voce vale per tutte le partite.')).toBeInTheDocument();
    fireEvent.change(within(finestra).getByLabelText('Che cosa fare'), { target: { value: 'Passare dal Bagno pubblico' } });
    fireEvent.change(within(finestra).getByLabelText('Note'), { target: { value: 'di pomeriggio' } });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi' }));
    await waitFor(() => expect(api.creaAzioneAgenda).toHaveBeenCalledWith({ data: '04-12', fascia: 'giorno', azione: 'Passare dal Bagno pubblico', note: 'di pomeriggio', partitaId: null }));
  });

  it('modifica un\'azione della guida: la finestra è precompilata, mostra l\'originale e salva la correzione', async () => {
    api.correggiAzioneGuida.mockResolvedValue({});
    const ricarica = disegna();
    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica l\'azione della guida' });
    // aprendo la finestra il menu della voce si chiude: il prossimo tocco sul pulsante della riga lo riapre, non lo chiude
    expect(screen.queryByRole('group', { name: /^Gesti per:/ })).toBeNull();
    expect(within(finestra).getByLabelText('Che cosa fare')).toHaveValue('Palazzo di Kamoshida: infiltrazione');
    expect(within(finestra).getByLabelText('Note')).toHaveValue('Oggetti principali');
    expect(within(finestra).getByText('Palazzo: testo della guida')).toBeInTheDocument();
    expect(within(finestra).queryByText('Solo in questa partita')).toBeNull();
    fireEvent.change(within(finestra).getByLabelText('Che cosa fare'), { target: { value: 'Palazzo in un viaggio solo' } });
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Di sera' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.correggiAzioneGuida).toHaveBeenCalledWith('04-12', 1, { azione: 'Palazzo in un viaggio solo', note: 'Oggetti principali', fascia: 'sera' }));
    await waitFor(() => expect(ricarica).toHaveBeenCalled());
  });

  it('dal menu: sposta un\'azione della guida di sera e ripristina quella corretta', async () => {
    api.correggiAzioneGuida.mockResolvedValue({});
    api.ripristinaAzioneGuida.mockResolvedValue(undefined);
    disegna();
    apriMenu('Palazzo di Kamoshida');
    const gesti = screen.getByRole('group', { name: /^Gesti per: Palazzo/ });
    fireEvent.click(within(gesti).getByRole('button', { name: 'Sposta di sera' }));
    await waitFor(() => expect(api.correggiAzioneGuida).toHaveBeenCalledWith('04-12', 1, { fascia: 'sera' }));
    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Ripristina originale' }));
    await waitFor(() => expect(api.ripristinaAzioneGuida).toHaveBeenCalledWith('04-12', 1));
  });

  it('rimuove un\'azione della guida non spuntata senza chiedere: sparisce dalla lista e compare fra le rimosse, da dove si rimette', async () => {
    api.rimuoviAzioneGuida.mockResolvedValue({});
    const palazzo = base.azioni[1];
    const dopo: PercorsoGiornoDto = { ...base, azioni: [base.azioni[0]], rimosse: [...base.rimosse, { indice: 1, fascia: 'giorno', azione: palazzo.azione }] };
    render(<GiornataViva versioni={[base, dopo, base]} />);
    expect(within(sezione('Di giorno')).queryByText(/azioni? della guida rimoss/)).toBeNull();
    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }));
    await waitFor(() => expect(api.rimuoviAzioneGuida).toHaveBeenCalledWith('04-12', 1, true));
    // la giornata ricaricata: la riga non c'è più e sta fra le rimosse della sua fascia
    const lista = () => screen.getByRole('list', { name: 'Azioni di giorno' });
    await waitFor(() => expect(within(lista()).queryByText(palazzo.azione)).toBeNull());
    expect(within(sezione('Di giorno')).getByText('1 azione della guida rimossa')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Azioni rimosse di giorno' })).getByText(palazzo.azione)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Rimetti: ${palazzo.azione}` }));
    await waitFor(() => expect(api.rimuoviAzioneGuida).toHaveBeenCalledWith('04-12', 1, false));
    await waitFor(() => expect(within(lista()).getByText(palazzo.azione)).toBeInTheDocument());
    expect(within(sezione('Di giorno')).queryByText(/azioni? della guida rimoss/)).toBeNull();
  });

  it('il pulsante di riga dice il gesto di uscita giusto: «rimuovi» per la guida, «elimina» per le voci dell\'utente', () => {
    disegna();
    expect(screen.getByRole('button', { name: /^Modifica, sposta o rimuovi: Palazzo di Kamoshida/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Modifica, sposta o elimina: Comprare i Bionutrienti/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Modifica, sposta o elimina: Consegna del Palazzo/ })).toBeInTheDocument();
  });

  it('un\'azione con una correzione superata non offre gesti: la si rivede solo in «Correzioni da rivedere»', () => {
    disegna({ ...base, correzioniSuperate: [{ indice: 1, azioneAllora: 'Vecchia', azioneAttuale: base.azioni[1].azione, azioneCorretta: 'Mia', nascosta: false }] });
    expect(screen.queryByRole('button', { name: /^Modifica, sposta o rimuovi: Palazzo di Kamoshida/ })).toBeNull();
    expect(within(sezione('Di giorno')).getByText('Correzione da rivedere')).toBeInTheDocument();
    // le altre azioni li hanno ancora
    expect(screen.getByRole('button', { name: /^Modifica, sposta o rimuovi: Biblioteca/ })).toBeInTheDocument();
  });

  it('riapplicare una rimozione superata a un\'azione spuntata con punti chiede prima, come «Rimuovi»', async () => {
    api.impostaAzionePercorso.mockResolvedValue({});
    api.riapplicaCorrezioneGuida.mockResolvedValue({});
    disegna({ ...base, correzioniSuperate: [{ indice: 0, azioneAllora: 'Vecchia', azioneAttuale: base.azioni[0].azione, azioneCorretta: 'Mia', nascosta: true }] });
    expect(screen.getByText(/Avevi corretto «Vecchia» in «Mia» e poi l'avevi rimossa\./)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Correzioni da rivedere' })).getByRole('button', { name: /Riapplica/ }));
    expect(api.riapplicaCorrezioneGuida).not.toHaveBeenCalled();
    const finestra = screen.getByRole('dialog', { name: 'Riapplicare la rimozione a un\'azione spuntata?' });
    expect(within(finestra).getByText(/Coraggio \+3/)).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli la spunta e riapplica' }));
    await waitFor(() => expect(api.riapplicaCorrezioneGuida).toHaveBeenCalledWith('04-12', 0));
    expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, '04-12', 0, false);
    expect(api.impostaAzionePercorso.mock.invocationCallOrder[0]).toBeLessThan(api.riapplicaCorrezioneGuida.mock.invocationCallOrder[0]);
  });

  it('un\'azione spuntata con punti chiede prima: togliere la spunta (annulla i punti) e poi rimuovere', async () => {
    api.impostaAzionePercorso.mockResolvedValue({});
    api.rimuoviAzioneGuida.mockResolvedValue({});
    disegna();
    apriMenu('Biblioteca');
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }));
    const finestra = screen.getByRole('dialog', { name: 'Rimuovere un\'azione già spuntata?' });
    expect(within(finestra).getByText(/Coraggio \+3/)).toBeInTheDocument();
    expect(api.rimuoviAzioneGuida).not.toHaveBeenCalled();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli la spunta e rimuovi' }));
    await waitFor(() => expect(api.rimuoviAzioneGuida).toHaveBeenCalledWith('04-12', 0, true));
    expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, '04-12', 0, false);
    expect(api.impostaAzionePercorso.mock.invocationCallOrder[0]).toBeLessThan(api.rimuoviAzioneGuida.mock.invocationCallOrder[0]);
  });

  it('cosa da fare dell\'utente: spunta per la partita ed eliminazione solo dopo conferma', async () => {
    api.impostaAzioneAgendaFatta.mockResolvedValue({});
    api.eliminaAzioneAgenda.mockResolvedValue(undefined);
    disegna();
    fireEvent.click(screen.getByLabelText('Fatto: Comprare i Bionutrienti'));
    await waitFor(() => expect(api.impostaAzioneAgendaFatta).toHaveBeenCalledWith(10, 3, true));
    apriMenu('Comprare i Bionutrienti');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(api.eliminaAzioneAgenda).not.toHaveBeenCalled();
    const finestra = screen.getByRole('dialog', { name: 'Eliminare la cosa da fare?' });
    expect(within(finestra).getByText(/da tutte le partite/)).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(api.eliminaAzioneAgenda).toHaveBeenCalledWith(10));
  });

  it('evento dell\'utente: modifica con tipo e fascia, sposta di giorno', async () => {
    api.aggiornaEventoAgenda.mockResolvedValue({});
    disegna();
    apriMenu('Consegna del Palazzo');
    fireEvent.click(screen.getByRole('button', { name: 'Sposta di giorno' }));
    await waitFor(() => expect(api.aggiornaEventoAgenda).toHaveBeenCalledWith(5, { fascia: 'giorno' }));
    apriMenu('Consegna del Palazzo');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const finestra = screen.getByRole('dialog', { name: 'Modifica l\'evento' });
    expect(within(finestra).getByRole('radio', { name: 'Scadenza' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Promemoria' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaEventoAgenda).toHaveBeenLastCalledWith(5, { tipo: 'promemoria', titolo: 'Consegna del Palazzo', dettaglio: '', fascia: 'sera', partitaId: 3 }));
  });

  it('correzioni superate da un pacchetto nuovo: si riapplicano o si scartano; senza azione attuale solo «Scarta»', async () => {
    api.riapplicaCorrezioneGuida.mockResolvedValue({});
    api.ripristinaAzioneGuida.mockResolvedValue(undefined);
    disegna({ ...base, correzioniSuperate: [
      { indice: 4, azioneAllora: 'Vecchia azione', azioneAttuale: 'Azione nuova', azioneCorretta: 'La mia versione', nascosta: false },
      { indice: 6, azioneAllora: 'Sparita', azioneAttuale: null, azioneCorretta: null, nascosta: true },
    ] });
    const gruppo = within(screen.getByRole('group', { name: 'Correzioni da rivedere' }));
    expect(gruppo.getByText(/Avevi corretto «Vecchia azione» in «La mia versione»/)).toBeInTheDocument();
    expect(gruppo.getByText(/Avevi rimosso «Sparita».*non c'è più nessuna azione/)).toBeInTheDocument();
    expect(gruppo.getAllByRole('button', { name: /Riapplica/ })).toHaveLength(1);
    fireEvent.click(gruppo.getByRole('button', { name: /Riapplica/ }));
    await waitFor(() => expect(api.riapplicaCorrezioneGuida).toHaveBeenCalledWith('04-12', 4));
    fireEvent.click(gruppo.getAllByRole('button', { name: 'Scarta' })[1]);
    await waitFor(() => expect(api.ripristinaAzioneGuida).toHaveBeenCalledWith('04-12', 6));
  });

  it('un errore del server resta visibile e la finestra non si chiude', async () => {
    api.correggiAzioneGuida.mockRejectedValue(new Error('Il testo dell\'azione non può essere vuoto.'));
    disegna();
    apriMenu('Palazzo di Kamoshida');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il testo dell\'azione non può essere vuoto.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
