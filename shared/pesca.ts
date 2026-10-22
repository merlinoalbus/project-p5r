import type { MeteoPartita } from './meteoPartita.js';

export const REGOLA_PESCA = 'ichigaya-royal-v1' as const;
export const ATTIVITA_PESCA = 'pesca-ichigaya' as const;
export const SFIDA_PESCA = 'sfida-pesca-guardiano-ichigaya' as const;
/** Le sole attività i cui turni possono appartenere a una visita di pesca. */
export function eAttivitaPesca(chiave: string): boolean {
  return chiave === ATTIVITA_PESCA || chiave === SFIDA_PESCA;
}
export const EVENTI_PESCA = ['guardiano-ichigaya-catturato', 'boss-ichigaya-catturato', 'terzo-semestre-avviato'] as const;
export type EventoPesca = typeof EVENTI_PESCA[number];
export type SpeciePesca = 'guardiano' | 'boss' | 'altro';
export type ValoreFattoPesca = 'avvenuto' | 'non-avvenuto' | 'ignoto';
export interface MomentoPesca { giorno: string; fascia: 'giorno' | 'sera'; ordineVisita: number }
export type FontePesca = { tipo: 'manuale' } | { tipo: 'diario'; voceUid: string; effettoUid: string };
export interface CatturaPesca { id: string; specie: SpeciePesca; tentativo: number | null; posizione: number | null }
export interface OsservazionePesca {
  rangoPeriziaOsservato: 1 | 2 | 3 | 4 | 5 | null;
  provenienzaRango: 'dichiarato' | 'fotografia-corrente-confermata' | 'ignoto';
  tentativiConsumati: number | null;
  catture: CatturaPesca[] | null;
  escaSpecialePosseduta: boolean | null;
  faseTerzoSemestre: boolean | null;
  meteo: MeteoPartita | null;
  allertaGelo: boolean | null;
  quota: { pagata: boolean | null };
  finale: { tipo: 'ignoto' | 'uscita-dopo-riscossione' | 'uscita-senza-riscossione'; riscossioneUid: string | null; ripresaDopoRiscossione: boolean | null };
  perizia: { esito: 'ricevuta' | 'non-ricevuta' | 'ignota' };
  fortuna: { giorno: string; attiva: boolean | null };
}
export type SceltaTurnoPesca = { tipo: 'nuovo' } | { tipo: 'esistente'; ordine: number; firmaTurno: string } | { tipo: 'contatore-storico'; firmaContatore: string };
export interface NuovaSessionePesca {
  operazioneId: string; momento: MomentoPesca; fonte: FontePesca;
  scelta: { tipo: 'nuova' } | { tipo: 'collega'; sessioneId: string };
  turno: SceltaTurnoPesca; osservazione: OsservazionePesca;
}
export interface RichiestaRegistraSessionePesca extends NuovaSessionePesca { revisionePescaAttesa: string }
export interface NuovaOsservazionePesca { operazioneId: string; osservazione: OsservazionePesca }
export interface RichiestaSalvaOsservazionePesca extends NuovaOsservazionePesca { revisionePescaAttesa: string }
export interface RichiestaAnteprimaRimozionePesca { operazioneId: string }
export interface RichiestaRimozionePesca extends RichiestaAnteprimaRimozionePesca { revisionePescaAttesa: string }
export interface NuovoFattoPesca { operazioneId: string; valore: ValoreFattoPesca; momento: MomentoPesca | null; nota: string }
export interface RichiestaRegistraFattoPesca extends NuovoFattoPesca { revisionePescaAttesa: string }
export interface NuovoAcquistoEscaPesca { operazioneId: string; momento: MomentoPesca; quantita: number }
export interface RichiestaAcquistaEscaPesca extends NuovoAcquistoEscaPesca { revisionePescaAttesa: string }
export interface NuovaRettificaPuntiPesca { operazioneId: string; saldoOsservato: number }
export interface RichiestaRettificaPuntiPesca extends NuovaRettificaPuntiPesca { revisionePescaAttesa: string }
export interface IntervalloBeneficioPesca { minimo: number; massimo: number | null }
export interface BeneficioPescaDto {
  causa: string; tipo: 'dote' | 'yen' | 'punti-pesca'; chiave: string; unita: 'punti-interni' | 'yen' | 'punti-pesca';
  intervallo: IntervalloBeneficioPesca; attribuito: number; deltaCerto: number; residuoIgnoto: boolean; motivo: string;
}
export interface ViaPescaDto { id: string; descrizione: string; esito: 'soddisfatta' | 'non-dimostrata' | 'non-applicabile'; fonti: string[] }
export interface EsitoProfiloPescaDto {
  specie: 'guardiano' | 'boss'; esito: 'prerequisito-mancante' | 'via-documentata' | 'da-verificare';
  comparsa: 'documentata' | 'da-verificare' | 'non-prevista';
  catturabilita: 'via-documentata' | 'da-verificare' | 'prerequisito-mancante';
  tentativo: 'pianificabile' | 'tentabile' | 'esaurito' | 'gia-catturato' | 'da-verificare';
  tentativiResidui: number | null; necessita: string[]; vie: ViaPescaDto[]; incertezze: string[];
}
export type PuntoValutazionePesca = { tipo: 'pianificazione' } | { tipo: 'prossimo-tentativo'; consumati: number; posizione: number | null };
export interface FonteSessionePescaDto { id: string; fonte: FontePesca; generazione: string | null; creataIl: string; orfana: boolean }
export interface OsservazionePescaDto { id: string; versione: number; precedenteId: string | null; dati: OsservazionePesca; creataIl: string }
export interface SessionePescaDto {
  id: string; partitaId: number; momento: MomentoPesca; attivita: string; nome: string;
  turno: { uid: string | null; ordine: number; origine: 'creato' | 'raccordato' | 'quota-storica'; revocato: boolean; firma: string | null };
  attiva: boolean; orfana: boolean; fonti: FonteSessionePescaDto[];
  osservazione: OsservazionePescaDto; revisioni: OsservazionePescaDto[]; profili: EsitoProfiloPescaDto[];
  punto: PuntoValutazionePesca; profiliPianificazione: EsitoProfiloPescaDto[];
  benefici: BeneficioPescaDto[]; avvisi: string[];
}
export interface FonteFattoPescaDto {
  id: string; evento: EventoPesca; valore: ValoreFattoPesca; momento: MomentoPesca | null;
  sessioneId: string | null; catturaId: string | null; provenienzaId: string | null; nota: string; creataIl: string;
}
export interface FattoPescaDto { evento: EventoPesca; nome: string; valore: ValoreFattoPesca; fonti: FonteFattoPescaDto[]; avvisi: string[] }
export interface AcquistoEscaPescaDto {
  id: string; momento: MomentoPesca; quantita: number; costo: number; unita: 'punti-pesca'; attivo: boolean;
  benefici: BeneficioPescaDto[]; creatoIl: string;
}
export interface TurnoRaccordabilePescaDto { uid: string | null; attivita: string; ordine: number; creatoIl: string; firma: string; raccordatoASessione: string | null }
export interface RegolaPescaDto {
  chiave: string; nome: string; versione: 1; origine: 'seed' | 'utente' | null;
  dati: DefinizioneRegolaPesca | null; fonti: string[];
  stato: 'collegata' | 'non-collegata' | 'illeggibile'; motivi: string[]; revisione: string;
}
export interface RichiestaSalvaRegolaPesca { nome: string; dati: DefinizioneRegolaPesca; revisioneAttesa: string }
export interface StatoPescaDto {
  partitaId: number; regola: RegolaPescaDto; sessioni: SessionePescaDto[]; fatti: FattoPescaDto[];
  acquistiEsca: AcquistoEscaPescaDto[]; saldoPunti: number | null;
  contatore: { attivita: string; volte: number; turni: TurnoRaccordabilePescaDto[]; quoteNonRappresentate: number; firma: string };
  avvisi: string[]; revisionePesca: string;
}
export type AzioneOperazionePesca = 'registra-sessione' | 'salva-osservazione' | 'rimuovi-fonte' | 'rimuovi-sessione' | 'registra-fatto' | 'rimuovi-fatto' | 'acquista-esca' | 'rimuovi-acquisto-esca' | 'rettifica-punti';
export type InputOperazionePesca = NuovaSessionePesca | NuovaOsservazionePesca | RichiestaAnteprimaRimozionePesca | NuovoFattoPesca | NuovoAcquistoEscaPesca | NuovaRettificaPuntiPesca;
export interface AnteprimaOperazionePescaDto {
  azione: AzioneOperazionePesca; richiesta: InputOperazionePesca; bersaglio: string | null;
  stato: StatoPescaDto; profili: EsitoProfiloPescaDto[]; benefici: BeneficioPescaDto[];
  punto: PuntoValutazionePesca; profiliPianificazione: EsitoProfiloPescaDto[];
  esitoPrevisto: string; conseguenze: string[]; revisionePescaAttesa: string;
  acquistoEscaPrevisto?: {quantita:number;costoUnitario:number;costoTotale:number;unita:'punti-pesca'};
}
export interface RicevutaOperazionePescaDto {
  operazioneId: string; partitaId: number; azione: AzioneOperazionePesca; richiesta: InputOperazionePesca; bersaglio: string | null;
  sessioneId: string | null; provenienzaId: string | null; osservazioneId: string | null; acquistoEscaId: string | null; fattoFonteId: string | null;
  esito: 'sessione-creata' | 'fonte-collegata' | 'gia-collegata' | 'osservazione-salvata' | 'fonte-rimossa' | 'sessione-rimossa' | 'fatto-registrato' | 'fatto-rimosso' | 'esca-acquistata' | 'acquisto-esca-rimosso' | 'punti-rettificati';
  creataIl: string;
}
export interface EffettoPescaVoce {
  tipo: 'pesca'; regola: typeof REGOLA_PESCA; attivita: typeof ATTIVITA_PESCA;
  sostituisceTurni: string[]; sostituisceDoti: string[];
}
export interface ViaRegolaPesca {
  id: string; specie: 'guardiano' | 'boss'; faseTerzoSemestre: boolean;
  fascia: 'giorno' | 'sera'; meteo: 'normale' | 'pioggia-neve';
  guardianoPrecedente: 'si' | 'no' | 'indifferente'; rangoComparsa: 1 | 2 | 3 | 4 | 5 | null; rangoCattura: 1 | 2 | 3 | 4 | 5;
  tentativo: 'primo' | 'settimo'; seiCatture: boolean; fonti: string[]; nota: string;
}
export interface DefinizioneRegolaPesca {
  versione: 1; quote: { giorno: number; sera: number }; costoEscaPunti: number;
  beneficioPerizia: { note: 1; puntiBase: number; bonusFortuna: number };
  fonti: string[]; vie: ViaRegolaPesca[];
}

export function deltaCertoPesca(intervallo: IntervalloBeneficioPesca, attribuito: number): number {
  if (attribuito < intervallo.minimo) return intervallo.minimo - attribuito;
  if (intervallo.massimo !== null && attribuito > intervallo.massimo) return intervallo.massimo - attribuito;
  return 0;
}
export function nomeEventoPesca(evento: EventoPesca): string {
  return evento === 'guardiano-ichigaya-catturato' ? 'Guardiano di Ichigaya catturato' : evento === 'boss-ichigaya-catturato' ? 'Boss di Ichigaya catturato' : 'Terzo semestre avviato';
}
