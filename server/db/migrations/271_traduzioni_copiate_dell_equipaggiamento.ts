// ============================================================
// Migrazione 271 — la copia dell'effetto dell'equipaggiamento nelle traduzioni si toglie: vale l'oggetto del catalogo (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 (a) dell'utente: un solo punto per il testo dell'effetto, «si tolgono le copie (articoli, traduzioni, descrizioni)». Censimento
// sulla copia alla 268: le 223 righe di `traduzione` dell'ambito `descrizioneOggetto` (chiave = descrizione inglese di `oggetto`, testo = la resa
// italiana) sono la sorgente da cui la migrazione 121 ha scritto `catalogo_oggetto.effetto` dell'equipaggiamento, e oggi ne sono copie identiche
// (223 su 223, nessuna corretta dall'utente). Ogni `oggetto` ha la sua scheda del catalogo, e la lettura preferisce già il catalogo
// (`compendioService`): correggere la traduzione non cambiava niente di visibile — un secondo punto che inganna. Dalla 271 la lettura usa solo
// il catalogo, e qui la copia si toglie.
//
// Conservativa:
//   - una riga della guida (`fonte = 'seed'`, senza la marca «creata dall'utente») si toglie solo se il suo testo è uguale all'effetto della
//     scheda del catalogo dell'equipaggiamento con quella descrizione;
//   - una riga corretta dall'utente (`fonte = 'utente'`) è il suo ultimo dato, che dopo la 271 nessuna lettura mostrerebbe più: se la scheda
//     ha ancora l'effetto della guida (mai corretto: la scheda è della guida, oppure la sua fotografia ha lo stesso effetto), la correzione
//     passa nell'effetto della scheda, come la scrive il modulo dell'oggetto (`origine = 'utente'`, fotografia della guida in `seed_json`, così
//     «Ripristina» rimette il testo della guida), e la riga si toglie; se l'utente ha corretto anche l'effetto della scheda, vale quello e la
//     traduzione resta (l'audit lo dice, e Impostazioni → Traduzioni la mostra ancora con il suo nome);
//   - una riga diversa dalla scheda e non corretta dall'utente resta, e l'audit lo dice.
// Sulle copie dei dati le righe corrette dall'utente sono 0. Le righe tolte, intere, stanno nell'audit `dati_guida.audit-271-traduzioni` (si
// possono rimettere). Nessuna voce del Diario cambia. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-271-traduzioni';
const AMBITO = 'descrizioneOggetto';
const errore = (motivo: string): never => { throw new Error(`271: ${motivo}; nessuna modifica applicata.`); };

interface RigaTraduzione { ambito: string; chiave: string; testo: string; extra_json: string | null; fonte: string; updated_at: string }
/** Le colonne della fotografia di una scheda, come le salva il modulo dell'oggetto (`catalogoOggettiScritture`). */
const COLONNE_SCHEDA = ['categoria', 'sottocategoria', 'nome', 'nomi_altri_json', 'nome_originale', 'effetto', 'descrizione', 'statistiche_json'] as const;
type Scheda = Record<(typeof COLONNE_SCHEDA)[number], string | null> & { chiave: string; effetto: string; origine: string; seed_json: string | null };

/** L'effetto della guida di una scheda: il suo, se la scheda non è mai stata corretta; quello della fotografia, se c'è; null se illeggibile. */
function effettoDellaGuida(s: Scheda): string | null {
  if (s.origine === 'seed' && s.seed_json === null) return s.effetto;
  if (s.seed_json === null) return null;
  try {
    const f = JSON.parse(s.seed_json) as { effetto?: unknown } | null;
    return f && typeof f.effetto === 'string' ? f.effetto : null;
  } catch { return null; }
}

export const migration271: Migration = {
  id: 271,
  name: 'traduzioni_copiate_dell_equipaggiamento',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['traduzione', 'oggetto', 'catalogo_oggetto']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 271, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const diarioPrima = improntaDiario(db);
    const righe = db.prepare('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM main.traduzione WHERE ambito = ? ORDER BY chiave').all(AMBITO) as RigaTraduzione[];
    // le schede del catalogo dell'equipaggiamento con quella descrizione (una descrizione = un oggetto: 223 distinte su 223)
    const schedeDi = db.prepare(`SELECT ${COLONNE_SCHEDA.map((c) => `c.${c}`).join(', ')}, c.chiave, c.origine, c.seed_json FROM main.oggetto o
      JOIN main.catalogo_oggetto c ON c.fonte_tipo = 'equipaggiamento' AND c.fonte_chiave = CAST(o.id AS TEXT) WHERE o.descrizione = ?`);
    const tolte: RigaTraduzione[] = [];
    const passate: Array<{ chiave: string; scheda: string; effettoPrima: string; effettoDopo: string }> = [];
    const rimaste: Array<{ chiave: string; motivo: string }> = [];
    for (const r of righe) {
      if (r.extra_json !== null) { rimaste.push({ chiave: r.chiave, motivo: 'riga creata dall’utente' }); continue; }
      const schede = schedeDi.all(r.chiave) as Scheda[];
      if (!schede.length) { rimaste.push({ chiave: r.chiave, motivo: 'nessuna scheda del catalogo per questa descrizione' }); continue; }
      if (r.fonte === 'utente') {
        if (schede.length !== 1) { rimaste.push({ chiave: r.chiave, motivo: 'traduzione corretta dall’utente con più schede per la stessa descrizione: non toccata' }); continue; }
        const s = schede[0]!;
        if (s.effetto !== r.testo) {
          const effettoGuida = effettoDellaGuida(s);
          if (effettoGuida === null || s.effetto !== effettoGuida) { rimaste.push({ chiave: r.chiave, motivo: 'traduzione corretta dall’utente, ma anche l’effetto della scheda è corretto dall’utente: vale la scheda, la traduzione resta' }); continue; }
          const foto = s.seed_json ?? JSON.stringify(Object.fromEntries(COLONNE_SCHEDA.map((c) => [c, s[c]])));
          if (db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, origine = 'utente', seed_json = ?, updated_at = ? WHERE chiave = ? AND effetto = ?")
            .run(r.testo, foto, new Date().toISOString(), s.chiave, s.effetto).changes !== 1) errore(`l'effetto della scheda ${s.chiave} non si aggiorna`);
          passate.push({ chiave: r.chiave, scheda: s.chiave, effettoPrima: s.effetto, effettoDopo: r.testo });
        }
      } else if (!schede.every((s) => s.effetto === r.testo)) { rimaste.push({ chiave: r.chiave, motivo: 'testo diverso dall’effetto della scheda del catalogo' }); continue; }
      if (db.prepare('DELETE FROM main.traduzione WHERE ambito = ? AND chiave = ? AND testo = ? AND fonte = ?').run(AMBITO, r.chiave, r.testo, r.fonte).changes !== 1) errore(`la traduzione ${r.chiave} non si toglie`);
      tolte.push(r);
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = { righe: righe.length, tolte: tolte.length, correzioniPassateAllaScheda: passate.length, rimaste: rimaste.length };
    if (tolte.length) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 271, { ambito: AMBITO, conteggi, tolte, passate, rimaste }, tolte.length);
    logger.info({ migrazione: 271, ...conteggi }, 'Traduzioni: tolta la copia dell’effetto dell’equipaggiamento (vale il catalogo)');
  },
};
