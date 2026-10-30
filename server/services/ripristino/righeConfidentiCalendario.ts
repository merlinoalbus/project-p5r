// ============================================================
// righeConfidentiCalendario — i Confidenti, i premi degli esami, le settimane della guida e i collegamenti evento ↔ Diario (L11 · R11-17/1)
// ============================================================
//
// Quattro oggetti «a riga» del registro dei ripristini (`righe.ts`); il valore della guida è la fotografia `seed_json` presa alla prima correzione (colonne
// `origine`, `seed_json`, `updated_at` della migrazione 219).
//   - `confidente` (23, chiave = chiave del Confidente): il nome e l'Arcano. NON si corregge l'ordine (è un ordinamento) né la chiave (la usano ranghi, partite, mappe).
//   - `esame-premi` (1, chiave «premi»): le note generali sugli esami, un JSON di testi in `esame_premi.json`; ogni testo è un campo. La struttura non cambia.
//     L13 (ondata 7, O7-2): dalla 311 premi per piazzamento, requisito di Conoscenza e trofeo stanno nelle colonne dell'esame (`righeScuola`) e qui
//     restano fonte e note generali; le etichette dei campi di prima servono solo a una riga che la 311 non ha ridotto (corretta dall'utente).
//   - `settimana-guida` (42, chiave = numero): titolo, periodo, riassunto e incertezze della settimana. L'indirizzo della fonte (`url`) non si corregge.
//   - `evento-voce` (135, chiave «<id evento>:<uid voce>»): la certezza del collegamento fra un evento del Calendario e una voce del Diario. Il collegamento
//     stesso (quale evento, quale voce) è l'identità della riga e non si corregge.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { t } from '../traduzioniService.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';
import { colonna, rigaDaColonne } from './righeComuni.js';

// ---- Confidenti ----

const confidente = rigaDaColonne({
  etichetta: 'Confidente', tabella: 'confidente', colonnaChiave: 'chiave', ordine: 'ordine',
  colonne: () => [
    colonna({ p: 'nome', e: 'Nome', t: 'testo', max: 80 }, 'nome', 'testo'),
    colonna({
      p: 'arcana', e: 'Arcano', t: 'scelta',
      opzioni: (prepared('SELECT chiave FROM arcana ORDER BY ordine').pluck().all() as string[]).map((chiave) => ({ chiave, nome: t('arcana', chiave) })),
    }, 'arcana', 'scelta'),
  ],
  nome: (_chiave, v) => String(v.nome),
});

// ---- Premi degli esami ----

const CHIAVE_PREMI = 'premi';
const ETICHETTE_PREMI: Record<string, string> = {
  'fascinoPerPiazzamento/primi_10_(incluso_1_posto)': 'Fascino: primi 10 (compreso il 1° posto)',
  'fascinoPerPiazzamento/sopra_la_media': 'Fascino: sopra la media',
  'fascinoPerPiazzamento/nella_media_o_sotto': 'Fascino: nella media o sotto',
  moltiplicatoreConfidenti: 'Moltiplicatore dei punti Confidente',
  'requisitoConoscenza/esame_maggio': 'Conoscenza richiesta: esame di maggio',
  'requisitoConoscenza/esame_luglio_ottobre_dicembre': 'Conoscenza richiesta: esami di luglio, ottobre e dicembre',
  'requisitoConoscenza/fonte': 'Conoscenza richiesta: fonte',
  trofeo: 'Trofeo', fonte: 'Fonte', noteGenerali: 'Note generali',
};
const umanizza = (percorso: string): string => percorso.split('/').map((s) => s.replaceAll('_', ' ')).join(' › ');

function premiGrezzi(): Record<string, unknown> {
  const json = prepared('SELECT json FROM esame_premi WHERE chiave = ?').pluck().get(CHIAVE_PREMI) as string | undefined;
  if (json === undefined) return {};
  try { const v = JSON.parse(json) as unknown; return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; }
}

/** Le foglie di testo del JSON dei premi, con il loro indirizzo («a/b»): ogni foglia è un campo. */
function foglie(o: Record<string, unknown>, prefisso = ''): Array<[string, string]> {
  const uscita: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(o)) {
    const p = prefisso === '' ? k : `${prefisso}/${k}`;
    if (typeof v === 'string') uscita.push([p, v]);
    else if (v !== null && typeof v === 'object' && !Array.isArray(v)) uscita.push(...foglie(v as Record<string, unknown>, p));
  }
  return uscita;
}

const esamePremi: DefRiga = {
  modalita: 'riga', etichetta: 'Note sugli esami', tabella: 'esame_premi', colonnaChiave: 'chiave',
  chiavi: () => (prepared('SELECT chiave FROM esame_premi ORDER BY chiave').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM esame_premi WHERE chiave = ?').get(chiave),
  campi: () => foglie(premiGrezzi()).map(([p]): CampoDef => ({ p, e: ETICHETTE_PREMI[p] ?? umanizza(p), t: 'testolungo', max: 2000 })),
  leggi: () => Object.fromEntries(foglie(premiGrezzi())),
  scrivi: (chiave, v) => {
    const radice = premiGrezzi();
    for (const [p, nuovo] of Object.entries(v)) {
      if (typeof nuovo !== 'string') continue;
      const pezzi = p.split('/');
      let nodo: Record<string, unknown> = radice;
      for (const s of pezzi.slice(0, -1)) {
        const figlio = nodo[s];
        if (figlio === null || typeof figlio !== 'object' || Array.isArray(figlio)) throw httpErrors.badRequest('campo-non-modificabile', `Il campo «${p}» non esiste nei premi.`, { campo: p });
        nodo = figlio as Record<string, unknown>;
      }
      if (typeof nodo[pezzi.at(-1)!] !== 'string') throw httpErrors.badRequest('campo-non-modificabile', `Il campo «${p}» non esiste nei premi.`, { campo: p });
      nodo[pezzi.at(-1)!] = nuovo;
    }
    prepared('UPDATE esame_premi SET json = ? WHERE chiave = ?').run(JSON.stringify(radice), chiave);
  },
  nome: () => 'Note generali sugli esami',
};

// ---- Settimane della guida ----

const settimanaGuida = rigaDaColonne({
  etichetta: 'Settimana della guida', tabella: 'settimana_guida', colonnaChiave: 'CAST(numero AS TEXT)', ordine: 'numero',
  colonne: [
    colonna({ p: 'titolo', e: 'Titolo', t: 'testo', max: 160 }, 'titolo', 'testo'),
    colonna({ p: 'periodo', e: 'Periodo', t: 'testo', nullable: true, max: 80 }, 'periodo', 'testoVuoto'),
    colonna({ p: 'riassunto', e: 'Riassunto', t: 'testolungo', nullable: true }, 'riassunto', 'testoVuoto'),
    colonna({ p: 'incertezze', e: 'Incertezze', t: 'testolungo', nullable: true }, 'incertezze', 'testoVuoto'),
  ],
  nome: (chiave, v: Valori) => `Settimana ${chiave}: ${String(v.titolo)}`,
});

// ---- Collegamenti fra eventi del Calendario e voci del Diario ----

const CHIAVE_LEGAME = "evento_id || ':' || voce_uid";
const eventoVoce = rigaDaColonne({
  etichetta: 'Collegamento evento ↔ voce', tabella: 'evento_calendario_voce', colonnaChiave: CHIAVE_LEGAME, ordine: 'evento_id, voce_uid',
  colonne: [colonna({
    p: 'certezza', e: 'Certezza del collegamento', t: 'scelta',
    opzioni: [{ chiave: 'C', nome: 'Certo' }, { chiave: 'D', nome: 'Dubbio' }],
  }, 'certezza', 'scelta')],
  nome: (chiave) => {
    const r = prepared(`SELECT e.titolo, e.data, v.data AS giorno FROM evento_calendario_voce l JOIN evento_calendario e ON e.id = l.evento_id JOIN voce_giornata v ON v.uid = l.voce_uid WHERE l.${CHIAVE_LEGAME} = ?`)
      .get(chiave) as { titolo: string; data: string; giorno: string } | undefined;
    return r ? `Collegamento: «${r.titolo}» con la voce del ${r.giorno.slice(3, 5)}/${r.giorno.slice(0, 2)}` : chiave;
  },
});

export const DEFINIZIONI_CONFIDENTI_CALENDARIO: {
  confidente: DefRiga; 'esame-premi': DefRiga; 'settimana-guida': DefRiga; 'evento-voce': DefRiga;
} = { confidente, 'esame-premi': esamePremi, 'settimana-guida': settimanaGuida, 'evento-voce': eventoVoce };
