// ============================================================
// Migrazione 300 — i dodici libri che cambiano un'altra attività: effetti strutturati, non più frasi (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Decisione 21, precisazione dell'utente: gli oggetti con effetti che incidono su ciò che l'app gestisce si modellano con i tipi dell'app.
// Censimento F-bis, punto 4: dodici libri (Anima da cineasta, La fattorizzazione, Lettura rapida, L'ABC dell'artigianato, Comprendere il
// cuore, Lo zen della pesca, La scienza del baseball, Maestro a freccette, Esperto a biliardo, Il mago del biliardo, Segreti di gioco,
// Enciclopedia floreale) avevano l'effetto come famiglia `descrittivo` (una frase) in `libro.effetti_json`: la 062 li aveva scritti
// strutturati in `libro.effetto_json`, poi la conversione agli effetti dichiarati li ha ripresi come frase (regressione della 062). Nessun
// servizio leggeva `moltiplica`, `aumenta-punti` e `sblocca-funzione`.
//
// Che cosa fa: per ciascun libro, se `effetti_json` è ancora la sola frase attesa (la colonna `sblocca` della guida) e il libro è della guida
// mai corretta dall'utente, la frase diventa l'effetto strutturato della stessa famiglia della 062 (`shared/effettiOggetto.ts`):
//   - `sblocca-funzione` con l'attività che il libro nomina (il Terzo Occhio alla pesca, alle freccette e alle gabbie di battuta, i tiri speciali
//     e il tiro masse a biliardo, il linguaggio dei fiori al lavoro del fioraio), `dove` null per i trucchi dei videogiochi retro e per gli
//     attacchi tecnici (non stanno in un'attività sola); un'attività che non c'è lascia `dove` null, mai un riferimento rotto;
//   - `moltiplica` con fattore 2 per la lettura e per la fabbricazione: «Raddoppia» è nel testo della guida, non un numero inventato;
//   - `aumenta-punti` per film e DVD e per lo studio: la guida non dice di quanto, e l'effetto non ha importo.
// Gli effetti si leggono come promemoria dove servono (`server/services/modificatoriLibri.ts`): nella scelta dell'esito e nella scheda delle
// attività, nei film della partita. Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente. Audit in `dati_guida.audit-300-libri`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, scriviAuditFbis, type Esito } from './fbisOndata5.js';
import { improntaDiario } from './rifornimentoOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-300-libri';
const errore = (motivo: string): never => { throw new Error(`300: ${motivo}; nessuna modifica applicata.`); };

type Strutturato = { famiglia: 'sblocca-funzione'; funzione: string; dove: string | null } | { famiglia: 'moltiplica'; cosa: string; fattore: number } | { famiglia: 'aumenta-punti'; dove: string };
/** Libro → la frase attesa (la colonna `sblocca` della guida) e l'effetto strutturato; `attivita`: la chiave dell'attività nominata (se c'è). */
const LIBRI: ReadonlyArray<{ chiave: string; frase: string; effetto: Strutturato; attivita?: string }> = [
  { chiave: 'anima-da-cineasta', frase: 'Aumenta i punti dote ottenuti guardando film e DVD', effetto: { famiglia: 'aumenta-punti', dove: 'film' } },
  { chiave: 'la-fattorizzazione', frase: 'Aumenta il bonus di punti ottenuto studiando', effetto: { famiglia: 'aumenta-punti', dove: 'studio' } },
  { chiave: 'lettura-rapida', frase: 'Raddoppia la velocità di lettura di tutti i libri', effetto: { famiglia: 'moltiplica', cosa: 'lettura', fattore: 2 } },
  { chiave: 'l-abc-dell-artigianato', frase: 'Raddoppia il numero di strumenti creati per sessione', effetto: { famiglia: 'moltiplica', cosa: 'fabbricazione', fattore: 2 } },
  { chiave: 'comprendere-il-cuore', frase: 'Amplia le combinazioni di attacchi tecnici in combattimento', effetto: { famiglia: 'sblocca-funzione', funzione: 'attacchi-tecnici', dove: null } },
  { chiave: 'lo-zen-della-pesca', frase: 'Sblocca il Terzo Occhio nella pesca (mirino e identificazione pesci speciali)', effetto: { famiglia: 'sblocca-funzione', funzione: 'terzo-occhio', dove: null }, attivita: 'pesca-ichigaya' },
  { chiave: 'la-scienza-del-baseball', frase: 'Sblocca il Terzo Occhio al centro battute', effetto: { famiglia: 'sblocca-funzione', funzione: 'terzo-occhio', dove: null }, attivita: 'centro-battute-yongen-jaya' },
  { chiave: 'maestro-a-freccette', frase: 'Sblocca il Terzo Occhio alle freccette', effetto: { famiglia: 'sblocca-funzione', funzione: 'terzo-occhio', dove: null }, attivita: 'freccette' },
  { chiave: 'esperto-a-biliardo', frase: 'Sblocca tiri speciali a biliardo', effetto: { famiglia: 'sblocca-funzione', funzione: 'tiri-speciali', dove: null }, attivita: 'biliardo' },
  { chiave: 'il-mago-del-biliardo', frase: 'Sblocca il tiro masse al biliardo', effetto: { famiglia: 'sblocca-funzione', funzione: 'tiro-masse', dove: null }, attivita: 'biliardo' },
  { chiave: 'segreti-di-gioco', frase: 'Sblocca trucchi per i videogiochi retro', effetto: { famiglia: 'sblocca-funzione', funzione: 'trucchi', dove: null } },
  { chiave: 'enciclopedia-floreale', frase: "Sblocca l'interpretazione del linguaggio dei fiori nel lavoro da fioraio", effetto: { famiglia: 'sblocca-funzione', funzione: 'linguaggio-fiori', dove: null }, attivita: 'lavoro-rafflesia' },
];

export const migration300: Migration = {
  id: 300,
  name: 'libri_con_effetti_strutturati',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'libro') || !haColonna(db, 'libro', 'effetti_json')) { logger.warn({ migrazione: 300 }, 'libri o effetti dichiarati assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [];
    let cambiati = 0;
    for (const l of LIBRI) {
      const r = db.prepare('SELECT effetti_json, sblocca, origine, seed_json FROM main.libro WHERE chiave = ?').get(l.chiave) as { effetti_json: string | null; sblocca: string | null; origine: string; seed_json: string | null } | undefined;
      // l'attività nominata, solo se esiste (un riferimento rotto non si scrive)
      const dove = l.attivita && esisteTabella(db, 'attivita') && db.prepare('SELECT 1 FROM main.attivita WHERE chiave = ?').get(l.attivita) ? l.attivita : null;
      const effetto = l.effetto.famiglia === 'sblocca-funzione' ? { ...l.effetto, dove } : l.effetto;
      if (!r) { esiti.push({ chiave: l.chiave, esito: 'libro assente' }); continue; }
      const letto = (() => { try { return r.effetti_json === null ? null : canonico(JSON.parse(r.effetti_json)); } catch { return null; } })();
      if (letto === canonico([{ effetto }])) { esiti.push({ chiave: l.chiave, esito: 'già strutturato' }); continue; }
      if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave: l.chiave, esito: 'libro corretto dall’utente: non toccato' }); continue; }
      if (letto !== canonico([{ effetto: { famiglia: 'descrittivo', testo: l.frase } }]) || r.sblocca !== l.frase) { esiti.push({ chiave: l.chiave, esito: 'effetto diverso dalla frase attesa: non toccato' }); continue; }
      if (db.prepare("UPDATE main.libro SET effetti_json = ?, updated_at = ? WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").run(JSON.stringify([{ effetto }]), new Date().toISOString(), l.chiave).changes !== 1) errore(`il libro ${l.chiave} non si aggiorna`);
      cambiati++;
      esiti.push({ chiave: l.chiave, esito: `strutturato: ${canonico(effetto)}${l.attivita && !dove ? ` (attività ${l.attivita} assente: dove null)` : ''}` });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = { strutturati: cambiati, gia: esiti.filter((e) => e.esito === 'già strutturato').length, nonToccati: esiti.filter((e) => /non toccato|assente/.test(e.esito)).length };
    if (cambiati) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 300, { conteggi, esiti, nota: 'La guida non dice di quanto aumentano i punti Dote (film, studio): l’effetto non ha importo, e l’app lo mostra come promemoria (modificatoriLibri).' }, cambiati > 0);
    logger.info({ migrazione: 300, ...conteggi }, 'Libri: effetti strutturati dei dodici libri che cambiano un’altra attività');
  },
};
