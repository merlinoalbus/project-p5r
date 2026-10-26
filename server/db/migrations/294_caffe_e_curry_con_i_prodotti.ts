// ============================================================
// Migrazione 294 — caffè e curry del Leblanc: esiti con il prodotto preparato (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Censimento F-bis, punto 10: preparare il caffè e il curry al Leblanc dà Doti (Fascino, Coraggio: già nelle attività `caffe-leblanc` e
// `curry-leblanc`) e un oggetto (Caffè del Leblanc, Caffè del maestro, Curry decente, Curry del Leblanc, Curry del maestro, o quelli della
// preparazione sbagliata), ma l'oggetto non entrava fra quelli ottenuti. Decisione 21 (precisazione): gli oggetti ricevuti sono rilevanti per
// l'app; il lotto G ha dato agli esiti gli oggetti per chiave con quantità.
//
// Che cosa fa: ciascuna delle due attività dichiara i suoi esiti, scelti alla spunta (un solo punto per i valori, come la 233):
//   - caffè: «Caffè del Leblanc» (dal rango 2 di Sojiro, la ricetta «Principi del caffè»), «Caffè del maestro» (rango 6, «Maestria del caffè»),
//     «Caffè acido» e «Caffè amaro» (preparazione sbagliata), ognuno con la Fascino ♪ che l'attività dava già e il suo caffè;
//   - curry: «Curry decente» (rango 4, la ricetta «Curry del Leblanc»), «Curry del Leblanc» (rango 9 e Richiesta «Lo zio ingordo», «Precetti del
//     curry»), «Curry del maestro» (rango 10, «Maestria del curry»), «Curry di fuoco», «Curry fiammante» e «Curry infernale» (preparazione
//     sbagliata), ognuno con il Coraggio ♪ che l'attività dava già e il suo curry.
// I ranghi non si copiano: ogni esito cita la ricetta del listino del Leblanc (`articolo` dell'esito, senza prezzo) e le condizioni sono
// quelle della ricetta. Gli effetti fissi e la frase delle Doti delle attività escono (li dicono gli esiti; la nota su Sojiro resta nei
// dettagli). Il caffè diventa un'attività contata a turni (prima non lo era: il turno è ciò che dà l'oggetto).
// Da verificare in gioco (la guida non lo dice): quante porzioni dà una preparazione (qui 1) e se una preparazione sbagliata dà la stessa Dote.
// Conservativa: solo se gli effetti sono ancora quelli attesi della guida e l'attività è della guida mai corretta. Idempotente. Audit in
// `dati_guida.audit-294-caffe-curry`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { leggiEsitiAttivita, type EsitiAttivita, type EsitoAttivita } from '../../../shared/esitiAttivita.js';
import { FONTE_OGGETTI, canonico, scriviAuditFbis, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-294-caffe-curry';
const errore = (motivo: string): never => { throw new Error(`294: ${motivo}; nessuna modifica applicata.`); };
const json = (s: string | null): string => { try { return canonico(JSON.parse(s ?? 'null')); } catch { return ''; } };

interface Prodotto { chiave: string; nome: string; oggetto: string; ricetta: string | null }
interface Piano { attivita: string; dote: 'fascino' | 'coraggio'; prodotti: Prodotto[]; effettiPrima: unknown; dotiPrima: unknown; traccia: 'svolta' }

const PIANI: readonly Piano[] = [
  { attivita: 'caffe-leblanc', dote: 'fascino', traccia: 'svolta',
    prodotti: [
      { chiave: 'caffe-del-leblanc', nome: 'Caffè del Leblanc', oggetto: 'consumabile/caffe-del-leblanc', ricetta: 'leblanc/principi-del-caffe' },
      { chiave: 'caffe-del-maestro', nome: 'Caffè del maestro', oggetto: 'consumabile/caffe-del-maestro', ricetta: 'leblanc/maestria-del-caffe' },
      { chiave: 'caffe-acido', nome: 'Caffè acido (preparazione sbagliata)', oggetto: 'consumabile/caffe-acido', ricetta: 'leblanc/principi-del-caffe' },
      { chiave: 'caffe-amaro', nome: 'Caffè amaro (preparazione sbagliata)', oggetto: 'consumabile/caffe-amaro', ricetta: 'leblanc/principi-del-caffe' },
    ],
    effettiPrima: [{ effetto: { famiglia: 'dote', dote: 'fascino', note: 1 }, condizioni: [{ tipo: 'confidente', confidente: 'sojiro', rango: 2 }] }],
    dotiPrima: [{ dote: 'fascino', note: null, condizione: 'Usare il sifone del caffè genera punti Fascino; preparare un caffè è inoltre necessario per avviare il Rango 3 del Confidente di Sojiro' }] },
  { attivita: 'curry-leblanc', dote: 'coraggio', traccia: 'svolta',
    prodotti: [
      { chiave: 'curry-decente', nome: 'Curry decente', oggetto: 'consumabile/curry-decente', ricetta: 'leblanc/curry-del-leblanc' },
      { chiave: 'curry-del-leblanc', nome: 'Curry del Leblanc', oggetto: 'consumabile/curry-del-leblanc', ricetta: 'leblanc/precetti-del-curry' },
      { chiave: 'curry-del-maestro', nome: 'Curry del maestro', oggetto: 'consumabile/curry-del-maestro', ricetta: 'leblanc/maestria-del-curry' },
      { chiave: 'curry-di-fuoco', nome: 'Curry di fuoco (preparazione sbagliata)', oggetto: 'consumabile/curry-di-fuoco', ricetta: null },
      { chiave: 'curry-fiammante', nome: 'Curry fiammante (preparazione sbagliata)', oggetto: 'consumabile/curry-fiammante', ricetta: null },
      { chiave: 'curry-infernale', nome: 'Curry infernale (preparazione sbagliata)', oggetto: 'consumabile/curry-infernale', ricetta: null },
    ],
    effettiPrima: [{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 1 }, condizioni: [] }, { effetto: { famiglia: 'dote', dote: 'coraggio', note: 1 }, ripetuto: true, condizioni: [] }],
    dotiPrima: [] },
];

export const migration294: Migration = {
  id: 294,
  name: 'caffe_e_curry_con_i_prodotti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'catalogo_oggetto', 'articolo']) if (!esisteTabella(db, t)) { logger.warn({ migrazione: 294, tabella: t }, 'tabella assente: niente da fare'); return; }
    if (!haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 294 }, 'esiti delle attività assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    for (const p of PIANI) {
      // ogni prodotto deve essere nel catalogo e ogni ricetta nel listino: altrimenti l'attività resta com'è (nessun esito a metà)
      const mancanti = p.prodotti.flatMap((x) => [
        ...(db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(x.oggetto) ? [] : [x.oggetto]),
        ...(x.ricetta && !db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(x.ricetta) ? [x.ricetta] : []),
      ]);
      if (mancanti.length) { esiti.push({ chiave: p.attivita, esito: `dati assenti (${mancanti.join(', ')}): non toccata` }); continue; }
      const dati: EsitiAttivita = { modo: 'scelta', esiti: p.prodotti.map((x): EsitoAttivita => ({ chiave: x.chiave, nome: x.nome, gruppo: null, articolo: x.ricetta, condizioni: [],
        doti: [{ dote: p.dote, note: 1 }], premi: null, oggetti: [{ oggetto: x.oggetto, quantita: 1 }] })) };
      const nuovo = JSON.stringify(dati);
      if (JSON.stringify(leggiEsitiAttivita(nuovo)) !== nuovo) errore(`gli esiti di ${p.attivita} non si rileggono validi`);
      const a = db.prepare('SELECT doti_json, effetti_json, esiti_json, origine, seed_json FROM main.attivita WHERE chiave = ?').get(p.attivita) as
        { doti_json: string; effetti_json: string | null; esiti_json: string | null; origine: string; seed_json: string | null } | undefined;
      if (!a) { esiti.push({ chiave: p.attivita, esito: 'attività assente' }); continue; }
      if (a.esiti_json !== null && canonico(leggiEsitiAttivita(a.esiti_json)) === canonico(dati)) { esiti.push({ chiave: p.attivita, esito: 'esiti già dichiarati' }); continue; }
      if (a.origine !== 'seed' || a.seed_json !== null || a.esiti_json !== null) { esiti.push({ chiave: p.attivita, esito: 'attività corretta dall’utente o con altri esiti: non toccata' }); continue; }
      if (json(a.effetti_json) !== canonico(p.effettiPrima) || json(a.doti_json) !== canonico(p.dotiPrima)) { esiti.push({ chiave: p.attivita, esito: 'effetti diversi da quelli attesi: non toccata' }); continue; }
      if (db.prepare("UPDATE main.attivita SET esiti_json = ?, effetti_json = '[]', doti_json = '[]', tracciamento = ?, updated_at = ? WHERE chiave = ? AND esiti_json IS NULL AND origine = 'seed' AND seed_json IS NULL")
        .run(nuovo, p.traccia, adesso, p.attivita).changes !== 1) errore(`gli esiti di ${p.attivita} non si scrivono`);
      esiti.push({ chiave: p.attivita, esito: `esiti dichiarati (${dati.esiti.length}), effetti fissi tolti, contata a turni` });
    }
    const conteggi = { attivita: esiti.filter((e) => e.esito.startsWith('esiti dichiarati')).length, nonToccate: esiti.filter((e) => /non toccata|assente/.test(e.esito)).length };
    if (conteggi.attivita) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 294, { fonti: [FONTE_OGGETTI], conteggi, esiti,
      daVerificareInGioco: ['quante porzioni dà una preparazione di caffè o di curry (qui 1)', 'se una preparazione sbagliata dà la stessa Dote'] }, conteggi.attivita > 0);
    logger.info({ migrazione: 294, ...conteggi }, 'Caffè e curry: esiti con il prodotto preparato');
  },
};
