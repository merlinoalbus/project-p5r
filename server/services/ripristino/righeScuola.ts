// ============================================================
// righeScuola — gli esami, correggibili e ripristinabili (L11 · R11-15/7)
// ============================================================
//
// Un oggetto «a riga» del registro dei ripristini (`righe.ts`): l'esame (`esame`, quattro righe). Il valore della guida è la fotografia
// `seed_json` presa alla prima correzione (colonne `origine`, `seed_json`, `updated_at` della migrazione 198), che `ripristinoService` gestisce
// come per quartieri e trofei.
//
// Si correggono: il nome, la data dei risultati (una scelta fra i giorni che non spostano nessuna domanda) e le note. Le domande e i giorni
// d'esame NON stanno qui: dopo R9-18 vivono solo nelle righe di `domanda`, che si correggono e si ripristinano dal catalogo (stesso `seed_json`);
// la chiave, l'ordine e le date d'esame (ricavate dalle righe) non si correggono. I premi (`esame_premi`) non fanno parte di questo oggetto.
// Il nome decide se l'esame è «di metà» o «di fine» semestre, la data dei risultati dove finiscono le sue domande e da quando vale il suo
// bonus: i controlli stanno in `esamiCollegamento` (409 se una correzione sposterebbe domande da un esame all'altro).
// ============================================================

import { prepared } from '../../db/dbService.js';
import { dataLeggibile } from '../../../shared/condizioniSpillo.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import { giorniPossibiliPerRisultati, verificaCorrezioneEsame } from '../esamiCollegamento.js';
import type { CampoDef } from './registro.js';
import type { DefRiga } from './righe.js';

const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);

interface RigaEsame { nome: string; data_risultati: string | null; note: string }
const rigaEsame = (chiave: string): RigaEsame => prepared('SELECT nome, data_risultati, note FROM esame WHERE chiave = ?').get(chiave) as RigaEsame;

const esame: DefRiga = {
  modalita: 'riga', etichetta: 'Esame', tabella: 'esame', colonnaChiave: 'chiave',
  chiavi: () => (prepared('SELECT chiave FROM esame ORDER BY ordine').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM esame WHERE chiave = ?').get(chiave),
  campi: (chiave) => {
    const r = rigaEsame(chiave);
    // il valore di adesso e quello della guida devono essere fra le opzioni anche se uscissero dalla finestra (dati già corretti altrove)
    const giorni = new Set(giorniPossibiliPerRisultati(chiave));
    if (r.data_risultati) giorni.add(r.data_risultati);
    const opzioni = [...giorni].map((d) => ({ chiave: d, nome: dataLeggibile(d) }));
    return [
      { p: 'nome', e: 'Nome', t: 'testo', max: 80 } as CampoDef,
      { p: 'data_risultati', e: 'Data dei risultati', t: 'scelta', opzioni } as CampoDef,
      { p: 'note', e: 'Note', t: 'testolungo', nullable: true, max: 2000 } as CampoDef,
    ];
  },
  leggi: (chiave) => {
    const r = rigaEsame(chiave);
    return { nome: r.nome, data_risultati: r.data_risultati ?? '', note: r.note === '' ? null : r.note };
  },
  scrivi: (chiave, v) => {
    if (v.nome !== undefined) prepared('UPDATE esame SET nome = ? WHERE chiave = ?').run(str(v.nome) ?? '', chiave);
    if (v.data_risultati !== undefined) prepared('UPDATE esame SET data_risultati = ? WHERE chiave = ?').run(str(v.data_risultati) || null, chiave);
    if (v.note !== undefined) prepared('UPDATE esame SET note = ? WHERE chiave = ?').run(str(v.note) ?? '', chiave);
  },
  nome: (_chiave, v) => String(v.nome),
  valida: (chiave, fusi) => {
    const nome = typeof fusi.nome === 'string' ? fusi.nome : undefined;
    const data = typeof fusi.data_risultati === 'string' ? (fusi.data_risultati === '' ? null : fusi.data_risultati) : undefined;
    verificaCorrezioneEsame(chiave, { ...(nome !== undefined ? { nome } : {}), ...(data !== undefined ? { data_risultati: data } : {}) });
  },
  // rimettere la fotografia non può spostare domande più di quanto potesse la correzione: stessi controlli sui valori della guida
  verificaRipristino: (chiave, guida) => {
    const nome = typeof guida.nome === 'string' ? guida.nome : undefined;
    const data = typeof guida.data_risultati === 'string' ? (guida.data_risultati === '' ? null : guida.data_risultati) : undefined;
    verificaCorrezioneEsame(chiave, { ...(nome !== undefined ? { nome } : {}), ...(data !== undefined ? { data_risultati: data } : {}) });
  },
};

export const DEFINIZIONI_SCUOLA: { esame: DefRiga } = { esame };
