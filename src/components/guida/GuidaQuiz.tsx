// ============================================================
// GuidaQuiz — la guida del quiz di un'attività (il quiz dei codici a barre del Triple Seven) e il pulsante che la apre
// ============================================================
//
// Richiesta dell'utente (2026-10-17): «quando è previsto lavoro al Convenience Store deve essere
// consultabile la guida (in italiano)». La guida dice in quali giorni c'è il quiz, come funziona,
// la domanda, la risposta per ogni elemento (cercabile per tutti e due i nomi: quello della guida
// italiana e quello inglese) e i premi per esito. Si apre in una finestra dal cartellino della voce
// del diario che registra il turno, dalla carta del lavoro in «Attività» e dalla pagina del negozio
// (scelta dell'utente: «Card + Attività + Negozio»). La nota di un elemento (l'abbinamento incerto
// dei nomi) resta sempre visibile, non solo al passaggio del mouse.
// ============================================================

import { useMemo, useState } from 'react';
import { Modal } from '../shared/Modal';
import { CampoRicerca } from '../shared/CampoRicerca';
import { corrispondeRicerca } from '../../utils/testo';
import { giorniDelQuizTesto, type QuizAttivita } from '../../../shared/quizAttivita';
import type { QuizVoceDto } from '../../types';

/** Da quanti elementi in su compare la ricerca: con pochi si leggono a colpo d'occhio. */
const SOGLIA_RICERCA = 7;

/**
 * La guida di un quiz: quando c'è (con l'avviso se è oggi), come funziona, la domanda, gli elementi con la risposta (filtrabili
 * per nome, altro nome o risposta) e i premi per esito.
 */
export function GuidaQuiz({ quiz, oggi = false }: { quiz: QuizAttivita; oggi?: boolean }) {
  const [cerca, setCerca] = useState('');
  const visibili = useMemo(() => quiz.voci.filter((v) => corrispondeRicerca(cerca, v.oggetto, v.altroNome, v.risposta)), [quiz.voci, cerca]);
  const giorni = giorniDelQuizTesto(quiz.giorni);
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      {oggi && <p className="m-0 chip chip--oro self-start text-[12px]">Oggi c’è il quiz</p>}
      {(giorni || quiz.spiegazione) && (
        <p className="m-0 text-text-secondary">
          {giorni && <><strong className="text-text">Quando:</strong> {giorni}. </>}
          {quiz.spiegazione}
        </p>
      )}
      {quiz.domanda && <p className="m-0"><strong>Domanda:</strong> «{quiz.domanda}»</p>}
      {quiz.voci.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Risposte">
          {quiz.voci.length >= SOGLIA_RICERCA && <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca prodotto o risposta" />}
          {visibili.length === 0
            ? <p className="m-0 text-text-muted">Nessun elemento corrisponde a «{cerca}».</p>
            : (
              <ul className="m-0 flex list-none flex-col p-0">
                {visibili.map((v) => (
                  <li key={`${v.oggetto}|${v.risposta}`} className="grid grid-cols-1 gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-b-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <span className="flex min-w-0 flex-col">
                      <strong className="text-text">{v.oggetto}</strong>
                      {v.altroNome && <span className="text-[12px] text-text-muted">anche «{v.altroNome}»</span>}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-text">{v.risposta}</span>
                      {v.nota && <span className="text-[12px] text-warning">{v.nota}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}
      {quiz.esiti.length > 0 && (
        <section className="flex flex-col gap-1" aria-label="Premi">
          <strong>Premi</strong>
          <ul className="m-0 flex flex-col gap-0.5 pl-4">
            {quiz.esiti.map((e, i) => <li key={i}><span className="text-text-secondary">{e.esito}:</span> {e.premio}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Il cartellino che apre la guida del quiz di un'attività in una finestra: «Guida del quiz», in oro con «Oggi c'è il quiz»
 * quando il giorno lo prevede.
 */
export function PulsanteGuidaQuiz({ voce }: { voce: QuizVoceDto }) {
  const [aperta, setAperta] = useState(false);
  return (
    <>
      <button type="button" className={`chip touch text-[11px] ${voce.oggi ? 'chip--oro' : 'chip--attivo'}`} onClick={() => setAperta(true)}
        aria-label={`Guida del quiz: ${voce.nome}${voce.oggi ? ' (oggi c’è il quiz)' : ''}`}>
        {voce.oggi ? 'Oggi c’è il quiz · Guida' : 'Guida del quiz'}
      </button>
      {aperta && (
        <Modal titolo={`Guida del quiz — ${voce.nome}`} aperta onChiudi={() => setAperta(false)} larga>
          <GuidaQuiz quiz={voce.quiz} oggi={voce.oggi} />
        </Modal>
      )}
    </>
  );
}
