// ============================================================
// disponibilitaConfidentiService — le «Informazioni del Confidente»: note sulla disponibilità, note generali e fonti, con lo storico
// ============================================================
//
// L13 (ondata 6, lotto O6-2, migrazione 307): giorni, fasce, eccezioni, luoghi e sblocco hanno una sola sede, la disponibilità strutturata
// (`disponibilitaStrutturataService`) e i requisiti di rango; qui si modificano solo `note`, `note_generali` e `fonti_json`. Le cinque colonne
// in prosa di prima restano nella riga e nello storico (le versioni le mostrano), ma l'editor non le scrive e un ripristino non le riporta.
// Lo storico (`dati_guida` `confidente-disponibilita-editor-v1:<chiave>`) è una catena: ogni revisione parte dalla riga in cui finisce la
// precedente e l'ultima è la riga di adesso; le revisioni scritte da una migrazione (`bonifica` della 131, `migrazione` della 307) hanno
// l'identificativo `migrazione-<numero>-<chiave>` e l'impronta di `{ chiave, migrazione }`.
// ============================================================

import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { AnteprimaInformazioniConfidenteDto, AzioneInformazioniConfidente, EditorInformazioniConfidenteDto,
  EsitoInformazioniConfidenteDto, InformazioniConfidente, InformazioniConfidenteRaw, SalvaInformazioniConfidente } from '../../shared/disponibilitaConfidenti.js';
import { CAMPI_INFORMAZIONI_CONFIDENTE, COLONNE_INFORMAZIONI_CONFIDENTE as COLONNE, COLONNE_STORICHE_CONFIDENTE } from '../../shared/disponibilitaConfidenti.js';

const PREFISSO = 'confidente-disponibilita-editor-v1:';
/** Le otto colonne della riga (lette per intero: lo storico confronta la riga completa). */
const CAMPI_RAW: ReadonlyArray<keyof InformazioniConfidenteRaw> = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'];
const RIGA_VUOTA: InformazioniConfidenteRaw = { giorni_json: '[]', fasce_json: '[]', luogo: '', sblocco_data: '', sblocco_requisiti: '', note: '', note_generali: '', fonti_json: '[]' };
const rawSchema = z.object({ giorni_json: z.string(), fasce_json: z.string(), luogo: z.string(), sblocco_data: z.string(),
  sblocco_requisiti: z.string(), note: z.string(), note_generali: z.string(), fonti_json: z.string() }).strict();
// «applica-proposta» resta leggibile nello storico (nessuna proposta è più applicabile); «migrazione» è la revisione aggiunta dalla 307
const azioniRegistro = z.enum(['bonifica', 'migrazione', 'applica-proposta', 'modifica-manuale', 'crea-informazioni', 'ripristina-versione']);
const revisioneSchema = z.object({ id: z.number().int().positive(), azione: azioniRegistro, data: z.string().datetime(), motivo: z.string(),
  operazioneId: z.string().min(1), richiesta: z.string().regex(/^[a-f0-9]{64}$/), prima: rawSchema.nullable(), dopo: rawSchema }).strict();
const bonificaSchema = z.object({ esito: z.enum(['applicata', 'esclusa', 'assente']), motivo: z.string() }).strict();
const registroSchema = z.object({ versione: z.literal(1), confidente: z.string(), iniziale: rawSchema.nullable(),
  bonifica: bonificaSchema.nullable(), revisioni: z.array(revisioneSchema) }).strict();
type Registro = z.infer<typeof registroSchema>;
type Stato = { raw: InformazioniConfidenteRaw | null; registro: Registro | null; registroRaw: string | null };

function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
const uguali = (a: unknown, b: unknown) => isDeepStrictEqual(a, b);
const conflittoRegistro = () => httpErrors.conflict('storico-disponibilita-incoerente', 'Lo storico delle informazioni è illeggibile o incoerente. Nessun dato viene azzerato o sostituito.');

/** Una revisione scritta da una migrazione: identificativo `migrazione-<numero>-<chiave>` e impronta di `{ chiave, migrazione }`. */
function revisioneDiMigrazioneValida(chiave: string, operazioneId: string, richiesta: string): boolean {
  const m = /^migrazione-(\d+)-(.+)$/.exec(operazioneId);
  return !!m && m[2] === chiave && richiesta === impronta({ chiave, migrazione: Number(m[1]) });
}

function leggiRaw(db: AppDatabase, chiave: string): InformazioniConfidenteRaw | null {
  const r = db.prepare(`SELECT ${CAMPI_RAW.join(',')} FROM main.confidente_disponibilita WHERE confidente_chiave = ?`).get(chiave);
  if (!r) return null;
  const p = rawSchema.safeParse(r);
  if (!p.success) throw httpErrors.conflict('informazioni-confidente-illeggibili', 'La riga contiene campi non testuali: conservata senza sostituirli.');
  return p.data;
}
function leggiStato(db: AppDatabase, chiave: string): Stato {
  const raw = leggiRaw(db, chiave);
  const r = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').get(PREFISSO + chiave) as { json: string } | undefined;
  if (!r) return { raw, registro: null, registroRaw: null };
  let valore: unknown;
  try { valore = JSON.parse(r.json); } catch { throw conflittoRegistro(); }
  const p = registroSchema.safeParse(valore);
  if (!p.success || p.data.confidente !== chiave) throw conflittoRegistro();
  const registro = p.data;
  let precedente = registro.iniziale;
  const operazioni = new Set<string>();
  let bonifiche = 0;
  for (const [i, rev] of registro.revisioni.entries()) {
    if (rev.id !== i + 1 || !uguali(rev.prima, precedente) || operazioni.has(rev.operazioneId)) throw conflittoRegistro();
    if (uguali(rev.prima, rev.dopo) || (rev.azione === 'crea-informazioni') !== (rev.prima === null)) throw conflittoRegistro();
    if (rev.azione === 'bonifica' || rev.azione === 'migrazione') {
      if (rev.azione === 'bonifica') bonifiche++;
      if (!revisioneDiMigrazioneValida(chiave, rev.operazioneId, rev.richiesta)) throw conflittoRegistro();
    } else if (!z.string().uuid().safeParse(rev.operazioneId).success) throw conflittoRegistro();
    precedente = rev.dopo;
    operazioni.add(rev.operazioneId);
  }
  if (bonifiche !== (registro.bonifica?.esito === 'applicata' ? 1 : 0)) throw conflittoRegistro();
  if (!uguali(precedente, raw)) throw conflittoRegistro();
  return { raw, registro, registroRaw: r.json };
}
/** I tre campi modificabili della riga; le fonti devono essere un elenco di testi. */
function decodifica(raw: InformazioniConfidenteRaw | null): { valori: Partial<InformazioniConfidente>; errori: string[] } {
  if (!raw) return { valori: {}, errori: ['Le informazioni non esistono. La creazione richiede le note, le note generali e le fonti (anche vuote).'] };
  const valori: Partial<InformazioniConfidente> = { note: raw.note, noteGenerali: raw.note_generali };
  const errori: string[] = [];
  try {
    const a = z.array(z.string()).safeParse(JSON.parse(raw.fonti_json));
    if (!a.success) throw new Error();
    valori.fonti = a.data;
  } catch { errori.push('fonti: JSON non leggibile come elenco di testi; il valore grezzo resta conservato.'); }
  return { valori, errori };
}
const revisioneAttesa = (chiave: string, s: Stato) => impronta({ chiave, raw: s.raw, registroRaw: s.registroRaw });
function nuovoRegistro(chiave: string, raw: InformazioniConfidenteRaw | null): Registro {
  return { versione: 1, confidente: chiave, iniziale: raw, bonifica: null, revisioni: [] };
}
function scriviRegistro(db: AppDatabase, registro: Registro): void {
  db.prepare('INSERT INTO main.dati_guida (chiave,json) VALUES (?,?) ON CONFLICT(chiave) DO UPDATE SET json=excluded.json')
    .run(PREFISSO + registro.confidente, JSON.stringify(registro));
}
function mostra(db: AppDatabase, chiave: string, s: Stato): EditorInformazioniConfidenteDto {
  const c = db.prepare('SELECT chiave,nome FROM main.confidente WHERE chiave = ?').get(chiave) as { chiave: string; nome: string } | undefined;
  if (!c) throw httpErrors.notFound('confidente-non-trovato', 'Il Confidente non esiste.');
  const d = decodifica(s.raw);
  return { confidente: c, correnteRaw: s.raw, ...d, revisioneAttesa: revisioneAttesa(chiave, s),
    versioni: s.registro ? [...(s.registro.iniziale ? [{ id: 0, data: null, azione: 'fotografia iniziale', motivo: 'Valori prima della prima revisione registrata.', raw: s.registro.iniziale, errori: decodifica(s.registro.iniziale).errori }] : []),
      ...s.registro.revisioni.map(r => ({ id: r.id, data: r.data, azione: r.azione, motivo: r.motivo, raw: r.dopo, errori: decodifica(r.dopo).errori }))] : [] };
}
function prepara(db: AppDatabase, chiave: string, s: Stato, input: AzioneInformazioniConfidente): AnteprimaInformazioniConfidenteDto {
  mostra(db, chiave, s); // La chiave deve appartenere a un Confidente, anche con riga informativa assente.
  if (revisioneAttesa(chiave, s) !== input.revisioneAttesa) throw httpErrors.conflict('informazioni-confidente-obsolete', 'Informazioni o storico cambiati. La bozza resta disponibile: rileggi i dati prima di procedere.');
  // Solo le tre colonne dell'editor cambiano: le altre conservano i byte di adesso (o restano vuote in una riga nuova).
  const dopo: InformazioniConfidenteRaw = { ...(s.raw ?? RIGA_VUOTA) };
  const avvertenze = ['Queste informazioni non modificano giorni, fasce, eccezioni, luoghi, requisiti di rango, semafori o progressi della partita.'];
  if (input.azione === 'ripristina-versione') {
    const v = input.versione === 0 ? s.registro?.iniziale : s.registro?.revisioni.find(r => r.id === input.versione)?.dopo;
    if (!v) throw httpErrors.conflict('versione-disponibilita-assente', 'La versione scelta non esiste nello storico.');
    for (const campo of CAMPI_INFORMAZIONI_CONFIDENTE) dopo[COLONNE[campo]] = v[COLONNE[campo]];
    const storiche = COLONNE_STORICHE_CONFIDENTE.filter(({ colonna }) => v[colonna] !== '' && v[colonna] !== '[]');
    if (storiche.length) avvertenze.push(`La versione scelta ha anche ${storiche.map(x => x.etichetta.toLowerCase()).join(', ')} in prosa: non più modificabili da qui, non vengono riportati (si modificano da «Modifica disponibilità» e dai requisiti di rango).`);
  } else {
    if (input.azione === 'crea-informazioni' ? s.raw !== null : s.raw === null) throw httpErrors.conflict('informazioni-confidente-presenza-diversa', 'Creazione e modifica sono operazioni distinte: rileggi le informazioni.');
    // Solo i campi inclusi nella PATCH vengono serializzati. Gli altri conservano i byte precedenti.
    const valoriPrima = decodifica(s.raw).valori;
    for (const campo of CAMPI_INFORMAZIONI_CONFIDENTE) if (Object.hasOwn(input.valori, campo)) {
      const valore = input.valori[campo]!;
      if (s.raw && uguali(valoriPrima[campo], valore)) continue;
      dopo[COLONNE[campo]] = Array.isArray(valore) ? JSON.stringify(valore) : valore;
    }
  }
  const errori = decodifica(dopo).errori;
  avvertenze.push(...errori);
  if (input.azione === 'ripristina-versione' && errori.length) avvertenze.push('Ripristino del valore grezzo storico delle fonti: è JSON illeggibile e NON è una versione validata. La scheda potrebbe non caricarsi finché le fonti non vengono corrette.');
  const campiCambiati = CAMPI_INFORMAZIONI_CONFIDENTE.filter(c => !s.raw || s.raw[COLONNE[c]] !== dopo[COLONNE[c]]);
  return { primaRaw: s.raw, dopoRaw: dopo, campiCambiati, avvertenze, anteprimaAttesa: impronta({ chiave, input, dopo }) };
}

export function informazioniConfidente(chiave: string): EditorInformazioniConfidenteDto {
  const db = getDb();
  return db.transaction(() => mostra(db, chiave, leggiStato(db, chiave)))();
}
export function anteprimaInformazioniConfidente(chiave: string, input: AzioneInformazioniConfidente): AnteprimaInformazioniConfidenteDto {
  const db = getDb();
  return db.transaction(() => prepara(db, chiave, leggiStato(db, chiave), input))();
}
export function salvaInformazioniConfidente(chiave: string, input: SalvaInformazioniConfidente): EsitoInformazioniConfidenteDto {
  const db = getDb();
  return db.transaction((): EsitoInformazioniConfidenteDto => {
    const s = leggiStato(db, chiave);
    const richiesta = impronta({ chiave, input });
    const ripetuta = s.registro?.revisioni.find(r => r.operazioneId === input.operazioneId);
    // Replay PRIMA del CAS: il token originale è ormai stale dopo il primo salvataggio riuscito.
    if (ripetuta) {
      if (ripetuta.richiesta !== richiesta) throw httpErrors.conflict('operazione-disponibilita-riutilizzata', 'Identificativo già usato con un payload diverso.');
      return { esito: 'gia-eseguita', versione: ripetuta.id, corrente: mostra(db, chiave, s) };
    }
    const { anteprimaAttesa, operazioneId, ...azione } = input;
    const p = prepara(db, chiave, s, azione);
    if (p.anteprimaAttesa !== anteprimaAttesa) throw httpErrors.conflict('anteprima-disponibilita-obsoleta', 'La modifica non corrisponde all’anteprima. Nessuna scrittura eseguita.');
    if (!p.campiCambiati.length) return { esito: 'invariata', versione: null, corrente: mostra(db, chiave, s) };
    if (s.raw) {
      const colonne = p.campiCambiati.map(c => COLONNE[c]);
      const changes = db.prepare(`UPDATE main.confidente_disponibilita SET ${colonne.map(c => `${c} = ?`).join(',')} WHERE confidente_chiave = ?`)
        .run(...colonne.map(c => p.dopoRaw[c]), chiave).changes;
      if (changes !== 1) throw httpErrors.conflict('informazioni-confidente-cambiate', 'La riga non è stata aggiornata una sola volta.');
    } else db.prepare(`INSERT INTO main.confidente_disponibilita (confidente_chiave,${CAMPI_RAW.join(',')}) VALUES (?,${CAMPI_RAW.map(() => '?').join(',')})`)
      .run(chiave, ...CAMPI_RAW.map(c => p.dopoRaw[c]));
    const registro = s.registro ?? nuovoRegistro(chiave, s.raw);
    const id = registro.revisioni.length + 1;
    registro.revisioni.push({ id, azione: azione.azione, data: nowIso(), motivo: 'motivo' in azione ? azione.motivo : `Ripristino esplicito delle note e delle fonti della versione ${azione.versione}.`,
      operazioneId, richiesta, prima: s.raw, dopo: p.dopoRaw });
    scriviRegistro(db, registro);
    return { esito: 'salvata', versione: id, corrente: mostra(db, chiave, leggiStato(db, chiave)) };
  }).immediate();
}
