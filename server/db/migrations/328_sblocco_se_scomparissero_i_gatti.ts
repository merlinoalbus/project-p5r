// ============================================================
// Migrazione 328 — la Richiesta «Se scomparissero i gatti» si sblocca con l'indagine nei vicoli di Yongen-Jaya
// ============================================================
//
// Richiesta dell'utente: la Richiesta «diventa gestibile dopo aver trovato il nome indagando nei vicoli di Yongen» e «l'effetto di un'attività
// sia quello di sbloccare una richiesta dei Memento»; l'utente ha confermato che lo sblocco va sulla voce del 2 giugno, l'indagine nei vicoli
// («… una certa "Aino" che d'un tratto ha adottato un sacco di gatti… otterrete il nome del rapitore: "Ryoko Aino"»), voce che l'utente ha
// aggiunto al Diario dopo la v6 (uid `464fa2de…`). Il meccanismo c'è già (L13, decisioni 1 e 17): l'effetto «sblocco» della voce
// (`utente.sblocco_partita`) e la condizione «sblocco ricevuto» nelle condizioni della Richiesta (`richiesta.condizioni_json`, migrazione 235),
// che fa comparire «Accetta» solo quando vale.
//
// COSA (conservativa, idempotente, dentro la transazione della migrazione):
//   1. la Richiesta: alle sue condizioni si aggiunge, in coda, «sblocco ricevuto: Richiesta "Se scomparissero i gatti"» (le altre restano come
//      sono, anche se l'utente le ha cambiate: si aggiunge, non si sostituisce); già presente = niente da fare;
//   2. la voce: con i servizi della pagina «Da completare» (`applicaPropostaConversione` con la voce composta, `aggiornaVoce` →
//      `salvaEffettiVoce`: verifiche di ogni effetto, UID e revisione), la proposta aperta L13-4b-464fa2de-01-a-riferimento-mancante (tipo
//      «Richiesta» collegato alla Richiesta, certezza «probabile» perché la voce non nomina la Richiesta: la conferma dell'utente la rende certa)
//      si chiude come applicata, insieme all'effetto «sblocco» della Richiesta in coda agli effetti della voce. Senza la proposta aperta
//      (decisa da chi gioca) l'effetto si aggiunge con `aggiornaVoce`, e il collegamento solo se la voce non ne ha un altro.
// La voce è del 2 giugno, fuori dal periodo validato (fino al 1° giugno): il salvataggio dell'effetto vale subito nelle partite che hanno già
// spuntato la voce (decisione 19, `motoreDiario.riallineaStatiDellaVoce`), con il «prima» registrato come per una spunta nuova: lo sblocco
// c'è, e togliendo la spunta se ne va. Le partite che non hanno la spunta non cambiano: la Richiesta resta senza «Accetta» finché la voce non
// si spunta (prima, senza nessuna voce che desse lo sblocco, la condizione non bloccava: valutatore, `sblocco`).
// La voce si riconosce dall'uid, dal testo («Yongen-Jaya - Vicoli. Svolgi indagine nei Vicoli di Yongen-Jaya.», letto sulla copia recente dei
// dati del 31/10) e dalla nota, che cita «Aino» e il nome del rapitore.
// Se la voce non c'è (un file di gioco senza la voce dell'utente), se non è un'azione, se testo e nota non sono quelli o se è nel periodo validato,
// la migrazione non cambia NIENTE (anche la Richiesta resta com'è: non si scrive un dato a metà) e l'audit dice perché.
// Audit in `dati_guida.audit-328-sblocco-gatti`. Usa la connessione dei servizi (come la 326).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { getDb } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { canonico, scriviAuditFbis } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';
import { aggiornaVoce } from '../../services/giornataService.js';
import { leggiEffettiVoce } from '../../services/motoreDiario.js';
import { leggiCondizioniSalvate, normalizzaCondizioniSpillo, ordineGioco, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import type { DatiVoceGiornata } from '../../../shared/types.js';

const AUDIT = 'audit-328-sblocco-gatti';
const errore = (motivo: string): never => { throw new Error(`328: ${motivo}; nessuna modifica applicata.`); };
const VOCE = '464fa2de9e493e191e888c870a412f78';
const RICHIESTA = 'se-scomparissero-i-gatti';
const PROPOSTA = 'L13-4b-464fa2de-01-a-riferimento-mancante';
/** L'ultimo giorno del periodo validato dall'utente (il Diario fino al 1° giugno). */
const ULTIMO_VALIDATO = '06-01';
const SBLOCCO: EffettoVoce = { tipo: 'sblocco', bersaglio: 'richiesta', chiave: RICHIESTA };
const CONDIZIONE: RequisitoSpillo = { tipo: 'sblocco', bersaglio: 'richiesta', chiave: RICHIESTA };
const DECISIONE = 'lo sblocco va sulla voce del 2 giugno (indagine nei vicoli di Yongen-Jaya)';

type RigaVoce = { uid: string; data: string; genere: string; azione: string; note: string | null; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null };

export const migration328: Migration = {
  id: 328,
  name: 'sblocco_se_scomparissero_i_gatti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['richiesta', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'proposta_conversione_voce', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 328, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const audit = (esito: Record<string, unknown>, cambiato: boolean): void => scriviAuditFbis(db, AUDIT, 328, { lotto: 'A1-dati', decisioneDellUtente: DECISIONE, ...esito }, cambiato);
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    if (!stessaConnessione) { logger.warn({ migrazione: 328 }, 'la migrazione non usa la connessione dei servizi: niente da fare'); return; }
    const richiesta = db.prepare('SELECT chiave, condizioni_json FROM main.richiesta WHERE chiave = ?').get(RICHIESTA) as { chiave: string; condizioni_json: string | null } | undefined;
    const voce = db.prepare('SELECT uid, data, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(VOCE) as RigaVoce | undefined;
    // i controlli: senza la voce giusta non si scrive niente, neanche la condizione della Richiesta
    const perche = !richiesta ? 'la Richiesta «Se scomparissero i gatti» non c’è'
      : !voce ? 'la voce dell’indagine nei vicoli (464fa2de…) non c’è in questo file di gioco'
        : voce.genere !== 'azione' ? 'la voce dell’indagine non è un’azione'
          : !voce.azione.includes('Vicoli di Yongen-Jaya') || !`${voce.azione}\n${voce.note ?? ''}`.includes('Aino') ? 'la voce non è l’indagine nei Vicoli di Yongen-Jaya che cita «Aino»: non è quella letta'
            : ordineGioco(voce.data) <= ordineGioco(ULTIMO_VALIDATO) ? `la voce è del ${voce.data}, nel periodo validato: non si cambia da sola` : null;
    if (perche || !richiesta || !voce) {
      const vecchio = db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT);
      audit({ esito: 'niente da fare', perche }, !vecchio);
      logger.info({ migrazione: 328, perche }, 'sblocco della Richiesta dei gatti: niente da fare');
      return;
    }

    // 1. la condizione della Richiesta, in coda (le altre restano)
    const condizioni = leggiCondizioniSalvate(richiesta.condizioni_json);
    if (richiesta.condizioni_json !== null && normalizzaCondizioniSpillo(JSON.parse(richiesta.condizioni_json)).length !== condizioni.length) errore('le condizioni della Richiesta non si leggono per intero');
    const conSblocco = condizioni.some((c) => canonico(c) === canonico(CONDIZIONE));
    if (!conSblocco) {
      const nuove = [...condizioni, CONDIZIONE];
      if (normalizzaCondizioniSpillo(nuove).length !== nuove.length) errore('le condizioni nuove della Richiesta non sono valide');
      if (db.prepare('UPDATE main.richiesta SET condizioni_json = ? WHERE chiave = ? AND condizioni_json IS ?').run(JSON.stringify(nuove), RICHIESTA, richiesta.condizioni_json).changes !== 1) errore('la condizione della Richiesta non si scrive');
    }

    // 2. la voce: tipo e collegamento della proposta, più l'effetto «sblocco» in coda
    const fonte = leggiEffettiVoce(VOCE);
    if (fonte.stato !== 'convertita') errore('la fonte degli effetti della voce non è convertita');
    const conEffetto = fonte.effetti.some((e) => canonico(e.effetto) === canonico(SBLOCCO));
    const proposta = db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ? AND voce_uid = ?').get(PROPOSTA, VOCE) as { stato: string } | undefined;
    const collegamentoLibero = voce.riferimento_tipo === null || (voce.riferimento_tipo === 'richiesta' && voce.riferimento_chiave === RICHIESTA);
    const dati: DatiVoceGiornata = {
      ...(collegamentoLibero && voce.tipo !== 'richiesta' ? { tipo: 'richiesta' as const } : {}),
      ...(collegamentoLibero && voce.riferimento_tipo === null ? { riferimento: { tipo: 'richiesta' as const, chiave: RICHIESTA } } : {}),
      ...(conEffetto ? {} : { effettiVoce: { effetti: [...fonte.effetti.map((e) => ({ uid: e.uid as string | null, effetto: e.effetto })), { uid: null, effetto: SBLOCCO }], revisioneEffettiAttesa: fonte.revisione } }),
    };
    const partiteConSpunta = db.prepare('SELECT partita_id FROM utente.spunta_voce_partita WHERE voce_uid = ? ORDER BY partita_id').pluck().all(VOCE) as number[];
    const contaSblocchi = (): number => db.prepare("SELECT COUNT(*) FROM utente.sblocco_partita WHERE bersaglio_tipo = 'richiesta' AND bersaglio_chiave = ?").pluck().get(RICHIESTA) as number;
    const sblocchiPrima = contaSblocchi();
    let modo: string;
    if (proposta?.stato === 'aperta') {
      const dto = elencaProposteConversione({ da: voce.data, a: voce.data, stato: 'aperta' }).find((d) => d.id === PROPOSTA);
      if (!dto) errore(`la proposta ${PROPOSTA} non si legge fra le aperte`);
      // la voce composta qui (modo «modifica»): la proposta si chiude come applicata nella stessa transazione della voce
      applicaPropostaConversione(PROPOSTA, { revisionePropostaAttesa: dto!.revisione, voce: dati });
      modo = 'proposta applicata con l’effetto «sblocco»';
    } else if (Object.keys(dati).length) {
      aggiornaVoce(VOCE, dati);
      modo = proposta ? `proposta già ${proposta.stato}: effetto «sblocco» aggiunto alla voce` : 'proposta assente: effetto «sblocco» aggiunto alla voce';
    } else modo = 'già fatto';

    // le verifiche dopo le scritture: l'effetto c'è una volta sola, la proposta (se c'era) è chiusa, la condizione c'è
    const dopo = leggiEffettiVoce(VOCE);
    if (dopo.effetti.filter((e) => canonico(e.effetto) === canonico(SBLOCCO)).length !== 1) errore('l’effetto «sblocco» non è sulla voce una volta sola');
    if (proposta && (db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(PROPOSTA) as string) === 'aperta') errore(`la proposta ${PROPOSTA} è ancora aperta`);
    if (!leggiCondizioniSalvate(db.prepare('SELECT condizioni_json FROM main.richiesta WHERE chiave = ?').pluck().get(RICHIESTA) as string | null).some((c) => canonico(c) === canonico(CONDIZIONE))) errore('la condizione della Richiesta non c’è');
    const sblocchiDopo = contaSblocchi();
    const cambiato = !conSblocco || modo !== 'già fatto';
    if (cambiato) invalidaCacheDiGioco();
    const conteggi = { condizioneAggiunta: !conSblocco, modo, partiteConSpunta, sblocchiPrima, sblocchiDopo };
    audit({ voce: VOCE, giorno: voce.data, richiesta: RICHIESTA, proposta: PROPOSTA, conteggi }, cambiato);
    logger.info({ migrazione: 328, ...conteggi }, 'sblocco della Richiesta «Se scomparissero i gatti» dalla voce dell’indagine');
  },
};
