// ============================================================
// sincronizzaMappe — crea l'albero delle mappe dalle entità della guida e gli spilli dai marcatori esistenti (Fase 13.1)
// ============================================================
//
// Idempotente: aggiunge solo ciò che manca (mai sovrascrive modifiche dell'utente). Usata dalla migrazione 027 (istanze
// esistenti) e alla fine di `caricaSeed` (istanze nuove e reseed).
//   - `tokyo` (città) → `citta-<quartiere>` (quartiere, entità quartiere, asset `mappe/citta-<q>`, immagine dell'istanza se già scaricata)
//   - `dungeon-<chiave>` (palazzo | dedalo, asset `palazzi/<chiave>`) → `<area>` (area, entità area, immagine dell'istanza se presente)
//   - spilli: uno per marcatore dei punti (riferimento `punto`) e dei luoghi (riferimento `luogo`), stessa origine del marcatore.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { DEFINIZIONI_SPILLO, spilloPerLuogo, spilloPerPunto } from '../../../shared/spilli.js';

function adesso(): string { return new Date().toISOString(); }

export function sincronizzaMappe(db: AppDatabase): { mappe: number; spilli: number } {
  const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  if (!tabelle.has('mappa')) return { mappe: 0, spilli: 0 };
  const immaginiMappa = new Set(tabelle.has('immagine') ? (db.prepare("SELECT chiave FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string }>).map((r) => r.chiave) : []);
  const insMappa = db.prepare(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, entita_tipo, entita_chiave, origine, updated_at)
    VALUES (@chiave, @nome, @tipo, @genitore, @ordine, @immagine, @asset, @entitaTipo, @entitaChiave, 'seed', @adesso)
    ON CONFLICT(chiave) DO UPDATE SET immagine_chiave = COALESCE(mappa.immagine_chiave, excluded.immagine_chiave), asset = COALESCE(mappa.asset, excluded.asset)`);
  let mappe = 0;
  const prima = (db.prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n;
  const t = adesso();
  insMappa.run({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta', genitore: null, ordine: 0, immagine: immaginiMappa.has('tokyo') ? 'tokyo' : null, asset: 'mappe/tokyo', entitaTipo: null, entitaChiave: null, adesso: t });
  if (tabelle.has('quartiere')) {
    for (const q of db.prepare('SELECT chiave, nome, ordine FROM quartiere ORDER BY ordine').all() as Array<{ chiave: string; nome: string; ordine: number }>) {
      const chiave = `citta-${q.chiave}`;
      insMappa.run({ chiave, nome: q.nome, tipo: 'quartiere', genitore: 'tokyo', ordine: q.ordine, immagine: immaginiMappa.has(chiave) ? chiave : null, asset: `mappe/${chiave}`, entitaTipo: 'quartiere', entitaChiave: q.chiave, adesso: t });
    }
  }
  if (tabelle.has('dungeon')) {
    for (const d of db.prepare('SELECT chiave, nome, tipo, ordine FROM dungeon ORDER BY ordine').all() as Array<{ chiave: string; nome: string; tipo: string; ordine: number }>) {
      const chiave = `dungeon-${d.chiave}`;
      insMappa.run({ chiave, nome: d.nome, tipo: d.tipo === 'mementos' ? 'dedalo' : 'palazzo', genitore: null, ordine: 100 + d.ordine, immagine: null, asset: `palazzi/${d.chiave}`, entitaTipo: 'dungeon', entitaChiave: d.chiave, adesso: t });
      for (const a of db.prepare('SELECT chiave, nome, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(d.chiave) as Array<{ chiave: string; nome: string; ordine: number }>) {
        insMappa.run({ chiave: a.chiave, nome: a.nome, tipo: 'area', genitore: chiave, ordine: a.ordine, immagine: immaginiMappa.has(a.chiave) ? a.chiave : null, asset: null, entitaTipo: 'area', entitaChiave: a.chiave, adesso: t });
      }
    }
  }
  mappe = (db.prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n - prima;

  // ---- Spilli dai marcatori ----
  const esiste = db.prepare('SELECT 1 FROM spillo WHERE riferimento_tipo = ? AND riferimento_chiave = ?');
  const insSpillo = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const mappaEsiste = db.prepare('SELECT 1 FROM mappa WHERE chiave = ?');
  let spilli = 0;
  if (tabelle.has('marcatore_mappa') && tabelle.has('punto_interesse')) {
    const righe = db.prepare(`SELECT m.punto_chiave, m.x, m.y, m.origine, p.area_chiave, p.tipo, p.nome, p.descrizione, p.ordine, p.esauribile
      FROM marcatore_mappa m JOIN punto_interesse p ON p.chiave = m.punto_chiave`).all() as Array<{ punto_chiave: string; x: number; y: number; origine: string; area_chiave: string; tipo: string; nome: string; descrizione: string; ordine: number; esauribile: number }>;
    for (const r of righe) {
      if (esiste.get('punto', r.punto_chiave) || !mappaEsiste.get(r.area_chiave)) continue;
      const tipo = spilloPerPunto(r.tipo);
      const collezionabile = r.esauribile === 1 || DEFINIZIONI_SPILLO[tipo].collezionabile ? 1 : 0;
      insSpillo.run(r.area_chiave, tipo, r.nome, r.descrizione, r.x, r.y, 'punto', r.punto_chiave, collezionabile, r.ordine, r.origine === 'seed' ? 'seed' : 'utente', t);
      spilli++;
    }
  }
  if (tabelle.has('marcatore_luogo') && tabelle.has('luogo')) {
    const righe = db.prepare(`SELECT m.luogo_chiave, m.x, m.y, m.origine, l.quartiere_chiave, l.tipo, l.nome, l.cosa_offre, l.ordine
      FROM marcatore_luogo m JOIN luogo l ON l.chiave = m.luogo_chiave`).all() as Array<{ luogo_chiave: string; x: number; y: number; origine: string; quartiere_chiave: string; tipo: string; nome: string; cosa_offre: string; ordine: number }>;
    for (const r of righe) {
      const mappa = `citta-${r.quartiere_chiave}`;
      if (esiste.get('luogo', r.luogo_chiave) || !mappaEsiste.get(mappa)) continue;
      insSpillo.run(mappa, spilloPerLuogo(r.tipo), r.nome, r.cosa_offre, r.x, r.y, 'luogo', r.luogo_chiave, 0, r.ordine, r.origine === 'seed' ? 'seed' : 'utente', t);
      spilli++;
    }
  }
  return { mappe, spilli };
}
