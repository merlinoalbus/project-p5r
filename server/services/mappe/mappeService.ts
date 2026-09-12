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
import { z } from 'zod';
import { descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaRequisitoSpillo, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { eStrutturale, categoriaSpillo, DEFINIZIONI_SPILLO, RIFERIMENTI_PER_CATEGORIA, TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO, assetPredefinitoMappa, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../../shared/spilli.js';
import type { CondizioneSpilloDto, DettaglioSpilloDto, DisponibilitaDto, EsportazioneMappeDto, ImmagineSpilloDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../../../shared/types.js';
import fs from 'node:fs';

interface RigaMappa { chiave: string; nome: string; tipo: TipoMappa; genitore_chiave: string | null; ordine: number; immagine_chiave: string | null; asset: string | null; larghezza: number | null; altezza: number | null; entita_tipo: string | null; entita_chiave: string | null; origine: 'seed' | 'utente'; note: string; updated_at: string; ruolo_immagine: RuoloImmagine }
interface RigaImmagineSpillo { id: number; spillo_id: number; ordine: number; immagine_chiave: string | null; asset: string | null; didascalia: string; updated_at: string }
interface RigaSpillo { area_guida_chiave?: string|null; solo_posizione: number; id: number; uid: string; mappa_chiave: string; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento_tipo: TipoRiferimento | null; riferimento_chiave: string | null; collezionabile: number; ordine: number; origine: 'seed' | 'utente'; updated_at: string; condizioni_json: string | null; seed_identita_json: string | null; nativo_json?: string | null }

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
    origine: r.origine, numeroSpilli: c.spilli, numeroFigli: c.figli, updatedAt: r.updated_at,
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
      const stato = partitaId ? (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, chiave) as { stato: string } | undefined)?.stato ?? null : null;
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
interface ContestoSpilli { partitaId?: number; raccolti?: Set<string>; st?: StatoDisponibilita | null; nomi?: NomiCondizioni }

/** Nomi (Confidenti, quartieri, richieste, Palazzi) per descrivere le condizioni: letti una volta per risposta. */

function contestoSpilli(partitaId?: number): ContestoSpilli {
  if (partitaId && !prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  // «raccolto» è legato all'uid dello spillo (067): sopravvive a un pacchetto reimportato o a un gioco.db sostituito
  const raccolti = partitaId ? new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((x) => x.spillo_uid)) : undefined;
  return { partitaId, raccolti, st: partitaId ? statoDisponibilitaPartita(partitaId) : null, nomi: nomiCondizioni() };
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
  let raccolto = ctx.raccolti?.has(r.uid) ?? false;
  // Un punto di dungeon già gestito nella Guida (ottenuto/esaurito) conta come raccolto anche sulla mappa.
  if (dettaglio?.tipo === 'punto' && dettaglio.punto?.stato) raccolto = true;
  const nomi = ctx.nomi ?? nomiCondizioni();
  const condizioni: CondizioneSpilloDto[] = condizioniDiRiga(r.condizioni_json).map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) }));
  // con la partita ogni condizione ha il suo semaforo: rosso ⇒ lo spillo è nascosto sulla mappa. La richiesta si valuta col nome
  // (il valutatore dei semafori lo usa nel dettaglio e riconosce sia la chiave sia il nome), nel DTO resta la chiave per l'editor.
  const perValutazione = condizioni.map((c) => (c.tipo === 'richiesta' ? { ...c, richiesta: nomi.richieste?.[c.richiesta] ?? c.richiesta } : c));
  const esito = conNegozioVivo(ctx.st ? valutaRequisitiSpillo(perValutazione, ctx.st) : undefined, dettaglio);
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
    soloPosizione: r.solo_posizione === 1, collezionabile: r.collezionabile === 1, ...(nativoDiSpillo(r) ? { nativo: nativoDiSpillo(r) } : {}), condizioni, ...(disponibilita ? { disponibilita } : {}), ordine: r.ordine, origine: r.origine, raccolto, dettaglio, immagini: immaginiDiSpillo(r.id), updatedAt: r.updated_at,
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
    percorso: percorsoDi(r).map(p=>({...p,chiave:chiaveMappa(p.chiave)})), figli, spilli,
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

export function creaMappa(chiave: string | undefined, dati: DatiMappa & { nome: string; tipo: TipoMappa }): MappaDto {
  if(dati.genitore)dati={...dati,genitore:rigaMappa(dati.genitore).chiave};
  const richiesta=chiave;
  if(richiesta && prepared('SELECT 1 FROM mappa WHERE chiave=?').get(idMappa(richiesta)))throw httpErrors.conflict('mappa-esistente','La chiave indicata appartiene già a una mappa.');
  chiave=(dati.genitore && rigaMappa(dati.genitore).tipo!=='citta'?chiaveMappa(dati.genitore)+'-':'')+slug(dati.nome);
  if (!chiaveValida(chiave)) throw httpErrors.badRequest('chiave-non-valida', 'La chiave della mappa ammette solo minuscole, cifre e trattini (1–180 caratteri).');
  if (prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(chiave)) throw httpErrors.conflict('mappa-esistente', `Esiste già una mappa con chiave '${chiave}'.`);
  if (!(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  if (dati.genitore) rigaMappa(dati.genitore);
  const adesso = nowIso();
  // 15.25: senza indicazione l'asset del repository è `mappe/<chiave>`, lo stesso percorso che «Esporta questo luogo» dà all'immagine di base:
  // quando il file verrà consegnato in public/asset la mappa lo userà da sola; finché manca, si usa l'immagine dell'istanza o la griglia.
  // `asset: null` esplicito resta «nessun asset».
  const asset = dati.asset === undefined ? assetPredefinitoMappa(chiave) : dati.asset;
  getDb().transaction(() => {
    prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, entita_tipo, entita_chiave, origine, note, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'utente', ?, ?)`).run(chiave, dati.nome, dati.tipo, dati.genitore ?? null, dati.ordine ?? 0, asset, dati.larghezza ?? null, dati.altezza ?? null, dati.entita?.tipo ?? null, dati.entita?.chiave ?? null, dati.note ?? '', adesso);
    sincronizzaPercorsiMappe(getDb());
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
  getDb().transaction(()=>{
  prepared(`UPDATE mappa SET nome = ?, tipo = ?, genitore_chiave = ?, ordine = ?, asset = ?, larghezza = ?, altezza = ?, entita_tipo = ?, entita_chiave = ?, note = ?, origine = 'utente', updated_at = ? WHERE chiave = ?`).run(
    dati.nome ?? r.nome, dati.tipo ?? r.tipo, dati.genitore === undefined ? r.genitore_chiave : dati.genitore, dati.ordine ?? r.ordine, dati.asset === undefined ? r.asset : dati.asset,
    dati.larghezza === undefined ? r.larghezza : dati.larghezza, dati.altezza === undefined ? r.altezza : dati.altezza,
    dati.entita === undefined ? r.entita_tipo : dati.entita?.tipo ?? null, dati.entita === undefined ? r.entita_chiave : dati.entita?.chiave ?? null, dati.note ?? r.note, nowIso(), chiave);
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

function verificaRiferimento(rif: { tipo: TipoRiferimento; chiave: string } | null | undefined): void {
  if (!rif) return;
  if (!(TIPI_RIFERIMENTO as readonly string[]).includes(rif.tipo)) throw httpErrors.badRequest('riferimento-non-valido', 'Tipo di riferimento non ammesso.');
  const tabella: Record<TipoRiferimento, string> = { mappa: 'SELECT 1 FROM mappa WHERE chiave = ?', negozio: 'SELECT 1 FROM negozio WHERE chiave = ?', punto: 'SELECT 1 FROM punto_interesse WHERE chiave = ?', luogo: 'SELECT 1 FROM luogo WHERE chiave = ?', confidente: 'SELECT 1 FROM confidente WHERE chiave = ?', richiesta: 'SELECT 1 FROM richiesta WHERE chiave = ?', attivita: 'SELECT 1 FROM luogo WHERE chiave = ?' };
  if (!prepared(tabella[rif.tipo]).get(rif.chiave)) throw httpErrors.notFound('riferimento-non-trovato', `${rif.tipo} '${rif.chiave}' non trovato.`);
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

export function creaSpillo(mappaChiave: string, dati: DatiSpillo & { tipo: TipoSpillo; nome: string; x: number; y: number }): SpilloDto {
  return getDb().transaction(() => {
  mappaChiave=rigaMappa(mappaChiave).chiave;
  if (!(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
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
  assegnaUidMancanti(getDb());
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
  // Cambiando tipo il riferimento di prima può non essere più ammesso: quello che il client non
  // tocca **non si ri-verifica** (le schede della Guida hanno riferimenti a mappe che non esistono
  // più, e un salvataggio del nome non deve fallire per questo); se non è più della categoria, cade.
  const tipoFinale = dati.tipo ?? r.tipo;
  if (dati.riferimento === undefined && r.riferimento_tipo && !RIFERIMENTI_PER_CATEGORIA[categoriaSpillo(tipoFinale)].includes(r.riferimento_tipo)) dati = { ...dati, riferimento: null };
  dati = applicaRegoleCategoria(tipoFinale, dati);
  if (dati.mappa) dati={...dati,mappa:rigaMappa(dati.mappa).chiave};
  if(dati.riferimento?.tipo==='mappa')dati={...dati,riferimento:{...dati.riferimento,chiave:rigaMappa(dati.riferimento.chiave).chiave}};
  verificaRiferimento(dati.riferimento);
  verificaCondizioni(dati.condizioni);
  const destinazione = verificaDestinazioneSpillo(dati.destinazione);
  // uno spillo del seed modificato diventa dell'utente: si ricorda com'era, così il reseed non ne reinserisce una copia
  const identitaSeed = r.seed_identita_json ?? (r.origine === 'seed' ? identitaSpillo({ tipo: r.tipo, nome: r.nome, x: r.x, y: r.y, riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null }) : null);
  prepared(`UPDATE spillo SET mappa_chiave = ?, tipo = ?, nome = ?, descrizione = ?, x = ?, y = ?, riferimento_tipo = ?, riferimento_chiave = ?, collezionabile = ?, ordine = ?, origine = 'utente', updated_at = ?, condizioni_json = ?, seed_identita_json = ? WHERE id = ?`).run(
    dati.mappa ?? r.mappa_chiave, dati.tipo ?? r.tipo, dati.nome ?? r.nome, dati.descrizione ?? r.descrizione, dati.x ?? r.x, dati.y ?? r.y,
    dati.riferimento === undefined ? r.riferimento_tipo : dati.riferimento?.tipo ?? null, dati.riferimento === undefined ? r.riferimento_chiave : dati.riferimento?.chiave ?? null,
    dati.collezionabile === undefined ? r.collezionabile : dati.collezionabile ? 1 : 0, dati.ordine ?? r.ordine, nowIso(), dati.condizioni === undefined ? r.condizioni_json : jsonCondizioni(dati.condizioni), identitaSeed, id);
  if (dati.soloPosizione !== undefined) prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(dati.soloPosizione ? 1 : 0, id);
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

  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partitaId, r.uid, raccolto ? 1 : 0, adesso);
    if (r.riferimento_tipo === 'punto' && r.riferimento_chiave) {
      if (raccolto) prepared(`INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', ?) ON CONFLICT(partita_id, punto_chiave) DO NOTHING`).run(partitaId, r.riferimento_chiave, adesso);
      else prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, r.riferimento_chiave);
    }
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
    return { mime: f.mime, base64: fs.readFileSync(f.percorso).toString('base64') };
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
    spilli: (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(m.chiave) as RigaSpillo[]).map((s) => ({
      ...destinazionePerPacchetto(s.id),
      uid: s.uid,
      tipo: s.tipo, nome: s.nome, descrizione: s.descrizione, x: s.x, y: s.y, riferimento: s.riferimento_tipo && s.riferimento_chiave ? { tipo: s.riferimento_tipo, chiave: s.riferimento_chiave } : null, soloPosizione: s.solo_posizione === 1, collezionabile: s.collezionabile === 1, ordine: s.ordine,
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
      immagini[chiaveImg] = { mime: f.mime, base64: fs.readFileSync(f.percorso).toString('base64') };
    } catch {
      // immagine registrata ma file assente: esportata senza immagine
    }
  }
  for(const m of mappe){m.chiave=chiaveMappa(m.chiave);if(m.genitore)m.genitore=chiaveMappa(m.genitore);m.asset=assetPredefinitoMappa(m.chiave);for(const s of m.spilli)if(s.riferimento?.tipo==='mappa')s.riferimento.chiave=chiaveMappa(s.riferimento.chiave);}
  const ingressi=(prepared('SELECT quartiere_chiave AS quartiere,mappa_chiave AS mappa,x,y,zoom FROM quartiere_ingresso').all() as NonNullable<EsportazioneMappeDto['ingressi']>).filter(i=>!ammesse||ammesse.has(i.mappa)).map(i=>({...i,mappa:chiaveMappa(i.mappa)}));
  return { versione: 1, esportato: nowIso(), mappe, immagini, ...(ingressi.length?{ingressi}:{}), ...(provenienze.length > 0 ? { provenienze } : {}) };
}

/** Un reseed identico conserva ID, raccolte, schermate e destinazioni del pin. */
/** `verificata`: la destinazione del pacchetto già verificata prima degli inserimenti (con le mappe in arrivo); senza, si verifica qui e un errore vale «diverso». */
function spilloInvariatoNelSeed(r: RigaSpillo, s: EsportazioneMappeDto['mappe'][number]['spilli'][number], verificata?: DestinazioneDaSalvare | null): boolean {
  // si confronta con quel che il pacchetto **produrrebbe** (regole di categoria applicate), non con quel che scrive
  const categoria = categoriaSpillo(s.tipo);
  const riferimento = s.riferimento && RIFERIMENTI_PER_CATEGORIA[categoria].includes(s.riferimento.tipo) ? s.riferimento : null;
  if (r.tipo!==s.tipo || r.nome!==s.nome || r.descrizione!==(s.descrizione??'') || r.x!==s.x || r.y!==s.y || r.riferimento_tipo!==(riferimento?.tipo??null) || r.riferimento_chiave!==(riferimento?.chiave??null) || r.collezionabile!==(categoria==='consumabile'?1:0) || r.ordine!==(s.ordine??0) || r.solo_posizione!==(s.soloPosizione?1:0)) return false;
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

export interface EsitoImportazione { mappe: number; spilli: number; immagini: number; saltate: string[]; /** Condizioni scartate perché citano chiavi assenti dalla Guida. */ condizioniScartate: number }

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
    // verificata qui, scritta dopo gli inserimenti: il pacchetto resta com'è, così il confronto «invariato nel seed» legge la forma originale
    verificate.set(s, verificaDestinazioneSpillo(s.destinazione, incoming));
  }
  const origine = opz.origine ?? 'utente';
  const esito: EsitoImportazione = { mappe: 0, spilli: 0, immagini: 0, saltate: [], condizioniScartate: 0 };
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
        const identita = identitaSpillo({ tipo:s.tipo, nome:s.nome, x:Math.min(100,Math.max(0,s.x)), y:Math.min(100,Math.max(0,s.y)), riferimento });
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
      // L'entità dichiarata dalla mappa vale anche come associazione consultabile: è così che la
      // scheda dell'area della guida mostra la sua planimetria e che le altre sezioni la trovano.
      if (prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get()) {
        prepared('DELETE FROM mappa_entita WHERE mappa_chiave = ?').run(m.chiave);
        if (m.entita?.tipo && m.entita.chiave) prepared('INSERT OR REPLACE INTO mappa_entita VALUES(?,?,?,?)')
          .run(m.chiave, m.entita.tipo, m.entita.chiave, JSON.stringify({ origine, dichiarata: 'pacchetto' }));
      }
      if ((m.contesti !== undefined || m.gruppoImmagini !== undefined) && prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_presentazione'").get()) {
        const schema=z.object({contesti:z.array(z.object({id:z.string().min(1).max(160),nome:z.string().min(1).max(240).nullable(),campo:z.string().min(1).max(80),texpack:z.number().int().nonnegative()})).max(1000),gruppo:z.object({id:z.string().min(1).max(120),nome:z.string().min(1).max(160),ordine:z.number().int().nonnegative(),etichetta:z.string().min(1).max(160).optional()}).nullable()});
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
        for (const i of prepared('SELECT immagine_chiave FROM spillo_immagine WHERE spillo_id = ?').all(id) as Array<{ immagine_chiave: string | null }>) if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
        prepared('DELETE FROM spillo WHERE id = ?').run(id);
      }
      // spilli del seed che l'utente ha modificato (ora `utente`, con l'identità di allora): il pacchetto non li reinserisce
      const identitaUtente = new Set(opz.sovrascrivi ? [] : (prepared("SELECT seed_identita_json FROM spillo WHERE mappa_chiave = ? AND origine = 'utente' AND seed_identita_json IS NOT NULL").all(m.chiave) as Array<{ seed_identita_json: string }>).map((r) => r.seed_identita_json));
      for (const [indiceSpillo, s] of (m.spilli ?? []).entries()) {
        if (invariati.has(indiceSpillo)) continue;
        if (!(TIPI_SPILLO as readonly string[]).includes(s.tipo)) continue;
        const x = Math.min(100, Math.max(0, s.x)); const y = Math.min(100, Math.max(0, s.y));
        const identita = identitaSpillo({ tipo: s.tipo, nome: s.nome, x, y, riferimento: s.riferimento ?? null });
        if (identitaUtente.has(identita) || identitaSpostate.has(identita)) continue;
        // le condizioni con chiavi assenti dalla Guida si scartano (contate nell'esito), come l'API le rifiuta: mai uno spillo nascosto per sempre
        // le regole di categoria valgono anche per un pacchetto: uno spillo di città non ha condizioni, un consumabile è collezionabile, un riferimento estraneo alla categoria non entra
        const categoria = categoriaSpillo(s.tipo);
        const { valide, scartate } = condizioniConChiaviEsistenti(categoria === 'citta' ? [] : s.condizioni);
        esito.condizioniScartate += scartate.length;
        const riferimento = s.riferimento && RIFERIMENTI_PER_CATEGORIA[categoria].includes(s.riferimento.tipo) ? s.riferimento : null;
        // l'uid viaggia col pacchetto (così «raccolto» lo ritrova); se manca o è già preso, si calcola dall'identità
        const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(m.chiave, s.tipo, s.nome, s.descrizione ?? '', x, y, riferimento?.tipo ?? null, riferimento?.chiave ?? null, categoria === 'consumabile' ? 1 : 0, s.ordine ?? 0, origine, adesso, jsonCondizioni(valide));
        // (la colonna arriva con la 067; nei test lo schema puo' essere indietro, come per nativo_json)
        if (uidValido(s.uid) && colonnaSpillo('uid') && !prepared('SELECT 1 FROM spillo WHERE uid = ?').get(s.uid)) prepared('UPDATE spillo SET uid = ? WHERE id = ?').run(s.uid, Number(info.lastInsertRowid));
        assegnaUidMancanti(getDb());
        prepared('UPDATE spillo SET solo_posizione = ? WHERE id = ?').run(s.soloPosizione ? 1 : 0, Number(info.lastInsertRowid));
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
    // già verificate prima degli inserimenti; lo spillo d'arrivo descritto per nome e posizione si risolve adesso, a mappe complete
    for (const arrivo of arrivi) salvaDestinazioneSpillo(arrivo.id, arrivo.valore, arrivo.invalidata);
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

