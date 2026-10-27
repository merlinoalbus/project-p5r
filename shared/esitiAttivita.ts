// ============================================================
// esitiAttivita — i risultati possibili di un'attività, dichiarati una volta sola e scelti alla spunta (L13, ondata 2)
// ============================================================
//
// Richiesta dell'utente (2026-10-25): per la Big Bang Burger «non è il modo giusto» avere i valori in prosa in più posti, voci del
// Diario con valori fissi e nessuna scelta di sfida e di esito. Il meccanismo è generale: un'attività contata per volte dichiara i
// suoi ESITI in `attivita.esiti_json` (un solo punto di modifica), e chi registra un turno sceglie l'esito ottenuto.
//
//   - un esito ha una chiave stabile (la ricevuta della spunta la ricorda), un nome, il gruppo (la prova: «Comet Burger»), l'articolo
//     del negozio che ne dà prezzo e condizioni di rango (le sfide della Big Bang Burger: il prezzo vive SOLO nell'articolo), le
//     condizioni proprie (il giorno della settimana del bagno pubblico), le Doti che dà (note 1–3, segnate a mano come tutte le
//     Doti) e, in parole, i premi che l'app non modella ancora come dato (distintivi, panini): una nota, mai un valore da applicare;
//   - `modo` «scelta»: alla spunta (e al + del contatore) chi gioca sceglie l'esito fra quelli possibili, o «senza punti»;
//     `modo` «automatico»: l'esito è quello le cui condizioni valgono in quel momento (il bagno pubblico: il lunedì e il giovedì il
//     bagno medicinale), senza domande. La scelta dell'utente del 2026-10-25 per il bagno è «valore fisso per giorno della settimana».
// Gli yen non stanno qui: il prezzo, se c'è, è quello dell'articolo, e (decisione 18) registrando il turno si scala da solo dal saldo, mai sotto zero.
//
// Ondata 5, lotto G (decisione 21 dell'utente: «lotteria con esito "vinto/non vinto" alla spunta e trofeo, yen della vincita a mano»): un
// esito può dire il TROFEO che fa ottenere (`trofeo`, la chiave: «Vinto» all'estrazione della lotteria → «Soldi facili»). Registrando il turno
// con quell'esito il trofeo si segna da solo nella partita, e togliendo il turno torna com'era (`trofeiDegliEsitiService`): se il trofeo c'era
// già resta. Il campo è facoltativo: gli esiti scritti prima (Big Bang Burger, centro battute, bagno pubblico) non lo hanno e restano identici.
// Gli yen della vincita non stanno qui: la guida non dà importi, si scrivono a mano (decisione 18).
// Sempre col lotto G (progetto dell'ondata 5, §7: «estendere gli esiti con un trofeo e con premi come oggetti per chiave con quantità; serve
// anche ai distintivi della Big Bang Burger»): un esito può dire gli OGGETTI del catalogo che dà (`oggetti`, chiave e copie: la Comet Burger
// vinta → «Distintivo numero due» e 3 «Big Bang Burger»). Registrando il turno con quell'esito gli oggetti entrano fra quelli ottenuti nella
// partita e togliendolo se ne vanno (`oggettiDegliEsitiService`, `utente.oggetto_esito_turno`); `premi` resta per ciò che non è un oggetto
// del catalogo. Anche questo campo è facoltativo: un esito senza oggetti si rilegge identico. `articolo` può essere anche l'acquisto che
// l'esito comporta («Non vinto, ricompri il Lotto R» dell'estrazione della lotteria: il prezzo si scala registrando il turno, decisione 18).
// Ondata 5, lotto F-bis (decisione 21, precisazione: «oggetti con effetti che incidono su cose rilevanti per l'app»; decisione 22): un esito può
// dire gli OGGETTI del catalogo che CONSUMA (`consuma`, chiave e copie: concimare la pianta con i Bionutrienti → 1 «Bionutrienti»; fabbricare un
// Grimaldello → 1 «Fibbia di latta» e 1 «Gomitolo di seta»). Registrando il turno con quell'esito le copie si tolgono da quelle possedute nella
// partita (`consumiOggettiService`, `utente.consumo_oggetto_partita`, lo stesso registro dei consumi dell'Isolamento) e togliendolo tornano. Il
// prezzo dell'oggetto non si paga di nuovo: l'oggetto si era già comprato (per questo il consumo non usa `articolo`). Campo facoltativo: gli
// esiti scritti prima non lo hanno e restano identici.
// ============================================================

import { eDote, nomeDote, puntiDaNote, type DoteChiave } from './doti.js';
import { testoDoteInPunti } from './note.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from './condizioniSpillo.js';
import type { PrezzoPerFascia } from './catalogo.js';

export interface DoteEsito { dote: DoteChiave; note: 1 | 2 | 3 }
/** Ondata 5 (lotto G): un oggetto del catalogo che l'esito dà (`catalogo_oggetto.chiave`) e quante copie. */
export interface OggettoEsito { oggetto: string; quantita: number }
export interface EsitoAttivita {
  /** Chiave stabile dentro l'attività («comet-vittoria»): la citano la ricevuta della spunta e l'effetto `turno` della voce. */
  chiave: string;
  nome: string;
  /** La prova a cui l'esito appartiene («Comet Burger»): raggruppa gli esiti nella scelta. Null = nessun gruppo. */
  gruppo: string | null;
  /** L'articolo del negozio che si paga per tentare, o che l'esito fa comprare (prezzo e condizioni di rango dal listino, mai copiati qui). */
  articolo: string | null;
  /** Le condizioni proprie dell'esito (oltre a quelle dell'articolo): il giorno della settimana, un rango. */
  condizioni: RequisitoSpillo[];
  /** Le Doti che l'esito dà (da segnare a mano, come ogni Dote): vuote = l'esito non dà punti. */
  doti: DoteEsito[];
  /** I premi che non sono un oggetto del catalogo, in parole (gli oggetti stanno in `oggetti`). */
  premi: string | null;
  /** Ondata 5 (lotto G): il trofeo che l'esito fa ottenere (chiave di `trofeo`), segnato da solo registrando il turno. Assente = nessuno. */
  trofeo?: string;
  /** Ondata 5 (lotto G): gli oggetti del catalogo che l'esito dà, ottenuti registrando il turno. Assente = nessuno (mai un elenco vuoto). */
  oggetti?: OggettoEsito[];
  /** Ondata 5 (lotto F-bis): gli oggetti del catalogo che l'esito consuma, tolti dalle copie possedute registrando il turno. Assente = nessuno. */
  consuma?: OggettoEsito[];
}
export type ModoEsiti = 'scelta' | 'automatico';
export interface EsitiAttivita { modo: ModoEsiti; esiti: EsitoAttivita[] }

export const MODI_ESITI: ReadonlyArray<{ chiave: ModoEsiti; nome: string }> = [
  { chiave: 'scelta', nome: 'Lo sceglie chi gioca, alla spunta' },
  { chiave: 'automatico', nome: 'Automatico: vale l’esito con le condizioni vere in quel momento' },
];
/** `quantita`: le copie di un oggetto, come l'effetto «oggetto ricevuto» delle voci (`QUANTITA_MASSIMA_EFFETTO` di `effettiVoce.ts`). */
export const LIMITI_ESITI = { esiti: 20, nome: 120, gruppo: 80, premi: 300, doti: 5, oggetti: 5, quantita: 999 } as const;
const CHIAVE_ESITO = /^[a-z0-9][a-z0-9-]{0,59}$/;
const CHIAVE_ARTICOLO = /^[a-z0-9][a-z0-9._:/-]{0,119}$/i;
/** La chiave di un oggetto del catalogo («consumabile/big-bang-burger»), con la stessa forma di quella di un articolo. */
const CHIAVE_OGGETTO = CHIAVE_ARTICOLO;
/** La chiave di un trofeo (`trofeo.chiave`: «soldi-facili»). */
const CHIAVE_TROFEO = /^[a-z0-9][a-z0-9-]{0,99}$/;

const oggetto = (x: unknown): Record<string, unknown> | null => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : null;
const testo = (x: unknown, max: number): string | null => {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  return t.length > 0 && t.length <= max ? t : null;
};
const nota = (x: unknown): x is 1 | 2 | 3 => x === 1 || x === 2 || x === 3;

/** La chiave di un esito ricavata dal nome («Comet Burger · vinta» → «comet-burger-vinta»), per l'editor. */
export function chiaveEsitoDaNome(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'esito';
}

/** Un esito valido o null: campi sconosciuti, chiavi storte, Doti ripetute o note fuori 1–3 non entrano (un dato storto non diventa punti). */
function normalizzaEsito(x: unknown): EsitoAttivita | null {
  const o = oggetto(x);
  if (!o || Object.keys(o).some((k) => !['chiave', 'nome', 'gruppo', 'articolo', 'condizioni', 'doti', 'premi', 'trofeo', 'oggetti', 'consuma'].includes(k))) return null;
  const chiave = typeof o.chiave === 'string' && CHIAVE_ESITO.test(o.chiave) ? o.chiave : null;
  const nome = testo(o.nome, LIMITI_ESITI.nome);
  if (!chiave || !nome) return null;
  const gruppo = o.gruppo == null || o.gruppo === '' ? null : testo(o.gruppo, LIMITI_ESITI.gruppo);
  if (o.gruppo != null && o.gruppo !== '' && gruppo === null) return null;
  const articolo = o.articolo == null || o.articolo === '' ? null : typeof o.articolo === 'string' && CHIAVE_ARTICOLO.test(o.articolo.trim()) ? o.articolo.trim() : undefined;
  if (articolo === undefined) return null;
  const premi = o.premi == null || o.premi === '' ? null : testo(o.premi, LIMITI_ESITI.premi);
  if (o.premi != null && o.premi !== '' && premi === null) return null;
  const grezze = o.condizioni === undefined ? [] : o.condizioni;
  if (!Array.isArray(grezze)) return null;
  const condizioni = normalizzaCondizioniSpillo(grezze);
  if (condizioni.length !== grezze.length) return null;
  if (!Array.isArray(o.doti) || o.doti.length > LIMITI_ESITI.doti) return null;
  const doti: DoteEsito[] = [];
  for (const d of o.doti) {
    const v = oggetto(d);
    if (!v || Object.keys(v).some((k) => k !== 'dote' && k !== 'note') || !eDote(v.dote) || !nota(v.note) || doti.some((x) => x.dote === v.dote)) return null;
    doti.push({ dote: v.dote, note: v.note });
  }
  // il trofeo: assente, null o vuoto = nessuno (il campo non si scrive, così gli esiti di prima si rileggono identici); una chiave storta non entra
  const trofeo = o.trofeo == null || o.trofeo === '' ? undefined : typeof o.trofeo === 'string' && CHIAVE_TROFEO.test(o.trofeo) ? o.trofeo : null;
  if (trofeo === null) return null;
  // gli oggetti: assenti, null o un elenco vuoto = nessuno (il campo non si scrive); un oggetto ripetuto, una chiave storta o copie fuori
  // 1–999 rendono l'esito non valido (nessuna copia si inventa né si scarta in silenzio)
  const oggetti = elencoOggetti(o.oggetti);
  if (oggetti === null) return null;
  // Ondata 5 (lotto F-bis): gli oggetti consumati, con le stesse regole di quelli dati
  const consuma = elencoOggetti(o.consuma);
  if (consuma === null) return null;
  return { chiave, nome, gruppo, articolo, condizioni, doti, premi, ...(trofeo ? { trofeo } : {}), ...(oggetti ? { oggetti } : {}), ...(consuma ? { consuma } : {}) };
}

/** Un elenco di oggetti per chiave e copie (`oggetti` e `consuma` di un esito): undefined se assente, null o vuoto (il campo non si scrive);
 *  null se non è valido per intero (un oggetto ripetuto, una chiave storta o copie fuori 1–999: nessuna copia si inventa né si scarta in silenzio). */
function elencoOggetti(x: unknown): OggettoEsito[] | undefined | null {
  if (x == null) return undefined;
  if (!Array.isArray(x) || x.length > LIMITI_ESITI.oggetti) return null;
  const elenco: OggettoEsito[] = [];
  for (const g of x) {
    const v = oggetto(g);
    if (!v || Object.keys(v).some((k) => k !== 'oggetto' && k !== 'quantita')) return null;
    const chiaveOggetto = typeof v.oggetto === 'string' ? v.oggetto.trim() : '';
    if (!CHIAVE_OGGETTO.test(chiaveOggetto) || elenco.some((y) => y.oggetto === chiaveOggetto)) return null;
    if (typeof v.quantita !== 'number' || !Number.isInteger(v.quantita) || v.quantita < 1 || v.quantita > LIMITI_ESITI.quantita) return null;
    elenco.push({ oggetto: chiaveOggetto, quantita: v.quantita });
  }
  return elenco.length ? elenco : undefined;
}

/** Gli esiti di un'attività o null se il valore non è un elenco valido per intero (niente si scarta in silenzio). */
export function normalizzaEsitiAttivita(x: unknown): EsitiAttivita | null {
  const o = oggetto(x);
  if (!o || Object.keys(o).some((k) => k !== 'modo' && k !== 'esiti')) return null;
  if (o.modo !== 'scelta' && o.modo !== 'automatico') return null;
  if (!Array.isArray(o.esiti) || o.esiti.length === 0 || o.esiti.length > LIMITI_ESITI.esiti) return null;
  const esiti = o.esiti.map(normalizzaEsito);
  if (esiti.some((e) => e === null)) return null;
  const validi = esiti as EsitoAttivita[];
  if (new Set(validi.map((e) => e.chiave)).size !== validi.length) return null;
  // l'automatico sceglie per condizioni: un esito senza condizioni né articolo varrebbe sempre, insieme agli altri
  if (o.modo === 'automatico' && validi.length > 1 && validi.some((e) => e.condizioni.length === 0 && e.articolo === null)) return null;
  return { modo: o.modo, esiti: validi };
}

/** La colonna `esiti_json` letta: null se è vuota o non è un elenco valido (l'attività allora non ha esiti dichiarati). */
export function leggiEsitiAttivita(json: string | null | undefined): EsitiAttivita | null {
  if (json == null || json === '' || json === 'null') return null;
  try { return normalizzaEsitiAttivita(JSON.parse(json)); } catch { return null; }
}

/**
 * La frase delle Doti di un esito, con le note e i punti che entrano nella scheda Doti: «Coraggio ♪ · 2 punti, Conoscenza ♪ · 2 punti»
 * (`testoDoteInPunti`) oppure «nessuna Dote». I punti sono quelli calcolati dal server per la partita (`punti`, con la Fortuna: la scelta e
 * la scheda dell'attività); senza (l'editor degli esiti, nessuna partita) quelli della regola unica senza modificatori (`puntiDaNote`).
 */
export function fraseDotiEsito(doti: ReadonlyArray<DoteEsito & { punti?: number }>): string {
  return doti.length ? doti.map((d) => testoDoteInPunti({ nome: nomeDote(d.dote), note: d.note, delta: d.punti ?? puntiDaNote(d.note) })).join(', ') : 'nessuna Dote';
}

/** Ondata 5 (lotto G): gli oggetti che un esito dà, in breve: «Distintivo numero due, Big Bang Burger ×3»; null se nessuno. */
export function fraseOggettiEsito(oggetti: ReadonlyArray<{ nome: string; quantita: number }>): string | null {
  return oggetti.length ? oggetti.map((o) => (o.quantita > 1 ? `${o.nome} ×${o.quantita}` : o.nome)).join(', ') : null;
}

/** Ondata 5 (lotto F-bis): gli oggetti che un esito consuma, con le copie che la partita ha adesso: «usa Bionutrienti (ne hai 2)», «usa
 *  Gomitolo di seta ×3 (ne hai 1)». Le copie si dicono solo se la partita le conosce (`disponibili` non null); null se non consuma niente. */
export function fraseConsumaEsito(consuma: ReadonlyArray<{ nome: string; quantita: number; disponibili: number | null }> | undefined): string | null {
  if (!consuma?.length) return null;
  return `usa ${consuma.map((o) => `${o.nome}${o.quantita > 1 ? ` ×${o.quantita}` : ''}${o.disponibili !== null ? ` (ne hai ${o.disponibili})` : ''}`).join(', ')}`;
}

/** Le Doti di un esito con i punti che valgono, con la regola unica (`puntiDaNote`). `fortunaSu`: con una partita, se la Fortuna è accesa
 *  sulla Dote (il server la legge dallo stato della partita, come quando registra il turno), così la scelta dice i punti che il turno darà;
 *  senza partita, senza Fortuna. */
export function dotiEsitoConPunti(doti: ReadonlyArray<DoteEsito>, fortunaSu?: (dote: DoteChiave) => boolean): Array<{ dote: DoteChiave; nome: string; note: 1 | 2 | 3; punti: number }> {
  return doti.map((d) => ({ dote: d.dote, nome: nomeDote(d.dote), note: d.note, punti: puntiDaNote(d.note, false, fortunaSu?.(d.dote) ?? false) }));
}

/** La scelta che accompagna la spunta di una voce: per un turno l'esito (null = «senza punti»), per una Dote a valori possibili le note (0 = nessuna). */
export type SceltaEsitoSpunta =
  | { effettoUid: string; tipo: 'turno'; esito: string | null }
  | { effettoUid: string; tipo: 'dote'; note: 0 | 1 | 2 | 3 }
  /** L13 (decisione 4): fra gli articoli in alternativa della voce (Set A o Set B), quello comprato: l'UID del suo effetto, o null = nessuno.
   *  `effettoUid` è l'UID del primo effetto del gruppo (il gruppo non ha un'identità sua: lo calcola il catalogo). */
  | { effettoUid: string; tipo: 'alternativa'; scelto: string | null };

/** Un esito come lo vede la scelta: Doti con i punti, prezzo e nome dell'articolo, e se è possibile in quel momento (con il motivo). */
export interface EsitoDisponibileDto {
  chiave: string; nome: string; gruppo: string | null; premi: string | null;
  doti: Array<{ dote: DoteChiave; nome: string; note: 1 | 2 | 3; punti: number }>;
  /** Ondata 5 (lotto E): `prezzo` è quello del listino, `prezzoPerFascia` il prezzo di una fascia quando è diverso (le sfide della Big Bang
   *  Burger costano 500 ¥ di sera), `prezzoNelMomento` quello che si scala nella fascia dello stato (la voce del Diario, o la partita per
   *  il contatore; senza stato vale `prezzo`). Lo calcola il server con la stessa regola della spunta (`prezzoNellaFascia`). */
  articolo: { chiave: string; nome: string; prezzo: number | null; prezzoPerFascia: PrezzoPerFascia | null; prezzoNelMomento: number | null } | null;
  /** Ondata 5 (lotto G): il trofeo che l'esito fa ottenere, con il nome (segnato da solo registrando il turno); null se nessuno. */
  trofeo: { chiave: string; nome: string } | null;
  /** Ondata 5 (lotto G): gli oggetti del catalogo che l'esito dà, con il nome (ottenuti registrando il turno); vuoto se nessuno. */
  oggetti: Array<{ chiave: string; nome: string; quantita: number }>;
  /** Ondata 5 (lotto F-bis): gli oggetti del catalogo che l'esito consuma, con il nome e, con una partita, le copie possedute adesso
   *  (`disponibili`, null senza partita): registrando il turno si tolgono. Vuoto se nessuno. */
  consuma: Array<{ chiave: string; nome: string; quantita: number; disponibili: number | null }>;
  /** Falso se le condizioni (dell'esito o dell'articolo) non valgono: la scelta lo mostra e il server lo rifiuta. Senza partita: vero. */
  disponibile: boolean;
  /** Le condizioni in parole («Coraggio al rango 3, solo lunedì e giovedì»), null se non ce ne sono. */
  condizioniTesto: string | null;
}
/** Gli esiti di un'attività per la sua scheda e per il contatore: il modo e, con una partita, la disponibilità di ciascuno. */
export interface EsitiAttivitaDto {
  modo: ModoEsiti;
  esiti: EsitoDisponibileDto[];
  /** Nel modo automatico, con una partita: l'esito che vale adesso (null se nessuno o più d'uno). */
  automatico: string | null;
  /** Ondata 5 (lotto F-bis): con una partita, gli effetti dei libri già letti che riguardano questa attività, in parole («L'ABC
   *  dell'artigianato: moltiplica per 2 gli strumenti creati per sessione»). Sono un promemoria: nessun importo si inventa né si applica. */
  promemoria: string[];
}
/** Un articolo fra quelli in alternativa della voce, come lo vede la scelta alla spunta: prezzo, copie, che cosa contiene e se si può comprare. */
export interface OpzioneAlternativaDto {
  /** L'UID dell'effetto «articolo» della voce: è la scelta che la spunta manda. */
  effettoUid: string;
  /** `prezzo`: quello della fascia della voce, lo stesso che la spunta scala (Ondata 5, lotto E). */
  articolo: { chiave: string; nome: string; prezzo: number | null };
  /** Le copie dell'effetto (1 se la voce non le dice). */
  quantita: number;
  /** Che cosa si riceve comprandolo (le righe di `ricompensa_oggetto` dell'articolo): vuoto se il catalogo non lo dice. */
  contenuto: Array<{ nome: string; quantita: number | null }>;
  /** Falso se le condizioni proprie dell'articolo non valgono al giorno della voce (per esempio l'altro set è già comprato). */
  disponibile: boolean;
  /** Perché non si può, in parole («Non insieme a «Set Condiv. primaverile»»); null se si può. */
  motivo: string | null;
}
/** Le scelte che la spunta di una voce chiede, nell'ordine degli effetti. */
export type SceltaEsitoVoceDto =
  /** `yenGiaNelSaldo` (L13, decisione 18): l'effetto «turno» è di una voce spuntata prima che gli yen si muovessero da soli, ora rispuntata: il
   *  prezzo della sfida era già nel saldo e non si scala (la scelta lo dice). */
  | { effettoUid: string; tipo: 'turno'; attivita: string; attivitaNome: string; preselezionato: string | null; esiti: EsitoDisponibileDto[]; yenGiaNelSaldo?: true;
    /** Ondata 5 (lotto F-bis): gli effetti dei libri letti che riguardano l'attività (promemoria, `EsitiAttivitaDto.promemoria`); assente se nessuno. */
    promemoria?: string[] }
  /** `punti`: per ognuna delle note possibili, i punti che la spunta proporrà (regola unica `puntiDaNote` con Fortuna, libro e «Anima da
   *  cineasta» della voce e della partita, come `applicaEffettiAzione`), nello stesso ordine di `possibili`. `preselezionato`: le note base
   *  dell'effetto (quelle dell'editor), NON preselezionate alla spunta: le note ottenute le tocca sempre chi gioca (`SceltaEsitiVoce`). */
  | { effettoUid: string; tipo: 'dote'; dote: DoteChiave; doteNome: string; possibili: Array<1 | 2 | 3>; preselezionato: 1 | 2 | 3; punti: Array<{ note: 1 | 2 | 3; punti: number }> }
  /** L13 (decisione 4): gli articoli in alternativa della voce (Set A o Set B delle televendite): se ne compra uno, o nessuno. `preselezionato`:
   *  l'UID dell'effetto dell'articolo già comprato nella partita (dal negozio), se ce n'è uno. */
  | { effettoUid: string; tipo: 'alternativa'; negozioNome: string | null; opzioni: OpzioneAlternativaDto[]; preselezionato: string | null };
