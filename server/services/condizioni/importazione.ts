// Compatibilità dei backup locali: solo durante l'importazione esplicita, dopo le migrazioni storiche.
// Non è una migrazione di avvio: condizioni già correnti e dati della partita non vengono riscritti.
import type { AppDatabase } from '../../db/dbService.js';
import { normalizzaRequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { httpErrors } from '../../utils/httpError.js';

/** Converte i soli nodi legacy `manuale`, usando il normalizzatore del vocabolario. Gli altri campi restano identici.
 * La lista contiene riferimenti alle righe, mai il contenuto delle note. Un nodo non convertibile ferma l'importazione,
 * invece di scartare una condizione che l'utente voleva preservare. */
export function convertiManualiImportati(valore: unknown, origine: string, conversioni: string[], profondita = 0): unknown {
  if (profondita > 100) throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `Condizioni troppo annidate in ${origine}: nessuna condizione è stata scartata.`);
  if (Array.isArray(valore)) return valore.map((c, i) => convertiManualiImportati(c, `${origine}[${i}]`, conversioni, profondita + 1));
  if (!valore || typeof valore !== 'object') return valore;
  const c = valore as Record<string, unknown>;
  if (c.tipo === 'manuale') {
    const nuova = normalizzaRequisitoSpillo(c);
    if (!nuova) throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `L'avviso di ${origine} non ha un testo valido: nessuna condizione è stata scartata.`);
    conversioni.push(`${origine}: manuale → avviso`);
    return nuova;
  }
  if (c.tipo === 'gruppo') return { ...c, condizioni: convertiManualiImportati(c.condizioni, `${origine}.condizioni`, conversioni, profondita + 1) };
  if (c.tipo === 'non') return { ...c, condizione: convertiManualiImportati(c.condizione, `${origine}.condizione`, conversioni, profondita + 1) };
  return valore;
}

/** Le sole tabelle di dati di gioco che contengono elenchi di condizioni; i nomi sono costanti dell'app, non input SQL. */
const TABELLE_CONDIZIONI = ['quartiere', 'luogo', 'negozio', 'articolo', 'attivita', 'libro', 'film', 'spillo', 'copia_pezzo', 'confidente_invito'] as const;

/** Il catalogo conserva nel proprio snapshot i campi di riga (compreso `condizioni_json`). Si recupera anche questa copia,
 * altrimenti «Ripristina» reintrodurrebbe il formato vecchio. Descrizioni, orari e tutti gli altri campi non si interpretano. */
function convertiSnapshotCatalogo(valore: unknown, origine: string, conversioni: string[]): unknown {
  if (!valore || typeof valore !== 'object' || Array.isArray(valore)) return valore;
  const snapshot = valore as Record<string, unknown>;
  const risultato = { ...snapshot };
  for (const campo of ['condizioni_json', 'sblocco_json']) {
    const json = snapshot[campo];
    if (typeof json !== 'string' || !json.includes('"manuale"')) continue;
    let condizioni: unknown;
    try { condizioni = JSON.parse(json); }
    catch { throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `Condizioni illeggibili nello snapshot ${origine}: importazione interrotta.`); }
    const n = conversioni.length;
    const dopo = convertiManualiImportati(condizioni, `${origine}.${campo}`, conversioni);
    if (conversioni.length > n) risultato[campo] = JSON.stringify(dopo);
  }
  return risultato;
}

/** Aggiorna i soli vecchi `manuale` rimasti dopo le migrazioni. La migrazione 090 mantiene quindi la precedenza per i fatti che
 * conosce (caffè al Leblanc, ecc.): non li si declassa ad avvisi. Tutto il recupero è atomico e nel ripristino protetto dell'import. */
export function convertiCondizioniDatabaseImportato(db: AppDatabase): string[] {
  const conversioni: string[] = [];
  const tabelle = new Set((db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  return db.transaction(() => {
    for (const tabella of TABELLE_CONDIZIONI) {
      if (!tabelle.has(tabella)) continue;
      const colonne = db.prepare(`PRAGMA main.table_info("${tabella}")`).all() as Array<{ name: string }>;
      for (const colonna of ['condizioni_json', 'sblocco_json', 'condizioni_guida_json', 'seed_json'] as const) {
        if (!colonne.some((c) => c.name === colonna)) continue;
        const righe = db.prepare(`SELECT rowid AS id, "${colonna}" AS json FROM main."${tabella}" WHERE "${colonna}" IS NOT NULL`).all() as Array<{ id: number; json: string }>;
        const scrivi = db.prepare(`UPDATE main."${tabella}" SET "${colonna}" = ? WHERE rowid = ?`);
        for (const r of righe) {
          if (!r.json.includes('manuale')) continue;
          const origine = `${tabella} #${r.id}.${colonna}`;
          let prima: unknown;
          try { prima = JSON.parse(r.json); }
          catch { throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `Dati illeggibili in ${origine}: importazione interrotta, nessuna condizione scartata.`); }
          const n = conversioni.length;
          const dopo = colonna === 'seed_json' ? convertiSnapshotCatalogo(prima, origine, conversioni) : convertiManualiImportati(prima, origine, conversioni);
          if (conversioni.length > n) scrivi.run(JSON.stringify(dopo), r.id);
        }
      }
    }
    for (const tabella of ['confidente_requisito', 'confidente_requisito_guida'] as const) {
      if (!tabelle.has(tabella)) continue;
      const righe = db.prepare(`SELECT confidente_chiave, rango, indice, tipo, dati_json, testo FROM main."${tabella}"`).all() as Array<{ confidente_chiave: string; rango: number; indice: number; tipo: string; dati_json: string; testo: string }>;
      const scrivi = db.prepare(`UPDATE main."${tabella}" SET tipo = ?, dati_json = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ?`);
      for (const r of righe) {
        if (r.tipo !== 'manuale' && !r.dati_json.includes('"manuale"')) continue;
        const origine = `${tabella} ${r.confidente_chiave}, rango ${r.rango}, requisito ${r.indice}`;
        let dati: Record<string, unknown>;
        try {
          const valore: unknown = JSON.parse(r.dati_json);
          if (!valore || typeof valore !== 'object' || Array.isArray(valore)) throw new Error('Dati non strutturati');
          dati = valore as Record<string, unknown>;
        } catch { throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `Dati illeggibili in ${origine}: importazione interrotta, nessuna condizione scartata.`); }
        const n = conversioni.length;
        const dopo = convertiManualiImportati({ ...dati, tipo: r.tipo, ...(r.tipo === 'manuale' ? { testo: typeof dati.testo === 'string' && dati.testo.trim() ? dati.testo : r.testo } : {}) }, origine, conversioni) as Record<string, unknown>;
        if (conversioni.length > n) {
          const { tipo, ...campi } = dopo;
          scrivi.run(tipo, JSON.stringify(campi), r.confidente_chiave, r.rango, r.indice);
        }
      }
    }
    return conversioni;
  })();
}
