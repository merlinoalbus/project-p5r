// ============================================================
// effettoAutomatico — dal tipo della voce e da «Quale» all'effetto della spunta (finestra della voce, tavole approvate il 2026-10-24)
// ============================================================
//
// L'utente: «gli effetti della voce dovrebbero essere associati già automaticamente grazie alla selezione di Collegata A e Quale».
// Il tipo (l'icona) decide a che cosa si collega la voce (`RIFERIMENTO_DI_TIPO`); scelto «Quale», l'effetto principale della spunta
// nasce da solo. Il FORMATO degli effetti non cambia (`EffettoVoce`, lista con UID): cambia come si sceglie. Le voci già salvate
// si riaprono con lo stesso criterio: fra gli effetti salvati, il PRIMO che appartiene a tipo e «Quale» della voce è il suo effetto
// principale (la frase nel riquadro «Spuntando succede»); tutti gli altri sono «effetti aggiuntivi». Nessun effetto si perde.
// ============================================================

import { RIFERIMENTO_DI_TIPO, type TipoAzione, type TipoRiferimentoAzione } from '../../shared/effettiAzione';
import { eDote, nomeDote } from '../../shared/doti';
import type { EffettoVoce, RichiestaSalvaEffettiVoce } from '../../shared/effettiVoce';
import { EVENTI_STORIA } from '../../shared/condizioniSpillo';
import type { ElenchiAzioneDto, ElenchiEffettiVoceDto } from '../types';
import type { CampiStrutturati } from './azioneStrutturata';
import { dataGiocoTesto } from './dateGioco';

export type RigaEffetto = RichiestaSalvaEffettiVoce['effetti'][number];
type Rif = CampiStrutturati['riferimento'];

/** Che cosa serve per decidere l'effetto di un collegamento: quali attività sono videogiochi e quali si contano a turni. */
export interface ContestoEffetti { videogiochi: ReadonlySet<string>; turni: ReadonlySet<string> }

export const contestoDa = (e: ElenchiAzioneDto): ContestoEffetti => ({
  videogiochi: new Set(e.videogiochi.map((v) => v.chiave)),
  turni: new Set(e.attivita.filter((a) => a.turni).map((a) => a.chiave)),
});

/** Il tipo di collegamento che il tipo della voce chiede; se la voce ha già un collegamento di altro genere, quello che ha. */
export const tipoQuale = (tipo: TipoAzione, rif: Rif): TipoRiferimentoAzione | null => rif?.tipo ?? RIFERIMENTO_DI_TIPO[tipo];

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
    case 'esame': return e.tipo === 'domanda';
    case 'trama': return e.tipo === 'storia';
    default: return false;
  }
}

/** Il posto, nella lista, dell'effetto principale (-1 se non c'è). */
export const indicePrincipale = (righe: readonly RigaEffetto[], tipo: TipoAzione, rif: Rif): number => righe.findIndex((r) => eDelCollegamento(tipo, rif, r.effetto));

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
 * Il cambio di tipo o di «Quale»: aggiorna il collegamento e fa seguire l'effetto principale. L'effetto principale di prima, se nato in
 * questa finestra (senza UID), si toglie; se già salvato e dello stesso genere si riscrive al suo posto tenendo il suo UID; altrimenti
 * resta fra gli effetti aggiuntivi (mai cancellato in silenzio). Il rango atteso resta solo per un Confidente.
 */
export function cambiaCollegamento(s: CampiStrutturati, tipo: TipoAzione, rif: Rif, ctx: ContestoEffetti): CampiStrutturati {
  const base: CampiStrutturati = { ...s, tipo, riferimento: rif, rangoAtteso: tipo === 'confidente' && rif ? s.rangoAtteso : null };
  if (!s.effettiVoce) return base;
  let righe = [...s.effettiVoce];
  const nuovo = effettoIniziale(tipo, rif, ctx);
  const i = indicePrincipale(righe, s.tipo, s.riferimento);
  let scritto = false;
  if (i >= 0) {
    if (righe[i].uid === null) righe = righe.filter((_, j) => j !== i);
    else if (nuovo && nuovo.tipo === righe[i].effetto.tipo) { righe[i] = { uid: righe[i].uid, effetto: nuovo }; scritto = true; }
  }
  if (nuovo && !scritto) righe.push({ uid: null, effetto: nuovo });
  return { ...base, effettiVoce: righe };
}

/** Scrive l'effetto principale (lo crea se non c'è); `null` lo toglie. Il posto lo dà `indicePrincipale`. */
export function impostaPrincipale(s: CampiStrutturati, effetto: EffettoVoce | null): CampiStrutturati {
  const righe = [...(s.effettiVoce ?? [])];
  const i = indicePrincipale(righe, s.tipo, s.riferimento);
  if (effetto === null) return i < 0 ? s : { ...s, effettiVoce: righe.filter((_, j) => j !== i) };
  if (i >= 0) righe[i] = { uid: righe[i].uid, effetto }; else righe.push({ uid: null, effetto });
  return { ...s, effettiVoce: righe };
}

/** I nomi con cui scrivere le frasi degli effetti: tutto per chiave, preso dagli elenchi serviti dall'API. */
export interface NomiEffetti {
  libri: Map<string, string>; film: Map<string, string>; videogiochi: Map<string, string>; attivita: Map<string, string>; richieste: Map<string, string>;
  articoli: Map<string, ElenchiEffettiVoceDto['articoli'][number]>; domande: Map<number, ElenchiEffettiVoceDto['domande'][number]>;
  inviti: Map<string, ElenchiEffettiVoceDto['inviti'][number]>; persone: Map<number, ElenchiEffettiVoceDto['persone'][number]>;
}

const mappa = <T extends { chiave: string; nome: string }>(l: T[]): Map<string, string> => new Map(l.map((x) => [x.chiave, x.nome]));

export function nomiEffettiDa(e: ElenchiAzioneDto, x: ElenchiEffettiVoceDto): NomiEffetti {
  return {
    libri: mappa(e.libri), film: mappa(e.film), videogiochi: mappa(e.videogiochi), attivita: mappa(e.attivita), richieste: mappa(e.richieste),
    articoli: new Map(x.articoli.map((a) => [a.chiave, a])), domande: new Map(x.domande.map((d) => [d.id, d])),
    inviti: new Map(x.inviti.map((i) => [i.chiave, i])), persone: new Map(x.persone.map((p) => [p.id, p])),
  };
}

const note = (n: number) => '♪'.repeat(n);
const breve = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
const sessioni = (n: number, film: boolean) => (film ? (n === 1 ? 'visione o serata' : 'visioni o serate') : n === 1 ? 'sessione' : 'sessioni');

/** Il nome dell'evento di storia (dall'elenco condiviso). */
export const nomeEventoStoria = (chiave: string): string => EVENTI_STORIA.find((e) => e.chiave === chiave)?.nome ?? chiave;

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
      return `Turno: ${nome} — ${e.doti?.length ? `Doti proprie di questo turno (${e.doti.map((d) => `${nomeDote(d.dote)} ${note(d.note)}`).join('; ')})` : 'le Doti sono quelle del lavoro'}`;
    }
    case 'acquisto': return `Acquisto Aojiru${e.variante ? `: ${nomeDote(e.variante)}` : ' (variante da osservare nella partita)'}`;
    case 'pesca': return 'Sessione di pesca a Ichigaya osservata';
    case 'fortuna': return `Fortuna di Chihaya su ${nomeDote(e.dote)} per il resto del giorno`;
    case 'storia': return `Evento di storia: ${nomeEventoStoria(e.evento)}`;
    case 'domanda': { const d = n.domande.get(e.domanda); return d ? `Domanda risposta: ${breve(d.testo)}` : 'Domanda risposta'; }
    case 'cruciverba': return `Cruciverba del ${dataGiocoTesto(e.data)} risolto`;
    case 'richiesta': return `Richiesta «${n.richieste.get(e.richiesta) ?? 'Richiesta'}» completata`;
    case 'articolo': { const a = n.articoli.get(e.articolo); return a ? `Articolo comprato: ${a.nome}${a.prezzo !== null ? ` · ¥${a.prezzo.toLocaleString('it-IT')}` : ''}` : 'Articolo comprato'; }
    case 'invito': { const i = n.inviti.get(e.invito); return i ? `Invito di ${i.confidenteNome}${i.data ? ` del ${dataGiocoTesto(i.data)}` : ''} avvenuto: i punti dell'incontro valgono ×1,2` : 'Invito avvenuto'; }
    case 'persona': { const p = n.persone.get(e.persona); return p ? `Persona registrata nel compendio: ${p.nome}` : 'Persona registrata nel compendio'; }
  }
}

/** Il nome di una famiglia di effetto, per le schede degli effetti aggiuntivi. */
export const NOME_FAMIGLIA_EFFETTO: Record<EffettoVoce['tipo'], string> = {
  dote: 'Dote in più', lettura: 'Lettura o gioco in più', turno: 'Turno in più', acquisto: 'Aojiru', pesca: 'Pesca a Ichigaya', fortuna: 'Fortuna di Chihaya',
  storia: 'Evento di storia', domanda: 'Domanda risposta', cruciverba: 'Cruciverba', richiesta: 'Richiesta completata', articolo: 'Articolo comprato',
  invito: 'Invito avvenuto', persona: 'Persona registrata',
};
