// ============================================================
// 201 — voce dell'11-19: tolti Moloch e la battaglia con Kasumi, che nessuna fonte conferma (L9, voce 11-19)
// ============================================================
//
// La voce `589d82e8…` (Palazzo di Sae Niijima, 19/11 giorno) diceva «… poi Sae Leviathan (attacchi elementali, resistente all'elemento corrente), Moloch
// (debole al Ghiaccio) e battaglia finale con Kasumi». Il boss Royal è uno solo (Shadow Niijima / Leviathan); Moloch non è nel Palazzo (assorbe il Fuoco ed è di
// Iweleth) e Kasumi entra nel gruppo molto dopo. Si riscrive con il testo dell'analisi dati (`lotti/L9/frasi-attivita-e-voce-1119-2026-10-24.md` §2.3),
// la nota («Trofeo: …») e il riferimento restano; il testo di prima è in `testo_precedente_json` e quello che c'era già lì in
// `dati_guida.archivio-correzioni-diario-l11`; `da_rivedere = 0`. Guardia sul testo attuale; già corretta: niente; diversa: si ferma.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const ARCHIVIO = 'archivio-correzioni-diario-l11';
const PREFISSO = '589d82e8';
const VECCHIO = 'Palazzo di Sae Niijima: battaglia contro l\'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (attacchi elementali, resistente all\'elemento corrente), Moloch (debole al Ghiaccio) e battaglia finale con Kasumi';
const NUOVO = 'Palazzo di Sae Niijima: battaglia contro l\'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (a ogni turno la roulette assegna un elemento: attacca con quello opposto)';
const errore = (motivo: string): never => { throw new Error(`201: ${motivo}; nessuna modifica applicata.`); };

export const migration201: Migration = {
  id: 201, name: 'voce_19_novembre_senza_moloch_kasumi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'dati_guida')) return;
    const voci = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${PREFISSO}%`) as Array<Record<string, unknown>>;
    if (voci.length === 0) return;
    if (voci.length > 1) errore(`${voci.length} voci cominciano con ${PREFISSO}`);
    const v = voci[0]!;
    if (v.azione === NUOVO) return;
    if (v.azione !== VECCHIO || v.data !== '11-19' || v.fascia !== 'giorno') errore(`la voce ${String(v.uid)} non è quella attesa del 19/11 giorno`);
    const altre = db.prepare('SELECT COUNT(*) FROM main.voce_giornata WHERE uid <> ?').pluck().get(v.uid) as number;

    const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO) as string | undefined;
    const blocco = esistente ? JSON.parse(esistente) as { voci?: Record<string, unknown> } : {};
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify({
      versione: 1, motivo: 'Correzioni Royal del Diario (L11, M-C, migrazioni 197/200/201): ciò che le colonne di prima non conservano e le divergenze fra fonti.',
      ...blocco, voci: { ...(blocco.voci ?? {}), [String(v.uid)]: { testoPrecedenteDiPrima: v.testo_precedente_json, motivoRevisione: v.motivo_revisione } } }));

    const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
    db.prepare('UPDATE main.voce_giornata SET azione = ?, da_rivedere = 0, motivo_revisione = NULL, testo_precedente_json = ?, updated_at = ? WHERE uid = ?')
      .run(NUOVO, precedente, new Date().toISOString(), v.uid);

    const dopo = db.prepare('SELECT azione, da_rivedere, data, fascia, ordine, note, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(v.uid) as Record<string, unknown>;
    if (dopo.azione !== NUOVO || dopo.da_rivedere !== 0 || dopo.data !== '11-19' || dopo.fascia !== 'giorno' || dopo.ordine !== v.ordine || dopo.note !== v.note || dopo.riferimento_chiave !== v.riferimento_chiave) errore('la voce non è come attesa dopo la modifica');
    if ((db.prepare('SELECT COUNT(*) FROM main.voce_giornata WHERE uid <> ?').pluck().get(v.uid) as number) !== altre) errore('il numero delle altre voci è cambiato');
    logger.info({ migrazione: 'L9-201', voce: String(v.uid) }, 'voce dell\'11-19 senza Moloch e Kasumi');
  },
};
