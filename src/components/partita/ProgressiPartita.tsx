// ============================================================
// ProgressiPartita — quel che la partita calcola da sola, e quel che resta da segnare a mano
// ============================================================
//
// **Calcolati dalla partita** (sola lettura): gli eventi «entra in squadra» — letti dalla scheda
// Squadra, tre stati come i semafori: in squadra, dichiarato fuori, non ancora segnato — il grado
// cliente dei negozi che ce l'hanno (dalla spesa segnata negli acquisti) e i contatori (libri
// letti, film e videogiochi completati). **Da segnare**: gli eventi di storia che nessun dato
// deduce (la mansarda pulita, il primo strumento), le attività che si contano per volte svolte,
// i punti dei negozi con programma manuale. Le condizioni leggono da qui.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgressiPartita, impostaAttivitaSvolta, impostaEventoStoria, impostaPuntiNegozio, type ProgressiPartita as Progressi } from '../../services/api/condizioni';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { PageState } from '../shared/PageState';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_TIPO_ATTIVITA } from '../../../shared/attivita';
import { formattaYen } from '../../utils/letture';

function messaggio(err: unknown): string { return err instanceof Error ? err.message : String(err); }

/** Il pallino a tre stati: verde (sì), rosso (no), grigio (non segnato). */
function Pallino({ stato }: { stato: boolean | null }) {
  const colore = stato === true ? 'bg-success' : stato === false ? 'bg-error' : 'bg-text-muted';
  const nome = stato === true ? 'sì' : stato === false ? 'no' : 'non segnato';
  return <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${colore}`} role="img" aria-label={nome} />;
}

export function ProgressiPartita({ partitaId }: { partitaId: number }) {
  const dati = useCarica(() => getProgressiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [stato, setStato] = useState<Progressi | null>(null);
  const p = stato ?? dati.dati;

  const salva = (chiave: string, azione: () => Promise<Progressi>) => {
    setOccupato(chiave);
    return azione().then((nuovo) => { setStato(nuovo); useSuggerimentiStore.getState().invalida(); }).catch((e) => notifica('error', messaggio(e))).finally(() => setOccupato(null));
  };
  const calcolati = p?.eventi.filter((e) => e.origine === 'calcolato') ?? [];
  const manuali = p?.eventi.filter((e) => e.origine === 'manuale') ?? [];

  return (
    <PageState isLoading={dati.caricamento && !p} error={dati.errore} onRetry={dati.ricarica}>
      {p && (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2" aria-labelledby="progressi-calcolati">
            <h2 id="progressi-calcolati" className="m-0 font-display text-[17px] uppercase leading-none">Calcolati dalla partita</h2>
            <p className="m-0 text-[12px] text-text-muted">Sola lettura: l’app li ricava da quel che hai già segnato altrove. Le condizioni leggono da qui.</p>
            <div className="progressi-partita">
              <section className="card flex flex-col gap-2" aria-labelledby="progressi-squadra">
                <h3 id="progressi-squadra" className="m-0 text-[15px]">Eventi «entra in squadra»</h3>
                <p className="m-0 text-[12px] text-text-muted">Dalla scheda <Link to="/partita?scheda=squadra" className="text-primary">Denaro e squadra</Link>: un Ladro in squadra fa avvenire il suo evento.</p>
                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                  {calcolati.map((e) => (
                    <li key={e.chiave} className="progressi-partita__riga">
                      <Pallino stato={e.avvenuto} />
                      <span className="min-w-0 flex-1">{e.nome}</span>
                      <Link to="/partita?scheda=squadra" className="touch inline-flex items-center text-[11px] text-text-muted">{e.avvenuto === true ? `${e.membroNome} in squadra` : e.avvenuto === false ? `${e.membroNome} non in squadra` : `${e.membroNome}: non segnato`}</Link>
                    </li>
                  ))}
                </ul>
              </section>
              {p.rangoCliente.length > 0 && (
                <section className="card flex flex-col gap-2" aria-labelledby="progressi-rango">
                  <h3 id="progressi-rango" className="m-0 text-[15px]">Grado cliente</h3>
                  <p className="m-0 text-[12px] text-text-muted">Dalla spesa segnata negli acquisti del negozio.</p>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1">
                    {p.rangoCliente.map((n) => (
                      <li key={n.negozio} className="progressi-partita__riga">
                        <span className="min-w-0 flex-1">
                          <span className="block"><Link to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="touch inline-flex items-center">{n.nome}</Link></span>
                          <span className="block text-[11px] text-text-muted">spesi {formattaYen(n.spesa)}{n.prossimo ? ` · ${n.prossimo.nome} da ${formattaYen(n.prossimo.spesa)}` : ' · grado massimo'}</span>
                        </span>
                        <span className="chip chip--attivo">{n.rango.nome}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="card flex flex-col gap-2" aria-labelledby="progressi-contatori">
                <h3 id="progressi-contatori" className="m-0 text-[15px]">Contatori</h3>
                <p className="m-0 text-[12px] text-text-muted">Da <Link to="/partita?scheda=letture" className="text-primary">Letture e giochi</Link>.</p>
                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                  {p.contatori.map((c) => (
                    <li key={c.chiave} className="progressi-partita__riga">
                      <span className="min-w-0 flex-1">{c.nome}</span>
                      <span className="font-display text-[17px] tabular-nums">{c.valore}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>

          <section className="flex flex-col gap-2" aria-labelledby="progressi-da-segnare">
            <h2 id="progressi-da-segnare" className="m-0 font-display text-[17px] uppercase leading-none">Da segnare</h2>
            <p className="m-0 text-[12px] text-text-muted">Quel che nessun altro dato della partita sa dedurre.</p>
            <div className="progressi-partita">
              <section className="card flex flex-col gap-2" aria-labelledby="progressi-eventi">
                <h3 id="progressi-eventi" className="m-0 text-[15px]">Eventi di storia</h3>
                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                  {manuali.map((e) => (
                    <li key={e.chiave}>
                      <label className="progressi-partita__riga touch">
                        <input type="checkbox" className="w-5 h-5" checked={e.avvenuto === true} disabled={occupato === e.chiave} onChange={(ev) => void salva(e.chiave, () => impostaEventoStoria(partitaId, e.chiave, ev.target.checked))} />
                        <span className="min-w-0 flex-1">{e.nome}</span>
                        <span className={`text-[11px] ${e.avvenuto ? 'text-success' : 'text-text-muted'}`}>{e.avvenuto ? 'avvenuto' : 'non ancora'}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card flex flex-col gap-2" aria-labelledby="progressi-attivita">
                <h3 id="progressi-attivita" className="m-0 text-[15px]">Attività svolte</h3>
                <p className="m-0 text-[12px] text-text-muted">Quante volte l’hai fatta: le condizioni «svolta almeno n volte» leggono da qui. I videogiochi si contano per round in Letture e giochi.</p>
                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                  {p.attivita.map((a) => (
                    <li key={a.chiave} className="progressi-partita__riga">
                      <span className="min-w-0 flex-1">
                        <span className="block">{a.nome}</span>
                        <span className="block text-[11px] text-text-muted">{(NOME_TIPO_ATTIVITA as Record<string, string>)[a.tipo] ?? a.tipo}</span>
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

              {p.puntiNegozio.length > 0 && (
                <section className="card flex flex-col gap-2" aria-labelledby="progressi-punti">
                  <h3 id="progressi-punti" className="m-0 text-[15px]">Punti negozio</h3>
                  <p className="m-0 text-[12px] text-text-muted">I punti che il negozio ti ha dato, a passi di dieci: vengono dalle vendite, non dalla spesa.</p>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1">
                    {p.puntiNegozio.map((n) => (
                      <li key={n.negozio} className="progressi-partita__riga">
                        <span className="min-w-0 flex-1">
                          <span className="block"><Link to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="touch inline-flex items-center">{n.nome}</Link></span>
                          <span className="block text-[11px] text-text-muted">{n.programma} · {n.unita}</span>
                        </span>
                        <span className="condizione-numero" role="group" aria-label={`Punti: ${n.nome}`}>
                          <button type="button" className="touch" aria-label={`${n.nome}: dieci punti in meno`} disabled={occupato === n.negozio || n.punti <= 0} onClick={() => void salva(n.negozio, () => impostaPuntiNegozio(partitaId, n.negozio, Math.max(0, n.punti - 10)))}><IconaAzione chiave="meno" dimensione={16} /></button>
                          <span className="condizione-numero__valore">{n.punti}</span>
                          <button type="button" className="touch" aria-label={`${n.nome}: dieci punti in più`} disabled={occupato === n.negozio || n.punti >= 999990} onClick={() => void salva(n.negozio, () => impostaPuntiNegozio(partitaId, n.negozio, n.punti + 10))}><IconaAzione chiave="piu" dimensione={16} /></button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </section>
        </div>
      )}
    </PageState>
  );
}
