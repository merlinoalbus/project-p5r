// ============================================================
// Migrazione 341 — le voci del rango 1 di Akechi e del rango 10 di Igor; «Impeto dell'Arcano superiore» al rango 6 di Igor (decisioni del 01/11)
// ============================================================
//
// Risposte dell'utente del 1° novembre ai conflitti del censimento «L8-02 — avvisi del giorno» (revisione 2):
//   - Akechi, rango 1 («Sì, aggiungi la voce»): il 10 giugno non aveva una voce del Diario per il rango 1 di Akechi (solo l'evento del
//     Calendario 44 e l'avviso del giorno). Nuova voce del 10/06, sera, Confidente Akechi (Giustizia), rango atteso 1, testo «Goro Akechi:
//     Confidente sbloccato (Giustizia) rango 1, dopo la trasmissione», fatta come le altre voci di primo rango (genere «azione», tipo
//     «confidente», collegata al Confidente, nessun effetto della spunta: il rango lo dà il rango atteso).
//   - Igor, rango 10 («Sì, aggiungi»): le voci di Igor arrivavano al rango atteso 9 (11/10); il rango 10 del 24/12 lo diceva solo l'avviso.
//     Nuova voce del 24/12, sera, rango atteso 10, con il testo dell'avviso: «Igor (vero) sale al rango massimo 10 (Il Matto): sblocca Impeto
//     dell'Arcano supremo e la fusione di Vishnu» (tipo «velluto» come le voci di Igor dal rango 5; Lavenza la dice la trama). Gli altri dati
//     per rango di Igor arrivano già al 10 come per ogni Confidente: `confidente_rango` ha le righe 1-9 (la riga n è il passaggio dal rango n al
//     successivo, il 10 non ha passaggio: vincolo CHECK 1-9 per tutti), il requisito, l'abilità e il dialogo del rango 10 ci sono.
//   - Igor, rango 6 («Impeto dell'Arcano superiore»): l'abilità del rango 6 era abbreviata «Impeto dell'Arcano sup.» e la voce del 27/06
//     diceva «Sblocca Impeto dell'Arcano Sup.», che si leggeva come il «supremo» del rango 10. Diventano «Impeto dell'Arcano superiore»
//     (`confidente_abilita` igor/6 e la nota della voce `8793a4c8…`); il rango 10 resta «Impeto dell'Arcano supremo».
//   - «Medicina amara» («Dal rango 7 di Takemi»): lo sblocco della Richiesta di Takemi stava sulla voce del 19/07 di Kawakami (rango 8,
//     `1e920647…`), che apre invece «Le fatiche di una maid in cattedra» («Sì: sblocca la maid»). La voce del 28/05 del rango 7 di Takemi
//     (`9b5f96dc…`, periodo validato, spuntata in una partita) prende l'effetto `sblocco richiesta:medicina-amara`, e nient'altro cambia di
//     lei; l'effetto della voce di Kawakami (`8643e667…`, stesso uid) diventa `sblocco richiesta:le-fatiche-di-una-maid-in-cattedra` e la sua
//     nota lo dice. Il requisito del rango 8 di Takemi («almeno una» fra lo sblocco di «Medicina amara» e il bel tempo) legge lo sblocco
//     dalla voce nuova. Gli effetti si scrivono con `convertiVoce` (registro di transizione e registro delle operazioni sugli effetti); la
//     voce di Takemi si converte anche se spuntata perché l'utente l'ha deciso per lei (`ancheSpuntata`): le partite non si toccano, e lo
//     sblocco nelle partite che l'hanno già spuntata non si scrive qui (stato della partita, vedi ROADMAP).
//
// COSA (conservativa, idempotente): le voci hanno uid derivati da un seme (stessi su ogni copia); si creano solo se il giorno e il Confidente
// ci sono e nessun'altra voce dà già quel rango di quel Confidente; vanno in coda alla fascia; il registro degli effetti le dice convertite
// senza effetti, come per ogni voce nuova. I testi e gli effetti si scrivono solo se sono ancora quelli letti. Le altre voci, gli altri
// effetti, le abilità e tutte le tabelle delle partite restano identiche (impronte prima e dopo). Audit in `dati_guida.audit-341-voci-e-impeto`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { convertiVoce, impronta, tabellePartiteConVoce, uidDa } from './fbisOndata5.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { diverseFuori, improntaPartite, righePerChiave, scriviAudit } from './decisioniDati0111.js';

const AUDIT = 'audit-341-voci-e-impeto';
const errore = (motivo: string): never => { throw new Error(`341: ${motivo}; nessuna modifica applicata.`); };

interface VoceNuova { seme: string; data: string; fascia: 'giorno' | 'sera'; azione: string; tipo: string; confidente: string; riferimentoTesto: string; rango: number }
const VOCI_NUOVE: readonly VoceNuova[] = [
  { seme: 'L8-02·0111:voce:akechi-1', data: '06-10', fascia: 'sera', azione: 'Goro Akechi: Confidente sbloccato (Giustizia) rango 1, dopo la trasmissione',
    tipo: 'confidente', confidente: 'akechi', riferimentoTesto: 'Goro Akechi - Giustizia', rango: 1 },
  { seme: 'L8-02·0111:voce:igor-10', data: '12-24', fascia: 'sera', azione: 'Igor (vero) sale al rango massimo 10 (Il Matto): sblocca Impeto dell\'Arcano supremo e la fusione di Vishnu',
    tipo: 'velluto', confidente: 'igor', riferimentoTesto: 'Igor - Il Matto', rango: 10 },
];

const ABILITA = { confidente: 'igor', rango: 6, prima: 'Impeto dell\'Arcano sup.', dopo: 'Impeto dell\'Arcano superiore' } as const;
const NOTA_RANGO_6 = { uid: '8793a4c8d91ebe915f406c4640a6b8bd', data: '06-27', confidente: 'igor', rango: 6,
  prima: 'Sblocca Impeto dell\'Arcano Sup.', dopo: 'Sblocca Impeto dell\'Arcano superiore' } as const;

const LOTTO = 'L8-02·0111';
const sbloccoRichiesta = (chiave: string): EffettoVoce => ({ tipo: 'sblocco', bersaglio: 'richiesta', chiave });
/** Lo sblocco di «Medicina amara» aggiunto alla voce del rango 7 di Takemi (28/05). */
const TAKEMI_7 = { uid: '9b5f96dce094310d91c01c6c26a30fdb', data: '05-28', azione: 'Yogen-Jaya. Clinica Takemi: ti sottoponi ad un test clinico.',
  effetto: sbloccoRichiesta('medicina-amara') } as const;
/** La voce del rango 8 di Kawakami (19/07): il suo effetto di sblocco (stesso uid) apre la Richiesta della maid, e la nota lo dice. */
const KAWAKAMI_8 = { uid: '1e920647bd26510426a49b825398cbeb', data: '07-19', azione: 'Confidente Kawakami: scelte di dialogo', effettoUid: '8643e667da7eeeb5426d6251b3f83038',
  prima: sbloccoRichiesta('medicina-amara'), dopo: sbloccoRichiesta('le-fatiche-di-una-maid-in-cattedra'),
  notaPrima: '+6 punti dalle conversazioni, +2 dalla telefonata; sblocco richiesta Mementos Medicina amara',
  notaDopo: '+6 punti dalle conversazioni, +2 dalla telefonata; sblocco richiesta Mementos Le fatiche di una maid in cattedra' } as const;

export const migration341: Migration = {
  id: 341,
  name: 'voci_akechi_igor_e_impeto_superiore',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'voce_effetto_transizione') || !esisteTabella(db, 'confidente_abilita')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const adesso = new Date().toISOString();

    const vociPrima = righePerChiave(db, 'voce_giornata', ['uid']);
    const effettiPrima = righePerChiave(db, 'voce_effetto', ['uid']);
    const transizioniPrima = righePerChiave(db, 'voce_effetto_transizione', ['voce_uid']);
    const abilitaPrima = righePerChiave(db, 'confidente_abilita', ['confidente_chiave', 'rango', 'ordine']);
    const operazioniPrima = righePerChiave(db, 'operazione_effetti_voce', ['id']);
    const partitePrima = improntaPartite(db);

    const esiti: Array<{ chiave: string; esito: string; prima?: unknown; dopo?: unknown }> = [];
    const vociNuove = new Set<string>();
    const vociToccate = new Set<string>();
    let cambiato = false;

    // (1) le voci nuove
    const fascia = db.prepare('SELECT uid, ordine FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid');
    for (const v of VOCI_NUOVE) {
      const uid = uidDa(v.seme);
      const chiave = `voce:${v.data}:${v.confidente}-${v.rango}`;
      const esistente = db.prepare('SELECT data, riferimento_chiave, rango_atteso FROM main.voce_giornata WHERE uid = ?').get(uid) as
        { data: string; riferimento_chiave: string | null; rango_atteso: number | null } | undefined;
      if (esistente) {
        esiti.push({ chiave, esito: esistente.data === v.data && esistente.riferimento_chiave === v.confidente && esistente.rango_atteso === v.rango ? `già creata (${uid})` : `l'uid ${uid} è già di un'altra voce: non toccata` });
        continue;
      }
      if (!db.prepare('SELECT 1 FROM main.giorno WHERE data = ?').get(v.data)) { esiti.push({ chiave, esito: 'giorno assente: nessuna voce' }); continue; }
      if (!db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(v.confidente)) { esiti.push({ chiave, esito: 'Confidente assente: nessuna voce' }); continue; }
      const gia = db.prepare("SELECT uid, data FROM main.voce_giornata WHERE riferimento_tipo = 'confidente' AND riferimento_chiave = ? AND rango_atteso = ?").all(v.confidente, v.rango) as Array<{ uid: string; data: string }>;
      if (gia.length) { esiti.push({ chiave, esito: `una voce dà già il rango ${v.rango} (${gia.map((g) => `${g.data} ${g.uid}`).join(', ')}): nessuna voce nuova` }); continue; }
      const ordiniPrima = fascia.all(v.data, v.fascia) as Array<{ uid: string; ordine: number }>;
      const ordine = ordiniPrima.length ? Math.max(...ordiniPrima.map((o) => o.ordine)) + 1 : 0;
      db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
          rango_atteso, produce_json, indice_guida, created_at, updated_at, da_rivedere, aggiunta_da)
        VALUES (?, ?, ?, ?, 'azione', ?, NULL, ?, 'confidente', ?, ?, ?, '[]', NULL, ?, ?, 0, 'team')`)
        .run(uid, v.data, v.fascia, ordine, v.azione, v.tipo, v.confidente, v.riferimentoTesto, v.rango, adesso, adesso);
      // come ogni voce nuova senza effetti (`motoreDiario.scriviLista`): convertita, elenco vuoto
      db.prepare("INSERT INTO main.voce_effetto_transizione (voce_uid, stato, raw_json, motivo, impronta, aggiornata_il) VALUES (?, 'convertita', '[]', NULL, ?, ?)").run(uid, impronta([]), adesso);
      const ordiniDopo = fascia.all(v.data, v.fascia) as Array<{ uid: string; ordine: number }>;
      if (ordiniDopo.length !== ordiniPrima.length + 1 || ordiniDopo[ordiniDopo.length - 1]?.uid !== uid || ordiniPrima.some((p, i) => ordiniDopo[i]?.uid !== p.uid || ordiniDopo[i]?.ordine !== p.ordine)) {
        errore(`la voce nuova del ${v.data} non è in coda alla fascia o le altre voci si sono spostate`);
      }
      vociNuove.add(uid);
      vociToccate.add(uid);
      cambiato = true;
      esiti.push({ chiave, esito: `creata (${uid})`, dopo: { data: v.data, fascia: v.fascia, ordine, azione: v.azione, rango: v.rango } });
    }

    // (2) il nome dell'abilità del rango 6 di Igor
    const abilita = db.prepare('SELECT ordine, nome FROM main.confidente_abilita WHERE confidente_chiave = ? AND rango = ?').all(ABILITA.confidente, ABILITA.rango) as Array<{ ordine: number; nome: string }>;
    const chiaveAbilita = `abilita:${ABILITA.confidente}:${ABILITA.rango}`;
    let abilitaToccata: string | null = null;
    if (abilita.length !== 1) esiti.push({ chiave: chiaveAbilita, esito: `${abilita.length} abilità al rango ${ABILITA.rango}: non toccate` });
    else if (abilita[0]!.nome === ABILITA.dopo) esiti.push({ chiave: chiaveAbilita, esito: 'già corretta' });
    else if (abilita[0]!.nome !== ABILITA.prima) esiti.push({ chiave: chiaveAbilita, esito: 'nome diverso da quello atteso: non toccato' });
    else {
      if (db.prepare('UPDATE main.confidente_abilita SET nome = ? WHERE confidente_chiave = ? AND rango = ? AND ordine = ? AND nome = ?')
        .run(ABILITA.dopo, ABILITA.confidente, ABILITA.rango, abilita[0]!.ordine, ABILITA.prima).changes !== 1) errore('l\'abilità del rango 6 di Igor non si aggiorna');
      abilitaToccata = `${ABILITA.confidente}|${ABILITA.rango}|${abilita[0]!.ordine}`;
      cambiato = true;
      esiti.push({ chiave: chiaveAbilita, esito: 'corretta', prima: ABILITA.prima, dopo: ABILITA.dopo });
    }

    // (3) la nota della voce del rango 6 di Igor
    const n = NOTA_RANGO_6;
    const voce = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(n.uid) as
      { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; rango_atteso: number | null; testo_precedente_json: string | null } | undefined;
    const chiaveNota = `voce:${n.data}:${n.uid}`;
    if (!voce) esiti.push({ chiave: chiaveNota, esito: 'voce assente' });
    else if (voce.note === n.dopo) esiti.push({ chiave: chiaveNota, esito: 'già corretta' });
    else if (voce.data !== n.data || voce.riferimento_chiave !== n.confidente || voce.rango_atteso !== n.rango || voce.note !== n.prima) esiti.push({ chiave: chiaveNota, esito: 'voce diversa da quella attesa: non toccata' });
    else {
      // il testo di prima va in `testo_precedente_json` (come la 222), se la voce non ne ha già uno
      const precedente = voce.testo_precedente_json ?? JSON.stringify({ azione: voce.azione, note: voce.note, riferimento_tipo: voce.riferimento_tipo, riferimento_chiave: voce.riferimento_chiave, riferimento_testo: voce.riferimento_testo });
      if (db.prepare('UPDATE main.voce_giornata SET note = ?, testo_precedente_json = ?, updated_at = ? WHERE uid = ? AND note = ?').run(n.dopo, precedente, adesso, n.uid, n.prima).changes !== 1) errore('la nota della voce del 27/06 non si aggiorna');
      vociToccate.add(n.uid);
      cambiato = true;
      esiti.push({ chiave: chiaveNota, esito: 'corretta', prima: n.prima, dopo: n.dopo });
    }

    // (4) gli sblocchi di «Medicina amara» e della maid
    const partite = tabellePartiteConVoce(db);
    const effettiToccati = new Set<string>();
    const vociConEffetti = new Set<string>();
    const takemi = convertiVoce(db, {
      uid: TAKEMI_7.uid, data: TAKEMI_7.data, azione: TAKEMI_7.azione, lotto: LOTTO, attesi: [], togli: [],
      aggiungi: [{ seme: `${LOTTO}:${TAKEMI_7.uid}:sblocco:medicina-amara`, effetto: TAKEMI_7.effetto }],
      motivo: '«Medicina amara» si sblocca dal rango 7 di Takemi (evento 7.5 della guida), non dal rango 8 di Kawakami',
      ancheSpuntata: { decisione: 'risposta dell\'utente del 01/11 su «Medicina amara»: «Dal rango 7 di Takemi»' },
    }, partite, adesso);
    esiti.push({ chiave: `effetti:${TAKEMI_7.data}:${TAKEMI_7.uid}`, esito: takemi.esito, prima: takemi.prima, dopo: takemi.dopo });
    if (takemi.esito.startsWith('convertita')) { effettiToccati.add(uidDa(`${LOTTO}:${TAKEMI_7.uid}:sblocco:medicina-amara`)); vociConEffetti.add(TAKEMI_7.uid); cambiato = true; }
    const k = KAWAKAMI_8;
    const kawakami = convertiVoce(db, {
      uid: k.uid, data: k.data, azione: k.azione, lotto: LOTTO, attesi: [{ uid: k.effettoUid, effetto: k.prima }], togli: [], aggiungi: [],
      modifica: [{ uid: k.effettoUid, effetto: k.dopo }],
      motivo: 'il rango 8 di Kawakami apre «Le fatiche di una maid in cattedra»: risposta dell\'utente del 01/11, «Sì: sblocca la maid»',
    }, partite, adesso);
    esiti.push({ chiave: `effetti:${k.data}:${k.uid}`, esito: kawakami.esito, prima: kawakami.prima, dopo: kawakami.dopo });
    if (kawakami.esito.startsWith('convertita')) { effettiToccati.add(k.effettoUid); vociConEffetti.add(k.uid); cambiato = true; }
    // la nota della voce di Kawakami, solo se l'effetto è quello della maid
    const notaK = db.prepare('SELECT note, testo_precedente_json, azione, riferimento_tipo, riferimento_chiave, riferimento_testo FROM main.voce_giornata WHERE uid = ?').get(k.uid) as
      { note: string | null; testo_precedente_json: string | null; azione: string; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null } | undefined;
    const effettoK = db.prepare('SELECT chiave FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').pluck().get(k.effettoUid, k.uid) as string | undefined;
    const chiaveNotaK = `nota:${k.data}:${k.uid}`;
    if (!notaK) esiti.push({ chiave: chiaveNotaK, esito: 'voce assente' });
    else if (notaK.note === k.notaDopo) esiti.push({ chiave: chiaveNotaK, esito: 'già corretta' });
    else if (notaK.note !== k.notaPrima || effettoK !== 'richiesta:le-fatiche-di-una-maid-in-cattedra') esiti.push({ chiave: chiaveNotaK, esito: 'nota o effetto diversi da quelli attesi: non toccata' });
    else {
      const precedente = notaK.testo_precedente_json ?? JSON.stringify({ azione: notaK.azione, note: notaK.note, riferimento_tipo: notaK.riferimento_tipo, riferimento_chiave: notaK.riferimento_chiave, riferimento_testo: notaK.riferimento_testo });
      if (db.prepare('UPDATE main.voce_giornata SET note = ?, testo_precedente_json = ?, updated_at = ? WHERE uid = ? AND note = ?').run(k.notaDopo, precedente, adesso, k.uid, k.notaPrima).changes !== 1) errore('la nota della voce del 19/07 non si aggiorna');
      vociToccate.add(k.uid);
      cambiato = true;
      esiti.push({ chiave: chiaveNotaK, esito: 'corretta', prima: k.notaPrima, dopo: k.notaDopo });
    }

    // le verifiche: solo le righe dell'elenco sono cambiate (la voce di Takemi resta identica: cambia solo il suo elenco di effetti)
    const operazioniNuove = [...righePerChiave(db, 'operazione_effetti_voce', ['id']).keys()].filter((id) => !operazioniPrima.has(id));
    const operazioniFuori = operazioniNuove.filter((id) => !vociConEffetti.has(db.prepare('SELECT voce_uid FROM main.operazione_effetti_voce WHERE id = ?').pluck().get(id) as string));
    const fuori = [
      ...diverseFuori(vociPrima, righePerChiave(db, 'voce_giornata', ['uid']), vociToccate).map((k) => `voce_giornata ${k}`),
      ...diverseFuori(effettiPrima, righePerChiave(db, 'voce_effetto', ['uid']), effettiToccati).map((k) => `voce_effetto ${k}`),
      ...diverseFuori(transizioniPrima, righePerChiave(db, 'voce_effetto_transizione', ['voce_uid']), new Set([...vociNuove, ...vociConEffetti])).map((k) => `voce_effetto_transizione ${k}`),
      ...diverseFuori(operazioniPrima, righePerChiave(db, 'operazione_effetti_voce', ['id']), new Set(operazioniNuove)).map((k) => `operazione_effetti_voce ${k}`),
      ...operazioniFuori.map((id) => `operazione_effetti_voce ${id} di un'altra voce`),
      ...diverseFuori(abilitaPrima, righePerChiave(db, 'confidente_abilita', ['confidente_chiave', 'rango', 'ordine']), new Set(abilitaToccata ? [abilitaToccata] : [])).map((k) => `confidente_abilita ${k}`),
    ];
    if (fuori.length) errore(`righe cambiate fuori dall'elenco: ${fuori.slice(0, 5).join(', ')}`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');

    scriviAudit(db, AUDIT, 341, { esiti }, cambiato);
    logger.info({ migrazione: 341, esiti: esiti.map((e) => `${e.chiave}: ${e.esito}`) }, 'voci di Akechi e Igor, Impeto dell\'Arcano superiore');
  },
};
