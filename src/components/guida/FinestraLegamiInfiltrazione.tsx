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
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

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
// L12 (passo 8): nel rilascio (sola lettura) la finestra non esiste; la condizione è costante di build, `FinestraLegamiInfiltrazioneReale` esce dal bundle
export const FinestraLegamiInfiltrazione: StrumentoDiModifica<typeof FinestraLegamiInfiltrazioneReale> = IN_RILASCIO ? NienteInRilascio : FinestraLegamiInfiltrazioneReale;
function FinestraLegamiInfiltrazioneReale({ infiltrazione: i, aree, partitaId, onChiudi, onSalvata }: Props) {
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
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato} onClick={() => void salva()} />
      </>}>
      <div className="flex flex-col gap-3">
        <p className="m-0 testo-13 text-text-secondary">L’ordine è quello in cui l’infiltrazione le percorre: la prima si apre arrivando sull’infiltrazione. Voci della guida e pin restano dove sono.</p>
        <section className="flex flex-col gap-1.5" aria-label="Aree toccate, in ordine">
          <h3 className="m-0 testo-14">Aree toccate · {scelte.length}</h3>
          {scelte.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessuna: l’infiltrazione non tocca aree.</p>}
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {scelte.map((s, n) => (
              <li key={s} className="card flex flex-wrap items-center gap-1 p-1.5">
                <span className="min-w-0 flex-1 testo-13 font-semibold">{n + 1}. {perSlug.get(s)?.nome ?? s}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" aria-label={`Sposta su ${perSlug.get(s)?.nome ?? s}`} disabled={n === 0} onClick={() => sposta(n, -1)} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" aria-label={`Sposta giù ${perSlug.get(s)?.nome ?? s}`} disabled={n === scelte.length - 1} onClick={() => sposta(n, 1)} />
                  <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Togli" className="whitespace-nowrap" aria-label={`Togli ${perSlug.get(s)?.nome ?? s}`} onClick={() => setScelte((x) => x.filter((k) => k !== s))} />
                </span>
              </li>
            ))}
          </ol>
        </section>
        {libere.length > 0 && (
          <section className="flex flex-col gap-1.5" aria-label="Aree da aggiungere">
            <h3 className="m-0 testo-14">Aggiungi un’area</h3>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {libere.map((a) => (
                <li key={a.slug}>
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo={a.nome} onClick={() => setScelte((x) => [...x, a.slug])} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
