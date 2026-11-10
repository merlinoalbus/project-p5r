// ============================================================
// Utente 072 — gli acquisti spostati dalla 068 alle macchine hanno il loro segno «ottenuto» (rilievo P2 della revisione automatica sulla PR 110)
// ============================================================
//
// La utente 068 sposta all'offerta della macchina (Central Street 1–3, Tornello 1–2) le righe di `registro_acquisti` comprate in quella sede
// aggiuntiva. Una riga con `ottenuto_qui = 0` (l'oggetto era già ottenuto all'offerta principale, poi ricomprato nella sede) arriva alla macchina
// senza presenza: la macchina ha l'acquisto registrato e la scorta consumata, ma l'offerta risulta non acquistata (`chiaviArticoliOttenuti` legge
// `acquisto_partita`, non il registro). Lo stesso se la riga che portava il segno arrivava da un'offerta d'origine già senza presenza. La 068 è
// registrata e quel ramo si completava: la presenza mancante la crea questa, per i file già arrivati alla 68 e per quelli che ci arrivano adesso.
//
// Lo stato da correggere si riconosce da sé, senza leggere il verbale della 068 (`main.dati_guida` può essere stato sostituito con «Importa»): un'offerta
// di una delle cinque macchine con righe nel registro e nessuna presenza. Per costruzione l'app non lo produce (la prima riga di un'offerta crea la
// presenza; togliendo l'ultima riga se ne va anche la presenza; il segno «solo presenza» si toglie solo senza righe). Per ognuna: la presenza, con
// la data dell'acquisto più vecchio, e la sua valutazione durevole (`nuovaValutazioneLegacy`, come un acquisto nuovo); il segno lo porta l'acquisto
// più vecchio se nessuno lo porta. Le offerte che non esistono nel file di gioco restano come sono (lo dice il log). Per prudenza anche una
// presenza delle macchine senza la sua valutazione (`acquisto_legacy_associazione`) la riceve, con un avviso nel log.
// Append-only e idempotente: dopo la prima, ogni offerta con righe ha la sua presenza. Le righe del registro restano identiche salvo `ottenuto_qui`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { nuovaValutazioneLegacy } from '../acquistiLegacy.js';

const errore = (motivo: string): never => { throw new Error(`utente 072: ${motivo}; nessuna modifica applicata.`); };

/** Le macchine nate dalle sedi aggiuntive dei distributori (migrazioni 348 e 350), le stesse della utente 068. */
const MACCHINE = ['distributore-shibuya-central-street-1', 'distributore-shibuya-central-street-2', 'distributore-shibuya-central-street-3',
  'distributore-shibuya-tornello-1', 'distributore-shibuya-tornello-2'] as const;

export const utente072: Migration = {
  id: 72,
  name: 'presenze_delle_macchine',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const tabellaUtente = (t: string) => !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!['registro_acquisti', 'acquisto_partita'].every(tabellaUtente)) return;
    const senzaPresenza = db.prepare(`SELECT partita_id, articolo_chiave, MIN(id) AS prima, SUM(ottenuto_qui) AS segni, COUNT(*) AS righe FROM utente.registro_acquisti r
      WHERE (${MACCHINE.map(() => 'r.articolo_chiave LIKE ?').join(' OR ')})
        AND NOT EXISTS (SELECT 1 FROM utente.acquisto_partita a WHERE a.partita_id = r.partita_id AND a.articolo_chiave = r.articolo_chiave)
      GROUP BY partita_id, articolo_chiave ORDER BY partita_id, articolo_chiave`).all(...MACCHINE.map((m) => `${m}/%`)) as
      Array<{ partita_id: number; articolo_chiave: string; prima: number; segni: number; righe: number }>;
    // le presenze delle macchine senza la loro valutazione durevole (una presenza copiata dalla 068 registrata senza associazione, se mai è
    // successo: per costruzione no, perché al più un acquisto per offerta porta il segno)
    const conArchivio = ['acquisto_legacy_valutazione', 'acquisto_legacy_associazione'].every(tabellaUtente);
    const senzaValutazione = conArchivio ? db.prepare(`SELECT p.partita_id, p.articolo_chiave, p.updated_at FROM utente.acquisto_partita p
      WHERE (${MACCHINE.map(() => 'p.articolo_chiave LIKE ?').join(' OR ')})
        AND NOT EXISTS (SELECT 1 FROM utente.acquisto_legacy_associazione a WHERE a.partita_id = p.partita_id AND a.articolo_chiave = p.articolo_chiave)
      ORDER BY p.partita_id, p.articolo_chiave`).all(...MACCHINE.map((m) => `${m}/%`)) as Array<{ partita_id: number; articolo_chiave: string; updated_at: string }> : [];
    if (senzaPresenza.length === 0 && senzaValutazione.length === 0) return;
    // le presenze nuove hanno bisogno dell'archivio della continuità (utente 030) e del file di gioco, per la valutazione
    if (!conArchivio) errore('manca l’archivio delle valutazioni degli acquisti (utente 030)');
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'articolo'").get()) errore('manca main.articolo, che serve alla valutazione');
    for (const p of senzaValutazione) nuovaValutazioneLegacy(db, p);
    if (senzaValutazione.length > 0) logger.warn({ migrazione: 'utente-072', valutate: senzaValutazione.map((p) => ({ partita: p.partita_id, articolo: p.articolo_chiave })) }, 'acquisti delle macchine: presenze senza valutazione durevole, valutate adesso');
    const create: Array<{ partita: number; articolo: string; righe: number; segno: string }> = [];
    const saltate: Array<{ partita: number; articolo: string; motivo: string }> = [];
    for (const o of senzaPresenza) {
      if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(o.articolo_chiave)) { saltate.push({ partita: o.partita_id, articolo: o.articolo_chiave, motivo: 'l’offerta non c’è nel file di gioco' }); continue; }
      const prima = db.prepare('SELECT creato_il FROM utente.registro_acquisti WHERE id = ?').pluck().get(o.prima) as string;
      db.prepare('INSERT INTO utente.acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(o.partita_id, o.articolo_chiave, prima);
      nuovaValutazioneLegacy(db, { partita_id: o.partita_id, articolo_chiave: o.articolo_chiave, updated_at: prima });
      // un solo acquisto per offerta porta il segno: quello che lo portava già (il più vecchio, se per un'anomalia erano più d'uno), altrimenti il più vecchio
      const titolare = (db.prepare('SELECT id FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? AND ottenuto_qui = 1 ORDER BY id LIMIT 1').pluck().get(o.partita_id, o.articolo_chiave) as number | undefined) ?? o.prima;
      db.prepare('UPDATE utente.registro_acquisti SET ottenuto_qui = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE partita_id = ? AND articolo_chiave = ?').run(titolare, o.partita_id, o.articolo_chiave);
      const segno = o.segni === 0 ? `all’acquisto ${titolare}` : o.segni === 1 ? `già dell’acquisto ${titolare}` : `${o.segni} acquisti lo portavano: resta all’acquisto ${titolare}`;
      if (o.segni > 1) logger.warn({ migrazione: 'utente-072', partita: o.partita_id, articolo: o.articolo_chiave, segni: o.segni, titolare }, 'acquisti delle macchine: più acquisti portavano il segno «ottenuto», resta al più vecchio');
      create.push({ partita: o.partita_id, articolo: o.articolo_chiave, righe: o.righe, segno });
    }
    // dopo: ogni offerta delle macchine con righe e nel file di gioco ha la sua presenza
    const restano = db.prepare(`SELECT COUNT(DISTINCT r.partita_id || char(0) || r.articolo_chiave) FROM utente.registro_acquisti r JOIN main.articolo a ON a.chiave = r.articolo_chiave
      WHERE (${MACCHINE.map(() => 'r.articolo_chiave LIKE ?').join(' OR ')})
        AND NOT EXISTS (SELECT 1 FROM utente.acquisto_partita p WHERE p.partita_id = r.partita_id AND p.articolo_chiave = r.articolo_chiave)`).pluck().get(...MACCHINE.map((m) => `${m}/%`)) as number;
    if (restano !== 0) errore(`${restano} offerte delle macchine restano senza presenza`);
    if (saltate.length > 0) logger.warn({ migrazione: 'utente-072', saltate }, 'acquisti delle macchine: offerte che non ci sono nel file di gioco, restano come sono');
    logger.info({ migrazione: 'utente-072', create }, 'acquisti delle macchine: presenze create con la loro valutazione');
  },
};
