// Le aperture sono dichiarazioni delle singole visite nel Diario, non un contatore né una data dedotta.
// La spunta ne custodisce la titolarità; gli eventi manuali restano indipendenti.
import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { APERTURE_DEDALI } from '../../shared/condizioniSpillo.js';
import type { EffettiAzioneDto, RiferimentoAzioneDto } from '../../shared/types.js';
import { conLegami } from './mappe/legamiInfiltrazioni.js';

type Apertura = NonNullable<EffettiAzioneDto['apertureDedali']>[number];
export interface VisitaConApertura { uid: string; giorno: string }

/** Solo un collegamento esplicito ai Memento; una Richiesta o il testo di una voce non provano una visita. */
export function eVisitaMemento(v: { uid: string; genere: string; riferimento: RiferimentoAzioneDto | null }): boolean {
  if (v.genere !== 'azione') return false;
  if (v.riferimento?.tipo === 'dungeon' && v.riferimento.chiave === 'mementos') return true;
  return conLegami() && !!prepared(`SELECT 1 FROM voce_infiltrazione v JOIN dungeon_area a ON a.chiave = v.infiltrazione_chiave
    WHERE v.voce_uid = ? AND a.dungeon_chiave = 'mementos' LIMIT 1`).get(v.uid);
}

/** Nomi dal dedalo corrente, con il nome canonico dell'evento se il riferimento è stato rimosso. */
export function apertureDichiarabili(): Apertura[] {
  const nomi = new Map((prepared("SELECT chiave, nome FROM dungeon_area WHERE dungeon_chiave = 'mementos'").all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  return APERTURE_DEDALI.map((a) => ({ chiave: a.chiave, nome: nomi.has(a.dedalo) ? `${nomi.get(a.dedalo)} aperto` : a.nome }));
}

/** Legge solo le chiavi riconosciute; non interpreta altri effetti o campi provenienti da backup. */
export function apertureNegliEffetti(effetti: unknown): Apertura[] {
  if (!effetti || typeof effetti !== 'object' || !('apertureDedali' in effetti) || !Array.isArray(effetti.apertureDedali)) return [];
  const chiavi = new Set(effetti.apertureDedali.flatMap((a: unknown) => a && typeof a === 'object' && 'chiave' in a && typeof a.chiave === 'string' ? [a.chiave] : []));
  return APERTURE_DEDALI.filter((a) => chiavi.has(a.chiave)).map(({ chiave, nome }) => ({ chiave, nome }));
}

export function verificaApertureScelte(chiavi: string[], ammesse: Apertura[]): Apertura[] {
  if (chiavi.length !== new Set(chiavi).size || chiavi.some((c) => !ammesse.some((a) => a.chiave === c))) {
    throw httpErrors.badRequest('apertura-dedalo-non-ammessa', 'Dichiara le aperture nella visita ai Memento. Da una voce non più collegata puoi soltanto rimuovere quelle già registrate.');
  }
  return ammesse.filter((a) => chiavi.includes(a.chiave));
}

/** Un'unica lettura per partita: una stessa apertura può essere dichiarata in più visite, ciascuna indipendente. */
export function apertureDalDiario(partitaId: number): Map<string, VisitaConApertura[]> {
  const righe = prepared(`SELECT s.voce_uid AS uid, v.data AS giorno, s.effetti_json FROM spunta_voce_partita s
    JOIN voce_giornata v ON v.uid = s.voce_uid WHERE s.partita_id = ? AND s.effetti_json IS NOT NULL
    ORDER BY v.data, s.voce_uid`).all(partitaId) as Array<VisitaConApertura & { effetti_json: string }>;
  const risultato = new Map<string, VisitaConApertura[]>();
  for (const r of righe) {
    let effetti: unknown;
    try { effetti = JSON.parse(r.effetti_json); } catch { continue; }
    for (const a of apertureNegliEffetti(effetti)) {
      const visite = risultato.get(a.chiave) ?? [];
      visite.push({ uid: r.uid, giorno: r.giorno });
      risultato.set(a.chiave, visite);
    }
  }
  return risultato;
}

/** Fonte unica dell'esito: togliere una spunta o un evento manuale non cancella gli altri contributi. */
export function eventiEffettivi(partitaId: number): Set<string> {
  const manuali = (prepared('SELECT evento_chiave FROM evento_storia_partita WHERE partita_id = ? AND avvenuto = 1').all(partitaId) as Array<{ evento_chiave: string }>).map((r) => r.evento_chiave);
  return new Set([...manuali, ...apertureDalDiario(partitaId).keys()]);
}
