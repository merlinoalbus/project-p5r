// ============================================================
// NegoziPage — negozi per quartiere e ricerca degli articoli in tutti i negozi (Fase 8.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNegozi, ricercaArticoli } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { NOME_CATEGORIA_ARTICOLO, NOME_TIPO_NEGOZIO, PERSONAGGI } from '../utils/negozi';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import type { NegozioRiassuntoDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';

export function NegoziPage() {
  const sugg = useSuggerimenti();
  useDocumentTitle('Negozi e inventario');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const negozi = useCarica(() => getNegozi(partitaId ?? undefined), [partitaId]);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [per, setPer] = useState('');
  const cerca = q.trim().length >= 2 || categoria !== '' || per !== '';
  const risultati = useCarica(() => (cerca ? ricercaArticoli({ q: q.trim() || undefined, categoria: categoria || undefined, per: per || undefined }, partitaId ?? undefined) : Promise.resolve(null)), [q, categoria, per, partitaId, cerca]);
  const lista = negozi.dati;
  const gruppi = useMemo(() => {
    const m = new Map<string, { nome: string; negozi: NegozioRiassuntoDto[] }>();
    for (const n of lista ?? []) {
      const k = n.luogoChiave ?? '__altro';
      const g = m.get(k) ?? { nome: n.quartiereNome ?? 'Online, ambulanti e altri', negozi: [] };
      g.negozi.push(n); m.set(k, g);
    }
    return [...m.entries()];
  }, [lista]);
  return (
    <PageState isLoading={negozi.caricamento && !negozi.dati} error={negozi.errore} onRetry={() => void negozi.ricarica()}>
      {negozi.dati && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Negozi e inventario" sottotitolo={<>{negozi.dati.length} negozi e punti di acquisto con {negozi.dati.reduce((s, n) => s + n.articoli, 0)} articoli: armi, protezioni, accessori, oggetti, regali, cibo e materiali con prezzi, sblocchi e condizioni. Cerca un articolo in tutti i negozi o apri un negozio.</>} />
          <div className="flex flex-col gap-1.5">
            <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un articolo (nome, effetto) o un negozio…" />
            <div className="flex flex-wrap gap-1.5">
              <select className="form-input w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
                <option value="">Tutte le categorie</option>
                {Object.entries(NOME_CATEGORIA_ARTICOLO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
              <select className="form-input w-auto" value={per} onChange={(e) => setPer(e.target.value)} aria-label="Per chi">
                <option value="">Per chiunque</option>
                {PERSONAGGI.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {cerca ? (
            <PageState isLoading={risultati.caricamento && !risultati.dati} error={risultati.errore} onRetry={() => void risultati.ricarica()}>
              {risultati.dati && (
                <div className="flex flex-col gap-1.5">
                  <p className="m-0 text-[12px] text-text-muted">{risultati.dati.totale} articoli trovati{risultati.dati.totale > risultati.dati.articoli.length ? ` (mostrati i primi ${risultati.dati.articoli.length})` : ''}.</p>
                  <ArticoliTabella articoli={risultati.dati.articoli} partitaId={partitaId} mostraNegozio onCambiato={(a) => risultati.imposta(risultati.dati ? { ...risultati.dati, articoli: risultati.dati.articoli.map((x) => (x.chiave === a.chiave ? a : x)) } : null)} />
                </div>
              )}
            </PageState>
          ) : (
            gruppi.map(([k, g]) => (
              <section key={k} className="flex flex-col gap-1.5">
                <h2 className="m-0 text-[15px] font-semibold">{k === '__altro' ? g.nome : <Link to={`/guida/citta/${k}`} className="no-underline text-text">{g.nome}</Link>}</h2>
                <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Negozi: ${g.nome}`}>
                  {g.negozi.map((n) => (
                    <li key={n.chiave}>
                      <Link to={`/guida/negozi/${n.chiave}`} className={`card card--cliccabile no-underline text-text flex flex-col gap-1 h-full ${classiSuggerito(sugg.evidenziato('negozi', n.chiave))}`}>
                        <span className="flex flex-wrap items-center gap-2"><IconaCategoria categoria={n.tipo} dimensione={30} /><strong className="font-display uppercase text-[18px] leading-none">{n.nome}</strong><span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span><ChipDisponibilita disponibilita={n.disponibilita} compatto />{sugg.evidenziato('negozi', n.chiave) && <TargaSuggerito motivo={sugg.motivo('negozi', n.chiave)} compatta />}</span>
                        <span className="text-[12px] text-text-secondary">{n.articoli} {n.articoli === 1 ? 'articolo' : 'articoli'}{n.verificati < n.articoli ? ` · ${n.articoli - n.verificati} da fonte secondaria` : ''}{n.gestore ? ` · ${n.gestore}` : ''}</span>
                        {n.luogo && <span className="text-[12px] text-text-muted">{n.luogo}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
    </PageState>
  );
}
