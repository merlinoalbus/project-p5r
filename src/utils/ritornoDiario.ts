// ============================================================
// ritornoDiario — «Entra» da una voce del diario ed «Esci» dalla scheda del Palazzo (R10-28, R10-28c)
// ============================================================
//
// Il cartellino del Palazzo di una voce porta alla scheda con `&da=<pagina di partenza>&voce=<uid>`. Con questi due parametri la scheda mostra
// «Esci»: torna alla pagina di partenza (Home, Percorso, Partita › Oggi) sulla stessa voce (`#voce-<uid>`) e dice in una notifica a che punto
// è il Palazzo e che cosa è avanzato da quando si è entrati. Nessun riquadro nuovo (decisione del PM del 2026-10-23); la spunta della voce
// resta sulla voce, come sempre. Il confronto usa un'istantanea fatta all'ingresso e tenuta nella sessione del browser.
// ============================================================

import type { DungeonDettaglioDto } from '../types';

/** Pagina di partenza e voce di un «Entra» dal diario. */
export interface RitornoDiario { da: string; voce: string }

/** Aggiunge `da` e `voce` a un indirizzo che porta alla scheda di un Palazzo; gli altri indirizzi restano come sono. */
export function conRitornoDiario(href: string, da: string, voce: string | undefined): string {
  if (!voce || !href.startsWith('/guida/dungeon/')) return href;
  return `${href}${href.includes('?') ? '&' : '?'}da=${encodeURIComponent(da)}&voce=${encodeURIComponent(voce)}`;
}

/** Il ritorno chiesto dall'indirizzo, o null: `da` deve essere una pagina dell'app (comincia con «/», non con «//»). */
export function leggiRitornoDiario(params: URLSearchParams): RitornoDiario | null {
  const da = params.get('da');
  const voce = params.get('voce');
  if (!da || !voce || !da.startsWith('/') || da.startsWith('//')) return null;
  return { da, voce };
}

/** L'indirizzo a cui «Esci» riporta: la pagina di partenza con l'ancora della voce. */
export function indirizzoDiUscita(r: RitornoDiario): string {
  const [percorso] = r.da.split('#');
  return `${percorso}#voce-${r.voce}`;
}

/** Ciò che dice la scheda del Palazzo, in numeri: all'ingresso e all'uscita. */
export interface IstantaneaPalazzo { quando: number; infiltrazioniFatte: number; oggettiFatti: number | null; tesoro: boolean | null; boss: boolean | null }

const SCADENZA_MS = 6 * 60 * 60 * 1000;
const chiaveIstantanea = (partitaId: number, voce: string) => `p5r:entrata:${partitaId}:${voce}`;

/** Fotografa la scheda del Palazzo adesso. */
export function istantaneaPalazzo(d: Pick<DungeonDettaglioDto, 'completamento'>, infiltrazioniFatte: number): IstantaneaPalazzo {
  return { quando: Date.now(), infiltrazioniFatte, oggettiFatti: d.completamento?.fatti ?? null, tesoro: d.completamento?.tesoro ?? null, boss: d.completamento?.boss ?? null };
}

/** Tiene l'istantanea dell'ingresso: solo la prima per voce (un ricaricamento non la rifà), e rifatta se più vecchia di sei ore. */
export function ricordaEntrata(partitaId: number, voce: string, ora: IstantaneaPalazzo): void {
  try {
    const k = chiaveIstantanea(partitaId, voce);
    const prima = leggiEntrata(partitaId, voce);
    if (!prima || Date.now() - prima.quando > SCADENZA_MS) sessionStorage.setItem(k, JSON.stringify(ora));
  } catch { /* nessun deposito di sessione: il riepilogo salta il confronto */ }
}

/** L'istantanea dell'ingresso, o null se manca. */
export function leggiEntrata(partitaId: number, voce: string): IstantaneaPalazzo | null {
  try {
    const grezzo = sessionStorage.getItem(chiaveIstantanea(partitaId, voce));
    return grezzo ? (JSON.parse(grezzo) as IstantaneaPalazzo) : null;
  } catch { return null; }
}

/** Dimentica l'istantanea (all'uscita). */
export function dimenticaEntrata(partitaId: number, voce: string): void {
  try { sessionStorage.removeItem(chiaveIstantanea(partitaId, voce)); } catch { /* niente da dimenticare */ }
}

/** Il riepilogo all'«Esci», su una riga: a che punto è il Palazzo (concluso o che cosa manca; completato o che cosa manca) e che cosa è
 *  avanzato da quando si è entrati. Senza partita (campi null) dice solo il nome. */
export function riepilogoUscita(nome: string, d: Pick<DungeonDettaglioDto, 'completamento' | 'concluso' | 'completato'>, infiltrazioniFatte: number, infiltrazioniTotali: number, entrata: IstantaneaPalazzo | null): string {
  const c = d.completamento;
  const parti: string[] = [];
  if (infiltrazioniTotali > 0) parti.push(`${infiltrazioniFatte} infiltrazioni su ${infiltrazioniTotali}`);
  if (c && c.tesoro !== null && c.boss !== null) {
    if (d.concluso) parti.push('concluso (Tesoro e boss finale)');
    else {
      const mancano = [!c.tesoro ? 'il Tesoro' : null, !c.boss ? 'il boss finale' : null].filter((x): x is string => x !== null);
      parti.push(`non concluso: mancano ${mancano.join(' e ')}`);
    }
    if (d.completato) parti.push('completato');
    else if (c.fatti !== null) parti.push(`completato no: ${c.oggetti - c.fatti} oggetti permanenti su ${c.oggetti} ancora da fare`);
  }
  const avanzato: string[] = [];
  if (entrata) {
    const dInf = infiltrazioniFatte - entrata.infiltrazioniFatte;
    if (dInf > 0) avanzato.push(`${dInf} ${dInf === 1 ? 'infiltrazione completata' : 'infiltrazioni completate'}`);
    if (c && c.fatti !== null && entrata.oggettiFatti !== null && c.fatti > entrata.oggettiFatti) {
      const n = c.fatti - entrata.oggettiFatti;
      avanzato.push(`${n} ${n === 1 ? 'oggetto permanente segnato' : 'oggetti permanenti segnati'}`);
    }
    if (c?.tesoro && entrata.tesoro === false) avanzato.push('Tesoro raccolto');
    if (c?.boss && entrata.boss === false) avanzato.push('boss finale sconfitto');
  }
  return `${nome}: ${parti.length ? parti.join(', ') : 'visita finita'}. ${avanzato.length ? `Da quando sei entrato: ${avanzato.join(', ')}.` : 'Da quando sei entrato non è avanzato niente.'}`;
}
