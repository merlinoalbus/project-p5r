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
import { getDb, prepared, nowIso } from '../db/dbService.js';
import { validate } from '../middleware/validate.js';
import { giocabili } from '../services/squadraService.js';
import { nomiCondizioni, nomiCondizioniMemo, pinConStato, vociCitabili } from '../services/condizioni/nomiCondizioni.js';
import { tuttiGliInviti } from '../services/condizioni/condizioneEffettiva.js';
import { apertureDalDiario, apertureDichiarabili } from '../services/apertureDedaliService.js';
import { censimentoLuoghiCondizioni } from '../services/censimentoLuoghiCondizioniService.js';
import { fotografieIngressoMemento } from '../services/fotografieIngressoMementoService.js';
import { statoAlGiorno, statoDisponibilitaPartita } from '../services/disponibilitaService.js';
import { valutazione } from '../services/condizioni/valutatore.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { impostaEventoStoria, ranghiPerEvento } from '../services/semaforiService.js';
import { leggiProgrammaPunti } from '../services/negoziService.js';
import { verificaPartita } from '../services/verificaPartita.js';
import { dataGioco, idParam } from '../schemas/comuni.js';
import { effettiDelTurno, impostaVolteAttivita } from '../services/attivitaService.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../shared/attivita.js';
import { httpErrors } from '../utils/httpError.js';
import { CONTATORI, EVENTI_STORIA, RANGHI_CLIENTE, dataValida, membroDellEvento, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type { ElenchiRegoleDto, PinConStatoDto, ProgressiPartitaDto, RispostaValutaCondizioniDto, VoceCitabileDto } from '../../shared/types.js';

const router = Router();
const idPartita = idParam;
const chiave = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);

/** Proiezione mirata per riconciliare gli inventari L5/L6; non converte o corregge dati. */
router.get('/censimento', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(censimentoLuoghiCondizioni());
});

router.get('/censimento/fotografie-ingresso-memento', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(fotografieIngressoMemento());
});

/** I negozi con il loro programma punti (null se non ne hanno). */
function negoziConProgramma() {
  return (prepared('SELECT chiave, nome, programma_punti_json FROM negozio WHERE nascosto = 0 ORDER BY nome').all() as Array<{ chiave: string; nome: string; programma_punti_json: string | null }>)
    .map((n) => ({ chiave: n.chiave, nome: n.nome, programma: leggiProgrammaPunti(n.programma_punti_json) }));
}
/** Le attività che si contano per volte svolte: le sole che una condizione «svolta almeno n volte» può leggere. */
function attivitaConteggiabili() {
  // contata per volte come la intendono i turni (`attivitaConTurni`): un valore fuori catalogo vale quello del tipo
  return (prepared('SELECT chiave, nome, tipo, tracciamento, effetti_json FROM attivita WHERE nascosto = 0 ORDER BY nome').all() as Array<{ chiave: string; nome: string; tipo: string; tracciamento: string; effetti_json: string | null }>)
    .filter((a) => (eTracciamentoAttivita(a.tracciamento) ? a.tracciamento : tracciamentoPerTipo(a.tipo)) === 'svolta')
    .map(({ effetti_json, tracciamento: _t, ...a }) => ({ ...a, effettiTurno: effettiDelTurno({ effetti_json }) }));
}

router.get('/elenchi', (_req, res) => {
  const elenchi: ElenchiRegoleDto = {
    allerte: prepared('SELECT DISTINCT chiave,nome FROM allerta_meteo ORDER BY nome').all() as NonNullable<ElenchiRegoleDto['allerte']>,
    articoli: prepared('SELECT a.chiave, COALESCE(a.nome_it, a.nome) AS nome, n.nome AS gruppo FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.nome, nome').all() as ElenchiRegoleDto['articoli'],
    letture: prepared("SELECT chiave, COALESCE(nome_it, nome) AS nome, 'libro' AS categoria FROM libro WHERE nascosto = 0 UNION ALL SELECT chiave, COALESCE(nome_it, nome), 'film' FROM film WHERE nascosto = 0 ORDER BY nome").all() as ElenchiRegoleDto['letture'],
    arcani: prepared('SELECT DISTINCT arcana AS chiave, arcana AS nome FROM persona ORDER BY arcana').all() as ElenchiRegoleDto['arcani'],
    // L6 (R6-03): Persona e abilità si scelgono per nome e si salvano per id
    persone: prepared('SELECT CAST(id AS TEXT) AS chiave, nome FROM persona ORDER BY nome').all() as ElenchiRegoleDto['persone'],
    abilita: prepared('SELECT CAST(id AS TEXT) AS chiave, nome FROM skill ORDER BY nome').all() as ElenchiRegoleDto['abilita'],
    // I Ladri Fantasma per «in squadra»: chi sia la squadra lo dice il seed con `giocabile`.
    squadra: giocabili().map((p) => ({ chiave: p.chiave, nome: p.nome })),
    attivita: attivitaConteggiabili().map((a) => ({ chiave: a.chiave, nome: a.nome })),
    // Con il programma punti: l'editor offre «punti negozio» solo ai programmi manuali e «grado cliente» solo a chi ha il rango.
    negozi: negoziConProgramma().map((n) => ({ chiave: n.chiave, nome: n.nome, programma: n.programma?.calcolo ?? null })),
    eventi: EVENTI_STORIA.map((e) => ({ chiave: e.chiave, nome: e.nome, calcolato: membroDellEvento(e.chiave) !== null })),
    contatori: CONTATORI.map((c) => ({ chiave: c.chiave, nome: c.nome })),
    // L6: luoghi, tutti i quartieri e gli inviti (questi ultimi si leggono soltanto)
    luoghi: prepared('SELECT l.chiave, l.nome, q.nome AS gruppo FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.nascosto = 0 ORDER BY q.ordine, l.ordine').all() as NonNullable<ElenchiRegoleDto['luoghi']>,
    quartieri: prepared("SELECT chiave, nome FROM quartiere WHERE chiave <> 'mementos' ORDER BY ordine").all() as NonNullable<ElenchiRegoleDto['quartieri']>,
    inviti: (() => { const n = nomiCondizioniMemo(); return tuttiGliInviti().map((i) => ({ chiave: i.chiave, nome: n.inviti?.[i.chiave] ?? i.chiave, gruppo: n.confidenti?.[i.confidente_chiave] ?? i.confidente_chiave, confidente: i.confidente_chiave })); })(),
  };
  res.json(elenchi);
});

/** I pin con uno stato, per la condizione «Pin di una mappa» (2026-10-03): solo l'editor delle mappe li chiede, a parte, perché
 *  sono centinaia e agli altri editor non servono. */
router.get('/spilli', (_req, res) => {
  const spilli: PinConStatoDto[] = pinConStato().map((p) => ({ chiave: p.uid, nome: p.nome, tipo: p.tipo, gruppo: p.mappa, parola: p.parola }));
  res.json(spilli);
});

/** Le voci della guida dei Palazzi e dei Memento, per la condizione «Voce della guida» (2026-10-11): come i pin, solo l'editor delle mappe le chiede. */
router.get('/voci', (_req, res) => {
  const voci: VoceCitabileDto[] = vociCitabili().map((v) => ({ chiave: v.chiave, nome: v.nome, tipo: v.tipo, gruppo: v.posto }));
  res.json(voci);
});

/** Gli stati di una partita: calcolati dalla partita e da segnare a mano, completi anche dove non c'è ancora una riga. */
function progressi(id: number): ProgressiPartitaDto {
  const st = statoDisponibilitaPartita(id);
  const nomiSquadra = new Map(giocabili().map((p) => [p.chiave, p.nome]));
  const eventiManuali = new Map((prepared('SELECT evento_chiave, avvenuto FROM evento_storia_partita WHERE partita_id = ?').all(id) as Array<{ evento_chiave: string; avvenuto: number }>).map((r) => [r.evento_chiave, r.avvenuto === 1]));
  const dalDiario = apertureDalDiario(id);
  // R10-22/3: da quale voce del Diario viene un evento di storia (l'effetto «storia» della spunta, ancora attiva), e solo se la voce l'ha
  // segnato davvero: se l'evento era già segnato prima della spunta (`prima.gia`) non è stata la voce

  const dalleVoci = new Map<string, Array<{ uid: string; giorno: string; testo: string }>>();
  for (const r of prepared("SELECT s.chiave, v.uid, v.data AS giorno, v.azione AS testo FROM effetto_stato_voce s JOIN main.voce_giornata v ON v.uid = s.voce_uid WHERE s.partita_id = ? AND s.tipo = 'storia' AND json_extract(s.prima_json, '$.gia') = 0 ORDER BY v.data, v.fascia, v.ordine").all(id) as Array<{ chiave: string; uid: string; giorno: string; testo: string }>) {
    dalleVoci.set(r.chiave, [...(dalleVoci.get(r.chiave) ?? []), { uid: r.uid, giorno: r.giorno, testo: r.testo }]);
  }
  const nomiAperture = new Map(apertureDichiarabili().map((a) => [a.chiave, a.nome]));
  const svolte = new Map((prepared('SELECT attivita_chiave, volte FROM attivita_svolta_partita WHERE partita_id = ?').all(id) as Array<{ attivita_chiave: string; volte: number }>).map((r) => [r.attivita_chiave, r.volte]));
  const punti = new Map((prepared('SELECT negozio_chiave, punti FROM punti_negozio_partita WHERE partita_id = ?').all(id) as Array<{ negozio_chiave: string; punti: number }>).map((r) => [r.negozio_chiave, r.punti]));
  const negozi = negoziConProgramma();
  // a che cosa serve segnarlo: i ranghi dei Confidenti che lo chiedono (il caffè al Leblanc → Sojiro, rango 3)
  const serveA = ranghiPerEvento();
  return {
    eventi: EVENTI_STORIA.map((e) => {
      const membro = membroDellEvento(e.chiave);
      if (!membro) return { chiave: e.chiave, nome: nomiAperture.get(e.chiave) ?? e.nome, origine: 'manuale' as const,
        avvenuto: (eventiManuali.get(e.chiave) ?? false) || dalDiario.has(e.chiave), manuale: eventiManuali.get(e.chiave) ?? false,
        ...(nomiAperture.has(e.chiave) ? { dalDiario: dalDiario.has(e.chiave), visiteDiario: dalDiario.get(e.chiave) ?? [] } : {}),
        ...(dalleVoci.has(e.chiave) ? { daVoci: dalleVoci.get(e.chiave) } : {}),
        ...(serveA.has(e.chiave) ? { serveA: serveA.get(e.chiave) } : {}) };
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

/**
 * L6 (§2, §6.1): l'anteprima dell'esito, col valutatore unico. Per ogni condizione esito («vero», «falso», «avviso», «grigio»), testo e cosa
 * manca; più l'esito dell'insieme (tutte le condizioni insieme, in AND). Con `giorno` si valuta la partita a quel giorno di gioco (il resto
 * della partita resta com'è). L'interfaccia mostra questi esiti e non rivaluta (R6-02).
 */
router.post('/valuta', validate({ body: z.object({ condizioni: z.array(condizioneSpillo).max(20), partita: idPartita, giorno: dataGioco.optional() }) }), (req, res) => {
  const { condizioni, partita, giorno } = req.body as { condizioni: RequisitoSpillo[]; partita: number; giorno?: string };
  verificaPartita(partita);
  if (giorno && !dataValida(giorno)) throw httpErrors.badRequest('giorno-non-valido', 'Il giorno non esiste nel calendario di gioco.');
  const base = statoDisponibilitaPartita(partita);
  const st = giorno ? statoAlGiorno(base, giorno) : base;
  const nomi = nomiCondizioni({ conPin: true });
  const insieme: RequisitoSpillo = condizioni.length === 1 ? condizioni[0] : { tipo: 'gruppo', modo: 'tutte', condizioni };
  const risposta: RispostaValutaCondizioniDto = {
    complessivo: condizioni.length ? valutazione(insieme, st, nomi) : { esito: 'vero', testo: 'Nessuna condizione' },
    condizioni: condizioni.map((c) => valutazione(c, st, nomi)),
  };
  res.json(risposta);
});

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
  // lo stesso dato del «Condizione soddisfatta» dei Confidenti (`confermaRequisito`); evento e data di modifica della partita
  // cambiano insieme o per niente
  getDb().transaction(() => {
    impostaEventoStoria(id, evento, avvenuto);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), id);
  })();
  res.json(progressi(id));
});

router.put('/partite/:partita/attivita/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ volte: z.number().int().min(0).max(999) }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  // ogni turno aggiunto o tolto dice le Doti che dà (o dava), da segnare a mano: le Doti non si toccano
  const { volte } = req.body as { volte: number };
  const daSegnare = impostaVolteAttivita(id, String(req.params.chiave), volte);
  res.json({ ...progressi(id), daSegnare });
});

router.put('/partite/:partita/punti-negozio/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ punti: z.number().int().min(0).max(999999) }) }), (req, res) => {
  const id = Number(req.params.partita); verificaPartita(id);
  const negozio = String(req.params.chiave);
  const riga = prepared('SELECT programma_punti_json FROM negozio WHERE chiave = ?').get(negozio) as { programma_punti_json: string | null } | undefined;
  if (!riga) throw httpErrors.notFound('negozio-non-trovato', 'Negozio non trovato.');
  if (leggiProgrammaPunti(riga.programma_punti_json)?.calcolo !== 'manuale') throw httpErrors.badRequest('negozio-senza-punti', 'Questo negozio non ha un programma punti da segnare a mano.');
  const { punti } = req.body as { punti: number };
  getDb().transaction(() => {
    const adesso = nowIso();
    prepared('INSERT INTO punti_negozio_partita (partita_id, negozio_chiave, punti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, negozio_chiave) DO UPDATE SET punti = excluded.punti, updated_at = excluded.updated_at').run(id, negozio, punti, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, id);
  })();
  res.json(progressi(id));
});

export default router;
