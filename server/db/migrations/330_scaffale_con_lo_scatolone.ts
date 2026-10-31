// ============================================================
// Migrazione 330 — gli effetti dello Scaffale con lo scatolone in mansarda (12 aprile), con le condizioni delle impostazioni della partita
// ============================================================
//
// Richiesta dell'utente, testuale: «Al Leblanc, esaminare lo Scaffale con lo scatolone in mansarda per riscattare i contenuti aggiuntivi e le
// ricompense da salvataggio di Persona 5»: impostazioni di partita «Salvataggio di P5» e «Pacchetti DLC posseduti», ed effetti con condizione.
// La valutazione della soluzione è lasciata a chi implementa. Le impostazioni sono della partita (`partita.salvataggio_p5`, utente 061;
// `partita.dlc_posseduti_json`, lo stesso dato della Fusione); gli effetti sono quelli di sempre della voce, con le condizioni
// (`CondizioniEffetto`, `shared/effettiVoce.ts`) del vocabolario unico (`salvataggio-p5`, `dlc-posseduto`): valgono solo se la partita ha
// l'impostazione, allo stato della partita al giorno della voce, alla spunta.
//
// FONTI (lette il 2026-10-31; nel DB: `dati_guida.completamento.dlc`, la riga del Diario e la sua nota):
//   - https://www.allgamestaff.it/persona-5-royal/elenco-dlc-bonus/ — «Bonus per importazione salvataggio da Persona 5»: 50.000 yen, Catena di
//     perline x3, Perlina rigenerante x3 (non serve aver completato Persona 5);
//   - https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-1/ — il 12 aprile, dallo scaffale con lo scatolone in mansarda, i
//     contenuti aggiuntivi (che dipendono dalla versione acquistata) e le ricompense del salvataggio di Persona 5 («numerose chicche» e 50.000
//     Yen); «Le Personae bonus si registrano nel Registro del Prigioniero, nella Stanza di Velluto».
// NON DOCUMENTATO (non si inventa, resta fuori): il contenuto in oggetti dei pacchetti a pagamento (set di oggetti di guarigione, set di carte
// abilità, assistenza in battaglia ed esplorazione, i 100.000 Yen citati senza dire di quale versione, costumi e musiche): nessuna fonte dice
// nomi e quantità per pacchetto. Dei contenuti scaricabili l'app modella le Persona (i set di `dlc_set`, quelli che la partita segna): la voce le
// registra nel Compendio (effetto «Persona», solo Compendio), una per Persona del set, solo se il set è posseduto.
// DISCREPANZA delle fonti (annotata, non fusa): la pagina «Oggetti» della guida dice «Bonus per un file di salvataggio di Persona 5» per la Mela
// Hogyoku e il Band-Ace (stessi effetti di Catena di perline e Perlina rigenerante, senza quantità); vale l'elenco dei bonus, l'unica fonte con
// nomi e quantità del bonus.
//
// COSA (conservativa, idempotente, dentro la transazione della migrazione). La voce `06a35293…` del 12 aprile, riconosciuta da uid e testo
// esatto, azione con la fonte degli effetti convertita, riceve IN CODA ai suoi effetti (quelli che ha restano):
//   - Yen ricevuti 50.000 [salvataggio di Persona 5 presente];
//   - Oggetto ricevuto: Catena di perline ×3, Perlina rigenerante ×3 [salvataggio di Persona 5 presente];
//   - Persona registrata nel Compendio, per ogni Persona di ogni set di `dlc_set` (nell'ordine dei set) [contenuto scaricabile di quel set
//     posseduto]. Le Persona si leggono dal DB, nessun nome qui.
// Un effetto già presente uguale (stesso effetto, stesse condizioni) non si ripete. Con i servizi della pagina «Da completare»: la proposta
// aperta L13-4b-06a35293-01-b-yen («i 50.000 yen… si ricevono solo se c'è quel salvataggio», da verificare) si chiude come applicata con la voce
// composta qui (`applicaPropostaConversione` → `aggiornaVoce` → `salvaEffettiVoce`: verifiche di ogni effetto e delle condizioni); senza la
// proposta aperta gli effetti si aggiungono con `aggiornaVoce`.
// La voce è nel periodo validato (12 aprile): testo, pin e ordine non cambiano, si aggiungono solo effetti con condizioni. Le partite non
// cambiano: nessuna ha l'impostazione (la colonna del salvataggio nasce con la 061 a «no»; la finestra per segnare i contenuti scaricabili nasce
// con questo lavoro) e gli effetti con condizioni false non si applicano, nemmeno a una voce già spuntata. Se una partita con la spunta avesse
// già un'impostazione accesa, il salvataggio degli effetti la tratta come ogni salvataggio (decisione 19): l'audit lo conta. Altrimenti le partite
// devono restare identiche: una differenza annulla la migrazione. Audit in `dati_guida.audit-330-scaffale-scatolone`. Usa la connessione dei
// servizi (come la 326).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { canonico, impronta, scriviAuditFbis } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';
import { aggiornaVoce } from '../../services/giornataService.js';
import { leggiEffettiVoce } from '../../services/motoreDiario.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import type { DatiVoceGiornata } from '../../../shared/types.js';

const AUDIT = 'audit-330-scaffale-scatolone';
const errore = (motivo: string): never => { throw new Error(`330: ${motivo}; nessuna modifica applicata.`); };
const VOCE = '06a3529341b9c4d8e46a25e01a21e19c';
const GIORNO = '04-12';
const TESTO = 'Al Leblanc, esaminare lo Scaffale con lo scatolone in mansarda per riscattare i contenuti aggiuntivi e le ricompense da salvataggio di Persona 5';
const PROPOSTA = 'L13-4b-06a35293-01-b-yen';
const FONTI = ['https://www.allgamestaff.it/persona-5-royal/elenco-dlc-bonus/', 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-1/'];
const RICHIESTA_UTENTE = '«Al Leblanc, esaminare lo Scaffale con lo scatolone in mansarda per riscattare i contenuti aggiuntivi e le ricompense da salvataggio di Persona 5»';
/** Il bonus del salvataggio di Persona 5 (elenco dei bonus della guida): gli yen e gli oggetti del catalogo, con le copie. */
const YEN_SALVATAGGIO = 50_000;
const OGGETTI_SALVATAGGIO: ReadonlyArray<{ oggetto: string; quantita: number }> = [
  { oggetto: 'consumabile/catena-di-perline', quantita: 3 },
  { oggetto: 'consumabile/perlina-rigenerante', quantita: 3 },
];
const NON_DOCUMENTATO = 'il contenuto in oggetti dei pacchetti a pagamento (oggetti di guarigione, carte abilità, assistenza, i 100.000 Yen, costumi e musiche): nessuna fonte dice nomi e quantità per pacchetto';

/** Un'impronta delle tabelle delle partite (righe e contenuto): una spunta o un salvataggio di effetti le può toccare. */
function improntaPartite(db: AppDatabase): string {
  const tabelle = db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[];
  return impronta(tabelle.map((t) => [t, db.prepare(`SELECT * FROM utente."${t}" ORDER BY rowid`).all()]));
}

export const migration330: Migration = {
  id: 330,
  name: 'scaffale_con_lo_scatolone',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'proposta_conversione_voce', 'dlc_set', 'dlc_set_persona', 'catalogo_oggetto', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 330, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    if (!stessaConnessione) { logger.warn({ migrazione: 330 }, 'la migrazione non usa la connessione dei servizi: niente da fare'); return; }
    const audit = (esito: Record<string, unknown>, cambiato: boolean): void => scriviAuditFbis(db, AUDIT, 330, { lotto: 'A1-dati', richiestaDellUtente: RICHIESTA_UTENTE, fonti: FONTI, nonDocumentato: NON_DOCUMENTATO, ...esito }, cambiato);
    const voce = db.prepare('SELECT data, genere, azione FROM main.voce_giornata WHERE uid = ?').get(VOCE) as { data: string; genere: string; azione: string } | undefined;
    const perche = !voce ? 'la voce dello Scaffale (06a35293…) non c’è in questo file di gioco'
      : voce.data !== GIORNO || voce.genere !== 'azione' || voce.azione !== TESTO ? 'la voce dello Scaffale non è quella letta (giorno, genere o testo diversi): non si tocca' : null;
    if (perche) {
      audit({ esito: 'niente da fare', perche }, !db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT));
      logger.info({ migrazione: 330, perche }, 'Scaffale con lo scatolone: niente da fare');
      return;
    }
    // gli oggetti del bonus devono esserci nel catalogo (l'effetto «oggetto ricevuto» li cita per chiave)
    for (const o of OGGETTI_SALVATAGGIO) if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(o.oggetto)) errore(`l'oggetto ${o.oggetto} non è nel catalogo`);

    // gli effetti da aggiungere, in ordine: il bonus del salvataggio, poi le Persona di ogni set (dal DB)
    const salvataggio = [{ tipo: 'salvataggio-p5' as const }];
    const nuovi: EffettoVoce[] = [
      { tipo: 'yen', importo: YEN_SALVATAGGIO, condizioni: salvataggio },
      ...OGGETTI_SALVATAGGIO.map((o): EffettoVoce => ({ tipo: 'oggetto', oggetto: o.oggetto, quantita: o.quantita, condizioni: salvataggio })),
    ];
    const persone = db.prepare(`SELECT d.set_id, d.persona_id, p.nome FROM main.dlc_set_persona d JOIN main.dlc_set s ON s.id = d.set_id JOIN main.persona p ON p.id = d.persona_id
      ORDER BY s.ordine, s.id, p.livello, p.nome`).all() as Array<{ set_id: number; persona_id: number; nome: string }>;
    for (const p of persone) nuovi.push({ tipo: 'persona', persona: p.persona_id, condizioni: [{ tipo: 'dlc-posseduto', set: p.set_id }] });
    // la forma canonica di ogni effetto (condizioni comprese), com'è letta e salvata dai servizi
    const canonici = nuovi.map((e) => { const n = normalizzaEffettoVoce(e); if (!n || canonico(n) !== canonico(e)) errore(`un effetto nuovo non è canonico (${canonico(e)})`); return n!; });

    const fonte = leggiEffettiVoce(VOCE);
    if (fonte.stato !== 'convertita') errore('la fonte degli effetti della voce non è convertita');
    const daAggiungere = canonici.filter((n) => !fonte.effetti.some((e) => canonico(e.effetto) === canonico(n)));
    const proposta = db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ? AND voce_uid = ?').get(PROPOSTA, VOCE) as { stato: string } | undefined;
    const partiteConSpunta = db.prepare('SELECT partita_id FROM utente.spunta_voce_partita WHERE voce_uid = ? ORDER BY partita_id').pluck().all(VOCE) as number[];
    const conSalvataggio = !!db.prepare("SELECT 1 FROM pragma_table_info('partita', 'utente') WHERE name = 'salvataggio_p5'").get();
    const conImpostazioni = db.prepare(`SELECT p.id FROM utente.partita p JOIN utente.spunta_voce_partita s ON s.partita_id = p.id AND s.voce_uid = ?
      WHERE ${conSalvataggio ? 'p.salvataggio_p5 = 1 OR ' : ''}json_array_length(p.dlc_posseduti_json) > 0 ORDER BY p.id`).pluck().all(VOCE) as number[];
    const partitePrima = improntaPartite(db);
    const dati: DatiVoceGiornata = daAggiungere.length
      ? { effettiVoce: { effetti: [...fonte.effetti.map((e) => ({ uid: e.uid as string | null, effetto: e.effetto })), ...daAggiungere.map((effetto) => ({ uid: null, effetto }))], revisioneEffettiAttesa: fonte.revisione } }
      : {};
    let modo: string;
    if (proposta?.stato === 'aperta') {
      const dto = elencaProposteConversione({ da: GIORNO, a: GIORNO, stato: 'aperta' }).find((d) => d.id === PROPOSTA);
      if (!dto) errore(`la proposta ${PROPOSTA} non si legge fra le aperte`);
      applicaPropostaConversione(PROPOSTA, { revisionePropostaAttesa: dto!.revisione, voce: dati });
      modo = 'proposta applicata con gli effetti con condizione';
    } else if (daAggiungere.length) {
      aggiornaVoce(VOCE, dati);
      modo = proposta ? `proposta già ${proposta.stato}: effetti aggiunti` : 'proposta assente: effetti aggiunti';
    } else modo = 'già fatto';

    // le verifiche dopo le scritture
    const dopo = leggiEffettiVoce(VOCE);
    for (const n of canonici) if (dopo.effetti.filter((e) => canonico(e.effetto) === canonico(n)).length !== 1) errore(`l'effetto ${canonico(n)} non è sulla voce una volta sola`);
    if (dopo.effetti.length !== fonte.effetti.length + daAggiungere.length) errore('gli effetti di prima della voce non sono rimasti com’erano');
    if (proposta && (db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(PROPOSTA) as string) === 'aperta') errore(`la proposta ${PROPOSTA} è ancora aperta`);
    const partiteCambiate = improntaPartite(db) !== partitePrima;
    if (partiteCambiate && !conImpostazioni.length) errore('le partite sono cambiate senza che nessuna avesse le impostazioni dei contenuti');
    const cambiato = modo !== 'già fatto';
    if (cambiato) invalidaCacheDiGioco();
    const conteggi = {
      effettiPrima: fonte.effetti.length, effettiDopo: dopo.effetti.length, aggiunti: daAggiungere.length, attesi: canonici.length,
      perTipo: { yen: 1, oggetti: OGGETTI_SALVATAGGIO.length, persone: persone.length }, setDlc: new Set(persone.map((p) => p.set_id)).size,
      modo, partiteConSpunta, partiteConImpostazioni: conImpostazioni, partiteCambiate,
    };
    audit({ voce: VOCE, giorno: GIORNO, proposta: PROPOSTA, conteggi, discrepanza: 'la pagina «Oggetti» cita Mela Hogyoku e Band-Ace come bonus del salvataggio di Persona 5, senza quantità: vale l’elenco dei bonus (Catena di perline x3, Perlina rigenerante x3)' }, cambiato);
    logger.info({ migrazione: 330, ...conteggi }, 'Scaffale con lo scatolone: effetti con le condizioni delle impostazioni della partita');
  },
};
