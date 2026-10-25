// ============================================================
// EditorQuiz — la guida del quiz di un'attività nel modulo «Correggi»: giorni, spiegazione, domanda, risposte, premi
// ============================================================
//
// La struttura è quella di `shared/quizAttivita.ts`, generica per tutti i lavori (scelta
// dell'utente, 2026-10-17): oggi c'è quella del Triple Seven, le altre si scrivono da qui. I giorni
// si scrivono a mano («7, 17, 27») e il modulo non si salva finché non sono giorni del mese; le
// righe lasciate vuote le toglie il server. Ogni riga ha il nome della guida italiana, l'altro nome
// con cui la si cerca, la risposta e una nota (per esempio «abbinamento incerto»).
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { leggiGiorniQuiz, LIMITI_QUIZ, type EsitoQuiz, type QuizAttivita, type VoceQuiz } from '../../../shared/quizAttivita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/**
 * Un testo lungo alto quanto il suo contenuto: dentro la finestra del modulo, che già scorre, un'area con la barra propria
 * sarebbe uno scorrimento annidato (a 375 px «Come funziona» del Triple Seven ne aveva bisogno). L'altezza si ricalcola a
 * ogni cambio del testo e della larghezza del campo.
 */
function TestoCheCresce({ valore, max, disabilitato, onCambia }: { valore: string; max: number; disabilitato?: boolean; onCambia: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const adatta = useCallback(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + t.offsetHeight - t.clientHeight}px`;
  }, []);
  useLayoutEffect(adatta, [adatta, valore]);
  useEffect(() => {
    const t = ref.current;
    if (!t || typeof ResizeObserver === 'undefined') return;
    let larghezza = t.clientWidth;
    // solo i cambi di larghezza: quelli d'altezza li fa `adatta`, e reagirvi farebbe un giro senza fine
    const osservatore = new ResizeObserver(() => { if (t.clientWidth !== larghezza) { larghezza = t.clientWidth; adatta(); } });
    osservatore.observe(t);
    return () => osservatore.disconnect();
  }, [adatta]);
  return <textarea ref={ref} className="form-input resize-none overflow-hidden" rows={2} maxLength={max} value={valore} disabled={disabilitato} onChange={(e) => onCambia(e.target.value)} />;
}

/** Una guida vuota, da riempire. */
const QUIZ_VUOTO: QuizAttivita = { giorni: [], spiegazione: '', domanda: '', voci: [{ oggetto: '', altroNome: null, risposta: '', nota: null }], esiti: [] };

interface Props {
  quiz: QuizAttivita | null;
  giorni: string;
  onCambia: (patch: { quiz_json?: QuizAttivita | null; _giorniQuiz?: string }) => void;
  disabilitato?: boolean;
}

/**
 * L'editor della guida del quiz: senza guida un solo pulsante per aggiungerla; con la guida i giorni (con l'errore se non
 * sono giorni del mese), come funziona, la domanda, le risposte riga per riga e i premi per esito, ciascuno con «Togli», e il
 * pulsante che toglie tutta la guida.
 */
export function EditorQuiz({ quiz, giorni, onCambia, disabilitato }: Props) {
  if (!quiz) {
    return (
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi la guida di un quiz"
        dettaglio="giorni, domanda, risposte e premi" disabled={disabilitato} onClick={() => onCambia({ quiz_json: QUIZ_VUOTO, _giorniQuiz: '' })} />
    );
  }
  /** Cambia alcuni campi della guida. */
  const cambia = (patch: Partial<QuizAttivita>) => onCambia({ quiz_json: { ...quiz, ...patch } });
  /** Cambia la riga `i` delle risposte. */
  const cambiaVoce = (i: number, patch: Partial<VoceQuiz>) => cambia({ voci: quiz.voci.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  /** Cambia la riga `i` dei premi. */
  const cambiaEsito = (i: number, patch: Partial<EsitoQuiz>) => cambia({ esiti: quiz.esiti.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const giorniSbagliati = leggiGiorniQuiz(giorni) === null;
  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Guida del quiz</legend>
      <p className="m-0 testo-12 text-text-muted">Si apre dalla voce del diario che registra un turno di questa attività, dalla pagina Attività e dalla pagina del negozio della stessa sede. Le righe lasciate vuote non si salvano.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="editor-mappa__campo">
          Giorni del mese
          <input className="form-input" type="text" maxLength={120} value={giorni} disabled={disabilitato} placeholder="7, 17, 27" aria-label="Giorni del mese"
            aria-invalid={giorniSbagliati} onChange={(e) => onCambia({ _giorniQuiz: e.target.value })} />
          <span className={`testo-12 ${giorniSbagliati ? 'text-error' : 'text-text-muted'}`}>{giorniSbagliati ? 'Scrivi solo giorni del mese, da 1 a 31, separati da virgole.' : 'Vuoto se il quiz non ha giorni fissi'}</span>
        </label>
        <label className="editor-mappa__campo">
          Domanda
          <input className="form-input" type="text" maxLength={LIMITI_QUIZ.domanda} value={quiz.domanda} disabled={disabilitato} placeholder="Dove si trova il codice a barre di…?" onChange={(e) => cambia({ domanda: e.target.value })} />
        </label>
        <label className="editor-mappa__campo sm:col-span-2">
          Come funziona
          <TestoCheCresce valore={quiz.spiegazione} max={LIMITI_QUIZ.testo} disabilitato={disabilitato} onCambia={(spiegazione) => cambia({ spiegazione })} />
        </label>
      </div>
      <strong className="testo-13">Risposte</strong>
      {quiz.voci.map((v, i) => (
        <div key={i} className="grid grid-cols-1 items-end gap-2 border-b border-border pb-2 sm:grid-cols-2">
          <label className="editor-mappa__campo">
            Nome
            <input className="form-input" type="text" maxLength={LIMITI_QUIZ.nome} value={v.oggetto} disabled={disabilitato} placeholder="Come lo chiama la guida italiana" aria-label={`Nome della risposta ${i + 1}`} onChange={(e) => cambiaVoce(i, { oggetto: e.target.value })} />
          </label>
          <label className="editor-mappa__campo">
            Altro nome
            <input className="form-input" type="text" maxLength={LIMITI_QUIZ.nome} value={v.altroNome ?? ''} disabled={disabilitato} placeholder="Facoltativo: un altro nome con cui cercarlo" aria-label={`Altro nome della risposta ${i + 1}`} onChange={(e) => cambiaVoce(i, { altroNome: e.target.value || null })} />
          </label>
          <label className="editor-mappa__campo">
            Risposta
            <input className="form-input" type="text" maxLength={LIMITI_QUIZ.risposta} value={v.risposta} disabled={disabilitato} placeholder="La risposta giusta" aria-label={`Risposta ${i + 1}`} onChange={(e) => cambiaVoce(i, { risposta: e.target.value })} />
          </label>
          <label className="editor-mappa__campo">
            Nota
            <input className="form-input" type="text" maxLength={LIMITI_QUIZ.nota} value={v.nota ?? ''} disabled={disabilitato} placeholder="Facoltativa, sempre visibile" aria-label={`Nota della risposta ${i + 1}`} onChange={(e) => cambiaVoce(i, { nota: e.target.value || null })} />
          </label>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" className="justify-self-start" disabled={disabilitato} onClick={() => cambia({ voci: quiz.voci.filter((_, j) => j !== i) })} aria-label={`Togli la risposta ${i + 1}`} />
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una risposta"
        disabled={disabilitato || quiz.voci.length >= LIMITI_QUIZ.voci} onClick={() => cambia({ voci: [...quiz.voci, { oggetto: '', altroNome: null, risposta: '', nota: null }] })} />
      <strong className="testo-13">Premi</strong>
      {quiz.esiti.map((e, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <label className="editor-mappa__campo min-w-[160px] flex-1">
            Esito
            <input className="form-input" type="text" maxLength={LIMITI_QUIZ.esito} value={e.esito} disabled={disabilitato} placeholder="Giusta al primo tentativo" aria-label={`Esito ${i + 1}`} onChange={(ev) => cambiaEsito(i, { esito: ev.target.value })} />
          </label>
          <label className="editor-mappa__campo min-w-[160px] flex-1">
            Premio
            <input className="form-input" type="text" maxLength={LIMITI_QUIZ.premio} value={e.premio} disabled={disabilitato} placeholder="7.400 ¥ e 3 punti Fascino" aria-label={`Premio ${i + 1}`} onChange={(ev) => cambiaEsito(i, { premio: ev.target.value })} />
          </label>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={disabilitato} onClick={() => cambia({ esiti: quiz.esiti.filter((_, j) => j !== i) })} aria-label={`Togli il premio ${i + 1}`} />
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un premio"
        disabled={disabilitato || quiz.esiti.length >= LIMITI_QUIZ.esiti} onClick={() => cambia({ esiti: [...quiz.esiti, { esito: '', premio: '' }] })} />
      <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli la guida del quiz"
        disabled={disabilitato} onClick={() => onCambia({ quiz_json: null, _giorniQuiz: '' })} />
    </fieldset>
  );
}
