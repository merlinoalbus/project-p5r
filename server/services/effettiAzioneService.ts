// ============================================================
// effettiAzioneService — la spunta di un'azione (della guida o dell'utente) applica ciò che l'azione produce
// ============================================================
//
// Che cosa produce un'azione è un dato (`produce`, `shared/effettiAzione.ts`), non il testo delle
// note: la spunta dice le Doti che il gioco dà, porta avanti le letture, registra i turni dei lavori
// e, per un incontro con un Confidente, aggiunge le note della risposta scelta. **Le Doti non le
// tocca** (scelta dell'utente, 2026-09-30: si segnano solo a mano): `doti`, e le Doti di letture,
// turni e incontro, sono ciò che il gioco dà, da ricordare. Ciò che ha applicato si scrive
// (`EffettiAzioneDto`) per toglierlo identico togliendo la spunta: punti del Confidente e turni. Le
// letture no: la spunta dice «l'ho fatto quel giorno», la lettura «l'ho letto», e si disfa dalla
// pagina dove quel dato vive.
// ============================================================

import { prepared } from '../db/dbService.js';
import type { EffettiAzioneDto, IncontroConfidenteDto, RiferimentoAzioneDto } from '../../shared/types.js';
import type { EffettoAzione } from '../../shared/effettiAzione.js';
import { aggiornaConfidente, annullaEffetti, confidente as confidenteDellaPartita, nomeDote, puntiDaNote } from './partiteService.js';
import { applicaEventoDiario } from './puntiCronologici.js';
import { piazzamentoCorrente } from './piazzamentoEsamiService.js';
import { fortunaSu } from './fortunaService.js';
import { avanzamentoLettura, haAnimaDaCineasta, impostaLettura, registraTurno, togliTurno } from './attivitaService.js';
import { annullaIncontro, registraIncontro, type MomentoIncontro } from './incontriService.js';
import { z } from 'zod';
import { httpErrors } from '../utils/httpError.js';
import type { RichiestaRegistraAcquisto } from '../../shared/acquisti.js';
import type { SceltaEsitoSpunta } from '../../shared/esitiAttivita.js';
import { esitiDellAttivita, type SceltaRisolta } from './esitiAttivitaService.js';

const numeroReceipt = z.number().finite();
const chiaveReceipt = z.string().min(1);
const doteReceipt = z.object({ chiave: chiaveReceipt, nome: z.string(), delta: numeroReceipt,
  note: numeroReceipt.optional(), cinema: z.boolean().optional() }).passthrough();
const schemaRicevutaLegacy = z.object({
  doti: z.array(doteReceipt),
  confidente: z.object({ chiave: chiaveReceipt, nome: z.string(), noteRisposta: z.union([z.literal(1),z.literal(2),z.literal(3)]),
    punti: numeroReceipt, bonusArcano: z.boolean() }).passthrough().nullable(),
  letture: z.array(z.object({ categoria: z.enum(['libro','film','videogioco']), chiave: chiaveReceipt, nome: z.string(),
    prima: z.number().int().nonnegative(), dopo: z.number().int().nonnegative(), doti: z.array(doteReceipt).optional(), visione: z.boolean().optional() }).passthrough()).optional(),
  turni: z.array(z.object({ attivita: chiaveReceipt, nome: z.string(), ordine: z.number().int().positive(), doti: z.array(doteReceipt) }).passthrough()).optional(),
  incontro: z.object({ id: z.number().int().positive().nullable(), marcato: z.number().int().positive().nullable(), confidente: chiaveReceipt,
    nome: z.string(), verso: z.number().int().min(1).max(10), passaggio: z.boolean(), giaContato: z.boolean(), doti: z.array(doteReceipt),
    rango: z.object({ da: z.number().int().min(0).max(10), a: z.number().int().min(1).max(10), punti: numeroReceipt, sbloccato: z.boolean() }).passthrough().optional() }).passthrough().optional(),
  apertureDedali: z.array(z.object({ chiave: chiaveReceipt, nome: z.string() }).passthrough()).optional(),
}).passthrough();
/** Valida senza ricostruire o scartare campi della fotografia storica. */
export function leggiRicevutaEffettiAzione(raw: string | null): EffettiAzioneDto | null {
  if (raw === null) return null;
  let x: unknown;
  try { x = JSON.parse(raw) as unknown; } catch { x = undefined; }
  if (!schemaRicevutaLegacy.safeParse(x).success) throw httpErrors.conflict('ricevuta-spunta-illeggibile', 'La ricevuta storica della spunta non è riconoscibile: nessun effetto viene rieseguito, azzerato o annullato.');
  return x as EffettiAzioneDto;
}

export interface OpzioniSpunta {
  pesche?: import('../../shared/pesca.js').RichiestaRegistraSessionePesca[];
  /** Osservazioni di consumo già riviste, atomiche con la nuova spunta. */
  acquisti?: RichiestaRegistraAcquisto[];
  /** Note della risposta al Confidente (1–3) quando l'azione è un incontro con un Confidente; assente = nessun punto. */
  noteRisposta?: 1 | 2 | 3;
  /** Scelte esplicite della visita, validate da giornataService; assente preserva quelle già registrate. */
  apertureDedali?: string[];
  /** L13: l'esito dei turni delle attività che dichiarano esiti e le note delle Doti a valori possibili, per uid dell'effetto (`risolviScelteSpunta`). */
  scelteEsito?: SceltaEsitoSpunta[];
}

/** Ciò che serve dell'azione: il tipo e il collegamento dicono se è un incontro, `produce` il resto. `momento` (giorno, fascia,
 *  origine) e `rangoAtteso` registrano l'incontro con il Confidente, che dà la sua Dote a ogni incontro (`incontriService`). */
export interface AzioneConEffetti {
  tipo: string;
  riferimento: RiferimentoAzioneDto | { tipo: string; chiave: string } | null;
  produce: EffettoAzione[];
  rangoAtteso?: number | null;
  momento?: MomentoIncontro;
  apertureDedali?: EffettiAzioneDto['apertureDedali'];
  /** La voce porta l'effetto «invito avvenuto» di questo Confidente (R10-11k): i punti dell'incontro valgono ×1,2 (invito accettato subito). */
  invito?: boolean;
  /** La voce del Diario che applica gli effetti e il suo ordine nella giornata: i punti e il passaggio di rango entrano nel registro cronologico (R10-11c). */
  voceUid?: string;
  ordineVoce?: number;
  /** L13: le scelte già risolte, nella stessa posizione degli effetti di `produce` (undefined = l'effetto non chiede una scelta). */
  scelte?: ReadonlyArray<SceltaRisolta | undefined>;
}

/** Le visioni al cinema di un film già contate dalle spunte della partita (voci della giornata). */
function visioniDalleSpunte(partitaId: number, chiave: string): number {
  const righe = prepared('SELECT effetti_json FROM spunta_voce_partita WHERE partita_id = ? AND effetti_json LIKE ?').all(partitaId, `%${chiave}%`) as Array<{ effetti_json: string }>;
  let n = 0;
  for (const r of righe) {
    const e = leggiRicevutaEffettiAzione(r.effetti_json)!;
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
  for (const [i, e] of a.produce.entries()) {
    const scelta = a.scelte?.[i];
    if (e.tipo === 'dote') {
      // L13: una Dote a valori possibili vale le note scelte alla spunta (0 = nessuna: la ricevuta lo ricorda, nessuna proposta)
      if (e.possibili && scelta?.tipo !== 'dote') throw httpErrors.conflict('esito-da-scegliere', `${nomeDote(e.dote)}: scegli quante note hai ottenuto prima di spuntare.`);
      const note = scelta?.tipo === 'dote' ? scelta.note : e.note;
      // le Doti si segnano a mano (`aggiornaDote`): qui si dice che cosa il gioco dà, e lo si ricorda
      const punti = note === 0 ? 0 : puntiDaNote(note, false, fortunaSu(partitaId, e.dote), cinema);
      doti.push({ chiave: e.dote, nome: nomeDote(e.dote), delta: punti, note, cinema, ...(scelta?.tipo === 'dote' ? { scelta: true } : {}) });
    } else if (e.tipo === 'lettura') {
      const stato = avanzamentoLettura(partitaId, e.categoria, e.chiave);
      // al cinema (nessun totale) «completato» è una visione: le visioni sono quante le spunte che le contano, questa compresa
      const visione = e.categoria === 'film' && stato.totale === null && e.almeno === null;
      const obiettivo = visione ? visioniDalleSpunte(partitaId, e.chiave) + 1 : e.almeno ?? stato.totale ?? Math.max(1, stato.avanzamento);
      // «almeno»: una lettura non torna mai indietro (chi ha già visto un film tre volte non ne perde due);
      // che cosa ha dato lo dice il registro dei conseguimenti, non la differenza delle Doti (che la lettura non tocca)
      const dateDallaLettura = obiettivo > stato.avanzamento ? impostaLettura(partitaId, e.categoria, e.chiave, { avanzamento: obiettivo }).daSegnare ?? [] : [];
      letture.push({ categoria: e.categoria, chiave: e.chiave, nome: stato.nome, prima: stato.avanzamento, dopo: Math.max(obiettivo, stato.avanzamento), ...(dateDallaLettura.length ? { doti: dateDallaLettura } : {}), ...(visione ? { visione: true } : {}) });
    } else {
      // L13: il turno di un'attività che dichiara esiti dà le Doti dell'esito scelto (o ricavato dal giorno), e la ricevuta lo ricorda;
      // senza la scelta risolta il turno non si registra (sarebbe un turno vuoto: la regola vale per ogni strada che arriva qui)
      if (scelta?.tipo !== 'turno' && esitiDellAttivita(e.attivita)?.esiti) throw httpErrors.conflict('esito-da-scegliere', 'Questa attività dichiara i suoi esiti: scegli l’esito ottenuto prima di registrare il turno.');
      const t = scelta?.tipo === 'turno' ? registraTurno(partitaId, e.attivita, scelta.doti, undefined, undefined, scelta.esito) : registraTurno(partitaId, e.attivita, e.doti);
      turni.push(t);
    }
  }
  // un incontro con un Confidente: la sua Dote a ogni incontro, una volta per incontro (anche senza note di risposta)
  let incontro: IncontroConfidenteDto | undefined;
  if (a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente' && a.momento && prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(a.riferimento.chiave)) {
    incontro = registraIncontro(partitaId, a.riferimento.chiave, a.momento, a.rangoAtteso ?? null);
    // R10-17: il passaggio spuntato nel Diario porta il rango del Confidente al rango atteso (senza abbassarlo mai). Il blocco dei
    // semafori non ferma la spunta (la spunta del Diario non è mai stata bloccata): passa come «Segna comunque» e lo dice lo storico.
    // Un passaggio già registrato (dalla pagina, da un'altra spunta) non cambia niente. La ricevuta ricorda com'era, per togliere la spunta.
    if (incontro.passaggio && (incontro.id !== null || incontro.marcato !== null)) {
      const prima = confidenteDellaPartita(partitaId, a.riferimento.chiave);
      if (prima.rango < incontro.verso) {
        // R10-11c: la voce del Diario entra nel registro cronologico (si ricalcola se viene prima di altre già applicate); senza voce, come prima
        if (a.voceUid) applicaEventoDiario(partitaId, a.riferimento.chiave, { tipo: 'passaggio', voceUid: a.voceUid, data: a.momento.data, fascia: a.momento.fascia, ordineVoce: a.ordineVoce ?? 0, verso: incontro.verso });
        else aggiornaConfidente(partitaId, a.riferimento.chiave, { rango: incontro.verso, forza: true }, { origine: 'diario' });
        incontro = { ...incontro, rango: { da: prima.rango, a: incontro.verso, punti: prima.punti, sbloccato: prima.sbloccato } };
      }
    }
  }
  let confidente: EffettiAzioneDto['confidente'] = null;
  if (a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente' && opz.noteRisposta) {
    // solo quel Confidente, non tutti (rilievo P1' della verifica); un riferimento a un Confidente che non c'è non dà punti
    const c = prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(a.riferimento.chiave) ? confidenteDellaPartita(partitaId, a.riferimento.chiave) : undefined;
    if (c && c.rango > 0 && c.rango < 10) {
      const prima = c.punti;
      // R10-11c: le note entrano nel registro cronologico (con i parametri del calcolo, per rifarlo in ordine); senza voce, come prima
      const agg = a.voceUid && a.momento
        ? applicaEventoDiario(partitaId, c.chiave, { tipo: 'punti', voceUid: a.voceUid, data: a.momento.data, fascia: a.momento.fascia, ordineVoce: a.ordineVoce ?? 0,
          parametri: { noteRisposta: opz.noteRisposta, bonusArcano: c.personaArcanoInScorta, invito: !!a.invito, piazzamento: piazzamentoCorrente(partitaId) } })
        : aggiornaConfidente(partitaId, c.chiave, { noteRisposta: opz.noteRisposta, bonusArcano: c.personaArcanoInScorta, ...(a.invito ? { invito: true } : {}) });
      confidente = { chiave: c.chiave, nome: c.nome, noteRisposta: opz.noteRisposta, punti: Math.round((agg.punti - prima) * 100) / 100, bonusArcano: c.personaArcanoInScorta };
    }
  }
  if (!doti.length && !confidente && !letture.length && !turni.length && !incontro && !a.apertureDedali?.length) return null;
  return { doti, confidente, ...(letture.length ? { letture } : {}), ...(turni.length ? { turni } : {}), ...(incontro ? { incontro } : {}), ...(a.apertureDedali?.length ? { apertureDedali: a.apertureDedali } : {}) };
}

/** Toglie esattamente ciò che la spunta aveva applicato: punti del Confidente, i turni registrati e l'incontro (le Doti no). */
export function annullaEffettiAzione(partitaId: number, e: EffettiAzioneDto): void {
  if (!schemaRicevutaLegacy.safeParse(e).success) throw httpErrors.conflict('ricevuta-spunta-illeggibile', 'La ricevuta storica non è riconoscibile: nessun annullo è stato eseguito.');
  annullaEffetti(partitaId, e);
  for (const t of e.turni ?? []) togliTurno(partitaId, t.attivita, t.ordine);
  if (e.incontro) annullaIncontro(partitaId, e.incontro);
}

/** «Incontro con Tae Takemi: Coraggio +2», o «già contato» se quell'incontro (o quel passaggio di rango) c'era già. */
function descriviIncontro(i: IncontroConfidenteDto): string {
  const rango = i.rango ? `, rango ${i.rango.da} → ${i.rango.a}` : '';
  if (i.giaContato) return `Incontro con ${i.nome} già contato${rango}`;
  return `Incontro con ${i.nome}${i.doti.length ? `: ${i.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')}` : ''}${rango}`;
}

/** La frase di ciò che la spunta ha fatto, per lo storico. Le Doti sono quelle che il gioco dà, da segnare a mano. */
export function descriviEffettiApplicati(e: EffettiAzioneDto): string {
  // L13: «nessuna nota» scelta alla spunta per una Dote a valori possibili si dice, non si propone
  const parti = e.doti.map((d) => d.scelta && d.note === 0 ? `${d.nome}: nessuna nota (scelta alla spunta)` : `${d.nome} +${d.delta}${d.note ? ` (${'♪'.repeat(d.note)}${d.cinema ? ' + Anima da cineasta' : ''}${d.scelta ? ', scelte alla spunta' : ''})` : ''} da segnare nelle Doti`);
  for (const l of e.letture ?? []) parti.push(`${l.dopo > l.prima ? `${l.nome}: da ${l.prima} a ${l.dopo}` : `${l.nome}: già a ${l.prima}`}${l.doti?.length ? ` (${l.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')})` : ''}`);
  for (const t of e.turni ?? []) parti.push(`${t.nome}: turno ${t.ordine}${t.esito ? ` · esito ${t.esito.nome}${t.esito.automatico ? ' (dal giorno)' : ''}` : t.esito === null ? ' · senza punti' : ''}${t.doti.length ? ` (${t.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')})` : ''}`);
  if (e.incontro) parti.push(descriviIncontro(e.incontro));
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti (${e.confidente.noteRisposta} ${e.confidente.noteRisposta === 1 ? 'nota' : 'note'}${e.confidente.bonusArcano ? ', bonus arcano' : ''})`);
  for (const a of e.apertureDedali ?? []) parti.push(a.nome);
  return parti.join(', ');
}
