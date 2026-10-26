// ============================================================
// Prezzi dell'Ondata 5 (Lotto E; decisione 21 dell'utente) — letture comuni delle migrazioni 260-267
// ============================================================
//
// Il prezzo vive solo nell'offerta (`articolo.prezzo`, `articolo.costo_json`, `articolo.prezzo_per_fascia_json`; decisioni 2, 4, 5, 12, 18).
// Le copie nei testi (descrizioni del catalogo, `libro.prezzo`, `attivita.costo` dei videogiochi, i dettagli dei DVD) si tolgono solo dove
// ripetono un'offerta che c'è: un prezzo che vive solo nel testo resta, perché è l'unico punto in cui il dato esiste.
// Qui: l'audit comune, la nota storica, l'impronta delle voci del Diario (le migrazioni del lotto non la cambiano) e la funzione pura che
// toglie da una descrizione i prezzi copiati.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { esisteTabella } from './pulizieL11.js';
export { improntaDiario } from './rifornimentoOndata5.js';

export const FONTE_OGGETTI = 'https://www.allgamestaff.it/persona-5-royal/oggetti/';
export const FONTE_NEGOZI = 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/';
export const FONTE_SPECIALI = 'https://www.allgamestaff.it/persona-5-royal/negozi-speciali/';
export const FONTE_DVD = 'https://www.allgamestaff.it/persona-5-royal/dvd-a-noleggio/';

/** L'audit di una migrazione del lotto, con le esecuzioni accodate (una migrazione rieseguita su un'altra copia ne aggiunge una). */
export function scriviAudit(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-E', decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

/** Una nota storica sulla fonte, legata alle chiavi date (offerte e schede del catalogo che esistono). Dice che cosa ha scritto. */
export function notaStorica(db: AppDatabase, nota: { chiave: string; testo: string; fonte: string }, legami: Array<{ tipo: 'articolo' | 'catalogo'; chiave: string }>): { creata: number; legami: number } {
  if (!esisteTabella(db, 'nota_storica') || !esisteTabella(db, 'nota_storica_legame')) return { creata: 0, legami: 0 };
  const creata = db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
    .run(nota.chiave, nota.testo, nota.fonte, JSON.stringify({ versione: 1, testo: nota.testo, fonte: nota.fonte }), new Date().toISOString()).changes;
  let n = 0;
  const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
  for (const l of legami) {
    const esiste = l.tipo === 'articolo' ? db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(l.chiave) : db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(l.chiave);
    if (esiste) n += lega.run(nota.chiave, l.tipo, l.chiave).changes;
  }
  return { creata, legami: n };
}

/** Un numero scritto all'italiana («2.600», «990.000», «5980») come intero; null se non è un numero. */
export function numeroItaliano(testo: string): number | null {
  const t = testo.trim();
  return /^\d{1,3}(\.\d{3})+$|^\d+$/.test(t) ? Number(t.replace(/\./g, '')) : null;
}

/** Che cosa costa davvero l'oggetto nelle offerte visibili: i prezzi in yen, i costi a importo per valuta e i prezzi dei set che lo contengono. */
export interface PrezziDelleOfferte {
  yen: ReadonlySet<number>;
  /** per valuta del costo strutturato: «monete», «punti», «fiori». */
  importi: ReadonlyMap<string, ReadonlySet<number>>;
  /** I prezzi dei set delle televendite (visibili) che contengono l'oggetto. */
  televendite: ReadonlySet<number>;
  /** Un prezzo che la nota storica dichiara discordante nella guida (Homunculus, Dango lunare, Agodashi oden): la copia sbagliata si toglie. */
  discordante?: number;
}

const RIGA_PREZZO_CITATO = /^Prezzo citato nella pagina Oggetti: ([\d.]+) ¥\.$/;
const PARTE_YEN = /^(fino a )?([\d.]+)\s?¥$/;
const PARTE_IMPORTO = /^([\d.]+)(?:-([\d.]+))? (Monete|punti negozio|Fiori)$/i;

/** La valuta di una parte, come chiave del costo strutturato. */
function valuta(nome: string): string {
  const n = nome.toLowerCase();
  return n === 'monete' ? 'monete' : n === 'fiori' ? 'fiori' : 'punti';
}

/**
 * La descrizione senza i prezzi copiati dalle offerte, e quali ha tolto. Toglie:
 *   - la riga «Prezzo citato nella pagina Oggetti: N ¥.» quando N è il prezzo di un'offerta visibile, di un set delle televendite che contiene
 *     l'oggetto, o il prezzo che la nota storica dichiara discordante;
 *   - dentro una parentesi, la parte «N¥» che ripete un'offerta o, dopo «Televendite», «N¥» / «fino a N¥» che ripete il prezzo di un set che
 *     contiene l'oggetto (il più alto, per «fino a»); «N Monete», «N punti negozio», «N-M punti negozio», «N Fiori» che ripetono il costo
 *     strutturato. Una parentesi rimasta vuota sparisce con lo spazio che la precedeva.
 * Tutto il resto resta com'è: uno sconto, un valore di rivendita, un prezzo senza offerta («l'unico punto in cui il dato esiste»).
 */
export function togliPrezziCopiati(descrizione: string, p: PrezziDelleOfferte): { testo: string; tolti: string[] } {
  const tolti: string[] = [];
  const righe: string[] = [];
  for (const riga of descrizione.split('\n')) {
    const citato = RIGA_PREZZO_CITATO.exec(riga.trim());
    if (citato) {
      const n = numeroItaliano(citato[1]!);
      if (n !== null && (p.yen.has(n) || p.televendite.has(n) || p.discordante === n)) { tolti.push(riga.trim()); continue; }
      righe.push(riga); continue;
    }
    righe.push(riga.replace(/(\s*)\(([^()]*)\)/g, (intero: string, spazio: string, dentro: string, posizione: number, tutto: string) => {
      const dopoTelevendite = /Televendite$/i.test(tutto.slice(0, posizione).trimEnd());
      const parti = dentro.split(/[,;]/).map((x) => x.trim());
      const tenute = parti.filter((parte) => {
        const y = PARTE_YEN.exec(parte);
        const imp = PARTE_IMPORTO.exec(parte);
        let copia = false;
        if (y) {
          const n = numeroItaliano(y[2]!);
          copia = n !== null && (dopoTelevendite ? p.televendite.has(n) && (!y[1] || n === Math.max(...p.televendite)) : !y[1] && p.yen.has(n));
        } else if (imp) {
          const costi = p.importi.get(valuta(imp[3]!));
          const numeri = [imp[1], imp[2]].filter((v): v is string => !!v).map(numeroItaliano);
          copia = !!costi && numeri.every((n) => n !== null && costi.has(n)) && (numeri.length === 1 || costi.size === numeri.length);
        }
        if (copia) tolti.push(parte);
        return !copia;
      });
      if (tenute.length === parti.length) return intero;
      if (!tenute.length) return '';
      // il separatore: il punto e virgola solo se la parentesi usava soltanto quello
      const separatore = dentro.includes(';') && !dentro.includes(',') ? '; ' : ', ';
      return `${spazio}(${tenute.join(separatore)})`;
    }));
  }
  return { testo: righe.join('\n').replace(/\n+$/, '').replace(/^\n+/, ''), tolti };
}

/** I prezzi delle offerte visibili di un oggetto del catalogo, per `togliPrezziCopiati`. */
export function prezziDelleOfferte(db: AppDatabase, catalogo: string): Omit<PrezziDelleOfferte, 'discordante'> {
  const yen = new Set<number>(); const importi = new Map<string, Set<number>>(); const televendite = new Set<number>();
  const offerte = db.prepare(`SELECT a.prezzo, a.costo_json FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
    WHERE a.catalogo_chiave = ? AND a.nascosto = 0 AND n.nascosto = 0`).all(catalogo) as Array<{ prezzo: number | null; costo_json: string | null }>;
  for (const o of offerte) {
    if (o.costo_json == null) { if (o.prezzo != null) yen.add(o.prezzo); continue; }
    try {
      const c = JSON.parse(o.costo_json) as { tipo?: unknown; importo?: unknown };
      if (typeof c.tipo === 'string' && typeof c.importo === 'number') { const s = importi.get(c.tipo) ?? new Set<number>(); s.add(c.importo); importi.set(c.tipo, s); }
    } catch { /* un costo illeggibile non è la copia di niente */ }
  }
  if (esisteTabella(db, 'ricompensa_oggetto')) {
    for (const r of db.prepare(`SELECT a.prezzo FROM main.ricompensa_oggetto r JOIN main.articolo a ON a.chiave = r.fonte_chiave
      WHERE r.fonte_tipo = 'articolo' AND r.catalogo_chiave = ? AND a.negozio_chiave = 'home-shopping-tv' AND a.nascosto = 0 AND a.prezzo IS NOT NULL`).all(catalogo) as Array<{ prezzo: number }>) televendite.add(r.prezzo);
  }
  return { yen, importi, televendite };
}
