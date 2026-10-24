// ============================================================
// 182 — date dei Confidenti sulle fonti Royal (L9 R9-04/3, R9-04b/2; ricerca Royal del 24/10, §1)
// ============================================================
//
// Per «Royal prevale» e le risposte dell'utente del 24/10 («Resta la guida italiana», «Sì, 25/6»):
//   - Hifumi: il requisito `data` del rango 1 passa dal 28/6 al 25/6 (sera) e il suo evento di calendario (id 57) dal 2/7 al 25/6;
//   - Shinya: il requisito `data` del rango 1 passa dal 5/9 al 4/9 (3 fonti; la richiesta dei Memento resta);
//   - Yusuke: l'evento del rango 1 (id 47) è al 18/6, come il requisito (se è ancora al 17/6 si sposta);
//   - eventi di sblocco mancanti, collegati per chiave alla voce già nel Diario: Igor rango 1 (12/4), Futaba rango 1 (31/8), l'avvio di Morgana (11/4, nessuna voce);
//     l'evento già esistente di Ann e Morgana al 15/4 (id 9) riceve il collegamento alle due voci del 15/4 (nessun doppione);
//   - Kawakami RESTA com'è (sblocco 4/6, rango 1 l'8/6, guida italiana): una nota nella sua disponibilità registra la discordanza con Royal
//     (avvio 24/5, prima chiamata 27/5);
//   - Ohya non si tocca (le fonti discordano fra loro).
// Conservativa: ogni riga si scrive solo se ha ancora il valore vecchio; nessuna voce del Diario cambia; solo `main`; idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const FONTE = 'Royal: Samurai Gamers, walkthrough e guide dei Confidenti (ricerca del 24/10, lotti/L9/ricerca-royal-2-2026-10-24.md)';
const NOTA_KAWAKAMI = 'Discordanza con Royal: le fonti Royal danno l\'avvio il 24/5 («Operazione Maidwatch») e la prima chiamata il 27/5; la guida italiana dà lo sblocco il 4/6 e il rango 1 l\'8/6. Per scelta dell\'utente (24/10) restano le date della guida italiana.';

export const migration182: Migration = {
  id: 182, name: 'date_confidenti_royal',
  up(db) {
    const rapporto: Record<string, unknown> = {};
    // requisiti `data` del rango 1
    const requisito = db.prepare("UPDATE main.confidente_requisito SET dati_json = ?, testo = ? WHERE confidente_chiave = ? AND rango = 1 AND tipo = 'data' AND dati_json = ?");
    rapporto.requisiti = [
      requisito.run('{"dal":"06-25"}', 'Disponibile dal 25 giugno', 'hifumi', '{"dal":"06-28"}').changes,
      requisito.run('{"dal":"09-04"}', 'Disponibile dal 4 settembre', 'shinya', '{"dal":"09-05"}').changes,
    ];
    // eventi esistenti che cambiano data
    const sposta = db.prepare('UPDATE main.evento_calendario SET data = ? WHERE id = ? AND data = ? AND tipo = ?');
    rapporto.eventiSpostati = [sposta.run('06-25', 57, '07-02', 'sblocco').changes, sposta.run('06-18', 47, '06-17', 'sblocco').changes];
    // eventi mancanti, collegati alla voce già nel Diario (una sola per Confidente e giorno)
    const esisteGiorno = db.prepare('SELECT 1 FROM main.giorno_calendario WHERE data = ?');
    const esisteEvento = db.prepare('SELECT id FROM main.evento_calendario WHERE data = ? AND tipo = ? AND titolo = ?');
    const inserisci = db.prepare("INSERT INTO main.evento_calendario (data, ordine, tipo, titolo, dettaglio, fonte) VALUES (?, ?, 'sblocco', ?, ?, ?)");
    const voce = db.prepare("SELECT uid FROM main.voce_giornata WHERE data = ? AND riferimento_tipo = 'confidente' AND riferimento_chiave = ?");
    const collega = db.prepare("INSERT OR IGNORE INTO main.evento_calendario_voce (evento_id, voce_uid, certezza) VALUES (?, ?, 'C')");
    const NUOVI: ReadonlyArray<{ data: string; titolo: string; confidente: string | null; dettaglio: string }> = [
      { data: '04-12', titolo: 'Confidente Igor (Matto) rango 1', confidente: 'igor', dettaglio: 'Stanza di Velluto, di sera: il legame con Igor comincia.' },
      { data: '08-31', titolo: 'Confidente Futaba Sakura (Eremita) rango 1', confidente: 'futaba', dettaglio: 'Arrivo ad Akihabara: il legame con Futaba comincia.' },
      { data: '04-11', titolo: 'Morgana (Mago) compare al Leblanc', confidente: null, dettaglio: 'Dopo la liberazione di Kamoshida; il rango 1 del Confidente è il 15/4.' },
    ];
    let inseriti = 0, collegati = 0;
    for (const n of NUOVI) {
      if (!esisteGiorno.get(n.data) || esisteEvento.get(n.data, 'sblocco', n.titolo)) continue;
      const id = Number(inserisci.run(n.data, 9, n.titolo, n.dettaglio, FONTE).lastInsertRowid);
      inseriti++;
      if (n.confidente) {
        const v = voce.all(n.data, n.confidente) as Array<{ uid: string }>;
        if (v.length === 1) collegati += collega.run(id, v[0]!.uid).changes;
      }
    }
    // l'evento 9 (Ann e Morgana, 15/4) si collega alle loro due voci
    if (db.prepare("SELECT 1 FROM main.evento_calendario WHERE id = 9 AND data = '04-15' AND tipo = 'sblocco'").get()) {
      for (const c of ['ann', 'morgana']) {
        const v = voce.all('04-15', c) as Array<{ uid: string }>;
        if (v.length === 1) collegati += collega.run(9, v[0]!.uid).changes;
      }
    }
    rapporto.eventiInseriti = inseriti; rapporto.collegamenti = collegati;
    // Kawakami: la discordanza con Royal, una volta sola
    rapporto.nota = db.prepare("UPDATE main.confidente_disponibilita SET note = CASE WHEN note = '' THEN ? ELSE note || char(10) || char(10) || ? END WHERE confidente_chiave = 'kawakami' AND instr(note, 'Discordanza con Royal') = 0")
      .run(NOTA_KAWAKAMI, NOTA_KAWAKAMI).changes;
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('audit-182-date-confidenti-royal', JSON.stringify({ data: '2026-10-24', ...rapporto }));
    logger.info(rapporto, '[migration182] date dei Confidenti sulle fonti Royal');
  },
};
