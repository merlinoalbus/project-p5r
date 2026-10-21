import type { Migration } from '../migrationRunner.js';

const AUDIT = 'rettifica-nota-rango1-makoto-133';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-makoto-papessa/';
const PRIMA = 'Richiede Dote sociale Conoscenza a rango 3. Assicurarsi di avere una Persona con Arcano Papessa equipaggiata.';
const DOPO = 'Richiede Dote sociale Conoscenza a rango 3. Una Persona con Arcano Papessa in scorta aumenta l’affinità: non deve essere equipaggiata e non è un requisito di accesso.';

/** Fotografia integrale delle sette colonne della riga pubblica93, letta e verificata prima dell’implementazione.
 * Il RAW delle scelte è soltanto una guardia: risposte, punteggi e ordine non vengono riscritti. */
const FIRMA = {
  id: 51,
  confidente_chiave: 'makoto',
  ordine: 0,
  rango: 1,
  etichetta: '1',
  note: PRIMA,
  scelte_json: '[{"ordine":1,"testo":"Cosa pensi di fare?","punti":0,"puntiTesto":"+0","romantica":false,"avviso":null},{"ordine":2,"testo":"Hai assolutamente ragione","punti":0,"puntiTesto":"+0","romantica":false,"avviso":null},{"ordine":3,"testo":"Andiamoci ancora prima o poi (risposta finale)","punti":3,"puntiTesto":"+3","romantica":false,"avviso":null}]',
} as const;
type Riga = Record<string, unknown>;
type Esito = 'rettificata' | 'gia-corretta' | 'assente' | 'esclusa';

/** Rettifica additiva della sola nota informativa di rango1, comune alle due intestazioni della scheda.
 * Il requisito operativo Conoscenza3, le scelte e tutti i dati di partita rimangono invariati. */
export const migration133: Migration = {
  id: 133,
  name: 'nota_rango_makoto',
  up(db) {
    db.transaction(() => {
      // Un registro già presente è immutabile. Non si applica una rettifica il cui prima non sia registrabile.
      if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT)) return;
      const registra = (esito: Esito, motivo: string, precedente: string | null, risultante: string | null) => {
        const changes = db.prepare('INSERT INTO main.dati_guida (chiave,json) VALUES (?,?)').run(AUDIT, JSON.stringify({
          versione: 1, tabella: 'confidente_dialogo', id: FIRMA.id, confidente: FIRMA.confidente_chiave,
          ordine: FIRMA.ordine, rango: FIRMA.rango, etichetta: FIRMA.etichetta,
          esito, motivo, notaPrecedente: precedente, notaRisultante: risultante, fonte: FONTE,
          ambito: 'Sola nota informativa del rango1; nessun requisito operativo, risposta, Dote, incontro o progresso modificato.',
        })).changes;
        if (changes !== 1) throw new Error('133: nota precedente non registrata, transazione annullata.');
      };
      const righe = db.prepare('SELECT id,confidente_chiave,ordine,rango,etichetta,note,scelte_json FROM main.confidente_dialogo WHERE confidente_chiave = ? AND rango = ? AND ordine = ?')
        .all(FIRMA.confidente_chiave, FIRMA.rango, FIRMA.ordine) as Riga[];
      const rigaConId = db.prepare('SELECT id FROM main.confidente_dialogo WHERE id = ?').get(FIRMA.id);
      if (righe.length === 0 && !rigaConId) {
        registra('assente', 'Riga attesa assente: nessuna ricreazione.', null, null); return;
      }
      if (righe.length !== 1) {
        registra('esclusa', 'Identità della riga assente o non univoca: nessuna modifica.', null, null); return;
      }
      const r = righe[0];
      const nota = typeof r.note === 'string' ? r.note : null;
      if (Object.entries(FIRMA).some(([campo, valore]) => campo !== 'note' && r[campo] !== valore)
        || (r.note !== PRIMA && r.note !== DOPO)) {
        registra('esclusa', 'Firma RAW diversa dalla riga pubblica attestata: variante conservata.', nota, nota); return;
      }
      if (r.note === DOPO) {
        registra('gia-corretta', 'Nota già corretta e altri sei campi RAW coincidenti: nessun UPDATE.', DOPO, DOPO); return;
      }
      // Il prima si registra nella stessa transazione PRIMA dell’UPDATE. Un fallimento successivo annulla entrambi.
      registra('rettificata', 'Rettificata soltanto la nota: la Persona in scorta è un bonus di affinità, non un requisito equipaggiato.', PRIMA, DOPO);
      const changes = db.prepare('UPDATE main.confidente_dialogo SET note = ? WHERE id = ? AND confidente_chiave = ? AND ordine = ? AND rango = ? AND etichetta = ? AND note = ? AND scelte_json = ?')
        .run(DOPO, FIRMA.id, FIRMA.confidente_chiave, FIRMA.ordine, FIRMA.rango, FIRMA.etichetta, PRIMA, FIRMA.scelte_json).changes;
      if (changes !== 1) throw new Error('133: nota Makoto cambiata durante la rettifica, transazione annullata.');
    })();
  },
};
