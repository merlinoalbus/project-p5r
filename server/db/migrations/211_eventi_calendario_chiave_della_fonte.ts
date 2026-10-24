// ============================================================
// 211 — gli eventi del Calendario ricavabili hanno la chiave della loro fonte (L9 · R9-22, R9-21/2)
// ============================================================
//
// Regola del PM (24/10): le righe di `evento_calendario` restano (stesso id, stessi collegamenti alle voci, stesso testo della guida); a ogni riga ricavabile si
// aggiunge una chiave della fonte (`evento_calendario.fonte_chiave`) e il servizio legge data (e tipo) DALLA FONTE quando la chiave c'è, così si modificano in un
// solo punto. La data copiata nella riga resta nella colonna (per le righe proprie: feste, trama, consigli) ma per le righe con chiave non viene più letta; i
// valori di prima vanno in `dati_guida.archivio-eventi-calendario-l11`. La chiave si assegna SOLO se la data della fonte coincide con quella della riga (una
// divergenza non si tocca e si elenca nel rapporto):
//   - `esame:<esame>:inizio|fine` — primo e ultimo giorno d'esame (le righe `domanda` dell'esame, R9-18);
//   - `scadenza:<dungeon>` — `dungeon.finestra_al`, per le scadenze che citano il Palazzo (nel titolo);
//   - `sblocco:confidente:<confidente>:1` — la data del requisito di rango 1 (`confidente_requisito`, tipo `data`), per gli eventi «Confidente X … rango 1»
//     di un solo Confidente (R9-21/2; Kawakami e le date di «rango massimo» o di Sae rango 2 restano dati propri);
//   - `vacanza:<giorno>` — il giorno con `giorno.tempo_libero_json` falso (giorno o sera), per gli eventi di tipo vacanza.
// Si tolgono (con tutta la riga in archivio) i soli eventi `meteo` che ripetono un'`allerta_meteo` dello stesso giorno e non hanno collegamenti a voci.
// Idempotente (colonna e indice solo se mancano; una riga con chiave non si riassegna). Scrive solo in `main`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';

const ARCHIVIO = 'archivio-eventi-calendario-l11';
const errore = (motivo: string): never => { throw new Error(`211: ${motivo}; nessuna modifica applicata.`); };

interface Evento { id: number; data: string; tipo: string; titolo: string; fonte_chiave: string | null }

const indice = (d: string): number => ((Number(d.slice(0, 2)) + 8) % 12) * 100 + Number(d.slice(3, 5));
const senzaAccenti = (t: string): string => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Primo e ultimo giorno d'esame di ogni esame, dalle righe `domanda` (stessa composizione di `domandeService.esami`, R9-18). */
function giorniDegliEsami(db: AppDatabase): Map<string, { inizio: string; fine: string }> {
  const esami = db.prepare('SELECT chiave, nome, data_risultati FROM main.esame ORDER BY ordine').all() as Array<{ chiave: string; nome: string; data_risultati: string | null }>;
  const righe = db.prepare("SELECT data, tipo FROM main.domanda WHERE tipo IN ('esame-medio','esame-finale') ORDER BY ordine").all() as Array<{ data: string; tipo: string }>;
  const precedenti = new Map<string, number>();
  const m = new Map<string, { inizio: string; fine: string }>();
  for (const e of esami) {
    const tipo = /metà/i.test(e.nome) ? 'esame-medio' : 'esame-finale';
    const fino = e.data_risultati ? indice(e.data_risultati) : Number.POSITIVE_INFINITY;
    const da = precedenti.get(tipo) ?? -1;
    precedenti.set(tipo, fino);
    const date = [...new Set(righe.filter((r) => r.tipo === tipo && indice(r.data) > da && indice(r.data) <= fino).map((r) => r.data))].sort((a, b) => indice(a) - indice(b));
    if (date.length) m.set(e.chiave, { inizio: date[0]!, fine: date[date.length - 1]! });
  }
  return m;
}

export const migration211: Migration = {
  id: 211, name: 'eventi_calendario_chiave_della_fonte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'evento_calendario') || !esisteTabella(db, 'dati_guida')) return;
    if (!haColonna(db, 'evento_calendario', 'fonte_chiave')) db.exec('ALTER TABLE main.evento_calendario ADD COLUMN fonte_chiave TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_evento_calendario_fonte ON evento_calendario(fonte_chiave) WHERE fonte_chiave IS NOT NULL');

    const eventi = db.prepare('SELECT id, data, tipo, titolo, fonte_chiave FROM main.evento_calendario ORDER BY id').all() as Evento[];
    const prima = db.prepare('SELECT COUNT(*) FROM main.evento_calendario').pluck().get() as number;
    const assegna: Array<{ id: number; chiave: string }> = [];
    const divergenti: Array<{ id: number; data: string; chiave: string; dataFonte: string }> = [];
    const prova = (e: Evento, chiave: string, dataFonte: string | null | undefined): void => {
      if (!dataFonte) return;
      if (dataFonte === e.data) assegna.push({ id: e.id, chiave }); else divergenti.push({ id: e.id, data: e.data, chiave, dataFonte });
    };

    // esami: inizio e fine
    const esami = giorniDegliEsami(db);
    for (const e of eventi.filter((x) => x.tipo === 'esame' && !x.fonte_chiave)) {
      const lato = /inizio/i.test(e.titolo) ? 'inizio' : /fine/i.test(e.titolo) ? 'fine' : null;
      if (!lato) continue;
      const cand = [...esami].filter(([, g]) => g[lato] === e.data);
      if (cand.length === 1) assegna.push({ id: e.id, chiave: `esame:${cand[0]![0]}:${lato}` });
    }
    // scadenze dei Palazzi
    const dungeon = (db.prepare("SELECT chiave, nome, finestra_al FROM main.dungeon WHERE tipo = 'palazzo' AND finestra_al IS NOT NULL").all() as Array<{ chiave: string; nome: string; finestra_al: string }>);
    for (const e of eventi.filter((x) => x.tipo === 'scadenza' && !x.fonte_chiave)) {
      const t = senzaAccenti(e.titolo);
      const cand = dungeon.filter((d) => t.includes(senzaAccenti(d.nome.replace(/^Palazzo di /i, ''))));
      if (cand.length === 1) prova(e, `scadenza:${cand[0]!.chiave}`, cand[0]!.finestra_al);
    }
    // sblocchi di rango 1 dei Confidenti
    if (esisteTabella(db, 'confidente_requisito')) {
      const conf = db.prepare('SELECT chiave, nome FROM main.confidente').all() as Array<{ chiave: string; nome: string }>;
      for (const e of eventi.filter((x) => x.tipo === 'sblocco' && !x.fonte_chiave && /rango 1\b/i.test(x.titolo))) {
        const t = senzaAccenti(e.titolo);
        const cand = conf.filter((c) => c.nome.split(/\s+/).filter((p) => p.length > 2).every((p) => t.includes(senzaAccenti(p))));
        if (cand.length !== 1 || / e /i.test(e.titolo.replace(/\(.*?\)/g, ''))) continue;
        const req = db.prepare("SELECT dati_json FROM main.confidente_requisito WHERE confidente_chiave = ? AND rango = 1 AND tipo = 'data' ORDER BY indice LIMIT 1").get(cand[0]!.chiave) as { dati_json: string } | undefined;
        let dal: string | undefined;
        try { dal = req ? (JSON.parse(req.dati_json) as { dal?: string }).dal : undefined; } catch { dal = undefined; }
        prova(e, `sblocco:confidente:${cand[0]!.chiave}:1`, dal);
      }
    }
    // vacanze: il giorno senza tempo libero
    if (esisteTabella(db, 'giorno') && haColonna(db, 'giorno', 'tempo_libero_json')) {
      for (const e of eventi.filter((x) => x.tipo === 'vacanza' && !x.fonte_chiave)) {
        const g = db.prepare('SELECT tempo_libero_json FROM main.giorno WHERE data = ?').get(e.data) as { tempo_libero_json: string | null } | undefined;
        let tl: { giorno?: boolean; sera?: boolean } | null;
        try { tl = g?.tempo_libero_json ? JSON.parse(g.tempo_libero_json) as { giorno?: boolean; sera?: boolean } : null; } catch { tl = null; }
        if (tl && (tl.giorno === false || tl.sera === false)) assegna.push({ id: e.id, chiave: `vacanza:${e.data}` });
      }
    }

    const chiavi = new Set<string>();
    for (const a of assegna) { if (chiavi.has(a.chiave)) errore(`la chiave ${a.chiave} sarebbe assegnata a due eventi`); chiavi.add(a.chiave); }
    // meteo che ripetono un'allerta dello stesso giorno, senza collegamenti a voci
    const doppioni: Array<Record<string, unknown>> = [];
    if (esisteTabella(db, 'allerta_meteo')) {
      for (const e of eventi.filter((x) => x.tipo === 'meteo')) {
        const ha = db.prepare('SELECT 1 FROM main.allerta_meteo WHERE data = ? LIMIT 1').get(e.data);
        const collegato = esisteTabella(db, 'evento_calendario_voce') && db.prepare('SELECT 1 FROM main.evento_calendario_voce WHERE evento_id = ? LIMIT 1').get(e.id);
        if (ha && !collegato) doppioni.push(db.prepare('SELECT * FROM main.evento_calendario WHERE id = ?').get(e.id) as Record<string, unknown>);
      }
    }
    if (assegna.length === 0 && doppioni.length === 0) return;

    const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO) as string | undefined;
    const blocco = esistente ? JSON.parse(esistente) as { chiavi?: Record<string, unknown>; doppioniMeteo?: unknown[]; divergenti?: unknown[] } : {};
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify({
      versione: 1, motivo: 'Eventi del Calendario con la chiave della fonte (L9, R9-22, migrazione 211): id → chiave e data copiata nella riga; i meteo doppioni di allerta_meteo tolti; le divergenze data riga / data fonte, non toccate.',
      chiavi: { ...(blocco.chiavi ?? {}), ...Object.fromEntries(assegna.map((a) => [a.id, { chiave: a.chiave, data: eventi.find((e) => e.id === a.id)!.data }])) },
      doppioniMeteo: [...(blocco.doppioniMeteo ?? []), ...doppioni], divergenti: [...(blocco.divergenti ?? []), ...divergenti] }));

    const aggiorna = db.prepare('UPDATE main.evento_calendario SET fonte_chiave = ? WHERE id = ?');
    for (const a of assegna) aggiorna.run(a.chiave, a.id);
    for (const d of doppioni) db.prepare('DELETE FROM main.evento_calendario WHERE id = ?').run(d.id);

    const dopo = db.prepare('SELECT COUNT(*) FROM main.evento_calendario').pluck().get() as number;
    if (dopo !== prima - doppioni.length) errore('il numero degli eventi non torna');
    if ((db.prepare('SELECT COUNT(*) FROM main.evento_calendario WHERE fonte_chiave IS NOT NULL').pluck().get() as number) < assegna.length) errore('le chiavi assegnate non risultano');
    logger.info({ migrazione: 'L9-R9-22-211', chiavi: assegna.length, meteoTolti: doppioni.length, divergenti }, 'eventi del Calendario con la chiave della fonte');
  },
};
