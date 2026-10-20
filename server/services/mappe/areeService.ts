// ============================================================
// areeService — le Aree del mondo (L2, 2026-10-20): Città → Quartiere → Area → Planimetrie → Luoghi
// ============================================================
//
// Un'Area raccoglie le planimetrie (versioni) della stessa zona di un quartiere — o della città, per lo staff che nessuna fonte
// colloca — e ne dice nome, ordine e planimetria predefinita (tabella `area`, migrazione 109). Questo servizio la legge per le
// pagine (elenco del contenitore, pagina dell'Area, planimetrie da collocare) e la scrive (creazione con la prima planimetria,
// versioni, rinomina, ordine, ripristino, eliminazione nel cestino, collocazione). Le rotte sono generiche sul contenitore
// (`/api/aree/:contenitore/:chiave/…`): `citta`, con la chiave di un quartiere o `tokyo` per la città (L2), e `dungeon`, con la
// chiave di un Palazzo (L3, migrazione 110: le «stanze» dei Palazzi, legate alle infiltrazioni in `infiltrazione_area`). Nei Palazzi
// le planimetrie nascono di tipo `area` sotto `dungeon-<k>`, senza un punto sull'illustrazione (lì non ci sono passaggi), e l'Area
// porta le infiltrazioni che la toccano e la raccolta delle sue planimetrie.
// ============================================================

import { getDb, nowIso, prepared, type AppDatabase } from '../../db/dbService.js';
import { assegnaAreePalazzi110, type EsitoAreePalazzi } from '../../db/migrations/110_aree_dei_palazzi.js';
import { radiceDelPalazzo } from './alberoMappe.js';
import { conLegami, impostaLegamiInfiltrazione, infiltrazioniDelleAree, staccaAreaDalleInfiltrazioni, type InfiltrazioneDellArea } from './legamiInfiltrazioni.js';
// la raccolta per planimetria dei Palazzi è quella della scheda (dungeonService la usa a sua volta per le Aree: l'uso è nelle funzioni)
import { raccoltaMappe } from '../dungeonService.js';
import { completamentoDegliOggetti, modelloAvanzamento, oggettiDelleMappe, statiDellaPartita, type ModelloAvanzamento, type StatiDellaPartita } from './statiGuida.js';
import { HttpError, httpErrors } from '../../utils/httpError.js';
import { slug } from '../../../shared/slug.js';
import { verificaPartita } from '../verificaPartita.js';
import { invalidaCacheDiGioco } from '../cacheDiGioco.js';
import { conCestino, registraRipristinoCestino } from '../cestinoService.js';
import { chiaveMappa, idMappa, sincronizzaPercorsiMappe } from './percorsiMappe.js';
import { creaMappa, creaSpillo, eliminaMappa, eliminaSpillo, impostaImmagineMappa } from './mappeService.js';
import { caricataDellaMappa, illustrazioneDellaMappa, immaginiCaricateDelleMappe, urlCaricata } from './immagineMappa.js';
import { casaDellArea, casaDellaMappa, conAree, contenitoreDi, contestoAree, type ContestoAree, type RigaArea } from './casaMappa.js';
import { lettureLuoghi, luoghiDellArea, luogoDelPin } from '../luoghiService.js';
import { condizioneEffettivaQuartiere } from '../condizioni/condizioneEffettiva.js';
import { elencaInviti } from '../inviti.js';
import { descriviRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { nomiCondizioniMemo } from '../condizioni/nomiCondizioni.js';
import { cosaManca, valutaInsieme } from '../condizioni/valutatore.js';
import { statoDisponibilitaPartita } from '../disponibilitaService.js';
import { areaDisponibilePerPartita } from './disponibilitaAree.js';
import type { AreaDettaglioDto, AreaRiassuntoDto, ElementoAreaDto, MappaDaCollocareDto, PlanimetriaAreaDto, RuoloImmagine, SbloccoDto } from '../../../shared/types.js';

/** I contenitori ammessi nelle rotte: la città (Tokyo) e i suoi quartieri (L2), i Palazzi (L3). */
export const CONTENITORI_AREA = ['citta', 'dungeon'] as const;
export type ContenitoreRotta = (typeof CONTENITORI_AREA)[number];

/**
 * Dove sta un'Area: la colonna che la lega al contenitore, la sua chiave, la mappa che lo illustra (genitore delle planimetrie, e nel
 * mondo l'illustrazione con i pin di passaggio), il prefisso delle chiavi delle sue Aree e il tipo delle planimetrie che vi nascono.
 */
export interface Contenitore {
  colonna: 'quartiere_chiave' | 'citta_chiave' | 'dungeon_chiave'; chiave: string; mappa: string; nome: string;
  rotta: ContenitoreRotta; prefisso: string; tipoPlanimetria: 'luogo' | 'area';
}

/**
 * Il contenitore indicato dalla rotta: `citta/tokyo` è la città, `citta/<quartiere>` un quartiere, `dungeon/<palazzo>` un Palazzo.
 * 404 `quartiere-non-trovato` se il quartiere non c'è (o è l'ingresso dei Memento, che non ha Aree), 404 `dungeon-non-trovato` se il
 * Palazzo non c'è o sono i Memento (i dedali non hanno Aree, R3-12).
 */
export function contenitoreDaRotta(contenitore: ContenitoreRotta, chiave: string): Contenitore {
  if (contenitore === 'dungeon') {
    const d = prepared("SELECT chiave, nome FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(chiave) as { chiave: string; nome: string } | undefined;
    if (!d) throw httpErrors.notFound('dungeon-non-trovato', `Il Palazzo '${chiave}' non esiste.`);
    return { colonna: 'dungeon_chiave', chiave: d.chiave, mappa: radiceDelPalazzo(d.chiave), nome: d.nome, rotta: 'dungeon', prefisso: `dungeon/${d.chiave}/`, tipoPlanimetria: 'area' };
  }
  if (chiave === 'tokyo') return { colonna: 'citta_chiave', chiave: 'tokyo', mappa: 'tokyo', nome: 'Tokyo', rotta: 'citta', prefisso: 'citta/tokyo/', tipoPlanimetria: 'luogo' };
  const q = chiave === 'mementos' ? undefined : prepared('SELECT chiave, nome FROM quartiere WHERE chiave = ?').get(chiave) as { chiave: string; nome: string } | undefined;
  if (!q) throw httpErrors.notFound('quartiere-non-trovato', `Il quartiere '${chiave}' non esiste.`);
  return { colonna: 'quartiere_chiave', chiave: q.chiave, mappa: `citta-${q.chiave}`, nome: q.nome, rotta: 'citta', prefisso: `citta/${q.chiave}/`, tipoPlanimetria: 'luogo' };
}

/** La riga di un'Area del contenitore per slug; 404 `area-non-trovata` se manca. */
export function rigaArea(c: Contenitore, slug: string): RigaArea {
  const a = conAree() ? prepared(`SELECT * FROM area WHERE ${c.colonna} = ? AND slug = ?`).get(c.chiave, slug) as RigaArea | undefined : undefined;
  if (!a) throw httpErrors.notFound('area-non-trovata', `Nessuna Area '${slug}' in ${c.nome}.`);
  return a;
}

interface RigaPlanimetria { chiave: string; nome: string; immagine_chiave: string | null; asset: string | null; ruolo_immagine: RuoloImmagine; versione_etichetta: string | null; versione_ordine: number | null; area_chiave: string }

/** Le planimetrie di un'Area, nell'ordine delle versioni (a parità, per chiave). */
function planimetrieDi(area: string): RigaPlanimetria[] {
  return prepared('SELECT chiave, nome, immagine_chiave, asset, ruolo_immagine, versione_etichetta, versione_ordine, area_chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave').all(area) as RigaPlanimetria[];
}

/** La raccolta di ogni planimetria: collezionabili e quanti presi (null senza partita). */
type RaccoltaPerMappa = ReadonlyMap<string, { n: number; presi: number | null }>;

/** I conteggi letti una volta per una risposta che descrive più Aree. */
interface ContestoElenco {
  aree: ContestoAree; spilli: Map<string, number>; ingressi: Set<string>; caricate: Map<string, string>;
  /** Le infiltrazioni di ogni Area dei Palazzi (L3). */
  infiltrazioni: Map<string, InfiltrazioneDellArea[]>;
  /** La raccolta per planimetria: nei Palazzi quella della scheda (`raccoltaMappe`, con la partita); nel mondo i soli collezionabili. */
  raccolta: RaccoltaPerMappa; conPartita: boolean;
  /** L4: nei Palazzi, il modello, gli stati della partita e gli oggetti permanenti di ogni planimetria, per il completamento dell'Area. */
  l4?: AvanzamentoAree;
}
/** L4: ciò che serve al completamento delle Aree di un Palazzo. */
export interface AvanzamentoAree { m: ModelloAvanzamento; s: StatiDellaPartita | null; oggettiPerMappa: Map<string, Set<string>> }

/** L4: il modello di un Palazzo per il completamento delle sue Aree (letto una volta per l'elenco). */
function avanzamentoDelPalazzo(dungeon: string, partitaId?: number): AvanzamentoAree {
  const m = modelloAvanzamento(getDb());
  const mappe = prepared(`WITH RECURSIVE albero(chiave) AS (SELECT ? UNION SELECT x.chiave FROM mappa x JOIN albero a ON x.genitore_chiave = a.chiave) SELECT chiave FROM albero`).pluck().all(radiceDelPalazzo(dungeon)) as string[];
  return { m, s: partitaId === undefined ? null : statiDellaPartita(getDb(), m, partitaId), oggettiPerMappa: oggettiDelleMappe(getDb(), m, mappe) };
}

/** I collezionabili di ogni planimetria, senza partita (la raccolta del mondo, che non ha un conteggio dei presi). */
function collezionabiliPerMappa(): RaccoltaPerMappa {
  return new Map((prepared('SELECT mappa_chiave AS chiave, COUNT(*) AS n FROM spillo WHERE collezionabile = 1 AND mappa_chiave IS NOT NULL GROUP BY mappa_chiave').all() as Array<{ chiave: string; n: number }>)
    .map((r) => [r.chiave, { n: r.n, presi: null }]));
}

function contestoElenco(raccolta?: { perMappa: RaccoltaPerMappa; conPartita: boolean }): ContestoElenco {
  return {
    aree: contestoAree(),
    spilli: new Map((prepared('SELECT mappa_chiave AS chiave, COUNT(*) AS n FROM spillo GROUP BY mappa_chiave').all() as Array<{ chiave: string; n: number }>).map((r) => [r.chiave, r.n])),
    ingressi: new Set((prepared('SELECT area_chiave FROM quartiere_ingresso WHERE area_chiave IS NOT NULL').all() as Array<{ area_chiave: string }>).map((r) => r.area_chiave)),
    caricate: immaginiCaricateDelleMappe(),
    infiltrazioni: infiltrazioniDelleAree(),
    raccolta: raccolta?.perMappa ?? collezionabiliPerMappa(), conPartita: raccolta?.conPartita ?? false,
  };
}

/** La raccolta di un Palazzo per planimetria, nella forma che serve qui (null fuori dai Palazzi). */
function raccoltaDelContenitore(c: Contenitore, partitaId?: number): { perMappa: RaccoltaPerMappa; conPartita: boolean } | undefined {
  if (c.colonna !== 'dungeon_chiave') return undefined;
  return { perMappa: raccoltaMappe(c.chiave, partitaId).perMappa, conPartita: partitaId !== undefined };
}

/**
 * Il riassunto di un'Area: contenitore, nome, ordine, predefinita con la sua illustrazione, conteggi, passaggio, ingresso, stato; da L3
 * le infiltrazioni che la toccano e la raccolta delle sue planimetrie. Nei Palazzi non c'è un passaggio (l'illustrazione del Palazzo
 * non ha pin verso le aree) né un ingresso.
 */
function condizioneArea(a: RigaArea): RequisitoSpillo[] | null {
  return a.quartiere_chiave ? condizioneEffettivaQuartiere(a.quartiere_chiave) : null;
}

function sbloccoArea(a: RigaArea, partitaId?: number): Pick<AreaRiassuntoDto, 'sblocco' | 'disponibile' | 'bloccoMotivo'> {
  const condizioni = condizioneArea(a);
  if (!condizioni) return { disponibile: true, bloccoMotivo: null };
  const nomi = nomiCondizioniMemo();
  const condizione = condizioni.length === 1 ? condizioni[0] : { tipo: 'gruppo' as const, modo: 'tutte' as const, condizioni };
  const testo = descriviRequisitoSpillo(condizione, nomi);
  const fonte = a.quartiere_chiave ? (prepared('SELECT fonte_condizioni_json FROM quartiere WHERE chiave = ?').get(a.quartiere_chiave) as { fonte_condizioni_json: string | null } | undefined)?.fonte_condizioni_json : null;
  const fonteDto: SbloccoDto['fonte'] = (() => { try { return fonte ? JSON.parse(fonte) as SbloccoDto['fonte'] : null; } catch { return null; } })();
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const esito = st ? valutaInsieme(condizioni.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) })), st) : null;
  const stato = esito?.stato;
  const manca = stato === 'bloccato' ? cosaManca(condizione, st!, nomi) : null;
  const sblocco: SbloccoDto = { condizione, testo, fonte: fonteDto, esito: stato === 'disponibile' ? 'vero' : stato === 'bloccato' ? 'falso' : stato === 'ignoto' ? 'grigio' : null, manca, inviti: elencaInviti({ apreTipo: 'quartiere', ...(a.quartiere_chiave ? { apreChiave: a.quartiere_chiave } : {}) }, partitaId), modificato: false };
  return { sblocco, disponibile: stato !== 'bloccato', bloccoMotivo: manca };
}

function riassuntoArea(a: RigaArea, c: Contenitore, ctx: ContestoElenco, partitaId?: number): AreaRiassuntoDto {
  const planimetrie = planimetrieDi(a.chiave);
  const chiavi = planimetrie.map((p) => p.chiave);
  // il pin di passaggio verso l'Area sull'illustrazione del contenitore: il primo (per id) che porta a una sua planimetria
  const passaggio = chiavi.length === 0 || c.colonna === 'dungeon_chiave' ? undefined : prepared(`SELECT id, x, y FROM spillo WHERE mappa_chiave = ? AND riferimento_tipo = 'mappa'
    AND riferimento_chiave IN (${chiavi.map(() => '?').join(', ')}) ORDER BY id LIMIT 1`).get(c.mappa, ...chiavi) as { id: number; x: number; y: number } | undefined;
  const raccolta = chiavi.reduce((t, k) => {
    const r = ctx.raccolta.get(k);
    return { n: t.n + (r?.n ?? 0), presi: t.presi === null ? null : t.presi + (r?.presi ?? 0) };
  }, { n: 0, presi: ctx.conPartita ? 0 : null as number | null });
  return {
    chiave: a.chiave, contenitore: contenitoreDi(a, ctx.aree), slug: a.slug, nome: a.nome, nomeRivisto: a.nome_rivisto === 1, ordine: a.ordine,
    predefinita: a.planimetria_predefinita ? chiaveMappa(a.planimetria_predefinita) : null,
    illustrazione: a.planimetria_predefinita ? illustrazioneDellaMappa(a.planimetria_predefinita, getDb(), ctx.caricate) : { immagineUrl: null, asset: null },
    numeroPlanimetrie: planimetrie.length, numeroSpilli: chiavi.reduce((n, k) => n + (ctx.spilli.get(k) ?? 0), 0),
    passaggio: passaggio ? { spillo: passaggio.id, x: passaggio.x, y: passaggio.y } : null,
    ingresso: ctx.ingressi.has(a.chiave), origine: a.origine, modificata: a.seed_json !== null, daVerificare: a.da_verificare === 1,
    casa: casaDellArea(a) ?? '',
    infiltrazioni: ctx.infiltrazioni.get(a.chiave) ?? [],
    raccolta,
    ...sbloccoArea(a, partitaId),
    // L4 (§1.5): nei Palazzi il completamento dell'Area (oggetti permanenti con un pin su una sua planimetria; senza, completata)
    ...(c.colonna === 'dungeon_chiave' && ctx.l4 ? { completamento: completamentoDegliOggetti(new Set(chiavi.flatMap((k) => [...(ctx.l4!.oggettiPerMappa.get(k) ?? [])])), ctx.l4.s) } : {}),
  };
}

/** Le Aree di un contenitore, nel loro ordine (a parità, per slug); nei Palazzi con la raccolta della partita, se c'è. */
export function areeDelContenitore(c: Contenitore, partitaId?: number): AreaRiassuntoDto[] {
  if (!conAree()) return [];
  if (partitaId !== undefined) verificaPartita(partitaId);
  const ctx = contestoElenco(raccoltaDelContenitore(c, partitaId));
  if (c.colonna === 'dungeon_chiave') ctx.l4 = avanzamentoDelPalazzo(c.chiave, partitaId);
  return (prepared(`SELECT * FROM area WHERE ${c.colonna} = ? ORDER BY ordine, slug`).all(c.chiave) as RigaArea[]).map((a) => riassuntoArea(a, c, ctx, partitaId));
}

/**
 * Le Aree di un Palazzo per la sua scheda (L3, `DungeonDettaglioDto.areePalazzo`), con la raccolta che la scheda ha già calcolato per
 * planimetria (la stessa della colonna «Da raccogliere»: R3-31). Vuoto per un Palazzo senza Aree.
 */
export function areeDelPalazzo(dungeon: string, perMappa: RaccoltaPerMappa, conPartita: boolean, l4?: AvanzamentoAree): AreaRiassuntoDto[] {
  if (!conAree()) return [];
  const c = contenitoreDaRotta('dungeon', dungeon);
  const ctx = contestoElenco({ perMappa, conPartita });
  if (l4) ctx.l4 = l4;
  return (prepared('SELECT * FROM area WHERE dungeon_chiave = ? ORDER BY ordine, slug').all(dungeon) as RigaArea[]).map((a) => riassuntoArea(a, c, ctx));
}

/** Quante Aree ha ogni quartiere (per le schede de La città). */
export function numeroAreePerQuartiere(): Map<string, number> {
  if (!conAree()) return new Map();
  return new Map((prepared('SELECT quartiere_chiave AS chiave, COUNT(*) AS n FROM area WHERE quartiere_chiave IS NOT NULL GROUP BY quartiere_chiave').all() as Array<{ chiave: string; n: number }>).map((r) => [r.chiave, r.n]));
}

/** I nomi dei luoghi, negozi e Confidenti segnati dai pin di un'Area, dal catalogo (non dal pin). */
const NOMI_ELEMENTI: Record<ElementoAreaDto['tipo'], string> = {
  luogo: 'SELECT nome FROM luogo WHERE chiave = ?',
  attivita: 'SELECT nome FROM luogo WHERE chiave = ?',
  negozio: 'SELECT nome FROM negozio WHERE chiave = ?',
  confidente: 'SELECT nome FROM confidente WHERE chiave = ?',
};

/**
 * La pagina di un'Area: il riassunto, le versioni con immagine e pin, gli elementi segnati sulle sue planimetrie e le Aree (o i
 * quartieri) vicine, cioè dove portano i suoi passaggi. Con `partitaId` la partita deve esistere (404 come altrove).
 */
export function dettaglioArea(contenitore: ContenitoreRotta, chiave: string, slug: string, partitaId?: number): AreaDettaglioDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slug);
  const ctx = contestoElenco(raccoltaDelContenitore(c, partitaId));
  const planimetrie = planimetrieDi(a.chiave);
  const proprie = new Set(planimetrie.map((p) => p.chiave));
  const versioni: PlanimetriaAreaDto[] = planimetrie.map((p, i) => {
    const img = caricataDellaMappa(p, ctx.caricate);
    return { chiave: chiaveMappa(p.chiave), nome: p.nome, etichetta: p.versione_etichetta, ordine: p.versione_ordine ?? i, predefinita: p.chiave === a.planimetria_predefinita,
      numeroSpilli: ctx.spilli.get(p.chiave) ?? 0, immagineUrl: img ? urlCaricata(img) : null, asset: p.asset, ruoloImmagine: p.ruolo_immagine };
  });
  const segnaposti = planimetrie.map(() => '?').join(', ');
  const pin = planimetrie.length === 0 ? [] : prepared(`SELECT id, nome, mappa_chiave, riferimento_tipo, riferimento_chiave FROM spillo WHERE mappa_chiave IN (${segnaposti})
    AND riferimento_tipo IN ('luogo', 'negozio', 'attivita', 'confidente', 'mappa') AND riferimento_chiave IS NOT NULL ORDER BY mappa_chiave, ordine, id`).all(...proprie) as
    Array<{ id: number; nome: string; mappa_chiave: string; riferimento_tipo: ElementoAreaDto['tipo'] | 'mappa'; riferimento_chiave: string }>;
  const elementi: ElementoAreaDto[] = [];
  const vicine: AreaDettaglioDto['vicine'] = [];
  const viste = new Set<string>();
  // L5: la presenza dei luoghi (e delle sedi dei negozi) con la funzione unica, la loro pagina, e i pin di negozi di un altro quartiere
  const luoghi = lettureLuoghi(partitaId);
  const quartiereArea = a.quartiere_chiave;
  for (const s of pin) {
    if (s.riferimento_tipo !== 'mappa') {
      const nome = (prepared(NOMI_ELEMENTI[s.riferimento_tipo]).get(s.riferimento_chiave) as { nome: string } | undefined)?.nome;
      if (!nome) continue;
      const lp = luogoDelPin({ riferimento_tipo: s.riferimento_tipo, riferimento_chiave: s.riferimento_chiave, nome, descrizione: null }, luoghi);
      // un luogo solo per gli eventi di un Confidente non sta mai in «Luoghi qui» (R5-20f)
      if (lp?.soloEventi) continue;
      // un pin agganciato a un negozio di un altro quartiere (la sua sede): da rivedere, col nome del pin, nessun cambio senza il sì
      const sedeNegozio = s.riferimento_tipo === 'negozio' ? luoghi.sediNegozi.get(s.riferimento_chiave) : undefined;
      const quartiereSede = sedeNegozio?.sede ? luoghi.righe.get(sedeNegozio.sede)?.quartiere_chiave ?? sedeNegozio.quartiere : sedeNegozio?.quartiere ?? null;
      const altroQuartiere = !!quartiereArea && !!sedeNegozio && !!quartiereSede && quartiereSede !== quartiereArea;
      elementi.push({ tipo: s.riferimento_tipo, chiave: s.riferimento_chiave, nome: altroQuartiere ? s.nome : nome, spillo: s.id, planimetria: chiaveMappa(s.mappa_chiave),
        ...(lp ? { presenza: lp.presenza, casa: lp.casa } : { casa: null }), ...(altroQuartiere ? { daRivedere: 'negozio-altro-quartiere' as const } : {}) });
      continue;
    }
    // un passaggio: dove porta, una volta per destinazione (un'Area vicina, o la mappa di un quartiere), lei esclusa
    const meta = prepared('SELECT * FROM mappa WHERE chiave = ?').get(idMappa(s.riferimento_chiave)) as
      { chiave: string; nome: string; tipo: string; entita_tipo: string | null; entita_chiave: string | null; area_chiave: string | null } | undefined;
    if (!meta || proprie.has(meta.chiave)) continue;
    const areaMeta = meta.area_chiave ? ctx.aree.aree.get(meta.area_chiave) : undefined;
    if (areaMeta && partitaId !== undefined && !areaDisponibilePerPartita(areaMeta, partitaId)) continue;
    const chiaveVista = areaMeta ? `area:${areaMeta.chiave}` : `mappa:${meta.chiave}`;
    if (viste.has(chiaveVista)) continue;
    viste.add(chiaveVista);
    const quartiere = areaMeta?.quartiere_chiave ?? (meta.tipo === 'quartiere' && meta.entita_tipo === 'quartiere' ? meta.entita_chiave : null);
    vicine.push({ nome: areaMeta?.nome ?? meta.nome, quartiereNome: quartiere ? ctx.aree.nomiQuartieri.get(quartiere) ?? null : null,
      casa: areaMeta ? casaDellArea(areaMeta) ?? casaDellaMappa(meta, ctx.aree) : casaDellaMappa(meta, ctx.aree) });
  }
  // L5: i luoghi dell'Area (`luogo.area_chiave`) e quelli fra loro senza pin («Da posizionare»)
  const luoghiArea = luoghiDellArea(a.chiave, luoghi);
  return { ...riassuntoArea(a, c, ctx, partitaId), planimetrie: versioni, elementi, vicine, luoghi: luoghiArea, daPosizionare: luoghiArea.filter((l) => l.pin === null) };
}

// ---- Scritture ----

/** Gli slug che non possono essere di un'Area: sono segmenti delle rotte delle Aree (gli stessi della 109). */
const SLUG_RISERVATI = new Set(['ordine', 'da-collocare', 'nuova']);

/** Il nome dato, senza spazi ai bordi; 400 `nome-vuoto` se non resta niente. */
function nomeValido(nome: string): string {
  const n = nome.trim();
  if (!n) throw httpErrors.badRequest('nome-vuoto', 'Il nome dell’area non può essere vuoto.');
  return n;
}

/** Lo slug di un'Area nuova nel contenitore: dal nome, 400 se riservato, con `-2`, `-3`… se è già preso. */
function slugLibero(c: Contenitore, nome: string): string {
  const base = slug(nome);
  if (!base) throw httpErrors.badRequest('nome-vuoto', 'Il nome dell’area deve contenere almeno una lettera o una cifra.');
  if (SLUG_RISERVATI.has(base)) throw httpErrors.badRequest('slug-riservato', `«${nome}» darebbe all’area l’indirizzo «${base}», riservato alle funzioni dell’app: scegli un altro nome.`);
  const usati = new Set(prepared(`SELECT slug FROM area WHERE ${c.colonna} = ?`).pluck().all(c.chiave) as string[]);
  let candidato = base; let n = 2;
  while (usati.has(candidato)) candidato = `${base}-${n++}`;
  return candidato;
}

/** Gli errori di `creaMappa` che dicono «chiave o percorso già presi»: con un altro nome si riprova. */
const CHIAVE_PRESA = new Set(['mappa-esistente', 'percorso-gia-usato', 'nome-mappa-duplicato']);

/**
 * Una planimetria nuova sotto la mappa del contenitore, col nome dato; se la chiave che ne deriva è già presa (un'altra mappa,
 * un percorso o un indirizzo di prima) riprova con «Nome (2)», «Nome (3)»… La chiave interna.
 */
function creaPlanimetria(c: Contenitore, nome: string): string {
  for (let n = 1; n < 100; n++) {
    const tentativo = n === 1 ? nome : `${nome} (${n})`;
    try {
      return idMappa(creaMappa(undefined, { nome: tentativo, tipo: c.tipoPlanimetria, genitore: c.mappa, asset: null }, { dallArea: true }).chiave);
    } catch (err) {
      if (err instanceof HttpError && CHIAVE_PRESA.has(err.code)) continue;
      throw err;
    }
  }
  throw httpErrors.conflict('mappa-esistente', `Non c’è un nome libero per la planimetria «${nome}».`);
}

/** Lega la planimetria all'Area come versione `ordine`, con l'etichetta (vuota = nessuna). */
function legaVersione(mappa: string, area: string, ordine: number, etichetta: string | null | undefined): void {
  prepared('UPDATE mappa SET area_chiave = ?, versione_ordine = ?, versione_etichetta = ?, updated_at = ? WHERE chiave = ?').run(area, ordine, etichetta?.trim() || null, nowIso(), mappa);
}

/** La prossima posizione in fondo al contenitore. */
function ordineInFondo(c: Contenitore): number {
  return prepared(`SELECT COALESCE(MAX(ordine) + 100, 0) FROM area WHERE ${c.colonna} = ?`).pluck().get(c.chiave) as number;
}

/** L'immagine di una planimetria nuova: tipo, byte e conferma dei pezzi come nell'editor (una mappa nuova non ne ha). */
export interface ImmagineNuova { mime: string; contenuto: Buffer }

/** Una riga nuova di `area` nel contenitore, dell'utente, in fondo (dentro la transazione di chi chiama). Restituisce la chiave. */
function inserisciArea(c: Contenitore, slugArea: string, nome: string, predefinita: string | null): string {
  const chiaveArea = `${c.prefisso}${slugArea}`;
  prepared(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'utente', NULL, 0, ?)`).run(chiaveArea, c.colonna === 'quartiere_chiave' ? c.chiave : null, c.colonna === 'dungeon_chiave' ? c.chiave : null,
    c.colonna === 'citta_chiave' ? c.chiave : null, slugArea, nome, ordineInFondo(c), predefinita, nowIso());
  return chiaveArea;
}

/**
 * Crea un'Area con la sua prima planimetria e l'immagine (R2-23, R3-20): in una transazione l'Area (dell'utente, in fondo al
 * contenitore), la planimetria sotto la mappa del contenitore (ruolo dedotto, L1), e — nel mondo, se c'è il punto — il pin di
 * passaggio sull'illustrazione del contenitore, col nome dell'Area; in un Palazzo, i legami con le `infiltrazioni` date (chiavi delle
 * infiltrazioni del Palazzo: R3-22), e niente punto (400 `punto-non-ammesso`: nei Palazzi non c'è un'illustrazione con passaggi). Un
 * errore (immagine non valida, nome vuoto o riservato, infiltrazione di un altro Palazzo) non lascia niente.
 */
export function creaArea(contenitore: ContenitoreRotta, chiave: string, dati: { nome: string; immagine: ImmagineNuova; x?: number; y?: number; etichetta?: string; infiltrazioni?: readonly string[] }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const nome = nomeValido(dati.nome);
  const slugArea = slugLibero(c, nome);
  if (c.colonna === 'dungeon_chiave' && (dati.x !== undefined || dati.y !== undefined)) throw httpErrors.badRequest('punto-non-ammesso', 'Nei Palazzi un’area non ha un punto sull’illustrazione: si crea senza x e y.');
  if (c.colonna !== 'dungeon_chiave' && dati.infiltrazioni?.length) throw httpErrors.badRequest('infiltrazioni-solo-nei-palazzi', 'Le infiltrazioni si legano alle aree dei Palazzi.');
  getDb().transaction(() => {
    const chiaveArea = inserisciArea(c, slugArea, nome, null);
    const mappa = creaPlanimetria(c, nome);
    legaVersione(mappa, chiaveArea, 0, dati.etichetta);
    impostaImmagineMappa(mappa, dati.immagine.mime, dati.immagine.contenuto);
    prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ?').run(mappa, chiaveArea);
    if (dati.x !== undefined && dati.y !== undefined) {
      creaSpillo(c.mappa, { tipo: 'passaggio', nome, x: dati.x, y: dati.y, riferimento: { tipo: 'mappa', chiave: chiaveMappa(mappa) } });
    }
    if (dati.infiltrazioni?.length) impostaLegamiInfiltrazione({ area: chiaveArea, infiltrazioni: dati.infiltrazioni });
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Le infiltrazioni che toccano un'Area di un Palazzo (R3-23, dall'area): l'insieme dato sostituisce quello di prima. */
export function impostaInfiltrazioniDellArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string, infiltrazioni: readonly string[]): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  if (c.colonna !== 'dungeon_chiave') throw httpErrors.badRequest('infiltrazioni-solo-nei-palazzi', 'Le infiltrazioni si legano alle aree dei Palazzi.');
  impostaLegamiInfiltrazione({ area: a.chiave, infiltrazioni });
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** La regola delle Aree dei Palazzi della migrazione 110, per l'import di un pacchetto di prima (L3 §2.3): crea le aree mancanti. */
export function assegnaAreePalazzi(db: AppDatabase = getDb()): EsitoAreePalazzi {
  return conAree(db) ? assegnaAreePalazzi110(db, nowIso()) : { aree: 0, planimetrie: 0, etichette: 0, legami: 0, legamiDaRegola: 0 };
}

/** Aggiunge una planimetria in coda alle versioni dell'Area (R2-24), con l'immagine; `predefinita` la fa aprire per prima. */
export function aggiungiPlanimetria(contenitore: ContenitoreRotta, chiave: string, slugArea: string, dati: { immagine: ImmagineNuova; etichetta?: string; predefinita?: boolean }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  getDb().transaction(() => {
    const ordine = prepared('SELECT COALESCE(MAX(versione_ordine) + 1, 0) FROM mappa WHERE area_chiave = ?').pluck().get(a.chiave) as number;
    const etichetta = dati.etichetta?.trim();
    const mappa = creaPlanimetria(c, etichetta ? `${a.nome} — ${etichetta}` : `${a.nome} ${ordine + 1}`);
    legaVersione(mappa, a.chiave, ordine, etichetta);
    impostaImmagineMappa(mappa, dati.immagine.mime, dati.immagine.contenuto);
    if (dati.predefinita || !a.planimetria_predefinita) prepared('UPDATE area SET planimetria_predefinita = ?, updated_at = ? WHERE chiave = ?').run(mappa, nowIso(), a.chiave);
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** La copia dei valori della guida, presa alla prima correzione di un'Area del pacchetto (come `luogo.seed_json`, 071). */
function seedJson(a: RigaArea): string {
  return JSON.stringify({ nome: a.nome, nome_rivisto: a.nome_rivisto, planimetria_predefinita: a.planimetria_predefinita });
}

/**
 * Corregge un'Area: il nome (lo slug, e quindi l'indirizzo, non cambia), la planimetria predefinita (una delle sue) e «Tieni» per
 * un'Area da verificare (`daVerificare: false`). La prima correzione di un'Area della guida ne conserva i valori, che «Ripristina»
 * rimette (R2-28).
 */
export function aggiornaArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string, dati: { nome?: string; predefinita?: string; daVerificare?: false }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  const nome = dati.nome === undefined ? undefined : nomeValido(dati.nome);
  let predefinita: string | undefined;
  if (dati.predefinita !== undefined) {
    predefinita = idMappa(dati.predefinita);
    if (!prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(predefinita, a.chiave)) {
      throw httpErrors.badRequest('planimetria-di-altra-area', 'La planimetria predefinita si sceglie fra le versioni dell’area.');
    }
  }
  const cambiaGuida = (nome !== undefined && nome !== a.nome) || (predefinita !== undefined && predefinita !== a.planimetria_predefinita);
  getDb().transaction(() => {
    if (cambiaGuida && a.origine === 'seed' && a.seed_json === null) prepared('UPDATE area SET seed_json = ? WHERE chiave = ?').run(seedJson(a), a.chiave);
    if (nome !== undefined && nome !== a.nome) prepared('UPDATE area SET nome = ?, nome_rivisto = 1 WHERE chiave = ?').run(nome, a.chiave);
    if (predefinita !== undefined) prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ?').run(predefinita, a.chiave);
    if (dati.daVerificare === false) prepared('UPDATE area SET da_verificare = 0 WHERE chiave = ?').run(a.chiave);
    prepared('UPDATE area SET updated_at = ? WHERE chiave = ?').run(nowIso(), a.chiave);
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Rimette i valori della guida di un'Area corretta (R2-28); 409 se l'Area è dell'utente o non è stata corretta. */
export function ripristinaArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  if (a.origine === 'utente') throw httpErrors.conflict('area-dell-utente', 'L’area l’hai creata tu: non ci sono valori della guida da rimettere.');
  if (a.seed_json === null) throw httpErrors.conflict('area-non-modificata', 'L’area ha già i valori della guida.');
  const prima = JSON.parse(a.seed_json) as { nome: string; nome_rivisto: number; planimetria_predefinita: string | null };
  // la predefinita di prima, se è ancora una sua versione; altrimenti resta quella di adesso
  const predefinita = prima.planimetria_predefinita && prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(prima.planimetria_predefinita, a.chiave)
    ? prima.planimetria_predefinita : a.planimetria_predefinita;
  prepared('UPDATE area SET nome = ?, nome_rivisto = ?, planimetria_predefinita = ?, seed_json = NULL, updated_at = ? WHERE chiave = ?')
    .run(prima.nome, prima.nome_rivisto, predefinita, nowIso(), a.chiave);
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Riordina le Aree del contenitore: l'elenco deve avere tutti i loro slug, ognuno una volta; `ordine` diventa 100·i. */
export function riordinaAree(contenitore: ContenitoreRotta, chiave: string, slugs: readonly string[]): AreaRiassuntoDto[] {
  const c = contenitoreDaRotta(contenitore, chiave);
  const presenti = prepared(`SELECT slug FROM area WHERE ${c.colonna} = ?`).pluck().all(c.chiave) as string[];
  if (slugs.length !== presenti.length || new Set(slugs).size !== slugs.length || slugs.some((s) => !presenti.includes(s))) {
    throw httpErrors.badRequest('ordine-non-valido', 'L’ordine deve elencare tutte le aree del posto, ognuna una volta.');
  }
  getDb().transaction(() => {
    slugs.forEach((s, i) => prepared(`UPDATE area SET ordine = ?, updated_at = ? WHERE ${c.colonna} = ? AND slug = ?`).run(100 * i, nowIso(), c.chiave, s));
  })();
  invalidaCacheDiGioco();
  return areeDelContenitore(c);
}

/** L'ordine e le etichette delle versioni di un'Area: `ordine` elenca tutte le sue planimetrie (chiavi pubbliche), una volta. */
export function aggiornaVersioni(contenitore: ContenitoreRotta, chiave: string, slugArea: string, dati: { ordine?: readonly string[]; etichette?: Readonly<Record<string, string | null>> }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  const proprie = new Set(planimetrieDi(a.chiave).map((p) => p.chiave));
  const interne = (chiavi: readonly string[]) => chiavi.map((k) => idMappa(k));
  if (dati.ordine) {
    const ordine = interne(dati.ordine);
    if (ordine.length !== proprie.size || new Set(ordine).size !== ordine.length || ordine.some((k) => !proprie.has(k))) {
      throw httpErrors.badRequest('ordine-non-valido', 'L’ordine deve elencare tutte le planimetrie dell’area, ognuna una volta.');
    }
  }
  const etichette = Object.entries(dati.etichette ?? {}).map(([k, e]) => [idMappa(k), e] as const);
  if (etichette.some(([k]) => !proprie.has(k))) throw httpErrors.badRequest('planimetria-di-altra-area', 'Le etichette sono delle versioni di questa area.');
  getDb().transaction(() => {
    interne(dati.ordine ?? []).forEach((k, i) => prepared('UPDATE mappa SET versione_ordine = ? WHERE chiave = ?').run(i, k));
    for (const [k, e] of etichette) prepared('UPDATE mappa SET versione_etichetta = ? WHERE chiave = ?').run(e?.trim() || null, k);
    prepared('UPDATE area SET updated_at = ? WHERE chiave = ?').run(nowIso(), a.chiave);
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/**
 * Che cosa un'Area si porta via eliminandola (per la conferma). Nei Palazzi (L3 §3.3) anche quanti pin sono collegati a voci della
 * guida (le voci restano nelle loro infiltrazioni, i pin vanno nel cestino con l'Area) e quante infiltrazioni la toccano.
 */
export interface ContenutiArea { planimetrie: number; pin: number; passaggi: number; ingresso: boolean; elementi: number; pinConVoci: number; infiltrazioni: number }

function contenutiArea(a: RigaArea): { riepilogo: ContenutiArea; planimetrie: string[]; passaggi: number[] } {
  const planimetrie = planimetrieDi(a.chiave).map((p) => p.chiave);
  const segnaposti = planimetrie.map(() => '?').join(', ');
  const pin = planimetrie.length ? prepared(`SELECT COUNT(*) FROM spillo WHERE mappa_chiave IN (${segnaposti})`).pluck().get(...planimetrie) as number : 0;
  const elementi = planimetrie.length ? prepared(`SELECT COUNT(*) FROM spillo WHERE mappa_chiave IN (${segnaposti}) AND riferimento_tipo IN ('luogo', 'negozio', 'attivita', 'confidente')`).pluck().get(...planimetrie) as number : 0;
  // i passaggi che arrivano alle sue planimetrie da fuori (da lei stessa se ne vanno con le planimetrie)
  const passaggi = planimetrie.length ? prepared(`SELECT id FROM spillo WHERE riferimento_tipo = 'mappa' AND riferimento_chiave IN (${segnaposti}) AND mappa_chiave NOT IN (${segnaposti})`).pluck().all(...planimetrie, ...planimetrie) as number[] : [];
  const ingresso = !!prepared('SELECT 1 FROM quartiere_ingresso WHERE area_chiave = ?').get(a.chiave);
  const pinConVoci = planimetrie.length ? prepared(`SELECT COUNT(DISTINCT s.id) FROM spillo s JOIN spillo_voce sv ON sv.spillo_id = s.id WHERE s.mappa_chiave IN (${segnaposti})`).pluck().get(...planimetrie) as number : 0;
  const infiltrazioni = conLegami() ? prepared('SELECT COUNT(*) FROM infiltrazione_area WHERE area_chiave = ?').pluck().get(a.chiave) as number : 0;
  return { riepilogo: { planimetrie: planimetrie.length, pin, passaggi: passaggi.length, ingresso, elementi, pinConVoci, infiltrazioni }, planimetrie, passaggi };
}

/**
 * Elimina un'Area (R2-26): con contenuti — pin sulle sue planimetrie, passaggi che arrivano da fuori, l'ingresso del quartiere,
 * elementi — chiede conferma (409 `area-con-contenuti` con il riepilogo). Con la conferma (o senza contenuti) va nel cestino come
 * `area-fisica`, con le planimetrie (gli stessi passi dell'eliminazione di una mappa), i passaggi che vi portavano e l'ingresso; da
 * lì si rimette com'era. Per un'Area da verificare è «Rimuovi».
 */
export function eliminaArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string, conferma: boolean): void {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  const { riepilogo, planimetrie, passaggi } = contenutiArea(a);
  if (!conferma && (riepilogo.pin > 0 || riepilogo.passaggi > 0 || riepilogo.ingresso || riepilogo.elementi > 0 || riepilogo.infiltrazioni > 0)) {
    // il riepilogo in parole, al singolare e al plurale (difetto FUN2-4): «1 planimetria, 1 pin e 1 passaggio che porta qui»; nei
    // Palazzi «3 planimetrie, 52 pin di cui 40 collegati a voci e 2 infiltrazioni» (le voci restano, L3 §4.3)
    const pin = `${riepilogo.pin} pin${riepilogo.pinConVoci > 0 ? ` di cui ${riepilogo.pinConVoci} ${riepilogo.pinConVoci === 1 ? 'collegato a voci' : 'collegati a voci'}` : ''}`;
    const parti = [
      riepilogo.planimetrie === 1 ? '1 planimetria' : `${riepilogo.planimetrie} planimetrie`,
      pin,
      ...(riepilogo.passaggi > 0 ? [riepilogo.passaggi === 1 ? '1 passaggio che porta qui' : `${riepilogo.passaggi} passaggi che portano qui`] : []),
      ...(riepilogo.infiltrazioni > 0 ? [riepilogo.infiltrazioni === 1 ? '1 infiltrazione' : `${riepilogo.infiltrazioni} infiltrazioni`] : []),
    ];
    const elenco = parti.length > 1 ? `${parti.slice(0, -1).join(', ')} e ${parti[parti.length - 1]}` : parti[0];
    const voci = riepilogo.pinConVoci > 0 ? ' (le voci della guida restano nelle loro infiltrazioni)' : '';
    throw httpErrors.conflict('area-con-contenuti', `L’area «${a.nome}» ha ${elenco}${riepilogo.ingresso ? ', ed è l’ingresso del quartiere' : ''}: eliminandola va tutto nel cestino${voci}.`, { ...riepilogo });
  }
  const vicine = prepared(`SELECT slug FROM area WHERE ${c.colonna} = ? ORDER BY ordine, slug`).pluck().all(c.chiave) as string[];
  const i = vicine.indexOf(a.slug);
  conCestino({ tipo: 'area-fisica', chiave: a.chiave, nome: a.nome, contesto: c.nome, vicini: { prima: i > 0 ? vicine[i - 1] : null, dopo: i >= 0 && i < vicine.length - 1 ? vicine[i + 1] : null } }, () => getDb().transaction(() => {
    for (const id of passaggi) eliminaSpillo(id);
    prepared('DELETE FROM quartiere_ingresso WHERE area_chiave = ?').run(a.chiave);
    // L3: i legami con le infiltrazioni (le altre aree di ogni infiltrazione si ricompattano); il cestino li rimette
    staccaAreaDalleInfiltrazioni(a.chiave);
    for (const k of planimetrie) eliminaMappa(k, { dallArea: true });
    prepared('DELETE FROM area WHERE chiave = ?').run(a.chiave);
  })());
  invalidaCacheDiGioco();
}

// Rimessa dal cestino: il registro riporta Area, planimetrie, pin, passaggi e ingresso com'erano. Se qualche riga dell'albero delle
// mappe non è tornata (toccata dopo l'eliminazione), i percorsi si ricalcolano, come per una mappa.
registraRipristinoCestino('area-fisica', (_chiave, _vicini, saltate) => {
  if (saltate.some((s) => s.tabella === 'mappa' || s.tabella === 'mappa_percorso' || s.tabella === 'mappa_alias')) sincronizzaPercorsiMappe(getDb());
  invalidaCacheDiGioco();
});

/**
 * Colloca una planimetria del mondo senza Area (R2-27): in coda alle versioni di un'Area esistente del contenitore, o come prima di
 * un'Area nuova; se non è già sotto la mappa del contenitore ci si sposta (i percorsi si ricalcolano, il vecchio resta come alias).
 */
export function collocaPlanimetria(dati: { mappa: string; quartiere?: string; dungeon?: string; area?: string; nuova?: { nome: string }; etichetta?: string },
  /** `sposta`: anche nel mondo una versione può cambiare Area (le rotte vecchie `/stanza` e `/presentazione`, L3 §3.3). `conferma`:
   *  spostare l'unica versione di un'Area la svuota, e l'Area va nel cestino (L3 §3.6.1): senza, 409 `area-si-svuota` col riepilogo. */
  opz: { sposta?: boolean; conferma?: boolean } = {}): AreaDettaglioDto {
  if ((dati.quartiere === undefined) === (dati.dungeon === undefined)) throw httpErrors.badRequest('colloca-non-valido', 'Indica il quartiere (o la città) oppure il Palazzo.');
  const c = dati.dungeon !== undefined ? contenitoreDaRotta('dungeon', dati.dungeon) : contenitoreDaRotta('citta', dati.quartiere!);
  const mappa = idMappa(dati.mappa);
  const r = prepared('SELECT chiave, tipo, genitore_chiave, area_chiave, versione_etichetta FROM mappa WHERE chiave = ?').get(mappa) as { chiave: string; tipo: string; genitore_chiave: string | null; area_chiave: string | null; versione_etichetta: string | null } | undefined;
  if (!r) throw httpErrors.notFound('mappa-non-trovata', 'La planimetria da collocare non esiste.');
  if ((dati.area === undefined) === (dati.nuova === undefined)) throw httpErrors.badRequest('colloca-non-valido', 'Indica un’area esistente oppure il nome di un’area nuova.');
  // nel mondo si collocano le planimetrie senza Area; nei Palazzi (L3) anche «Sposta la versione in un'altra area» e «Rendila un'area
  // a sé», ma solo dentro il suo Palazzo
  const vecchia = r.area_chiave ? prepared('SELECT * FROM area WHERE chiave = ?').get(r.area_chiave) as RigaArea | undefined : undefined;
  if (r.area_chiave && c.colonna !== 'dungeon_chiave' && !opz.sposta) throw httpErrors.conflict('planimetria-gia-collocata', 'La planimetria appartiene già a un’area: si sposta dalla pagina della sua area.');
  if (vecchia && opz.sposta && r.genitore_chiave !== c.mappa) throw httpErrors.badRequest('stanza-di-altro-luogo', 'Una versione si sposta solo fra le aree dello stesso posto.');
  if (c.colonna === 'dungeon_chiave' && r.genitore_chiave !== c.mappa) throw httpErrors.badRequest('planimetria-di-un-altro-palazzo', 'La planimetria non è di questo Palazzo: si sposta fra le aree del suo Palazzo.');
  if (vecchia && dati.area !== undefined && vecchia.slug === dati.area) throw httpErrors.badRequest('colloca-non-valido', 'La planimetria è già una versione di quest’area.');
  // l'unica versione della sua Area: «entra in un'altra area» fonde le due (i legami della vecchia passano alla nuova, la vecchia vuota
  // va nel cestino), e lo si conferma (L3 §3.6.1); «rendila un'area a sé» non ha senso, lo è già
  const sola = !!vecchia && (prepared('SELECT COUNT(*) FROM mappa WHERE area_chiave = ?').pluck().get(vecchia.chiave) as number) < 2;
  if (sola && dati.nuova) throw httpErrors.badRequest('gia-area-a-se', `«${vecchia!.nome}» ha solo questa planimetria: è già un’area a sé.`);
  if (sola && dati.area !== undefined && !opz.conferma) {
    const arrivo = rigaArea(c, dati.area);
    const legami = conLegami() ? prepared('SELECT COUNT(*) FROM infiltrazione_area WHERE area_chiave = ?').pluck().get(vecchia!.chiave) as number : 0;
    const conLegamiTesto = legami === 0 ? '' : ` con ${legami === 1 ? '1 legame a un’infiltrazione' : `${legami} legami a infiltrazioni`}`;
    throw httpErrors.conflict('area-si-svuota', `«${vecchia!.nome}» resta senza planimetrie: la versione si sposta in «${arrivo.nome}», «${vecchia!.nome}» va nel cestino${conLegamiTesto}.`,
      { area: vecchia!.slug, arrivo: arrivo.slug, legami });
  }
  // spostando una versione, l'etichetta resta la sua se non se ne dà un'altra
  const etichetta = dati.etichetta ?? (vecchia ? r.versione_etichetta ?? undefined : undefined);
  let slugArea: string;
  getDb().transaction(() => {
    let nuovaArea: string;
    if (dati.nuova) {
      const nome = nomeValido(dati.nuova.nome);
      slugArea = slugLibero(c, nome);
      nuovaArea = inserisciArea(c, slugArea, nome, mappa);
      legaVersione(mappa, nuovaArea, 0, etichetta);
    } else {
      const a = rigaArea(c, dati.area!);
      slugArea = a.slug;
      nuovaArea = a.chiave;
      const ordine = prepared('SELECT COALESCE(MAX(versione_ordine) + 1, 0) FROM mappa WHERE area_chiave = ?').pluck().get(a.chiave) as number;
      legaVersione(mappa, a.chiave, ordine, etichetta);
      if (!a.planimetria_predefinita) prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ?').run(mappa, a.chiave);
    }
    if (vecchia && sola) fondiNellArea(c, vecchia, mappa, nuovaArea);
    else if (vecchia) lasciaLArea(vecchia, mappa, nuovaArea);
    if (r.genitore_chiave !== c.mappa) {
      prepared('UPDATE mappa SET genitore_chiave = ?, updated_at = ? WHERE chiave = ?').run(c.mappa, nowIso(), mappa);
      sincronizzaPercorsiMappe(getDb());
    }
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(c.rotta, c.chiave, slugArea!);
}

/**
 * L'unica versione di un'Area che entra in un'altra (L3 §3.6.1, dentro la transazione di chi chiama, a versione già spostata): le due
 * Aree diventano una. Le infiltrazioni della vecchia passano alla nuova al **posto** della vecchia (stesso ordine, origine, questa versione
 * da aprire; `INSERT OR IGNORE`: dove la nuova c'era già resta com'era), l'ingresso del quartiere che stava sulla vecchia passa alla
 * nuova, e la vecchia, ormai vuota e senza planimetria predefinita, va nel **cestino** (`area-fisica`, «fusa in …») con i suoi legami:
 * rimessa, torna vuota con i legami di prima, e la versione resta dov'è. Nessuna voce né pin cambia.
 */
function fondiNellArea(c: ReturnType<typeof contenitoreDaRotta>, vecchia: RigaArea, mappa: string, nuovaArea: string): void {
  if (conLegami()) {
    prepared(`INSERT OR IGNORE INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine)
      SELECT infiltrazione_chiave, ?, ordine, ?, origine FROM infiltrazione_area WHERE area_chiave = ?`).run(nuovaArea, mappa, vecchia.chiave);
  }
  prepared('UPDATE quartiere_ingresso SET area_chiave = ? WHERE area_chiave = ?').run(nuovaArea, vecchia.chiave);
  // la predefinita era la versione spostata: l'Area che va nel cestino (e che ne può tornare) resta senza
  prepared('UPDATE area SET planimetria_predefinita = NULL WHERE chiave = ?').run(vecchia.chiave);
  const arrivo = prepared('SELECT nome FROM area WHERE chiave = ?').pluck().get(nuovaArea) as string;
  const vicine = prepared(`SELECT slug FROM area WHERE ${c.colonna} = ? ORDER BY ordine, slug`).pluck().all(c.chiave) as string[];
  const i = vicine.indexOf(vecchia.slug);
  conCestino({ tipo: 'area-fisica', chiave: vecchia.chiave, nome: vecchia.nome, contesto: `fusa in «${arrivo}»`, vicini: { prima: i > 0 ? vicine[i - 1] : null, dopo: i >= 0 && i < vicine.length - 1 ? vicine[i + 1] : null } }, () => {
    // i legami della vecchia (le altre aree di ogni infiltrazione si ricompattano, se la nuova c'era già) e l'Area
    staccaAreaDalleInfiltrazioni(vecchia.chiave);
    prepared('DELETE FROM area WHERE chiave = ?').run(vecchia.chiave);
  });
}

/**
 * Una versione che lascia la sua Area (L3, dentro la transazione di chi chiama): le versioni rimaste si ricompattano (0…n-1), la
 * predefinita passa alla prima se era lei; le infiltrazioni che aprivano l'area su questa versione (`planimetria_iniziale`) la
 * seguono nell'area di arrivo — un legame in più, con la stessa versione da aprire — e nell'area di prima tornano alla predefinita.
 * Nessuna voce né pin cambia.
 */
function lasciaLArea(vecchia: RigaArea, mappa: string, nuovaArea: string): void {
  (prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave').pluck().all(vecchia.chiave) as string[])
    .forEach((k, i) => prepared('UPDATE mappa SET versione_ordine = ? WHERE chiave = ? AND versione_ordine IS NOT ?').run(i, k, i));
  if (vecchia.planimetria_predefinita === mappa) {
    const prima = prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave LIMIT 1').pluck().get(vecchia.chiave) as string | undefined;
    prepared('UPDATE area SET planimetria_predefinita = ?, updated_at = ? WHERE chiave = ?').run(prima ?? null, nowIso(), vecchia.chiave);
  }
  if (!conLegami()) return;
  for (const inf of prepared('SELECT infiltrazione_chiave FROM infiltrazione_area WHERE area_chiave = ? AND planimetria_iniziale = ?').pluck().all(vecchia.chiave, mappa) as string[]) {
    if (!prepared('SELECT 1 FROM infiltrazione_area WHERE infiltrazione_chiave = ? AND area_chiave = ?').get(inf, nuovaArea)) {
      const ordine = prepared('SELECT COALESCE(MAX(ordine) + 1, 0) FROM infiltrazione_area WHERE infiltrazione_chiave = ?').pluck().get(inf) as number;
      prepared("INSERT INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine) VALUES (?, ?, ?, ?, 'utente')").run(inf, nuovaArea, ordine, mappa);
    }
  }
  prepared('UPDATE infiltrazione_area SET planimetria_iniziale = NULL WHERE area_chiave = ? AND planimetria_iniziale = ?').run(vecchia.chiave, mappa);
}

/**
 * Le planimetrie senza Area — del mondo (figlie di Tokyo o di un quartiere, `luogo` o `area`) e, da L3, dei Palazzi (figlie di
 * `dungeon-<k>`, i Memento esclusi): dopo le migrazioni 109 e 110 nessuna, ma una mappa importata da un pacchetto di prima o tolta da
 * un'Area finisce qui, e «Colloca» la assegna.
 */
export function mappeDaCollocare(): MappaDaCollocareDto[] {
  if (!conAree()) return [];
  const caricate = immaginiCaricateDelleMappe();
  return (prepared(`SELECT m.chiave, m.nome, m.immagine_chiave, m.asset, m.genitore_chiave, g.nome AS genitore_nome, (SELECT COUNT(*) FROM spillo s WHERE s.mappa_chiave = m.chiave) AS spilli
      FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave AND COALESCE(g.entita_chiave, '') <> 'mementos'
        AND (g.tipo IN ('citta', 'quartiere') OR (g.tipo = 'palazzo' AND g.entita_tipo = 'dungeon'))
      WHERE (m.tipo IN ('luogo', 'area') OR g.tipo = 'palazzo') AND m.area_chiave IS NULL ORDER BY g.nome, m.ordine, m.chiave`).all() as
      Array<{ chiave: string; nome: string; immagine_chiave: string | null; asset: string | null; genitore_chiave: string | null; genitore_nome: string | null; spilli: number }>)
    .map((m) => {
      const img = caricataDellaMappa(m, caricate);
      // FUN2-9 (L2): la chiave pubblica del genitore, perché «Colloca» proponga il quartiere giusto (`QuartiereRiassuntoDto.mappaChiave`)
      return { chiave: chiaveMappa(m.chiave), nome: m.nome, genitore: m.genitore_chiave ? chiaveMappa(m.genitore_chiave) : null, genitoreNome: m.genitore_nome, numeroSpilli: m.spilli, immagineUrl: img ? urlCaricata(img) : null, asset: m.asset };
    });
}

// ---- Le rotte vecchie dei gruppi e dei legami, sul modello nuovo (L3 §3.3) ----
//
// `PUT /api/mappe/:k/aree`, `/presentazione` e `/stanza` scrivevano i legami per planimetria (`mappa_entita`) e i gruppi d'immagini,
// che da L3 nessuno legge più. Restano per i client e i test di prima, riscritte così: per una planimetria che ha un'Area agiscono
// sull'Area (legami, nome, etichetta della versione, spostamento della versione); per le mappe senza Area (i Memento, le radici)
// restano le funzioni di prima, perché lì quei dati si leggono ancora.

/** La riga di una mappa con la sua Area (null se non ne ha), dalla chiave pubblica. */
function planimetriaConArea(chiavePubblica: string): { chiave: string; nome: string; genitore_chiave: string | null; area: RigaArea | null } {
  const interna = idMappa(chiavePubblica);
  const r = prepared('SELECT chiave, nome, genitore_chiave, area_chiave FROM mappa WHERE chiave = ?').get(interna) as { chiave: string; nome: string; genitore_chiave: string | null; area_chiave: string | null } | undefined;
  if (!r) throw httpErrors.notFound('mappa-non-trovata', `La mappa '${chiavePubblica}' non esiste.`);
  const area = r.area_chiave && conAree() ? prepared('SELECT * FROM area WHERE chiave = ?').get(r.area_chiave) as RigaArea | undefined : undefined;
  return { chiave: r.chiave, nome: r.nome, genitore_chiave: r.genitore_chiave, area: area ?? null };
}

/** Il contenitore di un'Area già letta. */
function contenitoreDellArea(a: RigaArea): Contenitore {
  return a.dungeon_chiave ? contenitoreDaRotta('dungeon', a.dungeon_chiave) : contenitoreDaRotta('citta', a.citta_chiave ?? a.quartiere_chiave ?? '');
}

/** Sposta una versione nell'Area data (o in un'Area nuova col nome dato), dentro il suo contenitore. */
function spostaVersione(mappa: string, area: RigaArea, verso: { area: RigaArea } | { nuova: string }): void {
  const c = contenitoreDellArea(area);
  // le rotte vecchie non conoscono la conferma: il loro gesto («unisci a quella stanza») era già esplicito; l'Area che si svuota va
  // comunque nel cestino, e da lì si rimette (L3 §3.6.1)
  collocaPlanimetria({ mappa, ...(c.colonna === 'dungeon_chiave' ? { dungeon: c.chiave } : { quartiere: c.chiave }), ...('area' in verso ? { area: verso.area.slug } : { nuova: { nome: verso.nuova } }) }, { sposta: true, conferma: true });
}

/**
 * `PUT /api/mappe/:k/aree` (vecchia): le infiltrazioni «della planimetria» sono quelle della sua Area, quindi l'insieme dato diventa
 * quello dell'Area (`impostaLegamiInfiltrazione` dall'area). Gli errori sono quelli di prima: 400 `mappa-fuori-palazzo` per una mappa
 * del mondo, 400 `area-inesistente`, 400 `area-di-altro-palazzo`. Restituisce le infiltrazioni della planimetria; null per una mappa
 * senza Area (la radice, i Memento: chi chiama usa la funzione di prima, con i suoi errori).
 */
export function impostaInfiltrazioniDellaPlanimetria(chiavePubblica: string, infiltrazioni: readonly string[]): Array<{ chiave: string; nome: string; ordine: number }> | null {
  const p = planimetriaConArea(chiavePubblica);
  if (!p.area) return null;
  const uniche = [...new Set(infiltrazioni)];
  const palazzo = p.area.dungeon_chiave;
  if (!palazzo) {
    if (uniche.length === 0) return [];
    throw httpErrors.badRequest('mappa-fuori-palazzo', 'Le infiltrazioni si legano solo alle planimetrie di un Palazzo.');
  }
  const trovate = uniche.length ? prepared(`SELECT chiave, dungeon_chiave FROM dungeon_area WHERE chiave IN (${uniche.map(() => '?').join(',')})`).all(...uniche) as Array<{ chiave: string; dungeon_chiave: string }> : [];
  const mancanti = uniche.filter((a) => !trovate.some((t) => t.chiave === a));
  if (mancanti.length) throw httpErrors.badRequest('area-inesistente', `Infiltrazione inesistente: ${mancanti.join(', ')}.`);
  const altrove = trovate.filter((t) => t.dungeon_chiave !== palazzo);
  if (altrove.length) throw httpErrors.badRequest('area-di-altro-palazzo', `Infiltrazione di un altro Palazzo: ${altrove.map((t) => t.chiave).join(', ')}.`);
  impostaLegamiInfiltrazione({ area: p.area!.chiave, infiltrazioni: uniche });
  invalidaCacheDiGioco();
  return infiltrazioniDelleAree(palazzo).get(p.area!.chiave) ?? [];
}

/**
 * `PUT /api/mappe/:k/presentazione` (vecchia) per una planimetria con Area: `etichetta` è l'etichetta della versione, `gruppoNome` il
 * nome dell'Area (come «Modifica area»), `gruppoId` = l'id del gruppo d'immagini di un'altra planimetria → la versione va nella sua
 * Area; `gruppoId: null` senza nome → la versione diventa un'Area a sé (se l'Area ha altre versioni). Vero se l'ha gestita; falso per
 * una mappa senza Area (chi chiama usa la funzione di prima).
 */
export function presentazioneDellaPlanimetria(chiavePubblica: string, dati: { gruppoId?: string | null; gruppoNome?: string; etichetta?: string | null }): boolean {
  const p = planimetriaConArea(chiavePubblica);
  if (!p.area) return false;
  const area = p.area;
  const c = contenitoreDellArea(area);
  const etichetta = dati.etichetta === undefined ? undefined : dati.etichetta?.trim() || null;
  const nome = dati.gruppoNome?.trim();
  getDb().transaction(() => {
    if (etichetta !== undefined) prepared('UPDATE mappa SET versione_etichetta = ?, updated_at = ? WHERE chiave = ? AND versione_etichetta IS NOT ?').run(etichetta, nowIso(), p.chiave, etichetta);
    if (dati.gruppoId === null && !nome) {
      if ((prepared('SELECT COUNT(*) FROM mappa WHERE area_chiave = ?').pluck().get(area.chiave) as number) > 1) spostaVersione(p.chiave, area, { nuova: p.nome });
      return;
    }
    if (typeof dati.gruppoId === 'string') {
      const verso = prepared(`SELECT a.* FROM mappa_presentazione mp JOIN mappa m ON m.chiave = mp.mappa_chiave JOIN area a ON a.chiave = m.area_chiave
        WHERE mp.gruppo_immagini_json IS NOT NULL AND json_extract(mp.gruppo_immagini_json, '$.id') = ? ORDER BY m.ordine, m.chiave LIMIT 1`).get(dati.gruppoId) as RigaArea | undefined;
      if (verso && verso.chiave !== area.chiave) {
        spostaVersione(p.chiave, area, { area: verso });
        if (nome) aggiornaArea(c.rotta, c.chiave, verso.slug, { nome });
        return;
      }
    }
    if (nome) aggiornaArea(c.rotta, c.chiave, area.slug, { nome });
  })();
  invalidaCacheDiGioco();
  return true;
}

/**
 * `PUT /api/mappe/:k/stanza` (vecchia) per una planimetria con Area: `con` = un'altra planimetria dello stesso posto → la versione va
 * nella sua Area; `con: null` → diventa un'Area a sé chiamata `nome` (se è già sola nella sua Area, l'Area prende quel nome). Vero se
 * l'ha gestita; falso per una mappa senza Area.
 */
export function stanzaDellaPlanimetria(chiavePubblica: string, dati: { con: string | null; nome?: string }): boolean {
  const p = planimetriaConArea(chiavePubblica);
  if (!p.area) return false;
  const area = p.area;
  const c = contenitoreDellArea(area);
  getDb().transaction(() => {
    if (dati.con === null) {
      const sola = (prepared('SELECT COUNT(*) FROM mappa WHERE area_chiave = ?').pluck().get(area.chiave) as number) < 2;
      if (sola) {
        if (dati.nome?.trim()) aggiornaArea(c.rotta, c.chiave, area.slug, { nome: dati.nome });
        return;
      }
      spostaVersione(p.chiave, area, { nuova: dati.nome?.trim() || p.nome });
      return;
    }
    const altra = planimetriaConArea(dati.con);
    if (altra.chiave === p.chiave) throw httpErrors.badRequest('stanza-non-valida', 'Una planimetria non può entrare nella propria area.');
    if (!altra.area || altra.genitore_chiave !== p.genitore_chiave) throw httpErrors.badRequest('stanza-di-altro-luogo', 'Le due planimetrie non stanno nello stesso posto: un’area raccoglie solo planimetrie dello stesso Palazzo o quartiere.');
    if (altra.area.chiave === area.chiave) return;
    // come la stanza di prima, che «nasceva col nome dato» se quella planimetria non ne aveva una: un'Area di una planimetria sola
    // prende il nome dato, come correzione (`aggiornaArea` salva i valori del seed alla prima modifica: «Ripristina» la riporta), ma
    // mai sopra un nome dato dall'utente, che resta (L3 §3.6.1)
    const sola = (prepared('SELECT COUNT(*) FROM mappa WHERE area_chiave = ?').pluck().get(altra.area.chiave) as number) < 2;
    const rivista = altra.area.nome_rivisto === 1 && !(altra.area.origine === 'seed' && altra.area.seed_json === null);
    spostaVersione(p.chiave, area, { area: altra.area });
    if (sola && !rivista && dati.nome?.trim()) aggiornaArea(c.rotta, c.chiave, altra.area.slug, { nome: dati.nome });
  })();
  invalidaCacheDiGioco();
  return true;
}
