// ============================================================
// Migrazione 332 — il Rampino di Morgana arriva con il suo passo della guida del Palazzo di Kamoshida; il Sacchetto di carta di Iwai resta alla voce
// ============================================================
//
// Indicazione: gli altri doni rimasti senza regola ricevono la regola della guida, se la guida ne dà una; altrimenti niente si inventa e si dice
// la fonte. Fonte: https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/ (letta il 2026-10-31).
//   - Rampino: «Morgana, nel corso dell'infiltrazione nel Palazzo di Kamoshida», senza giorno. Nel Palazzo di Kamoshida della guida dell'app c'è
//     il passo che lo dice («Ricevi Rampino da Morgana», Cancello del castello, tipo «storia»: si segna): la regola del dono è [quel passo
//     segnato nella partita] (condizione `voce-guida`, valutata da `doniConfidenti.ts` sullo stato con le voci segnate). Il passo si cerca nel
//     DB (Palazzo `kamoshida`, nome esatto, uno solo): nessuna chiave scritta qui. Il Palazzo non si tocca (lavoro validato): si legge soltanto.
//   - Sacchetto di carta: la guida lo lega alla vendita della medaglia di Kamoshida del 4 maggio al Negozio di Softair, sbirciando nel sacchetto
//     (voce del Diario `aeb2d2e8…`), e il 6 maggio si restituisce a Iwai (voce `04a576fd…`). Non è un dono che arriva da sé ma l'effetto di due
//     voci del periodo validato già spuntate: cambiarle cambierebbe ciò che le partite hanno registrato (DECISIONI §2, caso c), quindi niente
//     regola qui; l'audit lo dice.
// Una regola già scritta uguale = niente da fare; diversa = non toccata. Conservativa, idempotente, dentro la transazione della migrazione.
// Nessuna partita si tocca (il dono si legge dalla regola). Audit in `dati_guida.audit-332-doni-rampino-sacchetto`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, scriviAuditFbis } from './fbisOndata5.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-332-doni-rampino-sacchetto';
const errore = (motivo: string): never => { throw new Error(`332: ${motivo}; nessuna modifica applicata.`); };
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/';
const RAMPINO = { fonte: 'morgana', catalogo: 'chiave/rampino', passo: 'Ricevi Rampino da Morgana', palazzo: 'kamoshida' } as const;
const SACCHETTO_NON_MODELLATO = 'Sacchetto di carta di Iwai: la guida lo lega alla vendita della medaglia di Kamoshida del 4 maggio (voce aeb2d2e8…, sbirciando nel sacchetto) e alla restituzione del 6 maggio (voce 04a576fd…): è l’effetto di due voci del periodo validato già spuntate, non una regola del dono; non si scrive qui';

export const migration332: Migration = {
  id: 332,
  name: 'doni_rampino_e_sacchetto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['ricompensa_oggetto', 'punto_interesse', 'dungeon_area', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 332, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'ricompensa_oggetto', 'condizioni_json')) { logger.warn({ migrazione: 332 }, 'regola dei doni assente: niente da fare'); return; }
    const dono = db.prepare("SELECT condizioni_json FROM main.ricompensa_oggetto WHERE fonte_tipo = 'confidente' AND fonte_chiave = ? AND catalogo_chiave = ?").get(RAMPINO.fonte, RAMPINO.catalogo) as { condizioni_json: string | null } | undefined;
    const passi = db.prepare(`SELECT p.chiave FROM main.punto_interesse p JOIN main.dungeon_area a ON a.chiave = p.area_chiave
      WHERE a.dungeon_chiave = ? AND p.nome = ? AND NOT (p.tipo = 'altro' AND p.area_dedalo_chiave IS NULL)`).pluck().all(RAMPINO.palazzo, RAMPINO.passo) as string[];
    let esito: string;
    let cambiato = false;
    if (!dono) esito = 'il dono del Rampino non c’è: niente da fare';
    else if (passi.length !== 1) esito = `passi «${RAMPINO.passo}» nel Palazzo di Kamoshida: ${passi.length}, atteso uno: niente regola`;
    else {
      const regola: RequisitoSpillo[] = [{ tipo: 'voce-guida', voce: passi[0]!, segnata: true }];
      if (normalizzaCondizioniSpillo(regola).length !== 1) errore('la regola del Rampino non è valida');
      if (dono.condizioni_json !== null) esito = canonico(JSON.parse(dono.condizioni_json)) === canonico(regola) ? 'regola già scritta' : 'regola diversa già scritta: non toccata';
      else {
        if (db.prepare("UPDATE main.ricompensa_oggetto SET condizioni_json = ? WHERE fonte_tipo = 'confidente' AND fonte_chiave = ? AND catalogo_chiave = ? AND condizioni_json IS NULL")
          .run(JSON.stringify(regola), RAMPINO.fonte, RAMPINO.catalogo).changes !== 1) errore('la regola del Rampino non si scrive');
        esito = `regola scritta: passo ${passi[0]} segnato`;
        cambiato = true;
      }
    }
    if (cambiato) invalidaCacheDiGioco();
    const senzaRegola = db.prepare("SELECT fonte_chiave || ':' || catalogo_chiave FROM main.ricompensa_oggetto WHERE fonte_tipo = 'confidente' AND condizioni_json IS NULL ORDER BY 1").pluck().all() as string[];
    scriviAuditFbis(db, AUDIT, 332, { lotto: 'A1-dati', fonti: [FONTE], rampino: esito, sacchetto: SACCHETTO_NON_MODELLATO, senzaRegola }, cambiato || !db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT));
    logger.info({ migrazione: 332, rampino: esito, senzaRegola }, 'Doni dei Confidenti: Rampino di Morgana e Sacchetto di carta di Iwai');
  },
};
