// ============================================================
// Migrazione 313 — testi copiati tolti da libri, film, trofei, inviti, Calendario, settimane della guida e note dei regali; date in struttura
// ============================================================
//
// L13, ondata 7, lotto O7-4 (istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito
// rispetto all'obiettivo»). Regola (come la 307): si toglie il testo che ripete un dato strutturato e la pagina lo genera dalla struttura; si
// struttura il testo che porta un dato non ancora strutturato; il resto resta testo informativo. Elenco CHIUSO in `dati/313-testi-copiati.json`
// (letto su una copia alla 312): ogni scrittura solo se la riga ha ancora il testo atteso E la struttura dice lo stesso; un testo diverso è
// dell'utente o è già cambiato e si salta (lo dice l'audit). Le righe corrette dall'utente (`origine = 'utente'`) non si toccano.
//   - libri: `disponibile_dal` → NULL se le condizioni sono quelle lette dal testo; `dote`/`note` → NULL se `effetti_json` ha la sola voce di
//     quella Dote con quelle note; `sblocca` → NULL se gli effetti hanno lo sblocco (luogo, funzione, moltiplica, aumenta-punti); `dove` → ''
//     se ogni sede letta dal testo c'è (articolo del negozio, posizione, ricompensa di una Richiesta); `prezzo` → NULL dove non c'è articolo
//     e il valore è quello atteso (il prezzo viene solo dall'articolo, ondata 5 lotto E). Quel che il testo dice in più va in coda ai
//     `dettagli` come «Dalla guida: …», solo se nella stessa esecuzione il testo da cui viene si toglie;
//   - film: `periodo` → '' se le condizioni sono quelle lette; `dote`/`note`/`note_successive` → NULL se gli effetti dicono la prima visione
//     e (solo con `note_successive`) la voce `ripetuto` con la stessa Dote; il prezzo resta (nessun articolo dei film al cinema);
//   - trofei: colonna nuova `trofeo.condizioni_json` (il vocabolario unico delle condizioni); i 16 `quando` diventano condizioni e si svuotano;
//   - inviti: colonne nuove `confidente_invito.messaggio_data` (MM-GG) e `messaggio_fascia` per le note «il messaggio arriva la sera del …»
//     (convertite e svuotate, anche nella fotografia di «Ripristina» se dice lo stesso);
//   - Calendario: l'evento elencato si lega alla fonte (`fonte_chiave`) solo se titolo e data sono quelli attesi e il risolutore dà la stessa
//     data; gli eventi «da decidere» si scrivono nell'audit e non si toccano;
//   - settimane della guida: `periodo` → '' dove coincide col periodo generato dai giorni della settimana (`giorno.settimana`) con la stessa
//     funzione del Calendario (`periodoDellaSettimana`);
//   - note dei regali: la frase che ripete «non accetta regali» si toglie dove `confidente.regalabile` = 0; lo storico dell'editor della
//     disponibilità, se c'è, riceve una revisione «migrazione-313-<chiave>» (come la 307), mai riscritto.
// Le partite non si toccano. Idempotente: la seconda volta non trova niente da fare e non scrive. Audit `dati_guida.audit-313-testi-copiati`
// con i testi tolti. Solo `main`.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { periodoDellaSettimana } from '../../../shared/date.js';

const AUDIT = 'audit-313-testi-copiati';
const RICHIESTA = '2026-10-31: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 7, lotto O7-4)';
const FILE_DATI = '313-testi-copiati.json';
const STORICO = 'confidente-disponibilita-editor-v1:';
const QUI = path.dirname(fileURLToPath(import.meta.url));
const errore = (motivo: string): never => { throw new Error(`313: ${motivo}; nessuna modifica applicata.`); };

interface VoceLibro { chiave: string; disponibileDal?: string; condizioni?: unknown[]; sblocca?: string; dove: string; sedi: string[]; prezzo?: number; dettagli?: { atteso: string | null; aggiunta: string } }
interface VoceFilm { chiave: string; periodo: string; condizioni: unknown[]; dettagli?: { atteso: string | null; aggiunta: string } }
interface VoceTrofeo { chiave: string; quando: string; condizioni: unknown[] }
interface VoceInvito { chiave: string; nota: string; messaggioData: string; messaggioFascia: 'giorno' | 'sera' }
interface VoceEvento { id: number; data: string; titolo: string; fonteChiave: string }
interface VoceNota { confidente: string; colonna: 'note' | 'note_generali'; frase: string }
interface Dati { libri: VoceLibro[]; film: VoceFilm[]; trofei: VoceTrofeo[]; inviti: VoceInvito[]; eventi: VoceEvento[]; eventiDaDecidere: unknown[]; noteRegali: VoceNota[] }
type Esito = { riga: string; colonna: string; esito: string; prima?: unknown; dopo?: unknown };
type Riga = Record<string, unknown>;

/** Il file dati, cercato accanto al codice e nei sorgenti (sviluppo e immagine del server). */
function leggiDati(): Dati {
  for (const p of [path.join(QUI, 'dati', FILE_DATI), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', FILE_DATI)]) {
    if (fs.existsSync(p)) {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<Dati>;
      for (const k of ['libri', 'film', 'trofei', 'inviti', 'eventi', 'eventiDaDecidere', 'noteRegali'] as const) if (!Array.isArray(v[k])) errore(`il file ${FILE_DATI} non ha «${k}»`);
      return v as Dati;
    }
  }
  return errore(`manca il file server/db/migrations/dati/${FILE_DATI}`);
}

/** JSON canonico (chiavi ordinate): due strutture uguali hanno lo stesso testo. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
function json(testo: unknown): unknown { try { return typeof testo === 'string' ? JSON.parse(testo) : null; } catch { return null; } }
const stesseCondizioni = (salvate: unknown, attese: unknown[]): boolean => Array.isArray(json(salvate)) && canonico(json(salvate)) === canonico(attese);

interface Voce { effetto?: { famiglia?: string; dote?: string; note?: number }; ripetuto?: boolean; condizioni?: unknown[] }
const voci = (testo: unknown): Voce[] => { const v = json(testo); return Array.isArray(v) ? v as Voce[] : []; };
/** Le voci «dote» semplici (senza condizioni) di una lettura: prima volta e, con `ripetuto`, le volte dopo. */
function vociDote(effetti: Voce[], ripetuto: boolean): Array<{ dote: string; note: number }> {
  return effetti.filter((v) => v.effetto?.famiglia === 'dote' && !!v.ripetuto === ripetuto && !(v.condizioni && v.condizioni.length))
    .map((v) => ({ dote: String(v.effetto?.dote), note: Number(v.effetto?.note) }));
}
const FAMIGLIE_SBLOCCO = new Set(['sblocca-luogo', 'sblocca-funzione', 'moltiplica', 'aumenta-punti']);

/** Aggiunge `aggiunta` in coda ai dettagli che sono ancora quelli attesi; null se il testo è diverso, undefined se è già fatto. */
function dettagliNuovi(attuale: unknown, d: { atteso: string | null; aggiunta: string }): string | null | undefined {
  const a = typeof attuale === 'string' ? attuale : null;
  if (a !== null && a.endsWith(d.aggiunta)) return undefined;
  if (a !== d.atteso) return null;
  return a ? `${a} ${d.aggiunta}` : d.aggiunta;
}

/** Scrive le colonne cambiate solo se la riga ha ancora i valori letti; lancia se non si aggiorna una volta sola. */
function aggiorna(db: AppDatabase, tabella: string, colonnaChiave: string, chiave: unknown, prima: Riga, dopo: Riga): string[] {
  const cambiate = Object.keys(dopo).filter((c) => dopo[c] !== prima[c]);
  if (!cambiate.length) return [];
  const cond = cambiate.map((c) => (prima[c] === null ? `${c} IS NULL` : `${c} = ?`)).join(' AND ');
  const n = db.prepare(`UPDATE main.${tabella} SET ${cambiate.map((c) => `${c} = ?`).join(', ')} WHERE ${colonnaChiave} = ? AND ${cond}`)
    .run(...cambiate.map((c) => dopo[c]), chiave, ...cambiate.filter((c) => prima[c] !== null).map((c) => prima[c])).changes;
  if (n !== 1) errore(`la riga ${String(chiave)} di ${tabella} non si aggiorna una volta sola`);
  return cambiate;
}

// ---- Libri ----

/** La sede letta dal testo c'è nella struttura? `negozio:K` (articolo del catalogo o posizione), `luogo|quartiere|attivita:K` (posizione),
 *  `richiesta:K` (ricompensa della Richiesta). */
function sedePresente(db: AppDatabase, r: Riga, sede: string): boolean {
  const [tipo, ...resto] = sede.split(':');
  const chiave = resto.join(':');
  const posizione = (t: string) => !!db.prepare('SELECT 1 FROM main.libro_posizione WHERE libro_chiave = ? AND tipo = ? AND chiave = ?').get(r.chiave, t, chiave);
  try {
    if (tipo === 'negozio') {
      return posizione('negozio') || (r.catalogo_chiave != null && !!db.prepare(`SELECT 1 FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
        WHERE a.catalogo_chiave = ? AND n.chiave = ? AND a.nascosto = 0 AND n.nascosto = 0`).get(r.catalogo_chiave, chiave));
    }
    if (tipo === 'luogo' || tipo === 'quartiere' || tipo === 'attivita') return posizione(tipo);
    if (tipo === 'richiesta') return r.catalogo_chiave != null && !!db.prepare("SELECT 1 FROM main.ricompensa_oggetto WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ? AND catalogo_chiave = ?").get(chiave, r.catalogo_chiave);
  } catch { return false; }
  return false;
}
/** Il libro ha un articolo in vendita (il prezzo viene da lì)? Nel dubbio sì (il prezzo resta). */
function haArticolo(db: AppDatabase, r: Riga): boolean {
  try { return r.catalogo_chiave == null || !!db.prepare('SELECT 1 FROM main.articolo WHERE catalogo_chiave = ? AND nascosto = 0').get(r.catalogo_chiave); } catch { return true; }
}

function libro(db: AppDatabase, v: VoceLibro, esiti: Esito[]): number {
  const r = db.prepare('SELECT * FROM main.libro WHERE chiave = ?').get(v.chiave) as Riga | undefined;
  if (!r) return 0;
  const k = `libro:${v.chiave}`;
  const prima: Riga = { disponibile_dal: r.disponibile_dal, dote: r.dote, note: r.note, sblocca: r.sblocca, dove: r.dove, prezzo: r.prezzo, dettagli: r.dettagli };
  if (r.origine !== 'seed') {
    if (Object.entries(prima).some(([c, x]) => c !== 'dettagli' && x !== null && x !== '')) esiti.push({ riga: k, colonna: '*', esito: 'riga corretta dall’utente: saltata' });
    return 0;
  }
  const dopo: Riga = { ...prima };
  const effetti = voci(r.effetti_json);
  let tolto = false;
  if (r.disponibile_dal !== null) {
    if (v.disponibileDal === undefined || r.disponibile_dal !== v.disponibileDal) esiti.push({ riga: k, colonna: 'disponibile_dal', esito: 'testo diverso da quello atteso: resta', prima: r.disponibile_dal });
    else if (!stesseCondizioni(r.condizioni_json, v.condizioni ?? [])) esiti.push({ riga: k, colonna: 'disponibile_dal', esito: 'le condizioni non dicono più quel che dice il testo: resta', prima: r.disponibile_dal });
    else { dopo.disponibile_dal = null; esiti.push({ riga: k, colonna: 'disponibile_dal', esito: 'tolto: lo dicono le condizioni', prima: r.disponibile_dal }); }
  }
  if (r.dote !== null || r.note !== null) {
    const doti = vociDote(effetti, false);
    if (doti.length === 1 && doti[0]!.dote === r.dote && doti[0]!.note === r.note && vociDote(effetti, true).length === 0) {
      dopo.dote = null; dopo.note = null; esiti.push({ riga: k, colonna: 'dote, note', esito: 'tolte: lo dicono gli effetti', prima: { dote: r.dote, note: r.note } });
    } else esiti.push({ riga: k, colonna: 'dote, note', esito: 'gli effetti non dicono la stessa Dote: restano', prima: { dote: r.dote, note: r.note } });
  }
  if (r.sblocca !== null) {
    if (v.sblocca === undefined || r.sblocca !== v.sblocca) esiti.push({ riga: k, colonna: 'sblocca', esito: 'testo diverso da quello atteso: resta', prima: r.sblocca });
    else if (!effetti.some((e) => FAMIGLIE_SBLOCCO.has(String(e.effetto?.famiglia)))) esiti.push({ riga: k, colonna: 'sblocca', esito: 'gli effetti non hanno lo sblocco: resta', prima: r.sblocca });
    else { dopo.sblocca = null; tolto = true; esiti.push({ riga: k, colonna: 'sblocca', esito: 'tolto: lo dicono gli effetti (e «Apre» dalle condizioni dei posti)', prima: r.sblocca }); }
  }
  if (r.dove !== '') {
    const mancanti = v.sedi.filter((s) => !sedePresente(db, r, s));
    if (r.dove !== v.dove) esiti.push({ riga: k, colonna: 'dove', esito: 'testo diverso da quello atteso: resta', prima: r.dove });
    else if (mancanti.length) esiti.push({ riga: k, colonna: 'dove', esito: `sedi non trovate nella struttura (${mancanti.join(', ')}): resta`, prima: r.dove });
    else { dopo.dove = ''; tolto = true; esiti.push({ riga: k, colonna: 'dove', esito: `tolto: lo dicono ${v.sedi.join(', ')}`, prima: r.dove }); }
  }
  if (v.prezzo !== undefined && r.prezzo !== null) {
    if (r.prezzo === v.prezzo && !haArticolo(db, r)) { dopo.prezzo = null; esiti.push({ riga: k, colonna: 'prezzo', esito: 'tolto: senza articolo il libro non si compra (si ottiene)', prima: r.prezzo }); }
    else esiti.push({ riga: k, colonna: 'prezzo', esito: 'valore diverso o articolo presente: resta', prima: r.prezzo });
  }
  if (v.dettagli && tolto) {
    const nuovi = dettagliNuovi(r.dettagli, v.dettagli);
    if (nuovi === null) esiti.push({ riga: k, colonna: 'dettagli', esito: 'dettagli diversi da quelli attesi: la frase della guida non si aggiunge', prima: r.dettagli });
    else if (nuovi !== undefined) { dopo.dettagli = nuovi; esiti.push({ riga: k, colonna: 'dettagli', esito: 'aggiunto quel che il testo tolto diceva in più', prima: r.dettagli, dopo: nuovi }); }
  }
  return aggiorna(db, 'libro', 'chiave', v.chiave, prima, dopo).length;
}

// ---- Film ----

function film(db: AppDatabase, v: VoceFilm, esiti: Esito[]): number {
  const r = db.prepare('SELECT * FROM main.film WHERE chiave = ?').get(v.chiave) as Riga | undefined;
  if (!r) return 0;
  const k = `film:${v.chiave}`;
  const prima: Riga = { periodo: r.periodo, dote: r.dote, note: r.note, note_successive: r.note_successive, dettagli: r.dettagli };
  if (r.origine !== 'seed') {
    if (r.periodo !== '' || r.dote !== null || r.note !== null || r.note_successive !== null) esiti.push({ riga: k, colonna: '*', esito: 'riga corretta dall’utente: saltata (i suoi testi restano)' });
    return 0;
  }
  const dopo: Riga = { ...prima };
  let tolto = false;
  if (r.periodo !== '') {
    if (r.periodo !== v.periodo) esiti.push({ riga: k, colonna: 'periodo', esito: 'testo diverso da quello atteso: resta', prima: r.periodo });
    else if (!stesseCondizioni(r.condizioni_json, v.condizioni)) esiti.push({ riga: k, colonna: 'periodo', esito: 'le condizioni non dicono più quel che dice il testo: resta', prima: r.periodo });
    else { dopo.periodo = ''; tolto = true; esiti.push({ riga: k, colonna: 'periodo', esito: 'tolto: lo dicono le condizioni', prima: r.periodo }); }
  }
  if (r.dote !== null || r.note !== null || r.note_successive !== null) {
    const effetti = voci(r.effetti_json);
    const primaVolta = vociDote(effetti, false), dopoVolte = vociDote(effetti, true);
    const okPrima = primaVolta.length === 1 && primaVolta[0]!.dote === r.dote && primaVolta[0]!.note === r.note;
    const okDopo = r.note_successive === null ? dopoVolte.length === 0 : dopoVolte.length === 1 && dopoVolte[0]!.dote === r.dote && dopoVolte[0]!.note === r.note_successive;
    if (okPrima && okDopo) { dopo.dote = null; dopo.note = null; dopo.note_successive = null; esiti.push({ riga: k, colonna: 'dote, note, note_successive', esito: 'tolte: lo dicono gli effetti (prima visione e «ripetuto»)', prima: { dote: r.dote, note: r.note, noteSuccessive: r.note_successive } }); }
    else esiti.push({ riga: k, colonna: 'dote, note, note_successive', esito: 'gli effetti non dicono le stesse Doti: restano', prima: { dote: r.dote, note: r.note, noteSuccessive: r.note_successive } });
  }
  if (v.dettagli && tolto) {
    const nuovi = dettagliNuovi(r.dettagli, v.dettagli);
    if (nuovi === null) esiti.push({ riga: k, colonna: 'dettagli', esito: 'dettagli diversi da quelli attesi: la frase della guida non si aggiunge', prima: r.dettagli });
    else if (nuovi !== undefined) { dopo.dettagli = nuovi; esiti.push({ riga: k, colonna: 'dettagli', esito: 'aggiunto quel che il periodo diceva in più', prima: r.dettagli, dopo: nuovi }); }
  }
  return aggiorna(db, 'film', 'chiave', v.chiave, prima, dopo).length;
}

// ---- Trofei, inviti, eventi, settimane ----

/** Le chiavi dei Palazzi citati da condizioni attese esistono? */
function palazziEsistono(db: AppDatabase, condizioni: unknown[]): boolean {
  return condizioni.every((c) => (c as { tipo?: string }).tipo !== 'palazzo' || !!db.prepare('SELECT 1 FROM main.dungeon WHERE chiave = ?').get((c as { dungeon?: string }).dungeon));
}
function trofeo(db: AppDatabase, v: VoceTrofeo, esiti: Esito[]): number {
  const r = db.prepare('SELECT chiave, quando, condizioni_json, origine FROM main.trofeo WHERE chiave = ?').get(v.chiave) as Riga | undefined;
  if (!r || r.quando === null || r.quando === '') return 0;
  const k = `trofeo:${v.chiave}`;
  if (r.origine !== 'seed') { esiti.push({ riga: k, colonna: '*', esito: 'riga corretta dall’utente: saltata' }); return 0; }
  if (r.quando !== v.quando) { esiti.push({ riga: k, colonna: 'quando', esito: 'testo diverso da quello atteso: resta', prima: r.quando }); return 0; }
  const salvate = json(r.condizioni_json);
  if (r.condizioni_json !== null && !(Array.isArray(salvate) && salvate.length === 0)) { esiti.push({ riga: k, colonna: 'quando', esito: 'il trofeo ha già condizioni: resta', prima: r.quando }); return 0; }
  if (!palazziEsistono(db, v.condizioni)) { esiti.push({ riga: k, colonna: 'quando', esito: 'un Palazzo citato non esiste: resta', prima: r.quando }); return 0; }
  esiti.push({ riga: k, colonna: 'quando → condizioni_json', esito: 'convertito e tolto', prima: r.quando, dopo: v.condizioni });
  return aggiorna(db, 'trofeo', 'chiave', v.chiave, { quando: r.quando, condizioni_json: r.condizioni_json }, { quando: null, condizioni_json: JSON.stringify(v.condizioni) }).length;
}

function invito(db: AppDatabase, v: VoceInvito, esiti: Esito[]): number {
  const r = db.prepare('SELECT chiave, nota, messaggio_data, messaggio_fascia, seed_json FROM main.confidente_invito WHERE chiave = ?').get(v.chiave) as Riga | undefined;
  if (!r || r.nota === '') return 0;
  const k = `invito:${v.chiave}`;
  if (r.nota !== v.nota) { esiti.push({ riga: k, colonna: 'nota', esito: 'testo diverso da quello atteso: resta', prima: r.nota }); return 0; }
  if (r.messaggio_data !== null) { esiti.push({ riga: k, colonna: 'nota', esito: 'il messaggio ha già una data: resta', prima: r.nota }); return 0; }
  const dopo: Riga = { nota: '', messaggio_data: v.messaggioData, messaggio_fascia: v.messaggioFascia, seed_json: r.seed_json };
  const f = json(r.seed_json) as Record<string, unknown> | null;
  if (f && typeof f === 'object' && !Array.isArray(f) && f.nota === v.nota) {
    dopo.seed_json = JSON.stringify({ ...f, nota: '', messaggio_data: v.messaggioData, messaggio_fascia: v.messaggioFascia });
    esiti.push({ riga: k, colonna: 'seed_json', esito: 'fotografia di «Ripristina» allineata (stessa nota)' });
  }
  esiti.push({ riga: k, colonna: 'nota → messaggio_data, messaggio_fascia', esito: 'convertita e tolta', prima: r.nota, dopo: { data: v.messaggioData, fascia: v.messaggioFascia } });
  return aggiorna(db, 'confidente_invito', 'chiave', v.chiave, { nota: r.nota, messaggio_data: r.messaggio_data, messaggio_fascia: r.messaggio_fascia, seed_json: r.seed_json }, dopo).length;
}

/** La data che il risolutore del Calendario (`calendarioFonti.ts`) darebbe alla chiave; null se non la risolve. Solo `sblocco:confidente:X:1`. */
function dataDellaFonte(db: AppDatabase, chiave: string): string | null {
  const p = chiave.split(':');
  if (p[0] !== 'sblocco' || p[1] !== 'confidente' || p.length !== 4 || p[3] !== '1') return null;
  const j = db.prepare("SELECT dati_json FROM main.confidente_requisito WHERE confidente_chiave = ? AND rango = 1 AND tipo = 'data' ORDER BY indice LIMIT 1").pluck().get(p[2]) as string | undefined;
  const dal = (json(j) as { dal?: unknown } | null)?.dal;
  return typeof dal === 'string' ? dal : null;
}
function evento(db: AppDatabase, v: VoceEvento, esiti: Esito[]): number {
  const r = db.prepare('SELECT id, data, titolo, origine, fonte_chiave FROM main.evento_calendario WHERE id = ?').get(v.id) as Riga | undefined;
  if (!r || r.fonte_chiave === v.fonteChiave) return 0;
  const k = `evento:${v.id}`;
  if (r.origine !== 'seed' || r.fonte_chiave !== null) { esiti.push({ riga: k, colonna: 'fonte_chiave', esito: 'evento corretto dall’utente o già legato: resta' }); return 0; }
  if (r.data !== v.data || r.titolo !== v.titolo) { esiti.push({ riga: k, colonna: 'fonte_chiave', esito: 'titolo o data diversi da quelli attesi: resta', prima: { data: r.data, titolo: r.titolo } }); return 0; }
  if (dataDellaFonte(db, v.fonteChiave) !== v.data) { esiti.push({ riga: k, colonna: 'fonte_chiave', esito: `la fonte ${v.fonteChiave} non dà il ${v.data}: resta` }); return 0; }
  esiti.push({ riga: k, colonna: 'fonte_chiave', esito: `legato a ${v.fonteChiave} (stessa data)`, prima: null, dopo: v.fonteChiave });
  return aggiorna(db, 'evento_calendario', 'id', v.id, { fonte_chiave: null }, { fonte_chiave: v.fonteChiave }).length;
}

function settimane(db: AppDatabase, esiti: Esito[]): number {
  if (!esisteTabella(db, 'giorno') || !haColonna(db, 'giorno', 'settimana')) return 0;
  let n = 0;
  for (const s of db.prepare("SELECT numero, periodo, origine FROM main.settimana_guida WHERE periodo <> '' ORDER BY numero").all() as Array<{ numero: number; periodo: string; origine: string }>) {
    const k = `settimana:${s.numero}`;
    if (s.origine !== 'seed') { esiti.push({ riga: k, colonna: 'periodo', esito: 'settimana corretta dall’utente: resta', prima: s.periodo }); continue; }
    const dal = db.prepare('SELECT data FROM main.giorno WHERE settimana = ? ORDER BY ordine LIMIT 1').pluck().get(s.numero) as string | undefined;
    const al = db.prepare('SELECT data FROM main.giorno WHERE settimana = ? ORDER BY ordine DESC LIMIT 1').pluck().get(s.numero) as string | undefined;
    const generato = periodoDellaSettimana(dal, al);
    if (generato !== s.periodo) { esiti.push({ riga: k, colonna: 'periodo', esito: `diverso dal periodo dei giorni (${generato ?? 'nessun giorno'}): resta`, prima: s.periodo }); continue; }
    esiti.push({ riga: k, colonna: 'periodo', esito: 'tolto: lo dicono i giorni della settimana', prima: s.periodo });
    n += aggiorna(db, 'settimana_guida', 'numero', s.numero, { periodo: s.periodo }, { periodo: '' }).length;
  }
  return n;
}

// ---- Note dei regali ----

const COLONNE_STORICO = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'] as const;
type Revisione = { id: number; azione: string; data: string; motivo: string; operazioneId: string; richiesta: string; prima: unknown; dopo: unknown };
type Registro = Record<string, unknown> & { revisioni: Revisione[]; iniziale: unknown };

function notaRegali(db: AppDatabase, v: VoceNota, adesso: string, esiti: Esito[]): number {
  const k = `confidente:${v.confidente}`;
  const regalabile = db.prepare('SELECT regalabile FROM main.confidente WHERE chiave = ?').pluck().get(v.confidente) as number | undefined;
  const r = db.prepare(`SELECT ${COLONNE_STORICO.join(', ')} FROM main.confidente_disponibilita WHERE confidente_chiave = ?`).get(v.confidente) as Record<string, string> | undefined;
  if (!r || typeof r[v.colonna] !== 'string') return 0;
  const testo = r[v.colonna]!;
  const volte = testo.split(v.frase).length - 1;
  if (volte === 0) return 0; // già tolta (o mai scritta)
  if (regalabile !== 0) { esiti.push({ riga: k, colonna: v.colonna, esito: 'il Confidente accetta regali: la frase resta', prima: testo }); return 0; }
  if (volte !== 1) { esiti.push({ riga: k, colonna: v.colonna, esito: 'la frase compare più volte: resta', prima: testo }); return 0; }
  const nuovo = testo.replace(v.frase, '');
  const prima = Object.fromEntries(COLONNE_STORICO.map((c) => [c, r[c]]));
  const dopo = { ...prima, [v.colonna]: nuovo };
  const storico = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(STORICO + v.confidente) as string | undefined;
  let registro: Registro | null = null;
  if (storico !== undefined) {
    const reg = json(storico) as Registro | null;
    const ultima = reg && Array.isArray(reg.revisioni) ? (reg.revisioni.length ? reg.revisioni[reg.revisioni.length - 1]!.dopo : reg.iniziale) : null;
    if (!reg || canonico(ultima) !== canonico(prima)) { esiti.push({ riga: k, colonna: v.colonna, esito: 'lo storico dell’editor non finisce sulla riga di adesso: resta', prima: testo }); return 0; }
    registro = reg;
  }
  const n = aggiorna(db, 'confidente_disponibilita', 'confidente_chiave', v.confidente, { [v.colonna]: testo }, { [v.colonna]: nuovo }).length;
  esiti.push({ riga: k, colonna: v.colonna, esito: 'tolta la frase che ripete «Non accetta regali» (la scheda lo dice da `regalabile`)', prima: v.frase.trim(), dopo: nuovo });
  if (registro) {
    const operazioneId = `migrazione-313-${v.confidente}`;
    if (!registro.revisioni.some((x) => x.operazioneId === operazioneId)) {
      registro.revisioni.push({ id: registro.revisioni.length + 1, azione: 'migrazione', data: adesso,
        motivo: 'Migrazione 313: tolta dalle note la frase che ripete «non accetta regali» (la scheda lo dice dal Confidente).',
        operazioneId, richiesta: impronta({ chiave: v.confidente, migrazione: 313 }), prima, dopo });
      if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify(registro), STORICO + v.confidente).changes !== 1) errore(`lo storico di ${v.confidente} non si aggiorna`);
      esiti.push({ riga: k, colonna: 'storico', esito: `aggiunta la revisione ${registro.revisioni.length} «migrazione»` });
    }
  }
  return n;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean, daDecidere: unknown[]): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  const v = json(vecchio) as { esecuzioni?: unknown } | null;
  const esecuzioni = v && Array.isArray(v.esecuzioni) ? v.esecuzioni : [];
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 313, richiesta: RICHIESTA, file: `server/db/migrations/dati/${FILE_DATI}`,
      regola: 'si toglie il testo che ripete un dato strutturato (solo col testo atteso e la struttura che dice lo stesso); si struttura il testo con un dato nuovo (quando dei trofei, messaggio degli inviti); il resto resta; righe dell’utente saltate; partite non toccate',
      daDecidere,
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration313: Migration = {
  id: 313,
  name: 'testi_copiati_letture_trofei_calendario',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida')) { logger.warn({ migrazione: 313 }, 'dati_guida assente: niente da fare'); return; }
    // le colonne nuove (schema), prima dei dati
    if (esisteTabella(db, 'trofeo') && !haColonna(db, 'trofeo', 'condizioni_json')) db.exec('ALTER TABLE main.trofeo ADD COLUMN condizioni_json TEXT');
    if (esisteTabella(db, 'confidente_invito')) {
      if (!haColonna(db, 'confidente_invito', 'messaggio_data')) db.exec('ALTER TABLE main.confidente_invito ADD COLUMN messaggio_data TEXT');
      if (!haColonna(db, 'confidente_invito', 'messaggio_fascia')) db.exec("ALTER TABLE main.confidente_invito ADD COLUMN messaggio_fascia TEXT CHECK (messaggio_fascia IS NULL OR messaggio_fascia IN ('giorno', 'sera'))");
    }
    const dati = leggiDati();
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    const conteggi = { libri: 0, film: 0, trofei: 0, inviti: 0, eventi: 0, settimane: 0, noteRegali: 0 };
    const pronta = (tabella: string, colonne: readonly string[]) => esisteTabella(db, tabella) && colonne.every((c) => haColonna(db, tabella, c));
    if (pronta('libro', ['disponibile_dal', 'dote', 'note', 'sblocca', 'dove', 'prezzo', 'dettagli', 'condizioni_json', 'effetti_json', 'origine', 'catalogo_chiave']) && esisteTabella(db, 'libro_posizione')) {
      for (const v of dati.libri) conteggi.libri += libro(db, v, esiti);
    }
    if (pronta('film', ['periodo', 'dote', 'note', 'note_successive', 'dettagli', 'condizioni_json', 'effetti_json', 'origine'])) for (const v of dati.film) conteggi.film += film(db, v, esiti);
    if (pronta('trofeo', ['quando', 'condizioni_json', 'origine'])) for (const v of dati.trofei) conteggi.trofei += trofeo(db, v, esiti);
    if (pronta('confidente_invito', ['nota', 'messaggio_data', 'messaggio_fascia', 'seed_json'])) for (const v of dati.inviti) conteggi.inviti += invito(db, v, esiti);
    if (pronta('evento_calendario', ['fonte_chiave', 'origine']) && esisteTabella(db, 'confidente_requisito')) for (const v of dati.eventi) conteggi.eventi += evento(db, v, esiti);
    if (pronta('settimana_guida', ['periodo', 'origine'])) conteggi.settimane = settimane(db, esiti);
    if (pronta('confidente_disponibilita', COLONNE_STORICO) && pronta('confidente', ['regalabile'])) for (const v of dati.noteRegali) conteggi.noteRegali += notaRegali(db, v, adesso, esiti);
    const cambiato = Object.values(conteggi).some((n) => n > 0);
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { colonneCambiate: conteggi, esiti }, cambiato, dati.eventiDaDecidere);
    logger.info({ migrazione: 313, ...conteggi }, 'testi copiati tolti: libri, film, trofei, inviti, Calendario, settimane, note dei regali');
  },
};
