// ============================================================
// Migrazione 300 — le ricette delle bombe, la fabbricazione di Kawakami e le voci di fabbricazione ancora senza strumento (revisione del
// 2026-10-27 della richiesta «bastava un pulsante bonus sì/no»)
// ============================================================
//
// Richiesta dell'utente: «ma che poi cristo... bastava un pulsante bonus sì/no. L'oggetto è stato già scelto, la quantità anche... se il
// pulsante bonus è attivo quando riscuoto applica la versione con il bonus, altrimenti quella base»; vale per ogni strumento («e quando creo
// l'aroma calmante? o il Goho-M?»), nessun caso a mano. La 299 ha portato le dieci ricette della 290 alla forma base / con il bonus; la
// revisione ha trovato ancora:
//   (1) le nove ricette degli strumenti da battaglia della guida (https://www.allgamestaff.it/persona-5-royal/fabbricazione/: Bomba Megido,
//       Cocktail molotov, Spray congelante, Taser, Cannone ad aria, Psico-bomba, Fiammifero atomico, Bomba allegra, Bomba maledetta) che non
//       erano nei dati: né l'oggetto nel catalogo, né la ricetta (`ricetta_materiale`, `ricompensa_oggetto`), né l'esito. La voce del 11-18
//       («bombe o strumenti d'infiltrazione») non poteva scegliere una bomba. Qui entrano oggetto (con l'effetto della guida), ricetta (i
//       materiali della guida) e i due esiti della fabbricazione (base: Perizia ♪♪ e un oggetto; con il bonus: Perizia ♪♪♪ e due oggetti, con
//       gli stessi materiali; decisione 22), costruiti come la 290 dalle ricette dei dati (un solo punto). Gli esiti diventano 38: il massimo di
//       un'attività sale a 50 (`LIMITI_ESITI`);
//   (2) la fabbricazione di Kawakami: dal rango della sua abilità «Domestica tuttofare» (letto da `confidente_abilita`, oggi 6) «Kawakami può
//       fabbricare strumenti di infiltrazione» al posto tuo, di sera; la guida: «produce circa la metà di quello che produrremmo noi». Il bonus
//       di Morgana (l'elogio) arriva solo quando fabbrichi tu: un'attività a parte, `fabbricazione-kawakami`, con un esito per ricetta (un
//       oggetto e i materiali della ricetta, senza Doti: la guida non dà Perizia per questa via) e senza versioni con il bonus. Per il codice
//       è uno strumento senza bonus (`strumentoDi`, `eCreazione`): la voce dice strumento e quantità, alla spunta non si chiede niente;
//   (3) le voci di fabbricazione che dicono che cosa si crea ma non lo avevano come strumento:
//       - 12-23 «Kawakami: fabbricazione di un grimaldello duraturo» (dopo il 05-31) aveva solo «oggetto ricevuto: Grimaldello duraturo»,
//         senza i materiali: diventa il turno di `fabbricazione-kawakami` con lo strumento Grimaldello duraturo (×1, «un»). Con `convertiVoce`
//         (mai una voce citata da una partita);
//       - 11-22 (Kawakami fabbrica grimaldelli, una delle tre attività possibili): la proposta aperta «oggetto ricevuto: Grimaldello» si chiude
//         come sostituita da una proposta del turno di Kawakami con lo strumento Grimaldello e la quantità da completare (la guida non la dice);
//       - 04-17 (periodo validato: il tutorial, «creazione di un singolo Grimaldello»): la proposta aperta «oggetto ricevuto: Grimaldello» si
//         chiude come sostituita da una proposta del turno della fabbricazione con lo strumento Grimaldello ×1, che toglie la Perizia ♪♪ fissa
//         (la dà l'esito); solo proposte, mai scritture, nel periodo validato;
//       - 09-18 («Chiedere a Kawakami di fabbricare bombe elementali», con più bombe e obiettivi su più sessioni) non dice UNO strumento con la
//         quantità: resta com'è (lo si dice nell'audit);
//   (4) le note delle voci di fabbricazione dopo il 05-31 che ripetevano la Perizia che ora dà lo strumento: 07-25 «Perizia +3» (♪♪♪, cioè
//       il bonus, mentre la spunta parte da «Bonus: no» e registra ♪♪) e 11-18 «Perizia +3 possibile». Si tolgono conservando il testo di
//       prima (`testo_precedente_json`, che la finestra della voce mostra e permette di rimettere), come la 282;
//   (5) i dettagli della fabbricazione: la frase «La ricetta degli Strumenti del cercatore non è nei dati» era sbagliata (la guida: gli
//       Strumenti del cercatore si comprano ad Akihabara e raddoppiano le creazioni, come il libro L'ABC dell'artigianato): al suo posto le
//       creazioni per sessione della guida. Solo se i dettagli sono ancora quelli della 299.
// Conservativa (le regole di `fbisOndata5.ts`: dati della guida mai corretti dall'utente, voci come lette, nessuna voce citata da una partita)
// e idempotente. Audit in `dati_guida.audit-300-bombe-e-kawakami`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { LIMITI_ESITI, chiaveEsitoDaNome, leggiEsitiAttivita, type EsitiAttivita, type EsitoAttivita } from '../../../shared/esitiAttivita.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { FONTE_FABBRICAZIONE, canonico, chiudiProposta, convertiVoce, creaAttivita, creaScheda, nuovaProposta, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-300-bombe-e-kawakami';
const LOTTO = 'bonus-si-no-300';
const FABBRICAZIONE = 'fabbricazione-strumenti';
const KAWAKAMI = 'fabbricazione-kawakami';
const errore = (motivo: string): never => { throw new Error(`300: ${motivo}; nessuna modifica applicata.`); };

/** Le ricette della guida che mancavano: nome (quello della guida), oggetto del catalogo, effetto della guida, materiali (chiave, copie). */
const RICETTE_NUOVE: ReadonlyArray<{ nome: string; oggetto: string; effetto: string; materiali: ReadonlyArray<readonly [string, number]> }> = [
  { nome: 'Bomba Megido', oggetto: 'consumabile/bomba-megido', effetto: 'Infligge 100 danni divini a tutti i nemici', materiali: [['materiale/cuoio-conciato', 4], ['materiale/fosforo-rosso', 3], ['materiale/mercurio', 2]] },
  { nome: 'Cocktail molotov', oggetto: 'consumabile/cocktail-molotov', effetto: 'Infligge 50 danni da fuoco a un nemico (chance alta di infliggere In fiamme)', materiali: [['materiale/balsamo-vegetale', 1], ['materiale/gomitolo-di-seta', 1]] },
  { nome: 'Spray congelante', oggetto: 'consumabile/spray-congelante', effetto: 'Infligge 50 danni da ghiaccio a un nemico (chance alta di infliggere Congelamento)', materiali: [['materiale/fibbia-di-latta', 1], ['materiale/sughero', 1]] },
  { nome: 'Taser', oggetto: 'consumabile/taser', effetto: 'Infligge 50 danni elettrici a un nemico (chance alta di infliggere Folgorazione)', materiali: [['materiale/fibbia-di-latta', 2]] },
  { nome: 'Cannone ad aria', oggetto: 'consumabile/cannone-ad-aria', effetto: 'Infligge 50 danni da vento a un nemico', materiali: [['materiale/pergamena-spessa', 1], ['materiale/sughero', 1]] },
  { nome: 'Psico-bomba', oggetto: 'consumabile/psico-bomba', effetto: 'Infligge 50 danni psicocinetici a un nemico', materiali: [['materiale/lente-condensante', 1], ['materiale/sabbia-ferrea', 1]] },
  { nome: 'Fiammifero atomico', oggetto: 'consumabile/fiammifero-atomico', effetto: 'Infligge 50 danni nucleari a un nemico', materiali: [['materiale/fosforo-rosso', 1], ['materiale/sabbia-ferrea', 1]] },
  { nome: 'Bomba allegra', oggetto: 'consumabile/bomba-allegra', effetto: 'Infligge 50 danni sacri a un nemico', materiali: [['materiale/lente-condensante', 1], ['materiale/pergamena-spessa', 1]] },
  { nome: 'Bomba maledetta', oggetto: 'consumabile/bomba-maledetta', effetto: 'Infligge 50 danni maledetti a un nemico', materiali: [['materiale/cuoio-conciato', 1], ['materiale/fibbia-di-latta', 1]] },
];

/** I dettagli della fabbricazione scritti dalla 299 (si aggiornano solo se sono ancora questi) e quelli nuovi. */
const DETTAGLI_299 = 'Si fabbrica nella mansarda del Leblanc, di sera, dal rango 1 di Morgana. Ogni creazione usa i materiali della ricetta e dà un oggetto; la sessione dà Perizia ♪♪. A volte, a caso, arriva il bonus: un oggetto in più senza altri materiali e Perizia ♪♪♪. Nella voce del Diario si scelgono lo strumento e la quantità; alla spunta si dice solo se è arrivato il bonus. La ricetta degli Strumenti del cercatore non è nei dati: materiali e prodotto sono da verificare in gioco.';
const DETTAGLI_300 = 'Si fabbrica nella mansarda del Leblanc, di sera, dal rango 1 di Morgana (alcune ricette dal rango 6, «Strumenti magistrali»). Ogni creazione usa i materiali della ricetta e dà un oggetto; la sessione dà Perizia ♪♪. A volte, a caso, arriva il bonus: un oggetto in più senza altri materiali e Perizia ♪♪♪. Creazioni per sessione: 1, 3 con la Perizia al rango 2; il libro L’ABC dell’artigianato e gli Strumenti del cercatore (Akihabara) le raddoppiano ciascuno. Nella voce del Diario si scelgono lo strumento e la quantità; alla spunta si dice solo se è arrivato il bonus.';
const dettagliKawakami = (rango: number): string => `Dal rango ${rango} di Kawakami («Domestica tuttofare»), di sera al Leblanc, Kawakami fabbrica al posto tuo gli strumenti d’infiltrazione: ognuno usa i materiali della sua ricetta, e ne fa circa la metà di quelli che faresti tu (per eccesso). Nella voce del Diario si scelgono lo strumento e la quantità; alla spunta non c’è niente da scegliere: il bonus di Morgana arriva solo quando fabbrichi tu.`;

interface Ricetta { nome: string; prodotto: string; materiali: Array<{ oggetto: string; quantita: number }> }

/** (1) Oggetto, ricetta e materiali delle ricette nuove: si scrive solo ciò che manca; una ricetta già presente e diversa non si tocca. */
function ricetteNuove(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  for (const r of RICETTE_NUOVE) {
    if (r.materiali.some(([m]) => !db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(m))) { esiti.push({ chiave: `ricetta:${r.nome}`, esito: 'un materiale non è nel catalogo: ricetta non scritta' }); continue; }
    esiti.push(creaScheda(db, { chiave: r.oggetto, categoria: 'consumabile', nome: r.nome, effetto: r.effetto, descrizione: '', fonteChiave: `fabbricazione/${r.nome}` }, adesso));
    const presenti = db.prepare('SELECT catalogo_chiave AS oggetto, quantita FROM main.ricetta_materiale WHERE ricetta = ? ORDER BY catalogo_chiave').all(r.nome) as Array<{ oggetto: string; quantita: number }>;
    const attesi = [...r.materiali].map(([oggetto, quantita]) => ({ oggetto, quantita })).sort((a, b) => (a.oggetto < b.oggetto ? -1 : 1));
    if (presenti.length && canonico(presenti) !== canonico(attesi)) { esiti.push({ chiave: `ricetta:${r.nome}`, esito: 'materiali già presenti e diversi dalla guida: non toccati' }); continue; }
    if (!presenti.length) for (const m of attesi) db.prepare('INSERT INTO main.ricetta_materiale (ricetta, catalogo_chiave, quantita) VALUES (?, ?, ?)').run(r.nome, m.oggetto, m.quantita);
    const prodotto = db.prepare("SELECT catalogo_chiave FROM main.ricompensa_oggetto WHERE fonte_tipo = 'ricetta' AND fonte_chiave = ?").pluck().all(r.nome) as string[];
    if (prodotto.length && (prodotto.length !== 1 || prodotto[0] !== r.oggetto)) { esiti.push({ chiave: `ricetta:${r.nome}`, esito: 'prodotto della ricetta già presente e diverso: non toccato' }); continue; }
    if (!prodotto.length) db.prepare("INSERT INTO main.ricompensa_oggetto (fonte_tipo, fonte_chiave, catalogo_chiave, quantita, ordine, nota, condizioni_json) VALUES ('ricetta', ?, ?, NULL, 0, NULL, NULL)").run(r.nome, r.oggetto);
    esiti.push({ chiave: `ricetta:${r.nome}`, esito: presenti.length && prodotto.length ? 'ricetta già presente' : 'ricetta scritta (materiali e prodotto della guida)' });
  }
}

/** Tutte le ricette dei dati, nell'ordine della 290 (`fonte_chiave`), con i materiali. */
function ricetteDeiDati(db: AppDatabase): { ricette: Ricetta[]; problema: string | null } {
  const righe = db.prepare("SELECT r.fonte_chiave AS nome, r.catalogo_chiave AS prodotto FROM main.ricompensa_oggetto r JOIN main.catalogo_oggetto c ON c.chiave = r.catalogo_chiave WHERE r.fonte_tipo = 'ricetta' ORDER BY r.fonte_chiave").all() as Array<{ nome: string; prodotto: string }>;
  const ricette: Ricetta[] = [];
  for (const r of righe) {
    const materiali = db.prepare('SELECT catalogo_chiave AS oggetto, quantita FROM main.ricetta_materiale WHERE ricetta = ? ORDER BY catalogo_chiave').all(r.nome) as Array<{ oggetto: string; quantita: number }>;
    if (!materiali.length) return { ricette: [], problema: `la ricetta «${r.nome}» non ha materiali` };
    if (materiali.length > LIMITI_ESITI.oggetti) return { ricette: [], problema: `la ricetta «${r.nome}» ha più di ${LIMITI_ESITI.oggetti} materiali` };
    ricette.push({ nome: r.nome, prodotto: r.prodotto, materiali });
  }
  return ricette.length ? { ricette, problema: null } : { ricette: [], problema: 'nessuna ricetta nei dati' };
}

/** I due esiti della fabbricazione di una ricetta, nella forma della 290 con il collegamento della 299. */
const esitiFabbricazione = (r: Ricetta): [EsitoAttivita, EsitoAttivita] => {
  const chiave = chiaveEsitoDaNome(r.nome);
  return [
    { chiave, nome: `${r.nome} · creato`, gruppo: r.nome, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null, oggetti: [{ oggetto: r.prodotto, quantita: 1 }], consuma: r.materiali },
    { chiave: `${chiave}-bonus`, nome: `${r.nome} · con il bonus`, gruppo: r.nome, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 3 }], premi: null, oggetti: [{ oggetto: r.prodotto, quantita: 2 }], consuma: r.materiali, bonusDi: chiave },
  ];
};

/** (1) e (5) Gli esiti della fabbricazione con le ricette nuove (quelli che ci sono restano identici) e i dettagli. */
function fabbricazioneConTutteLeRicette(db: AppDatabase, ricette: Ricetta[], adesso: string, esiti: Esito[]): boolean {
  const r = db.prepare('SELECT origine, seed_json, esiti_json, dettagli FROM main.attivita WHERE chiave = ?').get(FABBRICAZIONE) as { origine: string; seed_json: string | null; esiti_json: string | null; dettagli: string | null } | undefined;
  if (!r) { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: 'attività assente: niente da fare' }); return false; }
  if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: 'corretta dall’utente: non toccata (le ricette nuove si aggiungono dall’editor degli esiti)' }); return false; }
  const dati = leggiEsitiAttivita(r.esiti_json);
  if (!dati || dati.modo !== 'scelta') { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: 'esiti assenti o non nel modo «scelta»: non toccata' }); return false; }
  const elenco: EsitoAttivita[] = [];
  for (const ricetta of ricette) {
    for (const atteso of esitiFabbricazione(ricetta)) {
      const c = dati.esiti.find((x) => x.chiave === atteso.chiave);
      // un esito che c'è già resta com'è solo se è quello atteso: altrimenti nessuna scrittura (non si indovina che cosa ha cambiato chi)
      if (c && canonico(c) !== canonico(atteso)) { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: `l’esito «${c.chiave}» è diverso da quello della ricetta: non toccata` }); return false; }
      elenco.push(c ?? atteso);
    }
  }
  const altri = dati.esiti.filter((x) => !elenco.some((y) => y.chiave === x.chiave));
  if (altri.length) { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: `esiti senza ricetta (${altri.map((x) => x.chiave).join(', ')}): non toccata` }); return false; }
  if (elenco.length > LIMITI_ESITI.esiti) { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: `${elenco.length} esiti superano il massimo di ${LIMITI_ESITI.esiti}: non toccata` }); return false; }
  const nuovi: EsitiAttivita = { modo: 'scelta', esiti: elenco };
  const json = JSON.stringify(nuovi);
  if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti della fabbricazione con le ricette nuove non si rileggono validi');
  const dettagli = r.dettagli === DETTAGLI_299 ? DETTAGLI_300 : r.dettagli;
  const aggiunti = elenco.length - dati.esiti.length;
  if (json === JSON.stringify(dati) && dettagli === r.dettagli) { esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: 'già con tutte le ricette' }); return false; }
  if (db.prepare('UPDATE main.attivita SET esiti_json = ?, dettagli = ?, updated_at = ? WHERE chiave = ? AND esiti_json = ?').run(json, dettagli, adesso, FABBRICAZIONE, r.esiti_json).changes !== 1) errore('la fabbricazione non si aggiorna');
  esiti.push({ chiave: `attivita:${FABBRICAZIONE}`, esito: `${aggiunti} esiti aggiunti (${aggiunti / 2} ricette, base e con il bonus): ${elenco.length} in tutto${dettagli !== r.dettagli ? '; dettagli aggiornati' : ''}` });
  return true;
}

/** (2) La fabbricazione di Kawakami: un esito per ricetta (un oggetto, i materiali), senza Doti né versioni con il bonus. */
function fabbricazioneDiKawakami(db: AppDatabase, ricette: Ricetta[], adesso: string, esiti: Esito[]): boolean {
  if (db.prepare('SELECT 1 FROM main.attivita WHERE chiave = ?').get(KAWAKAMI)) { esiti.push({ chiave: `attivita:${KAWAKAMI}`, esito: 'attività già presente' }); return false; }
  const rango = esisteTabella(db, 'confidente_abilita') ? db.prepare("SELECT rango FROM main.confidente_abilita WHERE confidente_chiave = 'kawakami' AND nome = 'Domestica tuttofare'").pluck().get() as number | undefined : undefined;
  if (typeof rango !== 'number' || !Number.isInteger(rango) || rango < 1 || rango > 10) { esiti.push({ chiave: `attivita:${KAWAKAMI}`, esito: 'abilità «Domestica tuttofare» di Kawakami assente: nessuna attività' }); return false; }
  if (ricette.length > LIMITI_ESITI.esiti) { esiti.push({ chiave: `attivita:${KAWAKAMI}`, esito: `${ricette.length} ricette superano il massimo di ${LIMITI_ESITI.esiti} esiti: nessuna attività` }); return false; }
  const elenco: EsitoAttivita[] = ricette.map((r) => ({ chiave: chiaveEsitoDaNome(r.nome), nome: r.nome, gruppo: null, articolo: null, condizioni: [], doti: [], premi: null, oggetti: [{ oggetto: r.prodotto, quantita: 1 }], consuma: r.materiali }));
  const json = JSON.stringify({ modo: 'scelta', esiti: elenco } satisfies EsitiAttivita);
  if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti della fabbricazione di Kawakami non si rileggono validi');
  esiti.push(creaAttivita(db, { chiave: KAWAKAMI, nome: 'Fabbricazione degli strumenti di Kawakami', tipo: 'altro', luogo: 'Yongen-Jaya, Leblanc', quartiere: 'yongen-jaya', sede: 'yongen-jaya/leblanc',
    fascia: 'sera', fonte: FONTE_FABBRICAZIONE, dettagli: dettagliKawakami(rango), condizioni: [{ tipo: 'confidente', confidente: 'kawakami', rango }], esiti: json }, adesso));
  return true;
}

const OGGETTO_GRIMALDELLO_1 = '[{"effetto":{"tipo":"oggetto","oggetto":"consumabile/grimaldello","quantita":1},"completa":[],"scelte":null}]';
const OGGETTO_GRIMALDELLO_DA_COMPLETARE = '[{"effetto":{"tipo":"oggetto","oggetto":"consumabile/grimaldello","quantita":1},"completa":["quantita"],"scelte":null}]';
const leggiEffetto = (json: string): EffettoVoce | null => { try { return normalizzaEffettoVoce(JSON.parse(json)); } catch { return null; } };
const haEsito = (db: AppDatabase, attivita: string, esito: string): boolean =>
  !!leggiEsitiAttivita(db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').pluck().get(attivita) as string | null | undefined)?.esiti.some((e) => e.chiave === esito);

/** (3) Le voci di fabbricazione che dicono che cosa si crea. */
function vociDiFabbricazione(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const partite = tabellePartiteConVoce(db);
  // 12-23: Kawakami fabbrica UN grimaldello duraturo (dopo il 05-31: si converte)
  const v1223 = '4f2d66074cb013dbf2eb80c8b5b3eda0';
  if (!haEsito(db, KAWAKAMI, 'grimaldello-duraturo')) esiti.push({ chiave: `voce:12-23:${v1223}`, esito: 'saltata: la fabbricazione di Kawakami o il Grimaldello duraturo mancano' });
  else esiti.push(convertiVoce(db, { uid: v1223, data: '12-23', azione: 'Kawakami: fabbricazione di un grimaldello duraturo',
    attesi: [{ uid: null, effetto: { tipo: 'oggetto', oggetto: 'consumabile/grimaldello-duraturo', quantita: 1 }, togli: true }], togli: [],
    aggiungi: [{ seme: `${LOTTO}:turno:${v1223}`, effetto: { tipo: 'turno', attivita: KAWAKAMI, esito: 'grimaldello-duraturo' } }],
    motivo: '«fabbricazione di un grimaldello duraturo» con Kawakami: lo strumento Grimaldello duraturo ×1 della fabbricazione di Kawakami (dà l’oggetto e usa i materiali della ricetta); l’«oggetto ricevuto» esce, lo dà lo strumento', lotto: LOTTO }, partite, adesso));

  // 11-22: Kawakami fabbrica grimaldelli (quanti non si dice): proposta con la quantità da completare, al posto di quella dell'oggetto
  const v1122 = '66b80cfb13c42a296eb71a7821aa2bef';
  const id1122 = `O5bonus-${v1122.slice(0, 8)}-03-kawakami`;
  if (!haEsito(db, KAWAKAMI, 'grimaldello')) esiti.push({ chiave: id1122, esito: 'la fabbricazione di Kawakami o il Grimaldello mancano: nessuna proposta' });
  else {
    const creata = nuovaProposta(db, { id: id1122, voce: v1122, tipo: null, riferimento: null,
      effetti: [{ effetto: { tipo: 'turno', attivita: KAWAKAMI, esito: 'grimaldello' }, completa: ['quantita'], scelte: null }], togli: [],
      motivo: '«fabbricare grimaldelli con Kawakami» (una delle attività possibili della sera): lo strumento Grimaldello della fabbricazione di Kawakami, che dà i grimaldelli e usa i materiali; la quantità la dici tu (la guida non la dice). Al posto della proposta «oggetto ricevuto: Grimaldello», che non usava i materiali.',
      certezza: 'da-verificare', lotto: LOTTO }, adesso);
    esiti.push(creata);
    if (creata.esito.startsWith('proposta creata') || creata.esito === 'proposta già presente') esiti.push(chiudiProposta(db, { id: 'L13-4b-66b80cfb-02-b-premio', voce: v1122, effetti: OGGETTO_GRIMALDELLO_DA_COMPLETARE, modo: 'sostituita', da: id1122,
      perche: 'i grimaldelli fabbricati da Kawakami sono lo strumento del turno (dà gli oggetti e usa i materiali): l’«oggetto ricevuto» li conterebbe due volte' }, adesso));
  }

  // 04-17 (periodo validato): il tutorial, un Grimaldello creato: proposta dello strumento, al posto di quella dell'oggetto; la Perizia ♪♪ fissa esce
  const v0417 = 'cf1e3b48a741a17e529f490a149efdeb';
  const id0417 = `O5bonus-${v0417.slice(0, 8)}-03-strumento`;
  const perizia = (db.prepare('SELECT uid, dati_json FROM main.voce_effetto WHERE voce_uid = ? AND tipo = ?').all(v0417, 'dote') as Array<{ uid: string; dati_json: string }>)
    .filter((x) => canonico(leggiEffetto(x.dati_json)) === canonico({ tipo: 'dote', dote: 'perizia', note: 2 }));
  if (!haEsito(db, FABBRICAZIONE, 'grimaldello')) esiti.push({ chiave: id0417, esito: 'la fabbricazione o il Grimaldello mancano: nessuna proposta' });
  else if (perizia.length !== 1) esiti.push({ chiave: id0417, esito: `la voce ha ${perizia.length} effetti «Perizia ♪♪»: nessuna proposta (non si indovina quale esce)` });
  else {
    const creata = nuovaProposta(db, { id: id0417, voce: v0417, tipo: null, riferimento: null,
      effetti: [{ effetto: { tipo: 'turno', attivita: FABBRICAZIONE, esito: 'grimaldello' }, completa: [], scelte: null }], togli: [perizia[0]!.uid],
      motivo: '«creazione di un singolo Grimaldello»: lo strumento Grimaldello ×1 della fabbricazione, che dà la Perizia ♪♪, il grimaldello e usa i materiali (alla spunta solo «Bonus» sì/no); la Perizia fissa esce, la dà lo strumento. Al posto della proposta «oggetto ricevuto: Grimaldello», che non usava i materiali.',
      certezza: 'probabile', lotto: LOTTO }, adesso);
    esiti.push(creata);
    if (creata.esito.startsWith('proposta creata') || creata.esito === 'proposta già presente') esiti.push(chiudiProposta(db, { id: 'L13-4b-cf1e3b48-01-b-premio', voce: v0417, effetti: OGGETTO_GRIMALDELLO_1, modo: 'sostituita', da: id0417,
      perche: 'il grimaldello creato è lo strumento del turno (dà l’oggetto e usa i materiali): l’«oggetto ricevuto» lo conterebbe due volte' }, adesso));
  }

  esiti.push({ chiave: 'voce:09-18:fd5e5faca7fdf93315f39926765ddb8c', esito: 'lasciata com’è: «fabbricare bombe elementali» con più bombe e obiettivi su più sessioni non dice uno strumento con la quantità (si sceglie nell’editor della voce, con la fabbricazione di Kawakami)' });
}

/** (4) Le note che ripetevano la Perizia che ora dà lo strumento: tolte, con il testo di prima conservato (come la 282). */
function noteDellaPerizia(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  if (!haColonna(db, 'voce_giornata', 'testo_precedente_json') || !haColonna(db, 'voce_giornata', 'motivo_revisione')) { esiti.push({ chiave: 'note', esito: 'colonne del testo precedente assenti: note lasciate' }); return; }
  const NOTE = [
    { uid: 'f2900f8c540dcea8328d42bb6fc0a25a', data: '07-25', nota: 'Perizia +3' },
    { uid: '4dff5d80637334a0d4335a969f268b1f', data: '11-18', nota: 'Perizia +3 possibile' },
  ];
  for (const n of NOTE) {
    const chiave = `nota:${n.data}:${n.uid}`;
    const v = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(n.uid) as
      { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null } | undefined;
    if (!v) { esiti.push({ chiave, esito: 'voce assente' }); continue; }
    if (v.note === null && v.testo_precedente_json !== null) { esiti.push({ chiave, esito: 'nota già tolta' }); continue; }
    if (v.data !== n.data || v.note !== n.nota || v.testo_precedente_json !== null || v.aggiunta_da !== null) { esiti.push({ chiave, esito: 'voce diversa da quella attesa o modificata dall’utente: non toccata' }); continue; }
    // la Perizia la deve dare lo strumento della voce: senza il turno della fabbricazione la nota resta (sarebbe l'unico punto che la dice)
    const turno = (db.prepare("SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'turno'").pluck().all(n.uid) as string[]).some((j) => { const e = leggiEffetto(j); return e?.tipo === 'turno' && e.attivita === FABBRICAZIONE; });
    if (!turno) { esiti.push({ chiave, esito: 'senza il turno della fabbricazione: nota lasciata' }); continue; }
    const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
    const motivo = `2026-10-27 («bastava un pulsante bonus sì/no»): la nota «${n.nota}» ripeteva la Perizia che dà lo strumento della voce (♪♪, ♪♪♪ con «Bonus» acceso alla spunta): tolta, il dato resta nello strumento.`;
    if (db.prepare('UPDATE main.voce_giornata SET note = NULL, testo_precedente_json = ?, motivo_revisione = ?, updated_at = ? WHERE uid = ? AND note = ? AND testo_precedente_json IS NULL')
      .run(precedente, motivo, adesso, n.uid, n.nota).changes !== 1) errore(`la nota della voce ${n.uid} non si toglie`);
    esiti.push({ chiave, esito: `nota «${n.nota}» tolta (testo di prima conservato)` });
  }
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({ migrazione: 300, richiesta: '2026-10-27: «bastava un pulsante bonus sì/no» (revisione)', decisioni: ['L13-22'], fonti: [FONTE_FABBRICAZIONE], esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export const migration300: Migration = {
  id: 300,
  name: 'bombe_e_fabbricazione_di_kawakami',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'catalogo_oggetto', 'ricompensa_oggetto', 'ricetta_materiale', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 300, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 300 }, 'esiti delle attività assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    ricetteNuove(db, adesso, esiti);
    const { ricette, problema } = ricetteDeiDati(db);
    let attivita = 0;
    if (problema) esiti.push({ chiave: 'ricette', esito: `${problema}: attività non toccate` });
    else {
      if (fabbricazioneConTutteLeRicette(db, ricette, adesso, esiti)) attivita += 1;
      if (fabbricazioneDiKawakami(db, ricette, adesso, esiti)) attivita += 1;
    }
    vociDiFabbricazione(db, adesso, esiti);
    noteDellaPerizia(db, adesso, esiti);
    const conteggi = {
      schedeCreate: esiti.filter((e) => e.esito === 'scheda creata').length,
      ricetteScritte: esiti.filter((e) => e.esito.startsWith('ricetta scritta')).length,
      attivita,
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata') || e.esito.startsWith('lasciata')).length,
      proposteCreate: esiti.filter((e) => e.esito.startsWith('proposta creata')).length,
      proposteChiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
      noteTolte: esiti.filter((e) => e.esito.startsWith('nota «')).length,
    };
    const cambiato = conteggi.schedeCreate + conteggi.ricetteScritte + conteggi.attivita + conteggi.vociConvertite + conteggi.proposteCreate + conteggi.proposteChiuse + conteggi.noteTolte > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti }, cambiato);
    logger.info({ migrazione: 300, ...conteggi }, 'Bonus sì/no (revisione): ricette delle bombe, fabbricazione di Kawakami, voci con lo strumento, note della Perizia');
  },
};
