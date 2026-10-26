// ============================================================
// negoziService — negozi e articoli (armi, protezioni, accessori, oggetti, regali, cibo) con ricerca e acquisti per partita (Fase 8.2)
// ============================================================
//
// Dalla voce 4 del piano «struttura, non frasi» (2026-09-12) la disponibilità di un negozio è
// **solo i suoi orari** (`orari_json`, migrazione 069): un negozio che non è ancora aperto non è
// un posto che non c'è, e le condizioni di sblocco vivono sugli articoli (070). Il negozio ha una
// sede fra i luoghi della città (072) e, se ce l'ha, un programma punti dichiarato (076).
// ============================================================

import { condizioneConTesto, leggiCondizioniSalvate, ordineGioco, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { createHash } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { nuovaValutazioneLegacy } from '../db/acquistiLegacy.js';
import { conCestinoPrivato } from './cestinoService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { statoDisponibilitaPartita, valutaRequisiti, type StatoDisponibilita } from './disponibilitaService.js';
import { registraEvento } from './storicoService.js';
import { attivitaConQuiz, quizVoceDto } from './attivitaService.js';
import { catalogoOggettiDisponibile, costoOggetto, oggettiConChiavi, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { categoriaDelListino, normalizzaNomeOggetto } from '../../shared/catalogo.js';
import { trasformazioniDiJose } from './trasformazioniOggetti.js';
import { descriviVoceEffetto, leggiVociEffetto } from '../../shared/effettiCatalogo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { descriviOrari, descriviOrariDelLuogo, leggiOrari, orariComeCondizioni, orariDelLuogo, type OrariNegozio } from '../../shared/orariNegozio.js';
import { condizioniDiSblocco } from './sbloccoLuoghi.js';
import { articoloDelListino, articoliEquivalenti, lettureListiniCondivisi, listinoDelNegozio, type LettureListiniCondivisi } from './listiniCondivisi.js';
import { acquistiArticolo, chiaviArticoliOttenuti } from './acquistiService.js';
import { eOffertaAojiru } from '../../shared/acquisti.js';
import { noteStoricheDi } from './noteStoricheService.js';
import { momentoDellaVoce, requisitoScorta, rifornimentoDellArticolo, rigaDellaVoce, righeDellArticolo, scortaDellArticolo, scriviRiga, togliRiga, ultimaRigaDelNegozio } from './scorteService.js';
import type { ArticoloDto, CatalogoOggettoDto, DisponibilitaDto, NegozioDettaglioDto, NegozioRiassuntoDto, RicercaArticoliDto, ScortaArticoloDto } from '../../shared/types.js';

/** L5: quel che serve alla presenza di un negozio, letto con la riga: la sua eccezione d'orario e orari e sblocco della sede. */
interface PresenzaRiga { sblocco_json?: string | null; orari_json: string | null; eccezione_orari_json?: string | null; sede_chiave: string | null; sede_orari_json?: string | null; sede_condizioni_json?: string | null }
interface RigaNegozio extends PresenzaRiga { condizioni_json: string | null; orari_json: string | null; sede_chiave: string | null; sede_nome?: string | null; programma_punti_json: string | null; chiave: string; ordine: number; nome: string; luogo: string; luogo_chiave: string | null; tipo: string; gestore: string | null; confidente_chiave: string | null; orari: string | null; sblocco: string | null; note: string | null; fonte: string; confidente_nome?: string | null; quartiere_nome?: string | null; articoli?: number; verificati?: number }
interface RigaArticolo { rifornimento_json?: string | null; catalogo_chiave?: string | null; costo_json?: string | null; condizioni_json: string | null; oggetto_fonte: string | null; oggetto_chiave: string | null; quantita: number | null; chiave: string; negozio_chiave: string; negozio_confidente?: string | null; negozio_orari?: string | null;
  /** L5: eccezione d'orario e sede del negozio, con orari e sblocco della sede. */
  negozio_sblocco?: string | null; negozio_eccezione?: string | null; negozio_sede?: string | null; sede_orari_json?: string | null; sede_condizioni_json?: string | null; ordine: number; nome: string; categoria: string; per: string | null; prezzo: number | null; effetto: string | null; statistiche: string | null; nota: string | null; fonte: string; verificato: number; negozio_nome?: string }

// L5: con la sede vengono anche i suoi orari e il suo sblocco (`l.orari_json`, `l.condizioni_json`): sono la presenza del negozio
const SQL_NEGOZIO = `SELECT n.*, c.nome AS confidente_nome, q.nome AS quartiere_nome, l.nome AS sede_nome, l.orari_json AS sede_orari_json, l.condizioni_json AS sede_condizioni_json,
  (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = n.chiave AND a.nascosto = 0) AS articoli, (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = n.chiave AND a.verificato = 1 AND a.nascosto = 0) AS verificati
  FROM negozio n LEFT JOIN confidente c ON c.chiave = n.confidente_chiave LEFT JOIN quartiere q ON q.chiave = n.luogo_chiave LEFT JOIN luogo l ON l.chiave = n.sede_chiave`;
const SQL_ARTICOLO = `SELECT a.*, n.nome AS negozio_nome, n.confidente_chiave AS negozio_confidente, n.orari_json AS negozio_orari, n.eccezione_orari_json AS negozio_eccezione,
  n.sblocco_json AS negozio_sblocco, n.sede_chiave AS negozio_sede, l.orari_json AS sede_orari_json, l.condizioni_json AS sede_condizioni_json
  FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave LEFT JOIN luogo l ON l.chiave = n.sede_chiave`;

// Il testo di una condizione si genera con i nomi della Guida, non con le chiavi: «Articolo ottenuto: Laptop rotto», non «yumenoshima/laptop-rotto».
function regole(json: string | null) { const nomi = nomiCondizioniMemo(); return leggiCondizioniSalvate(json).map((c) => condizioneConTesto(c, nomi)); }
/** La presenza del negozio: i suoi orari, come condizioni che il valutatore sa leggere. */
function regoleOrari(orari: OrariNegozio) { return orariComeCondizioni(orari).map((c: RequisitoSpillo) => condizioneConTesto(c)); }

/**
 * L5 (§3.1, R5-12b): gli orari di un negozio. Con una sede sono quelli del luogo (o la regola dell'app), salvo l'eccezione del negozio quando
 * la guida la distingue; senza sede (online, televisione, dentro un Palazzo) restano i suoi. Il testo dice da dove vengono.
 */
function orariDelNegozio(r: PresenzaRiga): { orari: OrariNegozio; testo: string } {
  if (r.eccezione_orari_json) { const o = leggiOrari(r.eccezione_orari_json); return { orari: o, testo: descriviOrari(o) }; }
  if (r.sede_chiave) { const o = orariDelLuogo(r.sede_orari_json ?? null); return { orari: o, testo: descriviOrariDelLuogo(o) }; }
  const o = leggiOrari(r.orari_json);
  return { orari: o, testo: descriviOrari(o) };
}

/** L5: la presenza di un negozio come condizioni: lo sblocco della sede (se ne ha una) e gli orari del negozio. */
function condizioniPresenza(r: PresenzaRiga, orari: OrariNegozio) {
  const nomi = nomiCondizioniMemo();
  const sblocco = r.sede_chiave ? condizioniDiSblocco({ chiave: r.sede_chiave, condizioni_json: r.sede_condizioni_json ?? null }) : [];
  return [...sblocco.map((c) => condizioneConTesto(c, nomi)), ...regole(r.sblocco_json ?? null), ...regoleOrari(orari)];
}

/** Presenza senza caricare il listino: usata anche dalla navigazione dell'Area. */
export function disponibilitaDelNegozio(chiave: string, st: StatoDisponibilita) {
  const r = prepared(`${SQL_NEGOZIO} WHERE n.chiave = ? AND n.nascosto = 0`).get(chiave) as RigaNegozio | undefined;
  return r ? valutaRequisiti(condizioniPresenza(r, orariDelNegozio(r).orari), st) : undefined;
}

/** La pagina del luogo in cui il negozio ha la sede, aperta sulla sua sezione; null senza sede. */
function sedeCasa(chiave: string, sede: string | null): string | null {
  if (!sede) return null;
  const i = sede.indexOf('/');
  const pagina = i > 0 ? `/guida/luogo/${encodeURIComponent(sede.slice(0, i))}/${encodeURIComponent(sede.slice(i + 1))}` : `/guida/luogo/${encodeURIComponent(sede)}`;
  return `${pagina}#negozio-${encodeURIComponent(chiave)}`;
}

/** Il programma punti di un negozio, dal JSON della riga (migrazione 076); null se assente o malformato. */
export function leggiProgrammaPunti(json: string | null): NegozioRiassuntoDto['programmaPunti'] {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as { nome?: unknown; unita?: unknown; calcolo?: unknown };
    if (typeof p.nome !== 'string' || typeof p.unita !== 'string' || (p.calcolo !== 'manuale' && p.calcolo !== 'rango-cliente')) return null;
    return { nome: p.nome, unita: p.unita, calcolo: p.calcolo };
  } catch { return null; }
}

/** Il riassunto di un negozio: orari strutturati e in parole (che sono anche le sue condizioni di presenza, valutate se c'è
 *  lo stato della partita), Confidente, sede, programma punti e conteggi degli articoli non nascosti. */
function riassunto(r: RigaNegozio, st?: StatoDisponibilita): NegozioRiassuntoDto {
  // L5: gli orari della sede (più l'eccezione), e la presenza della sede (sblocco e orari)
  const { orari, testo } = orariDelNegozio(r);
  const condizioni = condizioniPresenza(r, orari);
  return {
    condizioni, ...(st ? { disponibilita: valutaRequisiti(condizioni, st) } : {}),
    chiave: r.chiave, nome: r.nome, luogo: r.luogo, luogoChiave: r.luogo_chiave, quartiereNome: r.quartiere_nome ?? null, tipo: r.tipo as NegozioRiassuntoDto['tipo'], gestore: r.gestore,
    confidente: r.confidente_chiave ? { chiave: r.confidente_chiave, nome: r.confidente_nome ?? r.confidente_chiave } : null,
    orariStrutturati: orari, orariTesto: testo,
    sedeCasa: sedeCasa(r.chiave, r.sede_chiave), eccezioneOrari: r.eccezione_orari_json ? leggiOrari(r.eccezione_orari_json) : null,
    sedeChiave: r.sede_chiave, sedeNome: r.sede_chiave ? (r.sede_nome ?? null) : null, programmaPunti: leggiProgrammaPunti(r.programma_punti_json),
    articoli: r.articoli ?? 0, verificati: r.verificati ?? 0,
  };
}

/** La disponibilita' di un articolo tiene conto anche di quella del negozio — a bottega chiusa non
 *  si compra niente — ma le due cose restano **distinguibili**: la presenza del negozio sono i suoi
 *  orari (marcati `daNegozio`), il resto è dell'articolo (compreso lo sblocco che era del negozio).
 *
 *  Ondata 5 (decisione 21): con una regola di rifornimento e un limite di pezzi, un requisito in più, la scorta del ciclo in corso («Rimasti 1
 *  di 3», «Esaurito: torna lunedì 25 aprile»), calcolata dal registro degli acquisti (`scorteService`): esaurita, l'articolo è bloccato. */
function disponibilitaArticolo(r: RigaArticolo, st: StatoDisponibilita, scorta: ScortaArticoloDto | null = scortaDellArticolo(r, st)): DisponibilitaDto {
  // L5: la presenza del negozio è quella della sede (sblocco e orari, o l'eccezione del negozio)
  const presenza: PresenzaRiga = { sblocco_json: r.negozio_sblocco ?? null, orari_json: r.negozio_orari ?? null, eccezione_orari_json: r.negozio_eccezione ?? null, sede_chiave: r.negozio_sede ?? null, sede_orari_json: r.sede_orari_json ?? null, sede_condizioni_json: r.sede_condizioni_json ?? null };
  const negozio = condizioniPresenza(presenza, orariDelNegozio(presenza).orari).map((c) => ({ ...c, testo: 'Negozio: ' + c.testo }));
  const esito = valutaRequisiti([...negozio, ...regole(r.condizioni_json)], st);
  const requisiti = esito.requisiti.map((q, i) => (i < negozio.length ? { ...q, daNegozio: true } : q));
  const daScorta = requisitoScorta(scorta, requisiti.length);
  if (!daScorta) return { ...esito, requisiti };
  return { stato: daScorta.stato === 'rosso' ? 'bloccato' : esito.stato, requisiti: [...requisiti, daScorta] };
}
/** La riga del negozio, con quel che descrive l'oggetto **letto dall'oggetto**, non copiato.
 *
 * Un articolo collegato non ha una descrizione propria: nome, effetto, statistiche e «per chi»
 * vengono dall'oggetto a ogni lettura. Se il collegamento punta a qualcosa che non c'e' piu' si
 * torna a quel che la riga ha di suo, invece di mostrare una scheda vuota. */
function identitaArticoli(righe: readonly RigaArticolo[]): Map<string, CatalogoOggettoDto> | undefined {
  return catalogoOggettiDisponibile() ? oggettiConChiavi(righe.flatMap((r) => r.catalogo_chiave ? [r.catalogo_chiave] : [])) : undefined;
}

function statisticheDelCatalogo(o: CatalogoOggettoDto): string | null {
  if (typeof o.statistiche?.testo === 'string') return o.statistiche.testo || null;
  const voci = leggiVociEffetto(JSON.stringify(o.statistiche?.effetti ?? []));
  const pezzi = voci.map((v) => descriviVoceEffetto(v));
  if (typeof o.statistiche?.sessioni === 'number' && o.statistiche.sessioni > 1) pezzi.push(`${o.statistiche.sessioni} sessioni`);
  return pezzi.join(' · ') || null;
}

/** Le condizioni di tempo di un'offerta: dove la data entra davvero («dal 18 aprile», «dopo il Palazzo di Madarame», «solo in primavera»). */
const CONDIZIONI_DI_TEMPO: ReadonlySet<string> = new Set(['data', 'intervallo', 'stagione', 'arco', 'quartiere']);

/**
 * «Disponibile dal» dell'offerta, sempre dalle condizioni strutturate (R11-02/10; la colonna `articolo.disponibile_dal` è tolta, 194): le condizioni di tempo
 * con la loro frase, e di più condizioni «dal» solo l'ultima (la data da cui l'offerta c'è davvero). Nessuna condizione di tempo: nessun testo.
 */
function tempisticaDelleCondizioni(condizioni: ReadonlyArray<RequisitoSpillo & { testo: string }>): string | null {
  const di = condizioni.filter((c) => CONDIZIONI_DI_TEMPO.has(c.tipo));
  const date = di.filter((c): c is RequisitoSpillo & { tipo: 'data'; dal: string; testo: string } => c.tipo === 'data');
  const ultima = date.length > 1 ? date.reduce((a, b) => (ordineGioco(b.dal) > ordineGioco(a.dal) ? b : a)) : null;
  const frasi = di.filter((c) => c.tipo !== 'data' || ultima === null || c === ultima).map((c) => c.testo.trim()).filter(Boolean);
  return frasi.length ? frasi.join(' · ') : null;
}

function articoloDto(r: RigaArticolo, acquistati: Set<string>, st?: StatoDisponibilita, catalogo?: Map<string, CatalogoOggettoDto>, ricevuti: NonNullable<ArticoloDto['ricevuti']> = []): ArticoloDto {
  const oggetto = r.catalogo_chiave ? catalogo?.get(r.catalogo_chiave) : undefined;
  const costo = costoOggetto(r.costo_json ?? null);
  const acquisti = st?.partitaId === undefined ? undefined : acquistiArticolo(st.partitaId, r.chiave, st.acquisti);
  const acquistiRegistrati = articoliEquivalenti(r.chiave, lettureListiniCondivisi()).filter((chiave) => st?.partitaId !== undefined
    && (chiave === r.chiave ? acquisti : acquistiArticolo(st.partitaId, chiave, st.acquisti))?.presenzaStorica != null).map((articolo) => {
    const origine = prepared('SELECT n.nome FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.chiave = ?').get(articolo) as { nome: string } | undefined;
    return { articolo, negozioNome: origine?.nome ?? 'Offerta precedente' };
  });
  const condizioniArticolo = regole(r.condizioni_json);
  // Ondata 5: la scorta del ciclo in corso (con la partita), letta una volta e passata alla disponibilità
  const scorta = st ? scortaDellArticolo(r, st) : null;
  return { ricevuti, condizioni: condizioniArticolo, rifornimento: rifornimentoDellArticolo(r), ...(st ? { scorta } : {}), chiave: r.chiave, negozioChiave: r.negozio_chiave, negozioNome: r.negozio_nome ?? '', sedeChiave: r.negozio_sede ?? null,
    catalogo: oggetto ? { chiave: oggetto.chiave, nome: oggetto.nome, casa: oggetto.casa } : null,
    nomiAltri: oggetto?.nomiAltri ?? [], nomeOriginale: oggetto?.nomeOriginale ?? null, costo, costoDaVerificare: r.costo_json != null && costo === null,
    nome: oggetto?.nome ?? (r.nome || 'Oggetto da collegare'),
    categoria: oggetto ? categoriaDelListino(oggetto.categoria, oggetto.sottocategoria) : r.categoria as ArticoloDto['categoria'],
    per: oggetto ? (typeof oggetto.statistiche?.per === 'string' ? oggetto.statistiche.per : null) : r.per, prezzo: r.prezzo,
    effetto: oggetto ? oggetto.effetto || null : r.effetto, statistiche: oggetto ? statisticheDelCatalogo(oggetto) : r.statistiche,
    quantita: r.quantita, oggettoFonte: r.oggetto_fonte, oggettoChiave: r.oggetto_chiave,
    disponibileDal: tempisticaDelleCondizioni(condizioniArticolo), nota: r.nota, verificato: r.verificato === 1,
    // F6: la nota storica della fonte è un dato (migrazione 139), legato all'offerta
    noteStoriche: noteStoricheDi('articolo', r.chiave),
    acquistato: acquisti?.acquistato === true || articoliEquivalenti(r.chiave, lettureListiniCondivisi()).some(k => acquistati.has(k)), acquistiRegistrati, acquisti,
    ...(st ? { disponibilita: disponibilitaArticolo(r, st, scorta) } : {}) };
}

/** Le chiavi degli articoli segnati come acquistati nella partita; insieme vuoto senza partita (con partita ne verifica l'esistenza). */
function acquistiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  verificaPartita(partitaId);
  return chiaviArticoliOttenuti(partitaId);
}

/** Negozi in ordine con conteggi canonici dell'intero catalogo; con la partita, la presenza dagli orari. */
export function elencaNegozi(partitaId?: number): NegozioRiassuntoDto[] {
  const st = partitaId === undefined ? undefined : statoDisponibilitaPartita(partitaId);
  const listini = lettureListiniCondivisi();
  return (prepared(`${SQL_NEGOZIO} WHERE n.nascosto = 0 ORDER BY n.ordine`).all() as RigaNegozio[])
    .filter((r) => !listini.negozi.has(r.chiave))
    .map((r) => riassunto(r, st));
}

/** Lo stato della partita già calcolato da chi chiama: una mappa con molti negozi lo passa invece di farlo ricalcolare per ogni pin. */
export interface ContestoNegozio { st?: StatoDisponibilita; acquistati?: Set<string>; listini?: LettureListiniCondivisi }

/** Gli acquisti segnati nella partita (con la verifica della partita), per costruire un `ContestoNegozio`. */
export function acquistiDellaPartita(partitaId: number): Set<string> {
  return acquistiPartita(partitaId);
}

/** Porta del dominio acquisti: legge il momento corrente, senza fingere di ricostruire progressi passati.
 * Mappe e insiemi dello stato entrano interamente nella revisione, non vengono ridotti a oggetti vuoti. */
export function disponibilitaAcquistoCorrente(partitaId: number, articolo: string, sede?: string) {
  verificaPartita(partitaId);
  const listini = lettureListiniCondivisi();
  const chiave = articoloDelListino(articolo, listini);
  const r = prepared(`${SQL_ARTICOLO} WHERE a.chiave = ? AND a.nascosto=0 AND n.nascosto=0`).get(chiave) as RigaArticolo | undefined;
  if (!r) throw httpErrors.notFound('articolo-non-trovato', 'L’offerta da valutare non esiste.');
  const negozio = prepared(`${SQL_NEGOZIO} WHERE n.chiave = ?`).get(r.negozio_chiave) as RigaNegozio | undefined;
  if (!negozio) throw httpErrors.notFound('negozio-non-trovato', 'Il negozio dell’offerta non esiste.');
  const fonte = conSede(r, negozioNellaSede(negozio, sede, listini));
  const stato = statoDisponibilitaPartita(partitaId);
  const canonico = (v: unknown): unknown => {
    if (v instanceof Map) return [...v].map(([k, x]) => [canonico(k), canonico(x)]).sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));
    if (v instanceof Set) return [...v].map(canonico).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (Array.isArray(v)) return v.map(canonico);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)]));
    return v;
  };
  return { disponibilita: disponibilitaArticolo(fonte, stato), revisione: createHash('sha256').update(JSON.stringify(canonico({ fonte, negozio, stato }))).digest('hex') };
}

/** La scheda di un negozio non nascosto con i suoi articoli non nascosti, nell'ordine; con la partita, acquisti e
 *  disponibilità (presi da `contesto` se chi chiama li ha già). 404 se il negozio non c'è o è nascosto. */
export function dettaglioNegozio(chiave: string, partitaId?: number, contesto?: ContestoNegozio, sede?: string): NegozioDettaglioDto {
  const listini = contesto?.listini ?? lettureListiniCondivisi();
  const origine = prepared(`${SQL_NEGOZIO} WHERE n.nascosto = 0 AND n.chiave = ?`).get(chiave) as RigaNegozio | undefined;
  if (!origine) throw httpErrors.notFound('negozio-non-trovato', `Il negozio '${chiave}' non esiste.`);
  const canonica = listinoDelNegozio(chiave, listini);
  const principale = canonica === chiave ? origine : prepared(`${SQL_NEGOZIO} WHERE n.nascosto = 0 AND n.chiave = ?`).get(canonica) as RigaNegozio | undefined;
  if (!principale) throw httpErrors.notFound('negozio-non-trovato', 'Il listino condiviso non è disponibile.');
  const n = negozioNellaSede(principale, sede, listini);
  // lo stato della partita (rilievo P1 della verifica): dal contesto se c'è, altrimenti calcolato qui
  const st = partitaId === undefined ? undefined : contesto?.st ?? statoDisponibilitaPartita(partitaId);
  const acquistati = partitaId === undefined ? new Set<string>() : contesto?.acquistati ?? st?.articoliOttenuti ?? acquistiPartita(partitaId);
  const riepilogo = riassunto(n, st);
  const righeArticoli = prepared(`${SQL_ARTICOLO} WHERE a.nascosto = 0 AND a.negozio_chiave = ? ORDER BY a.ordine`).all(canonica) as RigaArticolo[];
  const catalogo = identitaArticoli(righeArticoli);
  const ricevuti = ricompensePerFonte('articolo', righeArticoli.map((r) => r.chiave));
  const articoli = righeArticoli.map((r) => articoloDto(conSede(r, n), acquistati, st, catalogo, ricevuti.get(r.chiave)));
  const conteggi = { articoli: n.articoli ?? 0, verificati: n.verificati ?? 0 };
  // la guida del quiz dei lavori che si fanno qui (richiesta dell'utente, 2026-10-17: il quiz dei codici a barre al Triple Seven)
  const quiz = n.sede_chiave ? [...attivitaConQuiz()].filter(([, a]) => a.sede === n.sede_chiave).map(([c, a]) => quizVoceDto(c, a, st?.dataGioco ?? null)) : [];
  return { ...riepilogo, ...conteggi, note: n.note, articoliElenco: articoli, acquistati: articoli.filter((a) => a.acquistato).length, quiz,
    ...(n.chiave === 'jose' ? { trasformazioni: trasformazioniDiJose(st) } : {}) };
}

/** Stesso listino, presenza della sede scelta: Shibuya non eredita gli orari della scuola. */
function negozioNellaSede(n: RigaNegozio, sede: string | undefined, listini: LettureListiniCondivisi): RigaNegozio {
  if (!sede || sede === n.sede_chiave) return n;
  if (!listini.sedi.some((s) => s.negozio === n.chiave && s.luogo === sede)) throw httpErrors.badRequest('sede-listino-non-valida', 'Il listino non appartiene al luogo indicato.');
  const l = prepared(`SELECT l.chiave,l.nome,l.quartiere_chiave,l.orari_json,l.condizioni_json,q.nome AS quartiere_nome
    FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.chiave = ? AND l.nascosto = 0`).get(sede) as
    { chiave: string; nome: string; quartiere_chiave: string; orari_json: string | null; condizioni_json: string | null; quartiere_nome: string } | undefined;
  if (!l) throw httpErrors.notFound('luogo-non-trovato', 'La sede del listino non è disponibile.');
  return { ...n, sede_chiave: l.chiave, sede_nome: l.nome, luogo_chiave: l.quartiere_chiave, quartiere_nome: l.quartiere_nome,
    sede_orari_json: l.orari_json, sede_condizioni_json: l.condizioni_json };
}

function conSede(r: RigaArticolo, n: RigaNegozio): RigaArticolo {
  return { ...r, negozio_sblocco: n.sblocco_json, negozio_sede: n.sede_chiave, sede_orari_json: n.sede_orari_json, sede_condizioni_json: n.sede_condizioni_json };
}

export interface FiltroArticoli {
  q?: string;
  /** Una categoria sola (compatibilità) oppure più categorie insieme. */
  categoria?: string;
  categorie?: string[];
  per?: string;
  /** Con la partita: solo gli articoli già acquistati, o solo quelli ancora da acquistare. */
  stato?: 'acquistati' | 'da-acquistare';
  /** Con la partita: solo gli articoli disponibili adesso, o solo quelli bloccati. */
  disponibilita?: 'disponibili' | 'bloccati';
}

/** Ricerca degli articoli in tutti i negozi per testo, categorie e destinatario; con la partita anche per stato d'acquisto e disponibilità (massimo 300 risultati, totale calcolato prima del limite). */
export function ricercaArticoli(filtro: FiltroArticoli, partitaId?: number): RicercaArticoliDto {
  const listini = lettureListiniCondivisi();
  const st = partitaId === undefined ? undefined : statoDisponibilitaPartita(partitaId);
  const acquistati = st?.articoliOttenuti ?? new Set<string>();
  const cond: string[] = ['a.nascosto = 0', 'n.nascosto = 0']; const par: unknown[] = [];
  const conCatalogo = catalogoOggettiDisponibile();
  if (filtro.q && !conCatalogo) { cond.push('(a.nome LIKE ? OR a.effetto LIKE ? OR n.nome LIKE ?)'); const like = `%${filtro.q}%`; par.push(like, like, like); }
  const categorie = [...new Set([...(filtro.categorie ?? []), ...(filtro.categoria ? [filtro.categoria] : [])])];
  if (categorie.length && !conCatalogo) { cond.push(`a.categoria IN (${categorie.map(() => '?').join(',')})`); par.push(...categorie); }
  if (filtro.per && !conCatalogo) { cond.push("(a.per = ? OR a.per = 'tutti')"); par.push(filtro.per); }
  const righe = prepared(`${SQL_ARTICOLO} WHERE ${cond.join(' AND ')} ORDER BY n.ordine, a.ordine`).all(...par) as RigaArticolo[];
  const catalogo = identitaArticoli(righe);
  const ricevuti = ricompensePerFonte('articolo', righe.map((r) => r.chiave));
  // «Rango Confidente 3» senza nome è il Confidente del negozio: la ricerca deve valutarlo come la scheda.
  // Stato e disponibilità si filtrano dopo la valutazione: sono fatti della partita, non colonne.
  const sediValutate = new Map<string, RigaNegozio>();
  let valutati = righe.filter((r) => !listini.articoli.has(r.chiave)).map((r) => {
    const sedi = listini.sedi.filter((s) => s.negozio === r.negozio_chiave);
    if (st && sedi.length > 0 && disponibilitaArticolo(r, st).stato !== 'disponibile') {
      for (const sede of sedi) {
        const k = `${sede.negozio}\0${sede.luogo}`;
        let n = sediValutate.get(k);
        if (!n) {
          const principale = prepared(`${SQL_NEGOZIO} WHERE n.chiave = ?`).get(sede.negozio) as RigaNegozio;
          n = negozioNellaSede(principale, sede.luogo, listini); sediValutate.set(k, n);
        }
        const variante = conSede(r, n);
        if (disponibilitaArticolo(variante, st).stato === 'disponibile') return articoloDto(variante, acquistati, st, catalogo, ricevuti.get(r.chiave));
      }
    }
    return articoloDto(r, acquistati, st, catalogo, ricevuti.get(r.chiave));
  });
  if (conCatalogo) {
    const q = normalizzaNomeOggetto(filtro.q ?? '');
    valutati = valutati.filter((a) => (!q || [a.nome, a.nomeOriginale ?? '', ...(a.nomiAltri ?? []), ...(a.ricevuti?.map((r) => r.nome) ?? []),
      ...(a.costo?.tipo === 'oggetti' ? a.costo.oggetti.map((o) => o.nome ?? '') : []), a.effetto ?? '', a.negozioNome].some((v) => normalizzaNomeOggetto(v).includes(q)))
      && (!categorie.length || categorie.includes(a.categoria)) && (!filtro.per || a.per === filtro.per || a.per === 'tutti'));
  }
  if (partitaId !== undefined && filtro.stato) valutati = valutati.filter((a) => (filtro.stato === 'acquistati' ? a.acquistato : !a.acquistato));
  // «Disponibili» = tutte le condizioni vere. Un «ignoto» — una condizione che la partita non sa
  // verificare — sta con i bloccati: in una guida che dice «questo c'è adesso» un forse vale un no.
  if (partitaId !== undefined && filtro.disponibilita) valutati = valutati.filter((a) => (filtro.disponibilita === 'bloccati' ? a.disponibilita !== undefined && a.disponibilita.stato !== 'disponibile' : a.disponibilita === undefined || a.disponibilita.stato === 'disponibile'));
  return { articoli: valutati.slice(0, 300), totale: valutati.length };
}

/**
 * L13 (decisione 4): la disponibilità di un articolo nello stato dato (per la scelta fra i set alternativi di una voce: lo stato al giorno della
 * voce, `statoAlMomento`), con la stessa regola di `impostaAcquisto` (listino condiviso, presenza del negozio nella sua sede, condizioni
 * dell'articolo). null se l'articolo non c'è.
 */
export function disponibilitaArticoloNelloStato(articoloChiave: string, st: StatoDisponibilita): ReturnType<typeof disponibilitaArticolo> | null {
  const listini = lettureListiniCondivisi();
  const riga = prepared(`${SQL_ARTICOLO} WHERE a.chiave = ?`).get(articoloDelListino(articoloChiave, listini)) as RigaArticolo | undefined;
  if (!riga) return null;
  const negozio = prepared(`${SQL_NEGOZIO} WHERE n.chiave = ?`).get(riga.negozio_chiave) as RigaNegozio | undefined;
  return negozio ? disponibilitaArticolo(conSede(riga, negozioNellaSede(negozio, undefined, listini)), st) : null;
}

/** Le opzioni di `impostaAcquisto` per i gesti che non sono la pagina del negozio (gli effetti di stato di una voce del Diario). */
export interface OpzioniAcquisto {
  /** L13 (decisione 4): lo stato in cui valutare la disponibilità, se non è quello di adesso (la spunta di una voce valuta il set scelto fra
   *  alternative al giorno della voce); senza, quello corrente della partita. */
  st?: StatoDisponibilita;
  /** L13 (decisione 19): solo per l'effetto «articolo» di una voce GIÀ spuntata, applicato al salvataggio della guida o approvato dall'elenco
   *  della partita (`effettiDiStatoService.applicaUnEffettoDiStato`): la voce spuntata attesta l'acquisto nel suo giorno, e la disponibilità
   *  (per esempio il panino che si vende solo il venerdì) non lo contraddice. La spunta normale e la pagina del negozio restano con il controllo. */
  senzaDisponibilita?: boolean;
  /** Ondata 5 (decisione 21): l'acquisto è di una voce del Diario e del suo effetto (`effettiDiStatoService`): la riga del registro porta il
   *  giorno e la fascia della voce e i pezzi dell'effetto; togliendo, si toglie solo la riga di quella voce. Senza: la pagina del negozio. */
  voce?: { voceUid: string; effettoUid: string; quantita?: number };
}

/** Il giorno e la fascia correnti della partita, o null se la partita non ha ancora una data di gioco. */
function momentoCorrente(partitaId: number): { giorno: string; fascia: 'giorno' | 'sera' } | null {
  const p = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string | null } | undefined;
  if (!p?.data_gioco || !/^\d{2}-\d{2}$/.test(p.data_gioco)) return null;
  return { giorno: p.data_gioco, fascia: p.fascia_gioco === 'sera' ? 'sera' : 'giorno' };
}

/** Toglie il segno «ottenuto» (`acquisto_partita`) con la sua fotografia nel cestino, come ha sempre fatto la spunta tolta. */
function togliPresenza(partitaId: number, articoloChiave: string, nome: string): void {
  if (!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, articoloChiave)) return;
  conCestinoPrivato({ tipo: 'fonte-acquisto', chiave: `legacy:${articoloChiave}`, nome: `Presenza storica: ${nome}`, partitaId }, () => {
    prepared('DELETE FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').run(partitaId, articoloChiave);
  });
}

/**
 * Segna (o toglie) un acquisto dell'articolo nella partita; evento alla prima spunta. `opz`: vedi `OpzioniAcquisto` (la pagina del negozio
 * non ne passa: disponibilità nello stato corrente della partita).
 *
 * Ondata 5 (decisione 21): ogni acquisto è una riga del registro (`utente.registro_acquisti`) con il giorno di gioco, e consuma la scorta del
 * ciclo; `acquisto_partita` resta il segno «ottenuto almeno una volta», scritto al primo acquisto. Togliere un acquisto toglie una riga sola:
 * quella della voce (`opz.voce`) o l'ultima della pagina del negozio; il segno «ottenuto» se ne va solo con l'ultima riga che lo porta, e una
 * presenza di prima del registro (nessuna riga) si toglie come prima. Un articolo comprato soltanto da voci del Diario non si toglie dal
 * negozio: si toglie la spunta della voce.
 */
export function impostaAcquisto(partitaId: number, articoloChiave: string, fatto: boolean, sede?: string, opz: OpzioniAcquisto = {}): ArticoloDto {
  verificaPartita(partitaId);
  const listini = lettureListiniCondivisi();
  const canonica = articoloDelListino(articoloChiave, listini);
  if (!prepared('SELECT 1 FROM articolo WHERE chiave = ?').get(articoloChiave)) throw httpErrors.notFound('articolo-non-trovato', `L'articolo '${articoloChiave}' non esiste.`);
  const riga = prepared(`${SQL_ARTICOLO} WHERE a.chiave = ?`).get(canonica) as RigaArticolo | undefined;
  if (!riga) throw httpErrors.notFound('articolo-non-trovato', `L'articolo '${articoloChiave}' non esiste.`);
  const negozio = prepared(`${SQL_NEGOZIO} WHERE n.chiave = ?`).get(riga.negozio_chiave) as RigaNegozio;
  // Togliere una spunta resta possibile anche da una scheda vecchia, dopo che la sede aggiuntiva è stata rimossa.
  const sedeDaUsare = !fatto && sede && sede !== negozio.sede_chiave && !listini.sedi.some((s) => s.negozio === negozio.chiave && s.luogo === sede) ? undefined : sede;
  const r = conSede(riga, negozioNellaSede(negozio, sedeDaUsare, listini));
  const st = opz.st ?? statoDisponibilitaPartita(partitaId);
  const catalogo = identitaArticoli([r]);
  const ricevuti = ricompensePerFonte('articolo', [r.chiave]).get(r.chiave);
  const prodotto = articoloDto(r, new Set(), st, catalogo, ricevuti);
  if (eOffertaAojiru({ chiave: r.chiave, catalogoChiave: r.catalogo_chiave })) {
    if (fatto && acquistiArticolo(partitaId, articoloChiave).presenzaStorica) return articoloDto(r, acquistiPartita(partitaId), st, catalogo, ricevuti);
    throw httpErrors.conflict(fatto ? 'consumazione-aojiru-richiesta' : 'rimozione-presenza-legacy-richiesta',
      fatto ? 'Per Aojiru registra una consumazione o collega una fonte: una nuova spunta non ne dichiara quantità o variante.'
        : 'Rimuovi la sola presenza storica dal riepilogo con anteprima e conferma. Le consumazioni restano distinte.', { articolo: articoloChiave });
  }
  if (fatto && !opz.senzaDisponibilita && disponibilitaArticolo(r, st).stato !== 'disponibile') throw httpErrors.conflict('articolo-non-disponibile', `L'articolo '${articoloChiave}' non e disponibile nella partita corrente.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, articoloChiave);
    if (fatto && !era) {
      prepared('INSERT INTO acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(partitaId, articoloChiave, adesso);
      nuovaValutazioneLegacy(getDb(), { partita_id: partitaId, articolo_chiave: articoloChiave, updated_at: adesso });
    }
    if (fatto) {
      // la riga del registro: il giorno della voce, o quello corrente della partita (senza una data di gioco non si data niente)
      const momento = opz.voce ? momentoDellaVoce(opz.voce.voceUid) : momentoCorrente(partitaId);
      if (momento) scriviRiga(partitaId, r.chiave, { ...momento, quantita: opz.voce?.quantita ?? 1, fonte: opz.voce ? 'voce' : 'negozio',
        ...(opz.voce ? { voceUid: opz.voce.voceUid, effettoUid: opz.voce.effettoUid } : {}), ottenutoQui: !era });
    } else {
      let togliOttenuto: boolean;
      if (opz.voce) {
        const riga = rigaDellaVoce(partitaId, opz.voce.voceUid, opz.voce.effettoUid);
        // senza la sua riga (spunta di prima del registro) il segno se ne va come prima, salvo acquisti registrati dopo
        togliOttenuto = riga ? togliRiga(partitaId, riga.id).tolgoOttenuto : righeDellArticolo(partitaId, r.chiave).length === 0;
      } else {
        const riga = ultimaRigaDelNegozio(partitaId, r.chiave);
        if (riga) togliOttenuto = togliRiga(partitaId, riga.id).tolgoOttenuto;
        else if (righeDellArticolo(partitaId, r.chiave).length > 0) throw httpErrors.conflict('acquisto-della-voce', `«${prodotto.nome}» risulta comprato da una voce del Diario: si annulla togliendo la spunta della voce.`);
        else togliOttenuto = true;
      }
      if (togliOttenuto && era) togliPresenza(partitaId, articoloChiave, prodotto.nome);
    }
    if (fatto && !era) registraEvento(partitaId, 'acquisto', `Acquistato: ${prodotto.nome}`, `${r.negozio_nome ?? r.negozio_chiave}${r.costo_json != null ? ' · Scambio' : r.prezzo !== null ? ` · ${r.prezzo.toLocaleString('it-IT')} ¥` : ''}${prodotto.per ? ` · per ${prodotto.per}` : ''}.`, { articolo: articoloChiave });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return articoloDto(r, acquistiPartita(partitaId), statoDisponibilitaPartita(partitaId), catalogo, ricevuti);
}

/**
 * Ondata 5 (decisione 21): una voce del Diario spuntata compra di nuovo un articolo già ottenuto (il Katsu il 06-05 e l'11-13): lo stato
 * «ottenuto» non cambia, ma la copia entra nel registro con il giorno della voce e consuma la scorta di quel ciclo. Dentro la transazione di
 * chi chiama (`effettiDiStatoService`); nessun controllo di disponibilità (la voce spuntata attesta l'acquisto). Idempotente per voce ed effetto.
 */
export function registraCopiaDaVoce(partitaId: number, articoloChiave: string, voce: { voceUid: string; effettoUid: string; quantita?: number }): void {
  const canonica = articoloDelListino(articoloChiave, lettureListiniCondivisi());
  if (!prepared('SELECT 1 FROM articolo WHERE chiave = ?').get(canonica)) return;
  if (eOffertaAojiru({ chiave: canonica, catalogoChiave: (prepared('SELECT catalogo_chiave FROM articolo WHERE chiave = ?').get(canonica) as { catalogo_chiave: string | null }).catalogo_chiave })) return;
  const momento = momentoDellaVoce(voce.voceUid);
  if (momento) scriviRiga(partitaId, canonica, { ...momento, quantita: voce.quantita ?? 1, fonte: 'voce', voceUid: voce.voceUid, effettoUid: voce.effettoUid, ottenutoQui: false });
}

/**
 * Ondata 5: toglie la sola copia della voce dal registro, quando lo stato «ottenuto» resta (c'era già, o lo tiene un'altra voce spuntata):
 * il segno, se lo portava, passa alla riga più vecchia che resta, e `acquisto_partita` non si tocca (lo decide la regola dell'annullo).
 */
export function togliCopiaDaVoce(partitaId: number, voceUid: string, effettoUid: string): void {
  const riga = rigaDellaVoce(partitaId, voceUid, effettoUid);
  if (riga) togliRiga(partitaId, riga.id);
}

/**
 * Ondata 5 (annullo per riga): toglie un acquisto della pagina del negozio dal registro, qualunque sia il suo ciclo. Quelli di una voce del
 * Diario si annullano togliendo la spunta della voce (409). Se la riga portava l'ultimo segno «ottenuto», se ne va anche quello, come con la
 * spunta tolta. Restituisce l'articolo aggiornato.
 */
export function annullaRigaDelRegistro(partitaId: number, rigaId: number): ArticoloDto {
  verificaPartita(partitaId);
  const riga = (prepared("SELECT 1 AS c FROM utente.sqlite_master WHERE type = 'table' AND name = 'registro_acquisti'").get()
    ? prepared('SELECT * FROM utente.registro_acquisti WHERE partita_id = ? AND id = ?').get(partitaId, rigaId) : undefined) as { articolo_chiave: string; fonte: string } | undefined;
  if (!riga) throw httpErrors.notFound('acquisto-non-trovato', 'Questo acquisto non risulta nel registro della partita.');
  if (riga.fonte !== 'negozio') throw httpErrors.conflict('acquisto-della-voce', 'Questo acquisto viene da una voce del Diario: si annulla togliendo la spunta della voce.');
  const r = prepared(`${SQL_ARTICOLO} WHERE a.chiave = ?`).get(riga.articolo_chiave) as RigaArticolo | undefined;
  getDb().transaction(() => {
    const { tolgoOttenuto } = togliRiga(partitaId, rigaId);
    if (tolgoOttenuto) {
      const nome = r ? (identitaArticoli([r])?.get(r.catalogo_chiave ?? '')?.nome ?? (r.nome || r.chiave)) : riga.articolo_chiave;
      togliPresenza(partitaId, riga.articolo_chiave, nome);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
  if (!r) throw httpErrors.notFound('articolo-non-trovato', 'L’acquisto è stato tolto; l’articolo non è più nel listino.');
  const negozio = prepared(`${SQL_NEGOZIO} WHERE n.chiave = ?`).get(r.negozio_chiave) as RigaNegozio;
  const conLaSede = conSede(r, negozioNellaSede(negozio, undefined, lettureListiniCondivisi()));
  return articoloDto(conLaSede, acquistiPartita(partitaId), statoDisponibilitaPartita(partitaId), identitaArticoli([conLaSede]), ricompensePerFonte('articolo', [r.chiave]).get(r.chiave));
}
