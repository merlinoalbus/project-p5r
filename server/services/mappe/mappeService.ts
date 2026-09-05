// ============================================================
// mappeService — albero delle mappe, spilli con stato per partita, editor, esportazione/importazione (Fase 13.1)
// ============================================================

import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { t } from '../traduzioniService.js';
import { eliminaImmagine, fileImmagine, leggiImmagine, salvaImmagine } from '../immaginiService.js';
import { dettaglioNegozio } from '../negoziService.js';
import { dataSbloccoQuartiere, statoDisponibilitaPartita, valutaRequisiti, type StatoDisponibilita } from '../disponibilitaService.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { DEFINIZIONI_SPILLO, TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO, assetPredefinitoMappa, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../../shared/spilli.js';
import type { CondizioneSpilloDto, DettaglioSpilloDto, EsportazioneMappeDto, ImmagineSpilloDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../../../shared/types.js';
import fs from 'node:fs';
import { creaZip, type VoceZip } from '../../utils/zip.js';

interface RigaMappa { chiave: string; nome: string; tipo: TipoMappa; genitore_chiave: string | null; ordine: number; immagine_chiave: string | null; asset: string | null; larghezza: number | null; altezza: number | null; entita_tipo: string | null; entita_chiave: string | null; origine: 'seed' | 'utente'; note: string; updated_at: string }
interface RigaImmagineSpillo { id: number; spillo_id: number; ordine: number; immagine_chiave: string | null; asset: string | null; didascalia: string; updated_at: string }
interface RigaSpillo { id: number; mappa_chiave: string; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento_tipo: TipoRiferimento | null; riferimento_chiave: string | null; collezionabile: number; ordine: number; origine: 'seed' | 'utente'; updated_at: string; condizioni_json: string | null; seed_identita_json: string | null }

function rigaMappa(chiave: string): RigaMappa {
  const r = prepared('SELECT * FROM mappa WHERE chiave = ?').get(chiave) as RigaMappa | undefined;
  if (!r) throw httpErrors.notFound('mappa-non-trovata', `La mappa '${chiave}' non esiste.`);
  return r;
}

function conteggi(chiave: string): { spilli: number; figli: number } {
  return {
    spilli: (prepared('SELECT COUNT(*) AS n FROM spillo WHERE mappa_chiave = ?').get(chiave) as { n: number }).n,
    figli: (prepared('SELECT COUNT(*) AS n FROM mappa WHERE genitore_chiave = ?').get(chiave) as { n: number }).n,
  };
}

/** Chiave dell'immagine di base nell'istanza: quella registrata, altrimenti un'immagine dell'ambito «mappa» con la chiave della mappa
 * (le piante scaricate dalla guida per aree e quartieri usano proprio quella chiave). */
function immagineDi(r: RigaMappa): { chiave: string; createdAt: string } | null {
  for (const chiave of [r.immagine_chiave, r.chiave]) {
    if (!chiave) continue;
    const img = leggiImmagine('mappa', chiave);
    if (img) return { chiave, createdAt: img.createdAt };
  }
  return null;
}

function riassunto(r: RigaMappa): MappaRiassuntoDto {
  const c = conteggi(r.chiave);
  const img = immagineDi(r);
  return {
    chiave: r.chiave, nome: r.nome, tipo: r.tipo, genitore: r.genitore_chiave, ordine: r.ordine,
    immagineUrl: img ? `/api/immagini/mappa/${encodeURIComponent(img.chiave)}/file` : null,
    asset: r.asset, entita: r.entita_tipo && r.entita_chiave ? { tipo: r.entita_tipo, chiave: r.entita_chiave } : null,
    origine: r.origine, numeroSpilli: c.spilli, numeroFigli: c.figli, updatedAt: r.updated_at,
  };
}

/** Albero completo (piatto, con genitore): radici prima, poi per ordine. */
export function elencaMappe(): MappaRiassuntoDto[] {
  return (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, nome').all() as RigaMappa[]).map(riassunto);
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
      return { tipo: 'mappa', mappa: { chiave: m.chiave, nome: m.nome, tipo: m.tipo }, immagine: { url: img ? `/api/immagini/mappa/${encodeURIComponent(img.chiave)}/file` : null, asset: m.asset } };
    }
    case 'punto': {
      const p = prepared('SELECT p.chiave, p.tipo, p.nome, p.descrizione, p.esauribile, a.dungeon_chiave, a.chiave AS area_chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(chiave) as { chiave: string; tipo: string; nome: string; descrizione: string; esauribile: number; dungeon_chiave: string; area_chiave: string } | undefined;
      if (!p) return null;
      const stato = partitaId ? (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, chiave) as { stato: string } | undefined)?.stato ?? null : null;
      return { tipo: 'punto', punto: { chiave: p.chiave, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dungeon: p.dungeon_chiave, area: p.area_chiave, stato } };
    }
    case 'luogo': {
      const l = prepared('SELECT chiave, quartiere_chiave, tipo, nome, cosa_offre, quando, negozio FROM luogo WHERE chiave = ?').get(chiave) as { chiave: string; quartiere_chiave: string; tipo: string; nome: string; cosa_offre: string; quando: string | null; negozio: string | null } | undefined;
      if (!l) return null;
      const negozio = l.negozio ? negozioDettaglio(l.negozio, partitaId) : null;
      return { tipo: 'luogo', luogo: { chiave: l.chiave, quartiere: l.quartiere_chiave, tipo: l.tipo, nome: l.nome, cosaOffre: l.cosa_offre, quando: l.quando }, negozio };
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

function immaginiDiSpillo(spilloId: number): ImmagineSpilloDto[] {
  return (prepared('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(spilloId) as RigaImmagineSpillo[]).map((i) => ({
    id: i.id, url: i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave) ? `/api/immagini/spillo/${encodeURIComponent(i.immagine_chiave)}/file` : null, asset: i.asset, didascalia: i.didascalia, ordine: i.ordine,
  }));
}

/** Contesto comune agli spilli di una risposta: partita, spilli raccolti, stato per le condizioni, nomi per le descrizioni. */
interface ContestoSpilli { partitaId?: number; raccolti?: Set<number>; st?: StatoDisponibilita | null; nomi?: NomiCondizioni }

/** Nomi (Confidenti, quartieri, richieste, Palazzi) per descrivere le condizioni: letti una volta per risposta. */
function nomiCondizioni(): NomiCondizioni {
  const mappa = (sql: string) => Object.fromEntries((prepared(sql).all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  return {
    confidenti: mappa('SELECT chiave, nome FROM confidente'), quartieri: mappa('SELECT chiave, nome FROM quartiere'),
    richieste: mappa('SELECT chiave, nome FROM richiesta'), dungeon: mappa('SELECT chiave, nome FROM dungeon'),
  };
}

function contestoSpilli(partitaId?: number): ContestoSpilli {
  if (partitaId && !prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const raccolti = partitaId ? new Set((prepared('SELECT spillo_id FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_id: number }>).map((x) => x.spillo_id)) : undefined;
  return { partitaId, raccolti, st: partitaId ? statoDisponibilitaPartita(partitaId) : null, nomi: nomiCondizioni() };
}

/** Condizioni salvate nello spillo (JSON) → elenco normalizzato; un JSON rovinato vale come nessuna condizione. */
export function condizioniDiRiga(json: string | null): RequisitoSpillo[] {
  if (!json) return [];
  try { return normalizzaCondizioniSpillo(JSON.parse(json)); } catch { return []; }
}

function jsonCondizioni(condizioni: RequisitoSpillo[] | null | undefined): string | null {
  const pulite = normalizzaCondizioniSpillo(condizioni ?? []);
  return pulite.length > 0 ? JSON.stringify(pulite) : null;
}

/** Identità di uno spillo del seed com'era nel pacchetto (tipo, nome, posizione, riferimento): dopo una modifica dell'utente serve a riconoscerlo al reseed. */
function identitaSpillo(s: { tipo: string; nome: string; x: number; y: number; riferimento: { tipo: string; chiave: string } | null }): string {
  return JSON.stringify({ tipo: s.tipo, nome: s.nome, x: s.x, y: s.y, riferimento: s.riferimento ? { tipo: s.riferimento.tipo, chiave: s.riferimento.chiave } : null });
}

function spilloDto(r: RigaSpillo, ctx: ContestoSpilli = {}): SpilloDto {
  const dettaglio = dettaglioRiferimento(r.riferimento_tipo, r.riferimento_chiave, ctx.partitaId);
  let raccolto = ctx.raccolti?.has(r.id) ?? false;
  // Un punto di dungeon già gestito nella Guida (ottenuto/esaurito) conta come raccolto anche sulla mappa.
  if (dettaglio?.tipo === 'punto' && dettaglio.punto?.stato) raccolto = true;
  const nomi = ctx.nomi ?? nomiCondizioni();
  const condizioni: CondizioneSpilloDto[] = condizioniDiRiga(r.condizioni_json).map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) }));
  // con la partita ogni condizione ha il suo semaforo: rosso ⇒ lo spillo è nascosto sulla mappa. La richiesta si valuta col nome
  // (il valutatore dei semafori lo usa nel dettaglio e riconosce sia la chiave sia il nome), nel DTO resta la chiave per l'editor.
  const perValutazione = condizioni.map((c) => (c.tipo === 'richiesta' ? { ...c, richiesta: nomi.richieste?.[c.richiesta] ?? c.richiesta } : c));
  const disponibilita = ctx.st ? valutaRequisiti(perValutazione, ctx.st) : undefined;
  return {
    id: r.id, mappaChiave: r.mappa_chiave, tipo: r.tipo, tipoNome: DEFINIZIONI_SPILLO[r.tipo]?.nome ?? r.tipo, colore: DEFINIZIONI_SPILLO[r.tipo]?.colore ?? '#888',
    nome: r.nome, descrizione: r.descrizione, x: r.x, y: r.y,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null,
    collezionabile: r.collezionabile === 1, condizioni, ...(disponibilita ? { disponibilita } : {}), ordine: r.ordine, origine: r.origine, raccolto, dettaglio, immagini: immaginiDiSpillo(r.id), updatedAt: r.updated_at,
  };
}

/** Mappa con percorso, figli, spilli (con stato della partita e dettagli delle entità collegate). */
export function dettaglioMappa(chiave: string, partitaId?: number): MappaDto {
  const r = rigaMappa(chiave);
  const figli = (prepared('SELECT * FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, nome').all(chiave) as RigaMappa[]).map(riassunto);
  const ctx = contestoSpilli(partitaId);
  const spilli = (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(chiave) as RigaSpillo[]).map((s) => spilloDto(s, ctx));
  const immagine = immagineDi(r);
  return {
    ...riassunto(r), larghezza: r.larghezza, altezza: r.altezza, note: r.note,
    immagineUrl: immagine ? `/api/immagini/mappa/${encodeURIComponent(immagine.chiave)}/file?v=${encodeURIComponent(immagine.createdAt)}` : null,
    percorso: percorsoDi(r), figli, spilli,
    genitoreNome: r.genitore_chiave ? (prepared('SELECT nome FROM mappa WHERE chiave = ?').get(r.genitore_chiave) as { nome: string } | undefined)?.nome ?? null : null,
  };
}

/** Mappa collegata a un'entità della guida (quartiere, area…), se esiste. */
export function mappaPerEntita(tipo: string, chiave: string): MappaRiassuntoDto | null {
  const r = prepared('SELECT * FROM mappa WHERE entita_tipo = ? AND entita_chiave = ? ORDER BY origine DESC LIMIT 1').get(tipo, chiave) as RigaMappa | undefined;
  return r ? riassunto(r) : null;
}

// ---- Editor ----

/** `passaggio`/`ritorno` (15.24) valgono solo alla creazione con un genitore: passaggio nel genitore verso la nuova mappa e viceversa. */
export interface DatiMappa { nome?: string; tipo?: TipoMappa; genitore?: string | null; ordine?: number; asset?: string | null; larghezza?: number | null; altezza?: number | null; entita?: { tipo: string; chiave: string } | null; note?: string; passaggio?: boolean; ritorno?: boolean }

const chiaveValida = (chiave: string): boolean => /^[a-z0-9][a-z0-9-]{1,79}$/.test(chiave);

export function creaMappa(chiave: string, dati: DatiMappa & { nome: string; tipo: TipoMappa }): MappaDto {
  if (!chiaveValida(chiave)) throw httpErrors.badRequest('chiave-non-valida', 'La chiave della mappa ammette solo minuscole, cifre e trattini (2–80 caratteri).');
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
  if (mappa === destinazione) throw httpErrors.badRequest('passaggio-non-valido', 'Una mappa non può avere un passaggio verso sé stessa.');
  if (passaggioEsistente(mappa, destinazione)) throw httpErrors.conflict('passaggio-esistente', `«${r.nome}» ha già uno spillo verso «${dest.nome}».`);
  const [x, y] = posizioneLibera(mappa, destinazione === r.genitore_chiave ? [50, 92] : [50, 50]);
  return creaSpillo(mappa, { tipo: 'passaggio', nome: dest.nome, x, y, riferimento: { tipo: 'mappa', chiave: destinazione } });
}

export function aggiornaMappa(chiave: string, dati: DatiMappa): MappaDto {
  const r = rigaMappa(chiave);
  if (dati.genitore) {
    if (dati.genitore === chiave) throw httpErrors.badRequest('genitore-non-valido', 'Una mappa non può essere genitore di sé stessa.');
    const g = rigaMappa(dati.genitore);
    if (percorsoDi(g).some((p) => p.chiave === chiave)) throw httpErrors.badRequest('genitore-non-valido', 'Il genitore scelto è un discendente di questa mappa.');
  }
  if (dati.tipo && !(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  prepared(`UPDATE mappa SET nome = ?, tipo = ?, genitore_chiave = ?, ordine = ?, asset = ?, larghezza = ?, altezza = ?, entita_tipo = ?, entita_chiave = ?, note = ?, origine = 'utente', updated_at = ? WHERE chiave = ?`).run(
    dati.nome ?? r.nome, dati.tipo ?? r.tipo, dati.genitore === undefined ? r.genitore_chiave : dati.genitore, dati.ordine ?? r.ordine, dati.asset === undefined ? r.asset : dati.asset,
    dati.larghezza === undefined ? r.larghezza : dati.larghezza, dati.altezza === undefined ? r.altezza : dati.altezza,
    dati.entita === undefined ? r.entita_tipo : dati.entita?.tipo ?? null, dati.entita === undefined ? r.entita_chiave : dati.entita?.chiave ?? null, dati.note ?? r.note, nowIso(), chiave);
  return dettaglioMappa(chiave);
}

export function eliminaMappa(chiave: string): void {
  rigaMappa(chiave);
  getDb().transaction(() => {
    prepared('UPDATE mappa SET genitore_chiave = NULL WHERE genitore_chiave = ?').run(chiave);
    prepared('DELETE FROM mappa WHERE chiave = ?').run(chiave);
  })();
}

/** Immagine di base nell'istanza (ambito «mappa», chiave = chiave della mappa); dimensioni lette dall'intestazione PNG/JPEG/WEBP/GIF quando possibile. */
export function impostaImmagineMappa(chiave: string, mime: string, contenuto: Buffer): MappaDto {
  rigaMappa(chiave);
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

export interface DatiSpillo { tipo?: TipoSpillo; nome?: string; descrizione?: string; x?: number; y?: number; riferimento?: { tipo: TipoRiferimento; chiave: string } | null; collezionabile?: boolean; ordine?: number; condizioni?: RequisitoSpillo[] | null }

/**
 * Le chiavi citate dalle condizioni devono essere calcolabili dall'app: Palazzo esistente (non i Mementos), Confidente e richiesta della
 * Guida, quartiere con una data di sblocco leggibile (gli altri quartieri non sono valutabili). Separa le valide dalle sconosciute.
 */
function condizioniConChiaviEsistenti(condizioni: RequisitoSpillo[] | null | undefined): { valide: RequisitoSpillo[]; scartate: Array<{ cosa: string; chiave: string }> } {
  const valide: RequisitoSpillo[] = [];
  const scartate: Array<{ cosa: string; chiave: string }> = [];
  for (const c of normalizzaCondizioniSpillo(condizioni ?? [])) {
    let ok = true; let cosa = ''; let chiave = '';
    if (c.tipo === 'palazzo') { cosa = 'Palazzo'; chiave = c.dungeon; ok = !!prepared("SELECT 1 FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(c.dungeon); }
    else if (c.tipo === 'confidente') { cosa = 'Confidente'; chiave = c.confidente; ok = !!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(c.confidente); }
    else if (c.tipo === 'richiesta') { cosa = 'Richiesta'; chiave = c.richiesta; ok = !!prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(c.richiesta); }
    else if (c.tipo === 'quartiere') {
      cosa = 'Quartiere con data di sblocco'; chiave = c.quartiere;
      const q = prepared('SELECT sblocco FROM quartiere WHERE chiave = ?').get(c.quartiere) as { sblocco: string | null } | undefined;
      ok = !!q && dataSbloccoQuartiere(q.sblocco) !== null;
    }
    if (ok) valide.push(c); else scartate.push({ cosa, chiave });
  }
  return { valide, scartate };
}

/** Editor (API): una chiave sconosciuta è un errore 404, non uno scarto silenzioso. */
function verificaCondizioni(condizioni: RequisitoSpillo[] | null | undefined): void {
  const { scartate } = condizioniConChiaviEsistenti(condizioni);
  if (scartate.length > 0) throw httpErrors.notFound('condizione-non-trovata', `${scartate[0].cosa} '${scartate[0].chiave}' non trovato nella Guida.`);
}

function verificaRiferimento(rif: { tipo: TipoRiferimento; chiave: string } | null | undefined): void {
  if (!rif) return;
  if (!(TIPI_RIFERIMENTO as readonly string[]).includes(rif.tipo)) throw httpErrors.badRequest('riferimento-non-valido', 'Tipo di riferimento non ammesso.');
  const tabella: Record<TipoRiferimento, string> = { mappa: 'SELECT 1 FROM mappa WHERE chiave = ?', negozio: 'SELECT 1 FROM negozio WHERE chiave = ?', punto: 'SELECT 1 FROM punto_interesse WHERE chiave = ?', luogo: 'SELECT 1 FROM luogo WHERE chiave = ?', confidente: 'SELECT 1 FROM confidente WHERE chiave = ?', richiesta: 'SELECT 1 FROM richiesta WHERE chiave = ?', attivita: 'SELECT 1 FROM luogo WHERE chiave = ?' };
  if (!prepared(tabella[rif.tipo]).get(rif.chiave)) throw httpErrors.notFound('riferimento-non-trovato', `${rif.tipo} '${rif.chiave}' non trovato.`);
}

export function creaSpillo(mappaChiave: string, dati: DatiSpillo & { tipo: TipoSpillo; nome: string; x: number; y: number }): SpilloDto {
  rigaMappa(mappaChiave);
  if (!(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  verificaRiferimento(dati.riferimento);
  verificaCondizioni(dati.condizioni);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente', ?, ?)`).run(mappaChiave, dati.tipo, dati.nome, dati.descrizione ?? '', dati.x, dati.y, dati.riferimento?.tipo ?? null, dati.riferimento?.chiave ?? null,
    (dati.collezionabile ?? DEFINIZIONI_SPILLO[dati.tipo].collezionabile) ? 1 : 0, dati.ordine ?? 0, adesso, jsonCondizioni(dati.condizioni));
  prepared("UPDATE mappa SET updated_at = ? WHERE chiave = ?").run(adesso, mappaChiave);
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaSpillo);
}

export function aggiornaSpillo(id: number, dati: DatiSpillo & { mappa?: string }): SpilloDto {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);
  if (dati.tipo && !(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  if (dati.mappa) rigaMappa(dati.mappa);
  verificaRiferimento(dati.riferimento);
  verificaCondizioni(dati.condizioni);
  // uno spillo del seed modificato diventa dell'utente: si ricorda com'era, così il reseed non ne reinserisce una copia
  const identitaSeed = r.seed_identita_json ?? (r.origine === 'seed' ? identitaSpillo({ tipo: r.tipo, nome: r.nome, x: r.x, y: r.y, riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null }) : null);
  prepared(`UPDATE spillo SET mappa_chiave = ?, tipo = ?, nome = ?, descrizione = ?, x = ?, y = ?, riferimento_tipo = ?, riferimento_chiave = ?, collezionabile = ?, ordine = ?, origine = 'utente', updated_at = ?, condizioni_json = ?, seed_identita_json = ? WHERE id = ?`).run(
    dati.mappa ?? r.mappa_chiave, dati.tipo ?? r.tipo, dati.nome ?? r.nome, dati.descrizione ?? r.descrizione, dati.x ?? r.x, dati.y ?? r.y,
    dati.riferimento === undefined ? r.riferimento_tipo : dati.riferimento?.tipo ?? null, dati.riferimento === undefined ? r.riferimento_chiave : dati.riferimento?.chiave ?? null,
    dati.collezionabile === undefined ? r.collezionabile : dati.collezionabile ? 1 : 0, dati.ordine ?? r.ordine, nowIso(), dati.condizioni === undefined ? r.condizioni_json : jsonCondizioni(dati.condizioni), identitaSeed, id);
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo);
}

export function eliminaSpillo(id: number): void {
  if (!prepared('SELECT 1 FROM spillo WHERE id = ?').get(id)) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);
  prepared('DELETE FROM spillo WHERE id = ?').run(id);
}

/** Stato «raccolto» di uno spillo per partita (in uso normale; per gli spilli collegati a un punto aggiorna anche lo stato del punto nella Guida). */
export function impostaRaccolto(partitaId: number, spilloId: number, raccolto: boolean): SpilloDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`INSERT INTO spillo_partita (partita_id, spillo_id, raccolto, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(partita_id, spillo_id) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partitaId, spilloId, raccolto ? 1 : 0, adesso);
    if (r.riferimento_tipo === 'punto' && r.riferimento_chiave) {
      if (raccolto) prepared(`INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', ?) ON CONFLICT(partita_id, punto_chiave) DO NOTHING`).run(partitaId, r.riferimento_chiave, adesso);
      else prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, r.riferimento_chiave);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo, contestoSpilli(partitaId));
}

// ---- Immagini degli spilli (schermate di riferimento) ----

function rigaSpillo(id: number): RigaSpillo {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);
  return r;
}

/** Aggiunge una schermata allo spillo (file nell'istanza, ambito «spillo»); restituisce lo spillo aggiornato. */
export function aggiungiImmagineSpillo(spilloId: number, mime: string, contenuto: Buffer, didascalia = ''): SpilloDto {
  const r = rigaSpillo(spilloId);
  const chiave = `${spilloId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  salvaImmagine('spillo', chiave, mime, contenuto);
  const adesso = nowIso();
  const ordine = (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM spillo_immagine WHERE spillo_id = ?').get(spilloId) as { n: number }).n;
  prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, NULL, ?, ?)').run(spilloId, ordine, chiave, didascalia.slice(0, 300), adesso);
  prepared("UPDATE spillo SET updated_at = ? WHERE id = ?").run(adesso, spilloId);
  return spilloDto(rigaSpillo(r.id));
}

export function aggiornaImmagineSpillo(id: number, dati: { didascalia?: string; ordine?: number }): SpilloDto {
  const i = prepared('SELECT * FROM spillo_immagine WHERE id = ?').get(id) as RigaImmagineSpillo | undefined;
  if (!i) throw httpErrors.notFound('immagine-non-trovata', `L'immagine ${id} non esiste.`);
  prepared('UPDATE spillo_immagine SET didascalia = ?, ordine = ?, updated_at = ? WHERE id = ?').run((dati.didascalia ?? i.didascalia).slice(0, 300), dati.ordine ?? i.ordine, nowIso(), id);
  return spilloDto(rigaSpillo(i.spillo_id));
}

export function eliminaImmagineSpillo(id: number): SpilloDto {
  const i = prepared('SELECT * FROM spillo_immagine WHERE id = ?').get(id) as RigaImmagineSpillo | undefined;
  if (!i) throw httpErrors.notFound('immagine-non-trovata', `L'immagine ${id} non esiste.`);
  getDb().transaction(() => {
    prepared('DELETE FROM spillo_immagine WHERE id = ?').run(id);
    if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
  })();
  return spilloDto(rigaSpillo(i.spillo_id));
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
  const ammesse = radice ? new Set(discendentiDi(radice)) : null;
  const mappe: EsportazioneMappeDto['mappe'] = (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, chiave').all() as RigaMappa[]).filter((m) => !ammesse || ammesse.has(m.chiave)).map((m) => ({
    chiave: m.chiave, nome: m.nome, tipo: m.tipo, genitore: m.genitore_chiave, ordine: m.ordine, immagine: m.immagine_chiave, asset: m.asset, larghezza: m.larghezza, altezza: m.altezza,
    entita: m.entita_tipo && m.entita_chiave ? { tipo: m.entita_tipo, chiave: m.entita_chiave } : null, note: m.note,
    spilli: (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(m.chiave) as RigaSpillo[]).map((s) => ({
      tipo: s.tipo, nome: s.nome, descrizione: s.descrizione, x: s.x, y: s.y, riferimento: s.riferimento_tipo && s.riferimento_chiave ? { tipo: s.riferimento_tipo, chiave: s.riferimento_chiave } : null, collezionabile: s.collezionabile === 1, ordine: s.ordine,
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
    const chiaveImg = m.immagine ?? (leggiImmagine('mappa', m.chiave) ? m.chiave : null);
    if (!chiaveImg) continue;
    const img = leggiImmagine('mappa', chiaveImg);
    if (img?.origineUrl) provenienze.push({ mappa: m.chiave, origineUrl: img.origineUrl });
    m.immagine = chiaveImg;
    try {
      const f = fileImmagine('mappa', chiaveImg);
      immagini[chiaveImg] = { mime: f.mime, base64: fs.readFileSync(f.percorso).toString('base64') };
    } catch {
      // immagine registrata ma file assente: esportata senza immagine
    }
  }
  return { versione: 1, esportato: nowIso(), mappe, immagini, ...(provenienze.length > 0 ? { provenienze } : {}) };
}

export interface EsitoImportazione { mappe: number; spilli: number; immagini: number; saltate: string[]; /** Condizioni scartate perché citano chiavi assenti dalla Guida. */ condizioniScartate: number }

/** Importa un pacchetto (o il seed): per chiave, con `sovrascrivi` sostituisce mappe e spilli esistenti; altrimenti salta le mappe già presenti
 * (il seed aggiorna solo le mappe di origine seed, sostituendo i soli spilli di origine seed e conservando quelli dell'utente). */
export function importaMappe(pacchetto: EsportazioneMappeDto, opz: { sovrascrivi?: boolean; origine?: 'seed' | 'utente' } = {}): EsitoImportazione {
  if (!pacchetto || pacchetto.versione !== 1 || !Array.isArray(pacchetto.mappe)) throw httpErrors.badRequest('pacchetto-non-valido', 'Pacchetto delle mappe non riconosciuto (versione 1 attesa).');
  const origine = opz.origine ?? 'utente';
  const esito: EsitoImportazione = { mappe: 0, spilli: 0, immagini: 0, saltate: [], condizioniScartate: 0 };
  getDb().transaction(() => {
    const adesso = nowIso();
    // prima le mappe (in ordine di dipendenza: i genitori possono arrivare dopo → secondo passaggio per i genitori)
    for (const m of pacchetto.mappe) {
      if (!chiaveValida(m.chiave) || !(TIPI_MAPPA as readonly string[]).includes(m.tipo)) { esito.saltate.push(m.chiave); continue; }
      const esistente = prepared('SELECT origine FROM mappa WHERE chiave = ?').get(m.chiave) as { origine: string } | undefined;
      if (esistente && !opz.sovrascrivi && !(origine === 'seed' && esistente.origine === 'seed')) { esito.saltate.push(m.chiave); continue; }
      if (esistente && origine === 'seed' && esistente.origine === 'utente') { esito.saltate.push(m.chiave); continue; }
      prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, entita_tipo, entita_chiave, origine, note, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, ordine = excluded.ordine, immagine_chiave = COALESCE(excluded.immagine_chiave, mappa.immagine_chiave), asset = excluded.asset,
          larghezza = excluded.larghezza, altezza = excluded.altezza, entita_tipo = excluded.entita_tipo, entita_chiave = excluded.entita_chiave, origine = excluded.origine, note = excluded.note, updated_at = excluded.updated_at`)
        .run(m.chiave, m.nome, m.tipo, m.ordine ?? 0, m.immagine ?? null, m.asset ?? null, m.larghezza ?? null, m.altezza ?? null, m.entita?.tipo ?? null, m.entita?.chiave ?? null, origine, m.note ?? '', adesso);
      // Con «sovrascrivi» la mappa viene sostituita per intero; altrimenti (seed sopra seed) si rimpiazzano solo gli spilli della stessa
      // origine, così gli spilli aggiunti dall'utente su una mappa del seed sopravvivono al reseed.
      const daTogliere = (opz.sovrascrivi ? prepared('SELECT id FROM spillo WHERE mappa_chiave = ?').all(m.chiave) : prepared('SELECT id FROM spillo WHERE mappa_chiave = ? AND origine = ?').all(m.chiave, origine)) as Array<{ id: number }>;
      for (const { id } of daTogliere) {
        for (const i of prepared('SELECT immagine_chiave FROM spillo_immagine WHERE spillo_id = ?').all(id) as Array<{ immagine_chiave: string | null }>) if (i.immagine_chiave && leggiImmagine('spillo', i.immagine_chiave)) eliminaImmagine('spillo', i.immagine_chiave);
        prepared('DELETE FROM spillo WHERE id = ?').run(id);
      }
      // spilli del seed che l'utente ha modificato (ora `utente`, con l'identità di allora): il pacchetto non li reinserisce
      const identitaUtente = new Set(opz.sovrascrivi ? [] : (prepared("SELECT seed_identita_json FROM spillo WHERE mappa_chiave = ? AND origine = 'utente' AND seed_identita_json IS NOT NULL").all(m.chiave) as Array<{ seed_identita_json: string }>).map((r) => r.seed_identita_json));
      for (const s of m.spilli ?? []) {
        if (!(TIPI_SPILLO as readonly string[]).includes(s.tipo)) continue;
        const x = Math.min(100, Math.max(0, s.x)); const y = Math.min(100, Math.max(0, s.y));
        if (identitaUtente.has(identitaSpillo({ tipo: s.tipo, nome: s.nome, x, y, riferimento: s.riferimento ?? null }))) continue;
        // le condizioni con chiavi assenti dalla Guida si scartano (contate nell'esito), come l'API le rifiuta: mai uno spillo nascosto per sempre
        const { valide, scartate } = condizioniConChiaviEsistenti(s.condizioni);
        esito.condizioniScartate += scartate.length;
        const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at, condizioni_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(m.chiave, s.tipo, s.nome, s.descrizione ?? '', x, y, s.riferimento?.tipo ?? null, s.riferimento?.chiave ?? null, s.collezionabile ? 1 : 0, s.ordine ?? 0, origine, adesso, jsonCondizioni(valide));
        const spilloId = Number(info.lastInsertRowid);
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
    for (const [chiave, img] of Object.entries(pacchetto.immagini ?? {})) {
      if (!img?.base64 || !img.mime) continue;
      if (!pacchetto.mappe.some((m) => m.immagine === chiave && !esito.saltate.includes(m.chiave))) continue;
      salvaImmagine('mappa', chiave, img.mime, Buffer.from(img.base64, 'base64'));
      esito.immagini++;
    }
  })();
  return esito;
}

// ---- Pacchetto per il repository (un luogo completo: seed + asset) ----

const ESTENSIONE: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

/** ZIP con `data/seed/mappe/<radice>.json` (formato del seed: immagini di base come asset `mappe/<chiave>`, schermate degli spilli come
 * asset `spilli/<mappa>/<n>-<m>`) e i file in `public/asset/…`, pronto da estrarre nella radice del repository: diventa dato preimpostato dell'app. */
export function creaPacchettoRepository(radice: string): { nomeFile: string; contenuto: Buffer } {
  const pacchetto = esportaMappe(radice);
  const voci: VoceZip[] = [];
  const adesso = new Date();
  for (const m of pacchetto.mappe) {
    if (m.immagine) {
      const img = base64Immagine('mappa', m.immagine);
      if (img) {
        const est = ESTENSIONE[img.mime] ?? 'png';
        voci.push({ nome: `public/asset/mappe/${m.chiave}.${est}`, contenuto: Buffer.from(img.base64, 'base64'), data: adesso });
        m.asset = `mappe/${m.chiave}`;
      }
      m.immagine = null;
    }
    m.spilli.forEach((s, n) => {
      s.immagini = (s.immagini ?? []).flatMap((i, k) => {
        if (i.asset) return [{ asset: i.asset, didascalia: i.didascalia }];
        if (!i.base64 || !i.mime) return [];
        const est = ESTENSIONE[i.mime] ?? 'png';
        const asset = `spilli/${m.chiave}/${n + 1}-${k + 1}`;
        voci.push({ nome: `public/asset/${asset}.${est}`, contenuto: Buffer.from(i.base64, 'base64'), data: adesso });
        return [{ asset, didascalia: i.didascalia }];
      });
      if (s.immagini.length === 0) delete s.immagini;
    });
  }
  const provenienze = pacchetto.provenienze ?? [];
  delete pacchetto.immagini;
  delete pacchetto.provenienze;
  delete pacchetto.esportato;
  const leggimi = [
    `Pacchetto della mappa «${radice}» e delle sue mappe figlie (${pacchetto.mappe.length} mappe) — Project P5R, ${adesso.toISOString()}`,
    '',
    'Estrai questo archivio nella radice del repository:',
    `- data/seed/mappe/${radice}.json: mappe e spilli nel formato del seed (caricati all'avvio insieme a data/seed/mappe-editor.json)`,
    '- public/asset/mappe/*: immagini di base delle mappe (il manifest degli asset le raccoglie da solo)',
    '- public/asset/spilli/*: schermate di riferimento degli spilli (puntate dagli spilli come asset spilli/<mappa>/<n>-<m>)',
    ...(provenienze.length > 0 ? ['', 'Provenienza delle immagini di base scaricate dalle guide (a titolo informativo):', ...provenienze.map((e) => `- ${e.mappa}: ${e.origineUrl}`)] : []),
    '',
    'Consegna: estratto nella radice del repository e committato, il pacchetto viene caricato dal seed a ogni avvio (origine «seed»).',
    '',
  ].join('\n');
  voci.unshift({ nome: `data/seed/mappe/${radice}.json`, contenuto: Buffer.from(JSON.stringify(pacchetto, null, 1) + '\n', 'utf-8'), data: adesso });
  voci.unshift({ nome: 'LEGGIMI.txt', contenuto: Buffer.from(leggimi, 'utf-8'), data: adesso });
  return { nomeFile: `mappa-${radice}.zip`, contenuto: creaZip(voci) };
}
