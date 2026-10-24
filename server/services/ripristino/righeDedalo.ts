// ============================================================
// righeDedalo — i legami di Iweleth fra Palazzo e dedalo dei Memento, correggibili e ripristinabili (L11 · R11-17/1, gruppo Dedalo)
// ============================================================
//
// Tre oggetti «a riga» del registro dei ripristini (`righe.ts`); il valore della guida è la fotografia `seed_json` presa alla prima correzione (colonne
// `origine`, `seed_json`, `updated_at` della migrazione 224).
//   - `dedalo-confluenza` (1, chiave = chiave del dungeon che confluisce): il dedalo in cui confluisce e la nota. Il dungeon è l'identità della riga.
//   - `mappa-dedalo` (26, chiave = chiave interna della mappa): l'area del dedalo a cui la planimetria appartiene (o nessuna) e la nota.
//   - `infiltrazione-dedalo` (12, chiave = chiave dell'infiltrazione): l'area del dedalo che corrisponde all'infiltrazione. Nessuna pagina la mostra (registro di
//     conversione di Iweleth): si corregge solo da `/api/correzioni`.
// ============================================================

import { prepared } from '../../db/dbService.js';
import type { DefRiga } from './righe.js';
import { colonna, rigaDaColonne } from './righeComuni.js';

const areeDelDedalo = (): Array<{ chiave: string; nome: string }> =>
  (prepared('SELECT chiave, nome FROM area_dedalo ORDER BY dedalo_chiave, ordine').all() as Array<{ chiave: string; nome: string }>);
const dedali = (): Array<{ chiave: string; nome: string }> =>
  (prepared("SELECT chiave, nome FROM dungeon_area WHERE chiave IN (SELECT dedalo_chiave FROM area_dedalo) ORDER BY chiave").all() as Array<{ chiave: string; nome: string }>);
const nomeArea = (chiave: string): string => (prepared('SELECT nome FROM area_dedalo WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;

const confluenza = rigaDaColonne({
  etichetta: 'Palazzo confluito in un dedalo', tabella: 'dedalo_confluenza', colonnaChiave: 'dungeon_chiave',
  colonne: () => [
    colonna({ p: 'dedalo_chiave', e: 'Dedalo in cui confluisce', t: 'scelta', opzioni: dedali().map((d) => ({ chiave: d.chiave, nome: d.nome })) }, 'dedalo_chiave', 'scelta'),
    colonna({ p: 'nota', e: 'Nota', t: 'testolungo', nullable: true, max: 2000 }, 'nota', 'testoVuoto'),
  ],
  nome: (chiave) => `Confluenza: ${(prepared('SELECT nome FROM dungeon WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave}`,
});

const mappaDedalo = rigaDaColonne({
  etichetta: 'Planimetria del Palazzo nel dedalo', tabella: 'mappa_dedalo', colonnaChiave: 'mappa_chiave',
  colonne: () => [
    colonna({
      p: 'area_dedalo_chiave', e: 'Area del dedalo', t: 'scelta',
      opzioni: [{ chiave: '', nome: 'Nessuna area certa' }, ...areeDelDedalo().map((a) => ({ chiave: a.chiave, nome: a.nome }))],
    }, 'area_dedalo_chiave', 'scelta'),
    colonna({ p: 'nota', e: 'Nota', t: 'testo', nullable: true, max: 300 }, 'nota', 'testoVuoto'),
  ],
  nome: (chiave) => `Planimetria ${(prepared('SELECT nome FROM mappa WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave}`,
});

const infiltrazioneDedalo = rigaDaColonne({
  etichetta: 'Infiltrazione di Iweleth nel dedalo', tabella: 'infiltrazione_dedalo', colonnaChiave: 'infiltrazione_chiave',
  colonne: () => [colonna({ p: 'area_dedalo_chiave', e: 'Area del dedalo', t: 'scelta', opzioni: areeDelDedalo().map((a) => ({ chiave: a.chiave, nome: a.nome })) }, 'area_dedalo_chiave', 'scelta')],
  nome: (chiave, v) => `Infiltrazione ${chiave} → ${nomeArea(String(v.area_dedalo_chiave))}`,
});

export const DEFINIZIONI_DEDALO: { 'dedalo-confluenza': DefRiga; 'mappa-dedalo': DefRiga; 'infiltrazione-dedalo': DefRiga } =
  { 'dedalo-confluenza': confluenza, 'mappa-dedalo': mappaDedalo, 'infiltrazione-dedalo': infiltrazioneDedalo };
