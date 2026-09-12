// ============================================================
// API impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10)
// ============================================================
//
// **Dal browser non parte nessun file.** Un pacchetto o un backup pesano centinaia di MB: nel corpo di
// una richiesta non attraversano il proxy di un'istanza pubblicata. Si scarica (e una copia resta nella
// cartella d'appoggio del server) e si reimporta indicando quale file di quella cartella usare: il lavoro
// è tutto del backend, che legge dal mount.
// ============================================================

import type { AnteprimaPacchettoDto, DepositoFileDto, EsitoImportazionePacchettoDto, EsitoRipristinoDto, StatoImportazionePacchettoDto, StatoIstanzaDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiGet, apiPost, apiPut } from './_helpers';

/** A che punto è un'operazione lunga del server: la barra la mostra come avanzamento indeterminato. */
export interface AvanzamentoInvio {
  byteInviati: number;
  byteTotali: number;
  percentuale: number;
  inviato: boolean;
}

/** Versioni, dimensioni su disco e conteggi dell'istanza locale. */
export const getStatoIstanza = (): Promise<StatoIstanzaDto> => apiGet('/impostazioni/istanza');

/** Nome del file proposto dal server (intestazione `Content-Disposition`), con ripiego. */
function nomeDalContentDisposition(res: Response, ripiego: string): string {
  const intestazione = res.headers.get('Content-Disposition') ?? '';
  return /filename="?([^";]+)"?/.exec(intestazione)?.[1] ?? ripiego;
}

async function scarica(percorso: string, ripiego: string): Promise<{ nome: string; blob: Blob; depositato: string | null }> {
  const res = await httpFetch(`${API_BASE_URL}${percorso}`, { method: 'GET' }, { maxRetries: 0, timeoutMs: 1_800_000 });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Esportazione fallita (${res.status})`, body?.error?.details, body?.requestId);
  }
  // il server lascia una copia nella cartella d'appoggio e ne dice il nome: lo si riferisce all'utente
  return { nome: nomeDalContentDisposition(res, ripiego), blob: await res.blob(), depositato: res.headers.get('X-Deposito-File') };
}

/** Scarica l'istanza completa: database, immagini caricate, caratteri, manifesto. */
export const scaricaIstanza = (): Promise<{ nome: string; blob: Blob; depositato: string | null }> => scarica('/impostazioni/istanza/completa.zip', 'project-p5r-istanza.zip');

// ---- Pacchetto di gioco (voce 10) ----

/** Scarica il pacchetto di gioco: il file gioco.db, immagini comprese, senza le partite. */
export const scaricaPacchettoGioco = (): Promise<{ nome: string; blob: Blob; depositato: string | null }> => scarica('/impostazioni/istanza/database', 'project-p5r-gioco.db');

// ---- Cartella d'appoggio sul NAS: il file lo legge il server, il browser non trasporta niente ----

/** Che cosa c'è nella cartella d'appoggio del server. */
export const getDepositoPacchetti = (): Promise<DepositoFileDto> => apiGet('/impostazioni/istanza/gioco/deposito');

/** Anteprima di un pacchetto depositato. */
export const anteprimaPacchettoDaDeposito = (nome: string): Promise<AnteprimaPacchettoDto> =>
  apiPost('/impostazioni/istanza/gioco/deposito/anteprima', { nome }, { maxRetries: 0, timeoutMs: 1_800_000 });

/** Sostituisce i dati di gioco con un pacchetto depositato. */
export const importaPacchettoDaDeposito = (nome: string): Promise<EsitoImportazionePacchettoDto> =>
  apiPut('/impostazioni/istanza/gioco/deposito', { nome }, { maxRetries: 0, timeoutMs: 1_800_000 });

/** Che cosa c'è nella cartella d'appoggio per il ripristino (ZIP dell'istanza o database). */
export const getDepositoBackup = (): Promise<DepositoFileDto> => apiGet('/impostazioni/istanza/deposito');

/** Ripristina l'istanza da un file depositato: lo legge il server. */
export const ripristinaIstanzaDaDeposito = (nome: string): Promise<EsitoRipristinoDto> =>
  apiPut('/impostazioni/istanza/deposito', { nome }, { maxRetries: 0, timeoutMs: 1_800_000 });

/** A che punto è l'importazione sul server: da chiedere quando la risposta non arriva (un proxy può chiudere prima). */
export const statoImportazionePacchetto = (): Promise<StatoImportazionePacchettoDto> =>
  apiGet('/impostazioni/istanza/gioco/importazione', { maxRetries: 1, timeoutMs: 30_000 });
