// ============================================================
// dungeonService — Palazzi e Dedali: schede, aree, punti di interesse con stato per partita, marcatori delle mappe (Fase 7.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { registraEvento } from './storicoService.js';
import type { AreaDungeonDto, DungeonDettaglioDto, DungeonRiassuntoDto, PiantaAreaDto, PuntoInteresseDto, StatoPunto } from '../../shared/types.js';
import { importaImmagineDaUrl } from './immaginiService.js';

interface RigaDungeon { chiave: string; tipo: 'palazzo' | 'mementos'; ordine: number; nome: string; sovrano: string; arcana_sovrano: string; data_sblocco: string; data_scadenza: string; furto_consigliato: string; livello_consigliato: string; note: string; fonti_json: string }
interface RigaArea { chiave: string; dungeon_chiave: string; ordine: number; nome: string; descrizione: string }
interface RigaPunto { chiave: string; area_chiave: string; ordine: number; tipo: PuntoInteresseDto['tipo']; nome: string; descrizione: string; esauribile: number; dettagli_json: string; fonte: string }

function statiPartita(partitaId: number | undefined): Map<string, StatoPunto> {
  if (partitaId === undefined) return new Map();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Map((prepared('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?').all(partitaId) as Array<{ punto_chiave: string; stato: StatoPunto }>).map((r) => [r.punto_chiave, r.stato]));
}

function marcatori(): Map<string, { x: number; y: number }> {
  return new Map((prepared('SELECT punto_chiave, x, y FROM marcatore_mappa').all() as Array<{ punto_chiave: string; x: number; y: number }>).map((r) => [r.punto_chiave, { x: r.x, y: r.y }]));
}

interface RigaPianta { area_chiave: string; url: string; pagina: string | null; fonte: string; licenza: string; larghezza: number | null; altezza: number | null; copertura: string; copre_aree_json: string | null; note: string; alternative_json: string }

function pianteAree(): Map<string, RigaPianta> {
  return new Map((prepared('SELECT * FROM pianta_area').all() as RigaPianta[]).map((r) => [r.area_chiave, r]));
}

function piantaDto(r: RigaPianta | undefined): PiantaAreaDto | null {
  if (!r) return null;
  const alternative = (JSON.parse(r.alternative_json) as Array<{ url: string; pagina: string | null; fonte: string }>).map((a) => ({ url: a.url, pagina: a.pagina ?? null, fonte: a.fonte }));
  return { url: r.url, pagina: r.pagina, fonte: r.fonte, licenza: r.licenza, larghezza: r.larghezza, altezza: r.altezza, copertura: r.copertura, note: r.note, alternative };
}

/** Motivi noti dell'assenza di una pianta (dal seed `mappe.json`, campo note delle aree senza url). */
function motiviAssenza(): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of prepared("SELECT chiave, json FROM dati_guida WHERE chiave = 'mappe-assenti'").all() as Array<{ chiave: string; json: string }>) {
    for (const [k, v] of Object.entries(JSON.parse(r.json) as Record<string, string>)) m.set(k, v);
  }
  return m;
}

function mappePresenti(): Map<string, string | null> {
  return new Map((prepared("SELECT chiave, origine_url FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string; origine_url: string | null }>).map((r) => [r.chiave, r.origine_url ?? null]));
}

/** Fonte effettiva della pianta presente: la principale, un'alternativa o l'indirizzo grezzo se non riconosciuto. */
function piantaScaricata(origine: string | null | undefined, pianta: PiantaAreaDto | null): AreaDungeonDto['piantaScaricata'] {
  if (!origine) return null;
  if (pianta && pianta.url === origine) return { url: origine, fonte: pianta.fonte, pagina: pianta.pagina };
  const alt = pianta?.alternative.find((a) => a.url === origine);
  if (alt) return { url: origine, fonte: alt.fonte, pagina: alt.pagina };
  let host = origine;
  try { host = new URL(origine).hostname.replace(/^www\./, ''); } catch { /* indirizzo non URL: si mostra com'è */ }
  return { url: origine, fonte: host, pagina: null };
}

function riassunto(r: RigaDungeon, stati: Map<string, StatoPunto>, conPartita: boolean): DungeonRiassuntoDto {
  const punti = prepared('SELECT p.chiave, p.esauribile FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ?').all(r.chiave) as Array<{ chiave: string; esauribile: number }>;
  return {
    chiave: r.chiave, tipo: r.tipo, ordine: r.ordine, nome: r.nome, sovrano: r.sovrano, arcanaSovrano: r.arcana_sovrano, arcanaSovranoNome: r.arcana_sovrano ? t('arcana', r.arcana_sovrano) : '',
    date: { sblocco: r.data_sblocco, scadenza: r.data_scadenza, furtoConsigliato: r.furto_consigliato }, livelloConsigliato: r.livello_consigliato,
    aree: (prepared('SELECT COUNT(*) AS n FROM dungeon_area WHERE dungeon_chiave = ?').get(r.chiave) as { n: number }).n,
    punti: punti.length, esauribili: punti.filter((p) => p.esauribile === 1).length,
    gestiti: conPartita ? punti.filter((p) => stati.has(p.chiave)).length : null,
  };
}

export function elencaDungeon(partitaId?: number): DungeonRiassuntoDto[] {
  const stati = statiPartita(partitaId);
  return (prepared('SELECT * FROM dungeon ORDER BY ordine').all() as RigaDungeon[]).map((r) => riassunto(r, stati, partitaId !== undefined));
}

export function dettaglioDungeon(chiave: string, partitaId?: number): DungeonDettaglioDto {
  const r = prepared('SELECT * FROM dungeon WHERE chiave = ?').get(chiave) as RigaDungeon | undefined;
  if (!r) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
  const stati = statiPartita(partitaId);
  const marc = marcatori();
  const mappe = mappePresenti();
  const piante = pianteAree();
  const assenti = motiviAssenza();
  const aree = (prepared('SELECT * FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(chiave) as RigaArea[]).map((a): AreaDungeonDto => ({
    chiave: a.chiave, ordine: a.ordine, nome: a.nome, descrizione: a.descrizione, mappa: mappe.has(a.chiave), pianta: piantaDto(piante.get(a.chiave)), piantaScaricata: mappe.has(a.chiave) ? piantaScaricata(mappe.get(a.chiave), piantaDto(piante.get(a.chiave))) : null, piantaAssente: piante.has(a.chiave) ? null : (assenti.get(a.chiave) ?? null),
    punti: (prepared('SELECT * FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine').all(a.chiave) as RigaPunto[]).map((p): PuntoInteresseDto => ({
      chiave: p.chiave, ordine: p.ordine, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dettagli: JSON.parse(p.dettagli_json) as Record<string, unknown>, fonte: p.fonte,
      stato: stati.get(p.chiave) ?? null, marcatore: marc.get(p.chiave) ?? null,
    })),
  }));
  return { ...riassunto(r, stati, partitaId !== undefined), note: r.note, fonti: JSON.parse(r.fonti_json) as string[], aree };
}

/** Stato di un punto nella partita: 'ottenuto', 'esaurito' oppure null per azzerare. */
export function impostaStatoPunto(partitaId: number, puntoChiave: string, stato: StatoPunto | null): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const p = prepared('SELECT p.*, a.nome AS area_nome, d.nome AS dungeon_nome FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE p.chiave = ?').get(puntoChiave) as (RigaPunto & { area_nome: string; dungeon_nome: string }) | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, puntoChiave) as { stato: StatoPunto } | undefined)?.stato ?? null;
    if (stato === null) prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, puntoChiave);
    else prepared('INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at').run(partitaId, puntoChiave, stato, adesso);
    if (stato !== null && stato !== prima) {
      registraEvento(partitaId, 'punto-dungeon', `${p.dungeon_nome} · ${p.area_nome}: ${p.nome} ${stato === 'ottenuto' ? 'ottenuto' : 'esaurito'}`, p.descrizione.slice(0, 200), { punto: puntoChiave, tipo: p.tipo, stato });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const marc = marcatori().get(puntoChiave) ?? null;
  return { chiave: p.chiave, ordine: p.ordine, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dettagli: JSON.parse(p.dettagli_json) as Record<string, unknown>, fonte: p.fonte, stato, marcatore: marc };
}

/** Posiziona (o rimuove con null) lo spillo di un punto sulla mappa della sua area (coordinate in percentuale). */
export function impostaMarcatore(puntoChiave: string, posizione: { x: number; y: number } | null): { x: number; y: number } | null {
  if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(puntoChiave)) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  if (posizione === null) {
    prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(puntoChiave);
    return null;
  }
  const x = Math.max(0, Math.min(100, posizione.x));
  const y = Math.max(0, Math.min(100, posizione.y));
  prepared("INSERT INTO marcatore_mappa (punto_chiave, x, y, updated_at, origine) VALUES (?, ?, ?, ?, 'utente') ON CONFLICT(punto_chiave) DO UPDATE SET x = excluded.x, y = excluded.y, updated_at = excluded.updated_at, origine = 'utente'").run(puntoChiave, x, y, nowIso());
  return { x, y };
}

/** Scarica nell'istanza la pianta dell'area dall'URL del seed (poi dalle alternative, se il primo fallisce). */
export async function scaricaPianta(areaChiave: string): Promise<{ area: string; mime: string; byte: number; fonte: string; url: string }> {
  const r = prepared('SELECT * FROM pianta_area WHERE area_chiave = ?').get(areaChiave) as RigaPianta | undefined;
  if (!r) throw httpErrors.notFound('pianta-non-disponibile', `Nessuna pianta collegata per l'area '${areaChiave}'.`);
  const candidati = [{ url: r.url, fonte: r.fonte }, ...(JSON.parse(r.alternative_json) as Array<{ url: string; fonte: string }>).map((a) => ({ url: a.url, fonte: a.fonte }))];
  let ultimo: unknown = null;
  for (const c of candidati) {
    try {
      const img = await importaImmagineDaUrl('mappa', areaChiave, c.url);
      return { area: areaChiave, mime: img.mime, byte: img.byte, fonte: c.fonte, url: c.url };
    } catch (err) {
      ultimo = err;
    }
  }
  throw httpErrors.badRequest('download-fallito', `Impossibile scaricare la pianta di '${areaChiave}' da nessuna delle fonti collegate${ultimo instanceof Error ? `: ${ultimo.message}` : ''}.`);
}
