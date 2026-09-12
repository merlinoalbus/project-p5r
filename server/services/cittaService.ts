import { chiaveMappa, idMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { GIORNI_SETTIMANA_CHIAVI, descriviGiorni, type GiornoChiave } from '../../shared/orariNegozio.js';
import type { IngressoQuartiereDto, LuogoOpzioneDto } from '../../shared/types.js';
// ============================================================
// cittaService — quartieri di Tokyo e luoghi con ciò che offrono (Fase 8.1)
// ============================================================
//
// Dalla voce 5 del piano «struttura, non frasi» (2026-09-12) un luogo è una riga del catalogo
// (migrazione 071: origine, nascosto, condizioni_json) e i suoi negozi e le sue attività vengono
// dalle **sedi** (`negozio.sede_chiave`, `attivita.sede_chiave`, migrazione 072), non più da
// `luogo.negozio` e `luogo.attivita_json`, che non si leggono più. La regola di presenza sta sulla
// riga; il JSON `sblocco-luoghi` della guida resta il ripiego per un file ancora senza colonna.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { LuogoDto, PiantaAreaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';
import { nowIso } from '../db/dbService.js';
import { importaImmagineDaUrl } from './immaginiService.js';
import { datiGuida } from './richiesteService.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';

interface RigaPiantaQ { quartiere_chiave: string; url: string; pagina: string | null; fonte: string; licenza: string; larghezza: number | null; altezza: number | null; note: string }

/** Chiave dell'immagine (ambito «mappa») della mappa di un quartiere. */
export const chiaveImmagineQuartiere = (quartiere: string): string => `citta-${quartiere}`;

interface RigaQuartiere { sblocco_data: string | null; chiave: string; ordine: number; nome: string; sblocco: string | null; descrizione: string; fonte: string }
/** Le chiavi dei giorni da `giorni_json`: solo quelle valide, senza doppioni. */
function giorniDiRiga(json: string | null | undefined): GiornoChiave[] {
  try {
    const v = JSON.parse(json || '[]') as unknown;
    return Array.isArray(v) ? [...new Set(v.filter((g): g is GiornoChiave => (GIORNI_SETTIMANA_CHIAVI as readonly string[]).includes(String(g))))] : [];
  } catch {
    return [];
  }
}

interface RigaLuogo { chiave: string; quartiere_chiave: string; ordine: number; tipo: string; nome: string; cosa_offre: string; quando: string | null; giorni_json: string; sblocco: string | null; confidenti_json: string; piatti_json: string | null; note: string | null; fonte: string; verificato: number; origine: string; condizioni_json: string | null }

interface Collegamenti { negozi: Map<string, Array<{ chiave: string; nome: string }>>; attivita: Map<string, Array<{ chiave: string; nome: string }>> }

/** I negozi e le attività di ogni luogo, dalle sedi dichiarate. */
function collegamenti(quartiere?: string): Collegamenti {
  const raggruppa = (righe: Array<{ sede: string; chiave: string; nome: string }>) => {
    const out = new Map<string, Array<{ chiave: string; nome: string }>>();
    for (const r of righe) { const e = out.get(r.sede) ?? []; e.push({ chiave: r.chiave, nome: r.nome }); out.set(r.sede, e); }
    return out;
  };
  const filtro = quartiere ? ' AND luogo_chiave = ?' : '';
  const par = quartiere ? [quartiere] : [];
  return {
    negozi: raggruppa(prepared(`SELECT sede_chiave AS sede, chiave, nome FROM negozio WHERE nascosto = 0 AND sede_chiave IS NOT NULL${filtro} ORDER BY ordine`).all(...par) as Array<{ sede: string; chiave: string; nome: string }>),
    attivita: raggruppa(prepared(`SELECT sede_chiave AS sede, chiave, nome FROM attivita WHERE nascosto = 0 AND sede_chiave IS NOT NULL${filtro} ORDER BY ordine`).all(...par) as Array<{ sede: string; chiave: string; nome: string }>),
  };
}

function luogoDto(r: RigaLuogo, nomiConfidenti: Map<string, string>, legami: Collegamenti, marcatori: Map<string, { x: number; y: number }> = new Map(),
  regole: Map<string, RequisitoSpillo[]> = new Map(), st: StatoDisponibilita | null = null): LuogoDto {
  const confidenti = (JSON.parse(r.confidenti_json) as string[]).map((c) => ({ chiave: c, nome: nomiConfidenti.get(c) ?? c }));
  // La regola di presenza: sulla riga (071); il JSON della guida solo dove la riga non ne ha.
  const dellaRiga = leggiCondizioniSalvate(r.condizioni_json);
  const grezze = dellaRiga.length ? dellaRiga : (regole.get(r.chiave) ?? []);
  const nomi = nomiCondizioniMemo();
  const condizioni = grezze.length ? grezze.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) })) : null;
  const negozi = legami.negozi.get(r.chiave) ?? [];
  return {
    chiave: r.chiave, ordine: r.ordine, tipo: r.tipo as LuogoDto['tipo'], nome: r.nome, cosaOffre: r.cosa_offre, quando: r.quando as LuogoDto['quando'], giorni: giorniDiRiga(r.giorni_json), giorniTesto: descriviGiorni(giorniDiRiga(r.giorni_json)), sblocco: r.sblocco,
    confidenti, attivita: legami.attivita.get(r.chiave) ?? [], negozi, negozio: negozi[0]?.chiave ?? null, origine: r.origine === 'utente' ? 'utente' : 'seed',
    piatti: r.piatti_json ? (JSON.parse(r.piatti_json) as LuogoDto['piatti']) : null, note: r.note, verificato: r.verificato === 1,
    marcatore: marcatori.get(r.chiave) ?? null,
    condizioni,
    disponibilita: condizioni && st ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null,
  };
}

/** Le regole di presenza scritte a mano in `sblocco-luoghi` della guida: ripiego per le righe senza `condizioni_json`. */
function regoleSbloccoLuoghi(): Map<string, RequisitoSpillo[]> {
  const dati = datiGuida<{ luoghi?: Array<{ chiave: string; condizioni: unknown }> }>('sblocco-luoghi');
  const out = new Map<string, RequisitoSpillo[]>();
  for (const l of dati?.luoghi ?? []) {
    const condizioni = normalizzaCondizioniSpillo(l.condizioni);
    if (condizioni.length > 0) out.set(l.chiave, condizioni);
  }
  return out;
}

function nomiConfidenti(): Map<string, string> {
  return new Map((prepared('SELECT chiave, nome FROM confidente').all() as Array<{ chiave: string; nome: string }>).map((c) => [c.chiave, c.nome]));
}

/** «Entrata dei Memento» sta nella tabella dei quartieri, ma un quartiere non è: si raggiunge da
 *  `/guida/dungeon/mementos` e dalle richieste dei Memento. */
const NON_UN_QUARTIERE = new Set(['mementos']);

/** Le regole di sblocco dei quartieri, scritte a mano in `sblocco-quartieri`: la prosa resta e si
 *  continua a mostrarla, qui c'è la stessa cosa nella forma che il valutatore capisce. */
function regoleSblocco(): Map<string, RequisitoSpillo[]> {
  const dati = datiGuida<{ quartieri?: Array<{ chiave: string; condizioni: unknown }> }>('sblocco-quartieri');
  const out = new Map<string, RequisitoSpillo[]>();
  for (const q of dati?.quartieri ?? []) {
    const condizioni = normalizzaCondizioniSpillo(q.condizioni);
    if (condizioni.length > 0) out.set(q.chiave, condizioni);
  }
  return out;
}

/** Se il quartiere, al punto in cui è la partita, esiste già nel mondo. **Solo il rosso nasconde**:
 *  un dubbio non toglie un quartiere dalla mappa. Per il quartiere, che è una destinazione radice,
 *  il rango di un Confidente decide se ci puoi arrivare (decisione dell'utente, 7 settembre 2026). */
function disponibilitaQuartiere(chiave: string, regole: Map<string, RequisitoSpillo[]>, st: StatoDisponibilita | null): { disponibile: boolean; bloccoMotivo: string | null } {
  const condizioni = regole.get(chiave);
  if (!st || !condizioni) return { disponibile: true, bloccoMotivo: null };
  const esito = valutaRequisiti(condizioni.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c) })) as RequisitoDisponibilita[], st);
  if (esito.stato !== 'bloccato') return { disponibile: true, bloccoMotivo: null };
  return { disponibile: false, bloccoMotivo: esito.requisiti.map((r) => r.dettaglio).join(' · ') };
}

/** Quartieri in ordine con conteggi dei luoghi (non nascosti); con una partita, anche se sono già nel mondo. */
export function elencaQuartieri(partitaId?: number): QuartiereRiassuntoDto[] {
  const righe = (prepared(`SELECT q.*, (SELECT COUNT(*) FROM luogo l WHERE l.quartiere_chiave = q.chiave AND l.nascosto = 0) AS luoghi, (SELECT COUNT(*) FROM luogo l WHERE l.quartiere_chiave = q.chiave AND l.nascosto = 0 AND l.verificato = 1) AS verificati
    FROM quartiere q ORDER BY q.ordine`).all() as Array<RigaQuartiere & { luoghi: number; verificati: number }>)
    .filter((q) => !NON_UN_QUARTIERE.has(q.chiave));
  const regole = regoleSblocco();
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  return righe.map((q) => ({ chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, sbloccoData: q.sblocco_data, mappaChiave: chiaveMappa(chiaveImmagineQuartiere(q.chiave)), ingresso: ingressoQuartiere(q.chiave), descrizione: q.descrizione, luoghi: q.luoghi, verificati: q.verificati,
    ...disponibilitaQuartiere(q.chiave, regole, st) }));
}

/** Scheda di un quartiere con i luoghi. */
export function dettaglioQuartiere(chiave: string, partitaId?: number): QuartiereDettaglioDto {
  const q = prepared('SELECT * FROM quartiere WHERE chiave = ?').get(chiave) as RigaQuartiere | undefined;
  if (!q) throw httpErrors.notFound('quartiere-non-trovato', `Il quartiere '${chiave}' non esiste.`);
  const nomi = nomiConfidenti();
  const marcatori = new Map((prepared('SELECT l.luogo_chiave, l.x, l.y FROM marcatore_luogo l JOIN luogo g ON g.chiave = l.luogo_chiave WHERE g.quartiere_chiave = ?').all(chiave) as Array<{ luogo_chiave: string; x: number; y: number }>).map((r) => [r.luogo_chiave, { x: r.x, y: r.y }]));
  // Con la partita ogni luogo sa se, a quel punto del gioco, esiste già.
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const regole = regoleSbloccoLuoghi();
  const legami = collegamenti(chiave);
  const luoghi = (prepared('SELECT * FROM luogo WHERE quartiere_chiave = ? AND nascosto = 0 ORDER BY ordine').all(chiave) as RigaLuogo[]).map((r) => luogoDto(r, nomi, legami, marcatori, regole, st));
  const p = prepared('SELECT * FROM pianta_quartiere WHERE quartiere_chiave = ?').get(chiave) as RigaPiantaQ | undefined;
  const pianta: PiantaAreaDto | null = p ? { url: p.url, pagina: p.pagina, fonte: p.fonte, licenza: p.licenza, larghezza: p.larghezza, altezza: p.altezza, copertura: 'quartiere', note: p.note, alternative: [] } : null;
  const assenti = datiGuida<Record<string, string>>('mappe-citta-assenti') ?? {};
  const mappa = !!prepared("SELECT 1 FROM immagine WHERE ambito = 'mappa' AND chiave = ?").get(chiaveImmagineQuartiere(chiave));
  return { chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, sbloccoData: q.sblocco_data, mappaChiave: chiaveMappa(chiaveImmagineQuartiere(q.chiave)), ingresso: ingressoQuartiere(q.chiave), descrizione: q.descrizione, fonte: q.fonte, luoghi, mappa, pianta, piantaAssente: pianta ? null : (assenti[chiave] ?? null) };
}

/** Tutti i luoghi della città (non nascosti) come voci da scegliere: la sede di un negozio o di un'attività. */
export function elencaLuoghi(): LuogoOpzioneDto[] {
  return (prepared('SELECT l.chiave, l.nome, l.tipo, l.quartiere_chiave AS quartiere, q.nome AS quartiere_nome FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.nascosto = 0 ORDER BY q.ordine, l.ordine').all() as Array<{ chiave: string; nome: string; tipo: string; quartiere: string; quartiere_nome: string }>)
    .map((r) => ({ chiave: r.chiave, nome: r.nome, tipo: r.tipo, quartiere: r.quartiere, quartiereNome: r.quartiere_nome }));
}

/** Posiziona (o rimuove con null) lo spillo di un luogo sulla mappa del suo quartiere (coordinate in percentuale). */
export function impostaMarcatoreLuogo(luogoChiave: string, pos: { x: number; y: number } | null): { x: number; y: number } | null {
  if (!prepared('SELECT 1 FROM luogo WHERE chiave = ?').get(luogoChiave)) throw httpErrors.notFound('luogo-non-trovato', `Il luogo '${luogoChiave}' non esiste.`);
  if (pos === null) {
    prepared('DELETE FROM marcatore_luogo WHERE luogo_chiave = ?').run(luogoChiave);
    return null;
  }
  const x = Math.min(100, Math.max(0, pos.x)); const y = Math.min(100, Math.max(0, pos.y));
  prepared("INSERT INTO marcatore_luogo (luogo_chiave, x, y, updated_at, origine) VALUES (?, ?, ?, ?, 'utente') ON CONFLICT(luogo_chiave) DO UPDATE SET x = excluded.x, y = excluded.y, updated_at = excluded.updated_at, origine = 'utente'").run(luogoChiave, x, y, nowIso());
  return { x, y };
}

/** Scarica nell'istanza la mappa del quartiere dall'URL della guida. */
export async function scaricaPiantaQuartiere(quartiere: string): Promise<{ quartiere: string; mime: string; byte: number; fonte: string; url: string }> {
  const p = prepared('SELECT * FROM pianta_quartiere WHERE quartiere_chiave = ?').get(quartiere) as RigaPiantaQ | undefined;
  if (!p) throw httpErrors.notFound('pianta-non-disponibile', `Nessuna mappa collegata per il quartiere '${quartiere}'.`);
  const img = await importaImmagineDaUrl('mappa', chiaveImmagineQuartiere(quartiere), p.url);
  return { quartiere, mime: img.mime, byte: img.byte, fonte: p.fonte, url: p.url };
}

export function ingressoQuartiere(quartiere: string): IngressoQuartiereDto | null {
 const i = prepared('SELECT * FROM quartiere_ingresso WHERE quartiere_chiave=?').get(quartiere) as { mappa_chiave: string; x: number; y: number; zoom: number } | undefined;
 return i ? { mappa: chiaveMappa(i.mappa_chiave), nome: nomePercorso(i.mappa_chiave), x: i.x, y: i.y, zoom: i.zoom } : null;
}
export function impostaIngressoQuartiere(quartiere: string, dati: { mappa: string; x: number; y: number; zoom: number } | null): IngressoQuartiereDto | null {
 if (!prepared('SELECT 1 FROM quartiere WHERE chiave=?').get(quartiere)) throw httpErrors.notFound('quartiere-non-trovato', 'Quartiere inesistente.');
 if (dati === null) { prepared('DELETE FROM quartiere_ingresso WHERE quartiere_chiave=?').run(quartiere); return null; }
 const id = idMappa(dati.mappa);
 if (!prepared('SELECT 1 FROM mappa WHERE chiave=?').get(id)) throw httpErrors.notFound('mappa-non-trovata', 'Mappa inesistente.');
 prepared('INSERT INTO quartiere_ingresso VALUES(?,?,?,?,?) ON CONFLICT(quartiere_chiave) DO UPDATE SET mappa_chiave=excluded.mappa_chiave,x=excluded.x,y=excluded.y,zoom=excluded.zoom').run(quartiere, id, dati.x, dati.y, dati.zoom);
 return ingressoQuartiere(quartiere);
}
