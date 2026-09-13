// ============================================================
// 082 — «questo nome l'ha scritto una persona»: `mappa.nome_rivisto`
// ============================================================
//
// Il nome con cui una mappa si presenta non è sempre la sua colonna `nome`: per le planimetrie
// estratte dal gioco quella colonna porta sigle («Area 4 — RMAP 153», «livello grafico 4») e il
// nome leggibile sta altrove, nei contesti e nel gruppo di immagini di `mappa_presentazione`, che
// l'importazione del pacchetto scrive una volta e nessuna schermata modifica. Finché quel nome
// dedotto aveva la precedenza, chi correggeva il campo «Nome» nell'editor salvava e continuava a
// vedere in alto il vecchio titolo, senza nessun posto dove intervenire.
//
// Serviva distinguere il nome rivisto da una persona dal nome che sta lì dall'estrazione, e
// `origine = 'utente'` non lo dice: la assegnano anche il caricamento di un'immagine e
// l'importazione di un pacchetto di mappe dalla rotta pubblica, che riscrive pure i contesti. Da
// qui lo dichiara una colonna sua, che solo il salvataggio dell'editor accende quando il nome
// cambia davvero e l'importazione di un pacchetto spegne, perché lì il nome torna a essere quello
// dichiarato dal pacchetto.
//
// Le righe esistenti partono tutte da 0: nessuna revisione è dimostrabile a posteriori — `origine`
// non la distingue dagli altri salvataggi — e 0 conserva esattamente i titoli mostrati finora.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { aggiungiColonna } from '../colonne.js';
import { logger } from '../../utils/logger.js';

export const migration082: Migration = {
  id: 82,
  name: 'nome_rivisto_mappa',
  up(db) {
    const aggiunta = aggiungiColonna(db, 'mappa', 'nome_rivisto', 'INTEGER NOT NULL DEFAULT 0');
    const mappe = db.prepare('SELECT COUNT(*) FROM mappa').pluck().get() as number;
    logger.info({ aggiunta, mappe }, 'migrazione 082: il nome rivisto a mano è dichiarato dalla mappa');
  },
};
