import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { AnteprimaInformazioniConfidenteDto, AzioneInformazioniConfidente, CampoInformazioniConfidente, EditorInformazioniConfidenteDto,
  EsitoInformazioniConfidenteDto, InformazioniConfidente, InformazioniConfidenteRaw, SalvaInformazioniConfidente } from '../../shared/disponibilitaConfidenti.js';
import { CAMPI_INFORMAZIONI_CONFIDENTE } from '../../shared/disponibilitaConfidenti.js';

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
const conflittoRegistro = () => httpErrors.conflict('storico-disponibilita-incoerente', 'Lo storico delle informazioni è illeggibile o incoerente. Nessun dato viene azzerato o sostituito.');

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
const revisioneAttesa = (chiave: string, s: Stato) => impronta({ chiave, raw: s.raw, registroRaw: s.registroRaw });
function nuovoRegistro(chiave: string, raw: InformazioniConfidenteRaw | null): Registro {
  return { versione: 1, confidente: chiave, iniziale: raw, bonifica: null, revisioni: [] };
}
function scriviRegistro(db: AppDatabase, registro: Registro): void {
  db.prepare('INSERT INTO main.dati_guida (chiave,json) VALUES (?,?) ON CONFLICT(chiave) DO UPDATE SET json=excluded.json')
    .run(PREFISSO + registro.confidente, JSON.stringify(registro));
}
function dopoProposta(raw: InformazioniConfidenteRaw): InformazioniConfidenteRaw {
  const d = decodifica(raw);
  if (d.errori.length) throw httpErrors.conflict('proposta-disponibilita-inapplicabile', 'La proposta richiede elenchi leggibili. Correggi consapevolmente i soli campi illeggibili con la modifica manuale.');
  if (Object.entries(RETTIFICA_MAKOTO).every(([c, v]) => raw[c as keyof InformazioniConfidenteRaw] === v) && raw.note.includes(NOTA_MAKOTO)) return raw;
  const storico = 'Storico delle informazioni precedenti (non è una regola corrente):\n'
    + `Giorni precedenti (elenco originale integrale):\n${raw.giorni_json}\nFasce precedenti (elenco originale integrale):\n${raw.fasce_json}\n`
    + `Data precedentemente riportata:\n${raw.sblocco_data}\nRequisiti precedentemente riportati:\n${raw.sblocco_requisiti}`;
  return { ...raw, ...RETTIFICA_MAKOTO, note: `${raw.note}${raw.note ? '\n\n' : ''}${storico}\n\n${NOTA_MAKOTO}` };
}
function mostra(db: AppDatabase, chiave: string, s: Stato): EditorInformazioniConfidenteDto {
  const c = db.prepare('SELECT chiave,nome FROM main.confidente WHERE chiave = ?').get(chiave) as { chiave: string; nome: string } | undefined;
  if (!c) throw httpErrors.notFound('confidente-non-trovato', 'Il Confidente non esiste.');
  const d = decodifica(s.raw);
  return { confidente: c, correnteRaw: s.raw, ...d, revisioneAttesa: revisioneAttesa(chiave, s),
    // BON-10: le disponibilità sono consolidate dalla migrazione 163 (strutturate, fonte G-036): nessuna proposta da applicare; l'editor resta.
    proposta: null,
    bonifica: s.registro?.bonifica ?? null,
    versioni: s.registro ? [...(s.registro.iniziale ? [{ id: 0, data: null, azione: 'fotografia iniziale', motivo: 'Valori prima della prima revisione registrata.', raw: s.registro.iniziale, errori: decodifica(s.registro.iniziale).errori }] : []),
      ...s.registro.revisioni.map(r => ({ id: r.id, data: r.data, azione: r.azione, motivo: r.motivo, raw: r.dopo, errori: decodifica(r.dopo).errori }))] : [] };
}
function prepara(db: AppDatabase, chiave: string, s: Stato, input: AzioneInformazioniConfidente): AnteprimaInformazioniConfidenteDto {
  mostra(db, chiave, s); // La chiave deve appartenere a un Confidente, anche con riga informativa assente.
  if (revisioneAttesa(chiave, s) !== input.revisioneAttesa) throw httpErrors.conflict('informazioni-confidente-obsolete', 'Informazioni o storico cambiati. La bozza resta disponibile: rileggi i dati prima di procedere.');
  let dopo: InformazioniConfidenteRaw;
  if (input.azione === 'applica-proposta') {
    // BON-10: non c'è più alcuna proposta da applicare (dati consolidati dalla migrazione 163).
    throw httpErrors.conflict('proposta-disponibilita-inapplicabile', 'Le disponibilità sono già consolidate: non c’è alcuna proposta da applicare.');
  } else if (input.azione === 'ripristina-versione') {
    const v = input.versione === 0 ? s.registro?.iniziale : s.registro?.revisioni.find(r => r.id === input.versione)?.dopo;
    if (!v) throw httpErrors.conflict('versione-disponibilita-assente', 'La versione scelta non esiste nello storico.');
    dopo = v;
  } else {
    if (input.azione === 'crea-informazioni' ? s.raw !== null : s.raw === null) throw httpErrors.conflict('informazioni-confidente-presenza-diversa', 'Creazione e modifica sono operazioni distinte: rileggi le informazioni.');
    dopo = s.raw ? { ...s.raw } : { giorni_json: '[]', fasce_json: '[]', luogo: '', sblocco_data: '', sblocco_requisiti: '', note: '', note_generali: '', fonti_json: '[]' };
    // Solo i campi inclusi nella PATCH vengono serializzati. Gli altri conservano i byte precedenti.
    const valoriPrima = decodifica(s.raw).valori;
    for (const campo of CAMPI_INFORMAZIONI_CONFIDENTE) if (Object.hasOwn(input.valori, campo)) {
      const valore = input.valori[campo]!;
      if (s.raw && uguali(valoriPrima[campo], valore)) continue;
      dopo[COLONNE[campo]] = Array.isArray(valore) ? JSON.stringify(valore) : valore;
    }
  }
  const errori = decodifica(dopo).errori;
  const avvertenze = ['Queste informazioni non modificano requisiti del rango 1, semafori, incontri o progressi della partita.', ...errori];
  if (input.azione === 'ripristina-versione' && errori.length) avvertenze.push('Ripristino del valore grezzo storico: contiene JSON illeggibile e NON è una versione validata. La scheda potrebbe non caricarsi finché quei campi non vengono corretti.');
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
    registro.revisioni.push({ id, azione: azione.azione, data: nowIso(), motivo: 'motivo' in azione ? azione.motivo
      : azione.azione === 'ripristina-versione' ? `Ripristino esplicito della versione ${azione.versione}.` : 'Rettifica documentata con conservazione obbligatoria dei testi correnti.',
    operazioneId, richiesta, prima: s.raw, dopo: p.dopoRaw });
    scriviRegistro(db, registro);
    return { esito: 'salvata', versione: id, corrente: mostra(db, chiave, leggiStato(db, chiave)) };
  }).immediate();
}

/** Eseguita soltanto dalla migrazione131: otto campi RAW esatti, nessun dato di partita o requisito operativo. */
export function bonificaInformazioniMakoto(db: AppDatabase): void {
  const chiave = 'makoto';
  const s = leggiStato(db, chiave);
  if (s.registro?.bonifica) return;
  const registro = s.registro ?? nuovoRegistro(chiave, s.raw);
  if (!s.raw) registro.bonifica = { esito: 'assente', motivo: 'Riga assente, non ricreata. La creazione resta esplicita.' };
  else if (!uguali(s.raw, MAKOTO_PUBBLICO)) registro.bonifica = { esito: 'esclusa', motivo: 'Firma RAW degli otto campi diversa dalla fotografia pubblica: nessuna modifica; la modifica manuale resta disponibile nell’editor.' };
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
