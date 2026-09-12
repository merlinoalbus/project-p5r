// ============================================================
// 070 — le condizioni di sblocco stanno sugli articoli, non sul negozio
// ============================================================
//
// Trentacinque negozi portavano condizioni («dal 18 aprile», «Confidente Takemi al rango 1») che
// gli articoli ereditavano (`daNegozio`) e che il visore usava per far sparire il pin del negozio.
// Ma un negozio che non è ancora aperto non è un posto che non c'è: è un posto dove non puoi
// ancora comprare. Da qui in poi la presenza del negozio la dicono solo gli orari (069), e la
// condizione di sblocco vive su ciascun articolo, unita alle sue: il pin resta, ogni articolo dice
// «non ancora». Le cinque frasi residue di `articolo.condizione` senza struttura passano dal
// convertitore della 064: «rango cliente Iniziale» è il grado di partenza, cioè nessuna condizione
// (è la regola che il convertitore ha sempre avuto), «sempre acquistabile» è rumore.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { convertiProsa } from '../../../shared/migraCondizioni.js';
import { leggiCondizioniSalvate, normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo.js';
import { contestoConversione, contestoRiga } from '../../services/condizioni/contestoConversione.js';

export const migration070: Migration = {
  id: 70,
  name: 'condizioni_del_negozio_agli_articoli',
  up(db) {
    // 1. le frasi residue degli articoli senza condizioni strutturate (prima dell'unione: dopo, nessun articolo del negozio sarebbe più «vuoto»)
    const scriviArticolo = db.prepare('UPDATE articolo SET condizioni_json = ? WHERE chiave = ?');
    const base = contestoConversione(db);
    const residui = db.prepare("SELECT chiave, negozio_chiave, condizione FROM articolo WHERE condizione IS NOT NULL AND trim(condizione) <> '' AND (condizioni_json IS NULL OR condizioni_json = '[]')").all() as Array<{ chiave: string; negozio_chiave: string; condizione: string }>;
    const scartate: string[] = [];
    let convertite = 0;
    for (const r of residui) {
      const esito = convertiProsa([r.condizione], contestoRiga(db, base, { tabella: 'articolo', chiave: r.chiave, negozio_chiave: r.negozio_chiave }));
      scartate.push(...esito.scartate.map((s) => `${r.chiave}: ${s}`));
      if (esito.condizioni.length) { scriviArticolo.run(JSON.stringify(esito.condizioni), r.chiave); convertite++; }
    }

    // 2. le condizioni del negozio passano a ogni suo articolo
    const negozi = db.prepare("SELECT chiave, condizioni_json FROM negozio WHERE condizioni_json IS NOT NULL AND condizioni_json <> '[]'").all() as Array<{ chiave: string; condizioni_json: string }>;
    const articoliDi = db.prepare('SELECT chiave, condizioni_json FROM articolo WHERE negozio_chiave = ?');
    const svuotaNegozio = db.prepare("UPDATE negozio SET condizioni_json = '[]' WHERE chiave = ?");
    let articoli = 0;
    for (const n of negozi) {
      const delNegozio = leggiCondizioniSalvate(n.condizioni_json);
      for (const a of articoliDi.all(n.chiave) as Array<{ chiave: string; condizioni_json: string | null }>) {
        const unite = normalizzaCondizioniSpillo([...delNegozio, ...leggiCondizioniSalvate(a.condizioni_json)]);
        scriviArticolo.run(JSON.stringify(unite), a.chiave);
        articoli++;
      }
      svuotaNegozio.run(n.chiave);
    }

    logger.info({ negozi: negozi.length, articoli, residui: residui.length, convertite, scartate: scartate.length }, 'migrazione 070: condizioni del negozio spostate sugli articoli');
    if (scartate.length) logger.warn({ scartate }, 'migrazione 070: frasi degli articoli non convertibili');
  },
};
