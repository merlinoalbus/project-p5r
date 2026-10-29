// ============================================================
// condizioneEffettiva — la condizione di un posto con gli inviti che lo aprono (L6, lotti/L6/modifiche.md §1)
// ============================================================
//
// Un posto (quartiere, luogo, area) si apre con la sua condizione salvata **oppure** con un invito di un Confidente che lo apre
// (`confidente_invito`). Gli inviti sono dati del Confidente e si cambiano solo dalla sua pagina (R9-07c): qui si leggono, così
// aggiungerne o toglierne uno cambia la condizione del posto senza scriverla altrove. Un invito che apre un luogo apre anche il suo
// quartiere (il ritrovo di Harajuku apre Harajuku), uno che apre un'area anche il quartiere dell'area.
// Senza dipendenze da altri servizi (solo il DB e i condivisi): la leggono il valutatore, le descrizioni e i DTO.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { leggiCondizioniSalvate, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';

export interface RigaInvito { chiave: string; confidente_chiave: string; data: string | null; apre_tipo: 'quartiere' | 'luogo' | 'area'; apre_chiave: string; condizioni_json: string | null; nota: string; fonte: string; origine: string; seed_json: string | null }

/** Vero se la tabella c'è (uno schema di prima della migrazione 118 non ha inviti). */
function conInviti(): boolean {
  return !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'confidente_invito'").get();
}

/** Tutti gli inviti, nell'ordine del calendario del Confidente; vuoto su uno schema senza la tabella. */
export function tuttiGliInviti(): RigaInvito[] {
  if (!conInviti()) return [];
  return prepared('SELECT * FROM confidente_invito ORDER BY confidente_chiave, data').all() as RigaInvito[];
}

/** Il quartiere di un posto dalle relazioni effettive, anche dopo una ricollocazione (null per le Aree della città). */
function quartiereDelPosto(tipo: RigaInvito['apre_tipo'], chiave: string): string | null {
  if (tipo === 'quartiere') return chiave;
  if (tipo === 'luogo') return (prepared('SELECT quartiere_chiave FROM luogo WHERE chiave = ?').get(chiave) as { quartiere_chiave: string | null } | undefined)?.quartiere_chiave ?? null;
  return (prepared('SELECT quartiere_chiave FROM area WHERE chiave = ?').get(chiave) as { quartiere_chiave: string | null } | undefined)?.quartiere_chiave ?? null;
}

/** Gli inviti che aprono un posto: per un quartiere anche quelli che aprono un suo luogo o una sua Area. */
export function invitiCheAprono(tipo: RigaInvito['apre_tipo'], chiave: string, inviti: readonly RigaInvito[] = tuttiGliInviti()): RigaInvito[] {
  if (tipo !== 'quartiere') return inviti.filter((i) => i.apre_tipo === tipo && i.apre_chiave === chiave);
  return inviti.filter((i) => quartiereDelPosto(i.apre_tipo, i.apre_chiave) === chiave);
}

/**
 * La condizione salvata in OR con gli inviti: `almeno-una[ condizione salvata, invito{k}… ]`. La condizione salvata è un elenco in AND
 * (un elemento resta com'è, più elementi diventano un `tutte`). Senza inviti è la condizione salvata così com'è; senza condizione
 * salvata e senza inviti, vuota.
 */
export function conGliInviti(salvata: RequisitoSpillo[], inviti: readonly RigaInvito[]): RequisitoSpillo[] {
  if (inviti.length === 0) return salvata;
  const vie: RequisitoSpillo[] = inviti.map((i) => ({ tipo: 'invito', invito: i.chiave }));
  if (salvata.length === 0) return vie.length === 1 ? vie : [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: vie }];
  const propria: RequisitoSpillo = salvata.length === 1 ? salvata[0] : { tipo: 'gruppo', modo: 'tutte', condizioni: salvata };
  return [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [propria, ...vie] }];
}

/** La condizione salvata di un quartiere (`quartiere.condizioni_json`), o null se non ne ha una (o se lo schema non ha la colonna). */
export function condizioneSalvataQuartiere(chiave: string): RequisitoSpillo[] | null {
  try {
    const r = prepared('SELECT condizioni_json FROM quartiere WHERE chiave = ?').get(chiave) as { condizioni_json: string | null } | undefined;
    return r?.condizioni_json ? leggiCondizioniSalvate(r.condizioni_json) : null;
  } catch { return null; } // uno schema di prima della 118: la colonna non c'è
}

/** La condizione effettiva di un quartiere: la salvata in OR con gli inviti che aprono lui o un suo posto; null senza né l'una né gli altri. */
export function condizioneEffettivaQuartiere(chiave: string, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] | null {
  const salvata = condizioneSalvataQuartiere(chiave);
  const aprono = invitiCheAprono('quartiere', chiave, inviti);
  if (salvata === null && aprono.length === 0) return null;
  return conGliInviti(salvata ?? [], aprono);
}

/** La condizione propria di un'Area (`area.condizioni_json`, migrazione 303: il Covo dei Ladri dal 5 maggio) in OR con gli inviti che la
 *  aprono; vuota se l'Area non ne ha una (allora segue solo il suo contenitore, e gli inviti verso di lei aprono il quartiere), se non
 *  c'è o se lo schema è di prima della 303. */
export function condizionePropriaArea(chiave: string | null | undefined, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] {
  if (!chiave) return [];
  let r: { condizioni_json: string | null } | undefined;
  try { r = prepared('SELECT condizioni_json FROM area WHERE chiave = ?').get(chiave) as { condizioni_json: string | null } | undefined; }
  catch { return []; } // uno schema di prima della 303 (o senza Aree): nessuna condizione propria
  const propria = leggiCondizioniSalvate(r?.condizioni_json ?? null);
  return propria.length === 0 ? [] : conGliInviti(propria, invitiCheAprono('area', chiave, inviti));
}

/** La condizione effettiva di un'Area: quella del suo quartiere (null per le Aree della città e dei Palazzi) e la sua propria, in AND;
 *  null se non c'è né l'una né l'altra. Senza condizione propria è esattamente quella del quartiere, come prima della 303. */
export function condizioneEffettivaArea(a: { chiave?: string | null; quartiere_chiave: string | null }, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] | null {
  const quartiere = a.quartiere_chiave ? condizioneEffettivaQuartiere(a.quartiere_chiave, inviti) : null;
  const propria = condizionePropriaArea(a.chiave, inviti);
  if (propria.length === 0) return quartiere;
  return [...(quartiere ?? []), ...propria];
}

/** La condizione propria di un luogo (`luogo.condizioni_json`) in OR con gli inviti che lo aprono, e quella propria della sua Area (303):
 *  è quella che dice se il luogo è sbloccato (la condizione `luogo{}`), senza il quartiere. */
export function condizioneDelLuogo(chiave: string, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] {
  const r = prepared('SELECT condizioni_json, area_chiave FROM luogo WHERE chiave = ?').get(chiave) as { condizioni_json: string | null; area_chiave: string | null } | undefined;
  return [...condizionePropriaArea(r?.area_chiave, inviti), ...conGliInviti(leggiCondizioniSalvate(r?.condizioni_json ?? null), invitiCheAprono('luogo', chiave, inviti))];
}
