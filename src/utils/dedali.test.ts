// ============================================================
// Test dedali — il conteggio di un dedalo ricalcolato nella pagina, con la regola condivisa col server (099)
// ============================================================

import { contaNelDedalo, contoAreaDedalo, contoDedalo, TIPI_VOCE_DEDALO, tipoDelDedalo } from '../../shared/dedali';
import { raccoltaDeiDedali, ricalcolaDedalo } from './dedali';
import type { AreaDedaloDto, AreaDungeonDto, PuntoInteresseDto } from '../types';

/** Una voce della guida con lo stato dato, nell'area del dedalo indicata. */
const voce = (chiave: string, areaDedalo: string, stato: PuntoInteresseDto['stato']): PuntoInteresseDto => ({
  chiave, ordine: 0, tipo: 'altro', nome: chiave, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato, marcatore: null, pin: [], contenitore: null, areaDedalo, persona: null, areeDedalo: [],
});
/** Un'area del dedalo con conteggi volutamente sbagliati: il ricalcolo deve correggerli. */
const area = (chiave: string, extra: Partial<AreaDedaloDto> = {}): AreaDedaloDto => ({ chiave, ordine: 0, nome: chiave, descrizione: '', timbri: null, richieste: [], elementi: { totale: 99, fatti: 99 }, completata: false, ...extra });

it('un\'area è completata quando lo sono tutti i suoi elementi; i timbri contano uno per timbro; un\'area vuota è completata', () => {
  expect(contoAreaDedalo({ voci: [{ tipo: 'trama', stato: 'ottenuto' }, { tipo: 'trama', stato: null }], richieste: [{ stato: 'completata' }, { stato: 'accettata' }], timbri: { totale: 3, raccolti: 2 } }, true))
    .toEqual({ totale: 7, fatti: 4, completata: false });
  expect(contoAreaDedalo({ voci: [{ tipo: 'trama', stato: 'esaurito' }], richieste: [{ stato: 'completata' }], timbri: { totale: 3, raccolti: 5 } }, true)).toEqual({ totale: 5, fatti: 5, completata: true });
  expect(contoAreaDedalo({ voci: [], richieste: [], timbri: null }, true)).toEqual({ totale: 0, fatti: 0, completata: true });
  expect(contoAreaDedalo({ voci: [{ tipo: 'trama', stato: 'ottenuto' }], richieste: [], timbri: { totale: 2, raccolti: null } }, false)).toEqual({ totale: 3, fatti: null, completata: null });
  // un dedalo è completato quando lo sono tutte le sue aree, anche nessuna
  expect(contoDedalo([{ elementi: { totale: 2, fatti: 2 }, completata: true }, { elementi: { totale: 0, fatti: 0 }, completata: true }], true)).toEqual({ totale: 2, fatti: 2, completato: true });
  expect(contoDedalo([{ elementi: { totale: 2, fatti: 1 }, completata: false }], true)).toMatchObject({ completato: false });
  expect(contoDedalo([], true)).toEqual({ totale: 0, fatti: 0, completato: true });
  expect(contoDedalo([], false)).toEqual({ totale: 0, fatti: null, completato: null });
});

it('le Persona non contano: catturate o no, l\'area si completa con il resto (2026-10-11); nei dedali solo Persona e Trama', () => {
  // due Persona, una catturata: non cambiano né il totale né il fatto; un'area di sole Persona è vuota, quindi completata
  expect(contoAreaDedalo({ voci: [{ tipo: 'persona', stato: 'ottenuto' }, { tipo: 'persona', stato: null }, { tipo: 'trama', stato: 'ottenuto' }], richieste: [], timbri: null }, true))
    .toEqual({ totale: 1, fatti: 1, completata: true });
  expect(contoAreaDedalo({ voci: [{ tipo: 'persona', stato: null }], richieste: [], timbri: null }, true)).toEqual({ totale: 0, fatti: 0, completata: true });
  expect(contoAreaDedalo({ voci: [{ tipo: 'persona', stato: null }, { tipo: 'trama', stato: null }], richieste: [], timbri: null }, false)).toEqual({ totale: 1, fatti: null, completata: null });
  expect(contaNelDedalo('persona')).toBe(false);
  expect(contaNelDedalo('trama')).toBe(true);
  expect(TIPI_VOCE_DEDALO).toEqual(['persona', 'trama']);
  expect(['persona', 'trama', 'altro', 'boss', 'sicura'].map(tipoDelDedalo)).toEqual([true, true, false, false, false]);
});

it('ricalcola le aree del dedalo dalle loro voci, Richieste e timbri, e l\'anello dei Memento dai dedali', () => {
  const dedalo: AreaDungeonDto = {
    chiave: 'd', ordine: 0, nome: 'Dedalo', descrizione: '', mappa: false, mappe: [],
    punti: [voce('v1', 'a1', 'ottenuto'), voce('v2', 'a2', null)],
    dedalo: { aree: [area('a1', { timbri: { totale: 2, raccolti: 2 } }), area('a2', { richieste: [{ chiave: 'r', nome: 'R', stato: 'completata' }] })], daCollocare: [], obiettivi: { totale: 0, fatti: 0 }, completato: true },
  };
  const r = ricalcolaDedalo(dedalo, true);
  expect(r.dedalo?.aree.map((a) => [a.elementi, a.completata])).toEqual([[{ totale: 3, fatti: 3 }, true], [{ totale: 2, fatti: 1 }, false]]);
  expect(r.dedalo).toMatchObject({ obiettivi: { totale: 5, fatti: 4 }, completato: false });
  // un'area di un Palazzo resta com'è
  const palazzo = { ...dedalo, dedalo: null };
  expect(ricalcolaDedalo(palazzo, true)).toBe(palazzo);
  const completo = ricalcolaDedalo({ ...dedalo, punti: [voce('v1', 'a1', 'ottenuto'), voce('v2', 'a2', 'esaurito')] }, true);
  expect(raccoltaDeiDedali([r, completo], { totale: 10, presi: 0, mappe: 2, mappeComplete: 0 })).toEqual({ totale: 10, presi: 9, mappe: 2, mappeComplete: 1 });
  // senza partita l'anello resta senza conteggi
  const senza = { totale: 10, presi: null, mappe: 2, mappeComplete: null };
  expect(raccoltaDeiDedali([r], senza)).toBe(senza);
});
