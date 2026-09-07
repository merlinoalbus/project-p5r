import { useEffect, useState } from 'react';
import { getVideogiochi } from '../services/api/compendio';
import { impostaProgressoVideogioco } from '../services/api/partite';
import { usePartitaStore } from '../stores/partitaStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NOME_DOTE } from '../utils/citta';
import type { VideogiocoDto } from '../types';

export function VideogiochiPage() {
  useDocumentTitle('Videogiochi');
  const partita = usePartitaStore((s) => s.attiva);
  const dati = useCarica(() => getVideogiochi(partita?.id), [partita?.id]);
  const [query, setQuery] = useState('');
  const [giochi, setGiochi] = useState<VideogiocoDto[]>([]);
  // Sincronizza la cache locale dopo il caricamento API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (dati.dati) setGiochi(dati.dati.videogiochi); }, [dati.dati]);
  if (dati.caricamento) return <PageState isLoading error={null}> </PageState>;
  if (dati.errore || !dati.dati) return <PageState isLoading={false} error={dati.errore ?? 'Dati non disponibili'}> </PageState>;
  const visibili = giochi.filter((g) => `${g.nome} ${g.doti.map((d) => d.dote).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const aggiorna = async (g: VideogiocoDto, avanzamento: number) => {
    if (!partita) return;
    const nuovo = await impostaProgressoVideogioco(partita.id, g.chiave, avanzamento);
    setGiochi((xs) => xs.map((x) => x.chiave === nuovo.chiave ? nuovo : x));
  };
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <IntestazionePagina titolo="Videogiochi" sottotitolo="Completa tutti i round per ottenere le ricompense. I contenuti collegati si sbloccano solo al completamento." />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-900 p-4"><b>{giochi.length}</b><small className="ml-2">giochi</small></div><div className="rounded-xl bg-slate-900 p-4"><b>{giochi.filter((g) => g.fatto).length}</b><small className="ml-2">completati</small></div></div>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca gioco o Dote" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3" />
    <div className="grid gap-4 md:grid-cols-2">{visibili.map((g) => <article key={g.chiave} className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{g.nome}</h2><p className="text-sm text-slate-400">{g.luogo}</p></div><span className="rounded-full bg-red-900/50 px-3 py-1 text-sm">{g.progresso}/{g.totaleRound}</span></div><p className="mt-3 text-sm">{g.doti.map((d) => `${d.dote ? (NOME_DOTE[d.dote] ?? d.dote) : ''}: ${d.note}`).join(' · ')}</p><div className="mt-4 flex gap-2"><button disabled={!partita || g.fatto} onClick={() => aggiorna(g, Math.min(g.totaleRound, g.progresso + 1))} className="rounded-lg bg-red-700 px-3 py-2 text-sm disabled:opacity-40">{g.fatto ? 'Completato' : 'Aggiungi round'}</button><button disabled={!partita || g.progresso === 0} onClick={() => aggiorna(g, 0)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">Azzera</button></div></article>)}</div>
  </div>;
}
