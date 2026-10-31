// ============================================================
// Utente 063 — il legame esplicito turno → voce del Diario (2026-10-31, provenienza dei turni in Partita → Progressi)
// ============================================================
//
// Partita → Progressi dice da quale voce del Diario viene un turno di un'attività. Leggerlo dalla ricevuta della spunta (attività e numero del
// turno) non basta: il «−» del contatore toglie il turno con il numero più alto e il «+» dopo riprende lo stesso numero
// (`attivitaService.registraTurno`: `Math.max(ultimo, prima) + 1`), così un turno segnato a mano sembrerebbe della voce. Il legame diventa un
// dato: `utente.turno_voce_partita`, una riga per turno registrato dalla spunta di una voce, scritta da `registraTurno` con la stessa
// `created_at` del turno e tolta da `togliTurno` con lui. Chi legge (`vociDeiProgressi.vociDeiTurni`) vuole anche la stessa `created_at`
// della riga del turno: un turno rifatto con lo stesso numero ha un'altra `created_at` e non eredita il legame.
//
// Tabella a parte e non una colonna di `turno_partita`: le ricevute della spunta e il registro della pesca fotografano la riga del turno
// intera (`SELECT *`, `motoreDiario.risorseLegacy`, `allocazioniTurniPesca`) e la confrontano colonna per colonna; una colonna in più
// renderebbe illeggibili le fotografie di prima. La chiave esterna è solo verso la partita, come le altre tabelle delle partite: il cestino
// rimette le righe con le loro (verso il turno l'ordine di ripristino non è garantito).
//
// Riempimento conservativo dei turni già registrati, SOLO dove la provenienza è certa: il turno nella ricevuta di una spunta ancora attiva
// (`spunta_voce_partita.effetti_json`, `turni[]`), la riga del turno ancora presente, e la sua `created_at` dentro la transazione di quella
// spunta: non prima di `fatta_at` (scritta all'inizio del gesto) e non dopo la ricevuta dell'effetto che porta il turno
// (`effetto_applicato.applicato_il`, scritta subito dopo, nella stessa transazione). Un turno rifatto a mano con lo stesso numero nasce in una
// richiesta successiva, quindi dopo quella ricevuta: resta fuori. Le spunte senza ricevuta degli effetti (quelle di prima) restano senza
// legame: niente provenienza inventata. Idempotente (la tabella si crea solo se manca, le righe solo se mancano). I conteggi nel log.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Le tabelle delle partite che il riempimento legge. */
const LETTE = ['turno_partita', 'spunta_voce_partita', 'effetto_applicato'] as const;

export const utente063: Migration = {
  id: 63,
  name: 'turno_della_voce',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 063: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.turno_voce_partita (
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      attivita_chiave TEXT NOT NULL,
      ordine          INTEGER NOT NULL CHECK (ordine >= 1),
      voce_uid        TEXT NOT NULL,
      created_at      TEXT NOT NULL,
      PRIMARY KEY (partita_id, attivita_chiave, ordine)
    )`);
    const presenti = LETTE.every((t) => !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t));
    let candidati = 0, legati = 0;
    if (presenti) {
      const spunte = db.prepare('SELECT partita_id, voce_uid, fatta_at, effetti_json FROM utente.spunta_voce_partita WHERE effetti_json IS NOT NULL')
        .all() as Array<{ partita_id: number; voce_uid: string; fatta_at: string; effetti_json: string }>;
      const turno = db.prepare('SELECT created_at FROM utente.turno_partita WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?').pluck();
      // la ricevuta più vecchia, dalla spunta in poi, dell'effetto della voce che porta quel turno (la spunta la scrive subito dopo il turno)
      const ricevuta = db.prepare(`SELECT MIN(r.applicato_il) FROM utente.effetto_applicato r
        WHERE r.partita_id = ? AND r.voce_uid = ? AND r.applicato_il >= ? AND json_valid(r.ricevuta_json)
          AND EXISTS (SELECT 1 FROM json_each(json_extract(r.ricevuta_json, '$.legacy.turni')) t
            WHERE json_extract(t.value, '$.attivita') = ? AND json_extract(t.value, '$.ordine') = ?)`).pluck();
      const scrivi = db.prepare('INSERT OR IGNORE INTO utente.turno_voce_partita (partita_id, attivita_chiave, ordine, voce_uid, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const s of spunte) {
        let turni: unknown;
        try { turni = (JSON.parse(s.effetti_json) as { turni?: unknown }).turni; } catch { turni = undefined; }
        if (!Array.isArray(turni)) continue;
        for (const t of turni) {
          const { attivita, ordine } = (t ?? {}) as { attivita?: unknown; ordine?: unknown };
          if (typeof attivita !== 'string' || typeof ordine !== 'number' || !Number.isSafeInteger(ordine) || ordine < 1) continue;
          candidati++;
          const creato = turno.get(s.partita_id, attivita, ordine) as string | undefined;
          if (typeof creato !== 'string' || creato < s.fatta_at) continue;
          const fine = ricevuta.get(s.partita_id, s.voce_uid, s.fatta_at, attivita, ordine) as string | null | undefined;
          if (typeof fine !== 'string' || creato > fine) continue;
          legati += scrivi.run(s.partita_id, attivita, ordine, s.voce_uid, creato).changes;
        }
      }
    }
    logger.info({ migrazione: 'utente 063', turniNelleRicevute: candidati, legati, senzaLegame: candidati - legati }, 'legame dei turni con la voce del Diario');
  },
};
