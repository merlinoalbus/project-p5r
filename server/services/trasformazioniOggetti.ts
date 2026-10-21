// Relazioni informative: non sono offerte, non registrano possesso e non consumano oggetti.
import { prepared } from '../db/dbService.js';
import { riferimentoOggetto } from './catalogoOggettiLetture.js';
import type { StatoDisponibilita } from './disponibilitaService.js';
import type { TrasformazioneOggettoDto } from '../../shared/types.js';

export function trasformazioniDiJose(st?: StatoDisponibilita, oggetto?: string): TrasformazioneOggettoDto[] {
  if (!prepared("SELECT 1 FROM sqlite_master WHERE type='table' AND name='trasformazione_oggetto'").get()) return [];
  const partita = st?.partitaId === undefined ? undefined : prepared('SELECT nuova_partita_plus FROM partita WHERE id = ?').get(st.partitaId) as { nuova_partita_plus: number } | undefined;
  const righe = prepared(`SELECT t.*,d.nome AS palazzo_nome FROM trasformazione_oggetto t JOIN dungeon d ON d.chiave = t.dungeon_chiave
    ${oggetto === undefined ? '' : 'WHERE t.cristallo_chiave = ? OR t.anello_chiave = ?'} ORDER BY d.ordine`)
    .all(...(oggetto === undefined ? [] : [oggetto, oggetto])) as Array<{
      dungeon_chiave: string; palazzo_nome: string; cristallo_chiave: string | null; anello_chiave: string | null; solo_ng_plus: number; fonte: string;
    }>;
  return righe.map((r) => ({ palazzo: r.dungeon_chiave, palazzoNome: r.palazzo_nome,
    cristallo: riferimentoOggetto(r.cristallo_chiave), anello: riferimentoOggetto(r.anello_chiave),
    soloNuovaPartitaPlus: r.solo_ng_plus === 1,
    // Maruki non richiede di sconfiggere nuovamente il boss nella Nuova Partita+.
    palazzoConcluso: !st || r.solo_ng_plus === 1 ? null : st.palazziConclusi.has(r.dungeon_chiave),
    nuovaPartitaPlus: r.solo_ng_plus === 1 && partita ? partita.nuova_partita_plus === 1 : null,
    fonte: r.fonte }));
}
