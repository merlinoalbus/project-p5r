// ============================================================
// righeConfidenti — i regali dei Confidenti, correggibili e ripristinabili (L9 · R9-07/5)
// ============================================================
//
// Un oggetto «a riga» del registro dei ripristini (`righe.ts`): il regalo (`confidente_regalo`, 144 righe; chiave composta, qui «<confidente>:<ordine>»,
// l'espressione SQL `confidente_chiave || ':' || ordine`). Il valore della guida è la fotografia `seed_json` presa alla prima correzione (colonne `origine`,
// `seed_json`, `updated_at` della migrazione 212), che `ripristinoService` gestisce come per quartieri, trofei ed esami.
//
// Si correggono: dove si compra, il costo (la frase), «sconsigliato», la nota e l'oggetto del catalogo collegato. NON si correggono: il nome e l'effetto del regalo
// (li dà l'oggetto del catalogo, che si corregge dal catalogo), l'ordine e il Confidente (identità della riga). Cambiare un regalo non cambia i punti già dati
// nelle partite (il regalo è un'azione registrata, R10-18): la partita conserva ciò che ha registrato.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';

const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);
const CHIAVE = "confidente_chiave || ':' || ordine";

interface RigaRegalo { confidente_chiave: string; ordine: number; nome: string; dove: string | null; costo: string | null; sconsigliato: number; catalogo_chiave: string | null; nota: string | null }
const riga = (chiave: string): RigaRegalo =>
  prepared(`SELECT confidente_chiave, ordine, nome, dove, costo, sconsigliato, catalogo_chiave, nota FROM confidente_regalo WHERE ${CHIAVE} = ?`).get(chiave) as RigaRegalo;

const regalo: DefRiga = {
  modalita: 'riga', etichetta: 'Regalo', tabella: 'confidente_regalo', colonnaChiave: CHIAVE,
  chiavi: () => (prepared(`SELECT ${CHIAVE} FROM confidente_regalo ORDER BY confidente_chiave, ordine`).pluck().all() as string[]),
  esiste: (chiave) => !!prepared(`SELECT 1 FROM confidente_regalo WHERE ${CHIAVE} = ?`).get(chiave),
  campi: () => [
    { p: 'catalogo_chiave', e: 'Oggetto del catalogo', t: 'oggetto' } as CampoDef,
    { p: 'dove', e: 'Dove si compra', t: 'testo', nullable: true, max: 300 } as CampoDef,
    { p: 'costo', e: 'Costo', t: 'testo', nullable: true, max: 200 } as CampoDef,
    { p: 'sconsigliato', e: 'Sconsigliato (non dà punti)', t: 'booleano' } as CampoDef,
    { p: 'nota', e: 'Nota', t: 'testolungo', nullable: true, max: 2000 } as CampoDef,
  ],
  leggi: (chiave) => {
    const r = riga(chiave);
    const v: Valori = { catalogo_chiave: r.catalogo_chiave, dove: r.dove, costo: r.costo, sconsigliato: r.sconsigliato === 1, nota: r.nota };
    return v;
  },
  scrivi: (chiave, v) => {
    if (v.catalogo_chiave !== undefined) prepared(`UPDATE confidente_regalo SET catalogo_chiave = ? WHERE ${CHIAVE} = ?`).run(str(v.catalogo_chiave), chiave);
    if (v.dove !== undefined) prepared(`UPDATE confidente_regalo SET dove = ? WHERE ${CHIAVE} = ?`).run(str(v.dove), chiave);
    if (v.costo !== undefined) prepared(`UPDATE confidente_regalo SET costo = ? WHERE ${CHIAVE} = ?`).run(str(v.costo), chiave);
    if (v.sconsigliato !== undefined) prepared(`UPDATE confidente_regalo SET sconsigliato = ? WHERE ${CHIAVE} = ?`).run(v.sconsigliato === true ? 1 : 0, chiave);
    if (v.nota !== undefined) prepared(`UPDATE confidente_regalo SET nota = ? WHERE ${CHIAVE} = ?`).run(str(v.nota), chiave);
  },
  nome: (chiave) => {
    const r = riga(chiave);
    const dal = r.catalogo_chiave ? prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck().get(r.catalogo_chiave) as string | undefined : undefined;
    return dal ?? r.nome;
  },
  valida: (_chiave, fusi) => {
    const k = fusi.catalogo_chiave;
    if (typeof k === 'string' && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(k)) throw httpErrors.notFound('oggetto-non-trovato', `L'oggetto '${k}' non esiste nel catalogo.`);
  },
  // rimettere la fotografia non può puntare a un oggetto sparito dal catalogo
  verificaRipristino: (_chiave, guida) => {
    const k = guida.catalogo_chiave;
    if (typeof k === 'string' && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(k)) throw httpErrors.conflict('oggetto-originale-mancante', `L'oggetto '${k}' della guida non esiste più nel catalogo: il regalo resta com'è.`);
  },
};

export const DEFINIZIONI_CONFIDENTI: { regalo: DefRiga } = { regalo };
