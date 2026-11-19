// Scritture del catalogo. Non riscrivono listini, testi delle voci o storico: gli altri moduli leggono la chiave.
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { chiaveCatalogo, eSottocategoriaDecorazione, SOTTOCATEGORIE_DECORAZIONE } from '../../shared/catalogo.js';
import { httpErrors } from '../utils/httpError.js';
import type { CatalogoOggettoDto } from '../../shared/types.js';
import type { DatiCatalogoOggetto } from '../schemas/catalogoOggetti.js';
import { dtoOggetto, identitaDellOggettoPerLOfferta, rigaOggetto } from './catalogoOggettiLetture.js';
import { conCestino } from './cestinoService.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { preparaProposteSenzaOggetto, trasferisciFontiCatalogo, verificaCategoriaLettura, verificaCostiPrimaDiEliminare } from './catalogoOggettiRiferimenti.js';

function datiSql(dati: Partial<DatiCatalogoOggetto>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const campo of ['categoria', 'sottocategoria', 'nome', 'effetto', 'descrizione'] as const) if (dati[campo] !== undefined) out[campo] = dati[campo];
  if (dati.nomiAltri !== undefined) out.nomi_altri_json = JSON.stringify([...new Set(dati.nomiAltri)]);
  if (dati.nomeOriginale !== undefined) out.nome_originale = dati.nomeOriginale;
  if (dati.statistiche !== undefined) out.statistiche_json = dati.statistiche === null ? null : JSON.stringify(dati.statistiche);
  return out;
}

/** Una decorazione dice la provenienza con una sottocategoria dell'elenco (`SOTTOCATEGORIE_DECORAZIONE`) o con nessuna; le altre categorie
 *  hanno sottocategorie libere. Vale per la riga come sarà dopo la scrittura (categoria e sottocategoria possono cambiare una alla volta). */
function verificaSottocategoria(categoria: string, sottocategoria: string | null): void {
  if (categoria !== 'decorazione' || sottocategoria === null || eSottocategoriaDecorazione(sottocategoria)) return;
  throw httpErrors.badRequest('sottocategoria-decorazione-non-valida',
    `Una decorazione ha come sottocategoria «dono» (${SOTTOCATEGORIE_DECORAZIONE.dono}), «artiglio» (${SOTTOCATEGORIE_DECORAZIONE.artiglio}) o nessuna: «${sottocategoria}» non è fra queste.`);
}

export function creaOggetto(dati: DatiCatalogoOggetto): CatalogoOggettoDto {
  verificaSottocategoria(dati.categoria, dati.sottocategoria);
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
  verificaSottocategoria(dati.categoria ?? r.categoria, dati.sottocategoria !== undefined ? dati.sottocategoria : r.sottocategoria);
  getDb().transaction(() => {
    verificaCategoriaLettura(chiave, dati.categoria ?? r.categoria);
    prepared(`UPDATE catalogo_oggetto SET ${colonne.map((c) => `${c} = ?`).join(',')},origine = 'utente',updated_at = ? WHERE chiave = ?`)
      .run(...colonne.map((c) => valori[c]), nowIso(), chiave);
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
    // L4-07: le offerte perdono il legame (chiave esterna): tengono nome, categoria e «per chi» che mostravano; il cestino rimette tutto
    const identita = identitaDellOggettoPerLOfferta(chiave);
    if (identita) prepared("UPDATE articolo SET nome = @nome, categoria = @categoria, per = @per WHERE catalogo_chiave = @chiave AND nome = ''").run({ ...identita, chiave });
    prepared('DELETE FROM catalogo_oggetto WHERE chiave = ?').run(chiave);
  });
  invalidaCacheDiGioco();
  return { eliminato: true, chiave };
}
