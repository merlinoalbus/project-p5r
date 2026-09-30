// ============================================================
// effettiAzioneService — la spunta di un'azione (della guida o dell'utente) applica ciò che l'azione produce
// ============================================================
//
// Che cosa produce un'azione è un dato (`produce`, `shared/effettiAzione.ts`), non il testo delle
// note: la spunta alza le Doti dichiarate, porta avanti le letture (i punti li dà il libro o il
// film, una volta, da qualunque parte lo si segni), registra i turni dei lavori (i punti li dà il
// turno, dalla spunta come dal contatore) e, per un incontro con un Confidente, aggiunge le note
// della risposta scelta. Ciò che ha applicato si scrive (`EffettiAzioneDto`) per toglierlo
// identico togliendo la spunta: Doti, punti del Confidente e turni. Le letture no: la spunta dice
// «l'ho fatto quel giorno», la lettura «l'ho letto», e si disfa dalla pagina dove quel dato vive.
// ============================================================

import { prepared } from '../db/dbService.js';
import type { EffettiAzioneDto, IncontroConfidenteDto, RiferimentoAzioneDto } from '../../shared/types.js';
import type { EffettoAzione } from '../../shared/effettiAzione.js';
import { aggiornaConfidente, aggiornaDote, annullaEffetti, confidenti, dotiSociali, puntiDaNote } from './partiteService.js';
import { avanzamentoLettura, impostaLettura, registraTurno, togliTurno } from './attivitaService.js';
import { annullaIncontro, registraIncontro, type MomentoIncontro } from './incontriService.js';

export interface OpzioniSpunta {
  /** Note della risposta al Confidente (1–3) quando l'azione è un incontro con un Confidente; assente = nessun punto. */
  noteRisposta?: 1 | 2 | 3;
}

/** Ciò che serve dell'azione: il tipo e il collegamento dicono se è un incontro, `produce` il resto. `momento` (giorno, fascia,
 *  origine) e `rangoAtteso` registrano l'incontro con il Confidente, che dà la sua Dote a ogni incontro (`incontriService`). */
export interface AzioneConEffetti {
  tipo: string;
  riferimento: RiferimentoAzioneDto | { tipo: string; chiave: string } | null;
  produce: EffettoAzione[];
  rangoAtteso?: number | null;
  momento?: MomentoIncontro;
}

/** Vero se la partita ha letto «Anima da cineasta» (Royal): i punti di film e DVD salgono di uno scalino. */
function haAnimaDaCineasta(partitaId: number): boolean {
  return !!prepared("SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = 'libro' AND chiave = 'anima-da-cineasta'").get(partitaId);
}

/** I punti di ogni Dote della partita, per sapere quanto ha dato una lettura. */
function puntiDoti(partitaId: number): Map<string, number> {
  return new Map(dotiSociali(partitaId).map((d) => [d.chiave, d.punti]));
}

/** Le visioni al cinema di un film già contate dalle spunte della partita (della guida e dell'utente). */
function visioniDalleSpunte(partitaId: number, chiave: string): number {
  const righe = [
    ...(prepared('SELECT effetti_json FROM azione_partita WHERE partita_id = ? AND effetti_json LIKE ?').all(partitaId, `%${chiave}%`) as Array<{ effetti_json: string }>),
    ...(prepared('SELECT effetti_json FROM azione_utente_partita WHERE partita_id = ? AND effetti_json LIKE ?').all(partitaId, `%${chiave}%`) as Array<{ effetti_json: string }>),
  ];
  let n = 0;
  for (const r of righe) {
    const e = JSON.parse(r.effetti_json) as EffettiAzioneDto;
    n += (e.letture ?? []).filter((l) => l.visione && l.categoria === 'film' && l.chiave === chiave).length;
  }
  return n;
}

/** Applica gli effetti dell'azione e dice che cosa ha applicato (null = niente). Un errore (un libro non ancora
 *  disponibile, un'attività che non esiste) interrompe la spunta con il suo motivo: meglio saperlo che ritrovarsi
 *  una spunta senza punti. */
export function applicaEffettiAzione(partitaId: number, a: AzioneConEffetti, opz: OpzioniSpunta = {}): EffettiAzioneDto | null {
  const doti: EffettiAzioneDto['doti'] = [];
  const letture: NonNullable<EffettiAzioneDto['letture']> = [];
  const turni: NonNullable<EffettiAzioneDto['turni']> = [];
  // le Doti di un'azione su un film o un DVD salgono di uno scalino con «Anima da cineasta», come i film stessi
  const cinema = (a.tipo === 'dvd' || a.riferimento?.tipo === 'film') && haAnimaDaCineasta(partitaId);
  for (const e of a.produce) {
    if (e.tipo === 'dote') {
      const punti = puntiDaNote(e.note, false, false, cinema);
      const agg = aggiornaDote(partitaId, e.dote, { delta: punti });
      doti.push({ chiave: e.dote, nome: agg.nome, delta: punti, note: e.note, cinema });
    } else if (e.tipo === 'lettura') {
      const stato = avanzamentoLettura(partitaId, e.categoria, e.chiave);
      // al cinema (nessun totale) «completato» è una visione: le visioni sono quante le spunte che le contano, questa compresa
      const visione = e.categoria === 'film' && stato.totale === null && e.almeno === null;
      const obiettivo = visione ? visioniDalleSpunte(partitaId, e.chiave) + 1 : e.almeno ?? stato.totale ?? Math.max(1, stato.avanzamento);
      // «almeno»: una lettura non torna mai indietro (chi ha già visto un film tre volte non ne perde due)
      const primaDoti = puntiDoti(partitaId);
      if (obiettivo > stato.avanzamento) impostaLettura(partitaId, e.categoria, e.chiave, { avanzamento: obiettivo });
      const dateDallaLettura = dotiSociali(partitaId).filter((d) => d.punti !== (primaDoti.get(d.chiave) ?? 0)).map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.punti - (primaDoti.get(d.chiave) ?? 0) }));
      letture.push({ categoria: e.categoria, chiave: e.chiave, nome: stato.nome, prima: stato.avanzamento, dopo: Math.max(obiettivo, stato.avanzamento), ...(dateDallaLettura.length ? { doti: dateDallaLettura } : {}), ...(visione ? { visione: true } : {}) });
    } else {
      const t = registraTurno(partitaId, e.attivita, e.doti);
      turni.push(t);
    }
  }
  // un incontro con un Confidente: la sua Dote a ogni incontro, una volta per incontro (anche senza note di risposta)
  let incontro: IncontroConfidenteDto | undefined;
  if (a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente' && a.momento && prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(a.riferimento.chiave)) {
    incontro = registraIncontro(partitaId, a.riferimento.chiave, a.momento, a.rangoAtteso ?? null);
  }
  let confidente: EffettiAzioneDto['confidente'] = null;
  if (a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente' && opz.noteRisposta) {
    const c = confidenti(partitaId).find((x) => x.chiave === a.riferimento!.chiave);
    if (c && c.rango > 0 && c.rango < 10) {
      const prima = c.punti;
      const agg = aggiornaConfidente(partitaId, c.chiave, { noteRisposta: opz.noteRisposta, bonusArcano: c.personaArcanoInScorta });
      confidente = { chiave: c.chiave, nome: c.nome, noteRisposta: opz.noteRisposta, punti: Math.round((agg.punti - prima) * 100) / 100, bonusArcano: c.personaArcanoInScorta };
    }
  }
  if (!doti.length && !confidente && !letture.length && !turni.length && !incontro) return null;
  return { doti, confidente, ...(letture.length ? { letture } : {}), ...(turni.length ? { turni } : {}), ...(incontro ? { incontro } : {}) };
}

/** Toglie esattamente ciò che la spunta aveva applicato: Doti, punti del Confidente, i turni registrati e l'incontro. */
export function annullaEffettiAzione(partitaId: number, e: EffettiAzioneDto): void {
  annullaEffetti(partitaId, e);
  for (const t of e.turni ?? []) togliTurno(partitaId, t.attivita, t.ordine);
  if (e.incontro) annullaIncontro(partitaId, e.incontro);
}

/** «Incontro con Tae Takemi: Coraggio +2», o «già contato» se quell'incontro (o quel passaggio di rango) c'era già. */
export function descriviIncontro(i: IncontroConfidenteDto): string {
  if (i.giaContato) return `Incontro con ${i.nome} già contato`;
  return `Incontro con ${i.nome}${i.doti.length ? `: ${i.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')}` : ''}`;
}

/** La frase di ciò che la spunta ha applicato, per lo storico. */
export function descriviEffettiApplicati(e: EffettiAzioneDto): string {
  const parti = e.doti.map((d) => `${d.nome} +${d.delta}${d.note ? ` (${'♪'.repeat(d.note)}${d.cinema ? ' + Anima da cineasta' : ''})` : ''}`);
  for (const l of e.letture ?? []) parti.push(`${l.dopo > l.prima ? `${l.nome}: da ${l.prima} a ${l.dopo}` : `${l.nome}: già a ${l.prima}`}${l.doti?.length ? ` (${l.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')})` : ''}`);
  for (const t of e.turni ?? []) parti.push(`${t.nome}: turno ${t.ordine}${t.doti.length ? ` (${t.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')})` : ''}`);
  if (e.incontro) parti.push(descriviIncontro(e.incontro));
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti (${e.confidente.noteRisposta} ${e.confidente.noteRisposta === 1 ? 'nota' : 'note'}${e.confidente.bonusArcano ? ', bonus arcano' : ''})`);
  return parti.join(', ');
}
