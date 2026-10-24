// ============================================================
// 229 — la frase di sblocco della Big Bang Burger torna visibile come nota dell'attività (L11, rilievo F4; decisione dell'utente «Tieni la frase come nota»)
// ============================================================
//
// La 218 ha tolto `attivita.sblocco` e ha messo tutte le frasi in `dati_guida.archivio-frasi-l11` (colonna `attivita.sblocco`). Per la sfida Big Bang Burger
// la frase dice cose che la condizione strutturata (`coraggio`, `conoscenza` e `perizia` al rango 2) non dice: le tre sfide progressive e i ranghi 3 e 4 delle
// ultime due. L'utente ha deciso di tenerla come nota. Il campo di nota dell'attività che la pagina Attività mostra davvero è `attivita.dettagli`
// (`AttivitaDto.dettagli`, un paragrafo per volta separato da una riga vuota, come gli altri «Titolo: testo»): la frase, COPIATA ESATTA dall'archivio della 218,
// si aggiunge in coda come paragrafo «Sblocco (dalla guida): …». La condizione strutturata e il resto della riga non cambiano.
// Guardie: l'archivio ha la frase per `sfida-big-bang-burger` (testo non vuoto); l'attività c'è, non è stata corretta dall'utente (`origine = 'seed'`, senza
// `seed_json`) e `dettagli` non contiene già la frase (idempotente); impronta di tutte le altre colonne di `attivita` e delle tabelle vicine identica prima e dopo.
// Il testo di `dettagli` di prima è il testo di adesso meno il paragrafo aggiunto: il paragrafo è la sola differenza. Solo `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const CHIAVE = 'sfida-big-bang-burger';
const INTESTAZIONE = 'Sblocco (dalla guida): ';
const errore = (motivo: string): never => { throw new Error(`229: ${motivo}; nessuna modifica applicata.`); };

export const migration229: Migration = {
  id: 229, name: 'big_bang_burger_frase_di_sblocco_come_nota',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !esisteTabella(db, 'dati_guida') || !haColonna(db, 'attivita', 'dettagli')) return;
    const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO_FRASI) as string | undefined;
    if (!json) return;
    let frase: unknown;
    try { frase = (JSON.parse(json) as { colonne?: Record<string, Record<string, unknown>> }).colonne?.['attivita.sblocco']?.[CHIAVE]; } catch { return; }
    if (typeof frase !== 'string' || frase.trim() === '') return; // l'archivio non ha la frase: niente da rimettere
    const a = db.prepare('SELECT dettagli, origine, seed_json FROM main.attivita WHERE chiave = ?').get(CHIAVE) as { dettagli: string | null; origine: string; seed_json: string | null } | undefined;
    if (!a || a.dettagli === null || a.dettagli.trim() === '') return;
    if (a.dettagli.includes(frase)) return; // già rimessa
    if (a.origine !== 'seed' || a.seed_json !== null) return; // corretta dall'utente: la sua nota non si tocca

    const prima = new Map(['attivita', 'negozio', 'luogo', 'articolo'].filter((t) => esisteTabella(db, t))
      .map((t) => [t, improntaTabella(db, t, t === 'attivita' ? ['dettagli'] : [])]));
    const dopoTesto = `${a.dettagli}\n\n${INTESTAZIONE}${frase}`;
    const esito = db.prepare('UPDATE main.attivita SET dettagli = ? WHERE chiave = ? AND dettagli = ?').run(dopoTesto, CHIAVE, a.dettagli);
    if (esito.changes !== 1) errore('la nota non è stata scritta');
    for (const [t, imp] of prima) if (improntaTabella(db, t, t === 'attivita' ? ['dettagli'] : []) !== imp) errore(`la tabella ${t} è cambiata oltre alla nota`);
    logger.info({ migrazione: 'L11-229', attivita: CHIAVE }, 'Big Bang Burger: la frase di sblocco dell’archivio è la nota dell’attività');
  },
};
