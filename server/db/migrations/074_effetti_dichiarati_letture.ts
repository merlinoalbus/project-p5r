// ============================================================
// 074 — che cosa fa un libro, un film, un'attività: un elenco di effetti dichiarati
// ============================================================
//
// Libri (`dote` + `note`, `effetto_json` singolo, `sblocca` in prosa), film (`dote` + `note`,
// `note_successive`) e attività (`doti_json[]` con la spiegazione in prosa) dicevano la stessa
// cosa in tre forme. Nasce `effetti_json` su tutte e tre (`shared/effettiCatalogo.ts`: voci con
// effetto dichiarato, `ripetuto` per le visioni successive, `condizioni` per gli effetti che
// scattano solo a certe condizioni). Regole della conversione, lette riga per riga:
//   - libro: `dote`+`note` → voce «dote»; `effetto_json` → voce; `sblocca` senza struttura passa
//     di nuovo dalla mappatura della 061 (in produzione il ricaricamento del seed ne aveva azzerato
//     l'esito) e, se nomina un quartiere, diventa «sblocca-luogo», altrimenti una voce «descrittivo»
//     (dichiarata come tale, così si vede quante restano);
//   - film: `dote`+`note` → voce; `note_successive` → voce «dote» con `ripetuto`; al cinema una
//     visione basta (`sessioni = 1`);
//   - attività: le voci di `doti_json` con dote e note → voce «dote»; lo studio al Leblanc e al
//     Diner danno 2 note, 3 con la pioggia → due voci, la prima con «non piove» e la seconda con
//     «piove», così chi somma non ne conta mai più di una; le altre spiegazioni non sono effetti
//     valutabili e restano fra i dettagli (075).
// Le chiavi delle Doti sono minuscole. Le colonne vecchie restano finché l'interfaccia le legge.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';
import { normalizzaVociEffetto, type VoceEffetto } from '../../../shared/effettiCatalogo.js';
import { quartiereSbloccato } from './061_libro_sblocca_un_luogo.js';

const dote = (nome: string, note: number, extra: Partial<VoceEffetto> = {}): VoceEffetto => ({ effetto: { famiglia: 'dote', dote: nome.toLowerCase(), note }, ...extra });

/** Le due attività di studio che rendono di più con la pioggia: «2 punti, 3 nei giorni di pioggia». */
export const STUDIO_CON_PIOGGIA: ReadonlySet<string> = new Set(['studio-leblanc', 'studio-diner-shibuya']);

function leggiEffetto(json: string | null): VoceEffetto[] {
  if (!json) return [];
  try { return normalizzaVociEffetto([{ effetto: JSON.parse(json) }]); } catch { return []; }
}

export const migration074: Migration = {
  id: 74,
  name: 'effetti_dichiarati_letture',
  up(db) {
    for (const t of ['libro', 'film', 'attivita']) aggiungiColonna(db, t, 'effetti_json', 'TEXT');
    const esito = { libri: 0, film: 0, attivita: 0, sbloccaLuogo: 0, descrittivi: 0 };
    const quartieri = new Set((db.prepare('SELECT chiave FROM quartiere').all() as Array<{ chiave: string }>).map((r) => r.chiave));

    const libri = db.prepare('SELECT chiave, dote, note, effetto_json, sblocca FROM libro WHERE effetti_json IS NULL').all() as Array<{ chiave: string; dote: string | null; note: number | null; effetto_json: string | null; sblocca: string | null }>;
    const scriviLibro = db.prepare('UPDATE libro SET effetti_json = ? WHERE chiave = ?');
    for (const l of libri) {
      const voci: VoceEffetto[] = [];
      if (l.dote && l.note && l.note > 0) voci.push(dote(l.dote, l.note));
      const dichiarato = leggiEffetto(l.effetto_json);
      voci.push(...dichiarato);
      if (dichiarato.length === 0 && l.sblocca && l.sblocca.trim()) {
        const luogo = quartiereSbloccato(l.sblocca, quartieri);
        if (luogo) { voci.push({ effetto: { famiglia: 'sblocca-luogo', luogo } }); esito.sbloccaLuogo++; }
        else { voci.push({ effetto: { famiglia: 'descrittivo', testo: l.sblocca.trim() } }); esito.descrittivi++; }
      }
      scriviLibro.run(JSON.stringify(normalizzaVociEffetto(voci)), l.chiave);
      esito.libri++;
    }

    const film = db.prepare('SELECT chiave, dove, dote, note, note_successive FROM film WHERE effetti_json IS NULL').all() as Array<{ chiave: string; dove: string; dote: string | null; note: number | null; note_successive: number | null }>;
    const scriviFilm = db.prepare('UPDATE film SET effetti_json = ? WHERE chiave = ?');
    for (const f of film) {
      const voci: VoceEffetto[] = [];
      if (f.dote && f.note && f.note > 0) voci.push(dote(f.dote, f.note));
      if (f.dote && f.note_successive && f.note_successive > 0) voci.push(dote(f.dote, f.note_successive, { ripetuto: true }));
      scriviFilm.run(JSON.stringify(normalizzaVociEffetto(voci)), f.chiave);
      esito.film++;
    }
    db.prepare("UPDATE film SET sessioni = 1 WHERE dove = 'cinema' AND sessioni <> 1").run();

    const attivita = db.prepare('SELECT chiave, doti_json FROM attivita WHERE effetti_json IS NULL').all() as Array<{ chiave: string; doti_json: string }>;
    const scriviAttivita = db.prepare('UPDATE attivita SET effetti_json = ? WHERE chiave = ?');
    for (const a of attivita) {
      const voci: VoceEffetto[] = [];
      let doti: Array<{ dote?: string | null; note?: number | null }> = [];
      try { doti = JSON.parse(a.doti_json) as typeof doti; } catch { doti = []; }
      if (STUDIO_CON_PIOGGIA.has(a.chiave)) {
        voci.push(dote('conoscenza', 2, { condizioni: [{ tipo: 'meteo', condizione: 'non-piove' }] }), dote('conoscenza', 3, { condizioni: [{ tipo: 'piove' }] }));
      } else {
        for (const d of doti) if (d.dote && typeof d.note === 'number' && d.note > 0) voci.push(dote(d.dote, d.note));
      }
      scriviAttivita.run(JSON.stringify(normalizzaVociEffetto(voci)), a.chiave);
      esito.attivita++;
    }
    logger.info(esito, 'migrazione 074: effetti dichiarati di libri, film e attività');
  },
};
