// ============================================================
// 196 — la voce del 13/11 sera si riscrive: l'acquisto del Katsu alla friggitoria (L11 · R11-10c/1, decisione D8 dell'utente, 24/10)
// ============================================================
//
// La voce `7c081417…` del 13/11 sera diceva «Completare l'infiltrazione del palazzo» (con riferimento a Makoto / Palazzo di Sae e il segno «da rivedere»):
// la guida fa tutta l'infiltrazione di giorno (la voce `ebe00e6b…`) e la sera non si entra nei Palazzi. Decisione dell'utente: si riscrive, non si elimina.
// Testo da fonti Royal (analisi dati, `lotti/L11/M-C-dati-royal-2026-10-24.md` §2): il 13/11 è una domenica e il walkthrough Royal mette la sera
// dell'acquisto alla friggitoria di Kichijoji («solo la domenica sera»). La voce diventa un acquisto (stesso tipo della voce del 5/6), senza riferimento
// al Palazzo né a Makoto, con l'effetto `articolo` del Katsu a pezzettoni, `da_rivedere = 0`, motivo vuoto. Il testo di prima (azione, nota e
// riferimento) resta in `testo_precedente_json`. Data, fascia, ordine e uid non cambiano. Guardie: la voce deve essere ancora quella (testo, tipo,
// riferimento makoto), senza insieme d'infiltrazioni; l'articolo deve esistere; altrimenti si ferma senza toccare niente. Idempotente (se il testo è già
// quello nuovo non fa niente). Le spunte delle partite stanno nell'altro file e non si toccano.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const PREFISSO = '7c081417';
const VECCHIO = 'Completare l\'infiltrazione del palazzo';
const AZIONE = 'Friggitoria di Kichijoji (solo la domenica sera): comprare Katsu a pezzettoni prima della prossima infiltrazione';
const NOTE = '150 yen; ripristina 30 PS a un alleato. Il Palazzo non si visita di sera: l\'infiltrazione del giorno è nella voce di giorno.';
const ARTICOLO = 'friggitoria-hagoromo/katsu-a-pezzettoni';
const errore = (motivo: string): never => { throw new Error(`196: ${motivo}; nessuna modifica applicata.`); };

export const migration196: Migration = {
  id: 196, name: 'voce_13_novembre_sera_katsu',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata')) return;
    const voci = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${PREFISSO}%`) as Array<Record<string, unknown>>;
    if (voci.length === 0) return;
    if (voci.length > 1) errore(`${voci.length} voci cominciano con ${PREFISSO}`);
    const v = voci[0]!;
    const uid = String(v.uid);
    if (v.azione === AZIONE) return;
    if (v.azione !== VECCHIO || v.data !== '11-13' || v.fascia !== 'sera') errore(`la voce ${uid} non è «${VECCHIO}» del 13/11 sera`);
    if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(ARTICOLO)) errore(`l'articolo ${ARTICOLO} non esiste`);
    for (const t of ['voce_infiltrazione', 'proposta_infiltrazione_voce']) {
      if (esisteTabella(db, t) && db.prepare(`SELECT 1 FROM main.${t} WHERE voce_uid = ?`).get(uid)) errore(`la voce ha righe in ${t}`);
    }
    const prima = new Map<string, string>();
    for (const t of ['articolo', 'negozio', 'domanda']) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const altre = improntaDelleAltre(db, uid);

    const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
    db.prepare(`UPDATE main.voce_giornata SET azione = ?, note = ?, tipo = 'acquisto', riferimento_tipo = NULL, riferimento_chiave = NULL, riferimento_testo = NULL,
      da_rivedere = 0, motivo_revisione = NULL, testo_precedente_json = ?, updated_at = ? WHERE uid = ?`).run(AZIONE, NOTE, precedente, new Date().toISOString(), uid);
    const esito = aggiungiEffettoAllaVoce(db, '196', PREFISSO, 'comprare Katsu a pezzettoni', { tipo: 'articolo', articolo: ARTICOLO }, ARTICOLO);
    if (esito === 'saltato') errore('l\'effetto articolo non si è potuto aggiungere (voce senza fonte degli effetti convertita)');

    const dopo = db.prepare('SELECT azione, da_rivedere, riferimento_chiave, data, fascia, ordine FROM main.voce_giornata WHERE uid = ?').get(uid) as Record<string, unknown>;
    if (dopo.azione !== AZIONE || dopo.da_rivedere !== 0 || dopo.riferimento_chiave !== null || dopo.data !== '11-13' || dopo.fascia !== 'sera' || dopo.ordine !== 0) errore('la voce non è come attesa dopo la modifica');
    if (improntaDelleAltre(db, uid) !== altre) errore('altre voci del Diario sono cambiate');
    for (const [t, imp] of prima) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-10c-196', voce: uid, effetto: esito }, 'voce del 13/11 sera riscritta');
  },
};

/** L'impronta di tutte le voci del Diario tranne questa. */
function improntaDelleAltre(db: import('../dbService.js').AppDatabase, uid: string): string {
  const righe = db.prepare('SELECT * FROM main.voce_giornata WHERE uid <> ? ORDER BY uid').all(uid) as Array<Record<string, unknown>>;
  return `${righe.length}:${createHash('sha256').update(JSON.stringify(righe)).digest('hex')}`;
}
