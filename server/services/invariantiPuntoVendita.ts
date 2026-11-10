// ============================================================
// invariantiPuntoVendita — legge dal DB ciò che serve alle regole di `shared/puntoVendita.ts` e rifiuta le scritture nuove che le violano
// ============================================================
//
// La creazione di un luogo-negozio non passa da I4: oggi nasce senza punto vendita (`posizionaLuogo` con `nuovo`, «Aggiungi luogo»);
// il controllo su quella strada arriva con la creazione contestuale del punto vendita.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import {
  TIPO_MACCHINA, violazioneAreaDeiPin, violazioneLuogoConPuntiVendita, violazionePinVersoLuogo, violazionePinVersoPuntoVendita, violazionePlanimetriaDeiPin, violazionePuntoVenditaDelLuogo, violazioneSede,
  type StatoLuogoDiVendita, type ViolazionePuntoVendita,
} from '../../shared/puntoVendita.js';

function rifiuta(v: ViolazionePuntoVendita | null): void {
  if (!v) return;
  throw v.stato === 409 ? httpErrors.conflict(v.codice, v.messaggio) : httpErrors.badRequest(v.codice, v.messaggio);
}

/** Il valore dopo la scrittura: quello mandato se il campo c'è, altrimenti quello della riga. */
function valoreDopo<T>(dati: Record<string, unknown>, campo: string, attuale: T | null): T | null {
  return campo in dati ? ((dati[campo] ?? null) as T | null) : attuale;
}

const areaDelLuogo = (chiave: string | null) => (chiave === null ? null
  : (prepared('SELECT area_chiave FROM luogo WHERE chiave = ?').get(chiave) as { area_chiave: string | null } | undefined)?.area_chiave ?? null);

/** I pin dei punti vendita indicati (uno solo o tutti quelli di una sede), con l'Area della planimetria. */
function pinDiUnPuntoVendita(chiave: string) {
  return prepared(`SELECT n.nome AS puntoVendita, m.area_chiave AS area FROM spillo s JOIN negozio n ON n.chiave = s.riferimento_chiave
    JOIN mappa m ON m.chiave = s.mappa_chiave WHERE s.riferimento_tipo = 'negozio' AND n.chiave = ?`).all(chiave) as Array<{ puntoVendita: string; area: string | null }>;
}
function pinDeiPuntiVenditaDellaSede(sede: string) {
  return prepared(`SELECT n.nome AS puntoVendita, m.area_chiave AS area FROM spillo s JOIN negozio n ON n.chiave = s.riferimento_chiave
    JOIN mappa m ON m.chiave = s.mappa_chiave WHERE s.riferimento_tipo = 'negozio' AND n.sede_chiave = ?`).all(sede) as Array<{ puntoVendita: string; area: string | null }>;
}

function statoDelLuogo(chiave: string): StatoLuogoDiVendita & { nome: string } {
  const l = prepared('SELECT nome, tipo, note FROM luogo WHERE chiave = ?').get(chiave) as { nome: string; tipo: string; note: string | null };
  const puntiVendita = (prepared('SELECT COUNT(*) AS n FROM negozio WHERE sede_chiave = ? AND nascosto = 0').get(chiave) as { n: number }).n;
  return { ...l, puntiVendita };
}

/** I1 sulla creazione di un punto vendita. */
export function verificaNuovoPuntoVendita(dati: Record<string, unknown>): void {
  rifiuta(violazioneSede({ chiave: null, sedePrima: null, sedeDopo: (dati.sede_chiave ?? null) as string | null, nuovo: true }));
}

/** I1, I2 e I4 sulla modifica della sede di un punto vendita: una modifica che lascia la sede com'è non controlla nulla. */
export function verificaModificaPuntoVendita(riga: Record<string, unknown>, dati: Record<string, unknown>): void {
  const sedePrima = (riga.sede_chiave ?? null) as string | null;
  const sedeDopo = valoreDopo<string>(dati, 'sede_chiave', sedePrima);
  if (sedeDopo === sedePrima) return;
  const chiave = String(riga.chiave);
  rifiuta(violazioneSede({ chiave, sedePrima, sedeDopo, nuovo: false }));
  rifiuta(violazioneAreaDeiPin({ areaDopo: areaDelLuogo(sedeDopo), pin: pinDiUnPuntoVendita(chiave) }));
  if (sedePrima === null || riga.nascosto === 1) return;
  const prima = statoDelLuogo(sedePrima);
  rifiuta(violazionePuntoVenditaDelLuogo({ luogo: prima.nome, prima, dopo: { ...prima, puntiVendita: prima.puntiVendita - 1 } }));
}

/** I4 quando si nasconde un punto vendita: il luogo di vendita non resta senza macchine, salvo motivo annotato. Rimostrare non controlla nulla. */
export function verificaPuntoVenditaNascosto(riga: Record<string, unknown>): void {
  const sede = (riga.sede_chiave ?? null) as string | null;
  if (sede === null || riga.nascosto === 1) return;
  const prima = statoDelLuogo(sede);
  rifiuta(violazionePuntoVenditaDelLuogo({ luogo: prima.nome, prima, dopo: { ...prima, puntiVendita: prima.puntiVendita - 1 } }));
}

/** I1 e I4 sull'eliminazione: un luogo con punti vendita non si elimina, e l'ultimo punto vendita visibile di un luogo conforme nemmeno. */
export function verificaEliminazioneDiVendita(tipo: 'luogo' | 'negozio', chiave: string): void {
  if (tipo === 'negozio') {
    const r = prepared('SELECT sede_chiave, nascosto FROM negozio WHERE chiave = ?').get(chiave) as Record<string, unknown> | undefined;
    if (r) verificaPuntoVenditaNascosto(r);
    return;
  }
  const l = prepared('SELECT nome FROM luogo WHERE chiave = ?').get(chiave) as { nome: string } | undefined;
  if (!l) return;
  const puntiVendita = (prepared('SELECT COUNT(*) AS n FROM negozio WHERE sede_chiave = ?').get(chiave) as { n: number }).n;
  rifiuta(violazioneLuogoConPuntiVendita({ luogo: l.nome, puntiVendita }));
}

/** I2 quando una planimetria passa a un'altra Area (null: un'Area nuova): i suoi pin di punto vendita restano nell'Area della sede. */
export function verificaPlanimetriaDeiPin(mappa: string, areaDopo: string | null): void {
  const pin = prepared(`SELECT n.nome AS puntoVendita, l.area_chiave AS areaSede FROM spillo s JOIN negozio n ON n.chiave = s.riferimento_chiave
    LEFT JOIN luogo l ON l.chiave = n.sede_chiave WHERE s.riferimento_tipo = 'negozio' AND s.mappa_chiave = ?`).all(mappa) as Array<{ puntoVendita: string; areaSede: string | null }>;
  rifiuta(violazionePlanimetriaDeiPin({ areaDopo, pin }));
}

/** I2 e I4 sulla modifica di un luogo: Area, genere e note; una modifica degli altri campi non controlla nulla. */
export function verificaModificaLuogo(riga: Record<string, unknown>, dati: Record<string, unknown>): void {
  const chiave = String(riga.chiave);
  verificaAreaDelLuogo(chiave, valoreDopo<string>(dati, 'area_chiave', (riga.area_chiave ?? null) as string | null));
  const tipo = String(riga.tipo);
  const note = (riga.note ?? null) as string | null;
  const tipoDopo = valoreDopo<string>(dati, 'tipo', tipo) ?? tipo;
  const noteDopo = valoreDopo<string>(dati, 'note', note);
  if (tipoDopo === tipo && noteDopo === note) return;
  const prima = statoDelLuogo(chiave);
  rifiuta(violazionePuntoVenditaDelLuogo({ luogo: prima.nome, prima, dopo: { ...prima, tipo: tipoDopo, note: noteDopo } }));
}

/** I2 quando un luogo cambia Area: i pin dei suoi punti vendita devono stare in quella nuova. */
export function verificaAreaDelLuogo(chiave: string, areaDopo: string | null): void {
  if (areaDopo === areaDelLuogo(chiave)) return;
  rifiuta(violazioneAreaDeiPin({ areaDopo, pin: pinDeiPuntiVenditaDellaSede(chiave) }));
}

/** Il pin dopo la scrittura. */
export interface PinDiVendita { id: number | null; mappa: string | null; tipo: string; riferimento: { tipo: string; chiave: string } | null }

/**
 * I1, I2, I3 e il pin unico sulla scrittura di un pin; `prima` è il pin com'era (assente alla creazione). Un pin che non cambia
 * riferimento, tipo o planimetria non controlla nulla: una scheda della guida senza mappa non è un pin sulla mappa.
 */
export function verificaPinDiVendita(pin: PinDiVendita, prima?: Omit<PinDiVendita, 'id'>): void {
  if (pin.mappa === null || !pin.riferimento) return;
  const rifNuovo = !prima || prima.riferimento?.tipo !== pin.riferimento.tipo || prima.riferimento?.chiave !== pin.riferimento.chiave;
  const areaPlanimetria = () => (prepared('SELECT area_chiave FROM mappa WHERE chiave = ?').get(pin.mappa) as { area_chiave: string | null } | undefined)?.area_chiave ?? null;
  const chiave = pin.riferimento.chiave;
  if (pin.riferimento.tipo === 'negozio') {
    if (!rifNuovo && prima?.mappa === pin.mappa) return;
    const n = prepared('SELECT n.nome, n.sede_chiave, l.nome AS sede_nome, l.area_chiave FROM negozio n LEFT JOIN luogo l ON l.chiave = n.sede_chiave WHERE n.chiave = ?').get(chiave) as
      { nome: string; sede_chiave: string | null; sede_nome: string | null; area_chiave: string | null } | undefined;
    if (!n) throw httpErrors.notFound('punto-vendita-non-trovato', 'Il punto vendita collegato a questo pin non esiste più: collega il pin a un altro punto vendita o al luogo.');
    const altriPin = rifNuovo ? (prepared("SELECT COUNT(*) AS n FROM spillo WHERE riferimento_tipo = 'negozio' AND riferimento_chiave = ? AND id IS NOT ?").get(chiave, pin.id) as { n: number }).n : 0;
    rifiuta(violazionePinVersoPuntoVendita({ puntoVendita: n.nome, sede: n.sede_chiave === null ? null : { nome: n.sede_nome ?? n.sede_chiave, area: n.area_chiave }, areaPlanimetria: areaPlanimetria(), altriPin }));
    return;
  }
  if (pin.riferimento.tipo !== 'luogo' || (!rifNuovo && prima?.tipo === pin.tipo && prima?.mappa === pin.mappa)) return;
  const conta = (sql: string, ...p: unknown[]) => (prepared(sql).get(...p) as { n: number }).n;
  const macchine = conta('SELECT COUNT(*) AS n FROM negozio WHERE sede_chiave = ? AND tipo = ? AND nascosto = 0', chiave, TIPO_MACCHINA);
  const macchineConPin = conta(`SELECT COUNT(DISTINCT n.chiave) AS n FROM negozio n JOIN spillo s ON s.riferimento_tipo = 'negozio' AND s.riferimento_chiave = n.chiave
    WHERE n.sede_chiave = ? AND n.tipo = ? AND n.nascosto = 0 AND s.id IS NOT ?`, chiave, TIPO_MACCHINA, pin.id);
  const luogo = (prepared('SELECT nome FROM luogo WHERE chiave = ?').get(chiave) as { nome: string } | undefined)?.nome ?? chiave;
  rifiuta(violazionePinVersoLuogo({ tipoPin: pin.tipo, luogo, areaPlanimetria: areaPlanimetria(), macchine, macchineConPin }));
}
