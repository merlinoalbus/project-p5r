// ============================================================
// righe — gli oggetti della guida che stanno in una riga di tabella (L11 · B11)
// ============================================================
//
// Quartiere, trofeo, Dote sociale (con i suoi cinque ranghi) e trasformazione di Jose. La correzione è un UPDATE sul posto: tutti i lettori
// esistenti restano com'erano. Il valore della guida è la fotografia `seed_json` della riga, presa alla prima correzione (colonne
// `origine`, `seed_json`, `updated_at` della migrazione 178), che `ripristinaService` gestisce in modo uguale per tutti i tipi.
// ============================================================

import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import { getDb, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { chiaveImmagineQuartiere } from '../cittaService.js';
import { sincronizzaPercorsiMappe } from '../mappe/percorsiMappe.js';
import type { CampoDef } from './registro.js';
import { DEFINIZIONI_CALENDARIO } from './righeCalendario.js';
import { DEFINIZIONI_OMBRA } from './righeOmbra.js';
import { DEFINIZIONI_SCUOLA } from './righeScuola.js';

export type Valori = Record<string, ValoreCampoCorrezione>;

/** Il contesto di una propagazione: `ripristino` dice se si sta rimettendo la guida; `traccia` (chiavi che iniziano con «~») si conserva nella fotografia e non è un campo. */
export interface ContestoPropagazione { ripristino: boolean; traccia: Valori }

export interface DefRiga {
  modalita: 'riga';
  etichetta: string;
  /** Tabella con le colonne `origine`, `seed_json`, `updated_at` e la colonna della chiave. */
  tabella: string;
  colonnaChiave: string;
  /** La colonna `updated_at` della tabella è NOT NULL (l'Ombra, migrazione 166): senza correzione si rimette l'ora, non NULL. */
  aggiornataSempre?: boolean;
  chiavi(): string[];
  esiste(chiave: string): boolean;
  campi(chiave: string): CampoDef[];
  /** I valori correnti dei campi registrati (una chiave per `percorso`). */
  leggi(chiave: string): Valori;
  /** Scrive i soli campi indicati. */
  scrivi(chiave: string, valori: Valori): void;
  nome(chiave: string, valori: Valori): string;
  /** Invarianti sull'insieme dei valori dopo la correzione (lancia). */
  valida?(chiave: string, fusi: Valori): void;
  /** Dopo una correzione o un ripristino, le copie del dato altrove (nella stessa transazione). */
  propaga?(chiave: string, prima: Valori, dopo: Valori, ctx: ContestoPropagazione): void;
  /** Prima di rimettere la fotografia (lancia 409 se un riferimento della guida non esiste più). */
  verificaRipristino?(chiave: string, guida: Valori): void;
}

const bool = (v: ValoreCampoCorrezione | undefined): number => (v === true ? 1 : 0);
const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);
const T = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'testo', ...o });
const L = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'testolungo', ...o });
const B = (p: string, e: string): CampoDef => ({ p, e, t: 'booleano' });

// ---- Quartiere (nome e descrizione; lo sblocco e l'ingresso hanno già il loro editor) ----

const quartiere: DefRiga = {
  modalita: 'riga', etichetta: 'Quartiere', tabella: 'quartiere', colonnaChiave: 'chiave',
  // «Entrata dei Memento» sta nella tabella ma non è un quartiere (cittaService)
  chiavi: () => (prepared("SELECT chiave FROM quartiere WHERE chiave <> 'mementos' ORDER BY ordine").pluck().all() as string[]),
  esiste: (chiave) => chiave !== 'mementos' && !!prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(chiave),
  campi: () => [T('nome', 'Nome'), L('descrizione', 'Descrizione')],
  leggi: (chiave) => {
    const r = prepared('SELECT nome, descrizione FROM quartiere WHERE chiave = ?').get(chiave) as { nome: string; descrizione: string };
    return { nome: r.nome, descrizione: r.descrizione };
  },
  scrivi: (chiave, v) => {
    for (const col of ['nome', 'descrizione'] as const) if (v[col] !== undefined) prepared(`UPDATE quartiere SET ${col} = ? WHERE chiave = ?`).run(str(v[col]) ?? '', chiave);
  },
  nome: (_chiave, v) => String(v.nome),
  // Il nome del quartiere ha una copia nella sua mappa (`mappa.nome`) e, da lì, nei percorsi delle mappe (`mappa_percorso`): la mappa segue il
  // quartiere finché i due nomi erano uguali (se l'utente ha dato un altro nome alla mappa, resta il suo). Vale in entrambi i sensi, quindi anche
  // per il ripristino. I percorsi si rifanno con la funzione unica, che tiene gli indirizzi di prima come alias.
  // Gli indirizzi che la sincronizzazione crea come alias per via del cambio di nome (quelli di prima, che restano validi) si ricordano nella
  // fotografia (`~alias`): rimettendo il nome della guida si tolgono con quelli provvisori, perché il ripristino deve lasciare le mappe com'erano.
  propaga: (chiave, prima, dopo, ctx) => {
    if (prima.nome === dopo.nome) return;
    const mappa = chiaveImmagineQuartiere(chiave);
    const r = prepared('SELECT nome FROM mappa WHERE chiave = ?').get(mappa) as { nome: string } | undefined;
    if (!r || r.nome !== prima.nome) return;
    const aliasPrima = new Set(prepared('SELECT chiave FROM mappa_alias').pluck().all() as string[]);
    // il nome della mappa segue quello del quartiere: non è una modifica della mappa, quindi `updated_at` non si tocca
    prepared('UPDATE mappa SET nome = ? WHERE chiave = ?').run(String(dopo.nome), mappa);
    sincronizzaPercorsiMappe(getDb());
    const nuovi = (prepared('SELECT chiave FROM mappa_alias').pluck().all() as string[]).filter((a) => !aliasPrima.has(a));
    const ricordati = Array.isArray(ctx.traccia['~alias']) ? ctx.traccia['~alias'] : [];
    if (ctx.ripristino) {
      for (const a of new Set([...nuovi, ...ricordati])) prepared('DELETE FROM mappa_alias WHERE chiave = ?').run(a);
      ctx.traccia['~alias'] = [];
    } else {
      ctx.traccia['~alias'] = [...new Set([...ricordati, ...nuovi])];
    }
  },
};

// ---- Trofeo ----

const TIPI_TROFEO = [{ chiave: 'bronzo', nome: 'Bronzo' }, { chiave: 'argento', nome: 'Argento' }, { chiave: 'oro', nome: 'Oro' }, { chiave: 'platino', nome: 'Platino' }];
const MANCABILE = [{ chiave: '', nome: 'Non detto' }, { chiave: '1', nome: 'Sì, si può perdere' }, { chiave: '0', nome: 'No, non si perde' }];
interface RigaTrofeo { nome: string; nome_en: string | null; tipo: string; descrizione: string; come: string; mancabile: number | null; quando: string | null; fonte: string; verificato: number }

const trofeo: DefRiga = {
  modalita: 'riga', etichetta: 'Trofeo', tabella: 'trofeo', colonnaChiave: 'chiave',
  chiavi: () => (prepared('SELECT chiave FROM trofeo ORDER BY ordine').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM trofeo WHERE chiave = ?').get(chiave),
  campi: () => [
    T('nome', 'Nome'), T('nome_en', 'Nome inglese', { nullable: true }),
    { p: 'tipo', e: 'Tipo', t: 'scelta', opzioni: TIPI_TROFEO },
    L('descrizione', 'Descrizione'), L('come', 'Come si ottiene'),
    { p: 'mancabile', e: 'Si può perdere', t: 'scelta', opzioni: MANCABILE },
    T('quando', 'Quando', { nullable: true }), L('fonte', 'Fonte'), B('verificato', 'Verificato'),
  ],
  leggi: (chiave) => {
    const r = prepared('SELECT nome, nome_en, tipo, descrizione, come, mancabile, quando, fonte, verificato FROM trofeo WHERE chiave = ?').get(chiave) as RigaTrofeo;
    return { nome: r.nome, nome_en: r.nome_en, tipo: r.tipo, descrizione: r.descrizione, come: r.come, mancabile: r.mancabile === null ? '' : String(r.mancabile), quando: r.quando, fonte: r.fonte, verificato: r.verificato === 1 };
  },
  scrivi: (chiave, v) => {
    for (const col of ['nome', 'tipo', 'descrizione', 'come', 'fonte'] as const) if (v[col] !== undefined) prepared(`UPDATE trofeo SET ${col} = ? WHERE chiave = ?`).run(str(v[col]) ?? '', chiave);
    for (const col of ['nome_en', 'quando'] as const) if (v[col] !== undefined) prepared(`UPDATE trofeo SET ${col} = ? WHERE chiave = ?`).run(str(v[col]), chiave);
    if (v.mancabile !== undefined) prepared('UPDATE trofeo SET mancabile = ? WHERE chiave = ?').run(v.mancabile === '' ? null : Number(v.mancabile), chiave);
    if (v.verificato !== undefined) prepared('UPDATE trofeo SET verificato = ? WHERE chiave = ?').run(bool(v.verificato), chiave);
  },
  nome: (_chiave, v) => String(v.nome),
};

// ---- Dote sociale: nome, e per ognuno dei cinque ranghi nome e soglia ----

const RANGHI = [1, 2, 3, 4, 5] as const;
const SOGLIA_MASSIMA = 100000;
const doteSociale: DefRiga = {
  modalita: 'riga', etichetta: 'Dote sociale', tabella: 'dote_sociale', colonnaChiave: 'chiave',
  chiavi: () => (prepared('SELECT chiave FROM dote_sociale ORDER BY ordine').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM dote_sociale WHERE chiave = ?').get(chiave),
  campi: (chiave) => {
    const presenti = new Set(prepared('SELECT rango FROM dote_sociale_rango WHERE dote_chiave = ?').pluck().all(chiave) as number[]);
    return [
      T('nome', 'Nome della Dote', { max: 40 }),
      ...RANGHI.filter((n) => presenti.has(n)).flatMap((n): CampoDef[] => [
        T(`rango/${n}/nome`, 'Nome del rango', { gruppo: `Rango ${n}`, max: 40 }),
        { p: `rango/${n}/soglia`, e: 'Punti per arrivarci', t: 'numero', gruppo: `Rango ${n}`, max: SOGLIA_MASSIMA },
      ]),
    ];
  },
  leggi: (chiave) => {
    const v: Valori = { nome: (prepared('SELECT nome FROM dote_sociale WHERE chiave = ?').get(chiave) as { nome: string }).nome };
    for (const r of prepared('SELECT rango, nome, soglia FROM dote_sociale_rango WHERE dote_chiave = ? ORDER BY rango').all(chiave) as Array<{ rango: number; nome: string; soglia: number }>) {
      v[`rango/${r.rango}/nome`] = r.nome;
      v[`rango/${r.rango}/soglia`] = r.soglia;
    }
    return v;
  },
  scrivi: (chiave, v) => {
    if (v.nome !== undefined) prepared('UPDATE dote_sociale SET nome = ? WHERE chiave = ?').run(str(v.nome) ?? '', chiave);
    for (const n of RANGHI) {
      if (v[`rango/${n}/nome`] !== undefined) prepared('UPDATE dote_sociale_rango SET nome = ? WHERE dote_chiave = ? AND rango = ?').run(str(v[`rango/${n}/nome`]) ?? '', chiave, n);
      if (v[`rango/${n}/soglia`] !== undefined) prepared('UPDATE dote_sociale_rango SET soglia = ? WHERE dote_chiave = ? AND rango = ?').run(Number(v[`rango/${n}/soglia`]), chiave, n);
    }
  },
  nome: (_chiave, v) => String(v.nome),
  // Il rango è derivato dai punti (`progressoDote`): cambiare una soglia sposta il rango mostrato senza toccare i punti delle partite.
  valida: (_chiave, fusi) => {
    const soglie = RANGHI.map((n) => fusi[`rango/${n}/soglia`]).filter((s): s is number => typeof s === 'number');
    if (soglie.length === 0) return;
    if (fusi['rango/1/soglia'] !== undefined && fusi['rango/1/soglia'] !== 0) throw httpErrors.conflict('soglie-non-valide', 'Il primo rango parte da zero punti.');
    for (let i = 1; i < soglie.length; i++) if (soglie[i]! <= soglie[i - 1]!) throw httpErrors.conflict('soglie-non-valide', 'Le soglie dei ranghi devono crescere: ogni rango chiede più punti del precedente.');
    if (soglie.some((s) => s > SOGLIA_MASSIMA)) throw httpErrors.conflict('soglie-non-valide', `Una soglia non può superare ${SOGLIA_MASSIMA} punti.`);
  },
};

// ---- Trasformazione di Jose (un Palazzo → cristallo e anello) ----

const trasformazione: DefRiga = {
  modalita: 'riga', etichetta: 'Trasformazione', tabella: 'trasformazione_oggetto', colonnaChiave: 'dungeon_chiave',
  chiavi: () => (prepared('SELECT dungeon_chiave FROM trasformazione_oggetto ORDER BY rowid').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM trasformazione_oggetto WHERE dungeon_chiave = ?').get(chiave),
  campi: () => [
    { p: 'cristallo_chiave', e: 'Cristallo', t: 'oggetto', nullable: true },
    { p: 'anello_chiave', e: 'Anello', t: 'oggetto', nullable: true },
    B('solo_ng_plus', 'Solo in Nuova Partita+'), L('fonte', 'Fonte'),
  ],
  leggi: (chiave) => {
    const r = prepared('SELECT cristallo_chiave, anello_chiave, solo_ng_plus, fonte FROM trasformazione_oggetto WHERE dungeon_chiave = ?').get(chiave) as { cristallo_chiave: string | null; anello_chiave: string | null; solo_ng_plus: number; fonte: string };
    return { cristallo_chiave: r.cristallo_chiave, anello_chiave: r.anello_chiave, solo_ng_plus: r.solo_ng_plus === 1, fonte: r.fonte };
  },
  scrivi: (chiave, v) => {
    for (const col of ['cristallo_chiave', 'anello_chiave'] as const) if (v[col] !== undefined) prepared(`UPDATE trasformazione_oggetto SET ${col} = ? WHERE dungeon_chiave = ?`).run(str(v[col]), chiave);
    if (v.solo_ng_plus !== undefined) prepared('UPDATE trasformazione_oggetto SET solo_ng_plus = ? WHERE dungeon_chiave = ?').run(bool(v.solo_ng_plus), chiave);
    if (v.fonte !== undefined) prepared('UPDATE trasformazione_oggetto SET fonte = ? WHERE dungeon_chiave = ?').run(str(v.fonte) ?? '', chiave);
  },
  nome: (chiave) => `Trasformazione: ${(prepared('SELECT nome FROM dungeon WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave}`,
  valida: (_chiave, fusi) => {
    for (const col of ['cristallo_chiave', 'anello_chiave']) {
      const v = fusi[col];
      if (typeof v === 'string' && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(v)) throw httpErrors.badRequest('valore-non-valido', `L'oggetto '${v}' non esiste nel catalogo.`);
    }
  },
  verificaRipristino: (_chiave, guida) => {
    for (const col of ['cristallo_chiave', 'anello_chiave']) {
      const v = guida[col];
      if (typeof v === 'string' && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(v)) throw httpErrors.conflict('oggetto-originale-mancante', `L'oggetto '${v}' della guida non esiste più nel catalogo: non si può rimettere.`);
    }
  },
};

export const DEFINIZIONI_RIGA = { quartiere, trofeo, dote: doteSociale, trasformazione, ...DEFINIZIONI_CALENDARIO, ...DEFINIZIONI_SCUOLA, ...DEFINIZIONI_OMBRA } as const;
