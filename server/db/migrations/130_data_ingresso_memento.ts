import type { Migration } from '../migrationRunner.js';
import { fotografieIngressoMemento130 } from './ingressoMemento130.js';

const CHIAVE = 'mementos/ingresso-mementos';
const PRIMA = '[{"tipo":"data","dal":"05-09"}]';
const DOPO = '[{"tipo":"data","dal":"05-07"}]';
const FONTE_DATA = 'https://www.allgamestaff.it/persona-5-royal/dedalo-di-qimranut/';

/** Le 18 proprietà effettive del pacchetto pubblico93, confrontate integralmente con lo snapshot corrente.
 * Non è una ricostruzione di dati personali. Ordine e stringhe servono anche a riconoscere il RAW canonico. */
const FOTOGRAFIA = {
  chiave: CHIAVE,
  quartiere_chiave: 'mementos',
  ordine: 0,
  tipo: 'trasporto',
  nome: 'Ingresso ai Memento',
  cosa_offre: 'Accesso al dungeon procedurale dei Memento tramite la metropolitana di Shibuya; qui si ricevono e completano le richieste dei cittadini.',
  quando: null,
  giorni: null,
  sblocco: 'dopo il primo Palazzo (Kamoshida)',
  confidenti_json: '[]',
  attivita_json: '["richieste secondarie"]',
  negozio: null,
  piatti_json: null,
  note: null,
  fonte: 'https://www.allgamestaff.it/persona-5-royal/richieste-nei-memento/',
  verificato: 0,
  condizioni_json: PRIMA,
  giorni_json: '[]',
} as const;
const FOTOGRAFIA_PRIMA = JSON.stringify(FOTOGRAFIA);
const FOTOGRAFIA_DOPO = JSON.stringify({ ...FOTOGRAFIA, condizioni_json: DOPO });
const NUOVI_NULL = ['area_chiave', 'orari_json', 'solo_eventi_confidente', 'fonte_condizioni_json'] as const;
const QUARTIERE = {
  chiave: 'mementos', sblocco: null, sblocco_data: null, fonte: FOTOGRAFIA.fonte,
  condizioni_json: null, condizioni_guida_json: null, fonte_condizioni_json: null, fonte_condizioni_guida_json: null,
} as const;
type Riga = Record<string, unknown>;
type Esito = 'assente' | 'personale' | 'conflitto' | 'gia-corretta' | 'rettificata';

export const migration130: Migration = {
  id: 130, name: 'data_primo_ingresso_memento',
  up(db) {
    db.transaction(() => {
      const audit = 'rettifica-ingresso-memento-130';
      if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(audit)) return;
      const registra = (esito: Esito, motivo: string, campi: string[] = []) => {
        db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(audit, JSON.stringify({
          versione: 1, luogo: CHIAVE, esito, motivo, campi, fonteData: FONTE_DATA,
          ambito: 'Data del primo ingresso guidato; non calendario delle visite libere. Nessun evento di partita modificato.',
        }));
      };
      const r = db.prepare('SELECT * FROM main.luogo WHERE chiave = ?').get(CHIAVE) as Riga | undefined;
      if (!r) { registra('assente', 'Luogo assente: non ricreato.'); return; }
      if (r.origine !== 'seed') { registra(r.origine === 'utente' ? 'personale' : 'conflitto', 'Origine diversa dal dato della guida atteso: nessuna modifica.'); return; }
      if (r.nascosto !== 0 || Object.entries(FOTOGRAFIA).some(([c, v]) => c !== 'condizioni_json' && r[c] !== v)
        || NUOVI_NULL.some(c => !Object.hasOwn(r, c) || r[c] !== null)
        || (r.condizioni_json !== PRIMA && r.condizioni_json !== DOPO)) {
        registra('conflitto', 'Firma corrente diversa dal manifest attestato: nessuna modifica.'); return;
      }
      if (r.seed_json !== null && r.seed_json !== FOTOGRAFIA_PRIMA && r.seed_json !== FOTOGRAFIA_DOPO) {
        registra('conflitto', 'Fotografia diversa dal RAW canonico attestato: conservata senza riserializzarla.'); return;
      }
      const q = db.prepare('SELECT * FROM main.quartiere WHERE chiave = ?').get('mementos') as Riga | undefined;
      if (!q || Object.entries(QUARTIERE).some(([c, v]) => q[c] !== v)) {
        registra('conflitto', 'Contesto ereditato del quartiere diverso da quello attestato: nessuna modifica.'); return;
      }
      // Stessa scansione del GET, ma sul DB e dentro la transazione del chiamante.
      // Il confronto storico09 nel DTO non è usato come firma mutante:07 è gestito esplicitamente sopra.
      const fotografie = fotografieIngressoMemento130(db);
      if (fotografie.copertura.stato !== 'leggibile' || fotografie.cestino.stato !== 'presente'
        || fotografie.copertura.passiPertinenti !== 0 || fotografie.cestino.lati.length !== 0) {
        registra('conflitto', 'Copertura del cestino incerta o fotografie pertinenti presenti: nessun contenuto riscritto.'); return;
      }
      const campi: string[] = [];
      const valori: Array<string | null> = [];
      if (r.condizioni_json === PRIMA) { campi.push('condizioni_json'); valori.push(DOPO); }
      if (r.seed_json === FOTOGRAFIA_PRIMA) { campi.push('seed_json'); valori.push(FOTOGRAFIA_DOPO); }
      if (!campi.length) { registra('gia-corretta', 'Data e fotografia già coerenti; nessun UPDATE.'); return; }
      const changes = db.prepare(`UPDATE main.luogo SET ${campi.map(c => `${c} = ?`).join(', ')} WHERE chiave = ? AND condizioni_json = ? AND seed_json IS ?`)
        .run(...valori, CHIAVE, r.condizioni_json, r.seed_json).changes;
      if (changes !== 1) throw new Error('130: ingresso cambiato durante la rettifica, transazione annullata.');
      registra('rettificata', 'Corretta soltanto la data attestata; altri valori, quartiere, cestino e partita conservati.', campi);
    })();
  },
};
