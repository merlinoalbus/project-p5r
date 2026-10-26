// ============================================================
// esitiAttivitaService — gli esiti dichiarati da un'attività: disponibilità, scelta alla spunta e al contatore (L13, ondata 2)
// ============================================================
//
// La fonte è una sola: `attivita.esiti_json` (`shared/esitiAttivita.ts`). Qui si leggono gli esiti con la loro disponibilità nella
// partita (condizioni proprie + condizioni dell'articolo che li fa tentare: il rango delle sfide della Big Bang Burger sta nel listino)
// e si risolve la scelta di chi gioca in Doti da registrare con il turno. Le regole:
//   - modo «scelta»: serve una scelta esplicita (la chiave dell'esito, o «senza punti»); senza, la spunta e il + del contatore si
//     fermano con 409 `esito-da-scegliere` (una decisione aperta non lascia passare: decisione A1 dell'utente, 2026-10-25);
//     un esito le cui condizioni sono rosse è rifiutato (409 `esito-non-disponibile`), come un libro non ancora disponibile;
//   - modo «automatico»: vale l'unico esito con le condizioni vere al giorno della voce (o della partita, per il contatore); se non ce
//     n'è uno solo, 409 `esito-automatico-incerto` con il motivo, mai un valore inventato;
//   - una Dote a valori possibili (`possibili` dell'effetto `dote`, la fabbricazione) chiede le note fra quelle dichiarate, o «nessuna».
// La spunta porta le scelte (`OpzioniSpunta.scelteEsito`), la ricevuta le ricorda (`turni[].esito`, `doti[].scelta`), togliere la spunta
// toglie il turno con le sue Doti (`annullaEffettiAzione`). Nessuna Dote si applica da sola: restano le proposte «Applica».
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { condizioneConTesto, leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { dotiEsitoConPunti, leggiEsitiAttivita, type DoteEsito, type EsitiAttivita, type EsitiAttivitaDto, type EsitoAttivita, type EsitoDisponibileDto, type SceltaEsitoSpunta, type SceltaEsitoVoceDto } from '../../shared/esitiAttivita.js';
import { nomeDote } from '../../shared/doti.js';
import { simboliPossibili } from '../../shared/note.js';
import type { EffettoVoceDto } from '../../shared/effettiVoce.js';
import { statoAlGiorno, statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';
import { scelteAlternativeDellaVoce } from './alternativeAcquistiService.js';

/** La scelta già risolta per un effetto della voce: le Doti dell'esito del turno, o le note della Dote a valori possibili (0 = nessuna). */
export type SceltaRisolta =
  | { tipo: 'turno'; esito: { chiave: string; nome: string; automatico?: boolean } | null; doti: DoteEsito[] }
  | { tipo: 'dote'; note: 0 | 1 | 2 | 3 };

/** Gli esiti dichiarati da un'attività (null se non ne dichiara o se la colonna non c'è ancora) e il suo nome. */
export function esitiDellAttivita(chiave: string): { nome: string; esiti: EsitiAttivita | null } | null {
  // `SELECT *`: su uno schema di prima della 233 la colonna non c'è e l'attività vale «senza esiti»
  const r = prepared('SELECT * FROM attivita WHERE chiave = ?').get(chiave) as { nome: string; esiti_json?: string | null } | undefined;
  return r ? { nome: r.nome, esiti: leggiEsitiAttivita(r.esiti_json) } : null;
}

interface ArticoloEsito { chiave: string; nome: string; prezzo: number | null; condizioni: RequisitoSpillo[] }
/** L'articolo che fa tentare l'esito: il nome è quello del catalogo (la colonna `nome` dell'articolo può essere vuota), prezzo e condizioni dal listino. */
function articoloEsito(chiave: string): ArticoloEsito | null {
  const a = prepared(catalogoOggettiDisponibile()
    ? "SELECT a.chiave, COALESCE(c.nome, NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo, a.condizioni_json FROM articolo a LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.chiave = ?"
    : "SELECT a.chiave, COALESCE(NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo, a.condizioni_json FROM articolo a WHERE a.chiave = ?")
    .get(chiave) as { chiave: string; nome: string; prezzo: number | null; condizioni_json: string | null } | undefined;
  return a ? { chiave: a.chiave, nome: a.nome, prezzo: a.prezzo, condizioni: leggiCondizioniSalvate(a.condizioni_json) } : null;
}

/** Un esito come lo vede la scelta: le condizioni sono le sue più quelle dell'articolo, valutate sullo stato (senza stato: disponibile). */
function esitoDisponibile(e: EsitoAttivita, st: StatoDisponibilita | null): EsitoDisponibileDto {
  const articolo = e.articolo ? articoloEsito(e.articolo) : null;
  const nomi = nomiCondizioniMemo();
  const condizioni = [...(articolo?.condizioni ?? []), ...e.condizioni].map((c) => condizioneConTesto(c, nomi));
  const esito = st && condizioni.length ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null;
  return {
    chiave: e.chiave, nome: e.nome, gruppo: e.gruppo, premi: e.premi, doti: dotiEsitoConPunti(e.doti),
    articolo: articolo ? { chiave: articolo.chiave, nome: articolo.nome, prezzo: articolo.prezzo } : e.articolo ? { chiave: e.articolo, nome: 'Articolo non più nel listino', prezzo: null } : null,
    disponibile: esito ? esito.stato !== 'bloccato' : true,
    condizioniTesto: condizioni.length ? condizioni.map((c) => c.testo).join(' · ') : null,
  };
}

/** L'esito automatico: l'unico con le condizioni vere; null se nessuno o più d'uno. */
function automatico(esiti: EsitoDisponibileDto[]): EsitoDisponibileDto | null {
  const validi = esiti.filter((e) => e.disponibile);
  return validi.length === 1 ? validi[0]! : null;
}

/** Gli esiti di un'attività per la scheda e per il contatore, con la disponibilità nello stato dato (null senza partita). */
export function esitiDto(esiti: EsitiAttivita, st: StatoDisponibilita | null): EsitiAttivitaDto {
  const elenco = esiti.esiti.map((e) => esitoDisponibile(e, st));
  return { modo: esiti.modo, esiti: elenco, automatico: esiti.modo === 'automatico' && st ? automatico(elenco)?.chiave ?? null : null };
}

/** Lo stato della partita al momento di una voce: il giorno (e quindi il giorno della settimana) e la fascia della voce. */
export function statoAlMomento(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' } | null, base?: StatoDisponibilita): StatoDisponibilita {
  const st = base ?? statoDisponibilitaPartita(partitaId);
  return momento ? { ...statoAlGiorno(st, momento.data), fasciaGioco: momento.fascia } : st;
}

/**
 * Risolve l'esito di UN turno dell'attività che dichiara esiti. `scelta`: la chiave scelta, null = «senza punti», undefined = nessuna
 * scelta arrivata (nel modo «scelta» ferma il gesto). Nel modo automatico la scelta non serve e, se arriva diversa, è rifiutata.
 */
export function risolviEsitoTurno(attivita: string, esiti: EsitiAttivita, scelta: string | null | undefined, st: StatoDisponibilita): Extract<SceltaRisolta, { tipo: 'turno' }> {
  const elenco = esiti.esiti.map((e) => esitoDisponibile(e, st));
  const nomeAttivita = esitiDellAttivita(attivita)?.nome ?? attivita;
  if (esiti.modo === 'automatico') {
    const vale = automatico(elenco);
    if (!vale) throw httpErrors.conflict('esito-automatico-incerto', `«${nomeAttivita}»: l'esito si ricava dalle condizioni, ma in questo momento ${elenco.some((e) => e.disponibile) ? 'ne valgono più d’uno' : 'non ne vale nessuno'}. Correggi gli esiti dell'attività.`);
    if (scelta !== undefined && scelta !== vale.chiave) throw httpErrors.conflict('esito-automatico', `«${nomeAttivita}»: l'esito vale da solo (${vale.nome}) e non si sceglie.`);
    const e = esiti.esiti.find((x) => x.chiave === vale.chiave)!;
    return { tipo: 'turno', esito: { chiave: e.chiave, nome: e.nome, automatico: true }, doti: e.doti };
  }
  if (scelta === undefined) throw httpErrors.conflict('esito-da-scegliere', `«${nomeAttivita}»: scegli l'esito ottenuto (o «senza punti») prima di registrare il turno.`);
  if (scelta === null) return { tipo: 'turno', esito: null, doti: [] };
  const e = esiti.esiti.find((x) => x.chiave === scelta);
  if (!e) throw httpErrors.badRequest('esito-sconosciuto', `«${nomeAttivita}» non dichiara questo esito: rileggi la voce.`);
  if (!elenco.find((x) => x.chiave === scelta)!.disponibile) throw httpErrors.conflict('esito-non-disponibile', `«${e.nome}» non è ancora possibile nella partita: ${elenco.find((x) => x.chiave === scelta)!.condizioniTesto ?? 'le condizioni non sono soddisfatte'}.`);
  return { tipo: 'turno', esito: { chiave: e.chiave, nome: e.nome }, doti: e.doti };
}

/** L'effetto chiede una scelta alla spunta? Un turno di un'attività con esiti nel modo «scelta», o una Dote a valori possibili. */
function richiedeScelta(e: EffettoVoceDto['effetto']): boolean {
  if (e.tipo === 'dote') return !!e.possibili;
  if (e.tipo !== 'turno') return false;
  return esitiDellAttivita(e.attivita)?.esiti?.modo === 'scelta';
}

/** Le scelte che la spunta di una voce chiede, con gli esiti disponibili al giorno della voce (per il Diario). L13 (decisione 4): anche
 *  la scelta fra gli articoli in alternativa (Set A o Set B, o nessuno), al posto del primo effetto del gruppo: tutto nell'ordine degli effetti. */
export function scelteEsitoDellaVoce(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' }, effetti: readonly EffettoVoceDto[]): SceltaEsitoVoceDto[] {
  const da = effetti.filter((e) => richiedeScelta(e.effetto));
  const articoli = effetti.filter((e) => e.effetto.tipo === 'articolo');
  if (!da.length && articoli.length < 2) return [];
  // lo stato si calcola una volta sola e solo se serve (una voce con più articoli senza alternative non lo chiede)
  let calcolato: StatoDisponibilita | undefined;
  const stato = (): StatoDisponibilita => (calcolato ??= statoAlMomento(partitaId, momento));
  const esiti = da.map(({ uid, effetto: e }): { posizione: number; scelta: SceltaEsitoVoceDto } => {
    const st = stato();
    const posizione = effetti.findIndex((x) => x.uid === uid);
    if (e.tipo === 'dote') return { posizione, scelta: { effettoUid: uid, tipo: 'dote', dote: e.dote, doteNome: nomeDote(e.dote), possibili: e.possibili!, preselezionato: e.note } };
    const t = e as Extract<EffettoVoceDto['effetto'], { tipo: 'turno' }>;
    const a = esitiDellAttivita(t.attivita)!;
    const elenco = esitiDto(a.esiti!, st).esiti;
    return { posizione, scelta: { effettoUid: uid, tipo: 'turno', attivita: t.attivita, attivitaNome: a.nome, preselezionato: t.esito && elenco.some((x) => x.chiave === t.esito) ? t.esito : null, esiti: elenco } };
  });
  return [...esiti, ...scelteAlternativeDellaVoce(effetti, stato)].sort((a, b) => a.posizione - b.posizione).map((x) => x.scelta);
}

/**
 * Le scelte della spunta di una voce, verificate e risolte (per uid dell'effetto). Ogni effetto che chiede una scelta deve averne una e una
 * sola; una scelta per un effetto che non la chiede, ripetuta o del tipo sbagliato è rifiutata (400). I turni nel modo automatico si
 * risolvono qui, senza scelta. `storico`: il raccordo di un effetto nuovo su una spunta già data (nessuno può scegliere): vale l'esito
 * atteso dichiarato dalla voce, altrimenti il raccordo si ferma (409) e la voce si rispunta per scegliere.
 */
export function risolviScelteSpunta(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' } | null, effetti: readonly EffettoVoceDto[], scelte: readonly SceltaEsitoSpunta[] | undefined, opz: { storico?: boolean } = {}): Map<string, SceltaRisolta> {
  const per = new Map<string, SceltaEsitoSpunta>();
  for (const s of scelte ?? []) {
    const e = effetti.find((x) => x.uid === s.effettoUid);
    if (per.has(s.effettoUid) || !e || e.effetto.tipo !== s.tipo || !richiedeScelta(e.effetto)) throw httpErrors.badRequest('scelta-esito-non-valida', 'Una scelta d’esito non appartiene a un effetto della voce che la chiede, oppure è ripetuta.');
    per.set(s.effettoUid, s);
  }
  const out = new Map<string, SceltaRisolta>();
  let st: StatoDisponibilita | null = null;
  const stato = () => (st ??= statoAlMomento(partitaId, momento));
  for (const { uid, effetto: e } of effetti) {
    if (e.tipo === 'dote' && e.possibili) {
      const s = per.get(uid);
      if (!s || s.tipo !== 'dote') {
        if (opz.storico) throw httpErrors.conflict('esito-da-scegliere', `${nomeDote(e.dote)}: le note si scelgono alla spunta. Togli e rimetti la spunta della voce per sceglierle.`);
        throw httpErrors.conflict('esito-da-scegliere', `${nomeDote(e.dote)}: scegli quante note hai ottenuto (o «nessuna») prima di spuntare.`);
      }
      if (s.note !== 0 && !e.possibili.includes(s.note)) throw httpErrors.badRequest('note-non-possibili', `${nomeDote(e.dote)}: le note possibili sono ${simboliPossibili(e.possibili)}.`);
      out.set(uid, { tipo: 'dote', note: s.note });
    } else if (e.tipo === 'turno') {
      const a = esitiDellAttivita(e.attivita);
      if (!a?.esiti) continue;
      const s = per.get(uid);
      const scelta = s?.tipo === 'turno' ? s.esito : opz.storico && a.esiti.modo === 'scelta' && e.esito ? e.esito : undefined;
      if (opz.storico && a.esiti.modo === 'scelta' && scelta === undefined) throw httpErrors.conflict('esito-da-scegliere', `«${a.nome}»: l'esito si sceglie alla spunta. Togli e rimetti la spunta della voce per sceglierlo.`);
      out.set(uid, risolviEsitoTurno(e.attivita, a.esiti, scelta, stato()));
    }
  }
  return out;
}
