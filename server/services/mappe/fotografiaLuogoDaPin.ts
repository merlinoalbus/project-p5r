// Fotografia conservativa per il solo gesto «crea luogo dal pin esistente».
// Tutte le letture usano la connessione della transazione; nessun RAW esce dal servizio.
import type { AppDatabase } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { slug } from '../../../shared/slug.js';
import { pinCompatibileConNuovoLuogo, type LuogoNuovoDaPin } from '../../../shared/luogoDaPin.js';
import { canonico, verificaPin, type PinDelRaccordo } from './precondizioneRaccordoPin.js';

type Riga = Record<string, unknown>;
export type PinLuogoDaPin = PinDelRaccordo & Riga & { uid: string; nome: string; mappa_chiave: string };
export interface FotografiaLuogoDaPin {
  pin: PinLuogoDaPin;
  mappa: Riga;
  area: Riga;
  quartiere: Riga;
  luoghi: Riga[];
  aree: Riga[];
  relazioni: { destinazioni: Riga[]; legamiVoci: Riga[]; voci: Riga[]; legamiImmagini: Riga[]; immagini: Riga[] };
  collocazioni: Riga[];
  sediPin: Riga[];
  riferimentiCandidata: Riga[];
  stati: Riga;
  cestino: Riga;
}

function conflitto(messaggio: string): never { throw httpErrors.conflict('luogo-da-pin-conflitto', messaggio); }
function oggetto(v: unknown): Riga | null { return v !== null && typeof v === 'object' && !Array.isArray(v) && !Buffer.isBuffer(v) ? v as Riga : null; }
function tabella(db: AppDatabase, schema: 'main' | 'utente', nome: string): boolean {
  return !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
}
function testo(r: Riga, campo: string): string {
  if (typeof r[campo] !== 'string' || !r[campo]) conflitto('Un’identità del contesto non è leggibile. Rivedi il pin prima di creare il luogo.');
  return r[campo] as string;
}

/** La stessa base (senza suffisso) che il creatore ordinario usa per un luogo utente. */
export function chiaveLuogoDaPin(quartiere: string, nome: string): string {
  return `${quartiere}/u-${slug(nome) || 'senza-nome'}`.slice(0, 190);
}

/** Valida l'intero registro: un RAW illeggibile non prova l'assenza di un ripristino in conflitto. */
function passiDelRegistro(db: AppDatabase, schema: 'main' | 'utente', raw: unknown): Array<{ tabella: string; righe: Riga[] }> {
  let passi: unknown;
  try { passi = typeof raw === 'string' ? JSON.parse(raw) as unknown : undefined; }
  catch { conflitto('Un registro del cestino non è leggibile: riconcilialo prima della creazione.'); }
  if (!Array.isArray(passi)) conflitto('Un registro del cestino non ha un formato riconoscibile.');
  const sequenze = new Set<number>();
  return passi.map(v => {
    const p = oggetto(v);
    if (!p || !Number.isSafeInteger(p.seq) || Number(p.seq) < 0 || sequenze.has(Number(p.seq))
      || typeof p.tabella !== 'string' || !p.tabella || typeof p.op !== 'string' || !['D', 'U', 'I'].includes(p.op)
      || ((p.op === 'D' || p.op === 'U') && !oggetto(p.prima))
      || ((p.op === 'I' || p.op === 'U') && !oggetto(p.dopo))
      || (p.op === 'D' && Object.hasOwn(p, 'dopo')) || (p.op === 'I' && Object.hasOwn(p, 'prima'))
      || Object.keys(p).some(k => !['seq', 'tabella', 'op', 'prima', 'dopo'].includes(k))) {
      conflitto('Un passo del cestino non ha operazione e fotografie riconoscibili.');
    }
    sequenze.add(Number(p.seq));
    const tabellaEsistente = db.prepare(`SELECT sql FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(p.tabella) as { sql: string } | undefined;
    if (!tabellaEsistente || typeof tabellaEsistente.sql !== 'string' || !tabellaEsistente.sql.trim()) {
      conflitto('La tabella di una fotografia del cestino non esiste o non è riconoscibile.');
    }
    const struttura = db.prepare('SELECT name, pk, type, "notnull" AS obbligatorio FROM pragma_table_info(?, ?) ORDER BY pk').all(p.tabella, schema) as Array<{ name: string; pk: number; type: string; obbligatorio: number }>;
    if (!struttura.length) conflitto('La tabella di una fotografia del cestino non è riconoscibile.');
    const primarie = struttura.filter(c => c.pk > 0);
    const senzaNull = /\bWITHOUT\s+ROWID\b|\bSTRICT\b/i.test(tabellaEsistente.sql);
    const identita = primarie.length ? primarie.map(c => ({ nome: c.name, nullable: !senzaNull && c.obbligatorio === 0 && !(primarie.length === 1 && c.type.trim().toUpperCase() === 'INTEGER') }))
      : [{ nome: 'rowid', nullable: false }];
    const righe: Riga[] = [];
    for (const campo of ['prima', 'dopo']) {
      const r = oggetto(p[campo]);
      if (p[campo] !== undefined && p[campo] !== null && !r) conflitto('Una fotografia del cestino non è leggibile.');
      if (r && identita.some(({ nome, nullable }) => !Object.hasOwn(r, nome)
        || (r[nome] === null ? !nullable : typeof r[nome] !== 'string' && !(typeof r[nome] === 'number' && Number.isSafeInteger(r[nome]))))) {
        conflitto('Una fotografia del cestino non ha un’identità riconoscibile.');
      }
      if (r && Object.values(r).some(v => {
        if (v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) return false;
        const blob = oggetto(v);
        return !blob || Object.keys(blob).length !== 1 || typeof blob.$blob !== 'string'
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(blob.$blob);
      })) conflitto('Una fotografia del cestino contiene valori non riconoscibili.');
      if (r) righe.push(r);
    }
    return { tabella: p.tabella, righe };
  });
}

function fotografiaCestino(db: AppDatabase, pin: PinLuogoDaPin, area: string, quartiere: string, chiave: string, nome: string, voci: Set<string>): Riga {
  const principale = tabella(db, 'main', 'cestino');
  const partite = tabella(db, 'utente', 'cestino_partite');
  const pertinente = (t: string, r: Riga): boolean => {
    if (t === 'spillo') return r.id === pin.id || r.uid === pin.uid
      || (['luogo', 'attivita'].includes(String(r.riferimento_tipo)) && r.riferimento_chiave === chiave);
    if (t === 'luogo') return r.chiave === chiave || (r.quartiere_chiave === quartiere && typeof r.nome === 'string' && slug(r.nome) === slug(nome));
    if (t === 'mappa') return r.chiave === pin.mappa_chiave || (r.entita_tipo === 'luogo' && r.entita_chiave === chiave);
    if (t === 'area') return r.chiave === area;
    if (t === 'quartiere') return r.chiave === quartiere;
    if (t === 'spillo_voce' || t === 'spillo_immagine' || t === 'spillo_destinazione') return r.spillo_id === pin.id;
    if (t === 'negozio_sede_spillo') return r.spillo_uid === pin.uid || r.luogo_chiave === chiave;
    if (t === 'negozio' || t === 'attivita') return r.sede_chiave === chiave;
    if (t === 'negozio_luogo_extra') return r.luogo_chiave === chiave;
    if (t === 'mappa_entita') return r.mappa_chiave === pin.mappa_chiave || (r.entita_tipo === 'luogo' && r.entita_chiave === chiave);
    return false;
  };
  if (principale) {
    for (const c of db.prepare('SELECT * FROM main.cestino ORDER BY id').all() as Riga[]) {
      if ((c.tipo === 'luogo' && (c.chiave === chiave || (typeof c.chiave === 'string' && c.chiave.startsWith(`${quartiere}/`) && typeof c.nome === 'string' && slug(c.nome) === slug(nome))))
        || (c.tipo === 'mappa' && c.chiave === pin.mappa_chiave) || (c.tipo === 'area-fisica' && c.chiave === area)) {
        conflitto('Il cestino conserva questa identità o collocazione: nessun ripristino viene sovrascritto.');
      }
      for (const p of passiDelRegistro(db, 'main', c.registro_json)) if (p.righe.some(r => pertinente(p.tabella, r))) {
        conflitto('Il cestino conserva fotografie pertinenti al pin o al luogo: riconciliale prima della creazione.');
      }
    }
  }
  if (partite) {
    for (const c of db.prepare('SELECT * FROM utente.cestino_partite ORDER BY uid').all() as Riga[]) {
      for (const p of passiDelRegistro(db, 'utente', c.registro_json)) {
        if (p.righe.some(r => (['spillo_partita', 'spillo_partita_infiltrazione', 'divergenza_partita'].includes(p.tabella) && (r.spillo_uid === pin.uid || r.spillo_id === pin.id))
          || (p.tabella === 'punto_partita' && voci.has(String(r.punto_chiave))))) {
          conflitto('Il cestino conserva stati del pin o delle sue voci: nessuno stato viene modificato dalla creazione.');
        }
      }
    }
  }
  // L'assenza di conflitti è ricontrollata al salvataggio; i registri estranei non invalidano il token.
  return { principale, partite, conflitti: [] };
}

function fotografiaStati(db: AppDatabase, pin: PinLuogoDaPin): Riga {
  if (!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()) {
    conflitto('Il file delle partite non è disponibile: impossibile controllare la conservazione dello stato.');
  }
  const stati: Riga = {};
  for (const t of ['spillo_partita', 'spillo_partita_infiltrazione', 'divergenza_partita'] as const) {
    const presente = tabella(db, 'utente', t);
    if (t === 'spillo_partita' && !presente) conflitto('Lo stato dei pin non è disponibile.');
    const ordine = t === 'spillo_partita_infiltrazione' ? ', infiltrazione_chiave' : t === 'divergenza_partita' ? ', voce_chiave' : '';
    stati[t] = { presente, righe: presente ? db.prepare(`SELECT * FROM utente.${t} WHERE spillo_uid = ? ORDER BY partita_id${ordine}`).all(pin.uid) : [] };
  }
  const presente = tabella(db, 'utente', 'punto_partita');
  if (!presente) conflitto('Lo stato delle voci non è disponibile.');
  stati.punto_partita = { presente, righe: db.prepare(`SELECT p.* FROM utente.punto_partita p WHERE EXISTS (
    SELECT 1 FROM main.spillo_voce sv WHERE sv.spillo_id = ? AND sv.voce_chiave = p.punto_chiave
  ) ORDER BY p.partita_id, p.punto_chiave`).all(pin.id) };
  return stati;
}

/** Da chiamare esclusivamente dentro la TX che produce l'anteprima o crea il luogo. Nessuna scrittura. */
export function fotografiaLuogoDaPin(db: AppDatabase, id: number, nuovo: LuogoNuovoDaPin): FotografiaLuogoDaPin {
  const pin = db.prepare('SELECT * FROM spillo WHERE id = ?').get(id) as PinLuogoDaPin | undefined;
  if (!pin) throw httpErrors.notFound('spillo-non-trovato', 'Il pin selezionato non esiste più.');
  if (!Number.isSafeInteger(id) || id < 1 || typeof pin.uid !== 'string' || !pin.uid.trim() || typeof pin.nome !== 'string') conflitto('L’identità del pin non è leggibile.');
  const destinazioni = db.prepare('SELECT * FROM spillo_destinazione WHERE spillo_id = ? ORDER BY spillo_id').all(id) as Riga[];
  verificaPin(pin, destinazioni);
  if (!pinCompatibileConNuovoLuogo({ origine: pin.origine, tipo: pin.tipo, collezionabile: pin.collezionabile !== 0,
    riferimento: pin.riferimento_tipo === null && pin.riferimento_chiave === null ? null : {}, destinazione: destinazioni[0] ?? null })) {
    conflitto('Il pin non è più un pin personale compatibile senza collegamento.');
  }
  const mappa = db.prepare('SELECT * FROM mappa WHERE chiave = ?').get(pin.mappa_chiave) as Riga | undefined;
  if (!mappa || typeof mappa.area_chiave !== 'string') conflitto('La planimetria non ha un’Area reale del quartiere.');
  const area = db.prepare('SELECT * FROM area WHERE chiave = ?').get(mappa.area_chiave) as Riga | undefined;
  if (!area || typeof area.quartiere_chiave !== 'string' || area.dungeon_chiave !== null || area.citta_chiave !== null) conflitto('L’Area non appartiene a un quartiere disponibile.');
  const quartiere = db.prepare('SELECT * FROM quartiere WHERE chiave = ?').get(area.quartiere_chiave) as Riga | undefined;
  if (!quartiere) conflitto('Il quartiere dell’Area non esiste più.');
  const quartiereChiave = testo(quartiere, 'chiave');
  const areaChiave = testo(area, 'chiave');
  for (const r of [mappa, area, quartiere]) { testo(r, 'chiave'); testo(r, 'nome'); }
  testo(area, 'slug');
  const chiave = chiaveLuogoDaPin(quartiereChiave, nuovo.nome);
  const luoghi = db.prepare('SELECT * FROM luogo WHERE quartiere_chiave = ? ORDER BY chiave').all(quartiereChiave) as Riga[];
  if (db.prepare('SELECT 1 FROM luogo WHERE chiave = ?').get(chiave)
    || luoghi.some(l => typeof l.nome !== 'string' || slug(l.nome) === slug(nuovo.nome))) {
    throw httpErrors.conflict('luogo-da-pin-duplicato', 'Esiste già un luogo con questo nome o con la chiave prevista, anche fra i nascosti. Rivedi i luoghi prima di crearne un altro.');
  }
  const aree = db.prepare('SELECT * FROM area WHERE quartiere_chiave = ? ORDER BY chiave').all(quartiereChiave) as Riga[];
  for (const l of luoghi) {
    testo(l, 'chiave'); testo(l, 'nome'); testo(l, 'tipo');
    if (l.area_chiave !== null && !aree.some(a => a.chiave === l.area_chiave)) conflitto('Un luogo del quartiere ha una collocazione incoerente.');
  }
  const sediPin = db.prepare('SELECT * FROM negozio_sede_spillo WHERE spillo_uid = ? ORDER BY spillo_uid').all(pin.uid) as Riga[];
  if (sediPin.length) conflitto('Il pin ha già una sede commerciale strutturata: rivedila prima di creare un luogo.');
  const collocazioni = db.prepare('SELECT * FROM mappa_entita WHERE mappa_chiave = ? ORDER BY entita_tipo, entita_chiave').all(pin.mappa_chiave) as Riga[];
  const riferimentiCandidata = db.prepare(`SELECT 'spillo' AS tabella, uid AS identita FROM spillo WHERE riferimento_tipo IN ('luogo', 'attivita') AND riferimento_chiave = @chiave
    UNION ALL SELECT 'mappa', chiave FROM mappa WHERE entita_tipo = 'luogo' AND entita_chiave = @chiave
    UNION ALL SELECT 'mappa_entita', mappa_chiave FROM mappa_entita WHERE entita_tipo = 'luogo' AND entita_chiave = @chiave
    UNION ALL SELECT 'negozio', chiave FROM negozio WHERE sede_chiave = @chiave
    UNION ALL SELECT 'attivita', chiave FROM attivita WHERE sede_chiave = @chiave
    UNION ALL SELECT 'negozio_luogo_extra', negozio_chiave FROM negozio_luogo_extra WHERE luogo_chiave = @chiave
    ORDER BY tabella, identita`).all({ chiave }) as Riga[];
  if (riferimentiCandidata.length) conflitto('La chiave prevista è già usata da collegamenti strutturati: nessuna identità viene assorbita.');
  const legamiVoci = db.prepare('SELECT * FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').all(id) as Riga[];
  const voci = db.prepare('SELECT p.* FROM punto_interesse p JOIN spillo_voce sv ON sv.voce_chiave = p.chiave WHERE sv.spillo_id = ? ORDER BY p.chiave').all(id) as Riga[];
  const legamiImmagini = db.prepare('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(id) as Riga[];
  const immagini = db.prepare(`SELECT i.* FROM immagine i WHERE EXISTS (SELECT 1 FROM spillo_immagine si WHERE si.spillo_id = ? AND (
    (i.ambito = 'spillo' AND i.chiave = si.immagine_chiave) OR si.asset = i.ambito || '/' || i.chiave
  )) ORDER BY i.ambito, i.chiave, i.id`).all(id) as Riga[];
  const stati = fotografiaStati(db, pin);
  const cestino = fotografiaCestino(db, pin, areaChiave, quartiereChiave, chiave, nuovo.nome, new Set(legamiVoci.map(v => String(v.voce_chiave))));
  return { pin, mappa, area, quartiere, luoghi, aree, relazioni: { destinazioni, legamiVoci, voci, legamiImmagini, immagini }, collocazioni, sediPin, riferimentiCandidata, stati, cestino };
}

/** Formato dedicato: i booleani dei nuovi input e delle presenze non appartengono al vecchio hash v1/v2.
 * I valori SQL primitivi e i BLOB mantengono i tag esistenti, senza cambiare il precedente canonico.
 */
export function fotografiaCanonicaLuogoDaPin(valore: unknown): string {
  if (typeof valore === 'boolean') return JSON.stringify(['boolean', valore]);
  if (Array.isArray(valore)) return `["array",[${valore.map(fotografiaCanonicaLuogoDaPin).join(',')}]]`;
  if (valore !== null && typeof valore === 'object' && !Buffer.isBuffer(valore)) {
    const r = valore as Riga;
    return `["object",[${Object.keys(r).sort().map(k => `[${JSON.stringify(k)},${fotografiaCanonicaLuogoDaPin(r[k])}]`).join(',')}]]`;
  }
  return canonico(valore);
}
