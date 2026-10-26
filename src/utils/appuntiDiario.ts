// ============================================================
// appuntiDiario — le voci del Diario negli appunti di sistema: scrittura e lettura (2026-10-26)
// ============================================================
//
// Richiesta dell'utente: «però deve usare la clipboard del sistema non dentro l'app... così da poter anche usare windows V per gestire
// eventuali copie precedenti». La cronologia degli appunti di Windows (Win+V) conserva il testo e l'HTML, non i tipi personalizzati
// (`application/x-…`, `web …`): il blocco delle voci viaggia quindi in due forme normali.
//
//   - `text/plain`: le voci in chiaro (giorno, fascia, testo, collegamento, note, che cosa succede spuntando), utili anche incollate altrove;
//   - `text/html`: la stessa lista e il blocco completo (`AppuntiDiario`, JSON in base64url UTF-8) marcato e versionato in due punti, l'attributo
//     `data-p5r-payload` del contenitore `data-p5r-diario` e un commento `P5R-DIARIO-VOCI.<versione>.<base64url>.FINE`: se un browser, leggendo,
//     ripulisce gli attributi, il commento resta (e viceversa). Un blocco grande, oltre la soglia della cronologia di Windows, sta solo
//     nell'attributo, e chi copia viene avvisato se anche così Win+V potrebbe non conservarlo.
//
// Perché non un blocco marcato nel testo: incollato in un altro programma sporcherebbe il testo con una riga illeggibile, e non serve finché
// l'HTML arriva. Se la prova a mano con Win+V mostrasse che l'HTML si perde, `SCRIVI_BLOCCO_NEL_TESTO = true` lo aggiunge in una riga (la
// lettura lo cerca già). Un testo qualsiasi che non contiene il blocco dà `null`: chi incolla lascia il comportamento del browser.
// Funzioni pure, senza stato: la fonte dell'incolla è sempre il contenuto degli appunti, mai una copia tenuta dall'app.
// ============================================================

import { FORMATO_APPUNTI_DIARIO, type AppuntiDiario } from '../../shared/appuntiDiario';
import { dataGiocoTesto } from './dateGioco';

/** Piano B (vedi sopra): il blocco anche nel testo semplice. Spento: il testo resta pulito. */
const SCRIVI_BLOCCO_NEL_TESTO = false;
/** La marca del blocco nel commento HTML (e nel testo, col piano B). */
const MARCA = 'P5R-DIARIO-VOCI';
const RE_ATTRIBUTO = /data-p5r-payload="([A-Za-z0-9_-]+)"/;
const RE_BLOCCO = new RegExp(`${MARCA}\\.(\\d+)\\.([A-Za-z0-9_-]+)\\.FINE`);

/** Testo → base64url dei suoi byte UTF-8 (a pezzi, per non superare gli argomenti di una chiamata). */
export function inBase64Url(testo: string): string {
  const byte = new TextEncoder().encode(testo);
  let binario = '';
  for (let i = 0; i < byte.length; i += 0x8000) binario += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** base64url → testo UTF-8; null se non si decodifica. */
export function daBase64Url(codice: string): string | null {
  try {
    const b64 = codice.replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
  } catch { return null; }
}

/** I caratteri speciali dell'HTML. */
const html = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Le voci del blocco per giorno e fascia, nell'ordine (il blocco è già nell'ordine della giornata). */
function gruppi(a: AppuntiDiario): Array<{ giorno: string; fascia: 'giorno' | 'sera'; voci: AppuntiDiario['voci'] }> {
  const out: Array<{ giorno: string; fascia: 'giorno' | 'sera'; voci: AppuntiDiario['voci'] }> = [];
  for (const v of a.voci) {
    const g = out[out.length - 1];
    if (g && g.giorno === v.origine.giorno && g.fascia === v.origine.fascia) g.voci.push(v);
    else out.push({ giorno: v.origine.giorno, fascia: v.origine.fascia, voci: [v] });
  }
  return out;
}

/** Le frasi di «Spuntando succede» di ogni voce (dal server, `produceTesto` della voce), per il testo leggibile; facoltative. */
export type FrasiDelleVoci = ReadonlyMap<string, readonly string[]>;

/** Il testo leggibile: un titolo, poi per giorno e fascia una riga per voce (testo · collegamento), le note e che cosa succede spuntando. */
export function testoLeggibile(a: AppuntiDiario, frasi?: FrasiDelleVoci): string {
  const righe: string[] = [`Diario P5R · ${a.voci.length === 1 ? '1 voce' : `${a.voci.length} voci`}`];
  for (const g of gruppi(a)) {
    righe.push('', `${dataGiocoTesto(g.giorno)} · ${g.fascia === 'sera' ? 'di sera' : 'di giorno'}`);
    for (const v of g.voci) {
      righe.push(`• ${v.azione}${v.riferimentoTesto ? ` · ${v.riferimentoTesto}` : ''}`);
      if (v.note) righe.push(`  ${v.note}`);
      const f = frasi?.get(v.uid) ?? [];
      if (f.length) righe.push(`  Spuntando: ${f.join('; ')}`);
    }
  }
  return righe.join('\n');
}

/** La lista leggibile in HTML (la stessa del testo), dentro il contenitore marcato; `commento`: il blocco anche nel commento finale. */
function htmlLeggibile(a: AppuntiDiario, frasi: FrasiDelleVoci | undefined, codice: string, commento: boolean): string {
  const parti = gruppi(a).map((g) => `<p><strong>${html(dataGiocoTesto(g.giorno))} · ${g.fascia === 'sera' ? 'di sera' : 'di giorno'}</strong></p><ul>${g.voci.map((v) => {
    const f = frasi?.get(v.uid) ?? [];
    return `<li>${html(v.azione)}${v.riferimentoTesto ? ` · <em>${html(v.riferimentoTesto)}</em>` : ''}${v.note ? `<br>${html(v.note)}` : ''}${f.length ? `<br>Spuntando: ${html(f.join('; '))}` : ''}</li>`;
  }).join('')}</ul>`).join('');
  return `<meta charset="utf-8"><div data-p5r-diario="1" data-versione="${a.versione}" data-p5r-payload="${codice}">${parti}</div>${commento ? `<!--${MARCA}.${a.versione}.${codice}.FINE-->` : ''}`;
}

/**
 * Quanto può pesare un elemento perché la cronologia degli appunti di Windows (Win+V) lo conservi: Microsoft indica 4 MB per elemento;
 * si resta sotto con margine. Si misura come lo tiene Windows: l'HTML in UTF-8, il testo in UTF-16 (due byte a carattere).
 */
export const SOGLIA_CRONOLOGIA_WINDOWS = 3.5 * 1024 * 1024;
const pesoDi = (testo: string, h: string): number => new TextEncoder().encode(h).length + testo.length * 2;

/** Il contenuto da scrivere negli appunti. */
export interface ContenutoAppunti {
  testo: string;
  html: string;
  /** Il peso stimato nella cronologia di Windows (byte). */
  peso: number;
  /** Oltre `SOGLIA_CRONOLOGIA_WINDOWS` anche con il blocco una volta sola: Win+V potrebbe non conservarlo (lo si dice a chi copia). */
  troppoPerLaCronologia: boolean;
}

/**
 * Il contenuto da scrivere negli appunti: testo leggibile e HTML con il blocco marcato. Il blocco sta due volte nell'HTML (attributo e
 * commento) finché il peso resta sotto la soglia della cronologia di Windows; oltre, una volta sola, nell'attributo (`data-*` resta anche
 * negli HTML ripuliti, il commento no), per restare nella cronologia il più possibile (rilievo del revisore, 2026-10-26).
 */
export function scriviAppunti(a: AppuntiDiario, frasi?: FrasiDelleVoci, opz: { bloccoNelTesto?: boolean } = {}): ContenutoAppunti {
  const codice = inBase64Url(JSON.stringify(a));
  const leggibile = testoLeggibile(a, frasi);
  const testo = SCRIVI_BLOCCO_NEL_TESTO || opz.bloccoNelTesto ? `${leggibile}\n\n[${MARCA}.${a.versione}.${codice}.FINE]` : leggibile;
  let h = htmlLeggibile(a, frasi, codice, true);
  let peso = pesoDi(testo, h);
  if (peso > SOGLIA_CRONOLOGIA_WINDOWS) { h = htmlLeggibile(a, frasi, codice, false); peso = pesoDi(testo, h); }
  return { testo, html: h, peso, troppoPerLaCronologia: peso > SOGLIA_CRONOLOGIA_WINDOWS };
}

/** Il blocco riconosciuto in un codice base64url: un oggetto con il nostro formato e un elenco di voci, altrimenti null. */
function riconosci(codice: string | undefined): AppuntiDiario | null {
  if (!codice) return null;
  const testo = daBase64Url(codice);
  if (testo === null) return null;
  try {
    const a = JSON.parse(testo) as Partial<AppuntiDiario> | null;
    return a && typeof a === 'object' && a.formato === FORMATO_APPUNTI_DIARIO && Array.isArray(a.voci) && a.voci.length > 0 ? (a as AppuntiDiario) : null;
  } catch { return null; }
}

/** Il blocco delle voci letto dagli appunti (prima l'HTML, attributo poi commento; poi il testo), o null se non ci sono voci del Diario.
 *  La versione non si scarta qui: il server dice che cosa fare con un blocco di un'altra versione. */
export function leggiAppunti(contenuto: { testo?: string | null; html?: string | null }): AppuntiDiario | null {
  const h = contenuto.html ?? '', t = contenuto.testo ?? '';
  return riconosci(RE_ATTRIBUTO.exec(h)?.[1]) ?? riconosci(RE_BLOCCO.exec(h)?.[2]) ?? riconosci(RE_BLOCCO.exec(t)?.[2]);
}

/** Il blocco come taglio: stesso contenuto, modo «taglia» e un'identità nuova (lo stesso taglio incollato due volte non sposta più). */
export function comeTaglio(a: AppuntiDiario): AppuntiDiario {
  const byte = crypto.getRandomValues(new Uint8Array(16));
  return { ...a, modo: 'taglia', taglio: [...byte].map((b) => b.toString(16).padStart(2, '0')).join('') };
}
