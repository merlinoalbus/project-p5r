// ============================================================
// 200 — voce del 14/11 giorno: tolto il segno «da rivedere», l'Arena a 10.000 gettoni come nella guida Royal (L9, voce 14/11)
// ============================================================
//
// La voce `dece90bf…` (Palazzo di Niijima, 14/11 giorno) ha il segno «da rivedere». Decisione dell'utente: si toglie il segno e, prevalendo il dato Royal,
// il premio dell'Arena passa da «100.000 monete» a «10.000 gettoni» (la guida Royal parla di 10.000 gettoni), con una nota che dice la differenza dal testo
// italiano. Tutto il resto del testo resta com'è. Il testo di prima (con il suo riferimento) è in `testo_precedente_json`; quello già presente lì (di una
// revisione precedente) va in `dati_guida.archivio-correzioni-diario-l11`. Guardie: la voce deve avere ancora il testo atteso con «100.000 monete»; se è già
// corretta (testo senza «100.000 monete» e senza segno) non fa niente; se è diversa si ferma. Senza spunte toccate (stanno nell'altro file).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const ARCHIVIO = 'archivio-correzioni-diario-l11';
const PREFISSO = 'dece90bf';
const VECCHIO = 'Arena Combattimenti Parte II (tornei uno-contro-uno, 100.000 monete)';
const NUOVO = 'Arena Combattimenti Parte II (tornei uno-contro-uno, 10.000 gettoni)';
const NOTA = 'Importo dell\'Arena: 10.000 gettoni secondo la guida Royal; il testo italiano diceva 100.000 monete.';
const errore = (motivo: string): never => { throw new Error(`200: ${motivo}; nessuna modifica applicata.`); };

export const migration200: Migration = {
  id: 200, name: 'voce_14_novembre_arena_royal',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'dati_guida')) return;
    const voci = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${PREFISSO}%`) as Array<Record<string, unknown>>;
    if (voci.length === 0) return;
    if (voci.length > 1) errore(`${voci.length} voci cominciano con ${PREFISSO}`);
    const v = voci[0]!;
    const azione = String(v.azione);
    if (v.da_rivedere === 0 && !azione.includes('100.000 monete')) return;
    if (v.data !== '11-14' || v.fascia !== 'giorno' || !azione.includes(VECCHIO)) errore(`la voce ${String(v.uid)} non è quella attesa del 14/11 giorno`);
    const altre = (db.prepare('SELECT COUNT(*) FROM main.voce_giornata WHERE uid <> ?').pluck().get(v.uid) as number);

    const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO) as string | undefined;
    const blocco = esistente ? JSON.parse(esistente) as { voci?: Record<string, unknown> } : {};
    const archivio = { versione: 1, motivo: 'Correzioni Royal del Diario (L11, M-C, migrazione 197/200): ciò che le colonne di prima non conservano e le divergenze fra fonti.',
      ...blocco, voci: { ...(blocco.voci ?? {}), [String(v.uid)]: { testoPrecedenteDiPrima: v.testo_precedente_json, motivoRevisione: v.motivo_revisione, divergenza: 'Arena: 100.000 monete (guida italiana) contro 10.000 gettoni (guida Royal)' } } };
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));

    const precedente = JSON.stringify({ azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
    db.prepare('UPDATE main.voce_giornata SET azione = ?, note = ?, da_rivedere = 0, motivo_revisione = NULL, testo_precedente_json = ?, updated_at = ? WHERE uid = ?')
      .run(azione.replace(VECCHIO, NUOVO), v.note ? `${String(v.note)} ${NOTA}` : NOTA, precedente, new Date().toISOString(), v.uid);

    const dopo = db.prepare('SELECT azione, da_rivedere, data, fascia, ordine FROM main.voce_giornata WHERE uid = ?').get(v.uid) as Record<string, unknown>;
    if (!String(dopo.azione).includes(NUOVO) || dopo.da_rivedere !== 0 || dopo.data !== '11-14' || dopo.fascia !== 'giorno' || dopo.ordine !== v.ordine) errore('la voce non è come attesa dopo la modifica');
    if ((db.prepare('SELECT COUNT(*) FROM main.voce_giornata WHERE uid <> ?').pluck().get(v.uid) as number) !== altre) errore('il numero delle altre voci è cambiato');
    logger.info({ migrazione: 'L9-200', voce: String(v.uid) }, 'voce del 14/11: segno tolto, Arena a 10.000 gettoni');
  },
};
