// ============================================================
// Migrazione 249 — le frequenze di rifornimento tolte dalle descrizioni del catalogo (Ondata 5, Lotto B; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (26 ottobre): le raccomandazioni del progetto si applicano e «non sono d'accordo nel rimandare attività a fasi successive».
// Decisione 2 del progetto: un dato in un solo punto, la prosa si toglie quando il dato è strutturato. Dalla 243 la regola di rifornimento e
// i pezzi per ciclo di ogni offerta sono `articolo.rifornimento_json` e `articolo.quantita`; le descrizioni del catalogo («dove si trova»)
// ripetevano a parole «1 al giorno», «3 a settimana», «1 al mese», «max 5 al giorno», «3 unità, rifornimento il 1° del mese successivo»,
// talvolta in contrasto con la regola della guida (i materiali di Akiba: «3 a settimana» contro «il giorno successivo» dell'Elenco dei
// negozi; la Crostatina angelo alla Panetteria Yon-Germain contro il Taisho Store, vedi la nota storica della 246).
//
// Si toglie SOLO la frequenza, frammento per frammento (elenco esatto qui sotto, censito sulle 37 descrizioni visibili che la contengono):
// luoghi, date, prezzi e il resto della frase restano com'erano (i prezzi in prosa sono del Lotto E). Per la Crostatina angelo il luogo è
// quello dell'Elenco dei negozi (Taisho Store, solo d'inverno: le sue condizioni); la Panetteria Yon-Germain resta nella nota storica.
//
// Conservativa: una descrizione cambia solo se contiene il frammento atteso esattamente una volta; già senza frammento si lascia (già
// corretta, idempotente); il frammento assente o ripetuto lascia la descrizione com'è e l'audit lo dice (un dato salvato non cambia in
// silenzio). Nessuna voce del Diario cambia (impronta controllata). Audit con il prima e il dopo in `dati_guida.audit-249-frequenze`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAudit } from './rifornimentoOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-249-frequenze';
const errore = (motivo: string): never => { throw new Error(`249: ${motivo}; nessuna modifica applicata.`); };

interface Frammento { chiave: string; prima: string; dopo: string }
const F = (chiave: string, prima: string, dopo: string): Frammento => ({ chiave, prima, dopo });

/** Il frammento esatto di ogni descrizione e il suo sostituto (la frequenza tolta, il resto intatto). */
export const FRAMMENTI: readonly Frammento[] = [
  F('consumabile/sandwich-inzuppato', '(giorni di pioggia, 1 al giorno)', '(giorni di pioggia)'),
  F('consumabile/cioccolato-osechi', '(da 13 gennaio, 1 a settimana)', '(da 13 gennaio)'),
  F('consumabile/goccia-dellanima', '(15 Fiori, max 5 al giorno)', '(15 Fiori)'),
  F('consumabile/beni-azuma', '(da 9 ottobre, 1 al giorno)', '(da 9 ottobre)'),
  F('consumabile/yaki-imo-leggendario', '(inverno, 1 a settimana)', '(inverno)'),
  F('consumabile/anima-da-masticare', '(170 Fiori, 1 al giorno)', '(170 Fiori)'),
  F('consumabile/kit-energetico-s', '(80 Fiori, 2 al giorno)', '(80 Fiori)'),
  F('consumabile/kit-energetico-l', '(210 Fiori, 1 al giorno)', '(210 Fiori)'),
  F('consumabile/pane-per-lanima', '(450 Fiori, 1 al giorno)', '(450 Fiori)'),
  F('consumabile/soma', '(520 Fiori, 1 al giorno)', '(520 Fiori)'),
  F('consumabile/melon-pan', '(estate, 1 a settimana)', '(estate)'),
  F('consumabile/crostatina-angelo', 'Panetteria Yon-Germain (inverno, 1 a settimana); Supermercato Taisho Store', 'Supermercato Taisho Store (inverno)'),
  F('consumabile/pane-autunnale', "(venerdì d'autunno, 1 a settimana)", "(venerdì d'autunno)"),
  F('consumabile/soba-calmante', '(estate, 1 a settimana)', '(estate)'),
  F('consumabile/frullato-iperproteico', '(giorni di pioggia, 1 al giorno)', '(giorni di pioggia)'),
  F('consumabile/proteine-dimportazione', '(da 5 giugno, 1 al mese)', '(da 5 giugno)'),
  F('consumabile/agodashi-oden', '(inverno, 1 a settimana)', '(inverno)'),
  F('consumabile/natto-rugiadoso', '(giorni di pioggia, 1 al giorno)', '(giorni di pioggia)'),
  F('consumabile/panino-con-yakisoba', '(venerdì, 1 a settimana)', '(venerdì)'),
  F('consumabile/olio-del-recupero', 'Body Chop (1 a settimana); ', 'Body Chop; '),
  F('consumabile/aroma-rinfrescante', '(autunno, 1 a settimana)', '(autunno)'),
  F('consumabile/rasetsu-ofuda', '(70 Fiori, 5 al giorno)', '(70 Fiori)'),
  F('consumabile/idaten-ofuda', '(70 Fiori, 5 al giorno)', '(70 Fiori)'),
  F('consumabile/kongou-ofuda', '(70 Fiori, 5 al giorno)', '(70 Fiori)'),
  F('chiave/cesta-di-vestiti', '(50 punti negozio, acquistabile una volta al giorno, stock rinnovato il giorno dopo)', '(50 punti negozio)'),
  F('materiale/gomitolo-di-seta', '(1.150¥, da 18 aprile, 3 a settimana)', '(1.150¥, da 18 aprile)'),
  F('materiale/pergamena-spessa', '(1.900¥, da 18 aprile, 3 a settimana)', '(1.900¥, da 18 aprile)'),
  F('materiale/fibbia-di-latta', '(2.050¥, da 18 aprile, 3 a settimana)', '(2.050¥, da 18 aprile)'),
  F('materiale/balsamo-vegetale', '(2.600¥, da 18 aprile, 2 a settimana)', '(2.600¥, da 18 aprile)'),
  F('materiale/sughero', '(2.900¥, da 18 aprile, 2 a settimana)', '(2.900¥, da 18 aprile)'),
  F('materiale/sabbia-ferrea', '(3.350¥, da 1° settembre, 3 a settimana)', '(3.350¥, da 1° settembre)'),
  F('materiale/lente-condensante', '(3.600¥, da 1° settembre, 3 a settimana)', '(3.600¥, da 1° settembre)'),
  F('materiale/foglio-dalluminio', '(4.400¥, da 1° settembre, 2 a settimana)', '(4.400¥, da 1° settembre)'),
  F('materiale/cuoio-conciato', '(4.800¥, da 1° settembre, 3 a settimana)', '(4.800¥, da 1° settembre)'),
  F('materiale/fosforo-rosso', '(6.250¥, da 1° settembre, 2 a settimana)', '(6.250¥, da 1° settembre)'),
  F('materiale/mercurio', '(6.600¥, da 1° ottobre, 1 a settimana)', '(6.600¥, da 1° ottobre)'),
  F('materiale/roccia-nera', '(4.000¥, 3 unità, rifornimento il 1° del mese successivo)', '(4.000¥)'),
];

/** Le occorrenze di `ago` in `testo`. */
const occorrenze = (testo: string, ago: string): number => testo.split(ago).length - 1;

export const migration249: Migration = {
  id: 249,
  name: 'frequenze_nelle_descrizioni',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 249 }, 'catalogo assente: nessuna descrizione toccata'); return; }
    const diarioPrima = improntaDiario(db);
    const leggi = db.prepare('SELECT descrizione FROM main.catalogo_oggetto WHERE chiave = ?');
    const scrivi = db.prepare('UPDATE main.catalogo_oggetto SET descrizione = ? WHERE chiave = ? AND descrizione = ?');
    const esiti: Array<{ chiave: string; esito: string; prima?: string; dopo?: string }> = [];
    let corrette = 0;
    for (const f of FRAMMENTI) {
      const r = leggi.get(f.chiave) as { descrizione: string } | undefined;
      if (!r) { esiti.push({ chiave: f.chiave, esito: 'oggetto assente' }); continue; }
      const n = occorrenze(r.descrizione, f.prima);
      if (n === 0) { esiti.push({ chiave: f.chiave, esito: r.descrizione.includes(f.dopo) ? 'già senza frequenza' : 'frammento atteso assente: non toccata' }); continue; }
      if (n > 1) { esiti.push({ chiave: f.chiave, esito: `frammento atteso ripetuto ${n} volte: non toccata` }); continue; }
      const dopo = r.descrizione.replace(f.prima, f.dopo);
      if (scrivi.run(dopo, f.chiave, r.descrizione).changes !== 1) errore(`la descrizione di ${f.chiave} non si aggiorna`);
      corrette++;
      esiti.push({ chiave: f.chiave, esito: 'frequenza tolta', prima: r.descrizione, dopo });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    if (corrette) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 249, { conteggi: { frammenti: FRAMMENTI.length, corrette }, esiti });
    logger.info({ migrazione: 249, corrette }, 'Catalogo: frequenze di rifornimento tolte dalle descrizioni');
  },
};
