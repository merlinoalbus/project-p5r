// L7 — Catalogo per chiave. Migrazione append-only, senza aggiornamenti alle voci o alle partite.
// Le regole di conversione sono congelate qui: non dipendono dal catalogo modificabile dell'app.
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { popolaCatalogo121 } from './catalogoOggetti121.js';
import { condividiListini121 } from './listiniCondivisi121.js';
import { conservaNoteScambi121 } from './noteScambi121.js';
import { censisciFontiCatalogo121, salvaAuditCatalogo121 } from './auditCatalogo121.js';
import { catturaSnapshotProposte121 } from './snapshotProposte121.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS catalogo_oggetto (
  chiave TEXT PRIMARY KEY, categoria TEXT NOT NULL, sottocategoria TEXT,
  nome TEXT NOT NULL, nomi_altri_json TEXT NOT NULL DEFAULT '[]', nome_originale TEXT,
  effetto TEXT NOT NULL DEFAULT '', descrizione TEXT NOT NULL DEFAULT '', statistiche_json TEXT,
  fonte_tipo TEXT NOT NULL CHECK (fonte_tipo IN ('equipaggiamento','guida','libro','film','videogioco','listino','utente')),
  fonte_chiave TEXT, origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed','utente')),
  seed_json TEXT, nascosto INTEGER NOT NULL DEFAULT 0 CHECK (nascosto IN (0,1)), updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS catalogo_fonte ON catalogo_oggetto(fonte_tipo,fonte_chiave) WHERE fonte_chiave IS NOT NULL;
CREATE TABLE IF NOT EXISTS trasformazione_oggetto (
  dungeon_chiave TEXT PRIMARY KEY REFERENCES dungeon(chiave) ON DELETE CASCADE,
  cristallo_chiave TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL,
  anello_chiave TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL,
  solo_ng_plus INTEGER NOT NULL CHECK (solo_ng_plus IN (0,1)), fonte TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS voce_oggetto (
  voce_chiave TEXT NOT NULL REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
  catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave) ON DELETE CASCADE,
  quantita INTEGER NOT NULL DEFAULT 1 CHECK (quantita > 0), ordine INTEGER NOT NULL DEFAULT 0, nota TEXT,
  PRIMARY KEY (voce_chiave,catalogo_chiave)
);
CREATE TABLE IF NOT EXISTS ricompensa_oggetto (
  fonte_tipo TEXT NOT NULL, fonte_chiave TEXT NOT NULL,
  catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave) ON DELETE CASCADE,
  quantita INTEGER DEFAULT 1 CHECK ((quantita IS NOT NULL AND quantita > 0) OR (fonte_tipo = 'ricetta' AND quantita IS NULL)), ordine INTEGER NOT NULL DEFAULT 0, nota TEXT,
  PRIMARY KEY (fonte_tipo,fonte_chiave,catalogo_chiave)
);
CREATE TABLE IF NOT EXISTS ricetta_materiale (
  ricetta TEXT NOT NULL, catalogo_chiave TEXT NOT NULL REFERENCES catalogo_oggetto(chiave) ON DELETE CASCADE,
  quantita INTEGER NOT NULL CHECK (quantita > 0), PRIMARY KEY (ricetta,catalogo_chiave)
);
CREATE TABLE IF NOT EXISTS proposta_abbinamento (
  riga_tipo TEXT NOT NULL CHECK (riga_tipo IN ('articolo','regalo','voce','ricompensa','ricetta','catalogo')),
  riga_chiave TEXT NOT NULL, gruppo TEXT NOT NULL DEFAULT '',
  catalogo_chiave TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL,
  quantita INTEGER DEFAULT 1 CHECK ((quantita IS NOT NULL AND quantita > 0) OR ((riga_tipo IN ('ricetta','voce') OR (riga_tipo = 'ricompensa' AND substr(riga_chiave,1,8) = 'ricetta/')) AND quantita IS NULL)), motivo TEXT NOT NULL,
  certezza TEXT NOT NULL CHECK (certezza IN ('certa','probabile','da-verificare')),
  stato TEXT NOT NULL DEFAULT 'da-approvare' CHECK (stato IN ('da-approvare','confermata','scartata')),
  modifica_json TEXT, fonte_snapshot_json TEXT, nota TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY (riga_tipo,riga_chiave,gruppo,catalogo_chiave)
);
CREATE INDEX IF NOT EXISTS idx_proposta_abbinamento_stato ON proposta_abbinamento(stato,riga_tipo,riga_chiave);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposta_abbinamento_senza_candidato ON proposta_abbinamento(riga_tipo,riga_chiave,gruppo,COALESCE(catalogo_chiave,''));
CREATE TABLE IF NOT EXISTS negozio_luogo_extra (
  negozio_chiave TEXT NOT NULL REFERENCES negozio(chiave) ON DELETE CASCADE,
  luogo_chiave TEXT NOT NULL REFERENCES luogo(chiave) ON DELETE CASCADE,
  PRIMARY KEY (negozio_chiave,luogo_chiave)
);
CREATE TABLE IF NOT EXISTS negozio_sede_spillo (
  spillo_uid TEXT PRIMARY KEY REFERENCES spillo(uid) ON DELETE CASCADE,
  negozio_chiave TEXT NOT NULL, luogo_chiave TEXT NOT NULL,
  FOREIGN KEY (negozio_chiave,luogo_chiave) REFERENCES negozio_luogo_extra(negozio_chiave,luogo_chiave) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_negozio_luogo_extra_luogo ON negozio_luogo_extra(luogo_chiave);
CREATE INDEX IF NOT EXISTS idx_negozio_sede_spillo_sede ON negozio_sede_spillo(negozio_chiave,luogo_chiave);
`;

/** Come 115/118: stessi elementi e id, compreso il contatore se erano state svuotate delle righe. */
function estendiCestino(db: AppDatabase): void {
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'cestino' AND type = 'table'").get() as { sql: string } | undefined)?.sql;
  if (!sql || sql.includes("'oggetto'")) return;
  const sequenza = (db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'cestino'").get() as { seq: number } | undefined)?.seq ?? 0;
  db.exec(`CREATE TABLE cestino_oggetti_121 (
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK (tipo IN ('area','voce','mappa','area-dedalo','area-fisica','luogo','negozio','richiesta','oggetto')),
    chiave TEXT NOT NULL, nome TEXT NOT NULL, contesto TEXT NOT NULL DEFAULT '',
    riepilogo_json TEXT NOT NULL DEFAULT '{}', registro_json TEXT NOT NULL,
    con_partite INTEGER NOT NULL DEFAULT 0 CHECK (con_partite IN (0,1)), vicini_json TEXT, eliminato_il TEXT NOT NULL
  );
  INSERT INTO cestino_oggetti_121 SELECT id,uid,tipo,chiave,nome,contesto,riepilogo_json,registro_json,con_partite,vicini_json,eliminato_il FROM cestino;
  DROP TABLE cestino;
  ALTER TABLE cestino_oggetti_121 RENAME TO cestino;
  CREATE INDEX idx_cestino_eliminato ON cestino(eliminato_il);`);
  const massimo = (db.prepare('SELECT COALESCE(MAX(id),0) AS n FROM cestino').get() as { n: number }).n;
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'cestino'").run();
  db.prepare("INSERT INTO sqlite_sequence(name,seq) VALUES ('cestino',?)").run(Math.max(sequenza, massimo));
}

export const migration121: Migration = {
  id: 121, name: 'catalogo_oggetti',
  up(db) {
    // La bozza con raccordo non è mai stata registrata. Non convertirla implicitamente:
    // le eventuali fonti confluite richiedono un inventario completo prima di qualsiasi mutazione.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'catalogo_oggetto_fonte'").get()) {
      throw new Error('È presente uno schema intermedio L7 non pubblicato. Migrazione interrotta senza modifiche: riconciliare tutte le fonti e i riferimenti prima di rimuovere il raccordo.');
    }
    const fontiPrima = censisciFontiCatalogo121(db);
    db.exec(SCHEMA);
    for (const [tabella, colonna, definizione] of [
      ['oggetto', 'catalogo_chiave', 'TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL'],
      ['libro', 'catalogo_chiave', 'TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL'],
      ['film', 'catalogo_chiave', 'TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL'],
      ['attivita', 'catalogo_chiave', 'TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL'],
      ['articolo', 'catalogo_chiave', 'TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL'],
      ['articolo', 'costo_json', 'TEXT'],
      ['articolo', 'articolo_condiviso', 'TEXT REFERENCES articolo(chiave) ON DELETE SET NULL'],
      ['negozio', 'listino_condiviso', 'TEXT REFERENCES negozio(chiave) ON DELETE SET NULL'],
      ['confidente_regalo', 'catalogo_chiave', 'TEXT REFERENCES catalogo_oggetto(chiave) ON DELETE SET NULL'],
      ['confidente_regalo', 'nota', 'TEXT'],
      ['confidente_regalo', 'seed_json', 'TEXT'],
      ['proposta_abbinamento', 'fonte_snapshot_json', 'TEXT'],
    ]) {
      const colonne = db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>;
      if (!colonne.some((c) => c.name === colonna)) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${definizione}`);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_articolo_catalogo ON articolo(catalogo_chiave);
      CREATE INDEX IF NOT EXISTS idx_regalo_catalogo ON confidente_regalo(catalogo_chiave);
      CREATE INDEX IF NOT EXISTS idx_articolo_condiviso ON articolo(articolo_condiviso);
      CREATE INDEX IF NOT EXISTS idx_negozio_listino_condiviso ON negozio(listino_condiviso);`);
    estendiCestino(db);
    popolaCatalogo121(db);
    conservaNoteScambi121(db);
    condividiListini121(db);
    catturaSnapshotProposte121(db);
    salvaAuditCatalogo121(db, fontiPrima);
  },
};
