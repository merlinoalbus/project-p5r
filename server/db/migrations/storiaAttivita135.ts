// ============================================================
// Copia congelata della lettura della storia generica di un'attività (stato del 23/10/2026)
// ============================================================
//
// La migrazione 135 non importa i servizi vivi: questo modulo contiene le SOLE funzioni che usa, identiche a `storiaGenericaAttivita` e ai suoi aiuti
// in `server/services/vincoliAttivitaConfidente.ts` com'erano. Solo letture, su tutte le partite della stessa connessione.
// ============================================================

import type { AppDatabase } from '../dbService.js';

function colonne(db: AppDatabase, schema: string, tabella: string): string[] | null {
  const t = db.prepare(`SELECT type FROM "${schema}".sqlite_master WHERE name=?`).get(tabella) as { type: string } | undefined;
  if (!t) return [];
  if (t.type !== 'table') return null;
  return (db.prepare('SELECT name FROM pragma_table_info(?, ?)').all(tabella, schema) as Array<{ name: string }>).map(c => c.name);
}
const oggetto = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
function letturaStoricaRiconoscibile(x: unknown): x is Record<string, unknown> {
  return oggetto(x) && typeof x.categoria === 'string' && ['libro', 'film', 'videogioco'].includes(x.categoria)
    && typeof x.chiave === 'string' && x.chiave.length > 0 && typeof x.nome === 'string'
    && Number.isSafeInteger(x.prima) && Number(x.prima) >= 0 && Number.isSafeInteger(x.dopo) && Number(x.dopo) >= 0
    && (!Object.hasOwn(x, 'visione') || typeof x.visione === 'boolean')
    && (!Object.hasOwn(x, 'doti') || Array.isArray(x.doti) && x.doti.every(d => oggetto(d)
      && typeof d.chiave === 'string' && typeof d.nome === 'string' && Number.isSafeInteger(d.delta)));
}

/** Soltanto letture, su tutte le partite della stessa connessione. Tabelle assenti nei vecchi schemi sono esplicite;
 * una struttura parziale o una fotografia illeggibile non prova assenza di storia. */
export function storiaGenericaAttivita135(db: AppDatabase, chiave: string): { leggibile: boolean; presente: boolean; tabelleAssenti: string[] } {
  const assenti: string[] = [];
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  if (!schemi.some(s => s.name === 'utente')) return { leggibile: false, presente: false, tabelleAssenti: ['schema utente'] };
  let presente = false;
  for (const [tabella, campo, filtro] of [
    ['turno_partita', 'attivita_chiave', ''], ['attivita_svolta_partita', 'attivita_chiave', ''],
    ['effetto_lettura_partita', 'chiave', " AND tipo IN ('attivita','videogioco')"],
    ['progresso_videogioco_partita', 'videogioco_chiave', ''], ['sessione_videogioco_partita', 'videogioco_chiave', ''],
  ]) {
    const c = colonne(db, 'utente', tabella);
    if (c === null) return { leggibile: false, presente, tabelleAssenti: assenti };
    if (!c.length) { assenti.push(tabella); continue; }
    if (!c.includes(campo) || (filtro && !c.includes('tipo'))) return { leggibile: false, presente, tabelleAssenti: assenti };
    if (db.prepare(`SELECT 1 FROM utente."${tabella}" WHERE "${campo}" = ?${filtro} LIMIT 1`).get(chiave)) presente = true;
  }
  for (const tabella of ['spunta_voce_partita', 'azione_partita', 'azione_utente_partita']) {
    const c = colonne(db, 'utente', tabella);
    if (c === null) return { leggibile: false, presente, tabelleAssenti: assenti };
    if (!c.length) { assenti.push(tabella); continue; }
    if (!c.includes('effetti_json')) return { leggibile: false, presente, tabelleAssenti: assenti };
    for (const r of db.prepare(`SELECT effetti_json FROM utente."${tabella}" WHERE effetti_json IS NOT NULL`).iterate() as Iterable<{ effetti_json: unknown }>) {
      let x: unknown;
      try { if (typeof r.effetti_json !== 'string') throw new Error(); x = JSON.parse(r.effetti_json) as unknown; }
      catch { return { leggibile: false, presente, tabelleAssenti: assenti }; }
      if (!oggetto(x)) return { leggibile: false, presente, tabelleAssenti: assenti };
      if ('turni' in x && !Array.isArray(x.turni)) return { leggibile: false, presente, tabelleAssenti: assenti };
      if (Array.isArray(x.turni) && x.turni.some(t => !oggetto(t) || typeof t.attivita !== 'string')) return { leggibile: false, presente, tabelleAssenti: assenti };
      if (Array.isArray(x.turni) && x.turni.some(t => oggetto(t) && t.attivita === chiave)) presente = true;
      if ('letture' in x && (!Array.isArray(x.letture) || x.letture.some(l => !letturaStoricaRiconoscibile(l)))) return { leggibile: false, presente, tabelleAssenti: assenti };
      if (Array.isArray(x.letture) && x.letture.some(l => oggetto(l) && l.categoria === 'videogioco' && l.chiave === chiave)) presente = true;
    }
  }
  return { leggibile: true, presente, tabelleAssenti: assenti };
}
