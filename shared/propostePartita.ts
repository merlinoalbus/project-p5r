import type { DoteChiave } from './doti.js';
import type { NuovaRegistrazioneAcquisto } from './acquisti.js';
import type { IntervalloBeneficioPesca, NuovaSessionePesca } from './pesca.js';
import type { AvanzamentoGiornataDto } from './types.js';

export type StatoPropostaPartita = 'aperta' | 'applicata' | 'scartata';
export type VerificaConteggioProposta = 'da-dichiarare' | 'non-conteggiata' | 'ignota';
export interface RiferimentoPropostaPartita { id: number; uid: string }
export interface SaldoBeneficioDto { dovuto: number | null; attribuito: number; differenza: number; ciclo: number; revisione: string; intervallo?: IntervalloBeneficioPesca; residuoIgnoto?: boolean }
export interface PropostaPartitaDto extends RiferimentoPropostaPartita {
  partitaId: number; tipo: 'dote' | 'yen' | 'punti-pesca' | 'effetto-voce'; chiave: string;
  /** L13 (decisione 3): `richiesta` = gli yen di una Richiesta completata (`chiave` = chiave della Richiesta): li applica solo lei. */
  causa: { tipo: 'acquisto' | 'voce' | 'pesca' | 'richiesta'; chiave: string };
  /** Il testo della voce del Diario da cui nasce la proposta (null se non ce n'è una o non c'è più); per una Richiesta, la frase che la nomina. */
  voceTesto?: string | null;
  /** La voce del Diario a cui si aggancia il pulsante «Applica» (null se la proposta non nasce da una voce). */
  voceUid?: string | null;
  /** Gli yen di un consumo non sono una proposta (BON-12): la proposta Dote porta il costo della consumazione come dato (decisione 18: la consumazione
   *  nuova registrata dalla spunta lo scala da sola dal saldo). */
  promemoriaYen?: number | null;
  unita: 'punti-interni' | 'yen' | 'punti-pesca' | 'azione';
  delta: number; stato: StatoPropostaPartita; verifica: VerificaConteggioProposta;
  motivo: string; chiusaDa: 'utente' | 'causa' | null; motivoChiusura: string | null;
  deltaApplicato: number; deltaRiconosciuto: number; saldo: SaldoBeneficioDto | null;
  dote: DoteChiave | null; orfana: boolean; applicabile: boolean; impedimenti: string[];
  creataIl: string; decisaIl: string | null; dati: Record<string, unknown>;
}
/**
 * L13 (decisione 19): la proposta dell'elenco del passato, cioè un effetto di stato di una voce già spuntata mai applicato alla partita
 * (`statiMancantiService`). `dati.descrizione`: che cosa cambia, a parole; `dati.yenPrevisti` (articoli e Richieste con una ricompensa): il
 * movimento sul saldo che l'approvazione farà, con il segno (negativo: il prezzo si scala; positivo: la ricompensa entra; 0: nessuno, decisione 18);
 * `dati.oraGiaVero`: lo stato risulta già vero adesso (segnato dopo il censimento), e il motivo scritto allora non vale più.
 */
export const delPassato = (p: Pick<PropostaPartitaDto, 'tipo' | 'dati'>): boolean => p.tipo === 'effetto-voce' && p.dati.passato === true;
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
export interface RicevutaDecisioneProposteDto extends AvanzamentoGiornataDto {
  operazioneId: string; partitaId: number; decisione: DecisioneProposte['tipo'];
  proposte: RiferimentoPropostaPartita[]; movimenti: MovimentoPropostoDto[]; decisaIl: string;
  // `giornoAvanzato` / `fasciaAvanzata` (ereditati) compaiono solo nella risposta di una decisione che ha chiuso l'ultima decisione aperta di una
  // fascia o giornata già spuntata per intero: la partita è passata alla sera o al giorno dopo. Non fanno parte della ricevuta salvata (una
  // ripetizione dello stesso gesto restituisce la ricevuta senza).
}
