// ============================================================
// API impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10)
// ============================================================
//
// **L'invio di un file usa XMLHttpRequest, non `fetch`.** Non è una scelta di stile: `fetch` non dice
// quanti byte ha già mandato, e il pacchetto di gioco pesa più di 300 MB — su una linea lenta l'attesa
// è di minuti e l'interfaccia non avrebbe niente da mostrare. XHR emette `upload.onprogress`, quindi la
// card può disegnare la barra e l'utente sa che sta andando avanti.
//
// **Il tempo massimo non è sul totale ma sull'inattività.** Un timeout complessivo (prima 5 minuti)
// interrompe un invio lentissimo ma sanissimo: 300 MB da un telefono ci mettono di più, e la richiesta
// moriva a metà. Qui il cronometro riparte a ogni byte accettato; scatta solo se per `INATTIVITA_MS`
// non succede più nulla, che è il caso vero da interrompere (connessione caduta).
// ============================================================

import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, EsitoRipristinoDto, StatoImportazionePacchettoDto, StatoIstanzaDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiGet, apiPost, apiPut } from './_helpers';

/** Versioni, dimensioni su disco e conteggi dell'istanza locale. */
export const getStatoIstanza = (): Promise<StatoIstanzaDto> => apiGet('/impostazioni/istanza');

/** Nome del file proposto dal server (intestazione `Content-Disposition`), con ripiego. */
function nomeDalContentDisposition(res: Response, ripiego: string): string {
  const intestazione = res.headers.get('Content-Disposition') ?? '';
  return /filename="?([^";]+)"?/.exec(intestazione)?.[1] ?? ripiego;
}

async function scarica(percorso: string, ripiego: string): Promise<{ nome: string; blob: Blob }> {
  const res = await httpFetch(`${API_BASE_URL}${percorso}`, { method: 'GET' }, { maxRetries: 0, timeoutMs: 300_000 });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Esportazione fallita (${res.status})`, body?.error?.details, body?.requestId);
  }
  return { nome: nomeDalContentDisposition(res, ripiego), blob: await res.blob() };
}

/** Scarica l'istanza completa: database, immagini caricate, caratteri, manifesto. */
export const scaricaIstanza = (): Promise<{ nome: string; blob: Blob }> => scarica('/impostazioni/istanza/completa.zip', 'project-p5r-istanza.zip');

/** Silenzio massimo tollerato prima di considerare caduta la connessione (il cronometro riparte a ogni avanzamento). */
const INATTIVITA_MS = 10 * 60 * 1000;

/** A che punto è l'invio di un file. `inviato` = il corpo è tutto partito e si aspetta la risposta del server. */
export interface AvanzamentoInvio {
  byteInviati: number;
  byteTotali: number;
  /** 0-100; resta a 100 mentre il server elabora. */
  percentuale: number;
  inviato: boolean;
}

export type OsservatoreInvio = (a: AvanzamentoInvio) => void;

/** Invia un file grezzo (ZIP o database) e restituisce il `data` della risposta, riferendo l'avanzamento. */
function inviaFile<T>(percorso: string, metodo: 'PUT' | 'POST', file: File, azione: string, onAvanzamento?: OsservatoreInvio): Promise<T> {
  const tipo = file.name.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream';
  return new Promise<T>((risolvi, rifiuta) => {
    const xhr = new XMLHttpRequest();
    let orologio: ReturnType<typeof setTimeout> | null = null;
    const fermaOrologio = () => { if (orologio !== null) { clearTimeout(orologio); orologio = null; } };
    const rinviaOrologio = () => {
      fermaOrologio();
      orologio = setTimeout(() => xhr.abort(), INATTIVITA_MS);
    };

    xhr.open(metodo, `${API_BASE_URL}${percorso}`);
    xhr.setRequestHeader('Content-Type', tipo);
    xhr.upload.onprogress = (e) => {
      rinviaOrologio();
      const byteTotali = e.lengthComputable ? e.total : file.size;
      onAvanzamento?.({ byteInviati: e.loaded, byteTotali, percentuale: byteTotali > 0 ? Math.min(100, Math.round((e.loaded / byteTotali) * 100)) : 0, inviato: e.loaded >= byteTotali });
    };
    // corpo tutto partito: da qui in poi il tempo lo consuma il server (lettura, copia di sicurezza, migrazioni)
    xhr.upload.onload = () => {
      rinviaOrologio();
      onAvanzamento?.({ byteInviati: file.size, byteTotali: file.size, percentuale: 100, inviato: true });
    };
    xhr.onload = () => {
      fermaOrologio();
      const body = (() => { try { return JSON.parse(xhr.responseText) as { data?: unknown; error?: { code?: string; message?: string; details?: Record<string, unknown> }; requestId?: string }; } catch { return null; } })();
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!body || !('data' in body)) { rifiuta(new ApiError(xhr.status, 'risposta-non-leggibile', `${azione}: il server ha risposto ${xhr.status} con un contenuto che non si riesce a leggere.`)); return; }
        risolvi(body.data as T); return;
      }
      rifiuta(new ApiError(xhr.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `${azione} (${xhr.status})`, body?.error?.details, body?.requestId));
    };
    xhr.onerror = () => { fermaOrologio(); rifiuta(new ApiError(0, 'rete-non-disponibile', `${azione}: il server non risponde. Controlla che il backend sia acceso e riprova.`)); };
    // si interrompe solo per silenzio prolungato: non c'è (ancora) un pulsante per annullare a mano
    xhr.onabort = () => { fermaOrologio(); rifiuta(new ApiError(0, 'invio-interrotto', `${azione}: nessun dato trasferito per ${Math.round(INATTIVITA_MS / 60000)} minuti, la connessione sembra caduta.`)); };

    rinviaOrologio();
    xhr.send(file);
  });
}

/** Sostituisce l'istanza con il file scelto (database `.db` o ZIP dell'istanza): il corpo è il file grezzo. */
export const ripristinaIstanza = (file: File, onAvanzamento?: OsservatoreInvio): Promise<EsitoRipristinoDto> => inviaFile('/impostazioni/istanza', 'PUT', file, 'Ripristino fallito', onAvanzamento);

// ---- Pacchetto di gioco (voce 10) ----

/** Scarica il pacchetto di gioco: il file gioco.db, immagini comprese, senza le partite. */
export const scaricaPacchettoGioco = (): Promise<{ nome: string; blob: Blob }> => scarica('/impostazioni/istanza/database', 'project-p5r-gioco.db');

/** Che cosa cambierebbe importando il pacchetto: il server legge il file senza sostituire nulla. */
export const anteprimaPacchettoGioco = (file: File, onAvanzamento?: OsservatoreInvio): Promise<AnteprimaPacchettoDto> => inviaFile('/impostazioni/istanza/gioco/anteprima', 'POST', file, 'Anteprima fallita', onAvanzamento);

/** Sostituisce i dati di gioco con il pacchetto; le partite restano. */
export const importaPacchettoGioco = (file: File, onAvanzamento?: OsservatoreInvio): Promise<EsitoImportazionePacchettoDto> => inviaFile('/impostazioni/istanza/gioco', 'PUT', file, 'Importazione fallita', onAvanzamento);

// ---- Pacchetto che sta a un indirizzo: lo scarica il server ----
//
// Serve quando l'istanza è pubblicata dietro un proxy: un corpo da centinaia di MB non passa (nginx e i
// tunnel lo rifiutano), mentre l'indirizzo sono poche decine di byte. Il tempo qui lo consuma il server,
// che scarica il file: l'attesa è lunga e senza avanzamento da mostrare.

export const anteprimaPacchettoGiocoDaUrl = (url: string): Promise<AnteprimaPacchettoDto> =>
  apiPost('/impostazioni/istanza/gioco/anteprima-da-url', { url }, { maxRetries: 0, timeoutMs: 1_800_000 });

export const importaPacchettoGiocoDaUrl = (url: string): Promise<EsitoImportazionePacchettoDto> =>
  apiPut('/impostazioni/istanza/gioco/da-url', { url }, { maxRetries: 0, timeoutMs: 1_800_000 });

/** A che punto è l'importazione sul server: da chiedere quando la risposta non arriva (un proxy può chiudere prima). */
export const statoImportazionePacchetto = (): Promise<StatoImportazionePacchettoDto> =>
  apiGet('/impostazioni/istanza/gioco/importazione', { maxRetries: 1, timeoutMs: 30_000 });
