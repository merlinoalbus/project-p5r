// ============================================================
// 187 — copie di chiavi, tag e condizioni tolte dal modello (L11 · B12, R11-02/10)
// ============================================================
//
// Escono tre colonne senza lettori (prova con grep per nome sul codice di oggi, vedi la scheda B12 §3.2):
//   - `luogo.negozio`: copia esatta della chiave del negozio che ha la sede nel luogo (`negozio.sede_chiave`). Si archiviano SOLO i luoghi in cui
//     non è così (sulla copia reale: 42 su 42 coincidono, quindi 0 da archiviare);
//   - `luogo.attivita_json`: tag liberi («acquisto armi», «lavoro part-time») che non sono le attività della sede (`attivita.sede_chiave`):
//     si archiviano TUTTE le righe con un valore;
//   - `articolo.condizione`: la frase dell'offerta; la condizione strutturata (`condizioni_json`) è la fonte, ma l'equivalenza riga per riga
//     delle frasi non è provata (le generò la 070/126 con regole di testo): si archiviano TUTTE le frasi (106 sulla copia reale).
// NON esce `articolo.disponibile_dal`: il visore delle mappe (`VisoreMappa`, riga della merce) la mostra ancora, e portarlo sul dato strutturato
// cambierebbe il testo di 136 offerte su 650 (offerte con una data strutturata e nessuna frase, doppie condizioni, «primo giugno» contro «1 giugno»):
// l'equivalenza non è provabile, si lascia alla decisione dell'utente.
// NON esce la famiglia `nome_it` (libro, film, articolo): vedi la scheda B12 §3.3 passo C.
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve una voce per ogni colonna tolta; il cestino ha 3 righe con `articolo.condizione`, che
// con la voce tornano senza la frase invece di dare 409. Idempotente (ogni colonna si toglie solo se c'è), senza modifiche parziali: le impronte
// delle colonne rimaste e delle tabelle intatte si controllano dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';

const COLONNE = [['luogo', 'negozio'], ['luogo', 'attivita_json'], ['articolo', 'condizione']] as const;
const TOCCATE = ['luogo', 'articolo'] as const;
/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['negozio', 'quartiere', 'attivita', 'spillo', 'cestino', 'voce_giornata', 'confidente_disponibilita'] as const;
const errore = (motivo: string): never => { throw new Error(`187: ${motivo}; nessuna modifica applicata.`); };

export const migration187: Migration = {
  id: 187, name: 'copie_di_nomi_e_condizioni_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const daTogliere = COLONNE.filter(([t, c]) => esisteTabella(db, t) && haColonna(db, t, c));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const togliendo = (t: string) => daTogliere.filter(([tt]) => tt === t).map(([, c]) => c as string);

    const prima = new Map<string, string>();
    for (const t of TOCCATE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t, togliendo(t)));
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const colonne: Record<string, RigheArchiviate> = {};
    const prove: Record<string, unknown> = {};
    if (haColonna(db, 'luogo', 'negozio')) {
      // la chiave del negozio è copia esatta se esiste un negozio con quella chiave la cui sede è proprio questo luogo
      const conValore = righeConValore(db, 'luogo', 'negozio');
      const nonCoperti: RigheArchiviate = {};
      if (esisteTabella(db, 'negozio') && haColonna(db, 'negozio', 'sede_chiave')) {
        const sede = db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ? AND sede_chiave = ?');
        for (const [luogo, negozio] of Object.entries(conValore)) if (!sede.get(negozio, luogo)) nonCoperti[luogo] = negozio;
      } else Object.assign(nonCoperti, conValore);
      colonne['luogo.negozio'] = nonCoperti;
      prove['luogo.negozio'] = { conValore: Object.keys(conValore).length, copieEsatteDiNegozioSedeChiave: Object.keys(conValore).length - Object.keys(nonCoperti).length, archiviate: Object.keys(nonCoperti).length };
    }
    if (haColonna(db, 'luogo', 'attivita_json')) colonne['luogo.attivita_json'] = righeConValore(db, 'luogo', 'attivita_json', ['', '[]']);
    if (haColonna(db, 'articolo', 'condizione')) colonne['articolo.condizione'] = righeConValore(db, 'articolo', 'condizione');
    const attesi: Record<string, number> = {};
    for (const [k, v] of Object.entries(colonne)) attesi[k] = Object.keys(v).length;
    archiviaFrasi(db, 'L11-B12 · 187', colonne, prove);

    for (const [t, c] of daTogliere) db.exec(`ALTER TABLE main.${t} DROP COLUMN "${c}"`);

    for (const [k, n] of Object.entries(attesi)) if (archiviate(db, k) !== n) errore(`l'archivio di ${k} non ha ${n} righe`);
    for (const [t, c] of daTogliere) if (haColonna(db, t, c)) errore(`la colonna ${t}.${c} esiste ancora`);
    for (const t of TOCCATE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`le colonne rimaste di ${t} sono cambiate`);
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B12-187', tolte: daTogliere.map(([t, c]) => `${t}.${c}`), archiviate: attesi, prove }, 'copie di chiavi, tag e condizioni tolte dal modello');
  },
};
