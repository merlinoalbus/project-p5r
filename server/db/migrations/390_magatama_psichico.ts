// ============================================================
// 390 — il Magatama da 150 danni psicocinetici si chiama «Magatama psichico»
// ============================================================
//
// La guida chiama lo stesso oggetto in due modi: «Magatama divino» nell'elenco dei consumabili della pagina Oggetti (150 danni
// psicocinetici a un nemico), da cui è nata la scheda `consumabile/magatama-divino`, e nel listino dei negozi speciali (6.000 ¥ da
// Tanaka, grado Nero); «Magatama psichico» nella pagina del Palazzo di Kaneshiro (il forziere «Magatama psichico x3» del Corridoio
// dei banchieri). Nel gioco si chiama «Magatama psichico»
// (dato dell'utente, 2026-11-15): la scheda prende quel nome e tiene «Magatama divino» come nome alternativo, così la ricerca la trova
// con entrambi.
//
// COSA NON CAMBIA: la chiave della scheda (la citano l'offerta di Tanaka, le proposte e le decisioni già prese), l'effetto, la
// descrizione, la fonte, l'origine; ogni altra scheda del catalogo; le offerte. Nessuna scrittura in `utente`. Idempotente e con
// guardia: agisce solo se la scheda si chiama ancora «Magatama divino» e nessun'altra scheda si chiama già «Magatama psichico»; una
// scheda rinominata a mano resta com'è. Nessun import da `server/services/`. Verbale: `dati_guida.audit-390-magatama-psichico`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const CHIAVE = 'consumabile/magatama-divino';
const NOME_PRIMA = 'Magatama divino';
const NOME_DOPO = 'Magatama psichico';
const AUDIT = 'audit-390-magatama-psichico';
const errore = (motivo: string): never => { throw new Error(`390: ${motivo}; nessuna modifica applicata.`); };

/** Impronta del catalogo: ogni colonna di ogni riga, tranne nome, nomi alternativi e data di modifica della scheda toccata. */
function improntaCatalogo(db: AppDatabase): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT * FROM main.catalogo_oggetto ORDER BY chiave').iterate() as Iterable<Record<string, unknown>>) {
    const riga = r.chiave === CHIAVE ? { ...r, nome: undefined, nomi_altri_json: undefined, updated_at: undefined } : r;
    h.update(`${JSON.stringify(riga)}\n`); n++;
  }
  return `${n}:${h.digest('hex')}`;
}

export const migration390: Migration = {
  id: 390,
  name: 'magatama_psichico',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !haColonna(db, 'catalogo_oggetto', 'nomi_altri_json') || !esisteTabella(db, 'dati_guida')) return;

    const scheda = db.prepare('SELECT nome, nomi_altri_json FROM main.catalogo_oggetto WHERE chiave = ?').get(CHIAVE) as { nome: string; nomi_altri_json: string | null } | undefined;
    // la scheda non c'è, o ha già un altro nome (questa migrazione già passata, o una correzione a mano): niente da fare
    if (!scheda || scheda.nome !== NOME_PRIMA) return;
    // un'altra scheda col nome d'arrivo sarebbe un doppione da unire, non da creare qui
    if (db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave <> ? AND lower(nome) = lower(?)').get(CHIAVE, NOME_DOPO)) {
      logger.warn({ migrazione: 390 }, 'Esiste già una scheda «Magatama psichico»: la scheda «Magatama divino» resta com’è');
      return;
    }

    let altri: unknown = [];
    try { altri = JSON.parse(scheda.nomi_altri_json ?? '[]'); } catch { errore('i nomi alternativi della scheda non sono un elenco leggibile'); }
    if (!Array.isArray(altri) || altri.some((x) => typeof x !== 'string')) errore('i nomi alternativi della scheda non sono un elenco di testi');
    const nomiAltri = [...(altri as string[]).filter((x) => x !== NOME_PRIMA && x !== NOME_DOPO), NOME_PRIMA];

    const prima = improntaCatalogo(db);
    const cambiate = db.prepare('UPDATE main.catalogo_oggetto SET nome = ?, nomi_altri_json = ?, updated_at = ? WHERE chiave = ? AND nome = ?')
      .run(NOME_DOPO, JSON.stringify(nomiAltri), new Date().toISOString(), CHIAVE, NOME_PRIMA).changes;
    if (cambiate !== 1) errore('la scheda non si rinomina');

    // i controlli: cambia solo ciò che è dichiarato
    const dopo = db.prepare('SELECT nome, nomi_altri_json FROM main.catalogo_oggetto WHERE chiave = ?').get(CHIAVE) as { nome: string; nomi_altri_json: string };
    if (dopo.nome !== NOME_DOPO || !(JSON.parse(dopo.nomi_altri_json) as string[]).includes(NOME_PRIMA)) errore('la scheda non ha il nome nuovo con quello di prima fra gli alternativi');
    if (improntaCatalogo(db) !== prima) errore('altre colonne o righe del catalogo sono cambiate');

    registraAudit(db, AUDIT, {
      migrazione: 'Magatama psichico · 390',
      motivo: 'la guida chiama lo stesso oggetto «Magatama divino» (pagina Oggetti e negozi speciali) e «Magatama psichico» (Palazzo di Kaneshiro); nel gioco è «Magatama psichico»',
      scheda: CHIAVE, nomePrima: NOME_PRIMA, nomeDopo: NOME_DOPO, nomiAlternativi: nomiAltri,
    });
    logger.info({ migrazione: 390, scheda: CHIAVE }, 'Catalogo: «Magatama divino» si chiama «Magatama psichico», col nome di prima fra gli alternativi');
  },
};
