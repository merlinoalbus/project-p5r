// ============================================================
// 140 — l'Area dei luoghi di L5 rimasti senza (proposta approvata dall'utente il 23/10)
// ============================================================
//
// La 115 ha dato l'Area ai luoghi che avevano un pin su una planimetria di un'Area; 44 luoghi sono rimasti senza. La proposta
// `docs/coordinamento/lotti/L5/proposta-aree-44-luoghi.md`, approvata per intero dall'utente, ne colloca 21 (14 certi e 7 incerti
// approvati) e ne esclude 23, che restano senza Area: 17 luoghi dei quartieri senza planimetrie, più 6 (i due Memento, Nagiuri,
// Odaiba Seaside Park, i distributori della Shujin, la stazione di Shibuya).
//
// Conservativa: scrive l'Area solo dove `area_chiave` è ancora NULL (una scelta fatta dall'app non si tocca). L'Area si cerca dentro
// il quartiere del luogo, per slug o, in mancanza, per nome; se il luogo o l'Area non ci sono (eliminati, nel Cestino) si salta senza
// errore. Non tocca pin, planimetrie né `partite.db`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Luogo → Area (slug e nome com'erano al 23/10). «Edificio principale 1P / 2P» è un'unica Area con i laboratori dello stesso piano. */
const COLLOCAZIONI: ReadonlyArray<readonly [luogo: string, slug: string, nome: string]> = [
  ['shibuya/37-gradi', 'centro-comm-sotterraneo', 'Centro comm. sotterraneo'],
  ['shibuya/tsurukame', 'centro-comm-sotterraneo', 'Centro comm. sotterraneo'],
  ['shibuya/high-sense', 'centro-comm-sotterraneo', 'Centro comm. sotterraneo'],
  ['shibuya/prossimo-asso', 'centro-comm-sotterraneo', 'Centro comm. sotterraneo'],
  ['shibuya/taisho-store', 'centro-comm-sotterraneo', 'Centro comm. sotterraneo'],
  ['shibuya/underground-mall-lovers', 'centro-comm-sotterraneo', 'Centro comm. sotterraneo'],
  ['kanda-jinbocho/chiesa-kanda', 'cappella', 'Cappella'],
  ['shinjuku/chihaya-stand', 'quartiere-a-luci-rosse', 'Quartiere a luci rosse'],
  ['shujin-academy/corridoio-2-piano-shujin', 'edificio-principale-2p-edificio-laboratori-2p', 'Edificio principale 2P / Edificio laboratori 2P'],
  ['shujin-academy/infermeria-shujin', 'edificio-principale-1p-edificio-laboratori-1p', 'Edificio principale 1P / Edificio laboratori 1P'],
  ['shujin-academy/negozio-scolastico', 'edificio-principale-1p-edificio-laboratori-1p', 'Edificio principale 1P / Edificio laboratori 1P'],
  ['shujin-academy/aula-shujin', 'aula', 'Aula'],
  ['yongen-jaya/super-muramasa', 'vicoli', 'Vicoli'],
  ['yongen-jaya/batting-cage-yongen', 'vicoli', 'Vicoli'],
  ['yongen-jaya/distributore-bagno-pubblico', 'vicoli', 'Vicoli'],
  ['yongen-jaya/sakura-residence', 'vicoli', 'Vicoli'],
  ['yongen-jaya/venditore-patate-dolci', 'vicoli', 'Vicoli'],
  ['yongen-jaya/stazione-yongen-jaya', 'banchina-della-metropolitana', 'Banchina della metropolitana'],
  ['akihabara/distributori-akihabara', 'electric-town', 'Electric Town'],
  ['kichijoji/kichijoji-galleria-kasumi', 'quartiere-dello-shopping', 'Quartiere dello shopping'],
  ['kichijoji/mercante-sakai', 'quartiere-dello-shopping', 'Quartiere dello shopping'],
];

export const migration140: Migration = {
  id: 140,
  name: 'aree_dei_luoghi',
  up(db) {
    const tabella = (n: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(n);
    if (!tabella('luogo') || !tabella('area')) return;
    if (!(db.prepare('PRAGMA main.table_info(luogo)').all() as Array<{ name: string }>).some((c) => c.name === 'area_chiave')) return;
    const conta = () => (db.prepare('SELECT COUNT(*) AS n FROM main.luogo WHERE area_chiave IS NULL').get() as { n: number }).n;
    const prima = conta();
    const luogo = db.prepare('SELECT quartiere_chiave, area_chiave FROM main.luogo WHERE chiave = ?');
    const area = db.prepare(`SELECT chiave FROM main.area WHERE quartiere_chiave = ? AND (slug = ? OR nome = ?)
      ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, chiave LIMIT 1`);
    const scrivi = db.prepare('UPDATE main.luogo SET area_chiave = ? WHERE chiave = ? AND area_chiave IS NULL');
    let collocati = 0;
    const saltati: string[] = [];
    for (const [chiave, slug, nome] of COLLOCAZIONI) {
      const l = luogo.get(chiave) as { quartiere_chiave: string; area_chiave: string | null } | undefined;
      if (!l) { saltati.push(`${chiave}: luogo assente`); continue; }
      if (l.area_chiave !== null) continue;
      const a = area.get(l.quartiere_chiave, slug, nome, slug) as { chiave: string } | undefined;
      if (!a) { saltati.push(`${chiave}: Area «${nome}» assente`); continue; }
      collocati += scrivi.run(a.chiave, chiave).changes;
    }
    logger.info({ senzaAreaPrima: prima, collocati, senzaAreaDopo: conta(), saltati }, '[migration140] Area dei luoghi di L5');
  },
};
