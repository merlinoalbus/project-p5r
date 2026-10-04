// ============================================================
// rotte — l'elenco delle rotte dell'app Express, letto dalla pila dei router
// ============================================================
//
// La documentazione non tiene un elenco suo: legge le rotte montate davvero. Le rotte dell'app stanno
// nella pila di `app.router` (Express 5), quelle di area nei router di `ROUTER_DI_AREA`, con il prefisso
// con cui sono montati. Di ogni rotta interessano metodo, percorso e gestori: fra i gestori ci sono i
// middleware di `validate` (con gli schemi zod) e gli eventuali `express.raw` (corpo binario).
//
// Una rotta dell'app con lo stesso metodo e percorso di una rotta di area non è una rotta a sé: è il
// parser del corpo montato prima (`POST /api/mappe/importa` con il suo limite di 64 MB), e si scarta.
// ============================================================

import type { Express, Router } from 'express';
import { ROUTER_DI_AREA } from '../routes/index.js';

/** Una rotta montata: metodo in minuscolo, percorso completo con la sintassi di Express, gestori nell'ordine. */
export interface RottaMontata {
  metodo: 'get' | 'post' | 'put' | 'patch' | 'delete';
  percorso: string;
  gestori: ReadonlyArray<(...args: never[]) => unknown>;
  /** Il prefisso del router di area (`/api/compendio`), o null per le rotte dell'app. */
  area: string | null;
}

/** La parte di un layer di Express che serve qui (Express non esporta il tipo della pila). */
interface LayerRotta {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (...args: never[]) => unknown; method?: string }> };
}

const METODI = ['get', 'post', 'put', 'patch', 'delete'] as const;

/** Le rotte di una pila di layer, con il prefisso dato davanti al percorso. */
function rotteDellaPila(pila: LayerRotta[], prefisso: string, area: string | null): RottaMontata[] {
  const out: RottaMontata[] = [];
  for (const layer of pila) {
    if (!layer.route) continue;
    for (const metodo of METODI) {
      if (!layer.route.methods[metodo]) continue;
      // i gestori di una rotta con più metodi si distinguono per `method`; senza, valgono per tutti
      const gestori = layer.route.stack.filter((s) => !s.method || s.method === metodo).map((s) => s.handle);
      out.push({ metodo, percorso: prefisso + (layer.route.path === '/' && prefisso ? '' : layer.route.path), gestori, area });
    }
  }
  return out;
}

/** Tutte le rotte dell'app: prima quelle di area, nell'ordine di montaggio, poi quelle dell'app senza i doppioni dei parser. */
export function elencaRotte(app: Express): RottaMontata[] {
  const diArea = ROUTER_DI_AREA.flatMap(([prefisso, router]) => rotteDellaPila((router as Router & { stack: LayerRotta[] }).stack, prefisso, prefisso));
  const chiavi = new Set(diArea.map((r) => `${r.metodo} ${r.percorso}`));
  const pilaApp = (app as unknown as { router: { stack: LayerRotta[] } }).router.stack;
  const dellApp = rotteDellaPila(pilaApp, '', null).filter((r) => !chiavi.has(`${r.metodo} ${r.percorso}`));
  return [...diArea, ...dellApp];
}

/** La chiave di una rotta nel registro delle descrizioni: «GET /api/compendio/arcani». */
export const chiaveRotta = (r: { metodo: string; percorso: string }): string => `${r.metodo.toUpperCase()} ${r.percorso}`;
