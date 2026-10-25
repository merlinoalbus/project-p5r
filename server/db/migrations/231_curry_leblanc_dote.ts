// ============================================================
// 231 — il curry del Leblanc dà la sua Dote (R12-01/7; ricerca Royal del 24/10, §4: «Curry al Leblanc»)
// ============================================================
//
// Nel gioco ogni curry cucinato al Leblanc dà Coraggio ♪1 (due fonti indipendenti: la wiki giapponese 「喫茶店修行」 e la tabella
// 「人間パラメータ」, Samurai Gamers; certezza alta, vedi `docs/coordinamento/lotti/L9/ricerca-royal-2026-10-24.md`, riga 80). L'attività
// `curry-leblanc` non lo diceva: `doti_json` ed `effetti_json` vuoti e tracciamento «nessuno» (tipo «cibo»), quindi né il contatore delle volte
// né l'effetto `turno` di una voce potevano registrarlo, e nessuna spunta ricordava la Dote da segnare. La 185 aveva scritto biblioteca e
// caffè (e la 214 ha poi tolto Takemi, che ha la fonte nel suo Confidente) ma non il curry.
// Qui:
//   - `effetti_json` = Coraggio ♪1 al primo curry + la stessa voce `ripetuto` (dal secondo in poi): nel modello degli effetti una voce senza
//     `ripetuto` vale solo la prima volta e una con `ripetuto` dalla seconda in poi (`shared/effettiCatalogo.ts`), e il gioco la dà ogni volta;
//   - il tracciamento passa da «nessuno» a «svolta» (come la 179 per la palestra e la 180 per lo studio): l'attività conta le volte, e
//     l'effetto `turno` di una voce del Diario la registra, con il promemoria «Applica» sulla voce.
// Non si scrivono né condizioni (lo sblocco al rango 4 di Sojiro e i giorni degli avanzi sono un'altra cosa) né altre Doti. Le attività con
// valori discordanti o a risultato (bagno pubblico, centro battute, Big Bang Burger) restano in prosa, come deciso dalla 185.
// Conservativa: scrive solo se la riga è ancora quella del seed (origine «seed», mai toccata dall'utente), con gli effetti ancora vuoti, e
// il tracciamento solo se è ancora «nessuno»; un'azione dell'utente non si tocca. Il valore di prima va in `dati_guida`
// (`audit-231-curry-leblanc`). Idempotente. Scrive solo in `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const CHIAVE = 'curry-leblanc';
const CORAGGIO = { famiglia: 'dote', dote: 'coraggio', note: 1 };
const EFFETTI = [{ effetto: CORAGGIO, condizioni: [] }, { effetto: CORAGGIO, ripetuto: true, condizioni: [] }];

export const migration231: Migration = {
  id: 231,
  name: 'curry_leblanc_dote',
  up(db) {
    const tabella = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'attivita'").get();
    if (!tabella) return;
    const riga = db.prepare("SELECT effetti_json, tracciamento FROM main.attivita WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").get(CHIAVE) as { effetti_json: string | null; tracciamento: string } | undefined;
    if (!riga) return;
    const rapporto: Record<string, unknown> = { prima: { effetti_json: riga.effetti_json, tracciamento: riga.tracciamento } };
    rapporto.effetti = db.prepare("UPDATE main.attivita SET effetti_json = ? WHERE chiave = ? AND (effetti_json IS NULL OR effetti_json IN ('', '[]'))").run(JSON.stringify(EFFETTI), CHIAVE).changes;
    // il tracciamento cambia solo se l'effetto è quello scritto qui (o già presente) e la scelta è ancora quella del seed
    rapporto.tracciamento = db.prepare("UPDATE main.attivita SET tracciamento = 'svolta' WHERE chiave = ? AND tracciamento = 'nessuno' AND effetti_json = ?").run(CHIAVE, JSON.stringify(EFFETTI)).changes;
    if (rapporto.effetti || rapporto.tracciamento) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('audit-231-curry-leblanc', JSON.stringify({ data: '2026-10-25', ...rapporto }));
    }
    logger.info(rapporto, '[migration231] curry del Leblanc: Coraggio per ogni curry');
  },
};
