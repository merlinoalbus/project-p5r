// ============================================================
// Migrazione 369 — l'elenco delle Ombre sciagura e le loro ricompense nel blocco «battaglia» (L13-04)
// ============================================================
//
// `dati_guida.battaglia.ombreSciagura.elenco` era `null` e `incertezze` diceva che la guida non fornisce un elenco; `doveCompaiono` ripeteva
// «la guida non fornisce un elenco fisso per zona». La pagina della guida (https://www.allgamestaff.it/persona-5-royal/ombre-sciagura/, riletta
// il 2026-11) ha invece due tabelle:
//   - le Ombre sciagura per Palazzo e per Dedalo: 19 righe (10 per i Palazzi, 9 per i Dedali), con 52 Ombre (54 nomi scritti: la pagina
//     scrive in due modi «Koppa-Tengu»/«Koppa Tengu» e «Kushinada»/«Kushinada-Hime»); otto sono esclusive dei Memento (asterisco);
//   - l'oggetto raro che ognuna rilascia: 52 righe, una per Ombra.
//
// COSA (conservativa, idempotente, un campo alla volta):
//   - `ombreSciagura.elenco`: da `null` a 19 righe `{ sezione: 'palazzi' | 'dedali', luogo, ombre: [{ nome, soloMemento? }] }`, nell'ordine e coi
//     nomi della pagina (il luogo come lo scrive la guida: «Profondità dei Memento» e «Mondo del clifoto» stanno fra i Palazzi, come nella pagina);
//   - `ombreSciagura.ricompenseElenco`: 52 coppie `{ ombra, oggetto }`, nell'ordine della pagina (campo nuovo, assente prima);
//   - `ombreSciagura.incertezze`: la frase «La guida non fornisce un elenco chiuso…» è falsa e si svuota (la pagina nasconde il campo vuoto);
//   - `ombreSciagura.doveCompaiono`: perde solo la parentesi «(la guida non fornisce un elenco fisso per zona…)».
// Un campo si scrive solo se è ancora quello letto dal censimento, parola per parola: `elenco` solo se `null`, `ricompenseElenco` solo se manca,
// i due testi solo se uguali al testo atteso e senza una correzione dell'utente sul loro indirizzo (`correzione_dati_guida`, che qui non si tocca).
// Altrimenti il campo non si scrive e l'audit dice perché. Su un file di gioco senza il blocco «battaglia» (o senza `ombreSciagura`) la migrazione
// passa e dice «niente da fare». Nei dati solo fatti: nomi di Ombre, luoghi, oggetti; nessuna prosa della guida.
//
// Le altre chiavi di `dati_guida`, le correzioni dell'utente, il Diario, i Palazzi e le spunte delle partite restano identici (impronte prima e
// dopo). Audit in `dati_guida.audit-369-ombre-sciagura`: fonte, conteggi (19 righe, 52 Ombre, 52 ricompense) ed esito di ogni campo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const AUDIT = 'audit-369-ombre-sciagura';
const FONTE_URL = 'https://www.allgamestaff.it/persona-5-royal/ombre-sciagura/';
/** Le tabelle che non devono cambiare: Diario, effetti, Palazzi e loro aree, catalogo. */
const INTATTE = ['voce_giornata', 'voce_effetto', 'voce_infiltrazione', 'dungeon', 'dungeon_area', 'giorno', 'catalogo_oggetto'] as const;
const errore = (motivo: string): never => { throw new Error(`369: ${motivo}; nessuna modifica applicata.`); };

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => v !== null && typeof v === 'object' && !Array.isArray(v);

interface Ombra { nome: string; soloMemento?: true }
interface Riga { sezione: 'palazzi' | 'dedali'; luogo: string; ombre: Ombra[] }
const o = (nome: string): Ombra => ({ nome });
/** Esclusiva dei Memento: l'asterisco della guida. */
const m = (nome: string): Ombra => ({ nome, soloMemento: true });

/** Le 19 righe della prima tabella, nell'ordine della pagina: 10 per i Palazzi, 9 per i Dedali. */
const ELENCO: ReadonlyArray<Riga> = [
  { sezione: 'palazzi', luogo: 'Palazzo di Kamoshida', ombre: [o('Bicorno'), o('Incubo'), o('Angelo')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Madarame', ombre: [o('Koropokguru'), o('Hua Po'), o('Koppa-Tengu'), o('Onmoraki'), o('Inugami')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Kaneshiro', ombre: [o('Pixie superiore'), o('Nekomata'), o('Orobas'), o('Yaksini'), o('Rakshasa')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Futaba', ombre: [o('Sandman'), o('Naga'), o('Anzu'), o('Iside'), o('Lamia'), o('Andras')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Okumura', ombre: [o('Mothman'), o('Decarabia'), o('Lilim'), o('Wakinyan'), o('Kaiwan')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Niijima', ombre: [o('Regina Mab'), o('Ose'), o('Kushinada'), o('Kikuri-Hime'), o('Unicorno')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Shido', ombre: [o('Narciso'), o('Sarasvati'), o('Barong'), o('Parvati'), o('Hanuman')] },
  { sezione: 'palazzi', luogo: 'Profondità dei Memento', ombre: [o('Melchizedek'), o('Moloch'), o('Lilith'), o('Chernobog')] },
  { sezione: 'palazzi', luogo: 'Mondo del clifoto', ombre: [o('Dominazione')] },
  { sezione: 'palazzi', luogo: 'Palazzo di Maruki', ombre: [o('Loa'), o('Nebiros'), o('Macabre'), o('Byakhee'), o('Babau')] },
  { sezione: 'dedali', luogo: 'Dedalo di Qimranut', ombre: [m('Jack-o\'-Lantern')] },
  { sezione: 'dedali', luogo: 'Dedalo di Aiyatsbus', ombre: [m('Jack-o\'-Lantern'), m('Cait Sith'), o('Incubo'), o('Angelo')] },
  { sezione: 'dedali', luogo: 'Dedalo di Chemdah', ombre: [o('Hua Po'), o('Koropokguru'), o('Onmoraki'), o('Koppa Tengu'), o('Inugami')] },
  { sezione: 'dedali', luogo: 'Dedalo di Kaitul', ombre: [o('Pixie superiore'), o('Nekomata'), o('Rakshasa')] },
  { sezione: 'dedali', luogo: 'Dedalo di Akzeriyyuth', ombre: [o('Naga'), o('Anzu'), o('Iside'), o('Lamia'), o('Andras'), m('Pisaca')] },
  { sezione: 'dedali', luogo: 'Dedalo di Adyeshach', ombre: [o('Mothman'), o('Decarabia'), o('Lilim'), o('Wakinyan'), o('Kaiwan'), m('Legione')] },
  { sezione: 'dedali', luogo: 'Dedalo di Sheriruth', ombre: [o('Regina Mab'), o('Kushinada-Hime'), m('Ganesha'), m('Rangda'), m('Norn')] },
  { sezione: 'dedali', luogo: 'Dedalo di Sheriruth (dopo il Palazzo di Shido)', ombre: [o('Sarasvati'), o('Barong'), o('Parvati'), o('Hanuman')] },
  { sezione: 'dedali', luogo: 'Dedalo di Da\'at', ombre: [o('Lilith'), o('Chernobog'), o('Melchizedek'), o('Dominazione'), m('Straziato re dei desideri')] },
];

/** Le 52 ricompense della seconda tabella (Ombra sciagura, oggetto raro), nell'ordine della pagina. */
const RICOMPENSE: ReadonlyArray<{ ombra: string; oggetto: string }> = ([
  ['Bicorno', 'Perlina'], ['Incubo', 'Fiala del Sonno S'], ['Angelo', 'Goccia dell\'anima'], ['Koropokguru', 'Spray congelante'],
  ['Hua Po', 'Cocktail molotov'], ['Koppa-Tengu', 'Fiala delle vertigini S'], ['Onmoraki', 'Fiala del Sonno S'], ['Inugami', 'Taser'],
  ['Pixie superiore', 'Carta bianca'], ['Nekomata', 'Roccia nera'], ['Orobas', 'Roccia nera'], ['Yaksini', 'Kogatana nera'],
  ['Rakshasa', 'Incenso FR'], ['Sandman', 'Carta bianca'], ['Naga', 'Roccia nera'], ['Anzu', 'Roccia nera'],
  ['Iside', 'Incenso MA'], ['Lamia', 'Veste nera'], ['Andras', 'Carta bianca'], ['Mothman', 'Roccia nera'],
  ['Decarabia', 'Carta bianca'], ['Lilim', 'Roccia nera'], ['Wakinyan', 'Replica d\'arma'], ['Kaiwan', 'Ambra grigia FR'],
  ['Regina Mab', 'Roccia nera'], ['Ose', 'Roccia nera'], ['Kushinada-Hime', 'Ambra grigia MA'], ['Kikuri-Hime', 'Veste nera'],
  ['Unicorno', 'Roccia nera'], ['Narciso', 'Nirvana FO'], ['Sarasvati', 'Roccia nera'], ['Barong', 'Roccia nera'],
  ['Parvati', 'Carta bianca'], ['Hanuman', 'Kogatana nera'], ['Melchizedek', 'Replica d\'arma'], ['Moloch', 'Veste nera'],
  ['Lilith', 'Veste nera'], ['Chernobog', 'Nirvana MA'], ['Dominazione', 'Nirvana MA'], ['Loa', 'Nirvana RS'],
  ['Nebiros', 'Veste nera'], ['Macabre', 'Kogatana nera'], ['Byakhee', 'Replica d\'arma'], ['Babau', 'Carta bianca'],
  ['Jack-o\'-Lantern', 'Bomba maledetta'], ['Cait Sith', 'Cannone ad aria'], ['Pisaca', 'Perlina'], ['Legione', 'Perlina'],
  ['Ganesha', 'Roccia nera'], ['Rangda', 'Roccia nera'], ['Norn', 'Roccia nera'], ['Straziato re dei desideri', 'Carta bianca'],
] as const).map(([ombra, oggetto]) => ({ ombra, oggetto }));

/** I testi falsi com'erano prima: letti per intero, in forma NFC. */
const INCERTEZZE_ATTESE = 'La guida non fornisce un elenco chiuso di \'quali\' Ombre possono diventare Ombre sciagura né una tabella di comparsa per Palazzo/area: sono presentate come variante trasversale applicabile a Ombre già esistenti.';
const DOVE_ATTESO = 'Nei Palazzi e nei Memento, come varianti casuali delle Ombre standard già presenti nell\'area (la guida non fornisce un elenco fisso per zona, essendo una variante generata sulle Ombre normali già incontrabili).';
const DOVE_NUOVO = 'Nei Palazzi e nei Memento, come varianti casuali delle Ombre standard già presenti nell\'area.';

const nfc = (x: unknown): unknown => (typeof x === 'string' ? x.normalize('NFC') : x);

/** L'impronta delle righe di `dati_guida` diverse dal blocco «battaglia» e dall'audit di questa migrazione. */
function improntaAltriBlocchi(db: AppDatabase): string {
  const righe = db.prepare('SELECT chiave, json FROM main.dati_guida WHERE chiave NOT IN (?, ?) ORDER BY chiave').all('battaglia', AUDIT) as Array<{ chiave: string; json: string }>;
  return JSON.stringify(righe.map((r) => [r.chiave, r.json]));
}
/** L'impronta delle correzioni dell'utente (`correzione_dati_guida` è WITHOUT ROWID: si ordina per la chiave, non per `rowid`). */
const improntaCorrezioni = (db: AppDatabase): string => JSON.stringify(db.prepare('SELECT * FROM main.correzione_dati_guida ORDER BY blocco, percorso').all());

export const migration369: Migration = {
  id: 369,
  name: 'ombre_sciagura_elenco_e_ricompense',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida')) { logger.warn({ migrazione: 369 }, 'dati della guida assenti: niente da fare'); return; }

    // i conti delle costanti: 19 righe (10 + 9) e 52 ricompense, una per Ombra (i nomi scritti sono 54, vedi sopra)
    const nomi = new Set(ELENCO.flatMap((r) => r.ombre.map((x) => x.nome)));
    const ricompensati = new Set(RICOMPENSE.map((r) => r.ombra));
    const conteggi = {
      righe: ELENCO.length, righePalazzi: ELENCO.filter((r) => r.sezione === 'palazzi').length, righeDedali: ELENCO.filter((r) => r.sezione === 'dedali').length,
      ombreDiverse: nomi.size, soloMemento: new Set(ELENCO.flatMap((r) => r.ombre.filter((x) => x.soloMemento).map((x) => x.nome))).size, ricompense: RICOMPENSE.length,
    };
    if (conteggi.righe !== 19 || conteggi.righePalazzi !== 10 || conteggi.righeDedali !== 9 || conteggi.ricompense !== 52 || ricompensati.size !== 52) errore('le costanti non dicono 19 righe (10 + 9) e 52 ricompense');
    // «Koppa Tengu» (Dedalo di Chemdah) e «Koppa-Tengu» (Palazzo di Madarame, ricompense), «Kushinada» (Palazzo di Niijima) e «Kushinada-Hime» (Dedalo di
    // Sheriruth, ricompense) sono scritti così nella pagina e restano com'è: l'audit elenca i nomi dell'elenco senza una ricompensa con lo stesso nome
    const senzaRicompensa = [...nomi].filter((n) => !ricompensati.has(n));

    const prima = new Map<string, string>();
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const altriPrima = improntaAltriBlocchi(db);
    const haCorrezioni = esisteTabella(db, 'correzione_dati_guida');
    const correzioniPrima = haCorrezioni ? improntaCorrezioni(db) : null;
    const contaSpunte = (): number | null => {
      // solo l'assenza della tabella vale «niente da confrontare»: ogni altro errore SQL deve fermare la migrazione
      if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'spunta_voce_partita'").get()) return null;
      return db.prepare('SELECT COUNT(*) FROM utente.spunta_voce_partita').pluck().get() as number;
    };
    const spuntePrima = contaSpunte();

    const testo = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get('battaglia') as string | undefined;
    const esiti: Record<string, string> = {};
    let scritto = false;
    let blocco: Oggetto | null;
    try { const v = testo === undefined ? null : JSON.parse(testo) as unknown; blocco = eOggetto(v) ? v : null; } catch { blocco = null; }
    const sciagura = blocco && eOggetto(blocco.ombreSciagura) ? blocco.ombreSciagura : null;
    if (!blocco || !sciagura) {
      logger.warn({ migrazione: 369 }, 'blocco «battaglia» o sezione Ombre sciagura assenti: niente da fare');
      esiti.blocco = !blocco ? 'blocco «battaglia» assente o illeggibile: niente da fare' : 'sezione `ombreSciagura` assente: niente da fare';
    } else {
      /** Una correzione dell'utente sul campo: il testo della guida non si cambia sotto di lei. */
      const corretto = (campo: string): boolean => haCorrezioni
        && !!db.prepare("SELECT 1 FROM main.correzione_dati_guida WHERE blocco = 'battaglia' AND percorso LIKE ?").get(`%ombreSciagura%${campo}%`);

      if ((sciagura.elenco ?? null) === null) { sciagura.elenco = ELENCO.map((r) => ({ sezione: r.sezione, luogo: r.luogo, ombre: r.ombre.map((x) => ({ ...x })) })); esiti.elenco = 'scritto: 19 righe (10 Palazzi, 9 Dedali)'; scritto = true; }
      else esiti.elenco = 'non scritto: il campo non è più `null` (già scritto o corretto)';

      if (!('ricompenseElenco' in sciagura)) { sciagura.ricompenseElenco = RICOMPENSE.map((r) => ({ ...r })); esiti.ricompenseElenco = 'scritto: 52 ricompense'; scritto = true; }
      else esiti.ricompenseElenco = 'non scritto: il campo c\'è già';

      if (nfc(sciagura.incertezze) === INCERTEZZE_ATTESE.normalize('NFC')) {
        if (corretto('incertezze')) esiti.incertezze = 'non toccato: l\'utente ha una correzione su questo campo';
        else { sciagura.incertezze = ''; esiti.incertezze = 'svuotato: la frase sull\'elenco mancante è falsa'; scritto = true; }
      } else esiti.incertezze = 'non toccato: il testo non è quello atteso (già cambiato)';

      if (nfc(sciagura.doveCompaiono) === DOVE_ATTESO.normalize('NFC')) {
        if (corretto('doveCompaiono')) esiti.doveCompaiono = 'non toccato: l\'utente ha una correzione su questo campo';
        else { sciagura.doveCompaiono = DOVE_NUOVO; esiti.doveCompaiono = 'tolta la parentesi sull\'elenco fisso mancante'; scritto = true; }
      } else esiti.doveCompaiono = 'non toccato: il testo non è quello atteso (già cambiato)';

      if (scritto && db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify(blocco), 'battaglia', testo).changes !== 1) errore('il blocco «battaglia» non si scrive');
    }

    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json').run(AUDIT, JSON.stringify({
      migrazione: 369, voce: 'L13-04', fonte: FONTE_URL, conteggi, scritto, esiti, ombreDellElencoSenzaRicompensaConLoStessoNome: senzaRicompensa,
    }));

    // le verifiche: le altre chiavi della guida, le correzioni dell'utente, il Diario, i Palazzi, il catalogo e le spunte identici
    if (improntaAltriBlocchi(db) !== altriPrima) errore('altre chiavi di dati_guida sono cambiate');
    if (correzioniPrima !== null && improntaCorrezioni(db) !== correzioniPrima) errore('le correzioni dell\'utente sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (contaSpunte() !== spuntePrima) errore('le spunte delle partite sono cambiate');
    logger.info({ migrazione: 369, scritto, esiti }, 'Ombre sciagura: elenco e ricompense nel blocco «battaglia»');
  },
};
