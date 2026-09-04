// ============================================================
// cittaService — quartieri di Tokyo e luoghi con ciò che offrono (Fase 8.1)
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { LuogoDto, PiantaAreaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';
import { nowIso } from '../db/dbService.js';
import { importaImmagineDaUrl } from './immaginiService.js';
import { datiGuida } from './richiesteService.js';

interface RigaPiantaQ { quartiere_chiave: string; url: string; pagina: string | null; fonte: string; licenza: string; larghezza: number | null; altezza: number | null; note: string }

/** Chiave dell'immagine (ambito «mappa») della mappa di un quartiere. */
export const chiaveImmagineQuartiere = (quartiere: string): string => `citta-${quartiere}`;

interface RigaQuartiere { chiave: string; ordine: number; nome: string; sblocco: string | null; descrizione: string; fonte: string }
interface RigaLuogo { chiave: string; quartiere_chiave: string; ordine: number; tipo: string; nome: string; cosa_offre: string; quando: string | null; giorni: string | null; sblocco: string | null; confidenti_json: string; attivita_json: string; negozio: string | null; piatti_json: string | null; note: string | null; fonte: string; verificato: number }

function luogoDto(r: RigaLuogo, nomiConfidenti: Map<string, string>, marcatori: Map<string, { x: number; y: number }> = new Map()): LuogoDto {
  const confidenti = (JSON.parse(r.confidenti_json) as string[]).map((c) => ({ chiave: c, nome: nomiConfidenti.get(c) ?? c }));
  return {
    chiave: r.chiave, ordine: r.ordine, tipo: r.tipo as LuogoDto['tipo'], nome: r.nome, cosaOffre: r.cosa_offre, quando: r.quando as LuogoDto['quando'], giorni: r.giorni, sblocco: r.sblocco,
    confidenti, attivita: JSON.parse(r.attivita_json) as string[], negozio: r.negozio, piatti: r.piatti_json ? (JSON.parse(r.piatti_json) as LuogoDto['piatti']) : null, note: r.note, fonte: r.fonte, verificato: r.verificato === 1,
    marcatore: marcatori.get(r.chiave) ?? null,
  };
}

function nomiConfidenti(): Map<string, string> {
  return new Map((prepared('SELECT chiave, nome FROM confidente').all() as Array<{ chiave: string; nome: string }>).map((c) => [c.chiave, c.nome]));
}

/** Quartieri in ordine con conteggi dei luoghi. */
export function elencaQuartieri(): QuartiereRiassuntoDto[] {
  const righe = prepared(`SELECT q.*, (SELECT COUNT(*) FROM luogo l WHERE l.quartiere_chiave = q.chiave) AS luoghi, (SELECT COUNT(*) FROM luogo l WHERE l.quartiere_chiave = q.chiave AND l.verificato = 1) AS verificati
    FROM quartiere q ORDER BY q.ordine`).all() as Array<RigaQuartiere & { luoghi: number; verificati: number }>;
  return righe.map((q) => ({ chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, descrizione: q.descrizione, luoghi: q.luoghi, verificati: q.verificati }));
}

/** Scheda di un quartiere con i luoghi. */
export function dettaglioQuartiere(chiave: string): QuartiereDettaglioDto {
  const q = prepared('SELECT * FROM quartiere WHERE chiave = ?').get(chiave) as RigaQuartiere | undefined;
  if (!q) throw httpErrors.notFound('quartiere-non-trovato', `Il quartiere '${chiave}' non esiste.`);
  const nomi = nomiConfidenti();
  const marcatori = new Map((prepared('SELECT l.luogo_chiave, l.x, l.y FROM marcatore_luogo l JOIN luogo g ON g.chiave = l.luogo_chiave WHERE g.quartiere_chiave = ?').all(chiave) as Array<{ luogo_chiave: string; x: number; y: number }>).map((r) => [r.luogo_chiave, { x: r.x, y: r.y }]));
  const luoghi = (prepared('SELECT * FROM luogo WHERE quartiere_chiave = ? ORDER BY ordine').all(chiave) as RigaLuogo[]).map((r) => luogoDto(r, nomi, marcatori));
  const p = prepared('SELECT * FROM pianta_quartiere WHERE quartiere_chiave = ?').get(chiave) as RigaPiantaQ | undefined;
  const pianta: PiantaAreaDto | null = p ? { url: p.url, pagina: p.pagina, fonte: p.fonte, licenza: p.licenza, larghezza: p.larghezza, altezza: p.altezza, copertura: 'quartiere', note: p.note, alternative: [] } : null;
  const assenti = datiGuida<Record<string, string>>('mappe-citta-assenti') ?? {};
  const mappa = !!prepared("SELECT 1 FROM immagine WHERE ambito = 'mappa' AND chiave = ?").get(chiaveImmagineQuartiere(chiave));
  return { chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, descrizione: q.descrizione, fonte: q.fonte, luoghi, mappa, pianta, piantaAssente: pianta ? null : (assenti[chiave] ?? null) };
}

/** Posiziona (o rimuove con null) lo spillo di un luogo sulla mappa del suo quartiere (coordinate in percentuale). */
export function impostaMarcatoreLuogo(luogoChiave: string, pos: { x: number; y: number } | null): { x: number; y: number } | null {
  if (!prepared('SELECT 1 FROM luogo WHERE chiave = ?').get(luogoChiave)) throw httpErrors.notFound('luogo-non-trovato', `Il luogo '${luogoChiave}' non esiste.`);
  if (pos === null) {
    prepared('DELETE FROM marcatore_luogo WHERE luogo_chiave = ?').run(luogoChiave);
    return null;
  }
  const x = Math.min(100, Math.max(0, pos.x)); const y = Math.min(100, Math.max(0, pos.y));
  prepared("INSERT INTO marcatore_luogo (luogo_chiave, x, y, updated_at, origine) VALUES (?, ?, ?, ?, 'utente') ON CONFLICT(luogo_chiave) DO UPDATE SET x = excluded.x, y = excluded.y, updated_at = excluded.updated_at, origine = 'utente'").run(luogoChiave, x, y, nowIso());
  return { x, y };
}

/** Scarica nell'istanza la mappa del quartiere dall'URL del seed. */
export async function scaricaPiantaQuartiere(quartiere: string): Promise<{ quartiere: string; mime: string; byte: number; fonte: string; url: string }> {
  const p = prepared('SELECT * FROM pianta_quartiere WHERE quartiere_chiave = ?').get(quartiere) as RigaPiantaQ | undefined;
  if (!p) throw httpErrors.notFound('pianta-non-disponibile', `Nessuna mappa collegata per il quartiere '${quartiere}'.`);
  const img = await importaImmagineDaUrl('mappa', chiaveImmagineQuartiere(quartiere), p.url);
  return { quartiere, mime: img.mime, byte: img.byte, fonte: p.fonte, url: p.url };
}
