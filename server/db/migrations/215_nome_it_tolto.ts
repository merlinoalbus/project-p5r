// ============================================================
// 215 — `libro.nome_it`, `film.nome_it`, `articolo.nome_it` tolte dal modello: un solo nome, quello del catalogo (L11 · R11-02/10, decisione dell'utente del 24/10)
// ============================================================
//
// `nome_it` era una copia storica di `catalogo_oggetto.nome`: ogni salvataggio dal catalogo la riallineava (`catalogoService`), e sulla copia reale di p5s
// coincide con il nome del catalogo per tutte le righe che ce l'hanno (libri 46 su 46, film 14, articoli 1: «Condenser Lens», nome italiano «Lente
// condensante» = nome del catalogo, l'inglese resta fra i nomi alternativi dell'oggetto). Decisione dell'utente: «Sì, toglila». Nessun lettore vivo la usa
// più (nomi mostrati, ricerca, scrittura, schemi e tipi sono già sul nome del catalogo: `nome` del DTO). Si archiviano TUTTE le righe con un valore in
// `dati_guida.archivio-frasi-l11` (colonne `libro.nome_it`, `film.nome_it`, `articolo.nome_it`, chiave → valore; nel registro `prove` le righe che non
// coincidono con il nome del catalogo, con i tre nomi a confronto) e si tolgono le colonne. Il registro `FONTI_TOLTE` riceve le voci (cestino e importazione
// di un backup vecchio). Idempotente (ogni colonna si toglie solo se c'è), senza modifiche parziali: impronte delle altre colonne delle tre tabelle e
// delle tabelle vicine prima e dopo. Scrive solo in `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';

const TABELLE = ['libro', 'film', 'articolo'] as const;
/** Le tabelle che questa migrazione non deve cambiare (il diario, i Palazzi, il catalogo, i negozi, le proposte, il cestino). */
const INTATTE = ['negozio', 'luogo', 'quartiere', 'attivita', 'spillo', 'cestino', 'voce_giornata', 'voce_effetto', 'catalogo_oggetto', 'proposta_abbinamento',
  'dungeon', 'dungeon_area', 'infiltrazione_area', 'area', 'mappa', 'confidente', 'giorno'] as const;
const errore = (motivo: string): never => { throw new Error(`215: ${motivo}; nessuna modifica applicata.`); };

/** Impronta di `dati_guida` senza il blocco d'archivio che questa migrazione scrive. */
function improntaDatiGuida(db: AppDatabase): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT chiave, json FROM main.dati_guida WHERE chiave <> ? ORDER BY chiave').iterate(ARCHIVIO_FRASI)) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration215: Migration = {
  id: 215, name: 'nome_it_tolto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const daTogliere = TABELLE.filter((t) => esisteTabella(db, t) && haColonna(db, t, 'nome_it'));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>(daTogliere.map((t) => [t, improntaTabella(db, t, ['nome_it'])]));
    for (const t of TABELLE) if (!daTogliere.includes(t) && esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const guidaPrima = improntaDatiGuida(db);

    const colonne: Record<string, RigheArchiviate> = {};
    const prove: Record<string, unknown> = {};
    const conCatalogo = esisteTabella(db, 'catalogo_oggetto');
    for (const t of daTogliere) {
      colonne[`${t}.nome_it`] = righeConValore(db, t, 'nome_it');
      const righe = db.prepare(`SELECT x.chiave, x.nome, x.nome_it, ${conCatalogo && haColonna(db, t, 'catalogo_chiave') ? 'c.nome' : 'NULL'} AS catalogo
        FROM main.${t} x ${conCatalogo && haColonna(db, t, 'catalogo_chiave') ? 'LEFT JOIN main.catalogo_oggetto c ON c.chiave = x.catalogo_chiave' : ''}
        WHERE x.nome_it IS NOT NULL AND x.nome_it <> '' ORDER BY x.rowid`).all() as Array<{ chiave: string; nome: string; nome_it: string; catalogo: string | null }>;
      const divergenti: Record<string, { nome_it: string; catalogo: string | null; nomeRiga: string }> = {};
      for (const r of righe) if (r.nome_it !== (r.catalogo ?? r.nome)) divergenti[r.chiave] = { nome_it: r.nome_it, catalogo: r.catalogo, nomeRiga: r.nome };
      prove[`${t}.nome_it`] = { righe: righe.length, divergentiDalNomeDelCatalogo: divergenti };
    }
    const attese = Object.fromEntries(Object.entries(colonne).map(([k, v]) => [k, Object.keys(v).length]));
    archiviaFrasi(db, 'L11-R11-02/10 · 215', colonne, prove);

    for (const t of daTogliere) db.exec(`ALTER TABLE main.${t} DROP COLUMN "nome_it"`);

    for (const [k, n] of Object.entries(attese)) if (archiviate(db, k) !== n) errore(`l'archivio di ${k} non ha ${n} righe`);
    for (const t of daTogliere) {
      if (haColonna(db, t, 'nome_it')) errore(`la colonna ${t}.nome_it esiste ancora`);
      if (improntaTabella(db, t) !== prima.get(t)) errore(`le colonne rimaste di ${t} sono cambiate`);
    }
    for (const t of [...TABELLE.filter((x) => !daTogliere.includes(x)), ...INTATTE]) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (improntaDatiGuida(db) !== guidaPrima) errore('i blocchi di dati_guida (archivio escluso) sono cambiati');
    logger.info({ migrazione: 'L11-R11-02-10-215', tolte: daTogliere.map((t) => `${t}.nome_it`), archiviate: attese }, 'nome_it di libri, film e articoli tolto dal modello');
  },
};
