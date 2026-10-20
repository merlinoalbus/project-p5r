// ============================================================
// AreePalazzo — le Aree di un Palazzo (L3, 2026-10-20): «Aree · N» al posto dell'elenco delle planimetrie
// ============================================================
//
// Un Palazzo è fatto di Aree (le stanze), ognuna con le sue versioni (planimetrie), e le infiltrazioni le toccano (molti a molti,
// `infiltrazione_area`). Qui ogni area dice numero, nome, le infiltrazioni che la toccano, quanto c'è da raccogliere, se è completata
// (tutte le sue infiltrazioni completate, la regola di prima per la stanza) e quante versioni ha. Le aree toccate dall'infiltrazione
// aperta sono **evidenziate**, le altre restano apribili (§4.2). In coda le infiltrazioni che non toccano ancora aree, con «Collega
// aree». L'ordine si cambia trascinando la maniglia ⠿ (o con le frecce su/giù, `useRiordino`): si vede subito e si salva a ogni spostamento.
//
// Tre forme (§4.2, R3-41): `colonna` (da 1280 px, con lo scorrimento della colonna), `fila` (da 768 a 1279 px, chip scorrevoli sopra il
// visore), `foglio` (sotto i 768 px: il pulsante «Aree · N» apre l'elenco come foglio dal basso).
// ============================================================

import { useState } from 'react';
import type { AreaDungeonDto, AreaRiassuntoDto } from '../../types';
import { FilaScorrevole } from '../shared/FilaScorrevole';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { SpuntaCompletata, TestoCompletata } from './SpuntaCompletata';
import { tutteCompletate } from '../../utils/completamentoAree';
import { useRiordino } from '../../hooks/useRiordino';
import { Maniglia } from '../shared/Maniglia';

interface Props {
  /** Le Aree del Palazzo, nell'ordine del Palazzo. */
  aree: AreaRiassuntoDto[];
  /** Le infiltrazioni del Palazzo: servono quelle che non toccano ancora aree. */
  infiltrazioni: AreaDungeonDto[];
  /** Lo slug dell'area aperta e la chiave dell'infiltrazione aperta. */
  areaScelta: string | null;
  infiltrazioneScelta: string | null;
  /** Le infiltrazioni completate nella partita (`areeCompletate`). */
  completate: ReadonlySet<string>;
  onScegliArea: (slug: string) => void;
  onScegliInfiltrazione: (chiave: string) => void;
  onCollegaAree: (infiltrazione: string) => void;
  onAggiungiArea: () => void;
  /** Salva l'ordine nuovo (tutti gli slug); vero se è andato a buon fine. */
  onRiordina: (slug: string[]) => Promise<boolean>;
  forma: 'colonna' | 'fila' | 'foglio';
}

/** Quanto resta da raccogliere in un'area, a parole. Con una partita, un'area senza niente da raccogliere è completa (richiesta
 *  dell'utente, 2026-10-11), come una con tutto raccolto. */
function testoRaccolta(r: AreaRiassuntoDto['raccolta']): string {
  const n = r?.n ?? 0;
  const presi = r ? r.presi : null;
  if (n === 0) return presi === null ? 'niente da raccogliere' : 'niente da raccogliere · completa';
  if (presi === null) return `${n} da raccogliere`;
  return presi >= n ? `${n} raccolti · completa` : `${n - presi} da prendere su ${n}`;
}

/** Un'area è completa per infiltrazioni (tutte quelle che la toccano completate) **o per raccolta** (tutto raccolto, o niente da
 *  raccogliere: scelta dell'utente del 2026-10-11, la regola di prima per la stanza). Senza partita niente è completo. */
// L4 (§1.5): con i numeri del server (`completamento`: gli oggetti permanenti con un pin sulle sue planimetrie, senza niente da contare
// completa) vale la funzione unica; senza (dati di prima) la regola di prima.
const areaCompleta = (a: AreaRiassuntoDto, completate: ReadonlySet<string>): boolean =>
  a.completamento ? a.completamento.completata === true
    : tutteCompletate((a.infiltrazioni ?? []).map((x) => x.chiave), completate) || (!!a.raccolta && a.raccolta.presi !== null && a.raccolta.presi >= a.raccolta.n);

/** L'elenco delle aree in una delle tre forme. */
export function AreePalazzo(p: Props) {
  const [foglioAperto, setFoglioAperto] = useState(false);
  if (p.forma === 'fila') return <FilaAree {...p} />;
  if (p.forma === 'foglio') {
    const scelta = p.aree.find((a) => a.slug === p.areaScelta);
    return (
      <>
        <button type="button" className="btn btn-secondary touch w-full justify-between" aria-haspopup="dialog" onClick={() => setFoglioAperto(true)}>
          <span>Aree · {p.aree.length}</span>
          <span className="min-w-0 truncate text-text-secondary">{scelta ? scelta.nome : 'scegli'} ▾</span>
        </button>
        {foglioAperto && (
          <Modal titolo={`Aree · ${p.aree.length}`} aperta onChiudi={() => setFoglioAperto(false)}>
            <ElencoAree {...p} onScegliArea={(s) => { setFoglioAperto(false); p.onScegliArea(s); }}
              onScegliInfiltrazione={(k) => { setFoglioAperto(false); p.onScegliInfiltrazione(k); }}
              onCollegaAree={(k) => { setFoglioAperto(false); p.onCollegaAree(k); }}
              onAggiungiArea={() => { setFoglioAperto(false); p.onAggiungiArea(); }} />
          </Modal>
        )}
      </>
    );
  }
  return <ElencoAree {...p} />;
}

/** Le aree come chip in fila (768–1279 px): numero, nome, spunta; evidenziate quelle toccate dall'infiltrazione aperta. */
function FilaAree({ aree, areaScelta, infiltrazioneScelta, completate, onScegliArea, onAggiungiArea }: Props) {
  return (
    <div className="flex items-center gap-2">
      <FilaScorrevole className="fila-scorrevole--sempre min-w-0 flex-1 items-center" role="group" aria-label={`Aree · ${aree.length}`}>
        {aree.map((a, i) => {
          const completa = areaCompleta(a, completate);
          const toccata = !!infiltrazioneScelta && (a.infiltrazioni ?? []).some((x) => x.chiave === infiltrazioneScelta);
          return (
            // da 1024 px una riga per chip (al massimo 14rem coi puntini, il nome intero nel suggerimento): andando a capo la fila
            // nella riga dell'infiltrazione arrivava a 60–90 px (R3-41)
            <button key={a.slug} type="button" aria-pressed={a.slug === areaScelta} title={a.nome}
              className={`chip touch shrink-0 lg:max-w-[14rem] lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap ${a.slug === areaScelta ? 'chip--attivo' : ''} ${toccata && a.slug !== areaScelta ? 'chip--toccata' : ''} ${completa ? 'chip--icona' : ''}`}
              onClick={() => onScegliArea(a.slug)}>
              {completa && <SpuntaCompletata />}{i + 1}. {a.nome}{completa && <TestoCompletata />}
            </button>
          );
        })}
      </FilaScorrevole>
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi area" onClick={onAggiungiArea} />
    </div>
  );
}

/** L'elenco completo: titolo con «Aggiungi area», le aree con la maniglia per riordinarle, poi le infiltrazioni senza aree. */
function ElencoAree({ aree, infiltrazioni, areaScelta, infiltrazioneScelta, completate, onScegliArea, onScegliInfiltrazione, onCollegaAree, onAggiungiArea, onRiordina }: Props) {
  // L'ordine mostrato è locale finché il server non risponde: il trascinamento deve vedersi subito. Vale per le aree che ci sono adesso:
  // quelle appena aggiunte si accodano nell'ordine del server e quelle eliminate cadono.
  const [ordine, setOrdine] = useState<string[] | null>(null);
  const [occupato, setOccupato] = useState(false);
  const perSlug = new Map(aree.map((a) => [a.slug, a]));
  const elenco = ordine ? [...ordine.map((s) => perSlug.get(s)).filter((a): a is AreaRiassuntoDto => !!a), ...aree.filter((a) => !ordine.includes(a.slug))] : aree;
  /** Sposta l'area `id` alla posizione `a`, la mostra subito lì e salva l'ordine di tutto il Palazzo; in errore torna quello del server. */
  const sposta = (id: string, a: number) => {
    const n = elenco.map((x) => x.slug).filter((s) => s !== id);
    n.splice(a, 0, id);
    setOrdine(n);
    setOccupato(true);
    void onRiordina(n).then((ok) => { if (!ok) setOrdine(null); }).finally(() => setOccupato(false));
  };
  const riordino = useRiordino(elenco.map((a) => a.slug), occupato ? 'Un momento: sto salvando l’ultima modifica' : null, sposta);
  const senzaAree = infiltrazioni.filter((i) => (i.areePalazzo ?? []).length === 0);
  return (
    <div className="flex flex-col gap-2.5" role="group" aria-label="Aree del Palazzo">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 font-display text-[15px] uppercase leading-none">Aree · {aree.length}</h3>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi area" onClick={onAggiungiArea} />
        </span>
      </div>
      {aree.length > 1 && <p className="m-0 text-[11px] text-text-muted">Trascina ⠿ per l’ordine in cui percorri il Palazzo. Tocca un’area per vederla sulla mappa.</p>}
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Aree">
        {elenco.map((a, i) => {
          // nell'ordine della guida, comunque arrivino
          const infil = [...(a.infiltrazioni ?? [])].sort((x, y) => x.ordine - y.ordine);
          const completa = areaCompleta(a, completate);
          const scelta = a.slug === areaScelta;
          const toccata = !!infiltrazioneScelta && infil.some((x) => x.chiave === infiltrazioneScelta);
          const raccolta = testoRaccolta(a.raccolta);
          const bersaglio = riordino.trascinato && riordino.trascinato !== a.slug && riordino.sopra === i;
          return (
            <li key={a.slug} ref={riordino.riga(a.slug)}
              className={`flex items-stretch gap-1 rounded-md border px-1.5 py-1.5 ${scelta ? 'border-primary bg-primary-bg' : toccata ? 'border-primary/60 bg-white/[0.04]' : 'border-border-light bg-white/[0.02]'} ${riordino.trascinato === a.slug ? 'opacity-50' : ''} ${bersaglio ? 'ring-2 ring-primary' : ''}`}>
              {aree.length > 1 && <Maniglia etichetta={`Sposta l’area «${a.nome}»`} id={a.slug} i={i} riordino={riordino} />}
              <button type="button" className="touch min-w-0 flex-1 text-left" aria-pressed={scelta} onClick={() => onScegliArea(a.slug)}>
                <span className="flex items-baseline gap-1 text-[13px] font-semibold leading-tight">
                  <span className="min-w-0">{i + 1}. {a.nome}{completa && <TestoCompletata />}</span>{completa && <SpuntaCompletata dimensione={14} />}
                  {toccata && !scelta && <span className="sr-only"> (toccata dall’infiltrazione aperta)</span>}
                </span>
                <span className="block text-[11px] leading-tight text-text-muted">
                  {[a.numeroPlanimetrie > 1 ? `${a.numeroPlanimetrie} versioni` : null, raccolta].filter(Boolean).join(' · ')}
                </span>
                {infil.length > 0 && (
                  // niente aria-label qui: dentro il pulsante coprirebbe i nomi delle infiltrazioni, che fanno parte del suo nome accessibile
                  <span className="mt-0.5 flex flex-wrap gap-1" data-infiltrazioni-di={a.slug}>
                    {infil.map((x) => (
                      <span key={x.chiave} className={`chip px-1.5 py-0 text-[10px] ${x.chiave === infiltrazioneScelta ? 'chip--attivo' : ''} ${completate.has(x.chiave) ? 'chip--icona' : ''}`}>
                        {completate.has(x.chiave) && <SpuntaCompletata dimensione={10} />}{x.ordine + 1}. {x.nome}{completate.has(x.chiave) && <TestoCompletata />}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {aree.length === 0 && <li className="text-[12px] text-text-muted" role="status">Questo Palazzo non ha ancora aree: aggiungine una.</li>}
      </ol>
      {senzaAree.length > 0 && (
        <section className="flex flex-col gap-1.5" aria-label="Infiltrazioni senza aree">
          <h4 className="m-0 text-[11px] uppercase tracking-wide text-text-muted">Infiltrazioni senza aree · {senzaAree.length}</h4>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {senzaAree.map((x) => (
              <li key={x.chiave} className={`flex items-center gap-1 rounded-md border border-dashed px-1.5 py-1.5 ${x.chiave === infiltrazioneScelta ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
                <button type="button" className="touch min-w-0 flex-1 text-left text-[13px] font-semibold leading-tight" aria-pressed={x.chiave === infiltrazioneScelta} onClick={() => onScegliInfiltrazione(x.chiave)}>
                  {completate.has(x.chiave) && <SpuntaCompletata dimensione={14} />}{x.ordine + 1}. {x.nome}{completate.has(x.chiave) && <TestoCompletata />}
                </button>
                <button type="button" className="chip touch shrink-0 text-[11px]" aria-label={`Collega aree a «${x.nome}»`} onClick={() => onCollegaAree(x.chiave)}>Collega aree</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
