// ============================================================
// righeCalendario — gli eventi propri del Calendario e le allerte meteo, correggibili e ripristinabili (L11 · R11-15/1)
// ============================================================
//
// Due oggetti «a riga» del registro dei ripristini (`righe.ts`): il valore della guida è la fotografia `seed_json` presa alla prima correzione
// (colonne `origine`, `seed_json`, `updated_at` della migrazione 199), che `ripristinoService` gestisce come per quartieri e trofei.
//
//   - `evento-calendario`: un evento di `evento_calendario` che il Calendario possiede (nessun'altra tabella lo dà): feste, trama, consigli e gli
//     sblocchi «rango massimo». Si correggono titolo, dettaglio e fonte; la data, il tipo e l'ordine NON si correggono (la data governa i festivi
//     della disponibilità e il collegamento con le voci del Diario, che usa l'id dell'evento). Gli eventi che si ricavano da un dato strutturato
//     (esami, vacanze, meteo, scadenze dei Palazzi, sblocchi dei ranghi 1 e delle condizioni) NON sono correggibili qui: si correggono dalla loro
//     fonte, per non avere due copie dello stesso fatto (R9-22).
//   - `allerta-meteo`: un'allerta del gioco in un giorno (tabella `allerta_meteo`, una riga per fascia). La chiave è «MM-GG:chiave-dell-allerta»;
//     si correggono nome, effetti e fasce in cui vale. L'identificativo dell'allerta (`chiave`, letto dalle condizioni dei semafori) non si tocca.
// ============================================================

import { prepared } from '../../db/dbService.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import type { CampoDef } from './registro.js';
import type { DefRiga } from './righe.js';

const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);
const T = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'testo', ...o });
const L = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'testolungo', ...o });
const E = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'elenco', ...o });

// ---- Eventi propri del Calendario ----

/** I tipi di evento che sono sempre dati propri del Calendario. */
const TIPI_PROPRI = ['festa', 'storia', 'consiglio'] as const;
/** Gli sblocchi propri: «rango massimo» e i ranghi dal 2 in su (il rango 1 e le aperture di luoghi e quartieri si ricavano da condizioni e requisiti). */
const SBLOCCO_PROPRIO = /\brango\s+(massimo|[2-9]|10)\b/i;

/** Vero se l'evento è un dato proprio del Calendario (e quindi si corregge qui) e non un fatto ricavabile da un'altra fonte. */
export function eventoProprio(tipo: string, titolo: string): boolean {
  if ((TIPI_PROPRI as readonly string[]).includes(tipo)) return true;
  return tipo === 'sblocco' && SBLOCCO_PROPRIO.test(titolo);
}

interface RigaEvento { tipo: string; titolo: string; dettaglio: string; fonte: string }
const rigaEvento = (chiave: string): RigaEvento | undefined => prepared('SELECT tipo, titolo, dettaglio, fonte FROM evento_calendario WHERE CAST(id AS TEXT) = ?').get(chiave) as RigaEvento | undefined;

const eventoCalendario: DefRiga = {
  modalita: 'riga', etichetta: 'Evento del Calendario', tabella: 'evento_calendario', colonnaChiave: 'CAST(id AS TEXT)',
  chiavi: () => (prepared('SELECT id, tipo, titolo FROM evento_calendario ORDER BY data, ordine').all() as Array<{ id: number; tipo: string; titolo: string }>)
    .filter((e) => eventoProprio(e.tipo, e.titolo)).map((e) => String(e.id)),
  esiste: (chiave) => {
    const r = rigaEvento(chiave);
    return !!r && eventoProprio(r.tipo, r.titolo);
  },
  campi: () => [T('titolo', 'Titolo'), L('dettaglio', 'Dettaglio', { nullable: true, max: 2000 }), T('fonte', 'Fonte', { nullable: true })],
  leggi: (chiave) => {
    const r = rigaEvento(chiave)!;
    return { titolo: r.titolo, dettaglio: r.dettaglio === '' ? null : r.dettaglio, fonte: r.fonte === '' ? null : r.fonte };
  },
  scrivi: (chiave, v) => {
    if (v.titolo !== undefined) prepared('UPDATE evento_calendario SET titolo = ? WHERE CAST(id AS TEXT) = ?').run(str(v.titolo) ?? '', chiave);
    if (v.dettaglio !== undefined) prepared('UPDATE evento_calendario SET dettaglio = ? WHERE CAST(id AS TEXT) = ?').run(str(v.dettaglio) ?? '', chiave);
    if (v.fonte !== undefined) prepared('UPDATE evento_calendario SET fonte = ? WHERE CAST(id AS TEXT) = ?').run(str(v.fonte) ?? '', chiave);
  },
  nome: (chiave, v) => {
    const r = prepared('SELECT data FROM evento_calendario WHERE CAST(id AS TEXT) = ?').get(chiave) as { data: string } | undefined;
    return `${String(v.titolo)}${r ? ` (${giornoMese(r.data)})` : ''}`;
  },
};

// ---- Allerte meteo ----

/** «GG/MM» da «MM-GG». */
const giornoMese = (data: string): string => `${data.slice(3, 5)}/${data.slice(0, 2)}`;

const FASCE: Array<{ chiave: string; nome: string; fasce: Array<'giorno' | 'sera'> }> = [
  { chiave: 'giorno', nome: 'Solo di giorno', fasce: ['giorno'] },
  { chiave: 'sera', nome: 'Solo di sera', fasce: ['sera'] },
  { chiave: 'giorno-sera', nome: 'Giorno e sera', fasce: ['giorno', 'sera'] },
];

/** La chiave «MM-GG:allerta» divisa; `null` se non ha la forma. */
function dividi(chiave: string): { data: string; allerta: string } | null {
  const i = chiave.indexOf(':');
  if (i !== 5 || !/^\d{2}-\d{2}$/.test(chiave.slice(0, 5)) || chiave.length <= 6) return null;
  return { data: chiave.slice(0, 5), allerta: chiave.slice(6) };
}

interface RigaAllerta { fascia: 'giorno' | 'sera'; nome: string; effetti_json: string }
const righeAllerta = (data: string, allerta: string): RigaAllerta[] =>
  prepared("SELECT fascia, nome, effetti_json FROM allerta_meteo WHERE data = ? AND chiave = ? ORDER BY CASE fascia WHEN 'giorno' THEN 0 ELSE 1 END").all(data, allerta) as RigaAllerta[];

const allertaMeteo: DefRiga = {
  modalita: 'riga', etichetta: 'Allerta meteo', tabella: 'allerta_meteo', colonnaChiave: "(data || ':' || chiave)",
  chiavi: () => (prepared("SELECT DISTINCT data || ':' || chiave FROM allerta_meteo ORDER BY data, chiave").pluck().all() as string[]),
  esiste: (chiave) => {
    const d = dividi(chiave);
    return !!d && righeAllerta(d.data, d.allerta).length > 0;
  },
  campi: () => [
    T('nome', 'Nome', { max: 80 }),
    E('effetti', 'Effetti'),
    { p: 'fasce', e: 'Quando vale', t: 'scelta', opzioni: FASCE.map((f) => ({ chiave: f.chiave, nome: f.nome })) },
  ],
  leggi: (chiave) => {
    const d = dividi(chiave)!;
    const righe = righeAllerta(d.data, d.allerta);
    const prima = righe[0]!;
    let effetti: string[] = [];
    try { const j = JSON.parse(prima.effetti_json) as unknown; if (Array.isArray(j)) effetti = j.filter((x): x is string => typeof x === 'string'); } catch { /* effetti illeggibili: nessuno */ }
    const insieme = righe.map((r) => r.fascia).join(',');
    return { nome: prima.nome, effetti, fasce: FASCE.find((f) => f.fasce.join(',') === insieme)?.chiave ?? 'giorno-sera' };
  },
  scrivi: (chiave, v) => {
    const d = dividi(chiave)!;
    if (v.nome !== undefined) prepared('UPDATE allerta_meteo SET nome = ? WHERE data = ? AND chiave = ?').run(str(v.nome) ?? '', d.data, d.allerta);
    if (Array.isArray(v.effetti)) prepared('UPDATE allerta_meteo SET effetti_json = ? WHERE data = ? AND chiave = ?').run(JSON.stringify(v.effetti), d.data, d.allerta);
    // le fasce per ultime: la fascia nuova nasce dalla riga che resta (nome ed effetti già aggiornati)
    if (v.fasce !== undefined) {
      const volute = FASCE.find((f) => f.chiave === v.fasce)?.fasce ?? ['giorno', 'sera'];
      const esistenti = righeAllerta(d.data, d.allerta);
      for (const r of esistenti) if (!volute.includes(r.fascia)) prepared('DELETE FROM allerta_meteo WHERE data = ? AND chiave = ? AND fascia = ?').run(d.data, d.allerta, r.fascia);
      const modello = esistenti.find((r) => volute.includes(r.fascia)) ?? esistenti[0]!;
      for (const fascia of volute) {
        if (esistenti.some((r) => r.fascia === fascia)) continue;
        prepared('INSERT INTO allerta_meteo (data, fascia, chiave, nome, effetti_json) VALUES (?, ?, ?, ?, ?)').run(d.data, fascia, d.allerta, modello.nome, modello.effetti_json);
      }
    }
  },
  nome: (chiave, v) => {
    const d = dividi(chiave);
    return `${String(v.nome)}${d ? ` (${giornoMese(d.data)})` : ''}`;
  },
};

export const DEFINIZIONI_CALENDARIO: { 'evento-calendario': DefRiga; 'allerta-meteo': DefRiga } = { 'evento-calendario': eventoCalendario, 'allerta-meteo': allertaMeteo };
