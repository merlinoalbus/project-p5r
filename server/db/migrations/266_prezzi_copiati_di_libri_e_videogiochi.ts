// ============================================================
// Migrazione 266 — il prezzo dei libri e dei videogiochi vive solo nelle offerte (Ondata 5, Lotto E; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (a): un solo punto per ogni dato. `libro.prezzo` (41 righe con un'offerta) e `attivita.costo` dei videogiochi (7) ripetono il
// prezzo dell'offerta che vende lo stesso oggetto del catalogo; la lettura usa già l'offerta (`attivitaService.datiCatalogoLettura`: il
// prezzo della guida serve solo quando l'oggetto non ha un'offerta, con la nota «Prezzo indicato nella guida»). Il costo di un videogioco,
// inoltre, sarebbe scalato a ogni turno registrato (`attivitaService.yenDelTurno` legge `attivita.costo`): il gioco si compra una volta, e
// l'acquisto è l'offerta.
//
// Che cosa fa: il valore si azzera a NULL solo se la riga è della guida (`origine = 'seed'`) e un'offerta visibile dello stesso oggetto, pagata
// in yen, ha esattamente lo stesso prezzo. Restano: i libri e i videogiochi senza offerta (Il mago del biliardo), i valori diversi
// dall'offerta (l'audit li elenca), le righe corrette dall'utente, i costi delle altre attività (freccette, palestra, biliardo, Gabbie…).
// Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente. Audit in `dati_guida.audit-266-libri-e-videogiochi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { improntaDiario, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-266-libri-e-videogiochi';
const errore = (motivo: string): never => { throw new Error(`266: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; valore: number; esito: string };

/** I prezzi in yen delle offerte visibili di un oggetto del catalogo. */
function prezziOfferte(db: AppDatabase, catalogo: string | null): number[] {
  if (!catalogo) return [];
  return db.prepare(`SELECT a.prezzo FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
    WHERE a.catalogo_chiave = ? AND a.nascosto = 0 AND n.nascosto = 0 AND a.costo_json IS NULL AND a.prezzo IS NOT NULL`).pluck().all(catalogo) as number[];
}

function libri(db: AppDatabase): Esito[] {
  if (!esisteTabella(db, 'libro') || !haColonna(db, 'libro', 'catalogo_chiave')) return [];
  const righe = db.prepare('SELECT chiave, prezzo, origine, catalogo_chiave FROM main.libro WHERE prezzo IS NOT NULL ORDER BY ordine').all() as Array<{ chiave: string; prezzo: number; origine: string; catalogo_chiave: string | null }>;
  return righe.map((r) => {
    const offerte = prezziOfferte(db, r.catalogo_chiave);
    if (!offerte.length) return { chiave: r.chiave, valore: r.prezzo, esito: 'nessuna offerta: il prezzo della guida resta' };
    if (!offerte.includes(r.prezzo)) return { chiave: r.chiave, valore: r.prezzo, esito: `diverso dalle offerte (${offerte.join(', ')}): non toccato` };
    if (r.origine !== 'seed') return { chiave: r.chiave, valore: r.prezzo, esito: 'riga corretta dall’utente: non toccata' };
    if (db.prepare("UPDATE main.libro SET prezzo = NULL WHERE chiave = ? AND prezzo = ? AND origine = 'seed'").run(r.chiave, r.prezzo).changes !== 1) errore(`il prezzo del libro ${r.chiave} non si toglie`);
    return { chiave: r.chiave, valore: r.prezzo, esito: 'copia tolta' };
  });
}

function videogiochi(db: AppDatabase): Esito[] {
  if (!esisteTabella(db, 'attivita') || !esisteTabella(db, 'catalogo_oggetto')) return [];
  const righe = db.prepare("SELECT chiave, costo, origine FROM main.attivita WHERE tipo = 'videogioco' AND costo IS NOT NULL ORDER BY ordine").all() as Array<{ chiave: string; costo: number; origine: string }>;
  return righe.map((r) => {
    const catalogo = db.prepare("SELECT chiave FROM main.catalogo_oggetto WHERE fonte_tipo = 'videogioco' AND fonte_chiave = ?").pluck().get(r.chiave) as string | undefined;
    const offerte = prezziOfferte(db, catalogo ?? null);
    if (!offerte.length) return { chiave: r.chiave, valore: r.costo, esito: 'nessuna offerta: il costo della guida resta' };
    if (!offerte.includes(r.costo)) return { chiave: r.chiave, valore: r.costo, esito: `diverso dalle offerte (${offerte.join(', ')}): non toccato` };
    if (r.origine !== 'seed') return { chiave: r.chiave, valore: r.costo, esito: 'riga corretta dall’utente: non toccata' };
    if (db.prepare("UPDATE main.attivita SET costo = NULL WHERE chiave = ? AND costo = ? AND origine = 'seed' AND tipo = 'videogioco'").run(r.chiave, r.costo).changes !== 1) errore(`il costo del videogioco ${r.chiave} non si toglie`);
    return { chiave: r.chiave, valore: r.costo, esito: 'copia tolta' };
  });
}

export const migration266: Migration = {
  id: 266,
  name: 'prezzi_copiati_di_libri_e_videogiochi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 266 }, 'articoli assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esitiLibri = libri(db), esitiVideogiochi = videogiochi(db);
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const tolte = (e: Esito[]) => e.filter((x) => x.esito === 'copia tolta').length;
    const conteggi = { libri: esitiLibri.length, libriTolti: tolte(esitiLibri), videogiochi: esitiVideogiochi.length, videogiochiTolti: tolte(esitiVideogiochi) };
    if (conteggi.libriTolti + conteggi.videogiochiTolti) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 266, { conteggi, libri: esitiLibri, videogiochi: esitiVideogiochi });
    logger.info({ migrazione: 266, ...conteggi }, 'Libri e videogiochi: il prezzo vive solo nelle offerte');
  },
};
