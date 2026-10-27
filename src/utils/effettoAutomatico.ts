// ============================================================
// effettoAutomatico — dal tipo della voce e da «Quale» all'effetto della spunta (finestra della voce, tavole approvate il 2026-10-24)
// ============================================================
//
// L'utente: «gli effetti della voce dovrebbero essere associati già automaticamente grazie alla selezione di Collegata A e Quale».
// Il tipo (l'icona) decide a che cosa si collega la voce (`RIFERIMENTO_DI_TIPO`); scelto «Quale», l'effetto della spunta che gli
// corrisponde nasce da solo. Il FORMATO degli effetti non cambia (`EffettoVoce`, lista con UID): cambia come si sceglie.
//
// L13 (ondata 4a, richiesta dell'utente sui due acquisti della stessa voce in due punti diversi): niente più effetto «principale» e
// «aggiuntivi». Gli effetti della voce sono UN elenco, tutti allo stesso livello, e «Spuntando succede» li mostra tutti. Resta solo una
// regola, dichiarata nell'elenco con «segue Quale»: l'effetto che corrisponde esattamente a tipo e «Quale» (`indiceDelCollegamento`) segue
// «Quale» quando lo si cambia. All'apertura NIENTE si ricava in silenzio: un collegamento salvato non si riscrive, uno nullo resta nullo, e
// se gli effetti indicano un collegamento univoco (`collegamentoSuggerito`) la finestra lo PROPONE con un pulsante (prima si scriveva da
// solo salvando: un dato cambiava senza che l'utente l'avesse toccato).
// ============================================================

import { RIFERIMENTO_DI_TIPO, type TipoAzione, type TipoRiferimentoAzione } from '../../shared/effettiAzione';
import { eDote, nomeDote } from '../../shared/doti';
import { simboliNote } from '../../shared/note';
import { fraseEffettoConNomi, type EffettoVoce, type NomiFraseEffetto, type RichiestaSalvaEffettiVoce } from '../../shared/effettiVoce';
import type { ElenchiAzioneDto, ElenchiEffettiVoceDto, FasciaGioco } from '../types';
import { prezzoNellaFascia } from '../../shared/catalogo';
import type { CampiStrutturati } from './azioneStrutturata';

export type RigaEffetto = RichiestaSalvaEffettiVoce['effetti'][number];
type Rif = CampiStrutturati['riferimento'];

/** Che cosa serve per decidere l'effetto di un collegamento: quali attività sono videogiochi e quali si contano a turni. */
export interface ContestoEffetti { videogiochi: ReadonlySet<string>; turni: ReadonlySet<string> }

export const contestoDa = (e: ElenchiAzioneDto): ContestoEffetti => ({
  videogiochi: new Set(e.videogiochi.map((v) => v.chiave)),
  turni: new Set(e.attivita.filter((a) => a.turni).map((a) => a.chiave)),
});

/** Il tipo di collegamento che il tipo della voce chiede; i tipi senza genere proprio mostrano quello del collegamento che hanno. */
export const tipoQuale = (tipo: TipoAzione, rif: Rif): TipoRiferimentoAzione | null => RIFERIMENTO_DI_TIPO[tipo] ?? rif?.tipo ?? null;

/** L'effetto è quello che tipo e collegamento della voce producono da soli? */
export function eDelCollegamento(tipo: TipoAzione, rif: Rif, e: EffettoVoce): boolean {
  const k = rif?.chiave ?? '';
  switch (tipo) {
    case 'libro': return !!k && e.tipo === 'lettura' && e.categoria === 'libro' && e.chiave === k;
    case 'dvd': return !!k && e.tipo === 'lettura' && e.categoria === 'film' && e.chiave === k;
    case 'attivita': return !!k && e.tipo === 'lettura' && e.categoria === 'videogioco' && e.chiave === k;
    case 'lavoro': return !!k && e.tipo === 'turno' && e.attivita === k;
    case 'dote': return !!k && e.tipo === 'dote' && e.dote === k;
    case 'richiesta': return !!k && e.tipo === 'richiesta' && e.richiesta === k;
    case 'acquisto': return !!k && e.tipo === 'articolo' && e.articolo.startsWith(`${k}/`);
    // esame e trama non hanno un «Quale» da cui l'effetto dipenda (la domanda e l'evento si aggiungono a mano dall'elenco): nessun effetto «segue Quale»
    default: return false;
  }
}

/** L'effetto è del genere che il tipo produce, qualunque sia l'elemento (per i tipi con un effetto legato a «Quale»)? */
function eDelGenere(tipo: TipoAzione, e: EffettoVoce): boolean {
  switch (tipo) {
    case 'libro': return e.tipo === 'lettura' && e.categoria === 'libro';
    case 'dvd': return e.tipo === 'lettura' && e.categoria === 'film';
    case 'attivita': return e.tipo === 'lettura' && e.categoria === 'videogioco';
    case 'lavoro': return e.tipo === 'turno';
    case 'dote': return e.tipo === 'dote';
    case 'richiesta': return e.tipo === 'richiesta';
    case 'acquisto': return e.tipo === 'articolo' && e.articolo.includes('/');
    default: return false;
  }
}

/** Il negozio di un articolo: la chiave dell'articolo è «negozio/articolo» (vale per tutti gli articoli del catalogo). */
export const negozioDiArticolo = (articolo: string): string => articolo.slice(0, Math.max(0, articolo.indexOf('/')));

/** Il collegamento che l'effetto del genere implica (per una voce salvata senza collegamento); null se l'effetto non lo dice. */
export function riferimentoDaEffetto(tipo: TipoAzione, e: EffettoVoce): Rif {
  switch (tipo) {
    case 'libro': return e.tipo === 'lettura' ? { tipo: 'libro', chiave: e.chiave } : null;
    case 'dvd': return e.tipo === 'lettura' ? { tipo: 'film', chiave: e.chiave } : null;
    case 'attivita': return e.tipo === 'lettura' ? { tipo: 'attivita', chiave: e.chiave } : null;
    case 'lavoro': return e.tipo === 'turno' ? { tipo: 'attivita', chiave: e.attivita } : null;
    case 'dote': return e.tipo === 'dote' ? { tipo: 'dote', chiave: e.dote } : null;
    case 'richiesta': return e.tipo === 'richiesta' ? { tipo: 'richiesta', chiave: e.richiesta } : null;
    case 'acquisto': return e.tipo === 'articolo' && negozioDiArticolo(e.articolo) ? { tipo: 'negozio', chiave: negozioDiArticolo(e.articolo) } : null;
    default: return null;
  }
}

/**
 * Il collegamento che gli effetti di una voce SENZA collegamento indicano, se è uno solo: tutti gli effetti del genere del tipo portano
 * allo stesso elemento (la stessa Dote, lo stesso libro; per un acquisto, articoli tutti dello stesso negozio). null se la voce ha già un
 * collegamento, se nessun effetto lo indica o se ne indicano più d'uno. È una PROPOSTA che la finestra mostra con un pulsante: non si
 * scrive mai da sola.
 */
export function collegamentoSuggerito(tipo: TipoAzione, rif: Rif, righe: readonly RigaEffetto[]): NonNullable<Rif> | null {
  if (rif) return null;
  const chiavi = new Map<string, NonNullable<Rif>>();
  for (const r of righe) {
    if (!eDelGenere(tipo, r.effetto)) continue;
    const c = riferimentoDaEffetto(tipo, r.effetto);
    if (c) chiavi.set(`${c.tipo}:${c.chiave}`, c);
  }
  return chiavi.size === 1 ? [...chiavi.values()][0]! : null;
}

/** Il collegamento salvato è di un genere diverso da quello che il tipo chiede (negozio su un lavoro, film su una Dote)? */
export const eAltroGenere = (tipo: TipoAzione, rif: Rif): boolean => !!rif && !!RIFERIMENTO_DI_TIPO[tipo] && rif.tipo !== RIFERIMENTO_DI_TIPO[tipo];

/**
 * Il posto, nell'elenco, dell'effetto che corrisponde esattamente a tipo e «Quale» della voce (-1 se non c'è): è quello che «segue Quale»
 * cambiandolo. Un collegamento di altro genere non ne ha nessuno: nessun effetto salvato viene riscritto da «Quale» senza corrispondere.
 */
export function indiceDelCollegamento(righe: readonly RigaEffetto[], tipo: TipoAzione, rif: Rif): number {
  // un acquisto non ha un effetto che segue «Quale»: gli articoli si scelgono negli «Acquisti da questo negozio»
  if (tipo === 'acquisto') return -1;
  return righe.findIndex((r) => eDelCollegamento(tipo, rif, r.effetto));
}

/** L'effetto con cui nasce una voce quando si sceglie «Quale»; null se il tipo non ne ha o se l'effetto si sceglie nel riquadro (articolo, domanda, evento). */
export function effettoIniziale(tipo: TipoAzione, rif: Rif, ctx: ContestoEffetti): EffettoVoce | null {
  const k = rif?.chiave ?? '';
  if (!k) return null;
  switch (tipo) {
    case 'libro': return { tipo: 'lettura', categoria: 'libro', chiave: k, almeno: null };
    case 'dvd': return { tipo: 'lettura', categoria: 'film', chiave: k, almeno: null };
    case 'attivita': return ctx.videogiochi.has(k) ? { tipo: 'lettura', categoria: 'videogioco', chiave: k, almeno: null } : null;
    case 'lavoro': return ctx.turni.has(k) ? { tipo: 'turno', attivita: k } : null;
    case 'dote': return rif?.tipo === 'dote' && eDote(k) ? { tipo: 'dote', dote: k, note: 2 } : null;
    case 'richiesta': return { tipo: 'richiesta', richiesta: k };
    default: return null;
  }
}

/**
 * Il cambio di tipo o di «Quale»: aggiorna il collegamento e fa seguire l'effetto che «segue Quale» (`indiceDelCollegamento`). Quello di
 * prima, se nato in questa finestra (senza UID), si toglie; se già salvato e dello stesso genere si riscrive al suo posto tenendo il suo
 * UID; altrimenti resta nell'elenco (mai cancellato in silenzio). Un effetto salvato che non corrisponde al collegamento di prima non si
 * tocca: se serve, quello nuovo si aggiunge accanto e l'elenco li mostra tutti e due. Il rango atteso resta solo per un Confidente.
 */
export function cambiaCollegamento(s: CampiStrutturati, tipo: TipoAzione, rif: Rif, ctx: ContestoEffetti): CampiStrutturati {
  const base: CampiStrutturati = { ...s, tipo, riferimento: rif, rangoAtteso: tipo === 'confidente' && rif ? s.rangoAtteso : null };
  if (!s.effettiVoce) return base;
  let righe = [...s.effettiVoce];
  const nuovo = effettoIniziale(tipo, rif, ctx);
  const i = indiceDelCollegamento(righe, s.tipo, s.riferimento);
  let scritto = false;
  // Un effetto già salvato che è proprio quello del nuovo collegamento (stessa Dote, stesso libro…) diventa il principale così com'è:
  // niente effetto nuovo, niente riscrittura, note invariate. Se le chiavi uguali sono più d'una si adotta la prima, le altre restano.
  const adottato = nuovo ? righe.findIndex((r, j) => j !== i && eDelCollegamento(tipo, rif, r.effetto)) : -1;
  if (adottato >= 0) {
    scritto = true;
    if (i >= 0 && righe[i].uid === null) righe = righe.filter((_, j) => j !== i);
  } else if (i >= 0) {
    if (righe[i].uid === null) righe = righe.filter((_, j) => j !== i);
    else if (nuovo && nuovo.tipo === righe[i].effetto.tipo) { righe[i] = { uid: righe[i].uid, effetto: nuovo }; scritto = true; }
  }
  if (nuovo && !scritto) righe.push({ uid: null, effetto: nuovo });
  return { ...base, effettiVoce: righe };
}

/**
 * L'effetto «compilato dall'utente» che `cambiaCollegamento` toglierebbe cambiando tipo o «Quale»: quello che «segue Quale», nato in questa
 * finestra (senza UID) e DIVERSO da come nasce da solo (`effettoIniziale` del collegamento di prima), cioè ritoccato a mano o aggiunto a mano.
 * null se il cambio non toglie niente o toglie solo l'effetto automatico, non ritoccato. La finestra lo usa per avvisare prima di toglierlo.
 */
export function effettoCompilatoCheSiPerde(s: CampiStrutturati, tipo: TipoAzione, rif: Rif, ctx: ContestoEffetti): EffettoVoce | null {
  if (!s.effettiVoce) return null;
  const i = indiceDelCollegamento(s.effettiVoce, s.tipo, s.riferimento);
  const riga = i >= 0 ? s.effettiVoce[i] : undefined;
  if (!riga || riga.uid !== null) return null;
  // stesso tipo e stesso «Quale» (nessun cambio): niente da togliere
  if (tipo === s.tipo && rif?.tipo === s.riferimento?.tipo && rif?.chiave === s.riferimento?.chiave) return null;
  const automatico = effettoIniziale(s.tipo, s.riferimento, ctx);
  return automatico && JSON.stringify(automatico) === JSON.stringify(riga.effetto) ? null : riga.effetto;
}

/** I nomi con cui scrivere le frasi degli effetti: tutto per chiave, preso dagli elenchi serviti dall'API. */
export interface NomiEffetti {
  libri: Map<string, string>; film: Map<string, string>; videogiochi: Map<string, string>; attivita: Map<string, string>; richieste: Map<string, string>;
  articoli: Map<string, ElenchiEffettiVoceDto['articoli'][number]>; domande: Map<number, ElenchiEffettiVoceDto['domande'][number]>;
  inviti: Map<string, ElenchiEffettiVoceDto['inviti'][number]>; persone: Map<number, ElenchiEffettiVoceDto['persone'][number]>;
  /** L13: oggetti del catalogo e trofei, per chiave (assenti finché il server non li serve). */
  oggetti?: Map<string, string>; trofei?: Map<string, string>;
  /** 2026-10-27: gli esiti dei turni per «attività/esito»: il nome e, per gli esiti con la versione con il bonus, lo strumento («Grimaldello»). */
  esitiTurno?: Map<string, { nome: string; strumento?: string }>;
}

const mappa = <T extends { chiave: string; nome: string }>(l: T[]): Map<string, string> => new Map(l.map((x) => [x.chiave, x.nome]));

/** Ondata 5 (lotto E, decisione 5): con la fascia della voce (`fascia`) il prezzo di un articolo è quello che la spunta scala (500 ¥ di sera per
 *  le sfide della Big Bang Burger) e il prezzo per fascia non si ripete; senza, resta quello del listino con l'altra fascia accanto nelle frasi. */
export function nomiEffettiDa(e: ElenchiAzioneDto, x: ElenchiEffettiVoceDto, fascia?: FasciaGioco | null): NomiEffetti {
  const nellaFascia = (a: ElenchiEffettiVoceDto['articoli'][number]): ElenchiEffettiVoceDto['articoli'][number] => {
    if (!fascia || !a.prezzoPerFascia) return a;
    const { prezzoPerFascia, ...resto } = a;
    return { ...resto, prezzo: prezzoNellaFascia(a.prezzo, prezzoPerFascia, fascia) };
  };
  return {
    libri: mappa(e.libri), film: mappa(e.film), videogiochi: mappa(e.videogiochi), attivita: mappa(e.attivita), richieste: mappa(e.richieste),
    articoli: new Map(x.articoli.map((a) => [a.chiave, nellaFascia(a)])), domande: new Map(x.domande.map((d) => [d.id, d])),
    inviti: new Map(x.inviti.map((i) => [i.chiave, i])), persone: new Map(x.persone.map((p) => [p.id, p])),
    oggetti: mappa(x.oggetti ?? []), trofei: mappa(x.trofei ?? []),
    esitiTurno: new Map(e.attivita.flatMap((a) => (a.esiti?.elenco ?? []).map((x) => [`${a.chiave}/${x.chiave}`, { nome: x.nome, ...(x.strumento ? { strumento: x.strumento } : {}) }] as const))),
  };
}

const note = simboliNote;
const sessioni = (n: number, film: boolean) => (film ? (n === 1 ? 'visione o serata' : 'visioni o serate') : n === 1 ? 'sessione' : 'sessioni');

/** La frase che dice che cosa succede spuntando: mai chiavi, sempre nomi. */
export function fraseEffetto(e: EffettoVoce, n: NomiEffetti): string {
  switch (e.tipo) {
    case 'dote': return `${nomeDote(e.dote)} +${note(e.note)}: la Dote che dà il gioco, da segnare nelle Doti`;
    case 'lettura': {
      if (e.categoria === 'libro') { const nome = n.libri.get(e.chiave) ?? 'Libro'; return e.almeno === null ? `${nome}: lettura completata` : `${nome}: letto almeno ${e.almeno} ${sessioni(e.almeno, false)}`; }
      if (e.categoria === 'film') { const nome = n.film.get(e.chiave) ?? 'Film'; return e.almeno === null ? `${nome}: visione completata (al cinema: una visione)` : `${nome}: almeno ${e.almeno} ${sessioni(e.almeno, true)}`; }
      const nome = n.videogiochi.get(e.chiave) ?? 'Videogioco';
      return e.almeno === null ? `${nome}: gioco completato` : `${nome}: sessione di gioco, almeno ${e.almeno}`;
    }
    case 'turno': {
      const nome = n.attivita.get(e.attivita) ?? 'Attività';
      // 2026-10-27: con l'esito, lo strumento e la quantità (il bonus si dice alla spunta) o l'esito atteso; le Doti le dà l'esito
      if (e.esito) {
        const x = n.esitiTurno?.get(`${e.attivita}/${e.esito}`);
        const quanti = e.quantita && e.quantita > 1 ? ` ×${e.quantita}` : '';
        return x?.strumento ? `Turno: ${nome} — ${x.strumento}${quanti}, bonus sì o no alla spunta` : `Turno: ${nome} — esito atteso: ${x?.nome ?? 'esito non più dichiarato'}${quanti}, lo confermi alla spunta`;
      }
      if ([...(n.esitiTurno ?? [])].some(([k, x]) => k.startsWith(`${e.attivita}/`) && x.strumento)) return `Turno: ${nome} — strumento e quantità da scegliere nell’editor della voce`;
      return `Turno: ${nome} — ${e.doti?.length ? `Doti proprie di questo turno (${e.doti.map((d) => `${nomeDote(d.dote)} ${note(d.note)}`).join('; ')})` : 'le Doti sono quelle del lavoro'}`;
    }
    case 'acquisto': return `Acquisto Aojiru${e.variante ? `: ${nomeDote(e.variante)}` : ' (variante da osservare nella partita)'}`;
    // gli effetti che citano l'oggetto per chiave, più pesca e Fortuna: la frase è quella condivisa col server (una sola scrittura)
    default: return fraseEffettoConNomi(e, nomiFrase(n));
  }
}

/** I nomi della pagina (mappe già servite dall'API) nella forma con cui la frase condivisa li cerca. */
const nomiFrase = (n: NomiEffetti): NomiFraseEffetto => ({
  domanda: (id) => n.domande.get(id)?.testo, richiesta: (k) => n.richieste.get(k), articolo: (k) => n.articoli.get(k),
  invito: (k) => n.inviti.get(k), persona: (id) => n.persone.get(id)?.nome,
  oggetto: (k) => n.oggetti?.get(k), trofeo: (k) => n.trofei?.get(k), attivita: (k) => n.attivita.get(k),
});

/** Il nome di una famiglia di effetto, per le schede dell'elenco degli effetti (e il menu «Aggiungi un effetto»). */
export const NOME_FAMIGLIA_EFFETTO: Record<EffettoVoce['tipo'], string> = {
  dote: 'Dote sociale', lettura: 'Lettura o gioco', turno: 'Turno di un’attività', acquisto: 'Aojiru', pesca: 'Pesca a Ichigaya', fortuna: 'Fortuna di Chihaya',
  storia: 'Evento di storia', domanda: 'Domanda risposta', cruciverba: 'Cruciverba', richiesta: 'Richiesta completata', articolo: 'Articolo comprato',
  invito: 'Invito avvenuto', persona: 'Persona registrata',
  yen: 'Yen', oggetto: 'Oggetto ricevuto', trofeo: 'Trofeo ottenuto', sblocco: 'Sblocco',
};
