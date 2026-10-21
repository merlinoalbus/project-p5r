import type { Migration } from '../migrationRunner.js';
import { palazzoDiIngresso } from '../../services/mappe/ingressoPalazzo.js';
import { logger } from '../../utils/logger.js';

type RigaPin = { id: number; origine: string; tipo: string; mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; seed_identita_json: string | null; condizioni_json: string | null };
type Finestra = { dal: string; al: string | null };
/** Sostituisce esclusivamente un nodo identico alla copia prodotta dal generatore. Campi ulteriori = non identico. */
function sostituisciCopie(x: unknown, finestra: Finestra, dungeon: string): { valore: unknown; copie: number } {
  if (!x || typeof x !== 'object') return { valore: x, copie: 0 };
  if (Array.isArray(x)) {
    const parti = x.map((c) => sostituisciCopie(c, finestra, dungeon));
    return { valore: parti.map((p) => p.valore), copie: parti.reduce((n, p) => n + p.copie, 0) };
  }
  const c = x as Record<string, unknown>;
  const uguale = finestra.al ? c.tipo === 'intervallo' && c.dal === finestra.dal && c.al === finestra.al && Object.keys(c).length === 3
    : c.tipo === 'data' && c.dal === finestra.dal && Object.keys(c).length === 2;
  if (uguale) return { valore: { tipo: 'finestra-palazzo', dungeon }, copie: 1 };
  const campo = c.tipo === 'gruppo' && Array.isArray(c.condizioni) ? 'condizioni' : c.tipo === 'non' && c.condizione ? 'condizione' : null;
  if (!campo) return { valore: x, copie: 0 };
  const dentro = sostituisciCopie(c[campo], finestra, dungeon);
  return { valore: dentro.copie ? { ...c, [campo]: dentro.valore } : x, copie: dentro.copie };
}

export const migration122: Migration = {
  id: 122,
  name: 'bonifica_luoghi_condizioni',
  up(db) {
    const colonne = (tabella: string) => (db.prepare(`PRAGMA main.table_info("${tabella}")`).all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne('negozio').includes('sblocco_json')) db.exec('ALTER TABLE negozio ADD COLUMN sblocco_json TEXT');
    // Non si riattiva negozio.condizioni_json: la 070 ne ha trasferito il significato agli articoli.
    const mappe = new Map((db.prepare(`WITH RECURSIVE albero(chiave,dungeon) AS (
      SELECT chiave, substr(chiave,9) FROM mappa WHERE chiave LIKE 'dungeon-%' AND genitore_chiave IS NULL
      UNION SELECT m.chiave,a.dungeon FROM mappa m JOIN albero a ON m.genitore_chiave=a.chiave
    ) SELECT chiave,dungeon FROM albero`).all() as Array<{ chiave: string; dungeon: string }>).map((r) => [r.chiave, r.dungeon]));
    const finestre = new Map((db.prepare("SELECT chiave,finestra_dal AS dal,finestra_al AS al FROM dungeon WHERE tipo='palazzo' AND finestra_dal IS NOT NULL").all() as Array<Finestra & { chiave: string }>).map((r) => [r.chiave, r]));
    const destinazioni = new Map((db.prepare('SELECT spillo_id,mappa_chiave FROM spillo_destinazione WHERE mappa_chiave IS NOT NULL').all() as Array<{ spillo_id: number; mappa_chiave: string }>).map((r) => [r.spillo_id, r.mappa_chiave]));
    const esclusi: Array<{ origine: string; motivo: string }> = [];
    const convertiti: string[] = [];
    const converti = (r: RigaPin, origine: string): string | null => {
      if (!r.condizioni_json) return null;
      const dungeon = palazzoDiIngresso(r, destinazioni.get(r.id) ?? null, mappe);
      if (!dungeon) return null;
      // Questi campi corrispondono al passaggio creato dalla sincronizzazione. Un pin adottato è sempre origine utente.
      if (r.origine !== 'seed' || r.seed_identita_json || r.tipo !== 'passaggio' || r.riferimento_tipo !== 'mappa' || r.riferimento_chiave !== `dungeon-${dungeon}`) {
        esclusi.push({ origine, motivo: 'provenienza non certa oppure condizioni dell’utente: preservate integralmente' }); return null;
      }
      const f = finestre.get(dungeon);
      if (!f) { esclusi.push({ origine, motivo: 'finestra strutturata assente' }); return null; }
      let prima: unknown;
      try { prima = JSON.parse(r.condizioni_json); }
      catch { esclusi.push({ origine, motivo: 'condizioni illeggibili: nessuna riscrittura' }); return null; }
      const dopo = sostituisciCopie(prima, f, dungeon);
      if (!dopo.copie) { esclusi.push({ origine, motivo: 'nessuna copia identica alla finestra' }); return null; }
      convertiti.push(origine);
      return JSON.stringify(dopo.valore);
    };
    const scrivi = db.prepare('UPDATE spillo SET condizioni_json=? WHERE id=? AND condizioni_json=?');
    for (const r of db.prepare('SELECT * FROM spillo').all() as RigaPin[]) {
      const dopo = converti(r, `spillo:${r.id}`);
      if (dopo) scrivi.run(dopo, r.id, r.condizioni_json);
    }
    // Immagini del solo spillo nel registro di gioco. Nessuna visita dei dati della partita o di JSON arbitrari.
    if (colonne('cestino').includes('registro_json')) for (const r of db.prepare('SELECT id,registro_json FROM cestino').all() as Array<{ id: number; registro_json: string }>) {
      let passi: Array<{ tabella?: string; prima?: RigaPin; dopo?: RigaPin }>;
      try { const v: unknown = JSON.parse(r.registro_json); if (!Array.isArray(v)) continue; passi = v; }
      catch { esclusi.push({ origine: `cestino:${r.id}`, motivo: 'registro illeggibile preservato' }); continue; }
      let cambiato = false;
      for (const [i, p] of passi.entries()) {
        if (!p || typeof p !== 'object' || p.tabella !== 'spillo') continue;
        const immagini = [p.prima, p.dopo].filter((v): v is RigaPin => !!v);
        if (immagini.some((v) => v.origine !== 'seed' || v.seed_identita_json)) continue;
        for (const campo of ['prima', 'dopo'] as const) {
          const immagine = p[campo];
          if (!immagine || typeof immagine.id !== 'number') continue;
          const dopo = converti(immagine, `cestino:${r.id}/passo:${i}/${campo}`);
          if (dopo) { p[campo] = { ...immagine, condizioni_json: dopo }; cambiato = true; }
        }
      }
      if (cambiato) db.prepare('UPDATE cestino SET registro_json=? WHERE id=? AND registro_json=?').run(JSON.stringify(passi), r.id, r.registro_json);
    }
    // Elenco operativo conservato nel DB dell'istanza; nessun dato dell'utente entra nel repository pubblico.
    db.prepare('INSERT OR REPLACE INTO dati_guida (chiave,json) VALUES (?,?)').run('bonifica-finestre-122', JSON.stringify({ convertiti, esclusi }));
    logger.info({ convertiti: convertiti.length, esclusi: esclusi.length }, 'migrazione122: sblocco negozi e riferimenti delle finestre');
  },
};
