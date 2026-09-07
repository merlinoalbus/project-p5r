import { useEffect, useMemo, useRef, useState } from 'react';
import { getVideogiochi } from '../services/api/compendio';
import { impostaProgressoVideogioco } from '../services/api/partite';
import { usePartitaStore } from '../stores/partitaStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { NOME_DOTE } from '../utils/citta';
import type { VideogiocoDto, VideogiochiDto } from '../types';

const keyCoda = (id: number, key: string) => `${id}:${key}`;

export function VideogiochiPage() {
  useDocumentTitle('Videogiochi');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const partitaRef = useRef(partitaId);
  useEffect(() => { partitaRef.current = partitaId; }, [partitaId]);
  const dati = useCarica(() => getVideogiochi(partitaId ?? undefined), [partitaId]);
  const datiRef = useRef<VideogiochiDto | null>(null);
  useEffect(() => { datiRef.current = dati.dati; }, [dati.dati]);
  const [query, setQuery] = useState('');
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [desiderati, setDesiderati] = useState<Record<string, number>>({});
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});
  const desideratiRef = useRef(new Map<string, number>());
  const confermatiRef = useRef(new Map<string, number>());
  const inVoloRef = useRef(new Set<string>());

  const sostituisci = (g: VideogiocoDto) => {
    const d = datiRef.current;
    if (!d) return;
    const videogiochi = d.videogiochi.map((x) => x.chiave === g.chiave ? g : x);
    const nuovo = { ...d, videogiochi, iniziati: videogiochi.filter((x) => x.iniziato).length, completati: videogiochi.filter((x) => x.fatto).length, roundFatti: videogiochi.reduce((n, x) => n + Math.min(x.progresso, x.totaleRound), 0) };
    datiRef.current = nuovo;
    dati.imposta(nuovo);
  };

  const eseguiCoda = async (g: VideogiocoDto) => {
    if (!partitaId) return;
    const id = partitaId;
    const coda = keyCoda(id, g.chiave);
    if (inVoloRef.current.has(coda)) return;
    inVoloRef.current.add(coda);
    confermatiRef.current.set(coda, g.progresso);
    setOccupati((x) => ({ ...x, [coda]: true }));
    try {
      while (true) {
        const confermato = confermatiRef.current.get(coda) ?? g.progresso;
        const desiderato = desideratiRef.current.get(coda) ?? confermato;
        if (desiderato === confermato || partitaRef.current !== id) break;
        const aggiornato = await impostaProgressoVideogioco(id, g.chiave, desiderato);
        confermatiRef.current.set(coda, aggiornato.progresso);
        if (partitaRef.current === id) sostituisci(aggiornato);
      }
    } catch (err) {
      const confermato = confermatiRef.current.get(coda) ?? g.progresso;
      desideratiRef.current.set(coda, confermato);
      setDesiderati((x) => ({ ...x, [coda]: confermato }));
      if (partitaRef.current === id) notifica('error', err instanceof Error ? err.message : 'Aggiornamento del videogioco fallito.');
    } finally {
      inVoloRef.current.delete(coda);
      setOccupati((x) => ({ ...x, [coda]: false }));
    }
  };

  const accoda = (g: VideogiocoDto, valore: number) => {
    if (!partitaId) return;
    const desiderato = Math.min(Math.max(valore, 0), g.totaleRound);
    const coda = keyCoda(partitaId, g.chiave);
    desideratiRef.current.set(coda, desiderato);
    setDesiderati((x) => ({ ...x, [coda]: desiderato }));
    void eseguiCoda(g);
  };

  const visibili = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('it');
    return (dati.dati?.videogiochi ?? []).filter((g) => !q || `${g.nome} ${g.luogo} ${g.doti.map((x) => x.dote ? (NOME_DOTE[x.dote] ?? x.dote) : '').join(' ')}`.toLocaleLowerCase('it').includes(q));
  }, [dati.dati, query]);
  const scelto = dati.dati?.videogiochi.find((g) => g.chiave === selezionato) ?? null;
  const d = dati.dati;
  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8">
      <IntestazionePagina titolo="Videogiochi" sottotitolo={partitaId ? <>Registra ogni round nella partita «{attiva?.nome}». I contenuti collegati si sbloccano soltanto al completamento.</> : <>I videogiochi di Persona 5 Royal, con round, Doti e luoghi. Attiva una partita per registrare l'avanzamento.</>} />
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Riepilogo videogiochi"><div className="kpi-tile"><span className="kpi-value">{d.iniziati}</span><span className="kpi-label">iniziati</span></div><div className="kpi-tile"><span className="kpi-value">{d.completati}</span><span className="kpi-label">completati</span></div><div className="kpi-tile"><span className="kpi-value">{d.roundFatti}/{d.roundObiettivo}</span><span className="kpi-label">round completati</span></div></section>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca gioco, luogo o Dote…" aria-label="Cerca videogiochi" className="form-input w-full" />
      {scelto && <section className="flex flex-col gap-2" aria-label={`Posizione di ${scelto.nome}`}><div className="flex items-center justify-between gap-2"><h2 className="m-0">Dove giocare a «{scelto.nome}»</h2><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(null)}>Chiudi</button></div><DoveSiTrova tipo="attivita" chiave={scelto.chiave} titolo={scelto.nome} altezza={300} /></section>}
      <p className="m-0 text-sm text-text-secondary">{visibili.length} giochi mostrati</p>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2" aria-label="Videogiochi">{visibili.map((g) => { const coda = partitaId ? keyCoda(partitaId, g.chiave) : g.chiave; const progresso = partitaId ? desiderati[coda] ?? g.progresso : g.progresso; const fatto = progresso >= g.totaleRound; const busy = occupati[coda]; return <li key={g.chiave} className={`card flex min-w-0 flex-col gap-3 overflow-hidden ${fatto ? 'border-success/50' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="m-0 text-lg leading-tight">{g.nome}</h2><p className="m-0 text-xs text-text-secondary">{g.luogo}</p></div><span className={`chip ${fatto ? 'chip--attivo' : ''}`}>{fatto ? 'Completato' : `${progresso}/${g.totaleRound} round`}</span></div><div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${g.nome}`} aria-valuemin={0} aria-valuemax={g.totaleRound} aria-valuenow={progresso}><span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((progresso / g.totaleRound) * 100)}%` }} /></div><p className="m-0 text-sm">{g.doti.map((x) => `${x.dote ? (NOME_DOTE[x.dote] ?? x.dote) : 'Dote variabile'}${x.note ? ` ${'♪'.repeat(Math.min(4, x.note))}` : ''}`).join(' · ')}</p>{partitaId && <div className="grid grid-cols-[44px_1fr_44px] gap-2" aria-label={`Avanzamento ${g.nome}`}><button type="button" className="btn btn-ghost touch" disabled={progresso === 0} onClick={() => accoda(g, progresso - 1)} aria-label={`Togli un round a ${g.nome}`}>−</button><button type="button" className="btn btn-secondary touch" onClick={() => accoda(g, fatto ? 0 : g.totaleRound)} aria-label={`${fatto ? 'Azzera' : 'Completa'} ${g.nome}`}>{fatto ? 'Azzera' : 'Completa'}</button><button type="button" className="btn btn-ghost touch" disabled={progresso >= g.totaleRound} onClick={() => accoda(g, progresso + 1)} aria-label={`Aggiungi un round a ${g.nome}`}>+</button>{busy && <span className="col-span-3 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}</div>}<div className="mt-auto flex flex-wrap gap-2"><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(g.chiave)} aria-label={`Mostra posizione di ${g.nome}`}>Mostra posizione</button><a href={g.fonte} target="_blank" rel="noreferrer" className="credito self-center">fonte</a></div></li>; })}</ul>
    </div>}
  </PageState>;
}
