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
// la chiave, l'ordine e le date d'esame (ricavate dalle righe) non si correggono. L13 (ondata 7, O7-2): si correggono qui anche i premi per
// piazzamento e il requisito di Conoscenza del primo posto (colonne della 311); in `esame_premi` restano solo le note generali.
// Il nome decide se l'esame è «di metà» o «di fine» semestre, la data dei risultati dove finiscono le sue domande e da quando vale il suo
// bonus: i controlli stanno in `esamiCollegamento` (409 se una correzione sposterebbe domande da un esame all'altro).
// ============================================================

import { prepared } from '../../db/dbService.js';
import { dataLeggibile } from '../../../shared/condizioniSpillo.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import { giorniPossibiliPerRisultati, verificaCorrezioneEsame } from '../esamiCollegamento.js';
import type { CampoDef } from './registro.js';
import type { DefRiga } from './righe.js';
import { leggiPremiEsame, leggiRequisitoConoscenza, PIAZZAMENTI_ESAME } from '../../../shared/puntiConfidenti.js';
import { DOTI_SOCIALI, eDote } from '../../../shared/doti.js';
import { simboliNote } from '../../../shared/note.js';

/** L13 (ondata 7, O7-2): la riga ha le colonne dei premi (dalla 311). */
const conPremi = (r: RigaEsame): boolean => 'premi_json' in r && 'requisito_conoscenza' in r;

const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);

interface RigaEsame { nome: string; data_risultati: string | null; note: string; premi_json?: string | null; requisito_conoscenza?: string | null }
// `SELECT *`: su uno schema di prima della 311 le colonne dei premi non ci sono
const rigaEsame = (chiave: string): RigaEsame => prepared('SELECT * FROM esame WHERE chiave = ?').get(chiave) as RigaEsame;

// ---- L13 (ondata 7, O7-2): premi per piazzamento e requisito di Conoscenza, il loro unico punto di modifica ----
// Un campo per Dote e piazzamento («Primi 10 · Fascino»: nessuna, ♪, ♪♪, ♪♪♪) e uno per il trofeo del piazzamento; il requisito come rango e
// «tutte le risposte giuste». Si scrivono nelle colonne `esame.premi_json` e `esame.requisito_conoscenza` (forma unica di `shared/puntiConfidenti.ts`).
const campoNote = (piazzamento: string, dote: string): string => `premio/${piazzamento}/${dote}`;
const campoTrofeo = (piazzamento: string): string => `premio/${piazzamento}/trofeo`;
const NOTE_PREMIO = [{ chiave: '0', nome: 'Nessuna' }, { chiave: '1', nome: simboliNote(1) }, { chiave: '2', nome: simboliNote(2) }, { chiave: '3', nome: simboliNote(3) }];
const RANGHI = [1, 2, 3, 4, 5].map((r) => ({ chiave: String(r), nome: `Rango ${r}` }));

function valoriPremi(r: RigaEsame): Record<string, ValoreCampoCorrezione> {
  const premi = leggiPremiEsame(r.premi_json, eDote) ?? [];
  const req = leggiRequisitoConoscenza(r.requisito_conoscenza);
  const out: Record<string, ValoreCampoCorrezione> = {};
  for (const { chiave: p } of PIAZZAMENTI_ESAME) {
    const premio = premi.find((x) => x.piazzamento === p);
    for (const { chiave: d } of DOTI_SOCIALI) out[campoNote(p, d)] = String(premio?.doti.find((x) => x.dote === d)?.note ?? 0);
    out[campoTrofeo(p)] = premio?.trofeo ?? null;
  }
  out.requisito_rango = req ? String(req.rango) : null;
  out.requisito_tutte_corrette = req?.tutteCorrette ?? false;
  return out;
}

/** I premi e il requisito dai valori dei campi (quelli di adesso fusi con i cambiati); null dove non c'è niente. */
function premiDaValori(v: Record<string, ValoreCampoCorrezione | undefined>): { premi: string | null; requisito: string | null } {
  const premi = PIAZZAMENTI_ESAME.flatMap(({ chiave: p }) => {
    const doti = DOTI_SOCIALI.flatMap(({ chiave: d }) => { const n = Number(v[campoNote(p, d)] ?? 0); return n === 1 || n === 2 || n === 3 ? [{ dote: d, note: n as 1 | 2 | 3 }] : []; });
    const trofeo = str(v[campoTrofeo(p)]);
    return doti.length || trofeo ? [{ piazzamento: p, doti, ...(trofeo ? { trofeo } : {}) }] : [];
  });
  const rango = Number(str(v.requisito_rango) ?? NaN);
  return {
    premi: premi.length ? JSON.stringify(premi) : null,
    requisito: Number.isInteger(rango) && rango >= 1 && rango <= 5 ? JSON.stringify({ rango, tutteCorrette: v.requisito_tutte_corrette === true }) : null,
  };
}

function campiPremi(): CampoDef[] {
  const trofei = (prepared('SELECT chiave, nome FROM trofeo ORDER BY ordine').all() as Array<{ chiave: string; nome: string }>);
  return [
    ...PIAZZAMENTI_ESAME.flatMap(({ chiave: p, nome }) => [
      ...DOTI_SOCIALI.map(({ chiave: d, nome: nd }): CampoDef => ({ p: campoNote(p, d), e: nd, t: 'scelta', opzioni: NOTE_PREMIO, gruppo: `Premio · ${nome}` })),
      { p: campoTrofeo(p), e: 'Trofeo', t: 'scelta', nullable: true, opzioni: trofei, gruppo: `Premio · ${nome}` } as CampoDef,
    ]),
    { p: 'requisito_rango', e: 'Conoscenza per il primo posto', t: 'scelta', nullable: true, opzioni: RANGHI, gruppo: 'Primo posto' },
    { p: 'requisito_tutte_corrette', e: 'Servono tutte le risposte giuste', t: 'booleano', gruppo: 'Primo posto' },
  ];
}

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
      // L13 (ondata 7, O7-2): premi e requisito solo dove la 311 ha messo le colonne
      ...(conPremi(r) ? campiPremi() : []),
    ];
  },
  leggi: (chiave) => {
    const r = rigaEsame(chiave);
    return { nome: r.nome, data_risultati: r.data_risultati ?? '', note: r.note === '' ? null : r.note, ...(conPremi(r) ? valoriPremi(r) : {}) };
  },
  scrivi: (chiave, v) => {
    if (v.nome !== undefined) prepared('UPDATE esame SET nome = ? WHERE chiave = ?').run(str(v.nome) ?? '', chiave);
    if (v.data_risultati !== undefined) prepared('UPDATE esame SET data_risultati = ? WHERE chiave = ?').run(str(v.data_risultati) || null, chiave);
    if (v.note !== undefined) prepared('UPDATE esame SET note = ? WHERE chiave = ?').run(str(v.note) ?? '', chiave);
    const r = rigaEsame(chiave);
    if (conPremi(r) && Object.keys(v).some((k) => k.startsWith('premio/') || k.startsWith('requisito_'))) {
      const nuovi = premiDaValori({ ...valoriPremi(r), ...v });
      prepared('UPDATE esame SET premi_json = ?, requisito_conoscenza = ? WHERE chiave = ?').run(nuovi.premi, nuovi.requisito, chiave);
    }
  },
  // una fotografia presa prima della 311 non ha i campi dei premi: valgono quelli di adesso (la correzione di prima non li toccava)
  normalizzaGuida: (guida, chiave) => {
    const r = rigaEsame(chiave);
    return conPremi(r) ? { ...valoriPremi(r), ...guida } : guida;
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
