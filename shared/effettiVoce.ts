import { eDote, nomeDote, type DoteChiave } from './doti.js';
import { ATTIVITA_PESCA, REGOLA_PESCA, type EffettoPescaVoce } from './pesca.js';

export type CategoriaLetturaVoce = 'libro' | 'film' | 'videogioco';
export interface DoteNoteVoce { dote: DoteChiave; note: 1 | 2 | 3 }
export type EffettoLegacyVoce =
  | { tipo: 'dote'; dote: DoteChiave; note: 1 | 2 | 3 }
  | { tipo: 'lettura'; categoria: CategoriaLetturaVoce; chiave: string; almeno: number | null }
  | { tipo: 'turno'; attivita: string; doti?: DoteNoteVoce[] };
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
  | { tipo: 'articolo'; articolo: string };
export const eEffettoDiStato = (e: { tipo: string }): e is EffettoDiStatoVoce => e.tipo === 'storia' || e.tipo === 'domanda' || e.tipo === 'cruciverba' || e.tipo === 'richiesta' || e.tipo === 'articolo';
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
export function normalizzaEffettoVoce(x: unknown): EffettoVoce | null {
  const o = oggetto(x); if (!o) return null;
  const campi: Record<string, readonly string[]> = { dote: ['tipo','dote','note'], lettura: ['tipo','categoria','chiave','almeno'], turno: ['tipo','attivita','doti'], acquisto: ['tipo','articolo','variante','fortuna','sostituisceDoti'], pesca: ['tipo','regola','attivita','sostituisceTurni','sostituisceDoti'], fortuna: ['tipo','dote'], storia: ['tipo','evento'], domanda: ['tipo','domanda'], cruciverba: ['tipo','data'], richiesta: ['tipo','richiesta'], articolo: ['tipo','articolo'] };
  if (typeof o.tipo!=='string'||!Object.hasOwn(campi,o.tipo)||Object.keys(o).some((k) => !campi[o.tipo as string]!.includes(k))) return null;
  if (o.tipo === 'dote') return eDote(o.dote) && nota(o.note) ? { tipo: 'dote', dote: o.dote, note: o.note } : null;
  if (o.tipo === 'fortuna') return eDote(o.dote) ? { tipo: 'fortuna', dote: o.dote } : null;
  if (o.tipo === 'storia') return typeof o.evento === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,79}$/i.test(o.evento.trim()) ? { tipo: 'storia', evento: o.evento.trim() } : null;
  if (o.tipo === 'domanda') return Number.isSafeInteger(o.domanda) && (o.domanda as number) >= 1 ? { tipo: 'domanda', domanda: o.domanda as number } : null;
  if (o.tipo === 'cruciverba') return typeof o.data === 'string' && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(o.data) ? { tipo: 'cruciverba', data: o.data } : null;
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
export function descriviEffettoVoce(e: EffettoVoce): string {
  if (e.tipo === 'dote') return `${nomeDote(e.dote)}: ${e.note} ${e.note === 1 ? 'nota' : 'note'}`;
  if (e.tipo === 'lettura') return `${e.chiave}: ${e.almeno === null ? 'completato' : `almeno ${e.almeno}`}`;
  if (e.tipo === 'turno') return `Turno: ${e.attivita}`;
  if (e.tipo === 'pesca') return 'Pesca a Ichigaya: sessione osservata';
  if (e.tipo === 'fortuna') return `Fortuna di Chihaya: ${nomeDote(e.dote)} ×1,5 per il resto del giorno`;
  if (e.tipo === 'storia') return `Segna l’evento di storia «${e.evento}»`;
  if (e.tipo === 'domanda') return `Segna la domanda ${e.domanda} come fatta`;
  if (e.tipo === 'cruciverba') return `Segna il cruciverba del ${e.data} come risolto`;
  if (e.tipo === 'articolo') return `Segna come comprato: ${e.articolo}`;
  if (e.tipo === 'richiesta') return `Segna la Richiesta «${e.richiesta}» come completata`;
  return `Acquisto: ${e.articolo}${e.variante ? ` · ${nomeDote(e.variante)}` : ' · variante da dichiarare'}`;
}
