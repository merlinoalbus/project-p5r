import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';

const NEGOZIO = 'negozio-palazzo-niijima';
const AUDIT = 'rettifica-banchi-niijima-134';
const PRIMA_ARTICOLO = '[{"tipo":"intervallo","dal":"10-29","al":"11-20"}]';
const ORARI = '{"giorni":[],"fasce":[],"chiusoConPioggia":false,"nota":"solo durante l’esplorazione del Palazzo"}';
const DOPO_NEGOZIO = JSON.stringify([
  { tipo: 'finestra-palazzo', dungeon: 'niijima' },
  { tipo: 'non', condizione: { tipo: 'palazzo', dungeon: 'niijima' } },
  { tipo: 'gruppo', modo: 'almeno-una', condizioni: [
    { tipo: 'evento', evento: 'niijima-banco-soci-accessibile' },
    { tipo: 'evento', evento: 'niijima-banco-alte-accessibile' },
  ] },
]);
const ARTICOLI = [
  ['soma', 'soci'], ['catena-di-perline', 'soci'], ['tessera-puntate-alte', 'soci'],
  ['raggio-della-vittoria', 'alte'], ['bracciale-confuso', 'alte'], ['pend-disperazione', 'alte'],
].map(([suffisso, banco]) => ({
  chiave: `${NEGOZIO}/${suffisso}`,
  dopo: JSON.stringify([{ tipo: 'evento', evento: `niijima-banco-${banco}-accessibile` }]),
}));
const CHIAVI_ARTICOLI = new Set(ARTICOLI.map(a => a.chiave));
type Riga = Record<string, unknown>;
type Esito = 'applicata' | 'gia-corretta' | 'assente' | 'esclusa';
const oggetto = (x: unknown): x is Riga => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Copertura conservativa del registro di gioco, senza leggere il cestino delle partite o esportare fotografie.
 * Una fotografia pertinente, anche corretta, esclude tutto il blocco: non si riscrive la sua provenienza. */
function coperturaCestino(db: AppDatabase): { leggibile: boolean; registri: number; passi: number; pertinenti: number } {
  const esito = { leggibile: true, registri: 0, passi: 0, pertinenti: 0 };
  const campi = (db.prepare('SELECT name FROM pragma_table_info(?, ?)').all('cestino', 'main') as Array<{ name: string }>).map(c => c.name);
  if (!campi.includes('id') || !campi.includes('registro_json')) return { ...esito, leggibile: false };
  for (const r of db.prepare('SELECT registro_json FROM main.cestino ORDER BY id').iterate() as Iterable<{ registro_json: unknown }>) {
    esito.registri++;
    let passi: unknown;
    try { passi = typeof r.registro_json === 'string' ? JSON.parse(r.registro_json) as unknown : null; }
    catch { passi = null; }
    if (!Array.isArray(passi)) { esito.leggibile = false; continue; }
    const sequenze = new Set<number>();
    for (const p of passi) {
      esito.passi++;
      if (!oggetto(p) || !Number.isSafeInteger(p.seq) || Number(p.seq) < 0 || sequenze.has(Number(p.seq))
        || typeof p.tabella !== 'string' || !p.tabella || (p.op !== 'D' && p.op !== 'U' && p.op !== 'I')) {
        esito.leggibile = false; continue;
      }
      sequenze.add(Number(p.seq));
      const struttura = db.prepare('SELECT name,pk FROM pragma_table_info(?, ?) ORDER BY pk').all(p.tabella, 'main') as Array<{ name: string; pk: number }>;
      if (!struttura.length) { esito.leggibile = false; continue; }
      const pk = struttura.filter(c => c.pk > 0).map(c => c.name);
      const identita = pk.length ? pk : ['rowid'];
      const lati = p.op === 'D' ? ['prima'] : p.op === 'I' ? ['dopo'] : ['prima', 'dopo'];
      if ((p.op === 'D' && Object.hasOwn(p, 'dopo')) || (p.op === 'I' && Object.hasOwn(p, 'prima'))) esito.leggibile = false;
      let pertinente = false;
      for (const lato of lati) {
        const riga = p[lato];
        if (!oggetto(riga) || identita.some(c => !Object.hasOwn(riga, c)
          || (typeof riga[c] !== 'string' && !(typeof riga[c] === 'number' && Number.isSafeInteger(riga[c]))))) {
          esito.leggibile = false; continue;
        }
        if (p.tabella === 'negozio') {
          if (typeof riga.chiave !== 'string') esito.leggibile = false;
          if (riga.chiave === NEGOZIO || riga.listino_condiviso === NEGOZIO) pertinente = true;
        } else if (p.tabella === 'articolo') {
          if (typeof riga.chiave !== 'string' || typeof riga.negozio_chiave !== 'string') esito.leggibile = false;
          if (CHIAVI_ARTICOLI.has(String(riga.chiave)) || riga.negozio_chiave === NEGOZIO
            || (typeof riga.articolo_condiviso === 'string' && CHIAVI_ARTICOLI.has(riga.articolo_condiviso))) pertinente = true;
        } else if (p.tabella === 'negozio_luogo_extra' || p.tabella === 'negozio_sede_spillo') {
          if (typeof riga.negozio_chiave !== 'string') esito.leggibile = false;
          if (riga.negozio_chiave === NEGOZIO) pertinente = true;
        }
      }
      if (pertinente) esito.pertinenti++;
    }
  }
  return esito;
}

/** N14: due banchi osservati, finestra unica del Palazzo e chiusura dopo la sua conclusione.
 * Nessuna data d'itinerario, Tessera, acquisto o altro banco viene trasformato in un fatto della partita. */
export const migration134: Migration = {
  id: 134, name: 'banchi_niijima',
  up(db) {
    db.transaction(() => {
      if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT)) return;
      const registra = (esito: Esito, motivo: string, modificate: string[] = [], copertura: ReturnType<typeof coperturaCestino> | null = null) => {
        const changes = db.prepare('INSERT INTO main.dati_guida (chiave,json) VALUES (?,?)').run(AUDIT, JSON.stringify({
          versione: 1, negozio: NEGOZIO, articoli: ARTICOLI.map(a => a.chiave), esito, motivo, modificate, copertura,
          fonti: ['https://www.allgamestaff.it/persona-5-royal/palazzo-di-sae/', 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/'],
          ambito: 'Sette righe atomiche; sole condizioni. Note, fotografie, listini, articoli del Catalogo e progressi non modificati.',
        })).changes;
        if (changes !== 1) throw new Error('134: rendiconto non registrato, transazione annullata.');
      };
      const n = db.prepare('SELECT * FROM main.negozio WHERE chiave = ?').get(NEGOZIO) as Riga | undefined;
      const articoli = db.prepare('SELECT * FROM main.articolo WHERE negozio_chiave = ? OR chiave IN (?,?,?,?,?,?)')
        .all(NEGOZIO, ...ARTICOLI.map(a => a.chiave)) as Riga[];
      if (!n || ARTICOLI.some(a => !articoli.some(r => r.chiave === a.chiave))) {
        registra('assente', 'Negozio o una delle sei offerte assenti: intero blocco conservato, nessuna ricreazione.'); return;
      }
      const firmaNegozio: Riga = { origine: 'seed', nascosto: 0, sede_chiave: null, luogo_chiave: null,
        condizioni_json: '[]', orari_json: ORARI, eccezione_orari_json: null, seed_json: null, listino_condiviso: null };
      if (Object.entries(firmaNegozio).some(([c, v]) => n[c] !== v) || (n.sblocco_json !== null && n.sblocco_json !== DOPO_NEGOZIO)
        || articoli.length !== ARTICOLI.length || articoli.some(r => !CHIAVI_ARTICOLI.has(String(r.chiave)))) {
        registra('esclusa', 'Firma, sede, fotografia o numero di offerte diversi dal caso attestato: intero blocco conservato.'); return;
      }
      for (const a of ARTICOLI) {
        const r = articoli.find(riga => riga.chiave === a.chiave)!;
        if (r.negozio_chiave !== NEGOZIO || r.origine !== 'seed' || r.nascosto !== 0 || r.seed_json !== null || r.articolo_condiviso !== null
          || (r.condizioni_json !== PRIMA_ARTICOLO && r.condizioni_json !== a.dopo)) {
          registra('esclusa', 'Una delle sei offerte ha firma, fotografia, formula o condivisione diversa: intero blocco conservato.'); return;
        }
      }
      const entranti = db.prepare('SELECT 1 FROM main.negozio WHERE listino_condiviso = ? LIMIT 1').get(NEGOZIO)
        || db.prepare('SELECT 1 FROM main.articolo WHERE articolo_condiviso IN (?,?,?,?,?,?) LIMIT 1').get(...ARTICOLI.map(a => a.chiave))
        || db.prepare('SELECT 1 FROM main.negozio_luogo_extra WHERE negozio_chiave = ? LIMIT 1').get(NEGOZIO)
        || db.prepare('SELECT 1 FROM main.negozio_sede_spillo WHERE negozio_chiave = ? LIMIT 1').get(NEGOZIO);
      if (entranti) { registra('esclusa', 'Condivisioni entranti o sedi aggiuntive presenti: intero blocco conservato.'); return; }
      const copertura = coperturaCestino(db);
      if (!copertura.leggibile || copertura.pertinenti !== 0) {
        registra('esclusa', 'Copertura del cestino incerta o fotografie pertinenti presenti: nessuna fotografia o riga riscritta.', [], copertura); return;
      }
      const modificate = [
        ...(n.sblocco_json === null ? [`negozio:${NEGOZIO}`] : []),
        ...ARTICOLI.filter(a => articoli.find(r => r.chiave === a.chiave)!.condizioni_json === PRIMA_ARTICOLO).map(a => `articolo:${a.chiave}`),
      ];
      // Rendiconto e sette CAS sono nella medesima transazione; un errore annulla anche l'audit.
      registra(modificate.length ? 'applicata' : 'gia-corretta', modificate.length
        ? 'Unificata la finestra nel negozio e distinti i due banchi nelle offerte; nessun progresso dedotto.'
        : 'Sette formule già corrispondenti e guardie rispettate: nessun UPDATE.', modificate, copertura);
      if (n.sblocco_json === null && db.prepare('UPDATE main.negozio SET sblocco_json = ? WHERE chiave = ? AND sblocco_json IS NULL')
        .run(DOPO_NEGOZIO, NEGOZIO).changes !== 1) throw new Error('134: negozio cambiato durante la rettifica, transazione annullata.');
      for (const a of ARTICOLI) {
        const r = articoli.find(riga => riga.chiave === a.chiave)!;
        if (r.condizioni_json === a.dopo) continue;
        if (db.prepare('UPDATE main.articolo SET condizioni_json = ? WHERE chiave = ? AND condizioni_json = ?')
          .run(a.dopo, a.chiave, PRIMA_ARTICOLO).changes !== 1) throw new Error('134: offerta cambiata durante la rettifica, transazione annullata.');
      }
    })();
  },
};
