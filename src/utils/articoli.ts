// ============================================================
// articoli — i filtri degli articoli, come valori, e la funzione pura che li applica
// ============================================================
//
// Gli stessi filtri servono alla scheda del negozio (sul suo elenco) e alla ricerca in tutti i
// negozi (dove li applica il server): un oggetto solo, con le stesse chiavi dell'API
// (`categorie`, `per`, `stato`, `disponibilita`), così l'indirizzo, il pannello e la richiesta
// dicono la stessa cosa. `filtraArticoli` è pura: si prova senza interfaccia.
// ============================================================

import type { ArticoloDto } from '../types';

export type StatoAcquisto = 'tutti' | 'acquistati' | 'da-acquistare';
export type FiltroDisponibilita = 'tutti' | 'disponibili' | 'bloccati';

export interface FiltroArticoli {
  /** Testo cercato in nome, nome italiano, effetto e negozio (senza accenti, senza maiuscole). */
  q: string;
  /** Le categorie scelte insieme; vuoto = tutte. */
  categorie: string[];
  /** Il destinatario («Ann»); vuoto = per chiunque. `tutti` sull'articolo vale per ogni destinatario. */
  per: string;
  stato: StatoAcquisto;
  disponibilita: FiltroDisponibilita;
}

export const FILTRO_VUOTO: FiltroArticoli = { q: '', categorie: [], per: '', stato: 'tutti', disponibilita: 'tutti' };

export const STATI_ACQUISTO: ReadonlyArray<{ chiave: StatoAcquisto; nome: string }> = [
  { chiave: 'tutti', nome: 'Tutti' }, { chiave: 'acquistati', nome: 'Acquistati' }, { chiave: 'da-acquistare', nome: 'Da acquistare' },
];
export const FILTRI_DISPONIBILITA: ReadonlyArray<{ chiave: FiltroDisponibilita; nome: string }> = [
  { chiave: 'tutti', nome: 'Tutti' }, { chiave: 'disponibili', nome: 'Disponibili' }, { chiave: 'bloccati', nome: 'Bloccati' },
];

/** Vero se il filtro chiede qualcosa oltre «tutto». */
export function filtroAttivo(f: FiltroArticoli): boolean {
  return f.q.trim().length > 0 || f.categorie.length > 0 || f.per !== '' || f.stato !== 'tutti' || f.disponibilita !== 'tutti';
}

function piatto(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
}

/** Gli articoli che passano il filtro, nell'ordine in cui arrivano. Stato e disponibilità valgono solo con una partita
 *  (senza, l'articolo non porta `disponibilita` e `acquistato` è sempre falso): lì si ignorano. */
export function filtraArticoli(articoli: ArticoloDto[], f: FiltroArticoli, conPartita: boolean): ArticoloDto[] {
  const q = piatto(f.q.trim());
  const categorie = new Set(f.categorie);
  return articoli.filter((a) => {
    if (q && !`${piatto(a.nome)} ${piatto(a.nomeIt)} ${piatto(a.effetto)} ${piatto(a.negozioNome)}`.includes(q)) return false;
    if (categorie.size && !categorie.has(a.categoria)) return false;
    if (f.per && a.per !== f.per && a.per !== 'tutti') return false;
    if (conPartita && f.stato !== 'tutti' && (f.stato === 'acquistati') !== a.acquistato) return false;
    if (conPartita && f.disponibilita !== 'tutti') {
      const bloccato = a.disponibilita?.stato === 'bloccato';
      if ((f.disponibilita === 'bloccati') !== bloccato) return false;
    }
    return true;
  });
}

/** Le categorie presenti in un elenco, con quanti articoli ciascuna, nell'ordine di prima comparsa. */
export function categoriePresenti(articoli: ArticoloDto[]): Array<{ chiave: string; n: number }> {
  const conteggi = new Map<string, number>();
  for (const a of articoli) conteggi.set(a.categoria, (conteggi.get(a.categoria) ?? 0) + 1);
  return [...conteggi.entries()].map(([chiave, n]) => ({ chiave, n }));
}

/** I destinatari nominati in un elenco («Ann», «Joker»…), senza «tutti». */
export function destinatariPresenti(articoli: ArticoloDto[]): string[] {
  return [...new Set(articoli.map((a) => a.per).filter((p): p is string => !!p && p !== 'tutti'))];
}

/** Il filtro letto dall'indirizzo (`?q=&categorie=arma,libro&per=Ann&stato=&disponibilita=`). */
export function filtroDaParametri(p: URLSearchParams): FiltroArticoli {
  const stato = p.get('stato'); const disponibilita = p.get('disponibilita');
  const categorie = [...new Set([...(p.get('categorie') ?? '').split(',').map((c) => c.trim()).filter(Boolean), ...(p.get('categoria') ? [p.get('categoria')!] : [])])];
  return {
    q: p.get('q') ?? '', categorie, per: p.get('per') ?? '',
    stato: stato === 'acquistati' || stato === 'da-acquistare' ? stato : 'tutti',
    disponibilita: disponibilita === 'disponibili' || disponibilita === 'bloccati' ? disponibilita : 'tutti',
  };
}

/** Il filtro scritto nell'indirizzo: solo ciò che non è «tutto», così un indirizzo pulito resta pulito. */
export function parametriDaFiltro(f: FiltroArticoli, base: URLSearchParams = new URLSearchParams()): URLSearchParams {
  const p = new URLSearchParams(base);
  for (const k of ['q', 'categoria', 'categorie', 'per', 'stato', 'disponibilita']) p.delete(k);
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.categorie.length) p.set('categorie', f.categorie.join(','));
  if (f.per) p.set('per', f.per);
  if (f.stato !== 'tutti') p.set('stato', f.stato);
  if (f.disponibilita !== 'tutti') p.set('disponibilita', f.disponibilita);
  return p;
}
