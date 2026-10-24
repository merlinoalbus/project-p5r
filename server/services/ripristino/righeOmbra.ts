// ============================================================
// righeOmbra — l'Ombra, correggibile e ripristinabile (L11 · R11-15/4)
// ============================================================
//
// Un oggetto «a riga» del registro dei ripristini (`righe.ts`): l'Ombra (`ombra`, una riga per Ombra). Il valore della guida è la fotografia
// `seed_json` presa alla prima correzione (colonne `origine`, `seed_json`, `updated_at`, già della migrazione 166; la migrazione 206 porta la
// fotografia di allora nella forma di questo registro), che `ripristinoService` gestisce come per quartieri, trofei ed esami.
//
// Si correggono: il nome, gli altri nomi, la maschera descrittiva (per le non reclutabili), la personalità, la catturabilità, la
// negoziabilità, il livello, le note e le affinità PROPRIE dell'Ombra (le differenze rispetto alla sua Persona: per ognuno dei dieci elementi
// «come la Persona» oppure un esito). Le affinità della Persona si correggono dalla scheda Persona (`affinitaPersonaService`): qui non si
// copiano. NON si correggono: la chiave (la usano luoghi, voci e partite), la Persona abbinata (l'ha in carico L8: cambia l'identità
// dell'Ombra) e i luoghi d'incontro (derivati dalla guida dei Palazzi e dei Memento, che si correggono dai loro pin).
// Nei dati non ci sono PV né oggetti lasciati dalle Ombre: l'Ombra ha solo il livello (3 Ombre su 131), e quello c'è.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { ELEMENTI_AFFINITA, ESITI_AFFINITA, NOME_PERSONALITA, PERSONALITA_OMBRA, eCodiceAffinita, eChiaveElemento } from '../../../shared/elementi.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';

const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);
const NEGOZIABILE = [{ chiave: '', nome: 'Non verificata' }, { chiave: '1', nome: 'Sì, si negozia' }, { chiave: '0', nome: 'No, non si negozia' }];
const LIVELLO_MASSIMO = 99;

interface RigaOmbra {
  nome: string; nomi_altri_json: string; persona_id: number | null; maschera_nota: string | null; personalita: string; catturabile: number;
  negoziabile: number | null; affinita_proprie_json: string | null; livello: number | null; note: string;
}
const COLONNE = 'nome, nomi_altri_json, persona_id, maschera_nota, personalita, catturabile, negoziabile, affinita_proprie_json, livello, note';
const riga = (chiave: string): RigaOmbra => prepared(`SELECT ${COLONNE} FROM ombra WHERE chiave = ?`).get(chiave) as RigaOmbra;

const nomiAltriDi = (json: string): string[] => { try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };

/** Le affinità proprie (elemento → codice) scritte sull'Ombra; ciò che non è un elemento o un codice valido si ignora, come fa la lettura. */
function proprieDi(json: string | null): Map<string, string> {
  const m = new Map<string, string>();
  if (!json) return m;
  try {
    for (const [el, cod] of Object.entries(JSON.parse(json) as Record<string, unknown>)) if (eChiaveElemento(el) && eCodiceAffinita(cod)) m.set(el, cod);
  } catch { /* illeggibili: nessuna */ }
  return m;
}

const ombra: DefRiga = {
  modalita: 'riga', etichetta: 'Ombra', tabella: 'ombra', colonnaChiave: 'chiave', aggiornataSempre: true,
  chiavi: () => (prepared('SELECT chiave FROM ombra ORDER BY nome COLLATE NOCASE, chiave').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM ombra WHERE chiave = ?').get(chiave),
  campi: (chiave) => {
    const senzaPersona = riga(chiave).persona_id === null;
    const esiti = [{ chiave: '', nome: senzaPersona ? 'Non detta dalla guida' : 'Come la sua Persona' }, ...ESITI_AFFINITA.map((e) => ({ chiave: e.codice, nome: e.nome }))];
    return [
      { p: 'nome', e: 'Nome', t: 'testo', max: 80 } as CampoDef,
      { p: 'nomiAltri', e: 'Altri nomi', t: 'elenco' } as CampoDef,
      { p: 'macheraNota', e: 'Maschera (se non reclutabile)', t: 'testo', nullable: true, max: 80 } as CampoDef,
      { p: 'personalita', e: 'Personalità', t: 'scelta', opzioni: PERSONALITA_OMBRA.map((p) => ({ chiave: p, nome: NOME_PERSONALITA[p] })) } as CampoDef,
      { p: 'catturabile', e: 'L’incontro permette la cattura', t: 'booleano' } as CampoDef,
      { p: 'negoziabile', e: 'Si negozia', t: 'scelta', opzioni: NEGOZIABILE } as CampoDef,
      { p: 'livello', e: 'Livello', t: 'numero', nullable: true, max: LIVELLO_MASSIMO } as CampoDef,
      { p: 'note', e: 'Note', t: 'testolungo', nullable: true, max: 2000 } as CampoDef,
      ...ELEMENTI_AFFINITA.map((el): CampoDef => ({ p: `affinita/${el.chiave}`, e: el.nome, t: 'scelta', gruppo: 'Affinità proprie dell’Ombra', opzioni: esiti })),
    ];
  },
  leggi: (chiave) => {
    const r = riga(chiave);
    const proprie = proprieDi(r.affinita_proprie_json);
    const v: Valori = {
      nome: r.nome, nomiAltri: nomiAltriDi(r.nomi_altri_json), macheraNota: r.maschera_nota, personalita: r.personalita, catturabile: r.catturabile === 1,
      negoziabile: r.negoziabile === null ? '' : String(r.negoziabile), livello: r.livello, note: r.note === '' ? null : r.note,
    };
    for (const el of ELEMENTI_AFFINITA) v[`affinita/${el.chiave}`] = proprie.get(el.chiave) ?? '';
    return v;
  },
  scrivi: (chiave, v) => {
    if (v.nome !== undefined) prepared('UPDATE ombra SET nome = ? WHERE chiave = ?').run(str(v.nome) ?? '', chiave);
    if (v.nomiAltri !== undefined) prepared('UPDATE ombra SET nomi_altri_json = ? WHERE chiave = ?').run(JSON.stringify(Array.isArray(v.nomiAltri) ? v.nomiAltri : []), chiave);
    if (v.macheraNota !== undefined) prepared('UPDATE ombra SET maschera_nota = ? WHERE chiave = ?').run(str(v.macheraNota), chiave);
    if (v.personalita !== undefined) prepared('UPDATE ombra SET personalita = ? WHERE chiave = ?').run(str(v.personalita) ?? 'sconosciuta', chiave);
    if (v.catturabile !== undefined) prepared('UPDATE ombra SET catturabile = ? WHERE chiave = ?').run(v.catturabile === true ? 1 : 0, chiave);
    if (v.negoziabile !== undefined) prepared('UPDATE ombra SET negoziabile = ? WHERE chiave = ?').run(v.negoziabile === '' || v.negoziabile === null ? null : Number(v.negoziabile), chiave);
    if (v.livello !== undefined) prepared('UPDATE ombra SET livello = ? WHERE chiave = ?').run(typeof v.livello === 'number' ? v.livello : null, chiave);
    if (v.note !== undefined) prepared('UPDATE ombra SET note = ? WHERE chiave = ?').run(str(v.note) ?? '', chiave);
    if (ELEMENTI_AFFINITA.some((el) => v[`affinita/${el.chiave}`] !== undefined)) {
      const proprie = proprieDi(riga(chiave).affinita_proprie_json);
      for (const el of ELEMENTI_AFFINITA) {
        const nuovo = v[`affinita/${el.chiave}`];
        if (nuovo === undefined) continue;
        if (nuovo === '' || nuovo === null) proprie.delete(el.chiave);
        else proprie.set(el.chiave, String(nuovo));
      }
      const fuori = Object.fromEntries(ELEMENTI_AFFINITA.filter((el) => proprie.has(el.chiave)).map((el) => [el.chiave, proprie.get(el.chiave)!]));
      prepared('UPDATE ombra SET affinita_proprie_json = ? WHERE chiave = ?').run(Object.keys(fuori).length > 0 ? JSON.stringify(fuori) : null, chiave);
    }
  },
  nome: (_chiave, v) => String(v.nome),
  // il livello, quando c'è, è positivo (vincolo della tabella): zero si rifiuta con un errore chiaro invece di un errore del database
  valida: (_chiave, fusi) => {
    if (typeof fusi.livello === 'number' && fusi.livello < 1) throw httpErrors.badRequest('valore-non-valido', 'Livello: serve un numero da 1 in su, oppure vuoto.', { campo: 'livello' });
  },
};

export const DEFINIZIONI_OMBRA: { ombra: DefRiga } = { ombra };
