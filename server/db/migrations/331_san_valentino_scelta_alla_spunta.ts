// ============================================================
// Migrazione 331 — San Valentino: con chi si passa il 14 febbraio si sceglie alla spunta, e i cioccolatini di Ryuji e Sojiro ne seguono la regola
// ============================================================
//
// Specifica dell'utente sui doni legati alla relazione romantica: «Sì, in automatico». Per i cioccolatini di Ryuji e Sojiro la guida Royal dà
// la regola (https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/ e /oggetti/, lette il 2026-10-31): Ryuji «si ottiene se il
// protagonista sceglie di non rispondere alle richieste della propria ragazza»; Sojiro «se il protagonista ha almeno una fidanzata con cui non
// ha trascorso del tempo». Dipendono da con chi si passa il 14 febbraio: la scelta la fa chi gioca alla spunta della voce del Diario del 14
// febbraio (`68250d6b…`, «Scena di San Valentino gestita automaticamente dal gioco in base al partner scelto…»), con il meccanismo già
// esistente degli esiti di un'attività scelti alla spunta (`attivita.esiti_json`, modo «scelta», come la lotteria e la pianta della mansarda;
// `shared/esitiAttivita.ts`): niente meccanismo nuovo.
//
// L'ATTIVITÀ `san-valentino` (solo il 14 febbraio, di sera), con gli esiti costruiti dai Confidenti romanzabili del DB (`confidente.romanzabile`,
// nessun nome scritto qui). Le condizioni di ogni esito usano le relazioni romantiche registrate nella partita, iniziate entro il 14 febbraio:
// alla spunta si possono scegliere solo gli esiti veri (gli altri sono rifiutati, 409 `esito-non-disponibile`).
//   - «Con X, l'unica fidanzata» [relazione con X; al più una relazione]: niente da Ryuji né da Sojiro;
//   - «Con X, con altre fidanzate» [relazione con X; più di una relazione]: un'altra fidanzata resta senza il protagonista → il Cioccolato di
//     Sojiro (oggetto dell'esito);
//   - «Con nessuna: richieste della ragazza ignorate» [almeno una relazione]: il Cioccolato di Ryuji e quello di Sojiro;
//   - «Senza fidanzata» [nessuna relazione]: niente.
// Il cioccolato della fidanzata resta quello della sua regola (migrazione 327): non si ripete qui. Gli oggetti di un esito entrano fra gli
// oggetti ottenuti registrando il turno e se ne vanno togliendo la spunta (`oggettiDegliEsitiService`): i due doni di `ricompensa_oggetto` di
// Ryuji e Sojiro restano senza regola propria (la regola è l'esito: un dato solo, niente doppioni).
// LA VOCE del 14 febbraio, riconosciuta da uid, giorno, genere e inizio del testo, riceve in coda l'effetto «turno» dell'attività, senza esito
// dichiarato (si sceglie alla spunta), con i servizi (`aggiornaVoce` → `salvaEffettiVoce`: verifiche dell'effetto). Fuori dal periodo validato.
// Una voce già spuntata non sceglie da sola: l'effetto diventa la proposta «Applica», che chiede di togliere e rimettere la spunta per scegliere.
// Conservativa, idempotente (attività già presente con gli stessi esiti, effetto già sulla voce: niente da fare), dentro la transazione della
// migrazione. Audit in `dati_guida.audit-331-san-valentino`. Usa la connessione dei servizi (come la 326).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { getDb } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, creaAttivita, scriviAuditFbis } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { aggiornaVoce } from '../../services/giornataService.js';
import { leggiEffettiVoce } from '../../services/motoreDiario.js';
import { leggiEsitiAttivita, type EsitiAttivita, type EsitoAttivita } from '../../../shared/esitiAttivita.js';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';

const AUDIT = 'audit-331-san-valentino';
const errore = (motivo: string): never => { throw new Error(`331: ${motivo}; nessuna modifica applicata.`); };
const ATTIVITA = 'san-valentino';
const VOCE = '68250d6bd39d47f0edd98f5fc2ce324f';
const GIORNO = '02-14';
const INIZIO_TESTO = 'Scena di San Valentino';
const RYUJI = 'consumabile/cioccolato-di-ryuji';
const SOJIRO = 'consumabile/cioccolato-di-sojiro';
const FONTI = ['https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/', 'https://www.allgamestaff.it/persona-5-royal/oggetti/'];
const DETTAGLI = 'Il 14 febbraio, di sera, si sceglie con chi passarlo: con la fidanzata (se è l’unica, o con altre fidanzate che restano sole), con nessuna ignorando le richieste della propria ragazza, o senza fidanzata. Dalla scelta e dalle relazioni romantiche della partita dipendono il Cioccolato di Ryuji (richieste della ragazza ignorate) e quello di Sojiro (almeno una fidanzata con cui non si è passato del tempo).';

const relazione = (confidente: string): RequisitoSpillo => ({ tipo: 'relazione-romantica', confidente, entro: GIORNO });
const alPiu = (n: number): RequisitoSpillo => ({ tipo: 'relazioni-romantiche', al_piu: n, entro: GIORNO });
const non = (c: RequisitoSpillo): RequisitoSpillo => ({ tipo: 'non', condizione: c });
const base = (chiave: string, nome: string, condizioni: RequisitoSpillo[], oggetti?: string[]): EsitoAttivita => ({
  chiave, nome, gruppo: null, articolo: null, condizioni, doti: [], premi: null, ...(oggetti ? { oggetti: oggetti.map((oggetto) => ({ oggetto, quantita: 1 })) } : {}),
});

export const migration331: Migration = {
  id: 331,
  name: 'san_valentino_scelta_alla_spunta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'confidente', 'catalogo_oggetto', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 331, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json') || !haColonna(db, 'confidente', 'romanzabile')) { logger.warn({ migrazione: 331 }, 'esiti delle attività o Confidenti romanzabili assenti: niente da fare'); return; }
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    if (!stessaConnessione) { logger.warn({ migrazione: 331 }, 'la migrazione non usa la connessione dei servizi: niente da fare'); return; }
    const audit = (esito: Record<string, unknown>, cambiato: boolean): void => scriviAuditFbis(db, AUDIT, 331, { lotto: 'A1-dati', fonti: FONTI, decisioneDellUtente: '«Sì, in automatico» (31/10)', ...esito }, cambiato);
    const voce = db.prepare('SELECT data, genere, azione FROM main.voce_giornata WHERE uid = ?').get(VOCE) as { data: string; genere: string; azione: string } | undefined;
    const perche = !voce ? 'la voce di San Valentino (68250d6b…) non c’è in questo file di gioco'
      : voce.data !== GIORNO || voce.genere !== 'azione' || !voce.azione.startsWith(INIZIO_TESTO) ? 'la voce di San Valentino non è quella letta (giorno, genere o testo diversi): non si tocca' : null;
    if (perche) {
      audit({ esito: 'niente da fare', perche }, !db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT));
      logger.info({ migrazione: 331, perche }, 'San Valentino: niente da fare');
      return;
    }
    for (const o of [RYUJI, SOJIRO]) if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(o)) errore(`l'oggetto ${o} non è nel catalogo`);

    // gli esiti, dai Confidenti romanzabili del DB nell'ordine dei Confidenti
    const romanzabili = db.prepare('SELECT chiave, nome FROM main.confidente WHERE romanzabile = 1 ORDER BY ordine, chiave').all() as Array<{ chiave: string; nome: string }>;
    if (!romanzabili.length) errore('nessun Confidente romanzabile nel DB');
    const esiti: EsitoAttivita[] = [];
    for (const c of romanzabili) {
      esiti.push(base(`con-${c.chiave}`, `Con ${c.nome}, l’unica fidanzata`, [relazione(c.chiave), alPiu(1)]));
      esiti.push(base(`con-${c.chiave}-altre`, `Con ${c.nome}, con altre fidanzate`, [relazione(c.chiave), non(alPiu(1))], [SOJIRO]));
    }
    esiti.push(base('nessuna', 'Con nessuna: richieste della propria ragazza ignorate', [non(alPiu(0))], [RYUJI, SOJIRO]));
    esiti.push(base('senza-fidanzata', 'Senza fidanzata', [alPiu(0)]));
    const json = JSON.stringify({ modo: 'scelta', esiti } satisfies EsitiAttivita);
    if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti di San Valentino non si rileggono validi');

    // l'attività: nuova, o già presente con gli stessi esiti (una diversa, scritta da chi gioca, non si tocca e ferma la migrazione)
    const presente = db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').get(ATTIVITA) as { esiti_json: string | null } | undefined;
    if (presente && canonico(leggiEsitiAttivita(presente.esiti_json)) !== canonico(JSON.parse(json))) errore('l’attività san-valentino c’è già con esiti diversi');
    const adesso = new Date().toISOString();
    const attivita = creaAttivita(db, { chiave: ATTIVITA, nome: 'San Valentino: con chi passi il 14 febbraio', tipo: 'altro', luogo: 'Tokyo', quartiere: '', sede: '', fascia: 'sera',
      fonte: FONTI.join(' ; '), dettagli: DETTAGLI, condizioni: [{ tipo: 'intervallo', dal: GIORNO, al: GIORNO }], esiti: json }, adesso);

    // la voce: l'effetto «turno» dell'attività in coda, senza esito (si sceglie alla spunta)
    const turno: EffettoVoce = { tipo: 'turno', attivita: ATTIVITA };
    const fonte = leggiEffettiVoce(VOCE);
    if (fonte.stato !== 'convertita') errore('la fonte degli effetti della voce non è convertita');
    const conTurno = fonte.effetti.some((e) => e.effetto.tipo === 'turno' && e.effetto.attivita === ATTIVITA);
    const partiteConSpunta = db.prepare('SELECT partita_id FROM utente.spunta_voce_partita WHERE voce_uid = ? ORDER BY partita_id').pluck().all(VOCE) as number[];
    if (!conTurno) aggiornaVoce(VOCE, { effettiVoce: { effetti: [...fonte.effetti.map((e) => ({ uid: e.uid as string | null, effetto: e.effetto })), { uid: null, effetto: turno }], revisioneEffettiAttesa: fonte.revisione } });
    const dopo = leggiEffettiVoce(VOCE);
    if (dopo.effetti.filter((e) => e.effetto.tipo === 'turno' && e.effetto.attivita === ATTIVITA).length !== 1) errore('l’effetto «turno» di San Valentino non è sulla voce una volta sola');
    const cambiato = attivita.esito.startsWith('creata') || !conTurno;
    if (cambiato) invalidaCacheDiGioco();
    const conteggi = { attivita: attivita.esito, esiti: esiti.length, romanzabili: romanzabili.length, effettoAggiunto: !conTurno, effettiPrima: fonte.effetti.length, effettiDopo: dopo.effetti.length, partiteConSpunta };
    audit({ voce: VOCE, giorno: GIORNO, conteggi, esitiChiavi: esiti.map((e) => e.chiave) }, cambiato);
    logger.info({ migrazione: 331, ...conteggi }, 'San Valentino: la scelta alla spunta e i cioccolatini di Ryuji e Sojiro');
  },
};
