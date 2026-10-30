// ============================================================
// Copia congelata della bonifica delle informazioni di Makoto (stato del 23/10/2026)
// ============================================================
//
// La migrazione 131 non importa i servizi vivi: questo modulo contiene le SOLE funzioni che usa, identiche a
// `bonificaInformazioniMakoto` e ai suoi aiuti in `server/services/disponibilitaConfidentiService.ts` com'erano, senza gli altri pezzi del
// servizio (editor, anteprima, salvataggio). Differenza voluta: gli errori sono `Error` semplici e non `httpErrors` (la migrazione si
// ferma allo stesso modo). Stessi byte scritti nelle stesse tabelle; l'unica differenza possibile fra due esecuzioni è l'istante `data` della revisione.
// ============================================================

import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { nowIso, type AppDatabase } from '../dbService.js';
// I tipi com'erano al 23/10 (otto campi): dal lotto O6-2 (migrazione 307) i tipi vivi di `shared/disponibilitaConfidenti.ts` hanno solo note,
// note generali e fonti; questa copia congelata non deve seguirli.
interface InformazioniConfidente {
  giorni: string[]; fasce: string[]; luogo: string; sbloccoData: string; sbloccoRequisiti: string; note: string; noteGenerali: string; fonti: string[];
}
type CampoInformazioniConfidente = keyof InformazioniConfidente;
interface InformazioniConfidenteRaw {
  giorni_json: string; fasce_json: string; luogo: string; sblocco_data: string; sblocco_requisiti: string; note: string; note_generali: string; fonti_json: string;
}

const PREFISSO = 'confidente-disponibilita-editor-v1:';
const COLONNE: Record<CampoInformazioniConfidente, keyof InformazioniConfidenteRaw> = {
  giorni: 'giorni_json', fasce: 'fasce_json', luogo: 'luogo', sbloccoData: 'sblocco_data', sbloccoRequisiti: 'sblocco_requisiti',
  note: 'note', noteGenerali: 'note_generali', fonti: 'fonti_json',
};
const CAMPI_RAW = Object.values(COLONNE);
const rawSchema = z.object({ giorni_json: z.string(), fasce_json: z.string(), luogo: z.string(), sblocco_data: z.string(),
  sblocco_requisiti: z.string(), note: z.string(), note_generali: z.string(), fonti_json: z.string() }).strict();
const azioniRegistro = z.enum(['bonifica', 'applica-proposta', 'modifica-manuale', 'crea-informazioni', 'ripristina-versione']);
const revisioneSchema = z.object({ id: z.number().int().positive(), azione: azioniRegistro, data: z.string().datetime(), motivo: z.string(),
  operazioneId: z.string().min(1), richiesta: z.string().regex(/^[a-f0-9]{64}$/), prima: rawSchema.nullable(), dopo: rawSchema }).strict();
const bonificaSchema = z.object({ esito: z.enum(['applicata', 'esclusa', 'assente']), motivo: z.string() }).strict();
const registroSchema = z.object({ versione: z.literal(1), confidente: z.string(), iniziale: rawSchema.nullable(),
  bonifica: bonificaSchema.nullable(), revisioni: z.array(revisioneSchema) }).strict();
type Registro = z.infer<typeof registroSchema>;
type Stato = { raw: InformazioniConfidenteRaw | null; registro: Registro | null; registroRaw: string | null };

const FONTE_MAKOTO = 'https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-makoto-papessa/';
const FONTI_MAKOTO = [FONTE_MAKOTO, 'https://www.allgamestaff.it/persona-5-royal/guida-regali-confidenti/'];
/** Firma RAW integrale letta e verificata indipendentemente nel pacchetto pubblico schema93. */
const MAKOTO_PUBBLICO: InformazioniConfidenteRaw = {
  giorni_json: '["Legato a date fisse di trama: 26/07 (mar), 20/08 (sab), 22/09 (gio), 25/09 (dom), 27/09 (mar), 29/09 (gio), 2/10 (dom), 7/10 (ven), 9/10 (dom), poi 5/11 (sab, ramo amicizia) o 16/10 (dom, ramo amore)"]',
  fasce_json: '["giorno, salvo diversa indicazione"]',
  luogo: 'Cancello della scuola (Shujin, Aoyama-Itchome) come principale; anche Biblioteca 3° piano, Big Bang Burger, Shinjuku, mansarda del Leblanc (finale ramo amore)',
  sblocco_data: '26 luglio', sblocco_requisiti: 'Dote sociale Conoscenza a rango 3; Persona con Arcano Papessa equipaggiata',
  note: 'Rango 6 richiede Fascino 5. Rango 9 presenta un bivio esplicito romantico/amicizia che determina quale rango 10 si ottiene.',
  note_generali: '', fonti_json: JSON.stringify(FONTI_MAKOTO),
};
const RETTIFICA_MAKOTO = {
  giorni_json: '["Martedì","Giovedì","Sabato","Domenica"]', fasce_json: '["giorno"]', sblocco_data: '',
  sblocco_requisiti: 'Conoscenza al rango 3 (Studioso).',
};
const NOTA_MAKOTO = 'Calendario informativo secondo la guida AGS: incontri diurni martedì, giovedì, sabato e domenica; i ranghi 2 e 9 richiedono assenza di pioggia. Le date dell’itinerario sono giorni consigliati, non date fisse di trama né prova della prima data possibile del legame. Una Persona dell’Arcano Papessa in scorta aumenta l’affinità: non deve essere equipaggiata e non è un requisito di accesso.';

function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
const uguali = (a: unknown, b: unknown) => isDeepStrictEqual(a, b);
const conflittoRegistro = () => new Error('Lo storico delle informazioni è illeggibile o incoerente. Nessun dato viene azzerato o sostituito.');

function leggiRaw(db: AppDatabase, chiave: string): InformazioniConfidenteRaw | null {
  const r = db.prepare(`SELECT ${CAMPI_RAW.join(',')} FROM main.confidente_disponibilita WHERE confidente_chiave = ?`).get(chiave);
  if (!r) return null;
  const p = rawSchema.safeParse(r);
  if (!p.success) throw new Error('La riga contiene campi non testuali: conservata senza sostituirli.');
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
    if (rev.azione === 'bonifica') {
      bonifiche++;
      if (chiave !== 'makoto' || rev.operazioneId !== 'migrazione-131-makoto' || !uguali(rev.prima, MAKOTO_PUBBLICO)
        || !uguali(rev.dopo, dopoProposta(MAKOTO_PUBBLICO)) || rev.richiesta !== impronta({ chiave, migrazione: 131 })) throw conflittoRegistro();
    } else if (!z.string().uuid().safeParse(rev.operazioneId).success) throw conflittoRegistro();
    precedente = rev.dopo;
    operazioni.add(rev.operazioneId);
  }
  if (bonifiche !== (registro.bonifica?.esito === 'applicata' ? 1 : 0)) throw conflittoRegistro();
  if (!uguali(precedente, raw)) throw conflittoRegistro();
  return { raw, registro, registroRaw: r.json };
}
function decodifica(raw: InformazioniConfidenteRaw | null): { valori: Partial<InformazioniConfidente>; errori: string[] } {
  if (!raw) return { valori: {}, errori: ['Le informazioni non esistono. La creazione richiede tutti gli otto campi.'] };
  const valori: Partial<InformazioniConfidente> = { luogo: raw.luogo, sbloccoData: raw.sblocco_data,
    sbloccoRequisiti: raw.sblocco_requisiti, note: raw.note, noteGenerali: raw.note_generali };
  const errori: string[] = [];
  for (const campo of ['giorni', 'fasce', 'fonti'] as const) {
    try {
      const a = z.array(z.string()).safeParse(JSON.parse(raw[COLONNE[campo]]));
      if (!a.success) throw new Error();
      valori[campo] = a.data;
    } catch { errori.push(`${campo}: JSON non leggibile come elenco di testi; il valore grezzo resta conservato.`); }
  }
  return { valori, errori };
}
function nuovoRegistro(chiave: string, raw: InformazioniConfidenteRaw | null): Registro {
  return { versione: 1, confidente: chiave, iniziale: raw, bonifica: null, revisioni: [] };
}
function scriviRegistro(db: AppDatabase, registro: Registro): void {
  db.prepare('INSERT INTO main.dati_guida (chiave,json) VALUES (?,?) ON CONFLICT(chiave) DO UPDATE SET json=excluded.json')
    .run(PREFISSO + registro.confidente, JSON.stringify(registro));
}
function dopoProposta(raw: InformazioniConfidenteRaw): InformazioniConfidenteRaw {
  const d = decodifica(raw);
  if (d.errori.length) throw new Error('La proposta richiede elenchi leggibili. Correggi consapevolmente i soli campi illeggibili con la modifica manuale.');
  if (Object.entries(RETTIFICA_MAKOTO).every(([c, v]) => raw[c as keyof InformazioniConfidenteRaw] === v) && raw.note.includes(NOTA_MAKOTO)) return raw;
  const storico = 'Storico delle informazioni precedenti (non è una regola corrente):\n'
    + `Giorni precedenti (elenco originale integrale):\n${raw.giorni_json}\nFasce precedenti (elenco originale integrale):\n${raw.fasce_json}\n`
    + `Data precedentemente riportata:\n${raw.sblocco_data}\nRequisiti precedentemente riportati:\n${raw.sblocco_requisiti}`;
  return { ...raw, ...RETTIFICA_MAKOTO, note: `${raw.note}${raw.note ? '\n\n' : ''}${storico}\n\n${NOTA_MAKOTO}` };
}

/** Eseguita soltanto dalla migrazione131: otto campi RAW esatti, nessun dato di partita o requisito operativo. */
export function bonificaInformazioniMakoto131(db: AppDatabase): void {
  const chiave = 'makoto';
  const s = leggiStato(db, chiave);
  if (s.registro?.bonifica) return;
  const registro = s.registro ?? nuovoRegistro(chiave, s.raw);
  if (!s.raw) registro.bonifica = { esito: 'assente', motivo: 'Riga assente, non ricreata. La creazione resta esplicita.' };
  else if (!uguali(s.raw, MAKOTO_PUBBLICO)) registro.bonifica = { esito: 'esclusa', motivo: 'Firma RAW degli otto campi diversa dalla fotografia pubblica: nessuna modifica; proposta esplicita disponibile nell’editor.' };
  else {
    const dopo = dopoProposta(s.raw);
    const colonne = CAMPI_RAW.filter(c => s.raw![c] !== dopo[c]);
    const changes = db.prepare(`UPDATE main.confidente_disponibilita SET ${colonne.map(c => `${c} = ?`).join(',')} WHERE confidente_chiave = ?`)
      .run(...colonne.map(c => dopo[c]), chiave).changes;
    if (changes !== 1) throw new Error('131: rettifica Makoto non applicata a una sola riga, transazione annullata.');
    registro.bonifica = { esito: 'applicata', motivo: 'Firma pubblica integrale coincidente; corretta solo l’informazione e conservati i testi esatti precedenti.' };
    registro.revisioni.push({ id: registro.revisioni.length + 1, azione: 'bonifica', data: nowIso(), motivo: registro.bonifica.motivo,
      operazioneId: 'migrazione-131-makoto', richiesta: impronta({ chiave, migrazione: 131 }), prima: s.raw, dopo });
  }
  scriviRegistro(db, registro);
}
