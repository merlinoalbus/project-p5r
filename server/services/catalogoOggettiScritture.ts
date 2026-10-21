// Scritture del catalogo. Non riscrivono listini, testi delle voci o storico: gli altri moduli leggono la chiave.
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { chiaveCatalogo, eCategoriaOggetto } from '../../shared/catalogo.js';
import type { CatalogoOggettoDto } from '../../shared/types.js';
import type { DatiCatalogoOggetto } from '../schemas/catalogoOggetti.js';
import { dtoOggetto, rigaOggetto } from './catalogoOggettiLetture.js';
import { conCestino } from './cestinoService.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { httpErrors } from '../utils/httpError.js';
import { bodyNuovoOggetto } from '../schemas/catalogoOggetti.js';
import { preparaProposteSenzaOggetto, trasferisciFontiCatalogo, verificaCategoriaLettura, verificaCostiPrimaDiEliminare } from './catalogoOggettiRiferimenti.js';

const COLONNE = ['categoria', 'sottocategoria', 'nome', 'nomi_altri_json', 'nome_originale', 'effetto', 'descrizione', 'statistiche_json'] as const;
function datiSql(dati: Partial<DatiCatalogoOggetto>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const campo of ['categoria', 'sottocategoria', 'nome', 'effetto', 'descrizione'] as const) if (dati[campo] !== undefined) out[campo] = dati[campo];
  if (dati.nomiAltri !== undefined) out.nomi_altri_json = JSON.stringify([...new Set(dati.nomiAltri)]);
  if (dati.nomeOriginale !== undefined) out.nome_originale = dati.nomeOriginale;
  if (dati.statistiche !== undefined) out.statistiche_json = dati.statistiche === null ? null : JSON.stringify(dati.statistiche);
  return out;
}

export function creaOggetto(dati: DatiCatalogoOggetto): CatalogoOggettoDto {
  const base = chiaveCatalogo(dati.categoria, dati.nome);
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  const valori = datiSql(dati);
  const colonne = Object.keys(valori);
  prepared(`INSERT INTO catalogo_oggetto(chiave,${colonne.join(',')},fonte_tipo,origine,updated_at)
    VALUES (?,${colonne.map(() => '?').join(',')},'utente','utente',?)`).run(chiave, ...Object.values(valori), nowIso());
  invalidaCacheDiGioco();
  return dtoOggetto(rigaOggetto(chiave));
}

export function aggiornaOggetto(chiave: string, dati: Partial<DatiCatalogoOggetto>): CatalogoOggettoDto {
  const r = rigaOggetto(chiave, true);
  const valori = datiSql(dati);
  const colonne = Object.keys(valori).filter((c) => valori[c] !== r[c as keyof typeof r]);
  if (!colonne.length) return dtoOggetto(r);
  const copia = r.seed_json ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(COLONNE.map((c) => [c, r[c]]))) : null);
  getDb().transaction(() => {
    verificaCategoriaLettura(chiave, dati.categoria ?? r.categoria);
    prepared(`UPDATE catalogo_oggetto SET ${colonne.map((c) => `${c} = ?`).join(',')},origine = 'utente',seed_json = ?,updated_at = ? WHERE chiave = ?`)
      .run(...colonne.map((c) => valori[c]), copia, nowIso(), chiave);
  })();
  invalidaCacheDiGioco();
  return dtoOggetto(rigaOggetto(chiave, true));
}

export function ripristinaOggetto(chiave: string): CatalogoOggettoDto {
  const r = rigaOggetto(chiave, true);
  if (!r.seed_json) throw httpErrors.conflict('oggetto-senza-snapshot', 'L’oggetto non ha una correzione da ripristinare.');
  let originale: unknown;
  try { originale = JSON.parse(r.seed_json) as unknown; } catch { throw httpErrors.conflict('snapshot-oggetto-non-valido', 'La copia della guida non è leggibile: nessun valore è stato cambiato.'); }
  if (!originale || typeof originale !== 'object' || Array.isArray(originale)) throw httpErrors.conflict('snapshot-oggetto-non-valido', 'La copia della guida non è un oggetto: nessun valore è stato cambiato.');
  const valori = originale as Record<string, unknown>;
  if (COLONNE.some((c) => !(c in valori) || (valori[c] !== null && typeof valori[c] !== 'string'))
    || !valori.nome || !eCategoriaOggetto(valori.categoria) || typeof valori.effetto !== 'string' || typeof valori.descrizione !== 'string'
    || typeof valori.nomi_altri_json !== 'string') {
    throw httpErrors.conflict('snapshot-oggetto-incompleto', 'La copia della guida è incompleta: nessun valore è stato cambiato.');
  }
  let nomiAltri: unknown; let statistiche: unknown;
  try {
    nomiAltri = JSON.parse(valori.nomi_altri_json as string) as unknown;
    statistiche = valori.statistiche_json === null ? null : JSON.parse(valori.statistiche_json as string) as unknown;
  } catch { throw httpErrors.conflict('snapshot-oggetto-non-valido', 'Alias o statistiche della copia non sono leggibili: nessun valore è stato cambiato.'); }
  const contenuto = bodyNuovoOggetto.safeParse({ categoria: valori.categoria, sottocategoria: valori.sottocategoria,
    nome: valori.nome, nomiAltri, nomeOriginale: valori.nome_originale, effetto: valori.effetto,
    descrizione: valori.descrizione, statistiche });
  if (!contenuto.success) throw httpErrors.conflict('snapshot-oggetto-incompleto', 'La copia contiene dati incompatibili con il catalogo: nessun valore è stato cambiato.');
  getDb().transaction(() => {
    verificaCategoriaLettura(chiave, valori.categoria);
    prepared(`UPDATE catalogo_oggetto SET ${COLONNE.map((c) => `${c} = ?`).join(',')},origine = 'seed',seed_json = NULL,updated_at = ? WHERE chiave = ?`)
      .run(...COLONNE.map((c) => valori[c]), nowIso(), chiave);
  })();
  invalidaCacheDiGioco();
  return dtoOggetto(rigaOggetto(chiave, true));
}

export function eliminaOggetto(chiave: string): { eliminato: true; chiave: string } {
  const r = rigaOggetto(chiave, true);
  conCestino({ tipo: 'oggetto', chiave, nome: r.nome, contesto: '' }, () => {
    verificaCostiPrimaDiEliminare(chiave);
    preparaProposteSenzaOggetto(chiave);
    trasferisciFontiCatalogo(chiave, null);
    prepared('UPDATE regalo_partita SET catalogo_chiave = NULL WHERE catalogo_chiave = ?').run(chiave);
    prepared('DELETE FROM catalogo_oggetto WHERE chiave = ?').run(chiave);
  });
  invalidaCacheDiGioco();
  return { eliminato: true, chiave };
}
