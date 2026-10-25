// ============================================================
// ElencoRichieste — le Richieste di un'area di un dedalo dei Memento, con un comando a tre stati (2026-10-12)
// ============================================================
//
// Progetto approvato dall'utente: «un comando a tre stati (— / Accettata / Fatta) al posto dei tre pulsanti di oggi». «Fatta» è
// lo stato `completata` della Richiesta nella partita, «—» nessuno stato. Correggere una Richiesta, aggiungerne una e spostarla
// in un'altra area (o lasciarla da collocare) si fa solo in «Modifica la guida» (`ModuloRichiesta`, lo stesso della pagina delle
// Richieste). Lo stesso elenco serve alle Richieste da collocare, che non contano finché non stanno in un'area.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collocaRichiesta, impostaStatoRichiesta } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';
import type { RichiestaDelDedaloDto, StatoRichiesta } from '../../types';

/** La chiave che nel selettore dell'area di una Richiesta vale «nessuna area». */
export const DA_COLLOCARE = '';

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
  /** L'area in cui stanno (o `DA_COLLOCARE`). */
  area: string;
  /** Le aree del dedalo, per spostare una Richiesta (in «Modifica la guida»). */
  aree: ReadonlyArray<{ chiave: string; nome: string }>;
  partitaId: number | null;
  modifica: boolean;
  /** Lo stato di una Richiesta nella partita è cambiato (dalla risposta del server). */
  onRichiesta: (chiave: string, stato: StatoRichiesta | null) => void;
  /** Apre il modulo della Richiesta. */
  onModifica: (chiave: string) => void;
  /** Rilegge la scheda (Richiesta spostata). */
  onRicarica: () => Promise<void>;
}

/** L'elenco: per ogni Richiesta il nome, il comando a tre stati (con una partita) e, in «Modifica la guida», correzione e area. */
export function ElencoRichieste({ richieste, dedalo, area, aree, partitaId, modifica, onRichiesta, onModifica, onRicarica }: Props) {
  const [occupata, setOccupata] = useState<string | null>(null);
  const opzioniArea = [{ chiave: DA_COLLOCARE, nome: '— da collocare —' }, ...aree.map((a) => ({ chiave: a.chiave, nome: a.nome }))];
  /** Esegue un'operazione su una Richiesta tenendola occupata; l'errore va in notifica. */
  const esegui = async (k: string, fai: () => Promise<unknown>, errore: string) => {
    setOccupata(k);
    try { await fai(); } catch (err) { notifica('error', err instanceof Error ? err.message : errore); } finally { setOccupata(null); }
  };
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">
      {richieste.map((r) => (
        <li key={r.chiave} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 testo-13">
          <Link to={`/guida/richieste?dedalo=${encodeURIComponent(dedalo)}`} className={`touch inline-flex min-w-[10rem] flex-1 items-center ${r.stato === 'completata' ? 'text-text-muted line-through' : ''}`}>{r.nome}</Link>
          {partitaId && (
            // da tastiera come vuole il ruolo: Tab entra sullo stato scelto, le frecce scelgono il precedente o il seguente
            <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-border" role="radiogroup" aria-label={`Stato di «${r.nome}»`}
              onKeyDown={(e) => {
                const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                if (!passo || occupata === r.chiave) return;
                e.preventDefault();
                const i = STATI.findIndex((s) => s.stato === (r.stato ?? null));
                const prossimo = STATI[(i + passo + STATI.length) % STATI.length];
                (e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')[STATI.indexOf(prossimo)])?.focus();
                void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, prossimo.stato)).stato), 'Stato non aggiornato.');
              }}>
              {STATI.map((s) => {
                const scelto = (r.stato ?? null) === s.stato;
                return (
                  <button key={s.etichetta} type="button" role="radio" aria-checked={scelto} tabIndex={scelto ? 0 : -1} title={s.titolo} disabled={occupata === r.chiave}
                    className={`touch min-w-11 border-l border-border px-2.5 testo-12 first:border-l-0 ${scelto ? (s.stato === 'completata' ? 'bg-success/25 font-semibold text-text' : s.stato ? 'bg-primary/25 font-semibold text-text' : 'bg-white/10 text-text') : 'text-text-muted hover:bg-white/5 hover:text-text'}`}
                    onClick={() => { if (!scelto) void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, s.stato)).stato), 'Stato non aggiornato.'); }}>
                    {s.etichetta}
                  </button>
                );
              })}
            </span>
          )}
          {!partitaId && r.stato === null && <span className="testo-12 text-text-muted">da fare</span>}
          {modifica && (
            <span className="flex basis-full flex-wrap items-center gap-1.5">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica la Richiesta «${r.nome}»`} onClick={() => onModifica(r.chiave)} />
              <span className="min-w-[180px]">
                <Selettore compatto etichetta={`Area di ${r.nome}`} valore={area} opzioni={opzioniArea} disabilitato={occupata === r.chiave}
                  onCambia={(k) => { if (k !== area) void esegui(r.chiave, async () => { await collocaRichiesta(r.chiave, k || null); await onRicarica(); notifica('success', k ? `«${r.nome}» in ${aree.find((a) => a.chiave === k)?.nome ?? 'un’altra area'}.` : `«${r.nome}» è da collocare.`); }, 'Richiesta non spostata.'); }} />
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
