import type { AppDatabase } from '../../db/dbService.js';
export function riconciliaAreeGuida(db: AppDatabase): { convertite: string[]; conservate: string[] } {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name='guida_mappa'").get()) return { convertite: [], conservate: [] };
  const convertite: string[] = [], conservate: string[] = [];
  const aree = db.prepare("SELECT m.*,a.dungeon_chiave FROM mappa m JOIN dungeon_area a ON a.chiave=m.entita_chiave WHERE m.entita_tipo='area'").all() as Array<Record<string, unknown> & { chiave: string; dungeon_chiave: string; nome: string; note: string }>;
  for (const m of aree) {
    const chiave = m.chiave;
    const img = db.prepare("SELECT 1 FROM immagine WHERE ambito='mappa' AND chiave=?").get(chiave);
    const dest = db.prepare('SELECT 1 FROM spillo_destinazione WHERE mappa_chiave=?').get(chiave);
    const ingresso = db.prepare('SELECT 1 FROM quartiere_ingresso WHERE mappa_chiave=?').get(chiave);
    const figli = db.prepare('SELECT 1 FROM mappa WHERE genitore_chiave=?').get(chiave);
    if (m.immagine_chiave || m.asset || img || dest || ingresso || figli) {
      conservate.push(chiave);
      db.prepare('INSERT OR REPLACE INTO organizzazione_mappa_esito VALUES(?,?)').run(chiave, 'Geometria, figli o destinazione esistente: conversione non applicata.');
      continue;
    }
    db.prepare('INSERT OR IGNORE INTO guida_mappa(area_chiave,nome,note,metadata_json) VALUES(?,?,?,?)').run(m.entita_chiave, m.nome, m.note, JSON.stringify(m));
    const aliases = db.prepare('SELECT chiave FROM mappa_alias WHERE mappa_chiave=? UNION SELECT chiave FROM mappa_percorso WHERE mappa_chiave=?').all(chiave, chiave) as Array<{ chiave: string }>;
    for (const a of [{ chiave }, ...aliases]) {
      const esistente=db.prepare('SELECT area_chiave FROM guida_alias WHERE chiave=?').get(a.chiave) as {area_chiave:string}|undefined;
      if(esistente && esistente.area_chiave!==m.entita_chiave)throw new Error('Alias guida in conflitto: '+a.chiave);
      db.prepare('INSERT OR IGNORE INTO guida_alias(chiave,area_chiave) VALUES(?,?)').run(a.chiave, m.entita_chiave);
    }
    db.prepare("UPDATE spillo SET mappa_chiave=NULL, area_guida_chiave=?, ruolo_guida='punto' WHERE mappa_chiave=?").run(m.entita_chiave, chiave);
    db.prepare("UPDATE spillo SET mappa_chiave=NULL, area_guida_chiave=?, ruolo_guida='sezione' WHERE riferimento_tipo='mappa' AND riferimento_chiave=? AND mappa_chiave IS NOT NULL").run(m.entita_chiave, chiave);
    db.prepare('DELETE FROM mappa_alias WHERE mappa_chiave=?').run(chiave);
    db.prepare('DELETE FROM mappa_percorso WHERE mappa_chiave=?').run(chiave);
    db.prepare('DELETE FROM mappa WHERE chiave=?').run(chiave);
    db.prepare('DELETE FROM organizzazione_mappa_esito WHERE chiave=?').run(chiave);
    convertite.push(chiave);
  }
  return { convertite, conservate };
}
