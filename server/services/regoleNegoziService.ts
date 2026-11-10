// ============================================================
// regoleNegoziService — la regola comune di un genere di punto vendita (L4-01, migrazione 372): pezzi, rifornimento e condizioni
// ============================================================
//
// Oggi una sola regola, quella dei distributori («lunedì, 2 pezzi, non col caldo»). Un'offerta che la segue (`articolo.regola_comune` = 1) ha
// i tre campi uguali a quelli della regola, scritti nella sua riga: chi legge le offerte (scorta, disponibilità, registro degli acquisti) non
// cambia. Il punto di modifica è uno: la regola (`aggiornaRegolaDelTipo`), che riscrive le offerte che la seguono. Il segno lo decide
// l'uguaglianza dei tre campi, ricalcolata a ogni scrittura dell'offerta (`allineaSegnoRegola`): cambiare pezzi, rifornimento o condizioni di
// un'offerta ne fa un'eccezione per riga; rimetterli uguali la riporta alla regola. Un'offerta nuova di un punto vendita con la regola prende i
// campi che non dice dalla regola (`completaConLaRegola`).
// ============================================================

import { isDeepStrictEqual } from 'node:util';
import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaCondizioni } from './mappe/mappeService.js';
import { normalizzaRifornimento, descriviRifornimento } from '../../shared/rifornimento.js';
import { condizioneConTesto, leggiCondizioniSalvate, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { fraseDelleCondizioni } from './condizioni/fraseCondizioni.js';
import type { RegolaTipoNegozioDto } from '../../shared/types.js';

interface RigaRegola { tipo: string; quantita: number | null; rifornimento_json: string | null; condizioni_json: string | null; fonte: string }

/** La tabella c'è (gioco.db migrato alla 372): prima, nessuna regola e nessun segno. */
function conRegole(): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'regola_tipo_negozio'").get()
    && !!prepared("SELECT 1 FROM pragma_table_info('articolo', 'main') WHERE name = 'regola_comune'").get();
}

/** Un JSON con le chiavi degli oggetti in ordine (l'ordine degli elenchi conta): due regole uguali scritte in ordine diverso coincidono. */
export function jsonCanonico(json: string | null | undefined): string | null {
  if (json === null || json === undefined) return null;
  const ordina = (v: unknown): unknown => (Array.isArray(v) ? v.map(ordina)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, ordina(x)])) : v);
  try { return JSON.stringify(ordina(JSON.parse(json))); } catch { return `illeggibile:${json}`; }
}

/** La regola del genere di punto vendita, o null se non ne ha. */
export function regolaDelTipo(tipo: string | null | undefined): RigaRegola | null {
  if (!tipo || !conRegole()) return null;
  return (prepared('SELECT tipo, quantita, rifornimento_json, condizioni_json, fonte FROM main.regola_tipo_negozio WHERE tipo = ?').get(tipo) as RigaRegola | undefined) ?? null;
}

/** La regola del punto vendita di un'offerta (dal suo genere). */
export function regolaDelNegozio(negozio: unknown): RigaRegola | null {
  if (typeof negozio !== 'string') return null;
  return regolaDelTipo((prepared('SELECT tipo FROM main.negozio WHERE chiave = ?').get(negozio) as { tipo: string } | undefined)?.tipo);
}

/** I tre campi dell'offerta coincidono con quelli della regola. */
function segueLaRegola(o: { quantita: unknown; rifornimento_json: unknown; condizioni_json: unknown }, r: RigaRegola): boolean {
  return (o.quantita ?? null) === r.quantita && jsonCanonico(o.rifornimento_json as string | null) === jsonCanonico(r.rifornimento_json)
    && jsonCanonico(o.condizioni_json as string | null) === jsonCanonico(r.condizioni_json);
}

/**
 * Un'offerta nuova di un punto vendita con la regola: i campi che non dice (assenti o vuoti) vengono dalla regola. Il corpo è quello già
 * validato dallo schema (`rifornimento_json` e `condizioni_json` sono testo JSON). Senza regola il corpo resta com'è.
 */
export function completaConLaRegola(dati: Record<string, unknown>): Record<string, unknown> {
  const r = regolaDelNegozio(dati.negozio_chiave);
  if (!r) return dati;
  const vuoto = (v: unknown) => v === undefined || v === null;
  return {
    ...dati,
    ...(vuoto(dati.quantita) ? { quantita: r.quantita } : {}),
    ...(vuoto(dati.rifornimento_json) ? { rifornimento_json: r.rifornimento_json } : {}),
    ...(vuoto(dati.condizioni_json) ? { condizioni_json: r.condizioni_json } : {}),
  };
}

/** Ricalcola il segno «segue la regola» di un'offerta dopo una scrittura (dentro la transazione di chi chiama). */
export function allineaSegnoRegola(articolo: string): void {
  if (!conRegole()) return;
  const a = prepared('SELECT negozio_chiave, quantita, rifornimento_json, condizioni_json, regola_comune FROM main.articolo WHERE chiave = ?').get(articolo) as
    { negozio_chiave: string; quantita: number | null; rifornimento_json: string | null; condizioni_json: string | null; regola_comune: number } | undefined;
  if (!a) return;
  const r = regolaDelNegozio(a.negozio_chiave);
  const segno = r && segueLaRegola(a, r) ? 1 : 0;
  if (segno !== a.regola_comune) prepared('UPDATE main.articolo SET regola_comune = ? WHERE chiave = ?').run(segno, articolo);
}

/** Ricalcola il segno di tutte le offerte di un punto vendita (il suo genere è cambiato). */
export function allineaSegnoDelNegozio(negozio: string): void {
  if (!conRegole()) return;
  for (const a of prepared('SELECT chiave FROM main.articolo WHERE negozio_chiave = ?').pluck().all(negozio) as string[]) allineaSegnoRegola(a);
}

/** Il segno di un'offerta, per l'editor (false prima della 372). */
export function segueRegolaComune(articolo: string): boolean {
  if (!conRegole()) return false;
  return (prepared('SELECT regola_comune FROM main.articolo WHERE chiave = ?').pluck().get(articolo) as number | undefined) === 1;
}

/** La regola a parole: «2 pezzi, ogni lunedì (da verificare in gioco) · se non c'è un'ondata di calore …». */
function testoDellaRegola(r: RigaRegola): string {
  const rif = normalizzaRifornimento(r.rifornimento_json);
  const condizioni = leggiCondizioniSalvate(r.condizioni_json);
  const nomi = nomiCondizioniMemo();
  const frase = condizioni.length ? fraseDelleCondizioni(condizioni.map((c) => condizioneConTesto(c, nomi))) : null;
  return [rif ? descriviRifornimento(rif, r.quantita) : r.quantita !== null ? `${r.quantita} pezzi` : null, frase].filter(Boolean).join(' · ');
}

/** Le regole comuni, per genere, con quante offerte le seguono. */
export function regoleDeiTipi(): Record<string, RegolaTipoNegozioDto> {
  if (!conRegole()) return {};
  const out: Record<string, RegolaTipoNegozioDto> = {};
  for (const r of prepared('SELECT tipo, quantita, rifornimento_json, condizioni_json, fonte FROM main.regola_tipo_negozio ORDER BY tipo').all() as RigaRegola[]) {
    const offerte = prepared(`SELECT COUNT(*) FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave WHERE n.tipo = ? AND a.regola_comune = 1`).pluck().get(r.tipo) as number;
    const rifornimento = normalizzaRifornimento(r.rifornimento_json);
    let grezze: unknown;
    try { grezze = JSON.parse(r.condizioni_json ?? '[]'); } catch { grezze = null; }
    out[r.tipo] = { tipo: r.tipo, quantita: r.quantita, rifornimento, condizioni: leggiCondizioniSalvate(r.condizioni_json),
      // l'editor sa mostrare il valore salvato senza perderne parti (altrimenti lo lascia com'è finché non si riscrive)
      rifornimentoLeggibile: r.rifornimento_json === null || jsonCanonico(JSON.stringify(rifornimento)) === jsonCanonico(r.rifornimento_json),
      condizioniLeggibili: Array.isArray(grezze) && grezze.every((c) => isDeepStrictEqual(normalizzaRequisitoSpillo(c), c)),
      testo: testoDellaRegola(r), offerte, fonte: r.fonte };
  }
  return out;
}

/** I campi di una regola da cambiare: quelli assenti restano come sono (anche un valore salvato che l'editor non sa leggere). */
export interface ValoriRegola { quantita?: number | null; rifornimento_json?: string | null; condizioni_json?: string }

/**
 * Cambia la regola di un genere (dentro la transazione di chi chiama) e riscrive le offerte che la seguono: è il solo punto di modifica di
 * pezzi, rifornimento e condizioni di quelle offerte. Ogni offerta riscritta passa prima da `adotta` (la riga della guida diventa «corretta»,
 * con la sua fotografia per «Ripristina», come ogni modifica di un'offerta). Poi il segno si ricalcola per tutte le offerte del genere: anche
 * un'eccezione che coincide con la regola nuova torna a seguirla. 404 se il genere non ha una regola; 400 se un valore non è valido.
 */
export function aggiornaRegolaDelTipo(tipo: string, valori: ValoriRegola, adotta: (articolo: string) => void): number {
  const r = regolaDelTipo(tipo);
  if (!r) throw httpErrors.notFound('regola-non-trovata', `Il genere «${tipo}» non ha una regola comune.`);
  const nuova = {
    quantita: valori.quantita !== undefined ? valori.quantita : r.quantita,
    rifornimento_json: valori.rifornimento_json !== undefined ? valori.rifornimento_json : r.rifornimento_json,
    condizioni_json: valori.condizioni_json !== undefined ? valori.condizioni_json : r.condizioni_json ?? '[]',
  };
  if (valori.rifornimento_json != null && normalizzaRifornimento(valori.rifornimento_json) === null) throw httpErrors.badRequest('regola-non-valida', 'Regola di rifornimento non valida.');
  if (valori.condizioni_json !== undefined) {
    const condizioni = JSON.parse(valori.condizioni_json) as RequisitoSpillo[];
    // gli stessi controlli delle condizioni di un'offerta: ogni condizione già nella sua forma normale, e verificabile
    if (!Array.isArray(condizioni) || condizioni.some((c) => !isDeepStrictEqual(normalizzaRequisitoSpillo(c), c))) throw httpErrors.badRequest('regola-non-valida', 'Condizioni della regola non valide.');
    verificaCondizioni(condizioni);
  }
  const adesso = new Date().toISOString();
  prepared('UPDATE main.regola_tipo_negozio SET quantita = ?, rifornimento_json = ?, condizioni_json = ?, updated_at = ? WHERE tipo = ?')
    .run(nuova.quantita, nuova.rifornimento_json, nuova.condizioni_json, adesso, tipo);
  const negozi = prepared('SELECT chiave FROM main.negozio WHERE tipo = ? ORDER BY chiave').pluck().all(tipo) as string[];
  const seguono = prepared(`SELECT chiave FROM main.articolo WHERE regola_comune = 1 AND negozio_chiave IN (SELECT chiave FROM main.negozio WHERE tipo = ?)
    AND (quantita IS NOT ? OR rifornimento_json IS NOT ? OR condizioni_json IS NOT ?) ORDER BY chiave`).pluck()
    .all(tipo, nuova.quantita, nuova.rifornimento_json, nuova.condizioni_json) as string[];
  const scrivi = prepared('UPDATE main.articolo SET quantita = ?, rifornimento_json = ?, condizioni_json = ?, updated_at = ? WHERE chiave = ?');
  for (const a of seguono) { adotta(a); scrivi.run(nuova.quantita, nuova.rifornimento_json, nuova.condizioni_json, adesso, a); }
  for (const n of negozi) allineaSegnoDelNegozio(n);
  return seguono.length;
}
