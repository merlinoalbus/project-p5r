// ============================================================
// meteo — dal testo del meteo della guida («Sereno/Nuvoloso», «Sereno (notte torrida)») alle chiavi delle icone `meteo/<chiave>`
// ============================================================

export type ChiaveMeteo = 'sereno' | 'nuvoloso' | 'pioggia' | 'temporale' | 'neve' | 'nebbia' | 'caldo' | 'freddo' | 'polline' | 'tifone';

export interface SegmentoMeteo {
  chiave: ChiaveMeteo;
  /** Testo originale del segmento (es. «Sereno», «Neve (ondata di gelo)»). */
  testo: string;
}

const PAROLE: Array<[RegExp, ChiaveMeteo]> = [
  [/tifone|uragano/i, 'tifone'],
  [/temporal|fulmin/i, 'temporale'],
  [/pioggi|acquazzon|piov/i, 'pioggia'],
  [/nev|gelo/i, 'neve'],
  [/nebbi|foschi/i, 'nebbia'],
  [/pollin/i, 'polline'],
  [/nuvol|copert/i, 'nuvoloso'],
  [/seren|sole|solegg/i, 'sereno'],
];

const MODIFICATORI: Array<[RegExp, ChiaveMeteo]> = [
  [/torrid|calore|caldo|afa/i, 'caldo'],
  [/gelo|gelid|freddo/i, 'freddo'],
];

/** Chiave dell'icona per un singolo segmento; null se non riconosciuto. */
export function chiaveMeteo(segmento: string): ChiaveMeteo | null {
  const principale = segmento.replace(/\(.*?\)/g, '');
  for (const [re, chiave] of PAROLE) if (re.test(principale)) return chiave;
  for (const [re, chiave] of MODIFICATORI) if (re.test(segmento)) return chiave;
  return null;
}

/** Modificatore fra parentesi («notte torrida» → caldo, «ondata di gelo» → freddo), se presente. */
export function modificatoreMeteo(segmento: string): ChiaveMeteo | null {
  const dentro = segmento.match(/\((.*?)\)/)?.[1];
  if (!dentro) return null;
  for (const [re, chiave] of MODIFICATORI) if (re.test(dentro)) return chiave;
  return null;
}

/**
 * Segmenti del meteo (giorno/sera separati da «/»): ogni segmento porta la chiave dell'icona.
 * Segmenti uguali consecutivi vengono uniti («Neve/Neve» → un solo segmento).
 */
export function segmentiMeteo(testo: string | null | undefined): SegmentoMeteo[] {
  if (!testo) return [];
  const parti = testo.split('/').map((p) => p.trim()).filter(Boolean);
  const esito: SegmentoMeteo[] = [];
  for (const parte of parti) {
    const chiave = chiaveMeteo(parte);
    if (!chiave) continue;
    const precedente = esito[esito.length - 1];
    if (precedente && precedente.chiave === chiave) {
      if (parte.length > precedente.testo.length) precedente.testo = parte;
      continue;
    }
    esito.push({ chiave, testo: parte });
  }
  return esito;
}
