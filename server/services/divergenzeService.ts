// ============================================================
// divergenzeService — le divergenze fra pin e voci conservate «da verificare» (L4 «Avanzamento unico», lotti/L4/modifiche.md §3.2)
// ============================================================
//
// La migrazione utente 022 ha conservato, senza scrivere niente, i pin che prima di L4 risultavano fatti con una loro voce non fatta
// (decisione dell'utente del 2026-10-20). Restano «da verificare» finché l'utente non sceglie: «Segna la voce» (`PUT /api/partite/:id/
// punti`, la riga se ne va quando la voce è fatta) o «Togli il fatto al pin» (qui: il segno di prima del pin si toglie, la voce resta
// com'è). Nessun'altra strada le scrive.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { chiaveMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { conDivergenze, togliIlFattoAlPin } from './mappe/statiGuida.js';
import type { DivergenzaDto } from '../../shared/types.js';

/** Le divergenze «da verificare» di una partita (di un Palazzo, se dato), per Palazzo, infiltrazione, voce e pin. Quelle di un pin o
 *  di una voce che non ci sono più (orfane, come gli altri riferimenti delle partite) non si elencano. */
export function elencoDivergenze(partitaId: number, dungeon?: string): DivergenzaDto[] {
  verificaPartita(partitaId);
  if (!conDivergenze(getDb())) return [];
  const righe = prepared(`SELECT s.id, s.uid, s.nome AS spillo_nome, s.mappa_chiave, p.chiave AS voce, p.nome AS voce_nome, a.chiave AS infiltrazione, a.nome AS infiltrazione_nome, d.rilevata_il
    FROM divergenza_partita d JOIN spillo s ON s.uid = d.spillo_uid JOIN punto_interesse p ON p.chiave = d.voce_chiave JOIN dungeon_area a ON a.chiave = p.area_chiave
    WHERE d.partita_id = ? ${dungeon ? 'AND a.dungeon_chiave = ?' : ''} ORDER BY a.dungeon_chiave, a.ordine, p.ordine, p.chiave, s.id`)
    .all(...(dungeon ? [partitaId, dungeon] : [partitaId])) as Array<{ id: number; uid: string; spillo_nome: string; mappa_chiave: string | null; voce: string; voce_nome: string; infiltrazione: string; infiltrazione_nome: string; rilevata_il: string }>;
  return righe.map((r) => ({
    spillo: r.id, spilloUid: r.uid, spilloNome: r.spillo_nome, mappa: r.mappa_chiave ? chiaveMappa(r.mappa_chiave) : '', mappaNome: r.mappa_chiave ? nomePercorso(r.mappa_chiave) : '',
    voce: r.voce, voceNome: r.voce_nome, infiltrazione: r.infiltrazione, infiltrazioneNome: r.infiltrazione_nome, rilevataIl: r.rilevata_il,
  }));
}

/** «Togli il fatto al pin»: 404 se il pin non ha divergenze nella partita; altrimenti il segno di prima si toglie e le sue divergenze
 *  se ne vanno. La voce resta com'è. */
export function togliFattoAlPin(partitaId: number, spilloUid: string): void {
  verificaPartita(partitaId);
  if (!conDivergenze(getDb()) || !prepared('SELECT 1 FROM divergenza_partita WHERE partita_id = ? AND spillo_uid = ?').get(partitaId, spilloUid)) {
    throw httpErrors.notFound('divergenza-non-trovata', 'Il pin non ha niente da verificare in questa partita.');
  }
  const adesso = nowIso();
  getDb().transaction(() => {
    togliIlFattoAlPin(getDb(), partitaId, spilloUid, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
}
