// ============================================================
// Utente 042 — le righe legacy di `spillo_partita` dei pin condivisi dai rigenerabili si tolgono (L11, R11-02b/1)
// ============================================================
//
// Un pin collegato a voci **rigenerabili di più infiltrazioni** (a Madarame 40 pin) ha il suo stato per infiltrazione in
// `spillo_partita_infiltrazione` (utente 023): la riga di `spillo_partita` di quei pin «resta com'è e non si legge più» (intestazione della 023).
// Nessun lettore la usa: `statoDelPin`, `pinFattoPerLaVoce` e `statoVoce` per un pin condiviso leggono solo lo stato per infiltrazione, e
// `pulisciDivergenzeRisolte` — l'unico che la leggeva anche per i condivisi — ora guarda anche le infiltrazioni. Questa migrazione toglie le righe
// rimaste, così il dato ha un solo posto.
//
// Il criterio dei pin condivisi è quello del modello di lettura (`modelloAvanzamento`) e della 023: i pin delle planimetrie, con uid, collegati
// (`spillo_voce`, o il riferimento «punto» dello strato di prima) a voci con carattere «rigenerabile» di più di una infiltrazione. Non si importano
// servizi (una migrazione vecchia non deve cambiare con il codice).
//
// Non si perde stato raccolto: una riga `raccolto = 1` si toglie SOLO se per lo stesso pin e partita c'è almeno una riga per infiltrazione raccolta
// (l'informazione è lì); altrimenti resta e va nel registro. Una riga `raccolto = 0` non porta niente (un pin non raccolto non ha riga raccolta) e si
// toglie. Non si tocca nessun'altra tabella: né `spillo_partita_infiltrazione`, né `punto_partita`, né `divergenza_partita`. Prima di una migrazione
// delle partite il server copia `partite.db` (`runBootBackup`). Idempotente: la seconda volta non trova righe da togliere.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { sqlCarattereVoce } from '../../../shared/caratteriVoce.js';

export const utente042: Migration = {
  id: 42,
  name: 'spillo_partita_dei_pin_condivisi_tolti',
  up(db) {
    const c = (schema: string, tabella: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
    if (!c('utente', 'spillo_partita') || !c('utente', 'spillo_partita_infiltrazione') || !c('main', 'spillo') || !c('main', 'punto_interesse') || !c('main', 'spillo_voce')) return;
    const colonne = (tabella: string) => new Set((db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((x) => x.name));
    const punto = colonne('punto_interesse');
    const spillo = colonne('spillo');
    if (!punto.has('area_dedalo_chiave') || !spillo.has('uid')) return;
    // i pin condivisi, come nel modello di lettura: pin delle planimetrie con uid, voci rigenerabili di più infiltrazioni
    const legami = db.prepare(`SELECT DISTINCT s.uid AS uid, p.area_chiave AS infiltrazione
      FROM (SELECT spillo_id AS id, voce_chiave AS voce FROM main.spillo_voce UNION SELECT id, riferimento_chiave FROM main.spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave IS NOT NULL) v
      JOIN main.spillo s ON s.id = v.id JOIN main.punto_interesse p ON p.chiave = v.voce
      WHERE s.uid IS NOT NULL AND s.mappa_chiave IS NOT NULL AND ${sqlCarattereVoce('p', punto.has('carattere'))} = 'rigenerabile'`).all() as Array<{ uid: string; infiltrazione: string }>;
    const perPin = new Map<string, Set<string>>();
    for (const l of legami) (perPin.get(l.uid) ?? perPin.set(l.uid, new Set()).get(l.uid)!).add(l.infiltrazione);
    const condivisi = new Set([...perPin].filter(([, inf]) => inf.size > 1).map(([uid]) => uid));
    const righe = (db.prepare('SELECT partita_id AS partita, spillo_uid AS uid, raccolto FROM utente.spillo_partita').all() as Array<{ partita: number; uid: string; raccolto: number }>)
      .filter((r) => condivisi.has(r.uid));
    const conInfiltrazione = db.prepare('SELECT 1 FROM utente.spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1 LIMIT 1');
    const toglie = db.prepare('DELETE FROM utente.spillo_partita WHERE partita_id = ? AND spillo_uid = ?');
    const tolte = { raccolto: 0, nonRaccolto: 0 };
    const tenute: Array<{ partita: number; uid: string; caso: string }> = [];
    for (const r of righe) {
      if (r.raccolto === 1 && !conInfiltrazione.get(r.partita, r.uid)) { tenute.push({ partita: r.partita, uid: r.uid, caso: 'raccolto nel segno, nessuna infiltrazione raccolta: non si toglie' }); continue; }
      tolte[r.raccolto === 1 ? 'raccolto' : 'nonRaccolto'] += toglie.run(r.partita, r.uid).changes;
    }
    logger.info({ pinCondivisi: condivisi.size, righeTrovate: righe.length, tolte, tenute }, 'migrazione utente 042: righe legacy di spillo_partita dei pin condivisi tolte');
  },
};
