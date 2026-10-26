import { eDote, nomeDote, type DoteChiave } from './doti.js';
import { EVENTI_STORIA, dataLeggibile } from './condizioniSpillo.js';
import { ATTIVITA_PESCA, REGOLA_PESCA, type EffettoPescaVoce } from './pesca.js';

export type CategoriaLetturaVoce = 'libro' | 'film' | 'videogioco';
export interface DoteNoteVoce { dote: DoteChiave; note: 1 | 2 | 3 }
/**
 * L13 (ondata 2): `possibili` = i valori che il gioco può dare (la fabbricazione: Perizia ♪♪ o ♪♪♪): alla spunta si sceglie quale,
 * `note` è il valore proposto. `esito` del turno = l'esito atteso fra quelli dichiarati dall'attività (`attivita.esiti_json`), proposto
 * alla spunta; senza, chi gioca lo sceglie (o l'attività lo ricava da sola, nel modo automatico). Un turno con esito non ha Doti proprie.
 */
export type EffettoLegacyVoce =
  | { tipo: 'dote'; dote: DoteChiave; note: 1 | 2 | 3; possibili?: Array<1 | 2 | 3> }
  | { tipo: 'lettura'; categoria: CategoriaLetturaVoce; chiave: string; almeno: number | null }
  | { tipo: 'turno'; attivita: string; doti?: DoteNoteVoce[]; esito?: string };
/** L'acquisto non porta più la Fortuna (R10-10/2): è lo stato della partita, letto quando si registra il consumo. */
export type EffettoVoce = EffettoLegacyVoce | EffettoPescaVoce | {
  tipo: 'acquisto'; articolo: string; variante: DoteChiave | null; sostituisceDoti: string[];
} | EffettoFortunaVoce | EffettoDiStatoVoce | EffettoYenVoce;
/**
 * L13 (ondata 3, decisione 1): gli yen che la voce dà o toglie (`importo` con il segno: positivo = ricevuti, negativo = spesi). Decisione 18:
 * la spunta li muove da sola sul saldo della partita, mai sotto zero, con il movimento registrato (`utente.yen_automatico`); togliendo la
 * spunta tornano com'erano (solo quanto era stato davvero mosso). Le proposte «Applica» nate prima (`utente.da_applicare` di tipo `yen`, con
 * `utente.movimento_yen`) restano decidibili. Decisione 2: mai insieme a un dato che porta già il suo prezzo (articolo, consumazione, pesca,
 * Richiesta completata): il server rifiuta la lista.
 */
export interface EffettoYenVoce { tipo: 'yen'; importo: number }
/** Il tetto degli yen di un effetto (lo stesso del denaro del gruppo, `bodyYen`). */
export const YEN_MASSIMI_EFFETTO = 9_999_999;
/** Quante copie di un oggetto o di un articolo dà un effetto, al massimo (decisione 6: facoltativa, 1 se non indicata). */
export const QUANTITA_MASSIMA_EFFETTO = 999;
/** L13 (decisione 17): che cosa sblocca l'effetto «sblocco»: una Richiesta dei Mementos o un'attività (un lavoro dopo la candidatura). */
export type BersaglioSblocco = 'richiesta' | 'attivita';
export const BERSAGLI_SBLOCCO: ReadonlyArray<{ chiave: BersaglioSblocco; nome: string }> = [
  { chiave: 'richiesta', nome: 'Richiesta dei Mementos' }, { chiave: 'attivita', nome: 'Attività o lavoro' },
];
/**
 * R10-01: gli effetti che segnano uno stato della partita citando il loro oggetto per chiave: un evento di storia, una domanda in
 * classe (o un esame), un cruciverba, una Richiesta completata. La spunta li segna, togliere la spunta riporta lo stato di prima.
 */
export type EffettoDiStatoVoce =
  | { tipo: 'storia'; evento: string }
  | { tipo: 'domanda'; domanda: number }
  | { tipo: 'cruciverba'; data: string }
  | { tipo: 'richiesta'; richiesta: string }
  /** Un articolo di un negozio segnato come comprato (qualunque offerta tranne l'Aojiru, che ha i suoi consumi). L13 (decisione 6): `quantita`
   *  facoltativa (assente = 1), quante copie si comprano insieme: il riepilogo della voce somma copie e prezzo; l'articolo resta «comprato». */
  | { tipo: 'articolo'; articolo: string; quantita?: number }
  /** L'invito di un Confidente avvenuto (R10-11i): `invito` è la chiave di `confidente_invito` («makoto/07-30»); si registra solo con le condizioni vere. */
  | { tipo: 'invito'; invito: string }
  /** Una Persona registrata nel compendio della partita (R10-11/3, voci della Stanza di Velluto): `persona` è l'id della Persona; la spunta la registra con `registraPersona`. */
  | { tipo: 'persona'; persona: number }
  /** L13 (decisione 1): un oggetto del catalogo ricevuto (`catalogo_oggetto.chiave`), `quantita` copie: va nel registro degli oggetti ottenuti
   *  della partita (`utente.oggetto_ottenuto_partita`), una riga per effetto spuntato; togliere la spunta la toglie. */
  | { tipo: 'oggetto'; oggetto: string; quantita: number }
  /** L13 (decisione 1): un trofeo ottenuto (`trofeo.chiave`), con lo stesso setter della pagina dei trofei (`impostaTrofeo`). */
  | { tipo: 'trofeo'; trofeo: string }
  /** L13 (decisioni 1 e 17): lo sblocco di una Richiesta o di un'attività (`utente.sblocco_partita`): la condizione «sblocco ricevuto» lo legge. */
  | { tipo: 'sblocco'; bersaglio: BersaglioSblocco; chiave: string };
export const eEffettoDiStato = (e: { tipo: string }): e is EffettoDiStatoVoce => e.tipo === 'persona' || e.tipo === 'storia' || e.tipo === 'domanda' || e.tipo === 'cruciverba' || e.tipo === 'richiesta' || e.tipo === 'articolo' || e.tipo === 'invito' || e.tipo === 'oggetto' || e.tipo === 'trofeo' || e.tipo === 'sblocco';
/** La chiave con cui un effetto «sblocco» si registra e la condizione lo cerca: «richiesta:chiave», «attivita:chiave». */
export const chiaveSblocco = (bersaglio: BersaglioSblocco, chiave: string): string => `${bersaglio}:${chiave}`;
/** La lettura della buona sorte di Chihaya: spuntando la voce si accende la Fortuna sulla Dote scelta, per il resto del giorno (R10-10/2). */
export interface EffettoFortunaVoce { tipo: 'fortuna'; dote: DoteChiave }
export interface EffettoVoceDto { uid: string; ordine: number; effetto: EffettoVoce; origine: 'seed' | 'regola' | 'utente' }
export interface StatoEffettiVoceDto {
  voceUid: string; stato: 'convertita' | 'legacy-da-correggere'; effetti: EffettoVoceDto[];
  rawLegacy: string; motivo: string | null; revisione: string;
}
export interface RichiestaSalvaEffettiVoce {
  revisioneEffettiAttesa: string;
  effetti: Array<{ uid: string | null; effetto: EffettoVoce }>;
}
export interface ReceiptEffettoVoceDto {
  id: string; partitaId: number; voceUid: string; effettoUid: string; ordine: number;
  formato: 1; tipo: EffettoVoce['tipo'] | 'contesto'; chiave: string | null;
  prima: unknown; ricevuta: Record<string, unknown>; creato: boolean; applicatoIl: string; annullatoIl: string | null; sostituitaDa: string | null; assorbitaDa: string | null;
}
export interface PropostaEffettoVoceDto {
  id: string; voceUid: string; giorno: string; fascia: 'giorno' | 'sera'; testo: string;
  effetto: EffettoVoce; motivo: string; certezza: 'certa' | 'probabile' | 'da-verificare';
  stato: 'aperta' | 'confermata' | 'scartata'; revisione: string;
}
export interface RichiestaAnteprimaDecisioneEffettoVoce {
  operazioneId: string; decisione: 'conferma' | 'scarta'; effetto?: EffettoVoce;
}
export interface RichiestaDecisioneEffettoVoce extends RichiestaAnteprimaDecisioneEffettoVoce { revisionePropostaAttesa: string }
export interface AnteprimaDecisioneEffettoVoceDto {
  richiesta: RichiestaAnteprimaDecisioneEffettoVoce; proposta: PropostaEffettoVoceDto;
  effetti: StatoEffettiVoceDto; partiteGiaSpuntate: number; revisionePropostaAttesa: string;
}

const oggetto = (x: unknown): Record<string, unknown> | null => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : null;
const nota = (x: unknown): x is 1 | 2 | 3 => x === 1 || x === 2 || x === 3;
/** I valori possibili di una Dote: almeno due note distinte (1–3), fra cui quella proposta, in ordine; altrimenti null. */
export function notePossibili(x: unknown, proposta: 1 | 2 | 3): Array<1 | 2 | 3> | null {
  if (!Array.isArray(x) || x.length < 2 || !x.every(nota) || new Set(x).size !== x.length || !x.includes(proposta)) return null;
  return [...x].sort((a, b) => a - b);
}
export function normalizzaEffettoVoce(x: unknown): EffettoVoce | null {
  const o = oggetto(x); if (!o) return null;
  const campi: Record<string, readonly string[]> = { persona: ['tipo','persona'], dote: ['tipo','dote','note','possibili'], lettura: ['tipo','categoria','chiave','almeno'], turno: ['tipo','attivita','doti','esito'], acquisto: ['tipo','articolo','variante','fortuna','sostituisceDoti'], pesca: ['tipo','regola','attivita','sostituisceTurni','sostituisceDoti'], fortuna: ['tipo','dote'], storia: ['tipo','evento'], domanda: ['tipo','domanda'], cruciverba: ['tipo','data'], richiesta: ['tipo','richiesta'], articolo: ['tipo','articolo','quantita'], invito: ['tipo','invito'], yen: ['tipo','importo'], oggetto: ['tipo','oggetto','quantita'], trofeo: ['tipo','trofeo'], sblocco: ['tipo','bersaglio','chiave'] };
  const chiaveOk = (v: unknown, n = 119): v is string => typeof v === 'string' && new RegExp(`^[a-z0-9][a-z0-9._:/-]{0,${n}}$`, 'i').test(v.trim());
  const quantita = (v: unknown): number | null => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= QUANTITA_MASSIMA_EFFETTO ? v as number : null;
  if (typeof o.tipo!=='string'||!Object.hasOwn(campi,o.tipo)||Object.keys(o).some((k) => !campi[o.tipo as string]!.includes(k))) return null;
  if (o.tipo === 'dote') {
    if (!eDote(o.dote) || !nota(o.note)) return null;
    if (o.possibili === undefined) return { tipo: 'dote', dote: o.dote, note: o.note };
    const possibili = notePossibili(o.possibili, o.note);
    return possibili ? { tipo: 'dote', dote: o.dote, note: o.note, possibili } : null;
  }
  if (o.tipo === 'fortuna') return eDote(o.dote) ? { tipo: 'fortuna', dote: o.dote } : null;
  if (o.tipo === 'storia') return typeof o.evento === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,79}$/i.test(o.evento.trim()) ? { tipo: 'storia', evento: o.evento.trim() } : null;
  if (o.tipo === 'persona') return Number.isSafeInteger(o.persona) && (o.persona as number) >= 1 ? { tipo: 'persona', persona: o.persona as number } : null;
  if (o.tipo === 'domanda') return Number.isSafeInteger(o.domanda) && (o.domanda as number) >= 1 ? { tipo: 'domanda', domanda: o.domanda as number } : null;
  if (o.tipo === 'cruciverba') return typeof o.data === 'string' && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(o.data) ? { tipo: 'cruciverba', data: o.data } : null;
  if (o.tipo === 'invito') return typeof o.invito === 'string' && /^[a-z0-9-]+\/(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(o.invito.trim()) ? { tipo: 'invito', invito: o.invito.trim() } : null;
  if (o.tipo === 'articolo') {
    if (typeof o.articolo !== 'string' || !/^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(o.articolo.trim())) return null;
    // la quantità 1 è quella sottintesa: non si scrive (una sola forma canonica per lo stesso effetto)
    if (o.quantita === undefined || o.quantita === 1) return { tipo: 'articolo', articolo: o.articolo.trim() };
    const q = quantita(o.quantita);
    return q ? { tipo: 'articolo', articolo: o.articolo.trim(), quantita: q } : null;
  }
  if (o.tipo === 'yen') return Number.isSafeInteger(o.importo) && o.importo !== 0 && Math.abs(o.importo as number) <= YEN_MASSIMI_EFFETTO ? { tipo: 'yen', importo: o.importo as number } : null;
  if (o.tipo === 'oggetto') { const q = quantita(o.quantita); return chiaveOk(o.oggetto, 199) && q ? { tipo: 'oggetto', oggetto: o.oggetto.trim(), quantita: q } : null; }
  if (o.tipo === 'trofeo') return chiaveOk(o.trofeo) ? { tipo: 'trofeo', trofeo: o.trofeo.trim() } : null;
  if (o.tipo === 'sblocco') return (o.bersaglio === 'richiesta' || o.bersaglio === 'attivita') && chiaveOk(o.chiave) ? { tipo: 'sblocco', bersaglio: o.bersaglio, chiave: o.chiave.trim() } : null;
  if (o.tipo === 'richiesta') return typeof o.richiesta === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,79}$/i.test(o.richiesta.trim()) ? { tipo: 'richiesta', richiesta: o.richiesta.trim() } : null;
  if (o.tipo === 'pesca') {
    const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x)) && new Set(v).size === v.length;
    if (o.regola !== REGOLA_PESCA || o.attivita !== ATTIVITA_PESCA || !ids(o.sostituisceTurni) || !ids(o.sostituisceDoti)
      || o.sostituisceTurni.some(x => (o.sostituisceDoti as string[]).includes(x))) return null;
    return { tipo: 'pesca', regola: REGOLA_PESCA, attivita: ATTIVITA_PESCA, sostituisceTurni: [...o.sostituisceTurni].sort(), sostituisceDoti: [...o.sostituisceDoti].sort() };
  }
  if (o.tipo === 'lettura') {
    if (typeof o.categoria!=='string'||!['libro', 'film', 'videogioco'].includes(o.categoria) || typeof o.chiave !== 'string' || !o.chiave.trim()) return null;
    const almeno = o.almeno == null ? null : Number.isSafeInteger(o.almeno) && (o.almeno as number) >= 1 ? o.almeno as number : undefined;
    return almeno === undefined ? null : { tipo: 'lettura', categoria: o.categoria as CategoriaLetturaVoce, chiave: o.chiave.trim(), almeno };
  }
  if (o.tipo === 'turno') {
    if (typeof o.attivita !== 'string' || !o.attivita.trim()) return null;
    if (o.esito !== undefined) {
      // l'esito porta le sue Doti: un turno con esito non dichiara anche Doti proprie (due fonti dello stesso dato)
      if (o.doti != null || typeof o.esito !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(o.esito)) return null;
      return { tipo: 'turno', attivita: o.attivita.trim(), esito: o.esito };
    }
    if (o.doti == null) return { tipo: 'turno', attivita: o.attivita.trim() };
    if (!Array.isArray(o.doti) || !o.doti.length) return null;
    const doti: DoteNoteVoce[] = [];
    for (const d of o.doti) { const v = oggetto(d); if (!v || Object.keys(v).some((k) => k !== 'dote' && k !== 'note') || !eDote(v.dote) || !nota(v.note)) return null; doti.push({ dote: v.dote, note: v.note }); }
    return { tipo: 'turno', attivita: o.attivita.trim(), doti };
  }
  if (o.tipo === 'acquisto') {
    // `fortuna` resta una chiave tollerata (righe e ricevute di prima la portano) ma non fa più parte dell'effetto: si scarta
    if (typeof o.articolo !== 'string' || !o.articolo.trim() || !(o.variante === null || eDote(o.variante)) || !(o.fortuna === undefined || o.fortuna === null || typeof o.fortuna === 'boolean')) return null;
    if (!Array.isArray(o.sostituisceDoti) || o.sostituisceDoti.some((s) => typeof s !== 'string' || !/^[0-9a-f]{32}$/.test(s)) || new Set(o.sostituisceDoti).size !== o.sostituisceDoti.length) return null;
    return { tipo: 'acquisto', articolo: o.articolo.trim(), variante: o.variante, sostituisceDoti: [...o.sostituisceDoti as string[]].sort() };
  }
  return null;
}
/** null distingue un documento non convertibile da una lista valida vuota. */
export function normalizzaEffettiVoce(x: unknown): EffettoVoce[] | null {
  if (!Array.isArray(x)) return null;
  const out = x.map(normalizzaEffettoVoce);
  return out.some((e) => e === null) ? null : out as EffettoVoce[];
}
/**
 * I nomi con cui scrivere la frase di un effetto che cita il suo oggetto per chiave o per id (R12-01/1: «mai chiavi, sempre nomi»).
 * Sono funzioni di ricerca e non elenchi: il server cerca la riga che serve, la pagina legge le mappe già servite dall'API. Chi non
 * trova il nome restituisce `undefined`, e la frase resta generica («Domanda risposta»): una chiave grezza non compare mai.
 */
export interface NomiFraseEffetto {
  domanda: (id: number) => string | undefined;
  richiesta: (chiave: string) => string | undefined;
  articolo: (chiave: string) => { nome: string; prezzo: number | null } | undefined;
  invito: (chiave: string) => { confidenteNome: string; data: string | null } | undefined;
  persona: (id: number) => string | undefined;
  /** L13: oggetti del catalogo, trofei, Richieste e attività da sbloccare (facoltativi: senza, la frase resta generica). */
  oggetto?: (chiave: string) => string | undefined;
  trofeo?: (chiave: string) => string | undefined;
  attivita?: (chiave: string) => string | undefined;
}

/** Gli effetti la cui frase passa da `fraseEffettoConNomi`: quelli che citano il loro oggetto per chiave, più pesca, Fortuna e yen. */
export type EffettoConNomiVoce = EffettoDiStatoVoce | EffettoFortunaVoce | EffettoPescaVoce | EffettoYenVoce;
export const eEffettoConNomi = (e: { tipo: string }): e is EffettoConNomiVoce => eEffettoDiStato(e) || e.tipo === 'pesca' || e.tipo === 'fortuna' || e.tipo === 'yen';
/**
 * Un importo in yen come lo scrive la guida italiana: «¥1.680», «¥12.800». In `it-IT` i numeri di quattro cifre restano senza separatore
 * («1680»: raggruppamento minimo di due cifre), e la stessa voce mostrava «¥1680» accanto a «¥12.800» (rilievo della revisione UX, L13):
 * il separatore si chiede sempre. Uno solo per frasi, riepilogo «Il gioco dà», editor degli acquisti e scelta del set alla spunta.
 */
export const formatoYen = (n: number): string => `¥${Math.abs(n).toLocaleString('it-IT', { useGrouping: 'always' })}`;
const yen = formatoYen;
/** «×3» solo se le copie sono più d'una. */
const copie = (q: number | undefined): string => (q && q > 1 ? ` ×${q}` : '');
/** I dati che possono portare già i loro yen (decisione 2): il film (prezzo), l'attività o il lavoro (costo o paga), la Richiesta (ricompensa). */
export type DatoConYen = 'film' | 'attivita' | 'richiesta';
/** Il contesto della voce per la decisione 2: il suo collegamento e gli yen che ogni dato porta già (0, null o assente = nessuno). */
export interface ContestoYenVoce {
  riferimento: { tipo: string; chiave: string } | null;
  yenDi: (tipo: DatoConYen, chiave: string) => number | null | undefined;
}
const NOME_DATO_CON_YEN: Record<DatoConYen, string> = { film: 'il film (il prezzo del biglietto)', attivita: 'l’attività o il lavoro (il costo, la paga o il prezzo della sfida)', richiesta: 'la Richiesta (la sua ricompensa in yen)' };
/**
 * L13 (decisione 2 dell'utente: «Yen già scritti in un altro dato, film, attività, lavori, pesca, Richiesta: li muove l'elemento collegato, mai
 * la voce»): perché un effetto «yen» non può stare in questa voce, o null se può. Gli yen li porta già: un acquisto o un articolo comprato (il
 * prezzo), la pesca (la quota), una Richiesta completata (la ricompensa, decisione 3), il turno di un'attività con costo o paga, la lettura di un
 * film con il prezzo, o il dato a cui la voce è collegata (film, attività, Richiesta) se ha i suoi yen. Una regola sola: la usano il server
 * (rifiuto 409 `yen-gia-strutturati`) e l'editor della voce (avviso subito, prima del salvataggio).
 */
export function motivoYenGiaStrutturati(effetti: readonly EffettoVoce[], c: ContestoYenVoce): string | null {
  if (!effetti.some((e) => e.tipo === 'yen')) return null;
  const conYen = (tipo: DatoConYen, chiave: string): boolean => { const n = c.yenDi(tipo, chiave); return typeof n === 'number' && n > 0; };
  let chi: string | null = null;
  for (const e of effetti) {
    if (e.tipo === 'acquisto' || e.tipo === 'articolo') chi = 'l’effetto «acquisto» (il prezzo dell’articolo)';
    else if (e.tipo === 'pesca') chi = 'l’effetto «pesca» (la quota della visita)';
    else if (e.tipo === 'richiesta') chi = 'l’effetto «Richiesta completata» (la ricompensa della Richiesta)';
    else if (e.tipo === 'turno' && conYen('attivita', e.attivita)) chi = `il turno: ${NOME_DATO_CON_YEN.attivita}`;
    else if (e.tipo === 'lettura' && e.categoria === 'film' && conYen('film', e.chiave)) chi = `la visione: ${NOME_DATO_CON_YEN.film}`;
    if (chi) break;
  }
  const r = c.riferimento;
  if (!chi && r && (r.tipo === 'film' || r.tipo === 'attivita' || r.tipo === 'richiesta') && conYen(r.tipo, r.chiave)) chi = `il collegamento della voce: ${NOME_DATO_CON_YEN[r.tipo]}`;
  return chi ? `Gli yen di questa voce li porta già ${chi}: togli l’effetto Yen, non si contano due volte.` : null;
}

/**
 * L13 (ondata 4a, richiesta dell'utente): TUTTI gli articoli comprati della voce con le copie e il totale, «Arginade ×2 · Acqua della
 * rinascita ×1 · ¥900». Lo stesso articolo in più effetti si conta una volta sola, con le copie sommate, al posto del primo; un articolo
 * senza prezzo resta nell'elenco e il totale lo dice («2 senza prezzo»); se NESSUN articolo ha il prezzo il totale si omette. null se la voce non compra articoli.
 */
export function riepilogoArticoli(effetti: readonly EffettoVoce[], articolo: (chiave: string) => { nome: string; prezzo: number | null } | null | undefined): string | null {
  const c = contoArticoli(effetti, articolo);
  if (!c) return null;
  const righe = c.righe.map((r) => `${r.nome} ×${r.copie}`);
  // nessun articolo con il prezzo: il totale sarebbe «¥0», un dato falso; si elencano solo gli articoli
  if (c.totale === null) return righe.join(' · ');
  return `${righe.join(' · ')} · ${yen(c.totale)}${c.senzaPrezzo ? ` (${c.senzaPrezzo} senza prezzo)` : ''}`;
}

/** Un articolo del conto della voce: le copie sommate e il prezzo di tutte le copie (null senza prezzo). */
export interface RigaContoArticoli { chiave: string; nome: string; copie: number; prezzoUnitario: number | null; prezzo: number | null }
/**
 * Il conto degli articoli comprati della voce, come dato e non come frase (richiesta dell'utente del 2026-10-25: «formattarlo in modo
 * adeguato, per tutti gli acquisti»): una riga per articolo (stesso articolo in più effetti = una riga, copie sommate, al posto del primo),
 * il totale in yen (null se nessun articolo ha il prezzo: «¥0» sarebbe falso) e quante copie non hanno prezzo. null senza articoli.
 * È l'unico conto: lo usano la frase `riepilogoArticoli`, il riepilogo per gruppi della voce e il modulo della voce.
 */
export function contoArticoli(effetti: readonly EffettoVoce[], articolo: (chiave: string) => { nome: string; prezzo: number | null } | null | undefined, escludi?: ReadonlySet<string>): { righe: RigaContoArticoli[]; totale: number | null; senzaPrezzo: number } | null {
  // `escludi` (L13, decisione 4): gli articoli in alternativa fra loro (Set A o Set B): uno solo, o nessuno, si compra alla spunta, quindi non
  // entrano nel conto «tutto insieme»; il riepilogo li mostra a parte («Uno a scelta»)
  const copie = new Map<string, number>();
  for (const e of effetti) if (e.tipo === 'articolo' && !escludi?.has(e.articolo)) copie.set(e.articolo, (copie.get(e.articolo) ?? 0) + (e.quantita ?? 1));
  if (copie.size === 0) return null;
  let totale = 0, senzaPrezzo = 0, conPrezzo = 0;
  const righe = [...copie].map(([chiave, q]): RigaContoArticoli => {
    const a = articolo(chiave);
    const unitario = typeof a?.prezzo === 'number' ? a.prezzo : null;
    if (unitario !== null) { totale += unitario * q; conPrezzo += q; } else senzaPrezzo += q;
    return { chiave, nome: a?.nome ?? 'Articolo', copie: q, prezzoUnitario: unitario, prezzo: unitario === null ? null : unitario * q };
  });
  return { righe, totale: conPrezzo === 0 ? null : totale, senzaPrezzo };
}

/**
 * L13 (decisione 4): la regola degli articoli in alternativa, scritta in un modo solo (rilievo L3 della revisione UX: era «Uno a scelta»,
 * «Alla spunta ne scegli uno, o nessuno» e «Uno solo, o nessuno»). La usano il titolo del riepilogo «Il gioco dà», il riquadro dell'editor,
 * la nota del campo «Articolo» e la scelta alla spunta.
 */
export const REGOLA_ALTERNATIVE = 'Uno a scelta, o nessuno';

/**
 * L13 (decisione 4 dell'utente: «Televendite: due articoli distinti per Set A e Set B, ciascuno con prezzo e contenuto propri»): gli articoli
 * di una voce che sono alternative fra loro. Due articoli sono alternativi se uno dei due dichiara nel catalogo «non insieme all'altro»
 * (`articoliIncompatibili` delle sue condizioni: basta da una parte); un gruppo è l'insieme degli articoli della voce legati così, anche a catena
 * (A–B, B–C). Solo i gruppi di almeno due articoli PRESENTI nella voce: un articolo la cui alternativa non è nella voce si compra come gli altri.
 * Nella voce non si dichiara niente: lo dice il catalogo. Alla spunta se ne sceglie uno, o nessuno. Gruppi e membri nell'ordine della voce.
 */
export function gruppiAlternativi(chiavi: readonly string[], incompatibili: (chiave: string) => readonly string[] | undefined): string[][] {
  const presenti = [...new Set(chiavi)];
  const dentro = new Set(presenti);
  const vicini = new Map<string, Set<string>>(presenti.map((k) => [k, new Set<string>()]));
  for (const k of presenti) for (const altro of incompatibili(k) ?? []) {
    if (altro === k || !dentro.has(altro)) continue;
    vicini.get(k)!.add(altro);
    vicini.get(altro)!.add(k);
  }
  const visto = new Set<string>();
  const gruppi: string[][] = [];
  for (const k of presenti) {
    if (visto.has(k) || vicini.get(k)!.size === 0) continue;
    const membri = new Set<string>([k]);
    const coda = [k];
    while (coda.length) for (const v of vicini.get(coda.shift()!)!) if (!membri.has(v)) { membri.add(v); coda.push(v); }
    for (const m of membri) visto.add(m);
    gruppi.push(presenti.filter((x) => membri.has(x)));
  }
  return gruppi;
}

/**
 * L13 (ondata 4a): lo stesso articolo in più effetti diventa UN effetto con le copie sommate (al massimo `QUANTITA_MASSIMA_EFFETTO`), al
 * posto del primo (la sua identità resta; gli altri escono dalla lista). Una sola regola: la usano l'elenco degli acquisti della pagina
 * (scegliere un articolo già presente) e il salvataggio degli effetti del server (che normalizza anche le liste che arrivano già doppie).
 * Gli effetti che non sono articoli restano dove sono; la lista senza doppioni si restituisce com'è (stessi oggetti).
 */
export function fondiArticoliUguali<T extends { effetto: EffettoVoce }>(lista: readonly T[]): T[] {
  const primo = new Map<string, number>();
  const fuori = new Set<number>();
  const risultato: T[] = [...lista];
  lista.forEach((r, i) => {
    const e = r.effetto;
    if (e.tipo !== 'articolo') return;
    const gia = primo.get(e.articolo);
    if (gia === undefined) { primo.set(e.articolo, i); return; }
    const base = risultato[gia]!.effetto as Extract<EffettoVoce, { tipo: 'articolo' }>;
    const somma = Math.min(QUANTITA_MASSIMA_EFFETTO, (base.quantita ?? 1) + (e.quantita ?? 1));
    risultato[gia] = { ...risultato[gia]!, effetto: somma > 1 ? { tipo: 'articolo', articolo: base.articolo, quantita: somma } : { tipo: 'articolo', articolo: base.articolo } };
    fuori.add(i);
  });
  return fuori.size === 0 ? risultato : risultato.filter((_, i) => !fuori.has(i));
}

const breve = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/**
 * La frase che dice all'utente che cosa succede spuntando, per gli effetti che citano l'oggetto per chiave (storia, domanda,
 * cruciverba, Richiesta, articolo, invito, Persona) e per pesca e Fortuna. È l'UNICA scrittura di queste frasi: la usano il server
 * (il «Il gioco dà» del Diario) e la pagina (editor della voce), ognuno con i propri nomi.
 */
export function fraseEffettoConNomi(e: EffettoConNomiVoce, n: NomiFraseEffetto): string {
  switch (e.tipo) {
    case 'pesca': return 'Sessione di pesca a Ichigaya osservata';
    case 'fortuna': return `Fortuna di Chihaya su ${nomeDote(e.dote)} per il resto del giorno`;
    case 'storia': return `Evento di storia: ${EVENTI_STORIA.find((s) => s.chiave === e.evento)?.nome ?? e.evento}`;
    case 'domanda': { const d = n.domanda(e.domanda); return d ? `Domanda risposta: ${breve(d)}` : 'Domanda risposta'; }
    case 'cruciverba': return `Cruciverba del ${dataLeggibile(e.data)} risolto`;
    case 'richiesta': return `Richiesta «${n.richiesta(e.richiesta) ?? 'Richiesta'}» completata`;
    case 'articolo': { const a = n.articolo(e.articolo), q = e.quantita ?? 1; return a ? `Articolo comprato: ${a.nome}${copie(q)}${a.prezzo !== null ? ` · ${yen(a.prezzo * q)}${q > 1 ? ` (${yen(a.prezzo)} l’uno)` : ''}` : ''}` : `Articolo comprato${copie(q)}`; }
    case 'yen': return e.importo > 0 ? `Yen ricevuti: ${yen(e.importo)} (da applicare con «Applica» sulla voce)` : `Yen spesi: ${yen(e.importo)} (da applicare con «Applica» sulla voce)`;
    case 'oggetto': { const o = n.oggetto?.(e.oggetto); return `Oggetto ricevuto: ${o ?? 'oggetto del catalogo'}${copie(e.quantita)}`; }
    case 'trofeo': { const t = n.trofeo?.(e.trofeo); return t ? `Trofeo ottenuto: ${t}` : 'Trofeo ottenuto'; }
    case 'sblocco': {
      const nome = e.bersaglio === 'richiesta' ? n.richiesta(e.chiave) : n.attivita?.(e.chiave);
      return e.bersaglio === 'richiesta' ? `Sblocca la Richiesta «${nome ?? 'Richiesta'}»` : `Sblocca l’attività «${nome ?? 'attività'}»`;
    }
    case 'invito': { const i = n.invito(e.invito); return i ? `Invito di ${i.confidenteNome}${i.data ? ` del ${dataLeggibile(i.data)}` : ''} avvenuto: i punti dell'incontro valgono ×1,2` : 'Invito avvenuto'; }
    case 'persona': { const p = n.persona(e.persona); return p ? `Persona registrata nel compendio: ${p}` : 'Persona registrata nel compendio'; }
  }
}
