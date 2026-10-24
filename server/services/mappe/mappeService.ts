// ============================================================
// mappeService — albero delle mappe, spilli con stato per partita, editor, esportazione/importazione (dalla Fase 13.1)
// ============================================================
//
// Il servizio dell'atlante: lettura delle mappe e dei loro spilli (con lo stato e le condizioni
// valutate per la partita), le modifiche dell'editor (mappe, aree, stanze, spilli, immagini) e il
// pacchetto delle mappe da esportare e reimportare.
// ============================================================

import { calcolaCollezioniImmagini } from './collezioniImmagini.js';
import { applicaAreaRaccordoPin, improntaRaccordoPin, richiestaRaccordoPin } from './precondizioneRaccordoPin.js';
import { fotografiaRimozionePin, richiestaRimozionePin } from './precondizioneRimozionePin.js';
import type { PrecondizioneRimozionePinDto, RichiestaRimozionePin } from '../../../shared/rimozionePin.js';
import { invalidaCacheDiGioco } from '../cacheDiGioco.js';
import { isDeepStrictEqual } from 'node:util';
import { RETTIFICHE_NOMI_SEED } from './rettificheNomiSeed.js';
import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe.js';
import { assegnaUidMancanti, uidValido } from './identitaSpillo.js';
import type { DestinazioneSpillo, NativoSpilloDto, RuoloImmagine } from '../../../shared/types.js';
import { RUOLI_IMMAGINE } from '../../../shared/types.js';
import { destinazionePerPacchetto, leggiDestinazioneSpillo, risolviSpilloArrivo, salvaDestinazioneSpillo, verificaDestinazioneSpillo, type DestinazioneDaSalvare } from './destinazioniSpillo.js';
import { idMappa, chiaveMappa, nomePercorso, sincronizzaPercorsiMappe } from './percorsiMappe.js';
import { slug } from '../../../shared/slug.js';
import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { HttpError, httpErrors } from '../../utils/httpError.js';
import { conCestino, registrazioneCestinoInCorso, registraRipristinoCestino } from '../cestinoService.js';
import { verificaPartita } from '../verificaPartita.js';
import { t } from '../traduzioniService.js';
import { eliminaImmagine, fileImmagine, leggiImmagine, salvaImmagine, scaricaImmagine } from '../immaginiService.js';
import { acquistiDellaPartita, dettaglioNegozio } from '../negoziService.js';
import { giocabili } from '../squadraService.js';
import { nomiCondizioni, pinCitato } from '../condizioni/nomiCondizioni.js';
import { statoDisponibilitaPartita, valutaRequisitiSpillo, type StatoDisponibilita } from '../disponibilitaService.js';
import { palazzoDiIngresso, palazzoDiOgniMappa } from '../palazziService.js';
import { conPresenzaPin, conDisponibilitaNegozio, senzaIngressoConcluso } from './disponibilitaPin.js';
import { eVoceDiCattura, erroreCatturaNelCompendio } from '../catturePersona.js';
import { allineaEnigmaDellaVoce, allineaRaccoltoDelPin, allineaStatiPunto, erroreVoceDelPin, pinDelPuntoGuida, quanteVociDelPin, scriviStatoVoce, segnaPassiDellEnigma, vociDelPin } from './collegamentiGuida.js';
import { conDivergenze, conStatoPerInfiltrazione, effettiDelGestoDto, modelloAvanzamento, riallineaStati, segnaIlPin, statiDellaPartita, statoDelPin, type ModelloAvanzamento, type StatiDellaPartita } from './statiGuida.js';
import { pinCitati, verificaGiro } from './condizioniTraPin.js';
import { z } from 'zod';
import { condizioneConTesto, leggiCondizioniSalvate, normalizzaRequisitoSpillo, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { entitaDellaRadice, palazzoDellaMappa, sottoalberoMappe } from './alberoMappe.js';
import { casaDelLuogo, condizioniDiSblocco, lettureLuoghi, luogoDelPin, presenzaDelLuogo, type LettureLuoghi, type LuogoDelPin } from '../luoghiService.js';
import { descriviOrariDelLuogo, orariDelLuogo } from '../../../shared/orariNegozio.js';
import { allineaRuoliImmagine, assetEsistente, caricataDellaMappa, dimensioniImmagine, dopoImmagineMappa, immaginiCaricateDelleMappe, urlCaricata, type ImmagineCaricata } from './immagineMappa.js';
import { areaRifDellaMappa, casaDellaMappa, conAree, contestoAree, verificaIngressoNelQuartiere, type ContestoAree, type RigaArea } from './casaMappa.js';
import { areaDisponibilePerPartita } from './disponibilitaAree.js';
import { convertiManualiImportati } from '../condizioni/importazione.js';
import { assegnaAreeDelMondo109 } from '../../db/migrations/109_aree_del_mondo.js';
import { assegnaAreePalazzi110 } from '../../db/migrations/110_aree_dei_palazzi.js';
import { conLegami, impostaLegamiInfiltrazione, infiltrazioniDellaMappa, infiltrazioniDelleMappe } from './legamiInfiltrazioni.js';
import { ammetteCondizioni, categoriaSpillo, gruppoConteggioSpillo, sqlVoceDescrittiva, DEFINIZIONI_SPILLO, GRUPPI_CONTEGGIO_SPILLO, RIFERIMENTI_PER_CATEGORIA, TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO, assetPredefinitoMappa, puntoDescrittivo, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../../shared/spilli.js';
import type { AreaPacchetto, LegamePacchetto, CondizioneSpilloDto, ConteggiAlberoDto, ConteggiPinDto, CopiaPezzoDto, DatiAggiornaCopiaPezzo, DatiCopiaPezzo, DatiNuovoPezzoMappa, DettaglioSpilloDto, DisponibilitaDto, EsportazioneMappeDto, ImmagineSpilloDto, MappaDto, MappaRiassuntoDto, PezzoMappaDto, SpilloDto } from '../../../shared/types.js';
import { aggiornaCopia, confermaPezzi, conPezzi, copiaDto, creaCopia, creaPezzo, eliminaCopia, eliminaPezziDellaMappa, eliminaPezzo, pezziDellaMappa, pezziNellImmagine, pezziPerPacchetto, pezzoDto, righeCopie, rigaCopia, rigaPezzo, quanteCopie, quantiPezzi, schemaPezziPacchetto, sostituisciPezzi, type DimensioniMappa, type PezzoDaImportare } from './pezziMappa.js';

interface RigaMappa { chiave: string; nome: string; tipo: TipoMappa; genitore_chiave: string | null; ordine: number; immagine_chiave: string | null; asset: string | null; larghezza: number | null; altezza: number | null; origine: 'seed' | 'utente'; note: string; updated_at: string; ruolo_immagine: RuoloImmagine; nome_rivisto?: number;
  /** L'Area della planimetria e la sua versione (109, L2); assenti su uno schema di prima. */
  area_chiave?: string | null; versione_etichetta?: string | null; versione_ordine?: number | null }
interface RigaImmagineSpillo { id: number; spillo_id: number; ordine: number; immagine_chiave: string | null; asset: string | null; didascalia: string; updated_at: string }
interface RigaSpillo { area_guida_chiave?: string|null; solo_posizione: number; id: number; uid: string; mappa_chiave: string; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento_tipo: TipoRiferimento | null; riferimento_chiave: string | null; collezionabile: number; ordine: number; origine: 'seed' | 'utente'; updated_at: string; condizioni_json: string | null; seed_identita_json: string | null; nativo_json?: string | null; }

/** La colonna della 082 c'è dal suo turno in poi; prima il nome rivisto non è dichiarabile. */
function conNomeRivisto(): boolean {
  return colonnaMappa('nome_rivisto');
}

/** Vero se la mappa sta nel mondo: è Tokyo, o risale a Tokyo (un quartiere o una sua discendente), fuori dall'ingresso dei Memento. */
function nelMondo(chiave: string): boolean {
  let corrente: string | null = chiave;
  const visti = new Set<string>();
  while (corrente && !visti.has(corrente)) {
    if (corrente === 'citta-mementos') return false;
    if (corrente === 'tokyo') return true;
    visti.add(corrente);
    corrente = (prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(corrente) as { genitore_chiave: string | null } | undefined)?.genitore_chiave ?? null;
  }
  return false;
}

/** Vero se la tabella `mappa` ha la colonna (le migrazioni le aggiungono: i test possono avere uno schema di prima). */
function colonnaMappa(nome: string): boolean {
  return (prepared('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).some((c) => c.name === nome);
}

/** La riga di una mappa dalla chiave pubblica o interna (passa da `idMappa`); 404 se non esiste. */
function rigaMappa(chiave: string): RigaMappa {
  const r = prepared('SELECT * FROM mappa WHERE chiave = ?').get(idMappa(chiave)) as RigaMappa | undefined;
  if (!r) throw httpErrors.notFound('mappa-non-trovata', `La mappa '${chiave}' non esiste.`);
  return r;
}

/** Vero se c'è una mappa con quella chiave (pubblica o interna). */
export function mappaEsiste(chiave: string): boolean {
  return !!prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(idMappa(chiave));
}

/** L'immagine caricata di una mappa sola (la regola di `caricataDellaMappa`, L1), con le immagini lette ora. */
function immagineDi(r: RigaMappa): ImmagineCaricata | null {
  return caricataDellaMappa(r, immaginiCaricateDelleMappe());
}

/**
 * Quello che serve a descrivere le mappe di una risposta, letto in blocco una volta: presentazioni, numerazione delle collezioni,
 * conteggi, nomi e immagini. Prima ogni mappa costava da sei a dieci query (la presentazione con un controllo dello schema, due
 * conteggi, il nome del genitore, fino a tre ricerche dell'immagine), e la numerazione delle collezioni rileggeva la presentazione
 * di tutte le 333 mappe a ogni dettaglio: era quasi metà del tempo di una mappa (rilievi P3 e P8 della verifica, 2026-10-03).
 */
interface ContestoMappe {
  presentazioni: Map<string, Pick<MappaRiassuntoDto, 'contesti'>>;
  collezioni: ReturnType<typeof calcolaCollezioniImmagini>;
  spilli: Map<string, number>;
  figli: Map<string, number>;
  nomi: Map<string, string>;
  /** Immagini dell'ambito «mappa»: chiave (già in forma `idMappa`) → data di caricamento. */
  immagini: Map<string, string>;
  /** Le Aree con i nomi dei contenitori (L2): danno a ogni planimetria la sua Area e la sua casa. */
  aree: ContestoAree;
}

/** Legge in blocco il contesto delle mappe: presentazioni (se la tabella c'è), collezioni, conteggi di spilli e figli, nomi e immagini. */
function contestoMappe(): ContestoMappe {
  const righe = prepared('SELECT * FROM mappa').all() as RigaMappa[];
  const presentazioni = new Map<string, Pick<MappaRiassuntoDto, 'contesti'>>();
  if (prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get()) {
    for (const p of prepared('SELECT mappa_chiave, contesti_json FROM mappa_presentazione').all() as Array<{ mappa_chiave: string; contesti_json: string }>) {
      presentazioni.set(p.mappa_chiave, { contesti: JSON.parse(p.contesti_json) });
    }
  }
  /** Da una query che restituisce chiave e conteggio a una mappa chiave → numero. */
  const conta = (sql: string) => new Map((prepared(sql).all() as Array<{ chiave: string; n: number }>).map((r) => [r.chiave, r.n]));
  return {
    presentazioni,
    // La numerazione delle omonime riguarda le piante del gioco: l'illustrazione di un quartiere
    // porta lo stesso nome ma è un'altra cosa, e non entra nella collezione.
    collezioni: calcolaCollezioniImmagini(righe.map((r) => ({ chiave: r.chiave, genitore: r.genitore_chiave, nome: r.nome, ordine: r.ordine, ...(presentazioni.get(r.chiave) ?? {}), inStanza: (r.versione_etichetta ?? null) !== null, fisica: r.ruolo_immagine === 'planimetria-nativa' }))),
    spilli: conta('SELECT mappa_chiave AS chiave, COUNT(*) AS n FROM spillo WHERE mappa_chiave IS NOT NULL GROUP BY mappa_chiave'),
    // I figli si contano fra quelli che si vedono: il nodo dei Memento è tolto dall'albero, e contarlo lo stesso faceva dire a
    // Tokyo «venticinque luoghi» mostrandone ventiquattro. Un conteggio che non torna con l'elenco sotto è peggio di nessuno.
    figli: conta("SELECT genitore_chiave AS chiave, COUNT(*) AS n FROM mappa WHERE genitore_chiave IS NOT NULL AND chiave <> 'citta-mementos' GROUP BY genitore_chiave"),
    nomi: new Map(righe.map((r) => [r.chiave, r.nome])),
    immagini: immaginiCaricateDelleMappe(),
    aree: contestoAree(),
  };
}

/**
 * Il riassunto di una mappa per l'API: presentazione e posto nella collezione, chiavi pubbliche di mappa e genitore, nome
 * completo di percorso, l'immagine (caricata con l'URL versionato, poi l'asset dichiarato: il risolutore unico, L1), il ruolo,
 * la mappa di cui è radice (quartiere o Palazzo), la versione e i conteggi. Il contesto si passa già letto quando i riassunti sono più d'uno.
 */
function riassunto(r: RigaMappa, ctx: ContestoMappe = contestoMappe()): MappaRiassuntoDto {
  const img = caricataDellaMappa(r, ctx.immagini);
  return {
    ...(ctx.presentazioni.get(r.chiave) ?? {}),
    ...(ctx.collezioni.has(r.chiave)?{immagineCollezione:ctx.collezioni.get(r.chiave)}:{}),
    chiave: chiaveMappa(r.chiave), nome: r.nome, nomeCompleto:nomePercorso(r.chiave), tipo: r.tipo, genitore: r.genitore_chiave?chiaveMappa(r.genitore_chiave):null, ordine: r.ordine,
    genitoreNome: r.genitore_chiave ? ctx.nomi.get(r.genitore_chiave) ?? null : null,
    // L1: una sola immagine per ogni vista. Prima `asset` era costruito per convenzione (`mappe/<chiave pubblica>`, inesistente per
    // 316 mappe su 317) e la colonna viaggiava come `assetOriginale`: ogni vista sceglieva fra i due a modo suo.
    immagineUrl: img ? urlCaricata(img) : null,
    asset: r.asset, radiceDi: entitaDellaRadice(r),
    // la versione dentro la stanza (etichetta e ordine): per una planimetria con Area è anche in `area`; qui c'è per ogni mappa che l'ha (i fogli dei Memento compresi)
    versione: r.versione_etichetta != null || r.versione_ordine != null ? { etichetta: r.versione_etichetta ?? null, ordine: r.versione_ordine ?? 0 } : null,
    ruoloImmagine: r.ruolo_immagine,
    origine: r.origine, nomeRivisto: r.nome_rivisto === 1, numeroSpilli: ctx.spilli.get(r.chiave) ?? 0, numeroFigli: ctx.figli.get(r.chiave) ?? 0, updatedAt: r.updated_at,
    // L2: l'Area della planimetria con la sua versione, e la casa (l'unica pagina che la mostra)
    area: areaRifDellaMappa(r, ctx.aree), casa: casaDellaMappa(r, ctx.aree),
  };
}

/** La radice dei Memento, e tutto quel che le sta sotto.
 *
 * I Memento non sono un luogo dell'atlante. Non si visitano per aree come un Palazzo — i piani
 * sono generati a ogni discesa — e la loro pagina li disegna per intero, col pozzo e i nove
 * dedali. Comparivano però anche nell'indice delle Mappe e nella Città come un quartiere
 * qualunque, e chi ci arrivava di lì trovava otto planimetrie di strutture fisse senza contesto:
 * meno di niente. Si raggiungono da `/guida/dungeon/mementos` e dalle richieste dei Memento, che
 * a quella pagina puntano.
 */
const RADICI_MEMENTO = [
  'dungeon-mementos',
  // «Entrata dei Memento» è un nodo quartiere figlio di Tokyo. Tolto il quartiere dalla Città,
  // quello restava nell'albero come un luogo orfano che porta al pozzo dalla porta di servizio.
  'citta-mementos',
];


/** Le righe dell'albero: radici prima, poi per ordine, senza i Memento. */
function righeDellAlbero(): RigaMappa[] {
  const memento = sottoalberoMappe(RADICI_MEMENTO);
  return (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, chiave').all() as RigaMappa[])
    .filter((r) => !memento.has(r.chiave));
}

const conteggiVuoti = (): ConteggiPinDto => ({ contenuto: 0, passaggi: 0, note: 0 });

/**
 * I conteggi dei pin dell'albero nei tre gruppi dell'indice (E2 di L3, `gruppoConteggioSpillo`): per ogni mappa quelli del suo
 * sottoalbero (lei e quel che le sta sotto fra le righe date), e la radice, cioè la somma dei pin di tutte le righe. Una query sola
 * per tipo e mappa; un genitore fuori dalle righe (o un ciclo nei dati) non fa contare due volte niente: ogni pin sale lungo la sua
 * catena di genitori una volta per antenato.
 */
function conteggiDellAlbero(righe: RigaMappa[]): { perMappa: Map<string, ConteggiPinDto>; radice: ConteggiPinDto } {
  const propri = new Map<string, ConteggiPinDto>();
  for (const p of prepared('SELECT mappa_chiave AS chiave, tipo, COUNT(*) AS n FROM spillo WHERE mappa_chiave IS NOT NULL GROUP BY mappa_chiave, tipo').all() as Array<{ chiave: string; tipo: string; n: number }>) {
    const c = propri.get(p.chiave) ?? conteggiVuoti();
    c[gruppoConteggioSpillo(p.tipo)] += p.n;
    propri.set(p.chiave, c);
  }
  const genitore = new Map(righe.map((r) => [r.chiave, r.genitore_chiave]));
  const perMappa = new Map(righe.map((r) => [r.chiave, conteggiVuoti()]));
  const radice = conteggiVuoti();
  for (const r of righe) {
    const c = propri.get(r.chiave);
    if (!c) continue;
    for (const g of GRUPPI_CONTEGGIO_SPILLO) radice[g] += c[g];
    const visti = new Set<string>();
    for (let k: string | null | undefined = r.chiave; k && perMappa.has(k) && !visti.has(k); k = genitore.get(k)) {
      visti.add(k);
      const s = perMappa.get(k)!;
      for (const g of GRUPPI_CONTEGGIO_SPILLO) s[g] += c[g];
    }
  }
  return { perMappa, radice };
}

/** Albero completo (piatto, con genitore): radici prima, poi per ordine. Senza i Memento. Ogni nodo porta i conteggi dei pin del
 *  suo sottoalbero (E2 di L3). */
export function elencaMappe(partitaId?: number): MappaRiassuntoDto[] {
  const ctx = contestoMappe();
  const righe = righeDellAlbero().filter((r) => !r.area_chiave || areaDisponibilePerPartita(ctx.aree.aree.get(r.area_chiave) ?? { quartiere_chiave: null }, partitaId));
  const { perMappa } = conteggiDellAlbero(righe);
  return righe.map((r) => ({ ...riassunto(r, ctx), conteggiPin: perMappa.get(r.chiave) ?? conteggiVuoti() }));
}

/** I conteggi della radice dell'indice delle Mappe: i pin di tutto l'albero (Memento esclusi) nei tre gruppi (E2 di L3). */
export function conteggiAlbero(): ConteggiAlberoDto {
  return { conteggiPin: conteggiDellAlbero(righeDellAlbero()).radice };
}

/**
 * Il percorso dalla radice fino alla mappa (lei compresa), risalendo i genitori; un ciclo nei dati interrompe la risalita. Una
 * planimetria con un'Area chiude il percorso col nome dell'Area (Tokyo › Shibuya › Sottopasso, L2): la versione la dice l'Area.
 */
function percorsoDi(r: RigaMappa, aree: ContestoAree = contestoAree()): Array<{ chiave: string; nome: string }> {
  const out: Array<{ chiave: string; nome: string }> = [];
  let corrente: RigaMappa | undefined = r;
  const visti = new Set<string>();
  while (corrente && !visti.has(corrente.chiave)) {
    visti.add(corrente.chiave);
    const area = corrente === r && r.area_chiave ? aree.aree.get(r.area_chiave) : undefined;
    out.unshift({ chiave: corrente.chiave, nome: area?.nome ?? corrente.nome });
    corrente = corrente.genitore_chiave ? (prepared('SELECT * FROM mappa WHERE chiave = ?').get(corrente.genitore_chiave) as RigaMappa | undefined) : undefined;
  }
  return out;
}

/**
 * Il dettaglio dell'entità a cui uno spillo rimanda, da mostrare nella sua scheda: mappa con immagine, punto della guida con
 * lo stato della partita, luogo o attività con il negozio che vi ha sede, negozio, Confidente con immagine, richiesta con lo
 * stato. Null se manca il riferimento, se l'entità non esiste o se il tipo non ha un dettaglio.
 */
function dettaglioRiferimento(tipo: TipoRiferimento | null, chiave: string | null, ctx: ContestoSpilli = {}, sedeScelta?: string): DettaglioSpilloDto | null {
  if (!tipo || !chiave) return null;
  const partitaId = ctx.partitaId;
  switch (tipo) {
    case 'mappa': {
      const m = prepared('SELECT * FROM mappa WHERE chiave = ?').get(chiave) as RigaMappa | undefined;
      if (!m) return null;
      const img = immagineDi(m);
      // L2: l'Area della meta (il nome che il passaggio mostra) e la casa, la pagina a cui il passaggio porta
      const aree = ctx.aree ??= contestoAree();
      const area = m.area_chiave ? aree.aree.get(m.area_chiave) : undefined;
      return { tipo: 'mappa', mappa: { chiave: chiaveMappa(m.chiave), nome: m.nome, tipo: m.tipo, area: area ? { nome: area.nome } : null, casa: casaDellaMappa(m, aree) }, immagine: { url: img ? urlCaricata(img) : null, asset: m.asset } };
    }
    case 'punto': {
      const p = prepared('SELECT p.chiave, p.tipo, p.nome, p.descrizione, p.esauribile, p.area_dedalo_chiave, a.dungeon_chiave, a.chiave AS area_chiave, a.nome AS area_nome FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(chiave) as { chiave: string; tipo: string; nome: string; descrizione: string; esauribile: number; area_dedalo_chiave: string | null; dungeon_chiave: string; area_chiave: string; area_nome: string } | undefined;
      if (!p) return null;
      const base = { chiave: p.chiave, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dungeon: p.dungeon_chiave, area: p.area_chiave, areaDedalo: p.area_dedalo_chiave };
      // L4 (§3.1): una voce dei Palazzi porta carattere, infiltrazione e «da verificare», e lo stato con cui risulta (§8.11: dai suoi
      // pin, con il contatore k/N); le voci dei dedali dei Memento restano come prima (R4-30)
      const l4 = !p.area_dedalo_chiave ? avanzamentoDi(ctx) : null;
      if (l4 && l4.palazziVeri.has(p.dungeon_chiave)) {
        const v = l4.m.voci.get(p.chiave);
        // §8.11: lo stato della voce dai suoi pin (fatta, in corso k/N, da fare), con il contatore
        const sv = l4.s?.voci.get(p.chiave) ?? null;
        return { tipo: 'punto', punto: { ...base, stato: sv?.stato ?? null, carattere: v?.carattere ?? null, infiltrazione: { chiave: p.area_chiave, nome: p.area_nome },
          daVerificare: !!l4.s && [...l4.s.divergenze.values()].some((voci) => voci.includes(p.chiave)),
          avanzamento: sv && sv.totale > 0 ? { fatti: sv.fatti, totale: sv.totale } : null } };
      }
      // una voce descrittiva non ha stato: uno rimasto da prima si ignora, come nella scheda del Palazzo (2026-10-01)
      const stato = partitaId && !puntoDescrittivo(p.tipo, p.area_dedalo_chiave) ? (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, chiave) as { stato: string } | undefined)?.stato ?? null : null;
      return { tipo: 'punto', punto: { ...base, stato } };
    }
    case 'attivita':
    case 'luogo': {
      const l = prepared('SELECT chiave, quartiere_chiave, tipo, nome, cosa_offre FROM luogo WHERE chiave = ?').get(chiave) as { chiave: string; quartiere_chiave: string; tipo: string; nome: string; cosa_offre: string } | undefined;
      if (!l) return null;
      // L5: tutti i negozi della sede (prima solo il primo), ognuno con la sua sezione nella pagina del luogo; `negozio` resta il primo
      const luoghi = luoghiDi(ctx);
      const casa = casaDelLuogo(l.chiave);
      const sedi = luoghi.negozi.get(l.chiave) ?? [];
      const negozio = sedi[0] ? negozioDettaglio(sedi[0].chiave, ctx, chiave) : null;
      const riga = luoghi.righe.get(l.chiave);
      const orari = orariDelLuogo(riga?.orari_json ?? null);
      return { tipo, luogo: { chiave: l.chiave, quartiere: l.quartiere_chiave, tipo: l.tipo, nome: l.nome, cosaOffre: l.cosa_offre, quando: orari.fasce.length === 1 ? orari.fasce[0] : 'entrambe',
        orariTesto: descriviOrariDelLuogo(orari), presenza: presenzaDelLuogo(riga ? condizioniDiSblocco(riga, luoghi.inviti) : [], orari, luoghi.st), casa,
        negozi: sedi.map((n) => ({ chiave: n.chiave, nome: n.nome, casa: `${casa}#negozio-${encodeURIComponent(n.chiave)}` })) }, negozio };
    }
    case 'negozio': {
      const n = negozioDettaglio(chiave, ctx, sedeScelta);
      if (!n) return null;
      const sede = sedeScelta ?? n.sedeChiave ?? null;
      return { tipo: 'negozio', negozio: { ...n, sedeCasa: sede ? `${casaDelLuogo(sede)}#negozio-${encodeURIComponent(n.chiave)}` : null } };
    }
    case 'confidente': {
      const c = prepared('SELECT chiave, nome, arcana FROM confidente WHERE chiave = ?').get(chiave) as { chiave: string; nome: string; arcana: string } | undefined;
      if (!c) return null;
      const caricata = leggiImmagine('confidente', c.chiave);
      return { tipo: 'confidente', confidente: { chiave: c.chiave, nome: c.nome, arcanaNome: t('arcana', c.arcana) }, immagine: { url: caricata ? `/api/immagini/confidente/${encodeURIComponent(c.chiave)}/file` : null, asset: `confidenti/${c.chiave}-fedele` } };
    }
    case 'richiesta': {
      const r = prepared('SELECT chiave, nome FROM richiesta WHERE chiave = ?').get(chiave) as { chiave: string; nome: string } | undefined;
      if (!r) return null;
      const stato = partitaId ? (prepared('SELECT stato FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').get(partitaId, chiave) as { stato: string } | undefined)?.stato ?? null : null;
      return { tipo: 'richiesta', richiesta: { chiave: r.chiave, nome: r.nome, stato } };
    }
    default:
      return null;
  }
}

/** Il negozio nella scheda di uno spillo: disponibilità e articoli (con «comprato» per la partita); null se il negozio non c'è più. */
function negozioDettaglio(chiave: string, ctx: ContestoSpilli, sede?: string): NonNullable<DettaglioSpilloDto['negozio']> | null {
  // lo stato della partita è già nel contesto della risposta: prima ogni pin di negozio lo ricalcolava da capo (rilievo P1);
  // gli acquisti si leggono alla prima occorrenza e restano per gli altri pin
  const partitaId = ctx.partitaId;
  const contesto = { listini: luoghiDi(ctx).listini, ...(partitaId !== undefined && ctx.st ? { st: ctx.st, acquistati: (ctx.acquistati ??= acquistiDellaPartita(partitaId)) } : {}) };
  let n: ReturnType<typeof dettaglioNegozio>;
  try {
    n = dettaglioNegozio(chiave, partitaId, contesto, sede);
  } catch (err) {
    // un pin che cita un negozio tolto resta un pin senza negozio; ogni altro errore (SQL, partita inesistente) deve vedersi
    if (err instanceof HttpError && err.code === 'negozio-non-trovato') return null;
    throw err;
  }
  return { chiave: n.chiave, nome: n.nome, tipo: n.tipo, sedeChiave: n.sedeChiave, disponibilita: n.disponibilita, articoli: n.articoliElenco.map((a) => ({ chiave: a.chiave, nome: a.nomeIt ?? a.nome, categoria: a.categoria, prezzo: a.prezzo, disponibileDal: a.disponibileDal, comprato: a.acquistato, acquisti: a.acquisti, disponibilita: a.disponibilita, catalogo: a.catalogo, costo: a.costo, costoDaVerificare: a.costoDaVerificare, ricevuti: a.ricevuti })) };
}

/** Vero se la tabella `spillo` dello schema corrente ha la colonna `nome` (le colonne aggiunte dalle migrazioni, per esempio
 *  `nativo_json` della 046, possono mancare su un file che non le ha ancora applicate). */
function colonnaSpillo(nome: string): boolean {
  const colonne = getDb().prepare("SELECT name FROM pragma_table_info('spillo')").all() as Array<{ name: string }>;
  return colonne.some((c) => c.name === nome);
}
/** Vero se lo spillo ha già la colonna delle prove native `nativo_json` (migrazione 046). */
function colonnaNativoJson(): boolean { return colonnaSpillo('nativo_json'); }

/** Le prove native dello spillo lette dal JSON; null se non ne ha.
 *
 * Un JSON illeggibile non deve far cadere la mappa: se il campo e' corrotto lo spillo resta,
 * semplicemente senza prove (null). Ma non si inventa un oggetto vuoto al suo posto, perche' «prove
 * assenti» e «prove che non si riescono a leggere» sono due cose diverse.
 */
function nativoDiSpillo(r: RigaSpillo): NativoSpilloDto | null {
  if (!r.nativo_json) return null;
  try { return JSON.parse(r.nativo_json) as NativoSpilloDto; } catch { return null; }
}

/** Le immagini di uno spillo in ordine: l'URL solo se l'immagine caricata esiste davvero, altrimenti resta l'eventuale asset. */
function immaginiDiSpillo(spilloId: number): ImmagineSpilloDto[] {
  return (prepared('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(spilloId) as RigaImmagineSpillo[]).map((i) => ({
    id: i.id, url: i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave) ? `/api/immagini/spillo/${encodeURIComponent(i.immagine_chiave)}/file` : null, asset: i.asset, didascalia: i.didascalia, ordine: i.ordine,
  }));
}

/** Contesto comune agli spilli di una risposta: partita, stato per le condizioni, nomi per le descrizioni (il segno dei pin lo legge `statoDelPin`). */
interface ContestoSpilli { partitaId?: number; st?: StatoDisponibilita | null; nomi?: NomiCondizioni; palazzi?: Map<string, string>; destinazioni?: Map<number, string>; acquistati?: Set<string>;
  /** Le Aree (L2), lette al primo pin che porta a una mappa e poi riusate. */
  aree?: ContestoAree;
  /** L4: il modello dell'avanzamento, gli stati della partita (null senza), l'infiltrazione guardata (`?infiltrazione=`, null = quella
   *  in corso) e i Palazzi veri (i Memento esclusi: le loro risposte restano quelle di prima, R4-30). Letti al primo uso. */
  l4?: AvanzamentoSpilli;
  /** L4: l'infiltrazione guardata, data da chi chiama. */
  contesto?: string | null;
  /** L5: le letture dei luoghi (presenza, sedi dei negozi), fatte al primo pin che ne ha bisogno e poi riusate. */
  luoghi?: LettureLuoghi }

/** L5: le letture dei luoghi del contesto, una volta per risposta (con lo stato della partita già calcolato). */
function luoghiDi(ctx: ContestoSpilli): LettureLuoghi {
  return ctx.luoghi ??= lettureLuoghi(ctx.partitaId, undefined, ctx.st ?? null);
}

/**
 * L5 (§2): la presenza del luogo di un pin come requisito di visibilità. Un luogo non ancora sbloccato o chiuso adesso è nascosto dove si
 * naviga (decisione dell'utente: «luogo chiuso va nascosto dal menu di navigazione»), e un luogo solo per gli eventi di un Confidente sempre;
 * lo spillo chiesto dall'indirizzo il visore lo mostra lo stesso, evidenziato col motivo. Senza partita niente da aggiungere.
 */
function conPresenzaDelLuogo(esito: DisponibilitaDto | undefined, lp: LuogoDelPin, ctx: ContestoSpilli): DisponibilitaDto | undefined {
  if (!ctx.st) return esito;
  return conPresenzaPin(esito, lp.presenza, lp.luogo.nome, lp.soloEventi ? luoghiDi(ctx).nomiConfidenti.get(lp.soloEventi) ?? lp.soloEventi : null);
}
interface AvanzamentoSpilli { m: ModelloAvanzamento; s: StatiDellaPartita | null; contesto: string | null; palazziVeri: Set<string>; mappePalazzo: Map<string, string> }

/** Il modello di L4 del contesto, letto una volta per risposta. */
function avanzamentoDi(ctx: ContestoSpilli): AvanzamentoSpilli {
  if (ctx.l4) return ctx.l4;
  const m = modelloAvanzamento(getDb());
  const palazziVeri = new Set(prepared("SELECT chiave FROM dungeon WHERE tipo = 'palazzo'").pluck().all() as string[]);
  const mappePalazzo = new Map([...palazzoDiOgniMappa()].filter(([, d]) => palazziVeri.has(d)));
  ctx.l4 = { m, s: ctx.partitaId ? statiDellaPartita(getDb(), m, ctx.partitaId) : null, contesto: ctx.contesto ?? null, palazziVeri, mappePalazzo };
  return ctx.l4;
}

/** Il contesto degli spilli di una risposta, letto una volta: la partita verificata, i suoi «raccolto» (per uid), lo stato per
 *  le condizioni, i nomi (Confidenti, quartieri, richieste, Palazzi) per descriverle e, solo se ci sono Palazzi completati, il
 *  Palazzo di ogni mappa e le destinazioni degli spilli, per chiudere gli ingressi. */
function contestoSpilli(partitaId?: number, contesto: string | null = null): ContestoSpilli {
  if (partitaId) verificaPartita(partitaId);
  const st = partitaId ? statoDisponibilitaPartita(partitaId) : null;
  // per gli ingressi dei Palazzi conclusi: le mappe di ogni Palazzo e le destinazioni degli spilli, lette una volta
  const destinazioni = st && st.palazziConclusi.size > 0 && prepared("SELECT 1 FROM sqlite_master WHERE name='spillo_destinazione'").get()
    ? new Map((prepared('SELECT spillo_id, mappa_chiave FROM spillo_destinazione WHERE mappa_chiave IS NOT NULL').all() as Array<{ spillo_id: number; mappa_chiave: string }>).map((d) => [d.spillo_id, d.mappa_chiave]))
    : undefined;
  return { partitaId, st, nomi: nomiCondizioni(), palazzi: st && st.palazziConclusi.size > 0 ? palazzoDiOgniMappa() : undefined, destinazioni, contesto };
}

/**
 * Un Palazzo concluso non ha più ingresso (scelta dell'utente, 2026-09-30: «sparisce a Palazzo completato», come nel gioco; dal
 * 2026-10-20 il livello è «concluso», Tesoro e boss finale, §8.10: il Palazzo sparisce dopo il furto, non dopo la raccolta completa):
 * lo spillo che da fuori porta dentro — l'ingresso dalla città, il passaggio da Tokyo — risulta bloccato, anche prima della
 * scadenza. Si valuta qui, sul collegamento, e non con una condizione scritta sullo spillo: così vale anche per gli ingressi
 * aggiunti o modificati a mano e sopravvive a ogni sincronizzazione.
 */
function senzaIngressoAPalazzoConcluso(esito: DisponibilitaDto | undefined, r: RigaSpillo, ctx: ContestoSpilli): DisponibilitaDto | undefined {
  if (!esito || !ctx.st || !ctx.palazzi) return esito;
  const dungeon = palazzoDiIngresso(r, ctx.destinazioni?.get(r.id) ?? null, ctx.palazzi);
  const perche = dungeon ? ctx.st.palazziConclusi.get(dungeon) : undefined;
  if (!dungeon || !perche) return esito;
  const nome = (ctx.nomi ?? nomiCondizioni()).dungeon?.[dungeon] ?? dungeon;
  return senzaIngressoConcluso(esito, nome, perche);
}

/** Condizioni salvate nello spillo (JSON) → elenco normalizzato; un JSON rovinato vale come nessuna condizione. */
function condizioniDiRiga(json: string | null): RequisitoSpillo[] {
  return leggiCondizioniSalvate(json);
}

/** Le condizioni come vanno salvate: normalizzate e in JSON, oppure null se non ne resta nessuna. */
function jsonCondizioni(condizioni: RequisitoSpillo[] | null | undefined): string | null {
  const pulite = normalizzaCondizioniSpillo(condizioni ?? []);
  return pulite.length > 0 ? JSON.stringify(pulite) : null;
}

/** Identità di uno spillo del seed com'era nel pacchetto (tipo, nome, posizione, riferimento): dopo una modifica dell'utente serve a riconoscerlo al reseed. */
function identitaSpillo(s: { tipo: string; nome: string; x: number; y: number; riferimento: { tipo: string; chiave: string } | null }): string {
  return JSON.stringify({ tipo: s.tipo, nome: s.nome, x: s.x, y: s.y, riferimento: s.riferimento ? { tipo: s.riferimento.tipo, chiave: s.riferimento.chiave } : null });
}

/** Il pin di un negozio vale quanto il negozio, **adesso**.
 *
 * Uno spillo porta le sue condizioni, copiate nel database quando l'atlante è stato sincronizzato.
 * Un negozio le sue, che vivono nel catalogo e cambiano quando il catalogo cambia. Fidarsi della
 * sola copia vuol dire che ogni modifica al negozio lascia dietro un pin che dice una cosa non più
 * vera, e nessuno se ne accorge finché non è tardi: è il *drift* che ha segnalato Codex.
 *
 * Quindi i due esiti si combinano in **AND**, che è l'unica combinazione sensata: se il negozio
 * oggi non c'è, non c'è nemmeno il suo pin, qualunque cosa dica la copia; e se il pin ha una
 * condizione propria che non regge — è di sera, e adesso è giorno — non basta che il negozio
 * esista. L'OR resta dove è sempre stato, cioè **dentro** un gruppo `almeno-una`, che è la forma
 * delle alternative («o il libro, o l'invito del 3 agosto»).
 *
 * I motivi si sommano invece di sostituirsi: chi apre il pin deve leggere tutte e due le ragioni,
 * non l'ultima che ha vinto.
 */
function conNegozioVivo(esito: DisponibilitaDto | undefined, dettaglio: DettaglioSpilloDto | null): DisponibilitaDto | undefined {
  // Non si guarda `dettaglio.tipo`, e non è un dettaglio: **nessun pin punta a un negozio**. I
  // trentasei pin dei negozi puntano a un `luogo`, e il negozio è agganciato lì da
  // `dettaglioRiferimento`. Cercandolo per tipo, questa funzione non avrebbe fatto niente su
  // nessuno spillo dell'atlante — e sarebbe passata verde, perché non rompere non è funzionare.
  const negozio = dettaglio?.negozio?.disponibilita;
  return conDisponibilitaNegozio(esito, negozio);
}

type DettagliSpillo = Omit<SpilloDto, 'mappaChiave' | 'x' | 'y' | 'destinazione' | 'destinazioneNonDisponibile'>;
/**
 * Tutto quello che uno spillo dice di sé, tranne posizione e destinazione: dettaglio del riferimento, voce della guida,
 * «raccolto» (anche quando la voce collegata ha già uno stato), condizioni con il loro testo e, con la partita, la
 * disponibilità — combinata con quella del negozio e bloccata
 * per l'ingresso di un Palazzo completato. Un pin «solo posizione» disponibile non porta la disponibilità.
 */
function dettagliSpillo(r: RigaSpillo, ctx: ContestoSpilli = {}): DettagliSpillo {
  const lp = r.riferimento_tipo === 'luogo' || r.riferimento_tipo === 'negozio' || r.riferimento_tipo === 'attivita' ? luogoDelPin(r, luoghiDi(ctx)) : null;
  const dettaglio = dettaglioRiferimento(r.riferimento_tipo, r.riferimento_chiave, ctx, lp?.luogo.chiave);
  // le voci della guida del pin (098): le sue righe di `spillo_voce`, o il riferimento «punto» degli elementi senza mappa di prima
  const voci = vociDelPin(r.id).flatMap((chiave) => {
    const v = dettaglio?.tipo === 'punto' && dettaglio.punto?.chiave === chiave ? dettaglio.punto : (dettaglioRiferimento('punto', chiave, ctx)?.punto ?? null);
    return v ? [v] : [];
  });
  // L4 (§0): lo stato del pin dalla regola unica `statoDelPin` — con voci che contano, fatto quando sono fatte le sue voci (per le
  // rigenerabili di più infiltrazioni, quelle del contesto); senza, il suo stato; i pin dei dedali con la regola di prima. Prima era
  // l'«OR» fra il segno del pin e le voci tutte gestite, che lasciava fatto un pin con le voci aperte.
  let raccolto = false;
  let campiL4: Pick<SpilloDto, 'contestoInfiltrazione' | 'daVerificare' | 'statoProprio'> = {};
  if (ctx.partitaId) {
    const l4 = avanzamentoDi(ctx);
    const stato = statoDelPin(l4.m, l4.s!, { id: r.id, uid: r.uid }, l4.contesto);
    raccolto = stato.fatto;
    // i campi di L4 solo per i pin dei Palazzi (sulle loro planimetrie o con loro voci): le altre risposte restano quelle di prima
    const delPalazzo = (r.mappa_chiave !== null && l4.mappePalazzo.has(r.mappa_chiave)) || voci.some((v) => l4.palazziVeri.has(v.dungeon) && !v.areaDedalo);
    if (delPalazzo) campiL4 = { contestoInfiltrazione: stato.contesto ? { chiave: stato.contesto, nome: l4.m.infiltrazioni.get(stato.contesto)?.nome ?? stato.contesto } : null, daVerificare: stato.daVerificare, statoProprio: stato.statoProprio };
  }
  const nomi = ctx.nomi ?? nomiCondizioni();
  const condizioni: CondizioneSpilloDto[] = condizioniDiRiga(r.condizioni_json).map((c) => condizioneConTesto(c, nomi));
  // con la partita ogni condizione ha il suo semaforo: rosso ⇒ lo spillo è nascosto sulla mappa. La chiave della richiesta la
  // traduce nel nome il valutatore stesso (`valutaRequisito`): tradurla anche qui era un secondo passaggio inutile (rilievo R6).
  // L5: un pin di luogo (o di un negozio con sede) vale quanto il luogo adesso, con la presenza unica; gli altri pin di negozio (senza sede)
  // restano con gli orari del negozio (`conNegozioVivo`)
  const valutate = ctx.st ? valutaRequisitiSpillo(condizioni, ctx.st, nomi) : undefined;
  const esitoCondizioni = lp ? conPresenzaDelLuogo(valutate, lp, ctx) : conNegozioVivo(valutate, dettaglio);
  // Una condizione di visibilità è **assoluta** (decisione dell'utente, 2026-10-09: «se ci sta una condizione di visibilità
  // questa deve essere assoluta»): se non vale il pin sparisce, anche quando è un elemento del gioco nativo (porta, forziere,
  // infiltrazione…). Prima questi restavano in vista marcati «non ancora» (`restaInVista`, 2026-10-03): tolto. L'ingresso a un
  // Palazzo completato sparisce come nel gioco e si valuta dopo, sull'esito già deciso.
  // le prove native si leggono una volta (prima tre: rilievo P8)
  const nativo = nativoDiSpillo(r);
  const esitoVisibilita = senzaIngressoAPalazzoConcluso(esitoCondizioni, r, ctx);
  const disponibilita = r.solo_posizione === 1 && esitoVisibilita?.stato === 'disponibile' ? undefined : esitoVisibilita;
  return {
    id: r.id, ...(r.uid ? { uid: r.uid } : {}), tipo: r.tipo, tipoNome: DEFINIZIONI_SPILLO[r.tipo]?.nome ?? r.tipo, colore: DEFINIZIONI_SPILLO[r.tipo]?.colore ?? '#888',
    // L5: un pin di luogo mostra nome e descrizione del luogo; i suoi, se diversi, restano come nota del pin (mai persi)
    nome: lp ? lp.nome : r.nome, descrizione: lp ? lp.descrizione : r.descrizione,
    ...(lp ? { notaPin: lp.notaPin, presenza: lp.presenza } : {}),
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_tipo==='mappa'?chiaveMappa(r.riferimento_chiave):r.riferimento_chiave } : null,
    soloPosizione: r.solo_posizione === 1, collezionabile: r.collezionabile === 1, ...(nativo ? { nativo } : {}), condizioni, ...(disponibilita ? { disponibilita } : {}), ordine: r.ordine, origine: r.origine, raccolto, ...campiL4, dettaglio, voci, immagini: immaginiDiSpillo(r.id), updatedAt: r.updated_at,
  };
}

/**
 * Uno spillo di una mappa per l'API: i dettagli, la destinazione con i nomi di mappa e spillo d'arrivo (per «Vai: …») e la
 * posizione. 409 per un elemento della guida senza mappa, che una posizione non ce l'ha.
 */
function spilloDto(r: RigaSpillo, ctx: ContestoSpilli = {}): SpilloDto {
  if(!r.mappa_chiave)throw httpErrors.conflict('contenuto-guida','Il contenuto non ha una posizione geografica.');
  const arrivo = leggiDestinazioneSpillo(r.id);
  // i nomi della mappa e dello spillo d'arrivo, per il pulsante «Vai: …» senza un'altra chiamata
  const nomi = arrivo.destinazione ? {
    mappa: (prepared('SELECT nome FROM mappa WHERE chiave = ?').get(idMappa(arrivo.destinazione.mappa)) as { nome: string } | undefined)?.nome ?? arrivo.destinazione.mappa,
    spillo: arrivo.destinazione.spillo ? ((prepared('SELECT nome FROM spillo WHERE id = ?').get(arrivo.destinazione.spillo) as { nome: string } | undefined)?.nome ?? null) : null,
  } : undefined;
  return { ...dettagliSpillo(r,ctx), ...arrivo, ...(nomi ? { destinazioneNomi: nomi } : {}), mappaChiave:chiaveMappa(r.mappa_chiave),x:r.x,y:r.y };
}
/** Uno spillo qualunque: scheda della guida (con l'area) se è un elemento della guida senza mappa, altrimenti spillo con posizione. */
function elementoSpilloDto(r:RigaSpillo,ctx:ContestoSpilli={}):SpilloDto|SchedaContenutoGuidaDto {
  return r.area_guida_chiave?{...dettagliSpillo(r,ctx),areaGuida:r.area_guida_chiave}:spilloDto(r,ctx);
}
/**
 * Le schede degli elementi della guida (spilli senza mappa) delle aree date, per id. Prima si calcolavano quelle di tutte le aree
 * (187 elementi, con le loro condizioni) per ogni mappa aperta, che ne mostra una o due (rilievo P4 della verifica, 2026-10-03).
 */
export function schedeContenutiGuida(partitaId: number | undefined, aree: readonly string[]): Map<number, SchedaContenutoGuidaDto> {
  // senza aree niente da descrivere: lo stato della partita (il pezzo costoso) non serve. La partita la verifica chi chiama.
  if (aree.length === 0) return new Map();
  const ctx = contestoSpilli(partitaId);
  const righe = prepared(`SELECT * FROM spillo WHERE area_guida_chiave IN (${aree.map(() => '?').join(',')}) ORDER BY id`).all(...aree) as RigaSpillo[];
  return new Map(righe.map((r) => [r.id, { ...dettagliSpillo(r, ctx), areaGuida: r.area_guida_chiave! }]));
}

/**
 * Gli spilli di altre mappe che portano su questa.
 *
 * Il collegamento è scritto in due posti, e vanno letti tutti e due: la destinazione vera
 * (`spillo_destinazione`, che può puntare anche a uno spillo preciso) e il riferimento `mappa`,
 * che i passaggi più vecchi usano come ripiego. Uno spillo che ha entrambi conta una volta sola.
 */
function arriviVerso(chiave: string): MappaDto['arrivi'] {
  const righe = prepared(`SELECT s.id, s.tipo, s.nome, s.mappa_chiave, m.nome AS mappa_nome
    FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave
    WHERE s.mappa_chiave <> ?
      AND (( s.riferimento_tipo = 'mappa' AND s.riferimento_chiave = ? )
        OR s.id IN (SELECT spillo_id FROM spillo_destinazione WHERE mappa_chiave = ?))
    ORDER BY m.nome, s.ordine, s.id`).all(chiave, chiave, chiave) as Array<{ id: number; tipo: TipoSpillo; nome: string; mappa_chiave: string; mappa_nome: string }>;
  return righe.map((r) => ({ spilloId: r.id, tipo: r.tipo, nome: r.nome, mappa: chiaveMappa(r.mappa_chiave), mappaNome: r.mappa_nome }));
}

/** Mappa con percorso, figli, spilli (con stato della partita e dettagli delle entità collegate). `contesto` (L4, `?infiltrazione=`):
 *  l'infiltrazione guardata, per lo stato dei pin di rigenerabili di più infiltrazioni (§1.4); null = quella in corso. */
export function dettaglioMappa(chiave: string, partitaId?: number, contesto: string | null = null): MappaDto {
  const r = rigaMappa(chiave);
  chiave = r.chiave;
  const mappe = contestoMappe();
  // gli stessi figli che i conteggi contano (senza il nodo dei Memento, tolto dall'albero): Tokyo diceva 24 luoghi e ne elencava 25.
  // A pari ordine decide la chiave, come nella scheda del Palazzo e nel riordino.
  const figli = (prepared("SELECT * FROM mappa WHERE genitore_chiave = ? AND chiave <> 'citta-mementos' ORDER BY ordine, chiave").all(chiave) as RigaMappa[])
    .filter((f) => !f.area_chiave || areaDisponibilePerPartita(mappe.aree.aree.get(f.area_chiave) ?? { quartiere_chiave: null }, partitaId))
    .map((f) => riassunto(f, mappe));
  const ctx = { ...contestoSpilli(partitaId, contesto), aree: mappe.aree };
  const spilli = (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(chiave) as RigaSpillo[]).map((s) => spilloDto(s, ctx));
  return {
    ...riassunto(r, mappe), larghezza: r.larghezza, altezza: r.altezza, note: r.note,
    percorso: percorsoDi(r, mappe.aree).map(p=>({...p,chiave:chiaveMappa(p.chiave)})), figli, spilli, arrivi: arriviVerso(chiave),
    // i pezzi (102) con le loro copie (103): con la partita ogni copia porta l'esito delle sue condizioni, come i pin
    pezzi: pezziDellaMappa(chiave, ctx.nomi ?? nomiCondizioni(), ctx.st),
    // dai nomi già letti nel contesto: prima una query in più (P8)
    genitoreNome: r.genitore_chiave ? mappe.nomi.get(r.genitore_chiave) ?? null : null,
  };
}

// ---- Editor ----

/** `passaggio`/`ritorno` (15.24) valgono solo alla creazione con un genitore: passaggio nel genitore verso la nuova mappa e viceversa. */
export interface DatiMappa { nome?: string; tipo?: TipoMappa; genitore?: string | null; ordine?: number; asset?: string | null; larghezza?: number | null; altezza?: number | null; entita?: { tipo: 'area'; chiave: string } | null; note?: string; passaggio?: boolean; ritorno?: boolean }

/** Primi segmenti letterali delle rotte di `/api/mappe` (`routes/mappe.ts`): una mappa con una di queste chiavi verrebbe oscurata
 *  dalla rotta omonima (`GET /api/mappe/albero` non arriverebbe mai alla mappa «albero»). `struttura-server.test.ts` verifica che
 *  l'elenco copra tutte le rotte del router. */
export const CHIAVI_MAPPA_RISERVATE: ReadonlySet<string> = new Set([
  'accesso', 'albero', 'contenuti', 'entita', 'esporta', 'gerarchia', 'importa', 'ordine', 'piante-citta',
  'pezzi', 'riferimenti', 'risolvi', 'spilli',
]);

/** Una chiave di mappa ammessa: minuscole, cifre e trattini (non all'inizio), al massimo 180 caratteri, non riservata alle rotte. */
const chiaveValida = (chiave: string): boolean => /^[a-z0-9][a-z0-9-]{0,179}$/.test(chiave) && !CHIAVI_MAPPA_RISERVATE.has(chiave);

/**
 * Un'area si lega solo a una planimetria **del suo Palazzo**: una planimetria di Kamoshida con un'area di
 * Madarame comparirebbe in un Palazzo senza quell'area e nell'altro sotto un'area che non la contiene.
 * La radice del Palazzo non è una planimetria (non compare nell'elenco): non si lega.
 */
function verificaAreePalazzo(genitore: string | null, aree: string[]): void {
  if (!aree.length) return;
  const palazzo = palazzoDellaMappa(genitore);
  if (!palazzo) throw httpErrors.badRequest('mappa-fuori-palazzo', 'Le infiltrazioni si legano solo alle planimetrie di un Palazzo.');
  const segnaposti = aree.map(() => '?').join(',');
  const trovate = prepared(`SELECT chiave, dungeon_chiave FROM dungeon_area WHERE chiave IN (${segnaposti})`).all(...aree) as Array<{ chiave: string; dungeon_chiave: string }>;
  const mancanti = aree.filter((a) => !trovate.some((t) => t.chiave === a));
  if (mancanti.length) throw httpErrors.badRequest('area-inesistente', `Infiltrazione inesistente: ${mancanti.join(', ')}.`);
  const altrove = trovate.filter((t) => t.dungeon_chiave !== palazzo);
  if (altrove.length) throw httpErrors.badRequest('area-di-altro-palazzo', `Infiltrazione di un altro Palazzo: ${altrove.map((t) => t.chiave).join(', ')}.`);
}

// `staccaAreaDaOgniMappa` (eliminazione di un'infiltrazione) è uscita con L3: i legami stanno in `infiltrazione_area` e se ne vanno
// con l'infiltrazione (`dungeonService.eliminaAreaInTransazione`); `mappa_entita` e le colonne `mappa.entita_*` sono state tolte da L11 · B9.

/**
 * Per il pacchetto delle mappe: le infiltrazioni contenute (chiavi, in ordine di guida), solo se ce ne sono. Da L3 sono quelle
 * dell'Area della planimetria (§2.3: il campo vecchio si continua a scrivere per i lettori di pacchetti di prima; i legami veri
 * viaggiano in `legami`).
 */
function areePerPacchetto(mappa: string, perMappa?: ReadonlyMap<string, ReadonlyArray<{ chiave: string }>>): { aree?: string[] } {
  if (!conLegami()) return {};
  const aree = (perMappa?.get(mappa) ?? infiltrazioniDellaMappa(mappa)).map((a) => a.chiave);
  return aree.length ? { aree } : {};
}

/**
 * L'ordine logico delle mappe di un sottoalbero, riscritto tutto insieme: è il riordino per
 * trascinamento della scheda del Palazzo.
 *
 * L'elenco che arriva è **piatto** — la scheda mostra tutte le planimetrie del Palazzo, anche le
 * nipoti — mentre l'ordine è un fatto fra sorelle: ogni mappa vale rispetto alle figlie dello
 * stesso genitore. Perciò le chiavi si raggruppano per il genitore che hanno davvero e ogni gruppo
 * si riscrive da 0; le sorelle non elencate restano in coda nell'ordine che avevano. Si accetta
 * qualunque discendente di `genitore` (e `genitore` stesso conta come radice del sottoalbero).
 */
/**
 * Riscrive l'ordine delle mappe elencate (riordino per trascinamento): le chiavi si raggruppano per genitore effettivo, ogni
 * gruppo di sorelle si numera da 0 con le scelte in testa e le non elencate in coda, in una transazione. Con `genitore` le
 * chiavi devono stare nel suo sottoalbero (400 altrimenti). Restituisce i riassunti di tutte le mappe rinumerate.
 */
export function riordinaMappe(genitore: string | null, chiavi: string[]): MappaRiassuntoDto[] {
  const radice = genitore === null ? null : rigaMappa(genitore).chiave;
  // le discendenti del genitore (lui escluso): il sottoalbero si legge una volta, non risalendo da ogni chiave
  const sotto = radice === null ? null : sottoalberoMappe([radice]);
  /** Vero se la mappa è una discendente del genitore (sempre vero senza genitore). */
  const nelSottoalbero = (chiave: string): boolean => sotto === null || (chiave !== radice && sotto.has(chiave));
  // per genitore effettivo: le chiavi scelte, nell'ordine in cui sono arrivate
  const perGenitore = new Map<string | null, string[]>();
  for (const k of chiavi) {
    const riga = rigaMappa(k);
    if (!nelSottoalbero(riga.chiave)) throw httpErrors.badRequest('mappa-fuori-dal-genitore', `La mappa '${k}' non sta sotto ${radice ?? 'nessuna mappa'}.`);
    const scelte = perGenitore.get(riga.genitore_chiave) ?? [];
    if (!scelte.includes(riga.chiave)) scelte.push(riga.chiave);
    perGenitore.set(riga.genitore_chiave, scelte);
  }
  const toccate: string[] = [];
  const adesso = nowIso();
  getDb().transaction(() => {
    for (const [padre, scelte] of perGenitore) {
      const sorelle = (padre === null
        ? prepared('SELECT chiave FROM mappa WHERE genitore_chiave IS NULL ORDER BY ordine, chiave').all()
        : prepared('SELECT chiave FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, chiave').all(padre)) as Array<{ chiave: string }>;
      const finale = [...scelte, ...sorelle.map((f) => f.chiave).filter((c) => !scelte.includes(c))];
      finale.forEach((c, i) => prepared('UPDATE mappa SET ordine = ?, updated_at = ? WHERE chiave = ?').run(i, adesso, c));
      toccate.push(...finale);
    }
  })();
  const ctx = contestoMappe();
  return toccate.map((c) => riassunto(rigaMappa(c), ctx));
}

/**
 * Crea una mappa dall'editor. La chiave si ricava dal nome (preceduto da quella del genitore, salvo sotto una città) e deve
 * essere valida, non riservata e libera; una chiave richiesta diversa resta come alias. In una transazione: la riga
 * (origine «utente», asset predefinito se non indicato), i percorsi, il legame con l'entità e, se chiesti, il passaggio
 * dal genitore e quello di ritorno.
 */
export function creaMappa(chiave: string | undefined, dati: DatiMappa & { nome: string; tipo: TipoMappa }, opz: { dallArea?: boolean } = {}): MappaDto {
  // il genitore si legge una volta sola (rilievo R7): la lettura ne verifica l'esistenza (404) e dà chiave interna e tipo
  const genitore = dati.genitore ? rigaMappa(dati.genitore) : null;
  if (genitore) dati = { ...dati, genitore: genitore.chiave };
  // L2 (§2.3, R2-11): nel mondo una planimetria nasce dentro un'Area, dalla pagina dell'Area o del quartiere (`areeService`, che passa
  // `dallArea`); dall'editor una mappa `luogo`/`area` sotto Tokyo o un quartiere (o una sua discendente) tornerebbe una zona sciolta.
  // L3 (§2.3, R3-26): lo stesso nei Palazzi — sotto `dungeon-<k>` (o una sua discendente), di qualunque tipo, una mappa nasce solo come
  // planimetria di un'Area («Aggiungi area» / «Aggiungi planimetria» della scheda); i Memento no (R3-12). Restano ammesse le generiche
  // fuori dai Palazzi e le importazioni.
  if (!opz.dallArea && genitore && conAree() && (dati.tipo === 'luogo' || dati.tipo === 'area') && nelMondo(genitore.chiave)) {
    throw httpErrors.conflict('usa-aggiungi-area', 'Nel mondo le planimetrie si aggiungono dalla pagina dell’area (o del quartiere, con «Aggiungi area»).');
  }
  const palazzoDelGenitore = genitore ? palazzoDellaMappa(genitore.chiave) : null;
  if (!opz.dallArea && palazzoDelGenitore && palazzoDelGenitore !== 'mementos' && conAree()) {
    throw httpErrors.conflict('usa-aggiungi-area', 'Nei Palazzi le planimetrie si aggiungono dalla scheda del Palazzo: «Aggiungi area», o «Aggiungi planimetria» in un’area.');
  }
  const richiesta = chiave;
  if (richiesta && prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(idMappa(richiesta))) throw httpErrors.conflict('mappa-esistente', 'La chiave indicata appartiene già a una mappa.');
  chiave = (genitore && genitore.tipo !== 'citta' ? chiaveMappa(genitore.chiave) + '-' : '') + slug(dati.nome);
  if (CHIAVI_MAPPA_RISERVATE.has(chiave)) throw httpErrors.badRequest('chiave-riservata', `Il nome «${dati.nome}» darebbe alla mappa la chiave '${chiave}', riservata alle funzioni dell'app: scegline un altro.`);
  if (!chiaveValida(chiave)) throw httpErrors.badRequest('chiave-non-valida', 'La chiave della mappa ammette solo minuscole, cifre e trattini (1–180 caratteri).');
  if (prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(chiave)) throw httpErrors.conflict('mappa-esistente', `Esiste già una mappa con chiave '${chiave}'.`);
  if (!(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  if (dati.entita?.tipo === 'area') verificaAreePalazzo(dati.genitore ?? null, [dati.entita.chiave]);
  const adesso = nowIso();
  // Senza indicazione l'asset è quello predefinito `mappe/<chiave>` (15.25) **solo se esiste** nella grafica predefinita del database;
  // altrimenti nessuno (L1, F9 del validatore): prima si scriveva sempre, per convenzione, un asset che di norma non c'era — dalla
  // 079 la grafica sta nel database, nessun file «verrà consegnato» in public/asset — e restava nei dati come immagine fantasma.
  // `asset: null` esplicito resta «nessun asset»; un valore esplicito si conserva com'è (lo dichiara chi crea la mappa).
  const asset = dati.asset === undefined ? assetEsistente(assetPredefinitoMappa(chiave)) : dati.asset;
  getDb().transaction(() => {
    prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, origine, note, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 'utente', ?, ?)`).run(chiave, dati.nome, dati.tipo, dati.genitore ?? null, dati.ordine ?? 0, asset, dati.larghezza ?? null, dati.altezza ?? null, dati.note ?? '', adesso);
    sincronizzaPercorsiMappe(getDb());
    // il ruolo dell'immagine segue il posto nella gerarchia (L1): una mappa nata con un asset che esiste ha già la sua immagine
    allineaRuoliImmagine(getDb(), chiave);
    if (richiesta && richiesta !== chiave && !prepared('SELECT 1 FROM mappa_alias WHERE chiave = ?').get(richiesta)) prepared('INSERT INTO mappa_alias VALUES (?, ?)').run(richiesta, chiave);
    // 15.24: la nuova mappa nasce già raggiungibile dal genitore (e, se richiesto, con la via del ritorno); una chiave riusata dopo una
    // cancellazione può avere ancora un vecchio passaggio verso di sé: in quel caso non se ne crea un secondo.
    if (dati.genitore && dati.passaggio && !passaggioEsistente(dati.genitore, chiave)) creaPassaggio(dati.genitore, chiave);
    if (dati.genitore && dati.ritorno) creaPassaggio(chiave, dati.genitore);
  })();
  return dettaglioMappa(chiave);
}

/** Uno spillo di `mappa` che porta a `destinazione` (passaggio, stazione o altro tipo con riferimento a quella mappa). */
function passaggioEsistente(mappa: string, destinazione: string): boolean {
  return !!prepared("SELECT 1 FROM spillo WHERE mappa_chiave = ? AND riferimento_tipo = 'mappa' AND riferimento_chiave = ? LIMIT 1").get(mappa, destinazione);
}

/**
 * Punto libero della mappa più vicino a quello preferito: libero = nessuno spillo entro 5 punti percentuali su entrambi gli assi
 * (gli spilli si sovrapporrebbero e il nuovo non si potrebbe afferrare). Si provano il punto preferito e poi una griglia a passo 8
 * in ordine di distanza; se la mappa è satura si torna al punto preferito.
 */
function posizioneLibera(mappa: string, preferita: [number, number]): [number, number] {
  const occupate = prepared('SELECT x, y FROM spillo WHERE mappa_chiave = ?').all(mappa) as Array<{ x: number; y: number }>;
  /** Vero se nessuno spillo sta entro 5 punti su entrambi gli assi. */
  const libera = ([x, y]: [number, number]) => occupate.every((o) => Math.abs(o.x - x) >= 5 || Math.abs(o.y - y) >= 5);
  if (libera(preferita)) return preferita;
  const candidati: Array<[number, number]> = [];
  for (let x = 10; x <= 90; x += 8) for (let y = 10; y <= 90; y += 8) candidati.push([x, y]);
  /** Quadrato della distanza dal punto preferito (basta per ordinare). */
  const distanza = ([x, y]: [number, number]) => (x - preferita[0]) ** 2 + (y - preferita[1]) ** 2;
  candidati.sort((a, b) => distanza(a) - distanza(b));
  return candidati.find(libera) ?? preferita;
}

/**
 * Spillo «passaggio» da `mappa` verso `destinazione` (15.24), creato dall'albero dell'editor senza toccare la mappa: prende il nome
 * della destinazione e un punto libero — al centro, oppure in basso al centro se la destinazione è il genitore (la via del ritorno,
 * di solito l'uscita). Poi si trascina dove sta davvero l'ingresso. 409 se la mappa ha già uno spillo verso quella destinazione.
 */
export function creaPassaggio(mappa: string, destinazione: string): SpilloDto {
  const r = rigaMappa(mappa);
  const dest = rigaMappa(destinazione);
  mappa=r.chiave;destinazione=dest.chiave;
  if (mappa === destinazione) throw httpErrors.badRequest('passaggio-non-valido', 'Una mappa non può avere un passaggio verso sé stessa.');
  if (passaggioEsistente(mappa, destinazione)) throw httpErrors.conflict('passaggio-esistente', `«${r.nome}» ha già uno spillo verso «${dest.nome}».`);
  const [x, y] = posizioneLibera(mappa, destinazione === r.genitore_chiave ? [50, 92] : [50, 50]);
  return creaSpillo(mappa, { tipo: 'passaggio', nome: dest.nome, x, y, riferimento: { tipo: 'mappa', chiave: destinazione } });
}

/**
 * Aggiorna una mappa dall'editor: i campi assenti restano. Il genitore non può essere la mappa stessa né una sua discendente;
 * spostandola, le aree sue e delle discendenti devono restare del Palazzo di arrivo. Il salvataggio segna il nome come
 * rivisto e, se la mappa che cambia nome dà il titolo alla sua stanza, fissa prima quel titolo. In transazione si scrivono
 * la riga, il legame con l'entità e i percorsi.
 */
export function aggiornaMappa(chiave: string, dati: DatiMappa): MappaDto {
  const r = rigaMappa(chiave);
  chiave=r.chiave;
  if(dati.genitore)dati={...dati,genitore:rigaMappa(dati.genitore).chiave};
  if (dati.genitore) {
    if (dati.genitore === chiave) throw httpErrors.badRequest('genitore-non-valido', 'Una mappa non può essere genitore di sé stessa.');
    const g = rigaMappa(dati.genitore);
    if (percorsoDi(g).some((p) => p.chiave === chiave)) throw httpErrors.badRequest('genitore-non-valido', 'Il genitore scelto è un discendente di questa mappa.');
  }
  if (dati.tipo && !(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  // FUN2-8 (giro 2 di L2, R2-27): dall'editor una mappa senza Area non entra nel mondo come planimetria — spostarla sotto Tokyo o un
  // quartiere (o una sua discendente), o renderla `luogo`/`area` lì, la lascerebbe una zona sciolta fra le «da collocare»: la stessa
  // regola di `creaMappa`. Le generiche del mondo restano ammesse; per i Palazzi la regola di L3 qui sotto, i Memento non cambiano.
  const tipoDopo = dati.tipo ?? r.tipo;
  const genitoreNuovo = dati.genitore === undefined ? r.genitore_chiave : dati.genitore;
  if (conAree() && !r.area_chiave && (tipoDopo === 'luogo' || tipoDopo === 'area') && (genitoreNuovo !== r.genitore_chiave || tipoDopo !== r.tipo)
    && genitoreNuovo && nelMondo(genitoreNuovo)) {
    throw httpErrors.conflict('usa-aggiungi-area', 'Nel mondo una planimetria sta in un’area: aggiungila con «Aggiungi area» nel quartiere (o «Aggiungi planimetria» in un’area), o collocala dall’elenco «Da collocare».');
  }
  // AP3-3 (L3, R3-26 anche per lo spostamento, decisione del PM): una mappa senza Area spostata sotto la radice di un Palazzo (o una sua
  // discendente), di qualunque tipo, vi diventerebbe una planimetria sciolta: la stessa regola di `creaMappa`. I Memento no (R3-12).
  const palazzoDiArrivo = dati.genitore !== undefined && dati.genitore !== r.genitore_chiave && dati.genitore ? palazzoDellaMappa(dati.genitore) : null;
  if (conAree() && !r.area_chiave && palazzoDiArrivo && palazzoDiArrivo !== 'mementos') {
    throw httpErrors.conflict('usa-aggiungi-area', 'Nei Palazzi una planimetria sta in un’area: aggiungila dalla scheda del Palazzo («Aggiungi area», o «Aggiungi planimetria» in un’area).');
  }
  // Il nome rivisto lo dichiara questo salvataggio, che è il modulo dell'editor e porta sempre il
  // campo «Nome»: premere Salva **è** dire «la mappa si chiama così», anche quando il testo non
  // cambia. Legarlo al cambiamento del testo lasciava senza rimedio chi il nome l'aveva già
  // corretto prima della 082: con il nome giusto già scritto non c'era più niente da cambiare, e
  // il titolo restava quello dedotto dall'estrazione. Lo spegne solo l'importazione di un
  // pacchetto, che quel nome lo sovrascrive.
  const rivisto = conNomeRivisto() ? (dati.nome !== undefined ? 1 : r.nome_rivisto ?? 0) : 0;
  // un'area si lega solo a una planimetria del suo Palazzo (controllo prima di scrivere: niente modifiche a metà)
  const genitoreDopo = dati.genitore === undefined ? r.genitore_chiave : dati.genitore;
  const legamiNuovi = conLegami();
  if (genitoreDopo !== r.genitore_chiave && legamiNuovi) {
    // Spostata sotto un altro genitore, la planimetria porta con sé **tutte** le sue aree: devono restare
    // del Palazzo in cui arriva (rilievo della revisione). Quella che questo salvataggio sostituisce non conta.
    // Con lei si spostano le discendenti: anche le loro aree devono restare del Palazzo di arrivo.
    // Da L3 le infiltrazioni di una planimetria sono quelle della sua Area (`infiltrazione_area`).
    const sottoalbero = [...sottoalberoMappe([chiave])];
    const areeDopo = new Set(sottoalbero.flatMap((k) => infiltrazioniDellaMappa(k).map((a) => a.chiave)));
    if (dati.entita?.tipo === 'area') areeDopo.add(dati.entita.chiave);
    verificaAreePalazzo(genitoreDopo, [...areeDopo]);
  } else if (dati.entita?.tipo === 'area') verificaAreePalazzo(genitoreDopo, [dati.entita.chiave]);
  // L3: un'infiltrazione legata dall'editor si lega all'Area della planimetria (le colonne `entita_*` sono state tolte da L11 · B9)
  const areaDellaPlanimetria = legamiNuovi && dati.entita?.tipo === 'area'
    ? (prepared('SELECT a.chiave FROM mappa m JOIN area a ON a.chiave = m.area_chiave AND a.dungeon_chiave IS NOT NULL WHERE m.chiave = ?').pluck().get(chiave) as string | undefined) ?? null
    : null;
  if (legamiNuovi && dati.entita?.tipo === 'area' && !areaDellaPlanimetria) throw httpErrors.badRequest('planimetria-senza-area', 'Questa planimetria non appartiene a un’area del Palazzo: le infiltrazioni si legano alle aree.');
  // rinominare una planimetria non cambia il nome della sua stanza: la stanza è l'Area, e il suo nome è `area.nome` (L11 · B9: il gruppo d'immagini non c'è più)
  getDb().transaction(()=>{
  if (conNomeRivisto()) prepared('UPDATE mappa SET nome_rivisto = ? WHERE chiave = ?').run(rivisto, chiave);
  prepared(`UPDATE mappa SET nome = ?, tipo = ?, genitore_chiave = ?, ordine = ?, asset = ?, larghezza = ?, altezza = ?, note = ?, origine = 'utente', updated_at = ? WHERE chiave = ?`).run(
    dati.nome ?? r.nome, dati.tipo ?? r.tipo, dati.genitore === undefined ? r.genitore_chiave : dati.genitore, dati.ordine ?? r.ordine, dati.asset === undefined ? r.asset : dati.asset,
    dati.larghezza === undefined ? r.larghezza : dati.larghezza, dati.altezza === undefined ? r.altezza : dati.altezza, dati.note ?? r.note, nowIso(), chiave);
  if (areaDellaPlanimetria && dati.entita?.tipo === 'area') {
    const gia = (prepared('SELECT infiltrazione_chiave FROM infiltrazione_area WHERE area_chiave = ?').pluck().all(areaDellaPlanimetria) as string[]);
    if (!gia.includes(dati.entita.chiave)) impostaLegamiInfiltrazione({ area: areaDellaPlanimetria, infiltrazioni: [...gia, dati.entita.chiave] });
  }
  // un percorso pubblico fissato (109, il Covo) vale finché la mappa resta com'era: rinominata davvero o spostata, il percorso torna
  // quello della catena dei genitori (il vecchio resta come alias)
  if (colonnaMappa('percorso_fisso') && ((dati.nome !== undefined && dati.nome.trim() !== r.nome) || genitoreDopo !== r.genitore_chiave)) {
    prepared('UPDATE mappa SET percorso_fisso = NULL WHERE chiave = ?').run(chiave);
  }
  // tipo, genitore o asset cambiati cambiano il posto nella gerarchia: il ruolo dell'immagine lo segue (L1)
  allineaRuoliImmagine(getDb(), chiave);
  sincronizzaPercorsiMappe(getDb());
  })();
  return dettaglioMappa(chiave);
}

/** Toglie da `gioco.db` le schermate caricate dei pin scelti da `condizione` (sui campi di `spillo s`). Le righe di `spillo_immagine`
 *  cadono in cascata col pin, ma il contenuto sta nella tabella `immagine`, che nessun vincolo segue: senza questa pulizia ogni pin
 *  eliminato lasciava i suoi BLOB nel file. Va chiamata nella stessa transazione, prima di cancellare i pin. */
export function eliminaImmaginiDeiPin(condizione: 's.id = ?' | 's.mappa_chiave = ?' | 's.area_guida_chiave = ?', valore: string | number): void {
  prepared(`DELETE FROM immagine WHERE ambito = 'spillo' AND chiave IN (SELECT si.immagine_chiave FROM spillo_immagine si JOIN spillo s ON s.id = si.spillo_id
    WHERE si.immagine_chiave IS NOT NULL AND ${condizione})`).run(valore);
}

/** L'immagine di base caricata per una mappa (ambito «mappa», stessa chiave), se è solo sua. La stessa chiave può essere anche la pianta
 *  di un quartiere (`citta-<quartiere>`, `chiaveImmagineQuartiere`) o di un'area di un Palazzo (la chiave dell'area): quelle restano. */
function eliminaImmagineDellaMappa(chiave: string): void {
  if (prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(chiave)) return;
  if (chiave.startsWith('citta-') && prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(chiave.slice('citta-'.length))) return;
  prepared("DELETE FROM immagine WHERE ambito = 'mappa' AND chiave = ?").run(chiave);
}

/**
 * Elimina una mappa in una transazione: le immagini dei suoi pin e la sua immagine di base (se è solo sua), le figlie
 * diventano radici, i «raccolto» dei suoi pin nel file delle partite; gli spilli cadono in cascata con la riga; poi i percorsi.
 * Dal 2026-10-16 la mappa va nel cestino (`conCestino`), immagini comprese, e da lì si rimette.
 */
export function eliminaMappa(chiave: string, opz: { conferma?: boolean; dallArea?: boolean } = {}): void {
  const r = rigaMappa(chiave);
  chiave = r.chiave;
  // L2 (§3.2): una planimetria di un'Area. L'ultima non si toglie da sola (si elimina l'Area); quella dell'ingresso del quartiere
  // chiede conferma (con lei se ne va l'ingresso); se era la predefinita, lo diventa la versione successiva, e le versioni si
  // ricompattano. Dall'eliminazione dell'Area (`dallArea`) queste regole non valgono: se ne va tutto.
  const area = !opz.dallArea && r.area_chiave ? prepared('SELECT chiave, planimetria_predefinita FROM area WHERE chiave = ?').get(r.area_chiave) as { chiave: string; planimetria_predefinita: string | null } | undefined : undefined;
  if (area) {
    const versioni = prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave').pluck().all(area.chiave) as string[];
    if (versioni.length <= 1) throw httpErrors.conflict('ultima-planimetria', 'È l’unica planimetria della sua area: per toglierla si elimina l’area.', { area: area.chiave });
    const ingressi = prepared('SELECT quartiere_chiave FROM quartiere_ingresso WHERE mappa_chiave = ?').pluck().all(chiave) as string[];
    if (ingressi.length > 0 && !opz.conferma) {
      throw httpErrors.conflict('planimetria-d-ingresso', 'È la planimetria dell’ingresso del quartiere: eliminandola, l’ingresso se ne va con lei.', { ingressi });
    }
  }
  const genitore = r.genitore_chiave ? (prepared('SELECT nome FROM mappa WHERE chiave = ?').get(r.genitore_chiave) as { nome: string } | undefined)?.nome ?? '' : '';
  conCestino({ tipo: 'mappa', chiave, nome: r.nome, contesto: genitore }, () => getDb().transaction(() => {
    const mPrima = modelloAvanzamento(getDb());
    eliminaImmaginiDeiPin('s.mappa_chiave = ?', chiave);
    eliminaImmagineDellaMappa(chiave);
    prepared('UPDATE mappa SET genitore_chiave = NULL WHERE genitore_chiave = ?').run(chiave);
    // gli spilli cadono in cascata con la mappa; i loro «raccolto» stanno in un altro file e si puliscono qui
    if (colonnaSpillo('uid')) prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL)").run(chiave);
    // L4: e le loro divergenze «da verificare»
    if (colonnaSpillo('uid') && conDivergenze(getDb())) prepared("DELETE FROM divergenza_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL)").run(chiave);
    if (colonnaSpillo('uid') && conStatoPerInfiltrazione(getDb())) prepared("DELETE FROM spillo_partita_infiltrazione WHERE spillo_uid IN (SELECT uid FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL)").run(chiave);
    prepared('DELETE FROM mappa WHERE chiave = ?').run(chiave);
    // §8.11: le voci dei pin della mappa li perdono, e il loro stato si ricalcola dai pin che restano
    riallineaStati(getDb(), mPrima, nowIso());
    if (area) {
      const restanti = prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave').pluck().all(area.chiave) as string[];
      restanti.forEach((k, i) => prepared('UPDATE mappa SET versione_ordine = ? WHERE chiave = ?').run(i, k));
      // un'Area rimasta con una planimetria sola non ha più versioni da distinguere: l'etichetta resta (si vede nell'editor), la pagina non la mostra
      if (area.planimetria_predefinita === chiave || area.planimetria_predefinita === null) {
        prepared('UPDATE area SET planimetria_predefinita = ?, updated_at = ? WHERE chiave = ?').run(restanti[0] ?? null, nowIso(), area.chiave);
      }
    }
    sincronizzaPercorsiMappe(getDb());
  })());
}
// Rimessa dal cestino: il registro riporta già percorsi e nomi di prima com'erano. Se però qualche riga dell'albero delle mappe
// non è tornata (toccata dopo l'eliminazione: una mappa rinominata o spostata), i percorsi si ricalcolano come dopo ogni modifica
// dell'albero. Non sempre: il ricalcolo annota come nome di prima ogni percorso corrente, e su un albero già tornato com'era
// aggiungerebbe solo righe in più.
registraRipristinoCestino('mappa', (_chiave, _vicini, saltate) => {
  if (saltate.some((s) => s.tabella === 'mappa' || s.tabella === 'mappa_percorso' || s.tabella === 'mappa_alias')) sincronizzaPercorsiMappe(getDb());
});

/**
 * Immagine di base nell'istanza (ambito «mappa», chiave = chiave della mappa); dimensioni lette dall'intestazione PNG/JPEG/WEBP/GIF
 * quando possibile. È la strada di ogni scrittura dell'immagine di una mappa che esiste (L1): l'editor, la rotta generica delle
 * immagini, lo scarico da un indirizzo (`scaricaImmagineMappa`) e lo scarico della pianta di un quartiere. `origineUrl` è
 * l'indirizzo da cui è stata scaricata (null per un file caricato); `dellUtente` (vero se non detto) dice se è una scelta
 * dell'utente, che fa la mappa sua: lo scarico automatico della pianta pubblicata non lo è, e lascia l'origine com'era.
 */
export function impostaImmagineMappa(chiave: string, mime: string, contenuto: Buffer, opz: { eliminaPezzi?: boolean; origineUrl?: string | null; dellUtente?: boolean } = {}): MappaDto {
  chiave=rigaMappa(chiave).chiave;
  // I pezzi (102) sono ritagli in pixel dell'immagine di prima: su un'altra ritaglierebbero zone sbagliate. Scelta dell'utente
  // (2026-10-14, «Chiedere conferma ed eliminarli»): senza conferma 409 col numero dei pezzi e delle copie posate (103); con la
  // conferma se ne vanno insieme alla sostituzione, nella stessa transazione (`confermaPezzi`, la stessa regola delle rimozioni).
  const togliPezzi = confermaPezzi([chiave], !!opz.eliminaPezzi, 'sostituendola');
  // immagine, dimensioni e ruolo insieme: una mappa con l'immagine nuova e le dimensioni vecchie sbaglierebbe la posizione di ogni
  // pin. `salvaImmagine` registra l'immagine sulla mappa e ne allinea il ruolo alla regola della gerarchia (L1, `immagineMappa.ts`):
  // una planimetria aggiunta al Palazzo con la sua immagine si apre nel visore (2026-10-18), e la regola è la stessa per ogni strada.
  getDb().transaction(() => {
    togliPezzi();
    salvaImmagine('mappa', chiave, mime, contenuto, opz.origineUrl ?? null);
    // caricata dall'utente: la mappa ora è sua (come ogni modifica dall'editor)
    if (opz.dellUtente !== false) prepared("UPDATE mappa SET origine = 'utente' WHERE chiave = ?").run(chiave);
  })();
  return dettaglioMappa(chiave);
}

/**
 * Scarica da un indirizzo l'immagine di base di una mappa che esiste e la imposta con `impostaImmagineMappa` (pezzi da confermare,
 * dimensioni, ruolo, indirizzo d'origine). I pezzi si controllano anche prima dello scarico, per non scaricare un file che verrebbe
 * rifiutato; `impostaImmagineMappa` li ricontrolla dopo, perché nel frattempo possono essere cambiati.
 */
export async function scaricaImmagineMappa(chiave: string, url: string, opz: { eliminaPezzi?: boolean; dellUtente?: boolean } = {}): Promise<MappaDto> {
  chiave = rigaMappa(chiave).chiave;
  confermaPezzi([chiave], !!opz.eliminaPezzi, 'sostituendola');
  const { contenuto, mime, url: arrivo } = await scaricaImmagine(url);
  return impostaImmagineMappa(chiave, mime, contenuto, { ...opz, origineUrl: arrivo.toString() });
}

/** Le dimensioni dalle intestazioni dell'immagine: stanno nel risolutore delle immagini delle mappe (`immagineMappa.ts`). */
export { dimensioniImmagine };

/**
 * Il contenuto dell'immagine che il visore mostra per la mappa, con la stessa regola (L1: caricata nell'istanza, poi l'asset
 * dichiarato); null se nessuna ha un contenuto. Serve alle dimensioni e a riconoscere un cambio d'immagine (i pezzi, 102, sono
 * ritagli di quella).
 */
function immagineMostrata(r: RigaMappa): Buffer | null {
  const candidati: Array<[string, string]> = [];
  const caricata = immagineDi(r);
  if (caricata) candidati.push(['mappa', caricata.chiave]);
  const i = r.asset ? r.asset.indexOf('/') : -1;
  if (r.asset && i > 0) candidati.push([r.asset.slice(0, i), r.asset.slice(i + 1)]);
  for (const [ambito, chiave] of candidati) {
    try {
      return fileImmagine(ambito, chiave).contenuto;
    } catch {
      // quell'immagine non c'è (o non ha contenuto): si prova la prossima
    }
  }
  return null;
}

/** Le dimensioni dell'immagine di una mappa, in pixel: quelle salvate, altrimenti lette dall'immagine mostrata. 409 senza un'immagine leggibile. */
function dimensioniDellaMappa(r: RigaMappa): DimensioniMappa {
  if (r.larghezza && r.altezza) return { larghezza: r.larghezza, altezza: r.altezza };
  const mostrata = immagineMostrata(r);
  const d = mostrata ? dimensioniImmagine(mostrata) : null;
  if (d) return d;
  throw httpErrors.conflict('mappa-senza-immagine', 'La mappa non ha un’immagine di cui conoscere le dimensioni: i pezzi si ritagliano dall’immagine della mappa.');
}

/** Un pezzo con le sue copie per le risposte dell'editor (senza partita: niente esito delle condizioni). */
const pezzoPerEditor = (id: number): PezzoMappaDto => pezzoDto(rigaPezzo(id), righeCopie(id), nomiCondizioni());
/** Una copia per le risposte dell'editor (senza partita). */
const copiaPerEditor = (id: number): CopiaPezzoDto => copiaDto(rigaCopia(id), nomiCondizioni());

/**
 * Crea un pezzo della planimetria (102) dalla zona scelta nell'editor, con la sua prima copia (103). Le condizioni (della copia)
 * sono quelle dei pin, comprese le condizioni sullo stato di un altro pin o di una voce della guida; zona e posizione si verificano
 * sull'immagine.
 */
export function creaPezzoMappa(chiave: string, dati: DatiNuovoPezzoMappa): PezzoMappaDto {
  const r = rigaMappa(chiave);
  verificaCondizioni(dati.copia?.condizioni, true);
  const dim = dimensioniDellaMappa(r);
  return pezzoPerEditor(getDb().transaction(() => creaPezzo(r.chiave, dim, dati).id)());
}

/** Elimina un pezzo con tutte le sue copie (404 se non c'è): la sua zona torna visibile nell'immagine di base. */
export function eliminaPezzoMappa(id: number): void {
  eliminaPezzo(id);
}

/** Aggiunge una copia a un pezzo (103; 404 se il pezzo non c'è): posizione, rotazione, specchio e condizioni proprie. */
export function creaCopiaPezzoMappa(pezzoId: number, dati: DatiCopiaPezzo): CopiaPezzoDto {
  const p = rigaPezzo(pezzoId);
  verificaCondizioni(dati.condizioni, true);
  return copiaPerEditor(creaCopia(pezzoId, dimensioniDellaMappa(rigaMappa(p.mappa_chiave)), dati).id);
}

/** Corregge una copia (404 se non c'è): i campi assenti restano; `nomePezzo` rinomina anche il ritaglio. */
export function aggiornaCopiaPezzoMappa(id: number, dati: DatiAggiornaCopiaPezzo): CopiaPezzoDto {
  const c = rigaCopia(id);
  verificaCondizioni(dati.condizioni, true);
  return copiaPerEditor(aggiornaCopia(id, dimensioniDellaMappa(rigaMappa(rigaPezzo(c.pezzo_id).mappa_chiave)), dati).id);
}

/** Elimina una copia (404 se non c'è); con l'ultima se ne va il pezzo, e la sua zona torna visibile. */
export function eliminaCopiaPezzoMappa(id: number): { pezzoEliminato: boolean } {
  return eliminaCopia(id);
}

export interface DatiSpillo { soloPosizione?: boolean; destinazione?: DestinazioneSpillo | null; tipo?: TipoSpillo; nome?: string; descrizione?: string; x?: number; y?: number; riferimento?: { tipo: TipoRiferimento; chiave: string } | null; collezionabile?: boolean; ordine?: number; condizioni?: RequisitoSpillo[] | null }
export type DatiAggiornaSpillo = DatiSpillo & { mappa?: string; riferimentoLuogo?: string; revisioneRaccordoAttesa?: string; areaLuogo?: string };

/** L'etichetta con cui si scarta lo stato di un pin o di una voce della guida citato fuori dalle condizioni dei pin. */
const SOLO_PIN = 'Stato di un pin o di una voce della guida (solo nelle condizioni dei pin)';
/**
 * Le chiavi citate dalle condizioni devono esistere ed essere calcolabili dall'app: separa le condizioni valide dalle scartate,
 * scendendo nei gruppi e nelle negazioni (un gruppo con un figlio scartato si scarta tutto). Più di 20 condizioni o una
 * condizione malformata sono scarti a sé.
 *
 * Si controllano: Palazzo esistente (non i Mementos), Confidente e richiesta della Guida, quartiere con uno sblocco
 * strutturato, e poi articoli, attività, negozi, membri della squadra, letture e Persona
 * citati, che devono esistere nei dati.
 *
 * Lo stato di un altro pin (`spillo`, 2026-10-03) vale solo nelle condizioni dei pin (`pin` presente) e deve citare un pin con
 * uno stato (`statoCitabile`: il suo tipo, o la sua voce della guida). In un'importazione un pin dello stesso pacchetto si
 * accetta all'inserimento e si verifica a pacchetto inserito, con le voci già scritte (`importaMappe`). Lo stato di una voce della
 * guida (`voce-guida`, 2026-10-11) vale anch'esso solo nelle condizioni dei pin, e deve citare una voce che esiste e si segna.
 */
function condizioniConChiaviEsistenti(condizioni: RequisitoSpillo[] | null | undefined, pin?: { delPacchetto: ReadonlySet<string> }): { valide: RequisitoSpillo[]; scartate: Array<{ cosa: string; chiave: string }> } {
  const valide: RequisitoSpillo[] = [];
  const scartate: Array<{ cosa: string; chiave: string }> = [];
  const sorgente = condizioni == null ? [] : Array.isArray(condizioni) ? condizioni : [null];
  // Una condizione che cita una chiave assente non diventa testo: sparisce, e l'importazione lo riferisce.
  if(sorgente.length>20)return {valide:[],scartate:[{cosa:'Condizioni',chiave:'limite superato'}]};
  for (const originale of sorgente) {
    const c = normalizzaRequisitoSpillo(originale);
    if (!c) { scartate.push({cosa:'Condizione',chiave:'non valida'}); continue; }
    if (c.tipo === 'gruppo' || c.tipo === 'non') {
      const figli=condizioniConChiaviEsistenti(c.tipo === 'gruppo' ? c.condizioni : [c.condizione], pin);
      if (figli.scartate.length) scartate.push(...figli.scartate); else valide.push(c);
      continue;
    }
    let ok = true; let cosa = ''; let chiave = '';
    if(c.tipo==='articolo'){cosa='Articolo';chiave=c.articolo;ok=!!prepared('SELECT 1 FROM articolo WHERE chiave=?').get(chiave);}
    else if(c.tipo==='attivita'){cosa='Attività';chiave=c.attivita;ok=!!prepared('SELECT 1 FROM attivita WHERE chiave=?').get(chiave);}
    else if(c.tipo==='rango-cliente'||c.tipo==='punti-negozio'){cosa='Negozio';chiave=c.negozio;ok=!!prepared('SELECT 1 FROM negozio WHERE chiave=?').get(chiave);}
    else if(c.tipo==='squadra'){cosa='Ladro Fantasma';chiave=c.membro;ok=giocabili().some((p)=>p.chiave===chiave);}
    else if(c.tipo==='lettura'){cosa=c.categoria;chiave=c.chiave;ok=!!prepared('SELECT 1 FROM '+c.categoria+' WHERE chiave=?').get(chiave);}
    else if(c.tipo==='persona-arcano'){cosa='Arcano';chiave=c.arcano;ok=!!prepared('SELECT 1 FROM persona WHERE arcana=?').get(chiave);}
    else if(c.tipo==='persona-abilita'){cosa='Persona o abilità';chiave=c.persona;ok=!!prepared('SELECT 1 FROM persona WHERE nome=?').get(c.persona)&&!!prepared('SELECT 1 FROM skill WHERE nome=?').get(c.abilita);}
    else if (c.tipo === 'palazzo' || c.tipo === 'finestra-palazzo') { cosa = 'Palazzo'; chiave = c.dungeon; ok = !!prepared("SELECT 1 FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(c.dungeon); }
    else if (c.tipo === 'confidente') { cosa = 'Confidente'; chiave = c.confidente; ok = !!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(c.confidente); }
    else if (c.tipo === 'richiesta') { cosa = 'Richiesta'; chiave = c.richiesta; ok = !!prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(c.richiesta); }
    else if (c.tipo === 'quartiere') {
      cosa = 'Quartiere con sblocco'; chiave = c.quartiere;
      try {
        const q = prepared('SELECT condizioni_json FROM quartiere WHERE chiave = ?').get(c.quartiere) as { condizioni_json: string | null } | undefined;
        ok = !!q && q.condizioni_json !== null;
      } catch {
        ok = false;
      }
    }
    else if (c.tipo === 'spillo') {
      chiave = c.spillo;
      if (!pin) { cosa = SOLO_PIN; ok = false; }
      else {
        // citabile come nel resto dell'app (`statoCitabile`, letto da `pinCitato`): un tipo con stato, o una voce della guida non
        // descrittiva. In un'importazione un pin del pacchetto si accetta qui e si verifica a pacchetto inserito: la sua voce si
        // scrive alla fine, e prima — che il pin sia già reinserito o arrivi dopo — l'esito dipenderebbe dall'ordine dei pin.
        cosa = 'Pin con uno stato';
        ok = pin.delPacchetto.has(c.spillo) || pinCitato(c.spillo)?.parola != null;
      }
    }
    else if (c.tipo === 'voce-guida') {
      // lo stato di una voce della guida (2026-10-11): solo nei pin, e solo una voce che esiste e si segna (non descrittiva)
      chiave = c.voce;
      if (!pin) { cosa = SOLO_PIN; ok = false; }
      else { cosa = 'Voce della guida da segnare'; ok = !!prepared(`SELECT 1 FROM punto_interesse p WHERE p.chiave = ? AND NOT ${sqlVoceDescrittiva('p')}`).get(c.voce); }
    }
    if (ok) valide.push(c); else scartate.push({ cosa, chiave });
  }
  return { valide, scartate };
}

/** Editor (API): una chiave sconosciuta è un errore 404, non uno scarto silenzioso. `perSpillo`: le condizioni di un pin, che
 *  possono citare lo stato di un altro pin (il catalogo no). */
export function verificaCondizioni(condizioni: RequisitoSpillo[] | null | undefined, perSpillo = false): void {
  const { scartate } = condizioniConChiaviEsistenti(condizioni, perSpillo ? { delPacchetto: new Set() } : undefined);
  if (scartate.length > 0) {
    if (scartate[0].cosa === 'Condizione' || scartate[0].cosa === 'Condizioni') throw httpErrors.badRequest('condizione-non-valida', 'Una condizione non è valida (troppo annidata o malformata): ricontrollala nell’editor.');
    if (scartate[0].cosa === SOLO_PIN) throw httpErrors.badRequest('condizione-solo-pin', 'Lo stato di un pin o di una voce della guida si usa solo nelle condizioni dei pin delle mappe.');
    if (scartate[0].cosa === 'Voce della guida da segnare') throw httpErrors.notFound('condizione-non-trovata', 'La voce della guida della condizione non esiste o è descrittiva, senza uno stato da segnare.');
    if (scartate[0].cosa === 'Pin con uno stato') throw httpErrors.notFound('condizione-non-trovata', 'Il pin della condizione non esiste o non ha uno stato da segnare (raccolto, aperto, parlato, incontrato, azionato…).');
    throw httpErrors.notFound('condizione-non-trovata', `${scartate[0].cosa} '${scartate[0].chiave}' non trovato nella Guida.`);
  }
}

/**
 * Controlla il riferimento di uno spillo: tipo ammesso (400), entità esistente (404; un'«attività» si cerca fra i luoghi) e,
 * per un collegamento nuovo a una voce della guida, che la voce non sia descrittiva. Nessun riferimento è sempre valido.
 */
function verificaRiferimento(rif: { tipo: TipoRiferimento; chiave: string } | null | undefined, attuale?: { tipo: string | null; chiave: string | null }): void {
  if (!rif) return;
  if (!(TIPI_RIFERIMENTO as readonly string[]).includes(rif.tipo)) throw httpErrors.badRequest('riferimento-non-valido', 'Tipo di riferimento non ammesso.');
  const tabella: Record<TipoRiferimento, string> = { mappa: 'SELECT 1 FROM mappa WHERE chiave = ?', negozio: 'SELECT 1 FROM negozio WHERE chiave = ?', punto: 'SELECT 1 FROM punto_interesse WHERE chiave = ?', luogo: 'SELECT 1 FROM luogo WHERE chiave = ?', confidente: 'SELECT 1 FROM confidente WHERE chiave = ?', richiesta: 'SELECT 1 FROM richiesta WHERE chiave = ?', attivita: 'SELECT 1 FROM luogo WHERE chiave = ?' };
  if (!prepared(tabella[rif.tipo]).get(rif.chiave)) throw httpErrors.notFound('riferimento-non-trovato', `${rif.tipo} '${rif.chiave}' non trovato.`);
  // Un collegamento **nuovo** a una voce descrittiva della guida si rifiuta, come da `collegaPinAlPunto` (2026-10-01): le
  // descrittive non hanno pin. Quello che c'è già (gli elementi della guida senza mappa di prima) resta: nessuna riconciliazione.
  if (rif.tipo === 'punto' && !(attuale?.tipo === 'punto' && attuale.chiave === rif.chiave)) {
    const p = prepared('SELECT nome, tipo, area_dedalo_chiave FROM punto_interesse WHERE chiave = ?').get(rif.chiave) as { nome: string; tipo: string; area_dedalo_chiave: string | null };
    if (puntoDescrittivo(p.tipo, p.area_dedalo_chiave)) throw httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: non ha pin.`);
    // una Persona da catturare (dedali e Palazzi) si cattura nel compendio (2026-10-12, `catturePersona.ts`; L8)
    if (eVoceDiCattura(rif.chiave)) throw erroreCatturaNelCompendio(p.nome, 'collegare');
  }
}

/** La categoria del tipo decide il resto dello spillo (richiesta dell'utente, 2026-09-11).
 *
 * - **consumabile** è collezionabile per definizione, gli altri no: il campo non si sceglie;
 * - **città** non è condizionato: la disponibilità è del negozio che mostra, non del segnalino; il **Confidente** sì
 *   (`ammetteCondizioni`, scelta dell'utente del 2026-10-04: dal Confidente il pin non eredita nessuna disponibilità);
 * - il **riferimento** deve essere di un tipo ammesso dalla categoria (uno spostamento porta a una
 *   mappa, uno spillo di città a un negozio, un'attività, un luogo o un Confidente…): un tipo
 *   estraneo è un errore, non un dato da tenere;
 * - la **destinazione** vale solo per gli spostamenti.
 */
function applicaRegoleCategoria<T extends DatiSpillo>(tipo: TipoSpillo, dati: T): T {
  const categoria = categoriaSpillo(tipo);
  const out: DatiSpillo = { ...dati, collezionabile: categoria === 'consumabile' };
  if (!ammetteCondizioni(tipo)) out.condizioni = [];
  if (categoria !== 'spostamento') out.destinazione = null;
  if (out.riferimento && !RIFERIMENTI_PER_CATEGORIA[categoria].includes(out.riferimento.tipo)) {
    throw httpErrors.badRequest('riferimento-non-ammesso', `Uno spillo «${DEFINIZIONI_SPILLO[tipo].nome}» (${categoria}) non può collegarsi a «${out.riferimento.tipo}».`);
  }
  return out as T;
}

/**
 * Su un pin di una planimetria un riferimento «punto» in ingresso (un client o un pacchetto di prima della 094) è la sua voce
 * della guida: una voce in più del pin (`spillo_voce`, 098), con le regole del collegamento dalla guida (`erroreVoceDelPin`), e il riferimento del pin non
 * si tocca — un passaggio tiene la sua destinazione (`undefined` = invariato; uno spillo nuovo nasce senza).
 */
function separaVoce<T extends DatiSpillo>(dati: T): { dati: T; voce: string | undefined } {
  if (dati.riferimento?.tipo !== 'punto') return { dati, voce: undefined };
  return { dati: { ...dati, riferimento: undefined }, voce: dati.riferimento.chiave };
}

/**
 * Crea uno spillo su una mappa, tutto in una transazione: tipo ammesso, un riferimento «punto» separato come voce della guida
 * (con le regole del collegamento), regole della categoria, riferimento, condizioni e destinazione verificati; poi la riga
 * (origine «utente»), l'uid, la voce con gli stati delle partite uniti, la destinazione e la data della mappa.
 */
export function creaSpillo(mappaChiave: string, dati: DatiSpillo & { tipo: TipoSpillo; nome: string; x: number; y: number }): SpilloDto {
  return getDb().transaction(() => {
  mappaChiave=rigaMappa(mappaChiave).chiave;
  if (!(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  const separata = separaVoce(dati);
  dati = separata.dati;
  if (separata.voce) { const errore = erroreVoceDelPin({ nome: dati.nome, mappa: mappaChiave }, separata.voce); if (errore) throw errore; }
  dati = applicaRegoleCategoria(dati.tipo, dati);
  if(dati.riferimento?.tipo==='mappa')dati={...dati,riferimento:{...dati.riferimento,chiave:rigaMappa(dati.riferimento.chiave).chiave}};
  verificaRiferimento(dati.riferimento);
  verificaCondizioni(dati.condizioni, true);
  const destinazione = verificaDestinazioneSpillo(dati.destinazione);
  const adesso = nowIso();
  // §8.11: il modello di prima, per riallineare gli stati se il pin nasce già di una voce
  const mPrima = separata.voce ? modelloAvanzamento(getDb()) : null;
  const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente', ?, ?)`).run(mappaChiave, dati.tipo, dati.nome, dati.descrizione ?? '', dati.x, dati.y, dati.riferimento?.tipo ?? null, dati.riferimento?.chiave ?? null,
    dati.collezionabile ? 1 : 0, dati.ordine ?? 0, adesso, jsonCondizioni(dati.condizioni));
  prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));
  if (separata.voce) prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(Number(info.lastInsertRowid), separata.voce);
  assegnaUidMancanti(getDb());
  // un pin che nasce già di una voce ne unisce gli stati, come collegarlo dalla guida (§8.11: `riallineaStati`)
  if (separata.voce) allineaStatiPunto(getDb(), separata.voce, adesso);
  if (mPrima) riallineaStati(getDb(), mPrima, adesso);
  salvaDestinazioneSpillo(Number(info.lastInsertRowid), destinazione);
  prepared("UPDATE mappa SET updated_at = ? WHERE chiave = ?").run(adesso, mappaChiave);
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaSpillo);
  })();
}

/**
 * Aggiorna uno spillo in una transazione: i campi assenti restano. Una scheda della guida senza mappa non accetta coordinate,
 * mappa né destinazione; su una planimetria un riferimento «punto» diventa una voce in più del pin (098), e spostando il pin su un'altra
 * mappa le sue voci devono restare del Palazzo. Un riferimento non più ammesso dal tipo cade; condizioni e giri fra pin si
 * verificano. Uno spillo del seed modificato diventa dell'utente e ricorda la sua identità di seed per il reseed.
 */
export function aggiornaSpillo(id: number, dati: DatiAggiornaSpillo): SpilloDto | SchedaContenutoGuidaDto {
  return getDb().transaction(() => {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);

  if (Object.prototype.hasOwnProperty.call(dati, 'revisioneRaccordoAttesa') || Object.prototype.hasOwnProperty.call(dati, 'riferimentoLuogo') || Object.prototype.hasOwnProperty.call(dati, 'areaLuogo')) {
    const raccordo = richiestaRaccordoPin(dati);
    const attuale = improntaRaccordoPin(getDb(), r, raccordo.riferimentoLuogo, raccordo.areaLuogo);
    if (attuale !== raccordo.revisioneRaccordoAttesa) throw httpErrors.conflict('raccordo-precondizione-cambiata', 'Il pin, i suoi collegamenti o il luogo sono cambiati dopo la lettura. Rileggi la proposta prima di collegare.');
    // Ramo deliberatamente separato dalle normalizzazioni dell'editor: anche NULL e [] raw,
    // voci, immagini, destinazione, origine, nome e coordinate restano esattamente quelli letti.
    if (raccordo.areaLuogo !== undefined) applicaAreaRaccordoPin(getDb(), raccordo.riferimentoLuogo, raccordo.areaLuogo);
    if (r.riferimento_tipo !== 'luogo' || r.riferimento_chiave !== raccordo.riferimentoLuogo) {
      const esito = prepared("UPDATE spillo SET riferimento_tipo = 'luogo', riferimento_chiave = ?, updated_at = ? WHERE id = ? AND riferimento_tipo IS NULL AND riferimento_chiave IS NULL").run(raccordo.riferimentoLuogo, nowIso(), id);
      if (esito.changes !== 1) throw httpErrors.conflict('raccordo-precondizione-cambiata', 'Il riferimento è cambiato: nessuna parte del raccordo è stata applicata.');
    }
    if (raccordo.areaLuogo !== undefined) invalidaCacheDiGioco();
    return elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo);
  }

  if(r.area_guida_chiave && ['x','y','mappa','destinazione'].some(k=>Object.prototype.hasOwnProperty.call(dati,k)))throw httpErrors.badRequest('contenuto-non-spaziale','Una scheda guida non accetta coordinate o destinazioni.');
  if (dati.tipo && !(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  // su una planimetria il riferimento «punto» in ingresso è una voce in più del pin (098); gli elementi della guida senza mappa restano com'erano
  const separata = r.mappa_chiave !== null ? separaVoce(dati) : { dati, voce: undefined };
  dati = separata.dati;
  if (separata.voce) { const errore = erroreVoceDelPin({ nome: dati.nome ?? r.nome, mappa: dati.mappa ? rigaMappa(dati.mappa).chiave : r.mappa_chiave }, separata.voce); if (errore) throw errore; }
  // spostato su un'altra planimetria, un pin con delle voci resta soggetto alle stesse regole: fuori dal Palazzo di una sua voce
  // si rifiuta (le voci di un pin sono dello stesso Palazzo: lo controlla ogni collegamento)
  const vociAttuali = r.mappa_chiave !== null ? vociDelPin(r.id) : [];
  if (vociAttuali.length > 0 && dati.mappa && rigaMappa(dati.mappa).chiave !== r.mappa_chiave) {
    for (const v of vociAttuali) {
      const errore = erroreVoceDelPin({ nome: dati.nome ?? r.nome, mappa: rigaMappa(dati.mappa).chiave }, v);
      // solo il Palazzo: una voce rimasta da prima (descrittiva) non impedisce di spostare il pin
      if (errore?.code === 'pin-fuori-dal-palazzo') throw errore;
    }
  }
  // Cambiando tipo il riferimento di prima può non essere più ammesso: quello che il client non
  // tocca **non si ri-verifica** (le schede della Guida hanno riferimenti a mappe che non esistono
  // più, e un salvataggio del nome non deve fallire per questo); se non è più della categoria, cade.
  const tipoFinale = dati.tipo ?? r.tipo;
  if (dati.riferimento === undefined && r.riferimento_tipo && !RIFERIMENTI_PER_CATEGORIA[categoriaSpillo(tipoFinale)].includes(r.riferimento_tipo)) dati = { ...dati, riferimento: null };
  dati = applicaRegoleCategoria(tipoFinale, dati);
  if (dati.mappa) dati={...dati,mappa:rigaMappa(dati.mappa).chiave};
  if(dati.riferimento?.tipo==='mappa')dati={...dati,riferimento:{...dati.riferimento,chiave:rigaMappa(dati.riferimento.chiave).chiave}};
  verificaRiferimento(dati.riferimento, { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave });
  // lo stato di un altro pin vale solo per i pin di una mappa (una scheda della guida senza mappa no: 2026-10-03), e non può
  // far dipendere il pin da se stesso né chiudere un giro (scelta dell'utente)
  verificaCondizioni(dati.condizioni, r.mappa_chiave !== null);
  if (dati.condizioni && r.uid) verificaGiro(getDb(), r.uid, dati.condizioni);
  const destinazione = verificaDestinazioneSpillo(dati.destinazione);
  // uno spillo del seed modificato diventa dell'utente: si ricorda com'era, così il reseed non ne reinserisce una copia
  const identitaSeed = r.seed_identita_json ?? (r.origine === 'seed' ? identitaSpillo({ tipo: r.tipo, nome: r.nome, x: r.x, y: r.y, riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null }) : null);
  prepared(`UPDATE spillo SET mappa_chiave = ?, tipo = ?, nome = ?, descrizione = ?, x = ?, y = ?, riferimento_tipo = ?, riferimento_chiave = ?, collezionabile = ?, ordine = ?, origine = 'utente', updated_at = ?, condizioni_json = ?, seed_identita_json = ? WHERE id = ?`).run(
    dati.mappa ?? r.mappa_chiave, dati.tipo ?? r.tipo, dati.nome ?? r.nome, dati.descrizione ?? r.descrizione, dati.x ?? r.x, dati.y ?? r.y,
    dati.riferimento === undefined ? r.riferimento_tipo : dati.riferimento?.tipo ?? null, dati.riferimento === undefined ? r.riferimento_chiave : dati.riferimento?.chiave ?? null,
    dati.collezionabile === undefined ? r.collezionabile : dati.collezionabile ? 1 : 0, dati.ordine ?? r.ordine, nowIso(), dati.condizioni === undefined ? r.condizioni_json : jsonCondizioni(dati.condizioni), identitaSeed, id);
  if (dati.soloPosizione !== undefined) prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, id);
  // una voce in più (098): le altre restano
  if (separata.voce && !vociAttuali.includes(separata.voce)) {
    const mPrima = modelloAvanzamento(getDb());
    prepared('INSERT OR IGNORE INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(id, separata.voce);
    allineaStatiPunto(getDb(), separata.voce, nowIso());
    riallineaStati(getDb(), mPrima, nowIso());
  }
  salvaDestinazioneSpillo(id, destinazione);
  return elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo);
  })();
}

/** Fotografia volatile, senza riparazioni di UID o scritture durante la lettura. */
export function precondizioneRimozioneSpillo(id: number): PrecondizioneRimozionePinDto {
  const db = getDb();
  return db.transaction(() => {
    const f = fotografiaRimozionePin(db, id);
    if (f.immaginiCondivise) throw httpErrors.conflict('rimozione-pin-immagini-condivise', 'Una schermata caricata del pin è usata anche da un altro pin: nessuna rimozione automatica di contenuti condivisi.');
    return f.dto;
  })();
}

/** Il gesto singolo è recuperabile; i chiamanti aggregati mantengono il loro unico cestino esterno. */
export function eliminaSpillo(id: number, dati?: RichiestaRimozionePin): void {
  const richiesta = richiestaRimozionePin(dati), db = getDb();
  db.transaction(() => {
    const r = db.prepare('SELECT * FROM main.spillo WHERE id=?').get(id) as RigaSpillo | undefined;
    if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);
    const aggregata = registrazioneCestinoInCorso();
    const foto = !aggregata || richiesta ? fotografiaRimozionePin(db, id) : null;
    if (!aggregata && foto?.immaginiCondivise) throw httpErrors.conflict('rimozione-pin-immagini-condivise', 'Una schermata caricata del pin è usata anche da un altro pin: nessun dato è stato eliminato.');
    if (richiesta && (richiesta.spilloUid !== foto!.dto.spillo.uid || richiesta.revisioneRimozioneAttesa !== foto!.dto.revisioneRimozioneAttesa)) {
      throw httpErrors.conflict('rimozione-pin-conflitto', 'Identità, contenuti o Cestino sono cambiati: rileggi il pin prima di confermare.');
    }
    const opera = () => {
      const mPrima = modelloAvanzamento(db);
      eliminaImmaginiDeiPin('s.id = ?', id);
      if (db.prepare('DELETE FROM main.spillo WHERE id=? AND uid IS ?').run(id, r.uid).changes !== 1) throw httpErrors.conflict('rimozione-pin-conflitto', 'L’identità del pin non coincide più: transazione annullata.');
      // Stati nel file delle partite: il vincolo main non li può eliminare.
      if (r.uid) db.prepare('DELETE FROM utente.spillo_partita WHERE spillo_uid=?').run(r.uid);
      if (r.uid && conDivergenze(db)) db.prepare('DELETE FROM utente.divergenza_partita WHERE spillo_uid=?').run(r.uid);
      if (r.uid && conStatoPerInfiltrazione(db)) db.prepare('DELETE FROM utente.spillo_partita_infiltrazione WHERE spillo_uid=?').run(r.uid);
      if (mPrima.pin.has(id)) riallineaStati(db, mPrima, nowIso());
    };
    if (aggregata) opera();
    else conCestino({ tipo: 'pin', chiave: foto!.dto.spillo.uid, nome: r.nome, contesto: foto!.contesto }, opera);
  }).immediate();
}

/**
 * Stato «raccolto» di uno spillo per partita. Da L4 (§3.2, rivisto dal §8.11 «NR4-1») dipende dalle voci del pin:
 * - con voci che contano (permanenti, rigenerabili): il gesto segna o toglie **solo quel pin** (`segnaIlPin`; un pin condiviso dai
 *   rigenerabili di più infiltrazioni nell'infiltrazione di contesto, `infiltrazione` o quella in corso), e le sue voci si ricalcolano
 *   (k/N): fatte quando lo sono tutti i loro pin; togliere il segno toglie «fatta» a ogni voce che lo contiene, «esaurito» compreso
 *   (scelta dell'utente del 2026-10-09). Su un pin «da verificare» togliere il segno è anche «Togli il fatto al pin». La risposta porta
 *   le voci segnate o riaperte dal gesto (`effetti`);
 * - con le sole voci senza carattere (dedali dei Memento, R4-30): la regola di prima, il segno del pin e le sue voci;
 * - senza voci, o con sole voci di racconto: il suo stato (`spillo_partita`), come prima.
 */
export function impostaRaccolto(partitaId: number, spilloId: number, raccolto: boolean, infiltrazione: string | null = null): SpilloDto | SchedaContenutoGuidaDto {
  assegnaUidMancanti(getDb());
  verificaPartita(partitaId);
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  // Si segna un pin che ha uno stato (2026-10-03, `statoCitabile`: la stessa regola delle condizioni «Pin di una mappa»):
  // raccolto un consumabile, sconfitto un boss o un miniboss, azionato un meccanismo, gestito un punto sensibile, affrontato
  // un nemico, aperta una porta chiusa; e qualunque pin collegato a una voce della guida non descrittiva, che è il modo di
  // segnare quella voce (un Confidente, una stanza sicura). Gli altri — una nota, un passaggio senza voce, un pin di una
  // voce «Altro» — non hanno stato. Togliere il segno resta sempre possibile, così un segno rimasto da prima si può ripulire.
  if (raccolto && pinCitato(r.uid)?.parola == null) throw httpErrors.badRequest('spillo-senza-stato', `«${r.nome}» (${DEFINIZIONI_SPILLO[r.tipo]?.nome ?? r.tipo}) non ha uno stato da segnare.`);

  const adesso = nowIso();
  const m = modelloAvanzamento(getDb());
  const vociDelModello = m.pin.get(r.id);
  // una scheda della guida senza mappa (lo strato di prima, assorbito nella voce: §2.3) non è un pin della voce: il suo gesto è il gesto
  // sulla voce, come prima (la voce, i passi del suo Enigma, l'Enigma di un passo)
  if (vociDelModello && vociDelModello.contano.length > 0 && r.mappa_chiave === null) {
    getDb().transaction(() => {
      for (const voce of vociDelModello.contano) {
        segnaPassiDellEnigma(getDb(), partitaId, voce, raccolto ? 'ottenuto' : null, adesso);
        if (!(raccolto && prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, voce))) scriviStatoVoce(getDb(), partitaId, voce, raccolto ? 'ottenuto' : null, adesso);
        allineaEnigmaDellaVoce(getDb(), partitaId, voce, adesso);
      }
      prepared(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partitaId, r.uid, raccolto ? 1 : 0, adesso);
      prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    })();
    return elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo, contestoSpilli(partitaId, infiltrazione));
  }
  if (vociDelModello && vociDelModello.contano.length > 0 && r.uid) {
    const uid = r.uid;
    const effetti = getDb().transaction(() => {
      const e = segnaIlPin(getDb(), partitaId, { id: r.id, uid }, raccolto, infiltrazione, adesso);
      prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
      return e;
    })();
    const dto = elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo, contestoSpilli(partitaId, infiltrazione));
    return { ...dto, effetti: effettiDelGestoDto(getDb(), effetti) };
  }
  getDb().transaction(() => {
    prepared(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partitaId, r.uid, raccolto ? 1 : 0, adesso);
    // L4: un pin di sole voci di racconto ha il suo stato e non le segna (le voci di racconto si segnano dalla guida); restano qui
    // sotto i pin delle sole voci senza carattere (dedali dei Memento), con la regola di prima
    if (!vociDelModello || vociDelModello.altre.length === 0) { prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId); return; }
    // le voci del pin che si segnano (una o più, 098): una voce descrittiva della guida non ha stato (2026-10-01), il raccolto del
    // pin non la segna
    // (né una Persona da catturare, che si cattura nel compendio, 2026-10-12; L8: un collegamento rimasto da prima non la segna)
    const voci = vociDelModello.altre.filter((voce) => !eVoceDiCattura(voce));
    /** Vero se la voce ha uno stato nella partita. */
    const segnata = (voce: string) => !!prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, voce);
    if (voci.length > 1) {
      // Un pin con più voci (scelta dell'utente, 2026-10-09: «Segna tutte le sue voci»): segnarlo segna «ottenuto» ogni sua voce
      // ancora da segnare, come «Ottenuto» su ogni riga del popup; togliere il segno le riapre tutte. Come dalla guida
      // (`impostaStatoPunto`): i passi di un Enigma seguono, i pin delle voci seguono le loro voci — lui compreso, che così è
      // fatto quando sono segnate tutte (`scriviStatoVoce`) — e l'Enigma di un passo segue i suoi passi.
      for (const voce of voci) {
        if (raccolto && segnata(voce)) continue;
        segnaPassiDellEnigma(getDb(), partitaId, voce, raccolto ? 'ottenuto' : null, adesso);
        scriviStatoVoce(getDb(), partitaId, voce, raccolto ? 'ottenuto' : null, adesso);
        allineaEnigmaDellaVoce(getDb(), partitaId, voce, adesso);
      }
    } else for (const voce of voci) {
      // raccogliere lo spillo di un punto è segnare quel punto: è dell'utente, non un segno automatico (utente 006). Un punto
      // con più pin sulle planimetrie (2026-10-01) è segnato quando li ha raccolti **tutti**; toglierne uno lo riapre. Contano i
      // pin che hanno solo questa voce: il segno di un pin con altre voci parla di tutte (098), e aspettarlo bloccherebbe la voce.
      const tutti = r.mappa_chiave === null || pinDelPuntoGuida(getDb(), voce)
        .every((p) => p.uid === r.uid || quanteVociDelPin(getDb(), p.id) > 1 || !!prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1').get(partitaId, p.uid));
      if (raccolto && tutti) prepared(`INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET automatico = 0`).run(partitaId, voce, adesso);
      else if (!raccolto) prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, voce);
      // un Enigma coi suoi passi (095), raggiunto da un elemento della guida di prima: i passi seguono, come segnandolo dalla guida
      segnaPassiDellEnigma(getDb(), partitaId, voce, segnata(voce) ? 'ottenuto' : null, adesso);
      // un passo di un Enigma (095): l'Enigma segue i suoi passi
      allineaEnigmaDellaVoce(getDb(), partitaId, voce, adesso);
      // gli altri pin di questa voce che hanno altre voci la seguono (voci indipendenti, 2026-10-09): fatti solo con tutte le loro
      // voci segnate — un pin con più voci non resta «fatto» con questa voce riaperta
      for (const p of pinDelPuntoGuida(getDb(), voce)) if (p.uid !== r.uid && quanteVociDelPin(getDb(), p.id) > 1) allineaRaccoltoDelPin(getDb(), partitaId, p, adesso);
    }
    // il Tesoro o il boss raccolti non segnano più da soli il boss finale della Guida (scelta dell'utente, 2026-10-04: il
    // boss si affronta più volte, ed è sconfitto solo col suo spillo raccolto o segnato dalla Guida; utente 017)
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo, contestoSpilli(partitaId));
}

// ---- Immagini degli spilli (schermate di riferimento) ----

/** La riga di uno spillo per id; 404 «spillo-non-trovato» se non esiste. */
function rigaSpillo(id: number): RigaSpillo {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);

  return r;
}

/** Aggiunge una schermata allo spillo (file nell'istanza, ambito «spillo»); restituisce lo spillo aggiornato. */
export function aggiungiImmagineSpillo(spilloId: number, mime: string, contenuto: Buffer, didascalia = ''): SpilloDto | SchedaContenutoGuidaDto {
  const r = rigaSpillo(spilloId);
  const chiave = `${spilloId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const adesso = nowIso();
  // il BLOB e la riga che lo lega al pin nascono insieme: se la seconda fallisse, il primo resterebbe orfano in gioco.db
  getDb().transaction(() => {
    salvaImmagine('spillo', chiave, mime, contenuto);
    const ordine = (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM spillo_immagine WHERE spillo_id = ?').get(spilloId) as { n: number }).n;
    prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, NULL, ?, ?)').run(spilloId, ordine, chiave, didascalia.slice(0, 300), adesso);
    prepared("UPDATE spillo SET updated_at = ? WHERE id = ?").run(adesso, spilloId);
  })();
  return elementoSpilloDto(rigaSpillo(r.id));
}

/** Cambia didascalia (al massimo 300 caratteri) e ordine di una schermata di uno spillo; restituisce lo spillo aggiornato. */
export function aggiornaImmagineSpillo(id: number, dati: { didascalia?: string; ordine?: number }): SpilloDto | SchedaContenutoGuidaDto {
  const i = prepared('SELECT * FROM spillo_immagine WHERE id = ?').get(id) as RigaImmagineSpillo | undefined;
  if (!i) throw httpErrors.notFound('immagine-non-trovata', `L'immagine ${id} non esiste.`);
  prepared('UPDATE spillo_immagine SET didascalia = ?, ordine = ?, updated_at = ? WHERE id = ?').run((dati.didascalia ?? i.didascalia).slice(0, 300), dati.ordine ?? i.ordine, nowIso(), id);
  return elementoSpilloDto(rigaSpillo(i.spillo_id));
}

/** Toglie una schermata da uno spillo e, in transazione, il suo file caricato, se c'è; restituisce lo spillo aggiornato. */
export function eliminaImmagineSpillo(id: number): SpilloDto | SchedaContenutoGuidaDto {
  const i = prepared('SELECT * FROM spillo_immagine WHERE id = ?').get(id) as RigaImmagineSpillo | undefined;
  if (!i) throw httpErrors.notFound('immagine-non-trovata', `L'immagine ${id} non esiste.`);
  getDb().transaction(() => {
    prepared('DELETE FROM spillo_immagine WHERE id = ?').run(id);
    if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
  })();
  return elementoSpilloDto(rigaSpillo(i.spillo_id));
}

// ---- Ricerca delle entità collegabili (editor) ----

export interface RiferimentoTrovato { tipo: TipoRiferimento; chiave: string; nome: string; dettaglio: string }

const RICERCHE: Record<TipoRiferimento, string> = {
  mappa: "SELECT chiave, nome, tipo AS dettaglio FROM mappa WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  negozio: "SELECT chiave, nome, tipo AS dettaglio FROM negozio WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  punto: "SELECT p.chiave, p.nome, a.nome AS dettaglio FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE lower(p.nome) LIKE ? OR p.chiave LIKE ? ORDER BY p.nome LIMIT ?",
  // L5: il luogo si riconosce dal posto, «Quartiere › Area» (o il solo quartiere se è da collocare)
  luogo: `SELECT l.chiave, l.nome, COALESCE(q.nome, l.quartiere_chiave) || COALESCE(' › ' || a.nome, '') AS dettaglio FROM luogo l LEFT JOIN quartiere q ON q.chiave = l.quartiere_chiave
    LEFT JOIN area a ON a.chiave = l.area_chiave WHERE lower(l.nome) LIKE ? OR l.chiave LIKE ? ORDER BY l.nome LIMIT ?`,
  confidente: "SELECT chiave, nome, arcana AS dettaglio FROM confidente WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  richiesta: "SELECT chiave, nome, '' AS dettaglio FROM richiesta WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  attivita: "SELECT chiave, nome, quartiere_chiave AS dettaglio FROM luogo WHERE (lower(nome) LIKE ? OR chiave LIKE ?) AND tipo IN ('attivita', 'servizio', 'scuola') ORDER BY nome LIMIT ?",
};

/** Entità collegabili a uno spillo, per tipo e testo (nome o chiave), al massimo `limite` risultati. */
export function cercaRiferimenti(tipo: TipoRiferimento, q: string, limite = 30): RiferimentoTrovato[] {
  if (!(TIPI_RIFERIMENTO as readonly string[]).includes(tipo)) throw httpErrors.badRequest('riferimento-non-valido', 'Tipo di riferimento non ammesso.');
  if(tipo==='mappa'){
    /** Testo senza accenti e in minuscolo, per il confronto. */
    const normalizza=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const parole=normalizza(q).split(/\s+/).filter(Boolean);
    // L2: una planimetria con un'Area si presenta col posto e l'Area, più la versione se l'Area ne ha più d'una («Shibuya › Sottopasso ·
    // planimetria completa»): è così che la si sceglie come destinazione di un passaggio
    const nomeDi=(m:MappaRiassuntoDto)=>m.area?`${m.area.contenitore.nome} › ${m.area.nome}${m.area.versioneEtichetta?` · ${m.area.versioneEtichetta}`:''}`:m.nomeCompleto??m.nome;
    return elencaMappe().filter(m=>parole.every(p=>normalizza(nomeDi(m)+' '+(m.nomeCompleto??m.nome)+' '+m.chiave).includes(p))).slice(0,limite).map(m=>({tipo,chiave:m.chiave,nome:nomeDi(m),dettaglio:m.tipo}));
  }
  const testo = `%${q.trim().toLowerCase()}%`;
  return (prepared(RICERCHE[tipo]).all(testo, testo, limite) as Array<{ chiave: string; nome: string; dettaglio: string | null }>).map((r) => ({
    tipo, chiave: r.chiave, nome: r.nome, dettaglio: tipo === 'confidente' && r.dettaglio ? t('arcana', r.dettaglio) : r.dettaglio ?? '',
  }));
}

// ---- Esportazione / importazione ----

/** Chiavi della mappa `radice` e di tutte le discendenti (404 se la radice non c'è). */
function discendentiDi(radice: string): Set<string> {
  rigaMappa(radice);
  return sottoalberoMappe([radice]);
}

/** Il contenuto di un'immagine caricata in base64 con il suo MIME; null se l'immagine non c'è o il file non si legge. */
function base64Immagine(ambito: string, chiave: string): { mime: string; base64: string } | null {
  if (!leggiImmagine(ambito, chiave)) return null;
  try {
    const f = fileImmagine(ambito, chiave);
    return { mime: f.mime, base64: f.contenuto.toString('base64') };
  } catch {
    return null;
  }
}

/** Pacchetto JSON con mappe, spilli (con schermate in base64) e immagini di base dell'istanza (base64): lo stesso formato del file
 * `mappe-editor.json` dell'editor. Con `radice` esporta solo quella mappa e le sue discendenti (un «luogo» completo). */
export function esportaMappe(radice?: string): EsportazioneMappeDto {
  assegnaUidMancanti(getDb());
  if(radice)radice=rigaMappa(radice).chiave;
  const ammesse = radice ? discendentiDi(radice) : null;
  const presentazioni = contestoMappe().presentazioni;
  // L3 (andata e ritorno identica, §2.3): le infiltrazioni di ogni planimetria (quelle della sua Area) per il campo vecchio `aree`. Da L11 · B9 il
  // pacchetto non porta più `entita`, `entitaLegami` e `gruppoImmagini`: l'import li accetta (pacchetti di prima) e li ignora.
  const infiltrazioniPerMappa = conLegami() ? infiltrazioniDelleMappe() : undefined;
  const conRivisto = conNomeRivisto();
  const conFisso = colonnaMappa('percorso_fisso');
  const conSeedIdentita = colonnaSpillo('seed_identita_json');
  const conNativoSpillo = colonnaNativoJson();
  const mappe: EsportazioneMappeDto['mappe'] = (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, chiave').all() as RigaMappa[]).filter((m) => !ammesse || ammesse.has(m.chiave)).map((m) => ({
    ...(presentazioni.get(m.chiave) ?? {}),
    chiave: m.chiave, nome: m.nome, tipo: m.tipo, genitore: m.genitore_chiave, ordine: m.ordine, immagine: m.immagine_chiave, asset: m.asset, assetOriginale:m.asset, larghezza: m.larghezza, altezza: m.altezza,
    ruoloImmagine: m.ruolo_immagine,
    note: m.note,
    // L3: nome rivisto, origine, ultima modifica e percorso fissato, perché l'import li rimetta identici
    ...(conRivisto ? { nomeRivisto: m.nome_rivisto === 1 } : {}), origine: m.origine, updatedAt: m.updated_at,
    ...(conFisso ? { percorsoFisso: (m as RigaMappa & { percorso_fisso?: string | null }).percorso_fisso ?? null } : {}),
    // L2: l'Area della planimetria e la sua versione (le Aree stanno nel campo `aree` del pacchetto); una mappa senza Area porta la sola versione
    // se ce l'ha (i fogli dei Memento: etichetta e ordine che prima stavano nel gruppo d'immagini)
    ...(m.area_chiave ? { area: m.area_chiave, versione: { etichetta: m.versione_etichetta ?? null, ordine: m.versione_ordine ?? 0 } }
      : m.versione_etichetta != null || m.versione_ordine != null ? { versione: { etichetta: m.versione_etichetta ?? null, ordine: m.versione_ordine ?? 0 } } : {}),
    // le infiltrazioni contenute (2026-09-29; da L3 quelle dell'Area)
    ...areePerPacchetto(m.chiave, infiltrazioniPerMappa),
    // i pezzi (102), anche nessuno: un pacchetto che lo dice toglie, importato, quelli che la mappa avesse
    ...(conPezzi() ? { pezzi: pezziPerPacchetto(m.chiave) } : {}),
    spilli: (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(m.chiave) as RigaSpillo[]).map((s) => ({
      ...destinazionePerPacchetto(s.id),
      uid: s.uid,
      tipo: s.tipo, nome: s.nome, descrizione: s.descrizione, x: s.x, y: s.y, riferimento: s.riferimento_tipo && s.riferimento_chiave ? { tipo: s.riferimento_tipo, chiave: s.riferimento_chiave } : null, voci: vociProprie(s.id), soloPosizione: s.solo_posizione === 1, collezionabile: s.collezionabile === 1, ordine: s.ordine,
      // L3: origine, ultima modifica, identità del seed e prove native com'erano salvate
      origine: s.origine as 'seed' | 'utente', updatedAt: s.updated_at,
      ...(conSeedIdentita ? { seedIdentita: (s as RigaSpillo & { seed_identita_json?: string | null }).seed_identita_json ?? null } : {}),
      ...(conNativoSpillo ? { nativoJson: (s as RigaSpillo & { nativo_json?: string | null }).nativo_json ?? null } : {}),
      ...(condizioniDiRiga(s.condizioni_json).length > 0 ? { condizioni: condizioniDiRiga(s.condizioni_json) } : {}),
      // schermate: asset del repository oppure file dell'istanza in base64 (sempre inclusi: il pacchetto è completo)
      immagini: (prepared('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(s.id) as RigaImmagineSpillo[]).flatMap((i): Array<{ asset?: string | null; mime?: string; base64?: string; didascalia: string }> => {
        if (i.asset) return [{ asset: i.asset, didascalia: i.didascalia }];
        if (!i.immagine_chiave) return [];
        const b = base64Immagine('spillo', i.immagine_chiave);
        return b ? [{ mime: b.mime, base64: b.base64, didascalia: i.didascalia }] : [];
      }),
    })),
  }));
  // il genitore fuori dal sottoalbero esportato resta indicato: all'importazione viene risolto se esiste

  const immagini: EsportazioneMappeDto['immagini'] = {};
  const provenienze: NonNullable<EsportazioneMappeDto['provenienze']> = [];
  for (const m of mappe) {
    // immagine registrata, oppure quella dell'istanza con la chiave della mappa: sempre inclusa (pacchetto completo, decisione dell'utente
    // del 2026-09-04); la provenienza delle immagini scaricate dalle guide resta annotata a titolo informativo
    const chiaveImg = m.immagine ?? immagineDi(rigaMappa(m.chiave))?.chiave ?? null;
    if (!chiaveImg) continue;
    const img = leggiImmagine('mappa', chiaveImg);
    if (img?.origineUrl) provenienze.push({ mappa: chiaveMappa(m.chiave), origineUrl: img.origineUrl });
    m.immagine = chiaveImg;
    try {
      const f = fileImmagine('mappa', chiaveImg);
      immagini[chiaveImg] = { mime: f.mime, base64: f.contenuto.toString('base64') };
    } catch {
      // immagine registrata ma file assente: esportata senza immagine
    }
  }
  // L'asset nel pacchetto è quello dichiarato dalla mappa se esiste, altrimenti nessuno (L1, F9 del validatore): prima ogni mappa
  // usciva con `mappe/<chiave pubblica>` per convenzione, quasi sempre inesistente, e `assetOriginale` portava la colonna vera.
  // `assetOriginale` resta (uguale) perché l'importazione lo preferisce e i pacchetti di prima lo usano.
  // L2: le Aree delle planimetrie esportate, con la predefinita per chiave pubblica (se è fra le esportate o no: all'import si usa solo
  // se la planimetria c'è)
  // O3-1 (L3): con la radice di un Palazzo nel pacchetto entrano tutte le sue Aree, anche quelle rimaste senza planimetrie (dopo «Colloca»
  // o dal cestino), con i loro legami: il Palazzo esportato è intero, e su un'altra istanza tornano
  const palazziEsportati = mappe.map((m) => /^dungeon-(.+)$/.exec(m.chiave)?.[1]).filter((d): d is string => !!d && d !== 'mementos');
  const areeDeiPalazzi = palazziEsportati.length === 0 || !conAree() ? [] : prepared(`SELECT chiave FROM area WHERE dungeon_chiave IN (${palazziEsportati.map(() => '?').join(', ')})`).pluck().all(...palazziEsportati) as string[];
  const areeEsportate = [...new Set([...mappe.map((m) => m.area).filter((a): a is string => !!a), ...areeDeiPalazzi])];
  const aree: AreaPacchetto[] = areeEsportate.length === 0 ? [] : (prepared(`SELECT * FROM area WHERE chiave IN (${areeEsportate.map(() => '?').join(', ')}) ORDER BY chiave`).all(...areeEsportate) as RigaArea[])
    .map((a) => ({ chiave: a.chiave, quartiere: a.quartiere_chiave, dungeon: a.dungeon_chiave, citta: a.citta_chiave, slug: a.slug, nome: a.nome, nomeRivisto: a.nome_rivisto === 1, ordine: a.ordine,
      predefinita: a.planimetria_predefinita ? chiaveMappa(a.planimetria_predefinita) : null, origine: a.origine, seedJson: a.seed_json, daVerificare: a.da_verificare === 1, updatedAt: a.updated_at }));
  // L3: i legami infiltrazione ↔ area delle Aree esportate (versione da aprire per chiave pubblica)
  const legami: LegamePacchetto[] = areeEsportate.length === 0 || !conLegami() ? [] : (prepared(`SELECT * FROM infiltrazione_area WHERE area_chiave IN (${areeEsportate.map(() => '?').join(', ')})
    ORDER BY infiltrazione_chiave, ordine, area_chiave`).all(...areeEsportate) as Array<{ infiltrazione_chiave: string; area_chiave: string; ordine: number; planimetria_iniziale: string | null; origine: LegamePacchetto['origine'] }>)
    .map((l) => ({ infiltrazione: l.infiltrazione_chiave, area: l.area_chiave, ordine: l.ordine, planimetriaIniziale: l.planimetria_iniziale ? chiaveMappa(l.planimetria_iniziale) : null, origine: l.origine }));
  for(const m of mappe){m.chiave=chiaveMappa(m.chiave);if(m.genitore)m.genitore=chiaveMappa(m.genitore);m.asset=assetEsistente(m.asset);m.assetOriginale=m.asset;for(const s of m.spilli)if(s.riferimento?.tipo==='mappa')s.riferimento.chiave=chiaveMappa(s.riferimento.chiave);}
  const ingressi=(prepared(`SELECT quartiere_chiave AS quartiere,mappa_chiave AS mappa,x,y,zoom${conAree()?',area_chiave AS area':''} FROM quartiere_ingresso`).all() as NonNullable<EsportazioneMappeDto['ingressi']>).filter(i=>!ammesse||ammesse.has(i.mappa)).map(i=>({...i,mappa:chiaveMappa(i.mappa)}));
  return { versione: 1, esportato: nowIso(), ...(aree.length ? { aree } : {}), ...(legami.length ? { legami } : {}), mappe, immagini, ...(ingressi.length?{ingressi}:{}), ...(provenienze.length > 0 ? { provenienze } : {}) };
}

/** Il riferimento proprio di un pin del pacchetto, con le regole della sua categoria: un «punto» (pacchetti di prima della 094)
 *  non è un riferimento ma una voce della guida del pin (`vociDichiarate`). */
function riferimentoDelPacchetto(rif: { tipo: TipoRiferimento; chiave: string } | null | undefined, categoria: ReturnType<typeof categoriaSpillo>): { tipo: TipoRiferimento; chiave: string } | null {
  return rif && rif.tipo !== 'punto' && RIFERIMENTI_PER_CATEGORIA[categoria].includes(rif.tipo) ? rif : null;
}

/** Le voci della guida che un pin del pacchetto dichiara: il campo `voci` (098), o `voce` di un pacchetto della 094-097, o il
 *  riferimento «punto» di un pacchetto di prima. `undefined` = il pacchetto non ne dice niente (un pacchetto di prima). */
function vociDichiarate(s: { riferimento: { tipo: TipoRiferimento; chiave: string } | null; voci?: string[]; voce?: string | null }): string[] | undefined {
  if (s.voci !== undefined) return [...new Set(s.voci)];
  if (s.voce !== undefined) return s.voce ? [s.voce] : [];
  return s.riferimento?.tipo === 'punto' ? [s.riferimento.chiave] : undefined;
}

/** Le voci che il pin avrà davvero su quella planimetria, in ordine di chiave: quelle date che le regole del collegamento
 *  ammettono (`erroreVoceDelPin`: esiste, non è descrittiva, è del Palazzo della planimetria). */
function vociAmmesse(nome: string, mappa: string, voci: string[]): string[] {
  return voci.filter((v) => !erroreVoceDelPin({ nome, mappa }, v)).sort();
}

/** Le voci proprie di un pin (`spillo_voce`), in ordine di chiave. Su uno schema di prima della 098 (i test caricano il seed a
 *  scaglioni) la sola colonna della 094, se c'è. */
function vociProprie(id: number): string[] {
  if (prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'spillo_voce'").get()) {
    return prepared('SELECT voce_chiave FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').pluck().all(id) as string[];
  }
  if (!colonnaSpillo('voce_chiave')) return [];
  const voce = prepared('SELECT voce_chiave FROM spillo WHERE id = ?').pluck().get(id) as string | null | undefined;
  return voce ? [voce] : [];
}

/** L'identità di un pin del pacchetto: la voce della guida non ne fa parte (è un collegamento, come «raccolto»), e un riferimento
 *  «punto» di un pacchetto di prima è la voce. */
function identitaDelPacchetto(s: { tipo: string; nome: string; riferimento: { tipo: TipoRiferimento; chiave: string } | null }, x: number, y: number): string {
  return identitaSpillo({ tipo: s.tipo, nome: s.nome, x, y, riferimento: s.riferimento?.tipo === 'punto' ? null : s.riferimento });
}

/** Un reseed identico conserva ID, raccolte, schermate e destinazioni del pin. */
/** `verificata`: la destinazione del pacchetto già verificata prima degli inserimenti (con le mappe in arrivo); senza, si verifica qui e un errore vale «diverso». */
function spilloInvariatoNelSeed(r: RigaSpillo, s: EsportazioneMappeDto['mappe'][number]['spilli'][number], verificata?: DestinazioneDaSalvare | null): boolean {
  // si confronta con quel che il pacchetto **produrrebbe** (regole di categoria applicate), non con quel che scrive
  const categoria = categoriaSpillo(s.tipo);
  const riferimento = riferimentoDelPacchetto(s.riferimento, categoria);
  if (r.tipo!==s.tipo || r.nome!==s.nome || r.descrizione!==(s.descrizione??'') || r.x!==s.x || r.y!==s.y || r.riferimento_tipo!==(riferimento?.tipo??null) || r.riferimento_chiave!==(riferimento?.chiave??null) || r.collezionabile!==(categoria==='consumabile'?1:0) || r.ordine!==(s.ordine??0) || r.solo_posizione!==(s.soloPosizione?1:0)) return false;
  // la voce della guida, come la destinazione: un pacchetto che non la dichiara non toglie quella che l'utente ha collegato
  const dichiarate = vociDichiarate(s);
  if (dichiarate !== undefined && JSON.stringify(vociProprie(r.id)) !== JSON.stringify(vociAmmesse(s.nome, r.mappa_chiave, dichiarate))) return false;
  if (JSON.stringify(condizioniDiRiga(r.condizioni_json))!==JSON.stringify(normalizzaCondizioniSpillo(ammetteCondizioni(s.tipo)?(s.condizioni??[]):[]))) return false;
  // Una destinazione assente dai dati importati non cancella un arrivo configurato nell'istanza.
  if (s.destinazione!==undefined || s.destinazioneNonDisponibile!==undefined) {
    const attuale=leggiDestinazioneSpillo(r.id);
    if(!!attuale.destinazioneNonDisponibile!==!!s.destinazioneNonDisponibile)return false;
    // la destinazione del pacchetto si risolve allo stesso spillo d'arrivo che la riga ha già
    let voluta: DestinazioneDaSalvare | null | undefined;
    if (verificata !== undefined) voluta = verificata;
    else { try { voluta = verificaDestinazioneSpillo(s.destinazione); } catch { return false; } }
    const spilloVoluto = voluta ? (voluta.spillo ?? (voluta.cerca ? risolviSpilloArrivo(voluta.mappa, voluta.cerca) : null)) : null;
    if ((attuale.destinazione ? idMappa(attuale.destinazione.mappa) : null) !== (voluta?.mappa ?? null) || (attuale.destinazione?.spillo ?? null) !== spilloVoluto) return false;
  }
  const immagini=prepared('SELECT * FROM spillo_immagine WHERE spillo_id=? ORDER BY ordine,id').all(r.id) as RigaImmagineSpillo[];
  return (s.immagini??[]).every(v=>immagini.some(i=>{if(i.didascalia!==(v.didascalia??''))return false;if(i.asset)return i.asset===(v.asset??null);const b=i.immagine_chiave?base64Immagine('spillo',i.immagine_chiave):null;return !!b&&b.mime===v.mime&&b.base64===v.base64;}));
}

/** Rettifiche editoriali certificate: nessun campo personale o identità storica viene riscritto. */
export function rettificaNomiSpilliSeed(mappa?: string, spilli?: EsportazioneMappeDto['mappe'][number]['spilli']): number[] {
  const modificati: number[] = [];
  for (const rettifica of RETTIFICHE_NOMI_SEED) {
    if (mappa !== undefined && rettifica.mappa !== mappa) continue;
    if (spilli && spilli.filter(s=>isDeepStrictEqual(Object.fromEntries(Object.entries(s).filter(([,v])=>v!==undefined)),rettifica.dopo)).length!==1) continue;
    const candidati=(prepared("SELECT * FROM spillo WHERE mappa_chiave=? AND origine='seed'").all(rettifica.mappa) as RigaSpillo[]).filter(r=>spilloInvariatoNelSeed(r,rettifica.prima));
    if(candidati.length!==1)continue;
    const r=candidati[0];
    prepared('UPDATE spillo SET nome=?,descrizione=? WHERE id=?').run(rettifica.dopo.nome,rettifica.dopo.descrizione,r.id);
    modificati.push(r.id);
  }
  return modificati;
}
/** Se l'identità è quella di prima di una rettifica dei nomi, quella di dopo con la mappa della rettifica; altrimenti la stessa. */
function identitaRettificata(identita:string): {identita:string;mappa?:string} {
  const r=RETTIFICHE_NOMI_SEED.find(r=>identitaSpillo({...r.prima,riferimento:r.prima.riferimento??null})===identita);
  return r?{identita:identitaSpillo({...r.dopo,riferimento:r.dopo.riferimento??null}),mappa:r.mappa}:{identita};
}

export interface EsitoImportazione { mappe: number; spilli: number; /** I pezzi delle planimetrie scritti (102: i ritagli). */ pezzi: number; /** Le copie posate scritte (103). */ copie: number; /** I pezzi scartati perché la zona esce dall'immagine della mappa d'arrivo, o nessuna copia ci sta (o la mappa non ne ha una). */ pezziScartati: number; /** Le copie scartate perché escono dall'immagine della mappa d'arrivo, comprese quelle dei pezzi scartati (103). */ copieScartate: number; /** I pezzi tolti, con le loro copie, perché l'immagine della loro mappa è stata sostituita da una diversa (102). */ pezziEliminati: number; /** Le copie tolte con quei pezzi (103). */ copieEliminate: number; immagini: number; saltate: string[]; /** Condizioni scartate perché citano chiavi assenti dalla Guida. */ condizioniScartate: number; /** Voci della guida scartate (094; una per voce dalla 098): inesistenti, descrittive o di un altro Palazzo. */ vociScartate: number;
  /** L3 (§3.6.3): pin, pezzi e copie tornati con lo stesso uid che non hanno potuto riprendere il loro id (preso da un'altra riga): id
   *  nuovo, con i riferimenti (voci, stati, passaggi, atterraggi, copie) che seguono l'uid nella stessa transazione. Assente se vuoto. */
  idCambiati?: IdCambiatoImportazione[];
  /** L6: vecchie condizioni lette come avvisi negli elementi effettivamente importati. */
  condizioniConvertite?: string[] }

/** Solo resoconto: la selezione e la normalizzazione delle condizioni restano in `condizioniConChiaviEsistenti`.
 * Non si dichiara recuperato un nodo appartenente a una condizione scartata. */
function conversioniAccettate(originali: readonly unknown[] | undefined, valide: readonly RequisitoSpillo[], origine: string): string[] {
  const firme = new Set(valide.map((c) => JSON.stringify(c)));
  const conversioni: string[] = [];
  for (const [i, originale] of (originali ?? []).entries()) {
    const normalizzata = normalizzaRequisitoSpillo(originale);
    if (normalizzata && firme.has(JSON.stringify(normalizzata))) convertiManualiImportati(originale, `${origine}.condizioni[${i}]`, conversioni);
  }
  return conversioni;
}
/** Una riga reimportata con un id diverso da quello di prima (L3, §3.6.3). */
export interface IdCambiatoImportazione { tipo: 'pin' | 'pezzo' | 'copia'; uid: string; prima: number; dopo: number }

/** Importa un pacchetto (o il seed): per chiave, con `sovrascrivi` sostituisce mappe e spilli esistenti; altrimenti salta le mappe già presenti
 * (il seed aggiorna solo le mappe di origine seed, sostituendo i soli spilli di origine seed e conservando quelli dell'utente). */
/**
 * Le Aree di un pacchetto delle mappe (L2, §2.3), dentro la transazione dell'import, dopo le mappe: un'Area che c'è si salta (in
 * `saltate`, con la sua chiave), salvo «sovrascrivi» o seed sopra seed; un'Area dell'utente non la scavalca un seed; un'Area il cui
 * contenitore qui non esiste si salta. Poi ogni planimetria importata con `area` si lega alla sua Area con la versione (se l'Area c'è),
 * e la predefinita diventa quella del pacchetto se è una planimetria dell'Area.
 */
function importaAree(pacchetto: EsportazioneMappeDto, origine: 'seed' | 'utente', sovrascrivi: boolean, esito: EsitoImportazione, adesso: string): Set<string> {
  const forma = z.array(z.object({
    chiave: z.string().min(1).max(260), quartiere: z.string().max(80).nullable(), dungeon: z.string().max(80).nullable(), citta: z.string().max(80).nullable().optional(),
    slug: z.string().min(1).max(120), nome: z.string().min(1).max(200), nomeRivisto: z.boolean().optional(), ordine: z.number().int(), predefinita: z.string().max(200).nullable(),
    origine: z.enum(['seed', 'utente']).optional(), seedJson: z.string().nullable().optional(), daVerificare: z.boolean().optional(), updatedAt: z.string().min(1).max(40).optional(),
  })).max(2000).safeParse(pacchetto.aree);
  if (!forma.success) throw httpErrors.badRequest('aree-non-valide', 'Aree non valide nel pacchetto delle mappe.');
  const importate = new Set<string>();
  for (const a of forma.data) {
    const contenitori = [a.quartiere, a.dungeon, a.citta ?? null].filter((x) => x !== null);
    const contenitoreEsiste = contenitori.length === 1 && (a.quartiere ? !!prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(a.quartiere)
      : a.dungeon ? !!prepared('SELECT 1 FROM dungeon WHERE chiave = ?').get(a.dungeon) : a.citta === 'tokyo');
    const esistente = prepared('SELECT origine, seed_json FROM area WHERE chiave = ?').get(a.chiave) as { origine: string; seed_json: string | null } | undefined;
    const origineArea = a.origine ?? origine;
    if (!contenitoreEsiste || (esistente && !sovrascrivi && !(origine === 'seed' && esistente.origine === 'seed')) || (esistente && origine === 'seed' && esistente.origine === 'utente')) {
      esito.saltate.push(a.chiave);
      continue;
    }
    // R2-28 (difetto R3 del giro 1 di L2): un'Area della guida corretta dall'utente (i valori della guida conservati in `seed_json`) resta
    // com'è anche sotto il seed; del seed si aggiornano solo i valori della guida conservati, così «Ripristina» riporta quelli nuovi
    if (esistente && origine === 'seed' && !sovrascrivi && esistente.seed_json !== null) {
      prepared('UPDATE area SET seed_json = ? WHERE chiave = ?')
        .run(JSON.stringify({ nome: a.nome, nome_rivisto: a.nomeRivisto ? 1 : 0, planimetria_predefinita: a.predefinita ? idMappa(a.predefinita) : null }), a.chiave);
      continue;
    }
    prepared(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
      ON CONFLICT(chiave) DO UPDATE SET slug = excluded.slug, nome = excluded.nome, nome_rivisto = excluded.nome_rivisto, ordine = excluded.ordine, origine = excluded.origine,
        seed_json = excluded.seed_json, da_verificare = excluded.da_verificare, updated_at = excluded.updated_at`)
      .run(a.chiave, a.quartiere, a.dungeon, a.citta ?? null, a.slug, a.nome, a.nomeRivisto ? 1 : 0, a.ordine, origineArea, a.seedJson ?? null, a.daVerificare ? 1 : 0, a.updatedAt ?? adesso);
    importate.add(a.chiave);
  }
  // le planimetrie importate con un'Area (le saltate restano com'erano)
  for (const m of pacchetto.mappe) {
    if (!m.area || esito.saltate.includes(m.chiave) || !prepared('SELECT 1 FROM area WHERE chiave = ?').get(m.area)) continue;
    prepared('UPDATE mappa SET area_chiave = ?, versione_etichetta = ?, versione_ordine = ? WHERE chiave = ?').run(m.area, m.versione?.etichetta ?? null, m.versione?.ordine ?? 0, m.chiave);
  }
  for (const a of forma.data) {
    if (!importate.has(a.chiave)) continue;
    const predefinita = a.predefinita ? idMappa(a.predefinita) : null;
    const valida = predefinita && prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(predefinita, a.chiave) ? predefinita
      : prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave LIMIT 1').pluck().get(a.chiave) as string | undefined ?? null;
    prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ? AND planimetria_predefinita IS NOT ?').run(valida, a.chiave, valida);
  }
  return importate;
}

/**
 * I legami infiltrazione ↔ area del pacchetto (L3, §2.3), dentro la transazione dell'import, dopo le Aree: per ogni Area importata il
 * pacchetto ne dà l'insieme completo, che sostituisce quello di prima (origine, ordine e versione da aprire come nel pacchetto). Le
 * Aree saltate restano com'erano; un legame verso un'infiltrazione o un'Area che qui non esiste si salta; una versione da aprire che
 * non è una planimetria dell'Area diventa «la predefinita» (null).
 */
function importaLegami(pacchetto: EsportazioneMappeDto, importate: ReadonlySet<string>): void {
  const forma = z.array(z.object({
    infiltrazione: z.string().min(1).max(200), area: z.string().min(1).max(260), ordine: z.number().int(), planimetriaIniziale: z.string().max(200).nullable(),
    origine: z.enum(['seed', 'utente', 'regola']),
  })).max(5000).safeParse(pacchetto.legami);
  if (!forma.success) throw httpErrors.badRequest('legami-non-validi', 'Legami infiltrazione-area non validi nel pacchetto delle mappe.');
  const toccate = new Set(forma.data.map((l) => l.area).filter((a) => importate.has(a)));
  for (const area of importate) if (prepared('SELECT 1 FROM area WHERE chiave = ? AND dungeon_chiave IS NOT NULL').get(area)) toccate.add(area);
  for (const area of toccate) prepared('DELETE FROM infiltrazione_area WHERE area_chiave = ?').run(area);
  for (const l of forma.data) {
    if (!toccate.has(l.area) || !prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(l.infiltrazione)) continue;
    const iniziale = l.planimetriaIniziale ? idMappa(l.planimetriaIniziale) : null;
    const valida = iniziale && prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(iniziale, l.area) ? iniziale : null;
    prepared('INSERT OR REPLACE INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine) VALUES (?, ?, ?, ?, ?)').run(l.infiltrazione, l.area, l.ordine, valida, l.origine);
  }
}

export function importaMappe(pacchetto: EsportazioneMappeDto, opz: { sovrascrivi?: boolean; origine?: 'seed' | 'utente'; pacchettiSeed?: readonly EsportazioneMappeDto[] } = {}): EsitoImportazione {
  if (!pacchetto || pacchetto.versione !== 1 || !Array.isArray(pacchetto.mappe)) throw httpErrors.badRequest('pacchetto-non-valido', 'Pacchetto delle mappe non riconosciuto (versione 1 attesa).');
  pacchetto=structuredClone(pacchetto);
  for(const m of pacchetto.mappe){m.chiave=idMappa(m.chiave);if(m.assetOriginale)m.asset=m.assetOriginale;if(m.genitore)m.genitore=idMappa(m.genitore);for(const s of m.spilli??[])if(s.riferimento?.tipo==='mappa')s.riferimento.chiave=idMappa(s.riferimento.chiave);}
  const incoming = new Set(pacchetto.mappe.filter(m => chiaveValida(m.chiave) && (TIPI_MAPPA as readonly string[]).includes(m.tipo)).map(m => m.chiave));
  // i pin del pacchetto per uid: una condizione «Pin di una mappa» può citarne uno che si inserisce dopo (2026-10-03)
  // (accettati all'inserimento, verificati a pacchetto inserito: vedi `condizioniConChiaviEsistenti`)
  const pinDelPacchetto = { delPacchetto: new Set(pacchetto.mappe.flatMap((m) => (m.spilli ?? []).filter((s) => uidValido(s.uid)).map((s) => s.uid as string))) };
  const verificate = new Map<object, DestinazioneDaSalvare | null | undefined>();
  for (const m of pacchetto.mappe) for (const s of m.spilli ?? []) {
    if (s.soloPosizione !== undefined && typeof s.soloPosizione !== 'boolean') throw httpErrors.badRequest('posizione-non-valida', 'Il campo soloPosizione deve essere booleano.');
    if (s.destinazioneNonDisponibile !== undefined && typeof s.destinazioneNonDisponibile !== 'boolean') throw httpErrors.badRequest('destinazione-non-valida', 'Stato della destinazione non valido.');
    if (s.destinazioneNonDisponibile && s.destinazione) throw httpErrors.badRequest('destinazione-non-valida', 'Una destinazione non può essere presente e invalidata.');
    // la voce della guida (094): una chiave o null; altro è un pacchetto rovinato, non un errore del server
    if (s.voce !== undefined && s.voce !== null && (typeof s.voce !== 'string' || s.voce.length === 0 || s.voce.length > 200)) throw httpErrors.badRequest('voce-non-valida', 'La voce della guida di uno spillo deve essere una chiave (o null).');
    // le voci della guida (098): un elenco di chiavi
    if (s.voci !== undefined && (!Array.isArray(s.voci) || s.voci.length > 200 || s.voci.some((v) => typeof v !== 'string' || v.length === 0 || v.length > 200))) throw httpErrors.badRequest('voce-non-valida', 'Le voci della guida di uno spillo devono essere un elenco di chiavi.');
    // verificata qui, scritta dopo gli inserimenti: il pacchetto resta com'è, così il confronto «invariato nel seed» legge la forma originale
    verificate.set(s, verificaDestinazioneSpillo(s.destinazione, incoming));
  }
  const origine = opz.origine ?? 'utente';
  const esito: EsitoImportazione = { mappe: 0, spilli: 0, pezzi: 0, copie: 0, pezziScartati: 0, copieScartate: 0, pezziEliminati: 0, copieEliminate: 0, immagini: 0, saltate: [], condizioniScartate: 0, vociScartate: 0 };
  const conversioniCopie = new WeakMap<object, string[]>();
  const conversioniPin = new Map<number, { originali: readonly unknown[] | undefined; origine: string }>();
  getDb().transaction(() => {
    // §8.11: il modello di prima, per riallineare gli stati delle partite ai legami nuovi (in fondo)
    const mPrima = modelloAvanzamento(getDb());
    // Uno spostamento conserva l'identità originale, non la mappa corrente.
    // Il fallback richiede una sola sorgente nell'intero seed e un solo erede utente.
    const identitaSpostate = new Set<string>();
    if (origine === 'seed' && !opz.sovrascrivi) {
      const occorrenze = new Map<string, number>();
      const sorgenti = new Map<string,string>();
      const rettificheAttive = new Set<string>();
      for (const pacco of opz.pacchettiSeed ?? [pacchetto]) for (const mappa of pacco.mappe) for (const s of mappa.spilli ?? []) {
        const riferimento = s.riferimento?.tipo === 'mappa' ? { ...s.riferimento, chiave: idMappa(s.riferimento.chiave) } : s.riferimento ?? null;
        const identita = identitaDelPacchetto({ tipo:s.tipo, nome:s.nome, riferimento }, Math.min(100,Math.max(0,s.x)), Math.min(100,Math.max(0,s.y)));
        occorrenze.set(identita, (occorrenze.get(identita) ?? 0) + 1);
        sorgenti.set(identita,idMappa(mappa.chiave));
        if(RETTIFICHE_NOMI_SEED.some(r=>r.mappa===idMappa(mappa.chiave)&&isDeepStrictEqual(Object.fromEntries(Object.entries(s).filter(([,v])=>v!==undefined)),r.dopo)))rettificheAttive.add(identita);
      }
      const eredi = prepared("SELECT seed_identita_json FROM spillo WHERE origine='utente' AND seed_identita_json IS NOT NULL").all() as Array<{seed_identita_json:string}>;
      const conteggioEredi=new Map<string,number>();
      for(const r of eredi){const v=identitaRettificata(r.seed_identita_json);const identita=v.mappa&&(sorgenti.get(v.identita)!==v.mappa||!rettificheAttive.has(v.identita))?r.seed_identita_json:v.identita;conteggioEredi.set(identita,(conteggioEredi.get(identita)??0)+1);}
      for (const [identita,n] of conteggioEredi) if (n===1&&occorrenze.get(identita)===1) identitaSpostate.add(identita);
    }
    const arrivi: Array<{id:number; valore:DestinazioneDaSalvare|null|undefined; invalidata:boolean}> = [];
    /** Passaggi di pin che restano (di altre mappe o dell'utente) il cui spillo d'arrivo sta per essere tolto e reinserito: la DELETE
     *  azzera `spillo_arrivo_id` (ON DELETE SET NULL), quindi si ricollegano al pin reinserito con lo stesso uid. */
    const arriviDaRicollegare: Array<{ spilloId: number; mappa: string; uid: string }> = [];
    /** Le regole d'atterraggio dei Palazzi (097) il cui pin d'arrivo sta per essere tolto e reinserito: stesso motivo, stesso rimedio. */
    const atterraggiDaRicollegare: Array<{ id: number; uid: string }> = [];
    const conAtterraggi = !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dungeon_atterraggio'").get();
    const conUid = colonnaSpillo('uid');
    const areeDaLegare: Array<{ mappa: string; aree: string[] }> = [];
    // le voci della guida dei pin (098; prima della 098 la sola colonna della 094, che ne tiene una): da scrivere a genitori risolti;
    // quelle dei pin tolti, per uid, per chi torna con lo stesso
    const conTabellaVoci = !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'spillo_voce'").get();
    const conColonnaVoce = !conTabellaVoci && colonnaSpillo('voce_chiave');
    const conVoce = conTabellaVoci || conColonnaVoce;
    const vociDaScrivere: Array<{ id: number; nome: string; mappa: string; voci: string[] }> = [];
    const vociDiPrima = new Map<string, string[]>();
    /** I pin inseriti con condizioni sullo stato di altri pin: si ricontrollano a pacchetto inserito. */
    const conCondizioniSuPin: number[] = [];
    /** I pezzi (102) delle mappe che il pacchetto aggiorna: si scrivono in fondo, a immagini importate. */
    const pezziDaScrivere: Array<{ mappa: string; pezzi: PezzoDaImportare[] }> = [];
    /** Le mappe del pacchetto che hanno già dei pezzi, con l'immagine che mostrano adesso: a importazione finita si riconfronta. */
    const immaginiConPezzi = new Map<string, Buffer | null>();
    if (conPezzi()) {
      for (const m of pacchetto.mappe) {
        if (!chiaveValida(m.chiave) || immaginiConPezzi.has(m.chiave) || quantiPezzi(m.chiave) === 0) continue;
        immaginiConPezzi.set(m.chiave, immagineMostrata(rigaMappa(m.chiave)));
      }
    }
    const adesso = nowIso();
    // Lo schema non cambia durante l'importazione: colonne e tabelle si controllano una volta, non per ogni mappa e ogni pin
    // (rilievo P5 della verifica, 2026-10-03; nei test lo schema può essere indietro, per questo si controllano).
    const conRuolo = (prepared('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).some((c) => c.name === 'ruolo_immagine');
    // L3: i legami infiltrazione ↔ area (110)
    const legamiNuovi = conLegami();
    const conPresentazione = !!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get();
    const conNativo = colonnaNativoJson();
    const conSeedIdentita = colonnaSpillo('seed_identita_json');
    /** I pin tolti per essere reinseriti, per uid: id e colonne che il pacchetto può non portare (L3, andata e ritorno identica). */
    const pinDiPrima = new Map<string, { id: number; seedIdentita: string | null; nativo: string | null; condizioni: string | null }>();
    /** Le immagini dei pin tolti per essere reinseriti, per uid: quelle che tornano identiche si riprendono, le altre si tolgono in fondo. */
    const immaginiPinDiPrima = new Map<string, RigaImmagineSpillo[]>();
    // I pin che erano già senza uid lo ricevono adesso, come prima al primo pin inserito (in ordine di id, prima dei nuovi):
    // poi `assegnaUidMancanti` serve solo per un pin nuovo rimasto senza uid, e non va più rifatta per ogni pin.
    if (conUid) assegnaUidMancanti(getDb());
    // prima le mappe (in ordine di dipendenza: i genitori possono arrivare dopo → secondo passaggio per i genitori)
    for (const m of pacchetto.mappe) {
      if (!chiaveValida(m.chiave) || !(TIPI_MAPPA as readonly string[]).includes(m.tipo)) { esito.saltate.push(m.chiave); continue; }
      const esistente = prepared('SELECT origine FROM mappa WHERE chiave = ?').get(m.chiave) as { origine: string } | undefined;
      if (esistente && !opz.sovrascrivi && !(origine === 'seed' && esistente.origine === 'seed')) { esito.saltate.push(m.chiave); continue; }
      if (esistente && origine === 'seed' && esistente.origine === 'utente') { esito.saltate.push(m.chiave); continue; }
      // il ruolo dell'immagine lo dichiara il pacchetto; se tace, l'immagine c'è ma non è una pianta del gioco
      const ruolo: RuoloImmagine = m.ruoloImmagine && (RUOLI_IMMAGINE as readonly string[]).includes(m.ruoloImmagine)
        ? m.ruoloImmagine
        : m.asset?.startsWith('palazzi/') ? 'emblema' : (m.asset ?? m.immagine) ? 'illustrazione-editoriale' : 'nessuna';
      prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, origine, note, updated_at${conRuolo ? ', ruolo_immagine' : ''})
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?${conRuolo ? ', ?' : ''})
        ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, ordine = excluded.ordine, immagine_chiave = COALESCE(excluded.immagine_chiave, mappa.immagine_chiave), asset = excluded.asset,
          larghezza = excluded.larghezza, altezza = excluded.altezza, origine = excluded.origine, note = excluded.note, updated_at = excluded.updated_at${conRuolo ? ', ruolo_immagine = excluded.ruolo_immagine' : ''}`)
        .run(...[m.chiave, m.nome, m.tipo, m.ordine ?? 0, m.immagine ?? null, m.asset ?? null, m.larghezza ?? null, m.altezza ?? null,
          // L3 (andata e ritorno identica): l'origine e l'ultima modifica del pacchetto, salvo un'origine forzata da chi importa (il seed)
          opz.origine ?? m.origine ?? origine, m.note ?? '', m.updatedAt ?? adesso, ...(conRuolo ? [ruolo] : [])]);
      // Il nome ora è quello dichiarato dal pacchetto: qualunque revisione fatta a mano su questa
      // riga è stata appena sovrascritta, quindi non è più lei a presentare la mappa (082) — salvo che il pacchetto dica che il suo
      // nome è rivisto (L3, difetto di andata e ritorno di lotti/L1/noreg.md §5: si azzerava su 38 planimetrie).
      if (conNomeRivisto()) prepared('UPDATE mappa SET nome_rivisto = ? WHERE chiave = ?').run(m.nomeRivisto ? 1 : 0, m.chiave);
      if (m.percorsoFisso !== undefined && colonnaMappa('percorso_fisso')) prepared('UPDATE mappa SET percorso_fisso = ? WHERE chiave = ?').run(m.percorsoFisso, m.chiave);
      // la versione di una mappa senza Area (i fogli dei Memento) viaggia da sola; quella di una planimetria con Area la importa `importaAree`
      if (!m.area && m.versione !== undefined && colonnaMappa('versione_ordine')) {
        const v = z.object({ etichetta: z.string().min(1).max(160).nullable(), ordine: z.number().int().nonnegative() }).safeParse(m.versione);
        if (!v.success) throw httpErrors.badRequest('versione-non-valida', `Versione non valida nella mappa '${m.chiave}'.`);
        prepared('UPDATE mappa SET versione_etichetta = ?, versione_ordine = ? WHERE chiave = ? AND area_chiave IS NULL').run(v.data.etichetta, v.data.ordine, m.chiave);
      }
      // il campo `aree` (le infiltrazioni della planimetria) si controlla sempre: un elenco rovinato è un 400, non un errore del database
      if (m.aree !== undefined && !z.array(z.string().trim().min(1).max(160)).max(200).safeParse(m.aree).success) {
        throw httpErrors.badRequest('aree-non-valide', `Infiltrazioni non valide nella mappa '${m.chiave}'.`);
      }
      // `entita`, `entitaLegami` e `gruppoImmagini` dei pacchetti di prima si leggono e si ignorano (L11 · B9, R11-05): le tabelle e le colonne
      // che li accoglievano non esistono più. Le infiltrazioni della planimetria sono l'elenco `aree`, o (pacchetto di prima) l'`entita` di tipo
      // area: diventano legami dell'Area della planimetria a importazione finita, sempre (qualunque schema abbia la base).
      // Le aree si verificano e si legano **dopo** il passaggio dei genitori: il Palazzo della planimetria si trova risalendo la catena nel
      // database, e a questo punto le mappe nuove del pacchetto (e quelle che il pacchetto dichiara dopo la figlia) non hanno ancora un
      // genitore (rilievo della revisione).
      const dichiarate = m.aree !== undefined ? z.array(z.string().trim().min(1).max(160)).max(200).safeParse(m.aree) : null;
      if (dichiarate && !dichiarate.success) throw httpErrors.badRequest('aree-non-valide', `Infiltrazioni non valide nella mappa '${m.chiave}'.`);
      const aree = [...new Set(dichiarate ? dichiarate.data : m.entita?.tipo === 'area' && m.entita.chiave ? [m.entita.chiave] : [])];
      areeDaLegare.push({ mappa: m.chiave, aree });
      if (m.contesti !== undefined && conPresentazione) {
        const schema=z.object({contesti:z.array(z.object({id:z.string().min(1).max(160),nome:z.string().min(1).max(240).nullable(),campo:z.string().min(1).max(80),texpack:z.number().int().nonnegative()})).max(1000)});
        const v=schema.safeParse({contesti:m.contesti??[]});
        if(!v.success || new Set(v.data.contesti.map(c=>c.id)).size!==v.data.contesti.length)throw httpErrors.badRequest('contesti-non-validi','Contesti della planimetria non validi o duplicati.');
        prepared('INSERT INTO mappa_presentazione (mappa_chiave, contesti_json) VALUES(?,?) ON CONFLICT(mappa_chiave) DO UPDATE SET contesti_json=excluded.contesti_json').run(m.chiave,JSON.stringify(v.data.contesti));
      }
      // I pezzi (102) sono sempre dell'utente: un pacchetto che li dichiara sostituisce quelli della mappa, salvo un reseed (seed sopra
      // seed, senza «sovrascrivi»), che non li tocca; un pacchetto di prima, senza il campo, li lascia com'erano. Le condizioni si
      // ripuliscono come quelle dei pin (le chiavi assenti dalla Guida si scartano e si contano), copia per copia (103).
      // Si scrivono in fondo, a immagini importate: si verificano sull'immagine d'arrivo (rilievo F2 del validatore).
      // Un pezzo della 102 (la posa accanto alla zona) si legge come un pezzo con una copia (`schemaPezziPacchetto`).
      if (m.pezzi !== undefined && conPezzi() && !(origine === 'seed' && !opz.sovrascrivi)) {
        const forma = schemaPezziPacchetto.safeParse(m.pezzi);
        if (!forma.success) throw httpErrors.badRequest('pezzi-non-validi', `Pezzi della planimetria non validi nella mappa '${chiaveMappa(m.chiave)}'.`);
        pezziDaScrivere.push({ mappa: m.chiave, pezzi: forma.data.map((p, indicePezzo) => ({ ...p, copie: p.copie.map((c, indiceCopia) => {
          const { valide, scartate } = condizioniConChiaviEsistenti(c.condizioni as RequisitoSpillo[] | undefined, pinDelPacchetto);
          esito.condizioniScartate += scartate.length;
          const copia = { ...c, condizioni: valide };
          conversioniCopie.set(copia, conversioniAccettate(c.condizioni, valide, `${m.chiave}.pezzi[${indicePezzo}].copie[${indiceCopia}]`));
          return copia;
        }) })) });
      }
      // Con «sovrascrivi» la mappa viene sostituita per intero; altrimenti (seed sopra seed) si rimpiazzano solo gli spilli della stessa
      // origine, così gli spilli aggiunti dall'utente su una mappa del seed sopravvivono al reseed.
      if(origine==='seed'&&!opz.sovrascrivi)rettificaNomiSpilliSeed(m.chiave,m.spilli??[]);
      const invariati = new Map<number, number>();
      if (origine === 'seed' && !opz.sovrascrivi) {
        const presenti=prepared("SELECT * FROM spillo WHERE mappa_chiave=? AND origine='seed' ORDER BY id").all(m.chiave) as RigaSpillo[];
        const usati=new Set<number>();
        (m.spilli??[]).forEach((s,i)=>{const r=presenti.find(r=>!usati.has(r.id)&&spilloInvariatoNelSeed(r,s,verificate.get(s)));if(r){invariati.set(i,r.id);usati.add(r.id);}});
      }
      const daTogliere = (opz.sovrascrivi ? prepared('SELECT id FROM spillo WHERE mappa_chiave = ?').all(m.chiave) : prepared('SELECT id FROM spillo WHERE mappa_chiave = ? AND origine = ?').all(m.chiave, origine)) as Array<{ id: number }>;
      // i pin che restano invariati, in un insieme (prima un array ricreato e scorso per ogni pin da togliere: P8)
      const tenuti = new Set(invariati.values());
      for (const { id } of daTogliere) {
        if (tenuti.has(id)) continue;
        // uid e voce in una lettura sola (prima due)
        const prima = conUid ? prepared(`SELECT uid${conColonnaVoce ? ', voce_chiave' : ''} FROM spillo WHERE id = ?`).get(id) as { uid: string | null; voce_chiave?: string | null } : null;
        // L3 (andata e ritorno identica): il pin che torna con lo stesso uid riprende il suo id e le colonne che un pacchetto di prima non
        // porta (identità del seed, prove native)
        if (prima?.uid) {
          const resto = prepared(`SELECT condizioni_json, ${conSeedIdentita ? 'seed_identita_json' : 'NULL AS seed_identita_json'}, ${conNativo ? 'nativo_json' : 'NULL AS nativo_json'} FROM spillo WHERE id = ?`).get(id) as { condizioni_json: string | null; seed_identita_json: string | null; nativo_json: string | null };
          pinDiPrima.set(prima.uid, { id, seedIdentita: resto.seed_identita_json, nativo: resto.nativo_json, condizioni: resto.condizioni_json });
        }
        // le voci collegate dall'utente seguono il pin reinserito con lo stesso uid, se il pacchetto non ne dice niente
        const vociPrima = conTabellaVoci ? vociProprie(id) : prima?.voce_chiave ? [prima.voce_chiave] : [];
        if (conVoce && prima?.uid && vociPrima.length > 0) vociDiPrima.set(prima.uid, vociPrima);
        if (prima?.uid) for (const d of prepared('SELECT spillo_id, mappa_chiave FROM spillo_destinazione WHERE spillo_arrivo_id = ?').all(id) as Array<{ spillo_id: number; mappa_chiave: string }>) arriviDaRicollegare.push({ spilloId: d.spillo_id, mappa: d.mappa_chiave, uid: prima.uid });
        if (prima?.uid && conAtterraggi) for (const a of prepared('SELECT id FROM dungeon_atterraggio WHERE spillo_id = ?').pluck().all(id) as number[]) atterraggiDaRicollegare.push({ id: a, uid: prima.uid });
        // L3 (come NR3-3): le immagini del pin che torna con lo stesso uid restano da parte fino a pacchetto inserito, perché quelle
        // identiche si riprendano (riga, chiave e data); le altre si tolgono subito, come prima
        const immaginiPin = prepared('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(id) as RigaImmagineSpillo[];
        if (prima?.uid) immaginiPinDiPrima.set(prima.uid, [...(immaginiPinDiPrima.get(prima.uid) ?? []), ...immaginiPin]);
        else for (const i of immaginiPin) if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
        prepared('DELETE FROM spillo WHERE id = ?').run(id);
      }
      // spilli del seed che l'utente ha modificato (ora `utente`, con l'identità di allora): il pacchetto non li reinserisce
      const identitaUtente = new Set(opz.sovrascrivi ? [] : (prepared("SELECT seed_identita_json FROM spillo WHERE mappa_chiave = ? AND origine = 'utente' AND seed_identita_json IS NOT NULL").all(m.chiave) as Array<{ seed_identita_json: string }>).map((r) => r.seed_identita_json));
      for (const [indiceSpillo, s] of (m.spilli ?? []).entries()) {
        if (invariati.has(indiceSpillo)) continue;
        if (!(TIPI_SPILLO as readonly string[]).includes(s.tipo)) continue;
        const x = Math.min(100, Math.max(0, s.x)); const y = Math.min(100, Math.max(0, s.y));
        const identita = identitaDelPacchetto({ tipo: s.tipo, nome: s.nome, riferimento: s.riferimento ?? null }, x, y);
        if (identitaUtente.has(identita) || identitaSpostate.has(identita)) continue;
        // le condizioni con chiavi assenti dalla Guida si scartano (contate nell'esito), come l'API le rifiuta: mai uno spillo nascosto per sempre
        // le regole di categoria valgono anche per un pacchetto: uno spillo di città non ha condizioni (salvo il Confidente), un consumabile è collezionabile, un riferimento estraneo alla categoria non entra
        const categoria = categoriaSpillo(s.tipo);
        const { valide, scartate } = condizioniConChiaviEsistenti(ammetteCondizioni(s.tipo) ? s.condizioni : [], pinDelPacchetto);
        esito.condizioniScartate += scartate.length;
        const riferimento = riferimentoDelPacchetto(s.riferimento, categoria);
        // L3: lo stesso pin (uid) torna col suo id, se è libero: atterraggi, arrivi e collegamenti restano quelli di prima
        const diPrima = uidValido(s.uid) ? pinDiPrima.get(s.uid as string) : undefined;
        const idDiPrima = diPrima && !prepared('SELECT 1 FROM spillo WHERE id = ?').get(diPrima.id) ? diPrima.id : null;
        // l'uid viaggia col pacchetto (così «raccolto» lo ritrova); se manca o è già preso, si calcola dall'identità. Origine e ultima
        // modifica sono quelle del pacchetto (L3), salvo un'origine forzata da chi importa (il seed)
        const info = prepared(`INSERT INTO spillo (id, mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(idDiPrima, m.chiave, s.tipo, s.nome, s.descrizione ?? '', x, y, riferimento?.tipo ?? null, riferimento?.chiave ?? null, categoria === 'consumabile' ? 1 : 0, s.ordine ?? 0, opz.origine ?? s.origine ?? origine, s.updatedAt ?? adesso,
            // le stesse condizioni del pin di prima restano scritte com'erano («[]» non diventa null)
            diPrima && JSON.stringify(condizioniDiRiga(diPrima.condizioni)) === JSON.stringify(condizioniDiRiga(jsonCondizioni(valide))) ? diPrima.condizioni : jsonCondizioni(valide));
        if (ammetteCondizioni(s.tipo)) {
          conversioniPin.set(Number(info.lastInsertRowid), { originali: s.condizioni, origine: `${m.chiave}, pin #${Number(info.lastInsertRowid)}` });
        }
        // l'id di prima preso da un'altra riga: il pin ne ha uno nuovo, i suoi riferimenti lo seguono per uid; si dice nel riepilogo (§3.6.3)
        if (diPrima && idDiPrima === null) (esito.idCambiati ??= []).push({ tipo: 'pin', uid: s.uid as string, prima: diPrima.id, dopo: Number(info.lastInsertRowid) });
        if (conSeedIdentita) {
          const seedIdentita = s.seedIdentita !== undefined ? s.seedIdentita : diPrima?.seedIdentita ?? null;
          if (seedIdentita !== null) prepared('UPDATE spillo SET seed_identita_json = ? WHERE id = ?').run(seedIdentita, Number(info.lastInsertRowid));
        }
        // (la colonna arriva con la 067; nei test lo schema puo' essere indietro, come per nativo_json)
        let uidNuovo: string | null = null;
        if (conUid) {
          if (uidValido(s.uid) && !prepared('SELECT 1 FROM spillo WHERE uid = ?').get(s.uid)) {
            prepared('UPDATE spillo SET uid = ? WHERE id = ?').run(s.uid, Number(info.lastInsertRowid));
            uidNuovo = s.uid as string;
          } else {
            // l'uid del pacchetto manca o è già preso: si calcola dall'identità, come per i pin che ne erano senza
            assegnaUidMancanti(getDb());
            uidNuovo = prepared('SELECT uid FROM spillo WHERE id = ?').pluck().get(Number(info.lastInsertRowid)) as string | null;
          }
        }
        prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(s.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));
        // la voce della guida del pin (la colonna arriva con la 094, come sopra): quella dichiarata dal pacchetto o, se tace, quella
        // che il pin aveva prima di essere reinserito; si scrive a genitori risolti, quando il Palazzo della planimetria è noto
        if (conVoce) {
          const dichiarate = vociDichiarate({ riferimento: s.riferimento ?? null, voci: s.voci, voce: s.voce });
          const uid = uidNuovo;
          const voci = dichiarate !== undefined ? dichiarate : uid ? vociDiPrima.get(uid) ?? [] : [];
          if (voci.length > 0) vociDaScrivere.push({ id: Number(info.lastInsertRowid), nome: s.nome, mappa: m.chiave, voci });
        }
        // Le prove native del pin — tipo, parte grafica, nome dello sprite, e per i tipi ancora da
        // identificare tutto ciò che serve a verificarli — vanno conservate come dato. Nella sola
        // descrizione si potevano cancellare senza che nulla se ne accorgesse, e la verifica
        // manuale sarebbe rimasta senza appigli.
        // La colonna arriva con la migrazione 046, ma il seed puo' essere caricato mentre lo
        // schema e' ancora indietro (nei test le migrazioni si applicano a scaglioni, per
        // riprodurre un'installazione vecchia): dove non c'e', le prove non si scrivono invece di
        // far fallire l'import.
        // L3: il testo salvato (`nativoJson`) vince sulla forma del seed, e un pacchetto che non le porta lascia quelle del pin di prima
        const nativo = s.nativoJson !== undefined ? s.nativoJson : s.nativo ? JSON.stringify(s.nativo) : diPrima?.nativo ?? null;
        if (nativo !== null && conNativo) prepared('UPDATE spillo SET nativo_json = ? WHERE id = ?')
          .run(nativo, Number(info.lastInsertRowid));
        const spilloId = Number(info.lastInsertRowid);
        if (pinCitati(valide).length > 0) conCondizioniSuPin.push(spilloId);
        arrivi.push({id:spilloId,valore:verificate.get(s),invalidata:s.destinazioneNonDisponibile??false});
        // L3 (come NR3-3): un'immagine che torna identica (stesso posto, didascalia e asset o byte) riprende riga, chiave e data di prima
        const immaginiDiPrima = uidValido(s.uid) ? immaginiPinDiPrima.get(s.uid as string) ?? [] : [];
        (s.immagini ?? []).forEach((img, ordine) => {
          const didascalia = (img.didascalia ?? '').slice(0, 300);
          const uguale = immaginiDiPrima.findIndex((i) => i.ordine === ordine && i.didascalia === didascalia && (img.asset
            ? !i.immagine_chiave && i.asset === img.asset
            : !!img.base64 && !!i.immagine_chiave && (prepared("SELECT contenuto FROM immagine WHERE ambito = 'spillo' AND chiave = ?").get(i.immagine_chiave) as { contenuto: Buffer | null } | undefined)?.contenuto?.equals(Buffer.from(img.base64, 'base64')) === true));
          if (uguale >= 0) {
            const i = immaginiDiPrima.splice(uguale, 1)[0];
            const idLibero = !prepared('SELECT 1 FROM spillo_immagine WHERE id = ?').get(i.id);
            prepared('INSERT INTO spillo_immagine (id, spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(idLibero ? i.id : null, spilloId, ordine, i.immagine_chiave, i.asset, i.didascalia, i.updated_at);
            if (i.immagine_chiave) esito.immagini++;
          } else if (img.asset) {
            prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, NULL, ?, ?, ?)').run(spilloId, ordine, img.asset, didascalia, adesso);
          } else if (img.base64 && img.mime) {
            const chiave = `${spilloId}-imp-${ordine}-${Date.now().toString(36)}`;
            salvaImmagine('spillo', chiave, img.mime, Buffer.from(img.base64, 'base64'));
            prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, NULL, ?, ?)').run(spilloId, ordine, chiave, didascalia, adesso);
            esito.immagini++;
          }
        });
        esito.spilli++;
      }
      esito.mappe++;
    }
    // le immagini dei pin tolti che nessun pin reinserito ha ripreso: si tolgono adesso, come si toglievano col pin
    for (const resto of immaginiPinDiPrima.values()) for (const i of resto) if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
    // Il genitore si scrive sempre per le mappe importate, anche quando è nullo o assente: una mappa che il pacchetto dichiara radice
    // (o il cui genitore non esiste) è radice anche se prima ne aveva uno — «sovrascrivi» la sostituisce per intero, come una mappa nuova.
    for (const m of pacchetto.mappe) {
      if (esito.saltate.includes(m.chiave)) continue;
      const genitore = m.genitore && m.genitore !== m.chiave && prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(m.genitore) ? m.genitore : null;
      prepared('UPDATE mappa SET genitore_chiave = ? WHERE chiave = ?').run(genitore, m.chiave);
    }
    // a genitori scritti: le stesse regole dell'app (aree esistenti e dello stesso Palazzo della planimetria)
    // (le infiltrazioni si legano all'Area della planimetria più sotto, quando le Aree ci sono tutte)
    for (const { mappa, aree } of areeDaLegare) {
      verificaAreePalazzo((prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(mappa) as { genitore_chiave: string | null }).genitore_chiave, aree);
    }
    // già verificate prima degli inserimenti; lo spillo d'arrivo descritto per nome e posizione si risolve adesso, a mappe complete
    for (const arrivo of arrivi) salvaDestinazioneSpillo(arrivo.id, arrivo.valore, arrivo.invalidata);
    // i passaggi rimasti ritrovano il loro spillo d'arrivo, reinserito con lo stesso uid sulla stessa mappa (un passaggio tolto
    // insieme alla sua mappa è già sparito in cascata, e l'UPDATE non tocca niente)
    for (const a of arriviDaRicollegare) {
      const nuovo = prepared('SELECT id FROM spillo WHERE uid = ? AND mappa_chiave = ?').pluck().get(a.uid, a.mappa) as number | undefined;
      if (nuovo !== undefined) prepared('UPDATE spillo_destinazione SET spillo_arrivo_id = ? WHERE spillo_id = ? AND mappa_chiave = ? AND spillo_arrivo_id IS NULL').run(nuovo, a.spilloId, a.mappa);
    }
    for (const a of atterraggiDaRicollegare) {
      const nuovo = prepared('SELECT s.id FROM spillo s JOIN dungeon_atterraggio d ON d.mappa_chiave = s.mappa_chiave WHERE d.id = ? AND s.uid = ?').pluck().get(a.id, a.uid) as number | undefined;
      if (nuovo !== undefined) prepared('UPDATE dungeon_atterraggio SET spillo_id = ? WHERE id = ? AND spillo_id IS NULL').run(nuovo, a.id);
    }
    // le voci della guida, con le regole del collegamento dalla guida (`erroreVoceDelPin`): una che non regge si scarta e si conta
    for (const v of vociDaScrivere) {
      const ammesse = vociAmmesse(v.nome, v.mappa, v.voci);
      esito.vociScartate += v.voci.length - ammesse.length;
      // prima della 098 la colonna tiene una voce sola: la prima ammessa
      const daScrivere = conTabellaVoci ? ammesse : ammesse.slice(0, 1);
      for (const voce of daScrivere) {
        if (conTabellaVoci) prepared('INSERT OR IGNORE INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(v.id, voce);
        else prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(voce, v.id);
        allineaStatiPunto(getDb(), voce, adesso);
      }
    }
    // Le condizioni sugli altri pin (2026-10-03), a pacchetto inserito: ogni pin citato deve esserci davvero — un pin di una
    // mappa saltata, o non reinserito, il pacchetto lo dichiarava ma non c'è — e non si chiude nessun giro (si rifiuta il
    // pacchetto, come l'editor rifiuta il salvataggio).
    for (const id of conCondizioniSuPin) {
      const p = prepared('SELECT uid, condizioni_json FROM spillo WHERE id = ?').get(id) as { uid: string | null; condizioni_json: string | null };
      const { valide, scartate } = condizioniConChiaviEsistenti(leggiCondizioniSalvate(p.condizioni_json), { delPacchetto: new Set() });
      if (scartate.length > 0) {
        esito.condizioniScartate += scartate.length;
        prepared('UPDATE spillo SET condizioni_json = ? WHERE id = ?').run(jsonCondizioni(valide), id);
      }
      if (p.uid) verificaGiro(getDb(), p.uid, valide);
    }
    // L2 (§2.3): le Aree del pacchetto, come le mappe (una che c'è si salta, salvo «sovrascrivi»; il seed non scavalca l'utente; un
    // contenitore che qui non esiste la fa saltare), poi i legami delle planimetrie importate con la loro versione, e la predefinita.
    const areeImportate = conAree() && pacchetto.aree?.length ? importaAree(pacchetto, origine, !!opz.sovrascrivi, esito, adesso) : new Set<string>();
    // L3: i legami infiltrazione ↔ area del pacchetto, per le Aree importate
    if (legamiNuovi && pacchetto.legami !== undefined) importaLegami(pacchetto, areeImportate);
    // Le planimetrie del mondo arrivate senza Area (un pacchetto di prima della 109, o mappe nuove sotto un quartiere) la ricevono
    // con la regola della migrazione, che si può rieseguire (L2, §2.3): nessuna zona del mondo resta senza Area, e gli ingressi qui
    // sotto si controllano sulle Aree. Lo stesso per le planimetrie dei Palazzi (L3, regola della 110).
    if (conAree()) assegnaAreeDelMondo109(getDb(), adesso);
    if (legamiNuovi) {
      assegnaAreePalazzi110(getDb(), adesso);
      // un pacchetto di prima (senza `legami`): le infiltrazioni del campo `aree` di ogni planimetria diventano legami della sua Area,
      // in fondo all'infiltrazione, con quella planimetria come versione da aprire; un legame che c'è già non si tocca. Una planimetria
      // annidata dentro un'altra (le Aree sono le figlie della radice del Palazzo, 110) porta le sue all'Area dell'antenato più vicino che
      // ne ha una: sta dentro quel posto, e così non si perdono
      if (pacchetto.legami === undefined) {
        const areaDi = prepared('SELECT m.genitore_chiave, a.chiave AS area FROM mappa m LEFT JOIN area a ON a.chiave = m.area_chiave AND a.dungeon_chiave IS NOT NULL WHERE m.chiave = ?');
        for (const { mappa, aree } of areeDaLegare) {
          let area: string | null = null; let iniziale: string | null = null;
          for (let k: string | null = mappa, giri = 0; k && !area && giri < 50; giri++) {
            const r = areaDi.get(k) as { genitore_chiave: string | null; area: string | null } | undefined;
            if (!r) break;
            if (r.area) { area = r.area; iniziale = k; }
            k = r.genitore_chiave;
          }
          if (!area) continue;
          for (const inf of aree) {
            if (prepared('SELECT 1 FROM infiltrazione_area WHERE infiltrazione_chiave = ? AND area_chiave = ?').get(inf, area)) continue;
            const ordine = prepared('SELECT COALESCE(MAX(ordine) + 1, 0) FROM infiltrazione_area WHERE infiltrazione_chiave = ?').pluck().get(inf) as number;
            prepared('INSERT INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine) VALUES (?, ?, ?, ?, ?)').run(inf, area, ordine, iniziale, origine);
          }
        }
      }
    }
    sincronizzaPercorsiMappe(getDb());
    if(pacchetto.ingressi?.length && prepared("SELECT 1 FROM sqlite_master WHERE name='quartiere_ingresso'").get()) {
      const ingressi=z.array(z.object({quartiere:z.string().min(1).max(80),mappa:z.string().min(1).max(200),x:z.number().min(0).max(100),y:z.number().min(0).max(100),zoom:z.number().min(1).max(6)})).max(1000).safeParse(pacchetto.ingressi);
      if(!ingressi.success)throw httpErrors.badRequest('ingressi-non-validi','Ingressi dei quartieri non validi nel pacchetto.');
      for(const i of ingressi.data){
        const mappa=idMappa(i.mappa);
        if(!prepared('SELECT 1 FROM quartiere WHERE chiave=?').get(i.quartiere)||!prepared('SELECT 1 FROM mappa WHERE chiave=?').get(mappa))throw httpErrors.badRequest('ingresso-non-trovato','Un ingresso cita un quartiere o una mappa inesistente.');
        // l'ingresso sta in un'Area di quel quartiere (L2, R2-21; difetto FUN2-1): come la PUT, l'import non lo scrive altrove
        verificaIngressoNelQuartiere(i.quartiere, mappa);
        if(opz.sovrascrivi&&origine!=='seed')prepared('DELETE FROM quartiere_ingresso WHERE quartiere_chiave=?').run(i.quartiere);
        // colonne dette per nome (dalla 109 la tabella ha anche l'Area, che si deduce dalla planimetria)
        prepared('INSERT OR IGNORE INTO quartiere_ingresso (quartiere_chiave, mappa_chiave, x, y, zoom, area_chiave) VALUES (?, ?, ?, ?, ?, (SELECT area_chiave FROM mappa WHERE chiave = ?))').run(i.quartiere,mappa,i.x,i.y,i.zoom,mappa);
      }
    }
    for (const [chiave, img] of Object.entries(pacchetto.immagini ?? {})) {
      if (!img?.base64 || !img.mime) continue;
      if (!pacchetto.mappe.some((m) => m.immagine === chiave && !esito.saltate.includes(m.chiave))) continue;
      // Dimensioni (L1, F6 del validatore): `salvaImmagine` registra l'immagine sulla mappa con la regola di ogni strada
      // (`dopoImmagineMappa`): quelle dell'intestazione vincono su quelle dichiarate dal pacchetto, già scritte sulla riga; se
      // l'intestazione non si legge (SVG) restano quelle del pacchetto.
      const contenuto = Buffer.from(img.base64, 'base64');
      // L3 (difetto NR3-3): un'immagine identica byte per byte a quella già salvata (il formato lo dicono i byte, `salvaImmagine`) non
      // si riscrive: nome del file, data, versione `?v=` e miniature restano quelli di prima. La mappa la registra comunque, con le
      // dimensioni dell'intestazione, come farebbe `salvaImmagine`.
      const salvata = prepared("SELECT contenuto FROM immagine WHERE ambito = 'mappa' AND chiave = ?").get(chiave) as { contenuto: Buffer | null } | undefined;
      if (salvata?.contenuto && salvata.contenuto.equals(contenuto)) dopoImmagineMappa(getDb(), chiave, contenuto);
      else salvaImmagine('mappa', chiave, img.mime, contenuto);
      esito.immagini++;
    }
    // Il ruolo dichiarato dal pacchetto (o dedotto alla vecchia maniera, se tace) cede alla regola della gerarchia (L1): mappe e
    // immagini sono scritte, e ogni ruolo si riallinea, come per ogni altra strada che le scrive.
    if (conRuolo) allineaRuoliImmagine(getDb());
    // I pezzi (102), a immagini scritte: la zona di ognuno e l'ingombro di ogni sua copia (103) devono stare nell'immagine della
    // mappa d'arrivo (come all'API); le copie che escono si scartano, e con loro il pezzo rimasto senza copie (o con la zona fuori);
    // tutto, se la mappa non ha un'immagine di cui leggere le dimensioni. Si contano.
    for (const { mappa, pezzi } of pezziDaScrivere) {
      let dim: DimensioniMappa | null;
      try { dim = dimensioniDellaMappa(rigaMappa(mappa)); } catch { dim = null; }
      const { dentro, pezziScartati, copieScartate } = pezziNellImmagine(pezzi, dim);
      esito.pezziScartati += pezziScartati;
      esito.copieScartate += copieScartate;
      const scritti = sostituisciPezzi(mappa, dentro, (c) => (esito.idCambiati ??= []).push(c));
      for (const p of dentro) for (const c of p.copie) {
        const recuperate = conversioniCopie.get(c) ?? [];
        if (recuperate.length) (esito.condizioniConvertite ??= []).push(...recuperate);
      }
      esito.pezzi += scritti.pezzi;
      esito.copie += scritti.copie;
    }
    // Una mappa con dei pezzi che, importata, mostra un'immagine diversa da prima (contenuto nuovo, un'altra immagine già presente,
    // l'asset predefinito al posto di quella caricata…) perde i pezzi ritagliati dalla vecchia, se il pacchetto non gliene porta di
    // nuovi: la regola dell'editor (scelta dell'utente del 2026-10-14, «Chiedere conferma ed eliminarli»; importare è già la
    // conferma). Si confronta l'immagine mostrata, byte per byte: una identica li lascia (rilievo F3 e nota N1 del validatore).
    const conPezziNuovi = new Set(pezziDaScrivere.map((p) => p.mappa));
    for (const [mappa, prima] of immaginiConPezzi) {
      if (conPezziNuovi.has(mappa)) continue;
      const dopo = immagineMostrata(rigaMappa(mappa));
      if (prima === null ? dopo === null : dopo !== null && prima.equals(dopo)) continue;
      esito.pezziEliminati += quantiPezzi(mappa);
      esito.copieEliminate += quanteCopie(mappa);
      eliminaPezziDellaMappa(mappa);
    }
    // L4: le divergenze «da verificare» dei pin tolti dal pacchetto e non tornati (un pin che torna con lo stesso uid le tiene)
    if (conUid && conDivergenze(getDb())) prepared('DELETE FROM divergenza_partita WHERE spillo_uid NOT IN (SELECT uid FROM spillo WHERE uid IS NOT NULL)').run();
    // §8.11: e il loro stato per infiltrazione; poi gli stati delle partite seguono i legami nuovi (forma dei pin, pin nuovi delle voci
    // fatte, specchio)
    if (conUid && conStatoPerInfiltrazione(getDb())) prepared('DELETE FROM spillo_partita_infiltrazione WHERE spillo_uid NOT IN (SELECT uid FROM spillo WHERE uid IS NOT NULL)').run();
    riallineaStati(getDb(), mPrima, adesso);
    // L3 (andata e ritorno identica): l'ultima modifica di ogni mappa importata è quella del pacchetto, anche dopo i passi che la
    // ritoccano (immagini, ruoli, percorsi); un pacchetto di prima, che non la porta, lascia quella dell'import
    for (const m of pacchetto.mappe) {
      if (m.updatedAt === undefined || esito.saltate.includes(m.chiave)) continue;
      prepared('UPDATE mappa SET updated_at = ? WHERE chiave = ? AND updated_at IS NOT ?').run(m.updatedAt, m.chiave, m.updatedAt);
    }
    // Dopo la verifica dei riferimenti tra pin: una condizione scartata a fine import non deve comparire tra i recuperi.
    for (const [id, candidata] of conversioniPin) {
      const r = prepared('SELECT condizioni_json FROM spillo WHERE id = ?').get(id) as { condizioni_json: string | null } | undefined;
      if (!r) continue;
      const recuperate = conversioniAccettate(candidata.originali, leggiCondizioniSalvate(r.condizioni_json), candidata.origine);
      if (recuperate.length) (esito.condizioniConvertite ??= []).push(...recuperate);
    }
  })();
  return esito;
}

