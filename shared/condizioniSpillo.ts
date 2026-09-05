// ============================================================
// Condizioni di visibilità degli spilli delle mappe (Fase 15.22)
// ============================================================
//
// Uno spillo può avere condizioni strutturate, le stesse che l'app sa valutare da sola per articoli e Confidenti: data, periodo,
// Palazzo completato, Dote, rango di un Confidente, richiesta dei Mementos, pioggia, giorni della settimana, stagione, sblocco di un
// quartiere. Niente condizioni «manuali» o testuali: se l'app non può calcolarla, non è una condizione dello spillo (richiesta dell'utente,
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
  | { tipo: 'quartiere'; quartiere: string };

export type TipoCondizioneSpillo = RequisitoSpillo['tipo'];

/** Voci del selettore dell'editor: la pioggia ha due verbi (solo con / mai con), gli altri tipi uno. */
export const SCELTE_CONDIZIONE = [
  { chiave: 'data', nome: 'Da una data in avanti' },
  { chiave: 'intervallo', nome: 'Solo in un periodo' },
  { chiave: 'palazzo', nome: 'Dopo aver completato un Palazzo' },
  { chiave: 'dote', nome: 'Dote sociale almeno a un rango' },
  { chiave: 'confidente', nome: 'Confidente almeno a un rango' },
  { chiave: 'richiesta', nome: 'Richiesta dei Mementos completata' },
  { chiave: 'piove', nome: 'Solo nei giorni di pioggia' },
  { chiave: 'non-piove', nome: 'Mai nei giorni di pioggia' },
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
export function normalizzaRequisitoSpillo(x: unknown): RequisitoSpillo | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  switch (o.tipo) {
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
