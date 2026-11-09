// ============================================================
// 346 — un solo «dove»: via le sette colonne che lo ripetevano (L1-07, L1-08, L1-11, lotto «Un solo dove»)
// ============================================================
//
// La posizione di un negozio o di un'attività è la sua SEDE (`sede_chiave`, un luogo): il quartiere si ricava dal luogo (`luogo.quartiere_chiave`),
// l'Area pure (`luogo.area_chiave`). Restavano accanto alla sede tre copie: `negozio.luogo_chiave` e `attivita.luogo_chiave` (il quartiere, uguale a
// quello della sede in 69/69 negozi e 33/33 attività), `negozio.luogo` (un testo libero «quartiere, posto», 67 righe su 70) e, per le condizioni,
// `negozio.condizioni_json` (storica dalla 070, con contenuto in 3 negozi). Più tre colonne di `articolo` mai usate (`effetto`, `statistiche`,
// `effetto_json`: l'effetto e le statistiche si leggono dall'oggetto del catalogo, 0 righe su 749 con un valore).
//
// COSA, in quest'ordine:
//  (a) `negozio.luogo`, riga per riga (tutti i 70 negozi: 67 con testo e 3 vuoti). Tolti il quartiere e il nome o l'Area della sede, se il resto è
//      vuoto il testo va solo in archivio; se porta un'informazione che nessun altro dato ha («edificio principale 1P», «strada accanto al tempio», il
//      Palazzo di Niijima, che non ha una sede) il resto passa in `negozio.note` come frase, senza ripeterla se la nota la dice già. Il testo
//      originale va sempre in `dati_guida.archivio-frasi-l11`. La classificazione dei 67 testi noti è nella tabella `ESITI_LUOGO` (chiave, testo,
//      motivo): vale solo se il testo del database è uguale a quello atteso (guardia per identità); un testo nuovo o cambiato segue la regola
//      generale (resto = ciò che non è quartiere, Area o nome della sede).
//  (b) `negozio.condizioni_json` non vuota (mantra-ganda: Gemelle rango 3, identica a quella della sua sede, quindi solo archivio; lotteria-shibuya:
//      dal 04-18, «da lunedì 18/4» per la guida; chihaya-shinjuku: dal 06-23, l'incontro che sblocca il banco) passa in `negozio.sblocco_json`, dove
//      la presenza del negozio la legge (prima la leggevano solo gli incensi e il censimento): il negozio vale dalla data, e le offerte avevano già
//      la loro. Una condizione già identica nella sede o nello sblocco non si ripete; il valore originale va in archivio.
//  (c) le sette colonne si tolgono con `ALTER TABLE … DROP COLUMN` (SQLite lo accetta anche per `luogo_chiave`, che aveva un `REFERENCES quartiere`,
//      perché nessun indice, vista o trigger le cita). Prima si archivia tutto ciò che le colonne contenevano (righe archiviate = righe tolte; per
//      le tre di `articolo` ogni valore non vuoto, se per caso ce ne fosse).
//  (d) `server/db/fontiTolte.ts` riceve le sette voci (la migrazione che le ha tolte e dove vive ora il dato).
// Il runner tiene `foreign_keys` spento durante la migrazione: `articolo` non è mai ricostruita né cancellata (niente cascata), e dopo il controllo
// delle chiavi esterne del runner lo stato è quello di prima.
//
// COSA NON CAMBIA (impronte di ogni riga prima e dopo, escluse le sole colonne dichiarate): le altre colonne di `negozio`, `articolo` e `attivita`,
// i luoghi, i quartieri, i pin, il Cestino. Il quartiere ricavato dalla sede coincide col vecchio `luogo_chiave` (le eccezioni, se ci fossero, si
// scrivono nel verbale e in `dati_guida.archivio-frasi-l11`: nulla si perde). Idempotente: ogni parte si salta se la sua colonna non c'è più.
// Verbale: `dati_guida.audit-l1-07-11-un-solo-dove`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`346: ${motivo}; nessuna modifica applicata.`); };

/** Le sette colonne che escono, nell'ordine di rischio (le prime hanno un `REFERENCES` o dati, le ultime sono vuote). */
export const COLONNE_TOLTE = [
  { tabella: 'negozio', colonna: 'luogo_chiave' }, { tabella: 'negozio', colonna: 'luogo' }, { tabella: 'negozio', colonna: 'condizioni_json' },
  { tabella: 'attivita', colonna: 'luogo_chiave' }, { tabella: 'articolo', colonna: 'effetto' }, { tabella: 'articolo', colonna: 'statistiche' },
  { tabella: 'articolo', colonna: 'effetto_json' },
] as const;

// ---------------------------------------------------------------------------
// (a) il testo «dove» di ogni negozio
// ---------------------------------------------------------------------------

export type MotivoLuogo = 'quartiere' | 'quartiere e Area della sede' | 'quartiere e nome della sede' | 'nome o descrizione del quartiere' | 'già nella nota' | 'già nel nome del negozio' | 'informazione unica' | 'regola generale';
/** `contiene`: per i motivi «già nella nota» e «già nel nome del negozio», la parola che la nota (GN) o il nome del negozio (NN) deve contenere davvero perché il testo vada solo in archivio. */
interface EsitoLuogo { testo: string; motivo: MotivoLuogo; frase?: string; contiene?: string }

const Q: MotivoLuogo = 'quartiere';
const QA: MotivoLuogo = 'quartiere e Area della sede';
const QN: MotivoLuogo = 'quartiere e nome della sede';
const NQ: MotivoLuogo = 'nome o descrizione del quartiere';
const GN: MotivoLuogo = 'già nella nota';
const NN: MotivoLuogo = 'già nel nome del negozio';
const UN: MotivoLuogo = 'informazione unica';

/** I 67 testi non vuoti di `negozio.luogo` com'erano al 7/11, ciascuno col suo esito (la chiave del negozio, il testo atteso, il motivo, la frase da aggiungere alla nota). */
const ESITI_LUOGO: Readonly<Record<string, EsitoLuogo>> = {
  'untouchable': { testo: 'Shibuya, Central Street', motivo: QA },
  'clinica-takemi': { testo: 'Yongen-Jaya', motivo: Q },
  'leblanc': { testo: 'Yongen-Jaya', motivo: Q },
  'body-chop': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  '37-gradi-celsius': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  'taisho-store': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  'tsurukame-diamond': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  'high-sense': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  'prossimo-asso': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  'fiorista-rafflesia': { testo: 'Shibuya, Centro commerciale sotterraneo', motivo: QA },
  'big-bang-burger': { testo: 'Shibuya, Central Street', motivo: QA },
  'libreria-taiheido': { testo: 'Shibuya, Central Street', motivo: QA },
  'discount-rocinante': { testo: 'Shibuya, Central Street', motivo: QA },
  'farmacia-aohige': { testo: 'Shibuya, Central Street', motivo: QA },
  'triple-seven': { testo: 'Shibuya, Central Street', motivo: QA },
  // la sede sta nell'Area «Tornello della linea Ginza»: il testo diceva «Sottopasso», e la nota lo dice già («nel sottopasso della stazione»)
  'panetteria-yon-germain': { testo: 'Shibuya, Sottopasso', motivo: GN, contiene: 'sottopasso' },
  'chiosco-kiyasuku': { testo: 'Shibuya, Sottopasso', motivo: QA },
  'venditore-ambulante': { testo: 'Shibuya, Central Street', motivo: QA },
  'yumenoshima': { testo: 'Yongen-Jaya', motivo: Q },
  'super-muramasa': { testo: 'Yongen-Jaya', motivo: Q },
  'venditore-patate-dolci': { testo: 'Yongen-Jaya', motivo: Q },
  // Aoyama-Itchome è il luogo del liceo: la descrizione del quartiere «Shujin Academy» dice «situato ad Aoyama-Itchome»
  'negozio-scolastico': { testo: 'Aoyama-Itchome', motivo: NQ },
  'akindo': { testo: 'Akihabara', motivo: Q },
  'tokobushiya': { testo: 'Akihabara', motivo: Q },
  'akiba': { testo: 'Akihabara', motivo: Q },
  'super-baron': { testo: 'Akihabara', motivo: Q },
  'gachapon-akihabara': { testo: 'Akihabara', motivo: Q },
  'hinokuniya': { testo: 'Shinjuku', motivo: Q },
  'fioraio-sukebe': { testo: 'Shinjuku', motivo: Q },
  'mran-mran': { testo: 'Shinjuku', motivo: Q },
  'crossroads': { testo: 'Shinjuku', motivo: Q },
  'vestiti-usati-kichijoji': { testo: 'Kichijoji', motivo: Q },
  'stoneon': { testo: 'Kichijoji', motivo: Q },
  'cartoleria-mitsubachi': { testo: 'Kichijoji', motivo: Q },
  'friggitoria-hagoromo': { testo: 'Kichijoji', motivo: Q },
  'street-food-houraku': { testo: 'Kichijoji', motivo: Q },
  'mealport': { testo: 'Kichijoji', motivo: Q },
  'mantra-ganda': { testo: 'Kichijoji', motivo: Q },
  'penguin-sniper': { testo: 'Kichijoji', motivo: Q },
  'tempio-kichijoji': { testo: 'Kichijoji', motivo: Q },
  'mercante-sakai': { testo: 'Kichijoji', motivo: Q },
  // il quartiere si chiama «Kanda / Jinbocho» e la sua descrizione dice quale metà è Kanda (la chiesa) e quale Jinbocho (le librerie)
  'chiesa-kanda': { testo: 'Kanda', motivo: NQ },
  'libreria-nagiuri': { testo: 'Jinbocho', motivo: NQ },
  // senza sede (il solo): il posto è nel Palazzo, e nessun altro dato lo dice
  'negozio-palazzo-niijima': { testo: 'Palazzo di Niijima, dungeon del casinò', motivo: UN, frase: 'Si trova nel Palazzo di Niijima, nel dungeon del casinò.' },
  // la sede è il Leblanc: il resto («dal laptop», «televisore») è già nella nota del negozio
  'tanaka-affari-loschi': { testo: 'Online, dal laptop di Leblanc', motivo: GN, contiene: 'laptop' },
  'home-shopping-tv': { testo: 'Leblanc, televisore', motivo: GN, contiene: 'televisore' },
  // i distributori condividono la sede del luogo con tutti gli altri: il resto distingue la macchina
  'distributore-shujin-edificio': { testo: 'Aoyama-Itchome, edificio principale 1P', motivo: UN, frase: 'Edificio principale 1P.' },
  'distributore-shujin-cortile': { testo: 'Aoyama-Itchome, cortile della scuola', motivo: NN, contiene: 'cortile' },
  'distributore-shujin-cancello-1': { testo: 'Aoyama-Itchome, cancello della scuola', motivo: NN, contiene: 'cancello' },
  'distributore-shujin-cancello-2': { testo: 'Aoyama-Itchome, cancello della scuola', motivo: NN, contiene: 'cancello' },
  'distributore-shibuya-sottopasso': { testo: 'Shibuya, sottopasso', motivo: QA },
  'distributore-shibuya-sala-giochi': { testo: 'Shibuya, sala giochi di Central Street', motivo: QN },
  'distributore-yongen-bagno': { testo: 'Yongen-Jaya, vicino al bagno pubblico', motivo: NN, contiene: 'bagno' },
  'distributore-yongen-tabaccaio': { testo: 'Yongen-Jaya, accanto al tabaccaio', motivo: NN, contiene: 'tabaccaio' },
  'distributore-akihabara-1': { testo: 'Akihabara', motivo: Q },
  'distributore-akihabara-2': { testo: 'Akihabara', motivo: Q },
  'distributore-akihabara-3': { testo: 'Akihabara', motivo: Q },
  'distributore-akihabara-4': { testo: 'Akihabara', motivo: Q },
  'distributore-akihabara-5': { testo: 'Akihabara', motivo: Q },
  'distributore-akihabara-6': { testo: 'Akihabara', motivo: Q },
  'jose': { testo: 'Memento', motivo: NQ },
  'scarlet': { testo: 'Shibuya, Central Street', motivo: QA },
  'lotteria-shibuya': { testo: 'Shibuya, Piazza della Stazione', motivo: QA },
  'chihaya-shinjuku': { testo: 'Shinjuku', motivo: Q },
  'diner-shibuya': { testo: 'Shibuya, Central Street', motivo: QA },
  'chiosco-bevande-sottopasso': { testo: 'Shibuya, Sottopasso', motivo: QA },
  'u-distributore-di-kichijoji-1': { testo: 'Kichijoji strada accanto al tempio', motivo: UN, frase: 'Strada accanto al tempio.' },
};

export interface RigaLuogo {
  chiave: string; nome?: string | null; luogo: string | null; note: string | null; sede_chiave: string | null; sede_nome: string | null; area_nome: string | null; quartiere_chiave: string | null; quartiere_nome: string | null;
}
export interface DecisioneLuogo { testo: string; azione: 'archivio' | 'nota'; motivo: MotivoLuogo; frase: string | null }

const normalizza = (testo: string): string => testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const maiuscola = (testo: string): string => testo.charAt(0).toUpperCase() + testo.slice(1);

/** Se la nota dice già la frase (senza la sua punteggiatura finale), non si ripete. */
function notaContiene(nota: string | null, frase: string): boolean {
  return !!nota && normalizza(nota).includes(normalizza(frase.replace(/[.!?]+$/, '')));
}

/** La regola generale, per un testo che la tabella non conosce: ciò che resta tolti quartiere, Area e nome della sede. */
function restoGenerico(r: RigaLuogo, testo: string): string | null {
  const scarti = [r.quartiere_nome, r.area_nome, r.sede_nome].filter((x): x is string => !!x).map(normalizza);
  const restanti = testo.split(',').map((p) => p.trim()).filter((p) => p !== '' && !scarti.some((s) => s === normalizza(p) || s.includes(normalizza(p))));
  return restanti.length > 0 ? `${maiuscola(restanti.join(', '))}.` : null;
}

/** Che cosa si fa del testo «dove» di un negozio (puro: la prova lo stampa come tabella). Il testo vuoto non si archivia né si porta in nota. */
export function decidiLuogo(r: RigaLuogo): DecisioneLuogo {
  const testo = (r.luogo ?? '').trim();
  const noto = ESITI_LUOGO[r.chiave];
  // l'esito tabellare vale solo se la sede che ne spiega il testo c'è ancora: senza sede (un backup in cui il negozio non l'ha) il «dove» non è
  // ridetto da nessun altro dato e il testo segue la regola generale, cioè passa in nota
  // Per i motivi «già nella nota» e «già nel nome del negozio» l'esito vale solo se la nota (o il nome) contiene davvero la parola dell'informazione
  // (`contiene`): altrimenti il testo segue la regola generale e passa in nota. Il testo originale è comunque sempre in archivio.
  const dipendeDallaSede = noto && (noto.motivo === 'quartiere' || noto.motivo === 'quartiere e Area della sede' || noto.motivo === 'quartiere e nome della sede' || noto.motivo === 'nome o descrizione del quartiere');
  const dove = noto?.motivo === 'già nella nota' ? r.note : noto?.motivo === 'già nel nome del negozio' ? (r.nome ?? null) : null;
  const dettoAltrove = !noto?.contiene || (!!dove && normalizza(dove).includes(normalizza(noto.contiene)));
  if (noto && noto.testo === testo && !(dipendeDallaSede && r.quartiere_chiave === null) && dettoAltrove) {
    return { testo, azione: noto.frase && !notaContiene(r.note, noto.frase) ? 'nota' : 'archivio', motivo: noto.motivo, frase: noto.frase ?? null };
  }
  const resto = restoGenerico(r, testo);
  return { testo, azione: resto && !notaContiene(r.note, resto) ? 'nota' : 'archivio', motivo: 'regola generale', frase: resto };
}

/** Le righe dei negozi per classificare il testo «dove» (sola lettura; esportata per la prova; richiede la colonna `negozio.luogo`). */
export function righeLuogo(db: AppDatabase): RigaLuogo[] {
  return db.prepare(`SELECT n.chiave, n.nome, n.luogo, n.note, n.sede_chiave, l.nome AS sede_nome, a.nome AS area_nome, q.chiave AS quartiere_chiave, q.nome AS quartiere_nome
    FROM main.negozio n LEFT JOIN main.luogo l ON l.chiave = n.sede_chiave LEFT JOIN main.area a ON a.chiave = l.area_chiave LEFT JOIN main.quartiere q ON q.chiave = l.quartiere_chiave
    ORDER BY n.ordine, n.chiave`).all() as RigaLuogo[];
}

// ---------------------------------------------------------------------------
// (b) le condizioni storiche del negozio
// ---------------------------------------------------------------------------

type Condizione = Record<string, unknown>;
const uguali = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const lista = (json: string | null): Condizione[] | null => {
  if (json === null) return [];
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v as Condizione[] : null; } catch { return null; }
};
const vuota = (json: string | null): boolean => json === null || ['', '[]', 'null'].includes(json.trim());

// ---------------------------------------------------------------------------
// la migrazione
// ---------------------------------------------------------------------------

/** La sede, per identità, degli elementi che in un backup vecchio hanno il solo quartiere (sede mancante): la sede che hanno nei dati del 7/11 pomeriggio. */
const SEDI_PER_IDENTITA: ReadonlyArray<{ tabella: 'negozio' | 'attivita'; chiave: string; sede: string; quartiere: string }> = [
  { tabella: 'negozio', chiave: 'lotteria-shibuya', sede: 'shibuya/u-banco-della-lotteria-di-shibuya', quartiere: 'shibuya' },
  { tabella: 'negozio', chiave: 'chiosco-bevande-sottopasso', sede: 'shibuya/u-chiosco-dei-succhi-del-sottopasso', quartiere: 'shibuya' },
  { tabella: 'attivita', chiave: 'estrazione-lotteria', sede: 'shibuya/u-banco-della-lotteria-di-shibuya', quartiere: 'shibuya' },
];

/** I due luoghi che l'utente ha creato il 7/11 pomeriggio (26 e 29 ottobre nei suoi dati), com'erano: servono a dare la sede ai tre elementi di un backup vecchio. */
const LUOGHI_DELL_UTENTE: Record<string, { chiave: string; quartiere_chiave: string; ordine: number; tipo: string; nome: string; cosa_offre: string; confidenti_json: string; piatti_json: string | null;
  note: string | null; fonte: string; verificato: number; origine: string; nascosto: number; seed_json: string | null; updated_at: string; condizioni_json: string; area_chiave: string;
  orari_json: string | null; solo_eventi_confidente: string | null; fonte_condizioni_json: string | null }> = {
  'shibuya/u-banco-della-lotteria-di-shibuya': {
    chiave: 'shibuya/u-banco-della-lotteria-di-shibuya', quartiere_chiave: 'shibuya', ordine: 27, tipo: 'attivita', nome: 'Chiosco della lotteria',
    cosa_offre: 'Biglietti della lotteria e verifica delle estrazioni.', confidenti_json: '[]', piatti_json: null, note: null, fonte: '', verificato: 1, origine: 'utente',
    nascosto: 0, seed_json: null, updated_at: '2026-10-26T15:59:34.095Z', condizioni_json: '[]', area_chiave: 'citta/shibuya/piazza-della-stazione', orari_json: null,
    solo_eventi_confidente: null, fonte_condizioni_json: null,
  },
  'shibuya/u-chiosco-dei-succhi-del-sottopasso': {
    chiave: 'shibuya/u-chiosco-dei-succhi-del-sottopasso', quartiere_chiave: 'shibuya', ordine: 28, tipo: 'negozio', nome: 'Chiosco delle bevande', cosa_offre: 'Succhi Aojiru.',
    confidenti_json: '[]', piatti_json: null, note: null, fonte: '', verificato: 1, origine: 'utente', nascosto: 0, seed_json: null, updated_at: '2026-10-29T21:52:27.688Z',
    condizioni_json: '[]', area_chiave: 'citta/shibuya/sottopasso',
    orari_json: '{"giorni":["domenica"],"fasce":[],"chiusoConPioggia":false,"nota":"Solo la domenica, di giorno e di sera: la guida lo visita il 1° maggio di giorno e il 17 luglio di sera; il meteo non è indicato."}',
    solo_eventi_confidente: null, fonte_condizioni_json: null,
  },
};

const TABELLE_INTATTE = ['luogo','quartiere', 'spillo', 'cestino', 'catalogo_oggetto', 'ricompensa_oggetto'] as const;
const SENZA: Record<'negozio' | 'articolo' | 'attivita', readonly string[]> = {
  negozio: ['luogo_chiave', 'luogo', 'condizioni_json', 'note', 'sblocco_json'], articolo: ['effetto', 'statistiche', 'effetto_json'], attivita: ['luogo_chiave'],
};

/** Il quartiere ricavato dalla sede, per ogni negozio o attività, accanto al vecchio `luogo_chiave` (la colonna deve esserci). */
function quartieri(db: AppDatabase, tabella: 'negozio' | 'attivita'): Array<{ chiave: string; vecchio: string | null; derivato: string | null }> {
  return db.prepare(`SELECT t.chiave AS chiave, t.luogo_chiave AS vecchio, l.quartiere_chiave AS derivato FROM main.${tabella} t LEFT JOIN main.luogo l ON l.chiave = t.sede_chiave ORDER BY t.chiave`)
    .all() as Array<{ chiave: string; vecchio: string | null; derivato: string | null }>;
}

export const migration346: Migration = {
  id: 346,
  name: 'un_solo_dove_colonne_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const daTogliere = COLONNE_TOLTE.filter((x) => esisteTabella(db, x.tabella) && haColonna(db, x.tabella, x.colonna));
    if (daTogliere.length === 0) return;
    for (const t of ['negozio', 'attivita', 'articolo', 'luogo', 'area', 'quartiere', 'dati_guida']) if (!esisteTabella(db, t)) errore(`manca la tabella ${t}`);
    const c = (tabella: string, colonna: string): boolean => haColonna(db, tabella, colonna);

    // (0) la sede dei tre elementi che, in un backup di prima del 7/11 pomeriggio, avevano il solo quartiere: nei dati attuali stanno in un luogo
    // (creato dall'utente), che qui si cerca per identità. Vale solo se la sede manca, il vecchio quartiere è quello atteso e il luogo c'è e sta in quel
    // quartiere: altrimenti non si inventa niente (in un backup senza quei luoghi la riga resta senza quartiere, e il verbale lo dice).
    const sediAssegnate: Array<{ tabella: string; chiave: string; sede: string }> = [];
    const luoghiCreati: string[] = [];
    for (const s of SEDI_PER_IDENTITA) {
      if (!c(s.tabella, 'luogo_chiave')) continue;
      // un backup di prima delle 16 del 7/11 non ha i due luoghi che l'utente ha creato quel pomeriggio: si ricreano com'erano nei suoi dati (le stesse
      // righe), ma solo se il luogo manca, il quartiere e l'Area ci sono e la riga da collocare ha il solo quartiere
      if (!db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(s.sede)) {
        const l = LUOGHI_DELL_UTENTE[s.sede];
        const serve = l && db.prepare(`SELECT 1 FROM main.${s.tabella} WHERE chiave = ? AND sede_chiave IS NULL AND luogo_chiave = ?`).get(s.chiave, s.quartiere);
        const areaEsiste = l && db.prepare('SELECT 1 FROM main.area WHERE chiave = ?').get(l.area_chiave);
        const quartiereEsiste = db.prepare('SELECT 1 FROM main.quartiere WHERE chiave = ?').get(s.quartiere);
        if (l && serve && areaEsiste && quartiereEsiste && !db.prepare('SELECT 1 FROM main.luogo WHERE ordine = ? AND quartiere_chiave = ?').get(l.ordine, l.quartiere_chiave)) {
          db.prepare(`INSERT INTO main.luogo (chiave, quartiere_chiave, ordine, tipo, nome, cosa_offre, confidenti_json, piatti_json, note, fonte, verificato, origine, nascosto,
            seed_json, updated_at, condizioni_json, area_chiave, orari_json, solo_eventi_confidente, fonte_condizioni_json)
            VALUES (@chiave, @quartiere_chiave, @ordine, @tipo, @nome, @cosa_offre, @confidenti_json, @piatti_json, @note, @fonte, @verificato, @origine, @nascosto,
            @seed_json, @updated_at, @condizioni_json, @area_chiave, @orari_json, @solo_eventi_confidente, @fonte_condizioni_json)`).run(l);
          luoghiCreati.push(s.sede);
        }
      }
      const luogoEsiste = db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ? AND quartiere_chiave = ?').get(s.sede, s.quartiere);
      if (!luogoEsiste) continue;
      const fatto = db.prepare(`UPDATE main.${s.tabella} SET sede_chiave = ? WHERE chiave = ? AND sede_chiave IS NULL AND luogo_chiave = ?`).run(s.sede, s.chiave, s.quartiere).changes;
      if (fatto === 1) sediAssegnate.push({ tabella: s.tabella, chiave: s.chiave, sede: s.sede });
    }

    // le impronte di prima (tutto tranne le colonne dichiarate) e i conteggi
    const prima = new Map<string, string>();
    for (const t of ['negozio', 'articolo', 'attivita'] as const) prima.set(t, improntaTabella(db, t, SENZA[t]));
    for (const t of TABELLE_INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const conteggi = Object.fromEntries(['negozio', 'articolo', 'attivita', 'luogo', 'spillo'].map((t) => [t, db.prepare(`SELECT COUNT(*) FROM main.${t}`).pluck().get() as number]));
    const notePrima = new Map((db.prepare('SELECT chiave, note, sblocco_json FROM main.negozio').all() as Array<{ chiave: string; note: string | null; sblocco_json: string | null }>).map((r) => [r.chiave, r]));

    // il quartiere ricavato dalla sede contro il vecchio `luogo_chiave`, PRIMA di toglierlo (le eccezioni vanno nel verbale e nell'archivio)
    const quartieriNegozi = c('negozio', 'luogo_chiave') ? quartieri(db, 'negozio') : [];
    const quartieriAttivita = c('attivita', 'luogo_chiave') ? quartieri(db, 'attivita') : [];
    const discrepanze = [...quartieriNegozi.map((q) => ({ tabella: 'negozio', ...q })), ...quartieriAttivita.map((q) => ({ tabella: 'attivita', ...q }))].filter((q) => q.vecchio !== q.derivato);
    if (discrepanze.length > 0) logger.warn({ migrazione: 'L1-346', discrepanze }, 'il vecchio luogo_chiave non coincide col quartiere della sede: restano nell’archivio');

    // (a) il testo «dove»: archivio sempre, nota se porta un'informazione unica
    const luogo = { classificati: 0, vuoti: 0, soloArchivio: 0, inNota: 0, note: [] as Array<{ chiave: string; frase: string; motivo: string }> };
    const archivioLuogo: Record<string, string> = {};
    if (c('negozio', 'luogo')) {
      const scriviNota = db.prepare('UPDATE main.negozio SET note = ? WHERE chiave = ? AND note IS ?');
      for (const r of righeLuogo(db)) {
        luogo.classificati++;
        if ((r.luogo ?? '').trim() === '') { luogo.vuoti++; continue; }
        archivioLuogo[r.chiave] = r.luogo as string;
        const d = decidiLuogo(r);
        if (d.azione === 'archivio' || !d.frase) { luogo.soloArchivio++; continue; }
        const nota = r.note === null || r.note.trim() === '' ? d.frase : `${r.note.trimEnd()}${/[.!?]$/.test(r.note.trimEnd()) ? '' : '.'} ${d.frase}`;
        if (scriviNota.run(nota, r.chiave, r.note).changes !== 1) errore(`la nota di ${r.chiave} non si aggiorna`);
        luogo.inNota++;
        luogo.note.push({ chiave: r.chiave, frase: d.frase, motivo: d.motivo });
      }
      if (luogo.classificati !== conteggi.negozio) errore('non tutti i negozi sono stati classificati');
    }

    // (b) le condizioni storiche del negozio, confermate dalla guida (Lotteria di Shibuya «da lunedì 18/4»; Chihaya: incontro del 23 giugno, che è lo
    // sblocco del banco), passano in `sblocco_json`, dove la presenza del negozio le legge; quelle già uguali nella sede o nello sblocco non si ripetono.
    // Il valore originale va comunque in archivio. Effetto: la presenza del negozio vale dalla data (le offerte avevano già la loro data).
    const condizioni = { spostate: [] as Array<{ chiave: string; condizioni: Condizione[] }>, giaNellaSede: [] as string[], nonLeggibili: [] as string[] };
    const archivioCondizioni: Record<string, string> = {};
    if (c('negozio', 'condizioni_json')) {
      const righe = db.prepare(`SELECT n.chiave, n.condizioni_json, n.sblocco_json, l.condizioni_json AS sede FROM main.negozio n LEFT JOIN main.luogo l ON l.chiave = n.sede_chiave
        WHERE n.condizioni_json IS NOT NULL ORDER BY n.chiave`).all() as Array<{ chiave: string; condizioni_json: string; sblocco_json: string | null; sede: string | null }>;
      const scriviSblocco = db.prepare('UPDATE main.negozio SET sblocco_json = ? WHERE chiave = ? AND sblocco_json IS ?');
      for (const r of righe.filter((x) => !vuota(x.condizioni_json))) {
        archivioCondizioni[r.chiave] = r.condizioni_json;
        const proprie = lista(r.condizioni_json); const sede = lista(r.sede) ?? []; const sblocco = lista(r.sblocco_json);
        if (!proprie || !sblocco) { condizioni.nonLeggibili.push(r.chiave); continue; }
        const nuove = proprie.filter((x) => !sede.some((s) => uguali(s, x)) && !sblocco.some((s) => uguali(s, x)));
        if (nuove.length === 0) { condizioni.giaNellaSede.push(r.chiave); continue; }
        if (scriviSblocco.run(JSON.stringify([...sblocco, ...nuove]), r.chiave, r.sblocco_json).changes !== 1) errore(`lo sblocco di ${r.chiave} non si aggiorna`);
        condizioni.spostate.push({ chiave: r.chiave, condizioni: nuove });
      }
    }

    // (c) l'archivio di ciò che le colonne contenevano, poi le colonne
    const archiviate: Record<string, number> = {};
    const archivia = (colonna: string, righe: Record<string, unknown>): void => {
      archiviate[colonna] = archiviaSenzaSovrascrivere(db, 'L1-07/08/11 · 346', colonna, righe);
      const presenti = righeArchiviate(db, colonna);
      if (!Object.keys(righe).every((k) => k in presenti)) errore(`l’archivio di ${colonna} non ha tutte le righe`);
    };
    if (c('negozio', 'luogo')) archivia('negozio.luogo', archivioLuogo);
    if (c('negozio', 'condizioni_json')) archivia('negozio.condizioni_json', archivioCondizioni);
    if (c('negozio', 'luogo_chiave')) archivia('negozio.luogo_chiave', Object.fromEntries(quartieriNegozi.filter((q) => q.vecchio !== null).map((q) => [q.chiave, q.vecchio])));
    if (c('attivita', 'luogo_chiave')) archivia('attivita.luogo_chiave', Object.fromEntries(quartieriAttivita.filter((q) => q.vecchio !== null).map((q) => [q.chiave, q.vecchio])));
    const valoriArticolo: Record<string, number> = {};
    for (const colonna of ['effetto', 'statistiche', 'effetto_json'] as const) {
      if (!c('articolo', colonna)) continue;
      const righe = (db.prepare(`SELECT chiave, "${colonna}" AS v FROM main.articolo WHERE "${colonna}" IS NOT NULL ORDER BY rowid`).all() as Array<{ chiave: string; v: string }>).filter((r) => !vuota(r.v));
      valoriArticolo[colonna] = righe.length;
      if (righe.length > 0) archivia(`articolo.${colonna}`, Object.fromEntries(righe.map((r) => [r.chiave, r.v])));
    }
    if (discrepanze.length > 0) archiviaSenzaSovrascrivere(db, 'L1-07/08/11 · 346', 'luogo_chiave.discrepanze', Object.fromEntries(discrepanze.map((d) => [`${d.tabella}/${d.chiave}`, { vecchio: d.vecchio, derivato: d.derivato }])));

    for (const { tabella, colonna } of daTogliere) {
      db.exec(`ALTER TABLE main.${tabella} DROP COLUMN "${colonna}"`);
      if (haColonna(db, tabella, colonna)) errore(`la colonna ${tabella}.${colonna} esiste ancora`);
    }

    // i controlli: cambia solo ciò che è dichiarato
    for (const [t, n] of Object.entries(conteggi)) if (db.prepare(`SELECT COUNT(*) FROM main.${t}`).pluck().get() !== n) errore(`il numero delle righe di ${t} è cambiato`);
    for (const t of ['negozio', 'articolo', 'attivita'] as const) if (improntaTabella(db, t, SENZA[t]) !== prima.get(t)) errore(`le altre colonne di ${t} sono cambiate`);
    for (const t of TABELLE_INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    const attesiNote = new Set(luogo.note.map((n) => n.chiave));
    const attesiSblocco = new Set(condizioni.spostate.map((s) => s.chiave));
    for (const r of db.prepare('SELECT chiave, note, sblocco_json FROM main.negozio').all() as Array<{ chiave: string; note: string | null; sblocco_json: string | null }>) {
      const p = notePrima.get(r.chiave);
      if (!p) return errore(`il negozio ${r.chiave} è nuovo`);
      if ((p.note !== r.note) !== attesiNote.has(r.chiave)) errore(`la nota di ${r.chiave} è cambiata in modo non dichiarato`);
      if ((p.sblocco_json !== r.sblocco_json) !== attesiSblocco.has(r.chiave)) errore(`lo sblocco di ${r.chiave} è cambiato in modo non dichiarato`);
    }

    registraAudit(db, 'audit-l1-07-11-un-solo-dove', {
      migrazione: 'L1-07/08/11 · 346',
      colonneTolte: daTogliere.map((x) => `${x.tabella}.${x.colonna}`),
      luogo, condizioni, archiviate, valoriNelleColonneDiArticolo: valoriArticolo, sediAssegnate, luoghiCreati,
      quartieri: { negozi: quartieriNegozi.length, attivita: quartieriAttivita.length, discrepanze: discrepanze.length },
    });
    if (condizioni.nonLeggibili.length > 0) logger.warn({ migrazione: 'L1-346', negozi: condizioni.nonLeggibili }, 'condizioni del negozio non leggibili: non sono passate a sblocco_json, restano nell’archivio');
    logger.info({ migrazione: 'L1-07/08/11-346', tolte: daTogliere.length, luogo: { ...luogo, note: luogo.note.length }, condizioni: { spostate: condizioni.spostate.map((s) => s.chiave), giaNellaSede: condizioni.giaNellaSede }, discrepanze: discrepanze.length }, 'un solo dove: colonne tolte');
  },
};
