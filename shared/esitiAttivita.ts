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
// ============================================================

import { eDote, nomeDote, puntiDaNote, type DoteChiave } from './doti.js';
import { simboliNote } from './note.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from './condizioniSpillo.js';

export interface DoteEsito { dote: DoteChiave; note: 1 | 2 | 3 }
export interface EsitoAttivita {
  /** Chiave stabile dentro l'attività («comet-vittoria»): la citano la ricevuta della spunta e l'effetto `turno` della voce. */
  chiave: string;
  nome: string;
  /** La prova a cui l'esito appartiene («Comet Burger»): raggruppa gli esiti nella scelta. Null = nessun gruppo. */
  gruppo: string | null;
  /** L'articolo del negozio che si paga per tentare (prezzo e condizioni di rango dal listino, mai copiati qui). */
  articolo: string | null;
  /** Le condizioni proprie dell'esito (oltre a quelle dell'articolo): il giorno della settimana, un rango. */
  condizioni: RequisitoSpillo[];
  /** Le Doti che l'esito dà (da segnare a mano, come ogni Dote): vuote = l'esito non dà punti. */
  doti: DoteEsito[];
  /** I premi che l'app non modella ancora come dato (oggetti senza scheda), in parole. */
  premi: string | null;
}
export type ModoEsiti = 'scelta' | 'automatico';
export interface EsitiAttivita { modo: ModoEsiti; esiti: EsitoAttivita[] }

export const MODI_ESITI: ReadonlyArray<{ chiave: ModoEsiti; nome: string }> = [
  { chiave: 'scelta', nome: 'Lo sceglie chi gioca, alla spunta' },
  { chiave: 'automatico', nome: 'Automatico: vale l’esito con le condizioni vere in quel momento' },
];
export const LIMITI_ESITI = { esiti: 20, nome: 120, gruppo: 80, premi: 300, doti: 5 } as const;
const CHIAVE_ESITO = /^[a-z0-9][a-z0-9-]{0,59}$/;
const CHIAVE_ARTICOLO = /^[a-z0-9][a-z0-9._:/-]{0,119}$/i;

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
  if (!o || Object.keys(o).some((k) => !['chiave', 'nome', 'gruppo', 'articolo', 'condizioni', 'doti', 'premi'].includes(k))) return null;
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
  return { chiave, nome, gruppo, articolo, condizioni, doti, premi };
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

/** La frase delle Doti di un esito: «Coraggio ♪, Conoscenza ♪» oppure «nessuna Dote». */
export function fraseDotiEsito(doti: ReadonlyArray<DoteEsito>): string {
  return doti.length ? doti.map((d) => `${nomeDote(d.dote)} ${simboliNote(d.note)}`).join(', ') : 'nessuna Dote';
}

/** Le Doti di un esito con i punti che valgono (senza Fortuna: la Fortuna la conta il server quando registra il turno). */
export function dotiEsitoConPunti(doti: ReadonlyArray<DoteEsito>): Array<{ dote: DoteChiave; nome: string; note: 1 | 2 | 3; punti: number }> {
  return doti.map((d) => ({ dote: d.dote, nome: nomeDote(d.dote), note: d.note, punti: puntiDaNote(d.note) }));
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
  articolo: { chiave: string; nome: string; prezzo: number | null } | null;
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
}
/** Un articolo fra quelli in alternativa della voce, come lo vede la scelta alla spunta: prezzo, copie, che cosa contiene e se si può comprare. */
export interface OpzioneAlternativaDto {
  /** L'UID dell'effetto «articolo» della voce: è la scelta che la spunta manda. */
  effettoUid: string;
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
  | { effettoUid: string; tipo: 'turno'; attivita: string; attivitaNome: string; preselezionato: string | null; esiti: EsitoDisponibileDto[]; yenGiaNelSaldo?: true }
  | { effettoUid: string; tipo: 'dote'; dote: DoteChiave; doteNome: string; possibili: Array<1 | 2 | 3>; preselezionato: 1 | 2 | 3 }
  /** L13 (decisione 4): gli articoli in alternativa della voce (Set A o Set B delle televendite): se ne compra uno, o nessuno. `preselezionato`:
   *  l'UID dell'effetto dell'articolo già comprato nella partita (dal negozio), se ce n'è uno. */
  | { effettoUid: string; tipo: 'alternativa'; negozioNome: string | null; opzioni: OpzioneAlternativaDto[]; preselezionato: string | null };
