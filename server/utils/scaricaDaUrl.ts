// ============================================================
// scaricaDaUrl — prendere un file da un indirizzo, con i tempi giusti e un tetto vero
// ============================================================
//
// Lo usano l'importazione del pacchetto di gioco (centinaia di MB) e le immagini da URL (8 MB).
//
// **Tre attese diverse, non una sola.** `AbortSignal.timeout(n)` sembra la via breve, ma quel segnale
// resta legato anche alla lettura del corpo: con trenta secondi di scadenza un pacchetto da 300 MB
// muore sempre a metà scarico, e l'errore arriva grezzo. Qui il cronometro delle **intestazioni** si
// disarma appena il server risponde; da lì in poi vale solo l'**inattività**, che riparte a ogni blocco
// ricevuto. Un trasferimento lento ma vivo non viene interrotto; uno morto sì.
//
// **Il tetto si applica mentre si scarica, non dopo.** Bufferizzare tutto e poi misurare significa
// farsi riempire la memoria da chi sceglie l'indirizzo: un'origine che non dichiara `Content-Length`
// aggirerebbe il limite. Qui i blocchi si sommano e alla prima eccedenza si interrompe.
// ============================================================

import { httpErrors } from './httpError.js';

export interface OpzioniScarico {
  /** Tetto del contenuto accettato, in byte. */
  maxByte: number;
  /** Che cosa si sta scaricando, per i messaggi: «il pacchetto di gioco», «l'immagine». */
  cosa: string;
  /** Codice dell'errore quando lo scarico non riesce. */
  codiceScaricoFallito: string;
  /** Codice dell'errore quando il contenuto supera il tetto. */
  codiceTroppoGrande: string;
  /** Intestazione `Accept` della richiesta. */
  accept: string;
  /** Attesa massima della risposta (solo le intestazioni). */
  attesaRispostaMs?: number;
  /** Silenzio massimo fra due blocchi del corpo. */
  inattivitaMs?: number;
  /** Intestazioni aggiuntive (le immagini si presentano con uno User-Agent). */
  intestazioni?: Record<string, string>;
}

const ATTESA_RISPOSTA_PREDEFINITA = 30_000;
const INATTIVITA_PREDEFINITA = 120_000;

/** L'indirizzo, se è un http/https valido; altrimenti 400. */
export function urlValido(indirizzo: string): URL {
  let u: URL;
  try {
    u = new URL(indirizzo);
  } catch {
    throw httpErrors.badRequest('url-non-valido', 'L\'indirizzo indicato non è valido.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw httpErrors.badRequest('url-non-valido', 'Sono ammessi solo indirizzi http/https.');
  return u;
}

const megabyte = (byte: number): number => Math.round(byte / 1024 / 1024);

/** Scarica il contenuto dell'indirizzo: intestazioni entro `attesaRispostaMs`, corpo a blocchi entro il tetto. */
export async function scaricaDaUrl(indirizzo: string, opzioni: OpzioniScarico): Promise<{ contenuto: Buffer; mime: string; url: URL }> {
  const u = urlValido(indirizzo);
  const attesaRisposta = opzioni.attesaRispostaMs ?? ATTESA_RISPOSTA_PREDEFINITA;
  const inattivita = opzioni.inattivitaMs ?? INATTIVITA_PREDEFINITA;
  const ctrl = new AbortController();
  let motivo: 'risposta' | 'inattivita' | null = null;
  let orologio: NodeJS.Timeout | null = null;
  const fermaOrologio = (): void => { if (orologio) { clearTimeout(orologio); orologio = null; } };
  const armaOrologio = (ms: number, quale: 'risposta' | 'inattivita'): void => {
    fermaOrologio();
    orologio = setTimeout(() => { motivo = quale; ctrl.abort(); }, ms);
  };
  /** L'errore da lanciare quando lo scarico non riesce (restituito, non lanciato: così chi chiama scrive `throw`). */
  const erroreScarico = (dettaglio: string): Error =>
    httpErrors.badRequest(opzioni.codiceScaricoFallito, `Impossibile scaricare ${opzioni.cosa} da ${u.host}: ${dettaglio}`);

  armaOrologio(attesaRisposta, 'risposta');
  let res: Response;
  try {
    res = await fetch(u, { signal: ctrl.signal, redirect: 'follow', headers: { Accept: opzioni.accept, ...opzioni.intestazioni } });
  } catch (err) {
    fermaOrologio();
    throw motivo === 'risposta'
      ? erroreScarico(`nessuna risposta entro ${Math.round(attesaRisposta / 1000)} secondi.`)
      : erroreScarico(err instanceof Error ? err.message : String(err));
  }
  // risposta arrivata: da qui conta solo l'inattività, non il tempo totale
  armaOrologio(inattivita, 'inattivita');
  try {
    if (!res.ok) throw httpErrors.badRequest(opzioni.codiceScaricoFallito, `L'indirizzo ha risposto ${res.status}: controlla che serva ${opzioni.cosa}.`);
    const dichiarati = Number(res.headers.get('Content-Length') ?? '0');
    if (dichiarati > opzioni.maxByte) {
      throw httpErrors.badRequest(opzioni.codiceTroppoGrande, `Il file all'indirizzo pesa ${megabyte(dichiarati)} MB e supera il limite di ${megabyte(opzioni.maxByte)} MB.`);
    }
    const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!res.body) throw httpErrors.badRequest(opzioni.codiceScaricoFallito, 'L\'indirizzo ha risposto senza contenuto.');

    const lettore = res.body.getReader();
    const blocchi: Buffer[] = [];
    let ricevuti = 0;
    for (;;) {
      let blocco: Awaited<ReturnType<typeof lettore.read>>;
      try {
        blocco = await lettore.read();
      } catch (err) {
        throw motivo === 'inattivita'
          ? erroreScarico(`trasferimento fermo da ${Math.round(inattivita / 1000)} secondi.`)
          : erroreScarico(err instanceof Error ? err.message : String(err));
      }
      if (blocco.done) break;
      armaOrologio(inattivita, 'inattivita');
      ricevuti += blocco.value.byteLength;
      // il tetto vale durante lo scarico: chi non dichiara la dimensione non può farci riempire la memoria
      if (ricevuti > opzioni.maxByte) {
        await lettore.cancel().catch(() => undefined);
        throw httpErrors.badRequest(opzioni.codiceTroppoGrande, `Il file all'indirizzo supera il limite di ${megabyte(opzioni.maxByte)} MB.`);
      }
      blocchi.push(Buffer.from(blocco.value));
    }
    if (ricevuti === 0) throw httpErrors.badRequest(opzioni.codiceScaricoFallito, 'L\'indirizzo ha risposto senza contenuto.');
    return { contenuto: Buffer.concat(blocchi), mime, url: u };
  } finally {
    fermaOrologio();
  }
}
