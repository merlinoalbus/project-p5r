// ============================================================
// 088 — la Dote che un Confidente dà a ogni incontro è un dato del Confidente, rango per rango
// ============================================================
//
// Segnalato dall'utente (2026-09-30): «Tae Takemi passando dal rango 1 al rango 2 ricevo 1 nota di coraggio che
// non viene valutata». Alcuni Confidenti alzano una Dote a ogni incontro (Takemi il Coraggio, Yoshida e Ohya il
// Fascino, Iwai la Perizia, Shinya e Sojiro la Gentilezza, Hifumi la Conoscenza); la guida lo scriveva nelle note
// delle sue azioni, e la conversione 086 lo aveva reso un effetto «Dote» di quelle azioni: arrivava solo spuntandole,
// non segnando l'incontro dalla pagina Confidenti. Scelta dell'utente: la Dote arriva **da ogni incontro
// registrato**. Qui diventa un dato del Confidente: `confidente_dote_incontro` dice che cosa dà un incontro «verso»
// ciascun rango da 1 a 10 (quello che lo raggiunge e quelli prima), come voci di effetto (`shared/effettiCatalogo.ts`).
// Una tabella a sé e non `confidente_rango`: quella tiene i punti dei ranghi 1–9, mentre gli incontri valgono verso i
// ranghi 1–10 (il primo incontro vale verso il rango 1, l'ultimo di Yoshida verso il 10).
//
// I valori di partenza vengono dalle azioni della guida con un rango atteso (una per rango, nessun conflitto nel
// pacchetto), e da quelle azioni la Dote si toglie solo dopo averla scritta per il Confidente: la dà l'incontro, una
// volta sola. Le azioni senza rango atteso (lo studio con Makoto) restano come sono. Il dato finale lo corregge
// l'utente dalla scheda del Confidente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

interface Azione { tipo?: string; riferimento?: { tipo: string; chiave: string } | null; rangoAtteso?: number | null; produce?: Array<{ tipo: string; dote?: string; note?: number }> }

export const migration088: Migration = {
  id: 88,
  name: 'dote_a_ogni_incontro',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS confidente_dote_incontro (
      confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
      verso_rango       INTEGER NOT NULL CHECK (verso_rango BETWEEN 1 AND 10),
      effetti_json      TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (confidente_chiave, verso_rango)
    )`);
    const esiste = db.prepare('SELECT effetti_json FROM confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?');
    const scrivi = db.prepare('INSERT INTO confidente_dote_incontro (confidente_chiave, verso_rango, effetti_json) VALUES (?, ?, ?)');
    const confidente = db.prepare('SELECT 1 FROM confidente WHERE chiave = ?');
    const scriviGiorno = db.prepare('UPDATE giorno_percorso SET azioni_json = ? WHERE data = ?');
    let ranghi = 0;
    let azioni = 0;
    const saltate: string[] = [];
    for (const g of db.prepare('SELECT data, azioni_json FROM giorno_percorso ORDER BY ordine').all() as Array<{ data: string; azioni_json: string }>) {
      const lista = JSON.parse(g.azioni_json) as Azione[];
      let cambiato = false;
      for (const a of lista) {
        if (a.tipo !== 'confidente' || a.riferimento?.tipo !== 'confidente' || !a.rangoAtteso || !Array.isArray(a.produce)) continue;
        const doti = a.produce.filter((e) => e.tipo === 'dote' && e.dote && e.note);
        if (doti.length === 0) continue;
        const chiave = `${a.riferimento.chiave}/${a.rangoAtteso}`;
        // la Dote si toglie dall'azione solo se il Confidente la tiene (stesso valore): niente dato perso
        if (!confidente.get(a.riferimento.chiave) || a.rangoAtteso < 1 || a.rangoAtteso > 10) { saltate.push(`${g.data}: ${chiave}`); continue; }
        const voci = JSON.stringify(doti.map((d) => ({ effetto: { famiglia: 'dote', dote: d.dote, note: d.note } })));
        const gia = esiste.get(a.riferimento.chiave, a.rangoAtteso) as { effetti_json: string } | undefined;
        if (gia && gia.effetti_json !== voci) { saltate.push(`${g.data}: ${chiave}`); continue; }
        if (!gia) { scrivi.run(a.riferimento.chiave, a.rangoAtteso, voci); ranghi++; }
        a.produce = a.produce.filter((e) => !(e.tipo === 'dote' && e.dote && e.note));
        azioni++;
        cambiato = true;
      }
      if (cambiato) scriviGiorno.run(JSON.stringify(lista), g.data);
    }
    logger.info({ ranghi, azioni, saltate: saltate.length }, 'migrazione 088: la Dote a ogni incontro diventa un dato del Confidente');
    if (saltate.length) logger.warn({ saltate }, 'migrazione 088: Doti lasciate sulle azioni (Confidente o rango fuori catalogo, o Doti diverse per lo stesso rango)');
  },
};
