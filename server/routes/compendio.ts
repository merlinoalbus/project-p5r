// ============================================================
// Route /api/compendio — letture del compendio Royal
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { domande } from '../services/domandeService.js';
import { calendario } from '../services/calendarioService.js';
import { dettaglioDungeon, elencaDungeon } from '../services/dungeonService.js';
import { richieste } from '../services/richiesteService.js';
import { battaglia } from '../services/battagliaService.js';
import { aggiornaArea, aggiornaDungeon, aggiornaPunto, collegaPinAlPunto, creaArea, creaPunto, eliminaArea, eliminaPunto, spostaPunto } from '../services/dungeonService.js';
import { bodyArea, bodyDungeon, bodyNuovaArea, bodyNuovoPunto, bodyPunto, bodySpostaPunto, paramsChiaveGuida, paramsPinDelPunto } from '../schemas/guidaDungeon.js';
import { dettaglioQuartiere, elencaLuoghi, elencaQuartieri, impostaIngressoQuartiere } from '../services/cittaService.js';
import { attivitaTutte, filmDvdTutti, videogiochiTutti, libriTutti } from '../services/attivitaService.js';
import { cruciverba } from '../services/cruciverbaService.js';
import { dettaglioNegozio, elencaNegozi, ricercaArticoli } from '../services/negoziService.js';
import { giornoPercorso, indicePercorso } from '../services/percorsoService.js';
import { elenchiAzione } from '../services/azioniStrutturateService.js';
import { aggiornaVoce, creaVoce, eliminaVoce, spostaVoce } from '../services/giornataService.js';
import { completamento } from '../services/completamentoService.js';
import { datiGuida } from '../services/richiesteService.js';
import { httpErrors } from '../utils/httpError.js';
import type { DatiVoceGiornata, OggettiGuidaDto, PersonaggiDto, SfideDto } from '../../shared/types.js';
import { validate } from '../middleware/validate.js';
import { bodyAggiornaVoce, bodyDotiIncontro, bodyNuovaVoce, bodySpostaVoce, paramsGiornoGuida, paramsId, paramsVoceGiornata, queryOggetti, queryPersona, querySkill } from '../schemas/compendio.js';
import type { DoteNote } from '../../shared/effettiAzione.js';
import {
  dettaglioPersona, dettaglioSkill, elencaArcani, dettaglioConfidente, impostaDotiIncontro, elencaConfidenti, elencaOggetti, elencaPersona, elencaSkill, glossario, regoleFusione, terminiGlossario,
} from '../services/compendioService.js';

const queryDomande = z.object({ partita: z.coerce.number().int().positive().optional() });
const CATEGORIE_ARTICOLO = ['arma', 'protezione', 'accessorio', 'abito', 'consumabile', 'regalo', 'materiale', 'cibo', 'cura', 'sp', 'battaglia', 'stato', 'esplorazione', 'oggetto-chiave', 'libro', 'film', 'dvd', 'videogioco', 'altro'] as const;
const queryArticoli = z.object({
  q: z.string().min(1).max(80).optional(),
  categoria: z.enum(CATEGORIE_ARTICOLO).optional(),
  /** Più categorie insieme, separate da virgola. */
  categorie: z.string().max(400).optional().transform((v) => v ? v.split(',').map((c) => c.trim()).filter((c) => (CATEGORIE_ARTICOLO as readonly string[]).includes(c)) : undefined),
  per: z.string().min(1).max(40).optional(),
  stato: z.enum(['acquistati', 'da-acquistare']).optional(),
  disponibilita: z.enum(['disponibili', 'bloccati']).optional(),
  partita: z.coerce.number().int().positive().optional(),
});
const queryCalendario = z.object({ partita: z.coerce.number().int().positive().optional(), mese: z.string().regex(/^(0[1-9]|1[0-2])$/).optional() });
const router = Router();

router.get('/arcani', (_req, res) => {
  res.json(elencaArcani());
});

router.get('/glossario', (_req, res) => {
  res.json(glossario());
});

router.get('/termini', (_req, res) => {
  res.json(terminiGlossario());
});

router.get('/fusione/regole', (_req, res) => {
  res.json(regoleFusione());
});

router.get('/persona', validate({ query: queryPersona }), (req, res) => {
  const q = req.query as unknown as import('../schemas/compendio.js').QueryPersona;
  res.json(elencaPersona(q));
});

router.get('/persona/:id', validate({ params: paramsId }), (req, res) => {
  res.json(dettaglioPersona(Number(req.params.id)));
});

router.get('/skill', validate({ query: querySkill }), (req, res) => {
  const q = req.query as { q?: string; elemento?: string };
  res.json(elencaSkill(q));
});

router.get('/skill/:id', validate({ params: paramsId }), (req, res) => {
  res.json(dettaglioSkill(Number(req.params.id)));
});

router.get('/oggetti', validate({ query: queryOggetti }), (req, res) => {
  const q = req.query as { q?: string; categoria?: string };
  res.json(elencaOggetti(q));
});

router.get('/confidenti', (_req, res) => {
  res.json(elencaConfidenti());
});
router.get('/oggetti-guida', (_req, res) => {
  const dati = datiGuida<OggettiGuidaDto>('oggetti-guida');
  if (!dati) throw httpErrors.notFound('oggetti-non-disponibili', 'I dati degli oggetti della guida non sono caricati.');
  // Gli oggetti della guida hanno solo un nome; il crosswalk versionato dice quali di essi sono
  // anche articoli del catalogo, e per quelli la riga può arrivare alla mappa. Gli altri no, e va
  // bene così: un abbinamento incerto porterebbe nel posto sbagliato.
  const ponte = datiGuida<{ abbinamenti: Array<{ nome: string; articolo?: string; negozi: string[] }> }>('oggetti-crosswalk');
  if (ponte) {
    const per = new Map(ponte.abbinamenti.map((a) => [a.nome, a]));
    const lega = (v: { nome: string; articolo?: string; negozi?: string[] }) => {
      const a = per.get(v.nome);
      if (!a) return;
      if (a.articolo) v.articolo = a.articolo; else v.negozi = a.negozi;
    };
    for (const v of dati.consumabili ?? []) lega(v);
    for (const v of dati.chiaveEMateriali ?? []) lega(v);
  }
  res.json(dati);
});
router.get('/personaggi', (_req, res) => {
  const dati = datiGuida<PersonaggiDto>('personaggi');
  if (!dati) throw httpErrors.notFound('personaggi-non-disponibili', 'I dati dei personaggi non sono caricati.');
  res.json(dati);
});
router.get('/sfide', (_req, res) => {
  const dati = datiGuida<SfideDto>('sfide');
  if (!dati) throw httpErrors.notFound('sfide-non-disponibili', 'I dati delle sfide non sono caricati.');
  res.json(dati);
});
router.get('/completamento', validate({ query: queryDomande }), (req, res) => {
  res.json(completamento((req.query as unknown as { partita?: number }).partita));
});
router.get('/percorso', validate({ query: queryDomande }), (req, res) => {
  res.json(indicePercorso((req.query as unknown as { partita?: number }).partita));
});
router.get('/percorso/:data', validate({ params: z.object({ data: z.string().regex(/^\d{2}-\d{2}$/) }), query: queryDomande }), (req, res) => {
  res.json(giornoPercorso(String(req.params.data), (req.query as unknown as { partita?: number }).partita));
});
/** Gli elenchi per classificare, collegare e dare effetti a un'azione della giornata. */
router.get('/percorso-elenchi', (_req, res) => {
  res.json(elenchiAzione());
});
// Le voci della giornata sono canone (file di gioco, per tutte le partite): aggiungere al posto esatto, modificare (anche
// fascia e posto), spostare di un passo, eliminare. `?partita=` facoltativo: la risposta porta lo stato nella partita.
router.post('/percorso/:data/voci', validate({ params: paramsGiornoGuida, body: bodyNuovaVoce, query: queryDomande }), (req, res) => {
  res.status(201).json(creaVoce(String(req.params.data), req.body as DatiVoceGiornata, (req.query as unknown as { partita?: number }).partita));
});
router.put('/percorso/voci/:uid', validate({ params: paramsVoceGiornata, body: bodyAggiornaVoce, query: queryDomande }), (req, res) => {
  res.json(aggiornaVoce(String(req.params.uid), req.body as DatiVoceGiornata, (req.query as unknown as { partita?: number }).partita));
});
/** Sposta la voce di un passo nella sua fascia; risponde con tutte le voci del giorno, nel nuovo ordine. */
router.put('/percorso/voci/:uid/sposta', validate({ params: paramsVoceGiornata, body: bodySpostaVoce, query: queryDomande }), (req, res) => {
  res.json(spostaVoce(String(req.params.uid), (req.body as { verso: -1 | 1 }).verso, (req.query as unknown as { partita?: number }).partita));
});
router.delete('/percorso/voci/:uid', validate({ params: paramsVoceGiornata }), (req, res) => {
  eliminaVoce(String(req.params.uid));
  res.status(204).end();
});
router.get('/negozi', validate({ query: queryDomande }), (req, res) => {
  res.json(elencaNegozi((req.query as unknown as { partita?: number }).partita));
});
router.get('/negozi/:chiave', validate({ params: z.object({ chiave: z.string().min(1).max(80) }), query: queryDomande }), (req, res) => {
  res.json(dettaglioNegozio(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
router.get('/articoli', validate({ query: queryArticoli }), (req, res) => {
  const q = req.query as unknown as { q?: string; categoria?: string; categorie?: string[]; per?: string; stato?: 'acquistati' | 'da-acquistare'; disponibilita?: 'disponibili' | 'bloccati'; partita?: number };
  res.json(ricercaArticoli({ q: q.q, categoria: q.categoria, categorie: q.categorie, per: q.per, stato: q.stato, disponibilita: q.disponibilita }, q.partita));
});
/** Tutti i luoghi della città come voci da scegliere (la sede di un negozio o di un'attività). */
router.get('/luoghi', (_req, res) => {
  res.json(elencaLuoghi());
});
router.get('/cruciverba', validate({ query: queryDomande }), (req, res) => {
  res.json(cruciverba((req.query as unknown as { partita?: number }).partita));
});
router.delete('/citta/:chiave/ingresso',validate({params:z.object({chiave:z.string().min(1).max(80)})}),(req,res)=>{impostaIngressoQuartiere(String(req.params.chiave),null);res.status(204).end();});
router.put('/citta/:chiave/ingresso',validate({params:z.object({chiave:z.string().min(1).max(80)}),body:z.object({mappa:z.string().min(1).max(200),x:z.number().min(0).max(100),y:z.number().min(0).max(100),zoom:z.number().min(1).max(6).default(2.5)}).strict()}),(req,res)=>{res.json(impostaIngressoQuartiere(String(req.params.chiave),req.body));});
// Con `?partita` ogni quartiere dice anche se e' gia' nel mondo: le condizioni di sblocco non sono
// solo date, e senza la partita non si possono valutare.
router.get('/citta', validate({ query: queryDomande }), (req, res) => {
  res.json(elencaQuartieri((req.query as unknown as { partita?: number }).partita));
});
router.get('/citta/:chiave', validate({ params: z.object({ chiave: z.string().min(1).max(80) }), query: queryDomande }), (req, res) => {
  // La partita serve ai **luoghi**, non al quartiere: senza, l'elenco non può dire quali posti a
  // quel punto della partita non esistono ancora.
  res.json(dettaglioQuartiere(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
router.get('/attivita', validate({ query: queryDomande }), (req, res) => {
  res.json(attivitaTutte((req.query as unknown as { partita?: number }).partita));
});
router.get('/libri', validate({ query: queryDomande }), (req, res) => {
  res.json(libriTutti((req.query as unknown as { partita?: number }).partita));
});
router.get('/film', validate({ query: queryDomande }), (req, res) => {
  res.json(filmDvdTutti((req.query as unknown as { partita?: number }).partita));
});
router.get('/videogiochi', validate({ query: queryDomande }), (req, res) => {
  res.json(videogiochiTutti((req.query as unknown as { partita?: number }).partita));
});
router.get('/battaglia', (_req, res) => {
  res.json(battaglia());
});
router.get('/richieste', validate({ query: queryDomande }), (req, res) => {
  res.json(richieste((req.query as unknown as { partita?: number }).partita));
});
router.get('/dungeon', validate({ query: queryDomande }), (req, res) => {
  res.json(elencaDungeon((req.query as unknown as { partita?: number }).partita));
});
router.get('/dungeon/:chiave', validate({ query: queryDomande }), (req, res) => {
  res.json(dettaglioDungeon(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
/* ---- Correzione dei testi della guida: la sezione dei Palazzi non è più in sola lettura ---- */
router.put('/dungeon/:chiave', validate({ params: paramsChiaveGuida, body: bodyDungeon }), (req, res) => {
  res.json(aggiornaDungeon(String(req.params.chiave), req.body as Parameters<typeof aggiornaDungeon>[1]));
});
/** Una sezione nuova della guida del Palazzo, al posto scelto e, se data, nella planimetria (2026-10-01). */
router.post('/dungeon/:chiave/aree', validate({ params: paramsChiaveGuida, body: bodyNuovaArea }), (req, res) => {
  res.status(201).json(creaArea(String(req.params.chiave), req.body as Parameters<typeof creaArea>[1]));
});
router.put('/aree/:chiave', validate({ params: paramsChiaveGuida, body: bodyArea }), (req, res) => {
  res.json(aggiornaArea(String(req.params.chiave), req.body as Parameters<typeof aggiornaArea>[1]));
});
/** Elimina l'area della guida per tutte le partite, con i suoi punti e i suoi legami (2026-09-30). */
router.delete('/aree/:chiave', validate({ params: paramsChiaveGuida }), (req, res) => {
  eliminaArea(String(req.params.chiave));
  res.status(204).end();
});
router.post('/aree/:chiave/punti', validate({ params: paramsChiaveGuida, body: bodyNuovoPunto }), (req, res) => {
  res.status(201).json(creaPunto(String(req.params.chiave), req.body as Parameters<typeof creaPunto>[1]));
});
router.put('/punti/:chiave', validate({ params: paramsChiaveGuida, body: bodyPunto }), (req, res) => {
  res.json(aggiornaPunto(String(req.params.chiave), req.body as Parameters<typeof aggiornaPunto>[1]));
});
router.delete('/punti/:chiave', validate({ params: paramsChiaveGuida }), (req, res) => {
  eliminaPunto(String(req.params.chiave));
  res.status(204).end();
});
router.put('/punti/:chiave/sposta', validate({ params: paramsChiaveGuida, body: bodySpostaPunto }), (req, res) => {
  res.json(spostaPunto(String(req.params.chiave), (req.body as { verso: -1 | 1 }).verso));
});
/** I pin delle planimetrie che rappresentano il punto (2026-10-01): si collegano e si scollegano uno alla volta. */
router.put('/punti/:chiave/pin/:spillo', validate({ params: paramsPinDelPunto }), (req, res) => {
  const p = req.params as unknown as { chiave: string; spillo: number };
  res.json(collegaPinAlPunto(String(p.chiave), Number(p.spillo), true));
});
router.delete('/punti/:chiave/pin/:spillo', validate({ params: paramsPinDelPunto }), (req, res) => {
  const p = req.params as unknown as { chiave: string; spillo: number };
  res.json(collegaPinAlPunto(String(p.chiave), Number(p.spillo), false));
});

router.get('/calendario', validate({ query: queryCalendario }), (req, res) => {
  const q = req.query as unknown as { partita?: number; mese?: string };
  res.json(calendario(q.partita, q.mese));
});
router.get('/domande', validate({ query: queryDomande }), (req, res) => {
  res.json(domande((req.query as unknown as { partita?: number }).partita));
});
router.get('/confidenti/:chiave', (req, res) => {
  res.json(dettaglioConfidente(String(req.params.chiave)));
});
/** La Dote a ogni incontro, rango per rango (dato di gioco, come gli effetti di libri e attività). */
router.put('/confidenti/:chiave/doti-incontro', validate({ body: bodyDotiIncontro }), (req, res) => {
  res.json(impostaDotiIncontro(String(req.params.chiave), (req.body as { ranghi: Array<{ rango: number; doti: DoteNote[] }> }).ranghi));
});

export default router;
