// ============================================================
// IngressoQuartiere — dove si atterra toccando il quartiere sulla metro: un'Area e un punto della sua planimetria (L2, R2-21/22)
// ============================================================
//
// L2 (2026-10-20): l'ingresso non è più una mappa qualunque scelta da un elenco di tutto l'atlante, ma **un'Area del quartiere**
// (passo 1) e il punto da centrare sulla sua planimetria predefinita (passo 2), con l'ingrandimento. Sta in una finestra (prima era
// un pannello in fondo alla colonna della mappa): si apre da «Ingresso» nell'intestazione del quartiere, si salva con «Salva»,
// «Togli l'ingresso» lo toglie. Il punto si sceglie toccando l'immagine (o con le frecce, Maiusc per passi da 5); le coordinate
// esatte restano sotto «Avanzate» per chi vuole la precisione.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { salvaIngressoQuartiere } from '../../services/api';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { notifica } from '../../stores/notificationStore';
import type { QuartiereDettaglioDto } from '../../types';

const INGRANDIMENTI = [{ zoom: 1, nome: 'Intera' }, { zoom: 1.5, nome: 'Largo' }, { zoom: 2.5, nome: 'Medio' }, { zoom: 4, nome: 'Vicino' }] as const;

interface Props {
  quartiere: QuartiereDettaglioDto;
  aperta: boolean;
  onChiudi: () => void;
  /** Dopo il salvataggio (o la rimozione): la pagina rilegge il quartiere. */
  onSalvato: () => Promise<void>;
}

/** Vero se entrambe le coordinate sono numeri finiti fra 0 e 100 (percentuali dell'immagine). */
const coordinateValide = (px: number, py: number) => [px, py].every((v) => Number.isFinite(v) && v >= 0 && v <= 100);

/** La finestra dell'ingresso: scelta dell'Area, punto sulla sua planimetria predefinita, ingrandimento; «Salva», «Togli l'ingresso»,
 *  «Annulla». All'apertura riparte dall'ingresso salvato (o dalla prima Area, al centro). */
export function IngressoQuartiere({ quartiere: q, aperta, onChiudi, onSalvato }: Props) {
  // la finestra si monta quando si apre (la pagina la rende solo aperta): riparte dall'ingresso salvato, o dalla prima Area al centro
  const [area, setArea] = useState(() => q.ingresso?.area?.slug ?? q.aree[0]?.slug ?? '');
  const [x, setX] = useState(q.ingresso?.x ?? 50);
  const [y, setY] = useState(q.ingresso?.y ?? 50);
  const [zoom, setZoom] = useState(q.ingresso?.zoom ?? 1);
  const [occupato, setOccupato] = useState(false);
  const scelta = q.aree.find((a) => a.slug === area) ?? null;
  const src = useImmagineMappa(scelta?.illustrazione);

  const salva = async (togli = false) => {
    if (!togli && (!scelta || !coordinateValide(x, y))) return;
    setOccupato(true);
    try {
      await salvaIngressoQuartiere(q.chiave, togli ? null : { area, x, y, zoom });
      await onSalvato();
      notifica('success', togli ? `Ingresso di ${q.nome} tolto: dalla metro si apre la pagina del quartiere.` : `Ingresso di ${q.nome}: ${scelta?.nome}.`);
      onChiudi();
    } catch (e) {
      notifica('error', e instanceof Error ? e.message : 'Ingresso non salvato.');
    } finally {
      setOccupato(false);
    }
  };
  /** Converte il punto toccato in percentuali dell'immagine (due decimali). */
  const tocca = (e: React.MouseEvent<HTMLDivElement>) => {
    if (occupato) return;
    const r = e.currentTarget.getBoundingClientRect();
    setX(Math.round((e.clientX - r.left) / r.width * 10000) / 100);
    setY(Math.round((e.clientY - r.top) / r.height * 10000) / 100);
  };
  /** Sposta il punto dello scarto indicato (punti percentuali, limitato a 0–100). */
  const sposta = (dx: number, dy: number) => { setX((v) => Math.min(100, Math.max(0, v + dx))); setY((v) => Math.min(100, Math.max(0, v + dy))); };

  return (
    <Modal titolo={`Ingresso di ${q.nome}`} aperta={aperta} onChiudi={onChiudi} larga
      azioni={<>
        {q.ingresso && <button type="button" className="btn btn-ghost touch mr-auto" disabled={occupato} onClick={() => void salva(true)}>Togli l’ingresso</button>}
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn btn-primary touch" disabled={occupato || !scelta || !coordinateValide(x, y)} onClick={() => void salva()}>Salva</button>
      </>}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[13px] text-text-secondary">Toccando {q.nome} sulla mappa di Tokyo si apre quest’area, centrata sul punto che scegli.</p>
        {q.aree.length === 0
          ? <p className="m-0 text-[13px]" role="status">{q.nome} non ha ancora aree: aggiungine una, poi sceglila qui.</p>
          : <>
            <Selettore etichetta="Area d’ingresso" valore={area} disabilitato={occupato} opzioni={q.aree.map((a) => ({ chiave: a.slug, nome: a.nome, dettaglio: a.numeroPlanimetrie > 1 ? `${a.numeroPlanimetrie} planimetrie` : undefined }))}
              onCambia={(k) => { setArea(k); setX(50); setY(50); }} />
            {src ? (
              <div className={`ingresso-quartiere__immagine ${occupato ? 'ingresso-quartiere__immagine--occupata' : ''}`} role="application" aria-label={`Punto d’arrivo su ${scelta?.nome}: tocca l’immagine, o usa le frecce`} tabIndex={0}
                onKeyDown={(e) => { const d = e.shiftKey ? 5 : 1; if (e.key === 'ArrowLeft') { e.preventDefault(); sposta(-d, 0); } if (e.key === 'ArrowRight') { e.preventDefault(); sposta(d, 0); } if (e.key === 'ArrowUp') { e.preventDefault(); sposta(0, -d); } if (e.key === 'ArrowDown') { e.preventDefault(); sposta(0, d); } }}
                onClick={tocca}>
                <img src={src} alt={`Planimetria di ${scelta?.nome}`} draggable={false} />
                <span className="ingresso-quartiere__punto" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">+</span>
              </div>
            ) : <p className="m-0 text-[13px]">{scelta?.nome} non ha un’immagine da toccare: indica il punto sotto «Avanzate».</p>}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Ingrandimento">
              <span className="text-[12px] text-text-muted">Ingrandimento</span>
              {INGRANDIMENTI.map((i) => <button key={i.zoom} type="button" className={`chip touch ${zoom === i.zoom ? 'chip--attivo' : ''}`} aria-pressed={zoom === i.zoom} disabled={occupato} onClick={() => setZoom(i.zoom)}>{i.nome} · {i.zoom}×</button>)}
              {!INGRANDIMENTI.some((i) => i.zoom === zoom) && <span className="chip chip--attivo">{zoom}×</span>}
            </div>
            <p className="m-0 text-[12px] text-text-muted" role="status">
              {q.ingresso ? <>Salvato: {q.ingresso.area?.nome ?? q.ingresso.nome}, {q.ingresso.x}% da sinistra, {q.ingresso.y}% dall’alto, {q.ingresso.zoom}×.</> : 'Nessun ingresso salvato: dalla metro si apre la pagina del quartiere.'}
            </p>
            <details className="text-[13px]">
              <summary className="cursor-pointer text-text-secondary touch">Avanzate: coordinate esatte</summary>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="editor-mappa__campo w-[120px]">Orizzontale (%)<input className="form-input" type="number" min={0} max={100} step={0.01} value={x} onChange={(e) => setX(e.target.valueAsNumber)} /></label>
                <label className="editor-mappa__campo w-[120px]">Verticale (%)<input className="form-input" type="number" min={0} max={100} step={0.01} value={y} onChange={(e) => setY(e.target.valueAsNumber)} /></label>
              </div>
            </details>
          </>}
      </div>
    </Modal>
  );
}
