// ============================================================
// Migrazione 308 — le date dei Palazzi da una fonte sola: apertura, scadenza, lettera e furto consigliato strutturati, la prosa esce
// ============================================================
//
// L13, ondata 6, lotto O6-3 (istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito
// rispetto all'obiettivo»). Ogni Palazzo (e i Memento) diceva le stesse date due volte: strutturate in `finestra_dal`/`finestra_al` (118, 183) e
// `lettera_entro` (solo Madarame), in prosa in `data_sblocco`, `data_scadenza` e `furto_consigliato`, che erano quel che la pagina mostrava.
// Sulla copia letta il 2026-10-30 (portata alla 307) la data iniziale di ogni prosa coincide con la finestra per tutti e 10 i dungeon.
//
// Da qui:
//   - colonna nuova `furto_consigliato_data` (MM-GG, null dove la guida non lo dà: Iweleth e i Memento), valorizzata dalla data iniziale del
//     testo `furto_consigliato` di oggi (elenco chiuso qui sotto), che è il giorno in cui la guida invia la lettera e ruba il Tesoro per
//     Kamoshida, Madarame, Okumura, Shido e Maruki. Per tre Palazzi il testo dava invece il giorno in cui si arriva al Tesoro, e prevale il
//     giorno del furto della guida italiana (letta il 2026-10-30): Kaneshiro 27/6 («Ruba il Tesoro materializzato», non il 25/6), Futaba 3/8
//     (lettera, furto e Sfinge; il 1/8 è la prima visita), Niijima 19/11 («oggi è il giorno in cui ruberemo il cuore di Sae», non il 13/11);
//   - i tre testi si svuotano; quel che dicevano in più della data va in coda a `note` come frase «Dalla guida: …», a meno che un evento del
//     Calendario lo dica già (Futaba: il termine consigliato del 19/8 è l'evento 82, l'attacco di Medjed l'evento 84, la «giornata unica» del
//     1/8 l'evento 76; Maruki: il percorso da assicurare entro il 2/2 è l'evento 161, le battaglie finali del 3/2 l'evento 163; Kaneshiro:
//     l'arrivo al Tesoro del 25/6 è l'evento 54). Kamoshida non diceva niente oltre le date: nessuna frase;
//   - l'evento 84 (20/8, «Risoluzione della crisi Medjed», scadenza senza fonte) prende `scadenza:futaba` se la sua data è la fine della
//     finestra di Futaba (20/8): la data si legge da lì.
// Una riga si scrive SOLO se è ancora quella letta oggi: `seed_json` nullo (scheda non corretta dall'utente), la finestra con le date attese e
// l'impronta SHA-256 di ognuno dei quattro testi uguale a quella letta (i testi interi restano nell'audit). Altrimenti la riga si salta, intera,
// e l'audit lo dice. Nessun evento esistente prende `furto:` o `lettera:`: nessuno ha titolo e data che dicano esattamente il furto consigliato
// o il termine della lettera (l'evento 14, «Invio della lettera di sfida a Kamoshida» del 22/4, è un evento di storia). Nessuna voce del Diario
// cambia, le partite non si toccano. Idempotente: la seconda volta i testi sono vuoti e non si scrive niente. Audit in
// `dati_guida.audit-308-palazzi-date`. Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-308-palazzi-date';
const RICHIESTA = '2026-10-30: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 6, lotto O6-3)';
const LIMITE_NOTE = 8000; // LIMITI_GUIDA.dungeon.note
const errore = (motivo: string): never => { throw new Error(`308: ${motivo}; nessuna modifica applicata.`); };

/** Le impronte SHA-256 dei quattro testi di oggi (copia portata alla 307, letta il 2026-10-30). */
interface Impronte { sblocco: string; scadenza: string; furto: string; note: string }
interface Voce {
  chiave: string;
  /** La finestra attesa: la data iniziale dei testi «si apre» e «scade». */
  dal: string; al: string | null;
  /** Il giorno in cui la guida invia la lettera e ruba il Tesoro (vedi sopra); null dove la guida non lo dà. */
  furto: string | null;
  impronte: Impronte;
  /** Quel che i testi dicevano in più delle date e che il Calendario non dice già; null = niente da aggiungere. */
  dallaGuida: string | null;
}

const VUOTO = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const VOCI: readonly Voce[] = [
  { chiave: 'kamoshida', dal: '04-11', al: '05-01', furto: '04-22', dallaGuida: null,
    impronte: { sblocco: '095f112d868d7dc437549d9ee33e4d99f955b3e09beda1f8ea03a49b94b2ea60', scadenza: '89ca8fcaed2bbadfa3e761e0dcaa9130911d7febd8aebfcfcf4954bfea84579b',
      furto: 'c4608230b246d5b09aa3b2a898c503d355311a83d4f2093ce4be572538d0fd3b', note: '37eb4292342a526ab095dcd09bc9b9c75de15a7095be23bfddc6102e5dd3deba' } },
  { chiave: 'madarame', dal: '05-16', al: '06-05', furto: '06-01',
    dallaGuida: 'Dalla guida: il 16 maggio il Palazzo compare nel Meta-Nav scegliendo «Un museo»; la prima esplorazione vera e propria è il 19 maggio e l\'esplorazione completa, fino alla rotta per il Tesoro, si chiude il 27 maggio.',
    impronte: { sblocco: 'c126705ec7642d2ed9b31af7ab325cbd611a8f15187c2a112fa15502efc42f66', scadenza: 'f656ef1c1fb9c9e6a731d7b837f3ddc83a2bc4a7964a3f38f1f041ed87677585',
      furto: '201b8222d7e60e3ee7fdae57b93dcbcb77f183f7f65fe2daa83f3c56ff252f6c', note: '3a3743bfafdbda0fbe5483e6862f9e356b78e3e1d23087bc42ef9e114c38f67c' } },
  // il furto è il 27/6 della guida (il 25/6 del testo è l'arrivo al Tesoro, che dice già l'evento 54)
  { chiave: 'kaneshiro', dal: '06-19', al: '07-08', furto: '06-27',
    dallaGuida: 'Dalla guida: il 19 giugno è la prima esplorazione (la scoperta della banca) e l\'accesso pieno al Palazzo c\'è dal 20 giugno; pur con tre settimane a disposizione, l\'incursione si completa realisticamente in una settimana.',
    impronte: { sblocco: '730a926e74ad400bd1fe0d7f9905ad1411c5f38905269a746b36e091b79c6fb1', scadenza: '6bf91c9b7be464e6e0d1245552b12e6a767c2af13faf77c87233df210ff11bc1',
      furto: 'd432b0bf14ce755c16c25b259387a3918c1067986954ad964c8b0fa891a57e37', note: 'f2ac9851554826a02a3f729c8565fa9cae9adbb5908dfa1a4fbb394b292136c3' } },
  // il furto è il 3/8 della guida (il 1/8 del testo, la giornata al Palazzo fino al Tesoro, lo dice già l'evento 76)
  { chiave: 'futaba', dal: '07-25', al: '08-20', furto: '08-03', dallaGuida: null,
    impronte: { sblocco: '75e8d1ed88c802225797886318f671685db457da885fe59314f8fcf0729502a1', scadenza: '58fe12a4b2439d694bc43094321f3303526ebfa76f01699281ccecef7948ec9d',
      furto: '88f26974a1e1f7715b91058f0c73056a07cd6c795be3f16d7fcf4a0f94756f06', note: '1bb776ebf03342fb3fdbe121fe87a8031cc248ae5fa2988eaeac63c7edd9621f' } },
  { chiave: 'okumura', dal: '09-15', al: '10-10', furto: '10-06',
    dallaGuida: 'Dalla guida: il 15 settembre è una prima visita esplorativa; il Palazzo diventa pienamente percorribile dal 4 ottobre.',
    impronte: { sblocco: 'b98a41c678e135726a90e81b42c9c1b4bb536e9a1d57132f143b47b1a1857ce6', scadenza: 'c095eaaaa50886fc6202fd8517a2fcd1b4e9b4689481161b8cd068c034cb4785',
      furto: '182375854c5ca090a088a91f2176235463b45b2eff0b5b12d9477f9c9e2af5c5', note: 'bc655858de3485289a7b44b88ada500b96e121edeb7a53960c90ea7dddb4c256' } },
  // il furto è il 19/11 della guida; il 13/11 del testo è l'esplorazione principale (l'evento 122 dice solo «Inizio infiltrazione»)
  { chiave: 'niijima', dal: '10-29', al: '11-19', furto: '11-19',
    dallaGuida: 'Dalla guida: l\'esplorazione principale è il 13 novembre e il 14 novembre si chiude con la rotta per il Tesoro, pronta per la lettera di sfida.',
    impronte: { sblocco: '5177eb7005ff6c68a52ff6e4709e6898d965b05be507f0b564b61afbfdccfa52', scadenza: '054429eea186d8ceef5ec1b02a43f651eada03518e78d3370414a7b61d015f1c',
      furto: '99503dcfb79ab1de593c3acbd7d7d14fe56db583745f0e33f2c2abfc57c0ad21', note: '047d4b0875000938c00a41262af9ca08c40b80b6a95f656bf0c0effbf29caed5' } },
  { chiave: 'shido', dal: '11-24', al: '12-17', furto: '12-12',
    dallaGuida: 'Dalla guida: il 24 novembre è solo il prologo e l\'esplorazione libera c\'è dal 25 novembre; nella tabella di marcia l\'infiltrazione arriva fino all\'Aula Magna entro l\'11 dicembre.',
    impronte: { sblocco: 'ddc8b335d287d1a1de8047b4b6433cdab2faadddbbae97fa68e7bae70253390f', scadenza: '17b323ee09c3ba955012beb081aac480164d56e882d608b4c8975e30e78fc26f',
      furto: 'eaacc67bdaadca9f3a5ff803d1f06e5bea3f0ec7bdbab3fbfa276ded1bd88d8d', note: '831a56dd2f59184d337ed8082ca0b33e3f8c3739d004145319430d4c1b9e4083' } },
  { chiave: 'iweleth', dal: '12-24', al: null, furto: null,
    dallaGuida: 'Dalla guida: il 24 dicembre vi si accede dall\'Area 14 del Dedalo di Sheriruth, dove una parete prima bloccata si apre dopo gli eventi di trama.',
    impronte: { sblocco: '6601c9ff60d8228fd016009df21a240968d4c762ad76b28cc9ec99238f3357a3', scadenza: VUOTO, furto: VUOTO,
      note: 'e7c2ae7d0252ffb5ec7f0dabab02c65da5e91bb245d0146cafd67772cc8b5140' } },
  { chiave: 'maruki', dal: '01-02', al: '02-03', furto: '02-03',
    dallaGuida: 'Dalla guida: il terzo semestre si apre solo se il Confidente di Maruki (Consigliere) arriva al Rango 9 entro il 17 novembre (il Rango 10 arriva da sé il 18 novembre); altrimenti non si attiva affatto.',
    impronte: { sblocco: 'edbab4d5ef3cbc8c7ffc3724a1da599cbb32f9c85c05c97e9589ede0ec2b7198', scadenza: 'b398ec577db63713af517d7647566db5c8a974f85dbcb99c80b61805498d5f97',
      furto: '72571fc38e47c51e8f227704991d90a99d4004ea9382070575c6d7b3aa98a036', note: '480276c4082820de6c806b0f589fb81fc58fd90f23748cec695667a19a5445cb' } },
  { chiave: 'mementos', dal: '05-09', al: null, furto: null, dallaGuida: null,
    impronte: { sblocco: 'cdba99082bc14c32fd202a00b0931c6cf2a673b52c8d9541dce22d32083a537d', scadenza: VUOTO, furto: VUOTO,
      note: 'acb957a9d6678500a89013cee6ebb8c9662aff18dec80612b9ec074e8e98c924' } },
];

/** L'evento 84: la scadenza della crisi Medjed, che dal 183 sta alla fine della finestra di Futaba. */
const EVENTO_MEDJED = { id: 84, titolo: 'Risoluzione della crisi Medjed', fonte: 'scadenza:futaba', dungeon: 'futaba' } as const;

const impronta = (testo: string): string => createHash('sha256').update(testo, 'utf8').digest('hex');

interface Riga { chiave: string; data_sblocco: string; data_scadenza: string; furto_consigliato: string; note: string; seed_json: string | null; finestra_dal: string | null; finestra_al: string | null; furto_consigliato_data: string | null }
type Esito = { chiave: string; esito: string; prima?: Record<string, string>; furtoConsigliato?: string | null; aggiunta?: string | null };

/** Una riga: la scrive se è ancora quella letta oggi; altrimenti dice perché no. */
function riga(db: AppDatabase, v: Voce): Esito {
  const r = db.prepare('SELECT chiave, data_sblocco, data_scadenza, furto_consigliato, note, seed_json, finestra_dal, finestra_al, furto_consigliato_data FROM main.dungeon WHERE chiave = ?').get(v.chiave) as Riga | undefined;
  if (!r) return { chiave: v.chiave, esito: 'dungeon assente: niente da fare' };
  if (r.data_sblocco === '' && r.data_scadenza === '' && r.furto_consigliato === '') return { chiave: v.chiave, esito: 'già fatto: i testi sono vuoti' };
  const prima = { data_sblocco: r.data_sblocco, data_scadenza: r.data_scadenza, furto_consigliato: r.furto_consigliato, note: r.note };
  if (r.seed_json !== null) return { chiave: v.chiave, esito: 'scheda corretta dall’utente (seed_json): saltata, i testi restano', prima };
  if (r.finestra_dal !== v.dal || r.finestra_al !== v.al) return { chiave: v.chiave, esito: `la finestra non è più quella letta (${r.finestra_dal ?? '—'}…${r.finestra_al ?? '—'} invece di ${v.dal}…${v.al ?? '—'}): saltata, i testi restano`, prima };
  const diversi = ([['data_sblocco', 'sblocco'], ['data_scadenza', 'scadenza'], ['furto_consigliato', 'furto'], ['note', 'note']] as const)
    .filter(([colonna, k]) => typeof r[colonna] !== 'string' || impronta(r[colonna]) !== v.impronte[k]).map(([colonna]) => colonna);
  if (diversi.length) return { chiave: v.chiave, esito: `testo diverso da quello letto (${diversi.join(', ')}): saltata, i testi restano`, prima };
  if (r.furto_consigliato_data !== null && r.furto_consigliato_data !== v.furto) return { chiave: v.chiave, esito: `il furto consigliato strutturato è già ${r.furto_consigliato_data}: saltata`, prima };
  const note = v.dallaGuida ? (r.note ? `${r.note}\n${v.dallaGuida}` : v.dallaGuida) : r.note;
  if (note.length > LIMITE_NOTE) return { chiave: v.chiave, esito: `le note supererebbero ${LIMITE_NOTE} caratteri: saltata, i testi restano`, prima };
  const n = db.prepare(`UPDATE main.dungeon SET furto_consigliato_data = ?, data_sblocco = '', data_scadenza = '', furto_consigliato = '', note = ?
    WHERE chiave = ? AND seed_json IS NULL AND data_sblocco = ? AND data_scadenza = ? AND furto_consigliato = ? AND note = ?`)
    .run(v.furto, note, v.chiave, r.data_sblocco, r.data_scadenza, r.furto_consigliato, r.note).changes;
  if (n !== 1) errore(`la riga di ${v.chiave} non si aggiorna una volta sola`);
  return { chiave: v.chiave, esito: 'date strutturate, testi svuotati', prima, furtoConsigliato: v.furto, aggiunta: v.dallaGuida };
}

/** L'evento 84 prende la fonte della scadenza di Futaba, se è ancora senza fonte e la sua data è la fine della finestra. */
function eventoMedjed(db: AppDatabase): string {
  const e = db.prepare('SELECT data, tipo, titolo, fonte_chiave FROM main.evento_calendario WHERE id = ?').get(EVENTO_MEDJED.id) as { data: string; tipo: string; titolo: string; fonte_chiave: string | null } | undefined;
  if (!e) return 'evento assente: niente da fare';
  if (e.fonte_chiave === EVENTO_MEDJED.fonte) return 'già collegato alla scadenza di Futaba';
  if (e.fonte_chiave !== null) return `ha già la fonte ${e.fonte_chiave}: resta`;
  if (e.tipo !== 'scadenza' || e.titolo !== EVENTO_MEDJED.titolo) return `tipo o titolo cambiati («${e.titolo}», ${e.tipo}): resta`;
  const al = db.prepare('SELECT finestra_al FROM main.dungeon WHERE chiave = ?').pluck().get(EVENTO_MEDJED.dungeon) as string | null | undefined;
  if (!al || al !== e.data) return `la data ${e.data} non è la fine della finestra di Futaba (${al ?? '—'}): resta`;
  const n = db.prepare('UPDATE main.evento_calendario SET fonte_chiave = ? WHERE id = ? AND fonte_chiave IS NULL AND data = ?').run(EVENTO_MEDJED.fonte, EVENTO_MEDJED.id, e.data).changes;
  if (n !== 1) errore('l’evento 84 non si aggiorna una volta sola');
  return `collegato: fonte_chiave = ${EVENTO_MEDJED.fonte} (data ${e.data}, ora letta dalla finestra)`;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 308, richiesta: RICHIESTA,
      regola: 'date dei Palazzi in colonne MM-GG (finestra_dal/al, lettera_entro, furto_consigliato_data); i testi data_sblocco, data_scadenza e furto_consigliato svuotati solo se uguali a quelli letti il 2026-10-30 (impronta SHA-256), con seed_json nullo e la finestra attesa; quel che dicevano in più va in coda alle note come «Dalla guida: …» se il Calendario non lo dice già; evento 84 → scadenza:futaba; il furto consigliato è il giorno del furto della guida italiana (Kaneshiro 27/6, Futaba 3/8, Niijima 19/11 al posto del giorno d’arrivo al Tesoro che dava il testo); le partite non si toccano',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration308: Migration = {
  id: 308,
  name: 'palazzi_date_fonte_unica',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dungeon') || !esisteTabella(db, 'dati_guida')) { logger.warn({ migrazione: 308 }, 'tabelle assenti: niente da fare'); return; }
    for (const c of ['data_sblocco', 'data_scadenza', 'furto_consigliato', 'note', 'seed_json', 'finestra_dal', 'finestra_al', 'lettera_entro']) {
      if (!haColonna(db, 'dungeon', c)) { logger.warn({ migrazione: 308, colonna: c }, 'colonna assente: niente da fare'); return; }
    }
    const colonnaNuova = !haColonna(db, 'dungeon', 'furto_consigliato_data');
    if (colonnaNuova) db.exec('ALTER TABLE main.dungeon ADD COLUMN furto_consigliato_data TEXT');
    const righe = VOCI.map((v) => riga(db, v));
    const evento = esisteTabella(db, 'evento_calendario') && haColonna(db, 'evento_calendario', 'fonte_chiave') ? eventoMedjed(db) : 'Calendario senza fonte_chiave: niente da fare';
    const fuoriElenco = (db.prepare('SELECT chiave FROM main.dungeon ORDER BY ordine').pluck().all() as string[]).filter((k) => !VOCI.some((v) => v.chiave === k));
    const scritte = righe.filter((r) => r.esito.startsWith('date strutturate')).length;
    const saltate = righe.filter((r) => r.esito.includes('saltata')).length;
    const cambiato = colonnaNuova || scritte > 0 || evento.startsWith('collegato');
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { colonnaNuova, scritte, saltate, righe, evento84: evento, fuoriElenco }, cambiato);
    logger.info({ migrazione: 308, colonnaNuova, scritte, saltate, evento84: evento, fuoriElenco }, 'date dei Palazzi da una fonte sola');
  },
};
