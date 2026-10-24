// ============================================================
// 202 — i dettagli delle attività senza le frasi che un dato strutturato già dice (L9 · R9-14/1, passo 1)
// ============================================================
//
// Elenco approvato (analisi dati, `lotti/L9/frasi-attivita-e-voce-1119-2026-10-24.md` §1.3): da `attivita.dettagli` si tolgono i costi, le fasce, i turni,
// i giorni e i valori delle Doti che `costo`, `fascia`, `condizioni_json`, `effetti_json`, `quiz_json`, `paga_*` e la disponibilità del Confidente già
// dicono e la pagina già mostra. Si riscrive SOLO `dettagli` (nessuna colonna tolta in questo passo). Ogni attività ha un elenco di sostituzioni esatte:
// se anche una sola non trova il suo testo (la riga è stata modificata dopo la copia), l'attività si salta intera e si annota; le altre procedono.
// Il testo di prima di ogni riga cambiata va in `dati_guida.archivio-dettagli-attivita-l11` (chiave dell'attività → testo). La frase comune dei sette
// videogiochi («Completando un videogioco si ottiene una tessera scambiabile…») sta una volta sola in `dati_guida.note-categorie-attivita` (chiave
// `videogioco`); la seconda frase («Richiede TV CRT… Set per retrogaming») sparisce perché è la condizione strutturata di tutte e sette. Lo stesso testo dei
// videogiochi è copiato in `catalogo_oggetto.descrizione` (la pagina dei videogiochi la mostra come «dettagli»): si riscrive lì con la stessa regola, solo se
// la descrizione è identica al vecchio `dettagli` dell'attività corrispondente. Idempotente. Scrive solo in `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const ARCHIVIO = 'archivio-dettagli-attivita-l11';
const NOTE_CATEGORIE = 'note-categorie-attivita';
const NOTA_VIDEOGIOCO = 'Completando un videogioco si ottiene una tessera scambiabile al negozio di retrogaming di Akihabara per accessori che potenziano abilità elementali specifiche.';
const errore = (motivo: string): never => { throw new Error(`202: ${motivo}; nessuna modifica applicata.`); };

type Sostituzione = readonly [da: string, a: string];

const PREMI_VIDEOGIOCO = 'Premi: Il completamento del gioco produce una tessera scambiabile al negozio retro di Akihabara per accessori che potenziano abilita elementali specifiche.\n\n';
const RICHIEDE_VIDEOGIOCO = 'Altri effetti: Richiede TV CRT (mansarda Leblanc, dal 18 aprile) e Set per retrogaming per poter giocare.\n\n';
const videogioco = (dote: string, livelli: number): Sostituzione[] => [
  [PREMI_VIDEOGIOCO, ''], [RICHIEDE_VIDEOGIOCO, ''],
  [`Note sulle Doti: ${dote}: 2 note per livello completato, su ${livelli} livelli totali`, `Note sulle Doti: ${livelli === 2 ? 'Due' : 'Tre'} livelli`],
];

/** Le sostituzioni esatte per attività (analisi dati §1.3). */
const SOSTITUZIONI: Record<string, readonly Sostituzione[]> = {
  freccette: [
    ['Ogni sessione costa 800 yen e comprende due partite', 'Comprende due partite'],
    ['Perizia: 1 nota base per sessione; fino a 3 note completando modalita/sfide speciali (301/501/701)', 'Fino a 3 note completando le modalita e le sfide speciali (301/501/701)'],
  ],
  'pesca-ichigaya': [[' Il beneficio osservato è 1 nota (2 punti interni base); Fortuna confermata per la data della visita porta a 3. Con Fortuna ignota l\'intervallo è 2–3, senza restituzioni presunte.', '']],
  'jazz-club-kichijoji': [['Ingresso serale a 3.000 yen. Frequentarlo', 'Frequentarlo']],
  'bagno-pubblico-yongen-jaya': [
    ['Come funziona: Attivita serale; nessun costo indicato dalle fonti consultate.\n\n', ''],
    ['Note sulle Doti: Fascino: Bagno normale: punti Fascino (fonte secondaria; valore esatto in note non confermato sulla guida italiana) · Fascino: Lunedi e giovedi: bagno \'medicinale/rigenerante\' con punto Fascino aggiuntivo rispetto al bagno normale\n\n', ''],
  ],
  'centro-battute-yongen-jaya': [['Note sulle Doti: Perizia: Completare il minigioco aumenta la Perizia (Proficiency); numero di note non specificato dalla fonte secondaria\n\n', '']],
  'sala-giochi-gun-about-akihabara': [['Come funziona: Shinya e presente all\'arcade il lunedi, martedi e giovedi pomeriggio dopo scuola.\n\n', '']],
  'allenamento-camera-leblanc': [['Come funziona: Gratuito, disponibile la sera in mansarda.\n\n', '']],
  'allenamento-palestra-protein-lovers': [['Come funziona: 2.000 yen a visita.\n\n', '']],
  'studio-leblanc': [['Conoscenza: 2 punti Conoscenza in condizioni normali, 3 punti nei giorni di pioggia (fonte secondaria; valori riportati come \'punti\', conversione in note non confermata)', 'I valori sono riportati come \'punti\': la conversione in note non e confermata (fonte secondaria)']],
  'studio-biblioteca-scuola': [['Conoscenza: 1 punto Conoscenza, con possibile punto bonus di Coraggio; efficacia', 'Possibile punto bonus di Coraggio; efficacia']],
  'studio-diner-shibuya': [['\n\nNote sulle Doti: Conoscenza: 2 punti Conoscenza, 3 nei giorni di pioggia (fonte secondaria)', '']],
  'caffe-leblanc': [['Fascino: Usare il sifone del caffe genera punti Fascino; preparare un caffe e inoltre necessario per avviare', 'Preparare un caffe e necessario per avviare']],
  'tempio-vecchio-kichijoji': [['Come funziona: Gratuito, disponibile di giorno.\n\n', '']],
  'sfida-big-bang-burger': [['Ogni tentativo costa circa 1.500 yen; costi/soglie possono variare', 'Costi e soglie possono variare']],
  'videogioco-star-forneus': videogioco('Coraggio', 3),
  'videogioco-gambla-goemon': videogioco('Fascino', 2),
  'videogioco-punch-ouch': videogioco('Fascino', 3),
  'videogioco-train-of-life': videogioco('Gentilezza', 3),
  'videogioco-power-intuition': videogioco('Coraggio', 3),
  'videogioco-golfer-sarutahiko': videogioco('Perizia', 3),
  'videogioco-featherman-seeker': videogioco('Conoscenza', 3),
  'lavoro-triple-seven': [
    ['Turni diurni, nessun requisito. Compagni', 'Compagni'],
    ['Altri effetti: Quiz a memoria sui codici a barre il 7, 17 e 27 del mese; superarlo perfettamente aumenta la paga.\n\n', ''],
    ['Fascino: +2 punti Fascino a turno (fonte secondaria; valore non confermato in \'note\' sulla guida italiana, che ne conferma solo la presenza)', 'Valore non confermato in \'note\' sulla guida italiana, che ne conferma solo la presenza'],
  ],
  'lavoro-rafflesia': [
    ['Solo turni diurni. Compagni', 'Compagni'],
    ['\n\nNote sulle Doti: Gentilezza: +2 punti Gentilezza a turno', ''],
  ],
  'lavoro-ore-no-beko': [
    ['Solo turni serali, nessun requisito. Compagni', 'Compagni'],
    ['\n\nNote sulle Doti: Perizia: +2 punti Perizia a turno', ''],
  ],
  'lavoro-crossroads': [
    ['Come funziona: Solo turni serali.\n\n', ''],
    ['Gentilezza: +2 punti Gentilezza a turno, invariato anche di domenica', 'Invariato anche di domenica'],
  ],
};

/** Applica tutte le sostituzioni al testo; null se anche una sola non trova il suo testo. */
export function riscrivi(testo: string, sostituzioni: readonly Sostituzione[]): string | null {
  let t = testo;
  for (const [da, a] of sostituzioni) {
    if (!t.includes(da)) return null;
    t = t.replace(da, () => a);
  }
  return t;
}

function leggiBlocco(db: AppDatabase, chiave: string): Record<string, unknown> {
  const j = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  return j ? JSON.parse(j) as Record<string, unknown> : {};
}

export const migration202: Migration = {
  id: 202, name: 'dettagli_attivita_senza_ripetizioni',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita') || !haColonna(db, 'attivita', 'dettagli') || !esisteTabella(db, 'dati_guida')) return;
    const prima = new Map<string, string>([['attivita', improntaTabella(db, 'attivita', ['dettagli'])]]);
    for (const t of ['catalogo_oggetto', 'articolo', 'negozio']) if (esisteTabella(db, t)) prima.set(t, t === 'catalogo_oggetto' ? improntaTabella(db, t, ['descrizione']) : improntaTabella(db, t));

    const archivio: Record<string, string> = {};
    const saltate: string[] = [];
    const cambiate: string[] = [];
    const nuovoDi = new Map<string, string>();
    for (const [chiave, sost] of Object.entries(SOSTITUZIONI)) {
      const r = db.prepare('SELECT dettagli FROM main.attivita WHERE chiave = ?').get(chiave) as { dettagli: string | null } | undefined;
      if (!r || r.dettagli === null) continue;
      const nuovo = riscrivi(r.dettagli, sost);
      if (nuovo === null) { saltate.push(chiave); continue; }
      archivio[chiave] = r.dettagli;
      nuovoDi.set(chiave, nuovo);
      db.prepare('UPDATE main.attivita SET dettagli = ? WHERE chiave = ?').run(nuovo.trim(), chiave);
      cambiate.push(chiave);
    }

    // la copia dei videogiochi nel catalogo: solo se la descrizione è identica al vecchio dettagli dell'attività corrispondente
    const catalogo: string[] = [];
    if (esisteTabella(db, 'catalogo_oggetto') && haColonna(db, 'catalogo_oggetto', 'descrizione')) {
      for (const chiave of cambiate.filter((c) => c.startsWith('videogioco-'))) {
        const k = `videogioco/${chiave.slice('videogioco-'.length)}`;
        const d = db.prepare('SELECT descrizione FROM main.catalogo_oggetto WHERE chiave = ?').pluck().get(k) as string | undefined;
        if (d === undefined || d !== archivio[chiave]) continue;
        archivio[`catalogo_oggetto:${k}`] = d;
        db.prepare('UPDATE main.catalogo_oggetto SET descrizione = ? WHERE chiave = ?').run(nuovoDi.get(chiave)!.trim(), k);
        catalogo.push(k);
      }
    }
    if (cambiate.length === 0) return;

    const bloccoArchivio = leggiBlocco(db, ARCHIVIO) as { testi?: Record<string, string> };
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify({
      versione: 1, motivo: 'Dettagli delle attività prima di togliere le frasi che un dato strutturato già dice (L9, R9-14/1, migrazione 202): chiave → testo di prima.', testi: { ...(bloccoArchivio.testi ?? {}), ...archivio } }));
    if (cambiate.some((c) => c.startsWith('videogioco-'))) {
      const note = leggiBlocco(db, NOTE_CATEGORIE);
      db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(NOTE_CATEGORIE, JSON.stringify({ ...note, videogioco: NOTA_VIDEOGIOCO }));
    }

    for (const [t, imp] of prima) {
      const ora = t === 'attivita' ? improntaTabella(db, t, ['dettagli']) : t === 'catalogo_oggetto' ? improntaTabella(db, t, ['descrizione']) : improntaTabella(db, t);
      if (ora !== imp) errore(`le altre colonne di ${t} sono cambiate`);
    }
    const h = createHash('sha256').update(JSON.stringify(cambiate)).digest('hex').slice(0, 8);
    logger.info({ migrazione: 'L9-R9-14-202', cambiate: cambiate.length, saltate, catalogo: catalogo.length, impronta: h }, 'dettagli delle attività senza ripetizioni');
  },
};
