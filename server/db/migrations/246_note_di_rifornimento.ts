// ============================================================
// Migrazione 246 — le note in prosa sul rifornimento lasciano il posto al dato strutturato; due note storiche (Ondata 5, Lotto B; decisione 21)
// ============================================================
//
// Progetto dell'ondata 5, decisione 2: «Le prose in `negozio.note` e `articolo.nota` si tolgono quando il dato è strutturato». Dopo la 243
// (regola e pezzi di ogni articolo) e la 244 (allerte del caldo dei distributori) la stessa informazione scritta a parole è un secondo punto
// che può divergere:
//   - `negozio.note`: si tolgono le sole frasi del rifornimento (37 Gradi Celsius, Akiba, Akindo, Body Chop, Chiesa di Kanda, Fioraio
//     Sukebe, Mran Mran, Tokobushiya), il resto della nota resta parola per parola; Tanaka: «Ordini consegnati dopo alcuni giorni, tempi non
//     confermati con precisione dalla guida italiana» è anche superata dalla guida (negozi speciali: tre giorni, un ordine alla volta, ora nella
//     regola); i distributori: la nota intera «Si rifornisce ogni lunedì; durante le ondate di calore resta vuoto.» è tutta nel dato;
//   - `articolo.nota`: Soma del Palazzo di Niijima, «un solo acquisto al giorno» contraddice l'elenco dei negozi (1 pezzo, nessun
//     rifornimento: pezzo unico, regola della 243) e si toglie; il resto («350 monete; anche in vendita da Jose nei Memento») resta, perché il
//     costo in monete vive ancora solo lì (lotto dei prezzi). Crostatina angelo: la nota «da rivedere» diventa una nota storica (sotto).
// Note storiche (decisione 21: «in caso di discordanza fra pagine della guida vale il listino dei negozi con nota storica»), come
// l'Homunculus (139), legate alle offerte:
//   - `crostatina-angelo-negozio-fonte`: l'elenco dei negozi la mette al Taisho Store, la pagina Oggetti alla Panetteria Yon-Germain;
//   - `akiba-materiali-rifornimento-fonte`: l'elenco dei negozi dà il rifornimento il giorno successivo, la pagina dei materiali «a settimana».
// Conservativa: ogni testo si cambia solo se contiene esattamente la frase attesa (idempotente: la seconda volta non c'è più); un testo
// diverso resta e l'audit lo dice. Nessuna voce del Diario e nessun dato delle partite cambia. Audit in `dati_guida.audit-246-note-rifornimento`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAudit } from './rifornimentoOndata5.js';

const AUDIT = 'audit-246-note-rifornimento';
const errore = (motivo: string): never => { throw new Error(`246: ${motivo}; nessuna modifica applicata.`); };

/** Le frasi da togliere da una nota: `togli` esattamente com'è, sostituita da `con`. */
interface Taglio { chiave: string; togli: string; con: string }
const TAGLI_NEGOZI: readonly Taglio[] = [
  { chiave: '37-gradi-celsius', togli: ' Rifornimento il primo del mese.', con: '' },
  { chiave: 'akiba', togli: ' Rifornimento periodico (2-3 unità, si rinnova il giorno successivo per i materiali).', con: '' },
  { chiave: 'akindo', togli: '; rifornimento di 1 unità per articolo, si rinnova il primo del mese successivo.', con: '.' },
  { chiave: 'body-chop', togli: '; rifornimento periodico (1 unità per articolo).', con: '.' },
  { chiave: 'chiesa-kanda', togli: '; tutti gli articoli sono disponibili la domenica con rifornimento la domenica successiva', con: '' },
  { chiave: 'fioraio-sukebe', togli: ' Rifornimento il primo del mese.', con: '' },
  { chiave: 'mran-mran', togli: ' Rifornimento di 1 unità, si rinnova il primo del mese successivo.', con: '' },
  { chiave: 'tokobushiya', togli: ' Rifornimento di 1 unità, rinnovo il primo del mese successivo.', con: '' },
  { chiave: 'tanaka-affari-loschi', togli: ' Ordini consegnati dopo alcuni giorni, tempi non confermati con precisione dalla guida italiana.', con: '' },
];
const NOTA_DISTRIBUTORI = 'Si rifornisce ogni lunedì; durante le ondate di calore resta vuoto.';
const TAGLI_ARTICOLI: readonly Taglio[] = [
  { chiave: 'negozio-palazzo-niijima/soma', togli: '350 monete, un solo acquisto al giorno; anche in vendita da Jose nei Memento', con: '350 monete; anche in vendita da Jose nei Memento' },
  { chiave: 'taisho-store/crostatina-angelo', togli: 'la guida colloca la Crostatina angelo alla Panetteria Yon-Germain (solo d\'inverno, 1 alla settimana): la condizione «solo in inverno» resta, l\'attribuzione al negozio è da rivedere', con: '' },
];

interface NotaStorica { chiave: string; testo: string; fonte: string; articoli: readonly string[] }
const NOTE_STORICHE: readonly NotaStorica[] = [
  { chiave: 'crostatina-angelo-negozio-fonte', fonte: 'Guida italiana: Elenco dei negozi (Taisho Store) e Oggetti (Crostatina angelo); decisione 21 dell’utente',
    testo: 'La guida si contraddice: l’elenco dei negozi mette la Crostatina angelo al Taisho Store (solo d’inverno, 1 pezzo, rifornimento il lunedì successivo), la pagina Oggetti alla Panetteria Yon-Germain (solo d’inverno, 1 alla settimana). Vale l’elenco dei negozi. È una nota sulla fonte: non cambia il listino.',
    articoli: ['taisho-store/crostatina-angelo'] },
  { chiave: 'akiba-materiali-rifornimento-fonte', fonte: 'Guida italiana: Elenco dei negozi (Negozio di elettronica Akiba) e pagina dei materiali; decisione 21 dell’utente',
    testo: 'La guida si contraddice: l’elenco dei negozi dà Sabbia ferrea e Lente condensante a 3 pezzi, Foglio d’alluminio e Fosforo rosso a 2, con il rifornimento il giorno successivo; la pagina dei materiali dice «3 a settimana» e «2 a settimana». Vale l’elenco dei negozi. È una nota sulla fonte: non cambia il listino.',
    articoli: ['akiba/sabbia-ferrea', 'akiba/lente-condensante', 'akiba/foglio-d-alluminio', 'akiba/fosforo-rosso'] },
];

/** Applica un taglio a una colonna di testo: la frase tolta, oppure perché il testo resta com'è. */
function taglia(db: AppDatabase, tabella: 'negozio' | 'articolo', colonna: 'note' | 'nota', t: Taglio): string {
  const r = db.prepare(`SELECT ${colonna} AS testo FROM main.${tabella} WHERE chiave = ?`).get(t.chiave) as { testo: string | null } | undefined;
  if (!r) return 'riga assente';
  if (r.testo === null || !r.testo.includes(t.togli)) return 'frase non presente: testo non toccato';
  const dopo = r.testo.replace(t.togli, t.con).trim();
  if (db.prepare(`UPDATE main.${tabella} SET ${colonna} = ? WHERE chiave = ? AND ${colonna} = ?`).run(dopo === '' ? null : dopo, t.chiave, r.testo).changes !== 1) errore(`${tabella} ${t.chiave} non si aggiorna`);
  return dopo === '' ? 'nota tolta (era tutta nel dato)' : `frase tolta: «${dopo}»`;
}

export const migration246: Migration = {
  id: 246,
  name: 'note_di_rifornimento',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'negozio') || !esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 246 }, 'negozi o articoli assenti: nessuna nota toccata'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Array<{ riga: string; esito: string }> = [];
    for (const t of TAGLI_NEGOZI) esiti.push({ riga: `negozio ${t.chiave}`, esito: taglia(db, 'negozio', 'note', t) });
    const distributori = db.prepare("SELECT chiave, note FROM main.negozio WHERE tipo = 'distributore' ORDER BY chiave").all() as Array<{ chiave: string; note: string | null }>;
    for (const d of distributori) {
      if (d.note === NOTA_DISTRIBUTORI) {
        if (db.prepare('UPDATE main.negozio SET note = NULL WHERE chiave = ? AND note = ?').run(d.chiave, NOTA_DISTRIBUTORI).changes !== 1) errore(`negozio ${d.chiave} non si aggiorna`);
        esiti.push({ riga: `negozio ${d.chiave}`, esito: 'nota tolta (rifornimento e allerte del caldo sono nel dato)' });
      } else esiti.push({ riga: `negozio ${d.chiave}`, esito: d.note === null ? 'nessuna nota' : 'nota diversa: non toccata' });
    }
    for (const t of TAGLI_ARTICOLI) esiti.push({ riga: `articolo ${t.chiave}`, esito: taglia(db, 'articolo', 'nota', t) });
    // le note storiche, con i legami alle offerte che ci sono
    const conNote = esisteTabella(db, 'nota_storica') && esisteTabella(db, 'nota_storica_legame');
    let legami = 0;
    for (const n of NOTE_STORICHE) {
      if (!conNote) { esiti.push({ riga: `nota storica ${n.chiave}`, esito: 'tabelle delle note storiche assenti' }); continue; }
      const nuova = db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(n.chiave, n.testo, n.fonte, JSON.stringify({ versione: 1, testo: n.testo, fonte: n.fonte }), new Date().toISOString()).changes;
      for (const a of n.articoli) {
        if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(a)) { esiti.push({ riga: `nota storica ${n.chiave}`, esito: `offerta ${a} assente: nessun legame` }); continue; }
        legami += db.prepare("INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, 'articolo', ?)").run(n.chiave, a).changes;
      }
      esiti.push({ riga: `nota storica ${n.chiave}`, esito: nuova ? 'creata' : 'già presente' });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    scriviAudit(db, AUDIT, 246, { conteggi: { righe: esiti.length, legamiNuovi: legami }, esiti });
    logger.info({ migrazione: 246, righe: esiti.length, legami }, 'Negozi: note del rifornimento nel dato strutturato');
  },
};
