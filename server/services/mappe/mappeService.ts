// ============================================================
// mappeService — albero delle mappe, spilli con stato per partita, editor, esportazione/importazione (Fase 13.1)
// ============================================================

import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { t } from '../traduzioniService.js';
import { fileImmagine, leggiImmagine, salvaImmagine } from '../immaginiService.js';
import { dettaglioNegozio } from '../negoziService.js';
import { DEFINIZIONI_SPILLO, TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../../shared/spilli.js';
import type { DettaglioSpilloDto, EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../../../shared/types.js';
import fs from 'node:fs';

interface RigaMappa { chiave: string; nome: string; tipo: TipoMappa; genitore_chiave: string | null; ordine: number; immagine_chiave: string | null; asset: string | null; larghezza: number | null; altezza: number | null; entita_tipo: string | null; entita_chiave: string | null; origine: 'seed' | 'utente'; note: string; updated_at: string }
interface RigaSpillo { id: number; mappa_chiave: string; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento_tipo: TipoRiferimento | null; riferimento_chiave: string | null; collezionabile: number; ordine: number; origine: 'seed' | 'utente'; updated_at: string }

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

function riassunto(r: RigaMappa): MappaRiassuntoDto {
  const c = conteggi(r.chiave);
  return {
    chiave: r.chiave, nome: r.nome, tipo: r.tipo, genitore: r.genitore_chiave, ordine: r.ordine,
    immagineUrl: r.immagine_chiave && leggiImmagine('mappa', r.immagine_chiave) ? `/api/immagini/mappa/${encodeURIComponent(r.immagine_chiave)}/file` : null,
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
      const m = prepared('SELECT chiave, nome, tipo FROM mappa WHERE chiave = ?').get(chiave) as { chiave: string; nome: string; tipo: TipoMappa } | undefined;
      return m ? { tipo: 'mappa', mappa: m } : null;
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
      return c ? { tipo: 'confidente', confidente: { chiave: c.chiave, nome: c.nome, arcanaNome: t('arcana', c.arcana) } } : null;
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
    return { chiave: n.chiave, nome: n.nome, tipo: n.tipo, articoli: n.articoliElenco.map((a) => ({ chiave: a.chiave, nome: a.nomeIt ?? a.nome, categoria: a.categoria, prezzo: a.prezzo, disponibileDal: a.disponibileDal, comprato: a.acquistato })) };
  } catch {
    return null;
  }
}

function spilloDto(r: RigaSpillo, partitaId?: number, raccolti?: Set<number>): SpilloDto {
  const dettaglio = dettaglioRiferimento(r.riferimento_tipo, r.riferimento_chiave, partitaId);
  let raccolto = raccolti?.has(r.id) ?? false;
  // Un punto di dungeon già gestito nella Guida (ottenuto/esaurito) conta come raccolto anche sulla mappa.
  if (dettaglio?.tipo === 'punto' && dettaglio.punto?.stato) raccolto = true;
  return {
    id: r.id, mappaChiave: r.mappa_chiave, tipo: r.tipo, tipoNome: DEFINIZIONI_SPILLO[r.tipo]?.nome ?? r.tipo, colore: DEFINIZIONI_SPILLO[r.tipo]?.colore ?? '#888',
    nome: r.nome, descrizione: r.descrizione, x: r.x, y: r.y,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null,
    collezionabile: r.collezionabile === 1, ordine: r.ordine, origine: r.origine, raccolto, dettaglio, updatedAt: r.updated_at,
  };
}

/** Mappa con percorso, figli, spilli (con stato della partita e dettagli delle entità collegate). */
export function dettaglioMappa(chiave: string, partitaId?: number): MappaDto {
  const r = rigaMappa(chiave);
  const figli = (prepared('SELECT * FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, nome').all(chiave) as RigaMappa[]).map(riassunto);
  const raccolti = partitaId ? new Set((prepared('SELECT spillo_id FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_id: number }>).map((x) => x.spillo_id)) : undefined;
  const spilli = (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(chiave) as RigaSpillo[]).map((s) => spilloDto(s, partitaId, raccolti));
  const immagine = r.immagine_chiave ? leggiImmagine('mappa', r.immagine_chiave) : null;
  return {
    ...riassunto(r), larghezza: r.larghezza, altezza: r.altezza, note: r.note,
    immagineUrl: immagine ? `/api/immagini/mappa/${encodeURIComponent(r.immagine_chiave!)}/file?v=${encodeURIComponent(immagine.createdAt)}` : null,
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

export interface DatiMappa { nome?: string; tipo?: TipoMappa; genitore?: string | null; ordine?: number; asset?: string | null; larghezza?: number | null; altezza?: number | null; entita?: { tipo: string; chiave: string } | null; note?: string }

const chiaveValida = (chiave: string): boolean => /^[a-z0-9][a-z0-9-]{1,79}$/.test(chiave);

export function creaMappa(chiave: string, dati: DatiMappa & { nome: string; tipo: TipoMappa }): MappaDto {
  if (!chiaveValida(chiave)) throw httpErrors.badRequest('chiave-non-valida', 'La chiave della mappa ammette solo minuscole, cifre e trattini (2–80 caratteri).');
  if (prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(chiave)) throw httpErrors.conflict('mappa-esistente', `Esiste già una mappa con chiave '${chiave}'.`);
  if (!(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  if (dati.genitore) rigaMappa(dati.genitore);
  const adesso = nowIso();
  prepared(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, entita_tipo, entita_chiave, origine, note, updated_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'utente', ?, ?)`).run(chiave, dati.nome, dati.tipo, dati.genitore ?? null, dati.ordine ?? 0, dati.asset ?? null, dati.larghezza ?? null, dati.altezza ?? null, dati.entita?.tipo ?? null, dati.entita?.chiave ?? null, dati.note ?? '', adesso);
  return dettaglioMappa(chiave);
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

export interface DatiSpillo { tipo?: TipoSpillo; nome?: string; descrizione?: string; x?: number; y?: number; riferimento?: { tipo: TipoRiferimento; chiave: string } | null; collezionabile?: boolean; ordine?: number }

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
  const adesso = nowIso();
  const info = prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente', ?)`).run(mappaChiave, dati.tipo, dati.nome, dati.descrizione ?? '', dati.x, dati.y, dati.riferimento?.tipo ?? null, dati.riferimento?.chiave ?? null,
    (dati.collezionabile ?? DEFINIZIONI_SPILLO[dati.tipo].collezionabile) ? 1 : 0, dati.ordine ?? 0, adesso);
  prepared("UPDATE mappa SET updated_at = ? WHERE chiave = ?").run(adesso, mappaChiave);
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(Number(info.lastInsertRowid)) as RigaSpillo);
}

export function aggiornaSpillo(id: number, dati: DatiSpillo & { mappa?: string }): SpilloDto {
  const r = prepared('SELECT * FROM spillo WHERE id = ?').get(id) as RigaSpillo | undefined;
  if (!r) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${id} non esiste.`);
  if (dati.tipo && !(TIPI_SPILLO as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di spillo non ammesso.');
  if (dati.mappa) rigaMappa(dati.mappa);
  verificaRiferimento(dati.riferimento);
  prepared(`UPDATE spillo SET mappa_chiave = ?, tipo = ?, nome = ?, descrizione = ?, x = ?, y = ?, riferimento_tipo = ?, riferimento_chiave = ?, collezionabile = ?, ordine = ?, origine = 'utente', updated_at = ? WHERE id = ?`).run(
    dati.mappa ?? r.mappa_chiave, dati.tipo ?? r.tipo, dati.nome ?? r.nome, dati.descrizione ?? r.descrizione, dati.x ?? r.x, dati.y ?? r.y,
    dati.riferimento === undefined ? r.riferimento_tipo : dati.riferimento?.tipo ?? null, dati.riferimento === undefined ? r.riferimento_chiave : dati.riferimento?.chiave ?? null,
    dati.collezionabile === undefined ? r.collezionabile : dati.collezionabile ? 1 : 0, dati.ordine ?? r.ordine, nowIso(), id);
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
  const raccolti = new Set((prepared('SELECT spillo_id FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_id: number }>).map((x) => x.spillo_id));
  return spilloDto(prepared('SELECT * FROM spillo WHERE id = ?').get(spilloId) as RigaSpillo, partitaId, raccolti);
}

// ---- Esportazione / importazione ----

/** Pacchetto JSON con mappe, spilli e immagini dell'istanza (base64): stesso formato del seed `mappe-editor.json` (senza `immagini`). */
export function esportaMappe(): EsportazioneMappeDto {
  const mappe = (prepared('SELECT * FROM mappa ORDER BY (genitore_chiave IS NOT NULL), ordine, chiave').all() as RigaMappa[]).map((m) => ({
    chiave: m.chiave, nome: m.nome, tipo: m.tipo, genitore: m.genitore_chiave, ordine: m.ordine, immagine: m.immagine_chiave, asset: m.asset, larghezza: m.larghezza, altezza: m.altezza,
    entita: m.entita_tipo && m.entita_chiave ? { tipo: m.entita_tipo, chiave: m.entita_chiave } : null, note: m.note,
    spilli: (prepared('SELECT * FROM spillo WHERE mappa_chiave = ? ORDER BY ordine, id').all(m.chiave) as RigaSpillo[]).map((s) => ({
      tipo: s.tipo, nome: s.nome, descrizione: s.descrizione, x: s.x, y: s.y, riferimento: s.riferimento_tipo && s.riferimento_chiave ? { tipo: s.riferimento_tipo, chiave: s.riferimento_chiave } : null, collezionabile: s.collezionabile === 1, ordine: s.ordine,
    })),
  }));
  const immagini: EsportazioneMappeDto['immagini'] = {};
  for (const m of mappe) {
    if (!m.immagine) continue;
    const img = leggiImmagine('mappa', m.immagine);
    if (!img) continue;
    try {
      const f = fileImmagine('mappa', m.immagine);
      immagini[m.immagine] = { mime: f.mime, base64: fs.readFileSync(f.percorso).toString('base64') };
    } catch {
      // immagine registrata ma file assente: esportata senza immagine
    }
  }
  return { versione: 1, esportato: nowIso(), mappe, immagini };
}

export interface EsitoImportazione { mappe: number; spilli: number; immagini: number; saltate: string[] }

/** Importa un pacchetto (o il seed): per chiave, con `sovrascrivi` sostituisce mappe e spilli esistenti; altrimenti salta le mappe già presenti
 * (il seed aggiorna solo le mappe di origine seed, sostituendo i soli spilli di origine seed e conservando quelli dell'utente). */
export function importaMappe(pacchetto: EsportazioneMappeDto, opz: { sovrascrivi?: boolean; origine?: 'seed' | 'utente' } = {}): EsitoImportazione {
  if (!pacchetto || pacchetto.versione !== 1 || !Array.isArray(pacchetto.mappe)) throw httpErrors.badRequest('pacchetto-non-valido', 'Pacchetto delle mappe non riconosciuto (versione 1 attesa).');
  const origine = opz.origine ?? 'utente';
  const esito: EsitoImportazione = { mappe: 0, spilli: 0, immagini: 0, saltate: [] };
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
      if (opz.sovrascrivi) prepared('DELETE FROM spillo WHERE mappa_chiave = ?').run(m.chiave);
      else prepared('DELETE FROM spillo WHERE mappa_chiave = ? AND origine = ?').run(m.chiave, origine);
      for (const s of m.spilli ?? []) {
        if (!(TIPI_SPILLO as readonly string[]).includes(s.tipo)) continue;
        prepared(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(m.chiave, s.tipo, s.nome, s.descrizione ?? '', Math.min(100, Math.max(0, s.x)), Math.min(100, Math.max(0, s.y)), s.riferimento?.tipo ?? null, s.riferimento?.chiave ?? null, s.collezionabile ? 1 : 0, s.ordine ?? 0, origine, adesso);
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
