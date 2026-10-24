// ============================================================
// righeComuni — gli attrezzi per dichiarare un oggetto «a riga» le cui colonne sono i campi (L11 · R11-17/1)
// ============================================================
//
// Per le tabelle di dati di gioco dove ogni campo corretto è una colonna della riga (nome, testo, esito, un sì/no…). Una `Colonna` lega un campo del registro
// a una colonna e dice come passare dal valore del database al valore del campo e ritorno; `rigaDaColonne` costruisce il `DefRiga` (lettura, scrittura,
// esistenza, elenco delle chiavi) e lascia a chi la usa le sole particolarità (nome, controlli, copie). Le tabelle con righe figlie (ingredienti, persone di
// un set, modificatori…) si scrivono a mano nel loro file.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import type { CampoDef } from './registro.js';
import type { ContestoPropagazione, DefRiga, Valori } from './righe.js';

export const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);

/**
 * Come il valore del database diventa il valore del campo:
 *  - `testo`: NULL ↔ null (un campo non annullabile legge '' al posto di NULL);
 *  - `testoVuoto`: la stringa vuota ↔ null (il campo è annullabile, la colonna è NOT NULL DEFAULT '');
 *  - `numero`: numero o NULL;
 *  - `bool`: 1/0 ↔ sì/no;
 *  - `scelta`: testo; NULL ↔ '' (l'opzione «nessuna» ha chiave '');
 *  - `sceltaNum`: intero; NULL ↔ '' (le chiavi delle opzioni sono i numeri come testo).
 */
export type Conv = 'testo' | 'testoVuoto' | 'numero' | 'bool' | 'scelta' | 'sceltaNum';
export interface Colonna { campo: CampoDef; col: string; conv: Conv }

export const colonna = (campo: CampoDef, col: string, conv: Conv): Colonna => ({ campo, col, conv });

export function daDatabase(c: Colonna, raw: unknown): ValoreCampoCorrezione {
  switch (c.conv) {
    case 'testo': return typeof raw === 'string' ? raw : (c.campo.nullable ? null : '');
    case 'testoVuoto': return typeof raw === 'string' && raw !== '' ? raw : null;
    case 'numero': return typeof raw === 'number' ? raw : null;
    case 'bool': return raw === 1;
    case 'scelta': return typeof raw === 'string' ? raw : '';
    case 'sceltaNum': return typeof raw === 'number' ? String(raw) : '';
  }
}

export function perDatabase(c: Colonna, v: ValoreCampoCorrezione): string | number | null {
  switch (c.conv) {
    case 'testo': return str(v) ?? (c.campo.nullable ? null : '');
    case 'testoVuoto': return str(v) ?? '';
    case 'numero': return typeof v === 'number' ? v : null;
    case 'bool': return v === true ? 1 : 0;
    case 'scelta': return typeof v === 'string' && v !== '' ? v : null;
    case 'sceltaNum': return typeof v === 'string' && v !== '' ? Number(v) : null;
  }
}

export interface OpzioniRiga {
  etichetta: string;
  tabella: string;
  /** Espressione SQL che identifica la riga: una colonna, o per esempio `a || ':' || b`, o `CAST(rowid AS TEXT)`. */
  colonnaChiave: string;
  aggiornataSempre?: boolean;
  /** `ORDER BY` per l'elenco delle chiavi (default: la stessa espressione). */
  ordine?: string;
  /** Condizione SQL in più per l'elenco e l'esistenza (le righe che si correggono). */
  doveSql?: string;
  colonne: Colonna[] | ((chiave: string) => Colonna[]);
  nome: (chiave: string, v: Valori) => string;
  valida?: (chiave: string, fusi: Valori) => void;
  propaga?: (chiave: string, prima: Valori, dopo: Valori, ctx: ContestoPropagazione) => void;
  verificaRipristino?: (chiave: string, guida: Valori) => void;
}

/** Un oggetto «a riga» fatto di colonne: lettura, scrittura, esistenza ed elenco delle chiavi si ricavano dalla tabella. */
export function rigaDaColonne(o: OpzioniRiga): DefRiga {
  const colonneDi = (chiave: string): Colonna[] => (typeof o.colonne === 'function' ? o.colonne(chiave) : o.colonne);
  const dove = o.doveSql ? ` AND (${o.doveSql})` : '';
  const def: DefRiga = {
    modalita: 'riga', etichetta: o.etichetta, tabella: o.tabella, colonnaChiave: o.colonnaChiave,
    ...(o.aggiornataSempre ? { aggiornataSempre: true } : {}),
    chiavi: () => (prepared(`SELECT DISTINCT ${o.colonnaChiave} AS k FROM ${o.tabella} WHERE 1 = 1${dove} ORDER BY ${o.ordine ?? o.colonnaChiave}`).pluck().all() as string[]),
    esiste: (chiave) => !!prepared(`SELECT 1 FROM ${o.tabella} WHERE ${o.colonnaChiave} = ?${dove}`).get(chiave),
    campi: (chiave) => colonneDi(chiave).map((c) => c.campo),
    leggi: (chiave) => {
      const cols = colonneDi(chiave);
      const r = prepared(`SELECT ${cols.map((c) => `"${c.col}"`).join(', ')} FROM ${o.tabella} WHERE ${o.colonnaChiave} = ?`).get(chiave) as Record<string, unknown>;
      return Object.fromEntries(cols.map((c) => [c.campo.p, daDatabase(c, r[c.col])]));
    },
    scrivi: (chiave, v) => {
      for (const c of colonneDi(chiave)) {
        const nuovo = v[c.campo.p];
        if (nuovo === undefined) continue;
        prepared(`UPDATE ${o.tabella} SET "${c.col}" = ? WHERE ${o.colonnaChiave} = ?`).run(perDatabase(c, nuovo), chiave);
      }
    },
    nome: o.nome,
  };
  if (o.valida) def.valida = o.valida;
  if (o.propaga) def.propaga = o.propaga;
  if (o.verificaRipristino) def.verificaRipristino = o.verificaRipristino;
  return def;
}

/** Le sole opzioni di una colonna con chiave testo: da un elenco di coppie. */
export const opzioni = (coppie: Array<[string, string]>): Array<{ chiave: string; nome: string }> => coppie.map(([chiave, nome]) => ({ chiave, nome }));

/** 400 se la scelta non è fra le opzioni del campo (il servizio lo controlla già per i campi `scelta`; qui per i riferimenti liberi). */
export function esigiEsistente(sql: string, valore: string, descrizione: string, campo: string): void {
  if (!prepared(sql).get(valore)) throw httpErrors.badRequest('valore-non-valido', `${descrizione} «${valore}» non esiste.`, { campo });
}
