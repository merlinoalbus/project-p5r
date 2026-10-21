// L7: identità degli oggetti. Le categorie del listino restano compatibili con i dati storici.
import { slug } from './slug.js';
import { eCategoriaArticolo, type CategoriaArticolo } from './articoli.js';

/** Il costo appartiene all'offerta; i nomi degli oggetti ceduti non si salvano nel JSON. */
export type CostoScambioOggetto = { tipo: 'fiori'; importo: number }
  | { tipo: 'oggetti'; oggetti: Array<{ chiave: string; quantita: number }> };
export const LIMITI_COSTO_OGGETTO = { fiori: 9_999_999, quantita: 999_999, componenti: 40 } as const;

/** Null significa «non leggibile», non prezzo zero. Non aggrega o corregge componenti ambigui. */
export function normalizzaCostoScambio(valore: unknown): CostoScambioOggetto | null {
  let v: unknown = valore;
  if (typeof v === 'string') { try { v = JSON.parse(v) as unknown; } catch { return null; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (r.tipo === 'fiori') return typeof r.importo === 'number' && Number.isSafeInteger(r.importo) && r.importo >= 0 && r.importo <= LIMITI_COSTO_OGGETTO.fiori ? { tipo: 'fiori', importo: r.importo } : null;
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
