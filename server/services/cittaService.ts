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

import { chiaveMappa, idMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { descriviGiorni, leggiGiorni } from '../../shared/orariNegozio.js';
import type { IngressoQuartiereDto, LuogoOpzioneDto } from '../../shared/types.js';
import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { ImmagineDto, LuogoDto, PiantaAreaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';
import { importaImmagineDaUrl, leggiImmagine } from './immaginiService.js';
import { mappaEsiste, scaricaImmagineMappa } from './mappe/mappeService.js';
import { areeDelContenitore, numeroAreePerQuartiere } from './mappe/areeService.js';
import { verificaIngressoNelQuartiere } from './mappe/casaMappa.js';
import { illustrazioneDellaMappa, immaginiCaricateDelleMappe } from './mappe/immagineMappa.js';
import { datiGuida } from './datiGuida.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';

interface RigaPiantaQ { quartiere_chiave: string; url: string; pagina: string | null; fonte: string; licenza: string; larghezza: number | null; altezza: number | null; note: string }

/** Chiave dell'immagine (ambito «mappa») della mappa di un quartiere. */
export const chiaveImmagineQuartiere = (quartiere: string): string => `citta-${quartiere}`;

interface RigaQuartiere { sblocco_data: string | null; chiave: string; ordine: number; nome: string; sblocco: string | null; descrizione: string; fonte: string }

interface RigaLuogo { chiave: string; quartiere_chiave: string; ordine: number; tipo: string; nome: string; cosa_offre: string; quando: string | null; giorni_json: string; sblocco: string | null; confidenti_json: string; piatti_json: string | null; note: string | null; fonte: string; verificato: number; origine: string; condizioni_json: string | null }

interface Collegamenti { negozi: Map<string, Array<{ chiave: string; nome: string }>>; attivita: Map<string, Array<{ chiave: string; nome: string }>> }

/** I negozi e le attività di ogni luogo, dalle sedi dichiarate. */
function collegamenti(quartiere?: string): Collegamenti {
  /** Raggruppa le righe per sede, conservandone l'ordine. */
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

/** Un luogo come DTO: Confidenti con il nome (o la chiave se sconosciuti), negozi e attività dalle sedi (il primo negozio fa
 *  da `negozio`), giorni con la loro frase, marcatore sulla mappa, condizioni di presenza e, con lo stato della partita,
 *  la loro valutazione. */
function luogoDto(r: RigaLuogo, nomiConfidenti: Map<string, string>, legami: Collegamenti, marcatori: Map<string, { x: number; y: number }> = new Map(),
  regole: Map<string, RequisitoSpillo[]> = new Map(), st: StatoDisponibilita | null = null): LuogoDto {
  const confidenti = (JSON.parse(r.confidenti_json) as string[]).map((c) => ({ chiave: c, nome: nomiConfidenti.get(c) ?? c }));
  // La regola di presenza: sulla riga (071); il JSON della guida solo dove la riga non ne ha.
  const dellaRiga = leggiCondizioniSalvate(r.condizioni_json);
  const grezze = dellaRiga.length ? dellaRiga : (regole.get(r.chiave) ?? []);
  const nomi = nomiCondizioniMemo();
  const condizioni = grezze.length ? grezze.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) })) : null;
  const negozi = legami.negozi.get(r.chiave) ?? [];
  const giorni = leggiGiorni(r.giorni_json);
  return {
    chiave: r.chiave, ordine: r.ordine, tipo: r.tipo as LuogoDto['tipo'], nome: r.nome, cosaOffre: r.cosa_offre, quando: r.quando as LuogoDto['quando'], giorni, giorniTesto: descriviGiorni(giorni), sblocco: r.sblocco,
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

/** Nome di ogni Confidente, per chiave. */
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
  const caricate = immaginiCaricateDelleMappe();
  const aree = numeroAreePerQuartiere();
  return righe.map((q) => ({ chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, sbloccoData: q.sblocco_data, mappaChiave: chiaveMappa(chiaveImmagineQuartiere(q.chiave)), ingresso: ingressoQuartiere(q.chiave), descrizione: q.descrizione, luoghi: q.luoghi, verificati: q.verificati,
    illustrazione: illustrazioneDellaMappa(chiaveImmagineQuartiere(q.chiave), undefined, caricate),
    aree: aree.get(q.chiave) ?? 0,
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
  // L'immagine della mappa con la regola unica (L1): la caricata, registrata su `immagine_chiave` o con la chiave della mappa.
  const illustrazione = illustrazioneDellaMappa(chiaveImmagineQuartiere(chiave));
  const mappa = illustrazione.immagineUrl !== null;
  // le Aree del quartiere (L2), nel loro ordine, col passaggio sull'illustrazione e l'ingresso
  const aree = areeDelContenitore({ colonna: 'quartiere_chiave', chiave: q.chiave, mappa: chiaveImmagineQuartiere(q.chiave), nome: q.nome });
  return { chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, sbloccoData: q.sblocco_data, mappaChiave: chiaveMappa(chiaveImmagineQuartiere(q.chiave)), ingresso: ingressoQuartiere(q.chiave), descrizione: q.descrizione, fonte: q.fonte, luoghi, mappa, illustrazione, aree, pianta, piantaAssente: pianta ? null : (assenti[chiave] ?? null) };
}

/** Tutti i luoghi della città (non nascosti) come voci da scegliere: la sede di un negozio o di un'attività. */
export function elencaLuoghi(): LuogoOpzioneDto[] {
  return (prepared('SELECT l.chiave, l.nome, l.tipo, l.quartiere_chiave AS quartiere, q.nome AS quartiere_nome FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.nascosto = 0 ORDER BY q.ordine, l.ordine').all() as Array<{ chiave: string; nome: string; tipo: string; quartiere: string; quartiere_nome: string }>)
    .map((r) => ({ chiave: r.chiave, nome: r.nome, tipo: r.tipo, quartiere: r.quartiere, quartiereNome: r.quartiere_nome }));
}

/**
 * Scarica nell'istanza la mappa del quartiere dall'URL della guida. Se la mappa del quartiere esiste passa dalla strada dell'editor
 * (L1, F5 del validatore): pezzi da confermare (409 `mappa-con-pezzi` senza `eliminaPezzi`), dimensioni e ruolo. L'origine della
 * mappa resta com'era: è la pianta pubblicata dai dati di gioco, scaricata da sola all'apertura del quartiere, non una scelta
 * dell'utente (una mappa del seed segnata «utente» non si aggiornerebbe più col pacchetto).
 */
export async function scaricaPiantaQuartiere(quartiere: string, opz: { eliminaPezzi?: boolean } = {}): Promise<{ quartiere: string; mime: string; byte: number; fonte: string; url: string }> {
  const p = prepared('SELECT * FROM pianta_quartiere WHERE quartiere_chiave = ?').get(quartiere) as RigaPiantaQ | undefined;
  if (!p) throw httpErrors.notFound('pianta-non-disponibile', `Nessuna mappa collegata per il quartiere '${quartiere}'.`);
  const chiave = chiaveImmagineQuartiere(quartiere);
  let img: ImmagineDto;
  if (mappaEsiste(chiave)) {
    await scaricaImmagineMappa(chiave, p.url, { eliminaPezzi: opz.eliminaPezzi, dellUtente: false });
    img = leggiImmagine('mappa', chiave)!;
  } else img = await importaImmagineDaUrl('mappa', chiave, p.url);
  return { quartiere, mime: img.mime, byte: img.byte, fonte: p.fonte, url: p.url };
}

/** Il punto d'ingresso del quartiere su una mappa (chiave pubblica e nome del percorso, posizione e zoom), o null se non è impostato. */
function ingressoQuartiere(quartiere: string): IngressoQuartiereDto | null {
 const i = prepared('SELECT * FROM quartiere_ingresso WHERE quartiere_chiave=?').get(quartiere) as { mappa_chiave: string; x: number; y: number; zoom: number; area_chiave?: string | null } | undefined;
 if (!i) return null;
 // l'Area della planimetria d'ingresso (L2): quella registrata, e su uno schema di prima nessuna
 const area = i.area_chiave ? prepared('SELECT slug, nome FROM area WHERE chiave = ?').get(i.area_chiave) as { slug: string; nome: string } | undefined : undefined;
 return { mappa: chiaveMappa(i.mappa_chiave), nome: nomePercorso(i.mappa_chiave), x: i.x, y: i.y, zoom: i.zoom, area: area ? { slug: area.slug, nome: area.nome } : null };
}
/** Imposta (o, con `null`, toglie) l'ingresso del quartiere. Dalla L2 l'ingresso è un'Area del quartiere più un punto: con `area`
 *  (slug) la planimetria è la predefinita dell'Area in quel momento; con `mappa` (il corpo di prima) la planimetria si riconduce
 *  alla sua identità interna (`idMappa`) e l'Area si deduce da lei. In tutti e due i casi l'Area dev'essere del quartiere. 404 se
 *  mancano quartiere, Area o mappa. Restituisce l'ingresso com'è dopo la scrittura. */
export function impostaIngressoQuartiere(quartiere: string, dati: { mappa?: string; area?: string; x: number; y: number; zoom: number } | null): IngressoQuartiereDto | null {
 if (!prepared('SELECT 1 FROM quartiere WHERE chiave=?').get(quartiere)) throw httpErrors.notFound('quartiere-non-trovato', 'Quartiere inesistente.');
 if (dati === null) { prepared('DELETE FROM quartiere_ingresso WHERE quartiere_chiave=?').run(quartiere); return null; }
 let id: string;
 if (dati.area !== undefined) {
   const a = prepared('SELECT planimetria_predefinita FROM area WHERE quartiere_chiave = ? AND slug = ?').get(quartiere, dati.area) as { planimetria_predefinita: string | null } | undefined;
   if (!a) throw httpErrors.notFound('area-non-trovata', `Nessuna area '${dati.area}' in questo quartiere.`);
   if (!a.planimetria_predefinita) throw httpErrors.badRequest('area-senza-planimetrie', 'L’area non ha planimetrie su cui mettere l’ingresso.');
   id = a.planimetria_predefinita;
 } else {
   if (dati.mappa === undefined) throw httpErrors.badRequest('ingresso-senza-area', 'Indica l’area (o la planimetria) dell’ingresso.');
   id = idMappa(dati.mappa);
 }
 if (!prepared('SELECT 1 FROM mappa WHERE chiave=?').get(id)) throw httpErrors.notFound('mappa-non-trovata', 'Mappa inesistente.');
 // l'ingresso sta in un'Area di questo quartiere (L2, R2-21; difetto FUN2-1)
 verificaIngressoNelQuartiere(quartiere, id);
 // colonne dette per nome (dalla 109 la tabella ha anche l'Area, che si deduce dalla planimetria)
 prepared(`INSERT INTO quartiere_ingresso (quartiere_chiave, mappa_chiave, x, y, zoom, area_chiave) VALUES (?, ?, ?, ?, ?, (SELECT area_chiave FROM mappa WHERE chiave = ?))
   ON CONFLICT(quartiere_chiave) DO UPDATE SET mappa_chiave=excluded.mappa_chiave,x=excluded.x,y=excluded.y,zoom=excluded.zoom,area_chiave=excluded.area_chiave`).run(quartiere, id, dati.x, dati.y, dati.zoom, id);
 return ingressoQuartiere(quartiere);
}
