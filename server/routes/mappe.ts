// ============================================================
// Route /api/mappe — marcatori delle mappe interattive (dati dell'utente, condivisi fra le partite)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { impostaMarcatore, scaricaPianta } from '../services/dungeonService.js';
import { impostaMarcatoreLuogo, scaricaPiantaQuartiere } from '../services/cittaService.js';
import express from 'express';
import { MAX_BYTE_IMMAGINE } from '../services/immaginiService.js';
import { aggiornaImmagineSpillo, aggiornaMappa, aggiornaSpillo, aggiungiImmagineSpillo, cercaRiferimenti, creaMappa, creaPacchettoRepository, creaSpillo, dettaglioMappa, elencaMappe, eliminaImmagineSpillo, eliminaMappa, eliminaSpillo, esportaMappe, importaMappe, impostaImmagineMappa, mappaPerEntita, type DatiMappa, type DatiSpillo } from '../services/mappe/mappeService.js';
import { bodyAggiornaMappa, bodyAggiornaSpillo, bodyCreaMappa, bodyCreaSpillo, bodyImmagineSpillo, bodyImporta, paramsMappa, paramsSpillo, queryDidascalia, queryEsporta, queryMappa, queryRiferimenti } from '../schemas/mappe.js';
import { httpErrors } from '../utils/httpError.js';

const bodyMarcatoreLuogo = z.object({ luogo: z.string().min(1).max(200), x: z.number().min(0).max(100).nullable(), y: z.number().min(0).max(100).nullable() });

const bodyMarcatore = z.object({ punto: z.string().min(1).max(200), x: z.number().min(0).max(100).nullable(), y: z.number().min(0).max(100).nullable() });
const router = Router();

/** Fissa (x, y in percentuale) o rimuove (x/y null) lo spillo del punto sulla mappa della sua area. */
router.put('/marcatori', validate({ body: bodyMarcatore }), (req, res) => {
  const b = req.body as { punto: string; x: number | null; y: number | null };
  res.json({ punto: b.punto, marcatore: impostaMarcatore(b.punto, b.x === null || b.y === null ? null : { x: b.x, y: b.y }) });
});

/** Scarica nell'istanza la pianta dell'area dalla guida collegata nel seed (immagine mai nel repository). */
router.post('/piante/:area/scarica', validate({ params: z.object({ area: z.string().min(1).max(120) }) }), async (req, res) => {
  res.status(201).json(await scaricaPianta(String(req.params.area)));
});

/** Fissa o rimuove lo spillo di un luogo sulla mappa del quartiere. */
router.put('/marcatori-luoghi', validate({ body: bodyMarcatoreLuogo }), (req, res) => {
  const b = req.body as { luogo: string; x: number | null; y: number | null };
  res.json({ luogo: b.luogo, marcatore: impostaMarcatoreLuogo(b.luogo, b.x === null || b.y === null ? null : { x: b.x, y: b.y }) });
});

/** Scarica nell'istanza la mappa del quartiere dalla fonte collegata nel seed. */
router.post('/piante-citta/:quartiere/scarica', validate({ params: z.object({ quartiere: z.string().min(1).max(80) }) }), async (req, res) => {
  res.status(201).json(await scaricaPiantaQuartiere(String(req.params.quartiere)));
});

// ---- Mappe a livelli e spilli (Fase 13) ----

/** Albero completo delle mappe (riassunti con genitore e conteggi). */
router.get('/albero', (_req, res) => {
  res.json(elencaMappe());
});

/** Pacchetto JSON con mappe, spilli e immagini dell'istanza (base64); con `radice` solo quella mappa e le discendenti. */
router.get('/esporta', validate({ query: queryEsporta }), (req, res) => {
  const q = req.query as unknown as { radice?: string; immaginiSpilli?: string };
  res.setHeader('Content-Disposition', `attachment; filename="mappe-${q.radice ?? 'tutte'}.json"`);
  res.json(esportaMappe(q.radice, { immaginiSpilli: q.immaginiSpilli === '1' }));
});

/** ZIP per il repository: seed della mappa (e discendenti) + asset delle immagini. */
router.get('/esporta.zip', validate({ query: queryEsporta.required({ radice: true }) }), (req, res) => {
  const q = req.query as unknown as { radice: string; immaginiSpilli?: string };
  const z = creaPacchettoRepository(q.radice, { immaginiSpilli: q.immaginiSpilli === '1' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${z.nomeFile}"`);
  res.send(z.contenuto);
});

/** Importa un pacchetto (stesso formato dell'esportazione). */
router.post('/importa', express.json({ limit: '64mb' }), validate({ body: bodyImporta }), (req, res) => {
  const b = req.body as { pacchetto: Parameters<typeof importaMappe>[0]; sovrascrivi?: boolean };
  res.json(importaMappe(b.pacchetto, { sovrascrivi: b.sovrascrivi ?? false, origine: 'utente' }));
});

/** Entità collegabili a uno spillo (editor): per tipo e testo. */
router.get('/riferimenti', validate({ query: queryRiferimenti }), (req, res) => {
  const q = req.query as unknown as { tipo: Parameters<typeof cercaRiferimenti>[0]; q: string; limite?: number };
  res.json(cercaRiferimenti(q.tipo, q.q ?? '', q.limite));
});

/** Mappa collegata a un'entità della guida (quartiere, area, dungeon). */
router.get('/entita/:tipo/:chiave', validate({ params: z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }) }), (req, res) => {
  const m = mappaPerEntita(String(req.params.tipo), String(req.params.chiave));
  if (!m) throw httpErrors.notFound('mappa-non-trovata', 'Nessuna mappa collegata a questa entità.');
  res.json(m);
});

router.post('/', validate({ body: bodyCreaMappa }), (req, res) => {
  const { chiave, ...dati } = req.body as { chiave: string } & DatiMappa & { nome: string; tipo: DatiMappa['tipo'] & string };
  res.status(201).json(creaMappa(chiave, dati as DatiMappa & { nome: string; tipo: NonNullable<DatiMappa['tipo']> }));
});
router.get('/:chiave', validate({ params: paramsMappa, query: queryMappa }), (req, res) => {
  const q = req.query as unknown as { partita?: number };
  res.json(dettaglioMappa(String(req.params.chiave), q.partita));
});
router.put('/:chiave', validate({ params: paramsMappa, body: bodyAggiornaMappa }), (req, res) => {
  res.json(aggiornaMappa(String(req.params.chiave), req.body as DatiMappa));
});
router.delete('/:chiave', validate({ params: paramsMappa }), (req, res) => {
  eliminaMappa(String(req.params.chiave));
  res.status(204).end();
});
/** Immagine di base (corpo grezzo `image/*`): salvata nell'istanza nell'ambito «mappa» con la chiave della mappa. */
router.put('/:chiave/immagine', validate({ params: paramsMappa }), express.raw({ type: 'image/*', limit: MAX_BYTE_IMMAGINE }), (req, res) => {
  const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw httpErrors.badRequest('immagine-vuota', 'Invia il file dell\'immagine come corpo grezzo con Content-Type image/*.');
  res.json(impostaImmagineMappa(String(req.params.chiave), mime, req.body));
});
router.post('/:chiave/spilli', validate({ params: paramsMappa, body: bodyCreaSpillo }), (req, res) => {
  res.status(201).json(creaSpillo(String(req.params.chiave), req.body as DatiSpillo & { tipo: NonNullable<DatiSpillo['tipo']>; nome: string; x: number; y: number }));
});
router.put('/spilli/:id', validate({ params: paramsSpillo, body: bodyAggiornaSpillo }), (req, res) => {
  res.json(aggiornaSpillo(Number(req.params.id), req.body as DatiSpillo & { mappa?: string }));
});
router.delete('/spilli/:id', validate({ params: paramsSpillo }), (req, res) => {
  eliminaSpillo(Number(req.params.id));
  res.status(204).end();
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
