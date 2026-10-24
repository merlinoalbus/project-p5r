import { createHash, randomBytes } from 'node:crypto';
import type { AppDatabase } from './dbService.js';
import { httpErrors } from '../utils/httpError.js';

/** Valutazioni di continuità: non sono ricevute di un pagamento osservato. */
export type OrigineContinuita = 'continuita-migrazione' | 'continuita-importazione';
export interface PresenzaLegacy { partita_id: number; articolo_chiave: string; updated_at: string }
interface IdentitaLegacy { articolo: string; nome: string; negozio: string | null; negozioNome: string; catalogo: string | null }
export interface ValutazioneLegacy {
  id: string; partita_id: number; articolo_chiave: string; generazione: number;
  presenza_json: string; presenza_firma: string; identita_json: string;
  prezzo_catalogo: number | null; contributo_yen: number;
  stato_prezzo: 'noto' | 'ignoto' | 'offerta-assente';
  origine: OrigineContinuita | 'nuova-presenza'; creata_il: string; prova_firma: string;
}
export interface FotografiaLegacy { riga: ValutazioneLegacy; presenza: PresenzaLegacy; identita: IdentitaLegacy }
interface AssociazioneLegacy { partita_id: number; articolo_chiave: string; valutazione_id: string }
interface RaccordoLegacy extends AssociazioneLegacy { acquisto_id: string }
interface Continuita { id: number; formato: number; origine: OrigineContinuita; presenze_json: string; firma: string; creata_il: string }

/** Questi archivi non appartengono alle cascate della partita né al reverse del Cestino. */
export const ARCHIVI_LEGACY_IMMUTABILI = ['acquisto_legacy_valutazione', 'acquisto_legacy_continuita', 'acquisto_legacy_raccordo'] as const;
const DDL = {
  acquisto_legacy_valutazione: `CREATE TABLE utente.acquisto_legacy_valutazione (
    id TEXT PRIMARY KEY CHECK(length(id)=32), partita_id INTEGER NOT NULL,
    articolo_chiave TEXT NOT NULL, generazione INTEGER NOT NULL CHECK(generazione>=1),
    presenza_json TEXT NOT NULL CHECK(json_valid(presenza_json)), presenza_firma TEXT NOT NULL CHECK(length(presenza_firma)=64),
    identita_json TEXT NOT NULL CHECK(json_valid(identita_json)), prezzo_catalogo INTEGER,
    contributo_yen INTEGER NOT NULL CHECK(contributo_yen>=0),
    stato_prezzo TEXT NOT NULL CHECK(stato_prezzo IN ('noto','ignoto','offerta-assente')),
    origine TEXT NOT NULL CHECK(origine IN ('continuita-migrazione','continuita-importazione','nuova-presenza')),
    creata_il TEXT NOT NULL, prova_firma TEXT NOT NULL CHECK(length(prova_firma)=64),
    UNIQUE(partita_id,articolo_chiave,generazione)
  )`,
  acquisto_legacy_continuita: `CREATE TABLE utente.acquisto_legacy_continuita (
    id INTEGER PRIMARY KEY CHECK(id=1), formato INTEGER NOT NULL CHECK(formato=1),
    origine TEXT NOT NULL CHECK(origine IN ('continuita-migrazione','continuita-importazione')),
    presenze_json TEXT NOT NULL CHECK(json_valid(presenze_json)), firma TEXT NOT NULL CHECK(length(firma)=64), creata_il TEXT NOT NULL
  )`,
  acquisto_legacy_associazione: `CREATE TABLE utente.acquisto_legacy_associazione (
    partita_id INTEGER NOT NULL, articolo_chiave TEXT NOT NULL, valutazione_id TEXT NOT NULL UNIQUE,
    PRIMARY KEY(partita_id,articolo_chiave),
    FOREIGN KEY(partita_id,articolo_chiave) REFERENCES acquisto_partita(partita_id,articolo_chiave) ON DELETE CASCADE,
    FOREIGN KEY(valutazione_id) REFERENCES acquisto_legacy_valutazione(id) ON DELETE RESTRICT
  )`,
  acquisto_legacy_raccordo: `CREATE TABLE utente.acquisto_legacy_raccordo (
    acquisto_id TEXT PRIMARY KEY CHECK(length(acquisto_id)=32), partita_id INTEGER NOT NULL,
    articolo_chiave TEXT NOT NULL, valutazione_id TEXT NOT NULL UNIQUE,
    FOREIGN KEY(valutazione_id) REFERENCES acquisto_legacy_valutazione(id) ON DELETE RESTRICT
  )`,
} as const;
function errore(messaggio: string): never { throw httpErrors.conflict('continuita-acquisti-incoerente', `${messaggio} Nessun valore storico viene ricostruito dal prezzo corrente.`); }
function canonico(v: unknown): string {
  const ordina = (x: unknown): unknown => Array.isArray(x) ? x.map(ordina) : x !== null && typeof x === 'object'
    ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)])) : x;
  return JSON.stringify(ordina(v));
}
const firma = (v: unknown): string => createHash('sha256').update(canonico(v)).digest('hex');
const esiste = (db: AppDatabase, schema: 'main' | 'utente', tabella: string): boolean => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type='table' AND name=?`).get(tabella);
const normalizzaDdl = (sql: string): string => sql.replace(/utente\./g, '').replace(/\s+/g, '').replace(/;$/, '');
function struttura(db: AppDatabase, nome: keyof typeof DDL, crea: boolean): void {
  const r = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type='table' AND name=?").get(nome) as { sql: string } | undefined;
  if (!r && crea) db.exec(DDL[nome]);
  else if (!r || normalizzaDdl(r.sql) !== normalizzaDdl(DDL[nome])) errore('Lo schema dell’archivio non è riconosciuto.');
  const oggetti = db.prepare("SELECT name,type FROM utente.sqlite_master WHERE tbl_name=? AND type IN ('index','trigger') AND sql IS NOT NULL").all(nome) as Array<{ name: string; type: string }>;
  const immutabile = (ARCHIVI_LEGACY_IMMUTABILI as readonly string[]).includes(nome);
  if (oggetti.some(o => o.type !== 'trigger' || !immutabile || ![`${nome}_no_update`, `${nome}_no_delete`].includes(o.name))) errore('L’archivio contiene indici o trigger non riconosciuti.');
  if (!(ARCHIVI_LEGACY_IMMUTABILI as readonly string[]).includes(nome)) return;
  for (const evento of ['UPDATE', 'DELETE'] as const) {
    const trigger = `${nome}_no_${evento.toLowerCase()}`;
    const sql = `CREATE TRIGGER utente.${trigger} BEFORE ${evento} ON ${nome} BEGIN SELECT RAISE(ABORT, 'Archivio acquisti immutabile'); END`;
    const old = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type='trigger' AND name=?").get(trigger) as { sql: string } | undefined;
    if (!old && crea && !r) db.exec(sql);
    else if (!old || normalizzaDdl(old.sql) !== normalizzaDdl(sql)) errore('Le protezioni dell’archivio non sono riconosciute.');
  }
}
function parse(raw: string): unknown { try { return JSON.parse(raw) as unknown; } catch { return errore('Una fotografia non è leggibile.'); } }
function presenza(v: unknown): PresenzaLegacy {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return errore('La tuple personale non è riconosciuta.');
  const r = v as PresenzaLegacy;
  if (Object.keys(r).sort().join(',') !== 'articolo_chiave,partita_id,updated_at' || !Number.isSafeInteger(r.partita_id) || typeof r.articolo_chiave !== 'string' || typeof r.updated_at !== 'string') return errore('La tuple personale non è integrale.');
  return r;
}
export function presenzeLegacy(db: AppDatabase, schema: 'main' | 'utente' = 'utente'): PresenzaLegacy[] {
  if (!esiste(db, schema, 'acquisto_partita')) return [];
  return db.prepare(`SELECT partita_id,articolo_chiave,updated_at FROM ${schema}.acquisto_partita ORDER BY partita_id,articolo_chiave`).all().map(presenza);
}
function fotografa(db: AppDatabase, raw: PresenzaLegacy, origine: ValutazioneLegacy['origine']): ValutazioneLegacy {
  const articolo = esiste(db, 'main', 'articolo') ? db.prepare('SELECT * FROM main.articolo WHERE chiave=?').get(raw.articolo_chiave) as Record<string, unknown> | undefined : undefined;
  const negozio = typeof articolo?.negozio_chiave === 'string' ? articolo.negozio_chiave : null;
  const n = negozio && esiste(db, 'main', 'negozio') ? db.prepare('SELECT nome FROM main.negozio WHERE chiave=?').get(negozio) as { nome: string } | undefined : undefined;
  const prezzo = articolo?.prezzo ?? null;
  if (prezzo !== null && (typeof prezzo !== 'number' || !Number.isSafeInteger(prezzo) || prezzo < 0)) return errore('Il prezzo da conservare richiede una riconciliazione esplicita.');
  // il nome è quello del catalogo degli oggetti (la copia `nome_it` che lo ripeteva non esiste più), poi quello della riga
  const nomeCatalogo = typeof articolo?.catalogo_chiave === 'string' && esiste(db, 'main', 'catalogo_oggetto')
    ? (db.prepare('SELECT nome FROM main.catalogo_oggetto WHERE chiave=?').get(articolo.catalogo_chiave) as { nome: string } | undefined)?.nome : undefined;
  const identita: IdentitaLegacy = { articolo: raw.articolo_chiave, nome: String(nomeCatalogo ?? articolo?.nome ?? raw.articolo_chiave), negozio,
    negozioNome: n?.nome ?? 'Offerta precedente', catalogo: typeof articolo?.catalogo_chiave === 'string' ? articolo.catalogo_chiave : null };
  const ultima = db.prepare('SELECT MAX(generazione) AS n FROM utente.acquisto_legacy_valutazione WHERE partita_id=? AND articolo_chiave=?').get(raw.partita_id, raw.articolo_chiave) as { n: number | null };
  const generazione = (ultima.n ?? 0) + 1;
  if (!Number.isSafeInteger(generazione)) return errore('Il contatore delle generazioni non è rappresentabile.');
  const dati = { id: randomBytes(16).toString('hex'), partita_id: raw.partita_id, articolo_chiave: raw.articolo_chiave, generazione,
    presenza_json: canonico(raw), presenza_firma: firma(raw), identita_json: canonico(identita), prezzo_catalogo: prezzo as number | null,
    contributo_yen: prezzo as number | null ?? 0, stato_prezzo: !articolo ? 'offerta-assente' as const : prezzo === null ? 'ignoto' as const : 'noto' as const,
    origine, creata_il: new Date().toISOString() };
  const r = { ...dati, prova_firma: firma(dati) };
  const colonne = Object.keys(r);
  db.prepare(`INSERT INTO utente.acquisto_legacy_valutazione (${colonne.join(',')}) VALUES (${colonne.map(() => '?').join(',')})`).run(...Object.values(r));
  return r;
}
function validaFoto(r: ValutazioneLegacy): FotografiaLegacy {
  const { prova_firma, ...dati } = r;
  const raw = presenza(parse(r.presenza_json)), identita = parse(r.identita_json) as IdentitaLegacy;
  if (!/^[a-f0-9]{32}$/.test(r.id) || !Number.isSafeInteger(r.generazione) || r.generazione < 1 || firma(dati) !== prova_firma || firma(raw) !== r.presenza_firma || raw.partita_id !== r.partita_id || raw.articolo_chiave !== r.articolo_chiave
    || !identita || Object.keys(identita).sort().join(',') !== 'articolo,catalogo,negozio,negozioNome,nome' || identita.articolo !== r.articolo_chiave || typeof identita.nome !== 'string' || typeof identita.negozioNome !== 'string' || !(identita.negozio === null || typeof identita.negozio === 'string') || !(identita.catalogo === null || typeof identita.catalogo === 'string')
    || !Number.isSafeInteger(r.contributo_yen) || r.contributo_yen < 0 || !['continuita-migrazione', 'continuita-importazione', 'nuova-presenza'].includes(r.origine) || typeof r.creata_il !== 'string'
    || (r.stato_prezzo === 'noto' ? !Number.isSafeInteger(r.prezzo_catalogo) || r.prezzo_catalogo! < 0 || r.contributo_yen !== r.prezzo_catalogo : !['ignoto', 'offerta-assente'].includes(r.stato_prezzo) || r.prezzo_catalogo !== null || r.contributo_yen !== 0)
    || r.stato_prezzo === 'offerta-assente' && identita.negozio !== null) return errore('La prova della valutazione non coincide con il contenuto.');
  return { riga: r, presenza: raw, identita };
}
export function fotoLegacy(db: AppDatabase, id: string): FotografiaLegacy {
  const r = db.prepare('SELECT * FROM utente.acquisto_legacy_valutazione WHERE id=?').get(id) as ValutazioneLegacy | undefined;
  return r ? validaFoto(r) : errore('Manca la prova durevole della presenza.');
}
function ultimaGenerazione(db: AppDatabase, f: FotografiaLegacy): void {
  const r = db.prepare('SELECT id FROM utente.acquisto_legacy_valutazione WHERE partita_id=? AND articolo_chiave=? ORDER BY generazione DESC LIMIT 1').get(f.riga.partita_id, f.riga.articolo_chiave) as { id: string } | undefined;
  if (r?.id !== f.riga.id) errore('Una generazione successiva impedisce il ripristino della vecchia presenza.');
}
function associa(db: AppDatabase, r: ValutazioneLegacy): void {
  db.prepare('INSERT INTO utente.acquisto_legacy_associazione(partita_id,articolo_chiave,valutazione_id) VALUES(?,?,?)').run(r.partita_id, r.articolo_chiave, r.id);
}
/** Prima del main: la fotografia completa è durevole anche se una migrazione successiva fallisce. */
export function preparaContinuitaLegacy(db: AppDatabase, origine: OrigineContinuita): void {
  db.transaction(() => {
    const utente = presenzeLegacy(db), main = utente.length ? [] : presenzeLegacy(db, 'main');
    const raw = utente.length ? utente : main;
    const gia = esiste(db, 'utente', 'acquisto_legacy_valutazione');
    struttura(db, 'acquisto_legacy_valutazione', true); struttura(db, 'acquisto_legacy_continuita', true);
    const c = db.prepare('SELECT * FROM utente.acquisto_legacy_continuita WHERE id=1').get() as Continuita | undefined;
    if (gia) {
      if (!c || c.formato !== 1 || !['continuita-migrazione', 'continuita-importazione'].includes(c.origine) || c.firma !== firma(parse(c.presenze_json)) || canonico(raw) !== c.presenze_json) errore('La ripresa non coincide con la fotografia precedente alle migrazioni.');
      const foto = db.prepare('SELECT * FROM utente.acquisto_legacy_valutazione ORDER BY partita_id,articolo_chiave').all() as ValutazioneLegacy[];
      if (foto.length !== raw.length || foto.some((f, i) => canonico(validaFoto(f).presenza) !== canonico(raw[i]) || f.generazione !== 1 || f.origine !== c!.origine)) errore('La copertura durevole del bootstrap è incompleta.');
      return;
    }
    if (c) errore('Il marcatore di continuità esiste senza il suo archivio.');
    for (const r of raw) fotografa(db, r, origine);
    db.prepare('INSERT INTO utente.acquisto_legacy_continuita(id,formato,origine,presenze_json,firma,creata_il) VALUES(1,1,?,?,?,?)').run(origine, canonico(raw), firma(raw), new Date().toISOString());
  })();
}
/** La 030 non consulta più il main: adotta esclusivamente la prova pre-main. */
export function completaContinuitaLegacy(db: AppDatabase): void {
  for (const n of Object.keys(DDL) as Array<keyof typeof DDL>) struttura(db, n, true);
  const c = db.prepare('SELECT * FROM utente.acquisto_legacy_continuita WHERE id=1').get() as Continuita | undefined;
  const raw = presenzeLegacy(db);
  if (!c || c.formato !== 1 || c.presenze_json !== canonico(raw) || c.firma !== firma(raw)) errore('La 030 non trova la copertura pre-main esatta delle presenze trasferite.');
  const foto = db.prepare('SELECT * FROM utente.acquisto_legacy_valutazione ORDER BY partita_id,articolo_chiave').all() as ValutazioneLegacy[];
  if (foto.length !== raw.length) errore('Il bootstrap non copre esattamente le presenze.');
  for (let i = 0; i < raw.length; i++) {
    const f = validaFoto(foto[i]!);
    if (canonico(f.presenza) !== canonico(raw[i]) || f.riga.generazione !== 1 || f.riga.origine !== c.origine) errore('La fotografia pre-main non coincide con la presenza trasferita.');
    associa(db, f.riga);
  }
  if (esiste(db, 'utente', 'acquisto_registrato')) {
    const fatti = db.prepare('SELECT id,partita_id,articolo_chiave,legacy_firma,legacy_raw_json FROM utente.acquisto_registrato WHERE legacy_firma IS NOT NULL').all() as Array<{ id: string; partita_id: number; articolo_chiave: string; legacy_firma: string; legacy_raw_json: string }>;
    for (const a of fatti) {
      const f = foto.find(f => f.partita_id === a.partita_id && f.articolo_chiave === a.articolo_chiave && f.presenza_firma === a.legacy_firma);
      if (f) {
        if (canonico(parse(a.legacy_raw_json)) !== f.presenza_json) errore('Il raccordo del fatto non coincide con la tuple fotografata.');
        db.prepare('INSERT INTO utente.acquisto_legacy_raccordo(acquisto_id,partita_id,articolo_chiave,valutazione_id) VALUES(?,?,?,?)').run(a.id, a.partita_id, a.articolo_chiave, f.id);
      }
    }
  }
  // La vecchia unicità per RAW non distingue due generazioni con lo stesso timestamp.
  // L'unicità semantica è ora valutazione_id nel raccordo durevole (anche a fonte inattiva).
  const vecchio = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type='index' AND name='acquisto_legacy_unica'").get() as { sql: string } | undefined;
  const atteso = 'CREATE UNIQUE INDEX utente.acquisto_legacy_unica ON acquisto_registrato(partita_id,articolo_chiave,legacy_firma) WHERE legacy_firma IS NOT NULL';
  if (!vecchio || normalizzaDdl(vecchio.sql) !== normalizzaDdl(atteso)) errore('L’indice storico dei raccordi non è riconosciuto.');
  db.exec('DROP INDEX utente.acquisto_legacy_unica');
  db.exec('CREATE INDEX utente.acquisto_legacy_firme ON acquisto_registrato(partita_id,articolo_chiave,legacy_firma) WHERE legacy_firma IS NOT NULL');
  verificaArchivioLegacy(db);
}
export function valutazioniLegacyPartita(db: AppDatabase, partitaId: number): FotografiaLegacy[] {
  const raw = presenzeLegacy(db).filter(r => r.partita_id === partitaId);
  const associazioni = db.prepare('SELECT * FROM utente.acquisto_legacy_associazione WHERE partita_id=? ORDER BY articolo_chiave').all(partitaId) as AssociazioneLegacy[];
  if (raw.length !== associazioni.length) return errore('Una presenza non ha la sua valutazione durevole.');
  return raw.map((r, i) => {
    const a = associazioni[i]!, f = fotoLegacy(db, a.valutazione_id);
    if (a.articolo_chiave !== r.articolo_chiave || canonico(f.presenza) !== canonico(r)) return errore('L’associazione della presenza appartiene a un’altra tuple.');
    ultimaGenerazione(db, f); return f;
  });
}
export function nuovaValutazioneLegacy(db: AppDatabase, raw: PresenzaLegacy): void {
  if (!db.inTransaction) errore('La nuova presenza richiede una transazione.');
  const corrente = db.prepare('SELECT * FROM utente.acquisto_partita WHERE partita_id=? AND articolo_chiave=?').get(raw.partita_id, raw.articolo_chiave);
  if (canonico(corrente) !== canonico(raw)) errore('La nuova tuple non coincide con la presenza registrata.');
  associa(db, fotografa(db, raw, 'nuova-presenza'));
}
export function generazioneRappresentata(db: AppDatabase, acquistoId: string): string | null {
  const r = db.prepare('SELECT * FROM utente.acquisto_legacy_raccordo WHERE acquisto_id=?').get(acquistoId) as RaccordoLegacy | undefined;
  if (!r) return null;
  const f = fotoLegacy(db, r.valutazione_id);
  if (f.riga.partita_id !== r.partita_id || f.riga.articolo_chiave !== r.articolo_chiave) return errore('Il raccordo del fatto appartiene a un’altra identità.');
  return r.valutazione_id;
}
export function collegaGenerazioneLegacy(db: AppDatabase, acquistoId: string, raw: PresenzaLegacy): void {
  if (!db.inTransaction) errore('Il raccordo della presenza richiede una transazione.');
  const f = valutazioniLegacyPartita(db, raw.partita_id).find(f => canonico(f.presenza) === canonico(raw));
  if (!f) return errore('Manca la generazione da rappresentare.');
  const fatto = db.prepare('SELECT partita_id,articolo_chiave,legacy_firma,legacy_raw_json FROM utente.acquisto_registrato WHERE id=?').get(acquistoId) as { partita_id: number; articolo_chiave: string; legacy_firma: string | null; legacy_raw_json: string | null } | undefined;
  if (!fatto || fatto.partita_id !== raw.partita_id || fatto.articolo_chiave !== raw.articolo_chiave || fatto.legacy_firma !== f.riga.presenza_firma || !fatto.legacy_raw_json || canonico(parse(fatto.legacy_raw_json)) !== canonico(raw)) errore('Il fatto da raccordare non coincide con la prova generazionale.');
  const vecchia = generazioneRappresentata(db, acquistoId);
  if (vecchia) { if (vecchia !== f.riga.id) errore('Il fatto rappresenta un’altra generazione.'); return; }
  db.prepare('INSERT INTO utente.acquisto_legacy_raccordo(acquisto_id,partita_id,articolo_chiave,valutazione_id) VALUES(?,?,?,?)').run(acquistoId, raw.partita_id, raw.articolo_chiave, f.riga.id);
}
export function verificaArchivioLegacy(db: AppDatabase): void {
  for (const n of Object.keys(DDL) as Array<keyof typeof DDL>) struttura(db, n, false);
  const indice = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type='index' AND name='acquisto_legacy_firme'").get() as { sql: string } | undefined;
  if (!indice || normalizzaDdl(indice.sql) !== normalizzaDdl('CREATE INDEX utente.acquisto_legacy_firme ON acquisto_registrato(partita_id,articolo_chiave,legacy_firma) WHERE legacy_firma IS NOT NULL')
    || db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type='index' AND name='acquisto_legacy_unica'").get()) errore('Gli indici dei raccordi non corrispondono al formato generazionale.');
  const c = db.prepare('SELECT * FROM utente.acquisto_legacy_continuita WHERE id=1').get() as Continuita | undefined;
  if (!c || c.formato !== 1 || !['continuita-migrazione', 'continuita-importazione'].includes(c.origine) || c.firma !== firma(parse(c.presenze_json))) errore('Il marcatore di continuità non è riconosciuto.');
  const foto = db.prepare('SELECT * FROM utente.acquisto_legacy_valutazione ORDER BY partita_id,articolo_chiave,generazione').all() as ValutazioneLegacy[];
  for (const f of foto) validaFoto(f);
  const iniziali = parse(c.presenze_json);
  if (!Array.isArray(iniziali)) errore('L’elenco iniziale delle presenze non è riconosciuto.');
  for (const r of iniziali as unknown[]) {
    const raw = presenza(r), f = foto.find(f => f.partita_id === raw.partita_id && f.articolo_chiave === raw.articolo_chiave && f.generazione === 1);
    if (!f || f.presenza_json !== canonico(raw) || f.origine !== c.origine) errore('Una prova iniziale è stata persa o sostituita.');
  }
  const gruppi = new Map<string, number>();
  for (const f of foto) { const k = canonico([f.partita_id, f.articolo_chiave]), attesa = (gruppi.get(k) ?? 0) + 1; if (f.generazione !== attesa) errore('La successione delle generazioni contiene un vuoto.'); gruppi.set(k, attesa); }
  const ids = new Set((db.prepare('SELECT partita_id FROM utente.acquisto_partita UNION SELECT partita_id FROM utente.acquisto_legacy_associazione').all() as Array<{ partita_id: number }>).map(r => r.partita_id));
  for (const id of ids) valutazioniLegacyPartita(db, id);
  const raccordi = db.prepare('SELECT * FROM utente.acquisto_legacy_raccordo').all() as RaccordoLegacy[];
  for (const r of raccordi) {
    const f = fotoLegacy(db, generazioneRappresentata(db, r.acquisto_id)!);
    const a = db.prepare('SELECT partita_id,articolo_chiave,legacy_firma,legacy_raw_json FROM utente.acquisto_registrato WHERE id=?').get(r.acquisto_id) as { partita_id: number; articolo_chiave: string; legacy_firma: string; legacy_raw_json: string } | undefined;
    if (a && (a.partita_id !== r.partita_id || a.articolo_chiave !== r.articolo_chiave || a.legacy_firma !== f.riga.presenza_firma || canonico(parse(a.legacy_raw_json)) !== f.riga.presenza_json)) errore('Il fatto e il raccordo durevole divergono.');
  }
  const fatti = db.prepare('SELECT id,partita_id,articolo_chiave,legacy_firma FROM utente.acquisto_registrato WHERE legacy_firma IS NOT NULL').all() as Array<{ id: string; partita_id: number; articolo_chiave: string; legacy_firma: string }>;
  for (const a of fatti) {
    if (!raccordi.some(r => r.acquisto_id === a.id) && valutazioniLegacyPartita(db, a.partita_id).some(f => f.riga.presenza_firma === a.legacy_firma && f.riga.articolo_chiave === a.articolo_chiave)) errore('Il fatto che rappresenta una presenza non ha il raccordo generazionale.');
  }
  const cestini = db.prepare('SELECT registro_json FROM utente.cestino_partite').all() as Array<{ registro_json: string }>;
  for (const c of cestini) {
    const passi = parse(c.registro_json);
    if (!Array.isArray(passi)) errore('Un registro del Cestino non è riconoscibile.');
    if (passi.some(p => !p || typeof p !== 'object' || Array.isArray(p) || typeof p.tabella !== 'string' || !['D', 'U', 'I'].includes(p.op))) errore('Un passo del Cestino non è riconoscibile.');
    verificaCestinoLegacy(db, (passi as PassoLegacy[]).map(p => ({ ...p, schema: 'utente' })), false);
  }
}

interface PassoLegacy { schema: string; tabella: string; op: string; prima?: Record<string, unknown>; dopo?: Record<string, unknown> }
/** Nessuna valutazione al restore: vecchi registri senza prova restano recuperabili ma da riconciliare. */
export function verificaCestinoLegacy(db: AppDatabase, passi: readonly PassoLegacy[], esigiUltima = true): void {
  if (passi.some(p => p.schema === 'utente' && (ARCHIVI_LEGACY_IMMUTABILI as readonly string[]).includes(p.tabella))) errore('Un registro del Cestino non può riscrivere gli archivi immutabili.');
  for (const p of passi.filter(p => p.schema === 'utente' && p.tabella === 'acquisto_partita')) {
    if (p.op !== 'D' || !p.prima) { if (!esigiUltima) continue; errore('Il vecchio gesto richiede una riconciliazione esplicita della presenza.'); }
    const raw = presenza(p.prima);
    const a = passi.filter(x => x.schema === 'utente' && x.tabella === 'acquisto_legacy_associazione' && x.op === 'D' && x.prima?.partita_id === raw.partita_id && x.prima.articolo_chiave === raw.articolo_chiave);
    if (!a.length && !esigiUltima) continue;
    if (a.length !== 1) errore('Questo Cestino precede la prova di continuità: occorre riconciliare esplicitamente la presenza, il registro è conservato.');
    const binding = a[0]!.prima!;
    if (Object.keys(binding).sort().join(',') !== 'articolo_chiave,partita_id,valutazione_id' || typeof binding.valutazione_id !== 'string') errore('L’associazione nel Cestino non è integrale.');
    const f = fotoLegacy(db, binding.valutazione_id as string);
    if (canonico(f.presenza) !== canonico(raw)) errore('La prova del Cestino appartiene a un’altra tuple.');
    if (esigiUltima) ultimaGenerazione(db, f);
    const corrente = db.prepare('SELECT * FROM utente.acquisto_partita WHERE partita_id=? AND articolo_chiave=?').get(raw.partita_id, raw.articolo_chiave);
    if (esigiUltima && corrente && canonico(corrente) !== canonico(raw)) errore('La presenza è cambiata dopo la rimozione.');
  }
  for (const p of passi.filter(p => p.schema === 'utente' && p.tabella === 'acquisto_legacy_associazione')) {
    if (p.op !== 'D' || !p.prima || !passi.some(x => x.schema === 'utente' && x.tabella === 'acquisto_partita' && x.op === 'D' && x.prima?.partita_id === p.prima!.partita_id && x.prima?.articolo_chiave === p.prima!.articolo_chiave)) errore('L’associazione del Cestino non ha la propria presenza originale.');
  }
}
