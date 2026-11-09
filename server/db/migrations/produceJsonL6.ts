// ============================================================
// produceJsonL6 — gli attrezzi di L6-08: controllo e archivio di `voce_giornata.produce_json` (migrazioni 362 e utente 68)
// ============================================================
//
// `voce_giornata.produce_json` è la copia storica degli effetti di una voce, non si legge né si scrive più (gli effetti stanno in `voce_effetto`;
// il suo contenuto grezzo di allora è in `voce_effetto_transizione.raw_json`, che non si tocca). Prima di toglierla (risposta dell'utente Q12 = A:
// «prima il controllo, poi la rimozione con archivio») si fanno due cose, qui in comune fra la migrazione di gioco 362 e quella delle partite 68:
//  (1) il CONTROLLO: per ogni elemento di ogni `produce_json` diverso da «[]» si cerca l'equivalente strutturato (lo stesso effetto della stessa
//      voce; il dato del Confidente per l'incontro; le Doti dell'attività del turno, dell'esame o del videogioco della voce; la stessa opera già
//      letta in un'altra voce). Ciò che non ha un effetto identico nella stessa voce si elenca per intero nel verbale (uid, giorno, ordine, elemento,
//      classe, motivo); un elemento senza alcun equivalente è «nessuno» e si dichiara a parte. Il controllo non scrive e non blocca nulla: tutto
//      ciò che le colonne contenevano va comunque in archivio.
//  (2) l'ARCHIVIO: ogni valore diverso da «[]» (uid → testo originale) in `dati_guida.archivio-frasi-l11`, colonna `voce_giornata.produce_json`,
//      senza mai riscrivere una riga già archiviata. Un valore cambiato dopo la prima archiviazione (la migrazione utente 015 può riscrivere la
//      colonna) va nella colonna `voce_giornata.produce_json.dopo-015`: l'originale non si perde.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate } from './archivioL1.js';

export const COLONNA_ARCHIVIO = 'voce_giornata.produce_json';
export const COLONNA_ARCHIVIO_DOPO_015 = 'voce_giornata.produce_json.dopo-015';
/** L'ordine dell'ultimo giorno validato dall'utente (1° giugno): serve solo a dire, nel verbale, quali elementi cadono nel validato. */
const ULTIMO_ORDINE_VALIDATO = 53;

export type ClasseElemento =
  | 'voce_effetto' | 'confidente_dote_incontro' | 'attivita' | 'attivita_nota_nel_testo' | 'esame' | 'videogioco'
  | 'uscita_oggetto_stessa_opera' | 'lettura_in_altra_voce' | 'illeggibile' | 'nessuno';

/** Le classi per le quali l'effetto identico sta già nella stessa voce, in `voce_effetto`: non si elencano una a una nel verbale. */
const DIRETTE: ReadonlySet<ClasseElemento> = new Set<ClasseElemento>(['voce_effetto']);

export interface ElementoSenzaDiretto {
  uid: string; giorno: string; ordineGiorno: number | null; validato: boolean; fascia: string; ordineVoce: number; posizione: number;
  elemento: unknown; classe: ClasseElemento; motivo: string;
}
export interface EsitoControllo {
  voci: number; elementi: number; perClasse: Record<string, number>; nelValidato: number;
  /** Gli elementi che non hanno l'effetto identico nella stessa voce, con la loro classe e il motivo. */
  senzaEffettoIdentico: ElementoSenzaDiretto[];
  /** Quanti elementi non hanno alcun equivalente (classe «nessuno» o «illeggibile»): sono le possibili perdite, da portare all'utente. */
  senzaEquivalente: number;
}

const lista = (json: string | null | undefined): unknown[] => {
  if (!json) return [];
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v : []; } catch { return []; }
};
type Oggetto = Record<string, unknown>;
const oggetto = (v: unknown): Oggetto | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Oggetto : null);
const stessaDote = (d: unknown, el: Oggetto, conNota: boolean): boolean => {
  const x = oggetto(d);
  return !!x && x.dote === el.dote && (!conNota || x.note === el.note);
};

interface RigaProduce { uid: string; data: string; fascia: string; ordine: number; produce_json: string; riferimento_tipo: string | null; riferimento_chiave: string | null; rango_atteso: number | null; giorno_ordine: number | null }

/** Le voci con un `produce_json` diverso da «[]», nell'ordine del Diario (la colonna deve esserci). */
export function vociConProduce(db: AppDatabase): RigaProduce[] {
  const giorno = esisteTabella(db, 'giorno');
  return db.prepare(`SELECT v.uid, v.data, v.fascia, v.ordine, v.produce_json, v.riferimento_tipo, v.riferimento_chiave, v.rango_atteso, ${giorno ? 'g.ordine' : 'NULL'} AS giorno_ordine
    FROM main.voce_giornata v ${giorno ? 'LEFT JOIN main.giorno g ON g.data = v.data' : ''} WHERE v.produce_json <> '[]' ORDER BY ${giorno ? 'g.ordine, ' : ''}v.data, v.fascia, v.ordine, v.uid`).all() as RigaProduce[];
}

/** Il controllo di sola lettura (vedi l'intestazione). Richiede la colonna `voce_giornata.produce_json`. */
export function controllaProduce(db: AppDatabase): EsitoControllo {
  const ha = (t: string): boolean => esisteTabella(db, t);
  const effetti = ha('voce_effetto') ? db.prepare('SELECT tipo, chiave, dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine') : null;
  const altrove = ha('voce_effetto') ? db.prepare("SELECT 1 FROM main.voce_effetto WHERE tipo = 'lettura' AND chiave = ? AND voce_uid <> ? LIMIT 1") : null;
  const incontro = ha('confidente_dote_incontro') ? db.prepare('SELECT effetti_json FROM main.confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?') : null;
  const attivita = ha('attivita') && haColonna(db, 'attivita', 'esiti_json') ? db.prepare('SELECT doti_json, esiti_json FROM main.attivita WHERE chiave = ?') : null;
  const esame = ha('esame') && haColonna(db, 'esame', 'premi_json') ? db.prepare('SELECT premi_json FROM main.esame WHERE chiave = ?') : null;
  const catalogo = ha('catalogo_oggetto') ? db.prepare('SELECT statistiche_json FROM main.catalogo_oggetto WHERE chiave = ?') : null;

  const voci = vociConProduce(db);
  const esito: EsitoControllo = { voci: voci.length, elementi: 0, perClasse: {}, nelValidato: 0, senzaEffettoIdentico: [], senzaEquivalente: 0 };
  for (const v of voci) {
    const mie = (effetti?.all(v.uid) ?? []) as Array<{ tipo: string; chiave: string | null; dati_json: string }>;
    const dati = mie.map((e) => ({ tipo: e.tipo, chiave: e.chiave, d: oggetto((() => { try { return JSON.parse(e.dati_json) as unknown; } catch { return null; } })()) ?? {} }));
    let json: unknown;
    try { json = JSON.parse(v.produce_json); } catch { json = null; }
    const elementi = Array.isArray(json) ? json : [json];
    elementi.forEach((el, posizione) => {
      const e = oggetto(el);
      let classe: ClasseElemento = 'nessuno';
      let motivo = 'nessun effetto, dato del Confidente, attività, esame, videogioco o lettura equivalente';
      if (!e) { classe = 'illeggibile'; motivo = 'il valore non è un elenco di effetti leggibile'; }
      else if (e.tipo === 'dote') {
        if (dati.some((x) => x.tipo === 'dote' && stessaDote(x.d, e, true))) { classe = 'voce_effetto'; motivo = 'effetto «dote» identico nella stessa voce'; }
        else {
          const rango = v.riferimento_tipo === 'confidente' && v.rango_atteso !== null ? incontro?.get(v.riferimento_chiave, v.rango_atteso) as { effetti_json: string } | undefined : undefined;
          const daIncontro = rango && lista(rango.effetti_json).some((x) => stessaDote(oggetto(x)?.effetto, e, true));
          if (daIncontro) { classe = 'confidente_dote_incontro'; motivo = 'la Dote dell’incontro è in `confidente_dote_incontro` (Confidente e rango della voce)'; }
          else {
            let esatta = false, soloDote = false;
            for (const x of dati) {
              if (x.tipo === 'turno') {
                const a = attivita?.get(x.d.attivita) as { doti_json: string | null; esiti_json: string | null } | undefined;
                let esiti: unknown[] = [];
                try { esiti = (oggetto(JSON.parse(a?.esiti_json ?? 'null'))?.esiti as unknown[] | undefined) ?? []; } catch { /* nessun esito leggibile */ }
                const doti = [...lista(a?.doti_json), ...esiti.flatMap((s) => lista(JSON.stringify(oggetto(s)?.doti ?? [])))];
                if (lista(JSON.stringify(x.d.doti ?? [])).some((d) => stessaDote(d, e, true)) || doti.some((d) => stessaDote(d, e, true))) esatta = true;
                else if (doti.some((d) => stessaDote(d, e, false))) soloDote = true;
                if (esatta) { classe = 'attivita'; motivo = `la Dote è fra gli esiti dell’attività «${String(x.d.attivita)}» del turno della voce`; break; }
              } else if (x.tipo === 'esame') {
                const r = esame?.get(x.d.esame) as { premi_json: string } | undefined;
                if (r && lista(r.premi_json).some((p) => lista(JSON.stringify(oggetto(p)?.doti ?? [])).some((d) => stessaDote(d, e, true)))) { classe = 'esame'; motivo = `la Dote è fra i premi dell’esame «${String(x.d.esame)}» della voce`; break; }
              } else if (x.tipo === 'lettura' && x.d.categoria === 'videogioco') {
                const r = catalogo?.get(`videogioco/${String(x.d.chiave).replace(/^videogioco-/, '')}`) as { statistiche_json: string | null } | undefined;
                let stat: Oggetto | null = null;
                try { stat = oggetto(JSON.parse(r?.statistiche_json ?? 'null')); } catch { /* nessuna statistica leggibile */ }
                if (lista(JSON.stringify(stat?.effetti ?? [])).some((f) => stessaDote(oggetto(f)?.effetto, e, true))) { classe = 'videogioco'; motivo = `la Dote è fra gli effetti del videogioco «${String(x.d.chiave)}» nel catalogo`; break; }
              }
            }
            if (classe === 'nessuno' && soloDote) { classe = 'attivita_nota_nel_testo'; motivo = 'la Dote è fra quelle dell’attività del turno; la fonte non ne strutturava la nota (il testo dell’attività dice «+2»)'; }
          }
        }
      } else if (e.tipo === 'lettura') {
        if (dati.some((x) => x.tipo === 'lettura' && x.d.chiave === e.chiave)) { classe = 'voce_effetto'; motivo = 'effetto «lettura» della stessa opera nella stessa voce'; }
        else if (dati.some((x) => x.tipo === 'uscitaOggetto' && typeof x.d.oggetto === 'string' && x.d.oggetto.endsWith(`/${String(e.chiave)}`))) { classe = 'uscita_oggetto_stessa_opera'; motivo = 'la voce restituisce la stessa opera (effetto «uscitaOggetto»)'; }
        else if (altrove?.get(e.chiave, v.uid)) { classe = 'lettura_in_altra_voce'; motivo = 'la lettura della stessa opera è già un effetto di un’altra voce; qui la voce restituisce o noleggia'; }
      } else if (e.tipo === 'turno') {
        if (dati.some((x) => x.tipo === 'turno' && x.d.attivita === e.attivita)) { classe = 'voce_effetto'; motivo = 'effetto «turno» della stessa attività nella stessa voce'; }
      } else motivo = `tipo di elemento non previsto: ${String(e.tipo)}`;

      esito.elementi++;
      esito.perClasse[classe] = (esito.perClasse[classe] ?? 0) + 1;
      const validato = v.giorno_ordine !== null && v.giorno_ordine <= ULTIMO_ORDINE_VALIDATO;
      if (validato) esito.nelValidato++;
      if (classe === 'nessuno' || classe === 'illeggibile') esito.senzaEquivalente++;
      if (!DIRETTE.has(classe)) esito.senzaEffettoIdentico.push({ uid: v.uid, giorno: v.data, ordineGiorno: v.giorno_ordine, validato, fascia: v.fascia, ordineVoce: v.ordine, posizione, elemento: el, classe, motivo });
    });
  }
  return esito;
}

export interface EsitoArchivio { voci: number; nuove: number; cambiate: number }

/**
 * Archivia ogni `produce_json` diverso da «[]»: una riga nuova va in `voce_giornata.produce_json`, una già archiviata con un testo diverso in
 * `voce_giornata.produce_json.dopo-015` (mai una sovrascrittura). Poi rilegge l'archivio e confronta ogni valore col testo di partenza; ogni
 * differenza lancia (la migrazione si annulla per intero). Richiede la colonna.
 */
export function archiviaProduce(db: AppDatabase, migrazione: string): EsitoArchivio {
  const righe = vociConProduce(db);
  const presenti = righeArchiviate(db, COLONNA_ARCHIVIO);
  const nuove: Record<string, string> = {};
  const cambiate: Record<string, string> = {};
  for (const r of righe) {
    if (!(r.uid in presenti)) nuove[r.uid] = r.produce_json;
    else if (presenti[r.uid] !== r.produce_json) cambiate[r.uid] = r.produce_json;
  }
  archiviaSenzaSovrascrivere(db, migrazione, COLONNA_ARCHIVIO, nuove);
  archiviaSenzaSovrascrivere(db, migrazione, COLONNA_ARCHIVIO_DOPO_015, cambiate);
  const dopo = righeArchiviate(db, COLONNA_ARCHIVIO);
  const dopoCambiate = righeArchiviate(db, COLONNA_ARCHIVIO_DOPO_015);
  for (const r of righe) {
    const ok = r.uid in nuove ? dopo[r.uid] === r.produce_json : r.uid in cambiate ? dopoCambiate[r.uid] === r.produce_json : true;
    if (!ok) throw new Error(`L6-08: l’archivio di produce_json non ha il valore di ${r.uid}`);
  }
  return { voci: righe.length, nuove: Object.keys(nuove).length, cambiate: Object.keys(cambiate).length };
}
