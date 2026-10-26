// ============================================================
// Migrazione 295 — i doni dei Confidenti come oggetti ricevuti, i raccolti di Haru, la Vaschetta a stella (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Decisione 21, precisazione dell'utente: gli oggetti ricevuti sono fra le cose che l'app gestisce.
//   (1) Censimento F-bis, punto 17: i doni dei Confidenti stanno nel catalogo come ricompense (`ricompensa_oggetto`, fonte «confidente», con la
//       nota della guida) ma nessuna partita li riceveva. Nuova colonna `ricompensa_oggetto.condizioni_json`: la REGOLA del dono, quando la
//       guida la dà in termini che l'app conosce. I 19 doni «al Rango massimo del Confidente, 19 marzo» ricevono [rango 10 del Confidente, dal
//       19 marzo]; la partita li legge dal suo stato (`server/services/doniConfidenti.ts`): nessuna copia, il dono vale finché la regola vale.
//       Restano senza regola, con il motivo nell'audit: i doni legati alla relazione romantica («se fidanzata», i cioccolati del 14 febbraio,
//       i giri choco «rapporto di amicizia» del 15 febbraio, i cioccolati di Ryuji e Sojiro «se il protagonista non ha una fidanzata»), perché
//       l'app non registra la relazione scelta; il Rampino di Morgana (durante l'infiltrazione nel Palazzo di Kamoshida: nessun evento che lo
//       dica) e il Sacchetto di carta di Iwai («mercoledì 5 aprile», informativo).
//   (2) Censimento F-bis, punto 30: le voci dei raccolti di Haru del 12-13, 12-22 e 01-16 non dicono che cosa si raccoglie né quanto: ricevono una
//       proposta «da completare» (l'ortaggio fra i quattro della coltivazione e le copie), da verificare in gioco. La voce dell'11-08 è la semina
//       del Pomodoro solare: il raccolto è la voce dell'11-15, che ha già l'effetto.
//   (3) Censimento F-bis, punto 31: la Vaschetta a stella diceva «per coltivare fiori (avvia la Coltivazione)»; per la guida (pagina di Jose)
//       raddoppia i fiori raccolti nei Memento (lo dice anche la nota della sua ricompensa). I fiori dei Memento non sono un dato della partita:
//       l'effetto resta un testo, corretto.
// Conservativa: una regola si scrive solo dove la colonna è vuota e la nota è esattamente quella attesa; il testo solo se è quello sbagliato
// atteso. Idempotente. Audit in `dati_guida.audit-295-doni-raccolti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FONTE_OGGETTI_CHIAVE, canonico, correggiTesto, nuovaProposta, scriviAuditFbis, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-295-doni-raccolti';
const errore = (motivo: string): never => { throw new Error(`295: ${motivo}; nessuna modifica applicata.`); };
const RANGO_MASSIMO = /^Dono di .+ al Rango massimo del Confidente, 19 marzo$/;
const ORTAGGI = ['consumabile/pomodoro-solare', 'consumabile/carota-chiardiluna', 'consumabile/cipolla-stellare', 'consumabile/fagioli-terrestri'];
const RACCOLTI: ReadonlyArray<{ uid: string; data: string; azione: string }> = [
  { uid: '4f7fe8585d0762565aaa97e9473dbae5', data: '12-13', azione: 'Raccogliere le piante coltivate con Haru' },
  { uid: '8221818e8ca0acf69f94b495ebe25a1f', data: '12-22', azione: 'Raccogliere le piante coltivate con Haru' },
  { uid: '769afd1cd777edd44e65b230c01baaa5', data: '01-16', azione: 'Raccogliere le piante dal tetto con Haru' },
];
const VASCHETTA = { chiave: 'chiave/vaschetta-a-stella', prima: 'Vaschetta creata da Jose per coltivare fiori (avvia la Coltivazione)', dopo: 'Raddoppia i fiori raccolti nei Memento.' };

/** Il motivo per cui un dono resta senza regola (dalla prima riga della nota). */
function senzaRegola(nota: string): string {
  if (/se fidanzata|senza fidanzata|non ha una fidanzata|rapporto di amicizia/.test(nota)) return 'legato alla relazione romantica scelta: l’app non la registra (decisione dell’utente)';
  if (/Palazzo di Kamoshida/.test(nota)) return 'durante l’infiltrazione nel Palazzo di Kamoshida: nessun evento della partita lo dice';
  if (/5 aprile/.test(nota)) return 'data fuori dal calendario di gioco: informativo';
  return 'regola non riconosciuta nella nota';
}

export const migration295: Migration = {
  id: 295,
  name: 'doni_dei_confidenti_raccolti_e_vaschetta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'ricompensa_oggetto')) { logger.warn({ migrazione: 295 }, 'ricompense assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    // (1) la colonna della regola e le regole dei doni del rango massimo
    const colonnaNuova = !haColonna(db, 'ricompensa_oggetto', 'condizioni_json');
    if (colonnaNuova) db.exec('ALTER TABLE main.ricompensa_oggetto ADD COLUMN condizioni_json TEXT CHECK (condizioni_json IS NULL OR json_valid(condizioni_json))');
    const doni = db.prepare("SELECT fonte_chiave, catalogo_chiave, nota, condizioni_json FROM main.ricompensa_oggetto WHERE fonte_tipo = 'confidente' ORDER BY fonte_chiave, catalogo_chiave").all() as
      Array<{ fonte_chiave: string; catalogo_chiave: string; nota: string | null; condizioni_json: string | null }>;
    const confidenti = new Set(esisteTabella(db, 'confidente') ? db.prepare('SELECT chiave FROM main.confidente').pluck().all() as string[] : []);
    let regole = 0;
    for (const d of doni) {
      const riga = (d.nota ?? '').split('\n')[0]!;
      const chiave = `dono:${d.fonte_chiave}:${d.catalogo_chiave}`;
      if (!RANGO_MASSIMO.test(riga)) { esiti.push({ chiave, esito: `senza regola: ${senzaRegola(riga)}` }); continue; }
      if (!confidenti.has(d.fonte_chiave)) { esiti.push({ chiave, esito: 'Confidente assente: senza regola' }); continue; }
      const regola = JSON.stringify([{ tipo: 'confidente', confidente: d.fonte_chiave, rango: 10 }, { tipo: 'data', dal: '03-19' }]);
      if (d.condizioni_json !== null) { esiti.push({ chiave, esito: canonico(JSON.parse(d.condizioni_json)) === canonico(JSON.parse(regola)) ? 'regola già scritta' : 'regola diversa già scritta: non toccata' }); continue; }
      if (db.prepare("UPDATE main.ricompensa_oggetto SET condizioni_json = ? WHERE fonte_tipo = 'confidente' AND fonte_chiave = ? AND catalogo_chiave = ? AND condizioni_json IS NULL").run(regola, d.fonte_chiave, d.catalogo_chiave).changes !== 1) errore(`la regola del dono ${chiave} non si scrive`);
      regole++;
      esiti.push({ chiave, esito: 'regola: rango 10 del Confidente, dal 19 marzo' });
    }
    // (2) i raccolti di Haru: proposte da completare
    const ortaggi = esisteTabella(db, 'catalogo_oggetto') ? ORTAGGI.filter((o) => db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(o)) : [];
    for (const v of RACCOLTI) {
      const r = esisteTabella(db, 'voce_giornata') ? db.prepare('SELECT data, azione FROM main.voce_giornata WHERE uid = ?').get(v.uid) as { data: string; azione: string } | undefined : undefined;
      if (!r || r.data !== v.data || r.azione !== v.azione) { esiti.push({ chiave: v.uid, esito: 'voce assente o diversa: nessuna proposta' }); continue; }
      if (!ortaggi.length) { esiti.push({ chiave: v.uid, esito: 'ortaggi assenti dal catalogo: nessuna proposta' }); continue; }
      esiti.push(nuovaProposta(db, { id: `O5Fbis-${v.uid.slice(0, 8)}-01-raccolto`, voce: v.uid, tipo: null, riferimento: null,
        effetti: [{ effetto: { tipo: 'oggetto', oggetto: '', quantita: 1 }, completa: ['elemento', 'quantita'], scelte: ortaggi }], togli: [],
        motivo: 'raccolto della coltivazione con Haru: la voce non dice quale ortaggio né quante copie (da verificare in gioco); si sceglie fra i quattro della coltivazione', certezza: 'da-verificare' }, adesso));
    }
    // (3) la Vaschetta a stella
    if (esisteTabella(db, 'catalogo_oggetto')) esiti.push(correggiTesto(db, { tabella: 'catalogo_oggetto', dove: 'chiave = ?', parametri: [VASCHETTA.chiave], colonna: 'effetto', prima: VASCHETTA.prima, dopo: VASCHETTA.dopo, etichetta: `effetto:${VASCHETTA.chiave}` }, adesso));
    const conteggi = {
      colonna: colonnaNuova ? 1 : 0, regole, senzaRegola: esiti.filter((e) => e.esito.startsWith('senza regola')).length,
      proposte: esiti.filter((e) => e.esito.startsWith('proposta creata')).length, testi: esiti.filter((e) => e.esito === 'corretto').length,
    };
    const cambiato = conteggi.colonna + conteggi.regole + conteggi.proposte + conteggi.testi > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 295, { fonti: [FONTE_OGGETTI_CHIAVE, 'https://www.allgamestaff.it/persona-5-royal/come-sconfiggere-jose/'], conteggi, esiti,
      decisioneDellUtente: 'I doni legati alla relazione romantica (pegni d’amore del 24 dicembre, cioccolati del 14 febbraio, dolci, giri choco del 15 febbraio) richiedono di sapere con chi c’è la relazione: l’app non lo registra. Si possono ricevere da una voce del Diario con l’effetto «oggetto ricevuto» o con un dato nuovo della partita (la relazione), da decidere.' }, cambiato);
    logger.info({ migrazione: 295, ...conteggi }, 'Doni dei Confidenti, raccolti di Haru, Vaschetta a stella');
  },
};
