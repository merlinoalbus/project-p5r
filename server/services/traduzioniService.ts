// ============================================================
// traduzioniService — resa italiana delle chiavi canoniche (cache in memoria)
// ============================================================
//
// La tabella `traduzione` è piccola (≈1000 righe) e letta da ogni risposta
// del compendio: si tiene una cache per ambito, invalidata a ogni scrittura.
// `t(ambito, chiave)` restituisce la resa italiana o, se manca, la chiave
// stessa (mai `undefined` verso il frontend).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { config } from '../config.js';
import { httpErrors } from '../utils/httpError.js';
import type { TraduzioneDto } from '../../shared/types.js';
import type { TraduzioniSeed } from '../../shared/seed.js';

interface RigaTraduzione {
  ambito: string;
  chiave: string;
  testo: string;
  extra_json: string | null;
  fonte: 'seed' | 'utente';
  updated_at: string;
}

let cache: Map<string, Map<string, RigaTraduzione>> | null = null;

function caricaCache(): Map<string, Map<string, RigaTraduzione>> {
  if (cache) return cache;
  cache = new Map();
  for (const r of prepared('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione').all() as RigaTraduzione[]) {
    let m = cache.get(r.ambito);
    if (!m) {
      m = new Map();
      cache.set(r.ambito, m);
    }
    m.set(r.chiave, r);
  }
  return cache;
}

/** Svuota la cache (dopo scritture o reseed). */
export function invalidaCacheTraduzioni(): void {
  cache = null;
}

/** Resa italiana di una chiave; se assente restituisce la chiave stessa. */
export function t(ambito: string, chiave: string): string {
  return caricaCache().get(ambito)?.get(chiave)?.testo ?? chiave;
}

/** Resa italiana o null se la chiave è null/assente. */
export function tOpz(ambito: string, chiave: string | null | undefined): string | null {
  if (chiave === null || chiave === undefined) return null;
  return caricaCache().get(ambito)?.get(chiave)?.testo ?? null;
}

/** Campo extra (es. sigla) di una traduzione. */
export function extra<T = Record<string, unknown>>(ambito: string, chiave: string): T | null {
  const r = caricaCache().get(ambito)?.get(chiave);
  return r?.extra_json ? (JSON.parse(r.extra_json) as T) : null;
}

/** Tutte le voci di un ambito come mappa chiave → testo. */
export function mappaAmbito(ambito: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, r] of caricaCache().get(ambito) ?? []) out[k] = r.testo;
  return out;
}

/** Voci di un ambito con extra, nell'ordine di inserimento del seed. */
export function vociAmbito(ambito: string): Array<{ chiave: string; testo: string; extra: Record<string, unknown> | null }> {
  return [...(caricaCache().get(ambito) ?? []).values()].map((r) => ({ chiave: r.chiave, testo: r.testo, extra: r.extra_json ? JSON.parse(r.extra_json) : null }));
}

function versoDto(r: RigaTraduzione): TraduzioneDto {
  return { ambito: r.ambito, chiave: r.chiave, testo: r.testo, extra: r.extra_json ? JSON.parse(r.extra_json) : null, fonte: r.fonte, updatedAt: r.updated_at };
}

/** Elenco delle traduzioni, filtrabile per ambito e testo (chiave o resa). */
export function elencaTraduzioni(filtro: { ambito?: string; q?: string; soloUtente?: boolean }): TraduzioneDto[] {
  const condizioni: string[] = [];
  const parametri: unknown[] = [];
  if (filtro.ambito) {
    condizioni.push('ambito = ?');
    parametri.push(filtro.ambito);
  }
  if (filtro.q) {
    condizioni.push('(chiave LIKE ? OR testo LIKE ?)');
    parametri.push(`%${filtro.q}%`, `%${filtro.q}%`);
  }
  if (filtro.soloUtente) condizioni.push("fonte = 'utente'");
  const where = condizioni.length ? `WHERE ${condizioni.join(' AND ')}` : '';
  return (getDb().prepare(`SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione ${where} ORDER BY ambito, chiave`).all(...parametri) as RigaTraduzione[]).map(versoDto);
}

/** Ambiti presenti con il numero di voci. */
export function elencaAmbiti(): Array<{ ambito: string; voci: number; modificate: number }> {
  return prepared("SELECT ambito, COUNT(*) AS voci, SUM(CASE WHEN fonte = 'utente' THEN 1 ELSE 0 END) AS modificate FROM traduzione GROUP BY ambito ORDER BY ambito").all() as Array<{ ambito: string; voci: number; modificate: number }>;
}

/** Imposta la resa italiana di una voce esistente (diventa fonte='utente'). */
export function aggiornaTraduzione(ambito: string, chiave: string, testo: string): TraduzioneDto {
  const esiste = prepared('SELECT 1 FROM traduzione WHERE ambito = ? AND chiave = ?').get(ambito, chiave);
  if (!esiste) throw httpErrors.notFound('traduzione-non-trovata', `Nessuna voce per ${ambito}/${chiave}.`);
  prepared("UPDATE traduzione SET testo = ?, fonte = 'utente', updated_at = ? WHERE ambito = ? AND chiave = ?").run(testo, nowIso(), ambito, chiave);
  invalidaCacheTraduzioni();
  return versoDto(prepared('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaTraduzione);
}

/** Ripristina la resa del seed (fonte torna 'seed'). */
export function ripristinaTraduzione(ambito: string, chiave: string, seedDir: string = config.seedDir): TraduzioneDto {
  const esiste = prepared('SELECT 1 FROM traduzione WHERE ambito = ? AND chiave = ?').get(ambito, chiave);
  if (!esiste) throw httpErrors.notFound('traduzione-non-trovata', `Nessuna voce per ${ambito}/${chiave}.`);
  const testoSeed = testoDalSeed(ambito, chiave, seedDir);
  if (testoSeed === null) throw httpErrors.notFound('traduzione-seed-assente', `Il seed non contiene ${ambito}/${chiave}: nulla da ripristinare.`);
  prepared("UPDATE traduzione SET testo = ?, fonte = 'seed', updated_at = ? WHERE ambito = ? AND chiave = ?").run(testoSeed, nowIso(), ambito, chiave);
  invalidaCacheTraduzioni();
  return versoDto(prepared('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaTraduzione);
}

/** Cerca la resa originale nel file traduzioni.json del seed. */
function testoDalSeed(ambito: string, chiave: string, seedDir: string): string | null {
  const file = path.join(seedDir, 'traduzioni.json');
  if (!fs.existsSync(file)) return null;
  const tr = JSON.parse(fs.readFileSync(file, 'utf-8')) as TraduzioniSeed;
  switch (ambito) {
    case 'arcana': return tr.arcani.find((a) => a.chiave === chiave)?.nome ?? null;
    case 'elementoSkill': return tr.elementiSkill[chiave] ?? null;
    case 'elementoAffinita': return tr.elementiAffinita.find((e) => e.chiave === chiave)?.nome ?? null;
    case 'affinita': return tr.affinita[chiave]?.nome ?? null;
    case 'tipoEredita': return tr.tipiEredita[chiave] ?? null;
    case 'colonnaEredita': return tr.colonneEredita.find((c) => c.chiave === chiave)?.nome ?? null;
    case 'statistica': return tr.statistiche.find((s) => s.chiave === chiave)?.nome ?? null;
    case 'tipoOggetto': return tr.tipiOggetto[chiave] ?? null;
    case 'vincoloOggetto': return tr.vincoliOggetto[chiave] ?? null;
    case 'areaMementos': return tr.areeMementos[chiave] ?? null;
    case 'doteSociale': return tr.dotiSociali.find((d) => d.chiave === chiave)?.nome ?? null;
    case 'notaPersona': return tr.notePersona[chiave] ?? null;
    case 'fonteEsclusiva': return tr.fontiEsclusive[chiave] ?? null;
    case 'effettoSkill': return tr.effettiSkill[chiave] ?? null;
    case 'descrizioneOggetto': return tr.descrizioniOggetti[chiave] ?? null;
    case 'negoziazione': return tr.negoziazioni[chiave] ?? null;
    case 'fonteCarta': return tr.fontiCarta[chiave] ?? null;
    // Localizzazione italiana dalla guida (step 0.11)
    case 'skill': return tr.skill?.[chiave] ?? null;
    case 'persona': return tr.persone?.[chiave] ?? null;
    case 'oggetto': return tr.oggetti?.[chiave] ?? null;
    case 'termine': return tr.termini?.find((t) => t.chiave === chiave)?.nome ?? null;
    default: return null;
  }
}
