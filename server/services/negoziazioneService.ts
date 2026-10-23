// ============================================================
// negoziazioneService — il lettore unico della negoziazione per umore (L8, B5; sola lettura)
// ============================================================
//
// Una fonte sola (`negoziazione_*`, migrazione 172) letta da Battaglia, pagina Ombra e pagina negoziazione. Per ogni domanda (famiglia) e
// per ogni umore richiesto, ogni risposta porta una cella valutata (`shared/negoziazione.ts`): l'esito principale quando Royal è
// documentata, le alternative quando la fonte si contraddice, gli esiti dell'app come altra provenienza (mai cancellati) e l'avviso se un
// esito viene dalla classe «unconfirmed» di Royal (ereditato da P5, non confermato). Nessuna scelta automatica del migliore o del peggiore;
// la cella senza esito resta una cella senza esito, non diventa neutra.
//
// L'umore di un'Ombra è la sua personalità valida (`ombra.personalita`): una personalità sconosciuta, o un'Ombra non negoziabile, non
// riceve un umore dedotto da un nome del foglio Royal.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';
import { normalizza } from '../../shared/maschere.js';
import { UMORI, type UmoreNegoziazione } from '../../shared/elementi.js';
import {
  ATTESI_CONTRATTO, collegamentoSolido, confrontaConContratto, costruisciIndice, leggiCorrispondenze, leggiNoteVariante, riconcilia, valutaCellaApp, valutaCellaRoyal,
  type AttestazioneNeg, type IndiceNegoziazione, type NegAttestazioneDto, type NegCellaDto, type NegDomandaDto, type NegoziazioneDto, type NegoziazioneVerificaDto,
  type NegRispostaDto, type NegUmoreDto, type NegVarianteDto, type RigaNegDomanda, type RigaNegRisposta, type RigaNegVariante, type RigaNegVerdetto, type RigheNegoziazione, type ValutazioneCella,
} from '../../shared/negoziazione.js';

export interface FiltroNegoziazione { umore?: string; ombra?: string; q?: string }

interface Corpus { righe: RigheNegoziazione; indice: IndiceNegoziazione }

let cache: Corpus | null = null;
export const invalidaNegoziazione = registraCacheDiGioco(() => { cache = null; });

const tabellaEsiste = (nome: string): boolean => !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(nome);

/** Le righe delle quattro tabelle, lette una volta (il DB di gioco cambia solo per migrazione o importazione, che svuotano la cache). */
function corpus(): Corpus {
  if (cache) return cache;
  if (!tabellaEsiste('negoziazione_domanda')) throw httpErrors.notFound('negoziazione-non-disponibile', 'La negoziazione per umore non è caricata in questo database di gioco.');
  const righe: RigheNegoziazione = {
    domande: prepared('SELECT chiave, ordine FROM negoziazione_domanda ORDER BY ordine').all() as RigaNegDomanda[],
    varianti: prepared('SELECT * FROM negoziazione_variante ORDER BY domanda_chiave, ordine').all() as RigaNegVariante[],
    risposte: prepared('SELECT * FROM negoziazione_risposta ORDER BY variante_chiave, ordine').all() as RigaNegRisposta[],
    verdetti: prepared('SELECT * FROM negoziazione_verdetto').all() as RigaNegVerdetto[],
  };
  cache = { righe, indice: costruisciIndice(righe) };
  return cache;
}

const aDto = (a: AttestazioneNeg): NegAttestazioneDto => ({
  chiave: a.chiave, esito: a.esito, incerto: a.incerto, fonte: a.fonte, origine: a.origine, localizzatore: a.localizzatore, valoreGrezzo: a.valoreGrezzo,
  composita: a.composita === true, certezza: a.certezza ?? null,
});

const cellaDto = (umore: UmoreNegoziazione, v: ValutazioneCella): NegCellaDto => ({
  umore, stato: v.stato, principale: v.principale ? aDto(v.principale) : null, alternative: v.alternative.map(aDto), altre: v.altre.map(aDto), divergenza: v.divergenza, nonConfermata: v.nonConfermata,
});

/** Una variante con le sue risposte e, per ogni risposta, una cella per ognuno degli umori richiesti. */
function varianteDto(c: Corpus, v: RigaNegVariante, umori: ReadonlyArray<UmoreNegoziazione>): NegVarianteDto {
  const note = leggiNoteVariante(v.note_json);
  const risposte: NegRispostaDto[] = (c.indice.risposteDi.get(v.chiave) ?? []).map((r) => {
    const collegate = leggiCorrispondenze(r.corrispondenze_json);
    // Una risposta dell'app legata con sicurezza a una Royal non ripete le celle: valgono quelle della Royal, dove i suoi esiti sono fra le `altre`.
    const solido = v.fonte === 'royal' ? undefined : collegate.find((x) => collegamentoSolido(x) && c.indice.rispostaPerChiave.has(x.risposta));
    return {
      chiave: r.chiave, testo: r.testo, testoOriginale: r.testo_originale, testoOrigine: r.testo_origine, testoDisponibile: r.testo_disponibile === 1, collegate,
      celle: solido ? [] : umori.map((u) => cellaDto(u, v.fonte === 'royal' ? valutaCellaRoyal(c.indice, r.chiave, u) : valutaCellaApp(c.indice, r.chiave, u))),
      celleDa: solido ? solido.risposta : null,
    };
  });
  return {
    chiave: v.chiave, testo: v.testo, testoOriginale: v.testo_originale, testoOrigine: v.testo_origine, fonte: v.fonte, localizzatore: v.localizzatore,
    composta: note.composta === true, nota: note.nota ?? null, abbinamento: note.abbinamentoRoyal ?? null, relazioni: note.relazioni ?? [], risposte,
  };
}

/** Il testo da mostrare per la famiglia: la resa italiana della prima variante che ce l'ha, altrimenti l'originale della prima. */
function intestazione(varianti: RigaNegVariante[]): { testo: string; testoOrigine: RigaNegVariante['testo_origine']; principale: string } {
  const principale = varianti[0]!;
  const conTesto = varianti.find((v) => v.testo !== null && !(leggiNoteVariante(v.note_json).composta === true));
  if (conTesto) return { testo: conTesto.testo!, testoOrigine: conTesto.testo_origine, principale: principale.chiave };
  return { testo: principale.testo_originale, testoOrigine: 'nessuna', principale: principale.chiave };
}

/** Vero se il testo (normalizzato) compare in una variante della famiglia o in una sua risposta. */
function famigliaContiene(c: Corpus, varianti: RigaNegVariante[], ricerca: string): boolean {
  for (const v of varianti) {
    if (normalizza(`${v.testo ?? ''} ${v.testo_originale}`).includes(ricerca)) return true;
    for (const r of c.indice.risposteDi.get(v.chiave) ?? []) if (normalizza(`${r.testo ?? ''} ${r.testo_originale}`).includes(ricerca)) return true;
  }
  return false;
}

function carteDi(umori: ReadonlyArray<UmoreNegoziazione>): NegUmoreDto[] {
  if (!tabellaEsiste('negoziazione_umore')) return [];
  const righe = prepared('SELECT umore, nome, descrizione, esempi_json, da_evitare_json, fonte FROM negoziazione_umore').all() as Array<{ umore: string; nome: string; descrizione: string; esempi_json: string; da_evitare_json: string; fonte: string }>;
  const leggi = (json: string): unknown => { try { return JSON.parse(json) as unknown; } catch { return null; } };
  return umori.flatMap((u) => {
    const r = righe.find((x) => x.umore === u);
    if (!r) return [];
    const esempi = leggi(r.esempi_json) as { esempi?: Array<Record<string, unknown>>; proposte?: Array<Record<string, unknown>> } | null;
    const daEvitare = leggi(r.da_evitare_json);
    return [{
      umore: u, nome: r.nome, descrizione: r.descrizione, esempi: [...(esempi?.esempi ?? []), ...(esempi?.proposte ?? []).map((p) => ({ ...p, proposta: true }))],
      daEvitare: Array.isArray(daEvitare) ? daEvitare.filter((x): x is string => typeof x === 'string') : [], fonte: r.fonte,
    }];
  });
}

/**
 * La negoziazione: tutte le domande con, per ogni umore richiesto, la cella valutata di ogni risposta. Senza filtri, tutti gli umori.
 * Con `ombra` l'umore è la personalità valida dell'Ombra; se non ne ha una (sconosciuta) o non è negoziabile, nessun umore e nessuna domanda.
 */
export function negoziazione(f: FiltroNegoziazione = {}): NegoziazioneDto {
  const c = corpus();
  let umori: UmoreNegoziazione[] = UMORI.map((u) => u.chiave);
  let ombra: NegoziazioneDto['ombra'] = null;
  if (f.ombra) {
    const o = prepared('SELECT chiave, nome, personalita, negoziabile FROM ombra WHERE chiave = ?').get(f.ombra) as { chiave: string; nome: string; personalita: string; negoziabile: number | null } | undefined;
    if (!o) throw httpErrors.notFound('ombra-non-trovata', `Non c'è un'Ombra con la chiave «${f.ombra}».`);
    const umore = UMORI.find((u) => u.chiave === o.personalita)?.chiave ?? null;
    const negoziabile = o.negoziabile === null ? null : o.negoziabile === 1;
    const valido = umore !== null && negoziabile !== false ? umore : null;
    ombra = { chiave: o.chiave, nome: o.nome, personalita: o.personalita, umore: valido, negoziabile };
    if (f.umore && valido && f.umore !== valido) throw httpErrors.badRequest('umore-e-ombra-discordi', `L'Ombra «${o.nome}» ha personalità ${o.personalita}, non ${f.umore}.`);
    umori = valido ? [valido] : [];
  } else if (f.umore) {
    const u = UMORI.find((x) => x.chiave === f.umore)?.chiave;
    if (!u) throw httpErrors.badRequest('umore-sconosciuto', `«${f.umore}» non è uno degli umori della negoziazione.`);
    umori = [u];
  }
  const ricerca = f.q ? normalizza(f.q) : '';
  const domande: NegDomandaDto[] = [];
  if (umori.length > 0) {
    for (const d of c.righe.domande) {
      const varianti = c.indice.variantiDi.get(d.chiave) ?? [];
      if (varianti.length === 0) continue;
      if (ricerca && !famigliaContiene(c, varianti, ricerca)) continue;
      const { testo, testoOrigine, principale } = intestazione(varianti);
      domande.push({ chiave: d.chiave, ordine: d.ordine, testo, testoOrigine, principale, varianti: varianti.map((v) => varianteDto(c, v, umori)) });
    }
  }
  return { umori, carte: carteDi(umori), ombra, domande, totale: domande.length };
}

/** I conteggi rimisurati ora sulle righe, il confronto con il contratto e il rapporto scritto dall'importazione. */
export function verificaNegoziazione(): NegoziazioneVerificaDto {
  const c = corpus();
  const misurato = riconcilia(c.righe);
  const riga = prepared('SELECT chiave, versione_formato, fonti_json, rapporto_json FROM negoziazione_importazione ORDER BY creata_il DESC LIMIT 1').get() as
    { chiave: string; versione_formato: number; fonti_json: string; rapporto_json: string } | undefined;
  const leggi = (json: string): unknown => { try { return JSON.parse(json) as unknown; } catch { return null; } };
  return {
    misurato,
    attesoContratto: ATTESI_CONTRATTO,
    confronto: confrontaConContratto(misurato),
    importazione: riga ? { chiave: riga.chiave, versioneFormato: riga.versione_formato, fonti: leggi(riga.fonti_json), rapporto: leggi(riga.rapporto_json) } : null,
  };
}
