// ============================================================
// Migrazione 327 — le regole dei pegni del 24 dicembre e dei cioccolati del 14 febbraio, le note di Ryuji e Sojiro allineate alla guida
// (L13, ondata 11, lotto O11-2)
// ============================================================
//
// Domanda posta all'utente il 2026-10-31: «I doni "se fidanzata" arrivano da soli in base alla relazione registrata nella partita?». Risposta:
// «Sì, in automatico». Dopo O11-1 il valutatore unico conosce la relazione romantica della partita, con il giorno d'inizio (condizioni
// `relazione-romantica` e `relazioni-romantiche`, `utente.confidente_partita.relazione_romantica_dal`); i doni dei Confidenti si leggono dalla loro
// regola (`ricompensa_oggetto.condizioni_json`, colonna della 295) in `server/services/doniConfidenti.ts`: nessuna copia, il dono vale finché la
// regola vale (relazione tolta ⇒ il dono sparisce).
//
// FONTI (lette il 2026-10-31):
//   - https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/ — nove pegni d'amore del 24 dicembre, ciascuno «se è la fidanzata
//     del protagonista»; nessun pegno di Sumire.
//   - https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-35/ — la vigilia: un regalo diverso a seconda della persona con cui si esce
//     (una sola).
//   - https://www.allgamestaff.it/persona-5-royal/oggetti/ — i cioccolati del 14 febbraio «se è la fidanzata del protagonista»; Ryuji «se il
//     protagonista sceglie di non rispondere alle richieste della propria ragazza»; Sojiro «se il protagonista ha almeno una fidanzata con cui
//     non ha trascorso del tempo»; i dolci «se è la fidanzata del protagonista», senza data.
//   - https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/ — il 14/2 con una sola fidanzata si ricevono cioccolatini; con più
//     partner «ne pagheremo lo scotto».
//
// REGOLE.
//   (1) Ogni dono fonte «confidente» senza regola, di un Confidente romanzabile (`confidente.romanzabile = 1`, dal DB: nessun nome qui), la cui
//       prima riga della nota è esattamente «Dono di X, GG <mese> (se fidanzata)» riceve [relazione romantica con quel Confidente iniziata entro
//       il giorno; al più una relazione romantica iniziata entro il giorno («una sola fidanzata» della guida); dal giorno]. Il mese si legge da
//       una tabella dei mesi italiani. Attese: 9 righe del 24 dicembre e 10 del 14 febbraio = 19; un numero diverso annulla la migrazione. Una
//       regola già uguale = «già scritta»; diversa = non toccata.
//   (2) Le note di Ryuji e Sojiro dicevano «se il protagonista è senza fidanzata / non ha una fidanzata»: il dato Royal documentato prevale. Si
//       corregge SOLO la prima riga, solo se è esattamente quella attesa (come `correggiTesto` della 295; `ricompensa_oggetto` non ha
//       origine/seed), lasciando le righe successive (l'indirizzo della fonte). Nessuna regola: dipendono da con chi si passa San Valentino, che
//       la partita non registra.
//   (3) Dolci (senza data nella guida) e giri choco del 15 febbraio (rapporto di amicizia al Rango massimo: la scelta «restare amici» la partita
//       non la registra): nessuna modifica; nell'audit l'esito «senza regola» con il motivo.
// Nessuna voce del Diario ha un effetto con questi oggetti e nessuna partita li ha ricevuti (misura del 2026-10-31): niente doppio inventario,
// nessuna ricevuta da preservare; le partite non si toccano (solo `main`).
// Conservativa, idempotente, dentro la transazione della migrazione. Audit in `dati_guida.audit-327-doni-relazione`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FONTE_OGGETTI, FONTE_OGGETTI_CHIAVE, canonico, scriviAuditFbis, type Esito } from './fbisOndata5.js';
import { normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-327-doni-relazione';
const errore = (motivo: string): never => { throw new Error(`327: ${motivo}; nessuna modifica applicata.`); };
const FONTI = [
  FONTE_OGGETTI_CHIAVE,
  'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-35/',
  FONTE_OGGETTI,
  'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/',
];
/** La prima riga della nota di un dono legato alla relazione, con il giorno: «Dono di Ann, 24 dicembre (se fidanzata)». */
const SE_FIDANZATA_CON_GIORNO = /^Dono di .+, (\d{1,2}) ([a-z]+) \(se fidanzata\)$/;
/** I mesi italiani (calendario, non Confidenti). */
const MESI: Readonly<Record<string, string>> = {
  gennaio: '01', febbraio: '02', marzo: '03', aprile: '04', maggio: '05', giugno: '06',
  luglio: '07', agosto: '08', settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
};
/** Quante regole la guida dà per giorno (misura del 2026-10-31, confermata dalle fonti): 9 pegni e 10 cioccolati. */
const ATTESE: Readonly<Record<string, number>> = { '12-24': 9, '02-14': 10 };
/** Le prime righe da correggere: si riconoscono dal testo esatto, non dal Confidente. */
const NOTE: ReadonlyArray<{ prima: string; dopo: string }> = [
  { prima: 'Dono di Ryuji, 14 febbraio (se il protagonista è senza fidanzata)', dopo: 'Dono di Ryuji, 14 febbraio (se il protagonista sceglie di non rispondere alle richieste della propria ragazza)' },
  { prima: 'Dono di Sojiro, 14 febbraio (se il protagonista non ha una fidanzata)', dopo: 'Dono di Sojiro, 14 febbraio (se il protagonista ha almeno una fidanzata con cui non ha trascorso del tempo)' },
];
const NON_ROMANZABILE = 'Confidente non romanzabile nel DB';

type Dono = { fonte_chiave: string; catalogo_chiave: string; nota: string | null; condizioni_json: string | null; romanzabile: number | null };

/** Il motivo per cui un dono legato alla relazione resta senza regola (dalla prima riga della nota), o null se non lo è. */
function senzaRegola(riga: string): string | null {
  if (/^Dono di .+ \(se fidanzata\)$/.test(riga) && !/, \d{1,2} [a-z]+ \(se fidanzata\)$/.test(riga)) return 'dolce «se fidanzata» senza giorno nella guida: quando arriva non si sa';
  if (/rapporto di amicizia/.test(riga)) return 'giri choco del 15 febbraio: dipende dalla scelta «restare amici» al Rango massimo, che la partita non registra';
  if (/richieste della propria ragazza|almeno una fidanzata con cui non ha trascorso del tempo/.test(riga)) return 'dipende da con chi si passa San Valentino, che la partita non registra';
  return null;
}

/** La regola di un dono «se fidanzata» del giorno `giorno` (MM-GG), validata con il vocabolario delle condizioni. */
function regolaDel(confidente: string, giorno: string): string {
  const regola = [
    { tipo: 'relazione-romantica', confidente, entro: giorno },
    { tipo: 'relazioni-romantiche', al_piu: 1, entro: giorno },
    { tipo: 'data', dal: giorno },
  ];
  const normalizzata = normalizzaCondizioniSpillo(regola);
  if (normalizzata.length !== regola.length || canonico(normalizzata) !== canonico(regola)) errore(`la regola del dono di ${confidente} del ${giorno} non è valida`);
  return JSON.stringify(regola);
}

/** Corregge la sola prima riga della nota, se è esattamente `prima` (le righe successive restano). */
function correggiPrimaRiga(db: AppDatabase, d: Dono, prima: string, dopo: string): Esito {
  const chiave = `nota:${d.fonte_chiave}:${d.catalogo_chiave}`;
  const [riga, ...resto] = (d.nota ?? '').split('\n');
  if (riga === dopo) return { chiave, esito: 'già corretto' };
  if (riga !== prima) return { chiave, esito: 'testo diverso da quello atteso: non toccato' };
  if (db.prepare("UPDATE main.ricompensa_oggetto SET nota = ? WHERE fonte_tipo = 'confidente' AND fonte_chiave = ? AND catalogo_chiave = ? AND nota IS ?")
    .run([dopo, ...resto].join('\n'), d.fonte_chiave, d.catalogo_chiave, d.nota).changes !== 1) errore(`la nota ${chiave} non si aggiorna`);
  return { chiave, esito: 'corretto' };
}

export const migration327: Migration = {
  id: 327,
  name: 'doni_con_la_relazione_romantica',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'ricompensa_oggetto') || !haColonna(db, 'ricompensa_oggetto', 'condizioni_json') || !esisteTabella(db, 'confidente') || !haColonna(db, 'confidente', 'romanzabile')) {
      logger.warn({ migrazione: 327 }, 'ricompense, regola dei doni o Confidenti romanzabili assenti: niente da fare');
      return;
    }
    const doni = db.prepare(`SELECT r.fonte_chiave, r.catalogo_chiave, r.nota, r.condizioni_json, c.romanzabile
      FROM main.ricompensa_oggetto r LEFT JOIN main.confidente c ON c.chiave = r.fonte_chiave
      WHERE r.fonte_tipo = 'confidente' ORDER BY r.fonte_chiave, r.catalogo_chiave`).all() as Dono[];
    const esiti: Esito[] = [];
    const perGiorno = new Map<string, number>();
    const senza: Record<string, number> = {};
    const conta = (motivo: string) => { senza[motivo] = (senza[motivo] ?? 0) + 1; };
    let scritte = 0, giaScritte = 0, diverse = 0;
    for (const d of doni) {
      const riga = (d.nota ?? '').split('\n')[0]!;
      const chiave = `dono:${d.fonte_chiave}:${d.catalogo_chiave}`;
      // (2) le note di Ryuji e Sojiro (testo esatto, prima o dopo la correzione)
      const nota = NOTE.find((n) => n.prima === riga || n.dopo === riga);
      if (nota) {
        esiti.push(correggiPrimaRiga(db, d, nota.prima, nota.dopo));
        const motivo = senzaRegola(nota.dopo)!;
        conta(motivo);
        esiti.push({ chiave, esito: `senza regola: ${motivo}` });
        continue;
      }
      // (1) i doni «se fidanzata» con il giorno
      const m = SE_FIDANZATA_CON_GIORNO.exec(riga);
      const mese = m ? MESI[m[2]!] : undefined;
      if (m && mese) {
        if (d.romanzabile !== 1) { conta(NON_ROMANZABILE); esiti.push({ chiave, esito: `senza regola: ${NON_ROMANZABILE}` }); continue; }
        const giorno = `${mese}-${m[1]!.padStart(2, '0')}`;
        perGiorno.set(giorno, (perGiorno.get(giorno) ?? 0) + 1);
        const regola = regolaDel(d.fonte_chiave, giorno);
        if (d.condizioni_json !== null) {
          const uguale = canonico(JSON.parse(d.condizioni_json)) === canonico(JSON.parse(regola));
          if (uguale) giaScritte++; else diverse++;
          esiti.push({ chiave, esito: uguale ? 'regola già scritta' : 'regola diversa già scritta: non toccata' });
          continue;
        }
        if (db.prepare("UPDATE main.ricompensa_oggetto SET condizioni_json = ? WHERE fonte_tipo = 'confidente' AND fonte_chiave = ? AND catalogo_chiave = ? AND condizioni_json IS NULL")
          .run(regola, d.fonte_chiave, d.catalogo_chiave).changes !== 1) errore(`la regola del dono ${chiave} non si scrive`);
        scritte++;
        esiti.push({ chiave, esito: `regola: relazione romantica con il Confidente iniziata entro il ${giorno}, al più una relazione iniziata entro il ${giorno}, dal ${giorno}` });
        continue;
      }
      // (3) dolci e giri choco; un dono che ha già la sua regola (la 295) o che non riguarda la relazione resta fuori
      if (d.condizioni_json !== null) continue;
      const motivo = senzaRegola(riga);
      if (motivo) { conta(motivo); esiti.push({ chiave, esito: `senza regola: ${motivo}` }); }
    }
    // i numeri della guida: 9 pegni del 24 dicembre e 10 cioccolati del 14 febbraio, né più né meno
    for (const g of new Set([...Object.keys(ATTESE), ...perGiorno.keys()])) {
      if ((perGiorno.get(g) ?? 0) !== (ATTESE[g] ?? 0)) errore(`doni «se fidanzata» del ${g}: ${perGiorno.get(g) ?? 0}, attesi ${ATTESE[g] ?? 0}`);
    }
    const note = esiti.filter((e) => e.chiave.startsWith('nota:'));
    const conteggi = {
      regoleScritte: scritte, regoleGiaScritte: giaScritte, regoleDiverseNonToccate: diverse,
      noteCorrette: note.filter((e) => e.esito === 'corretto').length,
      noteGiaCorrette: note.filter((e) => e.esito === 'già corretto').length,
      noteNonToccate: note.filter((e) => e.esito.startsWith('testo diverso')).length,
      senzaRegolaPerMotivo: senza,
    };
    const cambiato = conteggi.regoleScritte + conteggi.noteCorrette > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 327, { lotto: 'L13-ondata-11-O11-2', fonti: FONTI, conteggi, esiti, decisioneDellUtente: '«Sì, in automatico» (31/10)' }, cambiato);
    logger.info({ migrazione: 327, ...conteggi }, 'Doni dei Confidenti legati alla relazione romantica');
  },
};
