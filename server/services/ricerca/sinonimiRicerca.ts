// ============================================================
// sinonimiRicerca — il blocco `sinonimi-ricerca` della guida: i nomi alternativi e le abbreviazioni che la ricerca globale conosce (L11, B3)
// ============================================================
//
// Il blocco (G-038 B del registro dell'Esperto della guida) è l'unico punto da cui la ricerca legge i sinonimi: chi lo renderà
// modificabile (B11) farà leggere qui la versione corretta, senza toccare l'indice. Mancante o illeggibile non è un errore: nessun
// sinonimo, la ricerca funziona sui nomi. Una riga che punta a un oggetto che non c'è si salta (la riporta `sinonimiInAttesa`).
// ============================================================

import { datiGuidaCorretti } from '../datiGuida.js';
import { normalizzaTesto } from '../../../shared/testo.js';
import { TIPI_RICERCA, type TipoRicerca } from '../../../shared/ricerca.js';

export const CHIAVE_SINONIMI_RICERCA = 'sinonimi-ricerca';
const MAX_NOMI = 8;
const MAX_LUNGHEZZA_NOME = 80;

/** Il blocco come sta nel database (tutto opzionale: si valida leggendo). */
interface BloccoGrezzo {
  sinonimi?: ReadonlyArray<{ tipo?: unknown; chiave?: unknown; nomi?: unknown }>;
  abbreviazioni?: ReadonlyArray<{ abbreviazione?: unknown; esteso?: unknown }>;
}

/** I sinonimi validati e le abbreviazioni attestate. */
export interface SinonimiRicerca {
  /** `tipo|chiave` → nomi alternativi (senza doppioni dopo la normalizzazione). */
  sinonimi: ReadonlyMap<string, readonly string[]>;
  abbreviazioni: ReadonlyArray<{ abbreviazione: string; esteso: string }>;
}

/** La chiave con cui un sinonimo si associa a una voce dell'indice. */
export function chiaveSinonimo(tipo: TipoRicerca, chiave: string): string {
  return `${tipo}|${chiave}`;
}

/** Pura: valida un blocco già letto. Una riga con tipo sconosciuto, chiave vuota o nessun nome valido si salta. */
export function leggiSinonimi(blocco: unknown): SinonimiRicerca {
  const b = (blocco && typeof blocco === 'object' ? blocco : {}) as BloccoGrezzo;
  const sinonimi = new Map<string, string[]>();
  for (const r of Array.isArray(b.sinonimi) ? b.sinonimi : []) {
    if (typeof r?.tipo !== 'string' || !(TIPI_RICERCA as readonly string[]).includes(r.tipo)) continue;
    if (typeof r.chiave !== 'string' || r.chiave.trim() === '' || !Array.isArray(r.nomi)) continue;
    const visti = new Set<string>();
    const nomi: string[] = [];
    for (const n of r.nomi as unknown[]) {
      if (typeof n !== 'string') continue;
      const testo = n.trim();
      const forma = normalizzaTesto(testo);
      if (testo === '' || testo.length > MAX_LUNGHEZZA_NOME || forma === '' || visti.has(forma) || nomi.length >= MAX_NOMI) continue;
      visti.add(forma);
      nomi.push(testo);
    }
    if (nomi.length === 0) continue;
    const k = chiaveSinonimo(r.tipo as TipoRicerca, r.chiave);
    sinonimi.set(k, [...(sinonimi.get(k) ?? []), ...nomi]);
  }
  const abbreviazioni: Array<{ abbreviazione: string; esteso: string }> = [];
  for (const a of Array.isArray(b.abbreviazioni) ? b.abbreviazioni : []) {
    if (typeof a?.abbreviazione !== 'string' || typeof a.esteso !== 'string') continue;
    const abbreviazione = a.abbreviazione.trim();
    const esteso = a.esteso.trim();
    if (abbreviazione !== '' && esteso !== '') abbreviazioni.push({ abbreviazione, esteso });
  }
  return { sinonimi, abbreviazioni };
}

/** I sinonimi del database dell'app, con le correzioni dell'utente sopra (R11-17/1; blocco congelato e in memoria, svuotato dal registro comune delle cache di gioco). */
export function sinonimiRicerca(): SinonimiRicerca {
  return leggiSinonimi(datiGuidaCorretti<BloccoGrezzo>(CHIAVE_SINONIMI_RICERCA));
}

/**
 * Se `nome` comincia (al limite di parola, senza maiuscole) per una abbreviazione attestata, il nome con l'abbreviazione estesa;
 * altrimenti null. Solo le abbreviazioni del blocco: le altre forme del menu (An., Cint., Cav.…) non si inventano (G-024).
 */
export function espandiAbbreviazione(nome: string, abbreviazioni: SinonimiRicerca['abbreviazioni']): string | null {
  const minuscolo = nome.toLocaleLowerCase('it-IT');
  for (const a of abbreviazioni) {
    const abbr = a.abbreviazione.toLocaleLowerCase('it-IT');
    if (!minuscolo.startsWith(abbr)) continue;
    const resto = nome.slice(a.abbreviazione.length);
    if (resto !== '' && /^[\p{L}\p{N}]/u.test(resto) && /[\p{L}\p{N}]$/u.test(a.abbreviazione)) continue;
    return `${a.esteso}${resto}`;
  }
  return null;
}
