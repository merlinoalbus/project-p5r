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

import { ARCHI_STORIA, CONTATORI, DOTI_CONDIZIONE, EVENTI_STORIA, GIORNI_SETTIMANA, PALAZZI_CONDIZIONE, RANGHI_CLIENTE, STAGIONI, dataValida, ordineGioco, type ContatoreChiave, type RangoCliente, type RequisitoSpillo } from './condizioniSpillo.js';

/** Come si sceglie un valore: da quale elenco, o che numero. */
export type TipoCampo =
  | 'data' | 'fascia' | 'giorni' | 'stagione'
  | 'quartiere' | 'arco' | 'palazzo'
  | 'dote' | 'rango5' | 'confidente' | 'rango10' | 'membro' | 'richiesta'
  | 'libro' | 'film' | 'articolo'
  | 'attivita' | 'volte' | 'negozio-con-gradi' | 'rango-cliente' | 'negozio-con-punti' | 'punti'
  | 'evento' | 'contatore' | 'almeno'
  | 'arcano' | 'persona' | 'abilita';

export interface CampoCondizione { nome: string; tipo: TipoCampo; etichetta: string }
export interface OperatoreCondizione { chiave: string; nome: string; campi: CampoCondizione[] }
export interface DefinizioneStato {
  chiave: string;
  nome: string;
  gruppo: 'Calendario e mondo' | 'Storia e progressi' | 'Guida' | 'Negozi' | 'Scorta';
  /** Da dove la partita lo legge: si mostra nell'editor, così si sa dove andare a segnarlo. */
  origine: string;
  operatori: OperatoreCondizione[];
}

const campo = (nome: string, tipo: TipoCampo, etichetta: string): CampoCondizione => ({ nome, tipo, etichetta });

export const STATI_PARTITA: readonly DefinizioneStato[] = [
  // — Calendario e mondo —
  { chiave: 'data-gioco', nome: 'Data di gioco', gruppo: 'Calendario e mondo', origine: 'Partita → Oggi', operatori: [
    { chiave: 'dal', nome: 'dal', campi: [campo('dal', 'data', 'Data')] },
    { chiave: 'il', nome: 'solo il', campi: [campo('dal', 'data', 'Giorno')] },
    { chiave: 'tra', nome: 'tra', campi: [campo('dal', 'data', 'Dal'), campo('al', 'data', 'Al')] },
  ] },
  { chiave: 'fascia', nome: 'Momento della giornata', gruppo: 'Calendario e mondo', origine: 'Partita → Oggi', operatori: [{ chiave: 'e', nome: 'è', campi: [campo('fascia', 'fascia', 'Momento')] }] },
  { chiave: 'meteo', nome: 'Meteo', gruppo: 'Calendario e mondo', origine: 'calendario di gioco', operatori: [{ chiave: 'piove', nome: 'piove', campi: [] }, { chiave: 'non-piove', nome: 'non piove', campi: [] }] },
  { chiave: 'giorno-settimana', nome: 'Giorno della settimana', gruppo: 'Calendario e mondo', origine: 'calendario di gioco', operatori: [{ chiave: 'in', nome: 'è uno di', campi: [campo('giorni', 'giorni', 'Giorni')] }] },
  { chiave: 'stagione', nome: 'Stagione', gruppo: 'Calendario e mondo', origine: 'calendario di gioco', operatori: [{ chiave: 'e', nome: 'è', campi: [campo('stagione', 'stagione', 'Stagione')] }] },
  { chiave: 'quartiere', nome: 'Quartiere', gruppo: 'Calendario e mondo', origine: 'data di sblocco nella Guida', operatori: [{ chiave: 'sbloccato', nome: 'sbloccato', campi: [campo('quartiere', 'quartiere', 'Quartiere')] }] },
  { chiave: 'arco', nome: 'Arco della storia', gruppo: 'Calendario e mondo', origine: 'data di gioco', operatori: [{ chiave: 'almeno', nome: 'arrivato almeno a', campi: [campo('dungeon', 'arco', 'Palazzo')] }] },
  // — Storia e progressi —
  { chiave: 'palazzo', nome: 'Palazzo', gruppo: 'Storia e progressi', origine: 'boss segnato nella Guida', operatori: [{ chiave: 'completato', nome: 'completato', campi: [campo('dungeon', 'palazzo', 'Palazzo')] }] },
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
];

export type ValoriCondizione = Record<string, string | number | string[]>;
export interface SceltaCondizione { stato: string; operatore: string; valori: ValoriCondizione }

export function definizioneStato(chiave: string): DefinizioneStato | undefined {
  return STATI_PARTITA.find((s) => s.chiave === chiave);
}

/** Valore predefinito di un campo: la prima voce dell'elenco quando è fisso, altrimenti vuoto. */
export function valorePredefinito(tipo: TipoCampo): string | number | string[] {
  switch (tipo) {
    case 'data': return '04-18';
    case 'fascia': return 'giorno';
    case 'giorni': return ['domenica'];
    case 'stagione': return STAGIONI[0].chiave;
    case 'arco': return ARCHI_STORIA[1];
    case 'palazzo': return PALAZZI_CONDIZIONE[0].chiave;
    case 'dote': return DOTI_CONDIZIONE[0].chiave;
    case 'rango5': return 2;
    case 'rango10': return 1;
    case 'volte': return 1;
    case 'rango-cliente': return RANGHI_CLIENTE[1].chiave;
    case 'punti': return 50;
    case 'evento': return EVENTI_STORIA[0].chiave;
    case 'contatore': return CONTATORI[0].chiave;
    case 'almeno': return 1;
    default: return '';
  }
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
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
    case 'meteo': return scelta.operatore === 'piove' ? { tipo: 'piove' } : { tipo: 'meteo', condizione: 'non-piove' };
    case 'giorno-settimana': {
      const giorni = GIORNI_SETTIMANA.map((g) => g.chiave).filter((g) => Array.isArray(v.giorni) && v.giorni.includes(g));
      return giorni.length > 0 && giorni.length < 7 ? { tipo: 'giorno-settimana', giorni } : null;
    }
    case 'stagione': return STAGIONI.some((x) => x.chiave === v.stagione) ? { tipo: 'stagione', stagione: s(v.stagione) } : null;
    case 'quartiere': return s(v.quartiere) ? { tipo: 'quartiere', quartiere: s(v.quartiere) } : null;
    case 'arco': return (ARCHI_STORIA as readonly string[]).includes(s(v.dungeon)) ? { tipo: 'arco', dungeon: s(v.dungeon) } : null;
    case 'palazzo': return s(v.dungeon) ? { tipo: 'palazzo', dungeon: s(v.dungeon) } : null;
    case 'dote': return DOTI_CONDIZIONE.some((d) => d.chiave === v.dote) && n(v.rango) >= 1 && n(v.rango) <= 5 ? { tipo: 'dote', dote: s(v.dote), rango: n(v.rango) } : null;
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
    case 'meteo': return { stato: 'meteo', operatore: 'non-piove', valori: {} };
    case 'giorno-settimana': return { stato: 'giorno-settimana', operatore: 'in', valori: { giorni: c.giorni } };
    case 'stagione': return { stato: 'stagione', operatore: 'e', valori: { stagione: c.stagione } };
    case 'quartiere': return { stato: 'quartiere', operatore: 'sbloccato', valori: { quartiere: c.quartiere } };
    case 'arco': return { stato: 'arco', operatore: 'almeno', valori: { dungeon: c.dungeon } };
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
  }
}
