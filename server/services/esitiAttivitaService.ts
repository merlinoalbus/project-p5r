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
import { coppiaBonus, dotiEsitoConPunti, haVersioniBonus, leggiEsitiAttivita, nomeStrumento, type DoteEsito, type EsitiAttivita, type EsitiAttivitaDto, type EsitoAttivita, type EsitoDisponibileDto, type SceltaEsitoSpunta, type SceltaEsitoVoceDto } from '../../shared/esitiAttivita.js';
import { nomeDote } from '../../shared/doti.js';
import { simboliPossibili } from '../../shared/note.js';
import type { EffettoVoceDto } from '../../shared/effettiVoce.js';
import { statoAlGiorno, statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';
import { scelteAlternativeDellaVoce } from './alternativeAcquistiService.js';
import { sqlPrezzoPerFascia } from './prezziArticoli.js';
import { normalizzaPrezzoPerFascia, prezzoNellaFascia, type PrezzoPerFascia } from '../../shared/catalogo.js';
import { copieDellOggetto } from './copieOggetti.js';
import { promemoriaLibriPerAttivita } from './modificatoriLibri.js';
import { fortunaSu } from './fortunaService.js';
import { origineNoteDellaVoce, puntiDote } from './puntiDoti.js';

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

interface ArticoloEsito { chiave: string; nome: string; prezzo: number | null; prezzoPerFascia: PrezzoPerFascia | null; condizioni: RequisitoSpillo[] }
/** L'articolo che fa tentare l'esito: il nome è quello del catalogo (la colonna `nome` dell'articolo può essere vuota), prezzo (con quello
 *  per fascia, Ondata 5 lotto E) e condizioni dal listino. */
function articoloEsito(chiave: string): ArticoloEsito | null {
  const perFascia = sqlPrezzoPerFascia('a');
  const a = prepared(catalogoOggettiDisponibile()
    ? `SELECT a.chiave, COALESCE(c.nome, NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo, ${perFascia} AS prezzo_per_fascia_json, a.condizioni_json FROM articolo a LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.chiave = ?`
    : `SELECT a.chiave, COALESCE(NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo, ${perFascia} AS prezzo_per_fascia_json, a.condizioni_json FROM articolo a WHERE a.chiave = ?`)
    .get(chiave) as { chiave: string; nome: string; prezzo: number | null; prezzo_per_fascia_json: string | null; condizioni_json: string | null } | undefined;
  return a ? { chiave: a.chiave, nome: a.nome, prezzo: a.prezzo, prezzoPerFascia: normalizzaPrezzoPerFascia(a.prezzo_per_fascia_json), condizioni: leggiCondizioniSalvate(a.condizioni_json) } : null;
}

/** Ondata 5 (lotto G): il trofeo dell'esito con il suo nome; un trofeo tolto dall'elenco si dice tale (registrando il turno non si segna). */
function trofeoEsito(chiave: string | undefined): EsitoDisponibileDto['trofeo'] {
  if (!chiave) return null;
  const r = prepared('SELECT nome FROM trofeo WHERE chiave = ?').get(chiave) as { nome: string } | undefined;
  return { chiave, nome: r?.nome ?? 'Trofeo non più nell’elenco' };
}

/** Ondata 5 (lotto G): gli oggetti dell'esito con il nome del catalogo; un oggetto che il catalogo non ha più si dice tale (registrando il
 *  turno non entra fra gli ottenuti). */
function oggettiEsito(oggetti: EsitoAttivita['oggetti']): EsitoDisponibileDto['oggetti'] {
  if (!oggetti?.length) return [];
  const nome = catalogoOggettiDisponibile() ? prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck() : null;
  return oggetti.map((o) => ({ chiave: o.oggetto, nome: (nome?.get(o.oggetto) as string | undefined) ?? 'Oggetto non più nel catalogo', quantita: o.quantita }));
}

/** Ondata 5 (lotto F-bis): gli oggetti che l'esito consuma, con il nome del catalogo e, con una partita, le copie possedute adesso (la stessa
 *  lettura della finestra «Regala»: possedute − regalate − consumate). Le copie non sono una condizione: chi gioca può averle prese in un modo
 *  che l'app non conosce, e la scelta mostra il numero senza bloccare. */
function consumaEsito(consuma: EsitoAttivita['consuma'], partitaId: number | undefined): EsitoDisponibileDto['consuma'] {
  if (!consuma?.length) return [];
  const conCatalogo = catalogoOggettiDisponibile();
  const nome = conCatalogo ? prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck() : null;
  return consuma.map((o) => ({ chiave: o.oggetto, nome: (nome?.get(o.oggetto) as string | undefined) ?? 'Oggetto non più nel catalogo', quantita: o.quantita,
    disponibili: partitaId !== undefined && conCatalogo ? copieDellOggetto(partitaId, o.oggetto).disponibili : null }));
}

/** Un esito come lo vede la scelta: le condizioni sono le sue più quelle dell'articolo, valutate sullo stato (senza stato: disponibile). */
function esitoDisponibile(e: EsitoAttivita, st: StatoDisponibilita | null): EsitoDisponibileDto {
  const articolo = e.articolo ? articoloEsito(e.articolo) : null;
  const nomi = nomiCondizioniMemo();
  const condizioni = [...(articolo?.condizioni ?? []), ...e.condizioni].map((c) => condizioneConTesto(c, nomi));
  const esito = st && condizioni.length ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null;
  const partitaId = st?.partitaId;
  return {
    // i punti che il turno darà davvero: con una partita anche la Fortuna accesa sulla Dote (la stessa lettura di `registraTurno`, `puntiDote`)
    chiave: e.chiave, nome: e.nome, gruppo: e.gruppo, premi: e.premi, doti: dotiEsitoConPunti(e.doti, partitaId !== undefined ? (dote) => fortunaSu(partitaId, dote) : undefined),
    // il prezzo che si scala è quello della fascia dello stato (la voce del Diario, o la partita per il contatore): la stessa regola di
    // `motoreDiario.yenDellEffetto` e di `registraTurno`, così la scelta dice l'importo che la spunta toglie davvero dal saldo
    articolo: articolo ? { chiave: articolo.chiave, nome: articolo.nome, prezzo: articolo.prezzo, prezzoPerFascia: articolo.prezzoPerFascia, prezzoNelMomento: prezzoNellaFascia(articolo.prezzo, articolo.prezzoPerFascia, st?.fasciaGioco) }
      : e.articolo ? { chiave: e.articolo, nome: 'Articolo non più nel listino', prezzo: null, prezzoPerFascia: null, prezzoNelMomento: null } : null,
    trofeo: trofeoEsito(e.trofeo),
    oggetti: oggettiEsito(e.oggetti),
    consuma: consumaEsito(e.consuma, st?.partitaId),
    bonusDi: e.bonusDi ?? null,
    disponibile: esito ? esito.stato !== 'bloccato' : true,
    condizioniTesto: condizioni.length ? condizioni.map((c) => c.testo).join(' · ') : null,
  };
}

/** L'esito automatico: l'unico con le condizioni vere; null se nessuno o più d'uno. */
function automatico(esiti: EsitoDisponibileDto[]): EsitoDisponibileDto | null {
  const validi = esiti.filter((e) => e.disponibile);
  return validi.length === 1 ? validi[0]! : null;
}

/** Ondata 5 (lotto F-bis): gli effetti dei libri letti che riguardano l'attività, con una partita; vuoti senza. */
function promemoriaAttivita(attivita: string, st: StatoDisponibilita | null): string[] {
  if (!st) return [];
  const tipo = prepared('SELECT tipo FROM attivita WHERE chiave = ?').pluck().get(attivita) as string | undefined;
  return tipo === undefined ? [] : promemoriaLibriPerAttivita(st.letture, { chiave: attivita, tipo });
}

/** Gli esiti di un'attività per la scheda e per il contatore, con la disponibilità nello stato dato (null senza partita). */
export function esitiDto(esiti: EsitiAttivita, st: StatoDisponibilita | null, attivita?: string): EsitiAttivitaDto {
  const elenco = esiti.esiti.map((e) => esitoDisponibile(e, st));
  return { modo: esiti.modo, esiti: elenco, automatico: esiti.modo === 'automatico' && st ? automatico(elenco)?.chiave ?? null : null,
    promemoria: attivita ? promemoriaAttivita(attivita, st) : [] };
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
  // «senza punti» si nomina solo se gli esiti danno Doti (la scelta lo offre solo allora: l'estrazione della lotteria è «Vinto» o «Non vinto»)
  if (scelta === undefined) throw httpErrors.conflict('esito-da-scegliere', `«${nomeAttivita}»: scegli l'esito ottenuto${esiti.esiti.some((x) => x.doti.length > 0) ? ' (o «senza punti»)' : ''} prima di registrare il turno.`);
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
export function scelteEsitoDellaVoce(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' }, effetti: readonly EffettoVoceDto[],
  /** Il tipo e il collegamento della voce: dicono se le note di una Dote valgono come libro o come film (`origineNoteDellaVoce`). */
  voce: { tipo: string; riferimento: { tipo: string } | null }): SceltaEsitoVoceDto[] {
  const da = effetti.filter((e) => richiedeScelta(e.effetto));
  const articoli = effetti.filter((e) => e.effetto.tipo === 'articolo');
  if (!da.length && articoli.length < 2) return [];
  // lo stato si calcola una volta sola e solo se serve (una voce con più articoli senza alternative non lo chiede)
  let calcolato: StatoDisponibilita | undefined;
  const stato = (): StatoDisponibilita => (calcolato ??= statoAlMomento(partitaId, momento));
  const esiti = da.map(({ uid, effetto: e }): { posizione: number; scelta: SceltaEsitoVoceDto } => {
    const st = stato();
    const posizione = effetti.findIndex((x) => x.uid === uid);
    // le note possibili con i punti che la spunta proporrà per ciascuna (la stessa conversione di `applicaEffettiAzione`)
    if (e.tipo === 'dote') {
      const origine = origineNoteDellaVoce(partitaId, voce);
      return { posizione, scelta: { effettoUid: uid, tipo: 'dote', dote: e.dote, doteNome: nomeDote(e.dote), possibili: e.possibili!, preselezionato: e.note,
        punti: e.possibili!.map((note) => ({ note, punti: puntiDote(partitaId, e.dote, note, origine) })) } };
    }
    const t = e as Extract<EffettoVoceDto['effetto'], { tipo: 'turno' }>;
    const a = esitiDellAttivita(t.attivita)!;
    const dto = esitiDto(a.esiti!, st, t.attivita);
    const elenco = dto.esiti;
    // 2026-10-27: lo strumento della voce ha una versione con il bonus: la spunta chiede solo «Bonus» sì/no, e parte sempre da «no» (il bonus
    // arriva a caso: lo dice chi gioca, decisione 22). Senza lo strumento nella voce, si sceglie nell'editor della voce, non alla spunta
    const coppia = coppiaBonus(a.esiti, t.esito);
    const bonus = coppia ? { bonus: { base: coppia.base.chiave, conBonus: coppia.bonus.chiave, nome: nomeStrumento(coppia.base), quantita: t.quantita ?? 1 } } : {};
    const daScegliere = !t.esito && haVersioniBonus(a.esiti) ? { strumentoDaScegliere: true as const } : {};
    const preselezionato = coppia ? coppia.base.chiave : t.esito && elenco.some((x) => x.chiave === t.esito) ? t.esito : null;
    return { posizione, scelta: { effettoUid: uid, tipo: 'turno', attivita: t.attivita, attivitaNome: a.nome, preselezionato, esiti: elenco,
      ...(dto.promemoria.length ? { promemoria: dto.promemoria } : {}), ...bonus, ...daScegliere } };
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
      // 2026-10-27: lo strumento con la versione con il bonus lo dice la voce; alla spunta si sceglie solo se con il bonus o no (la versione
      // base o quella con il bonus dello STESSO strumento). Senza strumento nella voce la spunta si ferma: lo si sceglie nell'editor
      const coppia = coppiaBonus(a.esiti, e.esito);
      if (coppia && scelta !== undefined && scelta !== coppia.base.chiave && scelta !== coppia.bonus.chiave) throw httpErrors.badRequest('esito-fuori-strumento', `«${a.nome}»: la voce indica ${nomeStrumento(coppia.base)}; alla spunta si sceglie solo se con il bonus o no.`);
      if (!coppia && !e.esito && haVersioniBonus(a.esiti) && !opz.storico) throw httpErrors.conflict('strumento-da-scegliere', `«${a.nome}»: la voce non dice che cosa si crea. Scegli strumento e quantità nell’editor della voce, poi spunta.`);
      if (opz.storico && a.esiti.modo === 'scelta' && scelta === undefined) throw httpErrors.conflict('esito-da-scegliere', `«${a.nome}»: l'esito si sceglie alla spunta. Togli e rimetti la spunta della voce per sceglierlo.`);
      out.set(uid, risolviEsitoTurno(e.attivita, a.esiti, scelta, stato()));
    }
  }
  return out;
}
