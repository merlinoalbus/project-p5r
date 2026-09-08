// ============================================================
// oggettiSelezionabili — quello che l'app già conosce, offerto a chi mette un articolo in vendita
// ============================================================
//
// Mettere un articolo in un negozio voleva dire **riscriverlo**: nome, effetto, statistiche, a
// mano, anche per una cosa che l'app ha già in archivio. E le due copie poi non si parlano: il
// ponte fra gli oggetti della guida e gli articoli dei negozi (`oggetti-crosswalk`) li abbina **per
// nome**, e su 355 oggetti e 575 articoli ne aggancia 121 — meno di un terzo. Il resto resta
// scollegato non perché manchi il dato, ma perché nessuno ha mai detto che sono la stessa cosa.
//
// Qui si dice. Scelta la categoria, l'app offre quel che sa già di quel tipo, da tre archivi
// diversi che chi compila non deve nemmeno sapere che esistono:
//
//   - i **223 equipaggiamenti** della tabella `oggetto`, coi nomi inglesi del dataset e la resa
//     italiana della tabella `traduzione` (armi, protezioni, accessori);
//   - i **consumabili e i materiali** della guida, che vivono come JSON in `dati_guida` e non hanno
//     una tabella propria (cura, SP, battaglia, stato, oggetti chiave, abiti);
//   - **libri, film e videogiochi**, che sono tabelle loro e sono merce da negozio quanto il resto:
//     una libreria vende libri, il videonoleggio DVD.
//
// Quel che non c'è si scrive a mano, come prima: l'elenco è un aiuto, non un cancello. Un negozio
// può vendere cose di tipi diversi — si sceglie una categoria per volta e si aggiunge un articolo
// per volta, e il negozio finisce per averne di tutti i tipi che gli servono.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { elencaOggetti } from './compendioService.js';
import type { OggettiGuidaDto } from '../../shared/types.js';

/** Una voce dell'elenco: quel poco che serve a riempire il modulo, e da dove viene. */
export interface OggettoSelezionabileDto {
  /** Nome canonico (per l'equipaggiamento è la chiave inglese del dataset). */
  nome: string;
  /** Nome italiano, quando l'app ce l'ha e differisce. */
  nomeIt: string | null;
  effetto: string | null;
  statistiche: string | null;
  /** Vincolo di equipaggiamento («Solo Joker», «Solo donne»), che nel modulo è «Per chi». */
  per: string | null;
  prezzo: number | null;
  /** L'archivio da cui viene: si mostra a chi sceglie, così sa che cosa sta agganciando. */
  fonte: 'equipaggiamento' | 'guida' | 'libri' | 'film' | 'videogiochi';
}

function datiGuida<T>(chiave: string): T | null {
  const r = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined;
  return r ? (JSON.parse(r.json) as T) : null;
}

/** Le categorie inglesi della tabella `oggetto` che stanno sotto una categoria di articolo. */
const EQUIPAGGIAMENTO: Record<string, readonly string[]> = {
  arma: ['Weapon', 'Gun'],
  protezione: ['Protector'],
  accessorio: ['Accessory'],
};

/** Le categorie della guida (`consumabili`) che valgono per una categoria di articolo. */
const CONSUMABILI: Record<string, readonly string[]> = {
  cura: ['cura'],
  sp: ['sp'],
  battaglia: ['battaglia'],
  stato: ['stato'],
  esplorazione: ['esplorazione'],
  consumabile: ['cura', 'sp', 'battaglia', 'stato', 'esplorazione', 'altro'],
};

const vuoto = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** Quello che l'app già conosce di una categoria, pronto da agganciare a un negozio.
 *
 * Torna un elenco vuoto — non un errore — per le categorie che nessun archivio copre (`regalo`,
 * `materiale`, `cibo`, `altro`): lì si scrive a mano, ed è il caso che il modulo chiama «non è
 * censito». Un elenco vuoto è una risposta, un 404 sarebbe un ostacolo. */
export function oggettiSelezionabili(categoria: string): OggettoSelezionabileDto[] {
  const equip = EQUIPAGGIAMENTO[categoria];
  if (equip) {
    return equip
      .flatMap((c) => elencaOggetti({ categoria: c }))
      .map((o) => ({
        nome: o.nome, nomeIt: o.nomeIt, effetto: vuoto(o.descrizioneNome) ?? vuoto(o.descrizione),
        statistiche: null, per: vuoto(o.vincoloNome) ?? vuoto(o.vincolo), prezzo: null, fonte: 'equipaggiamento' as const,
      }))
      .sort((a, b) => (a.nomeIt ?? a.nome).localeCompare(b.nomeIt ?? b.nome, 'it'));
  }

  const guida = datiGuida<OggettiGuidaDto>('oggetti-guida');
  const consumabili = CONSUMABILI[categoria];
  if (consumabili && guida) {
    return (guida.consumabili ?? [])
      .filter((v) => consumabili.includes(v.categoria))
      .map((v) => ({
        nome: v.nome, nomeIt: v.nomeEn && v.nomeEn !== v.nome ? v.nome : null,
        effetto: vuoto(v.effetto), statistiche: null, per: null, prezzo: v.prezzo ?? null, fonte: 'guida' as const,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }
  // Oggetti chiave e materiali: la guida non dà loro un effetto ma un **uso** — «serve a fabbricare
  // grimaldelli» — ed è quello che va nel campo «Effetto», perché è la stessa domanda.
  if (categoria === 'oggetto-chiave' && guida) {
    return (guida.chiaveEMateriali ?? []).map((v) => ({
      nome: v.nome, nomeIt: null, effetto: vuoto(v.uso), statistiche: null, per: null,
      prezzo: null, fonte: 'guida' as const,
    })).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }
  // Gli abiti hanno solo nome, «per chi» e dove si trovano: niente effetto, e va bene così.
  if (categoria === 'abito' && guida) {
    return (guida.abiti?.elenco ?? []).map((v) => ({
      nome: v.nome, nomeIt: null, effetto: null, statistiche: null,
      per: vuoto(v.per), prezzo: null, fonte: 'guida' as const,
    })).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }

  // Libri, film e videogiochi: tabelle loro, e merce da negozio quanto il resto. Il «prezzo» che
  // portano è quello che la guida dichiara, e resta modificabile: lo stesso libro costa diverso in
  // due librerie diverse.
  if (categoria === 'libro') {
    return (getDb().prepare('SELECT nome, nome_it, dove, prezzo, sblocca FROM libro ORDER BY ordine').all() as Array<{ nome: string; nome_it: string | null; dove: string; prezzo: number | null; sblocca: string | null }>)
      .map((l) => ({ nome: l.nome, nomeIt: vuoto(l.nome_it), effetto: vuoto(l.sblocca), statistiche: null, per: null, prezzo: l.prezzo, fonte: 'libri' as const }));
  }
  if (categoria === 'film' || categoria === 'dvd') {
    const dove = categoria === 'dvd' ? 'dvd' : 'cinema';
    return (getDb().prepare('SELECT nome, nome_it, prezzo, dettagli FROM film WHERE dove = ? ORDER BY ordine').all(dove) as Array<{ nome: string; nome_it: string | null; prezzo: number | null; dettagli: string | null }>)
      .map((f) => ({ nome: f.nome, nomeIt: vuoto(f.nome_it), effetto: vuoto(f.dettagli), statistiche: null, per: null, prezzo: f.prezzo, fonte: 'film' as const }));
  }
  if (categoria === 'videogioco') {
    return (getDb().prepare("SELECT nome, costo, premi FROM attivita WHERE tipo = 'videogioco' ORDER BY ordine").all() as Array<{ nome: string; costo: number | null; premi: string | null }>)
      .map((v) => ({ nome: v.nome, nomeIt: null, effetto: vuoto(v.premi), statistiche: null, per: null, prezzo: v.costo, fonte: 'videogiochi' as const }));
  }
  return [];
}
