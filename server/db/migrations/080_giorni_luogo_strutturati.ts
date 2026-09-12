// ============================================================
// 080 — i giorni di un luogo sono valori, non una frase: `luogo.giorni_json`
// ============================================================
//
// Voce 11 del piano «struttura, non frasi»: `luogo.giorni` era testo («martedì, giovedì, sabato,
// domenica», «domenica (regolare) e festività») letto da un'espressione regolare che scartava tutto
// ciò che non fosse un elenco pulito. Da qui `giorni_json` è un elenco di chiavi dei giorni della
// settimana (vuoto = nessuna limitazione); la parte della frase che non è un giorno — la parentesi,
// le festività — non si indovina: finisce nelle `note` del luogo, com'era scritta, perché resti
// leggibile. Idempotente: converte solo le righe senza `giorni_json`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { GIORNI_SETTIMANA_CHIAVI, type GiornoChiave } from '../../../shared/orariNegozio.js';

const senzaAccenti = (t: string): string => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const CHIAVI = new Set<string>(GIORNI_SETTIMANA_CHIAVI);

/** La frase dei giorni → { chiavi dei giorni, resto non interpretabile }. Esportata per i test. */
export function giorniDallaFrase(frase: string | null): { giorni: GiornoChiave[]; resto: string | null } {
  const originale = (frase ?? '').trim();
  if (!originale) return { giorni: [], resto: null };
  const pulita = senzaAccenti(originale);
  if (/^tutti i giorni\b/.test(pulita)) return { giorni: [], resto: null };
  // si legge solo ciò che precede la prima parentesi; il resto della frase è una precisazione
  const testa = pulita.split('(')[0];
  const pezzi = testa.split(/\s*(?:,|\se\s)\s*/).map((p) => p.trim()).filter(Boolean);
  const giorni = [...new Set(pezzi.filter((p) => CHIAVI.has(p)))] as GiornoChiave[];
  const tuttiGiorni = pezzi.length > 0 && pezzi.every((p) => CHIAVI.has(p));
  const haParentesi = pulita.includes('(');
  const resto = tuttiGiorni && !haParentesi ? null : originale;
  return { giorni: giorni.length >= 7 ? [] : giorni, resto };
}

export const migration080: Migration = {
  id: 80,
  name: 'giorni_luogo_strutturati',
  up(db) {
    const colonne = (db.prepare('PRAGMA table_info(luogo)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('giorni_json')) db.exec("ALTER TABLE luogo ADD COLUMN giorni_json TEXT NOT NULL DEFAULT '[]'");
    const righe = db.prepare("SELECT chiave, giorni, note FROM luogo WHERE giorni IS NOT NULL AND TRIM(giorni) <> '' AND giorni_json = '[]'").all() as Array<{ chiave: string; giorni: string; note: string | null }>;
    const aggiorna = db.prepare('UPDATE luogo SET giorni_json = ?, note = ? WHERE chiave = ?');
    let convertiti = 0; let conNota = 0;
    for (const r of righe) {
      const { giorni, resto } = giorniDallaFrase(r.giorni);
      const nota = resto ? `Giorni (dalla guida): ${resto}` : null;
      const note = nota && !(r.note ?? '').includes(nota) ? (r.note ? `${r.note} · ${nota}` : nota) : r.note;
      aggiorna.run(JSON.stringify(giorni), note, r.chiave);
      convertiti++;
      if (nota) conNota++;
    }
    logger.info({ righe: righe.length, convertiti, conNota }, 'migrazione 080: giorni dei luoghi strutturati');
  },
};
