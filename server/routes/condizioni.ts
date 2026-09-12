// ============================================================
// /api/condizioni — gli elenchi per l'editor delle condizioni e i progressi che le rendono vere
// ============================================================
//
// `/elenchi` è tutto ciò che l'editor può offrire come **valore** di una condizione: articoli,
// letture, arcani, Persona, abilità, Ladri, attività conteggiabili, negozi (con il loro programma
// punti), eventi di storia, contatori. Sono elenchi chiusi, letti dalla Guida: nell'editor non si
// scrive, si sceglie.
//
// `/partite/:id/progressi` distingue due cose. **Calcolati dalla partita**: gli eventi «entra in
// squadra» (letti da `membro_squadra_partita.in_squadra`, tre stati come i semafori), il grado
// cliente dei negozi che ce l'hanno (dalla spesa segnata), i contatori. **Da segnare**: gli eventi
// manuali residui, le attività che si contano per volte svolte (`tracciamento = 'svolta'`), i
// punti dei negozi con programma manuale. Segnare a mano una cosa calcolata è rifiutato (400).
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { prepared, nowIso } from '../db/dbService.js';
import { validate } from '../middleware/validate.js';
import { giocabili } from '../services/squadraService.js';
import { statoDisponibilitaPartita } from '../services/disponibilitaService.js';
import { leggiProgrammaPunti } from '../services/negoziService.js';
import { httpErrors } from '../utils/httpError.js';
import { CONTATORI, EVENTI_STORIA, RANGHI_CLIENTE, membroDellEvento } from '../../shared/condizioniSpillo.js';
import type { ProgressiPartitaDto } from '../../shared/types.js';

const router = Router();
const idPartita = z.coerce.number().int().positive();
const chiave = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const verificaPartita = (id: number) => { if (!prepared('SELECT 1 FROM partita WHERE id=?').get(id)) throw httpErrors.notFound('partita-non-trovata', 'Partita non trovata.'); };

/** I negozi con il loro programma punti (null se non ne hanno). */
function negoziConProgramma() {
  return (prepared('SELECT chiave, nome, programma_punti_json FROM negozio WHERE nascosto = 0 ORDER BY nome').all() as Array<{ chiave: string; nome: string; programma_punti_json: string | null }>)
    .map((n) => ({ chiave: n.chiave, nome: n.nome, programma: leggiProgrammaPunti(n.programma_punti_json) }));
}
/** Le attività che si contano per volte svolte: le sole che una condizione «svolta almeno n volte» può leggere. */
function attivitaConteggiabili() {
  return prepared("SELECT chiave, nome, tipo FROM attivita WHERE nascosto = 0 AND tracciamento = 'svolta' ORDER BY nome").all() as Array<{ chiave: string; nome: string; tipo: string }>;
}

router.get('/elenchi', (_req, res) => {
  res.json({
    articoli: prepared('SELECT a.chiave, COALESCE(a.nome_it, a.nome) AS nome, n.nome AS gruppo FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.nome, nome').all(),
    letture: prepared("SELECT chiave, COALESCE(nome_it, nome) AS nome, 'libro' AS categoria FROM libro WHERE nascosto = 0 UNION ALL SELECT chiave, COALESCE(nome_it, nome), 'film' FROM film WHERE nascosto = 0 ORDER BY nome").all(),
    arcani: prepared('SELECT DISTINCT arcana AS chiave, arcana AS nome FROM persona ORDER BY arcana').all(),
    persone: prepared('SELECT nome AS chiave, nome FROM persona ORDER BY nome').all(),
    abilita: prepared('SELECT nome AS chiave, nome FROM skill ORDER BY nome').all(),
    // I Ladri Fantasma per «in squadra»: chi sia la squadra lo dice il seed con `giocabile`.
    squadra: giocabili().map((p) => ({ chiave: p.chiave, nome: p.nome })),
    attivita: attivitaConteggiabili().map((a) => ({ chiave: a.chiave, nome: a.nome })),
    // Con il programma punti: l'editor offre «punti negozio» solo ai programmi manuali e «grado cliente» solo a chi ha il rango.
    negozi: negoziConProgramma().map((n) => ({ chiave: n.chiave, nome: n.nome, programma: n.programma?.calcolo ?? null })),
    eventi: EVENTI_STORIA.map((e) => ({ chiave: e.chiave, nome: e.nome, calcolato: membroDellEvento(e.chiave) !== null })),
    contatori: CONTATORI.map((c) => ({ chiave: c.chiave, nome: c.nome })),
  });
});

/** Gli stati di una partita: calcolati dalla partita e da segnare a mano, completi anche dove non c'è ancora una riga. */
function progressi(id: number): ProgressiPartitaDto {
  const st = statoDisponibilitaPartita(id);
  const nomiSquadra = new Map(giocabili().map((p) => [p.chiave, p.nome]));
  const eventiManuali = new Map((prepared('SELECT evento_chiave, avvenuto FROM evento_storia_partita WHERE partita_id = ?').all(id) as Array<{ evento_chiave: string; avvenuto: number }>).map((r) => [r.evento_chiave, r.avvenuto === 1]));
  const svolte = new Map((prepared('SELECT attivita_chiave, volte FROM attivita_svolta_partita WHERE partita_id = ?').all(id) as Array<{ attivita_chiave: string; volte: number }>).map((r) => [r.attivita_chiave, r.volte]));
  const punti = new Map((prepared('SELECT negozio_chiave, punti FROM punti_negozio_partita WHERE partita_id = ?').all(id) as Array<{ negozio_chiave: string; punti: number }>).map((r) => [r.negozio_chiave, r.punti]));
  const negozi = negoziConProgramma();
  return {
    eventi: EVENTI_STORIA.map((e) => {
      const membro = membroDellEvento(e.chiave);
      if (!membro) return { chiave: e.chiave, nome: e.nome, origine: 'manuale' as const, avvenuto: eventiManuali.get(e.chiave) ?? false };
      // Tre stati, come i semafori: in squadra, dichiarato fuori, non ancora segnato.
      const avvenuto = st.membriSquadra.has(membro) ? true : st.membriFuoriSquadra.has(membro) ? false : null;
      return { chiave: e.chiave, nome: e.nome, origine: 'calcolato' as const, avvenuto, membro, membroNome: nomiSquadra.get(membro) ?? membro };
    }),
    attivita: attivitaConteggiabili().map((a) => ({ ...a, volte: svolte.get(a.chiave) ?? 0 })),
    puntiNegozio: negozi.filter((n) => n.programma?.calcolo === 'manuale').map((n) => ({ negozio: n.chiave, nome: n.nome, programma: n.programma!.nome, unita: n.programma!.unita, punti: punti.get(n.chiave) ?? 0 })),
    rangoCliente: negozi.filter((n) => n.programma?.calcolo === 'rango-cliente').map((n) => {
      const spesa = st.spesaPerNegozio.get(n.chiave) ?? 0;
      const attuale = [...RANGHI_CLIENTE].reverse().find((x) => spesa >= x.spesa) ?? RANGHI_CLIENTE[0];
      const prossimo = RANGHI_CLIENTE.find((x) => x.spesa > spesa) ?? null;
      return { negozio: n.chiave, nome: n.nome, programma: n.programma!.nome, spesa, rango: { chiave: attuale.chiave, nome: attuale.nome }, prossimo: prossimo ? { chiave: prossimo.chiave, nome: prossimo.nome, spesa: prossimo.spesa } : null };
    }),
    contatori: CONTATORI.map((c) => ({ chiave: c.chiave, nome: c.nome, valore: st.contatori.get(c.chiave) ?? 0 })),
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
  // «Entra in squadra» si legge dalla squadra della partita: si segna lì, non qui.
  if (membroDellEvento(evento)) throw httpErrors.badRequest('evento-calcolato', 'Questo evento si calcola dalla squadra della partita (Partita → Denaro e squadra): non si segna a mano.');
  const { avvenuto } = req.body as { avvenuto: boolean };
  prepared('INSERT INTO evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, evento_chiave) DO UPDATE SET avvenuto = excluded.avvenuto, updated_at = excluded.updated_at').run(id, evento, avvenuto ? 1 : 0, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  res.json(progressi(id));
});

router.put('/partite/:partita/attivita/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ volte: z.number().int().min(0).max(999) }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  const attivita = String(req.params.chiave);
  const riga = prepared('SELECT tracciamento FROM attivita WHERE chiave = ?').get(attivita) as { tracciamento: string } | undefined;
  if (!riga) throw httpErrors.notFound('attivita-non-trovata', 'Attività non trovata.');
  if (riga.tracciamento !== 'svolta') throw httpErrors.badRequest('attivita-non-conteggiabile', 'Questa attività non si conta per volte svolte.');
  const { volte } = req.body as { volte: number };
  prepared('INSERT INTO attivita_svolta_partita (partita_id, attivita_chiave, volte, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, attivita_chiave) DO UPDATE SET volte = excluded.volte, updated_at = excluded.updated_at').run(id, attivita, volte, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  res.json(progressi(id));
});

router.put('/partite/:partita/punti-negozio/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ punti: z.number().int().min(0).max(999999) }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  const negozio = String(req.params.chiave);
  const riga = prepared('SELECT programma_punti_json FROM negozio WHERE chiave = ?').get(negozio) as { programma_punti_json: string | null } | undefined;
  if (!riga) throw httpErrors.notFound('negozio-non-trovato', 'Negozio non trovato.');
  if (leggiProgrammaPunti(riga.programma_punti_json)?.calcolo !== 'manuale') throw httpErrors.badRequest('negozio-senza-punti', 'Questo negozio non ha un programma punti da segnare a mano.');
  const { punti } = req.body as { punti: number };
  prepared('INSERT INTO punti_negozio_partita (partita_id, negozio_chiave, punti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, negozio_chiave) DO UPDATE SET punti = excluded.punti, updated_at = excluded.updated_at').run(id, negozio, punti, nowIso());
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  res.json(progressi(id));
});

export default router;
