// ============================================================
// cruciverbaService — cruciverba di Leblanc: date, indizi, risposte e spunta per partita (Fase 7.5)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { nomeDote } from './partiteService.js';
import { puntiDote } from './puntiDoti.js';
import type { CruciverbaDto, CruciverbaTuttiDto } from '../../shared/types.js';
import { indiceGiornoScolastico } from './domandeService.js';
import { vociCollegate } from './vociDiStato.js';
import { testoDoteInPunti } from '../../shared/note.js';

interface Riga { data: string; chiave: string | null; ordine: number; indizio: string; risposta: string; risposta_en: string | null; fonte: string }

/** Un cruciverba come DTO: il giorno è la data della riga, ed è fatto se quella data è fra quelle risolte. */
const dto = (r: Riga, fatti: Set<string>, voceUid?: string): CruciverbaDto => ({ giorno: r.data, chiave: r.chiave ?? null, indizio: r.indizio, risposta: r.risposta, rispostaEn: r.risposta_en, fatto: fatti.has(r.data), ...(voceUid ? { voceUid } : {}) });

/** Le date dei cruciverba risolti nella partita; insieme vuoto senza partita (con partita ne verifica l'esistenza). */
function fattiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  verificaPartita(partitaId);
  return new Set((prepared('SELECT data FROM cruciverba_partita WHERE partita_id = ?').all(partitaId) as Array<{ data: string }>).map((r) => r.data));
}

/** Tutti i cruciverba in ordine di calendario; con partita, quelli già risolti. */
export function cruciverba(partitaId?: number): CruciverbaTuttiDto {
  const fatti = fattiPartita(partitaId);
  // la voce del Diario che segna il cruciverba (se una sola): la pagina ne mostra il «Applica» della Conoscenza (R12-01/5)
  const voci = vociCollegate('cruciverba');
  const lista = (prepared('SELECT * FROM cruciverba ORDER BY ordine').all() as Riga[]).map((r) => dto(r, fatti, voci.get(r.data)?.voceUid));
  const dataGioco = partitaId === undefined ? null : ((prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco ?? null);
  const oggi = dataGioco ? indiceGiornoScolastico(dataGioco) : null;
  // il primo cruciverba non risolto dal giorno della partita in poi: è quello da segnare
  const prossimo = oggi === null ? null : ([...lista].sort((a, b) => indiceGiornoScolastico(a.giorno) - indiceGiornoScolastico(b.giorno)).find((c) => !c.fatto && indiceGiornoScolastico(c.giorno) >= oggi) ?? null);
  return { cruciverba: lista, dataGioco, prossimo, risolti: lista.filter((c) => c.fatto).length, totale: lista.length };
}

/**
 * Scrive lo stato «risolto» del cruciverba nella partita (la tabella `cruciverba_partita`, l'unica verità) e registra l'evento alla prima
 * spunta; restituisce la riga com'è dopo la scrittura e se è stato risolto ora (`nuovo`).
 */
export function scriviCruciverba(partitaId: number, data: string, fatto: boolean): { riga: CruciverbaDto; nuovo: boolean } {
  verificaPartita(partitaId);
  const r = prepared('SELECT * FROM cruciverba WHERE data = ?').get(data) as Riga | undefined;
  if (!r) throw httpErrors.notFound('cruciverba-non-trovato', `Nessun cruciverba il ${data}.`);
  const adesso = nowIso();
  let nuovo = false;
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM cruciverba_partita WHERE partita_id = ? AND data = ?').get(partitaId, data);
    if (fatto) prepared('INSERT INTO cruciverba_partita (partita_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, data) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, data, adesso);
    else prepared('DELETE FROM cruciverba_partita WHERE partita_id = ? AND data = ?').run(partitaId, data);
    // Il cruciverba di Leblanc dà una nota di Conoscenza: la risposta lo dice (`daSegnare`), ma le Doti si
    // segnano a mano (scelta dell'utente, 2026-09-30) e qui non si toccano, né risolvendolo né togliendo la spunta.
    nuovo = fatto && !era;
    if (nuovo) registraEvento(partitaId, 'cruciverba', `Cruciverba risolto: ${r.risposta}`, `${r.indizio} · il gioco dà ${testoDoteInPunti({ nome: nomeDote('conoscenza'), note: 1, delta: puntiDote(partitaId, 'conoscenza', 1) })} (da segnare nelle Doti).`, { data });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return { riga: dto(r, new Set(fatto ? [data] : []), vociCollegate('cruciverba').get(data)?.voceUid), nuovo };
}

/** Segna (o toglie) un cruciverba risolto nella partita; evento alla prima spunta. È il gesto «basso»: la pagina della Guida passa da
 *  `segnaCruciverbaDallaGuida` (spuntaDellaGuidaService), che lo usa solo dove non c'è una voce del Diario che segna lo stesso cruciverba. */
export function impostaCruciverba(partitaId: number, data: string, fatto: boolean): CruciverbaDto {
  const { riga: esito, nuovo } = scriviCruciverba(partitaId, data, fatto);
  return nuovo ? { ...esito, daSegnare: [{ chiave: 'conoscenza', nome: nomeDote('conoscenza'), delta: puntiDote(partitaId, 'conoscenza', 1), note: 1 }] } : esito;
}
