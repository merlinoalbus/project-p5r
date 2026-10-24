// ============================================================
// esamiCollegamento — quali righe di `domanda` appartengono a quale esame (L11 · R11-15/7, dopo R9-18)
// ============================================================
//
// Le domande e i giorni d'esame stanno solo nelle righe di `domanda` di tipo `esame-medio` / `esame-finale` (migrazione 191). L'esame si collega
// alle sue righe per tipo (dal nome: «metà» → esame-medio, altrimenti esame-finale) e per data: le righe di quel tipo dopo i risultati
// dell'esame precedente dello stesso tipo e fino ai suoi. Una regola sola, usata dalla lettura (`domandeService.esami`) e dai controlli di
// Modifica: correggere il nome o la data dei risultati di un esame, o la data e il tipo di una domanda d'esame, non deve spostare nessuna
// riga da un esame all'altro né lasciarne una senza esame.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';

export type TipoRigaEsame = 'esame-medio' | 'esame-finale';
export interface EsameCollegabile { chiave: string; nome: string; data_risultati: string | null }
export interface RigaCollegabile { data: string; tipo: string }

/** Indice di una data di gioco 'MM-GG' nell'anno scolastico, -1 se non si legge (lo stesso criterio di `indiceGiornoScolastico`). */
export function indiceGiorno(data: string): number {
  const [m, g] = data.split('-').map(Number);
  if (!Number.isInteger(m) || !Number.isInteger(g)) return -1;
  return ordineGioco(data);
}

export const tipoDelNome = (nome: string): TipoRigaEsame => (/metà/i.test(nome) ? 'esame-medio' : 'esame-finale');

/** Le righe di ogni esame (per chiave); gli esami si passano in ordine di `ordine`. */
export function righePerEsame<R extends RigaCollegabile>(esami: readonly EsameCollegabile[], righe: readonly R[]): Map<string, R[]> {
  const risultatiPrecedenti = new Map<string, number>();
  const uscita = new Map<string, R[]>();
  for (const e of esami) {
    const tipo = tipoDelNome(e.nome);
    const fino = e.data_risultati ? indiceGiorno(e.data_risultati) : Number.POSITIVE_INFINITY;
    const da = risultatiPrecedenti.get(tipo) ?? -1;
    risultatiPrecedenti.set(tipo, fino);
    uscita.set(e.chiave, righe.filter((r) => r.tipo === tipo && indiceGiorno(r.data) > da && indiceGiorno(r.data) <= fino));
  }
  return uscita;
}

interface RigaDb { id: number; data: string; tipo: string }
const esamiDb = (): EsameCollegabile[] => prepared('SELECT chiave, nome, data_risultati FROM esame ORDER BY ordine').all() as EsameCollegabile[];
const righeDb = (): RigaDb[] => prepared("SELECT id, data, tipo FROM domanda WHERE tipo IN ('esame-medio', 'esame-finale')").all() as RigaDb[];
const eEsame = (tipo: string): boolean => tipo === 'esame-medio' || tipo === 'esame-finale';

const firmaAssegnazione = (m: Map<string, Array<{ id: number }>>): string => JSON.stringify([...m.entries()].map(([k, r]) => [k, r.map((x) => x.id).sort((a, b) => a - b)]));

/**
 * Prima di cambiare il nome o la data dei risultati di un esame: l'assegnazione delle righe agli esami deve restare la stessa (409 altrimenti)
 * e i risultati devono uscire in ordine di calendario, esame dopo esame.
 */
export function verificaCorrezioneEsame(chiave: string, nuovi: { nome?: string; data_risultati?: string | null }): void {
  const prima = esamiDb();
  const attuale = prima.find((e) => e.chiave === chiave)!;
  const dopo = prima.map((e) => (e.chiave === chiave ? { ...e, ...(nuovi.nome !== undefined ? { nome: nuovi.nome } : {}), ...(nuovi.data_risultati !== undefined ? { data_risultati: nuovi.data_risultati } : {}) } : e));
  const nuovo = dopo.find((e) => e.chiave === chiave)!;
  if (nuovo.data_risultati !== attuale.data_risultati) {
    if (nuovo.data_risultati === null) throw httpErrors.badRequest('valore-non-valido', 'La data dei risultati non può essere vuota.', { campo: 'data_risultati' });
    if (!/^\d{2}-\d{2}$/.test(nuovo.data_risultati) || !prepared('SELECT 1 FROM giorno WHERE data = ?').get(nuovo.data_risultati)) {
      throw httpErrors.badRequest('valore-non-valido', 'La data dei risultati deve essere un giorno del calendario di gioco.', { campo: 'data_risultati' });
    }
  }
  if (tipoDelNome(nuovo.nome) !== tipoDelNome(attuale.nome)) {
    throw httpErrors.conflict('esame-tipo-cambiato', 'Il nome di un esame deve dire se è «di metà» o «di fine» semestre come prima: dal nome dipende a quale esame appartengono le sue domande.');
  }
  const righe = righeDb();
  if (firmaAssegnazione(righePerEsame(prima, righe)) !== firmaAssegnazione(righePerEsame(dopo, righe))) {
    throw httpErrors.conflict('esame-domande-spostate', 'Con questa data dei risultati alcune domande passerebbero a un altro esame o resterebbero senza esame: i risultati devono cadere dopo l’ultimo giorno d’esame e prima del primo giorno dell’esame successivo dello stesso tipo.');
  }
  const risultati = dopo.map((e) => (e.data_risultati ? indiceGiorno(e.data_risultati) : Number.POSITIVE_INFINITY));
  for (let i = 1; i < risultati.length; i++) {
    if (risultati[i]! < Number.POSITIVE_INFINITY && risultati[i]! <= risultati[i - 1]!) throw httpErrors.conflict('esami-fuori-ordine', 'I risultati degli esami devono uscire in ordine di calendario: ogni esame dopo il precedente.');
  }
}

/** I giorni in cui possono uscire i risultati di un esame senza spostare domande: dall'ultimo suo giorno d'esame al giorno prima del primo dell'esame successivo dello stesso tipo. */
export function giorniPossibiliPerRisultati(chiave: string): string[] {
  const esami = esamiDb();
  const mappa = righePerEsame(esami, righeDb());
  const mie = mappa.get(chiave) ?? [];
  if (mie.length === 0) return [];
  const posizione = esami.findIndex((x) => x.chiave === chiave);
  const tipo = tipoDelNome(esami[posizione]!.nome);
  const da = Math.max(...mie.map((r) => indiceGiorno(r.data)));
  const successivo = esami.slice(posizione + 1).find((x) => tipoDelNome(x.nome) === tipo);
  const primoSuccessivo = successivo ? Math.min(Number.POSITIVE_INFINITY, ...(mappa.get(successivo.chiave) ?? []).map((r) => indiceGiorno(r.data))) : Number.POSITIVE_INFINITY;
  // i risultati escono in ordine di calendario, esame dopo esame: dopo quelli dell'esame prima e prima di quelli dell'esame dopo
  const precedente = posizione > 0 ? esami[posizione - 1]!.data_risultati : null;
  const seguente = esami[posizione + 1]?.data_risultati ?? null;
  const dopoIl = precedente ? indiceGiorno(precedente) : -1;
  const primaDi = seguente ? indiceGiorno(seguente) : Number.POSITIVE_INFINITY;
  return (prepared('SELECT data FROM giorno ORDER BY ordine').pluck().all() as string[])
    .filter((d) => indiceGiorno(d) >= da && indiceGiorno(d) < primoSuccessivo && indiceGiorno(d) > dopoIl && indiceGiorno(d) < primaDi);
}

/**
 * Una domanda d'esame (tipo esame-medio / esame-finale) che si crea, si corregge o si ripristina deve cadere nella finestra di un esame, e la
 * correzione non deve lasciare un esame senza domande. `prima` è la riga di adesso (null per una nuova), `dopo` i valori che avrà.
 */
export function verificaDomandaEsame(prima: { id: number; data: string; tipo: string } | null, dopo: { data: string; tipo: string }): void {
  if (!eEsame(dopo.tipo) && !(prima && eEsame(prima.tipo))) return;
  if (prima && prima.data === dopo.data && prima.tipo === dopo.tipo) return;
  const esami = esamiDb();
  const righe = righeDb();
  const mappaPrima = righePerEsame(esami, righe);
  const altre = prima ? righe.filter((r) => r.id !== prima.id) : righe;
  const idNuova = prima?.id ?? -1;
  const mappaDopo = righePerEsame(esami, eEsame(dopo.tipo) ? [...altre, { id: idNuova, data: dopo.data, tipo: dopo.tipo }] : altre);
  const esameDi = (m: Map<string, Array<{ id: number }>>): string | null => [...m.entries()].find(([, l]) => l.some((r) => r.id === idNuova))?.[0] ?? null;
  if (eEsame(dopo.tipo)) {
    const doveFinisce = esameDi(mappaDopo);
    if (doveFinisce === null) {
      throw httpErrors.badRequest('domanda-fuori-dagli-esami', `Una domanda d’esame deve cadere nel periodo di uno degli esami: il ${dopo.data} non appartiene a nessuno dei quattro (dopo i risultati dell’esame precedente dello stesso tipo e fino ai suoi).`, { campo: 'data' });
    }
    // una domanda che era di un esame resta di quell'esame: spostarla in un altro è un altro dato, non una correzione
    if (prima && eEsame(prima.tipo) && esameDi(mappaPrima) !== doveFinisce) {
      throw httpErrors.badRequest('domanda-fuori-dagli-esami', `Con il ${dopo.data} la domanda passerebbe a un altro esame: una correzione la lascia nel suo esame (cambia la data dentro il suo periodo).`, { campo: 'data' });
    }
  }
  for (const e of esami) {
    if ((mappaPrima.get(e.chiave) ?? []).length > 0 && (mappaDopo.get(e.chiave) ?? []).length === 0) {
      throw httpErrors.conflict('esame-senza-domande', `Con questa correzione l’esame «${e.nome}» resterebbe senza domande: sposta prima le altre o scegli un giorno dello stesso esame.`);
    }
  }
}
