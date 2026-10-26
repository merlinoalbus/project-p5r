// L7: identità degli oggetti. Le categorie del listino restano compatibili con i dati storici.
import { slug } from './slug.js';
import { eCategoriaArticolo, type CategoriaArticolo } from './articoli.js';

/** Il costo appartiene all'offerta; i nomi degli oggetti ceduti non si salvano nel JSON.
 *  Ondata 5 (lotto E, decisione 21): oltre ai fiori di Jose e agli oggetti da cedere, le monete del Casinò (negozio del Palazzo di Niijima)
 *  e i punti negozio di Vestiti usati, che prima vivevano solo in prosa nella nota dell'offerta. */
export type CostoScambioOggetto = { tipo: TipoCostoAImporto; importo: number }
  | { tipo: 'oggetti'; oggetti: Array<{ chiave: string; quantita: number }> };
/** I costi che sono una quantità di una valuta che non è lo yen. */
export const TIPI_COSTO_A_IMPORTO = ['fiori', 'monete', 'punti'] as const;
export type TipoCostoAImporto = (typeof TIPI_COSTO_A_IMPORTO)[number];
/** Il nome della valuta, come si legge accanto all'importo («350 monete», «30 punti»). */
export const VALUTA_COSTO: Readonly<Record<TipoCostoAImporto, { nome: string; scelta: string }>> = {
  fiori: { nome: 'fiori', scelta: 'Fiori' },
  monete: { nome: 'monete', scelta: 'Monete del Casinò' },
  punti: { nome: 'punti', scelta: 'Punti negozio' },
};
export const LIMITI_COSTO_OGGETTO = { fiori: 9_999_999, importo: 9_999_999, quantita: 999_999, componenti: 40 } as const;

export function eCostoAImporto(tipo: unknown): tipo is TipoCostoAImporto {
  return typeof tipo === 'string' && (TIPI_COSTO_A_IMPORTO as readonly string[]).includes(tipo);
}
/** «350 monete», «1.200 monete», «30 punti», «70 fiori». */
export function testoCostoAImporto(costo: { tipo: TipoCostoAImporto; importo: number }): string {
  return `${costo.importo.toLocaleString('it-IT')} ${VALUTA_COSTO[costo.tipo].nome}`;
}

/** Null significa «non leggibile», non prezzo zero. Non aggrega o corregge componenti ambigui. */
export function normalizzaCostoScambio(valore: unknown): CostoScambioOggetto | null {
  let v: unknown = valore;
  if (typeof v === 'string') { try { v = JSON.parse(v) as unknown; } catch { return null; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (eCostoAImporto(r.tipo)) return typeof r.importo === 'number' && Number.isSafeInteger(r.importo) && r.importo >= 0 && r.importo <= LIMITI_COSTO_OGGETTO.importo ? { tipo: r.tipo, importo: r.importo } : null;
  if (r.tipo !== 'oggetti' || !Array.isArray(r.oggetti) || !r.oggetti.length || r.oggetti.length > LIMITI_COSTO_OGGETTO.componenti) return null;
  const oggetti: Array<{ chiave: string; quantita: number }> = [];
  const chiavi = new Set<string>();
  for (const elemento of r.oggetti as unknown[]) {
    if (!elemento || typeof elemento !== 'object' || Array.isArray(elemento)) return null;
    const o = elemento as Record<string, unknown>;
    if (typeof o.chiave !== 'string' || !o.chiave.trim() || o.chiave.length > 600 || chiavi.has(o.chiave)
      || typeof o.quantita !== 'number' || !Number.isSafeInteger(o.quantita) || o.quantita < 1 || o.quantita > LIMITI_COSTO_OGGETTO.quantita) return null;
    chiavi.add(o.chiave); oggetti.push({ chiave: o.chiave, quantita: o.quantita });
  }
  return { tipo: 'oggetti', oggetti };
}

/** Le due fasce della giornata in cui un'offerta può avere un prezzo proprio (le voci del Diario hanno solo queste). */
export type FasciaPrezzo = 'giorno' | 'sera';
/**
 * Ondata 5 (lotto E, decisione 5): il prezzo di un'offerta in una fascia, quando è diverso da `articolo.prezzo` (le sfide della Big Bang
 * Burger costano 500 ¥ di sera). È un dato dell'offerta, in un punto solo (`articolo.prezzo_per_fascia_json`); la fascia che non compare
 * vale `prezzo`. Un oggetto vuoto non è un prezzo: si normalizza a null.
 */
export type PrezzoPerFascia = Partial<Record<FasciaPrezzo, number>>;

/** Null = nessun prezzo per fascia (o un valore non leggibile: allora vale `prezzo`, mai «gratis»). */
export function normalizzaPrezzoPerFascia(valore: unknown): PrezzoPerFascia | null {
  let v: unknown = valore;
  if (typeof v === 'string') { try { v = JSON.parse(v) as unknown; } catch { return null; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (Object.keys(r).some((k) => k !== 'giorno' && k !== 'sera')) return null;
  const out: PrezzoPerFascia = {};
  for (const f of ['giorno', 'sera'] as const) {
    const p = r[f];
    if (p === undefined) continue;
    if (typeof p !== 'number' || !Number.isSafeInteger(p) || p < 0 || p > LIMITI_COSTO_OGGETTO.importo) return null;
    out[f] = p;
  }
  return Object.keys(out).length ? out : null;
}

/** Il prezzo in yen dell'offerta nella fascia: quello della fascia se c'è, altrimenti `prezzo`. Senza fascia nota vale `prezzo`. */
export function prezzoNellaFascia(prezzo: number | null, perFascia: unknown, fascia: string | null | undefined): number | null {
  if (fascia !== 'giorno' && fascia !== 'sera') return prezzo;
  return normalizzaPrezzoPerFascia(perFascia)?.[fascia] ?? prezzo;
}

export const CATEGORIE_OGGETTO = [
  'arma', 'arma-da-fuoco', 'protezione', 'accessorio', 'consumabile', 'materiale', 'chiave',
  'regalo', 'cibo', 'libro', 'film', 'videogioco', 'carta-abilita', 'altro',
] as const;
export type CategoriaOggetto = (typeof CATEGORIE_OGGETTO)[number];
export type GruppoOggetto = 'equipaggiamento' | 'consumabili' | 'materiali' | 'regali' | 'cibo' | 'libri' | 'film' | 'videogiochi' | 'carte-abilita' | 'altro';

export const GRUPPI_OGGETTO: Readonly<Record<GruppoOggetto, string>> = {
  equipaggiamento: 'Equipaggiamento', consumabili: 'Consumabili', materiali: 'Chiave e materiali',
  regali: 'Regali', cibo: 'Cibo', libri: 'Libri', film: 'Film', videogiochi: 'Videogiochi',
  'carte-abilita': 'Carte abilità', altro: 'Altro',
};
export const CATEGORIA_OGGETTO: Readonly<Record<CategoriaOggetto, { nome: string; gruppo: GruppoOggetto }>> = {
  arma: { nome: 'Arma', gruppo: 'equipaggiamento' },
  'arma-da-fuoco': { nome: 'Arma da fuoco', gruppo: 'equipaggiamento' },
  protezione: { nome: 'Protezione', gruppo: 'equipaggiamento' },
  accessorio: { nome: 'Accessorio', gruppo: 'equipaggiamento' },
  consumabile: { nome: 'Consumabile', gruppo: 'consumabili' },
  materiale: { nome: 'Materiale', gruppo: 'materiali' }, chiave: { nome: 'Oggetto chiave', gruppo: 'materiali' },
  regalo: { nome: 'Regalo', gruppo: 'regali' }, cibo: { nome: 'Cibo', gruppo: 'cibo' },
  libro: { nome: 'Libro', gruppo: 'libri' }, film: { nome: 'Film', gruppo: 'film' },
  videogioco: { nome: 'Videogioco', gruppo: 'videogiochi' },
  'carta-abilita': { nome: 'Carta abilità', gruppo: 'carte-abilita' }, altro: { nome: 'Altro', gruppo: 'altro' },
};

export function eCategoriaOggetto(x: unknown): x is CategoriaOggetto {
  return typeof x === 'string' && (CATEGORIE_OGGETTO as readonly string[]).includes(x);
}

/** Resa nei listini storici: non introduce categorie aggiuntive né confonde arma da fuoco e arma nella sua identità. */
export function categoriaDelListino(categoria: CategoriaOggetto, sottocategoria: string | null): CategoriaArticolo {
  if (categoria === 'arma-da-fuoco') return 'arma';
  if (categoria === 'chiave') return 'oggetto-chiave';
  if (categoria === 'altro' && sottocategoria === 'abito') return 'abito';
  if (categoria === 'film' && sottocategoria === 'dvd') return 'dvd';
  if (categoria === 'consumabile' && sottocategoria && ['cura', 'sp', 'battaglia', 'stato', 'esplorazione'].includes(sottocategoria)) return sottocategoria as CategoriaArticolo;
  return eCategoriaArticolo(categoria) ? categoria : 'altro';
}

/** Serve alla creazione, non alla rinomina: una chiave già assegnata non cambia con il nome. */
export function chiaveCatalogo(categoria: CategoriaOggetto, nome: string): string {
  const segmento = slug(nome);
  if (!segmento) throw new Error('Il nome dell’oggetto deve contenere almeno una lettera o un numero.');
  return `${categoria}/${segmento}`;
}

export function casaOggetto(chiave: string): string {
  return `/guida/oggetto/${chiave.split('/').map(encodeURIComponent).join('/')}`;
}

/** Unifica soltanto grafia e spazi: non espande abbreviazioni e non traduce per somiglianza. */
export function normalizzaNomeOggetto(nome: string): string {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT')
    .replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
}

/** La forma estesa deve essere attestata dalla fonte: non si inventano espansioni dei nomi del menu. */
export function nomiCatalogo(nome: string, altri: readonly string[] = [], esteso?: string | null): { nome: string; nomiAltri: string[] } {
  const mostrato = esteso?.trim() || nome.trim();
  return { nome: mostrato, nomiAltri: [...new Set([nome, ...altri].map((n) => n.trim()).filter((n) => n && n !== mostrato))] };
}

/** La categoria storica della merce non viene riscritta dalla migrazione. */
export function categoriaOggettoDaArticolo(categoria: string): CategoriaOggetto {
  if (eCategoriaOggetto(categoria)) return categoria;
  if (['cura', 'sp', 'battaglia', 'stato', 'esplorazione'].includes(categoria)) return 'consumabile';
  if (categoria === 'oggetto-chiave') return 'chiave';
  if (categoria === 'dvd') return 'film';
  return 'altro';
}
