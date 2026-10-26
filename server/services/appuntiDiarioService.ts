// ============================================================
// appuntiDiarioService — copiare, tagliare e incollare voci del Diario con gli appunti di sistema (2026-10-26)
// ============================================================
//
// Richiesta dell'utente: «Vorrei poter selezionare uno o più elementi del diario con ctrl+C e poterli incollare da un'altra parte con
// ctrl+v», con «Sì, anche Taglia», «Quella della voce selezionata», «e deve prendere anche quello che succede...» e «però deve usare la
// clipboard del sistema non dentro l'app... così da poter anche usare windows V per gestire eventuali copie precedenti».
//
// UN solo percorso di scrittura per copiare e spostare voci: gli appunti del Diario e la finestra «Copia in…» / «Sposta in…»
// (`trasferisciVoci`) passano di qui, con lo stesso writer dell'ordine (`collocaInFascia`, `compatta`, `ripristinaOrdineVoce`), la stessa
// copia degli effetti (`motoreDiario.scriviEffettiDaIstantanea`, registrata in `operazione_effetti_voce`) e lo stesso registro delle
// operazioni (`operazione_voci_diario`, migrazione 240), da cui si annulla.
//
//   - `esportaAppunti`: l'istantanea delle voci per gli appunti (sola lettura): ogni campo del modulo, gli effetti con i loro valori, le
//     infiltrazioni, l'origine. Mai spunte, ricevute o yen delle partite.
//   - `pianoIncolla`: che cosa succederà, con i rilievi da vedere prima (diario validato, effetti a data fissa, Fortuna, disponibilità del
//     Confidente, effetti o collegamenti che non esistono più, ciò che una copia non eredita, voci di un taglio già spostate o eliminate).
//     Lo stesso calcolo per l'anteprima e per l'esecuzione.
//   - `incollaVoci`: copia (voci nuove con uid nuovi, nell'ordine) o sposta (le stesse voci: spunte e ricevute le seguono) in una sola
//     transazione; rifiuta (409) se i rilievi da confermare non sono stati confermati o se il piano è cambiato.
//   - `annullaOperazione`: la copia annullata va nel Cestino (si ripristina da lì); lo spostamento annullato rimette giorno, fascia,
//     posizione nella guida e posto relativo ai vicini delle sole voci ancora dove l'incolla le aveva messe. Le altre si dicono.
// ============================================================

import { randomBytes } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { avvisiDisponibilitaDellaVoce, collocaInFascia, compatta, eGiornoDelDiarioValidato, eliminaVoce, fasciaDi, rigaVoce, ripristinaOrdineVoce, righeDelGiorno, ULTIMO_GIORNO_VALIDATO, vociDelGiorno, type RigaVoce } from './giornataService.js';
import { leggiEffettiVocePerMostrare, problemaEffettoDaIncollare, problemaListaDaIncollare, scriviEffettiDaIstantanea, type IstantaneaEffettiVoce } from './motoreDiario.js';
import { riallineaVoceNelRegistro } from './puntiCronologici.js';
import { nomeRiferimento } from './azioniStrutturateService.js';
import { conLegami } from './mappe/legamiInfiltrazioni.js';
import { improntaDato } from './propostePartitaService.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../shared/effettiVoce.js';
import { TIPI_RIFERIMENTO_AZIONE } from '../../shared/effettiAzione.js';
import { dataLeggibile } from '../../shared/condizioniSpillo.js';
import {
  FORMATO_APPUNTI_DIARIO, VERSIONE_APPUNTI_DIARIO, type AppuntiDiario, type EsitoAnnulloIncollaDto, type EsitoIncollaDto, type PianoIncollaDto,
  type RichiestaEseguiIncolla, type RichiestaIncollaVoci, type RilievoIncolla, type StatoVoceIncolla, type VoceAppunti, type VoceSaltataIncolla,
} from '../../shared/appuntiDiario.js';
import type { FasciaGioco, TrasferisciVociGiornata, VociTrasferiteDto } from '../../shared/types.js';

const TIPI_RIF = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave));
const GENERI = new Set(['azione', 'promemoria', 'evento', 'scadenza']);
const nuovoId = (): string => randomBytes(16).toString('hex');
const nomeFascia = (f: FasciaGioco): string => (f === 'sera' ? 'di sera' : 'di giorno');
/** «giorno 18 aprile»: con «giorno» davanti la preposizione non cambia con il numero («del giorno 11 aprile»). */
const giornoTesto = (data: string): string => `giorno ${dataLeggibile(data)}`;
/** Il testo della voce per i messaggi, tagliato. */
const breve = (testo: string): string => (testo.length > 70 ? `${testo.slice(0, 70)}…` : testo);
const haTabella = (schema: 'main' | 'utente', nome: string): boolean => !!prepared(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);

/** L'ordine di ogni giorno nel calendario di gioco (le date `MM-GG` attraversano l'anno). */
function ordineDeiGiorni(): Map<string, number> {
  return new Map((prepared('SELECT data, ordine FROM giorno').all() as Array<{ data: string; ordine: number }>).map((r) => [r.data, r.ordine]));
}
/** 404 se il giorno non è del calendario. */
function giornoDelCalendario(data: string): void {
  if (!prepared('SELECT 1 FROM giorno WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
}
/** Le righe nell'ordine della giornata: giorno del calendario, poi le voci di giorno prima di quelle di sera, poi il posto. */
function nellOrdine(righe: RigaVoce[]): RigaVoce[] {
  const ordine = ordineDeiGiorni();
  return [...righe].sort((a, b) => (ordine.get(a.data) ?? 0) - (ordine.get(b.data) ?? 0) || (fasciaDi(a) === fasciaDi(b) ? 0 : fasciaDi(a) === 'giorno' ? -1 : 1) || a.ordine - b.ordine || a.uid.localeCompare(b.uid));
}
/** L'insieme ordinato delle infiltrazioni della voce (vuoto senza le tabelle di L3). */
function infiltrazioniDellaVoce(uid: string): string[] {
  if (!conLegami()) return [];
  return (prepared('SELECT infiltrazione_chiave FROM voce_infiltrazione WHERE voce_uid = ? ORDER BY ordine').all(uid) as Array<{ infiltrazione_chiave: string }>).map((r) => r.infiltrazione_chiave);
}

// ---- L'istantanea per gli appunti ----

/** Una voce com'è nel file di gioco, per gli appunti: tutti i campi del modulo, gli effetti della spunta con i loro valori, le infiltrazioni. */
function istantaneaVoce(r: RigaVoce): VoceAppunti {
  // la fonte com'è: una fonte storica o incoerente passa «da correggere», col suo testo e il motivo (la copia resta da correggere uguale)
  const fonte = leggiEffettiVocePerMostrare(r.uid);
  return {
    uid: r.uid,
    origine: { giorno: r.data, fascia: fasciaDi(r), posto: r.ordine, indiceGuida: r.indice_guida },
    genere: r.genere, azione: r.azione, note: r.note, tipo: r.tipo,
    riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null,
    riferimentoTesto: r.riferimento_testo, rangoAtteso: r.rango_atteso,
    effetti: { stato: fonte.stato, elementi: fonte.effetti.map((e) => ({ uid: e.uid, effetto: e.effetto, origine: e.origine })), rawLegacy: fonte.rawLegacy, motivo: fonte.motivo },
    infiltrazioni: infiltrazioniDellaVoce(r.uid),
    daRivedere: r.da_rivedere === 1,
  };
}

/** Le voci per gli appunti (`POST /compendio/percorso/voci/appunti`), nell'ordine della giornata. Sola lettura. 404 se una voce non c'è. */
export function esportaAppunti(uid: readonly string[]): AppuntiDiario {
  return { formato: FORMATO_APPUNTI_DIARIO, versione: VERSIONE_APPUNTI_DIARIO, modo: 'copia', creatoIl: nowIso(), voci: nellOrdine(uid.map(rigaVoce)).map(istantaneaVoce) };
}

// ---- Il piano dell'incolla ----

/** Che cosa farà l'incolla con una voce del blocco: i dati validati per la scrittura (copia) e gli effetti da lasciar fuori su richiesta. */
interface DettaglioVoce {
  indice: number;
  voce: VoceAppunti;
  fasciaDest: FasciaGioco;
  stato: StatoVoceIncolla;
  /** Copia: gli effetti riconosciuti, nell'ordine (quelli non riconoscibili restano fuori e la voce non si incolla «comunque»). */
  effetti: Array<{ uid: string; effetto: EffettoVoce; origine: 'seed' | 'regola' | 'utente' }>;
  /** Copia: gli uid degli effetti segnalati, che «Incolla senza gli effetti segnalati» lascia fuori. */
  segnalati: Set<string>;
  /** Copia: il collegamento non esiste più (la voce si incolla solo senza, con «senza gli effetti segnalati»). */
  riferimentoNonValido: boolean;
  /** Copia: la voce si incolla soltanto senza gli elementi segnalati (un effetto non riconoscibile, una lista che non sta insieme). */
  soloSenzaSegnalati: boolean;
  /** Copia: la voce non si incolla in nessun caso (testo vuoto, genere sconosciuto, lista non valida anche senza i segnalati). */
  maiIncollabile: boolean;
  /** Copia: senza gli effetti segnalati la lista non starebbe insieme (un raccordo resterebbe a metà): con «senza» la voce si salta. */
  senzaNonValida: boolean;
  /** Copia: le infiltrazioni che si possono legare alla copia. */
  infiltrazioni: string[];
}

interface Piano { dto: PianoIncollaDto; dettagli: DettaglioVoce[]; ancora: RigaVoce | null }

/** Le voci che un'operazione registrata di questo taglio ha già spostato (e non annullato): incollare due volte lo stesso taglio non sposta più. */
function giaSpostateDalTaglio(taglio: string | undefined): Set<string> {
  if (!taglio) return new Set();
  const righe = prepared("SELECT esito_json FROM operazione_voci_diario WHERE tipo = 'sposta' AND annullata_il IS NULL AND json_extract(richiesta_json, '$.taglio') = ?").all(taglio) as Array<{ esito_json: string }>;
  return new Set(righe.flatMap((r) => (JSON.parse(r.esito_json) as Array<{ uid: string }>).map((x) => x.uid)));
}

/** Gli effetti che hanno una data propria diversa dal giorno di destinazione (cruciverba, domanda in classe, invito), o la Fortuna, che
 *  vale per il resto del giorno in cui si spunta: ognuno con il suo rilievo. Solo quando la voce cambia giorno. */
function rilieviDiData(effetti: ReadonlyArray<{ uid: string; effetto: EffettoVoce }>, daGiorno: string, giorno: string, voceIndice: number, azione: string): RilievoIncolla[] {
  if (daGiorno === giorno) return [];
  const out: RilievoIncolla[] = [];
  const dest = giornoTesto(giorno);
  for (const { uid, effetto: e } of effetti) {
    let data: string | null = null, cosa = '';
    if (e.tipo === 'cruciverba') { data = e.data; cosa = 'il cruciverba'; }
    else if (e.tipo === 'domanda') { data = (prepared('SELECT data FROM domanda WHERE id = ?').get(e.domanda) as { data: string } | undefined)?.data ?? null; cosa = 'la domanda in classe'; }
    else if (e.tipo === 'invito') { data = (prepared('SELECT data FROM confidente_invito WHERE chiave = ?').get(e.invito) as { data: string | null } | undefined)?.data ?? null; cosa = 'l’invito'; }
    if (data && data !== giorno) out.push({ codice: 'data-fissa', gravita: 'conferma', voceIndice, effettoUid: uid, testo: `«${breve(azione)}»: ${cosa} è del ${giornoTesto(data)}, non del ${dest}.` });
    if (e.tipo === 'fortuna') out.push({ codice: 'fortuna', gravita: 'conferma', voceIndice, effettoUid: uid, testo: `«${breve(azione)}»: la Fortuna vale per il resto del giorno in cui si spunta; nel ${dest} vale per quel giorno.` });
  }
  return out;
}

/** Il rilievo di disponibilità di una voce di Confidente nel giorno e nella fascia di destinazione (lo stesso avviso della voce). */
function rilieviDiDisponibilita(r: Pick<RigaVoce, 'genere' | 'riferimento_tipo' | 'riferimento_chiave' | 'rango_atteso'>, giorno: string, fascia: FasciaGioco, voceIndice: number, azione: string): RilievoIncolla[] {
  const avvisi = avvisiDisponibilitaDellaVoce({ ...r, data: giorno, fascia }).avvisiDisponibilita ?? [];
  return avvisi.map((a) => ({ codice: 'disponibilita' as const, gravita: 'conferma' as const, voceIndice, testo: `«${breve(azione)}» ${nomeFascia(fascia)} del ${giornoTesto(giorno)}: ${a.testo}` }));
}

/** Gli effetti da lasciare fuori insieme a quelli segnalati: un acquisto o una pesca tolti si portano via ciò che rivendicano. */
function chiusuraDeiTolti(effetti: DettaglioVoce['effetti'], segnalati: ReadonlySet<string>): Set<string> {
  const tolti = new Set(segnalati);
  for (const { uid, effetto: e } of effetti) if (tolti.has(uid) && (e.tipo === 'acquisto' || e.tipo === 'pesca')) {
    for (const id of e.sostituisceDoti) tolti.add(id);
    if (e.tipo === 'pesca') for (const id of e.sostituisceTurni) tolti.add(id);
  }
  return tolti;
}

/** Il Palazzo che la copia avrà (lo stesso collegamento della voce, o quello delle sue infiltrazioni) e le infiltrazioni che vi si legano. */
function infiltrazioniApplicabili(v: VoceAppunti, riferimentoValido: boolean): { valide: string[]; scartate: string[] } {
  if (v.infiltrazioni.length === 0) return { valide: [], scartate: [] };
  if (!conLegami()) return { valide: [], scartate: [...v.infiltrazioni] };
  const righe = new Map(v.infiltrazioni.map((k) => [k, prepared('SELECT dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(k) as { dungeon_chiave: string } | undefined]));
  const palazzoRif = riferimentoValido && v.riferimento?.tipo === 'dungeon' && prepared("SELECT 1 FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(v.riferimento.chiave) ? v.riferimento.chiave : null;
  const palazzo = palazzoRif ?? v.infiltrazioni.map((k) => righe.get(k)?.dungeon_chiave).find((d) => d !== undefined) ?? null;
  const valide: string[] = [], scartate: string[] = [];
  // una chiave ripetuta (anche non di seguito, da un blocco scritto a mano) si lega una volta sola: la copia non tenta due righe uguali
  const viste = new Set<string>();
  for (const k of v.infiltrazioni) {
    if (viste.has(k)) continue;
    viste.add(k);
    if (palazzo && righe.get(k)?.dungeon_chiave === palazzo) valide.push(k);
    else scartate.push(k);
  }
  return { valide, scartate };
}

/** Il piano della copia di una voce: dati riconosciuti, rilievi, stato. */
function pianoCopia(v: VoceAppunti, indice: number, giorno: string, fasciaDest: FasciaGioco, rilievi: RilievoIncolla[]): DettaglioVoce {
  const azione = v.azione.trim();
  const d: DettaglioVoce = { indice, voce: v, fasciaDest, stato: 'pronta', effetti: [], segnalati: new Set(), riferimentoNonValido: false, soloSenzaSegnalati: false, maiIncollabile: false, senzaNonValida: false, infiltrazioni: [] };
  const mio = (r: RilievoIncolla) => rilievi.push(r);
  // il tipo d'azione si copia com'è (una voce di prima con un tipo fuori elenco si legge «altro», come l'originale)
  if (!azione || !GENERI.has(v.genere)) {
    d.maiIncollabile = true;
    mio({ codice: 'voce-non-valida', gravita: 'conferma', voceIndice: indice, testo: `«${breve(v.azione || '(senza testo)')}» non è una voce valida (testo o genere): non si incolla.` });
    d.stato = 'non-incollabile';
    return d;
  }
  // il collegamento: di un tipo noto e che esiste ancora (anche nascosto dal catalogo: la voce d'origine lo aveva)
  if (v.riferimento) {
    let ok = TIPI_RIF.has(v.riferimento.tipo);
    if (ok) { try { nomeRiferimento(v.riferimento, { ancheNascosti: true }); } catch (e) { if (!(e instanceof HttpError)) throw e; ok = false; } }
    if (!ok) { d.riferimentoNonValido = true; d.soloSenzaSegnalati = true; mio({ codice: 'riferimento-non-valido', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}»: il collegamento (${v.riferimento.tipo} «${v.riferimentoTesto ?? v.riferimento.chiave}») non esiste più. Si incolla solo senza collegamento${v.riferimentoTesto ? `, col solo nome «${v.riferimentoTesto}»` : ''}.` }); }
  }
  // gli effetti: ognuno riconosciuto integralmente e verificato come uno nuovo; una fonte da correggere passa com'è
  if (v.effetti.stato === 'convertita') {
    if (v.genere !== 'azione' && v.effetti.elementi.length) {
      d.maiIncollabile = true; d.stato = 'non-incollabile';
      mio({ codice: 'voce-non-valida', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}» non è un’azione ma ha effetti della spunta: non si incolla.` });
      return d;
    }
    const visti = new Set<string>();
    for (const x of v.effetti.elementi) {
      if (visti.has(x.uid)) { d.maiIncollabile = true; continue; }
      visti.add(x.uid);
      const problema = problemaEffettoDaIncollare(x.effetto);
      const e = normalizzaEffettoVoce(x.effetto);
      if (problema || !e) {
        d.soloSenzaSegnalati = true;
        mio({ codice: 'effetto-non-valido', gravita: 'conferma', voceIndice: indice, effettoUid: x.uid, testo: `«${breve(azione)}»: un effetto non si può incollare (${problema ?? 'non riconoscibile'}). Si incolla solo senza.` });
        d.segnalati.add(x.uid);
        continue;
      }
      d.effetti.push({ uid: x.uid, effetto: e, origine: x.origine });
    }
    if (d.maiIncollabile) {
      d.stato = 'non-incollabile';
      mio({ codice: 'voce-non-valida', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}»: due effetti hanno la stessa identità; non si incolla.` });
      return d;
    }
    for (const r of rilieviDiData(d.effetti, v.origine.giorno, giorno, indice, azione)) { mio(r); if (r.effettoUid) d.segnalati.add(r.effettoUid); }
    // la lista intera deve stare insieme (yen contati due volte, raccordi) così com'è e, se servisse, senza i segnalati
    const rif = d.riferimentoNonValido ? null : v.riferimento;
    const tutti = problemaListaDaIncollare(d.effetti, rif);
    const senza = chiusuraDeiTolti(d.effetti, d.segnalati);
    const ridotti = problemaListaDaIncollare(d.effetti.filter((e) => !senza.has(e.uid)).map((e) => ({ uid: e.uid, effetto: rimuoviRaccordi(e.effetto, senza) })), rif);
    if (tutti && !d.soloSenzaSegnalati) { d.soloSenzaSegnalati = true; mio({ codice: 'effetto-non-valido', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}»: gli effetti non stanno insieme in questa istanza (${tutti}).` }); }
    d.senzaNonValida = ridotti !== null;
    if (ridotti && d.soloSenzaSegnalati) {
      d.maiIncollabile = true; d.stato = 'non-incollabile';
      mio({ codice: 'voce-non-valida', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}»: anche senza gli effetti segnalati gli effetti non stanno insieme (${ridotti}); non si incolla.` });
      return d;
    }
  } else {
    mio({ codice: 'effetti-da-correggere', gravita: 'info', voceIndice: indice, testo: `«${breve(azione)}»: gli effetti sono ancora da correggere (${v.effetti.motivo ?? 'fonte storica'}); la copia resta da correggere allo stesso modo.` });
  }
  // le infiltrazioni: quelle del Palazzo della copia che esistono ancora
  const inf = infiltrazioniApplicabili(v, !d.riferimentoNonValido);
  d.infiltrazioni = inf.valide;
  if (inf.scartate.length) mio({ codice: 'infiltrazioni-non-applicabili', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}»: ${inf.scartate.length === 1 ? 'un’infiltrazione non esiste più o non è' : `${inf.scartate.length} infiltrazioni non esistono più o non sono`} del Palazzo della voce: la copia ne resta senza.` });
  // ciò che la copia non eredita, detto prima (la voce d'origine, se c'è ancora, lo tiene)
  if (prepared('SELECT 1 FROM voce_giornata WHERE uid = ?').get(v.uid)) {
    const eventi = haTabella('main', 'evento_calendario_voce') ? prepared('SELECT COUNT(*) FROM evento_calendario_voce WHERE voce_uid = ?').pluck().get(v.uid) as number : 0;
    if (eventi) mio({ codice: 'eventi-calendario', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}» è collegata a ${eventi === 1 ? 'un evento' : `${eventi} eventi`} del calendario: la copia nasce senza il collegamento (resta all’originale).` });
    const proposte = haTabella('main', 'proposta_conversione_voce') ? prepared("SELECT COUNT(*) FROM proposta_conversione_voce WHERE voce_uid = ? AND stato = 'aperta'").pluck().get(v.uid) as number : 0;
    if (proposte) mio({ codice: 'proposte-aperte', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}» ha ${proposte === 1 ? 'una proposta «da completare» aperta: resta all’originale, la copia non la ha' : `${proposte} proposte «da completare» aperte: restano all’originale, la copia non le ha`}.` });
    const proposta = conLegami() && d.infiltrazioni.length === 0 ? prepared('SELECT COUNT(*) FROM proposta_infiltrazione_voce WHERE voce_uid = ?').pluck().get(v.uid) as number : 0;
    if (proposta) mio({ codice: 'proposta-infiltrazioni', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}» ha una proposta d’infiltrazioni salvata: la copia non la eredita (se la riconosce dal testo la ricalcola).` });
  }
  if (v.daRivedere) mio({ codice: 'da-rivedere', gravita: 'conferma', voceIndice: indice, testo: `«${breve(azione)}» è da rivedere: la copia nasce senza il segno (resta sull’originale).` });
  for (const r of v.genere === 'azione' && !d.riferimentoNonValido && v.riferimento ? rilieviDiDisponibilita({ genere: v.genere, riferimento_tipo: v.riferimento.tipo, riferimento_chiave: v.riferimento.chiave, rango_atteso: v.rangoAtteso }, giorno, fasciaDest, indice, azione) : []) mio(r);
  d.stato = d.soloSenzaSegnalati ? 'con-rilievi' : rilievi.some((r) => r.voceIndice === indice && r.gravita === 'conferma') ? 'con-rilievi' : 'pronta';
  return d;
}

/** L'effetto senza i raccordi verso gli effetti tolti (un acquisto che rivendicava una Dote lasciata fuori non la rivendica più). */
function rimuoviRaccordi(e: EffettoVoce, tolti: ReadonlySet<string>): EffettoVoce {
  if (e.tipo === 'acquisto') return { ...e, sostituisceDoti: e.sostituisceDoti.filter((id) => !tolti.has(id)) };
  if (e.tipo === 'pesca') return { ...e, sostituisceDoti: e.sostituisceDoti.filter((id) => !tolti.has(id)), sostituisceTurni: e.sostituisceTurni.filter((id) => !tolti.has(id)) };
  return e;
}

/** Il piano dello spostamento di una voce tagliata: è ancora dove era? Rilievi del giorno di destinazione e delle partite. */
function pianoTaglio(v: VoceAppunti, indice: number, giorno: string, fasciaDest: FasciaGioco, gia: ReadonlySet<string>, rilievi: RilievoIncolla[]): DettaglioVoce {
  const d: DettaglioVoce = { indice, voce: v, fasciaDest, stato: 'pronta', effetti: [], segnalati: new Set(), riferimentoNonValido: false, soloSenzaSegnalati: false, maiIncollabile: false, senzaNonValida: false, infiltrazioni: [] };
  const r = prepared('SELECT * FROM voce_giornata WHERE uid = ?').get(v.uid) as RigaVoce | undefined;
  if (!r) {
    rilievi.push({ codice: 'eliminata', gravita: 'info', voceIndice: indice, testo: `«${breve(v.azione)}» non c’è più (eliminata dopo il taglio): non si sposta e non si ricrea. Se serve, è nel Cestino.` });
    d.stato = 'eliminata';
    return d;
  }
  if (gia.has(v.uid) || r.data !== v.origine.giorno || fasciaDi(r) !== v.origine.fascia) {
    rilievi.push({ codice: 'gia-spostata', gravita: 'info', voceIndice: indice, testo: `«${breve(r.azione)}» non è più dove era al momento del taglio (ora è ${nomeFascia(fasciaDi(r))} del ${giornoTesto(r.data)}): non si sposta.` });
    d.stato = 'gia-spostata';
    return d;
  }
  if (eGiornoDelDiarioValidato(r.data) && r.data !== giorno) rilievi.push({ codice: 'diario-validato', gravita: 'conferma', voceIndice: indice, testo: `«${breve(r.azione)}» è del diario validato (fino al ${giornoTesto(ULTIMO_GIORNO_VALIDATO)}): spostarla cambia il diario validato. Lo spostamento resta nel registro e si annulla dalla notifica.` });
  const fonte = leggiEffettiVocePerMostrare(r.uid);
  for (const x of rilieviDiData(fonte.effetti, r.data, giorno, indice, r.azione)) rilievi.push(x);
  for (const x of rilieviDiDisponibilita(r, giorno, fasciaDest, indice, r.azione)) rilievi.push(x);
  const partite = prepared('SELECT COUNT(DISTINCT partita_id) FROM utente.spunta_voce_partita WHERE voce_uid = ?').pluck().get(r.uid) as number;
  if (partite) rilievi.push({ codice: 'spunte-seguono', gravita: 'info', voceIndice: indice, testo: `«${breve(r.azione)}» è spuntata in ${partite === 1 ? 'una partita' : `${partite} partite`}: spunte e ricevute la seguono.` });
  d.stato = rilievi.some((x) => x.voceIndice === indice && x.gravita === 'conferma') ? 'con-rilievi' : 'pronta';
  return d;
}

/** Il piano dell'incolla (anteprima ed esecuzione: lo stesso calcolo). */
function calcolaPiano(r: RichiestaIncollaVoci): Piano {
  const a = r.appunti;
  if (a.formato !== FORMATO_APPUNTI_DIARIO) throw httpErrors.badRequest('appunti-non-riconosciuti', 'Gli appunti non contengono voci del Diario.');
  if (a.versione !== VERSIONE_APPUNTI_DIARIO) throw httpErrors.badRequest('versione-appunti', `Le voci negli appunti vengono da un’altra versione dell’app (formato ${a.versione}): copiale di nuovo.`);
  if (a.modo === 'taglia' && !a.taglio) throw httpErrors.badRequest('taglio-senza-identita', 'Il taglio negli appunti è incompleto: taglia di nuovo le voci.');
  if (new Set(a.voci.map((v) => v.uid)).size !== a.voci.length) throw httpErrors.badRequest('voce-ripetuta', 'Una voce compare due volte negli appunti.');
  giornoDelCalendario(r.giorno);
  let ancora: RigaVoce | null = null;
  if (r.dopoUid !== undefined) {
    ancora = prepared('SELECT * FROM voce_giornata WHERE uid = ?').get(r.dopoUid) as RigaVoce | undefined ?? null;
    if (!ancora) throw httpErrors.conflict('ancora-assente', 'La voce dopo cui incollare non c’è più: ricarica il giorno.');
    if (ancora.data !== r.giorno) throw httpErrors.badRequest('ancora-di-un-altro-giorno', 'La voce dopo cui incollare è di un altro giorno.');
    if (a.modo === 'taglia' && a.voci.some((v) => v.uid === r.dopoUid)) throw httpErrors.badRequest('ancora-nel-taglio', 'Non si incolla dopo una delle voci tagliate: scegli un’altra voce o nessuna.');
  }
  const fasciaAncora = ancora ? fasciaDi(ancora) : null;
  const rilievi: RilievoIncolla[] = [];
  // il giorno di destinazione nel diario validato: un rilievo solo, per il blocco
  if (eGiornoDelDiarioValidato(r.giorno)) rilievi.push({ codice: 'diario-validato', gravita: 'conferma', voceIndice: null, testo: `Il ${giornoTesto(r.giorno)} è nel diario validato (fino al ${giornoTesto(ULTIMO_GIORNO_VALIDATO)}): incollare qui cambia il diario validato. Il gesto resta nel registro e si annulla dalla notifica.` });
  const gia = a.modo === 'taglia' ? giaSpostateDalTaglio(a.taglio) : new Set<string>();
  const dettagli = a.voci.map((v, i) => {
    const fasciaDest = fasciaAncora ?? (v.origine.fascia === 'sera' ? 'sera' : 'giorno');
    return a.modo === 'copia' ? pianoCopia(v, i, r.giorno, fasciaDest, rilievi) : pianoTaglio(v, i, r.giorno, fasciaDest, gia, rilievi);
  });
  const incollabili = dettagli.filter((d) => d.stato === 'pronta' || d.stato === 'con-rilievi');
  // gli stessi criteri di `incollaVoci` (motivo di salto): «comunque» salta chi si incolla solo senza i segnalati, «senza» chi senza non sta insieme
  const conComunque = incollabili.filter((d) => !d.soloSenzaSegnalati).length;
  const conSenza = a.modo === 'copia' ? incollabili.filter((d) => !d.senzaNonValida).length : conComunque;
  const voci = dettagli.map((d) => ({ indice: d.indice, uid: d.voce.uid, azione: d.voce.azione, fascia: d.fasciaDest, stato: d.stato }));
  const daConfermare = rilievi.some((x) => x.gravita === 'conferma');
  const impronta = improntaDato({ modo: a.modo, taglio: a.taglio ?? null, giorno: r.giorno, dopo: r.dopoUid ?? null, voci, rilievi });
  return { dto: { modo: a.modo, giorno: r.giorno, fascia: fasciaAncora, voci, rilievi, daConfermare, daIncollare: Math.max(conComunque, conSenza), conComunque, conSenza, impronta }, dettagli, ancora };
}

/** L'anteprima dell'incolla (`POST …/incolla/anteprima`): sola lettura. */
export function pianoIncolla(r: RichiestaIncollaVoci): PianoIncollaDto {
  return calcolaPiano(r).dto;
}

// ---- Le scritture: copia e spostamento, un solo percorso ----

/** La copia di una voce in un giorno e fascia: voce nuova (uid nuovo), effetti con uid nuovi registrati, infiltrazioni. Restituisce l'uid. */
function inserisciCopia(v: VoceAppunti, effetti: IstantaneaEffettiVoce, infiltrazioni: readonly string[], riferimento: VoceAppunti['riferimento'], giorno: string, fascia: FasciaGioco, ordine: number, opz: { verifica: boolean; operazione: string }): { uid: string; mappaEffetti: Record<string, string> } {
  const uid = nuovoId(), adesso = nowIso();
  // `produce_json` resta al suo valore predefinito: gli effetti stanno solo in `voce_effetto` (come in `creaVoce`); senza `indice_guida`
  // (la copia non discende dalla guida di quel giorno) e senza il segno «da rivedere». Il nome del collegamento si copia SEMPRE: la guida
  // ha voci col solo nome, senza collegamento («Cammino del Santo Graal»), e un collegamento che non esiste più lascia il suo nome (il
  // rilievo `riferimento-non-valido` lo dice prima)
  prepared(`INSERT INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, indice_guida, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`).run(uid, giorno, fascia, ordine, v.genere, v.azione.trim(), v.note === null || v.note.trim() === '' ? null : v.note,
    v.genere === 'azione' ? v.tipo : 'altro', riferimento?.tipo ?? null, riferimento?.chiave ?? null, v.riferimentoTesto, v.rangoAtteso, adesso, adesso);
  const mappa = scriviEffettiDaIstantanea(uid, effetti, { verifica: opz.verifica, registro: { origine: 'copia-voce', operazione: opz.operazione, daVoce: v.uid } });
  if (infiltrazioni.length && conLegami()) infiltrazioni.forEach((k, i) => prepared('INSERT INTO voce_infiltrazione (voce_uid, ordine, infiltrazione_chiave) VALUES (?, ?, ?)').run(uid, i, k));
  return { uid, mappaEffetti: Object.fromEntries(mappa) };
}

/**
 * Dove stava la voce prima di spostarsi: giorno, fascia, posto, posizione nella guida e i vicini. `prima` è la voce che le stava subito
 * prima nella fascia COMPLETA (anche se si sposta con lei), `dopo` la prima voce dopo di lei che resta. L'annullo rimette le voci
 * nell'ordine in cui stavano (`annullaOperazione`): così la voce precedente spostata è già tornata quando tocca a questa, e un gruppo di
 * voci in coda alla fascia ([X, A, B] → annullo) torna [X, A, B] e non [X, B, A] (rilievo del revisore, 2026-10-26).
 */
interface OrigineSpostata { giorno: string; fascia: FasciaGioco; posto: number; indiceGuida: number | null; prima: string | null; dopo: string | null }
function origineDi(r: RigaVoce, spostate: ReadonlySet<string>): OrigineSpostata {
  const sorelle = righeDelGiorno(r.data).filter((x) => x.fascia === r.fascia).map((x) => x.uid);
  const i = sorelle.indexOf(r.uid);
  const dopo = sorelle.slice(i + 1).find((u) => !spostate.has(u)) ?? null;
  return { giorno: r.data, fascia: fasciaDi(r), posto: r.ordine, indiceGuida: r.indice_guida, prima: sorelle[i - 1] ?? null, dopo };
}

/** Sposta le voci (righe lette) nel giorno e nelle fasce indicate, nell'ordine; le fasce lasciate si ricompattano; il registro dei punti si
 *  riallinea. Restituisce l'esito per voce (con l'origine, per l'annullo). Dentro la transazione. */
function spostaRighe(righe: ReadonlyArray<{ r: RigaVoce; fascia: FasciaGioco }>, giorno: string, dopoUid: string | null): Array<{ uid: string; da: OrigineSpostata; a: { giorno: string; fascia: FasciaGioco } }> {
  const spostate = new Set(righe.map((x) => x.r.uid));
  const origini = righe.map((x) => origineDi(x.r, spostate));
  const adesso = nowIso();
  righe.forEach(({ r, fascia }, i) => {
    // `indice_guida` è la posizione nella guida di QUEL giorno (indice unico per data): cambiando data la voce lo perde (l'annullo lo rimette);
    // nella stessa data resta, come in «Sposta di giorno/di sera»
    prepared('UPDATE voce_giornata SET data = ?, fascia = ?, ordine = ?, indice_guida = CASE WHEN data = ? THEN indice_guida ELSE NULL END, updated_at = ? WHERE uid = ?')
      .run(giorno, fascia, 1000000 + i, giorno, adesso, r.uid);
  });
  for (const f of ['giorno', 'sera'] as const) {
    const qui = righe.filter((x) => x.fascia === f).map((x) => x.r.uid);
    if (qui.length) collocaInFascia(giorno, f, qui, dopoUid);
  }
  for (const k of new Set(origini.map((o) => `${o.giorno}|${o.fascia}`))) { const [d, f] = k.split('|'); compatta(d, f); }
  // R10-11f: le voci spostate hanno un nuovo giorno, fascia o posto: l'ordine dei loro eventi nel registro dei punti si rifà
  for (const { r } of righe) riallineaVoceNelRegistro(r.uid);
  return righe.map(({ r, fascia }, i) => ({ uid: r.uid, da: origini[i], a: { giorno, fascia } }));
}

/** Scrive l'operazione nel registro (append-only, migrazione 240). */
function registraOperazione(id: string, tipo: 'copia' | 'sposta', origine: 'appunti' | 'trasferimento', giorno: string, fascia: FasciaGioco | null, richiesta: unknown, esito: unknown[]): void {
  prepared('INSERT INTO operazione_voci_diario (id, tipo, origine, giorno_dest, fascia_dest, richiesta_json, esito_json, creata_il) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, tipo, origine, giorno, fascia, JSON.stringify(richiesta), JSON.stringify(esito), nowIso());
}

/**
 * L'incolla (`POST …/incolla`): ricalcola il piano; con rilievi da confermare serve `conferma` e l'impronta del piano mostrato (409
 * `rilievi-non-confermati` / `piano-cambiato`). Copia: voci nuove nell'ordine, con gli effetti (verificati) e le infiltrazioni; con
 * `senzaSegnalati` senza gli effetti segnalati (e ciò che rivendicano) e senza il collegamento che non esiste più. Taglio: le stesse voci,
 * solo quelle ancora dove erano. Una transazione: un errore non lascia scritture a metà.
 */
export function incollaVoci(r: RichiestaEseguiIncolla): EsitoIncollaDto {
  return getDb().transaction((): EsitoIncollaDto => {
    const { dto, dettagli, ancora } = calcolaPiano(r);
    if (r.impronta !== undefined && r.impronta !== dto.impronta) throw httpErrors.conflict('piano-cambiato', 'Nel frattempo qualcosa è cambiato: rivedi i rilievi e conferma di nuovo.');
    if (dto.daConfermare && (!r.conferma || r.impronta === undefined)) throw httpErrors.conflict('rilievi-non-confermati', 'Prima di incollare vanno visti e confermati i rilievi.');
    const senza = r.senzaSegnalati === true && dto.modo === 'copia';
    const saltate: VoceSaltataIncolla[] = [];
    const daFare = dettagli.filter((d) => {
      const motivo = d.stato === 'eliminata' ? 'eliminata dopo il taglio' : d.stato === 'gia-spostata' ? 'non più dove era al momento del taglio'
        : d.maiIncollabile ? 'non valida in questa istanza' : d.soloSenzaSegnalati && !senza ? 'si incolla solo senza gli elementi segnalati'
        : senza && d.senzaNonValida ? 'senza gli effetti segnalati gli altri non starebbero insieme' : null;
      if (motivo) saltate.push({ indice: d.indice, uid: d.voce.uid, azione: d.voce.azione, motivo });
      return motivo === null;
    });
    if (daFare.length === 0) throw httpErrors.conflict('niente-da-incollare', dto.modo === 'taglia' ? 'Le voci di questo taglio sono già state spostate o eliminate: non c’è niente da incollare.' : 'Nessuna voce negli appunti si può incollare qui: vedi i rilievi.');
    const id = nuovoId();
    const dopoUid = ancora?.uid ?? null;
    const richiesta = { taglio: r.appunti.taglio ?? null, dopoUid, creatoIl: r.appunti.creatoIl, confermati: dto.rilievi.filter((x) => x.gravita === 'conferma').map((x) => x.codice), senzaSegnalati: senza, impronta: dto.impronta };
    if (dto.modo === 'taglia') {
      const esito = spostaRighe(daFare.map((d) => ({ r: rigaVoce(d.voce.uid), fascia: d.fasciaDest })), r.giorno, dopoUid);
      registraOperazione(id, 'sposta', 'appunti', r.giorno, dto.fascia, richiesta, esito);
      return { operazioneId: id, modo: 'taglia', giorno: r.giorno, uid: esito.map((e) => e.uid), saltate, effettiTolti: 0 };
    }
    let effettiTolti = 0;
    const arrivate: Array<{ uid: string; fascia: FasciaGioco; daVoce: string; mappaEffetti: Record<string, string> }> = [];
    daFare.forEach((d, i) => {
      const tolti = senza ? chiusuraDeiTolti(d.effetti, d.segnalati) : new Set<string>();
      const effetti = d.effetti.filter((e) => !tolti.has(e.uid)).map((e) => ({ ...e, effetto: rimuoviRaccordi(e.effetto, tolti) }));
      effettiTolti += tolti.size;
      const fonte: IstantaneaEffettiVoce = { stato: d.voce.effetti.stato, effetti, rawLegacy: d.voce.effetti.rawLegacy, motivo: d.voce.effetti.motivo };
      const riferimento = d.riferimentoNonValido ? null : d.voce.riferimento;
      const c = inserisciCopia(d.voce, fonte, d.infiltrazioni, riferimento, r.giorno, d.fasciaDest, 1000000 + i, { verifica: true, operazione: id });
      arrivate.push({ uid: c.uid, fascia: d.fasciaDest, daVoce: d.voce.uid, mappaEffetti: c.mappaEffetti });
    });
    for (const f of ['giorno', 'sera'] as const) {
      const qui = arrivate.filter((x) => x.fascia === f).map((x) => x.uid);
      if (qui.length) collocaInFascia(r.giorno, f, qui, dopoUid);
    }
    registraOperazione(id, 'copia', 'appunti', r.giorno, dto.fascia, richiesta, arrivate);
    return { operazioneId: id, modo: 'copia', giorno: r.giorno, uid: arrivate.map((x) => x.uid), saltate, effettiTolti };
  })();
}

/**
 * «Copia in…» / «Sposta in…» (2026-10-12, «copiare elementi del diario... e poterli inserire in un altro giorno o nella parte giorno o nella
 * parte notte a scelta»; «Una o più insieme», «Sì, anche spostare»): le voci arrivano in fondo alla fascia scelta, nell'ordine che avevano.
 * Copia: voci nuove con lo stesso contenuto (genere, testo, note, tipo, collegamento col suo nome, rango atteso, effetti con uid nuovi,
 * infiltrazioni), senza spunte e senza `indice_guida`; sposta: le stesse voci (uid e spunte restano), le fasce lasciate si ricompattano,
 * cambiando data perdono `indice_guida`. Lo stesso percorso degli appunti, registrato in `operazione_voci_diario` (annullabile). Tutto in
 * una transazione: una voce che non c'è fa fallire tutto (404) senza aver scritto niente.
 */
export function trasferisciVoci(t: TrasferisciVociGiornata, partitaId?: number): VociTrasferiteDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  giornoDelCalendario(t.giorno);
  const id = nuovoId();
  const arrivate = getDb().transaction((): string[] => {
    const righe = nellOrdine(t.uid.map(rigaVoce));
    if (t.modo === 'sposta') {
      const esito = spostaRighe(righe.map((r) => ({ r, fascia: t.fascia })), t.giorno, null);
      registraOperazione(id, 'sposta', 'trasferimento', t.giorno, t.fascia, { fascia: t.fascia }, esito);
      return esito.map((e) => e.uid);
    }
    const copiate = righe.map((r, i) => {
      const v = istantaneaVoce(r);
      // le infiltrazioni della voce, così come sono (stesso collegamento, quindi stesso Palazzo); gli effetti come sono (non riverificati)
      // un effetto che non si riconosce integralmente non si scarta in silenzio: la copia non si fa e lo si dice (nulla si perde)
      const fonte: IstantaneaEffettiVoce = { stato: v.effetti.stato, effetti: v.effetti.elementi.map((x) => {
        const e = normalizzaEffettoVoce(x.effetto);
        if (!e) throw httpErrors.conflict('effetto-non-copiabile', `«${breve(r.azione)}»: un effetto della spunta non si riconosce integralmente e la copia lo perderebbe. Correggilo dal modulo della voce, poi copiala.`);
        return { uid: x.uid, effetto: e, origine: x.origine };
      }), rawLegacy: v.effetti.rawLegacy, motivo: v.effetti.motivo };
      const c = inserisciCopia(v, fonte, v.infiltrazioni, v.riferimento, t.giorno, t.fascia, 1000000 + i, { verifica: false, operazione: id });
      return { uid: c.uid, fascia: t.fascia, daVoce: r.uid, mappaEffetti: c.mappaEffetti };
    });
    collocaInFascia(t.giorno, t.fascia, copiate.map((c) => c.uid), null);
    registraOperazione(id, 'copia', 'trasferimento', t.giorno, t.fascia, { fascia: t.fascia }, copiate);
    return copiate.map((c) => c.uid);
  })();
  return { giorno: t.giorno, fascia: t.fascia, uid: arrivate, operazioneId: id, voci: vociDelGiorno(t.giorno, partitaId) };
}

// ---- L'annullo ----

interface RigaOperazione { id: string; tipo: 'copia' | 'sposta'; esito_json: string; annullata_il: string | null }

/**
 * Annulla un incolla o un trasferimento (`POST …/operazioni/:id/annulla`), una volta sola (409 `operazione-gia-annullata`). Copia: le copie
 * ancora presenti e mai spuntate vanno nel Cestino (si ripristinano da lì; mai cancellate per sempre); una copia spuntata in una partita
 * resta (si elimina dal suo menu, con le sue ricevute). Spostamento: le voci ancora dove l'incolla le aveva messe tornano al giorno, alla
 * fascia, alla posizione nella guida e al posto fra i vicini di prima; le altre restano dove sono. L'esito dice voce per voce.
 */
export function annullaOperazione(id: string): EsitoAnnulloIncollaDto {
  return getDb().transaction((): EsitoAnnulloIncollaDto => {
    const op = prepared('SELECT id, tipo, esito_json, annullata_il FROM operazione_voci_diario WHERE id = ?').get(id) as RigaOperazione | undefined;
    if (!op) throw httpErrors.notFound('operazione-non-trovata', 'Questa operazione sulle voci del Diario non è registrata.');
    if (op.annullata_il) throw httpErrors.conflict('operazione-gia-annullata', 'Questa operazione è già stata annullata.');
    const rimesse: string[] = [];
    const nonRimesse: EsitoAnnulloIncollaDto['nonRimesse'] = [];
    if (op.tipo === 'copia') {
      for (const x of JSON.parse(op.esito_json) as Array<{ uid: string }>) {
        const r = prepared('SELECT uid, azione FROM voce_giornata WHERE uid = ?').get(x.uid) as { uid: string; azione: string } | undefined;
        if (!r) { nonRimesse.push({ uid: x.uid, azione: '', motivo: 'la copia non c’è più (già eliminata)' }); continue; }
        if (prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE voce_uid = ?').get(x.uid)) { nonRimesse.push({ uid: x.uid, azione: r.azione, motivo: 'spuntata in una partita dopo la copia: resta, eliminala dal suo menu se serve' }); continue; }
        eliminaVoce(x.uid);
        rimesse.push(x.uid);
      }
    } else {
      // nell'ordine in cui stavano prima (giorno del calendario, fascia, posto): ogni voce ritrova come vicina di prima quella che la
      // precedeva, già rimessa (vedi `origineDi`)
      const giorni = ordineDeiGiorni();
      const voci = (JSON.parse(op.esito_json) as Array<{ uid: string; da: OrigineSpostata; a: { giorno: string; fascia: FasciaGioco } }>)
        .sort((p, q) => (giorni.get(p.da.giorno) ?? 0) - (giorni.get(q.da.giorno) ?? 0) || (p.da.fascia === q.da.fascia ? 0 : p.da.fascia === 'giorno' ? -1 : 1) || p.da.posto - q.da.posto);
      const fasceToccate = new Set<string>();
      for (const x of voci) {
        const r = prepared('SELECT * FROM voce_giornata WHERE uid = ?').get(x.uid) as RigaVoce | undefined;
        if (!r) { nonRimesse.push({ uid: x.uid, azione: '', motivo: 'non c’è più (eliminata dopo lo spostamento)' }); continue; }
        if (r.data !== x.a.giorno || fasciaDi(r) !== x.a.fascia) { nonRimesse.push({ uid: x.uid, azione: r.azione, motivo: `spostata di nuovo dopo (ora è ${nomeFascia(fasciaDi(r))} del ${giornoTesto(r.data)}): resta lì` }); continue; }
        // la posizione nella guida torna solo se nessun'altra voce di quel giorno l'ha presa nel frattempo (indice unico per data)
        const indice = r.data === x.da.giorno ? r.indice_guida
          : x.da.indiceGuida !== null && !prepared('SELECT 1 FROM voce_giornata WHERE data = ? AND indice_guida = ? AND uid <> ?').get(x.da.giorno, x.da.indiceGuida, x.uid) ? x.da.indiceGuida : null;
        prepared('UPDATE voce_giornata SET data = ?, fascia = ?, ordine = ?, indice_guida = ?, updated_at = ? WHERE uid = ?').run(x.da.giorno, x.da.fascia, x.da.posto, indice, nowIso(), x.uid);
        ripristinaOrdineVoce(x.uid, { prima: x.da.prima, dopo: x.da.dopo });
        fasceToccate.add(`${x.a.giorno}|${x.a.fascia}`);
        rimesse.push(x.uid);
      }
      for (const k of fasceToccate) { const [d, f] = k.split('|'); compatta(d, f); }
      for (const u of rimesse) riallineaVoceNelRegistro(u);
    }
    prepared('UPDATE operazione_voci_diario SET annullata_il = ?, annullo_json = ? WHERE id = ?').run(nowIso(), JSON.stringify({ rimesse, nonRimesse }), id);
    return { operazioneId: id, modo: op.tipo === 'copia' ? 'copia' : 'taglia', rimesse, nonRimesse };
  })();
}

