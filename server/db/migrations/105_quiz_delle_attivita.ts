// ============================================================
// 105 — la guida del quiz di un'attività: il quiz dei codici a barre del Triple Seven
// ============================================================
//
// Richiesta dell'utente (2026-10-17): il quiz dei codici a barre del Triple Seven mancava dalla
// guida («quando è previsto lavoro al Convenience Store deve essere consultabile la guida (in
// italiano)»). Nasce `attivita.quiz_json` (`shared/quizAttivita.ts`), generica per tutte le
// attività; qui si scrive quella del Triple Seven. Fonti: la guida italiana di allgamestaff
// («Lavori part-time», sezione «Eventi speciali del Triple Seven»: giorni, risposte, premi per
// esito), la tabella incollata dall'utente (nomi inglesi e posizioni, da TheGamer/Gamertweak) e
// Gamepressure, che usa gli stessi nomi della guida italiana. Le risposte seguono la tabella
// dell'utente, tradotte senza perdere nulla («sul retro» compreso). Dieci nomi si abbinano senza
// dubbi; «Boy Chance» e «Tokyo Food Tour» corrispondono a «Black Box» e «Shonen Trip» ma non si sa
// in quale ordine (le posizioni reggono entrambi gli abbinamenti, e «shōnen» = «ragazzo» suggerisce
// quello opposto alla posizione): per scelta dell'utente (2026-10-17) quelle due righe hanno il
// nome della lista, la risposta della lista, i due nomi italiani possibili e la nota «abbinamento
// incerto». Si scrive solo dove il quiz manca, anche nell'istantanea della guida (`seed_json`) di
// una riga corretta dall'utente, così «Ripristina» non lo perde; il lavoro dell'utente non si tocca.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';
import type { QuizAttivita } from '../../../shared/quizAttivita.js';

/** Il quiz dei codici a barre del Triple Seven, in italiano. */
export const QUIZ_TRIPLE_SEVEN: QuizAttivita = {
  giorni: [7, 17, 27],
  spiegazione: 'Durante il turno bisogna memorizzare dove si trova il codice a barre di due prodotti scelti a caso; poco dopo il gioco chiede la posizione del codice di uno dei due. Mentre si risponde il registro dei messaggi è bloccato, ma prima della domanda si può rileggere.',
  domanda: 'Dove si trova il codice a barre di…?',
  voci: [
    { oggetto: 'Black Donuts', altroNome: 'Black Donut', risposta: 'Vicino alla descrizione dello zucchero di canna', nota: null },
    { oggetto: 'Boy Chance', altroNome: 'Black Box o Shonen Trip', risposta: 'Sul retro, sul logo dell’azienda', nota: 'Abbinamento incerto: nella guida italiana è «Black Box» o «Shonen Trip», non si sa quale dei due.' },
    { oggetto: 'Cow’s Milk', altroNome: 'Cow Milk', risposta: 'Accanto al logo dell’azienda', nota: null },
    { oggetto: 'Edo Rice Balls', altroNome: 'Edo Rice Ball', risposta: 'Sul retro', nota: null },
    { oggetto: 'Ink Crunchies', altroNome: 'India Ink', risposta: 'Sul lato destro, guardandolo di fronte', nota: null },
    { oggetto: 'Jumbo Vanilla Cup', altroNome: 'Super Duper Vanilla Cup', risposta: 'Accanto all’illustrazione del personaggio', nota: null },
    { oggetto: 'Panda Bread', altroNome: 'BW Panda Pan', risposta: 'Vicino alla coda', nota: null },
    { oggetto: 'Racing Newspaper Form', altroNome: 'Horse Racing Newspaper', risposta: 'Sul retro, vicino alla sezione dei commenti', nota: null },
    { oggetto: 'Skeleton Umbrella', altroNome: null, risposta: 'Dietro il manico', nota: null },
    { oggetto: 'Tiger-striped Pants', altroNome: 'Tiger Pattern Pants', risposta: 'Sull’etichetta cucita all’interno', nota: null },
    { oggetto: 'Tokyo Food Tour', altroNome: 'Black Box o Shonen Trip', risposta: 'Sul retro della copertina', nota: 'Abbinamento incerto: nella guida italiana è «Black Box» o «Shonen Trip», non si sa quale dei due.' },
    { oggetto: 'Zebramen', altroNome: 'Zebra Ramen', risposta: 'Vicino alle informazioni sulla zebra', nota: null },
  ],
  esiti: [
    { esito: 'Giusta al primo tentativo', premio: '7.400 ¥ e 3 punti Fascino' },
    { esito: 'Giusta al secondo tentativo', premio: '5.800 ¥ e 2 punti Fascino' },
    { esito: 'Due errori', premio: '3.500 ¥ e 2 punti Fascino' },
  ],
};

export const migration105: Migration = {
  id: 105,
  name: 'quiz_delle_attivita',
  up(db) {
    aggiungiColonna(db, 'attivita', 'quiz_json', 'TEXT');
    const quiz = JSON.stringify(QUIZ_TRIPLE_SEVEN);
    const scritte = db.prepare("UPDATE attivita SET quiz_json = ? WHERE chiave = 'lavoro-triple-seven' AND quiz_json IS NULL").run(quiz).changes;
    // l'istantanea della guida di una riga corretta dall'utente: «Ripristina» riporta anche il quiz
    let istantanee = 0;
    const r = db.prepare("SELECT seed_json FROM attivita WHERE chiave = 'lavoro-triple-seven' AND seed_json IS NOT NULL").get() as { seed_json: string } | undefined;
    if (r) {
      try {
        const seed = JSON.parse(r.seed_json) as Record<string, unknown>;
        if (seed && typeof seed === 'object' && seed.quiz_json == null) {
          seed.quiz_json = quiz;
          istantanee = db.prepare("UPDATE attivita SET seed_json = ? WHERE chiave = 'lavoro-triple-seven'").run(JSON.stringify(seed)).changes;
        }
      } catch {
        logger.warn('migrazione 105: istantanea del Triple Seven illeggibile, lasciata com\'era');
      }
    }
    logger.info({ scritte, istantanee }, 'migrazione 105: guida del quiz delle attività');
  },
};
