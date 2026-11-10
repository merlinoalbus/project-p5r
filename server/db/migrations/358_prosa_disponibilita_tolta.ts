// ============================================================
// 358 — via la prosa della disponibilità dei Confidenti e il «dal» (L7-01, L7-06; risposta Q14 A)
// ============================================================
//
// `confidente_disponibilita` diceva ancora in prosa ciò che la struttura dice già: `giorni_json`, `fasce_json`, `luogo`, `sblocco_data`, `sblocco_requisiti` (la 307 le
// aveva svuotate dove la struttura coincideva; restavano Igor e Ryuji). Il «Disponibile dal» aveva due sedi: `dal` (solo Gemelle, 05-18) e il requisito di rango 1 di
// tipo «data» (18 Confidenti). Da qui la sede è una sola: i requisiti; le sei colonne escono.
//
// COSA, in quest'ordine:
//  (a) la prosa di Igor e Ryuji, frase per frase (tabella `PROSA`, guardia per identità: vale solo se il testo è quello atteso). Ciò che la guida conferma e che nessun
//      altro dato dice passa nella `note` come frase; il resto va solo in archivio, col motivo:
//      - igor, giorni: 12/4, 20/4, 5/5, 11/6, 22/8, 11/10, 24/12 sono i requisiti di data; 1/6 e 27/6 i giorni di riferimento dei due Palazzi (il requisito dice «dopo il
//        Palazzo», che è la regola); il 31 agosto, giorno consigliato del Rango 8, non è in nessun requisito e passa in nota;
//      - igor, fasce: il sogno nella Stanza di Velluto lo dicono `motivo_senza_luogo` e la nota del requisito di rango 1: archivio;
//      - ryuji, fasce: il giorno è la struttura; la sera del Rango 7 è `fascia-rango`; l'appostamento a Tsukishima non è in nessun dato e passa in nota; «e nei giorni di
//        pioggia» non ha riscontro nella guida (dice che è disponibile di giorno anche con la pioggia, mai la sera): solo archivio.
//  (b) il `dal`: se è uguale al requisito di rango 1 esce e basta; se è diverso, o il requisito non c'è, il valore va in archivio e nel verbale, e il requisito non si tocca.
//  (c) archivio in `dati_guida.archivio-frasi-l11` di ogni valore non vuoto delle sei colonne (righe archiviate = righe tolte), poi `ALTER TABLE … DROP COLUMN`.
//  (d) lo storico dell'editor (`confidente-disponibilita-editor-v1:<chiave>`): la riga di adesso ha ora i campi storici vuoti, e se questo la cambia (o cambia la nota) la
//      catena riceve la revisione «migrazione-358-<chiave>». Storico incoerente = la nota non cambia, la riga è detta nel verbale (il valore tolto è comunque in archivio).
// `server/db/fontiTolte.ts` riceve le sei voci.
//
// COSA NON CAMBIA: le altre colonne delle 23 righe (impronta prima e dopo, esclusa `note`), i requisiti di rango, le partite. Idempotente: senza le colonne non fa nulla.
// Verbale: `dati_guida.audit-l7-358-prosa-disponibilita`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';
import { aggiungiRevisione, CAMPI_FOTOGRAFIA, leggiStorico, notaConFrase, STORICI_VUOTI, type Fotografia } from './storicoDisponibilitaL7.js';

const errore = (motivo: string): never => { throw new Error(`358: ${motivo}; nessuna modifica applicata.`); };

const COLONNE_PROSA = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti'] as const;
type ColonnaProsa = typeof COLONNE_PROSA[number];
const MIGRAZIONE = 'L7-01/06 · 358';
const MOTIVO_REVISIONE = 'Migrazione 358: le colonne in prosa della disponibilità escono dalla tabella (la struttura e i requisiti di rango dicono giorni, fasce, luogo e sblocco); ciò che dicevano in più passa nelle note.';

/** Esito della prosa di una riga: il testo atteso, la frase da portare in nota (se c'è) e il perché di ogni parte. */
interface EsitoProsa { confidente: string; colonna: ColonnaProsa; atteso: string; frase?: string; motivo: string }

const PROSA: readonly EsitoProsa[] = [
  {
    confidente: 'igor', colonna: 'giorni_json',
    atteso: '["12 aprile","20 aprile","5 maggio","1 giugno","11 giugno","27 giugno","22 agosto","31 agosto","11 ottobre","24 dicembre"]',
    frase: 'La guida indica il 31 agosto come giorno consigliato per il Rango 8.',
    motivo: 'sette date sono requisiti di data; 1 e 27 giugno sono i giorni di riferimento dei Palazzi di Madarame e Kaneshiro (il requisito «dopo il Palazzo» è la regola); il 31 agosto (Rango 8) non è in nessun altro dato',
  },
  {
    confidente: 'igor', colonna: 'fasce_json',
    atteso: '["notte (durante il sonno, sogno nella Stanza di Velluto)"]',
    motivo: 'il sogno nella Stanza di Velluto è già in motivo_senza_luogo e nella nota del requisito di rango 1: solo archivio',
  },
  {
    confidente: 'ryuji', colonna: 'fasce_json',
    atteso: '["giorno (dopo scuola)","sera (solo rango 7, evento specifico a Tsukishima; e nei giorni di pioggia)"]',
    frase: 'L\'evento del Rango 7 è un appostamento a Tsukishima: parte dal messaggio che Ryuji manda la sera, in date precise.',
    motivo: 'giorno e sera del rango 7 sono già nella struttura; Tsukishima è confermata dalla guida e non è in nessun altro dato; «e nei giorni di pioggia» non ha riscontro nella guida (che dice disponibile di giorno anche con la pioggia): solo archivio',
  },
];

type RigaLetta = Record<string, string | null> & { confidente_chiave: string };

/** Il valore di una colonna che c'è ancora (`''` o `'[]'` se la colonna non c'è più: per esempio una tolta a metà). */
const valore = (r: RigaLetta, c: ColonnaProsa): string => r[c] ?? STORICI_VUOTI[c];
const vuoto = (v: string | null | undefined): boolean => v === null || v === undefined || v === '' || v === '[]';

/** La data del requisito di rango 1 di tipo «data», se c'è. */
function dataDelRango1(db: AppDatabase, chiave: string): string | null {
  const righe = db.prepare("SELECT dati_json FROM main.confidente_requisito WHERE confidente_chiave = ? AND rango = 1 AND tipo = 'data' ORDER BY indice").pluck().all(chiave) as string[];
  for (const j of righe) { try { const d = (JSON.parse(j) as { dal?: unknown }).dal; if (typeof d === 'string' && /^\d{2}-\d{2}$/.test(d)) return d; } catch { /* dati illeggibili: si passa al prossimo */ } }
  return null;
}

export const migration358: Migration = {
  id: 358,
  name: 'prosa_disponibilita_tolta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'confidente_disponibilita') || !esisteTabella(db, 'dati_guida') || !esisteTabella(db, 'confidente_requisito')) return;
    const daTogliere = [...COLONNE_PROSA, 'dal' as const].filter((c) => haColonna(db, 'confidente_disponibilita', c));
    if (daTogliere.length === 0) return;

    const impronteAltre = improntaTabella(db, 'confidente_disponibilita', [...daTogliere, 'note']);
    const improntaRequisiti = improntaTabella(db, 'confidente_requisito');
    const numeroRighe = db.prepare('SELECT COUNT(*) FROM main.confidente_disponibilita').pluck().get() as number;
    const righe = db.prepare(`SELECT confidente_chiave, note, note_generali, fonti_json${daTogliere.map((c) => `, "${c}"`).join('')} FROM main.confidente_disponibilita ORDER BY confidente_chiave`).all() as RigaLetta[];

    // (a) e (d): riga per riga, le frasi da portare in nota e la revisione dello storico
    const esiti: Array<{ chiave: string; colonna: string; esito: string; prima?: string }> = [];
    const noteCambiate: Array<{ chiave: string; dopo: string }> = [];
    const storici: Array<{ chiave: string; esito: string }> = [];
    const archivio: Record<string, Record<string, string>> = Object.fromEntries(daTogliere.map((c) => [`confidente_disponibilita.${c}`, {} as Record<string, string>]));
    const dalPrima: Array<{ chiave: string; dal: string; requisito: string | null; esito: string }> = [];

    for (const r of righe) {
      const chiave = r.confidente_chiave;
      const frasi: string[] = [];
      for (const c of COLONNE_PROSA) {
        const v = valore(r, c);
        if (vuoto(v)) continue;
        if (haColonna(db, 'confidente_disponibilita', c)) archivio[`confidente_disponibilita.${c}`]![chiave] = v;
        const e = PROSA.find((p) => p.confidente === chiave && p.colonna === c);
        if (!e) { esiti.push({ chiave, colonna: c, esito: 'fuori elenco: solo archivio', prima: v }); continue; }
        if (e.atteso !== v) { esiti.push({ chiave, colonna: c, esito: 'testo diverso da quello atteso: solo archivio', prima: v }); continue; }
        if (e.frase) frasi.push(e.frase);
        esiti.push({ chiave, colonna: c, esito: `${e.frase ? `in nota: «${e.frase}». ` : ''}${e.motivo}`, prima: v });
      }
      if (typeof r.dal === 'string' && r.dal !== '') {
        const requisito = dataDelRango1(db, chiave);
        archivio['confidente_disponibilita.dal']![chiave] = r.dal;
        const esito = requisito === r.dal ? 'uguale al requisito di rango 1: esce' : 'diverso dal requisito di rango 1 (o requisito assente): esce con il valore in archivio, il requisito non si tocca';
        dalPrima.push({ chiave, dal: r.dal, requisito, esito });
      }

      const note = r.note as string;
      const prima: Fotografia = { ...STORICI_VUOTI, note, note_generali: r.note_generali as string, fonti_json: r.fonti_json as string };
      for (const c of COLONNE_PROSA) prima[c] = valore(r, c);
      const notaNuova = frasi.reduce(notaConFrase, note);
      const dopo: Fotografia = { ...prima, ...STORICI_VUOTI, note: notaNuova };
      const cambia = CAMPI_FOTOGRAFIA.some((c) => prima[c] !== dopo[c]);
      const storico = cambia ? leggiStorico(db, chiave, prima) : { stato: 'assente' as const };
      if (storico.stato === 'incoerente') {
        storici.push({ chiave, esito: 'lo storico dell’editor non finisce sulla riga di adesso: la nota non cambia' });
        continue;
      }
      if (notaNuova !== note) {
        if (db.prepare('UPDATE main.confidente_disponibilita SET note = ? WHERE confidente_chiave = ? AND note = ?').run(notaNuova, chiave, note).changes !== 1) errore(`la nota di ${chiave} non si aggiorna`);
        noteCambiate.push({ chiave, dopo: notaNuova });
      }
      if (storico.stato === 'coerente') storici.push({ chiave, esito: `revisione ${aggiungiRevisione(db, chiave, storico.registro, 358, MOTIVO_REVISIONE, prima, dopo)} aggiunta` });
    }

    // (c) archivio, poi le colonne
    const archiviate: Record<string, number> = {};
    for (const [colonna, valori] of Object.entries(archivio)) {
      if (Object.keys(valori).length === 0) continue;
      archiviate[colonna] = archiviaSenzaSovrascrivere(db, MIGRAZIONE, colonna, valori);
      if (!Object.keys(valori).every((k) => k in righeArchiviate(db, colonna))) errore(`l’archivio di ${colonna} non ha tutte le righe`);
    }
    for (const c of daTogliere) {
      db.exec(`ALTER TABLE main.confidente_disponibilita DROP COLUMN "${c}"`);
      if (haColonna(db, 'confidente_disponibilita', c)) errore(`la colonna ${c} esiste ancora`);
    }

    // i controlli: cambia solo ciò che è dichiarato
    if ((db.prepare('SELECT COUNT(*) FROM main.confidente_disponibilita').pluck().get() as number) !== numeroRighe) errore('il numero delle righe è cambiato');
    if (improntaTabella(db, 'confidente_disponibilita', ['note']) !== impronteAltre) errore('le altre colonne sono cambiate');
    if (improntaTabella(db, 'confidente_requisito') !== improntaRequisiti) errore('i requisiti di rango sono cambiati');

    registraAudit(db, 'audit-l7-358-prosa-disponibilita', { migrazione: MIGRAZIONE, colonneTolte: daTogliere, esiti, noteCambiate, storici, dal: dalPrima, archiviate, righe: numeroRighe });
    const dalDiversi = dalPrima.filter((d) => d.requisito !== d.dal);
    if (dalDiversi.length > 0) logger.warn({ migrazione: 358, dalDiversi }, '«dal» diverso dal requisito di rango 1: il valore è nell’archivio, da ora vale il requisito');
    logger.info({ migrazione: 358, tolte: daTogliere.length, note: noteCambiate.map((n) => n.chiave), storici, dal: dalPrima }, 'disponibilità dei Confidenti: prosa e «dal» tolti');
  },
};
