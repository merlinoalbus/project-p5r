// ============================================================
// ProgressiPartita — gli stati che la partita non può dedurre e che si segnano a mano
// ============================================================
//
// Tre cose, e sono le sole: **eventi di storia** avvenuti (la mansarda pulita, Makoto entrata in
// squadra), **attività svolte** e quante volte (biliardo, freccette, pesca), **punti negozio**.
// Tutto il resto — data, doti, ranghi, letture, acquisti, Palazzi, arco della storia — la partita
// lo sa già da altre schede, e qui non si ripete.
//
// Al posto di questo pannello c'era «Stati della partita» nelle Impostazioni: un nome libero e
// un numero libero, che nessuna condizione sapeva leggere. Tolto con la migrazione 064.
// ============================================================

import { useState } from 'react';
import { getProgressiPartita, impostaAttivitaSvolta, impostaEventoStoria, impostaPuntiNegozio, type ProgressiPartita as Progressi } from '../../services/api/condizioni';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { PageState } from '../shared/PageState';
import { IconaAzione } from '../shared/IconaAzione';

function messaggio(err: unknown): string { return err instanceof Error ? err.message : String(err); }

export function ProgressiPartita({ partitaId }: { partitaId: number }) {
  const dati = useCarica(() => getProgressiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [stato, setStato] = useState<Progressi | null>(null);
  const p = stato ?? dati.dati;

  const salva = (chiave: string, azione: () => Promise<Progressi>) => {
    setOccupato(chiave);
    return azione().then((nuovo) => { setStato(nuovo); useSuggerimentiStore.getState().invalida(); }).catch((e) => notifica('error', messaggio(e))).finally(() => setOccupato(null));
  };

  return (
    <PageState isLoading={dati.caricamento && !p} error={dati.errore} onRetry={dati.ricarica}>
      {p && (
        <div className="progressi-partita">
          <section className="card flex flex-col gap-2" aria-labelledby="progressi-eventi">
            <h3 id="progressi-eventi" className="m-0 text-[15px]">Eventi di storia</h3>
            <p className="m-0 text-[12px] text-text-muted">Le condizioni «evento avvenuto» leggono da qui.</p>
            <ul className="m-0 p-0 list-none flex flex-col gap-1">
              {p.eventi.map((e) => (
                <li key={e.chiave}>
                  <label className="progressi-partita__riga touch">
                    <input type="checkbox" className="w-5 h-5" checked={e.avvenuto} disabled={occupato === e.chiave} onChange={(ev) => void salva(e.chiave, () => impostaEventoStoria(partitaId, e.chiave, ev.target.checked))} />
                    <span className="min-w-0 flex-1">{e.nome}</span>
                    <span className={`text-[11px] ${e.avvenuto ? 'text-success' : 'text-text-muted'}`}>{e.avvenuto ? 'avvenuto' : 'non ancora'}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="card flex flex-col gap-2" aria-labelledby="progressi-attivita">
            <h3 id="progressi-attivita" className="m-0 text-[15px]">Attività svolte</h3>
            <p className="m-0 text-[12px] text-text-muted">Quante volte l'hai fatta: le condizioni «svolta almeno n volte» leggono da qui.</p>
            <ul className="m-0 p-0 list-none flex flex-col gap-1">
              {p.attivita.map((a) => (
                <li key={a.chiave} className="progressi-partita__riga">
                  <span className="min-w-0 flex-1">
                    <span className="block">{a.nome}</span>
                    <span className="block text-[11px] text-text-muted">{a.tipo}</span>
                  </span>
                  <span className="condizione-numero" role="group" aria-label={`Volte: ${a.nome}`}>
                    <button type="button" className="touch" aria-label={`${a.nome}: una volta in meno`} disabled={occupato === a.chiave || a.volte <= 0} onClick={() => void salva(a.chiave, () => impostaAttivitaSvolta(partitaId, a.chiave, a.volte - 1))}><IconaAzione chiave="meno" dimensione={16} /></button>
                    <span className="condizione-numero__valore">{a.volte}</span>
                    <button type="button" className="touch" aria-label={`${a.nome}: una volta in più`} disabled={occupato === a.chiave || a.volte >= 999} onClick={() => void salva(a.chiave, () => impostaAttivitaSvolta(partitaId, a.chiave, a.volte + 1))}><IconaAzione chiave="piu" dimensione={16} /></button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card flex flex-col gap-2" aria-labelledby="progressi-punti">
            <h3 id="progressi-punti" className="m-0 text-[15px]">Punti negozio</h3>
            <p className="m-0 text-[12px] text-text-muted">I punti fedeltà che un negozio ti ha dato, a passi di dieci. Il grado cliente di Tanaka invece si calcola dagli acquisti segnati.</p>
            <ul className="m-0 p-0 list-none flex flex-col gap-1">
              {p.puntiNegozio.map((n) => (
                <li key={n.negozio} className="progressi-partita__riga">
                  <span className="min-w-0 flex-1">{n.nome}</span>
                  <span className="condizione-numero" role="group" aria-label={`Punti: ${n.nome}`}>
                    <button type="button" className="touch" aria-label={`${n.nome}: dieci punti in meno`} disabled={occupato === n.negozio || n.punti <= 0} onClick={() => void salva(n.negozio, () => impostaPuntiNegozio(partitaId, n.negozio, Math.max(0, n.punti - 10)))}><IconaAzione chiave="meno" dimensione={16} /></button>
                    <span className="condizione-numero__valore">{n.punti}</span>
                    <button type="button" className="touch" aria-label={`${n.nome}: dieci punti in più`} disabled={occupato === n.negozio || n.punti >= 999990} onClick={() => void salva(n.negozio, () => impostaPuntiNegozio(partitaId, n.negozio, n.punti + 10))}><IconaAzione chiave="piu" dimensione={16} /></button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </PageState>
  );
}
