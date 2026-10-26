// ============================================================
// Strumenti comuni del lotto C dell'ondata 5 (migrazioni 250-253): unioni delle identità doppie del catalogo
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026): «unioni delle identità doppie su elenco scritto con cestino reversibile». Ogni unione usa
// il gesto congelato della fusione (`fondiOggetti144`, copia della fusione del catalogo, reversibile dal Cestino) e, dentro la stessa
// registrazione del Cestino, due ritocchi che la fusione dell'app non fa:
//   - i **nomi alternativi**: la fusione aggiungerebbe come alias il nome dell'identità tolta così com'è, anche quando è una nota di lavoro
//     («Bagno di rose (traduzione non ufficiale, EN: Bath of Roses)»), e la scheda dell'oggetto li mostra sotto «Altri nomi». Qui gli alias
//     sono scritti nell'elenco, uno per uno (solo nomi veri: il nome italiano diverso o quello inglese), e si aggiungono a quelli che la
//     destinazione aveva già;
//   - le statistiche dell'equipaggiamento scritte nell'elenco (`statistiche`), quando l'identità tolta le aveva e quella che resta no;
//   - i ritocchi propri di un'unione (`dopo`), per esempio la categoria del Braccialetto.
// Ripristinare dal Cestino rimette tutto com'era, ritocchi compresi. Subito dopo, nello stesso punto di salvataggio ma FUORI dal registro
// del Cestino, le **proposte «da completare» aperte** (`proposta_conversione_voce`) che citano l'identità tolta si sostituiscono: sono
// append-only (trigger della 236/237: una proposta non si modifica, se ne inserisce un'altra e si scarta la prima, e una proposta decisa
// non si riapre), quindi un ripristino dal Cestino non potrebbe rimetterle; la proposta nuova cita la destinazione, che resta comunque.
//
// Guardie (un'unione che non le passa resta com'è, scritta nel log e nell'audit, e le altre proseguono):
//   - le partite (`utente`) non si toccano mai: se una riga delle partite cita l'identità da togliere, l'unione non si fa; per le righe
//     composte dei regali (che si rinominano) conta anche la consegna salvata per nome in `regalo_partita`, senza chiave del catalogo;
//   - il Diario non si tocca: se una voce (`voce_giornata`, `voce_effetto`) cita l'identità da togliere, l'unione non si fa (vale anche,
//     a maggior ragione, per il periodo validato 04-01→05-31);
//   - identità già tolta (seconda esecuzione) o destinazione assente: niente da fare.
// Non importa niente da `server/services/` (come le altre migrazioni dopo la verifica del 23/10).
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { fondiOggetti144 } from './abbinamentiCatalogo144.js';
import { conCestino144 } from './cestinoRegistro144.js';
import { normalizzaNomeOggetto } from '../../../shared/catalogo.js';

export interface UnioneIdentita {
  /** L'identità che si toglie (finisce nel Cestino). */
  da: string;
  /** L'identità che resta. */
  a: string;
  /** I nomi alternativi da aggiungere alla destinazione (solo nomi veri). */
  alias: readonly string[];
  /** Perché sono lo stesso oggetto (va nell'audit). */
  perche: string;
  /**
   * Le statistiche dell'equipaggiamento da conservare sulla scheda che resta, scritte qui una per una dalla pagina della guida (solo se la
   * scheda che resta non ne ha): senza, la fusione le perderebbe insieme all'identità tolta. Dentro la registrazione del Cestino.
   */
  statistiche?: { per: string | null; testo: string | null };
  /**
   * Le correzioni del motivo delle proposte «da completare» che citano l'identità tolta: [testo che diventa falso, testo nuovo]. Si applicano
   * solo se il testo c'è parola per parola; se il motivo cita ancora l'identità tolta, si aggiunge la frase generica dell'unione.
   */
  motivi?: ReadonlyArray<readonly [string, string]>;
}

export interface EsitoUnione {
  da: string;
  a: string;
  esito: 'unita' | 'gia-unita' | 'ferma';
  motivo?: string;
  /** Com'era l'identità tolta, tutte le colonne (statistiche, fonte, nomi alternativi compresi): resta anche nel Cestino. */
  tolta?: Riga;
  /** Com'erano le statistiche della scheda che resta, se `statistiche` le ha scritte. */
  statisticheScritte?: { prima: unknown; dopo: { per: string | null; testo: string | null } };
  /** Le proposte «da completare» sostituite (la vecchia scartata, la nuova aperta con la chiave che resta). */
  proposteAggiornate?: Array<{ vecchia: string; nuova: string }>;
}

type Riga = Record<string, unknown>;
const adesso = (): string => new Date().toISOString();

const tabelle = (db: AppDatabase, schema: 'main' | 'utente'): string[] =>
  (db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
const colonneTesto = (db: AppDatabase, schema: 'main' | 'utente', tabella: string): string[] =>
  (db.prepare('SELECT name, type FROM pragma_table_info(?, ?)').all(tabella, schema) as Array<{ name: string; type: string }>)
    .filter((c) => !/BLOB/i.test(c.type)).map((c) => c.name);

/** Vero se lo schema delle partite è attaccato. */
export function conPartite(db: AppDatabase): boolean {
  return (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
}

/** Le righe delle partite che citano la chiave (uguale, o dentro un testo/JSON), per tabella e colonna. Sola lettura. */
export function partiteCheCitano(db: AppDatabase, chiave: string): string[] {
  if (!conPartite(db)) return [];
  const trovate: string[] = [];
  for (const t of tabelle(db, 'utente')) {
    if (t === 'cestino_partite') continue;
    for (const c of colonneTesto(db, 'utente', t)) {
      const n = db.prepare(`SELECT COUNT(*) FROM utente."${t}" WHERE "${c}" = ? OR instr(CAST("${c}" AS TEXT), ?) > 0`).pluck().get(chiave, `"${chiave}"`) as number;
      if (n) trovate.push(`${t}.${c}: ${n}`);
    }
  }
  return trovate;
}

/** Le voci del Diario che citano la chiave (nel collegamento, nel testo dei dati o negli effetti). Sola lettura. */
export function vociCheCitano(db: AppDatabase, chiave: string): string[] {
  const trovate: string[] = [];
  for (const t of ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) {
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t)) continue;
    for (const c of colonneTesto(db, 'main', t)) {
      const n = db.prepare(`SELECT COUNT(*) FROM main."${t}" WHERE "${c}" = ? OR instr(CAST("${c}" AS TEXT), ?) > 0`).pluck().get(chiave, `"${chiave}"`) as number;
      if (n) trovate.push(`${t}.${c}: ${n}`);
    }
  }
  return trovate;
}

function nomiAltri(json: unknown): string[] {
  if (typeof json !== 'string') return [];
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : []; } catch { return []; }
}

/** Gli alias della destinazione: quelli che aveva, più quelli dell'elenco; senza ripetizioni e senza il nome stesso. */
function aliasUniti(nome: string, prima: readonly string[], nuovi: readonly string[]): string[] {
  const visti = new Map<string, string>();
  for (const n of [...prima, ...nuovi]) {
    const k = normalizzaNomeOggetto(n);
    if (n.trim() && k !== normalizzaNomeOggetto(nome) && !visti.has(k)) visti.set(k, n.trim());
  }
  return [...visti.values()];
}

/** Vero se il testo cita la chiave intera (non come pezzo di una chiave più lunga, per esempio «…-salvezza» dentro «…-salvezza-2»). */
export function citaChiave(testo: string, chiave: string): boolean {
  let da = 0;
  for (;;) {
    const i = testo.indexOf(chiave, da);
    if (i < 0) return false;
    const prima = i > 0 ? testo[i - 1]! : ' ';
    const dopo = i + chiave.length < testo.length ? testo[i + chiave.length]! : ' ';
    if (!/[a-z0-9/-]/i.test(prima) && !/[a-z0-9-]/i.test(dopo)) return true;
    da = i + 1;
  }
}

/**
 * Le proposte «da completare» aperte che citano `da`, negli effetti o nel motivo. Il contenuto di una proposta non si modifica (trigger
 * della 236: «se ne inserisce una nuova»): se ne inserisce una con la chiave `a` (con una sola scelta rimasta, l'oggetto è quello e resta
 * da completare solo la quantità) e con il motivo corretto (`correzioni`: il testo che l'unione rende falso, per esempio «il catalogo ha
 * due oggetti…», l'utente lo legge quando decide), e la vecchia si chiude come «scartata», con l'esito che dice da quale è sostituita.
 * Fuori dal registro del Cestino: le proposte decise non si riaprono, quindi un ripristino della fusione non le rimette; la proposta nuova
 * cita comunque un oggetto che esiste.
 */
function sostituisciProposteConversione(db: AppDatabase, da: string, a: string, nomeA: string, correzioni: ReadonlyArray<readonly [string, string]>): Array<{ vecchia: string; nuova: string }> {
  if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'proposta_conversione_voce'").get()) return [];
  const righe = (db.prepare("SELECT * FROM main.proposta_conversione_voce WHERE stato = 'aperta' AND (instr(effetti_json, ?) > 0 OR instr(motivo, ?) > 0) ORDER BY id")
    .all(`"${da}"`, da) as Array<{ id: string; voce_uid: string; lotto: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null;
      effetti_json: string; togli_json: string; motivo: string; certezza: string }>)
    .filter((r) => r.effetti_json.includes(`"${da}"`) || citaChiave(r.motivo, da));
  const cambiate: Array<{ vecchia: string; nuova: string }> = [];
  for (const r of righe) {
    const effetti = JSON.parse(r.effetti_json) as unknown;
    if (!Array.isArray(effetti)) throw new Error(`la proposta ${r.id} non ha un elenco di effetti leggibile`);
    let cambiato = false;
    const nuovi = effetti.map((voce: unknown) => {
      if (!voce || typeof voce !== 'object' || Array.isArray(voce)) return voce;
      const v = { ...(voce as Riga) };
      const effetto = v.effetto && typeof v.effetto === 'object' && !Array.isArray(v.effetto) ? { ...(v.effetto as Riga) } : null;
      if (effetto && effetto.tipo === 'oggetto' && effetto.oggetto === da) { effetto.oggetto = a; v.effetto = effetto; cambiato = true; }
      if (Array.isArray(v.scelte) && v.scelte.includes(da)) {
        const scelte = [...new Set((v.scelte as unknown[]).map((s) => (s === da ? a : s)))];
        cambiato = true;
        if (scelte.length === 1 && effetto && effetto.tipo === 'oggetto' && Array.isArray(v.completa)) {
          effetto.oggetto = a; v.effetto = effetto; v.scelte = null;
          v.completa = (v.completa as unknown[]).filter((c) => c !== 'elemento');
        } else v.scelte = scelte;
      }
      return v;
    });
    let motivo = r.motivo;
    for (const [vecchio, nuovo] of correzioni) if (motivo.includes(vecchio)) motivo = motivo.split(vecchio).join(nuovo);
    if (citaChiave(motivo, da)) motivo = `${motivo.trimEnd()} Unione delle identità doppie (ondata 5, decisione 21): «${da}» e «${a}» sono ora un solo oggetto, «${nomeA}».`;
    if (!cambiato && motivo === r.motivo) continue;
    const nuova = `${r.id}-unita`;
    if (nuova.length > 120) throw new Error(`la proposta ${r.id} ha un identificativo troppo lungo per la sostituta`);
    if (db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(nuova)) throw new Error(`la proposta sostituta ${nuova} esiste già`);
    const ora = adesso();
    db.prepare(`INSERT INTO main.proposta_conversione_voce (id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(nuova, r.voce_uid, r.lotto, r.tipo_proposto, r.riferimento_tipo, r.riferimento_chiave, JSON.stringify(nuovi), r.togli_json, motivo, r.certezza, ora);
    if (db.prepare("UPDATE main.proposta_conversione_voce SET stato = 'scartata', decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'")
      .run(ora, JSON.stringify({ modo: 'sostituita', da: nuova, perche: `unione di «${da}» in «${a}» (migrazione dell'ondata 5, lotto C)` }), r.id).changes !== 1) {
      throw new Error(`la proposta ${r.id} non è più aperta`);
    }
    cambiate.push({ vecchia: r.id, nuova });
  }
  return cambiate;
}

/**
 * Unisce `da` in `a` con il gesto della fusione (reversibile dal Cestino), gli alias dell'elenco, le proposte aperte e i ritocchi di `dopo`.
 * Non lancia: un'unione che non passa le guardie o che la fusione rifiuta torna «ferma», con il motivo, e non lascia niente di scritto.
 */
export function unisciIdentita(db: AppDatabase, u: UnioneIdentita, dopo?: (destinazione: Riga) => void): EsitoUnione {
  const origine = db.prepare('SELECT * FROM main.catalogo_oggetto WHERE chiave = ?').get(u.da) as Riga | undefined;
  const destinazione = db.prepare('SELECT * FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(u.a) as Riga | undefined;
  if (!origine) return { da: u.da, a: u.a, esito: 'gia-unita' };
  if (!destinazione) return { da: u.da, a: u.a, esito: 'ferma', motivo: 'la destinazione non c’è o è nascosta' };
  const nellePartite = partiteCheCitano(db, u.da);
  if (nellePartite.length) return { da: u.da, a: u.a, esito: 'ferma', motivo: `citata dalle partite (${nellePartite.join('; ')}): le partite non si toccano` };
  const nelDiario = vociCheCitano(db, u.da);
  if (nelDiario.length) return { da: u.da, a: u.a, esito: 'ferma', motivo: `citata dal Diario (${nelDiario.join('; ')}): le voci non si toccano` };
  // l'identità tolta com'era, tutte le colonne (la copia di ripristino resta nel Cestino; questa va nell'audit)
  const tolta: Riga = { ...origine };
  const aliasPrima = nomiAltri(destinazione.nomi_altri_json);
  let proposteAggiornate: Array<{ vecchia: string; nuova: string }> = [];
  let statisticheScritte: EsitoUnione['statisticheScritte'];
  try {
    // un punto di salvataggio solo: se la sostituzione delle proposte non riesce, anche la fusione si annulla
    db.transaction(() => {
      fondiOggetti144(db, u.da, u.a, () => {
        db.prepare('UPDATE main.catalogo_oggetto SET nomi_altri_json = ?, updated_at = ? WHERE chiave = ?')
          .run(JSON.stringify(aliasUniti(String(destinazione.nome), aliasPrima, u.alias)), adesso(), u.a);
        // le statistiche dell'equipaggiamento non si perdono con l'identità tolta (solo se la scheda che resta non ne ha)
        if (u.statistiche && db.prepare('UPDATE main.catalogo_oggetto SET statistiche_json = ?, updated_at = ? WHERE chiave = ? AND statistiche_json IS NULL')
          .run(JSON.stringify(u.statistiche), adesso(), u.a).changes === 1) {
          statisticheScritte = { prima: destinazione.statistiche_json ?? null, dopo: u.statistiche };
        }
        dopo?.(destinazione);
      });
      proposteAggiornate = sostituisciProposteConversione(db, u.da, u.a, String(destinazione.nome), u.motivi ?? []);
    })();
  } catch (e) {
    return { da: u.da, a: u.a, esito: 'ferma', motivo: e instanceof Error ? e.message : String(e) };
  }
  return { da: u.da, a: u.a, esito: 'unita', tolta, ...(statisticheScritte ? { statisticheScritte } : {}), ...(proposteAggiornate.length ? { proposteAggiornate } : {}) };
}

export interface RigaComposta {
  /** L'identità del catalogo che nomina più regali in una sola riga. */
  chiave: string;
  /** Gli oggetti veri, nell'ordine in cui la riga li nomina: il primo prende il posto della riga, gli altri diventano righe nuove. */
  oggetti: readonly string[];
}

export interface EsitoComposta {
  chiave: string;
  esito: 'sciolta' | 'gia-sciolta' | 'ferma';
  motivo?: string;
  righe?: Array<{ confidente: string; ordine: number; oggetto: string; nuova: boolean }>;
  saltate?: Array<{ confidente: string; oggetto: string; perche: string }>;
}

/** Le tabelle di gioco (oltre a `confidente_regalo` e al catalogo stesso) che possono citare un oggetto del catalogo. */
function altriRiferimentiDiGioco(db: AppDatabase, chiave: string): string[] {
  const trovate: string[] = [];
  for (const t of tabelle(db, 'main')) {
    if (t === 'cestino' || t === 'confidente_regalo' || t === 'catalogo_oggetto' || t === 'dati_guida' || t.startsWith('immagine')) continue;
    for (const c of colonneTesto(db, 'main', t)) {
      const n = db.prepare(`SELECT COUNT(*) FROM main."${t}" WHERE "${c}" = ? OR instr(CAST("${c}" AS TEXT), ?) > 0`).pluck().get(chiave, `"${chiave}"`) as number;
      if (n) trovate.push(`${t}.${c}: ${n}`);
    }
  }
  // fra i blocchi della guida conta solo quello del catalogo (gli audit sono storia)
  const guida = db.prepare("SELECT COUNT(*) FROM main.dati_guida WHERE chiave = 'oggetti-guida' AND instr(json, ?) > 0").pluck().get(`"${chiave}"`) as number;
  if (guida) trovate.push(`dati_guida.oggetti-guida: ${guida}`);
  return trovate;
}

/** Le consegne delle partite che citano per nome (stesso Confidente, stesso nome) una riga di `confidente_regalo` legata alla scheda. Sola lettura. */
function consegnePerNome(db: AppDatabase, chiave: string): number {
  if (!conPartite(db) || !db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'regalo_partita'").get()) return 0;
  return db.prepare(`SELECT COUNT(*) FROM utente.regalo_partita p JOIN main.confidente_regalo c
    ON c.confidente_chiave = p.confidente_chiave AND c.nome = p.regalo WHERE c.catalogo_chiave = ?`).pluck().get(chiave) as number;
}

/**
 * Scioglie una riga composta dei regali: ogni riga di `confidente_regalo` che la cita diventa una riga per oggetto, con gli stessi dati
 * (effetto, sconsigliato, nota, origine); poi l'identità composta si toglie. Tutto in una registrazione del Cestino: il ripristino
 * rimette la riga com'era e cancella le righe aggiunte. Un oggetto che il Confidente ha già in elenco non si ripete (resta l'altra riga).
 */
export function sciogliRigaComposta(db: AppDatabase, r: RigaComposta): EsitoComposta {
  const composta = db.prepare('SELECT * FROM main.catalogo_oggetto WHERE chiave = ?').get(r.chiave) as Riga | undefined;
  if (!composta) return { chiave: r.chiave, esito: 'gia-sciolta' };
  const nomi = new Map<string, string>();
  for (const o of r.oggetti) {
    const d = db.prepare('SELECT nome FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(o) as { nome: string } | undefined;
    if (!d) return { chiave: r.chiave, esito: 'ferma', motivo: `l’oggetto ${o} non c’è o è nascosto` };
    nomi.set(o, d.nome);
  }
  const nellePartite = partiteCheCitano(db, r.chiave);
  if (nellePartite.length) return { chiave: r.chiave, esito: 'ferma', motivo: `citata dalle partite (${nellePartite.join('; ')}): le partite non si toccano` };
  // `regalo_partita` lega la consegna anche per nome (chiave primaria partita, Confidente, nome del regalo): una consegna salvata con il
  // nome della riga composta e senza chiave del catalogo non la vede la guardia per chiave, e dopo la rinomina della riga perderebbe il legame
  const perNome = consegnePerNome(db, r.chiave);
  if (perNome) return { chiave: r.chiave, esito: 'ferma', motivo: `${perNome} consegne delle partite citano per nome una riga di questa scheda: le partite non si toccano` };
  const altri = altriRiferimentiDiGioco(db, r.chiave);
  if (altri.length) return { chiave: r.chiave, esito: 'ferma', motivo: `citata anche da ${altri.join('; ')}: va sistemata a parte` };
  const righe: NonNullable<EsitoComposta['righe']> = [];
  const saltate: NonNullable<EsitoComposta['saltate']> = [];
  try {
    conCestino144(db, { tipo: 'oggetto', chiave: r.chiave, nome: String(composta.nome), contesto: `Sciolta in un oggetto per riga: ${[...nomi.values()].join(', ')}` }, () => db.transaction(() => {
      const citanti = db.prepare('SELECT * FROM main.confidente_regalo WHERE catalogo_chiave = ? ORDER BY confidente_chiave, ordine').all(r.chiave) as Riga[];
      for (const riga of citanti) {
        const confidente = String(riga.confidente_chiave);
        const giaInElenco = new Set((db.prepare('SELECT catalogo_chiave FROM main.confidente_regalo WHERE confidente_chiave = ? AND catalogo_chiave IS NOT NULL').all(confidente) as Array<{ catalogo_chiave: string }>).map((x) => x.catalogo_chiave));
        const daScrivere = r.oggetti.filter((o) => {
          if (!giaInElenco.has(o)) return true;
          saltate.push({ confidente, oggetto: o, perche: 'il Confidente ha già una riga per questo oggetto' });
          return false;
        });
        if (!daScrivere.length) {
          db.prepare('DELETE FROM main.confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').run(confidente, riga.ordine);
          continue;
        }
        const [primo, ...altriOggetti] = daScrivere as [string, ...string[]];
        db.prepare('UPDATE main.confidente_regalo SET catalogo_chiave = ?, nome = ? WHERE confidente_chiave = ? AND ordine = ? AND catalogo_chiave = ?')
          .run(primo, nomi.get(primo), confidente, riga.ordine, r.chiave);
        righe.push({ confidente, ordine: Number(riga.ordine), oggetto: primo, nuova: false });
        for (const o of altriOggetti) {
          const ordine = (db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.confidente_regalo WHERE confidente_chiave = ?').pluck().get(confidente) as number);
          db.prepare(`INSERT INTO main.confidente_regalo (confidente_chiave, ordine, nome, dove, costo, effetto, sconsigliato, catalogo_chiave, nota, seed_json, origine, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`)
            .run(confidente, ordine, nomi.get(o), riga.dove ?? null, riga.costo ?? null, riga.effetto ?? null, riga.sconsigliato, o, riga.nota ?? null, riga.origine, riga.updated_at ?? null);
          righe.push({ confidente, ordine, oggetto: o, nuova: true });
        }
      }
      db.prepare('DELETE FROM main.catalogo_oggetto WHERE chiave = ?').run(r.chiave);
    })());
  } catch (e) {
    return { chiave: r.chiave, esito: 'ferma', motivo: e instanceof Error ? e.message : String(e) };
  }
  return { chiave: r.chiave, esito: 'sciolta', righe, ...(saltate.length ? { saltate } : {}) };
}

/** Aggiunge un'esecuzione all'audit della migrazione in `dati_guida` (una riga per migrazione, un'esecuzione per giro). */
export function scriviAudit(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-C', esecuzioni: [...esecuzioni, { il: adesso(), ...esecuzione }] }));
}
