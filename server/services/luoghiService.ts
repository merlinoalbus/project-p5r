// ============================================================
// luoghiService — il luogo è la fonte (L5 «Luoghi, negozi, orari», lotti/L5/modifiche.md §2, §3)
// ============================================================
//
// Una funzione sola per la presenza di un luogo, `presenzaDelLuogo` (§2): **sbloccato** (le condizioni di sblocco della riga, ripiego
// `sblocco-luoghi` della guida, valutate come oggi; da L6 la condizione effettiva) e **aperto** (gli orari del luogo, o l'eccezione del
// negozio, NULL = regola dell'app «giorno e sera», contro giorno della settimana, fascia e meteo della partita). La usano tutte le viste:
// pagina del luogo, carte del quartiere e dell'area, popup e scheda del pin, sezione del negozio, «Dove si trova».
// Qui anche il DTO del luogo (`luogoDto`, che `cittaService` usa per le carte del quartiere), la pagina del luogo e i luoghi da collocare.
// Le letture in blocco stanno in `lettureLuoghi`: una risposta con molti luoghi le fa una volta.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { t } from './traduzioniService.js';
import { condizioniDiSblocco, invitiPerSblocco } from './sbloccoLuoghi.js';
import type { RigaInvito } from './condizioni/condizioneEffettiva.js';
import { elencaInviti } from './inviti.js';
import { chiaveMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { casaDellArea, casaDellaMappa, contestoAree, type ContestoAree } from './mappe/casaMappa.js';
import { statoDisponibilitaPartita, valutaRequisiti, valutaRequisitiSpillo, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { dettaglioNegozio, acquistiDellaPartita } from './negoziService.js';
import { lettureListiniCondivisi, listinoDelNegozio, type LettureListiniCondivisi } from './listiniCondivisi.js';
import { attivitaDellaSede } from './attivitaService.js';
import { condizioneConTesto, descriviRequisitoSpillo, leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

export { condizioniDiSblocco } from './sbloccoLuoghi.js';
import { descriviGiorni, descriviOrari, descriviOrariDelLuogo, leggiGiorni, leggiOrari, orariComeCondizioni, orariDelLuogo, type OrariDelLuogo, type OrariNegozio } from '../../shared/orariNegozio.js';
import type { LuogoDettaglioDto, LuogoDto, PresenzaLuogoDto } from '../../shared/types.js';

/** Una riga di `luogo` (con le colonne della 115, assenti su uno schema di prima). */
export interface RigaLuogo {
  chiave: string; quartiere_chiave: string; ordine: number; tipo: string; nome: string; cosa_offre: string; quando: string | null; giorni_json: string;
  sblocco: string | null; confidenti_json: string; piatti_json: string | null; note: string | null; fonte: string; verificato: number; origine: string;
  condizioni_json: string | null; seed_json?: string | null; area_chiave?: string | null; orari_json?: string | null; solo_eventi_confidente?: string | null;
}

/** Un pin di un luogo: la planimetria, la casa dell'area aperta sullo spillo e la nota propria del pin (descrizione diversa). */
interface PinDelLuogo { spillo: number; mappa: string; mappaNome: string; casa: string; notaPin: string | null }

/** Le letture che servono ai luoghi di una risposta, fatte una volta. */
export interface LettureLuoghi {
  listini?: LettureListiniCondivisi;
  st: StatoDisponibilita | null;
  nomiConfidenti: Map<string, string>;
  nomiQuartieri: Map<string, string>;
  negozi: Map<string, Array<{ chiave: string; nome: string }>>;
  attivita: Map<string, Array<{ chiave: string; nome: string }>>;
  /** L6: gli inviti dei Confidenti, letti una volta (lo sblocco di un luogo è la sua condizione oppure un invito che lo apre). */
  inviti: RigaInvito[];
  aree: ContestoAree;
  pin: Map<string, PinDelLuogo[]>;
  /** Tutti i luoghi (anche nascosti: un pin può citarne uno), per chiave. */
  righe: Map<string, RigaLuogo>;
  /** Sede, eccezione d'orario e quartiere (`luogo_chiave`) di ogni negozio. */
  sediNegozi: Map<string, { sede: string | null; eccezione: string | null; quartiere: string | null; nome: string; sblocco: string | null }>;
}

/** Raggruppa le righe per sede, conservandone l'ordine. */
function perSede(righe: Array<{ sede: string; chiave: string; nome: string }>): Map<string, Array<{ chiave: string; nome: string }>> {
  const out = new Map<string, Array<{ chiave: string; nome: string }>>();
  for (const r of righe) {
    const elenco = out.get(r.sede) ?? out.set(r.sede, []).get(r.sede)!;
    if (!elenco.some((n) => n.chiave === r.chiave)) elenco.push({ chiave: r.chiave, nome: r.nome });
  }
  return out;
}

/** La pagina di un luogo: `/guida/luogo/<quartiere>/<luogo>` (la chiave è già «quartiere/luogo»). */
export function casaDelLuogo(chiave: string): string {
  const i = chiave.indexOf('/');
  return i > 0 ? `/guida/luogo/${encodeURIComponent(chiave.slice(0, i))}/${encodeURIComponent(chiave.slice(i + 1))}` : `/guida/luogo/${encodeURIComponent(chiave)}`;
}

/** I pin di ogni luogo (riferimento `luogo`), in ordine di id, con la casa dell'area aperta sullo spillo e la nota propria del pin. */
function pinDeiLuoghi(aree: ContestoAree, luogo?: string): Map<string, PinDelLuogo[]> {
  const righe = prepared(`SELECT s.id, s.riferimento_chiave AS luogo, s.descrizione, m.chiave AS mappa, m.tipo, m.entita_tipo, m.entita_chiave, m.area_chiave, l.cosa_offre
    FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave JOIN luogo l ON l.chiave = s.riferimento_chiave
    WHERE s.riferimento_tipo = 'luogo' ${luogo ? 'AND s.riferimento_chiave = ?' : ''} ORDER BY s.id`).all(...(luogo ? [luogo] : [])) as
    Array<{ id: number; luogo: string; descrizione: string | null; mappa: string; tipo: string; entita_tipo: string | null; entita_chiave: string | null; area_chiave: string | null; cosa_offre: string }>;
  const out = new Map<string, PinDelLuogo[]>();
  for (const r of righe) {
    const casa = casaDellaMappa({ chiave: r.mappa, tipo: r.tipo, entita_tipo: r.entita_tipo, entita_chiave: r.entita_chiave, area_chiave: r.area_chiave }, aree);
    const descrizione = (r.descrizione ?? '').trim();
    (out.get(r.luogo) ?? out.set(r.luogo, []).get(r.luogo)!).push({ spillo: r.id, mappa: chiaveMappa(r.mappa), mappaNome: nomePercorso(r.mappa),
      casa: `${casa}${casa.includes('?') ? '&' : '?'}spillo=${r.id}`, notaPin: descrizione && descrizione !== r.cosa_offre.trim() ? descrizione : null });
  }
  return out;
}

/** Legge una volta quel che serve ai luoghi (di un quartiere o di tutti); con la partita lo stato per la presenza (quello già calcolato da
 *  chi chiama, se lo passa). */
export function lettureLuoghi(partitaId?: number, luogo?: string, stDato?: StatoDisponibilita | null): LettureLuoghi {
  const aree = contestoAree();
  const listini = lettureListiniCondivisi();
  const negozi = prepared('SELECT sede_chiave AS sede, chiave, nome FROM negozio WHERE nascosto = 0 ORDER BY ordine').all() as Array<{ sede: string | null; chiave: string; nome: string }>;
  const nomiNegozi = new Map(negozi.map((n) => [n.chiave, n.nome]));
  const sedi = [...negozi.flatMap((n) => n.sede !== null && !listini.negozi.has(n.chiave) ? [{ ...n, sede: n.sede }] : []),
    ...listini.sedi.map((s) => ({ sede: s.luogo, chiave: listinoDelNegozio(s.negozio, listini), nome: nomiNegozi.get(listinoDelNegozio(s.negozio, listini)) ?? '' }))];
  const conEccezione = (prepared('PRAGMA table_info(negozio)').all() as Array<{ name: string }>).some((c) => c.name === 'eccezione_orari_json');
  return {
    listini,
    st: stDato !== undefined ? stDato : partitaId === undefined ? null : statoDisponibilitaPartita(partitaId),
    righe: new Map((prepared('SELECT * FROM luogo').all() as RigaLuogo[]).map((r) => [r.chiave, r])),
    sediNegozi: new Map((prepared(`SELECT chiave, nome, sede_chiave, luogo_chiave, sblocco_json, ${conEccezione ? 'eccezione_orari_json' : 'NULL AS eccezione_orari_json'} FROM negozio`).all() as
      Array<{ chiave: string; nome: string; sede_chiave: string | null; luogo_chiave: string | null; eccezione_orari_json: string | null; sblocco_json: string | null }>)
      .map((n) => [n.chiave, { sede: n.sede_chiave, eccezione: n.eccezione_orari_json, quartiere: n.luogo_chiave, nome: n.nome, sblocco: n.sblocco_json }])),
    nomiConfidenti: new Map((prepared('SELECT chiave, nome FROM confidente').all() as Array<{ chiave: string; nome: string }>).map((c) => [c.chiave, c.nome])),
    nomiQuartieri: aree.nomiQuartieri.size ? aree.nomiQuartieri : new Map((prepared('SELECT chiave, nome FROM quartiere').all() as Array<{ chiave: string; nome: string }>).map((q) => [q.chiave, q.nome])),
    negozi: perSede(sedi),
    attivita: perSede(prepared('SELECT sede_chiave AS sede, chiave, nome FROM attivita WHERE nascosto = 0 AND sede_chiave IS NOT NULL ORDER BY ordine').all() as Array<{ sede: string; chiave: string; nome: string }>),
    inviti: invitiPerSblocco(),
    aree,
    pin: pinDeiLuoghi(aree, luogo),
  };
}

/**
 * La presenza di un luogo (§2), funzione unica: `sbloccato` dalle condizioni di sblocco (solo il rosso chiude: un dubbio non toglie un posto
 * dal mondo), `aperto` dagli orari (del luogo, o l'eccezione di un negozio quando la si passa) contro la partita, null senza partita; `testo`
 * con gli orari in parole e lo stato. Un luogo non ancora sbloccato non è «aperto».
 */
export function presenzaDelLuogo(condizioni: RequisitoSpillo[], orari: OrariNegozio & { origine?: 'guida' | 'regola-app' }, st: StatoDisponibilita | null): PresenzaLuogoDto {
  const orariTesto = 'origine' in orari && orari.origine ? descriviOrariDelLuogo(orari as OrariDelLuogo) : descriviOrari(orari);
  if (!st) return { sbloccato: null, aperto: null, testo: orariTesto };
  const nomi = nomiCondizioniMemo();
  const sblocco = condizioni.length ? valutaRequisiti(condizioni.map((c) => condizioneConTesto(c, nomi)) as RequisitoDisponibilita[], st) : null;
  const sbloccato = !sblocco || sblocco.stato !== 'bloccato';
  if (!sbloccato) {
    const motivo = sblocco!.requisiti.filter((q) => q.stato === 'rosso').map((q) => q.dettaglio || q.testo).filter(Boolean).join(' · ');
    return { sbloccato: false, aperto: false, testo: motivo ? `Non ancora nel mondo · ${motivo}` : 'Non ancora nel mondo' };
  }
  const regoleOrari = orariComeCondizioni(orari).map((c) => condizioneConTesto(c, nomi)) as RequisitoDisponibilita[];
  const aperto = regoleOrari.length === 0 || valutaRequisitiSpillo(regoleOrari, st, nomi).stato !== 'bloccato';
  return { sbloccato: true, aperto, testo: `${aperto ? 'Aperto adesso' : 'Chiuso adesso'} · ${orariTesto}` };
}

/** La presenza di un negozio con sede: lo sblocco del luogo e l'orario del negozio (la sua eccezione, o quello del luogo). */
export function presenzaDelNegozio(sede: RigaLuogo, eccezioneJson: string | null, l: Pick<LettureLuoghi, 'inviti' | 'st'>, sbloccoJson: string | null = null): PresenzaLuogoDto {
  return presenzaDelLuogo([...condizioniDiSblocco(sede, l.inviti), ...leggiCondizioniSalvate(sbloccoJson)], eccezioneJson ? leggiOrari(eccezioneJson) : orariDelLuogo(sede.orari_json), l.st);
}

/** Il luogo come DTO (§3.1): negozi e attività dalle sedi, Confidenti con il nome, condizioni con il testo, area, orari e presenza dal luogo,
 *  la sua pagina e il primo pin (con quanti altri ne ha). `giorni`/`giorniTesto`/`quando` restano, derivati dagli orari (una fonte). */
export function luogoDto(r: RigaLuogo, l: LettureLuoghi): LuogoDto {
  const confidenti = (JSON.parse(r.confidenti_json) as string[]).map((c) => ({ chiave: c, nome: l.nomiConfidenti.get(c) ?? c }));
  const nomi = nomiCondizioniMemo();
  const grezze = condizioniDiSblocco(r, l.inviti);
  const condizioni = grezze.length ? grezze.map((c) => condizioneConTesto(c, nomi)) : null;
  const negozi = l.negozi.get(r.chiave) ?? [];
  const orari = orariDelLuogo(r.orari_json ?? null);
  // `quando` e `giorni` per compatibilità: dagli orari del luogo, se la colonna c'è; su uno schema di prima quelli della riga
  const conOrari = r.orari_json !== undefined;
  const giorni = conOrari ? orari.giorni : leggiGiorni(r.giorni_json);
  const quando = conOrari ? (orari.fasce.length === 1 ? orari.fasce[0] : 'entrambe') : (r.quando as LuogoDto['quando']);
  const area = r.area_chiave ? l.aree.aree.get(r.area_chiave) : undefined;
  const pin = l.pin.get(r.chiave) ?? [];
  return {
    chiave: r.chiave, ordine: r.ordine, tipo: r.tipo as LuogoDto['tipo'], nome: r.nome, cosaOffre: r.cosa_offre, quando, giorni, giorniTesto: descriviGiorni(giorni), sblocco: r.sblocco,
    confidenti, attivita: l.attivita.get(r.chiave) ?? [], negozi, negozio: negozi[0]?.chiave ?? null, origine: r.origine === 'utente' ? 'utente' : 'seed',
    piatti: r.piatti_json ? (JSON.parse(r.piatti_json) as LuogoDto['piatti']) : null, note: r.note, verificato: r.verificato === 1,
    condizioni,
    disponibilita: condizioni && l.st ? valutaRequisiti(condizioni as RequisitoDisponibilita[], l.st) : null,
    quartiere: r.quartiere_chiave, quartiereNome: l.nomiQuartieri.get(r.quartiere_chiave) ?? r.quartiere_chiave,
    area: area ? { slug: area.slug, nome: area.nome, casa: casaDellArea(area) ?? casaDelLuogo(r.chiave) } : null,
    orari, orariTesto: descriviOrariDelLuogo(orari),
    presenza: presenzaDelLuogo(grezze, orari, l.st),
    casa: casaDelLuogo(r.chiave),
    pin: pin[0] ? { spillo: pin[0].spillo, mappa: pin[0].mappa, casa: pin[0].casa } : null,
    altriPin: Math.max(0, pin.length - 1),
    soloEventiConfidente: r.solo_eventi_confidente ? { chiave: r.solo_eventi_confidente, nome: l.nomiConfidenti.get(r.solo_eventi_confidente) ?? r.solo_eventi_confidente } : null,
  };
}

/** Il pin di un luogo (o di un negozio con sede) come lo vede il visore (B3): nome e descrizione dal luogo, la nota propria del pin, la
 *  presenza e se il luogo è solo per gli eventi di un Confidente. */
export interface LuogoDelPin { luogo: RigaLuogo; presenza: PresenzaLuogoDto; notaPin: string | null; soloEventi: string | null; casa: string;
  /** Il nome e la descrizione che il pin mostra: del luogo per un pin di luogo; per un pin di negozio il nome del negozio (un luogo può avere
   *  più negozi, e la sede può stare in un altro quartiere) con la descrizione propria del pin. */
  nome: string; descrizione: string }

/**
 * Il luogo a cui un pin rimanda (riferimento `luogo`, `attivita` con lo stesso schema, o `negozio` con sede), con la presenza del luogo (per un
 * negozio con l'eccezione del negozio), la nota del pin (il suo nome o la sua descrizione, se diversi da quelli del luogo: mai persi) e la
 * pagina del luogo (per un negozio la sua sezione). Null per gli altri pin e per un negozio senza sede.
 */
export function luogoDelPin(s: { uid?: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; nome: string; descrizione: string | null }, l: LettureLuoghi): LuogoDelPin | null {
  if (!s.riferimento_tipo || !s.riferimento_chiave) return null;
  let luogo: RigaLuogo | undefined;
  let eccezione: string | null = null;
  let sbloccoNegozio: string | null = null;
  let casa: string;
  if (s.riferimento_tipo === 'luogo' || s.riferimento_tipo === 'attivita') {
    luogo = l.righe.get(s.riferimento_chiave);
    if (!luogo) return null;
    casa = casaDelLuogo(luogo.chiave);
  } else if (s.riferimento_tipo === 'negozio') {
    const listino = l.listini ? listinoDelNegozio(s.riferimento_chiave, l.listini) : s.riferimento_chiave;
    const n = l.sediNegozi.get(listino);
    const sede = s.uid ? l.listini?.pin.get(s.uid) : undefined;
    const chiaveSede = sede?.negozio === s.riferimento_chiave ? sede.luogo : n?.sede;
    luogo = chiaveSede ? l.righe.get(chiaveSede) : undefined;
    if (!n || !luogo) return null;
    eccezione = n.eccezione;
    sbloccoNegozio = n.sblocco;
    casa = `${casaDelLuogo(luogo.chiave)}#negozio-${encodeURIComponent(listino)}`;
  } else return null;
  const orari = eccezione ? leggiOrari(eccezione) : orariDelLuogo(luogo.orari_json ?? null);
  const presenza = presenzaDelLuogo([...condizioniDiSblocco(luogo, l.inviti), ...leggiCondizioniSalvate(sbloccoNegozio)], orari, l.st);
  const descrizione = (s.descrizione ?? '').trim();
  if (s.riferimento_tipo === 'negozio') {
    const listino = l.listini ? listinoDelNegozio(s.riferimento_chiave, l.listini) : s.riferimento_chiave;
    const nomeNegozio = l.sediNegozi.get(listino)?.nome ?? l.sediNegozi.get(s.riferimento_chiave)!.nome;
    const notaNome = s.nome.trim() && s.nome.trim() !== nomeNegozio.trim() ? `«${s.nome.trim()}»` : null;
    return { luogo, presenza, notaPin: notaNome, soloEventi: luogo.solo_eventi_confidente ?? null, casa, nome: nomeNegozio, descrizione };
  }
  const nota: string[] = [];
  if (s.nome.trim() && s.nome.trim() !== luogo.nome.trim()) nota.push(`«${s.nome.trim()}»`);
  if (descrizione && descrizione !== luogo.cosa_offre.trim()) nota.push(descrizione);
  return { luogo, presenza, notaPin: nota.length ? nota.join(' — ') : null, soloEventi: luogo.solo_eventi_confidente ?? null, casa, nome: luogo.nome, descrizione: luogo.cosa_offre };
}

/** Un luogo non nascosto per chiave, o null. */
export function rigaLuogo(chiave: string): RigaLuogo | null {
  return (prepared('SELECT * FROM luogo WHERE chiave = ? AND nascosto = 0').get(chiave) as RigaLuogo | undefined) ?? null;
}

/** I luoghi di un'Area di L2 (`luogo.area_chiave`, non nascosti), nell'ordine, come DTO; vuoto su uno schema senza la colonna. */
export function luoghiDellArea(area: string, l: LettureLuoghi): LuogoDto[] {
  if (!(prepared('PRAGMA table_info(luogo)').all() as Array<{ name: string }>).some((c) => c.name === 'area_chiave')) return [];
  return (prepared('SELECT * FROM luogo WHERE area_chiave = ? AND nascosto = 0 ORDER BY ordine').all(area) as RigaLuogo[]).map((r) => luogoDto(r, l));
}

/** I luoghi di un quartiere (non nascosti), nell'ordine, come DTO. */
export function luoghiDelQuartiere(quartiere: string, l: LettureLuoghi): LuogoDto[] {
  return (prepared('SELECT * FROM luogo WHERE quartiere_chiave = ? AND nascosto = 0 ORDER BY ordine').all(quartiere) as RigaLuogo[]).map((r) => luogoDto(r, l));
}

/**
 * I luoghi del quartiere senza Area («da collocare», §4.3), con la proposta: l'unica Area del quartiere, se ne ha una sola (l'Area è dedotta,
 * non provata: si salva solo con «Colloca»). Vuoto su uno schema senza `luogo.area_chiave`.
 */
export function luoghiDaCollocare(quartiere: string, l: LettureLuoghi): Array<LuogoDto & { areaProposta: { slug: string; nome: string } | null }> {
  if (!(prepared('PRAGMA table_info(luogo)').all() as Array<{ name: string }>).some((c) => c.name === 'area_chiave')) return [];
  const areeDelQuartiere = [...l.aree.aree.values()].filter((a) => a.quartiere_chiave === quartiere);
  const proposta = areeDelQuartiere.length === 1 ? { slug: areeDelQuartiere[0].slug, nome: areeDelQuartiere[0].nome } : null;
  return (prepared('SELECT * FROM luogo WHERE quartiere_chiave = ? AND nascosto = 0 AND area_chiave IS NULL ORDER BY ordine').all(quartiere) as RigaLuogo[])
    .map((r) => ({ ...luogoDto(r, l), areaProposta: proposta }));
}

/**
 * La pagina del luogo (§4.1, `GET /api/compendio/luoghi/:quartiere/:luogo?partita=`): il luogo con un listino per ogni negozio della sede (articoli e
 * acquisti della partita), le attività intere, i Confidenti con l'arcano e la pagina, tutti i pin con la nota propria. 404 `luogo-non-trovato`.
 */
export function dettaglioLuogo(quartiere: string, luogo: string, partitaId?: number): LuogoDettaglioDto {
  const chiave = `${quartiere}/${luogo}`;
  const r = rigaLuogo(chiave);
  if (!r || r.quartiere_chiave !== quartiere) throw httpErrors.notFound('luogo-non-trovato', `Il luogo '${chiave}' non esiste.`);
  if (partitaId !== undefined) verificaPartita(partitaId);
  const l = lettureLuoghi(partitaId, chiave);
  const dto = luogoDto(r, l);
  const contesto = { listini: l.listini, ...(partitaId !== undefined && l.st ? { st: l.st, acquistati: acquistiDellaPartita(partitaId) } : {}) };
  const listini = (l.negozi.get(chiave) ?? []).map((n) => dettaglioNegozio(n.chiave, partitaId, contesto, chiave));
  const arcani = new Map((prepared('SELECT chiave, arcana FROM confidente').all() as Array<{ chiave: string; arcana: string }>).map((c) => [c.chiave, c.arcana]));
  const nomi = nomiCondizioniMemo();
  // lo sblocco in parole, dalla condizione (le condizioni dell'elenco valgono tutte insieme; un gruppo «almeno una» ha la sua frase)
  const sbloccoTesto = dto.condizioni?.length ? dto.condizioni.map((c) => descriviRequisitoSpillo(c, nomi)).join(' · ') : null;
  return {
    ...dto, listini, attivitaDettaglio: attivitaDellaSede(chiave, partitaId),
    confidentiDettaglio: dto.confidenti.map((c) => ({ chiave: c.chiave, nome: c.nome, arcanaNome: arcani.has(c.chiave) ? t('arcana', arcani.get(c.chiave)!) : '', casa: `/confidenti/${encodeURIComponent(c.chiave)}` })),
    pins: l.pin.get(chiave) ?? [],
    modificato: r.origine !== 'utente' && !!r.seed_json,
    sbloccoTesto,
    // L6: gli inviti che aprono il luogo, con lo stato della partita (il gesto «Invito avvenuto» accanto alla condizione)
    inviti: elencaInviti({ apreTipo: 'luogo', apreChiave: chiave }, partitaId),
  };
}
