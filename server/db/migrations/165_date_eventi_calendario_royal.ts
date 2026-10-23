// ============================================================
// 165 — sei date di eventi del calendario corrette sulle fonti Royal (L9 R9-20, blocco G §4)
// ============================================================
//
// Conservativa: ogni riga si scrive solo se data e titolo sono ancora quelli vecchi (se l'utente o un'altra migrazione l'hanno già cambiata, non si tocca).
//   26  Yoshida rango 1      09/05 -> 10/05   (AllGameStaff: giorno consigliato 10 maggio; la voce con rango atteso 1 è del 10/5)
//   41  Kawakami rango 1     06/06 -> 08/06   (sblocco il 4/6 e rango 1 consigliato l'8/6; l'evento è il rango 1; lo sblocco del 4/6 è un dato ricavato)
//   47  Yusuke rango 1       17/06 -> 18/06   (AllGameStaff: giorno consigliato 18 giugno)
//   75  Chihaya rango 1      29/07 -> 30/07   (AllGameStaff: giorno consigliato 30 luglio)
//   115 Primo accesso Niijima 28/10 -> 29/10  (AllGameStaff, Palazzo di Sae: primo accesso il 29/10); l'evento 116 (scadenza annunciata, stesso giorno) passa
//       a ordine 1 perché segua l'accesso
// Shido (137, 18/12) NON si tocca: le fonti non concordano in modo certo. Idempotente: la seconda esecuzione non trova più i valori vecchi.
// ============================================================

import type { Migration } from '../migrationRunner.js';

interface Correzione { id: number; da: string; a: string; ordine: number; titolo: string }
const CORREZIONI: readonly Correzione[] = [
  { id: 26, da: '05-09', a: '05-10', ordine: 0, titolo: 'Confidente Toranosuke Yoshida (Sole) rango 1' },
  { id: 41, da: '06-06', a: '06-08', ordine: 1, titolo: 'Confidente Sadayo Kawakami (Temperanza) rango 1' },
  { id: 47, da: '06-17', a: '06-18', ordine: 2, titolo: 'Confidente Yusuke Kitagawa (Imperatore) rango 1' },
  { id: 75, da: '07-29', a: '07-30', ordine: 0, titolo: 'Confidente Chihaya Mifune (Fortuna) rango 1' },
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
