// ============================================================
// utente 015 — la giornata diventa canone: correzioni, voci ed eventi dell'utente entrano nella guida; spunte per uid
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «le modifiche diventano nuovo canone a tutti gli effetti quindi non sono mai
// singola partita... ma tutte devono alterare i dati iniziali». Dalla migrazione di gioco 092 ogni voce della giornata è
// una riga di `main.voce_giornata` con un uid stabile. Qui quello che stava nel file delle partite passa nel file di gioco:
//   - le spunte (`azione_partita` per posizione, `azione_utente_partita` per id) diventano `spunta_voce_partita` per uid,
//     con gli effetti che avevano applicato;
//   - le correzioni alle azioni della guida (`correzione_azione_guida`) si scrivono nella voce; una rimozione elimina la
//     voce (scelta dell'utente: «Rimuovi» elimina) con le sue spunte — ma non se in qualche partita è spuntata con effetti:
//     allora la voce resta nella giornata, perché togliendo la spunta gli effetti si possano ancora annullare (la stessa
//     regola dell'eliminazione dall'app);
//   - le cose da fare (`azione_utente`) e gli eventi (`evento_utente`) dell'utente diventano voci, anche quelli che
//     valevano per una sola partita (scelta dell'utente: «diventano di tutte»);
//   - nei giorni toccati l'ordine è quello che l'utente vedeva: eventi, poi azioni della guida (nell'ordine della guida),
//     poi cose da fare;
//   - le tabelle vecchie (e `ordine_giornata`, nata e mai usata con la 014) si tolgono.
// Rientrante: accanto a un file di gioco che ha già il canone (un pacchetto esportato dopo questa migrazione, un file delle
// partite ripristinato da un backup) una correzione si applica solo a una voce ancora com'era dopo la 092 (mai toccata:
// `created_at = updated_at`), una voce dell'utente già presente non si reinserisce, e un giorno si riordina «come lo vedeva
// l'utente» solo se nessuna sua voce è stata cambiata altrove: se no le voci nuove vanno in fondo alla fascia.
// Ciò che non trova posto (una spunta senza voce, una correzione superata o su una voce già cambiata) si dichiara nel log.
// Su un file nuovo le tabelle vecchie sono vuote: qui non si converte nulla e si tolgono.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

interface RigaVoce { uid: string; data: string; fascia: string; ordine: number; indice_guida: number | null; created_at: string; updated_at: string }
interface Correzione { data: string; indice: number; originale_json: string; modifiche_json: string; nascosta: number }
interface Modifiche {
  azione?: string; note?: string | null; fascia?: string; tipo?: string; riferimento?: { tipo: string; chiave: string } | null;
  rangoAtteso?: number | null; produce?: unknown;
}
interface AzioneUtente {
  id: number; data: string; fascia: string; tipo: string; azione: string; riferimento_tipo: string | null; riferimento_chiave: string | null;
  rango_atteso: number | null; note: string | null; produce_json: string | null; ordine: number; created_at: string; updated_at: string;
}
interface EventoUtente {
  id: number; data: string; tipo: string; fascia: string | null; titolo: string; dettaglio: string; riferimento_tipo: string | null; riferimento_chiave: string | null;
  ordine: number; created_at: string; updated_at: string;
}

/** L'uid stabile di una voce nata da una riga dell'utente: i primi 32 caratteri dello SHA-256 di tabella, id e data di creazione (stessa riga, stesso uid a ogni esecuzione). */
const uidUtente = (tabella: string, id: number, creata: string) => createHash('sha256').update(`utente|${tabella}|${id}|${creata}`).digest('hex').slice(0, 32);
/** Una voce della guida ancora com'era dopo la 092 (nessuno l'ha toccata). */
const intatta = (v: RigaVoce) => v.indice_guida !== null && v.created_at === v.updated_at;

export const utente015: Migration = {
  id: 15,
  name: 'giornata_canone',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.spunta_voce_partita (
      partita_id    INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      voce_uid      TEXT NOT NULL,
      fatta_at      TEXT NOT NULL,
      effetti_json  TEXT,
      PRIMARY KEY (partita_id, voce_uid)
    )`);
    /** Vero se la tabella esiste nello schema indicato (gioco o partite). */
    const c = (schema: 'main' | 'utente', t: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(t);
    const vecchie = ['azione_partita', 'azione_utente', 'azione_utente_partita', 'correzione_azione_guida', 'evento_utente'];
    /** Le righe di una tabella vecchia del file delle partite (0 se la tabella non c'è). */
    const conta = (t: string) => (c('utente', t) ? (db.prepare(`SELECT COUNT(*) AS n FROM utente.${t}`).get() as { n: number }).n : 0);
    const righeVecchie = vecchie.reduce((n, t) => n + conta(t), 0);
    if (!c('main', 'voce_giornata')) {
      // la 092 gira prima (il runner fa prima le migrazioni di gioco): senza la tabella delle voci non si butta via niente.
      // Un file di gioco più vecchio accanto a un file delle partite vuoto (le prove delle migrazioni di allora) non ha niente da portare.
      if (righeVecchie > 0) throw new Error('migrazione utente 015: manca main.voce_giornata (migrazione di gioco 092) e ci sono righe da convertire.');
      for (const t of [...vecchie, 'ordine_giornata']) db.exec(`DROP TABLE IF EXISTS utente.${t}`);
      return;
    }
    /** Tutte le righe di una tabella vecchia del file delle partite (nessuna se la tabella non c'è). */
    const tutte = <T,>(t: string): T[] => (c('utente', t) ? (db.prepare(`SELECT * FROM utente.${t}`).all() as T[]) : []);
    const adesso = new Date().toISOString();
    /** Posto nell'ordine che l'utente vedeva: 0 eventi, 1 guida (per indice), 2 cose da fare (per ordine, id). */
    const posto = new Map<string, [number, number, number]>();
    /** Le voci che questa migrazione ha scritto (corrette o inserite): con le intatte, dicono se un giorno si può riordinare. */
    const nostre = new Set<string>();
    /** Le voci della guida che una correzione ha passato all'altra fascia (il loro `ordine` è ancora quello della fascia di prima). */
    const cambiataFascia = new Set<string>();
    const toccati = new Set<string>();
    const log: Record<string, number> = {};
    /** Somma `n` al contatore `k` del resoconto finale nel log. */
    const segna = (k: string, n = 1) => { log[k] = (log[k] ?? 0) + n; };

    // 1. spunte delle azioni della guida: la posizione d'origine dice la voce
    if (c('utente', 'azione_partita')) {
      segna('spunteGuida', db.prepare(`INSERT OR IGNORE INTO utente.spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json)
        SELECT ap.partita_id, v.uid, ap.updated_at, ap.effetti_json FROM utente.azione_partita ap
        JOIN main.voce_giornata v ON v.data = ap.data AND v.indice_guida = ap.indice`).run().changes);
      const senzaVoce = db.prepare(`SELECT COUNT(*) AS n, SUM(ap.effetti_json IS NOT NULL) AS conEffetti FROM utente.azione_partita ap
        WHERE NOT EXISTS (SELECT 1 FROM main.voce_giornata v WHERE v.data = ap.data AND v.indice_guida = ap.indice)`).get() as { n: number; conEffetti: number | null };
      if (senzaVoce.n) { segna('spunteGuidaSenzaVoce', senzaVoce.n); segna('spunteGuidaSenzaVoceConEffetti', senzaVoce.conEffetti ?? 0); }
    }

    // 2. correzioni: si applicano se a quel posto la guida d'origine ha ancora il testo corretto dall'utente e la voce non è
    //    stata cambiata dopo la 092
    const seed = new Map<string, Array<{ azione?: string }>>();
    /** Il testo dell'azione `indice` del giorno nella guida d'origine (`giorno_percorso`), letto una volta per giorno; undefined se non c'è. */
    const testoGuida = (data: string, indice: number): string | undefined => {
      if (!seed.has(data)) {
        const r = db.prepare('SELECT azioni_json FROM main.giorno_percorso WHERE data = ?').get(data) as { azioni_json: string } | undefined;
        let azioni: Array<{ azione?: string }> = [];
        try { azioni = r ? (JSON.parse(r.azioni_json) as Array<{ azione?: string }>) : []; } catch { /* guida illeggibile: nessuna azione */ }
        seed.set(data, azioni);
      }
      return seed.get(data)![indice]?.azione;
    };
    const voceGuida = db.prepare('SELECT uid, data, fascia, ordine, indice_guida, created_at, updated_at FROM main.voce_giornata WHERE data = ? AND indice_guida = ?');
    const aggiorna = db.prepare(`UPDATE main.voce_giornata SET azione = ?, note = ?, fascia = ?, tipo = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = ?,
      rango_atteso = ?, produce_json = ?, updated_at = ? WHERE uid = ?`);
    const campi = db.prepare('SELECT * FROM main.voce_giornata WHERE uid = ?');
    const effettiSu = db.prepare('SELECT COUNT(*) AS n FROM utente.spunta_voce_partita WHERE voce_uid = ? AND effetti_json IS NOT NULL');
    for (const r of tutte<Correzione>('correzione_azione_guida')) {
      const originale = JSON.parse(r.originale_json) as { azione?: string };
      const v = voceGuida.get(r.data, r.indice) as RigaVoce | undefined;
      if (!v || originale.azione === undefined || originale.azione !== testoGuida(r.data, r.indice)) { segna('correzioniSuperate'); continue; }
      if (!intatta(v)) { segna('correzioniSuVociGiaCambiate'); continue; }
      toccati.add(r.data);
      if (r.nascosta === 1) {
        if ((effettiSu.get(v.uid) as { n: number }).n > 0) {
          // spuntata con effetti: resta nella giornata, perché la spunta si possa togliere e gli effetti annullare
          segna('rimosseTenutePerEffetti');
          continue;
        }
        db.prepare('DELETE FROM main.voce_giornata WHERE uid = ?').run(v.uid);
        segna('spunteDiVociEliminate', db.prepare('DELETE FROM utente.spunta_voce_partita WHERE voce_uid = ?').run(v.uid).changes);
        segna('vociEliminate');
        continue;
      }
      const m = JSON.parse(r.modifiche_json) as Modifiche;
      const a = campi.get(v.uid) as { azione: string; note: string | null; fascia: string; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; rango_atteso: number | null; produce_json: string };
      const rif = m.riferimento === undefined ? { tipo: a.riferimento_tipo, chiave: a.riferimento_chiave, testo: a.riferimento_testo }
        // un collegamento scelto dall'utente non salva il nome: lo si legge dall'elemento, e segue le rinomine del pacchetto
        : m.riferimento === null ? { tipo: null, chiave: null, testo: null } : { tipo: m.riferimento.tipo, chiave: m.riferimento.chiave, testo: null };
      aggiorna.run(m.azione ?? a.azione, m.note === undefined ? a.note : m.note, m.fascia === 'sera' || m.fascia === 'giorno' ? m.fascia : a.fascia, m.tipo ?? a.tipo,
        rif.tipo, rif.chiave, rif.testo, m.rangoAtteso === undefined ? a.rango_atteso : m.rangoAtteso,
        m.produce === undefined ? a.produce_json : JSON.stringify(Array.isArray(m.produce) ? m.produce : []), adesso, v.uid);
      nostre.add(v.uid);
      if ((m.fascia === 'sera' || m.fascia === 'giorno') && m.fascia !== a.fascia) cambiataFascia.add(v.uid);
      segna('correzioniApplicate');
    }

    // 3. cose da fare ed eventi dell'utente: voci della guida, per tutte le partite (una voce già nel file di gioco resta com'è)
    const inserisci = db.prepare(`INSERT OR IGNORE INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json, indice_guida, created_at, updated_at)
      VALUES (?, ?, ?, 1000000, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?)`);
    const uidMie = new Map<number, string>();
    for (const a of tutte<AzioneUtente>('azione_utente')) {
      const uid = uidUtente('azione_utente', a.id, a.created_at);
      uidMie.set(a.id, uid);
      if (inserisci.run(uid, a.data, a.fascia === 'sera' ? 'sera' : 'giorno', 'azione', a.azione, a.note, a.tipo || 'altro', a.riferimento_tipo, a.riferimento_chiave, a.rango_atteso, a.produce_json ?? '[]', a.created_at, a.updated_at).changes === 0) {
        segna('coseDaFareGiaNellaGuida');
        continue;
      }
      posto.set(uid, [2, a.ordine, a.id]);
      nostre.add(uid);
      toccati.add(a.data);
      segna('coseDaFare');
    }
    for (const e of tutte<EventoUtente>('evento_utente')) {
      const uid = uidUtente('evento_utente', e.id, e.created_at);
      const genere = e.tipo === 'scadenza' || e.tipo === 'promemoria' ? e.tipo : 'evento';
      if (inserisci.run(uid, e.data, e.fascia === 'sera' ? 'sera' : 'giorno', genere, e.titolo, e.dettaglio ? e.dettaglio : null, 'altro', e.riferimento_tipo, e.riferimento_chiave, null, '[]', e.created_at, e.updated_at).changes === 0) {
        segna('eventiGiaNellaGuida');
        continue;
      }
      posto.set(uid, [0, e.ordine, e.id]);
      nostre.add(uid);
      toccati.add(e.data);
      segna('eventi');
    }
    const spunteMie = db.prepare('INSERT OR IGNORE INTO utente.spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, ?, ?)');
    for (const s of tutte<{ partita_id: number; azione_utente_id: number; fatta_at: string; effetti_json: string | null }>('azione_utente_partita')) {
      const uid = uidMie.get(s.azione_utente_id);
      if (uid) segna('spunteUtente', spunteMie.run(s.partita_id, uid, s.fatta_at, s.effetti_json).changes);
      else { segna('spunteUtenteSenzaVoce'); if (s.effetti_json) segna('spunteUtenteSenzaVoceConEffetti'); }
    }

    // 4. l'ordine dei giorni toccati: quello che l'utente vedeva, se il giorno è ancora com'era; altrimenti le voci nuove in fondo
    const vociDelGiorno = db.prepare('SELECT uid, data, fascia, ordine, indice_guida, created_at, updated_at FROM main.voce_giornata WHERE data = ?');
    const rinumera = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
    for (const data of toccati) {
      const voci = vociDelGiorno.all(data) as RigaVoce[];
      const comeLoVedeva = voci.every((v) => intatta(v) || nostre.has(v.uid));
      if (!comeLoVedeva) segna('giorniConVociNuoveInFondo');
      for (const fascia of ['giorno', 'sera']) {
        /** La chiave d'ordinamento di una voce nella fascia (tre numeri confrontati in sequenza). */
        const chiave =(v: RigaVoce): [number, number, number] => comeLoVedeva
          ? posto.get(v.uid) ?? [1, v.indice_guida ?? Number.MAX_SAFE_INTEGER, v.ordine]
          // il canone del giorno è già cambiato altrove: le voci che c'erano nel loro ordine, poi quelle passate qui da una
          // correzione, poi quelle nuove (eventi prima delle cose da fare)
          : posto.has(v.uid) ? [2, ...posto.get(v.uid)!.slice(0, 2)] as [number, number, number]
            : cambiataFascia.has(v.uid) ? [1, v.indice_guida ?? 0, 0] : [0, v.ordine, 0];
        voci.filter((v) => v.fascia === fascia)
          .sort((x, y) => { const a = chiave(x); const b = chiave(y); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; })
          .forEach((v, i) => rinumera.run(i, v.uid));
      }
    }

    for (const t of [...vecchie, 'ordine_giornata']) db.exec(`DROP TABLE IF EXISTS utente.${t}`);
    logger.info({ ...log, giorniRiordinati: toccati.size }, 'migrazione utente 015: la giornata diventa canone');
    const perse = ['spunteGuidaSenzaVoce', 'spunteUtenteSenzaVoce', 'correzioniSuperate', 'correzioniSuVociGiaCambiate', 'rimosseTenutePerEffetti'].filter((k) => log[k]);
    if (perse.length) logger.warn(Object.fromEntries(perse.map((k) => [k, log[k]]).concat([['conEffetti', (log.spunteGuidaSenzaVoceConEffetti ?? 0) + (log.spunteUtenteSenzaVoceConEffetti ?? 0)]])),
      'migrazione utente 015: righe che non hanno trovato posto nella giornata canone (spunte senza voce, correzioni non applicabili) o voci rimosse lasciate per i loro effetti');
  },
};
