// ============================================================
// 084 — nella negoziazione un carattere non può avere due verdetti sulla stessa risposta
// ============================================================
//
// La trascrizione della 083 è fedele alla fonte, e la fonte a volte si contraddice: ventiquattro
// risposte risultavano **buone e cattive per lo stesso carattere**, e cinque domande comparivano
// due volte con verdetti diversi, annotate in momenti diversi. Nella scheda questo si vedeva così:
// la risposta saliva in cima come «buona» per il carattere scelto e accanto portava la pastiglia
// rossa della stessa personalità. Una guida che consiglia e sconsiglia la stessa cosa è peggio di
// una guida che tace, perché alla seconda domanda una risposta sbagliata fa fallire la trattativa.
//
// `normalizzaDomande` (083) applica le due regole: un solo verdetto per carattere — **il peggiore**,
// marcato incerto quando la fonte non è d'accordo con sé stessa — e una domanda, una scheda. Qui si
// applica a quel che le istanze hanno già dentro, senza rileggere il file: la 083 non torna indietro.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { normalizzaDomande } from './083_negoziazione_domande.js';
import type { NegoziazioneDomandaDto } from '../../../shared/types.js';

export const migration084: Migration = {
  id: 84,
  name: 'negoziazione_senza_contraddizioni',
  up(db) {
    const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'battaglia'").get() as { json: string } | undefined;
    if (!riga) return;
    const battaglia = JSON.parse(riga.json) as { negoziazione?: { domande?: NegoziazioneDomandaDto[] } };
    const domande = battaglia.negoziazione?.domande;
    if (!domande || domande.length === 0) return;
    const pulite = normalizzaDomande(domande);
    battaglia.negoziazione!.domande = pulite;
    db.prepare("UPDATE dati_guida SET json = ? WHERE chiave = 'battaglia'").run(JSON.stringify(battaglia));
    logger.info({ prima: domande.length, dopo: pulite.length }, 'migrazione 084: negoziazione senza verdetti in contraddizione');
  },
};
