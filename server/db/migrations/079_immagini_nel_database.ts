// ============================================================
// 079 — le immagini vivono nel database: `immagine.contenuto` e le famiglie della grafica di gioco
// ============================================================
//
// Decisione dell'utente (2026-09-12): tutto ciò che non è compendio (persona, arcani, skill) né
// interfaccia (`ui/`) sta DENTRO `gioco.db`. Finora la tabella `immagine` teneva solo l'indice e i
// file stavano in `DATA_DIR/immagini/`; la grafica di gioco del repository stava in `public/asset/`
// e il pacchetto spediva le sue immagini in `pacchetto/immagini/`. Da qui in poi il contenuto sta
// nella colonna `contenuto` (BLOB) e il pacchetto di gioco è un solo file.
//
// La migrazione assorbe, in ordine, tutto ciò che trova: (1) i file delle righe esistenti, da
// `DATA_DIR/immagini` e da `pacchetto/immagini`; (2) le famiglie di `public/asset/` (una riga per
// file, chiave del manifesto, `webp` preferito a `png` a parità di chiave); (3) il pacchetto completo
// `pacchetto/completo/gioco.db` (fuori da git), se c'è sul disco e ha già le immagini dentro (un'istanza
// di sviluppo aggiornata dopo la rimozione delle cartelle le prende da lì; le altre le importano dall'app). Tutto idempotente: si riempie solo ciò che è vuoto. I file non trovati
// restano righe senza contenuto (l'app risponde 404 come faceva con il file mancante).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { AMBITI_PREDEFINITI, ESTENSIONI_IMMAGINE, mimeDaEstensione } from '../../../shared/immagini.js';
import { slugPercorso } from '../../../shared/slug.js';

type Db = AppDatabase | Database.Database;

function haColonnaContenuto(db: Db, schema = 'main'): boolean {
  return (db.prepare(`PRAGMA "${schema}".table_info(immagine)`).all() as Array<{ name: string }>).some((c) => c.name === 'contenuto');
}

/** Il percorso su disco del file principale della connessione ('' per un database in memoria). */
function percorsoMain(db: Db): string {
  const riga = (db.pragma('database_list') as Array<{ name: string; file: string }>).find((d) => d.name === 'main');
  return riga?.file ?? '';
}

/** (1) I file delle righe esistenti senza contenuto, cercati nelle radici date (`<radice>/<ambito>/<nome_file>`). */
export function assorbiFileDelleRighe(db: Db, radici: string[]): number {
  const righe = db.prepare('SELECT id, ambito, nome_file FROM immagine WHERE contenuto IS NULL').all() as Array<{ id: number; ambito: string; nome_file: string }>;
  const aggiorna = db.prepare('UPDATE immagine SET contenuto = ?, byte = ? WHERE id = ?');
  let n = 0;
  for (const r of righe) {
    for (const radice of radici) {
      const p = path.join(radice, r.ambito, r.nome_file);
      if (!fs.existsSync(p)) continue;
      const contenuto = fs.readFileSync(p);
      aggiorna.run(contenuto, contenuto.length, r.id);
      n++;
      break;
    }
  }
  return n;
}

function fileRicorsivi(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    const pieno = path.join(dir, voce.name);
    if (voce.isDirectory()) out.push(...fileRicorsivi(pieno, base));
    else if (voce.isFile()) out.push(path.relative(base, pieno).replace(/\\/g, '/'));
  }
  return out.sort();
}

/** Scrive (o riempie) la riga di una famiglia; vero se ha scritto. */
function scriviPredefinita(db: Db, ambito: string, chiave: string, nomeFile: string, mime: string, contenuto: Buffer, adesso: string): boolean {
  const esistente = db.prepare('SELECT id, (contenuto IS NOT NULL) AS piena FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as { id: number; piena: number } | undefined;
  if (esistente?.piena) return false;
  if (esistente) db.prepare('UPDATE immagine SET contenuto = ?, byte = ?, mime = ?, nome_file = ? WHERE id = ?').run(contenuto, contenuto.length, mime, nomeFile, esistente.id);
  else db.prepare('INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, origine_url, contenuto) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)').run(ambito, chiave, nomeFile, mime, contenuto.length, adesso, contenuto);
  return true;
}

/** (2) Le famiglie della grafica di gioco in `dirAsset` (`public/asset`): una riga per file, chiave del manifesto. */
export function assorbiFamiglieDelRepository(db: Db, dirAsset: string, adesso: string = new Date().toISOString()): number {
  let n = 0;
  for (const famiglia of AMBITI_PREDEFINITI) {
    const dir = path.join(dirAsset, famiglia);
    // a parità di chiave vince l'estensione preferita: si scorre in quell'ordine e la seconda trova la riga già piena
    const file = fileRicorsivi(dir).map((rel) => ({ rel, est: path.extname(rel).slice(1).toLowerCase() })).filter((f) => (ESTENSIONI_IMMAGINE as readonly string[]).includes(f.est));
    file.sort((a, b) => (ESTENSIONI_IMMAGINE as readonly string[]).indexOf(a.est) - (ESTENSIONI_IMMAGINE as readonly string[]).indexOf(b.est) || a.rel.localeCompare(b.rel));
    for (const f of file) {
      const chiave = slugPercorso(f.rel.slice(0, f.rel.length - f.est.length - 1));
      const mime = mimeDaEstensione(f.est);
      if (!chiave || !mime) continue;
      if (scriviPredefinita(db, famiglia, chiave, path.basename(f.rel), mime, fs.readFileSync(path.join(dir, f.rel)), adesso)) n++;
    }
  }
  return n;
}

/** (3) Dal pacchetto del repository (connessione a parte, sola lettura): le righe piene che l'istanza non ha o ha vuote. */
export function assorbiDalPacchetto(db: Db, percorsoPacchetto: string): number {
  const corrente = percorsoMain(db);
  // un database in memoria è un test: non si trascinano dentro centinaia di MB di immagini
  if (!corrente || !fs.existsSync(percorsoPacchetto) || path.resolve(corrente) === path.resolve(percorsoPacchetto)) return 0;
  const pacchetto = new Database(percorsoPacchetto, { readonly: true });
  try {
    if (!haColonnaContenuto(pacchetto)) return 0;
    const righe = pacchetto.prepare('SELECT ambito, chiave, nome_file, mime, byte, created_at, origine_url, contenuto FROM immagine WHERE contenuto IS NOT NULL').all() as Array<{ ambito: string; chiave: string; nome_file: string; mime: string; byte: number; created_at: string; origine_url: string | null; contenuto: Buffer }>;
    let n = 0;
    for (const r of righe) {
      const esistente = db.prepare('SELECT id, (contenuto IS NOT NULL) AS piena FROM immagine WHERE ambito = ? AND chiave = ?').get(r.ambito, r.chiave) as { id: number; piena: number } | undefined;
      if (esistente?.piena) continue;
      if (esistente) db.prepare('UPDATE immagine SET contenuto = ?, byte = ?, mime = ?, nome_file = ? WHERE id = ?').run(r.contenuto, r.contenuto.length, r.mime, r.nome_file, esistente.id);
      else db.prepare('INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, origine_url, contenuto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(r.ambito, r.chiave, r.nome_file, r.mime, r.contenuto.length, r.created_at, r.origine_url, r.contenuto);
      n++;
    }
    return n;
  } finally {
    pacchetto.close();
  }
}

/** Le tre sorgenti nell'ordine, con i percorsi della configurazione. Esportata per i test e per il pacchetto. */
export function assorbiImmagini(db: Db, opzioni: { radici?: string[]; dirAsset?: string; pacchetto?: string } = {}): { daDisco: number; dalRepository: number; dalPacchetto: number; senzaContenuto: number } {
  // un database in memoria è un test: le famiglie del repository e il pacchetto (centinaia di MB) entrano solo se richiesti espressamente
  const inMemoria = !percorsoMain(db);
  const daDisco = assorbiFileDelleRighe(db, opzioni.radici ?? [path.join(config.dataDir, 'immagini'), path.join(config.pacchettoDir, 'immagini')]);
  const dalRepository = inMemoria && opzioni.dirAsset === undefined ? 0 : assorbiFamiglieDelRepository(db, opzioni.dirAsset ?? config.assetDir);
  const dalPacchetto = assorbiDalPacchetto(db, opzioni.pacchetto ?? path.join(config.pacchettoDir, 'completo', 'gioco.db'));
  const senzaContenuto = (db.prepare('SELECT COUNT(*) AS n FROM immagine WHERE contenuto IS NULL').get() as { n: number }).n;
  return { daDisco, dalRepository, dalPacchetto, senzaContenuto };
}

export const migration079: Migration = {
  id: 79,
  name: 'immagini_nel_database',
  up(db) {
    if (!haColonnaContenuto(db)) db.exec('ALTER TABLE immagine ADD COLUMN contenuto BLOB');
    const esito = assorbiImmagini(db);
    logger.info(esito, 'migrazione 079: immagini assorbite nel database');
  },
};
