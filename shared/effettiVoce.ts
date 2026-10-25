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
} | EffettoFortunaVoce | EffettoDiStatoVoce;
/**
 * R10-01: gli effetti che segnano uno stato della partita citando il loro oggetto per chiave: un evento di storia, una domanda in
 * classe (o un esame), un cruciverba, una Richiesta completata. La spunta li segna, togliere la spunta riporta lo stato di prima.
 */
export type EffettoDiStatoVoce =
  | { tipo: 'storia'; evento: string }
  | { tipo: 'domanda'; domanda: number }
  | { tipo: 'cruciverba'; data: string }
  | { tipo: 'richiesta'; richiesta: string }
  /** Un articolo di un negozio segnato come comprato (qualunque offerta tranne l'Aojiru, che ha i suoi consumi). */
  | { tipo: 'articolo'; articolo: string }
  /** L'invito di un Confidente avvenuto (R10-11i): `invito` è la chiave di `confidente_invito` («makoto/07-30»); si registra solo con le condizioni vere. */
  | { tipo: 'invito'; invito: string }
  /** Una Persona registrata nel compendio della partita (R10-11/3, voci della Stanza di Velluto): `persona` è l'id della Persona; la spunta la registra con `registraPersona`. */
  | { tipo: 'persona'; persona: number };
export const eEffettoDiStato = (e: { tipo: string }): e is EffettoDiStatoVoce => e.tipo === 'persona' || e.tipo === 'storia' || e.tipo === 'domanda' || e.tipo === 'cruciverba' || e.tipo === 'richiesta' || e.tipo === 'articolo' || e.tipo === 'invito';
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
  const campi: Record<string, readonly string[]> = { persona: ['tipo','persona'], dote: ['tipo','dote','note','possibili'], lettura: ['tipo','categoria','chiave','almeno'], turno: ['tipo','attivita','doti','esito'], acquisto: ['tipo','articolo','variante','fortuna','sostituisceDoti'], pesca: ['tipo','regola','attivita','sostituisceTurni','sostituisceDoti'], fortuna: ['tipo','dote'], storia: ['tipo','evento'], domanda: ['tipo','domanda'], cruciverba: ['tipo','data'], richiesta: ['tipo','richiesta'], articolo: ['tipo','articolo'], invito: ['tipo','invito'] };
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
  if (o.tipo === 'articolo') return typeof o.articolo === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(o.articolo.trim()) ? { tipo: 'articolo', articolo: o.articolo.trim() } : null;
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
}

/** Gli effetti la cui frase passa da `fraseEffettoConNomi`: quelli che citano il loro oggetto per chiave, più pesca e Fortuna. */
export type EffettoConNomiVoce = EffettoDiStatoVoce | EffettoFortunaVoce | EffettoPescaVoce;
export const eEffettoConNomi = (e: { tipo: string }): e is EffettoConNomiVoce => eEffettoDiStato(e) || e.tipo === 'pesca' || e.tipo === 'fortuna';

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
    case 'articolo': { const a = n.articolo(e.articolo); return a ? `Articolo comprato: ${a.nome}${a.prezzo !== null ? ` · ¥${a.prezzo.toLocaleString('it-IT')}` : ''}` : 'Articolo comprato'; }
    case 'invito': { const i = n.invito(e.invito); return i ? `Invito di ${i.confidenteNome}${i.data ? ` del ${dataLeggibile(i.data)}` : ''} avvenuto: i punti dell'incontro valgono ×1,2` : 'Invito avvenuto'; }
    case 'persona': { const p = n.persona(e.persona); return p ? `Persona registrata nel compendio: ${p}` : 'Persona registrata nel compendio'; }
  }
}
