// ============================================================
// ricercaDiarioService — la ricerca fra tutte le voci del Diario (Guida › Giorno per giorno), per parola e per tipo (2026-10-29)
// ============================================================
//
// Richiesta dell'utente: «mi servirebbe la possibilità di cercare nella guida giorno per giorno, tutte le voci del diario che contengono una
// parola o per tipologia... deve essere una ricerca basata sui valori di che cosa fare e note.» Sola lettura: nessun dato cambia.
//
// Si guardano «Che cosa fare» (`azione`) e «Note» di tutte le voci dell'anno, con il confronto unico di `shared/ricercaDiario.ts` (senza
// maiuscole né accenti, anche una parte di parola, ogni parola cercata da qualche parte nella voce). Le voci sono nell'ordine del calendario
// di gioco (`giorno.ordine`: le date «MM-GG» attraversano l'anno), poi di giorno prima di sera, poi il posto nella fascia: lo stesso ordine
// del Diario. Con la partita non compaiono le voci d'ingresso a un Palazzo concluso che il giorno nasconde (R10-28c/2): aprendole non si
// troverebbero. Per le sole voci trovate si leggono collegamento, «Spuntando succede» e spunta (`vociPerRicerca`, le regole della voce del
// giorno); i conteggi per tipo valgono per il testo cercato, senza il filtro del tipo.
// ============================================================

import { prepared } from '../db/dbService.js';
import { verificaPartita } from './verificaPartita.js';
import { fasciaDi, ingressiConclusiNascosti, tipoDi, vociPerRicerca, type RigaVoce } from './giornataService.js';
import { paroleRicercaDiario, voceCorrispondeRicerca, type RicercaDiarioDto } from '../../shared/ricercaDiario.js';
import type { TipoAzione } from '../../shared/effettiAzione.js';

/** Le voci trovate per testo (in «Che cosa fare» o nelle note) e per tipo, nell'ordine del calendario di gioco. */
export function cercaVociDiario(q: string | undefined, tipo: TipoAzione | undefined, partitaId?: number): RicercaDiarioDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const testo = (q ?? '').trim();
  const parole = paroleRicercaDiario(testo);
  const righe = prepared(`SELECT v.* FROM voce_giornata v JOIN giorno g ON g.data = v.data
    ORDER BY g.ordine, CASE v.fascia WHEN 'giorno' THEN 0 ELSE 1 END, v.ordine, v.uid`).all() as RigaVoce[];
  const nascoste = new Set(partitaId === undefined ? [] : ingressiConclusiNascosti(partitaId).map((v) => v.uid));
  const perTesto = righe.filter((r) => !nascoste.has(r.uid) && voceCorrispondeRicerca(parole, r.azione, r.note));
  const perTipo: RicercaDiarioDto['perTipo'] = {};
  for (const r of perTesto) { const t = tipoDi(r); perTipo[t] = (perTipo[t] ?? 0) + 1; }
  const trovate = tipo ? perTesto.filter((r) => tipoDi(r) === tipo) : perTesto;
  const dettagli = vociPerRicerca(trovate, partitaId);
  return {
    q: testo, tipo: tipo ?? null, totale: trovate.length, perTipo,
    risultati: trovate.map((r) => {
      const d = dettagli.get(r.uid)!;
      return { uid: r.uid, giorno: r.data, fascia: fasciaDi(r), tipo: tipoDi(r), azione: r.azione, riferimentoTesto: d.riferimentoTesto, note: r.note, spuntando: d.spuntando, fatta: d.fatta };
    }),
  };
}
