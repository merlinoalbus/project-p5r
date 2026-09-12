// ============================================================
// 073 — gli articoli delle librerie sono i libri, e i videogiochi hanno un articolo
// ============================================================
//
// Le tre librerie (Taiheido, Hinokuniya, Nagiuri) avevano trentuno articoli con la chiave del
// libro ma `categoria='altro'` e nessun collegamento: la scheda del libro non sapeva dove si
// compra, e l'articolo non sapeva che cosa vende. Il collegamento è un UPDATE deterministico
// (`oggetto_fonte='libri'`, `oggetto_chiave` = chiave del libro, `categoria='libro'`).
// I sette videogiochi (attività `tipo='videogioco'`) non erano collegati a un articolo: sei
// esistevano già in Super Baron e Yumenoshima come «regalo» o «altro» (si collegano, con
// `oggetto_fonte='videogiochi'` e `categoria='videogioco'`), Star Forneus non c'era (incluso nel Set
// per retrogaming: nasce da Yumenoshima a prezzo zero, con le condizioni dell'attività). Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { leggiCondizioniSalvate, normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo.js';

export const LIBRERIE = ['libreria-taiheido', 'hinokuniya', 'libreria-nagiuri'] as const;
/** Dove si compra ogni videogioco; chi non è qui sta da Super Baron. */
export const NEGOZIO_VIDEOGIOCO: Readonly<Record<string, string>> = {
  'videogioco-star-forneus': 'yumenoshima',
  'videogioco-gambla-goemon': 'yumenoshima',
};
const NOTA_VIDEOGIOCO: Readonly<Record<string, string>> = {
  'videogioco-star-forneus': 'Incluso nel Set per retrogaming',
};

export function chiaveArticoloVideogioco(attivita: string): string {
  return `${NEGOZIO_VIDEOGIOCO[attivita] ?? 'super-baron'}/${attivita.replace(/^videogioco-/, '')}`;
}

export const migration073: Migration = {
  id: 73,
  name: 'collegamenti_libri_videogiochi',
  up(db) {
    // 1. librerie → libri
    const libri = new Set((db.prepare('SELECT chiave FROM libro').all() as Array<{ chiave: string }>).map((r) => r.chiave));
    const articoli = db.prepare(`SELECT chiave FROM articolo WHERE negozio_chiave IN (${LIBRERIE.map(() => '?').join(',')}) AND oggetto_fonte IS NULL`).all(...LIBRERIE) as Array<{ chiave: string }>;
    const collega = db.prepare("UPDATE articolo SET oggetto_fonte = 'libri', oggetto_chiave = ?, categoria = 'libro' WHERE chiave = ?");
    const nonLibri: string[] = [];
    let collegati = 0;
    for (const a of articoli) {
      const libro = a.chiave.slice(a.chiave.indexOf('/') + 1);
      if (libri.has(libro)) { collega.run(libro, a.chiave); collegati++; } else nonLibri.push(a.chiave);
    }

    // 2. videogiochi → articoli
    const videogiochi = db.prepare("SELECT chiave, nome, costo, condizioni_json FROM attivita WHERE tipo = 'videogioco' AND nascosto = 0 ORDER BY ordine").all() as Array<{ chiave: string; nome: string; costo: number | null; condizioni_json: string | null }>;
    const esisteNegozio = db.prepare('SELECT 1 FROM negozio WHERE chiave = ?');
    const esisteArticolo = db.prepare('SELECT 1 FROM articolo WHERE chiave = ?');
    const ordineMassimo = db.prepare('SELECT COALESCE(MAX(ordine), 0) AS n FROM articolo WHERE negozio_chiave = ?');
    const inserisci = db.prepare(`INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, nome_it, categoria, per, prezzo, effetto, statistiche, disponibile_dal, condizione, nota, fonte, verificato, origine, nascosto, seed_json, updated_at, condizioni_json, oggetto_fonte, oggetto_chiave, quantita, effetto_json)
      VALUES (@chiave, @negozio, @ordine, @nome, NULL, 'videogioco', NULL, @prezzo, NULL, NULL, NULL, NULL, @nota, '', 0, 'seed', 0, @seed, @adesso, @condizioni, 'videogiochi', @attivita, NULL, NULL)`);
    const adesso = new Date().toISOString();
    const senzaNegozio: string[] = [];
    // le condizioni dell'articolo (già con quelle del negozio, 070) si uniscono a quelle dell'attività: «dal 1 settembre» non si perde
    const condizioniArticolo = db.prepare('SELECT condizioni_json FROM articolo WHERE chiave = ? AND oggetto_fonte IS NULL');
    const collegaVideogioco = db.prepare("UPDATE articolo SET oggetto_fonte = 'videogiochi', oggetto_chiave = ?, categoria = 'videogioco', condizioni_json = ? WHERE chiave = ? AND oggetto_fonte IS NULL");
    let creati = 0; let collegatiVideogiochi = 0;
    for (const v of videogiochi) {
      const chiave = chiaveArticoloVideogioco(v.chiave);
      const negozio = chiave.slice(0, chiave.indexOf('/'));
      if (!esisteNegozio.get(negozio)) { senzaNegozio.push(`${v.chiave} → ${negozio}`); continue; }
      if (esisteArticolo.get(chiave)) {
        const attuale = condizioniArticolo.get(chiave) as { condizioni_json: string | null } | undefined;
        if (!attuale) continue;
        const unite = normalizzaCondizioniSpillo([...leggiCondizioniSalvate(attuale.condizioni_json), ...leggiCondizioniSalvate(v.condizioni_json)]);
        collegatiVideogiochi += collegaVideogioco.run(v.chiave, JSON.stringify(unite), chiave).changes;
        continue;
      }
      const riga = { chiave, negozio, ordine: (ordineMassimo.get(negozio) as { n: number }).n + 1, nome: v.nome, prezzo: v.costo ?? 0, nota: NOTA_VIDEOGIOCO[v.chiave] ?? null, adesso, condizioni: v.condizioni_json ?? '[]', attivita: v.chiave, seed: '' };
      riga.seed = JSON.stringify({ chiave, negozio_chiave: negozio, ordine: riga.ordine, nome: v.nome, nome_it: null, categoria: 'videogioco', per: null, prezzo: riga.prezzo, effetto: null, statistiche: null, disponibile_dal: null, condizione: null, nota: riga.nota, fonte: '', verificato: 0, condizioni_json: riga.condizioni, oggetto_fonte: 'videogiochi', oggetto_chiave: v.chiave, quantita: null, effetto_json: null });
      inserisci.run(riga);
      creati++;
    }
    logger.info({ libriCollegati: collegati, nonLibri: nonLibri.length, videogiochiCollegati: collegatiVideogiochi, videogiochiCreati: creati, senzaNegozio: senzaNegozio.length }, 'migrazione 073: librerie collegate ai libri, articoli dei videogiochi');
    if (nonLibri.length || senzaNegozio.length) logger.warn({ nonLibri, senzaNegozio }, 'migrazione 073: righe non collegate');
  },
};
