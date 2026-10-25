// ============================================================
// ProgressiPartita — le cose fatte in gioco che sbloccano Confidenti, negozi e attività
// ============================================================
//
// In testa lo scopo in una riga e un riepilogo a quattro tessere (Storia, Attività, Negozi, Pesca)
// che fanno anche da schede: se ne vede una alla volta, la scelta si ricorda (localStorage, con
// try/catch) e sta nell'indirizzo (`?sezione=`). Quello che l'app sa già si vede col cartellino
// «automatico» e il collegamento alla sua fonte; quello che non può sapere lo segna chi gioca:
// gli eventi di storia (prima quelli che restano da fare, gli avvenuti ripiegati), le volte di
// ogni attività (raggruppate per tipo) e i punti dei negozi a passi di dieci.
// ============================================================

import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getProgressiPartita, impostaAttivitaSvolta, impostaEventoStoria, impostaPuntiNegozio } from '../../services/api';
import type { ProgressiPartitaDto as Progressi } from '../../types';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { PageState } from '../shared/PageState';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_TIPO_ATTIVITA } from '../../../shared/attivita';
import { formattaYen } from '../../utils/letture';
import { avvisaDotiDaSegnare } from '../../utils/dotiDaSegnare';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { RegistroAcquistiPartita } from './RegistroAcquistiPartita';
import { RegistroPesca } from '../pesca/RegistroPesca';
import { ATTIVITA_PESCA, EVENTI_PESCA, SFIDA_PESCA } from '../../../shared/pesca';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';

type Sezione = 'storia' | 'attivita' | 'negozi' | 'pesca';
type Evento = Progressi['eventi'][number];

const SEZIONI: ReadonlyArray<{ k: Sezione; nome: string }> = [
  { k: 'storia', nome: 'Storia' }, { k: 'attivita', nome: 'Attività' }, { k: 'negozi', nome: 'Negozi' }, { k: 'pesca', nome: 'Pesca' },
];
const CHIAVE_MEMORIA = 'p5r:progressi:sezione';

const eSezione = (v: unknown): v is Sezione => SEZIONI.some((s) => s.k === v);
const leggiMemoria = (): Sezione | null => {
  try { const v = localStorage.getItem(CHIAVE_MEMORIA); return eSezione(v) ? v : null; } catch { return null; }
};
const scriviMemoria = (s: Sezione) => { try { localStorage.setItem(CHIAVE_MEMORIA, s); } catch { /* memoria non disponibile: la scelta vale per questa visita */ } };

/** Il testo di un errore: il messaggio se è un `Error`, altrimenti il valore convertito in stringa. */
function messaggio(err: unknown): string { return err instanceof Error ? err.message : String(err); }

const percorsoVoce = (v: { uid: string; giorno: string }) => `/guida/percorso/${v.giorno}?voce=${encodeURIComponent(v.uid)}`;

/** Il pallino a tre stati: verde (sì), rosso (no), grigio (non segnato). */
function Pallino({ stato }: { stato: boolean | null }) {
  const colore = stato === true ? 'bg-success' : stato === false ? 'bg-error' : 'bg-text-muted';
  const nome = stato === true ? 'sì' : stato === false ? 'no' : 'non segnato';
  return <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${colore}`} role="img" aria-label={nome} />;
}

/** Il cartellino di ciò che l'app ricava da sola. */
function Automatico() {
  return <span className="progressi-auto">automatico</span>;
}

/** Un evento di storia da segnare: casella grande, a che cosa serve e da quale voce del Diario viene. */
function RigaEvento({ e, occupato, onCambia }: { e: Evento; occupato: boolean; onCambia: (avvenuto: boolean) => void }) {
  return (
    <li>
      <label className="progressi-partita__riga progressi-partita__riga--evento touch">
        <input type="checkbox" className="progressi-casella" checked={e.manuale ?? e.avvenuto === true} aria-label={e.nome} disabled={occupato} onChange={(ev) => onCambia(ev.target.checked)} />
        <span className="min-w-0 flex-1">
          <span className="block">{e.nome}</span>
          {!!e.serveA?.length && <span className="block testo-12 text-primary-testo">Sblocca: {e.serveA.join(' · ')}</span>}
          {e.visiteDiario && <span className="block testo-12 text-text-secondary">Le visite dichiarate nel Diario contano da sole; la casella è un tuo segno in più. Si correggono dal Diario.</span>}
        </span>
        <span className={`shrink-0 testo-12 ${e.avvenuto ? 'text-success' : 'text-text-secondary'}`}>{e.avvenuto ? 'avvenuto' : 'non ancora'}</span>
      </label>
      {!!e.daVoci?.length && <div className="flex flex-wrap items-center gap-x-2 pl-9 testo-12 text-text-secondary">
        {e.daVoci.map((v) => <Link key={v.uid} className="touch text-primary-testo inline-flex items-center" to={percorsoVoce(v)}>Già nel Diario: voce del {v.giorno.slice(3)}/{v.giorno.slice(0, 2)} · {v.testo.length > 60 ? `${v.testo.slice(0, 60)}…` : v.testo}</Link>)}
      </div>}
      {!!e.visiteDiario?.length && <div className="flex flex-wrap items-center gap-x-2 pl-9 testo-12 text-text-secondary">
        <span>Già nel Diario:</span>
        {e.visiteDiario.map((v) => <Link key={v.uid} className="touch text-primary-testo inline-flex items-center" to={percorsoVoce(v)}>visita del {dataGiocoTesto(v.giorno)}</Link>)}
      </div>}
    </li>
  );
}

/** La scheda dei progressi della partita. Ogni risposta del server sostituisce tutti i progressi mostrati. */
export function ProgressiPartita(props: { partitaId: number }) {
  return <ProgressiPartitaNelContesto key={props.partitaId} {...props} />;
}
function ProgressiPartitaNelContesto({ partitaId }: { partitaId: number }) {
  const dati = useCarica(() => getProgressiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [stato, setStato] = useState<Progressi | null>(null);
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  // all'apertura: il collegamento alla pesca (#pesca) > l'indirizzo > l'ultima scelta > Storia
  const [sezione, setSezione] = useState<Sezione>(() => {
    const dallIndirizzo = params.get('sezione');
    return hash === '#pesca' ? 'pesca' : eSezione(dallIndirizzo) ? dallIndirizzo : leggiMemoria() ?? 'storia';
  });
  const p = stato ?? dati.dati;

  const scegli = (s: Sezione) => {
    setSezione(s);
    scriviMemoria(s);
    setParams((prec) => { const n = new URLSearchParams(prec); n.set('sezione', s); return n; }, { replace: true });
  };

  /** Esegue l'azione tenendo occupata la riga `chiave`; con la risposta sostituisce i progressi,
   * invalida i suggerimenti e ricorda le Doti da segnare; un errore diventa una notifica. */
  const salva = (chiave: string, azione: () => Promise<Progressi>) => {
    setOccupato(chiave);
    return azione().then((nuovo) => {
      setStato(nuovo);
      useSuggerimentiStore.getState().invalida();
      // un turno aggiunto (o tolto) dice le Doti che dà (o dava): da segnare a mano, l'app non le tocca
      avvisaDotiDaSegnare(nuovo.daSegnare);
    }).catch((e) => notifica('error', messaggio(e))).finally(() => setOccupato(null));
  };
  const rileggi = async () => { setStato(null); await dati.ricarica(); };

  const calcolati = p?.eventi.filter((e) => e.origine === 'calcolato') ?? [];
  const manuali = p?.eventi.filter((e) => e.origine === 'manuale' && !EVENTI_PESCA.some((chiave) => chiave === e.chiave)) ?? [];
  const daSegnare = manuali.filter((e) => e.avvenuto !== true);
  const avvenutiManuali = manuali.filter((e) => e.avvenuto === true);
  const eventiTot = manuali.length + calcolati.length;
  const eventiAvvenuti = avvenutiManuali.length + calcolati.filter((e) => e.avvenuto === true).length;
  const volteTotali = p?.attivita.reduce((s, a) => s + a.volte, 0) ?? 0;
  const visitePesca = p?.attivita.find((a) => a.chiave === ATTIVITA_PESCA)?.volte ?? 0;

  const tessere: Record<Sezione, { valore: string; dettaglio: string }> = {
    storia: { valore: `${eventiAvvenuti} di ${eventiTot}`, dettaglio: daSegnare.length ? `eventi avvenuti · ${daSegnare.length} da segnare` : 'eventi avvenuti · nulla da segnare' },
    attivita: { valore: `${volteTotali}`, dettaglio: volteTotali === 1 ? 'volta o turno registrato' : 'volte e turni registrati' },
    negozi: { valore: `${p?.rangoCliente.length ?? 0} ${p?.rangoCliente.length === 1 ? 'grado' : 'gradi'}`, dettaglio: `grado cliente · ${p?.puntiNegozio.length ?? 0} con punti` },
    pesca: { valore: `${visitePesca} ${visitePesca === 1 ? 'visita' : 'visite'}`, dettaglio: 'al laghetto di Ichigaya' },
  };

  // le attività raggruppate per tipo, nell'ordine alfabetico del nome del tipo
  const nomeTipo = (tipo: string) => (NOME_TIPO_ATTIVITA as Record<string, string>)[tipo] ?? tipo;
  const gruppiAttivita = (() => {
    const per = new Map<string, Progressi['attivita']>();
    for (const a of p?.attivita ?? []) per.set(a.tipo, [...(per.get(a.tipo) ?? []), a]);
    return [...per.entries()].sort((x, y) => nomeTipo(x[0]).localeCompare(nomeTipo(y[0]), 'it'));
  })();

  return (
    <PageState isLoading={dati.caricamento && !p} error={dati.errore} onRetry={dati.ricarica}>
      {p && (
        <div className="progressi-struttura">
          <div className="progressi-riepilogo" role="tablist" aria-label="Argomenti dei progressi">
            {SEZIONI.map((s) => (
              <button key={s.k} type="button" role="tab" id={`progressi-tab-${s.k}`} aria-selected={sezione === s.k} aria-controls="progressi-pannello" className={`progressi-tessera touch ${sezione === s.k ? 'progressi-tessera--attiva' : ''}`} onClick={() => scegli(s.k)}>
                <span className="progressi-tessera__nome">{s.nome}</span>
                <span className="progressi-tessera__valore">{tessere[s.k].valore}</span>
                <span className="progressi-tessera__dettaglio">{tessere[s.k].dettaglio}</span>
              </button>
            ))}
          </div>

          <div id="progressi-pannello" role="tabpanel" aria-labelledby={`progressi-tab-${sezione}`} className="flex min-w-0 flex-col gap-4">
            {/* scopo e dettaglio della tessera attiva aprono il contenuto del pannello: sopra restano solo le tessere (intestazione ≤ 30%) */}
            <div className="flex flex-col gap-1">
              <p className="progressi-scopo m-0">
                <span className="hidden sm:inline">Le cose fatte in gioco che sbloccano Confidenti, negozi e attività. Quello che l’app sa già lo vedi; quello che non può sapere lo segni tu.</span>
                <span className="sm:hidden">Cosa hai sbloccato in gioco: l’app segna quello che sa, il resto lo segni tu.</span>
              </p>
              <p className="progressi-dettaglio-attivo sm:hidden m-0" aria-hidden="true">{tessere[sezione].dettaglio}</p>
            </div>
            {sezione === 'storia' && <>
              <div className="progressi-partita">
                <section className="card flex flex-col gap-2" aria-labelledby="progressi-da-segnare">
                  <h2 id="progressi-da-segnare" className="m-0 font-display testo-17 uppercase leading-none">Da segnare quando succede</h2>
                  <p className="m-0 testo-12 text-text-muted">Eventi della storia che l’app non può sapere: spunta la casella quando li fai in gioco.</p>
                  {daSegnare.length === 0
                    ? <p className="m-0 testo-13 text-text-muted">Niente da segnare: tutti gli eventi sono avvenuti.</p>
                    : <ul className="m-0 p-0 list-none flex flex-col gap-1">
                      {daSegnare.map((e) => <RigaEvento key={e.chiave} e={e} occupato={occupato === e.chiave} onCambia={(v) => void salva(e.chiave, () => impostaEventoStoria(partitaId, e.chiave, v))} />)}
                    </ul>}
                  {avvenutiManuali.length > 0 && (
                    <details className="progressi-avvenuti">
                      <summary className="touch cursor-pointer testo-13 text-text-secondary">Avvenuti ({avvenutiManuali.length})</summary>
                      <ul className="m-0 p-0 list-none flex flex-col gap-1">
                        {avvenutiManuali.map((e) => <RigaEvento key={e.chiave} e={e} occupato={occupato === e.chiave} onCambia={(v) => void salva(e.chiave, () => impostaEventoStoria(partitaId, e.chiave, v))} />)}
                      </ul>
                    </details>
                  )}
                </section>

                <div className="flex min-w-0 flex-col gap-3">
                  <section className="card flex flex-col gap-2" aria-labelledby="progressi-squadra">
                    <h2 id="progressi-squadra" className="m-0 flex flex-wrap items-center gap-2 font-display testo-17 uppercase leading-none">Automatici dalla squadra <Automatico /></h2>
                    <p className="m-0 testo-12 text-text-muted">Un Ladro in squadra fa avvenire il suo evento. Si segna in <Link to="/partita?scheda=squadra" className="text-primary-testo">Denaro e squadra</Link>.</p>
                    <ul className="m-0 p-0 list-none flex flex-col gap-1">
                      {calcolati.map((e) => (
                        <li key={e.chiave} className="progressi-partita__riga">
                          <Pallino stato={e.avvenuto} />
                          <span className="min-w-0 flex-1">{e.nome}</span>
                          <Link to="/partita?scheda=squadra" className="touch inline-flex items-center testo-12 text-text-secondary">{e.avvenuto === true ? `${e.membroNome} in squadra` : e.avvenuto === false ? `${e.membroNome} non in squadra` : `${e.membroNome}: non ancora segnato`}</Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="card flex flex-col gap-2" aria-labelledby="progressi-contatori">
                    <h2 id="progressi-contatori" className="m-0 flex flex-wrap items-center gap-2 font-display testo-17 uppercase leading-none">Dalle letture <Automatico /></h2>
                    <p className="m-0 testo-12 text-text-muted">Si contano da sole in <Link to="/partita?scheda=letture" className="text-primary-testo">Letture e giochi</Link>.</p>
                    <ul className="m-0 p-0 list-none flex flex-col gap-1">
                      {p.contatori.map((c) => (
                        <li key={c.chiave} className="progressi-partita__riga">
                          <span className="min-w-0 flex-1">{c.nome}</span>
                          <span className="font-display testo-17 tabular-nums">{c.valore}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </>}

            {sezione === 'attivita' && (
              <section className="flex flex-col gap-3" aria-labelledby="progressi-attivita">
                <div className="flex flex-col gap-1">
                  <h2 id="progressi-attivita" className="m-0 font-display testo-17 uppercase leading-none">Attività svolte</h2>
                  <p className="m-0 testo-13 text-text-secondary">Quante volte hai fatto ogni attività: ogni + ti ricorda le Doti da segnare.</p>
                </div>
                <div className="progressi-attivita">
                  {gruppiAttivita.map(([tipo, righe]) => (
                    <section key={tipo} className="progressi-attivita__gruppo" aria-labelledby={`progressi-tipo-${tipo}`}>
                      <h3 id={`progressi-tipo-${tipo}`} className="m-0 font-display testo-17 uppercase leading-none">{nomeTipo(tipo)}</h3>
                      <ul className="m-0 p-0 list-none flex flex-col">
                        {righe.map((a) => {
                          const pesca = a.chiave === ATTIVITA_PESCA || a.chiave === SFIDA_PESCA;
                          return (
                            <li key={a.chiave} className="progressi-attivita__riga">
                              <span className="min-w-0 flex-[1_1_12rem]">
                                <span className="block">{a.nome}</span>
                                {a.effettiTurno?.length > 0 && <span className="block testo-12 text-text-secondary">Ogni turno: {a.effettiTurno.join(' · ')}</span>}
                              </span>
                              {pesca && <PulsanteVisivo compatto className="shrink-0" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Registra nella scheda Pesca" onClick={() => scegli('pesca')} />}
                              <span className="condizione-numero shrink-0" role="group" aria-label={`Volte: ${a.nome}`}>
                                <button type="button" className="touch" aria-label={`${a.nome}: una volta in meno`} disabled={occupato === a.chiave || a.volte <= 0} onClick={() => void salva(a.chiave, () => impostaAttivitaSvolta(partitaId, a.chiave, a.volte - 1))}><IconaAzione chiave="meno" dimensione={16} /></button>
                                <span className="condizione-numero__valore">{a.volte}</span>
                                {!pesca && <button type="button" className="touch" aria-label={`${a.nome}: una volta in più`} disabled={occupato === a.chiave || a.volte >= 999} onClick={() => void salva(a.chiave, () => impostaAttivitaSvolta(partitaId, a.chiave, a.volte + 1))}><IconaAzione chiave="piu" dimensione={16} /></button>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </section>
            )}

            {sezione === 'negozi' && <>
              <div className="progressi-partita">
                {p.rangoCliente.length > 0 && (
                  <section className="card flex flex-col gap-2" aria-labelledby="progressi-rango">
                    <h2 id="progressi-rango" className="m-0 flex flex-wrap items-center gap-2 font-display testo-17 uppercase leading-none">Grado cliente <Automatico /></h2>
                    <p className="m-0 testo-12 text-text-muted">Cresce da solo con la spesa che segni negli acquisti del negozio.</p>
                    <ul className="m-0 p-0 list-none flex flex-col gap-2">
                      {p.rangoCliente.map((n) => {
                        const quota = n.prossimo && n.prossimo.spesa > 0 ? Math.min(100, Math.round((n.spesa / n.prossimo.spesa) * 100)) : 100;
                        return (
                          <li key={n.negozio} className="flex flex-col gap-1 border-b border-border px-1.5 pb-2">
                            <span className="flex items-center gap-2">
                              <Link to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="touch inline-flex min-w-0 flex-1 items-center">{n.nome}</Link>
                              <span className="chip chip--attivo">{n.rango.nome}</span>
                            </span>
                            <span className="progressi-barra" role="progressbar" aria-label={`Verso il grado successivo: ${n.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={quota}><span style={{ width: `${quota}%` }} /></span>
                            <span className="testo-13 text-text-secondary">spesi {formattaYen(n.spesa)}{n.prossimo ? ` · ${n.prossimo.nome} da ${formattaYen(n.prossimo.spesa)}` : ' · grado massimo'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                {p.puntiNegozio.length > 0 && (
                  <section className="card flex flex-col gap-2" aria-labelledby="progressi-punti">
                    <h2 id="progressi-punti" className="m-0 font-display testo-17 uppercase leading-none">Punti negozio</h2>
                    <p className="m-0 testo-12 text-text-muted">I punti che il negozio ti ha dato, a passi di dieci: vengono dalle vendite, non dalla spesa.</p>
                    <ul className="m-0 p-0 list-none flex flex-col gap-1">
                      {p.puntiNegozio.map((n) => (
                        <li key={n.negozio} className="progressi-partita__riga">
                          <span className="min-w-0 flex-1">
                            <span className="block"><Link to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="touch inline-flex items-center">{n.nome}</Link></span>
                            <span className="block testo-12 text-text-secondary">{n.programma} · {n.unita}</span>
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
              <RegistroAcquistiPartita key={`acquisti:${partitaId}`} partitaId={partitaId} onCambiato={rileggi} />
            </>}

            {sezione === 'pesca' && <RegistroPesca key={`pesca:${partitaId}`} partitaId={partitaId} onCambiato={rileggi} />}
          </div>
        </div>
      )}
    </PageState>
  );
}
