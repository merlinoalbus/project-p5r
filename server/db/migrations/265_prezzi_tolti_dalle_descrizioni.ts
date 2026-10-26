// ============================================================
// Migrazione 265 — i prezzi copiati nelle descrizioni del catalogo si tolgono: il prezzo si legge dall'offerta (Ondata 5, Lotto E)
// ============================================================
//
// Decisione 21 (a) dell'utente: un solo punto per ogni dato, «si tolgono le copie». La pagina dell'oggetto mostra la descrizione sotto «Che cosa
// fa» (`OggettoPage`) e le offerte con il loro prezzo poco sotto: le descrizioni di seed ripetevano il prezzo in 137 righe «Prezzo citato nella
// pagina Oggetti: N ¥.» e in parentesi come «(2.600¥, da 18 aprile)», «Televendite (9.980¥)», «(350 Monete)», «(30 punti negozio)», «(70 Fiori)».
//
// Che cosa toglie (`prezziOndata5.togliPrezziCopiati`), solo dalle schede della guida (`origine = 'seed'`; quelle corrette dall'utente restano):
//   - la riga «Prezzo citato…» quando il prezzo è quello di un'offerta visibile dell'oggetto, di un set delle televendite che lo contiene
//     (decisione 4: il set è l'offerta), o il valore della pagina Oggetti che la nota storica dichiara discordante (264: Homunculus 120.000,
//     Dango lunare 640, Agodashi oden 800);
//   - in parentesi, il prezzo in yen che ripete un'offerta, dopo «Televendite» quello di un set che contiene l'oggetto, e monete, punti o fiori
//     che ripetono il costo strutturato (261).
// Che cosa resta: i prezzi senza offerta (Oh! Shiruko, Stufato misterioso: la guida non dice in quale distributore; i 5 doppioni di un oggetto
// che ha l'offerta, finché le identità non si uniscono su un elenco approvato), gli sconti della Clinica di Takemi, i valori di rivendita dei
// tesori, le date e i luoghi. Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente. Audit con il prima e il tolto di ogni
// scheda in `dati_guida.audit-265-descrizioni`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_OGGETTI, improntaDiario, prezziDelleOfferte, scriviAudit, togliPrezziCopiati } from './prezziOndata5.js';
import { PREZZI_DISCORDANTI } from './264_note_storiche_dei_prezzi_discordanti.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-265-descrizioni';
const errore = (motivo: string): never => { throw new Error(`265: ${motivo}; nessuna modifica applicata.`); };

export const migration265: Migration = {
  id: 265,
  name: 'prezzi_tolti_dalle_descrizioni',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 265 }, 'catalogo o articoli assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    // la copia sbagliata della pagina Oggetti si toglie solo se la nota storica che la spiega c'è
    const conNota = (chiave: string) => esisteTabella(db, 'nota_storica') && !!db.prepare('SELECT 1 FROM main.nota_storica WHERE chiave = ?').get(chiave);
    const discordanti = new Map(PREZZI_DISCORDANTI.filter((p) => conNota(p.nota?.chiave ?? 'homunculus-prezzi-fonte')).map((p) => [p.catalogo, p.pagina]));
    const righe = db.prepare(`SELECT chiave, descrizione FROM main.catalogo_oggetto WHERE origine = 'seed'
      AND (descrizione LIKE '%¥%' OR descrizione LIKE '%Monete%' OR descrizione LIKE '%punti negozio%' OR descrizione LIKE '%Fiori)%') ORDER BY chiave`).all() as Array<{ chiave: string; descrizione: string }>;
    const aggiorna = db.prepare("UPDATE main.catalogo_oggetto SET descrizione = ?, updated_at = ? WHERE chiave = ? AND descrizione = ? AND origine = 'seed'");
    const corrette: Array<{ chiave: string; prima: string; dopo: string; tolti: string[] }> = [];
    const restanoConPrezzo: string[] = [];
    for (const r of righe) {
      const { testo, tolti } = togliPrezziCopiati(r.descrizione, { ...prezziDelleOfferte(db, r.chiave), discordante: discordanti.get(r.chiave) });
      if (/Prezzo citato/.test(testo)) restanoConPrezzo.push(r.chiave);
      if (!tolti.length || testo === r.descrizione) continue;
      if (aggiorna.run(testo, new Date().toISOString(), r.chiave, r.descrizione).changes !== 1) errore(`la descrizione di ${r.chiave} non si aggiorna`);
      corrette.push({ chiave: r.chiave, prima: r.descrizione, dopo: testo, tolti });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      schedeControllate: righe.length, schedeCorrette: corrette.length,
      righePrezzoCitatoTolte: corrette.reduce((s, c) => s + c.tolti.filter((t) => t.startsWith('Prezzo citato')).length, 0),
      prezziInParentesiTolti: corrette.reduce((s, c) => s + c.tolti.filter((t) => !t.startsWith('Prezzo citato')).length, 0),
      restanoConPrezzoCitato: restanoConPrezzo.length,
    };
    if (corrette.length) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 265, { fonte: FONTE_OGGETTI, conteggi, restanoConPrezzo, corrette });
    logger.info({ migrazione: 265, ...conteggi }, 'Catalogo: prezzi copiati tolti dalle descrizioni');
  },
};
