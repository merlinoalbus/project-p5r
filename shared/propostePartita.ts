import type { DoteChiave } from './doti.js';
import type { NuovaRegistrazioneAcquisto } from './acquisti.js';
import type { IntervalloBeneficioPesca, NuovaSessionePesca } from './pesca.js';

export type StatoPropostaPartita = 'aperta' | 'applicata' | 'scartata';
export type VerificaConteggioProposta = 'da-dichiarare' | 'non-conteggiata' | 'ignota';
export interface RiferimentoPropostaPartita { id: number; uid: string }
export interface SaldoBeneficioDto { dovuto: number | null; attribuito: number; differenza: number; ciclo: number; revisione: string; intervallo?: IntervalloBeneficioPesca; residuoIgnoto?: boolean }
export interface PropostaPartitaDto extends RiferimentoPropostaPartita {
  partitaId: number; tipo: 'dote' | 'yen' | 'punti-pesca' | 'effetto-voce'; chiave: string;
  causa: { tipo: 'acquisto' | 'voce' | 'pesca'; chiave: string };
  /** Il testo della voce del Diario da cui nasce la proposta (null se non ce n'è una o non c'è più). */
  voceTesto?: string | null;
  unita: 'punti-interni' | 'yen' | 'punti-pesca' | 'azione';
  delta: number; stato: StatoPropostaPartita; verifica: VerificaConteggioProposta;
  motivo: string; chiusaDa: 'utente' | 'causa' | null; motivoChiusura: string | null;
  deltaApplicato: number; deltaRiconosciuto: number; saldo: SaldoBeneficioDto | null;
  dote: DoteChiave | null; orfana: boolean; applicabile: boolean; impedimenti: string[];
  creataIl: string; decisaIl: string | null; dati: Record<string, unknown>;
}
export type DecisioneProposte =
  | { tipo: 'applica' | 'scarta' | 'non-conteggiata' | 'ignota'; proposte: RiferimentoPropostaPartita[] }
  | { tipo: 'gia-conteggiata'; proposta: RiferimentoPropostaPartita; quantita: number }
  | { tipo: 'applica-effetto'; proposta: RiferimentoPropostaPartita; acquisto?: NuovaRegistrazioneAcquisto; revisioneAcquistiAttesa?: string; pesca?: NuovaSessionePesca; revisionePescaAttesa?: string };
export interface RichiestaAnteprimaDecisioneProposte { operazioneId: string; decisione: DecisioneProposte }
export interface RichiestaDecisioneProposte extends RichiestaAnteprimaDecisioneProposte { revisioneProposteAttesa: string }
export interface MovimentoPropostoDto { tipo: 'dote' | 'yen' | 'punti-pesca'; chiave: string; prima: number; delta: number; dopo: number }
export interface AnteprimaDecisioneProposteDto {
  fotografiaSessionePesca?: import('./pesca.js').SessionePescaDto;
  richiesta: RichiestaAnteprimaDecisioneProposte; proposte: PropostaPartitaDto[];
  movimenti: MovimentoPropostoDto[]; revisioneProposteAttesa: string;
}
export interface RicevutaDecisioneProposteDto {
  operazioneId: string; partitaId: number; decisione: DecisioneProposte['tipo'];
  proposte: RiferimentoPropostaPartita[]; movimenti: MovimentoPropostoDto[]; decisaIl: string;
}
