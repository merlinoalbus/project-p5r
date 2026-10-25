// ============================================================
// API impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10), cestino (2026-10-16)
// ============================================================
//
// **Dal browser non parte nessun file.** Un pacchetto o un backup pesano centinaia di MB: nel corpo di
// una richiesta non attraversano il proxy di un'istanza pubblicata. Si scarica (e una copia resta nella
// cartella d'appoggio del server) e si reimporta indicando quale file di quella cartella usare: il lavoro
// è tutto del backend, che legge dal mount.
// ============================================================

import type { ElementoCatalogoDto, AnteprimaPacchettoDto, DepositoFileDto, EsitoImportazionePacchettoDto, EsitoRipristinoCestinoDto, EsitoRipristinoDto, StatoEdizioneDto, StatoImportazionePacchettoDto, StatoIstanzaDto, VoceCestinoDto, VoceCestinoUnificatoDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from './_helpers';

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

/** Scarica un file lungo da produrre (timeout di 30 minuti, nessun nuovo tentativo): un errore diventa `ApiError` con la busta
 *  del server se c'è; altrimenti restituisce il nome proposto, il contenuto e il nome della copia lasciata nella cartella d'appoggio. */
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

// ---- L12: l'edizione di rilascio (solo nell'istanza di preparazione) ----

/** Avvia «Prepara edizione»: il server risponde subito e lavora in background (non si ripete da sola: una seconda richiesta troverebbe il lavoro in corso). */
export const avviaPreparazioneEdizione = (): Promise<{ operazione: string }> =>
  apiPost('/impostazioni/istanza/edizione', undefined, { maxRetries: 0, timeoutMs: 60_000 });

/** A che punto è la preparazione dell'edizione, com'è finita l'ultima e quale edizione c'è già nella cartella d'appoggio. */
export const getStatoEdizione = (): Promise<StatoEdizioneDto> =>
  apiGet('/impostazioni/istanza/edizione', { maxRetries: 1, timeoutMs: 30_000 });

// ---- Il cestino (2026-10-16): aree, voci, planimetrie e aree dei dedali eliminate ----
// Rimettere ed eliminare per sempre non si ripetono da soli (`maxRetries: 0`): una seconda richiesta partita dopo una risposta
// persa troverebbe l'elemento già uscito dal cestino.

/** R10-23/4: le righe della guida nascoste dagli elenchi (negozi, articoli, libri, film, attività, luoghi, domande, cruciverba), per rimetterle. */
export const getNascostiDallaGuida = (): Promise<ElementoCatalogoDto[]> => apiGet('/impostazioni/cestino/nascosti');

/** Gli elementi del cestino, dal più recente. */
export const getCestino =(): Promise<VoceCestinoDto[]> => apiGet('/impostazioni/cestino');

/** Rimette un elemento del cestino com'era (esce dal cestino). */
export const ripristinaDalCestino = (id: number): Promise<EsitoRipristinoCestinoDto> =>
  apiPost(`/impostazioni/cestino/${id}/ripristina`, undefined, { maxRetries: 0 });

/** Toglie per sempre un elemento dal cestino. */
export const eliminaDalCestino = (id: number): Promise<void> => apiDelete(`/impostazioni/cestino/${id}`, { maxRetries: 0 });

/** Svuota il cestino. */
export const svuotaCestino = (): Promise<{ eliminati: number }> => apiDelete('/impostazioni/cestino', { maxRetries: 0 });

/** Il nuovo client richiede anche gli elementi personali; gli indirizzi storici conservano il contratto precedente. */
export const getCestinoUnificato = (): Promise<VoceCestinoUnificatoDto[]> => apiGet('/impostazioni/cestino?partite=1');
export const svuotaCestinoUnificato = (): Promise<{ eliminati: number }> => apiDelete('/impostazioni/cestino?partite=1', { maxRetries: 0 });
export const ripristinaDalCestinoUnificato = (v: VoceCestinoUnificatoDto): Promise<EsitoRipristinoCestinoDto> => v.id === null
  ? apiPost(`/impostazioni/cestino/partite/${encodeURIComponent(v.riferimento.uid)}/ripristina`, undefined, { maxRetries: 0 })
  : ripristinaDalCestino(v.id);
export const eliminaDalCestinoUnificato = (v: VoceCestinoUnificatoDto): Promise<void> => v.id === null
  ? apiDelete(`/impostazioni/cestino/partite/${encodeURIComponent(v.riferimento.uid)}`, { maxRetries: 0 })
  : eliminaDalCestino(v.id);
