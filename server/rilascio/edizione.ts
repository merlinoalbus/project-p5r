// ============================================================
// edizione — ciò che l'istanza di rilascio legge dal volume dell'edizione, e i controlli sulla struttura delle partite (L12, passi 4-5)
// ============================================================
//
// Il volume dell'edizione (`config.edizioneDir`, montato in sola lettura) contiene, prodotti da «Prepara edizione» nella preparazione:
//   - `gioco.db`        i contenuti chiusi (VACUUM INTO, giornale `delete`, tutte le miniature, nessuno spillo senza uid);
//   - `partite-vuoto.db` la struttura delle partite con le migrazioni utente fino all'ultima prima del congelamento;
//   - `manifesto.json`   le versioni e l'impronta con cui l'istanza controlla di avere in mano proprio quella struttura;
//   - `font/`            i caratteri.
// L'istanza di rilascio NON ha il runner delle migrazioni: la struttura di `partite.db` è quella di `partite-vuoto.db`, e a ogni avvio
// la si confronta col manifesto (versioni di `main` e di `utente`, impronta dello schema `utente`). Se non coincide l'avvio si ferma:
// una struttura diversa non si «aggiusta» in esercizio (progetto §5: nuova edizione e conversione una tantum su copia, dopo il sì
// dell'utente).
//
// Il formato del manifesto qui letto è la parte che serve all'avvio; «Prepara edizione» (passo 7) può aggiungere altri campi (sha256,
// conteggi, report di compatibilità): `z.looseObject` li lascia passare. Per produrre `utente.impronta` si usa la stessa
// `improntaSchema` esportata qui, aprendo `partite-vuoto.db` come connessione a sé (schema `main`).
// ============================================================

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../config.js';
import { resolvePartitePath, type AppDatabase } from '../db/dbService.js';
import { logger } from '../utils/logger.js';

/** Il nome del file del manifesto nel volume dell'edizione. */
export const FILE_MANIFESTO = 'manifesto.json';
/** Il nome della struttura vuota delle partite nel volume dell'edizione. */
export const FILE_PARTITE_VUOTO = 'partite-vuoto.db';

/** La parte del manifesto che l'avvio controlla. */
const schemaManifesto = z.looseObject({
  gioco: z.looseObject({ versione: z.number().int().min(0) }),
  utente: z.looseObject({ versione: z.number().int().min(0), impronta: z.string().min(16) }),
});
export type ManifestoEdizione = z.infer<typeof schemaManifesto>;

/** L'errore di un controllo dell'edizione non superato: l'avvio si ferma. */
export class ErroreEdizione extends Error {
  constructor(messaggio: string, opzioni?: ErrorOptions) {
    super(messaggio, opzioni);
    this.name = 'ErroreEdizione';
  }
}

/**
 * L'impronta della struttura di uno schema: SHA-256 di tabelle, indici, viste e trigger (tipo, nome, tabella, SQL con gli spazi
 * normalizzati), in ordine stabile. Le tabelle interne di SQLite (`sqlite_*`) restano fuori. Conta la STRUTTURA, non i dati.
 * `schema` è `utente` sulla connessione dell'istanza e `main` quando si apre `partite-vuoto.db` da solo.
 */
export function improntaSchema(db: AppDatabase, schema: 'main' | 'utente'): string {
  const righe = db.prepare(`SELECT type, name, tbl_name, sql FROM ${schema}.sqlite_master WHERE name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY type, name`).all() as
    Array<{ type: string; name: string; tbl_name: string; sql: string | null }>;
  const h = createHash('sha256');
  for (const r of righe) h.update(`${r.type}|${r.name}|${r.tbl_name}|${(r.sql ?? '').replace(/\s+/g, ' ').trim()}\n`);
  return h.digest('hex');
}

/** Legge e controlla il manifesto dell'edizione. Lancia `ErroreEdizione` se manca, non è JSON o non ha la forma attesa. */
export function leggiManifesto(cartella: string = config.edizioneDir): ManifestoEdizione {
  const file = path.join(cartella, FILE_MANIFESTO);
  let testo: string;
  try {
    testo = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new ErroreEdizione(`manifesto dell'edizione assente o illeggibile (${FILE_MANIFESTO}): senza non si può controllare la struttura delle partite.`, { cause: err });
  }
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch (err) {
    throw new ErroreEdizione(`il manifesto dell'edizione (${FILE_MANIFESTO}) non è JSON valido.`, { cause: err });
  }
  const esito = schemaManifesto.safeParse(dati);
  if (!esito.success) {
    throw new ErroreEdizione(`il manifesto dell'edizione (${FILE_MANIFESTO}) non ha la forma attesa: ${esito.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return esito.data;
}

/**
 * Il controllo di ogni avvio: la versione di `main` e di `utente` e l'impronta dello schema `utente` devono coincidere con il
 * manifesto. Elenca tutto ciò che non torna in un solo messaggio.
 */
export function verificaSchemaUtente(db: AppDatabase, manifesto: ManifestoEdizione): void {
  const problemi: string[] = [];
  const versioneGioco = db.pragma('main.user_version', { simple: true }) as number;
  const versioneUtente = db.pragma('utente.user_version', { simple: true }) as number;
  if (versioneGioco !== manifesto.gioco.versione) problemi.push(`versione di gioco.db ${versioneGioco}, il manifesto dice ${manifesto.gioco.versione}`);
  if (versioneUtente !== manifesto.utente.versione) problemi.push(`versione di partite.db ${versioneUtente}, il manifesto dice ${manifesto.utente.versione}`);
  const impronta = improntaSchema(db, 'utente');
  if (impronta !== manifesto.utente.impronta) problemi.push(`l'impronta dello schema di partite.db (${impronta.slice(0, 12)}…) non coincide con quella del manifesto (${manifesto.utente.impronta.slice(0, 12)}…)`);
  if (problemi.length > 0) {
    throw new ErroreEdizione(`la struttura delle partite non corrisponde all'edizione: ${problemi.join('; ')}. L'istanza di rilascio non migra: serve l'edizione giusta o una conversione una tantum su copia, decisa dall'utente.`);
  }
}

/**
 * Primo avvio: se `partite.db` non esiste ancora lo si crea copiando `partite-vuoto.db` dal volume dell'edizione. Se esiste non si
 * tocca (è l'avanzamento di chi gioca). La copia passa da un file temporaneo e da una rinomina: un arresto a metà non lascia un
 * `partite.db` monco che il prossimo avvio scambierebbe per buono. Restituisce vero se ha copiato.
 */
export function assicuraPartiteIniziali(): boolean {
  const destinazione = resolvePartitePath();
  if (fs.existsSync(destinazione)) return false;
  const origine = path.join(config.edizioneDir, FILE_PARTITE_VUOTO);
  if (!fs.existsSync(origine)) {
    throw new ErroreEdizione(`né partite.db né ${FILE_PARTITE_VUOTO} nel volume dell'edizione: non c'è una struttura da cui partire.`);
  }
  fs.mkdirSync(path.dirname(destinazione), { recursive: true });
  const temporaneo = `${destinazione}.copia`;
  fs.copyFileSync(origine, temporaneo);
  // l'edizione è 0444: la copia deve essere scrivibile, è il file dell'avanzamento
  fs.chmodSync(temporaneo, 0o644);
  fs.renameSync(temporaneo, destinazione);
  logger.info({ origine: FILE_PARTITE_VUOTO }, 'primo avvio: partite.db creato dalla struttura vuota dell\'edizione');
  return true;
}
