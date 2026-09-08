// ============================================================
// squadraService — il denaro del gruppo e i livelli dei Ladri Fantasma (partita)
// ============================================================
//
// Chiesto dall'utente: tenere traccia dei yen e di livello ed esperienza del protagonista e della
// squadra durante la partita. La partita conosceva solo `livello_protagonista`, e per un altro
// motivo — serve alla fusione per sapere quali Persona si possono evocare.
//
// **Chi è «la squadra»** non lo decide questo file: lo dice il seed dei personaggi, con `giocabile`.
// Sono i dieci Ladri di Royal, Kasumi compresa, e il giorno in cui il seed ne aggiunge uno la
// scheda lo mostra senza che qui cambi una riga. Elencarli a mano qui avrebbe voluto dire tenere
// due elenchi allineati a memoria, che è il modo in cui divergono.
//
// **Il non segnato non è uno zero.** Un membro senza riga è uno di cui non hai ancora scritto
// niente, e la scheda lo dice; averlo segnato a livello 1 con zero esperienza è un'altra cosa, ed è
// un'informazione che hai messo tu. La differenza si vede, e non si perde.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { MembroSquadraDto, SquadraPartitaDto } from '../../shared/types.js';

interface RigaPersonaggio { chiave: string; nome: string; ordine: number }

function partitaEsiste(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

/** I Ladri giocabili, nell'ordine del seed: è il seed a dire chi sono, non un elenco scritto qui. */
export function giocabili(): RigaPersonaggio[] {
  const r = prepared("SELECT json FROM dati_guida WHERE chiave = 'personaggi'").get() as { json: string } | undefined;
  if (!r) return [];
  const dati = JSON.parse(r.json) as { personaggi: Array<{ chiave: string; nome: string; ordine: number; giocabile?: boolean }> };
  return dati.personaggi.filter((p) => p.giocabile).map((p) => ({ chiave: p.chiave, nome: p.nome, ordine: p.ordine }))
    .sort((a, b) => a.ordine - b.ordine);
}

/** Denaro del gruppo e stato di ogni Ladro; `segnato` distingue il non compilato dallo zero. */
export function squadraPartita(partitaId: number): SquadraPartitaDto {
  partitaEsiste(partitaId);
  const p = prepared('SELECT yen, livello_protagonista FROM partita WHERE id = ?').get(partitaId) as { yen: number; livello_protagonista: number };
  const righe = new Map((prepared('SELECT personaggio_chiave, livello, esperienza, updated_at FROM membro_squadra_partita WHERE partita_id = ?').all(partitaId) as Array<{ personaggio_chiave: string; livello: number; esperienza: number; updated_at: string }>).map((r) => [r.personaggio_chiave, r]));
  const membri: MembroSquadraDto[] = giocabili().map((g) => {
    const r = righe.get(g.chiave);
    return {
      chiave: g.chiave, nome: g.nome,
      livello: r ? r.livello : (g.chiave === 'joker' ? p.livello_protagonista : 1),
      esperienza: r?.esperienza ?? 0,
      segnato: r !== undefined,
      updatedAt: r?.updated_at ?? null,
    };
  });
  return { yen: p.yen, membri };
}

/** Cambia i yen del gruppo: valore assoluto o differenza, mai sotto zero. */
export function impostaYen(partitaId: number, mod: { yen?: number; delta?: number }): SquadraPartitaDto {
  partitaEsiste(partitaId);
  const attuale = (prepared('SELECT yen FROM partita WHERE id = ?').get(partitaId) as { yen: number }).yen;
  const nuovo = Math.max(0, mod.yen !== undefined ? mod.yen : attuale + (mod.delta ?? 0));
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared('UPDATE partita SET yen = ?, updated_at = ? WHERE id = ?').run(nuovo, adesso, partitaId);
    // Nello storico va la **differenza**, non il totale: «hai speso 12.000 ¥» dice qualcosa,
    // «adesso ne hai 3.400» lo vedi già dalla scheda.
    const d = nuovo - attuale;
    if (d !== 0) registraEvento(partitaId, 'denaro', `${d > 0 ? 'Entrata' : 'Spesa'}: ${Math.abs(d).toLocaleString('it-IT')} ¥`, `Il gruppo ha ${nuovo.toLocaleString('it-IT')} ¥.`, { da: attuale, a: nuovo });
  })();
  return squadraPartita(partitaId);
}

/** Livello ed esperienza di un Ladro. La riga nasce alla prima scrittura: prima non era «zero», era «non segnato». */
export function impostaMembro(partitaId: number, chiave: string, mod: { livello?: number; esperienza?: number; deltaLivello?: number }): SquadraPartitaDto {
  partitaEsiste(partitaId);
  const g = giocabili().find((x) => x.chiave === chiave);
  if (!g) throw httpErrors.notFound('membro-non-trovato', `'${chiave}' non è un membro giocabile della squadra.`);
  const r = prepared('SELECT livello, esperienza FROM membro_squadra_partita WHERE partita_id = ? AND personaggio_chiave = ?').get(partitaId, chiave) as { livello: number; esperienza: number } | undefined;
  const partenza = r?.livello ?? (chiave === 'joker' ? (prepared('SELECT livello_protagonista FROM partita WHERE id = ?').get(partitaId) as { livello_protagonista: number }).livello_protagonista : 1);
  const livello = Math.min(99, Math.max(1, mod.livello ?? partenza + (mod.deltaLivello ?? 0)));
  const esperienza = Math.max(0, mod.esperienza ?? r?.esperienza ?? 0);
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`INSERT INTO membro_squadra_partita (partita_id, personaggio_chiave, livello, esperienza, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(partita_id, personaggio_chiave) DO UPDATE SET livello = excluded.livello, esperienza = excluded.esperienza, updated_at = excluded.updated_at`)
      .run(partitaId, chiave, livello, esperienza, adesso);
    // Joker ha due case dove sta lo stesso numero: qui e `partita.livello_protagonista`, che la
    // fusione legge da sempre per sapere quali Persona si possono evocare. Tenerle allineate qui è
    // l'unico modo perché non divergano: chi legge l'una o l'altra vede lo stesso livello.
    if (chiave === 'joker') prepared('UPDATE partita SET livello_protagonista = ? WHERE id = ?').run(livello, partitaId);
    if (!r || r.livello !== livello) {
      registraEvento(partitaId, 'squadra', `${g.nome}: livello ${livello}`, r ? `Da ${r.livello} a ${livello}.` : `Primo livello segnato.`, { membro: chiave, livello, esperienza });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return squadraPartita(partitaId);
}
