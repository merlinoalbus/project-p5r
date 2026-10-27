// ============================================================
// Migrazione 298 — le domande, i quiz in TV e il cruciverba delle voci che non li citavano (richiesta dell'utente del 2026-10-27)
// ============================================================
//
// L'utente, sulla voce del cruciverba del 18 aprile: «Aggiungere la visualizzazione della risposta anche per i cruciverba e gli altri
// domande e quiz», e poi «come già per le domande in classe...». Il riquadro «Il gioco dà» mostra la risposta giusta di una domanda (o la
// soluzione di un cruciverba) quando la voce ha l'effetto che la cita (`domanda`, `cruciverba`): la risposta si legge dalla riga del gioco,
// un solo punto. Censimento sulla copia dei dati (tutte le voci, non un campione): 160 voci parlano di domande, quiz, esami o cruciverba;
// 12 righe di `domanda` e 5 di `cruciverba` non sono citate da nessuna voce; le voci di domanda o quiz senza l'effetto sono queste.
//
// Che cosa fa, con la regola conservativa del lotto F-bis (`fbisOndata5.ts`):
//   - un dato del gioco nuovo: la domanda in classe del 07-07 (Tanabata: «La Via Lattea», poi «Somen», aiutando Ann), che la guida italiana
//     dà (soluzione della settimana 13) e il dataset non aveva. Si crea solo se non c'è già una riga con quella chiave (anche nascosta);
//   - le voci DOPO il 05-31 ricevono l'effetto che cita la loro riga del gioco (la domanda dello stesso giorno, o il cruciverba), solo se sono
//     ancora esattamente come lette il 2026-10-27 (testo e, uno per uno, uid e valore degli effetti) e se nessuna partita le cita
//     (`convertiVoce`): 01-24 «salty», 06-02 quiz in TV, 06-23 quiz in TV, 07-07 Tanabata, 07-11 memoria a lungo termine, 11-10, 11-24, 12-08
//     e 12-15 quiz in TV, 10-31 cruciverba «Stand» (sera: la voce che la 157 lasciava fuori, «cruciverba scolastico», oggi è il cruciverba
//     della sera). Al 06-23 e all'11-10 la domanda del quiz in TV è già sulla voce della domanda in classe (158: «la voce del giorno copre
//     entrambe»): la voce del quiz in TV la cita anche lei, così la risposta si vede dove il quiz si gioca; segnarla due volte non cambia niente
//     (un'altra voce spuntata la tiene comunque, `effettiDiStatoService`);
//   - le voci del periodo validato (fino al 05-31) NON si scrivono: per 04-25, 04-30, 05-31 (domande in classe) e per i quiz in TV del 05-19 e
//     del 05-26 nasce una proposta «da completare» già completa, da approvare dall'utente (`proposta_conversione_voce`). Finché non la approva,
//     la risposta resta nel testo della voce, come oggi.
// Non sono domande né quiz, e restano come sono: «Schivare il gesso» del 06-06 e del 10-15 (una prova di Perizia: la guida non dà domande),
// l'ultimo esame del 07-16 (la guida: «verrà testato il punteggio di Conoscenza», nessuna domanda), il cumulativo dei cruciverba del 02-01
// (nessun cruciverba unico) e «Gambla Goemon: indovinare il numero» del 12-06 (un gioco). Le righe del gioco che nessuna voce cita (domande
// del 08-04, 09-06, 10-06; cruciverba del 01-27, 08-03, 09-28, 10-06) restano nelle loro pagine: senza una voce non c'è riquadro.
// Scrive solo in `main`. Idempotente. Audit in `dati_guida.audit-298-risposte`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { convertiVoce, nuovaProposta, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';

const AUDIT = 'audit-298-risposte';
const LOTTO = 'risposte-quiz-2026-10-27';
const FONTE_SETTIMANA_13 = 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-13/';
const errore = (motivo: string): never => { throw new Error(`298: ${motivo}; nessuna modifica applicata.`); };

/** La domanda in classe del 07-07, come la dà la guida (settimana 13): due passi a catena, aiutando Ann. */
const DOMANDA_0707 = {
  chiave: '07-07', data: '07-07', tipo: 'classe', chi: '',
  domanda: 'Tanabata: a che cosa è legata la festa degli dei che attraversano il cielo stellato per riunirsi una volta all’anno, e quale cibo tradizionale vi si ispira?',
  risposte: [{ ordine: 1, testo: 'La Via Lattea' }, { ordine: 2, testo: 'Somen' }],
  ricompensa: 'Fascino +1 nota, 2 punti nel legame con Ann',
  note: 'Domanda a due passi. La guida non nomina il professore: si aiuta Ann a rispondere.',
  fonte: FONTE_SETTIMANA_13,
} as const;

const dote = (d: 'conoscenza' | 'fascino', note: 1): EffettoVoce => ({ tipo: 'dote', dote: d, note });

/** Le voci dopo il 05-31: uid, giorno, testo e l'effetto che hanno oggi (sulla copia del 2026-10-27), e che cosa citano. `domanda: '07-07'`
 *  è la domanda nuova di questa migrazione (il suo id si legge dalla chiave). */
const VOCI: ReadonlyArray<{ uid: string; data: string; azione: string; attesi: Array<{ uid: string; effetto: EffettoVoce }>; cita: { domanda: number | '07-07' } | { cruciverba: string } }> = [
  { uid: '83c29a335386c2653bc990c4e3cb8aac', data: '01-24', azione: 'Rispondere alle domande in classe sulla parola salty (tre risposte)', attesi: [{ uid: 'a72ad4bd7c5f633ec1bb0455b922d9ca', effetto: dote('conoscenza', 1) }], cita: { domanda: 66 } },
  { uid: '89137bd1b79805a90c78a507b640758b', data: '06-02', azione: 'TV: rispondere alla domanda.', attesi: [{ uid: 'e08194aaf72fcfb137df92d49e85aa56', effetto: dote('conoscenza', 1) }], cita: { domanda: 70 } },
  { uid: 'b337847e2c57885cb3b1f5b6ac3f6d50', data: '06-23', azione: 'TV: domanda sulle frodi (Ordinare cibo senza soldi)', attesi: [{ uid: 'd64911efe7a926cf0681390342ef9d2e', effetto: dote('conoscenza', 1) }], cita: { domanda: 71 } },
  { uid: 'b9e2763b0f65697c7f0b28dc24c3487c', data: '07-07', azione: 'Rispondere alle domande in classe (Via Lattea / Somen)', attesi: [{ uid: 'e54298be136456fd6535ab34750b7df9', effetto: dote('fascino', 1) }], cita: { domanda: '07-07' } },
  { uid: 'ff0927888313b0453f8de74330220a6e', data: '07-11', azione: 'Rispondere alle domande in classe sulla memoria a lungo termine', attesi: [{ uid: 'c5bd98c0562b89651631e80ebfdb5adc', effetto: dote('conoscenza', 1) }], cita: { domanda: 30 } },
  { uid: '09077817a814017ee5e85ecd6f2fb270', data: '10-31', azione: 'Cruciverba (Stand)', attesi: [{ uid: '3fa5eb7256ddc3c3fe338a1999321449', effetto: dote('conoscenza', 1) }], cita: { cruciverba: '10-31' } },
  { uid: '8db0a92b5cfcd5bc9cfd4a48ee4ede19', data: '11-10', azione: 'TV: Chi detiene il potere? - Noi, gli spettatori', attesi: [], cita: { domanda: 75 } },
  { uid: 'ec16d583f561fd5b491de30a0ac4b9a0', data: '11-24', azione: 'TV: chi ha l\'ultima parola in un voto parlamentare 50-50? (Il presidente della Camera)', attesi: [{ uid: 'adde6004e963ed9ea3901c2062954eda', effetto: dote('conoscenza', 1) }], cita: { domanda: 76 } },
  { uid: 'b0ce1f16cb4425e3bb88e1e060464825', data: '12-08', azione: 'TV: Tentato omicidio', attesi: [{ uid: 'f0d3f6a2a954d4693cd40baaa8b0e926', effetto: dote('conoscenza', 1) }], cita: { domanda: 77 } },
  { uid: 'c1b8209ddcc8650e84dd6692c105236b', data: '12-15', azione: 'TV: Non da vantaggi ai ricercati', attesi: [{ uid: 'c0adbf19fad876ec78bd4276f71a4242', effetto: dote('conoscenza', 1) }], cita: { domanda: 78 } },
];

/** Le voci del periodo validato: solo una proposta da approvare, con la domanda dello stesso giorno. */
const PROPOSTE: ReadonlyArray<{ voce: string; data: string; domanda: number; motivo: string }> = [
  { voce: '5fc91cc4d1909f2ae61e396f792a6ddf', data: '04-25', domanda: 4, motivo: 'la domanda in classe del giorno (Kawakami, due passi) è nel gioco ma la voce non la cita: approvandola, «Il gioco dà» mostra le risposte giuste' },
  { voce: '59c1b1b504f883586d50e24dfcfb02c4', data: '04-30', domanda: 6, motivo: 'la domanda a catena del giorno («Wunderkind», tre passi) è nel gioco ma la voce non la cita: approvandola, «Il gioco dà» mostra le risposte giuste' },
  { voce: 'c78e13d0921f104355bf413babc8bb96', data: '05-31', domanda: 17, motivo: 'la domanda in classe del giorno (Inui, i pirati) è nel gioco ma la voce non la cita: approvandola, «Il gioco dà» mostra la risposta giusta' },
  { voce: '099e312ac3d0b382e9e198e496db9727', data: '05-19', domanda: 68, motivo: 'il quiz in TV del giorno è citato dalla voce della domanda in classe (migrazione 158), non da questa: approvandola, la risposta si vede anche dove il quiz si gioca' },
  { voce: '368424f85483122a24a92f13fa6b9439', data: '05-26', domanda: 69, motivo: 'il quiz in TV del giorno è citato dalla voce della domanda in classe (migrazione 158), non da questa: approvandola, la risposta si vede anche dove il quiz si gioca' },
];

/** La domanda del 07-07: creata se manca (mai sopra una riga che c'è già, anche nascosta). Ritorna l'esito e l'id da citare (null: non si cita). */
function domandaDel0707(db: AppDatabase, adesso: string): { esito: Esito; id: number | null } {
  const d = DOMANDA_0707;
  const gia = db.prepare('SELECT id, data, tipo, nascosto FROM main.domanda WHERE chiave = ?').get(d.chiave) as { id: number; data: string; tipo: string; nascosto: number } | undefined;
  if (gia) {
    const usabile = gia.data === d.data && gia.tipo === d.tipo && gia.nascosto === 0;
    return { esito: { chiave: `domanda:${d.chiave}`, esito: usabile ? `già presente (id ${gia.id})` : 'chiave già usata da un’altra riga o nascosta: non toccata, non citata' }, id: usabile ? gia.id : null };
  }
  const altra = db.prepare("SELECT id FROM main.domanda WHERE data = ? AND tipo = 'classe'").pluck().get(d.data) as number | undefined;
  if (altra !== undefined) return { esito: { chiave: `domanda:${d.chiave}`, esito: `il giorno ha già una domanda in classe (id ${altra}): nessuna riga nuova, non citata` }, id: null };
  const id = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 FROM main.domanda').pluck().get() as number;
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.domanda').pluck().get() as number;
  db.prepare(`INSERT INTO main.domanda (id, ordine, data, tipo, chi, domanda, risposte_json, ricompensa, note, fonte, chiave, origine, nascosto, seed_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 0, NULL, ?)`)
    .run(id, ordine, d.data, d.tipo, d.chi, d.domanda, JSON.stringify(d.risposte), d.ricompensa, d.note, d.fonte, d.chiave, adesso);
  return { esito: { chiave: `domanda:${d.chiave}`, esito: `creata (id ${id}, ordine ${ordine})` }, id };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa (come `scriviAuditFbis`, con questa migrazione). */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({ migrazione: 298, lotto: LOTTO, richiesta: 'Aggiungere la visualizzazione della risposta anche per i cruciverba e gli altri domande e quiz', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export const migration298: Migration = {
  id: 298,
  name: 'risposte_di_domande_e_cruciverba_nelle_voci',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'domanda', 'cruciverba', 'dati_guida', 'proposta_conversione_voce']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 298, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const nuova = domandaDel0707(db, adesso);
    const partite = tabellePartiteConVoce(db);

    const conversioni: Esito[] = VOCI.map((v) => {
      const chiave = `voce:${v.data}:${v.uid}`;
      let effetto: EffettoVoce;
      if ('cruciverba' in v.cita) {
        // il cruciverba deve esistere, visibile e dello stesso giorno della voce
        if (v.cita.cruciverba !== v.data || !db.prepare('SELECT 1 FROM main.cruciverba WHERE data = ? AND nascosto = 0').get(v.cita.cruciverba)) return { chiave, esito: 'saltata: cruciverba assente, nascosto o di un altro giorno' };
        effetto = { tipo: 'cruciverba', data: v.cita.cruciverba };
      } else {
        const id = v.cita.domanda === '07-07' ? nuova.id : v.cita.domanda;
        if (id === null) return { chiave, esito: 'saltata: la domanda del giorno non c’è' };
        // la domanda deve esistere, visibile e dello stesso giorno della voce (come nella 157)
        if (!db.prepare('SELECT 1 FROM main.domanda WHERE id = ? AND data = ? AND nascosto = 0').get(id, v.data)) return { chiave, esito: `saltata: domanda ${id} assente, nascosta o di un altro giorno` };
        effetto = { tipo: 'domanda', domanda: id };
      }
      const seme = `298:${v.uid}:${effetto.tipo === 'domanda' ? `domanda:${effetto.domanda}` : effetto.tipo === 'cruciverba' ? `cruciverba:${effetto.data}` : ''}`;
      return convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione, attesi: v.attesi, togli: [], aggiungi: [{ seme, effetto }], lotto: LOTTO,
        motivo: effetto.tipo === 'cruciverba' ? 'la voce cita il cruciverba del giorno: «Il gioco dà» ne mostra la soluzione' : 'la voce cita la domanda del giorno: «Il gioco dà» ne mostra le risposte giuste' }, partite, adesso);
    });

    const proposte: Esito[] = PROPOSTE.map((p) => {
      const id = `R298-${p.voce.slice(0, 8)}-domanda-${p.domanda}`;
      const voce = db.prepare('SELECT data FROM main.voce_giornata WHERE uid = ?').pluck().get(p.voce) as string | undefined;
      if (voce !== p.data) return { chiave: id, esito: 'voce assente o di un altro giorno: nessuna proposta' };
      if (!db.prepare('SELECT 1 FROM main.domanda WHERE id = ? AND data = ? AND nascosto = 0').get(p.domanda, p.data)) return { chiave: id, esito: `domanda ${p.domanda} assente, nascosta o di un altro giorno: nessuna proposta` };
      // la voce la cita già (l'utente l'ha aggiunta da sé): niente da proporre
      if (db.prepare("SELECT 1 FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'domanda' AND chiave = ?").get(p.voce, String(p.domanda))) return { chiave: id, esito: 'la voce cita già la domanda: nessuna proposta' };
      return nuovaProposta(db, { id, voce: p.voce, tipo: null, riferimento: null, effetti: [{ effetto: { tipo: 'domanda', domanda: p.domanda }, completa: [], scelte: null }], togli: [], motivo: p.motivo, certezza: 'certa', lotto: LOTTO }, adesso);
    });

    const conteggi = {
      domandaNuova: nuova.esito.esito.startsWith('creata') ? 1 : 0,
      vociConvertite: conversioni.filter((e) => e.esito.startsWith('convertita')).length,
      gia: conversioni.filter((e) => e.esito === 'già convertita').length,
      saltate: conversioni.filter((e) => e.esito.startsWith('saltata')).length,
      proposteCreate: proposte.filter((e) => e.esito.startsWith('proposta creata')).length,
    };
    const cambiato = conteggi.domandaNuova > 0 || conteggi.vociConvertite > 0 || conteggi.proposteCreate > 0;
    scriviAudit(db, { conteggi, domanda: nuova.esito, conversioni, proposte }, cambiato);
    logger.info({ migrazione: 298, ...conteggi }, 'domande, quiz in TV e cruciverba citati dalle voci che non li citavano');
  },
};
