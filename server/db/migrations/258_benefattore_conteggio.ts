// ============================================================
// Migrazione 258 — la sfida «Benefattore» del Covo dei Ladri conta i regali della partita (ondata 5, lotto D: RG-18)
// ============================================================
//
// Decisione 21 (b) dell'utente (26/10/2026): «Nulla si rimanda: Cartolina e premio "Benefattore" entrano nell'ondata». La guida italiana dei
// regali: «Dopo almeno 10 regali totali ai Confidenti si sblocca il premio "Benefattore" nel Covo dei Ladri»; la sfida è già nei dati della
// guida (`dati_guida.completamento`, `covo.sfide`, «Fare regali ai Confidenti per un totale di 10 doni…»), ma solo come testo: l'app non
// diceva a che punto si è.
//
// Che cosa fa: alla sfida «Benefattore» aggiunge il dato strutturato `conteggio: { tipo: 'regali-consegnati', obiettivo: 10 }`, che
// `completamentoService` legge con la partita (i regali consegnati di persona in `utente.regalo_partita`: la Cartolina spedita non è un dono
// consegnato a un ritrovo). Il testo del requisito non cambia, né le correzioni dell'utente (stanno in `correzione_dati_guida`). Una sfida
// che ha già il conteggio non si tocca; senza la sfida non si inventa niente (audit «ferma»). Audit in `dati_guida.audit-258-benefattore`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAuditRegali } from './regaliOndata5.js';

const AUDIT = 'audit-258-benefattore';
const SFIDA = 'Benefattore';
const CONTEGGIO = { tipo: 'regali-consegnati', obiettivo: 10 } as const;

export const migration258: Migration = {
  id: 258,
  name: 'benefattore_conteggio',
  up(db) {
    if (!db.inTransaction) throw new Error('258: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'dati_guida')) { logger.warn({ migrazione: 258 }, 'dati della guida assenti: conteggio non aggiunto'); return; }
    const testo = db.prepare("SELECT json FROM main.dati_guida WHERE chiave = 'completamento'").pluck().get() as string | undefined;
    let esito: 'aggiunto' | 'gia-presente' | 'ferma' = 'ferma';
    let motivo: string | null = null;
    if (!testo) motivo = 'blocco «completamento» assente';
    else {
      const dati = JSON.parse(testo) as { covo?: { sfide?: Array<Record<string, unknown>> } };
      const sfide = Array.isArray(dati.covo?.sfide) ? dati.covo!.sfide! : null;
      const trovate = sfide?.filter((s) => s.nome === SFIDA) ?? [];
      if (!sfide) motivo = 'il blocco non ha le sfide del Covo';
      else if (trovate.length !== 1) motivo = `sfide «${SFIDA}» trovate: ${trovate.length}`;
      else if (trovate[0]!.conteggio !== undefined) esito = 'gia-presente';
      else {
        trovate[0]!.conteggio = { ...CONTEGGIO };
        db.prepare("UPDATE main.dati_guida SET json = ? WHERE chiave = 'completamento'").run(JSON.stringify(dati));
        esito = 'aggiunto';
      }
    }
    scriviAuditRegali(db, AUDIT, 258, { esito, ...(motivo ? { motivo } : {}), sfida: SFIDA, conteggio: CONTEGGIO });
    if (esito === 'ferma') logger.warn({ migrazione: 258, motivo }, 'sfida Benefattore: conteggio non aggiunto');
    logger.info({ migrazione: 258, esito }, 'Covo dei Ladri: la sfida Benefattore conta i regali della partita');
  },
};
