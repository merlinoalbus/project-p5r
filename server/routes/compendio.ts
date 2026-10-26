// ============================================================
// Route /api/compendio — letture del compendio Royal
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { domande } from '../services/domandeService.js';
import { calendario, eventiDellaVoce } from '../services/calendarioService.js';
import { aggiornaGiorno, leggiGiorno, ripristinaGiorno } from '../services/giorniService.js';
import { METEO_GIORNO, type ModificaGiorno } from '../../shared/giorno.js';
import { correggiAffinita, ripristinaAffinita } from '../services/affinitaPersonaService.js';
import { ELEMENTI_AFFINITA, ESITI_AFFINITA } from '../../shared/elementi.js';
import type { ModificaAffinitaPersona } from '../../shared/affinitaPersona.js';
import { collegaSchedaAllaVoce, copieDelPalazzo, creaVoceDallaScheda, dettaglioDungeon, elencaDungeon } from '../services/dungeonService.js';
import { aggiornaRichiesta, citazioniRichiesta, collocaRichiesta, creaRichiesta, eliminaRichiesta, richieste } from '../services/richiesteService.js';
import { battaglia } from '../services/battagliaService.js';
import { dettaglioOmbra, elencaOmbre, verificaOmbre } from '../services/ombreService.js';
import { paramsOmbra, queryOmbra, queryOmbre, type QueryOmbre } from '../schemas/ombre.js';
import { negoziazione, negoziazioneCompatta, verificaNegoziazione } from '../services/negoziazioneService.js';
import { queryNegoziazione, type QueryNegoziazione } from '../schemas/negoziazione.js';
import { aggiornaArea, aggiornaAreaDedalo, aggiornaDungeon, ripristinaDungeon, aggiornaPunto, collegaPinAlPunto, copiaPuntiInArea, creaArea, impostaAreePalazzoInfiltrazione, creaAreaDedalo, creaPunto, eliminaArea, eliminaAreaDedalo, eliminaPunto, spostaAreaDedalo, spostaPunto, spostaPuntiInArea } from '../services/dungeonService.js';
import { bodyArea, bodyAreaDedalo, bodyAreePalazzoInfiltrazione, bodyAtterraggi, bodyCollocaRichiesta, bodyDungeon, bodyFinestraDungeon, bodyNuovaArea, bodyNuovaAreaDedalo, bodyNuovaRichiesta, bodyNuovoPunto, bodyPunto, bodyRequisitoRichiesta, bodyRichiesta, bodySpostaPunto, bodySpostaPuntiInArea, paramsChiaveGuida, paramsPinDelPunto, paramsRequisitoConfidente, querySchedaDungeon, bodyCreaVoceDallaScheda, bodyCollegaSchedaAllaVoce } from '../schemas/guidaDungeon.js';
import { correggiRequisitoRichiesta, impostaRequisitiRango, requisitiDelConfidente, ripristinaRequisitiRango, togliRequisitoRichiesta } from '../services/requisitiConfidentiService.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import type { Condizione } from '../../shared/condizioniSpillo.js';
import { aggiornaSbloccoQuartiere, dettaglioQuartiere, elencaLuoghi, elencaQuartieri, impostaIngressoQuartiere, ripristinaSbloccoQuartiere } from '../services/cittaService.js';
import { dettaglioLuogo } from '../services/luoghiService.js';
import { elencaInviti } from '../services/inviti.js';
import { paramsLuogo, queryLuogo } from '../schemas/luoghi.js';
import { bodyAnteprimaInformazioniConfidente, bodySalvaInformazioniConfidente } from '../schemas/disponibilitaConfidenti.js';
import { anteprimaInformazioniConfidente, informazioniConfidente, salvaInformazioniConfidente } from '../services/disponibilitaConfidentiService.js';
import type { AzioneInformazioniConfidente, SalvaInformazioniConfidente } from '../../shared/disponibilitaConfidenti.js';
import { attivitaTutte, filmDvdTutti, videogiochiTutti, libriTutti } from '../services/attivitaService.js';
import { cruciverba } from '../services/cruciverbaService.js';
import { dettaglioNegozio, elencaNegozi, ricercaArticoli } from '../services/negoziService.js';
import { giornoPercorso, indicePercorso } from '../services/percorsoService.js';
import { elenchiAzione, elenchiEffettiVoce } from '../services/azioniStrutturateService.js';
import { aggiornaVoce, creaVoce, eliminaVoce, impostaInfiltrazioniVoce, rivediVoce, spostaVoce, trasferisciVoci, vocePercorso } from '../services/giornataService.js';
import { salvaEffettiVoce, elencaProposteEffettiVoce, anteprimaDecisioneEffettoVoce, decidiPropostaEffettoVoce } from '../services/motoreDiario.js';
import { bodySalvaEffettiVoce, bodyAnteprimaDecisioneEffettoVoce, bodyDecisioneEffettoVoce } from '../schemas/acquisti.js';
import { applicaPropostaConversione, elencaProposteConversione, scartaPropostaConversione } from '../services/proposteConversioneService.js';
import { bodyApplicaProposta, bodyScartaProposta, paramsPropostaConversione, queryApplicaProposta, queryProposteConversione } from '../schemas/proposteConversione.js';
import type { FiltroProposte, RichiestaApplicaProposta, RichiestaScartaProposta } from '../../shared/proposteConversione.js';
import { completamento } from '../services/completamentoService.js';
import { sfide } from '../services/sfideService.js';
import { datiGuidaCorretti } from '../services/datiGuida.js';
import { httpErrors } from '../utils/httpError.js';
import { impostaAtterraggi, impostaFinestra, type RegolaAtterraggio } from '../services/atterraggioPalazziService.js';
import type { DatiVoceGiornata, EsitoRevisioneVoce, PersonaggiDto, SpostaPuntiInArea, TrasferisciVociGiornata } from '../../shared/types.js';
import { validate } from '../middleware/validate.js';
import { bodyAggiornaVoce, bodyDotiIncontro, bodyRivistaVoce, bodyNuovaVoce, bodySpostaVoce, bodyTrasferisciVoci, paramsGiornoGuida, paramsId, paramsVoceGiornata, queryOggetti, queryPersona, querySkill } from '../schemas/compendio.js';
import type { DoteNote } from '../../shared/effettiAzione.js';
import { categoriaArticolo, dataGioco, idParam } from '../schemas/comuni.js';
import { eCategoriaArticolo } from '../../shared/articoli.js';
import {
  dettaglioPersona, dettaglioSkill, dettaglioConfidente, impostaDotiIncontro, elencaConfidenti, elencaOggetti, elencaPersona, elencaSkill, glossario, oggettiGuida, regoleFusione, terminiGlossario,
} from '../services/compendioService.js';

const queryDomande = z.object({ partita: idParam.optional() });
const queryArticoli = z.object({
  q: z.string().min(1).max(80).optional(),
  categoria: categoriaArticolo.optional(),
  /** Più categorie insieme, separate da virgola: quelle sconosciute si ignorano (un indirizzo vecchio resta valido). */
  categorie: z.string().max(400).optional().transform((v) => v ? v.split(',').map((c) => c.trim()).filter(eCategoriaArticolo) : undefined),
  per: z.string().min(1).max(40).optional(),
  stato: z.enum(['acquistati', 'da-acquistare']).optional(),
  disponibilita: z.enum(['disponibili', 'bloccati']).optional(),
  partita: idParam.optional(),
});
const queryCalendario = z.object({ partita: idParam.optional(), mese: z.string().regex(/^(0[1-9]|1[0-2])$/).optional() });
const router = Router();

router.put('/percorso/voci/:uid/effetti', validate({ params: paramsVoceGiornata, body: bodySalvaEffettiVoce }), (req, res) => {
  res.json(salvaEffettiVoce(String(req.params.uid), req.body));
});
router.get('/percorso/effetti/proposte', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(elencaProposteEffettiVoce());
});
const paramsPropostaEffetto = z.object({ id: z.string().min(1).max(200) }).strict();
router.post('/percorso/effetti/proposte/:id/anteprima', validate({ params: paramsPropostaEffetto, body: bodyAnteprimaDecisioneEffettoVoce }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(anteprimaDecisioneEffettoVoce(String(req.params.id), req.body));
});
router.post('/percorso/effetti/proposte/:id/decisione', validate({ params: paramsPropostaEffetto, body: bodyDecisioneEffettoVoce }), (req, res) => {
  res.json(decidiPropostaEffettoVoce(String(req.params.id), req.body));
});

// ---- L13 (ondata 4a): le proposte «da completare» sulle voci del Diario. Solo preparazione: fuori dall'elenco del giocatore ----
router.get('/proposte-conversione', validate({ query: queryProposteConversione }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.query as unknown as FiltroProposte;
  res.json(elencaProposteConversione({ da: q.da, a: q.a, stato: q.stato }));
});
router.post('/proposte-conversione/:id/applica', validate({ params: paramsPropostaConversione, body: bodyApplicaProposta, query: queryApplicaProposta }), (req, res) => {
  const corpo = req.body as RichiestaApplicaProposta & { voce?: DatiVoceGiornata & { infiltrazioni?: unknown } };
  // le infiltrazioni di una voce di Palazzo si salvano da sole, dalla voce: una proposta non le tocca
  if (corpo.voce?.infiltrazioni !== undefined) throw httpErrors.badRequest('infiltrazioni-da-sole', 'Le infiltrazioni della voce si salvano da sole, dalla voce.');
  res.json(applicaPropostaConversione(String(req.params.id), corpo, (req.query as unknown as { partita?: number }).partita));
});
router.post('/proposte-conversione/:id/scarta', validate({ params: paramsPropostaConversione, body: bodyScartaProposta }), (req, res) => {
  res.json(scartaPropostaConversione(String(req.params.id), req.body as RichiestaScartaProposta));
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
  res.json(oggettiGuida());
});
router.get('/personaggi', (_req, res) => {
  const dati = datiGuidaCorretti<PersonaggiDto>('personaggi');
  if (!dati) throw httpErrors.notFound('personaggi-non-disponibili', 'I dati dei personaggi non sono caricati.');
  res.json(dati);
});
router.get('/sfide', (_req, res) => {
  res.json(sfide());
});
router.get('/completamento', validate({ query: queryDomande }), (req, res) => {
  res.json(completamento((req.query as unknown as { partita?: number }).partita));
});
router.get('/percorso', validate({ query: queryDomande }), (req, res) => {
  res.json(indicePercorso((req.query as unknown as { partita?: number }).partita));
});
router.get('/percorso/:data', validate({ params: z.object({ data: dataGioco }), query: queryDomande }), (req, res) => {
  res.json(giornoPercorso(String(req.params.data), (req.query as unknown as { partita?: number }).partita));
});
/** Gli elenchi per classificare, collegare e dare effetti a un'azione della giornata. */
router.get('/percorso-elenchi', (_req, res) => {
  res.json(elenchiAzione());
});
/** Gli oggetti che gli effetti di una voce citano con una chiave interna (articoli, domande, cruciverba, inviti, Persona), per sceglierli per nome. */
router.get('/percorso-elenchi-effetti', (_req, res) => {
  res.json(elenchiEffettiVoce());
});
// Le voci della giornata sono canone (file di gioco, per tutte le partite): aggiungere al posto esatto, modificare (anche
// fascia e posto), spostare di un passo, eliminare. `?partita=` facoltativo: la risposta porta lo stato nella partita.
router.post('/percorso/:data/voci', validate({ params: paramsGiornoGuida, body: bodyNuovaVoce, query: queryDomande }), (req, res) => {
  res.status(201).json(creaVoce(String(req.params.data), req.body as DatiVoceGiornata, (req.query as unknown as { partita?: number }).partita));
});
/** UX3-1 (L3 §4.4): una voce della giornata per uid, in sola lettura (la scheda del Palazzo aperta con `?daVoce=`). */
router.get('/percorso/voci/:uid', validate({ params: paramsVoceGiornata, query: queryDomande }), (req, res) => {
  res.json(vocePercorso(String(req.params.uid), (req.query as unknown as { partita?: number }).partita));
});
router.put('/percorso/voci/:uid', validate({ params: paramsVoceGiornata, body: bodyAggiornaVoce, query: queryDomande }), (req, res) => {
  const { infiltrazioni, ...resto } = req.body as DatiVoceGiornata & { infiltrazioni?: string[] };
  const partita = (req.query as unknown as { partita?: number }).partita;
  // L3: il campo «Infiltrazioni» si salva da solo (insieme ordinato, anche vuoto) e non tocca niente della voce
  if (infiltrazioni !== undefined) {
    if (Object.values(resto).some((v) => v !== undefined)) throw httpErrors.badRequest('infiltrazioni-da-sole', 'Le infiltrazioni della voce si salvano da sole, senza altri campi.');
    res.json(impostaInfiltrazioniVoce(String(req.params.uid), infiltrazioni, partita));
    return;
  }
  res.json(aggiornaVoce(String(req.params.uid), resto, partita));
});
/** L3 §1.4: «Tieni il nuovo», «Rimetti il precedente» o «Fatto» su una voce da rivedere. */
router.post('/percorso/voci/:uid/rivista', validate({ params: paramsVoceGiornata, body: bodyRivistaVoce, query: queryDomande }), (req, res) => {
  res.json(rivediVoce(String(req.params.uid), (req.body as { esito: EsitoRevisioneVoce }).esito, (req.query as unknown as { partita?: number }).partita));
});
/** Sposta la voce di un passo nella sua fascia; risponde con tutte le voci del giorno, nel nuovo ordine. */
router.put('/percorso/voci/:uid/sposta', validate({ params: paramsVoceGiornata, body: bodySpostaVoce, query: queryDomande }), (req, res) => {
  res.json(spostaVoce(String(req.params.uid), (req.body as { verso: -1 | 1 }).verso, (req.query as unknown as { partita?: number }).partita));
});
/** Copia o sposta una o più voci in un altro giorno e fascia (2026-10-12): in fondo, nel loro ordine. */
router.post('/percorso/voci/trasferisci', validate({ body: bodyTrasferisciVoci, query: queryDomande }), (req, res) => {
  res.json(trasferisciVoci(req.body as TrasferisciVociGiornata, (req.query as unknown as { partita?: number }).partita));
});
router.delete('/percorso/voci/:uid', validate({ params: paramsVoceGiornata }), (req, res) => {
  // 2026-10-26: un esemplare in scorta modificato dopo la spunta resta nella partita: lo si dice (200 con gli avvisi), altrimenti nessun contenuto
  const avvisi = eliminaVoce(String(req.params.uid));
  if (avvisi.length) res.json({ avvisi });
  else res.status(204).end();
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
/** L5: la pagina di un luogo, con presenza, orari, negozi della sede (listini), attività, Confidenti e pin. */
router.get('/luoghi/:quartiere/:luogo', validate({ params: paramsLuogo, query: queryLuogo }), (req, res) => {
  res.json(dettaglioLuogo(String(req.params.quartiere), String(req.params.luogo), (req.query as unknown as { partita?: number }).partita));
});
/** L6: gli inviti dei Confidenti, per Confidente o per posto aperto (un quartiere comprende i suoi luoghi), con lo stato della partita se
 *  indicata: se si possono registrare adesso, che cosa manca, se sono registrati. */
router.get('/inviti', validate({ query: z.object({
  confidente: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/).optional(),
  apreTipo: z.enum(['quartiere', 'luogo', 'area']).optional(),
  apreChiave: z.string().regex(/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/).max(200).optional(),
  partita: idParam.optional(),
}) }), (req, res) => {
  const q = req.query as unknown as { confidente?: string; apreTipo?: 'quartiere' | 'luogo' | 'area'; apreChiave?: string; partita?: number };
  res.json(elencaInviti({ confidente: q.confidente, apreTipo: q.apreTipo, apreChiave: q.apreChiave }, q.partita));
});
router.get('/cruciverba', validate({ query: queryDomande }), (req, res) => {
  res.json(cruciverba((req.query as unknown as { partita?: number }).partita));
});
router.delete('/citta/:chiave/ingresso',validate({params:z.object({chiave:z.string().min(1).max(80)})}),(req,res)=>{impostaIngressoQuartiere(String(req.params.chiave),null);res.status(204).end();});
// L2: l'ingresso si dà con l'Area del quartiere (`area`, slug: la planimetria è la sua predefinita); il corpo di prima con `mappa` resta
router.put('/citta/:chiave/ingresso',validate({params:z.object({chiave:z.string().min(1).max(80)}),body:z.object({mappa:z.string().min(1).max(200).optional(),area:z.string().min(1).max(120).optional(),x:z.number().min(0).max(100),y:z.number().min(0).max(100),zoom:z.number().min(1).max(6).default(2.5)}).strict().refine((b)=>(b.mappa===undefined)!==(b.area===undefined),{message:'Indica l’area dell’ingresso (o, come prima, la planimetria): una delle due.',path:['area']})}),(req,res)=>{res.json(impostaIngressoQuartiere(String(req.params.chiave),req.body));});
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
/** L6: modifica la condizione propria dello sblocco del quartiere; gli inviti restano gestiti dal Confidente. */
router.put('/citta/:chiave/sblocco', validate({ params: z.object({ chiave: z.string().min(1).max(80) }), body: z.object({ condizioni: z.array(condizioneSpillo).max(20) }).strict() }), (req, res) => {
  res.json(aggiornaSbloccoQuartiere(String(req.params.chiave), (req.body as { condizioni: Condizione[] }).condizioni));
});
/** L6: ripristina la condizione propria dalla copia della guida. */
router.post('/citta/:chiave/sblocco/ripristina', validate({ params: z.object({ chiave: z.string().min(1).max(80) }) }), (req, res) => {
  res.json(ripristinaSbloccoQuartiere(String(req.params.chiave)));
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
/* ---- Le Ombre (L8): l'entità nuova, sola lettura. «verifica» prima di «:chiave», che altrimenti la prenderebbe. ---- */
router.get('/ombre', validate({ query: queryOmbre }), (req, res) => {
  res.json(elencaOmbre(req.query as unknown as QueryOmbre));
});
router.get('/ombre/verifica', (_req, res) => {
  res.json(verificaOmbre());
});
router.get('/ombre/:chiave', validate({ params: paramsOmbra, query: queryOmbra }), (req, res) => {
  res.json(dettaglioOmbra(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
/* ---- La negoziazione per umore (L8, B5): il lettore unico, sola lettura. «verifica» è una rotta propria, non un parametro. ---- */
router.get('/negoziazione', validate({ query: queryNegoziazione }), (req, res) => {
  const q = req.query as unknown as QueryNegoziazione;
  res.json(q.compatto === '1' ? negoziazioneCompatta(q) : negoziazione(q));
});
router.get('/negoziazione/verifica', (_req, res) => {
  res.json(verificaNegoziazione());
});
router.get('/richieste', validate({ query: queryDomande }), (req, res) => {
  res.json(richieste((req.query as unknown as { partita?: number }).partita));
});
/* ---- Le Richieste modificabili, aggiungibili ed eliminabili (2026-10-11: «Modifica, aggiungi, elimina») ---- */
router.post('/richieste', validate({ body: bodyNuovaRichiesta }), (req, res) => {
  res.status(201).json(creaRichiesta(req.body as Parameters<typeof creaRichiesta>[0]));
});
router.put('/richieste/:chiave', validate({ params: paramsChiaveGuida, body: bodyRichiesta }), (req, res) => {
  res.json(aggiornaRichiesta(String(req.params.chiave), req.body as Parameters<typeof aggiornaRichiesta>[1]));
});
/** Chi cita la Richiesta: lo si dice prima di eliminarla. */
router.get('/richieste/:chiave/citazioni', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.json(citazioniRichiesta(String(req.params.chiave)));
});
/** Elimina la Richiesta per tutte le partite: i suoi stati via, pin e azioni scollegati, condizioni e requisiti da correggere. */
router.delete('/richieste/:chiave', validate({ params: paramsChiaveGuida }), (req, res) => {
  eliminaRichiesta(String(req.params.chiave));
  res.status(204).end();
});
/** Colloca una Richiesta in un'area di un dedalo (099), o la toglie dall'area (null): è un elemento delle aree. */
router.put('/richieste/:chiave/area', validate({ params: paramsChiaveGuida, body: bodyCollocaRichiesta }), (req, res) => {
  res.json(collocaRichiesta(String(req.params.chiave), (req.body as { areaDedalo: string | null }).areaDedalo));
});
router.get('/dungeon', validate({ query: queryDomande }), (req, res) => {
  res.json(elencaDungeon((req.query as unknown as { partita?: number }).partita));
});
router.get('/dungeon/:chiave', validate({ params: paramsChiaveGuida, query: querySchedaDungeon }), (req, res) => {
  const q = req.query as unknown as { partita?: number; infiltrazione?: string };
  res.json(dettaglioDungeon(String(req.params.chiave), q.partita, q.infiltrazione ?? null));
});
/** L4 (§3.2): i gruppi di copie di una voce secondo la regola dell'utente (R4-15), in sola lettura; nessuna fusione in L4. */
router.get('/dungeon/:chiave/copie', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.json(copieDelPalazzo(String(req.params.chiave)));
});
/** L4 (§2.3, §4.3): «Schede da sistemare» — «Crea la voce» (POST, col tipo) o «Collega a una voce» (PUT, con la voce). */
router.post('/schede/:id/voce', validate({ params: z.object({ id: idParam }), body: bodyCreaVoceDallaScheda }), (req, res) => {
  res.status(201).json(creaVoceDallaScheda(Number(req.params.id), (req.body as { tipo: Parameters<typeof creaVoceDallaScheda>[1] }).tipo));
});
router.put('/schede/:id/voce', validate({ params: z.object({ id: idParam }), body: bodyCollegaSchedaAllaVoce }), (req, res) => {
  res.json(collegaSchedaAllaVoce(Number(req.params.id), (req.body as { voce: string }).voce));
});
/* ---- Correzione dei testi della guida: la sezione dei Palazzi non è più in sola lettura ---- */
router.put('/dungeon/:chiave', validate({ params: paramsChiaveGuida, body: bodyDungeon }), (req, res) => {
  res.json(aggiornaDungeon(String(req.params.chiave), req.body as Parameters<typeof aggiornaDungeon>[1]));
});
/** L4 §8.14: «Ripristina» della scheda del Palazzo — la voce del boss finale torna quella della guida. */
router.post('/dungeon/:chiave/ripristina', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.json(ripristinaDungeon(String(req.params.chiave)));
});
/** La finestra del Palazzo sulla mappa di Tokyo: da quando (e fino a quando) compare per il giorno della partita (2026-10-04). */
router.put('/dungeon/:chiave/finestra', validate({ params: paramsChiaveGuida, body: bodyFinestraDungeon }), (req, res) => {
  const { dal, al } = req.body as { dal: string; al: string | null };
  res.json(impostaFinestra(String(req.params.chiave), dal, al));
});
/** Le regole d'atterraggio dalla mappa di Tokyo, sostituite tutte insieme nell'ordine dato (2026-10-04). */
router.put('/dungeon/:chiave/atterraggi', validate({ params: paramsChiaveGuida, body: bodyAtterraggi }), (req, res) => {
  res.json(impostaAtterraggi(String(req.params.chiave), (req.body as { regole: RegolaAtterraggio[] }).regole));
});
/** Una sezione nuova della guida del Palazzo, al posto scelto e, se data, nella planimetria (2026-10-01). */
router.post('/dungeon/:chiave/aree', validate({ params: paramsChiaveGuida, body: bodyNuovaArea }), (req, res) => {
  res.status(201).json(creaArea(String(req.params.chiave), req.body as Parameters<typeof creaArea>[1]));
});
/** L3 (R3-23): le Aree del Palazzo che l'infiltrazione tocca, in ordine, con la versione da aprire; non sposta voci né pin. */
router.put('/aree/:chiave/aree-palazzo', validate({ params: paramsChiaveGuida, body: bodyAreePalazzoInfiltrazione, query: queryDomande }), (req, res) => {
  const b = req.body as { aree: string[]; planimetrieIniziali?: Record<string, string | null> };
  res.json(impostaAreePalazzoInfiltrazione(String(req.params.chiave), b.aree, b.planimetrieIniziali, (req.query as unknown as { partita?: number }).partita));
});
router.put('/aree/:chiave', validate({ params: paramsChiaveGuida, body: bodyArea }), (req, res) => {
  res.json(aggiornaArea(String(req.params.chiave), req.body as Parameters<typeof aggiornaArea>[1]));
});
/** Elimina l'area della guida per tutte le partite, con i suoi punti e i suoi legami (2026-09-30). */
router.delete('/aree/:chiave', validate({ params: paramsChiaveGuida }), (req, res) => {
  eliminaArea(String(req.params.chiave));
  res.status(204).end();
});
/* ---- Le aree dei dedali dei Memento (099, richiesta dell'utente del 2026-10-11): Dedalo → Aree → Elementi ---- */
/** Un'area nuova in fondo al dedalo (la chiave è quella del dedalo, cioè della sua area della guida). */
router.post('/dedali/:chiave/aree', validate({ params: paramsChiaveGuida, body: bodyNuovaAreaDedalo }), (req, res) => {
  res.status(201).json(creaAreaDedalo(String(req.params.chiave), req.body as Parameters<typeof creaAreaDedalo>[1]));
});
router.put('/aree-dedalo/:chiave', validate({ params: paramsChiaveGuida, body: bodyAreaDedalo }), (req, res) => {
  res.json(aggiornaAreaDedalo(String(req.params.chiave), req.body as Parameters<typeof aggiornaAreaDedalo>[1]));
});
router.put('/aree-dedalo/:chiave/sposta', validate({ params: paramsChiaveGuida, body: bodySpostaPunto }), (req, res) => {
  res.json(spostaAreaDedalo(String(req.params.chiave), (req.body as { verso: -1 | 1 }).verso));
});
/** Elimina l'area per tutte le partite: le voci con lei, le Richieste restano nel dedalo da collocare. */
router.delete('/aree-dedalo/:chiave', validate({ params: paramsChiaveGuida }), (req, res) => {
  eliminaAreaDedalo(String(req.params.chiave));
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
/** Più voci di un Palazzo insieme in un'altra sua area (2026-10-14): in fondo, nel loro ordine, tutto o niente. */
router.post('/punti/sposta-in-area', validate({ body: bodySpostaPuntiInArea }), (req, res) => {
  const b = req.body as SpostaPuntiInArea;
  res.json(spostaPuntiInArea(b.chiavi, b.area));
});
/** Le stesse voci copiate in un'altra area del Palazzo (2026-10-18): voci nuove, coi passi e le schede, in fondo; tutto o niente. */
router.post('/punti/copia-in-area', validate({ body: bodySpostaPuntiInArea }), (req, res) => {
  const b = req.body as SpostaPuntiInArea;
  res.status(201).json(copiaPuntiInArea(b.chiavi, b.area));
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
/** Gli eventi del calendario collegati a una voce del Diario (L9 R9-20), sola lettura. */
router.get('/calendario/voci/:uid', validate({ params: paramsVoceGiornata }), (req, res) => {
  res.json(eventiDellaVoce(String(req.params.uid)));
});
router.get('/domande', validate({ query: queryDomande }), (req, res) => {
  res.json(domande((req.query as unknown as { partita?: number }).partita));
});
router.get('/confidenti/:chiave', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.json(dettaglioConfidente(String(req.params.chiave)));
});
/** Editor informativo indipendente dal dettaglio, leggibile anche con elenchi JSON storici malformati. */
router.get('/confidenti/:chiave/disponibilita', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(informazioniConfidente(String(req.params.chiave)));
});
router.post('/confidenti/:chiave/disponibilita/anteprima', validate({ params: paramsChiaveGuida, body: bodyAnteprimaInformazioniConfidente }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(anteprimaInformazioniConfidente(String(req.params.chiave), req.body as AzioneInformazioniConfidente));
});
router.put('/confidenti/:chiave/disponibilita', validate({ params: paramsChiaveGuida, body: bodySalvaInformazioniConfidente }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(salvaInformazioniConfidente(String(req.params.chiave), req.body as SalvaInformazioniConfidente));
});
/** L6 (§6.1): i requisiti del Confidente per rango, per l'editor («Modifica requisiti»). */
router.get('/confidenti/:chiave/requisiti', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.json(requisitiDelConfidente(String(req.params.chiave)));
});
const paramsRangoConfidente = z.object({ chiave: z.string().min(1).max(200), rango: z.coerce.number().int().min(1).max(10) });
/** L6: i requisiti di un rango al posto di quelli di adesso (condizioni del vocabolario unico, con la frase facoltativa). */
router.put('/confidenti/:chiave/requisiti/:rango', validate({ params: paramsRangoConfidente, body: z.object({ requisiti: z.array(z.object({ condizione: condizioneSpillo, testo: z.string().max(500).nullable().optional() })).max(10) }) }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  res.json(impostaRequisitiRango(p.chiave, p.rango, (req.body as { requisiti: Array<{ condizione: Condizione; testo?: string | null }> }).requisiti));
});
/** L6: il rango torna come lo dà la guida. */
router.post('/confidenti/:chiave/requisiti/:rango/ripristina', validate({ params: paramsRangoConfidente }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  res.json(ripristinaRequisitiRango(p.chiave, p.rango));
});
/** Un requisito che cita una Richiesta (per esempio eliminata, «da correggere»): cita un'altra Richiesta (scelta dell'utente,
 *  2026-10-11: «Requisito correggibile»). */
router.put('/confidenti/:chiave/requisiti/:rango/:indice', validate({ params: paramsRequisitoConfidente, body: bodyRequisitoRichiesta }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number; indice: number };
  correggiRequisitoRichiesta(p.chiave, p.rango, p.indice, (req.body as { richiesta: string }).richiesta);
  res.status(204).end();
});
/** Toglie un requisito che cita una Richiesta, per tutte le partite. */
router.delete('/confidenti/:chiave/requisiti/:rango/:indice', validate({ params: paramsRequisitoConfidente }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number; indice: number };
  togliRequisitoRichiesta(p.chiave, p.rango, p.indice);
  res.status(204).end();
});
/** La Dote a ogni incontro, rango per rango (dato di gioco, come gli effetti di libri e attività). */
router.put('/confidenti/:chiave/doti-incontro', validate({ params: paramsChiaveGuida, body: bodyDotiIncontro }), (req, res) => {
  res.json(impostaDotiIncontro(String(req.params.chiave), (req.body as { ranghi: Array<{ rango: number; doti: DoteNote[] }> }).ranghi));
});

// ---- Il giorno di gioco modificabile (L9 R9-19): meteo nelle due fasce, nota, trama e vincoli, con «Ripristina» ----
const paramsGiorno = z.object({ data: z.string().regex(/^\d{2}-\d{2}$/) });
const bodyGiorno = z.object({
  meteoGiorno: z.enum(METEO_GIORNO).nullable().optional(),
  meteoSera: z.enum(METEO_GIORNO).nullable().optional(),
  notaMeteo: z.string().max(200).nullable().optional(),
  meteoDaVerificare: z.boolean().optional(),
  trama: z.string().max(4000).optional(),
  vincoli: z.array(z.string().max(500)).max(30).optional(),
}).strict();
router.get('/giorni/:data', validate({ params: paramsGiorno }), (req, res) => {
  res.json(leggiGiorno(String(req.params.data)));
});
router.put('/giorni/:data', validate({ params: paramsGiorno, body: bodyGiorno }), (req, res) => {
  res.json(aggiornaGiorno(String(req.params.data), req.body as ModificaGiorno));
});
/** «Ripristina»: il giorno torna come lo dà la guida. */
router.post('/giorni/:data/ripristina', validate({ params: paramsGiorno }), (req, res) => {
  res.json(ripristinaGiorno(String(req.params.data)));
});

// ---- Le affinità di una Persona modificabili (L8 R8-10/1): correggere la griglia e rimetterla com'è nella guida ----
const bodyAffinitaPersona = z.object({
  affinita: z.array(z.object({
    elemento: z.enum(ELEMENTI_AFFINITA.map((e) => e.chiave) as [string, ...string[]]),
    codice: z.enum(ESITI_AFFINITA.map((e) => e.codice) as [string, ...string[]]),
  }).strict()).length(ELEMENTI_AFFINITA.length),
}).strict().superRefine((b, ctx) => {
  const visti = new Set<string>();
  b.affinita.forEach((a, i) => {
    if (visti.has(a.elemento)) ctx.addIssue({ code: 'custom', path: ['affinita', i, 'elemento'], message: `L'elemento ${a.elemento} compare più di una volta.` });
    visti.add(a.elemento);
  });
});
router.put('/persona/:id/affinita', validate({ params: paramsId, body: bodyAffinitaPersona }), (req, res) => {
  res.json(correggiAffinita(Number(req.params.id), req.body as ModificaAffinitaPersona));
});
/** «Ripristina»: le affinità corrette tornano quelle della guida. */
router.post('/persona/:id/affinita/ripristina', validate({ params: paramsId }), (req, res) => {
  res.json(ripristinaAffinita(Number(req.params.id)));
});

export default router;
