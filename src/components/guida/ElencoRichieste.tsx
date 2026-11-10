// ============================================================
// ElencoRichieste — le Richieste di un'area di un dedalo dei Memento, con un comando a tre stati (2026-10-12)
// ============================================================
//
// Progetto approvato dall'utente: «un comando a tre stati (— / Accettata / Fatta) al posto dei tre pulsanti di oggi». «Fatta» è
// lo stato `completata` della Richiesta nella partita, «—» nessuno stato. Correggere una Richiesta, aggiungerne una e spostarla
// in un'altra area (o lasciarla da collocare) si fa solo in «Modifica la guida» (`ModuloRichiesta`, lo stesso della pagina delle
// Richieste). Lo stesso elenco serve alle Richieste da collocare, che non contano finché non stanno in un'area.
// L10-05: un solo punto per spostare una Richiesta, la sezione «Dove» del modulo (dedalo e area, anche da /guida/richieste e per una
// Richiesta nuova): il selettore dell'area che stava su ogni riga, e la sua rotta, non ci sono più. «Modifica» apre il modulo.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { impostaStatoRichiesta } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { SegnoStato } from '../shared/SegnoStato';
import type { RichiestaDelDedaloDto, StatoRichiesta } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** I tre stati del comando, nell'ordine: nessuno, accettata, fatta. */
const STATI: ReadonlyArray<{ stato: StatoRichiesta | null; etichetta: string; titolo: string }> = [
  { stato: null, etichetta: '—', titolo: 'Nessuno stato' },
  { stato: 'accettata', etichetta: 'Accettata', titolo: 'Accettata' },
  { stato: 'completata', etichetta: 'Fatta', titolo: 'Fatta (completata)' },
];

interface Props {
  richieste: RichiestaDelDedaloDto[];
  /** Il dedalo: il nome della Richiesta porta alla pagina delle Richieste filtrata su di lui. */
  dedalo: string;
  partitaId: number | null;
  modifica: boolean;
  /** Lo stato di una Richiesta nella partita è cambiato (dalla risposta del server). */
  onRichiesta: (chiave: string, stato: StatoRichiesta | null) => void;
  /** Apre il modulo della Richiesta (correzione, area e dedalo in «Dove»). */
  onModifica: (chiave: string) => void;
}

/** L'elenco: per ogni Richiesta il nome, il comando a tre stati (con una partita) e, in «Modifica la guida», «Modifica». */
export function ElencoRichieste({ richieste, dedalo, partitaId, modifica: modificaRichiesta, onRichiesta, onModifica }: Props) {
  // L12 (passo 8): nel rilascio (sola lettura) le Richieste non si correggono; lo stato (partita) si cambia come sempre
  const modifica = !IN_RILASCIO && modificaRichiesta;
  const [occupata, setOccupata] = useState<string | null>(null);
  /** Esegue un'operazione su una Richiesta tenendola occupata; l'errore va in notifica. */
  const esegui = async (k: string, fai: () => Promise<unknown>, errore: string) => {
    setOccupata(k);
    try { await fai(); } catch (err) { notifica('error', err instanceof Error ? err.message : errore); } finally { setOccupata(null); }
  };
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">
      {richieste.map((r) => {
        // O7-1: «Fatta» spento quando oggi non si può completare (il server la rifiuterebbe con 409): il perché sta nel titolo e nella descrizione
        const motivi = r.stato !== 'completata' && r.motiviCompletamento?.length ? r.motiviCompletamento : null;
        const spento = (s: StatoRichiesta | null) => s === 'completata' && motivi !== null;
        const idMotivi = `fatta-${r.chiave}`;
        return (
        <li key={r.chiave} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 testo-13">
          <Link to={`/guida/richieste?dedalo=${encodeURIComponent(dedalo)}`} className="touch inline-flex min-w-[10rem] flex-1 items-center">{/* D15: Richiesta «Fatta» = spunta rossa a sinistra e nome barrato in grigio (lo stato a parole sta nel comando accanto) */}<SegnoStato stato={r.stato === 'completata' ? 'fatto' : null} className="mr-1.5" /><span className={r.stato === 'completata' ? 'stato-fatto' : ''}>{r.nome}</span></Link>
          {partitaId && motivi && <span id={idMotivi} className="sr-only">Si completa dopo: {motivi.join('; ')}</span>}
          {partitaId && (
            // da tastiera come vuole il ruolo: Tab entra sullo stato scelto, le frecce scelgono il precedente o il seguente
            // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- il fuoco va sui radio dentro il gruppo, non sul gruppo
            <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-border" role="radiogroup" aria-label={`Stato di «${r.nome}»`}
              onKeyDown={(e) => {
                const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                if (!passo || occupata === r.chiave) return;
                e.preventDefault();
                const i = STATI.findIndex((s) => s.stato === (r.stato ?? null));
                // le frecce saltano lo stato spento, come vuole il ruolo
                let j = (i + passo + STATI.length) % STATI.length;
                if (spento(STATI[j].stato)) j = (j + passo + STATI.length) % STATI.length;
                if (j === i) return;
                const prossimo = STATI[j];
                (e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')[STATI.indexOf(prossimo)])?.focus();
                void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, prossimo.stato)).stato), 'Stato non aggiornato.');
              }}>
              {STATI.map((s) => {
                const scelto = (r.stato ?? null) === s.stato;
                return (
                  <button key={s.etichetta} type="button" role="radio" aria-checked={scelto} tabIndex={scelto ? 0 : -1}
                    title={spento(s.stato) && motivi ? `Si completa dopo: ${motivi.join('; ')}` : s.titolo} disabled={occupata === r.chiave || spento(s.stato)}
                    aria-describedby={spento(s.stato) ? idMotivi : undefined}
                    className={`touch min-w-11 border-l border-border px-2.5 testo-12 first:border-l-0 ${spento(s.stato) ? 'cursor-not-allowed opacity-50' : ''} ${scelto ? (s.stato === 'completata' ? 'bg-success/25 font-semibold text-text' : s.stato ? 'bg-primary/25 font-semibold text-text' : 'bg-white/10 text-text') : 'text-text-muted hover:bg-white/5 hover:text-text'}`}
                    onClick={() => { if (!scelto) void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, s.stato)).stato), 'Stato non aggiornato.'); }}>
                    {s.etichetta}
                  </button>
                );
              })}
            </span>
          )}
          {!partitaId && r.stato === null && <span className="testo-12 text-text-muted">da fare</span>}
          {modifica && <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica la Richiesta «${r.nome}»`} onClick={() => onModifica(r.chiave)} />}
        </li>
        );
      })}
    </ul>
  );
}
