// ============================================================
// 206 — l'invito di Makoto arriva il 4/8: voce e invito spostati, segno «da rivedere» tolto (L11 · R11-10c/1, M-A; decisione dell'utente del 24/10 «4/8, togli il segno»)
// ============================================================
//
// La voce `931d1e20…` (invito di Makoto al Planetario di Ikebukuro) stava al 30/7, ma l'invito richiede il Palazzo di Futaba concluso e sul percorso del diario
// la piramide si conclude il 3/8 (G-028; dato Royal: `lotti/L11/makoto-30-luglio-data-royal-2026-10-24.md`). Decisione dell'utente: 4/8. La voce passa a 08-04,
// giorno, ordine 0; dal testo si toglie «, in alternativa a «Confidente Ann: preparazione per il prossimo avanzamento»» (il resto è invariato); `da_rivedere = 0`;
// testo, nota, data, fascia e ordine di prima in `testo_precedente_json`. L'invito `makoto/07-30` in `confidente_invito` tiene la sua chiave (l'effetto della voce
// la cita): cambiano solo `data` (08-04) e `nota`. Guardie: la voce esiste con il testo e la data attesi e `da_rivedere = 1`; già spostata: niente. Nessuna altra voce
// cambia (impronta per uid, esclusa `ordine` della fascia di partenza se compattata); nessuna voce validata (fino al 1° giugno) è toccata.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const PREFISSO = '931d1e20';
const ALTERNATIVA = ', in alternativa a «Confidente Ann: preparazione per il prossimo avanzamento»';
const INVITO = 'makoto/07-30';
const NOTA_INVITO = 'Arriva il 4 agosto sul percorso del diario: la piramide si conclude il 3 agosto e l\'invito richiede il Palazzo di Futaba concluso (G-028; data confermata dall\'utente il 24/10)';
const errore = (motivo: string): never => { throw new Error(`206: ${motivo}; nessuna modifica applicata.`); };

function impronte(db: AppDatabase): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').iterate() as Iterable<Record<string, unknown>>) {
    const { ordine: _o, ...resto } = r; m.set(String(r.uid), createHash('sha256').update(JSON.stringify(resto)).digest('hex'));
  }
  return m;
}

export const migration206: Migration = {
  id: 206, name: 'invito_makoto_4_agosto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata')) return;
    const voci = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${PREFISSO}%`) as Array<Record<string, unknown>>;
    if (voci.length === 0) return;
    if (voci.length > 1) errore(`${voci.length} voci cominciano con ${PREFISSO}`);
    const v = voci[0]!;
    if (v.data === '08-04') return;
    if (v.data !== '07-30' || v.da_rivedere !== 1 || v.aggiunta_da !== 'team' || !String(v.azione).includes(ALTERNATIVA)) errore(`la voce ${String(v.uid)} non è quella attesa del 30/7`);
    const prima = impronte(db);

    const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo, data: v.data, fascia: v.fascia, ordine: v.ordine });
    db.prepare('UPDATE main.voce_giornata SET data = ?, fascia = ?, ordine = -1, azione = ?, da_rivedere = 0, testo_precedente_json = ?, updated_at = ? WHERE uid = ?')
      .run('08-04', 'giorno', String(v.azione).replace(ALTERNATIVA, ''), precedente, new Date().toISOString(), v.uid);
    const arrivo = (db.prepare('SELECT uid FROM main.voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').pluck().all('08-04', 'giorno', v.uid) as string[]);
    [String(v.uid), ...arrivo].forEach((uid, i) => db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?').run(i, uid));
    (db.prepare('SELECT uid FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid').pluck().all('07-30', String(v.fascia)) as string[])
      .forEach((uid, i) => db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?').run(i, uid));

    let invito = false;
    if (esisteTabella(db, 'confidente_invito')) {
      const info = db.prepare("UPDATE main.confidente_invito SET data = '08-04', nota = ?, updated_at = ? WHERE chiave = ? AND data = '07-30'").run(NOTA_INVITO, new Date().toISOString(), INVITO);
      invito = info.changes === 1;
    }

    const dopo = impronte(db);
    if (dopo.size !== prima.size) errore('il numero delle voci del Diario è cambiato');
    for (const [uid, imp] of prima) if (uid !== v.uid && dopo.get(uid) !== imp) errore(`la voce ${uid} è cambiata`);
    const n = db.prepare('SELECT data, fascia, ordine, da_rivedere FROM main.voce_giornata WHERE uid = ?').get(v.uid) as { data: string; fascia: string; ordine: number; da_rivedere: number };
    if (n.data !== '08-04' || n.fascia !== 'giorno' || n.ordine !== 0 || n.da_rivedere !== 0) errore('la voce non è come attesa dopo lo spostamento');
    logger.info({ migrazione: 'L11-R11-10c-206', voce: String(v.uid), invitoAggiornato: invito }, 'invito di Makoto spostato al 4/8');
  },
};
