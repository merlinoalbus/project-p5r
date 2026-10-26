// ============================================================
// Utente 051 — il registro degli acquisti con giorno, fascia e quantità (Ondata 5, Lotto A; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (26 ottobre): la rigenerazione dei negozi si calcola in lettura dalla regola dell'articolo (`articolo.rifornimento_json`,
// gioco 242) e dagli acquisti della partita. `acquisto_partita` resta com'è, «ottenuto almeno una volta» (lo leggono la condizione
// «articolo», le televendite, i regali e la mappa); questo registro conta le copie: una riga per acquisto, con il giorno e la fascia di gioco,
// i pezzi e la fonte (la pagina del negozio, oppure la voce del Diario e il suo effetto). `ottenuto_qui` = la riga ha creato il segno
// «ottenuto» in `acquisto_partita`: togliendo l'ultima riga che lo porta il segno se ne va, come prima; se restano altre righe il segno
// passa a una di loro (`scorteService.togliRiga`). L'Aojiru ha già il suo registro delle consumazioni e non entra qui. `sede_chiave` è il
// luogo in cui si è comprato (le sedi aggiuntive di un listino condiviso hanno ognuna la sua scorta); NULL = la sede principale.
//
// Righe di partenza (nessuna data inventata): solo gli acquisti che una voce del Diario spuntata attesta già (`effetto_stato_voce` di tipo
// «articolo», con la voce ancora spuntata e l'effetto ancora presente), con il giorno e la fascia della voce e i pezzi del suo effetto. Le
// presenze senza giorno (`acquisto_partita` segnato dalla pagina del negozio prima di questo registro) restano «ottenuto» e non consumano la
// scorta: non si data niente alla cieca. Nessuna voce del Diario cambia (il periodo validato compreso): cambia solo la lettura della scorta.
//
// Append-only e idempotente (IF NOT EXISTS, INSERT OR IGNORE sulla chiave della voce). Audit in `main.dati_guida.audit-utente-051-registro`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';

const AUDIT = 'audit-utente-051-registro';

const tabella = (db: AppDatabase, schema: 'main' | 'utente', nome: string): boolean =>
  !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);

export const utente051: Migration = {
  id: 51,
  name: 'registro_acquisti',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 051: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.registro_acquisti (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      articolo_chiave TEXT NOT NULL CHECK (length(articolo_chiave) BETWEEN 1 AND 600),
      giorno          TEXT NOT NULL CHECK (giorno GLOB '[0-9][0-9]-[0-9][0-9]'),
      fascia          TEXT NOT NULL CHECK (fascia IN ('giorno', 'sera')),
      quantita        INTEGER NOT NULL DEFAULT 1 CHECK (quantita BETWEEN 1 AND 999),
      fonte           TEXT NOT NULL CHECK (fonte IN ('negozio', 'voce')),
      voce_uid        TEXT CHECK (voce_uid IS NULL OR length(voce_uid) BETWEEN 1 AND 64),
      effetto_uid     TEXT CHECK (effetto_uid IS NULL OR length(effetto_uid) BETWEEN 1 AND 64),
      ottenuto_qui    INTEGER NOT NULL DEFAULT 0 CHECK (ottenuto_qui IN (0, 1)),
      creato_il       TEXT NOT NULL,
      sede_chiave     TEXT CHECK (sede_chiave IS NULL OR length(sede_chiave) BETWEEN 1 AND 300),
      CHECK ((fonte = 'voce') = (voce_uid IS NOT NULL AND effetto_uid IS NOT NULL))
    )`);
    // la sede in cui si è comprato (censimento D2: «ogni distributore ha la sua scorta», anche quando più distributori condividono il
    // listino): NULL = la sede principale del negozio della chiave. Le copie che avevano già la tabella senza la colonna la ricevono qui.
    const colonne = db.prepare("SELECT name FROM pragma_table_info('registro_acquisti', 'utente')").pluck().all() as string[];
    if (!colonne.includes('sede_chiave')) db.exec('ALTER TABLE utente.registro_acquisti ADD COLUMN sede_chiave TEXT CHECK (sede_chiave IS NULL OR length(sede_chiave) BETWEEN 1 AND 300)');
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS utente.registro_acquisti_voce ON registro_acquisti (partita_id, voce_uid, effetto_uid) WHERE fonte = 'voce'");
    db.exec('CREATE INDEX IF NOT EXISTS utente.registro_acquisti_articolo ON registro_acquisti (partita_id, articolo_chiave)');

    // le righe di partenza: gli acquisti attestati dalle voci spuntate
    const esiti: Array<{ partita: number; voce: string; effetto: string; articolo: string; esito: string }> = [];
    let inserite = 0;
    const fonti = ['effetto_stato_voce', 'spunta_voce_partita'].every((t) => tabella(db, 'utente', t)) && ['voce_giornata', 'voce_effetto'].every((t) => tabella(db, 'main', t));
    if (fonti) {
      const righe = db.prepare(`SELECT s.partita_id, s.voce_uid, s.effetto_uid, s.chiave, s.prima_json, s.applicato_il, v.data, v.fascia, e.dati_json
        FROM utente.effetto_stato_voce s
        JOIN utente.spunta_voce_partita sp ON sp.partita_id = s.partita_id AND sp.voce_uid = s.voce_uid
        JOIN main.voce_giornata v ON v.uid = s.voce_uid
        LEFT JOIN main.voce_effetto e ON e.voce_uid = s.voce_uid AND e.uid = s.effetto_uid
        WHERE s.tipo = 'articolo' ORDER BY s.partita_id, s.applicato_il, s.rowid`).all() as Array<{ partita_id: number; voce_uid: string; effetto_uid: string; chiave: string;
        prima_json: string; applicato_il: string; data: string; fascia: string; dati_json: string | null }>;
      const conOttenuto = new Set<string>();
      const inserisci = db.prepare(`INSERT OR IGNORE INTO utente.registro_acquisti (partita_id, articolo_chiave, giorno, fascia, quantita, fonte, voce_uid, effetto_uid, ottenuto_qui, creato_il)
        VALUES (?, ?, ?, ?, ?, 'voce', ?, ?, ?, ?)`);
      for (const r of righe) {
        const base = { partita: r.partita_id, voce: r.voce_uid, effetto: r.effetto_uid, articolo: r.chiave };
        if (r.dati_json === null) { esiti.push({ ...base, esito: 'effetto non più nella voce: nessuna riga' }); continue; }
        let dati: { tipo?: unknown; articolo?: unknown; quantita?: unknown };
        try { dati = JSON.parse(r.dati_json) as typeof dati; } catch { esiti.push({ ...base, esito: 'effetto illeggibile: nessuna riga' }); continue; }
        if (dati.tipo !== 'articolo' || dati.articolo !== r.chiave) { esiti.push({ ...base, esito: 'l’effetto oggi cita un altro articolo: nessuna riga' }); continue; }
        if (!/^\d{2}-\d{2}$/.test(r.data) || (r.fascia !== 'giorno' && r.fascia !== 'sera')) { esiti.push({ ...base, esito: 'voce senza giorno o fascia di gioco: nessuna riga' }); continue; }
        const quantita = typeof dati.quantita === 'number' && Number.isSafeInteger(dati.quantita) && dati.quantita >= 1 && dati.quantita <= 999 ? dati.quantita : 1;
        // un «prima» illeggibile vale «c'era già»: la riga non prende il segno «ottenuto»
        const gia = (() => { try { return (JSON.parse(r.prima_json) as { gia?: unknown }).gia !== false; } catch { return true; } })();
        // il segno «ottenuto» lo ha creato al più una voce: la prima spuntata con lo stato non ancora vero
        const k = `${r.partita_id}\0${r.chiave}`;
        const ottenuto = !gia && !conOttenuto.has(k) && !!db.prepare('SELECT 1 FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(r.partita_id, r.chiave);
        if (ottenuto) conOttenuto.add(k);
        const n = inserisci.run(r.partita_id, r.chiave, r.data, r.fascia, quantita, r.voce_uid, r.effetto_uid, ottenuto ? 1 : 0, r.applicato_il).changes;
        inserite += n;
        esiti.push({ ...base, esito: n ? `riga del ${r.data} (${r.fascia}), ${quantita} ${quantita === 1 ? 'pezzo' : 'pezzi'}${ottenuto ? ', con il segno «ottenuto»' : ''}` : 'riga già presente' });
      }
    }
    if (tabella(db, 'main', 'dati_guida')) {
      const esecuzione = { il: new Date().toISOString(), conteggi: { righeInserite: inserite, esaminate: esiti.length, totaleRegistro: db.prepare('SELECT COUNT(*) FROM utente.registro_acquisti').pluck().get() }, esiti };
      const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
      const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
      db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
        .run(AUDIT, JSON.stringify({ migrazione: 'utente-051', decisione: 'L13-21', esecuzioni: [...esecuzioni, esecuzione] }));
    }
  },
};
