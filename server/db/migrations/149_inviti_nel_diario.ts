// ============================================================
// 149 — le 8 voci degli inviti dopo il 06-01 (R10-28d/1, R10-11j2, G-023/G-028)
// ============================================================
//
// Gli inviti dei Confidenti che aprono un posto (G-023) diventano voci del diario DOPO il 1° giugno, «da rivedere» e «aggiunta dal team»:
//   07-02 sera  messaggio di Ryuji           10-08 sera  messaggio di Futaba
//   07-03 giorno invito di Ryuji → Ichigaya  10-09 giorno invito di Futaba → Nakano
//   07-28 sera  messaggio di Akechi          08-06 giorno invito di Ann → Santuario Meiji
//   07-29 giorno invito di Akechi → Shinagawa  07-30 giorno invito di Makoto → Ikebukuro (con la condizione scritta, G-028)
// Ogni voce va in fondo alla sua fascia (ordine = massimo + 1: nessuna voce esistente cambia posto), con uid fisso (derivato dal nome, lo stesso
// su ogni copia) e riferimento al Confidente. Nei giorni in cui l'invito compete con un'uscita già prevista (07-03, 07-29, 07-30) il testo dice
// «in alternativa a …» e la voce esistente non cambia. Il 29/5 di Ryuji (diario validato) NON è una voce: resta l'evento.
// Il diario validato 04-01..06-01 non si tocca: una data fino al 06-01 ferma la migrazione. L'effetto «invito» della spunta non c'è ancora
// nel codice delle voci (voce_effetto non lo conosce): le voci nascono senza effetti e senza cambiare nient'altro.
// Idempotente: una voce con lo stesso uid non si riscrive. Non tocca `partite.db`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const ULTIMO_VALIDATO = '06-01';
const MOTIVO_MAKOTO = 'Sul percorso della guida la piramide si completa il 3/8: il 30/7 Makoto non invita (G-028)';

interface Invito { chiave: string; data: string; fascia: 'giorno' | 'sera'; confidente: string; nomeConfidente: string; azione: string; note: string | null; motivo: string | null; invito: string | null }
const uidDi = (chiave: string): string => createHash('sha256').update(`voce-invito-diario-149|${chiave}`).digest('hex').slice(0, 32);

const INVITI: readonly Invito[] = [
  { chiave: 'ryuji-messaggio-07-02', data: '07-02', fascia: 'sera', confidente: 'ryuji', nomeConfidente: 'Ryuji Sakamoto - Carro',
    azione: 'Messaggio di Ryuji: invito per domani', note: 'Il messaggio arriva la sera e non consuma tempo; l’invito è per il giorno dopo.', motivo: null, invito: null },
  { chiave: 'ryuji-07-03', data: '07-03', fascia: 'giorno', confidente: 'ryuji', nomeConfidente: 'Ryuji Sakamoto - Carro',
    azione: 'Invito di Ryuji: uscita al Laghetto di Ichigaya, in alternativa a «Uscire con Ann al Buffet Wilton di Shibuya»', note: 'Apre il Laghetto di Ichigaya. Due uscite nella stessa fascia: l’invito è un’alternativa.', motivo: null, invito: 'ryuji/07-03' },
  { chiave: 'akechi-messaggio-07-28', data: '07-28', fascia: 'sera', confidente: 'akechi', nomeConfidente: 'Goro Akechi - Giustizia',
    azione: 'Messaggio di Akechi: invito per domani', note: 'Il messaggio arriva la sera e non consuma tempo; l’invito è per il giorno dopo.', motivo: null, invito: null },
  { chiave: 'akechi-07-29', data: '07-29', fascia: 'giorno', confidente: 'akechi', nomeConfidente: 'Goro Akechi - Giustizia',
    azione: 'Invito di Akechi: uscita all’Acquario di Shinagawa, in alternativa a «Confidente Takemi»', note: 'Apre l’Acquario di Shinagawa. Due uscite nella stessa fascia: l’invito è un’alternativa.', motivo: null, invito: 'akechi/07-29' },
  { chiave: 'makoto-07-30', data: '07-30', fascia: 'giorno', confidente: 'makoto', nomeConfidente: 'Makoto Niijima - Papessa',
    azione: 'Invito di Makoto: uscita al Planetario di Ikebukuro, in alternativa a «Confidente Ann: preparazione per il prossimo avanzamento» — solo se il Palazzo di Futaba è già completato',
    note: 'Apre il Planetario di Ikebukuro. Serve il Palazzo di Futaba concluso e Imperatore a rango 1.', motivo: MOTIVO_MAKOTO, invito: 'makoto/07-30' },
  { chiave: 'ann-08-06', data: '08-06', fascia: 'giorno', confidente: 'ann', nomeConfidente: 'Ann Takamaki - Amanti',
    azione: 'Invito di Ann: uscita al Santuario Meiji', note: 'Apre il Santuario Meiji.', motivo: null, invito: 'ann/08-06' },
  { chiave: 'futaba-messaggio-10-08', data: '10-08', fascia: 'sera', confidente: 'futaba', nomeConfidente: 'Futaba Sakura - Eremita',
    azione: 'Messaggio di Futaba: invito per domani', note: 'Il messaggio arriva la sera e non consuma tempo; l’invito è per il giorno dopo.', motivo: null, invito: null },
  { chiave: 'futaba-10-09', data: '10-09', fascia: 'giorno', confidente: 'futaba', nomeConfidente: 'Futaba Sakura - Eremita',
    azione: 'Invito di Futaba: uscita a Nakano Broadway', note: 'Apre Nakano Broadway.', motivo: null, invito: 'futaba/10-09' },
];

function inserisci(db: AppDatabase, adesso: string): Array<{ voce: string; esito: string }> {
  const esiti: Array<{ voce: string; esito: string }> = [];
  const leggi = db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?');
  const ordineIn = db.prepare('SELECT COALESCE(MAX(ordine) + 1, 0) AS n FROM main.voce_giornata WHERE data = ? AND fascia = ?');
  const scrivi = db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
      rango_atteso, produce_json, indice_guida, created_at, updated_at, da_rivedere, aggiunta_da, motivo_revisione)
    VALUES (?, ?, ?, ?, 'azione', ?, ?, 'confidente', 'confidente', ?, ?, NULL, '[]', NULL, ?, ?, 1, 'team', ?)`);
  for (const i of INVITI) {
    const voce = `${i.data} ${i.fascia}: ${i.chiave}`;
    const uid = uidDi(i.chiave);
    if (i.data <= ULTIMO_VALIDATO) throw new Error(`migrazione 149: ${voce} cadrebbe nel diario validato`);
    if (leggi.get(uid)) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (!db.prepare('SELECT 1 FROM main.giorno_percorso WHERE data = ?').get(i.data)) { esiti.push({ voce, esito: 'saltata: giorno assente dal percorso' }); continue; }
    if (!db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(i.confidente)) { esiti.push({ voce, esito: 'saltata: Confidente assente' }); continue; }
    if (i.invito && !db.prepare('SELECT 1 FROM main.confidente_invito WHERE chiave = ?').get(i.invito)) { esiti.push({ voce, esito: 'saltata: invito assente da confidente_invito' }); continue; }
    const ordine = (ordineIn.get(i.data, i.fascia) as { n: number }).n;
    scrivi.run(uid, i.data, i.fascia, ordine, i.azione, i.note, i.confidente, i.nomeConfidente, adesso, adesso, i.motivo);
    // Ogni voce ha la sua riga di transizione degli effetti («convertita», nessun effetto): la stessa di tutte le voci senza effetti.
    const transizione = improntaSenzaEffetti(db);
    if (transizione) db.prepare("INSERT INTO main.voce_effetto_transizione (voce_uid, stato, raw_json, motivo, impronta, aggiornata_il) VALUES (?, 'convertita', '[]', NULL, ?, ?)").run(uid, transizione, adesso);
    esiti.push({ voce, esito: `applicata (ordine ${ordine})${transizione ? '' : ', senza riga di transizione: impronta di riferimento non univoca'}` });
  }
  return esiti;
}

/** L'impronta che hanno oggi tutte le voci convertite senza effetti; null se la tabella manca o i valori non sono uno solo. */
function improntaSenzaEffetti(db: AppDatabase): string | null {
  const tabelle = db.prepare("SELECT COUNT(*) AS n FROM main.sqlite_master WHERE type = 'table' AND name IN ('voce_effetto_transizione', 'voce_effetto')").get() as { n: number };
  if (tabelle.n !== 2) return null;
  const valori = db.prepare(`SELECT DISTINCT t.impronta FROM main.voce_effetto_transizione t WHERE t.stato = 'convertita' AND t.raw_json = '[]'
    AND NOT EXISTS (SELECT 1 FROM main.voce_effetto e WHERE e.voce_uid = t.voce_uid)`).all() as Array<{ impronta: string }>;
  return valori.length === 1 ? valori[0]!.impronta : null;
}

export const migration149: Migration = {
  id: 149,
  name: 'inviti_nel_diario',
  up(db) {
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!['voce_giornata', 'giorno_percorso', 'confidente', 'confidente_invito'].every(ok)) return;
    const colonne = (db.prepare('PRAGMA main.table_info(voce_giornata)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!['da_rivedere', 'aggiunta_da', 'motivo_revisione'].every((c) => colonne.includes(c))) return;
    const esiti = inserisci(db, new Date().toISOString());
    logger.info({ esiti }, '[migration149] voci degli inviti dopo il 06-01');
  },
};
