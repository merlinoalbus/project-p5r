// ============================================================
// FinestraLegamiInfiltrazione — «Modifica aree» di un'infiltrazione (L3, R3-23): quali Aree del Palazzo tocca, e in che ordine
// ============================================================
//
// È lo stesso legame di «Infiltrazioni in quest'area» nella finestra dell'area, visto dall'altro lato: un gesto solo, che non sposta
// voci né pin. L'ordine è quello in cui l'infiltrazione percorre le aree (la prima si apre arrivando sull'infiltrazione); per le aree
// che restano legate si conserva la versione che si apriva.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { impostaAreeInfiltrazione } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import type { AreaDungeonDto, AreaRiassuntoDto } from '../../types';

interface Props {
  infiltrazione: AreaDungeonDto;
  /** Le Aree del Palazzo, nell'ordine del Palazzo. */
  aree: AreaRiassuntoDto[];
  partitaId: number | null;
  onChiudi: () => void;
  /** Dopo il salvataggio: la pagina rilegge il Palazzo. */
  onSalvata: () => Promise<void> | void;
}

/** La finestra: le aree toccate in ordine (↑/↓, togli) e quelle che si possono aggiungere. */
export function FinestraLegamiInfiltrazione({ infiltrazione: i, aree, partitaId, onChiudi, onSalvata }: Props) {
  const legate = i.areePalazzo ?? [];
  const [scelte, setScelte] = useState<string[]>(() => legate.map((a) => a.slug));
  const [occupato, setOccupato] = useState(false);
  const perSlug = new Map(aree.map((a) => [a.slug, a]));
  const libere = aree.filter((a) => !scelte.includes(a.slug));
  const sposta = (n: number, verso: -1 | 1) => setScelte((s) => { const x = [...s]; [x[n], x[n + verso]] = [x[n + verso], x[n]]; return x; });
  const salva = async () => {
    setOccupato(true);
    try {
      // la versione da aprire resta quella di prima per le aree che restano legate; le nuove aprono la loro predefinita
      const iniziali = Object.fromEntries(legate.filter((a) => scelte.includes(a.slug) && a.planimetriaIniziale).map((a) => [a.slug, a.planimetriaIniziale]));
      await impostaAreeInfiltrazione(i.chiave, scelte, Object.keys(iniziali).length ? iniziali : undefined, partitaId ?? undefined);
      notifica('success', `Aree di «${i.nome}» salvate.`);
      await onSalvata();
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aree non salvate.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <Modal titolo={`Aree toccate da «${i.nome}»`} aperta onChiudi={onChiudi} larga
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void salva()}>Salva</button>
      </>}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[13px] text-text-secondary">L’ordine è quello in cui l’infiltrazione le percorre: la prima si apre arrivando sull’infiltrazione. Voci della guida e pin restano dove sono.</p>
        <section className="flex flex-col gap-1.5" aria-label="Aree toccate, in ordine">
          <h3 className="m-0 text-[14px]">Aree toccate · {scelte.length}</h3>
          {scelte.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna: l’infiltrazione non tocca aree.</p>}
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {scelte.map((s, n) => (
              <li key={s} className="card flex flex-wrap items-center gap-1 p-1.5">
                <span className="min-w-0 flex-1 text-[13px] font-semibold">{n + 1}. {perSlug.get(s)?.nome ?? s}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <button type="button" className="btn btn-ghost touch" aria-label={`Sposta su ${perSlug.get(s)?.nome ?? s}`} disabled={n === 0} onClick={() => sposta(n, -1)}>↑</button>
                  <button type="button" className="btn btn-ghost touch" aria-label={`Sposta giù ${perSlug.get(s)?.nome ?? s}`} disabled={n === scelte.length - 1} onClick={() => sposta(n, 1)}>↓</button>
                  <button type="button" className="btn btn-ghost touch whitespace-nowrap" aria-label={`Togli ${perSlug.get(s)?.nome ?? s}`} onClick={() => setScelte((x) => x.filter((k) => k !== s))}>Togli</button>
                </span>
              </li>
            ))}
          </ol>
        </section>
        {libere.length > 0 && (
          <section className="flex flex-col gap-1.5" aria-label="Aree da aggiungere">
            <h3 className="m-0 text-[14px]">Aggiungi un’area</h3>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {libere.map((a) => (
                <li key={a.slug}>
                  <button type="button" className="chip touch" onClick={() => setScelte((x) => [...x, a.slug])}>+ {a.nome}</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
