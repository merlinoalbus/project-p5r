// ============================================================
// Migrazione 267 — i DVD non ripetono il prezzo dell'abbonamento di Scarlet: lo dice l'offerta (Ondata 5, Lotto E; decisione 21)
// ============================================================
//
// Decisione 21 (a): un solo punto per ogni dato. I 12 DVD di Scarlet scrivevano nei dettagli (`film.dettagli`) e nella loro scheda del catalogo
// (`catalogo_oggetto.descrizione`) «richiede l'abbonamento annuale da 4.800 yen»: 24 copie di un prezzo che dalla 263 vive nell'offerta
// `scarlet/abbonamento-annuale` del Videonoleggio Scarlet (guida «DVD a noleggio»: «abbonamento annuale al costo di 4.800 yen»).
//
// Che cosa fa: «l'abbonamento annuale da 4.800 yen» diventa «l'abbonamento annuale di Scarlet», solo se l'offerta c'è (visibile, 4.800 ¥) e solo
// nelle righe della guida (`origine = 'seed'`) che contengono esattamente quel testo. Il resto della frase resta com'è.
// Il prezzo del biglietto dei film al cinema (`film.prezzo`, 1.500 ¥ per film) non è una copia: è il dato del film che la spunta scala
// (decisione 2: «li muove l'elemento collegato»), e non ha un'offerta altrove. Nessuna voce del Diario e nessun dato delle partite cambia.
// Idempotente. Audit in `dati_guida.audit-267-dvd`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_DVD, improntaDiario, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-267-dvd';
const errore = (motivo: string): never => { throw new Error(`267: ${motivo}; nessuna modifica applicata.`); };
const OFFERTA = 'scarlet/abbonamento-annuale';
const PRIMA = 'l\'abbonamento annuale da 4.800 yen';
const DOPO = 'l\'abbonamento annuale di Scarlet';

export const migration267: Migration = {
  id: 267,
  name: 'abbonamento_di_scarlet_nei_dvd',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'film') || !esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 267 }, 'film o articoli assenti: niente da fare'); return; }
    if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND prezzo = 4800 AND costo_json IS NULL AND nascosto = 0').get(OFFERTA)) {
      scriviAudit(db, AUDIT, 267, { esito: 'offerta dell’abbonamento di Scarlet assente o diversa: i testi restano' });
      logger.warn({ migrazione: 267 }, 'offerta dell’abbonamento di Scarlet assente: i testi dei DVD restano'); return;
    }
    const diarioPrima = improntaDiario(db);
    const adesso = new Date().toISOString();
    const film = db.prepare("SELECT chiave, dettagli FROM main.film WHERE dove = 'dvd' AND origine = 'seed' AND instr(dettagli, ?) > 0 ORDER BY ordine").all(PRIMA) as Array<{ chiave: string; dettagli: string }>;
    for (const f of film) {
      if (db.prepare("UPDATE main.film SET dettagli = ? WHERE chiave = ? AND dettagli = ? AND origine = 'seed'").run(f.dettagli.replace(PRIMA, DOPO), f.chiave, f.dettagli).changes !== 1) errore(`i dettagli di ${f.chiave} non si aggiornano`);
    }
    const schede = esisteTabella(db, 'catalogo_oggetto')
      ? db.prepare("SELECT chiave, descrizione FROM main.catalogo_oggetto WHERE categoria = 'film' AND origine = 'seed' AND instr(descrizione, ?) > 0 ORDER BY chiave").all(PRIMA) as Array<{ chiave: string; descrizione: string }>
      : [];
    for (const s of schede) {
      if (db.prepare("UPDATE main.catalogo_oggetto SET descrizione = ?, updated_at = ? WHERE chiave = ? AND descrizione = ? AND origine = 'seed'").run(s.descrizione.replace(PRIMA, DOPO), adesso, s.chiave, s.descrizione).changes !== 1) errore(`la descrizione di ${s.chiave} non si aggiorna`);
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const restano = (db.prepare('SELECT COUNT(*) FROM main.film WHERE instr(dettagli, ?) > 0').pluck().get(PRIMA) as number)
      + (esisteTabella(db, 'catalogo_oggetto') ? db.prepare('SELECT COUNT(*) FROM main.catalogo_oggetto WHERE instr(descrizione, ?) > 0').pluck().get(PRIMA) as number : 0);
    const conteggi = { dettagliDvd: film.length, schedeDvd: schede.length, restanoConIlPrezzo: restano };
    if (film.length + schede.length) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 267, { fonte: FONTE_DVD, conteggi, film: film.map((f) => f.chiave), schede: schede.map((s) => s.chiave) });
    logger.info({ migrazione: 267, ...conteggi }, 'DVD: il prezzo dell’abbonamento di Scarlet vive nell’offerta');
  },
};
