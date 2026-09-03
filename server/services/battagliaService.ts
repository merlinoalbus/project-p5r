// ============================================================
// battagliaService — Aiuto in battaglia: dati della guida (dati_guida «battaglia») con l'indice delle Ombre collegato alle Persona (Fase 7.3)
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { mappaAmbito } from './traduzioniService.js';
import { datiGuida } from './richiesteService.js';
import type { BattagliaDto, OmbraDto } from '../../shared/types.js';

type SeedBattaglia = Omit<BattagliaDto, 'ombre'> & { ombre: Array<Omit<OmbraDto, 'personaCollegata'>> };

function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Indice nome (inglese e italiano, normalizzato) → Persona del compendio. */
function indicePersona(): Map<string, { id: number; nome: string; nomeIt: string }> {
  const nomiIt = mappaAmbito('persona');
  const idx = new Map<string, { id: number; nome: string; nomeIt: string }>();
  for (const p of prepared('SELECT id, nome FROM persona').all() as Array<{ id: number; nome: string }>) {
    const v = { id: p.id, nome: p.nome, nomeIt: nomiIt[p.nome] ?? p.nome };
    idx.set(normalizza(p.nome), v);
    if (nomiIt[p.nome]) idx.set(normalizza(nomiIt[p.nome]), v);
  }
  return idx;
}

/** Sezioni della guida alla battaglia e indice delle Ombre di Palazzi e Dedali con collegamento alla Persona (maschera). */
export function battaglia(): BattagliaDto {
  const seed = datiGuida<SeedBattaglia>('battaglia');
  if (!seed) throw httpErrors.notFound('battaglia-non-disponibile', 'I dati della guida alla battaglia non sono caricati.');
  const idx = indicePersona();
  const ombre: OmbraDto[] = seed.ombre.map((o) => {
    const p = o.persona ? idx.get(normalizza(o.persona)) ?? null : null;
    return { ...o, personaCollegata: p };
  });
  return { ...seed, ombre };
}
