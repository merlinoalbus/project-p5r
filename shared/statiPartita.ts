// ============================================================
// Catalogo degli stati della partita — quello che l'editor delle condizioni offre
// ============================================================
//
// Una condizione si costruisce scegliendo tre cose, in quest'ordine: **lo stato** («Data di
// gioco», «Confidente», «Attività svolta»), **l'operatore** ammesso per quello stato («dal»,
// «almeno rango», «svolta almeno») e **i valori**, ciascuno da un elenco chiuso. Niente campi
// liberi: i numeri sono interi in un intervallo, i nomi vengono dagli elenchi della Guida.
//
// Questo file dice **che cosa si può chiedere**; `condizioniSpillo.ts` dice com'è fatta la
// condizione che ne esce; `disponibilitaService` la valuta. Le due funzioni in fondo —
// `costruisciCondizione` e `scomponiCondizione` — sono il ponte fra la scelta e il dato, e
// devono restare l'una l'inversa dell'altra: è la proprietà che i test verificano.
// ============================================================

import { DOTI_SOCIALI, eDote } from './doti.js';
import { ARCHI_STORIA, CONTATORI, EVENTI_STORIA, GIORNI_SETTIMANA, PALAZZI_CONDIZIONE, RANGHI_CLIENTE, STAGIONI, dataValida, ordineGioco, type ContatoreChiave, type RangoCliente, type RequisitoSpillo, type TipoCondizione } from './condizioniSpillo.js';
import { uidValido } from './spilli.js';

/** Come si sceglie un valore: da quale elenco, o che numero. */
export type TipoCampo =
  | 'data' | 'fascia' | 'giorni' | 'stagione' | 'allerta'
  | 'quartiere' | 'arco' | 'palazzo'
  | 'dote' | 'rango5' | 'confidente' | 'rango10' | 'membro' | 'richiesta'
  | 'libro' | 'film' | 'articolo'
  | 'attivita' | 'volte' | 'negozio-con-gradi' | 'rango-cliente' | 'negozio-con-punti' | 'punti'
  | 'evento' | 'contatore' | 'almeno'
  | 'arcano' | 'persona' | 'abilita'
  | 'spillo' | 'voce-guida'
  // L6: un luogo (scelto per nome, salvato per chiave), un invito di un Confidente, il testo di un avviso
  | 'luogo' | 'invito' | 'testo';

export interface CampoCondizione { nome: string; tipo: TipoCampo; etichetta: string }
export interface OperatoreCondizione { chiave: string; nome: string; campi: CampoCondizione[] }
export interface DefinizioneStato {
  chiave: string;
  nome: string;
  gruppo: 'Calendario e mondo' | 'Storia e progressi' | 'Guida' | 'Negozi' | 'Scorta' | 'Mappe';
  /** Da dove la partita lo legge: si mostra nell'editor, così si sa dove andare a segnarlo. */
  origine: string;
  operatori: OperatoreCondizione[];
  /** Solo nelle condizioni dei pin (l'editor delle mappe): lo stato di un altro pin o di una voce della guida (2026-10-11) non dice
   *  niente a un articolo o a un libro. */
  soloSpilli?: true;
  /** L6: si mostra ma non si sceglie nell'editor. Gli inviti si aggiungono e si tolgono solo dalla pagina del Confidente (R9-07c): una
   *  condizione che ne cita uno si legge, con il collegamento al Confidente. */
  soloLettura?: true;
}

/** Un campo dell'editor delle condizioni: nome del valore, tipo e etichetta mostrata. */
const campo = (nome: string, tipo: TipoCampo, etichetta: string): CampoCondizione => ({ nome, tipo, etichetta });

export const STATI_PARTITA: readonly DefinizioneStato[] = [
  // — Calendario e mondo —
  { chiave: 'data-gioco', nome: 'Data di gioco', gruppo: 'Calendario e mondo', origine: 'Partita → Oggi', operatori: [
    { chiave: 'dal', nome: 'dal', campi: [campo('dal', 'data', 'Data')] },
    { chiave: 'il', nome: 'solo il', campi: [campo('dal', 'data', 'Giorno')] },
    { chiave: 'tra', nome: 'tra', campi: [campo('dal', 'data', 'Dal'), campo('al', 'data', 'Al')] },
  ] },
  { chiave: 'fascia', nome: 'Momento della giornata', gruppo: 'Calendario e mondo', origine: 'Partita → Oggi', operatori: [{ chiave: 'e', nome: 'è', campi: [campo('fascia', 'fascia', 'Momento')] }] },
  { chiave: 'meteo', nome: 'Meteo', gruppo: 'Calendario e mondo', origine: 'calendario di gioco', operatori: [
    { chiave: 'piove', nome: 'piove', campi: [] }, { chiave: 'non-piove', nome: 'non piove', campi: [] },
    { chiave: 'senza-allerta', nome: 'senza questa allerta', campi: [campo('allerta', 'allerta', 'Allerta meteo')] },
  ] },
  { chiave: 'giorno-settimana', nome: 'Giorno della settimana', gruppo: 'Calendario e mondo', origine: 'calendario di gioco', operatori: [{ chiave: 'in', nome: 'è uno di', campi: [campo('giorni', 'giorni', 'Giorni')] }] },
  { chiave: 'stagione', nome: 'Stagione', gruppo: 'Calendario e mondo', origine: 'calendario di gioco', operatori: [{ chiave: 'e', nome: 'è', campi: [campo('stagione', 'stagione', 'Stagione')] }] },
  // L6: sempre vera, per i quartieri aperti dall'inizio del gioco
  { chiave: 'da-subito', nome: 'Dall’inizio', gruppo: 'Calendario e mondo', origine: 'sempre vera: disponibile dall’inizio del gioco', operatori: [{ chiave: 'sempre', nome: 'disponibile', campi: [] }] },
  { chiave: 'quartiere', nome: 'Quartiere', gruppo: 'Calendario e mondo', origine: 'sblocco del quartiere (pagina del quartiere)', operatori: [{ chiave: 'sbloccato', nome: 'sbloccato', campi: [campo('quartiere', 'quartiere', 'Quartiere')] }] },
  // L6: il luogo è sbloccato (lo sblocco, non gli orari): un quartiere si apre se lo è il suo ritrovo
  { chiave: 'luogo', nome: 'Luogo', gruppo: 'Calendario e mondo', origine: 'sblocco del luogo (pagina del luogo)', operatori: [{ chiave: 'sbloccato', nome: 'sbloccato', campi: [campo('luogo', 'luogo', 'Luogo')] }] },
  { chiave: 'arco', nome: 'Arco della storia', gruppo: 'Calendario e mondo', origine: 'data di gioco', operatori: [{ chiave: 'almeno', nome: 'arrivato almeno a', campi: [campo('dungeon', 'arco', 'Palazzo')] }] },
  { chiave: 'finestra-palazzo', nome: 'Finestra del Palazzo', gruppo: 'Calendario e mondo', origine: 'finestra nella scheda del Palazzo', operatori: [{ chiave: 'durante', nome: 'durante', campi: [campo('dungeon', 'palazzo', 'Palazzo')] }] },
  // — Storia e progressi —
  // «concluso» (L4 §8.10, R6-16b): Tesoro e boss finale; il 100% della raccolta non sblocca nulla (G-026). La chiave dell'operatore resta
  // quella di prima, così le scelte salvate nell'editor non cambiano
  { chiave: 'palazzo', nome: 'Palazzo', gruppo: 'Storia e progressi', origine: 'Tesoro del Palazzo raccolto e boss finale sconfitto (Guida o mappa)', operatori: [{ chiave: 'completato', nome: 'concluso', campi: [campo('dungeon', 'palazzo', 'Palazzo')] }] },
  // L6: «X ti ha chiesto di uscire», registrato nella partita; si legge qui, si aggiunge dalla pagina del Confidente
  { chiave: 'invito', nome: 'Invito di un Confidente', gruppo: 'Storia e progressi', origine: 'pagina del Confidente → Inviti («Invito avvenuto»)', soloLettura: true, operatori: [{ chiave: 'registrato', nome: 'avvenuto', campi: [campo('invito', 'invito', 'Invito')] }] },
  // L6: un'avvertenza da controllare nel gioco, mai bloccante (R6-01b: al posto del vecchio «manuale»)
  { chiave: 'avviso', nome: 'Avviso', gruppo: 'Storia e progressi', origine: 'da controllare nel gioco: non blocca mai', operatori: [{ chiave: 'testo', nome: 'da controllare', campi: [campo('testo', 'testo', 'Testo')] }] },
  { chiave: 'dote', nome: 'Dote sociale', gruppo: 'Storia e progressi', origine: 'Partita → Doti sociali', operatori: [{ chiave: 'almeno', nome: 'almeno rango', campi: [campo('dote', 'dote', 'Dote'), campo('rango', 'rango5', 'Rango')] }] },
  { chiave: 'confidente', nome: 'Confidente', gruppo: 'Storia e progressi', origine: 'Partita → Confidenti', operatori: [{ chiave: 'almeno', nome: 'almeno rango', campi: [campo('confidente', 'confidente', 'Confidente'), campo('rango', 'rango10', 'Rango')] }] },
  { chiave: 'squadra', nome: 'Ladro Fantasma', gruppo: 'Storia e progressi', origine: 'Partita → Denaro e squadra', operatori: [{ chiave: 'in-squadra', nome: 'in squadra', campi: [campo('membro', 'membro', 'Ladro')] }] },
  { chiave: 'richiesta', nome: 'Richiesta dei Mementos', gruppo: 'Storia e progressi', origine: 'Guida → Richieste', operatori: [{ chiave: 'completata', nome: 'completata', campi: [campo('richiesta', 'richiesta', 'Richiesta')] }] },
  { chiave: 'evento', nome: 'Evento di storia', gruppo: 'Storia e progressi', origine: 'Partita → Progressi', operatori: [{ chiave: 'avvenuto', nome: 'avvenuto', campi: [campo('evento', 'evento', 'Evento')] }] },
  { chiave: 'contatore', nome: 'Conteggio', gruppo: 'Storia e progressi', origine: 'Partita → Letture e giochi', operatori: [{ chiave: 'almeno', nome: 'almeno', campi: [campo('cosa', 'contatore', 'Cosa'), campo('almeno', 'almeno', 'Quanti')] }] },
  // — Guida —
  { chiave: 'libro', nome: 'Libro', gruppo: 'Guida', origine: 'Partita → Letture e giochi', operatori: [{ chiave: 'letto', nome: 'letto', campi: [campo('chiave', 'libro', 'Libro')] }] },
  { chiave: 'film', nome: 'Film o DVD', gruppo: 'Guida', origine: 'Partita → Letture e giochi', operatori: [{ chiave: 'visto', nome: 'visto', campi: [campo('chiave', 'film', 'Film')] }] },
  { chiave: 'attivita', nome: 'Attività', gruppo: 'Guida', origine: 'Partita → Progressi', operatori: [{ chiave: 'svolta', nome: 'svolta almeno', campi: [campo('attivita', 'attivita', 'Attività'), campo('volte', 'volte', 'Volte')] }] },
  // — Negozi —
  { chiave: 'articolo', nome: 'Articolo', gruppo: 'Negozi', origine: 'segnato come acquistato nel negozio', operatori: [{ chiave: 'ottenuto', nome: 'ottenuto', campi: [campo('articolo', 'articolo', 'Articolo')] }] },
  { chiave: 'rango-cliente', nome: 'Grado cliente', gruppo: 'Negozi', origine: 'spesa cumulata nel negozio', operatori: [{ chiave: 'almeno', nome: 'almeno', campi: [campo('negozio', 'negozio-con-gradi', 'Negozio'), campo('rango', 'rango-cliente', 'Grado')] }] },
  { chiave: 'punti-negozio', nome: 'Punti negozio', gruppo: 'Negozi', origine: 'Partita → Progressi', operatori: [{ chiave: 'almeno', nome: 'almeno', campi: [campo('negozio', 'negozio-con-punti', 'Negozio'), campo('punti', 'punti', 'Punti')] }] },
  // — Scorta —
  { chiave: 'persona-arcano', nome: 'Persona di un Arcano', gruppo: 'Scorta', origine: 'Partita → Scorta', operatori: [{ chiave: 'in-scorta', nome: 'in scorta', campi: [campo('arcano', 'arcano', 'Arcano')] }] },
  { chiave: 'persona-abilita', nome: 'Persona con abilità', gruppo: 'Scorta', origine: 'Partita → Scorta', operatori: [{ chiave: 'in-scorta', nome: 'in scorta', campi: [campo('persona', 'persona', 'Persona'), campo('abilita', 'abilita', 'Abilità')] }] },
  // — Mappe — lo stato di un altro pin (richiesta dell'utente, 2026-09-30): qualunque pin con uno stato (`statoCitabile`)
  { chiave: 'spillo', nome: 'Pin di una mappa', gruppo: 'Mappe', origine: 'stato del pin nella partita (raccolto, aperto, parlato, incontrato, azionato…)', soloSpilli: true, operatori: [
    { chiave: 'segnato', nome: 'segnato', campi: [campo('spillo', 'spillo', 'Pin')] },
    { chiave: 'non-segnato', nome: 'non segnato', campi: [campo('spillo', 'spillo', 'Pin')] },
  ] },
  // — Mappe — lo stato di una voce della guida di un Palazzo o dei Memento (richiesta dell'utente, 2026-10-11): «segnata» (Ottenuta o Esaurita) o no
  { chiave: 'voce-guida', nome: 'Voce della guida', gruppo: 'Mappe', origine: 'stato della voce nella guida del Palazzo o dei Memento (Ottenuto, Esaurito)', soloSpilli: true, operatori: [
    { chiave: 'segnata', nome: 'segnata', campi: [campo('voce', 'voce-guida', 'Voce')] },
    { chiave: 'non-segnata', nome: 'non segnata', campi: [campo('voce', 'voce-guida', 'Voce')] },
  ] },
];

/**
 * L6 (R6-01): lo stato dell'editor di ogni tipo del vocabolario, che non è più un elenco parallelo: `Record` su tutti i tipi di
 * `condizioniSpillo.ts`, quindi un tipo nuovo senza il suo stato qui non compila. Gruppi e negazioni sono struttura, non stati.
 */
export const STATO_DEL_TIPO: Record<Exclude<TipoCondizione, 'gruppo' | 'non'>, string> = {
  data: 'data-gioco', intervallo: 'data-gioco', fascia: 'fascia', piove: 'meteo', meteo: 'meteo', 'giorno-settimana': 'giorno-settimana',
  stagione: 'stagione', quartiere: 'quartiere', 'da-subito': 'da-subito', luogo: 'luogo', invito: 'invito', avviso: 'avviso', arco: 'arco',
  'finestra-palazzo': 'finestra-palazzo', palazzo: 'palazzo', dote: 'dote', confidente: 'confidente', squadra: 'squadra', richiesta: 'richiesta', lettura: 'libro', articolo: 'articolo',
  attivita: 'attivita', 'rango-cliente': 'rango-cliente', 'punti-negozio': 'punti-negozio', evento: 'evento', contatore: 'contatore',
  'persona-arcano': 'persona-arcano', 'persona-abilita': 'persona-abilita', spillo: 'spillo', 'voce-guida': 'voce-guida',
};

export type ValoriCondizione = Record<string, string | number | string[]>;
export interface SceltaCondizione { stato: string; operatore: string; valori: ValoriCondizione }

/** La definizione dello stato con quella chiave in `STATI_PARTITA`; undefined se non esiste. */
export function definizioneStato(chiave: string): DefinizioneStato | undefined {
  return STATI_PARTITA.find((s) => s.chiave === chiave);
}

/** Valore predefinito di un campo appena aggiunto all'editor: di solito la prima voce dell'elenco, ma per alcuni tipi un valore
 *  scelto apposta (`data` il 18 aprile, `arco` e `rango-cliente` la seconda voce, gli interi un numero comodo); vuoto per i tipi
 *  senza un elenco o un numero. */
export function valorePredefinito(tipo: TipoCampo): string | number | string[] {
  switch (tipo) {
    case 'data': return '04-18';
    case 'fascia': return 'giorno';
    case 'giorni': return ['domenica'];
    case 'stagione': return STAGIONI[0].chiave;
    case 'arco': return ARCHI_STORIA[1];
    case 'palazzo': return PALAZZI_CONDIZIONE[0].chiave;
    case 'dote': return DOTI_SOCIALI[0].chiave;
    case 'rango5': return 2;
    case 'rango10': return 1;
    case 'volte': return 1;
    case 'rango-cliente': return RANGHI_CLIENTE[1].chiave;
    case 'punti': return 50;
    case 'evento': return EVENTI_STORIA[0].chiave;
    case 'contatore': return CONTATORI[0].chiave;
    case 'almeno': return 1;
    case 'testo': return 'Da controllare nel gioco';
    default: return '';
  }
}

/** Il valore se è una stringa, altrimenti la stringa vuota. */
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
/** Il valore se è un intero, altrimenti NaN (che nessun controllo di intervallo lascia passare). */
const n = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);

/** Dalla scelta (stato, operatore, valori) alla condizione; `null` finché manca un valore. */
export function costruisciCondizione(scelta: SceltaCondizione): RequisitoSpillo | null {
  const v = scelta.valori;
  switch (scelta.stato) {
    case 'data-gioco': {
      const dal = s(v.dal);
      if (!dataValida(dal)) return null;
      if (scelta.operatore === 'dal') return { tipo: 'data', dal };
      if (scelta.operatore === 'il') return { tipo: 'intervallo', dal, al: dal };
      const al = s(v.al);
      return dataValida(al) && ordineGioco(dal) <= ordineGioco(al) ? { tipo: 'intervallo', dal, al } : null;
    }
    case 'fascia': return v.fascia === 'giorno' || v.fascia === 'sera' ? { tipo: 'fascia', fascia: v.fascia } : null;
    case 'meteo': return scelta.operatore === 'piove' ? { tipo: 'piove' }
      : scelta.operatore === 'senza-allerta' ? (s(v.allerta) ? { tipo: 'meteo', condizione: 'senza-allerta', allerta: s(v.allerta) } : null)
        : { tipo: 'meteo', condizione: 'non-piove' };
    case 'giorno-settimana': {
      const giorni = GIORNI_SETTIMANA.map((g) => g.chiave).filter((g) => Array.isArray(v.giorni) && v.giorni.includes(g));
      return giorni.length > 0 && giorni.length < 7 ? { tipo: 'giorno-settimana', giorni } : null;
    }
    case 'stagione': return STAGIONI.some((x) => x.chiave === v.stagione) ? { tipo: 'stagione', stagione: s(v.stagione) } : null;
    case 'quartiere': return s(v.quartiere) ? { tipo: 'quartiere', quartiere: s(v.quartiere) } : null;
    case 'da-subito': return { tipo: 'da-subito' };
    case 'luogo': return s(v.luogo) ? { tipo: 'luogo', luogo: s(v.luogo) } : null;
    case 'invito': return s(v.invito) ? { tipo: 'invito', invito: s(v.invito) } : null;
    // Nell'editor gli spazi in coda servono per scrivere la parola seguente; la normalizzazione avviene al salvataggio.
    case 'avviso': { const testo = s(v.testo).slice(0, 300); return testo.trim() ? { tipo: 'avviso', testo } : null; }
    case 'arco': return (ARCHI_STORIA as readonly string[]).includes(s(v.dungeon)) ? { tipo: 'arco', dungeon: s(v.dungeon) } : null;
    case 'finestra-palazzo': return PALAZZI_CONDIZIONE.some((p) => p.chiave === s(v.dungeon)) ? { tipo: 'finestra-palazzo', dungeon: s(v.dungeon) } : null;
    case 'palazzo': return s(v.dungeon) ? { tipo: 'palazzo', dungeon: s(v.dungeon) } : null;
    case 'dote': return eDote(v.dote) && n(v.rango) >= 1 && n(v.rango) <= 5 ? { tipo: 'dote', dote: s(v.dote), rango: n(v.rango) } : null;
    case 'confidente': return s(v.confidente) && n(v.rango) >= 1 && n(v.rango) <= 10 ? { tipo: 'confidente', confidente: s(v.confidente), rango: n(v.rango) } : null;
    case 'squadra': return s(v.membro) ? { tipo: 'squadra', membro: s(v.membro) } : null;
    case 'richiesta': return s(v.richiesta) ? { tipo: 'richiesta', richiesta: s(v.richiesta) } : null;
    case 'evento': return EVENTI_STORIA.some((e) => e.chiave === v.evento) ? { tipo: 'evento', evento: s(v.evento) } : null;
    case 'contatore': return CONTATORI.some((c) => c.chiave === v.cosa) && n(v.almeno) >= 1 ? { tipo: 'contatore', cosa: s(v.cosa) as ContatoreChiave, almeno: n(v.almeno) } : null;
    case 'libro': return s(v.chiave) ? { tipo: 'lettura', categoria: 'libro', chiave: s(v.chiave) } : null;
    case 'film': return s(v.chiave) ? { tipo: 'lettura', categoria: 'film', chiave: s(v.chiave) } : null;
    case 'attivita': return s(v.attivita) && n(v.volte) >= 1 ? { tipo: 'attivita', attivita: s(v.attivita), volte: n(v.volte) } : null;
    case 'articolo': return s(v.articolo) ? { tipo: 'articolo', articolo: s(v.articolo) } : null;
    case 'rango-cliente': return s(v.negozio) && RANGHI_CLIENTE.some((r) => r.chiave === v.rango) ? { tipo: 'rango-cliente', negozio: s(v.negozio), rango: s(v.rango) as RangoCliente } : null;
    case 'punti-negozio': return s(v.negozio) && n(v.punti) >= 1 ? { tipo: 'punti-negozio', negozio: s(v.negozio), punti: n(v.punti) } : null;
    case 'persona-arcano': return s(v.arcano) ? { tipo: 'persona-arcano', arcano: s(v.arcano) } : null;
    case 'persona-abilita': return s(v.persona) && s(v.abilita) ? { tipo: 'persona-abilita', persona: s(v.persona), abilita: s(v.abilita) } : null;
    case 'spillo': return uidValido(v.spillo) ? { tipo: 'spillo', spillo: v.spillo, segnato: scelta.operatore === 'segnato' } : null;
    case 'voce-guida': return s(v.voce) ? { tipo: 'voce-guida', voce: s(v.voce), segnata: scelta.operatore === 'segnata' } : null;
    default: return null;
  }
}

/** Dalla condizione salvata alla scelta che la produce (per modificarla nell'editor). Gruppi e negazioni non sono scelte. */
export function scomponiCondizione(c: RequisitoSpillo): SceltaCondizione | null {
  switch (c.tipo) {
    case 'gruppo': case 'non': return null;
    case 'data': return { stato: 'data-gioco', operatore: 'dal', valori: { dal: c.dal } };
    case 'intervallo': return c.dal === c.al ? { stato: 'data-gioco', operatore: 'il', valori: { dal: c.dal } } : { stato: 'data-gioco', operatore: 'tra', valori: { dal: c.dal, al: c.al } };
    case 'fascia': return { stato: 'fascia', operatore: 'e', valori: { fascia: c.fascia } };
    case 'piove': return { stato: 'meteo', operatore: 'piove', valori: {} };
    case 'meteo': return c.condizione === 'senza-allerta' ? { stato: 'meteo', operatore: 'senza-allerta', valori: { allerta: c.allerta } }
      : { stato: 'meteo', operatore: 'non-piove', valori: {} };
    case 'giorno-settimana': return { stato: 'giorno-settimana', operatore: 'in', valori: { giorni: c.giorni } };
    case 'stagione': return { stato: 'stagione', operatore: 'e', valori: { stagione: c.stagione } };
    case 'quartiere': return { stato: 'quartiere', operatore: 'sbloccato', valori: { quartiere: c.quartiere } };
    case 'da-subito': return { stato: 'da-subito', operatore: 'sempre', valori: {} };
    case 'luogo': return { stato: 'luogo', operatore: 'sbloccato', valori: { luogo: c.luogo } };
    case 'invito': return { stato: 'invito', operatore: 'registrato', valori: { invito: c.invito } };
    case 'avviso': return { stato: 'avviso', operatore: 'testo', valori: { testo: c.testo } };
    case 'arco': return { stato: 'arco', operatore: 'almeno', valori: { dungeon: c.dungeon } };
    case 'finestra-palazzo': return { stato: 'finestra-palazzo', operatore: 'durante', valori: { dungeon: c.dungeon } };
    case 'palazzo': return { stato: 'palazzo', operatore: 'completato', valori: { dungeon: c.dungeon } };
    case 'dote': return { stato: 'dote', operatore: 'almeno', valori: { dote: c.dote, rango: c.rango } };
    case 'confidente': return { stato: 'confidente', operatore: 'almeno', valori: { confidente: c.confidente, rango: c.rango } };
    case 'squadra': return { stato: 'squadra', operatore: 'in-squadra', valori: { membro: c.membro } };
    case 'richiesta': return { stato: 'richiesta', operatore: 'completata', valori: { richiesta: c.richiesta } };
    case 'evento': return { stato: 'evento', operatore: 'avvenuto', valori: { evento: c.evento } };
    case 'contatore': return { stato: 'contatore', operatore: 'almeno', valori: { cosa: c.cosa, almeno: c.almeno } };
    case 'lettura': return { stato: c.categoria, operatore: c.categoria === 'libro' ? 'letto' : 'visto', valori: { chiave: c.chiave } };
    case 'attivita': return { stato: 'attivita', operatore: 'svolta', valori: { attivita: c.attivita, volte: c.volte } };
    case 'articolo': return { stato: 'articolo', operatore: 'ottenuto', valori: { articolo: c.articolo } };
    case 'rango-cliente': return { stato: 'rango-cliente', operatore: 'almeno', valori: { negozio: c.negozio, rango: c.rango } };
    case 'punti-negozio': return { stato: 'punti-negozio', operatore: 'almeno', valori: { negozio: c.negozio, punti: c.punti } };
    case 'persona-arcano': return { stato: 'persona-arcano', operatore: 'in-scorta', valori: { arcano: c.arcano } };
    case 'persona-abilita': return { stato: 'persona-abilita', operatore: 'in-scorta', valori: { persona: c.persona, abilita: c.abilita } };
    case 'spillo': return { stato: 'spillo', operatore: c.segnato ? 'segnato' : 'non-segnato', valori: { spillo: c.spillo } };
    case 'voce-guida': return { stato: 'voce-guida', operatore: c.segnata ? 'segnata' : 'non-segnata', valori: { voce: c.voce } };
  }
}
