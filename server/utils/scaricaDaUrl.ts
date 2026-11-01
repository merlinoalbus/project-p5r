// ============================================================
// scaricaDaUrl — prendere un file da un indirizzo, con i tempi giusti, un tetto vero e senza entrare nella rete interna
// ============================================================
//
// Lo usano le immagini da URL (8 MB). Il pacchetto di gioco, che lo usava per lo scaricamento da indirizzo, oggi passa
// solo dalla cartella d'appoggio (`depositoService`).
//
// **Tre attese diverse, non una sola.** `AbortSignal.timeout(n)` sembra la via breve, ma quel segnale
// resta legato anche alla lettura del corpo: con trenta secondi di scadenza un file grande da un'origine lenta
// muore a metà scarico, e l'errore arriva grezzo. Qui il cronometro delle **intestazioni** si
// disarma appena il server risponde; da lì in poi vale solo l'**inattività**, che riparte a ogni blocco
// ricevuto. Un trasferimento lento ma vivo non viene interrotto; uno morto sì.
//
// **Il tetto si applica mentre si scarica, non dopo.** Bufferizzare tutto e poi misurare significa
// farsi riempire la memoria da chi sceglie l'indirizzo: un'origine che non dichiara `Content-Length`
// aggirerebbe il limite. Qui i blocchi si sommano e alla prima eccedenza si interrompe.
//
// **Mai verso la rete interna (L9-02, SSRF).** L'indirizzo lo sceglie chi usa l'app, e la richiesta parte dal server: senza filtro
// raggiungerebbe il backend stesso, la rete di Docker, il NAS o i metadati di un cloud. Per questo non si usa `fetch` (che non lascia
// scegliere a quale IP connettersi) ma `http`/`https` di Node con una risoluzione DNS propria: si risolve il nome, si controllano TUTTI gli
// indirizzi restituiti (`reteInterna.ts`) e ci si connette proprio a quello controllato, così un DNS che cambia risposta fra il controllo e la
// connessione non apre la strada. Un indirizzo IP scritto nell'URL si controlla prima, perché lì non c'è risoluzione. I redirect non si
// seguono da soli: ognuno è un indirizzo nuovo, controllato come il primo (solo http e https), al più `MAX_REDIRECT`.
// ============================================================

import { lookup as risolviDns, type LookupAddress } from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { HttpError, httpErrors } from './httpError.js';
import { indirizzoInterno } from './reteInterna.js';
import { urlHttp } from '../../shared/urlHttp.js';

export interface OpzioniScarico {
  /** Tetto del contenuto accettato, in byte. */
  maxByte: number;
  /** Che cosa si sta scaricando, per i messaggi: per esempio «l'immagine». */
  cosa: string;
  /** Codice dell'errore quando lo scarico non riesce. */
  codiceScaricoFallito: string;
  /** Codice dell'errore quando il contenuto supera il tetto. */
  codiceTroppoGrande: string;
  /** Intestazione `Accept` della richiesta. */
  accept: string;
  /** Attesa massima della risposta (solo le intestazioni, redirect compresi). */
  attesaRispostaMs?: number;
  /** Silenzio massimo fra due blocchi del corpo. */
  inattivitaMs?: number;
  /** Intestazioni aggiuntive (le immagini si presentano con uno User-Agent). */
  intestazioni?: Record<string, string>;
}

/** Gli stati con cui una fonte rifiuta la richiesta (non un errore suo né un indirizzo sbagliato): diventano `fonte-rifiuta`. */
const STATI_RIFIUTO = new Set([401, 403, 429, 451]);
/** Gli stati di redirect che si seguono (con `Location`). */
const STATI_REDIRECT = new Set([301, 302, 303, 307, 308]);
/** Redirect seguiti al più: oltre, lo scarico non riesce (un giro chiuso o una catena sospetta). */
export const MAX_REDIRECT = 5;

const ATTESA_RISPOSTA_PREDEFINITA = 30_000;
const INATTIVITA_PREDEFINITA = 120_000;

/** L'indirizzo, se è un http/https valido (`urlHttp`, la regola condivisa); altrimenti 400. */
export function urlValido(indirizzo: string): URL {
  let u: URL;
  try {
    u = new URL(indirizzo);
  } catch {
    throw httpErrors.badRequest('url-non-valido', 'L\'indirizzo indicato non è valido.');
  }
  const ammesso = urlHttp(u.href);
  if (!ammesso) throw httpErrors.badRequest('url-non-valido', 'Sono ammessi solo indirizzi http/https.');
  return new URL(ammesso);
}

/** Byte in megabyte (MiB) arrotondati all'intero, per i messaggi all'utente. */
const megabyte = (byte: number): number => Math.round(byte / 1024 / 1024);

/** L'errore di un indirizzo che porta alla rete interna: lo stesso per un IP scritto nell'URL, per un nome e per un redirect. */
function erroreReteInterna(host: string): Error {
  return httpErrors.badRequest('indirizzo-non-ammesso', `${host} porta a un indirizzo della rete interna: si scarica solo da siti pubblici.`, { host });
}

/** Un errore che `lookup` passa alla connessione e che va restituito com'è (non riformulato come «scarico fallito»). */
class ErroreReteInterna extends Error {
  constructor(public readonly host: string) {
    super(`${host}: indirizzo della rete interna`);
  }
}

/**
 * La risoluzione DNS della connessione: tutti gli indirizzi del nome, e se anche uno solo è interno la connessione non parte. Si risponde
 * nella forma che Node chiede (un indirizzo, oppure l'elenco con `all`, che la connessione usa per provare IPv4 e IPv6).
 */
const risolviSoloPubblici: LookupFunction = (nome, opzioni, richiama) => {
  risolviDns(nome, { ...opzioni, all: true }, (err: NodeJS.ErrnoException | null, indirizzi: LookupAddress[]) => {
    if (err) { richiama(err, ''); return; }
    if (indirizzi.length === 0 || indirizzi.some((a) => indirizzoInterno(a.address))) { richiama(new ErroreReteInterna(nome), ''); return; }
    if (opzioni.all) richiama(null, indirizzi);
    else richiama(null, indirizzi[0].address, indirizzi[0].family);
  });
};

/** Il nome dell'host senza le parentesi quadre di un IPv6 letterale. */
const hostNudo = (u: URL): string => (u.hostname.startsWith('[') && u.hostname.endsWith(']') ? u.hostname.slice(1, -1) : u.hostname);

/** Scarica il contenuto dell'indirizzo: intestazioni entro `attesaRispostaMs`, corpo a blocchi entro il tetto, nessun indirizzo interno. */
export async function scaricaDaUrl(indirizzo: string, opzioni: OpzioniScarico): Promise<{ contenuto: Buffer; mime: string; url: URL }> {
  const richiesto = urlValido(indirizzo);
  const attesaRisposta = opzioni.attesaRispostaMs ?? ATTESA_RISPOSTA_PREDEFINITA;
  const inattivita = opzioni.inattivitaMs ?? INATTIVITA_PREDEFINITA;
  const ctrl = new AbortController();
  let motivo: 'risposta' | 'inattivita' | null = null;
  let orologio: NodeJS.Timeout | null = null;
  /** Disarma il timer in corso, se c'è. */
  const fermaOrologio = (): void => { if (orologio) { clearTimeout(orologio); orologio = null; } };
  /** Riarma il timer da capo: allo scadere annota il motivo (`risposta` o `inattivita`) e interrompe la richiesta. */
  const armaOrologio = (ms: number, quale: 'risposta' | 'inattivita'): void => {
    fermaOrologio();
    orologio = setTimeout(() => { motivo = quale; ctrl.abort(); }, ms);
  };
  /** L'errore da lanciare quando lo scarico non riesce (restituito, non lanciato: così chi chiama scrive `throw`). */
  const erroreScarico = (u: URL, dettaglio: string): Error =>
    httpErrors.badRequest(opzioni.codiceScaricoFallito, `Impossibile scaricare ${opzioni.cosa} da ${u.host}: ${dettaglio}`);

  /** Una richiesta GET verso `u`: la risposta appena arrivano le intestazioni (il corpo si legge dopo). */
  const chiedi = (u: URL): Promise<IncomingMessage> => {
    // un IP scritto nell'URL non passa dalla risoluzione DNS: si controlla qui
    if (isIP(hostNudo(u)) !== 0 && indirizzoInterno(hostNudo(u))) return Promise.reject(erroreReteInterna(u.host));
    const modulo = u.protocol === 'https:' ? https : http;
    return new Promise<IncomingMessage>((risolvi, rifiuta) => {
      const req = modulo.request(u, {
        method: 'GET',
        headers: { Accept: opzioni.accept, ...opzioni.intestazioni },
        signal: ctrl.signal,
        // una connessione nuova per ogni richiesta: niente socket riusati da un agente condiviso
        agent: false,
        lookup: risolviSoloPubblici,
      }, risolvi);
      req.on('error', (err) => rifiuta(err instanceof ErroreReteInterna ? erroreReteInterna(u.host) : err));
      req.end();
    });
  };

  /** Segue i rinvii a mano, uno per uno e ognuno controllato: la risposta finale (non un rinvio) e il suo indirizzo. */
  const rispostaFinale = async (): Promise<{ res: IncomingMessage; u: URL }> => {
    let u = richiesto;
    for (let salti = 0; ; salti++) {
      let res: IncomingMessage;
      try {
        res = await chiedi(u);
      } catch (err) {
        if (err instanceof HttpError) throw err;
        throw motivo === 'risposta'
          ? erroreScarico(u, `nessuna risposta entro ${Math.round(attesaRisposta / 1000)} secondi.`)
          : erroreScarico(u, err instanceof Error ? err.message : String(err));
      }
      const stato = res.statusCode ?? 0;
      if (!STATI_REDIRECT.has(stato)) return { res, u };
      // un rinvio: il corpo non serve (si scarta, e un suo errore non conta più), e il prossimo indirizzo si controlla come il primo
      res.on('error', () => undefined);
      res.resume();
      const destinazione = res.headers.location;
      if (!destinazione) throw httpErrors.badRequest(opzioni.codiceScaricoFallito, `L'indirizzo ha risposto ${stato} senza dire dove andare: controlla che serva ${opzioni.cosa}.`);
      if (salti + 1 > MAX_REDIRECT) throw erroreScarico(u, `troppi rinvii (più di ${MAX_REDIRECT}).`);
      let prossimo: URL;
      try {
        prossimo = new URL(destinazione, u);
      } catch {
        throw erroreScarico(u, 'il rinvio porta a un indirizzo non valido.');
      }
      const ammesso = urlHttp(prossimo.href);
      if (!ammesso) throw httpErrors.badRequest('url-non-valido', `${u.host} rinvia a un indirizzo che non è http/https.`);
      u = new URL(ammesso);
    }
  };

  armaOrologio(attesaRisposta, 'risposta');
  let res: IncomingMessage;
  let u: URL;
  try {
    ({ res, u } = await rispostaFinale());
  } catch (err) {
    fermaOrologio();
    throw err;
  }

  // risposta arrivata: da qui conta solo l'inattività, non il tempo totale
  armaOrologio(inattivita, 'inattivita');
  try {
    const stato = res.statusCode ?? 0;
    // La fonte rifiuta (accesso negato, protezione anti-robot, troppe richieste): non si aggirano le protezioni di un sito altrui
    // (decisione del PM su LAY-2, L2). L'errore lo dice con un codice suo, e chi chiama propone di caricare l'immagine a mano.
    if (STATI_RIFIUTO.has(stato)) {
      res.destroy();
      throw httpErrors.badRequest('fonte-rifiuta', `${u.host} ha rifiutato la richiesta (${stato}): il sito non lascia scaricare ${opzioni.cosa} da un’app. Aprila dalla pagina della fonte e caricala dall’editor.`, { stato, host: u.host, url: u.toString() });
    }
    if (stato < 200 || stato > 299) { res.destroy(); throw httpErrors.badRequest(opzioni.codiceScaricoFallito, `L'indirizzo ha risposto ${stato}: controlla che serva ${opzioni.cosa}.`); }
    const dichiarati = Number(res.headers['content-length'] ?? '0');
    if (dichiarati > opzioni.maxByte) {
      res.destroy();
      throw httpErrors.badRequest(opzioni.codiceTroppoGrande, `Il file all'indirizzo pesa ${megabyte(dichiarati)} MB e supera il limite di ${megabyte(opzioni.maxByte)} MB.`);
    }
    const mime = (res.headers['content-type'] ?? '').split(';')[0].trim();

    const blocchi: Buffer[] = [];
    let ricevuti = 0;
    try {
      for await (const blocco of res as AsyncIterable<Buffer>) {
        armaOrologio(inattivita, 'inattivita');
        ricevuti += blocco.byteLength;
        // il tetto vale durante lo scarico: chi non dichiara la dimensione non può farci riempire la memoria
        if (ricevuti > opzioni.maxByte) {
          res.destroy();
          throw httpErrors.badRequest(opzioni.codiceTroppoGrande, `Il file all'indirizzo supera il limite di ${megabyte(opzioni.maxByte)} MB.`);
        }
        blocchi.push(blocco);
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw motivo === 'inattivita'
        ? erroreScarico(u, `trasferimento fermo da ${Math.round(inattivita / 1000)} secondi.`)
        : erroreScarico(u, err instanceof Error ? err.message : String(err));
    }
    if (ricevuti === 0) throw httpErrors.badRequest(opzioni.codiceScaricoFallito, 'L\'indirizzo ha risposto senza contenuto.');
    // `url` è l'indirizzo chiesto dall'utente (quello che resta come origine dell'immagine), non quello d'arrivo dopo i rinvii
    return { contenuto: Buffer.concat(blocchi), mime, url: richiesto };
  } finally {
    fermaOrologio();
  }
}
