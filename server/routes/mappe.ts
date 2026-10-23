// ============================================================
// Route /api/mappe — mappe, spilli, percorsi, contenuti della guida, accesso ai luoghi, piante dei quartieri, import/export
// ============================================================
//
// Le mappe e gli spilli sono dati di gioco condivisi fra le partite; lo stato per partita (raccolto, ottenuto, acquistato) passa
// dal parametro `partita` delle letture e dalle rotte di /api/partite. Le rotte dei marcatori, che qui c'erano, sono uscite con
// la verifica completa (O10, 2026-10-04).
// ============================================================

import { risolviPercorsoMappa, contenutiMappa } from '../services/mappe/contenutiGuidaService.js';
import { risolviAccessoMondo } from '../services/mappe/accessoMondoService.js';
import { impostaInfiltrazioniDellaPlanimetria, presentazioneDellaPlanimetria, stanzaDellaPlanimetria } from '../services/mappe/areeService.js';
import { TIPI_ACCESSO_MONDO, type TipoAccessoMondo } from '../../shared/accessoMondo.js';
import { vociCollegabili } from '../services/dungeonService.js';
import { Router } from 'express';
import { z } from 'zod';
import { boolQuery } from '../schemas/comuni.js';
import { validate } from '../middleware/validate.js';
import { scaricaPiantaQuartiere } from '../services/cittaService.js';
import express from 'express';
import { MAX_BYTE_IMMAGINE } from '../services/immaginiService.js';
import { aggiornaCopiaPezzoMappa, aggiornaImmagineSpillo, aggiornaMappa, creaCopiaPezzoMappa, creaPezzoMappa, eliminaCopiaPezzoMappa, eliminaPezzoMappa, aggiornaSpillo, aggiungiImmagineSpillo, cercaRiferimenti, conteggiAlbero, creaMappa, creaPassaggio, creaSpillo, dettaglioMappa, elencaMappe, eliminaImmagineSpillo, eliminaMappa, eliminaSpillo, esportaMappe, importaMappe, impostaAreeMappa, impostaImmagineMappa, impostaStanzaMappa, aggiornaPresentazioneMappa, riordinaMappe, type DatiMappa, type DatiSpillo } from '../services/mappe/mappeService.js';
import { bodyAggiornaCopiaPezzo, bodyAggiornaMappa, bodyCreaCopiaPezzo, bodyAggiornaSpillo, bodyCreaPezzo, bodyAreeMappa, bodyCreaMappa, bodyCreaPassaggio, bodyCreaSpillo, bodyImmagineSpillo, bodyImporta, bodyPresentazioneMappa, bodyRiordinaMappe, bodyStanzaMappa, paramsCopiaPezzo, paramsMappa, paramsPezzo, paramsSpillo, queryDidascalia, queryEsporta, queryGerarchia, queryGuidaMappa, queryImmagineMappa, queryMappa, queryRiferimenti } from '../schemas/mappe.js';
import { guidaDellaPlanimetria } from '../services/dungeonService.js';
import { gerarchiaMappe } from '../services/mappe/gerarchiaMappe.js';
import { httpErrors } from '../utils/httpError.js';
import { precondizioneRaccordoSpillo, type DatiAggiornaSpillo } from '../services/mappe/mappeService.js';
import { queryPrecondizioneRaccordo } from '../schemas/mappe.js';
import { precondizioneRimozioneSpillo } from '../services/mappe/mappeService.js';
import { bodyRimozionePin, queryPrecondizioneRimozionePin } from '../schemas/mappe.js';
import type { RichiestaRimozionePin } from '../../shared/rimozionePin.js';

const router = Router();
// Chiave libera ma limitata: un indirizzo scritto a mano che non corrisponde a nulla resta un 404 «mappa-non-trovata», non un 400.
const paramsChiaveLibera = z.object({ chiave: z.string().min(1).max(200) });
router.get('/risolvi/:chiave', validate({ params: paramsChiaveLibera }), (req,res) => res.json(risolviPercorsoMappa(String(req.params.chiave))));
router.get('/contenuti/:chiave', validate({ params: paramsChiaveLibera, query: queryMappa }), (req,res) => res.json(contenutiMappa(String(req.params.chiave), (req.query as unknown as {partita?:number}).partita)));

/** Accesso comune ai luoghi da città, Palazzi, negozi e articoli. */
router.get('/accesso/:tipo/:chiave', validate({ params: z.object({ tipo: z.enum(TIPI_ACCESSO_MONDO), chiave: z.string().min(1).max(200) }) }), (req, res) => {
  res.json(risolviAccessoMondo(req.params.tipo as TipoAccessoMondo, String(req.params.chiave)));
});

/** Scarica nell'istanza la mappa del quartiere dall'indirizzo collegato nei dati di gioco (`pianta_quartiere`). */
// L1 (F5): sulla mappa del quartiere con pezzi la sostituzione chiede conferma (409 `mappa-con-pezzi`, `?eliminaPezzi=1`).
router.post('/piante-citta/:quartiere/scarica', validate({ params: z.object({ quartiere: z.string().min(1).max(80) }), query: queryImmagineMappa }), async (req, res) => {
  res.status(201).json(await scaricaPiantaQuartiere(String(req.params.quartiere), { eliminaPezzi: (req.query as { eliminaPezzi?: string }).eliminaPezzi === '1' }));
});

// ---- Mappe a livelli e spilli (Fase 13) ----

/** Albero completo delle mappe (riassunti con genitore e conteggi; ogni nodo con i conteggi dei pin del suo sottoalbero, E2 di L3). */
router.get('/albero', validate({ query: queryMappa }), (req, res) => {
  res.json(elencaMappe((req.query as unknown as { partita?: number }).partita));
});

/** L11 B5: la gerarchia dei luoghi (Città › Quartieri › Aree › Planimetrie, Città › Palazzi › Aree › Planimetrie) con casa e conteggi di ogni nodo. */
router.get('/gerarchia', validate({ query: queryGerarchia }), (req, res) => {
  res.json(gerarchiaMappe((req.query as unknown as { partita?: number }).partita));
});

/** I conteggi dei pin della radice dell'indice delle Mappe: tutto l'albero nei tre gruppi (E2 di L3). */
router.get('/albero/conteggi', (_req, res) => {
  res.json(conteggiAlbero());
});

/** Pacchetto JSON con mappe, spilli e immagini dell'istanza (base64); con `radice` solo quella mappa e le discendenti. */
router.get('/esporta', validate({ query: queryEsporta }), (req, res) => {
  const q = req.query as unknown as { radice?: string };
  res.setHeader('Content-Disposition', `attachment; filename="mappe-${q.radice ?? 'tutte'}.json"`);
  res.json(esportaMappe(q.radice));
});


/** Importa un pacchetto (stesso formato dell'esportazione). L'origine di mappe e pin è quella del pacchetto (difetto NR3-2 di L3: la
 *  rotta la forzava a «utente», e un esporta → importa trasformava i pin del seed in pin dell'utente); dove il pacchetto non la porta
 *  (pacchetti di prima di L3) vale «utente», come prima. Solo il seed la forza. */
router.post('/importa', validate({ body: bodyImporta }), (req, res) => {
  const b = req.body as { pacchetto: Parameters<typeof importaMappe>[0]; sovrascrivi?: boolean };
  res.json(importaMappe(b.pacchetto, { sovrascrivi: b.sovrascrivi ?? false }));
});

/** Entità collegabili a uno spillo (editor): per tipo e testo. */
router.get('/riferimenti', validate({ query: queryRiferimenti }), (req, res) => {
  const q = req.query as unknown as { tipo: Parameters<typeof cercaRiferimenti>[0]; q: string; limite?: number };
  res.json(cercaRiferimenti(q.tipo, q.q ?? '', q.limite));
});

/** Ordine logico delle planimetrie di un Palazzo (o dei figli di una qualsiasi mappa): l'elenco è l'ordine. */
router.put('/ordine', validate({ body: bodyRiordinaMappe }), (req, res) => {
  const { genitore, chiavi } = req.body as { genitore: string | null; chiavi: string[] };
  res.json(riordinaMappe(genitore, chiavi));
});

router.post('/', validate({ body: bodyCreaMappa }), (req, res) => {
  const { chiave, ...dati } = req.body as { chiave?: string } & DatiMappa & { nome: string; tipo: DatiMappa['tipo'] & string };
  res.status(201).json(creaMappa(chiave, dati as DatiMappa & { nome: string; tipo: NonNullable<DatiMappa['tipo']> }));
});
router.get('/:chiave', validate({ params: paramsMappa, query: queryMappa }), (req, res) => {
  const q = req.query as unknown as { partita?: number; infiltrazione?: string };
  res.json(dettaglioMappa(String(req.params.chiave), q.partita, q.infiltrazione ?? null));
});
/** L3 «planimetria della voce»: le voci della guida che stanno sulla planimetria (con pin su di lei, o senza pin e con lei come
 *  planimetria), per infiltrazione e ordine, con lo stato della partita. Sola lettura: il visore non filtra da sé. */
router.get('/:chiave/guida', validate({ params: paramsMappa, query: queryGuidaMappa }), (req, res) => {
  res.json(guidaDellaPlanimetria(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
router.put('/:chiave', validate({ params: paramsMappa, body: bodyAggiornaMappa }), (req, res) => {
  res.json(aggiornaMappa(String(req.params.chiave), req.body as DatiMappa));
});
/** Le infiltrazioni della planimetria: si passa l'insieme, risponde con le infiltrazioni in ordine di guida. Rotta vecchia (L3 §3.3): per
 *  una planimetria con Area sono i legami dell'Area; per le mappe senza Area (Memento) resta quella di prima. */
router.put('/:chiave/aree', validate({ params: paramsMappa, body: bodyAreeMappa }), (req, res) => {
  const chiave = String(req.params.chiave);
  const aree = (req.body as { aree: string[] }).aree;
  res.json({ aree: impostaInfiltrazioniDellaPlanimetria(chiave, aree) ?? impostaAreeMappa(chiave, aree) });
});
// L2: la planimetria dell'ingresso di un quartiere si elimina con `?conferma=1` (l'ingresso se ne va con lei)
router.delete('/:chiave', validate({ params: paramsMappa, query: z.object({ conferma: boolQuery }) }), (req, res) => {
  eliminaMappa(String(req.params.chiave), { conferma: (req.query as { conferma?: boolean }).conferma === true });
  res.status(204).end();
});
/** Raggruppamento della planimetria: l'Area (nome, o un'altra Area) e l'etichetta della sua versione. Rotta vecchia (L3 §3.3): per una
 *  planimetria con Area agisce sull'Area; per le mappe senza Area resta quella di prima (gruppo d'immagini). */
router.put('/:chiave/presentazione', validate({ params: paramsMappa, body: bodyPresentazioneMappa }), (req, res) => {
  const chiave = String(req.params.chiave);
  const dati = req.body as Parameters<typeof aggiornaPresentazioneMappa>[1];
  res.json(presentazioneDellaPlanimetria(chiave, dati) ? dettaglioMappa(chiave) : aggiornaPresentazioneMappa(chiave, dati));
});
/** L'Area della planimetria: entra in quella di un'altra (`con`) o diventa un'Area a sé (`con: null`). Rotta vecchia (L3 §3.3): per
 *  le mappe senza Area resta quella di prima (gruppo d'immagini). */
router.put('/:chiave/stanza', validate({ params: paramsMappa, body: bodyStanzaMappa }), (req, res) => {
  const chiave = String(req.params.chiave);
  const dati = req.body as { con: string | null; nome?: string };
  res.json(stanzaDellaPlanimetria(chiave, dati) ? dettaglioMappa(chiave) : impostaStanzaMappa(chiave, dati));
});

/** Immagine di base (corpo grezzo `image/*`): salvata nell'istanza nell'ambito «mappa» con la chiave della mappa. */
router.put('/:chiave/immagine', validate({ params: paramsMappa, query: queryImmagineMappa }), express.raw({ type: 'image/*', limit: MAX_BYTE_IMMAGINE }), (req, res) => {
  const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw httpErrors.badRequest('immagine-vuota', 'Invia il file dell\'immagine come corpo grezzo con Content-Type image/*.');
  res.json(impostaImmagineMappa(String(req.params.chiave), mime, req.body, { eliminaPezzi: (req.query as { eliminaPezzi?: string }).eliminaPezzi === '1' }));
});
router.post('/:chiave/spilli', validate({ params: paramsMappa, body: bodyCreaSpillo }), (req, res) => {
  res.status(201).json(creaSpillo(String(req.params.chiave), req.body as DatiSpillo & { tipo: NonNullable<DatiSpillo['tipo']>; nome: string; x: number; y: number }));
});
/** Passaggio verso un'altra mappa in un punto libero scelto dal server (albero dell'editor, 15.24); 409 se esiste già. */
router.post('/:chiave/passaggi', validate({ params: paramsMappa, body: bodyCreaPassaggio }), (req, res) => {
  res.status(201).json(creaPassaggio(String(req.params.chiave), (req.body as { destinazione: string }).destinazione));
});
/** Impronta volatile per collegare un pin personale senza alterarne gli altri campi. */
router.get('/spilli/:id/precondizione-raccordo', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
}, validate({ params: paramsSpillo, query: queryPrecondizioneRaccordo }), (req, res) => {
  res.json(precondizioneRaccordoSpillo(Number(req.params.id), String(req.query.luogo), typeof req.query.areaLuogo === 'string' ? req.query.areaLuogo : undefined));
});
router.put('/spilli/:id', validate({ params: paramsSpillo, body: bodyAggiornaSpillo }), (req, res) => {
  res.json(aggiornaSpillo(Number(req.params.id), req.body as DatiAggiornaSpillo));
});
router.get('/spilli/:id/precondizione-rimozione', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
}, validate({ params: paramsSpillo, query: queryPrecondizioneRimozionePin }), (req, res) => {
  res.json(precondizioneRimozioneSpillo(Number(req.params.id)));
});
router.delete('/spilli/:id', validate({ params: paramsSpillo, body: bodyRimozionePin }), (req, res) => {
  eliminaSpillo(Number(req.params.id), req.body as RichiestaRimozionePin | undefined);
  res.status(204).end();
});
/** I pezzi della planimetria (102): zone dell'immagine scelte nell'editor, posate altrove con le condizioni che li mostrano, in una o
 *  più copie (103). Il pezzo nasce con la sua prima copia; eliminata l'ultima copia se ne va anche il pezzo. */
router.post('/:chiave/pezzi', validate({ params: paramsMappa, body: bodyCreaPezzo }), (req, res) => {
  res.status(201).json(creaPezzoMappa(String(req.params.chiave), req.body as Parameters<typeof creaPezzoMappa>[1]));
});
router.delete('/pezzi/:id', validate({ params: paramsPezzo }), (req, res) => {
  eliminaPezzoMappa(Number(req.params.id));
  res.status(204).end();
});
router.post('/pezzi/:id/copie', validate({ params: paramsPezzo, body: bodyCreaCopiaPezzo }), (req, res) => {
  res.status(201).json(creaCopiaPezzoMappa(Number(req.params.id), req.body as Parameters<typeof creaCopiaPezzoMappa>[1]));
});
router.put('/pezzi/copie/:id', validate({ params: paramsCopiaPezzo, body: bodyAggiornaCopiaPezzo }), (req, res) => {
  res.json(aggiornaCopiaPezzoMappa(Number(req.params.id), req.body as Parameters<typeof aggiornaCopiaPezzoMappa>[1]));
});
router.delete('/pezzi/copie/:id', validate({ params: paramsCopiaPezzo }), (req, res) => {
  res.json(eliminaCopiaPezzoMappa(Number(req.params.id)));
});
/** Le voci della guida che l'editor può collegare allo spillo (098): si collegano e scollegano con `/compendio/punti/:chiave/pin/:spillo`. */
router.get('/spilli/:id/voci-collegabili', validate({ params: paramsSpillo }), (req, res) => {
  res.json(vociCollegabili(Number(req.params.id)));
});
/** Schermata di riferimento dello spillo (corpo grezzo `image/*`, didascalia opzionale nella query). */
router.post('/spilli/:id/immagini', validate({ params: paramsSpillo, query: queryDidascalia }), express.raw({ type: 'image/*', limit: MAX_BYTE_IMMAGINE }), (req, res) => {
  const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw httpErrors.badRequest('immagine-vuota', 'Invia il file dell\'immagine come corpo grezzo con Content-Type image/*.');
  res.status(201).json(aggiungiImmagineSpillo(Number(req.params.id), mime, req.body, (req.query as unknown as { didascalia?: string }).didascalia ?? ''));
});
router.put('/spilli/immagini/:id', validate({ params: paramsSpillo, body: bodyImmagineSpillo }), (req, res) => {
  res.json(aggiornaImmagineSpillo(Number(req.params.id), req.body as { didascalia?: string; ordine?: number }));
});
router.delete('/spilli/immagini/:id', validate({ params: paramsSpillo }), (req, res) => {
  res.json(eliminaImmagineSpillo(Number(req.params.id)));
});

export default router;
