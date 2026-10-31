// ============================================================
// Migrazione 326 — le proposte certe del periodo validato applicate, tranne concimare la pianta (L13, ondata 10, lotto O10-4)
// ============================================================
//
// Domanda posta all'utente il 2026-10-31 (domanda 4): le proposte aperte delle voci del periodo validato, fino al 1° giugno; sicure = negozi
// riconosciuti, oggetti citati nel testo, Cercalavoro che sblocca i lavori, collegamento all'unica Dote di cruciverba/studio/Aojiru/lezioni,
// concimare la pianta; da verificare = distributori «fai il pieno», trofei, importi incerti, bagno 2/5 e 26/5, grimaldelli. Risposta
// dell'utente: «ok tranne concimare la pianta che dipende dal tipo di bionutrimenti che si usano quanta gentilezza si ottiene. Proposte da
// verificare lasciale proposte poi le vedo io...».
//
// MISURA (copia portata alla 322, 2026-10-31): aperte sulle voci dal 04-01 al 06-01 107, di cui 55 certe, 44 da verificare e 8 probabili. Le 55
// certe la 302 le aveva lasciate per il solo motivo (c): la voce è spuntata nella partita 1 (e560e452 anche nella 3). Il «ok» dell'utente vale
// ora come decisione anche per le voci spuntate (`ancheSpuntata`). ELENCO CHIUSO (`PROPOSTE`, `LASCIATE`):
//   - 44 si applicano davvero;
//   - 7 hanno l'effetto o il collegamento già nella voce (le domande 4, 6, 17, 68 e 69 messe dalla 315; il Canale di televendite del 05-08 e del
//     05-22 messo dalla 321): si chiudono come applicate senza toccare la voce, con l'esito «già presente»;
//   - 4 restano aperte: le tre «Concimare la pianta…» (esclusione dell'utente: la Gentilezza dipende dal fertilizzante usato) e il −500 ¥ del
//     bagno del 26/5 (L13-4b-0312ae2c-02-b-yen), voce che l'utente ha messo fra quelle da vedere: si decide insieme alla da verificare
//     L13-4b-0312ae2c-03-a-esiti-attivita. Le 44 da verificare e le 8 probabili non si toccano.
//
// COME. Prima tutto si confronta con la lettura del 2026-10-31 (`lettura`: impronta della proposta — voce, lotto, tipo, collegamento, effetti,
// togli, certezza, stato — e della voce — giorno, testo, tipo, collegamento, effetti canonici in ordine) e gli effetti da togliere devono essere
// sulla voce: se una proposta da fare non è più quella letta la migrazione non applica NULLA (annullata tutta: l'audit dice quali e perché, la
// prossima esecuzione riprova; non blocca l'avvio). Poi, voce per voce, in un punto di ripristino:
//   1. il percorso della pagina «Da completare»: `applicaPropostaConversione` con `revisionePropostaAttesa` (→ `aggiornaVoce` →
//      `salvaEffettiVoce`: collegamento verificato, UID e revisione degli effetti, verifiche di ogni effetto, regola degli yen), sulla stessa
//      connessione dei servizi, come la 302;
//   2. se così le partite cambierebbero (la voce è spuntata: `salvaEffettiVoce` segnerebbe gli stati, oggetti o sblocchi, nella partita), il
//      punto di ripristino si annulla e la voce passa da `convertiVoce` con `ancheSpuntata { decisione: parole dell'utente }` e il collegamento,
//      come la 321: mai SQL parallelo agli invarianti. Il risultato deve essere IDENTICO (tipo, collegamento, effetti canonici in ordine) a
//      quello che i servizi, con le loro verifiche, avevano scritto; altrimenti la migrazione si annulla;
//   3. una proposta che le verifiche della voce respingono resta aperta col messaggio, e la voce torna com'era (regola della 302).
// Le ricevute delle partite non cambiano: gli effetti aggiunti a una voce spuntata entrano togliendo e rimettendo la spunta (l'annullo legge le
// ricevute, `motoreDiario.annullaEffettiVoce`).
//
// Controlli (uno che non torna annulla tutta la migrazione, come nella 302 e nella 321): lo schema `utente` identico (impronta di ogni riga);
// tutte le voci del Diario fuori da quelle toccate identiche (riga, effetti, registro di transizione), periodo validato compreso; tutte le
// proposte fuori dall'elenco identiche (le 4 lasciate, le da verificare, le probabili e ogni altra). Idempotente: la seconda volta trova le 51
// proposte decise da questa migrazione (l'elenco `decise` dell'audit: l'esito scritto dai servizi è protetto da un trigger e non porta il numero
// della migrazione; quello di `convertiVoce` sì) e non scrive (l'audit resta com'è). Audit in `dati_guida.audit-326-proposte-certe`. Solo `main`.
// Le 7 «già presenti» hanno l'esito dei servizi ({modo: 'proposta', dati: {}, aggiunti: 0}); l'audit le dice «già presente».
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { canonico, convertiVoce, tabellePartiteConVoce, uidDa } from './fbisOndata5.js';
import { improntaVoce238 } from './238_proposte_conversione_l13_4b.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { ordineGioco } from '../../../shared/condizioniSpillo.js';

const AUDIT = 'audit-326-proposte-certe';
const LOTTO = 'O10-4';
const DECISIONE = 'ok tranne concimare la pianta che dipende dal tipo di bionutrimenti che si usano quanta gentilezza si ottiene. Proposte da verificare lasciale proposte poi le vedo io...';
const RICHIESTA = '2026-10-31, risposta alla domanda 4 (proposte aperte delle voci del periodo validato, fino al 1° giugno): «ok tranne concimare la pianta che dipende dal tipo di bionutrimenti che si usano quanta gentilezza si ottiene. Proposte da verificare lasciale proposte poi le vedo io...» (L13, ondata 10, lotto O10-4)';
const errore = (motivo: string): never => { throw new Error(`326: ${motivo}; nessuna modifica applicata.`); };

/** Già presente nella voce, letto il 2026-10-31: l'effetto della proposta (canonico) o il collegamento della proposta. */
type Gia = 'effetto' | 'collegamento';
/** Le 51 proposte certe da decidere, lette il 2026-10-31 sulla copia portata alla 322 (`lettura`: vedi `letturaDi`). */
const PROPOSTE: ReadonlyArray<{ id: string; voce: string; data: string; lettura: string; gia?: Gia }> = [
  { id: 'L13-4b-e560e452-01-a-riferimento-mancante', voce: 'e560e452e9081157593f26ccb2a06659', data: '04-17', lettura: 'a1951d7ec796664577aca0add04bff6e' },
  { id: 'L13-4b-e560e452-03-b-yen', voce: 'e560e452e9081157593f26ccb2a06659', data: '04-17', lettura: 'ea560245fef5a95c14edc165b62bcd7f' },
  { id: 'L13-4b-225dcbea-01-a-riferimento-di-altro-tipo', voce: '225dcbea63fa93599b5197e583b8692a', data: '04-18', lettura: '725a7839a082428a204e76900b41a805' },
  { id: 'L13-4b-225dcbea-02-b-sblocco-lavoro', voce: '225dcbea63fa93599b5197e583b8692a', data: '04-18', lettura: '0bca009626266934037d127f882a82f3' },
  { id: 'L13-4b-2eff85fe-01-a-riferimento-mancante', voce: '2eff85fefa94ba5246dc0e094d5f8cb0', data: '04-18', lettura: '7777c1bb9f21347dc5fc8075f6472315' },
  { id: 'L13-4b-3c0aa9eb-01-a-riferimento-mancante', voce: '3c0aa9ebe48abd013e7c05d24074506e', data: '04-18', lettura: '2bc4fad6c010ce594a6405c440dc1f6e' },
  { id: 'L13-4b-bd932c4a-01-a-riferimento-mancante', voce: 'bd932c4af9a72336d43ff4c89646a9f2', data: '04-18', lettura: '29250ae85173a61d6af9618d844c075e' },
  { id: 'L13-4b-bd932c4a-02-b-acquisto', voce: 'bd932c4af9a72336d43ff4c89646a9f2', data: '04-18', lettura: '4a1c296c3db19d1bba5823afa59bce85' },
  { id: 'L13-4b-d85489d6-01-b-premio', voce: 'd85489d6b02ee6817d2e37d88aabe161', data: '04-18', lettura: 'a0b7aa6bc4aa9ed4736f8aa283ad1c27' },
  { id: 'L13-4b-ee6000f4-01-b-premio', voce: 'ee6000f4f0f2711456417b78a0b81e8a', data: '04-21', lettura: '430fa4d56a66c1e3940414f6578312e1' },
  { id: 'L13-4b-cdc7e3a8-01-b-yen', voce: 'cdc7e3a818e612b94efe7853135f7617', data: '04-22', lettura: '67185530a18dfd5d4c4bf41fc0ba9687' },
  { id: 'L13-4b-cdc7e3a8-02-b-premio', voce: 'cdc7e3a818e612b94efe7853135f7617', data: '04-22', lettura: '6aaef191ca2828001e00526fcd51b839' },
  { id: 'O5E-0b3239d9-01-articolo', voce: '0b3239d98c006197b31530bb9187c475', data: '04-23', lettura: 'e83aada82682d329de79d52239d80ef2' },
  { id: 'L13-4b-23414c50-02-a-esiti-attivita', voce: '23414c504a833d3582e1a4bcad3ea47e', data: '04-25', lettura: '095efd996454775e6f9b9499b3e84d26' },
  { id: 'R298-5fc91cc4-domanda-4', voce: '5fc91cc4d1909f2ae61e396f792a6ddf', data: '04-25', lettura: 'a945d071f2b13afb860c91b274964ae6', gia: 'effetto' },
  { id: 'L13-4b-092c31de-01-a-riferimento-mancante', voce: '092c31deecc05e43e861a03d539002f9', data: '04-26', lettura: '225488ce905fc491cdfb58937be2156f' },
  { id: 'L13-4b-092c31de-02-b-sblocco-lavoro', voce: '092c31deecc05e43e861a03d539002f9', data: '04-26', lettura: '111803a81cd5582c00a53fda15be31e8' },
  { id: 'L13-4b-8f7a80f6-01-a-riferimento-mancante', voce: '8f7a80f65122c4cdaa6b8c63e6466f58', data: '04-27', lettura: '4bc0294a1892ec0edc8342442a8f95b7' },
  { id: 'L13-4b-a2f59204-03-a-esiti-attivita', voce: 'a2f59204d7f65423c167624e2332263f', data: '04-30', lettura: '9c3df2e6ab287b0a071d5144ee297764' },
  { id: 'R298-59c1b1b5-domanda-6', voce: '59c1b1b504f883586d50e24dfcfb02c4', data: '04-30', lettura: 'f7c4ec6ba9fc199a0090918c52cd2f11', gia: 'effetto' },
  { id: 'L13-4b-3a33d371-01-a-riferimento-mancante', voce: '3a33d3710eeda9d6ad836dc11c78a0b2', data: '05-01', lettura: '4bebbd323c174b2a3071c3564b6aac40' },
  { id: 'L13-4b-ace82921-01-a-riferimento-mancante', voce: 'ace82921a107f403836bfb3f55105d9f', data: '05-01', lettura: '671ec42631c6f98766a049f207523248' },
  { id: 'L13-4b-dbc62717-01-a-riferimento-mancante', voce: 'dbc62717e37ddc3de3550e097fa19582', data: '05-02', lettura: '93b2d0c4ae0c9c04554154c4adcf094a' },
  { id: 'L13-4b-865c3aa8-01-a-riferimento-mancante', voce: '865c3aa8b9e10f1f08b60174b51a52bb', data: '05-03', lettura: '2416d08fbd5cd28ada5e5b80692deeb3' },
  { id: 'L13-4b-aeb2d2e8-03-b-yen', voce: 'aeb2d2e8e418d3b7418893b4472cc5d0', data: '05-04', lettura: 'fd4f422331728ece5837c02e712c3955' },
  { id: 'L13-4b-3ad902f0-01-a-riferimento-mancante', voce: '3ad902f09ee84978956f10b5a8c89137', data: '05-06', lettura: '00c08d4b379cf65f8e19a5678bcc6987' },
  { id: 'L13-4b-3ad902f0-02-b-sblocco-lavoro', voce: '3ad902f09ee84978956f10b5a8c89137', data: '05-06', lettura: 'e6dc3fb8cc226cc8bf0fff329127f95e' },
  { id: 'L13-4b-eacaa17c-01-a-riferimento-mancante', voce: 'eacaa17cf6f7ec8cd6acb9a171f449df', data: '05-06', lettura: '2dffaec6b2dc734be6c0b3734c7523ec' },
  { id: 'L13-4b-41d60886-01-a-riferimento-mancante', voce: '41d60886fa849eeb0498f597698763de', data: '05-07', lettura: 'c0c8688bdc4df10c7846c91f5a380fc8' },
  { id: 'L13-4b-5fa6a386-01-a-riferimento-mancante', voce: '5fa6a38622ecddca33599974eaefd722', data: '05-08', lettura: 'df1934316bfd3043d2b41f339ca764e1' },
  { id: 'L13-4b-7f647050-01-a-riferimento-mancante', voce: '7f6470501ff00db41ffc4d5e59d083bb', data: '05-08', lettura: '5314fa6d59276ef474e42dd56095f63f', gia: 'collegamento' },
  { id: 'L13-4b-70b20e30-01-b-premio', voce: '70b20e307e9ccaf838376492758d1a51', data: '05-13', lettura: '0c0abff3c6f0ae2edd65401d36c38afc' },
  { id: 'L13-4b-0242dfec-01-a-riferimento-mancante', voce: '0242dfecb025cc5a5b589c7d1af55b08', data: '05-18', lettura: 'db07c539c1b3e5100b509780d4741450' },
  { id: 'L13-4b-ca8068b2-04-a-esiti-attivita', voce: 'ca8068b24c0fe186d2183abb62e1e621', data: '05-18', lettura: 'cb4ccb39cdf1bc73ce1f9d0397228795' },
  { id: 'L13-4b-099e312a-01-a-riferimento-mancante', voce: '099e312ac3d0b382e9e198e496db9727', data: '05-19', lettura: 'e80938d255b12f4605dadb4f5de9d4eb' },
  { id: 'R298-099e312a-domanda-68', voce: '099e312ac3d0b382e9e198e496db9727', data: '05-19', lettura: '806d19597649bd8477bbb2c4665502c5', gia: 'effetto' },
  { id: 'L13-4b-0a2654d4-01-a-riferimento-mancante', voce: '0a2654d4d749e0b67ad77481b6ec5777', data: '05-19', lettura: '1aad550575de3242b64874d02bb5a69e' },
  { id: 'L13-4b-15c4ad86-01-a-riferimento-mancante', voce: '15c4ad86919f34f2f8c78e5604b085ac', data: '05-21', lettura: 'eb4dfd45686bfede2f79c117dc781723' },
  { id: 'L13-4b-7c9da107-01-a-riferimento-mancante', voce: '7c9da107e39b28fad251c2a6e3018aff', data: '05-21', lettura: '331ea311e2b0712e2d7a84b388de729f' },
  { id: 'L13-4b-c74a9585-01-a-riferimento-mancante', voce: 'c74a9585f97cab3736c1f4ab91406d2c', data: '05-22', lettura: 'cdfc09aa045d404bdc4eb94d9c9f9325' },
  { id: 'L13-4b-671aa425-01-a-riferimento-mancante', voce: '671aa4250e5f130a0e708067ab257514', data: '05-22', lettura: '40512ac75b630cedb4a03e238a4e9882', gia: 'collegamento' },
  { id: 'L13-4b-0d1f1318-01-a-riferimento-di-altro-tipo', voce: '0d1f1318757c0119a6407810ad3a245e', data: '05-23', lettura: '558b04554aef5c194c7c4c4de6c8da12' },
  { id: 'L13-4b-368424f8-01-a-riferimento-mancante', voce: '368424f85483122a24a92f13fa6b9439', data: '05-26', lettura: '2c64e03c63b308c3109104ce887d8249' },
  { id: 'R298-368424f8-domanda-69', voce: '368424f85483122a24a92f13fa6b9439', data: '05-26', lettura: '48eb39b72ccc4ea40db65cb56daa7bc2', gia: 'effetto' },
  { id: 'L13-4b-66d47e0f-01-a-riferimento-mancante', voce: '66d47e0fe92f6c4138820b0bd9e475b9', data: '05-26', lettura: '1904af73595444ec0b660966d6c26247' },
  { id: 'L13-4b-a0e678ac-01-b-premio', voce: 'a0e678ac7ee759895436eda02b34c0cd', data: '05-26', lettura: '2d3ac7e326bb853451755af8a33845cb' },
  { id: 'L13-4b-2476ffa1-01-a-riferimento-di-altro-tipo', voce: '2476ffa179261f362310915765e6e2a3', data: '05-29', lettura: 'b453de8e663d3e80de290af51edff995' },
  { id: 'L13-4b-6d5ee076-01-a-riferimento-mancante', voce: '6d5ee0760468357768bce5a6e4a9b986', data: '05-29', lettura: '619e05694c35b66fb031dae2dafcfa17' },
  { id: 'L13-4b-fecf3a91-01-a-riferimento-mancante', voce: 'fecf3a910e147675fd3751d93dcc8195', data: '05-29', lettura: '4f854194dcac60f422ea13c9b2ad819a' },
  { id: 'L13-4b-ccc2906f-01-a-riferimento-mancante', voce: 'ccc2906f6d5301fc4f39baae6b08cc65', data: '05-31', lettura: '807a5e29d63750a6dcc2b162a72d9de1' },
  { id: 'R298-c78e13d0-domanda-17', voce: 'c78e13d0921f104355bf413babc8bb96', data: '05-31', lettura: 'c1cc51974bce546a6e786c147bc60095', gia: 'effetto' },
];

/** Le 4 certe che restano aperte, con il motivo (la lettura del 2026-10-31 solo per l'audit). */
const LASCIATE: ReadonlyArray<{ id: string; voce: string; data: string; lettura: string; motivo: string }> = [
  { id: 'O5Fbis-65351e20-01-concimare', voce: '65351e206c3f5c6d2e66b0e5f2f80386', data: '04-19', lettura: '1a97b051982fb5a4188165573f70efbf',
    motivo: 'esclusa dall’utente: concimare la pianta, la Gentilezza che si ottiene dipende dal fertilizzante usato' },
  { id: 'O5Fbis-9f47dd06-01-concimare', voce: '9f47dd06cb1f4fea917a9df628cc28ce', data: '05-05', lettura: '37638a78ad04492ad8397c447a6d6d3a',
    motivo: 'esclusa dall’utente: concimare la pianta, la Gentilezza che si ottiene dipende dal fertilizzante usato' },
  { id: 'O5Fbis-cf4d0fd3-01-concimare', voce: 'cf4d0fd361116f21f039deb6be353b26', data: '05-21', lettura: '3e3eecef20b28b48a74367597c806fa8',
    motivo: 'esclusa dall’utente: concimare la pianta, la Gentilezza che si ottiene dipende dal fertilizzante usato' },
  { id: 'L13-4b-0312ae2c-02-b-yen', voce: '0312ae2c18c6780e6cc98e0887a2d53b', data: '05-26', lettura: 'dbc18ea3d9e09c792b931a5fca633da6',
    motivo: 'il bagno del 26/5 è fra le voci che l’utente vedrà (domanda 4, «da verificare»): il −500 ¥ si decide insieme alla da verificare L13-4b-0312ae2c-03-a-esiti-attivita' },
];

interface RigaProposta {
  id: string; voce_uid: string; lotto: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null;
  effetti_json: string; togli_json: string; certezza: string; stato: string; esito_json: string | null;
}
interface StatoVoce { tipo: string; riferimento: { tipo: string; chiave: string } | null; effetti: Array<{ uid: string; effetto: unknown }> }
type Voce326 = typeof PROPOSTE[number];

const leggiJson = (raw: string | null): unknown => { if (raw === null) return null; try { return JSON.parse(raw) as unknown; } catch { return undefined; } };
const effettoCanonico = (raw: string): string => { try { return canonico(normalizzaEffettoVoce(JSON.parse(raw))); } catch { return '"illeggibile"'; } };
const nelPeriodo = (data: string): boolean => ordineGioco(data) >= ordineGioco('04-01') && ordineGioco(data) <= ordineGioco('06-01');

/** L'impronta di lettura: la proposta (voce, lotto, tipo, collegamento, effetti, togli, certezza, stato) e la voce (giorno, testo, tipo,
 *  collegamento, effetti canonici in ordine). È quella calcolata il 2026-10-31 sulla copia alla 322. */
function letturaDi(db: AppDatabase, id: string): string | null {
  const p = db.prepare('SELECT voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, certezza, stato FROM main.proposta_conversione_voce WHERE id = ?').get(id) as { voce_uid: string } | undefined;
  if (!p) return null;
  const v = db.prepare('SELECT data, azione, tipo, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(p.voce_uid) as object | undefined;
  if (!v) return null;
  const effetti = (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(p.voce_uid) as string[]).map(effettoCanonico);
  return createHash('sha256').update(canonico({ proposta: p, voce: { ...v, effetti } })).digest('hex').slice(0, 32);
}

/** La voce com'è: tipo, collegamento ed effetti (uid e valore canonico) in ordine. */
function statoVoce(db: AppDatabase, uid: string): StatoVoce {
  const v = db.prepare('SELECT tipo, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(uid) as { tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null };
  const effetti = (db.prepare('SELECT uid, dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(uid) as Array<{ uid: string; dati_json: string }>)
    .map((e) => ({ uid: e.uid, effetto: JSON.parse(effettoCanonico(e.dati_json)) as unknown }));
  return { tipo: v.tipo, riferimento: v.riferimento_tipo && v.riferimento_chiave ? { tipo: v.riferimento_tipo, chiave: v.riferimento_chiave } : null, effetti };
}
/** Lo stesso stato senza gli uid (che i servizi danno a caso e `convertiVoce` deriva da un seme). */
const sostanza = (s: StatoVoce): string => canonico({ tipo: s.tipo, riferimento: s.riferimento, effetti: s.effetti.map((e) => e.effetto) });

/** L'impronta di ogni riga dello schema `utente`: deve restare identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** L'impronta di tutte le voci del Diario fuori da quelle toccate (riga, effetti, registro di transizione): periodo validato compreso. */
function improntaAltreVoci(db: AppDatabase, toccate: ReadonlySet<string>): string {
  const h = createHash('sha256');
  for (const [tabella, colonna] of [['voce_giornata', 'uid'], ['voce_effetto', 'voce_uid'], ['voce_effetto_transizione', 'voce_uid']] as const) {
    h.update(`#${tabella}\n`);
    for (const r of db.prepare(`SELECT * FROM main.${tabella} ORDER BY rowid`).iterate() as Iterable<Record<string, unknown>>) {
      if (!toccate.has(String(r[colonna]))) h.update(JSON.stringify(r) + '\n');
    }
  }
  return h.digest('hex');
}

/** L'impronta di tutte le proposte fuori dall'elenco delle 51: le lasciate, le da verificare, le probabili e ogni altra restano identiche. */
function improntaAltreProposte(db: AppDatabase, elenco: ReadonlySet<string>): string {
  const h = createHash('sha256');
  for (const r of db.prepare('SELECT * FROM main.proposta_conversione_voce ORDER BY id').iterate() as Iterable<{ id: string }>) if (!elenco.has(r.id)) h.update(JSON.stringify(r) + '\n');
  return h.digest('hex');
}

/** Le proposte che questa migrazione ha già deciso in un'esecuzione precedente (dall'audit: l'esito scritto dai servizi non si può più
 *  cambiare, un trigger lo protegge, quindi non porta il numero della migrazione). */
function decisePrima(db: AppDatabase): ReadonlySet<string> {
  const raw = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  const esecuzioni = raw ? ((leggiJson(raw) as { esecuzioni?: Array<{ decise?: unknown }> } | undefined)?.esecuzioni ?? []) : [];
  return new Set(esecuzioni.flatMap((e) => (Array.isArray(e.decise) ? e.decise.filter((x): x is string => typeof x === 'string') : [])));
}

/** Le partite in cui la voce è spuntata (per «che cosa fare nella partita»). */
const partiteConSpunta = (db: AppDatabase, uid: string): number[] => db.prepare('SELECT DISTINCT partita_id FROM utente.spunta_voce_partita WHERE voce_uid = ? ORDER BY partita_id').pluck().all(uid) as number[];

/** La prova con i servizi è riuscita ma avrebbe cambiato le partite: si annulla, portando che cosa i servizi avevano composto. */
class AnnullaProva extends Error {
  constructor(readonly dopo: StatoVoce, readonly esiti: Map<string, unknown>) { super('326: prova con i servizi annullata (le partite cambierebbero)'); }
}

function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 326, lotto: LOTTO, richiesta: RICHIESTA, decisione: DECISIONE,
      misura322: { aperteNelPeriodo: 107, certe: 55, daVerificare: 44, probabili: 8, daApplicare: 44, giaPresenti: 7, certeLasciate: 4 },
      daFareNellaPartita: 'le ricevute delle partite non cambiano: gli effetti aggiunti a una voce già spuntata entrano togliendo e rimettendo la spunta (l’annullo legge le ricevute); un collegamento nuovo vale subito, senza fare nulla',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration326: Migration = {
  id: 326,
  name: 'proposte_certe_periodo_validato',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['proposta_conversione_voce', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 326, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const partite = tabellePartiteConVoce(db);
    if (partite === null) { logger.warn({ migrazione: 326 }, 'schema delle partite non attaccato: spunte non verificabili, niente da fare'); return; }
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    const rigaProposta = db.prepare('SELECT id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, certezza, stato, esito_json FROM main.proposta_conversione_voce WHERE id = ?');
    const proposta = (id: string): RigaProposta | undefined => rigaProposta.get(id) as RigaProposta | undefined;
    const azioneDi = (uid: string): string => db.prepare('SELECT azione FROM main.voce_giornata WHERE uid = ?').pluck().get(uid) as string;
    const giaDecise = decisePrima(db);
    /** Decisa da questa migrazione: applicata e nell'elenco dell'audit, o con l'esito di `convertiVoce` che porta il numero della migrazione. */
    const decisaQui = (r: RigaProposta | undefined): boolean =>
      r?.stato === 'applicata' && (giaDecise.has(r.id) || (leggiJson(r.esito_json) as { migrazione?: unknown } | null)?.migrazione === 326);

    // ---- conteggi misurati (voci dal 04-01 al 06-01) e confronto con la lettura del 2026-10-31
    const contaAperte = (): Record<string, number> => {
      const righe = db.prepare("SELECT p.certezza, v.data FROM main.proposta_conversione_voce p JOIN main.voce_giornata v ON v.uid = p.voce_uid WHERE p.stato = 'aperta'").all() as Array<{ certezza: string; data: string }>;
      return righe.filter((r) => nelPeriodo(r.data)).reduce<Record<string, number>>((o, r) => { o[r.certezza] = (o[r.certezza] ?? 0) + 1; o.totale = (o.totale ?? 0) + 1; return o; }, {});
    };
    if (PROPOSTE.every((p) => !proposta(p.id))) { logger.info({ migrazione: 326 }, 'nessuna delle proposte lette il 2026-10-31 in questi dati: niente da fare'); return; }
    if (PROPOSTE.every((p) => decisaQui(proposta(p.id)))) return; // seconda esecuzione: tutto fatto, nessuna scrittura
    const aperteAllInizio = contaAperte();
    const diverse: Array<{ id: string; perche: string }> = [];
    for (const p of PROPOSTE) {
      const r = proposta(p.id);
      if (decisaQui(r)) continue;
      if (!r) { diverse.push({ id: p.id, perche: 'proposta assente' }); continue; }
      if (r.stato !== 'aperta') { diverse.push({ id: p.id, perche: `già decisa (${r.stato}) fuori da questa migrazione` }); continue; }
      if (r.voce_uid !== p.voce) { diverse.push({ id: p.id, perche: 'su un’altra voce' }); continue; }
      if (letturaDi(db, p.id) !== p.lettura) { diverse.push({ id: p.id, perche: 'proposta o voce diverse da quelle lette il 2026-10-31' }); continue; }
      const togli = leggiJson(r.togli_json);
      if (!Array.isArray(togli) || togli.some((u) => typeof u !== 'string' || !db.prepare('SELECT 1 FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').get(u, p.voce))) diverse.push({ id: p.id, perche: 'un effetto da togliere non è sulla voce' });
    }
    if (diverse.length || !stessaConnessione) {
      // annullata tutta: nessuna proposta si applica; l'audit lo dice (solo quando il motivo cambia), la prossima esecuzione riprova
      const esecuzione = { annullata: true, perche: diverse.length ? 'una o più proposte non sono quelle lette il 2026-10-31' : 'la migrazione non usa la connessione dei servizi', diverse, aperteAllInizio };
      const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
      const ultima = vecchio ? ((leggiJson(vecchio) as { esecuzioni?: Array<Record<string, unknown>> } | undefined)?.esecuzioni ?? []).at(-1) : undefined;
      const ultimaSenzaData = ultima ? Object.fromEntries(Object.entries(ultima).filter(([k]) => k !== 'il')) : null;
      scriviAudit(db, esecuzione, canonico(ultimaSenzaData) !== canonico(esecuzione));
      logger.warn({ migrazione: 326, diverse, stessaConnessione }, 'proposte certe del periodo validato: nessuna applicata (dati diversi da quelli letti)');
      return;
    }
    for (const p of PROPOSTE.filter((x) => x.gia)) {
      const r = proposta(p.id)!;
      if (decisaQui(r)) continue;
      const s = statoVoce(db, p.voce);
      if (p.gia === 'effetto') {
        const effetti = leggiJson(r.effetti_json) as Array<{ effetto: unknown }>;
        if (!effetti.length || !effetti.every((e) => s.effetti.some((x) => canonico(x.effetto) === canonico(normalizzaEffettoVoce(e.effetto))))) errore(`l'effetto della proposta ${p.id} non è già sulla voce`);
      } else if (!r.riferimento_tipo || canonico(s.riferimento) !== canonico({ tipo: r.riferimento_tipo, chiave: r.riferimento_chiave })) errore(`il collegamento della proposta ${p.id} non è già sulla voce`);
    }

    // ---- prima delle scritture: le impronte da confrontare alla fine
    const elenco = new Set(PROPOSTE.map((p) => p.id));
    const vociDaFare = new Set(PROPOSTE.filter((p) => !p.gia).map((p) => p.voce));
    const partitePrima = improntaPartite(db);
    const altreVociPrima = improntaAltreVoci(db, vociDaFare);
    const altrePropostePrima = improntaAltreProposte(db, elenco);
    const lasciatePrima = new Map(LASCIATE.map((l) => [l.id, JSON.stringify(proposta(l.id) ?? null)]));
    const adesso = new Date().toISOString();

    // ---- voce per voce, nell'ordine del Diario; nella voce le proposte nell'ordine del loro id
    const perVoce = new Map<string, Voce326[]>();
    for (const p of PROPOSTE) if (!decisaQui(proposta(p.id))) perVoce.set(p.voce, [...(perVoce.get(p.voce) ?? []), p]);
    const esiti: Array<Record<string, unknown>> = [];
    const decise: string[] = [];
    let applicate = 0, giaPresenti = 0, respinte = 0;
    const percorsi: Record<string, number> = {};
    for (const [uid, righe] of perVoce) {
      righe.sort((a, b) => a.id.localeCompare(b.id));
      const giorno = righe[0]!.data;
      const prima = statoVoce(db, uid);
      const primaImpronta = improntaVoce238(db, uid);
      const testo = azioneDi(uid);
      const partiteDellaVoce = partiteConSpunta(db, uid);
      const registra = (r: Voce326, esito: string, extra: Record<string, unknown> = {}): void => {
        const riga = proposta(r.id)!;
        esiti.push({ id: r.id, voce: uid, giorno, testo, lotto: riga.lotto, certezza: riga.certezza, esito, ...extra });
      };
      // 1. la prova con i servizi della pagina «Da completare», in un punto di ripristino
      let percorso: 'servizi' | 'convertiVoce' = 'servizi';
      let esitiServizi = new Map<string, unknown>();
      try {
        db.transaction(() => {
          const lette = new Map<string, unknown>();
          for (const r of righe) {
            const dto = elencaProposteConversione({ da: giorno, a: giorno, stato: 'aperta' }).find((d) => d.id === r.id);
            if (!dto) throw new Error(`proposta ${r.id} non trovata fra le aperte`);
            if (!dto.leggibile) throw new Error(`proposta ${r.id} illeggibile: ${dto.problema ?? ''}`);
            applicaPropostaConversione(r.id, { revisionePropostaAttesa: dto.revisione });
            const dopo = proposta(r.id)!;
            if (dopo.stato !== 'applicata') throw new Error(`proposta ${r.id} non risulta applicata`);
            const esito = leggiJson(dopo.esito_json) as { dati?: unknown } | null;
            if (r.gia && canonico(esito?.dati ?? null) !== canonico({})) throw new Error(`proposta ${r.id}: doveva essere già presente, invece la voce cambia`);
            lette.set(r.id, esito);
          }
          if (improntaPartite(db) !== partitePrima) throw new AnnullaProva(statoVoce(db, uid), lette);
          esitiServizi = lette;
        })();
      } catch (e) {
        if (!(e instanceof AnnullaProva)) {
          // respinta dalle verifiche della voce: le proposte restano aperte col messaggio, la voce torna com'era (regola della 302)
          const x = e as { code?: unknown; message?: unknown };
          const messaggio = `${typeof x.code === 'string' ? `${x.code}: ` : ''}${typeof x.message === 'string' ? x.message : String(e)}`;
          if (improntaVoce238(db, uid) !== primaImpronta) errore(`la voce ${uid}, respinta, non è tornata com'era`);
          for (const r of righe) {
            if (proposta(r.id)!.stato !== 'aperta') errore(`la proposta ${r.id}, respinta, non è più aperta`);
            registra(r, `respinta dalle verifiche della voce (${messaggio}): resta aperta, voce com'era`);
          }
          respinte += righe.length;
          continue;
        }
        if (improntaVoce238(db, uid) !== primaImpronta || improntaPartite(db) !== partitePrima) errore(`la prova della voce ${uid} non si è annullata`);
        // 2. la voce è spuntata: la stessa scrittura con `convertiVoce` e `ancheSpuntata`, che non tocca le partite
        const tipoNuovo = righe.reduce<string | null>((t, r) => proposta(r.id)!.tipo_proposto ?? t, null);
        const rifNuovo = righe.reduce<{ tipo: string; chiave: string } | null>((t, r) => {
          const p = proposta(r.id)!;
          return p.riferimento_tipo && p.riferimento_chiave ? { tipo: p.riferimento_tipo, chiave: p.riferimento_chiave } : t;
        }, null);
        const cambiaCollegamento = (tipoNuovo !== null && tipoNuovo !== prima.tipo) || (rifNuovo !== null && canonico(rifNuovo) !== canonico(prima.riferimento));
        const riferimento = rifNuovo ?? prima.riferimento;
        if (cambiaCollegamento && !riferimento) errore(`la voce ${uid} cambierebbe tipo senza collegamento`);
        const togli = righe.flatMap((r) => leggiJson(proposta(r.id)!.togli_json) as string[]);
        const restano = prima.effetti.filter((x) => !togli.includes(x.uid)).map((x) => canonico(x.effetto));
        const aggiungi: Array<{ seme: string; effetto: EffettoVoce; proposta: string }> = [];
        for (const r of righe) {
          for (const [i, g] of (leggiJson(proposta(r.id)!.effetti_json) as Array<{ effetto: unknown }>).entries()) {
            const effetto = normalizzaEffettoVoce(g.effetto);
            if (!effetto) return errore(`effetto ${i + 1} della proposta ${r.id} non valido`);
            if (restano.includes(canonico(effetto)) || aggiungi.some((a) => canonico(a.effetto) === canonico(effetto))) continue; // già presente: come i servizi
            aggiungi.push({ seme: `${LOTTO}:326:${r.id}:${i}`, effetto, proposta: r.id });
          }
        }
        const c = convertiVoce(db, {
          uid, data: giorno, azione: testo, attesi: prima.effetti.map((x) => ({ uid: x.uid, effetto: x.effetto as EffettoVoce })), togli,
          aggiungi: aggiungi.map((a) => ({ seme: a.seme, effetto: a.effetto })), lotto: LOTTO,
          ...(cambiaCollegamento ? { collega: { tipoPrima: prima.tipo, riferimentoPrima: prima.riferimento, tipo: tipoNuovo ?? prima.tipo, riferimento: riferimento! } } : {}),
          ancheSpuntata: { decisione: DECISIONE },
          motivo: `proposte certe del periodo validato (${righe.map((r) => r.id).join(', ')}): decisione dell’utente del 2026-10-31 («${DECISIONE}»)`,
        }, partite, adesso);
        if (c.esito.startsWith('saltata')) {
          if (improntaVoce238(db, uid) !== primaImpronta) errore(`la voce ${uid}, saltata, è cambiata`);
          for (const r of righe) registra(r, `respinta: ${c.esito}: resta aperta, voce com'era`);
          respinte += righe.length;
          continue;
        }
        if (!c.esito.startsWith('convertita')) errore(`la voce ${uid} risulta «${c.esito}»`);
        if (sostanza(statoVoce(db, uid)) !== sostanza(e.dopo)) errore(`la voce ${uid} scritta con convertiVoce non è quella che i servizi, con le loro verifiche, avevano composto`);
        for (const r of righe) {
          const p = proposta(r.id)!;
          const rifProposto = p.riferimento_tipo && p.riferimento_chiave ? { tipo: p.riferimento_tipo, chiave: p.riferimento_chiave } : null;
          const esito = {
            modo: 'migrazione', migrazione: 326, lotto: LOTTO, decisione: DECISIONE, percorso: 'convertiVoce',
            perche: 'voce spuntata: con i servizi sarebbero cambiate le partite; le ricevute restano',
            servizi: e.esiti.get(r.id) ?? null,
            effetti: aggiungi.filter((a) => a.proposta === r.id).map((a) => uidDa(a.seme)), tolti: leggiJson(p.togli_json),
            ...(rifProposto || p.tipo_proposto ? { collegamento: { tipo: p.tipo_proposto ?? prima.tipo, riferimento: rifProposto ?? prima.riferimento } } : {}),
          };
          if (db.prepare("UPDATE main.proposta_conversione_voce SET stato = 'applicata', decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'").run(adesso, canonico(esito), r.id).changes !== 1) errore(`la proposta ${r.id} non risulta applicata`);
        }
        percorso = 'convertiVoce';
      }
      const dopo = statoVoce(db, uid);
      const effettiCambiati = canonico(prima.effetti.map((x) => x.effetto)) !== canonico(dopo.effetti.map((x) => x.effetto));
      const nellaPartita = partiteDellaVoce.length && effettiCambiati
        ? `spuntata ${partiteDellaVoce.length === 1 ? `nella partita ${partiteDellaVoce[0]}` : `nelle partite ${partiteDellaVoce.join(', ')}`}: le ricevute non cambiano; gli effetti nuovi entrano togliendo e rimettendo la spunta`
        : effettiCambiati ? 'non spuntata: gli effetti nuovi valgono alla spunta' : 'nulla: gli effetti non cambiano (al più cambia il collegamento della voce)';
      for (const r of righe) {
        if (r.gia) giaPresenti += 1; else applicate += 1;
        registra(r, r.gia ? `già presente (${r.gia === 'effetto' ? 'l’effetto è già sulla voce' : 'il collegamento è già quello'}): chiusa come applicata, voce non toccata da lei` : 'applicata',
          { percorso, ...(percorso === 'servizi' ? { esitoServizi: esitiServizi.get(r.id) ?? null } : {}), prima, dopo, daFareNellaPartita: nellaPartita });
        decise.push(r.id);
      }
      percorsi[percorso] = (percorsi[percorso] ?? 0) + 1;
    }

    // ---- controlli: partite identiche; altre voci identiche; altre proposte identiche; lasciate identiche
    if (improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    if (improntaAltreVoci(db, vociDaFare) !== altreVociPrima) errore('una voce fuori da quelle elencate (o del periodo validato) è cambiata');
    if (improntaAltreProposte(db, elenco) !== altrePropostePrima) errore('una proposta fuori dall’elenco è cambiata');
    for (const l of LASCIATE) if (JSON.stringify(proposta(l.id) ?? null) !== lasciatePrima.get(l.id)) errore(`la proposta lasciata ${l.id} è cambiata`);

    const lasciate = LASCIATE.map((l) => {
      const r = proposta(l.id);
      return { id: l.id, voce: l.voce, giorno: l.data, testo: r ? azioneDi(l.voce) : null, stato: r?.stato ?? 'assente', comeLetta: r ? letturaDi(db, l.id) === l.lettura : false, motivo: l.motivo };
    });
    const cambiato = applicate + giaPresenti > 0;
    const conteggi = { aperteAllInizio, aperteAllaFine: contaAperte(), applicate, giaPresenti, respinte, vociPerPercorso: percorsi, certeLasciate: lasciate.length };
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, decise, proposte: esiti, lasciate, improntaPartite: partitePrima }, cambiato);
    logger.info({ migrazione: 326, ...conteggi }, 'proposte certe del periodo validato applicate (tranne concimare la pianta)');
  },
};
