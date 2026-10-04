// ============================================================
// Route /api/impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10)
//
// I file grossi passano dalla CARTELLA D'APPOGGIO condivisa (il NAS montato, `DEPOSITO_DIR`): ogni
// scaricamento ne lascia lì una copia, e da lì si sceglie che cosa reimportare o ripristinare. Il
// browser non trasporta più centinaia di MB, quindi i limiti di corpo di nginx e dei tunnel non contano.
//
// L'esportazione risponde con un file binario (`res.download` / `res.send`), quindi NON passa dall'envelope `{ data }`
// del middleware, che tocca solo `res.json`.
//
// **Nessun file viaggia più nel corpo di una richiesta.** Un pacchetto da centinaia di MB non attraversa
// il proxy di un'istanza pubblicata (nginx lo taglia, il tunnel pure) e il browser vede solo un errore
// immediato: importazione e ripristino leggono dalla cartella d'appoggio, dove ogni scaricamento lascia
// comunque una copia.
// ============================================================

import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getRequestLogger } from '../middleware/requestContext.js';
import fs from 'node:fs';
import { copiaDatabase, copiaIstanza, elencaDepositoBackup, ripristinaIstanzaDaDeposito, statoIstanza } from '../services/impostazioniService.js';
import { depositaCopia } from '../services/depositoService.js';
import { anteprimaPacchettoDaDeposito, elencaDeposito, importaPacchettoDaDeposito, statoImportazione } from '../services/pacchettoGiocoService.js';

const router = Router();

/** Stato dell'istanza: versioni, dimensioni, conteggi. */
router.get('/istanza', (_req, res) => {
  res.json(statoIstanza());
});

// Gli handler sono `async`: Express 5 passa da solo a `next` l'errore di una promessa rifiutata, quindi non servono le IIFE
// con `try/catch` di prima (rilievo F15 della verifica completa, 2026-10-03).

/**
 * Manda un file temporaneo appena prodotto e poi lo toglie. Prima ne lascia una copia nella cartella d'appoggio: il file è insieme
 * salvato e già pronto per il reimport o il ripristino.
 */
async function inviaECancella(res: Response, next: NextFunction, percorso: string, nome: string, tipo: string): Promise<void> {
  let depositato: string | null;
  try {
    depositato = await depositaCopia(percorso, nome);
  } catch (err) {
    // depositaCopia non solleva, ma il file temporaneo non deve restare se qualcosa va storto prima dell'invio
    fs.rmSync(percorso, { force: true });
    throw err;
  }
  res.setHeader('Content-Type', tipo);
  if (depositato) res.setHeader('X-Deposito-File', depositato);
  // In Express 5 l'errore dell'invio arriva solo a questa callback: va passato a `next`, altrimenti la richiesta resta
  // appesa; e la pulizia della copia temporanea non deve far cadere il processo se fallisce.
  res.download(percorso, nome, (errInvio) => {
    try {
      fs.rmSync(percorso, { force: true });
    } catch (errPulizia) {
      getRequestLogger().warn({ err: errPulizia, percorso }, 'file temporaneo dello scaricamento non rimosso');
    }
    if (errInvio) next(errInvio);
  });
}

/** Scarica il database dei dati di gioco: è il pacchetto di gioco (immagini comprese, partite escluse). */
router.get('/istanza/database', async (_req, res, next) => {
  const { percorso, nome } = await copiaDatabase();
  await inviaECancella(res, next, percorso, nome, 'application/vnd.sqlite3');
});

/** Scarica l'istanza completa: database, caratteri, manifesto. Lo ZIP si scrive a flusso in un temporaneo e si manda da lì. */
router.get('/istanza/completa.zip', async (_req, res, next) => {
  const { percorso, nome } = await copiaIstanza();
  await inviaECancella(res, next, percorso, nome, 'application/zip');
});

// ---- Pacchetto di gioco (voce 10): il solo gioco.db, immagini comprese, senza le partite ----
// Il download è `GET /istanza/database` (lo stesso file). L'anteprima e l'importazione leggono un file della
// cartella d'appoggio (sotto): dal browser parte solo il nome, in qualunque istanza, locale o pubblicata.

// ---- Cartella d'appoggio (il NAS montato): la strada normale per un'istanza pubblicata ----

/** Il nome del file depositato da leggere. */
const corpoFileDeposito = z.object({ nome: z.string().min(1).max(255) });

/** Che cosa c'è nella cartella d'appoggio. */
router.get('/istanza/gioco/deposito', (_req, res) => {
  res.json(elencaDeposito());
});

/** Anteprima di un pacchetto depositato: lo legge il server dal mount. */
router.post('/istanza/gioco/deposito/anteprima', validate({ body: corpoFileDeposito }), (req, res) => {
  res.json(anteprimaPacchettoDaDeposito((req.body as { nome: string }).nome));
});

/** Sostituisce i dati di gioco con un pacchetto depositato. */
router.put('/istanza/gioco/deposito', validate({ body: corpoFileDeposito }), async (req, res) => {
  res.json(await importaPacchettoDaDeposito((req.body as { nome: string }).nome));
});

/** Che cosa c'è nella cartella d'appoggio per il ripristino dell'istanza (ZIP o database). */
router.get('/istanza/deposito', (_req, res) => {
  res.json(elencaDepositoBackup());
});

/** Ripristina l'istanza da un file depositato: lo legge il server. */
router.put('/istanza/deposito', validate({ body: corpoFileDeposito }), async (req, res) => {
  res.json(await ripristinaIstanzaDaDeposito((req.body as { nome: string }).nome));
});

/** A che punto è l'importazione: si interroga quando la risposta non arriva (un proxy può chiudere prima). */
router.get('/istanza/gioco/importazione', (_req, res) => {
  res.json(statoImportazione());
});

export default router;
