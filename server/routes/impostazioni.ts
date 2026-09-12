// ============================================================
// Route /api/impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10)
//
// I file grossi passano dalla CARTELLA D'APPOGGIO condivisa (il NAS montato, `DEPOSITO_DIR`): ogni
// scaricamento ne lascia lì una copia, e da lì si sceglie che cosa reimportare o ripristinare. Il
// browser non trasporta più centinaia di MB, quindi i limiti di corpo di nginx e dei tunnel non contano.
// ============================================================
//
// L'esportazione risponde con un file binario (`res.download` / `res.send`), quindi NON passa dall'envelope `{ data }`
// del middleware, che tocca solo `res.json`.
//
// **Nessun file viaggia più nel corpo di una richiesta.** Un pacchetto da centinaia di MB non attraversa
// il proxy di un'istanza pubblicata (nginx lo taglia, il tunnel pure) e il browser vede solo un errore
// immediato: importazione e ripristino leggono dalla cartella d'appoggio, dove ogni scaricamento lascia
// comunque una copia.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import fs from 'node:fs';
import { copiaDatabase, copiaIstanza, elencaDepositoBackup, ripristinaIstanzaDaDeposito, statoIstanza } from '../services/impostazioniService.js';
import { depositaContenuto, depositaCopia } from '../services/depositoService.js';
import { anteprimaPacchettoDaDeposito, elencaDeposito, importaPacchettoDaDeposito, statoImportazione } from '../services/pacchettoGiocoService.js';

const router = Router();

/** Stato dell'istanza: versioni, dimensioni, conteggi. */
router.get('/istanza', (_req, res) => {
  res.json(statoIstanza());
});

/** Scarica il database dei dati di gioco: è il pacchetto di gioco (immagini comprese, partite escluse). */
router.get('/istanza/database', (_req, res, next) => {
  void (async () => {
    try {
      const { percorso, nome } = await copiaDatabase();
      // una copia resta nella cartella d'appoggio: il file è insieme salvato e già pronto per il reimport
      const depositato = depositaCopia(percorso, nome);
      res.setHeader('Content-Type', 'application/vnd.sqlite3');
      if (depositato) res.setHeader('X-Deposito-File', depositato);
      res.download(percorso, nome, () => fs.rmSync(percorso, { force: true }));
    } catch (err) {
      next(err);
    }
  })();
});

/** Scarica l'istanza completa: database, immagini caricate, caratteri, manifesto. */
router.get('/istanza/completa.zip', (_req, res, next) => {
  void (async () => {
    try {
      const { contenuto, nome } = await copiaIstanza();
      // come per il pacchetto: una copia resta nella cartella d'appoggio, pronta per un ripristino
      const depositato = depositaContenuto(contenuto, nome);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
      if (depositato) res.setHeader('X-Deposito-File', depositato);
      res.send(contenuto);
    } catch (err) {
      next(err);
    }
  })();
});

// ---- Pacchetto di gioco (voce 10): il solo gioco.db, immagini comprese, senza le partite ----
// Il download è `GET /istanza/database` (lo stesso file). Qui l'anteprima e l'importazione, in due forme:
// con il file nel corpo (istanza locale) oppure con un indirizzo da cui il server se lo prende (istanza
// pubblicata: il proxy davanti rifiuterebbe un corpo da centinaia di MB).

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
router.put('/istanza/gioco/deposito', validate({ body: corpoFileDeposito }), (req, res, next) => {
  void (async () => {
    try {
      res.json(await importaPacchettoDaDeposito((req.body as { nome: string }).nome));
    } catch (err) {
      next(err);
    }
  })();
});

/** Che cosa c'è nella cartella d'appoggio per il ripristino dell'istanza (ZIP o database). */
router.get('/istanza/deposito', (_req, res) => {
  res.json(elencaDepositoBackup());
});

/** Ripristina l'istanza da un file depositato: lo legge il server. */
router.put('/istanza/deposito', validate({ body: corpoFileDeposito }), (req, res, next) => {
  void (async () => {
    try {
      res.json(await ripristinaIstanzaDaDeposito((req.body as { nome: string }).nome));
    } catch (err) {
      next(err);
    }
  })();
});

/** A che punto è l'importazione: si interroga quando la risposta non arriva (un proxy può chiudere prima). */
router.get('/istanza/gioco/importazione', (_req, res) => {
  res.json(statoImportazione());
});

export default router;
