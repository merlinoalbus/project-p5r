// ============================================================
// Migrazione 342 — date di Kaneshiro, Medjed e Niijima, evento della lettera a Kamoshida, condizione del Biliardo (decisioni del 01/11)
// ============================================================
//
// Risposte dell'utente del 1° novembre ai conflitti di date del censimento «L8-02 — avvisi del giorno» (revisione 2). Le finestre dei
// Palazzi (`dungeon.finestra_dal`/`finestra_al`) non cambiano: Kaneshiro resta al 08/07, Futaba al 20/08, Niijima al 19/11.
//   - Kaneshiro («8 luglio»): il termine del ricatto è l'8 luglio, l'ultimo giorno della finestra del Palazzo. Il vincolo del 19/06 («circa 2
//     settimane») e la trama del 20/06 («entro 3 settimane») lo dicono; l'evento 56 passa dal 30/06 all'08/07. Il titolo dell'evento 51 del
//     20/06 («in 3 settimane») resta, per decisione esplicita dell'utente.
//   - Date vecchie («Sì, allineali tutti», dal censimento delle date): il riassunto della settimana 11 («in 3 settimane» → «entro l'8
//     luglio»), quello della settimana 13 («Allinealo»: la scadenza del Palazzo di Kaneshiro all'8/7, il risveglio del cuore il 9/7), quello della settimana 15 (l'annuncio di Medjed passa dal 24/7 al 23/7), quello della settimana 28 (scadenza di Niijima «20
//     novembre» → «19 novembre»), la trama del 21/06 («18 giorni» → «tempo fino all'8 luglio») e la nota del Palazzo di Kaneshiro («tre
//     settimane a disposizione» → «il tempo fino all'8 luglio»): solo la frase, il resto del testo resta. Il blocco storico `finestre-dungeon`
//     non si tocca.
//   - Medjed: l'annuncio è del 23 luglio (l'evento 69 passa dal 24 al 23); la scadenza è il 20 agosto («ultimo giorno utile 20, il 21 è il giorno
//     dell'attacco»): la trama del 23/07 dice «la scadenza del 20 agosto». Il titolo dell'evento 69 («un attacco per il 21 agosto») e l'evento
//     84 (20/08) restano: dicono il giorno dell'attacco e la scadenza.
//   - Niijima («19 novembre»): l'evento 116 annuncia la scadenza del 19 novembre (era «20 novembre»).
//   - Lettera a Kamoshida («Sì, al 21 aprile», poi «Separo i due eventi»): l'evento 14, «Invio della lettera di sfida a Kamoshida», passa dal
//     22 al 21 aprile, il giorno della voce che la invia, senza il dettaglio del confronto e senza collegamento; il 22 aprile ha un evento a
//     sé, «Furto del Tesoro di Kamoshida» (tipo «storia», stessa fonte), con il dettaglio «Confronto e sconfitta…» e il collegamento alla voce
//     del furto (`cdc7e3a8…`, certezza e origine di prima), come gli eventi aggiunti dalla 182 (id dato dal database, riconosciuto da giorno,
//     tipo e titolo). Le voci del periodo validato e le spunte non cambiano.
//   - Biliardo («Sì, rango 2 di Akechi»): l'attività prende la condizione `confidente akechi ≥ 2` del vocabolario delle condizioni, come la
//     guida delle sfide del Covo («sbloccata al Rango 2 con Akechi»).
// Okumura (trama del 19/09, «22 giorni») e le elezioni (eventi del 17 e 18/12) non si toccano: «per il momento lascia quella della trama».
//
// COSA (conservativa, idempotente): ogni dato si scrive solo se è ancora quello letto, parola per parola, e della guida (`origine = 'seed'`,
// `seed_json IS NULL`); un evento spostato va in coda agli eventi del giorno nuovo. Il resto del calendario, i giorni, le attività, le voci,
// gli effetti, i collegamenti evento-voce, le settimane, i Palazzi (fuori dalla nota di Kaneshiro) e tutte le tabelle delle partite restano identici (impronte prima e dopo). Il prima e il
// dopo di ogni dato nell'audit `dati_guida.audit-342-date-e-testi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { diverseFuori, improntaPartite, righePerChiave, scriviAudit } from './decisioniDati0111.js';

const AUDIT = 'audit-342-date-e-testi';
const errore = (motivo: string): never => { throw new Error(`342: ${motivo}; nessuna modifica applicata.`); };

/** Gli eventi del calendario: il giorno e il titolo letti, e il giorno o il titolo nuovi. */
const EVENTI: ReadonlyArray<{ id: number; data: string; titolo: string; nuovaData?: string; nuovoTitolo?: string; perche: string }> = [
  { id: 14, data: '04-22', titolo: 'Invio della lettera di sfida a Kamoshida', nuovaData: '04-21', perche: 'lettera a Kamoshida: «Sì, al 21 aprile»' },
  { id: 56, data: '06-30', titolo: 'Scadenza pagamento/minaccia Kaneshiro (3 milioni di yen)', nuovaData: '07-08', perche: 'Kaneshiro: «8 luglio»' },
  { id: 69, data: '07-24', titolo: 'Medjed minaccia un attacco per il 21 agosto', nuovaData: '07-23', perche: 'Medjed: annuncio il 23 luglio' },
  { id: 116, data: '10-29', titolo: 'Scadenza annunciata per il Palazzo di Niijima: 20 novembre', nuovoTitolo: 'Scadenza annunciata per il Palazzo di Niijima: 19 novembre', perche: 'Niijima: «19 novembre»' },
];

/** I testi dei giorni: la frase letta (una volta sola nel campo) e quella nuova. */
const GIORNI: ReadonlyArray<{ data: string; campo: 'trama' | 'vincolo'; vecchia: string; nuova: string; perche: string }> = [
  { data: '06-19', campo: 'vincolo', vecchia: 'Scadenza incarico Kaneshiro: circa 2 settimane da questa data', nuova: 'Scadenza incarico Kaneshiro: 8 luglio', perche: 'Kaneshiro: «8 luglio»' },
  { data: '06-20', campo: 'trama', vecchia: 'chiedendo 3 milioni di yen entro 3 settimane', nuova: 'chiedendo 3 milioni di yen entro l\'8 luglio', perche: 'Kaneshiro: «8 luglio»' },
  { data: '07-23', campo: 'trama', vecchia: 'Medjed annuncia la scadenza del 21 agosto', nuova: 'Medjed annuncia la scadenza del 20 agosto', perche: 'Medjed: «ultimo giorno utile 20, il 21 è il giorno dell\'attacco»' },
  { data: '06-21', campo: 'trama', vecchia: 'si apprende di avere 18 giorni per sconfiggere Kaneshiro', nuova: 'si apprende di avere tempo fino all\'8 luglio per sconfiggere Kaneshiro', perche: 'date vecchie: «Sì, allineali tutti»' },
];

/** Le altre frasi con le date vecchie («Sì, allineali tutti»): riassunti delle settimane e nota del Palazzo di Kaneshiro; il resto del testo resta. */
const SETTIMANE: ReadonlyArray<{ numero: number; vecchia: string; nuova: string }> = [
  { numero: 11, vecchia: 'Kaneshiro ricatta il gruppo per 3 milioni di yen in 3 settimane', nuova: 'Kaneshiro ricatta il gruppo per 3 milioni di yen entro l\'8 luglio' },
  { numero: 13, vecchia: 'Asakusa-Osiage. 9/7: scadenza/risveglio del cuore di Kaneshiro,', nuova: 'Asakusa-Osiage; scadenza del Palazzo di Kaneshiro. 9/7: risveglio del cuore di Kaneshiro,' },
  { numero: 15, vecchia: '23/7: riunione di gruppo, contatto di Alibaba. 24/7: Medjed annuncia la minaccia per il 21 agosto; Sae Niijima rango 2.',
    nuova: '23/7: riunione di gruppo, contatto di Alibaba; Medjed annuncia la minaccia per il 21 agosto. 24/7: Sae Niijima rango 2.' },
  { numero: 28, vecchia: 'scadenza annunciata per il 20 novembre', nuova: 'scadenza annunciata per il 19 novembre' },
];
const NOTA_KANESHIRO = { chiave: 'kaneshiro', vecchia: 'pur con tre settimane a disposizione', nuova: 'pur con il tempo fino all\'8 luglio' } as const;

/** «Separo i due eventi»: l'evento 14 della lettera senza il dettaglio del 22 e senza il collegamento, e l'evento nuovo del furto. */
const LETTERA = { id: 14, data: '04-21', dettaglio: 'Confronto e sconfitta dell\'Ombra di Kamoshida; primo tesoro materializzato.', voce: 'cdc7e3a818e612b94efe7853135f7617' } as const;
const FURTO = { data: '04-22', tipo: 'storia', titolo: 'Furto del Tesoro di Kamoshida', dettaglio: LETTERA.dettaglio } as const;

/** La condizione del Biliardo, come la scrive `normalizzaRequisitoSpillo`. */
const BILIARDO = { chiave: 'biliardo', prima: '[]', dopo: JSON.stringify([{ tipo: 'confidente', confidente: 'akechi', rango: 2 }]) } as const;

/** Quante volte `parte` compare in `testo`. */
const occorrenze = (testo: string, parte: string): number => testo.split(parte).length - 1;

export const migration342: Migration = {
  id: 342,
  name: 'date_di_kaneshiro_medjed_niijima_e_lettera',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'evento_calendario') || !esisteTabella(db, 'giorno') || !esisteTabella(db, 'attivita')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const eventiPrima = righePerChiave(db, 'evento_calendario', ['id']);
    const giorniPrima = righePerChiave(db, 'giorno', ['data']);
    const attivitaPrima = righePerChiave(db, 'attivita', ['chiave']);
    const collegamentiPrima = righePerChiave(db, 'evento_calendario_voce', ['evento_id', 'voce_uid']);
    const settimanePrima = righePerChiave(db, 'settimana_guida', ['numero']);
    const dungeonPrima = righePerChiave(db, 'dungeon', ['chiave']);
    const intatte = ['voce_giornata', 'voce_effetto', 'confidente_requisito'] as const;
    const intattePrima = new Map(intatte.filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)] as const));
    const partitePrima = improntaPartite(db);

    const esiti: Array<{ chiave: string; esito: string; prima?: unknown; dopo?: unknown; perche?: string }> = [];
    const eventiToccati = new Set<string>(), giorniToccati = new Set<string>(), attivitaToccate = new Set<string>(), collegamentiToccati = new Set<string>();
    const settimaneToccate = new Set<string>(), dungeonToccati = new Set<string>();

    // (1) gli eventi del calendario
    for (const e of EVENTI) {
      const chiave = `evento:${e.id}`;
      const r = db.prepare('SELECT data, ordine, titolo, origine, seed_json FROM main.evento_calendario WHERE id = ?').get(e.id) as
        { data: string; ordine: number; titolo: string; origine: string; seed_json: string | null } | undefined;
      const data = e.nuovaData ?? e.data, titolo = e.nuovoTitolo ?? e.titolo;
      if (!r) { esiti.push({ chiave, esito: 'evento assente' }); continue; }
      if (r.data === data && r.titolo === titolo) { esiti.push({ chiave, esito: 'già corretto' }); continue; }
      if (r.data !== e.data || r.titolo !== e.titolo || r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave, esito: 'evento diverso da quello atteso o corretto dall\'utente: non toccato' }); continue; }
      if (e.nuovaData && !db.prepare('SELECT 1 FROM main.giorno WHERE data = ?').get(e.nuovaData)) { esiti.push({ chiave, esito: `giorno ${e.nuovaData} assente: non toccato` }); continue; }
      // un evento spostato va in coda agli eventi del giorno nuovo
      const ordine = e.nuovaData
        ? ((db.prepare('SELECT MAX(ordine) FROM main.evento_calendario WHERE data = ?').pluck().get(e.nuovaData) as number | null) ?? -1) + 1
        : r.ordine;
      if (db.prepare('UPDATE main.evento_calendario SET data = ?, ordine = ?, titolo = ? WHERE id = ? AND data = ? AND titolo = ?').run(data, ordine, titolo, e.id, e.data, e.titolo).changes !== 1) errore(`l'evento ${e.id} non si aggiorna`);
      eventiToccati.add(String(e.id));
      esiti.push({ chiave, esito: 'corretto', prima: { data: r.data, ordine: r.ordine, titolo: r.titolo }, dopo: { data, ordine, titolo }, perche: e.perche });
    }

    // (1b) la lettera e il furto del Tesoro di Kamoshida, due eventi separati
    {
      const chiave = 'evento:14:separato';
      const ev = db.prepare('SELECT data, dettaglio, fonte, origine, seed_json FROM main.evento_calendario WHERE id = ?').get(LETTERA.id) as
        { data: string; dettaglio: string; fonte: string; origine: string; seed_json: string | null } | undefined;
      const furti = db.prepare('SELECT id FROM main.evento_calendario WHERE data = ? AND tipo = ? AND titolo = ?').pluck().all(FURTO.data, FURTO.tipo, FURTO.titolo) as number[];
      const legame = db.prepare('SELECT certezza, origine, seed_json FROM main.evento_calendario_voce WHERE evento_id = ? AND voce_uid = ?').get(LETTERA.id, LETTERA.voce) as
        { certezza: string; origine: string; seed_json: string | null } | undefined;
      const voceFurto = db.prepare('SELECT data FROM main.voce_giornata WHERE uid = ?').pluck().get(LETTERA.voce) as string | undefined;
      if (!ev || ev.data !== LETTERA.data) esiti.push({ chiave, esito: 'l\'evento 14 non è al 21/04: non separato' });
      else if (furti.length > 1) esiti.push({ chiave, esito: `${furti.length} eventi «${FURTO.titolo}» il ${FURTO.data}: non toccati` });
      else if (ev.dettaglio === '' && furti.length === 1 && !legame) esiti.push({ chiave, esito: `già separati (evento del furto ${furti[0]})` });
      else if (ev.dettaglio !== LETTERA.dettaglio || ev.origine !== 'seed' || ev.seed_json !== null) esiti.push({ chiave, esito: 'evento 14 diverso da quello atteso o corretto dall\'utente: non separato' });
      else if (voceFurto !== FURTO.data) esiti.push({ chiave, esito: 'la voce del furto non è al 22/04: non separato' });
      else if (legame && (legame.origine !== 'seed' || legame.seed_json !== null)) esiti.push({ chiave, esito: 'collegamento corretto dall\'utente: non separato' });
      else {
        const ordine = ((db.prepare('SELECT MAX(ordine) FROM main.evento_calendario WHERE data = ?').pluck().get(FURTO.data) as number | null) ?? -1) + 1;
        // come gli eventi aggiunti dalla 182: l'id lo dà il database, l'evento si riconosce da giorno, tipo e titolo
        const furtoId = furti[0] ?? Number(db.prepare('INSERT INTO main.evento_calendario (data, ordine, tipo, titolo, dettaglio, fonte) VALUES (?, ?, ?, ?, ?, ?)')
          .run(FURTO.data, ordine, FURTO.tipo, FURTO.titolo, FURTO.dettaglio, ev.fonte).lastInsertRowid);
        if (db.prepare("UPDATE main.evento_calendario SET dettaglio = '' WHERE id = ? AND dettaglio = ?").run(LETTERA.id, LETTERA.dettaglio).changes !== 1) errore('il dettaglio dell\'evento 14 non si aggiorna');
        if (legame) db.prepare('DELETE FROM main.evento_calendario_voce WHERE evento_id = ? AND voce_uid = ?').run(LETTERA.id, LETTERA.voce);
        db.prepare("INSERT INTO main.evento_calendario_voce (evento_id, voce_uid, certezza, origine) VALUES (?, ?, ?, 'seed')").run(furtoId, LETTERA.voce, legame?.certezza ?? 'C');
        eventiToccati.add(String(LETTERA.id)); eventiToccati.add(String(furtoId));
        collegamentiToccati.add(`${LETTERA.id}|${LETTERA.voce}`); collegamentiToccati.add(`${furtoId}|${LETTERA.voce}`);
        esiti.push({ chiave, esito: `separato (evento del furto ${furtoId})`,
          prima: { evento14: { data: ev.data, dettaglio: ev.dettaglio }, collegamento: legame ? { evento: LETTERA.id, voce: LETTERA.voce, certezza: legame.certezza } : null },
          dopo: { evento14: { data: ev.data, dettaglio: '' }, furto: { id: furtoId, ...FURTO, ordine }, collegamento: { evento: furtoId, voce: LETTERA.voce, certezza: legame?.certezza ?? 'C' } },
          perche: 'lettera a Kamoshida: «Separo i due eventi»' });
      }
    }

    // (2) le frasi della trama e dei vincoli
    for (const g of GIORNI) {
      const chiave = `giorno:${g.data}:${g.campo}`;
      const r = db.prepare('SELECT trama, vincoli_json, origine, seed_json FROM main.giorno WHERE data = ?').get(g.data) as
        { trama: string; vincoli_json: string; origine: string; seed_json: string | null } | undefined;
      if (!r) { esiti.push({ chiave, esito: 'giorno assente' }); continue; }
      if (g.campo === 'trama') {
        if (occorrenze(r.trama, g.nuova) === 1 && occorrenze(r.trama, g.vecchia) === 0) { esiti.push({ chiave, esito: 'già corretta' }); continue; }
        if (occorrenze(r.trama, g.vecchia) !== 1 || r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave, esito: 'trama diversa da quella attesa o corretta dall\'utente: non toccata' }); continue; }
        const nuova = r.trama.replace(g.vecchia, g.nuova);
        if (db.prepare('UPDATE main.giorno SET trama = ? WHERE data = ? AND trama = ?').run(nuova, g.data, r.trama).changes !== 1) errore(`la trama del ${g.data} non si aggiorna`);
        giorniToccati.add(g.data);
        esiti.push({ chiave, esito: 'corretta', prima: r.trama, dopo: nuova, perche: g.perche });
      } else {
        let vincoli: unknown;
        try { vincoli = JSON.parse(r.vincoli_json); } catch { vincoli = null; }
        if (!Array.isArray(vincoli)) { esiti.push({ chiave, esito: 'vincoli illeggibili: non toccati' }); continue; }
        if (vincoli.includes(g.nuova) && !vincoli.includes(g.vecchia)) { esiti.push({ chiave, esito: 'già corretto' }); continue; }
        if (vincoli.filter((v) => v === g.vecchia).length !== 1 || r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave, esito: 'vincolo diverso da quello atteso o giorno corretto dall\'utente: non toccato' }); continue; }
        const nuovi = JSON.stringify(vincoli.map((v) => (v === g.vecchia ? g.nuova : v)));
        if (db.prepare('UPDATE main.giorno SET vincoli_json = ? WHERE data = ? AND vincoli_json = ?').run(nuovi, g.data, r.vincoli_json).changes !== 1) errore(`i vincoli del ${g.data} non si aggiornano`);
        giorniToccati.add(g.data);
        esiti.push({ chiave, esito: 'corretto', prima: r.vincoli_json, dopo: nuovi, perche: g.perche });
      }
    }

    // (2b) i riassunti delle settimane e la nota del Palazzo di Kaneshiro, con le date vecchie
    for (const s of SETTIMANE) {
      const chiave = `settimana:${s.numero}:riassunto`;
      const r = db.prepare('SELECT riassunto, origine, seed_json FROM main.settimana_guida WHERE numero = ?').get(s.numero) as { riassunto: string; origine: string; seed_json: string | null } | undefined;
      if (!r) { esiti.push({ chiave, esito: 'settimana assente' }); continue; }
      if (occorrenze(r.riassunto, s.nuova) === 1 && occorrenze(r.riassunto, s.vecchia) === 0) { esiti.push({ chiave, esito: 'già corretto' }); continue; }
      if (occorrenze(r.riassunto, s.vecchia) !== 1 || r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave, esito: 'riassunto diverso da quello atteso o corretto dall\'utente: non toccato' }); continue; }
      const nuovo = r.riassunto.replace(s.vecchia, s.nuova);
      if (db.prepare('UPDATE main.settimana_guida SET riassunto = ? WHERE numero = ? AND riassunto = ?').run(nuovo, s.numero, r.riassunto).changes !== 1) errore(`il riassunto della settimana ${s.numero} non si aggiorna`);
      settimaneToccate.add(String(s.numero));
      esiti.push({ chiave, esito: 'corretto', prima: s.vecchia, dopo: s.nuova, perche: 'date vecchie: «Sì, allineali tutti»' });
    }
    {
      const n = NOTA_KANESHIRO, chiave = `dungeon:${n.chiave}:note`;
      const r = db.prepare('SELECT note FROM main.dungeon WHERE chiave = ?').get(n.chiave) as { note: string } | undefined;
      if (!r) esiti.push({ chiave, esito: 'Palazzo assente' });
      else if (occorrenze(r.note, n.nuova) === 1 && occorrenze(r.note, n.vecchia) === 0) esiti.push({ chiave, esito: 'già corretta' });
      else if (occorrenze(r.note, n.vecchia) !== 1) esiti.push({ chiave, esito: 'nota diversa da quella attesa: non toccata' });
      else {
        if (db.prepare('UPDATE main.dungeon SET note = ? WHERE chiave = ? AND note = ?').run(r.note.replace(n.vecchia, n.nuova), n.chiave, r.note).changes !== 1) errore('la nota del Palazzo di Kaneshiro non si aggiorna');
        dungeonToccati.add(n.chiave);
        esiti.push({ chiave, esito: 'corretta', prima: n.vecchia, dopo: n.nuova, perche: 'date vecchie: «Sì, allineali tutti»' });
      }
    }

    // (3) la condizione del Biliardo
    const b = db.prepare('SELECT condizioni_json, origine, seed_json FROM main.attivita WHERE chiave = ?').get(BILIARDO.chiave) as
      { condizioni_json: string | null; origine: string; seed_json: string | null } | undefined;
    const chiaveB = `attivita:${BILIARDO.chiave}`;
    if (!b) esiti.push({ chiave: chiaveB, esito: 'attività assente' });
    else if (b.condizioni_json === BILIARDO.dopo) esiti.push({ chiave: chiaveB, esito: 'già corretta' });
    else if (b.condizioni_json !== BILIARDO.prima || b.origine !== 'seed' || b.seed_json !== null) esiti.push({ chiave: chiaveB, esito: 'condizioni diverse da quelle attese o corrette dall\'utente: non toccate' });
    else if (!db.prepare("SELECT 1 FROM main.confidente WHERE chiave = 'akechi'").get()) esiti.push({ chiave: chiaveB, esito: 'Confidente Akechi assente: non toccata' });
    else {
      if (db.prepare('UPDATE main.attivita SET condizioni_json = ? WHERE chiave = ? AND condizioni_json = ?').run(BILIARDO.dopo, BILIARDO.chiave, BILIARDO.prima).changes !== 1) errore('la condizione del Biliardo non si aggiorna');
      attivitaToccate.add(BILIARDO.chiave);
      esiti.push({ chiave: chiaveB, esito: 'corretta', prima: BILIARDO.prima, dopo: BILIARDO.dopo, perche: 'Biliardo: «Sì, rango 2 di Akechi»' });
    }

    // le verifiche: solo le righe dell'elenco sono cambiate
    const fuori = [
      ...diverseFuori(eventiPrima, righePerChiave(db, 'evento_calendario', ['id']), eventiToccati).map((k) => `evento_calendario ${k}`),
      ...diverseFuori(giorniPrima, righePerChiave(db, 'giorno', ['data']), giorniToccati).map((k) => `giorno ${k}`),
      ...diverseFuori(attivitaPrima, righePerChiave(db, 'attivita', ['chiave']), attivitaToccate).map((k) => `attivita ${k}`),
      ...diverseFuori(collegamentiPrima, righePerChiave(db, 'evento_calendario_voce', ['evento_id', 'voce_uid']), collegamentiToccati).map((k) => `evento_calendario_voce ${k}`),
      ...diverseFuori(settimanePrima, righePerChiave(db, 'settimana_guida', ['numero']), settimaneToccate).map((k) => `settimana_guida ${k}`),
      ...diverseFuori(dungeonPrima, righePerChiave(db, 'dungeon', ['chiave']), dungeonToccati).map((k) => `dungeon ${k}`),
    ];
    if (fuori.length) errore(`righe cambiate fuori dall'elenco: ${fuori.slice(0, 5).join(', ')}`);
    for (const [t, h] of intattePrima) if (improntaTabella(db, t) !== h) errore(`la tabella ${t} è cambiata`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');

    const cambiato = eventiToccati.size + giorniToccati.size + attivitaToccate.size + settimaneToccate.size + dungeonToccati.size > 0;
    scriviAudit(db, AUDIT, 342, { esiti }, cambiato);
    logger.info({ migrazione: 342, esiti: esiti.map((e) => `${e.chiave}: ${e.esito}`) }, 'date di Kaneshiro, Medjed, Niijima, lettera a Kamoshida e Biliardo');
  },
};
