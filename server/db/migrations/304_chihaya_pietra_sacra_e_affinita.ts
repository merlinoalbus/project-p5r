// ============================================================
// Migrazione 304 — Chihaya Mifune: la Pietra Sacra con i 3 Salgemma e la Lettura delle affinità come offerte (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Censimento F-bis, punti 19 e 21: la Pietra Sacra (100.000 ¥, 06-28) si trasforma in 3 Salgemma infranto e al rango 9 del Confidente Chihaya
// restituisce quanto pagato; la voce del 06-28 aveva solo «yen −100.000». La Lettura delle affinità (5.000 ¥ a lettura, dal rango 5) compare in
// 17 voci, solo 3 con «yen −5.000» (decisione 2: il prezzo è dell'articolo, mai un effetto yen accanto). Il prezzo stava anche nella
// descrizione dell'abilità del rango 5 («costo 5.000¥ per utilizzo»): una copia (decisione 4).
//
// Che cosa fa:
//   (1) il negozio `chihaya-shinjuku` nella bancarella della chiromante (Shinjuku), con due offerte: la Pietra Sacra (scheda nuova
//       `chiave/pietra-sacra`, 100.000 ¥, pezzo unico, dal 06-23 il primo incontro) che contiene 3 Salgemma infranto (`ricompensa_oggetto` di
//       fonte «articolo»: comprandola i 3 Salgemma entrano fra le copie possedute) e la Lettura delle affinità (scheda nuova, 5.000 ¥, dal
//       rango 5 di Chihaya, ripetibile: la guida non dà limiti, regola di ripiego dell'utente);
//   (2) la descrizione dell'abilità del rango 5 perde il prezzo copiato;
//   (3) la voce del 06-28 compra la Pietra Sacra dall'offerta (l'effetto yen esce: il prezzo lo scala l'articolo) e si collega al negozio;
//       le 17 voci della Lettura delle affinità citano l'offerta (le 3 con «yen −5.000» perdono l'effetto yen).
// Il rimborso al rango 9: la guida (pagina del Confidente) mette il rango 9 il 6 ottobre, ma il Diario non ha la voce del rango 9 di Chihaya
// (l'itinerario si ferma al rango 8 del 10-02) e l'app non ha un movimento di yen legato a un rango: il rimborso è scritto nella descrizione
// della Pietra Sacra e si segna a mano (decisione 18) finché l'utente non sceglie dove registrarlo (vedi l'audit).
// Conservativa (vedi `fbisOndata5.ts`). Idempotente. Audit in `dati_guida.audit-304-chihaya`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { FALLBACK_UTENTE } from './rifornimentoOndata5.js';
import { FONTE_CHIHAYA, FONTE_OGGETTI, convertiVoce, correggiTesto, creaNegozio, creaOfferta, creaScheda, scriviAuditFbis, tabellePartiteConVoce, type EffettoAtteso, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-304-chihaya';
const errore = (motivo: string): never => { throw new Error(`304: ${motivo}; nessuna modifica applicata.`); };
const NEGOZIO = 'chihaya-shinjuku';
const PIETRA = `${NEGOZIO}/pietra-sacra`;
const AFFINITA = `${NEGOZIO}/lettura-delle-affinita`;
const SALGEMMA = 'consumabile/salgemma-infranto';

const yen = (importo: number): EffettoVoce => ({ tipo: 'yen', importo });
const articolo = (a: string): EffettoVoce => ({ tipo: 'articolo', articolo: a });

/** Le 17 voci della Lettura delle affinità, come lette il 2026-10-26 (l'effetto yen, dove c'è). */
const LETTURE: ReadonlyArray<{ uid: string; data: string; azione: string; altri: Array<{ uid: string; effetto: EffettoVoce }>; yenUid: string | null }> = [
  { uid: 'f4bf0b3073f12c8fda1228726659ccff', data: '01-19', azione: 'Lettura delle affinità da Chihaya per Sumire (5.000 yen)', altri: [], yenUid: '305b40d9115ad5357f0fc0568c404121' },
  { uid: '6c089285f98c021026966521910f68b4', data: '01-23', azione: 'Lettura delle affinità con Chihaya per Sumire', altri: [], yenUid: null },
  { uid: '640a4dcaec5494e67cd93f60bf234b0e', data: '08-10', azione: 'Usare la Lettura delle affinità di Chihaya per Ann (5.000 yen)', altri: [], yenUid: '885f312594cd90904841a720479d3e10' },
  { uid: '5c469b6bcc13bc48de7792d83ddd499f', data: '08-11', azione: 'Uscire con Chihaya a Shinjuku; Lettura delle affinità su Sojiro (5.000 yen); Mi piacciono le predizioni / Per me sei solo Chihaya', altri: [], yenUid: '226294c60b0634999191b38b344b05d6' },
  { uid: 'd2a212808853acb9fea97fe97edabddd', data: '08-14', azione: 'Lettura delle affinità da Chihaya su se stessa', altri: [], yenUid: null },
  { uid: 'fb6c178ddd4919ad337e21443c2c095d', data: '08-17', azione: 'Chihaya a Shinjuku: Lettura delle affinità (bersaglio: Akechi)', altri: [], yenUid: null },
  { uid: '0768369e34b44b9c32dddff459b77e2a', data: '08-18', azione: 'Chihaya a Shinjuku: Lettura delle affinità (bersaglio: Sojiro); scoperta della richiesta Smascheriamo i ciarlatani! (Yuichi Fukurai)',
    altri: [{ uid: '9748570b32504ee5a6e578453aad0d37', effetto: { tipo: 'sblocco', bersaglio: 'richiesta', chiave: 'smascheriamo-i-ciarlatani' } }], yenUid: null },
  { uid: 'a5c18f95c05def5ebd90ceaa08645dbc', data: '08-23', azione: 'Ottenere la Lettura delle affinità su Ohya a Shinjuku', altri: [], yenUid: null },
  { uid: '047a1b237f321065f97ba53ddcceb900', data: '08-25', azione: 'Ottenere la Lettura delle affinità su Ohya a Shinjuku', altri: [], yenUid: null },
  { uid: '6dd60d0c808bd64cd533888664804e6e', data: '09-26', azione: 'Shinjuku: Lettura delle affinità - Ohya', altri: [], yenUid: null },
  { uid: 'a3aa84c19c38f0278448dce8b1b0f5a5', data: '09-27', azione: 'Shinjuku: Lettura delle affinità - Ohya', altri: [], yenUid: null },
  { uid: 'e31f8bb402198fcf8a82766afbae072b', data: '10-02', azione: 'Chihaya a Shinjuku: Lettura delle affinità su Iwai; uscita con Chihaya', altri: [], yenUid: null },
  { uid: '6c1f367d28b4063db4e5d73e70257366', data: '10-15', azione: 'Chihaya: Lettura delle affinità, poi uscita con Hifumi a Shinjuku: Potrebbe portare fortuna / Credo in te', altri: [], yenUid: null },
  { uid: 'ec28cf20f6e4e2d5fc2f9cf57154703c', data: '10-22', azione: 'Shinjuku: pagare Chihaya per la Lettura delle affinità su Iwai', altri: [], yenUid: null },
  { uid: '6bf9333e8c898c2198c90682b57fd0a1', data: '11-08', azione: 'Shinjuku: Lettura delle affinità con Chihaya per Hifumi (richiede due letture)', altri: [], yenUid: null },
  { uid: '59e32d44e7eb1992c9f6cba658db70c9', data: '11-09', azione: 'Shinjuku: seconda Lettura delle affinità per Hifumi', altri: [], yenUid: null },
  { uid: '6bde825da002dd4f04cd7dd52137b204', data: '11-12', azione: 'Shinjuku: Lettura delle affinità per Hifumi; chiesa: uscire con Hifumi: Trionferai alla fine / Io credo in te', altri: [], yenUid: null },
];

const ABILITA_PRIMA = 'Rafforza il legame con un Confidente a scelta (costo 5.000¥ per utilizzo)';
const ABILITA_DOPO = 'Rafforza il legame con un Confidente a scelta (a pagamento, a ogni lettura: il prezzo è nell’offerta di Chihaya a Shinjuku)';

export const migration304: Migration = {
  id: 304,
  name: 'chihaya_pietra_sacra_e_affinita',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['negozio', 'articolo', 'catalogo_oggetto', 'ricompensa_oggetto', 'luogo', 'voce_giornata', 'voce_effetto']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 304, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'articolo', 'rifornimento_json')) { logger.warn({ migrazione: 304 }, 'colonna del rifornimento assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    // (1) negozio, schede, offerte e il contenuto della Pietra Sacra
    esiti.push(creaNegozio(db, { chiave: NEGOZIO, nome: 'Chihaya Mifune', luogo: 'Shinjuku', quartiere: 'shinjuku', sede: 'shinjuku/chihaya-stand', tipo: 'altro',
      confidente: db.prepare("SELECT 1 FROM main.confidente WHERE chiave = 'chihaya'").get() ? 'chihaya' : null,
      note: 'La bancarella della chiromante di Shinjuku: la Pietra Sacra del primo incontro e, dal rango 5 del Confidente, la Lettura delle affinità. Le altre letture (della buona sorte, del denaro) sono abilità del Confidente.',
      fonte: FONTE_CHIHAYA, condizioni: [{ tipo: 'data', dal: '06-23' }] }, adesso));
    esiti.push(creaScheda(db, { chiave: 'chiave/pietra-sacra', categoria: 'chiave', nome: 'Pietra Sacra', effetto: 'Chihaya la trasforma in 3 Salgemma infranto.',
      descrizione: 'Venduta da Chihaya Mifune a Shinjuku. Al rango 9 del suo Confidente Chihaya restituisce quanto pagato.', fonteChiave: 'confidente-chihaya-mifune/Pietra Sacra' }, adesso));
    esiti.push(creaScheda(db, { chiave: 'altro/lettura-delle-affinita', categoria: 'altro', nome: 'Lettura delle affinità', effetto: 'Rafforza il legame con un Confidente a scelta.',
      descrizione: 'Servizio di Chihaya Mifune a Shinjuku, dal rango 5 del suo Confidente.', fonteChiave: 'confidente-chihaya-mifune/Lettura delle affinità' }, adesso));
    esiti.push(creaOfferta(db, { chiave: PIETRA, negozio: NEGOZIO, nome: 'Pietra Sacra', categoria: 'chiave', prezzo: 100_000, catalogo: 'chiave/pietra-sacra',
      condizioni: [{ tipo: 'data', dal: '06-23' }], quantita: 1, rifornimento: { tipo: 'mai', origine: 'guida' }, fonte: `${FONTE_CHIHAYA} ; ${FONTE_OGGETTI}` }, adesso));
    esiti.push(creaOfferta(db, { chiave: AFFINITA, negozio: NEGOZIO, nome: 'Lettura delle affinità', categoria: 'altro', prezzo: 5_000, catalogo: 'altro/lettura-delle-affinita',
      condizioni: [{ tipo: 'confidente', confidente: 'chihaya', rango: 5 }], quantita: FALLBACK_UTENTE.q, rifornimento: FALLBACK_UTENTE.r, fonte: FONTE_CHIHAYA }, adesso));
    const conPietra = !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(PIETRA);
    const conAffinita = !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(AFFINITA);
    if (conPietra && db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(SALGEMMA)) {
      const n = db.prepare("INSERT INTO main.ricompensa_oggetto (fonte_tipo, fonte_chiave, catalogo_chiave, quantita, ordine, nota) VALUES ('articolo', ?, ?, 3, 0, ?) ON CONFLICT DO NOTHING")
        .run(PIETRA, SALGEMMA, 'Chihaya trasforma la Pietra Sacra in 3 Salgemma infranto').changes;
      esiti.push({ chiave: `contenuto:${PIETRA}`, esito: n ? '3 Salgemma infranto' : 'contenuto già presente' });
    } else esiti.push({ chiave: `contenuto:${PIETRA}`, esito: 'offerta o Salgemma assenti: nessun contenuto' });
    // (2) il prezzo copiato nell'abilità
    if (esisteTabella(db, 'confidente_abilita') && conAffinita) esiti.push(correggiTesto(db, { tabella: 'confidente_abilita', dove: "confidente_chiave = 'chihaya' AND rango = 5 AND nome = 'Lettura delle affinità'", parametri: [], colonna: 'descrizione', prima: ABILITA_PRIMA, dopo: ABILITA_DOPO, etichetta: 'abilita:chihaya:5' }, adesso));
    // (3) le voci
    const partite = tabellePartiteConVoce(db);
    if (conPietra) esiti.push(convertiVoce(db, { uid: 'd57dcd1811b7f22289e377dcd40b6b4e', data: '06-28', azione: 'Shinjuku: comprare la Pietra Sacra (100.000 yen)',
      // l'effetto yen viene da una proposta applicata (uid casuale su ogni copia: letto il 2026-10-26 come 7379dacd…): si riconosce dal valore
      attesi: [{ uid: '8528805716b56df0d7679aa20b3f832c', effetto: { tipo: 'storia', evento: 'pietra-sacra-comprata' } }, { uid: null, effetto: yen(-100_000), togli: true }],
      togli: [], aggiungi: [{ seme: 'O5-Fbis-304:pietra:d57dcd1811b7f22289e377dcd40b6b4e', effetto: articolo(PIETRA) }],
      collega: { tipoPrima: 'acquisto', riferimentoPrima: null, tipo: 'acquisto', riferimento: { tipo: 'negozio', chiave: NEGOZIO } },
      motivo: 'il prezzo lo scala l’offerta della Pietra Sacra (decisione 2), che dà anche i 3 Salgemma' }, partite, adesso));
    if (conAffinita) for (const v of LETTURE) {
      // l'effetto yen e lo sblocco del 08-18 sono nati da decisioni (proposte applicate): uid casuale, diverso su ogni copia dei dati, quindi si
      // riconoscono dal valore e dalla posizione (gli uid qui sopra sono quelli letti sulla copia del 2026-10-26, solo per chi legge)
      const attesi: EffettoAtteso[] = [...v.altri.map((a) => ({ uid: null, effetto: a.effetto })), ...(v.yenUid ? [{ uid: null, effetto: yen(-5_000), togli: true as const }] : [])];
      esiti.push(convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione, attesi, togli: [],
        aggiungi: [{ seme: `O5-Fbis-304:affinita:${v.uid}`, effetto: articolo(AFFINITA) }],
        motivo: v.yenUid ? 'la lettura si paga dall’offerta: l’effetto yen esce (decisione 2)' : 'la lettura si paga dall’offerta (5.000 ¥ a lettura)' }, partite, adesso));
    }
    const conteggi = {
      negozi: esiti.filter((e) => e.chiave === NEGOZIO && e.esito.startsWith('creato')).length,
      schede: esiti.filter((e) => e.esito === 'scheda creata').length,
      offerte: esiti.filter((e) => e.chiave.startsWith(`${NEGOZIO}/`) && e.esito.startsWith('creata')).length,
      contenuti: esiti.filter((e) => e.esito === '3 Salgemma infranto').length,
      testi: esiti.filter((e) => e.esito === 'corretto').length,
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata')).length,
    };
    const cambiato = conteggi.negozi + conteggi.schede + conteggi.offerte + conteggi.contenuti + conteggi.testi + conteggi.vociConvertite > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 304, { fonti: [FONTE_CHIHAYA, FONTE_OGGETTI], conteggi, esiti,
      decisioneDellUtente: 'Rimborso della Pietra Sacra al rango 9 di Chihaya (guida: 6 ottobre): il Diario non ha la voce del rango 9 e l’app non muove yen per un rango. Scelte possibili: aggiungere al Diario la voce del 6 ottobre con l’effetto «Yen +100.000», oppure una causa «rango» degli yen automatici (ricostruzione di utente.yen_automatico). Finché non si sceglie, il rimborso si segna a mano (decisione 18).' }, cambiato);
    logger.info({ migrazione: 304, ...conteggi }, 'Chihaya: Pietra Sacra con i Salgemma, Lettura delle affinità, voci collegate');
  },
};
