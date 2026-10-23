// ============================================================
// Copia congelata della conferma delle proposte di abbinamento e della fusione di due identità del catalogo (stato del 23/10/2026)
// ============================================================
//
// Le migrazioni non importano i servizi vivi (F5, F1 della verifica del 23/10): questo modulo riproduce, con il formato che oggi
// produce l'app, le sole operazioni che la migrazione 144 usa, partendo da `catalogoOggettiProposte.ts`, `catalogoOggettiFusione.ts`,
// `catalogoOggettiRiferimenti.ts` e `fontiRicompenseOggetti.ts` com'erano. Non importa niente da `server/services/`: lavora sulla
// connessione che riceve, senza cache e senza il registro delle cache di gioco (a un avvio non ne esiste nessuna da svuotare).
//
// Differenze volute rispetto ai servizi vivi:
//   - NON scrive mai nello schema `utente` (le partite). Il gesto vivo della fusione sposta anche `regalo_partita.catalogo_chiave`;
//     qui no: se una partita avesse un regalo che punta all'identità fusa, la lettura risolve la vecchia chiave verso la nuova tramite
//     l'alias della fusione nel Cestino (riga `oggetto` con la chiave dell'identità fusa). Vedi la nota nella migrazione.
//   - la rettifica di una proposta (`modifica_json`) si legge come JSON semplice con un controllo strutturale dei soli campi usati,
//     senza lo schema zod vivo (che dipende da quello delle condizioni dei pin). Una rettifica che non passa il controllo si tratta come
//     «non valida»: la proposta resta com'è, annotata nel log, come nel gesto vivo.
//   - gli errori sono `Error` semplici (la migrazione li registra nel log e lascia la proposta com'è).
// Il Cestino si scrive con il registratore congelato `cestinoRegistro144.ts`. Non modificarla: i servizi vivi sono altri file.
// ============================================================

import { isDeepStrictEqual } from 'node:util';
import type { AppDatabase } from '../dbService.js';
import { eCategoriaOggetto, normalizzaCostoScambio, normalizzaNomeOggetto, type CostoScambioOggetto } from '../../../shared/catalogo.js';
import { BLOCCHI_GUIDA_CATALOGO, cambiaRiferimentiCatalogoGuida } from '../../../shared/riferimentiCatalogoGuida.js';
import { conCestino144 } from './cestinoRegistro144.js';
import {
  fontiPropostePrimaDellaFusione, fratelliValidi, invalidaSnapshotDopoFusione, salvaSnapshotProposta, snapshotConVersioneSalvata,
  verificaSnapshotProposta,
} from './snapshotProposte121.js';

type Riga = Record<string, unknown>;
export type TipoProposta144 = 'articolo' | 'regalo' | 'voce' | 'ricetta' | 'ricompensa' | 'catalogo';
export interface ChiaveProposta144 { riga_tipo: TipoProposta144; riga_chiave: string; gruppo: string; catalogo_chiave: string | null }

interface Proposta {
  riga_tipo: TipoProposta144; riga_chiave: string; gruppo: string; catalogo_chiave: string | null; quantita: number | null;
  motivo: string; certezza: string; stato: 'da-approvare' | 'confermata' | 'scartata'; modifica_json: string | null;
  fonte_snapshot_json: string | null; nota: string | null;
}
interface Modifica {
  azione: 'collega' | 'nascondi' | 'crea'; ruolo?: 'costo'; prezzo?: number; condizioni?: unknown[]; negozio?: string; quantita?: number;
  prima?: Record<string, unknown> | null; costo?: CostoScambioOggetto; nome_offerta?: string; nota_offerta?: string; fonte?: string;
  ricevuti?: Array<{ chiave: string; quantita: number; nota: string | null }>;
}
type LegameCompleto = ChiaveProposta144 & { quantita: number | null; nota?: string | null; togli: boolean; precedente_catalogo_chiave?: string };
interface RigaCatalogo { chiave: string; categoria: string; sottocategoria: string | null; nome: string; nomi_altri_json: string; nome_originale: string | null; fonte_tipo: string; fonte_chiave: string | null }

const adesso = (): string => new Date().toISOString();
const eProdottoRicetta = (r: { riga_tipo: string; riga_chiave: string }) => r.riga_tipo === 'ricompensa' && r.riga_chiave.startsWith('ricetta/');
const LETTURE = new Set(['libro', 'film', 'videogioco']);

function separa(chiave: string): [string, string] {
  const i = chiave.indexOf('/');
  if (i <= 0 || i === chiave.length - 1) throw new Error('La fonte del legame non è completa.');
  return [chiave.slice(0, i), chiave.slice(i + 1)];
}
function regalo(chiave: string): [string, number] {
  const [confidente, ordine] = separa(chiave);
  if (!/^\d+$/.test(ordine) || !Number.isSafeInteger(Number(ordine))) throw new Error('La riga del regalo non è valida.');
  return [confidente, Number(ordine)];
}

// ---- Lettura dei blocchi della guida e delle fonti delle ricompense ----

function bloccoGuida(db: AppDatabase, chiave: string): Riga | null {
  const r = db.prepare('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined;
  if (!r) return null;
  try { const v = JSON.parse(r.json) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null; } catch { return null; }
}
const elencoDi = (v: unknown): Riga[] => Array.isArray(v) ? v.filter((x): x is Riga => !!x && typeof x === 'object' && !Array.isArray(x)) : [];
function ricettaEsistente(db: AppDatabase, chiave: string): boolean {
  const fabbricazione = bloccoGuida(db, 'oggetti-guida')?.fabbricazione;
  return elencoDi(fabbricazione && typeof fabbricazione === 'object' ? (fabbricazione as Riga).ricette : null).some((r) => r.attrezzo === chiave);
}
/** Vero se la fonte di una ricompensa esiste ora (stesse fonti e stessi filtri della lettura viva). */
function fonteRicompensaEsiste(db: AppDatabase, tipo: string, chiave: string): boolean {
  if (tipo === 'articolo') {
    return !!db.prepare(`SELECT 1 FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.nascosto = 0 AND n.nascosto = 0 AND a.chiave = ?
      AND (a.catalogo_chiave IS NULL OR EXISTS (SELECT 1 FROM ricompensa_oggetto r WHERE r.fonte_tipo = 'articolo' AND r.fonte_chiave = a.chiave))`).get(chiave);
  }
  if (tipo === 'richiesta') return !!db.prepare('SELECT 1 FROM richiesta WHERE chiave = ?').get(chiave);
  if (tipo === 'domanda') return !!db.prepare('SELECT 1 FROM domanda WHERE chiave IS NOT NULL AND chiave = ?').get(chiave);
  if (tipo === 'esame') return !!db.prepare('SELECT 1 FROM esame WHERE chiave = ?').get(chiave);
  if (tipo === 'confidente') return !!db.prepare('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave);
  if (tipo === 'ricetta') return ricettaEsistente(db, chiave);
  if (tipo === 'covo') {
    const covo = bloccoGuida(db, 'completamento')?.covo;
    return elencoDi(covo && typeof covo === 'object' ? (covo as Riga).premi : null).some((r) => r.nome === chiave);
  }
  if (tipo === 'sfida') {
    const g = bloccoGuida(db, 'sfide');
    const battaglie = g?.battaglieSfida;
    return [...elencoDi(battaglie && typeof battaglie === 'object' ? (battaglie as Riga).elenco : null), ...elencoDi(g?.bossSegreti)].some((r) => r.chiave === chiave);
  }
  return false;
}

/** Un'identità del catalogo: errore se non c'è (o, senza `ancheNascosto`, se è nascosta). */
function rigaOggetto(db: AppDatabase, chiave: string, ancheNascosto = false): RigaCatalogo {
  const r = db.prepare(`SELECT * FROM catalogo_oggetto WHERE chiave = ?${ancheNascosto ? '' : ' AND nascosto = 0'}`).get(chiave) as RigaCatalogo | undefined;
  if (!r) throw new Error('L’oggetto non è presente nel catalogo.');
  return r;
}
function nomiAltri(json: string): string[] {
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : []; } catch { return []; }
}

// ---- La rettifica di una proposta ----

/** Controllo strutturale dei soli campi che la migrazione usa; null = non valida. */
function validaModifica(v: unknown): Modifica | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const m = v as Record<string, unknown>;
  const opz = (k: string, ok: (x: unknown) => boolean) => m[k] === undefined || ok(m[k]);
  const intero = (min: number, max = Number.MAX_SAFE_INTEGER) => (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
  const testo = (min: number, max: number) => (x: unknown) => typeof x === 'string' && x.trim().length >= min && x.trim().length <= max;
  if (m.azione !== 'collega' && m.azione !== 'nascondi' && m.azione !== 'crea') return null;
  if (!opz('ruolo', (x) => x === 'costo') || !opz('prezzo', intero(0)) || !opz('condizioni', (x) => Array.isArray(x) && x.length <= 20)
    || !opz('negozio', testo(1, 600)) || !opz('ordine', intero(0)) || !opz('categoria', eCategoriaOggetto) || !opz('quantita', intero(1))
    || !opz('prima', (x) => x === null || (typeof x === 'object' && !Array.isArray(x))) || !opz('nome_offerta', testo(1, 160))
    || !opz('nota_offerta', (x) => typeof x === 'string' && x.length <= 6000) || !opz('fonte', (x) => typeof x === 'string' && x.length <= 2000)) return null;
  let costo: CostoScambioOggetto | undefined;
  if (m.costo !== undefined) { const c = normalizzaCostoScambio(m.costo); if (!c) return null; costo = c; }
  let ricevuti: Modifica['ricevuti'];
  if (m.ricevuti !== undefined) {
    if (!Array.isArray(m.ricevuti) || m.ricevuti.length > 40) return null;
    const visti = new Set<string>();
    ricevuti = [];
    for (const o of m.ricevuti as unknown[]) {
      if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
      const r = o as Record<string, unknown>;
      if (!testo(1, 600)(r.chiave) || !intero(1, 999999)(r.quantita) || !(r.nota === null || (typeof r.nota === 'string' && r.nota.length <= 6000))
        || Object.keys(r).some((k) => !['chiave', 'quantita', 'nota'].includes(k)) || visti.has(r.chiave as string)) return null;
      visti.add(r.chiave as string);
      ricevuti.push({ chiave: r.chiave as string, quantita: r.quantita as number, nota: r.nota as string | null });
    }
    // un baratto composto crea una sola offerta, con nome e costo in oggetti, senza prezzo
    if (!(m.azione === 'crea' && !!m.nome_offerta && costo?.tipo === 'oggetti' && m.prezzo === undefined)) return null;
  }
  return { ...(m as unknown as Modifica), ...(costo ? { costo } : {}), ...(ricevuti ? { ricevuti } : {}),
    ...(typeof m.nome_offerta === 'string' ? { nome_offerta: m.nome_offerta.trim() } : {}) };
}
function modificaDellaProposta(p: Pick<Proposta, 'modifica_json'>): Modifica | null {
  if (p.modifica_json === null) return null;
  let valore: unknown;
  try { valore = JSON.parse(p.modifica_json) as unknown; } catch { throw new Error('La proposta non è leggibile: nessun dato è stato cambiato.'); }
  const m = validaModifica(valore);
  if (!m) throw new Error('La proposta contiene dati non validi: nessun dato è stato cambiato.');
  return m;
}

// ---- Proposte ----

function leggiProposta(db: AppDatabase, d: ChiaveProposta144): Proposta {
  const base = 'SELECT p.* FROM proposta_abbinamento p WHERE p.riga_tipo = ? AND p.riga_chiave = ? AND p.catalogo_chiave IS ?';
  let righe = db.prepare(`${base} AND p.gruppo = ?`).all(d.riga_tipo, d.riga_chiave, d.catalogo_chiave, d.gruppo) as Proposta[];
  if (!righe.length && !d.gruppo) righe = db.prepare(base).all(d.riga_tipo, d.riga_chiave, d.catalogo_chiave) as Proposta[];
  if (!righe.length) throw new Error('La proposta non esiste più.');
  if (righe.length > 1) throw new Error('La voce ha più contenuti: scegli il gruppo della proposta.');
  const q = righe[0]!;
  if (q.quantita === null ? !(eProdottoRicetta(q) || ['ricetta', 'voce'].includes(q.riga_tipo)) : !Number.isSafeInteger(q.quantita) || q.quantita < 1) throw new Error('La quantità della proposta non è valida.');
  return q;
}
function marca(db: AppDatabase, p: ChiaveProposta144, stato: Proposta['stato']): void {
  db.prepare('UPDATE proposta_abbinamento SET stato = ?,updated_at = ? WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS ?')
    .run(stato, adesso(), p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
  if (stato === 'confermata') db.prepare(`UPDATE proposta_abbinamento SET stato = 'scartata',updated_at = ?
    WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS NOT ? AND stato = 'da-approvare'`)
    .run(adesso(), p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
}

function applicaArticolo(db: AppDatabase, d: LegameCompleto & { catalogo_chiave: string }, m: Modifica | null): void {
  const attuale = db.prepare('SELECT * FROM articolo WHERE chiave = ?').get(d.riga_chiave) as Riga | undefined;
  if (m?.azione === 'crea') {
    if (attuale) throw new Error('La chiave è stata usata dopo la proposta: non sovrascrivo la riga.');
    if (!m.negozio || !db.prepare('SELECT 1 FROM negozio WHERE chiave = ? AND nascosto = 0').get(m.negozio)) throw new Error('Il negozio della proposta non è più disponibile.');
    const o = rigaOggetto(db, d.catalogo_chiave);
    const composto = m.ricevuti !== undefined;
    if (composto && (m.costo?.tipo !== 'oggetti' || !m.costo.oggetti.some((c) => c.chiave === o.chiave))) throw new Error('La proposta composta cita una capsula diversa: rileggi le alternative.');
    for (const chiave of new Set([...(m.ricevuti?.map((r) => r.chiave) ?? []), ...(m.costo?.tipo === 'oggetti' ? m.costo.oggetti.map((c) => c.chiave) : [])])) rigaOggetto(db, chiave);
    if (composto && db.prepare("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(d.riga_chiave)) {
      throw new Error('Esistono già collegamenti a questa offerta: nessun risultato viene sovrascritto.');
    }
    const ordine = (db.prepare('SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM articolo WHERE negozio_chiave = ?').get(m.negozio) as { n: number }).n;
    db.prepare(`INSERT INTO articolo(chiave,negozio_chiave,ordine,nome,categoria,prezzo,condizioni_json,catalogo_chiave,costo_json,nota,fonte,origine,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'utente',?)`).run(d.riga_chiave, m.negozio, ordine, composto ? m.nome_offerta : '', 'altro',
        m.prezzo ?? null, JSON.stringify(m.condizioni ?? []), composto ? null : o.chiave,
        m.costo ? JSON.stringify(m.costo) : null, m.nota_offerta ?? null, m.fonte ?? 'Proposta della guida confermata', adesso());
    for (const [i, r] of (m.ricevuti ?? []).entries()) db.prepare(`INSERT INTO ricompensa_oggetto
      (fonte_tipo,fonte_chiave,catalogo_chiave,quantita,ordine,nota) VALUES ('articolo',?,?,?,?,?)`).run(d.riga_chiave, r.chiave, r.quantita, i, r.nota);
    return;
  }
  if (!attuale) throw new Error('La riga del listino non esiste.');
  if (!d.togli && m?.ruolo !== 'costo' && m?.azione !== 'nascondi'
    && db.prepare("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(d.riga_chiave)) {
    throw new Error('Questa offerta ha risultati separati: correggili dal listino prima di collegare un oggetto singolo.');
  }
  if (d.togli && attuale.catalogo_chiave !== d.catalogo_chiave) throw new Error('Il legame è cambiato: non scollego un altro oggetto.');
  const campi: Record<string, unknown> = {};
  if (m?.ruolo === 'costo') {
    if (attuale.costo_json != null) throw new Error('Il costo è stato impostato dopo la proposta: verifica il valore attuale.');
    campi.costo_json = JSON.stringify({ tipo: 'oggetti', oggetti: [{ chiave: d.catalogo_chiave, quantita: d.quantita }] });
  } else if (m?.azione === 'nascondi') campi.nascosto = 1;
  else campi.catalogo_chiave = d.togli ? null : d.catalogo_chiave;
  if (m?.prezzo !== undefined) campi.prezzo = m.prezzo;
  if (m?.condizioni !== undefined) campi.condizioni_json = JSON.stringify(m.condizioni);
  if (m?.prima) {
    const verificati = [...new Set([...Object.keys(campi), 'nome', 'nome_it'])];
    if (verificati.some((c) => c in m.prima! && attuale[c] !== m.prima![c])) throw new Error('La riga è stata corretta dopo la proposta. Nessun valore è stato sovrascritto: rileggi i dati attuali.');
  }
  const colonne = Object.keys(campi);
  db.prepare(`UPDATE articolo SET ${colonne.map((c) => `${c} = ?`).join(',')},seed_json = COALESCE(seed_json,?),origine = 'utente',updated_at = ? WHERE chiave = ?`)
    .run(...Object.values(campi), JSON.stringify(attuale), adesso(), d.riga_chiave);
}

function applicaLegame(db: AppDatabase, d: LegameCompleto & { catalogo_chiave: string }, m: Modifica | null, additivo = false): void {
  if (d.quantita === null ? !eProdottoRicetta(d) : !Number.isSafeInteger(d.quantita) || d.quantita < 1) throw new Error('Indica una quantità positiva; solo la resa di una ricetta può restare non indicata.');
  if (d.riga_tipo === 'articolo') { applicaArticolo(db, d, m); return; }
  if (d.riga_tipo === 'regalo') {
    const [confidente, ordine] = regalo(d.riga_chiave);
    const attuale = db.prepare('SELECT catalogo_chiave FROM confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').get(confidente, ordine) as { catalogo_chiave: string | null } | undefined;
    if (!attuale) throw new Error('La riga del regalo non esiste.');
    if (d.togli && attuale.catalogo_chiave !== d.catalogo_chiave) throw new Error('Il legame è cambiato: non scollego un altro oggetto.');
    db.prepare('UPDATE confidente_regalo SET catalogo_chiave = ? WHERE confidente_chiave = ? AND ordine = ?').run(d.togli ? null : d.catalogo_chiave, confidente, ordine);
    return;
  }
  if (d.riga_tipo === 'catalogo') throw new Error('La fusione si esegue come gesto esplicito, non come rimozione di un legame.');
  let tabella: string; let chiavi: string[]; let valori: string[]; let ordine: boolean;
  if (d.riga_tipo === 'voce') {
    if (!db.prepare('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(d.riga_chiave)) throw new Error('La voce non esiste.');
    tabella = 'voce_oggetto'; chiavi = ['voce_chiave']; valori = [d.riga_chiave]; ordine = true;
  } else if (d.riga_tipo === 'ricetta') {
    if (!ricettaEsistente(db, d.riga_chiave)) throw new Error('La ricetta non esiste.');
    tabella = 'ricetta_materiale'; chiavi = ['ricetta']; valori = [d.riga_chiave]; ordine = false;
  } else {
    const [tipo, chiave] = separa(d.riga_chiave);
    if (!fonteRicompensaEsiste(db, tipo, chiave)) throw new Error('La fonte della ricompensa non esiste.');
    if (tipo === 'articolo' && !d.togli && (db.prepare('SELECT catalogo_chiave FROM articolo WHERE chiave = ?').get(chiave) as Riga)?.catalogo_chiave != null) {
      throw new Error('Questa offerta vende già un oggetto singolo. Scollegalo prima di aggiungere risultati separati.');
    }
    tabella = 'ricompensa_oggetto'; chiavi = ['fonte_tipo', 'fonte_chiave']; valori = [tipo, chiave]; ordine = true;
  }
  const dove = chiavi.map((c) => `${c} = ?`).join(' AND ');
  if (d.togli) { db.prepare(`DELETE FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).run(...valori, d.catalogo_chiave); return; }
  let ordinePrecedente: number | undefined;
  if (d.precedente_catalogo_chiave) {
    const precedente = db.prepare(`SELECT * FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).get(...valori, d.precedente_catalogo_chiave) as { nota?: string | null; ordine?: number } | undefined;
    if (!precedente) throw new Error('Il collegamento che stavi modificando non esiste più: ricarica la voce.');
    if (ordine) {
      ordinePrecedente = precedente.ordine;
      if (d.nota === undefined) d = { ...d, nota: precedente.nota ?? null };
    }
    if (d.precedente_catalogo_chiave !== d.catalogo_chiave) {
      if (db.prepare(`SELECT 1 FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).get(...valori, d.catalogo_chiave)) throw new Error('L’oggetto scelto è già collegato a questa fonte.');
      db.prepare(`DELETE FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).run(...valori, d.precedente_catalogo_chiave);
    }
  }
  const colonne = [...chiavi, 'catalogo_chiave', 'quantita', ...(ordine ? ['ordine', 'nota'] : [])];
  // La resa di una ricetta è il totale dichiarato, non un altro contenuto da sommare al precedente.
  const somma = additivo && !eProdottoRicetta(d);
  if (somma && d.quantita !== null) {
    const precedente = db.prepare(`SELECT quantita FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).get(...valori, d.catalogo_chiave) as { quantita: number } | undefined;
    if (precedente && (!Number.isSafeInteger(precedente.quantita) || !Number.isSafeInteger(precedente.quantita + d.quantita))) throw new Error('La quantità complessiva supera l’intervallo consentito: nessun contenuto è stato cambiato.');
  }
  const n = ordinePrecedente ?? (ordine ? (db.prepare(`SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM ${tabella} WHERE ${dove}`).get(...valori) as { n: number }).n : 0);
  const notaAggiornata = !ordine ? '' : additivo
    ? ',nota = CASE WHEN excluded.nota IS NULL THEN nota WHEN nota IS NULL OR nota = excluded.nota THEN excluded.nota ELSE nota || char(10) || excluded.nota END'
    : d.nota !== undefined ? ',nota = excluded.nota' : '';
  db.prepare(`INSERT INTO ${tabella}(${colonne.join(',')}) VALUES (${colonne.map(() => '?').join(',')})
    ON CONFLICT(${[...chiavi, 'catalogo_chiave'].join(',')}) DO UPDATE SET quantita = ${somma ? `${tabella}.quantita + excluded.quantita` : 'excluded.quantita'}${notaAggiornata}`)
    .run(...valori, d.catalogo_chiave, d.quantita, ...(ordine ? [n, d.nota ?? null] : []));
}

/** Conferma una proposta (stessi controlli del gesto manuale). Per una fusione (`riga_tipo` «catalogo») esegue il gesto di fusione. */
export function confermaProposta144(db: AppDatabase, dati: ChiaveProposta144): void {
  db.transaction(() => {
    const p = leggiProposta(db, dati);
    if (p.stato === 'confermata') return;
    if (p.stato === 'scartata') throw new Error('Questa proposta è già stata scartata. Collega la fonte a mano se vuoi modificarla.');
    if (p.catalogo_chiave === null) throw new Error('Scegli un oggetto prima di confermare la proposta.');
    verificaSnapshotProposta(db, p);
    const fratelli = fratelliValidi(db, p);
    rigaOggetto(db, p.catalogo_chiave);
    const dopo = () => marca(db, p, 'confermata');
    if (p.riga_tipo === 'catalogo') fondiOggetti144(db, p.riga_chiave, p.catalogo_chiave, dopo);
    else {
      applicaLegame(db, { ...dati, catalogo_chiave: p.catalogo_chiave, gruppo: p.gruppo, quantita: p.quantita, nota: p.nota, togli: false }, modificaDellaProposta(p), true);
      dopo();
      for (const f of fratelli) salvaSnapshotProposta(db, f, snapshotConVersioneSalvata(db, f));
    }
  })();
}

/**
 * Conferma una proposta indicando la quantità (il gesto «scegli l'oggetto con la quantità» del vecchio pannello): solo per le
 * proposte che non sono fusioni, senza togliere né sostituire un legame.
 */
export function confermaPropostaConQuantita144(db: AppDatabase, dati: ChiaveProposta144 & { catalogo_chiave: string }, quantita: number): void {
  db.transaction(() => {
    rigaOggetto(db, dati.catalogo_chiave);
    if (dati.riga_tipo === 'catalogo') throw new Error('Una fusione non ha una quantità.');
    const originale = leggiProposta(db, dati);
    if (originale.stato !== 'da-approvare') throw new Error('La proposta è già stata gestita: rileggi il gruppo.');
    verificaSnapshotProposta(db, originale);
    const fratelli = fratelliValidi(db, originale);
    const modifica = modificaDellaProposta(originale);
    const legame: LegameCompleto & { catalogo_chiave: string } = { ...dati, quantita, nota: null, togli: false };
    const p: ChiaveProposta144 & { modifica_json: string | null } = { riga_tipo: legame.riga_tipo, riga_chiave: legame.riga_chiave,
      gruppo: originale.gruppo, catalogo_chiave: legame.catalogo_chiave, modifica_json: originale.modifica_json };
    const dopo = () => {
      db.prepare(`INSERT OR IGNORE INTO proposta_abbinamento(riga_tipo,riga_chiave,gruppo,catalogo_chiave,quantita,motivo,certezza,stato,modifica_json,nota,fonte_snapshot_json,updated_at)
        VALUES (?,?,?,?,?,?,'certa','da-approvare',?,?,?,?)`).run(p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave, legame.quantita, 'Oggetto scelto dall’utente', p.modifica_json, legame.nota ?? null,
        originale.fonte_snapshot_json ?? null, adesso());
      if (originale.quantita === null && legame.quantita !== null) db.prepare(`UPDATE proposta_abbinamento SET quantita = ?,
        nota = COALESCE(nota || char(10),'') || 'Quantità indicata dall’utente alla conferma.'
        WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave = ?`)
        .run(legame.quantita, p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
      marca(db, p, 'confermata');
    };
    applicaLegame(db, legame, modifica, true);
    dopo();
    for (const f of fratelli) salvaSnapshotProposta(db, f, snapshotConVersioneSalvata(db, f));
  })();
}

// ---- Fusione di due identità del catalogo ----

function trasferisciContenuti(db: AppDatabase, da: string, a: string): void {
  const profili = [
    { tabella: 'voce_oggetto', chiavi: ['voce_chiave'], campi: ['voce_chiave', 'quantita', 'ordine', 'nota'] },
    { tabella: 'ricompensa_oggetto', chiavi: ['fonte_tipo', 'fonte_chiave'], campi: ['fonte_tipo', 'fonte_chiave', 'quantita', 'ordine', 'nota'] },
    { tabella: 'ricetta_materiale', chiavi: ['ricetta'], campi: ['ricetta', 'quantita'] },
  ];
  for (const p of profili) {
    const righe = db.prepare(`SELECT * FROM ${p.tabella} WHERE catalogo_chiave = ?`).all(da) as Riga[];
    const dove = p.chiavi.map((c) => `${c} = ?`).join(' AND ');
    for (const r of righe) {
      const valoriChiave = p.chiavi.map((c) => r[c]);
      const esistente = db.prepare(`SELECT * FROM ${p.tabella} WHERE catalogo_chiave = ? AND ${dove}`).get(a, ...valoriChiave) as Riga | undefined;
      if (esistente) {
        if (p.tabella === 'ricompensa_oggetto' && r.fonte_tipo === 'articolo' && r.nota !== esistente.nota) throw new Error('Il baratto distingue risultati con note diverse: sistemali dal listino prima di fondere le identità.');
        if (esistente.quantita !== r.quantita) throw new Error('Le due identità hanno quantità diverse nello stesso contenuto o materiale. Correggi il legame prima della fusione; nessun dato è stato cambiato.');
        // I due nomi descrivevano lo stesso contenuto: non si raddoppia la quantità. Le due note restano.
        if (p.campi.includes('nota') && r.nota && r.nota !== esistente.nota) {
          const nota = [...new Set([esistente.nota, r.nota].filter((n): n is string => typeof n === 'string' && n.length > 0))].join('\n');
          db.prepare(`UPDATE ${p.tabella} SET nota = ? WHERE catalogo_chiave = ? AND ${dove}`).run(nota, a, ...valoriChiave);
        }
      } else db.prepare(`INSERT INTO ${p.tabella}(catalogo_chiave,${p.campi.join(',')}) VALUES (?,${p.campi.map(() => '?').join(',')})`)
        .run(a, ...p.campi.map((c) => r[c]));
      db.prepare(`DELETE FROM ${p.tabella} WHERE catalogo_chiave = ? AND ${dove}`).run(da, ...valoriChiave);
    }
  }
}

function trasferisciCosti(db: AppDatabase, da: string, a: string): void {
  for (const r of db.prepare('SELECT chiave,costo_json FROM articolo WHERE costo_json IS NOT NULL').all() as Array<{ chiave: string; costo_json: string }>) {
    const citaOrigine = r.costo_json.includes(JSON.stringify(da));
    let costo: unknown;
    try { costo = JSON.parse(r.costo_json) as unknown; } catch {
      if (citaOrigine) throw new Error('Uno scambio che cita l’oggetto non è leggibile: nessun dato è stato cambiato.');
      continue;
    }
    const c = costo && typeof costo === 'object' && !Array.isArray(costo) ? costo as Record<string, unknown> : null;
    if (c?.tipo !== 'oggetti' || !Array.isArray(c.oggetti)) {
      if (citaOrigine) throw new Error('Uno scambio cita l’oggetto in una struttura non valida. Correggilo prima di fondere; nessun dato è stato cambiato.');
      continue;
    }
    if (!c.oggetti.some((v: unknown) => v && typeof v === 'object' && (v as Riga).chiave === da)) continue;
    const uniti = new Map<string, number>();
    for (const valore of c.oggetti as unknown[]) {
      const v = valore && typeof valore === 'object' ? valore as Riga : {};
      if (typeof v.chiave !== 'string' || typeof v.quantita !== 'number' || !Number.isSafeInteger(v.quantita) || v.quantita < 1) throw new Error('Uno scambio che cita l’oggetto ha un costo non valido. Correggilo prima di fondere; nessun dato è stato cambiato.');
      const chiave = v.chiave === da ? a : v.chiave;
      const quantita = (uniti.get(chiave) ?? 0) + v.quantita;
      if (!Number.isSafeInteger(quantita)) throw new Error('La quantità dello scambio supera l’intervallo consentito.');
      uniti.set(chiave, quantita);
    }
    db.prepare('UPDATE articolo SET costo_json = ?,updated_at = ? WHERE chiave = ? AND costo_json = ?')
      .run(JSON.stringify({ ...c, oggetti: [...uniti].map(([chiave, quantita]) => ({ chiave, quantita })) }), adesso(), r.chiave, r.costo_json);
  }
}

/** Solo riferimenti tipizzati nello snapshot ripristinabile, mai testi o registri del Cestino. */
function trasferisciSnapshotArticoli(db: AppDatabase, da: string, a: string): void {
  for (const r of db.prepare('SELECT chiave,seed_json FROM articolo WHERE seed_json IS NOT NULL').all() as Array<{ chiave: string; seed_json: string }>) {
    let snapshot: Riga;
    try {
      const v = JSON.parse(r.seed_json) as unknown;
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('snapshot non oggetto');
      snapshot = v as Riga;
    } catch {
      if (r.seed_json.includes(da)) throw new Error('Uno snapshot non leggibile cita l’oggetto: correggi il riferimento prima della fusione.');
      continue;
    }
    let cambiato = false;
    if (snapshot.catalogo_chiave === da) { snapshot.catalogo_chiave = a; cambiato = true; }
    if (snapshot.oggetto_fonte === 'catalogo' && snapshot.oggetto_chiave === da) { snapshot.oggetto_chiave = a; cambiato = true; }
    const costo = normalizzaCostoScambio(snapshot.costo_json);
    if (!costo && typeof snapshot.costo_json === 'string' && snapshot.costo_json.includes(JSON.stringify(da))) throw new Error('Il costo in uno snapshot non è leggibile: nessuna fusione applicata.');
    if (costo?.tipo === 'oggetti' && costo.oggetti.some((o) => o.chiave === da)) {
      const componenti = new Map<string, number>();
      for (const o of costo.oggetti) { const k = o.chiave === da ? a : o.chiave; componenti.set(k, (componenti.get(k) ?? 0) + o.quantita); }
      const nuovo = normalizzaCostoScambio({ tipo: 'oggetti', oggetti: [...componenti].map(([chiave, quantita]) => ({ chiave, quantita })) });
      if (!nuovo) throw new Error('La fusione supererebbe i limiti del costo originale di un articolo.');
      snapshot.costo_json = JSON.stringify(nuovo); cambiato = true;
    }
    if (cambiato) db.prepare('UPDATE articolo SET seed_json = ? WHERE chiave = ? AND seed_json = ?').run(JSON.stringify(snapshot), r.chiave, r.seed_json);
  }
}

/** Anche i riferimenti interni alle rettifiche seguono la fusione nel registro reversibile. */
function trasferisciRiferimentiDelleProposte(db: AppDatabase, da: string, a: string): void {
  const righe = db.prepare('SELECT riga_tipo,riga_chiave,gruppo,catalogo_chiave,modifica_json FROM proposta_abbinamento WHERE modifica_json IS NOT NULL').all() as Array<{
    riga_tipo: string; riga_chiave: string; gruppo: string; catalogo_chiave: string | null; modifica_json: string;
  }>;
  const costoTrasferito = (valore: unknown) => {
    const c = normalizzaCostoScambio(valore);
    if (!c) throw new Error('Una proposta che cita l’oggetto contiene un costo non valido. Gestiscila prima della fusione.');
    if (c.tipo !== 'oggetti') return c;
    const uniti = new Map<string, number>();
    for (const o of c.oggetti) { const k = o.chiave === da ? a : o.chiave; uniti.set(k, (uniti.get(k) ?? 0) + o.quantita); }
    const out = normalizzaCostoScambio({ tipo: 'oggetti', oggetti: [...uniti].map(([chiave, quantita]) => ({ chiave, quantita })) });
    if (!out) throw new Error('La fusione supererebbe i limiti del costo di una proposta. Nessuna proposta viene cambiata.');
    return out;
  };
  for (const r of righe) {
    const citaOrigine = r.modifica_json.includes(da);
    let grezzi: Record<string, unknown>;
    try { grezzi = JSON.parse(r.modifica_json) as Record<string, unknown>; } catch {
      if (citaOrigine) throw new Error('Una proposta che cita l’oggetto non è leggibile.');
      continue;
    }
    const m = validaModifica(grezzi);
    if (!m) {
      if (citaOrigine) throw new Error('Una proposta che cita l’oggetto non è compatibile: gestiscila prima della fusione.');
      continue;
    }
    let cambiato = false;
    if (m.costo?.tipo === 'oggetti' && m.costo.oggetti.some((o) => o.chiave === da)) { grezzi.costo = costoTrasferito(m.costo); cambiato = true; }
    if (m.ricevuti?.some((o) => o.chiave === da)) {
      const uniti = new Map<string, NonNullable<Modifica['ricevuti']>[number]>();
      for (const o of m.ricevuti) {
        const chiave = o.chiave === da ? a : o.chiave; const prima = uniti.get(chiave);
        if (prima && prima.nota !== o.nota) throw new Error('La proposta distingue risultati con note diverse: non posso sommare premi alternativi.');
        if (prima && prima.quantita !== o.quantita) throw new Error('La proposta ha quantità diverse per lo stesso risultato: correggile prima di fondere.');
        uniti.set(chiave, { ...o, chiave });
      }
      grezzi.ricevuti = [...uniti.values()];
      cambiato = true;
    }
    if (m.prima?.catalogo_chiave === da) { grezzi.prima = { ...m.prima, catalogo_chiave: a }; cambiato = true; }
    const primaCosto = normalizzaCostoScambio(m.prima?.costo_json);
    if (!primaCosto && typeof m.prima?.costo_json === 'string' && m.prima.costo_json.includes(JSON.stringify(da))) throw new Error('Lo snapshot di una proposta cita l’oggetto in un costo non valido.');
    if (primaCosto?.tipo === 'oggetti' && primaCosto.oggetti.some((o) => o.chiave === da)) {
      grezzi.prima = { ...(grezzi.prima as Record<string, unknown>), costo_json: JSON.stringify(costoTrasferito(primaCosto)) };
      cambiato = true;
    }
    if (!cambiato) continue;
    if (!validaModifica(grezzi)) throw new Error('La fusione produrrebbe una proposta incompatibile: nessuna modifica applicata.');
    db.prepare(`UPDATE proposta_abbinamento SET modifica_json = ?,updated_at = ?
      WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS ? AND modifica_json = ?`)
      .run(JSON.stringify(grezzi), adesso(), r.riga_tipo, r.riga_chiave, r.gruppo, r.catalogo_chiave, r.modifica_json);
  }
}

function stessaRettifica(prima: unknown, altra: unknown): boolean {
  if (prima === null && altra === null) return true;
  if (typeof prima !== 'string' || typeof altra !== 'string') return false;
  try { return isDeepStrictEqual(JSON.parse(prima) as unknown, JSON.parse(altra) as unknown); } catch { return false; }
}

function trasferisciProposte(db: AppDatabase, da: string, a: string): void {
  const righe = db.prepare('SELECT * FROM proposta_abbinamento WHERE catalogo_chiave = ?').all(da) as Riga[];
  const leggiDestinazione = db.prepare('SELECT quantita,modifica_json,stato FROM proposta_abbinamento WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave = ?');
  for (const r of righe) {
    const esistente = leggiDestinazione.get(r.riga_tipo, r.riga_chiave, r.gruppo, a) as Riga | undefined;
    const pendente = esistente && (esistente.stato === 'da-approvare' || r.stato === 'da-approvare');
    if (pendente && esistente.stato !== 'scartata' && r.stato !== 'scartata'
      && (esistente.quantita !== r.quantita || !stessaRettifica(esistente.modifica_json, r.modifica_json))) {
      throw new Error('Le due identità hanno proposte dello stesso gruppo con quantità o rettifiche diverse. Gestiscile prima di fondere; nessuna proposta viene persa.');
    }
    db.prepare(`INSERT INTO proposta_abbinamento(riga_tipo,riga_chiave,gruppo,catalogo_chiave,quantita,motivo,certezza,stato,modifica_json,fonte_snapshot_json,nota,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(riga_tipo,riga_chiave,gruppo,catalogo_chiave) DO UPDATE SET
      quantita = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.quantita ELSE quantita END,
      modifica_json = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.modifica_json ELSE modifica_json END,
      fonte_snapshot_json = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.fonte_snapshot_json ELSE fonte_snapshot_json END,
      motivo = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.motivo ELSE motivo END,
      certezza = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.certezza ELSE certezza END,
      stato = CASE WHEN excluded.riga_tipo = 'catalogo' AND excluded.riga_chiave = excluded.catalogo_chiave THEN 'scartata'
        WHEN proposta_abbinamento.stato = 'confermata' OR excluded.stato = 'confermata' THEN 'confermata'
        WHEN proposta_abbinamento.stato = 'da-approvare' OR excluded.stato = 'da-approvare' THEN 'da-approvare' ELSE 'scartata' END,
      nota = CASE WHEN excluded.nota IS NULL THEN nota WHEN nota IS NULL OR nota = excluded.nota THEN excluded.nota ELSE nota || char(10) || excluded.nota END,
      updated_at = excluded.updated_at`).run(r.riga_tipo, r.riga_chiave, r.gruppo, a, r.quantita, r.motivo, r.certezza,
        r.riga_tipo === 'catalogo' && r.riga_chiave === a ? 'scartata' : r.stato, r.modifica_json, r.fonte_snapshot_json, r.nota, adesso());
  }
  db.prepare('DELETE FROM proposta_abbinamento WHERE catalogo_chiave = ?').run(da);
}

/** I riferimenti alle fonti originarie seguono la fusione e tornano indietro col Cestino. */
function trasferisciFontiCatalogo(db: AppDatabase, da: string, a: string | null): void {
  for (const tabella of ['oggetto', 'libro', 'film', 'attivita']) {
    db.prepare(`UPDATE ${tabella} SET catalogo_chiave = ? WHERE catalogo_chiave = ?`).run(a, da);
  }
  for (const colonna of ['cristallo_chiave', 'anello_chiave']) db.prepare(`UPDATE trasformazione_oggetto SET ${colonna} = ? WHERE ${colonna} = ?`).run(a, da);
  for (const r of db.prepare('SELECT chiave,json FROM dati_guida WHERE chiave IN (SELECT value FROM json_each(?)) AND json LIKE ?')
    .all(JSON.stringify(BLOCCHI_GUIDA_CATALOGO), '%"catalogoChiave"%') as Array<{ chiave: string; json: string }>) {
    let guida: unknown;
    try { guida = JSON.parse(r.json) as unknown; } catch {
      throw new Error('Una fonte con riferimenti al catalogo non è leggibile: nessun collegamento viene eliminato.');
    }
    if (cambiaRiferimentiCatalogoGuida(guida, da, a)) db.prepare('UPDATE dati_guida SET json = ? WHERE chiave = ? AND json = ?')
      .run(JSON.stringify(guida), r.chiave, r.json);
  }
}

/** Una lettura conserva la sua chiave e il suo avanzamento: non accorpa due progressi distinti. */
function verificaFontiLetturaFusione(db: AppDatabase, da: string, a: string): void {
  const fonti: Array<{ tipo: string; chiave: string; catalogo: string }> = [];
  for (const [tabella, tipo] of [['libro', 'libro'], ['film', 'film'], ['attivita', 'videogioco']]) {
    for (const r of db.prepare(`SELECT chiave,catalogo_chiave AS catalogo FROM ${tabella} WHERE catalogo_chiave IN (?,?)${tabella === 'attivita' ? " AND tipo = 'videogioco'" : ''}`)
      .all(da, a) as Array<{ chiave: string; catalogo: string }>) fonti.push({ ...r, tipo: tipo! });
  }
  if (fonti.length > 1) throw new Error('Queste identità hanno letture, visioni o progressi distinti: la fusione non può accorparli.');
  if (fonti.length) {
    const destinazione = db.prepare('SELECT categoria FROM catalogo_oggetto WHERE chiave = ?').get(a) as { categoria: string } | undefined;
    if (destinazione?.categoria !== fonti[0]!.tipo) throw new Error('La destinazione deve conservare il tipo della lettura collegata.');
  }
}

/** `dopo` serve alla conferma: anche il cambio di stato delle proposte si annulla rimettendo la fusione dal Cestino. */
export function fondiOggetti144(db: AppDatabase, da: string, a: string, dopo?: () => void): void {
  if (da === a) throw new Error('Scegli due oggetti diversi.');
  const origine = rigaOggetto(db, da, true); const destinazione = rigaOggetto(db, a);
  verificaFontiLetturaFusione(db, da, a);
  if (origine.sottocategoria === 'seme' && (destinazione.categoria !== 'chiave' || (destinazione.sottocategoria !== null && destinazione.sottocategoria !== 'seme'))) {
    throw new Error('La destinazione deve conservare la classificazione di Seme del Palazzo.');
  }
  const letturaOrigine = LETTURE.has(origine.fonte_tipo);
  const letturaDestinazione = LETTURE.has(destinazione.fonte_tipo);
  if (letturaOrigine && (destinazione.categoria !== origine.fonte_tipo || (letturaDestinazione
    && (destinazione.fonte_tipo !== origine.fonte_tipo || destinazione.fonte_chiave !== origine.fonte_chiave)))) {
    throw new Error('Le due identità hanno letture, visioni o progressi distinti: non si fondono perdendo un avanzamento.');
  }
  conCestino144(db, { tipo: 'oggetto', chiave: da, nome: origine.nome, contesto: `Fuso in «${destinazione.nome}»` }, () => db.transaction(() => {
    const fontiPrima = fontiPropostePrimaDellaFusione(db);
    trasferisciContenuti(db, da, a);
    trasferisciCosti(db, da, a);
    trasferisciSnapshotArticoli(db, da, a);
    db.prepare('UPDATE articolo SET catalogo_chiave = ? WHERE catalogo_chiave = ?').run(a, da);
    db.prepare('UPDATE confidente_regalo SET catalogo_chiave = ? WHERE catalogo_chiave = ?').run(a, da);
    // `regalo_partita` (schema `utente`) NON si tocca: la migrazione di gioco non scrive nelle partite. I nomi storici e le date di
    // consegna restano; la vecchia chiave si risolve verso la nuova con l'alias della fusione nel Cestino.
    trasferisciRiferimentiDelleProposte(db, da, a);
    trasferisciProposte(db, da, a);
    const nomi = new Map<string, string>();
    for (const nome of [...nomiAltri(destinazione.nomi_altri_json), origine.nome, ...nomiAltri(origine.nomi_altri_json), origine.nome_originale]) {
      if (nome && normalizzaNomeOggetto(nome) !== normalizzaNomeOggetto(destinazione.nome) && !nomi.has(normalizzaNomeOggetto(nome))) nomi.set(normalizzaNomeOggetto(nome), nome);
    }
    if (nomi.size > 60) throw new Error('La fusione supererebbe i 60 nomi alternativi ammessi dal catalogo. Riduci gli alias prima di fondere: nessun nome viene scartato automaticamente.');
    db.prepare('UPDATE catalogo_oggetto SET nomi_altri_json = ?,nome_originale = COALESCE(nome_originale,?),updated_at = ? WHERE chiave = ?')
      .run(JSON.stringify([...nomi.values()]), origine.nome_originale, adesso(), a);
    // I riferimenti alle fonti originarie seguono la fusione e tornano indietro col Cestino.
    trasferisciFontiCatalogo(db, da, a);
    if (origine.sottocategoria === 'seme') db.prepare("UPDATE catalogo_oggetto SET sottocategoria = 'seme' WHERE chiave = ?").run(a);
    db.prepare('DELETE FROM catalogo_oggetto WHERE chiave = ?').run(da);
    if (letturaOrigine && !letturaDestinazione) db.prepare('UPDATE catalogo_oggetto SET fonte_tipo = ?,fonte_chiave = ?,updated_at = ? WHERE chiave = ?')
      .run(origine.fonte_tipo, origine.fonte_chiave, adesso(), a);
    // Le altre fusioni che partivano dall'identità eliminata non devono restare azioni pendenti in errore.
    db.prepare("UPDATE proposta_abbinamento SET stato = 'scartata',updated_at = ? WHERE riga_tipo = 'catalogo' AND riga_chiave = ? AND stato = 'da-approvare'").run(adesso(), da);
    dopo?.();
    invalidaSnapshotDopoFusione(db, fontiPrima);
  })());
}
