// ============================================================
// 355 — tre luoghi da collocare e la frase residua dell'estrazione nei pin (L5-02, lotto «Mondo e mappe»)
// ============================================================
//
// COSA, in quest'ordine:
//  (a) I tre luoghi senza Area in quartieri che hanno Aree (`LUOGHI_DA_COLLOCARE`; i distributori della Shujin sono del lotto L2 e non si toccano).
//      Un luogo prende un'Area SOLO se ha `area_chiave IS NULL` e tutti i suoi pin (`riferimento_tipo = 'luogo'`) stanno su planimetrie che indicano una
//      e una sola Area del suo stesso quartiere: la regola è calcolata sui pin di oggi, perché un'istanza può averne di nuovi. Altrimenti il luogo
//      resta da collocare, con il motivo nel verbale: nessuna Area si indovina dal nome.
//  (b) La frase dell'estrazione (`FRASI_DELL_ESTRAZIONE`) in `spillo.descrizione` esce da tutti i pin, collegati e no: un testo visibile compare solo se
//      informa. Si toglie solo la frase, per corrispondenza esatta all'inizio o in fondo al testo: se dopo c'è altro («Porta a nativo-rmap-…») o se viene
//      prima (le note «Tipo nativo…»), il resto rimane intatto. Un pin in cui la frase sta in mezzo a un testo non si tocca: il verbale ne conta gli id.
//      Le descrizioni originali vanno in `dati_guida.archivio-frasi-l11` (colonna `spillo.descrizione`), con la chiave per uid del pin. Un pin senza
//      uid non si tocca e si conta: l'archivio non avrebbe una chiave stabile.
//
// COSA NON CAMBIA (impronte di ogni riga prima e dopo): `spillo` salvo `descrizione` (uid, riferimento, x/y, origine, updated_at restano), `luogo` salvo
// `area_chiave`, e per intero quartieri, Aree, mappe, negozi, attività e Cestino. Le descrizioni e le Aree cambiano solo sulle righe dichiarate.
// Idempotente: a una seconda esecuzione la frase non c'è più, i luoghi collocati sono saltati e il verbale non riceve voci nuove.
// Verbale: `dati_guida.audit-l5-02-luoghi-e-frasi`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`355: ${motivo}; nessuna modifica applicata.`); };

export const LUOGHI_DA_COLLOCARE = ['kanda-jinbocho/nagiuri', 'odaiba/odaiba-seaside-park', 'shibuya/stazione-shibuya'] as const;

export const FRASI_DELL_ESTRAZIONE = [
  'Luogo del catalogo non collegato: nessun luogo del quartiere corrisponde.',
  'Luogo del catalogo non collegato: quartiere o parole di riconoscimento assenti.',
] as const;

const AUDIT = 'audit-l5-02-luoghi-e-frasi';
const COLONNA_ARCHIVIO = 'spillo.descrizione';
const TABELLE_INTATTE = ['quartiere', 'area', 'mappa', 'negozio', 'attivita', 'cestino'] as const;

// ---------------------------------------------------------------------------
// (a) i luoghi da collocare
// ---------------------------------------------------------------------------

export interface PinDelLuogo { id: number; uid: string | null; mappa: string | null; area: string | null; quartiere_area: string | null }
export interface LuogoDaCollocare { chiave: string; quartiere_chiave: string; area_chiave: string | null }
export type EsitoCollocazione = 'collocato' | 'da collocare' | 'già collocato';
export interface DecisioneCollocazione { esito: EsitoCollocazione; area: string | null; motivo: string | null }

const elencoId = (pin: readonly PinDelLuogo[]): string => pin.map((p) => p.id).join(', ');

/** Dove va un luogo, dai suoi pin (puro): un'Area sola, del suo quartiere, indicata da tutte le planimetrie dei pin; altrimenti il motivo. */
export function decidiCollocazione(luogo: LuogoDaCollocare, pin: readonly PinDelLuogo[]): DecisioneCollocazione {
  if (luogo.area_chiave !== null) return { esito: 'già collocato', area: luogo.area_chiave, motivo: null };
  if (pin.length === 0) return { esito: 'da collocare', area: null, motivo: 'Nessun pin cita il luogo: non c’è una planimetria da cui ricavare l’Area.' };
  const senzaArea = pin.filter((p) => p.area === null);
  if (senzaArea.length > 0) return { esito: 'da collocare', area: null, motivo: `I pin ${elencoId(senzaArea)} stanno su mappe che non indicano un’Area (l’illustrazione del quartiere o nessuna mappa).` };
  const altroQuartiere = pin.filter((p) => p.quartiere_area !== luogo.quartiere_chiave);
  if (altroQuartiere.length > 0) return { esito: 'da collocare', area: null, motivo: `I pin ${elencoId(altroQuartiere)} stanno su planimetrie di un’Area che non è del quartiere «${luogo.quartiere_chiave}».` };
  const aree = [...new Set(pin.map((p) => p.area as string))];
  if (aree.length > 1) return { esito: 'da collocare', area: null, motivo: `I pin indicano più Aree: ${aree.join(', ')}.` };
  return { esito: 'collocato', area: aree[0], motivo: null };
}

// ---------------------------------------------------------------------------
// (b) la frase dell'estrazione
// ---------------------------------------------------------------------------

/** La descrizione senza la frase (tolta anche se c'è più volte), o null se non ha una delle due frasi esatte in testa (seguita dalla fine del testo o da uno spazio) o in fondo (dopo uno spazio). */
export function senzaFraseDiEstrazione(descrizione: string): string | null {
  for (const frase of FRASI_DELL_ESTRAZIONE) {
    if (descrizione.startsWith(frase)) {
      const resto = descrizione.slice(frase.length);
      if (resto === '' || /^\s/.test(resto)) return senzaFraseDiEstrazione(resto.trimStart()) ?? resto.trimStart();
    }
    if (descrizione.endsWith(frase)) {
      const prima = descrizione.slice(0, -frase.length);
      if (/\s$/.test(prima)) return senzaFraseDiEstrazione(prima.trimEnd()) ?? prima.trimEnd();
    }
  }
  return null;
}

interface PinConFrase { id: number; uid: string | null; riferimento_tipo: string | null; descrizione: string }

function pinConFrase(db: AppDatabase): PinConFrase[] {
  return (db.prepare("SELECT id, uid, riferimento_tipo, descrizione FROM main.spillo WHERE descrizione LIKE '%Luogo del catalogo non collegato:%' ORDER BY id").all() as PinConFrase[])
    .filter((p) => senzaFraseDiEstrazione(p.descrizione) !== null);
}

/** Gli id dei pin in cui la frase sta in mezzo al testo: testi diversi, che restano. */
function idConFraseAltrove(db: AppDatabase): number[] {
  const righe = db.prepare("SELECT id, descrizione FROM main.spillo WHERE descrizione LIKE '%Luogo del catalogo non collegato:%' ORDER BY id").all() as Array<{ id: number; descrizione: string }>;
  return righe.filter((p) => senzaFraseDiEstrazione(p.descrizione) === null).map((p) => p.id);
}

const categoriaDelPin = (riferimentoTipo: string | null): string => riferimentoTipo ?? 'scollegati';

/** I pin tolti, per categoria di collegamento: quanti e quali id. */
function perCategoria(pin: readonly PinConFrase[]): Record<string, { righe: number; id: number[] }> {
  const esito: Record<string, { righe: number; id: number[] }> = {};
  for (const p of pin) {
    const voce = esito[categoriaDelPin(p.riferimento_tipo)] ?? { righe: 0, id: [] };
    esito[categoriaDelPin(p.riferimento_tipo)] = { righe: voce.righe + 1, id: [...voce.id, p.id] };
  }
  return esito;
}

// ---------------------------------------------------------------------------
// la migrazione
// ---------------------------------------------------------------------------

const descrizioni = (db: AppDatabase): Map<number, string> => new Map((db.prepare('SELECT id, descrizione FROM main.spillo').all() as Array<{ id: number; descrizione: string }>).map((r) => [r.id, r.descrizione]));
const areeDeiLuoghi = (db: AppDatabase): Map<string, string | null> => new Map((db.prepare('SELECT chiave, area_chiave FROM main.luogo').all() as Array<{ chiave: string; area_chiave: string | null }>).map((r) => [r.chiave, r.area_chiave]));

export const migration355: Migration = {
  id: 355,
  name: 'luoghi_collocati_e_frasi_dei_pin',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['spillo', 'luogo', 'mappa', 'area', 'dati_guida']) if (!esisteTabella(db, t)) errore(`manca la tabella ${t}`);

    // le impronte di prima (tutto tranne le due colonne dichiarate)
    const prima = new Map<string, string>([['spillo', improntaTabella(db, 'spillo', ['descrizione'])], ['luogo', improntaTabella(db, 'luogo', ['area_chiave'])]]);
    for (const t of TABELLE_INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const descrizioniPrima = descrizioni(db);
    const areePrima = areeDeiLuoghi(db);

    // (a) i luoghi: la decisione è calcolata sui pin di adesso
    const leggiLuogo = db.prepare('SELECT chiave, quartiere_chiave, area_chiave FROM main.luogo WHERE chiave = ?');
    const leggiPin = db.prepare(`SELECT s.id, s.uid, s.mappa_chiave AS mappa, m.area_chiave AS area, a.quartiere_chiave AS quartiere_area
      FROM main.spillo s LEFT JOIN main.mappa m ON m.chiave = s.mappa_chiave LEFT JOIN main.area a ON a.chiave = m.area_chiave
      WHERE s.riferimento_tipo = 'luogo' AND s.riferimento_chiave = ? ORDER BY s.id`);
    const scriviArea = db.prepare('UPDATE main.luogo SET area_chiave = ? WHERE chiave = ? AND area_chiave IS NULL');
    const luoghi = LUOGHI_DA_COLLOCARE.map((chiave) => {
      const luogo = leggiLuogo.get(chiave) as LuogoDaCollocare | undefined;
      if (!luogo) return { chiave, pin: [] as PinDelLuogo[], esito: 'da collocare' as EsitoCollocazione, area: null, motivo: 'Il luogo non c’è in questo database.' };
      const pin = leggiPin.all(chiave) as PinDelLuogo[];
      const decisione = decidiCollocazione(luogo, pin);
      if (decisione.esito === 'collocato' && scriviArea.run(decisione.area, chiave).changes !== 1) errore(`il luogo ${chiave} non si aggiorna`);
      return { chiave, pin, ...decisione };
    });
    const collocati = luoghi.filter((l) => l.esito === 'collocato');

    // (b) la frase: prima l'archivio (per uid), poi la descrizione
    const conFrase = pinConFrase(db);
    const daTogliere = conFrase.filter((p) => p.uid !== null);
    const senzaUid = conFrase.filter((p) => p.uid === null).map((p) => p.id);
    const altrove = idConFraseAltrove(db);
    const righeOriginali = Object.fromEntries(daTogliere.map((p) => [p.uid as string, p.descrizione]));
    const archiviateNuove = archiviaSenzaSovrascrivere(db, 'L5-02 · 355', COLONNA_ARCHIVIO, righeOriginali);
    const presenti = righeArchiviate(db, COLONNA_ARCHIVIO);
    if (!Object.keys(righeOriginali).every((k) => k in presenti)) errore('l’archivio delle descrizioni non ha tutte le righe');
    const scriviDescrizione = db.prepare('UPDATE main.spillo SET descrizione = ? WHERE id = ? AND uid = ? AND descrizione = ?');
    const conCoda: Array<{ id: number; uid: string; resto: string }> = [];
    for (const p of daTogliere) {
      const resto = senzaFraseDiEstrazione(p.descrizione) as string;
      if (scriviDescrizione.run(resto, p.id, p.uid, p.descrizione).changes !== 1) errore(`il pin ${p.id} non si aggiorna`);
      if (resto !== '') conCoda.push({ id: p.id, uid: p.uid as string, resto });
    }

    // i controlli: cambia solo ciò che è dichiarato
    const rimasti = pinConFrase(db).filter((p) => p.uid !== null);
    if (rimasti.length > 0) errore(`la frase è rimasta nei pin ${rimasti.map((p) => p.id).join(', ')}`);
    if (improntaTabella(db, 'spillo', ['descrizione']) !== prima.get('spillo')) errore('le altre colonne di spillo sono cambiate');
    if (improntaTabella(db, 'luogo', ['area_chiave']) !== prima.get('luogo')) errore('le altre colonne di luogo sono cambiate');
    for (const t of TABELLE_INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    const attesi = new Set(daTogliere.map((p) => p.id));
    for (const [id, testo] of descrizioni(db)) if ((descrizioniPrima.get(id) !== testo) !== attesi.has(id)) errore(`la descrizione del pin ${id} è cambiata in modo non dichiarato`);
    const luoghiAttesi = new Set(collocati.map((l) => l.chiave as string));
    for (const [chiave, area] of areeDeiLuoghi(db)) if ((areePrima.get(chiave) !== area) !== luoghiAttesi.has(chiave)) errore(`l’Area del luogo ${chiave} è cambiata in modo non dichiarato`);

    // il verbale: una voce la prima volta, nessuna se una seconda esecuzione non cambia nulla
    const verbalePresente = !!db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT);
    if (verbalePresente && collocati.length === 0 && daTogliere.length === 0) return;
    registraAudit(db, AUDIT, {
      migrazione: 'L5-02 · 355',
      luoghi: luoghi.map((l) => ({ chiave: l.chiave, pinEsaminati: l.pin.map((p) => ({ id: p.id, uid: p.uid, mappa: p.mappa })), esito: l.esito, area: l.area, motivo: l.motivo })),
      conteggiLuoghi: { collocati: collocati.length, daCollocare: luoghi.filter((l) => l.esito === 'da collocare').length, giaCollocati: luoghi.filter((l) => l.esito === 'già collocato').length },
      frase: { tolta: daTogliere.length, perCategoria: perCategoria(daTogliere), conCoda, archiviateNuove, senzaUid, fraseInMezzoNonToccati: altrove },
    });
    logger.info({ migrazione: 'L5-02-355', collocati: collocati.map((l) => l.chiave), frasiTolte: daTogliere.length, conCoda: conCoda.map((p) => p.id), senzaUid, fraseInMezzo: altrove }, 'luoghi da collocare esaminati e frase dell’estrazione tolta dai pin');
  },
};
