// Stato pertinente della fonte, distinto dal testo della rettifica proposta.
// Si usa anche in 121: nessuna cache applicativa e nessun accesso alle partite.
import type { AppDatabase } from '../db/dbService.js';
import { isDeepStrictEqual } from 'node:util';
import { httpErrors } from '../utils/httpError.js';

type Riga = Record<string, unknown>;
export interface ChiaveProposta { riga_tipo: string; riga_chiave: string; gruppo: string; catalogo_chiave: string | null; fonte_snapshot_json: string | null }
const record = (v: unknown): Riga => v && typeof v === 'object' && !Array.isArray(v) ? v as Riga : {};
const elenco = (v: unknown): Riga[] => Array.isArray(v) ? v.map(record) : [];
const scegli = (r: Riga | undefined, campi: string[]) => r ? Object.fromEntries(campi.map((c) => [c, r[c] ?? null])) : null;
function parse(v: unknown): unknown {
  if (typeof v !== 'string') return null;
  try { return JSON.parse(v) as unknown; } catch { return { jsonIlleggibile: v }; }
}
function separa(k: string): [string, string] { const i = k.indexOf('/'); return [k.slice(0, i), k.slice(i + 1)]; }

export function snapshotFonteProposta(db: AppDatabase, p: Pick<ChiaveProposta, 'riga_tipo' | 'riga_chiave'>, versione: 1 | 2 = 1): unknown {
  const uno = (sql: string, ...valori: unknown[]) => db.prepare(sql).get(...valori) as Riga | undefined;
  const legami = (sql: string, ...valori: unknown[]) => db.prepare(sql).all(...valori) as Riga[];
  const guida = (chiave: string) => record(parse(uno('SELECT json FROM dati_guida WHERE chiave = ?', chiave)?.json));
  const ricetta = (chiave: string) => elenco(record(guida('oggetti-guida').fabbricazione).ricette).find((r) => r.attrezzo === chiave);
  const articolo = (chiave: string) => {
    const r = uno('SELECT * FROM articolo WHERE chiave = ?', chiave);
    const base = scegli(r, ['nome', 'categoria', 'catalogo_chiave', 'prezzo', 'costo_json', 'condizioni_json', 'nascosto', 'negozio_chiave', 'articolo_condiviso']);
    if (!r || versione === 1) return base;
    // Solo le nuove proposte 126 adottano questo contratto; assente e null restano distinti.
    return { ...base, ...Object.fromEntries(['origine', 'seed_json', 'condizione', 'fonte'].map((c) =>
      [c, Object.hasOwn(r, c) ? r[c] : { campoAssente: true }])) };
  };
  let fonte: unknown; let collegamenti: unknown = [];
  if (p.riga_tipo === 'articolo') {
    fonte = articolo(p.riga_chiave);
    collegamenti = legami("SELECT catalogo_chiave,quantita FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ? ORDER BY catalogo_chiave", p.riga_chiave);
  } else if (p.riga_tipo === 'regalo') {
    const [confidente, ordine] = separa(p.riga_chiave);
    fonte = scegli(uno('SELECT * FROM confidente_regalo WHERE confidente_chiave = ? AND ordine = ?', confidente, Number(ordine)), ['nome', 'costo', 'catalogo_chiave']);
  } else if (p.riga_tipo === 'voce') {
    const v = uno('SELECT * FROM punto_interesse WHERE chiave = ?', p.riga_chiave);
    const dettagli = record(parse(v?.dettagli_json));
    fonte = v ? { nome: v.nome, tipo: v.tipo, contenuto: dettagli.contenuto ?? null,
      ...(versione === 2 ? { ricompensa: dettagli.ricompensa ?? null, bottino_oggetto: dettagli.bottino_oggetto ?? null } : {}) } : null;
    collegamenti = legami('SELECT catalogo_chiave,quantita FROM voce_oggetto WHERE voce_chiave = ? ORDER BY catalogo_chiave', p.riga_chiave);
  } else if (p.riga_tipo === 'ricetta') {
    fonte = scegli(ricetta(p.riga_chiave), ['attrezzo', 'materiali']);
    collegamenti = legami('SELECT catalogo_chiave,quantita FROM ricetta_materiale WHERE ricetta = ? ORDER BY catalogo_chiave', p.riga_chiave);
  } else if (p.riga_tipo === 'catalogo') {
    fonte = scegli(uno('SELECT * FROM catalogo_oggetto WHERE chiave = ?', p.riga_chiave), ['categoria', 'sottocategoria', 'statistiche_json', 'fonte_tipo', 'fonte_chiave', 'nascosto']);
  } else if (p.riga_tipo === 'ricompensa') {
    const [tipo, chiave] = separa(p.riga_chiave);
    if (tipo === 'articolo') fonte = articolo(chiave);
    else if (tipo === 'ricetta') fonte = scegli(ricetta(chiave), ['attrezzo', 'quantita', 'resa', 'prodotti']);
    else if (tipo === 'richiesta') fonte = scegli(uno('SELECT * FROM richiesta WHERE chiave = ?', chiave), ['ricompense_json']);
    else if (tipo === 'domanda') fonte = scegli(uno('SELECT * FROM domanda WHERE chiave = ?', chiave), ['ricompensa']);
    else if (tipo === 'esame') fonte = scegli(uno('SELECT * FROM esame WHERE chiave = ?', chiave), ['chiave']);
    else if (tipo === 'confidente') fonte = scegli(uno('SELECT * FROM confidente WHERE chiave = ?', chiave), ['chiave']);
    else if (tipo === 'covo') fonte = scegli(elenco(record(guida('completamento').covo).premi).find((r) => r.nome === chiave), ['nome', 'sblocco', 'effetto']);
    else if (tipo === 'sfida') {
      const g = guida('sfide');
      fonte = scegli([...elenco(record(g.battaglieSfida).elenco), ...elenco(g.bossSegreti)].find((r) => r.chiave === chiave), ['ricompense']);
    } else throw new Error(`Fonte proposta non supportata: ${tipo}`);
    collegamenti = legami('SELECT catalogo_chiave,quantita FROM ricompensa_oggetto WHERE fonte_tipo = ? AND fonte_chiave = ? ORDER BY catalogo_chiave', tipo, chiave);
  } else throw new Error(`Tipo proposta non supportato: ${p.riga_tipo}`);
  return { versione, fonte, collegamenti };
}

function versioneSnapshot(p: ChiaveProposta): 1 | 2 | null {
  const v = record(parse(p.fonte_snapshot_json)).versione;
  return v === 1 || v === 2 ? v : null;
}
/** Il refresh segue il contratto già scelto dalla singola proposta, mai quello dell'ultimo fratello. */
export function snapshotConVersioneSalvata(db: AppDatabase, p: ChiaveProposta): unknown {
  const versione = versioneSnapshot(p);
  if (versione === null) throw new Error('Snapshot della proposta privo di una versione riconosciuta.');
  return snapshotFonteProposta(db, p, versione);
}

/**
 * Uno snapshot salvato prima di L11 (R11-02/10) porta nella fonte la copia `nome_it`, che la colonna tolta non ha più: non è un cambiamento della
 * fonte. Si toglie dal solo confronto (lo snapshot salvato resta com'è), così una proposta ancora da approvare non diventa «cambiata».
 */
function senzaNomeIt(salvato: unknown): unknown {
  const s = record(salvato), fonte = record(s.fonte);
  if (!('nome_it' in fonte)) return salvato;
  const { nome_it: _tolto, ...resto } = fonte;
  return { ...s, fonte: resto };
}

export function snapshotPropostaCoincide(db: AppDatabase, p: ChiaveProposta): boolean {
  const salvato = senzaNomeIt(parse(p.fonte_snapshot_json));
  return versioneSnapshot(p) !== null && !record(salvato).invalida
    && isDeepStrictEqual(salvato, snapshotConVersioneSalvata(db, p));
}
export function verificaSnapshotProposta(db: AppDatabase, p: ChiaveProposta): void {
  if (!snapshotPropostaCoincide(db, p)) throw httpErrors.conflict('fonte-cambiata-dopo-proposta',
    'La fonte o i suoi collegamenti sono cambiati dopo la proposta, oppure lo snapshot non è disponibile. Nessun dato è stato sovrascritto. Puoi scartare la proposta e correggere esplicitamente i collegamenti dalla fonte.');
}
export function salvaSnapshotProposta(db: AppDatabase, p: ChiaveProposta, snapshot: unknown): void {
  db.prepare('UPDATE proposta_abbinamento SET fonte_snapshot_json = ? WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS ?')
    .run(JSON.stringify(snapshot), p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
}
export function catturaSnapshotProposte121(db: AppDatabase): void {
  // Le nuove proposte da campi strutturati hanno già una v2: non degradarla a v1.
  for (const p of db.prepare('SELECT * FROM proposta_abbinamento WHERE fonte_snapshot_json IS NULL').all() as ChiaveProposta[]) salvaSnapshotProposta(db, p, snapshotFonteProposta(db, p, 1));
}
/** Solo i fratelli ancora validi prima del gesto possono seguire la modifica appena confermata. */
export function fratelliValidi(db: AppDatabase, p: ChiaveProposta): ChiaveProposta[] {
  return (db.prepare("SELECT * FROM proposta_abbinamento WHERE riga_tipo = ? AND riga_chiave = ? AND stato = 'da-approvare'")
    .all(p.riga_tipo, p.riga_chiave) as ChiaveProposta[]).filter((r) => snapshotPropostaCoincide(db, r));
}

/** La fusione non approva una vecchia proposta: se cambia la sua fonte la invalida esplicitamente. */
export function fontiPropostePrimaDellaFusione(db: AppDatabase): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const p of db.prepare("SELECT * FROM proposta_abbinamento WHERE stato = 'da-approvare'").all() as ChiaveProposta[]) {
    const versione = versioneSnapshot(p);
    if (versione !== null) out.set(JSON.stringify([p.riga_tipo, p.riga_chiave, versione]), snapshotFonteProposta(db, p, versione));
  }
  return out;
}
export function invalidaSnapshotDopoFusione(db: AppDatabase, prima: ReadonlyMap<string, unknown>): void {
  for (const p of db.prepare("SELECT * FROM proposta_abbinamento WHERE stato = 'da-approvare'").all() as ChiaveProposta[]) {
    const versione = versioneSnapshot(p);
    if (versione !== null && !isDeepStrictEqual(prima.get(JSON.stringify([p.riga_tipo, p.riga_chiave, versione])), snapshotFonteProposta(db, p, versione))) salvaSnapshotProposta(db, p, {
      versione, invalida: 'La fonte o i suoi collegamenti non coincidono più dopo una fusione. Verificare i dati attuali e correggere i legami come gesto manuale.',
      precedente: parse(p.fonte_snapshot_json),
    });
  }
}
