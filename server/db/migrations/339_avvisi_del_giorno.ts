// ============================================================
// Migrazione 339 — avvisi del giorno: tolti i doppioni degli effetti strutturati, riscritti quelli che ne ripetono una parte (L8-02)
// ============================================================
//
// Voce di piano L8-02: i 227 giorni con avvisi (`giorno.avvisi_json`, 233 frasi) ripetevano in gran parte ciò che la scheda del giorno già
// mostra dai dati strutturati (le voci del Diario con il rango atteso, gli effetti, la trama, i vincoli, la riga «Giorno non coperto dalle
// fonti»). Il censimento frase per frase (revisione 2, validata) le divide in A (ripete per intero: si toglie), B (ripete una parte: si
// riscrive col resto), C (informazione propria: resta), D (dubbio: resta), più le 13 «A (trama/vincolo)», coperte solo da trama o vincoli
// (testo libero), che servono un sì a parte e restano. Decisione dell'utente: «Sì, procedi» (togliere i doppioni e rendere modificabili gli
// altri avvisi). L'elenco approvato è un dato esplicito (`avvisiDelGiorno339.ts`): 181 frasi A da togliere e 11 B da riscrivere.
//
// COSA (conservativa, idempotente): per ogni frase dell'elenco, al suo giorno e al suo indice nell'array di partenza, si scrive solo se il
// testo è ancora quello letto dal censimento, parola per parola; le frasi che non corrispondono restano come sono e si contano. Un giorno
// senza più avvisi resta con `[]`. Le frasi tolte e il testo di prima delle riscritte vanno nell'archivio `dati_guida.archivio-frasi-l11`
// (colonna `giorno.avvisi_json`, chiave «MM-GG[indice]»). Gli avvisi non sono voci né spunte: le altre colonne di `giorno`, `voce_giornata`
// e le spunte delle partite non cambiano (impronte prima e dopo). Il Diario validato fino al 1° giugno (voci e spunte) resta identico.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { AVVISI_339 } from './avvisiDelGiorno339.js';

/** Le tabelle di gioco che non devono cambiare. */
const INTATTE = ['voce_giornata', 'voce_effetto', 'evento_calendario'] as const;
const errore = (motivo: string): never => { throw new Error(`339: ${motivo}; nessuna modifica applicata.`); };

export const migration339: Migration = {
  id: 339,
  name: 'avvisi_del_giorno',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'giorno') || !haColonna(db, 'giorno', 'avvisi_json')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>([['giorno', improntaTabella(db, 'giorno', ['avvisi_json'])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const contaSpunte = (): number | null => {
      try { return db.prepare('SELECT COUNT(*) FROM utente.spunta_voce_partita').pluck().get() as number; } catch { return null; }
    };
    const spuntePrima = contaSpunte();

    // le frasi dell'elenco, per giorno
    const perGiorno = new Map<string, typeof AVVISI_339[number][]>();
    for (const a of AVVISI_339) perGiorno.set(a[1], [...(perGiorno.get(a[1]) ?? []), a]);
    const leggi = db.prepare('SELECT avvisi_json FROM main.giorno WHERE data = ?').pluck();
    const scrivi = db.prepare('UPDATE main.giorno SET avvisi_json = ? WHERE data = ? AND avvisi_json = ?');
    const archivio: Record<string, string> = {};
    const tolte: number[] = [], riscritte: number[] = [], nonCorrispondenti: Array<{ numero: number; data: string; indice: number }> = [];
    let giorniCambiati = 0;
    for (const [data, frasi] of perGiorno) {
      const json = leggi.get(data) as string | undefined;
      let avvisi: unknown;
      try { avvisi = json === undefined ? null : JSON.parse(json); } catch { avvisi = null; }
      if (!Array.isArray(avvisi)) { for (const f of frasi) nonCorrispondenti.push({ numero: f[0], data, indice: f[2] }); continue; }
      const nuovi: unknown[] = [];
      let cambiato = false;
      avvisi.forEach((testo, i) => {
        const f = frasi.find((x) => x[2] === i);
        if (!f || testo !== f[3]) { nuovi.push(testo); return; }
        archivio[`${data}[${i}]`] = f[3];
        cambiato = true;
        if (f.length === 5) { nuovi.push(f[4]); riscritte.push(f[0]); } else tolte.push(f[0]);
      });
      for (const f of frasi) if (avvisi[f[2]] !== f[3]) nonCorrispondenti.push({ numero: f[0], data, indice: f[2] });
      if (!cambiato) continue;
      if (scrivi.run(JSON.stringify(nuovi), data, json).changes !== 1) errore(`il giorno ${data} non si scrive`);
      giorniCambiati++;
    }

    if (Object.keys(archivio).length) {
      archiviaFrasi(db, 'L8-02 · 339', { 'giorno.avvisi_json': archivio }, { 'giorno.avvisi_json': { elenco: AVVISI_339.length, tolte: tolte.length, riscritte: riscritte.length, nonCorrispondenti: nonCorrispondenti.length, giorniCambiati } });
    }

    // le verifiche: le altre colonne di `giorno`, le voci, gli effetti, il calendario e le spunte identici
    if (improntaTabella(db, 'giorno', ['avvisi_json']) !== prima.get('giorno')) errore('le altre colonne di giorno sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (contaSpunte() !== spuntePrima) errore('le spunte delle partite sono cambiate');
    logger.info({ migrazione: 339, tolte: tolte.length, riscritte: riscritte.length, nonCorrispondenti: nonCorrispondenti.length, giorniCambiati },
      'avvisi del giorno: doppioni tolti e riscritti');
  },
};
