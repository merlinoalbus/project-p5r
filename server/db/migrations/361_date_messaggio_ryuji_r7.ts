// ============================================================
// 361 — le date del messaggio di Ryuji per il Rango 7; il Rango 10 di Kawakami in nota (L7-07; risposta Q25 A)
// ============================================================
//
// Ryuji: l'evento del Rango 7 si avvia solo in certe sere, quando manda il suo messaggio. La pagina della guida dà l'elenco («Requisiti importanti»): maggio 18, 20, 25, 27;
// giugno 22, 29; luglio 1, 6, 29; agosto 12, 17; settembre 21; ottobre 2, 7; novembre 2, 4, 9, 11, 16, 30; dicembre 2, 7, 9; gennaio 13 (24 date; il rapporto di analisi ne
// citava le prime 11, fino ad agosto: con il solo primo blocco il Rango 7 risulterebbe impossibile da settembre, contro la guida). Nuova eccezione `solo-date-rango`, accanto
// alla `fascia-rango` sera che resta; guardia su `eccezioni_json` atteso. La fotografia di «Ripristina» (`disponibilita-struttura-seed-v1:ryuji`), se c'è e ha il valore
// atteso, riceve la stessa eccezione: altrimenti resta e si dice nel verbale.
// Kawakami: l'avvio del Rango 10 («il primo giorno di scuola dopo il Rango 9») non è calcolabile con il vocabolario: frase in `note`, con la revisione nello storico se c'è.
// Non si scrivono voci né spunte: cambia solo il semaforo calcolato. Verbale: `dati_guida.audit-l7-361-date-ryuji`. Nessun import da `server/services/`; non si scrive in `utente`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';
import { aggiungiRevisione, leggiStorico, notaConFrase, STORICI_VUOTI, type Fotografia } from './storicoDisponibilitaL7.js';

const errore = (motivo: string): never => { throw new Error(`361: ${motivo}; nessuna modifica applicata.`); };

const ATTESE = '[{"tipo":"fascia-rango","rango":7,"fasce":["sera"]}]';
const SOLO_DATE = { tipo: 'solo-date-rango', rango: 7, date: ['05-18', '05-20', '05-25', '05-27', '06-22', '06-29', '07-01', '07-06', '07-29', '08-12', '08-17', '09-21', '10-02', '10-07', '11-02', '11-04', '11-09', '11-11', '11-16', '11-30', '12-02', '12-07', '12-09', '01-13'] } as const;
const NUOVE = JSON.stringify([...JSON.parse(ATTESE) as unknown[], SOLO_DATE]);
const SEED = 'disponibilita-struttura-seed-v1:ryuji';
const FRASE_KAWAKAMI = 'Il Rango 10 si sblocca con una sequenza automatica il primo giorno di scuola dopo il Rango 9; da lì si può avviare in qualsiasi giorno.';
const NOTA_KAWAKAMI = 'Discordanza con Royal: le fonti Royal danno l\'avvio il 24/5 («Operazione Maidwatch») e la prima chiamata il 27/5; la guida italiana dà lo sblocco il 4/6 e il rango 1 l\'8/6. Per scelta dell\'utente (24/10) restano le date della guida italiana.';
const MOTIVO = 'Migrazione 361: in nota l’avvio del Rango 10, che le condizioni non sanno calcolare.';

export const migration361: Migration = {
  id: 361,
  name: 'date_messaggio_ryuji_r7',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'confidente_disponibilita') || !esisteTabella(db, 'dati_guida') || !haColonna(db, 'confidente_disponibilita', 'eccezioni_json')) return;
    const esiti: Array<{ riga: string; esito: string; trovato?: string }> = [];
    let scritte = 0;

    const r = db.prepare('SELECT eccezioni_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?').pluck().get('ryuji') as string | undefined;
    if (r === undefined) esiti.push({ riga: 'ryuji', esito: 'riga assente' });
    else if (r === NUOVE) { /* già fatto */ }
    else if (r !== ATTESE) esiti.push({ riga: 'ryuji', esito: 'eccezioni diverse da quelle attese: restano', trovato: r });
    else {
      if (db.prepare('UPDATE main.confidente_disponibilita SET eccezioni_json = ? WHERE confidente_chiave = ? AND eccezioni_json = ?').run(NUOVE, 'ryuji', ATTESE).changes !== 1) errore('le eccezioni di Ryuji non si aggiornano');
      scritte++;
      esiti.push({ riga: 'ryuji', esito: `solo-date-rango: ${SOLO_DATE.date.length} date al rango 7` });
    }

    const seed = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(SEED) as string | undefined;
    if (seed !== undefined) {
      let foto: Record<string, unknown> | null = null;
      try { foto = JSON.parse(seed) as Record<string, unknown>; } catch { /* illeggibile: resta */ }
      if (foto?.eccezioni_json === ATTESE) {
        db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify({ ...foto, eccezioni_json: NUOVE }), SEED);
        scritte++;
        esiti.push({ riga: SEED, esito: 'fotografia di «Ripristina» aggiornata' });
      } else if (foto?.eccezioni_json !== NUOVE) esiti.push({ riga: SEED, esito: 'fotografia diversa da quella attesa: resta', trovato: seed });
    }

    const k = db.prepare('SELECT note, note_generali, fonti_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?').get('kawakami') as { note: string; note_generali: string; fonti_json: string } | undefined;
    if (!k) esiti.push({ riga: 'kawakami', esito: 'riga assente' });
    else if (!k.note.includes(FRASE_KAWAKAMI)) {
      if (k.note !== NOTA_KAWAKAMI) esiti.push({ riga: 'kawakami', esito: 'nota diversa da quella attesa: resta', trovato: k.note });
      else {
        const prima: Fotografia = { ...STORICI_VUOTI, ...k };
        const dopo: Fotografia = { ...prima, note: notaConFrase(k.note, FRASE_KAWAKAMI) };
        const storico = leggiStorico(db, 'kawakami', prima);
        if (storico.stato === 'incoerente') esiti.push({ riga: 'kawakami', esito: 'lo storico dell’editor non finisce sulla riga di adesso: la nota non cambia' });
        else {
          if (db.prepare('UPDATE main.confidente_disponibilita SET note = ? WHERE confidente_chiave = ? AND note = ?').run(dopo.note, 'kawakami', k.note).changes !== 1) errore('la nota di Kawakami non si aggiorna');
          scritte++;
          esiti.push({ riga: 'kawakami', esito: `nota con il Rango 10${storico.stato === 'coerente' ? `, revisione ${aggiungiRevisione(db, 'kawakami', storico.registro, 361, MOTIVO, prima, dopo)} nello storico` : ''}` });
        }
      }
    }

    if (scritte > 0 || esiti.length > 0) registraAudit(db, 'audit-l7-361-date-ryuji', { migrazione: 'L7-07 · 361', scritte, esiti, date: SOLO_DATE.date });
    logger.info({ migrazione: 361, scritte, esiti }, 'date del messaggio di Ryuji per il Rango 7');
  },
};
