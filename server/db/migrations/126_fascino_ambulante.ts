import { isDeepStrictEqual } from 'node:util';
import type { Migration } from '../migrationRunner.js';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { condizioneSpillo } from '../../schemas/mappe.js';
import { snapshotFonteProposta } from './snapshotProposte121.js';

type Riga = Record<string, unknown>;
const AUDIT = 'audit-bonifica-catalogo-126';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/';
const OFFERTE = [
  { slug: 'portafortuna-croce', nome: 'Portafortuna croce', prezzo: 2000, rango: 2 },
  { slug: 'portafortuna-teschio', nome: 'Portafortuna teschio', prezzo: 2000, rango: 2 },
  { slug: 'specchio-del-rimbotto', nome: 'Specchio del rimbotto', prezzo: 16000, rango: 3 },
] as const;
const PRIMA: RequisitoSpillo[] = [
  { tipo: 'giorno-settimana', giorni: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'] },
  { tipo: 'fascia', fascia: 'sera' }, { tipo: 'meteo', condizione: 'non-piove' },
];
function record(v: unknown): Riga | null { return v && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null; }
function leggi(v: unknown): unknown {
  if (typeof v !== 'string') return undefined;
  try { return JSON.parse(v) as unknown; } catch { return undefined; }
}

/** Solo tre offerte attestate. Nessuna fusione, riapplicazione della 121 o riscrittura di scelte pregresse. */
export const migration126: Migration = {
  id: 126, name: 'Fascino delle tre offerte attestate del Venditore ambulante',
  up(db) {
    db.transaction(() => {
      if (db.prepare('SELECT 1 FROM dati_guida WHERE chiave=?').get(AUDIT)) return;
      const rendiconto: Riga[] = [];
      const registra = (chiave: string, esito: string, motivo: string, extra: Riga = {}) => rendiconto.push({ chiave, esito, motivo, ...extra });
      const registri = db.prepare('SELECT registro_json FROM cestino').all() as Array<{ registro_json: string }>;
      const passi = registri.map((r) => leggi(r.registro_json));
      for (const o of OFFERTE) {
        const chiave = `venditore-ambulante/${o.slug}`; const catalogo = `accessorio/${o.slug}`;
        const r = db.prepare('SELECT * FROM articolo WHERE chiave=?').get(chiave) as Riga | undefined;
        if (!r || r.nascosto !== 0) { registra(chiave, 'esclusa', 'Offerta assente o nascosta: non ricreata né resa visibile.'); continue; }
        const c = db.prepare('SELECT chiave,categoria,fonte_tipo,fonte_chiave,nascosto FROM catalogo_oggetto WHERE chiave=?').get(catalogo) as Riga | undefined;
        if (r.negozio_chiave !== 'venditore-ambulante' || r.catalogo_chiave !== catalogo || c?.categoria !== 'accessorio'
          || c.fonte_tipo !== 'listino' || c.fonte_chiave !== chiave || c.nascosto !== 0) {
          registra(chiave, 'conflitto', 'Offerta o identità corrente diverse dalla provenienza attestata: nessun abbinamento dedotto dal nome.'); continue;
        }
        const raw = leggi(r.condizioni_json);
        if (!Array.isArray(raw) || raw.some((x) => {
          const esito = condizioneSpillo.safeParse(x);
          return !esito.success || !isDeepStrictEqual(x, esito.data);
        })) {
          registra(chiave, 'conflitto', 'Condizioni assenti, illeggibili o non supportate: nessuna normalizzazione.'); continue;
        }
        const condizioni = raw as RequisitoSpillo[];
        if (condizioni.some((x) => x.tipo === 'dote' && x.dote === 'fascino' && x.rango >= o.rango)) {
          registra(chiave, 'gia-corretta', 'Soglia almeno pari a quella attestata già presente in AND: nessuna modifica.'); continue;
        }
        if (db.prepare("SELECT 1 FROM proposta_abbinamento WHERE (riga_tipo='articolo' AND riga_chiave=?) OR (riga_tipo='ricompensa' AND riga_chiave=?)")
          .get(chiave, `articolo/${chiave}`)) {
          registra(chiave, 'conflitto', 'Proposta o scelta precedente presente: tutti gli stati e i candidati sono preservati.'); continue;
        }
        if (r.condizione !== null || condizioni.length >= 20) {
          registra(chiave, 'conflitto', 'Condizione legacy o formula oltre il limite della proposta: necessaria revisione esplicita.'); continue;
        }
        const dopo: RequisitoSpillo[] = [...condizioni, { tipo: 'dote', dote: 'fascino', rango: o.rango }];
        const automatico = r.origine === 'seed' && r.seed_json === null && r.nome === o.nome
          && (r.nome_it === null || r.nome_it === o.nome) && r.prezzo === o.prezzo && r.fonte === FONTE
          && isDeepStrictEqual(condizioni, PRIMA);
        if (automatico) {
          // Una vecchia fotografia recuperabile non viene riscritta: il conflitto resta esplicito.
          const storiaIncerta = passi.some((p) => !Array.isArray(p) || p.some((x) => {
            const passo = record(x); const prima = record(passo?.prima); const successiva = record(passo?.dopo);
            return !passo || (passo.tabella === 'articolo' && (prima?.chiave === chiave || successiva?.chiave === chiave));
          }));
          if (storiaIncerta) { registra(chiave, 'conflitto', 'Fotografia nel cestino pertinente o illeggibile: nessuna riscrittura dello storico.'); continue; }
          const ora = new Date().toISOString();
          db.prepare('UPDATE articolo SET condizioni_json=?,updated_at=? WHERE chiave=?')
            .run(JSON.stringify(dopo), ora, chiave);
          registra(chiave, 'corretta', 'Aggiunta soltanto la soglia attestata; origine e snapshot della guida invariati.', {
            prima: { condizioni_json: r.condizioni_json, updated_at: r.updated_at, origine: r.origine, seed_json: r.seed_json },
            dopo: { condizioni_json: JSON.stringify(dopo), updated_at: ora }, fonte: FONTE,
          });
          continue;
        }
        // La variante personale mantiene i valori attuali: la rettifica diventa una decisione visibile.
        const proposta = { riga_tipo: 'articolo', riga_chiave: chiave };
        db.prepare(`INSERT INTO proposta_abbinamento(riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,gruppo,modifica_json,fonte_snapshot_json,updated_at)
          VALUES ('articolo',?,?,1,?,'da-verificare','fascino-ambulante-126',?,?,?)`).run(chiave, catalogo,
          `La fonte del listino richiede Fascino ${o.rango}. La riga corrente differisce dal manifest: esamina l’aggiunta senza fondere identità.`,
          JSON.stringify({ azione: 'collega', condizioni: dopo, prima: { nome: r.nome, nome_it: r.nome_it, catalogo_chiave: r.catalogo_chiave, condizioni_json: r.condizioni_json } }),
          JSON.stringify(snapshotFonteProposta(db, proposta, 2)), new Date().toISOString());
        registra(chiave, 'proposta', 'Riga personale o variante: sola proposta, nessuna adozione automatica.', { fonte: FONTE });
      }
      db.prepare('INSERT INTO dati_guida(chiave,json) VALUES (?,?)').run(AUDIT, JSON.stringify({ versione: 1, migrazione: 126, rendiconto }));
    })();
  },
};
