// ============================================================
// Migrazione 329 — le regole dei dolci «se fidanzata» e dei giri choco del 15 febbraio; i cioccolatini di Ryuji e Sojiro restano senza regola
// ============================================================
//
// Domanda posta all'utente: «Nel gioco 10 Confidenti hanno 31 doni che arrivano "se fidanzata"… A questi si aggiungono i cioccolatini di Ryuji
// e Sojiro, che arrivano se il protagonista non è fidanzato… a) arrivano in automatico in base alla relazione registrata nella partita».
// Risposta: «Sì, in automatico». La 327 ha scritto la regola dei 9 pegni del 24 dicembre e dei 10 cioccolati del 14 febbraio; qui gli altri,
// con lo stesso vocabolario e lo stesso valutatore (`doniConfidenti.ts`: il dono vale finché la regola vale, nessuna copia).
//
// FONTI (lette il 2026-10-31):
//   - https://www.allgamestaff.it/persona-5-royal/oggetti/ — i dolci «se è la fidanzata del protagonista», senza giorno; i giri choco del 15
//     febbraio «se il Rango Confidente è al massimo e si è scelto di restare amici» (Sae: «rapporto di amicizia, Rango massimo»); Ryuji «se il
//     protagonista sceglie di non rispondere alle richieste della propria ragazza»; Sojiro «se il protagonista ha almeno una fidanzata con cui
//     non ha trascorso del tempo».
//   - https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/ — il 15 febbraio «riceveremo cioccolatini da tutte le nostre amiche»,
//     ciascuno solo con il Rango Confidente al massimo e la scelta di restare amici; il 14 febbraio le stesse condizioni di Ryuji e Sojiro.
//
// REGOLE (riconosciute dalla prima riga della nota, testo esatto; mai dal nome del Confidente):
//   (1) dolci, «Dono di X (se fidanzata)», di un Confidente romanzabile (`confidente.romanzabile = 1`, dal DB): [relazione romantica con quel
//       Confidente]. Il giorno non c'è nella guida: il dono vale da quando la relazione c'è, finché c'è. Attesi 10.
//   (2) giri choco, «Dono di X, 15 febbraio (rapporto di amicizia, Rango massimo)»: [Rango Confidente 10; dal 15 febbraio] e, per un
//       Confidente romanzabile, anche [non: relazione romantica con quel Confidente iniziata entro il 15 febbraio] («si è scelto di restare
//       amici»: al rango 10 un Confidente romanzabile senza relazione è un'amica; una relazione senza giorno registrato dà una condizione grigia,
//       quindi niente dono finché il giorno non si sa). Sae non è romanzabile: il rango e il giorno. Attesi 11 (10 + Sae).
//   (3) Ryuji e Sojiro: la guida Royal li lega ad AVERE una ragazza e a una scelta del 14 febbraio (non rispondere alle sue richieste, non passare
//       del tempo con lei), non all'essere senza fidanzata: il dato Royal documentato prevale. La scelta si fa alla spunta della voce del 14
//       febbraio (esiti dell'attività `san-valentino`, migrazione 331), che dà i due cioccolatini: qui non hanno una regola del dono (un dato
//       solo), e l'audit lo dice con le fonti.
// Una regola già uguale = «già scritta»; una diversa già scritta = non toccata (scritta da chi gioca). Numeri diversi da quelli attesi annullano
// la migrazione. Nessuna voce del Diario e nessuna partita si tocca (le ricevute non esistono: il dono si legge dalla regola). Conservativa,
// idempotente, dentro la transazione della migrazione. Audit in `dati_guida.audit-329-doni-dolci-giri-choco`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FONTE_OGGETTI, canonico, scriviAuditFbis, type Esito } from './fbisOndata5.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-329-doni-dolci-giri-choco';
const errore = (motivo: string): never => { throw new Error(`329: ${motivo}; nessuna modifica applicata.`); };
const FONTI = [FONTE_OGGETTI, 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/'];
/** «Dono di Ann (se fidanzata)»: il dolce, senza giorno. */
const DOLCE = /^Dono di [^,]+ \(se fidanzata\)$/;
/** «Dono di Ann, 15 febbraio (rapporto di amicizia, Rango massimo)»: i giri choco. */
const GIRI_CHOCO = /^Dono di .+, 15 febbraio \(rapporto di amicizia, Rango massimo\)$/;
const GIORNO_GIRI = '02-15';
/** Le prime righe di Ryuji e Sojiro (come le ha lasciate la 327): restano senza regola, con il motivo. */
const SENZA_REGOLA_DALLA_GUIDA: ReadonlyArray<string> = [
  'Dono di Ryuji, 14 febbraio (se il protagonista sceglie di non rispondere alle richieste della propria ragazza)',
  'Dono di Sojiro, 14 febbraio (se il protagonista ha almeno una fidanzata con cui non ha trascorso del tempo)',
];
const MOTIVO_RYUJI_SOJIRO = 'la guida Royal lo lega ad avere una ragazza e a con chi si passa il 14 febbraio (non rispondere alle sue richieste, non passare del tempo con lei): arriva dall’esito scelto alla spunta della voce di San Valentino (migrazione 331), non da una regola del dono';
const ATTESI = { dolci: 10, giriChoco: 11, senzaRegola: 2 } as const;

type Dono = { fonte_chiave: string; catalogo_chiave: string; nota: string | null; condizioni_json: string | null; romanzabile: number | null };

/** La regola validata con il vocabolario delle condizioni (stessa forma canonica, niente scartato). */
function valida(regola: RequisitoSpillo[], chi: string): string {
  const n = normalizzaCondizioniSpillo(regola);
  if (n.length !== regola.length || canonico(n) !== canonico(regola)) errore(`la regola del dono ${chi} non è valida`);
  return JSON.stringify(regola);
}

/** La regola di un dono riconosciuto, o null se il dono non è di questa migrazione. */
function regolaDi(d: Dono, riga: string): { tipo: 'dolci' | 'giriChoco'; regola: string } | null {
  const chi = `${d.fonte_chiave}:${d.catalogo_chiave}`;
  if (DOLCE.test(riga)) {
    if (d.romanzabile !== 1) errore(`il dolce ${chi} è di un Confidente non romanzabile`);
    return { tipo: 'dolci', regola: valida([{ tipo: 'relazione-romantica', confidente: d.fonte_chiave }], chi) };
  }
  if (GIRI_CHOCO.test(riga)) {
    const regola: RequisitoSpillo[] = [{ tipo: 'confidente', confidente: d.fonte_chiave, rango: 10 }];
    if (d.romanzabile === 1) regola.push({ tipo: 'non', condizione: { tipo: 'relazione-romantica', confidente: d.fonte_chiave, entro: GIORNO_GIRI } });
    regola.push({ tipo: 'data', dal: GIORNO_GIRI });
    return { tipo: 'giriChoco', regola: valida(regola, chi) };
  }
  return null;
}

/** Scrive la regola se il dono non ne ha; uguale = già scritta; diversa = non toccata. */
function scrivi(db: AppDatabase, d: Dono, regola: string): 'scritta' | 'già scritta' | 'diversa: non toccata' {
  if (d.condizioni_json !== null) return canonico(JSON.parse(d.condizioni_json)) === canonico(JSON.parse(regola)) ? 'già scritta' : 'diversa: non toccata';
  if (db.prepare("UPDATE main.ricompensa_oggetto SET condizioni_json = ? WHERE fonte_tipo = 'confidente' AND fonte_chiave = ? AND catalogo_chiave = ? AND condizioni_json IS NULL")
    .run(regola, d.fonte_chiave, d.catalogo_chiave).changes !== 1) errore(`la regola del dono ${d.fonte_chiave}:${d.catalogo_chiave} non si scrive`);
  return 'scritta';
}

export const migration329: Migration = {
  id: 329,
  name: 'doni_dolci_e_giri_choco',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'ricompensa_oggetto') || !haColonna(db, 'ricompensa_oggetto', 'condizioni_json') || !esisteTabella(db, 'confidente') || !haColonna(db, 'confidente', 'romanzabile')) {
      logger.warn({ migrazione: 329 }, 'ricompense, regola dei doni o Confidenti romanzabili assenti: niente da fare');
      return;
    }
    const doni = db.prepare(`SELECT r.fonte_chiave, r.catalogo_chiave, r.nota, r.condizioni_json, c.romanzabile
      FROM main.ricompensa_oggetto r LEFT JOIN main.confidente c ON c.chiave = r.fonte_chiave
      WHERE r.fonte_tipo = 'confidente' ORDER BY r.fonte_chiave, r.catalogo_chiave`).all() as Dono[];
    const senzaRegolaPrima = doni.filter((d) => d.condizioni_json === null).length;
    const esiti: Esito[] = [];
    const contati = { dolci: 0, giriChoco: 0, senzaRegola: 0 };
    const scritte = { dolci: 0, giriChoco: 0 }, giaScritte = { dolci: 0, giriChoco: 0 }, diverse = { dolci: 0, giriChoco: 0 };
    for (const d of doni) {
      const riga = (d.nota ?? '').split('\n')[0]!;
      const chiave = `dono:${d.fonte_chiave}:${d.catalogo_chiave}`;
      if (SENZA_REGOLA_DALLA_GUIDA.includes(riga)) {
        contati.senzaRegola += 1;
        esiti.push({ chiave, esito: d.condizioni_json === null ? `senza regola: ${MOTIVO_RYUJI_SOJIRO}` : 'ha già una regola (scritta da chi gioca): non toccata' });
        continue;
      }
      const r = regolaDi(d, riga);
      if (!r) continue;
      contati[r.tipo] += 1;
      const esito = scrivi(db, d, r.regola);
      if (esito === 'scritta') scritte[r.tipo] += 1; else if (esito === 'già scritta') giaScritte[r.tipo] += 1; else diverse[r.tipo] += 1;
      esiti.push({ chiave, esito: `${r.tipo === 'dolci' ? 'dolce' : 'giri choco'}: regola ${esito}` });
    }
    // i numeri della guida: 10 dolci, 11 giri choco (10 + Sae), i 2 cioccolatini di Ryuji e Sojiro; né più né meno
    for (const k of Object.keys(ATTESI) as Array<keyof typeof ATTESI>) if (contati[k] !== ATTESI[k]) errore(`${k}: ${contati[k]}, attesi ${ATTESI[k]}`);
    const senzaRegolaDopo = db.prepare("SELECT COUNT(*) FROM main.ricompensa_oggetto WHERE fonte_tipo = 'confidente' AND condizioni_json IS NULL").pluck().get() as number;
    const conteggi = { doni: doni.length, senzaRegolaPrima, senzaRegolaDopo, contati, scritte, giaScritte, diverse };
    const cambiato = scritte.dolci + scritte.giriChoco > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 329, { lotto: 'A1-dati', fonti: FONTI, conteggi, esiti, decisioneDellUtente: '«Sì, in automatico» (31/10)' }, cambiato);
    logger.info({ migrazione: 329, ...conteggi }, 'Doni dei Confidenti: dolci e giri choco dalla relazione romantica e dal rango');
  },
};
