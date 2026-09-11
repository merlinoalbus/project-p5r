// ============================================================
// /api/condizioni — gli elenchi per l'editor delle condizioni e i progressi che le rendono vere
// ============================================================
//
// `/elenchi` è tutto ciò che l'editor può offrire come **valore** di una condizione: articoli,
// letture, arcani, Persona, abilità, Ladri, attività, negozi, eventi di storia, contatori. Sono
// elenchi chiusi, letti dalla Guida: nell'editor non si scrive, si sceglie.
//
// `/partite/:id/progressi` sono i tre stati che la partita non può dedurre da altro e che si
// segnano a mano in Partita → Progressi: eventi di storia avvenuti, attività svolte (quante
// volte), punti fedeltà di un negozio. Qui c'era uno «stato» a nome libero (`fatto_gioco`) con
// un valore numerico qualsiasi: tolto dalla migrazione 064.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { prepared, nowIso } from '../db/dbService.js';
import { validate } from '../middleware/validate.js';
import { giocabili } from '../services/squadraService.js';
import { httpErrors } from '../utils/httpError.js';
import { CONTATORI, EVENTI_STORIA } from '../../shared/condizioniSpillo.js';

const router = Router();
const idPartita = z.coerce.number().int().positive();
const chiave = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const verificaPartita = (id: number) => { if (!prepared('SELECT 1 FROM partita WHERE id=?').get(id)) throw httpErrors.notFound('partita-non-trovata', 'Partita non trovata.'); };

router.get('/elenchi', (_req, res) => {
  res.json({
    articoli: prepared('SELECT a.chiave, COALESCE(a.nome_it, a.nome) AS nome, n.nome AS gruppo FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.nome, nome').all(),
    letture: prepared("SELECT chiave, COALESCE(nome_it, nome) AS nome, 'libro' AS categoria FROM libro WHERE nascosto = 0 UNION ALL SELECT chiave, COALESCE(nome_it, nome), 'film' FROM film WHERE nascosto = 0 ORDER BY nome").all(),
    arcani: prepared('SELECT DISTINCT arcana AS chiave, arcana AS nome FROM persona ORDER BY arcana').all(),
    persone: prepared('SELECT nome AS chiave, nome FROM persona ORDER BY nome').all(),
    abilita: prepared('SELECT nome AS chiave, nome FROM skill ORDER BY nome').all(),
    // I Ladri Fantasma per «in squadra»: chi sia la squadra lo dice il seed con `giocabile`.
    squadra: giocabili().map((p) => ({ chiave: p.chiave, nome: p.nome })),
    attivita: prepared('SELECT chiave, nome FROM attivita WHERE nascosto = 0 ORDER BY nome').all(),
    negozi: prepared('SELECT chiave, nome FROM negozio WHERE nascosto = 0 ORDER BY nome').all(),
    eventi: EVENTI_STORIA.map((e) => ({ chiave: e.chiave, nome: e.nome })),
    contatori: CONTATORI.map((c) => ({ chiave: c.chiave, nome: c.nome })),
  });
});

/** Gli stati segnati a mano di una partita, completi anche dove non c'è ancora una riga. */
function progressi(id: number) {
  const eventi = new Map((prepared('SELECT evento_chiave, avvenuto FROM evento_storia_partita WHERE partita_id = ?').all(id) as Array<{ evento_chiave: string; avvenuto: number }>).map((r) => [r.evento_chiave, r.avvenuto === 1]));
  const svolte = new Map((prepared('SELECT attivita_chiave, volte FROM attivita_svolta_partita WHERE partita_id = ?').all(id) as Array<{ attivita_chiave: string; volte: number }>).map((r) => [r.attivita_chiave, r.volte]));
  const punti = new Map((prepared('SELECT negozio_chiave, punti FROM punti_negozio_partita WHERE partita_id = ?').all(id) as Array<{ negozio_chiave: string; punti: number }>).map((r) => [r.negozio_chiave, r.punti]));
  return {
    eventi: EVENTI_STORIA.map((e) => ({ chiave: e.chiave, nome: e.nome, avvenuto: eventi.get(e.chiave) ?? false })),
    attivita: (prepared("SELECT chiave, nome, tipo FROM attivita WHERE nascosto = 0 AND tipo <> 'videogioco' ORDER BY nome").all() as Array<{ chiave: string; nome: string; tipo: string }>).map((a) => ({ ...a, volte: svolte.get(a.chiave) ?? 0 })),
    puntiNegozio: (prepared('SELECT chiave, nome FROM negozio WHERE nascosto = 0 ORDER BY nome').all() as Array<{ chiave: string; nome: string }>).map((n) => ({ negozio: n.chiave, nome: n.nome, punti: punti.get(n.chiave) ?? 0 })),
  };
}

router.get('/partite/:partita/progressi', validate({ params: z.object({ partita: idPartita }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  res.json(progressi(id));
});

router.put('/partite/:partita/eventi/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ avvenuto: z.boolean() }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  const evento = String(req.params.chiave);
  if (!EVENTI_STORIA.some((e) => e.chiave === evento)) throw httpErrors.notFound('evento-non-trovato', 'Evento di storia non trovato.');
  const { avvenuto } = req.body as { avvenuto: boolean };
  prepared('INSERT INTO evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, evento_chiave) DO UPDATE SET avvenuto = excluded.avvenuto, updated_at = excluded.updated_at').run(id, evento, avvenuto ? 1 : 0, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  res.json(progressi(id));
});

router.put('/partite/:partita/attivita/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ volte: z.number().int().min(0).max(999) }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  const attivita = String(req.params.chiave);
  if (!prepared('SELECT 1 FROM attivita WHERE chiave = ?').get(attivita)) throw httpErrors.notFound('attivita-non-trovata', 'Attività non trovata.');
  const { volte } = req.body as { volte: number };
  prepared('INSERT INTO attivita_svolta_partita (partita_id, attivita_chiave, volte, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, attivita_chiave) DO UPDATE SET volte = excluded.volte, updated_at = excluded.updated_at').run(id, attivita, volte, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  res.json(progressi(id));
});

router.put('/partite/:partita/punti-negozio/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ punti: z.number().int().min(0).max(999999) }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  const negozio = String(req.params.chiave);
  if (!prepared('SELECT 1 FROM negozio WHERE chiave = ?').get(negozio)) throw httpErrors.notFound('negozio-non-trovato', 'Negozio non trovato.');
  const { punti } = req.body as { punti: number };
  prepared('INSERT INTO punti_negozio_partita (partita_id, negozio_chiave, punti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, negozio_chiave) DO UPDATE SET punti = excluded.punti, updated_at = excluded.updated_at').run(id, negozio, punti, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  res.json(progressi(id));
});

export default router;
