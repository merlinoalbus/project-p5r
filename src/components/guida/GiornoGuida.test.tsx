// @vitest-environment jsdom
// ============================================================
// Test GiornoGuida — la giornata canone: «Di giorno» / «Di sera» con le voci nel loro ordine esatto (azioni della guida, cose
// da fare ed eventi aggiunti sono la stessa cosa); Modifica con il posto nella fascia, Sposta su/giù, Sposta di fascia, Elimina
// ============================================================

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GiornoGuida } from './GiornoGuida';
import { useFasceDiarioStore } from '../../stores/fasceDiarioStore';
import { scegliVoce, selettore } from '../../../test/selettore';
import type { AzionePercorsoDto, PercorsoGiornoDto } from '../../types';
import type { EffettoVoce, StatoEffettiVoceDto } from '../../../shared/effettiVoce';
import { conNote } from '../../../test/note';

const api = vi.hoisted(() => ({
  creaVoceGiornata: vi.fn(), aggiornaVoceGiornata: vi.fn(), spostaVoceGiornata: vi.fn(), eliminaVoceGiornata: vi.fn(), impostaAzionePercorso: vi.fn(),
  getImmagini: vi.fn().mockResolvedValue([]), caricaImmagine: vi.fn(), eliminaImmagine: vi.fn(), importaImmagineDaUrl: vi.fn(),
  getElenchiAzione: vi.fn(), getPercorsoIndice: vi.fn(), trasferisciVociGiornata: vi.fn(),
  // appunti del Diario (2026-10-26): il blocco per gli appunti si chiede appena cambia la selezione (qui resta in attesa)
  esportaAppuntiDiario: vi.fn(() => new Promise(() => undefined)), anteprimaIncollaVoci: vi.fn(), incollaVociDiario: vi.fn(), annullaOperazioneVoci: vi.fn(),
  // L13 (ondata 4a): le proposte «da completare» del giorno (nessuna, in queste prove)
  getProposteConversione: vi.fn().mockResolvedValue([]),
  // la finestra della voce carica anche gli elenchi per gli effetti (articoli, domande, oggetti…)
  getElenchiEffettiVoce: vi.fn(),
  // L13 (O10-3): alla spunta del passaggio al rango 9 si legge la relazione romantica del Confidente nella partita
  getConfidentiPartita: vi.fn().mockResolvedValue([]),
}));
const ELENCHI_EFFETTI = { articoli: [], domande: [], cruciverba: [], inviti: [], persone: [], oggetti: [], trofei: [] };
const ELENCHI = {
  confidenti: [{ chiave: 'takemi', nome: 'Tae Takemi', dettaglio: 'Morte' }], dungeon: [{ chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }], richieste: [],
  libri: [{ chiave: 'zorro-il-fuorilegge', nome: 'Zorro, il fuorilegge' }], film: [], videogiochi: [],
  attivita: [{ chiave: 'lavoro-rafflesia', nome: 'Fioraio Rafflesia', turni: true }, { chiave: 'studio-leblanc', nome: 'Studio al Leblanc', turni: false }], negozi: [], doti: [],
};
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));

/** Uid di prova a 32 cifre esadecimali ricavato dal numero dato (zeri a sinistra). */
const uid = (n: number) => n.toString(16).padStart(32, '0');
/** Azione della giornata del 12 aprile, di giorno, di genere «azione» e non fatta, con i campi di `p` (uid e testo obbligatori) che sovrascrivono i predefiniti. */
const voce = (p: Partial<AzionePercorsoDto> & Pick<AzionePercorsoDto, 'uid' | 'azione'>): AzionePercorsoDto => ({
  giorno: '04-12', fascia: 'giorno', genere: 'azione', tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: null,
  produce: [], produceTesto: [], fatta: false, effetti: null, stato: null, mappa: null, ...p,
});

const ZORRO = voce({ uid: uid(1), azione: 'Biblioteca: prendere Zorro', fatta: true, effetti: { doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 3, note: 2, cinema: false }], confidente: null } });
/** La fonte unica degli effetti di una voce, com'è servita dal server: gli effetti dati, nell'ordine, con un UID ciascuno e la revisione `r1`. */
const fonteEffetti = (voceUid: string, effetti: EffettoVoce[]): StatoEffettiVoceDto => ({
  voceUid, stato: 'convertita', rawLegacy: '[]', motivo: null, revisione: 'r1',
  effetti: effetti.map((effetto, ordine) => ({ uid: uid(100 + ordine), ordine, effetto, origine: 'utente' as const })),
});
const PANE = voce({ uid: uid(2), azione: 'Comprare i Bionutrienti' });
const PALAZZO = voce({ uid: uid(3), azione: 'Palazzo di Kamoshida: infiltrazione', note: 'Oggetti principali' });
const CONSEGNA = voce({ uid: uid(4), azione: 'Consegna del Palazzo', fascia: 'sera', genere: 'promemoria' });

const base: PercorsoGiornoDto = {
  giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', trama: 'Primo accesso.', vincoli: [], meteo: null, avvisi: [], fonte: '', coperto: true,
  precedente: '04-11', successivo: '04-13', dataCorrente: '04-12', fatte: 1,
  // l'ordine esatto: la cosa da fare aggiunta dall'utente sta fra le due azioni della guida
  azioni: [ZORRO, PANE, PALAZZO, CONSEGNA],
  meteoPartita: null, allerte: [],
};

/** Disegna la giornata `g` (predefinita la base) per la partita data e restituisce il mock di `onGiornataModificata`, che si risolve subito. */
const disegna = (g: PercorsoGiornoDto = base, partitaId: number | null = 3) => {
  const ricarica = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><GiornoGuida g={g} partitaId={partitaId} onAggiorna={vi.fn()} onGiornataModificata={ricarica} /></MemoryRouter>);
  return ricarica;
};
/** La regione della giornata con il nome dato («Di giorno» o «Di sera»). */
const sezione = (nome: 'Di giorno' | 'Di sera') => screen.getByRole('region', { name: nome });
/** Clicca il «⋯» «Altre azioni per» della voce il cui testo comincia con `testo`, aprendone (o chiudendone) il menu a tendina (C9). */
const apriMenu = (testo: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Altre azioni per: ${testo}`) }));
/** Il menu a tendina della voce il cui testo comincia con `testo`, per cercarci dentro le voci (`menuitem`). */
const gestiDi = (testo: string) => within(screen.getByRole('menu', { name: new RegExp(`^Altre azioni per: ${testo}`) }));
/** C9: la matita a vista della voce il cui testo comincia con `testo` (stesso gesto che stava nel menu). */
const modificaDi = (testo: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Modifica: ${testo}`) }));
/** C9: il cestino a vista della voce il cui testo comincia con `testo` (stessa conferma che dava il menu). */
const eliminaDi = (testo: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Elimina: ${testo}`) }));

describe('GiornoGuida — la giornata canone', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.getImmagini.mockResolvedValue([]);
    api.getElenchiAzione.mockResolvedValue(ELENCHI);
    api.getElenchiEffettiVoce.mockResolvedValue(ELENCHI_EFFETTI);
    api.getProposteConversione.mockResolvedValue([]);
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

  it('le allerte meteo del giorno sono tag accanto al meteo, nella scheda del giorno (2026-10-12); senza allerte nessun tag', () => {
    disegna({ ...base, meteo: 'Sereno', allerte: [
      { chiave: 'notte-torrida', nome: 'Notte torrida', effetti: ['I distributori automatici restano senza bevande.'], fasce: ['sera'], modificata: false },
      { chiave: 'ondata-di-calore', nome: 'Ondata di calore', effetti: ['Le Ombre possono essere afflitte dallo stato In fiamme.'], fasce: ['giorno'], modificata: false }] });
    const tag = [...document.querySelectorAll('.chip--allerta')];
    expect(tag.map((t) => t.textContent)).toEqual(['Allerta meteo: Notte torrida · solo di sera', 'Allerta meteo: Ondata di calore · solo di giorno']);
    // nella scheda del giorno, dopo il meteo
    expect(tag[0].closest('section')).toHaveTextContent('Primo accesso.');
    cleanup();
    disegna();
    expect(document.querySelector('.chip--allerta')).toBeNull();
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
    // C9: Modifica ed Elimina sono fuori dal menu, a vista accanto al «⋯»
    apriMenu('Palazzo di Kamoshida');
    expect(gestiDi('Palazzo di Kamoshida').queryByRole('menuitem', { name: 'Modifica' })).toBeNull();
    expect(gestiDi('Palazzo di Kamoshida').queryByRole('menuitem', { name: 'Elimina' })).toBeNull();
    modificaDi('Palazzo di Kamoshida');
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    // aprendo la finestra il menu della voce si chiude
    expect(screen.queryByRole('menu', { name: /^Altre azioni per:/ })).toBeNull();
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

    modificaDi('Palazzo di Kamoshida');
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
    modificaDi('Biblioteca');
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    // Zorro è spuntata: L13 (decisione 19), la nota dice che cosa succede alle partite che l'hanno spuntata, solo con i tipi che la voce ha
    expect(within(finestra).getByText(/^Questa voce è già spuntata: /)).toBeInTheDocument();
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
    // L13 (ondata 4a): la finestra elenca TUTTI gli effetti della voce (fonte unica `effettiVoce`); tipo e «Quale» sono tessere, non tendine
    const rafflesia = voce({
      uid: uid(9), azione: 'Sbloccare il lavoro da fioraio Rafflesia', tipo: 'lavoro', riferimento: { tipo: 'attivita', chiave: 'lavoro-rafflesia' },
      produce: [{ tipo: 'turno', attivita: 'lavoro-rafflesia' }], produceTesto: ['Turno: Fioraio Rafflesia'],
      effettiVoce: fonteEffetti(uid(9), [{ tipo: 'turno', attivita: 'lavoro-rafflesia' }]),
    });
    disegna({ ...base, azioni: [rafflesia] });
    expect(within(screen.getByRole('region', { name: 'Il gioco dà' })).getByText('Turno: Fioraio Rafflesia')).toBeInTheDocument();
    modificaDi('Sbloccare il lavoro');
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    const tipi = await waitFor(() => within(finestra).getByRole('radiogroup', { name: 'Tipo della voce' }));
    // l'effetto del turno è una scheda dell'elenco; «Togli» lo toglie (nessuno lo cita come sostituito)
    // 2026-10-26: il nome per i lettori di schermo è la frase dell'effetto (due effetti dello stesso tipo restano distinti)
    fireEvent.click(within(finestra).getByRole('button', { name: /^Togli: Turno: / }));
    expect(within(finestra).getByText('Nessun effetto: la spunta registra solo che l’hai fatta.')).toBeInTheDocument();
    fireEvent.click(within(tipi).getByRole('radio', { name: 'Confidente' }));
    // a collegamento incompleto non si salva: «Quale» (il Confidente) si sceglie fra le tessere
    const quale = await waitFor(() => within(finestra).getByRole('radiogroup', { name: 'Quale: confidente' }));
    fireEvent.click(within(quale).getByRole('radio', { name: /^Tae Takemi/ }));
    fireEvent.click(await waitFor(() => within(finestra).getByRole('radio', { name: 'Rango 2' })));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi un effetto' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Dote sociale' }));
    scegliVoce('Dote', /^Coraggio/, finestra);
    fireEvent.click(within(finestra).getByRole('radio', { name: '1 nota' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(9), {
      genere: 'azione', azione: 'Sbloccare il lavoro da fioraio Rafflesia', note: null, fascia: 'giorno', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2,
      effettiVoce: { effetti: [{ uid: null, effetto: { tipo: 'dote', dote: 'coraggio', note: 1 } }], revisioneEffettiAttesa: 'r1' },
    }, 3));
  });

  it('un turno si sceglie solo fra le attività contate per volte; una lettura va completata prima di salvare', async () => {
    disegna({ ...base, azioni: [voce({ uid: uid(9), azione: 'Qualcosa', effettiVoce: fonteEffetti(uid(9), []) })] });
    modificaDi('Qualcosa');
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    await waitFor(() => expect(within(finestra).getByRole('button', { name: 'Aggiungi un effetto' })).toBeInTheDocument());
    fireEvent.click(within(finestra).getByRole('button', { name: 'Aggiungi un effetto' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Turno di un’attività' }));
    // un turno senza attività non è completo: non si salva
    expect(within(finestra).getByRole('button', { name: 'Salva' })).toBeDisabled();
    fireEvent.click(selettore('Attività (contata per volte)', finestra));
    const elenco = within(screen.getByRole('listbox', { name: 'Attività (contata per volte)' }));
    expect(elenco.getByRole('option', { name: /^Fioraio Rafflesia/ })).toBeInTheDocument();
    expect(elenco.queryByRole('option', { name: /^Studio al Leblanc/ })).toBeNull();
  });

  it('dal menu: Sposta su / giù solo dove si può, il menu resta sulla voce per spostarla ancora; Sposta di sera', async () => {
    api.spostaVoceGiornata.mockResolvedValue([]);
    api.aggiornaVoceGiornata.mockResolvedValue({});
    disegna();
    apriMenu('Biblioteca');
    // C9: il «⋯» dice che apre un menu, e il menu a tendina prende il fuoco sulla prima voce
    expect(screen.getByRole('button', { name: /^Altre azioni per: Biblioteca/ })).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByRole('button', { name: /^Altre azioni per: Biblioteca/ })).toHaveAttribute('aria-expanded', 'true');
    expect(gestiDi('Biblioteca').getByRole('menuitemcheckbox', { name: 'Seleziona' })).toHaveFocus();
    expect(gestiDi('Biblioteca').queryByRole('menuitem', { name: 'Sposta su' })).toBeNull();
    fireEvent.click(gestiDi('Biblioteca').getByRole('menuitem', { name: 'Sposta giù' }));
    await waitFor(() => expect(api.spostaVoceGiornata).toHaveBeenCalledWith(uid(1), 1, 3));
    // il menu è ancora aperto sulla stessa voce, con il fuoco sul gesto appena usato
    await waitFor(() => expect(screen.getByRole('menu', { name: /^Altre azioni per: Biblioteca/ })).toBeInTheDocument());
    await waitFor(() => expect(gestiDi('Biblioteca').getByRole('menuitem', { name: 'Sposta giù' })).toHaveFocus());
    // Esc chiude il menu e ridà il fuoco al «⋯»
    fireEvent.keyDown(gestiDi('Biblioteca').getByRole('menuitem', { name: 'Sposta giù' }), { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: /^Altre azioni per: Biblioteca/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^Altre azioni per: Biblioteca/ })).toHaveFocus();
    apriMenu('Palazzo di Kamoshida');
    expect(gestiDi('Palazzo').queryByRole('menuitem', { name: 'Sposta giù' })).toBeNull();
    fireEvent.click(gestiDi('Palazzo').getByRole('menuitem', { name: 'Sposta su' }));
    await waitFor(() => expect(api.spostaVoceGiornata).toHaveBeenCalledWith(uid(3), -1, 3));
    fireEvent.click(gestiDi('Palazzo').getByRole('menuitem', { name: 'Sposta di sera' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(3), { fascia: 'sera' }, 3));
  });

  it('eliminare una voce non spuntata chiede conferma e la toglie dalla guida', async () => {
    api.eliminaVoceGiornata.mockResolvedValue(undefined);
    const ricarica = disegna();
    eliminaDi('Comprare i Bionutrienti');
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
    eliminaDi('Biblioteca');
    const finestra = screen.getByRole('dialog', { name: 'Eliminare una voce già spuntata?' });
    expect(within(finestra).getByText(/Coraggio ♪♪ · 3 punti/)).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Togli la spunta ed elimina' }));
    await waitFor(() => expect(api.eliminaVoceGiornata).toHaveBeenCalledWith(uid(1)));
    expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(1), false);
    expect(api.impostaAzionePercorso.mock.invocationCallOrder[0]).toBeLessThan(api.eliminaVoceGiornata.mock.invocationCallOrder[0]);
  });

  it('spunta tolta ma eliminazione rifiutata (effetti in un\'altra partita): lo dice com\'è e la giornata si rilegge', async () => {
    api.impostaAzionePercorso.mockResolvedValue({});
    api.eliminaVoceGiornata.mockRejectedValue(new Error('Questa voce è spuntata con effetti in una partita («Altra»): togli prima la spunta in ciascuna per annullarne gli effetti, poi eliminala.'));
    const ricarica = disegna();
    eliminaDi('Biblioteca');
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminare una voce già spuntata?' })).getByRole('button', { name: 'Togli la spunta ed elimina' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringMatching(/^Spunta tolta e punti annullati in questa partita, ma la voce non è stata eliminata: .*«Altra»/)));
    expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(1), false);
    await waitFor(() => expect(ricarica).toHaveBeenCalled());
  });

  it('se il server rifiuta l\'eliminazione (spuntata con effetti in un\'altra partita) lo dice', async () => {
    api.eliminaVoceGiornata.mockRejectedValue(new Error('Questa voce è spuntata con effetti in una partita («Altra»): togli prima la spunta in ciascuna per annullarne gli effetti, poi eliminala.'));
    disegna();
    eliminaDi('Comprare i Bionutrienti');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', expect.stringContaining('«Altra»')));
  });

  it('una voce aggiunta è come un\'azione della guida: collegamento (senza il tipo che ripete), «Il gioco dà», stato; un incontro chiede le note', async () => {
    api.impostaAzionePercorso.mockResolvedValue(voce({ uid: uid(11), azione: 'Clinica Takemi', fatta: true, effetti: { doti: [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }], confidente: null } }));
    disegna({ ...base, azioni: [voce({
      uid: uid(11), azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 2,
      produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }], produceTesto: ['Coraggio ♪'], stato: { tipo: 'consigliata', motivo: 'requisiti del rango 2 soddisfatti' },
    })] });
    const giorno = within(sezione('Di giorno'));
    expect(giorno.queryByText('La mia')).toBeNull();
    // il tipo «Confidente» non si scrive accanto al ritratto e al nome del Confidente, che lo dicono già (2026-10-25, `tipoGiaDetto`)
    expect(giorno.queryByText('Confidente')).toBeNull();
    expect(giorno.getByText('Tae Takemi - Morte')).toBeInTheDocument();
    // le note come simboli (richiesta dell'utente del 2026-10-26), dette «1 nota» al lettore di schermo
    const ilGiocoDa = within(giorno.getByRole('region', { name: 'Il gioco dà' }));
    expect(ilGiocoDa.getByText(conNote('Coraggio ♪'))).toBeInTheDocument();
    expect(ilGiocoDa.getByRole('img', { name: '1 nota' })).toHaveTextContent('♪');
    expect(giorno.getByText(/^Consigliata/)).toBeInTheDocument();
    expect(giorno.getByText('rango atteso 2')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fatto: Clinica Takemi'));
    // prima si chiedono le note: nessuna chiamata finché non si sceglie
    expect(api.impostaAzionePercorso).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Note ottenute con il Confidente' })).getByRole('button', { name: '2 note' }));
    await waitFor(() => expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(11), true, 2));
    // le Doti si segnano a mano: l'avviso le ricorda invece di dirle date
    // (resta 7 secondi, come per ogni spunta che ha Doti da segnare)
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', 'Da segnare nelle Doti: Coraggio ♪ · 2 punti', 7000));
  });

  it('L13 (O10-3): il passaggio al rango 9 di un Confidente romanzabile chiede solo «Ho scelto la relazione romantica», precompilata dalla partita', async () => {
    api.getConfidentiPartita.mockResolvedValue([{ chiave: 'takemi', nome: 'Tae Takemi', romanzabile: true, relazioneRomantica: false }]);
    api.impostaAzionePercorso.mockResolvedValue(voce({ uid: uid(12), azione: 'Clinica Takemi: rango 9', fatta: true, effetti: { doti: [], confidente: null, relazione: { confidente: 'takemi', nome: 'Tae Takemi', prima: false, dopo: true } } }));
    disegna({ ...base, azioni: [voce({ uid: uid(12), azione: 'Clinica Takemi: rango 9', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 9 })] });
    fireEvent.click(screen.getByLabelText('Fatto: Clinica Takemi: rango 9'));
    const casella = await screen.findByRole('checkbox', { name: 'Ho scelto la relazione romantica' });
    expect(casella).not.toBeChecked();
    fireEvent.click(casella);
    fireEvent.click(within(screen.getByRole('group', { name: 'Note ottenute con il Confidente' })).getByRole('button', { name: '3 note' }));
    await waitFor(() => expect(api.impostaAzionePercorso).toHaveBeenCalledWith(3, uid(12), true, 3, undefined, undefined, undefined, true));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', expect.stringContaining('Relazione romantica con Tae Takemi iniziata')));
  });

  it('L13 (O10-3): su un altro rango (o un Confidente non romanzabile) la scelta delle note non ha la casella della relazione', async () => {
    api.getConfidentiPartita.mockResolvedValue([{ chiave: 'takemi', nome: 'Tae Takemi', romanzabile: true, relazioneRomantica: false }]);
    disegna({ ...base, azioni: [voce({ uid: uid(13), azione: 'Clinica Takemi: rango 8', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 8 })] });
    fireEvent.click(screen.getByLabelText('Fatto: Clinica Takemi: rango 8'));
    expect(screen.getByRole('group', { name: 'Note ottenute con il Confidente' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Ho scelto la relazione romantica' })).toBeNull();
    expect(api.getConfidentiPartita).not.toHaveBeenCalled();
  });

  it('un evento: modifica il genere (resta dov\'è), sposta di giorno', async () => {
    api.aggiornaVoceGiornata.mockResolvedValue({});
    disegna();
    apriMenu('Consegna del Palazzo');
    fireEvent.click(gestiDi('Consegna del Palazzo').getByRole('menuitem', { name: 'Sposta di giorno' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenCalledWith(uid(4), { fascia: 'giorno' }, 3));
    modificaDi('Consegna del Palazzo');
    const finestra = screen.getByRole('dialog', { name: 'Modifica la voce della giornata' });
    expect(within(finestra).getByRole('radio', { name: 'Scadenza' })).toHaveAttribute('aria-checked', 'true');
    // un evento non ha tipo, collegamento ed effetti
    expect(within(finestra).queryByRole('button', { name: 'Aggiungi un effetto' })).toBeNull();
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Promemoria' }));
    fireEvent.click(within(finestra).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.aggiornaVoceGiornata).toHaveBeenLastCalledWith(uid(4), { genere: 'promemoria', azione: 'Consegna del Palazzo', note: null, fascia: 'sera' }, 3));
    // la conferma dice che cosa si elimina: qui una scadenza
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    eliminaDi('Consegna del Palazzo');
    expect(screen.getByRole('dialog', { name: 'Eliminare la scadenza?' })).toBeInTheDocument();
  });

  it('un errore del server resta visibile e la finestra non si chiude', async () => {
    api.aggiornaVoceGiornata.mockRejectedValue(new Error('Il testo della voce non può essere vuoto.'));
    disegna();
    modificaDi('Palazzo di Kamoshida');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Il testo della voce non può essere vuoto.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('GiornoGuida — il cartellino del Palazzo segue le regole d’atterraggio (2026-10-04)', () => {
  beforeEach(() => {
    for (const f of Object.values(api)) f.mockReset();
    api.getImmagini.mockResolvedValue([]);
    api.getElenchiAzione.mockResolvedValue(ELENCHI);
  });
  /** Una voce collegata al Palazzo di Kamoshida con l'atterraggio dato. */
  const conPalazzo = (atterraggio: AzionePercorsoDto['atterraggio']) => ({ ...base, azioni: [voce({ uid: uid(9), azione: 'Palazzo di Kamoshida (dopo scuola)', tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: 'kamoshida' }, riferimentoTesto: 'Palazzo di Kamoshida', atterraggio })] });

  it('nella scheda «Oggi» (con la mappa accanto) il cartellino apre la planimetria lì, centrata sul pin, senza cambiare pagina', () => {
    const sullaMappa = vi.fn();
    render(<MemoryRouter><GiornoGuida g={conPalazzo({ mappa: 'kamoshida/sala', spillo: 7 })} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={vi.fn()} onSullaMappa={sullaMappa} /></MemoryRouter>);
    const cartellino = screen.getByRole('link', { name: 'Palazzo di Kamoshida' });
    expect(cartellino).toHaveAttribute('href', '/guida/mappe/kamoshida%2Fsala?spillo=7');
    // sull'evento si vede se il cambio di pagina è stato impedito
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    cartellino.dispatchEvent(clic);
    expect(clic.defaultPrevented).toBe(true);
    expect(sullaMappa).toHaveBeenCalledWith({ chiave: 'kamoshida/sala', spilloId: 7 }, uid(9));
  });

  it('senza la mappa accanto è un collegamento alla planimetria; senza regola porta alla scheda del Palazzo', () => {
    const { unmount } = render(<MemoryRouter><GiornoGuida g={conPalazzo({ mappa: 'kamoshida/sala', spillo: null })} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Palazzo di Kamoshida' })).toHaveAttribute('href', '/guida/mappe/kamoshida%2Fsala');
    unmount();
    const sullaMappa = vi.fn();
    render(<MemoryRouter><GiornoGuida g={conPalazzo(null)} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={vi.fn()} onSullaMappa={sullaMappa} /></MemoryRouter>);
    const cartellino = screen.getByRole('link', { name: 'Palazzo di Kamoshida' });
    expect(cartellino).toHaveAttribute('href', '/guida/dungeon/kamoshida');
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    cartellino.dispatchEvent(clic);
    expect(sullaMappa).not.toHaveBeenCalled();
  });
});

describe('GiornoGuida — copiare o spostare voci in un altro giorno (2026-10-12)', () => {
  const INDICE = { giorni: [
    { giorno: '04-12', giornoSettimana: 'mar', fase: '', meteo: null, azioni: 3, fatte: 1, avvisi: 0, coperto: true },
    { giorno: '04-13', giornoSettimana: 'mer', fase: '', meteo: null, azioni: 0, fatte: 0, avvisi: 0, coperto: true },
    { giorno: '05-02', giornoSettimana: 'lun', fase: '', meteo: null, azioni: 0, fatte: 0, avvisi: 0, coperto: true },
  ], dataCorrente: '04-12', totaleGiorni: 3, giorniCoperti: 3 };
  beforeEach(() => { vi.clearAllMocks(); api.getPercorsoIndice.mockResolvedValue(INDICE); });

  it('«Copia o sposta voci» apre la scelta: righe da spuntare (niente spunte di partita né gesti), «Tutte» per fascia, conto nella barra', () => {
    disegna();
    expect(screen.queryByRole('region', { name: 'Voci selezionate' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un altro giorno' }));
    const barra = screen.getByRole('region', { name: 'Voci selezionate' });
    expect(barra).toHaveTextContent('Scegli le voci');
    expect(within(barra).getByRole('button', { name: 'Copia o sposta le voci selezionate in un altro giorno' })).toBeDisabled();
    // le righe della scelta al posto delle azioni: niente «Fatto», niente menu dei gesti, niente «Aggiungi»
    expect(screen.queryByRole('checkbox', { name: /^Fatto:/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Altre azioni per/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Modifica|Elimina): / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Aggiungi di/ })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Voci di sera da scegliere' })).getByText('Consegna del Palazzo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Comprare i Bionutrienti/ }));
    expect(barra).toHaveTextContent('1 voce selezionata');
    fireEvent.click(screen.getByRole('button', { name: 'Scegli tutte le voci di giorno' }));
    expect(barra).toHaveTextContent('3 voci selezionate');
    fireEvent.click(screen.getByRole('button', { name: 'Togli dalla scelta tutte le voci di giorno' }));
    expect(barra).toHaveTextContent('Scegli le voci');
    // «Fine» torna alla giornata com'era
    fireEvent.click(within(barra).getByRole('button', { name: 'Fine: esci dalla scelta delle voci' }));
    expect(screen.getAllByRole('checkbox', { name: /^Fatto:/ }).length).toBeGreaterThan(0);
  });

  it('«Copia in…»: giorno e fascia, le voci scelte nell\'ordine della giornata; fatto, la scelta si chiude e la giornata si rilegge', async () => {
    const ricarica = disegna();
    fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un altro giorno' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Consegna del Palazzo/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Biblioteca: prendere Zorro/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Copia o sposta le voci selezionate in un altro giorno' }));
    const finestra = await screen.findByRole('dialog', { name: 'Copia 2 voci in un altro giorno' });
    // la finestra parte da «Copia»
    expect(within(finestra).getByRole('radio', { name: 'Copia' })).toHaveAttribute('aria-checked', 'true');
    expect(finestra).toHaveTextContent('2 voci (1 di giorno, 1 di sera)');
    // parte dal giorno di partenza; la fascia, con voci di giorno e di sera, è «di giorno»
    expect(selettore('Giorno', finestra)).toHaveTextContent('12 aprile (mar)');
    expect(within(finestra).getByRole('radio', { name: 'Di giorno' })).toHaveAttribute('aria-checked', 'true');
    scegliVoce('Mese', 'Maggio', finestra);
    expect(selettore('Giorno', finestra)).toHaveTextContent('2 maggio (lun)');
    fireEvent.click(within(finestra).getByRole('radio', { name: 'Di sera' }));
    api.trasferisciVociGiornata.mockResolvedValue({ giorno: '05-02', fascia: 'sera', uid: ['n1', 'n2'], voci: [] });
    fireEvent.click(within(finestra).getByRole('button', { name: /^Copia nel 2 maggio, di sera/ }));
    // nell'ordine della giornata (Zorro di giorno prima della consegna di sera), non in quello dei tocchi
    await waitFor(() => expect(api.trasferisciVociGiornata).toHaveBeenCalledWith({ uid: [uid(1), uid(4)], giorno: '05-02', fascia: 'sera', modo: 'copia' }, 3));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(notifica).toHaveBeenCalledWith('success', '2 voci copiate nel 2 maggio, di sera, in fondo: per tutte le partite.');
    expect(ricarica).toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Voci selezionate' })).toBeNull();
  });

  it('«Sposta» nella finestra manda `sposta`; un errore resta in notifica e la finestra resta aperta con la scelta', async () => {
    disegna();
    fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un altro giorno' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Consegna del Palazzo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Copia o sposta le voci selezionate in un altro giorno' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Copia 1 voce in un altro giorno' })).getByRole('radio', { name: 'Sposta' }));
    const finestra = await screen.findByRole('dialog', { name: 'Sposta 1 voce in un altro giorno' });
    // una voce sola di sera: la fascia parte da «di sera»
    expect(within(finestra).getByRole('radio', { name: 'Di sera' })).toHaveAttribute('aria-checked', 'true');
    expect(finestra).toHaveTextContent('La voce lascia questo giorno e porta con sé le spunte delle partite.');
    scegliVoce('Giorno', /^13 aprile/, finestra);
    api.trasferisciVociGiornata.mockRejectedValue(new Error('Questa voce della giornata non esiste (più).'));
    fireEvent.click(within(finestra).getByRole('button', { name: /^Sposta nel 13 aprile, di sera/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Questa voce della giornata non esiste (più).'));
    expect(api.trasferisciVociGiornata).toHaveBeenCalledWith({ uid: [uid(4)], giorno: '04-13', fascia: 'sera', modo: 'sposta' }, 3);
    expect(screen.getByRole('dialog', { name: 'Sposta 1 voce in un altro giorno' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Voci selezionate' })).toHaveTextContent('1 voce selezionata');
  });

  it('senza voci nel giorno il comando non c\'è; cambiando giorno la scelta non resta', () => {
    disegna({ ...base, azioni: [] });
    expect(screen.queryByRole('button', { name: 'Scegli voci da copiare o spostare in un altro giorno' })).toBeNull();
    cleanup();
    const { rerender } = render(<MemoryRouter><GiornoGuida g={base} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un altro giorno' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Comprare i Bionutrienti/ }));
    rerender(<MemoryRouter><GiornoGuida g={{ ...base, giorno: '04-13' }} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Voci selezionate' })).toBeNull();
  });
});

describe('GiornoGuida — «Di giorno» e «Di sera» richiudibili (C9, 2026-10-31)', () => {
  beforeEach(() => { vi.clearAllMocks(); useFasceDiarioStore.setState({ chiuse: {}, mostrate: {} }); });
  afterEach(() => { useFasceDiarioStore.setState({ chiuse: {}, mostrate: {} }); });
  /** Il pulsante che apre e chiude la fascia data. */
  const interruttore = (nome: 'Di giorno' | 'Di sera') => within(sezione(nome)).getByRole('button', { name: nome });

  it('aperte per impostazione; il nome della fascia la chiude e la riapre, il conto resta a vista, i dati non cambiano', () => {
    disegna();
    expect(interruttore('Di giorno')).toHaveAttribute('aria-expanded', 'true');
    expect(interruttore('Di sera')).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(interruttore('Di giorno').getAttribute('aria-controls')!)).not.toBeNull();
    fireEvent.click(interruttore('Di giorno'));
    expect(interruttore('Di giorno')).toHaveAttribute('aria-expanded', 'false');
    // le voci restano montate ma nascoste: niente spunte né comandi a vista; il conto e «Aggiungi» restano
    expect(screen.queryByRole('checkbox', { name: /^Fatto: Comprare i Bionutrienti/ })).toBeNull();
    expect(document.getElementById(`voce-${uid(2)}`)).not.toBeNull();
    expect(within(sezione('Di giorno')).getByText('1 su 3')).toBeInTheDocument();
    expect(within(sezione('Di giorno')).getByRole('button', { name: 'Aggiungi di giorno' })).toBeInTheDocument();
    // l'altra fascia non cambia
    expect(within(sezione('Di sera')).getByText('Consegna del Palazzo')).toBeVisible();
    fireEvent.click(interruttore('Di giorno'));
    expect(screen.getByRole('checkbox', { name: /^Fatto: Comprare i Bionutrienti/ })).toBeInTheDocument();
    expect(api.aggiornaVoceGiornata).not.toHaveBeenCalled();
  });

  it('una voce cercata (#voce-…) in una fascia chiusa la riapre una volta; richiusa resta chiusa', () => {
    useFasceDiarioStore.setState({ chiuse: { '04-12/giorno': true } });
    render(<MemoryRouter initialEntries={[`/guida/percorso/04-12#voce-${uid(2)}`]}><GiornoGuida g={base} partitaId={3} onAggiorna={vi.fn()} onGiornataModificata={vi.fn()} /></MemoryRouter>);
    expect(interruttore('Di giorno')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: /^Fatto: Comprare i Bionutrienti/ })).toBeInTheDocument();
    fireEvent.click(interruttore('Di giorno'));
    expect(interruttore('Di giorno')).toHaveAttribute('aria-expanded', 'false');
  });

  it('una voce che entra nella selezione in una fascia chiusa la riapre («Tutte» della scelta)', () => {
    disegna();
    fireEvent.click(interruttore('Di sera'));
    expect(interruttore('Di sera')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un altro giorno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scegli tutte le voci di sera' }));
    expect(interruttore('Di sera')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: /Consegna del Palazzo/ })).toBeChecked();
  });
});
