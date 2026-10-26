// ============================================================
// Migrazione 281 — le proposte «da completare» della lotteria e della sfida del 18 maggio (Ondata 5, Lotto G; decisioni 2, 18, 19, 21)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): «Le voci del periodo validato (04-18, 05-09, 05-18 sera) solo come proposte da approvare riga per
// riga». Decisione 2: un effetto «yen» non sta su una voce il cui prezzo vive già in un altro dato (l'offerta, l'esito della sfida); decisione
// 18: il prezzo dell'offerta si scala da solo. Le proposte L13-4b aperte su queste voci mettevano proprio una seconda copia del prezzo
// («yen −3.000» della lotteria, «yen −500» della sfida) e il trofeo direttamente sulla voce, che invece segna l'esito «Vinto» dell'estrazione
// (migrazione 280). Che cosa fa, SOLO su `proposta_conversione_voce` (nessuna voce del Diario cambia, impronta controllata):
//   - 04-18 giorno (`51ff6b73`, «Acquisto biglietto della lotteria»): nuova proposta = collegamento al negozio «Lotteria» + acquisto del
//     Lotto R (3.000 ¥ dall'offerta); la vecchia «yen −3.000» si chiude come sostituita;
//   - 05-09 sera (`351777df`, «compra un biglietto Lotto R», spuntata nella partita 1): la guida [S5] dice di controllare prima l'esito e di
//     ricomprare solo se non si è vinto. Due proposte, da decidere una per una: (a) collegamento al negozio + verifica dell'estrazione (turno
//     dell'attività con l'esito scelto alla spunta: «Vinto» segna il trofeo); (b) l'acquisto del Lotto R, solo se non si è vinto. Le vecchie
//     «yen −3.000» e «trofeo» si chiudono come sostituite. Con la decisione 19 l'approvazione su una voce già spuntata non applica niente da
//     sola: l'effetto di stato va nell'elenco della partita, e la verifica (un turno) si registra togliendo e rimettendo la spunta;
//   - 05-18 sera (`ca8068b2`, sfida Big Bang Burger): la vecchia «yen −500» si chiude come superata: il prezzo di sera (500 ¥) è un dato
//     dell'offerta della sfida (lotto E) e lo scala il turno con l'esito, già proposto (`L13-4b-ca8068b2-04-a-esiti-attivita`). Le altre
//     proposte della voce restano come sono;
//   - le altre tre voci della sfida (06-07 `3e5106de`, 08-14 `fb0ac49a`, 08-15 `3c0edc3d`, fuori dal periodo validato), che il lotto E ha
//     lasciato a questo lotto: hanno già il turno con l'esito (migrazione 234), che paga il prezzo dell'offerta; le loro proposte «yen −500»,
//     «yen −2.000» e «yen −2.500» sarebbero una seconda copia (l'approvazione le rifiuterebbe, `yen-gia-strutturati`) e si chiudono come
//     superate, solo finché il turno con l'esito è sulla voce. I 2.000 e 2.500 ¥ di giorno restano da verificare in gioco (decisione 5): il
//     testo delle voci non cambia.
// Una proposta vecchia si chiude solo se è ancora aperta e con il contenuto letto il 2026-10-26; una nuova nasce solo se la voce, l'offerta e
// l'attività esistono. Contenuto delle proposte mai riscritto (append-only, migrazioni 236/237). Idempotente. Audit in `dati_guida.audit-281-proposte-lotteria`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario } from './rifornimentoOndata5.js';
import { CHIOSCO, ESTRAZIONE, LOTTO_R, scriviAuditLotteria } from './lotteriaOndata5.js';

const AUDIT = 'audit-281-proposte-lotteria';
const LOTTO = 'ondata-5-G';
const errore = (motivo: string): never => { throw new Error(`281: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string };

const VOCE_18_APRILE = '51ff6b738bf55cab3dc309ced5cdb224';
const VOCE_9_MAGGIO = '351777dff01f943f2e8506d829caa5c7';
const VOCE_18_MAGGIO = 'ca8068b24c0fe186d2183abb62e1e621';

const articolo = [{ effetto: { tipo: 'articolo', articolo: LOTTO_R }, completa: [], scelte: null }];
const verifica = [{ effetto: { tipo: 'turno', attivita: ESTRAZIONE }, completa: [], scelte: null }];

interface Nuova { id: string; voce: string; effetti: unknown[]; motivo: string; certezza: 'certa' | 'probabile' | 'da-verificare'; serve: 'articolo' | 'attivita' }
const NUOVE: readonly Nuova[] = [
  { id: 'O5G-51ff6b73-01-lotto-r', voce: VOCE_18_APRILE, effetti: articolo, certezza: 'da-verificare', serve: 'articolo',
    motivo: 'Ondata 5, lotto G: «comprare un biglietto della Lotto R per 3.000 Yen dal Chiosco della lotteria» è l’acquisto dell’offerta «Lotto R» del negozio «Lotteria» (Piazza della Stazione); il prezzo lo scala l’offerta (decisioni 2 e 18), quindi la proposta «yen −3.000» della voce è chiusa come sostituita. Resta «da verificare» perché la voce lo dice facoltativo («Se punti ad ottenere tutti i trofei»). Periodo validato: solo con il tuo sì.' },
  { id: 'O5G-351777df-01-verifica', voce: VOCE_9_MAGGIO, effetti: verifica, certezza: 'probabile', serve: 'attivita',
    motivo: 'Ondata 5, lotto G: la guida del 9 maggio (settimana 5) dice di controllare prima se il biglietto ha vinto: è un turno dell’«Estrazione della lotteria», con l’esito scelto alla spunta («Vinto» segna da solo il trofeo «Soldi facili», «Non vinto» niente). Sostituisce la proposta che metteva il trofeo sulla voce. La voce è spuntata nella partita 1: con la decisione 19 il turno si registra togliendo e rimettendo la spunta. «Probabile»: la voce scrive l’acquisto, la verifica viene dalla guida. Periodo validato: solo con il tuo sì.' },
  { id: 'O5G-351777df-02-lotto-r', voce: VOCE_9_MAGGIO, effetti: articolo, certezza: 'da-verificare', serve: 'articolo',
    motivo: 'Ondata 5, lotto G: «compra un biglietto Lotto R (3.000 Yen)» è l’acquisto dell’offerta «Lotto R» del negozio «Lotteria»; il prezzo lo scala l’offerta (decisioni 2 e 18), quindi la proposta «yen −3.000» della voce è chiusa come sostituita. Per la guida si ricompra solo se non si è vinto: approvala solo se è così. La voce è spuntata nella partita 1: con la decisione 19 l’acquisto va nell’elenco della partita da approvare. Periodo validato: solo con il tuo sì.' },
];

/** `da`: la proposta che la sostituisce, o null quando il dato che porta il prezzo è già sulla voce (il turno della sfida, migrazione 234). */
interface Vecchia { id: string; voce: string; effetti: string; modo: 'sostituita' | 'superata'; da: string | null; perche: string }
const PERCHE_SFIDA = 'il turno della sfida è già sulla voce (migrazione 234) e il suo esito paga il prezzo dell’offerta della sfida (decisioni 2 e 5; il prezzo di giorno dell’offerta resta da verificare in gioco): un effetto yen ne sarebbe una seconda copia, e l’approvazione lo rifiuterebbe (`yen-gia-strutturati`) (migrazione dell’ondata 5, lotto G)';
const VECCHIE: readonly Vecchia[] = [
  { id: 'L13-4b-51ff6b73-03-b-yen', voce: VOCE_18_APRILE, effetti: '[{"effetto":{"tipo":"yen","importo":-3000},"completa":[],"scelte":null}]', modo: 'sostituita', da: 'O5G-51ff6b73-01-lotto-r',
    perche: 'il prezzo del Lotto R vive nell’offerta del negozio «Lotteria» e si scala da solo (decisioni 2 e 18): un effetto yen ne sarebbe una seconda copia (migrazione dell’ondata 5, lotto G)' },
  { id: 'L13-4b-351777df-04-b-yen', voce: VOCE_9_MAGGIO, effetti: '[{"effetto":{"tipo":"yen","importo":-3000},"completa":[],"scelte":null}]', modo: 'sostituita', da: 'O5G-351777df-02-lotto-r',
    perche: 'il prezzo del Lotto R vive nell’offerta del negozio «Lotteria» e si scala da solo (decisioni 2 e 18): un effetto yen ne sarebbe una seconda copia (migrazione dell’ondata 5, lotto G)' },
  { id: 'L13-4b-351777df-03-b-premio', voce: VOCE_9_MAGGIO, effetti: '[{"effetto":{"tipo":"trofeo","trofeo":"soldi-facili"},"completa":[],"scelte":null}]', modo: 'sostituita', da: 'O5G-351777df-01-verifica',
    perche: 'il trofeo «Soldi facili» lo segna l’esito «Vinto» della verifica dell’estrazione, scelto alla spunta: sulla voce varrebbe anche senza vincita (migrazione dell’ondata 5, lotto G)' },
  { id: 'L13-4b-ca8068b2-01-b-yen', voce: VOCE_18_MAGGIO, effetti: '[{"effetto":{"tipo":"yen","importo":-500},"completa":[],"scelte":null}]', modo: 'superata', da: 'L13-4b-ca8068b2-04-a-esiti-attivita',
    perche: 'il prezzo di sera della sfida (500 ¥) è un dato dell’offerta (lotto E) e lo scala il turno con l’esito, già proposto: un effetto yen ne sarebbe una seconda copia (decisione 2; migrazione dell’ondata 5, lotto G)' },
  // le altre voci della sfida (fuori dal periodo validato), già collegate al turno con l'esito dalla 234: il lotto E le ha lasciate al lotto G
  { id: 'L13-4b-3e5106de-01-b-yen', voce: '3e5106dec8bfe998093d39a88dbc301b', effetti: '[{"effetto":{"tipo":"yen","importo":-500},"completa":[],"scelte":null}]', modo: 'superata', da: null, perche: PERCHE_SFIDA },
  { id: 'L13-4b-fb0ac49a-02-b-yen', voce: 'fb0ac49af6e48c2172f4250626e1c521', effetti: '[{"effetto":{"tipo":"yen","importo":-2000},"completa":[],"scelte":null}]', modo: 'superata', da: null, perche: PERCHE_SFIDA },
  { id: 'L13-4b-3c0edc3d-02-b-yen', voce: '3c0edc3d0692f34375c5db5c718248d0', effetti: '[{"effetto":{"tipo":"yen","importo":-2500},"completa":[],"scelte":null}]', modo: 'superata', da: null, perche: PERCHE_SFIDA },
];

function nuova(db: AppDatabase, n: Nuova, adesso: string): Esito {
  if (db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(n.id)) return { chiave: n.id, esito: 'proposta già presente' };
  if (!db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(n.voce)) return { chiave: n.id, esito: 'voce assente: nessuna proposta' };
  if (n.serve === 'articolo' && !db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(LOTTO_R)) return { chiave: n.id, esito: 'offerta del Lotto R assente: nessuna proposta' };
  if (n.serve === 'attivita' && !db.prepare('SELECT 1 FROM main.attivita WHERE chiave = ? AND nascosto = 0').get(ESTRAZIONE)) return { chiave: n.id, esito: 'attività dell’estrazione assente: nessuna proposta' };
  const conNegozio = !!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ? AND nascosto = 0').get(CHIOSCO.chiave);
  db.prepare(`INSERT INTO main.proposta_conversione_voce (id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il)
    VALUES (?, ?, ?, NULL, ?, ?, ?, '[]', ?, ?, ?)`)
    .run(n.id, n.voce, LOTTO, conNegozio ? 'negozio' : null, conNegozio ? CHIOSCO.chiave : null, JSON.stringify(n.effetti), n.motivo, n.certezza, adesso);
  return { chiave: n.id, esito: `proposta creata (aperta, ${n.certezza}${conNegozio ? ', con il collegamento al negozio' : ''})` };
}

function chiudi(db: AppDatabase, v: Vecchia, adesso: string): Esito {
  const r = db.prepare('SELECT voce_uid, stato, effetti_json FROM main.proposta_conversione_voce WHERE id = ?').get(v.id) as { voce_uid: string; stato: string; effetti_json: string } | undefined;
  if (!r) return { chiave: v.id, esito: 'proposta assente' };
  if (r.stato !== 'aperta') return { chiave: v.id, esito: `già decisa (${r.stato}): non toccata` };
  if (r.voce_uid !== v.voce || r.effetti_json !== v.effetti) return { chiave: v.id, esito: 'contenuto diverso da quello atteso: non toccata' };
  // la sostituta deve esserci (aperta o già decisa): una proposta non si chiude a favore di una che non esiste
  if (v.da !== null && !db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(v.da)) return { chiave: v.id, esito: `la proposta che la sostituisce (${v.da}) non c’è: lasciata aperta` };
  // senza sostituta: il turno della sfida (con il suo esito) deve essere ancora sulla voce, altrimenti la proposta resta com'è
  if (v.da === null && !(db.prepare("SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'turno' AND chiave = 'sfida-big-bang-burger'").pluck().all(v.voce) as string[])
    .some((j) => { try { return typeof (JSON.parse(j) as { esito?: unknown }).esito === 'string'; } catch { return false; } })) {
    return { chiave: v.id, esito: 'la voce non ha più il turno della sfida con l’esito: lasciata aperta' };
  }
  if (db.prepare("UPDATE main.proposta_conversione_voce SET stato = 'scartata', decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'")
    .run(adesso, JSON.stringify({ modo: v.modo, ...(v.da ? { da: v.da } : {}), perche: v.perche }), v.id).changes !== 1) errore(`la proposta ${v.id} non si chiude`);
  return { chiave: v.id, esito: `chiusa come ${v.modo}${v.da ? ` (${v.da})` : ' (turno della sfida sulla voce)'}` };
}

export const migration281: Migration = {
  id: 281,
  name: 'proposte_della_lotteria',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['proposta_conversione_voce', 'voce_giornata', 'articolo', 'attivita', 'negozio']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 281, tabella: t }, 'tabella assente: proposte della lotteria non toccate'); return; }
    }
    const adesso = new Date().toISOString();
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [...NUOVE.map((n) => nuova(db, n, adesso)), ...VECCHIE.map((v) => chiudi(db, v, adesso))];
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      create: esiti.filter((e) => e.esito.startsWith('proposta creata')).length,
      chiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
      nonToccate: esiti.filter((e) => /non toccata|assente|lasciata aperta|nessuna/.test(e.esito)).length,
    };
    scriviAuditLotteria(db, AUDIT, 281, { conteggi, esiti });
    logger.info({ migrazione: 281, ...conteggi }, 'Lotteria: proposte da completare sulle voci del periodo validato');
  },
};
