// ============================================================
// condizioniSpillo (client) — elenchi della Guida usati dal costruttore delle condizioni e nomi per le descrizioni (fuori dai componenti
// per il fast refresh)
// ============================================================

import type { CondizioneSpilloDto, ConfidenteDto, DungeonRiassuntoDto, ElenchiRegoleDto, PinConStatoDto, QuartiereRiassuntoDto, RichiestaDto, VoceCitabileDto } from '../types';
import { getConfidenti, getDungeons, getElenchiRegole, getQuartieri, getRichieste } from '../services/api';
import type { NomiCondizioni, RequisitoSpillo } from '../../shared/condizioniSpillo';

/** Le condizioni senza il testo descrittivo del server (è il server a ricalcolarlo): quel che si rimanda salvando uno spillo o una
 *  copia di un pezzo della planimetria (103). */
export function condizioniSenzaTesto(condizioni: readonly CondizioneSpilloDto[]): RequisitoSpillo[] {
  return condizioni.map((c) => {
    if (c.tipo === 'avviso') return { tipo: 'avviso', testo: c.testo };
    const copia: Record<string, unknown> = { ...c }; delete copia.testo;
    return copia as unknown as RequisitoSpillo;
  });
}

export interface ElenchiCondizioni {
  confidenti: ConfidenteDto[];
  quartieri: QuartiereRiassuntoDto[];
  richieste: RichiestaDto[];
  dungeon: DungeonRiassuntoDto[];
}

export const ELENCHI_VUOTI: ElenchiCondizioni = { confidenti: [], quartieri: [], richieste: [], dungeon: [] };

/** Chiave → nome per Confidenti, quartieri, richieste e Palazzi, da mostrare nelle condizioni. */
export function nomiDaElenchi(e: ElenchiCondizioni): NomiCondizioni {
  return {
    confidenti: Object.fromEntries(e.confidenti.map((c) => [c.chiave, c.nome])),
    quartieri: Object.fromEntries(e.quartieri.map((q) => [q.chiave, q.nome])),
    richieste: Object.fromEntries(e.richieste.map((r) => [r.chiave, r.nome])),
    dungeon: Object.fromEntries(e.dungeon.map((d) => [d.chiave, d.nome])),
  };
}

/** Gli elenchi con cui le condizioni si leggono per nome: quelli della Guida (`ElenchiCondizioni`), quelli delle regole e, nell'editor delle
 *  mappe, i pin con stato e le voci della guida. */
export interface ElenchiNomiCondizioni { base?: ElenchiCondizioni | null; extra: ElenchiRegoleDto; spilli?: PinConStatoDto[]; voci?: VoceCitabileDto[] }

/** I nomi con cui le condizioni si leggono (mai chiavi), dagli elenchi: l'unica costruzione, la usano l'editor delle condizioni e chi mostra
 *  le condizioni di un effetto della voce. Pin e voci della guida solo se gli elenchi li hanno. */
export function nomiDelleCondizioni(e: ElenchiNomiCondizioni): NomiCondizioni {
  /** Da un elenco di voci a un dizionario chiave → nome. */
  const mappa = (o: Array<{ chiave: string; nome: string }>) => Object.fromEntries(o.map((x) => [x.chiave, x.nome]));
  return { ...nomiDaElenchi(e.base ?? ELENCHI_VUOTI), allerte: mappa(e.extra.allerte ?? []), luoghi: mappa(e.extra.luoghi ?? []), inviti: mappa(e.extra.inviti ?? []), persone: mappa(e.extra.persone), abilita: mappa(e.extra.abilita), articoli: mappa(e.extra.articoli), letture: mappa(e.extra.letture), attivita: mappa(e.extra.attivita), negozi: mappa(e.extra.negozi), squadra: mappa(e.extra.squadra), setDlc: mappa(e.extra.setDlc ?? []),
    spilli: Object.fromEntries((e.spilli ?? []).map((p) => [p.chiave, { nome: p.nome, tipo: p.tipo, mappa: p.gruppo, parola: p.parola }])),
    voci: Object.fromEntries((e.voci ?? []).map((v) => [v.chiave, { nome: v.nome, posto: v.gruppo }])) };
}

/** Gli elenchi che servono a leggere le condizioni per nome fuori dall'editor (quelli delle regole, Confidenti, quartieri, Richieste, dungeon). */
export async function caricaElenchiNomiCondizioni(): Promise<ElenchiNomiCondizioni> {
  const [extra, confidenti, quartieri, richieste, dungeon] = await Promise.all([getElenchiRegole(), getConfidenti(), getQuartieri(), getRichieste(), getDungeons()]);
  return { extra, base: { confidenti, quartieri, richieste: richieste.richieste, dungeon } };
}
