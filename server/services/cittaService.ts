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
import type { IngressoQuartiereDto, LuogoOpzioneDto } from '../../shared/types.js';
import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { ImmagineDto, PiantaAreaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';
import { lettureLuoghi, luoghiDaCollocare, luoghiDelQuartiere } from './luoghiService.js';
import { importaImmagineDaUrl, leggiImmagine } from './immaginiService.js';
import { mappaEsiste, scaricaImmagineMappa } from './mappe/mappeService.js';
import { areeDelContenitore, numeroAreePerQuartiere } from './mappe/areeService.js';
import { verificaIngressoNelQuartiere } from './mappe/casaMappa.js';
import { illustrazioneDellaMappa, immaginiCaricateDelleMappe } from './mappe/immagineMappa.js';
import { datiGuida } from './datiGuida.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

interface RigaPiantaQ { quartiere_chiave: string; url: string; pagina: string | null; fonte: string; licenza: string; larghezza: number | null; altezza: number | null; note: string }

/** Chiave dell'immagine (ambito «mappa») della mappa di un quartiere. */
export const chiaveImmagineQuartiere = (quartiere: string): string => `citta-${quartiere}`;

interface RigaQuartiere { sblocco_data: string | null; chiave: string; ordine: number; nome: string; sblocco: string | null; descrizione: string; fonte: string }

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
  // L5: il luogo è la fonte (orari, presenza, area, pin) con le letture e il DTO unici di `luoghiService`; con la partita ogni luogo sa se, a
  // quel punto del gioco, esiste già ed è aperto. `marcatore_luogo` non si legge più (i pin coprono le posizioni, R5-19).
  const letture = lettureLuoghi(partitaId);
  const luoghi = luoghiDelQuartiere(chiave, letture);
  const p = prepared('SELECT * FROM pianta_quartiere WHERE quartiere_chiave = ?').get(chiave) as RigaPiantaQ | undefined;
  const pianta: PiantaAreaDto | null = p ? { url: p.url, pagina: p.pagina, fonte: p.fonte, licenza: p.licenza, larghezza: p.larghezza, altezza: p.altezza, copertura: 'quartiere', note: p.note, alternative: [] } : null;
  const assenti = datiGuida<Record<string, string>>('mappe-citta-assenti') ?? {};
  // L'immagine della mappa con la regola unica (L1): la caricata, registrata su `immagine_chiave` o con la chiave della mappa.
  const illustrazione = illustrazioneDellaMappa(chiaveImmagineQuartiere(chiave));
  const mappa = illustrazione.immagineUrl !== null;
  // le Aree del quartiere (L2), nel loro ordine, col passaggio sull'illustrazione e l'ingresso
  // (il contenitore scritto qui e non da `contenitoreDaRotta`: anche l'ingresso dei Memento ha la sua scheda, senza Aree)
  const aree = areeDelContenitore({ colonna: 'quartiere_chiave', chiave: q.chiave, mappa: chiaveImmagineQuartiere(q.chiave), nome: q.nome, rotta: 'citta', prefisso: `citta/${q.chiave}/`, tipoPlanimetria: 'luogo' });
  return { chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, sbloccoData: q.sblocco_data, mappaChiave: chiaveMappa(chiaveImmagineQuartiere(q.chiave)), ingresso: ingressoQuartiere(q.chiave), descrizione: q.descrizione, fonte: q.fonte, luoghi, mappa, illustrazione, aree, pianta, piantaAssente: pianta ? null : (assenti[chiave] ?? null),
    luoghiDaCollocare: luoghiDaCollocare(chiave, letture) };
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
