import type { DoteChiave } from './doti.js';
import type { ValutazionePresenza } from './valutazioneAcquisto.js';

export const ARTICOLO_AOJIRU = 'chiosco-kiyasuku/succo-aojiru';
export const CATALOGO_AOJIRU = 'consumabile/succo-aojiru';
export const ORDINE_AOJIRU: readonly DoteChiave[] = ['fascino', 'perizia', 'coraggio', 'gentilezza', 'conoscenza'];
export const PREZZO_AOJIRU = 5000;
export const PUNTI_BASE_AOJIRU = 2;
export type AojiruVariante = DoteChiave;
export type FortunaAojiru = boolean | null;
export function eOffertaAojiru(o: { chiave: string; catalogoChiave?: string | null }): boolean {
  return o.chiave === ARTICOLO_AOJIRU && (o.catalogoChiave == null || o.catalogoChiave === CATALOGO_AOJIRU);
}
export function prossimaVarianteAojiru(v: AojiruVariante): AojiruVariante {
  return ORDINE_AOJIRU[(ORDINE_AOJIRU.indexOf(v) + 1) % ORDINE_AOJIRU.length]!;
}
export interface MomentoAcquisto { giorno: string; fascia: 'giorno' | 'sera'; ordine: number }
export type FonteAcquisto = { tipo: 'manuale' } | { tipo: 'diario'; voceUid: string; effettoUid: string };
export type RapportoPresenzaLegacy = null | { tipo: 'rappresenta' | 'ulteriore'; firma: string; valutazione?: ValutazionePresenza };
export interface NuovaRegistrazioneAcquisto {
  operazioneId: string; articolo: string; momento: MomentoAcquisto;
  variante: AojiruVariante; fortuna: FortunaAojiru; fonte: FonteAcquisto;
  scelta: { tipo: 'nuova' } | { tipo: 'collega'; acquistoId: string };
  rapportoLegacy: RapportoPresenzaLegacy;
}
export interface RichiestaRegistraAcquisto extends NuovaRegistrazioneAcquisto { revisioneAcquistiAttesa: string }
export interface DatiConsumoAojiru { regola: 'aojiru'; versione: 1; variante: AojiruVariante; fortuna: FortunaAojiru }
export interface IdentitaAcquisto { articolo: string; nome: string; negozio: string | null; negozioNome: string; catalogo: string | null }
export interface ProvenienzaAcquistoDto { id: string; acquistoId: string; fonte: FonteAcquisto; creataIl: string; orfana: boolean; voceCorrente: {giorno:string;fascia:'giorno'|'sera'} | null }
export interface RegistrazioneAcquistoDto {
  id: string; partitaId: number; identita: IdentitaAcquisto; momento: MomentoAcquisto; prezzoYen: number;
  consumo: DatiConsumoAojiru; legacyFirma: string | null; attiva: boolean;
  provenienze: ProvenienzaAcquistoDto[]; creataIl: string; orfana: boolean;
  legacyValutazioneId?: string | null;
}
export interface PresenzaStoricaAcquistoDto {
  articolo: string; negozioNome: string; firma: string; rappresentataDa: string | null; orfana: boolean;
  valutazione?: ValutazionePresenza;
}
export interface StatoAcquistiArticoloDto {
  articolo: string; acquistato: boolean; presenzaStorica: PresenzaStoricaAcquistoDto | null;
  registrazioni: RegistrazioneAcquistoDto[];
  aojiru: null | { confermate: number; varianteAttesa: AojiruVariante | null; incongruenze: string[]; nota: string };
}
export interface StatoAcquistiDto {
  partitaId: number; presenzeStoriche: PresenzaStoricaAcquistoDto[];
  registrazioni: RegistrazioneAcquistoDto[]; articoliOttenuti: string[];
  spesaPerNegozio: Array<{ negozio: string; spesa: number }>; revisione: string;
}
export interface DisponibilitaMomentoAcquistoDto {
  tipo: 'corrente' | 'osservazione'; calendario: 'compatibile' | 'incompatibile';
  condizioniStoricheNonRicostruibili: boolean; motivi: string[];
}
export interface AnteprimaRegistrazioneAcquistoDto {
  nuovo: NuovaRegistrazioneAcquisto; identita: IdentitaAcquisto;
  acquisti: StatoAcquistiArticoloDto; disponibilita: DisponibilitaMomentoAcquistoDto;
  effetto: { dote: DoteChiave; puntiBase: 2; puntiConfermati: number | null; note: number | null; prezzoYen: 5000 };
  esitoPrevisto: 'registrata' | 'fonte-collegata' | 'gia-collegata'; revisioneAcquistiAttesa: string;
}
export interface RicevutaOperazioneAcquistoDto {
  operazioneId: string; esito: 'registrata' | 'fonte-collegata' | 'gia-collegata' | 'fonte-rimossa' | 'presenza-rimossa';
  partitaId: number; acquistoId: string | null; provenienzaId: string | null; articolo: string; creataIl: string;
}
export interface RichiestaAnteprimaAnnullaProvenienza { operazioneId: string; provenienzaId: string }
export interface RichiestaAnnullaProvenienza extends RichiestaAnteprimaAnnullaProvenienza { revisioneAcquistiAttesa: string }
export interface RichiestaAnteprimaRimozioneLegacy { operazioneId: string; articolo: string }
export interface RichiestaRimozioneLegacy extends RichiestaAnteprimaRimozioneLegacy { revisioneAcquistiAttesa: string }
export interface AnteprimaRimozioneAcquistoDto {
  operazioneId: string; articolo: string; acquisto: RegistrazioneAcquistoDto | null;
  presenzaStorica: PresenzaStoricaAcquistoDto | null; ultimaFonte: boolean; revisioneAcquistiAttesa: string;
}
