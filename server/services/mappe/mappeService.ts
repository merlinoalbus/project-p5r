import { calcolaCollezioniImmagini } from './collezioniImmagini.js';
import { isDeepStrictEqual } from 'node:util';
import { RETTIFICHE_NOMI_SEED } from './rettificheNomiSeed.js';
import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe.js';
import { assegnaUidMancanti, uidValido } from './identitaSpillo.js';
import type { DestinazioneSpillo, NativoSpilloDto, RuoloImmagine } from '../../../shared/types.js';
import { RUOLI_IMMAGINE } from '../../../shared/types.js';
import { destinazionePerPacchetto, leggiDestinazioneSpillo, risolviSpilloArrivo, salvaDestinazioneSpillo, verificaDestinazioneSpillo, type DestinazioneDaSalvare } from './destinazioniSpillo.js';
import { idMappa, chiaveMappa, nomePercorso, sincronizzaPercorsiMappe } from './percorsiMappe.js';
import { slug } from '../../../shared/slug.js';
// ============================================================
// mappeService — albero delle mappe, spilli con stato per partita, editor, esportazione/importazione (Fase 13.1)
// ============================================================

import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { t } from '../traduzioniService.js';
import { eliminaImmagine, fileImmagine, leggiImmagine, salvaImmagine } from '../immaginiService.js';
import { dettaglioNegozio } from '../negoziService.js';
import { giocabili } from '../squadraService.js';
import { nomiCondizioni } from '../condizioni/nomiCondizioni.js';
import { statoDisponibilitaPartita, valutaRequisitiSpillo, type StatoDisponibilita } from '../disponibilitaService.js';
import { allineaBossDellaGuida, palazzoDiIngresso, palazzoDiOgniMappa } from '../palazziService.js';
import { allineaEnigmaDellaVoce, allineaStatiPunto, erroreVoceDelPin, pinDelPuntoGuida, segnaPassiDellEnigma, voceDelPin } from './collegamentiGuida.js';
import { z } from 'zod';
import { descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaRequisitoSpillo, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { senzaGergo } from '../../../shared/nomiMappe.js';
import { eStrutturale, categoriaSpillo, DEFINIZIONI_SPILLO, RIFERIMENTI_PER_CATEGORIA, TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO, assetPredefinitoMappa, puntoDescrittivo, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../../shared/spilli.js';
import type { CondizioneSpilloDto, DettaglioSpilloDto, DisponibilitaDto, EsportazioneMappeDto, ImmagineSpilloDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../../../shared/types.js';

interface RigaMappa { chiave: string; nome: string; tipo: TipoMappa; genitore_chiave: string | null; ordine: number; immagine_chiave: string | null; asset: string | null; larghezza: number | null; altezza: number | null; entita_tipo: string | null; entita_chiave: string | null; origine: 'seed' | 'utente'; note: string; updated_at: string; ruolo_immagine: RuoloImmagine; nome_rivisto?: number }
interface RigaImmagineSpillo { id: number; spillo_id: number; ordine: number; immagine_chiave: string | null; asset: string | null; didascalia: string; updated_at: string }
interface RigaSpillo { area_guida_chiave?: string|null; solo_posizione: number; id: number; uid: string; mappa_chiave: string; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento_tipo: TipoRiferimento | null; riferimento_chiave: string | null; collezionabile: number; ordine: number; origine: 'seed' | 'utente'; updated_at: string; condizioni_json: string | null; seed_identita_json: string | null; nativo_json?: string | null; /** La voce della guida del pin (094). */ voce_chiave?: string | null }

/** La colonna della 082 c'è dal suo turno in poi; prima il nome rivisto non è dichiarabile. */
function conNomeRivisto(): boolean {
  return (prepared('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).some((c) => c.name === 'nome_rivisto');
}

function rigaMappa(chiave: string): RigaMappa {
  const r = prepared('SELECT * FROM mappa WHERE chiave = ?').get(idMappa(chiave)) as RigaMappa | undefined;
  if (!r) throw httpErrors.notFound('mappa-non-trovata', `La mappa '${chiave}' non esiste.`);
  return r;
}

function conteggi(chiave: string): { spilli: number; figli: number } {
  return {
    spilli: (prepared('SELECT COUNT(*) AS n FROM spillo WHERE mappa_chiave = ?').get(chiave) as { n: number }).n,
    // I figli si contano fra quelli che si vedono: il nodo dei Memento è tolto dall'albero, e
    // contarlo lo stesso faceva dire a Tokyo «venticinque luoghi» mostrandone ventiquattro. Un
    // conteggio che non torna con l'elenco sotto è peggio che nessun conteggio.
    figli: (prepared("SELECT COUNT(*) AS n FROM mappa WHERE genitore_chiave = ? AND chiave <> 'citta-mementos'")
      .get(chiave) as { n: number }).n,
  };
}

/** Chiave dell'immagine di base nell'istanza: quella registrata, altrimenti un'immagine dell'ambito «mappa» con la chiave della mappa
 * (le piante scaricate dalla guida per aree e quartieri usano proprio quella chiave). */
function immagineDi(r: RigaMappa): { chiave: string; createdAt: string } | null {
  for (const chiave of [r.immagine_chiave, chiaveMappa(r.chiave), r.chiave]) {
    if (!chiave) continue;
    const img = leggiImmagine('mappa', chiave);
    if (img) return { chiave, createdAt: img.createdAt };
  }
  return null;
}

function presentazioneMappa(chiave: string): Pick<MappaRiassuntoDto, 'contesti' | 'gruppoImmagini'> {
  if(!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get())return {};
  const r=prepared('SELECT contesti_json,gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave=?').get(chiave) as {contesti_json:string;gruppo_immagini_json:string|null}|undefined;
  return r?{contesti:JSON.parse(r.contesti_json),...(r.gruppo_immagini_json?{gruppoImmagini:JSON.parse(r.gruppo_immagini_json)}:{})}:{};
}

function collezioniImmagini(){
 const righe=prepared('SELECT * FROM mappa').all() as RigaMappa[];
 // La numerazione delle omonime riguarda le piante del gioco: l'illustrazione di un quartiere
 // porta lo stesso nome ma è un'altra cosa, e non entra nella collezione.
 return calcolaCollezioniImmagini(righe.map(r=>({chiave:r.chiave,genitore:r.genitore_chiave,nome:r.nome,ordine:r.ordine,...presentazioneMappa(r.chiave),fisica:r.ruolo_immagine==='planimetria-nativa'})));
}
function riassunto(r: RigaMappa, collezioni=collezioniImmagini()): MappaRiassuntoDto {
  const c = conteggi(r.chiave);
  const img = immagineDi(r);
  return {
    ...presentazioneMappa(r.chiave),
    ...(collezioni.has(r.chiave)?{immagineCollezione:collezioni.get(r.chiave)}:{}),
    chiave: chiaveMappa(r.chiave), nome: r.nome, nomeCompleto:nomePercorso(r.chiave), tipo: r.tipo, genitore: r.genitore_chiave?chiaveMappa(r.genitore_chiave):null, ordine: r.ordine,
    genitoreNome: r.genitore_chiave ? (prepared('SELECT nome FROM mappa WHERE chiave = ?').get(r.genitore_chiave) as {nome:string}|undefined)?.nome ?? null : null,
    immagineUrl: img ? `/api/immagini/mappa/${encodeURIComponent(img.chiave)}/file` : null,
    asset: assetPredefinitoMappa(chiaveMappa(r.chiave)), assetOriginale:r.asset, entita: r.entita_tipo && r.entita_chiave ? { tipo: r.entita_tipo, chiave: r.entita_chiave } : null,
    ruoloImmagine: r.ruolo_immagine,
    origine: r.origine, nomeRivisto: r.nome_rivisto === 1, numeroSpilli: c.spilli, numeroFigli: c.figli, updatedAt: r.updated_at,
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

/** Le radici date e tutta la loro discendenza, seguendo i genitori finché l'insieme smette di crescere. */
function discendenzaDi(radici: string[]): Set<string> {
  const dentro = new Set<string>(radici);
  const nodi = prepared('SELECT chiave, genitore_chiave FROM mappa').all() as Array<{ chiave: string; genitore_chiave: string | null }>;
  for (let cresciuto = true; cresciuto;) {
    cresciuto = false;
    for (const n of nodi) {
      if (n.genitore_chiave && dentro.has(n.genitore_chiave) && !dentro.has(n.chiave)) {
        dentro.add(n.chiave);
        cresciuto = true;
      }
    }
  }
  return dentro;
}

/** Albero completo (piatto, con genitore): radici prima, poi per ordine. Senza i Memento. */
export function elencaMappe(): MappaRiassuntoDto[] {
  const collezioni=collezioniImmagini();
  const memento = discendenzaDi(RADICI_MEMENTO);
  return (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, nome').all() as RigaMappa[])
    .filter((r) => !memento.has(r.chiave))
    .map(r=>riassunto(r,collezioni));
}

function percorsoDi(r: RigaMappa): Array<{ chiave: string; nome: string }> {
  const out: Array<{ chiave: string; nome: string }> = [];
  let corrente: RigaMappa | undefined = r;
  const visti = new Set<string>();
  while (corrente && !visti.has(corrente.chiave)) {
    visti.add(corrente.chiave);
    out.unshift({ chiave: corrente.chiave, nome: corrente.nome });
    corrente = corrente.genitore_chiave ? (prepared('SELECT * FROM mappa WHERE chiave = ?').get(corrente.genitore_chiave) as RigaMappa | undefined) : undefined;
  }
  return out;
}

function dettaglioRiferimento(tipo: TipoRiferimento | null, chiave: string | null, partitaId?: number): DettaglioSpilloDto | null {
  if (!tipo || !chiave) return null;
  switch (tipo) {
    case 'mappa': {
      const m = prepared('SELECT * FROM mappa WHERE chiave = ?').get(chiave) as RigaMappa | undefined;
      if (!m) return null;
      const img = immagineDi(m);
      return { tipo: 'mappa', mappa: { chiave: chiaveMappa(m.chiave), nome: m.nome, tipo: m.tipo }, immagine: { url: img ? `/api/immagini/mappa/${encodeURIComponent(img.chiave)}/file` : null, asset: m.asset } };
    }
    case 'punto': {
      const p = prepared('SELECT p.chiave, p.tipo, p.nome, p.descrizione, p.esauribile, a.dungeon_chiave, a.chiave AS area_chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(chiave) as { chiave: string; tipo: string; nome: string; descrizione: string; esauribile: number; dungeon_chiave: string; area_chiave: string } | undefined;
      if (!p) return null;
      // una voce descrittiva non ha stato: uno rimasto da prima si ignora, come nella scheda del Palazzo (2026-10-01)
      const stato = partitaId && !puntoDescrittivo(p.tipo) ? (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, chiave) as { stato: string } | undefined)?.stato ?? null : null;
      return { tipo: 'punto', punto: { chiave: p.chiave, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dungeon: p.dungeon_chiave, area: p.area_chiave, stato } };
    }
    case 'attivita':
    case 'luogo': {
      const l = prepared('SELECT chiave, quartiere_chiave, tipo, nome, cosa_offre, quando FROM luogo WHERE chiave = ?').get(chiave) as { chiave: string; quartiere_chiave: string; tipo: string; nome: string; cosa_offre: string; quando: string | null } | undefined;
      if (!l) return null;
      // il negozio che ha qui la sua sede (migrazione 072): il primo, se più d'uno
      const sede = prepared('SELECT chiave FROM negozio WHERE sede_chiave = ? AND nascosto = 0 ORDER BY ordine LIMIT 1').get(l.chiave) as { chiave: string } | undefined;
      const negozio = sede ? negozioDettaglio(sede.chiave, partitaId) : null;
      return { tipo, luogo: { chiave: l.chiave, quartiere: l.quartiere_chiave, tipo: l.tipo, nome: l.nome, cosaOffre: l.cosa_offre, quando: l.quando }, negozio };
    }
    case 'negozio': {
      const n = negozioDettaglio(chiave, partitaId);
      return n ? { tipo: 'negozio', negozio: n } : null;
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

function negozioDettaglio(chiave: string, partitaId?: number): NonNullable<DettaglioSpilloDto['negozio']> | null {
  try {
    const n = dettaglioNegozio(chiave, partitaId);
    return { chiave: n.chiave, nome: n.nome, tipo: n.tipo, disponibilita: n.disponibilita, articoli: n.articoliElenco.map((a) => ({ chiave: a.chiave, nome: a.nomeIt ?? a.nome, categoria: a.categoria, prezzo: a.prezzo, disponibileDal: a.disponibileDal, comprato: a.acquistato, disponibilita: a.disponibilita })) };
  } catch {
    return null;
  }
}

/** Le prove native dello spillo, se ne ha.
 *
 * Un JSON illeggibile non deve far cadere la mappa: se il campo e' corrotto lo spillo resta,
 * semplicemente senza prove. Ma non si inventa un oggetto vuoto al suo posto, perche' «prove
 * assenti» e «prove che non si riescono a leggere» sono due cose diverse.
 */
/** Se lo schema corrente ha gia' la colonna delle prove native (migrazione 046). */
function colonnaSpillo(nome: string): boolean {
  const colonne = getDb().prepare("SELECT name FROM pragma_table_info('spillo')").all() as Array<{ name: string }>;
  return colonne.some((c) => c.name === nome);
}
function colonnaNativoJson(): boolean { return colonnaSpillo('nativo_json'); }

function nativoDiSpillo(r: RigaSpillo): NativoSpilloDto | null {
  if (!r.nativo_json) return null;
  try { return JSON.parse(r.nativo_json) as NativoSpilloDto; } catch { return null; }
}

function immaginiDiSpillo(spilloId: number): ImmagineSpilloDto[] {
  return (prepared('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(spilloId) as RigaImmagineSpillo[]).map((i) => ({
    id: i.id, url: i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave) ? `/api/immagini/spillo/${encodeURIComponent(i.immagine_chiave)}/file` : null, asset: i.asset, didascalia: i.didascalia, ordine: i.ordine,
  }));
}

/** Contesto comune agli spilli di una risposta: partita, spilli raccolti, stato per le condizioni, nomi per le descrizioni. */
interface ContestoSpilli { partitaId?: number; raccolti?: Set<string>; st?: StatoDisponibilita | null; nomi?: NomiCondizioni; palazzi?: Map<string, string>; destinazioni?: Map<number, string> }

/** Nomi (Confidenti, quartieri, richieste, Palazzi) per descrivere le condizioni: letti una volta per risposta. */

function contestoSpilli(partitaId?: number): ContestoSpilli {
  if (partitaId && !prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  // «raccolto» è legato all'uid dello spillo (067): sopravvive a un pacchetto reimportato o a un gioco.db sostituito
  const raccolti = partitaId ? new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((x) => x.spillo_uid)) : undefined;
  const st = partitaId ? statoDisponibilitaPartita(partitaId) : null;
  // per gli ingressi dei Palazzi completati: le mappe di ogni Palazzo e le destinazioni degli spilli, lette una volta
  const destinazioni = st && st.palazziCompletati.size > 0 && prepared("SELECT 1 FROM sqlite_master WHERE name='spillo_destinazione'").get()
    ? new Map((prepared('SELECT spillo_id, mappa_chiave FROM spillo_destinazione WHERE mappa_chiave IS NOT NULL').all() as Array<{ spillo_id: number; mappa_chiave: string }>).map((d) => [d.spillo_id, d.mappa_chiave]))
    : undefined;
  return { partitaId, raccolti, st, nomi: nomiCondizioni(), palazzi: st && st.palazziCompletati.size > 0 ? palazzoDiOgniMappa() : undefined, destinazioni };
}

/**
 * Un Palazzo completato non ha più ingresso (scelta dell'utente, 2026-09-30: «sparisce a Palazzo completato»,
 * come nel gioco): lo spillo che da fuori porta dentro — l'ingresso dalla città, il passaggio da Tokyo — risulta
 * bloccato, anche prima della scadenza. Si valuta qui, sul collegamento, e non con una condizione scritta sullo
 * spillo: così vale anche per gli ingressi aggiunti o modificati a mano e sopravvive a ogni sincronizzazione.
 */
function senzaIngressoAPalazzoCompletato(esito: DisponibilitaDto | undefined, r: RigaSpillo, ctx: ContestoSpilli): DisponibilitaDto | undefined {
  if (!esito || !ctx.st || !ctx.palazzi) return esito;
  const dungeon = palazzoDiIngresso(r, ctx.destinazioni?.get(r.id) ?? null, ctx.palazzi);
  const perche = dungeon ? ctx.st.palazziCompletati.get(dungeon) : undefined;
  if (!dungeon || !perche) return esito;
  const nome = (ctx.nomi ?? nomiCondizioni()).dungeon?.[dungeon] ?? dungeon;
  return {
    stato: 'bloccato',
    requisiti: [...esito.requisiti, { indice: esito.requisiti.length, tipo: 'palazzo', testo: `${nome} non ancora completato`, stato: 'rosso', dettaglio: `${nome}: completato (${perche}), non ci si entra più`, manuale: false, confermato: false }],
  };
}

/** Condizioni salvate nello spillo (JSON) → elenco normalizzato; un JSON rovinato vale come nessuna condizione. */
export function condizioniDiRiga(json: string | null): RequisitoSpillo[] {
  return leggiCondizioniSalvate(json);
}

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
  if (!esito || !negozio) return esito ?? negozio;
  const peggiore = esito.stato === 'bloccato' || negozio.stato === 'bloccato' ? 'bloccato'
    : esito.stato === 'ignoto' || negozio.stato === 'ignoto' ? 'ignoto' : 'disponibile';
  return { stato: peggiore, requisiti: [...esito.requisiti, ...negozio.requisiti.map((r, i) => ({ ...r, indice: esito.requisiti.length + i, testo: `Negozio: ${r.testo}` }))] };
}

type DettagliSpillo = Omit<SpilloDto, 'mappaChiave' | 'x' | 'y' | 'destinazione' | 'destinazioneNonDisponibile'>;
function dettagliSpillo(r: RigaSpillo, ctx: ContestoSpilli = {}): DettagliSpillo {
  const dettaglio = dettaglioRiferimento(r.riferimento_tipo, r.riferimento_chiave, ctx.partitaId);
  // la voce della guida del pin (094): il suo campo, o il riferimento «punto» degli elementi senza mappa di prima
  const chiaveVoce = voceDelPin(r);
  const voce = !chiaveVoce ? null
    : dettaglio?.tipo === 'punto' && dettaglio.punto?.chiave === chiaveVoce ? dettaglio.punto
    : (dettaglioRiferimento('punto', chiaveVoce, ctx.partitaId)?.punto ?? null);
  let raccolto = ctx.raccolti?.has(r.uid) ?? false;
  // Un punto di dungeon già gestito nella Guida (ottenuto/esaurito) conta come raccolto anche sulla mappa.
  if (voce?.stato) raccolto = true;
  const nomi = ctx.nomi ?? nomiCondizioni();
  const condizioni: CondizioneSpilloDto[] = condizioniDiRiga(r.condizioni_json).map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) }));
  // con la partita ogni condizione ha il suo semaforo: rosso ⇒ lo spillo è nascosto sulla mappa. La richiesta si valuta col nome
  // (il valutatore dei semafori lo usa nel dettaglio e riconosce sia la chiave sia il nome), nel DTO resta la chiave per l'editor.
  const perValutazione = condizioni.map((c) => (c.tipo === 'richiesta' ? { ...c, richiesta: nomi.richieste?.[c.richiesta] ?? c.richiesta } : c));
  const esito = senzaIngressoAPalazzoCompletato(conNegozioVivo(ctx.st ? valutaRequisitiSpillo(perValutazione, ctx.st) : undefined, dettaglio), r, ctx);
  // Un pin che viene dall'atlante nativo e' un elemento fisso del mondo — una porta, un forziere,
  // una scala, una stanza sicura — e non si nasconde mai, qualunque condizione gli venga
  // attaccata. E' un invariante del runtime, non una convenzione dei dati: passa sopra a
  // qualunque strada di scrittura, l'API, l'editor, il seed o una modifica diretta al database.
  // La condizione resta scritta e si vede, ma non fa sparire il pin: nascondere una porta finche'
  // non hai la chiave vorrebbe dire mostrarla solo quando non serve piu'.
  //
  // Vale per **provenienza e tipo insieme**, e servono tutte e due. La sola provenienza
  // proteggeva anche un negozio disegnato sulla planimetria nativa, che invece di sera chiude e
  // il pin deve sparire; il solo tipo avrebbe protetto il passaggio che dalla mappa di Tokyo
  // porta a un quartiere non ancora sbloccato, che in aprile davvero non c'e'.
  const esitoVisibilita = esito && esito.stato === 'bloccato'
    && nativoDiSpillo(r) && eStrutturale(r.tipo)
    ? { ...esito, stato: 'ignoto' as const }
    : esito;
  const disponibilita = r.solo_posizione === 1 && esitoVisibilita?.stato === 'disponibile' ? undefined : esitoVisibilita;
  return {
    id: r.id, tipo: r.tipo, tipoNome: DEFINIZIONI_SPILLO[r.tipo]?.nome ?? r.tipo, colore: DEFINIZIONI_SPILLO[r.tipo]?.colore ?? '#888',
    nome: r.nome, descrizione: r.descrizione,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_tipo==='mappa'?chiaveMappa(r.riferimento_chiave):r.riferimento_chiave } : null,
    soloPosizione: r.solo_posizione === 1, collezionabile: r.collezionabile === 1, ...(nativoDiSpillo(r) ? { nativo: nativoDiSpillo(r) } : {}), condizioni, ...(disponibilita ? { disponibilita } : {}), ordine: r.ordine, origine: r.origine, raccolto, dettaglio, voce, immagini: immaginiDiSpillo(r.id), updatedAt: r.updated_at,
  };
}

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
function elementoSpilloDto(r:RigaSpillo,ctx:ContestoSpilli={}):SpilloDto|SchedaContenutoGuidaDto {
  return r.area_guida_chiave?{...dettagliSpillo(r,ctx),areaGuida:r.area_guida_chiave}:spilloDto(r,ctx);
}
export function schedeContenutiGuida(partitaId?:number):Map<number,SchedaContenutoGuidaDto> {
  const ctx=contestoSpilli(partitaId);
  const righe=prepared('SELECT * FROM spillo WHERE area_guida_chiave IS NOT NULL ORDER BY id').all() as RigaSpillo[];
  return new Map(righe.map(r=>[r.id,{...dettagliSpillo(r,ctx),areaGuida:r.area_guida_chiave!}]));
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

/** Mappa con percorso, figli, spilli (con stato della partita e dettagli delle entità collegate). */
export function dettaglioMappa(chiave: string, partitaId?: number): MappaDto {
  const r = rigaMappa(chiave);
  chiave = r.chiave;
  const collezioni=collezioniImmagini();
  const figli = (prepared('SELECT * FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, nome').all(chiave) as RigaMappa[]).map(r=>riassunto(r,collezioni));
  const ctx = contestoSpilli(partitaId);
  const spilli = (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(chiave) as RigaSpillo[]).map((s) => spilloDto(s, ctx));
  const immagine = immagineDi(r);
  return {
    ...riassunto(r,collezioni), larghezza: r.larghezza, altezza: r.altezza, note: r.note,
    immagineUrl: immagine ? `/api/immagini/mappa/${encodeURIComponent(immagine.chiave)}/file?v=${encodeURIComponent(immagine.createdAt)}` : null,
    percorso: percorsoDi(r).map(p=>({...p,chiave:chiaveMappa(p.chiave)})), figli, spilli, arrivi: arriviVerso(chiave),
    genitoreNome: r.genitore_chiave ? (prepared('SELECT nome FROM mappa WHERE chiave = ?').get(r.genitore_chiave) as { nome: string } | undefined)?.nome ?? null : null,
  };
}

/** Mappa collegata a un'entità della guida (quartiere, area…), se esiste. */
export function mappaPerEntita(tipo: string, chiave: string): MappaRiassuntoDto | null {
  const righe = prepared('SELECT m.* FROM mappa m WHERE (m.entita_tipo=? AND m.entita_chiave=?) OR EXISTS(SELECT 1 FROM mappa_entita e WHERE e.mappa_chiave=m.chiave AND e.entita_tipo=? AND e.entita_chiave=?) ORDER BY m.chiave').all(tipo,chiave,tipo,chiave) as RigaMappa[];
  return righe.length===1 ? riassunto(righe[0]) : null;
}

// ---- Editor ----

/** `passaggio`/`ritorno` (15.24) valgono solo alla creazione con un genitore: passaggio nel genitore verso la nuova mappa e viceversa. */
export interface DatiMappa { nome?: string; tipo?: TipoMappa; genitore?: string | null; ordine?: number; asset?: string | null; larghezza?: number | null; altezza?: number | null; entita?: { tipo: string; chiave: string } | null; note?: string; passaggio?: boolean; ritorno?: boolean }

const chiaveValida = (chiave: string): boolean => /^[a-z0-9][a-z0-9-]{0,179}$/.test(chiave);

/**
 * Il legame fra una mappa e l'entità della guida vive in due posti: le colonne `entita_tipo` /
 * `entita_chiave` della mappa e la tabella `mappa_entita`, che è quella che leggono la scheda del
 * Palazzo (`dungeonService`) e i contenuti della guida. L'editor scriveva solo le colonne: legare
 * una planimetria a un'area non si vedeva da nessuna parte. Qui i due posti si scrivono insieme.
 *
 * **Un'area ha una sola planimetria** (decisione dell'utente, 2026-09-18): legare un'area che ne
 * ha già un'altra stacca la precedente invece di affiancarla, così «completa» resta una misura
 * vera e l'elenco del Palazzo non mostra la stessa stanza due volte.
 */
function sincronizzaLegameEntita(chiave: string, entita: { tipo: string; chiave: string } | null, precedente: { tipo: string | null; chiave: string | null } | null = null): void {
  if (!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get()) return;
  // Si tocca **solo il legame dichiarato dalle colonne**: quello che c'era prima e quello nuovo.
  // Una mappa può essere legata anche ad altro — un luogo della città, per esempio (migrazione 054) —
  // e cancellare tutte le righe della mappa portava via legami che nessuno aveva chiesto di togliere.
  // `precedente` arriva da chi chiama, perché l'aggiornamento della riga è già avvenuto: riletto
  // dal database direbbe il legame nuovo, e quello vecchio non verrebbe tolto da nessuno.
  // Le aree sono più d'una per mappa (2026-09-29): del tipo `area` si toglie **solo l'area che le colonne
  // dichiaravano**, non tutte — le altre aree della planimetria restano. Gli altri tipi restano uno per mappa.
  // Vale anche passando da un'area a un legame di altro tipo (un quartiere, un luogo): le colonne dichiarano
  // il legame nuovo e le altre aree restano in `mappa_entita`; le aree si tolgono con `impostaAreeMappa`.
  for (const t of new Set([precedente?.tipo, entita?.tipo].filter((x): x is string => !!x && x !== 'area'))) {
    prepared('DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = ?').run(chiave, t);
  }
  if (precedente?.tipo === 'area' && precedente.chiave && !(entita?.tipo === 'area' && entita.chiave === precedente.chiave)) {
    prepared("DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area' AND entita_chiave = ?").run(chiave, precedente.chiave);
  }
  if (entita) {
    // Un'area ha una sola planimetria: si stacca **quel** legame dalla mappa che ce l'aveva, che tiene le sue altre aree.
    if (entita.tipo === 'area') staccaAreaDalleAltre(entita.chiave, chiave);
    prepared('INSERT OR REPLACE INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, ?, ?, ?)')
      .run(chiave, entita.tipo, entita.chiave, JSON.stringify({ origine: 'utente', dichiarata: 'editor' }));
  }
  // le colonne dichiarano la prima area in ordine di guida, fra tutte quelle della planimetria
  allineaColonneArea(chiave);
}

/**
 * Il Palazzo a cui appartiene una planimetria, risalendo dal suo genitore fino alla radice `dungeon-<k>`
 * (la mappa che dichiara `entita_tipo = 'dungeon'`). Null se la catena non arriva a un Palazzo.
 */
function palazzoDaGenitore(genitore: string | null): string | null {
  let cur = genitore;
  for (let passo = 0; cur && passo < 64; passo++) {
    const r = prepared('SELECT chiave, genitore_chiave, entita_tipo, entita_chiave FROM mappa WHERE chiave = ?').get(cur) as { chiave: string; genitore_chiave: string | null; entita_tipo: string | null; entita_chiave: string | null } | undefined;
    if (!r) return null;
    if (r.entita_tipo === 'dungeon' && r.entita_chiave) return r.entita_chiave;
    if (r.chiave.startsWith('dungeon-') && !r.genitore_chiave) return r.chiave.slice('dungeon-'.length);
    cur = r.genitore_chiave;
  }
  return null;
}

/**
 * Un'area si lega solo a una planimetria **del suo Palazzo**: una planimetria di Kamoshida con un'area di
 * Madarame comparirebbe in un Palazzo senza quell'area e nell'altro sotto un'area che non la contiene.
 * La radice del Palazzo non è una planimetria (non compare nell'elenco): non si lega.
 */
function verificaAreePalazzo(genitore: string | null, aree: string[]): void {
  if (!aree.length) return;
  const palazzo = palazzoDaGenitore(genitore);
  if (!palazzo) throw httpErrors.badRequest('mappa-fuori-palazzo', 'Le aree della guida si legano solo alle planimetrie di un Palazzo.');
  const segnaposti = aree.map(() => '?').join(',');
  const trovate = prepared(`SELECT chiave, dungeon_chiave FROM dungeon_area WHERE chiave IN (${segnaposti})`).all(...aree) as Array<{ chiave: string; dungeon_chiave: string }>;
  const mancanti = aree.filter((a) => !trovate.some((t) => t.chiave === a));
  if (mancanti.length) throw httpErrors.badRequest('area-inesistente', `Area della guida inesistente: ${mancanti.join(', ')}.`);
  const altrove = trovate.filter((t) => t.dungeon_chiave !== palazzo);
  if (altrove.length) throw httpErrors.badRequest('area-di-altro-palazzo', `Area di un altro Palazzo: ${altrove.map((t) => t.chiave).join(', ')}.`);
}

/** Un'area ha una sola planimetria: la si stacca dalle mappe che l'avevano, che tengono le loro altre aree. */
function staccaAreaDalleAltre(area: string, tranne: string): void {
  for (const altra of prepared("SELECT mappa_chiave FROM mappa_entita WHERE entita_tipo = 'area' AND entita_chiave = ? AND mappa_chiave <> ?").all(area, tranne) as Array<{ mappa_chiave: string }>) {
    prepared("DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area' AND entita_chiave = ?").run(altra.mappa_chiave, area);
    allineaColonneArea(altra.mappa_chiave);
  }
}

/**
 * Le colonne `entita_*` della mappa sono un legame solo, e le leggono ancora il riassunto, la scheda
 * del luogo e il pacchetto: quando la mappa è legata ad aree, dichiarano **la prima in ordine di
 * guida** (o nessuna, se non ne restano). Un legame di altro tipo (quartiere, Palazzo, luogo) non si tocca.
 */
function allineaColonneArea(mappa: string): void {
  const r = prepared('SELECT entita_tipo FROM mappa WHERE chiave = ?').get(mappa) as { entita_tipo: string | null } | undefined;
  if (!r || (r.entita_tipo !== null && r.entita_tipo !== 'area')) return;
  const prima = prepared(`SELECT e.entita_chiave AS chiave FROM mappa_entita e LEFT JOIN dungeon_area a ON a.chiave = e.entita_chiave
    WHERE e.mappa_chiave = ? AND e.entita_tipo = 'area' ORDER BY a.ordine, e.entita_chiave LIMIT 1`).get(mappa) as { chiave: string } | undefined;
  prepared('UPDATE mappa SET entita_tipo = ?, entita_chiave = ? WHERE chiave = ?').run(prima ? 'area' : null, prima?.chiave ?? null, mappa);
}

/** Le aree della guida legate a una mappa, in ordine di guida. */
export function areeDellaMappa(mappa: string): Array<{ chiave: string; nome: string; ordine: number }> {
  return prepared(`SELECT a.chiave, a.nome, a.ordine FROM mappa_entita e JOIN dungeon_area a ON a.chiave = e.entita_chiave
    WHERE e.mappa_chiave = ? AND e.entita_tipo = 'area' ORDER BY a.ordine, a.chiave`).all(mappa) as Array<{ chiave: string; nome: string; ordine: number }>;
}

/**
 * Un'area della guida che viene eliminata (2026-09-30) si stacca da ogni planimetria: le righe di
 * `mappa_entita` e le colonne che la dichiaravano. Le mappe tengono le loro altre aree, e le colonne
 * passano alla prima rimasta. Va chiamata dentro la transazione di chi elimina.
 */
export function staccaAreaDaOgniMappa(area: string): void {
  const mappe = new Set((prepared("SELECT chiave FROM mappa WHERE entita_tipo = 'area' AND entita_chiave = ?").all(area) as Array<{ chiave: string }>).map((r) => r.chiave));
  const conLegami = !!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get();
  if (conLegami) {
    for (const r of prepared("SELECT mappa_chiave FROM mappa_entita WHERE entita_tipo = 'area' AND entita_chiave = ?").all(area) as Array<{ mappa_chiave: string }>) mappe.add(r.mappa_chiave);
    prepared("DELETE FROM mappa_entita WHERE entita_tipo = 'area' AND entita_chiave = ?").run(area);
  }
  prepared("UPDATE mappa SET entita_tipo = NULL, entita_chiave = NULL WHERE entita_tipo = 'area' AND entita_chiave = ?").run(area);
  // senza la tabella dei legami (schema indietro) le colonne azzerate sono già il risultato
  if (conLegami) for (const m of mappe) allineaColonneArea(m);
}

/** Per il pacchetto delle mappe: le aree contenute (chiavi, in ordine di guida), solo se ce ne sono. */
function areePerPacchetto(mappa: string): { aree?: string[] } {
  if (!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get()) return {};
  const aree = areeDellaMappa(mappa).map((a) => a.chiave);
  return aree.length ? { aree } : {};
}

/**
 * Le aree della guida contenute in una planimetria (richiesta dell'utente, 2026-09-29: una mappa può
 * contenerne più d'una). Si passa **l'insieme**: le aree tolte si staccano, quelle nuove si aggiungono e
 * si staccano dalla planimetria che le aveva (un'area ha comunque una sola planimetria, decisione del
 * 2026-09-18); gli altri legami della mappa (luogo, quartiere) restano.
 */
export function impostaAreeMappa(chiavePubblica: string, aree: string[]): Array<{ chiave: string; nome: string; ordine: number }> {
  // la chiave che usa l'interfaccia è quella di percorso: la riga si trova come in tutte le altre operazioni
  const r = rigaMappa(chiavePubblica);
  const chiave = r.chiave;
  const uniche = [...new Set(aree)];
  if (uniche.length && chiave.startsWith('dungeon-') && !r.genitore_chiave) throw httpErrors.badRequest('mappa-fuori-palazzo', 'La mappa d\'insieme del Palazzo non è una planimetria: le aree si legano alle sue planimetrie.');
  verificaAreePalazzo(r.genitore_chiave, uniche);
  getDb().transaction(() => {
    const segnaposti = uniche.map(() => '?').join(',');
    prepared(`DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'${uniche.length ? ` AND entita_chiave NOT IN (${segnaposti})` : ''}`).run(chiave, ...uniche);
    for (const area of uniche) {
      staccaAreaDalleAltre(area, chiave);
      prepared("INSERT OR IGNORE INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, 'area', ?, ?)")
        .run(chiave, area, JSON.stringify({ origine: 'utente', dichiarata: 'editor' }));
    }
    allineaColonneArea(chiave);
    // come ogni modifica dall'app: la riga è dell'utente, e un pacchetto seed senza sovrascrittura non la tocca
    prepared("UPDATE mappa SET origine = 'utente', updated_at = ? WHERE chiave = ?").run(nowIso(), chiave);
  })();
  return areeDellaMappa(chiave);
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
 * Il **raggruppamento** di una planimetria: a quale stanza appartiene e che cosa mostra la sua
 * versione. Sono i due nomi che si leggono nella scheda del Palazzo, e finora erano intoccabili
 * perché arrivavano dall'istantanea dell'estrazione: chi cura l'atlante deve poter dire «queste
 * due tavole sono la stessa stanza» e «questa è la porzione occidentale», senza toccare il file.
 *
 * `gruppo` sposta la mappa in un'altra stanza (l'id di un gruppo esistente, o un nome nuovo che ne
 * crea uno); `etichetta` è quel che distingue la versione dentro la stanza. Il nome della mappa
 * resta cosa sua, e si cambia con `aggiornaMappa`.
 */
export function aggiornaPresentazioneMappa(chiave: string, dati: { gruppoId?: string | null; gruppoNome?: string; etichetta?: string | null }): MappaDto {
  const r = rigaMappa(chiave);
  chiave = r.chiave;
  if (!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get()) throw httpErrors.badRequest('presentazione-non-disponibile', 'Questa istanza non ha la tabella delle presentazioni.');
  const riga = prepared('SELECT contesti_json, gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(chiave) as { contesti_json: string; gruppo_immagini_json: string | null } | undefined;
  const attuale = riga?.gruppo_immagini_json ? JSON.parse(riga.gruppo_immagini_json) as GruppoImmagini : null;
  // niente gruppo e nessun nome nuovo: la mappa esce dal raggruppamento e torna a stare da sola
  const esce = dati.gruppoId === null && !dati.gruppoNome;
  let gruppo: GruppoImmagini | null = null;
  if (!esce) {
    const id = dati.gruppoId ?? attuale?.id ?? `utente:${chiave}`;
    // il nome della stanza vale per tutte le mappe del gruppo: si scrive su tutte, o due tavole
    // della stessa stanza finirebbero sotto due titoli diversi
    const nome = dati.gruppoNome?.trim() || nomeDelGruppo(id) || attuale?.nome || r.nome;
    const ordine = attuale?.ordine ?? 0;
    const etichetta = dati.etichetta === undefined ? attuale?.etichetta : (dati.etichetta?.trim() || undefined);
    // Un nome di stanza scritto da una persona vince sul nome rivisto della singola mappa (2026-09-30): senza
    // questo segno, cambiare il nome della stanza non si vedeva e cambiare quello della planimetria rinominava
    // anche la stanza. Chi entra in una stanza con il nome già scelto lo eredita.
    const nomeRivisto = !!dati.gruppoNome?.trim() || !!attuale?.nomeRivisto || gruppoConNomeRivisto(id);
    gruppo = { id, nome, ordine, ...(etichetta ? { etichetta } : {}), ...(nomeRivisto ? { nomeRivisto } : {}) };
  }
  getDb().transaction(() => {
    prepared('INSERT INTO mappa_presentazione (mappa_chiave, contesti_json, gruppo_immagini_json) VALUES (?, ?, ?) ON CONFLICT(mappa_chiave) DO UPDATE SET gruppo_immagini_json = excluded.gruppo_immagini_json')
      .run(chiave, riga?.contesti_json ?? '[]', gruppo ? JSON.stringify(gruppo) : null);
    if (gruppo && dati.gruppoNome) rinominaGruppo(gruppo.id, gruppo.nome);
    prepared("UPDATE mappa SET origine = 'utente', updated_at = ? WHERE chiave = ?").run(nowIso(), chiave);
  })();
  return dettaglioMappa(chiave);
}

/** Il nome già in uso per quel gruppo, se qualche mappa ce l'ha. */
function nomeDelGruppo(id: string): string | null {
  for (const r of prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL').all() as Array<{ gruppo_immagini_json: string }>) {
    const g = JSON.parse(r.gruppo_immagini_json) as { id: string; nome: string };
    if (g.id === id) return g.nome;
  }
  return null;
}

/** Una stanza ha un nome solo: rinominarla lo scrive su tutte le sue tavole, segnato come scelto da una persona. */
function rinominaGruppo(id: string, nome: string): void {
  for (const r of prepared('SELECT mappa_chiave, gruppo_immagini_json FROM mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL').all() as Array<{ mappa_chiave: string; gruppo_immagini_json: string }>) {
    const g = JSON.parse(r.gruppo_immagini_json) as GruppoImmagini;
    if (g.id !== id || (g.nome === nome && g.nomeRivisto)) continue;
    prepared('UPDATE mappa_presentazione SET gruppo_immagini_json = ? WHERE mappa_chiave = ?').run(JSON.stringify({ ...g, nome, nomeRivisto: true }), r.mappa_chiave);
  }
}

/**
 * Rinominare una planimetria non rinomina la sua stanza (difetto segnalato dall'utente, 2026-09-30). Il titolo
 * di una stanza senza nome scelto viene dalla sua **prima** planimetria: il suo nome, se rivisto a mano,
 * altrimenti quello del gruppo senza il gergo dell'estrattore (`titoloGruppoImmagini`). Se la mappa che cambia
 * nome è quella prima, il titolo cambierebbe con lei: si fissa com'è adesso, come nome scelto per la stanza.
 * Vale da qualunque schermata, editor compreso. Una mappa senza stanza è stanza e planimetria insieme: lì il
 * nome è uno solo, e cambia per entrambe.
 */
function nomeStanzaDaFissare(r: RigaMappa): { id: string; nome: string } | null {
  if (!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get()) return null;
  const riga = prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(r.chiave) as { gruppo_immagini_json: string | null } | undefined;
  const gruppo = riga?.gruppo_immagini_json ? JSON.parse(riga.gruppo_immagini_json) as GruppoImmagini : null;
  if (!gruppo || gruppo.nomeRivisto) return null;
  // la prima planimetria della stanza, nell'ordine in cui la scheda del Palazzo le mostra
  const membri = (prepared(`SELECT m.chiave FROM mappa m JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
    WHERE p.gruppo_immagini_json IS NOT NULL AND json_extract(p.gruppo_immagini_json, '$.id') = ? ORDER BY m.ordine, m.chiave`).all(gruppo.id) as Array<{ chiave: string }>);
  if (membri[0]?.chiave !== r.chiave) return null;
  const nome = conNomeRivisto() && r.nome_rivisto ? r.nome : senzaGergo(gruppo.nome);
  return { id: gruppo.id, nome };
}

/** Qualche tavola della stanza ha già il nome scelto da una persona. */
function gruppoConNomeRivisto(id: string): boolean {
  for (const r of prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL').all() as Array<{ gruppo_immagini_json: string }>) {
    const g = JSON.parse(r.gruppo_immagini_json) as GruppoImmagini;
    if (g.id === id && g.nomeRivisto) return true;
  }
  return false;
}

type GruppoImmagini = { id: string; nome: string; ordine: number; etichetta?: string; nomeRivisto?: boolean };

/**
 * In quale stanza sta una planimetria (richiesta dell'utente, 2026-09-30: «rendere una mappa censita come a sé
 * planimetria di un'altra, e viceversa eleggere una planimetria a mappa individuale»). La stanza è il gruppo
 * di immagini (`mappa_presentazione.gruppo_immagini_json`), e l'operazione è una sola, in transazione:
 * - `con` = un'altra planimetria: questa entra nella stanza di quella, **in fondo** alle sue versioni. Se
 *   quella non ha ancora una stanza, ne nasce una con il nome `nome` (quello con cui l'interfaccia la mostra);
 * - `con` = `null`: questa esce e diventa **una stanza a sé**, chiamata `nome`.
 * In entrambi i casi l'etichetta («che cosa mostra») resta. Solo fra planimetrie dello stesso luogo: una
 * stanza è un pezzo di un Palazzo, non un raccoglitore di tavole di posti diversi.
 */
export function impostaStanzaMappa(chiavePubblica: string, dati: { con: string | null; nome?: string }): MappaDto {
  const r = rigaMappa(chiavePubblica);
  const chiave = r.chiave;
  if (!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get()) throw httpErrors.badRequest('presentazione-non-disponibile', 'Questa istanza non ha la tabella delle presentazioni.');
  const leggi = (k: string): { contesti: string; gruppo: GruppoImmagini | null } => {
    const riga = prepared('SELECT contesti_json, gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(k) as { contesti_json: string; gruppo_immagini_json: string | null } | undefined;
    return { contesti: riga?.contesti_json ?? '[]', gruppo: riga?.gruppo_immagini_json ? JSON.parse(riga.gruppo_immagini_json) as GruppoImmagini : null };
  };
  const scrivi = (k: string, contesti: string, gruppo: GruppoImmagini) => {
    prepared('INSERT INTO mappa_presentazione (mappa_chiave, contesti_json, gruppo_immagini_json) VALUES (?, ?, ?) ON CONFLICT(mappa_chiave) DO UPDATE SET gruppo_immagini_json = excluded.gruppo_immagini_json')
      .run(k, contesti, JSON.stringify(gruppo));
    prepared("UPDATE mappa SET origine = 'utente', updated_at = ? WHERE chiave = ?").run(nowIso(), k);
  };
  const questa = leggi(chiave);
  const etichetta = questa.gruppo?.etichetta ? { etichetta: questa.gruppo.etichetta } : {};

  if (dati.con === null) {
    const nome = dati.nome?.trim() || r.nome;
    // un id nuovo: con quello di prima resterebbe nella stanza che lascia
    getDb().transaction(() => scrivi(chiave, questa.contesti, { id: `utente:${chiave}:${Date.now().toString(36)}`, nome, ordine: 0, ...etichetta, nomeRivisto: true }))();
    return dettaglioMappa(chiave);
  }

  const altra = rigaMappa(dati.con);
  if (altra.chiave === chiave) throw httpErrors.badRequest('stanza-non-valida', 'Una planimetria non può entrare nella propria stanza.');
  if (altra.genitore_chiave !== r.genitore_chiave) throw httpErrors.badRequest('stanza-di-altro-luogo', 'Le due planimetrie non stanno nello stesso luogo: una stanza raccoglie solo tavole dello stesso posto.');
  const diQuella = leggi(altra.chiave);
  getDb().transaction(() => {
    let gruppo = diQuella.gruppo;
    if (!gruppo) {
      gruppo = { id: `utente:${altra.chiave}`, nome: dati.nome?.trim() || altra.nome, ordine: 0, nomeRivisto: true };
      scrivi(altra.chiave, diQuella.contesti, gruppo);
    }
    if (questa.gruppo?.id === gruppo.id) return;
    // in fondo alle versioni della stanza: l'ordinale («Immagine N») non si sovrappone a quelli che ci sono
    let ultimo = -1;
    for (const x of prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL').all() as Array<{ gruppo_immagini_json: string }>) {
      const g = JSON.parse(x.gruppo_immagini_json) as GruppoImmagini;
      if (g.id === gruppo.id) ultimo = Math.max(ultimo, g.ordine);
    }
    scrivi(chiave, questa.contesti, { id: gruppo.id, nome: gruppo.nome, ordine: ultimo + 1, ...etichetta, ...(gruppo.nomeRivisto ? { nomeRivisto: true } : {}) });
    // Anche nell'ordine del luogo la planimetria va subito dopo l'ultima versione della stanza: le versioni si
    // mostrano nell'ordine delle mappe, e restando dov'era poteva finire davanti a quelle che c'erano già
    // («Immagine 2» sopra «Immagine 1» — verifica nel browser, 2026-09-30).
    // stesso ordinamento della scheda del Palazzo (`planimetrieDelPalazzo`): a pari ordine decide la chiave
    const fratelli = (r.genitore_chiave === null
      ? prepared('SELECT chiave, ordine FROM mappa WHERE genitore_chiave IS NULL ORDER BY ordine, chiave').all()
      : prepared('SELECT chiave, ordine FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, chiave').all(r.genitore_chiave)) as Array<{ chiave: string; ordine: number }>;
    const membri = new Set((prepared('SELECT mappa_chiave, gruppo_immagini_json FROM mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL').all() as Array<{ mappa_chiave: string; gruppo_immagini_json: string }>)
      .filter((x) => x.mappa_chiave !== chiave && (JSON.parse(x.gruppo_immagini_json) as GruppoImmagini).id === gruppo.id).map((x) => x.mappa_chiave));
    const senza = fratelli.filter((f) => f.chiave !== chiave);
    let dopo = -1;
    senza.forEach((f, i) => { if (membri.has(f.chiave)) dopo = i; });
    if (dopo >= 0) {
      const nuovo = [...senza.slice(0, dopo + 1), { chiave, ordine: -1 }, ...senza.slice(dopo + 1)];
      nuovo.forEach((f, i) => { if (f.ordine !== i) prepared('UPDATE mappa SET ordine = ? WHERE chiave = ?').run(i, f.chiave); });
    }
  })();
  return dettaglioMappa(chiave);
}

export function riordinaMappe(genitore: string | null, chiavi: string[]): MappaRiassuntoDto[] {
  const radice = genitore === null ? null : rigaMappa(genitore).chiave;
  const nelSottoalbero = (chiave: string): boolean => {
    if (radice === null) return true;
    let corrente: string | null = chiave;
    const visti = new Set<string>();
    while (corrente && !visti.has(corrente)) {
      visti.add(corrente);
      corrente = (prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(corrente) as { genitore_chiave: string | null } | undefined)?.genitore_chiave ?? null;
      if (corrente === radice) return true;
    }
    return false;
  };
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
        ? prepared('SELECT chiave FROM mappa WHERE genitore_chiave IS NULL ORDER BY ordine, nome').all()
        : prepared('SELECT chiave FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, nome').all(padre)) as Array<{ chiave: string }>;
      const finale = [...scelte, ...sorelle.map((f) => f.chiave).filter((c) => !scelte.includes(c))];
      finale.forEach((c, i) => prepared('UPDATE mappa SET ordine = ?, updated_at = ? WHERE chiave = ?').run(i, adesso, c));
      toccate.push(...finale);
    }
  })();
  const collezioni = collezioniImmagini();
  return toccate.map((c) => riassunto(rigaMappa(c), collezioni));
}

export function creaMappa(chiave: string | undefined, dati: DatiMappa & { nome: string; tipo: TipoMappa }): MappaDto {
  if(dati.genitore)dati={...dati,genitore:rigaMappa(dati.genitore).chiave};
  const richiesta=chiave;
  if(richiesta && prepared('SELECT 1 FROM mappa WHERE chiave=?').get(idMappa(richiesta)))throw httpErrors.conflict('mappa-esistente','La chiave indicata appartiene già a una mappa.');
  chiave=(dati.genitore && rigaMappa(dati.genitore).tipo!=='citta'?chiaveMappa(dati.genitore)+'-':'')+slug(dati.nome);
  if (!chiaveValida(chiave)) throw httpErrors.badRequest('chiave-non-valida', 'La chiave della mappa ammette solo minuscole, cifre e trattini (1–180 caratteri).');
  if (prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(chiave)) throw httpErrors.conflict('mappa-esistente', `Esiste già una mappa con chiave '${chiave}'.`);
  if (!(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  if (dati.genitore) rigaMappa(dati.genitore);
  if (dati.entita?.tipo === 'area') verificaAreePalazzo(dati.genitore ?? null, [dati.entita.chiave]);
  const adesso = nowIso();
  // 15.25: senza indicazione l'asset del repository è `mappe/<chiave>`, lo stesso percorso che «Esporta questo luogo» dà all'immagine di base:
  // quando il file verrà consegnato in public/asset la mappa lo userà da sola; finché manca, si usa l'immagine dell'istanza o la griglia.
  // `asset: null` esplicito resta «nessun asset».
  const asset = dati.asset === undefined ? assetPredefinitoMappa(chiave) : dati.asset;
  getDb().transaction(() => {
    prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, entita_tipo, entita_chiave, origine, note, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'utente', ?, ?)`).run(chiave, dati.nome, dati.tipo, dati.genitore ?? null, dati.ordine ?? 0, asset, dati.larghezza ?? null, dati.altezza ?? null, dati.entita?.tipo ?? null, dati.entita?.chiave ?? null, dati.note ?? '', adesso);
    sincronizzaPercorsiMappe(getDb());
    sincronizzaLegameEntita(chiave, dati.entita ?? null);
    if(richiesta&&richiesta!==chiave&&!getDb().prepare('SELECT 1 FROM mappa_alias WHERE chiave=?').get(richiesta))prepared('INSERT INTO mappa_alias VALUES(?,?)').run(richiesta,chiave);
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
  const libera = ([x, y]: [number, number]) => occupate.every((o) => Math.abs(o.x - x) >= 5 || Math.abs(o.y - y) >= 5);
  if (libera(preferita)) return preferita;
  const candidati: Array<[number, number]> = [];
  for (let x = 10; x <= 90; x += 8) for (let y = 10; y <= 90; y += 8) candidati.push([x, y]);
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
  // Il nome rivisto lo dichiara questo salvataggio, che è il modulo dell'editor e porta sempre il
  // campo «Nome»: premere Salva **è** dire «la mappa si chiama così», anche quando il testo non
  // cambia. Legarlo al cambiamento del testo lasciava senza rimedio chi il nome l'aveva già
  // corretto prima della 082: con il nome giusto già scritto non c'era più niente da cambiare, e
  // il titolo restava quello dedotto dall'estrazione. Lo spegne solo l'importazione di un
  // pacchetto, che quel nome lo sovrascrive.
  const rivisto = conNomeRivisto() ? (dati.nome !== undefined ? 1 : r.nome_rivisto ?? 0) : 0;
  // un'area si lega solo a una planimetria del suo Palazzo (controllo prima di scrivere: niente modifiche a metà)
  const genitoreDopo = dati.genitore === undefined ? r.genitore_chiave : dati.genitore;
  if (genitoreDopo !== r.genitore_chiave && prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get()) {
    // Spostata sotto un altro genitore, la planimetria porta con sé **tutte** le sue aree: devono restare
    // del Palazzo in cui arriva (rilievo della revisione). Quella che questo salvataggio sostituisce non conta.
    // Con lei si spostano le discendenti: anche le loro aree devono restare del Palazzo di arrivo.
    const sottoalbero = [chiave];
    for (let i = 0; i < sottoalbero.length; i++) for (const f of prepared('SELECT chiave FROM mappa WHERE genitore_chiave = ?').all(sottoalbero[i]) as Array<{ chiave: string }>) if (!sottoalbero.includes(f.chiave)) sottoalbero.push(f.chiave);
    const areeDopo = new Set(sottoalbero.flatMap((k) => areeDellaMappa(k).map((a) => a.chiave)));
    if (dati.entita !== undefined && r.entita_tipo === 'area' && r.entita_chiave) areeDopo.delete(r.entita_chiave);
    if (dati.entita?.tipo === 'area') areeDopo.add(dati.entita.chiave);
    verificaAreePalazzo(genitoreDopo, [...areeDopo]);
  } else if (dati.entita?.tipo === 'area') verificaAreePalazzo(genitoreDopo, [dati.entita.chiave]);
  const stanzaDaFissare = dati.nome !== undefined && dati.nome.trim() !== r.nome ? nomeStanzaDaFissare(r) : null;
  getDb().transaction(()=>{
  if (stanzaDaFissare) rinominaGruppo(stanzaDaFissare.id, stanzaDaFissare.nome);
  if (conNomeRivisto()) prepared('UPDATE mappa SET nome_rivisto = ? WHERE chiave = ?').run(rivisto, chiave);
  prepared(`UPDATE mappa SET nome = ?, tipo = ?, genitore_chiave = ?, ordine = ?, asset = ?, larghezza = ?, altezza = ?, entita_tipo = ?, entita_chiave = ?, note = ?, origine = 'utente', updated_at = ? WHERE chiave = ?`).run(
    dati.nome ?? r.nome, dati.tipo ?? r.tipo, dati.genitore === undefined ? r.genitore_chiave : dati.genitore, dati.ordine ?? r.ordine, dati.asset === undefined ? r.asset : dati.asset,
    dati.larghezza === undefined ? r.larghezza : dati.larghezza, dati.altezza === undefined ? r.altezza : dati.altezza,
    dati.entita === undefined ? r.entita_tipo : dati.entita?.tipo ?? null, dati.entita === undefined ? r.entita_chiave : dati.entita?.chiave ?? null, dati.note ?? r.note, nowIso(), chiave);
  if (dati.entita !== undefined) sincronizzaLegameEntita(chiave, dati.entita, { tipo: r.entita_tipo, chiave: r.entita_chiave });
  sincronizzaPercorsiMappe(getDb());
  })();
  return dettaglioMappa(chiave);
}

export function eliminaMappa(chiave: string): void {
  chiave=rigaMappa(chiave).chiave;
  getDb().transaction(() => {
    prepared('UPDATE mappa SET genitore_chiave = NULL WHERE genitore_chiave = ?').run(chiave);
    // gli spilli cadono in cascata con la mappa; i loro «raccolto» stanno in un altro file e si puliscono qui
    if (colonnaSpillo('uid')) prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL)").run(chiave);
    prepared('DELETE FROM mappa WHERE chiave = ?').run(chiave);
    sincronizzaPercorsiMappe(getDb());
  })();
}

/** Immagine di base nell'istanza (ambito «mappa», chiave = chiave della mappa); dimensioni lette dall'intestazione PNG/JPEG/WEBP/GIF quando possibile. */
export function impostaImmagineMappa(chiave: string, mime: string, contenuto: Buffer): MappaDto {
  chiave=rigaMappa(chiave).chiave;
  salvaImmagine('mappa', chiave, mime, contenuto);
  const dim = dimensioniImmagine(contenuto);
  prepared("UPDATE mappa SET immagine_chiave = ?, larghezza = ?, altezza = ?, origine = 'utente', updated_at = ? WHERE chiave = ?").run(chiave, dim?.larghezza ?? null, dim?.altezza ?? null, nowIso(), chiave);
  return dettaglioMappa(chiave);
}

/** Legge larghezza e altezza dalle intestazioni dei formati più comuni (PNG, GIF, JPEG, WEBP VP8/VP8L/VP8X); null se non riconosciute. */
export function dimensioniImmagine(b: Buffer): { larghezza: number; altezza: number } | null {
  if (b.length >= 24 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { larghezza: b.readUInt32BE(16), altezza: b.readUInt32BE(20) };
  if (b.length >= 10 && b.toString('ascii', 0, 3) === 'GIF') return { larghezza: b.readUInt16LE(6), altezza: b.readUInt16LE(8) };
  if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8X') return { larghezza: 1 + b.readUIntLE(24, 3), altezza: 1 + b.readUIntLE(27, 3) };
    if (tipo === 'VP8L') { const bits = b.readUInt32LE(21); return { larghezza: 1 + (bits & 0x3fff), altezza: 1 + ((bits >> 14) & 0x3fff) }; }
    if (tipo === 'VP8 ') return { larghezza: b.readUInt16LE(26) & 0x3fff, altezza: b.readUInt16LE(28) & 0x3fff };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { altezza: b.readUInt16BE(i + 5), larghezza: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

export interface DatiSpillo { soloPosizione?: boolean; destinazione?: DestinazioneSpillo | null; tipo?: TipoSpillo; nome?: string; descrizione?: string; x?: number; y?: number; riferimento?: { tipo: TipoRiferimento; chiave: string } | null; collezionabile?: boolean; ordine?: number; condizioni?: RequisitoSpillo[] | null }

/**
 * Le chiavi citate dalle condizioni devono essere calcolabili dall'app: Palazzo esistente (non i Mementos), Confidente e richiesta della
 * Guida, quartiere con una data di sblocco leggibile (gli altri quartieri non sono valutabili). Separa le valide dalle sconosciute.
 */
function condizioniConChiaviEsistenti(condizioni: RequisitoSpillo[] | null | undefined): { valide: RequisitoSpillo[]; scartate: Array<{ cosa: string; chiave: string }> } {
  const valide: RequisitoSpillo[] = [];
  const scartate: Array<{ cosa: string; chiave: string }> = [];
  const sorgente = condizioni == null ? [] : Array.isArray(condizioni) ? condizioni : [null];
  // Una condizione che cita una chiave assente non diventa testo: sparisce, e l'importazione lo riferisce.
  if(sorgente.length>20)return {valide:[],scartate:[{cosa:'Condizioni',chiave:'limite superato'}]};
  for (const originale of sorgente) {
    const c = normalizzaRequisitoSpillo(originale);
    if (!c) { scartate.push({cosa:'Condizione',chiave:'non valida'}); continue; }
    if (c.tipo === 'gruppo' || c.tipo === 'non') {
      const figli=condizioniConChiaviEsistenti(c.tipo === 'gruppo' ? c.condizioni : [c.condizione]);
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
    else if (c.tipo === 'palazzo') { cosa = 'Palazzo'; chiave = c.dungeon; ok = !!prepared("SELECT 1 FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(c.dungeon); }
    else if (c.tipo === 'confidente') { cosa = 'Confidente'; chiave = c.confidente; ok = !!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(c.confidente); }
    else if (c.tipo === 'richiesta') { cosa = 'Richiesta'; chiave = c.richiesta; ok = !!prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(c.richiesta); }
    else if (c.tipo === 'quartiere') {
      cosa = 'Quartiere con data di sblocco'; chiave = c.quartiere;
      const q = prepared('SELECT sblocco_data FROM quartiere WHERE chiave = ?').get(c.quartiere) as { sblocco_data: string | null } | undefined;
      ok = !!q && q.sblocco_data !== null;
    }
    if (ok) valide.push(c); else scartate.push({ cosa, chiave });
  }
  return { valide, scartate };
}

/** Editor (API): una chiave sconosciuta è un errore 404, non uno scarto silenzioso. */
export function verificaCondizioni(condizioni: RequisitoSpillo[] | null | undefined): void {
  const { scartate } = condizioniConChiaviEsistenti(condizioni);
  if (scartate.length > 0) {
    if (scartate[0].cosa === 'Condizione' || scartate[0].cosa === 'Condizioni') throw httpErrors.badRequest('condizione-non-valida', 'Una condizione non è valida (troppo annidata o malformata): ricontrollala nell’editor.');
    throw httpErrors.notFound('condizione-non-trovata', `${scartate[0].cosa} '${scartate[0].chiave}' non trovato nella Guida.`);
  }
}

function verificaRiferimento(rif: { tipo: TipoRiferimento; chiave: string } | null | undefined, attuale?: { tipo: string | null; chiave: string | null }): void {
  if (!rif) return;
  if (!(TIPI_RIFERIMENTO as readonly string[]).includes(rif.tipo)) throw httpErrors.badRequest('riferimento-non-valido', 'Tipo di riferimento non ammesso.');
  const tabella: Record<TipoRiferimento, string> = { mappa: 'SELECT 1 FROM mappa WHERE chiave = ?', negozio: 'SELECT 1 FROM negozio WHERE chiave = ?', punto: 'SELECT 1 FROM punto_interesse WHERE chiave = ?', luogo: 'SELECT 1 FROM luogo WHERE chiave = ?', confidente: 'SELECT 1 FROM confidente WHERE chiave = ?', richiesta: 'SELECT 1 FROM richiesta WHERE chiave = ?', attivita: 'SELECT 1 FROM luogo WHERE chiave = ?' };
  if (!prepared(tabella[rif.tipo]).get(rif.chiave)) throw httpErrors.notFound('riferimento-non-trovato', `${rif.tipo} '${rif.chiave}' non trovato.`);
  // Un collegamento **nuovo** a una voce descrittiva della guida si rifiuta, come da `collegaPinAlPunto` (2026-10-01): le
  // descrittive non hanno pin. Quello che c'è già (gli elementi della guida senza mappa di prima) resta: nessuna riconciliazione.
  if (rif.tipo === 'punto' && !(attuale?.tipo === 'punto' && attuale.chiave === rif.chiave)) {
    const p = prepared('SELECT nome, tipo FROM punto_interesse WHERE chiave = ?').get(rif.chiave) as { nome: string; tipo: string };
    if (puntoDescrittivo(p.tipo)) throw httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: non ha pin.`);
  }
}

/** La categoria del tipo decide il resto dello spillo (richiesta dell'utente, 2026-09-11).
 *
 * - **consumabile** è collezionabile per definizione, gli altri no: il campo non si sceglie;
 * - **città** non è condizionato: la disponibilità è del negozio che mostra, non del segnalino;
 * - il **riferimento** deve essere di un tipo ammesso dalla categoria (uno spostamento porta a una
 *   mappa, uno spillo di città a un negozio, un'attività, un luogo o un Confidente…): un tipo
 *   estraneo è un errore, non un dato da tenere;
 * - la **destinazione** vale solo per gli spostamenti.
 */
function applicaRegoleCategoria<T extends DatiSpillo>(tipo: TipoSpillo, dati: T): T {
  const categoria = categoriaSpillo(tipo);
  const out: DatiSpillo = { ...dati, collezionabile: categoria === 'consumabile' };
  if (categoria === 'citta') out.condizioni = [];
  if (categoria !== 'spostamento') out.destinazione = null;
  if (out.riferimento && !RIFERIMENTI_PER_CATEGORIA[categoria].includes(out.riferimento.tipo)) {
    throw httpErrors.badRequest('riferimento-non-ammesso', `Uno spillo «${DEFINIZIONI_SPILLO[tipo].nome}» (${categoria}) non può collegarsi a «${out.riferimento.tipo}».`);
  }
  return out as T;
}

/**
 * Su un pin di una planimetria un riferimento «punto» in ingresso (un client o un pacchetto di prima della 094) è la sua voce
 * della guida: va nel campo suo, con le regole del collegamento dalla guida (`erroreVoceDelPin`), e il riferimento del pin non
 * si tocca — un passaggio tiene la sua destinazione (`undefined` = invariato; uno spillo nuovo nasce senza).
 */
function separaVoce<T extends DatiSpillo>(dati: T): { dati: T; voce: string | undefined } {
  if (dati.riferimento?.tipo !== 'punto') return { dati, voce: undefined };
  return { dati: { ...dati, riferimento: undefined }, voce: dati.riferimento.chiave };
}

export function creaSpillo(mappaChiave: string, dati: DatiSpillo & { tipo: TipoSpillo; nome: string; x: number; y: number }): SpilloDto {
  return getDb().transaction(() => {
  mappaChiave=rigaMappa(mappaChiave).chiave;
  if (!(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  const separata = separaVoce(dati);
  dati = separata.dati;
  if (separata.voce) { const errore = erroreVoceDelPin({ nome: dati.nome, mappa: mappaChiave, voce: null }, separata.voce); if (errore) throw errore; }
  dati = applicaRegoleCategoria(dati.tipo, dati);
  if(dati.riferimento?.tipo==='mappa')dati={...dati,riferimento:{...dati.riferimento,chiave:rigaMappa(dati.riferimento.chiave).chiave}};
  verificaRiferimento(dati.riferimento);
  verificaCondizioni(dati.condizioni);
  const destinazione = verificaDestinazioneSpillo(dati.destinazione);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente', ?, ?)`).run(mappaChiave, dati.tipo, dati.nome, dati.descrizione ?? '', dati.x, dati.y, dati.riferimento?.tipo ?? null, dati.riferimento?.chiave ?? null,
    dati.collezionabile ? 1 : 0, dati.ordine ?? 0, adesso, jsonCondizioni(dati.condizioni));
  prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));
  if (separata.voce) prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(separata.voce, Number(info.lastInsertRowid));
  assegnaUidMancanti(getDb());
  // un pin che nasce già di una voce ne unisce gli stati, come collegarlo dalla guida
  if (separata.voce) allineaStatiPunto(getDb(), separata.voce, adesso);
  salvaDestinazioneSpillo(Number(info.lastInsertRowid), destinazione);
  prepared("UPDATE mappa SET updated_at = ? WHERE chiave = ?").run(adesso, mappaChiave);
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaSpillo);
  })();
}

export function aggiornaSpillo(id: number, dati: DatiSpillo & { mappa?: string }): SpilloDto | SchedaContenutoGuidaDto {
  return getDb().transaction(() => {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);

  if(r.area_guida_chiave && ['x','y','mappa','destinazione'].some(k=>Object.prototype.hasOwnProperty.call(dati,k)))throw httpErrors.badRequest('contenuto-non-spaziale','Una scheda guida non accetta coordinate o destinazioni.');
  if (dati.tipo && !(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  // su una planimetria il riferimento «punto» in ingresso è la voce del pin (094); gli elementi della guida senza mappa restano com'erano
  const separata = r.mappa_chiave !== null ? separaVoce(dati) : { dati, voce: undefined };
  dati = separata.dati;
  if (separata.voce) { const errore = erroreVoceDelPin({ nome: dati.nome ?? r.nome, mappa: dati.mappa ? rigaMappa(dati.mappa).chiave : r.mappa_chiave, voce: voceDelPin(r) }, separata.voce); if (errore) throw errore; }
  // spostato su un'altra planimetria, un pin di una voce resta soggetto alle stesse regole: fuori dal Palazzo della voce si rifiuta
  const voceAttuale = r.mappa_chiave !== null ? voceDelPin(r) : null;
  if (!separata.voce && voceAttuale && dati.mappa && rigaMappa(dati.mappa).chiave !== r.mappa_chiave) {
    const errore = erroreVoceDelPin({ nome: dati.nome ?? r.nome, mappa: rigaMappa(dati.mappa).chiave, voce: voceAttuale }, voceAttuale);
    // solo il Palazzo: una voce rimasta da prima (descrittiva) non impedisce di spostare il pin
    if (errore?.code === 'pin-fuori-dal-palazzo') throw errore;
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
  verificaCondizioni(dati.condizioni);
  const destinazione = verificaDestinazioneSpillo(dati.destinazione);
  // uno spillo del seed modificato diventa dell'utente: si ricorda com'era, così il reseed non ne reinserisce una copia
  const identitaSeed = r.seed_identita_json ?? (r.origine === 'seed' ? identitaSpillo({ tipo: r.tipo, nome: r.nome, x: r.x, y: r.y, riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null }) : null);
  prepared(`UPDATE spillo SET mappa_chiave = ?, tipo = ?, nome = ?, descrizione = ?, x = ?, y = ?, riferimento_tipo = ?, riferimento_chiave = ?, collezionabile = ?, ordine = ?, origine = 'utente', updated_at = ?, condizioni_json = ?, seed_identita_json = ? WHERE id = ?`).run(
    dati.mappa ?? r.mappa_chiave, dati.tipo ?? r.tipo, dati.nome ?? r.nome, dati.descrizione ?? r.descrizione, dati.x ?? r.x, dati.y ?? r.y,
    dati.riferimento === undefined ? r.riferimento_tipo : dati.riferimento?.tipo ?? null, dati.riferimento === undefined ? r.riferimento_chiave : dati.riferimento?.chiave ?? null,
    dati.collezionabile === undefined ? r.collezionabile : dati.collezionabile ? 1 : 0, dati.ordine ?? r.ordine, nowIso(), dati.condizioni === undefined ? r.condizioni_json : jsonCondizioni(dati.condizioni), identitaSeed, id);
  if (dati.soloPosizione !== undefined) prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, id);
  if (separata.voce && separata.voce !== voceDelPin(r)) {
    prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(separata.voce, id);
    allineaStatiPunto(getDb(), separata.voce, nowIso());
  }
  salvaDestinazioneSpillo(id, destinazione);
  return elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo);
  })();
}

export function eliminaSpillo(id: number): void {
  const r = prepared('SELECT id, uid FROM spillo WHERE id = ?').get(id) as { id: number; uid: string | null } | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);
  getDb().transaction(() => {
    prepared('DELETE FROM spillo WHERE id = ?').run(id);
    // «raccolto» sta in un altro file: il vincolo non lo pulisce, lo si fa qui
    if (r.uid) prepared('DELETE FROM spillo_partita WHERE spillo_uid = ?').run(r.uid);
  })();
}

/** Stato «raccolto» di uno spillo per partita (in uso normale; per gli spilli collegati a un punto aggiorna anche lo stato del punto nella Guida). */
export function impostaRaccolto(partitaId: number, spilloId: number, raccolto: boolean): SpilloDto | SchedaContenutoGuidaDto {
  assegnaUidMancanti(getDb());
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  // Un nemico si rigenera: non si segna raccolto (2026-09-30). Solo lui: «raccolto» su uno spillo collegato a un
  // punto della guida è anche il modo di segnare quel punto, qualunque sia il tipo. Togliere un «raccolto»
  // resta sempre possibile, così un segno rimasto da prima si può ripulire.
  // Un nemico collegato a un punto della guida sì (2026-10-01): è un'Ombra sciagura o un incontro unico, e segnarlo è
  // segnare quel punto.
  if (raccolto && r.tipo === 'nemico' && !voceDelPin(r)) throw httpErrors.badRequest('spillo-non-raccoglibile', `«${r.nome}» è un nemico: si rigenera, non si raccoglie.`);

  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partitaId, r.uid, raccolto ? 1 : 0, adesso);
    // una voce descrittiva della guida non ha stato (2026-10-01): il raccolto del pin non la segna
    const voce = voceDelPin(r);
    const tipoPunto = voce
      ? (prepared('SELECT tipo FROM punto_interesse WHERE chiave = ?').get(voce) as { tipo: string } | undefined)?.tipo ?? null : null;
    if (voce && tipoPunto !== null && !puntoDescrittivo(tipoPunto)) {
      // raccogliere lo spillo di un punto è segnare quel punto: è dell'utente, non un segno automatico (utente 006). Un punto
      // con più pin sulle planimetrie (2026-10-01) è segnato quando li ha raccolti **tutti**; toglierne uno lo riapre.
      const tutti = r.mappa_chiave === null || pinDelPuntoGuida(getDb(), voce)
        .every((p) => p.uid === r.uid || !!prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1').get(partitaId, p.uid));
      if (raccolto && tutti) prepared(`INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET automatico = 0`).run(partitaId, voce, adesso);
      else if (!raccolto) prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, voce);
      // un Enigma coi suoi passi (095), raggiunto da un elemento della guida di prima: i passi seguono, come segnandolo dalla guida
      const segnata = !!prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, voce);
      segnaPassiDellEnigma(getDb(), partitaId, voce, segnata ? 'ottenuto' : null, adesso);
      // un passo di un Enigma (095): l'Enigma segue i suoi passi
      allineaEnigmaDellaVoce(getDb(), partitaId, voce, adesso);
    }
    // il Tesoro del Palazzo o il boss finale raccolti sulla mappa segnano il boss finale della Guida, e lo
    // tolgono se si tolgono (scelta dell'utente, 2026-09-30)
    allineaBossDellaGuida(partitaId, r, raccolto, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return elementoSpilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo, contestoSpilli(partitaId));
}

// ---- Immagini degli spilli (schermate di riferimento) ----

function rigaSpillo(id: number): RigaSpillo {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);

  return r;
}

/** Aggiunge una schermata allo spillo (file nell'istanza, ambito «spillo»); restituisce lo spillo aggiornato. */
export function aggiungiImmagineSpillo(spilloId: number, mime: string, contenuto: Buffer, didascalia = ''): SpilloDto | SchedaContenutoGuidaDto {
  const r = rigaSpillo(spilloId);
  const chiave = `${spilloId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  salvaImmagine('spillo', chiave, mime, contenuto);
  const adesso = nowIso();
  const ordine = (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM spillo_immagine WHERE spillo_id = ?').get(spilloId) as { n: number }).n;
  prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, NULL, ?, ?)').run(spilloId, ordine, chiave, didascalia.slice(0, 300), adesso);
  prepared("UPDATE spillo SET updated_at = ? WHERE id = ?").run(adesso, spilloId);
  return elementoSpilloDto(rigaSpillo(r.id));
}

export function aggiornaImmagineSpillo(id: number, dati: { didascalia?: string; ordine?: number }): SpilloDto | SchedaContenutoGuidaDto {
  const i = prepared('SELECT * FROM spillo_immagine WHERE id = ?').get(id) as RigaImmagineSpillo | undefined;
  if (!i) throw httpErrors.notFound('immagine-non-trovata', `L'immagine ${id} non esiste.`);
  prepared('UPDATE spillo_immagine SET didascalia = ?, ordine = ?, updated_at = ? WHERE id = ?').run((dati.didascalia ?? i.didascalia).slice(0, 300), dati.ordine ?? i.ordine, nowIso(), id);
  return elementoSpilloDto(rigaSpillo(i.spillo_id));
}

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
  luogo: "SELECT chiave, nome, quartiere_chiave AS dettaglio FROM luogo WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  confidente: "SELECT chiave, nome, arcana AS dettaglio FROM confidente WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  richiesta: "SELECT chiave, nome, '' AS dettaglio FROM richiesta WHERE lower(nome) LIKE ? OR chiave LIKE ? ORDER BY nome LIMIT ?",
  attivita: "SELECT chiave, nome, quartiere_chiave AS dettaglio FROM luogo WHERE (lower(nome) LIKE ? OR chiave LIKE ?) AND tipo IN ('attivita', 'servizio', 'scuola') ORDER BY nome LIMIT ?",
};

/** Entità collegabili a uno spillo, per tipo e testo (nome o chiave), al massimo `limite` risultati. */
export function cercaRiferimenti(tipo: TipoRiferimento, q: string, limite = 30): RiferimentoTrovato[] {
  if (!(TIPI_RIFERIMENTO as readonly string[]).includes(tipo)) throw httpErrors.badRequest('riferimento-non-valido', 'Tipo di riferimento non ammesso.');
  if(tipo==='mappa'){
    const normalizza=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const parole=normalizza(q).split(/\s+/).filter(Boolean);
    return elencaMappe().filter(m=>parole.every(p=>normalizza((m.nomeCompleto??m.nome)+' '+m.chiave).includes(p))).slice(0,limite).map(m=>({tipo,chiave:m.chiave,nome:m.nomeCompleto??m.nome,dettaglio:m.tipo}));
  }
  const testo = `%${q.trim().toLowerCase()}%`;
  return (prepared(RICERCHE[tipo]).all(testo, testo, limite) as Array<{ chiave: string; nome: string; dettaglio: string | null }>).map((r) => ({
    tipo, chiave: r.chiave, nome: r.nome, dettaglio: tipo === 'confidente' && r.dettaglio ? t('arcana', r.dettaglio) : r.dettaglio ?? '',
  }));
}

// ---- Esportazione / importazione ----

/** Chiavi della mappa `radice` e di tutte le discendenti (ordine di visita: genitori prima dei figli). */
export function discendentiDi(radice: string): string[] {
  rigaMappa(radice);
  const out: string[] = [radice];
  for (let i = 0; i < out.length; i++) {
    for (const f of prepared('SELECT chiave FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, chiave').all(out[i]) as Array<{ chiave: string }>) if (!out.includes(f.chiave)) out.push(f.chiave);
  }
  return out;
}

function base64Immagine(ambito: string, chiave: string): { mime: string; base64: string } | null {
  if (!leggiImmagine(ambito, chiave)) return null;
  try {
    const f = fileImmagine(ambito, chiave);
    return { mime: f.mime, base64: f.contenuto.toString('base64') };
  } catch {
    return null;
  }
}

/** Pacchetto JSON con mappe, spilli (con schermate in base64) e immagini di base dell'istanza (base64): stesso formato del seed
 * `mappe-editor.json`. Con `radice` esporta solo quella mappa e le sue discendenti (un «luogo» completo). */
export function esportaMappe(radice?: string): EsportazioneMappeDto {
  assegnaUidMancanti(getDb());
  if(radice)radice=rigaMappa(radice).chiave;
  const ammesse = radice ? new Set(discendentiDi(radice)) : null;
  const mappe: EsportazioneMappeDto['mappe'] = (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, chiave').all() as RigaMappa[]).filter((m) => !ammesse || ammesse.has(m.chiave)).map((m) => ({
    ...presentazioneMappa(m.chiave),
    chiave: m.chiave, nome: m.nome, tipo: m.tipo, genitore: m.genitore_chiave, ordine: m.ordine, immagine: m.immagine_chiave, asset: m.asset, assetOriginale:m.asset, larghezza: m.larghezza, altezza: m.altezza,
    ruoloImmagine: m.ruolo_immagine,
    entita: m.entita_tipo && m.entita_chiave ? { tipo: m.entita_tipo, chiave: m.entita_chiave } : null, note: m.note,
    // tutte le aree della guida contenute (2026-09-29): `entita` ne dichiara una sola, la prima
    ...areePerPacchetto(m.chiave),
    spilli: (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(m.chiave) as RigaSpillo[]).map((s) => ({
      ...destinazionePerPacchetto(s.id),
      uid: s.uid,
      tipo: s.tipo, nome: s.nome, descrizione: s.descrizione, x: s.x, y: s.y, riferimento: s.riferimento_tipo && s.riferimento_chiave ? { tipo: s.riferimento_tipo, chiave: s.riferimento_chiave } : null, voce: s.voce_chiave ?? null, soloPosizione: s.solo_posizione === 1, collezionabile: s.collezionabile === 1, ordine: s.ordine,
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
  for(const m of mappe){m.chiave=chiaveMappa(m.chiave);if(m.genitore)m.genitore=chiaveMappa(m.genitore);m.asset=assetPredefinitoMappa(m.chiave);for(const s of m.spilli)if(s.riferimento?.tipo==='mappa')s.riferimento.chiave=chiaveMappa(s.riferimento.chiave);}
  const ingressi=(prepared('SELECT quartiere_chiave AS quartiere,mappa_chiave AS mappa,x,y,zoom FROM quartiere_ingresso').all() as NonNullable<EsportazioneMappeDto['ingressi']>).filter(i=>!ammesse||ammesse.has(i.mappa)).map(i=>({...i,mappa:chiaveMappa(i.mappa)}));
  return { versione: 1, esportato: nowIso(), mappe, immagini, ...(ingressi.length?{ingressi}:{}), ...(provenienze.length > 0 ? { provenienze } : {}) };
}

/** Il riferimento proprio di un pin del pacchetto, con le regole della sua categoria: un «punto» (pacchetti di prima della 094)
 *  non è un riferimento ma la voce della guida del pin (`voceDichiarata`). */
function riferimentoDelPacchetto(rif: { tipo: TipoRiferimento; chiave: string } | null | undefined, categoria: ReturnType<typeof categoriaSpillo>): { tipo: TipoRiferimento; chiave: string } | null {
  return rif && rif.tipo !== 'punto' && RIFERIMENTI_PER_CATEGORIA[categoria].includes(rif.tipo) ? rif : null;
}

/** La voce della guida che un pin del pacchetto dichiara (094): il campo `voce`, o il riferimento «punto» di un pacchetto di prima.
 *  `undefined` = il pacchetto non ne dice niente (un pacchetto di prima, o del seed del repository). */
function voceDichiarata(s: { riferimento: { tipo: TipoRiferimento; chiave: string } | null; voce?: string | null }): string | null | undefined {
  return s.voce !== undefined ? s.voce : s.riferimento?.tipo === 'punto' ? s.riferimento.chiave : undefined;
}

/** La voce che il pin avrà davvero su quella planimetria: quella data, se le regole del collegamento la ammettono
 *  (`erroreVoceDelPin`: esiste, non è descrittiva, è del Palazzo della planimetria), altrimenti nessuna. */
function voceAmmessa(nome: string, mappa: string, voce: string | null): string | null {
  return voce && !erroreVoceDelPin({ nome, mappa, voce: null }, voce) ? voce : null;
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
  const dichiarata = voceDichiarata(s);
  if (dichiarata !== undefined && (r.voce_chiave ?? null) !== voceAmmessa(s.nome, r.mappa_chiave, dichiarata)) return false;
  if (JSON.stringify(condizioniDiRiga(r.condizioni_json))!==JSON.stringify(normalizzaCondizioniSpillo(categoria==='citta'?[]:(s.condizioni??[])))) return false;
  // A destination absent from the seed does not erase an arrival configured in the instance.
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
function identitaRettificata(identita:string): {identita:string;mappa?:string} {
  const r=RETTIFICHE_NOMI_SEED.find(r=>identitaSpillo({...r.prima,riferimento:r.prima.riferimento??null})===identita);
  return r?{identita:identitaSpillo({...r.dopo,riferimento:r.dopo.riferimento??null}),mappa:r.mappa}:{identita};
}

export interface EsitoImportazione { mappe: number; spilli: number; immagini: number; saltate: string[]; /** Condizioni scartate perché citano chiavi assenti dalla Guida. */ condizioniScartate: number; /** Voci della guida scartate (094): inesistenti, descrittive o di un altro Palazzo. */ vociScartate: number }

/** Importa un pacchetto (o il seed): per chiave, con `sovrascrivi` sostituisce mappe e spilli esistenti; altrimenti salta le mappe già presenti
 * (il seed aggiorna solo le mappe di origine seed, sostituendo i soli spilli di origine seed e conservando quelli dell'utente). */
export function importaMappe(pacchetto: EsportazioneMappeDto, opz: { sovrascrivi?: boolean; origine?: 'seed' | 'utente'; pacchettiSeed?: readonly EsportazioneMappeDto[] } = {}): EsitoImportazione {
  if (!pacchetto || pacchetto.versione !== 1 || !Array.isArray(pacchetto.mappe)) throw httpErrors.badRequest('pacchetto-non-valido', 'Pacchetto delle mappe non riconosciuto (versione 1 attesa).');
  pacchetto=structuredClone(pacchetto);
  for(const m of pacchetto.mappe){m.chiave=idMappa(m.chiave);if(m.assetOriginale)m.asset=m.assetOriginale;if(m.genitore)m.genitore=idMappa(m.genitore);for(const s of m.spilli??[])if(s.riferimento?.tipo==='mappa')s.riferimento.chiave=idMappa(s.riferimento.chiave);}
  const incoming = new Set(pacchetto.mappe.filter(m => chiaveValida(m.chiave) && (TIPI_MAPPA as readonly string[]).includes(m.tipo)).map(m => m.chiave));
  const verificate = new Map<object, DestinazioneDaSalvare | null | undefined>();
  for (const m of pacchetto.mappe) for (const s of m.spilli ?? []) {
    if (s.soloPosizione !== undefined && typeof s.soloPosizione !== 'boolean') throw httpErrors.badRequest('posizione-non-valida', 'Il campo soloPosizione deve essere booleano.');
    if (s.destinazioneNonDisponibile !== undefined && typeof s.destinazioneNonDisponibile !== 'boolean') throw httpErrors.badRequest('destinazione-non-valida', 'Stato della destinazione non valido.');
    if (s.destinazioneNonDisponibile && s.destinazione) throw httpErrors.badRequest('destinazione-non-valida', 'Una destinazione non può essere presente e invalidata.');
    // la voce della guida (094): una chiave o null; altro è un pacchetto rovinato, non un errore del server
    if (s.voce !== undefined && s.voce !== null && (typeof s.voce !== 'string' || s.voce.length === 0 || s.voce.length > 200)) throw httpErrors.badRequest('voce-non-valida', 'La voce della guida di uno spillo deve essere una chiave (o null).');
    // verificata qui, scritta dopo gli inserimenti: il pacchetto resta com'è, così il confronto «invariato nel seed» legge la forma originale
    verificate.set(s, verificaDestinazioneSpillo(s.destinazione, incoming));
  }
  const origine = opz.origine ?? 'utente';
  const esito: EsitoImportazione = { mappe: 0, spilli: 0, immagini: 0, saltate: [], condizioniScartate: 0, vociScartate: 0 };
  getDb().transaction(() => {
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
    const areeDaLegare: Array<{ mappa: string; aree: string[]; fonte: string }> = [];
    // le voci della guida dei pin (094): da scrivere a genitori risolti; quelle dei pin tolti, per uid, per chi torna con lo stesso
    const conVoce = colonnaSpillo('voce_chiave');
    const vociDaScrivere: Array<{ id: number; nome: string; mappa: string; voce: string }> = [];
    const vociDiPrima = new Map<string, string>();
    const adesso = nowIso();
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
      const conRuolo = (prepared('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).some((c) => c.name === 'ruolo_immagine');
      prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, entita_tipo, entita_chiave, origine, note, updated_at${conRuolo ? ', ruolo_immagine' : ''})
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${conRuolo ? ', ?' : ''})
        ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, ordine = excluded.ordine, immagine_chiave = COALESCE(excluded.immagine_chiave, mappa.immagine_chiave), asset = excluded.asset,
          larghezza = excluded.larghezza, altezza = excluded.altezza, entita_tipo = excluded.entita_tipo, entita_chiave = excluded.entita_chiave, origine = excluded.origine, note = excluded.note, updated_at = excluded.updated_at${conRuolo ? ', ruolo_immagine = excluded.ruolo_immagine' : ''}`)
        .run(...[m.chiave, m.nome, m.tipo, m.ordine ?? 0, m.immagine ?? null, m.asset ?? null, m.larghezza ?? null, m.altezza ?? null, m.entita?.tipo ?? null, m.entita?.chiave ?? null, origine, m.note ?? '', adesso, ...(conRuolo ? [ruolo] : [])]);
      // Il nome ora è quello dichiarato dal pacchetto: qualunque revisione fatta a mano su questa
      // riga è stata appena sovrascritta, quindi non è più lei a presentare la mappa (082).
      if (conNomeRivisto()) prepared('UPDATE mappa SET nome_rivisto = 0 WHERE chiave = ?').run(m.chiave);
      // L'entità dichiarata dalla mappa vale anche come associazione consultabile: è così che la
      // scheda dell'area della guida mostra la sua planimetria e che le altre sezioni la trovano.
      if (prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get()) {
        // Si sostituiscono solo i legami che il pacchetto dichiara — le aree della guida e il tipo di
        // `entita` —, non tutti: un luogo legato dalla migrazione 054 non viaggia nel pacchetto e
        // cancellarlo lo perdeva. Le aree sono l'elenco `aree` (2026-09-29, più d'una per planimetria);
        // un pacchetto di prima porta solo `entita`.
        prepared("DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'").run(m.chiave);
        if (m.entita?.tipo && m.entita.tipo !== 'area') prepared('DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = ?').run(m.chiave, m.entita.tipo);
        const fonte = JSON.stringify({ origine, dichiarata: 'pacchetto' });
        const dichiarate = m.aree !== undefined ? z.array(z.string().trim().min(1).max(160)).max(200).safeParse(m.aree) : null;
        if (dichiarate && !dichiarate.success) throw httpErrors.badRequest('aree-non-valide', `Aree della guida non valide nella mappa '${m.chiave}'.`);
        const aree = [...new Set(dichiarate ? dichiarate.data : m.entita?.tipo === 'area' && m.entita.chiave ? [m.entita.chiave] : [])];
        if (m.entita?.tipo && m.entita.chiave && m.entita.tipo !== 'area') prepared('INSERT OR REPLACE INTO mappa_entita VALUES(?,?,?,?)').run(m.chiave, m.entita.tipo, m.entita.chiave, fonte);
        // Le aree si verificano e si legano **dopo** il passaggio dei genitori: il Palazzo della planimetria
        // si trova risalendo la catena nel database, e a questo punto le mappe nuove del pacchetto (e quelle
        // che il pacchetto dichiara dopo la figlia) non hanno ancora un genitore (rilievo della revisione).
        areeDaLegare.push({ mappa: m.chiave, aree, fonte });
      }
      if ((m.contesti !== undefined || m.gruppoImmagini !== undefined) && prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get()) {
        const schema=z.object({contesti:z.array(z.object({id:z.string().min(1).max(160),nome:z.string().min(1).max(240).nullable(),campo:z.string().min(1).max(80),texpack:z.number().int().nonnegative()})).max(1000),gruppo:z.object({id:z.string().min(1).max(120),nome:z.string().min(1).max(160),ordine:z.number().int().nonnegative(),etichetta:z.string().min(1).max(160).optional(),nomeRivisto:z.boolean().optional()}).nullable()});
        const v=schema.safeParse({contesti:m.contesti??[],gruppo:m.gruppoImmagini??null});
        if(!v.success || new Set(v.data.contesti.map(c=>c.id)).size!==v.data.contesti.length)throw httpErrors.badRequest('contesti-non-validi','Contesti della planimetria non validi o duplicati.');
        prepared('INSERT INTO mappa_presentazione VALUES(?,?,?) ON CONFLICT(mappa_chiave) DO UPDATE SET contesti_json=excluded.contesti_json,gruppo_immagini_json=excluded.gruppo_immagini_json').run(m.chiave,JSON.stringify(v.data.contesti),v.data.gruppo?JSON.stringify(v.data.gruppo):null);
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
      for (const { id } of daTogliere) {
        if ([...invariati.values()].includes(id)) continue;
        // la voce collegata dall'utente segue il pin reinserito con lo stesso uid, se il pacchetto non ne dice niente
        if (conVoce) {
          const v = prepared('SELECT uid, voce_chiave FROM spillo WHERE id = ?').get(id) as { uid: string | null; voce_chiave: string | null };
          if (v.uid && v.voce_chiave) vociDiPrima.set(v.uid, v.voce_chiave);
        }
        for (const i of prepared('SELECT immagine_chiave FROM spillo_immagine WHERE spillo_id = ?').all(id) as Array<{ immagine_chiave: string | null }>) if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
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
        // le regole di categoria valgono anche per un pacchetto: uno spillo di città non ha condizioni, un consumabile è collezionabile, un riferimento estraneo alla categoria non entra
        const categoria = categoriaSpillo(s.tipo);
        const { valide, scartate } = condizioniConChiaviEsistenti(categoria === 'citta' ? [] : s.condizioni);
        esito.condizioniScartate += scartate.length;
        const riferimento = riferimentoDelPacchetto(s.riferimento, categoria);
        // l'uid viaggia col pacchetto (così «raccolto» lo ritrova); se manca o è già preso, si calcola dall'identità
        const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(m.chiave, s.tipo, s.nome, s.descrizione ?? '', x, y, riferimento?.tipo ?? null, riferimento?.chiave ?? null, categoria === 'consumabile' ? 1 : 0, s.ordine ?? 0, origine, adesso, jsonCondizioni(valide));
        // (la colonna arriva con la 067; nei test lo schema puo' essere indietro, come per nativo_json)
        if (uidValido(s.uid) && colonnaSpillo('uid') && !prepared('SELECT 1 FROM spillo WHERE uid = ?').get(s.uid)) prepared('UPDATE spillo SET uid = ? WHERE id = ?').run(s.uid, Number(info.lastInsertRowid));
        assegnaUidMancanti(getDb());
        prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(s.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));
        // la voce della guida del pin (la colonna arriva con la 094, come sopra): quella dichiarata dal pacchetto o, se tace, quella
        // che il pin aveva prima di essere reinserito; si scrive a genitori risolti, quando il Palazzo della planimetria è noto
        if (conVoce) {
          const dichiarata = voceDichiarata({ riferimento: s.riferimento ?? null, voce: s.voce });
          const uid = prepared('SELECT uid FROM spillo WHERE id = ?').pluck().get(Number(info.lastInsertRowid)) as string | null;
          const voce = dichiarata !== undefined ? dichiarata : uid ? vociDiPrima.get(uid) ?? null : null;
          if (voce) vociDaScrivere.push({ id: Number(info.lastInsertRowid), nome: s.nome, mappa: m.chiave, voce });
        }
        // Le prove native del pin — tipo, parte grafica, nome dello sprite, e per i tipi ancora da
        // identificare tutto ciò che serve a verificarli — vanno conservate come dato. Nella sola
        // descrizione si potevano cancellare senza che nulla se ne accorgesse, e la verifica
        // manuale sarebbe rimasta senza appigli.
        // La colonna arriva con la migrazione 046, ma il seed puo' essere caricato mentre lo
        // schema e' ancora indietro (nei test le migrazioni si applicano a scaglioni, per
        // riprodurre un'installazione vecchia): dove non c'e', le prove non si scrivono invece di
        // far fallire l'import.
        if (s.nativo && colonnaNativoJson()) prepared('UPDATE spillo SET nativo_json = ? WHERE id = ?')
          .run(JSON.stringify(s.nativo), Number(info.lastInsertRowid));
        const spilloId = Number(info.lastInsertRowid);
        arrivi.push({id:spilloId,valore:verificate.get(s),invalidata:s.destinazioneNonDisponibile??false});
        (s.immagini ?? []).forEach((img, ordine) => {
          if (img.asset) {
            prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, NULL, ?, ?, ?)').run(spilloId, ordine, img.asset, (img.didascalia ?? '').slice(0, 300), adesso);
          } else if (img.base64 && img.mime) {
            const chiave = `${spilloId}-imp-${ordine}-${Date.now().toString(36)}`;
            salvaImmagine('spillo', chiave, img.mime, Buffer.from(img.base64, 'base64'));
            prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, NULL, ?, ?)').run(spilloId, ordine, chiave, (img.didascalia ?? '').slice(0, 300), adesso);
            esito.immagini++;
          }
        });
        esito.spilli++;
      }
      esito.mappe++;
    }
    for (const m of pacchetto.mappe) {
      if (m.genitore && !esito.saltate.includes(m.chiave) && prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(m.genitore)) prepared('UPDATE mappa SET genitore_chiave = ? WHERE chiave = ?').run(m.genitore, m.chiave);
    }
    // a genitori scritti: le stesse regole dell'app (aree esistenti e dello stesso Palazzo della planimetria)
    for (const { mappa, aree, fonte } of areeDaLegare) {
      verificaAreePalazzo((prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(mappa) as { genitore_chiave: string | null }).genitore_chiave, aree);
      for (const area of aree) {
        // un'area ha una sola planimetria anche quando arriva da un pacchetto
        staccaAreaDalleAltre(area, mappa);
        prepared("INSERT OR REPLACE INTO mappa_entita VALUES(?,'area',?,?)").run(mappa, area, fonte);
      }
      // anche con l'elenco vuoto: le colonne non devono dichiarare un'area che non c'è più
      allineaColonneArea(mappa);
    }
    // già verificate prima degli inserimenti; lo spillo d'arrivo descritto per nome e posizione si risolve adesso, a mappe complete
    for (const arrivo of arrivi) salvaDestinazioneSpillo(arrivo.id, arrivo.valore, arrivo.invalidata);
    // le voci della guida, con le regole del collegamento dalla guida (`erroreVoceDelPin`): una che non regge si scarta e si conta
    for (const v of vociDaScrivere) {
      if (voceAmmessa(v.nome, v.mappa, v.voce) !== v.voce) { esito.vociScartate++; continue; }
      prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(v.voce, v.id);
      allineaStatiPunto(getDb(), v.voce, adesso);
    }
    sincronizzaPercorsiMappe(getDb());
    if(pacchetto.ingressi?.length && prepared("SELECT 1 FROM sqlite_master WHERE name='quartiere_ingresso'").get()) {
      const ingressi=z.array(z.object({quartiere:z.string().min(1).max(80),mappa:z.string().min(1).max(200),x:z.number().min(0).max(100),y:z.number().min(0).max(100),zoom:z.number().min(1).max(6)})).max(1000).safeParse(pacchetto.ingressi);
      if(!ingressi.success)throw httpErrors.badRequest('ingressi-non-validi','Ingressi dei quartieri non validi nel pacchetto.');
      for(const i of ingressi.data){
        const mappa=idMappa(i.mappa);
        if(!prepared('SELECT 1 FROM quartiere WHERE chiave=?').get(i.quartiere)||!prepared('SELECT 1 FROM mappa WHERE chiave=?').get(mappa))throw httpErrors.badRequest('ingresso-non-trovato','Un ingresso cita un quartiere o una mappa inesistente.');
        if(opz.sovrascrivi&&origine!=='seed')prepared('DELETE FROM quartiere_ingresso WHERE quartiere_chiave=?').run(i.quartiere);
        prepared('INSERT OR IGNORE INTO quartiere_ingresso VALUES(?,?,?,?,?)').run(i.quartiere,mappa,i.x,i.y,i.zoom);
      }
    }
    for (const [chiave, img] of Object.entries(pacchetto.immagini ?? {})) {
      if (!img?.base64 || !img.mime) continue;
      if (!pacchetto.mappe.some((m) => m.immagine === chiave && !esito.saltate.includes(m.chiave))) continue;
      salvaImmagine('mappa', chiave, img.mime, Buffer.from(img.base64, 'base64'));
      esito.immagini++;
    }
  })();
  return esito;
}

