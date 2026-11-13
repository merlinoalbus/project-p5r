// ============================================================
// Utente 074 — una voce di racconto e i suoi pin hanno un segno solo (richiesta dell'utente del 2026-11-13)
// ============================================================
//
// Segnalazione: la voce «Esamina Montagna di Soldi» (tipo Storia, carattere «Racconto»), collegata al pin «Montagna di Soldi», segnata come
// letta non segnava raccolto il pin, e raccogliere il pin non la segnava letta: due stati per la stessa cosa. Da qui una voce di racconto
// con uno stato e con dei pin sulle planimetrie calcola il suo stato dai suoi pin, come le voci permanenti e quelle che si ripropongono
// (`voceDaiPin` in `services/mappe/statiGuida.ts`); continua a non contare nel completamento.
//
// I casi già in disaccordo, per decisione dell'utente («A: se uno dei due è segnato, diventano segnati entrambi»), in ogni partita:
//   1. una voce di racconto con pin che risulta letta (`punto_partita`) segna raccolti i suoi pin ancora da raccogliere, ognuno dove la voce
//      lo legge (un pin condiviso dai rigenerabili di più infiltrazioni, nella sua infiltrazione: `infiltrazioneDelPinPerLaVoce`);
//   2. poi gli specchi delle voci con pin si rifanno (`riallineaStati`, la stessa strada di un'importazione delle partite): una voce di
//      racconto con tutti i pin già raccolti risulta letta; le altre voci che leggono un pin appena segnato si ricalcolano, e gli Enigmi
//      seguono i loro passi.
// Una voce di racconto non letta con solo una parte dei pin raccolti resta com'è («in corso k/N»): nessuno dei due stati era «fatto».
//
// Usa le funzioni vive degli stati (come la 017). Di norma gira dopo le migrazioni di gioco, quindi lo schema è quello che quelle funzioni
// leggono. Con un file delle partite nuovo il runner inverte l'ordine (`runMigrations`: prima le partite, poi il gioco, sullo schema del
// pacchetto): lì non c'è nessuna partita, e senza partite la migrazione esce prima di leggere il modello. Senza le tabelle di gioco o delle
// partite che servono non fa niente. Idempotente: la seconda volta non trova pin da segnare e gli specchi sono già a posto. Una copia
// delle partite di prima che torni indietro passa di nuovo di qui.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { infiltrazioneDelPinPerLaVoce, modelloAvanzamento, riallineaStati, scriviSegnoDelPin, voceDaiPin } from '../../services/mappe/statiGuida.js';

const errore = (motivo: string): never => { throw new Error(`utente 074: ${motivo}; nessuna modifica applicata.`); };

export const utente074: Migration = {
  id: 74,
  name: 'racconto_e_pin_uniti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const haTabella = (schema: 'main' | 'utente', nome: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
    if (!['punto_interesse', 'dungeon_area', 'spillo', 'spillo_voce'].every((t) => haTabella('main', t))) return;
    if (!['partita', 'punto_partita', 'spillo_partita'].every((t) => haTabella('utente', t))) return;
    const colonne = (tabella: string) => (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
    // senza il carattere delle voci (111) o l'uid dei pin non c'è nessuna voce di racconto con pin da unire
    if (!colonne('punto_interesse').includes('carattere') || !colonne('spillo').includes('uid')) return;

    // senza partite non c'è nessuno stato da unire (il primo avvio dal pacchetto, con il file delle partite appena creato): si esce prima
    // di leggere il modello, che lì troverebbe lo schema di gioco del pacchetto, non ancora migrato
    const partite = db.prepare('SELECT id FROM utente.partita ORDER BY id').pluck().all() as number[];
    if (partite.length === 0) return;
    const adesso = new Date().toISOString();
    const m = modelloAvanzamento(db);
    const racconti = [...m.voci.values()].filter((v) => v.carattere === 'descrittiva' && voceDaiPin(m, v.chiave));
    if (racconti.length === 0) return;
    const letta = db.prepare('SELECT 1 FROM utente.punto_partita WHERE partita_id = ? AND punto_chiave = ?');
    const righeVoci = db.prepare('SELECT COUNT(*) FROM utente.punto_partita').pluck();
    const vociPrima = righeVoci.get() as number;

    // 1. le voci di racconto lette segnano i loro pin
    const pinSegnati: Array<{ partita: number; voce: string; pin: string }> = [];
    for (const partita of partite) {
      for (const v of racconti) {
        if (!letta.get(partita, v.chiave)) continue;
        for (const p of m.pinDellaVoce.get(v.chiave) ?? []) {
          if (scriviSegnoDelPin(db, partita, p.uid, infiltrazioneDelPinPerLaVoce(m, p.id, v.infiltrazione), true, adesso)) pinSegnati.push({ partita, voce: v.chiave, pin: p.uid });
        }
      }
    }
    // 2. gli specchi delle voci con pin, gli Enigmi e le divergenze risolte, in ogni partita
    riallineaStati(db, null, adesso);

    // ogni voce di racconto con pin risulta letta se e solo se i suoi pin sono tutti raccolti
    const raccolto = db.prepare('SELECT 1 FROM utente.spillo_partita WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1');
    const perInfiltrazione = haTabella('utente', 'spillo_partita_infiltrazione')
      ? db.prepare('SELECT 1 FROM utente.spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ? AND infiltrazione_chiave = ? AND raccolto = 1') : null;
    let lette = 0;
    for (const partita of partite) {
      for (const v of racconti) {
        const pin = m.pinDellaVoce.get(v.chiave) ?? [];
        const fatti = pin.filter((p) => {
          const nel = infiltrazioneDelPinPerLaVoce(m, p.id, v.infiltrazione);
          return nel && perInfiltrazione ? !!perInfiltrazione.get(partita, p.uid, nel) : !!raccolto.get(partita, p.uid);
        }).length;
        const eLetta = !!letta.get(partita, v.chiave);
        if (eLetta !== (fatti === pin.length)) errore(`la voce «${v.nome}» (${v.chiave}) della partita ${partita} ha ${fatti} pin raccolti su ${pin.length} ma ${eLetta ? 'risulta' : 'non risulta'} letta`);
        if (eLetta) lette++;
      }
    }
    logger.info({ migrazione: 'utente-074', vociDiRaccontoConPin: racconti.length, partite: partite.length, pinSegnati, vociSegnateInPiu: (righeVoci.get() as number) - vociPrima, vociDiRaccontoLette: lette },
      'voci di racconto e pin uniti: una voce letta ha segnato i suoi pin, i pin tutti raccolti hanno segnato la voce');
  },
};
