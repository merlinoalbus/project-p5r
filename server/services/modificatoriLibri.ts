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
//   - nella scelta dell'esito, nella scheda di un'attività (Guida → Attività) e nel suo contatore (Partita → Progressi; per la pesca anche nel
//     registro della pesca): `moltiplica fabbricazione` per la fabbricazione, `aumenta-punti studio` per le attività di studio,
//     `sblocca-funzione` per l'attività che il libro nomina (Fioraio Rafflesia, biliardo, freccette, gabbie di battuta, pesca), anche quando
//     l'attività non dichiara esiti;
//   - nei film (Guida → Film e Partita → Letture): `aumenta-punti film`;
//   - nei libri (Guida → Libri e Partita → Letture): le capacità che non valgono in un'attività dell'app (le combinazioni di attacchi
//     tecnici, in combattimento); `moltiplica lettura` («Lettura rapida») lo dice già `LibriDto.letturaRapida`, nelle stesse due schermate;
//   - nei videogiochi (Guida → Videogiochi e Partita → Letture): i trucchi dei videogiochi retro.
// Così ognuno dei dodici libri ha almeno un posto in cui si vede. Sola lettura.
// ============================================================

import { prepared } from '../db/dbService.js';
import { leggiVociEffetto } from '../../shared/effettiCatalogo.js';
import { descriviEffetto, type EffettoOggetto, type Funzione } from '../../shared/effettiOggetto.js';

/**
 * Dove vale una capacità che il libro sblocca senza legarla a un'attività (`dove: null`), e in quale contesto: i trucchi valgono nei
 * videogiochi retro («Segreti di gioco»); le combinazioni di attacchi tecnici valgono in combattimento («Comprendere il cuore»), che l'app non
 * gestisce come attività, quindi si ricordano con i libri. Una capacità nuova senza voce qui va con i libri, senza contesto.
 */
const AMBITO_SENZA_ATTIVITA: Partial<Record<Funzione, { dove: 'videogiochi' | 'libri'; contesto: string }>> = {
  trucchi: { dove: 'videogiochi', contesto: 'nei videogiochi retro' },
  'attacchi-tecnici': { dove: 'libri', contesto: 'in combattimento' },
};
const ambitoSenzaAttivita = (funzione: Funzione) => AMBITO_SENZA_ATTIVITA[funzione] ?? { dove: 'libri' as const, contesto: '' };

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
  return scelti.map(({ l, e }) => {
    const contesto = e.famiglia === 'sblocca-funzione' && e.dove === null ? ambitoSenzaAttivita(e.funzione).contesto : '';
    return `${l.nome}: ${descriviEffetto(e, nomi)}${contesto ? ` ${contesto}` : ''}`;
  });
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

/** Le capacità dei libri letti che non valgono in un'attività dell'app («Comprendere il cuore», in combattimento): si ricordano con i libri.
 *  «Lettura rapida» (`moltiplica lettura`) non passa da qui: la dice `LibriDto.letturaRapida`, che cambia anche il passo del «+» (un solo punto). */
export function promemoriaLibriSenzaAttivita(letture: ReadonlySet<string>): string[] {
  return frasi(libriLetti(letture), (e) => e.famiglia === 'sblocca-funzione' && e.dove === null && ambitoSenzaAttivita(e.funzione).dove === 'libri');
}

/** Gli effetti dei libri letti che riguardano i videogiochi («Segreti di gioco»: i trucchi dei videogiochi retro). */
export function promemoriaLibriPerVideogiochi(letture: ReadonlySet<string>): string[] {
  return frasi(libriLetti(letture), (e) => e.famiglia === 'sblocca-funzione' && e.dove === null && ambitoSenzaAttivita(e.funzione).dove === 'videogiochi');
}
