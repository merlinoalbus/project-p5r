// ============================================================
// 378 — forzieri e mini-boss di Iweleth col tipo di prima; la lettera di sfida di Shido (L9-08, scelte Q22 dell'utente)
// ============================================================
//
// (1) Con la confluenza di Iweleth nel dedalo (175) tutte le voci sono diventate Trama, e `voce_confluenza` conserva il tipo di prima. L'utente rivuole
//     il tipo di prima per i soli forzieri e mini-boss (9 + 6 voci nei dati di oggi): oggetti, puzzle, sicure, boss, Ombre sciagura e «altro» restano
//     Trama. Vale solo per una voce `convertita` che è ancora Trama: una cambiata a mano resta com'è.
//     Carattere e ordine non si toccano: nelle aree dei dedali il carattere non esiste (`carattereDaTipo`), e l'ordine è quello della voce nell'area
//     del dedalo (`ordine_precedente` era il posto nell'infiltrazione del Palazzo). Il tipo non cambia il conto: una voce di un dedalo conta se non è una
//     Persona (`contaNelDedalo`), e Iweleth non ha effetti di Palazzo.
// (2) La guida (`palazzo-di-shido`, 12 dicembre) invia la lettera lo stesso giorno del furto, cinque giorni prima della scadenza: è un dato documentato,
//     che la regola del giorno prima (`shared/datePalazzo.letteraDelPalazzo`) non ricava. Si scrive solo se la riga è quella attesa; con apertura 11-24,
//     furto 12-12, lettera 12-12, scadenza 12-17 l'ordine richiesto dalla regola delle date è rispettato. Se la riga è diversa e la lettera non è già
//     12-12 non si scrive niente, e i valori letti vanno nel verbale e nel log.
//
// Idempotente: una seconda esecuzione con la lettera già scritta non trova niente da cambiare e non aggiunge voci al verbale. Verbale: `dati_guida.audit-l9-08-iweleth`. Non si
// scrive in `utente`: gli stati delle partite restano legati alla voce per chiave.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`378: ${motivo}; nessuna modifica applicata.`); };

const AUDIT = 'audit-l9-08-iweleth';

/** Vero se l'ultima voce del verbale dice già che la guardia di Shido non è scattata con questi valori: una riesecuzione non ne accoda una uguale. */
function giaNelVerbale(db: AppDatabase, letti: unknown): boolean {
  const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (!json) return false;
  let voci: Array<{ vociRiportate?: number; letteraShido?: { esito?: string; letti?: unknown } }>;
  try { voci = (JSON.parse(json) as { voci?: typeof voci }).voci ?? []; }
  catch { return errore(`il verbale ${AUDIT} non è leggibile`); }
  const ultima = voci[voci.length - 1];
  return ultima?.vociRiportate === 0 && ultima.letteraShido?.esito === 'guardia-non-scattata' && JSON.stringify(ultima.letteraShido.letti) === JSON.stringify(letti);
}

export const migration378: Migration = {
  id: 378,
  name: 'iweleth_tipi_e_lettera_di_shido',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'punto_interesse') || !esisteTabella(db, 'dungeon') || !esisteTabella(db, 'dati_guida')) return;

    const voci: Array<{ chiave: string; nome: string; tipo: string }> = [];
    if (esisteTabella(db, 'voce_confluenza')) {
      const impronta = improntaTabella(db, 'punto_interesse', ['tipo']);
      const candidate = db.prepare(`SELECT vc.voce_chiave AS chiave, p.nome, vc.tipo_precedente AS tipo FROM main.voce_confluenza vc JOIN main.punto_interesse p ON p.chiave = vc.voce_chiave
        WHERE vc.azione = 'convertita' AND vc.tipo_precedente IN ('forziere', 'miniboss') AND p.tipo = 'trama' ORDER BY vc.voce_chiave`).all() as Array<{ chiave: string; nome: string; tipo: string }>;
      const scrivi = db.prepare("UPDATE main.punto_interesse SET tipo = ? WHERE chiave = ? AND tipo = 'trama'");
      for (const v of candidate) {
        if (scrivi.run(v.tipo, v.chiave).changes !== 1) errore(`il tipo di ${v.chiave} non si aggiorna`);
        voci.push(v);
      }
      if (improntaTabella(db, 'punto_interesse', ['tipo']) !== impronta) errore('le altre colonne di punto_interesse sono cambiate');
    }

    // la guardia per identità: se non scatta e la lettera non è già quella, i valori letti vanno nel verbale e nel log (non si perde in silenzio)
    const colonne = haColonna(db, 'dungeon', 'lettera_entro') && haColonna(db, 'dungeon', 'furto_consigliato_data');
    const letti = colonne ? db.prepare("SELECT finestra_dal, finestra_al, furto_consigliato_data, lettera_entro FROM main.dungeon WHERE chiave = 'shido'").get() as { lettera_entro: string | null } | undefined : undefined;
    let esitoShido: 'scritta' | 'gia-presente' | 'guardia-non-scattata' = 'guardia-non-scattata';
    if (letti?.lettera_entro === '12-12') esitoShido = 'gia-presente';
    else if (colonne && db.prepare(`UPDATE main.dungeon SET lettera_entro = '12-12' WHERE chiave = 'shido' AND lettera_entro IS NULL
        AND finestra_dal = '11-24' AND finestra_al = '12-17' AND furto_consigliato_data = '12-12'`).run().changes === 1) esitoShido = 'scritta';
    if (esitoShido === 'guardia-non-scattata') logger.warn({ migrazione: 'L9-08-378', letti: letti ?? null }, 'Shido: la riga non è quella attesa, lettera di sfida non scritta');

    if (voci.length === 0 && (esitoShido === 'gia-presente' || (esitoShido === 'guardia-non-scattata' && giaNelVerbale(db, letti ?? null)))) return;
    registraAudit(db, AUDIT, {
      migrazione: 'L9-08 · 378',
      vociRiportate: voci.length, forzieri: voci.filter((v) => v.tipo === 'forziere').length, miniboss: voci.filter((v) => v.tipo === 'miniboss').length, voci,
      letteraShido: { esito: esitoShido, fonte: 'palazzo-di-shido, 12 dicembre', ...(esitoShido === 'guardia-non-scattata' ? { letti: letti ?? null } : {}) },
    });
    logger.info({ migrazione: 'L9-08-378', voci: voci.length, letteraShido: esitoShido }, 'Iweleth: forzieri e mini-boss col tipo di prima; lettera di Shido');
  },
};
