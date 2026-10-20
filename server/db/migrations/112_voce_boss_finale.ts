// ============================================================
// 112 — il boss finale di ogni Palazzo è una voce dichiarata (L4, lotti/L4/modifiche.md §8.14; O4-1 di Test funzionali, G-027 dell'Esperto)
// ============================================================
//
// Prima il boss finale lo riconosceva un'euristica (`palazziService.bossFinali`/`eBossFinale`): le voci `boss` dell'infiltrazione di ordine
// più alto, e ne bastava una qualunque (la prima fase a Niijima, Shido, Maruki); in un Palazzo con boss in una sola infiltrazione contava
// qualunque pin `boss` (a Kamoshida anche quello del tutorial dell'11/04). Da qui è una colonna: `dungeon.voce_boss_finale`, la voce che
// conta, con i valori di G-027 (certezza alta). «Boss finale fatto» = quella voce fatta (§8.11: dai suoi pin se ne ha). NULL = il Palazzo
// non si conclude. Iweleth e i Memento non ne hanno (R8-19b: il boss segnato nella Guida, come prima).
// `dungeon.seed_json` (nuova) conserva il valore della guida quando l'utente lo cambia («Modifica › Boss finale»): «Ripristina» lo rimette.
// La 112 e non la 111 (dove la scriveva il §8.14): la 111 era già applicata ai dati di sviluppo, e le migrazioni sono append-only.
// Controlli: una chiave che esiste ma non è una voce `boss` del suo Palazzo ferma la migrazione con un errore leggibile. Una chiave che non
// esiste lascia NULL e lo dice nel log: i pacchetti di prima della copia della produzione del 2026-10-20 non hanno le voci che l'utente ha
// scritto dopo (Kamoshida «Sconfiggi Kamoshida», Madarame «Scontro con Madarame»), e il pacchetto iniziale dei test è uno di questi.
// Idempotente: una voce già impostata (dall'utente o da un giro precedente) non si tocca.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Le voci del boss finale di G-027, per Palazzo (chiave completa). Iweleth no (R8-19b). */
export const VOCI_BOSS_FINALE: Readonly<Record<string, string>> = {
  kamoshida: 'kamoshida-rubare-i-desideri-del-cuore-sconfiggi-kamoshida',
  madarame: 'madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2',
  kaneshiro: 'kaneshiro-04-caveau-sotterraneo/16',
  futaba: 'futaba-10-santuario-interno-camera-del-vuoto-area-finale-dato-parzialm/0',
  okumura: 'okumura-10-produzione-armamenti/6',
  niijima: 'niijima-14-direzione-sala-del-boss/1',
  shido: 'shido-16-aula-magna-tesoro-e-boss-finali/4',
  maruki: 'maruki-12-eden-modello-psi-cognitivo-eden/3',
};

export const migration112: Migration = {
  id: 112,
  name: 'voce_boss_finale',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dungeon'").get()) return;
    const colonne = (db.prepare('PRAGMA table_info(dungeon)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('voce_boss_finale')) db.exec('ALTER TABLE dungeon ADD COLUMN voce_boss_finale TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL');
    if (!colonne.includes('seed_json')) db.exec('ALTER TABLE dungeon ADD COLUMN seed_json TEXT');
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'punto_interesse'").get()) return;
    const impostate: Record<string, string> = {};
    const mancanti: Record<string, string> = {};
    for (const [palazzo, voce] of Object.entries(VOCI_BOSS_FINALE)) {
      const d = db.prepare('SELECT voce_boss_finale FROM dungeon WHERE chiave = ?').get(palazzo) as { voce_boss_finale: string | null } | undefined;
      if (!d || d.voce_boss_finale !== null) continue;
      const v = db.prepare('SELECT p.tipo, a.dungeon_chiave AS palazzo FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(voce) as { tipo: string; palazzo: string } | undefined;
      if (!v) { mancanti[palazzo] = voce; continue; }
      if (v.tipo !== 'boss' || v.palazzo !== palazzo) {
        throw new Error(`migrazione 112: la voce del boss finale di ${palazzo} («${voce}») non è una voce «boss» di quel Palazzo (tipo ${v.tipo}, Palazzo ${v.palazzo}): correggere la tabella di G-027 prima di proseguire.`);
      }
      db.prepare('UPDATE dungeon SET voce_boss_finale = ? WHERE chiave = ?').run(voce, palazzo);
      impostate[palazzo] = voce;
    }
    logger.info({ impostate, mancanti }, 'migrazione 112: voce del boss finale di ogni Palazzo (G-027); le mancanti restano NULL');
  },
};
