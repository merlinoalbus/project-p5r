// ============================================================
// Migrazione 262 — il prezzo serale delle sfide della Big Bang Burger diventa un dato delle offerte (Ondata 5, Lotto E; decisioni 5 e 21)
// ============================================================
//
// Decisione 5 dell'utente: «le voci si collegano all'articolo della sfida; il prezzo serale di 500 yen è un dato dell'articolo; i 2.000 e
// 2.500 yen di giorno (14 e 15 agosto) vanno verificati in gioco». Prima di questa migrazione la sera viveva solo nella frase «Prezzo ridotto a
// 500 yen di sera» (effetto dei tre oggetti del catalogo `altro/sfida-*` e copia nelle offerte), e la spunta, il turno della sfida e l'anteprima
// scalavano sempre il prezzo di giorno (1.200 / 1.500 / 1.800).
//
// Che cosa fa, per ognuna delle tre offerte della Big Bang Burger (Comet, Gravity, Cosmo Tower):
//   (1) `prezzo_per_fascia_json` = { "sera": 500 } se l'offerta è nel listino in yen senza un prezzo per fascia salvato (uno diverso resta, e
//       l'audit lo dice). I prezzi di giorno non cambiano (decisione 5: da verificare in gioco);
//   (2) la frase «. Prezzo ridotto a 500 yen di sera» si toglie dall'effetto dell'oggetto del catalogo (solo se la scheda è della guida e il
//       testo è quello atteso) e dalla copia identica nell'offerta: il prezzo si legge dall'offerta, nella fascia della voce.
// Gli yen già mossi non cambiano (sono fotografati al gesto). Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente.
// Audit in `dati_guida.audit-262-big-bang-burger`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { improntaDiario, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-262-big-bang-burger';
const errore = (motivo: string): never => { throw new Error(`262: ${motivo}; nessuna modifica applicata.`); };
const SFIDE = ['comet-burger', 'gravity-burger', 'cosmo-tower-burger'].map((s) => ({ articolo: `big-bang-burger/sfida-${s}`, catalogo: `altro/sfida-${s}` }));
const SERA = JSON.stringify({ sera: 500 });
const PRIMA = 'Sfida della Big Bang Burger: gli esiti (vinta o persa), le Doti e i premi sono nella scheda dell’attività «Sfida Big Bang Burger». Prezzo ridotto a 500 yen di sera';
const DOPO = 'Sfida della Big Bang Burger: gli esiti (vinta o persa), le Doti e i premi sono nella scheda dell’attività «Sfida Big Bang Burger».';
const FONTE = 'Decisione 5 dell’utente (25/10/2026): il prezzo serale di 500 yen è un dato dell’articolo';

type Esito = { chiave: string; esito: string };

function prezzoDiSera(db: AppDatabase, articolo: string): Esito {
  const r = db.prepare('SELECT prezzo, costo_json, prezzo_per_fascia_json FROM main.articolo WHERE chiave = ?').get(articolo) as { prezzo: number | null; costo_json: string | null; prezzo_per_fascia_json: string | null } | undefined;
  if (!r) return { chiave: articolo, esito: 'offerta assente' };
  if (r.prezzo_per_fascia_json === SERA) return { chiave: articolo, esito: 'prezzo di sera già 500 ¥' };
  if (r.prezzo_per_fascia_json !== null) return { chiave: articolo, esito: `prezzo per fascia già salvato (${r.prezzo_per_fascia_json}): non toccato` };
  if (r.costo_json !== null) return { chiave: articolo, esito: 'offerta a scambio: nessun prezzo in yen da dare alla sera, non toccata' };
  if (db.prepare('UPDATE main.articolo SET prezzo_per_fascia_json = ?, updated_at = ? WHERE chiave = ? AND prezzo_per_fascia_json IS NULL AND costo_json IS NULL').run(SERA, new Date().toISOString(), articolo).changes !== 1) errore(`il prezzo di sera di ${articolo} non si scrive`);
  return { chiave: articolo, esito: `prezzo di sera: 500 ¥ (di giorno resta ${r.prezzo ?? 'non indicato'})` };
}

function fraseDelPrezzo(db: AppDatabase, s: (typeof SFIDE)[number]): Esito[] {
  const esiti: Esito[] = [];
  const o = db.prepare('SELECT effetto, origine FROM main.catalogo_oggetto WHERE chiave = ?').get(s.catalogo) as { effetto: string; origine: string } | undefined;
  if (!o) esiti.push({ chiave: s.catalogo, esito: 'oggetto assente' });
  else if (o.effetto === DOPO) esiti.push({ chiave: s.catalogo, esito: 'effetto già senza prezzo' });
  else if (o.effetto !== PRIMA || o.origine !== 'seed') esiti.push({ chiave: s.catalogo, esito: 'effetto diverso da quello atteso o corretto dall’utente: non toccato' });
  else {
    if (db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, updated_at = ? WHERE chiave = ? AND effetto = ? AND origine = 'seed'").run(DOPO, new Date().toISOString(), s.catalogo, PRIMA).changes !== 1) errore(`l’effetto di ${s.catalogo} non si aggiorna`);
    esiti.push({ chiave: s.catalogo, esito: 'effetto: tolta la frase del prezzo serale' });
  }
  if (db.prepare('UPDATE main.articolo SET effetto = ? WHERE chiave = ? AND effetto = ?').run(DOPO, s.articolo, PRIMA).changes) {
    esiti.push({ chiave: s.articolo, esito: 'copia dell’effetto: tolta la frase del prezzo serale (resta uguale al catalogo)' });
  }
  return esiti;
}

export const migration262: Migration = {
  id: 262,
  name: 'big_bang_burger_prezzo_di_sera',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !haColonna(db, 'articolo', 'prezzo_per_fascia_json')) { logger.warn({ migrazione: 262 }, 'colonna del prezzo per fascia assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = SFIDE.map((s) => prezzoDiSera(db, s.articolo));
    // la frase si toglie solo dove la sera è ormai un dato dell'offerta
    for (const s of SFIDE) {
      const ora = db.prepare('SELECT prezzo_per_fascia_json FROM main.articolo WHERE chiave = ?').pluck().get(s.articolo) as string | null | undefined;
      if (ora === SERA && esisteTabella(db, 'catalogo_oggetto')) esiti.push(...fraseDelPrezzo(db, s));
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      prezziDiSera: esiti.filter((e) => e.esito.startsWith('prezzo di sera: ')).length,
      frasiTolte: esiti.filter((e) => e.esito.startsWith('effetto: ') || e.esito.startsWith('copia dell')).length,
      nonToccati: esiti.filter((e) => /non toccat|assente/.test(e.esito)).length,
    };
    if (conteggi.prezziDiSera + conteggi.frasiTolte) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 262, { fonte: FONTE, conteggi, esiti });
    logger.info({ migrazione: 262, ...conteggi }, 'Big Bang Burger: prezzo di sera delle sfide come dato delle offerte');
  },
};
