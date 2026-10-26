// ============================================================
// doniConfidenti — i doni dei Confidenti che la partita ha già meritato, letti dal rango e dal giorno (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Decisione 21, precisazione dell'utente: gli oggetti ricevuti sono fra le cose che l'app gestisce. I doni dei Confidenti stanno nel catalogo
// come ricompense (`ricompensa_oggetto`, fonte «confidente», una riga per dono con la nota della guida) ma nessuna partita li riceveva. La
// migrazione 306 scrive per ciascun dono la REGOLA che lo fa ricevere, quando la guida la dà in termini che l'app conosce
// (`ricompensa_oggetto.condizioni_json`): il rango del Confidente (10, «al Rango massimo») e il giorno («19 marzo», «15 febbraio»). Qui la
// regola si valuta sulla partita (rango in `confidente_partita`, giorno in `partita.data_gioco`, con l'ordine dell'anno scolastico) e il dono
// vale come oggetto ricevuto finché la regola vale: nessuna copia in un'altra tabella, nessuna riga da tenere allineata quando il rango scende.
// I doni che la guida lega a una relazione romantica («se fidanzata») non hanno regola: l'app non registra la relazione scelta, e la decisione
// resta di chi gioca (li riceve da una voce del Diario con l'effetto «oggetto ricevuto»). Sola lettura.
// ============================================================

import { prepared } from '../db/dbService.js';
import { leggiCondizioniSalvate, ordineGioco, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

export interface DonoConfidenteOttenuto { catalogo: string; quantita: number; confidente: string; nota: string | null }

const haColonnaCondizioni = (): boolean => !!prepared("SELECT 1 FROM pragma_table_info('ricompensa_oggetto') WHERE name = 'condizioni_json'").get();

/** Vale la regola nella partita? Solo rango del Confidente e giorno: una regola con altri tipi non si valuta (il dono non vale). */
function regolaVale(regola: RequisitoSpillo[], ranghi: Map<string, number>, oggi: string | null): boolean {
  if (!regola.length) return false;
  return regola.every((r) => {
    if (r.tipo === 'confidente') return (ranghi.get(r.confidente) ?? 0) >= r.rango;
    if (r.tipo === 'data') return oggi !== null && ordineGioco(oggi) >= ordineGioco(r.dal);
    return false;
  });
}

/** I doni dei Confidenti che la partita ha meritato adesso, in ordine di catalogo. Vuoto se la colonna della regola non c'è ancora. */
export function doniConfidentiOttenuti(partitaId: number): DonoConfidenteOttenuto[] {
  if (!haColonnaCondizioni()) return [];
  const righe = prepared("SELECT fonte_chiave, catalogo_chiave, COALESCE(quantita, 1) AS quantita, nota, condizioni_json FROM ricompensa_oggetto WHERE fonte_tipo = 'confidente' AND condizioni_json IS NOT NULL ORDER BY ordine, catalogo_chiave")
    .all() as Array<{ fonte_chiave: string; catalogo_chiave: string; quantita: number; nota: string | null; condizioni_json: string }>;
  if (!righe.length) return [];
  const ranghi = new Map((prepared('SELECT confidente_chiave, rango FROM utente.confidente_partita WHERE partita_id = ?').all(partitaId) as Array<{ confidente_chiave: string; rango: number }>)
    .map((r) => [r.confidente_chiave, r.rango]));
  const oggi = (prepared('SELECT data_gioco FROM utente.partita WHERE id = ?').pluck().get(partitaId) as string | null | undefined) ?? null;
  return righe.filter((r) => regolaVale(leggiCondizioniSalvate(r.condizioni_json), ranghi, oggi))
    .map((r) => ({ catalogo: r.catalogo_chiave, quantita: r.quantita, confidente: r.fonte_chiave, nota: r.nota }));
}
