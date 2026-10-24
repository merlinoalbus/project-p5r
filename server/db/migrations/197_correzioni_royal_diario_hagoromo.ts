// ============================================================
// 197 — correzioni Royal del Diario e di Hagoromo (L11 · R11-10c/11, M-C; dati: `lotti/L11/M-C-dati-royal-2026-10-24.md`)
// ============================================================
//
// Ogni correzione si applica solo se la voce è ancora com'era (guardia sul valore attuale); se è già come dopo, si salta; se è diversa da entrambe, la migrazione
// si ferma senza toccare niente. Non cambia uid né testo salvo dove detto; nessuna voce del Diario validato (fino al 1° giugno) è toccata; le spunte delle
// partite (per uid) non si muovono. Ciò che prima era in colonne che `testo_precedente_json` non conserva (data, fascia, ordine, tipo) va in
// `dati_guida.archivio-correzioni-diario-l11`, con le divergenze fra fonti dichiarate e non corrette.
//   - Gemelle ×4 (165b8cb3, 85cce8fc, d26ea049, 5cb911c7): `riferimento_chiave` igor → gemelle; il resto invariato; il riferimento di prima in
//     `testo_precedente_json`. Per la voce del 01-11 la certezza è MEDIA (una sola fonte Royal, che non parla del 1/11).
//   - Ustione (889aefc1): 08-16 giorno → 08-17 sera, in fondo alla fascia; la Conoscenza resta +1 (il walkthrough dice +2, la guida dei cruciverba +1).
//   - 10-15 (6c8e3422): tipo esame → altro, nota «La schivata è casuale e dipende dalla Perizia; se riesce, Fascino +2» (il Fascino resta +2; alcune
//     fonti dicono +3).
//   - 10-31 (09077817): «Cruciverba (Stand)», tipo dote, sera, ordine 0 (le freccette passano a ordine 1).
//   - Hagoromo: nota del negozio senza «da verificare» (la fonte Royal conferma); il luogo prende gli orari del negozio (se non ne ha); la voce 06-05
//     (bfa39e5f) passa alla sera, in fondo, con l'effetto articolo del Katsu a pezzettoni.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ARCHIVIO = 'archivio-correzioni-diario-l11';
const errore = (motivo: string): never => { throw new Error(`197: ${motivo}; nessuna modifica applicata.`); };

interface Voce { uid: string; data: string; fascia: string; ordine: number; azione: string; note: string | null; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; testo_precedente_json: string | null }

function voce(db: AppDatabase, prefisso: string): Voce | undefined {
  const r = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${prefisso}%`) as Voce[];
  if (r.length > 1) errore(`${r.length} voci cominciano con ${prefisso}`);
  return r[0];
}

/** Impronta di ogni voce del Diario per uid, senza la colonna `ordine` (che il compattamento può cambiare nelle sorelle). */
function improntePerVoce(db: AppDatabase): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').iterate() as Iterable<Record<string, unknown>>) {
    const { ordine: _o, ...resto } = r;
    m.set(String(r.uid), createHash('sha256').update(JSON.stringify(resto)).digest('hex'));
  }
  return m;
}

function compatta(db: AppDatabase, data: string, fascia: string): void {
  const scrivi = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
  (db.prepare('SELECT uid FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid').all(data, fascia) as Array<{ uid: string }>).forEach((r, i) => scrivi.run(i, r.uid));
}

/** Porta la voce in (data, fascia) alla posizione indicata (`fine` = in fondo), compattando la fascia di partenza e facendo posto nell'arrivo. */
function sposta(db: AppDatabase, v: Voce, data: string, fascia: string, posizione: number | 'fine'): void {
  // (data, indice_guida) è unico: cambiando giorno la voce prende il primo indice libero di quel giorno
  const indice = data === v.data ? null : ((db.prepare('SELECT MAX(indice_guida) FROM main.voce_giornata WHERE data = ?').pluck().get(data) as number | null) ?? -1) + 1;
  if (indice === null) db.prepare('UPDATE main.voce_giornata SET fascia = ?, ordine = -1 WHERE uid = ?').run(fascia, v.uid);
  else db.prepare('UPDATE main.voce_giornata SET data = ?, fascia = ?, ordine = -1, indice_guida = ? WHERE uid = ?').run(data, fascia, indice, v.uid);
  compatta(db, v.data, v.fascia);
  const altre = (db.prepare('SELECT uid FROM main.voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').all(data, fascia, v.uid) as Array<{ uid: string }>).map((r) => r.uid);
  const pos = posizione === 'fine' ? altre.length : Math.min(posizione, altre.length);
  altre.splice(pos, 0, v.uid);
  const scrivi = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
  altre.forEach((uid, i) => scrivi.run(i, uid));
}

const precedente = (v: Voce): string => v.testo_precedente_json ?? JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });

export const migration197: Migration = {
  id: 197, name: 'correzioni_royal_diario_hagoromo',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'dati_guida')) return;
    const adesso = new Date().toISOString();
    const antes = improntePerVoce(db);
    const archivio: Record<string, unknown> = {};
    const toccate = new Set<string>();
    const fatte: string[] = [];

    // ---- Gemelle ×4 ----
    for (const [prefisso, certezza] of [['165b8cb3', 'alta'], ['85cce8fc', 'alta'], ['d26ea049', 'alta'], ['5cb911c7', 'media']] as const) {
      const v = voce(db, prefisso);
      if (!v || v.riferimento_chiave === 'gemelle') continue;
      if (v.riferimento_tipo !== 'confidente' || v.riferimento_chiave !== 'igor') errore(`la voce ${prefisso} non punta a igor`);
      if (!db.prepare("SELECT 1 FROM main.confidente WHERE chiave = 'gemelle'").get()) errore('il Confidente gemelle non esiste');
      db.prepare("UPDATE main.voce_giornata SET riferimento_chiave = 'gemelle', testo_precedente_json = ?, updated_at = ? WHERE uid = ?").run(precedente(v), adesso, v.uid);
      archivio[v.uid] = { correzione: 'riferimento igor → gemelle', certezza };
      toccate.add(v.uid); fatte.push(prefisso);
    }

    // ---- Ustione ----
    const ustione = voce(db, '889aefc1');
    if (ustione && !(ustione.data === '08-17' && ustione.fascia === 'sera')) {
      if (ustione.data !== '08-16' || ustione.fascia !== 'giorno' || ustione.azione !== 'Cruciverba (Ustione)') errore('la voce Ustione non è quella attesa');
      archivio[ustione.uid] = { prima: { data: ustione.data, fascia: ustione.fascia, ordine: ustione.ordine }, divergenza: 'Conoscenza: il walkthrough Royal dà +2, la guida dei cruciverba +1; i dati hanno +1 e restano' };
      sposta(db, ustione, '08-17', 'sera', 'fine');
      db.prepare('UPDATE main.voce_giornata SET updated_at = ? WHERE uid = ?').run(adesso, ustione.uid);
      toccate.add(ustione.uid); fatte.push('889aefc1');
    }

    // ---- 10-15: il gesso ----
    const gesso = voce(db, '6c8e3422');
    if (gesso && gesso.tipo !== 'altro') {
      if (gesso.tipo !== 'esame' || gesso.data !== '10-15') errore('la voce del gesso non è quella attesa');
      archivio[gesso.uid] = { prima: { tipo: gesso.tipo, note: gesso.note }, divergenza: 'Fascino: +2 per la guida dedicata, +3 per il walkthrough di ottobre e Ludo.guide; i dati hanno +2 e restano' };
      db.prepare("UPDATE main.voce_giornata SET tipo = 'altro', note = ?, testo_precedente_json = ?, updated_at = ? WHERE uid = ?")
        .run('La schivata è casuale e dipende dalla Perizia; se riesce, Fascino +2', precedente(gesso), adesso, gesso.uid);
      toccate.add(gesso.uid); fatte.push('6c8e3422');
    }

    // ---- 10-31: il cruciverba Stand ----
    const stand = voce(db, '09077817');
    if (stand && !(stand.fascia === 'sera' && stand.azione === 'Cruciverba (Stand)')) {
      if (stand.data !== '10-31' || stand.fascia !== 'giorno' || stand.tipo !== 'esame') errore('la voce Stand non è quella attesa');
      archivio[stand.uid] = { prima: { fascia: stand.fascia, ordine: stand.ordine, tipo: stand.tipo } };
      db.prepare("UPDATE main.voce_giornata SET azione = 'Cruciverba (Stand)', tipo = 'dote', testo_precedente_json = ?, updated_at = ? WHERE uid = ?").run(precedente(stand), adesso, stand.uid);
      sposta(db, stand, '10-31', 'sera', 0);
      toccate.add(stand.uid); fatte.push('09077817');
    }

    // ---- Hagoromo ----
    let negozioNota = false;
    let luogoOrari = false;
    if (esisteTabella(db, 'negozio') && esisteTabella(db, 'luogo')) {
      const n = db.prepare("SELECT note, orari_json, sede_chiave FROM main.negozio WHERE chiave = 'friggitoria-hagoromo'").get() as { note: string | null; orari_json: string | null; sede_chiave: string | null } | undefined;
      if (n?.note?.includes('(G-033, da verificare)')) {
        archivio['negozio:friggitoria-hagoromo'] = { notaPrima: n.note };
        db.prepare("UPDATE main.negozio SET note = ? WHERE chiave = 'friggitoria-hagoromo'").run(n.note.replace('(G-033, da verificare)', '(G-033; confermata dalla fonte Royal)'));
        negozioNota = true;
      }
      if (n?.orari_json && n.sede_chiave && haColonna(db, 'luogo', 'orari_json')) {
        const l = db.prepare('SELECT orari_json FROM main.luogo WHERE chiave = ?').get(n.sede_chiave) as { orari_json: string | null } | undefined;
        if (l && l.orari_json === null) { db.prepare('UPDATE main.luogo SET orari_json = ? WHERE chiave = ?').run(n.orari_json, n.sede_chiave); luogoOrari = true; }
      }
    }
    const katsu = voce(db, 'bfa39e5f');
    if (katsu && katsu.fascia !== 'sera') {
      if (katsu.data !== '06-05' || !katsu.azione.includes('comprare Katsu a pezzettoni')) errore('la voce del Katsu non è quella attesa');
      archivio[katsu.uid] = { prima: { fascia: katsu.fascia, ordine: katsu.ordine } };
      sposta(db, katsu, '06-05', 'sera', 'fine');
      db.prepare('UPDATE main.voce_giornata SET updated_at = ? WHERE uid = ?').run(adesso, katsu.uid);
      const e = aggiungiEffettoAllaVoce(db, '197', 'bfa39e5f', 'comprare Katsu a pezzettoni', { tipo: 'articolo', articolo: 'friggitoria-hagoromo/katsu-a-pezzettoni' }, 'friggitoria-hagoromo/katsu-a-pezzettoni');
      if (e === 'saltato') errore('l\'effetto articolo del Katsu non si è potuto aggiungere');
      toccate.add(katsu.uid); fatte.push('bfa39e5f');
    }

    if (fatte.length === 0 && !negozioNota && !luogoOrari) return;
    const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO) as string | undefined;
    const blocco = esistente ? JSON.parse(esistente) as { voci?: Record<string, unknown> } : {};
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify({ versione: 1, motivo: 'Correzioni Royal del Diario (L11, M-C, migrazione 197): ciò che le colonne di prima non conservano e le divergenze fra fonti.', voci: { ...(blocco.voci ?? {}), ...archivio } }));

    // controlli: nessuna voce validata (fino al 1° giugno) toccata; le altre voci identiche
    for (const uid of toccate) {
      const d = (db.prepare('SELECT data FROM main.voce_giornata WHERE uid = ?').pluck().get(uid) as string);
      const idx = (m: string): number => ((Number(m.slice(0, 2)) + 8) % 12) * 100 + Number(m.slice(3, 5));
      if (idx(d) <= idx('06-01')) errore(`la voce ${uid} è del Diario validato`);
    }
    const dopo = improntePerVoce(db);
    if (dopo.size !== antes.size) errore('il numero delle voci del Diario è cambiato');
    for (const [uid, imp] of antes) if (!toccate.has(uid) && dopo.get(uid) !== imp) errore(`la voce ${uid}, non toccata, è cambiata`);
    logger.info({ migrazione: 'L11-R11-10c-197', voci: fatte, notaNegozio: negozioNota, orariLuogo: luogoOrari }, 'correzioni Royal del Diario e di Hagoromo');
  },
};
