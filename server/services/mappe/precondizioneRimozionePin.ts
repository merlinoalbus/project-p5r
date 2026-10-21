import { createHash } from 'node:crypto';
import type { AppDatabase } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { PrecondizioneRimozionePinDto, RichiestaRimozionePin } from '../../../shared/rimozionePin.js';
import { canonico } from './precondizioneRaccordoPin.js';
import { chiaveMappa, nomePercorso } from './percorsiMappe.js';
import { modelloAvanzamento } from './statiGuida.js';

type Riga = Record<string, unknown>;
type Schema = 'main' | 'utente';
const quota = (s: string) => `"${s.replaceAll('"', '""')}"`;
const conflitto = (testo: string) => httpErrors.conflict('rimozione-pin-conflitto', testo);

/** Anche i chiamanti interni devono fornire la coppia completa, senza campi ignorati. */
export function richiestaRimozionePin(v: unknown): RichiestaRimozionePin | undefined {
  if (v === undefined) return undefined;
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw httpErrors.badRequest('rimozione-pin-corpo-non-valido', 'Indica soltanto UID e precondizione completa del pin.');
  const o = v as Riga;
  if (!Object.keys(o).length) return undefined;
  if (Object.keys(o).length !== 2 || Object.keys(o).some(k => k !== 'spilloUid' && k !== 'revisioneRimozioneAttesa')
    || !Object.hasOwn(o, 'spilloUid') || !Object.hasOwn(o, 'revisioneRimozioneAttesa') || typeof o.spilloUid !== 'string' || !/^[0-9a-f]{32}$/.test(o.spilloUid)
    || typeof o.revisioneRimozioneAttesa !== 'string' || !/^[0-9a-f]{64}$/.test(o.revisioneRimozioneAttesa)) {
    throw httpErrors.badRequest('rimozione-pin-corpo-non-valido', 'UID e precondizione vanno forniti insieme, senza altri campi.');
  }
  return { spilloUid: o.spilloUid, revisioneRimozioneAttesa: o.revisioneRimozioneAttesa };
}

/** Schema e righe SQL originali: assenza di tabella, NULL, JSON grezzo e BLOB restano distinti. */
function leggi(db: AppDatabase, schema: Schema, tabella: string, dove = '', valori: unknown[] = []) {
  const t = db.prepare(`SELECT sql FROM ${schema}.sqlite_master WHERE type='table' AND name=?`).get(tabella) as { sql: string } | undefined;
  if (!t) return { ddl: null, righe: [] as Riga[] };
  const colonne = db.prepare('SELECT name,pk FROM pragma_table_info(?,?) ORDER BY pk,cid').all(tabella, schema) as Array<{ name: string; pk: number }>;
  const pk = colonne.filter(c => c.pk > 0).map(c => quota(c.name));
  return { ddl: t.sql, righe: db.prepare(`SELECT * FROM ${schema}.${quota(tabella)}${dove ? ` WHERE ${dove}` : ''} ORDER BY ${pk.length ? pk.join(',') : 'rowid'}`).all(...valori) as Riga[] };
}

export function fotografiaRimozionePin(db: AppDatabase, id: number): {
  dto: PrecondizioneRimozionePinDto; pin: Riga; contesto: string; immaginiCondivise: boolean;
} {
  if (!db.inTransaction) throw new Error('La precondizione di rimozione richiede una fotografia transazionale.');
  const pin = db.prepare('SELECT * FROM main.spillo WHERE id=?').get(id) as Riga | undefined;
  if (!pin) throw httpErrors.notFound('spillo-non-trovato', 'Il pin non è più presente.');
  if (!Number.isSafeInteger(id) || id < 1 || typeof pin.uid !== 'string' || !/^[0-9a-f]{32}$/.test(pin.uid) || typeof pin.nome !== 'string') throw conflitto('L’identità originale del pin non è riconoscibile: nessuna rimozione.');
  if (!db.prepare("SELECT 1 FROM pragma_database_list WHERE name='utente'").get()) throw conflitto('Il file delle partite non è collegato: nessuna fotografia parziale.');
  const mappa = typeof pin.mappa_chiave === 'string' ? leggi(db, 'main', 'mappa', 'chiave=?', [pin.mappa_chiave]) : { ddl: null, righe: [] };
  const m = mappa.righe[0];
  const area = typeof m?.area_chiave === 'string' ? leggi(db, 'main', 'area', 'chiave=?', [m.area_chiave]) : { ddl: null, righe: [] };
  const guida = typeof pin.area_guida_chiave === 'string' ? leggi(db, 'main', 'dungeon_area', 'chiave=?', [pin.area_guida_chiave]) : { ddl: null, righe: [] };
  const percorso = typeof pin.mappa_chiave === 'string' ? leggi(db, 'main', 'mappa_percorso', 'mappa_chiave=?', [pin.mappa_chiave]) : { ddl: null, righe: [] };
  const destinazioni = leggi(db, 'main', 'spillo_destinazione', 'spillo_id=? OR spillo_arrivo_id=?', [id, id]);
  const atterraggi = leggi(db, 'main', 'dungeon_atterraggio', 'spillo_id=?', [id]);
  const voci = leggi(db, 'main', 'spillo_voce', 'spillo_id=?', [id]);
  const punti = leggi(db, 'main', 'punto_interesse', "chiave IN (SELECT voce_chiave FROM main.spillo_voce WHERE spillo_id=?) OR (?='punto' AND chiave=?)", [id, pin.riferimento_tipo, pin.riferimento_chiave]);
  const sedi = leggi(db, 'main', 'negozio_sede_spillo', 'spillo_uid=?', [pin.uid]);
  const immagini = leggi(db, 'main', 'spillo_immagine', 'spillo_id=?', [id]);
  const sorgenti = leggi(db, 'main', 'immagine', "EXISTS (SELECT 1 FROM main.spillo_immagine si WHERE si.spillo_id=? AND ((immagine.ambito='spillo' AND immagine.chiave=si.immagine_chiave) OR si.asset=immagine.ambito||'/'||immagine.chiave))", [id]);
  const miniature = leggi(db, 'main', 'immagine_miniatura', "immagine_id IN (SELECT i.id FROM main.immagine i JOIN main.spillo_immagine si ON si.spillo_id=? AND ((i.ambito='spillo' AND i.chiave=si.immagine_chiave) OR si.asset=i.ambito||'/'||i.chiave))", [id]);
  const riferimentiImmagini = leggi(db, 'main', 'spillo_immagine', "EXISTS (SELECT 1 FROM main.immagine i JOIN main.spillo_immagine target ON target.spillo_id=? AND ((i.ambito='spillo' AND i.chiave=target.immagine_chiave) OR target.asset=i.ambito||'/'||i.chiave) WHERE (i.ambito='spillo' AND spillo_immagine.immagine_chiave=i.chiave) OR spillo_immagine.asset=i.ambito||'/'||i.chiave)", [id]);
  const cancellabili = new Set(sorgenti.righe.filter(i => i.ambito === 'spillo' && immagini.righe.some(si => si.immagine_chiave === i.chiave)).map(i => i.chiave));
  const immaginiCondivise = riferimentiImmagini.righe.some(si => si.spillo_id !== id && (cancellabili.has(si.immagine_chiave) || [...cancellabili].some(k => si.asset === `spillo/${k}`)));
  const tutteCondizioni = leggi(db, 'main', 'spillo', 'id<>? AND condizioni_json IS NOT NULL', [id]);
  const cita = (v: unknown): boolean => {
    if (Array.isArray(v)) return v.some(cita);
    if (!v || typeof v !== 'object') return false;
    const o = v as Riga;
    return (o.tipo === 'spillo' && o.spillo === pin.uid) || Object.values(o).some(cita);
  };
  const condizioni = { ddl: tutteCondizioni.ddl, righe: tutteCondizioni.righe.filter(r => {
    if (typeof r.condizioni_json !== 'string') throw conflitto('Una condizione salvata ha formato SQL inatteso: nessuna rimozione.');
    try { return cita(JSON.parse(r.condizioni_json) as unknown); }
    catch { if (r.condizioni_json.includes(pin.uid as string)) throw conflitto('Una condizione non leggibile cita il pin: occorre chiarire il riferimento prima della rimozione.'); return false; }
  }) };
  const stati = leggi(db, 'utente', 'spillo_partita', 'spillo_uid=?', [pin.uid]);
  const divergenze = leggi(db, 'utente', 'divergenza_partita', 'spillo_uid=?', [pin.uid]);
  const infiltrazioni = leggi(db, 'utente', 'spillo_partita_infiltrazione', 'spillo_uid=?', [pin.uid]);
  // AUTOINCREMENT non arretra con restore o svuotamento: impedisce di riusare
  // una vecchia anteprima dopo DELETE e ripristino integralmente identico.
  const sequenza = db.prepare("SELECT seq FROM main.sqlite_sequence WHERE name='cestino'").all() as Array<{ seq: unknown }>;
  const massimo = db.prepare('SELECT MAX(id) AS id FROM main.cestino').get() as { id: number | null };
  if (sequenza.length > 1 || (sequenza.length === 1 && (typeof sequenza[0]!.seq !== 'number' || !Number.isSafeInteger(sequenza[0]!.seq)
    || sequenza[0]!.seq < 0 || sequenza[0]!.seq < (massimo.id ?? 0))) || (!sequenza.length && massimo.id !== null)) throw conflitto('L’epoca del Cestino non è leggibile: nessuna rimozione.');
  const cestino = { sequenza, radici: leggi(db, 'main', 'cestino', "tipo='pin' AND chiave=?", [pin.uid]) };
  const riallineamento = modelloAvanzamento(db).pin.has(id);
  // Il writer esistente riallinea l'intero modello soltanto per un pin con voci:
  // in quel caso il CAS fotografa tutti gli input di quel calcolo, non solo il pin.
  const modello = riallineamento ? {
    punti: leggi(db, 'main', 'punto_interesse'), aree: leggi(db, 'main', 'dungeon_area'), pin: leggi(db, 'main', 'spillo'), voci: leggi(db, 'main', 'spillo_voce'),
    partite: db.prepare('SELECT id FROM utente.partita ORDER BY id').all(), puntiPartita: leggi(db, 'utente', 'punto_partita'),
    pinPartita: leggi(db, 'utente', 'spillo_partita'), divergenze: leggi(db, 'utente', 'divergenza_partita'), infiltrazioni: leggi(db, 'utente', 'spillo_partita_infiltrazione'),
  } : null;
  const revisioneRimozioneAttesa = createHash('sha256').update(canonico({ versione: 1, pin, mappa, area, guida, percorso, destinazioni, atterraggi, voci, punti, sedi, immagini, sorgenti, miniature, riferimentiImmagini, condizioni, stati, divergenze, infiltrazioni, modello, cestino })).digest('hex');
  return { pin, immaginiCondivise, contesto: typeof pin.mappa_chiave === 'string' ? nomePercorso(pin.mappa_chiave, db) : String(guida.righe[0]?.nome ?? ''), dto: {
    spillo: { id, uid: pin.uid, nome: pin.nome, mappa: m && typeof pin.mappa_chiave === 'string' ? { chiave: chiaveMappa(pin.mappa_chiave, db), nome: String(m.nome) } : null, areaGuida: typeof pin.area_guida_chiave === 'string' ? pin.area_guida_chiave : null },
    contenuti: { immagini: immagini.righe.length, voci: punti.righe.length, destinazioniEntranti: destinazioni.righe.filter(d => d.spillo_arrivo_id === id).length, atterraggi: atterraggi.righe.length, sedi: sedi.righe.length,
      stati: stati.righe.length, divergenze: divergenze.righe.length, statiInfiltrazione: infiltrazioni.righe.length, condizioniRiferite: condizioni.righe.length, riallineamento }, revisioneRimozioneAttesa,
  } };
}
