// ============================================================
// oggettiSelezionabili — l'archivio unico da cui un negozio sceglie che cosa vende
// ============================================================
//
// **Un negozio non vende una categoria: vende una cosa.** La prima stesura chiedeva di scegliere
// prima la categoria e poi mostrava solo quella, il che vuol dire indovinare «Libro» prima di poter
// cercare «Il magnifico ladro». Era un cancello, e l'utente l'ha detto: nel negozio deve potersi
// scegliere **un oggetto di qualsiasi tipo**, e se quell'oggetto non esiste crearne uno generico
// che appartiene solo a quel negozio.
//
// Qui l'archivio è uno solo. Sorgenti diverse, che chi compila non deve sapere che esistano,
// diventano un elenco unico dove si cerca per nome:
//
//   - i **223 equipaggiamenti** della tabella `oggetto`, coi nomi inglesi del dataset e la resa
//     italiana della tabella `traduzione` (armi, protezioni, accessori);
//   - **consumabili**, **oggetti chiave e materiali** e **abiti** della guida, che vivono come JSON
//     in `dati_guida` e non hanno una tabella propria;
//   - **libri**, **film e DVD** e **videogiochi**, che sono tabelle loro e sono merce da negozio
//     quanto il resto: una libreria vende libri, il videonoleggio DVD.
//
// Ogni voce porta la **categoria** che le compete, così scegliendola l'articolo la prende da lei
// invece di farla indovinare a chi compila; e porta `fonte` + `chiave`, che sono il collegamento.
//
// **`fonte` + `chiave` e non un id solo**: gli oggetti dell'app non stanno in una tabella sola. Gli
// equipaggiamenti hanno un id numerico, le voci della guida si chiamano per nome (e il nome da solo
// non basta, perché sezioni diverse della stessa guida possono ripeterlo: la chiave porta la
// sezione davanti), libri, film e attività hanno la loro chiave. La coppia li copre tutti senza
// inventare una tabella di mezzo da tenere allineata a sua volta.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { elencaOggetti } from './compendioService.js';
import type { OggettiGuidaDto } from '../../shared/types.js';

/** Una voce dell'archivio: quel che serve a **collegarla**, e da dove viene.
 *
 * `fonte` + `chiave` sono la coppia che l'articolo salva. Il resto dei campi serve a far vedere,
 * mentre si sceglie, che cosa si sta agganciando — non a copiarlo nella riga, che è il difetto che
 * questo lavoro toglie di mezzo: l'articolo collegato legge dall'oggetto a ogni lettura, così se
 * domani si corregge l'effetto di un libro il negozio che lo vende lo mostra aggiornato. */
export interface OggettoSelezionabileDto {
  /** Identificatore stabile dentro la sua `fonte`: è metà del collegamento. */
  chiave: string;
  /** L'archivio da cui viene: si mostra a chi sceglie, così sa che cosa sta agganciando. */
  fonte: 'equipaggiamento' | 'guida' | 'libri' | 'film' | 'videogiochi';
  /** La categoria d'articolo che compete a questo oggetto: sceglierlo la imposta da sé. */
  categoria: string;
  /** Nome canonico (per l'equipaggiamento è la chiave inglese del dataset). */
  nome: string;
  /** Nome italiano, quando l'app ce l'ha e differisce. */
  nomeIt: string | null;
  effetto: string | null;
  statistiche: string | null;
  /** Vincolo di equipaggiamento («Solo Joker», «Solo donne»), che nel modulo è «Per chi». */
  per: string | null;
  prezzo: number | null;
}

function datiGuida<T>(chiave: string): T | null {
  const r = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined;
  return r ? (JSON.parse(r.json) as T) : null;
}

const vuoto = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** La categoria d'articolo che compete a un equipaggiamento, dalla sua categoria inglese. */
const CATEGORIA_EQUIPAGGIAMENTO: Record<string, string> = {
  Weapon: 'arma', Gun: 'arma', Protector: 'protezione', Accessory: 'accessorio',
};

/** Le categorie della guida che hanno lo stesso nome fra i consumabili e fra gli articoli. */
const CATEGORIE_CONSUMABILE = new Set(['cura', 'sp', 'battaglia', 'stato', 'esplorazione']);

/** Quel che un libro o un film **dà**, detto in una riga: la Dote con le sue note e quanto ci vuole.
 *
 * È il campo «Statistiche», che fino a ieri era `null` in ogni ramo — un campo del modulo che
 * nessuna sorgente riempiva mai. Per un libro la risposta alla domanda «che cosa mi porta» è
 * questa, ed è la stessa che la pagina dei Libri già mostra. */
function descrizioneLettura(dote: string | null, note: number | null, sessioni: number | null): string | null {
  const pezzi: string[] = [];
  if (dote) pezzi.push(note && note > 0 ? `${dote} ${'♪'.repeat(Math.min(4, note))}` : dote);
  if (sessioni && sessioni > 1) pezzi.push(`${sessioni} sessioni`);
  return pezzi.length ? pezzi.join(' · ') : null;
}

function daEquipaggiamento(): OggettoSelezionabileDto[] {
  return Object.keys(CATEGORIA_EQUIPAGGIAMENTO)
    .flatMap((c) => elencaOggetti({ categoria: c }).map((o) => ({ o, categoria: CATEGORIA_EQUIPAGGIAMENTO[c] })))
    .map(({ o, categoria }) => ({
      chiave: String(o.id), fonte: 'equipaggiamento' as const, categoria,
      nome: o.nome, nomeIt: o.nomeIt,
      effetto: vuoto(o.descrizioneNome) ?? vuoto(o.descrizione),
      statistiche: null,
      per: vuoto(o.vincoloNome) ?? vuoto(o.vincolo),
      prezzo: null,
    }));
}

function daGuida(): OggettoSelezionabileDto[] {
  const guida = datiGuida<OggettiGuidaDto>('oggetti-guida');
  if (!guida) return [];
  const consumabili = (guida.consumabili ?? []).map((v) => ({
    chiave: `consumabili/${v.nome}`, fonte: 'guida' as const,
    categoria: CATEGORIE_CONSUMABILE.has(v.categoria) ? v.categoria : 'consumabile',
    nome: v.nome, nomeIt: v.nomeEn && v.nomeEn !== v.nome ? v.nome : null,
    effetto: vuoto(v.effetto), statistiche: null, per: null, prezzo: v.prezzo ?? null,
  }));
  // Oggetti chiave e materiali: la guida non dà loro un effetto ma un **uso** — «serve a fabbricare
  // grimaldelli» — ed è quello che va nel campo «Effetto», perché è la stessa domanda.
  const chiaveEMateriali = (guida.chiaveEMateriali ?? []).map((v) => ({
    chiave: `chiave-e-materiali/${v.nome}`, fonte: 'guida' as const, categoria: 'oggetto-chiave',
    nome: v.nome, nomeIt: null, effetto: vuoto(v.uso), statistiche: null, per: null, prezzo: null,
  }));
  // Gli abiti hanno solo nome e «per chi»: niente effetto, e va bene così.
  const abiti = (guida.abiti?.elenco ?? []).map((v) => ({
    chiave: `abiti/${v.nome}`, fonte: 'guida' as const, categoria: 'abito',
    nome: v.nome, nomeIt: null, effetto: null, statistiche: null, per: vuoto(v.per), prezzo: null,
  }));
  return [...consumabili, ...chiaveEMateriali, ...abiti];
}

function daLibri(): OggettoSelezionabileDto[] {
  // Di un libro l'app sa **che cosa alza e quanto ci vuole**: la Dote con le sue note e le sessioni
  // di lettura. Prima da qui usciva solo `sblocca`, vuoto per quasi tutti i titoli — ed è il motivo
  // per cui sceglierne uno sembrava non fare niente.
  return (getDb().prepare('SELECT chiave, nome, nome_it, prezzo, sblocca, dote, note, sessioni, dettagli FROM libro ORDER BY ordine').all() as Array<{ chiave: string; nome: string; nome_it: string | null; prezzo: number | null; sblocca: string | null; dote: string | null; note: number | null; sessioni: number | null; dettagli: string | null }>)
    .map((l) => ({
      chiave: l.chiave, fonte: 'libri' as const, categoria: 'libro',
      nome: l.nome, nomeIt: vuoto(l.nome_it),
      effetto: vuoto(l.dettagli) ?? vuoto(l.sblocca),
      statistiche: descrizioneLettura(l.dote, l.note, l.sessioni),
      per: null, prezzo: l.prezzo,
    }));
}

function daFilm(): OggettoSelezionabileDto[] {
  return (getDb().prepare('SELECT chiave, nome, nome_it, dove, prezzo, dettagli, dote, note, sessioni FROM film ORDER BY ordine').all() as Array<{ chiave: string; nome: string; nome_it: string | null; dove: string; prezzo: number | null; dettagli: string | null; dote: string | null; note: number | null; sessioni: number | null }>)
    .map((f) => ({
      chiave: f.chiave, fonte: 'film' as const, categoria: f.dove === 'dvd' ? 'dvd' : 'film',
      nome: f.nome, nomeIt: vuoto(f.nome_it),
      effetto: vuoto(f.dettagli),
      statistiche: descrizioneLettura(f.dote, f.note, f.sessioni),
      per: null, prezzo: f.prezzo,
    }));
}

function daVideogiochi(): OggettoSelezionabileDto[] {
  return (getDb().prepare("SELECT chiave, nome, costo, premi FROM attivita WHERE tipo = 'videogioco' ORDER BY ordine").all() as Array<{ chiave: string; nome: string; costo: number | null; premi: string | null }>)
    .map((v) => ({
      chiave: v.chiave, fonte: 'videogiochi' as const, categoria: 'videogioco',
      nome: v.nome, nomeIt: null, effetto: vuoto(v.premi), statistiche: null, per: null, prezzo: v.costo,
    }));
}

/** **Tutto** quello che l'app conosce, in un elenco solo, ordinato per il nome che si legge.
 *
 * Nessun filtro di categoria: chi mette un articolo in vendita cerca «Il magnifico ladro», non
 * «libro». La categoria arriva con l'oggetto scelto. */
export function tuttiGliOggettiSelezionabili(): OggettoSelezionabileDto[] {
  return [...daEquipaggiamento(), ...daGuida(), ...daLibri(), ...daFilm(), ...daVideogiochi()]
    .sort((a, b) => (a.nomeIt ?? a.nome).localeCompare(b.nomeIt ?? b.nome, 'it'));
}

/** L'oggetto collegato a un articolo, o `null` se il collegamento punta a qualcosa che non c'è più.
 *
 * `null` non è un errore da nascondere: un seed rigenerato può togliere una voce, e in quel caso
 * l'articolo deve tornare a mostrare quel che ha di suo, invece di sparire o di mentire. */
export function risolviOggettoCollegato(fonte: string | null, chiave: string | null): OggettoSelezionabileDto | null {
  if (!fonte || !chiave) return null;
  const dentro = (elenco: OggettoSelezionabileDto[]) => elenco.find((o) => o.chiave === chiave) ?? null;
  switch (fonte) {
    case 'equipaggiamento': return dentro(daEquipaggiamento());
    case 'guida': return dentro(daGuida());
    case 'libri': return dentro(daLibri());
    case 'film': return dentro(daFilm());
    case 'videogiochi': return dentro(daVideogiochi());
    default: return null;
  }
}

/** Quello che l'app conosce **di una categoria**: resta per chi la categoria l'ha già scelta.
 *
 * Torna un elenco vuoto — non un errore — per le categorie che nessun archivio copre (`regalo`,
 * `materiale`, `cibo`, `altro`): lì si scrive a mano, ed è il caso dell'articolo generico del
 * negozio. Un elenco vuoto è una risposta, un 404 sarebbe un ostacolo. */
export function oggettiSelezionabili(categoria: string): OggettoSelezionabileDto[] {
  return tuttiGliOggettiSelezionabili().filter((o) => o.categoria === categoria);
}
