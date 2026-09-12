// ============================================================
// Route /api/impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10)
// ============================================================
//
// L'esportazione risponde con un file binario (`res.download` / `res.send`), quindi NON passa dall'envelope `{ data }`
// del middleware, che tocca solo `res.json`. Il ripristino riceve il file come corpo grezzo.
// ============================================================

import express, { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import fs from 'node:fs';
import { MAX_BYTE_RIPRISTINO, copiaDatabase, copiaIstanza, ripristinaIstanza, statoIstanza } from '../services/impostazioniService.js';
import { anteprimaPacchetto, anteprimaPacchettoDaDeposito, elencaDeposito, importaPacchetto, importaPacchettoDaDeposito, importaPacchettoDaUrl, scaricaPacchettoDaUrl, statoImportazione } from '../services/pacchettoGiocoService.js';
import { httpErrors } from '../utils/httpError.js';

const router = Router();

/** Il corpo grezzo di un file caricato (ZIP o database), entro il limite del ripristino. */
const corpoFile = express.raw({ type: ['application/octet-stream', 'application/zip', 'application/vnd.sqlite3', 'application/x-sqlite3'], limit: MAX_BYTE_RIPRISTINO });
function fileCaricato(req: express.Request, cosa: string): Buffer {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw httpErrors.badRequest('file-mancante', `Invia ${cosa} come corpo grezzo (Content-Type application/octet-stream).`);
  return req.body;
}

/** Stato dell'istanza: versioni, dimensioni, conteggi. */
router.get('/istanza', (_req, res) => {
  res.json(statoIstanza());
});

/** Scarica il database dei dati di gioco: è il pacchetto di gioco (immagini comprese, partite escluse). */
router.get('/istanza/database', (_req, res, next) => {
  void (async () => {
    try {
      const { percorso, nome } = await copiaDatabase();
      res.setHeader('Content-Type', 'application/vnd.sqlite3');
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
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
      res.send(contenuto);
    } catch (err) {
      next(err);
    }
  })();
});

/** Sostituisce l'istanza con il file caricato (database .db o ZIP dell'istanza). */
router.put('/istanza', corpoFile, (req, res, next) => {
  void (async () => {
    try {
      res.json(await ripristinaIstanza(fileCaricato(req, 'il file di backup')));
    } catch (err) {
      next(err);
    }
  })();
});

// ---- Pacchetto di gioco (voce 10): il solo gioco.db, immagini comprese, senza le partite ----
// Il download è `GET /istanza/database` (lo stesso file). Qui l'anteprima e l'importazione, in due forme:
// con il file nel corpo (istanza locale) oppure con un indirizzo da cui il server se lo prende (istanza
// pubblicata: il proxy davanti rifiuterebbe un corpo da centinaia di MB).

/** L'indirizzo da cui scaricare il pacchetto, per le due rotte «da indirizzo». */
const corpoUrl = z.object({ url: z.string().url().max(2000) });

/** Anteprima dell'importazione: legge il file e dice che cosa cambierebbe, senza sostituire nulla. */
router.post('/istanza/gioco/anteprima', corpoFile, (req, res, next) => {
  try {
    res.json(anteprimaPacchetto(fileCaricato(req, 'il pacchetto di gioco')));
  } catch (err) {
    next(err);
  }
});

/** Sostituisce i dati di gioco con il pacchetto; le partite restano. */
router.put('/istanza/gioco', corpoFile, (req, res, next) => {
  void (async () => {
    try {
      res.json(await importaPacchetto(fileCaricato(req, 'il pacchetto di gioco')));
    } catch (err) {
      next(err);
    }
  })();
});

/** Anteprima del pacchetto che sta a un indirizzo: lo scarica il server. */
router.post('/istanza/gioco/anteprima-da-url', validate({ body: corpoUrl }), (req, res, next) => {
  void (async () => {
    try {
      res.json(anteprimaPacchetto(await scaricaPacchettoDaUrl((req.body as { url: string }).url)));
    } catch (err) {
      next(err);
    }
  })();
});

/** Sostituisce i dati di gioco con il pacchetto che sta a un indirizzo: lo scarica il server. */
router.put('/istanza/gioco/da-url', validate({ body: corpoUrl }), (req, res, next) => {
  void (async () => {
    try {
      res.json(await importaPacchettoDaUrl((req.body as { url: string }).url));
    } catch (err) {
      next(err);
    }
  })();
});

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

/** A che punto è l'importazione: si interroga quando la risposta non arriva (un proxy può chiudere prima). */
router.get('/istanza/gioco/importazione', (_req, res) => {
  res.json(statoImportazione());
});

export default router;
