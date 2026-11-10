// ============================================================
// 359 — nome, categoria e «per chi» di un'offerta valgono solo senza legame (L4-07)
// ============================================================
//
// Un'offerta collegata a un oggetto del catalogo legge nome, categoria e destinatario dall'oggetto (`negoziService.articoloDto`, decisione
// 21): le colonne `articolo.nome`, `categoria` e `per` di quelle righe sono copie che nessuna vista legge, e in parte non coincidono più con
// l'oggetto. Le righe collegate create dall'editor hanno già nome vuoto e categoria «altro», mai una copia (`catalogoService.normalizzaScrittura`):
// questa migrazione porta così anche quelle di prima. Le offerte senza legame tengono i loro valori: sono il loro unico punto di modifica.
//
// Passi, in una transazione: (1) ogni valore che cambia va in `dati_guida.archivio-frasi-l11` («articolo.nome», «articolo.categoria»,
// «articolo.per», senza mai riscrivere un valore già archiviato); (2) le righe collegate ricevono nome '', categoria 'altro', per NULL;
// (3) prove: l'impronta di `articolo` senza le tre colonne e le offerte senza legame restano identiche. `seed_json` (la fotografia della
// guida) non si tocca: «Ripristina» la rimette e poi applica la stessa regola. Idempotente: alla seconda esecuzione non c'è niente da
// cambiare. Verbale con i conteggi e le chiavi delle divergenze: `dati_guida.audit-l4-07-identita-offerte`.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit, righeArchiviate } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`359: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L4-07 · 359';
const COLONNE = ['nome', 'categoria', 'per'] as const;
type Colonna = (typeof COLONNE)[number];
const VUOTO = { nome: '', categoria: 'altro', per: null } as const;

// La categoria del listino di un oggetto, com'era il 10/11 (`shared/catalogo.ts:categoriaDelListino`): copiata qui perché il verbale non
// cambi se la funzione cambia dopo. Serve solo a contare le divergenze; il risultato della migrazione non ne dipende.
const CATEGORIE_ARTICOLO = new Set(['arma', 'protezione', 'accessorio', 'consumabile', 'materiale', 'cibo', 'regalo', 'libro', 'videogioco',
  'altro', 'oggetto-chiave', 'abito', 'dvd', 'cura', 'sp', 'battaglia', 'stato', 'esplorazione']);
function categoriaDelListino(categoria: string, sottocategoria: string | null): string {
  if (categoria === 'arma-da-fuoco') return 'arma';
  if (categoria === 'chiave') return 'oggetto-chiave';
  if (categoria === 'altro' && sottocategoria === 'abito') return 'abito';
  if (categoria === 'film' && sottocategoria === 'dvd') return 'dvd';
  if (categoria === 'consumabile' && sottocategoria && ['cura', 'sp', 'battaglia', 'stato', 'esplorazione'].includes(sottocategoria)) return sottocategoria;
  return CATEGORIE_ARTICOLO.has(categoria) ? categoria : 'altro';
}
function perDelCatalogo(statistiche: string | null): string | null {
  if (!statistiche) return null;
  try { const s = JSON.parse(statistiche) as { per?: unknown }; return typeof s.per === 'string' ? s.per : null; } catch { return null; }
}
/** Le offerte senza legame con le tre colonne, in ordine: devono restare identiche. */
const senzaLegame = (db: AppDatabase): string => db.prepare(`SELECT json_group_array(json_array(chiave, nome, categoria, per)) FROM
  (SELECT chiave, nome, categoria, per FROM main.articolo WHERE catalogo_chiave IS NULL ORDER BY chiave)`).pluck().get() as string;

interface Riga { chiave: string; nome: string; categoria: string; per: string | null; c_nome: string; c_categoria: string; c_sottocategoria: string | null; c_statistiche: string | null }

export const migration359: Migration = {
  id: 359,
  name: 'identita_delle_offerte_collegate',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['articolo', 'catalogo_oggetto', 'dati_guida'].every((t) => esisteTabella(db, t))) return;
    if (![...COLONNE, 'catalogo_chiave'].every((c) => haColonna(db, 'articolo', c))) return;
    const orfane = db.prepare('SELECT COUNT(*) FROM main.articolo a WHERE a.catalogo_chiave IS NOT NULL AND NOT EXISTS (SELECT 1 FROM main.catalogo_oggetto c WHERE c.chiave = a.catalogo_chiave)').pluck().get() as number;
    if (orfane > 0) errore(`${orfane} offerte citano un oggetto che non esiste`);
    const prima = improntaTabella(db, 'articolo', [...COLONNE]);
    const senzaLegamePrima = senzaLegame(db);

    const righe = db.prepare(`SELECT a.chiave, a.nome, a.categoria, a.per, c.nome AS c_nome, c.categoria AS c_categoria,
        c.sottocategoria AS c_sottocategoria, c.statistiche_json AS c_statistiche
      FROM main.articolo a JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave ORDER BY a.chiave`).all() as Riga[];

    // (1) l'archivio: i valori che cambiano, per colonna; le divergenze dall'oggetto si contano a parte
    const daArchiviare: Record<Colonna, Record<string, unknown>> = { nome: {}, categoria: {}, per: {} };
    const divergenze: Record<Colonna, string[]> = { nome: [], categoria: [], per: [] };
    for (const r of righe) {
      if (r.nome !== VUOTO.nome) daArchiviare.nome[r.chiave] = r.nome;
      if (r.categoria !== VUOTO.categoria) daArchiviare.categoria[r.chiave] = r.categoria;
      if (r.per !== VUOTO.per) daArchiviare.per[r.chiave] = r.per;
      if (r.nome !== '' && r.nome !== r.c_nome) divergenze.nome.push(r.chiave);
      if (r.categoria !== 'altro' && r.categoria !== categoriaDelListino(r.c_categoria, r.c_sottocategoria)) divergenze.categoria.push(r.chiave);
      if (r.per !== null && r.per !== perDelCatalogo(r.c_statistiche)) divergenze.per.push(r.chiave);
    }
    const cambiate = new Set(COLONNE.flatMap((c) => Object.keys(daArchiviare[c])));
    if (cambiate.size === 0) return;
    const nuove: Record<string, number> = {};
    for (const c of COLONNE) {
      nuove[c] = archiviaSenzaSovrascrivere(db, MIGRAZIONE, `articolo.${c}`, daArchiviare[c]);
      const salvate = righeArchiviate(db, `articolo.${c}`);
      if (!Object.keys(daArchiviare[c]).every((k) => k in salvate)) errore(`l’archivio di articolo.${c} non ha tutte le righe`);
    }

    // (2) le righe collegate: nome vuoto, categoria «altro», nessun destinatario
    const scrivi = db.prepare('UPDATE main.articolo SET nome = ?, categoria = ?, per = ? WHERE chiave = ? AND catalogo_chiave IS NOT NULL');
    for (const k of cambiate) if (scrivi.run(VUOTO.nome, VUOTO.categoria, VUOTO.per, k).changes !== 1) errore(`l’offerta ${k} non è stata scritta`);

    // (3) le prove: nessuna riga collegata con valori propri; il resto dell'offerta e le offerte senza legame identici
    const restano = db.prepare("SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave IS NOT NULL AND (nome <> '' OR categoria <> 'altro' OR per IS NOT NULL)").pluck().get() as number;
    if (restano !== 0) errore(`${restano} offerte collegate hanno ancora nome, categoria o destinatario propri`);
    if (improntaTabella(db, 'articolo', [...COLONNE]) !== prima) errore('l’offerta è cambiata fuori da nome, categoria e destinatario');
    if (senzaLegame(db) !== senzaLegamePrima) errore('un’offerta senza legame è cambiata');

    const dettagli = {
      collegate: righe.length, cambiate: cambiate.size,
      senzaLegame: db.prepare('SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave IS NULL').pluck().get() as number,
      archiviate: Object.fromEntries(COLONNE.map((c) => [c, Object.keys(daArchiviare[c]).length])), nuoveNellArchivio: nuove,
      divergenze: Object.fromEntries(COLONNE.map((c) => [c, { quante: divergenze[c].length, chiavi: divergenze[c] }])),
    };
    registraAudit(db, 'audit-l4-07-identita-offerte', { migrazione: MIGRAZIONE, ...dettagli });
    logger.info({ migrazione: 'L4-07-359', cambiate: cambiate.size, divergenze: Object.fromEntries(COLONNE.map((c) => [c, divergenze[c].length])) },
      'identità delle offerte collegate dal catalogo');
  },
};
