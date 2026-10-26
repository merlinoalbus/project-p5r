// ============================================================
// Migrazione 274 — i premi della sfida Big Bang Burger senza la copia (sbagliata) dell'effetto dei distintivi (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 dell'utente: il testo dell'effetto vive nel catalogo, «si tolgono le copie […] e si correggono i testi sbagliati»; prevale il
// dato Royal. I premi delle tre sfide (`attivita.esiti_json`, esiti «vinta») scrivevano l'effetto del distintivo dentro la frase, con i numeri
// di un'altra edizione e i nomi inglesi: «Distintivo 2nd Mate (più 10 HP)», «Distintivo 1st Mate (più 30 HP)», «Distintivo Captain (più 50
// HP)». La guida italiana, Accessori: «Distintivo numero due» HP massimi +10%, «Distintivo numero uno» +20%, «Distintivo del capitano» +30%
// — dalla 273 schede del catalogo, dove l'effetto si legge. Il premio resta testo (il collegamento all'oggetto per chiave e quantità è del
// lotto G); qui la frase dice il nome italiano del distintivo, senza effetto, e i Big Bang Burger come prima.
//
// Conservativa: solo l'attività della guida mai corretta dall'utente, solo un esito con esattamente il testo atteso; il nome dei gruppi
// («Cosmo Tower Burger» contro «Cosmic Tower Burger» della guida) resta al lotto G, che lega gli esiti agli oggetti. Nessuna voce del Diario
// cambia. Idempotente. Audit `dati_guida.audit-274-premi-big-bang-burger`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FONTE_ACCESSORI, improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-274-premi-big-bang-burger';
const ATTIVITA = 'sfida-big-bang-burger';
const errore = (motivo: string): never => { throw new Error(`274: ${motivo}; nessuna modifica applicata.`); };

/** Esito → premio atteso e premio giusto. */
const PREMI: Readonly<Record<string, { prima: string; dopo: string }>> = {
  'comet-vinta': { prima: 'Distintivo 2nd Mate (più 10 HP) e 3 Big Bang Burger', dopo: 'Distintivo numero due e 3 Big Bang Burger' },
  'gravity-vinta': { prima: 'Distintivo 1st Mate (più 30 HP) e 5 Big Bang Burger', dopo: 'Distintivo numero uno e 5 Big Bang Burger' },
  'cosmo-tower-vinta': { prima: 'Distintivo Captain (più 50 HP) e 10 Big Bang Burger', dopo: 'Distintivo del capitano e 10 Big Bang Burger' },
};

export const migration274: Migration = {
  id: 274,
  name: 'premi_della_sfida_big_bang_burger',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 274 }, 'esiti delle attività assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Array<{ esito: string; risultato: string; prima?: string; dopo?: string }> = [];
    const r = db.prepare('SELECT esiti_json, origine, seed_json FROM main.attivita WHERE chiave = ?').get(ATTIVITA) as { esiti_json: string | null; origine: string; seed_json: string | null } | undefined;
    let motivo: string | null = null;
    if (!r || !r.esiti_json) motivo = 'attività o esiti assenti';
    else if (r.origine !== 'seed' || r.seed_json !== null) motivo = 'attività corretta dall’utente: non toccata';
    else {
      let dati: { esiti?: Array<Record<string, unknown>> } | null = null;
      try { dati = JSON.parse(r.esiti_json) as { esiti?: Array<Record<string, unknown>> }; } catch { motivo = 'esiti illeggibili: non toccati'; }
      if (dati && Array.isArray(dati.esiti)) {
        let cambiati = 0;
        for (const [chiave, p] of Object.entries(PREMI)) {
          const e = dati.esiti.find((x) => x.chiave === chiave);
          if (!e) { esiti.push({ esito: chiave, risultato: 'esito assente' }); continue; }
          if (e.premi === p.dopo) { esiti.push({ esito: chiave, risultato: 'già senza la copia dell’effetto' }); continue; }
          if (e.premi !== p.prima) { esiti.push({ esito: chiave, risultato: 'premio diverso da quello atteso: non toccato', prima: String(e.premi) }); continue; }
          e.premi = p.dopo; cambiati++;
          esiti.push({ esito: chiave, risultato: 'corretto', prima: p.prima, dopo: p.dopo });
        }
        if (cambiati) {
          const n = db.prepare("UPDATE main.attivita SET esiti_json = ? WHERE chiave = ? AND esiti_json = ? AND origine = 'seed' AND seed_json IS NULL")
            .run(JSON.stringify(dati), ATTIVITA, r.esiti_json).changes;
          if (n !== 1) errore('gli esiti della sfida non si aggiornano');
          invalidaCacheDiGioco();
        }
      } else if (!motivo) motivo = 'esiti senza elenco: non toccati';
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = { corretti: esiti.filter((e) => e.risultato === 'corretto').length, nonToccati: esiti.filter((e) => /non toccat|assente/.test(e.risultato)).length };
    scriviAuditTesti(db, AUDIT, 274, { fonti: [FONTE_ACCESSORI], attivita: ATTIVITA, ...(motivo ? { motivo } : {}), conteggi, esiti }, conteggi.corretti);
    if (motivo) logger.warn({ migrazione: 274, motivo }, 'premi della sfida Big Bang Burger: nessuna correzione');
    logger.info({ migrazione: 274, ...conteggi }, 'Big Bang Burger: premi delle sfide con il nome del distintivo (l’effetto è nel catalogo)');
  },
};
