// ============================================================
// tanakaStatoListino — lo stato del listino di Tanaka e del registro delle decisioni in un file di gioco (L7-TANAKA-IMPORT)
// ============================================================
//
// Puro: lavora su qualunque connessione (l'istanza, un pacchetto aperto in sola lettura per l'anteprima dell'importazione, la copia da
// esportare) e non scrive niente. Serve a import, export e ripristino dell'istanza: il registro delle decisioni (migrazione 141) e le note
// storiche (139) stanno in gioco.db e viaggiano col file; qui si controlla che arrivino integri e si dice che listino portano.
//   - `precedente`: attive le 20 offerte correnti di prima; `royal`: attive le 18 Royal coi prezzi del manifesto; `misto`: altro (anche
//     un listino mezzo pre e mezzo post decisione); `assente`: il negozio non c'è.
//   - Registro integro: fotografie leggibili, versione 1, al più una decisione attiva, ogni ripristino di una decisione che c'è.
// ============================================================

import type Database from 'better-sqlite3';
import manifest from '../../shared/tanakaConfronto.json' with { type: 'json' };
import type { StatoTanakaFileDto } from '../../shared/tanakaDecisione.js';

const haTabella = (db: Database.Database, schema: string, nome: string): boolean =>
  !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
/** Vero se il testo è un JSON con un oggetto `offerte`. */
const fotografiaLeggibile = (raw: unknown): boolean => {
  if (typeof raw !== 'string') return false;
  try { const v = JSON.parse(raw) as { offerte?: unknown }; return !!v && typeof v.offerte === 'object' && v.offerte !== null; } catch { return false; }
};

/** Lo stato del listino di Tanaka e del registro delle decisioni nel file aperto su `db` (schema `schema`). */
export function statoTanakaDi(db: Database.Database, schema = 'main'): StatoTanakaFileDto {
  const problemi: string[] = [];
  let listino: StatoTanakaFileDto['listino'] = 'assente';
  if (haTabella(db, schema, 'negozio') && haTabella(db, schema, 'articolo') && db.prepare(`SELECT 1 FROM ${schema}.negozio WHERE chiave = ?`).get(manifest.negozio)) {
    const attive = db.prepare(`SELECT chiave, prezzo FROM ${schema}.articolo WHERE negozio_chiave = ? AND nascosto = 0 ORDER BY chiave`).all(manifest.negozio) as Array<{ chiave: string; prezzo: number | null }>;
    const chiavi = attive.map((a) => a.chiave).join('\n');
    const royal = new Map(manifest.royal.map((r) => [r.chiave, r.prezzo]));
    if (chiavi === [...manifest.chiaviCorrenti].sort().join('\n')) listino = 'precedente';
    else if (chiavi === [...royal.keys()].sort().join('\n') && attive.every((a) => a.prezzo === royal.get(a.chiave))) listino = 'royal';
    else listino = 'misto';
  }
  let decisioni = 0;
  let attiva: string | null = null;
  const registro = haTabella(db, schema, 'decisione_tanaka');
  if (registro) {
    const righe = db.prepare(`SELECT operazione_id, versione, prima_json, dopo_json FROM ${schema}.decisione_tanaka`).all() as Array<{ operazione_id: string; versione: number; prima_json: string; dopo_json: string }>;
    const ripristinate = new Set((haTabella(db, schema, 'decisione_tanaka_ripristino')
      ? db.prepare(`SELECT decisione_id FROM ${schema}.decisione_tanaka_ripristino`).all() as Array<{ decisione_id: string }> : []).map((r) => r.decisione_id));
    decisioni = righe.length;
    for (const r of righe) {
      if (r.versione !== 1) problemi.push(`Decisione ${r.operazione_id}: versione ${r.versione} non riconosciuta.`);
      if (!fotografiaLeggibile(r.prima_json) || !fotografiaLeggibile(r.dopo_json)) problemi.push(`Decisione ${r.operazione_id}: fotografia illeggibile.`);
    }
    for (const id of ripristinate) if (!righe.some((r) => r.operazione_id === id)) problemi.push(`Ripristino di una decisione assente (${id}).`);
    const attive = righe.filter((r) => !ripristinate.has(r.operazione_id));
    if (attive.length > 1) problemi.push(`${attive.length} decisioni risultano attive insieme: ne può essere attiva una sola.`);
    attiva = attive[0]?.operazione_id ?? null;
    if (attiva && listino !== 'royal') problemi.push('La decisione risulta attiva ma il listino non è quello Royal: verifica le correzioni fatte dopo (il ripristino unitario non sarà possibile).');
  }
  const note = haTabella(db, schema, 'nota_storica') ? (db.prepare(`SELECT COUNT(*) AS n FROM ${schema}.nota_storica`).get() as { n: number }).n : 0;
  // solo i problemi strutturali rendono il registro non integro; un listino corretto a mano dopo la decisione è un avviso
  const strutturali = problemi.filter((p) => !p.startsWith('La decisione risulta attiva'));
  return { registro, decisioni, attiva, listino, noteStoriche: note, registroIntegro: strutturali.length === 0, problemi };
}

/** Gli avvisi da mostrare prima di sostituire il file di gioco: che cosa cambia per il listino di Tanaka e il suo registro. */
export function avvisiImportazioneTanaka(istanza: StatoTanakaFileDto, pacchetto: StatoTanakaFileDto): string[] {
  const avvisi: string[] = [];
  if (istanza.attiva && pacchetto.attiva !== istanza.attiva) avvisi.push(`L’istanza ha la decisione Tanaka ${istanza.attiva} applicata; il pacchetto ${pacchetto.attiva ? `ne porta un’altra (${pacchetto.attiva})` : 'non la porta'}: il listino diventa quello del pacchetto (${pacchetto.listino}).`);
  if (pacchetto.listino === 'misto') avvisi.push('Il pacchetto porta un listino di Tanaka misto (né le 20 offerte di prima né le 18 Royal).');
  if (!pacchetto.registroIntegro) avvisi.push(`Il registro delle decisioni Tanaka del pacchetto non è integro: ${pacchetto.problemi.join(' ')}`);
  if (istanza.noteStoriche > 0 && pacchetto.noteStoriche === 0) avvisi.push('Il pacchetto non porta le note storiche della fonte (Homunculus, G-034): se ha uno schema precedente alla 139 l’importazione le ricrea al valore della guida, altrimenti restano assenti.');
  // gli acquisti delle partite non cambiano: la spesa storica è congelata (utente 030) e partite.db non viene sostituito
  return avvisi;
}
