// ============================================================
// utente 019 — le Persona catturate nei Memento sono quelle registrate nel compendio della partita
// ============================================================
//
// Dal 2026-10-12 (scelte dell'utente: «Se la persona è catturata vale per tutte le aree e i dedali»; «La cattura o meno delle
// Persona puoi valutarla dal compendio... dove vedi se una persona è stata sbloccata o meno nella partita») «catturata» non è
// più lo stato di una voce Persona di un dedalo (`punto_partita`, migrazione 100) ma la registrazione della Persona nel
// compendio della partita (`compendio_partita.registrata`). Una voce Persona segnata col modo di prima registra la sua Persona
// (se non lo è già: una registrazione esistente, con livello, bonus e abilità, non si tocca), e il suo stato se ne va.
// La Persona della voce viene dalla maschera, come `server/services/maschere.ts`.
// A differenza della registrazione dall'app, questa non scrive l'evento `compendio-registrata` nello storico della partita: è
// un trasloco di un segno già dato, non una registrazione nuova (rilievo N1 del validatore). Sui dati dell'utente, al
// 2026-10-12, non c'erano voci Persona segnate (0 righe).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { mascheraDi } from '../migrations/101_aree_reali_dei_dedali.js';

/** Forma di confronto di un nome (come `server/services/maschere.ts`). */
const normalizza = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const utente019: Migration = {
  id: 19,
  name: 'catture_nel_compendio',
  up(db) {
    const c = (schema: string, tabella: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
    if (!c('utente', 'punto_partita') || !c('utente', 'compendio_partita') || !c('main', 'punto_interesse') || !c('main', 'persona')) return;
    const righe = db.prepare(`SELECT pp.partita_id, pp.punto_chiave, p.dettagli_json FROM utente.punto_partita pp
      JOIN main.punto_interesse p ON p.chiave = pp.punto_chiave JOIN main.dungeon_area a ON a.chiave = p.area_chiave JOIN main.dungeon d ON d.chiave = a.dungeon_chiave
      WHERE p.tipo = 'persona' AND d.tipo = 'mementos'`).all() as Array<{ partita_id: number; punto_chiave: string; dettagli_json: string }>;
    if (righe.length === 0) return;
    const perNome = new Map((db.prepare('SELECT id, nome FROM main.persona').all() as Array<{ id: number; nome: string }>).map((p) => [normalizza(p.nome), p.id]));
    const traduzioni = c('main', 'traduzione')
      ? new Map((db.prepare("SELECT chiave, testo FROM main.traduzione WHERE ambito = 'persona'").all() as Array<{ chiave: string; testo: string }>).map((t) => [normalizza(t.testo), t.chiave]))
      : new Map<string, string>();
    const registra = db.prepare(`INSERT OR IGNORE INTO utente.compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (?, ?, 1, NULL, ?)`);
    const togli = db.prepare('DELETE FROM utente.punto_partita WHERE partita_id = ? AND punto_chiave = ?');
    const adesso = new Date().toISOString();
    for (const r of righe) {
      const n = normalizza(mascheraDi(r.dettagli_json));
      const id = perNome.get(n) ?? perNome.get(normalizza(traduzioni.get(n) ?? '')) ?? (n === 'norna' ? perNome.get('norn') : undefined);
      if (id !== undefined) registra.run(r.partita_id, id, adesso);
      togli.run(r.partita_id, r.punto_chiave);
    }
  },
};
