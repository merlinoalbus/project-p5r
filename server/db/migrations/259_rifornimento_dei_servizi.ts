// ============================================================
// Migrazione 259 — la regola di rifornimento dei servizi e del distributore dello Shujin (chiusura dell'ondata 5)
// ============================================================
//
// Revisione finale UX dell'ondata 5, rilievo R1: Partita a freccette e Partita a biliardo (Penguin Sniper) e Meditazione (Tempio di
// Kichijoji) non avevano una regola di rifornimento (la 243 li lasciava apposta senza, `NEGOZI_SENZA_REGOLA`), e l'interfaccia li trattava come
// pezzi unici: una volta segnati restavano barrati per sempre e contati fra gli «acquistati». Il progetto dell'ondata 5, §9: «barra la riga
// solo per l'articolo "mai" … Nessuna etichetta per i fallback né per i servizi». Un servizio si paga ogni volta che lo si usa: riceve la
// regola dell'utente (`fallback-utente`: ciclo di un giorno, nessun limite di pezzi), che l'interfaccia non etichetta e che si rivede dal modulo
// dell'articolo. Il codice barra ora solo la regola «mai» (`shared/rifornimento.ePezzoUnico`).
//
// Nello stesso giro, i tre articoli del distributore dello Shujin `distributore-shujin-cancello-1` (negozio nascosto, articoli visibili) non
// avevano la regola dei distributori che hanno tutti gli altri (la 243 vedeva solo i negozi visibili): ricevono la stessa, due pezzi rinnovati
// il lunedì, da verificare in gioco (decisione 21, raccomandazione 9), come i gemelli di `distributore-shujin-edificio`.
//
// Il numero 259 era libero nel blocco del lotto D (255-259): la revisione finale chiedeva di riempire i buchi del registro. Conservativa: solo
// articoli ancora senza regola (`rifornimento_json` NULL) e senza quantità; una regola già scritta (anche dall'utente) non si tocca. Nessuna voce
// del Diario e nessun dato delle partite cambia. Idempotente. Audit in `dati_guida.audit-259-rifornimento-dei-servizi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { DISTRIBUTORE, FALLBACK_UTENTE, type RegolaArticolo } from './rifornimentoOndata5.js';
import { improntaDiario, scriviAuditChiusura } from './chiusuraOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-259-rifornimento-dei-servizi';

/** L'elenco scritto: articolo → regola, con il motivo. */
const REGOLE: ReadonlyArray<{ articolo: string; regola: RegolaArticolo; motivo: string }> = [
  { articolo: 'penguin-sniper/partita-a-freccette', regola: FALLBACK_UTENTE, motivo: 'servizio: si paga a ogni partita' },
  { articolo: 'penguin-sniper/partita-a-biliardo', regola: FALLBACK_UTENTE, motivo: 'servizio: si gioca a ogni visita' },
  { articolo: 'tempio-kichijoji/meditazione', regola: FALLBACK_UTENTE, motivo: 'servizio: si medita a ogni visita' },
  { articolo: 'distributore-shujin-cancello-1/second-maid', regola: DISTRIBUTORE, motivo: 'distributore: la regola di tutti i distributori (243)' },
  { articolo: 'distributore-shujin-cancello-1/manta', regola: DISTRIBUTORE, motivo: 'distributore: la regola di tutti i distributori (243)' },
  { articolo: 'distributore-shujin-cancello-1/earl-green', regola: DISTRIBUTORE, motivo: 'distributore: la regola di tutti i distributori (243)' },
];

export const migration259: Migration = {
  id: 259,
  name: 'rifornimento_dei_servizi',
  up(db) {
    if (!db.inTransaction) throw new Error('259: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'articolo') || !haColonna(db, 'articolo', 'rifornimento_json')) { logger.warn({ migrazione: 259 }, 'colonna del rifornimento assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Array<{ articolo: string; esito: string; regola?: unknown; motivo: string }> = [];
    let scritte = 0;
    for (const r of REGOLE) {
      const a = db.prepare('SELECT rifornimento_json, quantita FROM main.articolo WHERE chiave = ?').get(r.articolo) as { rifornimento_json: string | null; quantita: number | null } | undefined;
      if (!a) { esiti.push({ articolo: r.articolo, esito: 'articolo assente', motivo: r.motivo }); continue; }
      if (a.rifornimento_json === JSON.stringify(r.regola.r) && a.quantita === r.regola.q) { esiti.push({ articolo: r.articolo, esito: 'già con la regola', motivo: r.motivo }); continue; }
      if (a.rifornimento_json !== null || a.quantita !== null) { esiti.push({ articolo: r.articolo, esito: `regola o quantità già scritte (${a.rifornimento_json}, ${a.quantita}): non toccate`, motivo: r.motivo }); continue; }
      if (db.prepare('UPDATE main.articolo SET rifornimento_json = ?, quantita = ? WHERE chiave = ? AND rifornimento_json IS NULL AND quantita IS NULL')
        .run(JSON.stringify(r.regola.r), r.regola.q, r.articolo).changes !== 1) throw new Error(`259: l'articolo ${r.articolo} non si aggiorna; nessuna modifica applicata.`);
      scritte++;
      esiti.push({ articolo: r.articolo, esito: 'regola scritta', regola: { quantita: r.regola.q, ...r.regola.r }, motivo: r.motivo });
    }
    if (improntaDiario(db) !== diarioPrima) throw new Error('259: le voci del Diario sono cambiate; nessuna modifica applicata.');
    if (scritte) invalidaCacheDiGioco();
    const senzaRegola = db.prepare('SELECT chiave FROM main.articolo WHERE nascosto = 0 AND rifornimento_json IS NULL ORDER BY chiave').pluck().all();
    scriviAuditChiusura(db, AUDIT, 259, { conteggi: { scritte, visibiliSenzaRegola: senzaRegola.length }, visibiliSenzaRegola: senzaRegola, esiti }, scritte);
    logger.info({ migrazione: 259, scritte, visibiliSenzaRegola: senzaRegola.length }, 'Rifornimento: servizi con la regola dell’utente, distributore dello Shujin');
  },
};
