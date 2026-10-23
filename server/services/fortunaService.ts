// ============================================================
// fortunaService — la Fortuna di Chihaya come stato della partita (R10-10/2)
// ============================================================
//
// Una riga per partita: la Dote scelta e il giorno di gioco in cui si è accesa. Vale solo quel giorno: se la data della partita
// cambia, la Fortuna risulta spenta (la riga resta finché non si riaccende o si spegne a mano). Lo leggono, con lo stesso ×1,5 per
// difetto (`moltiplicaFortuna`), le Doti, le voci del Diario, l'Aojiru e la pesca. Si accende dall'interruttore delle Doti o da una
// voce del Diario con la lettura; ogni cambio lascia un evento nello storico.

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { eDote, nomeDote, type DoteChiave } from '../../shared/doti.js';
import type { FortunaPartitaDto } from '../../shared/fortuna.js';
import { dataLeggibile } from '../../shared/condizioniSpillo.js';
import { registraEvento } from './storicoService.js';
import { verificaPartita } from './verificaPartita.js';

interface RigaFortuna { dote: string; giorno: string | null }

/** La Fortuna di adesso: accesa solo se la riga è del giorno di gioco corrente. */
export function leggiFortuna(partitaId: number): FortunaPartitaDto {
  verificaPartita(partitaId);
  const riga = prepared('SELECT dote, giorno FROM utente.fortuna_partita WHERE partita_id = ?').get(partitaId) as RigaFortuna | undefined;
  if (!riga || !eDote(riga.dote)) return { attiva: false, dote: null, giorno: null, scaduta: false };
  const oggi = (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null }).data_gioco;
  const attiva = riga.giorno === oggi;
  return { attiva, dote: riga.dote, giorno: riga.giorno, scaduta: !attiva };
}

/** La Fortuna è accesa proprio su questa Dote? È la domanda a cui rispondono Doti, voci, Aojiru e pesca. */
export function fortunaSu(partitaId: number, dote: string): boolean {
  const f = leggiFortuna(partitaId);
  return f.attiva && f.dote === dote;
}

/** Accende la Fortuna sulla Dote scelta per il giorno di gioco di adesso, o la spegne (`null`). */
export function impostaFortuna(partitaId: number, dote: DoteChiave | null): FortunaPartitaDto {
  verificaPartita(partitaId);
  if (dote !== null && !eDote(dote)) throw httpErrors.badRequest('dote-non-valida', 'Scegli una delle Doti sociali.');
  const prima = leggiFortuna(partitaId);
  if (dote === null ? !prima.attiva && !prima.scaduta : prima.attiva && prima.dote === dote) return prima;
  getDb().transaction(() => {
    if (dote === null) {
      prepared('DELETE FROM utente.fortuna_partita WHERE partita_id = ?').run(partitaId);
      registraEvento(partitaId, 'fortuna', 'Fortuna spenta', prima.dote ? `Era accesa su ${nomeDote(prima.dote)}.` : '', { dote: prima.dote });
    } else {
      const oggi = (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null }).data_gioco;
      prepared('INSERT INTO utente.fortuna_partita (partita_id, dote, giorno, acceso_il) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id) DO UPDATE SET dote = excluded.dote, giorno = excluded.giorno, acceso_il = excluded.acceso_il')
        .run(partitaId, dote, oggi, nowIso());
      registraEvento(partitaId, 'fortuna', `Fortuna accesa su ${nomeDote(dote)}`, oggi ? `Per il resto del giorno (${dataLeggibile(oggi)}): i punti di questa Dote valgono ×1,5.` : 'I punti di questa Dote valgono ×1,5 finché non la spegni.', { dote, giorno: oggi });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
  return leggiFortuna(partitaId);
}
