// ============================================================
// Migrazione 304 — l'Aojiru si compra al «Chiosco delle bevande» del Sottopasso, la domenica di giorno e di sera (segnalazione dell'utente)
// ============================================================
//
// Segnalazione dell'utente del 2026-10-29 («8 maggio», con lo screenshot): spuntando la voce del 05-08 «Shibuya. Sottopasso. Chiosco delle
// bevande. Compra e bevi Aojiru - Disgustoso.» con la partita al 05-08 di sera compare «L'offerta non risulta disponibile nel momento
// corrente» (`acquistiService.preparaRegistrazione`, `articolo-non-disponibile`). Causa: l'offerta dell'Aojiru (`chiosco-kiyasuku/succo-aojiru`)
// stava nel negozio «Chiosco della stazione KiyasuKu», la cui sede (`shibuya/kiyasuku`) è aperta solo di giorno: di sera l'offerta risultava
// chiusa. Il KiyasuKu non vende l'Aojiru: la guida italiana elenca al KiyasuKu solo Lenzuolo rinfrescante, Scaldamani, Gomma non statica e
// Wafer dei ladri [N], e compra l'Aojiru «dal chiosco delle bevande» del Sottopasso [S4]; lo fa la domenica sia di giorno (1° maggio, prima del
// cinema e dello studio serale [S4]) sia di sera (17 luglio, dopo il ritorno a casa «in serata» [S14]).
//
// Che cosa fa (un dato in un solo punto: i giorni e le fasce stanno negli orari della sede, che il negozio e l'offerta ereditano):
//   (1) il luogo del Sottopasso nato dal pin (`shibuya/u-chiosco-dei-succhi-del-sottopasso`, orari «solo domenica») prende il nome della guida e
//       delle voci, «Chiosco delle bevande», e la nota degli orari dice da dove vengono (domenica, di giorno e di sera, per la guida); solo se
//       nome e orari sono ancora esattamente quelli nati dal pin; i valori di prima restano nell'audit;
//   (2) il negozio «Chiosco delle bevande» (`chiosco-bevande-sottopasso`) con quella sede; senza la sede (istanza che non la ha) nasce con il
//       quartiere e con orari propri uguali (domenica, giorno e sera). Se la sede ha già un altro negozio non se ne crea uno nuovo;
//   (3) l'offerta dell'Aojiru passa nel negozio nuovo **con la stessa chiave**: effetti «acquisto» delle voci, consumazioni registrate, ricevute,
//       proposte e costanti (`shared/acquisti.ts`) la citano per chiave e restano valide; le ricevute già registrate conservano il negozio del
//       momento in cui sono state scritte (non si toccano). Sua condizione «solo domenica» tolta, solo se è esattamente quella e il negozio nuovo
//       la porta già dagli orari: la eredita;
//   (4) le voci del Diario con l'acquisto dell'Aojiru collegate al negozio KiyasuKu (`riferimento_tipo = 'negozio'`) si collegano al negozio
//       nuovo; gli altri collegamenti (Dote, nessuno) restano;
//   (5) la nota del KiyasuKu perde la frase sul chiosco bevande (ora è un negozio a sé), solo se la frase c'è esattamente una volta e la riga
//       non è stata corretta dall'utente.
// Le partite non si toccano. Idempotente: la seconda volta non trova niente da fare. Audit in `dati_guida.audit-304-chiosco-delle-bevande`.
//
// Fonti (guida italiana): [N] https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/ (Sottopasso, KiyasuKu);
// [S4] https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-4/ (1 e 8 maggio);
// [S14] https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-14/ (17 luglio).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-304-chiosco-delle-bevande';
const RICHIESTA = '2026-10-29: «8 maggio» (screenshot: spunta della voce Aojiru del 05-08 di sera, «L’offerta non risulta disponibile nel momento corrente»)';
const FONTE_NEGOZI = 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/';
const FONTE_SETTIMANA_4 = 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-4/';
const FONTE_SETTIMANA_14 = 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-14/';
const errore = (motivo: string): never => { throw new Error(`304: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string; prima?: unknown };

const ARTICOLO = 'chiosco-kiyasuku/succo-aojiru';
const KIYASUKU = 'chiosco-kiyasuku';
const NEGOZIO = { chiave: 'chiosco-bevande-sottopasso', nome: 'Chiosco delle bevande', luogo: 'Shibuya, Sottopasso', quartiere: 'shibuya', tipo: 'oggetti' } as const;
const SEDE = 'shibuya/u-chiosco-dei-succhi-del-sottopasso';
const NOME_SEDE_PRIMA = 'Chiosco dei succhi del Sottopasso';

/** Orari scritti come li scrive l'app (stesso ordine delle chiavi di `leggiOrari`). */
const orari = (nota: string | null) => JSON.stringify({ giorni: ['domenica'], fasce: [], chiusoConPioggia: false, nota });
const ORARI_SEDE_PRIMA = orari('Domenica attestata; fasce e meteo non indicati: per questi aspetti vale la regola dell’app.');
const NOTA_ORARI = 'Solo la domenica, di giorno e di sera: la guida lo visita il 1° maggio di giorno e il 17 luglio di sera; il meteo non è indicato.';
const ORARI_SEDE_DOPO = orari(NOTA_ORARI);
const SOLO_DOMENICA = JSON.stringify([{ tipo: 'giorno-settimana', giorni: ['domenica'] }]);
const FRASE_KIYASUKU = '; la domenica sera nella stessa area del sottopasso opera anche un chiosco bevande con il succo Aojiru';

/** Il testo JSON rimesso in forma canonica; null se non si legge. */
function canonica(testo: string | null): string | null {
  if (testo === null) return null;
  try { return JSON.stringify(JSON.parse(testo)); } catch { return null; }
}

/** Le occorrenze di `ago` in `testo`. */
function occorrenze(testo: string, ago: string): number {
  let n = 0;
  for (let i = testo.indexOf(ago); i >= 0; i = testo.indexOf(ago, i + ago.length)) n++;
  return n;
}

/** I giorni degli orari (JSON) di un luogo o di un negozio; null se non si leggono. */
function giorniDegliOrari(testo: string | null): string[] | null {
  if (testo === null) return null;
  try { const o = JSON.parse(testo) as { giorni?: unknown }; return Array.isArray(o.giorni) ? o.giorni.filter((g): g is string => typeof g === 'string') : null; } catch { return null; }
}

/** (1) Il luogo del chiosco: nome della guida e nota degli orari, solo se sono ancora quelli nati dal pin. */
function sede(db: AppDatabase, adesso: string): Esito {
  const l = db.prepare('SELECT nome, orari_json FROM main.luogo WHERE chiave = ?').get(SEDE) as { nome: string; orari_json: string | null } | undefined;
  if (!l) return { chiave: `luogo:${SEDE}`, esito: 'luogo assente' };
  const parti: string[] = [];
  const prima: Record<string, unknown> = {};
  if (l.nome === NEGOZIO.nome) parti.push('nome già della guida');
  else if (l.nome !== NOME_SEDE_PRIMA) parti.push('nome diverso da quello nato dal pin: non toccato');
  else {
    if (db.prepare('UPDATE main.luogo SET nome = ?, updated_at = ? WHERE chiave = ? AND nome = ?').run(NEGOZIO.nome, adesso, SEDE, NOME_SEDE_PRIMA).changes !== 1) errore('il nome del luogo del chiosco non si aggiorna');
    prima.nome = l.nome; parti.push(`rinominato «${NEGOZIO.nome}»`);
  }
  const o = canonica(l.orari_json);
  if (o === ORARI_SEDE_DOPO) parti.push('orari già con la nota della guida');
  else if (o !== ORARI_SEDE_PRIMA) parti.push('orari diversi da quelli nati dal pin: non toccati');
  else {
    if (db.prepare('UPDATE main.luogo SET orari_json = ?, updated_at = ? WHERE chiave = ? AND orari_json = ?').run(ORARI_SEDE_DOPO, adesso, SEDE, l.orari_json).changes !== 1) errore('gli orari del luogo del chiosco non si aggiornano');
    prima.orari_json = l.orari_json; parti.push('nota degli orari dalla guida');
  }
  return { chiave: `luogo:${SEDE}`, esito: parti.join('; '), ...(Object.keys(prima).length ? { prima } : {}) };
}

/** (2) Il negozio del chiosco, nella sede se c'è (e se non ha già un altro negozio). */
function negozio(db: AppDatabase, adesso: string): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.negozio WHERE chiave = ?').get(NEGOZIO.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: NEGOZIO.chiave, esito: gia.nascosto ? 'negozio già presente ma nascosto' : 'negozio già presente' };
  const conSede = !!db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(SEDE);
  if (conSede) {
    const altro = db.prepare('SELECT chiave FROM main.negozio WHERE sede_chiave = ?').pluck().get(SEDE) as string | undefined;
    if (altro) return { chiave: NEGOZIO.chiave, esito: `la sede ha già il negozio ${altro}: nessun negozio nuovo` };
  }
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.negozio').pluck().get() as number;
  // con la sede gli orari sono quelli del luogo (`orariDelNegozio`): il negozio non ne porta una copia; senza, i suoi (uguali)
  db.prepare(`INSERT INTO main.negozio (chiave, ordine, nome, luogo, luogo_chiave, tipo, gestore, confidente_chiave, note, fonte, origine, nascosto, updated_at,
      condizioni_json, orari_json, sede_chiave)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'seed', 0, ?, '[]', ?, ?)`)
    .run(NEGOZIO.chiave, ordine, NEGOZIO.nome, NEGOZIO.luogo, NEGOZIO.quartiere, NEGOZIO.tipo, `${FONTE_SETTIMANA_4} ; ${FONTE_SETTIMANA_14}`, adesso,
      conSede ? null : ORARI_SEDE_DOPO, conSede ? SEDE : null);
  return { chiave: NEGOZIO.chiave, esito: `creato (ordine ${ordine}, ${conSede ? `sede ${SEDE}` : 'sede assente: orari propri, solo il quartiere'})` };
}

/** I giorni in cui il negozio nuovo è aperto: dagli orari della sede se ne ha una, altrimenti dai suoi (l'eccezione d'orario prevale). */
function giorniDelNegozio(db: AppDatabase): string[] | null {
  const n = db.prepare('SELECT n.orari_json, n.sede_chiave, n.eccezione_orari_json, l.orari_json AS sede_orari FROM main.negozio n LEFT JOIN main.luogo l ON l.chiave = n.sede_chiave WHERE n.chiave = ?')
    .get(NEGOZIO.chiave) as { orari_json: string | null; sede_chiave: string | null; eccezione_orari_json: string | null; sede_orari: string | null } | undefined;
  if (!n) return null;
  if (n.eccezione_orari_json) return giorniDegliOrari(n.eccezione_orari_json);
  return giorniDegliOrari(n.sede_chiave ? n.sede_orari : n.orari_json);
}

/** (3) L'offerta dell'Aojiru nel negozio nuovo, con la stessa chiave; la sua «solo domenica» tolta se il negozio la porta già. */
function offerta(db: AppDatabase, adesso: string): Esito[] {
  const a = db.prepare('SELECT negozio_chiave, condizioni_json, seed_json FROM main.articolo WHERE chiave = ?').get(ARTICOLO) as { negozio_chiave: string; condizioni_json: string | null; seed_json: string | null } | undefined;
  if (!a) return [{ chiave: ARTICOLO, esito: 'offerta assente' }];
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO.chiave)) return [{ chiave: ARTICOLO, esito: 'negozio nuovo assente: offerta non spostata' }];
  const esiti: Esito[] = [];
  if (a.negozio_chiave === NEGOZIO.chiave) esiti.push({ chiave: ARTICOLO, esito: 'già nel Chiosco delle bevande' });
  else if (a.negozio_chiave !== KIYASUKU) esiti.push({ chiave: ARTICOLO, esito: `in un altro negozio (${a.negozio_chiave}): non spostata` });
  else {
    const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(NEGOZIO.chiave) as number;
    if (db.prepare('UPDATE main.articolo SET negozio_chiave = ?, ordine = ?, updated_at = ? WHERE chiave = ? AND negozio_chiave = ?').run(NEGOZIO.chiave, ordine, adesso, ARTICOLO, KIYASUKU).changes !== 1) errore('l’offerta dell’Aojiru non si sposta');
    esiti.push({ chiave: ARTICOLO, esito: `spostata nel Chiosco delle bevande (ordine ${ordine})`, prima: { negozio_chiave: KIYASUKU } });
  }
  const spostata = (db.prepare('SELECT negozio_chiave FROM main.articolo WHERE chiave = ?').pluck().get(ARTICOLO) as string) === NEGOZIO.chiave;
  const giorni = giorniDelNegozio(db) ?? [];
  const c = canonica(a.condizioni_json);
  const condizione = `condizioni:${ARTICOLO}`;
  if (c === '[]') esiti.push({ chiave: condizione, esito: 'già senza condizioni proprie' });
  else if (c !== SOLO_DOMENICA) esiti.push({ chiave: condizione, esito: 'diverse da «solo domenica»: lasciate' });
  else if (!spostata) esiti.push({ chiave: condizione, esito: 'offerta non nel negozio nuovo: lasciate' });
  else if (a.seed_json !== null) esiti.push({ chiave: condizione, esito: 'offerta corretta dall’utente: lasciate' });
  else if (giorni.length !== 1 || giorni[0] !== 'domenica') esiti.push({ chiave: condizione, esito: 'il negozio non è aperto solo la domenica: lasciate' });
  else {
    if (db.prepare("UPDATE main.articolo SET condizioni_json = '[]', updated_at = ? WHERE chiave = ? AND condizioni_json = ?").run(adesso, ARTICOLO, a.condizioni_json).changes !== 1) errore('la condizione dell’offerta non si toglie');
    esiti.push({ chiave: condizione, esito: 'tolta «solo domenica»: la eredita dagli orari del negozio', prima: a.condizioni_json });
  }
  return esiti;
}

/** (4) Le voci dell'Aojiru collegate al KiyasuKu: si collegano al negozio nuovo. */
function voci(db: AppDatabase, adesso: string): Esito[] {
  if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'voce_effetto')) return [];
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO.chiave)) return [];
  const righe = db.prepare(`SELECT v.uid, v.data FROM main.voce_giornata v WHERE v.riferimento_tipo = 'negozio' AND v.riferimento_chiave = ?
      AND EXISTS (SELECT 1 FROM main.voce_effetto e WHERE e.voce_uid = v.uid AND e.tipo = 'acquisto' AND e.chiave = ?) ORDER BY v.data, v.uid`)
    .all(KIYASUKU, ARTICOLO) as Array<{ uid: string; data: string }>;
  const conData = haColonna(db, 'voce_giornata', 'updated_at');
  return righe.map((r) => {
    const fatto = conData
      ? db.prepare(`UPDATE main.voce_giornata SET riferimento_chiave = ?, updated_at = ? WHERE uid = ? AND riferimento_tipo = 'negozio' AND riferimento_chiave = ?`).run(NEGOZIO.chiave, adesso, r.uid, KIYASUKU).changes
      : db.prepare(`UPDATE main.voce_giornata SET riferimento_chiave = ? WHERE uid = ? AND riferimento_tipo = 'negozio' AND riferimento_chiave = ?`).run(NEGOZIO.chiave, r.uid, KIYASUKU).changes;
    if (fatto !== 1) errore(`il collegamento della voce ${r.uid} non si aggiorna`);
    return { chiave: `voce:${r.uid}`, esito: `${r.data}: collegata al Chiosco delle bevande`, prima: { riferimento_chiave: KIYASUKU } };
  });
}

/** (5) La nota del KiyasuKu senza la frase sul chiosco bevande. */
function notaKiyasuku(db: AppDatabase, adesso: string): Esito {
  const n = db.prepare('SELECT note, seed_json FROM main.negozio WHERE chiave = ?').get(KIYASUKU) as { note: string | null; seed_json: string | null } | undefined;
  if (!n) return { chiave: `nota:${KIYASUKU}`, esito: 'negozio assente' };
  if (n.note === null) return { chiave: `nota:${KIYASUKU}`, esito: 'senza nota' };
  const volte = occorrenze(n.note, FRASE_KIYASUKU);
  if (volte === 0) return { chiave: `nota:${KIYASUKU}`, esito: 'frase già assente' };
  if (volte > 1) return { chiave: `nota:${KIYASUKU}`, esito: `frase presente ${volte} volte: lasciata` };
  if (n.seed_json !== null) return { chiave: `nota:${KIYASUKU}`, esito: 'negozio corretto dall’utente: lasciata' };
  const dopo = n.note.replace(FRASE_KIYASUKU, '');
  if (db.prepare('UPDATE main.negozio SET note = ?, updated_at = ? WHERE chiave = ? AND note = ?').run(dopo, adesso, KIYASUKU, n.note).changes !== 1) errore('la nota del KiyasuKu non si aggiorna');
  return { chiave: `nota:${KIYASUKU}`, esito: 'tolta la frase sul chiosco bevande', prima: n.note };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 304, richiesta: RICHIESTA, fonti: [FONTE_NEGOZI, FONTE_SETTIMANA_4, FONTE_SETTIMANA_14],
      regola: 'luogo del chiosco: nome e nota degli orari solo se ancora quelli nati dal pin; negozio nuovo nella sede (se libera); offerta spostata con la stessa chiave solo dal KiyasuKu, la sua «solo domenica» tolta solo se esatta, mai corretta e portata dal negozio; voci dell’Aojiru collegate al KiyasuKu al negozio nuovo; nota del KiyasuKu solo con la frase esatta una volta e senza correzione dell’utente',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration304: Migration = {
  id: 304,
  name: 'chiosco_delle_bevande',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['negozio', 'articolo', 'luogo']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 304, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'negozio', 'sede_chiave') || !haColonna(db, 'negozio', 'orari_json') || !haColonna(db, 'luogo', 'orari_json')) {
      logger.warn({ migrazione: 304 }, 'colonne di sedi e orari assenti: niente da fare'); return;
    }
    if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(ARTICOLO)) { logger.warn({ migrazione: 304 }, 'offerta dell’Aojiru assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [sede(db, adesso), negozio(db, adesso), ...offerta(db, adesso), ...voci(db, adesso), notaKiyasuku(db, adesso)];
    const conteggi = {
      luogo: esiti.filter((e) => e.chiave.startsWith('luogo:') && /rinominato|nota degli orari dalla guida/.test(e.esito)).length,
      negozi: esiti.filter((e) => e.chiave === NEGOZIO.chiave && e.esito.startsWith('creato')).length,
      offerte: esiti.filter((e) => e.chiave === ARTICOLO && e.esito.startsWith('spostata')).length,
      condizioni: esiti.filter((e) => e.chiave.startsWith('condizioni:') && e.esito.startsWith('tolta')).length,
      voci: esiti.filter((e) => e.chiave.startsWith('voce:')).length,
      note: esiti.filter((e) => e.chiave.startsWith('nota:') && e.esito.startsWith('tolta')).length,
    };
    const cambiato = Object.values(conteggi).some((n) => n > 0);
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti }, cambiato);
    logger.info({ migrazione: 304, ...conteggi }, 'Aojiru al Chiosco delle bevande del Sottopasso');
  },
};
