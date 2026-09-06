// ============================================================
// Le condizioni di presenza che un pin eredita dalla sua entità
// ============================================================
//
// La regola, in una riga: **un pin sparisce solo se quella cosa, nel momento in cui consulti la
// guida, nel mondo non c'è.** Un quartiere che apre il 18 giugno l'11 aprile non esiste; un
// Palazzo esiste solo fra il giorno in cui si apre e quello in cui scade; un venditore che esce
// soltanto quando piove, col sole, non c'è. Mostrarli manda il giocatore a cercare una cosa che
// non c'è, che è il peggio che una guida possa fare.
//
// Tutto il resto è un **prerequisito** — una dote da alzare, un Confidente da portare a un rango,
// una porta che vuole una chiave — e non toglie il pin: la cosa c'è, e la guida serve proprio a
// dire dov'è prima che tu possa usarla. La distinzione vive in `CONDIZIONI_DI_PRESENZA`
// (`shared/condizioniSpillo.ts`) e la applica `valutaRequisitiSpillo`.
//
// Qui sta invece l'altra metà: **da dove** la presenza si prende, entità per entità. Il censimento
// del catalogo dice che la portano in quattro posti diversi, e nessuno dei quattro arrivava ai pin:
//
// | entità     | dove sta la presenza                        | come diventa condizione        |
// |------------|---------------------------------------------|--------------------------------|
// | quartiere  | `sblocco_data`                              | `quartiere`                    |
// | Palazzo    | finestra dal/al (trascritta, era prosa)     | `intervallo` o `data`          |
// | luogo      | `quando` (giorno/sera), `giorni`            | `fascia`, `giorno-settimana`   |
// | negozio    | `condizioni_json` già strutturate           | le sole voci di presenza       |
// | attività   | `fascia`                                    | `fascia`                       |
//
// Quel che resta prosa — `luogo.sblocco`, `negozio.sblocco`, `attivita.sblocco` — non viene
// interpretato qui: una frase come «5 giugno, evento con Ryuji Sakamoto» la si trascrive, non la
// si indovina con un'espressione regolare che sbaglia in silenzio.
// ============================================================

import { nascondeIlPin, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { eStrutturale } from '../../../shared/spilli.js';
import type { AppDatabase } from '../../db/dbService.js';

const GIORNI: Record<string, string> = {
  lunedi: 'lunedi', martedi: 'martedi', mercoledi: 'mercoledi', giovedi: 'giovedi',
  venerdi: 'venerdi', sabato: 'sabato', domenica: 'domenica',
};

function senzaAccenti(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** `giorno` e `sera` diventano una fascia; `entrambe` non è una condizione, è tutto il giorno. */
export function fasciaDaTesto(quando: string | null | undefined): RequisitoSpillo[] {
  const v = senzaAccenti(quando ?? '');
  return v === 'giorno' || v === 'sera' ? [{ tipo: 'fascia', fascia: v }] : [];
}

/** I giorni della settimana, ma solo quando l'elenco è pulito.
 *
 * Il campo del catalogo è spesso prosa con una precisazione fra parentesi — «giovedì, sabato,
 * domenica (per il Confidente Iwai)» parla del Confidente, non dell'apertura, e «domenica
 * (regolare) e festività» aggiunge un caso che il calendario dell'app non ha. Prenderli per buoni
 * nasconderebbe pin nei giorni sbagliati, che è esattamente il danno che si vuole evitare: qui si
 * accetta solo un elenco di nomi di giorni e nient'altro, e se copre la settimana intera non è
 * una condizione.
 */
export function giorniDaTesto(giorni: string | null | undefined): RequisitoSpillo[] {
  const grezzo = senzaAccenti(giorni ?? '');
  if (!grezzo || /[()]|festivit|confident|escluso|tranne|salvo/.test(grezzo)) return [];
  const pezzi = grezzo.split(/\s*(?:,|\se\s)\s*/).filter(Boolean);
  if (pezzi.length === 0 || pezzi.some((p) => !GIORNI[p])) return [];
  const scelti = [...new Set(pezzi.map((p) => GIORNI[p]))];
  return scelti.length >= 7 ? [] : [{ tipo: 'giorno-settimana', giorni: scelti }];
}

/** La finestra di un Palazzo: fra le due date esiste, fuori no. */
export function finestraDaDate(dal: string | null | undefined, al: string | null | undefined): RequisitoSpillo[] {
  if (!dal) return [];
  return al ? [{ tipo: 'intervallo', dal, al }] : [{ tipo: 'data', dal }];
}

/** Di condizioni già strutturate tiene le sole che riguardano la presenza. */
export function soloPresenza(condizioni: unknown): RequisitoSpillo[] {
  if (!condizioni) return [];
  const elenco = typeof condizioni === 'string'
    ? (() => { try { return JSON.parse(condizioni) as unknown[]; } catch { return []; } })()
    : (condizioni as unknown[]);
  if (!Array.isArray(elenco)) return [];
  return elenco.filter((c): c is RequisitoSpillo =>
    typeof c === 'object' && c !== null && typeof (c as { tipo?: unknown }).tipo === 'string'
    && nascondeIlPin((c as { tipo: string }).tipo));
}

/** Unisce più fonti senza ripetere la stessa condizione due volte. */
export function unisci(...gruppi: RequisitoSpillo[][]): RequisitoSpillo[] {
  const viste = new Set<string>();
  const fuori: RequisitoSpillo[] = [];
  for (const g of gruppi) {
    for (const c of g) {
      const k = JSON.stringify(c);
      if (viste.has(k)) continue;
      viste.add(k);
      fuori.push(c);
    }
  }
  return fuori;
}


/** Applica a ogni spillo che cita un luogo la presenza di quel luogo.
 *
 * Va eseguita **dopo** l'importazione del pacchetto, non durante la sincronizzazione: i pin
 * dell'atlante nativo arrivano con il pacchetto, e un negozio disegnato sulla planimetria è lo
 * stesso negozio di quello sull'illustrazione del quartiere — se chiude di sera devono sparire
 * tutti e due, non uno solo. Applicandola solo ai pin editoriali, il pin nativo di un negozio
 * chiuso restava visibile, che è il difetto che si voleva togliere.
 *
 * Gli elementi fissi restano fuori: una porta o un forziere non chiudono.
 */
export function applicaPresenzaAiLuoghi(db: AppDatabase): number {
  const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((t) => t.name));
  if (!tabelle.has('luogo') || !tabelle.has('spillo')) return 0;
  const colonne = (db.prepare("SELECT name FROM pragma_table_info('luogo')").all() as Array<{ name: string }>).map((c) => c.name);
  const quando = colonne.includes('quando') ? 'l.quando' : "'' AS quando";
  const giorni = colonne.includes('giorni') ? 'l.giorni' : "'' AS giorni";
  const negozio = colonne.includes('negozio') && tabelle.has('negozio')
    ? '(SELECT n.condizioni_json FROM negozio n WHERE n.chiave = l.negozio)' : 'NULL';
  const quartieri = new Set(colonne.length && tabelle.has('quartiere')
    ? (db.prepare("SELECT chiave FROM quartiere WHERE sblocco_data IS NOT NULL AND sblocco_data <> ''").all() as Array<{ chiave: string }>).map((q) => q.chiave)
    : []);
  const righe = db.prepare(`SELECT l.chiave, l.quartiere_chiave, ${quando}, ${giorni}, ${negozio} AS condizioni_negozio FROM luogo l`)
    .all() as Array<{ chiave: string; quartiere_chiave: string; quando: string | null; giorni: string | null; condizioni_negozio: string | null }>;
  const aggiorna = db.prepare('UPDATE spillo SET condizioni_json = ? WHERE id = ?');
  // Solo gli spilli del seed: quelli che l'utente ha modificato portano le sue scelte, e
  // riscriverle a ogni avvio sarebbe peggio che non applicare la presenza.
  const spilliDi = db.prepare(`SELECT id, tipo FROM spillo WHERE riferimento_tipo = 'luogo' AND riferimento_chiave = ? AND origine = 'seed'`);
  let toccati = 0;
  for (const l of righe) {
    const presenza = unisci(
      quartieri.has(l.quartiere_chiave) ? [{ tipo: 'quartiere' as const, quartiere: l.quartiere_chiave }] : [],
      fasciaDaTesto(l.quando), giorniDaTesto(l.giorni), soloPresenza(l.condizioni_negozio));
    if (!presenza.length) continue;
    for (const s of spilliDi.all(l.chiave) as Array<{ id: number; tipo: string }>) {
      if (eStrutturale(s.tipo)) continue;
      aggiorna.run(JSON.stringify(presenza), s.id);
      toccati += 1;
    }
  }
  return toccati;
}
