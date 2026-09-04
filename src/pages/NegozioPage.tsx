// ============================================================
// NegozioPage — scheda di un negozio: orari, sblocco, gestore/Confidente e articoli con filtri e spunta «acquistato» (Fase 8.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getNegozio } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { NOME_CATEGORIA_ARTICOLO, NOME_TIPO_NEGOZIO } from '../utils/negozi';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';

export function NegozioPage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getNegozio(chiave, partitaId ?? undefined), [chiave, partitaId]);
  const n = dati.dati;
  useDocumentTitle(n?.nome ?? 'Negozio');
  const [categoria, setCategoria] = useState('');
  const [per, setPer] = useState('');
  const [nascondiAcquistati, setNascondiAcquistati] = useState(false);
  const categorie = useMemo(() => [...new Set((n?.articoliElenco ?? []).map((a) => a.categoria))], [n]);
  const destinatari = useMemo(() => [...new Set((n?.articoliElenco ?? []).map((a) => a.per).filter((p): p is string => !!p && p !== 'tutti'))], [n]);
  const visibili = useMemo(() => (n?.articoliElenco ?? []).filter((a) => (!categoria || a.categoria === categoria) && (!per || a.per === per || a.per === 'tutti') && (!nascondiAcquistati || !a.acquistato)), [n, categoria, per, nascondiAcquistati]);
  return (
    <PageState isLoading={dati.caricamento && !n} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {n && (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn btn-ghost btn-sm self-start touch" onClick={() => navigate('/guida/negozi')}><IconChevronLeft size={16} /> Negozi</button>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-2xl font-bold">{n.nome}</h1>
              <span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span>
              {n.confidente && <Link to={`/confidenti/${n.confidente.chiave}`} className="chip chip--attivo no-underline">{n.confidente.nome}</Link>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-text-secondary">
              {n.luogo && <span><strong className="text-text">Dove:</strong> {n.luogoChiave ? <Link to={`/guida/citta/${n.luogoChiave}`}>{n.luogo}</Link> : n.luogo}</span>}
              {n.gestore && <span><strong className="text-text">Gestore:</strong> {n.gestore}</span>}
              {n.orari && <span><strong className="text-text">Orari:</strong> {n.orari}</span>}
              {n.sblocco && <span><strong className="text-text">Sblocco:</strong> {n.sblocco}</span>}
            </div>
            {n.note && <p className="m-0 text-[13px] text-text-secondary">{n.note}</p>}
            {n.fonte && <a href={n.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
            <p className="m-0 text-[12px] text-text-muted">{n.articoli} articoli{n.verificati < n.articoli ? ` (${n.articoli - n.verificati} da fonte secondaria)` : ''}{partitaId ? ` · ${n.acquistati} acquistati nella partita «${attiva?.nome}»` : ' · attiva una partita per segnare gli acquisti'}.</p>
          </div>
          {n.articoliElenco.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categorie.length > 1 && (
                <select className="form-input w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
                  <option value="">Tutte le categorie</option>
                  {categorie.map((c) => <option key={c} value={c}>{NOME_CATEGORIA_ARTICOLO[c] ?? c}</option>)}
                </select>
              )}
              {destinatari.length > 1 && (
                <select className="form-input w-auto" value={per} onChange={(e) => setPer(e.target.value)} aria-label="Per chi">
                  <option value="">Per chiunque</option>
                  {destinatari.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {partitaId && <label className="flex items-center gap-1.5 text-[13px] touch"><input type="checkbox" className="w-5 h-5" checked={nascondiAcquistati} onChange={(e) => setNascondiAcquistati(e.target.checked)} /> Nascondi acquistati</label>}
            </div>
          )}
          {n.articoliElenco.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessun articolo acquistabile confermato per questo luogo.</p>
            : <ArticoliTabella articoli={visibili} partitaId={partitaId} onCambiato={(a) => dati.imposta({ ...n, articoliElenco: n.articoliElenco.map((x) => (x.chiave === a.chiave ? a : x)), acquistati: n.articoliElenco.filter((x) => (x.chiave === a.chiave ? a.acquistato : x.acquistato)).length })} />}
        </div>
      )}
    </PageState>
  );
}
