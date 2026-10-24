// ============================================================
// bozzeSporche — le bozze non salvate: registro in memoria (UI-ASSET-01, strato S5) e, per alcuni form, copia in sessionStorage (B2 fase 2)
// ============================================================
//
// Un form con modifiche non salvate si segnala con `useBozzaSporca`. Finché ce n'è almeno una:
// - `beforeunload` chiede conferma prima di chiudere o ricaricare la scheda del browser;
// - «Aggiorna» (striscia «nuova versione», pagina d'errore, schermata «Ricarica app») nomina le schede sporche e chiede conferma.
//
// Fase 2 (decisione del PM): se la pagina viene davvero ricaricata (aggiornamento dell'app, chunk mancante, ricarica del browser) la bozza di
// alcuni form si ritrova alla riapertura. Chi la vuole usa `useBozzaPersistente` (che include `useBozzaSporca`) e, per ritrovarla,
// `leggiBozzaPersistente` nell'inizializzatore dello stato. Regole:
// - solo `sessionStorage` (mai `localStorage`), chiave `bozza:<percorso della pagina>:<chiave del form>`, valore `{ v: 1, dati, partenza, salvataEl }`;
// - ogni accesso allo storage è in try/catch: senza storage (assente, pieno, bloccato) i form funzionano identici, solo senza copia;
// - si scrive solo se il form è sporco, con un piccolo ritardo (e subito se la pagina si nasconde); aprire un form senza toccarlo non scrive niente;
// - la copia si cancella al salvataggio riuscito, all'«Annulla» (`scartaBozzaPersistente`) e quando il form torna uguale ai valori di partenza;
// - si ritrova solo se i valori di partenza sono ancora quelli con cui fu salvata (impronta): se il dato è cambiato nel frattempo la bozza si scarta,
//   così non si sovrascrive mai un dato più nuovo;
// - oltre 100 KB per bozza non si salva; all'avvio si tolgono le bozze di più di 24 ore e quelle oltre le 20 più recenti.
// ============================================================

import { useEffect, useId } from 'react';

/** chiave → etichetta mostrata all'utente. */
const sporche = new Map<string, string>();

const guardia = (e: BeforeUnloadEvent) => {
  if (sporche.size) { e.preventDefault(); e.returnValue = ''; }
};
let guardiaAttiva = false;

/**
 * Toglie la guardia `beforeunload`: si chiama subito prima di un `reload()` già confermato dall'utente (nostra finestra «Aggiorna comunque»),
 * così il browser non chiede una seconda conferma. Una bozza segnalata dopo la riattiva.
 */
export function disattivaGuardiaBozze(): void {
  if (!guardiaAttiva) return;
  window.removeEventListener('beforeunload', guardia);
  guardiaAttiva = false;
}

/**
 * Segnala che il form ha modifiche non salvate (`sporca`) e lo toglie dal registro quando si salva, si annulla o si smonta.
 * `chiave` identifica il form; due istanze con la stessa chiave non si pestano i piedi (si aggiunge un id per istanza).
 */
export function useBozzaSporca(chiave: string, etichetta: string, sporca: boolean): void {
  const istanza = useId();
  useEffect(() => {
    if (!sporca) return;
    const k = `${chiave}#${istanza}`;
    sporche.set(k, etichetta);
    if (!guardiaAttiva) { window.addEventListener('beforeunload', guardia); guardiaAttiva = true; }
    return () => {
      sporche.delete(k);
      if (!sporche.size) disattivaGuardiaBozze();
    };
  }, [chiave, etichetta, sporca, istanza]);
}

/** Le etichette delle bozze non salvate adesso (senza ripetizioni). */
export const bozzeSporche = (): string[] => [...new Set(sporche.values())];

// ------------------------------------------------------------
// Copia in sessionStorage
// ------------------------------------------------------------

const PREFISSO = 'bozza:';
const VERSIONE = 1;
/** Oltre questa lunghezza (caratteri del JSON) una bozza non si salva. */
const LIMITE_BOZZA = 100_000;
const ETA_MASSIMA_MS = 24 * 60 * 60 * 1000;
const VOCI_MASSIME = 20;
const RITARDO_SCRITTURA_MS = 400;

interface BozzaSalvata { v: number; dati: unknown; partenza: string; salvataEl: string }

/** Lo storage della scheda, o null se manca o il browser lo blocca. */
function storage(): Storage | null {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

/** Una firma corta e stabile dei valori di partenza (djb2 sul JSON + lunghezza): basta a capire che il dato non è cambiato. */
export function improntaDi(valore: unknown): string {
  let testo: string;
  try { testo = JSON.stringify(valore) ?? ''; } catch { testo = ''; }
  let h = 5381;
  for (let i = 0; i < testo.length; i += 1) h = ((h << 5) + h + testo.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}.${testo.length.toString(36)}`;
}

/** La chiave nello storage: la pagina in cui si è e il form. */
function chiaveStorage(chiave: string): string {
  let percorso = '';
  try { percorso = globalThis.location?.pathname ?? ''; } catch { /* senza pagina: chiave senza percorso */ }
  return `${PREFISSO}${percorso}:${chiave}`;
}

let ripulito = false;
/** Una volta per caricamento della pagina: toglie le bozze illeggibili, vecchie (più di 24 ore) o in eccesso (oltre le 20 più recenti). */
function ripulisciUnaVolta(): void {
  if (ripulito) return;
  ripulito = true;
  const s = storage();
  if (!s) return;
  try {
    const adesso = Date.now();
    const voci: Array<{ k: string; quando: number }> = [];
    const daTogliere: string[] = [];
    for (let i = 0; i < s.length; i += 1) {
      const k = s.key(i);
      if (!k || !k.startsWith(PREFISSO)) continue;
      let quando = Number.NaN;
      try { const b = JSON.parse(s.getItem(k) ?? 'null') as Partial<BozzaSalvata> | null; if (b && b.v === VERSIONE && typeof b.salvataEl === 'string') quando = Date.parse(b.salvataEl); } catch { /* illeggibile */ }
      if (Number.isNaN(quando) || adesso - quando > ETA_MASSIMA_MS) daTogliere.push(k); else voci.push({ k, quando });
    }
    voci.sort((a, b) => b.quando - a.quando);
    for (const v of voci.slice(VOCI_MASSIME)) daTogliere.push(v.k);
    for (const k of daTogliere) s.removeItem(k);
  } catch { /* storage che lancia: niente pulizia */ }
}

/** Cancella la copia di un form (se c'è). Si chiama al salvataggio riuscito e all'«Annulla». */
export function scartaBozzaPersistente(chiave: string): void {
  const s = storage();
  if (!s) return;
  try { s.removeItem(chiaveStorage(chiave)); } catch { /* storage non disponibile */ }
}

/** Come sopra, ma non tocca lo storage se la voce non c'è (aprire un form non toccato non deve scrivere). */
function rimuoviSeEsiste(k: string): void {
  const s = storage();
  if (!s) return;
  try { if (s.getItem(k) !== null) s.removeItem(k); } catch { /* storage non disponibile */ }
}

/**
 * La bozza ritrovata di un form, o null. Vale solo se è di versione 1, ha meno di 24 ore, i valori di partenza di adesso (`partenza`) hanno la stessa
 * impronta di quelli con cui fu salvata e `valida` la accetta (forma e tipi giusti; restituisce i dati puliti). Non scrive e non cancella niente.
 */
export function leggiBozzaPersistente<T>(chiave: string, partenza: unknown, valida: (dati: unknown) => T | null): T | null {
  ripulisciUnaVolta();
  const s = storage();
  if (!s) return null;
  try {
    const grezzo = s.getItem(chiaveStorage(chiave));
    if (grezzo === null) return null;
    const b = JSON.parse(grezzo) as Partial<BozzaSalvata> | null;
    if (!b || b.v !== VERSIONE || typeof b.salvataEl !== 'string' || typeof b.partenza !== 'string') return null;
    if (Date.now() - Date.parse(b.salvataEl) > ETA_MASSIMA_MS) return null;
    if (b.partenza !== improntaDi(partenza)) return null;
    return valida(b.dati);
  } catch { return null; }
}

/** Scrive la copia; oltre il limite, o se lo storage rifiuta, non fa niente (e toglie una copia più vecchia, che ormai non è più la bozza). */
function scriviBozza(k: string, impronta: string, dati: unknown): void {
  const s = storage();
  if (!s) return;
  try {
    ripulisciUnaVolta();
    const testo = JSON.stringify({ v: VERSIONE, dati, partenza: impronta, salvataEl: new Date().toISOString() } satisfies BozzaSalvata);
    if (testo.length > LIMITE_BOZZA) { s.removeItem(k); return; }
    s.setItem(k, testo);
  } catch { /* pieno, bloccato o non serializzabile: il form funziona lo stesso */ }
}

/** Il validatore dei form con uno stato «piatto» (testi, numeri, booleani): stesse chiavi e stessi tipi dei valori di partenza, nient'altro. */
export function validaPiatta<T extends object>(partenza: T): (dati: unknown) => T | null {
  const modello = partenza as Record<string, unknown>;
  return (dati) => {
    if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) return null;
    const chiavi = Object.keys(modello);
    const d = dati as Record<string, unknown>;
    if (Object.keys(d).length !== chiavi.length) return null;
    const pulito: Record<string, string | number | boolean> = {};
    for (const k of chiavi) {
      const v = d[k];
      if (typeof v !== typeof modello[k] || (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')) return null;
      pulito[k] = v;
    }
    return pulito as T;
  };
}

interface OpzioniPersistenza {
  /** Il form differisce dai valori di partenza: solo allora si scrive; quando torna falso la copia si cancella. */
  sporca: boolean;
  /** Il form è aperto davvero (default sì). Da chiuso non si scrive né si cancella niente: la copia aspetta la riapertura. */
  attiva?: boolean;
  /** Se il registro delle bozze sporche (avviso di chiusura) segue un'altra condizione; di default è `sporca`. */
  sporcaRegistro?: boolean;
}

/**
 * Come `useBozzaSporca` (registro e avviso di chiusura) e in più tiene in sessionStorage una copia dello `stato` del form finché è sporco.
 * `partenza` sono i valori con cui il form si è aperto: la loro impronta decide se la copia vale ancora alla riapertura.
 */
export function useBozzaPersistente(chiave: string, etichetta: string, stato: unknown, partenza: unknown, opzioni: OpzioniPersistenza): void {
  const { sporca, attiva = true, sporcaRegistro = sporca } = opzioni;
  useBozzaSporca(chiave, etichetta, sporcaRegistro);
  const impronta = improntaDi(partenza);
  useEffect(() => {
    if (!attiva) return;
    const k = chiaveStorage(chiave);
    if (!sporca) { rimuoviSeEsiste(k); return; }
    const scrivi = () => scriviBozza(k, impronta, stato);
    const timer = setTimeout(scrivi, RITARDO_SCRITTURA_MS);
    // la pagina si nasconde o si chiude prima del ritardo: l'ultima modifica non va persa
    window.addEventListener('pagehide', scrivi);
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', scrivi); };
  }, [chiave, attiva, sporca, impronta, stato]);
}
