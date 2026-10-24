// ============================================================
// DotiSociali — stella delle cinque Doti + schede compatte con note (+1/+2/+3), modificatori, rango e punti mancanti
// ============================================================
//
// Nel gioco ogni azione mostra 1–3 note: 1 nota = 2 punti, 2 note = 3, 3 note = 5
// (7 con libri a resa maggiorata); «Anima da cineasta» (Royal) alza di uno scalino film e DVD;
// la Fortuna di Chihaya (stato della partita: la Dote scelta, per il resto del giorno) moltiplica ×1,5 (per difetto), per ultima.
// La conversione la fa il backend (`note`, `libro`, `cinema`; la Fortuna la legge dallo stato della partita).
// La stella (Fase 11.2) mostra l'avanzamento continuo di ogni dote: ranghi completati
// più la quota verso il prossimo; toccare un vertice porta alla scheda della dote.
// ============================================================

import { useState, type ReactNode } from 'react';
import { aggiornaDote, getDoti, getFortuna, impostaFortuna } from '../../services/api';
import { moltiplicaFortuna } from '../../../shared/fortuna';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { AssetImg } from '../shared/AssetImg';
import { StellaCinque } from '../shared/StellaCinque';
import { avanzamentoDote, quotaVersoProssimoRango } from '../../utils/doti';
import type { DoteSocialePartitaDto, ModificaDote } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { useSuggerimenti } from '../../stores/suggerimentiStore';
import { classiSuggerito } from '../../utils/suggerimenti';
import { TargaSuggerito } from '../shared/Suggerito';
import { ModificaGuida } from '../guida/ModificaGuida';

interface Props {
  partitaId: number;
}

const PUNTI_SCALINO = [2, 3, 5, 7] as const;

/** Stessa regola del server (`puntiDaNote`): scalini 2/3/5/7, «Anima da cineasta» +1 scalino, poi ×1,5 per difetto. */
function puntiAnteprima(note: 1 | 2 | 3, libro: boolean, fortuna: boolean, cinema = false): number {
  let scalino = note === 3 && libro ? 4 : note;
  if (cinema) scalino = Math.min(4, scalino + 1);
  const base = PUNTI_SCALINO[scalino - 1];
  return fortuna ? moltiplicaFortuna(base) : base;
}

/** Stella delle Doti con schede compatte: incremento a note, rango attuale e distanza dal rango successivo. */
export function DotiSociali({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getDoti(partitaId), [partitaId]);
  const [occupata, setOccupata] = useState<string | null>(null);
  /** Ultimo esito (totale della Dote, Fortuna accesa o spenta), letto dai lettori di schermo dalla regione `status`: il numero
   *  grande cambia, ma da solo non si annuncia. Il contatore fa rileggere anche un testo uguale al precedente. */
  const [annuncio, setAnnuncio] = useState({ testo: '', n: 0 });
  const annuncia = (testo: string) => setAnnuncio((a) => ({ testo, n: a.n + 1 }));
  // la Fortuna è lo stato della partita (la Dote e il giorno), non un'impostazione di questa schermata
  const fortuna = useCarica(() => getFortuna(partitaId), [partitaId]);
  const [scegliFortuna, setScegliFortuna] = useState(false);
  const [libro, setLibro] = useState(false);
  const [cinema, setCinema] = useState(false);
  const [selezionata, setSelezionata] = useState<string | null>(null);
  const sugg = useSuggerimenti();

  /** Invia la modifica di una Dote, ne sostituisce i dati in elenco e annuncia l'eventuale nuovo rango. */
  const modifica = async (chiave: string, mod: ModificaDote) => {
    if (!dati) return;
    const prima = dati.find((d) => d.chiave === chiave);
    // i pulsanti restano abilitati durante l'attesa (`aria-disabled`, non `disabled`: un pulsante disabilitato perde il fuoco e
    // chi usa tastiera o lettore di schermo ripartirebbe dall'inizio della pagina a ogni nota): il doppio tocco si ferma qui
    if (occupata === chiave || ((mod.delta ?? 0) < 0 && prima?.punti === 0)) return;
    setOccupata(chiave);
    try {
      const agg = await aggiornaDote(partitaId, chiave, mod);
      // dai dati correnti (forma funzionale): dopo l'`await` `dati` è quello del render, e un'altra Dote segnata nel frattempo
      // tornerebbe indietro
      imposta((correnti) => correnti.map((d) => (d.chiave === chiave ? agg : d)));
      const punti = (n: number) => `${n} ${n === 1 ? 'punto' : 'punti'}`;
      annuncia(`${agg.nome}: ${punti(agg.punti)}${agg.mancanti !== null ? `; al rango ${agg.rango + 1} ${agg.mancanti === 1 ? 'manca' : 'mancano'} ${punti(agg.mancanti)}` : ', rango massimo'}.`);
      if (prima && agg.rango > prima.rango) notifica('success', `${agg.nome}: nuovo rango ${agg.rango} — ${agg.nomeRango}!`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupata(null);
    }
  };

  /** Accende la Fortuna sulla Dote scelta, o la spegne (`null`): lo stato resta sul server e lascia un evento nello storico. */
  const cambiaFortuna = async (dote: string | null) => {
    if (occupata === 'fortuna') return;
    setOccupata('fortuna');
    try {
      const nuova = await impostaFortuna(partitaId, dote);
      fortuna.imposta(nuova);
      // la scelta della Dote si chiude: il fuoco, che stava su uno dei suoi pulsanti, torna sul pulsante della Fortuna
      if (scegliFortuna) document.getElementById(`fortuna-${partitaId}`)?.focus();
      setScegliFortuna(false);
      annuncia(dote ? `Fortuna accesa su ${dati?.find((d) => d.chiave === dote)?.nome ?? dote}, per oggi.` : 'Fortuna spenta.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Non sono riuscito a cambiare la Fortuna.');
    } finally {
      setOccupata(null);
    }
  };
  const fortunaAttiva = fortuna.dati?.attiva === true ? fortuna.dati.dote : null;

  /** Dal vertice della stella: seleziona la Dote e ne porta in vista la scheda. */
  const vaiAllaDote = (chiave: string) => {
    setSelezionata(chiave);
    document.getElementById(`dote-${chiave}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <>
      {/* fuori da PageState: la regione c'è già prima dei dati, e una regione live nata insieme al testo spesso non si legge */}
      <p className="sr-only" role="status" aria-live="polite"><span key={annuncio.n}>{annuncio.testo}</span></p>
      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        <div className="grid gap-3 items-start grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] lg:grid-cols-[minmax(400px,540px)_minmax(0,680px)] lg:justify-center md:h-full md:min-h-0 md:items-stretch">
          <section className="card flex flex-col items-center justify-center gap-2 px-4 pt-3 pb-3 overflow-visible min-w-0 md:min-h-0" aria-label="Stella delle Doti">
            <div className="w-full flex justify-center px-[12%]">
              <StellaCinque
                assi={(dati ?? []).map((d) => ({ chiave: d.chiave, etichetta: d.nome, valore: avanzamentoDote(d), badge: `doti/${d.chiave}`, badgeSotto: `ui/rango-${d.rango}`, testo: `Rango ${d.rango}` }))}
                dimensione={540}
                badgeAltezza={84}
                etichettaAria="Stella delle Doti sociali"
                onScegli={vaiAllaDote}
                selezionato={selezionata}
              />
            </div>
            <div className="w-full flex flex-col items-center gap-1.5" role="group" aria-label="Modificatori delle note">
              <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-muted">Modificatori · valgono per tutte le note</span>
              <div className="flex flex-wrap justify-center gap-2">
                <PulsanteVisivo id={`fortuna-${partitaId}`} disposizione="colonna" attivo={fortunaAttiva !== null || scegliFortuna} disabled={!fortuna.dati} aria-disabled={occupata === 'fortuna' || undefined} icona={<IconaAzione chiave="fortuna" dimensione={48} />} titolo="Fortuna ×1,5" dettaglio={fortunaAttiva ? `su ${dati?.find((d) => d.chiave === fortunaAttiva)?.nome ?? fortunaAttiva}, per oggi` : 'lettura di Chihaya'} onClick={() => { if (fortunaAttiva) void cambiaFortuna(null); else setScegliFortuna((v) => !v); }} aria-label="Fortuna ×1,5: lettura della fortuna di Chihaya" title="Lettura della fortuna di Chihaya: i punti della Dote scelta valgono ×1,5 (per difetto) per il resto del giorno" />
                <PulsanteVisivo disposizione="colonna" attivo={libro} icona={<IconaAzione chiave="libro" dimensione={48} />} titolo="Libro" dettaglio="3 note = 7 punti" onClick={() => setLibro((v) => !v)} aria-label="Libro: 3 note valgono 7 punti" title="Libri a resa maggiorata: 3 note valgono 7 punti" />
                <PulsanteVisivo disposizione="colonna" attivo={cinema} icona={<IconaAzione chiave="esegui" dimensione={48} />} titolo="Anima da cineasta" dettaglio="film e DVD +1 scalino" onClick={() => setCinema((v) => !v)} aria-label="Anima da cineasta: film e DVD salgono di uno scalino (2→3, 3→5, 5→7)" title="Libro «Anima da cineasta» (Royal): guardando film e DVD i punti salgono di uno scalino, prima del ×1,5 di Chihaya" />
              </div>
            </div>
            {scegliFortuna && <div className="flex flex-col items-center gap-1.5" role="group" aria-label="Dote della Fortuna">
              <span className="text-[12px] text-text-secondary">Su quale Dote hai ricevuto la Fortuna? Vale per il resto di oggi.</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {(dati ?? []).map((d) => <button key={d.chiave} type="button" className="btn btn-secondary btn-sm touch" aria-disabled={occupata === 'fortuna' || undefined} onClick={() => void cambiaFortuna(d.chiave)}>{d.nome}</button>)}
              </div>
            </div>}
            {fortuna.dati?.scaduta && !scegliFortuna && <p className="m-0 text-[12px] text-text-muted text-center">La Fortuna di un altro giorno è finita: se ne hai una nuova, riaccendila.</p>}
            <p className="m-0 text-[12px] text-text-muted text-center">Tocca un vertice per andare alla dote.</p>
          </section>
          <ul className="m-0 p-0 list-none flex flex-col gap-2 min-w-0 md:min-h-0 md:area-scorrevole md:p-1">
            {dati?.map((d) => (
              <li key={d.chiave} id={`dote-${d.chiave}`} className={`card flex flex-col gap-1.5 py-2 transition-colors ${selezionata === d.chiave ? 'border-primary' : ''} ${classiSuggerito(sugg.evidenziato('doti', d.chiave))}`}>
                <CartaDote
                  dote={d}
                  suggerita={sugg.evidenziato('doti', d.chiave) ? sugg.motivo('doti', d.chiave) : null}
                  onModificata={() => void ricarica()}
                  azioni={(
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
                      {([1, 2, 3] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="btn btn-primary btn-nota min-w-[64px] lg:min-w-[54px] lg:px-2"
                          aria-disabled={occupata === d.chiave || undefined}
                          onClick={() => void modifica(d.chiave, { note: n, libro, cinema })}
                          aria-label={`${d.nome}: aggiungi ${n} ${n === 1 ? 'nota' : 'note'} (${puntiAnteprima(n, libro, fortunaAttiva === d.chiave, cinema)} punti)`}
                        >
                          <span aria-hidden="true">{'♪'.repeat(n)}</span>
                          <span className="text-[13px] opacity-90">+{puntiAnteprima(n, libro, fortunaAttiva === d.chiave, cinema)}</span>
                        </button>
                      ))}
                      <button type="button" className="btn btn-secondary btn-nota min-w-[46px] lg:min-w-[44px] lg:px-2" aria-disabled={occupata === d.chiave || d.punti === 0 || undefined} onClick={() => void modifica(d.chiave, { delta: -1 })} aria-label={`${d.nome}: togli un punto`}>−1</button>
                      <button type="button" className="btn btn-secondary btn-nota min-w-[46px] lg:min-w-[44px] lg:px-2" aria-disabled={occupata === d.chiave || undefined} onClick={() => void modifica(d.chiave, { delta: 1 })} aria-label={`${d.nome}: aggiungi un punto`}>+1</button>
                    </div>
                  )}
                />
              </li>
            ))}
          </ul>
        </div>
      </PageState>
    </>
  );
}

/** Intestazione compatta della dote: targhetta, rango con titolo, punti, barra e — sulla stessa riga — i pulsanti delle note. */
function CartaDote({ dote: d, azioni, suggerita, onModificata }: { dote: DoteSocialePartitaDto; azioni?: ReactNode; suggerita?: string | null; onModificata: () => void }) {
  const quota = Math.round(quotaVersoProssimoRango(d) * 100);
  const prossimo = d.ranghi.find((r) => r.rango === d.rango + 1);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <AssetImg nome={`doti/${d.chiave}`} alt={d.nome} className="h-7 lg:h-12 w-auto object-contain" fallback={<span className="font-display uppercase text-[20px] leading-none">{d.nome}</span>} />
        <span className="flex items-center gap-1.5">
          <span className="sr-only">Rango {d.rango} · {d.nomeRango}</span>
          <span className="font-display uppercase text-[20px] leading-none" aria-hidden="true">Rango</span>
          <AssetImg nome={`ui/rango-${d.rango}`} alt="" decorativa className="h-9 w-auto object-contain" fallback={<span className="font-display text-[20px] leading-none" aria-hidden="true">{d.rango}</span>} />
          <span className="font-display uppercase text-[20px] leading-none" aria-hidden="true">{d.nomeRango}</span>
        </span>
        {suggerita !== null && suggerita !== undefined && <TargaSuggerito motivo={suggerita} compatta />}
        {/* L11 · B11 (R11-15/12): il nome della Dote, i nomi dei cinque ranghi e le loro soglie si correggono qui e si rimettono come la guida */}
        <ModificaGuida tipo="dote" chiave={d.chiave} cosa={`la Dote «${d.nome}» e i suoi ranghi`} soloIcona onSalvato={onModificata} />
        <span className="ml-auto font-display text-[26px] leading-none tabular-nums">{d.punti}<span className="text-[12px] font-sans text-text-muted"> punti</span></span>
      </div>
      <div className="h-2 bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.sogliaProssima === null ? 100 : quota} aria-label={`Progresso verso il rango ${d.rango + 1}`}>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${d.sogliaProssima === null ? 100 : quota}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13px] text-text-secondary min-w-0">
          {d.mancanti !== null && prossimo
            ? <>Mancano <strong className="text-text">{d.mancanti}</strong> punti al rango {prossimo.rango} · {prossimo.nome} ({d.sogliaProssima})</>
            : <>Rango massimo raggiunto.</>}
        </div>
        {azioni}
      </div>
    </div>
  );
}
