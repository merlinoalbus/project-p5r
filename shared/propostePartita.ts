import type { DoteChiave } from './doti.js';
import type { NuovaRegistrazioneAcquisto } from './acquisti.js';

export type StatoPropostaPartita = 'aperta' | 'applicata' | 'scartata';
export type VerificaConteggioProposta = 'da-dichiarare' | 'non-conteggiata' | 'ignota';
export interface RiferimentoPropostaPartita { id: number; uid: string }
export interface SaldoBeneficioDto { dovuto: number; attribuito: number; differenza: number; ciclo: number; revisione: string }
export interface PropostaPartitaDto extends RiferimentoPropostaPartita {
  partitaId: number; tipo: 'dote' | 'yen' | 'effetto-voce'; chiave: string;
  causa: { tipo: 'acquisto' | 'voce'; chiave: string }; unita: 'punti-interni' | 'yen' | 'azione';
  delta: number; stato: StatoPropostaPartita; verifica: VerificaConteggioProposta;
  motivo: string; chiusaDa: 'utente' | 'causa' | null; motivoChiusura: string | null;
  deltaApplicato: number; deltaRiconosciuto: number; saldo: SaldoBeneficioDto | null;
  dote: DoteChiave | null; orfana: boolean; applicabile: boolean; impedimenti: string[];
  creataIl: string; decisaIl: string | null; dati: Record<string, unknown>;
}
export type DecisioneProposte =
  | { tipo: 'applica' | 'scarta' | 'non-conteggiata' | 'ignota'; proposte: RiferimentoPropostaPartita[] }
  | { tipo: 'gia-conteggiata'; proposta: RiferimentoPropostaPartita; quantita: number }
  | { tipo: 'applica-effetto'; proposta: RiferimentoPropostaPartita; acquisto?: NuovaRegistrazioneAcquisto; revisioneAcquistiAttesa?: string };
export interface RichiestaAnteprimaDecisioneProposte { operazioneId: string; decisione: DecisioneProposte }
export interface RichiestaDecisioneProposte extends RichiestaAnteprimaDecisioneProposte { revisioneProposteAttesa: string }
export interface MovimentoPropostoDto { tipo: 'dote' | 'yen'; chiave: string; prima: number; delta: number; dopo: number }
export interface AnteprimaDecisioneProposteDto {
  richiesta: RichiestaAnteprimaDecisioneProposte; proposte: PropostaPartitaDto[];
  movimenti: MovimentoPropostoDto[]; revisioneProposteAttesa: string;
}
export interface RicevutaDecisioneProposteDto {
  operazioneId: string; partitaId: number; decisione: DecisioneProposte['tipo'];
  proposte: RiferimentoPropostaPartita[]; movimenti: MovimentoPropostoDto[]; decisaIl: string;
}
