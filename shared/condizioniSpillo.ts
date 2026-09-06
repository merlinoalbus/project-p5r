// ============================================================
// Condizioni di visibilità degli spilli delle mappe (Fase 15.22)
// ============================================================
//
// Uno spillo può avere condizioni strutturate, le stesse che l'app sa valutare da sola per articoli e Confidenti: data, periodo,
// Palazzo completato, Dote, rango di un Confidente, richiesta dei Mementos, pioggia, momento della giornata (giorno/sera, fascia della
// partita), giorni della settimana, stagione, sblocco di un quartiere con data nella Guida. Niente condizioni «manuali» o testuali: se
// l'app non può calcolarla, non è una condizione dello spillo (richiesta dell'utente,
// 2026-09-05). Con una partita attiva lo spillo bloccato sparisce dalla mappa (con «Mostra anche i non ancora disponibili»); senza partita
// le condizioni sono solo mostrate. Condiviso fra server (validazione, valutazione, pacchetti) e frontend (editor, visore).
// ============================================================

export const PALAZZI_CONDIZIONE = [
  { chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }, { chiave: 'madarame', nome: 'Palazzo di Madarame' }, { chiave: 'kaneshiro', nome: 'Palazzo di Kaneshiro' },
  { chiave: 'futaba', nome: 'Palazzo di Futaba' }, { chiave: 'okumura', nome: 'Palazzo di Okumura' }, { chiave: 'niijima', nome: 'Palazzo di Niijima' },
  { chiave: 'shido', nome: 'Palazzo di Shido' }, { chiave: 'iweleth', nome: 'Dedalo di Iweleth' }, { chiave: 'maruki', nome: 'Palazzo di Maruki' },
] as const;
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

/** Condizione calcolabile dall'app (mai «manuale»). Le date sono «MM-GG» del calendario di gioco. */
export type RequisitoSpillo =
  | { tipo: 'gruppo'; modo: 'tutte' | 'almeno-una'; condizioni: RequisitoSpillo[] }
  | { tipo: 'non'; condizione: RequisitoSpillo }
  | { tipo: 'stato'; chiave: string; confronto: 'almeno' | 'uguale' | 'massimo'; valore: number }
  | { tipo: 'articolo'; articolo: string }
  | { tipo: 'lettura'; categoria: 'libro' | 'film'; chiave: string }
  | { tipo: 'persona-arcano'; arcano: string }
  | { tipo: 'persona-abilita'; persona: string; abilita: string }
  | { tipo: 'da-configurare'; nota: string }

  | { tipo: 'data'; dal: string }
  | { tipo: 'intervallo'; dal: string; al: string }
  | { tipo: 'palazzo'; dungeon: string }
  | { tipo: 'dote'; dote: string; rango: number }
  | { tipo: 'confidente'; confidente: string; rango: number }
  | { tipo: 'richiesta'; richiesta: string }
  | { tipo: 'piove' }
  | { tipo: 'meteo'; condizione: 'non-piove' }
  | { tipo: 'giorno-settimana'; giorni: string[] }
  | { tipo: 'stagione'; stagione: string }
  | { tipo: 'quartiere'; quartiere: string }
  /** Momento della giornata della partita (scheda «Oggi»): le due fasce della guida. */
  | { tipo: 'fascia'; fascia: 'giorno' | 'sera' };

export type TipoCondizioneSpillo = RequisitoSpillo['tipo'];

/** Voci del selettore dell'editor: la pioggia ha due verbi (solo con / mai con), gli altri tipi uno. */
/** Le condizioni che dicono se una cosa **c'è**, in quel momento della partita.
 *
 * Sono le sole che possono far sparire un pin dal visore, e la distinzione non è un dettaglio di
 * implementazione: è la regola del prodotto. Un quartiere che apre il 18 giugno l'11 aprile non
 * esiste, e mostrarne i negozi manda il giocatore in un posto che non c'è; un Palazzo esiste solo
 * fra la data in cui si apre e quella in cui scade; un venditore che esce solo quando piove col
 * sole non c'è.
 *
 * Tutto il resto — una dote da alzare, un Confidente da portare a un rango, un Palazzo da
 * completare, una porta che vuole una chiave — è un **prerequisito**: la cosa c'è, semplicemente
 * non puoi ancora usarla. Nascondere un prerequisito vorrebbe dire che la guida ti mostra dov'è
 * una porta solo dopo che l'hai aperta, cioè quando non ti serve più. Quelle condizioni si
 * scrivono e si spiegano, non tolgono il pin.
 */
export const CONDIZIONI_DI_PRESENZA = [
  'data', 'intervallo', 'fascia', 'piove', 'meteo', 'giorno-settimana', 'stagione', 'quartiere',
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
 * negozio non c'è, dote o non dote, e il pin deve sparire. Trattare il gruppo come «misto, quindi
 * non nascondo» lo lasciava visibile di giorno, che è la cosa che si vuole evitare.
 *
 * La proiezione tiene solo i rami di presenza:
 *
 * - una condizione di presenza resta sé stessa;
 * - un prerequisito sparisce (`null`): non dice nulla sulla presenza;
 * - in un `tutte` restano i rami che dicono qualcosa — se tutti tacciono, tace anche il gruppo;
 * - in un `almeno-una` basta **un** ramo che tace perché il gruppo taccia: la cosa potrebbe
 *   esserci per quella strada, e non si può concludere che manchi;
 * - `non` segue ciò che nega.
 *
 * Quel che resta si valuta come una condizione qualsiasi: se è rossa, la cosa in quel momento non
 * c'è, e il pin sparisce.
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

export const SCELTE_CONDIZIONE = [
  { chiave: 'data', nome: 'Da una data in avanti' },
  { chiave: 'intervallo', nome: 'Solo in un periodo' },
  { chiave: 'palazzo', nome: 'Dopo aver completato un Palazzo' },
  { chiave: 'dote', nome: 'Dote sociale almeno a un rango' },
  { chiave: 'confidente', nome: 'Confidente almeno a un rango' },
  { chiave: 'richiesta', nome: 'Richiesta dei Mementos completata' },
  { chiave: 'piove', nome: 'Solo nei giorni di pioggia' },
  { chiave: 'non-piove', nome: 'Mai nei giorni di pioggia' },
  { chiave: 'fascia-giorno', nome: 'Solo di giorno (mattina, pranzo, pomeriggio, dopo scuola)' },
  { chiave: 'fascia-sera', nome: 'Solo di sera' },
  { chiave: 'giorno-settimana', nome: 'Solo in certi giorni della settimana' },
  { chiave: 'stagione', nome: 'Solo in una stagione' },
  { chiave: 'quartiere', nome: 'Da quando si sblocca un quartiere' },
] as const;
export type SceltaCondizione = (typeof SCELTE_CONDIZIONE)[number]['chiave'];

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
 * i testi che dipendono da Confidenti o libri («Confidente Emperor (Yusuke) Rango 3») non sono calcolabili → null. Vale sia per il
 * valutatore (server) sia per il costruttore delle condizioni (editor), che offre solo i quartieri datati.
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

/** Nomi da mostrare al posto delle chiavi (Confidenti, quartieri, richieste, Palazzi): chi li ha li passa, altrimenti resta la chiave. */
export interface NomiCondizioni {
  stati?: Record<string, string>;
  articoli?: Record<string, string>;
  letture?: Record<string, string>;
  confidenti?: Record<string, string>;
  quartieri?: Record<string, string>;
  richieste?: Record<string, string>;
  dungeon?: Record<string, string>;
}

function congiunzione(voci: string[]): string {
  if (voci.length <= 1) return voci.join('');
  return `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
}

/** Testo in italiano della condizione, nello stesso stile dei requisiti della guida («dal 18 aprile», «Rango Confidente Sojiro 4»). */
export function descriviRequisitoSpillo(r: RequisitoSpillo, nomi: NomiCondizioni = {}): string {
  switch (r.tipo) {
    case 'gruppo': return (r.modo === 'tutte' ? 'Tutte: ' : 'Almeno una: ') + r.condizioni.map(c => descriviRequisitoSpillo(c, nomi)).join(' · ');
    case 'non': return 'Bloccato quando: ' + descriviRequisitoSpillo(r.condizione, nomi);
    case 'stato': return (nomi.stati?.[r.chiave] ?? r.chiave) + ' ' + r.confronto + ' ' + r.valore;
    case 'articolo': return 'Articolo ottenuto: ' + (nomi.articoli?.[r.articolo] ?? r.articolo);
    case 'lettura': return (r.categoria === 'libro' ? 'Libro letto: ' : 'Film visto: ') + (nomi.letture?.[r.chiave] ?? r.chiave);
    case 'persona-arcano': return 'Persona in scorta dell’Arcano ' + r.arcano;
    case 'persona-abilita': return r.persona + ' in scorta con ' + r.abilita;
    case 'da-configurare': return 'Da configurare: ' + r.nota;

    case 'data': return `dal ${dataLeggibile(r.dal)}`;
    case 'intervallo': return r.dal === r.al ? `solo il ${dataLeggibile(r.dal)}` : `solo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)}`;
    case 'palazzo': return `dopo il ${nomi.dungeon?.[r.dungeon] ?? PALAZZI_CONDIZIONE.find((p) => p.chiave === r.dungeon)?.nome ?? r.dungeon}`;
    case 'dote': return `${DOTI_CONDIZIONE.find((d) => d.chiave === r.dote)?.nome ?? r.dote} Rango ${r.rango}`;
    case 'confidente': return `Rango Confidente ${nomi.confidenti?.[r.confidente] ?? r.confidente} ${r.rango}`;
    case 'richiesta': return `richiesta «${nomi.richieste?.[r.richiesta] ?? r.richiesta}» completata`;
    case 'piove': return 'solo nei giorni di pioggia';
    case 'meteo': return 'non disponibile in caso di pioggia';
    case 'giorno-settimana': return `solo ${congiunzione(r.giorni.map((g) => GIORNI_SETTIMANA.find((x) => x.chiave === g)?.nome ?? g))}`;
    case 'stagione': return `solo in ${r.stagione}`;
    case 'quartiere': return `da quando si sblocca ${nomi.quartieri?.[r.quartiere] ?? r.quartiere}`;
    case 'fascia': return `solo di ${r.fascia}`;
  }
}

function testoPulito(x: unknown, max = 200): string | null {
  return typeof x === 'string' && x.trim().length > 0 && x.length <= max ? x.trim() : null;
}
function intero(x: unknown, min: number, max: number): number | null {
  return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : null;
}

/**
 * Riporta un valore qualsiasi (pacchetto importato, seed, corpo API) a una condizione valida, oppure `null` se non lo è.
 * Le chiavi (Confidente, quartiere, richiesta, Palazzo) vengono solo ripulite: la loro esistenza la verifica il server sul DB.
 */
export function normalizzaRequisitoSpillo(x: unknown, profondita = 0): RequisitoSpillo | null {
  if (profondita > 5) return null;
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  switch (o.tipo) {
    case 'gruppo': {
      if (!['tutte','almeno-una'].includes(String(o.modo)) || !Array.isArray(o.condizioni) || o.condizioni.length < 1 || o.condizioni.length > 20) return null;
      const condizioni = o.condizioni.map(c => normalizzaRequisitoSpillo(c, profondita + 1));
      return condizioni.every((c): c is RequisitoSpillo => c !== null) ? { tipo: 'gruppo', modo: o.modo as 'tutte' | 'almeno-una', condizioni } : null;
    }
    case 'non': { if (profondita !== 0) return null; const c = normalizzaRequisitoSpillo(o.condizione, profondita + 1); return c ? { tipo:'non', condizione:c } : null; }
    case 'stato': return typeof o.chiave === 'string' && /^[a-z0-9-]{1,120}$/.test(o.chiave) && ['almeno','uguale','massimo'].includes(String(o.confronto)) && Number.isInteger(o.valore) && Number(o.valore) >= 0 && Number(o.valore) <= 9999999 ? { tipo:'stato', chiave:o.chiave, confronto:o.confronto as 'almeno'|'uguale'|'massimo', valore:Number(o.valore) } : null;
    case 'articolo': { const articolo=testoPulito(o.articolo,200); return articolo ? { tipo:'articolo', articolo } : null; }
    case 'lettura': { const chiave=testoPulito(o.chiave,200); return chiave && (o.categoria === 'libro' || o.categoria === 'film') ? { tipo:'lettura', categoria:o.categoria, chiave } : null; }
    case 'persona-arcano': { const arcano=testoPulito(o.arcano,80); return arcano ? { tipo:'persona-arcano',arcano } : null; }
    case 'persona-abilita': { const persona=testoPulito(o.persona,120),abilita=testoPulito(o.abilita,120); return persona && abilita ? {tipo:'persona-abilita',persona,abilita}:null; }
    case 'da-configurare': { const nota=testoPulito(o.nota,2000); return nota ? {tipo:'da-configurare',nota}:null; }

    case 'data': { const dal = testoPulito(o.dal, 5); return dal && dataValida(dal) ? { tipo: 'data', dal } : null; }
    // il periodo segue il calendario di gioco (aprile → marzo): la fine non può precedere l'inizio
    case 'intervallo': { const dal = testoPulito(o.dal, 5); const al = testoPulito(o.al, 5); return dal && al && dataValida(dal) && dataValida(al) && ordineGioco(dal) <= ordineGioco(al) ? { tipo: 'intervallo', dal, al } : null; }
    case 'palazzo': { const dungeon = testoPulito(o.dungeon, 60); return dungeon && /^[a-z0-9-]+$/.test(dungeon) ? { tipo: 'palazzo', dungeon } : null; }
    case 'dote': { const dote = testoPulito(o.dote, 20); const rango = intero(o.rango, 1, 5); return dote && DOTI_CONDIZIONE.some((d) => d.chiave === dote) && rango ? { tipo: 'dote', dote, rango } : null; }
    case 'confidente': { const confidente = testoPulito(o.confidente, 60); const rango = intero(o.rango, 1, 10); return confidente && /^[a-z0-9-]+$/.test(confidente) && rango ? { tipo: 'confidente', confidente, rango } : null; }
    case 'richiesta': { const richiesta = testoPulito(o.richiesta, 200); return richiesta ? { tipo: 'richiesta', richiesta } : null; }
    case 'piove': return { tipo: 'piove' };
    case 'meteo': return o.condizione === 'non-piove' ? { tipo: 'meteo', condizione: 'non-piove' } : null;
    case 'giorno-settimana': {
      if (!Array.isArray(o.giorni)) return null;
      const giorni = GIORNI_SETTIMANA.map((g) => g.chiave).filter((g) => (o.giorni as unknown[]).includes(g));
      return giorni.length > 0 && giorni.length < 7 ? { tipo: 'giorno-settimana', giorni } : null;
    }
    case 'stagione': { const stagione = testoPulito(o.stagione, 20); return stagione && STAGIONI.some((s) => s.chiave === stagione) ? { tipo: 'stagione', stagione } : null; }
    case 'quartiere': { const quartiere = testoPulito(o.quartiere, 60); return quartiere && /^[a-z0-9-]+$/.test(quartiere) ? { tipo: 'quartiere', quartiere } : null; }
    case 'fascia': return o.fascia === 'giorno' || o.fascia === 'sera' ? { tipo: 'fascia', fascia: o.fascia } : null;
    default: return null;
  }
}

/** Elenco normalizzato: scarta le voci non valide e i doppioni, al massimo `max` condizioni. */
export function normalizzaCondizioniSpillo(x: unknown, max = 20): RequisitoSpillo[] {
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

/** Un dato danneggiato non deve sbloccare accidentalmente un elemento. */
export function leggiCondizioniSalvate(json: string | null): RequisitoSpillo[] {
  if (!json) return [];
  try {
    const v:unknown=JSON.parse(json);
    if (Array.isArray(v) && v.length<=20 && v.every(c=>normalizzaRequisitoSpillo(c)!==null)) return normalizzaCondizioniSpillo(v);
  } catch { /* Errore esposto come requisito da configurare. */ }
  return [{tipo:'da-configurare',nota:'Condizioni salvate non valide: ricontrollare la configurazione.'}];
}
