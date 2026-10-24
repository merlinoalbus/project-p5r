// ============================================================
// 220 — «Pagine ammuffite» alla Taiheido: disponibile dal 1° settembre (L11, 208; documento `lotti/L11/pagine-ammuffite-taiheido-2026-10-24.md`)
// ============================================================
//
// Il Royal (Samurai Gamers, «Musty Pages», libreria di Shibuya, 9/1) e la guida italiana (pagina Libri) concordano sulla data: 1° settembre. L'articolo della Taiheido
// aveva la sola condizione del negozio (dal 18/4), mentre il suo libro (`libro/pagine-ammuffite`) ha `dal 09-01`; gli altri articoli della Taiheido con una data propria portano
// `dal 18/4` più quella data. La condizione dell'articolo `libreria-taiheido/pagine-ammuffite` passa da `[dal 04-18]` a `[dal 04-18, dal 09-01]`. Il 18/4 resta (negozio). L'articolo
// di Hinokuniya non cambia (decisione dell'utente: tenere entrambi). Guardia sul valore attuale e sull'identità dell'articolo; già corretto: niente. Su p5s nessun acquisto
// dell'articolo (verificato sulla copia); le partite stanno nell'altro file e non si toccano. Scrive solo `articolo.condizioni_json` di quella riga.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const CHIAVE = 'libreria-taiheido/pagine-ammuffite';
const PRIMA = JSON.stringify([{ tipo: 'data', dal: '04-18' }]);
const DOPO = JSON.stringify([{ tipo: 'data', dal: '04-18' }, { tipo: 'data', dal: '09-01' }]);
const errore = (motivo: string): never => { throw new Error(`220: ${motivo}; nessuna modifica applicata.`); };

export const migration220: Migration = {
  id: 220, name: 'pagine_ammuffite_dal_primo_settembre',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo')) return;
    const a = db.prepare('SELECT negozio_chiave, oggetto_chiave, condizioni_json FROM main.articolo WHERE chiave = ?').get(CHIAVE) as
      { negozio_chiave: string; oggetto_chiave: string | null; condizioni_json: string | null } | undefined;
    if (!a || a.condizioni_json === DOPO) return;
    if (a.negozio_chiave !== 'libreria-taiheido' || a.oggetto_chiave !== 'pagine-ammuffite' || a.condizioni_json !== PRIMA) return; // cambiato dall'utente: non si tocca
    const prima = improntaTabella(db, 'articolo', ['condizioni_json']);
    const vicine = new Map(['negozio', 'catalogo_oggetto', 'libro'].filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)]));
    db.prepare('UPDATE main.articolo SET condizioni_json = ? WHERE chiave = ?').run(DOPO, CHIAVE);
    if (improntaTabella(db, 'articolo', ['condizioni_json']) !== prima) errore('le altre colonne di articolo sono cambiate');
    for (const [t, imp] of vicine) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-220', articolo: CHIAVE }, 'Pagine ammuffite: dal 1° settembre');
  },
};
