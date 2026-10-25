// ============================================================
// Route /api/partite — partite multiple e tracking della partita
// ============================================================

import { Router } from 'express';
import { applicaDeltaPuntiPesca } from '../services/pescaService.js';
import { z } from 'zod';
import { prepared } from '../db/dbService.js';
import { verificaPartita } from '../services/verificaPartita.js';
import { httpErrors } from '../utils/httpError.js';
import { validate } from '../middleware/validate.js';
import {
  bodyAggiornaPartita, bodyAggiornaPosseduta, bodyAggiungiPosseduta, bodyCompendio, bodyConfidente, bodyCreaPartita, bodyDote, bodyFortuna,
  bodyAggiornaCiclo, bodyAggiornaObiettivo, bodyDomandaFatta, bodyAcquisto, bodyAzionePercorso, bodyTrofeo, bodyCruciverba, bodyGiornoCorrente, bodyLettura, bodyStatoPunto, bodyStatoRichiesta, bodyRegalo, bodyRegala, bodyAnnullaRegalo, paramsPartitaDomanda, bodyAggiornaPianoSalvato, bodyAnteprimaFusione, bodySalvaCiclo, paramsPartitaCiclo, bodyCreaObiettivo, bodyForca, bodyFusioneScorta, bodyIsolamento, bodySalvaPiano, paramsPartita, paramsCestinoPersonale, paramsPartitaCestino, paramsPartitaPiano, queryPianiSalvati, paramsPartitaChiave, paramsPartitaEvento, paramsPartitaObiettivo, paramsPartitaPersona, paramsPartitaPosseduta, queryObiettivi, queryStorico, bodyEliminaEventi, bodyRequisito, bodyYen, bodyMembroSquadra, bodyMeteo, paramsPartitaData } from '../schemas/partite.js';
import { impostaMeteo, meteoDelGiorno } from '../services/meteoService.js';
import type { MeteoPartita } from '../../shared/meteoPartita.js';
import { aggiornaObiettivo, creaObiettivo, eliminaObiettivo, obiettivi } from '../services/obiettiviService.js';
import { aggiornaPianoSalvato, eliminaPianoSalvato, pianiSalvati, salvaPiano } from '../services/pianiSalvatiService.js';
import { anteprimaFusione, eseguiForca, eseguiFusione, eseguiIsolamento, skillResistenzaIsolamento } from '../services/operazioniVellutoService.js';
import { aggiornaCiclo, avanzaCiclo, cicliSalvati, eliminaCiclo, salvaCiclo } from '../services/cicliSalvatiService.js';
import { capienzaScorta } from '../services/capienzaScortaService.js';
import { impostaPiazzamentoEsame } from '../services/piazzamentoEsamiService.js';
import { impostaStatoPunto } from '../services/dungeonService.js';
import { impostaStatoRichiesta, riepilogoRichieste } from '../services/richiesteService.js';
import { oggettiOttenutiPartita } from '../services/oggettiOttenutiService.js';
import { impostaTimbri } from '../services/timbriService.js';
import { impostaLettura, impostaSessioneVideogioco } from '../services/attivitaService.js';
import { bodySessioneVideogioco } from '../schemas/partite.js';
import { impostaMembro, impostaYen, squadraPartita } from '../services/squadraService.js';
import { impostaAcquisto, disponibilitaAcquistoCorrente } from '../services/negoziService.js';
import { leggiAcquistiPartita, anteprimaRegistrazioneAcquisto, registraAcquisto, anteprimaAnnullaProvenienza, annullaProvenienzaAcquisto, anteprimaRimozionePresenzaLegacy, rimuoviPresenzaLegacy } from '../services/acquistiService.js';
import { leggiPropostePartita, anteprimaDecisioneProposte, decidiProposte } from '../services/propostePartitaService.js';
import { conCestinoPrivato, elencoCestinoPersonale, eliminaCestinoPrivato, ripristinaCestinoPrivato, svuotaCestinoPersonale } from '../services/cestinoService.js';
import { bodyAnteprimaAcquisto, bodyRegistraAcquisto, bodyAnteprimaAnnullaProvenienza, bodyAnnullaProvenienza, bodyAnteprimaRimozioneLegacy, bodyRimozioneLegacy, bodyAnteprimaDecisioneProposte, bodyDecisioneProposte } from '../schemas/acquisti.js';
import { confermaRequisito } from '../services/semaforiService.js';
import { aggiornaConfidenteDallaPagina } from '../services/incontriService.js';
import { annullaRegalo, regala } from '../services/regaloAzioneService.js';
import type { RichiestaRegalo } from '../../shared/types.js';
import { impostaRaccolto } from '../services/mappe/mappeService.js';
import { elencoDivergenze, togliFattoAlPin } from '../services/divergenzeService.js';
import { suggerimentiOggi } from '../services/suggerimentiService.js';
import { bodyRaccolto } from '../schemas/mappe.js';
import { idParam } from '../schemas/comuni.js';
import { impostaGiornoCorrente, spuntaEAvanza } from '../services/percorsoService.js';
import { applicaEffettoStoricoDiario } from '../services/giornataService.js';
import { segnaCruciverbaDallaGuida, segnaDomandaDallaGuida } from '../services/spuntaDellaGuidaService.js';
import { annullaInvito, registraInvito } from '../services/inviti.js';
import { impostaFortuna, leggiFortuna } from '../services/fortunaService.js';
import { impostaTrofeo } from '../services/completamentoService.js';
import { t } from '../services/traduzioniService.js';
import { eliminaEventi, eliminaEvento, storico } from '../services/storicoService.js';
import type { TipoEvento } from '../../shared/eventi.js';
import {
  aggiornaCompendio, aggiornaDote, aggiornaPartita, aggiornaPosseduta, aggiungiPosseduta, attivaPartita, compendioPartita, registraPossedutaNelCompendio,
  confidente, confidenti, creaPartita, dotiSociali, elencaPartite, eliminaPartita, impostaRegaloFatto, leggiPartita, personePossedute, rimuoviPosseduta,
} from '../services/partiteService.js';

const router = Router();
const porteAcquisti = { valutaCorrente: disponibilitaAcquistoCorrente };

router.get('/:id/acquisti', validate({ params: paramsPartita }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(leggiAcquistiPartita(Number(req.params.id)));
});
router.post('/:id/acquisti/anteprima', validate({ params: paramsPartita, body: bodyAnteprimaAcquisto }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(anteprimaRegistrazioneAcquisto(Number(req.params.id), req.body, porteAcquisti));
});
router.post('/:id/acquisti/registrazioni', validate({ params: paramsPartita, body: bodyRegistraAcquisto }), (req, res) => {
  res.status(201).json(registraAcquisto(Number(req.params.id), req.body, porteAcquisti));
});
router.post('/:id/acquisti/provenienze/annullo/anteprima', validate({ params: paramsPartita, body: bodyAnteprimaAnnullaProvenienza }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(anteprimaAnnullaProvenienza(Number(req.params.id), req.body));
});
router.post('/:id/acquisti/provenienze/annullo', validate({ params: paramsPartita, body: bodyAnnullaProvenienza }), (req, res) => {
  const partitaId = Number(req.params.id);
  res.json(conCestinoPrivato({ tipo: 'fonte-acquisto', chiave: String(req.body.provenienzaId), nome: 'Fonte di acquisto', partitaId },
    () => annullaProvenienzaAcquisto(partitaId, req.body)));
});
router.post('/:id/acquisti/legacy/rimozione/anteprima', validate({ params: paramsPartita, body: bodyAnteprimaRimozioneLegacy }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(anteprimaRimozionePresenzaLegacy(Number(req.params.id), req.body));
});
router.post('/:id/acquisti/legacy/rimozione', validate({ params: paramsPartita, body: bodyRimozioneLegacy }), (req, res) => {
  const partitaId = Number(req.params.id);
  res.json(conCestinoPrivato({ tipo: 'fonte-acquisto', chiave: `legacy:${String(req.body.articolo)}`, nome: 'Presenza storica di acquisto', partitaId },
    () => rimuoviPresenzaLegacy(partitaId, req.body)));
});
router.get('/:id/da-applicare', validate({ params: paramsPartita, query: z.object({ ancheChiuse: z.literal('1').optional() }).strict() }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(leggiPropostePartita(Number(req.params.id), { ancheChiuse: req.query.ancheChiuse === '1' }));
});
router.post('/:id/da-applicare/anteprima', validate({ params: paramsPartita, body: bodyAnteprimaDecisioneProposte }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(anteprimaDecisioneProposte(Number(req.params.id), req.body));
});
router.post('/:id/da-applicare/decisioni', validate({ params: paramsPartita, body: bodyDecisioneProposte }), (req, res) => {
  res.json(decidiProposte(Number(req.params.id), req.body, {
    applicaDote: (id, chiave, delta) => { aggiornaDote(id, chiave, { delta }); },
    applicaYen: (id, delta) => { impostaYen(id, { delta }); },
    applicaEffettoStorico: applicaEffettoStoricoDiario,
    applicaPuntiPesca: applicaDeltaPuntiPesca,
  }));
});

// ---- Il cestino personale (L12, passo 3) ----
// Le voci eliminate dal giocatore (partite, fonti di acquisto, pesca, Persone della scorta) sono SUE: ogni funzione filtra per il
// proprietario della richiesta. Due famiglie di rotte sullo stesso servizio:
//   - `/cestino…`: tutte le voci del proprietario, comprese le partite eliminate (che non hanno più un id sotto cui cercarle);
//   - `/:id/cestino…`: le sole voci di quella partita (l'id passa dal controllo centrale di appartenenza).
// Le rotte di `/api/impostazioni/cestino/partite/:uid` della preparazione restano com'erano (stesso servizio, stesso filtro): il
// frontend della preparazione le usa ancora, e la loro migrazione non è necessaria al rilascio, che non monta `/api/impostazioni`.
// Vengono PRIMA di `/:id`: «cestino» non è l'id di una partita.
router.get('/cestino', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(elencoCestinoPersonale());
});
router.delete('/cestino', (_req, res) => {
  res.json(svuotaCestinoPersonale());
});
router.post('/cestino/:uid/ripristina', validate({ params: paramsCestinoPersonale }), (req, res) => {
  res.json(ripristinaCestinoPrivato(String(req.params.uid)));
});
router.delete('/cestino/:uid', validate({ params: paramsCestinoPersonale }), (req, res) => {
  eliminaCestinoPrivato(String(req.params.uid));
  res.status(204).end();
});
router.get('/:id/cestino', validate({ params: paramsPartita }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(elencoCestinoPersonale(Number(req.params.id)));
});
router.delete('/:id/cestino', validate({ params: paramsPartita }), (req, res) => {
  res.json(svuotaCestinoPersonale(Number(req.params.id)));
});
router.post('/:id/cestino/:uid/ripristina', validate({ params: paramsPartitaCestino }), (req, res) => {
  res.json(ripristinaCestinoPrivato(String(req.params.uid), Number(req.params.id)));
});
router.delete('/:id/cestino/:uid', validate({ params: paramsPartitaCestino }), (req, res) => {
  eliminaCestinoPrivato(String(req.params.uid), Number(req.params.id));
  res.status(204).end();
});

// ---- Partite ----
router.get('/', (_req, res) => {
  res.json(elencaPartite());
});
router.post('/', validate({ body: bodyCreaPartita }), (req, res) => {
  res.status(201).json(creaPartita(req.body));
});
router.put('/:id', validate({ params: paramsPartita, body: bodyAggiornaPartita }), (req, res) => {
  res.json(aggiornaPartita(Number(req.params.id), req.body));
});
router.post('/:id/attiva', validate({ params: paramsPartita }), (req, res) => {
  res.json(attivaPartita(Number(req.params.id)));
});
router.delete('/:id', validate({ params: paramsPartita }), (req, res) => {
  eliminaPartita(Number(req.params.id));
  res.status(204).end();
});

// ---- Doti sociali ----
router.get('/:id/doti', validate({ params: paramsPartita }), (req, res) => {
  res.json(dotiSociali(Number(req.params.id)));
});
router.patch('/:id/doti/:chiave', validate({ params: paramsPartitaChiave, body: bodyDote }), (req, res) => {
  res.json(aggiornaDote(Number(req.params.id), String(req.params.chiave), req.body));
});

router.get('/:id/fortuna', validate({ params: paramsPartita }), (req, res) => {
  res.json(leggiFortuna(Number(req.params.id)));
});
router.put('/:id/fortuna', validate({ params: paramsPartita, body: bodyFortuna }), (req, res) => {
  res.json(impostaFortuna(Number(req.params.id), req.body.dote));
});

// ---- Denaro del gruppo e livelli dei Ladri ----
router.get('/:id/squadra', validate({ params: paramsPartita }), (req, res) => {
  res.json(squadraPartita(Number(req.params.id)));
});
/** Sta **prima** di `/:id/squadra/:chiave`: «yen» non è la chiave di un membro, e registrata dopo
 *  finirebbe in quella rotta rispondendo «non è un membro giocabile della squadra». */
router.patch('/:id/squadra/yen', validate({ params: paramsPartita, body: bodyYen }), (req, res) => {
  res.json(impostaYen(Number(req.params.id), req.body as { yen?: number; delta?: number }));
});
router.patch('/:id/squadra/:chiave', validate({ params: paramsPartitaChiave, body: bodyMembroSquadra }), (req, res) => {
  res.json(impostaMembro(Number(req.params.id), String(req.params.chiave), req.body as { livello?: number; esperienza?: number; deltaLivello?: number; inSquadra?: boolean }));
});

// ---- Confidenti ----
router.get('/:id/confidenti', validate({ params: paramsPartita }), (req, res) => {
  res.json(confidenti(Number(req.params.id)));
});
// dalla pagina Confidenti: oltre a punti e rango registra gli incontri (la Dote a ogni incontro, una volta per incontro)
router.put('/:id/confidenti/:chiave', validate({ params: paramsPartitaChiave, body: bodyConfidente }), (req, res) => {
  res.json(aggiornaConfidenteDallaPagina(Number(req.params.id), String(req.params.chiave), req.body));
});

/** L6: «Invito avvenuto» (PUT) e «Annulla» (DELETE) per un invito di un Confidente (`<confidente>/<MM-GG>`); si registra solo con le condizioni
 *  vere adesso (409 `invito-non-possibile` con quel che manca). Restituisce l'invito con lo stato aggiornato. */
const paramsInvito = z.object({ id: idParam, confidente: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/), data: z.string().regex(/^\d{2}-\d{2}$/) });
router.put('/:id/inviti/:confidente/:data', validate({ params: paramsInvito }), (req, res) => {
  res.json(registraInvito(Number(req.params.id), `${String(req.params.confidente)}/${String(req.params.data)}`));
});
router.delete('/:id/inviti/:confidente/:data', validate({ params: paramsInvito }), (req, res) => {
  res.json(annullaInvito(Number(req.params.id), `${String(req.params.confidente)}/${String(req.params.data)}`));
});

/** Conferma di un requisito `evento` (semafori, Fase 12.3; gli altri tipi li dice la partita, R6-01b); restituisce il Confidente aggiornato. */
router.put('/:id/confidenti/:chiave/requisiti', validate({ params: paramsPartitaChiave, body: bodyRequisito }), (req, res) => {
  const b = req.body as { rango: number; indice: number; confermato: boolean };
  confermaRequisito(Number(req.params.id), String(req.params.chiave), b.rango, b.indice, b.confermato);
  res.json(confidente(Number(req.params.id), String(req.params.chiave)));
});
router.put('/:id/confidenti/:chiave/regali', validate({ params: paramsPartitaChiave, body: bodyRegalo }), (req, res) => {
  const b = req.body as { regalo?: string; catalogo?: string; fatto: boolean };
  // N5/R10-18: il regalo di un oggetto del catalogo è l'azione unica «Regala» (punti, consegna, eventuale acquisto, storico, annullabile):
  // questa strada accetta solo le righe per nome, senza oggetto collegato, e non può più scavalcarla.
  if (b.catalogo !== undefined) throw httpErrors.badRequest('usa-regala', 'Il regalo di un oggetto del catalogo è l’azione «Regala»: usa POST /api/partite/:id/regali (e POST /api/partite/:id/regali/annulla per annullare).');
  res.json(impostaRegaloFatto(Number(req.params.id), String(req.params.chiave), b.regalo!, b.fatto));
});
/** R10-18: «Regala» è un'azione sola (oggetto del catalogo per chiave → punti, consegna, eventuale acquisto, storico) e si annulla identica. */
router.post('/:id/regali', validate({ params: paramsPartita, body: bodyRegala }), (req, res) => {
  res.status(201).json(regala(Number(req.params.id), req.body as RichiestaRegalo));
});
router.post('/:id/regali/annulla', validate({ params: paramsPartita, body: bodyAnnullaRegalo }), (req, res) => {
  const b = req.body as { confidente: string; catalogo: string };
  res.json(annullaRegalo(Number(req.params.id), b.confidente, b.catalogo));
});

router.put('/:id/trofei', validate({ params: paramsPartita, body: bodyTrofeo }), (req, res) => {
  const b = req.body as { trofeo: string; ottenuto: boolean };
  res.json(impostaTrofeo(Number(req.params.id), b.trofeo, b.ottenuto));
});
router.put('/:id/percorso', validate({ params: paramsPartita, body: bodyAzionePercorso }), (req, res) => {
  const b = req.body as z.infer<typeof bodyAzionePercorso>;
  // la spunta e, se era l'ultima attività del giorno corrente, il passaggio al giorno dopo (togliere la spunta non torna indietro)
  // sono un'unica operazione del servizio: o succedono tutte e due o nessuna
  res.json(spuntaEAvanza(Number(req.params.id), b.uid, b.fatta, { noteRisposta: b.noteRisposta, apertureDedali: b.apertureDedali, acquisti: b.acquisti, pesche: b.pesche, scelteEsito: b.scelteEsito }));
});
router.put('/:id/giorno', validate({ params: paramsPartita, body: bodyGiornoCorrente }), (req, res) => {
  res.json(impostaGiornoCorrente(Number(req.params.id), (req.body as { data: string }).data));
});

// ---- Meteo della partita: di giorno e di sera, scelto o della guida ----
router.get('/:id/meteo/:data', validate({ params: paramsPartitaData }), (req, res) => {
  leggiPartita(Number(req.params.id));
  res.json(meteoDelGiorno(Number(req.params.id), String(req.params.data)));
});
/** Restituisce anche la partita: il suo `meteoOra` fa ricaricare mappe, negozi e disponibilità. */
router.put('/:id/meteo/:data', validate({ params: paramsPartitaData, body: bodyMeteo }), (req, res) => {
  const meteo = impostaMeteo(Number(req.params.id), String(req.params.data), req.body as { giorno?: MeteoPartita | null; sera?: MeteoPartita | null });
  res.json({ meteo, partita: leggiPartita(Number(req.params.id)) });
});
router.put('/:id/acquisti', validate({ params: paramsPartita, body: bodyAcquisto }), (req, res) => {
  const b = req.body as { articolo: string; fatto: boolean; sede?: string };
  res.json(impostaAcquisto(Number(req.params.id), b.articolo, b.fatto, b.sede));
});

router.put('/:id/cruciverba', validate({ params: paramsPartita, body: bodyCruciverba }), (req, res) => {
  const b = req.body as { data: string; fatto: boolean };
  res.json(segnaCruciverbaDallaGuida(Number(req.params.id), b.data, b.fatto));
});
router.put('/:id/letture', validate({ params: paramsPartita, body: bodyLettura }), (req, res) => {
  const b = req.body as { tipo: 'libro' | 'film' | 'videogioco'; chiave: string; fatto?: boolean; avanzamento?: number };
  const modifica = b.avanzamento === undefined ? { fatto: b.fatto as boolean } : { avanzamento: b.avanzamento };
  res.json(impostaLettura(Number(req.params.id), b.tipo, b.chiave, modifica));
});

router.put('/:id/sessione-videogioco', validate({ params: paramsPartita, body: bodySessioneVideogioco }), (req, res) => {
  const b = req.body as { chiave: string; dichiarata: boolean };
  res.json(impostaSessioneVideogioco(Number(req.params.id), b.chiave, b.dichiarata));
});
router.put('/:id/richieste', validate({ params: paramsPartita, body: bodyStatoRichiesta }), (req, res) => {
  const b = req.body as { richiesta: string; stato: 'accettata' | 'completata' | null };
  res.json(impostaStatoRichiesta(Number(req.params.id), b.richiesta, b.stato));
});
/** L13: il riepilogo leggero delle Richieste per la Home (accettate, in scadenza): solo conteggi. */
router.get('/:id/richieste/riepilogo', validate({ params: paramsPartita }), (req, res) => {
  res.json(riepilogoRichieste(Number(req.params.id)));
});
/** L13: gli oggetti del catalogo ottenuti nella partita (voci con l'effetto «oggetto ricevuto», Richieste completate). */
router.get('/:id/oggetti-ottenuti', validate({ params: paramsPartita }), (req, res) => {
  res.json(oggettiOttenutiPartita(Number(req.params.id)));
});
/** I timbri raccolti in un dedalo dei Memento (0 = azzera). */
router.put('/:id/timbri', validate({ params: paramsPartita, body: z.object({ area: z.string().min(1).max(200), raccolti: z.number().int().min(0).max(999) }) }), (req, res) => {
  const b = req.body as { area: string; raccolti: number };
  res.json(impostaTimbri(Number(req.params.id), b.area, b.raccolti));
});
router.put('/:id/punti', validate({ params: paramsPartita, body: bodyStatoPunto }), (req, res) => {
  const b = req.body as { punto: string; stato: 'ottenuto' | 'esaurito' | null };
  res.json(impostaStatoPunto(Number(req.params.id), b.punto, b.stato));
});
router.put('/:id/domande/:domandaId', validate({ params: paramsPartitaDomanda, body: bodyDomandaFatta }), (req, res) => {
  const b = req.body as { fatta: boolean; conoscenza?: boolean };
  res.json(segnaDomandaDallaGuida(Number(req.params.id), Number(req.params.domandaId), b.fatta, b.conoscenza === true));
});

// ---- Piazzamento agli esami (L9 R9-08): vale per il moltiplicatore dei sette Confidenti fino all'esame successivo ----
router.put('/:id/esami/:esame/piazzamento', validate({ params: z.object({ id: paramsPartita.shape.id, esame: z.string().min(1).max(60) }), body: z.object({ piazzamento: z.enum(['primo', 'primi-10', 'altro']).nullable() }).strict() }), (req, res) => {
  res.json(impostaPiazzamentoEsame(Number(req.params.id), String(req.params.esame), (req.body as { piazzamento: 'primo' | 'primi-10' | 'altro' | null }).piazzamento));
});

// ---- Compendio personale ----
router.get('/:id/compendio', validate({ params: paramsPartita }), (req, res) => {
  res.json(compendioPartita(Number(req.params.id)));
});
router.put('/:id/compendio/:personaId', validate({ params: paramsPartitaPersona, body: bodyCompendio }), (req, res) => {
  res.json(aggiornaCompendio(Number(req.params.id), Number(req.params.personaId), req.body));
});

/** Chiavi da evidenziare per le azioni ancora da fare del giorno corrente (alone dorato dei suggerimenti). */
router.get('/:id/suggerimenti', validate({ params: paramsPartita }), (req, res) => {
  res.json(suggerimentiOggi(Number(req.params.id)));
});

/** Stato «raccolto» di uno spillo della mappa nella partita (Fase 13). */
router.put('/:id/spilli/:spilloId', validate({ params: z.object({ id: idParam, spilloId: idParam }), body: bodyRaccolto }), (req, res) => {
  const b = req.body as { raccolto: boolean; infiltrazione?: string };
  res.json(impostaRaccolto(Number(req.params.id), Number(req.params.spilloId), b.raccolto, b.infiltrazione ?? null));
});

// L4 (§3.2): le divergenze conservate «da verificare» e «Togli il fatto al pin»
router.get('/:id/divergenze', validate({ params: paramsPartita, query: z.object({ dungeon: z.string().min(1).max(80).optional() }) }), (req, res) => {
  res.json(elencoDivergenze(Number(req.params.id), (req.query as { dungeon?: string }).dungeon));
});
router.delete('/:id/divergenze/:spilloUid', validate({ params: z.object({ id: idParam, spilloUid: z.string().min(1).max(80) }) }), (req, res) => {
  togliFattoAlPin(Number(req.params.id), String(req.params.spilloUid));
  res.status(204).end();
});

// ---- Persona possedute ----
router.get('/:id/scorta/capienza', validate({ params: paramsPartita }), (req, res) => {
  res.json(capienzaScorta(Number(req.params.id)));
});
router.get('/:id/persona', validate({ params: paramsPartita }), (req, res) => {
  res.json(personePossedute(Number(req.params.id)));
});
router.post('/:id/persona', validate({ params: paramsPartita, body: bodyAggiungiPosseduta }), (req, res) => {
  const { personaId, ...dati } = req.body as { personaId: number } & Parameters<typeof aggiungiPosseduta>[2];
  res.status(201).json(aggiungiPosseduta(Number(req.params.id), personaId, dati));
});
router.put('/:id/persona/:possedutaId', validate({ params: paramsPartitaPosseduta, body: bodyAggiornaPosseduta }), (req, res) => {
  res.json(aggiornaPosseduta(Number(req.params.id), Number(req.params.possedutaId), req.body));
});
router.delete('/:id/persona/:possedutaId', validate({ params: paramsPartitaPosseduta }), (req, res) => {
  rimuoviPosseduta(Number(req.params.id), Number(req.params.possedutaId));
  res.status(204).end();
});
/** Registra nel compendio l'istantanea dell'esemplare (livello, bonus, skill, tratto, carica). */
router.post('/:id/persona/:possedutaId/registra', validate({ params: paramsPartitaPosseduta }), (req, res) => {
  res.json(registraPossedutaNelCompendio(Number(req.params.id), Number(req.params.possedutaId)));
});

// ---- Obiettivi (Fase 5.2) ----
router.get('/:id/obiettivi', validate({ params: paramsPartita, query: queryObiettivi }), (req, res) => {
  res.json(obiettivi(Number(req.params.id), (req.query as { stato?: 'aperto' | 'raggiunto' | 'annullato' }).stato));
});
router.post('/:id/obiettivi', validate({ params: paramsPartita, body: bodyCreaObiettivo }), (req, res) => {
  const { personaId, ...dati } = req.body as { personaId: number } & Parameters<typeof creaObiettivo>[2];
  res.status(201).json(creaObiettivo(Number(req.params.id), personaId, dati));
});
router.put('/:id/obiettivi/:obiettivoId', validate({ params: paramsPartitaObiettivo, body: bodyAggiornaObiettivo }), (req, res) => {
  res.json(aggiornaObiettivo(Number(req.params.id), Number(req.params.obiettivoId), req.body));
});
router.delete('/:id/obiettivi/:obiettivoId', validate({ params: paramsPartitaObiettivo }), (req, res) => {
  eliminaObiettivo(Number(req.params.id), Number(req.params.obiettivoId));
  res.status(204).end();
});

// ---- Piani salvati (Fase 5.3) ----
router.get('/:id/piani', validate({ params: paramsPartita, query: queryPianiSalvati }), (req, res) => {
  res.json(pianiSalvati(Number(req.params.id), (req.query as unknown as { obiettivo?: number }).obiettivo));
});
router.post('/:id/piani', validate({ params: paramsPartita, body: bodySalvaPiano }), (req, res) => {
  res.status(201).json(salvaPiano(Number(req.params.id), req.body as Parameters<typeof salvaPiano>[1]));
});
router.put('/:id/piani/:pianoId', validate({ params: paramsPartitaPiano, body: bodyAggiornaPianoSalvato }), (req, res) => {
  res.json(aggiornaPianoSalvato(Number(req.params.id), Number(req.params.pianoId), req.body));
});
router.delete('/:id/piani/:pianoId', validate({ params: paramsPartitaPiano }), (req, res) => {
  eliminaPianoSalvato(Number(req.params.id), Number(req.params.pianoId));
  res.status(204).end();
});

// ---- Cicli di fusione salvati (Fase 5.5) ----
router.get('/:id/cicli', validate({ params: paramsPartita }), (req, res) => {
  res.json(cicliSalvati(Number(req.params.id)));
});
router.post('/:id/cicli', validate({ params: paramsPartita, body: bodySalvaCiclo }), (req, res) => {
  res.status(201).json(salvaCiclo(Number(req.params.id), req.body as Parameters<typeof salvaCiclo>[1]));
});
router.put('/:id/cicli/:cicloId', validate({ params: paramsPartitaCiclo, body: bodyAggiornaCiclo }), (req, res) => {
  res.json(aggiornaCiclo(Number(req.params.id), Number(req.params.cicloId), req.body));
});
router.post('/:id/cicli/:cicloId/avanza', validate({ params: paramsPartitaCiclo }), (req, res) => {
  res.json(avanzaCiclo(Number(req.params.id), Number(req.params.cicloId)));
});
router.delete('/:id/cicli/:cicloId', validate({ params: paramsPartitaCiclo }), (req, res) => {
  eliminaCiclo(Number(req.params.id), Number(req.params.cicloId));
  res.status(204).end();
});

// ---- Operazioni della Stanza di Velluto dalla scorta (Fase 5.4) ----
router.post('/:id/velluto/fusione/anteprima', validate({ params: paramsPartita, body: bodyAnteprimaFusione }), (req, res) => {
  const b = req.body as { possedutaIds: number[]; risultatoId?: number };
  res.json(anteprimaFusione(Number(req.params.id), b.possedutaIds, b.risultatoId));
});
router.post('/:id/velluto/fusione', validate({ params: paramsPartita, body: bodyFusioneScorta }), (req, res) => {
  res.status(201).json(eseguiFusione(Number(req.params.id), req.body as Parameters<typeof eseguiFusione>[1]));
});
router.post('/:id/velluto/forca', validate({ params: paramsPartita, body: bodyForca }), (req, res) => {
  res.json(eseguiForca(Number(req.params.id), req.body as Parameters<typeof eseguiForca>[1]));
});
router.post('/:id/velluto/isolamento', validate({ params: paramsPartita, body: bodyIsolamento }), (req, res) => {
  res.json(eseguiIsolamento(Number(req.params.id), req.body as Parameters<typeof eseguiIsolamento>[1]));
});
router.get('/:id/velluto/isolamento/:possedutaId', validate({ params: paramsPartitaPosseduta }), (req, res) => {
  verificaPartita(Number(req.params.id)); // seconda difesa: la partita deve essere del proprietario della richiesta
  const r = prepared('SELECT persona_id, livello FROM persona_posseduta WHERE id = ? AND partita_id = ?').get(Number(req.params.possedutaId), Number(req.params.id)) as { persona_id: number; livello: number } | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', 'La Persona posseduta non è nella scorta di questa partita.');
  const s = skillResistenzaIsolamento(r.persona_id, r.livello);
  res.json({ elemento: s.elemento, elementoNome: s.elemento ? t('elemento', s.elemento) : null, tier: s.tier, skill: s.skill });
});

// ---- Storico (Fase 5.1) ----
router.get('/:id/storico', validate({ params: paramsPartita, query: queryStorico }), (req, res) => {
  const q = req.query as unknown as { limite?: number; prima?: number; tipi?: string; persona?: number };
  res.json(storico(Number(req.params.id), { limite: q.limite, prima: q.prima, tipi: q.tipi ? (q.tipi.split(',').filter(Boolean) as TipoEvento[]) : undefined, personaId: q.persona }));
});
router.post('/:id/storico/elimina', validate({ params: paramsPartita, body: bodyEliminaEventi }), (req, res) => {
  res.json({ eliminati: eliminaEventi(Number(req.params.id), (req.body as { ids: number[] }).ids) });
});
router.delete('/:id/storico/:eventoId', validate({ params: paramsPartitaEvento }), (req, res) => {
  eliminaEvento(Number(req.params.id), Number(req.params.eventoId));
  res.status(204).end();
});

export default router;
