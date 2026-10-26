// ============================================================
// useSelezioneVoci — le voci selezionate di un giorno del Diario (appunti del Diario, 2026-10-26)
// ============================================================
//
// Richiesta dell'utente: «selezionare uno o più elementi del diario con ctrl+C»; la selezione si fa col clic (una voce), Ctrl+clic (aggiunge
// o toglie), Maiusc+clic (l'intervallo dall'ultima voce cliccata) ed Esc la annulla; su tablet e telefono «Seleziona» nel menu «⋯» della
// voce. La stessa selezione serve alle caselle di «Copia o sposta voci» (Copia in… / Sposta in…).
//
// La selezione è legata al giorno: cambiando giorno non vale più. Le voci sparite dopo una ricarica non contano (si filtra per l'ordine
// attuale), e l'elenco è sempre nell'ordine visivo: prima le voci di giorno, poi quelle di sera, nel loro posto.
// ============================================================

import { useCallback, useMemo, useState } from 'react';

export interface SelezioneVoci {
  /** Le voci selezionate, nell'ordine visivo. */
  uid: readonly string[];
  /** Per un controllo rapido. */
  insieme: ReadonlySet<string>;
  /** L'ultima voce selezionata nell'ordine visivo: l'incolla va subito dopo di lei. */
  ancora: string | null;
  /** Clic semplice: solo questa voce (di nuovo sulla sola voce selezionata: nessuna). */
  sostituisci: (uid: string) => void;
  /** Ctrl+clic, «Seleziona» del menu, la casella: aggiunge o toglie la voce. */
  alterna: (uid: string) => void;
  /** Maiusc+clic: l'intervallo dall'ultima voce cliccata a questa. */
  intervallo: (uid: string) => void;
  /** Mette (o toglie) più voci insieme (le caselle «Tutte» / «Nessuna» di una fascia). */
  scegli: (uid: readonly string[], dentro: boolean) => void;
  /** Sostituisce la selezione con queste voci (le voci appena incollate). */
  imposta: (uid: readonly string[]) => void;
  svuota: () => void;
}

/** La selezione delle voci di `giorno`, con `ordine` le voci del giorno nell'ordine visivo. */
export function useSelezioneVoci(giorno: string, ordine: readonly string[]): SelezioneVoci {
  const [stato, setStato] = useState<{ giorno: string; uid: ReadonlySet<string>; perno: string | null }>({ giorno, uid: new Set(), perno: null });
  const attuale = stato.giorno === giorno ? stato : { giorno, uid: new Set<string>(), perno: null };
  const uid = useMemo(() => ordine.filter((u) => attuale.uid.has(u)), [ordine, attuale.uid]);
  const insieme = useMemo(() => new Set(uid), [uid]);
  /** Lo stato di partenza del giorno attuale (un giorno diverso riparte vuoto). */
  const base = useCallback((s: typeof stato) => (s.giorno === giorno ? s : { giorno, uid: new Set<string>(), perno: null }), [giorno]);
  const sostituisci = useCallback((u: string) => setStato((s) => {
    const b = base(s);
    const sola = b.uid.size === 1 && b.uid.has(u);
    return { giorno, uid: sola ? new Set() : new Set([u]), perno: u };
  }), [base, giorno]);
  const alterna = useCallback((u: string) => setStato((s) => {
    const n = new Set(base(s).uid);
    if (n.has(u)) n.delete(u); else n.add(u);
    return { giorno, uid: n, perno: u };
  }), [base, giorno]);
  const intervallo = useCallback((u: string) => setStato((s) => {
    const b = base(s);
    const da = b.perno !== null ? ordine.indexOf(b.perno) : -1, a = ordine.indexOf(u);
    if (a < 0) return b;
    if (da < 0) return { giorno, uid: new Set([u]), perno: u };
    const [i, j] = da <= a ? [da, a] : [a, da];
    // il perno resta: Maiusc+clic ripetuto cambia l'altro capo dell'intervallo
    return { giorno, uid: new Set(ordine.slice(i, j + 1)), perno: b.perno };
  }), [base, giorno, ordine]);
  const scegli = useCallback((lista: readonly string[], dentro: boolean) => setStato((s) => {
    const n = new Set(base(s).uid);
    for (const u of lista) { if (dentro) n.add(u); else n.delete(u); }
    return { giorno, uid: n, perno: base(s).perno };
  }), [base, giorno]);
  const imposta = useCallback((lista: readonly string[]) => setStato({ giorno, uid: new Set(lista), perno: lista[lista.length - 1] ?? null }), [giorno]);
  const svuota = useCallback(() => setStato({ giorno, uid: new Set(), perno: null }), [giorno]);
  return { uid, insieme, ancora: uid[uid.length - 1] ?? null, sostituisci, alterna, intervallo, scegli, imposta, svuota };
}
