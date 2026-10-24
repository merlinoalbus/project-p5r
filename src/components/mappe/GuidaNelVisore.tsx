// ============================================================
// GuidaNelVisore — la guida della planimetria da **usare** nel visore (L3 RG-1, decisione dell'utente del 2026-10-20)
// ============================================================
//
// «nel visore devono esserci solo le funzioni di utilizzo e non quelle di modifica... quindi solo dei checkpoint per segnare come fatto
// il punto della guida... e tutti i dettagli informativi dentro la voce... riferimenti ai pin della mappa (il click su un pin deve
// evidenziare il punto)». Le voci sono quelle della planimetria, con la regola dell'utente (`GET /api/mappe/:chiave/guida`: con un pin
// su di lei, o senza pin e con lei come planimetria effettiva); una voce fatta sparisce, salvo «Anche le fatte».
// - ogni voce da segnare ha una casella: spuntata vale «Ottenuto», tolta vale «Riapri» (gli stessi stati della scheda del Palazzo e del
//   popup del pin, con la stessa conferma quando si riaprono anche altre voci o un Enigma risolto); le descrittive non ne hanno; i passi
//   degli Enigmi hanno la loro;
// - aperta, la voce mostra testo, dettagli e i suoi pin: un pin di questa planimetria si tocca e il visore lo seleziona e lo centra;
// - il tocco su un pin della mappa evidenzia le sue voci (e le porta in vista);
// - niente modifica: le voci si correggono nella scheda del Palazzo.
// Finestra fluttuante che si trascina dalla sua testata (da 768 px), foglio dal basso sotto i 768 px.
// ============================================================

import { useEffect, useRef, useState, type PointerEvent as EventoPuntatore } from 'react';
import { createPortal } from 'react-dom';
import { getGuidaMappa, impostaStatoPunto } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useMedia } from '../../hooks/useMedia';
import { notifica } from '../../stores/notificationStore';
import { puntoDescrittivo } from '../../../shared/spilli';
import { NOME_TIPO, COLORE_TIPO } from '../../utils/dungeon';
import { nomeSenzaPalazzo } from '../../utils/gruppiPlanimetrie';
import { enigmiCheSiRiaprono, righeRiapertura, testoVociDelGesto } from '../../utils/gestiVoce';
import { DettagliPunto } from '../guida/DettagliPunto';
import { Modal } from '../shared/Modal';
import { IconaAzione } from '../shared/IconaAzione';
import type { PuntoInteresseDto } from '../../types';

/** Larghezza della finestra fluttuante. */
const LARGHEZZA = 340;
/** Margine dai bordi dello schermo per la finestra trascinata. */
const MARGINE = 8;
/** L'altezza che la finestra si tiene comunque (testata e qualche voce): più in basso di così non si apre né si lascia. */
const ALTEZZA_UTILE = 320;

interface Props {
  /** La planimetria. */
  mappa: string;
  partitaId: number | null;
  /** Lo spillo selezionato sulla mappa: le sue voci si evidenziano. */
  spilloSelezionato: number | null;
  /** Gli spilli di questa planimetria: i riferimenti a loro si toccano, quelli di altre planimetrie si leggono. */
  spilliQui: ReadonlySet<number>;
  /** Seleziona e centra uno spillo della planimetria. */
  onCentra: (spilloId: number) => void;
  /** Uno stato salvato: chi ospita il visore rilegge la mappa (i pin seguono le voci). */
  onCambiato?: () => void;
  onChiudi: () => void;
  /** Dove si apre la finestra la prima volta: l'angolo in alto a destra della tela, in coordinate dello schermo. */
  ancora: { top: number; right: number } | null;
  /** Cambia quando gli stati della mappa cambiano altrove (popup, pagina): la guida si rilegge in silenzio. */
  versione: string;
}

/** La finestra (o il foglio) della guida della planimetria, da usare. */
export function GuidaNelVisore({ mappa, partitaId, spilloSelezionato, spilliQui, onCentra, onCambiato, onChiudi, ancora, versione }: Props) {
  const largo = useMedia('(min-width: 768px)');
  const guida = useCarica(() => getGuidaMappa(mappa, partitaId ?? undefined), [mappa, partitaId]);
  const [mostraFatte, setMostraFatte] = useState(false);
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [riapertura, setRiapertura] = useState<{ voce: PuntoInteresseDto; righe: string[] } | null>(null);

  // gli stati cambiati altrove (il popup del pin, la scheda) si rileggono in silenzio, senza lo stato di caricamento
  const imposta = useRef(guida.imposta);
  useEffect(() => { imposta.current = guida.imposta; });
  const versioneVista = useRef(versione);
  useEffect(() => {
    if (versioneVista.current === versione) return;
    versioneVista.current = versione;
    getGuidaMappa(mappa, partitaId ?? undefined).then((g) => imposta.current(g)).catch(() => { /* resta quella di prima */ });
  }, [versione, mappa, partitaId]);

  // la posizione della finestra trascinata (da 768 px): all'apertura in alto a destra della tela, poi dove la si lascia
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const w = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const h = typeof window === 'undefined' ? 800 : window.innerHeight;
    // abbastanza in alto da lasciare spazio a qualche voce (ALTEZZA_UTILE) anche se la tela sta in basso
    return { x: Math.max(MARGINE, (ancora?.right ?? w - MARGINE) - LARGHEZZA - MARGINE), y: Math.max(MARGINE, Math.min((ancora?.top ?? 80) + MARGINE, h - ALTEZZA_UTILE - MARGINE)) };
  });
  const trascina = useRef<{ dx: number; dy: number } | null>(null);
  const finestra = useRef<HTMLElement | null>(null);
  /** Tiene la finestra dentro lo schermo. */
  const dentro = (x: number, y: number) => ({
    x: Math.min(Math.max(MARGINE, x), window.innerWidth - LARGHEZZA - MARGINE),
    y: Math.min(Math.max(MARGINE, y), Math.max(MARGINE, window.innerHeight - ALTEZZA_UTILE - MARGINE)),
  });
  const giu = (e: EventoPuntatore<HTMLElement>) => {
    if (!largo || (e.target as Element).closest('button')) return;
    trascina.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const muovi = (e: EventoPuntatore<HTMLElement>) => { if (trascina.current) setPos(dentro(e.clientX - trascina.current.dx, e.clientY - trascina.current.dy)); };
  const su = () => { trascina.current = null; };
  // il ridimensionamento dello schermo non la lascia fuori
  useEffect(() => {
    if (!largo) return;
    const ridimensiona = () => setPos((p) => dentro(p.x, p.y));
    window.addEventListener('resize', ridimensiona);
    return () => window.removeEventListener('resize', ridimensiona);
  }, [largo]);

  // le voci dello spillo selezionato vengono in vista
  const elenco = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (spilloSelezionato === null) return;
    const el = elenco.current?.querySelector<HTMLElement>(`[data-pin-evidenziato="sì"]`);
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [spilloSelezionato, guida.dati]);

  const infiltrazioni = guida.dati?.infiltrazioni ?? [];
  const tutte = infiltrazioni.flatMap((i) => i.voci);
  const descrittiva = (p: PuntoInteresseDto) => puntoDescrittivo(p.tipo, p.areaDedalo);
  const evidenziata = (p: PuntoInteresseDto) => spilloSelezionato !== null && p.pin.some((x) => x.id === spilloSelezionato);
  /** Una voce si vede se non è fatta (o con «Anche le fatte»), se è quella aperta o se è dello spillo selezionato. */
  const visibile = (p: PuntoInteresseDto) => mostraFatte || !p.stato || p.chiave === aperta || evidenziata(p);
  const fatte = tutte.filter((p) => p.stato && !descrittiva(p)).length;
  const daFare = tutte.filter((p) => !p.stato && !descrittiva(p)).length;

  /** Salva lo stato della voce nella partita (null = riapri), notifica con le altre voci toccate e rilegge la guida e la mappa. */
  const salva = async (p: PuntoInteresseDto, stato: 'ottenuto' | null) => {
    if (!partitaId) return;
    setOccupato(true);
    try {
      const nuovo = await impostaStatoPunto(partitaId, p.chiave, stato);
      notifica('success', stato ? `«${p.nome}» segnato come ottenuto.` : `«${p.nome}» riaperto.`);
      if (nuovo.effetti?.segnate.length) notifica('info', `Segnate anche: ${testoVociDelGesto(nuovo.effetti.segnate, infiltrazioni)}.`);
      if (nuovo.effetti?.riaperte.length) notifica('info', `Riaperte anche: ${testoVociDelGesto(nuovo.effetti.riaperte, infiltrazioni)}.`);
      guida.imposta(await getGuidaMappa(mappa, partitaId));
      onCambiato?.();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupato(false); }
  };
  /** La casella: spuntata segna «Ottenuto»; tolta riapre, chiedendo prima se si riaprono anche altre voci o un Enigma risolto (come la scheda). */
  const casella = (p: PuntoInteresseDto, spuntata: boolean) => {
    if (spuntata) { void salva(p, 'ottenuto'); return; }
    const righe = righeRiapertura((p.condivise ?? []).length > 0 ? testoVociDelGesto(p.condivise!, infiltrazioni) : null, enigmiCheSiRiaprono([p], tutte));
    if (righe.length > 0) setRiapertura({ voce: p, righe }); else void salva(p, null);
  };

  /** Una voce: casella (se si segna), nome con tipo e stato; aperta, testo, dettagli e pin. I passi di un Enigma stanno sotto di lui. */
  const voce = (p: PuntoInteresseDto, passi: PuntoInteresseDto[]) => {
    const apri = p.chiave === aperta;
    const ev = evidenziata(p);
    return (
      <li key={p.chiave} data-pin-evidenziato={ev ? 'sì' : undefined} className={`flex flex-col gap-1 rounded-md px-1 py-1 ${ev ? 'bg-primary-bg outline outline-1 outline-primary' : ''}`}>
        <div className="flex items-start gap-1">
          {descrittiva(p)
            ? <span className="touch flex w-11 shrink-0 items-center justify-center" aria-hidden="true"><span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} /></span>
            : <label className="touch flex w-11 shrink-0 cursor-pointer items-center justify-center">
              <input type="checkbox" className="h-5 w-5" checked={!!p.stato} disabled={!partitaId || occupato} onChange={(e) => casella(p, e.target.checked)}
                aria-label={p.stato ? `${p.nome}: fatto, togli il segno per riaprire` : `${p.nome}: segna come fatto`} />
            </label>}
          <button type="button" className={`touch min-w-0 flex-1 text-left text-[13px] ${p.stato ? 'opacity-60' : ''}`} aria-expanded={apri} onClick={() => setAperta(apri ? null : p.chiave)}>
            <span className="font-semibold">{p.nome}</span>
            <span className="text-[11px] text-text-muted"> · {NOME_TIPO[p.tipo]}{p.stato ? ` · ${p.stato}` : ''}</span>
          </button>
        </div>
        {apri && (
          <div className="flex flex-col gap-1.5 pb-1 pl-12 text-[12px]">
            {p.descrizione && <p className="m-0 whitespace-pre-wrap text-text-secondary">{p.descrizione}</p>}
            <DettagliPunto d={p.dettagli} contenuto={p.contenuto} senzaAffinita={p.tipo === 'persona' && !!p.persona} />
            {descrittiva(p) && <p className="m-0 text-[11px] text-text-muted">Voce descrittiva: si legge, non si segna.</p>}
            {p.pin.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Pin di ${p.nome}`}>
                {p.pin.map((x) => (
                  <li key={x.id}>
                    {spilliQui.has(x.id)
                      ? <button type="button" className={`chip chip--icona touch text-[11px] ${x.id === spilloSelezionato ? 'chip--attivo' : ''}`} aria-label={`Mostra sulla mappa: ${x.nome}`} onClick={() => onCentra(x.id)}>
                        <IconaAzione chiave="posizione" dimensione={14} />{x.nome}
                      </button>
                      : <span className="inline-flex items-center gap-1 text-text-muted"><IconaAzione chiave="posizione" dimensione={14} />{x.nome} · {nomeSenzaPalazzo(x.mappaNome)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {passi.length > 0 && (
          <ul className="m-0 ml-5 flex list-none flex-col border-l-2 border-border-light p-0 pl-1" aria-label={`Passi di ${p.nome}`}>
            {passi.filter(visibile).map((x) => voce(x, []))}
          </ul>
        )}
      </li>
    );
  };

  const corpo = (
    <section ref={finestra} role="dialog" aria-label="Guida della planimetria"
      className={largo
        ? 'fixed z-[70] flex max-h-[min(70dvh,560px)] w-[340px] flex-col border border-primary bg-[rgb(11,11,14)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
        : 'fixed inset-x-2 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[70] flex max-h-[60dvh] flex-col border border-primary bg-[rgb(11,11,14)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'}
      // il fondo resta nello schermo: l'altezza massima è quella che la posizione lascia (e mai più di 560 px o del 70% dello schermo)
      style={largo ? { left: pos.x, top: pos.y, maxHeight: `min(560px, 70dvh, ${Math.max(ALTEZZA_UTILE, (typeof window === 'undefined' ? 800 : window.innerHeight) - pos.y - MARGINE)}px)` } : undefined}>
      <header className={`flex items-center gap-2 border-b border-border px-2 py-1 ${largo ? 'cursor-move touch-none select-none' : ''}`}
        onPointerDown={giu} onPointerMove={muovi} onPointerUp={su} onPointerCancel={su}>
        <h2 className="m-0 min-w-0 flex-1 font-display text-[15px] uppercase leading-tight">Guida <span className="text-[11px] normal-case text-text-muted">· {daFare} da fare{fatte > 0 ? ` · ${fatte} fatte` : ''}</span></h2>
        <button type="button" className="touch flex w-11 items-center justify-center bg-transparent text-text-muted" aria-label="Chiudi la guida" onClick={onChiudi}><IconaAzione chiave="chiudi" dimensione={20} /></button>
      </header>
      <div ref={elenco} className="area-scorrevole min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1.5">
        {guida.caricamento && !guida.dati && <p className="m-0 py-2 text-[12px] text-text-muted">Carico la guida…</p>}
        {guida.errore && <p className="m-0 py-2 text-[12px] text-error" role="alert">{guida.errore}</p>}
        {guida.dati && tutte.length === 0 && <p className="m-0 py-2 text-[12px] text-text-muted">Nessuna voce della guida su questa planimetria.</p>}
        {!partitaId && tutte.length > 0 && <p className="m-0 pb-1 text-[11px] text-text-muted">Attiva una partita per segnare quel che fai.</p>}
        {fatte > 0 && (
          <button type="button" className={`chip touch mb-1 text-[11px] ${mostraFatte ? 'chip--attivo' : ''}`} aria-pressed={mostraFatte} onClick={() => setMostraFatte((v) => !v)}>Anche le fatte ({fatte})</button>
        )}
        {infiltrazioni.map((i) => {
          const passiPer = new Map<string, PuntoInteresseDto[]>();
          for (const p of i.voci) if (p.contenitore) passiPer.set(p.contenitore, [...(passiPer.get(p.contenitore) ?? []), p]);
          // un passo il cui Enigma non è su questa planimetria sta da sé
          const chiavi = new Set(i.voci.map((p) => p.chiave));
          const radici = i.voci.filter((p) => !p.contenitore || !chiavi.has(p.contenitore));
          const inVista = radici.filter((p) => visibile(p) || (passiPer.get(p.chiave) ?? []).some(visibile));
          if (inVista.length === 0) return null;
          return (
            <section key={i.chiave} className="flex flex-col gap-0.5 pb-1.5" aria-label={`${i.ordine + 1}. ${i.nome}`}>
              {infiltrazioni.length > 1 && <h3 className="m-0 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{i.ordine + 1}. {i.nome}</h3>}
              <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">{inVista.map((p) => voce(p, passiPer.get(p.chiave) ?? []))}</ul>
            </section>
          );
        })}
        {guida.dati && tutte.length > 0 && !mostraFatte && daFare === 0 && <p className="m-0 py-2 text-[12px] text-text-muted">Tutto fatto su questa planimetria.</p>}
      </div>
      {riapertura && (
        <Modal titolo={`Riaprire «${riapertura.voce.nome}»?`} aperta onChiudi={() => setRiapertura(null)}
          azioni={<>
            <button type="button" className="btn btn-secondary touch" onClick={() => setRiapertura(null)}>Annulla</button>
            <button type="button" className="btn btn-primary touch" onClick={() => { const v = riapertura.voce; setRiapertura(null); void salva(v, null); }}>Riapri</button>
          </>}>
          {riapertura.righe.map((r) => <p key={r} className="m-0 text-[14px]">{r}</p>)}
        </Modal>
      )}
    </section>
  );
  return createPortal(corpo, document.body);
}
