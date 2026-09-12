// ============================================================
// IngressoQuartiere — quale planimetria si apre toccando il quartiere sulla mappa di Tokyo, e su che punto
// ============================================================
//
// Due gesti: si sceglie la mappa dall'elenco con ricerca, si tocca l'immagine nel punto da centrare —
// e il tocco **salva subito**. Prima servivano tre comandi (una casella di ricerca, una tendina, un
// pulsante «Salva») più le coordinate a mano: richiesta dell'utente (2026-09-12), «migliorare la
// selezione del punto di apertura del quartiere che ad oggi richiede tre input». L'ingrandimento
// sono tre pastiglie, anch'esse salvate al tocco; le coordinate numeriche e le frecce restano sotto
// «Avanzate» per chi vuole la precisione.
// ============================================================

import { etichettaPlanimetria } from '../../utils/presentazioneMappa';
import { useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { getAlberoMappe, getMappa, salvaIngressoQuartiere } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useAsset } from '../../stores/assetStore';
import type { QuartiereDettaglioDto } from '../../types';
import { notifica } from '../../stores/notificationStore';
import { NOME_TIPO_MAPPA } from '../../../shared/spilli';

const INGRANDIMENTI = [{ zoom: 1.5, nome: 'Largo' }, { zoom: 2.5, nome: 'Medio' }, { zoom: 4, nome: 'Vicino' }] as const;

export function IngressoQuartiere({ quartiere: q, onSalvato, onChiudi }: { quartiere: QuartiereDettaglioDto; onSalvato: () => Promise<void>; onChiudi: () => void }) {
  const [mappa, setMappa] = useState(q.ingresso?.mappa ?? q.mappaChiave ?? '');
  const [x, setX] = useState(q.ingresso?.x ?? 50);
  const [y, setY] = useState(q.ingresso?.y ?? 50);
  const [zoom, setZoom] = useState(q.ingresso?.zoom ?? 2.5);
  const [occupato, setOccupato] = useState(false);
  const albero = useCarica(getAlberoMappe, []);
  const dati = useCarica(() => getMappa(mappa), [mappa]);
  const asset = useAsset(dati.dati?.asset);
  const originale = useAsset(dati.dati?.assetOriginale);
  const src = dati.dati?.immagineUrl ?? asset ?? originale;
  const coordinateValide = (px: number, py: number) => [px, py].every((v) => Number.isFinite(v) && v >= 0 && v <= 100);

  /** Salva quel che c'è (o quel che viene passato): ogni gesto sull'immagine e sulle pastiglie passa da qui. */
  const salva = async (valori?: { x?: number; y?: number; zoom?: number }, reset = false) => {
    const nx = valori?.x ?? x, ny = valori?.y ?? y, nz = valori?.zoom ?? zoom;
    if (!reset && (!mappa || !coordinateValide(nx, ny))) return;
    setOccupato(true);
    try {
      await salvaIngressoQuartiere(q.chiave, reset ? null : { mappa, x: nx, y: ny, zoom: nz });
      await onSalvato();
      notifica('success', reset ? 'Ingresso predefinito ripristinato.' : 'Ingresso del quartiere salvato.');
      if (reset) onChiudi();
    } catch (e) {
      notifica('error', e instanceof Error ? e.message : 'Salvataggio non riuscito.');
    } finally {
      setOccupato(false);
    }
  };
  const tocca = (e: React.MouseEvent<HTMLDivElement>) => {
    if (occupato) return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = Math.round((e.clientX - r.left) / r.width * 10000) / 100;
    const ny = Math.round((e.clientY - r.top) / r.height * 10000) / 100;
    setX(nx); setY(ny);
    void salva({ x: nx, y: ny });
  };
  const sposta = (dx: number, dy: number) => {
    if (occupato) return;
    const nx = Math.min(100, Math.max(0, x + dx)), ny = Math.min(100, Math.max(0, y + dy));
    setX(nx); setY(ny);
    void salva({ x: nx, y: ny });
  };
  const scegliZoom = (z: number) => { setZoom(z); void salva({ zoom: z }); };
  const opzioni: Array<{ chiave: string; nome: string; dettaglio?: string; gruppo?: string }> = (albero.dati ?? []).map((m) => ({ chiave: m.chiave, nome: etichettaPlanimetria(m), dettaglio: NOME_TIPO_MAPPA[m.tipo], gruppo: m.genitoreNome ?? undefined }));
  if (mappa && !opzioni.some((o) => o.chiave === mappa)) opzioni.unshift({ chiave: mappa, nome: q.ingresso?.nome ?? q.nome });

  return (
    <section className="card flex flex-col gap-3" aria-label="Configura ingresso del quartiere">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-lg">Ingresso da Città</h2>
          <p className="m-0 text-sm text-text-secondary">Scegli la mappa e tocca l’immagine nel punto da centrare: il tocco salva subito.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato} onClick={onChiudi}>Chiudi</button>
      </div>
      <Selettore etichetta="Mappa iniziale" ricerca="sempre" valore={mappa} disabilitato={occupato || albero.caricamento} opzioni={opzioni} onCambia={(k) => { setMappa(k); setX(50); setY(50); }} />
      {(albero.errore || dati.errore) && <p role="alert">{albero.errore ?? dati.errore} <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => { void albero.ricarica(); void dati.ricarica(); }}>Riprova</button></p>}
      {dati.caricamento ? <p role="status">Caricamento della mappa…</p> : src ? (
        <div className={`ingresso-quartiere__immagine ${occupato ? 'ingresso-quartiere__immagine--occupata' : ''}`} role="application" aria-label="Punto iniziale: tocca l’immagine, o usa le frecce" tabIndex={0}
          onKeyDown={(e) => { const d = e.shiftKey ? 5 : 1; if (e.key === 'ArrowLeft') { e.preventDefault(); sposta(-d, 0); } if (e.key === 'ArrowRight') { e.preventDefault(); sposta(d, 0); } if (e.key === 'ArrowUp') { e.preventDefault(); sposta(0, -d); } if (e.key === 'ArrowDown') { e.preventDefault(); sposta(0, d); } }}
          onClick={tocca}>
          <img src={src} alt={`Mappa per l’ingresso: ${dati.dati?.nome ?? q.nome}`} draggable={false} />
          <span className="ingresso-quartiere__punto" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">+</span>
        </div>
      ) : <p className="m-0 text-sm">Questa mappa non ha un’immagine: caricala dall’editor, oppure indica il punto sotto «Avanzate».</p>}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Ingrandimento">
        <span className="text-[12px] text-text-muted">Ingrandimento</span>
        {INGRANDIMENTI.map((i) => <button key={i.zoom} type="button" className={`chip touch ${zoom === i.zoom ? 'chip--attivo' : ''}`} aria-pressed={zoom === i.zoom} disabled={occupato} onClick={() => scegliZoom(i.zoom)}>{i.nome} · {i.zoom}×</button>)}
        {!INGRANDIMENTI.some((i) => i.zoom === zoom) && <span className="chip chip--attivo" aria-pressed="true">{zoom}×</span>}
      </div>
      <p className="m-0 text-[12px] text-text-muted" role="status">
        {q.ingresso ? <>Salvato: {q.ingresso.nome}, {q.ingresso.x}% da sinistra, {q.ingresso.y}% dall’alto, {q.ingresso.zoom}×.</> : 'Nessun ingresso salvato: si apre la mappa predefinita, adattata.'}
      </p>
      <details className="text-[13px]">
        <summary className="cursor-pointer text-text-secondary touch">Avanzate: coordinate esatte</summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="editor-mappa__campo w-[120px]">Orizzontale (%)<input className="form-input" type="number" min={0} max={100} step={0.01} value={x} onChange={(e) => setX(e.target.valueAsNumber)} /></label>
          <label className="editor-mappa__campo w-[120px]">Verticale (%)<input className="form-input" type="number" min={0} max={100} step={0.01} value={y} onChange={(e) => setY(e.target.valueAsNumber)} /></label>
          <button type="button" className="btn btn-primary btn-sm touch" disabled={occupato || !mappa || !coordinateValide(x, y)} onClick={() => void salva()}>Salva coordinate</button>
        </div>
      </details>
      {q.ingresso && <button type="button" className="btn btn-ghost btn-sm touch self-start" disabled={occupato} onClick={() => void salva(undefined, true)}>Ripristina ingresso predefinito</button>}
    </section>
  );
}
