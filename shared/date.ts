// ============================================================
// Date del calendario di gioco — il giorno della settimana si calcola, non si salva (R9-16)
// ============================================================
//
// Il gioco va da aprile a dicembre del 2016 e da gennaio a marzo del 2017 (il 9 aprile è sabato). Il giorno della settimana di una data
// «MM-GG» si ricava da qui in tutte le viste: nessun formato salvato («Lunedi», «lun», «Lunedì») si legge più.
// ============================================================

const NOMI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'] as const;
export type NomeGiornoSettimana = (typeof NOMI)[number];

/** L'anno solare di una data di gioco: gennaio-marzo sono del 2017, il resto del 2016. */
export function annoDiGioco(mese: number): number {
  return mese <= 3 ? 2017 : 2016;
}

/** Il giorno della settimana («Lunedì») di una data «MM-GG» del calendario di gioco, o null se la data non esiste. */
export function giornoDellaSettimana(data: string | null | undefined): NomeGiornoSettimana | null {
  const m = /^(\d{2})-(\d{2})$/.exec(data ?? '');
  if (!m) return null;
  const mese = Number(m[1]), giorno = Number(m[2]);
  const d = new Date(Date.UTC(annoDiGioco(mese), mese - 1, giorno));
  if (d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) return null;
  return NOMI[d.getUTCDay()]!;
}

/** I giorni di gioco da `da` ad `a` («MM-GG», con l'anno del calendario di gioco): 0 se è lo stesso giorno, negativo se `a` viene prima; null se una delle due non è una data. */
export function giorniDiGiocoFra(da: string | null | undefined, a: string | null | undefined): number | null {
  const ms = (d: string | null | undefined): number | null => {
    if (giornoDellaSettimana(d) === null) return null;
    const [mese, giorno] = d!.split('-').map(Number) as [number, number];
    return Date.UTC(annoDiGioco(mese), mese - 1, giorno);
  };
  const x = ms(da), y = ms(a);
  return x === null || y === null ? null : Math.round((y - x) / 86_400_000);
}

/** L13 (ondata 7, O7-4): il periodo di una settimana della guida dal suo primo e ultimo giorno («MM-GG»), «09/04 - 10/04»: la sola resa,
 *  letta dal Calendario e dalla migrazione 313 per confrontare il testo copiato. Null se manca una delle due date. */
export function periodoDellaSettimana(dal: string | null | undefined, al: string | null | undefined): string | null {
  const gm = (d: string | null | undefined): string | null => (giornoDellaSettimana(d) === null ? null : `${d!.slice(3, 5)}/${d!.slice(0, 2)}`);
  const a = gm(dal), b = gm(al);
  return a === null || b === null ? null : `${a} - ${b}`;
}

/** Lo stesso giorno in minuscolo e senza accenti («lunedi»), la forma che il valutatore delle condizioni confronta. */
export function giornoDellaSettimanaPiatto(data: string | null | undefined): string | null {
  const g = giornoDellaSettimana(data);
  return g === null ? null : g.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
