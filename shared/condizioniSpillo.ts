// ============================================================
// Condizioni — stati della partita che decidono se una cosa c'è, si vede o si può fare
// ============================================================
//
// Una condizione è **uno stato del sistema confrontato con un valore**: «data di gioco dal 18
// aprile», «Ann in squadra», «Confidente Sojiro almeno rango 4», «biliardo giocato almeno una
// volta». Vale per tutto — spilli, articoli, negozi, attività, libri, film — con lo stesso
// vocabolario, lo stesso valutatore (`disponibilitaService`) e lo stesso editor.
//
// **Niente testo.** Non esiste una condizione «da configurare» né uno «stato» con nome libero:
// c'erano, e 324 righe del catalogo erano rimaste frasi che nessuno leggeva (richiesta
// dell'utente, 2026-09-11: «non voglio più vedere condizioni espresse come frasi testuali»). Se
// una frase della guida non si sa convertire in uno stato, **non diventa una condizione**: la riga
// resta disponibile e la frase finisce nel rapporto di conversione, non nei dati.
//
// I gruppi si annidano liberamente: `tutte` (E), `almeno-una` (O) e `non` a qualsiasi profondità,
// fino a cinque livelli. L'elenco di primo livello è un `tutte` implicito.
//
// Condiviso fra server (validazione, valutazione, pacchetti, seed) e frontend (editor, visore).
// ============================================================

export const PALAZZI_CONDIZIONE = [
  { chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }, { chiave: 'madarame', nome: 'Palazzo di Madarame' }, { chiave: 'kaneshiro', nome: 'Palazzo di Kaneshiro' },
  { chiave: 'futaba', nome: 'Palazzo di Futaba' }, { chiave: 'okumura', nome: 'Palazzo di Okumura' }, { chiave: 'niijima', nome: 'Palazzo di Niijima' },
  { chiave: 'shido', nome: 'Palazzo di Shido' }, { chiave: 'iweleth', nome: 'Dedalo di Iweleth' }, { chiave: 'maruki', nome: 'Palazzo di Maruki' },
] as const;
/** Gli archi della storia nell'ordine in cui il gioco li impone: ogni arco comincia con il suo Palazzo. */
export const ARCHI_STORIA = ['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'maruki'] as const;
export const DOTI_CONDIZIONE = [
  { chiave: 'conoscenza', nome: 'Conoscenza' }, { chiave: 'coraggio', nome: 'Coraggio' }, { chiave: 'perizia', nome: 'Perizia' }, { chiave: 'gentilezza', nome: 'Gentilezza' }, { chiave: 'fascino', nome: 'Fascino' },
] as const;
export const GIORNI_SETTIMANA = [
  { chiave: 'lunedi', nome: 'lunedì' }, { chiave: 'martedi', nome: 'martedì' }, { chiave: 'mercoledi', nome: 'mercoledì' }, { chiave: 'giovedi', nome: 'giovedì' },
  { chiave: 'venerdi', nome: 'venerdì' }, { chiave: 'sabato', nome: 'sabato' }, { chiave: 'domenica', nome: 'domenica' },
] as const;
export const STAGIONI = [{ chiave: 'primavera', nome: 'primavera' }, { chiave: 'estate', nome: 'estate' }, { chiave: 'autunno', nome: 'autunno' }, { chiave: 'inverno', nome: 'inverno' }] as const;
/** Mesi nell'ordine del calendario di gioco (aprile → marzo). */
export const MESI_GIOCO = [
  { numero: '04', nome: 'aprile' }, { numero: '05', nome: 'maggio' }, { numero: '06', nome: 'giugno' }, { numero: '07', nome: 'luglio' }, { numero: '08', nome: 'agosto' }, { numero: '09', nome: 'settembre' },
  { numero: '10', nome: 'ottobre' }, { numero: '11', nome: 'novembre' }, { numero: '12', nome: 'dicembre' }, { numero: '01', nome: 'gennaio' }, { numero: '02', nome: 'febbraio' }, { numero: '03', nome: 'marzo' },
] as const;
/** I gradi cliente di un negozio che li ha (Tanaka): si salgono spendendo, e la soglia è in yen. */
export const RANGHI_CLIENTE = [
  { chiave: 'iniziale', nome: 'Iniziale', spesa: 0 }, { chiave: 'nero', nome: 'Nero', spesa: 10000 }, { chiave: 'oscuro', nome: 'Oscuro', spesa: 50000 }, { chiave: 'caos', nome: 'Caos', spesa: 100000 },
] as const;
export type RangoCliente = (typeof RANGHI_CLIENTE)[number]['chiave'];
/** I contatori che la partita sa calcolare da sola dai progressi segnati. */
export const CONTATORI = [
  { chiave: 'film-completati', nome: 'Film o DVD completati' }, { chiave: 'videogiochi-completati', nome: 'Videogiochi completati' }, { chiave: 'libri-letti', nome: 'Libri letti' },
] as const;
export type ContatoreChiave = (typeof CONTATORI)[number]['chiave'];
/** Gli eventi di storia. Quelli con `membro` sono «entra in squadra»: **si calcolano** dalla squadra della
 *  partita (`membro_squadra_partita.in_squadra`) e non si segnano a mano; niente date canoniche. */
export const EVENTI_STORIA = [
  { chiave: 'mansarda-pulita', nome: 'Mansarda del Leblanc pulita' },
  { chiave: 'evento-makoto', nome: 'Evento con Makoto (entra in squadra)', membro: 'makoto' },
  { chiave: 'evento-futaba', nome: 'Evento con Futaba (entra in squadra)', membro: 'futaba' },
  { chiave: 'evento-haru', nome: 'Evento con Haru (entra in squadra)', membro: 'haru' },
  { chiave: 'evento-akechi', nome: 'Evento con Akechi (entra in squadra)', membro: 'akechi' },
  { chiave: 'primo-strumento-creato', nome: 'Primo strumento di infiltrazione creato' },
  { chiave: 'biliardo-rango-tecnico-3', nome: 'Biliardo: rango tecnico 3 raggiunto' },
] as const;
export type EventoStoria = (typeof EVENTI_STORIA)[number]['chiave'];
/** Il Ladro che fa avvenire l'evento, o null se l'evento si segna a mano. */
export function membroDellEvento(chiave: string): string | null {
  const e = EVENTI_STORIA.find((x) => x.chiave === chiave);
  return e && 'membro' in e ? e.membro : null;
}

/** Una condizione: uno stato della partita e il valore richiesto. Le date sono «MM-GG» del calendario di gioco. */
export type RequisitoSpillo =
  | { tipo: 'gruppo'; modo: 'tutte' | 'almeno-una'; condizioni: RequisitoSpillo[] }
  | { tipo: 'non'; condizione: RequisitoSpillo }
  // — calendario e mondo —
  | { tipo: 'data'; dal: string }
  | { tipo: 'intervallo'; dal: string; al: string }
  /** Momento della giornata della partita (scheda «Oggi»): le due fasce della guida. */
  | { tipo: 'fascia'; fascia: 'giorno' | 'sera' }
  | { tipo: 'piove' }
  | { tipo: 'meteo'; condizione: 'non-piove' }
  | { tipo: 'giorno-settimana'; giorni: string[] }
  | { tipo: 'stagione'; stagione: string }
  | { tipo: 'quartiere'; quartiere: string }
  /** L'arco della storia è arrivato almeno a questo Palazzo: lo dice la data di gioco, perché il gioco li impone in ordine. */
  | { tipo: 'arco'; dungeon: string }
  // — progressi —
  | { tipo: 'palazzo'; dungeon: string }
  | { tipo: 'dote'; dote: string; rango: number }
  | { tipo: 'confidente'; confidente: string; rango: number }
  /** Un Ladro Fantasma è in squadra: lo dice la partita (Partita → Denaro e squadra). */
  | { tipo: 'squadra'; membro: string }
  | { tipo: 'richiesta'; richiesta: string }
  | { tipo: 'lettura'; categoria: 'libro' | 'film'; chiave: string }
  | { tipo: 'articolo'; articolo: string }
  /** Un'attività della guida svolta almeno tante volte (Partita → Progressi). */
  | { tipo: 'attivita'; attivita: string; volte: number }
  /** Grado cliente di un negozio, calcolato dalla spesa cumulata in quel negozio. */
  | { tipo: 'rango-cliente'; negozio: string; rango: RangoCliente }
  /** Punti fedeltà di un negozio (Partita → Progressi). */
  | { tipo: 'punti-negozio'; negozio: string; punti: number }
  | { tipo: 'evento'; evento: string }
  | { tipo: 'contatore'; cosa: ContatoreChiave; almeno: number }
  // — scorta —
  | { tipo: 'persona-arcano'; arcano: string }
  | { tipo: 'persona-abilita'; persona: string; abilita: string };

export type TipoCondizioneSpillo = RequisitoSpillo['tipo'];
export const PROFONDITA_MASSIMA = 5;
export const CONDIZIONI_PER_GRUPPO = 20;

/** Le condizioni che dicono se una cosa **c'è**, in quel momento della partita.
 *
 * Sono le sole che possono far sparire un pin dal visore, e la distinzione non è un dettaglio di
 * implementazione: è la regola del prodotto. Un quartiere che apre il 18 giugno l'11 aprile non
 * esiste, e mostrarne i negozi manda il giocatore in un posto che non c'è; un Palazzo esiste solo
 * fra la data in cui si apre e quella in cui scade; un venditore che esce solo quando piove col
 * sole non c'è; un articolo «dall'arco di Madarame» prima di quell'arco non è in vetrina.
 *
 * Tutto il resto — una dote da alzare, un Confidente da portare a un rango, un Palazzo da
 * completare, una porta che vuole una chiave — è un **prerequisito**: la cosa c'è, semplicemente
 * non puoi ancora usarla. Nascondere un prerequisito vorrebbe dire che la guida ti mostra dov'è
 * una porta solo dopo che l'hai aperta, cioè quando non ti serve più. Quelle condizioni si
 * scrivono e si spiegano, non tolgono il pin.
 */
export const CONDIZIONI_DI_PRESENZA = [
  'data', 'intervallo', 'fascia', 'piove', 'meteo', 'giorno-settimana', 'stagione', 'quartiere', 'arco',
] as const;

/** Vero se questa condizione, non soddisfatta, deve far sparire il pin invece che spiegarsi. */
export function nascondeIlPin(tipo: string): boolean {
  return (CONDIZIONI_DI_PRESENZA as readonly string[]).includes(tipo);
}

/** La parte di una condizione che riguarda la presenza, isolata dal resto.
 *
 * Serve perché una condizione può mescolare le due cose, e allora non basta chiedersi «questa è
 * una presenza?»: bisogna chiedersi «che cosa dice, di presenza?». Il caso che conta è
 * `tutte(fascia sera, dote 3)`: il negozio apre solo di sera **e** vuole una dote. Di giorno il
 * negozio non c'è, dote o non dote, e il pin deve sparire.
 *
 * - una condizione di presenza resta sé stessa;
 * - un prerequisito sparisce (`null`): non dice nulla sulla presenza;
 * - in un `tutte` restano i rami che dicono qualcosa — se tutti tacciono, tace anche il gruppo;
 * - in un `almeno-una` basta **un** ramo che tace perché il gruppo taccia: la cosa potrebbe
 *   esserci per quella strada, e non si può concludere che manchi;
 * - `non` segue ciò che nega.
 */
export function proiezioneDiPresenza<T extends { tipo: string; condizioni?: T[]; condizione?: T; modo?: string }>(c: T): T | null {
  if (c.tipo === 'gruppo') {
    const figlie = (c.condizioni ?? []).map((f) => proiezioneDiPresenza(f));
    if (c.modo === 'almeno-una') {
      return figlie.some((f) => f === null) ? null
        : { ...c, condizioni: figlie as T[] };
    }
    const tenute = figlie.filter((f): f is T => f !== null);
    return tenute.length ? { ...c, condizioni: tenute } : null;
  }
  if (c.tipo === 'non') {
    const dentro = c.condizione ? proiezioneDiPresenza(c.condizione) : null;
    return dentro ? { ...c, condizione: dentro } : null;
  }
  return nascondeIlPin(c.tipo) ? c : null;
}

const NOMI_MESI: Record<string, string> = Object.fromEntries(MESI_GIOCO.map((m) => [m.numero, m.nome]));
const DATA_MMGG = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
/** Giorni di ogni mese nel calendario di gioco (aprile 2016 → marzo 2017: febbraio ne ha 28). */
export const GIORNI_NEL_MESE: Record<string, number> = { '01': 31, '02': 28, '03': 31, '04': 30, '05': 31, '06': 30, '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31 };

/** «MM-GG» esistente nel calendario di gioco (niente 31 aprile né 30 febbraio). */
export function dataValida(d: string): boolean {
  const m = DATA_MMGG.exec(d);
  return !!m && Number(m[2]) <= (GIORNI_NEL_MESE[m[1]] ?? 0);
}

/** Ordine del calendario di gioco: da aprile (04) a marzo (03) dell'anno dopo. */
export function ordineGioco(d: string): number {
  const [m, g] = d.split('-').map(Number);
  return ((m + 8) % 12) * 100 + g;
}

const NUMERO_MESE: Record<string, string> = Object.fromEntries(MESI_GIOCO.map((m) => [m.nome, m.numero]));

/**
 * Data di sblocco di un quartiere dal testo della Guida: solo se il testo comincia con una data («18 giugno (evento di trama)» → «06-18»);
 * i testi che dipendono da Confidenti o libri («Confidente Emperor (Yusuke) Rango 3») non sono calcolabili → null.
 */
export function dataSbloccoQuartiere(sblocco: string | null | undefined): string | null {
  if (!sblocco) return null;
  const piatto = sblocco.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/^1°/, 'primo');
  const m = /^(\d{1,2}|primo)\s+([a-z]+)/.exec(piatto);
  if (!m) return null;
  const mese = NUMERO_MESE[m[2]];
  if (!mese) return null;
  const giorno = m[1] === 'primo' ? 1 : Number(m[1]);
  const data = `${mese}-${String(giorno).padStart(2, '0')}`;
  return dataValida(data) ? data : null;
}

/** «04-18» → «18 aprile»; testi in altro formato restano com'erano. */
export function dataLeggibile(d: string): string {
  const m = DATA_MMGG.exec(d);
  if (!m) return d;
  return `${Number(m[2])} ${NOMI_MESI[m[1]]}`;
}

/** Nomi da mostrare al posto delle chiavi: chi li ha li passa, altrimenti resta la chiave. */
export interface NomiCondizioni {
  articoli?: Record<string, string>;
  letture?: Record<string, string>;
  confidenti?: Record<string, string>;
  quartieri?: Record<string, string>;
  richieste?: Record<string, string>;
  dungeon?: Record<string, string>;
  attivita?: Record<string, string>;
  negozi?: Record<string, string>;
  /** I Ladri Fantasma (per «in squadra»); quando manca si prova con i Confidenti. */
  squadra?: Record<string, string>;
}

function congiunzione(voci: string[]): string {
  if (voci.length <= 1) return voci.join('');
  return `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
}

export function nomePalazzo(chiave: string, nomi: NomiCondizioni = {}): string {
  return nomi.dungeon?.[chiave] ?? PALAZZI_CONDIZIONE.find((p) => p.chiave === chiave)?.nome ?? chiave;
}

/** Testo in italiano della condizione, **generato** dallo stato: non è un dato, è la sua lettura. */
export function descriviRequisitoSpillo(r: RequisitoSpillo, nomi: NomiCondizioni = {}): string {
  switch (r.tipo) {
    case 'gruppo': return (r.modo === 'tutte' ? 'Tutte: ' : 'Almeno una: ') + r.condizioni.map(c => descriviRequisitoSpillo(c, nomi)).join(' · ');
    case 'non': return 'Non: ' + descriviRequisitoSpillo(r.condizione, nomi);
    case 'data': return `dal ${dataLeggibile(r.dal)}`;
    case 'intervallo': return r.dal === r.al ? `solo il ${dataLeggibile(r.dal)}` : `solo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)}`;
    case 'fascia': return `solo di ${r.fascia}`;
    case 'piove': return 'solo nei giorni di pioggia';
    case 'meteo': return 'non disponibile in caso di pioggia';
    case 'giorno-settimana': return `solo ${congiunzione(r.giorni.map((g) => GIORNI_SETTIMANA.find((x) => x.chiave === g)?.nome ?? g))}`;
    case 'stagione': return `solo in ${r.stagione}`;
    case 'quartiere': return `da quando si sblocca ${nomi.quartieri?.[r.quartiere] ?? r.quartiere}`;
    case 'arco': return `dall'arco del ${nomePalazzo(r.dungeon, nomi)}`;
    case 'palazzo': return `dopo il ${nomePalazzo(r.dungeon, nomi)}`;
    case 'dote': return `${DOTI_CONDIZIONE.find((d) => d.chiave === r.dote)?.nome ?? r.dote} Rango ${r.rango}`;
    case 'confidente': return `Rango Confidente ${nomi.confidenti?.[r.confidente] ?? r.confidente} ${r.rango}`;
    case 'squadra': return `${nomi.squadra?.[r.membro] ?? nomi.confidenti?.[r.membro] ?? r.membro} in squadra`;
    case 'richiesta': return `richiesta «${nomi.richieste?.[r.richiesta] ?? r.richiesta}» completata`;
    case 'lettura': return (r.categoria === 'libro' ? 'Libro letto: ' : 'Film visto: ') + (nomi.letture?.[r.chiave] ?? r.chiave);
    case 'articolo': return 'Articolo ottenuto: ' + (nomi.articoli?.[r.articolo] ?? r.articolo);
    case 'attivita': return `${nomi.attivita?.[r.attivita] ?? r.attivita}: svolta almeno ${r.volte === 1 ? 'una volta' : `${r.volte} volte`}`;
    case 'rango-cliente': return `grado cliente ${RANGHI_CLIENTE.find((x) => x.chiave === r.rango)?.nome ?? r.rango} da ${nomi.negozi?.[r.negozio] ?? r.negozio}`;
    case 'punti-negozio': return `almeno ${r.punti} punti negozio da ${nomi.negozi?.[r.negozio] ?? r.negozio}`;
    case 'evento': return EVENTI_STORIA.find((e) => e.chiave === r.evento)?.nome ?? r.evento;
    case 'contatore': return `${CONTATORI.find((c) => c.chiave === r.cosa)?.nome ?? r.cosa}: almeno ${r.almeno}`;
    case 'persona-arcano': return 'Persona in scorta dell’Arcano ' + r.arcano;
    case 'persona-abilita': return r.persona + ' in scorta con ' + r.abilita;
  }
}

function testoPulito(x: unknown, max = 200): string | null {
  return typeof x === 'string' && x.trim().length > 0 && x.length <= max ? x.trim() : null;
}
function chiavePulita(x: unknown, max = 120): string | null {
  const t = testoPulito(x, max);
  return t && /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(t) ? t : null;
}
function intero(x: unknown, min: number, max: number): number | null {
  return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : null;
}

/**
 * Riporta un valore qualsiasi (pacchetto importato, seed, corpo API) a una condizione valida, oppure `null` se non lo è.
 * Le chiavi vengono solo ripulite: la loro esistenza la verifica il server sul DB.
 */
export function normalizzaRequisitoSpillo(x: unknown, profondita = 0): RequisitoSpillo | null {
  if (profondita > PROFONDITA_MASSIMA) return null;
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  switch (o.tipo) {
    case 'gruppo': {
      if (!['tutte', 'almeno-una'].includes(String(o.modo)) || !Array.isArray(o.condizioni) || o.condizioni.length < 1 || o.condizioni.length > CONDIZIONI_PER_GRUPPO) return null;
      const condizioni = o.condizioni.map(c => normalizzaRequisitoSpillo(c, profondita + 1));
      return condizioni.every((c): c is RequisitoSpillo => c !== null) ? { tipo: 'gruppo', modo: o.modo as 'tutte' | 'almeno-una', condizioni } : null;
    }
    // «non» è un modificatore, non un livello: conta la profondità dei gruppi, così l'editor e la validazione dicono la stessa cosa
    case 'non': { const c = normalizzaRequisitoSpillo(o.condizione, profondita); return c && c.tipo !== 'non' ? { tipo: 'non', condizione: c } : null; }
    case 'data': { const dal = testoPulito(o.dal, 5); return dal && dataValida(dal) ? { tipo: 'data', dal } : null; }
    // il periodo segue il calendario di gioco (aprile → marzo): la fine non può precedere l'inizio
    case 'intervallo': { const dal = testoPulito(o.dal, 5); const al = testoPulito(o.al, 5); return dal && al && dataValida(dal) && dataValida(al) && ordineGioco(dal) <= ordineGioco(al) ? { tipo: 'intervallo', dal, al } : null; }
    case 'fascia': return o.fascia === 'giorno' || o.fascia === 'sera' ? { tipo: 'fascia', fascia: o.fascia } : null;
    case 'piove': return { tipo: 'piove' };
    case 'meteo': return o.condizione === 'non-piove' ? { tipo: 'meteo', condizione: 'non-piove' } : null;
    case 'giorno-settimana': {
      if (!Array.isArray(o.giorni)) return null;
      const giorni = GIORNI_SETTIMANA.map((g) => g.chiave).filter((g) => (o.giorni as unknown[]).includes(g));
      return giorni.length > 0 && giorni.length < 7 ? { tipo: 'giorno-settimana', giorni } : null;
    }
    case 'stagione': { const stagione = testoPulito(o.stagione, 20); return stagione && STAGIONI.some((s) => s.chiave === stagione) ? { tipo: 'stagione', stagione } : null; }
    case 'quartiere': { const quartiere = chiavePulita(o.quartiere, 60); return quartiere ? { tipo: 'quartiere', quartiere } : null; }
    case 'arco': { const dungeon = chiavePulita(o.dungeon, 60); return dungeon && (ARCHI_STORIA as readonly string[]).includes(dungeon) ? { tipo: 'arco', dungeon } : null; }
    case 'palazzo': { const dungeon = chiavePulita(o.dungeon, 60); return dungeon ? { tipo: 'palazzo', dungeon } : null; }
    case 'dote': { const dote = testoPulito(o.dote, 20); const rango = intero(o.rango, 1, 5); return dote && DOTI_CONDIZIONE.some((d) => d.chiave === dote) && rango ? { tipo: 'dote', dote, rango } : null; }
    case 'confidente': { const confidente = chiavePulita(o.confidente, 60); const rango = intero(o.rango, 1, 10); return confidente && rango ? { tipo: 'confidente', confidente, rango } : null; }
    case 'squadra': { const membro = chiavePulita(o.membro, 60); return membro ? { tipo: 'squadra', membro } : null; }
    case 'richiesta': { const richiesta = testoPulito(o.richiesta, 200); return richiesta ? { tipo: 'richiesta', richiesta } : null; }
    case 'lettura': { const chiave = testoPulito(o.chiave, 200); return chiave && (o.categoria === 'libro' || o.categoria === 'film') ? { tipo: 'lettura', categoria: o.categoria, chiave } : null; }
    case 'articolo': { const articolo = testoPulito(o.articolo, 200); return articolo ? { tipo: 'articolo', articolo } : null; }
    case 'attivita': { const attivita = chiavePulita(o.attivita, 120); const volte = intero(o.volte, 1, 999); return attivita && volte ? { tipo: 'attivita', attivita, volte } : null; }
    case 'rango-cliente': { const negozio = chiavePulita(o.negozio, 120); const rango = testoPulito(o.rango, 20); return negozio && rango && RANGHI_CLIENTE.some((x) => x.chiave === rango) ? { tipo: 'rango-cliente', negozio, rango: rango as RangoCliente } : null; }
    case 'punti-negozio': { const negozio = chiavePulita(o.negozio, 120); const punti = intero(o.punti, 1, 999999); return negozio && punti ? { tipo: 'punti-negozio', negozio, punti } : null; }
    case 'evento': { const evento = chiavePulita(o.evento, 60); return evento && EVENTI_STORIA.some((e) => e.chiave === evento) ? { tipo: 'evento', evento } : null; }
    case 'contatore': { const cosa = testoPulito(o.cosa, 40); const almeno = intero(o.almeno, 1, 9999); return cosa && CONTATORI.some((c) => c.chiave === cosa) && almeno ? { tipo: 'contatore', cosa: cosa as ContatoreChiave, almeno } : null; }
    case 'persona-arcano': { const arcano = testoPulito(o.arcano, 80); return arcano ? { tipo: 'persona-arcano', arcano } : null; }
    case 'persona-abilita': { const persona = testoPulito(o.persona, 120), abilita = testoPulito(o.abilita, 120); return persona && abilita ? { tipo: 'persona-abilita', persona, abilita } : null; }
    default: return null;
  }
}

/** Elenco normalizzato: scarta le voci non valide e i doppioni, al massimo `max` condizioni. */
export function normalizzaCondizioniSpillo(x: unknown, max = CONDIZIONI_PER_GRUPPO): RequisitoSpillo[] {
  if (!Array.isArray(x)) return [];
  const viste = new Set<string>();
  const out: RequisitoSpillo[] = [];
  for (const voce of x) {
    const r = normalizzaRequisitoSpillo(voce);
    if (!r) continue;
    const chiave = JSON.stringify(r);
    if (viste.has(chiave)) continue;
    viste.add(chiave);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/** Condizioni salvate in tabella. Un dato danneggiato non è una condizione: la riga resta senza, e il server lo registra. */
export function leggiCondizioniSalvate(json: string | null): RequisitoSpillo[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    if (Array.isArray(v)) return normalizzaCondizioniSpillo(v);
  } catch { /* JSON rotto: nessuna condizione */ }
  return [];
}

/** Tutte le foglie di una condizione (i gruppi e le negazioni si attraversano). */
export function foglieCondizione(r: RequisitoSpillo): RequisitoSpillo[] {
  if (r.tipo === 'gruppo') return r.condizioni.flatMap(foglieCondizione);
  if (r.tipo === 'non') return foglieCondizione(r.condizione);
  return [r];
}
