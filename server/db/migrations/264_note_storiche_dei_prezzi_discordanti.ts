// ============================================================
// Migrazione 264 — Homunculus 5.000, Dango lunare 800, Agodashi oden 900: il listino dei negozi con la nota storica (Ondata 5, Lotto E)
// ============================================================
//
// Decisione 21 (c) dell'utente: «in caso di discordanza fra pagine della guida vale il listino dei negozi con nota storica». La guida italiana
// (letta il 2026-10-26) si contraddice su tre prezzi:
//   - Homunculus: «120.000 ¥» nella pagina Oggetti [O], 5.000 ¥ nel listino Royal di Tanaka (nota storica già presente:
//     `homunculus-prezzi-fonte`, migrazione 139);
//   - Dango lunare: «640 ¥ / 4.800 ¥» in [O] (Super Muramasa e Set dolci speciali), «Dango lunare | 800 ¥ | Autunno | 1 | Lunedì successivo»
//     nell'Elenco dei negozi [N];
//   - Agodashi oden: «800 ¥» in [O], «Agodashi Oden | 900 ¥ | Inverno | 1 | Lunedì successivo» in [N].
// L'offerta ha già il valore di [N] (5.000 / 800 / 900); la copia di [O] vive nella descrizione del catalogo («Prezzo citato…»), che la 265 toglie.
//
// Che cosa fa: (1) controlla il prezzo dell'offerta e lo porta al listino dei negozi solo se è ancora il valore della pagina Oggetti e
// l'offerta è della guida e non comprata né segnata da una voce (gli yen già scalati non cambiano in silenzio: altrimenti resta e l'audit lo
// dice); (2) scrive le due note storiche nuove, legate all'offerta e alla scheda, e completa i legami di quella dell'Homunculus.
// Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente. Audit in `dati_guida.audit-264-prezzi-discordanti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_NEGOZI, improntaDiario, notaStorica, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-264-prezzi-discordanti';
const errore = (motivo: string): never => { throw new Error(`264: ${motivo}; nessuna modifica applicata.`); };
const FONTE = 'Guida italiana: «Oggetti» ed «Elenco dei negozi»; decisione 21 dell’utente';

export const PREZZI_DISCORDANTI: ReadonlyArray<{ articolo: string; catalogo: string; giusto: number; pagina: number; nota: { chiave: string; testo: string; fonte: string } | null }> = [
  { articolo: 'tanaka-affari-loschi/homunculus', catalogo: 'consumabile/homunculus', giusto: 5_000, pagina: 120_000, nota: null },
  { articolo: 'super-muramasa/dango-lunare', catalogo: 'consumabile/dango-lunare', giusto: 800, pagina: 640, nota: {
    chiave: 'dango-lunare-prezzo-fonte', fonte: FONTE,
    testo: 'La guida si contraddice: 640 ¥ nella pagina Oggetti, 800 ¥ nell’elenco dei negozi (Super Muramasa, solo in autunno, 1 pezzo, rifornimento il lunedì successivo). Vale l’elenco dei negozi. È una nota sulla fonte: non indica il prezzo corrente dell’offerta né quanto è stato pagato e non applica modifiche al listino.',
  } },
  { articolo: 'triple-seven/agodashi-oden', catalogo: 'consumabile/agodashi-oden', giusto: 900, pagina: 800, nota: {
    chiave: 'agodashi-oden-prezzo-fonte', fonte: FONTE,
    testo: 'La guida si contraddice: 800 ¥ nella pagina Oggetti, 900 ¥ nell’elenco dei negozi (Triple Seven, solo d’inverno, 1 pezzo, rifornimento il lunedì successivo). Vale l’elenco dei negozi. È una nota sulla fonte: non indica il prezzo corrente dell’offerta né quanto è stato pagato e non applica modifiche al listino.',
  } },
];
const NOTA_HOMUNCULUS = 'homunculus-prezzi-fonte';

type Esito = { chiave: string; esito: string };

function prezzo(db: AppDatabase, p: (typeof PREZZI_DISCORDANTI)[number]): Esito {
  const r = db.prepare('SELECT prezzo, costo_json, origine FROM main.articolo WHERE chiave = ?').get(p.articolo) as { prezzo: number | null; costo_json: string | null; origine: string } | undefined;
  if (!r) return { chiave: p.articolo, esito: 'offerta assente' };
  if (r.prezzo === p.giusto && r.costo_json === null) return { chiave: p.articolo, esito: `prezzo già ${p.giusto} ¥ (listino dei negozi)` };
  if (r.prezzo !== p.pagina || r.costo_json !== null || r.origine !== 'seed') return { chiave: p.articolo, esito: `prezzo diverso da quelli della guida (${r.prezzo}): non toccato` };
  const comprato = !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'acquisto_partita'").get()
    && !!db.prepare('SELECT 1 FROM utente.acquisto_partita WHERE articolo_chiave = ?').get(p.articolo);
  const daVoce = esisteTabella(db, 'voce_effetto') && !!db.prepare("SELECT 1 FROM main.voce_effetto WHERE json_valid(dati_json) AND json_extract(dati_json, '$.articolo') = ?").get(p.articolo);
  if (comprato || daVoce) return { chiave: p.articolo, esito: `offerta già ${comprato ? 'segnata in una partita' : 'comprata da una voce del Diario'}: prezzo non toccato (gli yen già scalati non cambiano)` };
  if (db.prepare("UPDATE main.articolo SET prezzo = ?, updated_at = ? WHERE chiave = ? AND prezzo = ? AND costo_json IS NULL AND origine = 'seed'").run(p.giusto, new Date().toISOString(), p.articolo, p.pagina).changes !== 1) errore(`il prezzo di ${p.articolo} non si aggiorna`);
  return { chiave: p.articolo, esito: `prezzo: ${p.pagina} ¥ → ${p.giusto} ¥` };
}

export const migration264: Migration = {
  id: 264,
  name: 'note_storiche_dei_prezzi_discordanti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 264 }, 'articoli o catalogo assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = PREZZI_DISCORDANTI.map((p) => prezzo(db, p));
    const note: Array<{ nota: string; creata: number; legami: number }> = [];
    for (const p of PREZZI_DISCORDANTI) {
      const legami = [{ tipo: 'articolo' as const, chiave: p.articolo }, { tipo: 'catalogo' as const, chiave: p.catalogo }];
      if (p.nota) note.push({ nota: p.nota.chiave, ...notaStorica(db, p.nota, legami) });
      else if (esisteTabella(db, 'nota_storica') && db.prepare('SELECT 1 FROM main.nota_storica WHERE chiave = ?').get(NOTA_HOMUNCULUS)) {
        // la nota c'è già (139): si completano solo i legami mancanti, il testo non si tocca
        const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
        let n = 0;
        for (const l of legami) if (l.tipo === 'articolo' ? db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(l.chiave) : db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(l.chiave)) n += lega.run(NOTA_HOMUNCULUS, l.tipo, l.chiave).changes;
        note.push({ nota: NOTA_HOMUNCULUS, creata: 0, legami: n });
      } else note.push({ nota: NOTA_HOMUNCULUS, creata: 0, legami: 0 });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      prezziCorretti: esiti.filter((e) => e.esito.startsWith('prezzo: ')).length,
      noteCreate: note.reduce((s, n) => s + n.creata, 0), legami: note.reduce((s, n) => s + n.legami, 0),
      nonToccati: esiti.filter((e) => /non toccat|assente/.test(e.esito)).length,
    };
    if (conteggi.prezziCorretti + conteggi.noteCreate + conteggi.legami) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 264, { fonte: FONTE_NEGOZI, conteggi, esiti, note });
    logger.info({ migrazione: 264, ...conteggi }, 'Prezzi discordanti della guida: listino dei negozi con la nota storica');
  },
};
