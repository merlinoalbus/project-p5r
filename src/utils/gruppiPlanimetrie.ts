// ============================================================
// gruppiPlanimetrie — le planimetrie di un Palazzo raggruppate per stanza
// ============================================================
//
// L'estrazione ha prodotto **più tavole della stessa stanza**: «Cancello del castello» esiste come
// planimetria completa e come porzione occidentale, il Tetto in cinque inquadrature. Sono immagini
// diverse con spilli propri — restano separate, non si fondono — ma elencarle piatte fa sembrare
// un Palazzo di dieci stanze un elenco di trentaquattro voci quasi uguali.
//
// Il gruppo esiste già nel dato (`gruppoImmagini`, l'istantanea dell'estrazione): qui si usa per
// quello che serve a chi gioca, cioè **un Palazzo fatto di stanze**, ognuna con le sue versioni.
// Una planimetria senza gruppo è una stanza di una versione sola: non è un caso a parte.
//
// I nomi non si compongono qui: vengono da `presentazioneMappa` ed `etichettaVersione`, che sono
// l'unico posto che decide come si chiama una mappa (decisione del 2026-09-13).
// ============================================================

import { etichettaVersione } from './etichettaVersione';
import { titoloGruppoImmagini } from './presentazioneMappa';
import type { DungeonDettaglioDto, MappaRiassuntoDto } from '../types';

export type Planimetria = DungeonDettaglioDto['planimetrie'][number];

/** Una planimetria con quel che serve a presentarla: il dato dell'atlante, se lo si è trovato. */
export interface VersionePlanimetria {
  planimetria: Planimetria;
  mappa: MappaRiassuntoDto | null;
  /** «porzione occidentale», «planimetria completa»: che cosa mostra questa versione. */
  etichetta: string;
}

export interface GruppoPlanimetrie {
  /** Identità del gruppo: quella dichiarata dall'estrazione, o la chiave della mappa se sta da sola. */
  id: string;
  nome: string;
  versioni: VersionePlanimetria[];
  /** Collezionabili e raccolti di tutta la stanza. */
  totale: number;
  presi: number | null;
  /** Le aree della guida legate a una delle versioni (di norma una sola). */
  aree: Array<{ chiave: string; nome: string }>;
}

/**
 * Le planimetrie nell'ordine in cui arrivano, raccolte per stanza. L'ordine dei gruppi segue la
 * prima planimetria di ciascuno: così trascinare una stanza vuol dire spostare tutte le sue
 * versioni, che è l'unica cosa che ha senso quando l'ordine è «come si percorre il Palazzo».
 */
export function raggruppaPlanimetrie(planimetrie: Planimetria[], albero: MappaRiassuntoDto[]): GruppoPlanimetrie[] {
  const perChiave = new Map(albero.map((m) => [m.chiave, m]));
  const gruppi: GruppoPlanimetrie[] = [];
  const indice = new Map<string, number>();
  for (const p of planimetrie) {
    const mappa = perChiave.get(p.chiave) ?? null;
    const id = mappa?.gruppoImmagini?.id ?? `sola:${p.chiave}`;
    const versione: VersionePlanimetria = {
      planimetria: p,
      mappa,
      etichetta: mappa ? etichettaVersione(mappa) : 'Immagine 1',
    };
    const posto = indice.get(id);
    const gruppo = posto === undefined ? undefined : gruppi[posto];
    if (gruppo) {
      gruppo.versioni.push(versione);
      gruppo.totale += p.n;
      if (gruppo.presi !== null && p.presi !== null) gruppo.presi += p.presi;
      if (p.area && !gruppo.aree.some((a) => a.chiave === p.area!.chiave)) gruppo.aree.push(p.area);
      continue;
    }
    indice.set(id, gruppi.length);
    gruppi.push({
      id,
      nome: mappa ? titoloGruppoImmagini(mappa) : nomeSenzaPalazzo(p.nome),
      versioni: [versione],
      totale: p.n,
      presi: p.presi,
      aree: p.area ? [p.area] : [],
    });
  }
  return gruppi;
}

/** «Palazzo di Kamoshida › Torre» → «Torre»: il Palazzo lo dice già la pagina. */
export function nomeSenzaPalazzo(nome: string): string {
  return nome.split(' › ').slice(1).join(' › ') || nome;
}

/** L'elenco piatto delle chiavi nell'ordine dei gruppi: è quel che il server riordina. */
export function chiaviInOrdine(gruppi: GruppoPlanimetrie[]): string[] {
  return gruppi.flatMap((g) => g.versioni.map((v) => v.planimetria.chiave));
}

/** Sposta il gruppo `id` alla posizione `a`, tenendo insieme le sue versioni. */
export function spostaGruppo(gruppi: GruppoPlanimetrie[], id: string, a: number): GruppoPlanimetrie[] {
  const da = gruppi.findIndex((g) => g.id === id);
  if (da < 0 || a < 0 || a >= gruppi.length || a === da) return gruppi;
  const nuovo = [...gruppi];
  nuovo.splice(a, 0, ...nuovo.splice(da, 1));
  return nuovo;
}

/** Sposta la versione `chiave` di una posizione dentro la sua stanza (`passo` −1 o +1). */
export function spostaVersione(gruppi: GruppoPlanimetrie[], id: string, chiave: string, passo: -1 | 1): GruppoPlanimetrie[] {
  return gruppi.map((g) => {
    if (g.id !== id) return g;
    const da = g.versioni.findIndex((v) => v.planimetria.chiave === chiave);
    const a = da + passo;
    if (da < 0 || a < 0 || a >= g.versioni.length) return g;
    const versioni = [...g.versioni];
    versioni.splice(a, 0, ...versioni.splice(da, 1));
    return { ...g, versioni };
  });
}
