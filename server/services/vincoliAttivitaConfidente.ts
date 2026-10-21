import type { AppDatabase } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { campiAutonomiAttivitaConfidente } from '../../shared/attivitaConfidente.js';

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
export function storiaGenericaAttivita(db: AppDatabase, chiave: string): { leggibile: boolean; presente: boolean; tabelleAssenti: string[] } {
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

/** Controllo del RAW prima di qualunque normalizzatore: un effetto illeggibile non diventa una lista vuota. */
export function verificaCampiAttivitaConfidente(finale: Record<string, unknown>, prima: Record<string, unknown> | null = null): void {
  if (finale.confidente_chiave == null) return;
  const dotiStoriche = typeof prima?.confidente_chiave === 'string' && finale.doti_json === prima.doti_json;
  const campi = campiAutonomiAttivitaConfidente(finale, dotiStoriche);
  if (campi.length) throw httpErrors.conflict('attivita-confidente-conflitto', 'La fonte Confidente richiede di risolvere esplicitamente i campi autonomi indicati.', { campi });
}

/** Valida il record completo, già unito ai valori correnti, prima di commit/import/ripristino. */
export function verificaAttivitaConfidente(db: AppDatabase, finale: Record<string, unknown>, prima: Record<string, unknown> | null = null): void {
  if (finale.confidente_chiave == null) return;
  verificaCampiAttivitaConfidente(finale, prima);
  if (typeof finale.confidente_chiave !== 'string' || !colonne(db, 'main', 'confidente')?.includes('chiave') || !db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(finale.confidente_chiave)) {
    throw httpErrors.conflict('confidente-attivita-mancante', 'Il Confidente collegato non esiste: correggi il collegamento prima di salvare.', { confidente: finale.confidente_chiave });
  }
  if (finale.confidente_chiave !== prima?.confidente_chiave && typeof finale.chiave === 'string') {
    const storia = storiaGenericaAttivita(db, finale.chiave);
    if (!storia.leggibile || storia.presente) throw httpErrors.conflict('attivita-confidente-storia', 'Questa attività ha una storia generica, o una fotografia non leggibile: il collegamento non viene applicato.', { storiaLeggibile: storia.leggibile, storiaPresente: storia.presente });
  }
}

/** Preflight readonly dei collegamenti dichiarati dal file scelto; nessuna ricostruzione per nome. */
export function verificaCollegamentiAttivitaImportati(db: AppDatabase, attuale?: AppDatabase): void {
  const c = colonne(db, 'main', 'attivita');
  if (c === null) throw httpErrors.conflict('attivita-schema-non-valido', 'Il file non contiene una tabella attività riconoscibile.');
  if (!c.includes('confidente_chiave')) return;
  for (const r of db.prepare('SELECT * FROM main.attivita WHERE confidente_chiave IS NOT NULL').iterate() as Iterable<Record<string, unknown>>) {
    // Un RAW legacy già collegato è storico anche nel roundtrip; non si converte in premi.
    const prima = attuale ? attuale.prepare('SELECT * FROM main.attivita WHERE chiave=?').get(r.chiave) as Record<string, unknown> | undefined : r;
    // Il RAW storico è conservabile nel file esplicitamente collegato; il confronto con l'istanza
    // serve separatamente a non trasformare registrazioni generiche già presenti.
    verificaAttivitaConfidente(db, r, r);
    if (attuale && prima?.confidente_chiave !== r.confidente_chiave) {
      const storia = storiaGenericaAttivita(db, String(r.chiave));
      if (!storia.leggibile || storia.presente) throw httpErrors.conflict('attivita-confidente-storia', 'Il file collega al Confidente un’attività con una storia generica nell’istanza: nessun file viene sostituito.', { attivita: r.chiave });
    }
  }
}
