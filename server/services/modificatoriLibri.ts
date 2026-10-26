// ============================================================
// modificatoriLibri — gli effetti dei libri letti nella partita, come promemoria dove servono (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Decisione 21, precisazione dell'utente: gli oggetti i cui effetti incidono su ciò che l'app gestisce si modellano con i tipi dell'app.
// Dodici libri non danno Doti ma cambiano un'altra attività: raddoppiano la velocità di lettura o gli strumenti creati per sessione,
// aumentano i punti Dote da film e da studio, aprono il Terzo Occhio in un minigioco (`libro.effetti_json`, famiglie `moltiplica`,
// `aumenta-punti`, `sblocca-funzione` di `shared/effettiOggetto.ts`, scritte dalla migrazione 300). La guida non dice di quanto aumentano i
// punti né lo dice il gioco a schermo: l'app non inventa importi e non applica niente da sola. Qui si leggono i libri LETTI nella partita
// (dalle letture complete, `StatoDisponibilita.letture`) e si dice, dove chi gioca sceglie, quale effetto vale:
//   - nella scelta dell'esito e nella scheda di un'attività: `moltiplica fabbricazione` per la fabbricazione, `aumenta-punti studio` per le
//     attività di studio, `sblocca-funzione` per l'attività che il libro nomina;
//   - nella scheda dei film: `aumenta-punti film`; nella scheda dei libri: `moltiplica lettura`.
// Sola lettura.
// ============================================================

import { prepared } from '../db/dbService.js';
import { leggiVociEffetto } from '../../shared/effettiCatalogo.js';
import { descriviEffetto, type EffettoOggetto } from '../../shared/effettiOggetto.js';

/** L'attività della fabbricazione degli strumenti d'infiltrazione (migrazione 302): la bersaglia `moltiplica fabbricazione`. */
export const ATTIVITA_FABBRICAZIONE = 'fabbricazione-strumenti';

interface LibroLetto { chiave: string; nome: string; effetti: EffettoOggetto[] }

/** I libri letti nella partita che hanno almeno un effetto non Dote (le Doti le dà la lettura stessa). */
function libriLetti(letture: ReadonlySet<string>): LibroLetto[] {
  const chiavi = [...letture].filter((k) => k.startsWith('libro/')).map((k) => k.slice('libro/'.length));
  if (!chiavi.length) return [];
  const righe = prepared(`SELECT chiave, nome, effetti_json FROM libro WHERE chiave IN (${chiavi.map(() => '?').join(', ')}) ORDER BY ordine`).all(...chiavi) as Array<{ chiave: string; nome: string; effetti_json: string | null }>;
  return righe.map((r) => ({ chiave: r.chiave, nome: r.nome, effetti: leggiVociEffetto(r.effetti_json).map((v) => v.effetto).filter((e) => e.famiglia !== 'dote') }))
    .filter((l) => l.effetti.length > 0);
}

/** I nomi delle attività, per le frasi di `sblocca-funzione` («Sblocca il Terzo Occhio in Pesca»). */
function nomiAttivita(): Record<string, string> {
  return Object.fromEntries((prepared('SELECT chiave, nome FROM attivita').all() as Array<{ chiave: string; nome: string }>).map((a) => [a.chiave, a.nome]));
}

const frasi = (letti: LibroLetto[], vale: (e: EffettoOggetto) => boolean): string[] => {
  const scelti = letti.flatMap((l) => l.effetti.filter(vale).map((e) => ({ l, e })));
  if (!scelti.length) return [];
  const nomi = { attivita: nomiAttivita() };
  return scelti.map(({ l, e }) => `${l.nome}: ${descriviEffetto(e, nomi)}`);
};

/** Gli effetti dei libri letti che riguardano un'attività (fabbricazione, studio, l'attività che il libro nomina). */
export function promemoriaLibriPerAttivita(letture: ReadonlySet<string>, attivita: { chiave: string; tipo: string }): string[] {
  const letti = libriLetti(letture);
  return frasi(letti, (e) => (e.famiglia === 'moltiplica' && e.cosa === 'fabbricazione' && attivita.chiave === ATTIVITA_FABBRICAZIONE)
    || (e.famiglia === 'aumenta-punti' && e.dove === 'studio' && attivita.tipo === 'studio')
    || (e.famiglia === 'sblocca-funzione' && e.dove === attivita.chiave));
}

/** Gli effetti dei libri letti che riguardano la visione di film e DVD. */
export function promemoriaLibriPerFilm(letture: ReadonlySet<string>): string[] {
  return frasi(libriLetti(letture), (e) => e.famiglia === 'aumenta-punti' && e.dove === 'film');
}

/** Gli effetti dei libri letti che riguardano la lettura degli altri libri. */
export function promemoriaLibriPerLettura(letture: ReadonlySet<string>): string[] {
  return frasi(libriLetti(letture), (e) => e.famiglia === 'moltiplica' && e.cosa === 'lettura');
}
