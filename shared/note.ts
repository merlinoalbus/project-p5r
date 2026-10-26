// ============================================================
// note — le note delle Doti sociali come le mostra il gioco: il simbolo ♪ ripetuto (♪, ♪♪, ♪♪♪, ♪♪♪♪)
// ============================================================
//
// Richiesta dell'utente (2026-10-26), sul riquadro «Il gioco dà» con «Doti sociali · Conoscenza   1 nota»: «qui perchè scritto a parole
// nota? e non usando il simbolo? Ovunque dove si tratta di note va messo l'equivalente simbolo /numero di simboli». È l'UNICO punto che
// scrive le note: le frasi del server (riepilogo, `produceTesto`, storico, errori) e dell'interfaccia le compongono da qui.
//
// Chi legge con un lettore di schermo deve sentire «2 note», non il nome del simbolo ripetuto: le parole restano per lui (`noteAParole`,
// per gli `aria-label`), e un testo che porta i simboli si legge con `pezziTestoNote` (il componente `TestoNote` dell'interfaccia) o si
// riscrive a parole con `testoNoteAParole` (per gli attributi). «Nessuna nota» (zero, la Dote a valori possibili lasciata senza) si scrive
// «nessuna ♪»: lo zero non ha simboli da contare, e la parola davanti dice che non ce n'è; a voce resta «nessuna nota».
// ============================================================

/** Il simbolo di una nota. */
export const SIMBOLO_NOTA = '♪';

/** «♪♪» per 2: il numero di note come simboli (niente per zero o meno). */
export function simboliNote(n: number): string {
  return SIMBOLO_NOTA.repeat(Math.max(0, Math.trunc(n)));
}

/** «1 nota», «2 note»: le note a parole, per i lettori di schermo (`aria-label`) e per le frasi che le spiegano. */
export function noteAParole(n: number): string {
  return `${n} ${n === 1 ? 'nota' : 'note'}`;
}

/** «nessuna ♪»: zero note (a voce «nessuna nota», vedi `pezziTestoNote`). */
export const NESSUNA_NOTA = `nessuna ${SIMBOLO_NOTA}`;

/** «♪♪ o ♪♪♪», «♪, ♪♪ o ♪♪♪»: i valori possibili di una Dote, in simboli. */
export function simboliPossibili(possibili: ReadonlyArray<number>): string {
  const s = possibili.map(simboliNote);
  return s.length > 1 ? `${s.slice(0, -1).join(', ')} o ${s[s.length - 1]}` : s[0] ?? '';
}

/** Le scelte delle note di una Dote (1–3): la chiave, i simboli da mostrare e le parole per i lettori di schermo. */
export const SCELTE_NOTE = ([1, 2, 3] as const).map((n) => ({ chiave: String(n) as '1' | '2' | '3', simboli: simboliNote(n), parole: noteAParole(n) }));

/** Un pezzo di testo: testo semplice, o una fila di simboli con le parole che la dicono. */
export type PezzoTestoNote = { testo: string } | { simboli: string; parole: string };

const FILA_DI_NOTE = /♪+/gu;
/** Il testo che precede le file di una sola nota da leggere «nessuna nota» (non «nessuna 1 nota»). */
const NESSUNA_PRIMA = /\bnessuna $/iu;

/**
 * Il testo diviso nei suoi pezzi: il testo semplice e le file di ♪, ciascuna con le sue parole («♪♪» → «2 note»; dopo «nessuna», «♪» →
 * «nota»). Un testo senza simboli resta un pezzo solo.
 */
export function pezziTestoNote(testo: string): PezzoTestoNote[] {
  const pezzi: PezzoTestoNote[] = [];
  let da = 0;
  for (const m of testo.matchAll(FILA_DI_NOTE)) {
    const prima = testo.slice(da, m.index);
    if (prima) pezzi.push({ testo: prima });
    const n = m[0].length;
    pezzi.push({ simboli: m[0], parole: n === 1 && NESSUNA_PRIMA.test(testo.slice(0, m.index)) ? 'nota' : noteAParole(n) });
    da = m.index + n;
  }
  if (da < testo.length || pezzi.length === 0) pezzi.push({ testo: testo.slice(da) });
  return pezzi;
}

/** Il testo con le file di ♪ dette a parole («Conoscenza ♪♪» → «Conoscenza 2 note»): per gli attributi letti ad alta voce (`aria-label`). */
export function testoNoteAParole(testo: string): string {
  return pezziTestoNote(testo).map((p) => ('testo' in p ? p.testo : p.parole)).join('');
}

/**
 * Le note che un testo libero della guida scrive a parole come ricompensa («Conoscenza +1 nota», «+2 note») mostrate come simboli
 * («Conoscenza ♪», «♪♪»). Solo per la vista: il testo salvato non cambia (nessuna migrazione), e si usa solo sui campi che dicono la
 * ricompensa in Doti (le domande in classe), dove «nota» vuol dire sempre una nota della Dote.
 */
export function ricompensaInSimboli(testo: string): string {
  return testo.replace(/\+\s?([1-4]) not[ae]\b/giu, (_, n: string) => simboliNote(Number(n)));
}
