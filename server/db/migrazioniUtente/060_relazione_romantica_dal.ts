// ============================================================
// Utente 060 — il giorno d'inizio della relazione romantica, dato della partita (2026-10-31, L13, ondata 11, O11-1)
// ============================================================
//
// Domanda posta all'utente: «I doni "se fidanzata" arrivano da soli in base alla relazione registrata nella partita?» (a) arrivano in automatico
// dalla relazione registrata nella partita, b) restano a mano). Risposta dell'utente: «Sì, in automatico».
// La guida lega i doni al giorno (il pegno del 24 dicembre, i cioccolatini del 14 febbraio) e la relazione si può iniziare anche dopo (un rango 9 di
// gennaio): senza il giorno d'inizio una relazione iniziata a gennaio farebbe arrivare il pegno del 24 dicembre. Una colonna nuova,
// `confidente_partita.relazione_romantica_dal` (MM-GG del calendario di gioco, o NULL), che il servizio scrive con la relazione
// (`scriviRelazioneRomantica`) e che le condizioni `relazione-romantica` / `relazioni-romantiche` leggono («iniziata entro»).
// Riempimento conservativo, SOLO della colonna nuova e SOLO per le righe con la relazione (`relazione_romantica = 1`): il giorno della voce del
// Diario (`main.voce_giornata.data`) dell'ultimo evento «relazione romantica iniziata» della stessa partita e dello stesso Confidente
// (`evento_partita`, tipo 'confidente-relazione', `dati_json.dopo` vero), se quell'evento è legato a una voce (`voce_uid`) che c'è; altrimenti
// (segnata dalla scheda, voce dell'utente, nessun evento) resta NULL: non si inventa un giorno. Nessun'altra colonna o riga cambia. Idempotente:
// la colonna si aggiunge solo se manca e si riempiono solo le righe ancora NULL. Dentro la transazione della migrazione; i conteggi nel log.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const utente060: Migration = {
  id: 60,
  name: 'relazione_romantica_dal',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 060: manca la transazione della migrazione; nessuna modifica applicata.');
    const colonne = (db.prepare('PRAGMA utente.table_info(confidente_partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('relazione_romantica')) throw new Error('utente 060: manca `relazione_romantica` (utente 059); nessuna modifica applicata.');
    if (!colonne.includes('relazione_romantica_dal')) {
      db.exec(`ALTER TABLE utente.confidente_partita ADD COLUMN relazione_romantica_dal TEXT
        CHECK (relazione_romantica_dal IS NULL OR relazione_romantica_dal GLOB '[01][0-9]-[0-3][0-9]')`);
    }
    // il giorno della voce dell'ultimo «iniziata» (l'evento più recente con dopo vero); un evento senza voce, o con una voce che non c'è, non dà giorno
    const conVoci = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'voce_giornata'").get();
    const conEventi = !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'evento_partita'").get();
    const daRiempire = db.prepare('SELECT COUNT(*) FROM utente.confidente_partita WHERE relazione_romantica = 1 AND relazione_romantica_dal IS NULL').pluck().get() as number;
    let riempite = 0;
    if (daRiempire > 0 && conVoci && conEventi) {
      const giorno = db.prepare(`SELECT v.data FROM utente.evento_partita e JOIN main.voce_giornata v ON v.uid = e.voce_uid
        WHERE e.id = (SELECT x.id FROM utente.evento_partita x WHERE x.partita_id = ? AND x.tipo = 'confidente-relazione'
          AND json_valid(x.dati_json) AND json_extract(x.dati_json, '$.confidente') = ? AND json_extract(x.dati_json, '$.dopo') = 1 ORDER BY x.id DESC LIMIT 1)`).pluck();
      const scrivi = db.prepare('UPDATE utente.confidente_partita SET relazione_romantica_dal = ? WHERE partita_id = ? AND confidente_chiave = ? AND relazione_romantica = 1 AND relazione_romantica_dal IS NULL');
      const righe = db.prepare('SELECT partita_id, confidente_chiave FROM utente.confidente_partita WHERE relazione_romantica = 1 AND relazione_romantica_dal IS NULL').all() as Array<{ partita_id: number; confidente_chiave: string }>;
      for (const r of righe) {
        const g = giorno.get(r.partita_id, r.confidente_chiave) as string | undefined;
        if (typeof g === 'string' && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(g)) riempite += scrivi.run(g, r.partita_id, r.confidente_chiave).changes;
      }
    }
    logger.info({ migrazione: 'utente 060', relazioniSenzaGiorno: daRiempire, riempite, restanoNull: daRiempire - riempite }, 'giorno d’inizio della relazione romantica');
  },
};
