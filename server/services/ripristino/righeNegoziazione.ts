// ============================================================
// righeNegoziazione — il corpus della negoziazione, correggibile e ripristinabile (L11 · R11-17/1, gruppo Negoziazione)
// ============================================================
//
// Quattro oggetti «a riga» del registro dei ripristini (`righe.ts`); il valore della guida è la fotografia `seed_json` presa alla prima correzione (colonne
// `origine`, `seed_json`, `updated_at` della migrazione 222). Il lettore unico (`negoziazioneService`) tiene il corpus in memoria: `correggi` e `ripristina`
// svuotano la copia (`invalidaCacheDiGioco`).
//   - `negoziazione-variante` (chiave = chiave della variante): la resa italiana del testo della domanda e la sua provenienza. Il testo originale, la fonte, il
//     localizzatore e le note non si correggono (sono la fonte).
//   - `negoziazione-risposta`: la resa italiana della risposta, la provenienza e se il testo è disponibile. Originale e corrispondenze non si correggono.
//   - `negoziazione-verdetto`: l'esito per umore (o nessuno), se è incerto e l'origine indicata dalla fonte. Valore e colore grezzi della fonte, umore, fonte e
//     localizzatore non si correggono. L'esito e la sua origine stanno insieme (nessun esito ⇔ nessuna origine, vincolo della tabella).
//   - `negoziazione-umore` (chiave = umore): nome, descrizione, le cose da evitare e il testo di ogni esempio e proposta della carta.
// `negoziazione_domanda` non ha niente da correggere (solo chiave e ordine).
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';
import { colonna, rigaDaColonne } from './righeComuni.js';

const ORIGINI_TESTO = [
  { chiave: 'gioco', nome: 'Testo del gioco' }, { chiave: 'resa-app', nome: 'Resa dell’app' },
  { chiave: 'resa-esperto', nome: 'Resa di un esperto' }, { chiave: 'nessuna', nome: 'Nessuna' },
];
const campoOrigine = (): CampoDef => ({ p: 'testo_origine', e: 'Provenienza del testo', t: 'scelta', opzioni: ORIGINI_TESTO });

const variante = rigaDaColonne({
  etichetta: 'Variante di domanda', tabella: 'negoziazione_variante', colonnaChiave: 'chiave',
  colonne: [
    colonna({ p: 'testo', e: 'Testo in italiano', t: 'testolungo', nullable: true, max: 2000 }, 'testo', 'testo'),
    colonna(campoOrigine(), 'testo_origine', 'scelta'),
  ],
  nome: (chiave) => `Variante ${chiave}`,
});

const risposta = rigaDaColonne({
  etichetta: 'Risposta di negoziazione', tabella: 'negoziazione_risposta', colonnaChiave: 'chiave',
  colonne: [
    colonna({ p: 'testo', e: 'Testo in italiano', t: 'testolungo', nullable: true, max: 2000 }, 'testo', 'testo'),
    colonna(campoOrigine(), 'testo_origine', 'scelta'),
    colonna({ p: 'testo_disponibile', e: 'Il testo è disponibile nella fonte', t: 'booleano' }, 'testo_disponibile', 'bool'),
  ],
  nome: (chiave) => `Risposta ${chiave}`,
});

const verdettoDiColonne = rigaDaColonne({
  etichetta: 'Esito di una risposta', tabella: 'negoziazione_verdetto', colonnaChiave: 'chiave',
  colonne: [
    colonna({ p: 'esito', e: 'Esito', t: 'scelta', opzioni: [{ chiave: '', nome: 'Nessun esito documentato' }, { chiave: 'buona', nome: 'Buona' }, { chiave: 'passabile', nome: 'Passabile' }, { chiave: 'cattiva', nome: 'Cattiva' }] }, 'esito', 'scelta'),
    colonna({ p: 'incerto', e: 'Nemmeno la fonte è certa', t: 'booleano' }, 'incerto', 'bool'),
    colonna({
      p: 'origine_indicata_fonte', e: 'Origine indicata dalla fonte', t: 'scelta',
      opzioni: [{ chiave: '', nome: 'Nessuna (senza esito)' }, { chiave: 'confermata', nome: 'Confermata' }, { chiave: 'ereditata-da-P5-non-confermata', nome: 'Ereditata dal gioco base, non confermata' }, { chiave: 'app', nome: 'Dall’app' }, { chiave: 'runtime', nome: 'Rilevata in gioco' }],
    }, 'origine_indicata_fonte', 'scelta'),
  ],
  nome: (chiave) => `Esito ${chiave}`,
  valida: (_chiave, fusi: Valori) => {
    const senzaEsito = fusi.esito === '';
    const senzaOrigine = fusi.origine_indicata_fonte === '';
    if (senzaEsito !== senzaOrigine) {
      throw httpErrors.badRequest('esito-e-origine', senzaEsito ? 'Senza esito non c’è un’origine: lascia vuota anche l’origine.' : 'Un esito ha un’origine: indicala.', { campo: senzaEsito ? 'origine_indicata_fonte' : 'esito' });
    }
  },
});

/** Esito, incertezza e origine si scrivono con un'istruzione sola: il vincolo della tabella li lega (nessun esito ⇔ nessuna origine) e una scrittura a pezzi lo violerebbe a metà. */
const verdetto: DefRiga = {
  ...verdettoDiColonne,
  scrivi: (chiave, v) => {
    if (v.esito === undefined && v.incerto === undefined && v.origine_indicata_fonte === undefined) return;
    const ora = verdettoDiColonne.leggi(chiave);
    const esito = (v.esito ?? ora.esito) as string;
    const origine = (v.origine_indicata_fonte ?? ora.origine_indicata_fonte) as string;
    const incerto = (v.incerto ?? ora.incerto) === true ? 1 : 0;
    prepared('UPDATE negoziazione_verdetto SET esito = ?, origine_indicata_fonte = ?, incerto = ? WHERE chiave = ?').run(esito === '' ? null : esito, origine === '' ? null : origine, incerto, chiave);
  },
};

// ---- Le carte per umore ----

const NOMI_UMORE: Record<string, string> = { cupa: 'Cupa', irritabile: 'Irritabile', timida: 'Timida', giocosa: 'Giocosa' };
interface RigaUmore { nome: string; descrizione: string; esempi_json: string; da_evitare_json: string }
const rigaUmore = (umore: string): RigaUmore => prepared('SELECT nome, descrizione, esempi_json, da_evitare_json FROM negoziazione_umore WHERE umore = ?').get(umore) as RigaUmore;

type Oggetto = Record<string, unknown>;
const comeOggetto = (v: unknown): Oggetto => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Oggetto : {});
const leggiJson = (json: string): unknown => { try { return JSON.parse(json) as unknown; } catch { return null; } };
const GRUPPI_ESEMPI = [['esempi', 'Esempio'], ['proposte', 'Proposta']] as const;

/** I testi degli esempi e delle proposte della carta, con l'indirizzo «esempi/0/testo». */
function testiEsempi(json: string): Array<[string, string, string]> {
  const radice = comeOggetto(leggiJson(json));
  const uscita: Array<[string, string, string]> = [];
  for (const [gruppo, etichetta] of GRUPPI_ESEMPI) {
    const elenco = radice[gruppo];
    if (!Array.isArray(elenco)) continue;
    elenco.forEach((e, i) => { const t = comeOggetto(e).testo; if (typeof t === 'string') uscita.push([`${gruppo}/${i}/testo`, `${etichetta} ${i + 1}`, t]); });
  }
  return uscita;
}

const umore: DefRiga = {
  modalita: 'riga', etichetta: 'Carta per umore', tabella: 'negoziazione_umore', colonnaChiave: 'umore',
  chiavi: () => (prepared('SELECT umore FROM negoziazione_umore ORDER BY umore').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM negoziazione_umore WHERE umore = ?').get(chiave),
  campi: (chiave) => [
    { p: 'nome', e: 'Nome', t: 'testo', max: 80 } as CampoDef,
    { p: 'descrizione', e: 'Descrizione', t: 'testolungo', nullable: true, max: 2000 } as CampoDef,
    { p: 'da_evitare', e: 'Da evitare', t: 'elenco' } as CampoDef,
    ...testiEsempi(rigaUmore(chiave).esempi_json).map(([p, e]): CampoDef => ({ p, e, t: 'testolungo', max: 600, gruppo: 'Rispondi così' })),
  ],
  leggi: (chiave) => {
    const r = rigaUmore(chiave);
    const evitare = leggiJson(r.da_evitare_json);
    const v: Valori = { nome: r.nome, descrizione: r.descrizione === '' ? null : r.descrizione, da_evitare: Array.isArray(evitare) ? evitare.filter((x): x is string => typeof x === 'string') : [] };
    for (const [p, , testo] of testiEsempi(r.esempi_json)) v[p] = testo;
    return v;
  },
  scrivi: (chiave, v) => {
    if (v.nome !== undefined) prepared('UPDATE negoziazione_umore SET nome = ? WHERE umore = ?').run(typeof v.nome === 'string' ? v.nome : '', chiave);
    if (v.descrizione !== undefined) prepared('UPDATE negoziazione_umore SET descrizione = ? WHERE umore = ?').run(typeof v.descrizione === 'string' ? v.descrizione : '', chiave);
    if (v.da_evitare !== undefined) prepared('UPDATE negoziazione_umore SET da_evitare_json = ? WHERE umore = ?').run(JSON.stringify(Array.isArray(v.da_evitare) ? v.da_evitare : []), chiave);
    const testi = testiEsempi(rigaUmore(chiave).esempi_json).filter(([p]) => v[p] !== undefined);
    if (testi.length > 0) {
      const radice = comeOggetto(leggiJson(rigaUmore(chiave).esempi_json));
      for (const [p] of testi) {
        const [gruppo, indice] = p.split('/') as [string, string];
        const elenco = radice[gruppo] as unknown[];
        comeOggetto(elenco[Number(indice)]).testo = v[p];
      }
      prepared('UPDATE negoziazione_umore SET esempi_json = ? WHERE umore = ?').run(JSON.stringify(radice), chiave);
    }
  },
  nome: (chiave) => `Carta ${NOMI_UMORE[chiave] ?? chiave}`,
};

export const DEFINIZIONI_NEGOZIAZIONE: {
  'negoziazione-variante': DefRiga; 'negoziazione-risposta': DefRiga; 'negoziazione-verdetto': DefRiga; 'negoziazione-umore': DefRiga;
} = { 'negoziazione-variante': variante, 'negoziazione-risposta': risposta, 'negoziazione-verdetto': verdetto, 'negoziazione-umore': umore };
