// ============================================================
// 191 — le domande d'esame in un solo posto: `domanda` (L9 · R9-18)
// ============================================================
//
// Le 31 domande dei 4 esami stavano in due copie: `esame.domande_json` ({data, ordine, domanda, risposta}) e `domanda.risposte_json` delle 12 righe
// riassuntive di tipo `esame-medio`/`esame-finale` ({ordine, testo, domanda}), una riga per giorno d'esame. Le due copie coincidono (analisi dati
// 2026-10-24): la fonte unica sono le righe di `domanda`; la data vive su `domanda.data`; `esame.data_risultati` resta sull'esame.
// L'esame si collega alle sue righe per tipo (metà → esame-medio, fine → esame-finale, dal nome) e per data: le righe di quel tipo dopo i risultati
// dell'esame precedente dello stesso tipo e fino ai suoi risultati. Id e chiavi delle righe `domanda` non cambiano: nessun segno di partita si muove.
//
// Prima si controlla, elemento per elemento, che ogni voce di `esame.domande_json` esista in `domanda` (stesso giorno, stesso quesito, stessa
// risposta) e che ogni domanda delle righe collegate sia in `domande_json` (31/31); le date dell'esame devono essere i giorni distinti delle sue
// righe. Se un solo elemento non coincide la migrazione si ferma senza toccare niente. Poi `domande_json` e `date_json` si archiviano in
// `dati_guida.archivio-frasi-l11` (colonne `esame.domande_json` e `esame.date_json`, chiave = esame) e si svuotano (`[]`, le colonne sono NOT NULL).
// Idempotente: con le colonne già vuote non fa niente. Scrive solo in `main`; le altre tabelle si controllano per impronta.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`191: ${motivo}; nessuna modifica applicata.`); };

interface RigaEsame { chiave: string; ordine: number; nome: string; date_json: string; data_risultati: string | null; domande_json: string }
interface RigaDomanda { id: number; data: string; tipo: string; ordine: number; risposte_json: string }
interface VoceEsame { data: string; domanda: string; risposta: string }

/** Indice di una data di gioco 'MM-GG' nell'anno scolastico (aprile → marzo), solo per ordinare (lo stesso di `ordineGioco`, senza importare i servizi). */
function indice(data: string): number {
  const m = Number(data.slice(0, 2));
  return ((m + 8) % 12) * 100 + Number(data.slice(3, 5));
}

const tipoDi = (nome: string): string => /metà/i.test(nome) ? 'esame-medio' : /fine/i.test(nome) ? 'esame-finale' : errore(`il nome «${nome}» non dice se l'esame è di metà o di fine semestre`);

const INTATTE = ['domanda', 'domanda_partita', 'esame_premi', 'esame_piazzamento_partita', 'evento_calendario', 'voce_giornata', 'voce_effetto'] as const;

export const migration191: Migration = {
  id: 191, name: 'esami_domande_in_un_solo_posto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'esame') || !esisteTabella(db, 'domanda')) return;
    if (!haColonna(db, 'esame', 'domande_json') || !haColonna(db, 'esame', 'date_json')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const esami = db.prepare('SELECT chiave, ordine, nome, date_json, data_risultati, domande_json FROM main.esame ORDER BY ordine').all() as RigaEsame[];
    if (esami.every((e) => e.domande_json === '[]' && e.date_json === '[]')) return;

    const righe = db.prepare("SELECT id, data, tipo, ordine, risposte_json FROM main.domanda WHERE tipo IN ('esame-medio','esame-finale') ORDER BY ordine").all() as RigaDomanda[];
    const prima = new Map<string, string>();
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const impronteEsame = improntaTabella(db, 'esame', ['domande_json', 'date_json']);

    // il collegamento riga → esame: per tipo, dopo i risultati dell'esame precedente dello stesso tipo e fino ai suoi
    const perEsame = new Map<string, RigaDomanda[]>();
    const risultatiPrecedenti = new Map<string, number>();
    for (const e of esami) {
      const tipo = tipoDi(e.nome);
      if (!e.data_risultati) errore(`l'esame ${e.chiave} non ha la data dei risultati`);
      const fino = indice(e.data_risultati!);
      const da = risultatiPrecedenti.get(tipo) ?? -1;
      perEsame.set(e.chiave, righe.filter((r) => r.tipo === tipo && indice(r.data) > da && indice(r.data) <= fino));
      risultatiPrecedenti.set(tipo, fino);
    }
    const collegate = [...perEsame.values()].reduce((s, r) => s + r.length, 0);
    if (collegate !== righe.length) errore(`${righe.length - collegate} righe d'esame non si collegano a nessun esame`);

    let controllate = 0;
    for (const e of esami) {
      const mie = perEsame.get(e.chiave)!;
      const vecchie = JSON.parse(e.domande_json) as VoceEsame[];
      const nuove = mie.flatMap((r) => (JSON.parse(r.risposte_json) as Array<{ testo: string; domanda: string }>).map((x) => ({ data: r.data, domanda: x.domanda, risposta: x.testo })));
      if (vecchie.length !== nuove.length) errore(`${e.chiave}: ${vecchie.length} domande nell'esame contro ${nuove.length} nelle righe`);
      for (const v of vecchie) {
        if (!nuove.some((n) => n.data === v.data && n.domanda === v.domanda && n.risposta === v.risposta)) errore(`${e.chiave}: la domanda del ${v.data} «${v.domanda}» non coincide con nessuna delle righe`);
        controllate++;
      }
      const giorni = [...new Set(mie.map((r) => r.data))].sort((a, b) => indice(a) - indice(b));
      const date = (JSON.parse(e.date_json) as string[]).slice().sort((a, b) => indice(a) - indice(b));
      if (JSON.stringify(giorni) !== JSON.stringify(date)) errore(`${e.chiave}: i giorni dell'esame (${date.join(', ')}) non sono quelli delle sue righe (${giorni.join(', ')})`);
    }

    const colonne = { 'esame.domande_json': righeConValore(db, 'esame', 'domande_json', ['', '[]']), 'esame.date_json': righeConValore(db, 'esame', 'date_json', ['', '[]']) };
    archiviaFrasi(db, 'L9 · 191', colonne, { 'esame.domande_json': { controllate, righeDomanda: righe.length } });
    db.exec("UPDATE main.esame SET domande_json = '[]', date_json = '[]'");

    for (const [c, v] of Object.entries(colonne)) if (archiviate(db, c) !== Object.keys(v).length) errore(`l'archivio di ${c} non ha ${Object.keys(v).length} righe`);
    if (improntaTabella(db, 'esame', ['domande_json', 'date_json']) !== impronteEsame) errore('le altre colonne di esame sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L9-R9-18-191', esami: esami.length, domandeControllate: controllate, righeDomanda: righe.length }, 'esami: domande e giorni letti solo da domanda');
  },
};
