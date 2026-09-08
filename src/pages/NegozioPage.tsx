// ============================================================
// NegozioPage — scheda di un negozio: orari, sblocco, gestore/Confidente e articoli con filtri e spunta «acquistato» (Fase 8.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getElementoCatalogo, getNegozio } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { NOME_CATEGORIA_ARTICOLO, NOME_TIPO_NEGOZIO } from '../utils/negozi';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ModuloCatalogo } from '../components/guida/ModuloCatalogo';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import type { ElementoCatalogoDto } from '../types';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';

export function NegozioPage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  // giorno corrente e fascia della giornata decidono la disponibilità: al cambio si ricarica
  const momento = `${attiva?.dataGioco ?? ''}|${attiva?.fasciaGioco ?? ''}`;
  const dati = useCarica(() => getNegozio(chiave, partitaId ?? undefined), [chiave, partitaId, momento]);
  const n = dati.dati;
  useDocumentTitle(n?.nome ?? 'Negozio');
  const [categoria, setCategoria] = useState('');
  const [per, setPer] = useState('');
  // aggiunte dell'utente al catalogo: nuovo articolo di questo negozio, o correzione del negozio stesso (16.1)
  const [modulo, setModulo] = useState<'articolo' | 'negozio' | null>(null);
  const [elementoArticolo, setElementoArticolo] = useState<ElementoCatalogoDto | null>(null);
  const [elementoNegozio, setElementoNegozio] = useState<ElementoCatalogoDto | null>(null);
  const [nascondiAcquistati, setNascondiAcquistati] = useState(false);
  const categorie = useMemo(() => [...new Set((n?.articoliElenco ?? []).map((a) => a.categoria))], [n]);
  const destinatari = useMemo(() => [...new Set((n?.articoliElenco ?? []).map((a) => a.per).filter((p): p is string => !!p && p !== 'tutti'))], [n]);
  // Anche un articolo non ancora acquistabile resta consultabile con condizioni e semaforo.
  const visibili = useMemo(() => (n?.articoliElenco ?? []).filter((a) => (!categoria || a.categoria === categoria) && (!per || a.per === per || a.per === 'tutti') && (!nascondiAcquistati || !a.acquistato)), [n, categoria, per, nascondiAcquistati]);
  return (
    <PageState isLoading={dati.caricamento && !n} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {n && (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn btn-ghost btn-sm self-start touch" onClick={() => navigate('/guida/negozi')}><IconChevronLeft size={16} /> Negozi</button>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="titolo-display m-0">{n.nome}</h1>
              <span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span>
              {n.confidente && <Link to={`/confidenti/${n.confidente.chiave}`} className="chip chip--attivo no-underline">{n.confidente.nome}</Link>}
              <ChipDisponibilita disponibilita={n.disponibilita} />
            </div>
            <details className="catalogo-informazioni"><summary className="touch">Informazioni sul negozio{n.quartiereNome ? ` · ${n.quartiereNome}` : ''}</summary>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-text-secondary">
              {n.luogo && <span><strong className="text-text">Dove:</strong> {n.luogoChiave ? <Link to={`/guida/citta/${n.luogoChiave}`}>{n.luogo}</Link> : n.luogo}</span>}
              {n.gestore && <span><strong className="text-text">Gestore:</strong> {n.gestore}</span>}
              {n.orari && <span><strong className="text-text">Orari:</strong> {n.orari}</span>}
              {!n.condizioni && n.sblocco && <span><strong className="text-text">Sblocco:</strong> {n.sblocco}</span>}
            </div>
            {n.condizioni && n.condizioni.length>0&&<ul>{n.condizioni.map((r,i)=><li key={i}>{r.testo}{n.disponibilita?.requisiti[i]&&` — ${n.disponibilita.requisiti[i].dettaglio}`}</li>)}</ul>}
            {n.note && <p className="m-0 text-[13px] text-text-secondary">{n.note}</p>}
            {n.fonte && <a href={n.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
            </details>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi un articolo" dettaglio="a questo negozio" onClick={() => { setElementoArticolo(null); setModulo('articolo'); }} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Correggi il negozio" onClick={() => { void getElementoCatalogo('negozio', chiave).then((e) => { setElementoNegozio(e); setModulo('negozio'); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.')); }} />
            </div>
            {modulo === 'articolo' && <ModuloCatalogo tipo="articolo" elemento={elementoArticolo} negozioChiave={chiave} onChiudi={() => setModulo(null)} onSalvato={() => { setModulo(null); void dati.ricarica(); }} />}
            {modulo === 'negozio' && elementoNegozio && <ModuloCatalogo tipo="negozio" elemento={elementoNegozio} onChiudi={() => setModulo(null)} onSalvato={() => { setModulo(null); void dati.ricarica(); }} />}
            <p className="m-0 text-[12px] text-text-muted">{n.articoli} articoli{n.verificati < n.articoli ? ` (${n.articoli - n.verificati} da fonte secondaria)` : ''}{partitaId ? ` · ${n.acquistati} acquistati nella partita «${attiva?.nome}»` : ' · attiva una partita per segnare gli acquisti'}.</p>
          </div>
          {/* **Due colonne su schermo largo: la mappa da una parte, la merce dall'altra.**
              La pagina era impaginata per il telefono e basta — una colonna sola, la mappa alta 300
              px in mezzo, e l'elenco degli articoli che spingeva tutto sotto la piega. Su desktop
              e tablet lo spazio c'e' e va usato: si guarda dove sta il negozio *mentre* si scorre
              quel che vende, invece di far scorrere l'intera pagina avanti e indietro.
              Sotto i 1024 px torna una colonna sola, che li' e' la forma giusta. */}
          <div className="negozio-corpo">
            <div className="negozio-mappa">
              <DoveSiTrova tipo="negozio" chiave={n.chiave} altezza={300} />
            </div>
            <div className="negozio-merce">
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
            : <div className="negozio-elenco"><ArticoliTabella onModifica={(a) => { void getElementoCatalogo('articolo', a.chiave).then((e) => { setElementoArticolo(e); setModulo('articolo'); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.')); }} articoli={visibili} partitaId={partitaId} onCambiato={(a) => dati.imposta({ ...n, articoliElenco: n.articoliElenco.map((x) => (x.chiave === a.chiave ? a : x)), acquistati: n.articoliElenco.filter((x) => (x.chiave === a.chiave ? a.acquistato : x.acquistato)).length })} /></div>}
            </div>
          </div>
        </div>
      )}
    </PageState>
  );
}
