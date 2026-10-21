// Precondizione del solo raccordo personale: fotografia canonica in memoria, mai nel log o nel DB.
import { createHash } from 'node:crypto';
import type { AppDatabase } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { normalizzaRequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { ammetteCondizioni, categoriaSpillo, RIFERIMENTI_PER_CATEGORIA, TIPI_SPILLO } from '../../../shared/spilli.js';

export interface PinDelRaccordo {
  id: number; origine: string; riferimento_tipo: string | null; riferimento_chiave: string | null;
  collezionabile: number; tipo: string; condizioni_json: string | null; mappa_chiave: string | null;
}

export interface RichiestaRaccordoPin { riferimentoLuogo: string; revisioneRaccordoAttesa: string; areaLuogo?: string }
export interface PrecondizioneRaccordoPinDto { revisioneRaccordoAttesa: string }

const TOKEN = /^[a-fA-F0-9]{64}$/;

/** Guardia anche per i chiamanti interni: il ramo CAS non accetta altri cambiamenti. */
export function richiestaRaccordoPin(dati: object): RichiestaRaccordoPin {
  const d = dati as Record<string, unknown>;
  if (Object.keys(d).length !== (d.areaLuogo === undefined ? 2 : 3) || Object.keys(d).some(k => !['riferimentoLuogo', 'revisioneRaccordoAttesa', 'areaLuogo'].includes(k))
    || typeof d.riferimentoLuogo !== 'string' || d.riferimentoLuogo.length === 0 || d.riferimentoLuogo.length > 200
    || typeof d.revisioneRaccordoAttesa !== 'string' || !TOKEN.test(d.revisioneRaccordoAttesa)
    || (d.areaLuogo !== undefined && (typeof d.areaLuogo !== 'string' || d.areaLuogo.length === 0 || d.areaLuogo.length > 200))) {
    throw httpErrors.badRequest('raccordo-corpo-non-valido', 'Il raccordo protetto accetta soltanto il luogo e la precondizione ricevuta dalla lettura.');
  }
  return { riferimentoLuogo: d.riferimentoLuogo, revisioneRaccordoAttesa: d.revisioneRaccordoAttesa.toLowerCase(), ...(typeof d.areaLuogo === 'string' ? { areaLuogo: d.areaLuogo } : {}) };
}

/** Tipi marcati e chiavi ordinate: SQL NULL, testo JSON grezzo e BLOB restano distinguibili.
 * I BLOB contribuiscono integralmente tramite SHA256, senza costruire o restituire copie base64.
 */
export function canonico(valore: unknown): string {
  if (valore === null) return '["null"]';
  if (typeof valore === 'string') return JSON.stringify(['string', valore]);
  if (typeof valore === 'number' && Number.isFinite(valore)) return JSON.stringify(['number', Object.is(valore, -0) ? '-0' : String(valore)]);
  if (typeof valore === 'bigint') return JSON.stringify(['bigint', String(valore)]);
  if (Buffer.isBuffer(valore)) return JSON.stringify(['blob-sha256', valore.length, createHash('sha256').update(valore).digest('hex')]);
  if (Array.isArray(valore)) return `["array",[${valore.map(canonico).join(',')}]]`;
  if (typeof valore === 'object') {
    const r = valore as Record<string, unknown>;
    return `["object",[${Object.keys(r).sort().map(k => `[${JSON.stringify(k)},${canonico(r[k])}]`).join(',')}]]`;
  }
  throw httpErrors.conflict('raccordo-formato-inatteso', 'La fotografia del raccordo contiene un formato non supportato. Nessun collegamento eseguito.');
}

export function verificaPin(pin: PinDelRaccordo, destinazioni: unknown[], ripresaLuogo?: string): void {
  const riferimentoAmmesso = (pin.riferimento_tipo === null && pin.riferimento_chiave === null)
    || (ripresaLuogo !== undefined && pin.riferimento_tipo === 'luogo' && pin.riferimento_chiave === ripresaLuogo);
  if (pin.origine !== 'utente' || !riferimentoAmmesso
    || pin.collezionabile !== 0 || pin.mappa_chiave === null || destinazioni.length !== 0
    || !(TIPI_SPILLO as readonly string[]).includes(pin.tipo)
    || !RIFERIMENTI_PER_CATEGORIA[categoriaSpillo(pin.tipo)].includes('luogo')) {
    throw httpErrors.conflict('raccordo-pin-non-ammesso', 'Il pin non è più un pin personale senza riferimento e destinazione, compatibile con il raccordo a un luogo.');
  }
  // I negozi non ammettono condizioni proprie: NULL e array vuoto sono leciti, senza riscriverli.
  // Negli altri tipi si verifica la forma, ma il raccordo non normalizza né cambia alcun nodo.
  if (pin.condizioni_json !== null) {
    let condizioni: unknown;
    try { condizioni = JSON.parse(pin.condizioni_json); }
    catch { throw httpErrors.conflict('raccordo-condizioni-non-ammesse', 'Le condizioni del pin non sono leggibili: occorre rivederle prima del raccordo.'); }
    if (!Array.isArray(condizioni) || (!ammetteCondizioni(pin.tipo) && condizioni.length > 0)
      || condizioni.some(c => normalizzaRequisitoSpillo(c) === null)) {
      throw httpErrors.conflict('raccordo-condizioni-non-ammesse', 'Le condizioni del pin non sono compatibili con il raccordo conservativo.');
    }
  }
}

/** Chiamare nella stessa transazione che ha letto SELECT * del pin; GET e PUT usano la stessa guardia.
 * Non legge partite, non scrive, non conserva la fotografia. Le miniature derivate non sono dati del pin.
 */
export function improntaRaccordoPin(db: AppDatabase, pin: PinDelRaccordo, luogoChiave: string, areaLuogo?: string): string {
  const destinazioni = db.prepare('SELECT * FROM spillo_destinazione WHERE spillo_id = ? ORDER BY spillo_id').all(pin.id);
  verificaPin(pin, destinazioni, areaLuogo === undefined ? undefined : luogoChiave);
  const luogo = db.prepare('SELECT * FROM luogo WHERE chiave = ?').get(luogoChiave) as Record<string, unknown> | undefined;
  if (!luogo || luogo.nascosto !== 0) throw httpErrors.conflict('raccordo-luogo-non-ammesso', 'Il luogo del raccordo non esiste più o è nascosto.');
  const legamiVoci = db.prepare('SELECT * FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').all(pin.id);
  const voci = db.prepare('SELECT p.* FROM punto_interesse p JOIN spillo_voce sv ON sv.voce_chiave = p.chiave WHERE sv.spillo_id = ? ORDER BY p.chiave').all(pin.id);
  const legamiImmagini = db.prepare('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(pin.id);
  const immagini = db.prepare(`SELECT i.* FROM immagine i WHERE EXISTS (
    SELECT 1 FROM spillo_immagine si WHERE si.spillo_id = ? AND (
      (i.ambito = 'spillo' AND i.chiave = si.immagine_chiave) OR si.asset = i.ambito || '/' || i.chiave
    )) ORDER BY i.ambito, i.chiave, i.id`).all(pin.id);
  const contestoArea = areaLuogo === undefined ? undefined : fotografiaAreaVenditore(db, pin, luogo, areaLuogo);
  return createHash('sha256').update(canonico({ versione: areaLuogo === undefined ? 1 : 2, pin, destinazioni, legamiVoci, voci, legamiImmagini, immagini, luogo,
    ...(contestoArea === undefined ? {} : { areaLuogo, contestoArea }) })).digest('hex');
}

type Riga = Record<string, unknown>;
const LUOGO_VENDITORE = 'shibuya/venditore-ambulante';
const AREA_VENDITORE = 'citta/shibuya/central-street';
const MAPPA_VENDITORE = 'nativo-rmap-001-3-0';
function conflittoArea(motivo: string): never { throw httpErrors.conflict('raccordo-area-incompatibile', motivo); }
function oggetto(v: unknown): Riga | null { return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null; }
function leggiJson(v: unknown): unknown { try { return typeof v === 'string' ? JSON.parse(v) as unknown : undefined; } catch { return undefined; } }

/** Contesto della sola proposta 1530: nulla viene derivato da un nome o da una posizione grafica.
 * Le letture complete restano in memoria; l'impronta fotografa soltanto il grafo pertinente e la sua assenza di conflitti.
 */
function fotografiaAreaVenditore(db: AppDatabase, pin: PinDelRaccordo, luogo: Riga, areaChiave: string): Riga {
  const rawPin = pin as unknown as Riga;
  const nativo = oggetto(leggiJson(rawPin.nativo_json));
  if (pin.id !== 1530 || luogo.chiave !== LUOGO_VENDITORE || areaChiave !== AREA_VENDITORE || pin.tipo !== 'negozio'
    || pin.mappa_chiave !== MAPPA_VENDITORE || rawPin.area_guida_chiave !== null
    || nativo?.tipoNativo !== 111 || nativo.indicePin !== 33 || nativo.daVerificare !== false
    || luogo.quartiere_chiave !== 'shibuya' || luogo.tipo !== 'negozio' || luogo.nascosto !== 0
    || (luogo.area_chiave !== null && luogo.area_chiave !== areaChiave)) {
    conflittoArea('Il raccordo e l’Area non corrispondono più alla proposta del Venditore ambulante.');
  }
  const mappe = new Map((db.prepare('SELECT * FROM mappa ORDER BY chiave').all() as Riga[]).map(r => [String(r.chiave), r]));
  const area = db.prepare('SELECT * FROM area WHERE chiave = ?').get(areaChiave) as Riga | undefined;
  const quartiere = db.prepare("SELECT * FROM quartiere WHERE chiave = 'shibuya'").get() as Riga | undefined;
  const mappa = mappe.get(MAPPA_VENDITORE);
  const mappaQuartiere = mappe.get('citta-shibuya');
  if (!area || !quartiere || area.quartiere_chiave !== 'shibuya' || area.dungeon_chiave !== null || area.citta_chiave !== null
    || area.slug !== 'central-street' || mappa?.area_chiave !== areaChiave || mappa.genitore_chiave !== 'citta-shibuya' || mappa.tipo !== 'luogo'
    || mappaQuartiere?.tipo !== 'quartiere' || mappaQuartiere.entita_tipo !== 'quartiere' || mappaQuartiere.entita_chiave !== 'shibuya') {
    conflittoArea('La planimetria, l’Area o il quartiere non corrispondono più alla collocazione proposta.');
  }
  const mappeUsate = new Map<string, Riga>();
  const areaDellaMappa = (chiave: string): string => {
    const visti = new Set<string>(); let corrente: string | null = chiave; let trovata: string | null = null;
    while (corrente !== null) {
      if (visti.has(corrente)) conflittoArea('Una catena di mappe pertinente contiene un ciclo.');
      visti.add(corrente); const m = mappe.get(corrente);
      if (!m) conflittoArea('Una planimetria pertinente non ha più il suo contesto.');
      mappeUsate.set(corrente, m);
      if (m.area_chiave !== null && m.area_chiave !== undefined) {
        const a = db.prepare('SELECT quartiere_chiave FROM area WHERE chiave = ?').get(m.area_chiave) as { quartiere_chiave: string | null } | undefined;
        if (!a || a.quartiere_chiave !== 'shibuya') conflittoArea('Una collocazione pertinente appartiene a un altro quartiere o a un’Area assente.');
        if (trovata !== null && trovata !== m.area_chiave) conflittoArea('La catena della planimetria indica Aree discordanti.');
        trovata = String(m.area_chiave);
      }
      corrente = typeof m.genitore_chiave === 'string' ? m.genitore_chiave : null;
    }
    if (trovata === null) conflittoArea('Una collocazione pertinente non ha un’Area risolvibile.');
    return trovata;
  };
  areaDellaMappa(MAPPA_VENDITORE);
  const negozi = new Map((db.prepare('SELECT * FROM negozio ORDER BY chiave').all() as Riga[]).map(r => [String(r.chiave), r]));
  const pertinenti = new Set([...negozi].filter(([, r]) => r.sede_chiave === LUOGO_VENDITORE).map(([k]) => k));
  let aggiunti: boolean;
  do { aggiunti = false; for (const [k, n] of negozi) if (!pertinenti.has(k) && typeof n.listino_condiviso === 'string' && pertinenti.has(n.listino_condiviso)) { pertinenti.add(k); aggiunti = true; } } while (aggiunti);
  const sede = (chiave: string): string | null => {
    let corrente = chiave; const visti = new Set<string>();
    while (true) {
      if (visti.has(corrente)) conflittoArea('Un listino pertinente contiene un ciclo.');
      visti.add(corrente); const n = negozi.get(corrente);
      if (!n) conflittoArea('Un listino pertinente ha un riferimento mancante.');
      if (!n.listino_condiviso) return typeof n.sede_chiave === 'string' ? n.sede_chiave : null;
      corrente = String(n.listino_condiviso);
    }
  };
  for (const chiave of pertinenti) if (sede(chiave) !== LUOGO_VENDITORE) conflittoArea('Le sedi di un listino pertinente sono discordanti.');
  const sediPin = db.prepare('SELECT * FROM negozio_sede_spillo ORDER BY spillo_uid').all() as Riga[];
  const sediPerUid = new Map(sediPin.map(r => [String(r.spillo_uid), r]));
  const collocazioni: Riga[] = [];
  const aggiungi = (r: Riga, mappaChiave: unknown, idPin: number | null) => {
    if (typeof mappaChiave !== 'string') conflittoArea('Una collocazione pertinente non ha planimetria.');
    if (idPin !== null && idPin !== pin.id && mappaChiave === MAPPA_VENDITORE) conflittoArea('Un altro pin della planimetria rappresenta già questo luogo.');
    if (areaDellaMappa(mappaChiave) !== areaChiave) conflittoArea('Il luogo è già rappresentato in un’altra Area.');
    collocazioni.push(r);
  };
  const pinCorrenti = db.prepare('SELECT * FROM spillo ORDER BY id').all() as Riga[];
  for (const s of sediPin.filter(s => s.luogo_chiave === LUOGO_VENDITORE)) {
    const p = pinCorrenti.find(p => p.uid === s.spillo_uid);
    if (!p || p.riferimento_tipo !== 'negozio' || p.riferimento_chiave !== s.negozio_chiave || !negozi.has(String(s.negozio_chiave))) {
      conflittoArea('Una sede specifica del luogo ha un collegamento non risolvibile.');
    }
  }
  for (const p of pinCorrenti) {
    const s = sediPerUid.get(String(p.uid));
    const diretta = ['luogo', 'attivita'].includes(String(p.riferimento_tipo)) && p.riferimento_chiave === LUOGO_VENDITORE;
    const specifica = p.riferimento_tipo === 'negozio' && s?.negozio_chiave === p.riferimento_chiave;
    const daNegozio = p.riferimento_tipo === 'negozio' && (specifica ? s?.luogo_chiave === LUOGO_VENDITORE : pertinenti.has(String(p.riferimento_chiave)));
    if (diretta || daNegozio) aggiungi({ pin: p, sedePin: specifica ? s : null }, p.mappa_chiave, Number(p.id));
  }
  const associazioni = [...(db.prepare('SELECT * FROM mappa_entita ORDER BY mappa_chiave, entita_tipo, entita_chiave').all() as Riga[]),
    ...[...mappe.values()].map(m => ({ mappa_chiave: m.chiave, entita_tipo: m.entita_tipo, entita_chiave: m.entita_chiave }))];
  for (const a of associazioni) if ((['luogo', 'attivita'].includes(String(a.entita_tipo)) && a.entita_chiave === LUOGO_VENDITORE)
    || (a.entita_tipo === 'negozio' && pertinenti.has(String(a.entita_chiave)))) aggiungi(a, a.mappa_chiave, null);
  for (const c of db.prepare('SELECT registro_json FROM cestino').all() as Array<{ registro_json: string }>) {
    const passi = leggiJson(c.registro_json);
    if (!Array.isArray(passi)) conflittoArea('Un registro del cestino non è leggibile: occorre riconciliarlo prima del raccordo.');
    const sequenze = new Set<number>();
    for (const v of passi) {
      const p = oggetto(v); if (!p) conflittoArea('Un passo del cestino non è leggibile.');
      if (!Number.isSafeInteger(p.seq) || Number(p.seq) < 0 || sequenze.has(Number(p.seq))
        || typeof p.tabella !== 'string' || !p.tabella || !['D', 'U', 'I'].includes(String(p.op))
        || ((p.op === 'D' || p.op === 'U') && !oggetto(p.prima))
        || ((p.op === 'I' || p.op === 'U') && !oggetto(p.dopo))) {
        conflittoArea('Un passo del cestino non ha sequenza, operazione o fotografie riconoscibili.');
      }
      sequenze.add(Number(p.seq));
      const struttura = db.prepare('SELECT name, pk FROM pragma_table_info(?, ?) ORDER BY pk').all(p.tabella, 'main') as Array<{ name: string; pk: number }>;
      if (!struttura.length) conflittoArea('La tabella di una fotografia del cestino non è riconoscibile.');
      const primarie = struttura.filter(c => c.pk > 0).map(c => c.name);
      const identita = primarie.length ? primarie : ['rowid'];
      for (const campo of ['prima', 'dopo']) {
        const r = oggetto(p[campo]);
        if (p[campo] !== undefined && p[campo] !== null && !r) conflittoArea('Una fotografia del cestino non è leggibile.');
        if (r && identita.some(k => !Object.hasOwn(r, k) || (r[k] !== null && typeof r[k] !== 'string' && typeof r[k] !== 'number'))) {
          conflittoArea('Una fotografia del cestino non ha un’identità riconoscibile.');
        }
        if ((p.tabella === 'spillo' && (r?.id === pin.id || (!!rawPin.uid && r?.uid === rawPin.uid)))
          || (p.tabella === 'luogo' && r?.chiave === LUOGO_VENDITORE)
          || (p.tabella === 'spillo' && ((['luogo', 'attivita'].includes(String(r?.riferimento_tipo)) && r?.riferimento_chiave === LUOGO_VENDITORE)
            || (r?.riferimento_tipo === 'negozio' && pertinenti.has(String(r.riferimento_chiave)))))
          || (p.tabella === 'negozio' && (pertinenti.has(String(r?.chiave)) || r?.sede_chiave === LUOGO_VENDITORE))
          || (p.tabella === 'negozio_sede_spillo' && r?.luogo_chiave === LUOGO_VENDITORE)
          || (p.tabella === 'mappa_entita' && (r?.entita_chiave === LUOGO_VENDITORE || (r?.entita_tipo === 'negozio' && pertinenti.has(String(r.entita_chiave)))))
          || (p.tabella === 'mappa' && (mappeUsate.has(String(r?.chiave)) || r?.entita_chiave === LUOGO_VENDITORE
            || (r?.entita_tipo === 'negozio' && pertinenti.has(String(r.entita_chiave))))) || (p.tabella === 'area' && r?.chiave === areaChiave)) {
          conflittoArea('Il cestino conserva una fotografia pertinente: nessuna modifica automatica al suo ripristino.');
        }
      }
    }
  }
  return { area, quartiere, mappe: [...mappeUsate].sort(([a], [b]) => a.localeCompare(b)),
    negozi: [...pertinenti].sort().map(k => negozi.get(k)), sediPin: sediPin.filter(s => s.luogo_chiave === LUOGO_VENDITORE), collocazioni };
}

/** Dopo impronta/preflight nella stessa transazione. Nessun normalizzatore, nessun effetto sugli altri campi del luogo. */
export function applicaAreaRaccordoPin(db: AppDatabase, luogoChiave: string, areaChiave: string): void {
  if (luogoChiave !== LUOGO_VENDITORE || areaChiave !== AREA_VENDITORE) conflittoArea('Area non ammessa per il raccordo.');
  const r = db.prepare('SELECT area_chiave FROM luogo WHERE chiave = ?').get(luogoChiave) as { area_chiave: string | null } | undefined;
  if (r?.area_chiave === areaChiave) return;
  if (!r || r.area_chiave !== null || db.prepare('UPDATE luogo SET area_chiave = ? WHERE chiave = ? AND area_chiave IS NULL').run(areaChiave, luogoChiave).changes !== 1) {
    conflittoArea('La collocazione è cambiata: nessuna parte del raccordo viene applicata.');
  }
}
