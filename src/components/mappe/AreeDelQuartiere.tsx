// ============================================================
// AreeDelQuartiere — le Aree di un quartiere nella sua pagina: carte, ordine, il pin che manca sull'illustrazione (L2, R2-12)
// ============================================================
//
// Ogni carta è un posto con il suo nome (mai «Mappa»): la miniatura della planimetria predefinita (le miniature di L1, 96 px),
// «N planimetrie · M pin», il chip «Ingresso» sull'area d'ingresso, e il collegamento alla sua pagina. Un'area che
// sull'illustrazione del quartiere non ha ancora il suo pin di passaggio ha «Segna sull'illustrazione»: è il «da completare»,
// dentro la pagina invece che in un elenco a parte. «Riordina» mostra ↑/↓ da 44 px e salva l'ordine nuovo.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { AnteprimaMappa } from './AnteprimaMappa';
import { SceltaPunto } from './SceltaPunto';
import { creaSpillo, riordinaAree } from '../../services/api';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { notifica } from '../../stores/notificationStore';
import type { AreaRiassuntoDto, QuartiereDettaglioDto } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** «2 planimetrie · 16 pin», «1 planimetria · nessun pin». */
function conteggiArea(a: AreaRiassuntoDto): string {
  const planimetrie = a.numeroPlanimetrie === 1 ? '1 planimetria' : `${a.numeroPlanimetrie} planimetrie`;
  const pin = a.numeroSpilli === 0 ? 'nessun pin' : a.numeroSpilli === 1 ? '1 pin' : `${a.numeroSpilli} pin`;
  return `${planimetrie} · ${pin}`;
}

interface Props {
  quartiere: QuartiereDettaglioDto;
  /** Dopo un cambiamento (ordine, pin segnato): la pagina rilegge il quartiere. */
  onCambiato: () => Promise<void> | void;
  onAggiungi: () => void;
  /** Il pin di passaggio appena segnato: la pagina lo mostra selezionato, anche se il quartiere non è ancora aperto (UX2-9 d). */
  onPinSegnato?: (spillo: number) => void;
}

/** La sezione: titolo con il conteggio, «Riordina», le carte delle aree (o l'invito ad aggiungerne una). */
export function AreeDelQuartiere({ quartiere: q, onCambiato, onAggiungi, onPinSegnato }: Props) {
  const [riordina, setRiordina] = useState<string[] | null>(null);
  const [daSegnare, setDaSegnare] = useState<AreaRiassuntoDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const perSlug = new Map(q.aree.map((a) => [a.slug, a]));
  // L6: un'Area del mondo eredita l'apertura del quartiere. L'URL diretto resta consultabile,
  // ma la navigazione del quartiere non deve proporre un'Area ancora chiusa.
  const navigabili = q.aree.filter((a) => a.disponibile !== false);
  const elenco = riordina ? riordina.map((s) => perSlug.get(s)).filter((a): a is AreaRiassuntoDto => !!a && a.disponibile !== false) : navigabili;
  const sposta = (i: number, verso: -1 | 1) => setRiordina((o) => { if (!o) return o; const n = [...o]; [n[i], n[i + verso]] = [n[i + verso], n[i]]; return n; });
  const salvaOrdine = async () => {
    if (!riordina) return;
    setOccupato(true);
    try { await riordinaAree(q.chiave, riordina); notifica('success', `Ordine delle aree di ${q.nome} salvato.`); setRiordina(null); await onCambiato(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Ordine non salvato.'); }
    finally { setOccupato(false); }
  };

  if (navigabili.length === 0) return (
    <section className="card flex flex-col items-start gap-2" aria-label={`Aree di ${q.nome}`}>
      <h2 className="m-0 font-display testo-17 uppercase leading-none">Aree</h2>
      <p className="m-0 testo-13 text-text-secondary">{q.aree.length > 0 ? 'Le aree del quartiere non sono ancora aperte nella partita.' : IN_RILASCIO ? `Nessuna area in ${q.nome}.` : `Nessuna area in ${q.nome}: aggiungine una.`}</p>
      {!IN_RILASCIO && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Aggiungi area" onClick={onAggiungi} />}
    </section>
  );
  return (
    <section className="flex flex-col gap-2" aria-label={`Aree di ${q.nome}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 font-display testo-17 uppercase leading-none">Aree <span className="text-text-muted">· {navigabili.length}</span></h2>
        {!IN_RILASCIO && navigabili.length > 1 && (riordina
          ? <span className="ml-auto flex gap-1.5">
            <PulsanteVisivo compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setRiordina(null)} />
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva l’ordine" disabled={occupato} onClick={() => void salvaOrdine()} />
          </span>
          : <PulsanteVisivo tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Riordina" onClick={() => setRiordina(navigabili.map((a) => a.slug))} />)}
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" aria-label="Aree">
        {elenco.map((a, i) => (
          <li key={a.slug} className="card flex items-center gap-3 p-2">
            <AnteprimaMappa mappa={{ ...a.illustrazione, nome: a.nome }} className="h-[72px] w-24" sizes="96px" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-1.5">
                <Link to={a.casa} className="touch inline-flex items-center font-semibold">{a.nome}</Link>
                {a.ingresso && <span className="chip chip--attivo testo-12" title="Toccando il quartiere sulla mappa di Tokyo si apre quest’area">Ingresso</span>}
              </span>
              <span className="testo-12 text-text-muted">{conteggiArea(a)}</span>
              {!IN_RILASCIO && !a.passaggio && !riordina && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="mappa" dimensione={20} />}
                titolo="Segna sull’illustrazione" dettaglio="il suo pin manca" onClick={() => setDaSegnare(a)} />}
            </span>
            {riordina && <span className="flex flex-col gap-1">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" aria-label={`Sposta su ${a.nome}`} disabled={i === 0} onClick={() => sposta(i, -1)} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" aria-label={`Sposta giù ${a.nome}`} disabled={i === elenco.length - 1} onClick={() => sposta(i, 1)} />
            </span>}
          </li>
        ))}
      </ul>
      {!IN_RILASCIO && <SegnaSullIllustrazione quartiere={q} area={daSegnare} onChiudi={() => setDaSegnare(null)} onSegnata={async (spillo) => { setDaSegnare(null); await onCambiato(); onPinSegnato?.(spillo); }} />}
    </section>
  );
}

/** La finestra che mette il pin di passaggio di un'area sull'illustrazione del quartiere: si tocca il punto, si salva. */
function SegnaSullIllustrazione({ quartiere: q, area, onChiudi, onSegnata }: { quartiere: QuartiereDettaglioDto; area: AreaRiassuntoDto | null; onChiudi: () => void; onSegnata: (spillo: number) => Promise<void> }) {
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const src = useImmagineMappa(q.illustrazione);
  const salva = async () => {
    if (!area || !punto || !q.mappaChiave || !area.predefinita) return;
    setOccupato(true);
    try {
      const pin = await creaSpillo(q.mappaChiave, { tipo: 'passaggio', nome: area.nome, x: punto.x, y: punto.y, riferimento: { tipo: 'mappa', chiave: area.predefinita } });
      notifica('success', `${area.nome} segnata sull’illustrazione di ${q.nome}.`);
      setPunto(null);
      await onSegnata(pin.id);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Pin non salvato.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <Modal titolo={area ? `Dove sta ${area.nome} in ${q.nome}` : ''} aperta={!!area} onChiudi={() => { setPunto(null); onChiudi(); }} larga
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={() => { setPunto(null); onChiudi(); }}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={!punto || occupato || !src} onClick={() => void salva()} />
      </>}>
      {src
        ? <div className="flex flex-col gap-2">
          <SceltaPunto src={src} alt={`Illustrazione di ${q.nome}`} punto={punto} onPunto={setPunto} disabilitato={occupato} />
          <span className="testo-12 text-text-muted">Tocca dove si entra nell’area: lì comparirà il suo pin, che porta alla sua pagina.</span>
        </div>
        : <p className="m-0 testo-13">{q.nome} non ha un’illustrazione da toccare: caricala dall’editor dell’illustrazione.</p>}
    </Modal>
  );
}
