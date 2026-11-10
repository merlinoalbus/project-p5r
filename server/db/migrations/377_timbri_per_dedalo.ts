// ============================================================
// 377 — i timbri tornano al dedalo, come li dà la guida (L10-02, risposta dell'utente Q8 A)
// ============================================================
//
// La guida dà i timbri per DEDALO («ci sono ben 20 Timbri nell'area di KAITUL»), mai per area: il modello per area (099) non aveva un dato
// da contare (0 aree con un totale utilizzabile). Il totale torna nel dedalo: `dungeon_area.timbri_totale` (solo le righe dei Memento; null =
// la guida non dà un numero, niente da contare). `area_dedalo.timbri_totale` NON esce dallo schema: la legge la migrazione utente 020
// (registrata, `020_timbri_senza_totale.ts:24`), che gira dopo tutte le migrazioni di gioco su un `partite.db` nuovo o anteriore alla 020, e senza
// la colonna l'avvio si fermerebbe. I suoi valori vanno in archivio e la colonna resta a NULL in tutte le righe; nessun codice vivo la legge
// o la scrive. I raccolti delle partite passano dall'area al dedalo con la migrazione utente 070.
//
// I totali, dalla pagina di ogni dedalo (testo della guida, riga):
//   Aiyatsbus 8 («dedalo-di-aiyatsbus» r.202), Kaitul 20 («dedalo-di-kaitul» r.103), Akzeriyyuth 25 («dedalo-di-akzeriyyuth» r.88),
//   Adyeshach 30 («dedalo-di-adyeshach» r.79), Sheriruth 30 («dedalo-di-sheriruth» r.107), Da'at 40 («dedalo-di-daat» r.110).
// Le stesse cifre stanno nelle descrizioni dei sei dedali («N Timbri totali», da cui la 077 le leggeva): la frase esce dalla descrizione, con
// la descrizione originale in archivio, perché il dato non si ripeta; dove stava fra due parti della frase, al suo posto va un punto («…Area 4.
// Aver completato…»), dove la seguiva un punto e virgola (Da'at) non resta niente. Guardia: il dedalo c'è, è dei Memento e il totale è vuoto; una frase con
// un numero diverso da quello della guida è una discordanza: il totale non si scrive e la descrizione non si tocca (il verbale lo dice).
// Chemdah e Iweleth restano senza totale: la guida non dà un numero. Qimranut resta senza totale: le sue due aree avevano 0 (scritto
// dall'editor dopo la 101), ma la guida («dedalo-di-aiyatsbus» r.167) dice di tornare nelle due aree di Qimranut a raccoglierne, senza dire
// quanti; lo 0 va in archivio e il motivo nel verbale.
//
// La somma dei sei totali è 153; la guida dichiara 123 timbri in tutto («dedalo-di-daat» r.284, «tutti i 123 Timbri»; «circa 123» in «come-
// sconfiggere-jose» r.80, «più di 123» in «covo-dei-ladri» r.806 e «oggetti-chiave-essenziali» r.154), e per il premio «Timbri ovunque» del Covo
// ne chiede 150 («covo-dei-ladri» r.700: la sfida della 340 resta a 150, è il dato della guida per quel premio). Non si forza nulla: il blocco
// `dati_guida.timbri-dei-dedali` tiene la fonte di ogni totale (la scheda la mostra finché il totale è quello della guida), il motivo di chi non
// ne ha e il dichiarato con la sua fonte, che la scheda dei Memento mette accanto alla somma.
//
// Due voci di Trama ripetevano lo stesso dato, e la Trama conta nel completamento del dedalo, quindi i timbri contavano due volte:
// `mementos-02-aiyatsbus/2` «8 Timbri» (Area 1) e `mementos-09-daat/1` «123 Timbri totali (gioco completo)» (Area 1). Il dato ora sta nel
// totale del dedalo e, il 123, nel blocco dei dichiarati: le due voci escono, con la riga intera in archivio (colonna
// `punto_interesse.voci-dei-timbri`). Guardia per identità: chiave, tipo, nome, descrizione e area del dedalo attesi, e nessun legame (stato
// in una partita, divergenza, pin, oggetto, Ombra, Persona nelle aree, passo di un Enigma, confluenza, boss finale); altrimenti la voce resta
// e il verbale dice perché.
//
// COSA NON CAMBIA (impronte prima e dopo): le altre colonne di `dungeon_area` (la descrizione solo dei dedali dichiarati) e di `area_dedalo`,
// le altre voci della guida, il numero delle righe, il Cestino. Idempotente: un totale già scritto, una frase già tolta, totali delle aree già
// a NULL e un blocco già scritto si saltano. Verbale: `dati_guida.audit-l10-02-timbri-per-dedalo`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const MIGRAZIONE = 'L10-02 · 377';
const errore = (motivo: string): never => { throw new Error(`377: ${motivo}; nessuna modifica applicata.`); };

/** La chiave del blocco con le fonti dei totali e il dichiarato della guida (la stessa di `timbriService.BLOCCO_TIMBRI`, che lo legge). */
export const BLOCCO_TIMBRI = 'timbri-dei-dedali';

/** I totali della guida, dedalo per dedalo, con la pagina e la riga. */
export const TOTALI_DELLA_GUIDA: ReadonlyArray<{ dedalo: string; totale: number; fonte: string }> = [
  { dedalo: 'mementos-02-aiyatsbus', totale: 8, fonte: 'Guida, «Dedalo di Aiyatsbus», riga 202' },
  { dedalo: 'mementos-04-kaitul', totale: 20, fonte: 'Guida, «Dedalo di Kaitul», riga 103' },
  { dedalo: 'mementos-05-akzeriyyuth', totale: 25, fonte: 'Guida, «Dedalo di Akzeriyyuth», riga 88' },
  { dedalo: 'mementos-06-adyeshach', totale: 30, fonte: 'Guida, «Dedalo di Adyeshach», riga 79' },
  { dedalo: 'mementos-07-sheriruth', totale: 30, fonte: 'Guida, «Dedalo di Sheriruth», riga 107' },
  { dedalo: 'mementos-09-daat', totale: 40, fonte: 'Guida, «Dedalo di Da’at», riga 110' },
];

/** I dedali senza totale e il perché. */
export const SENZA_TOTALE: ReadonlyArray<{ dedalo: string; motivo: string }> = [
  { dedalo: 'mementos-01-qimranut', motivo: 'la guida non dà un numero: dice di tornare nelle due aree di Qimranut a raccoglierne («Dedalo di Aiyatsbus», riga 167), senza dire quanti' },
  { dedalo: 'mementos-03-chemdah', motivo: 'la guida non dà un numero' },
  { dedalo: 'mementos-08-iweleth', motivo: 'la guida non dà un numero' },
];

/** Il totale che la guida dichiara per tutti i Memento, con le altre forme in cui lo dice. */
export const DICHIARATI = {
  totale: 123, fonte: 'Guida, «Dedalo di Da’at», riga 284 («tutti i 123 Timbri dei Memento»)',
  altreFonti: ['Guida, «Come sconfiggere Jose», riga 80 («circa 123»)', 'Guida, «Covo dei Ladri», riga 806 («più di 123»)', 'Guida, «Oggetti chiave essenziali», riga 154 («più di 123»)'],
  // un'altra cifra della guida per tutti i Memento: è il dato del premio «Timbri ovunque» del Covo, la cui sfida conta fino a 150 (migrazione 340)
  altreCifre: [{ totale: 150, fonte: 'Guida, «Covo dei Ladri», riga 700 («raccogliendo un totale di 150 timbri nei Memento»: il premio «Timbri ovunque»)' }],
} as const;

/** Le due voci di Trama che ripetevano il dato dei timbri, com'erano attese (guardia per identità). */
export const VOCI_DEI_TIMBRI: ReadonlyArray<{ chiave: string; nome: string; descrizione: string; areaDedalo: string }> = [
  { chiave: 'mementos-02-aiyatsbus/2', nome: '8 Timbri', descrizione: '8 Timbri raccoglibili nell\'area, di solito sulla banchina di uscita.', areaDedalo: 'mementos-02-aiyatsbus-area-1' },
  { chiave: 'mementos-09-daat/1', nome: '123 Timbri totali (gioco completo)', areaDedalo: 'mementos-09-daat-area-1',
    descrizione: 'Il Dedalo di Da\'at porta il totale dei Timbri raccoglibili in tutti i Memento a 123; raccoglierli tutti permette lo scontro segreto con Jose.' },
];

/** I legami di una voce che ne impediscono l'uscita (tabella, colonna, schema); quelli di una tabella che non c'è non contano. */
const LEGAMI_DELLA_VOCE: ReadonlyArray<{ schema: 'main' | 'utente'; tabella: string; colonna: string }> = [
  { schema: 'utente', tabella: 'punto_partita', colonna: 'punto_chiave' }, { schema: 'utente', tabella: 'divergenza_partita', colonna: 'voce_chiave' },
  { schema: 'main', tabella: 'spillo_voce', colonna: 'voce_chiave' }, { schema: 'main', tabella: 'voce_oggetto', colonna: 'voce_chiave' },
  { schema: 'main', tabella: 'ombra_voce', colonna: 'voce_chiave' }, { schema: 'main', tabella: 'persona_area_dedalo', colonna: 'voce_chiave' },
  { schema: 'main', tabella: 'voce_confluenza', colonna: 'voce_chiave' }, { schema: 'main', tabella: 'voce_confluenza', colonna: 'voce_canonica' },
  { schema: 'main', tabella: 'punto_interesse', colonna: 'contenitore_chiave' }, { schema: 'main', tabella: 'dungeon', colonna: 'voce_boss_finale' },
];

/** Impronta (conteggio e SHA-256) delle voci della guida tranne quelle date. */
function improntaVoci(db: Parameters<Migration['up']>[0], tranne: readonly string[]): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT * FROM main.punto_interesse ORDER BY chiave').iterate() as Iterable<{ chiave: string }>) {
    if (tranne.includes(r.chiave)) continue;
    h.update(`${JSON.stringify(r)}\n`); n++;
  }
  return `${n}:${h.digest('hex')}`;
}

/** Le frasi «N Timbri totali» di una descrizione, col loro numero, il separatore che le precede («; ») e dove cominciano. */
const frasi = (descrizione: string): Array<{ testo: string; n: number; indice: number }> =>
  [...descrizione.matchAll(/;?\s*(\d+)\s+Timbri\s+totali/gi)].map((m) => ({ testo: m[0], n: Number(m[1]), indice: m.index ?? 0 }));

/**
 * La descrizione senza la frase: se dopo la frase viene un punto e virgola (Da'at, «…Piano 11; 40 Timbri totali; oltre…») la frase sparisce
 * e basta; se stava fra due parti del testo («…Area 4; 8 Timbri totali Aver completato…») al suo posto va un punto, perché le due parti non si
 * fondano in una («…Area 4. Aver completato…»); in testa o in coda sparisce.
 */
export function senzaLaFrase(descrizione: string, frase: { testo: string; indice: number }): string {
  const prima = descrizione.slice(0, frase.indice);
  const dopo = descrizione.slice(frase.indice + frase.testo.length);
  if (/^\s*;/.test(dopo) || prima.trim() === '' || dopo.trim() === '') return `${prima}${dopo}`;
  return `${prima.replace(/[\s.;,]+$/, '')}.${dopo}`;
}

export const migration377: Migration = {
  id: 377,
  name: 'timbri_per_dedalo',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dungeon_area')) { logger.warn({ migrazione: 'L10-02-377' }, 'manca la tabella dungeon_area: nulla da fare'); return; }
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const colonnaNuova = !haColonna(db, 'dungeon_area', 'timbri_totale');
    // `area_dedalo.timbri_totale` resta nello schema (la legge la migrazione utente 020, registrata): qui i valori vanno in archivio e a NULL
    const colonnaVecchia = esisteTabella(db, 'area_dedalo') && haColonna(db, 'area_dedalo', 'timbri_totale');

    // le impronte di prima: tutto tranne il totale (nuovo) e la descrizione (cambia solo dove esce la frase); le aree senza il loro totale
    const prima = {
      dedali: improntaTabella(db, 'dungeon_area', ['timbri_totale', 'descrizione']),
      aree: esisteTabella(db, 'area_dedalo') ? improntaTabella(db, 'area_dedalo', ['timbri_totale']) : null,
      cestino: esisteTabella(db, 'cestino') ? improntaTabella(db, 'cestino') : null,
    };
    const descrizioniPrima = new Map((db.prepare('SELECT chiave, descrizione FROM main.dungeon_area').all() as Array<{ chiave: string; descrizione: string }>).map((r) => [r.chiave, r.descrizione]));

    if (colonnaNuova) db.exec('ALTER TABLE main.dungeon_area ADD COLUMN timbri_totale INTEGER CHECK (timbri_totale IS NULL OR timbri_totale >= 0)');

    // i totali della guida e la frase che li ripeteva
    const scritti: Array<{ dedalo: string; totale: number }> = [];
    const frasiTolte: Array<{ dedalo: string; frase: string }> = [];
    const saltati: Array<{ dedalo: string; motivo: string }> = [];
    const archivioDescrizioni: Record<string, string> = {};
    const scriviTotale = db.prepare('UPDATE main.dungeon_area SET timbri_totale = ? WHERE chiave = ? AND timbri_totale IS NULL');
    const scriviDescrizione = db.prepare('UPDATE main.dungeon_area SET descrizione = ? WHERE chiave = ? AND descrizione = ?');
    for (const t of TOTALI_DELLA_GUIDA) {
      const d = db.prepare('SELECT chiave, dungeon_chiave, descrizione, timbri_totale FROM main.dungeon_area WHERE chiave = ?').get(t.dedalo) as
        { chiave: string; dungeon_chiave: string; descrizione: string; timbri_totale: number | null } | undefined;
      if (!d) { saltati.push({ dedalo: t.dedalo, motivo: 'il dedalo non c’è' }); continue; }
      if (d.dungeon_chiave !== 'mementos') { saltati.push({ dedalo: t.dedalo, motivo: 'non è un dedalo dei Memento' }); continue; }
      const nella = frasi(d.descrizione);
      const discordi = nella.filter((f) => f.n !== t.totale);
      if (discordi.length > 0) { saltati.push({ dedalo: t.dedalo, motivo: `la descrizione dice ${discordi.map((f) => f.n).join(', ')} timbri, la guida ${t.totale}: nulla si scrive` }); continue; }
      if (d.timbri_totale === null) {
        if (scriviTotale.run(t.totale, t.dedalo).changes !== 1) errore(`il totale di ${t.dedalo} non si scrive`);
        scritti.push({ dedalo: t.dedalo, totale: t.totale });
      }
      const totaleOra = d.timbri_totale ?? t.totale;
      // la frase esce solo se dice lo stesso numero del totale che vale (se l'utente ne ha scritto un altro, la frase resta e il verbale lo dice)
      if (nella.length === 1 && totaleOra === t.totale) {
        archivioDescrizioni[t.dedalo] = d.descrizione;
        const nuova = senzaLaFrase(d.descrizione, nella[0]);
        if (scriviDescrizione.run(nuova, t.dedalo, d.descrizione).changes !== 1) errore(`la descrizione di ${t.dedalo} non si aggiorna`);
        frasiTolte.push({ dedalo: t.dedalo, frase: nella[0].testo.replace(/^;\s*/, '') });
      } else if (nella.length > 1) saltati.push({ dedalo: t.dedalo, motivo: 'la frase compare più volte nella descrizione: non tolta' });
      else if (nella.length === 1) saltati.push({ dedalo: t.dedalo, motivo: `il totale salvato (${totaleOra}) non è quello della guida: la frase resta` });
    }
    if (Object.keys(archivioDescrizioni).length > 0) {
      archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'dungeon_area.descrizione', archivioDescrizioni);
      const presenti = righeArchiviate(db, 'dungeon_area.descrizione');
      if (!Object.keys(archivioDescrizioni).every((k) => k in presenti)) errore('l’archivio delle descrizioni dei dedali non ha tutte le righe');
    }

    // i totali delle aree (099): in archivio, poi a NULL in tutte le righe; la colonna NON si toglie, perché la migrazione utente 020
    // (registrata, `020_timbri_senza_totale.ts:24`) la legge e gira dopo le migrazioni di gioco su un `partite.db` nuovo o anteriore alla 020.
    // Le somme per dedalo restano nel verbale, accanto ai totali della guida
    const valoriAree: Record<string, number> = {};
    const sommeAree: Record<string, number> = {};
    let areeAzzerate = 0;
    if (colonnaVecchia) {
      for (const a of db.prepare('SELECT chiave, dedalo_chiave, timbri_totale FROM main.area_dedalo WHERE timbri_totale IS NOT NULL ORDER BY rowid').all() as Array<{ chiave: string; dedalo_chiave: string; timbri_totale: number }>) {
        valoriAree[a.chiave] = a.timbri_totale;
        sommeAree[a.dedalo_chiave] = (sommeAree[a.dedalo_chiave] ?? 0) + a.timbri_totale;
      }
      if (Object.keys(valoriAree).length > 0) {
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'area_dedalo.timbri_totale', valoriAree);
        const presenti = righeArchiviate(db, 'area_dedalo.timbri_totale');
        if (!Object.keys(valoriAree).every((k) => k in presenti)) errore('l’archivio dei totali delle aree non ha tutte le righe');
      }
      areeAzzerate = db.prepare('UPDATE main.area_dedalo SET timbri_totale = NULL WHERE timbri_totale IS NOT NULL').run().changes;
      if (areeAzzerate !== Object.keys(valoriAree).length) errore('i totali delle aree non sono stati azzerati tutti');
      if (db.prepare('SELECT COUNT(*) FROM main.area_dedalo WHERE timbri_totale IS NOT NULL').pluck().get() !== 0) errore('un’area ha ancora un totale di timbri');
    }

    // le due voci di Trama che ripetevano i timbri: escono solo se sono quelle attese e niente le lega
    const vociTolte: string[] = [];
    const vociRimaste: Array<{ chiave: string; motivo: string }> = [];
    if (esisteTabella(db, 'punto_interesse')) {
      const archivioVoci: Record<string, Record<string, unknown>> = {};
      for (const v of VOCI_DEI_TIMBRI) {
        const r = db.prepare('SELECT * FROM main.punto_interesse WHERE chiave = ?').get(v.chiave) as Record<string, unknown> | undefined;
        if (!r) continue;
        if (r.tipo !== 'trama' || r.nome !== v.nome || r.descrizione !== v.descrizione || r.area_dedalo_chiave !== v.areaDedalo) { vociRimaste.push({ chiave: v.chiave, motivo: 'la voce non è quella attesa' }); continue; }
        const legami = LEGAMI_DELLA_VOCE.filter((l) => db.prepare(`SELECT 1 FROM ${l.schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(l.tabella)
          && (l.schema === 'main' ? haColonna(db, l.tabella, l.colonna) : true)
          && db.prepare(`SELECT 1 FROM ${l.schema}.${l.tabella} WHERE ${l.colonna} = ? LIMIT 1`).get(v.chiave)).map((l) => `${l.tabella}.${l.colonna}`);
        if (legami.length > 0) { vociRimaste.push({ chiave: v.chiave, motivo: `la voce è legata (${legami.join(', ')})` }); continue; }
        archivioVoci[v.chiave] = r;
      }
      if (Object.keys(archivioVoci).length > 0) {
        const primaVoci = improntaVoci(db, Object.keys(archivioVoci));
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'punto_interesse.voci-dei-timbri', archivioVoci);
        const presenti = righeArchiviate(db, 'punto_interesse.voci-dei-timbri');
        if (!Object.keys(archivioVoci).every((k) => k in presenti)) errore('l’archivio delle voci dei timbri non ha tutte le righe');
        for (const k of Object.keys(archivioVoci)) {
          if (db.prepare('DELETE FROM main.punto_interesse WHERE chiave = ?').run(k).changes !== 1) errore(`la voce ${k} non si toglie`);
          vociTolte.push(k);
        }
        if (improntaVoci(db, []) !== primaVoci) errore('le altre voci della guida sono cambiate');
      }
    }

    // le fonti dei totali, i motivi e il dichiarato: un blocco solo, scritto una volta
    let bloccoScritto = false;
    if (!db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(BLOCCO_TIMBRI)) {
      const dedali = Object.fromEntries([
        // un dedalo saltato (discordanza, o non dei Memento) porta il motivo, che `timbri-non-dichiarati` dice quando il totale manca
        ...TOTALI_DELLA_GUIDA.map((t) => [t.dedalo, { totale: t.totale, fonte: t.fonte, motivo: saltati.find((s) => s.dedalo === t.dedalo)?.motivo ?? null }] as const),
        ...SENZA_TOTALE.map((s) => [s.dedalo, { totale: null, fonte: null, motivo: s.motivo }] as const),
      ]);
      const somma = TOTALI_DELLA_GUIDA.reduce((s, t) => s + t.totale, 0);
      db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(BLOCCO_TIMBRI, JSON.stringify({ versione: 1, migrazione: MIGRAZIONE, dedali, dichiarati: DICHIARATI, somma }));
      bloccoScritto = true;
    }

    // i controlli: cambia solo ciò che è dichiarato
    if (improntaTabella(db, 'dungeon_area', ['timbri_totale', 'descrizione']) !== prima.dedali) errore('le altre colonne di dungeon_area sono cambiate');
    if (prima.aree !== null && improntaTabella(db, 'area_dedalo', ['timbri_totale']) !== prima.aree) errore('le altre colonne di area_dedalo sono cambiate');
    if (prima.cestino !== null && improntaTabella(db, 'cestino') !== prima.cestino) errore('il Cestino è cambiato');
    const conFraseTolta = new Set(frasiTolte.map((f) => f.dedalo));
    for (const r of db.prepare('SELECT chiave, descrizione, timbri_totale, dungeon_chiave FROM main.dungeon_area').all() as Array<{ chiave: string; descrizione: string; timbri_totale: number | null; dungeon_chiave: string }>) {
      if (!descrizioniPrima.has(r.chiave)) errore(`il dedalo ${r.chiave} è nuovo`);
      if ((descrizioniPrima.get(r.chiave) !== r.descrizione) !== conFraseTolta.has(r.chiave)) errore(`la descrizione di ${r.chiave} è cambiata in modo non dichiarato`);
      if (r.timbri_totale !== null && r.dungeon_chiave !== 'mementos') errore(`${r.chiave} non è un dedalo e ha un totale di timbri`);
    }

    const cambiato = colonnaNuova || areeAzzerate > 0 || scritti.length > 0 || frasiTolte.length > 0 || bloccoScritto || vociTolte.length > 0;
    // i dedali e le voci saltati vanno sempre nel verbale, anche quando non si scrive altro
    if (!cambiato && saltati.length === 0 && vociRimaste.length === 0) return;
    registraAudit(db, 'audit-l10-02-timbri-per-dedalo', {
      migrazione: MIGRAZIONE, colonnaAggiunta: colonnaNuova ? 'dungeon_area.timbri_totale' : null, totaliDelleAreeAzzerati: areeAzzerate,
      colonnaDelleAreeTenuta: colonnaVecchia ? 'area_dedalo.timbri_totale (letta dalla migrazione utente 020, registrata): valori in archivio, colonna a NULL' : null,
      totaliScritti: scritti, frasiTolte, saltati, vociTolte, vociRimaste, senzaTotale: SENZA_TOTALE, totaliDelleAreeInArchivio: valoriAree, sommeDelleAree: sommeAree,
      sommaDeiTotali: TOTALI_DELLA_GUIDA.reduce((s, t) => s + t.totale, 0), dichiarati: DICHIARATI, bloccoScritto,
    });
    if (vociRimaste.length > 0 || saltati.length > 0) logger.warn({ migrazione: 'L10-02-377', vociRimaste, saltati }, 'timbri: dedali o voci saltati');
    logger.info({ migrazione: 'L10-02-377', scritti: scritti.length, frasiTolte: frasiTolte.length, saltati, areeInArchivio: Object.keys(valoriAree).length, vociTolte }, 'timbri: il totale è del dedalo');
  },
};
