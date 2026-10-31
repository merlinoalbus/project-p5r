// ============================================================
// EditorQuiz — la guida del quiz di un'attività nel modulo «Correggi»: giorni, spiegazione, domanda, risposte, premi
// ============================================================
//
// La struttura è quella di `shared/quizAttivita.ts`, generica per tutti i lavori (scelta
// dell'utente, 2026-10-17): oggi c'è quella del Triple Seven, le altre si scrivono da qui. Le
// righe lasciate vuote le toglie il server. Ogni riga ha il nome della guida italiana, l'altro nome
// con cui la si cerca, la risposta e una nota (per esempio «abbinamento incerto»).
//
// L13 (O7-5, censimento del 25/10): i giorni del mese si scelgono a pulsanti (1–31, un tocco mette, un altro toglie) invece di un testo
// «7, 17, 27» da interpretare, che bloccava il salvataggio finché non era scritto bene; restano `quiz_json.giorni` come prima. Il testo
// lungo è quello comune (`TestoCheCresce`, prima ce n'era una copia qui) e i campi hanno l'etichetta unica di `CampoTesto`. Il titolo
// della sezione lo dà il modulo dell'attività («Guida del quiz»).
// ============================================================

import { LIMITI_QUIZ, giorniDelQuizTesto, type EsitoQuiz, type QuizAttivita, type VoceQuiz } from '../../../shared/quizAttivita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Campo, CampoTesto } from '../shared/Campo';

/** Una guida vuota, da riempire. */
const QUIZ_VUOTO: QuizAttivita = { giorni: [], spiegazione: '', domanda: '', voci: [{ oggetto: '', altroNome: null, risposta: '', nota: null }], esiti: [] };
/** I giorni che un mese può avere: il quiz vale «ogni mese», quindi 1–31. */
const GIORNI_DEL_MESE = Array.from({ length: 31 }, (_, i) => i + 1);

interface Props {
  quiz: QuizAttivita | null;
  onCambia: (patch: { quiz_json: QuizAttivita | null }) => void;
  disabilitato?: boolean;
}

/**
 * L'editor della guida del quiz: senza guida un solo pulsante per aggiungerla; con la guida i giorni del mese a pulsanti, come
 * funziona, la domanda, le risposte riga per riga e i premi per esito, ciascuno con «Togli», e il pulsante che toglie tutta la guida.
 */
export function EditorQuiz({ quiz, onCambia, disabilitato }: Props) {
  if (!quiz) {
    return (
      <PulsanteVisivo tono="secondario" compatto className="campo--largo self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi la guida di un quiz"
        dettaglio="giorni, domanda, risposte e premi" disabled={disabilitato} onClick={() => onCambia({ quiz_json: QUIZ_VUOTO })} />
    );
  }
  /** Cambia alcuni campi della guida. */
  const cambia = (patch: Partial<QuizAttivita>) => onCambia({ quiz_json: { ...quiz, ...patch } });
  /** Cambia la riga `i` delle risposte. */
  const cambiaVoce = (i: number, patch: Partial<VoceQuiz>) => cambia({ voci: quiz.voci.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  /** Cambia la riga `i` dei premi. */
  const cambiaEsito = (i: number, patch: Partial<EsitoQuiz>) => cambia({ esiti: quiz.esiti.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  /** Mette o toglie il giorno `g`; i giorni restano in ordine e senza doppioni. */
  const alterna = (g: number) => cambia({ giorni: quiz.giorni.includes(g) ? quiz.giorni.filter((x) => x !== g) : [...quiz.giorni, g].sort((a, b) => a - b) });
  return (
    <div className="campo--largo flex min-w-0 flex-col gap-3">
      <p className="m-0 testo-12 text-text-muted">Si apre dalla voce del diario che registra un turno di questa attività, dalla pagina Attività e dalla pagina del negozio della stessa sede. Le righe lasciate vuote non si salvano.</p>
      <Campo etichetta="Giorni del mese" aiuto={quiz.giorni.length ? `C’è ${giorniDelQuizTesto(quiz.giorni)}.` : 'Nessun giorno fisso: tocca i giorni in cui c’è il quiz.'}>
        {/* sette colonne come un calendario: a 375 px ogni pulsante resta di almeno 44 px; il gruppo (nome e aiuto) lo dà il `Campo` */}
        <div className="grid grid-cols-7 gap-1">
          {GIORNI_DEL_MESE.map((g) => {
            const scelto = quiz.giorni.includes(g);
            return <button key={g} type="button" className={`chip touch min-w-0 justify-center tabular-nums ${scelto ? 'chip--attivo' : ''}`} aria-pressed={scelto} disabled={disabilitato}
              aria-label={`Giorno ${g}`} onClick={() => alterna(g)}>{g}</button>;
          })}
        </div>
        {quiz.giorni.length > 0 && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli tutti i giorni"
          disabled={disabilitato} onClick={() => cambia({ giorni: [] })} />}
      </Campo>
      <div className="griglia-campi">
        <CampoTesto etichetta="Domanda" valore={quiz.domanda} massimo={LIMITI_QUIZ.domanda} disabilitato={disabilitato} segnaposto="Dove si trova il codice a barre di…?" largo onCambia={(domanda) => cambia({ domanda })} />
        <CampoTesto etichetta="Come funziona" tipo="lungo" valore={quiz.spiegazione} massimo={LIMITI_QUIZ.testo} disabilitato={disabilitato} onCambia={(spiegazione) => cambia({ spiegazione })} />
      </div>
      {quiz.voci.map((v, i) => (
        <fieldset key={i} className="regole-editor flex min-w-0 flex-col gap-2">
          <legend>Risposta {i + 1}</legend>
          <div className="griglia-campi">
            <CampoTesto etichetta="Nome" valore={v.oggetto} massimo={LIMITI_QUIZ.nome} disabilitato={disabilitato} segnaposto="Come lo chiama la guida italiana" onCambia={(oggetto) => cambiaVoce(i, { oggetto })} />
            <CampoTesto etichetta="Altro nome" valore={v.altroNome ?? ''} massimo={LIMITI_QUIZ.nome} disabilitato={disabilitato} segnaposto="Facoltativo: un altro nome con cui cercarlo" onCambia={(t) => cambiaVoce(i, { altroNome: t || null })} />
            <CampoTesto etichetta="Risposta giusta" valore={v.risposta} massimo={LIMITI_QUIZ.risposta} disabilitato={disabilitato} onCambia={(risposta) => cambiaVoce(i, { risposta })} />
            <CampoTesto etichetta="Nota" valore={v.nota ?? ''} massimo={LIMITI_QUIZ.nota} disabilitato={disabilitato} segnaposto="Facoltativa, sempre visibile" onCambia={(t) => cambiaVoce(i, { nota: t || null })} />
          </div>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" className="self-start" disabled={disabilitato} onClick={() => cambia({ voci: quiz.voci.filter((_, j) => j !== i) })} aria-label={`Togli la risposta ${i + 1}`} />
        </fieldset>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una risposta"
        disabled={disabilitato || quiz.voci.length >= LIMITI_QUIZ.voci} onClick={() => cambia({ voci: [...quiz.voci, { oggetto: '', altroNome: null, risposta: '', nota: null }] })} />
      {quiz.esiti.map((e, i) => (
        <fieldset key={i} className="regole-editor flex min-w-0 flex-col gap-2">
          <legend>Premio {i + 1}</legend>
          <div className="griglia-campi">
            <CampoTesto etichetta="Esito" valore={e.esito} massimo={LIMITI_QUIZ.esito} disabilitato={disabilitato} segnaposto="Giusta al primo tentativo" onCambia={(esito) => cambiaEsito(i, { esito })} />
            <CampoTesto etichetta="Che cosa dà" valore={e.premio} massimo={LIMITI_QUIZ.premio} disabilitato={disabilitato} segnaposto="7.400 ¥ e 3 punti Fascino" onCambia={(premio) => cambiaEsito(i, { premio })} />
          </div>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" className="self-start" disabled={disabilitato} onClick={() => cambia({ esiti: quiz.esiti.filter((_, j) => j !== i) })} aria-label={`Togli il premio ${i + 1}`} />
        </fieldset>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un premio"
        disabled={disabilitato || quiz.esiti.length >= LIMITI_QUIZ.esiti} onClick={() => cambia({ esiti: [...quiz.esiti, { esito: '', premio: '' }] })} />
      <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli la guida del quiz"
        disabled={disabilitato} onClick={() => onCambia({ quiz_json: null })} />
    </div>
  );
}
