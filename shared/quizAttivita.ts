// ============================================================
// quizAttivita — la guida del quiz di un'attività (il quiz dei codici a barre del Triple Seven), condivisa da frontend e backend
// ============================================================
//
// Richiesta dell'utente (2026-10-17): «quando è previsto lavoro al Convenience Store deve essere
// consultabile la guida (in italiano)». Il quiz stava in una frase dei dettagli; qui diventa una
// struttura sola per tutte le attività (scelta dell'utente: «generica per tutti i lavori»): in quali
// giorni del mese c'è, come funziona, la domanda, le risposte per elemento e i premi per esito.
// Ogni elemento ha il nome che usa la guida italiana e, se diverso, un altro nome con cui lo si
// trova (le guide inglesi). Si salva in `attivita.quiz_json` (migrazione 105).
// ============================================================

/** Un elemento del quiz: il nome della guida italiana, l'altro nome con cui lo si trova, la risposta giusta e una nota
 *  (per esempio «abbinamento incerto» quando i due nomi non si abbinano con certezza). */
export interface VoceQuiz { oggetto: string; altroNome: string | null; risposta: string; nota: string | null }
/** Un esito del quiz e che cosa dà («Giusta al primo tentativo» → «7.400 ¥ e 3 punti Fascino»). */
export interface EsitoQuiz { esito: string; premio: string }
export interface QuizAttivita {
  /** I giorni del mese in cui c'è il quiz (1–31, crescenti); vuoto = il quiz non ha giorni fissi. */
  giorni: number[];
  spiegazione: string;
  domanda: string;
  voci: VoceQuiz[];
  esiti: EsitoQuiz[];
}

/** I limiti della struttura: gli stessi nello schema dell'API e nel modulo dell'interfaccia. */
export const LIMITI_QUIZ = { testo: 600, domanda: 300, nome: 120, risposta: 300, nota: 300, esito: 120, premio: 200, voci: 60, esiti: 10 } as const;

/** Il testo ripulito degli spazi agli estremi e tagliato al limite; non stringa → ''. */
const pulito = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Il quiz salvato (o in arrivo) ricondotto alla forma valida: giorni interi fra 1 e 31 senza doppioni e in ordine,
 * testi ripuliti e tagliati ai limiti, elementi senza nome o senza risposta e esiti senza testo tolti, altro nome
 * vuoto o uguale al nome = null. Null se non è un oggetto o se non resta né un elemento né una domanda.
 */
export function normalizzaQuiz(v: unknown): QuizAttivita | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const giorni = [...new Set((Array.isArray(o.giorni) ? o.giorni : []).filter((g): g is number => Number.isInteger(g) && (g as number) >= 1 && (g as number) <= 31))].sort((a, b) => a - b);
  const voci: VoceQuiz[] = [];
  for (const x of (Array.isArray(o.voci) ? o.voci : []).slice(0, LIMITI_QUIZ.voci)) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    const oggetto = pulito(r.oggetto, LIMITI_QUIZ.nome);
    const risposta = pulito(r.risposta, LIMITI_QUIZ.risposta);
    if (!oggetto || !risposta) continue;
    const altro = pulito(r.altroNome, LIMITI_QUIZ.nome);
    voci.push({ oggetto, altroNome: altro && altro.toLowerCase() !== oggetto.toLowerCase() ? altro : null, risposta, nota: pulito(r.nota, LIMITI_QUIZ.nota) || null });
  }
  const esiti: EsitoQuiz[] = [];
  for (const x of (Array.isArray(o.esiti) ? o.esiti : []).slice(0, LIMITI_QUIZ.esiti)) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    const esito = pulito(r.esito, LIMITI_QUIZ.esito);
    const premio = pulito(r.premio, LIMITI_QUIZ.premio);
    if (esito && premio) esiti.push({ esito, premio });
  }
  const domanda = pulito(o.domanda, LIMITI_QUIZ.domanda);
  if (voci.length === 0 && !domanda) return null;
  return { giorni, spiegazione: pulito(o.spiegazione, LIMITI_QUIZ.testo), domanda, voci, esiti };
}

/** Il quiz di una colonna `quiz_json`: null se vuota, illeggibile o senza contenuto. */
export function leggiQuiz(json: string | null | undefined): QuizAttivita | null {
  if (!json) return null;
  try { return normalizzaQuiz(JSON.parse(json)); } catch { return null; }
}

/** Vero se il giorno di gioco ('MM-GG') cade in uno dei giorni del quiz. */
export function eGiornoDelQuiz(quiz: Pick<QuizAttivita, 'giorni'>, giorno: string): boolean {
  const g = Number(giorno.slice(3, 5));
  return Number.isInteger(g) && quiz.giorni.includes(g);
}

/** «il 7, il 17 e il 27 di ogni mese»; vuoto senza giorni. */
export function giorniDelQuizTesto(giorni: readonly number[]): string {
  if (giorni.length === 0) return '';
  const voci = giorni.map((g) => `${g === 1 || g === 8 || g === 11 ? "l'" : 'il '}${g}`);
  const elenco = voci.length === 1 ? voci[0] : `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
  return `${elenco} di ogni mese`;
}

/** I giorni scritti a mano («7, 17, 27»; virgole, punti e virgola o spazi): vuoto = nessun giorno fisso; null se c'è
 *  qualcosa che non è un giorno del mese (1–31). Ordinati e senza doppioni. */
export function leggiGiorniQuiz(testo: string): number[] | null {
  const parti = testo.split(/[\s,;]+/).filter(Boolean);
  if (parti.some((p) => !/^\d{1,2}$/.test(p) || Number(p) < 1 || Number(p) > 31)) return null;
  return [...new Set(parti.map(Number))].sort((a, b) => a - b);
}
