// Precondizione del solo raccordo personale: fotografia canonica in memoria, mai nel log o nel DB.
import { createHash } from 'node:crypto';
import type { AppDatabase } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { normalizzaRequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { ammetteCondizioni, categoriaSpillo, RIFERIMENTI_PER_CATEGORIA, TIPI_SPILLO } from '../../../shared/spilli.js';

interface PinDelRaccordo {
  id: number; origine: string; riferimento_tipo: string | null; riferimento_chiave: string | null;
  collezionabile: number; tipo: string; condizioni_json: string | null; mappa_chiave: string | null;
}

export interface RichiestaRaccordoPin { riferimentoLuogo: string; revisioneRaccordoAttesa: string }
export interface PrecondizioneRaccordoPinDto { revisioneRaccordoAttesa: string }

const TOKEN = /^[a-fA-F0-9]{64}$/;

/** Guardia anche per i chiamanti interni: il ramo CAS non accetta altri cambiamenti. */
export function richiestaRaccordoPin(dati: object): RichiestaRaccordoPin {
  const d = dati as Record<string, unknown>;
  if (Object.keys(d).length !== 2 || Object.keys(d).some(k => k !== 'riferimentoLuogo' && k !== 'revisioneRaccordoAttesa')
    || typeof d.riferimentoLuogo !== 'string' || d.riferimentoLuogo.length === 0 || d.riferimentoLuogo.length > 200
    || typeof d.revisioneRaccordoAttesa !== 'string' || !TOKEN.test(d.revisioneRaccordoAttesa)) {
    throw httpErrors.badRequest('raccordo-corpo-non-valido', 'Il raccordo protetto accetta soltanto il luogo e la precondizione ricevuta dalla lettura.');
  }
  return { riferimentoLuogo: d.riferimentoLuogo, revisioneRaccordoAttesa: d.revisioneRaccordoAttesa.toLowerCase() };
}

/** Tipi marcati e chiavi ordinate: SQL NULL, testo JSON grezzo e BLOB restano distinguibili.
 * I BLOB contribuiscono integralmente tramite SHA256, senza costruire o restituire copie base64.
 */
function canonico(valore: unknown): string {
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

function verificaPin(pin: PinDelRaccordo, destinazioni: unknown[]): void {
  if (pin.origine !== 'utente' || pin.riferimento_tipo !== null || pin.riferimento_chiave !== null
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
export function improntaRaccordoPin(db: AppDatabase, pin: PinDelRaccordo, luogoChiave: string): string {
  const destinazioni = db.prepare('SELECT * FROM spillo_destinazione WHERE spillo_id = ? ORDER BY spillo_id').all(pin.id);
  verificaPin(pin, destinazioni);
  const luogo = db.prepare('SELECT * FROM luogo WHERE chiave = ?').get(luogoChiave) as Record<string, unknown> | undefined;
  if (!luogo || luogo.nascosto !== 0) throw httpErrors.conflict('raccordo-luogo-non-ammesso', 'Il luogo del raccordo non esiste più o è nascosto.');
  const legamiVoci = db.prepare('SELECT * FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').all(pin.id);
  const voci = db.prepare('SELECT p.* FROM punto_interesse p JOIN spillo_voce sv ON sv.voce_chiave = p.chiave WHERE sv.spillo_id = ? ORDER BY p.chiave').all(pin.id);
  const legamiImmagini = db.prepare('SELECT * FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(pin.id);
  const immagini = db.prepare(`SELECT i.* FROM immagine i WHERE EXISTS (
    SELECT 1 FROM spillo_immagine si WHERE si.spillo_id = ? AND (
      (i.ambito = 'spillo' AND i.chiave = si.immagine_chiave) OR si.asset = i.ambito || '/' || i.chiave
    )) ORDER BY i.ambito, i.chiave, i.id`).all(pin.id);
  return createHash('sha256').update(canonico({ versione: 1, pin, destinazioni, legamiVoci, voci, legamiImmagini, immagini, luogo })).digest('hex');
}
