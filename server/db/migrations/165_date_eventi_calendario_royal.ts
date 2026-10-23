// ============================================================
// 165 — due date di eventi del calendario corrette sulle fonti Royal (L9 R9-20, blocco G §4)
// ============================================================
//
// Conservativa: ogni riga si scrive solo se data e titolo sono ancora quelli vecchi (se l'utente o un'altra migrazione l'hanno già cambiata, non si tocca).
//   26  Yoshida rango 1      09/05 -> 10/05   (AllGameStaff: giorno consigliato 10 maggio; la voce con rango atteso 1 è del 10/5)
//   115 Primo accesso Niijima 28/10 -> 29/10  (AllGameStaff, Palazzo di Sae: primo accesso il 29/10); l'evento 116 (scadenza annunciata, stesso giorno) passa
//       a ordine 1 perché segua l'accesso
// NON si toccano: Shido (137, 18/12), le fonti non concordano in modo certo; Kawakami (41), Yusuke (47) e Chihaya (75): il «giorno consigliato» non è la data
// del rango 1 (DECISIONI.md, 24/10), quindi restano alla data originale. Idempotente: la seconda esecuzione non trova più i valori vecchi.
// ============================================================

import type { Migration } from '../migrationRunner.js';

interface Correzione { id: number; da: string; a: string; ordine: number; titolo: string }
const CORREZIONI: readonly Correzione[] = [
  { id: 26, da: '05-09', a: '05-10', ordine: 0, titolo: 'Confidente Toranosuke Yoshida (Sole) rango 1' },
  { id: 115, da: '10-28', a: '10-29', ordine: 0, titolo: "Primo accesso al Palazzo di Niijima (Casino')" },
];

export const migration165: Migration = {
  id: 165, name: 'date_eventi_calendario_royal',
  up(db) {
    const esisteGiorno = db.prepare('SELECT 1 FROM main.giorno_calendario WHERE data = ?');
    const sposta = db.prepare('UPDATE main.evento_calendario SET data = ?, ordine = ? WHERE id = ? AND data = ? AND titolo = ?');
    let spostati = 0;
    for (const c of CORREZIONI) {
      if (!esisteGiorno.get(c.a)) continue;
      const fatto = sposta.run(c.a, c.ordine, c.id, c.da, c.titolo).changes;
      spostati += fatto;
      if (c.id === 115 && fatto === 1) {
        // 116 (scadenza annunciata al primo ingresso) è già al 29/10 con ordine 0: ora segue l'accesso.
        db.prepare("UPDATE main.evento_calendario SET ordine = 1 WHERE id = 116 AND data = '10-29' AND ordine = 0 AND tipo = 'scadenza'").run();
      }
    }
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('audit-165-date-eventi-calendario', JSON.stringify({
      data: '2026-10-24', fonte: 'lotti/L9/G-collegamenti-calendario-2026-10-24.md §4', spostati, nonToccati: 'id 137 (Shido): fonti discordi',
    }));
  },
};
