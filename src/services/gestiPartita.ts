import { useEffect } from 'react';
import { create } from 'zustand';
import { z } from 'zod';
import { CHIAVI_DOTI } from '../../shared/doti';
import { schemaValutazionePresenza } from '../../shared/valutazioneAcquisto';
import type { RichiestaRegistraAcquisto, RichiestaAnnullaProvenienza, RichiestaRimozioneLegacy, RicevutaOperazioneAcquistoDto } from '../../shared/acquisti';
import type { RichiestaDecisioneProposte, RicevutaDecisioneProposteDto, RiferimentoPropostaPartita } from '../../shared/propostePartita';
import type { AvanzamentoGiornataDto, AzionePercorsoDto } from '../../shared/types';
import { allineaDopoGesto, puntoPartitaNelloStore } from '../utils/giornoAvanzato';
import type { ApplicazioneStatoPartitaDto, StatoEffettiVoceDto } from '../../shared/effettiVoce';
import { notificaApplicazioni } from '../utils/applicazioniEffetti';
import type { NuovaSessionePesca, RicevutaOperazionePescaDto } from '../../shared/pesca';
import { confermaPesca, leggiRicevutaPesca, type OperazioneClientPesca } from './api/pesca';
import { schemaEffettoGestoPesca, schemaNuovaSessioneGestoPesca, schemaOperazioneGestoPesca, schemaRegistraSessioneGestoPesca, schemaRicevutaGestoPesca } from './schemaGestoPesca';
import { apiGet, apiPost, apiPut, isApiError } from './api/_helpers';
import { notifica } from '../stores/notificationStore';

const CHIAVE = 'p5r.gesti-partita.v1';
const uid = z.string().regex(/^[0-9a-f]{32}$/), token = z.string().regex(/^[0-9a-f]{64}$/);
const intero = z.number().int().safe(), positivo = intero.positive();
const chiave = z.string().min(1).max(200).refine(s => s.trim() === s);
const fonte = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('manuale') }).strict(), z.object({ tipo: z.literal('diario'), voceUid: uid, effettoUid: uid }).strict()]);
const nuovoAcquisto = z.object({
  operazioneId: uid, articolo: chiave,
  momento: z.object({ giorno: z.string().regex(/^\d{2}-\d{2}$/), fascia: z.enum(['giorno','sera']), ordine: intero.min(0).max(1_000_000) }).strict(),
  variante: z.enum(CHIAVI_DOTI), fortuna: z.boolean().nullable(), fonte,
  scelta: z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('nuova') }).strict(), z.object({ tipo: z.literal('collega'), acquistoId: uid }).strict()]),
  rapportoLegacy: z.object({ tipo: z.enum(['rappresenta','ulteriore']), firma: token, valutazione: schemaValutazionePresenza.optional() }).strict().nullable(),
}).strict();
const registra = nuovoAcquisto.extend({ revisioneAcquistiAttesa: token }).strict();
const annulla = z.object({ operazioneId: uid, provenienzaId: uid, revisioneAcquistiAttesa: token }).strict();
const rimuovi = z.object({ operazioneId: uid, articolo: chiave, revisioneAcquistiAttesa: token }).strict();
const ref = z.object({ id: positivo, uid }).strict();
const refs = z.array(ref).min(1).max(100).refine(v => new Set(v.map(r => `${r.id}:${r.uid}`)).size === v.length && new Set(v.map(r => r.id)).size === v.length && new Set(v.map(r => r.uid)).size === v.length);
const decisione = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('applica'), proposte: refs }).strict(),
  z.object({ tipo: z.literal('scarta'), proposte: refs }).strict(),
  z.object({ tipo: z.literal('non-conteggiata'), proposte: refs }).strict(),
  z.object({ tipo: z.literal('ignota'), proposte: refs }).strict(),
  z.object({ tipo: z.literal('gia-conteggiata'), proposta: ref, quantita: positivo.max(9_999_999) }).strict(),
  z.object({ tipo: z.literal('applica-effetto'), proposta: ref, acquisto: nuovoAcquisto.optional(), revisioneAcquistiAttesa: token.optional(), pesca: schemaNuovaSessioneGestoPesca.optional(), revisionePescaAttesa: token.optional() }).strict()
    .refine(v => (v.acquisto === undefined) === (v.revisioneAcquistiAttesa === undefined) && (v.pesca === undefined) === (v.revisionePescaAttesa === undefined) && !(v.acquisto && v.pesca)),
]);
const decidi = z.object({ operazioneId: uid, decisione, revisioneProposteAttesa: token }).strict();
const doteNote = z.object({ dote: z.enum(CHIAVI_DOTI), note: z.union([z.literal(1),z.literal(2),z.literal(3)]) }).strict();
const effetto = z.discriminatedUnion('tipo', [
  doteNote.extend({ tipo: z.literal('dote'), possibili: z.array(z.union([z.literal(1),z.literal(2),z.literal(3)])).min(2).max(3).optional() }).strict(),
  z.object({ tipo: z.literal('lettura'), categoria: z.enum(['libro','film','videogioco']), chiave, almeno: positivo.nullable() }).strict(),
  z.object({ tipo: z.literal('turno'), attivita: chiave, doti: z.array(doteNote).min(1).max(20).optional(), esito: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/).optional() }).strict(),
  z.object({ tipo: z.literal('yen'), importo: z.number().int().min(-9_999_999).max(9_999_999).refine(n => n !== 0) }).strict(),
  z.object({ tipo: z.literal('oggetto'), oggetto: chiave, quantita: z.number().int().min(1).max(999) }).strict(),
  z.object({ tipo: z.literal('trofeo'), trofeo: chiave }).strict(),
  z.object({ tipo: z.literal('sblocco'), bersaglio: z.enum(['richiesta','attivita']), chiave }).strict(),
  z.object({ tipo: z.literal('acquisto'), articolo: chiave, variante: z.enum(CHIAVI_DOTI).nullable(), fortuna: z.boolean().nullable().optional(), sostituisceDoti: z.array(uid).max(20).refine(v => new Set(v).size === v.length) }).strict(),
  schemaEffettoGestoPesca,
  z.object({ tipo: z.literal('fortuna'), dote: z.enum(CHIAVI_DOTI) }).strict(),
  z.object({ tipo: z.literal('storia'), evento: chiave }).strict(),
  z.object({ tipo: z.literal('domanda'), domanda: positivo }).strict(),
  z.object({ tipo: z.literal('cruciverba'), data: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) }).strict(),
  z.object({ tipo: z.literal('richiesta'), richiesta: chiave }).strict(),
  z.object({ tipo: z.literal('articolo'), articolo: chiave, quantita: z.number().int().min(2).max(999).optional() }).strict(),
  z.object({ tipo: z.literal('persona'), persona: z.number().int().positive() }).strict(),
  z.object({ tipo: z.literal('invito'), invito: z.string().regex(/^[a-z0-9-]+\/(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) }).strict(),
]);
const decisioneEffetto = z.object({ operazioneId: uid, decisione: z.enum(['conferma','scarta']), effetto: effetto.optional(), revisionePropostaAttesa: token }).strict()
  .refine(v => v.decisione === 'conferma' ? v.effetto !== undefined : v.effetto === undefined);
const spunta = z.object({ uid, fatta: z.literal(true), noteRisposta: z.union([z.literal(1),z.literal(2),z.literal(3)]).optional(),
  apertureDedali: z.array(z.string().min(1).max(200)).max(100).refine(a => new Set(a).size === a.length).optional(),
  acquisti: z.array(registra).min(1).max(100).refine(a => new Set(a.map(r => r.operazioneId)).size === a.length).optional(),
  pesche: z.array(schemaRegistraSessioneGestoPesca).min(1).max(100).refine(a => new Set(a.map(r => r.operazioneId)).size === a.length).optional(),
  // L13: le scelte d'esito viaggiano con la spunta (stesso corpo della rotta)
  scelteEsito: z.array(z.discriminatedUnion('tipo', [
    z.object({ effettoUid: uid, tipo: z.literal('turno'), esito: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/).nullable() }).strict(),
    z.object({ effettoUid: uid, tipo: z.literal('dote'), note: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) }).strict(),
    z.object({ effettoUid: uid, tipo: z.literal('alternativa'), scelto: uid.nullable() }).strict(),
  ])).min(1).max(50).refine(a => new Set(a.map(s => s.effettoUid)).size === a.length).optional(),
}).strict().refine(v => ((v.acquisti?.length ?? 0) + (v.pesche?.length ?? 0) > 0) && [...(v.acquisti ?? []), ...(v.pesche ?? [])].every(r => r.fonte.tipo === 'diario' && r.fonte.voceUid === v.uid));
const bersaglioSchema = z.object({ etichetta: z.string().min(1).max(500), articolo: chiave.optional(), voceUid: uid.optional(), effettoUid: uid.optional(), pesca: z.literal(true).optional(), sessionePesca: uid.optional(), fontePesca: uid.optional() }).strict();
export type BersaglioGestoPartita = z.infer<typeof bersaglioSchema>;
export type CorpoSpuntaAcquisti = Omit<z.infer<typeof spunta>, 'uid'>;
const payload = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('acquisto'), dati: registra }).strict(),
  z.object({ tipo: z.literal('annullo-fonte'), dati: annulla }).strict(),
  z.object({ tipo: z.literal('rimozione-legacy'), dati: rimuovi }).strict(),
  z.object({ tipo: z.literal('decisione-proposte'), dati: decidi }).strict(),
  z.object({ tipo: z.literal('spunta-acquisti'), dati: spunta }).strict(),
  z.object({ tipo: z.literal('decisione-effetto-voce'), propostaId: z.string().min(1).max(200), dati: decisioneEffetto }).strict(),
  z.object({ tipo: z.literal('pesca'), dati: schemaOperazioneGestoPesca }).strict(),
]);
type Payload = z.infer<typeof payload>;
type Ricevuta = RicevutaOperazioneAcquistoDto | RicevutaOperazionePescaDto | RicevutaDecisioneProposteDto | AzionePercorsoDto | StatoEffettiVoceDto;
const baseRecord = z.object({ id: z.string().min(1).max(100), partitaId: positivo.nullable(), operazioneId: uid, bersaglio: bersaglioSchema,
  payload, stato: z.enum(['invio','incerto','riuscita','rifiutata']), creatoIl: z.string(), aggiornatoIl: z.string(),
  errore: z.string().nullable(), ricevuta: z.unknown().nullable(), ricevutaPersistita: z.boolean(),
}).strict();
export interface GestoPartita extends Omit<z.infer<typeof baseRecord>, 'ricevuta'> { ricevuta: Ricevuta | null }
export interface ScopeGestoPartita { articolo?: string; provenienzaId?: string; voceUid?: string; proposte?: RiferimentoPropostaPartita[]; pesca?: boolean; sessionePesca?: string; fontePesca?: string }
export interface StatoGestiPartita { gesti: readonly GestoPartita[]; erroreArchivio: string | null; versionePerPartita: Readonly<Record<number, number>>; versioneGuida: number }
const store = create<StatoGestiPartita>(() => ({ gesti: [], erroreArchivio: null, versionePerPartita: {}, versioneGuida: 0 }));
let caricato = false, ultimoRaw: string | null = null;
const inVolo = new Set<string>();
const copia = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
function immutabile<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(immutabile); Object.freeze(v); } return v; }
const uguali = (a: unknown, b: unknown): boolean => {
  const ordina = (v: unknown): unknown => Array.isArray(v) ? v.map(ordina) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([,x]) => x !== undefined).sort(([x],[y]) => x.localeCompare(y)).map(([k,x]) => [k,ordina(x)])) : v;
  return JSON.stringify(ordina(a)) === JSON.stringify(ordina(b));
};
const erroreTesto = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
function bloccaArchivio(e: unknown): Error {
  const messaggio = `Registro dei gesti non disponibile: ${erroreTesto(e)}. Nessun nuovo invio è consentito; il contenuto non viene cancellato.`;
  store.setState({ erroreArchivio: messaggio });
  return new Error(messaggio);
}
const refsDecisione = (d: RichiestaDecisioneProposte['decisione']) => 'proposte' in d ? d.proposte : [d.proposta];
const idOperazione = (p: Payload) => p.tipo === 'spunta-acquisti' ? [...(p.dati.acquisti ?? []), ...(p.dati.pesche ?? [])][0]!.operazioneId : p.tipo === 'pesca' ? p.dati.richiesta.operazioneId : p.dati.operazioneId;
const identitaGesto = (partitaId: number | null, operazioneId: string) => `${partitaId === null ? 'guida' : partitaId}:${operazioneId}`;
const operazioni = (p: Payload): string[] => p.tipo === 'spunta-acquisti' ? [...(p.dati.acquisti ?? []), ...(p.dati.pesche ?? [])].map(a => a.operazioneId)
  : p.tipo === 'decisione-proposte' && p.dati.decisione.tipo === 'applica-effetto' ? [p.dati.operazioneId, ...[p.dati.decisione.acquisto?.operazioneId, p.dati.decisione.pesca?.operazioneId].filter((x): x is string => x !== undefined)] : [idOperazione(p)];
function ambiti(p: Payload, b: BersaglioGestoPartita): string[] {
  const a = new Set<string>();
  if (b.articolo) a.add(`articolo:${b.articolo}`);
  if (b.voceUid) a.add(`voce:${b.voceUid}`);
  if (b.pesca) a.add('pesca');
  if (b.sessionePesca) a.add(`pesca-sessione:${b.sessionePesca}`);
  if (b.fontePesca) a.add(`pesca-fonte:${b.fontePesca}`);
  const aggiungiPesca = (r: NuovaSessionePesca) => {
    a.add('pesca');
    if (r.fonte.tipo === 'diario') a.add(`voce:${r.fonte.voceUid}`);
    if (r.scelta.tipo === 'collega') a.add(`pesca-sessione:${r.scelta.sessioneId}`);
  };
  if (p.tipo === 'pesca') {
    a.add('pesca');
    if (p.dati.azione === 'registra-sessione') aggiungiPesca(p.dati.richiesta);
    if (p.dati.bersaglio !== null) a.add(`${p.dati.azione === 'rimuovi-fonte' || p.dati.azione === 'rimuovi-fatto' ? 'pesca-fonte' : 'pesca-sessione'}:${p.dati.bersaglio}`);
  }
  if (p.tipo === 'acquisto' || p.tipo === 'rimozione-legacy') a.add(`articolo:${p.dati.articolo}`);
  if (p.tipo === 'acquisto' && p.dati.fonte.tipo === 'diario') a.add(`voce:${p.dati.fonte.voceUid}`);
  if (p.tipo === 'annullo-fonte') a.add(`fonte:${p.dati.provenienzaId}`);
  if (p.tipo === 'decisione-proposte') {
    refsDecisione(p.dati.decisione).forEach(r => a.add(`proposta:${r.id}:${r.uid}`));
    if (p.dati.decisione.tipo === 'applica-effetto' && p.dati.decisione.acquisto) {
      const x = p.dati.decisione.acquisto; a.add(`articolo:${x.articolo}`);
      if (x.fonte.tipo === 'diario') a.add(`voce:${x.fonte.voceUid}`);
    }
    if (p.dati.decisione.tipo === 'applica-effetto' && p.dati.decisione.pesca) aggiungiPesca(p.dati.decisione.pesca);
  }
  if (p.tipo === 'spunta-acquisti') { a.add(`voce:${p.dati.uid}`); p.dati.acquisti?.forEach(r => a.add(`articolo:${r.articolo}`)); p.dati.pesche?.forEach(aggiungiPesca); }
  if (p.tipo === 'decisione-effetto-voce') a.add(`candidato:${p.propostaId}`);
  return [...a];
}
const pendente = (g: GestoPartita) => g.stato === 'invio' || g.stato === 'incerto' || !g.ricevutaPersistita;
const schemaRicevutaAcquisto = z.object({ operazioneId: uid, partitaId: positivo, esito: z.enum(['registrata','fonte-collegata','gia-collegata','fonte-rimossa','presenza-rimossa']), acquistoId: uid.nullable(), provenienzaId: uid.nullable(), articolo: chiave, creataIl: z.string().min(1) }).strict();
const movimento = z.object({ tipo: z.enum(['dote','yen','punti-pesca']), chiave: z.string(), prima: intero, delta: intero, dopo: intero }).strict().refine(v => v.prima + v.delta === v.dopo);
const schemaRicevutaDecisione = z.object({ operazioneId: uid, partitaId: positivo, decisione: z.enum(['applica','scarta','non-conteggiata','ignota','gia-conteggiata','applica-effetto']), proposte: refs, movimenti: z.array(movimento), decisaIl: z.string().min(1) }).strict();
function corrispondeAcquisto(x: unknown, partita: number, r: RichiestaRegistraAcquisto): boolean {
  const v = schemaRicevutaAcquisto.safeParse(x);
  return v.success && v.data.operazioneId === r.operazioneId && v.data.partitaId === partita && v.data.articolo === r.articolo
    && ['registrata','fonte-collegata','gia-collegata'].includes(v.data.esito) && v.data.acquistoId !== null && v.data.provenienzaId !== null
    && (r.scelta.tipo !== 'collega' || v.data.acquistoId === r.scelta.acquistoId);
}
function corrispondePesca(x: unknown, partitaId: number, o: OperazioneClientPesca): x is RicevutaOperazionePescaDto {
  const v = schemaRicevutaGestoPesca.safeParse(x);
  if (!v.success || v.data.partitaId !== partitaId || v.data.operazioneId !== o.richiesta.operazioneId
    || v.data.azione !== o.azione || v.data.bersaglio !== o.bersaglio || !uguali(v.data.richiesta, o.richiesta)) return false;
  const r = v.data;
  switch (o.azione) {
    case 'registra-sessione': return ['sessione-creata', 'fonte-collegata', 'gia-collegata'].includes(r.esito) && r.sessioneId !== null && r.provenienzaId !== null
      && (o.richiesta.scelta.tipo !== 'collega' || r.sessioneId === o.richiesta.scelta.sessioneId);
    case 'salva-osservazione': return r.esito === 'osservazione-salvata' && r.sessioneId === o.bersaglio && r.osservazioneId !== null;
    case 'rimuovi-sessione': return r.esito === 'sessione-rimossa' && r.sessioneId === o.bersaglio;
    case 'rimuovi-fonte': return r.esito === 'fonte-rimossa' && r.provenienzaId === o.bersaglio;
    case 'registra-fatto': return r.esito === 'fatto-registrato' && r.fattoFonteId !== null;
    case 'rimuovi-fatto': return r.esito === 'fatto-rimosso' && r.fattoFonteId === o.bersaglio;
    case 'acquista-esca': return r.esito === 'esca-acquistata' && r.acquistoEscaId !== null;
    case 'rimuovi-acquisto-esca': return r.esito === 'acquisto-esca-rimosso' && r.acquistoEscaId === o.bersaglio;
    case 'rettifica-punti': return r.esito === 'punti-rettificati';
  }
}
/** Prova esclusivamente gli ID delle ricevute, anche se in seguito annullate; non ripete il PUT. */
function ricevutaSpuntaValida(x: unknown, g: GestoPartita): x is AzionePercorsoDto {
  if (g.payload.tipo !== 'spunta-acquisti' || g.partitaId === null || !x || typeof x !== 'object') return false;
  const v = x as AzionePercorsoDto, richieste = g.payload.dati.acquisti ?? [], pesche = g.payload.dati.pesche ?? [], partitaId = g.partitaId;
  if (v.uid !== g.payload.dati.uid || typeof v.fatta !== 'boolean' || !Array.isArray(v.ricevuteEffetti)) return false;
  const collegate = richieste.map(r => {
    const f = r.fonte;
    return f.tipo === 'diario' ? v.ricevuteEffetti!.find(e => e && e.formato === 1 && e.tipo === 'acquisto' && e.partitaId === g.partitaId
    && e.voceUid === f.voceUid && e.effettoUid === f.effettoUid && e.chiave === r.articolo
    && e.ricevuta && corrispondeAcquisto(e.ricevuta.operazione, partitaId, r)
    && (e.ricevuta.operazione as RicevutaOperazioneAcquistoDto).acquistoId === e.ricevuta.acquistoId
    && (e.ricevuta.operazione as RicevutaOperazioneAcquistoDto).provenienzaId === e.ricevuta.provenienzaId) : undefined;
  });
  const sessioni = pesche.map(r => {
    const f = r.fonte, { revisionePescaAttesa, ...richiesta } = r;
    return f.tipo === 'diario' ? v.ricevuteEffetti!.find(e => e && e.formato === 1 && e.tipo === 'pesca' && e.partitaId === partitaId
      && e.voceUid === f.voceUid && e.effettoUid === f.effettoUid && e.ricevuta
      && corrispondePesca(e.ricevuta.operazione, partitaId, { azione: 'registra-sessione', richiesta, bersaglio: null, revisionePescaAttesa })
      && (e.ricevuta.operazione as RicevutaOperazionePescaDto).sessioneId === e.ricevuta.sessioneId
      && (e.ricevuta.operazione as RicevutaOperazionePescaDto).provenienzaId === e.ricevuta.provenienzaId) : undefined;
  });
  const tutte = [...collegate, ...sessioni];
  if (tutte.some(r => r === undefined) || new Set(tutte.map(r => r!.id)).size !== tutte.length) return false;
  if (pesche.length) {
    const generazioni = tutte.map(r => r!.ricevuta.generazione);
    if (generazioni.some(v => !uid.safeParse(v).success) || new Set(generazioni).size !== 1) return false;
  }
  return true;
}
const schemaStatoEffetti = z.object({
  voceUid: uid, stato: z.enum(['convertita','legacy-da-correggere']),
  effetti: z.array(z.object({ uid, ordine: intero.min(0), effetto, origine: z.enum(['seed','regola','utente']) }).strict())
    .refine(v => new Set(v.map(e => e.uid)).size === v.length && new Set(v.map(e => e.ordine)).size === v.length),
  rawLegacy: z.string(), motivo: z.string().nullable(), revisione: token,
}).strict();
function validaRicevuta(x: unknown, g: GestoPartita): Ricevuta {
  const p = g.payload;
  if (p.tipo === 'pesca') {
    if (g.partitaId !== null && corrispondePesca(x, g.partitaId, p.dati)) return x;
  } else if (p.tipo === 'decisione-effetto-voce') {
    const v = schemaStatoEffetti.safeParse(x);
    if (v.success && g.partitaId === null && v.data.voceUid === g.bersaglio.voceUid
      && (p.dati.decisione === 'scarta' || (v.data.stato === 'convertita' && v.data.effetti.some(e => uguali(e.effetto, p.dati.effetto))))) return v.data;
  } else if (p.tipo === 'spunta-acquisti') { if (ricevutaSpuntaValida(x, g)) return x; }
  else if (p.tipo === 'decisione-proposte') {
    const v = schemaRicevutaDecisione.safeParse(x);
    if (v.success && v.data.operazioneId === g.operazioneId && v.data.partitaId === g.partitaId && v.data.decisione === p.dati.decisione.tipo
      && uguali(v.data.proposte, refsDecisione(p.dati.decisione))) return v.data;
  } else if (g.partitaId !== null) {
    const v = schemaRicevutaAcquisto.safeParse(x);
    if (v.success && v.data.operazioneId === g.operazioneId && v.data.partitaId === g.partitaId) {
      if (p.tipo === 'acquisto' && corrispondeAcquisto(v.data, g.partitaId, p.dati)) return v.data;
      if (p.tipo === 'annullo-fonte' && v.data.esito === 'fonte-rimossa' && v.data.provenienzaId === p.dati.provenienzaId && v.data.acquistoId !== null && (!g.bersaglio.articolo || v.data.articolo === g.bersaglio.articolo)) return v.data;
      if (p.tipo === 'rimozione-legacy' && v.data.esito === 'presenza-rimossa' && v.data.articolo === p.dati.articolo && v.data.provenienzaId === null && v.data.acquistoId === null) return v.data;
    }
  }
  throw new Error('La risposta non contiene una ricevuta canonica della medesima operazione: esito da verificare.');
}
function validaRecord(x: unknown): GestoPartita {
  const r = baseRecord.parse(x), g = r as GestoPartita;
  if ((r.payload.tipo === 'decisione-effetto-voce') !== (r.partitaId === null) || (r.partitaId === null && !r.bersaglio.voceUid)
    || r.operazioneId !== idOperazione(r.payload) || r.id !== identitaGesto(r.partitaId, r.operazioneId) || (r.stato === 'riuscita') !== (r.ricevuta !== null)
    || (r.ricevutaPersistita && r.stato !== 'riuscita' && r.stato !== 'rifiutata')) throw new Error('Identità o stato di un gesto non riconoscibili.');
  if (r.ricevuta !== null) validaRicevuta(r.ricevuta, g);
  return immutabile(copia(g));
}
function scrivi(gesti: readonly GestoPartita[]): void {
  try {
    const storage = window.sessionStorage;
    if (storage.getItem(CHIAVE) !== ultimoRaw) throw new Error('Il contenuto della scheda è cambiato esternamente.');
    const raw = JSON.stringify({ versione: 1, gesti });
    storage.setItem(CHIAVE, raw);
    if (storage.getItem(CHIAVE) !== raw) throw new Error('La persistenza non è stata confermata.');
    ultimoRaw = raw;
  } catch (e) { throw bloccaArchivio(e); }
  store.setState({ gesti: immutabile(copia(gesti)), erroreArchivio: null });
}
export function caricaRegistroGestiPartita(): void {
  if (caricato) return;
  caricato = true;
  const esitiNoti = store.getState().gesti.filter(g => (g.stato === 'riuscita' || g.stato === 'rifiutata') && !g.ricevutaPersistita);
  const pendentiNoti = store.getState().gesti.filter(g => pendente(g) || inVolo.has(g.id));
  try {
    ultimoRaw = window.sessionStorage.getItem(CHIAVE);
    const letti = ultimoRaw === null ? [] : z.object({ versione: z.literal(1), gesti: z.array(z.unknown()) }).strict().parse(JSON.parse(ultimoRaw)).gesti.map(validaRecord);
    if (new Set(letti.map(g => g.id)).size !== letti.length) throw new Error('ID di gesto duplicati.');
    const ids = letti.flatMap(g => operazioni(g.payload).map(id => identitaGesto(g.partitaId, id)));
    if (new Set(ids).size !== ids.length) throw new Error('Un identificativo di operazione appartiene a più gesti.');
    for (const noto of pendentiNoti) {
      const letto = letti.find(g => g.id === noto.id);
      if (!letto || !uguali(letto.payload, noto.payload) || !uguali(letto.bersaglio, noto.bersaglio)) throw new Error('Un gesto pendente è assente o cambiato nel registro conservato: nessuna sovrascrittura.');
    }
    const gesti = letti.map(g => {
      const nota = esitiNoti.find(n => n.id === g.id);
      if (nota) {
        if (!uguali(nota.payload, g.payload) || !uguali(nota.bersaglio, g.bersaglio)) throw new Error('Il gesto conservato diverge dalla ricevuta già acquisita.');
        return nota;
      }
      return g.stato === 'invio' ? { ...g, stato: 'incerto' as const, errore: 'La scheda è stata ricaricata durante l’invio: verifica esplicitamente questa operazione.' } : g;
    });
    if (esitiNoti.some(n => !gesti.some(g => g.id === n.id))) throw new Error('Manca il gesto dell’esito già acquisito: nessuna sovrascrittura.');
    store.setState({ gesti: immutabile(gesti), erroreArchivio: null });
    if (letti.some(g => g.stato === 'invio')) scrivi(gesti);
  } catch (e) { bloccaArchivio(e); }
}
export function useGestiPartita(): StatoGestiPartita {
  const stato = store();
  useEffect(caricaRegistroGestiPartita, []);
  return stato;
}
/** Solo una mutazione esplicita segnala chi deve ricaricare; il servizio non legge contesti attivi né fa refresh. */
export function segnalaMutazioneEffetti(partitaId: number | null): void {
  if (partitaId === null) { store.setState(s => ({ versioneGuida: s.versioneGuida + 1 })); return; }
  positivo.parse(partitaId);
  store.setState(s => ({ versionePerPartita: { ...s.versionePerPartita, [partitaId]: (s.versionePerPartita[partitaId] ?? 0) + 1 } }));
}
export function gestoPendenteNelloScope(partitaId: number | null, scope: ScopeGestoPartita): GestoPartita | null {
  const a = [scope.articolo && `articolo:${scope.articolo}`, scope.provenienzaId && `fonte:${scope.provenienzaId}`, scope.voceUid && `voce:${scope.voceUid}`,
    scope.pesca && 'pesca', scope.sessionePesca && `pesca-sessione:${scope.sessionePesca}`, scope.fontePesca && `pesca-fonte:${scope.fontePesca}`,
    ...(scope.proposte ?? []).map(r => `proposta:${r.id}:${r.uid}`)].filter((s): s is string => !!s);
  return store.getState().gesti.find(g => g.partitaId === partitaId && pendente(g) && ambiti(g.payload, g.bersaglio).some(k => a.includes(k))) ?? null;
}
/** Nel rilascio le rotte `/partite/:id/acquisti/legacy/*` non esistono (costante di build: il percorso esce dal bundle). */
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
const PERCORSO_RIMOZIONE_LEGACY: string | null = IN_RILASCIO ? null : '/acquisti/legacy/rimozione';
/**
 * Separa dalla risposta di QUALUNQUE gesto l'eventuale avanzamento della partita (`giornoAvanzato` / `fasciaAvanzata`) dalla ricevuta vera e propria.
 * Il server lo aggiunge a ogni risposta di `/api/partite/:id/…` che abbia fatto avanzare la partita (anche chiudendo da sola una decisione:
 * `responseShape`), e la spunta lo porta da sé: non fa parte di nessuna ricevuta canonica (gli schemi sono `.strict()`) e non si conserva.
 */
function separaAvanzamento(x: unknown): { avanzamento: AvanzamentoGiornataDto; resto: unknown } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { avanzamento: {}, resto: x };
  const { giornoAvanzato, fasciaAvanzata, ...resto } = x as Record<string, unknown> & AvanzamentoGiornataDto;
  return { avanzamento: { ...(giornoAvanzato ? { giornoAvanzato } : {}), ...(fasciaAvanzata ? { fasciaAvanzata } : {}) }, resto };
}
const schemaApplicazioni = z.array(z.object({
  partitaId: z.number().int(), partitaNome: z.string(), effettoUid: z.string(),
  esito: z.enum(['segnato', 'annullato', 'gia-presente', 'fortuna-non-valida', 'da-approvare', 'non-applicato']), testo: z.string(), motivo: z.string().optional(),
}).strict());
/** L13 (decisione 19): stacca dalla risposta della conferma di un candidato l'esito nelle partite che hanno già spuntato la voce (il resto della
 *  ricevuta lo valida `validaRicevuta`, che resta stretta). `illeggibile`: c'era, ma non ha la forma attesa (chi chiama lo dice). */
function separaApplicazioni(x: unknown): { applicazioni: ApplicazioneStatoPartitaDto[] | undefined; illeggibile: boolean; resto: unknown } {
  if (!x || typeof x !== 'object' || Array.isArray(x) || !('applicazioni' in x)) return { applicazioni: undefined, illeggibile: false, resto: x };
  const { applicazioni, ...resto } = x as Record<string, unknown>;
  const v = schemaApplicazioni.safeParse(applicazioni);
  return { applicazioni: v.success ? v.data : undefined, illeggibile: !v.success, resto };
}
const cambia = (g: GestoPartita) => scrivi(store.getState().gesti.map(x => x.id === g.id ? g : x));
/** Come si chiama il gesto nelle notifiche: solo parole (che cosa si stava facendo), mai identificativi tecnici (numero di partita, operazione). */
const scopeTesto = (g: GestoPartita) => g.bersaglio.etichetta;
async function invia(g: GestoPartita, recupero = false): Promise<Ricevuta> {
  if (inVolo.has(g.id)) throw new Error('Questa operazione è ancora in invio.');
  // (una ricevuta di spunta conservata prima della separazione può ancora portare l'avanzamento di allora: non si restituisce una fotografia vecchia della partita)
  if (g.stato === 'riuscita' && g.ricevuta !== null) { if (!g.ricevutaPersistita) cambia({ ...g, ricevutaPersistita: true }); return separaAvanzamento(g.ricevuta).resto as Ricevuta; }
  if (g.stato === 'rifiutata') throw new Error('Questa richiesta è già stata rifiutata: non viene ripetuta.');
  if (store.getState().erroreArchivio) throw new Error(store.getState().erroreArchivio!);
  const inInvio = { ...g, stato: 'invio' as const, errore: null, aggiornatoIl: new Date().toISOString() };
  cambia(inInvio); // Deve riuscire PRIMA di qualunque richiesta.
  inVolo.add(g.id);
  let risposta: Ricevuta | null = null;
  // dove vedeva la partita lo store prima del gesto (per riconoscere un avanzamento che la risposta non porta)
  const prima = g.partitaId !== null ? puntoPartitaNelloStore(g.partitaId) : null;
  try {
    const prefisso = `/partite/${g.partitaId}`, p = g.payload, opzioni = { maxRetries: 0, silent: true };
    let x: unknown;
    if (p.tipo === 'pesca') {
      if (g.partitaId === null) throw new Error('La pesca richiede la partita originale.');
      if (recupero) {
        try { x = await leggiRicevutaPesca(g.partitaId, p.dati.richiesta.operazioneId); }
        catch (e) {
          // Un 404 canonico consente solo il replay del medesimo POST idempotente; altri errori restano incerti.
          if (!isApiError(e) || e.status !== 404 || e.code === 'http-error') throw e;
          x = await confermaPesca(g.partitaId, p.dati);
        }
      } else x = await confermaPesca(g.partitaId, p.dati);
    } else if (p.tipo === 'decisione-effetto-voce') x = await apiPost(`/compendio/percorso/effetti/proposte/${encodeURIComponent(p.propostaId)}/decisione`, p.dati, opzioni);
    else if (p.tipo === 'spunta-acquisti') x = recupero
      ? await apiGet(`/compendio/percorso/voci/${p.dati.uid}?partita=${g.partitaId}`, opzioni)
      : await apiPut(`${prefisso}/percorso`, p.dati, opzioni);
    else {
      const percorso = p.tipo === 'acquisto' ? '/acquisti/registrazioni' : p.tipo === 'annullo-fonte' ? '/acquisti/provenienze/annullo'
        : p.tipo === 'rimozione-legacy' ? PERCORSO_RIMOZIONE_LEGACY : '/da-applicare/decisioni';
      if (percorso === null) throw new Error('Questa operazione non è disponibile in questa istanza.');
      x = await apiPost(prefisso + percorso, p.dati, opzioni);
    }
    // L'avanzamento della partita (A1) viaggia accanto alla ricevuta di ogni gesto (una decisione, una spunta, o un acquisto, un annullo, una pesca che
    // ha chiuso da solo l'ultima decisione aperta) ma non ne fa parte: si stacca SEMPRE, prima di validare, così non rende la ricevuta «non canonica»
    // e non si conserva nella scheda (una ripetizione del gesto non deve riapplicare una fotografia vecchia della partita).
    const { avanzamento, resto: senzaAvanzamento } = separaAvanzamento(x);
    // L13 (decisione 19): la conferma di un candidato su una voce già spuntata porta anche l'esito nelle partite (`applicazioni`): come
    // l'avanzamento non fa parte della ricevuta (la ripetizione con lo stesso ID rilegge lo stato salvato, senza), si stacca e si notifica
    const { applicazioni, illeggibile, resto } = p.tipo === 'decisione-effetto-voce' ? separaApplicazioni(senzaAvanzamento) : { applicazioni: undefined, illeggibile: false, resto: senzaAvanzamento };
    risposta = validaRicevuta(resto, g);
    const riuscita = { ...g, stato: 'riuscita' as const, ricevuta: risposta, ricevutaPersistita: true, errore: null, aggiornatoIl: new Date().toISOString() };
    try { cambia(riuscita); }
    catch {
      store.setState(s => ({ gesti: immutabile(s.gesti.map(x => x.id === g.id ? { ...riuscita, ricevutaPersistita: false } : x)) }));
      notifica('warning', `${scopeTesto(g)}: successo ricevuto; ricevuta non salvata nella scheda. Conserva questa scheda e recupera lo stesso gesto.`, 0);
    }
    segnalaMutazioneEffetti(g.partitaId);
    notifica('success', `${scopeTesto(g)}: ${recupero && p.tipo === 'spunta-acquisti' ? 'ricevute della transazione riscontrate; controlla lo stato attuale della spunta.' : 'operazione riuscita.'}`, 8000);
    const esito = notificaApplicazioni(applicazioni);
    if (esito) notifica(esito.tipo, esito.testo, esito.durata);
    else if (illeggibile) notifica('warning', `${scopeTesto(g)}: l’esito nelle partite che hanno spuntato la voce non è leggibile; controlla la voce in ogni partita.`, 0);
    // Qualunque gesto su una partita può averla fatta avanzare (alla sera, al giorno dopo): con l'esito nella risposta si applica; senza, nel recupero
    // (ricevuta ripetuta dopo una risposta persa) e sempre dopo una decisione, si rilegge la partita e si confronta con quella di prima del gesto.
    // Non fallisce mai: il gesto è già registrato.
    if (g.partitaId !== null) await allineaDopoGesto(g.partitaId, avanzamento, prima, recupero || p.tipo === 'decisione-proposte');
    return risposta;
  } catch (e) {
    if (risposta !== null) return risposta; // Una ricevuta acquisita non diventa «creazione fallita».
    // Un errore del recupero non prova che il primo invio non abbia committato.
    const rifiuto = !recupero && isApiError(e) && (g.payload.tipo === 'spunta-acquisti'
      ? e.status === 400 && e.code === 'validation-error' // Il middleware rifiuta prima dell’handler e della transazione.
      : e.status >= 400 && e.status < 500 && e.status !== 408 && e.code !== 'http-error');
    const fallita = { ...g, stato: rifiuto ? 'rifiutata' as const : 'incerto' as const, errore: erroreTesto(e), ricevutaPersistita: rifiuto, aggiornatoIl: new Date().toISOString() };
    try { cambia(fallita); } catch { store.setState(s => ({ gesti: immutabile(s.gesti.map(x => x.id === g.id ? { ...fallita, ricevutaPersistita: false } : x)) })); }
    notifica(rifiuto ? 'error' : 'warning', `${scopeTesto(g)}: ${rifiuto ? 'richiesta rifiutata' : 'esito da verificare'}. ${erroreTesto(e)}`, 0);
    throw e;
  } finally { inVolo.delete(g.id); }
}
async function esegui(partitaId: number | null, richiesta: Payload, bersaglio: BersaglioGestoPartita): Promise<Ricevuta> {
  caricaRegistroGestiPartita();
  if (store.getState().erroreArchivio) throw new Error(store.getState().erroreArchivio!);
  positivo.nullable().parse(partitaId);
  const p = payload.parse(copia(richiesta)), b = bersaglioSchema.parse(copia(bersaglio)), op = idOperazione(p), id = identitaGesto(partitaId, op);
  if ((p.tipo === 'decisione-effetto-voce') !== (partitaId === null) || (partitaId === null && !b.voceUid)) throw new Error('Ambito guida o identità della voce non coerenti.');
  if (p.tipo === 'pesca' && p.dati.azione === 'registra-sessione' && p.dati.richiesta.fonte.tipo !== 'manuale') throw new Error('La fonte del Diario si registra soltanto nella transazione della spunta o della proposta.');
  const old = store.getState().gesti.find(g => g.id === id);
  if (old) {
    if (!uguali(old.payload, p) || !uguali(old.bersaglio, b)) throw new Error('Lo stesso ID appartiene a un payload o bersaglio differente.');
    return invia(old, true);
  }
  const nuoviIds = operazioni(p);
  if (new Set(nuoviIds).size !== nuoviIds.length || store.getState().gesti.some(g => g.partitaId === partitaId && operazioni(g.payload).some(id => nuoviIds.includes(id)))) throw new Error('Un identificativo di operazione è già conservato in un altro gesto: nessun nuovo invio.');
  const nuoviAmbiti = ambiti(p, b);
  if (store.getState().gesti.some(g => g.partitaId === partitaId && pendente(g) && ambiti(g.payload, g.bersaglio).some(k => nuoviAmbiti.includes(k)))) {
    throw new Error('Esiste già un gesto da verificare per questo bersaglio: recupera quello conservato, senza crearne un altro.');
  }
  const adesso = new Date().toISOString();
  const g: GestoPartita = immutabile({ id, partitaId, operazioneId: op, bersaglio: b, payload: p, stato: 'incerto', creatoIl: adesso, aggiornatoIl: adesso, errore: null, ricevuta: null, ricevutaPersistita: false });
  scrivi([...store.getState().gesti, g]);
  return invia(g);
}
export const eseguiAcquistoConRegistro = (id: number, dati: RichiestaRegistraAcquisto, bersaglio: BersaglioGestoPartita): Promise<RicevutaOperazioneAcquistoDto> => esegui(id, { tipo: 'acquisto', dati }, bersaglio) as Promise<RicevutaOperazioneAcquistoDto>;
export const eseguiPescaConRegistro = (id: number, dati: OperazioneClientPesca, bersaglio: BersaglioGestoPartita): Promise<RicevutaOperazionePescaDto> => esegui(id, { tipo: 'pesca', dati }, bersaglio) as Promise<RicevutaOperazionePescaDto>;
export const annullaFonteConRegistro = (id: number, dati: RichiestaAnnullaProvenienza, bersaglio: BersaglioGestoPartita): Promise<RicevutaOperazioneAcquistoDto> => esegui(id, { tipo: 'annullo-fonte', dati }, bersaglio) as Promise<RicevutaOperazioneAcquistoDto>;
export const rimuoviLegacyConRegistro = (id: number, dati: RichiestaRimozioneLegacy, bersaglio: BersaglioGestoPartita): Promise<RicevutaOperazioneAcquistoDto> => esegui(id, { tipo: 'rimozione-legacy', dati }, bersaglio) as Promise<RicevutaOperazioneAcquistoDto>;
export const decidiProposteConRegistro = (id: number, dati: RichiestaDecisioneProposte, bersaglio: BersaglioGestoPartita): Promise<RicevutaDecisioneProposteDto> => esegui(id, { tipo: 'decisione-proposte', dati }, bersaglio) as Promise<RicevutaDecisioneProposteDto>;
export function eseguiSpuntaAcquistiConRegistro(id: number, voceUid: string, dati: CorpoSpuntaAcquisti, bersaglio: BersaglioGestoPartita): Promise<AzionePercorsoDto> {
  if ('uid' in dati) return Promise.reject(new Error('L’identità della voce si passa una sola volta, separata dal corpo.'));
  return esegui(id, { tipo: 'spunta-acquisti', dati: { ...dati, uid: voceUid } }, bersaglio) as Promise<AzionePercorsoDto>;
}
/** Solo azione esplicita: verbi/percorso immutabili; la prima spunta consente soltanto la verifica readonly. */
export function riprendiGestoPartita(id: string): Promise<Ricevuta | null> {
  caricaRegistroGestiPartita();
  const g = store.getState().gesti.find(x => x.id === id);
  if (!g) return Promise.reject(new Error('Il gesto non è presente in questa scheda.'));
  if (g.stato === 'rifiutata') {
    try {
      if (!g.ricevutaPersistita) cambia({ ...g, ricevutaPersistita: true });
      return Promise.resolve(null); // Salva soltanto l’esito noto, senza richieste di rete.
    } catch (e) { return Promise.reject(e); }
  }
  return invia(g, true);
}
export function archiviaGestoPartita(id: string): void {
  caricaRegistroGestiPartita();
  const g = store.getState().gesti.find(x => x.id === id);
  if (!g || pendente(g) || inVolo.has(id)) throw new Error('Una richiesta pendente non si elimina dal registro.');
  scrivi(store.getState().gesti.filter(x => x.id !== id));
}
/** Rilettura manuale, mai reset; permette di recuperare dopo un blocco di accesso allo storage. */
export function rileggiRegistroGestiPartita(): void { caricato = false; caricaRegistroGestiPartita(); }
